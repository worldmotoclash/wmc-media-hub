// Content ID Preview Generator
// Generates a preview of the system-generated Content ID based on catalog fields

import { ContentCatalogFields } from '@/constants/salesforceFields';

/**
 * Generate a preview of the Content ID based on the current field values.
 * The actual Content ID is finalized server-side with a sequence number.
 *
 * Format: DOMAIN_EVENT_TRACK_CLASS_TYPE_RATIO_VERSION_###
 * Example: WMC_PRESEASON_NA_PROMO_VIDEO_16-9_V1_###
 */
export function generateContentIdPreview(fields: Partial<ContentCatalogFields>): string {
  const parts = [
    fields.domain || 'WMC',
    fields.eventCode || 'PRESEASON',
    fields.raceTrackCode || 'NA',
    fields.contentClass || 'PROMO',
    fields.contentType || 'VIDEO',
    (fields.aspectRatio || '16x9').replace('x', '-'),
    fields.version || 'V1',
    '###'  // Placeholder for sequence number (assigned server-side)
  ];

  return parts.join('_');
}

/**
 * Validate that Content ID preview is not using placeholder/invalid values
 * for race-specific content.
 */
export function validateNonRaceContent(fields: Partial<ContentCatalogFields>): {
  valid: boolean;
  warning?: string;
} {
  // Check for non-race event codes
  const nonRaceEventCodes = ['PRESEASON', 'MARKETING', 'EVERGREEN'];
  const isNonRaceEvent = nonRaceEventCodes.includes(fields.eventCode || '');
  
  // Non-race content should use NA for track
  if (isNonRaceEvent && fields.raceTrackCode && fields.raceTrackCode !== 'NA') {
    return {
      valid: false,
      warning: 'Non-race content (PRESEASON, MARKETING, EVERGREEN) should use "Not Applicable" for Race Track',
    };
  }

  // Race event codes should have a real track
  const raceEventCodes = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10'];
  const isRaceEvent = raceEventCodes.includes(fields.eventCode || '');
  
  if (isRaceEvent && fields.raceTrackCode === 'NA') {
    return {
      valid: false,
      warning: 'Race event content should specify a race track',
    };
  }

  return { valid: true };
}

/**
 * Get a shortened preview suitable for badges/pills
 */
export function getShortContentIdPreview(fields: Partial<ContentCatalogFields>): string {
  const parts = [
    fields.domain || 'WMC',
    fields.eventCode || 'PRESEASON',
    fields.contentClass || 'PROMO',
    '...'
  ];

  return parts.join('_');
}
