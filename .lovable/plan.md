

# Fix w2x-engine Response Handling: Treat 302 as Success

## Problem
The `w2x-engine.php` endpoint processes the request and responds with a 302 redirect (to `retURL`). The current code follows the redirect (default `fetch` behavior), receives the HTML of the redirect target, and treats it as "success" based on `response.ok` — but the HTML body is meaningless. This causes false positives and prevents proper error detection.

## Fix
Add `redirect: "manual"` to stop following the 302. Treat `302` as success (the engine processed the request). Treat anything else as failure.

## Changes

### File 1: `supabase/functions/sync-asset-to-salesforce/index.ts`

**`updateSalesforceRecord`** (lines 170-177): Replace the fetch + `response.ok` check:
```typescript
const response = await fetch(W2X_ENGINE_URL, {
  method: "POST",
  body: formData,
  redirect: "manual",
});

if (response.status === 302) {
  const location = response.headers.get("location");
  console.log(`w2x-engine update redirected to: ${location} — treating as success`);
  return true;
}

console.error(`w2x-engine update unexpected status: ${response.status}`);
const responseText = await response.text();
console.error(`w2x-engine response: ${responseText.substring(0, 300)}`);
return false;
```

**`createSalesforceRecord`** (lines 284-293): Same pattern:
```typescript
const response = await fetch(W2X_ENGINE_URL, {
  method: "POST",
  body: formData,
  redirect: "manual",
});

if (response.status === 302) {
  const location = response.headers.get("location");
  console.log(`w2x-engine create redirected to: ${location} — treating as success`);
  return true;
}

console.error(`w2x-engine create unexpected status: ${response.status}`);
const responseText = await response.text();
console.error(`w2x-engine response: ${responseText.substring(0, 300)}`);
return false;
```

### File 2: `supabase/functions/upload-master-to-s3/index.ts`

**Inline SFDC sync block** (lines 459-522): Replace the fetch and `sfResponse.ok` check:
```typescript
const sfResponse = await fetch(W2X_ENGINE_URL, {
  method: "POST",
  body: formData,
  redirect: "manual",
});

if (sfResponse.status === 302) {
  console.log("w2x-engine accepted record (302 redirect) — querying for SFDC ID...");
  salesforceId = await findSalesforceIdByUrl(cdnUrl, 3);
  sfdcSyncStatus = salesforceId ? 'success' : 'failed';
  if (!salesforceId) {
    sfdcSyncError = "Record likely created but ID not found in XML feed yet";
  }
  // ... keep existing success/partial-success DB update logic
} else {
  sfdcSyncError = `w2x-engine unexpected status ${sfResponse.status}`;
  console.error(sfdcSyncError);
  // ... keep existing failure DB update logic
}
```

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/sync-asset-to-salesforce/index.ts` | Add `redirect: "manual"` and treat 302 as success in both `createSalesforceRecord` and `updateSalesforceRecord` |
| `supabase/functions/upload-master-to-s3/index.ts` | Same pattern in the inline SFDC sync block (~line 459) |

