"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage, Input } from "@/components/ui/form";

const initialState: AuthState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  if (state.success) {
    return (
      <div className="space-y-4">
        <FormMessage tone="success">{state.success}</FormMessage>
        <Link href="/login" prefetch>
          <Button className="w-full">Go to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}

      <FormField label="New password" htmlFor="password" hint="At least 8 characters with a letter and number.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <FormField label="Confirm new password" htmlFor="confirmPassword">
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>

      <Button type="submit" className="w-full" loading={pending}>
        Update password
      </Button>

      <p className="text-center text-sm text-charcoal/60">
        <Link href="/login" prefetch className="font-semibold text-brand-800 hover:underline active:opacity-70">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
