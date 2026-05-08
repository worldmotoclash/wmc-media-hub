import React, { useState, useRef, useCallback, useEffect, useId } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, X, CheckCircle2, AlertCircle, FileVideo, Image as ImageIcon, Music, Layers, Camera, Info, TriangleAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { sanitizeFile } from "@/utils/sanitizeFilename";
import { convertHeicBatch } from "@/utils/heicConvert";

interface ExistingAlbum {
  id: string;
  name: string;
  asset_count: number;
}

interface QueuedFile {
  file: File;
  id: string;
  status: 'queued' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
  assetId?: string;
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

const ACCEPT_MIME = "image/jpeg,image/png,image/heic,image/heif,image/webp,video/mp4,video/quicktime,audio/mpeg,audio/mp4,audio/wav";

export const BulkUploadTab: React.FC = () => {
  const { user } = useUser();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uniqueId = useId();
  const inputId = `bulk-upload-${uniqueId}`;

  const [albumMode, setAlbumMode] = useState<'new' | 'existing'>('new');
  const [albumName, setAlbumName] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [sharedTags, setSharedTags] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'Pending' | 'Approved' | 'Rejected' | 'Restricted'>('Pending');
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [existingAlbums, setExistingAlbums] = useState<ExistingAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

  // Fetch existing albums with real asset counts, hiding empty ones
  const fetchAlbums = useCallback(async () => {
    const { data: allAlbums } = await supabase
      .from('media_albums')
      .select('id, name, asset_count')
      .order('created_at', { ascending: false });

    const { data: assetRows } = await supabase
      .from('media_assets')
      .select('album_id')
      .not('album_id', 'is', null);

    const countMap = new Map<string, number>();
    (assetRows || []).forEach(row => {
      if (row.album_id) {
        countMap.set(row.album_id, (countMap.get(row.album_id) || 0) + 1);
      }
    });

    const activeAlbums = (allAlbums || [])
      .map(a => ({ ...a, asset_count: countMap.get(a.id) || 0 }))
      .filter(a => a.asset_count > 0);

    activeAlbums.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
    if (activeAlbums) setExistingAlbums(activeAlbums);
  }, []);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  // CRITICAL: Prevent browser default drag behavior at document level.
  // Without this, macOS shows red "not allowed" cursor for external app drops (Image Capture).
  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('dragover', preventDefaults);
    document.addEventListener('drop', preventDefaults);
    return () => {
      document.removeEventListener('dragover', preventDefaults);
      document.removeEventListener('drop', preventDefaults);
    };
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    // Convert any HEIC/HEIF iPhone photos to JPEG before anything else touches them.
    const converted = await convertHeicBatch(Array.from(files));

    // Sanitize filenames up front so reserved characters (":", "*", "?", "#")
    // never enter Wasabi keys, S3 metadata, or DB titles.
    const sanitized: { file: File; original: string; changed: boolean }[] = converted
      .filter(isValidMedia)
      .map((f) => sanitizeFile(f));

    const renamed = sanitized.filter((s) => s.changed);
    if (renamed.length > 0) {
      const sample = renamed.slice(0, 3)
        .map((s) => `"${s.original}" → "${s.file.name}"`).join(', ');
      const extra = renamed.length > 3 ? ` (+${renamed.length - 3} more)` : '';
      toast({
        title: `${renamed.length} filename${renamed.length > 1 ? 's' : ''} adjusted`,
        description: `Wasabi can't serve ":", "*", "?" or "#". Renamed: ${sample}${extra}`,
      });
    }

    const newFiles: QueuedFile[] = sanitized.map((s) => ({
      file: s.file,
      id: crypto.randomUUID(),
      status: 'queued' as const,
      progress: 0,
    }));

    if (newFiles.length === 0) {
      toast({ title: "No valid files", description: "Only images, videos, and audio files are supported", variant: "destructive" });
      return;
    }

    // Large file warnings
    const warnThreshold = isMobile ? 50 * 1024 * 1024 : 200 * 1024 * 1024;
    const largeFiles = newFiles.filter(f => f.file.size > warnThreshold);
    if (largeFiles.length > 0) {
      const names = largeFiles.slice(0, 3).map(f => `${f.file.name} (${formatSize(f.file.size)})`).join(', ');
      const extra = largeFiles.length > 3 ? ` and ${largeFiles.length - 3} more` : '';
      toast({
        title: `${largeFiles.length} large file${largeFiles.length > 1 ? 's' : ''} detected`,
        description: `${names}${extra}. These may take a while to upload.${isMobile ? ' Consider AirDropping to a laptop for faster uploads.' : ''}`,
      });
    }

    setQueue(prev => [...prev, ...newFiles]);
  }, [toast, isMobile]);

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

    // Try dataTransfer.files first (standard browsers)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
      return;
    }

    // Fallback: extract from dataTransfer.items
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
    const isImage = file.type.startsWith('image/');

    // Update status
    setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: 'uploading' as const, progress: 10 } : f));

    // Generate thumbnail for images
    let thumbnailBase64: string | null = null;
    if (isImage) {
      try {
        const { generateImageThumbnail } = await import('@/utils/generateImageThumbnail');
        thumbnailBase64 = await generateImageThumbnail(file);
      } catch (e) {
        console.warn('Thumbnail generation failed:', e);
      }
    }

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
      const { data: finalizeData, error } = await supabase.functions.invoke('upload-master-to-s3', {
        body: {
          filename: file.name,
          mimeType: file.type,
          width: 0,
          height: 0,
          title,
          tags: tagsList,
          thumbnailBase64,
          s3Key: presignData.s3Key,
          cdnUrl: presignData.cdnUrl,
          masterId: presignData.masterId,
          fileSize: file.size,
          albumId: createdAlbumId,
          creatorContactId: user?.id,
          approvalStatus,
        },
      });

      if (error) throw error;

      // Use the real database asset ID from the finalize response
      const realAssetId = finalizeData?.assetId || presignData.masterId;

      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, progress: 95 } : f));

      // Step 4: Fire auto-tag in background (don't await)
      supabase.functions.invoke('auto-tag-media-asset', {
        body: {
          assetId: realAssetId,
          mediaUrl: presignData.cdnUrl,
          mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
        },
      }).catch(() => {}); // fire and forget

      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: 'done' as const, progress: 100, assetId: realAssetId } : f));
      return true;
    } catch (err: any) {
      console.error(`Upload error for ${file.name}:`, err);
      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: 'error' as const, error: err.message } : f));
      return false;
    }
  };

  const handleUploadAll = async () => {
    if (albumMode === 'new' && !albumName.trim()) {
      toast({ title: "Album name required", description: "Please name your album before uploading", variant: "destructive" });
      return;
    }
    if (albumMode === 'existing' && !selectedAlbumId) {
      toast({ title: "Select an album", description: "Choose an existing album to upload to", variant: "destructive" });
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
      let targetAlbumId: string;
      let targetAlbumName: string;

      if (albumMode === 'new') {
        const { data: album, error: albumError } = await supabase
          .from('media_albums')
          .insert({
            name: albumName.trim(),
            description: albumDescription.trim() || null,
            created_by: null,
          })
          .select()
          .single();

        if (albumError) throw new Error(`Failed to create album: ${albumError.message}`);
        targetAlbumId = album.id;
        targetAlbumName = albumName.trim();
      } else {
        targetAlbumId = selectedAlbumId!;
        targetAlbumName = existingAlbums.find(a => a.id === selectedAlbumId)?.name || '';
      }

      setAlbumId(targetAlbumId);

      const tagsList = [targetAlbumName, ...sharedTags.split(',').map(t => t.trim()).filter(Boolean)].filter(Boolean);

      let completed = 0;
      const pending = [...queue];

      const processNext = async (): Promise<void> => {
        const next = pending.shift();
        if (!next) return;
        const success = await uploadSingleFile(next, targetAlbumId, tagsList);
        if (success) completed++;
        setCompletedCount(prev => prev + 1);
        await processNext();
      };

      const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, pending.length) }, () => processNext());
      await Promise.all(workers);

      if (albumMode === 'new') {
        await supabase
          .from('media_albums')
          .update({ asset_count: completed })
          .eq('id', targetAlbumId);
      } else {
        // Increment existing album's asset_count
        const existing = existingAlbums.find(a => a.id === targetAlbumId);
        const newCount = (existing?.asset_count || 0) + completed;
        await supabase
          .from('media_albums')
          .update({ asset_count: newCount })
          .eq('id', targetAlbumId);
      }

      setUploadDone(true);
      await fetchAlbums();
      toast({
        title: "Bulk upload complete!",
        description: `${completed} of ${queue.length} files uploaded to "${targetAlbumName}"`,
      });

      // Auto-sync new assets to Salesforce
      setQueue(prev => {
        const successfulIds = prev
          .filter(f => f.status === 'done' && f.assetId)
          .map(f => f.assetId!);

        if (successfulIds.length > 0) {
          toast({ title: "Syncing to Salesforce...", description: `${successfulIds.length} assets being synced` });
          supabase.functions.invoke('sync-asset-to-salesforce', {
            body: { assetIds: successfulIds }
          }).then(({ error }) => {
            if (error) {
              console.error('SFDC sync error:', error);
              toast({ title: "SFDC sync failed", description: error.message, variant: "destructive" });
            } else {
              toast({ title: "Salesforce sync complete", description: `${successfulIds.length} assets synced` });
            }
          });
        }
        return prev;
      });
    } catch (err: any) {
      console.error('Bulk upload error:', err);
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const overallProgress = queue.length > 0 ? queue.reduce((sum, f) => sum + f.progress, 0) / queue.length : 0;
  const doneCount = queue.filter(f => f.status === 'done').length;
  const errorCount = queue.filter(f => f.status === 'error').length;
  const totalQueueBytes = queue.reduce((sum, f) => sum + f.file.size, 0);
  const isLargeQueue = totalQueueBytes > 500 * 1024 * 1024;

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
        {/* Album Mode Toggle */}
        <div className="space-y-4">
          <Label>Album</Label>
          <RadioGroup
            value={albumMode}
            onValueChange={(v) => setAlbumMode(v as 'new' | 'existing')}
            className="flex gap-4"
            disabled={isUploading}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="new" id="mode-new" />
              <Label htmlFor="mode-new" className="cursor-pointer font-normal">New Album</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="existing" id="mode-existing" />
              <Label htmlFor="mode-existing" className="cursor-pointer font-normal">Existing Album</Label>
            </div>
          </RadioGroup>

          {albumMode === 'new' ? (
            <>
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
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Album *</Label>
                <Select
                  value={selectedAlbumId || ''}
                  onValueChange={setSelectedAlbumId}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an album..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingAlbums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.name} ({album.asset_count} assets)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="shared-tags-existing">Shared Tags (comma separated)</Label>
                <Input
                  id="shared-tags-existing"
                  placeholder="e.g. race, sonoma, 2025"
                  value={sharedTags}
                  onChange={(e) => setSharedTags(e.target.value)}
                  disabled={isUploading}
                />
              </div>
            </div>
          )}

          {/* Approval status applied to all uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bulk-approval-status">Approval Status (applied to all)</Label>
              <Select
                value={approvalStatus}
                onValueChange={(v) => setApprovalStatus(v as typeof approvalStatus)}
                disabled={isUploading}
              >
                <SelectTrigger id="bulk-approval-status">
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
        </div>

        {/* Dropzone */}
        {isMobile ? (
          <div className={`space-y-3 ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
            <label
              htmlFor={inputId}
              className="flex items-center justify-center gap-3 w-full h-20 text-lg font-medium rounded-md bg-primary text-primary-foreground cursor-pointer"
            >
              <Camera className="w-6 h-6" />
              Select from Camera Roll
            </label>
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_MIME}
              className="sr-only"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />
          </div>
        ) : (
          <>
            <label
              htmlFor={!isUploading ? inputId : undefined}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors block ${
                isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-lg font-medium">Drop files here or click to browse</p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports images, videos, and audio — drag from Finder or use the button below
              </p>
            </label>
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_MIME}
              className="sr-only"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
            />
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Image Capture users:</strong> Save files to a folder first (set "Import To" in Image Capture), then drag from Finder or click to browse. Direct drag from Image Capture is not supported by browsers.
              </span>
            </div>
          </>
        )}

        {/* File Queue */}
        {queue.length > 0 && (
          <div className="space-y-3">
            {isLargeQueue && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <TriangleAlert className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-700 dark:text-yellow-400">
                  Large upload: {formatSize(totalQueueBytes)} total. This may take several minutes depending on your connection.
                  {isMobile && ' For faster uploads, AirDrop files to a laptop first.'}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {queue.length} file{queue.length !== 1 ? 's' : ''} queued
                <span className="text-muted-foreground font-normal ml-1">— {formatSize(totalQueueBytes)}</span>
              </span>
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
            disabled={isUploading || (albumMode === 'new' ? !albumName.trim() : !selectedAlbumId)}
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
              {doneCount} file{doneCount !== 1 ? 's' : ''} uploaded to "{albumMode === 'existing' ? existingAlbums.find(a => a.id === selectedAlbumId)?.name : albumName}"
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
                setSelectedAlbumId(null);
                setAlbumMode('new');
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
