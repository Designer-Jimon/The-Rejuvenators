"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Combobox({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Search...",
  disabled = false,
  allowCustom = false,
  maxResults = 8,
  className,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  maxResults?: number;
  className?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-listbox`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? options.filter((option) => option.toLowerCase().includes(needle))
      : options;
    return matches.slice(0, maxResults);
  }, [maxResults, options, query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        if (!allowCustom && query !== value) setQuery(value);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [allowCustom, query, value]);

  function select(option: string) {
    onChange(option);
    setQuery(option);
    setOpen(false);
  }

  function commitTyped() {
    if (!allowCustom) {
      setQuery(value);
      return;
    }
    const next = query.trim();
    onChange(next);
    setQuery(next);
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35"
          aria-hidden="true"
        />
        <input
          id={inputId}
          name={name}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered[active] ? `${inputId}-option-${active}` : undefined
          }
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
            if (allowCustom) onChange(event.target.value);
          }}
          onBlur={commitTyped}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((current) =>
                Math.min(current + 1, Math.max(filtered.length - 1, 0)),
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && filtered[active]) {
              event.preventDefault();
              select(filtered[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
              setQuery(value);
            }
          }}
          className="min-h-12 w-full rounded-2xl border border-brand-200 bg-white py-2 pl-11 pr-16 text-base text-charcoal shadow-sm placeholder:text-charcoal/40 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-brand-50"
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear selection"
            className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-1 text-charcoal/40 hover:text-charcoal"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("");
              setQuery("");
              setOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronDown
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35"
          aria-hidden="true"
        />
      </div>

      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-brand-100 bg-white p-1 shadow-lg"
        >
          {filtered.length ? (
            filtered.map((option, index) => (
              <li
                key={option}
                id={`${inputId}-option-${index}`}
                role="option"
                aria-selected={option === value}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm",
                  index === active
                    ? "bg-brand-50 text-brand-900"
                    : "text-charcoal/80",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => select(option)}
              >
                <span>{option}</span>
                {option === value ? (
                  <Check className="h-4 w-4 text-brand-700" aria-hidden="true" />
                ) : null}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-charcoal/50">
              {allowCustom
                ? "Keep typing to use this value."
                : "No matching options."}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
