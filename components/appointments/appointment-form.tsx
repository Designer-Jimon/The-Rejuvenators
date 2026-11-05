"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarCheck2, CheckCircle2, MessageCircle } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  FormField,
  FormMessage,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form";
import {
  formatAppointmentWhen,
  formatTimeLabel,
  nextAvailableDate,
  slotsForDate,
  WEEKDAYS,
  type AppointmentAvailability,
} from "@/lib/appointments";

type AppointmentDefaults = {
  fullName: string;
  phone: string;
  email: string;
  isMember: boolean;
};

type Receipt = {
  reference: string;
  when: string;
};

export function AppointmentForm({
  availability,
  defaults,
  today,
}: {
  availability: AppointmentAvailability;
  defaults: AppointmentDefaults;
  today: string;
}) {
  const initialDate = nextAvailableDate(availability, today);
  const initialTime = slotsForDate(availability, initialDate)[0] ?? "";
  const [form, setForm] = useState({
    fullName: defaults.fullName,
    phone: defaults.phone,
    email: defaults.email,
    purpose: "",
    preferredDate: initialDate,
    preferredTime: initialTime,
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const slots = useMemo(
    () => slotsForDate(availability, form.preferredDate),
    [availability, form.preferredDate],
  );
  const availableDays = WEEKDAYS.filter((day) =>
    availability.days.includes(day.value),
  )
    .map((day) => day.short)
    .join(", ");

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeDate(value: string) {
    setForm((current) => {
      const nextSlots = slotsForDate(availability, value);
      return {
        ...current,
        preferredDate: value,
        preferredTime: nextSlots.includes(current.preferredTime)
          ? current.preferredTime
          : (nextSlots[0] ?? ""),
      };
    });
    setErrors((current) => ({ ...current, preferredDate: [], preferredTime: [] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setErrors({});
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        error?: string;
        reference?: string;
        when?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (!response.ok || !result.ok) {
        setErrors(result.fieldErrors ?? {});
        throw new Error(result.error ?? "Your request could not be sent.");
      }
      setReceipt({
        reference: result.reference ?? "",
        when: result.when ?? formatAppointmentWhen(form.preferredDate, form.preferredTime),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Your request could not be sent.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (receipt) {
    return (
      <div className="surface overflow-hidden bg-white p-5 sm:p-7">
        <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-serif text-2xl font-bold">
          Appointment request received
        </h2>
        <p className="mt-2 text-base leading-7 text-charcoal/70">
          Thank you, {form.fullName}. The church office will review your request
          and contact you on {form.phone} or {form.email}.
        </p>
        <dl className="mt-5 space-y-3 rounded-2xl bg-brand-50 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-1">
            <dt className="font-semibold text-charcoal/55">Requested time</dt>
            <dd className="font-semibold text-brand-900">{receipt.when}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-1">
            <dt className="font-semibold text-charcoal/55">Reference</dt>
            <dd className="font-semibold text-brand-900">{receipt.reference}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-1">
            <dt className="font-semibold text-charcoal/55">Status</dt>
            <dd className="font-semibold text-amber-800">Pending review</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/" prefetch className={buttonClasses("primary", "lg")}>
            Back to home
          </Link>
          {defaults.isMember ? (
            <Link
              href="/member/appointments"
              prefetch
              className={buttonClasses("outline", "lg")}
            >
              View my appointments
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setReceipt(null);
                setForm({
                  fullName: defaults.fullName,
                  phone: defaults.phone,
                  email: defaults.email,
                  purpose: "",
                  preferredDate: initialDate,
                  preferredTime: initialTime,
                  message: "",
                });
              }}
              className={buttonClasses("outline", "lg")}
            >
              Book another appointment
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface bg-white p-4 sm:p-6">
      <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
        <CalendarCheck2
          className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"
          aria-hidden="true"
        />
        <div className="min-w-0 text-sm leading-6 text-brand-900/80">
          <p className="font-semibold text-brand-900">
            Appointments with Pastor David Obidimalor
          </p>
          <p className="mt-1">
            Available {availableDays || "by arrangement"} between{" "}
            {formatTimeLabel(availability.start)} and{" "}
            {formatTimeLabel(availability.end)}. Each appointment is{" "}
            {availability.slotMinutes} minutes.
          </p>
        </div>
      </div>

      {defaults.isMember ? (
        <p className="mt-4 rounded-2xl border border-brand-100 bg-cream px-4 py-3 text-sm leading-6 text-charcoal/70">
          Your member details are prefilled. You can update them for this request
          if needed.
        </p>
      ) : null}

      {error ? (
        <div className="mt-4">
          <FormMessage>{error}</FormMessage>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        <FormField label="Full name" htmlFor="appointment-name" error={errors.fullName?.[0]}>
          <Input
            id="appointment-name"
            value={form.fullName}
            onChange={(event) => update("fullName", event.target.value)}
            autoComplete="name"
            maxLength={120}
            required
          />
        </FormField>

        <FormField label="Phone number" htmlFor="appointment-phone" error={errors.phone?.[0]}>
          <Input
            id="appointment-phone"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            autoComplete="tel"
            maxLength={30}
            required
          />
        </FormField>

        <FormField label="Email address" htmlFor="appointment-email" error={errors.email?.[0]}>
          <Input
            id="appointment-email"
            type="email"
            inputMode="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            autoComplete="email"
            maxLength={160}
            required
          />
        </FormField>

        <FormField
          label="Purpose of appointment"
          htmlFor="appointment-purpose"
          hint="For example: pastoral counsel, dedication, wedding, prayer."
          error={errors.purpose?.[0]}
        >
          <Input
            id="appointment-purpose"
            value={form.purpose}
            onChange={(event) => update("purpose", event.target.value)}
            maxLength={200}
            required
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Preferred date"
            htmlFor="appointment-date"
            error={errors.preferredDate?.[0]}
          >
            <Input
              id="appointment-date"
              type="date"
              min={today}
              value={form.preferredDate}
              onChange={(event) => changeDate(event.target.value)}
              required
            />
          </FormField>

          <FormField
            label="Preferred time"
            htmlFor="appointment-time"
            error={errors.preferredTime?.[0]}
            hint={
              slots.length
                ? "Only available slots are shown."
                : "No slots are available on this day."
            }
          >
            <Select
              id="appointment-time"
              value={form.preferredTime}
              onChange={(event) => update("preferredTime", event.target.value)}
              disabled={!slots.length}
              required
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

        <FormField
          label="Message (optional)"
          htmlFor="appointment-message"
          error={errors.message?.[0]}
        >
          <Textarea
            id="appointment-message"
            value={form.message}
            onChange={(event) => update("message", event.target.value)}
            maxLength={1500}
            placeholder="Anything you would like the pastor to know before the meeting?"
          />
        </FormField>
      </div>

      <Button
        type="submit"
        size="lg"
        loading={saving}
        disabled={!form.preferredTime}
        className="mt-5 w-full"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        Send appointment request
      </Button>
      <p className="mt-3 text-center text-xs leading-5 text-charcoal/45">
        Your details are used only to manage this appointment request.
      </p>
    </form>
  );
}
