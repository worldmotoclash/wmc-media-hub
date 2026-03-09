

# Sync Asset Edits to Salesforce on Save

## Problem
`handleSave` in `useEditableAssetFields.ts` writes title, description, and tag changes to Supabase only. It never calls `sync-asset-to-salesforce`, so edits are lost from Salesforce's perspective.

## Fix

### File: `src/hooks/useEditableAssetFields.ts`

After the successful local save (after line 164), add a call to the `sync-asset-to-salesforce` edge function:

```typescript
// After toast.success('Changes saved')
try {
  await supabase.functions.invoke('sync-asset-to-salesforce', {
    body: { assetId }
  });
  toast.success('Synced to Salesforce');
} catch (syncErr) {
  console.error('SFDC sync error:', syncErr);
  toast.error('Saved locally but Salesforce sync failed');
}
```

This is a ~8 line addition to a single file. The edge function already handles looking up existing Salesforce records by URL and updating/creating them with the current asset data (title, description, etc.) from the `media_assets` table.

