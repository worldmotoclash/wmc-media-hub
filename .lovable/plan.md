

# Fix Application Step Save to Salesforce

## Problem

The Profile page saves correctly to Salesforce, but the Application's per-step "Next" save does not persist data.

## Root Cause

The two flows use **different Salesforce endpoints**:

- **Profile** (`updateRacerProfile`): submits to `update-engine-contact.php` -- **works**
- **Application** (`submitRacerApplication`): submits to `w2x-engine.php` -- **does not work** for Contact updates

The `w2x-engine.php` endpoint is designed for record creation, not updating existing Contact records. The `update-engine-contact.php` endpoint is specifically built for Contact updates, which is what the Application step-save is doing (updating fields on an existing Contact via `id_Contact`).

## Fix

### File: `src/services/racerService.ts`

Change `submitRacerApplication` (line 238) to use `UPDATE_ENGINE_URL` instead of `W2X_ENGINE_URL`:

```typescript
export const submitRacerApplication = async (
  contactId: string,
  stepData: Record<string, string>
): Promise<void> => {
  await submitViaIframe(UPDATE_ENGINE_URL, {
    sObj: 'Contact',
    id_Contact: contactId,
    ...stepData,
  });
};
```

This is a one-line change: replacing `submitToSalesforce(...)` with `submitViaIframe(UPDATE_ENGINE_URL, ...)` so it uses the same working endpoint as the Profile page.

## Files Modified

| File | Change |
|------|--------|
| `src/services/racerService.ts` | Switch `submitRacerApplication` from `W2X_ENGINE_URL` to `UPDATE_ENGINE_URL` |

