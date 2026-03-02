
Root cause of what you’re still seeing:

1) The exact bug we fixed is no longer creating new duplicates.
- I checked for `local_upload` + `s3_bucket` rows sharing the same `s3_key`: `0` remaining.
- I checked duplicate keys created recently (after 2026-03-01): none.

2) You still have a large backlog of older duplicate rows from earlier scans.
- `media_assets` currently has many historical duplicate keys, mostly `s3_bucket` records (thousands), with repeated inserts around 2026-02-04.
- These are legacy duplicates that were not targeted by the previous cleanup (which only removed `local_upload` vs `s3_bucket` collisions).

3) In the screenshot, some “duplicates” are same title, different files.
- Example: `"New poster mountains no snow"` appears as multiple `local_upload` records with different `s3_key` values, so those are separate uploads, not scanner collisions.

Implementation plan:

1. Run a second cleanup migration for historical S3-only duplicates
- Keep one canonical row per key (prefer newest, or prefer non-`s3_bucket` when mixed).
- Delete extra rows where the dedupe key matches:
  - `coalesce(nullif(s3_key,''), nullif(source_id,''), nullif(file_url,''))`

2. Add DB-level guardrails to prevent re-introduction
- Add a partial unique index for scanned rows (e.g., `source='s3_bucket'`) on normalized key so same scanned object cannot be inserted multiple times.
- Keep it partial so legitimate multi-source records still work.

3. Make scanner writes idempotent at write-time
- Change scanner insert path to `upsert` using the same conflict key used by the unique index.
- This makes repeated scans safe even under retries.

4. Optional UX clarity improvement
- Show `s3_key` (or short key hash) in details so “same title but different file” is obvious.
- Optional “Group by title” toggle to reduce visual confusion without deleting valid rows.

Technical details:
- Current data indicates two separate categories:
  - Legacy true duplicates (same file key, multiple rows): needs cleanup.
  - Intentional/valid repeats (same title, different key): keep unless you want title-based dedupe rules.
- I can prepare the exact migration and scanner update in the next step.
