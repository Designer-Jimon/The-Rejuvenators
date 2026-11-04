"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (input: {
    title: string;
    description?: string;
    variant?: ToastVariant;
  }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ title, description, variant = "success" }) => {
      const id = crypto.randomUUID();
      setItems((current) => [...current, { id, title, description, variant }]);
      window.setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-3 bottom-24 z-[80] flex flex-col items-center gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end"
      >
        {items.map((item) => {
          const Icon =
            item.variant === "success"
              ? CheckCircle2
              : item.variant === "error"
                ? AlertTriangle
                : Info;
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border p-4 shadow-lift",
                item.variant === "success" &&
                  "border-emerald-200 bg-emerald-50 text-emerald-900",
                item.variant === "error" &&
                  "border-red-200 bg-red-50 text-red-900",
                item.variant === "info" &&
                  "border-brand-200 bg-white text-charcoal",
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? (
                  <p className="mt-0.5 text-sm opacity-80">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-lg p-1 hover:bg-black/5"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
