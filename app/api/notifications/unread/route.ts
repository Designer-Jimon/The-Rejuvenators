import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/authorize";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (auth.response) return auth.response;

  return NextResponse.json(
    { count: auth.user.unreadNotifications },
    { headers: { "Cache-Control": "no-store" } },
  );
}
