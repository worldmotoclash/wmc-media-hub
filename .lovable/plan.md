# Make User Guide Searchable + Add Release Notes Page

## 1. Searchable User Guide

Add a search bar to the User Guide header that filters sections in real-time.

### How it works

- Add a search input in the header bar (next to the Print/PDF button)
- Convert `UserGuide` to use state: `searchQuery` string
- Pass `searchQuery` down to each `GuideSection` / `RoleCategoryHeader`
- When a query is active, hide sections whose title/content text doesn't match (case-insensitive)
- Highlight matching text within visible sections using a `<mark>` wrapper
- Clear button to reset search; show "No results" message when nothing matches
- TOC items also filter to only show matching sections

### Files to edit


| File                                   | Change                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/pages/media/UserGuide.tsx`        | Add search state, search input in header, pass query to sections, filter `tocItems`         |
| `src/components/docs/GuideSection.tsx` | Accept optional `searchQuery` prop, hide sections that don't match, highlight matching text |
| `src/components/docs/GuideTOC.tsx`     | Accept optional `filteredIds` prop to only show matching TOC entries                        |


---

## 2. Release Notes Page

Create a dedicated Release Notes page listing new features by date. Available from the USer guide.

### Data structure

- New file `src/data/releaseNotes.ts` with a typed array of releases:
  ```ts
  interface ReleaseNote {
    version: string;       // e.g. "1.4.0"
    date: string;          // e.g. "Mar 13, 2026"
    title: string;         // e.g. "Tag Deduplication & AI Rename"
    highlights: string[];  // bullet points
    category: 'feature' | 'improvement' | 'fix';
  }
  ```
- Seed with recent features (tag dedup, AI rename, bulk delete, etc.)

### Page: `src/pages/media/ReleaseNotes.tsx`

- Header with back nav (same style as UserGuide)
- Timeline-style layout: each release is a card with version badge, date, title, and bullet list
- Category filter chips (Feature / Improvement / Fix)
- Link from Media Hub dashboard and User Guide

### Routing & Navigation

- Add route `/admin/media/releases` in `App.tsx`
- Add a "What's New" link/card in the Media Hub ActionCards or header

### Files to create/edit


| File                                   | Change                                    |
| -------------------------------------- | ----------------------------------------- |
| `src/data/releaseNotes.ts`             | New — release data + types                |
| `src/pages/media/ReleaseNotes.tsx`     | New — release notes page                  |
| `src/App.tsx`                          | Add route for `/admin/media/releases`     |
| `src/components/media/ActionCards.tsx` | Add "What's New" card linking to releases |
