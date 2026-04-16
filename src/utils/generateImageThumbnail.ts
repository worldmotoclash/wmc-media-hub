/**
 * Generates a small JPEG thumbnail from an image File using a canvas.
 * Returns a base64 string (without the data URL prefix).
 */
export function generateImageThumbnail(
  file: File,
  maxSize = 400,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(maxSize / w, maxSize / h, 1);
      const tw = Math.round(w * scale);
      const th = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(img.src);
        return reject(new Error("Canvas context unavailable"));
      }
      ctx.drawImage(img, 0, 0, tw, th);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(img.src);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image for thumbnail"));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generates a small JPEG thumbnail from a remote image URL using a canvas.
 * Returns a full data URL string (data:image/jpeg;base64,...).
 * Uses crossOrigin="anonymous" to handle CORS-enabled S3/CDN sources.
 */
export function generateImageThumbnailFromUrl(
  url: string,
  maxSize = 400,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(maxSize / w, maxSize / h, 1);
      const tw = Math.round(w * scale);
      const th = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Canvas context unavailable"));
      }
      ctx.drawImage(img, 0, 0, tw, th);
      try {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      } catch (e) {
        // Tainted canvas (CORS issue) — fall back to original URL
        reject(new Error("Canvas tainted — CORS blocked"));
      }
    };
    img.onerror = () => {
      reject(new Error("Failed to load image for thumbnail"));
    };
    img.src = url;
  });
}
