

# Racer Portal (racers.worldmotoclash.com)

A new racer-facing portal within the existing Media Hub project, served on a separate subdomain with hostname-based routing.

## Overview

Racers visit `racers.worldmotoclash.com` and get a dark, racing-themed experience with email-only login, a 5-step application wizard, file uploads to Wasabi S3, and form submissions to Salesforce via hidden iframe POST. The existing Media Hub admin experience remains unchanged on the main domain.

## What Gets Built

### 1. Hostname Router
A component in `App.tsx` that checks `window.location.hostname` -- if it includes "racer" or "racers", it renders the racer route tree; otherwise, the existing admin/investor routes render as-is.

### 2. Racer Layout
- Dark sidebar (desktop) with nav: Dashboard, Application, Motorcycle, Qualification, Profile
- "WMC PORTAL" header with gradient text
- Mobile: horizontal scrolling tab bar at the top
- Sign Out at bottom of sidebar

### 3. Racer Login (`/racer/login`)
- Email-only field (no password for MVP)
- Validates against the existing WMC member API (`specific-wmc-member-email.py`)
- If `<member>` elements exist in XML response, user is valid
- Stores member data in `sessionStorage`
- Dark racing aesthetic with gradient accents

### 4. Racer Dashboard (`/racer/dashboard`)
- Status cards showing application progress
- 5 scoring dimensions (Skill, Marketability, Equipment, Content Potential, X-Factor) with placeholder scores
- Qualification timeline showing steps toward 48-spot grid

### 5. Racer Application (`/racer/application`)
- 5-step wizard: Personal Info, Racing History, Motorcycle, 5 Key Questions, Audition Video
- Form data submitted to Salesforce via hidden iframe POST to `w2x-engine.php`
- File uploads use the existing presigned URL pipeline (same as BulkUploadTab)

### 6. Remaining Pages
- **Motorcycle** (`/racer/motorcycle`): Submit bike details per race, photos to S3
- **Qualification** (`/racer/qualification`): Read-only scores from RI API
- **Profile** (`/racer/profile`): Display member data from sessionStorage

### 7. Services
- `racerService.ts`: Salesforce iframe POST helper, API fetch helpers
- `racerMediaService.ts`: Wraps presigned URL upload flow with racer-specific auto-tagging

### 8. Reusable Upload Component
- `RacerFileUpload.tsx`: Wraps the presigned URL flow with progress bar, auto-tags uploads with `['Racer Submission', racerName, category]`

## Architecture Decisions

- **No new database tables** -- form data goes to Salesforce, files to Wasabi S3, media metadata to existing `media_assets` table
- **Supabase** only used for `media_assets` metadata and edge functions (presigned URLs)
- **UserContext** extended with a `role` field: `'racer' | 'admin' | 'investor'`
- **Dark theme forced** for all racer routes (uses existing `.dark` CSS variables)

---

## Technical Details

### New Files

| File | Purpose |
|------|---------|
| `src/components/racer/HostnameRouter.tsx` | Hostname detection, renders racer vs admin routes |
| `src/components/racer/RacerPortalLayout.tsx` | Sidebar + mobile tab bar layout |
| `src/components/racer/RacerFileUpload.tsx` | Reusable file upload with progress, wraps presigned URL flow |
| `src/components/racer/QualificationTimeline.tsx` | Visual timeline component |
| `src/components/racer/ScoringCard.tsx` | Individual scoring dimension display |
| `src/pages/racer/RacerLogin.tsx` | Email-only login page |
| `src/pages/racer/RacerDashboard.tsx` | Dashboard with scores + timeline |
| `src/pages/racer/RacerApplication.tsx` | 5-step application wizard |
| `src/pages/racer/RacerMotorcycle.tsx` | Motorcycle details form |
| `src/pages/racer/RacerQualification.tsx` | Read-only qualification scores |
| `src/pages/racer/RacerProfile.tsx` | Profile display |
| `src/services/racerService.ts` | Salesforce iframe POST + API helpers |
| `src/services/racerMediaService.ts` | Upload wrapper with racer context tagging |

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Wrap routes with HostnameRouter |
| `src/contexts/UserContext.tsx` | Add `role: 'racer' \| 'admin' \| 'investor'` to User interface |
| `src/index.css` | Add racing-gradient utility classes |

### Salesforce Iframe POST Pattern
Reuses the exact pattern from `loginService.ts` `trackLogin()`:
1. Create hidden iframe
2. Build form with hidden inputs mapped to Salesforce fields
3. POST to `w2x-engine.php`
4. Remove iframe after timeout

### File Upload Pattern
Reuses the exact pipeline from `BulkUploadTab.tsx`:
1. Call `generate-presigned-upload-url` edge function
2. XHR PUT directly to S3 with progress tracking
3. Call `upload-master-to-s3` to create `media_assets` row with racer-specific tags

### Implementation Order
1. HostnameRouter + racer routes in App.tsx + UserContext role field
2. RacerPortalLayout (sidebar + mobile tabs)
3. RacerLogin (wired to member API)
4. racerService.ts (Salesforce iframe POST)
5. RacerFileUpload component (wrapping Wasabi pipeline)
6. racerMediaService.ts
7. RacerDashboard with QualificationTimeline + ScoringCard
8. RacerApplication (5-step wizard with uploads)
9. Remaining pages (Motorcycle, Qualification, Profile)

