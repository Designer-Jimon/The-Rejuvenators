import Link from "next/link";
import { Cross } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/authorize";
import { getSettings } from "@/lib/settings";
import { PublicHeader } from "@/components/layout/public-header";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, settings] = await Promise.all([getSessionUser(), getSettings()]);
  const admin = user ? isAdmin(user) : false;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PublicHeader
        churchName={settings.church_name}
        isLoggedIn={Boolean(user)}
        isAdmin={admin}
        dashboardHref={admin ? "/admin" : "/member"}
        userName={user?.name}
      />
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-brand-100 bg-white">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-gradient text-cream">
                <Cross className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-serif text-base font-bold uppercase text-brand-800">
                {settings.church_name}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-charcoal/60">
              {settings.tagline}
            </p>
            <p className="mt-3 text-xs text-charcoal/45">{settings.footer_note}</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-charcoal/45">
              Visit us
            </h2>
            <address className="mt-3 space-y-1 text-sm not-italic leading-6 text-charcoal/70">
              <p>{settings.address}</p>
              <p>{settings.service_sunday}</p>
              <p>{settings.service_weekday}</p>
            </address>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-charcoal/45">
              Connect
            </h2>
            <div className="mt-3 space-y-1 text-sm leading-6 text-charcoal/70">
              <p>{settings.phone}</p>
              <p>{settings.email}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-brand-800">
              <Link href="/contact" className="hover:underline">
                Contact
              </Link>
              <Link href="/login" className="hover:underline">
                Member login
              </Link>
              <Link href="/register" className="hover:underline">
                Register
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
