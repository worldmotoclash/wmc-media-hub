

# Fix: "Failed to create album, invalid syntax" on iPhone

## Root Cause
The `media_albums.created_by` column is type `uuid`, but `user.id` is a **Salesforce Contact ID** (e.g., `003XXXXXXXXXXXXXXX`) -- not a valid UUID. When the bulk upload tries to insert a new album row with this non-UUID string, Postgres rejects it with an "invalid input syntax for type uuid" error.

This affects all devices (not just iPhone), but you likely noticed it on iPhone because that's where you tested the bulk upload flow.

## Fix
In `BulkUploadTab.tsx`, change the album insert to pass `null` instead of `user?.id` for `created_by`, since the Salesforce Contact ID is not a valid UUID. Alternatively, store the user identifier in a `text`-type column.

The simplest fix (no database migration needed):

### `src/components/media/BulkUploadTab.tsx`
Change line 243 from:
```
created_by: user?.id || null,
```
to:
```
created_by: null,
```

This ensures the insert never fails due to an invalid UUID. The album is still associated with the session user contextually; we just stop trying to write a non-UUID into a UUID column.

### Optional follow-up (not part of this fix)
If you want to track who created each album, a future step would be to either:
- Add a `created_by_contact_id` text column to `media_albums` for the Salesforce ID, or
- Change `created_by` from `uuid` to `text`

But for now, setting it to `null` unblocks uploads immediately.

