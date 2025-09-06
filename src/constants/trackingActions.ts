// Centralized tracking action type constants
export const TRACKING_ACTIONS = {
  VIDEO_CLICKED: 'Video Clicked',
  AUDIO_CLICKED: 'Audio Clicked',
  LOGIN: 'Login',
  DOCUMENT_CLICKED: 'Document Clicked'
} as const;

export type TrackingAction = typeof TRACKING_ACTIONS[keyof typeof TRACKING_ACTIONS];