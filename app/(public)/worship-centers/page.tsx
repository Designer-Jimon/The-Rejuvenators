import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { Church, Mail, MapPin, Phone } from "lucide-react";
import { getDb } from "@/lib/db";
import { worshipCenters } from "@/lib/db/schema";
import { CHURCH_NAME } from "@/lib/branding";
import { publicMediaUrl } from "@/lib/media";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHero } from "@/components/ui/display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Worship Centers",
  description: `Find a ${CHURCH_NAME} worship center near you.`,
  openGraph: {
    title: `Worship Centers | ${CHURCH_NAME}`,
    description: "Find a worship center near you and plan your visit.",
    type: "website",
  },
};

export default async function WorshipCentersPage() {
  const db = await getDb();
  const centers = await db
    .select()
    .from(worshipCenters)
    .where(eq(worshipCenters.isActive, true))
    .orderBy(asc(worshipCenters.sortOrder), asc(worshipCenters.name));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Find us"
        title="Our worship centers"
        description="We gather across several centers. Find the one closest to you and join us in person."
      />

      <div className="content-auto mt-8">
        {centers.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {centers.map((center) => (
              <article key={center.id} className="surface overflow-hidden">
                {center.photoKey ? (
                  <div className="relative aspect-[16/9] bg-brand-50">
                    <Image
                      src={publicMediaUrl(center.photoKey) ?? ""}
                      alt={center.name}
                      fill
                      loading="lazy"
                      unoptimized
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="p-5 sm:p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Church className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 className="mt-3 font-serif text-xl font-semibold">
                    {center.name}
                  </h2>
                  <p className="mt-2 flex items-start gap-2 text-base leading-7 text-charcoal/65">
                    <MapPin
                      className="mt-1 h-4 w-4 shrink-0 text-brand-700"
                      aria-hidden="true"
                    />
                    {[center.address, center.city, center.state, center.country]
                      .filter(Boolean)
                      .join(", ") || "[Address - edit in Admin]"}
                  </p>
                  {center.serviceTimes ? (
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-charcoal/60">
                      {center.serviceTimes}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    {center.phone ? (
                      <a
                        href={`tel:${center.phone}`}
                        className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-800 hover:underline active:opacity-70"
                      >
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        {center.phone}
                      </a>
                    ) : null}
                    {center.email ? (
                      <a
                        href={`mailto:${center.email}`}
                        className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-800 hover:underline active:opacity-70"
                      >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {center.email}
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {center.mapUrl ? (
                      <a
                        href={center.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonClasses("outline", "sm")}
                      >
                        Get directions
                      </a>
                    ) : null}
                    <Link
                      href="/register"
                      prefetch
                      className={buttonClasses("primary", "sm")}
                    >
                      Register here
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Church className="h-6 w-6" aria-hidden="true" />}
            title="Worship centers coming soon"
            description="The admin team is preparing the center list."
          />
        )}
      </div>

      <div className="content-auto mt-10 rounded-3xl bg-charcoal p-6 text-center text-cream sm:p-8">
        <h2 className="font-serif text-2xl font-bold text-white">
          Planning your first visit?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-base leading-7 text-cream/70">
          Register online and choose the worship center nearest to you. Our
          membership team will welcome you.
        </p>
        <Link
          href="/register"
          prefetch
          className={buttonClasses("gold", "lg", "mt-5 w-full sm:w-auto")}
        >
          Join our church family
        </Link>
      </div>
    </div>
  );
}
