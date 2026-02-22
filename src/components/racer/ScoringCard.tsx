import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ScoringCardProps {
  label: string;
  score: number;
  maxScore?: number;
  icon: React.ReactNode;
}

const ScoringCard: React.FC<ScoringCardProps> = ({ label, score, maxScore = 10, icon }) => {
  const pct = (score / maxScore) * 100;

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground">{score}<span className="text-sm text-muted-foreground font-normal">/{maxScore}</span></p>
        </div>
        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoringCard;
