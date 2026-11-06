"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import {
  aiSettings,
  devotionalPlans,
  devotionals,
  sermons,
} from "@/lib/db/schema";
import { requireAdmin, requirePermission } from "@/lib/auth/authorize";
import {
  NOTIFICATION_TYPES,
  PERMISSIONS,
  ROLES,
} from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { AI_SETTING_KEYS, AI_PROVIDERS } from "@/lib/devotionals/config";
import {
  generatePlanDays,
  lagosToday,
  publishDueDevotional,
  regenerateDevotionalDay,
  runDailyDevotional,
  unpublishDevotional,
} from "@/lib/devotionals/pipeline";
import { notifyMembers } from "@/lib/notifications";

function back(
  tab: string,
  key: "saved" | "error",
  message: string,
): never {
  redirect(`/admin/devotionals?tab=${tab}&${key}=${encodeURIComponent(message)}`);
}

function auditPath() {
  revalidatePath("/admin/devotionals");
  revalidatePath("/devotionals");
  revalidatePath("/");
}

export async function createPlan(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const sermonId = String(formData.get("sermonId") ?? "");
  const totalDays = Number(formData.get("totalDays") ?? 7);
  const startDate = String(formData.get("startDate") ?? "") || lagosToday();
  const autoPublish = formData.get("autoPublish") === "on";
  const generateNow = formData.get("generateNow") === "on";

  if (!sermonId) back("new", "error", "Choose a sermon.");
  if (!Number.isInteger(totalDays) || totalDays < 1 || totalDays > 31) {
    back("new", "error", "Total days must be between 1 and 31.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    back("new", "error", "Choose a valid start date.");
  }

  const db = await getDb();
  const [sermon] = await db
    .select()
    .from(sermons)
    .where(eq(sermons.id, sermonId))
    .limit(1);
  if (!sermon) back("new", "error", "Sermon not found.");

  await db
    .update(devotionalPlans)
    .set({ isActive: false })
    .where(eq(devotionalPlans.isActive, true));
  const id = crypto.randomUUID();
  await db.insert(devotionalPlans).values({
    id,
    title: `${sermon.title} — ${totalDays} day plan`,
    description: `Generated from ${sermon.title}.`,
    sermonId,
    startDate,
    endDate: null,
    totalDays,
    status: "draft",
    autoPublish,
    createdBy: user.id,
    isActive: true,
  });
  await logAudit({
    actorId: user.id,
    action: "devotional_plan.created",
    entityType: "devotional_plan",
    entityId: id,
    details: `Created ${totalDays}-day plan from ${sermon.title}.`,
  });
  auditPath();

  if (!generateNow) {
    back("plans", "saved", "Plan created. Generate the days when you are ready.");
  }

  try {
    const { env } = await getCloudflareContext({ async: true });
    const created = await generatePlanDays({ db, env, planId: id });
    back(
      "plans",
      "saved",
      `Plan created and ${created} day${created === 1 ? "" : "s"} generated.`,
    );
  } catch (error) {
    back(
      "plans",
      "error",
      `Plan created, but generation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

export async function updatePlan(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const id = String(formData.get("id") ?? "");
  const totalDays = Number(formData.get("totalDays") ?? 0);
  const startDate = String(formData.get("startDate") ?? "");
  const autoPublish = formData.get("autoPublish") === "on";
  const isActive = formData.get("isActive") === "on";
  if (!Number.isInteger(totalDays) || totalDays < 1 || totalDays > 31) {
    back("plans", "error", "Total days must be between 1 and 31.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    back("plans", "error", "Choose a valid start date.");
  }
  const db = await getDb();
  if (isActive) {
    await db
      .update(devotionalPlans)
      .set({ isActive: false })
      .where(and(eq(devotionalPlans.isActive, true), ne(devotionalPlans.id, id)));
  }
  await db
    .update(devotionalPlans)
    .set({ totalDays, startDate, autoPublish, isActive })
    .where(eq(devotionalPlans.id, id));
  await logAudit({
    actorId: user.id,
    action: "devotional_plan.updated",
    entityType: "devotional_plan",
    entityId: id,
    details: "Updated devotional plan settings.",
  });
  auditPath();
  back("plans", "saved", "Plan updated.");
}

export async function deletePlan(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  const published = await db
    .select({ id: devotionals.id })
    .from(devotionals)
    .where(and(eq(devotionals.planId, id), eq(devotionals.status, "published")))
    .limit(1);
  if (published.length) {
    back("plans", "error", "Unpublish the generated days before deleting this plan.");
  }
  await db.delete(devotionals).where(eq(devotionals.planId, id));
  await db.delete(devotionalPlans).where(eq(devotionalPlans.id, id));
  await logAudit({
    actorId: user.id,
    action: "devotional_plan.deleted",
    entityType: "devotional_plan",
    entityId: id,
    details: "Deleted devotional plan and unpublished days.",
  });
  auditPath();
  back("plans", "saved", "Plan deleted.");
}

export async function generatePlanNow(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const planId = String(formData.get("id") ?? "");
  const db = await getDb();
  try {
    const { env } = await getCloudflareContext({ async: true });
    const created = await generatePlanDays({ db, env, planId });
    await logAudit({
      actorId: user.id,
      action: "devotional_plan.generated",
      entityType: "devotional_plan",
      entityId: planId,
      details: `Generated ${created} devotional days.`,
    });
    auditPath();
    back(
      "plans",
      "saved",
      created
        ? `${created} day${created === 1 ? "" : "s"} generated.`
        : "All days are already generated.",
    );
  } catch (error) {
    back(
      "plans",
      "error",
      error instanceof Error ? error.message : "Generation failed.",
    );
  }
}

export async function saveDevotional(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const publishDate = String(formData.get("publishDate") ?? "");
  const status = String(formData.get("status") ?? "draft");
  if (!title || !body) back("plans", "error", "Title and body are required.");
  if (!["draft", "scheduled", "published", "rejected"].includes(status)) {
    back("plans", "error", "Choose a valid status.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
    back("plans", "error", "Choose a valid publish date.");
  }

  const db = await getDb();
  const [existing] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.id, id))
    .limit(1);
  if (!existing) back("plans", "error", "Devotional not found.");
  const [clash] = await db
    .select({ id: devotionals.id })
    .from(devotionals)
    .where(
      and(eq(devotionals.publishDate, publishDate), ne(devotionals.id, id)),
    )
    .limit(1);
  if (clash) back("plans", "error", "Another devotional already uses that date.");

  const now = new Date();
  const publishing = status === "published" && existing.status !== "published";
  await db
    .update(devotionals)
    .set({
      title: title.slice(0, 200),
      body,
      scripture:
        String(formData.get("scripture") ?? "").trim().slice(0, 400) || null,
      bibleVerses:
        String(formData.get("bibleVerses") ?? "").trim().slice(0, 4000) || null,
      declaration:
        String(formData.get("declaration") ?? "").trim().slice(0, 1000) || null,
      prayerPoints:
        String(formData.get("prayerPoints") ?? "").trim().slice(0, 4000) || null,
      publishDate,
      status: status as typeof existing.status,
      isPublished: status === "published",
      publishedAt: status === "published" ? now : null,
      lastError: null,
    })
    .where(eq(devotionals.id, id));
  if (publishing) {
    await notifyMembers({
      type: NOTIFICATION_TYPES.devotionalPublished,
      title: `Today's devotional: ${title}`,
      body: body.replace(/\s+/g, " ").slice(0, 160),
      link: `/devotionals/${publishDate}`,
    });
  }
  await logAudit({
    actorId: user.id,
    action: "devotional.updated",
    entityType: "devotional",
    entityId: id,
    details: `Updated devotional “${title}” (${status}).`,
  });
  auditPath();
  back("plans", "saved", publishing ? "Devotional published." : "Devotional saved.");
}

