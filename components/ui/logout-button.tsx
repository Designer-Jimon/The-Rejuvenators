"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function LogoutButton({
  variant = "outline",
  className,
  label = "Log out",
}: {
  variant?: "primary" | "outline" | "ghost" | "danger";
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title="Log out?"
        description="You will need to sign in again to access the member platform."
        confirmLabel="Log out"
        onConfirm={() => void logout()}
        onCancel={() => setOpen(false)}
        loading={loading}
      />
    </>
  );
}
