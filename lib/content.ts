import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";
import {
  DEFAULT_CONTENT_BLOCKS,
  type ContentBlockDefault,
} from "@/lib/constants";

export type ContentBlock = ContentBlockDefault & {
  id?: string;
  imageKey?: string | null;
};

export async function getContentMap() {
  const db = await getDb();
  const rows = await db
    .select()
    .from(contentBlocks)
    .where(eq(contentBlocks.isPublished, true));

  const map: Record<string, ContentBlock> = { ...DEFAULT_CONTENT_BLOCKS };
  for (const row of rows) {
    map[row.key] = {
      id: row.id,
      key: row.key,
      title: row.title,
      body: row.body,
      imageKey: row.imageKey,
    };
  }
  return map;
}

export function getBlock(
  map: Record<string, ContentBlock>,
  key: string,
): ContentBlock {
  return (
    map[key] ??
    DEFAULT_CONTENT_BLOCKS[key] ?? { key, title: "", body: "" }
  );
}

export type ActivitySchedule = {
  day?: string;
  time?: string;
  venue?: string;
  summary: string;
};

export function parseActivitySchedule(
  description: string | null | undefined,
): ActivitySchedule {
  const result: ActivitySchedule = { summary: description?.trim() ?? "" };
  if (!description) return result;

  const summaryLines: string[] = [];
  for (const rawLine of description.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^(day|time|venue)\s*:\s*(.+)$/i);
    if (!match) {
      if (line) summaryLines.push(line);
      continue;
    }
    const field = match[1].toLowerCase();
    if (field === "day") result.day = match[2].trim();
    if (field === "time") result.time = match[2].trim();
    if (field === "venue") result.venue = match[2].trim();
  }
  result.summary = summaryLines.join("\n").trim();
  return result;
}
