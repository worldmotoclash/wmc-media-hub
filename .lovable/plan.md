

# Add DOB + Emergency Contact Fields & Per-Step SFDC Sync

## Changes

### 1. `src/pages/racer/RacerApplication.tsx`

**New fields in Step 0 (Personal Info):**
- Date of Birth (`dob`) — `<Input type="date">` field
- Emergency Contact Name (`emergencyContactName`) — text input
- Emergency Contact Phone (`emergencyContactPhone`) — text input

Place these after the phone/mobile row and before the street address.

**Per-step SFDC sync on Next button:**
- Replace `handleNext` with an async function that:
  1. Sets a `saving` loading state
  2. Builds a field map for the current step's data with proper w2x field prefixes
  3. Calls `submitRacerApplication(racer.id, stepFields)` (which POSTs to w2x-engine)
  4. Shows a brief toast ("Progress saved")
  5. Advances to next step
- The field mapping per step:
  - **Step 0**: `string_FirstName`, `string_LastName`, `string_Email`, `string_Title`, `phone_Phone`, `phone_MobilePhone`, `text_MailingStreet`, `text_MailingCity`, `text_MailingState`, `text_MailingPostalCode`, `text_MailingCountry`, `url_rie__LinkedIn__c`, `url_Youtube__c`, `url_rie__Facebook__c`, `url_rie__Twitter__c`, `date_Birthdate`, `string_Emergency_Contact_Name__c`, `phone_Emergency_Contact_Phone__c`
  - **Step 1**: `string_Years_of_Experience__c` (or similar custom field names — passed as raw keys)
  - **Steps 2-4**: Pass formData keys as-is (they'll be stored in SFDC via the engine)
- Add a `saving` state and show a spinner on the Next button while saving

### 2. `src/utils/applicationProgress.ts`

- No changes needed to step completion logic (DOB and emergency contact are optional fields, not required for step completion)

### 3. `src/services/racerService.ts`

- No structural changes needed — `submitRacerApplication` already accepts arbitrary `Record<string, string>` and POSTs to w2x-engine with `sObj: 'Contact'`

## New helper: step-to-SFDC field mapping

A mapping function in `RacerApplication.tsx` that converts local formData keys to w2x-engine field names for each step, so the Next button sends only the current step's fields with correct SFDC API names.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/racer/RacerApplication.tsx` | Add 3 new fields to Step 0; replace `handleNext` with async save-then-advance; add `saving` state |

