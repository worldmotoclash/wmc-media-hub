import { supabase } from '@/integrations/supabase/client';

interface RacerUploadOptions {
  file: File;
  racerName: string;
  racerContactId: string;
  category: string;
  albumId?: string;
  onProgress?: (pct: number) => void;
}

interface UploadResult {
  success: boolean;
  masterId?: string;
  cdnUrl?: string;
  error?: string;
}

/** Upload a file via presigned URL pipeline with racer-specific auto-tagging */
export const uploadRacerFile = async (opts: RacerUploadOptions): Promise<UploadResult> => {
  const { file, racerName, racerContactId, category, albumId, onProgress } = opts;

  try {
    // Step 1: Get presigned URL
    onProgress?.(5);
    const { data: presignData, error: presignError } = await supabase.functions.invoke(
      'generate-presigned-upload-url',
      { body: { filename: file.name, mimeType: file.type, width: 0, height: 0 } }
    );

    if (presignError || !presignData?.success) {
      throw new Error(presignError?.message || 'Failed to get presigned URL');
    }

    onProgress?.(15);

    // Step 2: Upload to S3 via XHR with progress, fetch fallback for iOS
    console.log(`[racerMediaService] Uploading file: ${file.name}, type: ${file.type}, size: ${file.size}`);
    let xhrFailed = false;
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignData.presignedUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = 15 + (e.loaded / e.total) * 65;
            onProgress?.(pct);
          }
        };

        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`S3 upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });
    } catch (xhrErr: any) {
      console.warn('[racerMediaService] XHR upload failed, trying fetch fallback:', xhrErr.message);
      xhrFailed = true;
    }

    if (xhrFailed) {
      const fetchRes = await fetch(presignData.presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
        mode: 'cors',
      });
      if (!fetchRes.ok) {
        throw new Error(`Fetch upload failed: ${fetchRes.status} ${fetchRes.statusText}`);
      }
      onProgress?.(80);
    }

    onProgress?.(85);

    // Step 3: Finalize metadata with racer tags
    const title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const tags = ['Racer Submission', racerName, category];

    const { error: metaError } = await supabase.functions.invoke('upload-master-to-s3', {
      body: {
        filename: file.name,
        mimeType: file.type,
        width: 0,
        height: 0,
        title,
        tags,
        s3Key: presignData.s3Key,
        cdnUrl: presignData.cdnUrl,
        masterId: presignData.masterId,
        fileSize: file.size,
        ...(albumId ? { albumId } : {}),
        creatorContactId: racerContactId,
      },
    });

    if (metaError) throw metaError;

    onProgress?.(100);

    return {
      success: true,
      masterId: presignData.masterId,
      cdnUrl: presignData.cdnUrl,
    };
  } catch (err: any) {
    console.error('[racerMediaService] Upload error:', err);
    return { success: false, error: err.message };
  }
};
