"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";

export function FilterSheet({
  basePath,
  current = "",
  placeholder = "Search",
}: {
  basePath: string;
  current?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current);

  function apply() {
    const params = new URLSearchParams();
    if (value.trim()) params.set("q", value.trim());
    router.push(params.size ? `${basePath}?${params.toString()}` : basePath);
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filter
        {current ? <span className="rounded-full bg-brand-100 px-1.5 text-xs">1</span> : null}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Filter"
        description="Narrow down the list."
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setValue("");
                router.push(basePath);
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button type="button" onClick={apply}>
              Apply filter
            </Button>
          </>
        }
      >
        <div>
          <Label htmlFor="filter-search">Search</Label>
          <Input
            id="filter-search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                apply();
              }
            }}
          />
        </div>
      </Modal>
    </>
  );
}
