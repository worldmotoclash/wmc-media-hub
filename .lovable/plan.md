

# Fix: iPhone Photo Picker Only Allows 2 Selections

## Problem
On iOS Safari, the `<input type="file">` element has a known quirk: after selecting files once, tapping the button again and selecting more files may not trigger the `onChange` event reliably. This is because the browser sees the same input element with an existing value and sometimes suppresses the change event.

## Root Cause
The file input's `value` is never cleared after a selection. iOS Safari requires the input value to be reset to empty after each use so that subsequent selections reliably fire the `onChange` event.

## Fix
Two changes in `src/components/media/BulkUploadTab.tsx`:

### 1. Reset the file input value after each selection
In the `onChange` handler, clear `e.target.value` after reading the files. This ensures the next tap always triggers `onChange`:

```typescript
onChange={(e) => {
  if (e.target.files) addFiles(e.target.files);
  e.target.value = '';  // Reset so next selection always fires onChange
}}
```

### 2. Apply the same fix to both mobile and desktop file inputs
Both the mobile Camera Roll button input and the desktop dropzone input share a `fileInputRef` -- both need the reset.

### Files Changed
| File | Change |
|------|--------|
| `src/components/media/BulkUploadTab.tsx` | Reset `e.target.value = ''` after each file selection in both mobile and desktop `<input>` onChange handlers |

This is a one-line fix in two places. No backend or database changes needed.

