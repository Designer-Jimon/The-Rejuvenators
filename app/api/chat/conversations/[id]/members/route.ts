import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/authorize";
import { listConversationMembers } from "@/lib/chat";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;

  try {
    const members = await listConversationMembers(auth.user.id, id);
    return NextResponse.json({ members });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Members not found." },
      { status: 404 },
    );
  }
}
