"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({
  items,
  allowMultiple = false,
}: {
  items: Array<{ id: string; question: string; answer: string }>;
  allowMultiple?: boolean;
}) {
  const [open, setOpen] = useState<string[]>([]);

  const toggle = (id: string) => {
    setOpen((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      return allowMultiple ? [...current, id] : [id];
    });
  };

  return (
    <div className="divide-y divide-brand-100 overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-soft">
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                aria-controls={`accordion-${item.id}`}
                className="flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-charcoal hover:bg-cream/60"
              >
                <span>{item.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-brand-700 transition",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={`accordion-${item.id}`}
              hidden={!isOpen}
              className="px-5 pb-5 text-sm leading-7 text-charcoal/70"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
