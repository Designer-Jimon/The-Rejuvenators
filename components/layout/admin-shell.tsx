"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Cross,
  FileText,
  Globe,
  HelpCircle,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Settings,
  Share2,
  Sparkles,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { Avatar } from "@/components/ui/display";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  {
    href: "/admin/members",
    label: "Membership",
    icon: Users,
    exact: false,
    permission: "membership",
  },
  {
    href: "/admin/appointments",
    label: "Appointments",
    icon: CalendarClock,
    exact: false,
    permission: "appointments",
  },
  {
    href: "/admin/media",
    label: "Media library",
    icon: Images,
    exact: false,
    permission: "content",
  },
  {
    href: "/admin/branding",
    label: "Logo & branding",
    icon: Palette,
    exact: false,
    permission: "content",
  },
  {
    href: "/admin/slideshow",
    label: "Homepage slideshow",
    icon: Sparkles,
    exact: false,
    permission: "content",
  },
  {
    href: "/admin/content",
    label: "Website content",
    icon: FileText,
    exact: false,
    permission: "content",
  },
  {
    href: "/admin/activities",
    label: "Activities",
    icon: CalendarDays,
    exact: false,
    permission: "content",
  },
  {
    href: "/admin/departments",
    label: "Departments",
    icon: Building2,
    exact: false,
    permission: "content",
  },
  {
    href: "/admin/faqs",
    label: "FAQ",
    icon: HelpCircle,
    exact: false,
    permission: "content",
  },
  {
    href: "/admin/social",
    label: "Social & contact",
    icon: Share2,
    exact: false,
    permission: "settings",
  },
  {
    href: "/admin/settings",
    label: "Site settings",
    icon: Settings,
    exact: false,
    permission: "settings",
  },
];

export function AdminShell({
  children,
  name,
  avatarUrl,
  logoUrl,
  unread,
  canManageMembers,
  canManageAppointments,
  canManageContent,
  canManageSettings,
}: {
  children: ReactNode;
  name: string;
  avatarUrl: string | null;
  logoUrl: string | null;
  unread: number;
  canManageMembers: boolean;
  canManageAppointments: boolean;
  canManageContent: boolean;
  canManageSettings: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const items = navigation.filter((item) => {
    if (item.permission === "membership") return canManageMembers;
    if (item.permission === "appointments") return canManageAppointments;
    if (item.permission === "content") return canManageContent;
    if (item.permission === "settings") return canManageSettings;
    return true;
  });

  const nav = (
    <nav className="flex-1 space-y-1 p-3" aria-label="Admin">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={() => setOpen(false)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition active:scale-[0.98] active:opacity-80",
              active
                ? "bg-brand-700 text-cream shadow-soft"
                : "text-charcoal/70 hover:bg-brand-50 hover:text-brand-800",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-[100dvh] bg-cream">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-brand-100 bg-white lg:flex">
        <Link
          href="/admin"
          prefetch
          className="flex items-center gap-2.5 border-b border-brand-100 px-5 py-5 active:opacity-80"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-cream">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <Cross className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <span className="font-serif text-sm font-bold uppercase leading-tight text-brand-800">
            Admin
            <span className="block text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-charcoal/45">
              It Is Finished
            </span>
          </span>
        </Link>
        {nav}
        <div className="border-t border-brand-100 p-3">
          <div className="mb-2 flex items-center gap-3 px-2">
            <Avatar name={name} src={avatarUrl} size="sm" />
            <p className="truncate text-sm font-semibold">{name}</p>
          </div>
          <Link
            href="/member"
            prefetch
            className="flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-charcoal/65 transition hover:bg-brand-50 active:scale-[0.98] active:opacity-70"
          >
            <UserRound className="h-5 w-5" aria-hidden="true" />
            Member area
          </Link>
          <Link
            href="/"
            prefetch
            className="flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-charcoal/65 transition hover:bg-brand-50 active:scale-[0.98] active:opacity-70"
          >
            <Globe className="h-5 w-5" aria-hidden="true" />
            View website
          </Link>
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
            "safe-top sticky top-0 z-30 border-b border-brand-100 bg-cream/95 backdrop-blur transition-shadow duration-200",
            scrolled && "shadow-soft",
          )}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white transition active:scale-95 active:opacity-70 lg:hidden"
                aria-label="Open admin menu"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="hidden font-serif text-lg font-semibold text-charcoal sm:block">
                Admin dashboard
              </span>
              <span className="font-serif text-base font-semibold text-charcoal sm:hidden">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/member"
                prefetch
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-brand-100 bg-white px-2.5 text-sm font-semibold text-charcoal/70 transition active:scale-95 active:opacity-70 sm:px-3"
                aria-label="Member area"
              >
                <UserRound className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">Member area</span>
              </Link>
              <Link
                href="/"
                prefetch
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-brand-100 bg-white px-2.5 text-sm font-semibold text-charcoal/70 transition active:scale-95 active:opacity-70 sm:px-3"
                aria-label="View website"
              >
                <Globe className="h-5 w-5" aria-hidden="true" />
                <span className="hidden sm:inline">View website</span>
              </Link>
              <NotificationBell unread={unread} />
              <span className="hidden text-sm font-semibold text-charcoal/70 sm:block">
                {name}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-5 sm:px-6 lg:pt-8">
          {children}
        </main>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-[100] bg-cream transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none lg:hidden",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="safe-top safe-bottom flex h-[100dvh] flex-col bg-cream">
          <div className="flex items-center justify-between gap-3 border-b border-brand-100 px-4 py-3">
            <Link
              href="/admin"
              prefetch
              onClick={() => setOpen(false)}
              className="flex min-h-11 min-w-0 items-center gap-2.5 active:opacity-80"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-cream">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Cross className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-serif text-sm font-bold uppercase tracking-wide text-brand-800">
                  Admin
                </span>
                <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-charcoal/45">
                  {name}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-white transition active:scale-95 active:opacity-70"
              aria-label="Close admin menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav
            className="flex-1 overflow-y-auto px-4 py-2"
            aria-label="Admin mobile"
          >
            <div className="flex flex-col">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 w-full items-center gap-3 border-b border-brand-100 py-2 text-lg font-semibold transition active:opacity-70",
                      active ? "text-brand-800" : "text-charcoal/80",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active ? "text-brand-700" : "text-charcoal/40",
                      )}
                      aria-hidden="true"
                    />
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active ? "text-brand-700" : "text-charcoal/30",
                      )}
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-brand-100 p-4">
            <div className="flex flex-col gap-3">
              <Link
                href="/member"
                prefetch
                onClick={() => setOpen(false)}
                className={buttonClasses(
                  "outline",
                  "lg",
                  "min-h-[52px] w-full",
                )}
              >
                <UserRound className="h-5 w-5" aria-hidden="true" />
                Member area
              </Link>
              <Link
                href="/"
                prefetch
                onClick={() => setOpen(false)}
                className={buttonClasses(
                  "outline",
                  "lg",
                  "min-h-[52px] w-full",
                )}
              >
                <Globe className="h-5 w-5" aria-hidden="true" />
                View website
              </Link>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className={buttonClasses(
                  "primary",
                  "lg",
                  "min-h-[52px] w-full",
                )}
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
