import { toast } from "sonner";

const HEIC_MIME = ["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"];
const MAX_HEIC_BYTES = 50 * 1024 * 1024; // 50 MB

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".heic") || name.endsWith(".heif")) return true;
  if (file.type && HEIC_MIME.includes(file.type.toLowerCase())) return true;
  return false;
}

function renameToJpg(originalName: string): string {
  return originalName.replace(/\.(heic|heif)$/i, ".jpg") || `${originalName}.jpg`;
}

/**
 * If the input file is a HEIC/HEIF image (typical from iPhones), convert it
 * to a JPEG File in-browser. Otherwise return the original file unchanged.
 *
 * The rest of the upload pipeline (preview, AI analysis, S3 upload, SFDC sync)
 * stays untouched and just sees a normal JPEG.
 */
export async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

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
    const mod = await import("heic2any");
    const heic2any = (mod as unknown as { default: typeof import("heic2any") }).default;

    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });

    const blob = Array.isArray(result) ? result[0] : result;
    const jpgName = renameToJpg(file.name);
    const converted = new File([blob], jpgName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });

    if (toastId !== undefined) toast.dismiss(toastId);
    return converted;
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
