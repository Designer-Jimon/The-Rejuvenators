import type { Metadata } from "next";
import Image from "next/image";
import { asc, desc } from "drizzle-orm";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { mediaLibrary, slideshowImages } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { publicMediaUrl } from "@/lib/media";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImagePicker } from "@/components/admin/image-picker";
import {
  deleteSlide,
  moveSlide,
  saveSlide,
  toggleSlide,
} from "./actions";

export const metadata: Metadata = { title: "Homepage slideshow" };
export const dynamic = "force-dynamic";

export default async function AdminSlideshowPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/slideshow");
  const { saved, error } = await searchParams;
  const db = await getDb();
  const [slides, media] = await Promise.all([
    db
      .select()
      .from(slideshowImages)
      .orderBy(asc(slideshowImages.sortOrder), asc(slideshowImages.createdAt)),
    db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt)),
  ]);

  const pickerMedia = media.map((item) => ({
    id: item.id,
    key: item.key,
    filename: item.filename,
    altText: item.altText,
  }));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Content
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">
          Homepage slideshow
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          Add, caption, reorder and activate homepage slides. If no slides are
          active, the website uses gradient welcome slides.
        </p>
      </div>

      {saved ? <FormMessage tone="success">{saved}</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <details className="surface p-5 sm:p-6">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-serif text-xl font-semibold">
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add slide
        </summary>
        <form action={saveSlide} className="mt-4 space-y-4">
          <ImagePicker
            name="imageKey"
            label="Slide image"
            media={pickerMedia}
            hint="Choose or upload the slide image."
          />
          <div>
            <Label htmlFor="new-slide-headline">Caption</Label>
            <Input
              id="new-slide-headline"
              name="headline"
              maxLength={200}
              placeholder="Slide headline"
            />
          </div>
          <div>
            <Label htmlFor="new-slide-subheadline">Supporting text</Label>
            <Textarea
              id="new-slide-subheadline"
              name="subheadline"
              maxLength={2000}
              placeholder="Optional supporting text"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-slide-order">Sort order</Label>
              <Input
                id="new-slide-order"
                name="sortOrder"
                type="number"
                min={0}
                max={9999}
                defaultValue={slides.length + 1}
              />
            </div>
            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
              <input type="checkbox" name="isActive" defaultChecked />
              Active on website
            </label>
          </div>
          <SubmitButton pendingLabel="Saving slide...">Add slide</SubmitButton>
        </form>
      </details>

      {slides.length ? (
        <div className="space-y-3">
          {slides.map((slide, index) => (
            <article key={slide.id} className="surface overflow-hidden">
              <div className="grid sm:grid-cols-[220px_1fr]">
                <div className="relative aspect-[16/9] bg-brand-50 sm:aspect-auto sm:min-h-44">
                  <Image
                    src={publicMediaUrl(slide.imageKey) ?? ""}
                    alt={slide.headline || "Slideshow image"}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 220px"
                    className="object-cover"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                      {slide.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-charcoal/45">
                      Order {slide.sortOrder}
                    </span>
                  </div>
                  <h2 className="mt-2 font-serif text-xl font-semibold">
                    {slide.headline || "Untitled slide"}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-charcoal/65">
                    {slide.subheadline || "No supporting text."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={moveSlide}>
                      <input type="hidden" name="id" value={slide.id} />
                      <input type="hidden" name="direction" value="up" />
                      <SubmitButton
                        variant="outline"
                        size="sm"
                        pendingLabel="Moving..."
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        Up
                      </SubmitButton>
                    </form>
                    <form action={moveSlide}>
                      <input type="hidden" name="id" value={slide.id} />
                      <input type="hidden" name="direction" value="down" />
                      <SubmitButton
                        variant="outline"
                        size="sm"
                        pendingLabel="Moving..."
                        disabled={index === slides.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        Down
                      </SubmitButton>
                    </form>
                    <form action={toggleSlide}>
                      <input type="hidden" name="id" value={slide.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={slide.isActive ? "false" : "true"}
                      />
                      <SubmitButton variant="outline" size="sm" pendingLabel="Updating...">
                        {slide.isActive ? "Deactivate" : "Activate"}
                      </SubmitButton>
                    </form>
                    <form action={deleteSlide}>
                      <input type="hidden" name="id" value={slide.id} />
                      <SubmitButton
                        variant="ghost"
                        size="sm"
                        pendingLabel="Deleting..."
                        className="text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </div>
              <details className="border-t border-brand-100 p-4 sm:p-5">
                <summary className="min-h-11 cursor-pointer text-sm font-semibold text-brand-800">
                  Edit slide
                </summary>
                <form action={saveSlide} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={slide.id} />
                  <ImagePicker
                    name="imageKey"
                    label="Slide image"
                    defaultValue={slide.imageKey}
                    defaultUrl={publicMediaUrl(slide.imageKey)}
                    media={pickerMedia}
                  />
                  <div>
                    <Label htmlFor={`headline-${slide.id}`}>Caption</Label>
                    <Input
                      id={`headline-${slide.id}`}
                      name="headline"
                      defaultValue={slide.headline ?? ""}
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`subheadline-${slide.id}`}>Supporting text</Label>
                    <Textarea
                      id={`subheadline-${slide.id}`}
                      name="subheadline"
                      defaultValue={slide.subheadline ?? ""}
                      maxLength={2000}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={`order-${slide.id}`}>Sort order</Label>
                      <Input
                        id={`order-${slide.id}`}
                        name="sortOrder"
                        type="number"
                        min={0}
                        max={9999}
                        defaultValue={slide.sortOrder}
                      />
                    </div>
                    <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={slide.isActive}
                      />
                      Active on website
                    </label>
                  </div>
                  <SubmitButton pendingLabel="Saving slide...">Save slide</SubmitButton>
                </form>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <div className="surface p-8 text-center text-sm text-charcoal/55">
          No slides yet. The website currently uses gradient welcome slides.
        </div>
      )}
    </div>
  );
}
