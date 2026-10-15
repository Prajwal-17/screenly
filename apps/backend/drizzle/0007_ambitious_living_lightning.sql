ALTER TABLE `interview_message` ADD `phase` text DEFAULT 'questions' NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `phase` text DEFAULT 'questions' NOT NULL;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `candidate` text;