import type { Metadata } from "next";
import Image from "next/image";
import { asc, desc } from "drizzle-orm";
import { Church, MapPin, Phone, Plus } from "lucide-react";
import { getDb } from "@/lib/db";
import { mediaLibrary, worshipCenters } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { publicMediaUrl } from "@/lib/media";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImagePicker } from "@/components/admin/image-picker";
import {
  deleteWorshipCenter,
  saveWorshipCenter,
} from "./actions";

export const metadata: Metadata = { title: "Worship centers" };
export const dynamic = "force-dynamic";

export default async function AdminWorshipCentersPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    created?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  await requirePermission(PERMISSIONS.settingsManage, "/admin/worship-centers");
  const { saved, created, deleted, error } = await searchParams;
  const db = await getDb();
  const [list, media] = await Promise.all([
    db
      .select()
      .from(worshipCenters)
      .orderBy(asc(worshipCenters.sortOrder), asc(worshipCenters.name)),
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
          Settings
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Worship centers</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          Manage the centers shown on the public website and in the registration
          form. Members choose a center when they register.
        </p>
      </div>

      {saved ? <FormMessage tone="success">Worship center saved.</FormMessage> : null}
      {created ? (
        <FormMessage tone="success">Worship center created.</FormMessage>
      ) : null}
      {deleted ? (
        <FormMessage tone="success">Worship center deleted.</FormMessage>
      ) : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <details className="surface p-4 sm:p-5">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-brand-800">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add a worship center
        </summary>
        <CenterForm idPrefix="new-center" media={pickerMedia} />
      </details>

      <div className="space-y-3">
        {list.map((center) => (
          <article key={center.id} className="surface overflow-hidden">
            <div className="grid sm:grid-cols-[180px_1fr]">
              <div className="relative aspect-[16/9] bg-brand-50 sm:aspect-auto sm:min-h-36">
                {center.photoKey ? (
                  <Image
                    src={publicMediaUrl(center.photoKey) ?? ""}
                    alt={center.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 180px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-28 items-center justify-center text-brand-300">
                    <Church className="h-9 w-9" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-xl font-semibold">
                    {center.name}
                  </h2>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-800">
                    {center.isActive ? "Live" : "Hidden"}
                  </span>
                </div>
                <p className="mt-1 flex items-start gap-1.5 text-sm text-charcoal/65">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {[center.address, center.city, center.state]
                    .filter(Boolean)
                    .join(", ") || "Address not set"}
                </p>
                {center.phone ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-charcoal/55">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                    {center.phone}
                  </p>
                ) : null}
              </div>
            </div>
            <details className="border-t border-brand-100 p-4 sm:p-5">
              <summary className="min-h-11 cursor-pointer text-sm font-semibold text-brand-800">
                Edit worship center
              </summary>
              <CenterForm
                idPrefix={center.id}
                media={pickerMedia}
                center={{
                  id: center.id,
                  name: center.name,
                  slug: center.slug,
                  address: center.address,
                  city: center.city,
                  state: center.state,
                  country: center.country,
                  phone: center.phone,
                  email: center.email,
                  mapUrl: center.mapUrl,
                  photoKey: center.photoKey,
                  serviceTimes: center.serviceTimes,
                  sortOrder: center.sortOrder,
                  isActive: center.isActive,
                }}
              />
              <form
                action={deleteWorshipCenter}
                className="mt-3 border-t border-brand-100 pt-3"
              >
                <input type="hidden" name="id" value={center.id} />
                <SubmitButton variant="danger" size="sm" pendingLabel="Deleting...">
                  Delete worship center
                </SubmitButton>
              </form>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}

type CenterFormData = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  mapUrl: string | null;
  photoKey: string | null;
  serviceTimes: string | null;
  sortOrder: number;
  isActive: boolean;
};

function CenterForm({
  idPrefix,
  media,
  center,
}: {
  idPrefix: string;
  media: { id: string; key: string; filename: string; altText: string | null }[];
  center?: CenterFormData;
}) {
  return (
    <form action={saveWorshipCenter} className="mt-4 space-y-4">
      {center ? <input type="hidden" name="id" value={center.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            defaultValue={center?.name ?? ""}
            required
            maxLength={160}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-slug`}>Link (optional)</Label>
          <Input
            id={`${idPrefix}-slug`}
            name="slug"
            defaultValue={center?.slug ?? ""}
            maxLength={120}
            placeholder="Generated from the name"
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-address`}>Address</Label>
        <Textarea
          id={`${idPrefix}-address`}
          name="address"
          defaultValue={center?.address ?? ""}
          maxLength={2000}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor={`${idPrefix}-city`}>City</Label>
          <Input
            id={`${idPrefix}-city`}
            name="city"
            defaultValue={center?.city ?? ""}
            maxLength={200}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-state`}>State</Label>
          <Input
            id={`${idPrefix}-state`}
            name="state"
            defaultValue={center?.state ?? ""}
            maxLength={200}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-country`}>Country</Label>
          <Input
            id={`${idPrefix}-country`}
            name="country"
            defaultValue={center?.country ?? "Nigeria"}
            maxLength={200}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-phone`}>Phone</Label>
          <Input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            defaultValue={center?.phone ?? ""}
            maxLength={200}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-email`}>Email</Label>
          <Input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            defaultValue={center?.email ?? ""}
            maxLength={200}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-map`}>Map link</Label>
        <Input
          id={`${idPrefix}-map`}
          name="mapUrl"
          type="url"
          defaultValue={center?.mapUrl ?? ""}
          maxLength={500}
          placeholder="https://maps.google.com/..."
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-service-times`}>Service times</Label>
        <Textarea
          id={`${idPrefix}-service-times`}
          name="serviceTimes"
          defaultValue={center?.serviceTimes ?? ""}
          maxLength={2000}
        />
      </div>
      <ImagePicker
        name="photoKey"
        label="Center photo"
        defaultValue={center?.photoKey ?? null}
        defaultUrl={publicMediaUrl(center?.photoKey)}
        media={media}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-sort`}>Display order</Label>
          <Input
            id={`${idPrefix}-sort`}
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={center?.sortOrder ?? 0}
          />
        </div>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 self-end rounded-2xl border border-brand-200 bg-white px-4 text-sm text-charcoal/75">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={center?.isActive ?? true}
            className="h-5 w-5 rounded border-brand-300 text-brand-700 focus:ring-brand-700"
          />
          Show on the website
        </label>
      </div>
      <SubmitButton pendingLabel="Saving worship center...">
        {center ? "Save worship center" : "Create worship center"}
      </SubmitButton>
    </form>
  );
}
