// Intent-based prompt templates, playlist mappings, and distribution channels
// Data-only — no workflow execution. Used by future automation features.

import type { ContentIntent } from './salesforceFields';

export interface IntentAutomationHints {
  promptTemplate: string;
  suggestedPlaylist: string;
  channels: string[];
}

export const INTENT_AUTOMATION: Record<ContentIntent, IntentAutomationHints> = {
  RACE_HIGHLIGHT: {
    promptTemplate: 'Create a high-energy racing highlight description. Focus on speed, adrenaline, and rider action.',
    suggestedPlaylist: 'Race Highlights',
    channels: ['YouTube', 'X'],
  },
  INTERVIEW: {
    promptTemplate: 'Summarize the key discussion points and pull a memorable quote from the rider or team member.',
    suggestedPlaylist: 'Rider Interviews',
    channels: ['YouTube', 'Blog'],
  },
  PROMO: {
    promptTemplate: 'Generate a compelling marketing caption that builds excitement for World Moto Clash.',
    suggestedPlaylist: 'Promo Clips',
    channels: ['YouTube', 'Instagram'],
  },
  SPONSOR_AD: {
    promptTemplate: 'Create professional ad copy highlighting the sponsor brand integration. Flag as AD_READY.',
    suggestedPlaylist: 'Sponsor Deliverables',
    channels: ['Paid Ads'],
  },
  BEHIND_THE_SCENES: {
    promptTemplate: 'Write a casual, authentic caption capturing the paddock atmosphere and behind-the-scenes moments.',
    suggestedPlaylist: 'Paddock',
    channels: ['Instagram', 'TikTok'],
  },
  SOCIAL_CLIP: {
    promptTemplate: 'Create a short viral caption under 120 characters. Emphasize excitement and shareability.',
    suggestedPlaylist: 'Social Clips',
    channels: ['Instagram', 'TikTok', 'X'],
  },
  ANNOUNCEMENT: {
    promptTemplate: 'Draft a clear, professional news update announcement with key details front and center.',
    suggestedPlaylist: 'Announcements',
    channels: ['YouTube', 'Blog', 'X'],
  },
  TUTORIAL: {
    promptTemplate: 'Create an instructional description with clear learning outcomes and step-by-step context.',
    suggestedPlaylist: 'How-To',
    channels: ['YouTube'],
  },
  CROWD_MOMENT: {
    promptTemplate: 'Capture the electric atmosphere and fan energy. Focus on the crowd reaction and event vibe.',
    suggestedPlaylist: 'Fan Moments',
    channels: ['Instagram', 'TikTok'],
  },
  TRACK_ACTION: {
    promptTemplate: 'Describe the on-track action with technical precision — cornering, overtakes, and race dynamics.',
    suggestedPlaylist: 'Track Action',
    channels: ['YouTube', 'X'],
  },
};
