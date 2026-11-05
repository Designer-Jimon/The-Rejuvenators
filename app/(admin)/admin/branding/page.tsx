import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Palette } from "lucide-react";
import { getDb } from "@/lib/db";
import { mediaLibrary } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { publicMediaUrl } from "@/lib/media";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImagePicker } from "@/components/admin/image-picker";
import { saveBranding } from "./actions";

export const metadata: Metadata = { title: "Logo & branding" };
export const dynamic = "force-dynamic";

export default async function AdminBrandingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/branding");
  const { saved, error } = await searchParams;
  const db = await getDb();
  const [settings, media] = await Promise.all([
    getSettings(),
    db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt)),
  ]);

  const logoKey = settings.logo_key ?? "";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Content
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Logo & branding</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          The uploaded logo becomes the website logo, favicon and PWA icon
          source. Choose a square image for the best result.
        </p>
      </div>

      {saved ? <FormMessage tone="success">Branding saved.</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <form action={saveBranding} className="surface p-5 sm:p-6">
        <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-charcoal/70">
          <Palette className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
          <p>
            Website logo, favicon and PWA icons update immediately after saving.
            If no logo is set, the built-in church icon is used.
          </p>
        </div>
        <div className="mt-5">
          <ImagePicker
            name="logoKey"
            label="Church logo"
            defaultValue={logoKey}
            defaultUrl={publicMediaUrl(logoKey)}
            media={media.map((item) => ({
              id: item.id,
              key: item.key,
              filename: item.filename,
              altText: item.altText,
            }))}
            hint="A square PNG or JPG works best for favicon and app icons."
          />
        </div>
        <div className="mt-5 border-t border-brand-100 pt-5">
          <SubmitButton>Save branding</SubmitButton>
        </div>
      </form>
    </div>
  );
}
