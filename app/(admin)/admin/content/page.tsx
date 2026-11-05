import type { Metadata } from "next";
import { Save } from "lucide-react";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { getBlock, getContentMap } from "@/lib/content";
import {
  CONTENT_BLOCK_LABELS,
  CONTENT_SETTING_KEYS,
  CONTENT_SETTING_LABELS,
  EDITABLE_BLOCK_KEYS,
  MULTILINE_CONTENT_KEYS,
} from "@/lib/admin/cms-keys";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveWebsiteContent } from "./actions";

export const metadata: Metadata = { title: "Website content" };
export const dynamic = "force-dynamic";

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/content");
  const { saved, error } = await searchParams;
  const [settings, content] = await Promise.all([
    getSettings(),
    getContentMap(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Content
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Website content</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          Edit the Home sections, About, Vision & Mission, pastor introduction,
          hero text and button links. Changes publish immediately.
        </p>
      </div>

      {saved ? <FormMessage tone="success">Website content saved.</FormMessage> : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <form action={saveWebsiteContent} className="space-y-5">
        <section className="surface p-5 sm:p-6">
          <h2 className="font-serif text-xl font-semibold">Hero & welcome</h2>
          <p className="mt-1 text-sm leading-6 text-charcoal/60">
            These fields power the homepage hero buttons and welcome section.
          </p>
          <div className="mt-4 space-y-4">
            {CONTENT_SETTING_KEYS.map((key) => {
              const value = settings[key] ?? "";
              const multiline = MULTILINE_CONTENT_KEYS.has(key);
              return (
                <div key={key}>
                  <Label htmlFor={`content-${key}`}>
                    {CONTENT_SETTING_LABELS[key] ?? key}
                  </Label>
                  {multiline ? (
                    <Textarea
                      id={`content-${key}`}
                      name={key}
                      defaultValue={value}
                      maxLength={8000}
                    />
                  ) : (
                    <Input
                      id={`content-${key}`}
                      name={key}
                      defaultValue={value}
                      maxLength={2000}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="surface p-5 sm:p-6">
          <h2 className="font-serif text-xl font-semibold">
            Sections & copy
          </h2>
          <p className="mt-1 text-sm leading-6 text-charcoal/60">
            Each section has a title and body. Line breaks are preserved on the
            public website.
          </p>
          <div className="mt-4 space-y-4">
            {EDITABLE_BLOCK_KEYS.map((key) => {
              const block = getBlock(content, key);
              return (
                <details
                  key={key}
                  className="rounded-2xl border border-brand-100 bg-white p-4"
                >
                  <summary className="min-h-11 cursor-pointer text-sm font-semibold text-brand-800">
                    {CONTENT_BLOCK_LABELS[key] ?? key}
                  </summary>
                  <div className="mt-4 space-y-3">
                    <div>
                      <Label htmlFor={`title-${key}`}>Section title</Label>
                      <Input
                        id={`title-${key}`}
                        name={`title_${key}`}
                        defaultValue={block.title}
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`body-${key}`}>Section body</Label>
                      <Textarea
                        id={`body-${key}`}
                        name={`body_${key}`}
                        defaultValue={block.body}
                        maxLength={8000}
                        className="min-h-40"
                      />
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-xs leading-5 text-charcoal/45">
            Every save is recorded in the audit log and the public website is
            revalidated.
          </p>
          <SubmitButton pendingLabel="Publishing...">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save website content
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
