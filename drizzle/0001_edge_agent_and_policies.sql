ALTER TABLE `devices` ADD `agent_id` text;
--> statement-breakpoint
ALTER TABLE `devices` ADD `capabilities_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `devices` ADD `last_seen_at` text;
--> statement-breakpoint
CREATE TABLE `edge_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'offline' NOT NULL,
	`last_seen_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `edge_agents_greenhouse_idx` ON `edge_agents` (`greenhouse_id`);
--> statement-breakpoint
ALTER TABLE `device_commands` ADD `correlation_id` text;
--> statement-breakpoint
ALTER TABLE `device_commands` ADD `expires_at` text;
--> statement-breakpoint
ALTER TABLE `device_commands` ADD `max_runtime_seconds` integer;
--> statement-breakpoint
ALTER TABLE `device_commands` ADD `dispatched_at` text;
--> statement-breakpoint
CREATE TABLE `device_policies` (
	`device_id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`version` integer NOT NULL,
	`policy_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `device_policies_greenhouse_idx` ON `device_policies` (`greenhouse_id`);
--> statement-breakpoint
CREATE TABLE `device_policy_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text NOT NULL,
	`version` integer NOT NULL,
	`policy_json` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `device_policy_revisions_device_idx` ON `device_policy_revisions` (`device_id`,`version`);
