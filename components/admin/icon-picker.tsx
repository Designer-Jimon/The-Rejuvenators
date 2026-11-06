"use client";

import { useState } from "react";
import { Label, Select } from "@/components/ui/form";
import {
  DEPARTMENT_ICON_OPTIONS,
  getDepartmentIcon,
} from "@/lib/department-icons";

export function IconPicker({
  id,
  name = "iconKey",
  defaultValue,
}: {
  id?: string;
  name?: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "heart");
  const Icon = getDepartmentIcon(value);

  return (
    <div>
      <Label htmlFor={id}>Department icon</Label>
      <div className="flex items-center gap-2">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <Select
          id={id}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        >
          {DEPARTMENT_ICON_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
