

# Make Salesforce IDs Clickable Links

## What
Turn the Salesforce ID text in two locations into clickable links that open the record in Salesforce at `https://worldmotoclash.my.salesforce.com/{id}`.

## Changes

### 1. `src/components/media/MediaAssetDetailsDrawer.tsx` (line 354)
Change the static text `ID: {localSalesforceId}` to a clickable link:
```tsx
<a href={`https://worldmotoclash.my.salesforce.com/${localSalesforceId}`}
   target="_blank" rel="noopener noreferrer"
   className="text-xs text-blue-400 hover:text-blue-300 underline">
  ID: {localSalesforceId}
</a>
```

### 2. `src/components/media/VideoPreviewModal.tsx` (line 185)
Change `Salesforce ID: {video.id}` to a clickable link:
```tsx
<span>Salesforce ID: <a href={`https://worldmotoclash.my.salesforce.com/${video.id}`}
  target="_blank" rel="noopener noreferrer"
  className="text-blue-400 hover:text-blue-300 underline">{video.id}</a></span>
```

Two files, 2 lines changed.

