import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Eye, Calendar } from 'lucide-react';
import { VideoContent } from '@/services/videoContentService';

interface VideoPreviewModalProps {
  video: VideoContent | null;
  isOpen: boolean;
  onClose: () => void;
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ video, isOpen, onClose }) => {
  if (!video) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground pr-8">
            {video.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {video.videoSrc ? (
              <iframe
                src={video.videoSrc}
                title={video.title}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
          </div>
          
          {/* Video Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <Badge 
                variant="outline" 
                className={getStatusColor(video.status)}
              >
                {video.status}
              </Badge>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{video.duration}</span>
              </div>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Eye className="w-4 h-4" />
                <span>{video.views.toLocaleString()} views</span>
              </div>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Uploaded {video.uploadedAt}</span>
              </div>
            </div>
            
            {/* Status-specific information */}
            {video.status === 'Error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">
                  <strong>Upload Error:</strong> There was an issue processing this video. Please try re-uploading or contact support.
                </p>
              </div>
            )}
            
            {video.status === 'Draft' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <strong>Draft Status:</strong> This video is not yet published. Review and publish when ready.
                </p>
              </div>
            )}
            
            {video.status === 'Processing' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">
                  <strong>Processing:</strong> This video is currently being processed and will be available shortly.
                </p>
              </div>
            )}
            
            {video.status === 'Synced' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  <strong>Published:</strong> This video is live and available to viewers.
                </p>
              </div>
            )}

            {/* Additional video metadata */}
            {video.description && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Description</h4>
                <p className="text-muted-foreground text-sm">{video.description}</p>
              </div>
            )}

            {video.tags && video.tags.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {video.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPreviewModal;