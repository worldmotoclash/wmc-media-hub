

# Bulk Upload with Albums (Drag-and-Drop from Image Capture)

## Overview
Connect your iPhone to your Mac, open Image Capture, select all the photos/videos you want, and drag them straight into a new "Bulk Upload" dropzone. Name the batch as an album, and all files upload in parallel with shared tags and AI auto-tagging.

## What Changes

### 1. New database table: `media_albums`
Stores album metadata so assets can be grouped together.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Required -- e.g. "Utah Race Day 2025" |
| description | text | Optional |
| cover_image_url | text | Auto-set to first image thumbnail |
| asset_count | integer | Defaults to 0, updated as files finish |
| created_by | uuid | Current user |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

RLS: viewable by everyone, insert/update/delete for authenticated users.

### 2. New column on `media_assets`
- `album_id` (uuid, nullable, foreign key to `media_albums.id`)

### 3. New Bulk Upload tab on the Upload Media page (`MediaUpload.tsx`)
- Third tab alongside the existing "Upload Media" and "Generate" tabs
- **Multi-file dropzone** with `multiple` attribute -- accepts drag-and-drop of many files at once (exactly what Image Capture produces)
- **Album name** input (required) and optional shared description/tags
- **File queue** list showing each dropped file with name, size, type icon, and status (queued / uploading / done / error)
- **Combined progress bar** showing overall completion
- **Upload All** button -- processes files 3 at a time using the existing presigned URL flow (all files use presigned since most photos are over 4MB)
- After each file completes: fires `auto-tag-media-asset` for AI analysis in the background
- On completion: shows summary and link to library filtered by the new album

### 4. Edge function update (`upload-master-to-s3`)
- Accept optional `albumId` in the request body
- Store it in `media_assets.album_id` on insert
- Increment `media_albums.asset_count` after successful insert

### 5. Library filtering (`UnifiedMediaLibrary.tsx`)
- Add album dropdown filter to browse assets by album
- Show album badge on asset cards

## Upload Flow

```text
Image Capture (Mac) --> Drag 30 files into browser
  --> Browser queues all 30, shows file list
  --> User names album "Sonoma Raceway March 2025", adds tags "race, sonoma"
  --> Clicks "Upload All"
  --> 3 files upload concurrently:
       1. generate-presigned-upload-url (get S3 URL)
       2. XHR PUT directly to S3 (with per-file progress)
       3. upload-master-to-s3 finalize (albumId + shared tags)
       4. auto-tag-media-asset (background AI tagging)
  --> Progress bar: "12 of 30 complete"
  --> Done: "30 files uploaded to Sonoma Raceway March 2025" with link to album view
```

## Files to Create/Edit

| File | Action |
|------|--------|
| New migration | Create `media_albums` table + add `album_id` column to `media_assets` |
| `src/pages/media/MediaUpload.tsx` | Add "Bulk Upload" tab with multi-file dropzone, queue, and parallel upload logic |
| `supabase/functions/upload-master-to-s3/index.ts` | Accept `albumId`, store on asset, increment album count |
| `src/components/media/UnifiedMediaLibrary.tsx` | Add album filter dropdown and album badges |

## Mobile-Friendly Notes
- iPhone Safari's file picker with `multiple` attribute lets you select many photos at once from Camera Roll (if uploading directly from phone)
- Image Capture drag-and-drop works on desktop browsers natively
- Large "Upload All" button, sticky at the bottom on mobile

