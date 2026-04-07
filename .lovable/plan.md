
# Add Diagnostic Logging to Confirm Description Reaches w2x-engine

## Situation

The field mapping is **already correct** — `string_ri1__Description__c` with `action=update` matches your working HTML form. The code reads `asset.description` from the DB (line 399) and passes it to `updateSalesforceRecord` (line 157).

Possible reasons the description isn't appearing in Salesforce:
1. The description is `null` or empty at sync time (the `if (metadata?.description)` guard on line 156 would skip it entirely)
2. The edge function isn't being called after a description edit
3. The w2x-engine is silently dropping the field for some records

## Plan: Add diagnostic logging (1 file, ~3 lines)

### `supabase/functions/sync-asset-to-salesforce/index.ts`

**In `updateSalesforceRecord` (after line 154):** Add a log line showing exactly what description value is being sent:
```typescript
console.log(`Update payload → title="${title}", description="${metadata?.description?.substring(0, 80) || '(empty)'}", tags="${metadata?.categories?.join(';') || '(none)'}"`);
```

**In the main loop (after line 399):** Log the metadata being assembled:
```typescript
console.log(`Sync metadata for ${asset.id}: description=${syncMetadata.description ? 'YES (' + syncMetadata.description.length + ' chars)' : 'NULL'}, tags=${syncMetadata.categories?.length || 0}`);
```

This will let us see in the edge function logs whether:
- The description value is actually populated when the sync runs
- The value reaches the `updateSalesforceRecord` function

After deploying, trigger a sync on an asset with a description and check the logs. If the description shows as NULL, the issue is timing (DB not yet updated when sync fires). If it shows the value, the issue is on the w2x-engine side.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/sync-asset-to-salesforce/index.ts` | Add 2 diagnostic `console.log` lines |
