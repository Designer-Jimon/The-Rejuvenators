import type { Metadata } from "next";
import { asc, like, or } from "drizzle-orm";
import { ArrowDown, ArrowUp, HelpCircle, Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { faqs } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/display";
import { FilterSheet } from "@/components/admin/filter-sheet";
import { deleteFaq, moveFaq, saveFaq, toggleFaq } from "./actions";

export const metadata: Metadata = { title: "FAQ" };
export const dynamic = "force-dynamic";

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; q?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/faqs");
  const { saved, error, q } = await searchParams;
  const db = await getDb();
  const term = q?.trim() ?? "";
  const list = await db
    .select()
    .from(faqs)
    .where(
      term
        ? or(like(faqs.question, `%${term}%`), like(faqs.answer, `%${term}%`))
        : undefined,
    )
    .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Content
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">
            Frequently asked questions
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Add the questions visitors ask most and reorder them for the public
            FAQ page.
          </p>
        </div>
        <FilterSheet
          basePath="/admin/faqs"
          current={term}
          placeholder="Search FAQ"
        />
      </div>

      {saved ? <FormMessage tone="success">{saved}</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <details className="surface p-5 sm:p-6">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-serif text-xl font-semibold">
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add FAQ
        </summary>
        <form action={saveFaq} className="mt-4 space-y-4">
          <FaqFields idPrefix="new" defaultSortOrder={list.length + 1} />
          <SubmitButton pendingLabel="Saving FAQ...">Add FAQ</SubmitButton>
        </form>
      </details>

      {list.length ? (
        <div className="space-y-3">
          {list.map((faq, index) => (
            <article key={faq.id} className="surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                  {faq.isPublished ? "Published" : "Inactive"}
                </span>
                <span className="text-xs text-charcoal/45">
                  Order {faq.sortOrder}
                </span>
              </div>
              <h2 className="mt-2 font-serif text-xl font-semibold">
                {faq.question}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-charcoal/65">
                {faq.answer}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={moveFaq}>
                  <input type="hidden" name="id" value={faq.id} />
                  <input type="hidden" name="direction" value="up" />
                  <SubmitButton
                    variant="outline"
                    size="sm"
                    pendingLabel="Moving..."
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    Up
                  </SubmitButton>
                </form>
                <form action={moveFaq}>
                  <input type="hidden" name="id" value={faq.id} />
                  <input type="hidden" name="direction" value="down" />
                  <SubmitButton
                    variant="outline"
                    size="sm"
                    pendingLabel="Moving..."
                    disabled={index === list.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                    Down
                  </SubmitButton>
                </form>
                <form action={toggleFaq}>
                  <input type="hidden" name="id" value={faq.id} />
                  <input
                    type="hidden"
                    name="isPublished"
                    value={faq.isPublished ? "false" : "true"}
                  />
                  <SubmitButton variant="outline" size="sm" pendingLabel="Updating...">
                    {faq.isPublished ? "Deactivate" : "Activate"}
                  </SubmitButton>
                </form>
                <form action={deleteFaq}>
                  <input type="hidden" name="id" value={faq.id} />
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
              <details className="mt-4 border-t border-brand-100 pt-4">
                <summary className="min-h-11 cursor-pointer text-sm font-semibold text-brand-800">
                  Edit FAQ
                </summary>
                <form action={saveFaq} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={faq.id} />
                  <FaqFields idPrefix={faq.id} faq={faq} />
                  <SubmitButton pendingLabel="Saving FAQ...">
                    Save FAQ
                  </SubmitButton>
                </form>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<HelpCircle className="h-6 w-6" aria-hidden="true" />}
          title={term ? "No FAQ matches your search" : "No FAQ yet"}
          description={
            term
              ? "Try a different search term."
              : "Add the first question to help visitors learn about the church."
          }
        />
      )}
    </div>
  );
}

function FaqFields({
  idPrefix,
  faq,
  defaultSortOrder = 0,
}: {
  idPrefix: string;
  faq?: {
    question: string;
    answer: string;
    sortOrder: number;
    isPublished: boolean;
  };
  defaultSortOrder?: number;
}) {
  return (
    <>
      <div>
        <Label htmlFor={`question-${idPrefix}`}>Question</Label>
        <Input
          id={`question-${idPrefix}`}
          name="question"
          defaultValue={faq?.question ?? ""}
          maxLength={400}
          required
        />
      </div>
      <div>
        <Label htmlFor={`answer-${idPrefix}`}>Answer</Label>
        <Textarea
          id={`answer-${idPrefix}`}
          name="answer"
          defaultValue={faq?.answer ?? ""}
          maxLength={8000}
          className="min-h-40"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`order-${idPrefix}`}>Sort order</Label>
          <Input
            id={`order-${idPrefix}`}
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={faq?.sortOrder ?? defaultSortOrder}
          />
        </div>
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={faq?.isPublished ?? true}
          />
          Published on website
        </label>
      </div>
    </>
  );
}
