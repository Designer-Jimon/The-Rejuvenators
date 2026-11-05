import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;
  const key = segments.join("/");
  if (
    !key.startsWith("media/") ||
    key.includes("..") ||
    key.length > 300
  ) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { env } = await getCloudflareContext({ async: true });
  if (!env.MEDIA) {
    return NextResponse.json(
      { error: "Media is not configured." },
      { status: 503 },
    );
  }

  const object = await env.MEDIA.get(key);
  if (!object) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return new Response(object.body as ReadableStream, {
    headers: {
      "Content-Type":
        object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      ETag: object.httpEtag,
    },
  });
}
