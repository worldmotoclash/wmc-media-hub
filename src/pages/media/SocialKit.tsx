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
import { MasterImageUploadDialog } from "@/components/media/MasterImageUploadDialog";
import { PlatformVariantSelector } from "@/components/media/PlatformVariantSelector";
import { fetchMasterImages, MasterImage } from "@/services/masterImageService";
import { SOCIAL_VARIANTS } from "@/constants/socialVariants";
import { ArrowLeft, ImagePlus, Search, Image as ImageIcon, Layers, Upload } from "lucide-react";

export default function SocialKit() {
  const [assets, setAssets] = useState<MasterImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<MasterImage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(
    new Set(SOCIAL_VARIANTS.map(v => v.id))
  );
  const [variantSelectorExpanded, setVariantSelectorExpanded] = useState(false);

  useEffect(() => {
    loadMasterImages();
  }, []);

  const loadMasterImages = async () => {
    setLoading(true);
    try {
      const masterImages = await fetchMasterImages();
      setAssets(masterImages);
    } catch (error) {
      console.error("Error loading master images:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateClick = (asset: MasterImage) => {
    setSelectedAsset(asset);
    setModalOpen(true);
  };

  const handleGenerateComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    loadMasterImages();
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
                  Social Media Image Generator
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
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Platform Variants</span>
                  <Badge variant="secondary">
                    {selectedVariants.size}/{SOCIAL_VARIANTS.length} selected
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setVariantSelectorExpanded(!variantSelectorExpanded)}
                >
                  {variantSelectorExpanded ? "Collapse" : "Expand"}
                </Button>
              </div>
              {variantSelectorExpanded && (
                <PlatformVariantSelector
                  selectedVariants={selectedVariants}
                  onSelectionChange={setSelectedVariants}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Search and Upload */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search master images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button className="shrink-0" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Master Image
          </Button>
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
                    {asset.url ? (
                      <img
                        src={asset.url}
                        alt={asset.name}
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
                        Generate Images
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium truncate mb-1">{asset.name || "Untitled"}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {asset.contentType && (
                        <Badge variant="outline" className="text-xs">{asset.contentType}</Badge>
                      )}
                      {asset.aiPercentage > 0 && (
                        <Badge variant="secondary" className="text-xs">AI: {asset.aiPercentage}%</Badge>
                      )}
                    </div>
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
            url: selectedAsset.url,
            title: selectedAsset.name,
            salesforce_id: selectedAsset.id
          }}
          onComplete={handleGenerateComplete}
        />
      )}

      {/* Upload Dialog */}
      <MasterImageUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadComplete={(asset) => {
          // Refresh the list to show the new upload
          loadMasterImages();
        }}
      />
    </div>
  );
}
