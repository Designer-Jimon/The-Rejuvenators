import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import {
  CHURCH_LOGO_PATH,
  CHURCH_NAME,
  CHURCH_SHORT_NAME,
  CHURCH_TAGLINE,
} from "@/lib/branding";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  const name = settings.church_name?.trim() || CHURCH_NAME;
  const manifest = {
    name,
    short_name: CHURCH_SHORT_NAME,
    description: settings.tagline?.trim() || CHURCH_TAGLINE,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF8ED",
    theme_color: "#8B1A1A",
    icons: [
      {
        src: CHURCH_LOGO_PATH,
        sizes: "any",
        purpose: "any",
      },
      {
        src: CHURCH_LOGO_PATH,
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
