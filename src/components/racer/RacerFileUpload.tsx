import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { uploadRacerFile } from '@/services/racerMediaService';
import { cn } from '@/lib/utils';

interface RacerFileUploadProps {
  racerName: string;
  racerContactId: string;
  category: string;
  accept?: string;
  label?: string;
  onUploadComplete?: (result: { masterId: string; cdnUrl: string }) => void;
}

const RacerFileUpload: React.FC<RacerFileUploadProps> = ({
  racerName,
  racerContactId,
  category,
  accept = 'image/*,video/*',
  label = 'Upload File',
  onUploadComplete,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setStatus('idle');
      setProgress(0);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setError('');

    const result = await uploadRacerFile({
      file,
      racerName,
      racerContactId,
      category,
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
      <div
        onClick={() => status !== 'uploading' && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          'border-border hover:border-primary/50',
          status === 'uploading' && 'pointer-events-none opacity-50'
        )}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">Click to select a file</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleSelect}
        />
      </div>

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
