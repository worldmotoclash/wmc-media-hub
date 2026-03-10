import { useState, useEffect, useMemo, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Lock, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import {
  DOMAINS,
  EVENT_CODES,
  RACE_TRACK_CODES,
  CONTENT_CLASSES,
  SCENES,
  CONTENT_TYPES,
  GENERATION_METHODS,
  CONTENT_INTENTS,
  ASPECT_RATIOS,
  VERSIONS,
  ContentCatalogFields,
  SalesforceFieldDefaults,
  getFieldLabel,
} from "@/constants/salesforceFields";
import { ContentDefaultsService } from "@/services/contentDefaultsService";
import { generateContentIdPreview, validateNonRaceContent } from "@/utils/contentIdGenerator";

export type ContentCatalogContext = 'website' | 'social' | 'ai-generation' | 'video-upload' | 'image-upload';

interface ContentCatalogFormProps {
  context?: ContentCatalogContext;
  initialValues?: Partial<ContentCatalogFields>;
  onFieldChange?: (fields: ContentCatalogFields) => void;
  compact?: boolean;
  hideAdvanced?: boolean;
  autoDetectContentType?: 'video' | 'image';
}

export function ContentCatalogForm({
  context,
  initialValues,
  onFieldChange,
  compact = false,
  hideAdvanced = false,
  autoDetectContentType,
}: ContentCatalogFormProps) {
  const { user } = useUser();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Get merged defaults based on priority: Context > Sticky > Global
  const defaults = useMemo(() => {
    return ContentDefaultsService.getDefaults(context, user?.id);
  }, [context, user?.id]);

  // Form state with defaults applied
  const [fields, setFields] = useState<ContentCatalogFields>(() => ({
    naturalName: initialValues?.naturalName || '',
    ...defaults,
    // Auto-detect content type if provided
    ...(autoDetectContentType && { contentType: autoDetectContentType === 'video' ? 'VIDEO' : 'IMAGE' }),
    ...initialValues,
  }));

  // Update fields when initialValues change (e.g., when filename is set)
  useEffect(() => {
    if (initialValues?.naturalName && !fields.naturalName) {
      setFields(prev => ({ ...prev, naturalName: initialValues.naturalName! }));
    }
  }, [initialValues?.naturalName]);

  // Content ID preview (auto-updates as fields change)
  const contentIdPreview = useMemo(() => generateContentIdPreview(fields), [fields]);

  // Validation for non-race content rules
  const validation = useMemo(() => validateNonRaceContent(fields), [fields]);

  // Notify parent of changes
  const notifyChange = useCallback((updatedFields: ContentCatalogFields) => {
    onFieldChange?.(updatedFields);
  }, [onFieldChange]);

  // Handle field changes
  const handleFieldChange = useCallback((
    field: keyof SalesforceFieldDefaults | 'naturalName' | 'eventDate',
    value: string
  ) => {
    const updatedFields = { ...fields, [field]: value };
    setFields(updatedFields);

    // Save sticky default for applicable fields
    if (field !== 'naturalName' && field !== 'eventDate') {
      ContentDefaultsService.setStickyDefault(field as keyof SalesforceFieldDefaults, value, user?.id);
    }

    notifyChange(updatedFields);
  }, [fields, user?.id, notifyChange]);

  // Handle natural name changes
  const handleNaturalNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFieldChange('naturalName', e.target.value);
  }, [handleFieldChange]);

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {/* Natural Name - REQUIRED, prominent */}
      <div className="space-y-2">
        <Label htmlFor="natural-name" className="text-sm font-medium">
          Natural Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="natural-name"
          value={fields.naturalName}
          onChange={handleNaturalNameChange}
          placeholder="Enter a descriptive name for this content..."
          className={cn(compact && "h-9")}
        />
        <p className="text-xs text-muted-foreground">
          Human-readable name for this content (you choose this)
        </p>
      </div>

      {/* Content ID Preview Badge - READ ONLY */}
      <div className="bg-muted/50 rounded-lg p-3 border">
        <Label className="text-xs text-muted-foreground mb-1 block">
          Content ID (Preview)
        </Label>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            variant="outline"
            className="font-mono text-xs px-2 py-1 bg-background"
          >
            <Lock className="w-3 h-3 mr-1.5 text-muted-foreground" />
            {contentIdPreview}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          This ID is generated automatically and finalized on save.
        </p>
      </div>

      {/* Validation Warning */}
      {!validation.valid && validation.warning && (
        <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{validation.warning}</span>
        </div>
      )}

      {/* Collapsible Advanced Fields */}
      {!hideAdvanced && (
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-2">
            {isAdvancedOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>Advanced Catalog Fields</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              Pre-filled
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Domain */}
              <div className="space-y-1.5">
                <Label className="text-xs">Domain</Label>
                <Select
                  value={fields.domain}
                  onValueChange={(v) => handleFieldChange('domain', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Code */}
              <div className="space-y-1.5">
                <Label className="text-xs">Event Code</Label>
                <Select
                  value={fields.eventCode}
                  onValueChange={(v) => handleFieldChange('eventCode', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CODES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {getFieldLabel('eventCode', c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Race Track */}
              <div className="space-y-1.5">
                <Label className="text-xs">Race Track</Label>
                <Select
                  value={fields.raceTrackCode}
                  onValueChange={(v) => handleFieldChange('raceTrackCode', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RACE_TRACK_CODES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {getFieldLabel('raceTrackCode', t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Class */}
              <div className="space-y-1.5">
                <Label className="text-xs">Content Class</Label>
                <Select
                  value={fields.contentClass}
                  onValueChange={(v) => handleFieldChange('contentClass', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_CLASSES.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Scene */}
              <div className="space-y-1.5">
                <Label className="text-xs">Scene</Label>
                <Select
                  value={fields.scene}
                  onValueChange={(v) => handleFieldChange('scene', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {getFieldLabel('scene', s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">Content Type</Label>
                <Select
                  value={fields.contentType}
                  onValueChange={(v) => handleFieldChange('contentType', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="text-xs">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generation Method */}
              <div className="space-y-1.5">
                <Label className="text-xs">Generation Method</Label>
                <Select
                  value={fields.generationMethod}
                  onValueChange={(v) => handleFieldChange('generationMethod', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATION_METHODS.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">
                        {getFieldLabel('generationMethod', m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <Label className="text-xs">Aspect Ratio</Label>
                <Select
                  value={fields.aspectRatio}
                  onValueChange={(v) => handleFieldChange('aspectRatio', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((a) => (
                      <SelectItem key={a} value={a} className="text-xs">
                        {a.replace('x', ':')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Version */}
              <div className="space-y-1.5">
                <Label className="text-xs">Version</Label>
                <Select
                  value={fields.version}
                  onValueChange={(v) => handleFieldChange('version', v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VERSIONS.map((v) => (
                      <SelectItem key={v} value={v} className="text-xs">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Date */}
              <div className="space-y-1.5">
                <Label className="text-xs">Event Date (optional)</Label>
                <Input
                  type="date"
                  value={fields.eventDate || ''}
                  onChange={(e) => handleFieldChange('eventDate', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export default ContentCatalogForm;
