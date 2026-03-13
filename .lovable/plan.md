

# Protect Media Hub Pages Behind Authentication

## Problem
Five media pages have no auth guards and are accessible without logging in:
- Scene Detection (`/admin/media/scene-detection`)
- Social Kit (`/admin/media/social-kit`)
- Character Library (`/admin/media/characters`)
- User Guide (`/admin/media/user-guide`)
- Release Notes (`/admin/media/releases`)

The profile dropdown correctly hides links when logged out, but direct URL access is unprotected.

## Solution
Add the same auth guard pattern used by other media pages to each of these five files:

1. Import `useUser` and `useNavigate`
2. Add `useEffect` that redirects to `/login` with a toast when `!user`
3. Return `null` while redirecting

Each file gets the same ~10-line addition — no other changes needed.

## Files to Edit
| File | Change |
|------|--------|
| `src/pages/media/SceneDetection.tsx` | Add auth guard |
| `src/pages/media/SocialKit.tsx` | Add auth guard |
| `src/pages/media/CharacterLibrary.tsx` | Add auth guard |
| `src/pages/media/UserGuide.tsx` | Add auth guard |
| `src/pages/media/ReleaseNotes.tsx` | Add auth guard |

