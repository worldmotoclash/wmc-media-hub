import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Zap, 
  Volume2, 
  MessageSquare, 
  Grid3X3, 
  Palette, 
  Monitor,
  Clock,
  Shield,
  Activity,
  Filter
} from "lucide-react";

export interface ModelFilters {
  vendors: string[];
  capabilities: string[];
  qualityTiers: string[];
  speedTiers: string[];
  commercialUse: string[];
  availability: string[];
}

interface FilterSidebarProps {
  filters: ModelFilters;
  onFiltersChange: (filters: Partial<ModelFilters>) => void;
  modelCounts: Record<string, number>;
}

const VENDOR_OPTIONS = [
  { id: 'Google', name: 'Google', icon: Building2, color: 'bg-blue-500' },
  { id: 'ByteDance', name: 'ByteDance', icon: Building2, color: 'bg-red-500' },
  { id: 'WaveSpeed', name: 'WaveSpeed', icon: Building2, color: 'bg-purple-500' },
  { id: 'Luma', name: 'Luma', icon: Building2, color: 'bg-green-500' },
  { id: 'Pika', name: 'Pika', icon: Building2, color: 'bg-orange-500' },
  { id: 'PixVerse', name: 'PixVerse', icon: Building2, color: 'bg-pink-500' },
  { id: 'Kling', name: 'Kling', icon: Building2, color: 'bg-yellow-500' },
  { id: 'MiniMax', name: 'MiniMax', icon: Building2, color: 'bg-indigo-500' },
  { id: 'OpenAI', name: 'OpenAI', icon: Building2, color: 'bg-emerald-500' },
];

const CAPABILITY_OPTIONS = [
  { id: 'audio_generation', name: 'Audio', icon: Volume2, description: 'Includes audio generation' },
  { id: 'lip_sync', name: 'Lip-Sync', icon: MessageSquare, description: 'Accurate lip synchronization' },
  { id: 'multi_shot', name: 'Multi-Shot', icon: Grid3X3, description: 'Scene coherence' },
  { id: 'cinematic', name: 'Cinematic', icon: Palette, description: 'Film-quality visuals' },
  { id: 'ultra_fast', name: 'Ultra-Fast', icon: Zap, description: 'Under 30s generation' },
  { id: 'long_form', name: 'Long-Form', icon: Clock, description: 'Extended durations' },
];

const QUALITY_TIERS = [
  { id: '480p', name: '480p', description: 'Standard definition' },
  { id: '720p', name: '720p', description: 'HD ready' },
  { id: '1080p', name: '1080p', description: 'Full HD' },
  { id: '2K', name: '2K', description: 'Quad HD' },
  { id: '4K', name: '4K', description: 'Ultra HD' },
];

const SPEED_TIERS = [
  { id: 'Ultra-fast', name: 'Ultra-Fast', description: '< 1 minute', color: 'bg-green-500' },
  { id: 'Standard', name: 'Standard', description: '1-3 minutes', color: 'bg-yellow-500' },
  { id: 'High-fidelity', name: 'High-Fidelity', description: '3+ minutes', color: 'bg-red-500' },
];

const COMMERCIAL_USE_OPTIONS = [
  { id: 'allowed', name: 'Commercial Allowed', color: 'bg-green-500' },
  { id: 'restricted', name: 'Restricted Use', color: 'bg-yellow-500' },
  { id: 'unknown', name: 'Unknown License', color: 'bg-gray-500' },
];

