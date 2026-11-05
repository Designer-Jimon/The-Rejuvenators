"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, Cross, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  return (
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
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-cream shadow-soft">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
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
                <Button size="sm">{userName?.split(" ")[0] ?? "My account"}</Button>
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
          id="public-mobile-menu"
          className={cn(
            "safe-bottom ml-auto flex h-full w-[86%] max-w-sm flex-col bg-cream p-5 shadow-lift transition-transform",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-serif text-lg font-bold text-brand-800">
              Menu
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white transition active:scale-95 active:opacity-70"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-2xl px-4 font-semibold text-charcoal transition hover:bg-brand-50 active:scale-[0.98] active:opacity-70"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2 border-t border-brand-100 pt-5">
            {isLoggedIn ? (
              <>
                <Link href={dashboardHref} prefetch onClick={() => setOpen(false)}>
                  <Button className="w-full">
                    {isAdmin ? "Open admin dashboard" : "My member dashboard"}
                  </Button>
                </Link>
                {isAdmin ? (
                  <Link href="/admin" prefetch onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Admin dashboard
                    </Button>
                  </Link>
                ) : null}
                <Button
                  variant="ghost"
                  onClick={logout}
                  loading={loggingOut}
                  className="w-full"
                >
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" prefetch onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Member login
                  </Button>
                </Link>
                <Link href="/register" prefetch onClick={() => setOpen(false)}>
                  <Button className="w-full">Join the family</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
