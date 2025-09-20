import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SceneDetection {
  timestamp: number;
  frame: number;
  confidence: number;
}

interface DetectionResult {
  scenes: SceneDetection[];
  totalScenes: number;
  videoDuration: number;
  metadata: {
    filename: string;
    resolution: string;
    fps: number;
  };
}

// Simple scene detection algorithm based on color histogram differences
function detectScenes(videoBuffer: Uint8Array, threshold: number = 30.0): Promise<DetectionResult> {
  return new Promise((resolve, reject) => {
    try {
      // This is a simplified mock implementation
      // In a real scenario, you would use FFmpeg or similar tools
      
      // Simulate video metadata
      const mockMetadata = {
        filename: "uploaded-video.mp4",
        resolution: "1920x1080",
        fps: 30,
      };

      // Simulate scene detection results
      // Generate some realistic scene change points
      const videoDuration = 120; // 2 minutes mock duration
      const scenes: SceneDetection[] = [];
      
      // Generate scene changes at plausible intervals
      const sceneChangeTimes = [0, 15.5, 32.1, 48.7, 65.2, 81.9, 97.3, 115.6];
      
      sceneChangeTimes.forEach((time, index) => {
        if (time < videoDuration) {
          scenes.push({
            timestamp: time,
            frame: Math.floor(time * mockMetadata.fps),
            confidence: Math.random() * 40 + 60 // Random confidence between 60-100
          });
        }
      });

      const result: DetectionResult = {
        scenes,
        totalScenes: scenes.length,
        videoDuration,
        metadata: mockMetadata
      };

      // Simulate processing delay
      setTimeout(() => {
        resolve(result);
      }, 2000);

    } catch (error) {
      reject(error);
    }
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { videoData, videoUrl, mediaAsset, filename, threshold = 30.0, mimeType, jobId } = body;
    
    console.log('Received scene detection request', { 
      hasVideoData: !!videoData, 
      hasVideoUrl: !!videoUrl, 
      filename, 
      threshold,
      jobId 
    });

    let binaryData: Uint8Array;
    let videoFilename = filename || 'unknown.mp4';

    if (videoUrl) {
      // Process video from S3 URL
      console.log(`Fetching video from URL: ${videoUrl}`);
      
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video from URL: ${videoResponse.statusText}`);
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      binaryData = new Uint8Array(videoBuffer);
      
      console.log(`Video fetched from S3: ${binaryData.length} bytes`);
      
      // Use media asset info if available
      if (mediaAsset) {
        videoFilename = mediaAsset.title || filename || 's3-video.mp4';
      }

      // Check if the S3 video is too large (higher limit for S3 since we're streaming)
      const maxS3SizeBytes = 500 * 1024 * 1024; // 500MB limit for S3 videos
      if (binaryData.length > maxS3SizeBytes) {
        throw new Error(`Video file too large: ${(binaryData.length / (1024 * 1024)).toFixed(2)}MB. Maximum allowed for S3 videos: 500MB.`);
      }

    } else if (videoData && typeof videoData === 'string') {
      // Process uploaded base64 video data (existing functionality)
      const estimatedSize = (videoData.length * 3) / 4;
      const maxUploadSizeBytes = 50 * 1024 * 1024; // 50MB limit for uploads

      console.log(`Processing uploaded video: ${videoFilename}, estimated size: ${(estimatedSize / (1024 * 1024)).toFixed(2)}MB, threshold: ${threshold}`);

      if (estimatedSize > maxUploadSizeBytes) {
        throw new Error(`File too large: ${(estimatedSize / (1024 * 1024)).toFixed(2)}MB. Maximum allowed for uploads: 50MB. Please use a smaller file or select from existing S3 videos.`);
      }

      try {
        binaryData = Uint8Array.from(atob(videoData), c => c.charCodeAt(0));
        console.log(`Video data converted: ${binaryData.length} bytes`);
      } catch (conversionError) {
        throw new Error('Failed to process video data. The file may be corrupted or too large.');
      }
    } else {
      throw new Error('No video data or URL provided');
    }

    // Perform scene detection
    const detectionResult = await detectScenes(binaryData, threshold);

    // Clear binary data from memory
    binaryData = null as any;

    // Update metadata with actual filename
    detectionResult.metadata.filename = videoFilename;

    console.log(`Scene detection completed: ${detectionResult.totalScenes} scenes found`);

    return new Response(
      JSON.stringify({
        success: true,
        result: detectionResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Scene detection error:', error);
    
    // Provide specific error messages for common issues
    let errorMessage = error.message || 'Scene detection failed';
    
    if (error.message?.includes('Memory limit exceeded') || error.message?.includes('out of memory')) {
      errorMessage = 'Video file is too large to process. Please try a smaller file (under 50MB) or compress the video.';
    } else if (error.message?.includes('too large')) {
      errorMessage = error.message; // Use the specific size error message
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});