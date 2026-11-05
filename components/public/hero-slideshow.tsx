"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  href?: string;
  linkLabel?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  gradient?: "brand" | "ember" | "charcoal" | "gold";
};

const gradients: Record<NonNullable<HeroSlide["gradient"]>, string> = {
  brand: "bg-brand-gradient",
  ember: "bg-[linear-gradient(135deg,#4B0F0F_0%,#B91C1C_45%,#EA580C_100%)]",
  charcoal: "bg-[linear-gradient(135deg,#1F1A17_0%,#4B0F0F_55%,#8B1A1A_100%)]",
  gold: "bg-[linear-gradient(135deg,#701515_0%,#8B1A1A_35%,#D99424_100%)]",
};

export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const previous = useCallback(() => goTo(index - 1), [goTo, index]);
  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Welcome slides"
      className="relative overflow-hidden rounded-3xl shadow-lift"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") previous();
        if (event.key === "ArrowRight") next();
      }}
      tabIndex={-1}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStart.current === null) return;
          const end = event.changedTouches[0]?.clientX ?? touchStart.current;
          const delta = end - touchStart.current;
          if (Math.abs(delta) > 45) {
            if (delta > 0) previous();
            else next();
          }
          touchStart.current = null;
        }}
      >
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            className={cn(
              "relative min-w-full overflow-hidden px-5 py-12 text-cream sm:px-10 sm:py-16",
              gradients[slide.gradient ?? "brand"],
            )}
            style={
              slide.imageUrl
                ? {
                    backgroundImage: `linear-gradient(115deg, rgba(43,8,8,0.9), rgba(234,88,12,0.55)), url(${slide.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
            aria-roledescription="slide"
            aria-label={`${slideIndex + 1} of ${count}`}
            aria-hidden={slideIndex !== index}
          >
            <div className="relative z-10 flex min-h-[280px] max-w-3xl flex-col justify-center sm:min-h-[320px]">
              {slide.eyebrow ? (
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold-200">
                  {slide.eyebrow}
                </p>
              ) : null}
              {slideIndex === 0 ? (
                <h1 className="mt-3 font-serif text-[2rem] font-bold leading-[1.1] text-white sm:text-5xl">
                  {slide.title}
                </h1>
              ) : (
                <p className="mt-3 font-serif text-[2rem] font-bold leading-[1.1] text-white sm:text-5xl">
                  {slide.title}
                </p>
              )}
              {slide.subtitle ? (
                <p className="mt-4 max-w-xl text-base leading-7 text-cream/85">
                  {slide.subtitle}
                </p>
              ) : null}
              {(slide.primaryHref && slide.primaryLabel) ||
              (slide.href && slide.linkLabel) ? (
                <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                  {slide.primaryHref && slide.primaryLabel ? (
                    <Link
                      href={slide.primaryHref}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gold-300 px-5 text-base font-semibold text-charcoal shadow-soft transition hover:bg-gold-400"
                    >
                      {slide.primaryLabel}
                    </Link>
                  ) : (
                    <Link
                      href={slide.href ?? "/register"}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-gold-300 px-5 text-base font-semibold text-charcoal shadow-soft transition hover:bg-gold-400"
                    >
                      {slide.linkLabel}
                    </Link>
                  )}
                  {slide.secondaryHref && slide.secondaryLabel ? (
                    <Link
                      href={slide.secondaryHref}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/40 bg-white/10 px-5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20"
                    >
                      {slide.secondaryLabel}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/15"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-gold-300/10"
            />
          </div>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={previous}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-charcoal/30 text-white backdrop-blur transition hover:bg-charcoal/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-charcoal/30 text-white backdrop-blur transition hover:bg-charcoal/50"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(slideIndex)}
                aria-label={`Go to slide ${slideIndex + 1}`}
                aria-current={slideIndex === index ? "true" : undefined}
                className={cn(
                  "h-2.5 rounded-full transition-all",
                  slideIndex === index
                    ? "w-8 bg-gold-300"
                    : "w-2.5 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
