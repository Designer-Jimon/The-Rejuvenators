import {
  and,
  count,
  desc,
  eq,
  isNull,
  like,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  auditLogs,
  departmentLeaders,
  departmentMembers,
  departments,
  memberProfiles,
  roles,
  userRoles,
  users,
  worshipCenters,
} from "@/lib/db/schema";
import { NOTIFICATION_TYPES } from "@/lib/constants";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";
import {
  syncDepartmentConversation,
  syncUserChatGroups,
} from "@/lib/chat";
import type { AdminActionInput } from "@/lib/validation";
import type { SessionUser } from "@/lib/auth/session";

export type MemberListItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  memberCode: string;
  avatarKey: string | null;
  departmentName: string | null;
  worshipCenterName: string | null;
  registrationStatus: string;
  memberStatus: string;
  followupStatus: string;
  createdAt: Date;
};

export async function listMembers(options: {
  status?: string;
  search?: string;
  centerId?: string;
  limit?: number;
}) {
  const db = await getDb();
  const filters: SQL[] = [];

  if (options.status && options.status !== "all") {
    filters.push(eq(memberProfiles.registrationStatus, options.status as never));
  }
  if (options.centerId) {
    filters.push(eq(memberProfiles.worshipCenterId, options.centerId));
  }
  if (options.search) {
    const term = `%${options.search.trim()}%`;
    const searchFilter = or(
      like(users.name, term),
      like(users.email, term),
      like(users.phone, term),
      like(memberProfiles.memberCode, term),
      like(memberProfiles.country, term),
      like(memberProfiles.state, term),
      like(memberProfiles.lga, term),
    );
    if (searchFilter) filters.push(searchFilter);
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      memberCode: memberProfiles.memberCode,
      avatarKey: memberProfiles.avatarKey,
      departmentName: departments.name,
      worshipCenterName: worshipCenters.name,
      registrationStatus: memberProfiles.registrationStatus,
      memberStatus: memberProfiles.memberStatus,
      followupStatus: memberProfiles.followupStatus,
      createdAt: memberProfiles.createdAt,
    })
    .from(users)
    .innerJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(
      departments,
      eq(departments.id, memberProfiles.requestedDepartmentId),
    )
    .leftJoin(worshipCenters, eq(worshipCenters.id, memberProfiles.worshipCenterId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(memberProfiles.createdAt))
    .limit(options.limit ?? 100);

  return rows as MemberListItem[];
}

export async function getAdminCounts() {
  const db = await getDb();
  const [[pending], [approved], [active], [departmentCount]] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(memberProfiles)
        .where(eq(memberProfiles.registrationStatus, "pending")),
      db
        .select({ value: count() })
        .from(memberProfiles)
        .where(eq(memberProfiles.registrationStatus, "approved")),
      db
        .select({ value: count() })
        .from(memberProfiles)
        .where(
          and(
            eq(memberProfiles.registrationStatus, "approved"),
            eq(memberProfiles.memberStatus, "active"),
          ),
        ),
      db
        .select({ value: count() })
        .from(departments)
        .where(eq(departments.isActive, true)),
    ]);

  return {
    pending: Number(pending?.value ?? 0),
    approved: Number(approved?.value ?? 0),
    active: Number(active?.value ?? 0),
    departments: Number(departmentCount?.value ?? 0),
  };
}

export async function getMemberDetail(memberId: string) {
  const db = await getDb();
  const rows = await db
    .select({
      user: users,
      profile: memberProfiles,
      requestedDepartment: departments,
      worshipCenter: worshipCenters,
    })
    .from(users)
    .innerJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(
      departments,
      eq(departments.id, memberProfiles.requestedDepartmentId),
    )
    .leftJoin(worshipCenters, eq(worshipCenters.id, memberProfiles.worshipCenterId))
    .where(eq(users.id, memberId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [roleRows, memberships, leaderHistory, audit, departmentList] =
    await Promise.all([
      db
        .select({ key: roles.key, label: roles.label })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, memberId)),
      db
        .select({
          id: departmentMembers.id,
          departmentId: departmentMembers.departmentId,
          departmentName: departments.name,
          role: departmentMembers.role,
          isActive: departmentMembers.isActive,
          joinedAt: departmentMembers.joinedAt,
        })
        .from(departmentMembers)
        .innerJoin(
          departments,
          eq(departments.id, departmentMembers.departmentId),
        )
        .where(eq(departmentMembers.userId, memberId))
        .orderBy(desc(departmentMembers.joinedAt)),
      db
        .select({
          id: departmentLeaders.id,
          departmentName: departments.name,
          startedAt: departmentLeaders.startedAt,
          endedAt: departmentLeaders.endedAt,
        })
        .from(departmentLeaders)
        .innerJoin(
          departments,
          eq(departments.id, departmentLeaders.departmentId),
        )
        .where(eq(departmentLeaders.userId, memberId))
        .orderBy(desc(departmentLeaders.startedAt)),
      db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, "member"),
            eq(auditLogs.entityId, memberId),
          ),
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(30),
      db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.isActive, true))
        .orderBy(departments.sortOrder),
    ]);

  return {
    ...row,
    roles: roleRows,
    memberships,
    leaderHistory,
    audit,
    departments: departmentList,
  };
}

