import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  Upload, 
  Sparkles, 
  Scissors, 
  ListVideo, 
  PlaySquare, 
  Layers,
  Users,
  Database,
  Lock,
  Image,
  Video,
  Palette,
  Grid3X3,
  Download,
  Settings,
  Tag,
  Search,
  CheckCircle,
  Zap,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
  FolderOpen,
  Share2,
  ExternalLink,
  Camera,
  Wand2,
  LayoutGrid,
  Monitor,
  Smartphone,
  FileImage,
  Film,
  Trash2,
  Edit,
  Plus,
  Filter,
  SortAsc,
  Calendar,
  Link as LinkIcon,
  CloudUpload,
  HardDrive,
  Shield,
  Key,
  Globe,
  Gauge,
  Target,
  Lightbulb,
  Workflow,
  MousePointer,
  Copy,
  Save,
  UserCheck,
  UserCog,
  UserCircle,
  Crown,
  Music,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GuideTOC } from '@/components/docs/GuideTOC';
import { 
  GuideSection, 
  GuideSubSection, 
  GuideStep, 
  GuideTip, 
  GuideTable,
  RoleCategoryHeader
} from '@/components/docs/GuideSection';

const tocItems = [
  // For Everyone
  { id: 'for-everyone', title: 'For Everyone', isCategory: true, role: 'everyone' as const },
  { id: 'getting-started', title: 'Getting Started' },
  { id: 'dashboard', title: 'Dashboard Overview' },
  { id: 'permissions', title: 'Permissions Matrix' },
  
  // Viewer
  { id: 'for-viewers', title: 'For Viewers', isCategory: true, role: 'viewer' as const },
  { id: 'browsing-assets', title: 'Browsing Assets' },
  { id: 'viewing-content', title: 'Viewing Content' },
  { id: 'downloading', title: 'Downloading Assets' },
  
  // Editor
  { id: 'for-editors', title: 'For Editors', isCategory: true, role: 'editor' as const },
  { id: 'ai-generation', title: 'AI Content Generation' },
  { id: 'media-upload', title: 'Upload Media' },
  { id: 'style-lock', title: 'Style Lock Feature' },
  { id: 'grid-templates', title: '3x3 Grid Templates' },
  { id: 'social-kit', title: 'Social Kit' },
  { id: 'asset-management', title: 'Asset Management' },
  { id: 'scene-detection', title: 'Scene Detection' },
  { id: 'playlist-manager', title: 'Playlist Manager' },
  { id: 'model-marketplace', title: 'Model Marketplace' },
  { id: 'character-library', title: 'Character Library' },
  { id: 'librarian-workflow', title: 'Librarian Workflow' },
  
  // Admin
  { id: 'for-admins', title: 'For Admins', isCategory: true, role: 'admin' as const },
  { id: 's3-configuration', title: 'S3 Bucket Configuration' },
  { id: 'salesforce', title: 'Salesforce Integration' },
  { id: 'system-management', title: 'System Management' },
];

