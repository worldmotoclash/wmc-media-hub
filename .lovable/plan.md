

# Fix: Tag Editor Not Visible

## Root Cause

The "Edit Details" button only renders when `editableFields.canEdit` is `true` (line 251 of `MediaAssetDetailsDrawer.tsx`). `canEdit` is determined by checking if the asset ID is a valid UUID (line 57-60 of `useEditableAssetFields.ts`):

```typescript
const isValidUUID = (id?: string) =>
  !!id?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-...$/i);
const canEdit = isValidUUID(assetId);
```

If any assets have non-UUID IDs (e.g. Salesforce IDs or composite keys), the button is completely hidden with no indication why.

## Fix

### 1. Always show the Edit Details button
**File**: `src/components/media/MediaAssetDetailsDrawer.tsx` (line 251)

Remove the `editableFields.canEdit &&` guard. Instead, always render the button but disable it when `canEdit` is false, with a tooltip explaining why:

```tsx
<Button
  variant="outline"
  className="flex-1"
  onClick={editableFields.startEditing}
  disabled={!editableFields.canEdit}
  title={!editableFields.canEdit ? 'This asset cannot be edited (external source)' : undefined}
>
  <Pencil className="w-4 h-4 mr-2" />Edit Details
</Button>
```

This ensures users always see the button and understand why it may be unavailable, rather than wondering where the edit functionality went.

