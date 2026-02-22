

# Revise Qualification Timeline Steps

## Problem

The last two timeline steps currently say:
- "Qualification Decision" with "Top 48 riders selected"
- "Grid Position Assigned" with "Race day starting position"

This is inaccurate. Qualification is a yes/no decision, and qualified racers then choose a race and submit motorcycle details -- there is no "grid position assignment."

## Changes

Update the `timelineSteps` array in `src/pages/racer/RacerDashboard.tsx`:

**Step 4** -- Change from:
- Label: "Qualification Decision" / Description: "Top 48 riders selected"

To:
- Label: "Qualification Decision" / Description: "Yes or no -- are you qualified to compete?"

**Step 5** -- Change from:
- Label: "Grid Position Assigned" / Description: "Race day starting position"

To:
- Label: "Select a Race" / Description: "Choose an upcoming race and submit your motorcycle details"

## Technical Details

Single file change: `src/pages/racer/RacerDashboard.tsx`, lines 23-24 of the `timelineSteps` array.

