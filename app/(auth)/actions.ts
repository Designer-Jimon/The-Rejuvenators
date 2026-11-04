"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { memberProfiles, passwordResets, sessions, users } from "@/lib/db/schema";
import { hashPassword, hashToken, randomToken, verifyPassword } from "@/lib/auth/password";
import {
  createUserSession,
  deleteOtherSessions,
  destroyCurrentSession,
  getSessionUser,
} from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/authorize";
import { checkRateLimit, clientIpFromHeaders, rateLimitKey } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import { safeNextPath } from "@/lib/utils";
import {
  changePasswordSchema,
  forgotSchema,
  loginSchema,
  resetSchema,
} from "@/lib/validation";

export type AuthState = {
  error?: string;
  success?: string;
  resetUrl?: string;
};

export async function loginAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!(await sameOriginHeaders())) return csrfFailureState();

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const headerStore = await headers();
  const ip = clientIpFromHeaders(headerStore);
  const email = parsed.data.email;

  const ipLimit = await checkRateLimit(rateLimitKey("login:ip", ip), 12, 900);
  const emailLimit = await checkRateLimit(
    rateLimitKey("login:email", email),
    8,
    900,
  );
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Email or password is incorrect." };
  }
  if (user.status !== "active") {
    return { error: "This account is inactive. Please contact the church office." };
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await createUserSession(user.id);

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  const profileRows = await db
    .select({ registrationStatus: memberProfiles.registrationStatus })
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, user.id))
    .limit(1);
  const approved = profileRows[0]?.registrationStatus === "approved";

  const next = safeNextPath(parsed.data.next);
  if (next) redirect(next);
  redirect(approved ? "/member" : "/member/profile");
}

export async function forgotPasswordAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!(await sameOriginHeaders())) return csrfFailureState();

  const parsed = forgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email." };
  }

  const headerStore = await headers();
  const ip = clientIpFromHeaders(headerStore);
  const limit = await checkRateLimit(rateLimitKey("forgot:ip", ip), 6, 3600);
  if (!limit.allowed) {
    return { error: "Too many reset requests. Please try again later." };
  }

  const db = await getDb();
  const rows = await db
    .select({ id: users.id, email: users.email, status: users.status })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);

  let resetUrl: string | undefined;

  if (rows[0] && rows[0].status === "active") {
    const token = await randomToken(32);
    const tokenHash = await hashToken(token);
    await db.insert(passwordResets).values({
      id: crypto.randomUUID(),
      userId: rows[0].id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
      createdAt: new Date(),
    });

    const host = headerStore.get("host") ?? "localhost:3000";
    const proto = headerStore.get("x-forwarded-proto") ?? "http";
    const baseUrl = process.env.APP_URL || `${proto}://${host}`;
    resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
    try {
      const result = await sendPasswordResetEmail(rows[0].email, resetUrl);
      if (result.devPreview) resetUrl = result.devPreview;
      else if (result.sent) resetUrl = undefined;
    } catch (error) {
      console.error("Password reset email error", error);
      resetUrl = process.env.NODE_ENV === "production" ? undefined : resetUrl;
    }
  }

  return {
    success:
      "If an account exists for that email, a password reset link has been sent.",
    resetUrl,
  };
}

export async function resetPasswordAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!(await sameOriginHeaders())) return csrfFailureState();

  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const headerStore = await headers();
  const ip = clientIpFromHeaders(headerStore);
  const limit = await checkRateLimit(rateLimitKey("reset:ip", ip), 10, 3600);
  if (!limit.allowed) {
    return { error: "Too many attempts. Please request a new reset link." };
  }

  const tokenHash = await hashToken(parsed.data.token);
  const db = await getDb();
  const rows = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, tokenHash),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const reset = rows[0];
  if (!reset) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, reset.userId));
  await db
    .update(passwordResets)
    .set({ usedAt: new Date() })
    .where(eq(passwordResets.id, reset.id));
  await db.delete(sessions).where(eq(sessions.userId, reset.userId));

  return { success: "Password updated. You can now sign in." };
}

export async function changePasswordAction(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!(await sameOriginHeaders())) return csrfFailureState();

  const current = await getSessionUser();
  if (!current) redirect("/login");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const db = await getDb();
  const rows = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, current.id))
    .limit(1);

  if (
    !rows[0] ||
    !(await verifyPassword(parsed.data.currentPassword, rows[0].passwordHash))
  ) {
    return { error: "Your current password is incorrect." };
  }
  if (parsed.data.currentPassword === parsed.data.password) {
    return { error: "Choose a new password that is different from the current one." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, current.id));

  const headerStore = await headers();
  const cookieHeader = headerStore.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("iif_session="))
    ?.split("=")[1];
  await deleteOtherSessions(current.id, token);

  redirect(hasPermission(current, "admin.access") ? "/admin" : "/member");
}

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/");
}

async function sameOriginHeaders() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (!origin) return false;
  const host = headerStore.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function csrfFailureState(): AuthState {
  return { error: "Request origin could not be verified. Refresh and try again." };
}
