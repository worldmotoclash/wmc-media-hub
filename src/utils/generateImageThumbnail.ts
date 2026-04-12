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
