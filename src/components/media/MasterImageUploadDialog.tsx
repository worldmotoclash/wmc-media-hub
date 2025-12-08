import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, ImageIcon, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MasterImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (asset: { id: string; url: string; title: string }) => void;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error("Failed to load image"));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
};

export function MasterImageUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: MasterImageUploadDialogProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 20MB.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFile = (file: File) => {
    if (!validateFile(file)) return;
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadProgress("Getting image dimensions...");
    
    try {
      // Get image dimensions
      const dimensions = await getImageDimensions(selectedFile);
      
      setUploadProgress("Uploading to storage...");
      
      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `master-images/${timestamp}-${sanitizedName}`;
      
      // Upload to Supabase Storage (master-images bucket)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("master-images")
        .upload(filePath, selectedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        // If bucket doesn't exist, show helpful message
        if (uploadError.message.includes("Bucket not found")) {
          throw new Error("Storage bucket 'master-images' not found. Please create it in Supabase Dashboard > Storage.");
        }
        throw uploadError;
      }

      setUploadProgress("Getting public URL...");
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("master-images")
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;
      
      setUploadProgress("Creating media asset record...");
      
      // Insert into media_assets table (source must be a valid enum value)
      const { data: assetData, error: assetError } = await supabase
        .from("media_assets")
        .insert({
          title: selectedFile.name.replace(/\.[^/.]+$/, ""), // Remove extension
          file_url: publicUrl,
          thumbnail_url: publicUrl,
          source: "local_upload" as const, // Valid enum value
          status: "ready",
          file_format: selectedFile.name.split(".").pop()?.toLowerCase() || "jpg",
          file_size: selectedFile.size,
          metadata: {
            width: dimensions.width,
            height: dimensions.height,
            originalName: selectedFile.name,
            mimeType: selectedFile.type,
            uploadedAt: new Date().toISOString(),
            isMasterImage: true,
          },
        })
        .select()
        .single();

      if (assetError) {
        console.error("Failed to create asset record:", assetError);
        throw new Error("Failed to create media asset record");
      }

      toast({
        title: "Upload complete",
        description: `"${assetData.title}" has been uploaded successfully.`,
      });

      onUploadComplete?.({
        id: assetData.id,
        url: publicUrl,
        title: assetData.title,
      });

      handleClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress("");
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    setIsDragging(false);
    setUploadProgress("");
    onOpenChange(false);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Master Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!preview ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                {isDragging ? "Drop your image here" : "Drag and drop an image"}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports JPG, PNG, WebP (max 20MB)
              </p>
            </div>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full aspect-video object-contain rounded-lg bg-muted"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelection();
                }}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
              <p className="mt-2 text-sm text-muted-foreground truncate">
                {selectedFile?.name}
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploadProgress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {uploadProgress}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Upload Image"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}