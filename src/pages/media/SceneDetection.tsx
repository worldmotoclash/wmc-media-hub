import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, Play, Download, Clock, Film, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import VideoSelector from "@/components/media/VideoSelector";
import { 
  createSceneDetectionJob,
  createUploadSceneDetectionJob, 
  processClientSideSceneDetection, 
  getMediaAssetSceneDetections,
  type VideoSceneDetectionRecord 
} from "@/services/sceneDetectionService";
import { 
  clientSideSceneDetection,
  type ProcessingProgress,
  type DetectionResult 
} from "@/services/clientSideSceneDetection";
import type { MediaAsset } from "@/services/unifiedMediaService";

interface SceneDetection {
  timestamp: number;
  frame: number;
  confidence: number;
  thumbnail?: string;
}

const SceneDetection = () => {
  const [selectedVideo, setSelectedVideo] = useState<{
    type: 'file' | 'asset' | 'url';
    file?: File;
    asset?: MediaAsset;
    url?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingPhase, setProcessingPhase] = useState<string>('');
  const [results, setResults] = useState<DetectionResult | null>(null);
  const [threshold, setThreshold] = useState([30]);
  const [detectionHistory, setDetectionHistory] = useState<VideoSceneDetectionRecord[]>([]);
  const [ffmpegInitialized, setFfmpegInitialized] = useState(false);

  // Initialize FFmpeg on component mount
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        await clientSideSceneDetection.initialize((progress) => {
          if (progress.phase === 'loading') {
            setProgress(progress.progress);
            setProcessingPhase(progress.message);
          }
        });
        setFfmpegInitialized(true);
        setProcessingPhase('');
      } catch (error) {
        console.error('Failed to initialize FFmpeg:', error);
        toast.error('Failed to initialize video processing. Please refresh the page.');
      }
    };

    initFFmpeg();
  }, []);

  const handleDetectScenes = async () => {
    if (!selectedVideo) {
      toast.error("Please select a video first");
      return;
    }

    if (!ffmpegInitialized) {
      toast.error("Video processing not ready. Please wait...");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingPhase('');
    setResults(null);

    try {
      let jobId: string;
      let videoFile: File;
      
      if (selectedVideo.type === 'file' && selectedVideo.file) {
        videoFile = selectedVideo.file;
        jobId = await createUploadSceneDetectionJob(threshold[0], videoFile.name);
        console.log('Upload scene detection job created:', jobId);
        
      } else if (selectedVideo.type === 'asset' && selectedVideo.asset) {
        const asset = selectedVideo.asset;
        
        if (!asset.fileUrl) {
          throw new Error('Media asset does not have a download URL');
        }
        
        // Download the video file from the asset URL
        setProcessingPhase('Downloading video...');
        const response = await fetch(asset.fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        videoFile = new File([blob], asset.title || 'video.mp4', { type: blob.type });
        
        jobId = await createSceneDetectionJob(asset.id, threshold[0]);
        console.log('Media asset scene detection job created:', jobId);
        
      } else if (selectedVideo.type === 'url' && selectedVideo.url) {
        // Download the video file from the URL
        setProcessingPhase('Downloading video from URL...');
        const response = await fetch(selectedVideo.url);
        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const filename = selectedVideo.url.split('/').pop() || 'video_from_url';
        videoFile = new File([blob], filename, { type: blob.type });
        
        jobId = await createUploadSceneDetectionJob(threshold[0], filename);
        console.log('URL scene detection job created:', jobId);
      } else {
        throw new Error('Invalid video selection');
      }
      
      // Process scene detection client-side
      const result = await clientSideSceneDetection.detectScenes(
        videoFile,
        threshold[0],
        (progressUpdate: ProcessingProgress) => {
          setProgress(progressUpdate.progress);
          setProcessingPhase(progressUpdate.message);
        }
      );
      
      // Store the results in the database
      await processClientSideSceneDetection(jobId, result);
      
      setResults(result);
      toast.success(`Scene detection completed! Found ${result.totalScenes} scenes.`);
      
      // Reload detection history if we processed an asset
      if (selectedVideo.type === 'asset' && selectedVideo.asset) {
        loadDetectionHistory(selectedVideo.asset.id);
      }
      
    } catch (error) {
      console.error('Scene detection error:', error);
      toast.error(error.message || 'Scene detection failed');
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setProcessingPhase('');
      
      // Clean up FFmpeg temporary files
      await clientSideSceneDetection.cleanup();
    }
  };

  const loadDetectionHistory = async (mediaAssetId: string) => {
    try {
      const history = await getMediaAssetSceneDetections(mediaAssetId);
      setDetectionHistory(history);
    } catch (error) {
      console.error('Error loading detection history:', error);
    }
  };

  const handleVideoSelect = useCallback((video: MediaAsset) => {
    setSelectedVideo({ type: 'asset', asset: video });
    setResults(null);
    loadDetectionHistory(video.id);
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error('Please select a video file smaller than 100MB');
        return;
      }
      setSelectedVideo({ type: 'file', file });
      setResults(null);
      setDetectionHistory([]);
    }
  }, []);

  const handleUrlChange = useCallback((url: string) => {
    if (url.trim()) {
      setSelectedVideo({ type: 'url', url: url.trim() });
      setResults(null);
      setDetectionHistory([]);
    } else {
      setSelectedVideo(null);
    }
  }, []);

  const exportResults = () => {
    if (!results) return;

    const csvContent = [
      'Scene,Timestamp (s),Frame,Confidence',
      ...results.scenes.map((scene, index) => 
        `${index + 1},${scene.timestamp.toFixed(3)},${scene.frame},${scene.confidence.toFixed(2)}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scene_detection_results.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Scene Detection</h1>
        <p className="text-muted-foreground mt-2">
          Analyze videos to detect scene changes and generate thumbnails using advanced client-side processing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Video Input
          </CardTitle>
          <CardDescription>
            Select a video to analyze for scene changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="select" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="select">Select from Library</TabsTrigger>
              <TabsTrigger value="url">Paste URL</TabsTrigger>
              <TabsTrigger value="upload">Upload File</TabsTrigger>
            </TabsList>

            <TabsContent value="select" className="space-y-4">
              <VideoSelector 
                onVideoSelect={handleVideoSelect}
                selectedVideo={selectedVideo?.type === 'asset' ? selectedVideo.asset : null}
              />
              {selectedVideo?.type === 'asset' && selectedVideo.asset && (
                <div className="p-4 bg-muted rounded-lg">
                  <p><strong>Selected:</strong> {selectedVideo.asset.title}</p>
                  <p><strong>Duration:</strong> {selectedVideo.asset.duration ? formatTime(selectedVideo.asset.duration) : 'Unknown'}</p>
                  <p><strong>Size:</strong> {selectedVideo.asset.fileSize ? `${(selectedVideo.asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : 'Unknown'}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="url" className="space-y-4">
              <div>
                <Label htmlFor="video-url">Video URL</Label>
                <Input
                  id="video-url"
                  type="url"
                  placeholder="https://example.com/video.mp4"
                  onChange={(e) => handleUrlChange(e.target.value)}
                />
              </div>
              {selectedVideo?.type === 'url' && (
                <div className="p-4 bg-muted rounded-lg">
                  <p><strong>URL:</strong> {selectedVideo.url}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div>
                <Label htmlFor="video-file">Upload Video File</Label>
                <Input
                  id="video-file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  disabled={isProcessing}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Maximum file size: 100MB
                </p>
              </div>
              {selectedVideo?.type === 'file' && selectedVideo.file && (
                <div className="p-4 bg-muted rounded-lg">
                  <p><strong>File:</strong> {selectedVideo.file.name}</p>
                  <p><strong>Size:</strong> {(selectedVideo.file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  <p><strong>Type:</strong> {selectedVideo.file.type}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="threshold">Detection Sensitivity: {threshold[0]}</Label>
              <Slider
                id="threshold"
                min={1}
                max={100}
                step={1}
                value={threshold}
                onValueChange={setThreshold}
                disabled={isProcessing}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Lower values detect more scenes (more sensitive), higher values detect fewer scenes
              </p>
            </div>

            <Button 
              onClick={handleDetectScenes} 
              disabled={!selectedVideo || isProcessing || !ffmpegInitialized}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : !ffmpegInitialized ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Detect Scenes
                </>
              )}
            </Button>
            
            {(isProcessing || !ffmpegInitialized) && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {processingPhase || (!ffmpegInitialized ? 'Loading video processor...' : 'Processing...')} {progress > 0 && `${progress.toFixed(0)}%`}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detection History */}
      {selectedVideo?.type === 'asset' && detectionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Previous Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {detectionHistory.map((detection) => (
                <div key={detection.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">Threshold: {detection.threshold}</span>
                      <span className="text-sm text-muted-foreground">{detection.totalScenes} scenes</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(detection.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge variant={detection.processingStatus === 'completed' ? 'default' : 'destructive'}>
                      {detection.processingStatus}
                    </Badge>
                  </div>
                  {detection.processingStatus === 'completed' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setResults(detection.results)}
                    >
                      View Results
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Detection Results
              </span>
              <Button onClick={exportResults} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{results.totalScenes}</div>
                <div className="text-sm text-muted-foreground">Total Scenes</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{formatTime(results.videoDuration)}</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{results.metadata.resolution}</div>
                <div className="text-sm text-muted-foreground">Resolution</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{results.metadata.fps}</div>
                <div className="text-sm text-muted-foreground">FPS</div>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-5 gap-4 p-3 bg-muted rounded-lg font-semibold">
                <span>Thumbnail</span>
                <span>Scene</span>
                <span>Time</span>
                <span>Frame</span>
                <span>Confidence</span>
              </div>
              {results.scenes.map((scene, index) => (
                <div key={index} className="grid grid-cols-5 gap-4 p-3 border rounded-lg hover:bg-muted/50 items-center">
                  <div className="w-16 h-12 bg-muted rounded border overflow-hidden">
                    {scene.thumbnail ? (
                      <img 
                        src={scene.thumbnail} 
                        alt={`Scene ${index + 1} thumbnail`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        <Film className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <span>#{index + 1}</span>
                  <span className="font-mono">{formatTime(scene.timestamp)}</span>
                  <span>{scene.frame.toLocaleString()}</span>
                  <span className="flex items-center gap-2">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all" 
                        style={{ width: `${scene.confidence}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono min-w-[3rem]">{scene.confidence.toFixed(2)}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SceneDetection;