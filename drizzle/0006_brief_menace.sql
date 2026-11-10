CREATE TABLE `chat_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`message_id` text,
	`reporter_id` text,
	`reason` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolved_by` text,
	`resolved_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `chat_reports_status_idx` ON `chat_reports` (`status`);--> statement-breakpoint
CREATE INDEX `chat_reports_conversation_idx` ON `chat_reports` (`conversation_id`);--> statement-breakpoint
DROP INDEX `conversations_department_unique`;--> statement-breakpoint
ALTER TABLE `conversations` ADD `center_id` text REFERENCES worship_centers(id);--> statement-breakpoint
ALTER TABLE `conversations` ADD `is_archived` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `conversations` SET `is_archived` = 1 WHERE `type` = 'department' AND `center_id` IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_department_center_unique` ON `conversations` (`department_id`,`center_id`) WHERE "conversations"."department_id" IS NOT NULL AND "conversations"."center_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX `conversations_center_idx` ON `conversations` (`center_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `chat_muted_until` integer;