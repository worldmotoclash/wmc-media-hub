import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Wrench, Video, Zap } from 'lucide-react';
import RacerPortalLayout from '@/components/racer/RacerPortalLayout';
import ScoringCard from '@/components/racer/ScoringCard';
import QualificationTimeline from '@/components/racer/QualificationTimeline';
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
  { label: 'Qualification Decision', status: 'upcoming' as const, description: 'Top 48 riders selected' },
  { label: 'Grid Position Assigned', status: 'upcoming' as const, description: 'Race day starting position' },
];

const RacerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [racer, setRacer] = useState<RacerMember | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('racerUser');
    if (!stored) { navigate('/racer/login'); return; }
    setRacer(JSON.parse(stored));
  }, [navigate]);

  if (!racer) return null;

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

        {/* Status card */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Application Status</p>
              <p className="text-lg font-semibold text-foreground mt-1">Not Started</p>
            </div>
            <Badge variant="secondary">Pending</Badge>
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
