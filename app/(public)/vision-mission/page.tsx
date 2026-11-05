import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Flame, Target } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getBlock, getContentMap } from "@/lib/content";
import { buttonClasses } from "@/components/ui/button";
import { PageHero, SectionHeader } from "@/components/ui/display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vision & Mission",
  description:
    "The vision and mission of IT IS FINISHED REVIVAL OUTREACH - provoking revival in this end time.",
  openGraph: {
    title: "Vision & Mission | IT IS FINISHED REVIVAL OUTREACH",
    description:
      "The vision and mission of IT IS FINISHED REVIVAL OUTREACH - provoking revival in this end time.",
    type: "website",
  },
};

export default async function VisionMissionPage() {
  const [settings, content] = await Promise.all([
    getSettings(),
    getContentMap(),
  ]);

  const vision = getBlock(content, "vision");
  const mission = getBlock(content, "mission");
  const closing = getBlock(content, "closing");
  const missionItems = mission.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\)\s*/, ""));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Vision & Mission"
        title="Revival is our mandate"
        description={`${settings.church_name} exists to provoke revival and to make Jesus known.`}
      />

      <section className="content-auto mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="rounded-3xl bg-brand-gradient p-6 text-cream shadow-lift sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-gold-200">
            <Target className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-serif text-2xl font-bold text-white">
            {vision.title}
          </h2>
          <p className="mt-3 whitespace-pre-line text-base leading-8 text-cream/85">
            {vision.body}
          </p>
        </div>

        <div className="surface p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-serif text-2xl font-semibold">
            {mission.title}
          </h2>
          <ol className="mt-4 space-y-3">
            {missionItems.map((item, index) => (
              <li key={item} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-serif text-sm font-bold text-brand-800">
                  {index + 1}
                </span>
                <p className="text-base leading-7 text-charcoal/70">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="content-auto mt-12 rounded-3xl bg-charcoal p-7 text-center text-cream shadow-lift sm:p-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-gold-200">
          <Flame className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-serif text-2xl font-bold text-white sm:text-3xl">
          {closing.title}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-8 text-cream/75">
          {closing.body}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            prefetch
            className={buttonClasses("gold", "lg", "w-full sm:w-auto")}
          >
            Join our church family
          </Link>
          <Link
            href="/activities"
            prefetch
            className={buttonClasses(
              "outline",
              "lg",
              "w-full border-white/25 bg-transparent text-white hover:bg-white/10 sm:w-auto",
            )}
          >
            See our activities
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="content-auto mt-12">
        <SectionHeader
          eyebrow="Next"
          title="Where revival becomes practical"
          description="Explore the departments and weekly gatherings where the vision is lived out."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/activities"
            prefetch
            className="surface flex items-center justify-between gap-4 p-5 transition hover:border-brand-200 hover:bg-brand-50/40 active:scale-[0.99] active:opacity-80"
          >
            <span className="font-serif text-xl font-semibold">Activities</span>
            <ArrowRight className="h-5 w-5 text-brand-700" aria-hidden="true" />
          </Link>
          <Link
            href="/departments"
            prefetch
            className="surface flex items-center justify-between gap-4 p-5 transition hover:border-brand-200 hover:bg-brand-50/40 active:scale-[0.99] active:opacity-80"
          >
            <span className="font-serif text-xl font-semibold">Departments</span>
            <ArrowRight className="h-5 w-5 text-brand-700" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
