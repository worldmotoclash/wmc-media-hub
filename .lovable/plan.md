

# Fix: Deduplicate DB + Salesforce Assets in Unified Media Library

## Problem
The Unified Media Library combines database assets and Salesforce API assets without deduplication. When a file is uploaded (creating a DB record) and then synced to Salesforce (adding a `salesforce_id` to that DB record), the same content appears twice:
- Once from the DB query (the `local_upload` record with `salesforce_id`)
- Once from the Salesforce API response (the SFDC record)

The left card in your screenshot is the Salesforce API version; the right card is the database version.

## Fix

**File: `src/services/unifiedMediaService.ts`** (~line 430-432)

After fetching both DB assets and Salesforce assets, deduplicate before combining:
- Collect all `salesforceId` values from the DB assets into a Set
- Filter Salesforce assets to exclude any whose `sourceId` (Salesforce record ID) is already represented by a DB asset
- This ensures that synced assets only appear once (as the richer DB version with tags, description, etc.)

```text
DB assets (with salesforce_id) ──┐
                                 ├──► Deduplicated combined list
Salesforce API assets ───────────┘
  (exclude if salesforceId already in DB set)
```

**Single change location**: `fetchAllMediaAssets()` function, right before the `const allAssets = [...]` line. Add ~5 lines to filter out Salesforce duplicates.

No database changes needed.

