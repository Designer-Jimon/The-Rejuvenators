CREATE TABLE `event_centers` (
	`event_id` text NOT NULL,
	`center_id` text NOT NULL,
	PRIMARY KEY(`event_id`, `center_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`center_id`) REFERENCES `worship_centers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_centers_center_idx` ON `event_centers` (`center_id`);--> statement-breakpoint
CREATE TABLE `event_live_links` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_live_links_event_idx` ON `event_live_links` (`event_id`);--> statement-breakpoint
CREATE TABLE `event_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_sessions_event_idx` ON `event_sessions` (`event_id`);--> statement-breakpoint
CREATE TABLE `worship_centers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`country` text DEFAULT 'Nigeria',
	`phone` text,
	`email` text,
	`map_url` text,
	`photo_key` text,
	`service_times` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `worship_centers_slug_unique` ON `worship_centers` (`slug`);--> statement-breakpoint
CREATE INDEX `worship_centers_active_idx` ON `worship_centers` (`is_active`);--> statement-breakpoint
ALTER TABLE `department_leaders` ADD `center_id` text REFERENCES worship_centers(id);--> statement-breakpoint
ALTER TABLE `departments` ADD `icon_key` text;--> statement-breakpoint
ALTER TABLE `events` ADD `duration_days` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `show_on_home_popup` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `marital_status` text;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `country` text;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `state` text;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `lga` text;--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `worship_center_id` text REFERENCES worship_centers(id);--> statement-breakpoint
CREATE INDEX `member_profiles_center_idx` ON `member_profiles` (`worship_center_id`);