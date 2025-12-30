import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Sparkles, Clock, Image, Video, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  title: string;
  type: 'upload' | 'image_gen' | 'video_gen';
  status: string;
  timestamp: Date;
  assetType?: string;
}

const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      
      // Fetch recent media assets (uploads)
      const { data: mediaAssets } = await supabase
        .from('media_assets')
        .select('id, title, status, created_at, asset_type, source')
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent image generations
      const { data: imageGens } = await supabase
        .from('image_generations')
        .select('id, prompt, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent video generations
      const { data: videoGens } = await supabase
        .from('video_generations')
        .select('id, generation_data, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      // Combine and transform into activity items
      const allActivities: ActivityItem[] = [];

      // Add media assets
      if (mediaAssets) {
        mediaAssets.forEach(asset => {
          allActivities.push({
            id: `asset-${asset.id}`,
            title: asset.title || 'Untitled Asset',
            type: 'upload',
            status: asset.status || 'pending',
            timestamp: new Date(asset.created_at),
            assetType: asset.asset_type || undefined
          });
        });
      }

      // Add image generations
      if (imageGens) {
        imageGens.forEach(gen => {
          allActivities.push({
            id: `img-${gen.id}`,
            title: gen.prompt?.substring(0, 50) + (gen.prompt && gen.prompt.length > 50 ? '...' : '') || 'Image Generation',
            type: 'image_gen',
            status: gen.status,
            timestamp: new Date(gen.created_at)
          });
        });
      }

      // Add video generations
      if (videoGens) {
        videoGens.forEach(gen => {
          const data = gen.generation_data as { prompt?: string } | null;
          allActivities.push({
            id: `vid-${gen.id}`,
            title: data?.prompt?.substring(0, 50) + ((data?.prompt?.length || 0) > 50 ? '...' : '') || 'Video Generation',
            type: 'video_gen',
            status: gen.status,
            timestamp: new Date(gen.created_at)
          });
        });
      }

      // Sort by timestamp (most recent first) and take top 8
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(allActivities.slice(0, 8));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'success':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
      case 'pending':
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'uploaded':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'error':
      case 'failed':
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const getTypeIcon = (type: string, assetType?: string) => {
    if (type === 'image_gen') {
      return <Sparkles className="w-5 h-5 text-amber-500" />;
    }
    if (type === 'video_gen') {
      return <Video className="w-5 h-5 text-purple-500" />;
    }
    if (assetType === 'video') {
      return <Video className="w-5 h-5 text-blue-500" />;
    }
    if (assetType === 'image') {
      return <Image className="w-5 h-5 text-blue-500" />;
    }
    return <Upload className="w-5 h-5 text-blue-500" />;
  };

  const getTypeLabel = (type: string, assetType?: string) => {
    if (type === 'image_gen') return 'AI Image';
    if (type === 'video_gen') return 'AI Video';
    if (assetType === 'video') return 'Video Upload';
    if (assetType === 'image') return 'Image Upload';
    return 'Upload';
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            Recent Activity
          </h2>
          <Card className="max-w-4xl mx-auto">
            <CardContent className="py-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (activities.length === 0) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            Recent Activity
          </h2>
          <Card className="max-w-4xl mx-auto">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No recent activity yet</p>
              <p className="text-sm mt-2">Start by uploading content or generating AI media</p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            Recent Activity
          </h2>
          
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Latest Uploads & Generations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getTypeIcon(activity.type, activity.assetType)}
                      <div>
                        <h4 className="font-medium text-foreground line-clamp-1">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getTypeLabel(activity.type, activity.assetType)} • {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusColor(activity.status)}>
                      {getStatusText(activity.status)}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default RecentActivity;