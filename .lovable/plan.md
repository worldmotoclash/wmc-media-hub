

# Add "Creator" Media Hub Access Role

## Overview
Add a new `Creator` role to the `mediaHubAccess` type. Creators can only access the **Media Library** and **Upload** functions -- all other Media Hub features (Generate, Scene Detection, Playlists, Social Kit, Characters, Model Marketplace, S3 Config, Content Diary) are hidden from them.

## Changes

### 1. `src/contexts/UserContext.tsx`
- Expand `mediaHubAccess` type: `'Admin' | 'Editor' | 'Viewer' | 'Creator'`
- Add `isCreator()` helper that returns `true` when role is `Creator`
- Update `isEditor()` to also include `Creator` (they can upload/edit their own content)

### 2. `src/services/loginService.ts`
- Add `'Creator'` to the allowed values check on line 483: `['Admin', 'Editor', 'Viewer', 'Creator']`
- Update the type cast on line 493

### 3. `src/components/media/ActionCards.tsx`
- Import `useUser` and filter the action cards based on role
- Creators only see: **Upload Media** and **Asset Library**
- All other cards (Generate, Scene Detection, Playlists, Social Kit, Characters) hidden for Creators

### 4. `src/pages/MediaHub.tsx`
- Gate the `RecentActivity` and `RecentUploads` sections -- Creators see a simplified hub

### 5. Route guards for Creator-restricted pages
- Pages like Generate, SceneDetection, PlaylistManager, SocialKit, CharacterLibrary, ModelMarketplace, DiaryDashboard: add a check that redirects Creators back to `/hub` with a toast
- Media Library (`/admin/media/library`) and Upload (`/admin/media/upload`) remain accessible

### 6. `src/components/media/UnifiedMediaLibrary.tsx`
- Hide S3 Config tab (already Admin-only, no change needed)
- Hide admin-only bulk actions for Creators (same as Viewer behavior)

No database or edge function changes needed -- the role value comes from the Salesforce `mediahubaccess` field.

