"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const active = useRef(false);
  const ticker = useRef<number | null>(null);
  const hider = useRef<number | null>(null);

  const stopTicker = useCallback(() => {
    if (ticker.current !== null) {
      window.clearInterval(ticker.current);
      ticker.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (active.current) return;
    active.current = true;
    if (hider.current !== null) window.clearTimeout(hider.current);
    setVisible(true);
    setProgress(12);
    stopTicker();
    ticker.current = window.setInterval(() => {
      setProgress((value) =>
        value >= 88 ? value : value + Math.max(1, (88 - value) * 0.16),
      );
    }, 200);
  }, [stopTicker]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("href")?.startsWith("#")
      ) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname + url.search ===
        window.location.pathname + window.location.search
      ) {
        return;
      }

      start();
    };

    const onPopState = () => start();

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
    };
  }, [start]);

  useEffect(() => {
    if (!active.current) return;
    active.current = false;
    stopTicker();
    setProgress(100);
    hider.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);
  }, [pathname, search, stopTicker]);

  useEffect(
    () => () => {
      stopTicker();
      if (hider.current !== null) window.clearTimeout(hider.current);
    },
    [stopTicker],
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        className={cn(
          "h-full origin-left bg-gradient-to-r from-brand-600 via-gold-400 to-brand-700 transition-[width,opacity] duration-200 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
