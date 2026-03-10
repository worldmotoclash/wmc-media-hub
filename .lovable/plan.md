

# Fix: Drawer Content Not Scrollable

## Problem

The `ScrollArea` in `MediaAssetDetailsDrawer.tsx` (line 126) uses `className="flex-1 p-4 max-h-[60vh]"`, but `flex-1` only works inside a flex container. The `DrawerContent` is not set up as a flex column, so the ScrollArea doesn't get a constrained height and can't scroll. The large thumbnail image consumes most of the visible space, pushing the editable fields off-screen.

## Fix

**File**: `src/components/media/MediaAssetDetailsDrawer.tsx`

Two changes:

1. **Line 112** — Make `DrawerContent` a flex column so `flex-1` works:
   ```
   max-h-[85vh]  →  max-h-[85vh] flex flex-col
   ```

2. **Line 126** — Replace the rigid `max-h-[60vh]` with `overflow-auto min-h-0` so the scroll area fills remaining space dynamically:
   ```
   flex-1 p-4 max-h-[60vh]  →  flex-1 p-4 min-h-0 overflow-y-auto
   ```

This ensures the header and footer stay fixed while the middle content area scrolls, regardless of screen size.

