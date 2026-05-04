## Problem

`/racer/guide` redirects to `/racer/login` whenever the visitor isn't signed in as a racer. The route is registered correctly, but the page's `useEffect` checks `sessionStorage.racerUser` and bounces unauthenticated visitors. That's why both the preview URL and `mediahub.worldmotoclash.com/racer/guide` end up on the login screen.

There's also a small React warning from `GuideTOC` (`data-lov-id` invalid prop on `React.Fragment`) — cosmetic only, but easy to fix.

## Changes

### 1. `src/pages/racer/RacerUserGuide.tsx` — remove the login redirect
The guide is documentation; it should be readable by anyone (prospective racers, staff sharing the link, etc.). Remove the `useEffect` that forces `navigate('/racer/login')` when there's no `racerUser` session. Keep the page rendering normally.

When viewed without a session, the page will render inside `RacerPortalLayout` (sidebar + nav). The "Sign Out" button still works (just clears nothing), and the nav links go to the gated pages — which already redirect to login if needed. That's the desired behavior.

### 2. `src/components/docs/GuideTOC.tsx` — silence Fragment warning
React warns because `data-lov-id` (added by the dev tagger) is being applied to `React.Fragment`. Replace the two `<React.Fragment key=...>` wrappers with a real element (e.g., `<div key=... className="contents">`) so arbitrary props are valid. No visual change.

### 3. Reminder about publishing
Frontend changes don't go live until you click **Publish → Update** in the editor. After approving this plan and the changes deploy, refresh `mediahub.worldmotoclash.com/racer/guide` (hard reload or incognito to bypass cache).

## Out of scope
- No changes to routing in `App.tsx` (already correct).
- Other racer pages (`/racer/dashboard`, `/racer/profile`, etc.) keep their login gates — only the guide becomes public.