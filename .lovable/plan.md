

# Auto-Sync New Uploads to Salesforce

## Problem
The bulk upload flow (`BulkUploadTab.tsx`) uploads files to S3 and creates `media_assets` records, but never calls `sync-asset-to-salesforce`. New content only reaches Salesforce if the user manually triggers "Sync to SFDC" from the Media Sources dashboard.

## Fix

**`src/components/media/BulkUploadTab.tsx`**

After the bulk upload completes successfully (line ~354, after `setUploadDone(true)`), call `sync-asset-to-salesforce` with the IDs of all successfully uploaded assets:

```typescript
// After upload completes, sync new assets to Salesforce
const successfulIds = queue
  .filter(f => f.status === 'done' && f.assetId)
  .map(f => f.assetId!);

if (successfulIds.length > 0) {
  toast.info(`Syncing ${successfulIds.length} assets to Salesforce...`);
  supabase.functions.invoke('sync-asset-to-salesforce', {
    body: { assetIds: successfulIds }
  }).then(({ error }) => {
    if (error) {
      console.error('SFDC sync error:', error);
      toast({ title: "SFDC sync failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salesforce sync complete", description: `${successfulIds.length} assets synced` });
    }
  });
}
```

This requires that each queued file stores its resulting `assetId` after successful upload. I'll need to check if `uploadSingleFile` already stores the asset ID on the queue item — if not, I'll add that.

The sync runs asynchronously (fire-and-forget with toast feedback) so it doesn't block the upload completion UI.

**One file changed**: `BulkUploadTab.tsx` — ~15 lines added.

