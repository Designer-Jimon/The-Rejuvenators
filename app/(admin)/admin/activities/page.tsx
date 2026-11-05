import type { Metadata } from "next";
import Image from "next/image";
import { asc, desc, like, or } from "drizzle-orm";
import { ArrowDown, ArrowUp, CalendarDays, Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import { activities, mediaLibrary } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { publicMediaUrl } from "@/lib/media";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/display";
import { FilterSheet } from "@/components/admin/filter-sheet";
import { ImagePicker } from "@/components/admin/image-picker";
import {
  deleteActivity,
  moveActivity,
  saveActivity,
  toggleActivity,
} from "./actions";

export const metadata: Metadata = { title: "Activities" };
export const dynamic = "force-dynamic";

export default async function AdminActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; q?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/activities");
  const { saved, error, q } = await searchParams;
  const db = await getDb();
  const term = q?.trim() ?? "";
  const [list, media] = await Promise.all([
    db
      .select()
      .from(activities)
      .where(
        term
          ? or(
              like(activities.title, `%${term}%`),
              like(activities.description, `%${term}%`),
            )
          : undefined,
      )
      .orderBy(asc(activities.sortOrder), asc(activities.createdAt)),
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            Content
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Activities</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
            Create the weekly schedule and special gatherings shown on the
            public website.
          </p>
        </div>
        <FilterSheet
          basePath="/admin/activities"
          current={term}
          placeholder="Search activities"
        />
      </div>

      {saved ? <FormMessage tone="success">{saved}</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <details className="surface p-5 sm:p-6">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-serif text-xl font-semibold">
          <Plus className="h-5 w-5" aria-hidden="true" />
          Add activity
        </summary>
        <form action={saveActivity} className="mt-4 space-y-4">
          <ActivityFields
            idPrefix="new"
            media={pickerMedia}
            defaultSortOrder={list.length + 1}
          />
          <SubmitButton pendingLabel="Saving activity...">Add activity</SubmitButton>
        </form>
      </details>

      {list.length ? (
        <div className="space-y-3">
          {list.map((activity, index) => (
            <article key={activity.id} className="surface overflow-hidden">
              <div className="grid sm:grid-cols-[180px_1fr]">
                <div className="relative aspect-[16/9] bg-brand-50 sm:aspect-auto sm:min-h-40">
                  {activity.imageKey ? (
                    <Image
                      src={publicMediaUrl(activity.imageKey) ?? ""}
                      alt={activity.title}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 100vw, 180px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-32 items-center justify-center text-brand-300">
                      <CalendarDays className="h-8 w-8" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
                      {activity.isPublished ? "Published" : "Inactive"}
                    </span>
                    <span className="text-xs text-charcoal/45">
                      Order {activity.sortOrder}
                    </span>
                  </div>
                  <h2 className="mt-2 font-serif text-xl font-semibold">
                    {activity.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-charcoal/65">
                    {[activity.day, activity.time, activity.venue]
                      .filter(Boolean)
                      .join(" · ") || "Schedule not set"}
                  </p>
                  {activity.description ? (
                    <p className="mt-2 text-sm leading-6 text-charcoal/60">
                      {activity.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={moveActivity}>
                      <input type="hidden" name="id" value={activity.id} />
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
                    <form action={moveActivity}>
                      <input type="hidden" name="id" value={activity.id} />
                      <input type="hidden" name="direction" value="down" />
                      <SubmitButton
                        variant="outline"
                        size="sm"
                        pendingLabel="Moving..."
                        disabled={index === list.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        Down
                      </SubmitButton>
                    </form>
                    <form action={toggleActivity}>
                      <input type="hidden" name="id" value={activity.id} />
                      <input
                        type="hidden"
                        name="isPublished"
                        value={activity.isPublished ? "false" : "true"}
                      />
                      <SubmitButton variant="outline" size="sm" pendingLabel="Updating...">
                        {activity.isPublished ? "Deactivate" : "Activate"}
                      </SubmitButton>
                    </form>
                    <form action={deleteActivity}>
                      <input type="hidden" name="id" value={activity.id} />
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
                  Edit activity
                </summary>
                <form action={saveActivity} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={activity.id} />
                  <ActivityFields
                    idPrefix={activity.id}
                    media={pickerMedia}
                    activity={activity}
                  />
                  <SubmitButton pendingLabel="Saving activity...">
                    Save activity
                  </SubmitButton>
                </form>
              </details>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
          title={term ? "No activities match your search" : "No activities yet"}
          description={
            term
              ? "Try a different search term."
              : "Add the first activity to build the weekly schedule."
          }
        />
      )}
    </div>
  );
}

function ActivityFields({
  idPrefix,
  media,
  activity,
  defaultSortOrder = 0,
}: {
  idPrefix: string;
  media: Array<{
    id: string;
    key: string;
    filename: string;
    altText: string | null;
  }>;
  activity?: {
    title: string;
    description: string | null;
    day: string | null;
    time: string | null;
    venue: string | null;
    imageKey: string | null;
    extraInfo: string | null;
    sortOrder: number;
    isPublished: boolean;
  };
  defaultSortOrder?: number;
}) {
  return (
    <>
      <div>
        <Label htmlFor={`title-${idPrefix}`}>Activity name</Label>
        <Input
          id={`title-${idPrefix}`}
          name="title"
          defaultValue={activity?.title ?? ""}
          maxLength={160}
          required
        />
      </div>
      <div>
        <Label htmlFor={`description-${idPrefix}`}>Description</Label>
        <Textarea
          id={`description-${idPrefix}`}
          name="description"
          defaultValue={activity?.description ?? ""}
          maxLength={2000}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor={`day-${idPrefix}`}>Day</Label>
          <Input
            id={`day-${idPrefix}`}
            name="day"
            defaultValue={activity?.day ?? ""}
            maxLength={200}
          />
        </div>
        <div>
          <Label htmlFor={`time-${idPrefix}`}>Time</Label>
          <Input
            id={`time-${idPrefix}`}
            name="time"
            defaultValue={activity?.time ?? ""}
            maxLength={200}
          />
        </div>
        <div>
          <Label htmlFor={`venue-${idPrefix}`}>Venue</Label>
          <Input
            id={`venue-${idPrefix}`}
            name="venue"
            defaultValue={activity?.venue ?? ""}
            maxLength={200}
          />
        </div>
      </div>
      <ImagePicker
        name="imageKey"
        label="Activity image"
        defaultValue={activity?.imageKey ?? ""}
        defaultUrl={publicMediaUrl(activity?.imageKey)}
        media={media}
      />
      <div>
        <Label htmlFor={`extra-${idPrefix}`}>Extra information</Label>
        <Textarea
          id={`extra-${idPrefix}`}
          name="extraInfo"
          defaultValue={activity?.extraInfo ?? ""}
          maxLength={8000}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`order-${idPrefix}`}>Sort order</Label>
          <Input
            id={`order-${idPrefix}`}
            name="sortOrder"
            type="number"
            min={0}
            max={9999}
            defaultValue={activity?.sortOrder ?? defaultSortOrder}
          />
        </div>
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
          <input
            type="checkbox"
            name="isPublished"
            defaultChecked={activity?.isPublished ?? true}
          />
          Published on website
        </label>
      </div>
    </>
  );
}
