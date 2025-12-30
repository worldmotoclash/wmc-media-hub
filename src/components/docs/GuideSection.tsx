import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type RoleType = 'everyone' | 'viewer' | 'editor' | 'admin';

const roleStyles: Record<RoleType, { bg: string; text: string; border: string; label: string; description: string }> = {
  everyone: { 
    bg: 'bg-emerald-500/10', 
    text: 'text-emerald-600 dark:text-emerald-400', 
    border: 'border-emerald-500/30',
    label: 'Everyone',
    description: 'Available to all users'
  },
  viewer: { 
    bg: 'bg-blue-500/10', 
    text: 'text-blue-600 dark:text-blue-400', 
    border: 'border-blue-500/30',
    label: 'Viewer',
    description: 'Read-only access'
  },
  editor: { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-600 dark:text-amber-400', 
    border: 'border-amber-500/30',
    label: 'Editor',
    description: 'Content creation & editing'
  },
  admin: { 
    bg: 'bg-red-500/10', 
    text: 'text-red-600 dark:text-red-400', 
    border: 'border-red-500/30',
    label: 'Admin',
    description: 'Full system access'
  },
};

interface GuideSectionProps {
  id: string;
  title: string;
  icon?: LucideIcon;
  role?: RoleType;
  children: React.ReactNode;
  className?: string;
}

export const GuideSection: React.FC<GuideSectionProps> = ({
  id,
  title,
  icon: Icon,
  role,
  children,
  className
}) => {
  const style = role ? roleStyles[role] : null;

  return (
    <section id={id} className={cn("scroll-mt-24 mb-12", className)}>
      <div className={cn(
        "flex items-center gap-3 mb-6 pb-3 border-b",
        style ? style.border : "border-border"
      )}>
        {Icon && (
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            style ? style.bg : "bg-primary/10"
          )}>
            <Icon className={cn("w-5 h-5", style ? style.text : "text-primary")} />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            {style && (
              <Badge variant="outline" className={cn("text-xs", style.border, style.text)}>
                {style.label}
              </Badge>
            )}
          </div>
          {style && (
            <p className={cn("text-xs mt-0.5", style.text)}>{style.description}</p>
          )}
        </div>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        {children}
      </div>
    </section>
  );
};

// Role Category Header for major section dividers
interface RoleCategoryHeaderProps {
  id: string;
  title: string;
  role: RoleType;
  icon: LucideIcon;
  description: string;
  includesRoles?: RoleType[];
}

export const RoleCategoryHeader: React.FC<RoleCategoryHeaderProps> = ({
  id,
  title,
  role,
  icon: Icon,
  description,
  includesRoles
}) => {
  const style = roleStyles[role];

  return (
    <div id={id} className={cn(
      "scroll-mt-24 mb-8 p-6 rounded-xl border-2",
      style.border,
      style.bg
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center",
          style.bg,
          "border",
          style.border
        )}>
          <Icon className={cn("w-7 h-7", style.text)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className={cn("text-2xl font-bold", style.text)}>{title}</h2>
            <Badge variant="outline" className={cn(style.border, style.text)}>
              {style.label} Access
            </Badge>
          </div>
          <p className="text-muted-foreground">{description}</p>
          {includesRoles && includesRoles.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-medium">Includes:</span>{' '}
              {includesRoles.map(r => roleStyles[r].label).join(' + ')} capabilities
            </p>
          )}
        </div>
      </div>
    </div>
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
