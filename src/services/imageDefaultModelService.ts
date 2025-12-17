import { getImageModelById, ImageModel } from './imageModelRegistry';

// Intelligent defaults for each image use-case
const INITIAL_DEFAULTS: Record<string, string> = {
  'quick-concept': 'gemini-flash-image',    // Fast, included in plan
  'shot-coverage': 'flux-schnell',          // Ultra-fast for 3x3 grids
  'trailer-prep': 'gemini-3-pro-image',     // Premium quality for keyframes
  'directors-cut': 'flux-dev',              // High-quality production
};

const STORAGE_KEY = 'image_preset_default_models';

export class ImageDefaultModelService {
  /**
   * Get the default model ID for a specific image use-case
   */
  static getDefaultModelId(useCaseId: string): string {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const defaults: Record<string, string> = JSON.parse(stored);
        return defaults[useCaseId] || INITIAL_DEFAULTS[useCaseId] || 'gemini-flash-image';
      } catch {
        // Fall back to initial defaults if parsing fails
      }
    }
    return INITIAL_DEFAULTS[useCaseId] || 'gemini-flash-image';
  }

  /**
   * Get the default model object for a specific use-case
   */
  static getDefaultModel(useCaseId: string): ImageModel | undefined {
    const modelId = this.getDefaultModelId(useCaseId);
    return getImageModelById(modelId);
  }

  /**
   * Set the default model for a specific use-case
   */
  static setDefaultModel(useCaseId: string, modelId: string): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    let defaults: Record<string, string> = {};
    
    if (stored) {
      try {
        defaults = JSON.parse(stored);
      } catch {
        defaults = {};
      }
    }
    
    defaults[useCaseId] = modelId;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  }

  /**
   * Get all default models as a mapping
   */
  static getAllDefaults(): Record<string, string> {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...INITIAL_DEFAULTS, ...JSON.parse(stored) };
      } catch {
        // Fall back to initial defaults if parsing fails
      }
    }
    return { ...INITIAL_DEFAULTS };
  }

  /**
   * Reset all defaults to initial values
   */
  static resetAllDefaults(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
