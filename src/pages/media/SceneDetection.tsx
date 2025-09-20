import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Play, Download, Scissors } from 'lucide-react';

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

export default function SceneDetection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<DetectionResult | null>(null);
  const [threshold, setThreshold] = useState(30.0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a video file",
          variant: "destructive",
        });
        return;
      }

      // Check file size (50MB limit to prevent memory issues)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select a video file smaller than 50MB to prevent processing errors",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setResults(null);
    }
  };

  const processVideo = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Remove data URL prefix
      const base64Data = fileData.split(',')[1];

      // Create progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90));
      }, 500);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('detect-video-scenes', {
        body: {
          videoData: base64Data,
          filename: selectedFile.name,
          threshold: threshold,
          mimeType: selectedFile.type
        }
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (error) throw error;

      if (data?.success) {
        setResults(data.result);
        toast({
          title: "Scene Detection Complete",
          description: `Found ${data.result.totalScenes} scenes in the video`,
        });
      } else {
        throw new Error(data?.error || 'Scene detection failed');
      }

    } catch (error: any) {
      console.error('Scene detection error:', error);
      
      // Provide helpful error messages based on the error type
      let errorTitle = "Processing Failed";
      let errorDescription = error.message || "Failed to process video";
      
      if (error.message?.includes('too large') || error.message?.includes('Memory limit')) {
        errorTitle = "File Too Large";
        errorDescription = error.message || "Video file is too large. Please try a smaller file or compress the video.";
      } else if (error.message?.includes('corrupted')) {
        errorTitle = "Invalid File";
        errorDescription = "The video file appears to be corrupted or in an unsupported format.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const exportResults = () => {
    if (!results) return;

    const csvContent = [
      'Scene,Start Time (s),Frame Number,Confidence',
      ...results.scenes.map((scene, index) => 
        `${index + 1},${scene.timestamp.toFixed(3)},${scene.frame},${scene.confidence.toFixed(3)}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${results.metadata.filename}_scenes.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Video Scene Detection</h1>
        <p className="text-muted-foreground mt-2">
          Upload a video file to automatically detect scene changes and shot boundaries
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="video-upload">Select Video File</Label>
            <Input
              id="video-upload"
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={isProcessing}
            />
          </div>

          <div>
            <Label htmlFor="threshold">Detection Threshold</Label>
            <Input
              id="threshold"
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Lower values detect more scenes (more sensitive). Higher values detect fewer scenes.
            </p>
          </div>

          {selectedFile && (
            <div className="p-4 bg-muted rounded-lg">
              <p><strong>File:</strong> {selectedFile.name}</p>
              <p><strong>Size:</strong> {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              <p><strong>Type:</strong> {selectedFile.type}</p>
            </div>
          )}

          <Button
            onClick={processVideo}
            disabled={!selectedFile || isProcessing}
            className="w-full"
          >
            <Scissors className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Detect Scenes'}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Processing video... {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
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
                  <p className="text-2xl font-bold text-primary">{results.totalScenes}</p>
                  <p className="text-sm text-muted-foreground">Total Scenes</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{formatTime(results.videoDuration)}</p>
                  <p className="text-sm text-muted-foreground">Duration</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{results.metadata.resolution}</p>
                  <p className="text-sm text-muted-foreground">Resolution</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary">{results.metadata.fps}</p>
                  <p className="text-sm text-muted-foreground">FPS</p>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-4 gap-4 p-3 bg-muted rounded-lg font-semibold">
                  <span>Scene</span>
                  <span>Time</span>
                  <span>Frame</span>
                  <span>Confidence</span>
                </div>
                {results.scenes.map((scene, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 p-3 border rounded-lg hover:bg-muted/50">
                    <span>#{index + 1}</span>
                    <span className="font-mono">{formatTime(scene.timestamp)}</span>
                    <span>{scene.frame.toLocaleString()}</span>
                    <span>{scene.confidence.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}