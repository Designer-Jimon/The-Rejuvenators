import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Play,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { devotionalRuns } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/authorize";
import { ROLES } from "@/lib/constants";
import { AI_PROVIDERS, readAiSettings } from "@/lib/devotionals/config";
import { formatDateTime } from "@/lib/utils";
import { Badge, SectionHeader } from "@/components/ui/display";
import {
  FormField,
  FormMessage,
  Input,
  Select,
  Textarea,
} from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { runAiTest, saveAiSettings } from "../devotionals/actions";

export const metadata: Metadata = { title: "AI settings" };
export const dynamic = "force-dynamic";

export default async function AiSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireAdmin();
  if (!user.roles.includes(ROLES.superAdmin)) {
    redirect("/admin?denied=1");
  }
  const params = await searchParams;
  const db = await getDb();
  const [settings, runs, { env }] = await Promise.all([
    readAiSettings(db),
    db
      .select()
      .from(devotionalRuns)
      .orderBy(desc(devotionalRuns.startedAt))
      .limit(8),
    getCloudflareContext({ async: true }),
  ]);
  const keyConfigured = Boolean(env.OPENAI_API_KEY?.trim());

  return (
    <div className="space-y-5">
      <Link
        href="/admin/devotionals"
        prefetch
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 active:opacity-70"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to devotionals
      </Link>

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Super Admin only
        </p>
        <h1 className="mt-1 font-serif text-3xl font-bold">AI settings</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-charcoal/60">
          Configure the OpenAI-compatible provider used to generate devotionals.
          The API key is a Worker secret and is never stored in the database.
        </p>
      </div>

      {params.saved ? (
        <FormMessage tone="success">{params.saved}</FormMessage>
      ) : null}
      {params.error ? <FormMessage>{params.error}</FormMessage> : null}

      <section
        className={
          keyConfigured
            ? "flex flex-wrap items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            : "flex flex-wrap items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        }
      >
        {keyConfigured ? (
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        )}
        <div>
          <p className="font-semibold">
            {keyConfigured
              ? "OPENAI_API_KEY is configured"
              : "OPENAI_API_KEY is missing"}
          </p>
          <p className="mt-1 leading-6 opacity-80">
            {keyConfigured
              ? "The Worker will use the secret at generation time. The key is not shown here and cannot be edited on this page."
              : "Add it as a Worker secret before generating: wrangler secret put OPENAI_API_KEY. For local testing, add it to .dev.vars."}
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface p-5 sm:p-6">
          <SectionHeader
            title="Provider configuration"
            description="Any OpenAI-compatible chat completions endpoint works."
          />
          <form action={saveAiSettings} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Provider" htmlFor="provider">
                <Select
                  id="provider"
                  name="provider"
                  defaultValue={settings.provider}
                >
                  {AI_PROVIDERS.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider === "openai" ? "OpenAI" : "Custom / compatible"}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Model" htmlFor="model">
                <Input
                  id="model"
                  name="model"
                  defaultValue={settings.model}
                  required
                />
              </FormField>
            </div>
            <FormField
              label="Base URL"
              htmlFor="baseUrl"
              hint="Example: https://api.openai.com/v1"
            >
              <Input
                id="baseUrl"
                name="baseUrl"
                type="url"
                defaultValue={settings.baseUrl}
                required
              />
            </FormField>
            <FormField
              label="Temperature"
              htmlFor="temperature"
              hint="0 is focused, 1 is more creative. Recommended: 0.6–0.8."
            >
              <Input
                id="temperature"
                name="temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                defaultValue={settings.temperature}
                required
              />
            </FormField>
            <FormField label="System prompt" htmlFor="systemPrompt">
              <Textarea
                id="systemPrompt"
                name="systemPrompt"
                defaultValue={settings.systemPrompt}
                className="min-h-48"
                required
              />
            </FormField>
            <SubmitButton pendingLabel="Saving settings...">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Save AI settings
            </SubmitButton>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-cream">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-serif text-lg font-semibold">Test the pipeline</h2>
                <p className="mt-1 text-sm leading-6 text-charcoal/60">
                  This runs today&apos;s generation exactly like the 5:00 AM
                  scheduler. If today already exists, it will publish or leave it
                  for review instead of duplicating it.
                </p>
              </div>
            </div>
            <form action={runAiTest} className="mt-4">
              <SubmitButton pendingLabel="Running pipeline...">
                <Play className="h-4 w-4" aria-hidden="true" />
                Run now (test)
              </SubmitButton>
            </form>
            <p className="mt-2 text-xs leading-5 text-charcoal/45">
              A plan must be active before this can generate a day.
            </p>
          </div>

          <div className="surface p-5">
            <h2 className="font-serif text-lg font-semibold">Recent runs</h2>
            {runs.length ? (
              <div className="mt-3 space-y-2">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-2xl border border-brand-100 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        tone={
                          run.status === "completed"
                            ? "green"
                            : run.status === "running"
                              ? "brand"
                              : "gold"
                        }
                      >
                        {run.status}
                      </Badge>
                      <span className="text-xs text-charcoal/45">
                        {formatDateTime(run.startedAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-charcoal/55">
                      {run.trigger === "manual" ? "Manual test" : "Scheduled"} ·{" "}
                      {run.completedDays} day
                      {run.completedDays === 1 ? "" : "s"}
                    </p>
                    {run.error ? (
                      <p className="mt-1 break-words text-xs leading-5 text-red-700">
                        {run.error}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-charcoal/55">
                No runs yet. Add an active plan and run a test.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
