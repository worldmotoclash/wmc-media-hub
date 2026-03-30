

# Add "Sync to SFDC" Button in Asset Details Drawer

## Problem
When an asset shows "Not synced" in the Salesforce Integration section of the details drawer, there's no way to trigger a sync from there. The user must go back to the Media Sources dashboard.

## Fix

**`src/components/media/MediaAssetDetailsDrawer.tsx`**

Add a "Sync to SFDC" button below the "Not synced" badge (lines 304-311). When clicked, it calls `sync-asset-to-salesforce` with the asset's ID, shows a loading state, and updates the badge to "Synced" on success.

Changes:
1. Add `syncing` state variable
2. Add `handleSyncToSfdc` function that invokes the edge function
3. Below the "Not synced" badge, render a button:

```typescript
{!asset.salesforceId && (
  <Button
    size="sm"
    variant="outline"
    onClick={handleSyncToSfdc}
    disabled={syncing}
    className="w-full mt-2"
  >
    {syncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CloudUpload className="h-3 w-3 mr-1" />}
    Sync to SFDC
  </Button>
)}
```

The handler will call `supabase.functions.invoke('sync-asset-to-salesforce', { body: { assetIds: [asset.id] } })`, toast the result, and call `onAssetUpdated?.()` to refresh the parent view.

**One file changed, ~20 lines added.**

