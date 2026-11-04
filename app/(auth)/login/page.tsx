import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/authorize";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  const user = await getSessionUser();
  if (user) {
    if (user.mustChangePassword) redirect("/change-password");
    redirect(isAdmin(user) ? "/admin" : "/member");
  }

  const params = await searchParams;

  return (
    <div className="surface p-6 sm:p-8">
      <h1 className="font-serif text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-sm leading-6 text-charcoal/65">
        Sign in to your member account or admin dashboard.
      </p>
      <div className="mt-6">
        <LoginForm next={params.next} registered={params.registered === "1"} />
      </div>
    </div>
  );
}
