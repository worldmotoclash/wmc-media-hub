

## Root Cause: Broken `findSalesforceIdByUrl` Regex + Incomplete Dedupe

The duplicates persist because of **three compounding bugs**:

### Bug 1: `findSalesforceIdByUrl` returns wrong Salesforce IDs

All 8 edge functions that sync to Salesforce use regex patterns like:
```
<content>.*?<id>([^<]+)</id>.*?<url>...TARGET_URL...</url>.*?</content>
```
With the `s` flag, `.*?` crosses `<content>` block boundaries. When the target URL is NOT in the first content block, the regex matches the `<id>` from one block and the `<url>` from a completely different block, returning the wrong Salesforce ID.

**Evidence**: 17 different DB records all share `salesforce_id = 'a2FDm00000094I3'`, but that Salesforce record is actually "2 riders side by side... (thumbnail)" pointing to a completely different file. The T-shirt record got the wrong ID.

### Bug 2: Frontend dedupe only uses `salesforceId` matching

The current dedupe (lines 431-437) builds a Set of `salesforceId` values from DB records and filters Salesforce API assets by `sourceId`. But since the DB has the **wrong** `salesforce_id`, the actual Salesforce record for the T-shirt has a different ID that's not in the Set, so it passes through the filter.

### Bug 3: Historical mislinked records

Multiple assets have incorrect `salesforce_id` values from past syncs.

---

## Implementation Plan

### 1. Fix `findSalesforceIdByUrl` in all edge functions

**Files** (8 functions): `upload-master-to-s3`, `upload-generation-input`, `generate-image`, `generate-wavespeed-image`, `generate-social-variant`, `extract-grid-image`, `create-video-thumbnail`, `sync-asset-to-salesforce`

**Change**: Remove the four regex patterns entirely. Keep ONLY the block-based search that correctly isolates each `<content>...</content>` block and checks if it contains the target URL before extracting the `<id>`. This is the fallback that already exists in all functions but is bypassed when the broken regex matches first.

### 2. Add URL-based deduplication to `unifiedMediaService.ts`

**File**: `src/services/unifiedMediaService.ts` (lines 431-437)

In addition to the existing `salesforceId` Set, also build a Set of normalized file URLs from DB assets. Filter Salesforce API assets that match EITHER by `sourceId` in `dbSalesforceIds` OR by `fileUrl` in `dbFileUrls`. This catches duplicates even when `salesforce_id` is wrong.

```text
DB assets ─────────────────────┐
  dbSalesforceIds (Set)        │
  dbFileUrls (Set)             ├──► Filter SF assets by ID OR URL match
                               │
Salesforce API assets ─────────┘
```

### 3. Repair mislinked `salesforce_id` values (data fix)

Run a SQL UPDATE that clears `salesforce_id` on rows where multiple records share the same `salesforce_id` AND their `file_url` does not match the actual Salesforce record's URL. Conservative approach: only null out the `salesforce_id` on records where the link is clearly wrong (keeping the column nullable allows re-sync to correct them).

```sql
-- Null out salesforce_id where it's shared by multiple records (mislink)
UPDATE media_assets SET salesforce_id = NULL
WHERE salesforce_id IN (
  SELECT salesforce_id FROM media_assets
  WHERE salesforce_id IS NOT NULL
  GROUP BY salesforce_id HAVING COUNT(*) > 1
);
```

This affects ~38 rows (17 with `a2FDm00000094I3`, 21 with `a2FDm000000949L`). After clearing, a "Sync to SFDC" operation will re-link them correctly using the fixed `findSalesforceIdByUrl`.

