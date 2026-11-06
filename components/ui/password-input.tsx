"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export const passwordRules = [
  { key: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { key: "lower", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { key: "number", label: "One number", test: (value: string) => /[0-9]/.test(value) },
] as const;

export function isStrongPassword(value: string) {
  return passwordRules.every((rule) => rule.test(value));
}

export function PasswordInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-charcoal/55 transition hover:bg-brand-50 active:opacity-70"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeOff className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Eye className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export function PasswordChecklist({
  value,
  confirmValue,
}: {
  value: string;
  confirmValue?: string;
}) {
  if (!value) return null;
  const items: { key: string; label: string; met: boolean }[] = passwordRules.map(
    (rule) => ({
      key: rule.key,
      label: rule.label,
      met: rule.test(value),
    }),
  );
  if (confirmValue !== undefined) {
    items.push({
      key: "match",
      label: "Passwords match",
      met: value.length > 0 && value === confirmValue,
    });
  }

  return (
    <ul className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2" aria-live="polite">
      {items.map((item) => (
        <li
          key={item.key}
          className={cn(
            "flex items-center gap-1.5",
            item.met ? "text-emerald-700" : "text-charcoal/55",
          )}
        >
          {item.met ? (
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          {item.label}
        </li>
      ))}
    </ul>
  );
}
