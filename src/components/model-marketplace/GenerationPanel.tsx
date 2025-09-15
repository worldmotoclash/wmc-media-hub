import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Wand2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Tag, 
  Clock, 
  Monitor,
  Sparkles,
  Play,
  CheckCircle2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { AIModel } from "@/services/modelRegistry";

interface SalesforceData {
  title: string;
  subtitle: string;
  description: string;
  categories: string[];
  template: string;
  location: string;
  track: string;
  scheduledDate: string;
  tags: string[];
  keywords: string[];
}

interface VideoGeneration {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  generation_data: any;
  video_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

interface GenerationPanelProps {
  selectedModel: AIModel | null;
}

export const GenerationPanel: React.FC<GenerationPanelProps> = ({
  selectedModel,
}) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state with model-aware defaults
  const [genData, setGenData] = useState({
    provider: selectedModel?.vendor || 'WaveSpeed',
    model: selectedModel?.id || 'wan_fun',
    mainPrompt: '',
    negativePrompt: '',
    duration: [6],
    aspectRatio: '16:9',
    creativity: [0.5],
    resolution: '720p',
    // Wavespeed-specific fields
    characterImages: [] as string[],
    logoImages: [] as string[],
    audioUrl: '',
    imageUrl: '',
    // Salesforce fields
    title: '',
    subtitle: '',
    description: '',
    categories: [] as string[],
    template: '',
    location: '',
    track: '',
    scheduledDate: '',
    tags: [] as string[],
    keywords: [] as string[],
  });

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [currentGeneration, setCurrentGeneration] = useState<VideoGeneration | null>(null);

  // Update form when model changes
  useEffect(() => {
    if (selectedModel) {
      const supportedDurations = selectedModel.specs.supportedDurations || [5, 8];
      const currentDuration = genData.duration[0];
      const validDuration = supportedDurations.includes(currentDuration) 
        ? currentDuration 
        : supportedDurations[0];

      setGenData(prev => ({
        ...prev,
        provider: selectedModel.vendor,
        model: selectedModel.id,
        duration: [validDuration],
      }));
    }
  }, [selectedModel]);

