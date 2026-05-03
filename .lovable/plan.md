The `/racer/guide` route was added to `HostnameRouter.tsx`, but that router isn't actually mounted — racer routes are registered directly in `src/App.tsx`. Fix by registering the new route there too.

## Change
- **Edit `src/App.tsx`**:
  - Import `RacerUserGuide` from `./pages/racer/RacerUserGuide`
  - Add `<Route path="/racer/guide" element={<RacerUserGuide />} />` next to the other `/racer/*` routes