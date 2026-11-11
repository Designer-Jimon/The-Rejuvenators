import { Flame } from "lucide-react";
import {
  CHURCH_NAME,
  CHURCH_TAGLINE,
  DAILY_MEAL_NAME,
} from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/branding/logo";

export type DailyMealTemplateProps = {
  title: string;
  dateLabel: string;
  scripture: string | null;
  bibleVerses: string | null;
  body: string;
  declaration: string | null;
  prayerPoints: string | null;
  logoUrl?: string | null;
  churchName?: string;
  tagline?: string;
  className?: string;
};

function paragraphs(value: string) {
  return value
    .split(/\n{2,}|\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function DailyMealTemplate({
  title,
  dateLabel,
  scripture,
  bibleVerses,
  body,
  declaration,
  prayerPoints,
  logoUrl,
  churchName = CHURCH_NAME,
  tagline = CHURCH_TAGLINE,
  className,
}: DailyMealTemplateProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-lift",
        className,
      )}
    >
      <header className="bg-brand-gradient px-5 pb-6 pt-5 text-cream sm:px-8 sm:pb-8 sm:pt-7">
        <div className="flex items-center gap-3">
          <Logo
            src={logoUrl ?? undefined}
            className="h-12 w-12 rounded-2xl bg-white/10"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-cream sm:text-xs">
              {churchName}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-200">
              {tagline}
            </p>
          </div>
        </div>
        <div className="mt-6 border-t border-white/20 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-200">
            {DAILY_MEAL_NAME}
          </p>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-cream/65">
            Topic
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-xs font-semibold text-cream/80">
            <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-200">
              Date
            </span>
            {dateLabel}
          </p>
        </div>
      </header>

      <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700">
            Anchor Scripture
          </h2>
          <div className="mt-2 rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            {scripture ? (
              <p className="font-serif text-lg font-semibold text-brand-900">
                {scripture}
              </p>
            ) : null}
            {bibleVerses ? (
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-charcoal/75">
                {bibleVerses}
              </p>
            ) : (
              <p className="text-sm text-charcoal/55">
                Scripture text will appear here.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700">
            Devotional
          </h2>
          <div className="mt-2 space-y-4">
            {paragraphs(body).map((paragraph, index) => (
              <p
                key={index}
                className="text-[15px] leading-8 text-charcoal/80 sm:text-base"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {declaration ? (
          <section className="rounded-2xl border border-brand-200 bg-brand-50/80 p-4">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700">
              <Flame className="h-4 w-4" aria-hidden="true" />
              Declaration
            </p>
            <p className="mt-2 font-serif text-lg leading-8 text-brand-900">
              {declaration}
            </p>
          </section>
        ) : null}

        {prayerPoints ? (
          <section>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700">
              Prayer Points
            </h2>
            <div className="mt-2 space-y-2">
              {paragraphs(prayerPoints).map((point, index) => (
                <p
                  key={index}
                  className="rounded-2xl bg-cream/80 px-4 py-3 text-sm leading-6 text-charcoal/75"
                >
                  {point}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <footer className="bg-brand-900 px-5 py-6 text-center text-cream sm:px-8">
        <p className="font-serif text-xl font-bold tracking-[0.08em] text-white">
          PROVOKING REVIVAL!
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/60">
          {churchName}
        </p>
      </footer>
    </article>
  );
}
