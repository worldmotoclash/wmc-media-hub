

# Fix: Drag-and-Drop from Image Capture Not Detected

## Root Cause
When dragging files from macOS Image Capture into the browser, the drag events fire but the browser handles them differently than standard file drags. Two issues:

1. **No visual feedback**: The `dragover` handler works but there's no `e.stopPropagation()`, so parent elements may swallow the event. More importantly, Image Capture uses macOS "promised files" -- the actual `File` objects may not be in `e.dataTransfer.files` until the drop completes. The `dragover` event needs to check `e.dataTransfer.types.includes('Files')` rather than inspecting actual files.

2. **Empty `files` on drop**: Image Capture may populate `dataTransfer.items` instead of `dataTransfer.files`. The drop handler needs to also check `e.dataTransfer.items` and use `getAsFile()` as a fallback.

## Changes to `src/components/media/BulkUploadTab.tsx`

### 1. Fix `handleDragOver` -- add stopPropagation and proper type check
```typescript
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // Check if drag contains files (works even for promised files from Image Capture)
  if (e.dataTransfer.types.includes('Files')) {
    setIsDragOver(true);
  }
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragOver(false);
};
```

### 2. Fix `handleDrop` -- extract files from both `files` and `items`
```typescript
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragOver(false);

  // Try dataTransfer.files first (standard browsers)
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    addFiles(e.dataTransfer.files);
    return;
  }

  // Fallback: extract from dataTransfer.items (Image Capture / promised files)
  if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
    const files: File[] = [];
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      const item = e.dataTransfer.items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      addFiles(files);
    }
  }
};
```

### 3. Add debug logging (temporary, to help verify)
Add a `console.log` in both `handleDragOver` and `handleDrop` to confirm events fire and what data is available. This will help us verify the fix works and can be removed afterward.

```typescript
const handleDrop = (e: React.DragEvent) => {
  console.log('Drop event:', {
    filesCount: e.dataTransfer.files?.length,
    itemsCount: e.dataTransfer.items?.length,
    types: Array.from(e.dataTransfer.types),
  });
  // ... rest of handler
};
```

## No Other Files Change
The validation (`isValidMedia`) and upload logic remain the same -- only the drag event handling is fixed.

## Summary
- Add `e.stopPropagation()` to prevent parent interference
- Use `e.dataTransfer.types.includes('Files')` for dragover detection (works with promised files)
- Add `dataTransfer.items` fallback for the drop handler
- Add temporary console logging to verify the fix

