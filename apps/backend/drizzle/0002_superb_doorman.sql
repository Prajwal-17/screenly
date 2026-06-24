CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`interview_session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`interview_session_id`) REFERENCES `interview_session`(`id`) ON UPDATE no action ON DELETE cascade
);
