import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { sermons } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(PERMISSIONS.contentManage);
  if (auth.response) return auth.response;
  const { id } = await params;
  const db = await getDb();
  const [sermon] = await db
    .select({
      key: sermons.sourceFileKey,
      name: sermons.sourceFileName,
      type: sermons.sourceContentType,
    })
    .from(sermons)
    .where(eq(sermons.id, id))
    .limit(1);
  if (!sermon?.key) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.MEDIA?.get(sermon.key);
  if (!object) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const filename = (sermon.name ?? "sermon").replace(/["\r\n]/g, "");
  return new NextResponse(object.body, {
    headers: {
      "Content-Type":
        sermon.type ?? object.httpMetadata?.contentType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
