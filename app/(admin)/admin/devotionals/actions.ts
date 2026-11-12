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
import {
  AI_SETTING_KEYS,
  AI_PROVIDERS,
  readAiSettings,
} from "@/lib/devotionals/config";
import {
  generateDailyMealFromMaterial,
  testAiConnection,
} from "@/lib/devotionals/ai";
import { extractSermonText } from "@/lib/devotionals/extract";
import {
  generatePlanDays,
  lagosToday,
  publishDevotionalNow,
  regenerateDevotionalDay,
  runDailyDevotional,
  unpublishDevotional,
} from "@/lib/devotionals/pipeline";
import { notifyMembers } from "@/lib/notifications";

const MAX_FILE = 12 * 1024 * 1024;

function tabFrom(formData: FormData) {
  const value = String(formData.get("returnTab") ?? "plans");
  return value === "quick" || value === "new" ? value : "plans";
}

function back(tab: string, key: "saved" | "error", message: string): never {
  redirect(`/admin/devotionals?tab=${tab}&${key}=${encodeURIComponent(message)}`);
}

function auditPath() {
  revalidatePath("/admin/devotionals");
  revalidatePath("/devotionals");
  revalidatePath("/devotionals/[date]", "page");
  revalidatePath("/member");
  revalidatePath("/");
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
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
  if (!validDate(startDate)) {
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
    title: `${sermon.title} - ${totalDays} day plan`,
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

  let message = "";
  let failed = false;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const created = await generatePlanDays({ db, env, planId: id });
    message = `Plan created and ${created} day${created === 1 ? "" : "s"} generated.`;
  } catch (error) {
    failed = true;
    message = `Plan created, but generation failed: ${
      error instanceof Error ? error.message : "Unknown error"
    }`;
  }
  back("plans", failed ? "error" : "saved", message);
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
  if (!validDate(startDate)) {
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
    details: "Updated Daily Meal plan settings.",
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
    back(
      "plans",
      "error",
      "Unpublish the generated days before deleting this plan.",
    );
  }
  await db.delete(devotionals).where(eq(devotionals.planId, id));
  await db.delete(devotionalPlans).where(eq(devotionalPlans.id, id));
  await logAudit({
    actorId: user.id,
    action: "devotional_plan.deleted",
    entityType: "devotional_plan",
    entityId: id,
    details: "Deleted Daily Meal plan and unpublished days.",
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
  let created = 0;
  let errorMessage = "";
  try {
    const { env } = await getCloudflareContext({ async: true });
    created = await generatePlanDays({ db, env, planId });
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Generation failed.";
  }
  if (errorMessage) {
    back("plans", "error", errorMessage);
  }
  await logAudit({
    actorId: user.id,
    action: "devotional_plan.generated",
    entityType: "devotional_plan",
    entityId: planId,
    details: `Generated ${created} Daily Meal days.`,
  });
  auditPath();
  back(
    "plans",
    "saved",
    created
      ? `${created} day${created === 1 ? "" : "s"} generated.`
      : "All days are already generated.",
  );
}

async function saveDevotionalRecord(formData: FormData, forcedStatus?: string) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const tab = tabFrom(formData);
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const publishDate = String(formData.get("publishDate") ?? "");
  const status = forcedStatus ?? String(formData.get("status") ?? "draft");
  const notify = formData.get("notifyMembers") === "on";
  const showOnHome = formData.get("showOnHome") === "on";
  if (!title || !body) back(tab, "error", "Title and body are required.");
  if (!["draft", "scheduled", "published", "rejected"].includes(status)) {
    back(tab, "error", "Choose a valid status.");
  }
  if (!validDate(publishDate)) {
    back(tab, "error", "Choose a valid publish date.");
  }

  const db = await getDb();
  const [existing] = await db
    .select()
    .from(devotionals)
    .where(eq(devotionals.id, id))
    .limit(1);
  if (!existing) back(tab, "error", "Daily Meal not found.");
  const [clash] = await db
    .select({ id: devotionals.id })
    .from(devotionals)
    .where(
      and(eq(devotionals.publishDate, publishDate), ne(devotionals.id, id)),
    )
    .limit(1);
  if (clash) {
    back(tab, "error", "Another Daily Meal already uses that date.");
  }

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
      notifyMembers: notify,
      showOnHome: showOnHome,
      publishedAt:
        status === "published" ? existing.publishedAt ?? now : null,
      lastError: null,
    })
    .where(eq(devotionals.id, id));
  if (publishing && notify) {
    await notifyMembers({
      type: NOTIFICATION_TYPES.devotionalPublished,
      title: `Today's Daily Meal: ${title}`,
      body: body.replace(/\s+/g, " ").slice(0, 160),
      link: `/devotionals/${publishDate}`,
    });
  }
  await logAudit({
    actorId: user.id,
    action: "devotional.updated",
    entityType: "devotional",
    entityId: id,
    details: `Updated Daily Meal "${title}" (${status}).`,
  });
  auditPath();
  back(tab, "saved", publishing ? "Daily Meal published." : "Daily Meal saved.");
}

