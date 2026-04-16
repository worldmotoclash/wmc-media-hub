

# Enforce Viewer Role Restrictions

## Problem
A user with `mediaHubAccess: 'Viewer'` sees the full Media Hub — all action cards (Upload, Generate AI, Scene Detection, Playlists, Social Kit, Content Diary) and all dropdown menu links (Upload Content, Scene Detection). Viewers should only be able to **browse and view** the library — no uploading, generating, or editing.

## Current State
- `ActionCards.tsx` only filters for Creator role (`isCreator()`) — Viewers see everything
- `profile-dropdown.tsx` shows Upload Content and Scene Detection links to everyone
- `useCreatorGuard` only blocks Creators, not Viewers
- No `isViewer()` helper exists in `UserContext`
- Route-level guards only check for login, not role

## Changes

### 1. `src/contexts/UserContext.tsx`
Add `isViewer()` helper method that returns `true` when `mediaHubAccess === 'Viewer'`.

### 2. `src/components/media/ActionCards.tsx`
Add a `viewerVisible` flag to each action card. Viewers should only see:
- **Asset Library** (browse only)
- **What's New**

Filter the actions list when user is a Viewer, similar to how Creator filtering already works.

### 3. `src/components/ui/profile-dropdown.tsx`
Conditionally hide "Upload Content" and "Scene Detection" links for Viewers. Only show "Media Hub" and "Media Library" links.

### 4. `src/hooks/useCreatorGuard.tsx` → Rename/expand to `useRoleGuard.tsx`
Expand the guard to also block Viewers from restricted pages (Upload, Generate, Scene Detection, Social Kit, Playlists, Content Diary). Keep backward compatibility by exporting both `useCreatorGuard` and a new `useViewerGuard`, or unify into a single `useAccessGuard` that blocks both Creators and Viewers from advanced routes.

### 5. Route-guarded pages
Add the viewer guard to the same pages that already use `useCreatorGuard`:
- `MediaUpload.tsx`
- `Generate.tsx`
- `SceneDetection.tsx`
- `SocialKit.tsx`
- `PlaylistManager.tsx`
- `DiaryDashboard.tsx`

## Viewer Permissions Summary

| Feature | Viewer Access |
|---------|--------------|
| Media Hub home | Yes |
| Asset Library (browse) | Yes |
| What's New | Yes |
| Upload Media | No |
| Generate AI Image/Video | No |
| Scene Detection | No |
| Manage Playlists | No |
| Social Media Image Gen | No |
| Content Diary | No |
| Edit asset metadata | No |
| Delete assets | No |

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/UserContext.tsx` | Add `isViewer()` helper |
| `src/components/media/ActionCards.tsx` | Add `viewerVisible` flag, filter for Viewers |
| `src/components/ui/profile-dropdown.tsx` | Hide upload/scene links for Viewers |
| `src/hooks/useCreatorGuard.tsx` | Expand to also block Viewers from restricted routes |
| `src/pages/media/MediaUpload.tsx` | Add viewer guard |
| `src/pages/media/Generate.tsx` | Add viewer guard |
| `src/pages/media/SceneDetection.tsx` | Add viewer guard |
| `src/pages/media/SocialKit.tsx` | Add viewer guard |
| `src/pages/media/PlaylistManager.tsx` | Add viewer guard |
| `src/pages/media/DiaryDashboard.tsx` | Add viewer guard |

