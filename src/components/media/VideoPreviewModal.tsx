import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Eye, Calendar, Image, Loader2, Sparkles } from 'lucide-react';
import { VideoContent } from '@/services/videoContentService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEditableAssetFields } from '@/hooks/useEditableAssetFields';
import EditableDescriptionTags from './EditableDescriptionTags';
import { MediaTag } from '@/services/unifiedMediaService';
interface VideoPreviewModalProps {
  video: VideoContent | null;
  isOpen: boolean;
  onClose: () => void;
  onVideoUpdated?: () => void;
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({ video, isOpen, onClose, onVideoUpdated }) => {
  const [isCreatingThumbnail, setIsCreatingThumbnail] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Convert string tags to MediaTag objects for the shared hook
  const initialTags: MediaTag[] = (video?.tags || []).map((name, i) => ({
    id: `string-tag-${i}-${name}`,
    name,
    description: '',
    color: '#6366f1',
  }));

  const editableFields = useEditableAssetFields({
    assetId: video?.id,
    initialDescription: video?.description,
    initialTags,
    onAssetUpdated: onVideoUpdated,
  });

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

  const captureVideoFrame = async (): Promise<string | null> => {
    // For non-YouTube videos, capture from the video element
    if (videoRef.current) {
      const videoElement = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Get base64 without the data URL prefix
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      return dataUrl.split(',')[1]; // Return just the base64 part
    }
    
    // For YouTube or when video element isn't available, use the thumbnail
    if (video.thumbnail) {
      try {
        const response = await fetch(video.thumbnail);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error('Failed to fetch thumbnail:', error);
        return null;
      }
    }
    
    return null;
  };

  const handleCreateThumbnail = async () => {
    if (!video.id) {
      toast.error('Video ID not available');
      return;
    }

    setIsCreatingThumbnail(true);
    
    try {
      // Capture the current frame or use existing thumbnail
      const thumbnailBase64 = await captureVideoFrame();
      
      if (!thumbnailBase64) {
        toast.error('Could not capture video frame. Please ensure the video has loaded.');
        return;
      }

      toast.info('Creating thumbnail in Salesforce...', { duration: 5000 });

      const { data, error } = await supabase.functions.invoke('create-video-thumbnail', {
        body: {
          videoSalesforceId: video.id,
          videoTitle: video.title,
          thumbnailImageBase64: thumbnailBase64,
          mimeType: 'image/jpeg'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        // Supabase returns a generic non-2xx message; the real details are in the function JSON.
        toast.error('Failed to create thumbnail', {
          description: error.message,
        });
        return;
      }

      if (data?.success) {
        toast.success('Thumbnail created and linked to video!', {
          description: `Thumbnail ID: ${data.thumbnailSalesforceId}`
        });
      } else {
        const details =
          (data?.engineBody && String(data.engineBody).slice(0, 180)) ||
          data?.details ||
          data?.note ||
          undefined;

        toast.error(data?.error || 'Failed to create thumbnail', {
          description: details,
        });
      }
    } finally {
      setIsCreatingThumbnail(false);
    }
  };

  const handleReanalyze = async () => {
    if (!video.id || !video.videoSrc) {
      toast.error('Video URL not available');
      return;
    }

    // Check if this is a valid UUID (local asset) vs Salesforce ID
    const isLocalAsset = video.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (!isLocalAsset) {
      toast.error('Cannot re-analyze Salesforce-only assets');
      return;
    }

    setIsAnalyzing(true);
    toast.info('Starting AI analysis...', { duration: 3000 });

    try {
      const { data, error } = await supabase.functions.invoke('auto-tag-media-asset', {
        body: {
          assetId: video.id,
          mediaUrl: video.thumbnail || video.videoSrc,
          mediaType: 'video',
        }
      });

      if (error) {
        console.error('Re-analyze error:', error);
        toast.error('Failed to analyze video', { description: error.message });
        return;
      }

      if (data?.success) {
        toast.success('AI analysis complete!', {
          description: `Applied ${data.tagCount} tags: ${data.tagsApplied?.slice(0, 3).join(', ')}${data.tagCount > 3 ? '...' : ''}`
        });
        await editableFields.refreshFromDB();
        onVideoUpdated?.();
      } else {
        toast.error(data?.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Re-analyze error:', err);
      toast.error('Failed to analyze video');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isYouTube = video.contentType === 'Youtube' || video.youtubeId;
  const isLocalAsset = video.id?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

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
              isYouTube ? (
                <iframe
                  ref={iframeRef}
                  src={video.youtubeId 
                    ? `https://www.youtube.com/embed/${video.youtubeId}?autoplay=0&rel=0&modestbranding=1`
                    : video.videoSrc
                  }
                  title={video.title}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={video.videoSrc}
                  title={video.title}
                  className="w-full h-full"
                  controls
                  preload="metadata"
                  crossOrigin="anonymous"
                >
                  Your browser does not support the video tag.
                </video>
              )
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
            <div className="flex flex-wrap gap-4 items-center justify-between">
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

              <div className="flex gap-2">
                {/* Re-analyze Button */}
                {isLocalAsset && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReanalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2"
                    title="Run AI analysis to generate tags"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Re-analyze
                      </>
                    )}
                  </Button>
                )}

                {/* Create Thumbnail Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateThumbnail}
                  disabled={isCreatingThumbnail}
                  className="flex items-center gap-2"
                >
                  {isCreatingThumbnail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Image className="w-4 h-4" />
                      Create Thumbnail
                    </>
                  )}
                </Button>
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


            {/* Editable Description & Tags */}
            <EditableDescriptionTags
              localDescription={editableFields.localDescription}
              setLocalDescription={editableFields.setLocalDescription}
              localTags={editableFields.localTags}
              isEditing={editableFields.isEditing}
              isSaving={editableFields.isSaving}
              newTagInput={editableFields.newTagInput}
              setNewTagInput={editableFields.setNewTagInput}
              canEdit={editableFields.canEdit}
              onStartEditing={editableFields.startEditing}
              onCancelEditing={editableFields.cancelEditing}
              onRemoveTag={editableFields.removeTag}
              onAddTag={editableFields.addTag}
              onSave={editableFields.handleSave}
            />

            {/* Salesforce ID info */}
            <div className="text-xs text-muted-foreground border-t pt-4">
              <span>Salesforce ID: {video.id}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPreviewModal;