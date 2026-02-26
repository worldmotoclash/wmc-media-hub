

# Fix Bulk Upload: iOS Selection + RLS Error

## Problems

### 1. Slow iOS photo selection
The mobile file input in `BulkUploadTab.tsx` (line 351-368) uses:
- Programmatic `.click()` via a `<Button onClick>` -- loses user gesture context on iOS
- `accept="image/*,video/*,audio/*"` wildcards -- causes iOS to transcode HEIC photos before returning them, adding significant delay

### 2. RLS violation on `media_albums`
The `media_albums` table has an INSERT policy: `WITH CHECK: (auth.uid() IS NOT NULL)`. This app authenticates users via a custom `UserContext` (Salesforce-based login), not Supabase Auth. Therefore `auth.uid()` is always `null`, and every album insert fails.

The same RLS pattern affects UPDATE and DELETE policies on `media_albums`.

## Changes

### A. Database migration: Fix `media_albums` RLS policies
Drop the existing INSERT, UPDATE, and DELETE policies that require `auth.uid() IS NOT NULL` and replace them with open policies (matching the pattern used by `social_kit_jobs` which also allows anonymous access):

```sql
DROP POLICY "Authenticated users can create albums" ON media_albums;
DROP POLICY "Authenticated users can update albums" ON media_albums;
DROP POLICY "Authenticated users can delete albums" ON media_albums;

CREATE POLICY "Anyone can create albums" ON media_albums FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update albums" ON media_albums FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete albums" ON media_albums FOR DELETE USING (true);
```

### B. `src/components/media/BulkUploadTab.tsx` -- iOS file input fix

1. **Replace the mobile `<Button onClick>` with a `<label htmlFor>`** that wraps the upload trigger, ensuring native user gesture propagation on iOS Safari
2. **Move the `<input>` outside the label** with a unique `id` (via `useId()`) and use `className="sr-only"` instead of `hidden`
3. **Change `accept` to MIME-only**: `"image/jpeg,image/png,image/heic,image/heif,image/webp,video/mp4,video/quicktime,audio/mpeg,audio/mp4,audio/wav"`
4. Apply the same fix to the desktop file input for consistency

## Files Modified

| File | Change |
|------|--------|
| Database migration | Replace 3 RLS policies on `media_albums` to allow anonymous access |
| `src/components/media/BulkUploadTab.tsx` | Use `<label>` instead of programmatic click, MIME-only accept, `useId()` for input id |

