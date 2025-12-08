import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchVariantsForMaster } from "@/services/socialKitService";
import { Download, ExternalLink, Image as ImageIcon, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface GeneratedVariantsGridProps {
  masterAssetId: string;
  refreshTrigger?: number;
}

interface VariantAsset {
  id: string;
  url: string;
  platform: string;
  variant_name: string;
  width: number;
  height: number;
  salesforce_id?: string;
  created_at: string;
}

export function GeneratedVariantsGrid({ masterAssetId, refreshTrigger }: GeneratedVariantsGridProps) {
  const [variants, setVariants] = useState<VariantAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVariants = async () => {
      setLoading(true);
      try {
        const data = await fetchVariantsForMaster(masterAssetId);
        setVariants(data as VariantAsset[]);
      } catch (error) {
        console.error("Error loading variants:", error);
      } finally {
        setLoading(false);
      }
    };

    loadVariants();
  }, [masterAssetId, refreshTrigger]);

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
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const openInSalesforce = (salesforceId: string) => {
    // Construct Salesforce URL - this would need to be configured for your org
    const baseUrl = "https://login.salesforce.com";
    window.open(`${baseUrl}/${salesforceId}`, "_blank");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Generated Variants
        </h3>
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
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ImageIcon className="h-5 w-5" />
        Generated Variants
        <Badge variant="secondary">{variants.length}</Badge>
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {variants.map(variant => (
          <Card key={variant.id} className="overflow-hidden group">
            <div className="relative aspect-square bg-muted">
              <img
                src={variant.url}
                alt={`${variant.platform} ${variant.variant_name}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDownload(
                    variant.url,
                    `${variant.platform}-${variant.variant_name}-${variant.width}x${variant.height}.jpg`
                  )}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {variant.salesforce_id && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openInSalesforce(variant.salesforce_id!)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm truncate">
                    {variant.platform} {variant.variant_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {variant.width} × {variant.height}px
                  </p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
