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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  AlertCircle,
  Info,
  Check,
  Download,
  Loader2,
  Lock,
  Eye,
  Users,
  Palette,
  Camera,
  Pin
} from "lucide-react";
import { STORYTELLING_PROMPTS } from "@/constants/storytellingPrompts";
import { GRID_POSITIONS, GRID_TEMPLATES } from "@/constants/gridPositions";
import { ImageDropzone } from "@/components/media/ImageDropzone";
import { SubjectReferenceDialog } from "@/components/media/SubjectReferenceDialog";
import { StyleLockPreview } from "@/components/media/StyleLockPreview";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/integrations/supabase/client";
import { DefaultModelService } from "@/services/defaultModelService";
import { ImageDefaultModelService } from "@/services/imageDefaultModelService";
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

interface ImageGeneration {
  id: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  image_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Style Profile interface for master image analysis
interface StyleProfile {
  subjects: Array<{
    id: string;
    type: 'person' | 'vehicle' | 'animal' | 'object' | 'group';
    appearance: string;
    wardrobe?: string;
    distinguishingTraits: string[];
    position: string;
  }>;
  environment: {
    setting: string;
    timeOfDay: string;
    weather?: string;
    backgroundElements: string[];
  };
  lighting: {
    direction: string;
    quality: string;
    keyTones: string[];
  };
  colorGrade: {
    palette: string[];
    mood: string;
    contrast: string;
    texture: string;
  };
  cameraStyle: {
    lensType: string;
    depthOfField: string;
    compositionNotes: string;
  };
  visualAnchors: string[];
  negativeConstraints: string[];
}

// LLM-focused Image Use Cases (matches video preset pattern)
const IMAGE_USE_CASES = [
  {
    id: 'fast-free',
    name: 'Fast & Free',
    description: 'Included',
    icon: Zap,
    color: 'bg-emerald-500',
    defaultModelId: 'gemini-flash-image'
  },
  {
    id: 'ultra-fast',
    name: 'Ultra-Fast',
    description: 'Batch ready',
    icon: Sparkles,
    color: 'bg-purple-500',
    defaultModelId: 'flux-schnell'
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Best quality',
    icon: Film,
    color: 'bg-blue-500',
    defaultModelId: 'gemini-3-pro-image'
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Pro output',
    icon: Settings2,
    color: 'bg-orange-500',
    defaultModelId: 'flux-dev'
  }
];

// Optional Image Templates for 3×3 grid generation
const IMAGE_TEMPLATES = [
  { id: 'none', name: 'No Template', description: 'Single image generation', requiresImage: false },
  { id: 'version1', name: 'V1 Contact Sheet', description: '3×3 grid - Shot coverage', requiresImage: true },
  { id: 'version2', name: 'V2 Trailer/Keyframes', description: '3×3 sequence', requiresImage: true },
  { id: 'version3', name: "V3 Director's Cut", description: '3×3 storyboard', requiresImage: true }
];

// Image Generation Models
const IMAGE_GENERATION_MODELS = [
  // Lovable AI models (Nano Banana branding)
  {
    id: 'gemini-flash-image',
    name: 'Nano Banana',
    model: 'google/gemini-2.5-flash-image-preview',
    vendor: 'Lovable AI',
    description: 'Fast, high-quality (Gemini 2.5 Flash)',
    qualityTier: 'standard',
    speedTier: 'fast',
    pricing: 'Included'
  },
  {
    id: 'gemini-3-pro-image',
    name: 'Nano Banana Pro',
    model: 'google/gemini-3-pro-image-preview',
    vendor: 'Lovable AI',
    description: 'Premium quality (Gemini 3 Pro)',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: 'Included'
  },
  // Wavespeed FLUX models
  {
    id: 'flux-schnell',
    name: 'FLUX Schnell',
    model: 'wavespeed-ai/flux-schnell',
    vendor: 'Wavespeed',
    description: 'Ultra-fast 12B parameter model (1-4 steps)',
    qualityTier: 'fast',
    speedTier: 'ultra-fast',
    pricing: '$0.003/image'
  },
  {
    id: 'flux-dev',
    name: 'FLUX Dev',
    model: 'flux/dev',
    vendor: 'Wavespeed',
    description: 'High-quality production model',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: '$0.025/image'
  }
];

// Video Presets
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

type OutputType = 'image' | 'video' | null;

const Generate: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  // Get output type, model, and use-case from URL params
  const urlType = searchParams.get('type') as OutputType;
  const urlModelId = searchParams.get('model');
  const urlUseCase = searchParams.get('useCase');
  
