import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/authorize";
import { createChatReport, requireParticipant } from "@/lib/chat";
import { logAudit } from "@/lib/audit";
import { csrfFailure, readJson, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

const reportSchema = z
  .object({
    messageId: z.string().trim().max(80).optional().nullable(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return csrfFailure();
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;

  if (!(await requireParticipant(id, auth.user.id))) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const body = await readJson<unknown>(request);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Describe the problem." },
      { status: 400 },
    );
  }

  await createChatReport({
    reporterId: auth.user.id,
    reporterName: auth.user.name,
    conversationId: id,
    messageId: parsed.data.messageId ?? null,
    reason: parsed.data.reason,
  });
  await logAudit({
    actorId: auth.user.id,
    action: "chat.reported",
    entityType: "conversation",
    entityId: id,
    details: `Message: ${parsed.data.messageId ?? "conversation"}. Reason: ${parsed.data.reason}`,
  });

  return NextResponse.json({ ok: true });
}
