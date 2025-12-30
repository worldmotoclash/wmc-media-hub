import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface GuideSectionProps {
  id: string;
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export const GuideSection: React.FC<GuideSectionProps> = ({
  id,
  title,
  icon: Icon,
  children,
  className
}) => {
  return (
    <section id={id} className={cn("scroll-mt-24 mb-12", className)}>
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-border">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        {children}
      </div>
    </section>
  );
};

interface GuideSubSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const GuideSubSection: React.FC<GuideSubSectionProps> = ({
  title,
  children,
  className
}) => {
  return (
    <div className={cn("mb-8", className)}>
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
};

interface GuideStepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

export const GuideStep: React.FC<GuideStepProps> = ({ number, title, children }) => {
  return (
    <div className="flex gap-4 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-foreground mb-1">{title}</h4>
        <div className="text-muted-foreground text-sm">{children}</div>
      </div>
    </div>
  );
};

interface GuideTipProps {
  type?: 'tip' | 'note' | 'warning';
  children: React.ReactNode;
}

export const GuideTip: React.FC<GuideTipProps> = ({ type = 'tip', children }) => {
  const styles = {
    tip: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    note: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400'
  };

  const labels = {
    tip: '💡 Tip',
    note: '📝 Note',
    warning: '⚠️ Warning'
  };

  return (
    <div className={cn("p-4 rounded-lg border my-4", styles[type])}>
      <span className="font-semibold">{labels[type]}:</span> {children}
    </div>
  );
};

interface GuideTableProps {
  headers: string[];
  rows: string[][];
}

export const GuideTable: React.FC<GuideTableProps> = ({ headers, rows }) => {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((header, i) => (
              <th key={i} className="text-left p-3 font-semibold text-foreground border border-border">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/30">
              {row.map((cell, j) => (
                <td key={j} className="p-3 text-muted-foreground border border-border text-sm">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
