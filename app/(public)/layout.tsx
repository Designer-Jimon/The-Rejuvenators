import Link from "next/link";
import {
  Cross,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Youtube,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/authorize";
import { getSettings } from "@/lib/settings";
import { PublicHeader } from "@/components/layout/public-header";

export const dynamic = "force-dynamic";

const footerLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/vision-mission", label: "Vision & Mission" },
  { href: "/activities", label: "Activities" },
  { href: "/departments", label: "Departments" },
  { href: "/events", label: "Events" },
  { href: "/sermons", label: "Sermons" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, settings] = await Promise.all([getSessionUser(), getSettings()]);
  const admin = user ? isAdmin(user) : false;

  const socials = [
    { href: settings.facebook_url, label: "Facebook", icon: Facebook },
    { href: settings.instagram_url, label: "Instagram", icon: Instagram },
    { href: settings.youtube_url, label: "YouTube", icon: Youtube },
    {
      href: settings.whatsapp_group_url,
      label: "WhatsApp",
      icon: MessageCircle,
    },
  ].filter((social) => social.href.startsWith("http"));

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden">
      <PublicHeader
        churchName={settings.church_name}
        logoUrl={settings.logo_key ? "/api/branding/logo" : null}
        isLoggedIn={Boolean(user)}
        isAdmin={admin}
        dashboardHref={admin ? "/admin" : "/member"}
        userName={user?.name}
      />
      <main className="flex-1">{children}</main>
      <footer className="mt-16 border-t border-brand-100 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-brand-gradient text-cream">
                  {settings.logo_key ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/api/branding/logo"
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Cross className="h-5 w-5" aria-hidden="true" />
                  )}
                </span>
                <span className="font-serif text-base font-bold uppercase text-brand-800">
                  {settings.church_name}
                </span>
              </Link>
              <p className="mt-3 text-base leading-7 text-charcoal/65">
                {settings.tagline}
              </p>
              <p className="mt-3 text-sm leading-6 text-charcoal/50">
                {settings.footer_note}
              </p>
            </div>

            <nav aria-label="Footer">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-charcoal/45">
                Explore
              </h2>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                {footerLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-10 items-center text-sm font-semibold text-charcoal/70 hover:text-brand-800 hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-charcoal/45">
                Visit us
              </h2>
              <address className="mt-3 space-y-3 text-sm not-italic leading-6 text-charcoal/70">
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <span>{settings.address}</span>
                </p>
                <p>
                  <span className="block text-xs font-bold uppercase tracking-wide text-charcoal/45">
                    Sunday
                  </span>
                  {settings.service_sunday}
                </p>
                <p>
                  <span className="block text-xs font-bold uppercase tracking-wide text-charcoal/45">
                    Midweek
                  </span>
                  {settings.service_weekday}
                </p>
              </address>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-charcoal/45">
                Connect
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-charcoal/70">
                <p className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <span>{settings.phone}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
                  <span>{settings.email}</span>
                </p>
              </div>
              {socials.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {socials.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={social.label}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 text-brand-800 transition hover:bg-brand-50"
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-charcoal/45">
                  [Social links - edit in Admin]
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-brand-800">
                <Link href="/login" className="hover:underline">
                  Member login
                </Link>
                <Link href="/register" className="hover:underline">
                  Register
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-brand-100 pt-6 text-xs text-charcoal/45 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} {settings.church_name}. All rights
              reserved.
            </p>
            <p>Built for the revival family.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
