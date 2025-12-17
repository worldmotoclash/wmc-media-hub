import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  Clock, 
  Zap, 
  Eye, 
  GitCompare, 
  Info,
  Volume2,
  MessageSquare,
  Grid3X3,
  Palette,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  ImagePlus,
  ArrowLeftRight
} from "lucide-react";
import { AIModel } from "@/services/modelRegistry";
import { NormalizedPricing } from "@/services/pricingService";

interface ModelCardProps {
  model: AIModel;
  pricing: NormalizedPricing;
  onQuickPreview: (model: AIModel) => void;
  onCompare: (model: AIModel) => void;
  onDetails: (model: AIModel) => void;
  onSelect: (model: AIModel) => void;
  isSelected?: boolean;
  isComparing?: boolean;
}

const CAPABILITY_ICONS: Record<string, any> = {
  'audio_generation': Volume2,
  'lip_sync': MessageSquare,
  'multi_shot': Grid3X3,
  'cinematic': Palette,
  'ultra_fast': Zap,
  'long_form': Clock,
  'image_to_video': ImagePlus,
  'start_end_image': ArrowLeftRight,
};

const IMAGE_CAPABILITIES = ['image_to_video', 'start_end_image'];

const CAPABILITY_LABELS: Record<string, string> = {
  'image_to_video': 'Start Image',
  'start_end_image': 'Start + End',
};

const STATUS_CONFIG = {
  online: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
  degraded: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  paused: { icon: PauseCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  pricing,
  onQuickPreview,
  onCompare,
  onDetails,
  onSelect,
  isSelected,
  isComparing,
}) => {
  const StatusIcon = STATUS_CONFIG[model.status].icon;
  const statusConfig = STATUS_CONFIG[model.status];

  const formatLatencyRange = (range: [number, number]): string => {
    const [min, max] = range;
    if (max < 60) return `${min}-${max}s`;
    if (max < 3600) return `${Math.round(min/60)}-${Math.round(max/60)}m`;
    return `${Math.round(min/3600)}-${Math.round(max/3600)}h`;
  };

  const getCommercialBadgeColor = (use: string) => {
    switch (use) {
      case 'allowed': return 'bg-green-100 text-green-800';
      case 'restricted': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card 
      className={`relative transition-all duration-200 hover:shadow-lg cursor-pointer ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      } ${model.status !== 'online' ? 'opacity-75' : ''}`}
      onClick={() => onSelect(model)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <span>{model.displayName}</span>
              <Badge variant="outline" className="text-xs font-normal">
                {model.vendor}
              </Badge>
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {model.description}
            </CardDescription>
          </div>
          <div className={`p-1 rounded-full ${statusConfig.bg}`}>
            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pricing Display */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">EFFECTIVE PRICE</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {pricing.pricingBasis === 'per_second' ? '/sec' : '/run'}
            </Badge>
          </div>
          
          <div className="text-2xl font-bold text-foreground">
            ${pricing.effectivePrice.toFixed(2)}
          </div>
          
          <div className="text-xs text-muted-foreground mt-1">
            Base: ${model.pricing.basePrice.toFixed(2)}{pricing.pricingBasis === 'per_second' ? '/sec' : '/run'}
          </div>
        </div>

        {/* Key Strengths */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">Key Strengths</div>
          <div className="flex flex-wrap gap-1">
            {model.strengths.slice(0, 3).map((strength) => (
              <Badge key={strength} variant="secondary" className="text-xs">
                {strength}
              </Badge>
            ))}
          </div>
        </div>

        {/* Image Input Capabilities - Prominent badges */}
        {model.capabilities.some(cap => IMAGE_CAPABILITIES.includes(cap)) && (
          <div className="flex flex-wrap gap-1.5">
            {model.capabilities
              .filter(cap => IMAGE_CAPABILITIES.includes(cap))
              .map((capability) => {
                const Icon = CAPABILITY_ICONS[capability];
                return (
                  <Badge 
                    key={capability} 
                    className="bg-primary/10 text-primary border-primary/20 text-xs flex items-center gap-1"
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {CAPABILITY_LABELS[capability]}
                  </Badge>
                );
              })}
          </div>
        )}

        {/* Other Capabilities */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">Capabilities</div>
          <div className="flex flex-wrap gap-2">
            {model.capabilities
              .filter(cap => !IMAGE_CAPABILITIES.includes(cap))
              .slice(0, 4)
              .map((capability) => {
                const Icon = CAPABILITY_ICONS[capability];
                return (
                  <div key={capability} className="flex items-center gap-1">
                    {Icon && <Icon className="w-3 h-3 text-muted-foreground" />}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Latency & Quality */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-muted-foreground mb-1">Latency</div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>~{formatLatencyRange(model.latency.range)}</span>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Quality</div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-xs">
                {model.qualityTier}
              </Badge>
            </div>
          </div>
        </div>

        {/* Commercial Use */}
        <div>
          <Badge 
            className={`text-xs ${getCommercialBadgeColor(model.commercialUse)}`}
          >
            {model.commercialUse === 'allowed' ? 'Commercial OK' : 
             model.commercialUse === 'restricted' ? 'Limited Commercial' : 
             'License Unknown'}
          </Badge>
        </div>

        {/* Uptime */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Uptime</span>
            <span>{model.uptime.toFixed(1)}%</span>
          </div>
          <Progress value={model.uptime} className="h-1" />
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onQuickPreview(model);
            }}
            className="flex-1 text-xs"
            disabled={model.status !== 'online'}
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onCompare(model);
            }}
            className="flex-1 text-xs"
          >
            <GitCompare className="w-3 h-3 mr-1" />
            {isComparing ? 'Added' : 'Compare'}
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDetails(model);
            }}
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};