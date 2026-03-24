

# Why files fail to reach Wasabi (and the fix)

## Root Cause Analysis

The upload pipeline has a **trust gap** between the client-side S3 PUT and the server-side metadata finalization:

```text
Browser                          Wasabi S3                    Edge Function
   |                                |                             |
   |── PUT (presigned URL) ────────>|                             |
   |<── 200 OK (or silent fail) ───|                             |
   |                                |                             |
   |── POST finalize (s3Key) ──────────────────────────────────>|
   |                                |    creates DB + Salesforce  |
   |                                |    record WITHOUT checking  |
   |                                |    if object exists ──────> |
```

Several scenarios cause the file to never land in S3 while the DB record still gets created:

1. **Network interruption mid-upload**: XHR starts, progress fires, then connection drops. On some browsers/devices (especially mobile), the `onerror` callback doesn't fire reliably and the promise may resolve ambiguously.
2. **Presigned URL expiry**: aws4fetch signs URLs with a default expiry. For large video files on slow connections, the upload can outlast the signature validity. S3 rejects the PUT but the XHR may get a non-standard response.
3. **CORS rejection on Wasabi**: If Wasabi CORS config is stale or the origin changes, the PUT silently fails in the browser (CORS errors don't expose status codes to JS). The `onerror` handler fires, but the `racerMediaService.ts` has a fetch fallback that may also fail — yet the finalize step can still run if error handling doesn't propagate correctly.
4. **Wasabi transient errors**: Wasabi occasionally returns 200 on PUT but doesn't persist the object (rare but documented with their eventual consistency model).

## The Fix

**`supabase/functions/upload-master-to-s3/index.ts`** — Add a HEAD request to verify the object exists in S3 before creating any DB/Salesforce records. This is a ~15-line change in the finalize path (after line 146):

```typescript
// Verify the file actually exists in S3 before creating records
const s3Config = getS3Config();
const aws = new AwsClient({
  accessKeyId: s3Config.accessKeyId,
  secretAccessKey: s3Config.secretAccessKey,
  region: s3Config.region,
  service: "s3",
});

const headUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${s3Key}`;
const headResponse = await aws.fetch(headUrl, { method: "HEAD" });

if (!headResponse.ok) {
  console.error("S3 HEAD check failed:", headResponse.status, "for key:", s3Key);
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: "File not found in S3. The upload may have failed. Please try again." 
    }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

This ensures no orphaned DB/Salesforce records are created when the file didn't actually make it to Wasabi. The existing `AwsClient` import is already available in this function, so no new dependencies are needed.

No client-side changes required — the error response will naturally propagate through the existing error handling in `MediaUpload.tsx`, `MasterImageUploadDialog.tsx`, and `racerMediaService.ts`, showing the user a "please try again" message.

