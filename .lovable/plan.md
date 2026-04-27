## Why "No SFDC" appeared

Your asset (`WMC Social Media Preformance Chart`, id `14ae56bc…`) was created cleanly in `media_assets` but its `salesforce_id` is `NULL`. The badge is correctly reflecting reality — the Salesforce sync was never triggered.

**Root cause:** `src/pages/media/MediaUpload.tsx` (the Single Upload tab) finishes after `upload-master-to-s3` returns and never invokes `sync-asset-to-salesforce`. Bulk Upload does call it (`BulkUploadTab.tsx:388`); single upload does not. The last 5 local uploads (4/22 → 4/27) all have `salesforce_id = NULL`, confirming this is systemic.

## The fix

Add the same auto-sync call that Bulk Upload uses to the end of the single-upload success path.

### Change: `src/pages/media/MediaUpload.tsx`

In the upload handler, after the toast `"Upload successful!"` (around line 810), capture the new asset id returned from `upload-master-to-s3` and fire-and-forget a sync call:

```ts
// After successful upload, before clearing the form
const newAssetId = data?.assetId ?? data?.id ?? presignData?.masterId;

if (newAssetId) {
  toast({ title: "Syncing to Salesforce…", description: "Creating SFDC record" });
  supabase.functions
    .invoke('sync-asset-to-salesforce', { body: { assetIds: [newAssetId] } })
    .then(({ error }) => {
      if (error) {
        console.error('SFDC sync error:', error);
        toast({
          title: "SFDC sync failed",
          description: `${error.message} — use "Sync to SFDC" in the asset details to retry.`,
          variant: "destructive",
        });
      } else {
        toast({ title: "Salesforce sync complete" });
      }
    });
}
```

Both branches (presigned >4MB and base64 ≤4MB) flow through the same success block, so this is a single insertion point — applies to images, videos, and audio.

### Notes / safety

- Fire-and-forget (no `await`) so the user isn't blocked. Matches Bulk Upload pattern exactly.
- Per the async-id-resolution memory, SFDC propagation can take 30–60s; the badge will refresh to "Synced" once `salesforce_id` is populated.
- Existing manual "Sync to SFDC" button in the asset details drawer remains available as the retry path if the auto-sync errors.
- No DB migration, no edge function changes — `sync-asset-to-salesforce` already exists and works.

### Backfill for your current asset

After the fix, you can resync the existing "WMC Social Media Preformance Chart" using the **Sync to SFDC** button in its details drawer (no need to re-upload). Same for the other 4 unsynced uploads from 4/22 if desired — or I can run a one-shot sync invocation for all 5 once you approve.

## Files touched

- `src/pages/media/MediaUpload.tsx` — add SFDC auto-sync after successful single upload (one block, both upload paths)
