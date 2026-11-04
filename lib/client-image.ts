export async function compressImage(
  file: File,
  options?: { maxDimension?: number; maxBytes?: number },
) {
  const maxDimension = options?.maxDimension ?? 1600;
  const maxBytes = options?.maxBytes ?? 300 * 1024;

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));

  let quality = 0.86;
  let blob: Blob | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not process this image.");
    context.drawImage(bitmap, 0, 0, width, height);
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= maxBytes) break;
    quality = Math.max(0.5, quality - 0.12);
    width = Math.round(width * 0.88);
    height = Math.round(height * 0.88);
  }

  bitmap.close();

  if (!blob) {
    throw new Error("Could not prepare this image. Please try another one.");
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
