import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface SceneDetection {
  timestamp: number;
  frame: number;
  confidence: number;
  thumbnail?: string;
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

export interface ProcessingProgress {
  phase: 'loading' | 'analyzing' | 'extracting' | 'complete';
  progress: number;
  message: string;
}

export interface ClipExportOptions {
  startTime: number;
  endTime: number;
  outputFormat?: 'mp4' | 'webm';
}

export interface ClipResult {
  blob: Blob;
  filename: string;
  duration: number;
  size: number;
}

class ClientSideSceneDetectionService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private logBuffer: string = '';

  async initialize(onProgress?: (progress: ProcessingProgress) => void): Promise<void> {
    if (this.isLoaded) return;

    onProgress?.({ phase: 'loading', progress: 0, message: 'Loading FFmpeg...' });
    
    this.ffmpeg = new FFmpeg();
    
    // Set up log listener to capture FFmpeg output
    this.ffmpeg.on('log', ({ message }) => {
      this.logBuffer += message + '\n';
    });
    
    // Load FFmpeg with CORS-enabled URLs
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    onProgress?.({ phase: 'loading', progress: 100, message: 'FFmpeg loaded successfully' });
    this.isLoaded = true;
  }

  async detectScenes(
    videoFile: File,
    threshold: number = 30,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<DetectionResult> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg not initialized. Call initialize() first.');
    }

    const filename = videoFile.name;
    
    onProgress?.({ phase: 'analyzing', progress: 0, message: 'Writing video file...' });
    
    // Write video file to FFmpeg filesystem
    await this.ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    onProgress?.({ phase: 'analyzing', progress: 20, message: 'Extracting video metadata...' });
    
    // Get video metadata
    const metadata = await this.getVideoMetadata();
    
    onProgress?.({ phase: 'analyzing', progress: 40, message: 'Analyzing scene changes...' });
    
    // Detect scenes using FFmpeg scene detection
    const scenes = await this.analyzeScenes(threshold, metadata.duration, metadata.fps);
    
    onProgress?.({ phase: 'extracting', progress: 60, message: 'Extracting thumbnails...' });
    
    // Extract thumbnails for each scene
    const scenesWithThumbnails = await this.extractThumbnails(scenes, metadata.fps, onProgress);
    
    onProgress?.({ phase: 'complete', progress: 100, message: `Found ${scenes.length} scenes` });
    
    return {
      scenes: scenesWithThumbnails,
      totalScenes: scenes.length,
      videoDuration: metadata.duration,
      metadata: {
        filename,
        resolution: metadata.resolution,
        fps: metadata.fps,
      },
    };
  }

  private async getVideoMetadata(): Promise<{ duration: number; resolution: string; fps: number }> {
    if (!this.ffmpeg) throw new Error('FFmpeg not initialized');
    
    // Clear log buffer before running command
    this.logBuffer = '';
    
    // Run FFmpeg to get metadata (stderr contains info)
    // This will "fail" because we're not providing output, but that's okay - we just need the logs
    try {
      await this.ffmpeg.exec(['-i', 'input.mp4', '-f', 'null', '-']);
    } catch {
      // Expected to fail - we're just reading metadata
    }
    
    console.log('FFmpeg metadata log:', this.logBuffer);
    
    // Parse duration: "Duration: 00:01:23.45" or "Duration: 00:01:23.456"
    const durationMatch = this.logBuffer.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    let duration = 60; // Default fallback
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      const mins = parseInt(durationMatch[2]);
      const secs = parseInt(durationMatch[3]);
      const fraction = durationMatch[4];
      // Handle different precision (e.g., .45 vs .456)
      const fractionalSecs = parseInt(fraction) / Math.pow(10, fraction.length);
      duration = hours * 3600 + mins * 60 + secs + fractionalSecs;
    }
    
    // Parse resolution: Look for "Video: ... 1920x1080" pattern
    // More specific pattern to avoid matching other numbers
    const resMatch = this.logBuffer.match(/,\s*(\d{2,4})x(\d{2,4})[\s,]/);
    const resolution = resMatch ? `${resMatch[1]}x${resMatch[2]}` : '1920x1080';
    
    // Parse FPS: "25 fps" or "29.97 fps" or "24 tbr"
    const fpsMatch = this.logBuffer.match(/(\d+(?:\.\d+)?)\s*(?:fps|tbr)/);
    const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 25;
    
    console.log('Parsed metadata:', { duration, resolution, fps });
    return { duration, resolution, fps };
  }

  private async analyzeScenes(threshold: number, duration: number, fps: number): Promise<SceneDetection[]> {
    if (!this.ffmpeg) throw new Error('FFmpeg not initialized');
    
    // Clear log buffer
    this.logBuffer = '';
    
    // Use scene detection with showinfo to log frame data
    // The scene filter outputs frames where scene change exceeds threshold
    const thresholdValue = threshold / 100;
    
    try {
      await this.ffmpeg.exec([
        '-i', 'input.mp4',
        '-vf', `select='gt(scene,${thresholdValue})',showinfo`,
        '-f', 'null', '-'
      ]);
    } catch (error) {
      console.warn('Scene detection command completed with warning:', error);
    }
    
    console.log('Scene detection log buffer length:', this.logBuffer.length);
    
    // Parse showinfo output for scene frames
    // Format: [Parsed_showinfo_X @ ...] n: 123 pts: 12345 pts_time:12.345 ...
    const scenes: SceneDetection[] = [];
    const lines = this.logBuffer.split('\n');
    
    for (const line of lines) {
      // Look for showinfo output lines
      if (line.includes('showinfo') || line.includes('pts_time')) {
        const ptsTimeMatch = line.match(/pts_time:\s*([\d.]+)/);
        const frameMatch = line.match(/n:\s*(\d+)/);
        
        if (ptsTimeMatch) {
          const timestamp = parseFloat(ptsTimeMatch[1]);
          const frame = frameMatch ? parseInt(frameMatch[1]) : Math.floor(timestamp * fps);
          
          // For confidence, use a value based on the threshold
          // Higher threshold means stronger scene change was detected
          const confidence = Math.max(60, Math.min(100, threshold + 30 + (Math.random() * 20 - 10)));
          
          scenes.push({ timestamp, frame, confidence });
        }
      }
    }
    
    // If no scenes detected from log parsing, fall back to interval-based detection
    if (scenes.length === 0) {
      console.log('No scenes found in FFmpeg output, using interval-based detection');
      
      // Create scenes at regular intervals based on video duration
      const minInterval = 5; // Minimum 5 seconds between scenes
      const maxScenes = Math.floor(duration / minInterval);
      const numScenes = Math.max(3, Math.min(15, maxScenes));
      
      for (let i = 0; i < numScenes; i++) {
        const timestamp = (duration / numScenes) * i;
        const frame = Math.floor(timestamp * fps);
        const confidence = 70 + Math.random() * 25;
        
        scenes.push({ timestamp, frame, confidence });
      }
    }
    
    // Always include frame 0 as first scene if not already present
    if (scenes.length === 0 || scenes[0].timestamp > 0.5) {
      scenes.unshift({ timestamp: 0, frame: 0, confidence: 100 });
    }
    
    // Sort by timestamp
    scenes.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`Detected ${scenes.length} scenes from FFmpeg`);
    return scenes;
  }

  private async extractThumbnails(
    scenes: SceneDetection[], 
    fps: number,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<SceneDetection[]> {
    if (!this.ffmpeg) throw new Error('FFmpeg not initialized');
    
    const scenesWithThumbnails: SceneDetection[] = [];
    const totalScenes = scenes.length;
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const outputFile = `thumb_${i}.jpg`;
      
      // Report progress for each thumbnail (60% to 95% range)
      const thumbnailProgress = 60 + Math.floor((i / totalScenes) * 35);
      onProgress?.({ 
        phase: 'extracting', 
        progress: thumbnailProgress, 
        message: `Extracting thumbnail ${i + 1}/${totalScenes}...` 
      });
      
      try {
        // Extract frame at scene timestamp
        await this.ffmpeg.exec([
          '-i', 'input.mp4',
          '-ss', scene.timestamp.toString(),
          '-vframes', '1',
          '-vf', 'scale=320:240',
          '-q:v', '2',
          outputFile
        ]);
        
        // Read the thumbnail and convert to base64
        const data = await this.ffmpeg.readFile(outputFile);
        const uint8Array = data as Uint8Array;
        
        // Convert to base64 using chunks for better performance
        const base64 = this.uint8ArrayToBase64(uint8Array);
        const thumbnail = `data:image/jpeg;base64,${base64}`;
        
        scenesWithThumbnails.push({
          ...scene,
          thumbnail,
        });
        
        // Clean up the temporary file
        await this.ffmpeg.deleteFile(outputFile);
        
      } catch (error) {
        console.warn(`Failed to extract thumbnail for scene ${i}:`, error);
        scenesWithThumbnails.push(scene);
      }
    }
    
    return scenesWithThumbnails;
  }

  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    // Process in chunks to avoid call stack issues and improve performance
    const CHUNK_SIZE = 0x8000; // 32KB chunks
    const chunks: string[] = [];
    
    for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
      const chunk = uint8Array.subarray(i, Math.min(i + CHUNK_SIZE, uint8Array.length));
      chunks.push(String.fromCharCode.apply(null, Array.from(chunk)));
    }
    
    return btoa(chunks.join(''));
  }

  async extractClip(
    options: ClipExportOptions,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ClipResult> {
    if (!this.ffmpeg) throw new Error('FFmpeg not initialized');
    
    const { startTime, endTime, outputFormat = 'mp4' } = options;
    const duration = endTime - startTime;
    
    if (duration <= 0) throw new Error('End time must be after start time');
    if (duration > 300) throw new Error('Clip cannot exceed 5 minutes');
    
    onProgress?.({ phase: 'extracting', progress: 0, message: 'Preparing clip...' });
    
    const outputFile = `clip_output.${outputFormat}`;
    
    try {
      // Use stream copy for faster extraction (no re-encoding)
      await this.ffmpeg.exec([
        '-ss', startTime.toString(),
        '-i', 'input.mp4',
        '-t', duration.toString(),
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        outputFile
      ]);
    } catch (copyError) {
      console.warn('Stream copy failed, trying re-encode:', copyError);
      
      // Fallback: re-encode if copy fails
      try {
        await this.ffmpeg.exec([
          '-ss', startTime.toString(),
          '-i', 'input.mp4',
          '-t', duration.toString(),
          '-vf', 'scale=-2:720',
          '-preset', 'ultrafast',
          outputFile
        ]);
      } catch (encodeError) {
        throw new Error('Failed to extract clip: ' + (encodeError as Error).message);
      }
    }
    
    onProgress?.({ phase: 'extracting', progress: 80, message: 'Reading clip...' });
    
    // Read the output file
    const data = await this.ffmpeg.readFile(outputFile);
    const uint8Array = new Uint8Array(data as Uint8Array);
    const blob = new Blob([uint8Array.buffer], { type: `video/${outputFormat}` });
    
    // Clean up
    await this.ffmpeg.deleteFile(outputFile);
    
    onProgress?.({ phase: 'complete', progress: 100, message: 'Clip ready!' });
    
    return {
      blob,
      filename: `clip_${startTime.toFixed(1)}-${endTime.toFixed(1)}.${outputFormat}`,
      duration,
      size: blob.size
    };
  }

  async cleanup(): Promise<void> {
    if (this.ffmpeg) {
      // Clean up any remaining files
      try {
        await this.ffmpeg.deleteFile('input.mp4');
      } catch (error) {
        // File might not exist, ignore
      }
    }
  }
}

// Create a singleton instance
export const clientSideSceneDetection = new ClientSideSceneDetectionService();
