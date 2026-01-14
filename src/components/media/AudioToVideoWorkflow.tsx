import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Music, Video, Image, Play, Pause, Plus, X, Sparkles, 
  Loader2, CheckCircle, AlertCircle, ExternalLink, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";

interface AudioToVideoWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedAudioSource?: string;
  preSelectedImages?: string[];
}

interface ImageToGenerate {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  generationId?: string;
  videoUrl?: string;
  error?: string;
}

export const AudioToVideoWorkflow: React.FC<AudioToVideoWorkflowProps> = ({
  isOpen,
  onClose,
  preSelectedAudioSource,
  preSelectedImages = [],
}) => {
  const { user } = useUser();
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Step 1: Audio Source
  const [audioSourceUrl, setAudioSourceUrl] = useState(preSelectedAudioSource || '');
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);
  const [extractedAudioUrl, setExtractedAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Step 2: Starting Images
  const [imagesToGenerate, setImagesToGenerate] = useState<ImageToGenerate[]>(
    preSelectedImages.map((url, idx) => ({
      id: `img-${idx}`,
      url,
      title: `Image ${idx + 1}`,
      status: 'pending',
      progress: 0,
    }))
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  
  // Step 3: Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(8);
  
  // Handle audio extraction
  const handleExtractAudio = async () => {
    if (!audioSourceUrl.trim()) {
      toast({
        title: "Missing Audio Source",
        description: "Please enter a video URL to extract audio from",
        variant: "destructive",
      });
      return;
    }

    setIsExtractingAudio(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-audio', {
        body: {
          sourceVideoUrl: audioSourceUrl,
          userId: user?.id || 'anonymous',
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Extraction failed');

      setExtractedAudioUrl(data.audioUrl);
      toast({
        title: "Audio Source Ready",
        description: "Audio will be extracted from the video during generation",
      });
    } catch (error) {
      console.error('Audio extraction error:', error);
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : 'Failed to process audio source',
        variant: "destructive",
      });
    } finally {
      setIsExtractingAudio(false);
    }
  };

  // Handle adding new image
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    
    setImagesToGenerate(prev => [
      ...prev,
      {
        id: `img-${Date.now()}`,
        url: newImageUrl.trim(),
        title: `Image ${prev.length + 1}`,
        status: 'pending',
        progress: 0,
      }
    ]);
    setNewImageUrl('');
  };

  // Handle removing an image
  const handleRemoveImage = (id: string) => {
    setImagesToGenerate(prev => prev.filter(img => img.id !== id));
  };

  // Handle audio playback
  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Generate videos for all images
  const handleGenerateAll = async () => {
    if (!extractedAudioUrl) {
      toast({
        title: "Audio Required",
        description: "Please extract audio first",
        variant: "destructive",
      });
      return;
    }

    if (imagesToGenerate.length === 0) {
      toast({
        title: "Images Required",
        description: "Please add at least one starting image",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    // Process each image sequentially
    for (let i = 0; i < imagesToGenerate.length; i++) {
      const img = imagesToGenerate[i];
      
      // Update status to generating
      setImagesToGenerate(prev => 
        prev.map(item => 
          item.id === img.id 
            ? { ...item, status: 'generating', progress: 10 }
            : item
        )
      );

      try {
        const { data, error } = await supabase.functions.invoke('generate-wavespeed-video', {
          body: {
            userId: user?.id || 'anonymous',
            model: 'infinitetalk',
            prompt: prompt || `Animate this image with the provided audio, maintaining visual consistency`,
            durationSec: duration,
            audioUrl: extractedAudioUrl,
            imageUrl: img.url,
            resolution: '720p',
            salesforceData: {
              title: `Audio-to-Video: ${img.title}`,
              description: `Generated from image with preserved audio`,
            },
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Generation failed');

        // Start polling for this generation
        pollGenerationStatus(img.id, data.generationId);

        setImagesToGenerate(prev => 
          prev.map(item => 
            item.id === img.id 
              ? { ...item, generationId: data.generationId, progress: 20 }
              : item
          )
        );

      } catch (error) {
        console.error('Generation error for image:', img.id, error);
        setImagesToGenerate(prev => 
          prev.map(item => 
            item.id === img.id 
              ? { 
                  ...item, 
                  status: 'failed', 
                  error: error instanceof Error ? error.message : 'Unknown error'
                }
              : item
          )
        );
      }
    }

    toast({
      title: "Generation Started",
      description: `Creating ${imagesToGenerate.length} video(s) with preserved audio`,
    });
  };

  // Poll for generation status
  const pollGenerationStatus = async (imageId: string, generationId: string) => {
    const maxAttempts = 120; // 10 minutes max
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const { data, error } = await supabase.functions.invoke('get-video-generation', {
          body: { id: generationId },
        });

        if (error) throw error;

        if (data?.status === 'completed' && data?.video_url) {
          setImagesToGenerate(prev => 
            prev.map(item => 
              item.id === imageId 
                ? { ...item, status: 'completed', progress: 100, videoUrl: data.video_url }
                : item
            )
          );
          checkAllComplete();
          return;
        }

        if (data?.status === 'failed') {
          setImagesToGenerate(prev => 
            prev.map(item => 
              item.id === imageId 
                ? { ...item, status: 'failed', error: data.error_message || 'Generation failed' }
                : item
            )
          );
          checkAllComplete();
          return;
        }

        // Update progress
        setImagesToGenerate(prev => 
          prev.map(item => 
            item.id === imageId 
              ? { ...item, progress: data?.progress || item.progress }
              : item
          )
        );

        // Continue polling
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        }
      }
    };

    poll();
  };

  // Check if all generations are complete
  const checkAllComplete = () => {
    setImagesToGenerate(prev => {
      const allDone = prev.every(img => 
        img.status === 'completed' || img.status === 'failed'
      );
      if (allDone) {
        setIsGenerating(false);
        const successCount = prev.filter(img => img.status === 'completed').length;
        toast({
          title: "Generation Complete",
          description: `${successCount} of ${prev.length} videos generated successfully`,
        });
      }
      return prev;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Audio-Preserving Video Generation
          </DialogTitle>
          <DialogDescription>
            Create videos from images while preserving audio from an existing source
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Step 1: Audio Source */}
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="outline" className="rounded-full">1</Badge>
                Audio Source
              </h3>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter video URL to extract audio from..."
                    value={audioSourceUrl}
                    onChange={(e) => setAudioSourceUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleExtractAudio}
                    disabled={isExtractingAudio || !audioSourceUrl.trim()}
                  >
                    {isExtractingAudio ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Music className="w-4 h-4 mr-2" />
                    )}
                    {isExtractingAudio ? 'Processing...' : 'Extract Audio'}
                  </Button>
                </div>

                {extractedAudioUrl && (
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-700">Audio source ready</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {extractedAudioUrl}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleAudioPlayback}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <audio 
                      ref={audioRef} 
                      src={extractedAudioUrl}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Step 2: Starting Images */}
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="outline" className="rounded-full">2</Badge>
                Starting Images
                <Badge variant="secondary" className="ml-auto">
                  {imagesToGenerate.length} image{imagesToGenerate.length !== 1 ? 's' : ''}
                </Badge>
              </h3>

              <div className="space-y-3">
                {/* Image list */}
                {imagesToGenerate.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {imagesToGenerate.map((img) => (
                      <div 
                        key={img.id}
                        className="relative group rounded-lg overflow-hidden border bg-muted"
                      >
                        <div className="aspect-video relative">
                          <img
                            src={img.url}
                            alt={img.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                          
                          {/* Status overlay */}
                          {img.status !== 'pending' && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                              {img.status === 'generating' && (
                                <>
                                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                                  <span className="text-xs text-white mt-2">{img.progress}%</span>
                                </>
                              )}
                              {img.status === 'completed' && (
                                <>
                                  <CheckCircle className="w-6 h-6 text-green-400" />
                                  <a 
                                    href={img.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-400 mt-2 underline flex items-center gap-1"
                                  >
                                    View Video <ExternalLink className="w-3 h-3" />
                                  </a>
                                </>
                              )}
                              {img.status === 'failed' && (
                                <>
                                  <AlertCircle className="w-6 h-6 text-red-400" />
                                  <span className="text-xs text-red-400 mt-2">Failed</span>
                                </>
                              )}
                            </div>
                          )}

                          {/* Progress bar */}
                          {img.status === 'generating' && (
                            <div className="absolute bottom-0 left-0 right-0">
                              <Progress value={img.progress} className="h-1 rounded-none" />
                            </div>
                          )}
                        </div>

                        {/* Remove button */}
                        {img.status === 'pending' && (
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage(img.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add image input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste image URL (e.g., https://example.com/image.jpg)..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddImage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddImage();
                    }}
                    disabled={!newImageUrl.trim()}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Image
                  </Button>
                </div>
              </div>
            </Card>

            {/* Step 3: Generation Settings */}
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Badge variant="outline" className="rounded-full">3</Badge>
                Generation Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Animation Prompt (Optional)</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe how the image should animate... (e.g., 'gentle motion, slow zoom in, subtle particle effects')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="mt-1.5"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label>Duration: {duration} seconds</Label>
                    <input
                      type="range"
                      min={4}
                      max={30}
                      value={duration}
                      onChange={(e) => setDuration(parseInt(e.target.value))}
                      className="w-full mt-2"
                    />
                  </div>
                  <Badge variant="secondary">infinitetalk model</Badge>
                </div>
              </div>
            </Card>
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {imagesToGenerate.length} video{imagesToGenerate.length !== 1 ? 's' : ''} will be generated
            </span>
            <Button
              onClick={handleGenerateAll}
              disabled={
                !extractedAudioUrl || 
                imagesToGenerate.length === 0 || 
                isGenerating
              }
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Generate All Videos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
