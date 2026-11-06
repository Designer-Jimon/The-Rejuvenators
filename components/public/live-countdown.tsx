"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  startsAt: string;
  endsAt?: string | null;
  className?: string;
  compact?: boolean;
};

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function LiveCountdown({ startsAt, endsAt, className, compact }: Props) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const start = useMemo(() => new Date(startsAt).getTime(), [startsAt]);
  const end = useMemo(
    () => (endsAt ? new Date(endsAt).getTime() : null),
    [endsAt],
  );

  if (now === null) return null;

  const live = now >= start && (end === null || now <= end);
  if (live) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white",
          className,
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
        </span>
        Live now
      </span>
    );
  }

  if (end !== null && now > end) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal/50",
          className,
        )}
      >
        <Radio className="h-3.5 w-3.5" aria-hidden="true" />
        Event ended
      </span>
    );
  }

  const remaining = parts(start - now);
  const units = [
    remaining.days ? { label: "d", value: remaining.days } : null,
    { label: "h", value: remaining.hours },
    { label: "m", value: remaining.minutes },
    { label: "s", value: remaining.seconds },
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal/60",
        className,
      )}
      aria-label="Countdown to event"
    >
      <Radio className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
      {compact ? "Starts in" : "Starts in"}{" "}
      <span className="tabular-nums">
        {units.map((unit, index) => (
          <span key={unit.label}>
            {index ? " " : ""}
            {unit.value}
            {unit.label}
          </span>
        ))}
      </span>
    </span>
  );
}
