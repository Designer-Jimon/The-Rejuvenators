import {
  Archive,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  PauseCircle,
  Play,
  RotateCcw,
  Wand2,
  XCircle,
} from "lucide-react";
import type { devotionals } from "@/lib/db/schema";
import { DEVOTIONAL_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/display";
import { FormField, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { DailyMealTemplate } from "@/components/devotionals/daily-meal-template";
import {
  approveDevotionalAction,
  archiveDevotionalAction,
  publishDevotionalAction,
  regenerateDay,
  rejectDevotionalAction,
  restoreDevotionalAction,
  saveDevotional,
  saveDevotionalDraft,
  scheduleDevotionalAction,
  unpublishDevotionalAction,
} from "@/app/(admin)/admin/devotionals/actions";

type Day = typeof devotionals.$inferSelect;

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

export function DailyMealDay({
  day,
  returnTab,
  logoUrl,
}: {
  day: Day;
  returnTab: "plans" | "quick";
  logoUrl?: string | null;
}) {
  const archived = Boolean(day.archivedAt);

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={archived ? "neutral" : statusTone(day.status)}>
              {day.dayNumber ? `Day ${day.dayNumber} - ` : ""}
              {archived ? "archived" : day.status}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-charcoal/50">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {displayDate(day.publishDate)}
            </span>
            {day.showOnHome ? <Badge tone="brand">Home</Badge> : null}
          </div>
          <h3 className="mt-2 font-serif text-lg font-semibold">{day.title}</h3>
          <p className="mt-1 text-sm text-charcoal/55">
            {day.scripture ?? "Scripture not set"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/devotionals/${day.id}/pdf`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-brand-200 bg-white px-3 text-xs font-semibold text-brand-800 active:opacity-70"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            PDF
          </a>
          {archived ? (
            <form action={restoreDevotionalAction}>
              <input type="hidden" name="id" value={day.id} />
              <input type="hidden" name="returnTab" value={returnTab} />
              <SubmitButton
                variant="outline"
                size="sm"
                pendingLabel="Restoring..."
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Restore
              </SubmitButton>
            </form>
          ) : (
            <>
              {day.status === "published" ? (
                <form action={unpublishDevotionalAction}>
                  <input type="hidden" name="id" value={day.id} />
                  <input type="hidden" name="returnTab" value={returnTab} />
                  <SubmitButton
                    variant="outline"
                    size="sm"
                    pendingLabel="Unpublishing..."
                  >
                    <PauseCircle className="h-4 w-4" aria-hidden="true" />
                    Unpublish
                  </SubmitButton>
                </form>
              ) : (
                <form action={publishDevotionalAction}>
                  <input type="hidden" name="id" value={day.id} />
                  <input type="hidden" name="returnTab" value={returnTab} />
                  <SubmitButton size="sm" pendingLabel="Publishing...">
                    <Play className="h-4 w-4" aria-hidden="true" />
                    Publish now
                  </SubmitButton>
                </form>
              )}
              <form action={archiveDevotionalAction}>
                <input type="hidden" name="id" value={day.id} />
                <input type="hidden" name="returnTab" value={returnTab} />
                <SubmitButton
                  variant="ghost"
                  size="sm"
                  pendingLabel="Archiving..."
                  className="text-red-700 hover:bg-red-50"
                >
                  <Archive className="h-4 w-4" aria-hidden="true" />
                  Archive
                </SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>

      <details className="mt-3 border-t border-brand-100 pt-3">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-brand-800">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Preview & edit
        </summary>

        <div className="mt-4">
          <DailyMealTemplate
            className="shadow-none"
            title={day.title}
            dateLabel={displayDate(day.publishDate)}
            scripture={day.scripture}
            bibleVerses={day.bibleVerses}
            body={day.body}
            declaration={day.declaration}
            prayerPoints={day.prayerPoints}
            logoUrl={logoUrl}
          />
        </div>

        {!archived ? (
          <form action={saveDevotional} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={day.id} />
            <input type="hidden" name="returnTab" value={returnTab} />
            <FormField label="Topic" htmlFor={`title-${day.id}`}>
              <Input
                id={`title-${day.id}`}
                name="title"
                defaultValue={day.title}
                maxLength={200}
                required
              />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Publish date" htmlFor={`date-${day.id}`}>
                <Input
                  id={`date-${day.id}`}
                  name="publishDate"
                  type="date"
                  defaultValue={day.publishDate}
                  required
                />
              </FormField>
              <FormField label="Status" htmlFor={`status-${day.id}`}>
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
            <FormField label="Anchor Scripture" htmlFor={`scripture-${day.id}`}>
              <Input
                id={`scripture-${day.id}`}
                name="scripture"
                defaultValue={day.scripture ?? ""}
              />
            </FormField>
            <FormField label="Full verse text" htmlFor={`verses-${day.id}`}>
              <Textarea
                id={`verses-${day.id}`}
                name="bibleVerses"
                defaultValue={day.bibleVerses ?? ""}
                className="min-h-24"
              />
            </FormField>
            <FormField label="Devotional" htmlFor={`body-${day.id}`}>
              <Textarea
                id={`body-${day.id}`}
                name="body"
                defaultValue={day.body}
                className="min-h-64"
                required
              />
            </FormField>
            <FormField label="Declaration" htmlFor={`declaration-${day.id}`}>
              <Textarea
                id={`declaration-${day.id}`}
                name="declaration"
                defaultValue={day.declaration ?? ""}
                className="min-h-24"
              />
            </FormField>
            <FormField label="Prayer points" htmlFor={`prayer-${day.id}`}>
              <Textarea
                id={`prayer-${day.id}`}
                name="prayerPoints"
                defaultValue={day.prayerPoints ?? ""}
                className="min-h-32"
              />
            </FormField>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="notifyMembers"
                  defaultChecked={day.notifyMembers}
                />
                Notify members when published
              </label>
              <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
                <input
                  type="checkbox"
                  name="showOnHome"
                  defaultChecked={day.showOnHome}
                />
                Show on Home when published
              </label>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-brand-100 pt-3">
              <SubmitButton size="sm" pendingLabel="Saving...">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Save changes
              </SubmitButton>
              <SubmitButton
                formAction={saveDevotionalDraft}
                variant="outline"
                size="sm"
                pendingLabel="Saving draft..."
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Save as draft
              </SubmitButton>
              <SubmitButton
                formAction={approveDevotionalAction}
                variant="outline"
                size="sm"
                pendingLabel="Approving..."
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Approve
              </SubmitButton>
              <SubmitButton
                formAction={scheduleDevotionalAction}
                variant="outline"
                size="sm"
                pendingLabel="Scheduling..."
              >
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Schedule 6 AM
              </SubmitButton>
              <SubmitButton
                formAction={rejectDevotionalAction}
                variant="ghost"
                size="sm"
                pendingLabel="Rejecting..."
                className="text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Reject
              </SubmitButton>
            </div>
            <p className="text-xs leading-5 text-charcoal/50">
              Approve and Schedule both save this day as scheduled. The cron
              publishes it at 6:00 AM Lagos time on its publish date.
            </p>
          </form>
        ) : null}

        {!archived && day.status !== "published" ? (
          <form action={regenerateDay} className="mt-2">
            <input type="hidden" name="id" value={day.id} />
            <input type="hidden" name="returnTab" value={returnTab} />
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
  );
}
