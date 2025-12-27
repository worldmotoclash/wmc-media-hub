import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Grid3X3, 
  Download, 
  ExternalLink, 
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface GridVariant {
  id: string;
  file_url: string;
  variant_name: string;
  salesforce_id: string | null;
  resolution: string | null;
  status: string | null;
  created_at: string;
}

interface GridVariantsDisplayProps {
  generationId: string;
  gridImageUrl?: string;
}

const POSITION_LABELS: Record<string, string> = {
  'top-left': 'Top Left',
  'top-center': 'Top Center',
  'top-right': 'Top Right',
  'middle-left': 'Middle Left',
  'middle-center': 'Middle Center',
  'middle-right': 'Middle Right',
  'bottom-left': 'Bottom Left',
  'bottom-center': 'Bottom Center',
  'bottom-right': 'Bottom Right',
};

const POSITION_ORDER = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

export const GridVariantsDisplay: React.FC<GridVariantsDisplayProps> = ({
  generationId,
  gridImageUrl,
}) => {
  const [variants, setVariants] = useState<GridVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Fetch variants from media_assets where the metadata contains this generationId
  const fetchVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('id, file_url, variant_name, salesforce_id, resolution, status, created_at')
        .eq('asset_type', 'grid_variant')
        .contains('metadata', { sourceGenerationId: generationId })
        .order('variant_name');

      if (error) {
        console.error('Error fetching grid variants:', error);
        return;
      }

      setVariants(data || []);
    } catch (err) {
      console.error('Error fetching variants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (generationId) {
      fetchVariants();
    }
  }, [generationId]);

  // Poll for updates while variants are still being extracted
  useEffect(() => {
    if (!generationId || variants.length >= 9) return;

    const interval = setInterval(() => {
      fetchVariants();
    }, 3000);

    return () => clearInterval(interval);
  }, [generationId, variants.length]);

  // Sort variants by position order
  const sortedVariants = [...variants].sort((a, b) => {
    const aIndex = POSITION_ORDER.indexOf(a.variant_name || '');
    const bIndex = POSITION_ORDER.indexOf(b.variant_name || '');
    return aIndex - bIndex;
  });

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-destructive" />;
      default:
        return <Clock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${name}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="w-5 h-5 text-primary" />
          <span className="font-semibold">Extracting Grid Images...</span>
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-primary" />
            <span className="font-semibold">Extracted Grid Images</span>
            <Badge variant="secondary">{variants.length}/9</Badge>
          </div>
          {variants.length < 9 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchVariants}
              className="gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          )}
        </div>

        {variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm">Grid images are being extracted...</p>
            <p className="text-xs mt-1">This usually takes 30-60 seconds</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {POSITION_ORDER.map((positionId) => {
              const variant = sortedVariants.find(v => v.variant_name === positionId);
              
              if (!variant) {
                return (
                  <div key={positionId} className="aspect-square rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1 block">
                        {POSITION_LABELS[positionId]?.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={variant.id} 
                  className="relative group rounded-lg overflow-hidden border"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewImage(variant.file_url)}
                    className="block w-full"
                  >
                    <img
                      src={variant.file_url}
                      alt={POSITION_LABELS[variant.variant_name || ''] || variant.variant_name}
                      className="w-full aspect-square object-cover"
                    />
                  </button>

                  {/* Position label */}
                  <Badge 
                    className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5"
                    variant="secondary"
                  >
                    {POSITION_LABELS[variant.variant_name || '']?.split(' ')[0]}
                  </Badge>

                  {/* Status indicator */}
                  <div className="absolute top-2 right-2">
                    {getStatusIcon(variant.status)}
                  </div>

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(variant.file_url, variant.variant_name || 'grid-image');
                      }}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {variant.salesforce_id && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://wmc--telem.sandbox.lightning.force.com/lightning/r/ri1__Content__c/${variant.salesforce_id}/view`,
                            '_blank'
                          );
                        }}
                        title="View in Salesforce"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {variants.length === 9 && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            All 9 grid images extracted successfully
          </p>
        )}
      </Card>

      {/* Full-size preview modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-1">
          {previewImage && (
            <img
              src={previewImage}
              alt="Full size preview"
              className="w-full h-auto rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
