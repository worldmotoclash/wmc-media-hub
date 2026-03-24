

# Fix: Delete failing for SFDC-sourced orphaned assets

## Root Cause

The edge function logs show the exact error:
```
invalid input syntax for type uuid: "sf_a2FQQ000002F59V"
```

Assets synced from the Salesforce feed have IDs like `sf_a2FQQ000002F59V` (prefixed Salesforce IDs) instead of proper UUIDs. When `deleteMediaAsset()` passes this ID to the edge function, the Postgres `.eq("id", assetId)` query fails because the `media_assets.id` column is of type `uuid`.

This means:
- The S3 delete step runs fine (or skips if no s3_key)
- The SFDC delete step runs fine (or skips if no salesforceId)
- The DB cleanup step crashes, causing the whole function to return 500 "Failed to delete"

## Fix

**`supabase/functions/delete-media-asset/index.ts`**

1. Before the DB delete steps, check if `assetId` is a valid UUID. If it's not (e.g. starts with `sf_`), skip the DB delete entirely since there's no local DB record to clean up — it's a pure SFDC ghost record.

2. Also handle the case where the DB record simply doesn't exist (no rows deleted) — treat that as success rather than failure.

```typescript
// Check if assetId is a valid UUID before attempting DB operations
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = uuidRegex.test(assetId);

if (isValidUuid) {
  // Delete tags then asset from DB
  // ... existing code ...
} else {
  console.log(`Skipping DB cleanup — assetId "${assetId}" is not a UUID`);
}
```

This is a ~5-line guard addition. The S3 and SFDC delete steps already handle missing resources gracefully; only the DB step needs this fix.

