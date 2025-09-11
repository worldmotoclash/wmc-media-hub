import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, Wand2, AlertCircle, CheckCircle2, Calendar, MapPin, Tag, ArrowLeft, Sparkles, Clock, Monitor, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

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

const MediaUpload: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isGenerateMode = location.pathname.includes('/generate');
  
  // Upload form state
  const [uploadData, setUploadData] = useState({
    url: '',
    title: '',
    description: '',
    tags: '',
    keywords: ''
  });
  
  // AI Generation form state with Salesforce fields
  const [genData, setGenData] = useState({
    provider: 'veo',
    mainPrompt: '',
    negativePrompt: '',
    duration: [5],
    aspectRatio: '16:9',
    creativity: [0.5],
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

  // Video generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [currentGeneration, setCurrentGeneration] = useState<VideoGeneration | null>(null);

  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the media upload",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [user, navigate, toast]);

  // Real-time subscription for generation updates
  useEffect(() => {
    if (!user || !currentGeneration) return;

    const subscription = supabase
      .channel('video-generation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generations',
          filter: `id=eq.${currentGeneration.id}`,
        },
        (payload) => {
          const updatedGeneration = payload.new as any;
          const typedGeneration: VideoGeneration = {
            id: updatedGeneration.id,
            status: updatedGeneration.status as 'pending' | 'generating' | 'completed' | 'failed',
            progress: updatedGeneration.progress,
            generation_data: updatedGeneration.generation_data,
            video_url: updatedGeneration.video_url,
            error_message: updatedGeneration.error_message,
            created_at: updatedGeneration.created_at,
            updated_at: updatedGeneration.updated_at,
          };
          setCurrentGeneration(typedGeneration);
          setGenerationProgress(typedGeneration.progress);
          
          if (updatedGeneration.status === 'completed') {
            setGenerationStatus('Video generated successfully!');
            setIsGenerating(false);
            toast({
              title: "Success!",
              description: "Video generated successfully! You can now view it in the Media Library.",
            });
            
            // Navigate to media library after a delay
            setTimeout(() => {
              navigate('/admin/media/library');
            }, 2000);
          } else if (updatedGeneration.status === 'failed') {
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
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, currentGeneration, navigate, toast]);

  if (!user) {
    return null;
  }

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Coming Soon",
      description: "Upload functionality will be available soon!",
    });
  };

  const [submissionCount, setSubmissionCount] = useState(0);

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    const currentCount = submissionCount + 1;
    setSubmissionCount(currentCount);
    
    console.log(`[handleGenerateSubmit] Submission #${currentCount} started`, { isGenerating });
    
    // Prevent double submission
    if (isGenerating) {
      console.log(`[handleGenerateSubmit] Submission #${currentCount} blocked - already generating`);
      return;
    }
    
    if (!genData.mainPrompt || !genData.title) {
      console.log(`[handleGenerateSubmit] Submission #${currentCount} blocked - missing data`);
      toast({
        title: "Missing Information",
        description: "Please enter a prompt and title for the video",
        variant: "destructive",
      });
      return;
    }

    console.log(`[handleGenerateSubmit] Submission #${currentCount} proceeding - setting isGenerating to true`);
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Initializing video generation...');

    try {
      // Prepare Salesforce data
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

      // Call the edge function with custom user ID
      console.log(`[handleGenerateSubmit] Submission #${currentCount} calling edge function...`);
      setGenerationStatus('Starting generation...');
      const response = await supabase.functions.invoke('generate-veo-video', {
        body: {
          userId: user.id,
          prompt: genData.mainPrompt,
          negativePrompt: genData.negativePrompt || undefined,
          duration: genData.duration[0],
          aspectRatio: genData.aspectRatio,
          creativity: genData.creativity[0],
          salesforceData,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Unknown error occurred');
      }

      // Submit to Salesforce using direct fetch method
      if (result.salesforceSubmissionData) {
        console.log('Submitting to Salesforce using direct fetch method...');
        await submitToSalesforceViaFetch(result.salesforceSubmissionData, result.generationId);
      }

      // Get the generation record to enable real-time updates
      const { data: generationRecord, error: fetchError } = await supabase
        .from('video_generations')
        .select('*')
        .eq('id', result.generationId)
        .single();

      if (fetchError) {
        console.error('Error fetching generation record:', fetchError);
      } else {
        const typedRecord: VideoGeneration = {
          id: generationRecord.id,
          status: generationRecord.status as 'pending' | 'generating' | 'completed' | 'failed',
          progress: generationRecord.progress,
          generation_data: generationRecord.generation_data,
          video_url: generationRecord.video_url,
          error_message: generationRecord.error_message,
          created_at: generationRecord.created_at,
          updated_at: generationRecord.updated_at,
        };
        setCurrentGeneration(typedRecord);
      }

      setGenerationStatus('Video is being generated...');
      toast({
        title: "Generation Started",
        description: "Your video is being generated. You'll receive updates in real-time.",
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

  const submitToSalesforceViaFetch = async (salesforceData: Record<string, any>, generationId: string): Promise<void> => {
    // Prevent duplicate submissions for the same generation
    const submissionKey = `sf_submission_${generationId}`;
    if ((window as any)[submissionKey]) {
      return;
    }
    (window as any)[submissionKey] = true;

    try {
      const fields: Record<string, string> = {
        'sObj': 'ri1__Content__c',
        'string_Name': salesforceData.Name || `AI Video - ${new Date().toISOString()}`,
        'string_AI_Prompt__c': salesforceData.AI_Prompt__c || '',
        'number_ri1__Length_in_Seconds__c': String(salesforceData.ri1__Length_in_Seconds__c || 5),
        'id_ri1__Contact__c': salesforceData.ri1__Contact__c || '',
        'string_ri1__Categories__c': salesforceData.ri1__Categories__c || '',
        'string_ri1__Subtitle__c': salesforceData.ri1__Subtitle__c || '',
      };
      
      // Hidden iframe for background submission
      const trackingIframe = document.createElement('iframe');
      trackingIframe.style.display = 'none';
      
      trackingIframe.onload = () => {
        try {
          const iframeDoc = trackingIframe.contentDocument || trackingIframe.contentWindow?.document;
          if (!iframeDoc) return;

          const form = iframeDoc.createElement('form');
          form.method = 'POST';
          form.action = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
            
          Object.entries(fields).forEach(([name, value]) => {
            const input = iframeDoc.createElement('input');
            input.type = 'hidden';
            input.name = name;
            input.value = value;
            form.appendChild(input);
          });

          iframeDoc.body.appendChild(form);
          form.submit();
          
        } catch (err) {
          console.error('Salesforce submission error:', err);
        }
      };
      
      document.body.appendChild(trackingIframe);
      trackingIframe.src = 'about:blank';
      
      // Remove iframe after submission
      setTimeout(() => {
        if (document.body.contains(trackingIframe)) {
          document.body.removeChild(trackingIframe);
        }
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

  const pageTitle = isGenerateMode ? 'Generate AI Video' : 'Upload Video';
  const pageDescription = isGenerateMode 
    ? 'Create racing content with AI-powered video generation'
    : 'Add videos from files or URLs to the WMC library';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
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
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              World Moto Clash Media Hub
            </h1>
            <p className="text-xl text-muted-foreground mb-2">Pure Racing, Pure Entertainment</p>
            <p className="text-muted-foreground">{pageDescription}</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Tabs defaultValue={isGenerateMode ? "generate" : "upload"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger 
                value="upload" 
                className="flex items-center gap-2"
                onClick={() => navigate('/admin/media/upload')}
              >
                <Upload className="w-4 h-4" />
                Upload Video
              </TabsTrigger>
              <TabsTrigger 
                value="generate" 
                className="flex items-center gap-2"
                onClick={() => navigate('/admin/media/generate')}
              >
                <Sparkles className="w-4 h-4" />
                Generate AI Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Upload Video Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="url">Video URL (YouTube, Vimeo, etc.)</Label>
                        <Input
                          id="url"
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={uploadData.url}
                          onChange={(e) => setUploadData({...uploadData, url: e.target.value})}
                          className="mt-2"
                        />
                      </div>

                      <div className="text-center py-8 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                        <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground mb-2">Or drag & drop video files</p>
                        <Button variant="outline" type="button">
                          Browse Files
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="title">Video Title</Label>
                          <Input
                            id="title"
                            placeholder="Racing highlight reel..."
                            value={uploadData.title}
                            onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tags">Tags</Label>
                          <Input
                            id="tags"
                            placeholder="racing, motocross, highlights"
                            value={uploadData.tags}
                            onChange={(e) => setUploadData({...uploadData, tags: e.target.value})}
                            className="mt-2"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe the video content..."
                          value={uploadData.description}
                          onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                          className="mt-2"
                          rows={4}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      Upload & Process Video
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="generate" className="space-y-6">
              {/* Generation Progress */}
              {isGenerating && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-sm font-medium">Generating Video</span>
                      </div>
                      <Progress value={generationProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground">{generationStatus}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI Video Generation
                  </CardTitle>
                  <CardDescription>
                    Generate racing videos with AI and automatically sync to Salesforce
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleGenerateSubmit} className="space-y-6">
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

                    {/* AI Generation Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">AI Generation Settings</h3>
                      
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

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Duration: {genData.duration[0]}s
                          </Label>
                          <Slider
                            value={genData.duration}
                            onValueChange={(value) => setGenData({...genData, duration: value})}
                            max={10}
                            min={3}
                            step={1}
                            className="mt-2"
                          />
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

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isGenerating || !genData.mainPrompt || !genData.title}
                    >
                      {isGenerating ? (
                        <>
                          <Wand2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Video...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Generate AI Video
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default MediaUpload;