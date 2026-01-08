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
import { Upload, Wand2, AlertCircle, CheckCircle2, Calendar, MapPin, Tag, ArrowLeft, Sparkles, Clock, Monitor, Video, X, FileVideo } from "lucide-react";
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
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // AI Generation form state with Salesforce fields
  const [genData, setGenData] = useState({
    provider: 'wavespeed',
    model: 'wan_ultrafast',
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

  // Polling subscription for generation updates (replaces real-time due to RLS issues)
  useEffect(() => {
    if (!user || !currentGeneration) return;

    console.log(`🔄 Starting polling for generation ${currentGeneration.id}`);
    
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
            generation_data: { model: updatedGeneration.model }, // simplified for now
            video_url: updatedGeneration.video_url,
            error_message: updatedGeneration.error_message,
            created_at: updatedGeneration.updated_at,
            updated_at: updatedGeneration.updated_at,
          };
          
          setCurrentGeneration(typedGeneration);
          setGenerationProgress(typedGeneration.progress);
          
          console.log(`📊 Generation ${currentGeneration.id}: ${typedGeneration.status} (${typedGeneration.progress}%)`);
          
          if (updatedGeneration.status === 'completed') {
            clearInterval(pollInterval);
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
    }, 3000); // Poll every 3 seconds

    // Cleanup interval on component unmount or when generation changes
    return () => {
      clearInterval(pollInterval);
      console.log(`⏹️ Stopped polling for generation ${currentGeneration.id}`);
    };
  }, [user, currentGeneration, navigate, toast]);

  if (!user) {
    return null;
  }

  // File drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-m4v'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video file (MP4, WebM, MOV, AVI, M4V)",
        variant: "destructive",
      });
      return;
    }
    
    // Max 500MB
    if (file.size > 500 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 500MB",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    // Auto-fill title from filename if empty
    if (!uploadData.title) {
      const fileName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setUploadData(prev => ({ ...prev, title: fileName }));
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile && !uploadData.url) {
      toast({
        title: "No video selected",
        description: "Please select a video file or enter a URL",
        variant: "destructive",
      });
      return;
    }

    if (!uploadData.title) {
      toast({
        title: "Title required",
        description: "Please enter a title for the video",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      if (selectedFile) {
        // Stage 1: Reading file (0-30%)
        setUploadProgress(5);
        
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onprogress = (event) => {
            if (event.lengthComputable) {
              const readProgress = (event.loaded / event.total) * 25;
              setUploadProgress(5 + readProgress);
            }
          };
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(selectedFile);
        const base64Data = await base64Promise;
        
        // Stage 2: Uploading to S3 (30-90%)
        setUploadProgress(35);
        
        // Simulate upload progress since edge function doesn't stream progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 85) {
              clearInterval(progressInterval);
              return prev;
            }
            return prev + 5;
          });
        }, 500);

        const { data, error } = await supabase.functions.invoke('upload-master-to-s3', {
          body: {
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            imageData: base64Data,
            title: uploadData.title,
            description: uploadData.description,
            tags: uploadData.tags.split(',').map(t => t.trim()).filter(Boolean),
          },
        });
        
        clearInterval(progressInterval);

        if (error) throw error;
        
        // Stage 3: Complete (100%)
        setUploadProgress(100);
        
        toast({
          title: "Upload successful!",
          description: "Video has been uploaded and is being processed.",
        });
        
        // Brief delay to show 100%
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear form
        setSelectedFile(null);
        setUploadData({ url: '', title: '', description: '', tags: '', keywords: '' });
        setUploadProgress(0);
        
        // Navigate to library
        navigate('/admin/media/library');
      } else {
        // URL-based upload - placeholder for now
        toast({
          title: "Coming Soon",
          description: "URL import functionality will be available soon!",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
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
      // Generate unique Media URL Key for Salesforce tracking
      const mediaUrlKey = `${genData.provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`Generated Media URL Key: ${mediaUrlKey}`);
      
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

      // Route to appropriate edge function based on provider
      console.log(`[handleGenerateSubmit] Submission #${currentCount} calling ${genData.provider} edge function...`);
      setGenerationStatus('Starting generation...');
      
      let response;
      if (genData.provider === 'wavespeed') {
        response = await supabase.functions.invoke('generate-wavespeed-video', {
          body: {
            userId: user.id,
            creatorContactId: user.id,
            model: genData.model,
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
      } else {
        // VEO provider (existing)
        response = await supabase.functions.invoke('generate-veo-video', {
          body: {
            userId: user.id,
            creatorContactId: user.id,
            prompt: genData.mainPrompt,
            negativePrompt: genData.negativePrompt || undefined,
            duration: genData.duration[0],
            aspectRatio: genData.aspectRatio,
            creativity: genData.creativity[0],
            model: genData.model,
            mediaUrlKey,
            salesforceData,
          },
        });
      }

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
        await submitToSalesforceViaFetch(result.salesforceSubmissionData, result.generationId, mediaUrlKey);
      }

      // Seed currentGeneration using public edge function (bypasses RLS)
      try {
        const { data: statusData, error: statusError } = await supabase.functions.invoke('get-video-generation', {
          body: { id: result.generationId },
        });

        if (statusError) {
          console.warn('Status function error, falling back to minimal seed:', statusError);
        }

        if (statusData?.success) {
          const typedRecord: VideoGeneration = {
            id: statusData.id,
            status: statusData.status,
            progress: statusData.progress,
            generation_data: { model: statusData.model },
            video_url: statusData.video_url,
            error_message: statusData.error_message,
            created_at: statusData.updated_at,
            updated_at: statusData.updated_at,
          };
          setCurrentGeneration(typedRecord);
        } else {
          // Minimal seed to start polling
          setCurrentGeneration({
            id: result.generationId,
            status: 'generating',
            progress: 10,
            generation_data: { model: genData.model },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as VideoGeneration);
        }
      } catch (e) {
        console.warn('Seeding generation failed, using minimal seed:', e);
        setCurrentGeneration({
          id: result.generationId,
          status: 'generating',
          progress: 10,
          generation_data: { model: genData.model },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as VideoGeneration);
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

  const submitToSalesforceViaFetch = async (salesforceData: Record<string, any>, generationId: string, mediaUrlKey: string): Promise<void> => {
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
        'string_ri1__AI_Prompt__c': salesforceData.AI_Prompt__c || '',
        'number_ri1__Length_in_Seconds__c': String(salesforceData.ri1__Length_in_Seconds__c || 5),
        'id_ri1__Contact__c': salesforceData.ri1__Contact__c || '',
        'string_ri1__Categories__c': salesforceData.ri1__Categories__c || '',
        'string_ri1__Subtitle__c': salesforceData.ri1__Subtitle__c || '',
        'string_ri1__AI_Gen_Key__c': mediaUrlKey, // Add the Media URL Key for tracking
      };
      
      // Hidden iframe target submit (no cross-origin document access)
      const iframeName = `sf_submit_${generationId}`;
      const trackingIframe = document.createElement('iframe');
      trackingIframe.name = iframeName;
      trackingIframe.style.display = 'none';
      document.body.appendChild(trackingIframe);

      // Build a form in the parent document and target it to the iframe
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

      // Cleanup
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

  const pageTitle = isGenerateMode ? 'Generate AI Image / Video' : 'Upload Video';
  const pageDescription = isGenerateMode 
    ? 'Create racing content with AI-powered image and video generation'
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
                Generate AI Image / Video
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

                      {/* Drag & Drop Zone */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`text-center py-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                          isDragOver 
                            ? 'border-primary bg-primary/10' 
                            : selectedFile 
                              ? 'border-primary/50 bg-primary/5' 
                              : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                        }`}
                        onClick={!selectedFile ? handleBrowseClick : undefined}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-m4v"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        
                        {selectedFile ? (
                          <div className="space-y-2">
                            <FileVideo className="w-12 h-12 mx-auto text-primary" />
                            <p className="text-foreground font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearSelectedFile();
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground mb-2">
                              {isDragOver ? 'Drop your video here' : 'Drag & drop video files'}
                            </p>
                            <Button variant="outline" type="button" onClick={handleBrowseClick}>
                              Browse Files
                            </Button>
                          </>
                        )}
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

                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {uploadProgress < 30 ? 'Reading file...' : uploadProgress < 90 ? 'Uploading to S3...' : 'Finalizing...'}
                          </span>
                          <span className="font-medium">{Math.round(uploadProgress)}%</span>
                        </div>
                        <Progress value={uploadProgress} className="w-full" />
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload & Process Video'
                      )}
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
                        <Label htmlFor="mainPrompt" className="text-sm font-medium">
                          {genData.model === 'infinitetalk' ? 'Character Description' : 'Main Prompt'} <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="mainPrompt"
                          placeholder={
                            genData.model === 'infinitetalk' 
                              ? "Describe the character, setting, and style for the talking head video..."
                              : "A high-speed motocross race through muddy terrain with spectacular jumps, dynamic camera angles, professional cinematography, 4K resolution..."
                          }
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

                    {/* AI Generation Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">AI Generation Settings</h3>
                      
                      {/* Provider Selection */}
                      <div>
                        <Label htmlFor="provider" className="text-sm font-medium">
                          AI Provider <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          value={genData.provider} 
                          onValueChange={(value) => {
                            setGenData({
                              ...genData, 
                              provider: value,
                              model: value === 'veo' ? 'veo-3' : 'wan_ultrafast' // Default model for each provider (cheapest)
                            });
                          }}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="wavespeed">Wavespeed (Multi-Model)</SelectItem>
                            <SelectItem value="veo">Google VEO 3 (High Quality)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Model Selection */}
                      <div>
                        <Label htmlFor="model" className="text-sm font-medium">
                          Model <span className="text-destructive">*</span>
                        </Label>
                        <Select 
                          value={genData.model} 
                          onValueChange={(value) => setGenData({...genData, model: value})}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {genData.provider === 'veo' ? (
                              <SelectItem value="veo-3">VEO 3</SelectItem>
                            ) : (
                              <>
                                <SelectItem value="wan_ultrafast">WAN Ultra-Fast (480p/720p) - $0.10/run</SelectItem>
                                <SelectItem value="infinitetalk">InfiniteTalk (Talking Head) - $0.15/run</SelectItem>
                                <SelectItem value="wan_standard">WAN Standard (480p-720p) - $0.15/run</SelectItem>
                                <SelectItem value="seedance_standard">Seedance Standard (480p-720p) - $0.18/run</SelectItem>
                                <SelectItem value="pixverse_standard">PixVerse Standard (480p-720p) - $0.20/run</SelectItem>
                                <SelectItem value="dreamina_1080p">Dreamina 1080p - $0.60/run</SelectItem>
                                <SelectItem value="seedance_1080p">Seedance 1080p - $0.65/run</SelectItem>
                                <SelectItem value="pixverse_1080p">PixVerse 1080p Premium - $1.00/run</SelectItem>
                                <SelectItem value="luma_ray">Luma Ray - $1.50/run</SelectItem>
                                <SelectItem value="kling_master">Kling Master - $2.00/run</SelectItem>
                                <SelectItem value="sora_wavespeed">OpenAI Sora (via WaveSpeed) - $4.00/run</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {genData.provider === 'wavespeed' && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            {genData.model === 'wan_ultrafast' && 'Fastest generation, basic quality (480p/720p)'}
                            {genData.model === 'infinitetalk' && 'Create talking/singing heads from image + audio'}
                            {genData.model === 'wan_standard' && 'Standard WAN generation (480p-720p)'}
                            {genData.model === 'seedance_standard' && 'Seedance standard quality (480p-720p)'}
                            {genData.model === 'pixverse_standard' && 'PixVerse standard generation (480p-720p)'}
                            {genData.model === 'dreamina_1080p' && 'High-resolution Dreamina generation (1080p)'}
                            {genData.model === 'seedance_1080p' && 'High-resolution Seedance generation (1080p)'}
                            {genData.model === 'pixverse_1080p' && 'Premium PixVerse generation (1080p)'}
                            {genData.model === 'luma_ray' && 'Premium Luma Ray generation with advanced features'}
                            {genData.model === 'kling_master' && 'Top-tier Kling generation with master quality'}
                            {genData.model === 'sora_wavespeed' && 'OpenAI Sora via WaveSpeed - highest quality'}
                          </div>
                        )}
                      </div>

                      {/* Cost Estimation for Wavespeed */}
                      {genData.provider === 'wavespeed' && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Estimated cost: ${(() => {
                              const costs = { 
                                wan_ultrafast: 0.10,
                                infinitetalk: 0.15,
                                wan_standard: 0.15,
                                seedance_standard: 0.18,
                                pixverse_standard: 0.20,
                                dreamina_1080p: 0.60,
                                seedance_1080p: 0.65,
                                pixverse_1080p: 1.00,
                                luma_ray: 1.50,
                                kling_master: 2.00,
                                sora_wavespeed: 4.00
                              };
                              return (costs[genData.model as keyof typeof costs] || 0.15).toFixed(2);
                            })()} per generation
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {/* VEO-specific fields */}
                      {genData.provider === 'veo' && (
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

                      {/* Wavespeed Reference Images for Vidu */}
                      {genData.provider === 'wavespeed' && genData.model === 'vidu_ref2' && (
                        <div className="space-y-4">
                          <div>
                            <Label>Character Reference Images</Label>
                            <Input
                              type="url"
                              placeholder="https://example.com/character.jpg"
                              className="mt-2"
                              onBlur={(e) => {
                                if (e.target.value && !genData.characterImages.includes(e.target.value)) {
                                  setGenData({
                                    ...genData,
                                    characterImages: [...genData.characterImages, e.target.value]
                                  });
                                  e.target.value = '';
                                }
                              }}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                              {genData.characterImages.map((url, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  Character {index + 1}
                                  <button
                                    type="button"
                                    onClick={() => setGenData({
                                      ...genData,
                                      characterImages: genData.characterImages.filter((_, i) => i !== index)
                                    })}
                                    className="ml-1 text-destructive hover:text-destructive/80"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <Label>Logo Reference Images</Label>
                            <Input
                              type="url"
                              placeholder="https://example.com/logo.png"
                              className="mt-2"
                              onBlur={(e) => {
                                if (e.target.value && !genData.logoImages.includes(e.target.value)) {
                                  setGenData({
                                    ...genData,
                                    logoImages: [...genData.logoImages, e.target.value]
                                  });
                                  e.target.value = '';
                                }
                              }}
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                              {genData.logoImages.map((url, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  Logo {index + 1}
                                  <button
                                    type="button"
                                    onClick={() => setGenData({
                                      ...genData,
                                      logoImages: genData.logoImages.filter((_, i) => i !== index)
                                    })}
                                    className="ml-1 text-destructive hover:text-destructive/80"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* InfiniteTalk-specific fields */}
                      {genData.provider === 'wavespeed' && genData.model === 'infinitetalk' && (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="imageUrl">Character Image URL <span className="text-destructive">*</span></Label>
                            <Input
                              id="imageUrl"
                              type="url"
                              placeholder="https://example.com/character-photo.jpg"
                              value={genData.imageUrl}
                              onChange={(e) => setGenData({...genData, imageUrl: e.target.value})}
                              className="mt-2"
                              required={genData.model === 'infinitetalk'}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="audioUrl">Audio URL <span className="text-destructive">*</span></Label>
                            <Input
                              id="audioUrl"
                              type="url"
                              placeholder="https://example.com/speech.mp3"
                              value={genData.audioUrl}
                              onChange={(e) => setGenData({...genData, audioUrl: e.target.value})}
                              className="mt-2"
                              required={genData.model === 'infinitetalk'}
                            />
                          </div>
                        </div>
                      )}

                      {/* Generation Parameters */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <Label className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Duration: {genData.duration[0]}s
                          </Label>
                          <Slider
                            value={genData.duration}
                            onValueChange={(value) => setGenData({...genData, duration: value})}
                            max={genData.provider === 'wavespeed' ? 10 : 8}
                            min={genData.provider === 'wavespeed' ? 5 : 4}
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

                        {genData.provider === 'wavespeed' ? (
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