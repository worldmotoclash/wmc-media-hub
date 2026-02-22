import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, Wrench, Video, Zap } from 'lucide-react';
import RacerPortalLayout from '@/components/racer/RacerPortalLayout';
import ScoringCard from '@/components/racer/ScoringCard';
import type { RacerMember } from '@/services/racerService';

const dimensions = [
  { label: 'Skill', score: 0, icon: <Target className="w-5 h-5" /> },
  { label: 'Marketability', score: 0, icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'Equipment', score: 0, icon: <Wrench className="w-5 h-5" /> },
  { label: 'Content Potential', score: 0, icon: <Video className="w-5 h-5" /> },
  { label: 'X-Factor', score: 0, icon: <Zap className="w-5 h-5" /> },
];

const RacerQualification: React.FC = () => {
  const navigate = useNavigate();
  const [racer, setRacer] = useState<RacerMember | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('racerUser');
    if (!stored) { navigate('/racer/login'); return; }
    setRacer(JSON.parse(stored));
  }, [navigate]);

  if (!racer) return null;

  const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0);

  return (
    <RacerPortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Qualification Scores</h2>
          <p className="text-muted-foreground text-sm mt-1">Your scores across 5 evaluation dimensions</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Total Score</p>
            <p className="text-4xl font-bold text-foreground mt-1">{totalScore}<span className="text-lg text-muted-foreground font-normal">/50</span></p>
            <p className="text-xs text-muted-foreground mt-2">Top 48 scorers qualify for the grid</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {dimensions.map((d) => (
            <ScoringCard key={d.label} {...d} />
          ))}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">How Scoring Works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Each dimension is scored 0–10 by the WMC evaluation panel after your application and audition video are reviewed.</p>
            <p>Scores will appear here once the review process is complete. Check back regularly for updates.</p>
          </CardContent>
        </Card>
      </div>
    </RacerPortalLayout>
  );
};

export default RacerQualification;
