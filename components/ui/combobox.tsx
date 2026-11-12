"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function Combobox({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Search...",
  label,
  disabled = false,
  className,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${inputId}-listbox`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
  }

  function select(option: string) {
    onChange(option);
    close();
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) =>
        Math.min(current + 1, Math.max(filtered.length - 1, 0)),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && filtered[active]) {
      event.preventDefault();
      select(filtered[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  const list = filtered.length ? (
    filtered.map((option, index) => (
      <li
        key={option}
        id={`${inputId}-option-${index}`}
        role="option"
        aria-selected={option === value}
        className={cn(
          "flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm",
          index === active ? "bg-brand-50 text-brand-900" : "text-charcoal/80",
        )}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActive(index)}
        onClick={() => select(option)}
      >
        <span>{option}</span>
        {option === value ? (
          <Check className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
        ) : null}
      </li>
    ))
  ) : (
    <li className="px-3 py-3 text-sm text-charcoal/50">No matching options.</li>
  );

  const searchBox = (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/35"
        aria-hidden="true"
      />
      <input
        ref={searchRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={label ? `Search ${label.toLowerCase()}` : placeholder}
        aria-activedescendant={
          open && filtered[active] ? `${inputId}-option-${active}` : undefined
        }
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onSearchKeyDown}
        className="min-h-12 w-full rounded-2xl border border-brand-200 bg-white py-2 pl-11 pr-4 text-base text-charcoal shadow-sm placeholder:text-charcoal/40 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20"
      />
    </div>
  );

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        id={inputId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-brand-200 bg-white px-4 py-2 text-left text-base text-charcoal shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-700/20 disabled:bg-brand-50 disabled:text-charcoal/45"
      >
        <span className={value ? "truncate" : "truncate text-charcoal/40"}>
          {value || placeholder}
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-charcoal/35"
          aria-hidden="true"
        />
      </button>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      {open && !disabled ? (
        isMobile ? (
          <div
            className="fixed inset-0 z-50 flex items-end bg-black/40 sm:hidden"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={label ?? placeholder}
              className="flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-white p-4 pb-6 shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-lg font-semibold">
                    {label ?? placeholder}
                  </p>
                  <p className="text-xs text-charcoal/50">
                    {filtered.length} option{filtered.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-charcoal/50 hover:bg-brand-50 hover:text-charcoal"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {searchBox}
              <ul
                id={listId}
                role="listbox"
                className="mt-3 flex-1 overflow-y-auto rounded-2xl border border-brand-100 bg-white p-1"
              >
                {list}
              </ul>
            </div>
          </div>
        ) : (
          <div className="absolute z-30 mt-1 w-full rounded-2xl border border-brand-100 bg-white p-2 shadow-lg">
            {searchBox}
            <ul
              id={listId}
              role="listbox"
              className="mt-2 max-h-64 overflow-y-auto p-1"
            >
              {list}
            </ul>
          </div>
        )
      ) : null}
    </div>
  );
}
