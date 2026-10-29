CREATE TABLE `practice_finding` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_interview_id` text NOT NULL,
	`source_review_version` text NOT NULL,
	`role` text NOT NULL,
	`criterion_id` text NOT NULL,
	`observation` text NOT NULL,
	`practice_focus` text NOT NULL,
	`evidence` text NOT NULL,
	`created_at` integer NOT NULL,
	`dismissed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_interview_id`) REFERENCES `interview_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `practice_finding_owner_idx` ON `practice_finding` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `practice_finding_source_idx` ON `practice_finding` (`source_interview_id`);--> statement-breakpoint
ALTER TABLE `interview_session` ADD `preparation` text;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `review` text;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `events` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `control` text;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `review_claim` text;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `review_claimed_at` integer;