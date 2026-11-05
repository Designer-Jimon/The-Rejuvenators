import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  const name = settings.church_name || "Church";
  const manifest = {
    name,
    short_name: name.length > 24 ? "Church" : name,
    description: settings.tagline || settings.welcome_body || name,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF8ED",
    theme_color: "#8B1A1A",
    icons: [
      {
        src: "/api/branding/logo",
        sizes: "any",
        purpose: "any",
      },
      {
        src: "/api/branding/logo",
        sizes: "any",
        purpose: "maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
