import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { ArrowRight, HeartHandshake, UserRound } from "lucide-react";
import { getDb } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { publicMediaUrl } from "@/lib/media";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState, PageHero } from "@/components/ui/display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Departments",
  description:
    "Find your place in the house. Explore the departments of IT IS FINISHED REVIVAL OUTREACH.",
  openGraph: {
    title: "Departments | IT IS FINISHED REVIVAL OUTREACH",
    description:
      "Find your place in the house and serve shoulder to shoulder.",
    type: "website",
  },
};

export default async function DepartmentsPage() {
  const db = await getDb();
  const list = await db
    .select()
    .from(departments)
    .where(eq(departments.isActive, true))
    .orderBy(asc(departments.sortOrder));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Serve"
        title="Find your place in the house"
        description="Every believer has a part to play. Explore the departments and request to join one during registration."
      />

      <div className="content-auto mt-8">
        {list.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((department, index) => (
              <Link
                key={department.id}
                href={`/departments/${department.slug}`}
                prefetch
                className="group surface overflow-hidden transition hover:-translate-y-0.5 hover:border-brand-200 active:scale-[0.99] active:opacity-80"
              >
                {department.imageKey ? (
                  <div className="relative aspect-[16/9] bg-brand-50">
                    <Image
                      src={publicMediaUrl(department.imageKey) ?? ""}
                      alt={department.name}
                      fill
                      loading="lazy"
                      unoptimized
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient font-serif text-lg font-bold text-cream">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
                      <HeartHandshake className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-semibold group-hover:text-brand-800">
                    {department.name}
                  </h2>
                  <p className="mt-2 text-base leading-7 text-charcoal/65">
                    {department.description || "Department details will be added soon."}
                  </p>
                  {department.headOfUnit ? (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-charcoal/55">
                      <UserRound className="h-4 w-4" aria-hidden="true" />
                      {department.headOfUnit}
                    </p>
                  ) : null}
                  <span className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-brand-800">
                    Explore department
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<HeartHandshake className="h-6 w-6" aria-hidden="true" />}
            title="Departments coming soon"
            description="The admin team is preparing the department list."
          />
        )}
      </div>

      <div className="content-auto mt-10 rounded-3xl bg-charcoal p-6 text-center text-cream sm:p-8">
        <h2 className="font-serif text-2xl font-bold text-white">
          Ready to serve?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-base leading-7 text-cream/70">
          Registration includes a department preference. The membership team will
          confirm your placement.
        </p>
        <Link
          href="/register"
          prefetch
          className={buttonClasses("gold", "lg", "mt-5 w-full sm:w-auto")}
        >
          Register and choose a department
        </Link>
      </div>
    </div>
  );
}