const AVAILABILITY_OPTIONS = [
  { id: 'online', name: 'Online', color: 'bg-green-500' },
  { id: 'degraded', name: 'Degraded', color: 'bg-yellow-500' },
  { id: 'paused', name: 'Paused', color: 'bg-red-500' },
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFiltersChange,
  modelCounts,
}) => {
  const handleFilterToggle = (
    category: keyof ModelFilters,
    value: string,
    checked: boolean
  ) => {
    const currentValues = filters[category];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    
    onFiltersChange({ [category]: newValues });
  };

  const FilterSection = ({ 
    title, 
    icon: Icon, 
    children 
  }: { 
    title: string; 
    icon: any; 
    children: React.ReactNode; 
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">{title}</Label>
      </div>
      <div className="space-y-2 ml-6">
        {children}
      </div>
    </div>
  );

  const CheckboxItem = ({ 
    id, 
    label, 
    description, 
    checked, 
    onCheckedChange, 
    badge,
    count 
  }: {
    id: string;
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    badge?: React.ReactNode;
    count?: number;
  }) => (
    <div className="flex items-start space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Label htmlFor={id} className="text-sm cursor-pointer">
            {label}
          </Label>
          {badge}
          {count !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );

  return (
    <Card className="w-80 h-fit sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Filter className="w-4 h-4" />
          Filter Models
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vendors */}
        <FilterSection title="Vendors" icon={Building2}>
          {VENDOR_OPTIONS.map((vendor) => (
            <CheckboxItem
              key={vendor.id}
              id={`vendor-${vendor.id}`}
              label={vendor.name}
              checked={filters.vendors.includes(vendor.id)}
              onCheckedChange={(checked) => 
                handleFilterToggle('vendors', vendor.id, checked)
              }
              badge={
                <div className={`w-3 h-3 rounded-full ${vendor.color}`} />
              }
              count={modelCounts[`vendor-${vendor.id}`]}
            />
          ))}
        </FilterSection>

        <Separator />

        {/* Capabilities */}
        <FilterSection title="Capabilities" icon={Zap}>
          {CAPABILITY_OPTIONS.map((capability) => {
            const Icon = capability.icon;
            return (
              <CheckboxItem
                key={capability.id}
                id={`capability-${capability.id}`}
                label={capability.name}
                description={capability.description}
                checked={filters.capabilities.includes(capability.id)}
                onCheckedChange={(checked) => 
                  handleFilterToggle('capabilities', capability.id, checked)
                }
                badge={<Icon className="w-3 h-3" />}
                count={modelCounts[`capability-${capability.id}`]}
              />
            );
          })}
        </FilterSection>

        <Separator />

        {/* Quality Tiers */}
        <FilterSection title="Quality Tiers" icon={Monitor}>
          {QUALITY_TIERS.map((tier) => (
            <CheckboxItem
              key={tier.id}
              id={`quality-${tier.id}`}
              label={tier.name}
              description={tier.description}
              checked={filters.qualityTiers.includes(tier.id)}
              onCheckedChange={(checked) => 
                handleFilterToggle('qualityTiers', tier.id, checked)
              }
              count={modelCounts[`quality-${tier.id}`]}
            />
          ))}
        </FilterSection>

        <Separator />

        {/* Speed Tiers */}
        <FilterSection title="Speed Tiers" icon={Clock}>
          {SPEED_TIERS.map((tier) => (
            <CheckboxItem
              key={tier.id}
              id={`speed-${tier.id}`}
              label={tier.name}
              description={tier.description}
              checked={filters.speedTiers.includes(tier.id)}
              onCheckedChange={(checked) => 
                handleFilterToggle('speedTiers', tier.id, checked)
              }
              badge={
                <div className={`w-3 h-3 rounded-full ${tier.color}`} />
              }
              count={modelCounts[`speed-${tier.id}`]}
            />
          ))}
        </FilterSection>

        <Separator />

        {/* Commercial Use */}
        <FilterSection title="Commercial Use" icon={Shield}>
          {COMMERCIAL_USE_OPTIONS.map((option) => (
            <CheckboxItem
              key={option.id}
              id={`commercial-${option.id}`}
              label={option.name}
              checked={filters.commercialUse.includes(option.id)}
              onCheckedChange={(checked) => 
                handleFilterToggle('commercialUse', option.id, checked)
              }
              badge={
                <div className={`w-3 h-3 rounded-full ${option.color}`} />
              }
              count={modelCounts[`commercial-${option.id}`]}
            />
          ))}
        </FilterSection>

        <Separator />

        {/* Availability */}
        <FilterSection title="Availability" icon={Activity}>
          {AVAILABILITY_OPTIONS.map((option) => (
            <CheckboxItem
              key={option.id}
              id={`availability-${option.id}`}
              label={option.name}
              checked={filters.availability.includes(option.id)}
              onCheckedChange={(checked) => 
                handleFilterToggle('availability', option.id, checked)
              }
              badge={
                <div className={`w-3 h-3 rounded-full ${option.color}`} />
              }
              count={modelCounts[`availability-${option.id}`]}
            />
          ))}
        </FilterSection>
      </CardContent>
    </Card>
  );
};