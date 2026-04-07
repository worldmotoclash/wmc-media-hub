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
import { Upload, Wand2, AlertCircle, CheckCircle2, Calendar, MapPin, Tag, ArrowLeft, Sparkles, Clock, Monitor, Video, X, FileVideo, Image as ImageIcon, Music, Mic, Layers } from "lucide-react";
import { BulkUploadTab } from "@/components/media/BulkUploadTab";
import { Switch } from "@/components/ui/switch";
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
  const [uploadPhase, setUploadPhase] = useState('');
  const [isPodcast, setIsPodcast] = useState(false);
  const [bumperSkipSeconds, setBumperSkipSeconds] = useState(0);
  const [submissionCount, setSubmissionCount] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    tags: string[];
    description: string;
    confidence: number;
    scene?: string;
    mood?: string;
  } | null>(null);
  
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
    window.scrollTo(0, 0);
  }, []);

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

  // Helper functions to detect file type
  const getFileType = (file: File): 'video' | 'image' | 'audio' => {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'image';
  };

  const isAudioFile = (file: File | null): boolean => {
    return file?.type.startsWith('audio/') || false;
  };

  const isImageFile = (file: File | null): boolean => {
    return file?.type.startsWith('image/') || false;
  };

  const isVideoFile = (file: File | null): boolean => {
    return file?.type.startsWith('video/') || false;
  };

  // Extract audio duration
  const extractAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audio.src);
        resolve(audio.duration);
      };
      audio.onerror = () => resolve(0);
      audio.src = URL.createObjectURL(file);
    });
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Resize image to a smaller JPEG for AI analysis (avoids oversized payloads causing 502s)
  const resizeImageForAnalysis = (file: File, maxDim = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(img.src);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image for resize'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = (file: File) => {
    const validTypes = [
      // Video
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-m4v',
      // Image
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      // Audio
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/aac', 
      'audio/flac', 'audio/ogg', 'audio/mp4'
    ];
    
    // Check if file type is valid (allow both exact match and wildcard)
    const isValidType = validTypes.includes(file.type) || 
      file.type.startsWith('video/') || 
      file.type.startsWith('image/') || 
      file.type.startsWith('audio/');
    
    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please upload a video, image, or audio file",
        variant: "destructive",
      });
      return;
    }
    
    // Max 500MB for video/images, 100MB for audio
    const maxSize = file.type.startsWith('audio/') ? 100 * 1024 * 1024 : 
                    500 * 1024 * 1024;
    const maxSizeLabel = file.type.startsWith('audio/') ? '100MB' : '500MB';
    
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSizeLabel}`,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    setIsPodcast(false); // Reset podcast toggle
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
    setAnalysisComplete(false);
    setAiSuggestions(null);
    setBumperSkipSeconds(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Extract a frame from video for AI analysis
  const extractVideoFrame = async (file: File, skipSeconds: number = 0): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      video.onloadeddata = () => {
        // Use bumper skip offset, or fallback to 1s / 10% of duration
        const seekTime = skipSeconds > 0 
          ? Math.min(skipSeconds, video.duration - 0.1) 
          : Math.min(1, video.duration * 0.1);
        video.currentTime = Math.max(0, seekTime);
      };
      
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        URL.revokeObjectURL(video.src);
        resolve(dataUrl);
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // AI Analysis handler - supports video, image, and audio
  const handleAnalyzeMedia = async () => {
    if (!selectedFile) return;
    
    setIsAnalyzing(true);
    
    try {
      const fileType = getFileType(selectedFile);
      let mediaData: string | null = null;
      
      if (fileType === 'video') {
        // Extract a frame from the video, using bumper skip offset
        mediaData = await extractVideoFrame(selectedFile, bumperSkipSeconds);
      } else if (fileType === 'image') {
        // Resize image to ~1024px JPEG to avoid oversized payloads causing 502s
        mediaData = await resizeImageForAnalysis(selectedFile);
      }
      // For audio, we don't send visual data - just filename
      
      // Call the analyze-video-preview edge function
      const { data, error } = await supabase.functions.invoke('analyze-video-preview', {
        body: { 
          videoData: mediaData, // null for audio
          fileName: selectedFile.name,
          mediaType: fileType,
          isPodcast: fileType === 'audio' ? isPodcast : undefined
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        // For audio with podcast flag, add Podcast tag
        let tags = data.tags || [];
        if (fileType === 'audio' && isPodcast && !tags.includes('Podcast')) {
          tags = ['Podcast', ...tags];
        }
        
        // Populate form fields with AI suggestions
        setUploadData(prev => ({
          ...prev,
          tags: tags.join(', '),
          description: data.description
        }));
        setAiSuggestions({
          tags: tags,
          description: data.description,
          confidence: data.confidence,
          scene: data.scene,
          mood: data.mood
        });
        setAnalysisComplete(true);
        
        const mediaLabel = fileType === 'video' ? 'video' : fileType === 'audio' ? 'audio' : 'image';
        toast({
          title: "Analysis Complete",
          description: `AI analyzed your ${mediaLabel} with ${Math.round(data.confidence * 100)}% confidence`,
        });
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze media",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Keep old function name for backwards compatibility
  const handleAnalyzeVideo = handleAnalyzeMedia;

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile && !uploadData.url) {
      toast({
        title: "No media selected",
        description: "Please select a file or enter a URL",
        variant: "destructive",
      });
      return;
    }

    if (!uploadData.title) {
      toast({
        title: "Title required",
        description: "Please enter a title for the media",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      if (selectedFile) {
        const fileType = getFileType(selectedFile);
        const isVideo = fileType === 'video';
        const isAudio = fileType === 'audio';
        const isImage = fileType === 'image';
        
        // Stage 1: Extract dimensions and thumbnail (0-25%)
        setUploadProgress(5);
        
        // Extract media-specific metadata
        let dimensions = { width: 1920, height: 1080 };
        let thumbnailBase64: string | null = null;
        let mediaDuration: number = 0;
        
        if (isVideo) {
          // Extract dimensions, duration, and thumbnail from video
          // Use bumperSkipSeconds for thumbnail frame extraction too
          const videoData = await new Promise<{ width: number; height: number; thumbnail: string | null; duration: number }>((resolve) => {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.muted = true;
            
            video.onloadeddata = () => {
              // Use bumper skip offset for thumbnail
              const seekTime = bumperSkipSeconds > 0 
                ? Math.min(bumperSkipSeconds, video.duration - 0.1) 
                : Math.min(1, video.duration * 0.1);
              video.currentTime = Math.max(0, seekTime);
            };
            
            video.onseeked = () => {
              // Extract thumbnail frame
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(video, 0, 0);
              
              const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);
              const thumbnail = thumbnailDataUrl.split(',')[1];
              
              URL.revokeObjectURL(video.src);
              resolve({ 
                width: video.videoWidth, 
                height: video.videoHeight, 
                thumbnail,
                duration: video.duration
              });
            };
            
            video.onerror = () => {
              URL.revokeObjectURL(video.src);
              resolve({ width: 1920, height: 1080, thumbnail: null, duration: 0 });
            };
            
            video.src = URL.createObjectURL(selectedFile);
          });
          
          dimensions = { width: videoData.width, height: videoData.height };
          thumbnailBase64 = videoData.thumbnail;
          mediaDuration = videoData.duration;
          console.log('Extracted video dimensions:', dimensions, 'duration:', mediaDuration, 'thumbnail:', thumbnailBase64 ? 'yes' : 'no');
        } else if (isAudio) {
          // Extract audio duration
          mediaDuration = await extractAudioDuration(selectedFile);
          console.log('Extracted audio duration:', mediaDuration);
          // Audio has no visual dimensions
          dimensions = { width: 0, height: 0 };
        } else if (isImage) {
          // Extract image dimensions
          const imgData = await new Promise<{ width: number; height: number }>((resolve) => {
            const img = new Image();
            img.onload = () => {
              URL.revokeObjectURL(img.src);
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => {
              URL.revokeObjectURL(img.src);
              resolve({ width: 1920, height: 1080 });
            };
            img.src = URL.createObjectURL(selectedFile);
          });
          dimensions = imgData;
          console.log('Extracted image dimensions:', dimensions);
        }
        
        setUploadProgress(15);

        // Prepare tags - add Podcast tag for audio if flagged
        let finalTags = uploadData.tags.split(',').map(t => t.trim()).filter(Boolean);
        if (isAudio && isPodcast && !finalTags.includes('Podcast')) {
          finalTags = ['Podcast', ...finalTags];
        }

        const PRESIGNED_THRESHOLD = 4 * 1024 * 1024; // 4MB for all file types — base64 inflates ~33%, edge function has tight memory
        const usePresigned = selectedFile.size > PRESIGNED_THRESHOLD;

        if (usePresigned) {
          // === PRESIGNED URL FLOW for large files ===
          setUploadPhase('Preparing upload...');
          setUploadProgress(20);

          // Step 1: Get presigned URL
          const { data: presignData, error: presignError } = await supabase.functions.invoke('generate-presigned-upload-url', {
            body: {
              filename: selectedFile.name,
              mimeType: selectedFile.type,
              width: dimensions.width,
              height: dimensions.height,
            },
          });

          if (presignError || !presignData?.success) {
            throw new Error(presignError?.message || presignData?.error || 'Failed to get presigned URL');
          }

          // Step 2: Upload file directly to S3 with progress
          setUploadPhase('Uploading to S3...');
          setUploadProgress(25);

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', presignData.presignedUrl, true);
            xhr.setRequestHeader('Content-Type', selectedFile.type);

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const pct = 25 + (event.loaded / event.total) * 60; // 25-85%
                setUploadProgress(pct);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`S3 upload failed with status ${xhr.status}`));
              }
            };

            xhr.onerror = () => reject(new Error('Network error during S3 upload'));
            xhr.send(selectedFile);
          });

          // Step 3: Finalize metadata via edge function (no binary data)
          setUploadPhase('Finalizing...');
          setUploadProgress(88);

          const { data, error } = await supabase.functions.invoke('upload-master-to-s3', {
            body: {
              filename: selectedFile.name,
              mimeType: selectedFile.type,
              width: dimensions.width,
              height: dimensions.height,
              title: uploadData.title,
              description: uploadData.description,
              tags: finalTags,
              thumbnailBase64: thumbnailBase64,
              duration: (isVideo || isAudio) ? mediaDuration : undefined,
              isPodcast: isAudio ? isPodcast : undefined,
              // Finalize path fields
              s3Key: presignData.s3Key,
              cdnUrl: presignData.cdnUrl,
              masterId: presignData.masterId,
              fileSize: selectedFile.size,
            },
          });

          if (error) throw error;
        } else {
          // === TRADITIONAL BASE64 FLOW for smaller files ===
          setUploadPhase('Reading file...');
          
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onprogress = (event) => {
              if (event.lengthComputable) {
                const readProgress = (event.loaded / event.total) * 15;
                setUploadProgress(15 + readProgress);
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
          
          setUploadPhase('Uploading to S3...');
          setUploadProgress(35);
          
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
              imageBase64: base64Data,
              filename: selectedFile.name,
              mimeType: selectedFile.type,
              width: dimensions.width,
              height: dimensions.height,
              title: uploadData.title,
              description: uploadData.description,
              tags: finalTags,
              thumbnailBase64: thumbnailBase64,
              duration: (isVideo || isAudio) ? mediaDuration : undefined,
              isPodcast: isAudio ? isPodcast : undefined,
            },
          });
          
          clearInterval(progressInterval);
          if (error) throw error;
        }
        
        // Stage 3: Complete (100%)
        setUploadProgress(100);
        setUploadPhase('Complete!');
        
        const mediaLabel = isVideo ? 'Video' : isAudio ? 'Audio' : 'Image';
        toast({
          title: "Upload successful!",
          description: `${mediaLabel} has been uploaded and is being processed.`,
        });
        
        // Brief delay to show 100%
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear form
        setSelectedFile(null);
        setUploadData({ url: '', title: '', description: '', tags: '', keywords: '' });
        setUploadProgress(0);
        setUploadPhase('');
        
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

  const pageTitle = isGenerateMode ? 'Generate AI Image / Video' : 'Upload Media';
  const pageDescription = isGenerateMode 
    ? 'Create racing content with AI-powered image and video generation'
    : 'Add videos, images, or audio files to the WMC library';

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
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger 
                value="upload" 
                className="flex items-center gap-2"
                onClick={() => navigate('/admin/media/upload')}
              >
                <Upload className="w-4 h-4" />
                Upload Media
              </TabsTrigger>
              <TabsTrigger 
                value="bulk" 
                className="flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                Bulk Upload
              </TabsTrigger>
              <TabsTrigger 
                value="generate" 
                className="flex items-center gap-2"
                onClick={() => navigate('/admin/media/generate')}
              >
                <Sparkles className="w-4 h-4" />
                Generate AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-6">
              <Card>
                <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-primary" />
                    Upload Media Content
                  </CardTitle>
                  <CardDescription>
                    Upload videos, images, or audio files to the media library
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUploadSubmit} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="url"><Label htmlFor="url">Media URL (YouTube, Vimeo, etc.)</Label></Label>
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
                          accept="video/*,image/*,audio/*"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                        
                        {selectedFile ? (
                          <div className="space-y-2">
                            {/* Dynamic icon based on file type */}
                            {isVideoFile(selectedFile) && <FileVideo className="w-12 h-12 mx-auto text-primary" />}
                            {isImageFile(selectedFile) && <ImageIcon className="w-12 h-12 mx-auto text-primary" />}
                            {isAudioFile(selectedFile) && <Music className="w-12 h-12 mx-auto text-primary" />}
                            
                            <p className="text-foreground font-medium">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            
                            {/* Podcast toggle for audio files */}
                            {isAudioFile(selectedFile) && (
                              <div className="flex items-center justify-center gap-3 pt-2">
                                <Switch 
                                  checked={isPodcast} 
                                  onCheckedChange={setIsPodcast} 
                                  id="podcast-toggle"
                                />
                                <Label htmlFor="podcast-toggle" className="flex items-center gap-2 cursor-pointer">
                                  <Mic className="w-4 h-4" />
                                  This is a podcast episode
                                </Label>
                              </div>
                            )}
                            
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
                            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground mb-2">
                              {isDragOver ? 'Drop your file here' : 'Drag & drop video, image, or audio files'}
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                              Video up to 500MB • Audio up to 100MB • Images up to 500MB
                            </p>
                            <Button variant="outline" type="button" onClick={(e) => {
                              e.stopPropagation();
                              handleBrowseClick();
                            }}>
                              Browse Files
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Bumper Skip Slider - only for video files */}
                      {selectedFile && isVideoFile(selectedFile) && (
                        <div className="flex items-center gap-4 py-3 px-4 border border-muted-foreground/20 rounded-lg bg-muted/20">
                          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Skip intro (bumper)</span>
                              <span className="text-sm font-medium">{bumperSkipSeconds}s</span>
                            </div>
                            <Slider
                              value={[bumperSkipSeconds]}
                              onValueChange={([val]) => setBumperSkipSeconds(val)}
                              min={0}
                              max={30}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}

                      {/* AI Analysis Section */}
                      {selectedFile && !analysisComplete && (
                        <div className="flex items-center justify-center gap-4 py-4 px-6 border border-dashed border-muted-foreground/30 rounded-lg bg-muted/30">
                          <Wand2 className="w-5 h-5 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Want AI to suggest tags and description?
                          </span>
                          <Button 
                            type="button" 
                            variant="secondary"
                            onClick={handleAnalyzeVideo}
                            disabled={isAnalyzing}
                          >
                            {isAnalyzing ? (
                              <>
                                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Analyze with AI
                              </>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* AI Analysis Complete Badge */}
                      {analysisComplete && aiSuggestions && (
                        <Alert className="bg-green-500/10 border-green-500/30">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <AlertDescription className="flex items-center gap-2 flex-wrap">
                            <span>AI analysis complete</span>
                            <Badge variant="secondary" className="bg-green-500/20">
                              {Math.round(aiSuggestions.confidence * 100)}% confidence
                            </Badge>
                            {aiSuggestions.scene && (
                              <Badge variant="outline" className="text-xs">
                                Scene: {aiSuggestions.scene}
                              </Badge>
                            )}
                            {aiSuggestions.mood && (
                              <Badge variant="outline" className="text-xs">
                                Mood: {aiSuggestions.mood}
                              </Badge>
                            )}
                            <span className="text-muted-foreground text-sm">— Review and edit below</span>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="title" className="flex items-center gap-2">
                            Title
                          </Label>
                          <Input
                            id="title"
                            placeholder="Racing highlight reel..."
                            value={uploadData.title}
                            onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor="tags" className="flex items-center gap-2">
                            Tags
                            {analysisComplete && <Badge variant="secondary" className="text-xs">AI suggested</Badge>}
                          </Label>
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
                        <Label htmlFor="description" className="flex items-center gap-2">
                          Description
                          {analysisComplete && <Badge variant="secondary" className="text-xs">AI suggested</Badge>}
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Describe the media content..."
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
                            {uploadPhase || (uploadProgress < 30 ? 'Reading file...' : uploadProgress < 90 ? 'Uploading to S3...' : 'Finalizing...')}
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
                        'Upload & Process Media'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-6">
              <BulkUploadTab />
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
                          placeholder="Describe the content and context..."
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