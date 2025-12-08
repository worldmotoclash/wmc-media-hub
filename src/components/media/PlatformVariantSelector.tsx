import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { 
  PLATFORMS, 
  PLATFORM_CONFIG, 
  getVariantsByPlatform, 
  SocialVariant,
  MAX_VARIANTS_PER_REQUEST
} from "@/constants/socialVariants";
import { VariantStatus } from "@/services/socialKitService";
import { toast } from "@/hooks/use-toast";

interface PlatformVariantSelectorProps {
  selectedVariants: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  disabled?: boolean;
  variantStatuses?: Map<string, VariantStatus>;
}

export function PlatformVariantSelector({
  selectedVariants,
  onSelectionChange,
  disabled = false,
  variantStatuses = new Map()
}: PlatformVariantSelectorProps) {
  const variantsByPlatform = getVariantsByPlatform();
  const totalVariants = Object.values(variantsByPlatform).flat().length;
  const isGenerating = disabled && variantStatuses.size > 0;

  const toggleVariant = (variantId: string) => {
    const newSelected = new Set(selectedVariants);
    if (newSelected.has(variantId)) {
      newSelected.delete(variantId);
    } else {
      if (newSelected.size >= MAX_VARIANTS_PER_REQUEST) {
        toast({
          title: "Limit Reached",
          description: `Maximum ${MAX_VARIANTS_PER_REQUEST} variants allowed per request`,
          variant: "destructive"
        });
        return;
      }
      newSelected.add(variantId);
    }
    onSelectionChange(newSelected);
  };

  const togglePlatform = (platform: string) => {
    const platformVariants = variantsByPlatform[platform];
    const allSelected = platformVariants.every(v => selectedVariants.has(v.id));
    const newSelected = new Set(selectedVariants);

    if (allSelected) {
      platformVariants.forEach(v => newSelected.delete(v.id));
    } else {
      platformVariants.forEach(v => {
        if (newSelected.size < MAX_VARIANTS_PER_REQUEST) {
          newSelected.add(v.id);
        }
      });
    }
    onSelectionChange(newSelected);
  };

  const selectAll = () => {
    const allVariants = Object.values(variantsByPlatform).flat();
    onSelectionChange(new Set(allVariants.slice(0, MAX_VARIANTS_PER_REQUEST).map(v => v.id)));
  };

  const deselectAll = () => {
    onSelectionChange(new Set());
  };

  const isPlatformFullySelected = (platform: string) => {
    return variantsByPlatform[platform].every(v => selectedVariants.has(v.id));
  };

  const isPlatformPartiallySelected = (platform: string) => {
    const variants = variantsByPlatform[platform];
    const selectedCount = variants.filter(v => selectedVariants.has(v.id)).length;
    return selectedCount > 0 && selectedCount < variants.length;
  };

  const getStatusIcon = (status: VariantStatus["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "generating":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {/* Global controls */}
      {!isGenerating && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedVariants.size === totalVariants}
              onCheckedChange={(checked) => checked ? selectAll() : deselectAll()}
              disabled={disabled}
            />
            <span className="text-sm font-medium">Select All</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {selectedVariants.size} of {totalVariants} selected
          </span>
        </div>
      )}

      {/* Platform sections */}
      <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
        {PLATFORMS.map(platform => {
          const config = PLATFORM_CONFIG[platform];
          const Icon = config?.icon;
          const variants = variantsByPlatform[platform];
          const platformSelectedCount = variants.filter(v => selectedVariants.has(v.id)).length;

          return (
            <Card key={platform} className="border bg-card">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!isGenerating && (
                      <Checkbox
                        checked={isPlatformFullySelected(platform)}
                        onCheckedChange={() => togglePlatform(platform)}
                        disabled={disabled}
                        className={isPlatformPartiallySelected(platform) ? "data-[state=checked]:bg-primary/50" : ""}
                      />
                    )}
                    {Icon && <Icon className={`h-4 w-4 ${config.colorClass}`} />}
                    <span className="font-medium text-sm">{platform}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {platformSelectedCount}/{variants.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="flex flex-wrap gap-2">
                  {variants.map(variant => {
                    const isSelected = selectedVariants.has(variant.id);
                    const status = variantStatuses.get(variant.id);

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => !disabled && toggleVariant(variant.id)}
                        disabled={disabled}
                        className={`
                          group relative flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-all
                          ${isSelected 
                            ? "bg-primary/10 border-primary/40 text-foreground" 
                            : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
                          }
                          ${disabled ? "cursor-default" : "cursor-pointer"}
                        `}
                      >
                        <div className="flex items-center gap-2">
                          {isGenerating && status ? (
                            getStatusIcon(status.status)
                          ) : (
                            <div className={`h-2 w-2 rounded-full transition-colors ${
                              isSelected ? "bg-primary" : "bg-muted-foreground/30"
                            }`} />
                          )}
                          <span className="text-sm font-medium">{variant.variant}</span>
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5 pl-4">
                          {variant.width}×{variant.height}
                        </span>
                        {status?.error && (
                          <span className="text-xs text-destructive mt-1 pl-4">{status.error}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}