import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { devotionals } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { dailyMealPdfResponse } from "@/lib/devotionals/pdf-response";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/devotionals");
  const { id } = await params;
  const db = await getDb();
  const [devotional] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.id, id))
    .limit(1);
  if (!devotional) {
    return new Response("Not found", { status: 404 });
  }
  return dailyMealPdfResponse(devotional, { cache: false });
}
