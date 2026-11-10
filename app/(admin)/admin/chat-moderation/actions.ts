"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { chatReports, conversations, messages, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { deleteChatMessage } from "@/lib/chat";
import { broadcastConversation } from "@/lib/realtime";
import { logAudit } from "@/lib/audit";

const baseSchema = z.object({
  action: z.string().trim().min(1).max(40),
});

function fail(message: string): never {
  redirect(
    `/admin/chat-moderation?error=${encodeURIComponent(message)}`,
  );
}

function done(message: string): never {
  revalidatePath("/admin/chat-moderation");
  revalidatePath("/member/chat");
  redirect(
    `/admin/chat-moderation?saved=${encodeURIComponent(message)}`,
  );
}

export async function moderateChat(formData: FormData) {
  const user = await requirePermission(
    PERMISSIONS.memberManage,
    "/admin/chat-moderation",
  );
  const base = baseSchema.safeParse({
    action: String(formData.get("action") ?? ""),
  });
  if (!base.success) fail("Unknown moderation action.");
  const db = await getDb();

  if (base.data.action === "delete_message") {
    const parsed = z
      .object({
        conversationId: z.string().trim().min(1).max(80),
        messageId: z.string().trim().min(1).max(80),
      })
      .safeParse({
        conversationId: String(formData.get("conversationId") ?? ""),
        messageId: String(formData.get("messageId") ?? ""),
      });
    if (!parsed.success) fail("Choose a message to remove.");

    try {
      await deleteChatMessage(
        user.id,
        parsed.data.conversationId,
        parsed.data.messageId,
        true,
      );
    } catch (error) {
      fail(error instanceof Error ? error.message : "Message not found.");
    }
    await broadcastConversation(parsed.data.conversationId, {
      type: "message_deleted",
      messageId: parsed.data.messageId,
      conversationId: parsed.data.conversationId,
    });
    await logAudit({
      actorId: user.id,
      action: "chat.message_removed",
      entityType: "message",
      entityId: parsed.data.messageId,
      details: `Removed a message from conversation ${parsed.data.conversationId}.`,
    });
    done("Message removed.");
  }

  if (base.data.action === "mute_user") {
    const parsed = z
      .object({
        userId: z.string().trim().min(1).max(80),
        hours: z.coerce.number().int().min(1).max(720),
      })
      .safeParse({
        userId: String(formData.get("userId") ?? ""),
        hours: formData.get("hours") ?? 24,
      });
    if (!parsed.success) fail("Choose a member and a mute duration.");

    const until = new Date(Date.now() + parsed.data.hours * 60 * 60 * 1000);
    await db
      .update(users)
      .set({ chatMutedUntil: until, updatedAt: new Date() })
      .where(eq(users.id, parsed.data.userId));
    await logAudit({
      actorId: user.id,
      action: "chat.user_muted",
      entityType: "user",
      entityId: parsed.data.userId,
      details: `Muted chat for ${parsed.data.hours} hours.`,
    });
    done("Member muted.");
  }

  if (base.data.action === "unmute_user") {
    const userId = String(formData.get("userId") ?? "").trim();
    if (!userId) fail("Choose a member.");
    await db
      .update(users)
      .set({ chatMutedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await logAudit({
      actorId: user.id,
      action: "chat.user_unmuted",
      entityType: "user",
      entityId: userId,
      details: "Removed chat mute.",
    });
    done("Member can chat again.");
  }

  if (base.data.action === "resolve_report") {
    const parsed = z
      .object({
        reportId: z.string().trim().min(1).max(80),
        status: z.enum(["open", "closed"]),
      })
      .safeParse({
        reportId: String(formData.get("reportId") ?? ""),
        status: String(formData.get("status") ?? "closed"),
      });
    if (!parsed.success) fail("Choose a report.");
    await db
      .update(chatReports)
      .set({
        status: parsed.data.status,
        resolvedBy: parsed.data.status === "closed" ? user.id : null,
        resolvedAt: parsed.data.status === "closed" ? new Date() : null,
      })
      .where(eq(chatReports.id, parsed.data.reportId));
    await logAudit({
      actorId: user.id,
      action: "chat.report_updated",
      entityType: "chat_report",
      entityId: parsed.data.reportId,
      details: `Marked report ${parsed.data.status}.`,
    });
    done("Report updated.");
  }

  if (base.data.action === "archive_group") {
    const parsed = z
      .object({
        conversationId: z.string().trim().min(1).max(80),
        archive: z.enum(["1", "0"]),
      })
      .safeParse({
        conversationId: String(formData.get("conversationId") ?? ""),
        archive: String(formData.get("archive") ?? "1"),
      });
    if (!parsed.success) fail("Choose a group.");
    const archive = parsed.data.archive === "1";
    await db
      .update(conversations)
      .set({ isArchived: archive })
      .where(
        and(
          eq(conversations.id, parsed.data.conversationId),
          ne(conversations.type, "direct"),
        ),
      );
    await broadcastConversation(parsed.data.conversationId, {
      type: "archived",
      conversationId: parsed.data.conversationId,
      archived: archive,
    });
    await logAudit({
      actorId: user.id,
      action: archive ? "chat.group_archived" : "chat.group_restored",
      entityType: "conversation",
      entityId: parsed.data.conversationId,
      details: archive ? "Archived group chat." : "Restored group chat.",
    });
    done(archive ? "Group archived." : "Group restored.");
  }

  if (base.data.action === "view_message") {
    const messageId = String(formData.get("messageId") ?? "").trim();
    const conversationId = String(formData.get("conversationId") ?? "").trim();
    if (!messageId || !conversationId) fail("Message not found.");
    const [message] = await db
      .select({ body: messages.body, senderId: messages.senderId })
      .from(messages)
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.conversationId, conversationId),
        ),
      )
      .limit(1);
    if (!message) fail("Message not found.");
    await logAudit({
      actorId: user.id,
      action: "chat.message_viewed",
      entityType: "message",
      entityId: messageId,
      details: `Viewed reported message in conversation ${conversationId}.`,
    });
    done(`Reported message: ${message.body.slice(0, 240) || "[attachment]"}`);
  }

  fail("Unknown moderation action.");
}
