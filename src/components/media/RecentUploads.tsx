import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Clock, Eye } from 'lucide-react';
import VideoPreviewModal from './VideoPreviewModal';

interface VideoUpload {
  id: string;
  title: string;
  thumbnail: string;
  status: 'Draft' | 'Synced' | 'Error';
  duration: string;
  uploadedAt: string;
  views: number;
  videoSrc?: string;
}

const RecentUploads: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoUpload | null>(null);

  // Mock data for recent uploads
  const recentUploads: VideoUpload[] = [
    {
      id: '1',
      title: 'Laguna Seca Highlights - Race Day 1',
      thumbnail: '/lovable-uploads/sonoma-chicane.jpeg',
      status: 'Synced',
      duration: '3:45',
      uploadedAt: '2 hours ago',
      views: 1247,
      videoSrc: 'https://www.youtube.com/embed/mVkp_elkgQk'
    },
    {
      id: '2',
      title: 'Behind the Scenes - Team Preparation',
      thumbnail: '/lovable-uploads/moto-grid.jpg',
      status: 'Draft',
      duration: '8:12',
      uploadedAt: '4 hours ago',
      views: 0,
      videoSrc: 'https://www.youtube.com/embed/Ka2X73qTQ5Y'
    },
    {
      id: '3',
      title: 'Road America Drone Footage',
      thumbnail: '/lovable-uploads/road-america-drone.jpg',
      status: 'Synced',
      duration: '2:30',
      uploadedAt: '1 day ago',
      views: 892,
      videoSrc: 'https://www.youtube.com/embed/mVkp_elkgQk'
    },
    {
      id: '4',
      title: 'Miguel Victory Podium Celebration',
      thumbnail: '/lovable-uploads/miguel-podium.jpg',
      status: 'Error',
      duration: '1:15',
      uploadedAt: '2 days ago',
      views: 0
    },
    {
      id: '5',
      title: 'Sonoma Raceway Overview',
      thumbnail: '/lovable-uploads/sonoma-drone.jpg',
      status: 'Synced',
      duration: '4:22',
      uploadedAt: '3 days ago',
      views: 1556
    },
    {
      id: '6',
      title: 'COTA Track Analysis',
      thumbnail: '/lovable-uploads/cota-drone.png',
      status: 'Draft',
      duration: '6:08',
      uploadedAt: '1 week ago',
      views: 0
    }
  ];

  const getStatusColor = (status: VideoUpload['status']) => {
    switch (status) {
      case 'Synced':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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