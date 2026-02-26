

# Replace "Years of Experience" with "Experience Level" Picklist + Parse from Feed

## Changes

### 1. `src/services/racerService.ts`
- Add `experiencelevel?: string` to `RacerMember` interface
- Parse `experiencelevel` in `parseRacerMemberXml` via `get('experiencelevel')`

### 2. `src/pages/racer/RacerApplication.tsx`

**Pre-populate from feed (line ~57 area):**
- Add `experienceLevel: parsed.experiencelevel || ''` to `profileDefaults`

**Replace field in Step 1 UI (lines 263-265):**
- Remove the `<Input type="number">` for "Years of Racing Experience"
- Replace with a `<Select>` dropdown labeled "Experience Level" with four options:
  - Beginner (0-2 years)
  - Intermediate (3-5 years)
  - Advanced (6-10 years)
  - Professional (10+ years)
- Bind to `formData.experienceLevel` via `updateField`

**Update SFDC mapping (line 98):**
- Change `formData.yearsExperience` / `string_Years_of_Experience__c` to `formData.experienceLevel` / `string_Experience_Level__c`

### 3. Import
- Add `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` imports to `RacerApplication.tsx`

## Files Modified

| File | Change |
|------|--------|
| `src/services/racerService.ts` | Add `experiencelevel` to interface + XML parser |
| `src/pages/racer/RacerApplication.tsx` | Replace years input with Experience Level select; pre-populate from feed; update SFDC field name |

