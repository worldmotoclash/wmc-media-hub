

# Fix Mobile Upload (iPhone) + Swiper Build Error

## Problems Identified

### 1. iPhone file upload compatibility
The `accept="video/*"` attribute is problematic on iOS Safari. iPhones record video as `.MOV` (MIME type `video/quicktime`), and iOS Safari can be inconsistent with the `video/*` wildcard -- sometimes it doesn't show the camera roll or blocks file selection entirely. Similarly, `image/*` can cause issues with HEIC photos.

The `RacerFileUpload` component also lacks the `capture` attribute, which on mobile devices lets users choose between camera and file picker. Without it, iOS may not offer the camera option.

Additionally, the XHR-based S3 PUT upload in `racerMediaService.ts` may fail silently on iOS Safari due to CORS preflight handling differences -- iOS Safari is stricter about certain headers in presigned URL flows.

### 2. Swiper CSS TypeScript errors (blocking build)
`src/components/VideoCarousel.tsx` imports `swiper/css`, `swiper/css/autoplay`, and `swiper/css/navigation` which produce TS2882 errors because the Swiper package lacks type declarations for CSS side-effect imports.

## Fixes

### A. `src/components/VideoCarousel.tsx` -- Fix build error
- Add `// @ts-ignore` comments above each Swiper CSS import to suppress the type-check errors. These are valid runtime imports that Vite handles correctly; they just lack `.d.ts` declarations.

### B. `src/components/racer/RacerFileUpload.tsx` -- iOS compatibility
1. **Expand `accept` defaults** to explicitly include common iPhone formats: add `.heic,.heif,.mov` alongside the wildcards
2. **Add `capture` attribute support** as an optional prop so pages can enable direct camera capture on mobile
3. **Normalize iPhone file types**: when a file is selected, if `file.type` is empty (which happens on some iOS versions for HEIC/MOV), infer the MIME type from the file extension before uploading

### C. `src/services/racerMediaService.ts` -- iOS XHR fix
1. **Strip extra headers from XHR PUT**: only set `Content-Type` on the XHR request (no other custom headers). iOS Safari can reject presigned URL uploads if unexpected headers are included that weren't part of the signature.
2. **Add fallback to `fetch` API**: if XHR upload fails, retry using the Fetch API with `mode: 'cors'` as a fallback, since some iOS versions handle `fetch` better than `XMLHttpRequest` for cross-origin PUT requests.
3. **Add explicit error logging** with the file type and size so mobile failures are diagnosable.

### D. `src/pages/racer/RacerApplication.tsx` and `src/pages/racer/RacerMotorcycle.tsx`
- Update `accept` props to include explicit extensions: `accept="video/*,.mov,.mp4"` for video uploads and `accept="image/*,.heic,.heif,.jpg,.png"` for image uploads

## Files Modified

| File | Change |
|------|--------|
| `src/components/VideoCarousel.tsx` | Add `// @ts-ignore` above 3 Swiper CSS imports |
| `src/components/racer/RacerFileUpload.tsx` | Add MIME type inference for extensionless files, iOS-friendly accept defaults |
| `src/services/racerMediaService.ts` | Add fetch fallback for XHR failure, better error logging with file metadata |
| `src/pages/racer/RacerApplication.tsx` | Update `accept` props with explicit iOS extensions |
| `src/pages/racer/RacerMotorcycle.tsx` | Update `accept` prop with explicit iOS extensions |

## Technical Detail: MIME Inference

```text
Extension → MIME mapping for iPhone edge cases:
  .heic  → image/heic
  .heif  → image/heif
  .mov   → video/quicktime
  .mp4   → video/mp4
  .jpg   → image/jpeg
  .png   → image/png
```

When `file.type` is empty (common on iOS), the extension is extracted from `file.name` and mapped to the correct MIME type before the presigned URL request.

