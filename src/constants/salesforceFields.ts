// Salesforce Picklist Values and Default Configuration
// Used for content cataloging with intelligent defaults

// Domain picklist values
export const DOMAINS = ['WMC'] as const;

// Event Code picklist values
export const EVENT_CODES = [
  'PRESEASON',   // Default until Race 1
  'MARKETING',
  'EVERGREEN',
  'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'
] as const;

// Race Track Codes
export const RACE_TRACK_CODES = [
  'NA',          // Not Applicable - for non-race content
  'COTA',
  'INDY',
  'ROAD_AMERICA',
  'LAGUNA_SECA',
  'SONOMA',
  'BARBER',
  'MID_OHIO',
  'WATKINS_GLEN',
  'SEBRING',
  'DAYTONA'
] as const;

// Content Class picklist
export const CONTENT_CLASSES = [
  'PROMO',
  'SOCIAL',
  'EDITORIAL',
  'DOCUMENTARY',
  'SPONSOR',
  'INTERNAL'
] as const;

// Scene (Physical Reality) picklist
export const SCENES = [
  'STUDIO',
  'RACE_TRACK',
  'PADDOCK',
  'PIT_LANE',
  'PODIUM',
  'OUTDOOR',
  'URBAN',
  'AERIAL',
  'MIXED_REALITY'
] as const;

// Content Type picklist
export const CONTENT_TYPES = [
  'VIDEO',
  'IMAGE',
  'AUDIO',
  'DOCUMENT',
  'GRAPHIC'
] as const;

// Generation Method picklist
export const GENERATION_METHODS = [
  'AI',
  'CAPTURE',
  'COMPOSITE',
  'STOCK',
  'LICENSED'
] as const;

// Content Intent picklist (workflow driver)
export const CONTENT_INTENTS = [
  'RACE_HIGHLIGHT',
  'INTERVIEW',
  'PROMO',
  'SPONSOR_AD',
  'BEHIND_THE_SCENES',
  'SOCIAL_CLIP',
  'ANNOUNCEMENT',
  'TUTORIAL',
  'CROWD_MOMENT',
  'TRACK_ACTION',
] as const;

// Aspect Ratio picklist
export const ASPECT_RATIOS = [
  '16x9',
  '9x16',
  '1x1',
  '4x5',
  '4x3',
  '21x9'
] as const;

// Version picklist
export const VERSIONS = ['V1', 'V2', 'V3', 'V4', 'V5'] as const;

// Type definitions
export type Domain = typeof DOMAINS[number];
export type EventCode = typeof EVENT_CODES[number];
export type RaceTrackCode = typeof RACE_TRACK_CODES[number];
export type ContentClass = typeof CONTENT_CLASSES[number];
export type Scene = typeof SCENES[number];
export type ContentType = typeof CONTENT_TYPES[number];
export type GenerationMethod = typeof GENERATION_METHODS[number];
export type ContentIntent = typeof CONTENT_INTENTS[number];
export type AspectRatio = typeof ASPECT_RATIOS[number];
export type Version = typeof VERSIONS[number];

// Interface for Salesforce catalog field defaults
export interface SalesforceFieldDefaults {
  domain: Domain;
  eventCode: EventCode;
  raceTrackCode: RaceTrackCode;
  contentClass: ContentClass;
  scene: Scene;
  contentType: ContentType;
  generationMethod: GenerationMethod;
  contentIntent: ContentIntent;
  aspectRatio: AspectRatio;
  version: Version;
}

// Interface for full content metadata (includes user-entered fields)
export interface ContentCatalogFields extends Partial<SalesforceFieldDefaults> {
  naturalName: string;        // Human-entered, editable
  eventDate?: string;         // Optional event date
  // Read-only fields (system-generated, not sent to form)
  catalogId?: string;         // Immutable
  sequence?: number;          // Auto-generated
  contentIdPreview?: string;  // Formula-computed preview
}

// Global system defaults (used when no context or sticky defaults exist)
// These reflect pre-season, non-race marketing content
export const GLOBAL_DEFAULTS: SalesforceFieldDefaults = {
  domain: 'WMC',
  eventCode: 'PRESEASON',
  raceTrackCode: 'NA',
  contentClass: 'PROMO',
  scene: 'STUDIO',
  contentType: 'VIDEO',
  generationMethod: 'AI',
  aspectRatio: '16x9',
  version: 'V1',
};

// Context-specific default overrides
export const CONTEXT_DEFAULTS: Record<string, Partial<SalesforceFieldDefaults>> = {
  'website': {
    contentClass: 'PROMO',
    aspectRatio: '16x9',
    scene: 'STUDIO',
  },
  'social': {
    contentClass: 'SOCIAL',
    aspectRatio: '9x16',
    scene: 'STUDIO',
  },
  'ai-generation': {
    generationMethod: 'AI',
    scene: 'STUDIO',
  },
  'video-upload': {
    contentType: 'VIDEO',
    generationMethod: 'CAPTURE',
  },
  'image-upload': {
    contentType: 'IMAGE',
    generationMethod: 'CAPTURE',
  },
};

// Human-readable labels for picklist values
export const FIELD_LABELS: Record<string, Record<string, string>> = {
  raceTrackCode: {
    'NA': 'Not Applicable',
    'COTA': 'Circuit of The Americas',
    'INDY': 'Indianapolis',
    'ROAD_AMERICA': 'Road America',
    'LAGUNA_SECA': 'Laguna Seca',
    'SONOMA': 'Sonoma Raceway',
    'BARBER': 'Barber Motorsports Park',
    'MID_OHIO': 'Mid-Ohio',
    'WATKINS_GLEN': 'Watkins Glen',
    'SEBRING': 'Sebring',
    'DAYTONA': 'Daytona',
  },
  eventCode: {
    'PRESEASON': 'Pre-Season',
    'MARKETING': 'Marketing',
    'EVERGREEN': 'Evergreen',
    'R1': 'Race 1', 'R2': 'Race 2', 'R3': 'Race 3', 'R4': 'Race 4', 'R5': 'Race 5',
    'R6': 'Race 6', 'R7': 'Race 7', 'R8': 'Race 8', 'R9': 'Race 9', 'R10': 'Race 10',
  },
  generationMethod: {
    'AI': 'AI Generated',
    'CAPTURE': 'Captured/Recorded',
    'COMPOSITE': 'Composite',
    'STOCK': 'Stock Media',
    'LICENSED': 'Licensed Content',
  },
  scene: {
    'STUDIO': 'Studio',
    'RACE_TRACK': 'Race Track',
    'PADDOCK': 'Paddock',
    'PIT_LANE': 'Pit Lane',
    'PODIUM': 'Podium',
    'OUTDOOR': 'Outdoor',
    'URBAN': 'Urban',
    'AERIAL': 'Aerial',
    'MIXED_REALITY': 'Mixed Reality',
  },
};

// Helper to get display label for a field value
export function getFieldLabel(field: string, value: string): string {
  return FIELD_LABELS[field]?.[value] || value;
}
