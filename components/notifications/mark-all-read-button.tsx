"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/app/(member)/member/actions";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsRead();
          window.dispatchEvent(new Event("notifications:changed"));
          router.refresh();
        })
      }
    >
      <CheckCheck className="h-4 w-4" aria-hidden="true" />
      Mark all as read
    </Button>
  );
}
