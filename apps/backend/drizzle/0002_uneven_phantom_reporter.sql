CREATE TABLE `interview_message` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'complete' NOT NULL,
	`source_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`interview_id`) REFERENCES `interview_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_source_unique` ON `interview_message` (`interview_id`,`source_key`);--> statement-breakpoint
CREATE INDEX `message_interview_idx` ON `interview_message` (`interview_id`);--> statement-breakpoint
ALTER TABLE `interview_session` ADD `settings` text DEFAULT '{"role":"Full-stack","level":"Mid-level","topics":["JavaScript"],"duration":20}' NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `started_at` integer;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `ended_at` integer;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `feedback_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `feedback` text;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `feedback_model` text;