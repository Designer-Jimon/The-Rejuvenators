import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { departmentMembers, departments } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import { getMemberAttendanceStats } from "@/lib/attendance";
import { mediaUrl } from "@/lib/media";
import { ProfileEditor } from "@/components/member/profile-editor";

export const metadata: Metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser("/member/profile");
  const db = await getDb();

  const memberships = await db
    .select({ name: departments.name })
    .from(departmentMembers)
    .innerJoin(departments, eq(departments.id, departmentMembers.departmentId))
    .where(
      and(
        eq(departmentMembers.userId, user.id),
        eq(departmentMembers.isActive, true),
      ),
    );

  const primaryDepartment =
    user.profile.requestedDepartmentName ?? memberships[0]?.name ?? null;
  const attendance = await getMemberAttendanceStats(user.id);

  return (
    <ProfileEditor
      initial={{
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.profile.gender ?? "",
        dateOfBirth: user.profile.dateOfBirth ?? "",
        address: user.profile.address ?? "",
        occupation: user.profile.occupation ?? "",
        bio: user.profile.bio ?? "",
        showPhone: user.profile.showPhone,
        showEmail: user.profile.showEmail,
        showLastSeen: user.profile.showLastSeen,
        avatarUrl: mediaUrl(user.profile.avatarKey),
        coverUrl: mediaUrl(user.profile.coverKey),
        memberCode: user.profile.memberCode,
        departmentName: primaryDepartment,
        registrationStatus: user.profile.registrationStatus,
        memberStatus: user.profile.memberStatus,
        createdAt: user.profile.createdAt?.toISOString() ?? null,
        roles: user.roles,
        attendance,
      }}
    />
  );
}