export type AdminActionResult = {
  ok: boolean;
  message: string;
  whatsappUrl?: string;
};

function stateLabel(value: string) {
  return value.replace(/_/g, " ");
}

export async function performAdminAction(
  actor: SessionUser,
  memberId: string,
  input: AdminActionInput,
  ipAddress?: string | null,
): Promise<AdminActionResult> {
  const db = await getDb();
  const rows = await db
    .select({
      user: users,
      profile: memberProfiles,
      departmentName: departments.name,
    })
    .from(users)
    .innerJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(
      departments,
      eq(departments.id, memberProfiles.requestedDepartmentId),
    )
    .where(eq(users.id, memberId))
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, message: "Member not found." };

  const now = new Date();
  const audit = async (action: string, details: string) => {
    await logAudit({
      actorId: actor.id,
      action,
      entityType: "member",
      entityId: memberId,
      details,
      ipAddress,
    });
  };

  if (input.action === "approve") {
    await db
      .update(memberProfiles)
      .set({
        registrationStatus: "approved",
        memberStatus: "active",
        approvedAt: now,
        approvedBy: actor.id,
        updatedAt: now,
      })
      .where(eq(memberProfiles.userId, memberId));

    if (row.profile.requestedDepartmentId) {
      await db
        .insert(departmentMembers)
        .values({
          id: crypto.randomUUID(),
          departmentId: row.profile.requestedDepartmentId,
          userId: memberId,
          role: "member",
          isActive: true,
          joinedAt: now,
        })
        .onConflictDoUpdate({
          target: [departmentMembers.departmentId, departmentMembers.userId],
          set: { isActive: true, joinedAt: now },
        });
    }
    await syncUserChatGroups(memberId);

    await notifyUser(memberId, {
      type: NOTIFICATION_TYPES.memberApproved,
      title: "Your membership is approved",
      body: `Welcome to the family. Your registration has been approved${
        row.departmentName ? ` and you are joining the ${row.departmentName} Department` : ""
      }.`,
      link: "/member",
    });
    await audit("member.approved", `Approved ${row.user.name}.`);
    return { ok: true, message: "Member approved." };
  }

  if (input.action === "reject") {
    await db
      .update(memberProfiles)
      .set({
        registrationStatus: "rejected",
        memberStatus: "inactive",
        updatedAt: now,
      })
      .where(eq(memberProfiles.userId, memberId));

    await notifyUser(memberId, {
      type: NOTIFICATION_TYPES.memberRejected,
      title: "Registration update",
      body: "Your registration was not approved at this time. Please contact the church office if you have questions.",
      link: "/member",
    });
    await audit("member.rejected", `Rejected ${row.user.name}.`);
    return { ok: true, message: "Registration rejected." };
  }

  if (input.action === "assign_department") {
    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, input.departmentId))
      .limit(1);
    if (!department || !department.isActive) {
      return { ok: false, message: "Choose an active department." };
    }

    await db
      .update(memberProfiles)
      .set({
        requestedDepartmentId: department.id,
        updatedAt: now,
      })
      .where(eq(memberProfiles.userId, memberId));

    await db
      .insert(departmentMembers)
      .values({
        id: crypto.randomUUID(),
        departmentId: department.id,
        userId: memberId,
        role: "member",
        isActive: true,
        joinedAt: now,
      })
      .onConflictDoUpdate({
        target: [departmentMembers.departmentId, departmentMembers.userId],
        set: { isActive: true },
      });

    if (
      row.profile.requestedDepartmentId &&
      row.profile.requestedDepartmentId !== department.id
    ) {
      await db
        .update(departmentMembers)
        .set({ isActive: false })
        .where(
          and(
            eq(departmentMembers.userId, memberId),
            ne(departmentMembers.departmentId, department.id),
          ),
        );
      await syncDepartmentConversation(row.profile.requestedDepartmentId);
    }
    await syncUserChatGroups(memberId);

    await notifyUser(memberId, {
      type: NOTIFICATION_TYPES.general,
      title: "Department assignment",
      body: `You have been added to the ${department.name} Department.`,
      link: "/member/profile",
    });
    await audit(
      "member.department_assigned",
      `Assigned ${row.user.name} to ${department.name}.`,
    );
    return { ok: true, message: `Assigned to ${department.name}.` };
  }

  const departmentId = row.profile.requestedDepartmentId;
  if (
    (input.action === "set_leader" || input.action === "remove_leader") &&
    !departmentId
  ) {
    return {
      ok: false,
      message: "Assign this member to a department before managing leadership.",
    };
  }

  if (input.action === "set_leader" && departmentId) {
    await db
      .update(departmentMembers)
      .set({ role: "member" })
      .where(
        and(
          eq(departmentMembers.departmentId, departmentId),
          eq(departmentMembers.role, "leader"),
          eq(departmentMembers.isActive, true),
        ),
      );

    await db
      .update(departmentLeaders)
      .set({ endedAt: now })
      .where(
        and(
          eq(departmentLeaders.departmentId, departmentId),
          isNull(departmentLeaders.endedAt),
        ),
      );

    await db
      .insert(departmentMembers)
      .values({
        id: crypto.randomUUID(),
        departmentId,
        userId: memberId,
        role: "leader",
        isActive: true,
        joinedAt: now,
      })
      .onConflictDoUpdate({
        target: [departmentMembers.departmentId, departmentMembers.userId],
        set: { role: "leader", isActive: true },
      });

    await db.insert(departmentLeaders).values({
      id: crypto.randomUUID(),
      departmentId,
      userId: memberId,
      startedAt: now,
      assignedBy: actor.id,
    });
    await syncDepartmentConversation(departmentId);
    await syncUserChatGroups(memberId);

    await notifyUser(memberId, {
      type: NOTIFICATION_TYPES.leaderAssigned,
      title: "You are now a unit leader",
      body: `You have been assigned as leader of the ${row.departmentName ?? "assigned"} Department.`,
      link: "/member/profile",
    });
    await audit(
      "member.leader_assigned",
      `Assigned ${row.user.name} as leader of ${row.departmentName ?? departmentId}.`,
    );
    return { ok: true, message: "Unit leader assigned." };
  }

  if (input.action === "remove_leader" && departmentId) {
    await db
      .update(departmentMembers)
      .set({ role: "member" })
      .where(
        and(
          eq(departmentMembers.departmentId, departmentId),
          eq(departmentMembers.userId, memberId),
        ),
      );
    await db
      .update(departmentLeaders)
      .set({ endedAt: now })
      .where(
        and(
          eq(departmentLeaders.departmentId, departmentId),
          eq(departmentLeaders.userId, memberId),
          isNull(departmentLeaders.endedAt),
        ),
      );
    await syncDepartmentConversation(departmentId);
    await syncUserChatGroups(memberId);
    await notifyUser(memberId, {
      type: NOTIFICATION_TYPES.general,
      title: "Unit leadership update",
      body: `Your unit leader role for the ${row.departmentName ?? "assigned"} Department has ended.`,
      link: "/member/profile",
    });
    await audit(
      "member.leader_removed",
      `Removed ${row.user.name} as leader of ${row.departmentName ?? departmentId}.`,
    );
    return { ok: true, message: "Unit leader removed." };
  }

  if (input.action === "set_status") {
    const memberships = await db
      .select({ departmentId: departmentMembers.departmentId })
      .from(departmentMembers)
      .where(
        and(
          eq(departmentMembers.userId, memberId),
          eq(departmentMembers.isActive, true),
        ),
      );
    await db
      .update(memberProfiles)
      .set({ memberStatus: input.status, updatedAt: now })
      .where(eq(memberProfiles.userId, memberId));
    await Promise.all(
      [...new Set(memberships.map((row) => row.departmentId))].map((id) =>
        syncDepartmentConversation(id),
      ),
    );
    await syncUserChatGroups(memberId);
    await notifyUser(memberId, {
      type: NOTIFICATION_TYPES.memberStatus,
      title: "Membership status updated",
      body: `Your membership status is now ${input.status}.`,
      link: "/member/profile",
    });
    await audit(
      "member.status_changed",
      `Set ${row.user.name} to ${input.status}.`,
    );
    return { ok: true, message: `Member marked ${input.status}.` };
  }

  if (input.action === "set_followup") {
    await db
      .update(memberProfiles)
      .set({
        followupStatus: input.followupStatus,
        followupNotes: input.notes || null,
        updatedAt: now,
      })
      .where(eq(memberProfiles.userId, memberId));
    await audit(
      "member.followup_updated",
      `Follow-up for ${row.user.name}: ${stateLabel(input.followupStatus)}.`,
    );
    return { ok: true, message: "Follow-up saved." };
  }

  if (input.action === "whatsapp_invite") {
    const settings = await getSettings();
    const groupUrl = settings.whatsapp_group_url?.trim();
    if (!groupUrl) {
      return {
        ok: false,
        message: "Add the WhatsApp group invite link in Admin settings first.",
      };
    }
    await db
      .update(memberProfiles)
      .set({ whatsappInvitedAt: now, updatedAt: now })
      .where(eq(memberProfiles.userId, memberId));
    await audit(
      "member.whatsapp_invited",
      `Opened WhatsApp group invite for ${row.user.name}.`,
    );
    return {
      ok: true,
      message: "WhatsApp invite ready. Send the link to the member.",
      whatsappUrl: groupUrl,
    };
  }

  return { ok: false, message: "Unknown action." };
}
