

# Fix Salesforce Updates for Both Profile and Application

## Problem

Neither the Profile nor the Application saves social handles, height, weight, or place of birth to Salesforce. The user provided a working HTML form that reveals the exact payload pattern required by `w2x-engine.php`.

## Root Cause — Three Mismatches vs. Working HTML

The user's working HTML test form uses:

```html
<form action="w2x-engine.php" method="POST">
  <input name="action" value="update">
  <input name="Id" value="0035e000003cugh">
  <input name="sObj" value="Contact">
  <input name="string_rie__TikTok__c" value="...">
</form>
```

Our code differs in three critical ways:

| Aspect | Working HTML | Our Profile Code | Our Application Code |
|--------|-------------|-----------------|---------------------|
| Endpoint | `w2x-engine.php` | `update-engine-contact.php` | `update-engine-contact.php` |
| Record ID field | `Id` | `id_Contact` | `id_Contact` |
| Action field | `action=update` | missing | missing |
| Social prefix | `string_` | `url_` | `string_` (correct) |

All three issues must be fixed in both flows.

## Changes

### File 1: `src/services/racerService.ts` — `updateRacerProfile`

1. Switch endpoint from `UPDATE_ENGINE_URL` to `W2X_ENGINE_URL`
2. Change `id_Contact` to `Id`
3. Add `action: 'update'`
4. Change social handle prefixes from `url_` to `string_`

The fields block becomes:
```typescript
const fields: Record<string, string> = {
  sObj: 'Contact',
  action: 'update',
  Id: contactId,
};
// ... all existing field mappings, but social handles change from url_ to string_:
// url_rie__LinkedIn__c  →  string_rie__LinkedIn__c
// url_Youtube__c        →  string_rie__Youtube__c   (also fix casing: Youtube → rie__Youtube__c)
// url_rie__Facebook__c  →  string_rie__Facebook__c
// url_rie__Twitter__c   →  string_rie__Twitter__c
// url_rie__TikTok__c    →  string_rie__TikTok__c
// url_Instagram__c      →  string_rie__Instagram__c (also fix: Instagram__c → rie__Instagram__c)
```

Note: The working HTML uses `string_rie__Youtube__c` and `string_rie__Instagram__c` — our code currently has `Youtube__c` and `Instagram__c` (missing `rie__` prefix). This is also fixed.

### File 2: `src/services/racerService.ts` — `submitRacerApplication`

1. Switch endpoint back from `UPDATE_ENGINE_URL` to `W2X_ENGINE_URL`
2. Change `id_Contact` to `Id`
3. Add `action: 'update'`

```typescript
export const submitRacerApplication = async (
  contactId: string,
  stepData: Record<string, string>
): Promise<void> => {
  await submitViaIframe(W2X_ENGINE_URL, {
    sObj: 'Contact',
    action: 'update',
    Id: contactId,
    ...stepData,
  });
};
```

### File 3: `src/pages/racer/RacerApplication.tsx` — `getSFDCFieldsForStep` (case 0, lines 135-140)

Fix social handle field names to match the working `rie__` pattern:

```
string_rie__LinkedIn__c   (unchanged)
string_rie__Youtube__c    (was string_Youtube__c — add rie__ prefix)
string_rie__Facebook__c   (unchanged)
string_rie__Twitter__c    (unchanged)
string_rie__TikTok__c     (unchanged)
string_rie__Instagram__c  (was string_Instagram__c — add rie__ prefix)
```

## Summary of All Changes

| File | Change |
|------|--------|
| `src/services/racerService.ts` | `updateRacerProfile`: switch to `W2X_ENGINE_URL`, add `action: 'update'`, change `id_Contact` → `Id`, change `url_` → `string_` for social fields, fix `Youtube__c` → `rie__Youtube__c` and `Instagram__c` → `rie__Instagram__c` |
| `src/services/racerService.ts` | `submitRacerApplication`: switch back to `W2X_ENGINE_URL`, add `action: 'update'`, change `id_Contact` → `Id` |
| `src/pages/racer/RacerApplication.tsx` | Fix `Youtube__c` → `rie__Youtube__c` and `Instagram__c` → `rie__Instagram__c` in `getSFDCFieldsForStep` |

