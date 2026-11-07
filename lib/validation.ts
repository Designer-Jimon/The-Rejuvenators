import { z } from "zod";
import {
  canonicalCountry,
  isKnownCountry,
  isKnownLga,
  isKnownState,
  lgasForLocation,
  statesForCountry,
} from "@/lib/locations";

const name = z.string().trim().min(2, "Please enter your full name.").max(120);
const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const phone = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number.")
  .max(30, "Phone number is too long.")
  .regex(/^[+()\-\s0-9]+$/, "Use digits, spaces, +, ( ) or - only.");
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[a-z]/, "Include at least one lowercase letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const maritalStatusValues = [
  "single",
  "married",
  "divorced",
  "widowed",
  "prefer_not_to_say",
] as const;

export const registerSchema = z
  .object({
    name,
    email,
    phone,
    password,
    confirmPassword: z.string(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
    maritalStatus: z.enum(maritalStatusValues, {
      error: "Select your marital status.",
    }),
    country: z
      .string()
      .trim()
      .min(2, "Enter your country.")
      .max(80, "Country is too long."),
    state: z
      .string()
      .trim()
      .min(2, "Enter your state.")
      .max(80, "State is too long."),
    lga: z
      .string()
      .trim()
      .min(2, "Enter your LGA.")
      .max(80, "LGA is too long."),
    worshipCenterId: z
      .string()
      .trim()
      .min(1, "Select your worship center."),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        const now = new Date();
        return (
          !Number.isNaN(date.getTime()) &&
          date <= now &&
          date.getFullYear() >= 1900
        );
      }, "Enter a valid date of birth."),
    address: z.string().trim().min(4, "Enter your address.").max(300),
    occupation: z.string().trim().max(120).optional().default(""),
    departmentId: z.string().trim().max(80).optional().default(""),
    bio: z.string().trim().max(600).optional().default(""),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .superRefine((data, context) => {
    if (!isKnownCountry(data.country)) {
      context.addIssue({
        code: "custom",
        message: "Select your country from the list.",
        path: ["country"],
      });
      return;
    }
    if (canonicalCountry(data.country) !== "Nigeria") return;
    if (!isKnownState(data.country, data.state)) {
      context.addIssue({
        code: "custom",
        message: "Select your state from the list.",
        path: ["state"],
      });
    }
    if (!isKnownLga(data.country, data.state, data.lga)) {
      context.addIssue({
        code: "custom",
        message: "Select your LGA from the list.",
        path: ["lga"],
      });
    }
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({
    token: z.string().min(20, "This reset link is invalid."),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const profileUpdateSchema = z
  .object({
    name,
    phone,
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    maritalStatus: z
      .enum(maritalStatusValues)
      .optional()
      .or(z.literal("")),
    country: z.string().trim().max(80).optional().default(""),
    state: z.string().trim().max(80).optional().default(""),
    lga: z.string().trim().max(80).optional().default(""),
    worshipCenterId: z.string().trim().max(80).optional().default(""),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    address: z.string().trim().max(300).optional().default(""),
    occupation: z.string().trim().max(120).optional().default(""),
    bio: z.string().trim().max(600).optional().default(""),
    showPhone: z.boolean().optional().default(false),
    showEmail: z.boolean().optional().default(false),
    showLastSeen: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((data, context) => {
    if (!data.country) return;
    if (!isKnownCountry(data.country)) {
      context.addIssue({
        code: "custom",
        message: "Select your country from the list.",
        path: ["country"],
      });
      return;
    }
    const states = statesForCountry(data.country);
    if (states.length && data.state && !isKnownState(data.country, data.state)) {
      context.addIssue({
        code: "custom",
        message: "Select your state from the list.",
        path: ["state"],
      });
      return;
    }
    const lgas = lgasForLocation(data.country, data.state);
    if (lgas.length && data.lga && !isKnownLga(data.country, data.state, data.lga)) {
      context.addIssue({
        code: "custom",
        message: "Select your LGA from the list.",
        path: ["lga"],
      });
    }
  });

export const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("assign_department"), departmentId: z.string().min(1) }),
  z.object({ action: z.literal("set_leader") }),
  z.object({ action: z.literal("remove_leader") }),
  z.object({
    action: z.literal("set_status"),
    status: z.enum(["active", "inactive"]),
  }),
  z.object({
    action: z.literal("set_followup"),
    followupStatus: z.enum(["new", "contacted", "in_progress", "completed"]),
    notes: z.string().trim().max(2000).optional().default(""),
  }),
  z.object({ action: z.literal("whatsapp_invite") }),
]);

export const appointmentRequestSchema = z
  .object({
    fullName: name,
    phone,
    email,
    purpose: z
      .string()
      .trim()
      .min(3, "Tell us the purpose of the appointment.")
      .max(200, "Keep the purpose under 200 characters."),
    preferredDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a preferred date."),
    preferredTime: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, "Choose a preferred time."),
    message: z
      .string()
      .trim()
      .max(1500, "Keep your message under 1500 characters.")
      .optional()
      .default(""),
  })
  .strict();

export const appointmentAdminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("decline") }),
  z.object({
    action: z.literal("suggest"),
    suggestedDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
    suggestedTime: z
      .string()
      .trim()
      .regex(/^\d{2}:\d{2}$/, "Choose a time."),
  }),
  z.object({ action: z.literal("complete") }),
  z.object({
    action: z.literal("note"),
    adminNote: z
      .string()
      .trim()
      .min(2, "Write a note first.")
      .max(2000, "Keep the note under 2000 characters."),
  }),
]);

export const appointmentAvailabilitySchema = z
  .object({
    days: z.array(z.number().int().min(0).max(6)),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    slotMinutes: z.number().int().min(10).max(120),
  })
  .refine((data) => data.start < data.end, {
    message: "The end time must be after the start time.",
    path: ["end"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AdminActionInput = z.infer<typeof adminActionSchema>;
export type AppointmentRequestInput = z.infer<typeof appointmentRequestSchema>;
export type AppointmentAdminActionInput = z.infer<
  typeof appointmentAdminActionSchema
>;
