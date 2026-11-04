import { NextResponse } from "next/server";
import { csrfFailure, readJson, sameOrigin } from "@/lib/http";
import { hasPermission, requireApiUser } from "@/lib/auth/authorize";
import { performAdminAction } from "@/lib/admin/members";
import { adminActionSchema } from "@/lib/validation";

const permissionByAction: Record<string, string> = {
  approve: "member.review",
  reject: "member.review",
  assign_department: "member.manage",
  set_leader: "member.leader",
  remove_leader: "member.leader",
  set_status: "member.manage",
  set_followup: "member.followup",
  whatsapp_invite: "member.whatsapp",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return csrfFailure();

  const auth = await requireApiUser();
  if (auth.response) return auth.response;
  const user = auth.user;

  const body = await readJson<unknown>(request);
  const parsed = adminActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid action." },
      { status: 400 },
    );
  }

  const requiredPermission = permissionByAction[parsed.data.action];
  if (!requiredPermission || !hasPermission(user, requiredPermission)) {
    return NextResponse.json(
      { error: "You do not have permission to do this." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const ipAddress =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  try {
    const result = await performAdminAction(user, id, parsed.data, ipAddress);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("Admin member action failed", error);
    return NextResponse.json(
      { error: "The action could not be completed. Please try again." },
      { status: 500 },
    );
  }
}
