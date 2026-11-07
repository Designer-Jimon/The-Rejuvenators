import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/authorize";
import { CHAT_BODY_LIMIT, getChatConversation, listChatMessages, sendChatMessage } from "@/lib/chat";
import { broadcastConversation } from "@/lib/realtime";
import { csrfFailure, readJson, sameOrigin } from "@/lib/http";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

const sendSchema = z
  .object({
    body: z.string().max(CHAT_BODY_LIMIT).optional().default(""),
    replyToId: z.string().trim().max(80).optional().nullable(),
    attachmentKey: z.string().trim().max(300).optional().nullable(),
    attachmentName: z.string().trim().max(160).optional().nullable(),
    attachmentType: z.string().trim().max(80).optional().nullable(),
    attachmentSize: z.number().int().nonnegative().optional().nullable(),
  })
  .strict();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const { id } = await params;
  const before = new URL(request.url).searchParams.get("before");

  try {
    const [conversation, items] = await Promise.all([
      getChatConversation(auth.user.id, id),
      listChatMessages(auth.user.id, id, { before }),
    ]);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    return NextResponse.json({ conversation, messages: items });
  } catch {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return csrfFailure();
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;
  const { id } = await params;

  const limit = await checkRateLimit(
    rateLimitKey("chat:send", user.id),
    40,
    60,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "You are sending messages too quickly. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const body = await readJson<unknown>(request);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check your message." },
      { status: 400 },
    );
  }

  try {
    const message = await sendChatMessage({
      conversationId: id,
      senderId: user.id,
      ...parsed.data,
    });
    await broadcastConversation(id, { type: "message", message });
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Message could not be sent." },
      { status: 400 },
    );
  }
}
