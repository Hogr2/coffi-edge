// Browser-side image compression: resize to max 1000px wide and re-encode as
// WebP (~q0.8) before anything is sent to the server. A huge phone photo comes
// out at a few hundred KB. Client-only — do not import from server code.

const MAX_WIDTH = 1000;
const WEBP_QUALITY = 0.8;

export async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas not supported");
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
    );
    if (!blob) throw new Error("WebP encoding failed");
    return new File([blob], "image.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
