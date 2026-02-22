import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, Wrench, Video, Zap, CheckCircle2, Circle } from 'lucide-react';
import RacerPortalLayout from '@/components/racer/RacerPortalLayout';
import ScoringCard from '@/components/racer/ScoringCard';
import QualificationTimeline from '@/components/racer/QualificationTimeline';
import { getStepCompletion, getCompletionCount, getStorageKey, STEP_NAMES } from '@/utils/applicationProgress';
import type { RacerMember } from '@/services/racerService';

const scoringDimensions = [
  { label: 'Skill', score: 0, icon: <Target className="w-5 h-5" /> },
  { label: 'Marketability', score: 0, icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'Equipment', score: 0, icon: <Wrench className="w-5 h-5" /> },
  { label: 'Content Potential', score: 0, icon: <Video className="w-5 h-5" /> },
  { label: 'X-Factor', score: 0, icon: <Zap className="w-5 h-5" /> },
];

const timelineSteps = [
  { label: 'Application Submitted', status: 'upcoming' as const, description: 'Complete the 5-step application' },
  { label: 'Video Audition Reviewed', status: 'upcoming' as const, description: 'WMC reviews your audition video' },
  { label: 'Scoring Complete', status: 'upcoming' as const, description: 'All 5 dimensions scored' },
  { label: 'Qualification Decision', status: 'upcoming' as const, description: 'Yes or no -- are you qualified to compete?' },
  { label: 'Select a Race', status: 'upcoming' as const, description: 'Choose an upcoming race and submit your motorcycle details' },
];

const RacerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [racer, setRacer] = useState<RacerMember | null>(null);
  const [stepCompletion, setStepCompletion] = useState<boolean[]>([false, false, false, false, false]);

  useEffect(() => {
    const stored = sessionStorage.getItem('racerUser');
    if (!stored) { navigate('/racer/login'); return; }
    const parsed: RacerMember = JSON.parse(stored);
    setRacer(parsed);

    // Read application progress from localStorage
    const appData = localStorage.getItem(getStorageKey(parsed.id));
    if (appData) {
      try {
        const formData = JSON.parse(appData);
        setStepCompletion(getStepCompletion(formData));
      } catch {}
    }
  }, [navigate]);

  if (!racer) return null;

  const completedCount = stepCompletion.filter(Boolean).length;
  const progressPercent = (completedCount / 5) * 100;
  const statusLabel = completedCount === 0 ? 'Not Started' : completedCount === 5 ? 'Complete' : 'In Progress';
  const badgeVariant = completedCount === 5 ? 'default' : 'secondary';

  return (
    <RacerPortalLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Welcome header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back, {racer.name.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Your racer application overview
          </p>
        </div>

        {/* Application Progress card */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Application Status</p>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {completedCount === 5 ? 'Application Complete' : `${completedCount} of 5 steps complete`}
                </p>
              </div>
              <Badge variant={badgeVariant}>{statusLabel}</Badge>
            </div>

            <Progress value={progressPercent} className="h-2" />

            <ul className="space-y-2">
              {STEP_NAMES.map((name, i) => (
                <li key={name} className="flex items-center gap-2 text-sm">
                  {stepCompletion[i]
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className={stepCompletion[i] ? 'text-foreground' : 'text-muted-foreground'}>{name}</span>
                </li>
              ))}
            </ul>

            <Button asChild size="sm" className="mt-2">
              <Link to="/racer/application">
                {completedCount === 0 ? 'Start Application' : completedCount === 5 ? 'Review Application' : 'Continue Application'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Scoring dimensions */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Qualification Scores</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scoringDimensions.map((d) => (
              <ScoringCard key={d.label} {...d} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Scores will appear after your application is reviewed. 48 grid spots available.
          </p>
        </div>

        {/* Qualification timeline */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Qualification Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <QualificationTimeline steps={timelineSteps} />
          </CardContent>
        </Card>
      </div>
    </RacerPortalLayout>
  );
};

export default RacerDashboard;