export async function publishDevotionalAction(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  const published = await publishDueDevotional(db, id);
  await logAudit({
    actorId: user.id,
    action: "devotional.published",
    entityType: "devotional",
    entityId: id,
    details: published ? "Published devotional." : "Devotional was already published.",
  });
  auditPath();
  back("plans", "saved", published ? "Devotional published." : "Already published.");
}

export async function unpublishDevotionalAction(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  await unpublishDevotional(db, id);
  await logAudit({
    actorId: user.id,
    action: "devotional.unpublished",
    entityType: "devotional",
    entityId: id,
    details: "Unpublished devotional.",
  });
  auditPath();
  back("plans", "saved", "Devotional unpublished.");
}

export async function regenerateDay(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const id = String(formData.get("id") ?? "");
  try {
    const db = await getDb();
    const { env } = await getCloudflareContext({ async: true });
    const day = await regenerateDevotionalDay({
      db,
      env,
      devotionalId: id,
    });
    await logAudit({
      actorId: user.id,
      action: "devotional.regenerated",
      entityType: "devotional",
      entityId: id,
      details: `Regenerated devotional “${day.title}”.`,
    });
    auditPath();
    back("plans", "saved", "Day regenerated as a draft.");
  } catch (error) {
    back(
      "plans",
      "error",
      error instanceof Error ? error.message : "Regeneration failed.",
    );
  }
}

