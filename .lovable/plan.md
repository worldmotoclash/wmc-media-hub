

# Prevent Tag Duplication in MediaHub

## Problem
Tags like "Behind the Scenes" and "behind-the-scenes" can coexist because there's no case-insensitive uniqueness constraint on `media_tags.name`. Some code paths (auto-tag, upload-master) use `.ilike()` to check before inserting, but `useEditableAssetFields.ts` does not — it inserts directly.

## Changes

### 1. Database Migration
- Add a unique index on `lower(name)` to `media_tags` to enforce case-insensitive uniqueness at the DB level
- Run a deduplication query first: merge duplicate tags (keeping the oldest), reassign `media_asset_tags` references, then delete duplicates

```sql
-- Deduplicate existing tags: reassign references to the earliest tag per lowercase name, delete dupes
WITH ranked AS (
  SELECT id, name, lower(name) as lname,
    ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at ASC) as rn
  FROM media_tags
),
canonical AS (SELECT id, lname FROM ranked WHERE rn = 1),
dupes AS (SELECT r.id as dupe_id, c.id as canon_id FROM ranked r JOIN canonical c ON r.lname = c.lname WHERE r.rn > 1)
UPDATE media_asset_tags SET tag_id = d.canon_id FROM dupes d WHERE media_asset_tags.tag_id = d.dupe_id;

DELETE FROM media_tags WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at ASC) as rn FROM media_tags
  ) sub WHERE rn > 1
);

CREATE UNIQUE INDEX media_tags_name_lower_unique ON media_tags (lower(name));
```

### 2. `src/hooks/useEditableAssetFields.ts`
In the `addTag` function (~line 100-120): before inserting a new tag, query with `.ilike('name', name)` to find an existing match (same pattern used in `auto-tag-media-asset` and `upload-master-to-s3`). If found, use that tag instead of creating a duplicate.

### 3. `src/services/unifiedMediaService.ts`
In `createMediaTag`: add an `.ilike()` check before insert for the same protection at the service layer.

## Files to Edit
| File | Change |
|------|--------|
| Migration SQL | Deduplicate + add unique index |
| `src/hooks/useEditableAssetFields.ts` | Add `.ilike()` lookup before insert in `addTag` |
| `src/services/unifiedMediaService.ts` | Add `.ilike()` lookup in `createMediaTag` |