export async function saveDevotional(formData: FormData) {
  await saveDevotionalRecord(formData);
}

export async function saveDevotionalDraft(formData: FormData) {
  await saveDevotionalRecord(formData, "draft");
}

export async function approveDevotionalAction(formData: FormData) {
  await saveDevotionalRecord(formData, "scheduled");
}

export async function rejectDevotionalAction(formData: FormData) {
  await saveDevotionalRecord(formData, "rejected");
}

export async function scheduleDevotionalAction(formData: FormData) {
  await saveDevotionalRecord(formData, "scheduled");
}

export async function publishDevotionalAction(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const tab = tabFrom(formData);
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  let published = false;
  let errorMessage = "";
  try {
    published = await publishDevotionalNow(db, id);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Could not publish Daily Meal.";
  }
  if (errorMessage) {
    back(tab, "error", errorMessage);
  }
  await logAudit({
    actorId: user.id,
    action: "devotional.published",
    entityType: "devotional",
    entityId: id,
    details: published
      ? "Published Daily Meal."
      : "Daily Meal was already published.",
  });
  auditPath();
  back(
    tab,
    "saved",
    published ? "Daily Meal published." : "Already published.",
  );
}

export async function unpublishDevotionalAction(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const tab = tabFrom(formData);
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  await unpublishDevotional(db, id);
  await logAudit({
    actorId: user.id,
    action: "devotional.unpublished",
    entityType: "devotional",
    entityId: id,
    details: "Unpublished Daily Meal.",
  });
  auditPath();
  back(tab, "saved", "Daily Meal unpublished.");
}

export async function archiveDevotionalAction(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const tab = tabFrom(formData);
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  await db
    .update(devotionals)
    .set({
      status: "draft",
      isPublished: false,
      publishedAt: null,
      archivedAt: new Date(),
    })
    .where(eq(devotionals.id, id));
  await logAudit({
    actorId: user.id,
    action: "devotional.archived",
    entityType: "devotional",
    entityId: id,
    details: "Archived Daily Meal.",
  });
  auditPath();
  back(tab, "saved", "Daily Meal archived.");
}

export async function restoreDevotionalAction(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const tab = tabFrom(formData);
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  await db
    .update(devotionals)
    .set({ archivedAt: null, status: "draft", isPublished: false })
    .where(eq(devotionals.id, id));
  await logAudit({
    actorId: user.id,
    action: "devotional.restored",
    entityType: "devotional",
    entityId: id,
    details: "Restored Daily Meal from archive.",
  });
  auditPath();
  back(tab, "saved", "Daily Meal restored as a draft.");
}

export async function regenerateDay(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const tab = tabFrom(formData);
  const id = String(formData.get("id") ?? "");
  let regeneratedTitle = "";
  let errorMessage = "";
  try {
    const db = await getDb();
    const { env } = await getCloudflareContext({ async: true });
    const day = await regenerateDevotionalDay({
      db,
      env,
      devotionalId: id,
    });
    regeneratedTitle = day.title;
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Regeneration failed.";
  }
  if (errorMessage) {
    back(tab, "error", errorMessage);
  }
  await logAudit({
    actorId: user.id,
    action: "devotional.regenerated",
    entityType: "devotional",
    entityId: id,
    details: `Regenerated Daily Meal "${regeneratedTitle}".`,
  });
  auditPath();
  back(tab, "saved", "Day regenerated as a draft.");
}

