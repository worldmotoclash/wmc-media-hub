import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Rocket, Wrench, Bug, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { releaseNotes, type ReleaseNote } from '@/data/releaseNotes';

type CategoryFilter = 'all' | ReleaseNote['category'];

const categoryConfig: Record<ReleaseNote['category'], { label: string; icon: React.ElementType; color: string; badgeClass: string }> = {
  feature: { label: 'Feature', icon: Rocket, color: 'text-emerald-600 dark:text-emerald-400', badgeClass: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
  improvement: { label: 'Improvement', icon: Wrench, color: 'text-blue-600 dark:text-blue-400', badgeClass: 'border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10' },
  fix: { label: 'Fix', icon: Bug, color: 'text-amber-600 dark:text-amber-400', badgeClass: 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10' },
};

const ReleaseNotesPage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access this page');
      navigate('/login');
    }
  }, [user, navigate]);

  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filtered = filter === 'all' ? releaseNotes : releaseNotes.filter(r => r.category === filter);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/media/user-guide">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to User Guide
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Release Notes</h1>
                <p className="text-xs text-muted-foreground">What's new in WMC Media Hub</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-3xl">
        {/* Filter Chips */}
        <div className="flex items-center gap-2 mb-8">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          {(Object.keys(categoryConfig) as ReleaseNote['category'][]).map(cat => {
            const cfg = categoryConfig[cat];
            const Icon = cfg.icon;
            return (
              <Button
                key={cat}
                variant={filter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(cat)}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {cfg.label}
              </Button>
            );
          })}
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-6">
            {filtered.map((release, index) => {
              const cfg = categoryConfig[release.category];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={release.version}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="relative pl-12"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 top-6 w-[15px] h-[15px] rounded-full border-2 border-primary bg-background z-10" />

                  <Card className="border hover:border-primary/20 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            v{release.version}
                          </Badge>
                          <Badge variant="outline" className={cfg.badgeClass}>
                            <Icon className="w-3 h-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{release.date}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-3">{release.title}</h3>
                      <ul className="space-y-2">
                        {release.highlights.map((highlight, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-1 flex-shrink-0">•</span>
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReleaseNotesPage;
