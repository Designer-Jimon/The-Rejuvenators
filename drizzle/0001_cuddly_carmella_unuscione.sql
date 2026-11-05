ALTER TABLE `activities` ADD `day` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `time` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `venue` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `image_key` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `extra_info` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `departments` ADD `image_key` text;--> statement-breakpoint
ALTER TABLE `departments` ADD `activities` text;--> statement-breakpoint
ALTER TABLE `departments` ADD `head_of_unit` text;--> statement-breakpoint
ALTER TABLE `media_library` ADD `alt_text` text;--> statement-breakpoint
UPDATE `activities` SET `day`='Sunday', `time`='[Sunday service time - edit in Admin]', `venue`='[Church address - edit in Admin]', `location`='[Church address - edit in Admin]', `sort_order`=1 WHERE `id`='act_sunday_service' AND `day` IS NULL;--> statement-breakpoint
UPDATE `activities` SET `day`='[Day - edit in Admin]', `time`='[Time - edit in Admin]', `venue`='[Venue - edit in Admin]', `location`='[Venue - edit in Admin]', `sort_order`=2 WHERE `id`='act_rejuvenators_service' AND `day` IS NULL;--> statement-breakpoint
UPDATE `activities` SET `day`='[Day - edit in Admin]', `time`='[Time - edit in Admin]', `venue`='[Venue - edit in Admin]', `location`='[Venue - edit in Admin]', `sort_order`=3 WHERE `id`='act_prayer_meeting' AND `day` IS NULL;--> statement-breakpoint
UPDATE `activities` SET `day`='[Day - edit in Admin]', `time`='[Time - edit in Admin]', `venue`='[Venue - edit in Admin]', `location`='[Venue - edit in Admin]', `sort_order`=4 WHERE `id`='act_bible_study' AND `day` IS NULL;--> statement-breakpoint
UPDATE `activities` SET `day`='[Day - edit in Admin]', `time`='[Time - edit in Admin]', `venue`='[Venue - edit in Admin]', `location`='[Venue - edit in Admin]', `sort_order`=5 WHERE `id`='act_night_vigil' AND `day` IS NULL;--> statement-breakpoint
UPDATE `activities` SET `day`='[Dates - edit in Admin]', `time`='[Time - edit in Admin]', `venue`='[Venue - edit in Admin]', `location`='[Venue - edit in Admin]', `sort_order`=6 WHERE `id`='act_special_revival' AND `day` IS NULL;
