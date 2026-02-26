

# Populate All Feed Fields Into Profile and Application on Login

## Problem

When a racer logs in, the `RacerLogin.tsx` handler builds the `racerData` object that gets stored in `sessionStorage`. This object is missing many fields that exist in the Salesforce XML feed, including:

- `tiktok`, `instagram` (social media)
- `birthdate`
- `emergencyname`, `emergencyphone`
- `heightininches`, `weightinlbs`, `placeofbirth`
- `experiencelevel`

Additionally, the `fetchMemberByEmail` function in `loginService.ts` (the XML parser used at login) does not extract these fields from the XML at all -- it stops at `twitter`. So even though `<birthdate>1958-03-28</birthdate>` is in the feed, it is never parsed or stored.

The Profile and Application pages read from `sessionStorage('racerUser')`, so any fields not stored at login time will appear blank.

## Root Cause

Two gaps:

1. **`src/services/loginService.ts`** `fetchMemberByEmail` XML parser (lines 175-200): Only extracts fields up to `twitter`. Does not parse `tiktok`, `instagram`, `birthdate`, `emergencyname`, `emergencyphone`, `heightininches`, `weightinlbs`, `placeofbirth`, `experiencelevel`.

2. **`src/pages/racer/RacerLogin.tsx`** login handler (lines 54-74): Only maps a subset of fields into `racerData`. Missing all the fields above.

## Changes

### File 1: `src/services/loginService.ts` -- Add missing fields to XML parser

After line 199 (`twitter`), add extraction for the missing fields using the same `getAny` pattern:

```
tiktok: getAny('rie__TikTok__c', 'tiktok', 'TikTok'),
instagram: getAny('instagram', 'Instagram', 'rie__Instagram__c'),
birthdate: get('birthdate'),
emergencyname: getAny('emergencyname', 'Emergency_Contact_Name__c'),
emergencyphone: getAny('emergencyphone', 'Emergency_Contact_Phone__c'),
experiencelevel: getAny('experiencelevel', 'Experience_Level__c'),
heightininches: getAny('heightininches', 'Height_In_Inches__c'),
weightinlbs: getAny('weightinlbs', 'Weight_in_lbs__c'),
placeofbirth: getAny('placeofbirth', 'Place_of_Birth__c'),
```

This matches the exact same tag names already used in `racerService.ts`'s `parseRacerMemberXml`.

### File 2: `src/pages/racer/RacerLogin.tsx` -- Store all fields in sessionStorage

Update the `racerData` object (lines 54-74) to include all the missing fields from the member response:

```
tiktok: member.tiktok || '',
instagram: member.instagram || '',
birthdate: member.birthdate || '',
emergencyname: member.emergencyname || '',
emergencyphone: member.emergencyphone || '',
experiencelevel: member.experiencelevel || '',
heightininches: member.heightininches || '',
weightinlbs: member.weightinlbs || '',
placeofbirth: member.placeofbirth || '',
```

## Result

After login, `sessionStorage.racerUser` will contain all fields from the feed. Both the Profile page and the Application page will pre-populate correctly, including birthdate, emergency contacts, physical stats, and all social handles.

## Files Modified

| File | Change |
|------|--------|
| `src/services/loginService.ts` | Add 9 missing field extractions to `fetchMemberByEmail` XML parser |
| `src/pages/racer/RacerLogin.tsx` | Add 9 missing fields to `racerData` object stored in sessionStorage |

