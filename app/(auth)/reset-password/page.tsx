import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="surface p-6 text-center sm:p-8">
        <h1 className="font-serif text-2xl font-bold">Invalid reset link</h1>
        <p className="mt-2 text-sm text-charcoal/65">
          This link is missing a token. Request a new password reset link.
        </p>
        <Link href="/forgot-password" className="mt-5 inline-block">
          <Button>Request a new link</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="surface p-6 sm:p-8">
      <h1 className="font-serif text-3xl font-bold">Choose a new password</h1>
      <p className="mt-2 text-sm leading-6 text-charcoal/65">
        Use a strong password you have not used before.
      </p>
      <div className="mt-6">
        <ResetForm token={token} />
      </div>
    </div>
  );
}
