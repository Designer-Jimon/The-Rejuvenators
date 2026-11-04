"use client";

import { useActionState } from "react";
import { changePasswordAction, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage, Input } from "@/components/ui/form";

const initialState: AuthState = {};

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {forced ? (
        <FormMessage tone="info">
          For your security, choose a new password before continuing.
        </FormMessage>
      ) : null}
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}

      <FormField label="Current password" htmlFor="currentPassword">
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </FormField>
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
    </form>
  );
}
