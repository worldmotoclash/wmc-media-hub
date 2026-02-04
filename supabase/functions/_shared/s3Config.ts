/**
 * Shared S3 Configuration for Edge Functions
 * 
 * This module provides centralized S3 bucket configuration that can be used
 * by all edge functions. It reads from environment variables and provides
 * consistent defaults.
 */

export interface S3Config {
  bucketName: string;
  region: string;
  endpoint: string;
  cdnBaseUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
}

// Default Wasabi S3 configuration
const DEFAULT_BUCKET = 'shortf-media';
const DEFAULT_REGION = 'us-central-1';
const DEFAULT_CDN_BASE_URL = 'https://media.worldmotoclash.com';

/**
 * Get the default S3 configuration for the project.
 * 
 * This function reads credentials from environment variables and uses
 * consistent defaults for bucket name, region, and endpoints.
 * 
 * In the future, this could be extended to read from the s3_bucket_configs
 * database table for dynamic configuration.
 */
export function getS3Config(): S3Config {
  const accessKeyId = Deno.env.get('WASABI_ACCESS_KEY_ID') || '';
  const secretAccessKey = Deno.env.get('WASABI_SECRET_ACCESS_KEY') || '';
  
  const region = DEFAULT_REGION;
  const bucketName = DEFAULT_BUCKET;
  const endpoint = `https://s3.${region}.wasabisys.com`;
  const cdnBaseUrl = DEFAULT_CDN_BASE_URL;
  
  return {
    bucketName,
    region,
    endpoint,
    cdnBaseUrl,
    accessKeyId,
    secretAccessKey,
  };
}

/**
 * Validate that S3 credentials are configured.
 * Throws an error if credentials are missing.
 */
export function validateS3Credentials(): S3Config {
  const config = getS3Config();
  
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new Error('S3 credentials not configured. Please set WASABI_ACCESS_KEY_ID and WASABI_SECRET_ACCESS_KEY.');
  }
  
  return config;
}

/**
 * Get the full S3 upload URL for a given key
 */
export function getS3UploadUrl(s3Key: string): string {
  const config = getS3Config();
  return `${config.endpoint}/${config.bucketName}/${s3Key}`;
}

/**
 * Get the CDN URL for a given S3 key
 */
export function getCdnUrl(s3Key: string): string {
  const config = getS3Config();
  return `${config.cdnBaseUrl}/${s3Key}`;
}

/**
 * S3 path prefixes used throughout the application
 */
export const S3_PATHS = {
  GENERATION_INPUTS: 'GENERATION_INPUTS',
  GENERATION_OUTPUTS: 'GENERATION_OUTPUTS',
  SOCIAL_MEDIA_MASTERS: 'SOCAIL_MEDIA_IMAGES_KNEWTV/masters',
  VIDEO_MASTERS: 'VIDEOS_KNEWTV/masters',
  AUDIO_MASTERS: 'AUDIO_KNEWTV/masters',
  THUMBNAILS: 'Production/Thumbnails',
} as const;
