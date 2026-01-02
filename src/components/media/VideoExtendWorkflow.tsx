import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Film, 
  Sparkles, 
  Zap, 
  Play, 
  XCircle, 
  Download,
  Loader2,
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VideoExtendWorkflowProps {
  userId: string;
  onComplete?: (videoUrl: string) => void;
  onCancel?: () => void;
}

interface ExtendModel {
  id: string;
  name: string;
  description: string;
  pricePerSecond: number;
  isFast: boolean;
}

const EXTEND_MODELS: ExtendModel[] = [
  {
    id: 'veo31_extend',
    name: 'Veo 3.1 Video Extend',
    description: 'Cinematic continuity with scene, motion, and audio preservation',
    pricePerSecond: 0.25,
    isFast: false
  },
  {
    id: 'veo31_fast_extend',
    name: 'Veo 3.1 Fast Video Extend',
    description: 'High-speed extend for rapid iteration and previews',
    pricePerSecond: 0.10,
    isFast: true
  }
];

const EXTEND_DURATIONS = [5, 10, 15, 20, 25, 30];

export const VideoExtendWorkflow: React.FC<VideoExtendWorkflowProps> = ({
  userId,
  onComplete,
  onCancel
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [sourceVideoUrl, setSourceVideoUrl] = useState('');
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [continuationPrompt, setContinuationPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('veo31_extend');
  const [extendDuration, setExtendDuration] = useState<number>(10);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);

  // Calculate estimated cost
  const selectedModelData = EXTEND_MODELS.find(m => m.id === selectedModel);
  const estimatedCost = selectedModelData 
    ? (selectedModelData.pricePerSecond * extendDuration).toFixed(2)
    : '0.00';

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a video file (MP4, MOV, WebM)',
        variant: 'destructive'
      });
      return;
    }

    // Validate file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 500MB',
        variant: 'destructive'
      });
      return;
    }

    setSourceVideoFile(file);
    
    // Upload to Supabase storage
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileName = `extend-inputs/${userId}/${Date.now()}-${file.name}`;
      
      const { data, error } = await supabase.storage
        .from('generation-inputs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('generation-inputs')
        .getPublicUrl(fileName);

      setSourceVideoUrl(urlData.publicUrl);
      setUploadProgress(100);
      
      toast({
        title: 'Video uploaded',
        description: 'Your source video is ready for extension'
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload video',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle URL paste
  const handleUrlPaste = (url: string) => {
    setSourceVideoUrl(url);
    setSourceVideoFile(null);
    toast({
      title: 'Video URL set',
      description: 'Source video URL has been set'
    });
  };

  // Start video extension
  const handleExtend = async () => {
    if (!sourceVideoUrl) {
      toast({
        title: 'No source video',
        description: 'Please upload or provide a Veo-generated video URL',
        variant: 'destructive'
      });
      return;
    }

    if (!continuationPrompt.trim()) {
      toast({
        title: 'No continuation prompt',
        description: 'Please describe what happens next in the video',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Starting video extension...');

    try {
      // Call the video generation edge function with extend parameters
      const { data, error } = await supabase.functions.invoke('generate-wavespeed-video', {
        body: {
          userId,
          model: selectedModel,
          prompt: continuationPrompt,
          durationSec: extendDuration,
          aspectRatio,
          sourceVideoUrl, // The video to extend
          extras: {
            mode: 'extend',
            preserveAudio: true,
            preserveStyle: true
          }
        }
      });

      if (error) throw error;

      if (data?.generationId) {
        setGenerationId(data.generationId);
        pollGenerationStatus(data.generationId);
      } else {
        throw new Error('No generation ID returned');
      }
    } catch (error) {
      console.error('Extension error:', error);
      setIsGenerating(false);
      toast({
        title: 'Extension failed',
        description: error instanceof Error ? error.message : 'Failed to start video extension',
        variant: 'destructive'
      });
    }
  };

  // Poll for generation status
  const pollGenerationStatus = async (id: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-video-generation', {
          body: { generationId: id }
        });

        if (error) throw error;

        if (data) {
          setGenerationProgress(data.progress || 0);
          setGenerationStatus(data.status === 'generating' ? 'Extending video...' : data.status);

          if (data.status === 'completed' && data.video_url) {
            clearInterval(pollInterval);
            setResultVideoUrl(data.video_url);
            setIsGenerating(false);
            setGenerationStatus('Video extension complete!');
            toast({
              title: 'Extension complete!',
              description: 'Your extended video is ready'
            });
            onComplete?.(data.video_url);
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setIsGenerating(false);
            toast({
              title: 'Extension failed',
              description: data.error_message || 'Video extension failed',
              variant: 'destructive'
            });
          } else if (data.status === 'cancelled') {
            clearInterval(pollInterval);
            setIsGenerating(false);
            setGenerationStatus('Generation cancelled');
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000);

    // Store interval ID for cleanup
    return () => clearInterval(pollInterval);
  };

  // Cancel generation
  const handleCancelGeneration = async () => {
    if (!generationId) return;

    try {
      await supabase.functions.invoke('cancel-generation', {
        body: { id: generationId, type: 'video' }
      });

      setIsGenerating(false);
      setGenerationStatus('Cancelled');
      toast({
        title: 'Cancelled',
        description: 'Video extension has been cancelled'
      });
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  // Reset workflow
  const handleReset = () => {
    setSourceVideoUrl('');
    setSourceVideoFile(null);
    setContinuationPrompt('');
    setResultVideoUrl(null);
    setGenerationId(null);
    setGenerationProgress(0);
    setGenerationStatus('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
          <Film className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Video Extend</h2>
          <p className="text-sm text-muted-foreground">
            Continue an existing Veo video with seamless scene, motion, and audio continuity
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="p-4 bg-blue-500/10 border-blue-500/30">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-medium mb-1">Video Extend Requirements</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300/80">
              <li>Requires a Veo-generated input video</li>
              <li>Returns a single merged result (original + extension)</li>
              <li>Preserves motion style, framing, lighting, and synchronized audio</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Step 1: Source Video */}
      <Card className="p-5 bg-card/50 border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
            Step 1
          </Badge>
          <span className="font-medium">Source Video</span>
        </div>

        {!sourceVideoUrl ? (
          <div className="space-y-4">
            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">
                Click to upload a Veo-generated video
              </p>
              <p className="text-xs text-muted-foreground/60">
                MP4, MOV, WebM • Max 500MB
              </p>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            {/* Or paste URL */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or paste video URL</span>
              </div>
            </div>

            <input
              type="url"
              placeholder="https://... (Veo-generated video URL)"
              className="w-full px-4 py-3 rounded-lg bg-background/50 border border-border/50 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
              onBlur={(e) => e.target.value && handleUrlPaste(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video Preview */}
            <div className="relative rounded-xl overflow-hidden bg-black/50 aspect-video">
              <video
                src={sourceVideoUrl}
                controls
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Film className="w-4 h-4" />
                <span className="truncate max-w-[300px]">
                  {sourceVideoFile?.name || 'External video URL'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-destructive hover:text-destructive"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Step 2: Continuation Prompt */}
      <Card className="p-5 bg-card/50 border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
            Step 2
          </Badge>
          <span className="font-medium">What Happens Next?</span>
        </div>

        <div className="space-y-3">
          <Label htmlFor="continuation-prompt" className="text-sm text-muted-foreground">
            Describe the continuation of your video
          </Label>
          <Textarea
            id="continuation-prompt"
            placeholder="The camera slowly pans right to reveal a dramatic sunset over the mountains. The ambient sounds of wind continue as birds fly across the sky..."
            value={continuationPrompt}
            onChange={(e) => setContinuationPrompt(e.target.value)}
            rows={4}
            className="resize-none bg-background/50"
          />
          <p className="text-xs text-muted-foreground/60">
            Tip: Describe motion, camera movements, sounds, and how the scene evolves
          </p>
        </div>
      </Card>

      {/* Step 3: Settings */}
      <Card className="p-5 bg-card/50 border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
            Step 3
          </Badge>
          <span className="font-medium">Extension Settings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTEND_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      {model.isFast ? (
                        <Zap className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      )}
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground/60">
              {selectedModelData?.description}
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Extension Duration</Label>
            <Select value={extendDuration.toString()} onValueChange={(v) => setExtendDuration(parseInt(v))}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTEND_DURATIONS.map((d) => (
                  <SelectItem key={d} value={d.toString()}>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{d} seconds</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Aspect Ratio</Label>
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                <SelectItem value="1:1">1:1 (Square)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Generation Progress */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-5 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    <span className="font-medium">{generationStatus}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancelGeneration}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>
                <Progress value={generationProgress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">
                  {generationProgress}% complete
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {resultVideoUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/30">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-medium">Extended Video Ready!</span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black/50 aspect-video">
                  <video
                    src={resultVideoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(resultVideoUrl, '_blank')}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = resultVideoUrl;
                      link.download = `extended-video-${Date.now()}.mp4`;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      {!isGenerating && !resultVideoUrl && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Estimated cost: <span className="text-foreground font-medium">${estimatedCost}</span>
          </div>
          <div className="flex gap-3">
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleExtend}
              disabled={!sourceVideoUrl || !continuationPrompt.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Extend Video
            </Button>
          </div>
        </div>
      )}

      {/* Extend Again */}
      {resultVideoUrl && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset}>
            <Film className="w-4 h-4 mr-2" />
            Extend Another Video
          </Button>
        </div>
      )}
    </div>
  );
};
