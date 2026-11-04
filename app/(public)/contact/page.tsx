import type { Metadata } from "next";
import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { PageHero } from "@/components/ui/display";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSettings();

  const items = [
    { icon: MapPin, label: "Address", value: settings.address },
    { icon: Phone, label: "Phone", value: settings.phone },
    { icon: Mail, label: "Email", value: settings.email },
    { icon: MessageCircle, label: "WhatsApp group", value: settings.whatsapp_group_url },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHero
        eyebrow="Connect"
        title="We would love to hear from you"
        description="Reach out with questions about the church, membership or visiting."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isLink =
            item.label === "Phone"
              ? item.value.startsWith("+")
              : item.label === "Email"
                ? item.value.includes("@") && !item.value.startsWith("[")
                : item.label === "WhatsApp group"
                  ? item.value.startsWith("http")
                  : false;
          const href =
            item.label === "Phone"
              ? `tel:${item.value}`
              : item.label === "Email"
                ? `mailto:${item.value}`
                : item.value;
          return (
            <div key={item.label} className="surface flex items-start gap-3 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
                  {item.label}
                </p>
                {isLink ? (
                  <a
                    href={href}
                    target={item.label === "WhatsApp group" ? "_blank" : undefined}
                    rel={item.label === "WhatsApp group" ? "noreferrer" : undefined}
                    className="mt-1 block break-words text-sm font-semibold text-brand-800 hover:underline"
                  >
                    {item.value}
                  </a>
                ) : (
                  <p className="mt-1 break-words text-sm font-semibold text-charcoal/75">
                    {item.value || "[Not set - edit in Admin]"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 surface p-6">
        <h2 className="font-serif text-2xl font-semibold">Service times</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
              Sunday service
            </dt>
            <dd className="mt-1 text-sm text-charcoal/75">{settings.service_sunday}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-charcoal/45">
              Midweek service
            </dt>
            <dd className="mt-1 text-sm text-charcoal/75">{settings.service_weekday}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
