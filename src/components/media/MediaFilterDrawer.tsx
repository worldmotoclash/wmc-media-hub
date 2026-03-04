import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, FolderOpen, FileVideo, MapPin, Palette, X, Tag } from "lucide-react";
import {
  SearchFilters,
  MediaTag,
  APPROVED_LOCATIONS,
  APPROVED_MOODS,
} from "@/services/unifiedMediaService";

// Salesforce picklist values for Categories
export const APPROVED_CATEGORIES = [
  'Promotional', 'Fan Reactions', 'Racer Backstories',
  'Website Swiper AI Video', 'News', 'Education & Training',
  'Motorworks', 'Unclassified'
] as const;

// Salesforce picklist values for Content Type
export const APPROVED_CONTENT_TYPES = [
  'Promotional', 'Teaser', 'Interview', 'Behind the Scenes',
  'Announcement', 'Highlight', 'Educational', 'Experimental'
] as const;

interface MediaFilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  availableTags?: MediaTag[];
}

export const MediaFilterDrawer: React.FC<MediaFilterDrawerProps> = ({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  availableTags = [],
}) => {
  const toggleArrayFilter = (
    key: 'categories' | 'contentTypes' | 'locations' | 'moods' | 'tagIds',
    value: string,
    checked: boolean
  ) => {
    const current = filters[key] || [];
    const updated = checked
      ? [...current, value]
      : current.filter((v) => v !== value);
    onFilterChange({ ...filters, [key]: updated.length > 0 ? updated : undefined });
  };

  const clearSection = (key: 'categories' | 'contentTypes' | 'locations' | 'moods' | 'tagIds') => {
    onFilterChange({ ...filters, [key]: undefined });
  };

  const clearAllFilters = () => {
    onFilterChange({
      ...filters,
      categories: undefined,
      contentTypes: undefined,
      locations: undefined,
      moods: undefined,
      tagIds: undefined,
    });
  };

  const activeFilterCount =
    (filters.categories?.length || 0) +
    (filters.contentTypes?.length || 0) +
    (filters.locations?.length || 0) +
    (filters.moods?.length || 0) +
    (filters.tagIds?.length || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              Salesforce Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary">{activeFilterCount}</Badge>
              )}
            </SheetTitle>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {/* Categories Section */}
            <FilterSection
              title="Categories"
              icon={<FolderOpen className="w-4 h-4" />}
              items={APPROVED_CATEGORIES as unknown as string[]}
              selectedItems={filters.categories || []}
              onToggle={(value, checked) => toggleArrayFilter('categories', value, checked)}
              onClear={() => clearSection('categories')}
            />

            {/* Content Type Section */}
            <FilterSection
              title="Content Type"
              icon={<FileVideo className="w-4 h-4" />}
              items={APPROVED_CONTENT_TYPES as unknown as string[]}
              selectedItems={filters.contentTypes || []}
              onToggle={(value, checked) => toggleArrayFilter('contentTypes', value, checked)}
              onClear={() => clearSection('contentTypes')}
            />

            {/* Location / Scene Section */}
            <FilterSection
              title="Location / Scene"
              icon={<MapPin className="w-4 h-4" />}
              items={APPROVED_LOCATIONS as unknown as string[]}
              selectedItems={filters.locations || []}
              onToggle={(value, checked) => toggleArrayFilter('locations', value, checked)}
              onClear={() => clearSection('locations')}
              scrollable
            />

            {/* Mood / Tone Section */}
            <FilterSection
              title="Mood / Tone"
              icon={<Palette className="w-4 h-4" />}
              items={APPROVED_MOODS as unknown as string[]}
              selectedItems={filters.moods || []}
              onToggle={(value, checked) => toggleArrayFilter('moods', value, checked)}
              onClear={() => clearSection('moods')}
              scrollable
            />

            {/* Tags Section */}
            {availableTags.length > 0 && (
              <FilterSection
                title="Tags"
                icon={<Tag className="w-4 h-4" />}
                items={availableTags.map(t => t.id)}
                itemLabels={Object.fromEntries(availableTags.map(t => [t.id, t.name]))}
                selectedItems={filters.tagIds || []}
                onToggle={(value, checked) => toggleArrayFilter('tagIds', value, checked)}
                onClear={() => clearSection('tagIds')}
                scrollable
              />
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

interface FilterSectionProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  itemLabels?: Record<string, string>;
  selectedItems: string[];
  onToggle: (value: string, checked: boolean) => void;
  onClear: () => void;
  scrollable?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  icon,
  items,
  itemLabels,
  selectedItems,
  onToggle,
  onClear,
  scrollable = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const selectedCount = selectedItems.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
        <span className="font-medium flex items-center gap-2">
          {icon}
          {title}
        </span>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedCount}
            </Badge>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pt-2 px-1">
          {selectedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="text-xs text-muted-foreground mb-2 h-7"
            >
              <X className="w-3 h-3 mr-1" />
              Clear {title}
            </Button>
          )}
          <div className={scrollable ? 'max-h-48 overflow-y-auto space-y-1.5' : 'space-y-1.5'}>
            {items.map((item) => (
              <div key={item} className="flex items-center space-x-2 py-1">
                <Checkbox
                  id={`filter-${title}-${item}`}
                  checked={selectedItems.includes(item)}
                  onCheckedChange={(checked) => onToggle(item, !!checked)}
                />
                <label
                  htmlFor={`filter-${title}-${item}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {itemLabels?.[item] || item}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default MediaFilterDrawer;
