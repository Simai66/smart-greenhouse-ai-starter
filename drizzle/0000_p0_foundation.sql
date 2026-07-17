CREATE TABLE `greenhouses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`reported_status` text DEFAULT 'offline' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `devices_greenhouse_idx` ON `devices` (`greenhouse_id`);
--> statement-breakpoint
CREATE TABLE `sensor_readings` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`sensor_id` text NOT NULL,
	`metric` text NOT NULL,
	`value` text NOT NULL,
	`unit` text NOT NULL,
	`sampled_at` text NOT NULL,
	`received_at` text NOT NULL,
	`quality` text DEFAULT 'valid' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sensor_readings_greenhouse_sampled_idx` ON `sensor_readings` (`greenhouse_id`,`sampled_at`);
--> statement-breakpoint
CREATE INDEX `sensor_readings_sensor_sampled_idx` ON `sensor_readings` (`sensor_id`,`sampled_at`);
--> statement-breakpoint
CREATE TABLE `device_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`device_id` text NOT NULL,
	`action` text NOT NULL,
	`state` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`requested_by` text NOT NULL,
	`requested_at` text NOT NULL,
	`acknowledged_at` text,
	`failure_reason` text,
	UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE INDEX `device_commands_greenhouse_requested_idx` ON `device_commands` (`greenhouse_id`,`requested_at`);
--> statement-breakpoint
CREATE INDEX `device_commands_device_requested_idx` ON `device_commands` (`device_id`,`requested_at`);
--> statement-breakpoint
CREATE TABLE `device_command_events` (
	`id` text PRIMARY KEY NOT NULL,
	`command_id` text NOT NULL,
	`state` text NOT NULL,
	`occurred_at` text NOT NULL,
	`metadata_json` text
);
--> statement-breakpoint
CREATE INDEX `device_command_events_command_idx` ON `device_command_events` (`command_id`,`occurred_at`);
--> statement-breakpoint
CREATE TABLE `detections` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`plant_id` text NOT NULL,
	`image_key` text NOT NULL,
	`model_version` text NOT NULL,
	`classification` text NOT NULL,
	`confidence` text NOT NULL,
	`severity` text NOT NULL,
	`detected_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `alerts` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`source` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`opened_at` text NOT NULL,
	`resolved_at` text,
	`resolved_by` text
);
