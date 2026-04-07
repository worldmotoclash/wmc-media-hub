export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  category: 'feature' | 'improvement' | 'fix';
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '2.3.0',
    date: 'Apr 7, 2026',
    title: 'Clickable Salesforce IDs & Post-Sync Polling',
    highlights: [
      'Salesforce IDs in asset details and video preview are now clickable links that open the record in Salesforce',
      'After syncing to SFDC, the UI polls for the asynchronously-resolved Salesforce ID and displays it automatically',
      'Album dropdown lists are now sorted alphabetically (case-insensitive) across the entire Media Hub',
    ],
    category: 'feature',
  },
  {
    version: '2.2.0',
    date: 'Apr 1, 2026',
    title: 'Salesforce Metadata Sync & Description Push',
    highlights: [
      'Editing title, description, or tags now pushes updates to Salesforce fields automatically',
      'Diagnostic logging added to confirm description values reach the w2x-engine endpoint',
      'Fixed async SFDC ID backfill flow so IDs resolve reliably after record creation',
    ],
    category: 'feature',
  },
  {
    version: '2.1.0',
    date: 'Mar 25, 2026',
    title: 'Improved SFDC Sync & Status Mapping',
    highlights: [
      'Asset status now maps to Salesforce approval field (Pending / Approved / Rejected)',
      'Fixed w2x-engine redirect handling — 302 responses are correctly detected as success',
      'Status badge colors updated for better readability in both light and dark modes',
      'Status dropdown editing UX improved with instant local feedback',
    ],
    category: 'improvement',
  },
  {
    version: '2.0.0',
    date: 'Mar 18, 2026',
    title: 'Auto-Sync to Salesforce & Manual Sync Button',
    highlights: [
      'New uploads are automatically synced to Salesforce on creation',
      'Manual "Sync to SFDC" button added to asset details for unsynced assets',
      'S3 scan deduplication prevents duplicate media_asset records on re-scan',
      'Fixed S3 path resolution and orphan cleanup edge cases',
    ],
    category: 'feature',
  },
  {
    version: '1.8.0',
    date: 'Mar 15, 2026',
    title: 'Album Sorting & Orphan Cleanup Improvements',
    highlights: [
      'Added sort toggle for albums (alphabetical vs. newest first)',
      'Empty albums are now automatically removed during cleanup',
      'Orphan deletion payloads fixed for reliable S3 + Salesforce cleanup',
      'Salesforce health audit function added to detect sync mismatches',
    ],
    category: 'improvement',
  },
  {
    version: '1.7.0',
    date: 'Mar 13, 2026',
    title: 'Complete Delete: S3 + Salesforce Cleanup',
    highlights: [
      'Deleting an asset now removes the file from Wasabi/S3 and the Salesforce ri1__Content__c record',
      'Salesforce deletion uses the w2x-engine delete action for consistency with other integrations',
      'All protected Media Hub pages (Scene Detection, Social Kit, Characters, User Guide, Release Notes) now require login',
    ],
    category: 'feature',
  },
  {
    version: '1.6.0',
    date: 'Mar 13, 2026',
    title: 'Searchable User Guide & Release Notes',
    highlights: [
      'User Guide now has a real-time search bar that filters sections and highlights matching text',
      'Added this dedicated Release Notes page to track new features and improvements',
      'What\'s New button added to User Guide header for quick access',
    ],
    category: 'feature',
  },
  {
    version: '1.5.0',
    date: 'Mar 10, 2026',
    title: 'Delete Capability for Editors & Admins',
    highlights: [
      'Editors and Admins can now delete individual assets from the details drawer',
      'Bulk delete available from the selection bar with confirmation dialog',
      'Permission-guarded: Viewers cannot see delete controls',
    ],
    category: 'feature',
  },
  {
    version: '1.4.0',
    date: 'Mar 5, 2026',
    title: 'Tag Deduplication & AI Rename',
    highlights: [
      'Duplicate tags are now automatically detected and merged',
      'AI-powered bulk rename for media assets based on content analysis',
      'Tag-based filtering added to Media Library filter drawer',
    ],
    category: 'improvement',
  },
  {
    version: '1.3.0',
    date: 'Feb 25, 2026',
    title: 'Content Diary with Salesforce Sync',
    highlights: [
      'Daily content diary tracks all uploads with automatic date grouping',
      'One-click sync of diary entries to Salesforce records',
      'Weekly summary view for content production reporting',
    ],
    category: 'feature',
  },
  {
    version: '1.2.0',
    date: 'Feb 15, 2026',
    title: 'Social Kit Generator',
    highlights: [
      'Generate platform-specific image variants from master images',
      'Supports 10+ social platforms with correct dimensions',
      'Batch generation with progress tracking',
    ],
    category: 'feature',
  },
  {
    version: '1.1.0',
    date: 'Feb 5, 2026',
    title: 'Scene Detection & Playlist Manager',
    highlights: [
      'Automatic scene detection for uploaded videos with adjustable sensitivity',
      'Playlist management with drag-and-drop reordering',
      'Salesforce playlist sync for video content distribution',
    ],
    category: 'feature',
  },
  {
    version: '1.0.1',
    date: 'Jan 28, 2026',
    title: 'Library Performance & Bug Fixes',
    highlights: [
      'Improved asset library loading speed with pagination',
      'Fixed thumbnail generation for large video files',
      'Resolved search indexing delay for newly uploaded assets',
    ],
    category: 'fix',
  },
  {
    version: '1.0.0',
    date: 'Jan 15, 2026',
    title: 'WMC Media Hub Launch',
    highlights: [
      'Unified media library with S3 bucket integration',
      'AI image and video generation with multiple model support',
      'Role-based access control (Viewer, Editor, Admin)',
      'Character library for consistent AI-generated content',
      'Comprehensive user guide with role-based documentation',
    ],
    category: 'feature',
  },
];
