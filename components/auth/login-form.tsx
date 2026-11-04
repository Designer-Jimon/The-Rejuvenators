"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage, Input } from "@/components/ui/form";

const initialState: AuthState = {};

export function LoginForm({
  next,
  registered,
}: {
  next?: string;
  registered?: boolean;
}) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {registered ? (
        <FormMessage tone="success">
          Registration received. Sign in to track your approval status.
        </FormMessage>
      ) : null}
      {state.error ? <FormMessage>{state.error}</FormMessage> : null}

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

      <FormField label="Password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
        />
      </FormField>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm font-semibold text-brand-800 hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" className="w-full" loading={pending}>
        Sign in
      </Button>

      <p className="text-center text-sm text-charcoal/60">
        New here?{" "}
        <Link href="/register" className="font-semibold text-brand-800 hover:underline">
          Create a member account
        </Link>
      </p>
    </form>
  );
}
