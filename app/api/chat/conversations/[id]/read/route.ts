import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/authorize";
import { markChatRead } from "@/lib/chat";
import { csrfFailure, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return csrfFailure();
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  try {
    const readAt = await markChatRead(auth.user.id, id);
    return NextResponse.json({ ok: true, readAt });
  } catch {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
}
