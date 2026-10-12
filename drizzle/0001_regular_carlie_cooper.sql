CREATE TABLE `dana_devices` (
	`user_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dana_devices_token_hash_unique` ON `dana_devices` (`token_hash`);--> statement-breakpoint
CREATE TABLE `dana_events` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`date` text NOT NULL,
	`message` text NOT NULL,
	`status` text NOT NULL,
	`received_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `event_id`)
);
