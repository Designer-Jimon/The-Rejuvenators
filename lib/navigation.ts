import { cache } from "react";
import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { devotionals } from "@/lib/db/schema";
import type { PublicNavItem } from "@/lib/navigation-types";

const PUBLIC_NAV: ReadonlyArray<PublicNavItem> = [
  { href: "/", label: "Home" },
  {
    href: "/about",
    label: "About",
    children: [
      { href: "/about", label: "About us" },
      { href: "/vision-mission", label: "Vision & Mission" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    href: "/departments",
    label: "Ministries",
    children: [
      { href: "/departments", label: "Departments" },
      { href: "/worship-centers", label: "Worship Centers" },
      { href: "/activities", label: "Activities" },
    ],
  },
  { href: "/events", label: "Events" },
  { href: "/sermons", label: "Sermons" },
  { href: "/devotionals", label: "Daily Meal" },
  { href: "/appointments", label: "Appointments" },
  { href: "/contact", label: "Contact" },
];

export const getPublicNav = cache(async () => PUBLIC_NAV);

function lagosToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const getLatestDevotionalHref = cache(async () => {
  const db = await getDb();
  const [row] = await db
    .select({ publishDate: devotionals.publishDate })
    .from(devotionals)
    .where(
      and(
        eq(devotionals.status, "published"),
        eq(devotionals.isPublished, true),
        isNull(devotionals.archivedAt),
        lte(devotionals.publishDate, lagosToday()),
      ),
    )
    .orderBy(desc(devotionals.publishDate))
    .limit(1);
  return row ? `/devotionals/${row.publishDate}` : "/devotionals";
});

export const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/vision-mission", label: "Vision & Mission" },
  { href: "/activities", label: "Activities" },
  { href: "/departments", label: "Departments" },
  { href: "/worship-centers", label: "Worship Centers" },
  { href: "/appointments", label: "Appointments" },
  { href: "/events", label: "Events" },
  { href: "/sermons", label: "Sermons" },
  { href: "/devotionals", label: "Daily Meal" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;
