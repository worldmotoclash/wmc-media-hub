## Restrict `/racer/reports` to Admin / Editor / Creator

Gate the racer reports archive and detail pages behind the existing `mediaHubAccess` role check. No new navigation links.

### Access rules

- **Allowed**: logged-in users where `user.mediaHubAccess` is `Admin`, `Editor`, or `Creator` (matches existing `isEditor()` helper in `UserContext`).
- **Unauthenticated** → redirect to `/login`.
- **Logged in but `Viewer`** → redirect to `/admin/media` with a toast ("This feature is not available for your access level"), mirroring the existing `useCreatorGuard` pattern.

### Implementation

1. **New hook `src/hooks/useRacerReportsGuard.tsx`**
   - Reads `useUser()`.
   - If `!user` → `navigate('/login')`.
   - Else if `isViewer()` (or not in Admin/Editor/Creator) → toast + `navigate('/admin/media')`.
   - Returns `blocked: boolean` so pages can render `null` while redirect is in flight.
   - Modeled directly on `src/hooks/useCreatorGuard.tsx`.

2. **`src/pages/racer/reports/RacerContactReportsArchive.tsx`**
   - Call `const blocked = useRacerReportsGuard();` at the top.
   - `if (blocked) return null;` before rendering dashboard.

3. **`src/pages/racer/reports/RacerContactReportDetail.tsx`**
   - Same guard usage as above.

### Out of scope

- No changes to navigation (`Navbar`, `ProfileDropdown`, `RacerPortalLayout`).
- No changes to routing in `App.tsx`.
- No DB / RLS changes (RLS already only exposes `published` reports; this is a UI-level access gate).
- No changes to the ingest function.
