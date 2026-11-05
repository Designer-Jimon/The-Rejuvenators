import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-700 text-cream hover:bg-brand-800 shadow-soft active:bg-brand-900",
  secondary:
    "bg-charcoal text-cream hover:bg-charcoal/90 shadow-soft",
  outline:
    "border border-brand-200 bg-white text-brand-800 hover:border-brand-400 hover:bg-brand-50",
  ghost: "text-charcoal hover:bg-brand-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
  gold: "bg-gold-300 text-charcoal hover:bg-gold-400 shadow-soft",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-3.5 text-sm",
  md: "min-h-11 px-5 text-[15px]",
  lg: "min-h-12 px-6 text-base",
  icon: "h-11 w-11 p-0",
};

export function buttonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) {
  return cn(
    "inline-flex touch-manipulation select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-[transform,background-color,color,border-color,opacity] duration-150 active:scale-[0.97] active:opacity-90 disabled:pointer-events-none disabled:opacity-60",
    variants[variant],
    sizes[size],
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
