

# Map Status to Salesforce `ri1__Content_Approved__c` — Remove Local-Only Status

## Problem
The `status` field on `media_assets` is stored locally and never synced from/to Salesforce. The SFDC record shows "Pending" in `ri1__Content_Approved__c` but the local UI shows "Ready" — they are completely disconnected. Status should be sourced from Salesforce, not a local column.

## Approach

Since the XML feed from `wmc-content-master.py` contains `<ri1__Content_Approved__c>` for each content block, we can read it during sync and store it locally as a **cache**. When the user changes status, we push the update to SFDC and update the local cache.

## Changes

### 1. `supabase/functions/sync-asset-to-salesforce/index.ts` — Read approval status from XML on match

When `findSalesforceIdByUrl` finds a matching SFDC record, also extract `<ri1__Content_Approved__c>` from that content block and return it alongside the ID (change return type to `{ id, approvalStatus }`). After a successful match or create, update the local `media_assets.status` with the SFDC approval value (e.g. "Pending", "Approved", "Rejected").

### 2. `supabase/functions/sync-asset-to-salesforce/index.ts` — Push status changes to SFDC

Add `ri1__Content_Approved__c` to the `updateSalesforceRecord` function so when the UI triggers a status change, it flows through to Salesforce.

### 3. `src/components/media/MediaAssetDetailsDrawer.tsx` — Update status via SFDC sync

When the user changes status in the dropdown:
- If the asset has a `salesforce_id`: call `sync-asset-to-salesforce` with the new status (which pushes to SFDC and updates local cache)
- If no `salesforce_id`: show the status as read-only "Not synced" — no local-only status edits
- Map dropdown values to SFDC picklist values: "Pending", "Approved", "Rejected"

### 4. `supabase/functions/scan-s3-buckets/index.ts` — Pull approval status during scan

After the scan creates/finds an asset and auto-syncs to SFDC, read back the `ri1__Content_Approved__c` value from the XML feed and store it in the local `status` field. For new assets not yet in SFDC, set status to `'pending'` (matching the governance rule).

### 5. `src/components/media/UnifiedMediaLibrary.tsx` — Normalize status display

Update `getStatusColor` to handle SFDC picklist casing ("Pending", "Approved", "Rejected") in addition to lowercase variants. The filter checkboxes should use these same values.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/sync-asset-to-salesforce/index.ts` | Return approval status from XML match; add `ri1__Content_Approved__c` to update calls; accept status param |
| `supabase/functions/scan-s3-buckets/index.ts` | Pull approval status from SFDC XML during sync step |
| `src/components/media/MediaAssetDetailsDrawer.tsx` | Status change calls SFDC sync; read-only if no `salesforce_id` |
| `src/components/media/UnifiedMediaLibrary.tsx` | Handle SFDC-cased status values in display and filters |

