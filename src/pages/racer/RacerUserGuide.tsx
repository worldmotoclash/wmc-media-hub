import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  LogIn,
  LayoutDashboard,
  FileText,
  Bike,
  Trophy,
  User,
  Search,
  Download,
  X,
  Sparkles,
  Camera,
  Upload,
  CheckCircle,
  Clock,
  CreditCard,
  Share2,
  ShieldCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import RacerPortalLayout from '@/components/racer/RacerPortalLayout';
import { GuideTOC } from '@/components/docs/GuideTOC';
import {
  GuideSection,
  GuideSubSection,
  GuideStep,
  GuideTip,
  GuideTable,
  RoleCategoryHeader,
} from '@/components/docs/GuideSection';

function highlightMatches(element: Element, query: string) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (
      node.parentElement?.tagName === 'MARK' ||
      node.parentElement?.tagName === 'SCRIPT' ||
      node.parentElement?.tagName === 'STYLE'
    )
      continue;
    if (node.textContent && node.textContent.toLowerCase().includes(query.toLowerCase())) {
      textNodes.push(node as Text);
    }
  }
  textNodes.forEach((textNode) => {
    const text = textNode.textContent || '';
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    if (parts.length <= 1) return;
    const fragment = document.createDocumentFragment();
    parts.forEach((part) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        const mark = document.createElement('mark');
        mark.setAttribute('data-search-highlight', 'true');
        mark.className =
          'bg-yellow-300 dark:bg-yellow-500/40 text-foreground rounded-sm px-0.5';
        mark.textContent = part;
        fragment.appendChild(mark);
      } else {
        fragment.appendChild(document.createTextNode(part));
      }
    });
    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}

const tocItems = [
  { id: 'getting-started-cat', title: 'Getting Started', isCategory: true, role: 'everyone' as const },
  { id: 'welcome', title: 'Welcome & Overview' },
  { id: 'logging-in', title: 'Logging In' },
  { id: 'navigating', title: 'Navigating the Portal' },

  { id: 'dashboard-cat', title: 'Your Dashboard', isCategory: true, role: 'viewer' as const },
  { id: 'dashboard-overview', title: 'Dashboard Overview' },
  { id: 'qualification-status', title: 'Tracking Your Status' },

  { id: 'application-cat', title: 'Application Wizard', isCategory: true, role: 'creator' as const },
  { id: 'application-flow', title: '6-Step Application' },
  { id: 'personal-info', title: 'Personal Information' },
  { id: 'experience-level', title: 'Experience Level' },
  { id: 'social-handles', title: 'Social Media Handles' },
  { id: 'saving-progress', title: 'Saving & Salesforce Sync' },

  { id: 'motorcycle-cat', title: 'Motorcycle Details', isCategory: true, role: 'creator' as const },
  { id: 'bike-info', title: 'Adding Your Bike' },
  { id: 'media-albums', title: 'Photos & Albums' },

  { id: 'qualification-cat', title: 'Qualification', isCategory: true, role: 'editor' as const },
  { id: 'qualification-steps', title: '5-Step Sequence' },
  { id: 'audition-uploads', title: 'Audition Submissions' },
  { id: 'entry-fee', title: 'Entry Fee Confirmation' },

  { id: 'profile-cat', title: 'Your Profile', isCategory: true, role: 'admin' as const },
  { id: 'editing-profile', title: 'Editing Personal Info' },
  { id: 'session', title: 'Sign Out & Session' },
];

