import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileImage, Layers, Download, ExternalLink, CheckCircle, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaAsset } from '@/services/unifiedMediaService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEditableAssetFields } from '@/hooks/useEditableAssetFields';
import EditableDescriptionTags from './EditableDescriptionTags';

interface ImagePreviewModalProps {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onAssetUpdated?: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ asset, isOpen, onClose, onAssetUpdated }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const editableFields = useEditableAssetFields({
    assetId: asset?.id,
    initialTitle: asset?.title,
    initialDescription: asset?.description,
    initialTags: asset?.tags || [],
    onAssetUpdated,
  });

  if (!asset) return null;

  const handleReanalyze = async () => {
    if (!asset.id || !asset.fileUrl) {
      toast.error('Asset URL not available');
      return;
    }
    if (asset.source === 'salesforce' && !asset.id.match(/^[0-9a-f-]{36}$/i)) {
      toast.error('Cannot re-analyze Salesforce-only assets');
      return;
    }
    setIsAnalyzing(true);
    toast.info('Starting AI analysis...', { duration: 3000 });
    try {
      const { data, error } = await supabase.functions.invoke('auto-tag-media-asset', {
        body: { assetId: asset.id, mediaUrl: asset.fileUrl || asset.thumbnailUrl, mediaType: 'image' }
      });
      if (error) { toast.error('Failed to analyze asset', { description: error.message }); return; }
      if (data?.success) {
        toast.success('AI analysis complete!', {
          description: `Applied ${data.tagCount} tags: ${data.tagsApplied?.slice(0, 3).join(', ')}${data.tagCount > 3 ? '...' : ''}`
        });
        await editableFields.refreshFromDB();
        onAssetUpdated?.();
      } else { toast.error(data?.error || 'Analysis failed'); }
    } catch (err) { toast.error('Failed to analyze asset'); }
    finally { setIsAnalyzing(false); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSyncStatusBadge = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'in_sync': return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
      case 'missing_sfdc': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><AlertTriangle className="w-3 h-3 mr-1" />Missing SFDC</Badge>;
      case 'missing_file': return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><AlertTriangle className="w-3 h-3 mr-1" />Missing File</Badge>;
      default: return null;
    }
  };

  const isMaster = asset.assetType === 'master_image';
  const isVariant = asset.assetType === 'image_variant';
  const formatFileSize = (bytes?: number) => { if (!bytes) return 'Unknown'; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground pr-8 flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            {editableFields.isEditing ? editableFields.localTitle : asset.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
            {asset.fileUrl || asset.thumbnailUrl ? (
              <img src={asset.fileUrl || asset.thumbnailUrl} alt={asset.title} className="max-w-full max-h-[60vh] object-contain" onError={(e) => { e.currentTarget.src = '/placeholder.svg'; }} />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground p-8"><FileImage className="w-16 h-16 mb-2" /><span>No preview available</span></div>
            )}
          </div>
          
          {/* Image Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Badge variant="secondary" className="flex items-center gap-1">
                {isMaster ? <><Layers className="w-3 h-3" />Master Image</> : isVariant ? <><FileImage className="w-3 h-3" />Variant</> : <><FileImage className="w-3 h-3" />Image</>}
              </Badge>
              <Badge variant="outline" className={getStatusColor(asset.status)}>{asset.status}</Badge>
              {asset.syncStatus && getSyncStatusBadge(asset.syncStatus)}
              {asset.metadata?.platform && <Badge variant="outline">{asset.metadata.platform}</Badge>}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{!isNaN(Date.parse(asset.createdAt)) ? new Date(asset.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              {asset.resolution && <div><p className="text-xs text-muted-foreground">Resolution</p><p className="text-sm font-medium">{asset.resolution}</p></div>}
              {asset.fileSize && <div><p className="text-xs text-muted-foreground">File Size</p><p className="text-sm font-medium">{formatFileSize(asset.fileSize)}</p></div>}
              {asset.fileFormat && <div><p className="text-xs text-muted-foreground">Format</p><p className="text-sm font-medium uppercase">{asset.fileFormat}</p></div>}
              {asset.metadata?.variant_name && <div><p className="text-xs text-muted-foreground">Variant</p><p className="text-sm font-medium">{asset.metadata.variant_name}</p></div>}
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

            {/* AI Analysis Info */}
            {asset.metadata?.aiAnalysis && (
              <div className="p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground text-sm flex items-center gap-1"><Sparkles className="w-4 h-4 text-primary" />AI Analysis</h4>
                  <span className="text-xs text-muted-foreground">{asset.metadata.aiAnalysis.confidence ? `${Math.round(asset.metadata.aiAnalysis.confidence * 100)}% confidence` : ''}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {asset.metadata.aiAnalysis.scene && <div><span className="text-muted-foreground">Scene:</span> <span className="font-medium">{asset.metadata.aiAnalysis.scene}</span></div>}
                  {asset.metadata.aiAnalysis.mood && <div><span className="text-muted-foreground">Mood:</span> <span className="font-medium">{asset.metadata.aiAnalysis.mood}</span></div>}
                  {asset.metadata.aiAnalysis.energy && <div><span className="text-muted-foreground">Energy:</span> <span className="font-medium">{asset.metadata.aiAnalysis.energy}</span></div>}
                  {asset.metadata.aiAnalysis.useCase && <div><span className="text-muted-foreground">Use:</span> <span className="font-medium">{asset.metadata.aiAnalysis.useCase}</span></div>}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={handleReanalyze} disabled={isAnalyzing || asset.source === 'salesforce'}>
                {isAnalyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="w-4 h-4 mr-2" />Re-analyze</>}
              </Button>
              {asset.fileUrl && (
                <>
                  <Button variant="outline" onClick={() => window.open(asset.fileUrl, '_blank')}><ExternalLink className="w-4 h-4 mr-2" />Open Original</Button>
                  <Button variant="outline" onClick={() => { const link = document.createElement('a'); link.href = asset.fileUrl!; link.download = asset.title; link.click(); }}><Download className="w-4 h-4 mr-2" />Download</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImagePreviewModal;
