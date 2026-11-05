"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  Cross,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mobilePrimaryClass =
  "inline-flex min-h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 text-base font-semibold text-cream shadow-soft transition active:scale-[0.97] active:opacity-90";

export function PublicHeader({
  churchName,
  logoUrl,
  links,
  isLoggedIn,
  isAdmin,
  dashboardHref,
  userName,
}: {
  churchName: string;
  logoUrl?: string | null;
  links: ReadonlyArray<{ href: string; label: string }>;
  isLoggedIn: boolean;
  isAdmin: boolean;
  dashboardHref: string;
  userName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <header
        className={cn(
          "safe-top sticky top-0 z-50 border-b border-brand-100/80 bg-cream/95 backdrop-blur transition-shadow duration-200",
          scrolled && "shadow-soft",
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link
            href="/"
            prefetch
            className="flex min-h-11 items-center gap-2.5 active:opacity-80"
            aria-label={`${churchName} home`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-cream shadow-soft">
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
            <span className="max-w-[190px] leading-tight sm:max-w-none">
              <span className="block font-serif text-sm font-bold uppercase tracking-wide text-brand-800 sm:text-base">
                {churchName}
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-charcoal/45">
                Revival Outreach
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                className="min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold text-charcoal/70 transition hover:bg-brand-50 hover:text-brand-800 active:scale-[0.98] active:opacity-80"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {isLoggedIn ? (
              <>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    prefetch
                    className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-brand-200 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50 active:scale-[0.98] active:opacity-80"
                  >
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                    Admin
                  </Link>
                ) : null}
                <Link href={dashboardHref} prefetch>
                  <Button size="sm">
                    {userName?.split(" ")[0] ?? "My account"}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  loading={loggingOut}
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" prefetch>
                  <Button variant="outline" size="sm">
                    Member login
                  </Button>
                </Link>
                <Link href="/register" prefetch>
                  <Button size="sm">Join the family</Button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white text-charcoal transition active:scale-95 active:opacity-70 lg:hidden"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="public-mobile-menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div
        id="public-mobile-menu"
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
              href="/"
              prefetch
              onClick={() => setOpen(false)}
              className="flex min-h-11 min-w-0 items-center gap-2.5 active:opacity-80"
              aria-label={`${churchName} home`}
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
              <span className="min-w-0 truncate font-serif text-sm font-bold uppercase tracking-wide text-brand-800">
                {churchName}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-white transition active:scale-95 active:opacity-70"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <nav
            className="flex-1 overflow-y-auto px-4 py-2"
            aria-label="Mobile"
          >
            <div className="flex flex-col">
              {links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 w-full items-center justify-between gap-3 border-b border-brand-100 py-2 text-lg font-semibold transition active:opacity-70",
                      active ? "text-brand-800" : "text-charcoal/80",
                    )}
                  >
                    <span>{link.label}</span>
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
            {isLoggedIn ? (
              <div className="flex flex-col gap-3">
                <Link
                  href={dashboardHref}
                  prefetch
                  onClick={() => setOpen(false)}
                  className={mobilePrimaryClass}
                >
                  {isAdmin ? "Open admin dashboard" : "My member dashboard"}
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    prefetch
                    onClick={() => setOpen(false)}
                    className={buttonClasses(
                      "outline",
                      "lg",
                      "min-h-[52px] w-full",
                    )}
                  >
                    Admin dashboard
                  </Link>
                ) : null}
                <Button
                  variant="ghost"
                  onClick={logout}
                  loading={loggingOut}
                  className="min-h-[52px] w-full"
                >
                  Log out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  prefetch
                  onClick={() => setOpen(false)}
                  className={buttonClasses(
                    "outline",
                    "lg",
                    "min-h-[52px] w-full",
                  )}
                >
                  Member login
                </Link>
                <Link
                  href="/register"
                  prefetch
                  onClick={() => setOpen(false)}
                  className={mobilePrimaryClass}
                >
                  Join the family
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
