import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ImageIcon, X, Loader2, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { ContentCatalogForm } from "./ContentCatalogForm";
import { ContentCatalogFields } from "@/constants/salesforceFields";
import { convertHeicIfNeeded } from "@/utils/heicConvert";

interface MasterImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (asset: { id: string; url: string; title: string; masterId: string; salesforceId?: string }) => void;
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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

export function MasterImageUploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: MasterImageUploadDialogProps) {
  const { user } = useUser();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catalogFields, setCatalogFields] = useState<ContentCatalogFields | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'Pending' | 'Approved' | 'Rejected' | 'Restricted'>('Pending');

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
    if (file.size > 500 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 500MB.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleFile = async (rawFile: File) => {
    let file: File;
    try {
      file = await convertHeicIfNeeded(rawFile);
    } catch {
      return;
    }
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
      
      // Generate a small thumbnail for grid performance
      let thumbnailBase64: string | null = null;
      try {
        const { generateImageThumbnail } = await import('@/utils/generateImageThumbnail');
        thumbnailBase64 = await generateImageThumbnail(selectedFile);
        console.log('Generated image thumbnail for upload');
      } catch (e) {
        console.warn('Thumbnail generation failed:', e);
      }

      const PRESIGNED_THRESHOLD = 4 * 1024 * 1024; // 4MB — base64 inflates ~33%, edge function has tight memory
      const usePresigned = selectedFile.size > PRESIGNED_THRESHOLD;

      if (usePresigned) {
        // === PRESIGNED URL FLOW for large images ===
        setUploadProgress("Preparing upload...");

        const { data: presignData, error: presignError } = await supabase.functions.invoke("generate-presigned-upload-url", {
          body: {
            filename: selectedFile.name,
            mimeType: selectedFile.type,
            width: dimensions.width,
            height: dimensions.height,
          },
        });

        if (presignError || !presignData?.success) {
          throw new Error(presignError?.message || presignData?.error || "Failed to get presigned URL");
        }

        setUploadProgress("Uploading to Wasabi S3...");

        // Upload directly to S3
        const xhr = await new Promise<void>((resolve, reject) => {
          const x = new XMLHttpRequest();
          x.open("PUT", presignData.presignedUrl, true);
          x.setRequestHeader("Content-Type", selectedFile!.type);
          x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`S3 upload failed: ${x.status}`)));
          x.onerror = () => reject(new Error("Network error during S3 upload"));
          x.send(selectedFile);
        });

        setUploadProgress("Finalizing...");

        // Finalize metadata (no binary payload)
        const { data, error } = await supabase.functions.invoke("upload-master-to-s3", {
          body: {
            filename: selectedFile.name,
            mimeType: selectedFile.type,
            width: dimensions.width,
            height: dimensions.height,
            title: catalogFields?.naturalName || selectedFile.name.replace(/\.[^/.]+$/, ""),
            creatorContactId: user?.id,
            salesforceFields: catalogFields ? {
              domain: catalogFields.domain,
              eventCode: catalogFields.eventCode,
              raceTrackCode: catalogFields.raceTrackCode,
              contentClass: catalogFields.contentClass,
              scene: catalogFields.scene,
              contentType: catalogFields.contentType,
              generationMethod: catalogFields.generationMethod,
              aspectRatio: catalogFields.aspectRatio,
              version: catalogFields.version,
              eventDate: catalogFields.eventDate,
            } : undefined,
            thumbnailBase64,
            s3Key: presignData.s3Key,
            cdnUrl: presignData.cdnUrl,
            masterId: presignData.masterId,
            fileSize: selectedFile.size,
            approvalStatus,
          },
        });

        if (error) throw new Error(error.message || "Upload failed");
        if (!data.success) throw new Error(data.error || "Upload failed");

        setUploadProgress("Upload complete!");

        toast({ title: "Upload complete", description: "Master image uploaded to S3 successfully." });

        onUploadComplete?.({
          id: data.assetId,
          url: data.s3Url,
          title: selectedFile.name.replace(/\.[^/.]+$/, ""),
          masterId: data.masterId,
          salesforceId: data.salesforceId,
        });
      } else {
        // === TRADITIONAL BASE64 FLOW for small images ===
        setUploadProgress("Converting image...");
        const imageBase64 = await fileToBase64(selectedFile);
        
        setUploadProgress("Uploading to Wasabi S3...");
        
        const { data, error } = await supabase.functions.invoke("upload-master-to-s3", {
          body: {
            imageBase64,
            filename: selectedFile.name,
            mimeType: selectedFile.type,
            width: dimensions.width,
            height: dimensions.height,
            title: catalogFields?.naturalName || selectedFile.name.replace(/\.[^/.]+$/, ""),
            creatorContactId: user?.id,
            thumbnailBase64,
            salesforceFields: catalogFields ? {
              domain: catalogFields.domain,
              eventCode: catalogFields.eventCode,
              raceTrackCode: catalogFields.raceTrackCode,
              contentClass: catalogFields.contentClass,
              scene: catalogFields.scene,
              contentType: catalogFields.contentType,
              generationMethod: catalogFields.generationMethod,
              aspectRatio: catalogFields.aspectRatio,
              version: catalogFields.version,
              eventDate: catalogFields.eventDate,
            } : undefined,
            approvalStatus,
          },
        });

        if (error) throw new Error(error.message || "Upload failed");
        if (!data.success) throw new Error(data.error || "Upload failed");

        setUploadProgress("Upload complete!");

        toast({ title: "Upload complete", description: "Master image uploaded to S3 successfully." });

        onUploadComplete?.({
          id: data.assetId,
          url: data.s3Url,
          title: selectedFile.name.replace(/\.[^/.]+$/, ""),
          masterId: data.masterId,
          salesforceId: data.salesforceId,
        });
      }

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
    setCatalogFields(null);
    setApprovalStatus('Pending');
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
            <Cloud className="h-5 w-5 text-primary" />
            Upload Master Image to S3
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
              <p className="text-xs text-primary mt-2">
                Uploads directly to Wasabi S3
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
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

              {/* Content Catalog Form */}
              <ContentCatalogForm
                context="image-upload"
                compact
                initialValues={{
                  naturalName: selectedFile?.name.replace(/\.[^/.]+$/, "") || "",
                }}
                autoDetectContentType="image"
                onFieldChange={setCatalogFields}
              />

              {/* Approval Status */}
              <div className="space-y-1.5">
                <Label htmlFor="approval-status" className="text-sm">Approval Status</Label>
                <Select value={approvalStatus} onValueChange={(v) => setApprovalStatus(v as typeof approvalStatus)} disabled={isUploading}>
                  <SelectTrigger id="approval-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Restricted">Restricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
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
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload to S3
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
