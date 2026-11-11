"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function NotificationLink({
  id,
  href,
  isRead,
  className,
  children,
}: {
  id: string;
  href: string;
  isRead: boolean;
  className?: string;
  children: ReactNode;
}) {
  function markRead() {
    if (isRead) return;
    void fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      keepalive: true,
    })
      .then((response) => {
        if (response.ok) {
          window.dispatchEvent(new Event("notifications:changed"));
        }
      })
      .catch(() => undefined);
  }

  return (
    <Link
      href={href}
      prefetch
      onClick={markRead}
      className={className}
    >
      {children}
    </Link>
  );
}
