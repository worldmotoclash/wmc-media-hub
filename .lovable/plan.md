

# Fix Editing: RLS Blocking All Writes

## Root Cause

The `media_assets`, `media_asset_tags`, and `media_tags` tables have RLS policies requiring `auth.uid() IS NOT NULL` for INSERT, UPDATE, and DELETE. This project uses **Salesforce-based authentication** (not Supabase Auth), so `auth.uid()` is always `null`. Every write operation silently fails.

This affects:
- Saving title/description edits
- Adding/removing tags
- Creating local records for Salesforce-only assets
- Updating podcast status

## Three-Source Architecture (Confirmed)

| Source | How it works | Editable? |
|--------|-------------|-----------|
| **Salesforce API** | Live fetch via Real Intelligence; synthetic `sf_*` IDs | Not directly — no local DB row |
| **Wasabi S3 scan** | `scan-s3-buckets` edge function upserts into `media_assets` | Should be, but RLS blocks writes |
| **Supabase `media_assets`** | Local DB for uploads, generations, S3-synced | Should be, but RLS blocks writes |

Deduplication merges sources 1+2+3, preferring local DB records. When dedup misses (no `salesforce_id` match or URL mismatch), Salesforce assets appear as `sf_*` entries that can't be edited.

## Fix Plan

### 1. Update RLS policies to allow anonymous writes (3 tables)

Per the existing memory note on RLS, this project requires open policies because `auth.uid()` is always null. The `media_albums` table already has correct open policies (`WITH CHECK (true)` / `USING (true)`). Apply the same pattern to:

- **`media_assets`** — change INSERT, UPDATE, DELETE policies from `auth.uid() IS NOT NULL` to `true`
- **`media_asset_tags`** — change the ALL policy from `auth.uid() IS NOT NULL` to `true`  
- **`media_tags`** — change the ALL policy from `auth.uid() IS NOT NULL` to `true`

This is a single SQL migration with DROP + CREATE for each policy.

### 2. No code changes needed

The `useEditableAssetFields` hook, `createLocalRecord`, `handleSave`, and `handlePodcastToggle` functions are all correctly written — they just fail silently because the database rejects the writes. Once RLS is fixed, editing will work.

## Files

| Target | Change |
|--------|--------|
| SQL Migration | Update 6 RLS policies across 3 tables to allow anonymous access |

