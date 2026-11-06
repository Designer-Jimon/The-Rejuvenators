"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { LiveCountdown } from "@/components/public/live-countdown";

type PopupEvent = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  coverUrl: string | null;
  dateLabel: string;
  timeLabel: string;
  liveUrl: string | null;
  centers: string[];
};

export function HomeEventPopup({ event }: { event: PopupEvent }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const key = `home-popup-dismissed-${event.id}`;
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(key) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;
    const timer = window.setTimeout(() => setOpen(true), 700);
    return () => window.clearTimeout(timer);
  }, [event.id]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (handler: KeyboardEvent) => {
      if (handler.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = original;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function close() {
    try {
      window.localStorage.setItem(`home-popup-dismissed-${event.id}`, "1");
    } catch {
      // Storage can be blocked; closing still works for this visit.
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto bg-charcoal/70 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-event-popup-title"
    >
      <div className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-lift">
        <button
          type="button"
          onClick={close}
          aria-label="Close event popup"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-charcoal/70 text-white transition hover:bg-charcoal active:scale-95"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {event.coverUrl ? (
          <div className="relative aspect-[16/8] bg-brand-50">
            <Image
              src={event.coverUrl}
              alt={event.title}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="h-24 bg-brand-gradient" />
        )}

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-800">
              {event.category}
            </span>
            <LiveCountdown
              startsAt={event.startsAt}
              endsAt={event.endsAt}
              compact
            />
          </div>
          <h2
            id="home-event-popup-title"
            className="mt-2 font-serif text-2xl font-bold text-charcoal"
          >
            {event.title}
          </h2>
          <div className="mt-2 space-y-1.5 text-sm text-charcoal/65">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-700" aria-hidden="true" />
              {event.dateLabel} · {event.timeLabel}
            </p>
            {event.location ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand-700" aria-hidden="true" />
                {event.location}
              </p>
            ) : null}
            {event.centers.length ? (
              <p className="text-xs text-charcoal/50">
                {event.centers.join(" · ")}
              </p>
            ) : null}
          </div>
          {event.description ? (
            <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-6 text-charcoal/70">
              {event.description}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {event.liveUrl ? (
              <a
                href={event.liveUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses("primary", "lg", "w-full sm:flex-1")}
              >
                Watch live
              </a>
            ) : null}
            <Link
              href="/events"
              prefetch
              onClick={close}
              className={buttonClasses("outline", "lg", "w-full sm:flex-1")}
            >
              See all events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
