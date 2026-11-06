"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { resetPasswordAction, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage } from "@/components/ui/form";
import {
  PasswordChecklist,
  PasswordInput,
} from "@/components/ui/password-input";

const initialState: AuthState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialState,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

      <FormField
        label="New password"
        htmlFor="password"
        hint="Use 8+ characters with uppercase, lowercase and a number."
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <PasswordChecklist value={password} confirmValue={confirmPassword} />
      </FormField>
      <FormField label="Confirm new password" htmlFor="confirmPassword">
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
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
