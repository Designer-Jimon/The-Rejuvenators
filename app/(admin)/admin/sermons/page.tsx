import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import {
  ArrowRight,
  BookOpen,
  Download,
  FileText,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { sermons } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/display";
import {
  FormField,
  FormMessage,
  Input,
  Textarea,
} from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  deleteSermon,
  generateSermonMeal,
  saveSermon,
} from "./actions";

export const metadata: Metadata = { title: "Sermons" };
export const dynamic = "force-dynamic";

function inputDate(value: Date | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export default async function AdminSermonsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/sermons");
  const params = await searchParams;
  const db = await getDb();
  const list = await db.select().from(sermons).orderBy(desc(sermons.createdAt));
  const active = list.filter((sermon) => !sermon.isArchived);
  const archived = list.filter((sermon) => sermon.isArchived);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Pulpit
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Sermon library</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Add a sermon and upload TXT, DOCX or PDF notes. The extracted text is
            what the Daily Meal generator uses.
          </p>
        </div>
        <Link href="/admin/devotionals" prefetch>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800 active:scale-[0.98] active:opacity-80">
            Daily Meal
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      </div>

      {params.saved ? (
        <FormMessage tone="success">{params.saved}</FormMessage>
      ) : null}
      {params.error ? <FormMessage>{params.error}</FormMessage> : null}

      <details className="surface p-5 sm:p-6">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-serif text-xl font-semibold">
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add sermon
        </summary>
        <form action={saveSermon} className="mt-4 space-y-4">
          <SermonFields idPrefix="new" />
          <SubmitButton pendingLabel="Saving sermon...">Add sermon</SubmitButton>
        </form>
      </details>

      {active.length ? (
        <div className="space-y-3">
          {active.map((sermon) => (
            <article key={sermon.id} className="surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                      <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      {sermon.contentText
                        ? `${sermon.contentText.split(/\s+/).length.toLocaleString()} words`
                        : "No sermon text"}
                    </span>
                    {sermon.isDevotionalSource ? (
                      <span className="rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-900">
                        Daily Meal source
                      </span>
                    ) : null}
                    <span className="rounded-full bg-charcoal/5 px-2.5 py-1 text-xs font-semibold text-charcoal/60">
                      {sermon.isPublished ? "Published" : "Hidden"}
                    </span>
                  </div>
                  <h2 className="mt-2 font-serif text-xl font-semibold">
                    {sermon.title}
                  </h2>
                  <p className="mt-1 text-sm text-charcoal/55">
                    {[sermon.speaker, sermon.preachedAt ? formatDate(sermon.preachedAt) : null]
                      .filter(Boolean)
                      .join(" | ") || "Sermon details pending"}
                  </p>
                  {sermon.summary ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-charcoal/65">
                      {sermon.summary}
                    </p>
                  ) : null}
                  {sermon.extractionError ? (
                    <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                      Extraction warning: {sermon.extractionError}
                    </p>
                  ) : null}
                  {sermon.sourceFileKey ? (
                    <a
                      href={`/api/admin/sermons/${sermon.id}/file`}
                      className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {sermon.sourceFileName ?? "Source file"}
                    </a>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sermon.contentText ? (
                      <form action={generateSermonMeal}>
                        <input type="hidden" name="id" value={sermon.id} />
                        <SubmitButton
                          size="sm"
                          pendingLabel="Generating draft..."
                        >
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                          Generate Daily Meal
                        </SubmitButton>
                      </form>
                    ) : (
                      <span className="inline-flex min-h-11 items-center rounded-xl border border-dashed border-brand-200 px-3 text-xs font-semibold text-charcoal/50">
                        Add sermon text to generate
                      </span>
                    )}
                    <Link
                      href={`/admin/devotionals?tab=new&sermonId=${sermon.id}`}
                      prefetch
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-800 active:scale-[0.98] active:opacity-80"
                    >
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      Build a plan
                    </Link>
                    <form action={deleteSermon}>
                      <input type="hidden" name="id" value={sermon.id} />
                      <SubmitButton
                        variant="ghost"
                        size="sm"
                        pendingLabel="Deleting..."
                        className="text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </SubmitButton>
                    </form>
                  </div>
                </div>
                <FileText className="h-8 w-8 text-brand-200" aria-hidden="true" />
              </div>

              <details className="mt-4 border-t border-brand-100 pt-4">
                <summary className="min-h-11 cursor-pointer text-sm font-semibold text-brand-800">
                  Edit sermon
                </summary>
                <form action={saveSermon} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={sermon.id} />
                  <SermonFields idPrefix={sermon.id} sermon={sermon} />
                  <SubmitButton pendingLabel="Saving sermon...">
                    Save sermon
                  </SubmitButton>
                </form>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
          title="No sermons yet"
          description="Add the first sermon or upload sermon notes to begin."
        />
      )}

      {archived.length ? (
        <details className="surface p-4">
          <summary className="min-h-11 cursor-pointer font-semibold">
            Archived sermons ({archived.length})
          </summary>
          <div className="mt-3 space-y-2">
            {archived.map((sermon) => (
              <div
                key={sermon.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand-100 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold">{sermon.title}</p>
                  <p className="text-xs text-charcoal/50">
                    {sermon.speaker ?? "Speaker not set"}
                  </p>
                </div>
                <form action={deleteSermon}>
                  <input type="hidden" name="id" value={sermon.id} />
                  <SubmitButton
                    variant="ghost"
                    size="sm"
                    pendingLabel="Deleting..."
                    className="text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </SubmitButton>
                </form>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function SermonFields({
  idPrefix,
  sermon,
}: {
  idPrefix: string;
  sermon?: {
    title: string;
    speaker: string | null;
    preachedAt: Date | null;
    summary: string | null;
    bibleReferences: string | null;
    contentText: string | null;
    audioUrl: string | null;
    videoUrl: string | null;
    notes: string | null;
    isPublished: boolean;
    isArchived: boolean;
    isDevotionalSource: boolean;
  };
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Title" htmlFor={`title-${idPrefix}`}>
          <Input
            id={`title-${idPrefix}`}
            name="title"
            defaultValue={sermon?.title ?? ""}
            maxLength={200}
            placeholder="Sermon title"
          />
        </FormField>
        <FormField label="Speaker" htmlFor={`speaker-${idPrefix}`}>
          <Input
            id={`speaker-${idPrefix}`}
            name="speaker"
            defaultValue={sermon?.speaker ?? ""}
            maxLength={160}
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Date preached" htmlFor={`date-${idPrefix}`}>
          <Input
            id={`date-${idPrefix}`}
            name="preachedAt"
            type="date"
            defaultValue={inputDate(sermon?.preachedAt ?? null)}
          />
        </FormField>
        <FormField label="Bible references" htmlFor={`refs-${idPrefix}`}>
          <Input
            id={`refs-${idPrefix}`}
            name="bibleReferences"
            defaultValue={sermon?.bibleReferences ?? ""}
            maxLength={800}
            placeholder="e.g. John 3:16; Romans 8:1-4"
          />
        </FormField>
      </div>
      <FormField label="Summary" htmlFor={`summary-${idPrefix}`}>
        <Textarea
          id={`summary-${idPrefix}`}
          name="summary"
          defaultValue={sermon?.summary ?? ""}
          maxLength={4000}
          className="min-h-24"
        />
      </FormField>
      <FormField
        label="Upload sermon file"
        htmlFor={`file-${idPrefix}`}
        hint="TXT, DOCX or PDF up to 12MB. Existing text is kept unless replaced."
      >
        <input
          id={`file-${idPrefix}`}
          name="file"
          type="file"
          accept=".txt,.md,.docx,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="min-h-12 w-full rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-brand-700 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-cream"
        />
      </FormField>
      <FormField
        label="Sermon text"
        htmlFor={`text-${idPrefix}`}
        hint="Paste or edit the text manually. This is the source for the Daily Meal."
      >
        <Textarea
          id={`text-${idPrefix}`}
          name="contentText"
          defaultValue={sermon?.contentText ?? ""}
          className="min-h-56 font-mono text-sm"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Audio URL" htmlFor={`audio-${idPrefix}`}>
          <Input
            id={`audio-${idPrefix}`}
            name="audioUrl"
            type="url"
            defaultValue={sermon?.audioUrl ?? ""}
            placeholder="https://..."
          />
        </FormField>
        <FormField label="Video URL" htmlFor={`video-${idPrefix}`}>
          <Input
            id={`video-${idPrefix}`}
            name="videoUrl"
            type="url"
            defaultValue={sermon?.videoUrl ?? ""}
            placeholder="https://..."
          />
        </FormField>
      </div>
      <FormField label="Private notes" htmlFor={`notes-${idPrefix}`}>
        <Textarea
          id={`notes-${idPrefix}`}
          name="notes"
          defaultValue={sermon?.notes ?? ""}
          maxLength={12000}
          className="min-h-24"
        />
      </FormField>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-3 text-sm font-semibold">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={sermon?.isPublished ?? true}
          />
          Published
        </label>
        <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-3 text-sm font-semibold">
          <input
            type="checkbox"
            name="isDevotionalSource"
            defaultChecked={sermon?.isDevotionalSource ?? false}
          />
          Daily Meal source
        </label>
        <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-3 text-sm font-semibold">
          <input
            type="checkbox"
            name="isArchived"
            defaultChecked={sermon?.isArchived ?? false}
          />
          Archived
        </label>
      </div>
    </>
  );
}
