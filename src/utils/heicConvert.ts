import { toast } from "sonner";

const HEIC_MIME = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];
const MAX_HEIC_BYTES = 50 * 1024 * 1024; // 50 MB

export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".heic") || name.endsWith(".heif")) return true;
  if (file.type && HEIC_MIME.includes(file.type.toLowerCase())) return true;
  return false;
}

function renameToJpg(originalName: string): string {
  return originalName.replace(/\.(heic|heif)$/i, ".jpg") || `${originalName}.jpg`;
}

async function normalizeBlobToJpegFile(blob: Blob, fileName: string, lastModified: number): Promise<File> {
  const makeFile = (output: Blob) => new File([output], fileName, {
    type: "image/jpeg",
    lastModified,
  });

  const bitmap = await createImageBitmap(blob).catch(() => null);
  if (!bitmap) return makeFile(blob);

  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    const normalized = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((out) => out ? resolve(out) : reject(new Error("Failed to normalize converted HEIC JPEG")), "image/jpeg", 0.92);
    });
    return makeFile(normalized);
  } finally {
    bitmap.close();
  }
}

export interface HeicConvertResult {
  /** The file the rest of the pipeline should consume (JPEG if conversion happened, original otherwise). */
  file: File;
  /** Original HEIC file when conversion happened — useful for archiving the source. */
  original?: File;
  /** True when a conversion actually ran. */
  converted: boolean;
}

/**
 * If the input file is a HEIC/HEIF image (typical from iPhones), convert it
 * to a JPEG File in-browser. Otherwise return the original file unchanged.
 *
 * The rest of the upload pipeline (preview, AI analysis, S3 upload, SFDC sync)
 * stays untouched and just sees a normal JPEG.
 */
export async function convertHeicIfNeeded(file: File): Promise<File> {
  const result = await convertHeicWithOriginal(file);
  return result.file;
}

/** Same as `convertHeicIfNeeded` but also returns the untouched original when a conversion happens. */
export async function convertHeicWithOriginal(file: File): Promise<HeicConvertResult> {
  if (!isHeicFile(file)) return { file, converted: false };

  if (file.size > MAX_HEIC_BYTES) {
    toast.error(
      `${file.name} is too large to convert in the browser (>50 MB). Please export as JPEG from your phone.`
    );
    throw new Error("HEIC file exceeds 50 MB conversion limit");
  }

  const showProgressToast = file.size > 5 * 1024 * 1024;
  const toastId = showProgressToast
    ? toast.loading(`Converting iPhone photo (${file.name})…`)
    : undefined;

  try {
    // Dynamic import — heic2any is ~70 KB gz and only needed for HEIC files.
    const mod: any = await import("heic2any");
    const heic2any = mod.default ?? mod;

    const blobResult = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });

    const jpgName = renameToJpg(file.name);
    const blob = Array.isArray(blobResult) ? blobResult[0] : blobResult;
    const converted = await normalizeBlobToJpegFile(blob, jpgName, file.lastModified);

    if (toastId !== undefined) toast.dismiss(toastId);
    return { file: converted, original: file, converted: true };
  } catch (err) {
    if (toastId !== undefined) toast.dismiss(toastId);
    console.error("[HEIC] Conversion failed for", file.name, err);
    toast.error(`Could not convert ${file.name}. Please export as JPEG and try again.`);
    throw err;
  }
}

/**
 * Convert a list of files, dropping any that fail conversion (with toast errors
 * already surfaced). Useful for multi-select / drag-and-drop entry points.
 */
export async function convertHeicBatch(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) {
    try {
      out.push(await convertHeicIfNeeded(f));
    } catch {
      // skip failed file; toast already shown
    }
  }
  return out;
}

/** Accept attribute snippet to add HEIC alongside whatever else is accepted. */
export const HEIC_ACCEPT_EXT = ".heic,.heif";
export const HEIC_ACCEPT_MIME = "image/heic,image/heif";
