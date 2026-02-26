

# Parse New XML Feed Fields (birthdate, emergencyname, emergencyphone, instagram)

The XML member feed now includes `<birthdate>`, `<emergencyname>`, `<emergencyphone>`, and `<instagram>` tags. These need to be parsed and pre-populated into the application and profile.

## Changes

### 1. `src/services/racerService.ts`

**Add new fields to `RacerMember` interface:**
- `birthdate?: string`
- `emergencyname?: string`
- `emergencyphone?: string`
- `instagram?: string`

**Update `parseRacerMemberXml`:**
- `birthdate: get('birthdate')`
- `emergencyname: getAny('emergencyname', 'Emergency_Contact_Name__c')`
- `emergencyphone: getAny('emergencyphone', 'Emergency_Contact_Phone__c')`
- `instagram: getAny('instagram', 'Instagram')`

**Update `updateRacerProfile`:**
- Add `dob`, `emergencyContactName`, `emergencyContactPhone` to the accepted data shape
- Map: `date_Birthdate`, `string_Emergency_Contact_Name__c`, `phone_Emergency_Contact_Phone__c`

### 2. `src/pages/racer/RacerApplication.tsx`

**Pre-populate new fields from profile (line 37-54 area):**
- `dob: parsed.birthdate || ''`
- `emergencyContactName: parsed.emergencyname || ''`
- `emergencyContactPhone: parsed.emergencyphone || ''`

These fields already exist in the form UI but are not currently pre-populated from the feed.

### 3. `src/pages/racer/RacerProfile.tsx`

**Add DOB and Emergency Contact display/edit fields:**
- Add `dob`, `emergencyContactName`, `emergencyContactPhone` to `formData` state
- Pre-populate from `parsed.birthdate`, `parsed.emergencyname`, `parsed.emergencyphone`
- Add a "Safety & Emergency" card with Date of Birth, Emergency Contact Name, Emergency Contact Phone fields
- Include these fields in `handleSave` and `handleCancel`
- Update the `updateRacerProfile` call to pass the new fields

### 4. `src/utils/applicationProgress.ts` (optional)

**Add Instagram platform** since the feed now includes it:
- Add `instagram: { prefix: 'instagram.com/', base: 'https://instagram.com/' }` to `SOCIAL_PLATFORMS`

### 5. Application + Profile: Add Instagram field

- Add Instagram `SocialHandleInput` to both the application Step 0 and the Profile social media card
- Add `instagram` to `RacerMember` parsing, profile formData, and SFDC mapping (`url_Instagram__c` or similar)

## Files Modified

| File | Change |
|------|--------|
| `src/services/racerService.ts` | Add `birthdate`, `emergencyname`, `emergencyphone`, `instagram` to interface + XML parser + updateRacerProfile |
| `src/pages/racer/RacerApplication.tsx` | Pre-populate `dob`, `emergencyContactName`, `emergencyContactPhone`, add Instagram field + SFDC mapping |
| `src/pages/racer/RacerProfile.tsx` | Add DOB + emergency contact + Instagram fields to profile form, save, and cancel logic |
| `src/utils/applicationProgress.ts` | Add `instagram` to `SOCIAL_PLATFORMS` |

