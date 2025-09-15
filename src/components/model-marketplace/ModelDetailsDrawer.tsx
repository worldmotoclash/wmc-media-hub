import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Clock, 
  Monitor, 
  Volume2, 
  Zap,
  Shield,
  Activity,
  TrendingUp,
  FileText,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Info
} from "lucide-react";
import { AIModel } from "@/services/modelRegistry";
import { NormalizedPricing, GenerationSettings } from "@/services/pricingService";

interface ModelDetailsDrawerProps {
  model: AIModel | null;
  pricing: NormalizedPricing | null;
  settings: GenerationSettings;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectModel?: (model: AIModel) => void;
}

export const ModelDetailsDrawer: React.FC<ModelDetailsDrawerProps> = ({
  model,
  pricing,
  settings,
  isOpen,
  onOpenChange,
  onSelectModel,
}) => {
  if (!model || !pricing) {
    return null;
  }

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getCommercialColor = (use: string) => {
    switch (use) {
      case 'allowed': return 'text-green-600 bg-green-50';
      case 'restricted': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'paused': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-xl">{model.displayName}</SheetTitle>
            <Badge variant="outline">{model.vendor}</Badge>
          </div>
          <SheetDescription className="text-base">
            {model.description}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Pricing Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="w-4 h-4" />
                Pricing Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Effective Price</div>
                  <div className="text-2xl font-bold">${pricing.effectivePrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Per Second</div>
                  <div className="text-lg font-semibold">${pricing.pricePerSecond.toFixed(3)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base Cost ({pricing.pricingBasis}):</span>
                  <span>${pricing.breakdown.baseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Resolution Multiplier ({settings.resolution}):</span>
                  <span>{pricing.breakdown.resolutionMultiplier.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Duration Multiplier ({settings.duration}s):</span>
                  <span>{pricing.breakdown.durationMultiplier.toFixed(1)}x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Audio Multiplier:</span>
                  <span>{pricing.breakdown.audioMultiplier.toFixed(1)}x</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="w-4 h-4" />
                Technical Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Max Duration</div>
                  <div className="font-medium">{model.specs.maxDuration}s</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Max Resolution</div>
                  <div className="font-medium">{model.specs.maxResolution}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">FPS Options</div>
                  <div className="font-medium">{model.specs.fpsOptions.join(', ')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Audio Support</div>
                  <div className="flex items-center gap-1">
                    {model.specs.audioSupport ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="font-medium">
                      {model.specs.audioSupport ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Supported Aspect Ratios</div>
                <div className="flex flex-wrap gap-1">
                  {model.specs.aspectRatios.map((ratio) => (
                    <Badge key={ratio} variant="secondary" className="text-xs">
                      {ratio}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance & Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4" />
                Performance & Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Typical Latency</div>
                  <div className="font-medium">{formatDuration(model.latency.typical)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Latency Range</div>
                  <div className="font-medium">
                    {formatDuration(model.latency.range[0])} - {formatDuration(model.latency.range[1])}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Uptime (30 days)</span>
                  <span className="font-medium">{model.uptime.toFixed(1)}%</span>
                </div>
                <Progress value={model.uptime} className="h-2" />
              </div>

              <div className="flex items-center gap-2">
                <Badge className={`${getStatusColor(model.status)}`}>
                  <Activity className="w-3 h-3 mr-1" />
                  {model.status.charAt(0).toUpperCase() + model.status.slice(1)}
                </Badge>
                <Badge className={`${getCommercialColor(model.commercialUse)}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {model.commercialUse === 'allowed' ? 'Commercial OK' : 
                   model.commercialUse === 'restricted' ? 'Limited Commercial' : 'Unknown License'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Key Strengths & Capabilities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4" />
                Key Strengths & Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Strengths</div>
                <div className="flex flex-wrap gap-2">
                  {model.strengths.map((strength) => (
                    <Badge key={strength} variant="default" className="text-xs">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Capabilities</div>
                <div className="flex flex-wrap gap-2">
                  {model.capabilities.map((capability) => (
                    <Badge key={capability} variant="secondary" className="text-xs">
                      {capability.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Tips */}
          {model.promptTips.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" />
                  Prompt Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {model.promptTips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Recent Updates */}
          {model.changelog.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="w-4 h-4" />
                  Recent Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {model.changelog.slice(0, 3).map((update, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                      {update}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Sample Gallery Placeholder */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PlayCircle className="w-4 h-4" />
                Sample Gallery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <PlayCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Sample videos will be available soon
              </p>
            </CardContent>
          </Card>

          {/* Action Button */}
          {onSelectModel && (
            <div className="pt-4">
              <Button 
                onClick={() => onSelectModel(model)}
                className="w-full"
                size="lg"
              >
                <Zap className="w-4 h-4 mr-2" />
                Use {model.displayName}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};