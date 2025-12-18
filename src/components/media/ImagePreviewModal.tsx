import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileImage, Layers, Download, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaAsset } from '@/services/unifiedMediaService';

interface ImagePreviewModalProps {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ asset, isOpen, onClose }) => {
  if (!asset) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSyncStatusBadge = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'in_sync':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Synced
          </Badge>
        );
      case 'missing_sfdc':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Missing SFDC
          </Badge>
        );
      case 'missing_file':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Missing File
          </Badge>
        );
      default:
        return null;
    }
  };

  const isMaster = asset.assetType === 'master_image';
  const isVariant = asset.assetType === 'image_variant';

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground pr-8 flex items-center gap-2">
            <FileImage className="w-5 h-5" />
            {asset.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Image Preview */}
          <div className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[300px]">
            {asset.fileUrl || asset.thumbnailUrl ? (
              <img 
                src={asset.fileUrl || asset.thumbnailUrl} 
                alt={asset.title}
                className="max-w-full max-h-[60vh] object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
                <FileImage className="w-16 h-16 mb-2" />
                <span>No preview available</span>
              </div>
            )}
          </div>
          
          {/* Image Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Asset Type Badge */}
              <Badge variant="secondary" className="flex items-center gap-1">
                {isMaster ? (
                  <>
                    <Layers className="w-3 h-3" />
                    Master Image
                  </>
                ) : isVariant ? (
                  <>
                    <FileImage className="w-3 h-3" />
                    Variant
                  </>
                ) : (
                  <>
                    <FileImage className="w-3 h-3" />
                    Image
                  </>
                )}
              </Badge>

              {/* Status Badge */}
              <Badge variant="outline" className={getStatusColor(asset.status)}>
                {asset.status}
              </Badge>

              {/* Sync Status Badge */}
              {asset.syncStatus && getSyncStatusBadge(asset.syncStatus)}

              {/* Platform/Variant info */}
              {asset.metadata?.platform && (
                <Badge variant="outline">
                  {asset.metadata.platform}
                </Badge>
              )}
              
              {/* Created date */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{!isNaN(Date.parse(asset.createdAt)) ? new Date(asset.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              {asset.resolution && (
                <div>
                  <p className="text-xs text-muted-foreground">Resolution</p>
                  <p className="text-sm font-medium">{asset.resolution}</p>
                </div>
              )}
              {asset.fileSize && (
                <div>
                  <p className="text-xs text-muted-foreground">File Size</p>
                  <p className="text-sm font-medium">{formatFileSize(asset.fileSize)}</p>
                </div>
              )}
              {asset.fileFormat && (
                <div>
                  <p className="text-xs text-muted-foreground">Format</p>
                  <p className="text-sm font-medium uppercase">{asset.fileFormat}</p>
                </div>
              )}
              {asset.metadata?.variant_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Variant</p>
                  <p className="text-sm font-medium">{asset.metadata.variant_name}</p>
                </div>
              )}
            </div>

            {/* Description */}
            {asset.description && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Description</h4>
                <p className="text-muted-foreground text-sm">{asset.description}</p>
              </div>
            )}

            {/* Tags */}
            {asset.tags && asset.tags.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag) => (
                    <Badge 
                      key={tag.id} 
                      variant="outline" 
                      style={{ borderColor: tag.color + '40', color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {asset.fileUrl && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(asset.fileUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Original
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = asset.fileUrl!;
                      link.download = asset.title;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
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