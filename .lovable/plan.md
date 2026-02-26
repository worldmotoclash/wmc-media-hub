

# Add Height, Weight, Place of Birth Fields + LinkedIn Feed Parsing

## Changes

### 1. `src/services/racerService.ts`
- Add to `RacerMember` interface: `heightininches?: string`, `weightinlbs?: string`, `placeofbirth?: string`
- Add to `parseRacerMemberXml`: parse `heightininches`, `weightinlbs`, `placeofbirth` tags
- Add to `updateRacerProfile` data shape and field mapping:
  - `string_Height_In_Inches__c`
  - `string_Weight_in_lbs__c`
  - `string_Place_of_Birth__c`
- Note: LinkedIn already parsed as `rie__LinkedIn__c` — confirmed correct per user's SFDC API name

### 2. `src/pages/racer/RacerApplication.tsx`
- Pre-populate: `heightInInches`, `weightInLbs`, `placeOfBirth` from feed
- Add 3 fields to Step 0 Personal Info section (after DOB, before emergency contact):
  - Height (inches) — numeric input
  - Weight (lbs) — numeric input
  - Place of Birth — text input
- Add SFDC mapping in `getSFDCFieldsForStep` case 0:
  - `string_Height_In_Inches__c`, `string_Weight_in_lbs__c`, `string_Place_of_Birth__c`

### 3. `src/pages/racer/RacerProfile.tsx`
- Add `heightInInches`, `weightInLbs`, `placeOfBirth` to formData state
- Pre-populate from `parsed.heightininches`, `parsed.weightinlbs`, `parsed.placeofbirth`
- Add fields to Safety & Emergency card (Place of Birth after DOB; Height + Weight in a row)
- Update `handleCancel`, `handleSave`, and sessionStorage sync

## Files Modified

| File | Change |
|------|--------|
| `src/services/racerService.ts` | Add 3 fields to interface, XML parser, and updateRacerProfile |
| `src/pages/racer/RacerApplication.tsx` | Pre-populate + add UI fields + SFDC mapping for height/weight/place of birth |
| `src/pages/racer/RacerProfile.tsx` | Add 3 fields to form state, display, save, and cancel logic |

