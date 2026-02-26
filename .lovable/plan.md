

# Disable Browser Autocomplete on Search Input

The input already has `autoComplete="off"` but modern browsers (especially Chrome/Safari) often ignore this. The fix is to add additional attributes that more aggressively prevent autofill.

## Change

**`src/components/media/UnifiedMediaLibrary.tsx`** (line 608):
- Replace `autoComplete="off"` with `autoComplete="off"` plus `autoCorrect="off"`, `autoCapitalize="off"`, `spellCheck={false}`, and a non-standard `name` attribute like `name="media-search-nofill"` which prevents browsers from pattern-matching the field to saved form data.
- Additionally add `data-1p-ignore` and `data-lpignore="true"` to block password managers (1Password, LastPass) from offering suggestions.

## Files Modified

| File | Change |
|------|--------|
| `src/components/media/UnifiedMediaLibrary.tsx` | Add anti-autofill attributes to search input |

