

# Consolidate Media Asset Actions

## Problem

Three icon buttons (Preview, Info, Open in Browser) are unclear. Users cannot tell which one allows editing. The "Info" drawer duplicates preview functionality with its own "Preview Video" button inside.

## Solution

Merge Preview and Info into a single **unified detail view**. Clicking any asset (or one primary button) opens the Details Drawer, which already contains a media preview area at the top plus editing controls. Remove the separate Preview button and the standalone ExternalLink button from the card actions.

## Changes

### 1. `UnifiedMediaLibrary.tsx` — Simplify action buttons

**Grid view** (around line 1393-1436): Replace the three buttons with:
- **One primary button**: "View Details" (Eye icon) → opens the Details Drawer
- Remove standalone Preview button and ExternalLink button from the card

**List view** (around line 1688-1728): Same consolidation — single "View Details" icon button per row.

### 2. `MediaAssetDetailsDrawer.tsx` — Enhance as the single entry point

- Keep the existing thumbnail/preview area at the top (already shows video play overlay)
- Keep the "Edit Details" / "Save Changes" toggle in the footer
- Keep "Open in Browser" as a secondary action in the footer (it's useful, just shouldn't be a top-level card action)
- Add a prominent inline media player: clicking the preview area opens the full preview modal (already wired via `onPreview`)
- Make the "Edit Details" button more visually prominent (e.g., primary variant instead of outline) so editing is clearly discoverable

### 3. Card click-to-open

Make the entire card thumbnail area clickable to open the Details Drawer, matching common UX patterns. The single remaining button serves as an explicit affordance.

## Files to edit

| File | Change |
|------|--------|
| `src/components/media/UnifiedMediaLibrary.tsx` | Remove Preview + ExternalLink buttons; single "View Details" button; make thumbnail clickable to open drawer |
| `src/components/media/MediaAssetDetailsDrawer.tsx` | Make "Edit Details" button more prominent; ensure preview click opens full modal |

