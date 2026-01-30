
# Fix Missing Tags and Thumbnail Issues

## Overview
Two bugs were identified when uploading videos with AI analysis:
1. **Tags not saved**: AI-generated tags from the pre-upload analysis are displayed in the form but never persisted to the database
2. **Thumbnail Salesforce sync failed**: The thumbnail was uploaded to S3 successfully but Salesforce record creation failed

---

## Problem Analysis

### Issue 1: Tags Lost After Upload

**Current Flow:**
```text
┌──────────────────┐     ┌────────────────────────┐     ┌─────────────────────────┐
│ AI Analysis      │ ──▶ │ Form Fields Updated    │ ──▶ │ upload-master-to-s3     │
│ (Button Click)   │     │ (tags, description)    │     │ Edge Function           │
└──────────────────┘     └────────────────────────┘     └─────────────────────────┘
                                                                    │
                                                                    ▼
                                                        ┌─────────────────────────┐
                                                        │ INSERT media_assets     │
                                                        │ (no tags column!)       │
                                                        └─────────────────────────┘
                                                                    │
                                                                    ▼
                                                        ┌─────────────────────────┐
                                                        │ Tags sent to Salesforce │
                                                        │ (ri1__Categories__c)    │
                                                        └─────────────────────────┘
                                                                    │
                                                                    ▼
                                                        ┌─────────────────────────┐
                                                        │ Background: auto-tag    │
                                                        │ (may fail/overwrite)    │
                                                        └─────────────────────────┘
```

**Root Cause:**
- The `media_assets` table has no `tags` column (tags are stored in `media_asset_tags` junction table)
- The `upload-master-to-s3` edge function receives tags but only:
  - Sends them to Salesforce
  - Triggers background auto-tagging
- It does **NOT** insert records into `media_asset_tags` table
- The background auto-tag runs its own AI analysis, ignoring the user's pre-approved tags

**Database:**
- The video exists: `1b874160-428d-4c0d-9b41-ed8d210ae53c`
- No rows exist in `media_asset_tags` for this asset
- Description was saved correctly to `media_assets.description`

### Issue 2: Thumbnail Salesforce Sync Failed

**Log Evidence:**
```
w2x-engine response body: ERROR creating the record!<pre></pre>
```

The S3 upload succeeded (CDN URL created), but the Salesforce record creation failed. This is likely a missing picklist value or field issue on the Salesforce side, not a code bug.

---

## Solution

### Fix 1: Save Pre-Upload Tags to Database

**File:** `supabase/functions/upload-master-to-s3/index.ts`

After creating the `media_assets` record, add logic to:
1. Create tag records in `media_tags` if they don't exist
2. Create junction records in `media_asset_tags` linking the asset to tags

```typescript
// After line 274 (after media_assets insert)
// === SAVE USER-PROVIDED TAGS ===
if (tags && tags.length > 0) {
  console.log("Saving user-provided tags:", tags);
  
  for (const tagName of tags) {
    // Find or create tag
    let tagId: string;
    const { data: existingTag } = await supabase
      .from('media_tags')
      .select('id')
      .ilike('name', tagName)
      .maybeSingle();
    
    if (existingTag) {
      tagId = existingTag.id;
    } else {
      // Create new tag with default color
      const { data: newTag, error: tagError } = await supabase
        .from('media_tags')
        .insert({ name: tagName, color: '#6366f1' })
        .select('id')
        .single();
      
      if (tagError) {
        console.warn(`Failed to create tag "${tagName}":`, tagError);
        continue;
      }
      tagId = newTag.id;
    }
    
    // Create junction record
    await supabase
      .from('media_asset_tags')
      .upsert({
        media_asset_id: assetData.id,
        tag_id: tagId
      });
  }
  console.log(`Saved ${tags.length} tags to database`);
}
```

### Fix 2: Store Tags in Asset Metadata as Backup

Also store the raw tag strings in metadata for easier debugging:

```typescript
// Update initialMetadata (around line 233)
const initialMetadata = {
  // ... existing fields
  userProvidedTags: tags || [],  // Store for debugging/backup
};
```

### Fix 3: Skip Redundant Auto-Tag for Pre-Analyzed Assets

Modify the auto-tag background call to skip if tags were already provided:

```typescript
// Around line 445 - only auto-tag if no tags provided
if (!tags || tags.length === 0) {
  console.log("No user tags provided, triggering auto-tagging...");
  EdgeRuntime.waitUntil(
    fetch(autoTagUrl, { ... })
  );
} else {
  console.log("User provided tags, skipping auto-tagging");
}
```

---

## Thumbnail Issue (Investigation)

The Salesforce error is external to this codebase. Possible causes:
- Missing required field in `create-video-thumbnail` FormData
- Picklist validation failure (similar to CREATED_BY_SYNC issue earlier)

Recommend checking Salesforce setup for the `ri1__Content__c` object to ensure all required fields are populated.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/upload-master-to-s3/index.ts` | Add tag persistence to `media_asset_tags` table |

---

## Testing Checklist

After implementation:
- [ ] Upload a video with AI analysis enabled
- [ ] Verify tags appear in Media Library after upload
- [ ] Search for the video using tag keywords
- [ ] Confirm tags show in the Details drawer

---

## Technical Notes

The `media_tags` table already contains many tags from the Salesforce picklists (Promotional, Intense, Race Track, etc.), so many AI-suggested tags will match existing records rather than creating duplicates.
