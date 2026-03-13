

# Auto-Create Albums from Wasabi Folder Structure

## Overview
Enhance the `scan-s3-buckets` edge function to automatically create `media_albums` from S3 folder paths and assign scanned assets to them. Add an "Auto" badge in the UI.

## Database Changes

Add two columns to `media_albums`:
- `source` (text, default `'manual'`) — distinguishes auto vs curated albums
- `wasabi_path` (text, nullable) — the folder path that generated this album

This avoids a new table and keeps the existing album system intact.

## Edge Function Changes — `supabase/functions/scan-s3-buckets/index.ts`

### New helper functions

1. **`deriveAlbumName(key: string): string | null`**
   - Extract folder segments from the S3 key (everything before the filename)
   - Filter out ignored folders: `tmp`, `uploads`, `raw`, `cache`, `thumbnails`
   - If 2+ folders remain, join the last two with ` - ` (e.g. `INTERVIEWS/RIVERSIDE/file.mp4` → `INTERVIEWS - RIVERSIDE`)
   - If 1 folder, use it as-is (e.g. `INTERVIEWS/file.mp4` → `INTERVIEWS`)
   - If no folders (root-level file), return `null` (no album assignment)

2. **`deriveWasabiPath(key: string): string`**
   - Return the folder portion of the key (everything before the last `/`)

### Album cache and assignment logic

Before the batch loop:
- Pre-fetch all existing `media_albums` into a `Map<string, string>` keyed by lowercase album name → album id
- This serves as a write-through cache to avoid duplicate creation

Inside the per-object loop, after a successful insert/update that yields an `assetId`:
- Call `deriveAlbumName(obj.Key)`
- If result is non-null and the asset has no `album_id` already:
  - Look up the album name in the cache
  - If not found: insert into `media_albums` with `source: 'auto'`, `wasabi_path`, and cache the new id
  - Update the `media_assets` record with `album_id`
- Track `albumsCreated` count in scan results

### Performance safeguards
- Album lookups are O(1) via the in-memory Map — no per-object DB queries
- Album creation is rare (only on first encounter of a new folder path)
- Asset `album_id` update is piggy-backed onto the existing per-object DB write where possible

## UI Changes — `src/components/media/UnifiedMediaLibrary.tsx`

Where albums are displayed (album filter dropdown, album badges):
- If album has `source === 'auto'`, render a small `<Badge variant="outline">Auto</Badge>` next to the name
- This requires fetching the `source` column when loading albums (minor select update)

## Files to Edit

| File | Change |
|------|--------|
| `supabase/functions/scan-s3-buckets/index.ts` | Add `deriveAlbumName`, album cache, auto-assign logic |
| `src/components/media/UnifiedMediaLibrary.tsx` | Show "Auto" badge on auto-generated albums |
| Migration SQL | Add `source` and `wasabi_path` columns to `media_albums` |

## Ignored Folder Names
`tmp`, `uploads`, `raw`, `cache`, `thumbnails`, `THUMBNAILS` — these are storage/utility folders, not content collections.

