import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { ExternalLink, Save } from "lucide-react";
import { getDb } from "@/lib/db";
import { mediaLibrary } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { publicMediaUrl } from "@/lib/media";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImagePicker } from "@/components/admin/image-picker";
import { savePastorProfile } from "./actions";

export const metadata: Metadata = { title: "Pastor" };
export const dynamic = "force-dynamic";

export default async function AdminPastorPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/pastor");
  const { saved, error } = await searchParams;
  const db = await getDb();
  const [settings, media] = await Promise.all([
    getSettings(),
    db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt)),
  ]);

  const photoKey = settings.pastor_photo_key ?? "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Website
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Pastor</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Update the pastor profile shown on the homepage and About page.
          </p>
        </div>
        <Link
          href="/about"
          target="_blank"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
        >
          View about page <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {saved ? <FormMessage tone="success">Pastor profile saved.</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <form action={savePastorProfile} className="surface space-y-5 p-5 sm:p-6">
        <div>
          <ImagePicker
            name="pastor_photo_key"
            label="Pastor photo"
            defaultValue={photoKey}
            defaultUrl={publicMediaUrl(photoKey)}
            media={media.map((item) => ({
              id: item.id,
              key: item.key,
              filename: item.filename,
              altText: item.altText,
            }))}
            hint="Upload a clear portrait. A neutral silhouette is shown when no photo is set."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pastor_name">Name</Label>
            <Input
              id="pastor_name"
              name="pastor_name"
              defaultValue={settings.pastor_name ?? ""}
              maxLength={160}
            />
            <p className="mt-1 text-[11px] text-charcoal/40">
              Up to 160 characters.
            </p>
          </div>
          <div>
            <Label htmlFor="pastor_title">Title</Label>
            <Input
              id="pastor_title"
              name="pastor_title"
              defaultValue={settings.pastor_title ?? ""}
              maxLength={160}
              placeholder="e.g. Lead Pastor"
            />
            <p className="mt-1 text-[11px] text-charcoal/40">
              Up to 160 characters.
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="pastor_bio">Biography</Label>
          <Textarea
            id="pastor_bio"
            name="pastor_bio"
            defaultValue={settings.pastor_bio ?? ""}
            maxLength={8000}
            className="min-h-40"
            placeholder="Write the pastor's biography."
          />
          <p className="mt-1 text-[11px] text-charcoal/40">
            Up to 8,000 characters. Line breaks are preserved.
          </p>
        </div>

        <div>
          <Label htmlFor="pastor_about">About the pastor</Label>
          <Textarea
            id="pastor_about"
            name="pastor_about"
            defaultValue={settings.pastor_about ?? ""}
            maxLength={2000}
            className="min-h-28"
            placeholder="A short introduction for the homepage."
          />
          <p className="mt-1 text-[11px] text-charcoal/40">
            Up to 2,000 characters.
          </p>
        </div>

        <div>
          <Label htmlFor="pastor_quote">Quote</Label>
          <Textarea
            id="pastor_quote"
            name="pastor_quote"
            defaultValue={settings.pastor_quote ?? ""}
            maxLength={2000}
            className="min-h-24"
            placeholder="Optional short quote."
          />
          <p className="mt-1 text-[11px] text-charcoal/40">
            Up to 2,000 characters.
          </p>
        </div>

        <div className="flex justify-end border-t border-brand-100 pt-5">
          <SubmitButton pendingLabel="Saving...">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save pastor profile
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
