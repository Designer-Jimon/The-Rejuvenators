import { cache } from "react";
import { PUBLIC_NAV } from "@/lib/constants";

export const getPublicNav = cache(async () => PUBLIC_NAV);

export const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About us" },
  { href: "/vision-mission", label: "Vision & Mission" },
  { href: "/activities", label: "Activities" },
  { href: "/departments", label: "Departments" },
  { href: "/events", label: "Events" },
  { href: "/sermons", label: "Sermons" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;
