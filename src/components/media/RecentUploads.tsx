import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Clock, Eye, Loader2, Video } from 'lucide-react';
import VideoPreviewModal from './VideoPreviewModal';
import { fetchVideoContent, VideoContent } from '@/services/videoContentService';

const RecentUploads: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);
  const [recentUploads, setRecentUploads] = useState<VideoContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set());

  // Fetch video content on component mount
  useEffect(() => {
    const loadRecentUploads = async () => {
      setIsLoading(true);
      try {
        const videos = await fetchVideoContent();
        // Sort by upload date and take the most recent 6 videos
        const sortedVideos = videos
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
          .slice(0, 6);
        setRecentUploads(sortedVideos);
      } catch (error) {
        console.error('Error loading recent uploads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecentUploads();
  }, []);

  const handleThumbnailError = (videoId: string) => {
    setFailedThumbnails(prev => new Set(prev).add(videoId));
  };

  const shouldShowVideoIcon = (video: VideoContent) => {
    // Show video icon if thumbnail failed to load or no thumbnail URL
    if (failedThumbnails.has(video.id)) return true;
    if (!video.thumbnail) return true;
    // Check if it's a placeholder image (which means no real thumbnail)
    if (video.thumbnail.includes('placeholder') || video.thumbnail.includes('lovable-uploads')) return true;
    return false;
  };

  const getStatusColor = (status: VideoContent['status']) => {
    switch (status) {
      case 'Synced':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Draft':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Generated':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading recent uploads...</span>
          </div>
        </div>
      </section>
    );
  }

  if (recentUploads.length === 0) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">Recent Uploads</h2>
          <div className="text-center py-12 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No recent uploads yet</p>
            <p className="text-sm mt-2">Upload videos to see them here</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-foreground">Recent Uploads</h2>
              <Badge variant="outline" className="text-muted-foreground">
                {recentUploads.length} videos
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentUploads.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <Card 
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedVideo(video)}
                  >
                    <div className="relative">
                      {shouldShowVideoIcon(video) ? (
                        <div className="w-full h-48 bg-muted flex items-center justify-center">
                          <div className="text-center">
                            <Video className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                            <span className="text-xs text-muted-foreground">Video</span>
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={() => handleThumbnailError(video.id)}
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-white" />
                      </div>
                      {video.duration && video.duration !== '0:00' && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {video.duration}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(video.status)}
                        >
                          {video.status}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </h3>
                      <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>{video.uploadedAt}</span>
                        {video.views > 0 && (
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {video.views.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <VideoPreviewModal 
        video={selectedVideo}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
};

export default RecentUploads;