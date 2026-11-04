import Link from "next/link";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/display";

export const metadata: Metadata = { title: "Departments" };
export const dynamic = "force-dynamic";

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

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {list.map((department, index) => (
          <article key={department.id} className="surface p-5 sm:p-6">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient font-serif text-lg font-bold text-cream">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="mt-4 font-serif text-xl font-semibold">
              {department.name}
            </h2>
            <p className="mt-2 text-sm leading-7 text-charcoal/65">
              {department.description || "Department details will be added soon."}
            </p>
          </article>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="surface mt-8 p-8 text-center">
          <h2 className="font-serif text-xl font-semibold">Departments coming soon</h2>
          <p className="mt-2 text-sm text-charcoal/65">
            The admin team is preparing the department list.
          </p>
        </div>
      ) : null}

      <div className="mt-10 rounded-3xl bg-charcoal p-6 text-center text-cream sm:p-8">
        <h2 className="font-serif text-2xl font-bold text-white">
          Ready to serve?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-cream/70">
          Registration includes a department preference. The membership team will
          confirm your placement.
        </p>
        <Link href="/register" className="mt-5 inline-block">
          <Button variant="gold">Register and choose a department</Button>
        </Link>
      </div>
    </div>
  );
}
