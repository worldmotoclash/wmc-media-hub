

# Access Control: Block Users Without Media Hub Permission

## What Changes
When a user logs in with correct credentials but has a blank `mediahubaccess` field in Salesforce, they will be shown a clear message explaining it's a permissions issue (not a credentials problem). The login attempt will be recorded as "Access Denied - No Media Hub Permission" in Portal Logins.

## Technical Changes

### File 1: `src/services/loginService.ts`

**1. Fix blank mediahubaccess defaulting to 'Viewer' (line 176)**

Currently, `fetchMemberByEmail` defaults blank `mediahubaccess` to `'Viewer'`:
```typescript
mediahubaccess: memberElement.getElementsByTagName('mediahubaccess')[0]?.textContent || 'Viewer'
```
Change to preserve blank values:
```typescript
mediahubaccess: memberElement.getElementsByTagName('mediahubaccess')[0]?.textContent || ''
```

**2. Add access check in `authenticateUser` (after password validation, ~line 448)**

After password is validated and IP check passes, but before building the user object, add:
```typescript
// Check if user has Media Hub access permission
const rawAccess = investor.mediahubaccess?.trim() || '';
if (!rawAccess || !['Admin', 'Editor', 'Viewer'].includes(rawAccess)) {
  // Track the denied access attempt
  await trackLogin(investor.id, "Access Denied - No Media Hub Permission");
  throw new Error('NO_MEDIA_HUB_ACCESS');
}
```

### File 2: `src/components/LoginFormComponent.tsx`

**1. Add state for access denied dialog**
```typescript
const [accessDeniedOpen, setAccessDeniedOpen] = useState(false);
```

**2. Handle the new error in both `handleSubmit` and `performAutoLogin`**

In the catch blocks, add handling for `NO_MEDIA_HUB_ACCESS`:
```typescript
if (error.message === 'NO_MEDIA_HUB_ACCESS') {
  setAccessDeniedOpen(true);
}
```

**3. Add Access Denied Dialog to the JSX**

A clean dialog popup explaining:
- Their credentials were verified successfully
- They don't currently have Media Hub access permissions
- They should contact media@worldmotoclash.com for access

```html
<Dialog open={accessDeniedOpen} onOpenChange={setAccessDeniedOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Access Not Authorized</DialogTitle>
      <DialogDescription>
        Your credentials were verified, but your account does not currently 
        have Media Hub access. Please contact us to request access.
      </DialogDescription>
    </DialogHeader>
    <div className="flex justify-end gap-2 mt-4">
      <a href="mailto:media@worldmotoclash.com?subject=Media Hub Access Request">
        <Button>Request Access</Button>
      </a>
      <Button variant="outline" onClick={() => setAccessDeniedOpen(false)}>Close</Button>
    </div>
  </DialogContent>
</Dialog>
```

## Login Flow Summary

```text
User enters credentials
  |
  +--> Email not found?        --> "Email not found" error toast
  |
  +--> Wrong password?         --> "Invalid password" error toast
  |
  +--> IP mismatch?            --> Verification email sent
  |
  +--> mediahubaccess blank?   --> Dialog: "Credentials verified but no access"
  |                                + Track "Access Denied - No Media Hub Permission"
  |
  +--> All checks pass         --> Login successful
                                   + Track "Login"
```

## Portal Login Tracking
- Successful login: tracked as **"Login"** (existing)
- Access denied due to no permission: tracked as **"Access Denied - No Media Hub Permission"** (new)
- This uses the existing `trackLogin` function which posts to the Salesforce Portal object

