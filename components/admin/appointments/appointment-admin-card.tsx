"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/display";
import { CHURCH_NAME } from "@/lib/branding";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import {
  formatAppointmentDate,
  formatAppointmentWhen,
  formatTimeLabel,
  nextAvailableDate,
  slotsForDate,
  todayIso,
  whatsappUrl,
  type AppointmentAvailability,
} from "@/lib/appointments";

export type AppointmentAdminItem = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  purpose: string;
  message: string | null;
  preferredDate: string;
  preferredTime: string;
  suggestedDate: string | null;
  suggestedTime: string | null;
  adminNote: string | null;
  status: string;
};

function statusTone(status: string) {
  if (status === "confirmed") return "success" as const;
  if (status === "declined") return "danger" as const;
  if (status === "suggested") return "brand" as const;
  if (status === "completed") return "neutral" as const;
  return "warning" as const;
}

export function AppointmentAdminCard({
  appointment,
  availability,
}: {
  appointment: AppointmentAdminItem;
  availability: AppointmentAvailability;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<"suggest" | "note" | null>(null);
  const initialSuggestDate = nextAvailableDate(
    availability,
    appointment.suggestedDate ?? appointment.preferredDate,
  );
  const initialSuggestSlots = slotsForDate(availability, initialSuggestDate);
  const preferredSuggestTime =
    appointment.suggestedTime ?? appointment.preferredTime;
  const [suggestDate, setSuggestDate] = useState(initialSuggestDate);
  const [suggestTime, setSuggestTime] = useState(
    initialSuggestSlots.includes(preferredSuggestTime)
      ? preferredSuggestTime
      : (initialSuggestSlots[0] ?? ""),
  );
  const [note, setNote] = useState(appointment.adminNote ?? "");

  const slots = useMemo(
    () => slotsForDate(availability, suggestDate),
    [availability, suggestDate],
  );

  const displayDate = appointment.suggestedDate ?? appointment.preferredDate;
  const displayTime = appointment.suggestedTime ?? appointment.preferredTime;
  const displayWhen = formatAppointmentWhen(displayDate, displayTime);
  const message = [
    `Hello ${appointment.fullName},`,
    `This is ${CHURCH_NAME} about your appointment request for ${appointment.purpose}.`,
    `Current status: ${appointment.status}.`,
    `Requested time: ${displayWhen}.`,
    appointment.adminNote ? `Note: ${appointment.adminNote}` : "",
    "Please reply if you need to adjust anything.",
  ]
    .filter(Boolean)
    .join(" ");
  const chatUrl = whatsappUrl(appointment.phone, message);

  function changeSuggestDate(value: string) {
    setSuggestDate(value);
    const nextSlots = slotsForDate(availability, value);
    setSuggestTime(
      nextSlots.includes(suggestTime) ? suggestTime : (nextSlots[0] ?? ""),
    );
  }

  async function run(
    key: string,
    body: Record<string, string>,
  ) {
    setBusy(key);
    setError(null);
    try {
      const response = await fetch(`/api/admin/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Action failed.");
      }
      toast({ title: result.message ?? "Appointment updated" });
      setPanel(null);
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Action failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <article className="surface min-w-0 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Badge tone={statusTone(appointment.status)}>
            {appointment.status}
          </Badge>
          <h2 className="mt-2 break-words font-serif text-xl font-semibold">
            {appointment.fullName}
          </h2>
          <p className="mt-1 break-words text-sm font-semibold text-brand-800">
            {appointment.purpose}
          </p>
        </div>
        <p className="rounded-2xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-900">
          {formatAppointmentDate(displayDate)}
          <span className="block text-[11px] font-normal text-charcoal/55">
            {formatTimeLabel(displayTime)}
          </span>
        </p>
      </div>

      {appointment.suggestedDate ? (
        <p className="mt-3 rounded-2xl border border-brand-100 bg-cream px-3 py-2 text-xs leading-5 text-charcoal/65">
          Suggested alternative: {displayWhen}
        </p>
      ) : null}

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <Phone
            className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <dt className="sr-only">Phone</dt>
            <dd>
              <a
                href={`tel:${appointment.phone}`}
                className="break-all font-semibold text-brand-800 hover:underline"
              >
                {appointment.phone}
              </a>
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Mail
            className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <dt className="sr-only">Email</dt>
            <dd>
              <a
                href={`mailto:${appointment.email}`}
                className="break-all font-semibold text-brand-800 hover:underline"
              >
                {appointment.email}
              </a>
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarClock
            className="mt-0.5 h-4 w-4 shrink-0 text-brand-700"
            aria-hidden="true"
          />
          <div>
            <dt className="sr-only">Requested time</dt>
            <dd className="text-charcoal/75">
              Preferred:{" "}
              {formatAppointmentWhen(
                appointment.preferredDate,
                appointment.preferredTime,
              )}
            </dd>
          </div>
        </div>
      </dl>

      {appointment.message ? (
        <p className="mt-3 whitespace-pre-line break-words rounded-2xl bg-brand-50/70 p-3 text-sm leading-6 text-charcoal/70">
          {appointment.message}
        </p>
      ) : null}

      {appointment.adminNote ? (
        <p className="mt-3 whitespace-pre-line break-words rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          <span className="block text-xs font-bold uppercase tracking-wide">
            Admin note
          </span>
          {appointment.adminNote}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          onClick={() => void run("approve", { action: "approve" })}
          loading={busy === "approve"}
          disabled={appointment.status === "confirmed" || appointment.status === "completed"}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPanel(panel === "suggest" ? null : "suggest")}
          disabled={appointment.status === "completed"}
        >
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          Suggest time
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void run("complete", { action: "complete" })}
          loading={busy === "complete"}
          disabled={appointment.status === "completed"}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Completed
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => void run("decline", { action: "decline" })}
          loading={busy === "decline"}
          disabled={appointment.status === "declined" || appointment.status === "completed"}
          className="text-red-700"
        >
          <Ban className="h-4 w-4" aria-hidden="true" />
          Decline
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPanel(panel === "note" ? null : "note")}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          Add note
        </Button>
        {chatUrl ? (
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("gold", "sm")}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </a>
        ) : null}
      </div>

      {panel === "suggest" ? (
        <div className="mt-4 rounded-2xl border border-brand-100 bg-cream p-3">
          <p className="text-sm font-semibold">Suggest another date and time</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <FormField label="Date" htmlFor={`suggest-date-${appointment.id}`}>
              <Input
                id={`suggest-date-${appointment.id}`}
                type="date"
                min={todayIso()}
                value={suggestDate}
                onChange={(event) => changeSuggestDate(event.target.value)}
              />
            </FormField>
            <FormField label="Time" htmlFor={`suggest-time-${appointment.id}`}>
              <Select
                id={`suggest-time-${appointment.id}`}
                value={suggestTime}
                onChange={(event) => setSuggestTime(event.target.value)}
                disabled={!slots.length}
              >
                <option value="">
                  {slots.length ? "Choose a time" : "No slots available"}
                </option>
                {slots.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatTimeLabel(slot)}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <Button
            size="sm"
            className="mt-3 w-full"
            loading={busy === "suggest"}
            disabled={!suggestTime}
            onClick={() =>
              void run("suggest", {
                action: "suggest",
                suggestedDate: suggestDate,
                suggestedTime: suggestTime,
              })
            }
          >
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            Send suggested time
          </Button>
        </div>
      ) : null}

      {panel === "note" ? (
        <div className="mt-4 rounded-2xl border border-brand-100 bg-cream p-3">
          <FormField label="Admin note" htmlFor={`admin-note-${appointment.id}`}>
            <Textarea
              id={`admin-note-${appointment.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={2000}
              placeholder="Visible to admins and sent to the person."
            />
          </FormField>
          <Button
            size="sm"
            className="mt-3 w-full"
            loading={busy === "note"}
            disabled={note.trim().length < 2}
            onClick={() => void run("note", { action: "note", adminNote: note })}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            Save and send note
          </Button>
        </div>
      ) : null}

      <p className="mt-3 text-[11px] leading-5 text-charcoal/45">
        Actions send an in-app notification where possible and an email when the
        mail provider is configured.
      </p>
    </article>
  );
}
