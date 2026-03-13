export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  highlights: string[];
  category: 'feature' | 'improvement' | 'fix';
}

export const releaseNotes: ReleaseNote[] = [
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
