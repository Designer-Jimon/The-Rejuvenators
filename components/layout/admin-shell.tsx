"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  Cross,
  FileText,
  HelpCircle,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Settings,
  Share2,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { Avatar } from "@/components/ui/display";
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
  canManageContent,
  canManageSettings,
}: {
  children: ReactNode;
  name: string;
  avatarUrl: string | null;
  logoUrl: string | null;
  unread: number;
  canManageMembers: boolean;
  canManageContent: boolean;
  canManageSettings: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
            onClick={() => setOpen(false)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold transition",
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
          className="flex items-center gap-2.5 border-b border-brand-100 px-5 py-5"
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-cream">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-full w-full object-cover"
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
            className="flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-charcoal/65 hover:bg-brand-50"
          >
            Member view
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-charcoal/65 hover:bg-brand-50 hover:text-brand-800"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="safe-top sticky top-0 z-30 border-b border-brand-100 bg-cream/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white lg:hidden"
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
            <div className="flex items-center gap-2">
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
          "fixed inset-0 z-[60] bg-charcoal/50 backdrop-blur-sm transition lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
        aria-hidden={!open}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
      >
        <div
          className={cn(
            "flex h-full w-[82%] max-w-xs flex-col bg-white shadow-lift transition-transform",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
            <span className="font-serif text-lg font-bold text-brand-800">Admin</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100"
              aria-label="Close admin menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-3 border-b border-brand-100 px-4 py-4">
            <Avatar name={name} src={avatarUrl} size="md" />
            <p className="truncate text-sm font-semibold">{name}</p>
          </div>
          {nav}
          <div className="border-t border-brand-100 p-3">
            <Link
              href="/member"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-charcoal/65 hover:bg-brand-50"
            >
              Member view
            </Link>
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3.5 text-sm font-semibold text-charcoal/65 hover:bg-brand-50"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
