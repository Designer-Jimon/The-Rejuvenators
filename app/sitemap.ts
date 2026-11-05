import type { MetadataRoute } from "next";

const routes = [
  { path: "/", priority: 1, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/vision-mission", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/activities", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/departments", priority: 0.8, changeFrequency: "monthly" as const },
  { path: "/events", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/sermons", priority: 0.6, changeFrequency: "weekly" as const },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.7, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const now = new Date();
  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
