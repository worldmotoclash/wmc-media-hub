import { supabase } from "@/integrations/supabase/client";
import { MediaAsset } from "./unifiedMediaService";

export interface SceneDetection {
  timestamp: number;
  frame: number;
  confidence: number;
  thumbnail?: string; // Base64 encoded thumbnail image
}

export interface DetectionResult {
  scenes: SceneDetection[];
  totalScenes: number;
  videoDuration: number;
  metadata: {
    filename: string;
    resolution: string;
    fps: number;
  };
}

export interface VideoSceneDetectionRecord {
  id: string;
  mediaAssetId?: string;
  threshold: number;
  totalScenes: number;
  videoDuration?: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  results: DetectionResult;
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Create a new scene detection job for a media asset
export async function createSceneDetectionJob(
  mediaAssetId: string,
  threshold: number
): Promise<string> {
  try {
    console.log('Creating scene detection job for media asset:', mediaAssetId);
    
    const { data, error } = await supabase.functions.invoke('create-scene-detection-job', {
      body: {
        mediaAssetId,
        threshold
      }
    });

    if (error) {
      console.error('Error calling create-scene-detection-job function:', error);
      throw new Error(`Failed to create scene detection job: ${error.message}`);
    }

    if (!data?.jobId) {
      throw new Error('No job ID returned from create-scene-detection-job function');
    }

    console.log('Scene detection job created:', data.jobId);
    return data.jobId;
  } catch (error) {
    console.error('Error in createSceneDetectionJob:', error);
    throw error;
  }
}

// Create a scene detection job for an uploaded file (no media asset)
export async function createUploadSceneDetectionJob(
  threshold: number,
  filename: string
): Promise<string> {
  try {
    console.log('Creating scene detection job for upload:', filename);
    
    const { data, error } = await supabase.functions.invoke('create-scene-detection-job', {
      body: {
        threshold,
        filename
      }
    });

    if (error) {
      console.error('Error calling create-scene-detection-job function:', error);
      throw new Error(`Failed to create scene detection job: ${error.message}`);
    }

    if (!data?.jobId) {
      throw new Error('No job ID returned from create-scene-detection-job function');
    }

    console.log('Upload scene detection job created:', data.jobId);
    return data.jobId;
  } catch (error) {
    console.error('Error in createUploadSceneDetectionJob:', error);
    throw error;
  }
}

// Update scene detection job with results
export async function updateSceneDetectionJob(
  jobId: string,
  updates: Partial<{
    processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
    totalScenes: number;
    videoDuration: number;
    results: any;
    errorMessage: string;
    processedAt: string;
  }>
): Promise<void> {
  const dbUpdates: any = {};
  
  if (updates.processingStatus) dbUpdates.processing_status = updates.processingStatus;
  if (updates.totalScenes !== undefined) dbUpdates.total_scenes = updates.totalScenes;
  if (updates.videoDuration !== undefined) dbUpdates.video_duration = updates.videoDuration;
  if (updates.results) dbUpdates.results = updates.results;
  if (updates.errorMessage) dbUpdates.error_message = updates.errorMessage;
  if (updates.processedAt) dbUpdates.processed_at = updates.processedAt;
  
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('video_scene_detections')
    .update(dbUpdates)
    .eq('id', jobId);

  if (error) throw error;
}

export async function getSceneDetectionJob(jobId: string): Promise<VideoSceneDetectionRecord | null> {
  const { data, error } = await supabase
    .from('video_scene_detections')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return {
    id: data.id,
    mediaAssetId: data.media_asset_id,
    threshold: data.threshold,
    totalScenes: data.total_scenes,
    videoDuration: data.video_duration,
    processingStatus: data.processing_status as 'pending' | 'processing' | 'completed' | 'failed',
    results: (data.results as any) || { scenes: [], totalScenes: 0, videoDuration: 0, metadata: {} },
    errorMessage: data.error_message,
    processedAt: data.processed_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    createdBy: data.created_by
  };
}

// Get scene detection history for a media asset
export async function getMediaAssetSceneDetections(
  mediaAssetId: string
): Promise<VideoSceneDetectionRecord[]> {
  const { data, error } = await supabase
    .from('video_scene_detections')
    .select('*')
    .eq('media_asset_id', mediaAssetId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(record => ({
    id: record.id,
    mediaAssetId: record.media_asset_id,
    threshold: record.threshold,
    totalScenes: record.total_scenes,
    videoDuration: record.video_duration,
    processingStatus: record.processing_status as 'pending' | 'processing' | 'completed' | 'failed',
    results: (record.results as any) || { scenes: [], totalScenes: 0, videoDuration: 0, metadata: {} },
    errorMessage: record.error_message,
    processedAt: record.processed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    createdBy: record.created_by
  }));
}

// Client-side scene detection processing  
export async function processClientSideSceneDetection(
  jobId: string,
  results: DetectionResult
): Promise<DetectionResult> {
  console.log('Storing client-side scene detection results for job:', jobId);
  
  try {
    // Update job status to processing
    await updateSceneDetectionJob(jobId, {
      processingStatus: 'processing',
      updatedAt: new Date().toISOString()
    });

    // Store the pre-processed results using the edge function
    const { data, error } = await supabase.functions.invoke('detect-video-scenes', {
      body: {
        jobId,
        results
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      await updateSceneDetectionJob(jobId, {
        processingStatus: 'failed',
        errorMessage: error.message || 'Unknown error occurred',
        updatedAt: new Date().toISOString()
      });
      throw error;
    }

    if (!data?.success) {
      const errorMessage = data?.error || 'Failed to store scene detection results';
      console.error('Scene detection storage failed:', errorMessage);
      await updateSceneDetectionJob(jobId, {
        processingStatus: 'failed',
        errorMessage: errorMessage,
        updatedAt: new Date().toISOString()
      });
      throw new Error(errorMessage);
    }

    console.log('Scene detection results stored successfully');
    return results;

  } catch (error) {
    console.error('Error storing scene detection results:', error);
    await updateSceneDetectionJob(jobId, {
      processingStatus: 'failed',
      errorMessage: error.message || 'Unknown error occurred',
      updatedAt: new Date().toISOString()
    });
    throw error;
  }
}

// Get all scene detection jobs (for admin view)
export async function getAllSceneDetectionJobs(
  limit = 50,
  offset = 0
): Promise<{ jobs: VideoSceneDetectionRecord[]; total: number }> {
  // Get total count
  const { count } = await supabase
    .from('video_scene_detections')
    .select('*', { count: 'exact', head: true });

    // Get jobs with media asset info
  const { data, error } = await supabase
    .from('video_scene_detections')
    .select(`
      *,
      media_assets (
        title,
        file_url,
        thumbnail_url
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const jobs = data.map(record => ({
    id: record.id,
    mediaAssetId: record.media_asset_id,
    threshold: record.threshold,
    totalScenes: record.total_scenes,
    videoDuration: record.video_duration,
    processingStatus: record.processing_status as 'pending' | 'processing' | 'completed' | 'failed',
    results: (record.results as any) || { scenes: [], totalScenes: 0, videoDuration: 0, metadata: {} },
    errorMessage: record.error_message,
    processedAt: record.processed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    createdBy: record.created_by
  }));

  return { jobs, total: count || 0 };
}