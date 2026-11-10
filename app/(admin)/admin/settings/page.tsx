import type { Metadata } from "next";
import { Save } from "lucide-react";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS, SETTING_FIELDS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { FormField, FormMessage, Input, Textarea } from "@/components/ui/form";
import { updateSettings } from "./actions";

export const metadata: Metadata = { title: "Site settings" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.settingsManage, "/admin/settings");
  const { saved, error } = await searchParams;
  const settings = await getSettings();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Configuration
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Site settings</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          These values power the public website and member platform. Replace the
          bracketed placeholders with the church&apos;s real details before launch.
        </p>
      </div>

      {saved ? <FormMessage tone="success">Settings saved.</FormMessage> : null}
      {error === "url" ? (
        <FormMessage>
          Social and WhatsApp links must be full secure URLs starting with
          https://.
        </FormMessage>
      ) : null}

      <form action={updateSettings} className="surface p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {SETTING_FIELDS.map((field) => {
            const value = settings[field.key] ?? "";
            const isWide = field.multiline || field.key === "tagline";
            return (
              <FormField
                key={field.key}
                label={field.label}
                htmlFor={`setting-${field.key}`}
                className={isWide ? "sm:col-span-2" : undefined}
                hint={
                  field.key === "whatsapp_group_url"
                    ? "Required for the admin WhatsApp invite action."
                    : undefined
                }
              >
                {field.multiline ? (
                  <Textarea
                    id={`setting-${field.key}`}
                    name={field.key}
                    defaultValue={value}
                    maxLength={4000}
                  />
                ) : (
                  <Input
                    id={`setting-${field.key}`}
                    name={field.key}
                    defaultValue={value}
                    maxLength={500}
                    type={
                      field.key.endsWith("_url") ? "url" : "text"
                    }
                  />
                )}
              </FormField>
            );
          })}
        </div>

        <fieldset className="mt-6 space-y-3 border-t border-brand-100 pt-5">
          <legend className="text-sm font-semibold">Chat announcement group</legend>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="announcementGroupEnabled"
              defaultChecked={settings.announcement_group_enabled !== "0"}
              className="mt-0.5 h-5 w-5 rounded border-brand-300"
            />
            <span>
              Enable the All Centers announcement group for every active member.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="announcementAllowReplies"
              defaultChecked={settings.announcement_allow_replies === "1"}
              className="mt-0.5 h-5 w-5 rounded border-brand-300"
            />
            <span>
              Allow members to reply. When off, only admins and unit leaders can
              post.
            </span>
          </label>
        </fieldset>

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-brand-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-charcoal/45">
            Changes are saved to the database and recorded in the audit log.
          </p>
          <Button type="submit">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
