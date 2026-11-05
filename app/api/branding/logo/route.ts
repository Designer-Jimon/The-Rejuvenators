import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSettings } from "@/lib/settings";

export async function GET(request: Request) {
  const settings = await getSettings();
  const key = settings.logo_key?.trim();
  if (!key) {
    return NextResponse.redirect(new URL("/icons/icon.svg", request.url));
  }

  const { env } = await getCloudflareContext({ async: true });
  if (!env.MEDIA) {
    return NextResponse.redirect(new URL("/icons/icon.svg", request.url));
  }

  const object = await env.MEDIA.get(key);
  if (!object) {
    return NextResponse.redirect(new URL("/icons/icon.svg", request.url));
  }

  return new Response(object.body as ReadableStream, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=300",
      ETag: object.httpEtag,
    },
  });
}
