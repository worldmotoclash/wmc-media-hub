import { supabase } from "@/integrations/supabase/client";
import { MediaAsset } from "./unifiedMediaService";

export interface SceneDetection {
  timestamp: number;
  frame: number;
  confidence: number;
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
  const { data, error } = await supabase
    .from('video_scene_detections')
    .insert({
      media_asset_id: mediaAssetId,
      threshold,
      processing_status: 'pending'
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

// Create a scene detection job for an uploaded file (no media asset)
export async function createUploadSceneDetectionJob(
  threshold: number,
  filename: string
): Promise<string> {
  const { data, error } = await supabase
    .from('video_scene_detections')
    .insert({
      threshold,
      processing_status: 'pending',
      results: { metadata: { filename } }
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
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

// Process scene detection (calls the edge function)
export async function processSceneDetection(
  jobId: string,
  input: { 
    videoData?: string; 
    filename?: string; 
    videoUrl?: string; 
    mediaAsset?: MediaAsset;
    threshold: number;
    mimeType?: string;
  }
): Promise<DetectionResult> {
  // Update job status to processing
  await updateSceneDetectionJob(jobId, {
    processingStatus: 'processing'
  });

  try {
    const { data, error } = await supabase.functions.invoke('detect-video-scenes', {
      body: {
        jobId,
        ...input
      }
    });

    if (error) throw error;

    if (data?.success) {
      // Update job with successful results
      await updateSceneDetectionJob(jobId, {
        processingStatus: 'completed',
        totalScenes: data.result.totalScenes,
        videoDuration: data.result.videoDuration,
        results: data.result,
        processedAt: new Date().toISOString()
      });

      return data.result;
    } else {
      throw new Error(data?.error || 'Scene detection failed');
    }
  } catch (error: any) {
    // Update job with error
    await updateSceneDetectionJob(jobId, {
      processingStatus: 'failed',
      errorMessage: error.message,
      processedAt: new Date().toISOString()
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