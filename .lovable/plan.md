

# Show Recent Activity for all roles & remove redundant Recent Uploads

## Problem
1. `RecentActivity` and `RecentUploads` are hidden for Creator role (line 35-40 in `MediaHub.tsx` wraps both in `!isCreator()`)
2. `RecentUploads` is a video-only thumbnail grid that overlaps with what `RecentActivity` already shows (uploads + generations in a unified list)

## Changes

**`src/pages/MediaHub.tsx`**
- Show `<RecentActivity />` for all roles (move it outside the `!isCreator()` block)
- Remove `<RecentUploads />` entirely since it's redundant with RecentActivity
- Remove the `RecentUploads` import

The result: lines 29-43 become:
```tsx
return (
  <div className="min-h-screen bg-background">
    <Navbar />
    <MediaHubHero />
    <SearchBar />
    <ActionCards />
    <RecentActivity />
    <Footer />
  </div>
);
```

This is a small, focused change — just removing the conditional wrapper and the redundant component.

