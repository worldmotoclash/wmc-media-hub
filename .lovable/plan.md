

# Audit Salesforce Records for Missing Wasabi Files

## What we'll build

A new edge function `audit-sfdc-file-health` that fetches all Salesforce content records from the Real Intelligence API, probes each URL against Wasabi with a HEAD request, and returns a report of broken records (NoSuchKey / 404).

## How it works

1. Fetch all content from `wmc-content-master.py` API (same XML feed used by sync functions)
2. Extract every `<url>` from each `<content>` block along with its `<id>` and `<name>`
3. For each URL that points to Wasabi/CDN (`media.worldmotoclash.com`), send a HEAD request
4. Collect records where the file doesn't exist (HTTP 404 or NoSuchKey XML response)
5. Return a JSON report: `{ total, healthy, broken, brokenRecords: [{ salesforceId, name, url, error }] }`

## Changes

**New file: `supabase/functions/audit-sfdc-file-health/index.ts`**
- Fetch the XML feed from Real Intelligence API
- Parse all content blocks for id, name, url
- Filter to Wasabi/CDN URLs only
- HEAD-check each URL (with concurrency limit of 5 to avoid throttling)
- Return structured JSON report of all broken records
- Uses existing `WASABI_ACCESS_KEY_ID` and `WASABI_SECRET_ACCESS_KEY` secrets for authenticated HEAD requests via aws4fetch

**No UI changes** — this is a diagnostic function you invoke directly. Results will be returned as JSON that we can review together.

## Technical details

- Reuses the same API endpoint and org ID as `sync-asset-to-salesforce`
- HEAD requests are signed with Wasabi credentials (same as scan-s3-buckets) for reliable access
- Processes in batches of 5 concurrent requests to stay within rate limits
- Estimated runtime: depends on total SFDC record count, ~1-2 seconds per batch of 5

