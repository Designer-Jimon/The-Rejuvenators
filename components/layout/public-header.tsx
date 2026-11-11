"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/branding/logo";
import { churchNameLines } from "@/lib/branding";
import type { PublicNavItem } from "@/lib/navigation-types";
import { cn } from "@/lib/utils";

const mobilePrimaryClass =
  "inline-flex min-h-[52px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-brand-gradient px-5 text-base font-semibold text-cream shadow-soft transition active:scale-[0.97] active:opacity-90";

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NameStack({
  churchName,
  className,
}: {
  churchName: string;
  className?: string;
}) {
  const lines = churchNameLines(churchName);
  return (
    <span
      className={cn(
        "flex flex-col justify-center gap-[3px] whitespace-nowrap font-serif font-bold uppercase leading-none",
        className,
      )}
    >
      {lines.map((line, index) => (
        <span
          key={`${line}-${index}`}
          className={cn(
            "block",
            index === 0 && "text-[13px] tracking-[0.14em] sm:text-sm",
            index === 1 && "text-[11px] tracking-[0.16em] sm:text-xs",
            index > 1 && "text-[9px] tracking-[0.24em] opacity-85",
          )}
        >
          {line}
        </span>
      ))}
    </span>
  );
}

export function PublicHeader({
  churchName,
  tagline,
  logoUrl,
  links,
  devotionalHref,
  isLoggedIn,
  isAdmin,
  dashboardHref,
  userName,
}: {
  churchName: string;
  tagline: string;
  logoUrl?: string | null;
  links: ReadonlyArray<PublicNavItem>;
  devotionalHref: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  dashboardHref: string;
  userName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
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

  function hrefFor(item: PublicNavItem) {
    return item.href === "/devotionals" ? devotionalHref : item.href;
  }

  return (
    <>
      <header
        className={cn(
          "safe-top sticky top-0 z-50 transition-shadow duration-200",
          scrolled && "shadow-lift",
        )}
      >
        <div className="bg-brand-gradient text-cream">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
            <Link
              href="/"
              prefetch
              className="flex min-h-11 items-center gap-3 active:opacity-80"
              aria-label={`${churchName} home`}
            >
              <Logo
                src={logoUrl}
                className="h-11 w-11 rounded-2xl bg-white/10 shadow-none"
              />
              <NameStack churchName={churchName} />
              <span className="sr-only">
                {churchName} - {tagline}
              </span>
            </Link>

            <div className="hidden items-center gap-2 lg:flex">
              {isLoggedIn ? (
                <>
                  {isAdmin ? (
                    <Link
                      href="/admin"
                      prefetch
                      className={buttonClasses(
                        "outline",
                        "sm",
                        "border-white/30 bg-transparent text-cream hover:bg-white/10",
                      )}
                    >
                      <LayoutDashboard
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      Admin
                    </Link>
                  ) : null}
                  <Link
                    href={dashboardHref}
                    prefetch
                    className={buttonClasses("gold", "sm")}
                  >
                    {userName?.split(" ")[0] ?? "My account"}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    loading={loggingOut}
                    className="text-cream hover:bg-white/10"
                  >
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    prefetch
                    className={buttonClasses(
                      "outline",
                      "sm",
                      "border-white/30 bg-transparent text-cream hover:bg-white/10",
                    )}
                  >
                    Member login
                  </Link>
                  <Link
                    href="/register"
                    prefetch
                    className={buttonClasses("gold", "sm")}
                  >
                    Join the family
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-cream transition active:scale-95 active:opacity-70 lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="public-mobile-menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="hidden border-b border-brand-100 bg-cream/95 backdrop-blur lg:block">
          <nav
            className="mx-auto flex w-full max-w-6xl items-center gap-0.5 px-4 sm:px-6"
            aria-label="Main"
          >
            {links.map((item) => {
              const href = hrefFor(item);
              const active = isActivePath(pathname, item.href);

              if (!item.children?.length) {
                return (
                  <Link
                    key={item.label}
                    href={href}
                    prefetch
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-12 items-center whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold transition hover:bg-brand-50 hover:text-brand-800 active:opacity-80 xl:px-3.5 xl:text-sm",
                      active
                        ? "text-brand-800"
                        : "text-charcoal/70",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              }

              return (
                <div key={item.label} className="group relative">
                  <Link
                    href={href}
                    prefetch
                    aria-haspopup="true"
                    className={cn(
                      "flex min-h-12 items-center gap-1 whitespace-nowrap rounded-xl px-3 text-[13px] font-semibold transition hover:bg-brand-50 hover:text-brand-800 active:opacity-80 xl:px-3.5 xl:text-sm",
                      active ? "text-brand-800" : "text-charcoal/70",
                    )}
                  >
                    {item.label}
                    <ChevronDown
                      className="h-3.5 w-3.5 transition group-hover:rotate-180 group-focus-within:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                  <div className="invisible absolute left-0 top-full z-50 w-56 translate-y-1 rounded-2xl border border-brand-100 bg-white p-1.5 opacity-0 shadow-lift transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        prefetch
                        className={cn(
                          "flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition hover:bg-brand-50 active:opacity-70",
                          isActivePath(pathname, child.href)
                            ? "bg-brand-50 text-brand-800"
                            : "text-charcoal/70",
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </header>

      {open ? (
        <div
          id="public-mobile-menu"
          className="fixed inset-0 z-[100] bg-cream lg:hidden"
        >
          <div className="safe-top safe-bottom flex h-[100dvh] flex-col bg-cream">
            <div className="bg-brand-gradient px-4 pb-4 pt-3 text-cream">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href="/"
                  prefetch
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 min-w-0 items-center gap-3 active:opacity-80"
                  aria-label={`${churchName} home`}
                >
                  <Logo
                    src={logoUrl}
                    className="h-11 w-11 rounded-2xl bg-white/10 shadow-none"
                  />
                  <span className="min-w-0">
                    <NameStack churchName={churchName} />
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  autoFocus
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-cream transition active:scale-95 active:opacity-70"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-cream/75">
                {tagline}
              </p>
            </div>

          <nav
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-2"
            aria-label="Mobile"
          >
            <div className="flex flex-col">
              {links.map((item) => {
                if (!item.children?.length) {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.label}
                      href={hrefFor(item)}
                      prefetch
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 w-full items-center justify-between gap-3 border-b border-brand-100 py-2 text-lg font-semibold transition active:opacity-70",
                        active ? "text-brand-800" : "text-charcoal/80",
                      )}
                    >
                      <span>{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-5 w-5 shrink-0",
                          active ? "text-brand-700" : "text-charcoal/30",
                        )}
                        aria-hidden="true"
                      />
                    </Link>
                  );
                }

                const expanded = openGroup === item.label;
                const active = isActivePath(pathname, item.href);
                const groupId = `mobile-nav-${item.label
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`;

                return (
                  <div key={item.label} className="border-b border-brand-100">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroup(expanded ? null : item.label)
                      }
                      aria-expanded={expanded}
                      aria-controls={groupId}
                      className={cn(
                        "flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left text-lg font-semibold transition active:opacity-70",
                        active ? "text-brand-800" : "text-charcoal/80",
                      )}
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 shrink-0 transition-transform",
                          expanded && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    <div
                      id={groupId}
                      className={cn(
                        "grid transition-[grid-template-rows] duration-200",
                        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="mb-2 flex flex-col rounded-2xl bg-brand-50/70 p-1.5">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              prefetch
                              onClick={() => setOpen(false)}
                              className="flex min-h-12 items-center rounded-xl px-3 text-base font-semibold text-charcoal/75 transition active:bg-white active:opacity-80"
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
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
      ) : null}

    </>
  );
}
