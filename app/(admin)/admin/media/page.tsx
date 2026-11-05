import type { Metadata } from "next";
import Image from "next/image";
import { desc, like, or } from "drizzle-orm";
import { ImageIcon, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { mediaLibrary } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { publicMediaUrl } from "@/lib/media";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/display";
import { FilterSheet } from "@/components/admin/filter-sheet";
import { MediaUpload } from "@/components/admin/media-upload";
import { deleteMedia, updateMediaAlt } from "./actions";

export const metadata: Metadata = { title: "Media library" };
export const dynamic = "force-dynamic";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; q?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/media");
  const { saved, error, q } = await searchParams;
  const db = await getDb();
  const term = q?.trim() ?? "";
  const rows = await db
    .select()
    .from(mediaLibrary)
    .where(
      term
        ? or(
            like(mediaLibrary.filename, `%${term}%`),
            like(mediaLibrary.altText, `%${term}%`),
          )
        : undefined,
    )
    .orderBy(desc(mediaLibrary.createdAt));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Content
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Media library</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Upload and manage images used across the public website.
          </p>
        </div>
        <FilterSheet
          basePath="/admin/media"
          current={term}
          placeholder="Search filename or alt text"
        />
      </div>

      {saved ? <FormMessage tone="success">{saved}</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <MediaUpload />

      {rows.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((item) => (
            <article key={item.id} className="surface overflow-hidden">
              <div className="relative aspect-[4/3] bg-brand-50">
                <Image
                  src={publicMediaUrl(item.key) ?? ""}
                  alt={item.altText || item.filename}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <p className="truncate text-sm font-semibold">{item.filename}</p>
                <p className="mt-0.5 text-xs text-charcoal/50">
                  {formatSize(item.size)} · {item.contentType}
                </p>
                <form action={updateMediaAlt} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={item.id} />
                  <label
                    htmlFor={`alt-${item.id}`}
                    className="text-xs font-semibold uppercase tracking-wide text-charcoal/45"
                  >
                    Alt text
                  </label>
                  <input
                    id={`alt-${item.id}`}
                    name="altText"
                    defaultValue={item.altText ?? ""}
                    maxLength={250}
                    placeholder="Describe this image"
                    className="min-h-11 w-full rounded-2xl border border-brand-200 bg-white px-3 text-sm"
                  />
                  <SubmitButton variant="outline" size="sm" pendingLabel="Saving...">
                    Save alt text
                  </SubmitButton>
                </form>
                <form action={deleteMedia} className="mt-2">
                  <input type="hidden" name="id" value={item.id} />
                  <SubmitButton
                    variant="ghost"
                    size="sm"
                    pendingLabel="Deleting..."
                    className="text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete image
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ImageIcon className="h-6 w-6" aria-hidden="true" />}
          title={term ? "No images match your search" : "No images yet"}
          description={
            term
              ? "Try a different search term."
              : "Upload your first image to use it across the website."
          }
        />
      )}
    </div>
  );
}
