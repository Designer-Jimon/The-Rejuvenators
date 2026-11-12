import { and, asc, count, desc, eq, gte, inArray, isNull, lte, ne } from "drizzle-orm";
import type { AppDb } from "../db";
import {
  devotionalPlans,
  devotionalRuns,
  devotionals,
  memberProfiles,
  notificationPreferences,
  notifications,
  sermons,
  users,
} from "../db/schema";
import { NOTIFICATION_TYPES } from "../constants";
import { generateDevotionalDays, type SermonSource } from "./ai";
import { readAiSettings, recordAiRun } from "./config";

export function lagosToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const DAILY_MEAL_PUBLISH_MINUTES = 6 * 60;

export function lagosClock() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour,
    minute,
    minutes: hour * 60 + minute,
  };
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

function source(sermon: {
  title: string;
  speaker: string | null;
  bibleReferences: string | null;
  summary: string | null;
  contentText: string | null;
}): SermonSource {
  return {
    title: sermon.title,
    speaker: sermon.speaker,
    bibleReferences: sermon.bibleReferences,
    summary: sermon.summary,
    contentText: sermon.contentText,
  };
}

function requireKey(env: CloudflareEnv) {
  const key = env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Run: wrangler secret put OPENAI_API_KEY",
    );
  }
  return key;
}

async function notifyPublished(
  db: AppDb,
  devotional: { title: string; body: string; publishDate: string },
) {
  const recipients = await db
    .selectDistinct({ userId: memberProfiles.userId })
    .from(memberProfiles)
    .innerJoin(users, eq(users.id, memberProfiles.userId))
    .where(
      and(
        eq(memberProfiles.registrationStatus, "approved"),
        eq(memberProfiles.memberStatus, "active"),
        eq(users.status, "active"),
      ),
    );
  const ids = recipients.map((row) => row.userId);
  if (!ids.length) return;

  const preferences = await db
    .select({
      userId: notificationPreferences.userId,
      inApp: notificationPreferences.inApp,
    })
    .from(notificationPreferences)
    .where(
      and(
        inArray(notificationPreferences.userId, ids),
        eq(
          notificationPreferences.type,
          NOTIFICATION_TYPES.devotionalPublished,
        ),
      ),
    );
  const blocked = new Set(
    preferences.filter((row) => !row.inApp).map((row) => row.userId),
  );
  const targets = ids.filter((id) => !blocked.has(id));
  if (!targets.length) return;

  await db.insert(notifications).values(
    targets.map((userId) => ({
      id: crypto.randomUUID(),
      userId,
      type: NOTIFICATION_TYPES.devotionalPublished,
      title: `Today's Daily Meal: ${devotional.title}`,
      body: devotional.body.replace(/\s+/g, " ").slice(0, 160),
      link: `/devotionals/${devotional.publishDate}`,
      isRead: false,
      createdAt: new Date(),
    })),
  );
}

async function publish(
  db: AppDb,
  devotional: {
    id: string;
    title: string;
    body: string;
    publishDate: string;
    notifyMembers: boolean;
  },
  options: { requireScheduled?: boolean } = {},
) {
  const now = new Date();
  const conditions = [
    eq(devotionals.id, devotional.id),
    isNull(devotionals.archivedAt),
    ne(devotionals.status, "published"),
  ];
  if (options.requireScheduled) {
    conditions.push(eq(devotionals.status, "scheduled"));
  }
  const updated = await db
    .update(devotionals)
    .set({
      status: "published",
      isPublished: true,
      publishedAt: now,
      archivedAt: null,
      lastError: null,
    })
    .where(and(...conditions))
    .returning({ id: devotionals.id });

  if (!updated.length) return false;
  if (devotional.notifyMembers) {
    await notifyPublished(db, devotional);
  }
  return true;
}

