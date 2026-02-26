

# Add Racing License Image Upload to Racing History Step

## Overview

Add a `RacerFileUpload` component directly below the "Racing License Type" field on Step 1 (Racing History). Uploaded images will be tagged and assigned to a "Racing Licenses" album in S3/Supabase.

## Changes

### 1. `src/services/racerMediaService.ts`

- Add optional `albumId?: string` to `RacerUploadOptions` interface
- Pass `albumId` through to the `upload-master-to-s3` edge function body (the function already supports this field)

### 2. `src/components/racer/RacerFileUpload.tsx`

- Add optional `albumId?: string` prop to `RacerFileUploadProps`
- Forward `albumId` to `uploadRacerFile()` call

### 3. `src/pages/racer/RacerApplication.tsx`

- Add state + logic to find-or-create a "Racing Licenses" album in `media_albums` table on mount
- Add a `RacerFileUpload` component immediately after the Racing License Type input (line 310), configured with:
  - `category="Racing License"`
  - `albumId={racingLicensesAlbumId}`
  - `accept="image/jpeg,image/png,image/heic,image/heif,image/webp"`
  - `label="Upload Racing License Image"`
- On upload complete, store the CDN URL in formData (e.g. `licenseImageUrl`) for reference

### Album Lookup Flow

On component mount (alongside loading racer data), query `media_albums` for a row with `name = 'Racing Licenses'`. If none exists, insert one. Cache the album ID in state. This ensures all racing license uploads across all racers land in the same album, with per-racer identification via the existing tag system (`['Racer Submission', racerName, 'Racing License']`).

## Files Modified

| File | Change |
|------|--------|
| `src/services/racerMediaService.ts` | Add `albumId` to options and pass to edge function |
| `src/components/racer/RacerFileUpload.tsx` | Add `albumId` prop, forward to upload call |
| `src/pages/racer/RacerApplication.tsx` | Find-or-create "Racing Licenses" album; add upload component below license type field |

