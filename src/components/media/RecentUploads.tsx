import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Clock, Eye, Loader2 } from 'lucide-react';
import VideoPreviewModal from './VideoPreviewModal';
import { fetchVideoContent, VideoContent } from '@/services/videoContentService';

// VideoContent interface is now imported from the service

const RecentUploads: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);
  const [recentUploads, setRecentUploads] = useState<VideoContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const getStatusColor = (status: VideoContent['status']) => {
    switch (status) {
      case 'Synced':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-white" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {video.duration}
                      </div>
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
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {video.views.toLocaleString()}
                        </div>
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