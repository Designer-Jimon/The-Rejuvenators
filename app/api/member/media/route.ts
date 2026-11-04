import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { memberProfiles } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/authorize";
import { csrfFailure, sameOrigin } from "@/lib/http";
import { deleteMediaObject, mediaUrl, uploadImage } from "@/lib/media";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return csrfFailure();

  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const kind = String(formData.get("kind") ?? "");
  const file = formData.get("file");
  if (kind !== "avatar" && kind !== "cover") {
    return NextResponse.json({ error: "Unknown upload type." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image first." }, { status: 400 });
  }

  let key: string;
  try {
    key = await uploadImage(file, kind === "avatar" ? "avatars" : "covers", user.id);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }

  const db = await getDb();
  const existing = await db
    .select({
      avatarKey: memberProfiles.avatarKey,
      coverKey: memberProfiles.coverKey,
    })
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, user.id))
    .limit(1);

  const previous = kind === "avatar" ? existing[0]?.avatarKey : existing[0]?.coverKey;

  await db
    .update(memberProfiles)
    .set(
      kind === "avatar"
        ? { avatarKey: key, updatedAt: new Date() }
        : { coverKey: key, updatedAt: new Date() },
    )
    .where(eq(memberProfiles.userId, user.id));

  if (previous) {
    await deleteMediaObject(previous);
  }

  return NextResponse.json({ ok: true, key, url: mediaUrl(key) });
}
