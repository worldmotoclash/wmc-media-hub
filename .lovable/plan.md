

# Change Media Library Search to Manual Trigger

## Changes

### File: `src/components/media/UnifiedMediaLibrary.tsx`

1. **Add a `pendingSearch` state** to hold what the user types, separate from the `searchQuery` that triggers the actual search.

2. **Remove auto-search on typing**: Remove `searchQuery` from the `useEffect` dependency array (line 280) so typing alone does not trigger a search. Remove the min-3-char guard and debounce since search is now manual.

3. **Add a `handleSearch` function** that sets `searchQuery = pendingSearch` and resets to page 1. Triggered by pressing Enter or clicking a Search button.

4. **Update the Input** (line 606-618): bind `value` and `onChange` to `pendingSearch` instead of `searchQuery`. Add `onKeyDown` handler for Enter key.

5. **Add a Search button** next to the input (after line 619) that calls `handleSearch`.

6. **Initial load**: keep `searchQuery` starting from URL param so the initial asset load still works. The `useEffect` at line 268 continues to fire on `filters`, `sortOption`, `currentPage`, etc. — just not on every keystroke.

