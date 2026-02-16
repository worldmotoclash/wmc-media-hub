

# Progressive Web App (PWA) for WMC Media Hub

## What This Does
Turns the Media Hub into an installable app on iPhone (and Android). Users can add it to their home screen from Safari, and it will open full-screen like a native app -- no browser bar, faster loads, and direct access to the Camera Roll via the file picker.

## What You'll Experience
- On iPhone Safari, a banner or prompt will appear suggesting "Add to Home Screen"
- Once installed, the app opens full-screen with your WMC icon
- The bulk upload page works with the native iOS photo picker (tap to select from Camera Roll)
- Pages you've visited load faster thanks to caching
- On Mac, Chrome will show an install icon in the address bar

## Technical Details

### 1. Install `vite-plugin-pwa` (dev dependency)
Add `vite-plugin-pwa` to the project. This handles manifest generation, service worker creation, and asset caching automatically.

### 2. Update `vite.config.ts`
Add the `VitePWA` plugin with:
- App name: "WMC Media Hub"
- Theme color matching the brand
- `generateSW` strategy (zero-config service worker)
- Cache all JS, CSS, HTML, and image assets
- Navigation fallback to `index.html` (required for SPA routing)
- Register type: `autoUpdate` (silently updates in background)

### 3. Create PWA icons
Generate required icon sizes from the existing `wmc-opengraph-image.png`:
- `pwa-192x192.png` (required)
- `pwa-512x512.png` (required)
- `apple-touch-icon-180x180.png` (for iOS home screen)

These will be placed in the `public/` directory. Initially we'll use placeholder-sized versions of the existing logo; you can replace them with properly cropped icons later.

### 4. Update `index.html`
Add required meta tags:
- `<meta name="theme-color">` for browser chrome color
- `<link rel="apple-touch-icon">` for iOS home screen icon
- `<meta name="apple-mobile-web-app-capable" content="yes">` for full-screen mode on iOS
- `<meta name="apple-mobile-web-app-status-bar-style">` for status bar appearance

### 5. Update `BulkUploadTab.tsx` (mobile optimization + cleanup)
- Import `useIsMobile()` hook
- On mobile: show a large "Select from Camera Roll" button instead of drag-and-drop messaging
- On desktop: add a tip about Image Capture limitation
- Remove the temporary `console.log` debug statements from `handleDrop`
- Keep the global drag listeners (they help with Finder drops)

### 6. Create iOS install prompt component
A new `src/components/PWAInstallPrompt.tsx` component that:
- Detects if running on iOS Safari and not already installed
- Shows a dismissable banner explaining how to "Add to Home Screen"
- Uses `localStorage` to remember dismissal so it doesn't keep appearing

### Files Changed
| File | Action |
|------|--------|
| `package.json` | Add `vite-plugin-pwa` dev dependency |
| `vite.config.ts` | Add VitePWA plugin configuration |
| `index.html` | Add PWA meta tags and apple-touch-icon link |
| `public/pwa-192x192.png` | New icon file |
| `public/pwa-512x512.png` | New icon file |
| `public/apple-touch-icon-180x180.png` | New icon file |
| `src/components/media/BulkUploadTab.tsx` | Mobile-optimized UI, remove debug logs |
| `src/components/PWAInstallPrompt.tsx` | New iOS install prompt component |
| `src/App.tsx` | Add PWAInstallPrompt to app layout |

### No backend changes required
The PWA is entirely a frontend feature. All existing Supabase edge functions and database tables remain unchanged.