export async function quickPost(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.contentManage,
    "/admin/devotionals",
  );
  const material = String(formData.get("material") ?? "").trim();
  const file = formData.get("file");
  const upload = file instanceof File && file.size > 0 ? file : null;
  const publishDate = String(formData.get("publishDate") ?? "") || lagosToday();
  const notify = formData.get("notifyMembers") === "on";
  const showOnHome = formData.get("showOnHome") === "on";

  if (!validDate(publishDate)) {
    back("quick", "error", "Choose a valid publish date.");
  }
  if (upload && upload.size > MAX_FILE) {
    back("quick", "error", "Uploads must be under 12MB.");
  }

  let extracted = "";
  if (upload) {
    try {
      extracted = await extractSermonText(upload);
    } catch (error) {
      back(
        "quick",
        "error",
        error instanceof Error ? error.message : "Could not read that file.",
      );
    }
  }
  const source = material || extracted;
  if (source.length < 120) {
    back(
      "quick",
      "error",
      "Paste the source text or upload a document with at least a short paragraph.",
    );
  }

  const db = await getDb();
  const [clash] = await db
    .select({ id: devotionals.id })
    .from(devotionals)
    .where(eq(devotionals.publishDate, publishDate))
    .limit(1);
  if (clash) {
    back(
      "quick",
      "error",
      "A Daily Meal already exists for that date. Choose another date.",
    );
  }

  const settings = await readAiSettings(db);
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    back(
      "quick",
      "error",
      "OPENAI_API_KEY is not configured. Add it with: wrangler secret put OPENAI_API_KEY",
    );
  }

  let title = "";
  let errorMessage = "";
  try {
    const meal = await generateDailyMealFromMaterial({
      material: source.slice(0, 28000),
      publishDate,
      settings,
      apiKey,
    });
    const now = new Date();
    const id = crypto.randomUUID();
    await db.insert(devotionals).values({
      id,
      title: meal.title.slice(0, 200),
      body: meal.body,
      scripture: meal.scripture.slice(0, 400),
      bibleVerses: meal.bibleVerses.slice(0, 4000),
      declaration: meal.declaration.slice(0, 1000),
      prayerPoints: meal.prayerPoints.slice(0, 4000),
      status: "draft",
      publishDate,
      isPublished: false,
      notifyMembers: notify,
      showOnHome,
      generatedAt: now,
      createdAt: now,
    });
    title = meal.title;
    await logAudit({
      actorId: user.id,
      action: "devotional.quick_posted",
      entityType: "devotional",
      entityId: id,
      details: `Created Daily Meal draft "${meal.title}" from pasted material.`,
    });
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "The AI could not generate this Daily Meal.";
  }
  if (errorMessage) {
    back("quick", "error", errorMessage);
  }
  auditPath();
  back(
    "plans",
    "saved",
    `Draft created: "${title}". Review it under Other Daily Meals.`,
  );
}

export async function testAiConnectionAction() {
  const user = await requireAdmin();
  if (!user.roles.includes(ROLES.superAdmin)) {
    redirect("/admin?denied=1");
  }
  const db = await getDb();
  const settings = await readAiSettings(db);
  const { env } = await getCloudflareContext({ async: true });
  const key = env.OPENAI_API_KEY?.trim();
  let message = "";
  let failed = false;
  if (!key) {
    message =
      "OPENAI_API_KEY is not configured. Run: wrangler secret put OPENAI_API_KEY";
    failed = true;
  } else {
    try {
      const reply = await testAiConnection({ settings, apiKey: key });
      message = `AI connection OK. Provider replied: ${reply}`;
    } catch (error) {
      message =
        error instanceof Error ? error.message : "AI connection test failed.";
      failed = true;
    }
  }
  await logAudit({
    actorId: user.id,
    action: "ai_settings.connection_test",
    entityType: "ai_settings",
    details: message,
  });
  revalidatePath("/admin/ai-settings");
  redirect(
    `/admin/ai-settings?${failed ? "error" : "saved"}=${encodeURIComponent(message)}`,
  );
}

export async function runAiTest() {
  const user = await requireAdmin();
  if (!user.roles.includes(ROLES.superAdmin)) {
    redirect("/admin?denied=1");
  }
  const db = await getDb();
  const { env } = await getCloudflareContext({ async: true });
  let message = "";
  let failed = false;
  try {
    const result = await runDailyDevotional({
      db,
      env,
      trigger: "manual",
      triggeredBy: user.id,
    });
    message = result.message;
    failed = result.status === "failed";
  } catch (error) {
    message =
      error instanceof Error ? error.message : "The pipeline test could not run.";
    failed = true;
  }
  await logAudit({
    actorId: user.id,
    action: "devotional.run_test",
    entityType: "ai_settings",
    details: message,
  });
  revalidatePath("/admin/ai-settings");
  revalidatePath("/admin/devotionals");
  redirect(
    `/admin/ai-settings?${failed ? "error" : "saved"}=${encodeURIComponent(message)}`,
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
    redirect(
      "/admin/ai-settings?error=Temperature%20must%20be%20between%200%20and%202.",
    );
  }

  const db = await getDb();
  const now = new Date();
  const values: Array<[string, string]> = [
    [AI_SETTING_KEYS.provider, provider],
    [AI_SETTING_KEYS.baseUrl, baseUrl],
    [AI_SETTING_KEYS.model, model],
    [AI_SETTING_KEYS.systemPrompt, systemPrompt],
    [AI_SETTING_KEYS.temperature, String(temperature)],
  ];
  const statements = values.map(([key, value]) =>
    db
      .insert(aiSettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({
        target: aiSettings.key,
        set: { value, updatedAt: now },
      }),
  );
  await db.batch(
    statements as [
      (typeof statements)[number],
      ...(typeof statements)[number][],
    ],
  );
  await logAudit({
    actorId: user.id,
    action: "ai_settings.updated",
    entityType: "ai_settings",
    details: "Updated AI provider configuration.",
  });
  revalidatePath("/admin/ai-settings");
  redirect("/admin/ai-settings?saved=AI%20settings%20saved.");
}
