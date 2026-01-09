import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SOCIAL_VARIANTS, MAX_VARIANTS_PER_REQUEST } from "@/constants/socialVariants";
import { generateSocialKit, processVariant, updateJobVariantStatus, VariantStatus } from "@/services/socialKitService";
import { IMAGE_PROCESSING_MODELS, getAvailableImageProcessingModels } from "@/services/imageProcessingModels";
import { ImagePlus, AlertCircle, Cpu, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PlatformVariantSelector } from "./PlatformVariantSelector";
import { useUser } from "@/contexts/UserContext";
import { ContentCatalogForm } from "./ContentCatalogForm";
import { ContentCatalogFields } from "@/constants/salesforceFields";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SocialKitGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterAsset: {
    id: string;
    url: string;
    title?: string;
    salesforce_id?: string;
    masterId?: string;
  };
  onComplete?: () => void;
}

export function SocialKitGeneratorModal({
  open,
  onOpenChange,
  masterAsset,
  onComplete
}: SocialKitGeneratorModalProps) {
  const { user } = useUser();
  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(
    new Set(SOCIAL_VARIANTS.map(v => v.id))
  );
  const [selectedModel, setSelectedModel] = useState<string>("native_resize");
  const [isGenerating, setIsGenerating] = useState(false);
  const [variantStatuses, setVariantStatuses] = useState<Map<string, VariantStatus>>(new Map());
  const [progress, setProgress] = useState(0);
  const [catalogFields, setCatalogFields] = useState<ContentCatalogFields | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  const availableModels = getAvailableImageProcessingModels();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedVariants(new Set(SOCIAL_VARIANTS.map(v => v.id)));
      setSelectedModel("native_resize");
      setIsGenerating(false);
      setVariantStatuses(new Map());
      setProgress(0);
      setCatalogFields(null);
      setIsCatalogOpen(false);
    }
  }, [open]);

  const handleGenerate = async () => {
    if (selectedVariants.size === 0) {
      toast({
        title: "No Variants Selected",
        description: "Please select at least one variant to generate",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    const variants = SOCIAL_VARIANTS.filter(v => selectedVariants.has(v.id));

    // Initialize statuses
    const initialStatuses = new Map<string, VariantStatus>();
    variants.forEach(v => {
      initialStatuses.set(v.id, {
        id: v.id,
        platform: v.platform,
        variant: v.variant,
        width: v.width,
        height: v.height,
        status: "pending"
      });
    });
    setVariantStatuses(initialStatuses);

    try {
      // Create the job
      const job = await generateSocialKit({
        masterAssetId: masterAsset.id,
        masterImageUrl: masterAsset.url,
        selectedVariants: variants,
        salesforceMasterId: masterAsset.salesforce_id,
        selectedModel,
      });

      // Process each variant
      let completed = 0;
      for (const variant of variants) {
        // Update status to generating
        setVariantStatuses(prev => {
          const updated = new Map(prev);
          updated.set(variant.id, { ...updated.get(variant.id)!, status: "generating" });
          return updated;
        });

        await updateJobVariantStatus(job.id, variant.id, "generating");

        // Process the variant with the selected model
        const result = await processVariant(
          job.id,
          variant,
          masterAsset.url,
          masterAsset.masterId || masterAsset.id,
          masterAsset.salesforce_id,
          selectedModel,
          user?.id  // Pass creator Contact ID
        );

        // Update status
        const status: VariantStatus = {
          id: variant.id,
          platform: variant.platform,
          variant: variant.variant,
          width: variant.width,
          height: variant.height,
          status: result.success ? "completed" : "failed",
          url: result.url,
          error: result.error,
          assetId: result.assetId
        };

        setVariantStatuses(prev => {
          const updated = new Map(prev);
          updated.set(variant.id, status);
          return updated;
        });

        await updateJobVariantStatus(
          job.id,
          variant.id,
          result.success ? "completed" : "failed",
          result.url,
          result.error,
          result.assetId
        );

        completed++;
        setProgress((completed / variants.length) * 100);
      }

      toast({
        title: "Images Generated",
        description: `Successfully generated ${completed} variants`
      });

      onComplete?.();
    } catch (error) {
      console.error("Error generating social kit:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getModelIcon = (modelId: string) => {
    if (modelId === "native_resize") {
      return <Cpu className="h-4 w-4" />;
    }
    return <Sparkles className="h-4 w-4" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Generate Social Media Images
          </DialogTitle>
          <DialogDescription>
            {masterAsset.title ? `From: ${masterAsset.title}` : "Generate platform-specific image variants from your master image"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
          {/* Model Selector */}
          {!isGenerating && (
            <div className="space-y-2">
              <Label htmlFor="model-select">Processing Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger id="model-select" className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(model => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex items-center gap-2">
                        {getModelIcon(model.id)}
                        <div className="flex flex-col">
                          <span>{model.displayName}</span>
                          <span className="text-xs text-muted-foreground">
                            {model.pricing.basis === "free" ? "Free" : `$${model.pricing.basePrice}/image`}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {IMAGE_PROCESSING_MODELS.find(m => m.id === selectedModel)?.description}
              </p>
            </div>
          )}

          {/* Content Catalog Fields (Collapsible) */}
          {!isGenerating && (
            <Collapsible open={isCatalogOpen} onOpenChange={setIsCatalogOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2 border-t pt-3">
                {isCatalogOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>Salesforce Catalog Fields</span>
                <span className="text-[10px] ml-auto text-muted-foreground">Optional</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <ContentCatalogForm
                  context="social"
                  compact
                  hideAdvanced={false}
                  initialValues={{
                    naturalName: masterAsset.title || "",
                  }}
                  autoDetectContentType="image"
                  onFieldChange={setCatalogFields}
                />
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Progress bar during generation */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Generating variants...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Platform Variant Selector */}
          <div className="flex-1 overflow-hidden">
            <PlatformVariantSelector
              selectedVariants={selectedVariants}
              onSelectionChange={setSelectedVariants}
              disabled={isGenerating}
              variantStatuses={variantStatuses}
            />
          </div>

          {/* Warning for no selection */}
          {selectedVariants.size === 0 && !isGenerating && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              Select at least one variant to generate
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            {isGenerating ? "Close" : "Cancel"}
          </Button>
          {!isGenerating && (
            <Button onClick={handleGenerate} disabled={selectedVariants.size === 0}>
              <ImagePlus className="h-4 w-4 mr-2" />
              Generate Kit ({selectedVariants.size})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
