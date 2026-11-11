"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

export function NotificationBell({
  unread: initialUnread,
  href = "/member/notifications",
  label = "Notifications",
}: {
  unread: number;
  href?: string;
  label?: string;
}) {
  const [unread, setUnread] = useState(initialUnread);
  const pathname = usePathname();

  useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch("/api/notifications/unread", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as { count?: unknown };
        if (!active || typeof data.count !== "number") return;
        const count: number = data.count;
        setUnread((current) => (current === count ? current : count));
      } catch {
        return;
      }
    }

    const onRefresh = () => {
      void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };

    void refresh();
    const timer = window.setInterval(onRefresh, 45000);
    window.addEventListener("focus", onRefresh);
    window.addEventListener("notifications:changed", onRefresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("notifications:changed", onRefresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);

  return (
    <Link
      href={href}
      prefetch
      aria-label={`${label}${unread ? `, ${unread} unread` : ""}`}
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white text-charcoal/75 transition hover:border-brand-300 hover:text-brand-800 active:scale-95 active:opacity-70"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 ? (
        <span
          aria-live="polite"
          className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-cream"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
