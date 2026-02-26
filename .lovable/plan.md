

# Fix: iOS Photo Library Selection Not Working

## Problem

When selecting a photo from the iPhone photo library and tapping "Done", nothing happens — the file never appears in the upload UI. The `onChange` event on the hidden `<input type="file">` is not firing.

## Root Cause

The `accept` attribute combines wildcards (`image/*`, `video/*`) with explicit extensions (`.heic`, `.heif`, `.jpg`, `.png`). On iOS Safari, this combination can cause the file picker to fail silently — the `onChange` event doesn't fire after the user selects a file and taps Done. iOS Safari handles MIME-type wildcards and file extensions differently, and mixing them in one `accept` string is unreliable.

Additionally, programmatically clicking a hidden input (`inputRef.current?.click()`) from within a `div`'s `onClick` can sometimes lose the "user gesture" context on iOS Safari, causing the file picker to open but then silently discard the selection.

## Fix

### A. `src/components/racer/RacerFileUpload.tsx`

1. **Split `accept` to use only MIME types** (no dot-extensions mixed with wildcards):
   - Image uploads: `"image/jpeg,image/png,image/heic,image/heif,image/webp"`
   - Video uploads: `"video/mp4,video/quicktime"`
   - Default (both): `"image/jpeg,image/png,image/heic,image/heif,image/webp,video/mp4,video/quicktime"`

2. **Use a `<label>` element wrapping the input** instead of a `div` with `onClick` + programmatic `.click()`. The native `<label htmlFor>` approach is more reliable on iOS Safari because it preserves the user gesture chain without JavaScript intermediation.

3. **Add a unique `id` to the input** so the label's `htmlFor` can reference it directly.

### B. `src/pages/racer/RacerApplication.tsx`

Update `accept` props:
- Bike photos: `accept="image/jpeg,image/png,image/heic,image/heif,image/webp"`
- Audition video: `accept="video/mp4,video/quicktime"`

### C. `src/pages/racer/RacerMotorcycle.tsx`

Update `accept` prop:
- Bike photos: `accept="image/jpeg,image/png,image/heic,image/heif,image/webp"`

## Files Modified

| File | Change |
|------|--------|
| `src/components/racer/RacerFileUpload.tsx` | Replace `div onClick` with `label htmlFor`, use MIME-only accept, add unique input id |
| `src/pages/racer/RacerApplication.tsx` | Update `accept` props to MIME-only strings |
| `src/pages/racer/RacerMotorcycle.tsx` | Update `accept` prop to MIME-only string |

## Technical Detail

```text
iOS Safari file picker compatibility:

BAD  (mixed):  accept="image/*,.heic,.heif,.jpg,.png"
GOOD (MIME):   accept="image/jpeg,image/png,image/heic,image/heif"

BAD  (programmatic click from div):
  <div onClick={() => inputRef.current?.click()}>
    <input type="file" className="hidden" />
  </div>

GOOD (native label association):
  <label htmlFor="file-upload-xyz">
    ...
  </label>
  <input id="file-upload-xyz" type="file" className="sr-only" />
```

