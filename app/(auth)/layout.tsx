import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { CHURCH_NAME, CHURCH_TAGLINE } from "@/lib/branding";
import { Logo } from "@/components/branding/logo";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  const churchName = settings.church_name?.trim() || CHURCH_NAME;
  const tagline = settings.tagline?.trim() || CHURCH_TAGLINE;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-cream">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-64 bg-brand-gradient sm:h-80"
      />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        <Link
          href="/"
          prefetch
          className="flex min-h-11 items-center gap-2.5 self-start text-cream active:opacity-80"
        >
          <Logo className="bg-white/15 backdrop-blur" />
          <span className="font-serif text-sm font-bold uppercase tracking-wide">
            {churchName}
            <span className="block text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-cream/70">
              {tagline}
            </span>
          </span>
        </Link>
        <div className="my-6 flex flex-1 items-center justify-center">
          <div className="w-full max-w-lg">{children}</div>
        </div>
        <p className="text-center text-xs text-charcoal/45">{churchName}</p>
      </div>
    </div>
  );
}
