export const SOCIAL_PLATFORMS = {
  linkedin: { prefix: 'linkedin.com/in/', base: 'https://linkedin.com/in/' },
  youtube: { prefix: 'youtube.com/@', base: 'https://youtube.com/@' },
  facebook: { prefix: 'facebook.com/', base: 'https://facebook.com/' },
  twitter: { prefix: 'x.com/', base: 'https://x.com/' },
  tiktok: { prefix: 'tiktok.com/@', base: 'https://tiktok.com/@' },
  instagram: { prefix: 'instagram.com/', base: 'https://instagram.com/' },
} as const;

export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

/** Strip a full URL down to just the handle */
export const extractHandle = (platform: SocialPlatform, value: string): string => {
  if (!value) return '';
  const { base, prefix } = SOCIAL_PLATFORMS[platform];
  let cleaned = value.trim();

  // Strip full URLs (https:// or http://)
  for (const pattern of [base, base.replace('https://', 'http://'), `https://www.${prefix}`, `http://www.${prefix}`, `www.${prefix}`, prefix]) {
    if (cleaned.toLowerCase().startsWith(pattern.toLowerCase())) {
      cleaned = cleaned.slice(pattern.length);
      break;
    }
  }

  // Remove trailing slashes
  return cleaned.replace(/\/+$/, '');
};

/** Build a full URL from a handle */
export const buildFullUrl = (platform: SocialPlatform, handle: string): string => {
  if (!handle) return '';
  return `${SOCIAL_PLATFORMS[platform].base}${handle}`;
};

/** Validate handle format: alphanumeric, dots, underscores, hyphens */
export const isValidHandle = (handle: string): boolean => {
  if (!handle) return false;
  return /^[a-zA-Z0-9._-]+$/.test(handle);
};

export const STEP_NAMES = [
  'Personal Info',
  'Racing History',
  'Motorcycle',
  '5 Key Questions',
  'Audition Video',
];

/** Check completion for each of the 5 steps */
export const getStepCompletion = (formData: Record<string, string>): boolean[] => {
  const filled = (key: string) => !!(formData[key] && formData[key].trim());

  const hasSocial = filled('linkedin') || filled('youtube') || filled('facebook') || filled('twitter') || filled('tiktok') || filled('instagram');
  const personalComplete = filled('firstName') && filled('lastName') && filled('email') && filled('phone') && hasSocial;

  const racingComplete = filled('yearsExperience') && (filled('racingSeries') || filled('results'));

  const motoComplete = filled('bikeMake') && filled('bikeModel') && filled('bikeYear');

  const questionsComplete = filled('question1') && filled('question2') && filled('question3') && filled('question4') && filled('question5');

  const videoComplete = formData['auditionVideoUploaded'] === 'true';

  return [personalComplete, racingComplete, motoComplete, questionsComplete, videoComplete];
};

/** Return count of completed steps (0-5) */
export const getCompletionCount = (formData: Record<string, string>): number => {
  return getStepCompletion(formData).filter(Boolean).length;
};

/** localStorage key for a racer's application data */
export const getStorageKey = (contactId: string) => `racerApplication_${contactId}`;
