
# Fix: Show Actual Upload Date Instead of Database Creation Date

## The Problem
The "Created" column in the media library list view shows the same date (2/4/2026) for all assets because it displays when the database record was created during S3 scanning, not when the file was actually uploaded.

## The Solution
Use the `metadata.last_modified` field (the actual S3 file date) instead of `created_at`. This field contains the real upload/modification date of the file (e.g., `2025-10-01T20:13:40.000Z`).

## Changes Required

### File: `src/components/media/UnifiedMediaLibrary.tsx`

**1. Update Column Header (line ~1544-1556)**
Change "Created" to "Uploaded" for clarity:
```typescript
<TableHead>
  <div className="flex items-center gap-1">
    Uploaded  // Changed from "Created"
    ...
  </div>
</TableHead>
```

**2. Update List View Date Display (line ~1663-1664)**
Use `metadata.last_modified` with fallback to `createdAt`:
```typescript
<TableCell className="text-sm text-muted-foreground">
  {(() => {
    // Prefer last_modified from S3 metadata (actual file date)
    const dateStr = asset.metadata?.last_modified || asset.createdAt;
    return !isNaN(Date.parse(dateStr)) 
      ? new Date(dateStr).toLocaleDateString() 
      : 'Unknown';
  })()}
</TableCell>
```

**3. Update Grid View Date Display (line ~1314)**
Apply the same logic for consistency in grid view:
```typescript
<span>
  Uploaded: {(() => {
    const dateStr = asset.metadata?.last_modified || asset.createdAt;
    return !isNaN(Date.parse(dateStr)) 
      ? new Date(dateStr).toLocaleDateString() 
      : 'Unknown';
  })()}
</span>
```

## Expected Result
- Audio files will show their actual S3 last_modified dates (e.g., `10/1/2025`)
- Files without metadata.last_modified will fall back to the database created_at
- Column header says "Uploaded" which better reflects what the date means

## Technical Notes
- The `metadata.last_modified` is populated by the S3 scanning function from AWS/Wasabi's file metadata
- This approach requires no database changes - just display logic
- Both grid and list views will be updated for consistency
