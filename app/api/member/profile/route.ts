import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { memberProfiles, users, worshipCenters } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth/authorize";
import { csrfFailure, readJson, sameOrigin } from "@/lib/http";
import { profileUpdateSchema } from "@/lib/validation";

const forbiddenFields = [
  "departmentId",
  "requestedDepartmentId",
  "role",
  "roles",
  "registrationStatus",
  "memberStatus",
  "followupStatus",
  "followupNotes",
  "memberCode",
  "status",
];

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return csrfFailure();

  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;

  const body = await readJson<Record<string, unknown>>(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (forbiddenFields.some((field) => field in body)) {
    return NextResponse.json(
      { error: "You cannot change restricted membership fields." },
      { status: 403 },
    );
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check your details." },
      { status: 400 },
    );
  }

  const db = await getDb();
  let worshipCenterId: string | null = parsed.data.worshipCenterId || null;
  if (worshipCenterId) {
    const center = await db
      .select({ id: worshipCenters.id })
      .from(worshipCenters)
      .where(eq(worshipCenters.id, worshipCenterId))
      .limit(1);
    if (!center[0]) {
      return NextResponse.json(
        { error: "Select a valid worship center." },
        { status: 400 },
      );
    }
  } else {
    worshipCenterId = null;
  }

  const now = new Date();
  await db
    .update(users)
    .set({
      name: parsed.data.name,
      phone: parsed.data.phone,
      updatedAt: now,
    })
    .where(eq(users.id, user.id));

  await db
    .update(memberProfiles)
    .set({
      gender: parsed.data.gender ?? null,
      maritalStatus: parsed.data.maritalStatus || null,
      country: parsed.data.country || null,
      state: parsed.data.state || null,
      lga: parsed.data.lga || null,
      worshipCenterId,
      dateOfBirth: parsed.data.dateOfBirth || null,
      address: parsed.data.address || null,
      occupation: parsed.data.occupation || null,
      bio: parsed.data.bio || null,
      showPhone: parsed.data.showPhone,
      showEmail: parsed.data.showEmail,
      showLastSeen: parsed.data.showLastSeen,
      updatedAt: now,
    })
    .where(eq(memberProfiles.userId, user.id));

  return NextResponse.json({ ok: true });
}
