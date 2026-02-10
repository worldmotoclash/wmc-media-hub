

# Hide S3 Configuration and MediaSourceDashboard for Non-Admin Users

## Summary
Restrict the S3 Configuration tab and the Sync Health / MediaSourceDashboard panel to only be visible when the logged-in user has `mediaHubAccess === 'Admin'`. Editors and Viewers will not see these sections.

## Changes

### File: `src/components/media/UnifiedMediaLibrary.tsx`

Two changes using the existing `user` variable (already available via `useUser()`):

1. **MediaSourceDashboard** (around line 534): Wrap in an admin check so it only renders for Admins.

2. **S3 Configuration tab trigger** (around line 550): Conditionally render the "S3 Configuration" tab trigger only for Admins.

3. **S3 Configuration tab content** (around line 1750): Conditionally render the tab content only for Admins.

### Technical Detail
All three locations will use the pattern:
```tsx
{user?.mediaHubAccess === 'Admin' && (
  <Component />
)}
```

No new files, dependencies, or backend changes required.
