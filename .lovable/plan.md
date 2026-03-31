

# Fix: Assets Already in Salesforce Not Detected as Synced

## Root Cause

The sync function (`sync-asset-to-salesforce`) matches assets to Salesforce records using **exact URL matching only** (`block.includes(cdnUrl)`). This fails when:

- The local `file_url` is a Wasabi direct URL (`https://s3.us-east-1.wasabisys.com/...`)
- The Salesforce record stores a CDN URL (`https://media.worldmotoclash.com/...`)
- The asset was uploaded locally and the SFDC record was created independently

Since the URLs don't match, the function thinks no SFDC record exists, creates a **duplicate** record, and the original match is never established.

## Fix — Multi-Strategy Matching in `sync-asset-to-salesforce`

**File: `supabase/functions/sync-asset-to-salesforce/index.ts`**

Enhance `findSalesforceIdByUrl` with three fallback strategies:

1. **Exact URL match** (existing, keep as-is)
2. **Filename match** — extract the filename from both the asset's `file_url` and each SFDC record's URL, compare case-insensitively. For example, `WMC_SIZZLE_MEDIA_PITCH_VER_8.mp4` would match regardless of domain/path prefix.
3. **Title match** — accept the asset title as a parameter and compare against the SFDC record's `<name>` field (case-insensitive, trimmed). This catches cases like "WMC SIZZLE MEDIA PITCH VER 8" matching the SFDC Name field exactly.

The function signature changes to:
```
findSalesforceIdByUrl(cdnUrl, xmlCache, title?)
```

Each strategy runs in order; first match wins. This prevents duplicate SFDC record creation for assets that already exist there.

**Additional change**: At line 364 where the function is called, pass `asset.title` as the third argument so title matching is used.

## Summary

| File | Change |
|------|--------|
| `supabase/functions/sync-asset-to-salesforce/index.ts` | Add filename and title fallback matching to `findSalesforceIdByUrl`; pass title at call site |

One file, ~30 lines added. No new dependencies.

