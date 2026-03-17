import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MediaNavigation } from '@/components/media/MediaNavigation';
import { ArrowLeft, Video, Image, Music, Loader2, FileText, Download, RefreshCw } from 'lucide-react';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
const isVideoUrl = (url: string | null): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase().split('?')[0];
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
};

interface ContentItem {
  id: string;
  title: string;
  asset_type: string | null;
  thumbnail_url: string | null;
  file_url: string | null;
  file_format: string | null;
}

interface DiaryEntry {
  id: string;
  date: string;
  video_count: number;
  image_count: number;
  audio_count: number;
  summary_text: string | null;
  content_items: ContentItem[];
  salesforce_synced: boolean;
}

const DiaryDetail: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  // Auto-login token handling
  useEffect(() => {
    const token = searchParams.get('token');
    if (token && !user) {
      try {
        const email = atob(token);
        setUser({
          id: email,
          name: email.split('@')[0],
          email,
          status: 'Active',
          mediaHubAccess: 'Viewer',
        });
        // Strip token from URL
        searchParams.delete('token');
        setSearchParams(searchParams, { replace: true });
      } catch {
        console.error('Invalid auto-login token');
      }
    }
  }, [searchParams, user, setUser, setSearchParams]);

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to view this diary entry');
      navigate('/login');
      return;
    }
    if (!date) return;

    const fetchEntry = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('media_diary_entries')
        .select('*')
        .eq('date', date)
        .maybeSingle();

      if (error) {
        toast.error('Failed to load diary entry');
        console.error(error);
      } else if (!data) {
        toast.error('No diary entry found for this date');
        navigate('/mediahub/diary');
        return;
      } else {
        setEntry({
          ...data,
          content_items: (data.content_items as unknown as ContentItem[]) || [],
        });
      }
      setLoading(false);
    };

    fetchEntry();
  }, [user, date, navigate]);

  if (!user) return null;

  const getAssetIcon = (type: string | null) => {
    switch ((type || '').toLowerCase()) {
      case 'video': return <Video className="h-5 w-5 text-primary" />;
      case 'image': return <Image className="h-5 w-5 text-primary/70" />;
      case 'audio': return <Music className="h-5 w-5 text-accent-foreground" />;
      default: return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MediaNavigation />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/mediahub/diary')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Diary
          </Button>
          {entry && (
            <Button
              variant="outline"
              size="sm"
              disabled={regenerating}
              onClick={handleRegenerate}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
              Re-generate
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entry ? (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">
                {format(parseISO(entry.date), 'MMMM d, yyyy')}
              </h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Video className="h-4 w-4" /> {entry.video_count} Videos</span>
                <span className="flex items-center gap-1"><Image className="h-4 w-4" /> {entry.image_count} Images</span>
                <span className="flex items-center gap-1"><Music className="h-4 w-4" /> {entry.audio_count} Audio</span>
                {entry.salesforce_synced && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Synced to Salesforce
                  </span>
                )}
              </div>
            </div>

            {/* Editorial Summary */}
            {entry.summary_text && (
              <Card className="mb-8">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-2">Summary</h2>
                  <p className="text-muted-foreground leading-relaxed">{entry.summary_text}</p>
                </CardContent>
              </Card>
            )}

            {/* Content Items Grid */}
            <h2 className="text-lg font-semibold text-foreground mb-4">Uploaded Content</h2>
            {entry.content_items.length === 0 ? (
              <p className="text-muted-foreground">No content items recorded.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {entry.content_items.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    {item.thumbnail_url && !isVideoUrl(item.thumbnail_url) ? (
                      <div className="aspect-video bg-muted">
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        {getAssetIcon(item.asset_type)}
                      </div>
                    )}
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        {getAssetIcon(item.asset_type)}
                        <p className="text-sm font-medium text-foreground truncate flex-1">{item.title}</p>
                        {item.file_url && (
                          <a
                            href={item.file_url}
                            download={item.title + (item.file_format ? `.${item.file_format}` : '')}
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      {item.file_format && (
                        <p className="text-xs text-muted-foreground mt-1 uppercase">{item.file_format}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default DiaryDetail;
