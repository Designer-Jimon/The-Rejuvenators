import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const db = await getDb();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const start = new Date(now - (now % windowMs));
  const expires = new Date(start.getTime() + windowMs);

  const [row] = await db
    .insert(rateLimits)
    .values({
      key,
      count: 1,
      windowStart: start,
      expiresAt: expires,
    })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} = ${start} then ${rateLimits.count} + 1 else 1 end`,
        windowStart: start,
        expiresAt: expires,
      },
    })
    .returning({ count: rateLimits.count });

  const current = Number(row?.count ?? 1);
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    retryAfter: Math.max(1, Math.ceil((expires.getTime() - now) / 1000)),
  };
}

export function rateLimitKey(scope: string, identifier: string) {
  return `${scope}:${identifier}`.slice(0, 240);
}

export function clientIpFromHeaders(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}
