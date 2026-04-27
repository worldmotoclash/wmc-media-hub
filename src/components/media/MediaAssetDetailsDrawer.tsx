import React, { useState, useEffect } from 'react';
import {
  Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  X, Video, Image, Music, MapPin, Sparkles, Clock,
  HardDrive, Calendar, ExternalLink, CheckCircle, AlertTriangle,
  Gauge, Link2, Eye, Wand2, Mic, Pencil, Loader2, Target, Trash2, CloudUpload
} from "lucide-react";
import { Save } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteMediaAsset } from "@/services/unifiedMediaService";
import { useUser } from "@/contexts/UserContext";
import { MediaAsset } from "@/services/unifiedMediaService";
import { AudioToVideoWorkflow } from "./AudioToVideoWorkflow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEditableAssetFields } from '@/hooks/useEditableAssetFields';
import EditableDescriptionTags from './EditableDescriptionTags';
import { getFieldLabel } from '@/constants/salesforceFields';

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
  const [localStatus, setLocalStatus] = useState(asset?.status || 'pending');
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [suggestTitleOnAnalyze, setSuggestTitleOnAnalyze] = useState(true);
  const [albums, setAlbums] = useState<{ id: string; name: string }[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncingToSfdc, setIsSyncingToSfdc] = useState(false);
  const [localSalesforceId, setLocalSalesforceId] = useState<string | null>(asset?.salesforceId || null);
  const [isRenamingFile, setIsRenamingFile] = useState(false);
  const { isEditor, isAdmin } = useUser();

  // Detect Wasabi-incompatible characters in the S3 key (or .m4v which Chrome/Firefox can't play reliably).
  const s3KeyForCheck: string | undefined = (asset as any)?.s3Key || (asset as any)?.s3_key;
  const needsFilenameFix = !!s3KeyForCheck && (
    /[:*?#]/.test(s3KeyForCheck) ||
    / {2,}/.test(s3KeyForCheck) ||
    s3KeyForCheck.toLowerCase().endsWith('.m4v')
  );

  // Fetch albums on mount
  useEffect(() => {
    const fetchAlbums = async () => {
      const { data } = await supabase.from('media_albums').select('id, name').order('name');
      if (data) setAlbums(data.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })));
    };
    fetchAlbums();
  }, []);

  const editableFields = useEditableAssetFields({
    assetId: asset?.id,
    initialTitle: asset?.title,
    initialDescription: asset?.description,
    initialTags: asset?.tags || [],
    initialAlbumId: asset?.album_id,
    onAssetUpdated,
  });

  useEffect(() => {
    if (asset) {
      setIsPodcast(asset.metadata?.isPodcast === true);
      setLocalStatus(asset.status || 'pending');
      setLocalSalesforceId(asset.salesforceId || null);
    }
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

  const handleDelete = async () => {
    if (!asset) return;
    setIsDeleting(true);
    try {
      await deleteMediaAsset({
        assetId: asset.id,
        salesforceId: asset.salesforceId,
        fileUrl: asset.fileUrl,
      });
      toast.success(`"${asset.title}" deleted`);
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onAssetUpdated?.();
    } catch (err: any) {
      toast.error('Failed to delete asset', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
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

  const getSyncStatusBadge = () => localSalesforceId
    ? <Badge variant="outline" className="bg-green-600 text-white border-green-700"><CheckCircle className="w-3 h-3 mr-1" />Synced to Salesforce</Badge>
    : <Badge variant="outline" className="bg-yellow-600 text-white border-yellow-700"><AlertTriangle className="w-3 h-3 mr-1" />Not synced</Badge>;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] flex flex-col">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{getAssetIcon()}</div>
              <div>
                <DrawerTitle className="text-left">{editableFields.localTitle || asset.title}</DrawerTitle>
                <DrawerDescription className="text-left">{asset.assetType || 'Media'} • {asset.source.replace('_', ' ')}</DrawerDescription>
              </div>
            </div>
            <DrawerClose asChild><Button variant="ghost" size="icon"><X className="w-4 h-4" /></Button></DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 p-4 min-h-0 overflow-y-auto">
          <div className="space-y-6">
            {/* Thumbnail Preview */}
            {(asset.thumbnailUrl || asset.fileUrl) && (
              <div className="relative aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden bg-muted">
                <img src={(['image', 'master_image', 'image_variant', 'generation_master', 'grid_variant'].includes(asset.assetType || '') ? (asset.fileUrl || asset.thumbnailUrl) : (asset.thumbnailUrl || asset.fileUrl)) || '/placeholder.svg'} alt={asset.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
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

            {/* Album Assignment */}
            <div>
              <h4 className="font-semibold text-foreground mb-2">Album</h4>
              {editableFields.isEditing ? (
                <Select
                  value={editableFields.localAlbumId || '__none__'}
                  onValueChange={(v) => editableFields.setLocalAlbumId(v === '__none__' ? null : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No album" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No album</SelectItem>
                    {albums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>{album.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {albums.find((a) => a.id === asset.album_id)?.name || <span className="italic">No album</span>}
                </p>
              )}
            </div>

            {/* Content Intent Badge */}
            {asset.metadata?.contentIntent && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Intent:</span>
                <Badge variant="default" className="text-xs">
                  {getFieldLabel('contentIntent', asset.metadata.contentIntent)}
                </Badge>
              </div>
            )}

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

            {/* Status — mapped to ri1__Content_Approved__c */}
            <div>
              <h4 className="text-sm font-medium mb-3">Approval Status</h4>
              {localSalesforceId ? (
                <Select
                  value={localStatus}
                  onValueChange={async (newStatus) => {
                    const previousStatus = localStatus;
                    setLocalStatus(newStatus);
                    try {
                      const { error } = await supabase.functions.invoke('sync-asset-to-salesforce', {
                        body: { assetIds: [asset.id], status: newStatus }
                      });
                      if (error) throw error;
                      toast.success(`Approval status changed to ${newStatus}`);
                      onAssetUpdated?.();
                    } catch {
                      setLocalStatus(previousStatus);
                      toast.error('Failed to update approval status in Salesforce');
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not synced to Salesforce</p>
              )}
            </div>

            <Separator />

            {/* Sync Status */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><Link2 className="w-4 h-4 text-muted-foreground" />Salesforce Integration</h4>
              <div className="space-y-2">
                {getSyncStatusBadge()}
                {localSalesforceId && <a href={`https://worldmotoclash.my.salesforce.com/${localSalesforceId.replace(/^sf_/, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline block">ID: {localSalesforceId.replace(/^sf_/, '')}</a>}
                {!localSalesforceId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      setIsSyncingToSfdc(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('sync-asset-to-salesforce', {
                          body: { assetIds: [asset.id] }
                        });
                        if (error) throw error;
                        // Parse sync response to update local state immediately
                        const result = data?.results?.[0];
                        if (result?.salesforceId) {
                          setLocalSalesforceId(result.salesforceId);
                          setLocalStatus('Pending');
                          toast.success('Asset synced to Salesforce');
                        } else if (result?.action === 'created_pending' || result?.action === 'created') {
                          toast.info('Record created — resolving Salesforce ID...');
                          let resolved = false;
                          for (let i = 0; i < 12; i++) {
                            await new Promise(r => setTimeout(r, 5000));
                            const { data: refreshed } = await supabase
                              .from('media_assets')
                              .select('salesforce_id')
                              .eq('id', asset.id)
                              .single();
                            if (refreshed?.salesforce_id) {
                              setLocalSalesforceId(refreshed.salesforce_id);
                              setLocalStatus('Pending');
                              toast.success('Salesforce ID resolved');
                              resolved = true;
                              break;
                            }
                          }
                          if (!resolved) {
                            toast.info('SFDC record created — ID will appear shortly. Refresh to check.');
                          }
                        } else {
                          toast.success('Asset synced to Salesforce');
                        }
                        onAssetUpdated?.();
                      } catch (err: any) {
                        console.error('SFDC sync error:', err);
                        toast.error('Sync failed: ' + (err.message || 'Unknown error'));
                      } finally {
                        setIsSyncingToSfdc(false);
                      }
                    }}
                    disabled={isSyncingToSfdc}
                    className="w-full mt-2"
                  >
                    {isSyncingToSfdc ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CloudUpload className="h-3 w-3 mr-1" />}
                    Sync to SFDC
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

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
              {editableFields.canEdit && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="suggest-title"
                      checked={suggestTitleOnAnalyze}
                      onCheckedChange={(checked) => setSuggestTitleOnAnalyze(!!checked)}
                    />
                    <Label htmlFor="suggest-title" className="text-sm cursor-pointer">Also suggest a descriptive title</Label>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={isReanalyzing}
                    onClick={async () => {
                      setIsReanalyzing(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('auto-tag-media-asset', {
                          body: {
                            assetId: asset.id,
                            mediaUrl: asset.fileUrl || asset.thumbnailUrl,
                            mediaType: asset.assetType === 'video' ? 'video' : 'image',
                            suggestTitle: suggestTitleOnAnalyze,
                          }
                        });
                        if (error || !data?.success) throw error || new Error(data?.error || 'Failed');
                        const msg = data.suggestedTitle && suggestTitleOnAnalyze
                          ? `AI analysis complete — renamed to "${data.suggestedTitle}"`
                          : 'AI analysis complete';
                        toast.success(msg);
                        onAssetUpdated?.();
                        editableFields.refreshFromDB();
                      } catch (err: any) {
                        toast.error('AI analysis failed', { description: err.message });
                      } finally {
                        setIsReanalyzing(false);
                      }
                    }}
                  >
                    {isReanalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Reanalyze with AI
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={async () => {
                    if (!editableFields.canEdit && asset.id.startsWith('sf_')) {
                      await editableFields.createLocalRecord(asset);
                    } else {
                      editableFields.startEditing();
                    }
                  }}
                  disabled={editableFields.isCreatingLocal}
                >
                  {editableFields.isCreatingLocal ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
                  Edit Details
                </Button>
                {asset.fileUrl && <Button variant="outline" className="flex-1" onClick={() => {
                  if (asset.assetType === 'video') {
                    onPreview?.(asset);
                  } else {
                    window.open(asset.fileUrl, '_blank');
                  }
                }}><ExternalLink className="w-4 h-4 mr-2" />{asset.assetType === 'video' ? 'Play Video' : 'Open in Browser'}</Button>}
              </div>
              {isEditor() && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Asset
                </Button>
              )}
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
      <AudioToVideoWorkflow isOpen={audioToVideoOpen} onClose={() => setAudioToVideoOpen(false)} preSelectedAudioSource={asset.fileUrl} />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{asset.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The asset and its tag associations will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Drawer>
  );
};