  // Output type selection (Image or Video)
  const [outputType, setOutputType] = useState<OutputType>(urlType || null);
  
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
    startImageAssetId: '',
    startImageSalesforceId: '',
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
  const [currentImageGeneration, setCurrentImageGeneration] = useState<ImageGeneration | null>(null);
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Grid extraction state
  const [selectedGridPosition, setSelectedGridPosition] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractingAll, setExtractingAll] = useState(false);
  const [extractedVariants, setExtractedVariants] = useState<Array<{id: string, url: string, position: string, label: string}>>([]);
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0 });
  
  // Style Lock state for master image analysis
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [styleOverride, setStyleOverride] = useState('');
  
  // Subject Reference state for pinning specific elements
  const [subjectReferences, setSubjectReferences] = useState<Record<string, {
    imageUrl: string;
    assetId?: string;
    fromLibrary?: boolean;
    libraryId?: string;
    profile?: Partial<StyleProfile>;
  }>>({});
  const [referenceDialogOpen, setReferenceDialogOpen] = useState(false);
  const [selectedSubjectForReference, setSelectedSubjectForReference] = useState<StyleProfile['subjects'][0] | null>(null);
  
  // Image model state - check URL param for model selection from marketplace
  const initialImageModel = urlModelId 
    ? IMAGE_GENERATION_MODELS.find(m => m.id === urlModelId) || IMAGE_GENERATION_MODELS[0]
    : IMAGE_GENERATION_MODELS[0];
  const [selectedImageModel, setSelectedImageModel] = useState(initialImageModel);
  const [selectedImageUseCase, setSelectedImageUseCase] = useState<string>(urlUseCase || '');
  
  // Handle output type change - reset related state
  const handleOutputTypeChange = (type: OutputType) => {
    setOutputType(type);
    setSelectedTemplate('');
    setSelectedImageUseCase('');
    if (type === 'video') {
      setSelectedPreset('teaser');
      setSelectedModel(DefaultModelService.getDefaultModel('teaser'));
    } else {
      setSelectedPreset('');
      setSelectedModel(null);
    }
  };

  // Handle image use case selection - auto-select default model (no template coupling)
  const handleImageUseCaseChange = (useCaseId: string) => {
    setSelectedImageUseCase(useCaseId);
    // Auto-select the default model for this use-case
    const defaultModel = ImageDefaultModelService.getDefaultModel(useCaseId);
    if (defaultModel) {
      const modelData = IMAGE_GENERATION_MODELS.find(m => m.id === defaultModel.id);
      if (modelData) {
        setSelectedImageModel(modelData);
      }
    }
  };

  // Handle image template selection (separate from use-case)
  const handleImageTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  // Get current selected template info
  const selectedTemplateInfo = IMAGE_TEMPLATES.find(t => t.id === selectedTemplate);
  
  // Check if a grid template is selected that requires style analysis
  const isGridTemplate = selectedTemplate && ['version1', 'version2', 'version3'].includes(selectedTemplate);
  
  // Check if video model supports image-to-video (enables style lock for video)
  const isImageToVideoModel = outputType === 'video' && selectedModel?.capabilities.includes('image_to_video');
  
  // Style Lock should be available for grid templates OR image-to-video models
  const supportsStyleLock = isGridTemplate || isImageToVideoModel;

  // Analyze master image when uploaded (for grid templates)
  const analyzeStyleProfile = async (imageUrl: string, assetId?: string) => {
    if (!imageUrl) return;
    
    setIsAnalyzingStyle(true);
    try {
      const response = await supabase.functions.invoke('analyze-master-image', {
        body: { imageUrl, assetId }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Analysis failed');
      }

      if (response.data?.success && response.data?.styleProfile) {
        setStyleProfile(response.data.styleProfile);
        toast({
          title: "Style Lock Ready",
          description: `Identified ${response.data.styleProfile.subjects?.length || 0} subjects and ${response.data.styleProfile.visualAnchors?.length || 0} visual anchors`,
        });
      } else {
        throw new Error(response.data?.error || 'Failed to analyze image');
      }
    } catch (error) {
      console.error('Style analysis error:', error);
      toast({
        title: "Style Analysis Failed",
        description: error instanceof Error ? error.message : 'Failed to analyze image style',
        variant: "destructive",
      });
    }
    setIsAnalyzingStyle(false);
  };

  // Handle master image upload with style analysis
  const handleMasterImageUpload = async (info: { url: string; assetId?: string; salesforceId?: string }) => {
    setGenData(prev => ({ 
      ...prev, 
      startImage: info.url,
      startImageAssetId: info.assetId || '',
      startImageSalesforceId: info.salesforceId || ''
    }));
    
    // Clear previous style profile and subject references
    setStyleProfile(null);
    setSubjectReferences({});
    
    // Auto-analyze if grid template selected OR image-to-video model is selected
    if ((isGridTemplate || isImageToVideoModel) && info.url) {
      await analyzeStyleProfile(info.url, info.assetId);
    }
  };

  // Check authentication
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to generate content",
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

  // Polling for video generation updates
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

  // Polling for image generation updates
  useEffect(() => {
    if (!user || !currentImageGeneration || currentImageGeneration.status === 'completed' || currentImageGeneration.status === 'failed') return;

    const pollInterval = setInterval(async () => {
      try {
        const { data: statusData, error } = await supabase.functions.invoke('get-image-generation', {
          body: { id: currentImageGeneration.id },
        });

        if (error) {
          console.error('Error polling image generation status:', error);
          return;
        }

        if (statusData?.success) {
          const updatedGeneration = statusData;
          const typedGeneration: ImageGeneration = {
            id: updatedGeneration.id,
            status: updatedGeneration.status as 'pending' | 'generating' | 'completed' | 'failed',
            progress: updatedGeneration.progress,
            image_url: updatedGeneration.image_url,
            error_message: updatedGeneration.error_message,
            created_at: updatedGeneration.created_at,
            updated_at: updatedGeneration.updated_at,
          };
          
          setCurrentImageGeneration(typedGeneration);
          setGenerationProgress(typedGeneration.progress);
          
          if (updatedGeneration.status === 'completed') {
            clearInterval(pollInterval);
            setGenerationStatus('Image generated successfully!');
            setIsGenerating(false);
            toast({
              title: "Success!",
              description: "Image generated successfully!",
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
            setGenerationStatus(`Generating image... ${updatedGeneration.progress}%`);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [user, currentImageGeneration?.id, toast]);

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

  const handleChangeImageModel = () => {
    navigate(`/admin/media/models?type=image&useCase=${selectedImageUseCase}`);
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isGenerating) return;
    
    // For video, require model selection
    if (outputType === 'video' && !selectedModel) {
      toast({
        title: "Missing Model",
        description: "Please select a model for video generation",
        variant: "destructive",
      });
      return;
    }
    
    if (!genData.mainPrompt || !genData.title) {
      toast({
        title: "Missing Information",
        description: `Please enter a prompt and title for the ${outputType}`,
        variant: "destructive",
      });
      return;
    }

    // Check if selected template requires an image (for image generation)
    if (outputType === 'image' && selectedTemplate) {
      const template = STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate);
      if (template?.requiresImage && !genData.startImage) {
        toast({
          title: "Image Required",
          description: `The "${template.name}" template requires a reference image. Please upload one.`,
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
    
    // Route based on output type
    if (outputType === 'image') {
      await handleImageGeneration(fullPrompt);
    } else {
      await handleVideoGeneration(fullPrompt);
    }
  };

  // Helper to convert aspect ratio to dimensions
  const getImageDimensions = (aspectRatio: string): { width: number; height: number } => {
    switch (aspectRatio) {
      case '1:1': return { width: 1024, height: 1024 };
      case '16:9': return { width: 1344, height: 768 };
      case '9:16': return { width: 768, height: 1344 };
      case '4:3': return { width: 1152, height: 896 };
      case '21:9': return { width: 1536, height: 640 };
      default: return { width: 1024, height: 1024 };
    }
  };

  const handleImageGeneration = async (fullPrompt: string) => {
    setGenerationStatus('Initializing image generation...');
    
    try {
      const vendor = selectedImageModel.vendor;
      let response;

      if (vendor === 'Wavespeed') {
        // Use Wavespeed FLUX models
        const dimensions = getImageDimensions(genData.aspectRatio);
        response = await supabase.functions.invoke('generate-wavespeed-image', {
          body: {
            userId: user?.id,
            model: selectedImageModel.id,
            prompt: fullPrompt,
            width: dimensions.width,
            height: dimensions.height,
            title: genData.title,
            referenceImageUrl: genData.startImage || undefined,
            salesforceData: {
              title: genData.title,
              description: genData.description,
              categories: genData.categories,
              tags: genData.tags,
            }
          },
        });
      } else {
        // Use Lovable AI (Gemini) models
        response = await supabase.functions.invoke('generate-image', {
          body: {
            userId: user?.id,
            prompt: fullPrompt,
            template: selectedTemplate || undefined,
            referenceImageUrl: genData.startImage || undefined,
            title: genData.title,
            model: selectedImageModel.model,
            masterAssetId: genData.startImageAssetId || undefined,
            masterSalesforceId: genData.startImageSalesforceId || undefined,
            // Pass style profile and override for consistency enforcement
            styleProfile: styleProfile || undefined,
            styleOverride: styleOverride || undefined,
            // Pass pinned subject references for element locking
            pinnedSubjects: Object.entries(subjectReferences).map(([subjectId, ref]) => ({
              subjectId,
              imageUrl: ref.imageUrl,
              profile: ref.profile
            })),
            salesforceData: {
              title: genData.title,
              description: genData.description,
              categories: genData.categories,
              tags: genData.tags,
            }
          },
        });
      }

      if (response.error) {
        const msg = response.error.message || 'Edge Function returned a non-2xx status code';
        throw new Error(msg);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Unknown error occurred');
      }

      // Start polling for image generation
      setCurrentImageGeneration({
        id: result.generationId,
        status: 'generating',
        progress: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setGenerationStatus('Image is being generated...');
      toast({
        title: "Generation Started",
        description: `Your image is being generated using ${vendor}.`,
      });

    } catch (error) {
      console.error('Image generation error:', error);
      setGenerationStatus('Generation failed');
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const handleVideoGeneration = async (fullPrompt: string) => {
    if (!selectedModel) return;
    
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
            startImage: genData.startImage || undefined,
            endImage: genData.endImage || undefined,
            // Pass style profile for image-to-video consistency
            styleProfile: styleProfile || undefined,
            styleOverride: styleOverride || undefined,
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
            startImage: genData.startImage || undefined,
            endImage: genData.endImage || undefined,
            // Pass style profile for image-to-video consistency
            styleProfile: styleProfile || undefined,
            styleOverride: styleOverride || undefined,
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

  // Extract a single grid position
  const handleExtractImage = async (positionId?: string) => {
    const targetPosition = positionId || selectedGridPosition;
    if (!currentImageGeneration?.image_url || !targetPosition) return;
    
    const position = GRID_POSITIONS.find(p => p.id === targetPosition);
    if (!position) return;

    setIsExtracting(true);
    try {
      const response = await supabase.functions.invoke('extract-grid-image', {
        body: {
          sourceUrl: currentImageGeneration.image_url,
          row: position.row,
          col: position.col,
          generationId: currentImageGeneration.id,
          positionId: targetPosition,
          template: selectedTemplate,
          title: `${genData.title} - ${position.label}`,
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Extraction failed');
      }

      if (response.data?.success) {
        setExtractedVariants(prev => [...prev, {
          id: response.data.assetId,
          url: response.data.url,
          position: targetPosition,
          label: position.label
        }]);
        toast({ 
          title: "Image Extracted", 
          description: `Saved ${position.label} variant to library` 
        });
        setSelectedGridPosition('');
      } else {
        throw new Error(response.data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast({ 
        title: "Extraction Failed", 
        description: error instanceof Error ? error.message : 'Failed to extract image',
        variant: "destructive" 
      });
    }
    setIsExtracting(false);
  };

  // Extract all 9 grid positions
  const handleExtractAll = async () => {
    if (!currentImageGeneration?.image_url) return;

    setExtractingAll(true);
    setExtractionProgress({ current: 0, total: 9 });

    const results: Array<{id: string, url: string, position: string, label: string}> = [];
    
    for (let i = 0; i < GRID_POSITIONS.length; i++) {
      const position = GRID_POSITIONS[i];
      setExtractionProgress({ current: i + 1, total: 9 });

      // Skip if already extracted
      if (extractedVariants.some(v => v.position === position.id)) {
        continue;
      }

      try {
        const response = await supabase.functions.invoke('extract-grid-image', {
          body: {
            sourceUrl: currentImageGeneration.image_url,
            row: position.row,
            col: position.col,
            generationId: currentImageGeneration.id,
            positionId: position.id,
            template: selectedTemplate,
            title: `${genData.title} - ${position.label}`,
          }
        });

        if (response.data?.success) {
          results.push({
            id: response.data.assetId,
            url: response.data.url,
            position: position.id,
            label: position.label
          });
        }
      } catch (error) {
        console.error(`Failed to extract ${position.label}:`, error);
      }
    }

    setExtractedVariants(prev => [...prev, ...results]);
    setExtractingAll(false);
    
    toast({ 
      title: "Extraction Complete", 
      description: `Successfully extracted ${results.length} images from the grid` 
    });
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
              Generate Image / Video
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Create AI-powered racing content with your selected model
            </p>
          </motion.div>
        </div>

        {/* Output Type Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
        >
          <Card className="p-6 mb-6">
            <Label className="text-sm font-medium mb-4 block">What do you want to create?</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleOutputTypeChange('image')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  outputType === 'image' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Image className="w-8 h-8 mb-3 text-primary" />
                <span className="font-semibold text-lg block mb-1">Image</span>
                <p className="text-sm text-muted-foreground">Storyboards, contact sheets, promotional images</p>
              </button>
              
              <button
                type="button"
                onClick={() => handleOutputTypeChange('video')}
                className={`p-6 rounded-xl border-2 transition-all text-left ${
                  outputType === 'video' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Film className="w-8 h-8 mb-3 text-primary" />
                <span className="font-semibold text-lg block mb-1">Video</span>
                <p className="text-sm text-muted-foreground">Teasers, cinematic clips, social content</p>
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Image Use-Cases (Storytelling Templates) */}
        {outputType === 'image' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium">Choose Image Use-Case</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                      <Info className="w-4 h-4" />
                      Compare Use-Cases
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Use-Case Comparison</DialogTitle>
                      <DialogDescription>
                        Choose the right use-case for your creative workflow
                      </DialogDescription>
                    </DialogHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Use-Case</TableHead>
                          <TableHead>Primary Input</TableHead>
                          <TableHead>Output Type</TableHead>
                          <TableHead className="text-center">Output</TableHead>
                          <TableHead>Best For</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Quick Concept</TableCell>
                          <TableCell>Text prompt only</TableCell>
                          <TableCell>Single image</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <Check className="w-4 h-4 text-green-500" />
                              <span className="text-xs font-medium">1 Image</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary">Quick ideas & concepts</Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Shot Coverage</TableCell>
                          <TableCell>Base image</TableCell>
                          <TableCell>Direct image generation</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <Check className="w-4 h-4 text-green-500" />
                              <span className="text-xs font-medium">3×3 Grid</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary">Fast, visual coverage</Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Trailer Prep</TableCell>
                          <TableCell>Base image</TableCell>
                          <TableCell>Prompts → video keyframes</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <Check className="w-4 h-4 text-green-500" />
                              <span className="text-xs font-medium">3×3 Grid</span>
                              <span className="text-xs text-muted-foreground">+ motion prompts</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary">Cinematic trailers & AI video</Badge></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Director's Cut</TableCell>
                          <TableCell>Story + reference image</TableCell>
                          <TableCell>Detailed prompts</TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <Check className="w-4 h-4 text-green-500" />
                              <span className="text-xs font-medium">3×3 Grid</span>
                              <span className="text-xs text-muted-foreground">when executed</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary">Maximum control & consistency</Badge></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {IMAGE_USE_CASES.map((useCase) => {
                  const Icon = useCase.icon;
                  const isSelected = selectedImageUseCase === useCase.id;
                  const defaultModel = ImageDefaultModelService.getDefaultModel(useCase.id);
                  
                  return (
                    <div key={useCase.id} className="flex flex-col items-center">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleImageUseCaseChange(useCase.id)}
                        className={`flex items-center gap-2 mb-1 ${isSelected ? useCase.color : ''}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{useCase.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {useCase.description}
                        </Badge>
                      </Button>
                      {/* Show default model name below button like video presets */}
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
        )}

        {/* Selected Image Model - matches video model selector pattern */}
        {outputType === 'image' && (
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
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{selectedImageModel.vendor}</Badge>
                      <span className="font-medium">{selectedImageModel.name}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>•</span>
                        <span>{selectedImageModel.pricing}</span>
                        <span>•</span>
                        <span>{selectedImageModel.qualityTier} quality</span>
                        <span>•</span>
                        <span>{selectedImageModel.speedTier} speed</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleChangeImageModel}
                  className="h-9 px-3"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Change Model
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Optional Image Template Selector */}
        {outputType === 'image' && selectedImageUseCase && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Label className="text-sm font-medium">Select Template (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-96" align="start">
                    <div className="space-y-3">
                      <h4 className="font-semibold">Template Comparison</h4>
                      <div className="space-y-3 text-sm">
                        <div className="border-l-2 border-blue-500 pl-3">
                          <p className="font-medium">V1 – Contact Sheet</p>
                          <p className="text-muted-foreground">Technical shot coverage. Generates a 3×3 grid showing every camera angle (wide, medium, close-up, low angle, high angle) of the same scene. Best for seeing your subject from all perspectives.</p>
                        </div>
                        <div className="border-l-2 border-purple-500 pl-3">
                          <p className="font-medium">V2 – Trailer/Keyframes</p>
                          <p className="text-muted-foreground">Video production focus. Creates a narrative sequence of keyframes designed as a storyboard for AI video generation. Includes emotional arc (setup → build → turn → payoff) with edit-motivated continuity.</p>
                        </div>
                        <div className="border-l-2 border-amber-500 pl-3">
                          <p className="font-medium">V3 – Director's Cut</p>
                          <p className="text-muted-foreground">Story-driven. A meta-prompt that takes your story synopsis and designs a custom storyboard. Analyzes your narrative to create scene-appropriate shots rather than following a fixed structure.</p>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a template to generate 3×3 grids. Skip for single image generation.
              </p>
              <div className="flex flex-wrap gap-2">
                {IMAGE_TEMPLATES.map((template) => {
                  const isSelected = selectedTemplate === template.id;
                  
                  return (
                    <div key={template.id} className="flex flex-col items-center">
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleImageTemplateChange(template.id)}
                        className="flex items-center gap-2 mb-1"
                      >
                        {template.id === 'none' ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <Grid3X3 className="w-4 h-4" />
                        )}
                        <span className="font-medium">{template.name}</span>
                      </Button>
                      <div className="text-xs text-muted-foreground text-center max-w-[120px]">
                        {template.description}
                      </div>
                      {template.requiresImage && (
                        <div className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                          <Image className="w-3 h-3" />
                          Requires Image
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Video Use-Case Presets */}
        {outputType === 'video' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <Card className="p-6 mb-6">
              <Label className="text-sm font-medium mb-3 block">Choose Video Use-Case</Label>
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
        )}

        {/* Selected Model & Change Option - only for video */}
        {outputType === 'video' && (
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
        )}

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
                  <span className="text-sm font-medium">Generating {outputType === 'image' ? 'Image' : 'Video'}</span>
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
            <Card className="p-6 mb-6 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-medium text-green-800 dark:text-green-200">Video Generated Successfully!</span>
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
                    Generate Another
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Image Completed Display */}
        {currentImageGeneration?.status === 'completed' && currentImageGeneration.image_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 mb-6 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <span className="text-lg font-medium text-green-800 dark:text-green-200">Image Generated Successfully!</span>
                </div>
                <img
                  src={currentImageGeneration.image_url}
                  alt="Generated image"
                  className="w-full rounded-lg bg-muted"
                  style={{ maxHeight: '500px', objectFit: 'contain' }}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={currentImageGeneration.image_url} download target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Download Image
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCurrentImageGeneration(null);
                      setExtractedVariants([]);
                      setGenData(prev => ({ ...prev, title: '', mainPrompt: '', description: '' }));
                    }}
                  >
                    Generate Another
                  </Button>
                </div>
              </div>
            </Card>

            {/* Grid Extraction Section - Only show for 3x3 templates */}
            {GRID_TEMPLATES.includes(selectedTemplate) && (
              <Card className="p-6 mb-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Grid3X3 className="w-5 h-5 text-primary" />
                  Extract Individual Images
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Extract individual images from the 3×3 grid. Each extracted image will be saved to your media library.
                </p>

                {/* Extract All Button */}
                <div className="flex gap-4 items-center mb-6">
                  <Button
                    onClick={handleExtractAll}
                    disabled={isExtracting || extractingAll || extractedVariants.length >= 9}
                    className="flex-shrink-0"
                  >
                    {extractingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting {extractionProgress.current}/{extractionProgress.total}...
                      </>
                    ) : (
                      <>
                        <Grid3X3 className="w-4 h-4 mr-2" />
                        Extract All 9 Images
                      </>
                    )}
                  </Button>
                  {extractedVariants.length > 0 && (
                    <Badge variant="secondary">
                      {extractedVariants.length}/9 extracted
                    </Badge>
                  )}
                </div>

                {/* Individual Position Selector */}
                <div className="flex gap-4 items-end mb-6">
                  <div className="flex-1 max-w-xs">
                    <Label className="text-sm mb-2 block">Or select individual position</Label>
                    <Select 
                      value={selectedGridPosition} 
                      onValueChange={setSelectedGridPosition}
                      disabled={isExtracting || extractingAll}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose grid position..." />
                      </SelectTrigger>
                      <SelectContent>
                        {GRID_POSITIONS.map(pos => {
                          const isExtracted = extractedVariants.some(v => v.position === pos.id);
                          return (
                            <SelectItem 
                              key={pos.id} 
                              value={pos.id}
                              disabled={isExtracted}
                            >
                              {pos.label} {isExtracted && '✓'}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={() => handleExtractImage()} 
                    disabled={!selectedGridPosition || isExtracting || extractingAll}
                    variant="outline"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      'Extract & Save'
                    )}
                  </Button>
                </div>

                {/* Extracted Variants Grid */}
                {extractedVariants.length > 0 && (
                  <div className="mt-6">
                    <Label className="text-sm mb-3 block">Extracted Images</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {extractedVariants.map(v => (
                        <div key={v.id} className="relative group">
                          <img 
                            src={v.url} 
                            alt={v.label}
                            className="w-full aspect-square object-cover rounded-lg border"
                          />
                          <Badge 
                            className="absolute top-2 left-2 text-xs"
                            variant="secondary"
                          >
                            {v.label.split(' ')[0]} {v.label.split(' ')[1]}
                          </Badge>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Button
                              size="sm"
                              variant="secondary"
                              asChild
                            >
                              <a href={v.url} download target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </motion.div>
        )}

        {/* Form - Hidden when completed or no output type selected */}
        {outputType && (!currentGeneration || currentGeneration.status !== 'completed') && (!currentImageGeneration || currentImageGeneration.status !== 'completed') && (
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


                {/* Show selected template indicator for image mode */}
                {outputType === 'image' && selectedTemplate && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        <FileText className="w-3 h-3 mr-1" />
                        Template: {STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.name}
                      </Badge>
                    </div>
                    {STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage && !genData.startImage && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg text-sm mt-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        This template requires a starting image. Please upload one below.
                      </div>
                    )}
                  </div>
                )}

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

              {/* Image Settings - Only show for image output */}
              {outputType === 'image' && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Image Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <SelectItem value="1:1">1:1 (Square)</SelectItem>
                          <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                          <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                          <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              )}

              {/* Video Generation Settings - Only show for video output */}
              {outputType === 'video' && (
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
              )}

              {/* Start/End Image Section - Shows for image-to-video models OR when template requires image */}
              {(selectedModel && (selectedModel.capabilities.includes('image_to_video') || selectedModel.capabilities.includes('start_end_image'))) || 
               STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage ? (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Image className="w-5 h-5" />
                    Master Image
                    {selectedModel?.capabilities.includes('start_end_image') && (
                      <Badge variant="secondary" className="text-xs">Start + End</Badge>
                    )}
                    {STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Required by Template</Badge>
                    )}
                    {(isGridTemplate || isImageToVideoModel) && (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Style Lock
                      </Badge>
                    )}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Start Image */}
                    <ImageDropzone
                      value={genData.startImage}
                      onChange={(url) => setGenData(prev => ({ ...prev, startImage: url }))}
                      onUploadComplete={handleMasterImageUpload}
                      label={selectedModel?.capabilities.includes('start_end_image') ? 'Start Image' : 'Master/Source Image'}
                      description={isGridTemplate 
                        ? 'Master image - variants will match this exactly'
                        : isImageToVideoModel
                          ? 'Reference image - video will match this style exactly'
                          : STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage 
                            ? 'Reference image for the storytelling template'
                            : selectedModel?.capabilities.includes('start_end_image') 
                              ? 'The first frame of your video'
                              : 'The image to animate into video'}
                      required={selectedModel?.id === 'vidu_i2v' || STORYTELLING_PROMPTS.find(p => p.id === selectedTemplate)?.requiresImage}
                      disabled={isGenerating || isAnalyzingStyle}
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

                  {/* Style Lock Panel - Shows when grid template OR image-to-video model is selected and image is uploaded */}
                  {supportsStyleLock && genData.startImage && (
                    <div className="mt-6 p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-emerald-600" />
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">Style Lock</span>
                          {isAnalyzingStyle ? (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Analyzing...
                            </Badge>
                          ) : styleProfile ? (
                            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Not analyzed</Badge>
                          )}
                        </div>
                        {!isAnalyzingStyle && !styleProfile && genData.startImage && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => analyzeStyleProfile(genData.startImage, genData.startImageAssetId)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Analyze Style
                          </Button>
                        )}
                      </div>

                      {/* Subject List with Pinned Thumbnails */}
                      <StyleLockPreview
                        styleProfile={styleProfile}
                        subjectReferences={subjectReferences}
                        isAnalyzing={isAnalyzingStyle}
                        onSubjectClick={(subject) => {
                          setSelectedSubjectForReference(subject);
                          setReferenceDialogOpen(true);
                        }}
                      />

                      {styleProfile && (
                        <div className="space-y-3 mt-4">
                          {/* Pinned References Summary */}
                          {Object.keys(subjectReferences).length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Pin className="w-4 h-4 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">
                                {Object.keys(subjectReferences).length} element(s) pinned with references
                              </span>
                            </div>
                          )}

                          {/* Visual Anchors with Reference Image Support */}
                          <div className="flex items-start gap-2">
                            <Palette className="w-4 h-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1">
                              <span className="text-xs font-medium text-muted-foreground">Visual Anchors (locked):</span>
                              <div className="mt-2 space-y-2">
                                {styleProfile.visualAnchors?.map((anchor, i) => (
                                  <div key={i} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1.5 group">
                                    <span className="text-xs text-muted-foreground truncate flex-1">{anchor}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs opacity-60 group-hover:opacity-100 transition-opacity"
                                      onClick={() => {
                                        toast({
                                          title: "Reference Image",
                                          description: "Anchor reference images will be supported in a future update",
                                        });
                                      }}
                                    >
                                      <Image className="w-3 h-3 mr-1" />
                                      Add Ref
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Negative Constraints */}
                          {styleProfile.negativeConstraints && styleProfile.negativeConstraints.length > 0 && (
                            <div className="flex items-start gap-2 mt-3">
                              <AlertCircle className="w-4 h-4 mt-0.5 text-destructive/70" />
                              <div className="flex-1">
                                <span className="text-xs font-medium text-destructive/70">Negative Constraints:</span>
                                <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                                  {styleProfile.negativeConstraints.slice(0, 3).map((constraint, i) => (
                                    <li key={i}>{constraint}</li>
                                  ))}
                                  {styleProfile.negativeConstraints.length > 3 && (
                                    <li className="text-muted-foreground/60">+{styleProfile.negativeConstraints.length - 3} more...</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* Override textarea */}
                          <div className="mt-3">
                            <Label className="text-xs text-muted-foreground">Extra constraints (optional):</Label>
                            <Textarea
                              value={styleOverride}
                              onChange={(e) => setStyleOverride(e.target.value)}
                              placeholder="Add extra style constraints or overrides..."
                              className="mt-1 text-xs h-16"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tips */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      <strong>Tips:</strong> {isGridTemplate 
                        ? 'Style Lock ensures all 9 grid panels match your master image exactly - same characters, wardrobe, environment, and lighting.'
                        : selectedModel?.capabilities.includes('start_end_image') 
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
                  disabled={
                    isGenerating || 
                    (outputType === 'video' && !selectedModel) ||
                    (outputType === 'image' && selectedTemplateInfo?.requiresImage && !genData.startImage)
                  }
                  className="min-w-48"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : outputType === 'image' ? (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Image
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

      {/* Subject Reference Dialog */}
      <SubjectReferenceDialog
        open={referenceDialogOpen}
        onOpenChange={setReferenceDialogOpen}
        subject={selectedSubjectForReference}
        existingReference={selectedSubjectForReference ? subjectReferences[selectedSubjectForReference.id] : undefined}
        onApplyReference={(subjectId, reference) => {
          setSubjectReferences(prev => ({
            ...prev,
            [subjectId]: reference
          }));
        }}
        onClearReference={(subjectId) => {
          setSubjectReferences(prev => {
            const updated = { ...prev };
            delete updated[subjectId];
            return updated;
          });
        }}
      />
    </div>
  );
};

export default Generate;