const UserGuide: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border print:static print:border-none">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/media">
              <Button variant="ghost" size="sm" className="print:hidden">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Media Hub
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">WMC Media Hub User Guide</h1>
                <p className="text-xs text-muted-foreground">Role-Based Documentation • Last updated: January 2025</p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="print:hidden"
            onClick={() => window.print()}
          >
            <Download className="w-4 h-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Table of Contents */}
          <GuideTOC items={tocItems} />

          {/* Content */}
          <main className="flex-1 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Hero */}
              <div className="mb-12 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Welcome to the WMC Media Hub
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  This guide is organized by user role to help you quickly find the features relevant to your access level.
                  Select your role below or browse all sections.
                </p>
                
                {/* Role Quick Links */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <a href="#for-everyone" className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors">
                    <UserCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">Everyone</div>
                    <div className="text-xs text-muted-foreground">Basic navigation & overview</div>
                  </a>
                  <a href="#for-viewers" className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors">
                    <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                    <div className="font-semibold text-blue-600 dark:text-blue-400">Viewer</div>
                    <div className="text-xs text-muted-foreground">Browse & download content</div>
                  </a>
                  <a href="#for-editors" className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors">
                    <Edit className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" />
                    <div className="font-semibold text-amber-600 dark:text-amber-400">Editor</div>
                    <div className="text-xs text-muted-foreground">Create & manage content</div>
                  </a>
                  <a href="#for-admins" className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                    <Crown className="w-6 h-6 text-red-600 dark:text-red-400 mb-2" />
                    <div className="font-semibold text-red-600 dark:text-red-400">Admin</div>
                    <div className="text-xs text-muted-foreground">System configuration</div>
                  </a>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                    <div className="text-2xl font-bold text-primary">4</div>
                    <div className="text-sm text-muted-foreground">Role Sections</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                    <div className="text-2xl font-bold text-primary">6+</div>
                    <div className="text-sm text-muted-foreground">AI Models</div>
                  </div>
                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                    <div className="text-2xl font-bold text-primary">10</div>
                    <div className="text-sm text-muted-foreground">Social Platforms</div>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* FOR EVERYONE SECTION */}
              {/* ============================================================ */}
              <RoleCategoryHeader
                id="for-everyone"
                title="For Everyone"
                role="everyone"
                icon={UserCircle}
                description="Essential information for all Media Hub users, regardless of your access level. Start here to learn the basics."
              />

              {/* Getting Started */}
              <GuideSection id="getting-started" title="Getting Started" icon={BookOpen} role="everyone">
                <p className="text-muted-foreground mb-6">
                  The WMC Media Hub is your central platform for managing, generating, and distributing 
                  racing content across all channels. Whether you need to create AI-generated promotional 
                  images, process video footage, or manage your media library, the Media Hub provides 
                  all the tools you need in one place.
                </p>

                <GuideSubSection title="System Requirements">
                  <p className="text-muted-foreground mb-4">
                    The Media Hub is a web-based application that works in any modern browser:
                  </p>
                  <GuideTable
                    headers={['Requirement', 'Recommended', 'Minimum']}
                    rows={[
                      ['Browser', 'Chrome 100+, Safari 16+, Edge 100+', 'Any modern browser'],
                      ['Screen Resolution', '1920×1080 or higher', '1366×768'],
                      ['Internet Connection', 'Broadband (25+ Mbps)', 'Stable connection (5+ Mbps)'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Accessing the Media Hub">
                  <GuideStep number={1} title="Navigate to Media Hub">
                    Visit <code className="bg-muted px-2 py-1 rounded text-sm">/admin/media</code> from 
                    your browser, or click "Media Hub" from the main navigation menu.
                  </GuideStep>
                  <GuideStep number={2} title="Dashboard Overview">
                    Upon loading, you'll see the main dashboard with action cards for each feature area.
                  </GuideStep>
                  <GuideStep number={3} title="Check Your Access Level">
                    Your available features depend on your role (Viewer, Editor, or Admin). 
                    Check the permissions matrix below to understand what you can do.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="note">
                  <strong>Auto-Save vs Manual Save:</strong> Most operations save automatically. However, these require explicit saving:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>S3 Bucket Configuration</strong> - Click "Save" after testing connection (Admin only)</li>
                    <li><strong>Character Library</strong> - Click "Save Character" when adding/editing (Editor+)</li>
                    <li><strong>Playlist Reordering</strong> - Click "Save Order" after drag-and-drop (Editor+)</li>
                    <li><strong>Librarian Workflow</strong> - Click "Save Changes" or "Approve & Save" (Editor+)</li>
                  </ul>
                </GuideTip>
              </GuideSection>

              {/* Dashboard Overview */}
              <GuideSection id="dashboard" title="Dashboard Overview" icon={PlaySquare} role="everyone">
                <p className="text-muted-foreground mb-6">
                  The Media Hub Dashboard is your command center for all media operations. It provides 
                  quick access to features through intuitive action cards (visibility based on your role).
                </p>

                <GuideSubSection title="Dashboard Layout">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-sm">1</span>
                      </div>
                      <div>
                        <div className="font-medium">Header Navigation</div>
                        <div className="text-sm text-muted-foreground">
                          Main title, back navigation, and quick access to settings and user menu.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-sm">2</span>
                      </div>
                      <div>
                        <div className="font-medium">Action Cards Grid</div>
                        <div className="text-sm text-muted-foreground">
                          Clickable cards for each feature. Cards shown depend on your access level.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-sm">3</span>
                      </div>
                      <div>
                        <div className="font-medium">Recent Activity Feed</div>
                        <div className="text-sm text-muted-foreground">
                          Shows recent uploads, generations, and edits with timestamps.
                        </div>
                      </div>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use keyboard shortcuts for faster navigation: <code className="bg-muted px-1 rounded">G</code> for Generate, 
                  <code className="bg-muted px-1 rounded ml-1">U</code> for Upload, <code className="bg-muted px-1 rounded ml-1">L</code> for Library.
                </GuideTip>
              </GuideSection>

              {/* Permissions Matrix */}
              <GuideSection id="permissions" title="Permissions Matrix" icon={Shield} role="everyone">
                <p className="text-muted-foreground mb-6">
                  This table shows what each role can access. Your role determines which features 
                  appear in your dashboard and what actions you can perform.
                </p>

                <GuideTable
                  headers={['Feature', 'Viewer', 'Editor', 'Admin']}
                  rows={[
                    ['Browse Asset Library', '✓', '✓', '✓'],
                    ['Search & Filter Assets', '✓', '✓', '✓'],
                    ['View/Preview Content', '✓', '✓', '✓'],
                    ['Download Approved Assets', '✓', '✓', '✓'],
                    ['View Playlists', '✓', '✓', '✓'],
                    ['Generate AI Images', '—', '✓', '✓'],
                    ['Generate AI Videos', '—', '✓', '✓'],
                    ['Upload Content', '—', '✓', '✓'],
                    ['Use Social Kit', '—', '✓', '✓'],
                    ['Edit Tags & Metadata', '—', '✓', '✓'],
                    ['Create Characters', '—', '✓', '✓'],
                    ['Scene Detection', '—', '✓', '✓'],
                    ['Manage Playlists', '—', '✓', '✓'],
                    ['Librarian Workflow', '—', '✓', '✓'],
                    ['Set Default Models', '—', '✓', '✓'],
                    ['S3 Bucket Configuration', '—', '—', '✓'],
                    ['Salesforce Settings', '—', '—', '✓'],
                    ['View Sync Status', '—', '—', '✓'],
                    ['System Management', '—', '—', '✓'],
                  ]}
                />

                <GuideTip type="note">
                  If you need access to features beyond your current role, contact your system administrator.
                </GuideTip>
              </GuideSection>

              {/* ============================================================ */}
              {/* FOR VIEWERS SECTION */}
              {/* ============================================================ */}
              <RoleCategoryHeader
                id="for-viewers"
                title="For Viewers"
                role="viewer"
                icon={Eye}
                description="Read-only access to browse, view, and download approved content from the Media Hub."
              />

              {/* Browsing Assets */}
              <GuideSection id="browsing-assets" title="Browsing Assets" icon={FolderOpen} role="viewer">
                <p className="text-muted-foreground mb-6">
                  The Asset Library is your window into all media content. As a Viewer, you can browse, 
                  search, and filter assets to find exactly what you need.
                </p>

                <GuideSubSection title="Library Interface">
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Search Bar</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Full-text search across titles, descriptions, tags, and metadata.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Filter className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Filter Panel</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Filter by asset type, source, date range, tags, and status.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <SortAsc className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Sort Options</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sort by date, title, file size, or relevance.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <LayoutGrid className="w-4 h-4 text-primary" />
                        <span className="font-semibold">View Modes</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Switch between grid (thumbnails) and list view.
                      </p>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Asset Sources">
                  <GuideTable
                    headers={['Source', 'Badge', 'Description']}
                    rows={[
                      ['S3 Bucket', 's3_bucket', 'Assets stored in configured S3 buckets'],
                      ['Salesforce', 'salesforce', 'Content managed in Salesforce'],
                      ['Generated', 'generated', 'AI-generated images and videos'],
                      ['Local Upload', 'local_upload', 'Files uploaded directly'],
                      ['YouTube', 'youtube', 'YouTube video references'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Filtering by 3×3 Grid Masters">
                  <p className="text-muted-foreground mb-4">
                    When you generate images using 3×3 grid templates, the resulting master images are tagged 
                    with <code className="bg-muted px-2 py-1 rounded text-sm">generation_master</code>. 
                    You can quickly filter the library to show only these grid masters:
                  </p>
                  <GuideStep number={1} title="Open the Filter Panel">
                    Click the <strong>Filter</strong> button at the top of the Asset Library.
                  </GuideStep>
                  <GuideStep number={2} title="Select 'Grid Master' Filter">
                    Look for the "Asset Type" or "Tags" filter and select <strong>generation_master</strong> 
                    to display only 3×3 grid master images.
                  </GuideStep>
                  <GuideStep number={3} title="View Results">
                    The library will update to show only your generated 3×3 grid images, each containing 
                    9 panels with consistent characters/scenes that can be extracted individually.
                  </GuideStep>
                  <GuideTip type="tip">
                    <Grid3X3 className="w-4 h-4 inline mr-1" />
                    Grid masters are perfect for creating storyboards, social media sequences, or 
                    extracting individual frames for different platforms. Each of the 9 panels can be 
                    extracted using the "Extract Grid Image" feature.
                  </GuideTip>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use the search bar with multiple keywords to narrow results. For example: "COTA 2024 podium".
                </GuideTip>
              </GuideSection>

              {/* Viewing Content */}
              <GuideSection id="viewing-content" title="Viewing Content" icon={Eye} role="viewer">
                <p className="text-muted-foreground mb-6">
                  Preview images and videos directly in the Media Hub without downloading.
                </p>

                <GuideSubSection title="Preview Features">
                  <GuideStep number={1} title="Quick Preview">
                    Hover over any asset thumbnail to see a quick preview tooltip.
                  </GuideStep>
                  <GuideStep number={2} title="Full Preview">
                    Click on an asset to open the full preview modal with:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>High-resolution image view or video player</li>
                      <li>Asset metadata (title, description, tags)</li>
                      <li>File details (size, dimensions, format)</li>
                      <li>Source and creation information</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={3} title="Navigate">
                    Use arrow keys or navigation buttons to move between assets in the preview.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Video Playback">
                  <p className="text-muted-foreground mb-4">
                    For video assets, the preview includes:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Play/pause controls</li>
                    <li>Volume adjustment</li>
                    <li>Progress bar with seeking</li>
                    <li>Fullscreen mode</li>
                    <li>Playback speed control</li>
                  </ul>
                </GuideSubSection>
              </GuideSection>

              {/* Downloading Assets */}
              <GuideSection id="downloading" title="Downloading Assets" icon={Download} role="viewer">
                <p className="text-muted-foreground mb-6">
                  Download approved assets for use in your projects. Only approved content is available for download.
                </p>

                <GuideSubSection title="Download Options">
                  <GuideTable
                    headers={['Method', 'How To', 'Best For']}
                    rows={[
                      ['Single Download', 'Click download icon on asset card', 'Individual files'],
                      ['Preview Download', 'Click download in preview modal', 'After reviewing'],
                      ['Copy URL', 'Click link icon to copy direct URL', 'Sharing or embedding'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="note">
                  Assets marked as "Pending Review" or "Rejected" are not available for download. 
                  Only approved content can be downloaded by Viewers.
                </GuideTip>
              </GuideSection>

              {/* ============================================================ */}
              {/* FOR EDITORS SECTION */}
              {/* ============================================================ */}
              <RoleCategoryHeader
                id="for-editors"
                title="For Editors"
                role="editor"
                icon={Edit}
                description="Content creation and management capabilities. Editors can generate AI content, upload media, manage assets, and more."
                includesRoles={['viewer']}
              />

              {/* AI Generation */}
              <GuideSection id="ai-generation" title="AI Content Generation" icon={Sparkles} role="editor">
                <p className="text-muted-foreground mb-6">
                  Create stunning racing images and videos using state-of-the-art AI models. From quick social media 
                  posts to high-quality promotional materials.
                </p>

                <GuideSubSection title="Image Generation Models">
                  <GuideTable
                    headers={['Model', 'Speed', 'Quality', 'Cost', 'Best For']}
                    rows={[
                      ['Gemini (Free)', '⚡ 5-10 sec', '⭐⭐⭐', 'Free', 'Quick drafts, testing prompts'],
                      ['Flux Schnell', '⚡⚡ 2-5 sec', '⭐⭐⭐', 'Low', 'Fast iterations, social media'],
                      ['Flux Dev', '🐢 15-30 sec', '⭐⭐⭐⭐⭐', 'Medium', 'High-quality promo images'],
                      ['Flux Pro', '🐢 20-40 sec', '⭐⭐⭐⭐⭐', 'Higher', 'Premium marketing, print'],
                      ['Flux 3x3 Grid', '🐢 30-60 sec', '⭐⭐⭐⭐', 'Medium', 'Exploring 9 variations'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Image Generation Workflow">
                  <GuideStep number={1} title="Select Output Type">
                    Choose "Image" in the output toggle.
                  </GuideStep>
                  <GuideStep number={2} title="Add Reference Image (Optional)">
                    Upload, select from library, or paste a URL.
                  </GuideStep>
                  <GuideStep number={3} title="Write Your Prompt">
                    Be specific about subject, style, lighting, composition, and mood.
                  </GuideStep>
                  <GuideStep number={4} title="Select AI Model">
                    Choose based on your speed/quality needs.
                  </GuideStep>
                  <GuideStep number={5} title="Generate & Review">
                    Click Generate, wait for completion, then download or send to Social Kit.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Example Prompts">
                  <div className="space-y-3 mb-4">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-xs text-primary font-medium mb-1">Action Shot</div>
                      <p className="text-sm text-foreground">
                        "Professional racing motorcycle leaning into a sharp corner on a sunlit track, 
                        motion blur on wheels, dramatic lighting, cinematic composition, 8K quality"
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-xs text-primary font-medium mb-1">Portrait</div>
                      <p className="text-sm text-foreground">
                        "Close-up portrait of a motorcycle racer removing helmet, determined expression, 
                        pit lane blurred in background, golden hour lighting"
                      </p>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Video Generation">
                  <GuideTable
                    headers={['Model', 'Duration', 'Resolution', 'Time', 'Best For']}
                    rows={[
                      ['Google VEO', '5-8 sec', 'Up to 1080p', '2-5 min', 'Cinematic clips'],
                      ['Wavespeed', '2-4 sec', 'Up to 720p', '30-90 sec', 'Quick social clips'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="tip">
                  For best results, be specific: Instead of "motorcycle racing", try "MotoGP motorcycle leaning 
                  at 60 degrees into a hairpin turn, rear tire slightly sliding".
                </GuideTip>

                <GuideTip type="warning">
                  Generation credits may apply. Gemini is free with daily limits. Premium models consume credits.
                </GuideTip>
              </GuideSection>

              {/* Style Lock */}
              <GuideSection id="style-lock" title="Style Lock Feature" icon={Lock} role="editor">
                <p className="text-muted-foreground mb-6">
                  Style Lock analyzes your reference image and maintains visual consistency across all generations, 
                  essential for brand-consistent content creation.
                </p>

                <GuideSubSection title="What Style Lock Captures">
                  <GuideTable
                    headers={['Aspect', 'Description', 'Example']}
                    rows={[
                      ['Color Palette', 'Dominant and accent colors', 'Red/black team colors'],
                      ['Lighting Style', 'Light direction, intensity, mood', 'Golden hour, dramatic shadows'],
                      ['Composition', 'Framing tendencies, perspective', 'Low angle, dynamic composition'],
                      ['Texture & Detail', 'Level of detail, surface quality', 'Gritty realism, smooth studio look'],
                      ['Atmosphere', 'Overall mood and feeling', 'High-energy action, calm elegance'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Using Style Lock">
                  <GuideStep number={1} title="Enable Style Lock">
                    Toggle "Style Lock" ON in the generation settings.
                  </GuideStep>
                  <GuideStep number={2} title="Upload Reference">
                    Add your reference image that defines the desired style.
                  </GuideStep>
                  <GuideStep number={3} title="Analyze">
                    Click "Analyze Style" to extract visual characteristics.
                  </GuideStep>
                  <GuideStep number={4} title="Generate">
                    Create new images that match the analyzed style.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use Style Lock when creating campaign content that needs to match existing brand materials.
                </GuideTip>
              </GuideSection>

              {/* 3x3 Grid Templates */}
              <GuideSection id="grid-templates" title="3x3 Grid Templates" icon={Grid3X3} role="editor">
                <p className="text-muted-foreground mb-6">
                  Generate 9 variations in a single grid to explore creative directions efficiently. 
                  Each cell offers a different interpretation of your prompt.
                </p>

                <GuideSubSection title="How It Works">
                  <GuideStep number={1} title="Enable Grid Mode">
                    Select "Flux 3x3 Grid" as your model.
                  </GuideStep>
                  <GuideStep number={2} title="Write Your Prompt">
                    Describe the general concept; the AI creates 9 variations.
                  </GuideStep>
                  <GuideStep number={3} title="Generate">
                    Wait 30-60 seconds for the complete grid.
                  </GuideStep>
                  <GuideStep number={4} title="Extract Favorites">
                    Click any cell to extract it as a full-resolution image.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use grids for exploration, then extract and refine winners with Style Lock.
                </GuideTip>
              </GuideSection>

              {/* Social Kit */}
              <GuideSection id="social-kit" title="Social Kit" icon={Layers} role="editor">
                <p className="text-muted-foreground mb-6">
                  Generate platform-optimized image variants from a single master image. AI intelligently 
                  adapts content while maintaining visual quality and subject focus.
                </p>

                <GuideSubSection title="Supported Platforms">
                  <GuideTable
                    headers={['Platform', 'Variant', 'Dimensions', 'Use Case']}
                    rows={[
                      ['Instagram', 'Square Post', '1080 × 1080', 'Feed posts, carousel'],
                      ['Instagram', 'Story/Reel', '1080 × 1920', 'Stories, Reels'],
                      ['Facebook', 'Post', '1200 × 630', 'Link previews'],
                      ['Twitter/X', 'Post', '1200 × 675', 'Tweet images'],
                      ['LinkedIn', 'Post', '1200 × 627', 'Article previews'],
                      ['YouTube', 'Thumbnail', '1280 × 720', 'Video thumbnails'],
                      ['TikTok', 'Cover', '1080 × 1920', 'Video covers'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Workflow">
                  <GuideStep number={1} title="Upload Master Image">
                    Use a high-quality image (2000×2000px+ recommended).
                  </GuideStep>
                  <GuideStep number={2} title="Select Platforms">
                    Check which variants you need.
                  </GuideStep>
                  <GuideStep number={3} title="Generate">
                    AI creates optimized variants (1-3 minutes).
                  </GuideStep>
                  <GuideStep number={4} title="Download">
                    Download individually or as a ZIP bundle.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Keep main subjects centered in master images for best results across all crops.
                </GuideTip>
              </GuideSection>

              {/* Unified Media Upload */}
              <GuideSection id="media-upload" title="Upload Media" icon={Upload} role="editor">
                <p className="text-muted-foreground mb-6">
                  Upload video, images, and audio files through a single unified interface. 
                  AI-powered analysis provides automatic tagging and metadata suggestions for all media types.
                </p>

                <GuideSubSection title="Supported File Types">
                  <GuideTable
                    headers={['Media Type', 'Formats', 'Max Size', 'AI Analysis']}
                    rows={[
                      ['Video', 'MP4, WebM, MOV, AVI, M4V', '500MB', 'Frame extraction → Visual AI'],
                      ['Image', 'JPEG, PNG, WebP, GIF', '50MB', 'Direct visual AI analysis'],
                      ['Audio', 'MP3, M4A, WAV, AAC, FLAC, OGG', '100MB', 'Filename-based classification'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Upload Workflow">
                  <GuideStep number={1} title="Select or Drop File">
                    Drag and drop a file into the upload zone, or click to browse. The interface automatically 
                    detects the media type and shows appropriate options.
                  </GuideStep>
                  <GuideStep number={2} title="AI Analysis (Recommended)">
                    Click "Analyze with AI" to get automatic suggestions:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li><strong>Video:</strong> Extracts a representative frame for visual analysis</li>
                      <li><strong>Images:</strong> Analyzes the image directly for content, scene, and mood</li>
                      <li><strong>Audio:</strong> Classifies based on filename and metadata patterns</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={3} title="Review & Edit Metadata">
                    Review AI suggestions for title, description, and tags. Edit as needed.
                  </GuideStep>
                  <GuideStep number={4} title="Upload to Library">
                    Click "Upload" to save the file to S3 and create the media asset record.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Podcast Classification">
                  <p className="text-muted-foreground mb-4">
                    When uploading audio files, you can classify content as a podcast episode:
                  </p>
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Mic className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Podcast Toggle</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enable "This is a podcast episode" to automatically tag the audio with 
                      podcast-specific metadata. This helps organize podcast content separately 
                      from other audio files like sound effects or music tracks.
                    </p>
                  </div>
                  <GuideTip type="tip">
                    Podcast classification improves AI tagging accuracy by focusing on interview, 
                    commentary, and episode-related categories.
                  </GuideTip>
                </GuideSubSection>

                <GuideSubSection title="Audio Duration Extraction">
                  <p className="text-muted-foreground mb-4">
                    For both video and audio files, the system automatically extracts duration 
                    metadata before upload. This information is stored alongside the asset and 
                    synced to Salesforce.
                  </p>
                </GuideSubSection>

                <GuideTip type="note">
                  Uploaded content is automatically synced to Salesforce after successful upload. 
                  Check the asset details for sync status.
                </GuideTip>
              </GuideSection>

              {/* Asset Management */}
              <GuideSection id="asset-management" title="Asset Management" icon={FolderOpen} role="editor">
                <p className="text-muted-foreground mb-6">
                  Full editing capabilities for the Asset Library. Add, edit, tag, and organize content.
                </p>

                <GuideSubSection title="Editor Capabilities">
                  <GuideTable
                    headers={['Action', 'Description', 'How To']}
                    rows={[
                      ['Upload Content', 'Add video, images, or audio', 'Click Upload or drag-and-drop'],
                      ['Edit Metadata', 'Update title, description', 'Click edit icon on asset'],
                      ['Manage Tags', 'Add or remove tags', 'In edit mode or quick-tag button'],
                      ['Bulk Actions', 'Apply actions to multiple assets', 'Select multiple, use toolbar'],
                      ['Delete Assets', 'Remove unwanted content', 'Click delete (requires confirmation)'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Tagging Best Practices">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Do</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Use consistent naming (e.g., "race-cota")</li>
                        <li>Include year and event tags</li>
                        <li>Tag by content type (action, portrait)</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                      <div className="font-semibold text-red-700 dark:text-red-400 mb-2">Avoid</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Inconsistent naming ("COTA" vs "Austin")</li>
                        <li>Too many similar tags</li>
                        <li>Overly generic tags</li>
                      </ul>
                    </div>
                  </div>
                </GuideSubSection>
              </GuideSection>

              {/* Scene Detection */}
              <GuideSection id="scene-detection" title="Scene Detection" icon={Scissors} role="editor">
                <p className="text-muted-foreground mb-6">
                  Automatically analyze videos to identify scene changes and extract thumbnails. 
                  Perfect for highlight reels, chapter markers, and thumbnail generation.
                </p>

                <GuideSubSection title="Workflow">
                  <GuideStep number={1} title="Select Video">
                    Choose a video from the library or upload new.
                  </GuideStep>
                  <GuideStep number={2} title="Set Threshold">
                    Adjust sensitivity (lower = more scenes detected).
                  </GuideStep>
                  <GuideStep number={3} title="Process">
                    AI analyzes and identifies scene boundaries.
                  </GuideStep>
                  <GuideStep number={4} title="Review & Export">
                    Preview scenes, select best thumbnails, export clips.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Start with medium threshold (0.3) and adjust based on results. Racing footage may need lower values.
                </GuideTip>
              </GuideSection>

              {/* Playlist Manager */}
              <GuideSection id="playlist-manager" title="Playlist Manager" icon={ListVideo} role="editor">
                <p className="text-muted-foreground mb-6">
                  Create and manage video playlists synced with Salesforce for organized content distribution.
                </p>

                <GuideSubSection title="Managing Playlists">
                  <GuideTable
                    headers={['Action', 'Description']}
                    rows={[
                      ['View Playlists', 'Browse all available playlists'],
                      ['Add Videos', 'Drag videos into playlists'],
                      ['Reorder', 'Drag-and-drop to change order'],
                      ['Remove Videos', 'Click remove icon on playlist item'],
                      ['Preview', 'Play videos directly in the manager'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="note">
                  Remember to click "Save Order" after reordering playlist items.
                </GuideTip>
              </GuideSection>

              {/* Model Marketplace */}
              <GuideSection id="model-marketplace" title="Model Marketplace" icon={Wand2} role="editor">
                <p className="text-muted-foreground mb-6">
                  Explore available AI models, compare capabilities, and set your default preferences.
                </p>

                <GuideSubSection title="Model Selection Guide">
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <h4 className="font-semibold text-foreground mb-3">Quick Decision Guide</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Need it fast?</strong> → Flux Schnell (images) or Wavespeed (video)</p>
                      <p><strong>Need it free?</strong> → Gemini (has daily limits)</p>
                      <p><strong>Need top quality?</strong> → Flux Pro (images) or Google VEO (video)</p>
                      <p><strong>Need options?</strong> → Flux 3x3 Grid for 9 variations</p>
                      <p><strong>Need balance?</strong> → Flux Dev (good quality, reasonable speed)</p>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideTip type="tip">
                  Set Flux Schnell as your default for everyday use, switch to Flux Dev/Pro for final production images.
                </GuideTip>
              </GuideSection>

              {/* Character Library */}
              <GuideSection id="character-library" title="Character Library" icon={Users} role="editor">
                <p className="text-muted-foreground mb-6">
                  Create and manage reusable subjects (riders, vehicles, locations) for consistent AI generation.
                </p>

                <GuideSubSection title="Character Types">
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Users className="w-6 h-6 text-primary mb-2" />
                      <div className="font-semibold">Person</div>
                      <div className="text-sm text-muted-foreground">
                        Riders, team members, personalities.
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Zap className="w-6 h-6 text-primary mb-2" />
                      <div className="font-semibold">Vehicle</div>
                      <div className="text-sm text-muted-foreground">
                        Motorcycles, team vehicles, equipment.
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Globe className="w-6 h-6 text-primary mb-2" />
                      <div className="font-semibold">Location</div>
                      <div className="text-sm text-muted-foreground">
                        Tracks, venues, signature corners.
                      </div>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Creating a Character">
                  <GuideStep number={1} title="Click Add Character">
                    Open the creation form.
                  </GuideStep>
                  <GuideStep number={2} title="Select Type">
                    Choose Person, Vehicle, Group, Location, Object, or Style.
                  </GuideStep>
                  <GuideStep number={3} title="Upload Reference">
                    Provide a clear, high-quality image.
                  </GuideStep>
                  <GuideStep number={4} title="Add Details">
                    Name, description, and tags.
                  </GuideStep>
                  <GuideStep number={5} title="Save">
                    Click "Save Character" (manual save required).
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use high-quality, well-lit reference images. Front-facing, neutral expressions work best for people.
                </GuideTip>
              </GuideSection>

              {/* Librarian Workflow */}
              <GuideSection id="librarian-workflow" title="Librarian Workflow" icon={Workflow} role="editor">
                <p className="text-muted-foreground mb-6">
                  Review and approve pending content to ensure quality and proper organization.
                  The Librarian workflow is accessed per-asset, not as a separate mode.
                </p>

                <GuideSubSection title="How to Access">
                  <p className="text-muted-foreground mb-4">
                    The Librarian workflow opens when you click <strong>"Review"</strong> on any asset with <strong>pending</strong> status:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li><strong>Grid View:</strong> Look for the "Review" button (tag icon) on pending asset cards</li>
                    <li><strong>List View:</strong> Click the tag icon in the actions column</li>
                  </ul>
                </GuideSubSection>

                <GuideSubSection title="Workflow Steps">
                  <GuideStep number={1} title="Find Pending Assets">
                    In the Asset Library, filter by status "Pending" or look for assets with pending badges.
                  </GuideStep>
                  <GuideStep number={2} title="Click Review">
                    Click the "Review" button on the asset card to open the Librarian dialog.
                  </GuideStep>
                  <GuideStep number={3} title="Review & Tag Tab">
                    Preview the asset and update its status (Pending, Approved, Rejected). Add or manage tags.
                  </GuideStep>
                  <GuideStep number={4} title="Metadata Tab">
                    Edit title and description if needed.
                  </GuideStep>
                  <GuideStep number={5} title="Link to SFDC Tab">
                    Optionally link the asset to Salesforce playlists and categories.
                  </GuideStep>
                  <GuideStep number={6} title="Save Changes">
                    Click "Save Changes" to apply updates (manual save required).
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="note">
                  Rejected assets are hidden from normal views but not deleted. They can be reviewed again later.
                </GuideTip>
              </GuideSection>

              {/* ============================================================ */}
              {/* FOR ADMINS SECTION */}
              {/* ============================================================ */}
              <RoleCategoryHeader
                id="for-admins"
                title="For Admins"
                role="admin"
                icon={Crown}
                description="Full system access including storage configuration, Salesforce integration, and system management."
                includesRoles={['viewer', 'editor']}
              />

              {/* S3 Configuration */}
              <GuideSection id="s3-configuration" title="S3 Bucket Configuration" icon={Database} role="admin">
                <p className="text-muted-foreground mb-6">
                  Configure and manage S3 (or S3-compatible) storage buckets for media assets.
                </p>

                <GuideSubSection title="Adding a New Bucket">
                  <GuideStep number={1} title="Open Configuration">
                    Asset Library → Settings → Configure S3 Buckets.
                  </GuideStep>
                  <GuideStep number={2} title="Click Add Bucket">
                    Open the bucket configuration form.
                  </GuideStep>
                  <GuideStep number={3} title="Enter Details">
                    Display name, bucket name, endpoint URL, region, credentials.
                  </GuideStep>
                  <GuideStep number={4} title="Test Connection">
                    Verify credentials before saving.
                  </GuideStep>
                  <GuideStep number={5} title="Save">
                    Click "Save" (manual save required).
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Configuration Fields">
                  <GuideTable
                    headers={['Field', 'Required', 'Description']}
                    rows={[
                      ['Display Name', 'Yes', 'Friendly name for the UI'],
                      ['Bucket Name', 'Yes', 'Actual S3 bucket name'],
                      ['Endpoint URL', 'Yes', 'S3 service endpoint'],
                      ['Region', 'Yes', 'AWS region code'],
                      ['Access Key ID', 'Yes', 'AWS IAM access key'],
                      ['Secret Access Key', 'Yes', 'AWS IAM secret key'],
                      ['CDN Base URL', 'No', 'CloudFront or CDN URL'],
                      ['Scan Frequency', 'No', 'Auto-scan interval (hours)'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="S3-Compatible Services">
                  <GuideTable
                    headers={['Service', 'Endpoint Format']}
                    rows={[
                      ['Amazon S3', 'https://s3.{region}.amazonaws.com'],
                      ['DigitalOcean Spaces', 'https://{region}.digitaloceanspaces.com'],
                      ['Backblaze B2', 'https://s3.{region}.backblazeb2.com'],
                      ['Cloudflare R2', 'https://{account-id}.r2.cloudflarestorage.com'],
                      ['MinIO', 'https://{your-server}:9000'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Supported Media Files for Scanning">
                  <p className="text-muted-foreground mb-4">
                    When scanning S3 buckets, the system automatically indexes the following file types:
                  </p>
                  <GuideTable
                    headers={['Media Type', 'Extensions']}
                    rows={[
                      ['Video', 'mp4, m4v, mov, avi, webm, mkv, wmv, flv'],
                      ['Image', 'jpg, jpeg, png, gif, webp, bmp, tiff, svg, avif'],
                      ['Audio', 'mp3, wav, aac, flac, ogg, m4a, wma, aiff, alac, ape'],
                    ]}
                  />
                  <GuideTip type="note">
                    <Music className="w-4 h-4 inline mr-1" />
                    Audio file support was added in Version 4.0. Rescan existing buckets to index 
                    previously-uploaded audio files like podcasts and interviews.
                  </GuideTip>
                </GuideSubSection>

                <GuideTip type="warning">
                  S3 credentials are stored encrypted. Never share credentials or include in code.
                </GuideTip>

                <GuideTip type="tip">
                  Use CDN Base URL (CloudFront) to reduce latency and S3 request costs.
                </GuideTip>
              </GuideSection>

              {/* Salesforce Integration */}
              <GuideSection id="salesforce" title="Salesforce Integration" icon={Database} role="admin">
                <p className="text-muted-foreground mb-6">
                  The Media Hub is deeply integrated with Salesforce, providing seamless 
                  synchronization of all media assets, metadata, and relationships.
                </p>

                <GuideSubSection title="What Gets Synced">
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4">
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>All uploaded images and videos</li>
                      <li>AI-generated content with prompts and settings</li>
                      <li>Social Kit variants with master-variant relationships</li>
                      <li>Scene detection results and thumbnails</li>
                      <li>Tags, descriptions, and metadata</li>
                      <li>Approval status and workflow states</li>
                    </ul>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Sync Status">
                  <GuideTable
                    headers={['Status', 'Meaning', 'Action']}
                    rows={[
                      ['Synced ✓', 'Asset is current in Salesforce', 'No action needed'],
                      ['Pending', 'Sync in progress', 'Wait a few moments'],
                      ['Failed', 'Sync encountered an error', 'Check connection, retry sync'],
                      ['Not Synced', 'Asset not yet synced', 'Manually trigger or wait for auto-sync'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="note">
                  Content syncs automatically within 1-2 minutes of creation or modification.
                </GuideTip>

                <GuideTip type="warning">
                  Deleting an asset in Media Hub will also remove it from Salesforce after sync.
                </GuideTip>
              </GuideSection>

              {/* System Management */}
              <GuideSection id="system-management" title="System Management" icon={Settings} role="admin">
                <p className="text-muted-foreground mb-6">
                  Monitor system health, manage sync operations, and access advanced settings.
                </p>

                <GuideSubSection title="Admin Capabilities">
                  <GuideTable
                    headers={['Area', 'Description']}
                    rows={[
                      ['Sync Monitoring', 'View and manage Salesforce sync status'],
                      ['Error Handling', 'Identify and resolve failed syncs'],
                      ['Storage Management', 'Monitor S3 bucket usage and health'],
                      ['User Overview', 'View user activity and access levels'],
                      ['Default Settings', 'Set system-wide default preferences'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Troubleshooting Common Issues">
                  <GuideTable
                    headers={['Issue', 'Likely Cause', 'Solution']}
                    rows={[
                      ['Failed Salesforce Sync', 'Connection or permission issue', 'Check credentials, manually retry'],
                      ['S3 Access Denied', 'Invalid credentials or IAM', 'Verify access key and permissions'],
                      ['Slow Performance', 'Large file processing', 'Check bucket scan status, wait for completion'],
                      ['Missing Assets', 'Not yet scanned', 'Trigger manual bucket scan'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="tip">
                  Use Salesforce reports to analyze media library: generation volume, content by creator, assets by tag.
                </GuideTip>
              </GuideSection>

              {/* Footer */}
              <div className="mt-16 pt-8 border-t border-border text-center text-muted-foreground">
                <p className="mb-2 text-lg font-semibold text-foreground">Need More Help?</p>
                <p className="mb-6">
                  Questions or feedback? Contact the WMC development team for assistance.
                </p>
                <div className="flex justify-center gap-4">
                  <Link to="/admin/media">
                    <Button>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Media Hub
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Download className="w-4 h-4 mr-2" />
                    Print This Guide
                  </Button>
                </div>
                <p className="mt-8 text-xs text-muted-foreground">
                  Last updated: January 2025 • Version 4.0 (Role-Based with Unified Media Upload)
                </p>
              </div>
            </motion.div>
          </main>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:static { position: static !important; }
          .print\\:border-none { border: none !important; }
          body { font-size: 11pt; }
          h1 { font-size: 22pt; }
          h2 { font-size: 16pt; page-break-after: avoid; }
          h3 { font-size: 13pt; page-break-after: avoid; }
          section { page-break-inside: avoid; }
          .prose { max-width: 100%; }
          table { font-size: 9pt; }
          .grid { display: block; }
          .grid > div { margin-bottom: 0.5rem; }
        }
      `}</style>
    </div>
  );
};

export default UserGuide;