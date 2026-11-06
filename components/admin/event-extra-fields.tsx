"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input, Label } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";

export type EventSessionDraft = {
  title: string;
  date: string;
  start: string;
  end: string;
};

export type EventLiveLinkDraft = {
  label: string;
  url: string;
};

export function EventSessionsEditor({
  idPrefix,
  initialSessions = [],
}: {
  idPrefix: string;
  initialSessions?: EventSessionDraft[];
}) {
  const [sessions, setSessions] = useState<EventSessionDraft[]>(
    initialSessions.length
      ? initialSessions
      : [{ title: "", date: "", start: "", end: "" }],
  );

  function update(index: number, patch: Partial<EventSessionDraft>) {
    setSessions((current) =>
      current.map((session, position) =>
        position === index ? { ...session, ...patch } : session,
      ),
    );
  }

  function add() {
    setSessions((current) => [
      ...current,
      { title: "", date: "", start: "", end: "" },
    ]);
  }

  function remove(index: number) {
    setSessions((current) => current.filter((_, position) => position !== index));
  }

  return (
    <fieldset className="rounded-2xl border border-brand-100 p-4">
      <legend className="px-1 text-sm font-semibold text-charcoal/75">
        Sessions and programme
      </legend>
      <p className="text-xs leading-5 text-charcoal/50">
        Optional. Use sessions for multi-day programmes or a detailed schedule.
      </p>
      <div className="mt-3 space-y-3">
        {sessions.map((session, index) => (
          <div
            key={index}
            className="rounded-2xl border border-brand-100 bg-cream/50 p-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor={`${idPrefix}-session-title-${index}`}>
                  Session title
                </Label>
                <Input
                  id={`${idPrefix}-session-title-${index}`}
                  name="sessionTitle"
                  value={session.title}
                  onChange={(event) => update(index, { title: event.target.value })}
                  maxLength={160}
                  placeholder="Opening service"
                />
              </div>
              <div>
                <Label htmlFor={`${idPrefix}-session-date-${index}`}>Date</Label>
                <Input
                  id={`${idPrefix}-session-date-${index}`}
                  name="sessionDate"
                  type="date"
                  value={session.date}
                  onChange={(event) => update(index, { date: event.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`${idPrefix}-session-start-${index}`}>
                    Start
                  </Label>
                  <Input
                    id={`${idPrefix}-session-start-${index}`}
                    name="sessionStart"
                    type="time"
                    value={session.start}
                    onChange={(event) =>
                      update(index, { start: event.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`${idPrefix}-session-end-${index}`}>End</Label>
                  <Input
                    id={`${idPrefix}-session-end-${index}`}
                    name="sessionEnd"
                    type="time"
                    value={session.end}
                    onChange={(event) => update(index, { end: event.target.value })}
                  />
                </div>
              </div>
            </div>
            {sessions.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(index)}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove session
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className={buttonClasses("outline", "sm", "mt-3")}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add session
      </button>
    </fieldset>
  );
}

export function EventLiveLinksEditor({
  idPrefix,
  initialLinks = [],
}: {
  idPrefix: string;
  initialLinks?: EventLiveLinkDraft[];
}) {
  const [links, setLinks] = useState<EventLiveLinkDraft[]>(
    initialLinks.length ? initialLinks : [{ label: "", url: "" }],
  );

  function update(index: number, patch: Partial<EventLiveLinkDraft>) {
    setLinks((current) =>
      current.map((link, position) =>
        position === index ? { ...link, ...patch } : link,
      ),
    );
  }

  return (
    <fieldset className="rounded-2xl border border-brand-100 p-4">
      <legend className="px-1 text-sm font-semibold text-charcoal/75">
        Live stream links
      </legend>
      <p className="text-xs leading-5 text-charcoal/50">
        Optional. Add YouTube, Facebook, Zoom or other live links.
      </p>
      <div className="mt-3 space-y-3">
        {links.map((link, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-2xl border border-brand-100 bg-cream/50 p-3 sm:grid-cols-[0.7fr_1.3fr_auto]"
          >
            <div>
              <Label htmlFor={`${idPrefix}-live-label-${index}`}>Label</Label>
              <Input
                id={`${idPrefix}-live-label-${index}`}
                name="liveLabel"
                value={link.label}
                onChange={(event) => update(index, { label: event.target.value })}
                maxLength={120}
                placeholder="Watch live"
              />
            </div>
            <div>
              <Label htmlFor={`${idPrefix}-live-url-${index}`}>Link</Label>
              <Input
                id={`${idPrefix}-live-url-${index}`}
                name="liveUrl"
                type="url"
                value={link.url}
                onChange={(event) => update(index, { url: event.target.value })}
                maxLength={500}
                placeholder="https://youtube.com/live/..."
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() =>
                  setLinks((current) =>
                    current.filter((_, position) => position !== index),
                  )
                }
                disabled={links.length === 1}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setLinks((current) => [...current, { label: "", url: "" }])
        }
        className={buttonClasses("outline", "sm", "mt-3")}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add link
      </button>
    </fieldset>
  );
}
