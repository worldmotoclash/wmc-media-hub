-- Reassign media_asset_tags references from duplicate tags to the canonical (oldest) tag
WITH ranked AS (
  SELECT id, lower(name) as lname,
    ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at ASC) as rn
  FROM media_tags
),
canonical AS (SELECT id, lname FROM ranked WHERE rn = 1),
dupes AS (
  SELECT r.id as dupe_id, c.id as canon_id
  FROM ranked r
  JOIN canonical c ON r.lname = c.lname
  WHERE r.rn > 1
)
UPDATE media_asset_tags SET tag_id = d.canon_id FROM dupes d WHERE media_asset_tags.tag_id = d.dupe_id;

-- Remove duplicate media_asset_tags that now have the same (media_asset_id, tag_id)
DELETE FROM media_asset_tags a
USING media_asset_tags b
WHERE a.id > b.id
  AND a.media_asset_id = b.media_asset_id
  AND a.tag_id = b.tag_id;

-- Delete duplicate tags (keep oldest per lowercase name)
DELETE FROM media_tags WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at ASC) as rn FROM media_tags
  ) sub WHERE rn > 1
);

-- Enforce case-insensitive uniqueness going forward
CREATE UNIQUE INDEX media_tags_name_lower_unique ON media_tags (lower(name));