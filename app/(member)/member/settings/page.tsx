import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { KeyRound, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { getDb } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/authorize";
import {
  NOTIFICATION_LABELS,
  NOTIFICATION_TYPES,
} from "@/lib/constants";
import { PageHero } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { LogoutButton } from "@/components/ui/logout-button";
import { updateNotificationPreferences } from "../actions";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const preferenceTypes = [
  NOTIFICATION_TYPES.memberRegistration,
  NOTIFICATION_TYPES.memberApproved,
  NOTIFICATION_TYPES.memberRejected,
  NOTIFICATION_TYPES.memberStatus,
  NOTIFICATION_TYPES.leaderAssigned,
  NOTIFICATION_TYPES.appointmentUpdate,
  NOTIFICATION_TYPES.eventCreated,
  NOTIFICATION_TYPES.devotionalPublished,
  NOTIFICATION_TYPES.attendanceFollowup,
  NOTIFICATION_TYPES.general,
];

export default async function MemberSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser("/member/settings");
  const { saved } = await searchParams;
  const db = await getDb();

  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, user.id));

  const preferences = new Map(rows.map((row) => [row.type, row]));

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Your account"
        title="Settings"
        description="Choose how the church can reach you and keep your account secure."
      />

      {saved ? <FormMessage tone="success">Preferences saved.</FormMessage> : null}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="surface p-5 sm:p-6">
          <h2 className="font-serif text-xl font-semibold">
            Notification preferences
          </h2>
          <p className="mt-1 text-sm leading-6 text-charcoal/60">
            In-app notifications are available now. Email and WhatsApp delivery
            will be enabled in a later phase.
          </p>

          <form action={updateNotificationPreferences} className="mt-5">
            <div className="space-y-2">
              {preferenceTypes.map((type) => {
                const preference = preferences.get(type);
                const defaultChecked = preference
                  ? preference.inApp
                  : type !== NOTIFICATION_TYPES.memberRegistration;
                return (
                  <label
                    key={type}
                    className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-brand-100 px-4 py-2"
                  >
                    <span className="text-sm font-medium text-charcoal/80">
                      {NOTIFICATION_LABELS[type] ?? type}
                    </span>
                    <input
                      type="checkbox"
                      name={`inApp_${type}`}
                      defaultChecked={defaultChecked}
                      className="h-5 w-5 rounded border-brand-300 text-brand-700 focus:ring-brand-700"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-4 grid gap-2 text-xs text-charcoal/50 sm:grid-cols-2">
              <p className="flex items-center gap-2 rounded-xl bg-charcoal/5 px-3 py-2">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Email delivery: not configured
              </p>
              <p className="flex items-center gap-2 rounded-xl bg-charcoal/5 px-3 py-2">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp delivery: not configured
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="submit">Save preferences</Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-serif text-lg font-semibold">Password</h2>
                <p className="text-xs text-charcoal/55">Keep your account secure.</p>
              </div>
            </div>
            <Link href="/change-password" prefetch className="mt-4 block">
              <Button variant="outline" className="w-full">
                Change password
              </Button>
            </Link>
          </div>

          <div className="surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-serif text-lg font-semibold">Privacy</h2>
                <p className="text-xs text-charcoal/55">Control directory visibility.</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-charcoal/60">
              Phone, email and activity visibility can be changed from your
              profile page.
            </p>
            <Link href="/member/profile" prefetch className="mt-3 block">
              <Button variant="ghost" className="w-full">
                Open profile privacy settings
              </Button>
            </Link>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm leading-6 text-charcoal/60">
            Signed in as <span className="font-semibold">{user.email}</span>.
            Contact the church office if you need to change your email address.
          </div>

          <div className="surface p-5">
            <h2 className="font-serif text-lg font-semibold">Account</h2>
            <p className="mt-1 text-xs leading-5 text-charcoal/55">
              Sign out of this device when you are finished.
            </p>
            <LogoutButton className="mt-4 w-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}
