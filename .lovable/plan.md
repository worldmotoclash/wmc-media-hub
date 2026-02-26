

# Fix Social Media Field Prefixes in Salesforce Payload

## Problem

The social media fields are being sent with `url_` prefixes and full URLs, but Salesforce expects bare handles with `string_` prefixes.

## Change

In `src/pages/racer/RacerApplication.tsx`, revert the `buildFullUrl` wrapping and change the field prefixes from `url_` to `string_`:

```typescript
// Before (wrong)
if (formData.linkedin) fields['url_rie__LinkedIn__c'] = buildFullUrl('linkedin', formData.linkedin);

// After (correct)
if (formData.linkedin) fields['string_rie__LinkedIn__c'] = formData.linkedin;
```

Apply this to all six social fields: LinkedIn, YouTube, Facebook, Twitter, TikTok, Instagram. Also update YouTube and Instagram field names to use the `string_` prefix consistently:

| Current | Corrected |
|---------|-----------|
| `url_rie__LinkedIn__c` | `string_rie__LinkedIn__c` |
| `url_Youtube__c` | `string_Youtube__c` |
| `url_rie__Facebook__c` | `string_rie__Facebook__c` |
| `url_rie__Twitter__c` | `string_rie__Twitter__c` |
| `url_rie__TikTok__c` | `string_rie__TikTok__c` |
| `url_Instagram__c` | `string_Instagram__c` |

The `buildFullUrl` import can be removed if no longer used elsewhere in this file.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/racer/RacerApplication.tsx` | Change 6 social field prefixes from `url_` to `string_`, send raw handles instead of full URLs |

