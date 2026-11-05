import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { CalendarClock, CalendarPlus } from "lucide-react";
import { getDb } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import { Badge, EmptyState, PageHero } from "@/components/ui/display";
import { buttonClasses } from "@/components/ui/button";
import { formatAppointmentWhen } from "@/lib/appointments";

export const metadata: Metadata = { title: "My appointments" };
export const dynamic = "force-dynamic";

function statusTone(status: string) {
  if (status === "confirmed") return "success" as const;
  if (status === "declined") return "danger" as const;
  if (status === "suggested") return "brand" as const;
  if (status === "completed") return "neutral" as const;
  return "warning" as const;
}

export default async function MemberAppointmentsPage() {
  const user = await requireUser("/member/appointments");
  const db = await getDb();

  const list = await db
    .select()
    .from(appointments)
    .where(
      or(
        eq(appointments.userId, user.id),
        eq(appointments.email, user.email.toLowerCase()),
      ),
    )
    .orderBy(desc(appointments.createdAt))
    .limit(100);

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Pastoral care"
        title="My appointments"
        description="See every request you have made, including confirmation, suggested times and notes from the church office."
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-charcoal/60">
          {list.length} {list.length === 1 ? "request" : "requests"} on record.
        </p>
        <Link
          href="/appointments"
          prefetch
          className={buttonClasses("primary", "lg", "w-full sm:w-auto")}
        >
          <CalendarPlus className="h-5 w-5" aria-hidden="true" />
          Book an appointment
        </Link>
      </div>

      {list.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((appointment) => {
            const when = formatAppointmentWhen(
              appointment.suggestedDate ?? appointment.preferredDate,
              appointment.suggestedTime ?? appointment.preferredTime,
            );
            return (
              <article
                key={appointment.id}
                className="surface min-w-0 bg-white p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={statusTone(appointment.status)}>
                    {appointment.status}
                  </Badge>
                  <span className="text-xs font-semibold text-charcoal/45">
                    {appointment.status === "suggested"
                      ? "New time suggested"
                      : "Requested time"}
                  </span>
                </div>
                <h2 className="mt-2 break-words font-serif text-xl font-semibold">
                  {appointment.title}
                </h2>
                <p className="mt-1 flex items-start gap-2 text-sm font-semibold text-brand-800">
                  <CalendarClock
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  {when}
                </p>
                {appointment.suggestedDate ? (
                  <p className="mt-2 text-xs leading-5 text-charcoal/55">
                    You originally requested{" "}
                    {formatAppointmentWhen(
                      appointment.preferredDate,
                      appointment.preferredTime,
                    )}
                    .
                  </p>
                ) : null}
                {appointment.notes ? (
                  <p className="mt-3 whitespace-pre-line break-words rounded-2xl bg-brand-50/70 p-3 text-sm leading-6 text-charcoal/70">
                    {appointment.notes}
                  </p>
                ) : null}
                {appointment.adminNote ? (
                  <p className="mt-3 whitespace-pre-line break-words rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                    <span className="block text-xs font-bold uppercase tracking-wide">
                      Note from the church office
                    </span>
                    {appointment.adminNote}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" aria-hidden="true" />}
          title="No appointments yet"
          description="When you book an appointment, its status will appear here."
          action={
            <Link
              href="/appointments"
              prefetch
              className={buttonClasses("primary", "lg")}
            >
              Book your first appointment
            </Link>
          }
        />
      )}
    </div>
  );
}
