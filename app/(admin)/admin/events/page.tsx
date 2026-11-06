import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { CalendarDays, Clock3, MapPin, Plus, Trash2 } from "lucide-react";
import { getDb } from "@/lib/db";
import {
  departments,
  eventCenters,
  eventDepartments,
  eventLiveLinks,
  events,
  eventSessions,
  mediaLibrary,
  worshipCenters,
} from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { EVENT_CATEGORIES, PERMISSIONS } from "@/lib/constants";
import { publicMediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/utils";
import { FormMessage, Input, Label, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/display";
import { ImagePicker } from "@/components/admin/image-picker";
import {
  EventLiveLinksEditor,
  EventSessionsEditor,
} from "@/components/admin/event-extra-fields";
import { deleteEvent, saveEvent } from "./actions";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

const tabs = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

function lagosDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function lagosTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/events");
  const params = await searchParams;
  const tab = params.tab === "completed" ? "completed" : "upcoming";
  const db = await getDb();

  const [
    eventList,
    departmentList,
    centerList,
    links,
    centerLinks,
    sessionList,
    liveLinkList,
    media,
  ] = await Promise.all([
    db.select().from(events).orderBy(asc(events.startsAt)),
    db
      .select()
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.sortOrder), asc(departments.name)),
    db
      .select({ id: worshipCenters.id, name: worshipCenters.name })
      .from(worshipCenters)
      .where(eq(worshipCenters.isActive, true))
      .orderBy(asc(worshipCenters.sortOrder), asc(worshipCenters.name)),
    db
      .select({
        eventId: eventDepartments.eventId,
        departmentId: eventDepartments.departmentId,
        name: departments.name,
      })
      .from(eventDepartments)
      .innerJoin(departments, eq(departments.id, eventDepartments.departmentId)),
    db
      .select({
        eventId: eventCenters.eventId,
        centerId: eventCenters.centerId,
        name: worshipCenters.name,
      })
      .from(eventCenters)
      .innerJoin(worshipCenters, eq(worshipCenters.id, eventCenters.centerId)),
    db
      .select()
      .from(eventSessions)
      .orderBy(asc(eventSessions.startsAt), asc(eventSessions.sortOrder)),
    db
      .select()
      .from(eventLiveLinks)
      .orderBy(asc(eventLiveLinks.sortOrder), asc(eventLiveLinks.createdAt)),
    db.select().from(mediaLibrary).orderBy(desc(mediaLibrary.createdAt)),
  ]);

  const now = Date.now();
  const visible = eventList.filter((event) => {
    const endsAt = (event.endsAt ?? event.startsAt).getTime();
    return tab === "completed" ? endsAt < now : endsAt >= now;
  });
  const pickerMedia = media.map((item) => ({
    id: item.id,
    key: item.key,
    filename: item.filename,
    altText: item.altText,
  }));
  const departmentsByEvent = new Map<string, string[]>();
  for (const link of links) {
    departmentsByEvent.set(link.eventId, [
      ...(departmentsByEvent.get(link.eventId) ?? []),
      link.name,
    ]);
  }
  const centersByEvent = new Map<string, string[]>();
  for (const link of centerLinks) {
    centersByEvent.set(link.eventId, [
      ...(centersByEvent.get(link.eventId) ?? []),
      link.name,
    ]);
  }
  const sessionsByEvent = new Map<string, typeof sessionList>();
  for (const session of sessionList) {
    sessionsByEvent.set(session.eventId, [
      ...(sessionsByEvent.get(session.eventId) ?? []),
      session,
    ]);
  }
  const liveLinksByEvent = new Map<string, typeof liveLinkList>();
  for (const link of liveLinkList) {
    liveLinksByEvent.set(link.eventId, [
      ...(liveLinksByEvent.get(link.eventId) ?? []),
      link,
    ]);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Gatherings
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Events</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          Create services and special gatherings. Members are notified when a new
          event is created.
        </p>
      </div>

      {params.saved ? (
        <FormMessage tone="success">{params.saved}</FormMessage>
      ) : null}
      {params.error ? <FormMessage>{params.error}</FormMessage> : null}

      <div className="flex gap-1.5">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={`/admin/events?tab=${item.key}`}
            prefetch
            className={
              tab === item.key
                ? "inline-flex min-h-11 items-center rounded-2xl border border-brand-700 bg-brand-700 px-4 text-sm font-semibold text-cream"
                : "inline-flex min-h-11 items-center rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold text-charcoal/70"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "upcoming" ? (
        <details className="surface p-5 sm:p-6">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-serif text-xl font-semibold">
            <Plus className="h-5 w-5" aria-hidden="true" />
            Add event
          </summary>
          <form action={saveEvent} className="mt-4 space-y-4">
            <EventFields
              idPrefix="new"
              media={pickerMedia}
              departments={departmentList}
              centers={centerList}
            />
            <SubmitButton pendingLabel="Saving event...">Add event</SubmitButton>
          </form>
        </details>
      ) : null}

      {visible.length ? (
        <div className="space-y-3">
          {visible.map((event) => {
            const eventDepartmentsList = departmentsByEvent.get(event.id) ?? [];
            return (
              <article key={event.id} className="surface overflow-hidden">
                <div className="grid sm:grid-cols-[180px_1fr]">
                  <div className="relative aspect-[16/9] bg-brand-50 sm:aspect-auto sm:min-h-40">
                    {event.coverKey ? (
                      <Image
                        src={publicMediaUrl(event.coverKey) ?? ""}
                        alt={event.title}
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
                        {event.category}
                      </span>
                      <span className="rounded-full bg-charcoal/5 px-2.5 py-1 text-xs font-semibold text-charcoal/60">
                        {event.isPublished ? "Published" : "Hidden"}
                      </span>
                      {event.showOnHomePopup ? (
                        <span className="rounded-full bg-gold-200/60 px-2.5 py-1 text-xs font-semibold text-gold-500">
                          Home popup
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-2 font-serif text-xl font-semibold">
                      {event.title}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal/60">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        {event.durationDays > 1 && event.endsAt
                          ? `${formatDate(event.startsAt)} – ${formatDate(event.endsAt)}`
                          : formatDate(event.startsAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-4 w-4" aria-hidden="true" />
                        {event.endsAt
                          ? `${lagosTime(event.startsAt)} – ${lagosTime(event.endsAt)}`
                          : lagosTime(event.startsAt)}
                      </span>
                      {event.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4" aria-hidden="true" />
                          {event.location}
                        </span>
                      ) : null}
                    </p>
                    {eventDepartmentsList.length ? (
                      <p className="mt-2 text-xs text-charcoal/50">
                        Units: {eventDepartmentsList.join(" · ")}
                      </p>
                    ) : null}
                    {(centersByEvent.get(event.id) ?? []).length ? (
                      <p className="mt-1 text-xs text-charcoal/50">
                        Centers: {(centersByEvent.get(event.id) ?? []).join(" · ")}
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <form action={deleteEvent}>
                        <input type="hidden" name="id" value={event.id} />
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
                    Edit event
                  </summary>
                  <form action={saveEvent} className="mt-4 space-y-4">
                    <input type="hidden" name="id" value={event.id} />
                    <EventFields
                      idPrefix={event.id}
                      media={pickerMedia}
                      departments={departmentList}
                      centers={centerList}
                      event={event}
                      selectedDepartments={links
                        .filter((link) => link.eventId === event.id)
                        .map((link) => link.departmentId)}
                      selectedCenters={centerLinks
                        .filter((link) => link.eventId === event.id)
                        .map((link) => link.centerId)}
                      sessions={(sessionsByEvent.get(event.id) ?? []).map(
                        (session) => ({
                          title: session.title,
                          date: lagosDate(session.startsAt),
                          start: lagosTime(session.startsAt),
                          end: session.endsAt
                            ? lagosTime(session.endsAt)
                            : lagosTime(session.startsAt),
                        }),
                      )}
                      liveLinks={(liveLinksByEvent.get(event.id) ?? []).map(
                        (link) => ({ label: link.label, url: link.url }),
                      )}
                    />
                    <SubmitButton pendingLabel="Saving event...">
                      Save event
                    </SubmitButton>
                  </form>
                </details>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" aria-hidden="true" />}
          title={tab === "completed" ? "No completed events" : "No upcoming events"}
          description={
            tab === "completed"
              ? "Events move here after their start time."
              : "Create the next service or gathering for the church family."
          }
        />
      )}
    </div>
  );
}

function EventFields({
  idPrefix,
  media,
  departments: departmentList,
  centers: centerList,
  event,
  selectedDepartments = [],
  selectedCenters = [],
  sessions = [],
  liveLinks = [],
}: {
  idPrefix: string;
  media: Array<{
    id: string;
    key: string;
    filename: string;
    altText: string | null;
  }>;
  departments: Array<{ id: string; name: string }>;
  centers: Array<{ id: string; name: string }>;
  event?: {
    title: string;
    description: string | null;
    category: string;
    instructions: string | null;
    location: string | null;
    startsAt: Date;
    endsAt: Date | null;
    durationDays: number;
    showOnHomePopup: boolean;
    coverKey: string | null;
    isPublished: boolean;
  };
  selectedDepartments?: string[];
  selectedCenters?: string[];
  sessions?: Array<{ title: string; date: string; start: string; end: string }>;
  liveLinks?: Array<{ label: string; url: string }>;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`title-${idPrefix}`}>Event name</Label>
          <Input
            id={`title-${idPrefix}`}
            name="title"
            defaultValue={event?.title ?? ""}
            maxLength={160}
            required
          />
        </div>
        <div>
          <Label htmlFor={`category-${idPrefix}`}>Category</Label>
          <Select
            id={`category-${idPrefix}`}
            name="category"
            defaultValue={event?.category ?? "Sunday Service"}
          >
            {EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor={`description-${idPrefix}`}>Description</Label>
        <Textarea
          id={`description-${idPrefix}`}
          name="description"
          defaultValue={event?.description ?? ""}
          maxLength={2000}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <Label htmlFor={`date-${idPrefix}`}>Date</Label>
          <Input
            id={`date-${idPrefix}`}
            name="date"
            type="date"
            defaultValue={event ? lagosDate(event.startsAt) : ""}
            required
          />
        </div>
        <div>
          <Label htmlFor={`start-${idPrefix}`}>Start time</Label>
          <Input
            id={`start-${idPrefix}`}
            name="start"
            type="time"
            defaultValue={event ? lagosTime(event.startsAt) : "09:00"}
            required
          />
        </div>
        <div>
          <Label htmlFor={`end-${idPrefix}`}>End time</Label>
          <Input
            id={`end-${idPrefix}`}
            name="end"
            type="time"
            defaultValue={
              event?.endsAt ? lagosTime(event.endsAt) : "11:00"
            }
            required
          />
        </div>
        <div>
          <Label htmlFor={`days-${idPrefix}`}>Number of days</Label>
          <Input
            id={`days-${idPrefix}`}
            name="durationDays"
            type="number"
            min={1}
            max={60}
            defaultValue={event?.durationDays ?? 1}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`venue-${idPrefix}`}>Venue</Label>
        <Input
          id={`venue-${idPrefix}`}
          name="venue"
          defaultValue={event?.location ?? ""}
          maxLength={200}
        />
      </div>
      <ImagePicker
        name="imageKey"
        label="Event image"
        defaultValue={event?.coverKey ?? ""}
        defaultUrl={publicMediaUrl(event?.coverKey)}
        media={media}
      />
      <div>
        <Label htmlFor={`instructions-${idPrefix}`}>Instructions</Label>
        <Textarea
          id={`instructions-${idPrefix}`}
          name="instructions"
          defaultValue={event?.instructions ?? ""}
          maxLength={8000}
          placeholder="What should members know or bring?"
        />
      </div>
      <fieldset>
        <legend className="field-label">Participating departments</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {departmentList.map((department) => (
            <label
              key={department.id}
              className="flex min-h-12 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-3 text-sm font-semibold"
            >
              <input
                type="checkbox"
                name="departments"
                value={department.id}
                defaultChecked={selectedDepartments.includes(department.id)}
              />
              {department.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="field-label">Worship centers</legend>
        <p className="mt-1 text-xs text-charcoal/50">
          Leave all unchecked for a church-wide event. Members see events for
          their center and church-wide events.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {centerList.length ? (
            centerList.map((center) => (
              <label
                key={center.id}
                className="flex min-h-12 items-center gap-2 rounded-2xl border border-brand-200 bg-white px-3 text-sm font-semibold"
              >
                <input
                  type="checkbox"
                  name="centers"
                  value={center.id}
                  defaultChecked={selectedCenters.includes(center.id)}
                />
                {center.name}
              </label>
            ))
          ) : (
            <p className="text-sm text-charcoal/50">
              No worship centers yet. Add them under Settings.
            </p>
          )}
        </div>
      </fieldset>
      <EventSessionsEditor
        idPrefix={`sessions-${idPrefix}`}
        initialSessions={sessions}
      />
      <EventLiveLinksEditor
        idPrefix={`links-${idPrefix}`}
        initialLinks={liveLinks}
      />
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
        <input
          type="checkbox"
          name="showOnHomePopup"
          defaultChecked={event?.showOnHomePopup ?? false}
        />
        Show as a popup on the home page
      </label>
      <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-brand-200 bg-white px-4 text-sm font-semibold">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={event?.isPublished ?? true}
        />
        Published on website and member area
      </label>
    </>
  );
}
