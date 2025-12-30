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
  Clock
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
                  Media Hub, from AI content generation to Salesforce integration.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">AI Generation</Badge>
                  <Badge variant="secondary">Social Kit</Badge>
                  <Badge variant="secondary">Asset Management</Badge>
                  <Badge variant="secondary">Scene Detection</Badge>
                  <Badge variant="secondary">Salesforce Sync</Badge>
                </div>
              </div>

              {/* Section 1: Getting Started */}
              <GuideSection id="getting-started" title="Getting Started" icon={BookOpen}>
                <p className="text-muted-foreground mb-6">
                  The WMC Media Hub is your central platform for managing, generating, and distributing 
                  racing content across all channels.
                </p>

                <GuideSubSection title="Accessing the Media Hub">
                  <GuideStep number={1} title="Navigate to Media Hub">
                    Visit <code className="bg-muted px-2 py-1 rounded text-sm">/admin/media</code> or click 
                    "Media Hub" from the main navigation.
                  </GuideStep>
                  <GuideStep number={2} title="Dashboard Overview">
                    You'll see the main dashboard with action cards for each feature area.
                  </GuideStep>
                  <GuideStep number={3} title="Choose Your Task">
                    Click on any action card to access that feature (Generate, Upload, Library, etc.).
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Bookmark the Media Hub URL for quick access. All features are accessible from the main dashboard.
                </GuideTip>
              </GuideSection>

              {/* Section 2: Dashboard */}
              <GuideSection id="dashboard" title="Media Hub Dashboard" icon={PlaySquare}>
                <p className="text-muted-foreground mb-6">
                  The dashboard provides quick access to all Media Hub features through action cards.
                </p>

                <GuideSubSection title="Available Actions">
                  <GuideTable
                    headers={['Feature', 'Description', 'Best For']}
                    rows={[
                      ['Upload Video', 'Add videos from files or URLs', 'Importing existing content'],
                      ['Generate AI Image/Video', 'Create content with AI models', 'New content creation'],
                      ['Scene Detection', 'Auto-detect scenes in videos', 'Video analysis & thumbnails'],
                      ['Manage Playlists', 'Organize Salesforce playlists', 'Content organization'],
                      ['Asset Library', 'Browse all S3 assets', 'Asset management'],
                      ['Social Media Kit', 'Generate platform variants', 'Social media distribution'],
                    ]}
                  />
                </GuideSubSection>
              </GuideSection>

              {/* Section 3: AI Generation */}
              <GuideSection id="ai-generation" title="AI Content Generation" icon={Sparkles}>
                <p className="text-muted-foreground mb-6">
                  Generate stunning racing images and videos using various AI models, from fast free 
                  options to premium quality generators.
                </p>

                <GuideSubSection title="Image Generation">
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold">Fast & Free</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Gemini - Quick generations, no cost</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold">Ultra-Fast</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Flux Schnell - Speed optimized</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Image className="w-4 h-4 text-purple-500" />
                        <span className="font-semibold">Premium Quality</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Flux Dev, Pro - Highest quality</p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-center gap-2 mb-2">
                        <Grid3X3 className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold">3x3 Grid</span>
                      </div>
                      <p className="text-sm text-muted-foreground">9 variations in one image</p>
                    </div>
                  </div>

                  <GuideStep number={1} title="Select Output Type">
                    Choose "Image" or "Video" from the toggle at the top.
                  </GuideStep>
                  <GuideStep number={2} title="Add Reference Image (Optional)">
                    Upload, select from library, or paste a URL for style reference.
                  </GuideStep>
                  <GuideStep number={3} title="Write Your Prompt">
                    Describe what you want to generate, or select from presets.
                  </GuideStep>
                  <GuideStep number={4} title="Choose AI Model">
                    Select based on your speed/quality needs.
                  </GuideStep>
                  <GuideStep number={5} title="Generate">
                    Click generate and wait for your content.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Video Generation">
                  <GuideTable
                    headers={['Model', 'Duration', 'Best For']}
                    rows={[
                      ['Google VEO', '5-8 seconds', 'Realistic motion, cinematic'],
                      ['Wavespeed', '2-4 seconds', 'Quick clips, social media'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="note">
                  All generated content automatically syncs to Salesforce with appropriate metadata.
                </GuideTip>
              </GuideSection>

              {/* Section 4: Style Lock */}
              <GuideSection id="style-lock" title="Style Lock Feature" icon={Lock}>
                <p className="text-muted-foreground mb-6">
                  Style Lock analyzes your reference image and maintains visual consistency across 
                  all generations. This is essential for brand-consistent content.
                </p>

                <GuideSubSection title="What Style Lock Analyzes">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {[
                      { icon: Users, label: 'Subjects', desc: 'People, vehicles, objects' },
                      { icon: Palette, label: 'Colors', desc: 'Color palette & grade' },
                      { icon: Settings, label: 'Lighting', desc: 'Light direction & quality' },
                      { icon: Image, label: 'Environment', desc: 'Setting & atmosphere' },
                      { icon: Video, label: 'Camera Style', desc: 'Angle & composition' },
                      { icon: Sparkles, label: 'Mood', desc: 'Overall feeling & tone' },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg border border-border bg-card/50">
                        <item.icon className="w-4 h-4 text-primary mb-2" />
                        <div className="font-medium text-sm">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Using Style Lock">
                  <GuideStep number={1} title="Upload Reference Image">
                    Add an image that represents your desired style.
                  </GuideStep>
                  <GuideStep number={2} title="Enable Style Lock">
                    Click "Lock Style" to analyze the image.
                  </GuideStep>
                  <GuideStep number={3} title="Review Analysis">
                    Check the extracted style profile in the preview panel.
                  </GuideStep>
                  <GuideStep number={4} title="Generate with Consistency">
                    Your generations will now maintain this visual style.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  When selecting a new image from the library, you'll be prompted to keep or reset the 
                  current style lock. Choose "Keep" to maintain consistency with previous generations.
                </GuideTip>
              </GuideSection>

              {/* Section 5: 3x3 Grid Templates */}
              <GuideSection id="grid-templates" title="3x3 Grid Templates" icon={Grid3X3}>
                <p className="text-muted-foreground mb-6">
                  Generate 9 variations of your content in a single image using the 3x3 grid template. 
                  This is perfect for exploring different styles, poses, or compositions quickly.
                </p>

                <GuideSubSection title="What is a 3x3 Grid?">
                  <p className="text-muted-foreground mb-4">
                    A 3x3 grid generates a single image containing 9 variations arranged in a 3-row by 3-column 
                    layout. Each cell shows a different interpretation of your prompt, allowing you to compare 
                    options side-by-side.
                  </p>
                  <div className="p-4 rounded-lg border border-border bg-card/50 mb-4">
                    <div className="grid grid-cols-3 gap-2 aspect-square max-w-xs mx-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <div key={n} className="bg-muted rounded flex items-center justify-center text-muted-foreground text-sm font-medium">
                          {n}
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-3">Example 3x3 grid layout</p>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="How to Generate a 3x3 Grid">
                  <GuideStep number={1} title="Select 3x3 Grid Model">
                    In the Model Marketplace or Generate page, choose a model with "3x3 Grid" capability 
                    (e.g., Flux 3x3 Grid).
                  </GuideStep>
                  <GuideStep number={2} title="Write Your Prompt">
                    Describe what you want - the AI will create 9 variations based on your description.
                  </GuideStep>
                  <GuideStep number={3} title="Add Reference (Optional)">
                    Include a reference image to guide the style of all 9 variations.
                  </GuideStep>
                  <GuideStep number={4} title="Generate">
                    Click generate to create your 3x3 grid image.
                  </GuideStep>
                  <GuideStep number={5} title="Extract Individual Images">
                    Use the "Extract Grid Image" feature to save any cell as a standalone image.
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Grid Position Reference">
                  <GuideTable
                    headers={['Position', 'Grid Location', 'Description']}
                    rows={[
                      ['1', 'Top Left', 'First variation'],
                      ['2', 'Top Center', 'Second variation'],
                      ['3', 'Top Right', 'Third variation'],
                      ['4', 'Middle Left', 'Fourth variation'],
                      ['5', 'Center', 'Fifth variation (center focus)'],
                      ['6', 'Middle Right', 'Sixth variation'],
                      ['7', 'Bottom Left', 'Seventh variation'],
                      ['8', 'Bottom Center', 'Eighth variation'],
                      ['9', 'Bottom Right', 'Ninth variation'],
                    ]}
                  />
                </GuideSubSection>

                <GuideTip type="tip">
                  Use 3x3 grids when you're exploring creative directions. Once you find a variation you 
                  like, extract it and use it as a reference for further refinement.
                </GuideTip>

                <GuideTip type="note">
                  The extracted images maintain high quality and are automatically saved with metadata 
                  linking them back to the original grid.
                </GuideTip>
              </GuideSection>

              {/* Section 6: Social Kit */}
              <GuideSection id="social-kit" title="Social Kit" icon={Layers}>
                <p className="text-muted-foreground mb-6">
                  Generate platform-optimized image variants from a single master image. Perfect for 
                  consistent cross-platform social media presence.
                </p>

                <GuideSubSection title="Supported Platforms & Dimensions">
                  <GuideTable
                    headers={['Platform', 'Variant', 'Dimensions']}
                    rows={[
                      ['Instagram', 'Square Post', '1080 × 1080'],
                      ['Instagram', 'Story/Reel', '1080 × 1920'],
                      ['Facebook', 'Post', '1200 × 630'],
                      ['Facebook', 'Cover', '1640 × 924'],
                      ['Twitter/X', 'Post', '1200 × 675'],
                      ['Twitter/X', 'Header', '1500 × 500'],
                      ['LinkedIn', 'Post', '1200 × 627'],
                      ['LinkedIn', 'Cover', '1584 × 396'],
                      ['YouTube', 'Thumbnail', '1280 × 720'],
                      ['TikTok', 'Video Cover', '1080 × 1920'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Workflow">
                  <GuideStep number={1} title="Upload Master Image">
                    Choose a high-quality source image (the master is uploaded to S3).
                  </GuideStep>
                  <GuideStep number={2} title="Select Platforms">
                    Check the platforms and variants you need.
                  </GuideStep>
                  <GuideStep number={3} title="Generate Variants">
                    AI will intelligently crop and adapt for each platform.
                  </GuideStep>
                  <GuideStep number={4} title="Download or Sync">
                    Download individually or let them sync to Salesforce.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="note">
                  All variants are linked to the master image in Salesforce for easy tracking.
                </GuideTip>
              </GuideSection>

              {/* Section 7: Asset Library */}
              <GuideSection id="asset-library" title="Asset Library" icon={PlaySquare}>
                <p className="text-muted-foreground mb-6">
                  Browse, search, and manage all media assets across S3 buckets and sources.
                </p>

                <GuideSubSection title="Library Features">
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                      <Search className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Search & Filter</div>
                        <div className="text-sm text-muted-foreground">Find assets by name, type, tags, or date</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                      <Tag className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Tag Management</div>
                        <div className="text-sm text-muted-foreground">Organize with custom tags and categories</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                      <Database className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">S3 Configuration</div>
                        <div className="text-sm text-muted-foreground">Connect and scan multiple S3 buckets</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <div className="font-medium">Librarian Workflow</div>
                        <div className="text-sm text-muted-foreground">Review, tag, and approve content</div>
                      </div>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Librarian Workflow">
                  <GuideStep number={1} title="Review Pending Assets">
                    Open the Librarian dialog to see unreviewed content.
                  </GuideStep>
                  <GuideStep number={2} title="Add Tags & Metadata">
                    Assign relevant tags, descriptions, and categories.
                  </GuideStep>
                  <GuideStep number={3} title="Approve or Reject">
                    Mark content as approved for use or reject if unsuitable.
                  </GuideStep>
                </GuideSubSection>
              </GuideSection>

              {/* Section 8: S3 Bucket Configuration */}
              <GuideSection id="s3-configuration" title="S3 Bucket Configuration" icon={Database}>
                <p className="text-muted-foreground mb-6">
                  Connect and manage Amazon S3 buckets to store and retrieve media assets. 
                  The Media Hub supports multiple bucket configurations for different use cases.
                </p>

                <GuideSubSection title="Adding a New S3 Bucket">
                  <GuideStep number={1} title="Open S3 Configuration">
                    Navigate to the Asset Library and click "Configure S3 Buckets" or the settings icon.
                  </GuideStep>
                  <GuideStep number={2} title="Click Add New Bucket">
                    Click the "Add Bucket" button to open the configuration form.
                  </GuideStep>
                  <GuideStep number={3} title="Enter Bucket Details">
                    Provide the following information:
                  </GuideStep>
                </GuideSubSection>

                <GuideSubSection title="Required Configuration Fields">
                  <GuideTable
                    headers={['Field', 'Description', 'Example']}
                    rows={[
                      ['Bucket Name', 'The name of your S3 bucket', 'wmc-media-assets'],
                      ['Endpoint URL', 'S3-compatible endpoint URL', 'https://s3.us-east-1.amazonaws.com'],
                      ['Region', 'AWS region where bucket is located', 'us-east-1'],
                      ['CDN Base URL', 'Optional CDN URL for faster delivery', 'https://cdn.example.com'],
                      ['Display Name', 'Friendly name shown in the UI', 'Production Assets'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Bucket Operations">
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-4 h-4 text-primary" />
                        <span className="font-semibold">Scan Bucket</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Scan the bucket to discover and import new media files into the library.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold">Test Connection</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Verify that credentials and configuration are correct before saving.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold">Auto-Scan Schedule</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Set automatic scan frequency (e.g., every 24 hours) to keep library updated.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold">Edit/Delete</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Modify bucket settings or remove a bucket configuration.
                      </p>
                    </div>
                  </div>
                </GuideSubSection>

                <GuideTip type="warning">
                  S3 credentials (Access Key and Secret Key) are stored securely and are required for 
                  bucket operations. Ensure you have the necessary IAM permissions for read/write access.
                </GuideTip>

                <GuideTip type="tip">
                  Use a CDN Base URL when available to reduce latency and improve load times for 
                  media assets displayed in the application.
                </GuideTip>
              </GuideSection>

              {/* Section 7: Scene Detection */}
              <GuideSection id="scene-detection" title="Scene Detection" icon={Scissors}>
                <p className="text-muted-foreground mb-6">
                  Automatically detect scene changes in videos and extract thumbnails for each scene.
                </p>

                <GuideSubSection title="How It Works">
                  <GuideStep number={1} title="Upload or Select Video">
                    Choose a video from your library or upload a new one.
                  </GuideStep>
                  <GuideStep number={2} title="Set Detection Threshold">
                    Adjust sensitivity (lower = more scenes detected).
                  </GuideStep>
                  <GuideStep number={3} title="Run Detection">
                    The system analyzes the video for scene changes.
                  </GuideStep>
                  <GuideStep number={4} title="Review Results">
                    View detected scenes with timestamps and thumbnails.
                  </GuideStep>
                  <GuideStep number={5} title="Download Thumbnails">
                    Export scene thumbnails for use in other content.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Start with a threshold of 0.3 and adjust based on results. Racing footage with 
                  quick cuts may need a higher threshold.
                </GuideTip>
              </GuideSection>

              {/* Section 8: Playlist Manager */}
              <GuideSection id="playlist-manager" title="Playlist Manager" icon={ListVideo}>
                <p className="text-muted-foreground mb-6">
                  View and manage video playlists that are synced with Salesforce.
                </p>

                <GuideSubSection title="Features">
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>View all Salesforce playlists in one place</li>
                    <li>See playlist contents and metadata</li>
                    <li>Preview videos directly in the interface</li>
                    <li>Track playlist performance and engagement</li>
                  </ul>
                </GuideSubSection>
              </GuideSection>

              {/* Section 9: Model Marketplace */}
              <GuideSection id="model-marketplace" title="Model Marketplace" icon={Sparkles}>
                <p className="text-muted-foreground mb-6">
                  Explore available AI models and set your default preferences for generation.
                </p>

                <GuideSubSection title="Available Models">
                  <GuideTable
                    headers={['Category', 'Model', 'Speed', 'Quality']}
                    rows={[
                      ['Image', 'Gemini', '⚡ Fast', '⭐⭐⭐'],
                      ['Image', 'Flux Schnell', '⚡⚡ Ultra-Fast', '⭐⭐⭐'],
                      ['Image', 'Flux Dev', '🐢 Slower', '⭐⭐⭐⭐⭐'],
                      ['Image', 'Flux Pro', '🐢 Slower', '⭐⭐⭐⭐⭐'],
                      ['Video', 'Google VEO', '🐢 Slower', '⭐⭐⭐⭐⭐'],
                      ['Video', 'Wavespeed', '⚡ Fast', '⭐⭐⭐⭐'],
                    ]}
                  />
                </GuideSubSection>

                <GuideSubSection title="Setting Defaults">
                  <p className="text-muted-foreground mb-4">
                    Click "Set as Default" on any model to make it your default choice when generating 
                    new content. This saves time by pre-selecting your preferred model.
                  </p>
                </GuideSubSection>
              </GuideSection>

              {/* Section 10: Character Library */}
              <GuideSection id="character-library" title="Character Library" icon={Users}>
                <p className="text-muted-foreground mb-6">
                  Create and manage reusable characters, vehicles, and subjects for consistent 
                  AI generation across your content.
                </p>

                <GuideSubSection title="Element Types">
                  <div className="flex flex-wrap gap-2 mb-6">
                    <Badge>Person</Badge>
                    <Badge>Vehicle</Badge>
                    <Badge>Group</Badge>
                    <Badge>Location</Badge>
                    <Badge>Object</Badge>
                  </div>
                </GuideSubSection>

                <GuideSubSection title="Creating Characters">
                  <GuideStep number={1} title="Add New Character">
                    Click "Add Character" and choose the element type.
                  </GuideStep>
                  <GuideStep number={2} title="Upload Reference Image">
                    Provide a clear image of the subject.
                  </GuideStep>
                  <GuideStep number={3} title="Add Details">
                    Name, description, and relevant tags.
                  </GuideStep>
                  <GuideStep number={4} title="Use in Generation">
                    Select the character when generating to maintain consistency.
                  </GuideStep>
                </GuideSubSection>

                <GuideTip type="tip">
                  Use high-quality, well-lit reference images for best results. The AI uses 
                  these to maintain subject consistency across generations.
                </GuideTip>
              </GuideSection>

              {/* Section 11: Salesforce Integration */}
              <GuideSection id="salesforce" title="Salesforce Integration" icon={Database}>
                <p className="text-muted-foreground mb-6">
                  All content in the Media Hub is synchronized with Salesforce for comprehensive 
                  asset management and tracking.
                </p>

                <GuideSubSection title="Automatic Sync Features">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Generated Content</div>
                        <div className="text-sm text-muted-foreground">
                          All AI-generated images and videos automatically sync to Salesforce.
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Master-Variant Relationships</div>
                        <div className="text-sm text-muted-foreground">
                          Social Kit variants are linked to their master images.
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Metadata & Tags</div>
                        <div className="text-sm text-muted-foreground">
                          AI-generated descriptions and tags are included in sync.
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Creator Tracking</div>
                        <div className="text-sm text-muted-foreground">
                          Content is linked to the creator contact in Salesforce.
                        </div>
                      </div>
                    </li>
                  </ul>
                </GuideSubSection>

                <GuideTip type="note">
                  Content syncs happen automatically in the background. You can verify sync status 
                  in the asset details or Salesforce directly.
                </GuideTip>
              </GuideSection>

              {/* Footer */}
              <div className="mt-16 pt-8 border-t border-border text-center text-muted-foreground">
                <p className="mb-4">
                  Questions or feedback? Contact the WMC development team.
                </p>
                <Link to="/admin/media">
                  <Button>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Media Hub
                  </Button>
                </Link>
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
          body { font-size: 12pt; }
          h1 { font-size: 24pt; }
          h2 { font-size: 18pt; page-break-after: avoid; }
          h3 { font-size: 14pt; page-break-after: avoid; }
          section { page-break-inside: avoid; }
          .prose { max-width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default UserGuide;
