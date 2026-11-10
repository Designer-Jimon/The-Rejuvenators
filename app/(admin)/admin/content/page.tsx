import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, Save } from "lucide-react";
import { requirePermission } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { getBlock, getContentMap } from "@/lib/content";
import {
  CONTENT_AREA_BLOCKS,
  CONTENT_BLOCK_LABELS,
  CONTENT_SETTING_LABELS,
} from "@/lib/admin/cms-keys";
import { FormMessage, Input, Label, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tabs } from "@/components/ui/tabs";
import { saveWebsiteContent } from "./actions";

export const metadata: Metadata = { title: "Website text" };
export const dynamic = "force-dynamic";

const settingMax: Record<string, number> = {
  hero_headline: 200,
  hero_primary_label: 200,
  hero_secondary_label: 200,
  welcome_title: 200,
  tagline: 200,
  phone: 200,
  email: 200,
  service_sunday: 200,
  service_weekday: 200,
  hero_subheadline: 2000,
  welcome_body: 2000,
  address: 2000,
  footer_note: 2000,
};

const multilineSettings = new Set([
  "hero_subheadline",
  "welcome_body",
  "address",
  "footer_note",
]);

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requirePermission(PERMISSIONS.contentManage, "/admin/content");
  const { saved, error } = await searchParams;
  const [settings, content] = await Promise.all([getSettings(), getContentMap()]);

  function settingField(key: string) {
    const value = settings[key] ?? "";
    const max = settingMax[key] ?? 500;
    const multiline = multilineSettings.has(key);
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
            maxLength={max}
          />
        ) : (
          <Input
            id={`content-${key}`}
            name={key}
            defaultValue={value}
            maxLength={max}
            type={key.endsWith("_url") || key === "map_url" ? "url" : "text"}
          />
        )}
        <p className="mt-1 text-[11px] text-charcoal/40">
          Up to {max.toLocaleString()} characters.
        </p>
      </div>
    );
  }

  function blockFields(key: string) {
    const block = getBlock(content, key);
    return (
      <div
        key={key}
        className="rounded-2xl border border-brand-100 bg-white p-4"
      >
        <p className="text-sm font-semibold text-brand-800">
          {CONTENT_BLOCK_LABELS[key] ?? key}
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor={`title-${key}`}>Section title</Label>
            <Input
              id={`title-${key}`}
              name={`title_${key}`}
              defaultValue={block.title}
              maxLength={200}
            />
            <p className="mt-1 text-[11px] text-charcoal/40">
              Up to 200 characters.
            </p>
          </div>
          <div>
            <Label htmlFor={`body-${key}`}>Section body</Label>
            <Textarea
              id={`body-${key}`}
              name={`body_${key}`}
              defaultValue={block.body}
              maxLength={8000}
              className="min-h-32"
            />
            <p className="mt-1 text-[11px] text-charcoal/40">
              Up to 8,000 characters. Line breaks are preserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  function areaContent(
    keys: string[],
    blocks: string[],
    extra?: ReactNode,
  ) {
    return (
      <div className="space-y-4">
        {extra ? (
          <div className="grid gap-4 sm:grid-cols-2">{extra}</div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">{keys.map(settingField)}</div>
        <div className="space-y-3">{blocks.map(blockFields)}</div>
      </div>
    );
  }

  const tabs = [
    {
      id: "home",
      label: "Home",
      content: (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-charcoal/60">
              Headline, welcome message and homepage sections.
            </p>
            <Link
              href="/"
              target="_blank"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
            >
              View home <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {areaContent(
            [
              "church_name",
              "hero_headline",
              "hero_subheadline",
              "hero_primary_label",
              "hero_primary_href",
              "hero_secondary_label",
              "hero_secondary_href",
              "welcome_title",
              "welcome_body",
            ],
            CONTENT_AREA_BLOCKS.home,
          )}
        </section>
      ),
    },
    {
      id: "about",
      label: "About",
      content: (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-charcoal/60">
              The story, beliefs and values shown on the About page.
            </p>
            <Link
              href="/about"
              target="_blank"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
            >
              View about <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {areaContent([], CONTENT_AREA_BLOCKS.about)}
        </section>
      ),
    },
    {
      id: "vision",
      label: "Vision & Mission",
      content: (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-charcoal/60">
              The vision, mission list and closing statement.
            </p>
            <Link
              href="/vision-mission"
              target="_blank"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
            >
              View vision <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {areaContent([], CONTENT_AREA_BLOCKS.vision)}
        </section>
      ),
    },
    {
      id: "contact",
      label: "Contact",
      content: (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-charcoal/60">
              Address, phone, email, service times and map link.
            </p>
            <Link
              href="/contact"
              target="_blank"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
            >
              View contact <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {areaContent(
            [
              "address",
              "phone",
              "email",
              "service_sunday",
              "service_weekday",
              "map_url",
            ],
            [],
          )}
        </section>
      ),
    },
    {
      id: "footer",
      label: "Footer",
      content: (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-charcoal/60">
              Footer note, tagline and social links.
            </p>
            <Link
              href="/"
              target="_blank"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
            >
              View footer <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {areaContent(
            [
              "tagline",
              "footer_note",
              "facebook_url",
              "instagram_url",
              "youtube_url",
              "whatsapp_group_url",
            ],
            [],
          )}
        </section>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Content
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">Website text</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          Edit every public page by area. Changes publish immediately and are
          recorded in the audit log.
        </p>
      </div>

      {saved ? (
        <FormMessage tone="success">Website text saved.</FormMessage>
      ) : null}
      {error ? <FormMessage>{error}</FormMessage> : null}

      <form action={saveWebsiteContent} className="space-y-5">
        <Tabs items={tabs} />

        <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="text-xs leading-5 text-charcoal/45">
            Use the preview links to check each page after saving.
          </p>
          <SubmitButton pendingLabel="Publishing...">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save website text
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
