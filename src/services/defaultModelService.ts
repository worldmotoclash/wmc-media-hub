import { AIModel, getModelById } from './modelRegistry';

export interface PresetDefaultModel {
  presetId: string;
  modelId: string;
}

// Intelligent defaults for each preset
const INITIAL_DEFAULTS: Record<string, string> = {
  'teaser': 'wan_ultrafast',      // Fast & cheap
  'cinematic': 'veo3_full',       // High quality 
  'lip-sync': 'dreamina_1080p',   // Good for talking heads
  'multi-shot': 'kling_pro',      // Coherent, longer duration
  'social': 'wan_fun'             // Good for social content, 9:16 aspect ratio
};

const STORAGE_KEY = 'preset_default_models';

export class DefaultModelService {
  /**
   * Get the default model for a specific preset
   */
  static getDefaultModelId(presetId: string): string {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const defaults: Record<string, string> = JSON.parse(stored);
        return defaults[presetId] || INITIAL_DEFAULTS[presetId] || 'wan_ultrafast';
      } catch {
        // Fall back to initial defaults if parsing fails
      }
    }
    return INITIAL_DEFAULTS[presetId] || 'wan_ultrafast';
  }

  /**
   * Get the default model object for a specific preset
   */
  static getDefaultModel(presetId: string): AIModel | null {
    const modelId = this.getDefaultModelId(presetId);
    return getModelById(modelId);
  }

  /**
   * Set the default model for a specific preset
   */
  static setDefaultModel(presetId: string, modelId: string): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    let defaults: Record<string, string> = {};
    
    if (stored) {
      try {
        defaults = JSON.parse(stored);
      } catch {
        // Start fresh if parsing fails
        defaults = {};
      }
    }
    
    defaults[presetId] = modelId;
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