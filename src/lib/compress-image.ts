/**
 * Client-side image compression using browser-native Canvas APIs.
 * Resizes large images and re-encodes as WebP to reduce storage usage.
 */
export async function compressImage(
  file: File,
  { maxWidth = 1920, quality = 0.85 }: { maxWidth?: number; quality?: number } = {},
): Promise<File> {
  // Skip GIFs (may be animated) and already-small files
  if (file.type === "image/gif" || file.size < 50_000) return file;

  // Fallback for environments without OffscreenCanvas (e.g. SSR, old browsers)
  if (typeof OffscreenCanvas === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/webp", quality });

  // Only use compressed version if it's actually smaller
  if (blob.size >= file.size) return file;

  const ext = file.name.lastIndexOf(".") !== -1
    ? file.name.slice(0, file.name.lastIndexOf(".")) + ".webp"
    : file.name + ".webp";

  return new File([blob], ext, { type: "image/webp" });
}
