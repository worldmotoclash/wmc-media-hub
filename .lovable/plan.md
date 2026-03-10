

# Add Content Intent Field as Workflow Driver

## Overview

Add `ri1__Content_Intent__c` as a top-level classification field across the cataloging system, SFDC sync, and media asset details. This is the first step — the field itself, its picklist, defaults, and sync. Workflow automation (auto-playlists, prompt templates, distribution rules) will be a follow-up phase.

## Content Intent Values

```
RACE_HIGHLIGHT | INTERVIEW | PROMO | SPONSOR_AD | BEHIND_THE_SCENES
SOCIAL_CLIP | ANNOUNCEMENT | TUTORIAL | CROWD_MOMENT | TRACK_ACTION
```

## Changes

### 1. Add to Salesforce field constants
**File**: `src/constants/salesforceFields.ts`

- Add `CONTENT_INTENTS` array with the 10 values above
- Add `ContentIntent` type
- Add to `SalesforceFieldDefaults` interface with default `'PROMO'`
- Add to `GLOBAL_DEFAULTS` and `CONTEXT_DEFAULTS` (e.g., social context defaults to `SOCIAL_CLIP`)
- Add human-readable labels to `FIELD_LABELS` (e.g., `'RACE_HIGHLIGHT': 'Race Highlight'`)

### 2. Add Content Intent selector to catalog form
**File**: `src/components/media/ContentCatalogForm.tsx`

- Import `CONTENT_INTENTS`
- Add a `Select` dropdown for Content Intent in the **primary fields section** (not hidden in Advanced) — this is the top-level classification and should be prominent, placed right after Natural Name

### 3. Add to media_assets metadata
**No schema change needed** — Content Intent will be stored in the existing `metadata` JSONB column as `metadata.contentIntent`. This avoids a migration and keeps it flexible.

### 4. Sync Content Intent to Salesforce
**File**: `supabase/functions/sync-asset-to-salesforce/index.ts`

- Add `contentIntent` to `SfdcSyncMetadata` interface
- In `createSalesforceRecord`, append `string_ri1__Content_Intent__c` from metadata
- In the asset processing loop, read `assetMetadata.contentIntent` into `syncMetadata`

### 5. Display Content Intent in asset details drawer
**File**: `src/components/media/MediaAssetDetailsDrawer.tsx`

- Show Content Intent as a prominent badge/field in the details section (read-only when not editing, selectable when editing)

### 6. Add intent-based prompt templates (data only)
**File**: `src/constants/intentPromptTemplates.ts` (new)

- Export a `Record<ContentIntent, { promptTemplate: string; suggestedPlaylist: string; channels: string[] }>` mapping each intent to its automation hints. This is data-only — no workflow execution yet, but it makes the mapping available for future automation.

## What This Does NOT Include (Future Phase)
- Automatic playlist assignment
- Auto-generated captions/descriptions based on intent
- Distribution channel automation
- AI analysis to auto-detect intent from content

These require deeper integration with the playlist system and AI pipelines and should be planned separately once the field is live and populated.

