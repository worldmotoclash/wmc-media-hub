
# Racer Profile: Full Editable Profile with Correct XML Field Mapping

## Problem
The current `RacerProfile.tsx` only shows 5 basic fields read-only. The XML feed already contains address fields (`MailingCity`, `MailingState`, `MailingPostalCode`, `MailingCountry`) but they are not being parsed. The profile needs to match the portal rev 2 style with edit/save capability.

## What Changes

### 1. Expand `RacerMember` interface and XML parser in `racerService.ts`

Add all fields the XML feed provides. Note the XML tag casing matches the feed exactly:
- `mailingstreet` (lowercase -- already mapped)
- `MailingCity` (capital M, capital C)
- `MailingState` (capital M, capital S)
- `MailingPostalCode` (capital M, capital P, capital C)
- `MailingCountry` (capital M, capital C)

Also add `firstname`, `lastname`, `jobtitle`, `website`, `membership`, `membershipdate` to parse from the feed.

### 2. Add `updateRacerProfile` function to `racerService.ts`

POST to `https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/update-engine-contact.php` via hidden iframe, using the same field mapping as portal rev 2:
- `sObj: 'Contact'`, `id_Contact: contactId`
- `string_FirstName`, `string_LastName`, `string_Email`, `string_Title`
- `phone_Phone`, `phone_MobilePhone`
- `text_MailingStreet`, `text_MailingCity`, `text_MailingState`, `text_MailingPostalCode`, `text_MailingCountry`

### 3. Create `src/data/address-options.ts`

Copy the US_STATES and COUNTRIES arrays from the other portal (51 US states/territories, 33 countries).

### 4. Rebuild `RacerProfile.tsx`

Mirror the UserProfile from portal rev 2 with:
- Edit/Save/Cancel toggle buttons
- **Personal Information** card: First Name, Last Name, Email (editable)
- **Professional Information** card: Title/Position (editable)
- **Contact Information** card: Phone, Mobile Phone (editable)
- **Address Information** card: Street, City, State (dropdown for US/CA, text input otherwise), ZIP, Country (dropdown) -- all editable
- **Account Status** card: Status display (read-only)

On save: call `updateRacerProfile()`, update sessionStorage, show success toast.

### 5. Update `RacerLogin.tsx`

Store expanded fields (firstname, lastname, city, state, zip, country, title, website) in sessionStorage when logging in.

### 6. Update `fetchMemberByEmail` in `loginService.ts`

Add parsing of `MailingCity`, `MailingState`, `MailingPostalCode`, `MailingCountry`, `firstname`, `lastname`, `jobtitle`, `website` from the XML response so the racer login flow (which uses `fetchMemberByEmail`) captures all fields.

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/data/address-options.ts` | US_STATES and COUNTRIES dropdown data |

### Files to Modify

| File | Change |
|------|--------|
| `src/services/racerService.ts` | Expand `RacerMember` interface with all address/profile fields, update XML parser, add `updateRacerProfile()` function |
| `src/services/loginService.ts` | Add `MailingCity`, `MailingState`, `MailingPostalCode`, `MailingCountry`, `firstname`, `lastname`, `jobtitle`, `website` to `fetchMemberByEmail` XML parser |
| `src/pages/racer/RacerProfile.tsx` | Full rebuild: editable profile with cards for Personal, Professional, Contact, Address info |
| `src/pages/racer/RacerLogin.tsx` | Store expanded fields in sessionStorage on login |

### XML Tag to Interface Mapping

| XML Tag | RacerMember Field | Notes |
|---------|-------------------|-------|
| `mailingstreet` | `mailingstreet` | Lowercase in feed |
| `MailingCity` | `mailingcity` | Mixed case in feed |
| `MailingState` | `mailingstate` | Mixed case in feed |
| `MailingPostalCode` | `mailingzip` | Mixed case in feed |
| `MailingCountry` | `mailingcountry` | Mixed case in feed |
| `firstname` | `firstName` | To be confirmed in feed |
| `lastname` | `lastName` | To be confirmed in feed |
| `jobtitle` | `title` | To be confirmed in feed |
| `website` | `website` | To be confirmed in feed |

### Salesforce Update Field Mapping

Uses the same endpoint and prefix convention as portal rev 2:

```
POST https://realintelligence.com/.../update-engine-contact.php

sObj = Contact
id_Contact = {contactId}
string_FirstName = {firstName}
string_LastName = {lastName}
string_Email = {email}
string_Title = {title}
phone_Phone = {phone}
phone_MobilePhone = {mobile}
text_MailingStreet = {street}
text_MailingCity = {city}
text_MailingState = {state}
text_MailingPostalCode = {zip}
text_MailingCountry = {country}
```
