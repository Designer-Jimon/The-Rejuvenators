export type AppointmentAvailability = {
  days: number[];
  start: string;
  end: string;
  slotMinutes: number;
};

export const WEEKDAYS = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
] as const;

export const DEFAULT_APPOINTMENT_AVAILABILITY: AppointmentAvailability = {
  days: [1, 2, 3, 4, 5],
  start: "09:00",
  end: "17:00",
  slotMinutes: 30,
};

export const SLOT_LENGTH_OPTIONS = [15, 20, 30, 45, 60] as const;

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTimeLabel(value: string) {
  const total = timeToMinutes(value);
  if (total === null) return value;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export function parseAvailability(
  values: Record<string, string | undefined>,
): AppointmentAvailability {
  const defaults = DEFAULT_APPOINTMENT_AVAILABILITY;
  const rawDays = values.appointment_days ?? defaults.days.join(",");
  const days = rawDays
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((day, index, all) => {
      return (
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 6 &&
        all.indexOf(day) === index
      );
    });

  const start = /^\d{2}:\d{2}$/.test(values.appointment_start ?? "")
    ? values.appointment_start!
    : defaults.start;
  const end = /^\d{2}:\d{2}$/.test(values.appointment_end ?? "")
    ? values.appointment_end!
    : defaults.end;
  const slotMinutes = Number(values.appointment_slot_minutes);

  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  return {
    days,
    start,
    end,
    slotMinutes:
      Number.isInteger(slotMinutes) && slotMinutes >= 10 && slotMinutes <= 120
        ? slotMinutes
        : defaults.slotMinutes,
    ...(startMinutes === null || endMinutes === null || startMinutes >= endMinutes
      ? { start: defaults.start, end: defaults.end }
      : {}),
  };
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function weekdayForDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCDay();
}

export function isDateAvailable(
  availability: AppointmentAvailability,
  date: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const weekday = weekdayForDate(date);
  if (weekday === null || !availability.days.includes(weekday)) return false;
  return date >= todayIso();
}

export function slotsForDate(
  availability: AppointmentAvailability,
  date: string,
) {
  if (!isDateAvailable(availability, date)) return [];
  const start = timeToMinutes(availability.start);
  const end = timeToMinutes(availability.end);
  if (start === null || end === null || start >= end) return [];

  const slots: string[] = [];
  for (let cursor = start; cursor + availability.slotMinutes <= end; cursor += availability.slotMinutes) {
    slots.push(minutesToTime(cursor));
  }
  return slots;
}

export function nextAvailableDate(
  availability: AppointmentAvailability,
  from = todayIso(),
) {
  const start = new Date(`${from}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return from;
  for (let offset = 0; offset < 60; offset += 1) {
    const date = new Date(start.getTime() + offset * 86_400_000)
      .toISOString()
      .slice(0, 10);
    if (isDateAvailable(availability, date)) return date;
  }
  return from;
}

export function validateSelection(
  availability: AppointmentAvailability,
  date: string,
  time: string,
) {
  if (!isDateAvailable(availability, date)) {
    return "Choose an available day from today onwards.";
  }
  if (!slotsForDate(availability, date).includes(time)) {
    return "Choose one of the available time slots.";
  }
  return null;
}

export function formatAppointmentDate(date: string | null | undefined) {
  if (!date) return "Not set";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatAppointmentWhen(
  date: string | null | undefined,
  time: string | null | undefined,
) {
  if (!date || !time) return "Not set";
  return `${formatAppointmentDate(date)} at ${formatTimeLabel(time)}`;
}

export function whatsappUrl(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length < 7) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
