

# Fix: Redeploy sync-asset-to-salesforce Edge Function

## Problem

The bulk upload correctly sends all 5 asset IDs to `sync-asset-to-salesforce`, but the edge function is returning **HTTP 404** — meaning it's not currently deployed. The edge function logs confirm the request was received but got a 404 response (execution time: 436ms, which is too fast for any real processing).

This is why the assets show "No SFDC" — the sync call silently fails.

## Fix

**One step**: Redeploy the `sync-asset-to-salesforce` edge function. No code changes needed — the function code is correct and already handles batch `assetIds`. It just needs to be redeployed.

After deployment, the existing 5 assets can be re-synced by either:
1. Clicking "Sync to SFDC" on each asset in the details drawer
2. Or triggering a bulk re-sync (we could add a "Retry SFDC Sync" button for assets with "No SFDC" status)

### Optional Enhancement: Add "Retry All" Button

Add a button on the media library to re-trigger SFDC sync for all assets missing a `salesforce_id`. This would invoke the same edge function with all unsynced asset IDs in one call.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/sync-asset-to-salesforce/index.ts` | Redeploy (no code changes) |

