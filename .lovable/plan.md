Hide the `ID` column in the rider tables on `/racer/reports/:slug`.

### Change
In `src/pages/racer/reports/RacerContactReportDetail.tsx`, inside `ContactsTable`:
- Remove the `<TableHead>ID</TableHead>` header cell.
- Remove the corresponding `<TableCell>` that renders `d.id`.

The ID is still kept in `pickDisplay` so it continues to be used to build the `Update Rider` URL — only the visible column is removed. Name / Email / Mobile / Changed / Action columns remain unchanged.

### Out of scope
- No payload, ingest, or routing changes.
- No changes to other tables (KeyCountTable, Status Snapshot, Field Completion).