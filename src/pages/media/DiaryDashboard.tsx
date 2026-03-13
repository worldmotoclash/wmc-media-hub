import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MediaNavigation } from '@/components/media/MediaNavigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { CalendarDays, Video, Image, Music, Loader2, RefreshCw, BookOpen } from 'lucide-react';

interface DiaryEntry {
  id: string;
  date: string;
  video_count: number;
  image_count: number;
  audio_count: number;
  summary_text: string | null;
  salesforce_synced: boolean;
  created_at: string;
  week_start: string | null;
}

interface WeeklyGroup {
  weekStart: string;
  entries: DiaryEntry[];
  totalVideos: number;
  totalImages: number;
  totalAudio: number;
  totalItems: number;
  activeDays: number;
}

const DiaryDashboard: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access the Content Diary');
      navigate('/login');
      return;
    }
    fetchEntries();
  }, [user, navigate]);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('media_diary_entries')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      toast.error('Failed to load diary entries');
      console.error(error);
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const generateToday = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-diary-entry', {
        body: { date: new Date().toISOString().split('T')[0] },
      });
      if (error) throw error;
      toast.success(data?.success ? 'Diary entry generated!' : data?.message || 'No content today');
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate diary entry');
    } finally {
      setGenerating(false);
    }
  };

  // Weekly grouping
  const weeklyGroups = useMemo<WeeklyGroup[]>(() => {
    const groups: Record<string, DiaryEntry[]> = {};
    for (const entry of entries) {
      const key = entry.week_start || entry.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    }
    return Object.entries(groups)
      .map(([weekStart, weekEntries]) => ({
        weekStart,
        entries: weekEntries.sort((a, b) => b.date.localeCompare(a.date)),
        totalVideos: weekEntries.reduce((s, e) => s + e.video_count, 0),
        totalImages: weekEntries.reduce((s, e) => s + e.image_count, 0),
        totalAudio: weekEntries.reduce((s, e) => s + e.audio_count, 0),
        totalItems: weekEntries.reduce((s, e) => s + e.video_count + e.image_count + e.audio_count, 0),
        activeDays: weekEntries.length,
      }))
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }, [entries]);

  // Admin metrics
  const totalEntries = entries.length;
  const lastUpdate = entries[0]?.date || null;
  const now = new Date();
  const weekStartDate = startOfWeek(now, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(now, { weekStartsOn: 1 });
  const thisWeekItems = entries
    .filter((e) => {
      const d = parseISO(e.date);
      return d >= weekStartDate && d <= weekEndDate;
    })
    .reduce((sum, e) => sum + e.video_count + e.image_count + e.audio_count, 0);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <MediaNavigation />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              Content Diary
            </h1>
            <p className="text-muted-foreground mt-1">Daily record of media uploads</p>
          </div>
          <Button onClick={generateToday} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Generate Today's Entry
          </Button>
        </div>

        {/* Admin Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{totalEntries}</p>
              <p className="text-sm text-muted-foreground">Total Entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {lastUpdate ? format(parseISO(lastUpdate), 'MMM d, yyyy') : '—'}
              </p>
              <p className="text-sm text-muted-foreground">Last Update</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{thisWeekItems}</p>
              <p className="text-sm text-muted-foreground">Media Items This Week</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Views */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No diary entries yet</p>
              <p className="text-sm mt-1">Click "Generate Today's Entry" to create the first one.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="daily">
            <TabsList className="mb-6">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
            </TabsList>

            {/* Daily View */}
            <TabsContent value="daily">
              <div className="space-y-3">
                {entries.map((entry) => {
                  const total = entry.video_count + entry.image_count + entry.audio_count;
                  return (
                    <Card
                      key={entry.id}
                      className="cursor-pointer hover:border-primary/30 transition-colors"
                      onClick={() => navigate(`/mediahub/diary/${entry.date}`)}
                    >
                      <CardContent className="p-5 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {format(parseISO(entry.date), 'MMMM d, yyyy')}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Video className="h-3.5 w-3.5" /> {entry.video_count} Videos
                            </span>
                            <span className="flex items-center gap-1">
                              <Image className="h-3.5 w-3.5" /> {entry.image_count} Images
                            </span>
                            <span className="flex items-center gap-1">
                              <Music className="h-3.5 w-3.5" /> {entry.audio_count} Audio
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-primary">{total}</span>
                          <p className="text-xs text-muted-foreground">items</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Weekly View */}
            <TabsContent value="weekly">
              <Accordion type="multiple" className="space-y-3">
                {weeklyGroups.map((week) => (
                  <AccordionItem key={week.weekStart} value={week.weekStart} className="border rounded-lg bg-card">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full mr-4">
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-foreground">
                            Week of {format(parseISO(week.weekStart), 'MMM d, yyyy')}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Video className="h-3.5 w-3.5" /> {week.totalVideos}
                            </span>
                            <span className="flex items-center gap-1">
                              <Image className="h-3.5 w-3.5" /> {week.totalImages}
                            </span>
                            <span className="flex items-center gap-1">
                              <Music className="h-3.5 w-3.5" /> {week.totalAudio}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" /> {week.activeDays} days
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-primary">{week.totalItems}</span>
                          <p className="text-xs text-muted-foreground">items</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-4">
                      <div className="space-y-2 pt-2 border-t border-border">
                        {week.entries.map((entry) => {
                          const total = entry.video_count + entry.image_count + entry.audio_count;
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => navigate(`/mediahub/diary/${entry.date}`)}
                            >
                              <div>
                                <p className="font-medium text-foreground">
                                  {format(parseISO(entry.date), 'EEEE, MMM d')}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  <span>{entry.video_count}V</span>
                                  <span>{entry.image_count}I</span>
                                  <span>{entry.audio_count}A</span>
                                </div>
                              </div>
                              <span className="text-lg font-semibold text-primary">{total}</span>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default DiaryDashboard;
