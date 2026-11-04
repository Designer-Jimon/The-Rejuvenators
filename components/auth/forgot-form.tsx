"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage, Input } from "@/components/ui/form";

const initialState: AuthState = {};

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}
      {state.success ? (
        <FormMessage tone="success">
          <p>{state.success}</p>
          {state.resetUrl ? (
            <p className="mt-2 break-all">
              Development reset link:{" "}
              <Link href={state.resetUrl} className="font-semibold underline">
                {state.resetUrl}
              </Link>
            </p>
          ) : null}
        </FormMessage>
      ) : null}

      <FormField label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </FormField>

      <Button type="submit" className="w-full" loading={pending}>
        Send reset link
      </Button>

      <p className="text-center text-sm text-charcoal/60">
        <Link href="/login" className="font-semibold text-brand-800 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
