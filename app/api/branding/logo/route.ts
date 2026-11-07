import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSettings } from "@/lib/settings";

const FALLBACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="It Is Finished Revival Outreach"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B1A1A"/><stop offset="1" stop-color="#EA580C"/></linearGradient></defs><rect width="512" height="512" rx="112" fill="url(#g)"/><path d="M256 96v320M160 176h192" fill="none" stroke="#FFFBF7" stroke-width="28" stroke-linecap="round"/><circle cx="256" cy="256" r="176" fill="none" stroke="#F5C16C" stroke-width="8" opacity=".7"/></svg>`;

function fallbackIcon() {
  return new Response(FALLBACK_ICON, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
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
      "Cache-Control": "public, max-age=300",
      ETag: object.httpEtag,
    },
  });
}
