import { AIModel } from './modelRegistry';

export interface GenerationSettings {
  duration: number;
  resolution: string;
  fps: number;
  audio: boolean;
  aspectRatio: string;
}

export interface NormalizedPricing {
  pricePerRun: number;
  pricePerSecond: number;
  effectivePrice: number;
  pricingBasis: 'per_run' | 'per_second';
  breakdown: {
    baseCost: number;
    durationMultiplier: number;
    resolutionMultiplier: number;
    audioMultiplier: number;
  };
}

export interface ModelScore {
  overall: number;
  speed: number;
  quality: number;
  cost: number;
  weighted: number;
}

export const PRESET_WEIGHTS = {
  teaser: { speed: 0.4, quality: 0.2, cost: 0.4 },
  cinematic: { speed: 0.1, quality: 0.7, cost: 0.2 },
  'lip-sync': { speed: 0.2, quality: 0.6, cost: 0.2 },
  'multi-shot': { speed: 0.2, quality: 0.5, cost: 0.3 },
  social: { speed: 0.3, quality: 0.4, cost: 0.3 },
};

export class PricingService {
  private static getResolutionMultiplier(resolution: string): number {
    const multipliers: Record<string, number> = {
      '480p': 1.0,
      '720p': 1.2,
      '1080p': 1.5,
      '2K': 2.0,
      '4K': 3.0,
    };
    return multipliers[resolution] || 1.0;
  }

  private static getDurationMultiplier(duration: number, model: AIModel): number {
    // Some models have tiered pricing based on duration
    if (model.pricing.basis === 'per_second') {
      return 1.0; // Already accounted for in per-second pricing
    }
    
    // For per-run models, apply duration tiers
    if (duration <= 5) return 1.0;
    if (duration <= 10) return 1.2;
    if (duration <= 20) return 1.5;
    return 2.0;
  }

  private static getAudioMultiplier(hasAudio: boolean, model: AIModel): number {
    if (!hasAudio || !model.specs.audioSupport) return 1.0;
    return 1.3; // Audio adds 30% to cost
  }

  public static calculateNormalizedPricing(
    model: AIModel,
    settings: GenerationSettings
  ): NormalizedPricing {
    const resolutionMultiplier = this.getResolutionMultiplier(settings.resolution);
    const durationMultiplier = this.getDurationMultiplier(settings.duration, model);
    const audioMultiplier = this.getAudioMultiplier(settings.audio, model);

    const baseCost = model.pricing.basePrice;
    
    let effectivePrice: number;
    let pricePerRun: number;
    let pricePerSecond: number;

    if (model.pricing.basis === 'per_second') {
      // Per-second pricing
      const costPerSecond = baseCost * resolutionMultiplier * audioMultiplier;
      effectivePrice = costPerSecond * settings.duration;
      pricePerSecond = costPerSecond;
      pricePerRun = effectivePrice;
    } else {
      // Per-run pricing
      effectivePrice = baseCost * resolutionMultiplier * durationMultiplier * audioMultiplier;
      pricePerRun = effectivePrice;
      pricePerSecond = effectivePrice / settings.duration;
    }

    return {
      pricePerRun,
      pricePerSecond,
      effectivePrice,
      pricingBasis: model.pricing.basis,
      breakdown: {
        baseCost,
        durationMultiplier,
        resolutionMultiplier,
        audioMultiplier,
      },
    };
  }

  public static calculateModelScore(
    model: AIModel,
    settings: GenerationSettings,
    preset?: keyof typeof PRESET_WEIGHTS
  ): ModelScore {
    const pricing = this.calculateNormalizedPricing(model, settings);

    // Normalize scores (0-1)
    const speedScore = this.getSpeedScore(model);
    const qualityScore = this.getQualityScore(model);
    const costScore = this.getCostScore(pricing.effectivePrice);

    const overall = (speedScore + qualityScore + costScore) / 3;

    let weighted = overall;
    if (preset && PRESET_WEIGHTS[preset]) {
      const weights = PRESET_WEIGHTS[preset];
      weighted = (
        speedScore * weights.speed +
        qualityScore * weights.quality +
        costScore * weights.cost
      );
    }

    return {
      overall,
      speed: speedScore,
      quality: qualityScore,
      cost: costScore,
      weighted,
    };
  }

  private static getSpeedScore(model: AIModel): number {
    // Lower latency = higher score
    const maxLatency = 600; // 10 minutes
    return Math.max(0, 1 - (model.latency.typical / maxLatency));
  }

  private static getQualityScore(model: AIModel): number {
    const qualityScores: Record<string, number> = {
      '480p': 0.3,
      '720p': 0.6,
      '1080p': 0.8,
      '2K': 0.9,
      '4K': 1.0,
    };

    let score = qualityScores[model.qualityTier] || 0.5;

    // Bonus for premium capabilities
    if (model.capabilities.includes('cinematic')) score += 0.1;
    if (model.capabilities.includes('lip_sync')) score += 0.1;
    if (model.capabilities.includes('multi_shot')) score += 0.1;
    if (model.capabilities.includes('premium')) score += 0.1;

    return Math.min(1, score);
  }

  private static getCostScore(effectivePrice: number): number {
    // Lower cost = higher score (inverted)
    const maxPrice = 5.0; // $5 max
    return Math.max(0, 1 - (effectivePrice / maxPrice));
  }

  public static formatPrice(price: number): string {
    if (price < 0.01) return '<$0.01';
    if (price < 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(2)}`;
  }

  public static getRecommendations(
    models: AIModel[],
    settings: GenerationSettings,
    preset?: keyof typeof PRESET_WEIGHTS
  ): AIModel[] {
    return models
      .filter(model => model.status === 'online')
      .map(model => ({
        model,
        score: this.calculateModelScore(model, settings, preset),
      }))
      .sort((a, b) => b.score.weighted - a.score.weighted)
      .slice(0, 3)
      .map(item => item.model);
  }
}