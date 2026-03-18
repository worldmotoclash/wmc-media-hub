

# Add Creator Role to User Guide

## Context
The Creator role is a restricted media-focused role that can Upload Media, browse the Asset Library, view Recent Activity, and see What's New — but cannot access AI Generation, Scene Detection, Social Kit, Playlists, or Content Diary. The User Guide currently documents four roles (Everyone, Viewer, Editor, Admin) but omits Creator entirely.

## Changes

**`src/pages/media/UserGuide.tsx`**

1. **Add Creator to TOC items** (after Viewer, before Editor around line 127):
   - New category: `{ id: 'for-creators', title: 'For Creators', isCategory: true, role: 'creator' }`
   - Sub-items: `upload-media-creator` (Upload Media), `asset-library-creator` (Asset Library), `whats-new-creator` (What's New & Releases)

2. **Add Creator to Hero quick links** (around line 340): Insert a 5th role card for Creator between Viewer and Editor with a Camera or Upload icon and description "Upload & manage media content". Adjust grid to `md:grid-cols-5`.

3. **Update Permissions Matrix** (line 497): Add a "Creator" column to the table headers and add the appropriate checkmarks — Creator gets checkmarks for: Browse Asset Library, Search & Filter, View/Preview, Download, Upload Content, Edit Tags & Metadata. Dashes for everything else.

4. **Add Creator section content** (between Viewer and Editor sections, around line 526): A `RoleCategoryHeader` and `GuideSection` blocks covering:
   - **Upload Media**: How Creators upload videos/images/audio to the library
   - **Asset Library**: Browsing and managing their uploaded content
   - **What's New**: Accessing release notes and updates

5. **Update role stats** in hero: Change "4 Role Sections" to "5 Role Sections".

**`src/components/docs/GuideSection.tsx`** and **`src/components/docs/GuideTOC.tsx`**

6. **Add 'creator' to the `RoleType`** union type in both files, with styling:
   - Color scheme: `bg-cyan-500/10`, `text-cyan-600 dark:text-cyan-400`, `border-cyan-500/30`
   - Label: "Creator"
   - Description: "Upload & manage media"

These changes ensure Creator-role users see documentation relevant to their access level and understand exactly what features are available to them.

