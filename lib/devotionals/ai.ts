import { z } from "zod";
import type { AiSettings } from "./config";

export type SermonSource = {
  title: string;
  speaker?: string | null;
  bibleReferences?: string | null;
  summary?: string | null;
  contentText?: string | null;
};

export type GeneratedDevotionalDay = {
  dayNumber: number;
  title: string;
  scripture: string;
  bibleVerses: string;
  body: string;
  declaration: string;
  prayerPoints: string;
};

const textOrList = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    Array.isArray(value)
      ? value.map((item) => item.trim()).filter(Boolean).join("\n")
      : value.trim(),
  )
  .pipe(z.string().min(1));

const daySchema = z.object({
  dayNumber: z.coerce.number().int().min(1),
  title: z.string().trim().min(1),
  scripture: z.string().trim().min(1),
  bibleVerses: textOrList,
  body: z.string().trim().min(1),
  declaration: z.string().trim().min(1),
  prayerPoints: textOrList,
});

const responseSchema = z.union([
  z.object({ days: z.array(daySchema).min(1) }),
  z.array(daySchema).min(1),
]);

function sermonMaterial(sermon: SermonSource) {
  const content = (sermon.contentText ?? "").trim();
  if (!content) {
    throw new Error(
      "This sermon has no sermon text. Add or extract the text before generating devotionals.",
    );
  }
  return [
    `Sermon title: ${sermon.title}`,
    sermon.speaker ? `Speaker: ${sermon.speaker}` : "",
    sermon.bibleReferences ? `Bible references: ${sermon.bibleReferences}` : "",
    sermon.summary ? `Sermon summary: ${sermon.summary}` : "",
    "Sermon text:",
    content.slice(0, 28000),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPrompt(input: {
  sermon: SermonSource;
  fromDay: number;
  toDay: number;
  totalDays: number;
  startDate?: string | null;
}) {
  const count = input.toDay - input.fromDay + 1;
  return `Prepare ${count} daily devotional${
    count === 1 ? "" : "s"
  } from this sermon.

${sermonMaterial(input.sermon)}

Plan length: ${input.totalDays} day${input.totalDays === 1 ? "" : "s"}${
    input.startDate ? `, starting ${input.startDate}` : ""
  }.
Generate day numbers ${input.fromDay} to ${input.toDay} only.

Return JSON exactly in this shape:
{"days":[{"dayNumber":1,"title":"...","scripture":"John 3:16","bibleVerses":"...","body":"...","declaration":"...","prayerPoints":"1. ...\\n2. ..."}]}

Rules:
- Keep each body to 250-400 words, devotional and Christ-centred.
- Use the selected sermon as the source. Do not add facts about the church or people that are not in the sermon.
- Quote Scripture carefully. If unsure of exact wording, give the reference and paraphrase clearly.
- declaration is one short faith declaration.
- prayerPoints contains 3-5 numbered prayer points.
- No HTML, no markdown fences. Return JSON only.`;
}

function parseResponse(content: string) {
  const cleaned = content
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const arrayStart = cleaned.indexOf("[");
  const beginsWithArray =
    arrayStart !== -1 && (start === -1 || arrayStart < start);
  const first = beginsWithArray ? arrayStart : start;
  const last = beginsWithArray
    ? cleaned.lastIndexOf("]")
    : cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("The AI response was not valid JSON.");
  }
  const parsed = responseSchema.safeParse(
    JSON.parse(cleaned.slice(first, last + 1)),
  );
  if (!parsed.success) {
    throw new Error(
      `The AI response was incomplete: ${parsed.error.issues[0]?.message ?? "invalid shape"}.`,
    );
  }
  return Array.isArray(parsed.data) ? parsed.data : parsed.data.days;
}

async function requestDays(input: {
  sermon: SermonSource;
  fromDay: number;
  toDay: number;
  totalDays: number;
  startDate?: string | null;
  settings: AiSettings;
  apiKey: string;
}) {
  const baseUrl = input.settings.baseUrl.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/chat/completions")
    ? baseUrl
    : `${baseUrl}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.settings.model,
      temperature: input.settings.temperature,
      messages: [
        { role: "system", content: input.settings.systemPrompt },
        { role: "user", content: buildPrompt(input) },
      ],
    }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };
  if (!response.ok) {
    throw new Error(
      payload.error?.message || `AI request failed (${response.status}).`,
    );
  }
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("The AI provider returned an empty response.");
  return parseResponse(content);
}

export async function generateDevotionalDays(input: {
  sermon: SermonSource;
  totalDays: number;
  startDate?: string | null;
  settings: AiSettings;
  apiKey: string;
  fromDay?: number;
  toDay?: number;
}) {
  const fromDay = input.fromDay ?? 1;
  const toDay = input.toDay ?? input.totalDays;
  if (fromDay < 1 || toDay < fromDay || toDay > input.totalDays) {
    throw new Error("Choose a valid day range to generate.");
  }

  const days: GeneratedDevotionalDay[] = [];
  for (let start = fromDay; start <= toDay; start += 7) {
    const end = Math.min(start + 6, toDay);
    const batch = await requestDays({
      ...input,
      fromDay: start,
      toDay: end,
    });
    const expected = end - start + 1;
    if (batch.length !== expected) {
      throw new Error(
        `The AI returned ${batch.length} day${batch.length === 1 ? "" : "s"} instead of ${expected}.`,
      );
    }
    const sorted = [...batch].sort((a, b) => a.dayNumber - b.dayNumber);
    for (let index = 0; index < sorted.length; index += 1) {
      const expectedNumber = start + index;
      if (sorted[index].dayNumber !== expectedNumber) {
        throw new Error("The AI returned the wrong day numbering.");
      }
      days.push(sorted[index]);
    }
  }
  return days;
}
