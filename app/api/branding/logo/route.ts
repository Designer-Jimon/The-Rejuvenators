import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSettings } from "@/lib/settings";

const FALLBACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Logo placeholder"><rect width="512" height="512" rx="112" fill="#FFF8ED"/><rect x="96" y="96" width="320" height="320" rx="56" fill="none" stroke="#8B1A1A" stroke-width="18" opacity=".25"/><circle cx="192" cy="192" r="28" fill="#8B1A1A" opacity=".45"/><path d="M128 352l88-96 64 64 48-48 56 80z" fill="#8B1A1A" opacity=".35"/></svg>`;

const CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

function fallbackIcon() {
  return new Response(FALLBACK_ICON, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

export async function GET() {
  const settings = await getSettings();
  const key = settings.logo_key?.trim();
  if (!key) return fallbackIcon();

  const { env } = await getCloudflareContext({ async: true });
  if (!env.MEDIA) return fallbackIcon();

  const object = await env.MEDIA.get(key);
  if (!object) return fallbackIcon();

  return new Response(object.body as ReadableStream, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": CACHE_CONTROL,
      ETag: object.httpEtag,
    },
  });
}
