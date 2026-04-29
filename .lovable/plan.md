## Add "Restricted" Approval Status

Today the app supports three approval statuses synced to Salesforce (`ri1__Content_Approved__c`): **Pending**, **Approved**, **Rejected**. We'll add **Restricted** as a fourth status and surface controls to set it at upload time and after upload.

### 1. Status model: add "Restricted" everywhere

- **Drawer status select** (`MediaAssetDetailsDrawer.tsx` ~line 348): add `<SelectItem value="Restricted">Restricted</SelectItem>`.
- **Sidebar status filter** (`UnifiedMediaLibrary.tsx` ~line 1243): include `'restricted'` in the rendered filter list.
- **Stats** (`mediaSourceStatsService.ts`): add `restricted: number` to `StatusStats`, query `count(*) where status='restricted'`, and include it in returned `statusCounts`.
- **Status badges / color mapping** (`UnifiedMediaLibrary.tsx` ~line 664 and any `getStatusVariant`-style helpers): add a visually distinct badge for Restricted (amber/orange or a lock icon) so it's obvious in grid + list views.
- **SFDC sync** (`sync-asset-to-salesforce/index.ts`): no schema change needed — the function already forwards `payload.status` verbatim into `string_ri1__Content_Approved__c`. Confirm Salesforce picklist accepts "Restricted" (caller already controls value).

### 2. Set status during upload

Two upload entry points need a status selector that defaults to **Pending**:

- **Single upload** — `MasterImageUploadDialog.tsx`: add an "Approval Status" `<Select>` (Pending / Approved / Rejected / Restricted) above the submit button. Pass the chosen value through to the upload service so it's written into `media_assets.status` at insert time and to SFDC on the initial sync.
- **Bulk upload** — `BulkUploadTab.tsx`: add a single "Apply status to all" selector at the top of the queue (same four options, default Pending). Each queued upload uses that value when finalizing.

Backend wiring:
- `upload-master-to-s3/index.ts` currently hardcodes `status: "ready"` on insert (line 301). Add an optional `approvalStatus` field to the request body; if provided, persist it to `media_assets.status` and also append `string_ri1__Content_Approved__c` to the SFDC form payload (today the function relies on the governance default of "Pending" for sync-created records — we override only when caller passes an explicit value).
- Update `racerMediaService.ts` and `unifiedMediaService.ts` upload helpers to accept and forward `approvalStatus`.

### 3. Multi-select bulk status change in the library

In `UnifiedMediaLibrary.tsx`, the sticky selection toolbar (lines 1314–1410) currently exposes Auto-Tag, AI Rename, Sync to SFDC, and Delete. Add a **"Set Status"** dropdown button next to "Sync to SFDC":

```
[ Set Status ▾ ]   →  Pending / Approved / Rejected / Restricted
```

Behavior on selection:
1. Optimistically update each selected asset's local `status`.
2. Call `supabase.functions.invoke('sync-asset-to-salesforce', { body: { assetIds: [...selected], status: chosen } })` — this already supports an array of asset IDs and pushes the status to SFDC for each.
3. Show a progress toast (`Updating X/Y…`) and reload the asset list + filter counts on completion.
4. Skip (and report) any selected asset that has no `salesforce_id` yet, mirroring the existing single-asset drawer behavior.

### 4. Drawer (single asset) — already covered

The drawer's existing Approval Status select (lines 321–355) just needs the new "Restricted" option added; the save handler already POSTs whatever value is chosen.

### Files to change

```text
src/components/media/MediaAssetDetailsDrawer.tsx     add Restricted option
src/components/media/UnifiedMediaLibrary.tsx         filter + bulk Set Status + badge
src/components/media/MasterImageUploadDialog.tsx     status select on single upload
src/components/media/BulkUploadTab.tsx               status select on bulk upload
src/services/unifiedMediaService.ts                  forward approvalStatus on upload + bulk update helper
src/services/mediaSourceStatsService.ts              add restricted to StatusStats + counts
supabase/functions/upload-master-to-s3/index.ts      accept approvalStatus, persist + send to SFDC
```

### Notes / assumptions

- "Restricted" is treated as a normal approval-status value (not a separate flag column), so it's stored in `media_assets.status` lower-cased (`'restricted'`) locally and "Restricted" in SFDC, matching the existing Pending/Approved/Rejected pattern.
- No DB migration is needed — `media_assets.status` is a free-form `text` column.
- Confirm the Salesforce `ri1__Content_Approved__c` picklist has "Restricted" as a valid value before going live; if not, an admin must add it on the SFDC side.
