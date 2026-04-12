

# Fix Missing Creator Attribution on Single Media Upload

## Problem
The single upload flow in `MediaUpload.tsx` does not pass `creatorContactId` to `upload-master-to-s3`, so uploaded files are not linked to the uploader's Salesforce Contact record. Bulk upload and Master Image upload already include it correctly.

## Current State

| Upload Flow | Sends `creatorContactId`? |
|---|---|
| Bulk Upload (`BulkUploadTab.tsx`) | Yes |
| Master Image Upload (`MasterImageUploadDialog.tsx`) | Yes |
| Single Upload (`MediaUpload.tsx`) — direct file | **No** |
| Single Upload (`MediaUpload.tsx`) — AI generation | Yes |
| Racer Upload (`racerMediaService.ts`) | **No** |

## Changes

### 1. `src/pages/media/MediaUpload.tsx`
Add `creatorContactId: user?.id` to both upload paths:
- **Presigned URL finalize** (line ~672 body): add `creatorContactId: user?.id`
- **Base64 upload** (line ~727 body): add `creatorContactId: user?.id`

### 2. `src/services/racerMediaService.ts`
Add `creatorContactId: racerContactId` to the `upload-master-to-s3` finalize call (line ~78 body). The `racerContactId` parameter is already passed into the function but not forwarded.

## Files

| File | Change |
|---|---|
| `src/pages/media/MediaUpload.tsx` | Add `creatorContactId` to both direct upload paths |
| `src/services/racerMediaService.ts` | Forward existing `racerContactId` param to finalize call |

