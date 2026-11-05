import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(unixepoch() * 1000)`;

const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export type UserStatus = "active" | "inactive";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type MemberStatus = "active" | "inactive";
export type FollowupStatus = "new" | "contacted" | "in_progress" | "completed";
export type DepartmentRole = "member" | "leader";
export type AttendanceStatus = "present" | "absent" | "excused";
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "suggested"
  | "completed";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: text("status").$type<UserStatus>().notNull().default("active"),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(false),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_phone_idx").on(table.phone),
  ],
);

export const roles = sqliteTable(
  "roles",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [uniqueIndex("roles_key_unique").on(table.key)],
);

export const permissions = sqliteTable(
  "permissions",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [uniqueIndex("permissions_key_unique").on(table.key)],
);

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
  ],
);

export const userRoles = sqliteTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedBy: text("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedAt: integer("assigned_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_roles_role_idx").on(table.roleId),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export const passwordResets = sqliteTable(
  "password_resets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [
    uniqueIndex("password_resets_token_unique").on(table.tokenHash),
    index("password_resets_user_idx").on(table.userId),
  ],
);

export const departments = sqliteTable(
  "departments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    icon: text("icon"),
    imageKey: text("image_key"),
    activities: text("activities"),
    headOfUnit: text("head_of_unit"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    ...timestamps(),
  },
  (table) => [uniqueIndex("departments_slug_unique").on(table.slug)],
);

export const memberProfiles = sqliteTable(
  "member_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    memberCode: text("member_code").notNull(),
    gender: text("gender"),
    dateOfBirth: text("date_of_birth"),
    address: text("address"),
    occupation: text("occupation"),
    bio: text("bio"),
    avatarKey: text("avatar_key"),
    coverKey: text("cover_key"),
    requestedDepartmentId: text("requested_department_id").references(
      () => departments.id,
      { onDelete: "set null" },
    ),
    registrationStatus: text("registration_status")
      .$type<RegistrationStatus>()
      .notNull()
      .default("pending"),
    memberStatus: text("member_status")
      .$type<MemberStatus>()
      .notNull()
      .default("inactive"),
    followupStatus: text("followup_status")
      .$type<FollowupStatus>()
      .notNull()
      .default("new"),
    followupNotes: text("followup_notes"),
    whatsappInvitedAt: integer("whatsapp_invited_at", { mode: "timestamp_ms" }),
    showPhone: integer("show_phone", { mode: "boolean" }).notNull().default(false),
    showEmail: integer("show_email", { mode: "boolean" }).notNull().default(false),
    showLastSeen: integer("show_last_seen", { mode: "boolean" })
      .notNull()
      .default(false),
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
    approvedBy: text("approved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("member_profiles_code_unique").on(table.memberCode),
    index("member_profiles_status_idx").on(table.registrationStatus),
    index("member_profiles_department_idx").on(table.requestedDepartmentId),
  ],
);

export const departmentMembers = sqliteTable(
  "department_members",
  {
    id: text("id").primaryKey(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<DepartmentRole>().notNull().default("member"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [
    uniqueIndex("department_members_unique").on(
      table.departmentId,
      table.userId,
    ),
    index("department_members_user_idx").on(table.userId),
  ],
);

export const departmentLeaders = sqliteTable(
  "department_leaders",
  {
    id: text("id").primaryKey(),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    assignedBy: text("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    index("department_leaders_department_idx").on(table.departmentId),
    index("department_leaders_user_idx").on(table.userId),
  ],
);

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
  updatedBy: text("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const contentBlocks = sqliteTable(
  "content_blocks",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    imageKey: text("image_key"),
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(true),
    ...timestamps(),
  },
  (table) => [uniqueIndex("content_blocks_key_unique").on(table.key)],
);

export const slideshowImages = sqliteTable("slideshow_images", {
  id: text("id").primaryKey(),
  imageKey: text("image_key").notNull(),
  headline: text("headline"),
  subheadline: text("subheadline"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  day: text("day"),
  time: text("time"),
  venue: text("venue"),
  imageKey: text("image_key"),
  extraInfo: text("extra_info"),
  location: text("location"),
  activityDate: integer("activity_date", { mode: "timestamp_ms" }),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(true),
  ...timestamps(),
});

export const faqs = sqliteTable("faqs", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const mediaLibrary = sqliteTable("media_library", {
  id: text("id").primaryKey(),
  key: text("key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  altText: text("alt_text"),
  uploadedBy: text("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    location: text("location"),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }),
    coverKey: text("cover_key"),
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(true),
    ...timestamps(),
  },
  (table) => [uniqueIndex("events_slug_unique").on(table.slug)],
);

export const eventDepartments = sqliteTable(
  "event_departments",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    departmentId: text("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.departmentId] }),
  ],
);

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").$type<AttendanceStatus>().notNull().default("present"),
    recordedBy: text("recorded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    recordedAt: integer("recorded_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [
    uniqueIndex("attendance_records_event_user_unique").on(
      table.eventId,
      table.userId,
    ),
    index("attendance_records_user_idx").on(table.userId),
  ],
);

export const attendanceSubmissions = sqliteTable("attendance_submissions", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  departmentId: text("department_id")
    .notNull()
    .references(() => departments.id, { onDelete: "cascade" }),
  submittedBy: text("submitted_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("submitted"),
  notes: text("notes"),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const attendanceAudit = sqliteTable("attendance_audit", {
  id: text("id").primaryKey(),
  attendanceId: text("attendance_id").references(() => attendanceRecords.id, {
    onDelete: "cascade",
  }),
  action: text("action").notNull(),
  actorId: text("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  details: text("details"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const sermons = sqliteTable("sermons", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  speaker: text("speaker"),
  preachedAt: integer("preached_at", { mode: "timestamp_ms" }),
  summary: text("summary"),
  audioUrl: text("audio_url"),
  videoUrl: text("video_url"),
  notes: text("notes"),
  isPublished: integer("is_published", { mode: "boolean" })
    .notNull()
    .default(true),
  ...timestamps(),
});

export const devotionalPlans = sqliteTable("devotional_plans", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const devotionals = sqliteTable(
  "devotionals",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id").references(() => devotionalPlans.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    scripture: text("scripture"),
    publishDate: text("publish_date").notNull(),
    isPublished: integer("is_published", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [uniqueIndex("devotionals_date_unique").on(table.publishDate)],
);

export const aiSettings = sqliteTable("ai_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  type: text("type").notNull().default("direct"),
  title: text("title"),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(now),
});

export const conversationParticipants = sqliteTable(
  "conversation_participants",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
    lastReadAt: integer("last_read_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    uniqueIndex("conversation_participants_unique").on(
      table.conversationId,
      table.userId,
    ),
    index("conversation_participants_user_idx").on(table.userId),
  ],
);

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [index("messages_conversation_idx").on(table.conversationId)],
);

export const messageReads = sqliteTable(
  "message_reads",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    readAt: integer("read_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [
    uniqueIndex("message_reads_unique").on(table.messageId, table.userId),
  ],
);

export const appointments = sqliteTable(
  "appointments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    requestedBy: text("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    fullName: text("full_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    title: text("title").notNull(),
    notes: text("notes"),
    preferredDate: text("preferred_date").notNull().default(""),
    preferredTime: text("preferred_time").notNull().default(""),
    slotKey: text("slot_key"),
    suggestedDate: text("suggested_date"),
    suggestedTime: text("suggested_time"),
    adminNote: text("admin_note"),
    handledBy: text("handled_by").references(() => users.id, {
      onDelete: "set null",
    }),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
    status: text("status")
      .$type<AppointmentStatus>()
      .notNull()
      .default("pending"),
    ...timestamps(),
  },
  (table) => [
    index("appointments_status_idx").on(table.status),
    index("appointments_date_idx").on(table.preferredDate),
    uniqueIndex("appointments_confirmed_slot_unique")
      .on(table.slotKey)
      .where(
        sql`${table.status} = 'confirmed' AND ${table.slotKey} IS NOT NULL`,
      ),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_user_read_idx").on(table.userId, table.isRead),
  ],
);

export const notificationPreferences = sqliteTable(
  "notification_preferences",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    inApp: integer("in_app", { mode: "boolean" }).notNull().default(true),
    email: integer("email", { mode: "boolean" }).notNull().default(false),
    whatsapp: integer("whatsapp", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("notification_preferences_unique").on(
      table.userId,
      table.type,
    ),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: text("details"),
    ipAddress: text("ip_address"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(now),
  },
  (table) => [
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: integer("window_start", { mode: "timestamp_ms" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export type User = typeof users.$inferSelect;
export type MemberProfile = typeof memberProfiles.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
