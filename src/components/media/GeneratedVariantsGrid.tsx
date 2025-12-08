import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchVariantsForMaster } from "@/services/socialKitService";
import { 
  Download, 
  ExternalLink, 
  Image as ImageIcon, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy, 
  RefreshCw,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface GeneratedVariantsGridProps {
  masterAssetId: string;
  refreshTrigger?: number;
}

interface VariantAsset {
  id: string;
  file_url: string;
  platform: string;
  variant_name: string;
  s3_key?: string;
  salesforce_id?: string;
  status: string;
  metadata?: {
    width?: number;
    height?: number;
  };
  created_at: string;
}

export function GeneratedVariantsGrid({ masterAssetId, refreshTrigger }: GeneratedVariantsGridProps) {
  const [variants, setVariants] = useState<VariantAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVariants = async () => {
    try {
      const data = await fetchVariantsForMaster(masterAssetId);
      // Filter to only show image variants
      const imageVariants = data.filter((item: any) => 
        item.asset_type === "image_variant" || 
        item.metadata?.masterAssetId === masterAssetId
      );
      setVariants(imageVariants as VariantAsset[]);
    } catch (error) {
      console.error("Error loading variants:", error);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadVariants();
      setLoading(false);
    };
    load();
  }, [masterAssetId, refreshTrigger]);

  // Poll for updates while generating
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    const hasProcessing = variants.some(v => v.status === "processing" || v.status === "pending");
    
    if (hasProcessing) {
      interval = setInterval(() => {
        loadVariants();
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [variants, masterAssetId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVariants();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Variant list has been updated",
    });
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      toast({
        title: "Download started",
        description: `Downloading ${filename}`,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download failed",
        description: "Could not download the file",
        variant: "destructive",
      });
    }
  };

  const copyS3Url = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "S3 URL copied to clipboard",
    });
  };

  const openInSalesforce = (salesforceId: string) => {
    const baseUrl = "https://login.salesforce.com";
    window.open(`${baseUrl}/${salesforceId}`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
      case "completed":
        return <Badge variant="default" className="bg-green-500">Ready</Badge>;
      case "processing":
      case "generating":
        return <Badge variant="secondary" className="animate-pulse">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ready":
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "processing":
      case "generating":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Generated Variants
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (variants.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Generated Variants
          <Badge variant="secondary">{variants.length}</Badge>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {variants.map(variant => (
          <Card key={variant.id} className="overflow-hidden group">
            <div className="relative aspect-square bg-muted">
              <img
                src={variant.file_url}
                alt={`${variant.platform} ${variant.variant_name}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Hover overlay with actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(
                    variant.file_url,
                    `${variant.platform}-${variant.variant_name}-${variant.metadata?.width}x${variant.metadata?.height}.jpg`
                  )}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyS3Url(variant.file_url)}
                  title="Copy S3 URL"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
                {variant.salesforce_id && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openInSalesforce(variant.salesforce_id!)}
                    title="View in Salesforce"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {/* Status indicator */}
              <div className="absolute top-2 right-2">
                {getStatusIcon(variant.status)}
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {variant.platform} {variant.variant_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {variant.metadata?.width} × {variant.metadata?.height}px
                  </p>
                </div>
                {getStatusBadge(variant.status)}
              </div>
              {/* Action row */}
              <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => copyS3Url(variant.file_url)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy URL
                </Button>
                {variant.salesforce_id && (
                  <Badge variant="outline" className="text-xs">
                    SF
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
