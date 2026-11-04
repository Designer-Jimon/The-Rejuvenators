import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("field-label", className)} {...props} />;
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-2xl border border-brand-200 bg-white px-4 text-base text-charcoal shadow-sm placeholder:text-charcoal/40 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-brand-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-brand-200 bg-white px-4 py-3 text-base text-charcoal shadow-sm placeholder:text-charcoal/40 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-brand-50",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-12 w-full rounded-2xl border border-brand-200 bg-white px-4 text-base text-charcoal shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-brand-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
      {children}
    </p>
  );
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="field-hint">{hint}</p> : null}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function FormMessage({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children?: ReactNode;
}) {
  if (!children) return null;
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-brand-200 bg-brand-50 text-brand-900",
  };
  return (
    <div
      role="status"
      className={cn("rounded-2xl border px-4 py-3 text-sm", tones[tone])}
    >
      {children}
    </div>
  );
}
