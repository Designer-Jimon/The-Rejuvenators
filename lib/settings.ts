import { cache } from "react";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { CHURCH_LOGO_PATH } from "@/lib/branding";

export const getSettings = cache(async () => {
  const db = await getDb();
  const rows = await db.select().from(siteSettings);
  const values: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    values[row.key] = row.value;
  }
  return values;
});

export async function getSetting(key: string) {
  const settings = await getSettings();
  return settings[key] ?? "";
}

export const getLogoUrl = cache(async () => CHURCH_LOGO_PATH);
