import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { mediaLibrary } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { csrfFailure, sameOrigin } from "@/lib/http";
import { mediaMetaSchema } from "@/lib/admin/cms-validation";
import { uploadImage } from "@/lib/media";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return csrfFailure();

  const auth = await requireApiUser(PERMISSIONS.contentManage);
  if (auth.response) return auth.response;
  const user = auth.user;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const parsed = mediaMetaSchema.safeParse({
    altText: String(formData.get("altText") ?? ""),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid details." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Choose an image first." },
      { status: 400 },
    );
  }

  try {
    const key = await uploadImage(file, "media", user.id);
    const id = crypto.randomUUID();
    const db = await getDb();
    await db.insert(mediaLibrary).values({
      id,
      key,
      filename: file.name.slice(0, 200),
      contentType: file.type,
      size: file.size,
      altText: parsed.data.altText || null,
      uploadedBy: user.id,
      createdAt: new Date(),
    });
    await logAudit({
      actorId: user.id,
      action: "media.uploaded",
      entityType: "media",
      entityId: id,
      details: `Uploaded ${file.name.slice(0, 120)}.`,
    });
    return NextResponse.json({ ok: true, id, key });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
