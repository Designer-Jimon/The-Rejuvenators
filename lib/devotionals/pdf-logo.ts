import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSettings } from "@/lib/settings";

export async function getPdfLogo() {
  const settings = await getSettings();
  const key = settings.logo_key?.trim();
  if (!key) return null;
  const { env } = await getCloudflareContext({ async: true });
  const object = await env.MEDIA?.get(key);
  if (!object) return null;
  return {
    bytes: new Uint8Array(await object.arrayBuffer()),
    type: object.httpMetadata?.contentType ?? "application/octet-stream",
  };
}
