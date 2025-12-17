import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Sparkles, 
  Wand2, 
  Settings2,
  Zap, 
  Film, 
  MessageSquare, 
  Grid3X3, 
  Smartphone,
  Image,
  FileText,
  X,
  AlertCircle
} from "lucide-react";
import { STORYTELLING_PROMPTS } from "@/constants/storytellingPrompts";
import { ImageDropzone } from "@/components/media/ImageDropzone";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { DefaultModelService } from "@/services/defaultModelService";
import { AIModel } from "@/services/modelRegistry";
import { PricingService, GenerationSettings } from "@/services/pricingService";

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

const PRESETS = [
  {
    id: 'teaser',
    name: 'Teaser',
    description: 'Fast & cheap',
    icon: Zap,
    color: 'bg-emerald-500',
    settings: { duration: [5], resolution: '720p', fps: 24, audio: false, aspectRatio: '16:9' }
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: '1080p+',
    icon: Film,
    color: 'bg-purple-500',
    settings: { duration: [10], resolution: '1080p', fps: 30, audio: false, aspectRatio: '21:9' }
  },
  {
    id: 'lip-sync',
    name: 'Lip-Sync',
    description: 'Talking head',
    icon: MessageSquare,
    color: 'bg-blue-500',
    settings: { duration: [8], resolution: '1080p', fps: 30, audio: true, aspectRatio: '16:9' }
  },
  {
    id: 'multi-shot',
    name: 'Multi-Shot',
    description: 'Coherent',
    icon: Grid3X3,
    color: 'bg-orange-500',
    settings: { duration: [15], resolution: '1080p', fps: 24, audio: false, aspectRatio: '16:9' }
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Vertical',
    icon: Smartphone,
    color: 'bg-pink-500',
    settings: { duration: [6], resolution: '720p', fps: 30, audio: false, aspectRatio: '9:16' }
  }
];

