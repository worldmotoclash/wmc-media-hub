

# Fix: Title/Description/Tag Updates Not Pushing to SFDC

## Root Cause

In `sync-asset-to-salesforce/index.ts` (line 282-291), when an asset already has a `salesforce_id`, the function immediately skips it (`continue`). It never sends an update to the w2x-engine. This means edits to title, description, or tags on existing SFDC records are never pushed.

## Fix

**File**: `supabase/functions/sync-asset-to-salesforce/index.ts`

Replace the early-return block (lines 282-291) with an **update** call to w2x-engine when the asset already has a `salesforce_id`. The w2x-engine supports updates via `action=update` + `Id=[salesforce_id]` (same pattern used by the racer portal).

### Changes:

1. **Add an `updateSalesforceRecord` function** that POSTs to w2x-engine with `action=update`, `sObj=ri1__Content__c`, `Id=<salesforceId>`, and the updated fields (title, description, categories/tags, content intent).

2. **Replace the skip block** (lines 282-291): Instead of `continue`, fetch tags for the asset, build sync metadata, and call `updateSalesforceRecord`. Report `action: 'updated'` in results.

3. **Add `'updated'` to the action type** in the results interface.

### New function signature:

```typescript
async function updateSalesforceRecord(
  salesforceId: string,
  title: string,
  metadata?: SfdcSyncMetadata
): Promise<boolean> {
  const formData = new FormData();
  formData.append("retURL", "https://worldmotoclash.com");
  formData.append("sObj", "ri1__Content__c");
  formData.append("action", "update");
  formData.append("Id", salesforceId);
  formData.append("string_Name", title);
  // description, categories, content intent...
  
  const response = await fetch(W2X_ENGINE_URL, { method: "POST", body: formData });
  return response.ok;
}
```

### Updated skip block becomes:

```typescript
if (asset.salesforce_id) {
  // Fetch tags and build metadata
  // Call updateSalesforceRecord(asset.salesforce_id, asset.title, syncMetadata)
  // Push result with action: 'updated'
  continue;
}
```

Single file change: `supabase/functions/sync-asset-to-salesforce/index.ts`

