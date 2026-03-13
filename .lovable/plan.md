

# Fix Tag Scrollability + Enable Editing for Salesforce-Imported Assets

## Problems Identified

1. **Tag dropdown not scrollable**: The `CommandList` in the tag picker has no max-height constraint, so a long tag list overflows without scrolling.

2. **"Edit Details" disabled for Salesforce-sourced assets**: The `canEdit` check requires the asset `id` to be a valid UUID. Salesforce-only assets get synthetic IDs like `sf_a2FQQ00000258qD`, which fail this check. Even when an asset has a valid Wasabi file URL and a correct SFDC record, if no local `media_assets` row exists (or the deduplication didn't match it), it appears as a Salesforce-only asset and is not editable.

## Solution

### 1. Tag dropdown scrollability

Add `className="max-h-[200px]"` to the `CommandList` component in `EditableDescriptionTags.tsx`. The `cmdk` CommandList already renders a scrollable container when max-height is set.

### 2. Auto-create local records for Salesforce-only assets

When a user clicks "Edit Details" on a Salesforce-only asset (non-UUID id), automatically create a local `media_assets` row using the asset's existing metadata (title, description, fileUrl, thumbnailUrl, salesforceId, etc.), then switch to the newly created UUID-based record so editing works normally.

**Flow:**
- User clicks "Edit Details" on a `sf_*` asset
- System inserts a new `media_assets` row with the asset's known fields
- The drawer updates to use the new UUID-based asset
- Editing proceeds as normal (title, description, tags, with Salesforce sync on save)

## Files to Edit

| File | Change |
|------|--------|
| `src/components/media/EditableDescriptionTags.tsx` | Add `max-h-[200px]` to `CommandList` |
| `src/components/media/MediaAssetDetailsDrawer.tsx` | Add "create local record" logic when Edit Details is clicked on a non-editable (sf_*) asset |
| `src/hooks/useEditableAssetFields.ts` | Add a `createLocalRecord` method that inserts into `media_assets` and updates the hook's internal assetId, then enables editing |

