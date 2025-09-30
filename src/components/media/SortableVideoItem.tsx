import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Clock, Eye, GripVertical } from 'lucide-react';
import { VideoContent, getYouTubeThumbnailCandidates } from '@/services/videoContentService';

interface SortableVideoItemProps {
  video: VideoContent;
  index: number;
  onVideoClick: (video: VideoContent) => void;
  getStatusColor: (status: VideoContent['status']) => string;
  viewMode: 'grid' | 'list';
}

const SortableVideoItem: React.FC<SortableVideoItemProps> = ({
  video,
  index,
  onVideoClick,
  getStatusColor,
  viewMode
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const [thumbnailSrc, setThumbnailSrc] = useState(video.thumbnail);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  // Handle thumbnail loading errors by trying fallbacks
  const handleThumbnailError = () => {
    const candidates = (video as any).thumbnailCandidates || 
      (video.youtubeId ? getYouTubeThumbnailCandidates(video.youtubeId) : []);
    
    if (candidates.length > thumbnailIndex + 1) {
      // Try next thumbnail quality
      setThumbnailIndex(thumbnailIndex + 1);
      setThumbnailSrc(candidates[thumbnailIndex + 1]);
    } else {
      // Use fallback placeholder
      setThumbnailSrc('/lovable-uploads/wmc-sizzle-thumbnail.png');
    }
  };

  if (viewMode === 'grid') {
    return (
      <div ref={setNodeRef} style={style} className="relative">
        <Card 
          className={`overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group ${
            isDragging ? 'shadow-2xl ring-2 ring-primary' : ''
          }`}
          onClick={() => onVideoClick(video)}
        >
          {/* Drag handle for grid view */}
          <div 
            className="absolute top-2 left-2 z-20 p-1 bg-black/70 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4 text-white" />
          </div>

          {/* Position badge */}
          <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
            #{video.playlistPosition || index + 1}
          </div>

          <div className="relative">
            <img 
              src={thumbnailSrc} 
              alt={video.title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              onError={handleThumbnailError}
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
      </div>
    );
  }

  // List view
  return (
    <div ref={setNodeRef} style={style}>
      <Card 
        className={`overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group ${
          isDragging ? 'shadow-2xl ring-2 ring-primary' : ''
        }`}
        onClick={() => onVideoClick(video)}
      >
        <div className="flex">
          {/* Drag handle and position */}
          <div className="flex flex-col items-center justify-center p-4 bg-muted/20 min-w-[80px]">
            <div 
              className="p-2 hover:bg-muted/50 rounded cursor-grab active:cursor-grabbing transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-sm font-medium text-primary mt-2">
              #{video.playlistPosition || index + 1}
            </div>
          </div>

          <div className="relative w-48 h-32">
            <img 
              src={thumbnailSrc} 
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={handleThumbnailError}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <PlayCircle className="w-8 h-8 text-white" />
            </div>
            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded flex items-center gap-1">
              <Clock className="w-2 h-2" />
              {video.duration}
            </div>
          </div>
          <CardContent className="flex-1 p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {video.title}
              </h3>
              <Badge 
                variant="outline" 
                className={getStatusColor(video.status)}
              >
                {video.status}
              </Badge>
            </div>
            {video.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {video.description}
              </p>
            )}
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Uploaded {video.uploadedAt}</span>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {video.views.toLocaleString()} views
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </div>
  );
};

export default SortableVideoItem;