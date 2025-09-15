import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

// Import marketplace components
import { PresetBar, PresetSettings } from "@/components/model-marketplace/PresetBar";
import { FilterSidebar, ModelFilters } from "@/components/model-marketplace/FilterSidebar";
import { ModelCard } from "@/components/model-marketplace/ModelCard";
import { ModelDetailsDrawer } from "@/components/model-marketplace/ModelDetailsDrawer";

// Import services
import { MODEL_REGISTRY, AIModel } from "@/services/modelRegistry";
import { PricingService, GenerationSettings } from "@/services/pricingService";

const ModelMarketplace: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [selectedPreset, setSelectedPreset] = useState('teaser');
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
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

  // Check authentication
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

  // Filter models based on current filters
  const filteredModels = useMemo(() => {
    return MODEL_REGISTRY.filter(model => {
      // Vendor filter
      if (filters.vendors.length > 0 && !filters.vendors.includes(model.vendor)) {
        return false;
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
  }, [filters]);

  // Calculate model counts for filter sidebar
  const modelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    MODEL_REGISTRY.forEach(model => {
      // Vendor counts
      counts[`vendor-${model.vendor}`] = (counts[`vendor-${model.vendor}`] || 0) + 1;
      
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
  }, []);

  // Get recommended models for current settings
  const recommendedModels = useMemo(() => {
    return PricingService.getRecommendations(
      filteredModels, 
      generationSettings, 
      selectedPreset as any
    );
  }, [filteredModels, generationSettings, selectedPreset]);

  // Calculate effective pricing for display
  const effectivePrice = useMemo(() => {
    if (recommendedModels.length === 0) {
      return { perRun: '$0.00', perSecond: '$0.00' };
    }

    const topModel = recommendedModels[0];
    const pricing = PricingService.calculateNormalizedPricing(topModel, generationSettings);
    
    return {
      perRun: PricingService.formatPrice(pricing.pricePerRun),
      perSecond: PricingService.formatPrice(pricing.pricePerSecond)
    };
  }, [recommendedModels, generationSettings]);

  // Event handlers
  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
  };

  const handleSettingsChange = (newSettings: Partial<PresetSettings>) => {
    setPresetSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleFiltersChange = (newFilters: Partial<ModelFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);
    // Here you would typically navigate to the generation form with the selected model
    toast({
      title: "Model Selected",
      description: `${model.displayName} is ready for video generation`,
    });
  };

  const handleQuickPreview = (model: AIModel) => {
    toast({
      title: "Quick Preview",
      description: `Starting 3-second preview with ${model.displayName}`,
    });
    // Implement preview logic here
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
            onClick={() => navigate('/admin/media')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Media Hub
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-4 text-foreground flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary" />
              AI Video Marketplace
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Zero-friction model picking with apples-to-apples pricing
            </p>
            <p className="text-muted-foreground">
              Choose the perfect AI model for your racing content creation
            </p>
          </motion.div>
        </div>

        {/* Preset Bar */}
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
              {recommendedModels.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Recommended for {selectedPreset}: {recommendedModels.slice(0, 3).map(m => m.displayName).join(', ')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredModels.map((model) => {
                const pricing = PricingService.calculateNormalizedPricing(model, generationSettings);
                
                return (
                  <ModelCard
                    key={model.id}
                    model={model}
                    pricing={pricing}
                    onQuickPreview={handleQuickPreview}
                    onCompare={handleCompare}
                    onDetails={handleDetails}
                    onSelect={handleModelSelect}
                    isSelected={selectedModel?.id === model.id}
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
          pricing={detailsModel ? PricingService.calculateNormalizedPricing(detailsModel, generationSettings) : null}
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