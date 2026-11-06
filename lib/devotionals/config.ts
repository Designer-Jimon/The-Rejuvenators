import { inArray } from "drizzle-orm";
import type { AppDb } from "../db";
import { aiSettings } from "../db/schema";

export const AI_SETTING_KEYS = {
  provider: "provider",
  baseUrl: "base_url",
  model: "model",
  systemPrompt: "system_prompt",
  temperature: "temperature",
  lastRunAt: "last_run_at",
  lastRunStatus: "last_run_status",
  lastRunError: "last_run_error",
} as const;

export const AI_PROVIDERS = ["openai", "custom"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const DEFAULT_SYSTEM_PROMPT = `You write Christ-centred daily devotionals for It Is Finished Revival Outreach.
Use only the sermon material provided. Do not invent church facts, dates, people or events.
Handle Scripture accurately and reverently. Write warm, clear, faith-building English for a mobile reader.
Return only valid JSON in the shape requested. Every field must be present and non-empty.`;

export type AiSettings = {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  systemPrompt: string;
  temperature: number;
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  temperature: 0.7,
};

function provider(value: string): AiProvider {
  return AI_PROVIDERS.includes(value as AiProvider)
    ? (value as AiProvider)
    : "openai";
}

export async function readAiSettings(db: AppDb): Promise<AiSettings> {
  const rows = await db
    .select()
    .from(aiSettings)
    .where(
      inArray(aiSettings.key, [
        AI_SETTING_KEYS.provider,
        AI_SETTING_KEYS.baseUrl,
        AI_SETTING_KEYS.model,
        AI_SETTING_KEYS.systemPrompt,
        AI_SETTING_KEYS.temperature,
      ]),
    );
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const temperature = Number(values.get(AI_SETTING_KEYS.temperature));
  return {
    provider: provider(values.get(AI_SETTING_KEYS.provider) ?? ""),
    baseUrl:
      values.get(AI_SETTING_KEYS.baseUrl)?.trim() ||
      DEFAULT_AI_SETTINGS.baseUrl,
    model:
      values.get(AI_SETTING_KEYS.model)?.trim() || DEFAULT_AI_SETTINGS.model,
    systemPrompt:
      values.get(AI_SETTING_KEYS.systemPrompt)?.trim() ||
      DEFAULT_AI_SETTINGS.systemPrompt,
    temperature:
      Number.isFinite(temperature) && temperature >= 0 && temperature <= 2
        ? temperature
        : DEFAULT_AI_SETTINGS.temperature,
  };
}

export async function recordAiRun(
  db: AppDb,
  status: "completed" | "failed",
  error?: string | null,
) {
  const now = new Date();
  await db
    .insert(aiSettings)
    .values({
      key: AI_SETTING_KEYS.lastRunAt,
      value: now.toISOString(),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiSettings.key,
      set: { value: now.toISOString(), updatedAt: now },
    });
  await db
    .insert(aiSettings)
    .values({
      key: AI_SETTING_KEYS.lastRunStatus,
      value: status,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiSettings.key,
      set: { value: status, updatedAt: now },
    });
  await db
    .insert(aiSettings)
    .values({
      key: AI_SETTING_KEYS.lastRunError,
      value: error ?? "",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiSettings.key,
      set: { value: error ?? "", updatedAt: now },
    });
}
