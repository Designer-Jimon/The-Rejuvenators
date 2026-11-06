import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { Mic2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { sermons } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";
import { EmptyState, PageHero } from "@/components/ui/display";

export const metadata: Metadata = { title: "Sermons" };
export const dynamic = "force-dynamic";

export default async function SermonsPage() {
  const db = await getDb();
  const list = await db
    .select()
    .from(sermons)
    .where(and(eq(sermons.isPublished, true), eq(sermons.isArchived, false)))
    .orderBy(desc(sermons.preachedAt));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Listen"
        title="Messages and sermons"
        description="Catch up on messages from the house. Audio and video links are published by the church team."
      />

      <div className="content-auto mt-8">
        {list.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((sermon) => (
              <article key={sermon.id} className="surface p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                  {formatDate(sermon.preachedAt)}
                </p>
                <h2 className="mt-2 font-serif text-xl font-semibold">
                  {sermon.title}
                </h2>
                <p className="mt-1 text-sm text-charcoal/55">
                  {sermon.speaker || "Speaker to be confirmed"}
                </p>
                {sermon.bibleReferences ? (
                  <p className="mt-2 text-sm font-semibold text-brand-800">
                    {sermon.bibleReferences}
                  </p>
                ) : null}
                {sermon.isDevotionalSource ? (
                  <p className="mt-2 inline-flex rounded-full bg-gold-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gold-900">
                    Devotional series source
                  </p>
                ) : null}
                {sermon.summary ? (
                  <p className="mt-3 text-sm leading-7 text-charcoal/70">
                    {sermon.summary}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {sermon.audioUrl ? (
                    <a
                      href={sermon.audioUrl}
                      className="text-sm font-semibold text-brand-800 hover:underline"
                    >
                      Listen
                    </a>
                  ) : null}
                  {sermon.videoUrl ? (
                    <a
                      href={sermon.videoUrl}
                      className="text-sm font-semibold text-brand-800 hover:underline"
                    >
                      Watch
                    </a>
                  ) : null}
                  {sermon.notes ? (
                    <a
                      href={sermon.notes}
                      className="text-sm font-semibold text-brand-800 hover:underline"
                    >
                      Notes
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Mic2 className="h-6 w-6" aria-hidden="true" />}
            title="No sermons published yet"
            description="Published messages will appear here with audio, video and notes when available."
          />
        )}
      </div>
    </div>
  );
}
