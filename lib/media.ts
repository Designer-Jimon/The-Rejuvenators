import { getCloudflareContext } from "@opennextjs/cloudflare";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CHAT_MAX_BYTES = 10 * 1024 * 1024;
const CHAT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
};

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function looksLikeImage(bytes: Uint8Array, type: string) {
  if (bytes.length < 12) return false;
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (type === "image/webp") {
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  return false;
}

export function mediaUrl(key: string | null | undefined) {
  if (!key) return null;
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function publicMediaUrl(key: string | null | undefined) {
  if (!key) return null;
  return `/api/public/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function uploadImage(
  file: File,
  folder: "avatars" | "covers" | "media",
  userId: string,
) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Please upload a JPG, PNG or WebP image.");
  }
  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Image is too large. Please choose one under 6MB.");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (!looksLikeImage(buffer, file.type)) {
    throw new Error("That file does not look like a valid image.");
  }

  const { env } = await getCloudflareContext({ async: true });
  if (!env.MEDIA) {
    throw new Error("Media storage is not configured.");
  }

  const key = `${folder}/${userId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
  await env.MEDIA.put(key, buffer, {
    httpMetadata: { contentType: file.type },
  });
  return key;
}

export async function uploadChatFile(file: File, userId: string) {
  const extension = CHAT_TYPES[file.type];
  if (!extension) {
    throw new Error(
      "Please upload an image, PDF, Word, Excel, text, CSV or ZIP file.",
    );
  }
  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }
  if (file.size > CHAT_MAX_BYTES) {
    throw new Error("File is too large. Please choose one under 10MB.");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  if (file.type.startsWith("image/") && !looksLikeImage(buffer, file.type)) {
    throw new Error("That file does not look like a valid image.");
  }

  const { env } = await getCloudflareContext({ async: true });
  if (!env.MEDIA) {
    throw new Error("Media storage is not configured.");
  }

  const key = `chat/${userId}/${crypto.randomUUID()}.${extension}`;
  await env.MEDIA.put(key, buffer, {
    httpMetadata: { contentType: file.type },
  });
  return key;
}

export async function deleteMediaObject(key: string) {
  const { env } = await getCloudflareContext({ async: true });
  if (env.MEDIA) {
    await env.MEDIA.delete(key);
  }
}
