// Content Defaults Service
// Manages sticky user defaults for Salesforce catalog fields using localStorage

import {
  GLOBAL_DEFAULTS,
  CONTEXT_DEFAULTS,
  SalesforceFieldDefaults,
} from '@/constants/salesforceFields';

const STORAGE_KEY = 'wmc_content_catalog_defaults';

// Fields that should be remembered as sticky defaults
const STICKY_FIELDS: (keyof SalesforceFieldDefaults)[] = [
  'contentClass',
  'scene',
  'contentType',
  'generationMethod',
  'aspectRatio',
];

export class ContentDefaultsService {
  /**
   * Get merged defaults based on priority order:
   * 1. Context-specific defaults (if context provided)
   * 2. Sticky user defaults (last-used values)
   * 3. Global system defaults (fallback)
   */
  static getDefaults(context?: string, userId?: string): SalesforceFieldDefaults {
    // Start with global defaults
    let defaults: SalesforceFieldDefaults = { ...GLOBAL_DEFAULTS };

    // Apply sticky user defaults (overrides global)
    const stickyDefaults = this.getStickyDefaults(userId);
    defaults = { ...defaults, ...stickyDefaults };

    // Apply context overrides (highest priority for context-specific fields)
    if (context && CONTEXT_DEFAULTS[context]) {
      defaults = { ...defaults, ...CONTEXT_DEFAULTS[context] };
    }

    return defaults;
  }

  /**
   * Get stored sticky defaults for a user
   */
  static getStickyDefaults(userId?: string): Partial<SalesforceFieldDefaults> {
    try {
      const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only return sticky-enabled fields
        const filtered: Partial<SalesforceFieldDefaults> = {};
        STICKY_FIELDS.forEach(field => {
          if (parsed[field]) {
            (filtered as any)[field] = parsed[field];
          }
        });
        return filtered;
      }
    } catch (error) {
      console.warn('Failed to load sticky defaults:', error);
    }
    return {};
  }

  /**
   * Save a field value as a new sticky default
   * Only saves fields that are in the STICKY_FIELDS list
   */
  static setStickyDefault(
    field: keyof SalesforceFieldDefaults,
    value: string,
    userId?: string
  ): void {
    // Only save sticky-enabled fields
    if (!STICKY_FIELDS.includes(field)) {
      return;
    }

    try {
      const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
      const current = this.getStickyDefaults(userId);
      const updated = { ...current, [field]: value };
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save sticky default:', error);
    }
  }

  /**
   * Save multiple sticky defaults at once
   */
  static setStickyDefaults(
    fields: Partial<SalesforceFieldDefaults>,
    userId?: string
  ): void {
    try {
      const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
      const current = this.getStickyDefaults(userId);
      
      // Only save sticky-enabled fields
      const filtered: Partial<SalesforceFieldDefaults> = { ...current };
      STICKY_FIELDS.forEach(field => {
        if (fields[field]) {
          (filtered as any)[field] = fields[field];
        }
      });
      
      localStorage.setItem(key, JSON.stringify(filtered));
    } catch (error) {
      console.warn('Failed to save sticky defaults:', error);
    }
  }

  /**
   * Reset all sticky defaults for a user
   */
  static resetStickyDefaults(userId?: string): void {
    try {
      const key = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to reset sticky defaults:', error);
    }
  }

  /**
   * Check if any sticky defaults have been set
   */
  static hasStickyDefaults(userId?: string): boolean {
    const sticky = this.getStickyDefaults(userId);
    return Object.keys(sticky).length > 0;
  }
}

export default ContentDefaultsService;
