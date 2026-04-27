// Shared filename sanitizer.
//
// Wasabi/Cloudflare returns 403 for object keys containing certain characters
// even when percent-encoded (notably ":"), so we strip them before any filename
// is used to construct an S3 key, displayed back to the user, or stored in the DB.
//
// Rules (kept identical to supabase/functions/rename-s3-asset/index.ts so the
// repair tool produces the same result a fresh upload would):
//   :  -> -
//   *  -> _
//   ?  -> drop
//   #  -> drop
//   runs of "_"      -> single "_"
//   runs of "  " +   -> single " "
//   leading/trailing whitespace, "_" or "-" -> trimmed
//
// Extensions are preserved exactly (no .m4v -> .mp4 rewrite).

export interface SanitizedFilename {
  clean: string;
  changed: boolean;
}

export function sanitizeFilename(name: string): SanitizedFilename {
  if (!name) return { clean: name, changed: false };

  // Split into "stem.ext" so we never collapse the dot before the extension.
  const lastDot = name.lastIndexOf('.');
  const hasExt = lastDot > 0 && lastDot < name.length - 1;
  const stem = hasExt ? name.slice(0, lastDot) : name;
  const ext = hasExt ? name.slice(lastDot) : '';

  const cleanedStem = stem
    .replace(/:/g, '-')
    .replace(/\*/g, '_')
    .replace(/[?#]/g, '')
    .replace(/_+/g, '_')
    .replace(/ {2,}/g, ' ')
    .replace(/^[\s_-]+|[\s_-]+$/g, '');

  const clean = cleanedStem + ext;
  return { clean, changed: clean !== name };
}

// True if a filename or S3 key contains any character that needs sanitizing.
export function filenameNeedsSanitizing(name: string): boolean {
  if (!name) return false;
  return /[:*?#]/.test(name) || / {2,}/.test(name);
}

// Returns a new File object with a sanitized name (preserves type & contents).
// Use this in upload pipelines so the cleaned name is what hits S3 and the DB.
export function sanitizeFile(file: File): { file: File; changed: boolean; original: string } {
  const { clean, changed } = sanitizeFilename(file.name);
  if (!changed) return { file, changed: false, original: file.name };
  return {
    file: new File([file], clean, { type: file.type, lastModified: file.lastModified }),
    changed: true,
    original: file.name,
  };
}
