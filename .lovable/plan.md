

# Fix AI Analysis Hanging on WMC-Utah-Poster-1

## Root Cause
The `analyze-video-preview` edge function is receiving **502 errors** from the Lovable AI Gateway. This is a transient upstream failure. The function immediately throws on the first failure without retrying, and the error propagates to the frontend which shows an error toast. However, the user perceives this as "hanging" because the analysis silently fails and the UI reverts to the un-analyzed state with no clear feedback.

The logs show two failed attempts for `WMC-Utah-Poster-1.png` both returning `502 error code: 500` from the AI Gateway, while other images like `WMC-Poster-3.png` and `WMC-Utah-Poster-2.png` succeeded.

## Fix: Add Retry Logic to AI Gateway Calls

### 1. `supabase/functions/analyze-video-preview/index.ts`
- Wrap the `fetch` call to the AI gateway in a retry loop (up to 3 attempts)
- Wait 2 seconds between retries (exponential backoff: 2s, 4s)
- Only retry on 502 and 503 status codes (transient errors)
- Log each retry attempt for debugging

### 2. `supabase/functions/auto-tag-media-asset/index.ts`
- Apply the same retry logic to its AI gateway call (used by the re-analyze button in preview modals)
- Same retry pattern: 3 attempts with exponential backoff on 502/503

### No frontend changes needed
The frontend error handling (`try/catch/finally`) is already correct. The fix is purely on the edge function side to make AI calls more resilient to transient gateway failures.

