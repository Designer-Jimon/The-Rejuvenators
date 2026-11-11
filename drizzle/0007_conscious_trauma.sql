ALTER TABLE `devotionals` ADD `notify_members` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `devotionals` ADD `show_on_home` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `devotionals` ADD `archived_at` integer;