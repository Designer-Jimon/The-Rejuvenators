import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { devotionals } from "@/lib/db/schema";
import { dailyMealPdfResponse } from "@/lib/devotionals/pdf-response";

export const dynamic = "force-dynamic";

function lagosToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date } = await params;
  const today = lagosToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) {
    return new Response("Not found", { status: 404 });
  }
  const db = await getDb();
  const [devotional] = await db
    .select()
    .from(devotionals)
    .where(
      and(
        eq(devotionals.publishDate, date),
        eq(devotionals.status, "published"),
        eq(devotionals.isPublished, true),
        isNull(devotionals.archivedAt),
        lte(devotionals.publishDate, today),
      ),
    )
    .limit(1);
  if (!devotional) {
    return new Response("Not found", { status: 404 });
  }
  return dailyMealPdfResponse(devotional);
}
