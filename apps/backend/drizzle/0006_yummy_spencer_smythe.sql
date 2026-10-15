ALTER TABLE `interview_session` ADD `paused_at` integer;--> statement-breakpoint
ALTER TABLE `interview_session` ADD `paused_ms` integer DEFAULT 0 NOT NULL;