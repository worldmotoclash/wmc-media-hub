

# Fix Media Asset Drawer: 7 Issues

## Issues Identified

1. **Missing thumbnail on cards/drawer**: Salesforce image assets have a valid `fileUrl` (the actual image) but no `thumbnailUrl`. The card grid doesn't fall back to `fileUrl` for the thumbnail display.

2. **Drawer header doesn't update after save**: After saving, `isEditing` becomes `false`, so `DrawerTitle` falls back to `asset.title` (the stale prop from the parent). The parent refetch hasn't completed yet or the drawer still holds the old `asset` reference.

3. **"Reanalyze with AI" button is missing**: No such button exists in the drawer code. Needs to be added — it should invoke the `auto-tag-media-asset` edge function.

4. **Tags sync to wrong SFDC field**: The `sync-asset-to-salesforce` edge function maps tags to `ri1__Categories__c` (lines 117, 191, 338, 425). User says tags should map to `ri1__Tags__c`.

## Plan

### 1. Fix thumbnail fallback (UnifiedMediaLibrary + Drawer)
- In the grid card thumbnail `<img>`, use `asset.thumbnailUrl || asset.fileUrl` (the drawer already does this, but the card grid may not for all cases)
- Verify the card grid code uses proper fallback

### 2. Fix drawer header stale after save
- In `MediaAssetDetailsDrawer`, make `DrawerTitle` always use `editableFields.localTitle` instead of conditionally falling back to `asset.title`. The `localTitle` is already synced from `asset.title` on mount and updated during editing, so it's always the most current value.

### 3. Add "Reanalyze with AI" button
- Add a button in the drawer footer (next to Edit Details) that invokes the `auto-tag-media-asset` edge function with the asset ID
- Only show for assets with a valid UUID (local DB record)

### 4. Fix SFDC tag field mapping
- In `sync-asset-to-salesforce/index.ts`, change `ri1__Categories__c` to `ri1__Tags__c` in both `updateSalesforceRecord` and `createSalesforceRecord`

## Files to Edit

| File | Change |
|------|--------|
| `src/components/media/MediaAssetDetailsDrawer.tsx` | Fix header to use `localTitle` always; add "Reanalyze with AI" button |
| `src/components/media/UnifiedMediaLibrary.tsx` | Verify thumbnail fallback uses `thumbnailUrl \|\| fileUrl` |
| `supabase/functions/sync-asset-to-salesforce/index.ts` | Change `ri1__Categories__c` → `ri1__Tags__c` |

