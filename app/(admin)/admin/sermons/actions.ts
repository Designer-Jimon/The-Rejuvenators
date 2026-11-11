"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { devotionals, sermons } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { generateDailyMealFromMaterial } from "@/lib/devotionals/ai";
import { readAiSettings } from "@/lib/devotionals/config";
import { extractSermonText, sermonFileExtension } from "@/lib/devotionals/extract";
import { lagosToday } from "@/lib/devotionals/pipeline";

const MAX_FILE = 12 * 1024 * 1024;

function done(message: string): never {
  revalidatePath("/admin/sermons");
  revalidatePath("/admin/devotionals");
  revalidatePath("/sermons");
  revalidatePath("/");
  redirect(`/admin/sermons?saved=${encodeURIComponent(message)}`);
}

function fail(message: string): never {
  redirect(`/admin/sermons?error=${encodeURIComponent(message)}`);
}

function dateValue(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T12:00:00+01:00`);
}

export async function saveSermon(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.contentManage, "/admin/sermons");
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file");
  const upload = file instanceof File && file.size > 0 ? file : null;

  if (upload && upload.size > MAX_FILE) {
    fail("Sermon files must be under 12MB.");
  }
  if (upload) {
    const name = upload.name.toLowerCase();
    const allowed =
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".docx") ||
      name.endsWith(".pdf") ||
      allowedMime(upload.type);
    if (!allowed) fail("Upload a TXT, DOCX or PDF file.");
  }

  const db = await getDb();
  const [existing] = id
    ? await db.select().from(sermons).where(eq(sermons.id, id)).limit(1)
    : [null];
  if (id && !existing) fail("Sermon not found.");

  let sourceKey = existing?.sourceFileKey ?? null;
  let sourceName = existing?.sourceFileName ?? null;
  let sourceType = existing?.sourceContentType ?? null;
  let extractionError: string | null = null;
  let extracted = "";
  let title = String(formData.get("title") ?? "").trim();

  if (upload) {
    const bytes = new Uint8Array(await upload.arrayBuffer());
    try {
      extracted = await extractSermonText(upload);
    } catch (error) {
      extractionError =
        error instanceof Error ? error.message : "Text extraction failed.";
    }
    const { env } = await getCloudflareContext({ async: true });
    if (!env.MEDIA) fail("Media storage is not configured.");
    const key = `sermons/${user.id}/${crypto.randomUUID()}.${sermonFileExtension(
      upload,
    )}`;
    await env.MEDIA.put(key, bytes, {
      httpMetadata: { contentType: upload.type || "application/octet-stream" },
    });
    if (existing?.sourceFileKey) {
      await env.MEDIA.delete(existing.sourceFileKey).catch(() => {});
    }
    sourceKey = key;
    sourceName = upload.name;
    sourceType = upload.type || "application/octet-stream";
    if (!title) title = upload.name.replace(/\.[^.]+$/, "").slice(0, 160);
  }

  const manualText = String(formData.get("contentText") ?? "").trim();
  const contentText = manualText || extracted || existing?.contentText || "";
  if (!title) fail("Enter the sermon title.");

  const now = new Date();
  const values = {
    title: title.slice(0, 200),
    speaker: String(formData.get("speaker") ?? "").trim().slice(0, 160) || null,
    preachedAt: dateValue(String(formData.get("preachedAt") ?? "")),
    summary:
      String(formData.get("summary") ?? "").trim().slice(0, 4000) || null,
    bibleReferences:
      String(formData.get("bibleReferences") ?? "").trim().slice(0, 800) || null,
    contentText: contentText.slice(0, 120_000) || null,
    audioUrl: String(formData.get("audioUrl") ?? "").trim().slice(0, 1000) || null,
    videoUrl: String(formData.get("videoUrl") ?? "").trim().slice(0, 1000) || null,
    notes: String(formData.get("notes") ?? "").trim().slice(0, 12000) || null,
    sourceFileKey: sourceKey,
    sourceFileName: sourceName,
    sourceContentType: sourceType,
    extractionError,
    isArchived: formData.get("isArchived") === "on",
    isDevotionalSource: formData.get("isDevotionalSource") === "on",
    isPublished: formData.get("isPublished") === "on",
    updatedAt: now,
  };

  let sermonId = id;
  if (id) {
    await db.update(sermons).set(values).where(eq(sermons.id, id));
  } else {
    sermonId = crypto.randomUUID();
    await db.insert(sermons).values({
      id: sermonId,
      ...values,
      createdAt: now,
    });
  }

  await logAudit({
    actorId: user.id,
    action: id ? "sermon.updated" : "sermon.created",
    entityType: "sermon",
    entityId: sermonId,
    details: `${id ? "Updated" : "Created"} sermon ${values.title}.`,
  });
  done(
    extractionError
      ? `Sermon saved. Text extraction warning: ${extractionError}`
      : id
        ? "Sermon updated."
        : "Sermon added.",
  );
}

export async function deleteSermon(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.contentManage, "/admin/sermons");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  const [sermon] = await db
    .select()
    .from(sermons)
    .where(eq(sermons.id, id))
    .limit(1);
  if (!sermon) fail("Sermon not found.");
  await db.delete(sermons).where(eq(sermons.id, sermon.id));
  if (sermon.sourceFileKey) {
    const { env } = await getCloudflareContext({ async: true });
    await env.MEDIA?.delete(sermon.sourceFileKey).catch(() => {});
  }
  await logAudit({
    actorId: user.id,
    action: "sermon.deleted",
    entityType: "sermon",
    entityId: sermon.id,
    details: `Deleted sermon ${sermon.title}.`,
  });
  done("Sermon deleted.");
}

export async function generateSermonMeal(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.contentManage, "/admin/sermons");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  const [sermon] = await db
    .select()
    .from(sermons)
    .where(eq(sermons.id, id))
    .limit(1);
  if (!sermon) fail("Sermon not found.");
  if (!sermon.contentText?.trim()) {
    fail("This sermon has no text. Add or extract the sermon text first.");
  }

  const publishDate = lagosToday();
  const [clash] = await db
    .select({ id: devotionals.id })
    .from(devotionals)
    .where(eq(devotionals.publishDate, publishDate))
    .limit(1);
  if (clash) {
    fail("Today already has a Daily Meal. Edit or remove it first.");
  }

  const settings = await readAiSettings(db);
  const { env } = await getCloudflareContext({ async: true });
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    fail(
      "OPENAI_API_KEY is not configured. Run: wrangler secret put OPENAI_API_KEY",
    );
  }

  const material = [
    `Sermon title: ${sermon.title}`,
    sermon.speaker ? `Speaker: ${sermon.speaker}` : "",
    sermon.bibleReferences ? `Bible references: ${sermon.bibleReferences}` : "",
    sermon.summary ? `Sermon summary: ${sermon.summary}` : "",
    "Sermon text:",
    sermon.contentText,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const meal = await generateDailyMealFromMaterial({
      material,
      publishDate,
      settings,
      apiKey,
    });
    const now = new Date();
    const devotionalId = crypto.randomUUID();
    await db.insert(devotionals).values({
      id: devotionalId,
      sourceSermonId: sermon.id,
      title: meal.title.slice(0, 200),
      body: meal.body,
      scripture: meal.scripture.slice(0, 400),
      bibleVerses: meal.bibleVerses.slice(0, 4000),
      declaration: meal.declaration.slice(0, 1000),
      prayerPoints: meal.prayerPoints.slice(0, 4000),
      status: "draft",
      publishDate,
      isPublished: false,
      notifyMembers: true,
      showOnHome: true,
      generatedAt: now,
      createdAt: now,
    });
    await logAudit({
      actorId: user.id,
      action: "devotional.generated_from_sermon",
      entityType: "devotional",
      entityId: devotionalId,
      details: `Generated Daily Meal draft "${meal.title}" from sermon ${sermon.title}.`,
    });
    revalidatePath("/admin/devotionals");
    revalidatePath("/devotionals");
    revalidatePath("/");
    done(`Draft created: "${meal.title}". Review it in Daily Meal.`);
  } catch (error) {
    fail(
      `Could not generate the Daily Meal: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

function allowedMime(type: string) {
  return [
    "text/plain",
    "text/markdown",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].includes(type.toLowerCase());
}