const Generate: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Get preset from URL params or default to 'teaser'
  const initialPreset = searchParams.get('preset') || 'teaser';
  const [selectedPreset, setSelectedPreset] = useState(initialPreset);
  
  // Get default model for current preset
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(
    DefaultModelService.getDefaultModel(selectedPreset)
  );

  // Form state
  const [genData, setGenData] = useState({
    mainPrompt: '',
    negativePrompt: '',
    duration: PRESETS.find(p => p.id === selectedPreset)?.settings.duration || [5],
    aspectRatio: PRESETS.find(p => p.id === selectedPreset)?.settings.aspectRatio || '16:9',
    creativity: [0.5],
    resolution: PRESETS.find(p => p.id === selectedPreset)?.settings.resolution || '720p',
    // Wavespeed-specific fields
    characterImages: [] as string[],
    logoImages: [] as string[],
    audioUrl: '',
    imageUrl: '',
    startImage: '',
    endImage: '',
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
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Check authentication
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate videos",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [user, navigate, toast]);

  // Update selected model when preset changes
  useEffect(() => {
    const defaultModel = DefaultModelService.getDefaultModel(selectedPreset);
    setSelectedModel(defaultModel);
    
    // Update form settings to match preset
    const preset = PRESETS.find(p => p.id === selectedPreset);
    if (preset) {
      setGenData(prev => ({
        ...prev,
        duration: preset.settings.duration,
        resolution: preset.settings.resolution,
        aspectRatio: preset.settings.aspectRatio,
      }));
    }
  }, [selectedPreset]);

  // Generate settings for pricing calculations
  const generationSettings: GenerationSettings = useMemo(() => ({
    duration: genData.duration[0],
    resolution: genData.resolution,
    fps: 30, // Default FPS
    audio: genData.audioUrl ? true : false,
    aspectRatio: genData.aspectRatio
  }), [genData]);

  // Calculate pricing for selected model
  const effectivePrice = useMemo(() => {
    if (!selectedModel) {
      return { perRun: '$0.00', perSecond: '$0.00' };
    }

    const pricing = PricingService.calculateNormalizedPricing(selectedModel, generationSettings);
    
    return {
      perRun: PricingService.formatPrice(pricing.pricePerRun),
      perSecond: PricingService.formatPrice(pricing.pricePerSecond)
    };
  }, [selectedModel, generationSettings]);

  // Polling for generation updates
  useEffect(() => {
    if (!user || !currentGeneration || currentGeneration.status === 'completed' || currentGeneration.status === 'failed') return;

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
  }, [user, currentGeneration?.id, toast]);

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    // Update URL without navigation
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('preset', presetId);
    window.history.replaceState(null, '', `?${newSearchParams.toString()}`);
  };

  const handleChangeModel = () => {
    navigate(`/admin/media/models?preset=${selectedPreset}`);
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGenerating || !selectedModel) return;
    
    if (!genData.mainPrompt || !genData.title) {
      toast({
        title: "Missing Information",
        description: "Please enter a prompt and title for the video",
        variant: "destructive",
      });
      return;
    }

    // Check if selected template requires an image
    if (selectedTemplate) {
      const template = STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate);
      if (template?.requiresImage && !genData.startImage) {
        toast({
          title: "Image Required",
          description: `The "${template.name}" template requires a starting image. Please upload one.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Assemble full prompt: template (if selected) + user's scene description
    let fullPrompt = genData.mainPrompt;
    if (selectedTemplate) {
      const template = STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate);
      if (template) {
        fullPrompt = `${template.template}\n\n---\nUser Scene Description: ${genData.mainPrompt}`;
      }
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Initializing video generation...');

    try {
      const mediaUrlKey = `${selectedModel.vendor}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
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
      const vendor = selectedModel.vendor;

      // Map marketplace model ids to wavespeed function-supported ids
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
        const wsModel = mapWavespeedModel(selectedModel.id);
        response = await supabase.functions.invoke('generate-wavespeed-video', {
          body: {
            userId: user?.id,
            model: wsModel,
            prompt: fullPrompt,
            durationSec: genData.duration[0],
            resolution: genData.resolution,
            aspectRatio: genData.aspectRatio,
            references: {
              characterImages: genData.characterImages,
              logoImages: genData.logoImages,
            },
            audioUrl: genData.audioUrl || undefined,
            imageUrl: genData.imageUrl || undefined,
            extras: {},
            mediaUrlKey,
            salesforceData,
          },
        });
      } else if (vendor === 'Google') {
        response = await supabase.functions.invoke('generate-veo-video', {
          body: {
            userId: user?.id,
            prompt: fullPrompt,
            negativePrompt: genData.negativePrompt || undefined,
            duration: genData.duration[0],
            aspectRatio: genData.aspectRatio,
            creativity: genData.creativity[0],
            model: selectedModel.id,
            mediaUrlKey,
            salesforceData,
          },
        });
      } else {
        throw new Error(`${vendor} models are not supported yet in generation. Please pick Google or WaveSpeed.`);
      }

      if (response.error) {
        const msg = response.error.message || 'Edge Function returned a non-2xx status code';
        throw new Error(msg);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Unknown error occurred');
      }

      // Start polling
      setCurrentGeneration({
        id: result.generationId,
        status: 'generating',
        progress: 10,
        generation_data: { model: selectedModel.id },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as VideoGeneration);

      setGenerationStatus('Video is being generated...');
      toast({
        title: "Generation Started",
        description: `Your video is being generated using ${selectedModel.displayName}.`,
      });

    } catch (error) {
      console.error('Generation error:', error);
      setGenerationStatus('Generation failed');
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const handleTagAdd = (type: 'tags' | 'keywords' | 'categories', value: string) => {
    if (!value.trim()) return;
    
    setGenData(prev => ({
      ...prev,
      [type]: [...prev[type], value.trim()]
    }));
  };

  const handleTagRemove = (type: 'tags' | 'keywords' | 'categories', index: number) => {
    setGenData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/media')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Media Hub
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-4 text-foreground flex items-center gap-3">
              <Wand2 className="w-8 h-8 text-primary" />
              Generate Video
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Create AI-powered racing content with your selected model
            </p>
          </motion.div>
        </div>

        {/* Use-Case Presets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <Card className="p-6 mb-6">
            <Label className="text-sm font-medium mb-3 block">Choose Your Use-Case</Label>
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === preset.id;
                const defaultModel = DefaultModelService.getDefaultModel(preset.id);
                
                return (
                  <div key={preset.id} className="flex flex-col items-center">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePresetChange(preset.id)}
                      className={`flex items-center gap-2 mb-1 ${isSelected ? preset.color : ''}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{preset.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {preset.description}
                      </Badge>
                    </Button>
                    {defaultModel && (
                      <div className="text-xs text-muted-foreground">
                        {defaultModel.displayName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Selected Model & Change Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium block mb-1">Selected Model</Label>
                  {selectedModel ? (
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{selectedModel.vendor}</Badge>
                      <span className="font-medium">{selectedModel.displayName}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>•</span>
                        <span>{effectivePrice.perRun}/run</span>
                        <span>•</span>
                        <span>{selectedModel.qualityTier} quality</span>
                        <span>•</span>
                        <span>{selectedModel.speedTier} speed</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No model selected</span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleChangeModel}>
                <Settings2 className="w-4 h-4 mr-2" />
                Change Model
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Generation Progress */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-sm font-medium">Generating Video</span>
                </div>
                <Progress value={generationProgress} className="w-full" />
                <p className="text-sm text-muted-foreground">{generationStatus}</p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Video Completed Display */}
        {currentGeneration?.status === 'completed' && currentGeneration.video_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 mb-6 bg-green-50 border-green-200">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-medium text-green-800">Video Generated Successfully!</span>
                </div>
                <video
                  controls
                  className="w-full rounded-lg bg-black"
                  src={currentGeneration.video_url}
                  style={{ maxHeight: '400px' }}
                >
                  Your browser does not support the video tag.
                </video>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/admin/media/library')}
                  >
                    View in Media Library
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCurrentGeneration(null);
                      setGenData(prev => ({ ...prev, title: '', mainPrompt: '', description: '' }));
                    }}
                  >
                    Generate Another Video
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Form - Hidden when video is completed */}
        {(!currentGeneration || currentGeneration.status !== 'completed') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <form onSubmit={handleGenerateSubmit} className="space-y-8">
              {/* Basic Information */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="Epic Racing Highlights"
                      value={genData.title}
                      onChange={(e) => setGenData({...genData, title: e.target.value})}
                      className="mt-2"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subtitle">Subtitle</Label>
                    <Input
                      id="subtitle"
                      placeholder="Championship Finals"
                      value={genData.subtitle}
                      onChange={(e) => setGenData({...genData, subtitle: e.target.value})}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Storytelling Template Selector */}
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Storytelling Template (optional)
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Select
                      value={selectedTemplate}
                      onValueChange={(value) => setSelectedTemplate(value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a storytelling template..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {STORYTELLING_PROMPTS.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{prompt.name}</span>
                                {prompt.requiresImage && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                                    <Image className="w-3 h-3 mr-1" />
                                    Image
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{prompt.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedTemplate('')}
                        title="Clear template"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {selectedTemplate && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          <FileText className="w-3 h-3 mr-1" />
                          Using: {STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.name}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Template will be applied automatically when generating
                        </span>
                      </div>
                      {STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage && !genData.startImage && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg text-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          This template requires a starting image. Please upload one below.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Label htmlFor="mainPrompt" className="text-sm font-medium">
                    Main Prompt <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="mainPrompt"
                    placeholder="Describe your scene... (e.g., A race car drifts around a corner at sunset with dramatic lighting)"
                    value={genData.mainPrompt}
                    onChange={(e) => setGenData({...genData, mainPrompt: e.target.value})}
                    className="mt-2"
                    rows={3}
                    required
                  />
                </div>

                <div className="mt-4">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details about the video content"
                    value={genData.description}
                    onChange={(e) => setGenData({...genData, description: e.target.value})}
                    className="mt-2"
                    rows={2}
                  />
                </div>
              </Card>

              {/* Generation Settings */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Generation Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Duration: {genData.duration[0]}s</Label>
                    <Slider
                      value={genData.duration}
                      onValueChange={(value) => setGenData(prev => ({ ...prev, duration: value }))}
                      min={3}
                      max={60}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Resolution</Label>
                    <Select 
                      value={genData.resolution} 
                      onValueChange={(value) => setGenData(prev => ({ ...prev, resolution: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="480p">480p</SelectItem>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="1080p">1080p</SelectItem>
                        <SelectItem value="2K">2K</SelectItem>
                        <SelectItem value="4K">4K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Aspect Ratio</Label>
                    <Select 
                      value={genData.aspectRatio} 
                      onValueChange={(value) => setGenData(prev => ({ ...prev, aspectRatio: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        <SelectItem value="21:9">21:9 (Cinematic)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedModel?.vendor === 'Google' && (
                  <div className="mt-4">
                    <Label className="text-sm">Creativity: {genData.creativity[0]}</Label>
                    <Slider
                      value={genData.creativity}
                      onValueChange={(value) => setGenData(prev => ({ ...prev, creativity: value }))}
                      min={0}
                      max={1}
                      step={0.1}
                      className="w-full mt-2"
                    />
                  </div>
                )}
              </Card>

              {/* Start/End Image Section - Shows for image-to-video models OR when template requires image */}
              {(selectedModel && (selectedModel.capabilities.includes('image_to_video') || selectedModel.capabilities.includes('start_end_image'))) || 
               STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage ? (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Image Inputs
                    {selectedModel?.capabilities.includes('start_end_image') && (
                      <Badge variant="secondary" className="text-xs">Start + End</Badge>
                    )}
                    {STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Required by Template</Badge>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Start Image */}
                    <ImageDropzone
                      value={genData.startImage}
                      onChange={(url) => setGenData(prev => ({ ...prev, startImage: url }))}
                      label={selectedModel?.capabilities.includes('start_end_image') ? 'Start Image' : 'Source Image'}
                      description={STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage 
                        ? 'Reference image for the storytelling template'
                        : selectedModel?.capabilities.includes('start_end_image') 
                          ? 'The first frame of your video'
                          : 'The image to animate into video'}
                      required={selectedModel?.id === 'vidu_i2v' || STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage}
                      disabled={isGenerating}
                    />

                    {/* End Image - Only for start_end_image models */}
                    {selectedModel?.capabilities.includes('start_end_image') && (
                      <ImageDropzone
                        value={genData.endImage}
                        onChange={(url) => setGenData(prev => ({ ...prev, endImage: url }))}
                        label="End Image"
                        description="The last frame of your video (transition target)"
                        required={true}
                        disabled={isGenerating}
                      />
                    )}
                  </div>

                  {/* Tips for image-to-video */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Tips:</strong> Use high-quality images with clear subjects. 
                      {selectedModel?.capabilities.includes('start_end_image') 
                        ? ' For best results, use images with similar composition and subjects.'
                        : STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage
                          ? ' The template will analyze and expand upon your reference image.'
                          : ' The prompt describes how the image should be animated.'}
                    </p>
                  </div>
                </Card>
              ) : null}

              {/* Submit Button */}
              <div className="flex justify-center">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={isGenerating || !selectedModel}
                  className="min-w-48"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Video ({effectivePrice.perRun})
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Generate;