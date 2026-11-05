PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`requested_by` text,
	`full_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`preferred_date` text DEFAULT '' NOT NULL,
	`preferred_time` text DEFAULT '' NOT NULL,
	`slot_key` text,
	`suggested_date` text,
	`suggested_time` text,
	`admin_note` text,
	`handled_by` text,
	`scheduled_at` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`handled_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_appointments`("id", "user_id", "requested_by", "full_name", "phone", "email", "title", "notes", "preferred_date", "preferred_time", "slot_key", "suggested_date", "suggested_time", "admin_note", "handled_by", "scheduled_at", "status", "created_at", "updated_at") SELECT "id", "user_id", "requested_by", COALESCE((SELECT "name" FROM "users" WHERE "users"."id" = "appointments"."user_id"), ''), COALESCE((SELECT "phone" FROM "users" WHERE "users"."id" = "appointments"."user_id"), ''), COALESCE((SELECT "email" FROM "users" WHERE "users"."id" = "appointments"."user_id"), ''), "title", "notes", COALESCE(strftime('%Y-%m-%d', "scheduled_at" / 1000, 'unixepoch'), ''), COALESCE(strftime('%H:%M', "scheduled_at" / 1000, 'unixepoch'), ''), CASE WHEN "scheduled_at" IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M', "scheduled_at" / 1000, 'unixepoch') END, NULL, NULL, NULL, NULL, "scheduled_at", "status", "created_at", "updated_at" FROM `appointments`;--> statement-breakpoint
DROP TABLE `appointments`;--> statement-breakpoint
ALTER TABLE `__new_appointments` RENAME TO `appointments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `appointments_status_idx` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `appointments_date_idx` ON `appointments` (`preferred_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `appointments_confirmed_slot_unique` ON `appointments` (`slot_key`) WHERE "appointments"."status" = 'confirmed' AND "appointments"."slot_key" IS NOT NULL;--> statement-breakpoint
INSERT OR IGNORE INTO `permissions` (`id`, `key`, `description`, `created_at`) VALUES ('perm_appointment_manage', 'appointment.manage', 'Manage pastoral appointments and availability', unixepoch() * 1000);--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT 'role_membership_admin', 'perm_appointment_manage' WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 'role_membership_admin');--> statement-breakpoint
INSERT OR IGNORE INTO `role_permissions` (`role_id`, `permission_id`) SELECT 'role_super_admin', 'perm_appointment_manage' WHERE EXISTS (SELECT 1 FROM `roles` WHERE `id` = 'role_super_admin');--> statement-breakpoint
INSERT INTO `site_settings` (`key`, `value`, `updated_at`) VALUES ('appointment_days', '1,2,3,4,5', unixepoch() * 1000) ON CONFLICT(`key`) DO NOTHING;--> statement-breakpoint
INSERT INTO `site_settings` (`key`, `value`, `updated_at`) VALUES ('appointment_start', '09:00', unixepoch() * 1000) ON CONFLICT(`key`) DO NOTHING;--> statement-breakpoint
INSERT INTO `site_settings` (`key`, `value`, `updated_at`) VALUES ('appointment_end', '17:00', unixepoch() * 1000) ON CONFLICT(`key`) DO NOTHING;--> statement-breakpoint
INSERT INTO `site_settings` (`key`, `value`, `updated_at`) VALUES ('appointment_slot_minutes', '30', unixepoch() * 1000) ON CONFLICT(`key`) DO NOTHING;