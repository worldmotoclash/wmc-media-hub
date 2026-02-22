import React from 'react';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStep {
  label: string;
  status: 'complete' | 'current' | 'upcoming';
  description?: string;
}

interface QualificationTimelineProps {
  steps: TimelineStep[];
}

const QualificationTimeline: React.FC<QualificationTimelineProps> = ({ steps }) => {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            {step.status === 'complete' && (
              <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />
            )}
            {step.status === 'current' && (
              <Clock className="w-6 h-6 text-primary flex-shrink-0 animate-pulse" />
            )}
            {step.status === 'upcoming' && (
              <Circle className="w-6 h-6 text-muted-foreground/40 flex-shrink-0" />
            )}
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'w-0.5 flex-1 min-h-[24px] my-1',
                  step.status === 'complete' ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </div>
          <div className="pb-6">
            <p
              className={cn(
                'text-sm font-medium',
                step.status === 'complete' && 'text-foreground',
                step.status === 'current' && 'text-primary',
                step.status === 'upcoming' && 'text-muted-foreground'
              )}
            >
              {step.label}
            </p>
            {step.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QualificationTimeline;