const RacerUserGuide: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [visibleSections, setVisibleSections] = React.useState<Set<string>>(
    new Set(tocItems.map((i) => i.id))
  );

  React.useEffect(() => {
    const racerUser = sessionStorage.getItem('racerUser');
    if (!racerUser) {
      navigate('/racer/login');
    }
  }, [navigate]);

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setVisibleSections(new Set(tocItems.map((i) => i.id)));
      contentRef.current
        ?.querySelectorAll('mark[data-search-highlight]')
        .forEach((mark) => {
          const parent = mark.parentNode;
          if (parent) {
            parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
            parent.normalize();
          }
        });
      return;
    }

    const query = searchQuery.toLowerCase();
    const visible = new Set<string>();
    contentRef.current
      ?.querySelectorAll('mark[data-search-highlight]')
      .forEach((mark) => {
        const parent = mark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
          parent.normalize();
        }
      });

    contentRef.current?.querySelectorAll('[data-section-id]').forEach((section) => {
      const sectionId = section.getAttribute('data-section-id');
      const textContent = section.textContent?.toLowerCase() || '';
      if (textContent.includes(query) && sectionId) {
        visible.add(sectionId);
        for (let idx = tocItems.findIndex((t) => t.id === sectionId); idx >= 0; idx--) {
          if (tocItems[idx].isCategory) {
            visible.add(tocItems[idx].id);
            break;
          }
        }
        highlightMatches(section, searchQuery);
      }
    });

    contentRef.current?.querySelectorAll('[data-category-id]').forEach((header) => {
      const catId = header.getAttribute('data-category-id');
      if (catId && (header.textContent?.toLowerCase() || '').includes(query)) {
        visible.add(catId);
      }
    });

    setVisibleSections(visible);
  }, [searchQuery]);

  React.useEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll('[data-section-id]').forEach((el) => {
      const id = el.getAttribute('data-section-id');
      (el as HTMLElement).style.display = id && visibleSections.has(id) ? '' : 'none';
    });
    contentRef.current.querySelectorAll('[data-category-id]').forEach((el) => {
      const id = el.getAttribute('data-category-id');
      (el as HTMLElement).style.display = id && visibleSections.has(id) ? '' : 'none';
    });
    const hero = contentRef.current.querySelector('[data-guide-hero]');
    if (hero) {
      (hero as HTMLElement).style.display = searchQuery.trim() ? 'none' : '';
    }
  }, [visibleSections, searchQuery]);

  const filteredTocItems = tocItems.filter((item) =>
    !searchQuery.trim() ? true : visibleSections.has(item.id)
  );

  return (
    <RacerPortalLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border -mx-4 lg:-mx-8 px-4 lg:px-8 py-4 mb-6 print:static print:border-none">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">WMC Racer Portal Guide</h1>
                <p className="text-xs text-muted-foreground">
                  Your step-by-step guide to applying, qualifying, and racing
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search guide..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-48 md:w-64 h-9 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="w-4 h-4 mr-2" />
                Print / PDF
              </Button>
            </div>
          </div>
        </header>

        <div className="flex gap-8">
          <GuideTOC items={filteredTocItems} />

          <main className="flex-1 max-w-4xl" ref={contentRef}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {searchQuery && visibleSections.size === 0 && (
                <div className="text-center py-16">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No results found
                  </h3>
                  <p className="text-muted-foreground">
                    No sections match "{searchQuery}". Try a different search term.
                  </p>
                </div>
              )}

              {/* Hero */}
              <div
                data-guide-hero="true"
                className="mb-12 p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
              >
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Welcome, Racer
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  This guide walks you through every part of the WMC Racer Portal — from your
                  first login to qualifying for the grid. Use the table of contents to jump to
                  any stage of your journey.
                </p>

                <div className="grid md:grid-cols-5 gap-4">
                  <a
                    href="#getting-started-cat"
                    className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                  >
                    <LogIn className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Start Here
                    </div>
                    <div className="text-xs text-muted-foreground">Login & basics</div>
                  </a>
                  <a
                    href="#dashboard-cat"
                    className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                  >
                    <LayoutDashboard className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                      Dashboard
                    </div>
                    <div className="text-xs text-muted-foreground">Track your status</div>
                  </a>
                  <a
                    href="#application-cat"
                    className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                  >
                    <FileText className="w-6 h-6 text-cyan-600 dark:text-cyan-400 mb-2" />
                    <div className="font-semibold text-cyan-600 dark:text-cyan-400">
                      Application
                    </div>
                    <div className="text-xs text-muted-foreground">6-step wizard</div>
                  </a>
                  <a
                    href="#motorcycle-cat"
                    className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                  >
                    <Bike className="w-6 h-6 text-amber-600 dark:text-amber-400 mb-2" />
                    <div className="font-semibold text-amber-600 dark:text-amber-400">
                      Motorcycle
                    </div>
                    <div className="text-xs text-muted-foreground">Bike & photos</div>
                  </a>
                  <a
                    href="#qualification-cat"
                    className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                  >
                    <Trophy className="w-6 h-6 text-red-600 dark:text-red-400 mb-2" />
                    <div className="font-semibold text-red-600 dark:text-red-400">
                      Qualification
                    </div>
                    <div className="text-xs text-muted-foreground">5-step path</div>
                  </a>
                </div>
              </div>

              {/* GETTING STARTED */}
              <RoleCategoryHeader
                id="getting-started-cat"
                title="Getting Started"
                role="everyone"
                icon={LogIn}
                description="The basics every racer needs before diving in: how to log in, what's on each screen, and how the portal is organized."
              />

              <GuideSection id="welcome" title="Welcome & Overview" icon={Sparkles} role="everyone">
                <p className="text-muted-foreground mb-4">
                  The WMC Racer Portal is your home base for joining World Moto Clash. It's where
                  you complete your application, register your motorcycle, submit audition footage,
                  and track your progress toward earning a spot on the grid.
                </p>
                <p className="text-muted-foreground mb-4">
                  Everything you enter here syncs directly into our official racer database, so
                  judges and event staff always see your latest information.
                </p>
                <GuideTip type="tip">
                  Use the search bar at the top of this guide to jump straight to any topic — for
                  example, search "audition" or "PayPal".
                </GuideTip>
              </GuideSection>

              <GuideSection id="logging-in" title="Logging In" icon={LogIn} role="everyone">
                <p className="text-muted-foreground mb-4">
                  You'll receive your login credentials by email after registering interest. The
                  portal uses your email and a personal racer password (separate from any other
                  WMC system).
                </p>
                <GuideStep number={1} title="Visit the racer login page">
                  Go to <code className="bg-muted px-2 py-1 rounded text-sm">/racer/login</code>{' '}
                  (or the racer subdomain you were sent).
                </GuideStep>
                <GuideStep number={2} title="Enter your email and password">
                  Both fields are required. Passwords are case-sensitive.
                </GuideStep>
                <GuideStep number={3} title="You'll land on the Dashboard">
                  Successful login stores your session for the browser tab and takes you straight
                  to your personal dashboard.
                </GuideStep>
                <GuideTip type="warning">
                  If you close the browser tab you'll need to log in again. Sessions don't persist
                  across full browser restarts.
                </GuideTip>
              </GuideSection>

              <GuideSection
                id="navigating"
                title="Navigating the Portal"
                icon={LayoutDashboard}
                role="everyone"
              >
                <p className="text-muted-foreground mb-4">
                  Once logged in, the sidebar (or top scroll bar on mobile) gives you access to
                  every area:
                </p>
                <GuideTable
                  headers={['Section', 'What it does']}
                  rows={[
                    ['Dashboard', 'Snapshot of your application + qualification status'],
                    ['Application', 'The 6-step wizard for your racer profile'],
                    ['Motorcycle', 'Add your bike(s) and upload required photos'],
                    ['Qualification', 'Submit auditions, pay entry fees, track approvals'],
                    ['Profile', 'Update your personal details and social handles'],
                  ]}
                />
              </GuideSection>

              {/* DASHBOARD */}
              <RoleCategoryHeader
                id="dashboard-cat"
                title="Your Dashboard"
                role="viewer"
                icon={LayoutDashboard}
                description="A quick view of where you are in the application and qualification process."
              />

              <GuideSection
                id="dashboard-overview"
                title="Dashboard Overview"
                icon={LayoutDashboard}
                role="viewer"
              >
                <p className="text-muted-foreground mb-4">
                  Your dashboard shows three key things at a glance: how complete your application
                  is, where you stand in the qualification timeline, and any actions waiting for
                  you.
                </p>
                <GuideSubSection title="Application progress">
                  <p className="text-muted-foreground">
                    A progress bar shows how many of the six application steps you've completed.
                    Click into any step to pick up where you left off.
                  </p>
                </GuideSubSection>
                <GuideSubSection title="Qualification timeline">
                  <p className="text-muted-foreground">
                    A visual 5-step timeline highlights your current stage — from initial
                    submission through final approval.
                  </p>
                </GuideSubSection>
              </GuideSection>

              <GuideSection
                id="qualification-status"
                title="Tracking Your Status"
                icon={CheckCircle}
                role="viewer"
              >
                <p className="text-muted-foreground mb-4">
                  Status updates flow back from our reviewers automatically. Refresh the
                  dashboard at any time to see the latest.
                </p>
                <GuideTip type="note">
                  Reviewer feedback can take a few business days. We'll always show the most
                  recent status from our system.
                </GuideTip>
              </GuideSection>

              {/* APPLICATION */}
              <RoleCategoryHeader
                id="application-cat"
                title="Application Wizard"
                role="creator"
                icon={FileText}
                description="A guided 6-step form that builds your official racer profile. Each step saves automatically."
              />

              <GuideSection
                id="application-flow"
                title="The 6-Step Application"
                icon={FileText}
                role="creator"
              >
                <p className="text-muted-foreground mb-4">
                  The application is broken into six manageable steps so you can finish it in one
                  sitting or come back any time.
                </p>
                <GuideTable
                  headers={['Step', 'What you will provide']}
                  rows={[
                    ['1. Personal Info', 'Name, contact details, address'],
                    ['2. Experience Level', 'Your racing background'],
                    ['3. Social Media', 'Public handles for Instagram, X, TikTok, etc.'],
                    ['4. Motorcycle', 'Bike make, model, class'],
                    ['5. Photos & Docs', 'Licenses, bike photos, audition videos'],
                    ['6. Review & Submit', 'Confirm everything and lock in your application'],
                  ]}
                />
                <GuideTip type="tip">
                  You can leave and return to any step. The progress bar at the top of each page
                  always shows where you are.
                </GuideTip>
              </GuideSection>

              <GuideSection
                id="personal-info"
                title="Personal Information"
                icon={User}
                role="creator"
              >
                <p className="text-muted-foreground mb-4">
                  Enter your legal name as it appears on your racing license. Other fields
                  include date of birth, mailing address, and emergency contact.
                </p>
                <GuideTip type="warning">
                  Double-check spelling — your name is printed on official credentials.
                </GuideTip>
              </GuideSection>

              <GuideSection
                id="experience-level"
                title="Experience Level"
                icon={Trophy}
                role="creator"
              >
                <p className="text-muted-foreground mb-4">
                  Pick the option that best describes your background. This helps reviewers
                  evaluate your application fairly.
                </p>
                <GuideTable
                  headers={['Level', 'Who it is for']}
                  rows={[
                    ['Beginner', 'New to track riding or club-level racing'],
                    ['Intermediate', 'Regular trackdays, some race experience'],
                    ['Advanced', 'Active club or regional racer'],
                    ['Professional', 'National / international racing background'],
                  ]}
                />
              </GuideSection>

              <GuideSection
                id="social-handles"
                title="Social Media Handles"
                icon={Share2}
                role="creator"
              >
                <p className="text-muted-foreground mb-4">
                  Add your public handles so we can promote you to fans and sponsors.
                </p>
                <GuideTip type="note">
                  Enter just your handle — no @ symbol and no full URL. For example:{' '}
                  <code className="bg-muted px-2 py-1 rounded text-sm">yourname</code> not{' '}
                  <code className="bg-muted px-2 py-1 rounded text-sm">@yourname</code> or{' '}
                  <code className="bg-muted px-2 py-1 rounded text-sm">
                    instagram.com/yourname
                  </code>
                  .
                </GuideTip>
              </GuideSection>

              <GuideSection
                id="saving-progress"
                title="Saving Progress"
                icon={CheckCircle}
                role="creator"
              >
                <p className="text-muted-foreground mb-4">
                  Each step saves to our official racer database the moment you advance. There's
                  no separate "save" button — just complete a step and continue.
                </p>
                <GuideTip type="tip">
                  Sync usually happens within seconds. If you don't see an update right away,
                  refresh the page after about a minute.
                </GuideTip>
              </GuideSection>

              {/* MOTORCYCLE */}
              <RoleCategoryHeader
                id="motorcycle-cat"
                title="Motorcycle Details"
                role="creator"
                icon={Bike}
                description="Tell us about your bike and upload the photos and documents we need to verify it."
              />

              <GuideSection id="bike-info" title="Adding Your Bike" icon={Bike} role="creator">
                <p className="text-muted-foreground mb-4">
                  Provide the make, model, year, displacement, and racing class for the bike you
                  plan to compete on. If you have multiple bikes, you can add each one
                  separately.
                </p>
              </GuideSection>

              <GuideSection
                id="media-albums"
                title="Photos & Albums"
                icon={Camera}
                role="creator"
              >
                <p className="text-muted-foreground mb-4">
                  Uploads are automatically organized into dedicated albums so reviewers can find
                  what they need quickly.
                </p>
                <GuideTable
                  headers={['Album', 'What to upload', 'Suggested format']}
                  rows={[
                    ['Licenses', 'Racing license, ID', 'JPG / PNG / PDF'],
                    ['Bikes', 'Photos of your motorcycle (multiple angles)', 'JPG / PNG'],
                    ['Auditions', 'Onboard / track footage', 'MP4 (up to 500 MB per file)'],
                  ]}
                />
                <GuideTip type="tip">
                  On phone? Tap the upload area and choose "Take photo" or pick from your camera
                  roll. iOS Safari is fully supported.
                </GuideTip>
              </GuideSection>

              {/* QUALIFICATION */}
              <RoleCategoryHeader
                id="qualification-cat"
                title="Qualification"
                role="editor"
                icon={Trophy}
                description="Five clear steps from initial audition to final approval for the WMC grid."
              />

              <GuideSection
                id="qualification-steps"
                title="The 5-Step Qualification Sequence"
                icon={Trophy}
                role="editor"
              >
                <GuideTable
                  headers={['Step', 'Description']}
                  rows={[
                    ['1. Audition Submission', 'Upload your audition footage'],
                    ['2. Initial Review', 'WMC scouts review your submission'],
                    ['3. Entry Fee', 'Confirm and pay your entry fee'],
                    ['4. Final Review', 'Reviewer panel makes a decision'],
                    ['5. Approval', 'You are cleared to race!'],
                  ]}
                />
              </GuideSection>

              <GuideSection
                id="audition-uploads"
                title="Audition Submissions"
                icon={Upload}
                role="editor"
              >
                <p className="text-muted-foreground mb-4">
                  Upload your best onboard or track footage in the Auditions album. Clear video
                  showing race lines and pace gives you the best chance of approval.
                </p>
                <GuideTip type="note">
                  Submissions are tagged automatically with your name and bike so reviewers see
                  full context.
                </GuideTip>
              </GuideSection>

              <GuideSection
                id="entry-fee"
                title="Entry Fee Confirmation"
                icon={CreditCard}
                role="editor"
              >
                <p className="text-muted-foreground mb-4">
                  After your initial review, you'll be prompted to pay the entry fee through
                  PayPal. Once payment is complete, return to the portal and confirm — that
                  unlocks the final review stage.
                </p>
                <GuideTip type="warning">
                  Payment happens on PayPal's site. The portal won't auto-detect your payment, so
                  remember to come back and click "I've paid" to advance.
                </GuideTip>
              </GuideSection>

              {/* PROFILE */}
              <RoleCategoryHeader
                id="profile-cat"
                title="Your Profile"
                role="admin"
                icon={User}
                description="Keep your personal details and social handles current at any time."
              />

              <GuideSection
                id="editing-profile"
                title="Editing Personal Info"
                icon={User}
                role="admin"
              >
                <p className="text-muted-foreground mb-4">
                  The Profile page lets you update anything you entered during the application —
                  contact info, address, social handles, and more. Changes save back to the
                  official racer database immediately.
                </p>
                <GuideTip type="tip">
                  If something looks wrong on your dashboard, the Profile page is the fastest way
                  to fix it.
                </GuideTip>
              </GuideSection>

              <GuideSection
                id="session"
                title="Sign Out & Session"
                icon={ShieldCheck}
                role="admin"
              >
                <p className="text-muted-foreground mb-4">
                  Use the Sign Out button at the bottom of the sidebar (or end of the mobile
                  navigation) to clear your session. Always sign out when using a shared
                  computer.
                </p>
                <GuideTip type="note">
                  Your session lives only in this browser tab — closing the tab logs you out
                  automatically.
                </GuideTip>
              </GuideSection>
            </motion.div>
          </main>
        </div>
      </div>
    </RacerPortalLayout>
  );
};

export default RacerUserGuide;
