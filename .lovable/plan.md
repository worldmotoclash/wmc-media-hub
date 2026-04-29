## Goal

Make the "Open in browser" (ExternalLink) icon in the Media Library always open the asset on the `media.worldmotoclash.com` CDN in a new tab — for every asset type — and make it work reliably in the published app, not just preview.

## Why it currently fails on published

Two issues compound:

1. **Wrong URL for some asset types.** `asset.fileUrl` is not always a CDN URL:
   - Salesforce-synced assets use `ri__Content_URL__c`, which can be a YouTube link or a Real Intelligence redirect URL.
   - Some legacy rows store raw Wasabi S3 URLs instead of the `media.worldmotoclash.com/...` CDN URL.
   - YouTube/audio assets may have no usable file URL at all.
2. **`window.open` in production is fragile.** Stricter popup blockers and cross-origin redirects on the published domain can silently swallow `window.open(url, '_blank')` calls. A real `<a target="_blank" rel="noopener noreferrer">` click is the reliable cross-browser pattern.

## Changes

### 1. Add a CDN URL resolver (in `src/services/unifiedMediaService.ts`)

Export a small helper:

```ts
export const CDN_BASE = 'https://media.worldmotoclash.com';

export function getCdnUrl(asset: { s3Key?: string | null; fileUrl?: string | null }): string | null {
  // Prefer s3_key → canonical CDN URL
  if (asset.s3Key) {
    const key = asset.s3Key.replace(/^\/+/, '');
    return `${CDN_BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
  // If fileUrl is already CDN, return as-is
  if (asset.fileUrl) {
    try {
      const u = new URL(asset.fileUrl);
      if (u.hostname === 'media.worldmotoclash.com') return asset.fileUrl;
      // Re-host raw Wasabi URLs to the CDN
      if (u.hostname.endsWith('.wasabisys.com')) {
        // Path is "/<bucket>/<key>" or "/<key>" — strip leading bucket if present
        const parts = u.pathname.replace(/^\/+/, '').split('/');
        const key = parts.slice(1).join('/') || parts.join('/');
        return `${CDN_BASE}/${key}`;
      }
    } catch { /* fall through */ }
  }
  return null;
}
```

This guarantees: if there's any binary stored in S3 for the asset, we return a `media.worldmotoclash.com/...` URL.

### 2. Use it in `UnifiedMediaLibrary.tsx`

For both the grid view (around line 1689) and the list view (around line 1976) ExternalLink buttons:

- Compute `const cdnUrl = getCdnUrl(asset);`
- Only render the button when `cdnUrl` is truthy.
- Replace the `<Button onClick={() => window.open(...)}>` with a real anchor styled as a button:

```tsx
{cdnUrl && (
  <Button asChild size="sm" variant="outline" title="Open file in new tab">
    <a href={cdnUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
      <ExternalLink className="w-3 h-3" />
    </a>
  </Button>
)}
```

The shadcn `Button asChild` pattern renders the anchor with button styling, which:
- Bypasses popup blockers (it's a true user-initiated navigation).
- Works identically in preview and published.
- Gives users middle-click / right-click → "Copy link address" affordances.

### 3. Edge cases handled

- **YouTube-only assets** (no `s3Key`, `fileUrl` is a `youtube.com` URL): the button is hidden — opening the View Details drawer remains the way to interact with them. (We do not redirect YouTube traffic through the CDN.)
- **Raw Wasabi URLs** in legacy rows: rewritten to the CDN host.
- **Salesforce redirect URLs** without an `s3Key`: button is hidden (those URLs require auth and don't represent a downloadable file).
- **Variant cards / thumbnails**: unchanged (they already use the same `asset` shape and will benefit automatically if/when we wire the helper into other ExternalLink usages — out of scope for this change).

## Files to edit

- `src/services/unifiedMediaService.ts` — add `getCdnUrl` helper + `CDN_BASE` export.
- `src/components/media/UnifiedMediaLibrary.tsx` — import `getCdnUrl`; replace both `window.open` ExternalLink buttons (grid view ~L1689–1700, list view ~L1976–1987) with the anchor-as-button pattern; hide the button when there's no CDN URL.

## Out of scope

- The "View Master in SFDC" link (line 1786) — that intentionally points to Lightning, not the CDN.
- ExternalLink usage in `RecentActivity.tsx` / other components — we can apply the same pattern there in a follow-up if you want.
