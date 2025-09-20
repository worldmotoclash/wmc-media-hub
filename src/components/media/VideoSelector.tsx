import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Play, Clock, HardDrive, FileVideo } from 'lucide-react';
import { fetchAllMediaAssets, MediaAsset } from '@/services/unifiedMediaService';

interface VideoSelectorProps {
  onVideoSelect: (video: MediaAsset) => void;
  selectedVideo?: MediaAsset | null;
}

export default function VideoSelector({ onVideoSelect, selectedVideo }: VideoSelectorProps) {
  const [videos, setVideos] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadVideos();
  }, [searchQuery]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      // Filter for video assets from S3 sources
      const filters = {
        sources: ['s3_bucket', 'generated'],
        fileFormats: ['mp4', 'mov', 'avi', 'webm', 'mkv']
      };

      const { assets, total: totalCount } = await fetchAllMediaAssets(
        searchQuery,
        filters,
        50, // Show more videos for selection
        0
      );

      // Filter to only include videos with valid file URLs
      const videoAssets = assets.filter(asset => 
        asset.fileUrl && 
        asset.fileFormat && 
        ['mp4', 'mov', 'avi', 'webm', 'mkv'].some(format => 
          asset.fileFormat?.toLowerCase().includes(format)
        )
      );

      setVideos(videoAssets);
      setTotal(totalCount);
    } catch (error) {
      console.error('Error loading videos:', error);
      setVideos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown duration';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search videos by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Found {videos.length} videos {total > videos.length && `(showing first ${videos.length} of ${total})`}
      </div>

      {videos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileVideo className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              {searchQuery ? 'No videos found matching your search.' : 'No videos available in your media library.'}
            </p>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Videos must be stored in S3 buckets to be processed for scene detection.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {videos.map((video) => (
            <Card
              key={video.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedVideo?.id === video.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onVideoSelect(video)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-16 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                        <Play className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{video.title}</h3>
                    {video.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(video.duration)}
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {formatFileSize(video.fileSize)}
                      </div>
                      {video.resolution && (
                        <span>{video.resolution}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {video.source === 's3_bucket' ? 'S3' : video.source}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {video.fileFormat}
                      </Badge>
                      {video.status && (
                        <Badge 
                          variant={video.status === 'approved' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {video.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}