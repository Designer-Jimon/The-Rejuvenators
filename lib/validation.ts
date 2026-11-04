import { z } from "zod";

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
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const registerSchema = z
  .object({
    name,
    email,
    phone,
    password,
    confirmPassword: z.string(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
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
  .strict();

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

export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type AdminActionInput = z.infer<typeof adminActionSchema>;
