## Add "Update Rider" link to each rider row on `/racer/reports/:slug`

Frontend-only change in `src/pages/racer/reports/RacerContactReportDetail.tsx`. All rider sections (Created Today, New vs Previous, Recently Updated, Regressions, Missing Critical, Newest Racer Contacts) already render through one shared `ContactsTable` + `pickDisplay` helper, so a single touchpoint covers every section.

### Changes

1. **`pickDisplay(c)`** — additionally surface `update_url`, `update_link`, `id_plain`, and `racer_id` from the row payload (back-compat with existing `id` / `contact_id` / `salesforce_id` / `sfdc_id`). Keep the visible `id` value as the plain Salesforce Contact ID (prefer `id_plain` then `id`).

2. **New helper `buildUpdateUrl(row)`** — priority:
   - `row.update_url`
   - else `row.update_link`
   - else `https://realintelligence.com/customers/expos/00D5e000000HEcP/index-Racer-Update-mobile.php?eventId=00D5e000000HEcP&orgId=00D5e000000HEcP&ID=<id>` where `<id>` = `row.id_plain || row.id || row.racer_id`.
   - Returns `null` when no ID is available so the cell shows `—` instead of a broken link.

3. **`ContactsTable`** — add an `Action` column as the last header/cell. Each row renders an `<a target="_blank" rel="noopener noreferrer">Update Rider</a>` styled as a compact button (`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium hover:bg-accent`). Mobile-friendly (small height, fits in existing horizontal scroll). Existing Name / ID / Email / Mobile / Changed columns stay exactly as-is — the plain ID column is untouched.

### Out of scope
- No ingest / payload / DB changes.
- No edits to the archive page, hooks, routing, or styling tokens.
- No changes to KeyCountTable / Status Snapshot / Field Completion (those are not per-rider sections).

### Post-change
- Verify on `/racer/reports/racer-contact-daily-log-2026-05-11` that each rider row exposes a working "Update Rider" link opening the RI mobile update page in a new tab, and confirm the user must click Publish in Lovable for the change to reach `mediahub.worldmotoclash.com`.
