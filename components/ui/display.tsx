import type { ReactNode } from "react";
import { cn, initials } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand" | "gold";
  className?: string;
}) {
  const tones = {
    neutral: "bg-charcoal/5 text-charcoal/75",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-900",
    danger: "bg-red-100 text-red-800",
    brand: "bg-brand-100 text-brand-800",
    gold: "bg-gold-200 text-gold-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-2xl",
  };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/60 bg-brand-gradient font-serif font-semibold text-cream shadow-soft",
        sizes[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-200 bg-white/60 px-6 py-12 text-center">
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          {icon}
        </div>
      ) : null}
      <h3 className="font-serif text-lg font-semibold text-charcoal">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-charcoal/65">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  imageUrl,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  actions?: ReactNode;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-brand-gradient px-5 py-10 text-cream shadow-lift sm:px-8 sm:py-14"
      style={
        imageUrl
          ? {
              backgroundImage: `linear-gradient(120deg, rgba(75,15,15,0.88), rgba(234,88,12,0.55)), url(${imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="relative z-10 max-w-2xl">
        {eyebrow ? (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-200">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-cream/85 sm:text-base">
            {description}
          </p>
        ) : null}
        {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border border-white/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-16 h-64 w-64 rounded-full bg-gold-300/10"
      />
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow ? (
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-serif text-2xl font-semibold text-charcoal sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-charcoal/65">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "brand" | "gold" | "green" | "charcoal";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    gold: "bg-gold-200/60 text-gold-500",
    green: "bg-emerald-50 text-emerald-700",
    charcoal: "bg-charcoal/5 text-charcoal",
  };
  return (
    <div className="surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/55">
            {label}
          </p>
          <p className="mt-2 font-serif text-3xl font-bold text-charcoal">{value}</p>
          {hint ? <p className="mt-1 text-xs text-charcoal/55">{hint}</p> : null}
        </div>
        {icon ? (
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl",
              tones[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="inline-flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label ?? "Progress"}: ${clamped}%`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-brand-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="text-brand-700 transition-[stroke-dashoffset] duration-500"
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="fill-charcoal font-sans text-sm font-bold"
        >
          {clamped}%
        </text>
      </svg>
      {label ? <span className="text-sm text-charcoal/65">{label}</span> : null}
    </div>
  );
}

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export function ResponsiveTable<T>({
  rows,
  columns,
  rowKey,
  empty,
  caption,
}: {
  rows: T[];
  columns: Array<Column<T>>;
  rowKey: (row: T) => string;
  empty?: ReactNode;
  caption?: string;
}) {
  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-3xl border border-brand-100 bg-white shadow-soft md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-brand-50/70 text-xs uppercase tracking-wide text-charcoal/55">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn("px-5 py-3 font-semibold", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-middle hover:bg-cream/70">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-5 py-4", column.className)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <article
            key={rowKey(row)}
            className="rounded-3xl border border-brand-100 bg-white p-4 shadow-soft"
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className="flex items-start justify-between gap-3 border-b border-brand-50 py-2 last:border-0 last:pb-0"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">
                  {column.header}
                </span>
                <span className="text-right text-sm text-charcoal">
                  {column.render(row)}
                </span>
              </div>
            ))}
          </article>
        ))}
      </div>
    </>
  );
}
