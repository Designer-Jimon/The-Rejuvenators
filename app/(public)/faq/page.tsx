import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import { getDb } from "@/lib/db";
import { faqs } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { buttonClasses } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import { EmptyState, PageHero } from "@/components/ui/display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about IT IS FINISHED REVIVAL OUTREACH - location, service times, membership, departments, appointments and devotionals.",
  openGraph: {
    title: "FAQ | IT IS FINISHED REVIVAL OUTREACH",
    description:
      "Answers to common questions about the church, membership and activities.",
    type: "website",
  },
};

export default async function FaqPage() {
  const db = await getDb();
  const [settings, list] = await Promise.all([
    getSettings(),
    db
      .select()
      .from(faqs)
      .where(eq(faqs.isPublished, true))
      .orderBy(asc(faqs.sortOrder)),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="FAQ"
        title="Questions? We have answers"
        description={`Common questions about ${settings.church_name}, visiting, membership and getting involved.`}
      />

      <section className="content-auto mt-8">
        {list.length ? (
          <Accordion
            items={list.map((faq) => ({
              id: faq.id,
              question: faq.question,
              answer: faq.answer,
            }))}
          />
        ) : (
          <EmptyState
            icon={<MessageCircle className="h-6 w-6" aria-hidden="true" />}
            title="No questions published yet"
            description="The church team is preparing the FAQ."
          />
        )}
      </section>

      <section className="content-auto mt-10 rounded-3xl bg-brand-gradient p-6 text-cream shadow-lift sm:p-8">
        <h2 className="font-serif text-2xl font-bold text-white">
          Still have a question?
        </h2>
        <p className="mt-2 max-w-xl text-base leading-7 text-cream/85">
          We are happy to help. Reach out to the church team and we will get back
          to you.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/contact"
            prefetch
            className={buttonClasses("gold", "lg", "w-full sm:w-auto")}
          >
            Contact the church
          </Link>
          <Link
            href="/register"
            prefetch
            className={buttonClasses(
              "outline",
              "lg",
              "w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto",
            )}
          >
            Join our church family
          </Link>
        </div>
      </section>
    </div>
  );
}
