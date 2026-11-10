import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import {
  CalendarDays,
  Church,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Youtube,
} from "lucide-react";
import { getDb } from "@/lib/db";
import { worshipCenters } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { CHURCH_NAME } from "@/lib/branding";
import { getBlock, getContentMap } from "@/lib/content";
import { buttonClasses } from "@/components/ui/button";
import { PageHero, SectionHeader } from "@/components/ui/display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${CHURCH_NAME} - address, phone, email, service times and appointment requests.`,
  openGraph: {
    title: `Contact | ${CHURCH_NAME}`,
    description:
      "Address, phone, email, service times and appointment requests.",
    type: "website",
  },
};

export default async function ContactPage() {
  const db = await getDb();
  const [settings, content, centers] = await Promise.all([
    getSettings(),
    getContentMap(),
    db
      .select({
        id: worshipCenters.id,
        name: worshipCenters.name,
        city: worshipCenters.city,
        state: worshipCenters.state,
      })
      .from(worshipCenters)
      .where(eq(worshipCenters.isActive, true))
      .orderBy(asc(worshipCenters.sortOrder), asc(worshipCenters.name)),
  ]);
  const appointment = getBlock(content, "appointment_cta");

  const socials = [
    { href: settings.facebook_url, label: "Facebook", icon: Facebook },
    { href: settings.instagram_url, label: "Instagram", icon: Instagram },
    { href: settings.youtube_url, label: "YouTube", icon: Youtube },
    {
      href: settings.whatsapp_group_url,
      label: "WhatsApp",
      icon: MessageCircle,
    },
  ].filter((social) => social.href.startsWith("http"));

  const phoneIsLink = settings.phone.startsWith("+");
  const emailIsLink =
    settings.email.includes("@") && !settings.email.startsWith("[");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Connect"
        title="We would love to hear from you"
        description={`Reach out with questions about ${settings.church_name?.trim() || CHURCH_NAME}, membership or visiting.`}
      />

      <section className="content-auto mt-8 grid gap-4 sm:grid-cols-2">
        <div className="surface flex items-start gap-3 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
              Address
            </p>
            <p className="mt-1 break-words text-base font-semibold leading-7 text-charcoal/75">
              {settings.address}
            </p>
          </div>
        </div>

        <div className="surface flex items-start gap-3 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Phone className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
              Phone
            </p>
            {phoneIsLink ? (
              <a
                href={`tel:${settings.phone}`}
                className="mt-1 block break-words text-base font-semibold leading-7 text-brand-800 hover:underline"
              >
                {settings.phone}
              </a>
            ) : (
              <p className="mt-1 break-words text-base font-semibold leading-7 text-charcoal/75">
                {settings.phone || "[Church phone - edit in Admin]"}
              </p>
            )}
          </div>
        </div>

        <div className="surface flex items-start gap-3 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
              Email
            </p>
            {emailIsLink ? (
              <a
                href={`mailto:${settings.email}`}
                className="mt-1 block break-words text-base font-semibold leading-7 text-brand-800 hover:underline"
              >
                {settings.email}
              </a>
            ) : (
              <p className="mt-1 break-words text-base font-semibold leading-7 text-charcoal/75">
                {settings.email || "[Church email - edit in Admin]"}
              </p>
            )}
          </div>
        </div>

        <div className="surface flex items-start gap-3 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
              Service times
            </p>
            <p className="mt-1 text-base leading-7 text-charcoal/75">
              {settings.service_sunday}
            </p>
            <p className="text-base leading-7 text-charcoal/75">
              {settings.service_weekday}
            </p>
          </div>
        </div>
      </section>

      {centers.length ? (
        <section className="content-auto mt-8 surface p-6">
          <SectionHeader
            eyebrow="Find us"
            title="Worship centers"
            description="We gather in more than one place. Choose the center nearest to you."
            action={
              <Link href="/worship-centers" prefetch>
                <span className={buttonClasses("outline", "sm")}>View all</span>
              </Link>
            }
            className="mb-4"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {centers.map((center) => (
              <Link
                key={center.id}
                href="/worship-centers"
                prefetch
                className="flex items-start gap-3 rounded-2xl border border-brand-100 p-4 transition hover:bg-brand-50/60 active:scale-[0.99] active:opacity-80"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Church className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-charcoal">
                    {center.name}
                  </span>
                  <span className="block text-xs text-charcoal/55">
                    {[center.city, center.state].filter(Boolean).join(", ") ||
                      "Address in admin"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="content-auto mt-8 surface p-6">
        <SectionHeader
          eyebrow="Visit"
          title="Plan your visit"
          description="Let us know you are coming and we will help you find your way."
          className="mb-4"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal/45">
              Location
            </h3>
            <p className="mt-2 text-base leading-7 text-charcoal/75">
              {settings.address}
            </p>
            {settings.map_url.startsWith("http") ? (
              <a
                href={settings.map_url}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses("outline", "lg", "mt-4 w-full sm:w-auto")}
              >
                Open in maps
              </a>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-brand-200 bg-cream/60 p-4 text-sm text-charcoal/55">
                [Map link - edit in Admin]
              </p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-charcoal/45">
              Before you come
            </h3>
            <p className="mt-2 text-base leading-7 text-charcoal/70">
              You do not need to have everything figured out. Come as you are and
              worship with us.
            </p>
            <Link
              href="/faq"
              prefetch
              className={buttonClasses("outline", "lg", "mt-4 w-full sm:w-auto")}
            >
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>

      <section className="content-auto mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl bg-charcoal p-6 text-cream shadow-lift">
          <h2 className="font-serif text-2xl font-bold text-white">
            {appointment.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-cream/75">
            {appointment.body}
          </p>
          <Link
            href="/appointments"
            prefetch
            className={buttonClasses("gold", "lg", "mt-5 w-full sm:w-auto")}
          >
            Book an appointment
          </Link>
        </div>

        <div className="surface p-6">
          <h2 className="font-serif text-2xl font-semibold">Follow us</h2>
          <p className="mt-2 text-base leading-7 text-charcoal/65">
            Stay connected with the church family.
          </p>
          {socials.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.label}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white text-brand-800 transition hover:bg-brand-50"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-charcoal/45">
              [Social links - edit in Admin]
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
