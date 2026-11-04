import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { ROLES } from "@/lib/constants";
import { getSessionUser, type SessionUser } from "./session";

export function hasPermission(user: SessionUser, permission: string) {
  if (user.roles.includes(ROLES.superAdmin)) return true;
  return user.permissions.includes(permission);
}

export function isAdmin(user: SessionUser) {
  return (
    user.roles.includes(ROLES.superAdmin) ||
    user.permissions.includes("admin.access")
  );
}

export async function requireUser(nextPath?: string) {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  if (user.mustChangePassword) {
    redirect("/change-password");
  }
  return user;
}

export async function requirePermission(permission: string, nextPath?: string) {
  const user = await requireUser(nextPath);
  if (!hasPermission(user, permission)) {
    redirect("/member?denied=1");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (!isAdmin(user)) {
    redirect("/member?denied=1");
  }
  return user;
}

type ApiAuthResult =
  | { user: SessionUser; response: null }
  | { user: null; response: NextResponse };

export async function requireApiUser(
  permission?: string,
): Promise<ApiAuthResult> {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }
  if (user.mustChangePassword) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "Change your password before continuing." },
        { status: 403 },
      ),
    };
  }
  if (permission && !hasPermission(user, permission)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: "You do not have permission to do this." },
        { status: 403 },
      ),
    };
  }
  return { user, response: null };
}
