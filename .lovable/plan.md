

# Make Media Upload UI Generic (Not Video-Specific)

## Changes in `src/pages/media/MediaUpload.tsx`

### 1. Line 1100 — URL label
Change `"Video URL (YouTube, Vimeo, etc.)"` → `"Media URL (YouTube, Vimeo, etc.)"`

### 2. Line 1269 — Title label
Change `"Video Title"` → `"Title"`

### 3. Line 1301 — Description placeholder
Change `"Describe the video content..."` → `"Describe the media content..."`

### 4. Line 1329 — Submit button
Change `"Upload & Process Video"` → `"Upload & Process Media"`

### 5. Line 1424 — Generation description placeholder
Change `"Describe the video content and context..."` → `"Describe the content and context..."`

All changes are label/placeholder text swaps in a single file. No logic changes.

