## Goal

Let users upload `.heic` / `.heif` photos straight from iPhone (Photos app, Files, share sheet) and have them flow through the existing pipeline — AI analysis, S3 upload, SFDC sync — as if they were JPEGs.

## Why this needs work

HEIC is Apple's default photo format on iPhone since iOS 11. Today:
- Browsers (other than Safari) cannot render HEIC, so previews break.
- The Lovable AI Gateway / Gemini vision API does not accept HEIC — auto-tagging silently fails.
- Existing accept filters (`image/*` in `ImageDropzone`, `BulkUploadTab`, `MasterImageUploadDialog`, `MediaUpload`, `RacerFileUpload`) let HEIC through, but downstream the file is uploaded raw to Wasabi and then nothing can display or analyze it.

## Approach: client-side convert to JPEG before anything else touches the file

Convert HEIC→JPEG in the browser the moment a file is selected. Once converted, the rest of the pipeline (preview, AI analysis, S3 upload, thumbnail generation, SFDC sync) is unchanged.

Library: **`heic2any`** (~70 KB gz, pure browser, no native deps, MIT). It uses libheif compiled to WASM.

### Flow

1. User picks a `.heic` / `.heif` file (or one with `type: image/heic` / `image/heif`).
2. New shared util `convertHeicIfNeeded(file)` in `src/utils/heicConvert.ts`:
   - Returns the original `File` untouched if not HEIC.
   - Else dynamically imports `heic2any`, converts to JPEG (quality 0.92), wraps the resulting Blob in a new `File` with the original name rewritten from `IMG_1234.HEIC` → `IMG_1234.jpg` and MIME `image/jpeg`.
   - Shows a subtle toast: "Converting iPhone photo…" with progress for files >5 MB.
3. All upload entrypoints call this util **first**, then proceed with their existing code.

### Files to update (one-line change each — call `convertHeicIfNeeded` before current logic)

- `src/components/media/ImageDropzone.tsx`
- `src/components/media/BulkUploadTab.tsx`
- `src/components/media/MasterImageUploadDialog.tsx`
- `src/pages/media/MediaUpload.tsx`
- `src/pages/media/SceneDetection.tsx` (if it accepts images)
- `src/components/racer/RacerFileUpload.tsx`
- `src/pages/racer/RacerMotorcycle.tsx`
- `src/pages/racer/RacerApplication.tsx`
- `src/components/media/VideoExtendWorkflow.tsx`

Also update each component's `accept` prop to explicitly include `image/heic,image/heif,.heic,.heif` so iOS Safari surfaces the file.

### Edge cases handled

- **iPad / iPhone Safari**: Safari can natively render HEIC, but we still convert so the file that hits Wasabi is JPEG (otherwise SFDC + non-Apple users can't view it).
- **Large HEIC** (>20 MB live photos): heic2any can be slow on low-end phones. Util enforces a 50 MB pre-conversion cap with a clear error toast.
- **HEIC bursts / multi-image containers**: heic2any returns the primary image only — acceptable for our use case.
- **Filename**: preserve original casing of base name; always end `.jpg`.
- **Tag persistence / album assignment**: unchanged because we're feeding the existing pipeline a normal JPEG.

### Memory update (non-technical)

Replace the `Image Capture Workaround` memory line with a note that HEIC is now auto-converted to JPEG on the client, so users no longer have to convert manually.

## What we're not doing

- No server-side HEIC conversion (would require an extra edge function and roundtrip; client conversion is faster and free).
- No format change for files already stored in Wasabi as `.heic` (rare; can be re-uploaded).
- No HEIC support for `.heic` videos — those are actually `.mov` from iPhone and already work.

## Verification

1. Drag a real iPhone HEIC into Media Upload → preview renders, AI analysis returns categories/tags, file lands in Wasabi as `IMG_xxxx.jpg`, SFDC record gets the JPEG URL.
2. Bulk upload 5 HEICs at once → all convert, AI analysis fans out, no console errors.
3. Racer portal: upload license photo as HEIC → appears in the Licenses album as JPEG.
4. Confirm a normal JPEG path is unchanged (no double-encode, no quality loss).

## Files / dependencies

- New dep: `heic2any` (~70 KB gz)
- New file: `src/utils/heicConvert.ts`
- ~9 component edits (each: one import + one `await convertHeicIfNeeded(file)` line + accept-attr tweak)
- No DB migration, no edge function changes
