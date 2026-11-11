import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/authorize";
import { csrfFailure, sameOrigin } from "@/lib/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return csrfFailure();

  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const db = await getDb();
  const updated = await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.userId, auth.user.id),
        eq(notifications.isRead, false),
      ),
    )
    .returning({ id: notifications.id });

  return NextResponse.json(
    { ok: true, updated: updated.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
