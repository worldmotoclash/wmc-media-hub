
Plan to fix both issues (image thumbnails + tag list scrolling) in a robust way:

1) Fix thumbnail source selection at the data layer
- File: `src/services/videoContentService.ts`
- Update XML parsing to read both `thumbnailurl` and `thumbnail` (current parser only reads `thumbnail`, which misses many SFDC records).
- Update thumbnail fallback rules:
  - For image content types (jpg/jpeg/png/webp/etc), use `ri__Content_URL__c` as thumbnail when thumbnail is missing/generic.
  - Keep YouTube/video-specific thumbnail behavior for video assets.

2) Fix thumbnail source selection at the UI layer
- Files:
  - `src/components/media/UnifiedMediaLibrary.tsx`
  - `src/components/media/MediaAssetDetailsDrawer.tsx`
- Add a deterministic preview resolver used in both places:
  - Image-like assets: prefer `fileUrl`, then `thumbnailUrl`.
  - Video assets: prefer `thumbnailUrl`, then fallback handling.
- Replace current “always prefer thumbnail first” behavior so SFDC placeholder thumbnails no longer override valid image files.
- Improve `onError` fallback chain so if first URL fails it tries secondary URL before default placeholder (instead of jumping straight to placeholder).

3) Prevent bad thumbnail persistence when creating local records
- File: `src/hooks/useEditableAssetFields.ts`
- In `createLocalRecord`, sanitize incoming thumbnail for image assets:
  - If thumbnail is empty or known generic placeholder, store `file_url` as `thumbnail_url`.
- This avoids reintroducing the same issue for newly localized SFDC assets.

4) Make tag dropdown scrolling explicit and reliable
- File: `src/components/media/EditableDescriptionTags.tsx`
- Replace current implicit cmdk scroll behavior with an explicit fixed-height scroll region:
  - Use a fixed list viewport (`h-64`) with `overflow-y-auto`/`overflow-y-scroll` and `overscroll-contain`.
  - Add wheel event containment on the dropdown/list container so scroll input doesn’t get captured by the drawer behind it.
- Keep search + select behavior unchanged.

5) Verification checklist (after implementation)
- Open an image asset with SFDC ID and confirm card + drawer use the actual image URL (not sponsor placeholder) across reopen.
- Open tag picker with many tags and confirm mouse wheel/trackpad scroll reaches all tags.
- Confirm selecting/adding/removing tags still works and save behavior remains unchanged.
