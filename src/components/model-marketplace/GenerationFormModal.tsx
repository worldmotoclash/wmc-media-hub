import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Wand2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  Tag, 
  Clock, 
  Monitor, 
  ArrowLeft,
  Sparkles 
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

interface GenerationFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: AIModel | null;
  onChangeModel: () => void;
}

export const GenerationFormModal: React.FC<GenerationFormModalProps> = ({
  isOpen,
  onOpenChange,
  selectedModel,
  onChangeModel,
}) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state with model-aware defaults
  const [genData, setGenData] = useState({
    provider: selectedModel?.vendor || 'wavespeed',
    model: selectedModel?.id || 'wan_ultrafast',
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
      // Get valid duration for this model
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
  }, [user, currentGeneration, navigate, toast, onOpenChange]);

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
      const vendor = selectedModel.vendor;

      // Map marketplace model ids to wavespeed function-supported ids
      const mapWavespeedModel = (id: string) => {
        switch (id) {
          case 'infinitetalk':
            return 'infinitetalk';
          case 'vidu_ref2':
            return 'vidu_ref2';
          case 'wan_fun':
            return 'wan_fun'; // Direct mapping
          case 'wan_standard':
            return 'wan_fun'; // Map to same endpoint
          case 'wan_ultrafast':
            return 'wan_fun'; // Map to same endpoint
          default:
            return 'wan_fun'; // Default to wan 2.2 t2v 720p
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
            prompt: genData.mainPrompt,
            negativePrompt: genData.negativePrompt || undefined,
            duration: genData.duration[0],
            aspectRatio: genData.aspectRatio,
            creativity: genData.creativity[0],
            model: genData.model, // ignored by edge fn today; uses env model
            mediaUrlKey,
            salesforceData,
          },
        });
      } else {
        throw new Error(`${vendor} models are not supported yet in generation. Please pick Google or WaveSpeed.`);
      }

      if (response.error) {
        // Surface a clearer message when edge fn returns non-2xx
        const msg = response.error.message || 'Edge Function returned a non-2xx status code';
        throw new Error(msg);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Unknown error occurred');
      }

      // Submit to Salesforce
      if (result.salesforceSubmissionData) {
        await submitToSalesforceViaFetch(result.salesforceSubmissionData, result.generationId, mediaUrlKey);
      }

      // Start polling
      setCurrentGeneration({
        id: result.generationId,
        status: 'generating',
        progress: 10,
        generation_data: { model: genData.model },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as VideoGeneration);

      setGenerationStatus('Video is being generated...');
      toast({
        title: "Generation Started",
        description: `Your video is being generated using ${selectedModel?.displayName || 'the selected model'}.`,
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

  const submitToSalesforceViaFetch = async (salesforceData: Record<string, any>, generationId: string, mediaUrlKey: string): Promise<void> => {
    try {
      const fields: Record<string, string> = {
        'sObj': 'ri1__Content__c',
        'string_Name': salesforceData.Name || `AI Video - ${new Date().toISOString()}`,
        'string_ri1__AI_Prompt__c': salesforceData.AI_Prompt__c || '',
        'number_ri1__Length_in_Seconds__c': String(salesforceData.ri1__Length_in_Seconds__c || 5),
        'id_ri1__Contact__c': salesforceData.ri1__Contact__c || '',
        'string_ri1__Categories__c': salesforceData.ri1__Categories__c || '',
        'string_ri1__Subtitle__c': salesforceData.ri1__Subtitle__c || '',
        'string_ri1__AI_Gen_Key__c': mediaUrlKey,
      };
      
      const iframeName = `sf_submit_${generationId}`;
      const trackingIframe = document.createElement('iframe');
      trackingIframe.name = iframeName;
      trackingIframe.style.display = 'none';
      document.body.appendChild(trackingIframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
      form.target = iframeName;

      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        if (document.body.contains(form)) document.body.removeChild(form);
        if (document.body.contains(trackingIframe)) document.body.removeChild(trackingIframe);
      }, 5000);
      
    } catch (error) {
      console.error('Salesforce submission error:', error);
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

  if (!selectedModel) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              Generate with {selectedModel.displayName}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={onChangeModel}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change Model
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Vendor: {selectedModel.vendor}</span>
            <span>Quality: {selectedModel.qualityTier}</span>
            <span>Speed: {selectedModel.speedTier}</span>
          </div>
        </DialogHeader>

        {/* Generation Progress */}
        {isGenerating && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary animate-spin" />
                <span className="text-sm font-medium">Generating Video</span>
              </div>
              <Progress value={generationProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{generationStatus}</p>
            </div>
          </div>
        )}

        {/* Video Completed Display */}
        {currentGeneration?.status === 'completed' && currentGeneration.video_url && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-green-600" />
              <span className="text-lg font-medium text-green-800">Video Generated Successfully!</span>
            </div>
            <div className="space-y-3">
              <video
                controls
                className="w-full rounded-lg bg-black"
                src={currentGeneration.video_url}
                style={{ maxHeight: '400px' }}
              >
                Your browser does not support the video tag.
              </video>
              <p className="text-sm text-green-700">
                <a
                  href={currentGeneration.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-green-900"
                >
                  {currentGeneration.video_url}
                </a>
              </p>
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
          </div>
        )}

        {/* Form - Hidden when video is completed */}
        {currentGeneration?.status !== 'completed' && (
          <form onSubmit={handleGenerateSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
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

            <div>
              <Label htmlFor="mainPrompt" className="text-sm font-medium">
                Main Prompt <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="mainPrompt"
                placeholder="A high-speed motocross race through muddy terrain with spectacular jumps, dynamic camera angles, professional cinematography, 4K resolution..."
                value={genData.mainPrompt}
                onChange={(e) => setGenData({...genData, mainPrompt: e.target.value})}
                className="mt-2"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the video content and context..."
                value={genData.description}
                onChange={(e) => setGenData({...genData, description: e.target.value})}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>

          {/* Model-specific fields */}
          {selectedModel.vendor === 'Google' && (
            <div>
              <Label htmlFor="negativePrompt">Negative Prompt</Label>
              <Textarea
                id="negativePrompt"
                placeholder="Low quality, blurry, static camera, poor lighting..."
                value={genData.negativePrompt}
                onChange={(e) => setGenData({...genData, negativePrompt: e.target.value})}
                className="mt-2"
                rows={2}
              />
            </div>
          )}

          {/* Generation Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generation Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration: {genData.duration[0]}s
                </Label>
                {selectedModel?.specs.supportedDurations.length > 1 ? (
                  <Slider
                    value={genData.duration}
                    onValueChange={(value) => setGenData({...genData, duration: value})}
                    max={Math.max(...selectedModel.specs.supportedDurations)}
                    min={Math.min(...selectedModel.specs.supportedDurations)}
                    step={1}
                    className="mt-2"
                  />
                ) : (
                  <div className="mt-2 p-2 bg-muted rounded-md text-sm text-muted-foreground">
                    Fixed at {selectedModel?.specs.supportedDurations[0]}s
                  </div>
                )}
                <div className="mt-1 text-xs text-muted-foreground">
                  Supported: {selectedModel?.specs.supportedDurations.join(', ')}s
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Aspect Ratio
                </Label>
                <Select 
                  value={genData.aspectRatio} 
                  onValueChange={(value) => setGenData({...genData, aspectRatio: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedModel.vendor === 'WaveSpeed' ? (
                <div>
                  <Label>Resolution</Label>
                  <Select 
                    value={genData.resolution} 
                    onValueChange={(value) => setGenData({...genData, resolution: value})}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="480p">480p</SelectItem>
                      <SelectItem value="720p">720p</SelectItem>
                      <SelectItem value="1080p">1080p</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Creativity: {genData.creativity[0]}</Label>
                  <Slider
                    value={genData.creativity}
                    onValueChange={(value) => setGenData({...genData, creativity: value})}
                    max={1}
                    min={0}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Salesforce Integration Fields */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Content Metadata</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template">Template</Label>
                <Select 
                  value={genData.template} 
                  onValueChange={(value) => setGenData({...genData, template: value})}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="race-highlights">Race Highlights</SelectItem>
                    <SelectItem value="training-footage">Training Footage</SelectItem>
                    <SelectItem value="behind-scenes">Behind the Scenes</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Track name or location"
                  value={genData.location}
                  onChange={(e) => setGenData({...genData, location: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="track">Track</Label>
                <Input
                  id="track"
                  placeholder="Track or circuit name"
                  value={genData.track}
                  onChange={(e) => setGenData({...genData, track: e.target.value})}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="scheduledDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Scheduled Date
                </Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={genData.scheduledDate}
                  onChange={(e) => setGenData({...genData, scheduledDate: e.target.value})}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categories
              </Label>
              <div className="mt-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {genData.categories.map((category, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="cursor-pointer"
                      onClick={() => handleTagRemove('categories', index)}
                    >
                      {category} ×
                    </Badge>
                  ))}
                </div>
                <Select onValueChange={(value) => handleTagAdd('categories', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motocross">Motocross</SelectItem>
                    <SelectItem value="supercross">Supercross</SelectItem>
                    <SelectItem value="road-racing">Road Racing</SelectItem>
                    <SelectItem value="enduro">Enduro</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="mt-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {genData.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="cursor-pointer"
                      onClick={() => handleTagRemove('tags', index)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add tag and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTagAdd('tags', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>

            {/* Keywords */}
            <div>
              <Label>Keywords</Label>
              <div className="mt-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  {genData.keywords.map((keyword, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="cursor-pointer"
                      onClick={() => handleTagRemove('keywords', index)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add keyword and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTagAdd('keywords', e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isGenerating || !genData.mainPrompt || !genData.title}
            >
              {isGenerating ? (
                <>
                  <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
};