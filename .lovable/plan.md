

# Application Progress on Dashboard + Social Handle Inputs

## Overview

Three connected changes: (1) the Dashboard status card shows a progress bar reflecting completion of the 5 application steps, (2) social media fields accept handles instead of full URLs with inline platform prefixes, and (3) handle verification checks that the constructed URL is reachable.

---

## 1. Persist Application Progress

Currently application form data lives only in React state and is lost on navigation. To let the Dashboard read completion status:

- Store `formData` in `localStorage` (keyed by racer contact ID) whenever it changes in the Application page.
- On Application load, read from `localStorage` first, then overlay any newer profile data from `sessionStorage`.
- The Dashboard reads the same `localStorage` key to compute step completion.

---

## 2. Step Completion Logic

Each of the 5 steps has a "complete" check based on whether required fields are filled:

| Step | Complete When |
|------|--------------|
| Personal Info | First name, last name, email, phone filled AND at least 1 social handle provided |
| Racing History | Years of experience AND at least one of racing series or results filled |
| Motorcycle | Make, model, and year filled |
| 5 Key Questions | All 5 question fields have content |
| Audition Video | A video file has been uploaded (tracked via a flag in localStorage) |

A shared utility function `getApplicationProgress(formData)` returns an array of booleans and a completion count (0-5). This is used by both the Application page (step indicators) and the Dashboard.

---

## 3. Dashboard Status Card with Progress Bar

Replace the current static "Not Started" / "Pending" status card with:

- A text label: "0 of 5 steps complete", "3 of 5 steps complete", or "Application Complete"
- A `Progress` bar component showing percentage (0%, 20%, 40%... 100%)
- Badge changes from "Pending" to "In Progress" to "Complete"
- A list of the 5 step names with checkmark or empty circle icons
- A "Continue Application" button linking to `/racer/application`

---

## 4. Social Handle Inputs (Application + Profile)

Change social media fields from full-URL inputs to handle-only inputs with a visible platform prefix:

- **LinkedIn**: prefix `linkedin.com/in/` -- user types just their handle
- **YouTube**: prefix `youtube.com/@` -- user types their channel handle
- **Facebook**: prefix `facebook.com/` -- user types their page/profile name
- **X / Twitter**: prefix `x.com/` -- user types their handle

Each input uses an `InputGroup`-style layout with the prefix shown as a non-editable span to the left of the input. On save/submit, the handle is stored as-is but the full URL is constructed for Salesforce updates.

When loading existing data that contains a full URL, the component strips the prefix to show just the handle.

---

## 5. Handle Verification

When the user leaves (blurs) a social handle field that has content:

- Construct the full URL from the handle
- Attempt a lightweight check using `fetch` with `mode: 'no-cors'` or an `<img>` trick (since most social platforms block CORS, a full verification is not possible client-side)
- **Practical approach**: validate the handle format (no spaces, no special characters besides dots/underscores/hyphens) and show a green checkmark for valid format, or a warning icon for suspicious input
- A true URL existence check would require a backend proxy, so the client-side validation focuses on format correctness with a note that WMC will verify profiles

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/utils/applicationProgress.ts` | **New** -- shared completion logic + handle-to-URL conversion utilities |
| `src/pages/racer/RacerDashboard.tsx` | Add progress bar, dynamic status, step checklist |
| `src/pages/racer/RacerApplication.tsx` | Persist formData to localStorage, use handle inputs for socials, show completion on step indicators |
| `src/pages/racer/RacerProfile.tsx` | Switch social fields to handle inputs with prefixes |
| `src/components/racer/SocialHandleInput.tsx` | **New** -- reusable input component with platform prefix and format validation |

---

## Technical Details

**applicationProgress.ts utility:**
```
SOCIAL_PLATFORMS = {
  linkedin: { prefix: 'linkedin.com/in/', base: 'https://linkedin.com/in/' },
  youtube:  { prefix: 'youtube.com/@',    base: 'https://youtube.com/@' },
  facebook: { prefix: 'facebook.com/',    base: 'https://facebook.com/' },
  twitter:  { prefix: 'x.com/',           base: 'https://x.com/' },
}

extractHandle(platform, value): strips full URL down to handle
buildFullUrl(platform, handle): constructs full URL from handle
isValidHandle(handle): regex check -- alphanumeric, dots, underscores, hyphens

getStepCompletion(formData): returns boolean[] for each of 5 steps
getCompletionCount(formData): returns number 0-5
```

**SocialHandleInput component:**
- Props: `platform`, `value`, `onChange`, `disabled`
- Shows prefix as a gray span inside the input border
- On blur, validates handle format and shows green check or warning icon
- Strips any pasted full URLs down to just the handle automatically

**localStorage key**: `racerApplication_{contactId}`

