

# Add Aspect Ratio Filter as Picklist

## Changes

### File 1: `src/services/unifiedMediaService.ts` — `SearchFilters` interface (~line 96)

Add `aspectRatio?: string` field after `moods`.

### File 2: `src/services/unifiedMediaService.ts` — `fetchAllMediaAssets` (~line 224, after moods filter)

Add filter logic:
```typescript
if (filters?.aspectRatio) {
  query = query.eq('metadata->sfdcAnalysis->>aspectRatio', filters.aspectRatio);
}
```

### File 3: `src/components/media/UnifiedMediaLibrary.tsx` — After the Asset Type filter block (~line 858)

Add an "Aspect Ratio" picklist using the `Select` component, placed directly below the Asset Type section:

```tsx
{/* Aspect Ratio Filter */}
<div className="space-y-2 mt-3">
  <label className="text-sm font-medium block">Aspect Ratio</label>
  <Select
    value={filters.aspectRatio || 'all'}
    onValueChange={(v) => handleFilterChange('aspectRatio', v === 'all' ? undefined : v)}
  >
    <SelectTrigger className="h-8 text-sm">
      <SelectValue placeholder="All ratios" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All</SelectItem>
      {ASPECT_RATIOS.map(r => (
        <SelectItem key={r} value={r}>{r.replace('x', ':')}</SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

Import `ASPECT_RATIOS` from `@/constants/salesforceFields`.

### File 4: `src/components/media/UnifiedMediaLibrary.tsx` — `clearAllFilters` and active filter count

Include `aspectRatio: undefined` in the clear-all logic and count it in the active filter badge.

