

# Sync Tags to Salesforce as Categories

## Current State
- **Description**: Synced via `ri1__Description__c` — working correctly.
- **Tags**: NOT synced. The edge function never queries `media_asset_tags` or `media_tags`. The `categories` field exists in the SFDC mapping but only reads from `asset.metadata.categories`, which is rarely populated.

## Fix

### File: `supabase/functions/sync-asset-to-salesforce/index.ts`

After fetching each asset from `media_assets`, add a query to fetch its tags from the join table:

```typescript
// After fetching the asset, before building syncMetadata:
const { data: tagRows } = await supabase
  .from('media_asset_tags')
  .select('tag_id, media_tags(name)')
  .eq('media_asset_id', asset.id);

const tagNames = (tagRows || [])
  .map((r: any) => r.media_tags?.name)
  .filter(Boolean);
```

Then include `tagNames` in the `syncMetadata.categories` field:

```typescript
categories: tagNames.length > 0 ? tagNames : assetMetadata.categories,
```

This maps tags to `ri1__Categories__c` as a semicolon-delimited string (e.g. `"Racer Submission;Hero Shot;BTS"`), which the `createSalesforceRecord` function already handles via `.join(";")`.

### Single file change
Only `supabase/functions/sync-asset-to-salesforce/index.ts` needs editing. No UI or schema changes required.

