import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import {
  BookOpen,
  FileText,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { devotionalPlans, devotionals, sermons } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import {
  getDailyMealStatus,
  lagosToday,
} from "@/lib/devotionals/pipeline";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Badge,
  EmptyState,
  SectionHeader,
} from "@/components/ui/display";
import {
  FormField,
  FormMessage,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DailyMealDay } from "@/components/admin/daily-meal-day";
import {
  createPlan,
  deletePlan,
  generatePlanNow,
  quickPost,
  updatePlan,
} from "./actions";

export const metadata: Metadata = { title: "Daily Meal" };
export const dynamic = "force-dynamic";

const tabs = [
  { key: "plans", label: "Daily Meals" },
  { key: "quick", label: "Quick Post" },
  { key: "new", label: "New plan" },
] as const;

function displayDate(value: string) {
  return formatDate(new Date(`${value}T12:00:00+01:00`));
}

function statusTone(status: string) {
  if (status === "published") return "success" as const;
  if (status === "scheduled") return "brand" as const;
  if (status === "rejected") return "neutral" as const;
  if (status === "failed") return "gold" as const;
  return "gold" as const;
}

export default async function AdminDevotionalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    sermonId?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/devotionals");
  const params = await searchParams;
  const tab =
    params.tab === "new" ? "new" : params.tab === "quick" ? "quick" : "plans";
  const db = await getDb();

  const [plans, days, sermonList, mealStatus] = await Promise.all([
    db
      .select({
        plan: devotionalPlans,
        sermonTitle: sermons.title,
      })
      .from(devotionalPlans)
      .leftJoin(sermons, eq(sermons.id, devotionalPlans.sermonId))
      .orderBy(desc(devotionalPlans.createdAt)),
    db.select().from(devotionals).orderBy(asc(devotionals.publishDate)),
    db
      .select({
        id: sermons.id,
        title: sermons.title,
        contentText: sermons.contentText,
        isArchived: sermons.isArchived,
      })
      .from(sermons)
      .where(eq(sermons.isArchived, false))
      .orderBy(desc(sermons.createdAt)),
    getDailyMealStatus(db),
  ]);

  const daysByPlan = new Map<string, typeof days>();
  for (const day of days) {
    if (!day.planId) continue;
    daysByPlan.set(day.planId, [...(daysByPlan.get(day.planId) ?? []), day]);
  }
  const standaloneDays = days.filter((day) => !day.planId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Daily bread
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Daily Meal</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Generate, review and publish the Daily Meal. AI drafts are editable
            before approval. Scheduled days publish at 6:00 AM Lagos time.
          </p>
        </div>
        <Link href="/admin/ai-settings" prefetch>
          <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800 active:scale-[0.98] active:opacity-80">
            AI settings
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      </div>

      {params.saved ? (
        <FormMessage tone="success">{params.saved}</FormMessage>
      ) : null}
      {params.error ? <FormMessage>{params.error}</FormMessage> : null}

      {mealStatus.failedToday > 0 ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
          <p className="font-semibold">
            Daily Meal generation failed {mealStatus.failedToday}{" "}
            {mealStatus.failedToday === 1 ? "time" : "times"} today.
          </p>
          {mealStatus.lastFailure ? (
            <p className="mt-1 break-words">{mealStatus.lastFailure}</p>
          ) : null}
          {mealStatus.lastFailureAt ? (
            <p className="mt-1 text-xs text-red-700/70">
              Last failure: {formatDateTime(mealStatus.lastFailureAt)}
            </p>
          ) : null}
          <p className="mt-2">
            Check the AI key and credit in{" "}
            <Link href="/admin/ai-settings" prefetch className="underline">
              AI settings
            </Link>
            . Automatic retries stop after 3 failures per day; use Generate
            missing to retry manually.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={`/admin/devotionals?tab=${item.key}`}
            prefetch
            className={
              tab === item.key
                ? "inline-flex min-h-11 items-center rounded-2xl border border-brand-700 bg-brand-700 px-4 text-sm font-semibold text-cream"
                : "inline-flex min-h-11 items-center rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold text-charcoal/70"
            }
          >
            {item.key === "new" ? (
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            ) : null}
            {item.key === "quick" ? (
              <FileText className="mr-1.5 h-4 w-4" aria-hidden="true" />
            ) : null}
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "quick" ? (
        <section className="surface p-5 sm:p-6">
          <SectionHeader
            title="Quick Post"
            description="Paste a message or upload a document. The AI fills the Daily Meal template using only that material."
          />
          <form action={quickPost} className="mt-4 space-y-4">
            <FormField label="Source material" htmlFor="material">
              <Textarea
                id="material"
                name="material"
                className="min-h-56"
                placeholder="Paste the sermon notes, teaching outline or message here..."
              />
            </FormField>
            <FormField
              label="Or upload a document"
              htmlFor="quick-file"
              hint="TXT, MD, DOCX or PDF. The file is read but not stored."
            >
              <Input
                id="quick-file"
                name="file"
                type="file"
                accept=".txt,.md,.docx,.pdf,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Publish date" htmlFor="quick-date">
                <Input
                  id="quick-date"
                  name="publishDate"
                  type="date"
                  defaultValue={lagosToday()}
                  required
                />
              </FormField>
              <div className="grid gap-2">
                <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
                  <input type="checkbox" name="notifyMembers" defaultChecked />
                  Notify members when published
                </label>
                <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
                  <input type="checkbox" name="showOnHome" defaultChecked />
                  Show on Home when published
                </label>
              </div>
            </div>
            <SubmitButton pendingLabel="Generating draft...">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Generate draft
            </SubmitButton>
            <p className="text-xs leading-5 text-charcoal/50">
              The draft is saved for review. Nothing is published until you
              approve it or press Publish now.
            </p>
          </form>
        </section>
      ) : null}

      {tab === "new" ? (
        <section className="surface p-5 sm:p-6">
          <SectionHeader
            title="Create a Daily Meal plan"
            description="Select one sermon. The AI uses the extracted sermon text only."
          />
          {sermonList.length ? (
            <form action={createPlan} className="mt-4 space-y-4">
              <FormField label="Sermon" htmlFor="sermonId">
                <Select
                  id="sermonId"
                  name="sermonId"
                  defaultValue={params.sermonId ?? sermonList[0]?.id ?? ""}
                  required
                >
                  {sermonList.map((sermon) => (
                    <option key={sermon.id} value={sermon.id}>
                      {sermon.title}
                      {sermon.contentText ? "" : " - no text yet"}
                    </option>
                  ))}
                </Select>
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Total days" htmlFor="totalDays">
                  <Input
                    id="totalDays"
                    name="totalDays"
                    type="number"
                    min={1}
                    max={31}
                    defaultValue={7}
                    required
                  />
                </FormField>
                <FormField label="Start date" htmlFor="startDate">
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={lagosToday()}
                    required
                  />
                </FormField>
              </div>
              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
                <input type="checkbox" name="autoPublish" defaultChecked />
                Auto-publish each day at 6:00 AM Lagos time
              </label>
              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
                <input type="checkbox" name="generateNow" defaultChecked />
                Generate all days now
              </label>
              <SubmitButton pendingLabel="Creating plan...">
                Create plan
              </SubmitButton>
              <p className="text-xs leading-5 text-charcoal/50">
                Generation can take a moment. If it fails, the plan is saved and
                you can retry from Daily Meals.
              </p>
            </form>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
              title="Add a sermon first"
              description="The Daily Meal generator needs sermon text before it can create a plan."
            />
          )}
        </section>
      ) : null}

      {tab === "plans" ? (
        <div className="space-y-5">
          <section className="space-y-4">
            {plans.length ? (
              plans.map(({ plan, sermonTitle }) => {
                const planDays = daysByPlan.get(plan.id) ?? [];
                const published = planDays.filter(
                  (day) => day.status === "published",
                ).length;
                return (
                  <article key={plan.id} className="surface overflow-hidden">
                    <div className="border-b border-brand-100 p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={statusTone(plan.status)}>
                              {plan.status}
                            </Badge>
                            {plan.isActive ? (
                              <Badge tone="success">Active</Badge>
                            ) : (
                              <Badge tone="neutral">Paused</Badge>
                            )}
                            {plan.autoPublish ? (
                              <Badge tone="brand">Auto-publish 6 AM</Badge>
                            ) : null}
                          </div>
                          <h2 className="mt-2 font-serif text-xl font-semibold">
                            {plan.title}
                          </h2>
                          <p className="mt-1 text-sm text-charcoal/55">
                            {sermonTitle ?? "Sermon removed"} | {planDays.length}
                            /{plan.totalDays} days generated | {published}{" "}
                            published
                          </p>
                          <p className="mt-1 text-xs text-charcoal/45">
                            {plan.startDate
                              ? `${displayDate(plan.startDate)}${
                                  plan.endDate
                                    ? ` - ${displayDate(plan.endDate)}`
                                    : ""
                                }`
                              : "Start date not set"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <form action={generatePlanNow}>
                            <input type="hidden" name="id" value={plan.id} />
                            <SubmitButton
                              variant="outline"
                              size="sm"
                              pendingLabel="Generating..."
                            >
                              <Wand2 className="h-4 w-4" aria-hidden="true" />
                              Generate missing
                            </SubmitButton>
                          </form>
                          <form action={deletePlan}>
                            <input type="hidden" name="id" value={plan.id} />
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

                      <details className="mt-3 border-t border-brand-100 pt-3">
                        <summary className="min-h-11 cursor-pointer text-sm font-semibold text-brand-800">
                          Plan settings
                        </summary>
                        <form
                          action={updatePlan}
                          className="mt-3 grid gap-3 sm:grid-cols-2"
                        >
                          <input type="hidden" name="id" value={plan.id} />
                          <FormField
                            label="Total days"
                            htmlFor={`days-${plan.id}`}
                          >
                            <Input
                              id={`days-${plan.id}`}
                              name="totalDays"
                              type="number"
                              min={1}
                              max={31}
                              defaultValue={plan.totalDays}
                            />
                          </FormField>
                          <FormField
                            label="Start date"
                            htmlFor={`start-${plan.id}`}
                          >
                            <Input
                              id={`start-${plan.id}`}
                              name="startDate"
                              type="date"
                              defaultValue={plan.startDate ?? lagosToday()}
                            />
                          </FormField>
                          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-3 text-sm font-semibold">
                            <input
                              type="checkbox"
                              name="autoPublish"
                              defaultChecked={plan.autoPublish}
                            />
                            Auto-publish at 6 AM
                          </label>
                          <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-3 text-sm font-semibold">
                            <input
                              type="checkbox"
                              name="isActive"
                              defaultChecked={plan.isActive}
                            />
                            Active plan
                          </label>
                          <div className="sm:col-span-2">
                            <SubmitButton size="sm" pendingLabel="Saving...">
                              Save plan settings
                            </SubmitButton>
                          </div>
                        </form>
                      </details>
                    </div>

                    {planDays.length ? (
                      <div className="divide-y divide-brand-100">
                        {planDays.map((day) => (
                          <DailyMealDay
                            key={day.id}
                            day={day}
                            returnTab="plans"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 sm:p-5">
                        <p className="rounded-2xl border border-dashed border-brand-200 p-4 text-sm text-charcoal/55">
                          No days generated yet. Use Generate missing above.
                        </p>
                      </div>
                    )}
                  </article>
                );
              })
            ) : (
              <EmptyState
                icon={<Sparkles className="h-6 w-6" aria-hidden="true" />}
                title="No Daily Meal plans yet"
                description="Start with a sermon, or use Quick Post to create a single day."
              />
            )}
          </section>

          <section className="surface overflow-hidden">
            <div className="border-b border-brand-100 p-4 sm:p-5">
              <SectionHeader
                title="Other Daily Meals"
                description="Quick Posts and days that are not attached to a plan."
                className="mb-0"
              />
            </div>
            {standaloneDays.length ? (
              <div className="divide-y divide-brand-100">
                {standaloneDays.map((day) => (
                  <DailyMealDay key={day.id} day={day} returnTab="plans" />
                ))}
              </div>
            ) : (
              <div className="p-4 sm:p-5">
                <p className="rounded-2xl border border-dashed border-brand-200 p-4 text-sm text-charcoal/55">
                  No standalone Daily Meals yet. Use{" "}
                  <Link
                    href="/admin/devotionals?tab=quick"
                    prefetch
                    className="font-semibold text-brand-800 underline"
                  >
                    Quick Post
                  </Link>{" "}
                  to create one.
                </p>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
