import { cache } from "react";
import { PUBLIC_NAV } from "@/lib/constants";

export const getPublicNav = cache(async () => PUBLIC_NAV);

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
  { href: "/devotionals", label: "Devotionals" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;
