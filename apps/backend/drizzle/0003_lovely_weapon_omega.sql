CREATE TABLE `user_profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`details` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Existing members keep their workspace; they can add a profile from Settings.
INSERT INTO user_profile (user_id, details, status, completed_at, updated_at)
SELECT id, json_object('name', name, 'headline', '', 'location', '', 'role', '', 'level', '', 'stack', json('[]'), 'githubUrl', '', 'linkedinUrl', '', 'portfolioUrl', '', 'goal', ''), 'skipped', unixepoch() * 1000, unixepoch() * 1000 FROM user;
