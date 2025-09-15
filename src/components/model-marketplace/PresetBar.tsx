import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Zap, Film, MessageSquare, Grid3X3, Smartphone, DollarSign, Clock } from "lucide-react";
import { DefaultModelService } from "@/services/defaultModelService";

export interface PresetSettings {
  duration: number[];
  resolution: string;
  fps: number;
  audio: boolean;
  aspectRatio: string;
}

interface PresetBarProps {
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  settings: PresetSettings;
  onSettingsChange: (settings: Partial<PresetSettings>) => void;
  effectivePrice: { perRun: string; perSecond: string };
}

const PRESETS = [
  {
    id: 'teaser',
    name: 'Teaser',
    description: 'Fast & cheap',
    icon: Zap,
    color: 'bg-emerald-500',
    settings: { duration: [5], resolution: '720p', fps: 24, audio: false, aspectRatio: '16:9' }
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: '1080p+',
    icon: Film,
    color: 'bg-purple-500',
    settings: { duration: [10], resolution: '1080p', fps: 30, audio: false, aspectRatio: '21:9' }
  },
  {
    id: 'lip-sync',
    name: 'Lip-Sync',
    description: 'Talking head',
    icon: MessageSquare,
    color: 'bg-blue-500',
    settings: { duration: [8], resolution: '1080p', fps: 30, audio: true, aspectRatio: '16:9' }
  },
  {
    id: 'multi-shot',
    name: 'Multi-Shot',
    description: 'Coherent',
    icon: Grid3X3,
    color: 'bg-orange-500',
    settings: { duration: [15], resolution: '1080p', fps: 24, audio: false, aspectRatio: '16:9' }
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Vertical',
    icon: Smartphone,
    color: 'bg-pink-500',
    settings: { duration: [6], resolution: '720p', fps: 30, audio: false, aspectRatio: '9:16' }
  }
];

export const PresetBar: React.FC<PresetBarProps> = ({
  selectedPreset,
  onPresetChange,
  settings,
  onSettingsChange,
  effectivePrice,
}) => {
  const handlePresetClick = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      onPresetChange(presetId);
      onSettingsChange(preset.settings);
    }
  };

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Presets */}
        <div className="flex-1">
          <Label className="text-sm font-medium mb-3 block">Use-Case Presets</Label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPreset === preset.id;
              const defaultModel = DefaultModelService.getDefaultModel(preset.id);
              
              return (
                <div key={preset.id} className="flex flex-col items-center">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetClick(preset.id)}
                    className={`flex items-center gap-2 mb-1 ${isSelected ? preset.color : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{preset.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {preset.description}
                    </Badge>
                  </Button>
                  {defaultModel && (
                    <div className="text-xs text-muted-foreground text-center max-w-24 truncate">
                      {defaultModel.displayName}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Controls */}
        <div className="lg:w-96 space-y-4">
          <Label className="text-sm font-medium block">Global Controls</Label>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Duration: {settings.duration[0]}s</Label>
              <Slider
                value={settings.duration}
                onValueChange={(value) => onSettingsChange({ duration: value })}
                min={3}
                max={60}
                step={1}
                className="w-full"
              />
            </div>

            {/* Resolution */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Resolution</Label>
              <Select 
                value={settings.resolution} 
                onValueChange={(value) => onSettingsChange({ resolution: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="480p">480p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="2K">2K</SelectItem>
                  <SelectItem value="4K">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* FPS */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">FPS</Label>
              <Select 
                value={settings.fps.toString()} 
                onValueChange={(value) => onSettingsChange({ fps: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 fps</SelectItem>
                  <SelectItem value="30">30 fps</SelectItem>
                  <SelectItem value="60">60 fps</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
              <Select 
                value={settings.aspectRatio} 
                onValueChange={(value) => onSettingsChange({ aspectRatio: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                  <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  <SelectItem value="21:9">21:9 (Cinematic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Audio Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="audio"
              checked={settings.audio}
              onCheckedChange={(checked) => onSettingsChange({ audio: checked })}
            />
            <Label htmlFor="audio" className="text-sm">Include Audio</Label>
          </div>
        </div>

        {/* Pricing Display */}
        <div className="lg:w-48 bg-muted/30 rounded-lg p-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">INSTANT PRICE</span>
            </div>
            
            <div className="space-y-1">
              <div className="text-2xl font-bold text-foreground">
                {effectivePrice.perRun}
              </div>
              <div className="text-xs text-muted-foreground">per run</div>
            </div>

            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{effectivePrice.perSecond}/sec</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};