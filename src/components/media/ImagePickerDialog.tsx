import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Search, Upload, Link, RefreshCw, Loader2, Check, X, 
  ImageIcon, Sparkles, Cloud
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface SelectedImage {
  id: string;
  url: string;
  title: string;
  source: 'library' | 'upload' | 'url';
  thumbnailUrl?: string;
}

interface LibraryImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  title: string;
  source: 'media_asset' | 'generated';
  sourceLabel: string;
  createdAt: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  url?: string;
  error?: string;
}

interface ImagePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImagesSelected: (images: SelectedImage[]) => void;
  maxImages?: number;
  title?: string;
}

export const ImagePickerDialog: React.FC<ImagePickerDialogProps> = ({
  isOpen,
  onClose,
  onImagesSelected,
  maxImages = 20,
  title = "Select Images",
}) => {
  const { toast } = useToast();
  
  // Library state
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state
  const [selectedImages, setSelectedImages] = useState<Map<string, SelectedImage>>(new Map());
  
  // Upload state
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [urlPreviews, setUrlPreviews] = useState<SelectedImage[]>([]);

  // Load library images
  const loadLibraryImages = useCallback(async () => {
    setIsLoadingLibrary(true);
    try {
      // Fetch from media_assets (images)
      const { data: mediaAssets, error: mediaError } = await supabase
        .from('media_assets')
        .select('id, title, file_url, thumbnail_url, source, asset_type, created_at')
        .in('asset_type', ['image', 'master_image', 'photo', 'image_variant', 'grid_variant'])
        .not('file_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (mediaError) throw mediaError;

      // Fetch from image_generations
      const { data: generations, error: genError } = await supabase
        .from('image_generations')
        .select('id, prompt, image_url, created_at')
        .eq('status', 'completed')
        .not('image_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (genError) throw genError;

      // Transform and merge results
      const mediaImages: LibraryImage[] = (mediaAssets || []).map(asset => ({
        id: `media-${asset.id}`,
        url: asset.file_url!,
        thumbnailUrl: asset.thumbnail_url || asset.file_url!,
        title: asset.title || 'Untitled',
        source: 'media_asset' as const,
        sourceLabel: asset.source === 's3_bucket' ? 'S3' : asset.source === 'salesforce' ? 'SFDC' : 'Upload',
        createdAt: asset.created_at,
      }));

      const genImages: LibraryImage[] = (generations || []).map(gen => ({
        id: `gen-${gen.id}`,
        url: gen.image_url!,
        thumbnailUrl: gen.image_url!,
        title: gen.prompt?.substring(0, 50) || 'AI Generated',
        source: 'generated' as const,
        sourceLabel: 'AI',
        createdAt: gen.created_at,
      }));

      // Merge and sort by date
      const allImages = [...mediaImages, ...genImages].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setLibraryImages(allImages);
    } catch (error) {
      console.error('Error loading library images:', error);
      toast({
        title: "Failed to load images",
        description: "Could not load images from the library",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [toast]);

  // Load images when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadLibraryImages();
      // Reset state
      setSelectedImages(new Map());
      setUploadingFiles([]);
      setUrlPreviews([]);
      setUrlInput('');
      setSearchQuery('');
    }
  }, [isOpen, loadLibraryImages]);

  // Filter library images by search
  const filteredImages = libraryImages.filter(img =>
    img.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Toggle image selection
  const toggleSelection = (image: SelectedImage) => {
    setSelectedImages(prev => {
      const newMap = new Map(prev);
      if (newMap.has(image.id)) {
        newMap.delete(image.id);
      } else if (newMap.size < maxImages) {
        newMap.set(image.id, image);
      } else {
        toast({
          title: "Maximum reached",
          description: `You can select up to ${maxImages} images`,
          variant: "destructive",
        });
      }
      return newMap;
    });
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast({
        title: "No images",
        description: "Please select image files",
        variant: "destructive",
      });
      return;
    }

    // Create upload entries
    const newUploads: UploadingFile[] = imageFiles.map((file, idx) => ({
      id: `upload-${Date.now()}-${idx}`,
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Upload each file
    for (const upload of newUploads) {
      try {
        // Convert to base64
        const base64 = await fileToBase64(upload.file);
        
        const { data, error } = await supabase.functions.invoke('upload-generation-input', {
          body: {
            base64Image: base64,
            fileName: upload.file.name,
            contentType: upload.file.type,
          },
        });

        if (error) throw error;
        if (!data?.url) throw new Error('No URL returned');

        // Update upload status
        setUploadingFiles(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'completed', progress: 100, url: data.url }
            : u
        ));

        // Auto-select uploaded image
        const selectedImage: SelectedImage = {
          id: upload.id,
          url: data.url,
          title: upload.file.name,
          source: 'upload',
        };
        
        setSelectedImages(prev => {
          if (prev.size < maxImages) {
            const newMap = new Map(prev);
            newMap.set(upload.id, selectedImage);
            return newMap;
          }
          return prev;
        });

      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev => prev.map(u => 
          u.id === upload.id 
            ? { ...u, status: 'failed', error: error instanceof Error ? error.message : 'Upload failed' }
            : u
        ));
      }
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Handle URL add
  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;

    if (!/^https?:\/\//i.test(url)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid http(s) URL",
        variant: "destructive",
      });
      return;
    }

    const newImage: SelectedImage = {
      id: `url-${Date.now()}`,
      url,
      title: url.split('/').pop() || 'URL Image',
      source: 'url',
    };

    setUrlPreviews(prev => [...prev, newImage]);
    setSelectedImages(prev => {
      if (prev.size < maxImages) {
        const newMap = new Map(prev);
        newMap.set(newImage.id, newImage);
        return newMap;
      }
      return prev;
    });
    setUrlInput('');
  };

  // Remove URL preview
  const handleRemoveUrlPreview = (id: string) => {
    setUrlPreviews(prev => prev.filter(p => p.id !== id));
    setSelectedImages(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  // Handle confirm
  const handleConfirm = () => {
    const images = Array.from(selectedImages.values());
    onImagesSelected(images);
    onClose();
  };

  const selectedCount = selectedImages.size;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="library" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              URL
            </TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search images..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={loadLibraryImages}
                disabled={isLoadingLibrary}
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              {isLoadingLibrary ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                  <p>No images found</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 pr-4">
                  {filteredImages.map((img) => {
                    const isSelected = selectedImages.has(img.id);
                    return (
                      <div
                        key={img.id}
                        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-muted-foreground/30'
                        }`}
                        onClick={() => toggleSelection({
                          id: img.id,
                          url: img.url,
                          title: img.title,
                          source: 'library',
                          thumbnailUrl: img.thumbnailUrl,
                        })}
                      >
                        <div className="aspect-square relative bg-muted">
                          <img
                            src={img.thumbnailUrl || img.url}
                            alt={img.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/placeholder.svg';
                            }}
                          />
                          
                          {/* Selection indicator */}
                          <div className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/80 border border-muted-foreground/30'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>

                          {/* Source badge */}
                          <Badge 
                            variant="secondary" 
                            className="absolute bottom-1 right-1 text-[10px] px-1 py-0"
                          >
                            {img.source === 'generated' ? (
                              <Sparkles className="w-3 h-3 mr-0.5" />
                            ) : null}
                            {img.sourceLabel}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 mt-4">
            <div
              className={`flex-1 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadingFiles.length === 0 ? (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Drop images here</p>
                  <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.multiple = true;
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) handleFileUpload(files);
                      };
                      input.click();
                    }}
                  >
                    Select Files
                  </Button>
                </>
              ) : (
                <ScrollArea className="w-full h-full p-4">
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {uploadingFiles.map((upload) => (
                      <div key={upload.id} className="relative rounded-lg overflow-hidden border bg-muted">
                        <div className="aspect-square relative">
                          {upload.url ? (
                            <img
                              src={upload.url}
                              alt={upload.file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          
                          {upload.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                              <Progress value={upload.progress} className="w-3/4 mt-2 h-1" />
                            </div>
                          )}
                          
                          {upload.status === 'completed' && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          
                          {upload.status === 'failed' && (
                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                              <X className="w-6 h-6 text-red-500" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs p-1 truncate">{upload.file.name}</p>
                      </div>
                    ))}
                    
                    {/* Add more button */}
                    <div
                      className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = 'image/*';
                        input.onchange = (e) => {
                          const files = (e.target as HTMLInputElement).files;
                          if (files) handleFileUpload(files);
                        };
                        input.click();
                      }}
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>

          {/* URL Tab */}
          <TabsContent value="url" className="flex-1 flex flex-col min-h-0 mt-4">
            <form
              className="flex gap-2 mb-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddUrl();
              }}
            >
              <Input
                placeholder="Paste image URL (https://...)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={!urlInput.trim()}>
                Add
              </Button>
            </form>

            {urlPreviews.length > 0 ? (
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {urlPreviews.map((preview) => (
                    <div key={preview.id} className="relative rounded-lg overflow-hidden border bg-muted group">
                      <div className="aspect-square relative">
                        <img
                          src={preview.url}
                          alt={preview.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveUrlPreview(preview.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <Link className="w-12 h-12 mb-3 opacity-50" />
                <p>Paste image URLs above to add them</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedCount} image{selectedCount !== 1 ? 's' : ''} selected
            {maxImages && ` (max ${maxImages})`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedCount === 0}>
              Add {selectedCount > 0 ? `${selectedCount} Image${selectedCount !== 1 ? 's' : ''}` : 'Selected'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
