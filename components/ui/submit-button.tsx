"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "./button";

export function SubmitButton({
  children,
  pendingLabel = "Saving...",
  ...props
}: ButtonProps & { children: ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...props} loading={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
