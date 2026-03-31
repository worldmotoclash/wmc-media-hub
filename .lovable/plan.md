

# Fix S3 Path Typo + Async SFDC ID Backfill

## Two Problems

**Problem 1**: `s3Config.ts` line 87 has `SOCAIL` instead of `SOCIAL`. Every social media image uploads to the wrong S3 prefix. CDN URLs sent to Salesforce don't match real file paths, breaking XML feed URL matching.

**Problem 2**: After w2x-engine returns 302 (success), both `sync-asset-to-salesforce` and `upload-master-to-s3` poll the XML feed synchronously (2s, 4s, 6s = 12s total). SFDC propagation takes 30-60s. The edge function times out before the record appears, resulting in "Record likely created but ID not found."

## Solution

### Fix 1: Correct the typo (1 line)
In `supabase/functions/_shared/s3Config.ts`, change `SOCAIL_MEDIA_IMAGES_KNEWTV/masters` to `SOCIAL_MEDIA_IMAGES_KNEWTV/masters`.

> **Note**: Existing files already uploaded under the old `SOCAIL_...` path in Wasabi will need to be either renamed in S3 or have their CDN URLs updated in the DB. This fix only prevents future uploads from going to the wrong path. We should discuss a migration strategy for existing files separately.

### Fix 2: Remove synchronous polling, return immediately after 302

Instead of waiting 12+ seconds inside the edge function trying to find the new SFDC ID, return immediately with `action: 'created_pending'` and mark the asset's metadata with `sfdcSyncStatus: 'pending_id'`.

**In `sync-asset-to-salesforce/index.ts`** (lines 535-595): After `createSalesforceRecord` returns `true`, skip the 3-second wait + re-query. Instead:
- Update `media_assets.metadata` with `{ sfdcSyncStatus: 'pending_id', sfdcSyncAttemptedAt: now }`
- Return `{ success: true, action: 'created_pending' }` to the UI
- The UI shows "Synced (ID pending)" instead of a false failure

**In `upload-master-to-s3/index.ts`** (lines 467-505): Same change — after the 302, skip `findSalesforceIdByUrl`. Mark metadata as `pending_id` and return success.

### Fix 3: New edge function `backfill-salesforce-ids` for async ID resolution

A new edge function that:
1. Queries `media_assets` where `salesforce_id IS NULL` and `metadata->>'sfdcSyncStatus' = 'pending_id'`
2. Fetches the XML feed once
3. For each pending asset, runs the same `findSalesforceMatch` logic (exact URL, filename, title)
4. Updates `salesforce_id` and `sfdcSyncStatus: 'success'` on match
5. Can be triggered manually from the UI or scheduled via `pg_cron`

This function has no time pressure — it can process all pending assets in one sweep.

### Fix 4: XML parsing improvements in `sync-asset-to-salesforce/index.ts`

- **Line 66**: Change `<ri1__Content_Approved__c>` to `<approved>` to match actual XML schema
- **Lines 85-86**: Make URL regex CDATA-aware: `/<url>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/url>/`
- **Line 38**: Add cache-busting `&_t=${Date.now()}` to API URL in `findSalesforceMatch`

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/_shared/s3Config.ts` | Fix `SOCAIL` → `SOCIAL` typo |
| `supabase/functions/sync-asset-to-salesforce/index.ts` | Remove synchronous post-create polling (lines 535-595); return `created_pending` immediately; fix XML parsing (approved tag, CDATA regex, cache buster) |
| `supabase/functions/upload-master-to-s3/index.ts` | Remove `findSalesforceIdByUrl` call after 302; mark as `pending_id` and return |
| `supabase/functions/backfill-salesforce-ids/index.ts` | **New** — async backfill function that resolves pending SFDC IDs |

