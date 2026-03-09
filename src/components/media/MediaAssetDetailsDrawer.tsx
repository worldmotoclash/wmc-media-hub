import React, { useState, useEffect } from 'react';
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  X, Video, Image, Music, MapPin, Sparkles, Clock,
  HardDrive, Calendar, ExternalLink, CheckCircle, AlertTriangle,
  Gauge, Link2, Eye, Wand2, Mic, Pencil, Loader2
} from "lucide-react";
import { Save } from "lucide-react";
import { MediaAsset } from "@/services/unifiedMediaService";
import { AudioToVideoWorkflow } from "./AudioToVideoWorkflow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEditableAssetFields } from '@/hooks/useEditableAssetFields';
import EditableDescriptionTags from './EditableDescriptionTags';

interface MediaAssetDetailsDrawerProps {
  asset: MediaAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview?: (asset: MediaAsset) => void;
  onAssetUpdated?: () => void;
}

interface SfdcAnalysis {
  description?: string;
  categories?: string[];
  contentType?: string;
  location?: string;
  mood?: string;
  confidence?: number;
}

export const MediaAssetDetailsDrawer: React.FC<MediaAssetDetailsDrawerProps> = ({
  asset, open, onOpenChange, onPreview, onAssetUpdated,
}) => {
  const [audioToVideoOpen, setAudioToVideoOpen] = useState(false);
  const [isPodcast, setIsPodcast] = useState(false);
  const [isSavingPodcast, setIsSavingPodcast] = useState(false);

  const editableFields = useEditableAssetFields({
    assetId: asset?.id,
    initialTitle: asset?.title,
    initialDescription: asset?.description,
    initialTags: asset?.tags || [],
    onAssetUpdated,
  });

  useEffect(() => {
    if (asset) setIsPodcast(asset.metadata?.isPodcast === true);
  }, [asset]);

  if (!asset) return null;

  const isAudioAsset = asset.assetType === 'audio';
  const sfdcAnalysis: SfdcAnalysis | undefined = asset.metadata?.sfdcAnalysis;
  const hasAiAnalysis = !!sfdcAnalysis;
  const isVideoAsset = asset.assetType === 'video';

  const handlePodcastToggle = async (checked: boolean) => {
    setIsPodcast(checked);
    setIsSavingPodcast(true);
    try {
      const { error } = await supabase.from('media_assets').update({ metadata: { ...asset.metadata, isPodcast: checked } }).eq('id', asset.id);
      if (error) throw error;
      toast.success(checked ? 'Marked as podcast' : 'Removed podcast classification');
      onAssetUpdated?.();
    } catch (error) {
      toast.error('Failed to update podcast status');
      setIsPodcast(!checked);
    } finally { setIsSavingPodcast(false); }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '–';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  const formatDuration = (duration?: number | string) => {
    if (typeof duration === 'string') return duration;
    if (typeof duration === 'number' && !isNaN(duration)) { const m = Math.floor(duration / 60); return `${m}:${Math.floor(duration % 60).toString().padStart(2, '0')}`; }
    return '–';
  };

  const getConfidenceColor = (c?: number) => !c ? 'text-muted-foreground' : c >= 80 ? 'text-green-500' : c >= 60 ? 'text-yellow-500' : 'text-red-500';
  const getConfidenceLabel = (c?: number) => !c ? 'Unknown' : c >= 80 ? 'High' : c >= 60 ? 'Medium' : 'Low';

  const getAssetIcon = () => {
    switch (asset.assetType) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      default: return <Image className="w-5 h-5" />;
    }
  };

  const getSyncStatusBadge = () => asset.salesforceId
    ? <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Synced to Salesforce</Badge>
    : <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertTriangle className="w-3 h-3 mr-1" />Not synced</Badge>;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{getAssetIcon()}</div>
              <div>
                <DrawerTitle className="text-left">{editableFields.isEditing ? editableFields.localTitle : asset.title}</DrawerTitle>
                <DrawerDescription className="text-left">{asset.assetType || 'Media'} • {asset.source.replace('_', ' ')}</DrawerDescription>
              </div>
            </div>
            <DrawerClose asChild><Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button></DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-4 max-h-[60vh]">
          <div className="space-y-6">
            {/* Thumbnail Preview */}
            {(asset.thumbnailUrl || asset.fileUrl) && (
              <div className="relative aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden bg-muted">
                <img src={asset.thumbnailUrl || asset.fileUrl} alt={asset.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                {asset.assetType === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Button size="sm" variant="secondary" onClick={() => onPreview?.(asset)}><Eye className="w-4 h-4 mr-2" />Preview Video</Button>
                  </div>
                )}
              </div>
            )}

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

            <Separator />

            {/* Salesforce AI Analysis Section */}
            {hasAiAnalysis && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-500" />AI Classification (Salesforce Mapped)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><span className="text-xs text-muted-foreground">Content Type</span><div><Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">{sfdcAnalysis!.contentType || 'Unknown'}</Badge></div></div>
                    <div className="space-y-1"><span className="text-xs text-muted-foreground">Location/Scene</span><div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-500" /><span className="text-sm">{sfdcAnalysis!.location || 'Unknown'}</span></div></div>
                    <div className="space-y-1"><span className="text-xs text-muted-foreground">Mood/Tone</span><div><Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">{sfdcAnalysis!.mood || 'Neutral'}</Badge></div></div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">AI Confidence</span>
                      <div className="flex items-center gap-2">
                        <Gauge className={`w-4 h-4 ${getConfidenceColor(sfdcAnalysis!.confidence)}`} />
                        <span className={`text-sm font-medium ${getConfidenceColor(sfdcAnalysis!.confidence)}`}>{sfdcAnalysis!.confidence ?? '–'}%</span>
                        <span className="text-xs text-muted-foreground">({getConfidenceLabel(sfdcAnalysis!.confidence)})</span>
                      </div>
                      {sfdcAnalysis!.confidence && <Progress value={sfdcAnalysis!.confidence} className="h-1.5" />}
                    </div>
                  </div>
                  {sfdcAnalysis!.categories && sfdcAnalysis!.categories.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <span className="text-xs text-muted-foreground">Categories</span>
                      <div className="flex flex-wrap gap-2">{sfdcAnalysis!.categories.map((c, i) => <Badge key={i} variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">{c}</Badge>)}</div>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* File Metadata */}
            <div>
              <h4 className="text-sm font-medium mb-3">File Information</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Size:</span><span>{formatFileSize(asset.fileSize)}</span></div>
                {asset.duration && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Duration:</span><span>{formatDuration(asset.duration)}</span></div>}
                {asset.resolution && <div className="flex items-center gap-2"><span className="text-muted-foreground">Resolution:</span><span>{asset.resolution}</span></div>}
                {asset.fileFormat && <div className="flex items-center gap-2"><span className="text-muted-foreground">Format:</span><Badge variant="secondary" className="uppercase text-xs">{asset.fileFormat}</Badge></div>}
                <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Created:</span><span>{!isNaN(Date.parse(asset.createdAt)) ? new Date(asset.createdAt).toLocaleDateString() : 'Unknown'}</span></div>
              </div>
            </div>

            <Separator />

            {/* Podcast Classification */}
            {isAudioAsset && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><Mic className="w-4 h-4 text-pink-500" />Audio Classification</h4>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="space-y-0.5">
                      <Label htmlFor="podcast-toggle" className="text-sm font-medium cursor-pointer">Podcast Episode</Label>
                      <p className="text-xs text-muted-foreground">Mark this audio as a podcast episode</p>
                    </div>
                    <Switch id="podcast-toggle" checked={isPodcast} onCheckedChange={handlePodcastToggle} disabled={isSavingPodcast} />
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Sync Status */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><Link2 className="w-4 h-4 text-muted-foreground" />Salesforce Integration</h4>
              <div className="space-y-2">
                {getSyncStatusBadge()}
                {asset.salesforceId && <p className="text-xs text-muted-foreground">ID: {asset.salesforceId}</p>}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t">
          {editableFields.isEditing ? (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={editableFields.handleSave} disabled={editableFields.isSaving}>
                {editableFields.isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
              <Button variant="outline" className="flex-1" onClick={editableFields.cancelEditing} disabled={editableFields.isSaving}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {isVideoAsset && asset.fileUrl && (
                <Button variant="secondary" className="w-full" onClick={() => setAudioToVideoOpen(true)}><Wand2 className="w-4 h-4 mr-2" />Create Video with This Audio</Button>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={editableFields.startEditing}
                  disabled={!editableFields.canEdit}
                  title={!editableFields.canEdit ? 'This asset cannot be edited (external source)' : undefined}
                >
                  <Pencil className="w-4 h-4 mr-2" />Edit Details
                </Button>
                {asset.fileUrl && <Button variant="outline" className="flex-1" onClick={() => window.open(asset.fileUrl, '_blank')}><ExternalLink className="w-4 h-4 mr-2" />Open in Browser</Button>}
                <Button className="flex-1" onClick={() => onPreview?.(asset)}>
                  <Eye className="w-4 h-4 mr-2" />
                  {isVideoAsset || isAudioAsset ? 'Play' : 'View Full Size'}
                </Button>
              </div>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
      <AudioToVideoWorkflow isOpen={audioToVideoOpen} onClose={() => setAudioToVideoOpen(false)} preSelectedAudioSource={asset.fileUrl} />
    </Drawer>
  );
};
