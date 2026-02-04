

# UI Improvement: Remove Redundant Preview Column & Show Full Titles

## The Problem
Looking at the screenshot, there are two issues with the list view:
1. **Redundant Preview Column**: The thumbnail in the Preview column duplicates functionality - the Eye icon in Actions already opens a preview
2. **Truncated Titles**: Titles like "WMC VIP..." are cut off due to the `line-clamp-1` CSS class, making it hard to identify assets

## The Solution
Remove the Preview column entirely and allow titles to display in full. This will:
- Clean up the table by removing redundancy
- Give more horizontal space to the Title column
- Show complete asset names for easy identification

## Changes Required

### File: `src/components/media/UnifiedMediaLibrary.tsx`

**1. Remove Preview Column Header (line 1475)**
Delete this line:
```typescript
// DELETE: <TableHead className="w-16">Preview</TableHead>
```

**2. Remove Preview Column Cell (lines 1577-1631)**
Delete the entire thumbnail TableCell block that renders the preview thumbnail.

**3. Update Title Display (lines 1632-1638)**
Remove the `line-clamp-1` truncation to show full titles:
```typescript
<TableCell>
  <div>
    <p className="font-medium text-sm">{asset.title}</p>  // No line-clamp
    {asset.description && (
      <p className="text-xs text-muted-foreground line-clamp-1">{asset.description}</p>
    )}
  </div>
</TableCell>
```
*Note: Keep description truncated since it's supplementary info*

## Visual Result

### Before
```text
| ☐ | Preview | Title      | Type  | Source    | Status  | Size   | Duration | Uploaded   | Actions |
| ☐ | [img]   | WMC VIP... | image | S3 Bucket | pending | 1.9 MB | –        | 9/26/2025  | 👁 ℹ ➜ 🔗 |
```

### After
```text
| ☐ | Title                           | Type  | Source    | Status  | Size   | Duration | Uploaded   | Actions |
| ☐ | WMC VIP Experience Package      | image | S3 Bucket | pending | 1.9 MB | –        | 9/26/2025  | 👁 ℹ ➜ 🔗 |
```

## Benefits
- **Cleaner layout**: Removes visual clutter from redundant thumbnails
- **Full visibility**: Users can see complete asset names without hovering
- **Better UX**: Preview action is still available via the Eye icon
- **More space**: Title column can expand naturally

## Technical Notes
- The Eye icon (👁) in Actions already calls `setSelectedAsset(asset)` which opens the preview modal
- The Type column already shows an icon indicating the asset type (video/image/audio)
- Description stays truncated to prevent rows from becoming too tall

