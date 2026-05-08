# HEIC upload — three real bugs, one shared symptom

The screenshot ("Analysis Failed: Failed to load image for resize") plus today's edge logs for `IMG_8235` (a2FQQ0000023v5R) show three independent problems stacking up. They need to be fixed together, otherwise the user keeps seeing "successful" uploads that point to the wrong Salesforce record.

## What actually happened on your IMG_8235.heic upload

1. HEIC → JPEG conversion **worked** (upload-master-to-s3 received `IMG_8235.jpg`, 4032×3024).
2. The inline create call to `w2x-engine.php` returned **HTTP 200 with `ERROR creating the record!<br/><pre></pre>**` — Salesforce rejected the create, but the asset was saved locally with no SFDC ID.
3. The client then auto-fired `sync-asset-to-salesforce`. Strategy 2 (filename match) compared the asset's last URL segment `master.jpg` against every other image in SFDC — they all end in `master.jpg` — and "found" `a2FQQ0000023v5R`, a record that belongs to a different asset. The DB row got that ID stamped on it and the toast said *Salesforce sync complete*. That's why no real new record exists.
4. The "Failed to load image for resize" toast is a separate, earlier failure in the client AI-analyze step, before upload. Conversion is async; if the user clicks **Analyze** while heic2any is still working (or after switching files quickly), `selectedFile` can briefly be the original HEIC blob, which `<img>` cannot decode → the resize promise rejects with that exact message.

## Fixes

### 1. Stop matching on `master.jpg` / `master.mp4` (highest-impact bug)

`supabase/functions/sync-asset-to-salesforce/index.ts` — Strategy 2 (filename match):

- Skip the fallback when the filename is one of our generic master keys (`master.jpg`, `master.mp4`, `master.png`, `master.webp`, `master.mp3`, `thumbnail.jpg`).
- Add a guard: a filename match only counts if either the parent UUID path segment also matches, or the SFDC record's title equals the asset title. This protects against any future generic key.
- Log "Strategy 2 skipped — generic filename" so we can see this in the edge logs instead of silently linking to the wrong record.

### 2. Make w2x-engine create errors visible

`supabase/functions/upload-master-to-s3/index.ts` (the inline SFDC create around line 467–496):

- Treat `status === 200` whose body contains `ERROR creating the record` as a hard failure (today it's flagged but the user-facing toast doesn't reflect it).
- Persist the failure into `media_assets.metadata.sfdc_sync_error` so the drawer's existing "Sync to SFDC" retry button can pick it up.
- Mirror the same parsing in `sync-asset-to-salesforce/index.ts` `createSalesforceRecord` (line 293–308) — currently only `302` is success and any other 200 is silently treated as `false`, which is fine, but the body should be captured into the per-asset result so the parent toast can say *SFDC create rejected* instead of *Salesforce sync complete*.

### 3. Front-end toast honesty

`src/pages/media/MediaUpload.tsx` (lines 836–863):

- Change the success branch to read the per-asset `action` (`created` / `found` / `updated`) returned by `sync-asset-to-salesforce` and word the toast accordingly: *Linked to existing Salesforce record*, *Created Salesforce record*, or *Salesforce sync queued — awaiting backfill*.
- On `success: false`, surface the captured `sfdc_sync_error` text instead of a generic "use Sync to SFDC to retry".
- Apply the same pattern in `BulkUploadTab.tsx` (it follows the same shape).

### 4. Harden the HEIC → analyze path

`src/pages/media/MediaUpload.tsx`:

- Disable the **Analyze** button while `selectedFile` is null **or** while `convertHeicIfNeeded` is in flight (track an `isPreparingFile` boolean alongside the existing state).
- In `resizeImageForAnalysis`: if `img.onerror` fires and the file's MIME/extension still looks like HEIC/HEIF, run `convertHeicIfNeeded` once more on the spot and retry the resize before rejecting. This catches the rare case where state mutated faster than the conversion settled.
- Replace the generic toast text with the actual cause: *"Could not read this image — please reselect the file."*

## Out of scope

- No DB schema changes.
- No change to heic2any usage itself — conversion is working; the bug is around it.
- No retroactive cleanup of the `IMG_8235` row that already got `a2FQQ0000023v5R` stamped on it. After the fixes ship, hitting **Sync to SFDC** in its drawer will create a fresh, correct record (assuming we identify what the original w2x-engine `ERROR creating the record` was — most likely the unsupported `Content_Type__c` value `JPG`; once #2 surfaces the response, we'll know).

## Files touched

- `supabase/functions/sync-asset-to-salesforce/index.ts`
- `supabase/functions/upload-master-to-s3/index.ts`
- `src/pages/media/MediaUpload.tsx`
- `src/components/media/BulkUploadTab.tsx`

## Verification

1. Re-upload an iPhone HEIC at /admin/media/upload.
2. Confirm Analyze is disabled until the conversion toast clears, then succeeds.
3. Confirm edge logs show either a real `302` create or a captured `ERROR creating the record` body — and the front-end toast matches.
4. Check `media_assets` for the new row: `salesforce_id` is either a fresh ID from a 302 redirect or `pending_id`, **not** an unrelated existing record.

Additional. Lets add storage for the heic file and allow for a link to download the orginal file. I understand the need for the jpg conversion so this will be a varriant.

&nbsp;