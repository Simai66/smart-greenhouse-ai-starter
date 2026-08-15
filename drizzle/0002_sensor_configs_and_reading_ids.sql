CREATE TABLE `sensor_configs` (
	`sensor_id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`name` text NOT NULL,
	`metric` text NOT NULL,
	`unit` text NOT NULL,
	`sampling_interval_seconds` integer DEFAULT 30 NOT NULL,
	`calibration_scale` text DEFAULT '1' NOT NULL,
	`calibration_offset` text DEFAULT '0' NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`min_threshold` text,
	`max_threshold` text,
	`config_version` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sensor_configs_greenhouse_idx` ON `sensor_configs` (`greenhouse_id`);
--> statement-breakpoint
CREATE INDEX `sensor_configs_greenhouse_enabled_idx` ON `sensor_configs` (`greenhouse_id`,`enabled`);
--> statement-breakpoint
ALTER TABLE `sensor_readings` ADD `reading_id` text;
--> statement-breakpoint
ALTER TABLE `sensor_readings` ADD `config_version` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `sensor_readings_reading_id_unique` ON `sensor_readings` (`reading_id`);
