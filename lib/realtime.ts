import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function broadcastConversation(
  conversationId: string,
  payload: unknown,
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.REALTIME) return;
    const room = env.REALTIME.get(env.REALTIME.idFromName(conversationId));
    await room.fetch("https://realtime.internal/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Realtime broadcast failed", error);
  }
}
