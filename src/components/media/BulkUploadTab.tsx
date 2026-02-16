import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, X, CheckCircle2, AlertCircle, FileVideo, Image as ImageIcon, Music, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";

interface QueuedFile {
  file: File;
  id: string;
  status: 'queued' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

const MAX_CONCURRENCY = 3;

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'tiff', 'bmp', 'svg'];
const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'm4v', 'flv'];
const audioExtensions = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac', 'wma'];
const allExtensions = [...imageExtensions, ...videoExtensions, ...audioExtensions];

const getExtension = (name: string) => name.split('.').pop()?.toLowerCase() || '';

const isValidMedia = (f: File) => {
  if (f.type && ['video/', 'image/', 'audio/'].some(t => f.type.startsWith(t))) return true;
  return allExtensions.includes(getExtension(f.name));
};

const getFileIcon = (file: File) => {
  const ext = getExtension(file.name);
  if (file.type.startsWith('video/') || videoExtensions.includes(ext)) return <FileVideo className="w-4 h-4 text-blue-500" />;
  if (file.type.startsWith('audio/') || audioExtensions.includes(ext)) return <Music className="w-4 h-4 text-orange-500" />;
  return <ImageIcon className="w-4 h-4 text-green-500" />;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const BulkUploadTab: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [sharedTags, setSharedTags] = useState('');
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [albumId, setAlbumId] = useState<string | null>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: QueuedFile[] = Array.from(files)
      .filter(isValidMedia)
      .map(f => ({
        file: f,
        id: crypto.randomUUID(),
        status: 'queued' as const,
        progress: 0,
      }));

    if (newFiles.length === 0) {
      toast({ title: "No valid files", description: "Only images, videos, and audio files are supported", variant: "destructive" });
      return;
    }

    setQueue(prev => [...prev, ...newFiles]);
  }, [toast]);

  const removeFile = (id: string) => {
    setQueue(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
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

    console.log('Drop event:', {
      filesCount: e.dataTransfer.files?.length,
      itemsCount: e.dataTransfer.items?.length,
      types: Array.from(e.dataTransfer.types),
    });

    // Try dataTransfer.files first (standard browsers)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
      return;
    }

    // Fallback: extract from dataTransfer.items (Image Capture / promised files)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const files: File[] = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        addFiles(files);
      }
    }
  };

  const uploadSingleFile = async (qf: QueuedFile, createdAlbumId: string, tagsList: string[]): Promise<boolean> => {
    const file = qf.file;
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    // Update status
    setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: 'uploading' as const, progress: 10 } : f));

    try {
      // Step 1: Get presigned URL
      const { data: presignData, error: presignError } = await supabase.functions.invoke('generate-presigned-upload-url', {
        body: { filename: file.name, mimeType: file.type, width: 0, height: 0 },
      });

      if (presignError || !presignData?.success) throw new Error('Failed to get presigned URL');

      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, progress: 20 } : f));

      // Step 2: Upload to S3
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignData.presignedUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = 20 + (event.loaded / event.total) * 60;
            setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, progress: pct } : f));
          }
        };

        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(file);
      });

      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, progress: 85 } : f));

      // Step 3: Finalize metadata
      const title = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      const { error } = await supabase.functions.invoke('upload-master-to-s3', {
        body: {
          filename: file.name,
          mimeType: file.type,
          width: 0,
          height: 0,
          title,
          tags: tagsList,
          s3Key: presignData.s3Key,
          cdnUrl: presignData.cdnUrl,
          masterId: presignData.masterId,
          fileSize: file.size,
          albumId: createdAlbumId,
        },
      });

      if (error) throw error;

      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, progress: 95 } : f));

      // Step 4: Fire auto-tag in background (don't await)
      supabase.functions.invoke('auto-tag-media-asset', {
        body: {
          assetId: presignData.masterId,
          mediaUrl: presignData.cdnUrl,
          mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        },
      }).catch(() => {}); // fire and forget

      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: 'done' as const, progress: 100 } : f));
      return true;
    } catch (err: any) {
      console.error(`Upload error for ${file.name}:`, err);
      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: 'error' as const, error: err.message } : f));
      return false;
    }
  };

  const handleUploadAll = async () => {
    if (!albumName.trim()) {
      toast({ title: "Album name required", description: "Please name your album before uploading", variant: "destructive" });
      return;
    }
    if (queue.length === 0) {
      toast({ title: "No files", description: "Add files to the queue first", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    setCompletedCount(0);
    setUploadDone(false);

    try {
      // Create album
      const { data: album, error: albumError } = await supabase
        .from('media_albums')
        .insert({
          name: albumName.trim(),
          description: albumDescription.trim() || null,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (albumError) throw new Error(`Failed to create album: ${albumError.message}`);
      
      const createdAlbumId = album.id;
      setAlbumId(createdAlbumId);

      // Add album name as a tag automatically
      const tagsList = [albumName.trim(), ...sharedTags.split(',').map(t => t.trim()).filter(Boolean)];

      // Process queue with concurrency limit
      let completed = 0;
      const pending = [...queue];

      const processNext = async (): Promise<void> => {
        const next = pending.shift();
        if (!next) return;

        const success = await uploadSingleFile(next, createdAlbumId, tagsList);
        if (success) completed++;
        setCompletedCount(prev => prev + 1);
        await processNext();
      };

      // Start MAX_CONCURRENCY workers
      const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, pending.length) }, () => processNext());
      await Promise.all(workers);

      // Update album asset count
      await supabase
        .from('media_albums')
        .update({ asset_count: completed })
        .eq('id', createdAlbumId);

      // Set cover image from first successful asset
      const firstDone = queue.find(f => f.status === 'done');
      if (firstDone) {
        // Cover image will be set by the CDN URL from the first upload — skip for simplicity
      }

      setUploadDone(true);
      toast({
        title: "Bulk upload complete!",
        description: `${completed} of ${queue.length} files uploaded to "${albumName}"`,
      });
    } catch (err: any) {
      console.error('Bulk upload error:', err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const overallProgress = queue.length > 0 ? (completedCount / queue.length) * 100 : 0;
  const doneCount = queue.filter(f => f.status === 'done').length;
  const errorCount = queue.filter(f => f.status === 'error').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          Bulk Upload to Album
        </CardTitle>
        <CardDescription>
          Drag and drop multiple files from Image Capture, Finder, or your Camera Roll. Name the batch as an album.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Album Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="album-name">Album Name *</Label>
            <Input
              id="album-name"
              placeholder="e.g. Sonoma Raceway March 2025"
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              disabled={isUploading}
            />
          </div>
          <div>
            <Label htmlFor="shared-tags">Shared Tags (comma separated)</Label>
            <Input
              id="shared-tags"
              placeholder="e.g. race, sonoma, 2025"
              value={sharedTags}
              onChange={(e) => setSharedTags(e.target.value)}
              disabled={isUploading}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="album-desc">Description (optional)</Label>
          <Textarea
            id="album-desc"
            placeholder="Notes about this collection..."
            value={albumDescription}
            onChange={(e) => setAlbumDescription(e.target.value)}
            disabled={isUploading}
            rows={2}
          />
        </div>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-lg font-medium">Drop files here or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">
            Supports images, videos, and audio — select as many as you want
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* File Queue */}
        {queue.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{queue.length} file{queue.length !== 1 ? 's' : ''} queued</span>
              {!isUploading && (
                <Button variant="ghost" size="sm" onClick={() => setQueue([])}>
                  Clear All
                </Button>
              )}
            </div>

            {/* Overall progress */}
            {isUploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{completedCount} of {queue.length} complete</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-3" />
              </div>
            )}

            {/* File list */}
            <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-2">
              {queue.map((qf) => (
                <div key={qf.id} className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50">
                  {getFileIcon(qf.file)}
                  <span className="text-sm flex-1 truncate">{qf.file.name}</span>
                  <span className="text-xs text-muted-foreground w-16 text-right">{formatSize(qf.file.size)}</span>
                  {qf.status === 'queued' && !isUploading && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(qf.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                  {qf.status === 'uploading' && (
                    <span className="text-xs text-primary font-medium w-12 text-right">{Math.round(qf.progress)}%</span>
                  )}
                  {qf.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {qf.status === 'error' && (
                    <span title={qf.error}><AlertCircle className="w-4 h-4 text-destructive" /></span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload button */}
        {queue.length > 0 && !uploadDone && (
          <Button
            className="w-full sticky bottom-4"
            size="lg"
            onClick={handleUploadAll}
            disabled={isUploading || !albumName.trim()}
          >
            {isUploading ? (
              <>Uploading {completedCount}/{queue.length}...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload All {queue.length} Files
              </>
            )}
          </Button>
        )}

        {/* Completion summary */}
        {uploadDone && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
            <p className="font-medium">
              {doneCount} file{doneCount !== 1 ? 's' : ''} uploaded to "{albumName}"
              {errorCount > 0 && <span className="text-destructive"> ({errorCount} failed)</span>}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/admin/media/library')}>
                View in Library
              </Button>
              <Button variant="outline" onClick={() => {
                setQueue([]);
                setAlbumName('');
                setAlbumDescription('');
                setSharedTags('');
                setUploadDone(false);
                setAlbumId(null);
                setCompletedCount(0);
              }}>
                Upload More
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkUploadTab;
