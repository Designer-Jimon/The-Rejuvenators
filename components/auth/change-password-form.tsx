"use client";

import { useActionState, useState } from "react";
import { changePasswordAction, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage } from "@/components/ui/form";
import {
  PasswordChecklist,
  PasswordInput,
} from "@/components/ui/password-input";

const initialState: AuthState = {};

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      {forced ? (
        <FormMessage tone="info">
          For your security, choose a new password before continuing.
        </FormMessage>
      ) : null}
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}

      <FormField label="Current password" htmlFor="currentPassword">
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          required
        />
      </FormField>
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
    </form>
  );
}
