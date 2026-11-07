"use client";

import { useMemo, useState } from "react";
import { Check, CircleSlash, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitDepartmentAttendance } from "@/app/(member)/member/leadership/actions";

type AttendanceStatus = "present" | "absent" | "excused";

const options: Array<{
  value: AttendanceStatus;
  label: string;
  icon: typeof Check;
  selected: string;
}> = [
  {
    value: "present",
    label: "Present",
    icon: Check,
    selected: "border-emerald-600 bg-emerald-600 text-white",
  },
  {
    value: "absent",
    label: "Absent",
    icon: X,
    selected: "border-red-600 bg-red-600 text-white",
  },
  {
    value: "excused",
    label: "Excused",
    icon: CircleSlash,
    selected: "border-amber-500 bg-amber-500 text-white",
  },
];

export function LeaderAttendanceForm({
  eventId,
  departmentId,
  members,
}: {
  eventId: string;
  departmentId: string;
  members: Array<{
    userId: string;
    name: string;
    memberCode: string | null;
    status: AttendanceStatus | null;
  }>;
}) {
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(
      members.map((member) => [member.userId, member.status ?? "present"]),
    ),
  );

  const counts = useMemo(() => {
    const values = Object.values(statuses);
    return {
      present: values.filter((value) => value === "present").length,
      absent: values.filter((value) => value === "absent").length,
      excused: values.filter((value) => value === "excused").length,
    };
  }, [statuses]);

  return (
    <form action={submitDepartmentAttendance} className="space-y-4">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="departmentId" value={departmentId} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-50/70 p-3">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800">
            {counts.present} present
          </span>
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">
            {counts.absent} absent
          </span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
            {counts.excused} excused
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            setStatuses(
              Object.fromEntries(
                members.map((member) => [member.userId, "present"]),
              ),
            )
          }
          className="inline-flex min-h-11 items-center rounded-xl border border-brand-200 bg-white px-3 text-sm font-semibold text-brand-800 active:scale-[0.98] active:opacity-80"
        >
          Mark all present
        </button>
      </div>

      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.userId}
            className="rounded-2xl border border-brand-100 bg-white p-3"
          >
            <input
              type="hidden"
              name={`status_${member.userId}`}
              value={statuses[member.userId]}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{member.name}</p>
                <p className="mt-0.5 text-xs text-charcoal/45">
                  {member.memberCode ?? "Member"}
                </p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {options.map((option) => {
                const Icon = option.icon;
                const active = statuses[member.userId] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setStatuses((current) => ({
                        ...current,
                        [member.userId]: option.value,
                      }))
                    }
                    aria-pressed={active}
                    aria-label={`Mark ${member.name} ${option.label.toLowerCase()}`}
                    className={cn(
                      "flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-xl border px-1 text-[11px] font-semibold transition active:scale-[0.98] sm:px-2 sm:text-xs",
                      active
                        ? option.selected
                        : "border-brand-100 bg-white text-charcoal/60",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-brand-200 bg-white/95 p-3 shadow-lift backdrop-blur lg:bottom-4">
        <SubmitButton pendingLabel="Submitting attendance..." className="w-full">
          Submit attendance
        </SubmitButton>
        <p className="mt-2 text-center text-xs leading-5 text-charcoal/50">
          Submitting locks these marks. You can request an unlock if a correction
          is needed.
        </p>
      </div>
    </form>
  );
}
