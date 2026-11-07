DROP INDEX `messages_conversation_idx`;--> statement-breakpoint
ALTER TABLE `messages` ADD `kind` text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE `messages` ADD `reply_to_id` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_key` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_name` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_type` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_size` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `edited_at` integer;--> statement-breakpoint
ALTER TABLE `messages` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `pair_key` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `department_id` text REFERENCES departments(id);--> statement-breakpoint
ALTER TABLE `conversations` ADD `last_message_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_pair_unique` ON `conversations` (`pair_key`) WHERE "conversations"."pair_key" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_department_unique` ON `conversations` (`department_id`) WHERE "conversations"."department_id" IS NOT NULL;