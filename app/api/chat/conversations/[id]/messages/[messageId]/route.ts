import { NextResponse } from "next/server";
import { hasPermission, requireApiUser } from "@/lib/auth/authorize";
import { deleteChatMessage } from "@/lib/chat";
import { PERMISSIONS } from "@/lib/constants";
import { broadcastConversation } from "@/lib/realtime";
import { csrfFailure, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  if (!sameOrigin(request)) return csrfFailure();
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id, messageId } = await params;

  try {
    await deleteChatMessage(
      auth.user.id,
      id,
      messageId,
      hasPermission(auth.user, PERMISSIONS.memberManage),
    );
    await broadcastConversation(id, {
      type: "message_deleted",
      messageId,
      conversationId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Message not found." },
      { status: 400 },
    );
  }
}
