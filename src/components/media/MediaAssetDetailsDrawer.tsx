import React from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  X, Video, Image, Music, MapPin, Sparkles, Tag, Clock, 
  HardDrive, Calendar, ExternalLink, CheckCircle, AlertTriangle, 
  FileText, Gauge, Link2, Eye
} from "lucide-react";
import { MediaAsset } from "@/services/unifiedMediaService";

interface MediaAssetDetailsDrawerProps {
  asset: MediaAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPreview?: (asset: MediaAsset) => void;
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
  asset,
  open,
  onOpenChange,
  onPreview,
}) => {
  if (!asset) return null;

  const sfdcAnalysis: SfdcAnalysis | undefined = asset.metadata?.sfdcAnalysis;
  const hasAiAnalysis = !!sfdcAnalysis;

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '–';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return `${mb.toFixed(1)} MB`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)} KB`;
  };

  const formatDuration = (duration?: number | string) => {
    if (typeof duration === 'string') return duration;
    if (typeof duration === 'number' && !isNaN(duration)) {
      const mins = Math.floor(duration / 60);
      const secs = Math.floor(duration % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return '–';
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-muted-foreground';
    if (confidence >= 80) return 'text-green-500';
    if (confidence >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceLabel = (confidence?: number) => {
    if (!confidence) return 'Unknown';
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  const getAssetIcon = () => {
    switch (asset.assetType) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      default: return <Image className="w-5 h-5" />;
    }
  };

  const getSyncStatusBadge = () => {
    if (asset.salesforceId) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="w-3 h-3 mr-1" />
          Synced to Salesforce
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Not synced
      </Badge>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                {getAssetIcon()}
              </div>
              <div>
                <DrawerTitle className="text-left">{asset.title}</DrawerTitle>
                <DrawerDescription className="text-left">
                  {asset.assetType || 'Media'} • {asset.source.replace('_', ' ')}
                </DrawerDescription>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="w-4 h-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-4 max-h-[60vh]">
          <div className="space-y-6">
            {/* Thumbnail Preview */}
            {(asset.thumbnailUrl || asset.fileUrl) && (
              <div className="relative aspect-video w-full max-w-md mx-auto rounded-lg overflow-hidden bg-muted">
                <img
                  src={asset.thumbnailUrl || asset.fileUrl}
                  alt={asset.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                {asset.assetType === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => onPreview?.(asset)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Video
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {(asset.description || sfdcAnalysis?.description) && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Description
                </h4>
                <p className="text-sm text-muted-foreground">
                  {asset.description || sfdcAnalysis?.description}
                </p>
              </div>
            )}

            <Separator />

            {/* Salesforce AI Analysis Section */}
            {hasAiAnalysis && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    AI Classification (Salesforce Mapped)
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Content Type */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Content Type</span>
                      <div>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                          {sfdcAnalysis.contentType || 'Unknown'}
                        </Badge>
                      </div>
                    </div>

                    {/* Location/Scene */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Location/Scene</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span className="text-sm">{sfdcAnalysis.location || 'Unknown'}</span>
                      </div>
                    </div>

                    {/* Mood */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Mood/Tone</span>
                      <div>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                          {sfdcAnalysis.mood || 'Neutral'}
                        </Badge>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">AI Confidence</span>
                      <div className="flex items-center gap-2">
                        <Gauge className={`w-4 h-4 ${getConfidenceColor(sfdcAnalysis.confidence)}`} />
                        <span className={`text-sm font-medium ${getConfidenceColor(sfdcAnalysis.confidence)}`}>
                          {sfdcAnalysis.confidence ?? '–'}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({getConfidenceLabel(sfdcAnalysis.confidence)})
                        </span>
                      </div>
                      {sfdcAnalysis.confidence && (
                        <Progress value={sfdcAnalysis.confidence} className="h-1.5" />
                      )}
                    </div>
                  </div>

                  {/* Categories */}
                  {sfdcAnalysis.categories && sfdcAnalysis.categories.length > 0 && (
                    <div className="mt-4 space-y-1">
                      <span className="text-xs text-muted-foreground">Categories</span>
                      <div className="flex flex-wrap gap-2">
                        {sfdcAnalysis.categories.map((category, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="bg-green-500/10 text-green-600 border-green-500/20"
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />
              </>
            )}

            {/* Tags */}
            {asset.tags && asset.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map(tag => (
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

            <Separator />

            {/* File Metadata */}
            <div>
              <h4 className="text-sm font-medium mb-3">File Information</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Size:</span>
                  <span>{formatFileSize(asset.fileSize)}</span>
                </div>
                
                {asset.duration && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{formatDuration(asset.duration)}</span>
                  </div>
                )}
                
                {asset.resolution && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Resolution:</span>
                    <span>{asset.resolution}</span>
                  </div>
                )}
                
                {asset.fileFormat && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Format:</span>
                    <Badge variant="secondary" className="uppercase text-xs">
                      {asset.fileFormat}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>
                    {!isNaN(Date.parse(asset.createdAt)) 
                      ? new Date(asset.createdAt).toLocaleDateString() 
                      : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Sync Status */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                Salesforce Integration
              </h4>
              <div className="space-y-2">
                {getSyncStatusBadge()}
                {asset.salesforceId && (
                  <p className="text-xs text-muted-foreground">
                    ID: {asset.salesforceId}
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="border-t">
          <div className="flex gap-2">
            {asset.fileUrl && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => window.open(asset.fileUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open File
              </Button>
            )}
            <Button 
              className="flex-1"
              onClick={() => onPreview?.(asset)}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
