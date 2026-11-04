import Link from "next/link";
import { Cross } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-cream">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-64 bg-brand-gradient sm:h-80"
      />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 py-6 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2.5 self-start text-cream"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Cross className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-serif text-sm font-bold uppercase tracking-wide">
            It Is Finished
            <span className="block text-[10px] font-sans font-semibold uppercase tracking-[0.18em] text-cream/70">
              Revival Outreach
            </span>
          </span>
        </Link>
        <div className="my-6 flex flex-1 items-center justify-center">
          <div className="w-full max-w-lg">{children}</div>
        </div>
        <p className="text-center text-xs text-charcoal/45">
          IT IS FINISHED REVIVAL OUTREACH
        </p>
      </div>
    </div>
  );
}
