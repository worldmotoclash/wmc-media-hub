

# Complete Delete: S3 + Salesforce via w2x-engine

## Current State
`deleteMediaAsset()` only removes Supabase DB records. S3 files and Salesforce records are orphaned.

## Plan

### 1. New Edge Function: `delete-media-asset`
**File**: `supabase/functions/delete-media-asset/index.ts`

Accepts `{ assetId, s3Key?, salesforceId? }` and performs three cleanup steps:

1. **S3 deletion** — If `s3Key` provided, delete from Wasabi using `aws4fetch` + shared `s3Config` (same pattern as `delete-master-image`)
2. **Salesforce deletion** — If `salesforceId` provided, POST to w2x-engine with `action=delete`, `sObj=ri1__Content__c`, `Id={salesforceId}` (mirrors the existing `action=update` pattern)
3. **DB cleanup** — Delete `media_asset_tags` join records, then delete the `media_assets` row

```text
w2x-engine delete call:
  FormData:
    retURL  = "https://worldmotoclash.com"
    sObj    = "ri1__Content__c"
    action  = "delete"
    Id      = {salesforceId}
```

### 2. Update client-side service
**File**: `src/services/unifiedMediaService.ts`

Replace direct DB deletes in `deleteMediaAsset` with:
- Fetch asset's `s3_key` and `salesforce_id` first
- Call `supabase.functions.invoke('delete-media-asset', { body: { assetId, s3Key, salesforceId } })`
- `deleteMediaAssets` continues to loop over `deleteMediaAsset`

### 3. Register in config
**File**: `supabase/config.toml`

Add `[functions.delete-media-asset]` with `verify_jwt = false`.

### Files

| File | Change |
|------|--------|
| `supabase/functions/delete-media-asset/index.ts` | New — S3 + w2x-engine delete + DB cleanup |
| `src/services/unifiedMediaService.ts` | Invoke edge function instead of direct DB delete |
| `supabase/config.toml` | Register new function |

