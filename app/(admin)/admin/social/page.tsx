import type { Metadata } from "next";
import { Save } from "lucide-react";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveSocialSettings } from "./actions";

export const metadata: Metadata = { title: "Social & contact" };
export const dynamic = "force-dynamic";

const FIELDS = [
  {
    key: "phone",
    label: "Phone number",
    placeholder: "[Church phone - edit in Admin]",
    type: "tel",
  },
  {
    key: "email",
    label: "Email address",
    placeholder: "[Church email - edit in Admin]",
    type: "email",
  },
  {
    key: "address",
    label: "Church address",
    placeholder: "[Church address - edit in Admin]",
    type: "text",
    multiline: true,
  },
  {
    key: "map_url",
    label: "Map link",
    placeholder: "https://maps.google.com/...",
    type: "url",
    help: "Paste a Google Maps or other full http(s) link. Leave blank to hide the map button.",
  },
  {
    key: "whatsapp_group_url",
    label: "WhatsApp group link",
    placeholder: "https://chat.whatsapp.com/...",
    type: "url",
  },
  {
    key: "facebook_url",
    label: "Facebook page link",
    placeholder: "https://facebook.com/...",
    type: "url",
  },
  {
    key: "instagram_url",
    label: "Instagram link",
    placeholder: "https://instagram.com/...",
    type: "url",
  },
  {
    key: "youtube_url",
    label: "YouTube link",
    placeholder: "https://youtube.com/...",
    type: "url",
  },
] as const;

export default async function AdminSocialPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.settingsManage, "/admin/social");
  const { saved, error } = await searchParams;
  const settings = await getSettings();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Settings
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Social & contact</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          These details appear on the Contact page, footer and anywhere the
          church contact information is shown. Blank links are hidden.
        </p>
      </div>

      {saved ? <FormMessage tone="success">Contact details saved.</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <form action={saveSocialSettings} className="space-y-5">
        <section className="surface p-5 sm:p-6">
          <h2 className="font-serif text-xl font-semibold">Contact details</h2>
          <div className="mt-4 space-y-4">
            {FIELDS.slice(0, 4).map((field) => (
              <div key={field.key}>
                <Label htmlFor={`social-${field.key}`}>{field.label}</Label>
                {"multiline" in field && field.multiline ? (
                  <Textarea
                    id={`social-${field.key}`}
                    name={field.key}
                    defaultValue={settings[field.key] ?? ""}
                    placeholder={field.placeholder}
                    maxLength={2000}
                  />
                ) : (
                  <Input
                    id={`social-${field.key}`}
                    name={field.key}
                    type={field.type}
                    defaultValue={settings[field.key] ?? ""}
                    placeholder={field.placeholder}
                    maxLength={500}
                  />
                )}
                {"help" in field && field.help ? (
                  <p className="mt-1.5 text-xs leading-5 text-charcoal/45">
                    {field.help}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-5 sm:p-6">
          <h2 className="font-serif text-xl font-semibold">Social links</h2>
          <div className="mt-4 space-y-4">
            {FIELDS.slice(4).map((field) => (
              <div key={field.key}>
                <Label htmlFor={`social-${field.key}`}>{field.label}</Label>
                <Input
                  id={`social-${field.key}`}
                  name={field.key}
                  type={field.type}
                  defaultValue={settings[field.key] ?? ""}
                  placeholder={field.placeholder}
                  maxLength={500}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-xs leading-5 text-charcoal/45">
            Changes are audit-logged and the public website is revalidated.
          </p>
          <SubmitButton pendingLabel="Saving...">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save contact & social
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
