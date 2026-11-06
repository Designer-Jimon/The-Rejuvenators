import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  PauseCircle,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { getDb } from "@/lib/db";
import {
  devotionalPlans,
  devotionals,
  sermons,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { DEVOTIONAL_STATUSES, PERMISSIONS } from "@/lib/constants";
import { lagosToday } from "@/lib/devotionals/pipeline";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  EmptyState,
  SectionHeader,
} from "@/components/ui/display";
import { FormField, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  createPlan,
  deletePlan,
  generatePlanNow,
  publishDevotionalAction,
  regenerateDay,
  saveDevotional,
  unpublishDevotionalAction,
  updatePlan,
} from "./actions";

export const metadata: Metadata = { title: "Devotionals" };
export const dynamic = "force-dynamic";

const tabs = [
  { key: "plans", label: "Plans & days" },
  { key: "new", label: "New plan" },
];

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
  const tab = params.tab === "new" ? "new" : "plans";
  const db = await getDb();

  const [plans, days, sermonList] = await Promise.all([
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
  ]);

  const daysByPlan = new Map<string, typeof days>();
  for (const day of days) {
    if (!day.planId) continue;
    daysByPlan.set(day.planId, [...(daysByPlan.get(day.planId) ?? []), day]);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Daily bread
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Devotionals</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Create a plan from a sermon, edit every generated day, then schedule
            or publish it. Auto-publish sends the day at 5:00 AM Lagos time.
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

      <div className="flex gap-1.5">
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
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "new" ? (
        <section className="surface p-5 sm:p-6">
          <SectionHeader
            title="Create a devotional plan"
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
                      {sermon.contentText ? "" : " — no text yet"}
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
                <input
                  type="checkbox"
                  name="autoPublish"
                  defaultChecked
                />
                Auto-publish each day at 5:00 AM Lagos time
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
                you can retry from Plans & days.
              </p>
            </form>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-6 w-6" aria-hidden="true" />}
              title="Add a sermon first"
              description="The devotional generator needs sermon text before it can create a plan."
            />
          )}
        </section>
      ) : null}

      {tab === "plans" ? (
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
                            <Badge tone="brand">Auto-publish 5 AM</Badge>
                          ) : null}
                        </div>
                        <h2 className="mt-2 font-serif text-xl font-semibold">
                          {plan.title}
                        </h2>
                        <p className="mt-1 text-sm text-charcoal/55">
                          {sermonTitle ?? "Sermon removed"} · {planDays.length}/
                          {plan.totalDays} days generated · {published} published
                        </p>
                        <p className="mt-1 text-xs text-charcoal/45">
                          {plan.startDate
                            ? `${displayDate(plan.startDate)}${
                                plan.endDate
                                  ? ` – ${displayDate(plan.endDate)}`
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
                        <FormField label="Total days" htmlFor={`days-${plan.id}`}>
                          <Input
                            id={`days-${plan.id}`}
                            name="totalDays"
                            type="number"
                            min={1}
                            max={31}
                            defaultValue={plan.totalDays}
                          />
                        </FormField>
                        <FormField label="Start date" htmlFor={`start-${plan.id}`}>
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
                          Auto-publish
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
                        <div key={day.id} className="p-4 sm:p-5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge tone={statusTone(day.status)}>
                                  Day {day.dayNumber ?? "—"} · {day.status}
                                </Badge>
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal/50">
                                  <CalendarDays
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  {displayDate(day.publishDate)}
                                </span>
                              </div>
                              <h3 className="mt-2 font-serif text-lg font-semibold">
                                {day.title}
                              </h3>
                              <p className="mt-1 text-sm text-charcoal/55">
                                {day.scripture ?? "Scripture not set"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {day.status === "published" ? (
                                <form action={unpublishDevotionalAction}>
                                  <input type="hidden" name="id" value={day.id} />
                                  <SubmitButton
                                    variant="outline"
                                    size="sm"
                                    pendingLabel="Unpublishing..."
                                  >
                                    <PauseCircle
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                    Unpublish
                                  </SubmitButton>
                                </form>
                              ) : (
                                <form action={publishDevotionalAction}>
                                  <input type="hidden" name="id" value={day.id} />
                                  <SubmitButton
                                    size="sm"
                                    pendingLabel="Publishing..."
                                  >
                                    <Play
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                    Publish now
                                  </SubmitButton>
                                </form>
                              )}
                            </div>
                          </div>

                          <details className="mt-3">
                            <summary className="min-h-11 cursor-pointer text-sm font-semibold text-brand-800">
                              View & edit day
                            </summary>
                            <form action={saveDevotional} className="mt-3 space-y-3">
                              <input type="hidden" name="id" value={day.id} />
                              <FormField label="Title" htmlFor={`title-${day.id}`}>
                                <Input
                                  id={`title-${day.id}`}
                                  name="title"
                                  defaultValue={day.title}
                                  maxLength={200}
                                  required
                                />
                              </FormField>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <FormField
                                  label="Publish date"
                                  htmlFor={`date-${day.id}`}
                                >
                                  <Input
                                    id={`date-${day.id}`}
                                    name="publishDate"
                                    type="date"
                                    defaultValue={day.publishDate}
                                    required
                                  />
                                </FormField>
                                <FormField
                                  label="Status"
                                  htmlFor={`status-${day.id}`}
                                >
                                  <Select
                                    id={`status-${day.id}`}
                                    name="status"
                                    defaultValue={day.status}
                                  >
                                    {DEVOTIONAL_STATUSES.map((status) => (
                                      <option key={status} value={status}>
                                        {status}
                                      </option>
                                    ))}
                                  </Select>
                                </FormField>
                              </div>
                              <FormField
                                label="Scripture"
                                htmlFor={`scripture-${day.id}`}
                              >
                                <Input
                                  id={`scripture-${day.id}`}
                                  name="scripture"
                                  defaultValue={day.scripture ?? ""}
                                />
                              </FormField>
                              <FormField
                                label="Bible verses"
                                htmlFor={`verses-${day.id}`}
                              >
                                <Textarea
                                  id={`verses-${day.id}`}
                                  name="bibleVerses"
                                  defaultValue={day.bibleVerses ?? ""}
                                  className="min-h-24"
                                />
                              </FormField>
                              <FormField label="Body" htmlFor={`body-${day.id}`}>
                                <Textarea
                                  id={`body-${day.id}`}
                                  name="body"
                                  defaultValue={day.body}
                                  className="min-h-64"
                                  required
                                />
                              </FormField>
                              <FormField
                                label="Declaration"
                                htmlFor={`declaration-${day.id}`}
                              >
                                <Textarea
                                  id={`declaration-${day.id}`}
                                  name="declaration"
                                  defaultValue={day.declaration ?? ""}
                                  className="min-h-24"
                                />
                              </FormField>
                              <FormField
                                label="Prayer points"
                                htmlFor={`prayer-${day.id}`}
                              >
                                <Textarea
                                  id={`prayer-${day.id}`}
                                  name="prayerPoints"
                                  defaultValue={day.prayerPoints ?? ""}
                                  className="min-h-32"
                                />
                              </FormField>
                              <div className="flex flex-wrap gap-2">
                                <SubmitButton
                                  size="sm"
                                  pendingLabel="Saving..."
                                >
                                  <CheckCircle2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  Save day
                                </SubmitButton>
                              </div>
                            </form>
                            {day.status !== "published" ? (
                              <form action={regenerateDay} className="mt-2">
                                <input type="hidden" name="id" value={day.id} />
                                <SubmitButton
                                  variant="outline"
                                  size="sm"
                                  pendingLabel="Regenerating..."
                                >
                                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                                  Regenerate this day
                                </SubmitButton>
                              </form>
                            ) : null}
                          </details>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 sm:p-5">
                      <p className="rounded-2xl border border-dashed border-brand-200 p-4 text-sm text-charcoal/55">
                        No days generated yet. Use “Generate missing” above.
                      </p>
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <EmptyState
              icon={<Sparkles className="h-6 w-6" aria-hidden="true" />}
              title="No devotional plans yet"
              description="Start with a sermon, then create a plan for the days ahead."
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
