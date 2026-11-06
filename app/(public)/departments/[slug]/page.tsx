import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import { and, asc, eq, ne } from "drizzle-orm";
import { ArrowLeft, ArrowRight, UserRound } from "lucide-react";
import { getDb } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { DepartmentIcon } from "@/lib/department-icons";
import { getSettings } from "@/lib/settings";
import { publicMediaUrl } from "@/lib/media";
import { buttonClasses } from "@/components/ui/button";
import { Badge, PageHero, SectionHeader } from "@/components/ui/display";

export const dynamic = "force-dynamic";

const getDepartment = cache(async (slug: string) => {
  const db = await getDb();
  const rows = await db
    .select()
    .from(departments)
    .where(and(eq(departments.slug, slug), eq(departments.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const department = await getDepartment(slug);
  if (!department) return { title: "Department not found" };
  const description =
    department.description || `${department.name} at the church.`;
  return {
    title: department.name,
    description,
    openGraph: {
      title: `${department.name} | IT IS FINISHED REVIVAL OUTREACH`,
      description,
      type: "website",
    },
  };
}

export default async function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const department = await getDepartment(slug);
  if (!department) notFound();

  const db = await getDb();
  const [settings, related] = await Promise.all([
    getSettings(),
    db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.isActive, true),
          ne(departments.id, department.id),
        ),
      )
      .orderBy(asc(departments.sortOrder))
      .limit(3),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/departments"
        prefetch
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 hover:underline active:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All departments
      </Link>

      <div className="mt-4">
        <PageHero
          eyebrow="Department"
          title={department.name}
          description={department.description || "Department details will be added soon."}
        />
      </div>

      {department.imageKey ? (
        <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-3xl bg-brand-50 shadow-soft sm:aspect-[21/9]">
          <Image
            src={publicMediaUrl(department.imageKey) ?? ""}
            alt={department.name}
            fill
            loading="lazy"
            unoptimized
            sizes="(max-width: 1024px) 100vw, 960px"
            className="object-cover"
          />
        </div>
      ) : null}

      <section className="content-auto mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="surface p-6 sm:p-7">
          <Badge tone="brand">Serve with us</Badge>
          <h2 className="mt-4 font-serif text-2xl font-semibold">
            About the {department.name}
          </h2>
          <p className="mt-3 whitespace-pre-line text-base leading-8 text-charcoal/70">
            {department.description || "[Department description - edit in Admin]"}
          </p>
          {department.headOfUnit ? (
            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-charcoal/70">
              <UserRound className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Head of unit: {department.headOfUnit}
            </p>
          ) : null}
          {department.activities ? (
            <div className="mt-6 rounded-2xl border border-brand-100 bg-cream/50 p-5">
              <h3 className="font-serif text-lg font-semibold">
                Department activities
              </h3>
              <p className="mt-2 whitespace-pre-line text-base leading-7 text-charcoal/70">
                {department.activities}
              </p>
            </div>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              prefetch
              className={buttonClasses("primary", "lg", "w-full sm:w-auto")}
            >
              Join this department
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              prefetch
              className={buttonClasses("outline", "lg", "w-full sm:w-auto")}
            >
              Ask a question
            </Link>
          </div>
        </div>

        <aside className="rounded-3xl bg-brand-gradient p-6 text-cream shadow-lift">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-gold-200">
            <DepartmentIcon
              name={department.iconKey}
              className="h-5 w-5"
            />
          </span>
          <h2 className="mt-4 font-serif text-xl font-bold text-white">
            Join the team
          </h2>
          <p className="mt-2 text-base leading-7 text-cream/85">
            Registration includes a department preference. The membership team
            will confirm your placement.
          </p>
          <p className="mt-4 text-sm text-cream/70">
            {settings.church_name}
          </p>
        </aside>
      </section>

      {related.length ? (
        <section className="content-auto mt-12">
          <SectionHeader
            eyebrow="More teams"
            title="Explore other departments"
            action={
              <Link href="/departments" prefetch>
                <span className={buttonClasses("outline", "sm")}>View all</span>
              </Link>
            }
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/departments/${item.slug}`}
                prefetch
                className="surface p-5 transition hover:border-brand-200 hover:bg-brand-50/40 active:scale-[0.99] active:opacity-80"
              >
                <h3 className="font-serif text-lg font-semibold">{item.name}</h3>
                <p className="mt-1 text-base leading-7 text-charcoal/65">
                  {item.description || "Details will be added soon."}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
