

# Implement SFDC Sync Governance Rules

## Overview
Update the `sync-asset-to-salesforce` edge function to enforce mandatory governance rules: **Approval Status = "Pending"** and **System Flags = "CREATED_BY_SYNC"** for all newly created Salesforce records.

---

## Current State Analysis

The `createSalesforceRecord` function (lines 92-192) currently:
- Sets basic fields: Name, Content_Type, URL
- Populates AI metadata: prompts, models, visual anchors, etc.
- Links to creator Contact if provided

**Missing fields that must be added:**
1. `ri1__Content_Approved__c` → Must always be `"Pending"`
2. `ri1__Content_System_Flags__c` → Must always be `"CREATED_BY_SYNC"`

---

## Changes Required

### File: `supabase/functions/sync-asset-to-salesforce/index.ts`

#### 1. Add Governance Constants (after line 11)
```typescript
// Governance constants - HARD RULES
const SYNC_APPROVAL_STATUS = "Pending";
const SYNC_SYSTEM_FLAG = "CREATED_BY_SYNC";
```

#### 2. Update `createSalesforceRecord` Function (after line 106)
Add the two required governance fields to the FormData:

```typescript
// GOVERNANCE: Sync-created records are ALWAYS Pending
formData.append("string_ri1__Content_Approved__c", SYNC_APPROVAL_STATUS);

// GOVERNANCE: Flag records created by automated sync
formData.append("string_ri1__Content_System_Flags__c", SYNC_SYSTEM_FLAG);
```

#### 3. Update Logging (around line 167)
Add governance fields to the logged metadata for debugging:

```typescript
console.log("SFDC sync metadata fields:", {
  // ... existing fields ...
  approvalStatus: SYNC_APPROVAL_STATUS,  // Always "Pending"
  systemFlags: SYNC_SYSTEM_FLAG,         // Always "CREATED_BY_SYNC"
});
```

#### 4. Update Local Database Metadata (lines 391-400)
Include the governance flags in the local metadata for UI display:

```typescript
metadata: {
  ...asset.metadata,
  sfdcSyncStatus: 'success',
  sfdcSyncedAt: new Date().toISOString(),
  sfdcApprovalStatus: SYNC_APPROVAL_STATUS,
  sfdcSystemFlags: SYNC_SYSTEM_FLAG,
}
```

---

## Technical Details

### Why These Specific Field Names?
- `string_ri1__Content_Approved__c` - Picklist field in Salesforce for approval workflow
- `string_ri1__Content_System_Flags__c` - Text field for pipe-delimited system flags

### When Rules Apply
| Scenario | Set Approval? | Set Flag? |
|----------|--------------|-----------|
| New record created | ✅ "Pending" | ✅ "CREATED_BY_SYNC" |
| Existing record found | ❌ No change | ❌ No change |
| Record update later | ❌ Not applicable | ❌ Append only if needed |

### Edge Cases Handled
- **Existing records:** The function already skips modification if `salesforce_id` exists (line 263-272)
- **Found via URL match:** Only links the ID, doesn't modify the Salesforce record (line 286-313)
- **New records only:** Governance fields are set only in `createSalesforceRecord`

---

## Validation Checklist

After implementation:
- [ ] New sync-created records have `Content_Approved__c = "Pending"`
- [ ] New sync-created records have `Content_System_Flags__c = "CREATED_BY_SYNC"`
- [ ] Existing Salesforce records are NOT modified
- [ ] Local metadata includes governance tracking
- [ ] Logs show governance fields for debugging

---

## Files to Modify
| File | Changes |
|------|---------|
| `supabase/functions/sync-asset-to-salesforce/index.ts` | Add governance constants and FormData fields |

---

## Future Considerations
- UI can display "Pending · Created by Sync" badge using `sfdcApprovalStatus` from metadata
- Flag field supports future extensions: `CREATED_BY_SYNC|AI_METADATA_ATTACHED`
- Librarian approval workflow can filter on `Content_System_Flags__c`

