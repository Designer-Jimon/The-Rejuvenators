import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Flame, HeartHandshake } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getBlock, getContentMap } from "@/lib/content";
import { publicMediaUrl } from "@/lib/media";
import { buttonClasses } from "@/components/ui/button";
import { PageHero, SectionHeader } from "@/components/ui/display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About us",
  description:
    "The story, foundation and heart of IT IS FINISHED REVIVAL OUTREACH.",
  openGraph: {
    title: "About IT IS FINISHED REVIVAL OUTREACH",
    description:
      "The story, foundation and heart of IT IS FINISHED REVIVAL OUTREACH.",
    type: "website",
  },
};

export default async function AboutPage() {
  const [settings, content] = await Promise.all([
    getSettings(),
    getContentMap(),
  ]);

  const story = getBlock(content, "about_story");
  const intro = getBlock(content, "intro");
  const scripture = getBlock(content, "scripture");
  const closing = getBlock(content, "closing");
  const pastor = getBlock(content, "pastor_intro");
  const values = [
    getBlock(content, "core_values"),
    getBlock(content, "what_we_believe"),
    getBlock(content, "spiritual_mandate"),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="About"
        title="A family built on the finished work of Christ"
        description={`${settings.tagline}. We gather to worship, grow in the Word and serve our community.`}
      />

      <section className="content-auto mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div className="surface p-6 sm:p-7">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-serif text-2xl font-semibold">
            {intro.title}
          </h2>
          <p className="mt-3 whitespace-pre-line text-base leading-8 text-charcoal/70">
            {intro.body}
          </p>
        </div>
        <aside className="rounded-3xl bg-brand-gradient p-6 text-cream shadow-lift">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-200">
            {scripture.title}
          </p>
          <blockquote className="mt-3 text-base leading-8 text-cream/85">
            {scripture.body}
          </blockquote>
        </aside>
      </section>

      <section className="content-auto mt-12">
        <SectionHeader eyebrow="History" title={story.title} />
        <div className="surface p-6 sm:p-7">
          <p className="whitespace-pre-line text-base leading-8 text-charcoal/70">
            {story.body}
          </p>
        </div>
      </section>

      <section className="content-auto mt-12">
        <SectionHeader
          eyebrow="What guides us"
          title="Values and beliefs"
          description="These sections are placeholders until the church team completes them in the admin dashboard."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {values.map((block, index) => {
            const icons = [HeartHandshake, Flame, Compass];
            const Icon = icons[index] ?? Flame;
            return (
              <article key={block.key} className="surface p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-200/60 text-gold-500">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-serif text-xl font-semibold">
                  {block.title}
                </h3>
                <p className="mt-2 whitespace-pre-line text-base leading-7 text-charcoal/70">
                  {block.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="content-auto mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="overflow-hidden rounded-3xl bg-charcoal text-cream shadow-lift">
          {settings.pastor_photo_key ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publicMediaUrl(settings.pastor_photo_key) ?? ""}
              alt={settings.pastor_name}
              className="h-56 w-full object-cover object-top sm:h-64"
            />
          ) : (
            <div className="flex h-44 items-center justify-center bg-charcoal/80 text-cream/50">
              <Flame className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
          <div className="p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-200">
              {settings.pastor_title || pastor.title}
            </p>
            <p className="mt-3 font-serif text-3xl font-bold text-white">
              {settings.pastor_name}
            </p>
            <p className="mt-4 whitespace-pre-line text-base leading-7 text-cream/75">
              {settings.pastor_bio || pastor.body}
            </p>
            {settings.pastor_about ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-cream/65">
                {settings.pastor_about}
              </p>
            ) : null}
            {settings.pastor_quote ? (
              <p className="mt-4 border-l-2 border-gold-300 pl-3 text-sm italic leading-7 text-gold-100">
                {settings.pastor_quote}
              </p>
            ) : null}
          </div>
        </div>
        <div className="surface p-6 sm:p-7">
          <h2 className="font-serif text-2xl font-semibold">{closing.title}</h2>
          <p className="mt-3 whitespace-pre-line text-base leading-8 text-charcoal/70">
            {closing.body}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/vision-mission"
              prefetch
              className={buttonClasses("primary", "lg", "w-full sm:w-auto")}
            >
              Discover our vision
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/register"
              prefetch
              className={buttonClasses("outline", "lg", "w-full sm:w-auto")}
            >
              Join our church family
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
