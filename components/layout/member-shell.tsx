"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  Cross,
  Home,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { Avatar } from "@/components/ui/display";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/member", label: "Home", icon: Home },
  { href: "/member/events", label: "Events", icon: CalendarDays },
  { href: "/member/appointments", label: "Appointments", icon: CalendarClock },
  { href: "/member/directory", label: "Directory", icon: Users },
  { href: "/member/chat", label: "Chat", icon: MessageCircle },
  { href: "/member/notifications", label: "Alerts", icon: Bell },
  { href: "/member/profile", label: "Profile", icon: UserRound },
  { href: "/member/settings", label: "Settings", icon: Settings },
];

const mobileNavigation = navigation.filter(
  (item) => item.href !== "/member/notifications",
);

export function MemberShell({
  children,
  name,
  avatarUrl,
  memberCode,
  unread,
  unreadChat,
  canAccessAdmin,
}: {
  children: ReactNode;
  name: string;
  avatarUrl: string | null;
  memberCode: string | null;
  unread: number;
  unreadChat: number;
  canAccessAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string) =>
    href === "/member" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-[100dvh] bg-cream">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-brand-100 bg-white lg:flex">
        <Link
          href="/"
          prefetch
          className="flex items-center gap-2.5 border-b border-brand-100 px-5 py-5 active:opacity-80"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient text-cream">
            <Cross className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-sm font-bold uppercase leading-tight text-brand-800">
            It Is Finished
            <span className="block text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-charcoal/45">
              Member platform
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-3 border-b border-brand-100 px-5 py-4">
          <Avatar name={name} src={avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-charcoal/50">
              {memberCode ?? "Member"}
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Member">
          {navigation.map((item) => {
            const Icon = item.icon;
            const badge =
              item.href === "/member/notifications"
                ? unread
                : item.href === "/member/chat"
                  ? unreadChat
                  : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition active:scale-[0.98] active:opacity-80",
                  isActive(item.href)
                    ? "bg-brand-700 text-cream shadow-soft"
                    : "text-charcoal/70 hover:bg-brand-50 hover:text-brand-800",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
                {badge > 0 ? (
                  <span className="ml-auto rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-brand-100 p-3">
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-charcoal/65 transition hover:bg-brand-50 hover:text-brand-800 active:scale-[0.98] active:opacity-70"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header
          className={cn(
            "safe-top sticky top-0 z-30 border-b border-brand-100 bg-cream/95 backdrop-blur transition-shadow duration-200 lg:hidden",
            scrolled && "shadow-soft",
          )}
        >
          <div className="flex items-center justify-between px-4 py-2">
            <Link
              href="/member"
              prefetch
              className="flex min-h-11 items-center gap-2 active:opacity-80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-cream">
                <Cross className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-serif text-sm font-bold text-brand-800">
                Member
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {canAccessAdmin ? (
                <Link
                  href="/admin"
                  prefetch
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand-700 px-3 text-sm font-semibold text-cream shadow-soft transition active:scale-95 active:opacity-80"
                  aria-label="Open admin dashboard"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Admin
                </Link>
              ) : null}
              <NotificationBell unread={unread} />
              <Link
                href="/member/profile"
                prefetch
                className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 active:opacity-70"
                aria-label="My profile"
              >
                <Avatar name={name} src={avatarUrl} size="sm" />
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>

      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-brand-100 bg-white/95 backdrop-blur lg:hidden"
        aria-label="Member bottom navigation"
      >
        <div className="mx-auto grid max-w-xl grid-cols-7">
          {mobileNavigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const badge = item.href === "/member/chat" ? unreadChat : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition active:scale-95 active:opacity-70 sm:text-[10px]",
                  active ? "text-brand-800" : "text-charcoal/50",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
                {badge > 0 ? (
                  <span className="absolute right-[26%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-700 px-1 text-[9px] font-bold text-cream">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
