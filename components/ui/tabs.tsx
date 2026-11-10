"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

export function Tabs({
  items,
  defaultId,
  onChange,
}: {
  items: TabItem[];
  defaultId?: string;
  onChange?: (id: string) => void;
}) {
  const baseId = useId();
  const [active, setActive] = useState(defaultId ?? items[0]?.id ?? "");
  const current = items.find((item) => item.id === active) ?? items[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sections"
        className="hide-scrollbar mb-4 flex gap-1 overflow-x-auto rounded-2xl bg-brand-50 p-1"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={current?.id === item.id}
            aria-controls={`${baseId}-panel-${item.id}`}
            onClick={() => {
              setActive(item.id);
              onChange?.(item.id);
            }}
            className={cn(
              "min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold transition",
              current?.id === item.id
                ? "bg-white text-brand-800 shadow-sm"
                : "text-charcoal/60 hover:text-charcoal",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={current?.id !== item.id}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
