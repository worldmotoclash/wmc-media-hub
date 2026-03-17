import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Wand2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useCreatorGuard } from "@/hooks/useCreatorGuard";

// Import marketplace components
import { PresetBar, PresetSettings } from "@/components/model-marketplace/PresetBar";
import { FilterSidebar, ModelFilters } from "@/components/model-marketplace/FilterSidebar";
import { ModelCard } from "@/components/model-marketplace/ModelCard";
import { ModelDetailsDrawer } from "@/components/model-marketplace/ModelDetailsDrawer";

// Import services
import { MODEL_REGISTRY, AIModel } from "@/services/modelRegistry";
import { IMAGE_MODEL_REGISTRY, ImageModel } from "@/services/imageModelRegistry";
import { PricingService, GenerationSettings, NormalizedPricing } from "@/services/pricingService";
import { DefaultModelService } from "@/services/defaultModelService";
import { ImageDefaultModelService } from "@/services/imageDefaultModelService";

type MarketplaceType = 'video' | 'image';

const ModelMarketplace: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Get marketplace type from URL params (default to 'video')
  const marketplaceType: MarketplaceType = (searchParams.get('type') as MarketplaceType) || 'video';
  const isImageMode = marketplaceType === 'image';
  
  // Get use-case from URL params (for image mode)
  const imageUseCase = searchParams.get('useCase') || 'fast-free';

  // Get preset from URL params or default to 'teaser'
  const initialPreset = searchParams.get('preset') || 'teaser';
  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  const [comparisonModels, setComparisonModels] = useState<AIModel[]>([]);
  const [detailsModel, setDetailsModel] = useState<AIModel | null>(null);

  // Settings state
  const [presetSettings, setPresetSettings] = useState<PresetSettings>({
    duration: [5],
    resolution: '720p',
    fps: 24,
    audio: false,
    aspectRatio: '16:9'
  });

  // Filters state
  const [filters, setFilters] = useState<ModelFilters>({
    vendors: [],
    capabilities: [],
    qualityTiers: [],
    speedTiers: [],
    commercialUse: [],
    availability: []
  });

  const creatorBlocked = useCreatorGuard();
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the model marketplace",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [user, navigate, toast]);

  

  // Generate settings for pricing calculations
  const generationSettings: GenerationSettings = useMemo(() => ({
    duration: presetSettings.duration[0],
    resolution: presetSettings.resolution,
    fps: presetSettings.fps,
    audio: presetSettings.audio,
    aspectRatio: presetSettings.aspectRatio
  }), [presetSettings]);

  // Get the appropriate registry based on marketplace type
  const activeRegistry = useMemo(() => {
    if (isImageMode) {
      // Convert ImageModel to AIModel-like structure for consistent handling
      return IMAGE_MODEL_REGISTRY.map(model => ({
        id: model.id,
        name: model.name,
        displayName: model.displayName,
        vendor: model.vendor as any,
        brand: model.brand,
        pricing: { 
          basis: model.pricing.basis === 'included' ? 'per_run' : 'per_run',
          basePrice: model.pricing.basePrice,
          currency: 'USD' as const
        },
        capabilities: model.capabilities,
        qualityTier: model.qualityTier === 'fast' ? '480p' : model.qualityTier === 'standard' ? '720p' : '1080p',
        speedTier: model.speedTier === 'ultra-fast' ? 'Ultra-fast' : model.speedTier === 'fast' ? 'Standard' : 'High-fidelity',
        specs: {
          maxDuration: 0,
          supportedDurations: [],
          maxResolution: '1080p',
          aspectRatios: ['1:1', '16:9', '9:16'],
          fpsOptions: [],
          audioSupport: false
        },
        latency: { typical: 30, range: [15, 60] as [number, number] },
        commercialUse: model.commercialUse,
        status: model.status,
        strengths: model.strengths,
        description: model.description,
        promptTips: [],
        sampleVideos: [],
        changelog: [],
        uptime: model.uptime
      })) as AIModel[];
    }
    return MODEL_REGISTRY;
  }, [isImageMode]);

  // Filter models based on current filters (with brand support)
  const filteredModels = useMemo(() => {
    return activeRegistry.filter(model => {
      // Vendor filter - check both vendor and brand
      if (filters.vendors.length > 0) {
        const matchesVendor = filters.vendors.includes(model.vendor);
        const matchesBrand = model.brand && filters.vendors.includes(model.brand);
        if (!matchesVendor && !matchesBrand) {
          return false;
        }
      }

      // Capabilities filter
      if (filters.capabilities.length > 0) {
        const hasCapability = filters.capabilities.some(cap => 
          model.capabilities.includes(cap)
        );
        if (!hasCapability) return false;
      }

      // Quality tiers filter
      if (filters.qualityTiers.length > 0 && !filters.qualityTiers.includes(model.qualityTier)) {
        return false;
      }

      // Speed tiers filter
      if (filters.speedTiers.length > 0 && !filters.speedTiers.includes(model.speedTier)) {
        return false;
      }

      // Commercial use filter
      if (filters.commercialUse.length > 0 && !filters.commercialUse.includes(model.commercialUse)) {
        return false;
      }

      // Availability filter
      if (filters.availability.length > 0 && !filters.availability.includes(model.status)) {
        return false;
      }

      return true;
    });
  }, [activeRegistry, filters]);

  // Calculate model counts for filter sidebar (with brand support)
  const modelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    activeRegistry.forEach(model => {
      // Vendor counts
      counts[`vendor-${model.vendor}`] = (counts[`vendor-${model.vendor}`] || 0) + 1;
      
      // Brand counts (for Kling, MiniMax, etc.)
      if (model.brand) {
        counts[`vendor-${model.brand}`] = (counts[`vendor-${model.brand}`] || 0) + 1;
      }
      
      // Capability counts
      model.capabilities.forEach(cap => {
        counts[`capability-${cap}`] = (counts[`capability-${cap}`] || 0) + 1;
      });
      
      // Quality tier counts
      counts[`quality-${model.qualityTier}`] = (counts[`quality-${model.qualityTier}`] || 0) + 1;
      
      // Speed tier counts
      counts[`speed-${model.speedTier}`] = (counts[`speed-${model.speedTier}`] || 0) + 1;
      
      // Commercial use counts
      counts[`commercial-${model.commercialUse}`] = (counts[`commercial-${model.commercialUse}`] || 0) + 1;
      
      // Availability counts
      counts[`availability-${model.status}`] = (counts[`availability-${model.status}`] || 0) + 1;
    });
    
    return counts;
  }, [activeRegistry]);

  // Get recommended models for current settings (video only)
  const recommendedModels = useMemo(() => {
    if (isImageMode) return filteredModels;
    return PricingService.getRecommendations(
      filteredModels, 
      generationSettings, 
      selectedPreset as any
    );
  }, [filteredModels, generationSettings, selectedPreset, isImageMode]);

  // Calculate effective pricing for display (video only)
  const effectivePrice = useMemo(() => {
    if (isImageMode || recommendedModels.length === 0) {
      return { perRun: '$0.00', perSecond: '$0.00' };
    }

    const topModel = recommendedModels[0];
    const pricing = PricingService.calculateNormalizedPricing(topModel, generationSettings);
    
    return {
      perRun: PricingService.formatPrice(pricing.pricePerRun),
      perSecond: PricingService.formatPrice(pricing.pricePerSecond)
    };
  }, [recommendedModels, generationSettings, isImageMode]);

  // Event handlers
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    // Update URL without navigation
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('preset', preset);
    window.history.replaceState(null, '', `?${newSearchParams.toString()}`);
  };

  const handleSettingsChange = (newSettings: Partial<PresetSettings>) => {
    setPresetSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleFiltersChange = (newFilters: Partial<ModelFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleModelSelect = (model: AIModel) => {
    if (isImageMode) {
      // Set this model as the default for the current image use-case
      ImageDefaultModelService.setDefaultModel(imageUseCase, model.id);
      
      toast({
        title: "Default Image Model Set",
        description: `${model.displayName} is now the default for ${imageUseCase.replace('-', ' ')}`,
      });
      
      // Navigate back to generate page with selected model and use-case
      navigate(`/admin/media/generate?type=image&model=${model.id}&useCase=${imageUseCase}`);
      return;
    }
    
    // Set this model as the default for the current preset
    DefaultModelService.setDefaultModel(selectedPreset, model.id);
    
    toast({
      title: "Default Model Set",
      description: `${model.displayName} is now the default for ${selectedPreset}`,
    });
  };

  const handleQuickPreview = (model: AIModel) => {
    toast({
      title: "Quick Preview",
      description: `Starting preview with ${model.displayName}`,
    });
  };

  const handleCompare = (model: AIModel) => {
    if (comparisonModels.includes(model)) {
      setComparisonModels(prev => prev.filter(m => m.id !== model.id));
    } else if (comparisonModels.length < 3) {
      setComparisonModels(prev => [...prev, model]);
    } else {
      toast({
        title: "Comparison Limit",
        description: "You can compare up to 3 models at once",
        variant: "destructive"
      });
    }
  };

  const handleDetails = (model: AIModel) => {
    setDetailsModel(model);
  };

  const handleCloseDetails = () => {
    setDetailsModel(null);
  };

  const handleGenerate = () => {
    if (isImageMode) {
      navigate('/admin/media/generate?type=image');
    } else {
      navigate(`/admin/media/generate?preset=${selectedPreset}`);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => isImageMode ? navigate('/admin/media/generate?type=image') : navigate('/admin/media')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isImageMode ? 'Back to Generate' : 'Back to Media Hub'}
          </Button>
          
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold mb-4 text-foreground flex items-center gap-3">
                {isImageMode ? (
                  <Image className="w-8 h-8 text-primary" />
                ) : (
                  <Sparkles className="w-8 h-8 text-primary" />
                )}
                AI {isImageMode ? 'Image' : 'Video'} Marketplace
              </h1>
              <p className="text-xl text-muted-foreground mb-2">
                {isImageMode 
                  ? 'Browse and select image generation models'
                  : 'Set default models for each use-case and browse available options'
                }
              </p>
              {isImageMode ? (
                <p className="text-muted-foreground">
                  Click on any model to set it as the default for <span className="font-medium capitalize">{imageUseCase.replace('-', ' ')}</span>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Click on any model to set it as the default for {selectedPreset}
                </p>
              )}
            </motion.div>

            <Button size="lg" onClick={handleGenerate} className="ml-4">
              <Wand2 className="w-4 h-4 mr-2" />
              Generate {isImageMode ? 'Image' : 'Video'}
            </Button>
          </div>
        </div>

        {/* Preset Bar (video only) */}
        {!isImageMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
          >
            <PresetBar
              selectedPreset={selectedPreset}
              onPresetChange={handlePresetChange}
              settings={presetSettings}
              onSettingsChange={handleSettingsChange}
              effectivePrice={effectivePrice}
            />
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <FilterSidebar
              filters={filters}
              onFiltersChange={handleFiltersChange}
              modelCounts={modelCounts}
            />
          </motion.div>

          {/* Model Grid */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">
                Available Models ({filteredModels.length})
              </h2>
              {!isImageMode && recommendedModels.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Recommended for {selectedPreset}: {recommendedModels.slice(0, 3).map(m => m.displayName).join(', ')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredModels.map((model) => {
                const basePrice = (model as any).pricing?.basePrice || 0;
                const pricing: NormalizedPricing = isImageMode 
                  ? { 
                      pricePerRun: basePrice, 
                      pricePerSecond: 0, 
                      effectivePrice: basePrice,
                      pricingBasis: 'per_run',
                      breakdown: { baseCost: basePrice, durationMultiplier: 1, resolutionMultiplier: 1, audioMultiplier: 1 }
                    }
                  : PricingService.calculateNormalizedPricing(model, generationSettings);
                
                return (
                  <ModelCard
                    key={model.id}
                    model={model}
                    pricing={pricing}
                    onQuickPreview={handleQuickPreview}
                    onCompare={handleCompare}
                    onDetails={handleDetails}
                    onSelect={handleModelSelect}
                    isSelected={false}
                    isComparing={comparisonModels.some(m => m.id === model.id)}
                  />
                );
              })}
            </div>

            {filteredModels.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No models match your current filters. Try adjusting your selection.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Model Details Drawer */}
        <ModelDetailsDrawer
          model={detailsModel}
          pricing={detailsModel ? (isImageMode 
            ? { pricePerRun: 0, pricePerSecond: 0, effectivePrice: 0, pricingBasis: 'per_run' as const, breakdown: { baseCost: 0, durationMultiplier: 1, resolutionMultiplier: 1, audioMultiplier: 1 } }
            : PricingService.calculateNormalizedPricing(detailsModel, generationSettings)
          ) : null}
          settings={generationSettings}
          isOpen={!!detailsModel}
          onOpenChange={(open) => !open && handleCloseDetails()}
          onSelectModel={handleModelSelect}
        />

        {/* Comparison Tray */}
        {comparisonModels.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-6 right-6 bg-background border rounded-lg p-4 shadow-lg z-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium">Comparing {comparisonModels.length} models:</span>
                <div className="flex gap-2">
                  {comparisonModels.map(model => (
                    <Button key={model.id} variant="outline" size="sm">
                      {model.displayName}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setComparisonModels([])}
                >
                  Clear
                </Button>
                <Button onClick={() => toast({ title: "Coming Soon", description: "Side-by-side comparison view" })}>
                  Compare Models
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ModelMarketplace;
