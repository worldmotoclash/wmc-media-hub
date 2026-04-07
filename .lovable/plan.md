

# Fix "Sync to SFDC" Button — Show SFDC ID After Sync

## Problem

When clicking "Sync to SFDC", the edge function creates the Salesforce record successfully (302 redirect = success), but returns `action: 'created_pending'` **without a `salesforceId`** in the response. The UI code at line 368 checks `if (result?.salesforceId)` — which is always false for new records — so the ID badge never appears.

The SFDC ID is resolved asynchronously by the `backfill-salesforce-ids` function, but the UI doesn't poll for it.

## Fix

After a successful `created_pending` sync, poll the local DB for the `salesforce_id` to appear (the backfill function resolves it within 30-60 seconds). Show a "Pending SFDC ID..." indicator while waiting, then display the clickable link once resolved.

### `src/components/media/MediaAssetDetailsDrawer.tsx`

**In the Sync to SFDC click handler (lines 359-379):**

After getting a successful response with `action === 'created_pending'`:
1. Show toast: "Record created — waiting for Salesforce ID..."
2. Poll `media_assets.salesforce_id` every 5 seconds, up to 12 attempts (60s)
3. When found, update `localSalesforceId` and show success toast with the clickable link
4. If timeout, show info toast telling user the ID will appear shortly

```typescript
// After successful sync response
if (result?.salesforceId) {
  setLocalSalesforceId(result.salesforceId);
} else if (result?.action === 'created_pending') {
  toast.info('Record created — resolving Salesforce ID...');
  // Poll for backfilled ID
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const { data: refreshed } = await supabase
      .from('media_assets')
      .select('salesforce_id')
      .eq('id', asset.id)
      .single();
    if (refreshed?.salesforce_id) {
      setLocalSalesforceId(refreshed.salesforce_id);
      toast.success('Salesforce ID resolved');
      break;
    }
  }
}
```

**Also update the sync status badge area (line 355):** When `localSalesforceId` is null but sync was triggered, show a "Pending ID..." spinner instead of the "Sync to SFDC" button.

### Files Changed

| File | Change |
|------|--------|
| `src/components/media/MediaAssetDetailsDrawer.tsx` | Add post-sync polling for SFDC ID; update UI to show pending state |

One file, ~20 lines added.

