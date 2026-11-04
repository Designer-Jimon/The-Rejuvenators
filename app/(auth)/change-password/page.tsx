import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export const metadata: Metadata = { title: "Change password" };

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/change-password");

  return (
    <div className="surface p-6 sm:p-8">
      <h1 className="font-serif text-3xl font-bold">Change password</h1>
      <p className="mt-2 text-sm leading-6 text-charcoal/65">
        Signed in as {user.email}.
      </p>
      <div className="mt-6">
        <ChangePasswordForm forced={user.mustChangePassword} />
      </div>
    </div>
  );
}