export async function runAiTest() {
  const user = await requireAdmin();
  if (!user.roles.includes(ROLES.superAdmin)) {
    redirect("/admin?denied=1");
  }
  const db = await getDb();
  const { env } = await getCloudflareContext({ async: true });
  const result = await runDailyDevotional({
    db,
    env,
    trigger: "manual",
    triggeredBy: user.id,
  });
  await logAudit({
    actorId: user.id,
    action: "devotional.run_test",
    entityType: "ai_settings",
    details: result.message,
  });
  revalidatePath("/admin/ai-settings");
  revalidatePath("/admin/devotionals");
  redirect(
    `/admin/ai-settings?${result.status === "failed" ? "error" : "saved"}=${encodeURIComponent(
      result.message,
    )}`,
  );
}

export async function saveAiSettings(formData: FormData) {
  const user = await requireAdmin();
  if (!user.roles.includes(ROLES.superAdmin)) {
    redirect("/admin?denied=1");
  }
  const provider = String(formData.get("provider") ?? "openai");
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const systemPrompt = String(formData.get("systemPrompt") ?? "").trim();
  const temperature = Number(formData.get("temperature") ?? 0.7);
  if (!AI_PROVIDERS.includes(provider as "openai" | "custom")) {
    redirect("/admin/ai-settings?error=Choose%20a%20valid%20provider.");
  }
  try {
    new URL(baseUrl);
  } catch {
    redirect("/admin/ai-settings?error=Enter%20a%20valid%20base%20URL.");
  }
  if (!model || systemPrompt.length < 20) {
    redirect("/admin/ai-settings?error=Add%20a%20model%20and%20system%20prompt.");
  }
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    redirect("/admin/ai-settings?error=Temperature%20must%20be%20between%200%20and%202.");
  }

  const db = await getDb();
  const now = new Date();
  const values = [
    [AI_SETTING_KEYS.provider, provider],
    [AI_SETTING_KEYS.baseUrl, baseUrl],
    [AI_SETTING_KEYS.model, model],
    [AI_SETTING_KEYS.systemPrompt, systemPrompt],
    [AI_SETTING_KEYS.temperature, String(temperature)],
  ];
  for (const [key, value] of values) {
    await db
      .insert(aiSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: aiSettings.key,
        set: { value, updatedAt: now },
      });
  }
  await logAudit({
    actorId: user.id,
    action: "ai_settings.updated",
    entityType: "ai_settings",
    details: "Updated AI provider configuration.",
  });
  revalidatePath("/admin/ai-settings");
  redirect("/admin/ai-settings?saved=AI%20settings%20saved.");
}
