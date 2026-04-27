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
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Detect known-bad characters in the source URL that Wasabi/Cloudflare won't serve.
  const srcLooksProblematic = !!video?.videoSrc && (
    /:[^/]*\.[a-z0-9]+$/i.test(video.videoSrc) ||      // colon in filename
    /\*/.test(video.videoSrc) ||                        // asterisk
    /\.m4v(\?|$)/i.test(video.videoSrc)                 // m4v container
  );

  const initialTags: MediaTag[] = (video?.tags || []).map((name, i) => ({
    id: `string-tag-${i}-${name}`,
    name,
    description: '',
    color: '#6366f1',
  }));

  const editableFields = useEditableAssetFields({
    assetId: video?.id,
    initialTitle: video?.title,
    initialDescription: video?.description,
    initialTags,
    onAssetUpdated: onVideoUpdated,
  });

  if (!video) return null;

  const getStatusColor = (status: VideoContent['status']) => {
    switch (status) {
      case 'Synced': return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Error': return 'bg-red-100 text-red-800 border-red-200';
      case 'Processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const captureVideoFrame = async (): Promise<string | null> => {
    if (videoRef.current) {
      const videoElement = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      return dataUrl.split(',')[1];
    }
    if (video.thumbnail) {
      try {
        const response = await fetch(video.thumbnail);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => { resolve((reader.result as string).split(',')[1]); };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch { return null; }
    }
    return null;
  };

  const handleCreateThumbnail = async () => {
    if (!video.id) { toast.error('Video ID not available'); return; }
    setIsCreatingThumbnail(true);
    try {
      const thumbnailBase64 = await captureVideoFrame();
      if (!thumbnailBase64) { toast.error('Could not capture video frame.'); return; }
      toast.info('Creating thumbnail in Salesforce...', { duration: 5000 });
      const { data, error } = await supabase.functions.invoke('create-video-thumbnail', {
        body: { videoSalesforceId: video.id, videoTitle: video.title, thumbnailImageBase64: thumbnailBase64, mimeType: 'image/jpeg' }
      });
      if (error) { toast.error('Failed to create thumbnail', { description: error.message }); return; }
      if (data?.success) { toast.success('Thumbnail created!', { description: `ID: ${data.thumbnailSalesforceId}` }); }
      else { toast.error(data?.error || 'Failed to create thumbnail'); }
    } finally { setIsCreatingThumbnail(false); }
  };

  const handleReanalyze = async () => {
    if (!video.id || !video.videoSrc) { toast.error('Video URL not available'); return; }
    const isLocalAsset = video.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (!isLocalAsset) { toast.error('Cannot re-analyze Salesforce-only assets'); return; }
    setIsAnalyzing(true);
    toast.info('Starting AI analysis...', { duration: 3000 });
    try {
      const { data, error } = await supabase.functions.invoke('auto-tag-media-asset', {
        body: { assetId: video.id, mediaUrl: video.thumbnail || video.videoSrc, mediaType: 'video' }
      });
      if (error) { toast.error('Failed to analyze video', { description: error.message }); return; }
      if (data?.success) {
        toast.success('AI analysis complete!', { description: `Applied ${data.tagCount} tags` });
        await editableFields.refreshFromDB();
        onVideoUpdated?.();
      } else { toast.error(data?.error || 'Analysis failed'); }
    } catch { toast.error('Failed to analyze video'); }
    finally { setIsAnalyzing(false); }
  };

  const isYouTube = video.contentType === 'Youtube' || video.youtubeId;
  const isLocalAsset = video.id?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground pr-8">
            {editableFields.isEditing ? editableFields.localTitle : video.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Video Player */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
            {video.videoSrc ? (
              isYouTube ? (
                <iframe ref={iframeRef} src={video.youtubeId ? `https://www.youtube.com/embed/${video.youtubeId}?autoplay=0&rel=0&modestbranding=1` : video.videoSrc} title={video.title} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              ) : (
                <video
                  ref={videoRef}
                  src={video.videoSrc}
                  title={video.title}
                  className="w-full h-full"
                  controls
                  preload="metadata"
                  crossOrigin="anonymous"
                  onError={() => setPlaybackError(
                    srcLooksProblematic
                      ? "This file's name contains characters Wasabi can't serve over HTTP (e.g. ':' or '*'), or uses .m4v which most browsers can't play. An admin can repair it from the asset details drawer (\"Fix Filename\")."
                      : "Unable to play this file. The source may be missing or the format isn't supported by your browser."
                  )}
                >
                  Your browser does not support the video tag.
                </video>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center"><img src={video.thumbnail} alt={video.title} className="max-w-full max-h-full object-contain" /></div>
            )}
            {playbackError && (
              <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-6">
                <div className="max-w-md text-center space-y-3">
                  <p className="text-sm text-white">{playbackError}</p>
                  {video.videoSrc && (
                    <Button size="sm" variant="outline" onClick={() => window.open(video.videoSrc, '_blank')}>
                      Open file directly
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Video Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-4 items-center">
                <Badge variant="outline" className={getStatusColor(video.status)}>{video.status}</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="w-4 h-4" /><span>{video.duration}</span></div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground"><Eye className="w-4 h-4" /><span>{video.views.toLocaleString()} views</span></div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="w-4 h-4" /><span>Uploaded {video.uploadedAt}</span></div>
              </div>
              <div className="flex gap-2">
                {isLocalAsset && (
                  <Button variant="outline" size="sm" onClick={handleReanalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Analyzing...</> : <><Sparkles className="w-4 h-4 mr-1" />Re-analyze</>}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleCreateThumbnail} disabled={isCreatingThumbnail}>
                  {isCreatingThumbnail ? <><Loader2 className="w-4 h-4 animate-spin mr-1" />Creating...</> : <><Image className="w-4 h-4 mr-1" />Create Thumbnail</>}
                </Button>
              </div>
            </div>

            {/* Editable Title, Description & Tags */}
            <EditableDescriptionTags
              localTitle={editableFields.localTitle}
              setLocalTitle={editableFields.setLocalTitle}
              localDescription={editableFields.localDescription}
              setLocalDescription={editableFields.setLocalDescription}
              localTags={editableFields.localTags}
              availableTags={editableFields.availableTags}
              isEditing={editableFields.isEditing}
              isSaving={editableFields.isSaving}
              newTagInput={editableFields.newTagInput}
              setNewTagInput={editableFields.setNewTagInput}
              canEdit={editableFields.canEdit}
              onStartEditing={editableFields.startEditing}
              onCancelEditing={editableFields.cancelEditing}
              onRemoveTag={editableFields.removeTag}
              onAddTag={editableFields.addTag}
              onAddTagFromExisting={editableFields.addTagFromExisting}
              onSave={editableFields.handleSave}
            />

            <div className="text-xs text-muted-foreground border-t pt-4">
              <span>Salesforce ID: <a href={`https://worldmotoclash.my.salesforce.com/${video.id.replace(/^sf_/, '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">{video.id.replace(/^sf_/, '')}</a></span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPreviewModal;
