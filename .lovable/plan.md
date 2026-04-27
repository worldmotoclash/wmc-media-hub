# Why "WMC SIZZLE 4:01 NEW" Won't Play

## How it's mapped to Wasabi

The asset (`media_assets.id = 2538b99b-b906-46ec-80d6-3bc8055ffa5d`) was discovered by the `scan-s3-buckets` edge function (source = `s3_bucket`) and stored with:

- **s3_key**: `WMC FINAL SIZZLES/WMC SIZZLE 4:01  NEW.m4v`
- **file_url**: `https://media.worldmotoclash.com/WMC%20FINAL%20SIZZLES/WMC%20SIZZLE%204:01%20%20NEW.m4v`

`<VideoPreviewModal>` simply renders `<video src={file_url} controls />`, so the browser fetches that exact URL from the Wasabi CDN.

## Root causes (two problems stacked)

**1. The URL returns HTTP 403 from Wasabi/Cloudflare**
I tested the CDN URL directly — both the raw `:` and percent-encoded `%3A` versions return `403 Forbidden`. The colon in the filename (`4:01`) is a reserved URL character; Wasabi's signature/path handling does not match the object key the way the CDN forwards it. Other videos in the same album with no colon (e.g. `WMC SIZZLE 1:08 *HOEBER VIDEO NEW*.m4v` — wait, that has a colon too) fail for the same reason. Files without colons in the name play fine. This is the primary blocker.

**2. `.m4v` is not universally playable**
Even if the file loaded, `.m4v` (Apple's variant of MP4) is only reliably playable in Safari. Chrome/Firefox usually need the file served as `video/mp4` or transcoded. Many of the "S3-discovered" entries in this album are `.m4v`.

## The fix

### Step 1 — Rename the offending S3 objects
The cleanest fix is to remove `:` (and other shell-unsafe chars like `*`) from the actual Wasabi object keys, then re-sync. Specifically for this album the files needing rename are any with `:` or `*` in the name. Example:

```
WMC FINAL SIZZLES/WMC SIZZLE 4:01  NEW.m4v
  → WMC FINAL SIZZLES/WMC SIZZLE 4-01 NEW.m4v
```

I'll build a small admin edge function `rename-s3-asset` that:
1. Takes a `media_asset_id`.
2. Copies the object in Wasabi to a sanitized key (replace `:` → `-`, collapse `**`/`*` → `_`, collapse double-spaces).
3. Deletes the old object.
4. Updates `media_assets.s3_key` and `file_url` in the DB.
5. Optionally re-extension `.m4v` → `.mp4` (no transcode, just rename — works for the majority of m4v files which are already H.264/AAC MP4 containers).

Expose a "Fix filename" button in the asset details drawer (admin-only) and a bulk "Sanitize album filenames" action on the album.

### Step 2 — Defensive playback in the UI
Update `VideoPreviewModal` so that when `src` fails to load (`onError`), it:
- Shows a clear error: "This file's name contains characters Wasabi can't serve over HTTP. Click 'Fix filename' to repair."
- Surfaces a direct "Open in new tab" + "Repair" action.

### Step 3 — Prevent recurrence
Update `scan-s3-buckets` to flag any newly-discovered key containing `:` `*` `?` `#` (or other reserved chars) and either auto-sanitize on ingest or mark `status = 'needs_rename'` so they show up in the Sync Health dashboard.

## Files to add / change

- `supabase/functions/rename-s3-asset/index.ts` (new)
- `src/components/media/MediaAssetDetailsDrawer.tsx` — add "Fix filename" button (admin only)
- `src/components/media/VideoPreviewModal.tsx` — add `onError` handler + clearer error UI
- `supabase/functions/scan-s3-buckets/index.ts` — flag reserved-char keys

## Confirm before I build

Two quick questions before I switch to build mode:

1. **Rename strategy**: replace `:` with `-` and `*` with `_` (my proposal), or different mapping?
2. **Re-extension `.m4v` → `.mp4`**: do it as part of the rename (improves cross-browser playback, no transcode needed), or leave extensions alone?
