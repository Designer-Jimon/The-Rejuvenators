import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth/authorize";
import { csrfFailure, readJson, sameOrigin } from "@/lib/http";
import { checkRateLimit, clientIpFromHeaders, rateLimitKey } from "@/lib/rate-limit";
import {
  getOrCreateDirectConversation,
  listChatContacts,
  listChatConversations,
  totalChatUnread,
} from "@/lib/chat";

export const runtime = "nodejs";

const createSchema = z
  .object({
    userId: z.string().trim().min(1).max(80),
  })
  .strict();

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;

  const [items, contacts, unread] = await Promise.all([
    listChatConversations(user.id),
    listChatContacts(user.id),
    totalChatUnread(user.id),
  ]);

  return NextResponse.json({ conversations: items, contacts, unread });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return csrfFailure();
  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;

  const limit = await checkRateLimit(
    rateLimitKey("chat:create", `${user.id}:${clientIpFromHeaders(request.headers)}`),
    20,
    60,
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many new conversations. Please try again shortly." },
      { status: 429 },
    );
  }

  const body = await readJson<unknown>(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Choose a member to message." },
      { status: 400 },
    );
  }

  try {
    const conversationId = await getOrCreateDirectConversation(
      user.id,
      parsed.data.userId,
    );
    return NextResponse.json({ ok: true, conversationId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start chat." },
      { status: 400 },
    );
  }
}
