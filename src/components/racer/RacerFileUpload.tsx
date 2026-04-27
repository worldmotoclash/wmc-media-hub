import React, { useRef, useState, useId } from 'react';
import { Upload, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { uploadRacerFile } from '@/services/racerMediaService';
import { cn } from '@/lib/utils';
import { sanitizeFile } from '@/utils/sanitizeFilename';

const MIME_MAP: Record<string, string> = {
  heic: 'image/heic',
  heif: 'image/heif',
  mov: 'video/quicktime',
  mp4: 'video/mp4',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const inferMimeType = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return MIME_MAP[ext] || 'application/octet-stream';
};

interface RacerFileUploadProps {
  racerName: string;
  racerContactId: string;
  category: string;
  albumId?: string;
  accept?: string;
  capture?: 'user' | 'environment';
  label?: string;
  onUploadComplete?: (result: { masterId: string; cdnUrl: string }) => void;
}

const RacerFileUpload: React.FC<RacerFileUploadProps> = ({
  racerName,
  racerContactId,
  category,
  albumId,
  accept = 'image/jpeg,image/png,image/heic,image/heif,image/webp,video/mp4,video/quicktime',
  capture,
  label = 'Upload File',
  onUploadComplete,
}) => {
  const uniqueId = useId();
  const inputId = `racer-upload-${uniqueId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      // Strip Wasabi-incompatible characters (":", "*", "?", "#") from the
      // filename before it can reach S3.
      const { file: cleanFile } = sanitizeFile(f);
      setFile(cleanFile);
      setStatus('idle');
      setProgress(0);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setError('');

    const mimeType = inferMimeType(file);
    const uploadFile = mimeType !== file.type
      ? new File([file], file.name, { type: mimeType })
      : file;

    const result = await uploadRacerFile({
      file: uploadFile,
      racerName,
      racerContactId,
      category,
      albumId,
      onProgress: setProgress,
    });

    if (result.success && result.masterId && result.cdnUrl) {
      setStatus('done');
      onUploadComplete?.({ masterId: result.masterId, cdnUrl: result.cdnUrl });
    } else {
      setStatus('error');
      setError(result.error || 'Upload failed');
    }
  };

  const reset = () => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={status !== 'uploading' ? inputId : undefined}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors block',
          'border-border hover:border-primary/50',
          status === 'uploading' && 'pointer-events-none opacity-50'
        )}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">Tap to select a file</p>
      </label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        className="sr-only"
        onChange={handleSelect}
      />

      {file && (
        <div className="flex items-center gap-3 bg-accent/50 rounded-lg p-3">
          <span className="text-sm flex-1 truncate">{file.name}</span>
          {status === 'idle' && (
            <>
              <Button size="sm" onClick={handleUpload}>Upload</Button>
              <button onClick={reset} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </>
          )}
          {status === 'uploading' && (
            <span className="text-xs text-primary font-medium">{Math.round(progress)}%</span>
          )}
          {status === 'done' && <CheckCircle2 className="w-5 h-5 text-primary" />}
          {status === 'error' && (
            <span title={error}><AlertCircle className="w-5 h-5 text-destructive" /></span>
          )}
        </div>
      )}

      {status === 'uploading' && <Progress value={progress} className="h-2" />}

      {status === 'done' && (
        <Button variant="outline" size="sm" onClick={reset}>Upload Another</Button>
      )}
      {status === 'error' && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleUpload}>Retry</Button>
          <Button variant="ghost" size="sm" onClick={reset}>Cancel</Button>
        </div>
      )}
    </div>
  );
};

export default RacerFileUpload;
