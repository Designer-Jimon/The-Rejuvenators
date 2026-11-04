import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  departments,
  memberProfiles,
  userRoles,
  users,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { uploadImage } from "@/lib/media";
import { notifyPermission } from "@/lib/notifications";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { csrfFailure, sameOrigin } from "@/lib/http";
import { MEMBER_REGISTRATION_MESSAGE, NOTIFICATION_TYPES, ROLES } from "@/lib/constants";
import { registerSchema } from "@/lib/validation";

export const runtime = "nodejs";

function memberCode() {
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `IIF-${new Date().getFullYear()}-${suffix}`;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return csrfFailure();

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";

  const ipLimit = await checkRateLimit(rateLimitKey("register:ip", ip), 8, 3600);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    gender: formData.get("gender"),
    dateOfBirth: formData.get("dateOfBirth"),
    address: formData.get("address"),
    occupation: formData.get("occupation") || "",
    departmentId: formData.get("departmentId") || "",
    bio: formData.get("bio") || "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check your details." },
      { status: 400 },
    );
  }

  const db = await getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing[0]) {
    return NextResponse.json(
      { error: "An account already exists with this email." },
      { status: 409 },
    );
  }

  let departmentId: string | null = null;
  let departmentName = "General Member";
  if (parsed.data.departmentId) {
    const dept = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments)
      .where(eq(departments.id, parsed.data.departmentId))
      .limit(1);
    if (dept[0]?.id) {
      departmentId = dept[0].id;
      departmentName = dept[0].name;
    }
  }

  const userId = crypto.randomUUID();
  let avatarKey: string | null = null;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    try {
      avatarKey = await uploadImage(avatar, "avatars", userId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Photo upload failed." },
        { status: 400 },
      );
    }
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const now = new Date();

  try {
    await db.batch([
      db.insert(users).values({
        id: userId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash,
        status: "active",
        mustChangePassword: false,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(memberProfiles).values({
        userId,
        memberCode: memberCode(),
        gender: parsed.data.gender,
        dateOfBirth: parsed.data.dateOfBirth,
        address: parsed.data.address,
        occupation: parsed.data.occupation || null,
        bio: parsed.data.bio || null,
        avatarKey,
        requestedDepartmentId: departmentId,
        registrationStatus: "pending",
        memberStatus: "inactive",
        followupStatus: "new",
        showPhone: false,
        showEmail: false,
        showLastSeen: false,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(userRoles).values({
        userId,
        roleId: `role_${ROLES.member}`,
        assignedBy: null,
        assignedAt: now,
      }),
    ]);
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json(
      { error: "We could not complete your registration. Please try again." },
      { status: 500 },
    );
  }

  await notifyPermission("member.review", {
    type: NOTIFICATION_TYPES.memberRegistration,
    title: "New member registration",
    body: MEMBER_REGISTRATION_MESSAGE(departmentName),
    link: "/admin/members?status=pending",
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
