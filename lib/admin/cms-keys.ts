export const CONTENT_SETTING_KEYS = [
  "church_name",
  "tagline",
  "pastor_name",
  "hero_headline",
  "hero_subheadline",
  "hero_primary_label",
  "hero_primary_href",
  "hero_secondary_label",
  "hero_secondary_href",
  "welcome_title",
  "welcome_body",
] as const;

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
  "pastor_intro",
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
  pastor_intro: "Home/About - Pastor introduction",
  latest_devotional: "Home - Latest devotional",
  appointment_cta: "Home - Appointment call-to-action",
};

export const MULTILINE_CONTENT_KEYS = new Set([
  "hero_subheadline",
  "welcome_body",
]);
