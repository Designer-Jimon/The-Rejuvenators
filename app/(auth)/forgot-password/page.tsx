import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="surface p-6 sm:p-8">
      <h1 className="font-serif text-3xl font-bold">Reset your password</h1>
      <p className="mt-2 text-sm leading-6 text-charcoal/65">
        Enter the email on your account and we will send a secure reset link.
      </p>
      <div className="mt-6">
        <ForgotForm />
      </div>
    </div>
  );
}
