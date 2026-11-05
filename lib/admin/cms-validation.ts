import { z } from "zod";

const short = z.string().trim().max(200);
const medium = z.string().trim().max(2000);
const long = z.string().trim().max(8000);
const key = z.string().trim().max(300);
const optionalKey = z.string().trim().max(300).optional().default("");
const link = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) =>
      !value ||
      value.startsWith("/") ||
      /^https?:\/\/.+/i.test(value),
    "Use a site path starting with / or a full http(s) link.",
  );

export const mediaMetaSchema = z.object({
  altText: z.string().trim().max(250),
});

export const brandingSchema = z.object({
  logoKey: optionalKey,
});

export const slideshowSchema = z.object({
  id: optionalKey,
  imageKey: key,
  headline: short,
  subheadline: medium,
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isActive: z.boolean(),
});

export const activitySchema = z.object({
  id: optionalKey,
  title: z.string().trim().min(1, "Enter the activity name.").max(160),
  description: medium,
  day: short,
  time: short,
  venue: short,
  imageKey: optionalKey,
  extraInfo: long,
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isPublished: z.boolean(),
});

export const departmentSchema = z.object({
  id: z.string().trim().min(1),
  description: medium,
  imageKey: optionalKey,
  activities: long,
  headOfUnit: short,
});

export const faqSchema = z.object({
  id: optionalKey,
  question: z.string().trim().min(1, "Enter the question.").max(400),
  answer: z.string().trim().min(1, "Enter the answer.").max(8000),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  isPublished: z.boolean(),
});

export const websiteContentSchema = z.object({
  church_name: z.string().trim().min(1).max(160),
  tagline: short,
  pastor_name: short,
  hero_headline: short,
  hero_subheadline: medium,
  hero_primary_label: short,
  hero_primary_href: link,
  hero_secondary_label: short,
  hero_secondary_href: link,
  welcome_title: short,
  welcome_body: medium,
  blocks: z.array(
    z.object({
      key: z.string().trim().min(1).max(120),
      title: z.string().trim().min(1).max(200),
      body: long,
    }),
  ),
});

export const socialSettingsSchema = z.object({
  phone: z.string().trim().max(80),
  email: z.string().trim().max(200),
  address: medium,
  map_url: link,
  whatsapp_group_url: link,
  facebook_url: link,
  instagram_url: link,
  youtube_url: link,
});
