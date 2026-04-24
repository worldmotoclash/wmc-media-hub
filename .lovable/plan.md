# Auto-publish social performance reports on ingest

## Problem
The 2026-04-24 test ingest succeeded and the row exists in `social_performance_reports`, but `status='draft'`. The public route `/reports/:slug` and the archive query both rely on the RLS policy `Published reports are viewable by everyone` (`status = 'published'`), so draft rows are invisible to anonymous visitors — making the returned `page_url` 404 in practice.

## Changes

### 1. Edge function: `supabase/functions/social-performance-ingest/index.ts`
- On **insert** (new report), set `status: 'published'` explicitly so new ingests are immediately public.
- On **update** (re-ingest of the same day), continue to **omit** `status` from the update payload — preserves any manual flips (e.g. an admin unpublishing a bad report stays unpublished).

### 2. One-off data fix
- Update the existing row `social-performance-2026-04-24` to `status='published'` so the test URL works right now.

### 3. Docs
- Update the empty-state copy on `src/pages/reports/ReportsArchive.tsx` (currently tells users to flip drafts to published) to reflect the new auto-publish behavior.

## Out of scope
- No admin UI, no schema changes, no RLS changes. The existing "published-only" RLS policy stays as the safety net for any row manually moved back to draft.

## Verification
- Visit `https://mediahub.worldmotoclash.com/reports/social-performance-report-2026-04-24` — should render.
- Re-post a test payload — confirm new row lands as `published` and the returned URL loads immediately.
