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
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GuideTOC } from '@/components/docs/GuideTOC';
import { 
  GuideSection, 
  GuideSubSection, 
  GuideStep, 
  GuideTip, 
  GuideTable 
} from '@/components/docs/GuideSection';

const tocItems = [
  { id: 'getting-started', title: '1. Getting Started' },
  { id: 'dashboard', title: '2. Media Hub Dashboard' },
  { id: 'ai-generation', title: '3. AI Content Generation' },
  { id: 'style-lock', title: '4. Style Lock Feature' },
  { id: 'grid-templates', title: '5. 3x3 Grid Templates' },
  { id: 'social-kit', title: '6. Social Kit' },
  { id: 'asset-library', title: '7. Asset Library' },
  { id: 's3-configuration', title: '8. S3 Bucket Configuration' },
  { id: 'scene-detection', title: '9. Scene Detection' },
  { id: 'playlist-manager', title: '10. Playlist Manager' },
  { id: 'model-marketplace', title: '11. Model Marketplace' },
  { id: 'character-library', title: '12. Character Library' },
  { id: 'salesforce', title: '13. Salesforce Integration' },
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
                <p className="text-xs text-muted-foreground">Last updated: December 2024</p>
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
                  This comprehensive guide will help you master all features of the World Moto Clash 
                  Media Hub, from AI content generation to Salesforce integration. The Media Hub is your 
                  central platform for creating, managing, and distributing high-quality racing content 
                  across all channels.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="secondary">AI Generation</Badge>
                  <Badge variant="secondary">Social Kit</Badge>
                  <Badge variant="secondary">Asset Management</Badge>
                  <Badge variant="secondary">Scene Detection</Badge>
                  <Badge variant="secondary">Salesforce Sync</Badge>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 rounded-lg bg-background/50 border border-border">
                    <div className="text-2xl font-bold text-primary">13</div>
                    <div className="text-sm text-muted-foreground">Feature Sections</div>
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

              {/* ==================== SECTION 1: GETTING STARTED ==================== */}
              <GuideSection id="getting-started" title="Getting Started" icon={BookOpen}>
                <p className="text-muted-foreground mb-6">
                  The WMC Media Hub is your central platform for managing, generating, and distributing 
                  racing content across all channels. Whether you need to create AI-generated promotional 
                  images, process video footage, or manage your media library, the Media Hub provides 
                  all the tools you need in one place.
                </p>

                <GuideSubSection title="System Requirements">
                  <p className="text-muted-foreground mb-4">
                    The Media Hub is a web-based application that works in any modern browser. For the 
                    best experience, we recommend:
                  </p>
                  <GuideTable
                    headers={['Requirement', 'Recommended', 'Minimum']}
                    rows={[
                      ['Browser', 'Chrome 100+, Safari 16+, Edge 100+', 'Any modern browser'],
                      ['Screen Resolution', '1920×1080 or higher', '1366×768'],
                      ['Internet Connection', 'Broadband (25+ Mbps)', 'Stable connection (5+ Mbps)'],
                      ['For Video Upload', '50+ Mbps for large files', '10+ Mbps'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Accessing the Media Hub">
                  <GuideStep number={1} title="Navigate to Media Hub">
                    Visit <code className="bg-muted px-2 py-1 rounded text-sm">/admin/media</code> from 
                    your browser, or click "Media Hub" from the main navigation menu. You can also 
                    bookmark this URL for quick access.
                  </GuideStep>
                  <GuideStep number={2} title="Dashboard Overview">
                    Upon loading, you will see the main dashboard with action cards for each feature area. 
                    The dashboard provides quick access to all major functions including content generation, 
                    library management, and analytics.
                  </GuideStep>
                  <GuideStep number={3} title="Choose Your Task">
                    Click on any action card to access that specific feature. Each card displays an icon, 
                    title, and brief description to help you find the right tool for your task.
                  </GuideStep>
                  <GuideStep number={4} title="Navigation">
                    Use the sidebar or top navigation to move between different sections. You can always 
                    return to the main dashboard by clicking "Media Hub" in the navigation.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="User Interface Overview">
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <LayoutGrid className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Action Cards</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Large clickable cards on the dashboard that take you to specific features. 
                        Each card shows the feature name, icon, and a brief description.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Monitor className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Preview Panel</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Many features include a live preview panel where you can see your content 
                        before saving or generating.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Settings & Configuration</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Access system settings, S3 bucket configuration, and default preferences 
                        from the settings menu.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Recent Activity</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        View your recent uploads, generations, and modifications in the activity 
                        feed on the dashboard.
                      </p>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Quick Start Workflows">
                  <p className="text-muted-foreground mb-4">
                    Here are the most common tasks and how to accomplish them:
                  </p>
                  <GuideTable
                    headers={['Task', 'Where to Go', 'Time Required']}
                    rows={[
                      ['Create an AI image', 'Generate → Image tab', '30 seconds - 2 minutes'],
                      ['Generate social media variants', 'Social Kit', '1-3 minutes'],
                      ['Upload a video', 'Upload Video', '1-10 minutes (varies by size)'],
                      ['Find an existing asset', 'Asset Library', 'Instant with search'],
                      ['Detect scenes in video', 'Scene Detection', '2-5 minutes'],
                      ['Create a new character', 'Character Library', '2-3 minutes'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="tip">
                  Bookmark the Media Hub URL for quick access. All features are accessible from the 
                  main dashboard, and you can use the sidebar navigation to jump between sections quickly.
                </GuideTip>

                <GuideTip type="note">
                  Your work is automatically saved and synced to Salesforce. You do not need to manually 
                  save in most cases - the system handles this in the background.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 2: DASHBOARD ==================== */}
              <GuideSection id="dashboard" title="Media Hub Dashboard" icon={PlaySquare}>
                <p className="text-muted-foreground mb-6">
                  The Media Hub Dashboard is your command center for all media operations. It provides 
                  quick access to every feature through intuitive action cards, displays recent activity, 
                  and shows upload statistics to help you track your content creation.
                </p>

                <GuideSubSection title="Dashboard Layout">
                  <p className="text-muted-foreground mb-4">
                    The dashboard is organized into several key areas:
                  </p>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-sm">1</span>
                      </div>
                      <div>
                        <div className="font-medium">Header Navigation</div>
                        <div className="text-sm text-muted-foreground">
                          Contains the main title, back navigation, and quick access to settings and user menu.
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
                          The main area featuring clickable cards for each major feature. Cards are organized 
                          by frequency of use and logical workflow.
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
                          Shows your most recent uploads, generations, and edits with timestamps and quick links.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-bold text-sm">4</span>
                      </div>
                      <div>
                        <div className="font-medium">Statistics Panel</div>
                        <div className="text-sm text-muted-foreground">
                          Displays metrics like total assets, storage used, and generation counts.
                        </div>
                      </div>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Available Action Cards">
                  <GuideTable
                    headers={['Feature', 'Icon', 'Description', 'Best For']}
                    rows={[
                      ['Upload Video', '📤', 'Add videos from local files or remote URLs', 'Importing race footage, interviews, promotional videos'],
                      ['Generate AI Content', '✨', 'Create images and videos using AI models', 'New promotional content, social media posts, thumbnails'],
                      ['Scene Detection', '✂️', 'Automatically detect and extract scenes from videos', 'Creating highlight reels, thumbnails, chapter markers'],
                      ['Manage Playlists', '📋', 'Organize and manage Salesforce video playlists', 'Content organization, distribution planning'],
                      ['Asset Library', '📁', 'Browse and manage all media assets', 'Finding existing content, reviewing library'],
                      ['Social Media Kit', '📱', 'Generate platform-optimized image variants', 'Cross-platform social media campaigns'],
                      ['Model Marketplace', '🤖', 'Explore and configure AI models', 'Comparing model capabilities, setting defaults'],
                      ['Character Library', '👤', 'Manage reusable characters and subjects', 'Maintaining brand consistency in AI generations'],
                      ['User Guide', '📖', 'Access this documentation', 'Learning features, troubleshooting'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Recent Activity">
                  <p className="text-muted-foreground mb-4">
                    The Recent Activity section shows your latest actions in the Media Hub:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li><strong>Uploads:</strong> Videos and images you have recently added</li>
                    <li><strong>Generations:</strong> AI-generated content with model used and prompt</li>
                    <li><strong>Edits:</strong> Modifications to existing assets (tags, metadata, etc.)</li>
                    <li><strong>Approvals:</strong> Content reviewed through the Librarian workflow</li>
                    <li><strong>Syncs:</strong> Content synchronized to Salesforce</li>
                  </ul>
                  <p className="text-muted-foreground">
                    Click on any activity item to view the full details or navigate to that asset.
                  </p>
                </GuideSubSection>

                <GuideSubSection title="Recent Uploads Gallery">
                  <p className="text-muted-foreground mb-4">
                    Below the action cards, you will find a gallery of your most recent uploads. This section:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Shows thumbnail previews of recent content</li>
                    <li>Displays upload date and file type</li>
                    <li>Allows quick access to view or edit assets</li>
                    <li>Supports filtering by content type (images, videos, generated)</li>
                  </ul>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use keyboard shortcuts for faster navigation: Press <code className="bg-muted px-1 rounded">G</code> for Generate, 
                  <code className="bg-muted px-1 rounded ml-1">U</code> for Upload, <code className="bg-muted px-1 rounded ml-1">L</code> for Library.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 3: AI GENERATION ==================== */}
              <GuideSection id="ai-generation" title="AI Content Generation" icon={Sparkles}>
                <p className="text-muted-foreground mb-6">
                  The AI Content Generation feature is the heart of the Media Hub, allowing you to create 
                  stunning racing images and videos using state-of-the-art AI models. From quick social media 
                  posts to high-quality promotional materials, the generation tools support a wide range of 
                  creative needs.
                </p>

                <GuideSubSection title="Generation Interface Overview">
                  <p className="text-muted-foreground mb-4">
                    The generation page is divided into several key areas:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Image className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Output Type Toggle</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Switch between Image and Video generation modes. Each mode shows relevant 
                        models and options.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <FileImage className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Reference Image Panel</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Upload or select reference images to guide the AI. Supports drag-and-drop, 
                        file selection, and URL paste.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Prompt Editor</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Write detailed prompts or choose from curated presets. Supports prompt 
                        enhancement and style keywords.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Model Selection</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Choose from multiple AI models with different speed/quality tradeoffs. 
                        See detailed model cards with capabilities.
                      </p>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Image Generation Models">
                  <p className="text-muted-foreground mb-4">
                    The Media Hub offers several image generation models, each optimized for different use cases:
                  </p>
                  <GuideTable
                    headers={['Model', 'Speed', 'Quality', 'Cost', 'Best For']}
                    rows={[
                      ['Gemini (Free)', '⚡ 5-10 sec', '⭐⭐⭐', 'Free', 'Quick drafts, testing prompts, exploration'],
                      ['Flux Schnell', '⚡⚡ 2-5 sec', '⭐⭐⭐', 'Low', 'Fast iterations, social media content'],
                      ['Flux Dev', '🐢 15-30 sec', '⭐⭐⭐⭐⭐', 'Medium', 'High-quality promotional images'],
                      ['Flux Pro', '🐢 20-40 sec', '⭐⭐⭐⭐⭐', 'Higher', 'Premium marketing materials, print'],
                      ['Flux 3x3 Grid', '🐢 30-60 sec', '⭐⭐⭐⭐', 'Medium', 'Exploring 9 variations at once'],
                    ]}
                  />
                  
                  <div className="mt-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <h4 className="font-semibold text-foreground mb-2">Model Selection Guide</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>For speed:</strong> Use Flux Schnell when you need fast results</li>
                      <li><strong>For quality:</strong> Use Flux Dev or Pro for final, polished content</li>
                      <li><strong>For exploration:</strong> Use Gemini (free) or 3x3 Grid to try different ideas</li>
                      <li><strong>For consistency:</strong> Combine any model with Style Lock</li>
                    </ul>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Image Generation Workflow">
                  <GuideStep number={1} title="Select Output Type">
                    At the top of the page, ensure "Image" is selected in the output toggle. The interface 
                    will update to show image-specific options and models.
                  </GuideStep>
                  <GuideStep number={2} title="Add Reference Image (Optional)">
                    If you want to guide the AI with a reference image, you have three options:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li><strong>Upload:</strong> Drag and drop or click to select a file from your computer</li>
                      <li><strong>Library:</strong> Choose from your existing media assets</li>
                      <li><strong>URL:</strong> Paste a direct link to an online image</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={3} title="Write Your Prompt">
                    Enter a detailed description of the image you want to create. Be specific about:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Subject matter (racing motorcycle, pit crew, track view)</li>
                      <li>Style (cinematic, documentary, action shot)</li>
                      <li>Lighting (golden hour, dramatic shadows, bright daylight)</li>
                      <li>Composition (close-up, wide angle, aerial view)</li>
                      <li>Mood (intense, celebratory, focused)</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={4} title="Select AI Model">
                    Choose a model based on your needs. Hover over model cards to see detailed information 
                    about capabilities, typical generation time, and cost.
                  </GuideStep>
                  <GuideStep number={5} title="Generate">
                    Click the "Generate" button. A progress indicator will show the generation status. 
                    Most images complete within 5-60 seconds depending on the model.
                  </GuideStep>
                  <GuideStep number={6} title="Review and Save">
                    Once complete, the image appears in the preview panel. You can:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Download the image to your computer</li>
                      <li>Send to Social Kit for variant generation</li>
                      <li>Use as reference for another generation</li>
                      <li>The image is automatically saved to your library and synced to Salesforce</li>
                    </ul>
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Example Prompts">
                  <p className="text-muted-foreground mb-4">
                    Here are some effective prompt examples for racing content:
                  </p>
                  <div className="space-y-3 mb-4">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-xs text-primary font-medium mb-1">Action Shot</div>
                      <p className="text-sm text-foreground">
                        "A professional racing motorcycle leaning into a sharp corner on a sunlit track, 
                        motion blur on the wheels, rider in full racing leathers with team colors, 
                        dramatic lighting, cinematic composition, 8K quality"
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-xs text-primary font-medium mb-1">Portrait</div>
                      <p className="text-sm text-foreground">
                        "Close-up portrait of a motorcycle racer removing their helmet, sweat on their face, 
                        determined expression, pit lane in the background slightly blurred, golden hour lighting"
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-xs text-primary font-medium mb-1">Aerial View</div>
                      <p className="text-sm text-foreground">
                        "Aerial drone shot of a motorcycle racing circuit at sunset, multiple bikes 
                        navigating an S-curve, long shadows, vibrant orange and purple sky"
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="text-xs text-primary font-medium mb-1">Promotional</div>
                      <p className="text-sm text-foreground">
                        "Sleek promotional image of a racing motorcycle on a dark background with dramatic 
                        rim lighting, team sponsor logos visible, studio quality, perfect for marketing materials"
                      </p>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Video Generation">
                  <p className="text-muted-foreground mb-4">
                    The Media Hub also supports AI video generation for creating short promotional clips:
                  </p>
                  <GuideTable
                    headers={['Model', 'Duration', 'Resolution', 'Generation Time', 'Best For']}
                    rows={[
                      ['Google VEO', '5-8 seconds', 'Up to 1080p', '2-5 minutes', 'Cinematic clips, realistic motion'],
                      ['Wavespeed', '2-4 seconds', 'Up to 720p', '30-90 seconds', 'Quick social media clips, GIF-like content'],
                    ]}
                  />

                  <div className="mt-4 p-4 rounded-lg border border-border bg-card/50">
                    <h4 className="font-semibold text-foreground mb-2">Video Generation Tips</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Start with a strong reference image for better results</li>
                      <li>Describe the motion you want (e.g., "motorcycle accelerating", "camera panning left")</li>
                      <li>Keep prompts focused on a single action or scene</li>
                      <li>Use Google VEO for promotional content, Wavespeed for quick social posts</li>
                    </ul>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Prompt Presets">
                  <p className="text-muted-foreground mb-4">
                    Save time with curated prompt presets designed for racing content. Access presets by 
                    clicking the "Presets" button in the prompt editor. Available categories include:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {['Action Shots', 'Podium Celebrations', 'Pit Lane', 'Aerial Views', 'Night Racing', 
                      'Fan Experiences', 'Team Portraits', 'Technical Close-ups', 'Track Landscapes'].map((preset) => (
                      <div key={preset} className="p-2 rounded border border-border bg-muted/30 text-sm text-center">
                        {preset}
                      </div>
                    ))}
                  </div>
                </GuideSubSection>

                <GuideTip type="tip">
                  For best results, be specific in your prompts. Instead of "motorcycle racing", try 
                  "professional MotoGP motorcycle leaning at 60 degrees into a hairpin turn, rear tire 
                  slightly sliding, spray of rubber particles visible".
                </GuideTip>

                <GuideTip type="note">
                  All generated content is automatically saved to your library and synced to Salesforce 
                  with the prompt, model used, and generation date as metadata.
                </GuideTip>

                <GuideTip type="warning">
                  Generation credits may apply depending on the model used. Gemini is free with daily 
                  limits. Premium models consume credits based on quality and resolution.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 4: STYLE LOCK ==================== */}
              <GuideSection id="style-lock" title="Style Lock Feature" icon={Lock}>
                <p className="text-muted-foreground mb-6">
                  Style Lock is a powerful feature that analyzes your reference image and maintains visual 
                  consistency across all generations. This is essential for brand-consistent content creation, 
                  ensuring that multiple generated images share the same aesthetic qualities.
                </p>

                <GuideSubSection title="What is Style Lock?">
                  <p className="text-muted-foreground mb-4">
                    When you enable Style Lock, the AI performs a deep analysis of your reference image and 
                    extracts key visual characteristics. These characteristics are then applied to all subsequent 
                    generations until you disable Style Lock or switch to a new reference.
                  </p>
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4">
                    <h4 className="font-semibold text-foreground mb-2">Why Use Style Lock?</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Create a cohesive series of images for a campaign</li>
                      <li>Match the visual style of existing brand assets</li>
                      <li>Maintain consistency when generating multiple variations</li>
                      <li>Replicate a specific aesthetic across different subjects</li>
                    </ul>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="What Style Lock Analyzes">
                  <p className="text-muted-foreground mb-4">
                    The Style Lock feature extracts and preserves the following visual elements:
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Users className="w-5 h-5 text-primary mb-2" />
                      <div className="font-medium text-sm mb-1">Subjects</div>
                      <div className="text-xs text-muted-foreground">
                        People, vehicles, objects - their positioning, poses, and relationships
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Palette className="w-5 h-5 text-primary mb-2" />
                      <div className="font-medium text-sm mb-1">Color Palette</div>
                      <div className="text-xs text-muted-foreground">
                        Dominant colors, color temperature, saturation levels, color grading style
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Lightbulb className="w-5 h-5 text-primary mb-2" />
                      <div className="font-medium text-sm mb-1">Lighting</div>
                      <div className="text-xs text-muted-foreground">
                        Light direction, quality (hard/soft), contrast ratio, shadow characteristics
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Image className="w-5 h-5 text-primary mb-2" />
                      <div className="font-medium text-sm mb-1">Environment</div>
                      <div className="text-xs text-muted-foreground">
                        Setting, atmosphere, background style, depth of field
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Camera className="w-5 h-5 text-primary mb-2" />
                      <div className="font-medium text-sm mb-1">Camera Style</div>
                      <div className="text-xs text-muted-foreground">
                        Angle, focal length, composition rules, perspective
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Sparkles className="w-5 h-5 text-primary mb-2" />
                      <div className="font-medium text-sm mb-1">Mood & Tone</div>
                      <div className="text-xs text-muted-foreground">
                        Overall feeling, energy level, artistic style, genre conventions
                      </div>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="How to Use Style Lock">
                  <GuideStep number={1} title="Upload or Select Reference Image">
                    Add an image that represents your desired visual style. This could be an existing 
                    brand asset, a previous generation you liked, or any image with the aesthetic you 
                    want to replicate.
                  </GuideStep>
                  <GuideStep number={2} title="Enable Style Lock">
                    Click the "Lock Style" button (shows a lock icon). The system will analyze the image, 
                    which typically takes 2-5 seconds.
                  </GuideStep>
                  <GuideStep number={3} title="Review Style Profile">
                    After analysis, a style profile panel appears showing the extracted characteristics. 
                    Review this to ensure the AI correctly identified the key visual elements.
                  </GuideStep>
                  <GuideStep number={4} title="Generate with Locked Style">
                    Now when you generate new images, the AI will incorporate the locked style characteristics. 
                    Your prompts still control the content, but the visual treatment remains consistent.
                  </GuideStep>
                  <GuideStep number={5} title="Manage Style Lock">
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li><strong>Keep:</strong> When selecting a new reference, choose "Keep" to maintain the current style</li>
                      <li><strong>Reset:</strong> Choose "Reset" to analyze the new image and update the style</li>
                      <li><strong>Unlock:</strong> Click the lock icon again to disable Style Lock entirely</li>
                    </ul>
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Style Lock Best Practices">
                  <GuideTable
                    headers={['Do', 'Avoid']}
                    rows={[
                      ['Use high-quality reference images with clear style characteristics', 'Using blurry or low-resolution reference images'],
                      ['Choose references that represent your desired style well', 'Using images with mixed or conflicting styles'],
                      ['Test with a few generations to verify style transfer', 'Assuming perfect style match on first try'],
                      ['Combine with specific prompts for best results', 'Relying only on Style Lock without detailed prompts'],
                      ['Save successful style profiles for reuse', 'Forgetting to save effective style configurations'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Style Lock Example Workflow">
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>Scenario:</strong> You want to create a series of 5 promotional images for a 
                      race event, all sharing the same dramatic, high-contrast visual style.
                    </p>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Upload a reference image that has your desired dramatic, high-contrast look</li>
                      <li>Enable Style Lock and verify the extracted profile shows "high contrast" and "dramatic lighting"</li>
                      <li>Generate your first image with prompt: "motorcycle racer celebrating victory"</li>
                      <li>Generate second image: "pit crew preparing bike before race"</li>
                      <li>Generate third image: "aerial view of starting grid"</li>
                      <li>Continue for remaining images - all will share the same visual treatment</li>
                      <li>All 5 images will have consistent lighting, color grading, and mood</li>
                    </ol>
                  </div>
                </GuideSubSection>

                <GuideTip type="tip">
                  When selecting a new image from the library, you will be prompted to keep or reset the 
                  current style lock. Choose "Keep" to maintain consistency with previous generations, or 
                  "Reset" to analyze the new image for a fresh style profile.
                </GuideTip>

                <GuideTip type="note">
                  Style Lock works best when the reference image clearly represents the style you want. 
                  Images with distinctive lighting, color treatment, or composition will transfer more 
                  reliably than generic photos.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 5: 3x3 GRID ==================== */}
              <GuideSection id="grid-templates" title="3x3 Grid Templates" icon={Grid3X3}>
                <p className="text-muted-foreground mb-6">
                  The 3x3 Grid Template is a powerful exploration tool that generates 9 variations of your 
                  content in a single image. This is perfect for quickly comparing different interpretations 
                  of a prompt, exploring creative directions, or generating multiple options for client review.
                </p>

                <GuideSubSection title="Understanding 3x3 Grids">
                  <p className="text-muted-foreground mb-4">
                    A 3x3 grid generates a single composite image containing 9 individual variations arranged 
                    in a 3-row by 3-column layout. Each cell shows a different interpretation of your prompt, 
                    allowing you to compare options side-by-side instantly.
                  </p>
                  <div className="p-6 rounded-lg border border-border bg-card/50 mb-4">
                    <div className="grid grid-cols-3 gap-3 aspect-square max-w-sm mx-auto">
                      {[
                        { n: 1, label: 'Top Left' },
                        { n: 2, label: 'Top Center' },
                        { n: 3, label: 'Top Right' },
                        { n: 4, label: 'Mid Left' },
                        { n: 5, label: 'Center' },
                        { n: 6, label: 'Mid Right' },
                        { n: 7, label: 'Bot Left' },
                        { n: 8, label: 'Bot Center' },
                        { n: 9, label: 'Bot Right' },
                      ].map((cell) => (
                        <div key={cell.n} className="bg-muted rounded-lg flex flex-col items-center justify-center p-2 text-center">
                          <span className="text-lg font-bold text-primary">{cell.n}</span>
                          <span className="text-xs text-muted-foreground">{cell.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Grid layout with position numbers and locations
                    </p>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="When to Use 3x3 Grids">
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Great For</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Exploring different creative directions</li>
                        <li>Client presentations with multiple options</li>
                        <li>Finding the best composition or angle</li>
                        <li>Testing prompt variations quickly</li>
                        <li>Generating variety for A/B testing</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-amber-700 dark:text-amber-400">Not Ideal For</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Final production images (extract first)</li>
                        <li>When you need a very specific result</li>
                        <li>Large print materials (resolution limits)</li>
                        <li>Video generation (images only)</li>
                      </ul>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="How to Generate a 3x3 Grid">
                  <GuideStep number={1} title="Select 3x3 Grid Model">
                    In the Generate page or Model Marketplace, select a model with "3x3 Grid" capability. 
                    Look for models labeled "Flux 3x3 Grid" or similar. The model card will indicate grid support.
                  </GuideStep>
                  <GuideStep number={2} title="Write Your Prompt">
                    Create a detailed prompt describing what you want. The AI will interpret this 9 different 
                    ways, so prompts with some creative flexibility work best.
                    <div className="mt-2 p-3 rounded bg-muted/50 text-sm">
                      <strong>Example:</strong> "Racing motorcycle in action, dynamic angle, professional photography"
                      - This allows the AI to vary the angle, lighting, and composition across the 9 cells.
                    </div>
                  </GuideStep>
                  <GuideStep number={3} title="Add Reference Image (Optional)">
                    Including a reference image helps guide the style of all 9 variations. The grid will 
                    show different interpretations but maintain visual consistency from the reference.
                  </GuideStep>
                  <GuideStep number={4} title="Generate the Grid">
                    Click "Generate" and wait for the composite image. Grid generation takes longer than 
                    single images (30-60 seconds) because the AI creates 9 variations.
                  </GuideStep>
                  <GuideStep number={5} title="Review the Grid">
                    Examine all 9 variations. Look for:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Compositions that work for your use case</li>
                      <li>Interesting interpretations you had not considered</li>
                      <li>Variations that could be refined further</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={6} title="Extract Individual Images">
                    Once you find variations you like, use the "Extract Grid Image" feature to save 
                    individual cells as standalone high-resolution images.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Grid Position Reference">
                  <GuideTable
                    headers={['Position', 'Location', 'Coordinates', 'Use Case']}
                    rows={[
                      ['1', 'Top Left', 'Row 1, Col 1', 'Often good for wide/landscape compositions'],
                      ['2', 'Top Center', 'Row 1, Col 2', 'Centered subjects, balanced compositions'],
                      ['3', 'Top Right', 'Row 1, Col 3', 'Alternative angle to position 1'],
                      ['4', 'Middle Left', 'Row 2, Col 1', 'Portrait-friendly, vertical emphasis'],
                      ['5', 'Center', 'Row 2, Col 2', 'Most balanced, often the "safest" option'],
                      ['6', 'Middle Right', 'Row 2, Col 3', 'Alternative to position 4'],
                      ['7', 'Bottom Left', 'Row 3, Col 1', 'Often more experimental'],
                      ['8', 'Bottom Center', 'Row 3, Col 2', 'Ground-level or low-angle variations'],
                      ['9', 'Bottom Right', 'Row 3, Col 3', 'Most variation from center'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Extracting Images from Grids">
                  <p className="text-muted-foreground mb-4">
                    After generating a grid, you can extract any cell as a standalone image:
                  </p>
                  <GuideStep number={1} title="Open Extract Dialog">
                    Click "Extract Grid Image" or hover over the grid and click the extract icon.
                  </GuideStep>
                  <GuideStep number={2} title="Select Position">
                    Click on the cell you want to extract, or enter the position number (1-9).
                  </GuideStep>
                  <GuideStep number={3} title="Confirm Extraction">
                    The system will crop and upscale that cell to full resolution.
                  </GuideStep>
                  <GuideStep number={4} title="Use Extracted Image">
                    The extracted image is saved to your library and can be:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Downloaded for external use</li>
                      <li>Used as a reference for further generation</li>
                      <li>Sent to Social Kit for variant creation</li>
                      <li>Synced to Salesforce with original grid as metadata</li>
                    </ul>
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use 3x3 grids when you are exploring creative directions or need to present multiple 
                  options. Once you find a variation you like, extract it and use it as a reference for 
                  further refinement with Style Lock enabled.
                </GuideTip>

                <GuideTip type="note">
                  Extracted images maintain high quality and are automatically saved with metadata linking 
                  them back to the original grid. You can always trace an extracted image to its source.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 6: SOCIAL KIT ==================== */}
              <GuideSection id="social-kit" title="Social Kit" icon={Layers}>
                <p className="text-muted-foreground mb-6">
                  The Social Kit is your one-stop solution for generating platform-optimized image variants 
                  from a single master image. Instead of manually cropping and resizing for each social 
                  platform, Social Kit uses AI to intelligently adapt your content while maintaining visual 
                  quality and focus on key subjects.
                </p>

                <GuideSubSection title="How Social Kit Works">
                  <p className="text-muted-foreground mb-4">
                    Social Kit takes a high-quality master image and generates multiple variants optimized 
                    for different social media platforms. The AI analyzes your image to identify key subjects 
                    and ensures they remain prominent in each variant, regardless of aspect ratio.
                  </p>
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4">
                    <h4 className="font-semibold text-foreground mb-2">Key Benefits</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li>Generate 10+ variants from one master image in minutes</li>
                      <li>AI-powered smart cropping keeps subjects in frame</li>
                      <li>All variants automatically linked in Salesforce</li>
                      <li>Consistent quality across all platforms</li>
                      <li>Batch download for easy distribution</li>
                    </ul>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Supported Platforms & Dimensions">
                  <p className="text-muted-foreground mb-4">
                    Social Kit supports all major social media platforms with their recommended dimensions:
                  </p>
                  <GuideTable
                    headers={['Platform', 'Variant Type', 'Dimensions', 'Aspect Ratio', 'Use Case']}
                    rows={[
                      ['Instagram', 'Square Post', '1080 × 1080', '1:1', 'Feed posts, carousel images'],
                      ['Instagram', 'Story/Reel', '1080 × 1920', '9:16', 'Stories, Reels, vertical video covers'],
                      ['Facebook', 'Post', '1200 × 630', '1.91:1', 'Link previews, shared images'],
                      ['Facebook', 'Cover', '1640 × 924', '16:9', 'Page cover photos, event banners'],
                      ['Twitter/X', 'Post', '1200 × 675', '16:9', 'Tweet images, card previews'],
                      ['Twitter/X', 'Header', '1500 × 500', '3:1', 'Profile header banners'],
                      ['LinkedIn', 'Post', '1200 × 627', '1.91:1', 'Article previews, shared posts'],
                      ['LinkedIn', 'Cover', '1584 × 396', '4:1', 'Company page banners'],
                      ['YouTube', 'Thumbnail', '1280 × 720', '16:9', 'Video thumbnails'],
                      ['TikTok', 'Video Cover', '1080 × 1920', '9:16', 'Video cover images'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Social Kit Workflow">
                  <GuideStep number={1} title="Open Social Kit">
                    Navigate to Social Kit from the Media Hub dashboard by clicking the "Social Media Kit" 
                    action card.
                  </GuideStep>
                  <GuideStep number={2} title="Upload Master Image">
                    Choose a high-quality source image. For best results:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Use images at least 2000×2000 pixels</li>
                      <li>Ensure the main subject is not too close to edges</li>
                      <li>Higher resolution masters produce better variants</li>
                      <li>The master is automatically uploaded to S3 for storage</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={3} title="Select Target Platforms">
                    Check the platforms and variants you need. You can select all variants for comprehensive 
                    coverage, or choose specific ones for targeted campaigns.
                    <div className="mt-2 p-3 rounded bg-muted/50">
                      <strong>Quick Selections:</strong>
                      <ul className="list-disc list-inside text-sm mt-1">
                        <li>"All Platforms" - Generates every available variant</li>
                        <li>"Stories Only" - Vertical formats for Stories/Reels/TikTok</li>
                        <li>"Headers Only" - Wide banner formats</li>
                      </ul>
                    </div>
                  </GuideStep>
                  <GuideStep number={4} title="Choose AI Model">
                    Select the AI model for variant generation. Faster models are suitable for most cases, 
                    while premium models offer better subject preservation in difficult crops.
                  </GuideStep>
                  <GuideStep number={5} title="Generate Variants">
                    Click "Generate Variants" to start the batch process. A progress indicator shows 
                    completion status for each variant. Typical generation time is 1-3 minutes for all variants.
                  </GuideStep>
                  <GuideStep number={6} title="Review Results">
                    After generation, all variants are displayed in a grid. Review each to ensure:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Key subjects are visible and well-positioned</li>
                      <li>No important elements are cropped out</li>
                      <li>Quality meets your standards</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={7} title="Download or Distribute">
                    <ul className="list-disc list-inside text-sm">
                      <li><strong>Individual Download:</strong> Click on any variant to download</li>
                      <li><strong>Batch Download:</strong> Download all variants as a ZIP file</li>
                      <li><strong>Salesforce Sync:</strong> Variants are automatically synced with master-variant relationships</li>
                    </ul>
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Master Image Best Practices">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Do</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Use high-resolution source images (2000px+)</li>
                        <li>Keep main subjects centered when possible</li>
                        <li>Leave some margin around key elements</li>
                        <li>Use well-lit, high-contrast images</li>
                        <li>Test with one variant before batch generation</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                      <div className="font-semibold text-red-700 dark:text-red-400 mb-2">Avoid</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Low-resolution or heavily compressed images</li>
                        <li>Important elements touching image edges</li>
                        <li>Text that might get cropped in narrow variants</li>
                        <li>Extremely wide or tall master images</li>
                        <li>Images with essential info in corners</li>
                      </ul>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Variant Management">
                  <p className="text-muted-foreground mb-4">
                    After generation, you can manage your variants in several ways:
                  </p>
                  <GuideTable
                    headers={['Action', 'How To', 'Result']}
                    rows={[
                      ['Regenerate Single', 'Click regenerate icon on variant', 'Creates new version of that specific variant'],
                      ['Download Individual', 'Click download icon on variant', 'Downloads that variant to your device'],
                      ['Download All', 'Click "Download All" button', 'Downloads ZIP with all variants'],
                      ['View in Salesforce', 'Click Salesforce link', 'Opens the variant record in Salesforce'],
                      ['Delete Variant', 'Click delete icon', 'Removes variant (master is preserved)'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="tip">
                  For campaigns requiring many variants, generate a test batch with 2-3 platforms first 
                  to verify the master image works well before generating all variants.
                </GuideTip>

                <GuideTip type="note">
                  All variants are linked to the master image in Salesforce, making it easy to track 
                  which assets belong together and ensure consistent usage across campaigns.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 7: ASSET LIBRARY ==================== */}
              <GuideSection id="asset-library" title="Asset Library" icon={FolderOpen}>
                <p className="text-muted-foreground mb-6">
                  The Asset Library is your central repository for all media assets in the WMC Media Hub. 
                  Browse, search, filter, and manage images, videos, and generated content from multiple 
                  sources including S3 buckets, Salesforce, and local uploads.
                </p>

                <GuideSubSection title="Library Interface">
                  <p className="text-muted-foreground mb-4">
                    The Asset Library interface is organized for efficient browsing and management:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Search Bar</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Full-text search across titles, descriptions, tags, and metadata. Results 
                        update as you type.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Filter className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Filter Panel</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Filter by asset type (image/video), source, date range, tags, and approval status.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <SortAsc className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Sort Options</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sort by date created, date modified, title, file size, or relevance.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <LayoutGrid className="w-4 h-4 text-primary" />
                        <span className="font-semibold">View Modes</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Switch between grid view (thumbnails) and list view (detailed information).
                      </p>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Asset Sources">
                  <p className="text-muted-foreground mb-4">
                    The library aggregates content from multiple sources, each indicated by a source badge:
                  </p>
                  <GuideTable
                    headers={['Source', 'Badge', 'Description', 'Sync Behavior']}
                    rows={[
                      ['S3 Bucket', 's3_bucket', 'Assets stored in configured S3 buckets', 'Synced on bucket scan'],
                      ['Salesforce', 'salesforce', 'Content managed in Salesforce', 'Real-time sync'],
                      ['Generated', 'generated', 'AI-generated images and videos', 'Auto-saved on creation'],
                      ['Local Upload', 'local_upload', 'Files uploaded directly to Media Hub', 'Immediate availability'],
                      ['YouTube', 'youtube', 'YouTube video references', 'Linked, not stored'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Searching and Filtering">
                  <GuideStep number={1} title="Basic Search">
                    Type keywords in the search bar. The library searches across:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Asset titles and descriptions</li>
                      <li>Tags and categories</li>
                      <li>File names</li>
                      <li>AI-generated captions and metadata</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={2} title="Apply Filters">
                    Click the filter icon to open the filter panel. Available filters include:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li><strong>Type:</strong> Images, Videos, or Both</li>
                      <li><strong>Source:</strong> S3, Salesforce, Generated, Local, YouTube</li>
                      <li><strong>Date Range:</strong> Created or modified within specific dates</li>
                      <li><strong>Tags:</strong> Filter by one or more assigned tags</li>
                      <li><strong>Status:</strong> Approved, Pending Review, Rejected</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={3} title="Combine Filters">
                    Multiple filters work together (AND logic). For example, filtering by "Generated" source 
                    AND "Approved" status shows only approved AI-generated content.
                  </GuideStep>
                  <GuideStep number={4} title="Save Filter Presets">
                    Frequently used filter combinations can be saved as presets for quick access.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Managing Assets">
                  <p className="text-muted-foreground mb-4">
                    Each asset in the library can be viewed, edited, and managed:
                  </p>
                  <GuideTable
                    headers={['Action', 'Description', 'Where']}
                    rows={[
                      ['Preview', 'View full-size image or play video', 'Click thumbnail or eye icon'],
                      ['Edit Metadata', 'Update title, description, tags', 'Click edit icon or open details'],
                      ['Add Tags', 'Assign organizational tags', 'In edit mode or quick-tag button'],
                      ['Download', 'Download original file', 'Download icon on hover'],
                      ['Copy URL', 'Copy direct link to asset', 'Link icon on hover'],
                      ['Delete', 'Remove asset (with confirmation)', 'Delete icon (admin only)'],
                      ['View in Salesforce', 'Open linked Salesforce record', 'External link icon'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Tag Management">
                  <p className="text-muted-foreground mb-4">
                    Tags help organize and categorize your assets for easy discovery:
                  </p>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <Tag className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Creating Tags</div>
                        <div className="text-sm text-muted-foreground">
                          Go to tag management to create new tags with custom colors and descriptions. 
                          Use consistent naming conventions for easy organization.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <Plus className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Applying Tags</div>
                        <div className="text-sm text-muted-foreground">
                          Select one or more assets and use "Add Tags" to apply tags in bulk. You can 
                          also tag individual assets in the detail view.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <Search className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Filtering by Tags</div>
                        <div className="text-sm text-muted-foreground">
                          Use the tag filter to show only assets with specific tags. Click multiple 
                          tags to filter by all of them.
                        </div>
                      </div>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Librarian Workflow">
                  <p className="text-muted-foreground mb-4">
                    The Librarian workflow helps manage content quality and organization:
                  </p>
                  <GuideStep number={1} title="Access Librarian Mode">
                    Click "Librarian" button in the library toolbar to enter review mode.
                  </GuideStep>
                  <GuideStep number={2} title="Review Pending Assets">
                    See all assets that need review. These are typically new uploads or recently 
                    scanned content from S3.
                  </GuideStep>
                  <GuideStep number={3} title="Add Metadata">
                    For each asset, add or verify:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Descriptive title</li>
                      <li>Summary description</li>
                      <li>Relevant tags and categories</li>
                      <li>Usage rights and licensing info</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={4} title="Approve or Reject">
                    Mark assets as "Approved" for use, or "Rejected" if unsuitable. Rejected assets 
                    are hidden from normal library views but not deleted.
                  </GuideStep>
                  <GuideStep number={5} title="Bulk Actions">
                    Select multiple assets to apply the same action (approve, tag, etc.) to all at once.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use consistent tag naming conventions across your team. For example, use "race-cota" 
                  rather than mixing "COTA", "Circuit of the Americas", and "Austin Race".
                </GuideTip>

                <GuideTip type="note">
                  AI-generated content includes automatic tags based on the prompt and detected content. 
                  You can edit these or add additional tags as needed.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 8: S3 CONFIGURATION ==================== */}
              <GuideSection id="s3-configuration" title="S3 Bucket Configuration" icon={Database}>
                <p className="text-muted-foreground mb-6">
                  The Media Hub can connect to multiple Amazon S3 (or S3-compatible) buckets to store and 
                  retrieve media assets. This section covers how to configure, manage, and troubleshoot 
                  S3 bucket connections.
                </p>

                <GuideSubSection title="Understanding S3 Integration">
                  <p className="text-muted-foreground mb-4">
                    S3 buckets serve as the primary storage backend for the Media Hub. When configured, 
                    the system can:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
                    <li>Store uploaded and generated media files</li>
                    <li>Scan existing bucket contents to import into the library</li>
                    <li>Serve files via CDN for faster delivery</li>
                    <li>Organize content across multiple buckets for different purposes</li>
                  </ul>
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <h4 className="font-semibold text-foreground mb-2">Common Bucket Configurations</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>Production Assets:</strong> Main bucket for approved, production-ready content</li>
                      <li><strong>Raw Uploads:</strong> Incoming content before processing</li>
                      <li><strong>Generated Content:</strong> AI-generated images and videos</li>
                      <li><strong>Archive:</strong> Long-term storage for older assets</li>
                    </ul>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Adding a New S3 Bucket">
                  <GuideStep number={1} title="Open S3 Configuration">
                    Navigate to the Asset Library and click the settings/gear icon, then select 
                    "Configure S3 Buckets" from the menu.
                  </GuideStep>
                  <GuideStep number={2} title="Click Add New Bucket">
                    Click the "Add Bucket" button to open the bucket configuration form.
                  </GuideStep>
                  <GuideStep number={3} title="Enter Display Name">
                    Provide a friendly name for this bucket (e.g., "Production Assets", "Race Footage"). 
                    This name appears in the UI for easy identification.
                  </GuideStep>
                  <GuideStep number={4} title="Enter Bucket Details">
                    Fill in the required configuration fields (see table below).
                  </GuideStep>
                  <GuideStep number={5} title="Test Connection">
                    Click "Test Connection" to verify the credentials and configuration are correct 
                    before saving.
                  </GuideStep>
                  <GuideStep number={6} title="Save Configuration">
                    Once the test passes, click "Save" to add the bucket. It will appear in your 
                    bucket list and be available for scans and uploads.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Configuration Fields">
                  <GuideTable
                    headers={['Field', 'Required', 'Description', 'Example']}
                    rows={[
                      ['Display Name', 'Yes', 'Friendly name shown in the UI', 'Production Assets'],
                      ['Bucket Name', 'Yes', 'Actual S3 bucket name', 'wmc-media-production'],
                      ['Endpoint URL', 'Yes', 'S3 service endpoint', 'https://s3.us-east-1.amazonaws.com'],
                      ['Region', 'Yes', 'AWS region code', 'us-east-1'],
                      ['Access Key ID', 'Yes', 'AWS IAM access key', 'AKIA...'],
                      ['Secret Access Key', 'Yes', 'AWS IAM secret key', '(hidden)'],
                      ['CDN Base URL', 'No', 'CloudFront or CDN URL for faster delivery', 'https://d123.cloudfront.net'],
                      ['Scan Frequency', 'No', 'Auto-scan interval in hours', '24'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="S3-Compatible Services">
                  <p className="text-muted-foreground mb-4">
                    The Media Hub works with any S3-compatible storage service:
                  </p>
                  <GuideTable
                    headers={['Service', 'Endpoint URL Format', 'Notes']}
                    rows={[
                      ['Amazon S3', 'https://s3.{region}.amazonaws.com', 'Official AWS S3'],
                      ['DigitalOcean Spaces', 'https://{region}.digitaloceanspaces.com', 'Use Spaces access keys'],
                      ['Backblaze B2', 'https://s3.{region}.backblazeb2.com', 'Enable S3 compatibility'],
                      ['MinIO', 'https://{your-minio-server}:9000', 'Self-hosted option'],
                      ['Cloudflare R2', 'https://{account-id}.r2.cloudflarestorage.com', 'No egress fees'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Bucket Operations">
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Scan Bucket</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Discovers new files in the bucket and imports them into the Media Hub library.
                      </p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        <li>Scans for images, videos, and documents</li>
                        <li>Creates library entries with S3 metadata</li>
                        <li>Does not modify original files</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold">Test Connection</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Verifies credentials and permissions before saving configuration.
                      </p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        <li>Tests list permissions (read bucket contents)</li>
                        <li>Tests write permissions if needed</li>
                        <li>Reports specific errors if test fails</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold">Auto-Scan Schedule</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Configure automatic scanning at regular intervals.
                      </p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        <li>Set frequency (e.g., every 24 hours)</li>
                        <li>Only imports new files since last scan</li>
                        <li>Runs in background without disruption</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold">Edit/Delete</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Modify existing bucket configuration or remove it.
                      </p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground">
                        <li>Update credentials without re-entering all fields</li>
                        <li>Change CDN URL or scan frequency</li>
                        <li>Delete removes config only, not S3 files</li>
                      </ul>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Required IAM Permissions">
                  <p className="text-muted-foreground mb-4">
                    The AWS IAM user/role needs the following permissions for full functionality:
                  </p>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border font-mono text-sm overflow-x-auto">
                    <pre className="text-muted-foreground">{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}`}</pre>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Troubleshooting">
                  <GuideTable
                    headers={['Error', 'Likely Cause', 'Solution']}
                    rows={[
                      ['Access Denied', 'Invalid credentials or insufficient permissions', 'Verify access key/secret and IAM permissions'],
                      ['Bucket Not Found', 'Wrong bucket name or region', 'Double-check bucket name and ensure correct region'],
                      ['Connection Timeout', 'Endpoint URL incorrect or network issue', 'Verify endpoint URL format for your region'],
                      ['Invalid Endpoint', 'Wrong endpoint URL format', 'Use full URL including https:// and region'],
                      ['Scan finds no files', 'Bucket empty or files in unsupported format', 'Verify bucket contains images/videos'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="warning">
                  S3 credentials (Access Key and Secret Key) are stored securely and encrypted. Never 
                  share these credentials or include them in code. Ensure you have the necessary IAM 
                  permissions for both read and write access.
                </GuideTip>

                <GuideTip type="tip">
                  Use a CDN Base URL when available (like CloudFront) to reduce latency and improve 
                  load times for media assets displayed in the application. This also reduces S3 
                  request costs.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 9: SCENE DETECTION ==================== */}
              <GuideSection id="scene-detection" title="Scene Detection" icon={Scissors}>
                <p className="text-muted-foreground mb-6">
                  Scene Detection automatically analyzes videos to identify scene changes and extract 
                  thumbnails for each scene. This is invaluable for creating highlight reels, generating 
                  chapter markers, and producing thumbnails from video content.
                </p>

                <GuideSubSection title="How Scene Detection Works">
                  <p className="text-muted-foreground mb-4">
                    The scene detection algorithm analyzes video frames to identify significant visual 
                    changes that indicate a new scene. When a change exceeds the configured threshold, 
                    a new scene marker is created with a thumbnail.
                  </p>
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4">
                    <h4 className="font-semibold text-foreground mb-2">Scene Detection Uses</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      <li><strong>Highlight Reels:</strong> Identify key moments in race footage</li>
                      <li><strong>Thumbnails:</strong> Generate thumbnail options from video content</li>
                      <li><strong>Chapter Markers:</strong> Create chapter points for long videos</li>
                      <li><strong>Content Review:</strong> Quickly preview video content without watching entirely</li>
                      <li><strong>Social Clips:</strong> Find starting points for short social media clips</li>
                    </ul>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Scene Detection Workflow">
                  <GuideStep number={1} title="Access Scene Detection">
                    Click "Scene Detection" from the Media Hub dashboard, or access it from the 
                    video detail view by clicking "Detect Scenes".
                  </GuideStep>
                  <GuideStep number={2} title="Select or Upload Video">
                    Choose a video from your library or upload a new one. Supported formats include 
                    MP4, MOV, WebM, and AVI.
                  </GuideStep>
                  <GuideStep number={3} title="Configure Detection Threshold">
                    Set the sensitivity threshold (0.1 to 1.0):
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li><strong>Lower values (0.1-0.3):</strong> More sensitive, detects subtle changes, more scenes</li>
                      <li><strong>Default (0.3):</strong> Balanced sensitivity for most content</li>
                      <li><strong>Higher values (0.5-0.8):</strong> Less sensitive, only major scene changes</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={4} title="Run Detection">
                    Click "Analyze Video" to start the detection process. Processing time depends on 
                    video length and resolution, typically 1-5 minutes for standard videos.
                  </GuideStep>
                  <GuideStep number={5} title="Review Detected Scenes">
                    After analysis, view all detected scenes with:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Thumbnail preview for each scene</li>
                      <li>Timestamp showing when the scene starts</li>
                      <li>Duration of each scene segment</li>
                      <li>Click any scene to jump to that point in the video</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={6} title="Download or Use Thumbnails">
                    <ul className="list-disc list-inside text-sm">
                      <li><strong>Download Individual:</strong> Click download on any scene thumbnail</li>
                      <li><strong>Download All:</strong> Export all thumbnails as a ZIP file</li>
                      <li><strong>Use in Generation:</strong> Send thumbnail to AI generation as reference</li>
                      <li><strong>Add to Library:</strong> Save thumbnails as standalone image assets</li>
                    </ul>
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Threshold Guidelines">
                  <GuideTable
                    headers={['Content Type', 'Recommended Threshold', 'Notes']}
                    rows={[
                      ['Interview/Talking Head', '0.4-0.5', 'Fewer scene changes expected'],
                      ['Race Highlights', '0.3', 'Default works well for varied action'],
                      ['Fast-Cut Montage', '0.5-0.7', 'Higher to avoid detecting every cut'],
                      ['Documentary', '0.3-0.4', 'Moderate sensitivity for scene variety'],
                      ['Single-Shot Content', '0.2', 'Lower to catch subtle changes'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Detection Results">
                  <p className="text-muted-foreground mb-4">
                    Scene detection results include detailed information for each detected scene:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="font-semibold mb-2">Scene Information</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        <li>Scene number (sequential)</li>
                        <li>Start timestamp (HH:MM:SS)</li>
                        <li>End timestamp</li>
                        <li>Duration in seconds</li>
                        <li>Confidence score</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="font-semibold mb-2">Thumbnail Options</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        <li>High-quality frame capture</li>
                        <li>Multiple resolution options</li>
                        <li>PNG or JPEG format</li>
                        <li>Automatic quality optimization</li>
                      </ul>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Detection History">
                  <p className="text-muted-foreground mb-4">
                    All scene detection jobs are saved in history for reference:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>View past detections with original settings</li>
                    <li>Re-download thumbnails from previous analyses</li>
                    <li>Compare results from different threshold settings</li>
                    <li>Delete old detection jobs to free storage</li>
                  </ul>
                </GuideSubSection>

                <GuideTip type="tip">
                  Start with the default threshold of 0.3 and adjust based on results. Racing footage 
                  with quick camera cuts may need a higher threshold (0.5-0.7) to avoid detecting 
                  every single cut as a new scene.
                </GuideTip>

                <GuideTip type="note">
                  Scene detection runs locally in your browser using WebAssembly for privacy and speed. 
                  No video data is uploaded to external servers during detection.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 10: PLAYLIST MANAGER ==================== */}
              <GuideSection id="playlist-manager" title="Playlist Manager" icon={ListVideo}>
                <p className="text-muted-foreground mb-6">
                  The Playlist Manager provides a unified view of all video playlists synced with 
                  Salesforce. Organize, preview, and manage playlist content without leaving the 
                  Media Hub interface.
                </p>

                <GuideSubSection title="Playlist Overview">
                  <p className="text-muted-foreground mb-4">
                    Playlists are collections of videos organized for specific purposes, such as:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Film className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Event Playlists</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        All videos from a specific race event grouped together.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Rider Profiles</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Videos featuring specific riders or teams.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Highlight Reels</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Best moments and highlight compilations.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Season Collections</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Videos organized by racing season or year.
                      </p>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Playlist Features">
                  <GuideTable
                    headers={['Feature', 'Description', 'Access']}
                    rows={[
                      ['View All Playlists', 'See complete list of Salesforce playlists', 'Main playlist page'],
                      ['Preview Videos', 'Watch videos directly in the interface', 'Click any video thumbnail'],
                      ['View Metadata', 'See video details, tags, and Salesforce info', 'Expand video details'],
                      ['Playlist Stats', 'View total videos, duration, and engagement', 'Playlist header'],
                      ['Salesforce Link', 'Jump to playlist in Salesforce', 'External link icon'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Using Playlist Manager">
                  <GuideStep number={1} title="Access Playlist Manager">
                    Click "Manage Playlists" from the Media Hub dashboard.
                  </GuideStep>
                  <GuideStep number={2} title="Browse Playlists">
                    View all available playlists. Each shows:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Playlist name and description</li>
                      <li>Number of videos</li>
                      <li>Total duration</li>
                      <li>Last updated date</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={3} title="Open Playlist">
                    Click a playlist to view its contents. Videos are shown in order with thumbnails 
                    and metadata.
                  </GuideStep>
                  <GuideStep number={4} title="Preview Content">
                    Click any video to preview it in the built-in player. Use playback controls to 
                    navigate without leaving the page.
                  </GuideStep>
                  <GuideStep number={5} title="Manage in Salesforce">
                    For playlist editing (add/remove videos, reorder), click the Salesforce link to 
                    open the playlist in Salesforce where full management is available.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Playlist Sync">
                  <p className="text-muted-foreground mb-4">
                    Playlists are synced automatically with Salesforce:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Automatic Refresh:</strong> Playlist data refreshes on page load</li>
                    <li><strong>Real-time Updates:</strong> Changes in Salesforce appear within minutes</li>
                    <li><strong>Video Availability:</strong> Videos must be in the library to appear in playlists</li>
                    <li><strong>Sync Status:</strong> Check the last sync timestamp in playlist details</li>
                  </ul>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use playlists to organize content for specific campaigns or events. Creating themed 
                  playlists in Salesforce makes it easier to find and distribute related content.
                </GuideTip>

                <GuideTip type="note">
                  Playlist management (adding/removing videos, reordering) is handled in Salesforce. 
                  The Media Hub provides a convenient view and preview interface.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 11: MODEL MARKETPLACE ==================== */}
              <GuideSection id="model-marketplace" title="Model Marketplace" icon={Wand2}>
                <p className="text-muted-foreground mb-6">
                  The Model Marketplace is your guide to all available AI models in the Media Hub. 
                  Compare capabilities, understand pricing, set default preferences, and learn how 
                  to get the best results from each model.
                </p>

                <GuideSubSection title="Understanding AI Models">
                  <p className="text-muted-foreground mb-4">
                    Different AI models offer different tradeoffs between speed, quality, cost, and 
                    capabilities. The marketplace helps you choose the right model for each task.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50 text-center">
                      <Zap className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                      <div className="font-semibold">Speed</div>
                      <div className="text-sm text-muted-foreground">
                        How fast results are generated
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50 text-center">
                      <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="font-semibold">Quality</div>
                      <div className="text-sm text-muted-foreground">
                        Detail, realism, and polish
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50 text-center">
                      <Gauge className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="font-semibold">Cost</div>
                      <div className="text-sm text-muted-foreground">
                        Credits or resources used
                      </div>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Image Generation Models">
                  <GuideTable
                    headers={['Model', 'Speed', 'Quality', 'Cost', 'Resolution', 'Best Use']}
                    rows={[
                      ['Gemini (Free)', '5-10s', '⭐⭐⭐', 'Free', 'Up to 1024px', 'Testing, drafts, exploration'],
                      ['Flux Schnell', '2-5s', '⭐⭐⭐', 'Low', 'Up to 1024px', 'Fast iterations, social posts'],
                      ['Flux Dev', '15-30s', '⭐⭐⭐⭐⭐', 'Medium', 'Up to 2048px', 'High-quality promo images'],
                      ['Flux Pro', '20-40s', '⭐⭐⭐⭐⭐', 'High', 'Up to 2048px', 'Premium marketing, print'],
                      ['Flux 3x3 Grid', '30-60s', '⭐⭐⭐⭐', 'Medium', '1536px grid', 'Exploring 9 variations'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Video Generation Models">
                  <GuideTable
                    headers={['Model', 'Speed', 'Duration', 'Resolution', 'Best Use']}
                    rows={[
                      ['Google VEO', '2-5 min', '5-8 sec', 'Up to 1080p', 'Cinematic clips, realistic motion'],
                      ['Wavespeed', '30-90s', '2-4 sec', 'Up to 720p', 'Quick social clips, GIF-like content'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Model Cards">
                  <p className="text-muted-foreground mb-4">
                    Each model in the marketplace has a detailed card showing:
                  </p>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="font-semibold mb-2">Model Information</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        <li>Model name and version</li>
                        <li>Provider (Google, Black Forest, etc.)</li>
                        <li>Speed and quality ratings</li>
                        <li>Cost per generation</li>
                        <li>Supported features</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="font-semibold mb-2">Capabilities</div>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        <li>Maximum resolution</li>
                        <li>Reference image support</li>
                        <li>Style transfer ability</li>
                        <li>Aspect ratio flexibility</li>
                        <li>Special features (3x3 grid, etc.)</li>
                      </ul>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Setting Default Models">
                  <GuideStep number={1} title="Open Model Marketplace">
                    Navigate to Model Marketplace from the Media Hub dashboard.
                  </GuideStep>
                  <GuideStep number={2} title="Browse Available Models">
                    View all models with their specifications and ratings. Use filters to show 
                    only image or video models.
                  </GuideStep>
                  <GuideStep number={3} title="Select Default">
                    Click "Set as Default" on your preferred model. You can set separate defaults 
                    for image and video generation.
                  </GuideStep>
                  <GuideStep number={4} title="Apply Preference">
                    Your default model will be pre-selected whenever you open the Generate page.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Model Selection Guidelines">
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
                  Set Flux Schnell as your default for everyday use, then switch to Flux Dev or Pro 
                  when you need final production-quality images.
                </GuideTip>

                <GuideTip type="note">
                  Model availability and pricing may change. Check the marketplace for the most 
                  current information on each model.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 12: CHARACTER LIBRARY ==================== */}
              <GuideSection id="character-library" title="Character Library" icon={Users}>
                <p className="text-muted-foreground mb-6">
                  The Character Library allows you to create and manage reusable subjects for consistent 
                  AI generation. Save riders, vehicles, locations, and other elements to ensure visual 
                  consistency across all your generated content.
                </p>

                <GuideSubSection title="Understanding Characters">
                  <p className="text-muted-foreground mb-4">
                    A "character" in the Media Hub is any reusable visual element you want to maintain 
                    consistency for across generations. This includes:
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Users className="w-6 h-6 text-primary mb-2" />
                      <div className="font-semibold">Person</div>
                      <div className="text-sm text-muted-foreground">
                        Riders, team members, personalities. Maintains facial features and appearance.
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Zap className="w-6 h-6 text-primary mb-2" />
                      <div className="font-semibold">Vehicle</div>
                      <div className="text-sm text-muted-foreground">
                        Motorcycles, team vehicles, support equipment. Preserves livery and details.
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Users className="w-6 h-6 text-primary mb-2" />
                      <div className="font-semibold">Group</div>
                      <div className="text-sm text-muted-foreground">
                        Team formations, pit crew setups, rider groups.
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Globe className="w-6 h-6 text-primary mb-2" />
                      <div className="font-semibold">Location</div>
                      <div className="text-sm text-muted-foreground">
                        Tracks, venues, signature corners, pit lanes.
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Target className="w-6 h-6 text-primary mb-2" />
                      <div className="font-semibold">Object</div>
                      <div className="text-sm text-muted-foreground">
                        Helmets, trophies, equipment, branded items.
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <Palette className="w-6 h-6 text-primary mb-2" />
                      <div className="font-semibold">Style</div>
                      <div className="text-sm text-muted-foreground">
                        Visual styles, color schemes, aesthetic references.
                      </div>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Creating a Character">
                  <GuideStep number={1} title="Open Character Library">
                    Navigate to Character Library from the Media Hub dashboard.
                  </GuideStep>
                  <GuideStep number={2} title="Click Add Character">
                    Click the "Add Character" button to open the creation form.
                  </GuideStep>
                  <GuideStep number={3} title="Select Element Type">
                    Choose the type that best describes your subject: Person, Vehicle, Group, 
                    Location, Object, or Style.
                  </GuideStep>
                  <GuideStep number={4} title="Upload Reference Image">
                    Provide a clear, high-quality reference image. For best results:
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Use well-lit images with clear visibility of the subject</li>
                      <li>Avoid busy backgrounds that compete with the subject</li>
                      <li>For people, use front-facing portraits when possible</li>
                      <li>For vehicles, show the complete vehicle clearly</li>
                    </ul>
                  </GuideStep>
                  <GuideStep number={5} title="Add Name and Description">
                    Give your character a recognizable name and detailed description. Include 
                    identifying features that help the AI understand what to preserve.
                  </GuideStep>
                  <GuideStep number={6} title="Add Tags">
                    Tag your character for easy filtering (e.g., "team-alpha", "2024-season", "rider").
                  </GuideStep>
                  <GuideStep number={7} title="Save Character">
                    Click Save to add the character to your library. It will now be available 
                    for use in all AI generation tasks.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Using Characters in Generation">
                  <GuideStep number={1} title="Open Generate Page">
                    Navigate to the AI Generation page.
                  </GuideStep>
                  <GuideStep number={2} title="Open Subject Reference">
                    Click "Add Subject" or the character icon in the reference panel.
                  </GuideStep>
                  <GuideStep number={3} title="Select Character">
                    Browse or search your character library. Click a character to select it.
                  </GuideStep>
                  <GuideStep number={4} title="Write Your Prompt">
                    Reference the character in your prompt. The AI will incorporate the character 
                    with its visual traits.
                    <div className="mt-2 p-3 rounded bg-muted/50 text-sm">
                      <strong>Example:</strong> With "Miguel" character selected:
                      "Miguel celebrating on the podium, holding trophy, crowd cheering in background"
                    </div>
                  </GuideStep>
                  <GuideStep number={5} title="Generate">
                    The AI will create content featuring your character while maintaining their 
                    visual consistency.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Managing Characters">
                  <GuideTable
                    headers={['Action', 'Description', 'How To']}
                    rows={[
                      ['Edit Character', 'Update name, description, tags, or image', 'Click edit icon on character card'],
                      ['Delete Character', 'Remove from library (cannot be undone)', 'Click delete icon, confirm'],
                      ['Duplicate Character', 'Create a copy with modifications', 'Click duplicate, edit as needed'],
                      ['View Usage', 'See generations using this character', 'Click character, view "Used In" tab'],
                      ['Update Reference', 'Replace reference image with better version', 'Edit character, upload new image'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Character Best Practices">
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Do</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Use high-quality, well-lit reference images</li>
                        <li>Write detailed descriptions with distinctive features</li>
                        <li>Tag characters consistently for organization</li>
                        <li>Update references if better images become available</li>
                        <li>Create separate characters for different rider gear</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
                      <div className="font-semibold text-red-700 dark:text-red-400 mb-2">Avoid</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>Blurry or low-resolution reference images</li>
                        <li>Images with multiple subjects competing for attention</li>
                        <li>Generic descriptions that could apply to anyone</li>
                        <li>Creating duplicate characters for the same subject</li>
                        <li>Expecting perfect likeness (AI approximates)</li>
                      </ul>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use high-quality, well-lit reference images for best results. The AI uses these 
                  to maintain subject consistency across generations. Front-facing, neutral expressions 
                  work best for people.
                </GuideTip>

                <GuideTip type="note">
                  Character consistency is approximate. The AI attempts to maintain key visual 
                  features but may not produce exact replicas in every generation. For critical 
                  brand elements, always review generated content.
                </GuideTip>
              </GuideSection>

              {/* ==================== SECTION 13: SALESFORCE INTEGRATION ==================== */}
              <GuideSection id="salesforce" title="Salesforce Integration" icon={Database}>
                <p className="text-muted-foreground mb-6">
                  The WMC Media Hub is deeply integrated with Salesforce, providing seamless 
                  synchronization of all media assets, metadata, and relationships. This section 
                  covers how the integration works and how to make the most of it.
                </p>

                <GuideSubSection title="Integration Overview">
                  <p className="text-muted-foreground mb-4">
                    The Salesforce integration ensures that all content created or managed in the 
                    Media Hub is automatically synchronized with your Salesforce org:
                  </p>
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 mb-4">
                    <h4 className="font-semibold text-foreground mb-2">What Gets Synced</h4>
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

                <GuideSubSection title="Automatic Sync Features">
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">Generated Content Sync</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          All AI-generated images and videos automatically create corresponding records 
                          in Salesforce. Records include the prompt used, model selected, generation 
                          date, and a link to the source file.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">Master-Variant Relationships</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          When you use Social Kit to generate variants, the master image and all 
                          variants are linked in Salesforce. This makes it easy to track which 
                          variants came from which source and manage them together.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">Metadata & Tag Sync</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          AI-generated descriptions, detected objects, and manually added tags are 
                          all synchronized to Salesforce. This enables powerful searching and 
                          filtering within your Salesforce environment.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">Creator Tracking</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Content is automatically linked to the creating user's Salesforce Contact 
                          record. This enables tracking of who created what content and when, 
                          supporting audit trails and attribution.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 rounded-lg border border-border">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-foreground">Bidirectional Updates</div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Changes made in either the Media Hub or Salesforce are synchronized. 
                          Edit metadata in Salesforce and it appears in the Media Hub; update 
                          tags in the Media Hub and they sync to Salesforce.
                        </p>
                      </div>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Salesforce Record Structure">
                  <p className="text-muted-foreground mb-4">
                    Media assets are stored in Salesforce with the following structure:
                  </p>
                  <GuideTable
                    headers={['Field', 'Description', 'Example']}
                    rows={[
                      ['Name', 'Asset title/filename', 'Race_Highlight_COTA_2024.mp4'],
                      ['Type', 'Image, Video, or Document', 'Video'],
                      ['Source', 'Where the asset came from', 'Generated, S3 Bucket, Upload'],
                      ['File URL', 'Direct link to the file', 'https://cdn.wmc.com/...'],
                      ['Thumbnail URL', 'Preview image URL', 'https://cdn.wmc.com/...'],
                      ['Description', 'AI-generated or manual description', 'Motorcycle racing action shot...'],
                      ['Tags', 'Comma-separated tag list', 'racing, cota, 2024, highlight'],
                      ['Created By', 'Link to creator Contact', 'John Smith'],
                      ['Created Date', 'When the asset was created', '2024-03-15'],
                      ['Master Asset', 'For variants, link to master', 'Master_Image_001'],
                      ['AI Prompt', 'For generated content, the prompt used', 'Racing motorcycle on track...'],
                      ['AI Model', 'For generated content, model used', 'Flux Pro'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Viewing Assets in Salesforce">
                  <GuideStep number={1} title="From Media Hub">
                    Any asset in the Media Hub that has been synced shows a Salesforce icon. Click 
                    this icon to open the corresponding record in Salesforce.
                  </GuideStep>
                  <GuideStep number={2} title="In Salesforce">
                    Navigate to the Media Assets tab in Salesforce to view all synced content. 
                    Use Salesforce's native search and filtering to find specific assets.
                  </GuideStep>
                  <GuideStep number={3} title="Related Lists">
                    Assets appear in related lists on Contact (creator), Campaign (if associated), 
                    and Master Asset (for variants) records.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Sync Status and Troubleshooting">
                  <p className="text-muted-foreground mb-4">
                    Monitor sync status and resolve issues:
                  </p>
                  <GuideTable
                    headers={['Status', 'Meaning', 'Action']}
                    rows={[
                      ['Synced ✓', 'Asset is current in Salesforce', 'No action needed'],
                      ['Pending', 'Sync in progress', 'Wait a few moments, refreshes automatically'],
                      ['Failed', 'Sync encountered an error', 'Check Salesforce connection, retry sync'],
                      ['Not Synced', 'Asset has not been synced yet', 'Manually trigger sync or wait for auto-sync'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="note">
                  Content syncs happen automatically in the background within 1-2 minutes of creation 
                  or modification. You can verify sync status in the asset details panel or by 
                  checking the Salesforce record directly.
                </GuideTip>

                <GuideTip type="tip">
                  Use Salesforce reports and dashboards to analyze your media library. Create reports 
                  on generation volume, content by creator, assets by tag, and more.
                </GuideTip>

                <GuideTip type="warning">
                  Deleting an asset in the Media Hub will also remove it from Salesforce after the 
                  next sync cycle. If you need to preserve Salesforce records, archive assets instead 
                  of deleting them.
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
                  Last updated: December 2024 • Version 2.0
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
