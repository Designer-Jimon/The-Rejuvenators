import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CalendarClock, Save } from "lucide-react";
import { getDb } from "@/lib/db";
import { appointments, type AppointmentStatus } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/display";
import { AppointmentAdminCard } from "@/components/admin/appointments/appointment-admin-card";
import {
  formatTimeLabel,
  parseAvailability,
  SLOT_LENGTH_OPTIONS,
  WEEKDAYS,
  type AppointmentAvailability,
} from "@/lib/appointments";
import { saveAppointmentAvailability } from "./actions";

export const metadata: Metadata = { title: "Appointments" };
export const dynamic = "force-dynamic";

const tabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "suggested", label: "Suggested" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "declined", label: "Declined" },
];

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string; error?: string }>;
}) {
  await requirePermission(
    PERMISSIONS.appointmentManage,
    "/admin/appointments",
  );
  const params = await searchParams;
  const status = (tabs.some((tab) => tab.key === params.status)
    ? params.status!
    : "pending") as AppointmentStatus | "all";
  const settings = await getSettings();
  const availability = parseAvailability(settings);
  const db = await getDb();

  const list = await db
    .select()
    .from(appointments)
    .where(status === "all" ? undefined : eq(appointments.status, status))
    .orderBy(desc(appointments.createdAt))
    .limit(200);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Pastoral care
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Appointments</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          Review appointment requests, confirm slots and keep people informed.
        </p>
      </div>

      {params.saved ? (
        <FormMessage tone="success">{params.saved}</FormMessage>
      ) : null}
      {params.error ? <FormMessage>{params.error}</FormMessage> : null}

      <details className="surface bg-white p-4 sm:p-6">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-serif text-lg font-semibold">
          <CalendarClock className="h-5 w-5 text-brand-700" aria-hidden="true" />
          Availability settings
        </summary>
        <AvailabilityForm availability={availability} />
      </details>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/appointments?status=${tab.key}`}
            prefetch
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-2xl border px-4 text-sm font-semibold transition active:scale-[0.98] active:opacity-80",
              status === tab.key
                ? "border-brand-700 bg-brand-700 text-cream"
                : "border-brand-200 bg-white text-charcoal/70 hover:border-brand-400",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <p className="text-sm text-charcoal/55">
        Showing {list.length} {list.length === 1 ? "request" : "requests"}.
      </p>

      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((appointment) => (
            <AppointmentAdminCard
              key={appointment.id}
              availability={availability}
              appointment={{
                id: appointment.id,
                fullName: appointment.fullName,
                phone: appointment.phone,
                email: appointment.email,
                purpose: appointment.title,
                message: appointment.notes,
                preferredDate: appointment.preferredDate,
                preferredTime: appointment.preferredTime,
                suggestedDate: appointment.suggestedDate,
                suggestedTime: appointment.suggestedTime,
                adminNote: appointment.adminNote,
                status: appointment.status,
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" aria-hidden="true" />}
          title="No appointment requests"
          description={
            status === "pending"
              ? "New requests will appear here and admins will be notified in-app."
              : "There are no appointments with this status yet."
          }
        />
      )}
    </div>
  );
}

function AvailabilityForm({
  availability,
}: {
  availability: AppointmentAvailability;
}) {
  return (
    <form action={saveAppointmentAvailability} className="mt-4 space-y-4">
      <fieldset>
        <legend className="field-label">Available days</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {WEEKDAYS.map((day) => (
            <label
              key={day.value}
              className="flex min-h-12 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-3 text-sm font-semibold"
            >
              <input
                type="checkbox"
                name="days"
                value={day.value}
                defaultChecked={availability.days.includes(day.value)}
              />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="field-label" htmlFor="appointment-start">
            Start time
          </label>
          <input
            id="appointment-start"
            name="start"
            type="time"
            required
            defaultValue={availability.start}
            className="min-h-12 w-full rounded-2xl border border-brand-200 bg-white px-4 text-base text-charcoal shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="appointment-end">
            End time
          </label>
          <input
            id="appointment-end"
            name="end"
            type="time"
            required
            defaultValue={availability.end}
            className="min-h-12 w-full rounded-2xl border border-brand-200 bg-white px-4 text-base text-charcoal shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="appointment-slot">
            Slot length
          </label>
          <select
            id="appointment-slot"
            name="slotMinutes"
            defaultValue={availability.slotMinutes}
            className="min-h-12 w-full rounded-2xl border border-brand-200 bg-white px-4 text-base text-charcoal shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
          >
            {SLOT_LENGTH_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-brand-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-charcoal/45">
          The public form only offers these days, times and slot lengths. Example
          slots: {formatTimeLabel(availability.start)} to{" "}
          {formatTimeLabel(availability.end)}.
        </p>
        <SubmitButton pendingLabel="Saving availability...">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save availability
        </SubmitButton>
      </div>
    </form>
  );
}
