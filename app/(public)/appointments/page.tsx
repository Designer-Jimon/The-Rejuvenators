import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Clock3, Mail, Phone } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { getBlock, getContentMap } from "@/lib/content";
import { buttonClasses } from "@/components/ui/button";
import { PageHero } from "@/components/ui/display";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { parseAvailability, todayIso } from "@/lib/appointments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book an appointment",
  description:
    "Book a pastoral appointment with Pastor David Obidimalor at IT IS FINISHED REVIVAL OUTREACH.",
  openGraph: {
    title: "Book an appointment | IT IS FINISHED REVIVAL OUTREACH",
    description:
      "Request a pastoral appointment with Pastor David Obidimalor.",
    type: "website",
  },
};

export default async function AppointmentsPage() {
  const [user, settings, content] = await Promise.all([
    getSessionUser(),
    getSettings(),
    getContentMap(),
  ]);
  const availability = parseAvailability(settings);
  const appointment = getBlock(content, "appointment_cta");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHero
        eyebrow="Pastoral care"
        title="Book an appointment"
        description={`Meet with ${settings.pastor_name}. Choose an available day and time, and the church office will confirm your request.`}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <AppointmentForm
          availability={availability}
          today={todayIso()}
          defaults={{
            fullName: user?.name ?? "",
            phone: user?.phone ?? "",
            email: user?.email ?? "",
            isMember: Boolean(user),
          }}
        />

        <aside className="space-y-3">
          <div className="surface bg-white p-5">
            <h2 className="font-serif text-lg font-semibold">
              {appointment.title}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-charcoal/65">
              {appointment.body}
            </p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CalendarDays
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
                  aria-hidden="true"
                />
                <div>
                  <dt className="font-semibold text-charcoal/55">
                    Available days
                  </dt>
                  <dd className="text-charcoal/80">
                    {availability.days.length
                      ? availability.days
                          .map(
                            (day) =>
                              ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day],
                          )
                          .join(", ")
                      : "By arrangement"}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock3
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
                  aria-hidden="true"
                />
                <div>
                  <dt className="font-semibold text-charcoal/55">Time window</dt>
                  <dd className="text-charcoal/80">
                    {availability.start} to {availability.end}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
                  aria-hidden="true"
                />
                <div>
                  <dt className="font-semibold text-charcoal/55">Church phone</dt>
                  <dd className="break-words text-charcoal/80">
                    {settings.phone}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
                  aria-hidden="true"
                />
                <div>
                  <dt className="font-semibold text-charcoal/55">Church email</dt>
                  <dd className="break-words text-charcoal/80">
                    {settings.email}
                  </dd>
                </div>
              </div>
            </dl>
          </div>

          {user ? (
            <div className="surface bg-white p-5">
              <h2 className="font-serif text-lg font-semibold">
                Your appointments
              </h2>
              <p className="mt-1 text-sm leading-6 text-charcoal/65">
                Track confirmation, suggested times and notes from the church
                office.
              </p>
              <Link
                href="/member/appointments"
                prefetch
                className={buttonClasses("outline", "lg", "mt-4 w-full")}
              >
                View my appointments
              </Link>
            </div>
          ) : (
            <div className="surface bg-white p-5">
              <h2 className="font-serif text-lg font-semibold">
                Already a member?
              </h2>
              <p className="mt-1 text-sm leading-6 text-charcoal/65">
                Log in to prefill your details and follow the status of every
                request.
              </p>
              <Link
                href="/login?next=/appointments"
                prefetch
                className={buttonClasses("outline", "lg", "mt-4 w-full")}
              >
                Member login
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