  // Polling for generation updates
  useEffect(() => {
    if (!user || !currentGeneration) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: statusData, error } = await supabase.functions.invoke('get-video-generation', {
          body: { id: currentGeneration.id },
        });

        if (error) {
          console.error('Error polling generation status:', error);
          return;
        }

        if (statusData?.success) {
          const updatedGeneration = statusData;
          const typedGeneration: VideoGeneration = {
            id: updatedGeneration.id,
            status: updatedGeneration.status as 'pending' | 'generating' | 'completed' | 'failed',
            progress: updatedGeneration.progress,
            generation_data: { model: updatedGeneration.model },
            video_url: updatedGeneration.video_url,
            error_message: updatedGeneration.error_message,
            created_at: updatedGeneration.updated_at,
            updated_at: updatedGeneration.updated_at,
          };
          
          setCurrentGeneration(typedGeneration);
          setGenerationProgress(typedGeneration.progress);
          
          if (updatedGeneration.status === 'completed') {
            clearInterval(pollInterval);
            setGenerationStatus('Video generated successfully!');
            setIsGenerating(false);
            toast({
              title: "Success!",
              description: "Video generated successfully!",
            });
          } else if (updatedGeneration.status === 'failed') {
            clearInterval(pollInterval);
            setGenerationStatus('Generation failed');
            setIsGenerating(false);
            toast({
              title: "Generation Failed",
              description: updatedGeneration.error_message || 'Unknown error occurred',
              variant: "destructive",
            });
          } else if (updatedGeneration.status === 'generating') {
            setGenerationStatus(`Generating video... ${updatedGeneration.progress}%`);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [user, currentGeneration, navigate, toast]);

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGenerating) return;
    
    if (!genData.mainPrompt || !genData.title) {
      toast({
        title: "Missing Information",
        description: "Please enter a prompt and title for the video",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Initializing video generation...');

    try {
      const mediaUrlKey = `${genData.provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const salesforceData: SalesforceData = {
        title: genData.title,
        subtitle: genData.subtitle,
        description: genData.description,
        categories: genData.categories,
        template: genData.template,
        location: genData.location,
        track: genData.track,
        scheduledDate: genData.scheduledDate,
        tags: genData.tags,
        keywords: genData.keywords,
      };

      setGenerationStatus('Starting generation...');
      
      let response;
      const vendor = selectedModel?.vendor || 'WaveSpeed';

      const mapWavespeedModel = (id: string) => {
        switch (id) {
          case 'infinitetalk':
            return 'infinitetalk';
          case 'vidu_ref2':
            return 'vidu_ref2';
          case 'wan_fun':
            return 'wan_fun';
          case 'wan_standard':
            return 'wan_fun';
          case 'wan_ultrafast':
            return 'wan_fun';
          default:
            return 'wan_fun';
        }
      };
      
      if (vendor === 'WaveSpeed') {
        const wsModel = mapWavespeedModel(genData.model);
        response = await supabase.functions.invoke('generate-wavespeed-video', {
          body: {
            userId: user?.id,
            model: wsModel,
            prompt: genData.mainPrompt,
            durationSec: genData.duration[0],
            resolution: genData.resolution,
            aspectRatio: genData.aspectRatio,
            characterImages: genData.characterImages,
            logoImages: genData.logoImages,
            audioUrl: genData.audioUrl,
            imageUrl: genData.imageUrl,
            mediaUrlKey: mediaUrlKey,
            salesforceData: salesforceData,
          },
        });
      } else if (vendor === 'Google') {
        response = await supabase.functions.invoke('generate-veo-video', {
          body: {
            userId: user?.id,
            prompt: genData.mainPrompt,
            negativePrompt: genData.negativePrompt,
            creativity: genData.creativity[0],
            durationSec: genData.duration[0],
            resolution: genData.resolution,
            aspectRatio: genData.aspectRatio,
            mediaUrlKey: mediaUrlKey,
            salesforceData: salesforceData,
          },
        });
      }

      if (response?.error) {
        throw new Error(response.error.message || 'Generation failed');
      }

      if (response?.data) {
        const generationData: VideoGeneration = {
          id: response.data.id,
          status: 'pending',
          progress: 0,
          generation_data: { model: genData.model },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setCurrentGeneration(generationData);
        setGenerationStatus('Video generation started successfully!');
        
        toast({
          title: "Generation Started",
          description: "Your video is being generated. You'll be notified when it's ready.",
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationStatus('Generation failed');
      setIsGenerating(false);
      
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    }
  };

  const handleTagsChange = (value: string) => {
    const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    setGenData(prev => ({ ...prev, tags: tagsArray }));
  };

  const handleKeywordsChange = (value: string) => {
    const keywordsArray = value.split(',').map(keyword => keyword.trim()).filter(keyword => keyword.length > 0);
    setGenData(prev => ({ ...prev, keywords: keywordsArray }));
  };

  const handleCategoriesChange = (value: string) => {
    const categoriesArray = value.split(',').map(cat => cat.trim()).filter(cat => cat.length > 0);
    setGenData(prev => ({ ...prev, categories: categoriesArray }));
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Generate Video
        </CardTitle>
        {selectedModel && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedModel.vendor}</Badge>
            <span className="text-sm text-muted-foreground">{selectedModel.displayName}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleGenerateSubmit} className="space-y-6">
          {/* AI Prompt Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              AI Prompt
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="mainPrompt">Main Prompt *</Label>
              <Textarea
                id="mainPrompt"
                placeholder="Describe the video you want to generate..."
                value={genData.mainPrompt}
                onChange={(e) => setGenData(prev => ({ ...prev, mainPrompt: e.target.value }))}
                className="min-h-[120px]"
              />
            </div>

            {selectedModel?.vendor === 'Google' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="negativePrompt">Negative Prompt</Label>
                  <Textarea
                    id="negativePrompt"
                    placeholder="Describe what you don't want in the video..."
                    value={genData.negativePrompt}
                    onChange={(e) => setGenData(prev => ({ ...prev, negativePrompt: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Creativity Level: {genData.creativity[0]}</Label>
                  <Slider
                    value={genData.creativity}
                    onValueChange={(value) => setGenData(prev => ({ ...prev, creativity: value }))}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Content Metadata */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Content Metadata
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Video title"
                  value={genData.title}
                  onChange={(e) => setGenData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  placeholder="Video subtitle"
                  value={genData.subtitle}
                  onChange={(e) => setGenData(prev => ({ ...prev, subtitle: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the video content"
                value={genData.description}
                onChange={(e) => setGenData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categories">Categories</Label>
                <Input
                  id="categories"
                  placeholder="racing, motorsport, highlights"
                  value={genData.categories.join(', ')}
                  onChange={(e) => handleCategoriesChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select value={genData.template} onValueChange={(value) => setGenData(prev => ({ ...prev, template: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highlight-reel">Highlight Reel</SelectItem>
                    <SelectItem value="race-recap">Race Recap</SelectItem>
                    <SelectItem value="driver-profile">Driver Profile</SelectItem>
                    <SelectItem value="track-preview">Track Preview</SelectItem>
                    <SelectItem value="season-summary">Season Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Track or location"
                  value={genData.location}
                  onChange={(e) => setGenData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="track">Track</Label>
                <Input
                  id="track"
                  placeholder="Track name"
                  value={genData.track}
                  onChange={(e) => setGenData(prev => ({ ...prev, track: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={genData.scheduledDate}
                  onChange={(e) => setGenData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  placeholder="motorsport, racing, highlights"
                  value={genData.tags.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  placeholder="fast, exciting, competitive"
                  value={genData.keywords.join(', ')}
                  onChange={(e) => handleKeywordsChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Generation Status */}
          {(isGenerating || currentGeneration) && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Generation Status
              </h3>
              
              {isGenerating && (
                <div className="space-y-2">
                  <Progress value={generationProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">{generationStatus}</p>
                </div>
              )}

              {currentGeneration?.status === 'completed' && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Video generated successfully! Check your media library.
                  </AlertDescription>
                </Alert>
              )}

              {currentGeneration?.status === 'failed' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentGeneration.error_message || 'Generation failed'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Generate Button */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isGenerating || !selectedModel}
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>

          {!selectedModel && (
            <p className="text-sm text-muted-foreground text-center">
              Please select a model to start generating videos
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};