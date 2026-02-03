
# Implement Automatic 24-Hour S3 Sync & Fix Timeout Issues

## Overview
The S3 sync currently only runs when manually triggered. Despite having `scan_frequency_hours: 24` in the database, no automated scheduler exists. Additionally, the scan function is hitting CPU time limits on large buckets.

**Current State:**
- All 5 Greg Smrz videos **are** successfully synced in the database
- 1,834 S3 assets indexed, 973 from "WMC SIZZLES UNUSED" folder
- Scan is timing out due to CPU limits when processing thousands of files
- No automatic scheduler triggers the scan

---

## Part 1: Add Automatic Scheduled Sync

### Option A: Database Trigger with pg_cron (Recommended)
Use Supabase's pg_cron extension to schedule the sync to run every 24 hours.

**Migration file:** Create SQL migration to enable pg_cron and schedule the job

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to trigger S3 sync via HTTP
CREATE OR REPLACE FUNCTION trigger_s3_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_id uuid;
  response json;
BEGIN
  -- Get all active bucket configs that are due for scanning
  FOR bucket_id IN 
    SELECT id FROM s3_bucket_configs 
    WHERE is_active = true 
    AND (
      last_scanned_at IS NULL 
      OR last_scanned_at < NOW() - (scan_frequency_hours || ' hours')::interval
    )
  LOOP
    -- Call the edge function via http extension
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/scan-s3-buckets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object('bucketConfigId', bucket_id)
    );
    
    RAISE LOG 'Triggered S3 sync for bucket: %', bucket_id;
  END LOOP;
END;
$$;

-- Schedule to run every 24 hours at 3 AM UTC
SELECT cron.schedule(
  's3-sync-daily',
  '0 3 * * *',  -- Every day at 3:00 AM UTC
  $$SELECT trigger_s3_sync()$$
);
```

### Option B: Alternative - Edge Function with External Scheduler
If pg_cron is not available, create a dedicated scheduler edge function that can be triggered by an external service (e.g., cron-job.org, GitHub Actions).

---

## Part 2: Fix CPU Timeout Issues

The scan is hitting CPU limits due to:
1. Processing thousands of files sequentially
2. Triggering auto-tag API calls for every new image

### Fix 1: Batch Processing with Rate Limiting
Modify `scan-s3-buckets/index.ts` to process files in smaller batches with delays:

```typescript
// Around line 389, after the loop starts
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 500; // 0.5 second pause between batches

for (let i = 0; i < objects.length; i += BATCH_SIZE) {
  const batch = objects.slice(i, i + BATCH_SIZE);
  
  for (const obj of batch) {
    // ... existing processing logic ...
  }
  
  // Pause between batches to avoid CPU timeout
  if (i + BATCH_SIZE < objects.length) {
    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
  }
}
```

### Fix 2: Defer Auto-Tagging to Separate Job
Instead of triggering auto-tag immediately for every image, queue them for batch processing later:

```typescript
// Replace immediate auto-tag call (lines 468-486) with:
// Store asset IDs for later batch tagging instead of immediate calls
if (isNewAsset && assetId && assetType === 'image') {
  // Just log - auto-tagging can be done as a separate scheduled job
  console.log(`[SCAN] New image queued for tagging: ${assetId}`);
}
```

### Fix 3: Skip Already-Indexed Files Faster
Add early exit when file hasn't changed:

```typescript
// Before processing each object
const { data: existing } = await supabase
  .from('media_assets')
  .select('id, metadata')
  .eq('source_id', obj.Key)
  .eq('source', 's3_bucket')
  .maybeSingle();

// Skip if ETag matches (file unchanged)
if (existing && existing.metadata?.etag === obj.ETag) {
  skippedMedia++;
  continue;  // Skip entirely - file hasn't changed
}
```

---

## Part 3: Add Sync Status Visibility

### UI Enhancement: Show Next Scheduled Sync
Add to `S3BucketConfigManager.tsx`:

```typescript
// Calculate next sync time
const getNextSyncTime = (lastScanned: string | null, frequencyHours: number) => {
  if (!lastScanned) return 'Pending...';
  const next = new Date(lastScanned);
  next.setHours(next.getHours() + frequencyHours);
  return next.toLocaleString();
};

// Display in card
<div className="flex items-center gap-1">
  <Clock className="w-4 h-4" />
  <span>Next sync: {getNextSyncTime(config.last_scanned_at, config.scan_frequency_hours)}</span>
</div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | Add pg_cron schedule for automatic sync |
| `supabase/functions/scan-s3-buckets/index.ts` | Add batch processing, ETag skip logic, defer auto-tagging |
| `src/components/media/S3BucketConfigManager.tsx` | Display next scheduled sync time |

---

## Technical Considerations

### pg_cron Availability
- pg_cron must be enabled in your Supabase project (Settings → Extensions)
- Alternative: Use external scheduler services like cron-job.org or GitHub Actions

### CPU Limits
- Supabase edge functions have a ~50 second CPU limit
- Background processing (EdgeRuntime.waitUntil) has ~400 seconds wall-clock time
- With 1,800+ files, batching with delays is essential

### Greg Smrz Files Status
The database query confirms all 5 files from your screenshot **are synced**:
1. GREG G SMRZ. I have ideas for my team.m4v
2. GREG SMIRZ Longer pice iwth his intro.m4v
3. GREGG SMRZ NO RULES.m4v
4. GREGG SMRZ OPENS DOORS FRO RACERS.m4v
5. GREGG SMRZ WITH THE PRIZE MONEY ITS GONNA GET CRAZY.m4v

---

## Testing Checklist

After implementation:
- [ ] Verify pg_cron extension is enabled in Supabase dashboard
- [ ] Confirm scheduled job appears in cron.job table
- [ ] Wait 24 hours (or trigger manually) and verify last_scanned_at updates
- [ ] Check scan completes without CPU timeout errors
- [ ] Verify new files in S3 appear in Media Library after scheduled sync
