"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Ban,
  Crown,
  MessageCircle,
  Save,
  ShieldOff,
  UserCheck,
  UserX,
} from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { FormField, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

type AdminActionBody =
  | { action: "approve" }
  | { action: "reject" }
  | { action: "assign_department"; departmentId: string }
  | { action: "set_leader" }
  | { action: "remove_leader" }
  | { action: "set_status"; status: "active" | "inactive" }
  | {
      action: "set_followup";
      followupStatus: "new" | "contacted" | "in_progress" | "completed";
      notes: string;
    }
  | { action: "whatsapp_invite" };

type ConfirmKind = "approve" | "reject" | "remove_leader" | null;

export function AdminMemberActions({
  memberId,
  memberName,
  registrationStatus,
  memberStatus,
  followupStatus,
  followupNotes,
  departmentId,
  departmentName,
  isLeader,
  departments,
  can,
}: {
  memberId: string;
  memberName: string;
  registrationStatus: string;
  memberStatus: string;
  followupStatus: string;
  followupNotes: string;
  departmentId: string | null;
  departmentName: string | null;
  isLeader: boolean;
  departments: Array<{ id: string; name: string }>;
  can: {
    review: boolean;
    manage: boolean;
    leader: boolean;
    followup: boolean;
    whatsapp: boolean;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const [selectedDepartment, setSelectedDepartment] = useState(departmentId ?? "");
  const [followup, setFollowup] = useState(followupStatus);
  const [notes, setNotes] = useState(followupNotes);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const hasActions =
    can.review || can.manage || can.leader || can.followup || can.whatsapp;

  async function run(key: string, body: AdminActionBody) {
    setError(null);
    setBusy(key);
    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        whatsappUrl?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? result.message ?? "Action failed.");
      }
      toast({ title: result.message ?? "Action completed" });
      if (result.whatsappUrl) setWhatsappUrl(result.whatsappUrl);
      setConfirm(null);
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Action failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (!hasActions) {
    return (
      <div className="surface p-5 text-sm leading-6 text-charcoal/60">
        You have view-only access to membership records.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      ) : null}

      {can.review ? (
        <section className="surface p-5">
          <h2 className="font-serif text-lg font-semibold">Registration</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Current status: <span className="font-semibold">{registrationStatus}</span>
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => setConfirm("approve")}
              loading={busy === "approve"}
              disabled={registrationStatus === "approved"}
              className="flex-1"
            >
              <BadgeCheck className="h-4 w-4" aria-hidden="true" />
              Approve registration
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirm("reject")}
              loading={busy === "reject"}
              disabled={registrationStatus === "rejected"}
              className="flex-1"
            >
              <Ban className="h-4 w-4" aria-hidden="true" />
              Reject
            </Button>
          </div>
        </section>
      ) : null}

      {can.manage ? (
        <section className="surface p-5">
          <h2 className="font-serif text-lg font-semibold">Department</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            {departmentName
              ? `Currently assigned to ${departmentName}.`
              : "No department assigned yet."}
          </p>
          <form
            className="mt-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!selectedDepartment) {
                setError("Choose a department first.");
                return;
              }
              void run("assign_department", {
                action: "assign_department",
                departmentId: selectedDepartment,
              });
            }}
          >
            <FormField label="Assign department" htmlFor="admin-department">
              <Select
                id="admin-department"
                value={selectedDepartment}
                onChange={(event) => setSelectedDepartment(event.target.value)}
              >
                <option value="">Choose a department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </FormField>
            <Button
              type="submit"
              variant="outline"
              loading={busy === "assign_department"}
              className="w-full"
            >
              Save department assignment
            </Button>
          </form>
        </section>
      ) : null}

      {can.leader && departmentId ? (
        <section className="surface p-5">
          <h2 className="font-serif text-lg font-semibold">Unit leadership</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            {isLeader
              ? `${memberName} is the current leader of ${departmentName ?? "this department"}.`
              : `${memberName} is not a leader of ${departmentName ?? "this department"}.`}
          </p>
          {isLeader ? (
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setConfirm("remove_leader")}
              loading={busy === "remove_leader"}
            >
              <ShieldOff className="h-4 w-4" aria-hidden="true" />
              Remove unit leader role
            </Button>
          ) : (
            <Button
              variant="gold"
              className="mt-3 w-full"
              onClick={() => void run("set_leader", { action: "set_leader" })}
              loading={busy === "set_leader"}
            >
              <Crown className="h-4 w-4" aria-hidden="true" />
              Assign as unit leader
            </Button>
          )}
        </section>
      ) : null}

      {can.manage ? (
        <section className="surface p-5">
          <h2 className="font-serif text-lg font-semibold">Member status</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Current status: <span className="font-semibold">{memberStatus}</span>
          </p>
          <Button
            variant={memberStatus === "active" ? "outline" : "primary"}
            className="mt-3 w-full"
            onClick={() =>
              void run("set_status", {
                action: "set_status",
                status: memberStatus === "active" ? "inactive" : "active",
              })
            }
            loading={busy === "set_status"}
          >
            {memberStatus === "active" ? (
              <UserX className="h-4 w-4" aria-hidden="true" />
            ) : (
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            )}
            Mark {memberStatus === "active" ? "inactive" : "active"}
          </Button>
        </section>
      ) : null}

      {can.followup ? (
        <section className="surface p-5">
          <h2 className="font-serif text-lg font-semibold">Follow-up</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void run("set_followup", {
                action: "set_followup",
                followupStatus: followup as
                  | "new"
                  | "contacted"
                  | "in_progress"
                  | "completed",
                notes,
              });
            }}
          >
            <FormField label="Follow-up status" htmlFor="followup-status">
              <Select
                id="followup-status"
                value={followup}
                onChange={(event) => setFollowup(event.target.value)}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </Select>
            </FormField>
            <FormField label="Internal notes" htmlFor="followup-notes">
              <Textarea
                id="followup-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
                placeholder="Notes visible only to authorised admins"
              />
            </FormField>
            <Button
              type="submit"
              variant="secondary"
              loading={busy === "set_followup"}
              className="w-full"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              Save follow-up
            </Button>
          </form>
        </section>
      ) : null}

      {can.whatsapp ? (
        <section className="surface p-5">
          <h2 className="font-serif text-lg font-semibold">WhatsApp</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Record that an invite was prepared and get the group link to send to
            this member.
          </p>
          <Button
            variant="outline"
            className="mt-3 w-full"
            onClick={() =>
              void run("whatsapp_invite", { action: "whatsapp_invite" })
            }
            loading={busy === "whatsapp_invite"}
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Prepare WhatsApp invite
          </Button>
        </section>
      ) : null}

      <ConfirmDialog
        open={confirm === "approve"}
        title={`Approve ${memberName}?`}
        description="This activates the membership and adds the member to their requested department."
        confirmLabel="Approve member"
        loading={busy === "approve"}
        onConfirm={() => void run("approve", { action: "approve" })}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "reject"}
        title={`Reject ${memberName}?`}
        description="The member will be notified that their registration was not approved."
        confirmLabel="Reject registration"
        danger
        loading={busy === "reject"}
        onConfirm={() => void run("reject", { action: "reject" })}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "remove_leader"}
        title="Remove unit leader role?"
        description={`${memberName} will return to a regular member in this department.`}
        confirmLabel="Remove leadership"
        danger
        loading={busy === "remove_leader"}
        onConfirm={() => void run("remove_leader", { action: "remove_leader" })}
        onCancel={() => setConfirm(null)}
      />

      <Modal
        open={Boolean(whatsappUrl)}
        onClose={() => setWhatsappUrl(null)}
        title="WhatsApp invite ready"
        description="Open the group and share the invite with the member. The invite was recorded in the audit log."
        footer={
          <>
            <Button variant="outline" onClick={() => setWhatsappUrl(null)}>
              Close
            </Button>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("primary")}
              >
                Open WhatsApp group
              </a>
            ) : null}
          </>
        }
      >
        <p className="break-all rounded-2xl bg-brand-50 p-3 text-sm text-charcoal/75">
          {whatsappUrl}
        </p>
      </Modal>
    </div>
  );
}
