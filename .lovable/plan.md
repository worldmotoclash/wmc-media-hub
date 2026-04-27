## Scope

Two things, narrow:

1. **Make the existing "Fix Filename" button actually appear** for assets with reserved characters in their S3 key (the button's hidden today because `asset.s3Key` is never populated by the data-mapping layer).
2. **Block uploads** (single + bulk) from creating Wasabi keys that contain `:` `*` `?` `#` or runs of double spaces — sanitize the filename client-side before it reaches S3.

**Not doing:** any `.m4v` → `.mp4` re-extensioning. Files keep their original extensions everywhere (rename function, upload validators, drawer detection).

---

## Bug fix — why "Fix Filename" doesn't show

`MediaAssetDetailsDrawer` checks `asset.s3Key`, but `unifiedMediaService.transformDbAsset()` never copies `dbAsset.s3_key` onto the returned object. So the field is always undefined and the button is always hidden.

**Fix:** add one line `s3Key: dbAsset.s3_key` to the transform, and add `s3Key?: string | null` to the `MediaAsset` type (already declared on the interface — just needs the mapping). Detection logic in the drawer stays the same minus the m4v branch.

## Drawer detection — drop the m4v trigger

Change:
```ts
const needsFilenameFix = !!s3Key && (
  /[:*?#]/.test(s3Key) || / {2,}/.test(s3Key) || s3Key.endsWith('.m4v')
);
```
to:
```ts
const needsFilenameFix = !!s3Key && (/[:*?#]/.test(s3Key) || / {2,}/.test(s3Key));
```

## `rename-s3-asset` edge function — preserve extensions

- Default `reextension_m4v` → `false`.
- Remove the `.m4v → .mp4` block from `sanitizeKey`.
- Album-scan filter no longer flags `.m4v` files; only flags reserved chars / double spaces.
- Sanitization rules kept: `:` → `-`, `*` → `_`, drop `?` and `#`, collapse `__` and double spaces, trim edges.

## Upload-time prevention (the part you asked about)

Add a single shared sanitizer used by every upload path so dirty filenames can never reach Wasabi or the DB:

**New helper** `src/utils/sanitizeFilename.ts`:
```ts
// Returns { clean, changed, reason? }
export function sanitizeFilename(name: string) {
  const original = name;
  let s = name
    .replace(/:/g, '-')
    .replace(/\*/g, '_')
    .replace(/[?#]/g, '')
    .replace(/_+/g, '_')
    .replace(/ {2,}/g, ' ')
    .replace(/^[\s_-]+|[\s_-]+$/g, '');
  return { clean: s, changed: s !== original };
}
```

**Wired into:**
- `MediaUpload` (single upload page) — sanitize `file.name` before computing the S3 key; show a small toast if it was changed ("Filename adjusted to `X` — Wasabi can't serve `:` `*` `?` `#`").
- `BulkUploadTab` — same sanitize step inside the per-file loop, with the rename surfaced in the row's filename column so the user sees the new name.
- `RacerFileUpload` — same sanitize step (racer license/bike/audition uploads go to the same Wasabi bucket).
- `upload-master-to-s3` and `generate-presigned-upload-url` edge functions — defensive server-side sanitize on the requested key, so even a custom client can't slip a bad key through.

This means: from now on, any new upload is automatically clean. The "Fix Filename" button only has to deal with the historical files already in Wasabi (like `WMC SIZZLE 4:01  NEW.m4v`).

## Files to change

- `src/services/unifiedMediaService.ts` — add `s3Key: dbAsset.s3_key` mapping (~line 750).
- `src/components/media/MediaAssetDetailsDrawer.tsx` — drop `.m4v` trigger from `needsFilenameFix`; tighten copy ("contains characters Wasabi can't serve" — no mention of m4v).
- `src/components/media/VideoPreviewModal.tsx` — same: error message stops blaming m4v, just says "filename contains reserved characters".
- `supabase/functions/rename-s3-asset/index.ts` — default `reextension_m4v=false`, remove `.m4v` rewrite, drop m4v from album-scan filter.
- `src/utils/sanitizeFilename.ts` — **new** shared helper.
- `src/pages/media/MediaUpload.tsx` — call `sanitizeFilename` before upload.
- `src/components/media/BulkUploadTab.tsx` — call `sanitizeFilename` per file.
- `src/components/racer/RacerFileUpload.tsx` — call `sanitizeFilename` per file.
- `supabase/functions/upload-master-to-s3/index.ts` — server-side sanitize.
- `supabase/functions/generate-presigned-upload-url/index.ts` — server-side sanitize.

## After this is shipped, for the "WMC SIZZLE 4:01  NEW" asset

1. Open it in the drawer.
2. The **File Storage → Fix Filename** button now appears (because `s3Key` is wired through and the key contains `:` and double spaces).
3. Click it. Wasabi object renames from
   `WMC FINAL SIZZLES/WMC SIZZLE 4:01  NEW.m4v`
   →
   `WMC FINAL SIZZLES/WMC SIZZLE 4-01 NEW.m4v` *(extension preserved)*.
4. The video can then be served — though note `.m4v` may still not play in Chrome/Firefox; that's a browser limitation we're explicitly not addressing here. Safari will play it fine.

Approve and I'll implement.
