## Problem

The asset detail drawer footer currently stacks 6 unrelated actions in a flat list:

```text
[ Sync to SFDC ]                   ← inline above the footer
─────────────────
[ Create Video with This Audio ]   ← contextual, full width
[x] Also suggest a descriptive title  ← orphan checkbox
[ Reanalyze with AI ]              ← AI action
[ Edit Details ] [ Play Video ]    ← row of two
[ Delete Asset ]                   ← destructive, full width
```

Issues:
- No visual hierarchy — every button looks equally important.
- Destructive `Delete Asset` is the same width and weight as everyday actions.
- The only way to dismiss the drawer is the small `×` in the top-right corner, which users miss.
- The "Also suggest a descriptive title" checkbox floats next to "Reanalyze" with no grouping affordance.
- Sync to SFDC sits in the body, disconnected from the action area.

## Redesign

Reorganize into **three tiers** with an explicit close affordance:

```text
┌─ Drawer footer ──────────────────────────────────────────────┐
│  PRIMARY ROW                                                 │
│  [ ✏ Edit Details ]   [ ▶ Play Video / Open ]                │ 50/50 split, both prominent
│                                                              │
│  CONTEXTUAL ROW (only shown if applicable)                   │
│  [ ✨ Reanalyze with AI ▾ ]   [ ☁ Sync to SFDC ]             │ secondary variant
│   └─ popover: "Also suggest a descriptive title" toggle      │ checkbox moves into popover
│                                                              │
│  AUDIO-ONLY ROW (only on audio assets)                       │
│  [ 🪄 Create Video with This Audio ]                         │ full width, secondary
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│  FOOTER UTILITY ROW                                          │
│  [ Close ]                                  [ ⋯ More ▾ ]     │ ghost left, overflow right
│                                              └─ Delete Asset │ destructive lives in overflow
└──────────────────────────────────────────────────────────────┘
```

### Tier rules
1. **Primary** (default variant, brand color) — the two actions a user is most likely to take: edit metadata or view the file.
2. **Contextual** (secondary variant) — AI / sync / convert actions. Only render when the asset type and user role qualify.
3. **Utility** (ghost + overflow menu) — Close is always visible. Destructive `Delete Asset` is moved into a `DropdownMenu` ("More") so it can't be hit accidentally and stops competing visually.

### Behavioral changes
- **Add explicit `Close` button** in the footer left. Keeps the corner `×` but adds a labeled escape hatch.
- **Move "Also suggest a descriptive title"** out of the footer into a small popover attached to the `Reanalyze with AI` button (split-button style), so the checkbox stops floating.
- **Move `Delete Asset`** into a "More" overflow menu (DropdownMenu) with a destructive-styled item. Single confirmation dialog stays unchanged.
- **Move `Sync to SFDC`** out of the body section into the contextual row so all actions live in one place. Keep the badge/status indicator in the body, just remove the button.
- When the drawer is in **edit mode**, the footer collapses to `[ Save Changes ] [ Cancel ]` exactly as today — no change.

### Visual polish
- Add `gap-3` between rows and a hairline `border-t` separator between the contextual block and the utility row to visually segment "things you do to the asset" from "drawer controls."
- Standardize all icons to 16px (`w-4 h-4`) — currently the Sync button uses 12px (`h-3 w-3`).

## Files to touch
- `src/components/media/MediaAssetDetailsDrawer.tsx` — restructure the `<DrawerFooter>` block (lines ~482–577) and remove the inline Sync button (lines ~430–476) from the body, relocating it into the footer's contextual row.

No service or data changes. No new dependencies — `DropdownMenu` and `Popover` already exist in `src/components/ui/`.

## Out of scope
- Changing what any button actually does.
- Refactoring the edit-mode footer.
- Touching the asset preview area or the SFDC sync status indicators.
