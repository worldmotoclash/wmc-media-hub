

# Fix: VEO 3.0 Returns Base64 Video, Not a URL

## Root Cause

The VEO 3.0 API returned the generated video as **base64-encoded data** (`bytesBase64Encoded`) inside `response.videos[0]`, but the `findVideoUrlInResponse` function only searches for URL/URI string fields. It never checks for base64 video data, so it reports "no video URL found" even though the video was successfully generated.

From the logs, the actual response structure is:
```json
{
  "done": true,
  "response": {
    "videos": [
      { "bytesBase64Encoded": "AAAAIGZ0eXBpc29t..." }
    ]
  }
}
```

## Fix (single file)

### `supabase/functions/generate-veo-video/index.ts`

**1. Update the polling section (~line 473-498):** After calling `findVideoUrlInResponse`, add a fallback check for `bytesBase64Encoded` in `response.videos[0]`. If found, decode the base64 data, upload it to Supabase storage (`generated-videos` bucket), and use the resulting public URL as `videoUrl`.

```typescript
// After findVideoUrlInResponse returns null, check for base64 video
if (!videoUrl) {
  const base64Video = opData?.response?.videos?.[0]?.bytesBase64Encoded;
  if (base64Video && typeof base64Video === 'string') {
    console.log('📦 Found base64-encoded video, decoding and uploading...');
    const binaryStr = atob(base64Video);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const fileName = `veo-${generationId}-${Date.now()}.mp4`;
    const filePath = `generated/${fileName}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('generated-videos')
      .upload(filePath, bytes, { contentType: 'video/mp4', upsert: false });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    const { data: urlData } = supabaseClient.storage
      .from('generated-videos')
      .getPublicUrl(filePath);
    videoUrl = urlData?.publicUrl || null;
    console.log('✅ Base64 video uploaded, URL:', videoUrl);
  }
}
```

**2. Also add `bytesBase64Encoded` to `findVideoUrlInResponse`** as a secondary signal -- if the field exists and is a long string, log it so the caller knows base64 data is available (handled by the new code above).

No database changes required. No new secrets needed.

