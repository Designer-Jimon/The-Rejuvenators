export const CONTENT_SETTING_KEYS = [
  "church_name",
  "tagline",
  "hero_headline",
  "hero_subheadline",
  "hero_primary_label",
  "hero_primary_href",
  "hero_secondary_label",
  "hero_secondary_href",
  "welcome_title",
  "welcome_body",
] as const;

export const CONTACT_SETTING_KEYS = [
  "address",
  "phone",
  "email",
  "service_sunday",
  "service_weekday",
  "map_url",
] as const;

export const FOOTER_SETTING_KEYS = [
  "footer_note",
  "facebook_url",
  "instagram_url",
  "youtube_url",
  "whatsapp_group_url",
] as const;

export const ALL_CONTENT_SETTING_KEYS = [
  ...CONTENT_SETTING_KEYS,
  ...CONTACT_SETTING_KEYS,
  ...FOOTER_SETTING_KEYS,
] as const;

export const CONTENT_AREA_BLOCKS: Record<string, string[]> = {
  home: ["latest_devotional", "appointment_cta"],
  about: [
    "about_story",
    "scripture",
    "core_values",
    "what_we_believe",
    "spiritual_mandate",
  ],
  vision: ["intro", "vision", "mission", "closing"],
};

export const EDITABLE_BLOCK_KEYS = [
  "about_story",
  "scripture",
  "intro",
  "vision",
  "mission",
  "closing",
  "core_values",
  "what_we_believe",
  "spiritual_mandate",
  "latest_devotional",
  "appointment_cta",
] as const;

export const CONTENT_SETTING_LABELS: Record<string, string> = {
  church_name: "Church name",
  tagline: "Tagline",
  pastor_name: "Lead pastor",
  hero_headline: "Hero headline",
  hero_subheadline: "Hero subheading",
  hero_primary_label: "Primary button label",
  hero_primary_href: "Primary button link",
  hero_secondary_label: "Secondary button label",
  hero_secondary_href: "Secondary button link",
  welcome_title: "Home welcome title",
  welcome_body: "Home welcome message",
  address: "Church address",
  phone: "Phone",
  email: "Email",
  service_sunday: "Sunday service time",
  service_weekday: "Midweek service time",
  map_url: "Map link",
  footer_note: "Footer note",
  facebook_url: "Facebook URL",
  instagram_url: "Instagram URL",
  youtube_url: "YouTube URL",
  whatsapp_group_url: "WhatsApp invite link",
};

export const CONTENT_BLOCK_LABELS: Record<string, string> = {
  about_story: "About - Our story",
  scripture: "About - Scripture",
  intro: "Home - Intro",
  vision: "Vision & Mission - Vision",
  mission: "Vision & Mission - Mission list",
  closing: "Vision & Mission - Closing",
  core_values: "About - Core values",
  what_we_believe: "About - What we believe",
  spiritual_mandate: "About - Spiritual mandate",
  latest_devotional: "Home - Latest devotional",
  appointment_cta: "Home - Appointment call-to-action",
};

export const MULTILINE_CONTENT_KEYS = new Set([
  "hero_subheadline",
  "welcome_body",
]);
