import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Link, Loader2, ImageIcon, FolderOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImageDropzoneProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
}

interface LibraryImage {
  id: string;
  url: string;
  title?: string;
  created_at: string;
  source: 'generated' | 'media_asset';
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// Convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  value,
  onChange,
  label,
  description,
  required = false,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [inputMode, setInputMode] = useState<'upload' | 'url' | 'library'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load library images when Library tab is selected
  const loadLibraryImages = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      const images: LibraryImage[] = [];

      // Fetch from image_generations (generated images)
      const { data: generatedImages, error: genError } = await supabase
        .from('image_generations')
        .select('id, image_url, prompt, created_at')
        .eq('status', 'completed')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!genError && generatedImages) {
        images.push(...generatedImages.map(img => ({
          id: img.id,
          url: img.image_url!,
          title: img.prompt?.substring(0, 50) + (img.prompt && img.prompt.length > 50 ? '...' : ''),
          created_at: img.created_at,
          source: 'generated' as const
        })));
      }

      // Fetch from media_assets (S3/SFDC images)
      const { data: mediaAssets, error: mediaError } = await supabase
        .from('media_assets')
        .select('id, file_url, title, created_at')
        .in('asset_type', ['image', 'photo', 'master'])
        .not('file_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!mediaError && mediaAssets) {
        images.push(...mediaAssets.map(asset => ({
          id: asset.id,
          url: asset.file_url!,
          title: asset.title,
          created_at: asset.created_at,
          source: 'media_asset' as const
        })));
      }

      // Sort all by created_at descending
      images.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setLibraryImages(images);
    } catch (error) {
      console.error('Error loading library images:', error);
      toast.error('Failed to load library images');
    } finally {
      setIsLoadingLibrary(false);
    }
  }, []);

  useEffect(() => {
    if (inputMode === 'library') {
      loadLibraryImages();
    }
  }, [inputMode, loadLibraryImages]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please use JPG, PNG, or WEBP.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File too large. Maximum size is ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleUpload = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Convert file to base64
      setUploadProgress(10);
      const imageBase64 = await fileToBase64(file);
      setUploadProgress(30);

      // Upload via edge function to Wasabi S3
      const { data, error: fnError } = await supabase.functions.invoke('upload-generation-input', {
        body: {
          imageBase64,
          filename: file.name,
          mimeType: file.type,
        },
      });

      setUploadProgress(90);

      if (fnError) {
        console.error('Upload error:', fnError);
        toast.error('Upload failed: ' + fnError.message);
        return;
      }

      if (!data?.success || !data?.cdnUrl) {
        console.error('Upload failed:', data?.error);
        toast.error('Upload failed: ' + (data?.error || 'Unknown error'));
        return;
      }

      setUploadProgress(100);
      onChange(data.cdnUrl);
      toast.success('Image uploaded successfully');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }, [disabled, isUploading, handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleUpload]);

  const handleUrlSubmit = useCallback(() => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      toast.success('Image URL added');
    }
  }, [urlInput, onChange]);

  const handleRemove = useCallback(() => {
    onChange('');
  }, [onChange]);

  const handleLibrarySelect = useCallback((url: string) => {
    onChange(url);
    toast.success('Image selected from library');
  }, [onChange]);

  return (
    <div className="space-y-3">
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      {value ? (
        // Preview mode
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted/30">
          <img 
            src={value} 
            alt="Selected image" 
            className="w-full h-40 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        // Input mode
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'upload' | 'url' | 'library')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="upload" className="text-xs" disabled={disabled || isUploading}>
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="text-xs" disabled={disabled || isUploading}>
              <Link className="w-3 h-3 mr-1" />
              URL
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs" disabled={disabled || isUploading}>
              <FolderOpen className="w-3 h-3 mr-1" />
              Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                isDragging && "border-primary bg-primary/10",
                (disabled || isUploading) && "opacity-50 cursor-not-allowed",
                !isDragging && "border-border"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || isUploading}
              />

              {isUploading ? (
                <div className="space-y-2">
                  <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading... {uploadProgress}%</p>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={cn(
                    "w-10 h-10 mx-auto rounded-full flex items-center justify-center",
                    isDragging ? "bg-primary/20" : "bg-muted"
                  )}>
                    <ImageIcon className={cn(
                      "w-5 h-5",
                      isDragging ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isDragging ? 'Drop image here' : 'Drag & drop or click'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, WEBP up to {MAX_SIZE_MB}MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-2">
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="Paste image URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
                className="text-sm flex-1"
                disabled={disabled}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleUrlSubmit}
                disabled={disabled || !urlInput.trim()}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Supports: JPG, PNG, WEBP URLs
            </p>
          </TabsContent>

          <TabsContent value="library" className="mt-2">
            <div className="border border-border rounded-lg">
              <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  {libraryImages.length} images available
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={loadLibraryImages}
                  disabled={isLoadingLibrary}
                  className="h-6 px-2"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoadingLibrary && "animate-spin")} />
                </Button>
              </div>

              {isLoadingLibrary ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : libraryImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FolderOpen className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No images in library</p>
                  <p className="text-xs text-muted-foreground">Generate images or upload to S3</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="grid grid-cols-3 gap-2 p-2">
                    {libraryImages.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => handleLibrarySelect(img.url)}
                        className="relative aspect-square rounded-md overflow-hidden border border-border hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all group"
                      >
                        <img
                          src={img.url}
                          alt={img.title || 'Library image'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                          <span className="text-[10px] text-white truncate w-full">
                            {img.title || 'Generated'}
                          </span>
                        </div>
                        <div className="absolute top-1 right-1">
                          <span className={cn(
                            "text-[8px] px-1 py-0.5 rounded",
                            img.source === 'generated' ? "bg-purple-500/80 text-white" : "bg-blue-500/80 text-white"
                          )}>
                            {img.source === 'generated' ? 'AI' : 'S3'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default ImageDropzone;
