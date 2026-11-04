import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { PageHero, SectionHeader } from "@/components/ui/display";

export const metadata: Metadata = { title: "About us" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const db = await getDb();
  const [settings, blocks] = await Promise.all([
    getSettings(),
    db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.isPublished, true)),
  ]);

  const byKey = Object.fromEntries(blocks.map((block) => [block.key, block]));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="About"
        title="A family built on the finished work of Christ"
        description={`${settings.tagline}. We gather to worship, grow in the Word and serve our community.`}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {[
            { key: "about_story", fallbackTitle: "Our story" },
            { key: "mission", fallbackTitle: "Our mission" },
            { key: "vision", fallbackTitle: "Our vision" },
          ].map((item) => {
            const block = byKey[item.key];
            return (
              <section key={item.key} className="surface p-5 sm:p-6">
                <h2 className="font-serif text-2xl font-semibold">
                  {block?.title ?? item.fallbackTitle}
                </h2>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-charcoal/70">
                  {block?.body ||
                    "[This section is editable in the Admin dashboard.]"}
                </p>
              </section>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl bg-brand-gradient p-6 text-cream shadow-lift">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-200">
              Lead pastor
            </p>
            <p className="mt-2 font-serif text-2xl font-bold text-white">
              {settings.pastor_name}
            </p>
            <p className="mt-3 text-sm leading-7 text-cream/80">
              We are glad you are here. Come and worship with us.
            </p>
          </div>
          <div className="surface p-5">
            <SectionHeader title="Gather with us" className="mb-3" />
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
                  Sunday
                </dt>
                <dd className="mt-0.5 text-charcoal/75">{settings.service_sunday}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
                  Midweek
                </dt>
                <dd className="mt-0.5 text-charcoal/75">{settings.service_weekday}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
                  Address
                </dt>
                <dd className="mt-0.5 text-charcoal/75">{settings.address}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
