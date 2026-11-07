import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/authorize";
import { csrfFailure, sameOrigin } from "@/lib/http";
import { uploadChatFile } from "@/lib/media";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return csrfFailure();
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const limit = await checkRateLimit(
    rateLimitKey("chat:upload", auth.user.id),
    10,
    60,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again shortly." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a file first." }, { status: 400 });
  }

  try {
    const key = await uploadChatFile(file, auth.user.id);
    return NextResponse.json({
      ok: true,
      key,
      url: `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`,
      name: file.name.slice(0, 160),
      type: file.type,
      size: file.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