async function activePlan(db: AppDb) {
  const rows = await db
    .select({
      plan: devotionalPlans,
      sermon: sermons,
    })
    .from(devotionalPlans)
    .innerJoin(sermons, eq(sermons.id, devotionalPlans.sermonId))
    .where(eq(devotionalPlans.isActive, true))
    .orderBy(desc(devotionalPlans.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export type RunResult = {
  status: "published" | "skipped" | "failed";
  message: string;
  devotionalId?: string;
};

async function failedRunsForDay(db: AppDb, planId: string, runDate: string) {
  const [row] = await db
    .select({ value: count() })
    .from(devotionalRuns)
    .where(
      and(
        eq(devotionalRuns.planId, planId),
        eq(devotionalRuns.runDate, runDate),
        eq(devotionalRuns.status, "failed"),
      ),
    );
  return Number(row?.value ?? 0);
}

export async function getDailyMealStatus(
  db: AppDb,
  runDate = lagosToday(),
) {
  const [[failed], lastFailure] = await Promise.all([
    db
      .select({ value: count() })
      .from(devotionalRuns)
      .where(
        and(
          eq(devotionalRuns.runDate, runDate),
          eq(devotionalRuns.status, "failed"),
        ),
      ),
    db
      .select({
        error: devotionalRuns.error,
        startedAt: devotionalRuns.startedAt,
        finishedAt: devotionalRuns.finishedAt,
      })
      .from(devotionalRuns)
      .where(eq(devotionalRuns.status, "failed"))
      .orderBy(desc(devotionalRuns.startedAt))
      .limit(1),
  ]);

  return {
    runDate,
    failedToday: Number(failed?.value ?? 0),
    lastFailure: lastFailure[0]?.error ?? null,
    lastFailureAt:
      lastFailure[0]?.finishedAt ?? lastFailure[0]?.startedAt ?? null,
  };
}

export async function runDailyDevotional(input: {
  db: AppDb;
  env: CloudflareEnv;
  trigger: "cron" | "manual";
  triggeredBy?: string | null;
}): Promise<RunResult> {
  const clock = lagosClock();
  const isCron = input.trigger === "cron";
  if (isCron && clock.minutes < DAILY_MEAL_PUBLISH_MINUTES) {
    return {
      status: "skipped",
      message: "The Daily Meal publishes at 6:00 AM Lagos time.",
    };
  }

  const runDate = clock.date;
  const planRow = await activePlan(input.db);
  if (!planRow) {
    return { status: "skipped", message: "No active Daily Meal plan." };
  }

  const { plan, sermon } = planRow;
  const startDate = plan.startDate ?? runDate;
  const endDate = plan.endDate ?? addDays(startDate, plan.totalDays - 1);
  const dayNumber = daysBetween(startDate, runDate) + 1;

  let existing: typeof devotionals.$inferSelect | undefined;
  let shouldPublish = false;
  let shouldGenerate = false;

  if (isCron) {
    if (runDate < startDate || dayNumber < 1) {
      return { status: "skipped", message: "The plan has not started yet." };
    }
    if (runDate > endDate || dayNumber > plan.totalDays) {
      return { status: "skipped", message: "The active plan has finished." };
    }

    [existing] = await input.db
      .select()
      .from(devotionals)
      .where(eq(devotionals.publishDate, runDate))
      .limit(1);

    if (existing) {
      if (existing.archivedAt) {
        return {
          status: "skipped",
          message:
            "Today's Daily Meal is archived. Restore it from Admin when ready.",
          devotionalId: existing.id,
        };
      }
      if (existing.status === "published") {
        return {
          status: "skipped",
          message: "Today's Daily Meal is already published.",
          devotionalId: existing.id,
        };
      }
      if (plan.autoPublish && existing.status === "scheduled") {
        shouldPublish = true;
      } else {
        return {
          status: "skipped",
          message:
            "Today's Daily Meal is waiting for review (auto-publish is off).",
          devotionalId: existing.id,
        };
      }
    } else {
      if (!plan.autoPublish) {
        return {
          status: "skipped",
          message:
            "Auto-publish is off. Generate today's Daily Meal manually when ready.",
        };
      }
      shouldGenerate = true;
      if (!input.env.OPENAI_API_KEY?.trim()) {
        return {
          status: "skipped",
          message:
            "OPENAI_API_KEY is not configured. Add it in Admin > AI settings.",
        };
      }
      const failed = await failedRunsForDay(input.db, plan.id, runDate);
      if (failed >= 3) {
        return {
          status: "skipped",
          message:
            "Daily Meal generation failed 3 times today. Check the AI key and credit in Admin, then run it manually.",
        };
      }
    }
  }

  if (isCron && !shouldPublish && !shouldGenerate) {
    return {
      status: "skipped",
      message: "Nothing to do for today's Daily Meal.",
    };
  }

  const runId = crypto.randomUUID();
  await input.db.insert(devotionalRuns).values({
    id: runId,
    planId: plan.id,
    sermonId: sermon.id,
    runDate,
    status: "running",
    totalDays: plan.totalDays,
    trigger: input.trigger,
    triggeredBy: input.triggeredBy ?? null,
    startedAt: new Date(),
  });

  try {
    if (!isCron) {
      [existing] = await input.db
        .select()
        .from(devotionals)
        .where(eq(devotionals.publishDate, runDate))
        .limit(1);

      if (existing) {
        if (existing.archivedAt) {
          await finishRun(input.db, runId, "completed", 0);
          return {
            status: "skipped",
            message:
              "Today's Daily Meal is archived. Restore it from Admin when ready.",
            devotionalId: existing.id,
          };
        }
        if (existing.status === "published") {
          await finishRun(input.db, runId, "completed", 1);
          return {
            status: "skipped",
            message: "Today's Daily Meal is already published.",
            devotionalId: existing.id,
          };
        }
        if (plan.autoPublish && existing.status === "scheduled") {
          const published = await publish(input.db, existing, {
            requireScheduled: true,
          });
          await finishRun(input.db, runId, "completed", published ? 1 : 0);
          if (!published) {
            return {
              status: "skipped",
              message: "Today's Daily Meal is already published.",
              devotionalId: existing.id,
            };
          }
          await recordAiRun(input.db, "completed");
          return {
            status: "published",
            message: `Published "${existing.title}".`,
            devotionalId: existing.id,
          };
        }
        await finishRun(input.db, runId, "completed", 1);
        return {
          status: "skipped",
          message:
            "Today's Daily Meal is waiting for review (auto-publish is off).",
          devotionalId: existing.id,
        };
      }

      if (dayNumber < 1 || dayNumber > plan.totalDays) {
        await finishRun(input.db, runId, "completed", 0);
        return {
          status: "skipped",
          message:
            dayNumber > plan.totalDays
              ? "The active plan has finished."
              : "The plan has not started yet.",
        };
      }
    } else if (shouldPublish && existing) {
      const published = await publish(input.db, existing, {
        requireScheduled: true,
      });
      await finishRun(input.db, runId, "completed", published ? 1 : 0);
      if (!published) {
        return {
          status: "skipped",
          message: "Today's Daily Meal is already published.",
          devotionalId: existing.id,
        };
      }
      await recordAiRun(input.db, "completed");
      return {
        status: "published",
        message: `Published "${existing.title}".`,
        devotionalId: existing.id,
      };
    }

    const settings = await readAiSettings(input.db);
    const generated = await generateDevotionalDays({
      sermon: source(sermon),
      totalDays: plan.totalDays,
      startDate,
      settings,
      apiKey: requireKey(input.env),
      fromDay: dayNumber,
      toDay: dayNumber,
    });
    const day = generated[0];
    if (!day) throw new Error("The AI did not return today's devotional.");

    const now = new Date();
    const status = plan.autoPublish ? "published" : "scheduled";
    const id = crypto.randomUUID();
    const inserted = await input.db
      .insert(devotionals)
      .values({
        id,
        planId: plan.id,
        sourceSermonId: sermon.id,
        dayNumber: day.dayNumber,
        title: day.title,
        body: day.body,
        scripture: day.scripture,
        bibleVerses: day.bibleVerses,
        declaration: day.declaration,
        prayerPoints: day.prayerPoints,
        status,
        publishDate: runDate,
        isPublished: plan.autoPublish,
        notifyMembers: true,
        showOnHome: true,
        generatedAt: now,
        publishedAt: plan.autoPublish ? now : null,
        createdAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: devotionals.id });

    if (!inserted.length) {
      await finishRun(input.db, runId, "completed", 0);
      return {
        status: "skipped",
        message: "Today's Daily Meal was created by another run.",
      };
    }

    await input.db
      .update(devotionalPlans)
      .set({
        status: plan.autoPublish ? "published" : "scheduled",
        startDate,
        endDate: plan.endDate ?? addDays(startDate, plan.totalDays - 1),
      })
      .where(eq(devotionalPlans.id, plan.id));

    if (plan.autoPublish) {
      await notifyPublished(input.db, {
        title: day.title,
        body: day.body,
        publishDate: runDate,
      });
    }

    await finishRun(input.db, runId, "completed", 1);
    await recordAiRun(input.db, "completed");
    return {
      status: plan.autoPublish ? "published" : "skipped",
      message: plan.autoPublish
        ? `Generated and published "${day.title}".`
        : `Generated "${day.title}". Review it before publishing.`,
      devotionalId: id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Devotional generation failed.";
    await finishRun(input.db, runId, "failed", 0, message).catch(() => {});
    await recordAiRun(input.db, "failed", message).catch(() => {});
    return { status: "failed", message };
  }
}

async function finishRun(
  db: AppDb,
  id: string,
  status: "completed" | "failed",
  completedDays: number,
  error?: string,
) {
  await db
    .update(devotionalRuns)
    .set({
      status,
      completedDays,
      error: error ?? null,
      finishedAt: new Date(),
    })
    .where(eq(devotionalRuns.id, id));
}

export async function generatePlanDays(input: {
  db: AppDb;
  env: CloudflareEnv;
  planId: string;
  fromDay?: number;
}) {
  const [row] = await input.db
    .select({ plan: devotionalPlans, sermon: sermons })
    .from(devotionalPlans)
    .innerJoin(sermons, eq(sermons.id, devotionalPlans.sermonId))
    .where(eq(devotionalPlans.id, input.planId))
    .limit(1);
  if (!row) throw new Error("Plan or sermon not found.");
  if (!row.sermon.contentText?.trim()) {
    throw new Error(
      "This sermon has no text. Add sermon text before generating a plan.",
    );
  }

  const startDate = row.plan.startDate ?? lagosToday();
  const existing = await input.db
    .select({ dayNumber: devotionals.dayNumber })
    .from(devotionals)
    .where(eq(devotionals.planId, row.plan.id));
  const existingDays = new Set(
    existing.map((item) => item.dayNumber).filter((day) => day !== null),
  );
  const fromDay = input.fromDay ?? 1;
  const dates = Array.from(
    { length: row.plan.totalDays },
    (_, index) => addDays(startDate, index),
  );
  const occupied = await input.db
    .select({ publishDate: devotionals.publishDate })
    .from(devotionals)
    .where(
      and(
        gte(devotionals.publishDate, dates[0]),
        lte(devotionals.publishDate, dates[dates.length - 1]),
        ne(devotionals.planId, row.plan.id),
      ),
    );
  const taken = new Set(occupied.map((item) => item.publishDate));

  const settings = await readAiSettings(input.db);
  let created = 0;
  for (let start = fromDay; start <= row.plan.totalDays; start += 7) {
    const end = Math.min(start + 6, row.plan.totalDays);
    const actionable = Array.from(
      { length: end - start + 1 },
      (_, index) => start + index,
    ).filter((day) => !existingDays.has(day));
    if (!actionable.length) continue;
    const first = actionable[0];
    const last = actionable[actionable.length - 1];
    const days = await generateDevotionalDays({
      sermon: source(row.sermon),
      totalDays: row.plan.totalDays,
      startDate,
      settings,
      apiKey: requireKey(input.env),
      fromDay: first,
      toDay: last,
    });
    const now = new Date();
    for (const day of days) {
      if (!actionable.includes(day.dayNumber)) continue;
      const publishDate = addDays(startDate, day.dayNumber - 1);
      if (taken.has(publishDate)) continue;
      await input.db
        .insert(devotionals)
        .values({
          id: crypto.randomUUID(),
          planId: row.plan.id,
          sourceSermonId: row.sermon.id,
          dayNumber: day.dayNumber,
          title: day.title,
          body: day.body,
          scripture: day.scripture,
          bibleVerses: day.bibleVerses,
          declaration: day.declaration,
          prayerPoints: day.prayerPoints,
          status: row.plan.autoPublish ? "scheduled" : "draft",
          publishDate,
          isPublished: false,
          notifyMembers: true,
          showOnHome: true,
          generatedAt: now,
          createdAt: now,
        })
        .onConflictDoNothing();
      created += 1;
    }
  }

  await input.db
    .update(devotionalPlans)
    .set({
      startDate,
      endDate: addDays(startDate, row.plan.totalDays - 1),
      status: row.plan.autoPublish ? "scheduled" : "draft",
      isActive: true,
    })
    .where(eq(devotionalPlans.id, row.plan.id));
  await recordAiRun(input.db, "completed");
  return created;
}

export async function regenerateDevotionalDay(input: {
  db: AppDb;
  env: CloudflareEnv;
  devotionalId: string;
}) {
  const [row] = await input.db
    .select({ devotional: devotionals, plan: devotionalPlans, sermon: sermons })
    .from(devotionals)
    .innerJoin(devotionalPlans, eq(devotionalPlans.id, devotionals.planId))
    .innerJoin(sermons, eq(sermons.id, devotionals.sourceSermonId))
    .where(eq(devotionals.id, input.devotionalId))
    .limit(1);
  if (!row) throw new Error("Devotional not found.");
  if (row.devotional.status === "published") {
    throw new Error("Unpublish this day before regenerating it.");
  }
  if (!row.devotional.dayNumber) {
    throw new Error("This devotional has no day number.");
  }

  const settings = await readAiSettings(input.db);
  const days = await generateDevotionalDays({
    sermon: source(row.sermon),
    totalDays: row.plan.totalDays,
    startDate: row.plan.startDate,
    settings,
    apiKey: requireKey(input.env),
    fromDay: row.devotional.dayNumber,
    toDay: row.devotional.dayNumber,
  });
  const day = days[0];
  if (!day) throw new Error("The AI did not return the devotional.");
  await input.db
    .update(devotionals)
    .set({
      title: day.title,
      body: day.body,
      scripture: day.scripture,
      bibleVerses: day.bibleVerses,
      declaration: day.declaration,
      prayerPoints: day.prayerPoints,
      status: "draft",
      generatedAt: new Date(),
      lastError: null,
    })
    .where(eq(devotionals.id, row.devotional.id));
  await recordAiRun(input.db, "completed");
  return day;
}

export type PublishDueResult = {
  published: number;
  skipped: number;
  failed: number;
  errors: string[];
};

function devotionalDueAt(publishDate: string) {
  return Date.parse(`${publishDate}T06:00:00+01:00`);
}

function isDevotionalDue(publishDate: string, now = Date.now()) {
  const dueAt = devotionalDueAt(publishDate);
  return Number.isFinite(dueAt) && now >= dueAt;
}

async function revalidatePublishedDevotionals() {
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
    revalidatePath("/devotionals");
    revalidatePath("/devotionals/[date]", "page");
    revalidatePath("/member");
  } catch (error) {
    console.warn("Daily Meal public revalidation skipped:", error);
  }
}

export async function publishDueDevotional(
  db: AppDb,
): Promise<PublishDueResult> {
  const rows = await db
    .select()
    .from(devotionals)
    .where(
      and(
        eq(devotionals.status, "scheduled"),
        isNull(devotionals.archivedAt),
        lte(devotionals.publishDate, lagosToday()),
      ),
    )
    .orderBy(asc(devotionals.publishDate));

  const result: PublishDueResult = {
    published: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const row of rows) {
    if (!isDevotionalDue(row.publishDate)) {
      result.skipped += 1;
      continue;
    }
    try {
      const published = await publish(db, row, { requireScheduled: true });
      if (published) {
        result.published += 1;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      result.failed += 1;
      result.errors.push(
        `${row.publishDate}: ${
          error instanceof Error ? error.message : "Publish failed."
        }`,
      );
    }
  }

  if (result.published > 0) {
    await revalidatePublishedDevotionals();
  }
  return result;
}

export async function publishDevotionalNow(
  db: AppDb,
  devotionalId: string,
) {
  const [row] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.id, devotionalId))
    .limit(1);
  if (!row) throw new Error("Daily Meal not found.");
  if (row.archivedAt) {
    throw new Error("Restore this Daily Meal before publishing it.");
  }
  if (row.status === "published") return false;

  const today = lagosToday();
  if (row.publishDate > today) {
    const [clash] = await db
      .select({ id: devotionals.id })
      .from(devotionals)
      .where(
        and(
          eq(devotionals.publishDate, today),
          ne(devotionals.id, devotionalId),
        ),
      )
      .limit(1);
    if (clash) {
      throw new Error(
        "Today already has a Daily Meal. Unpublish or archive it first.",
      );
    }
    await db
      .update(devotionals)
      .set({ publishDate: today })
      .where(eq(devotionals.id, devotionalId));
    row.publishDate = today;
  }

  return publish(db, row);
}

export async function unpublishDevotional(
  db: AppDb,
  devotionalId: string,
) {
  await db
    .update(devotionals)
    .set({
      status: "draft",
      isPublished: false,
      publishedAt: null,
      archivedAt: null,
    })
    .where(eq(devotionals.id, devotionalId));
}
