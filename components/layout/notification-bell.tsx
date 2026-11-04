import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell({
  unread,
  href = "/member/notifications",
  label = "Notifications",
}: {
  unread: number;
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label}${unread ? `, ${unread} unread` : ""}`}
      className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-100 bg-white text-charcoal/75 transition hover:border-brand-300 hover:text-brand-800"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-cream">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
