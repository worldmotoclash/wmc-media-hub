# Racer Portal User Guide

Create a dedicated user guide for racers, mirroring the structure and styling of the existing Media Hub `UserGuide.tsx` but tailored to the racer experience (login → dashboard → application → motorcycle → qualification → profile).

## What to build

### 1. New page: `src/pages/racer/RacerUserGuide.tsx`
Reuse the existing docs primitives:
- `GuideTOC` from `src/components/docs/GuideTOC.tsx`
- `GuideSection`, `GuideSubSection`, `GuideStep`, `GuideTip`, `GuideTable`, `RoleCategoryHeader` from `src/components/docs/GuideSection.tsx`

Wrap content in `RacerPortalLayout` so it inherits the racer sidebar/topbar and dark theme. Auth-guard against `sessionStorage.racerUser` (same pattern as other racer pages); redirect to `/racer/login` if missing.

Include the same in-page search + highlight logic, hero section, sticky header, and Print/PDF button as the Media Hub guide (copy the `highlightMatches` helper and search effects).

### 2. TOC structure (role categories adapted to racer journey)

```text
Getting Started        (everyone)
  - Welcome & Overview
  - Logging In
  - Navigating the Portal

Your Dashboard         (viewer)
  - Application Status
  - Qualification Timeline
  - Quick Actions

Application Wizard     (creator)
  - 6-Step Application Walkthrough
  - Personal Information
  - Experience Level
  - Social Media Handles
  - Saving Progress (auto-syncs to Salesforce)

Motorcycle Details     (creator)
  - Adding Your Bike
  - Required Photos & Documents
  - Album Organization (licenses, bikes, auditions)

Qualification          (editor)
  - 5-Step Qualification Sequence
  - Audition Submissions & Tagging
  - Entry Fee / PayPal Step
  - Tracking Reviewer Feedback

Your Profile           (admin tier visual, but for racer)
  - Editing Personal Info
  - Updating Social Handles
  - Sign Out & Session
```

The five colored role tiers (everyone/viewer/creator/editor/admin) from `GuideSection` will be repurposed visually as journey stages so the existing color system still works without new components.

### 3. Routing
Add the route in `src/components/racer/HostnameRouter.tsx`:
```tsx
<Route path="/racer/guide" element={<RacerUserGuide />} />
```

### 4. Navigation entry
Add a "Guide" item (icon: `BookOpen`) to the `navItems` array in `src/components/racer/RacerPortalLayout.tsx` so racers can reach it from the sidebar/top bar.

### 5. Content sourcing
Pull accurate behavior from existing memory + code:
- Login/session behavior (`RacerLogin.tsx`, sessionStorage `racerUser`)
- 6-step application wizard + SFDC sync (`RacerApplication.tsx`)
- Motorcycle albums and uploads (`RacerMotorcycle.tsx`, `RacerFileUpload.tsx`)
- 5-step qualification timeline (`QualificationTimeline.tsx`, `RacerQualification.tsx`)
- Profile field sync (`RacerProfile.tsx`)
- Social handle prefix rules (`SocialHandleInput.tsx`)
- Entry fee / PayPal manual confirmation step

Each section will include numbered `GuideStep`s, screenshots-free text descriptions, `GuideTip`s for key gotchas (e.g. "Your social handles are stored without the @ prefix"), and `GuideTable`s where useful (e.g. file types accepted per album).

## Files

- **Create:** `src/pages/racer/RacerUserGuide.tsx`
- **Edit:** `src/components/racer/HostnameRouter.tsx` (add route)
- **Edit:** `src/components/racer/RacerPortalLayout.tsx` (add nav item)

No DB, edge function, or backend changes required — this is a static documentation page.
