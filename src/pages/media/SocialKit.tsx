import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SocialKitGeneratorModal } from "@/components/media/SocialKitGeneratorModal";
import { GeneratedVariantsGrid } from "@/components/media/GeneratedVariantsGrid";
import { fetchAllMediaAssets, MediaAsset } from "@/services/unifiedMediaService";
import { SOCIAL_VARIANTS } from "@/constants/socialVariants";
import { ArrowLeft, ImagePlus, Search, Image as ImageIcon, Layers, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function SocialKit() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadMasterImages();
  }, []);

  const loadMasterImages = async () => {
    setLoading(true);
    try {
      // Fetch all assets - filter for images
      const { assets: allAssets } = await fetchAllMediaAssets("", undefined, 100, 0);
      
      // Filter for images that could be master images
      const masterImages = allAssets.filter(asset => {
        const hasMasterTag = asset.tags?.some(tag => 
          tag.name.toLowerCase().includes("master") || 
          tag.name.toLowerCase().includes("source")
        );
        const isImage = asset.fileFormat?.match(/\.(jpg|jpeg|png|webp)$/i) || 
                       asset.fileUrl?.match(/\.(jpg|jpeg|png|webp)$/i) ||
                       asset.thumbnailUrl?.match(/\.(jpg|jpeg|png|webp)$/i);
        return isImage || hasMasterTag || true; // Show all for now
      });

      setAssets(masterImages);
    } catch (error) {
      console.error("Error loading master images:", error);
      toast({
        title: "Error",
        description: "Failed to load images",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateClick = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    setModalOpen(true);
  };

  const handleGenerateComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    loadMasterImages();
  };

  const getAssetUrl = (asset: MediaAsset): string => {
    return asset.fileUrl || asset.thumbnailUrl || "";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin/media">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Layers className="h-6 w-6 text-primary" />
                  Social Kit Generator
                </h1>
                <p className="text-sm text-muted-foreground">
                  Generate platform-specific variants from master images
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold mb-2">Available Variants</h2>
                  <div className="flex flex-wrap gap-2">
                    {SOCIAL_VARIANTS.map(variant => (
                      <Badge key={variant.id} variant="secondary" className="text-xs">
                        {variant.platform} {variant.variant}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {SOCIAL_VARIANTS.length} formats available
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search master images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <Skeleton className="aspect-video" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAssets.length === 0 && (
          <Card className="p-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Master Images Found</h3>
            <p className="text-muted-foreground mb-4">
              Upload images to the Media Library and tag them as "Master Image" to use them here.
            </p>
            <Link to="/admin/media/library">
              <Button>
                <ImagePlus className="h-4 w-4 mr-2" />
                Go to Media Library
              </Button>
            </Link>
          </Card>
        )}

        {/* Asset Grid */}
        {!loading && filteredAssets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset, index) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden group hover:shadow-lg transition-shadow">
                  <div className="relative aspect-video bg-muted">
                    {(asset.thumbnailUrl || asset.fileUrl) ? (
                      <img
                        src={asset.thumbnailUrl || asset.fileUrl}
                        alt={asset.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button onClick={() => handleGenerateClick(asset)}>
                        <ImagePlus className="h-4 w-4 mr-2" />
                        Generate Social Kit
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate mb-1">{asset.title || "Untitled"}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {asset.metadata?.width && asset.metadata?.height && (
                        <span>{asset.metadata.width} × {asset.metadata.height}</span>
                      )}
                      {asset.source && (
                        <Badge variant="outline" className="text-xs">{asset.source}</Badge>
                      )}
                    </div>
                    {asset.tags && asset.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {asset.tags.slice(0, 3).map(tag => (
                            <Badge key={tag.id} variant="secondary" className="text-xs">
                              {tag.name}
                            </Badge>
                          ))}
                          {asset.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{asset.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Show generated variants if any */}
                <GeneratedVariantsGrid
                  masterAssetId={asset.id}
                  refreshTrigger={refreshTrigger}
                />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Generator Modal */}
      {selectedAsset && (
        <SocialKitGeneratorModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          masterAsset={{
            id: selectedAsset.id,
            url: getAssetUrl(selectedAsset),
            title: selectedAsset.title,
            salesforce_id: selectedAsset.sourceId
          }}
          onComplete={handleGenerateComplete}
        />
      )}
    </div>
  );
}
