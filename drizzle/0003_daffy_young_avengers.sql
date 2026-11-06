CREATE TABLE `devotional_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text,
	`sermon_id` text,
	`run_date` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`total_days` integer DEFAULT 0 NOT NULL,
	`completed_days` integer DEFAULT 0 NOT NULL,
	`trigger` text DEFAULT 'cron' NOT NULL,
	`triggered_by` text,
	`error` text,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`plan_id`) REFERENCES `devotional_plans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`sermon_id`) REFERENCES `sermons`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `devotional_runs_date_idx` ON `devotional_runs` (`run_date`);--> statement-breakpoint
CREATE INDEX `devotional_runs_status_idx` ON `devotional_runs` (`status`);--> statement-breakpoint
ALTER TABLE `attendance_submissions` ADD `present_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_submissions` ADD `absent_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `attendance_submissions` ADD `excused_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_submissions_event_department_unique` ON `attendance_submissions` (`event_id`,`department_id`);--> statement-breakpoint
CREATE INDEX `attendance_submissions_event_idx` ON `attendance_submissions` (`event_id`);--> statement-breakpoint
ALTER TABLE `devotional_plans` ADD `sermon_id` text REFERENCES sermons(id);--> statement-breakpoint
ALTER TABLE `devotional_plans` ADD `total_days` integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `devotional_plans` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `devotional_plans` ADD `auto_publish` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `devotional_plans` ADD `created_by` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `devotional_plans_status_idx` ON `devotional_plans` (`status`);--> statement-breakpoint
CREATE INDEX `devotional_plans_sermon_idx` ON `devotional_plans` (`sermon_id`);--> statement-breakpoint
ALTER TABLE `devotionals` ADD `source_sermon_id` text REFERENCES sermons(id);--> statement-breakpoint
ALTER TABLE `devotionals` ADD `day_number` integer;--> statement-breakpoint
ALTER TABLE `devotionals` ADD `bible_verses` text;--> statement-breakpoint
ALTER TABLE `devotionals` ADD `declaration` text;--> statement-breakpoint
ALTER TABLE `devotionals` ADD `prayer_points` text;--> statement-breakpoint
ALTER TABLE `devotionals` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `devotionals` ADD `generated_at` integer;--> statement-breakpoint
ALTER TABLE `devotionals` ADD `published_at` integer;--> statement-breakpoint
ALTER TABLE `devotionals` ADD `last_error` text;--> statement-breakpoint
CREATE INDEX `devotionals_status_idx` ON `devotionals` (`status`);--> statement-breakpoint
CREATE INDEX `devotionals_plan_idx` ON `devotionals` (`plan_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `category` text DEFAULT 'Other' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `instructions` text;--> statement-breakpoint
ALTER TABLE `sermons` ADD `bible_references` text;--> statement-breakpoint
ALTER TABLE `sermons` ADD `content_text` text;--> statement-breakpoint
ALTER TABLE `sermons` ADD `source_file_key` text;--> statement-breakpoint
ALTER TABLE `sermons` ADD `source_file_name` text;--> statement-breakpoint
ALTER TABLE `sermons` ADD `source_content_type` text;--> statement-breakpoint
ALTER TABLE `sermons` ADD `extraction_error` text;--> statement-breakpoint
ALTER TABLE `sermons` ADD `is_archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sermons` ADD `is_devotional_source` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `sermons_preached_at_idx` ON `sermons` (`preached_at`);--> statement-breakpoint
CREATE INDEX `sermons_archived_idx` ON `sermons` (`is_archived`);--> statement-breakpoint
CREATE INDEX `attendance_audit_attendance_idx` ON `attendance_audit` (`attendance_id`);--> statement-breakpoint
CREATE INDEX `attendance_audit_created_idx` ON `attendance_audit` (`created_at`);--> statement-breakpoint
CREATE INDEX `attendance_records_event_idx` ON `attendance_records` (`event_id`);