import {
  CHURCH_NAME,
  CHURCH_TAGLINE,
  DAILY_MEAL_PDF_PREFIX,
} from "@/lib/branding";
import { formatDate } from "@/lib/utils";
import { buildDailyMealPdf } from "./pdf";
import { getPdfLogo } from "./pdf-logo";

type PdfDevotional = {
  title: string;
  body: string;
  scripture: string | null;
  bibleVerses: string | null;
  declaration: string | null;
  prayerPoints: string | null;
  publishDate: string;
};

export async function dailyMealPdfResponse(
  devotional: PdfDevotional,
  options?: { cache?: boolean },
) {
  const pdf = await buildDailyMealPdf({
    churchName: CHURCH_NAME,
    tagline: CHURCH_TAGLINE,
    dateLabel: formatDate(
      new Date(`${devotional.publishDate}T12:00:00+01:00`),
    ),
    title: devotional.title,
    scripture: devotional.scripture,
    bibleVerses: devotional.bibleVerses,
    body: devotional.body,
    declaration: devotional.declaration,
    prayerPoints: devotional.prayerPoints,
    logo: await getPdfLogo(),
  });
  const filename = `${DAILY_MEAL_PDF_PREFIX}-${devotional.publishDate}.pdf`;
  const body = new Blob([
    pdf.buffer.slice(
      pdf.byteOffset,
      pdf.byteOffset + pdf.byteLength,
    ) as ArrayBuffer,
  ]);
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control":
        options?.cache === false
          ? "private, no-store"
          : "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
