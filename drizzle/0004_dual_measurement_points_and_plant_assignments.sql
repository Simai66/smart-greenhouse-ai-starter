CREATE UNIQUE INDEX `devices_id_greenhouse_unique` ON `devices` (`id`, `greenhouse_id`);
--> statement-breakpoint
ALTER TABLE `devices` ADD `assignment_version` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `devices` ADD `last_assignment_request_id` text;
--> statement-breakpoint
CREATE TABLE `plants` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`display_name` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	UNIQUE(`id`, `greenhouse_id`),
	FOREIGN KEY (`greenhouse_id`) REFERENCES `greenhouses`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `plants_greenhouse_status_idx` ON `plants` (`greenhouse_id`, `status`);
--> statement-breakpoint
CREATE TABLE `measurement_points` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`device_id` text NOT NULL,
	`port_key` text NOT NULL CHECK (`port_key` IN ('A', 'B')),
	`display_name` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL CHECK (`enabled` IN (0, 1)),
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	UNIQUE(`id`, `greenhouse_id`),
	UNIQUE(`device_id`, `port_key`),
	FOREIGN KEY (`device_id`, `greenhouse_id`) REFERENCES `devices`(`id`, `greenhouse_id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `measurement_points_greenhouse_device_idx` ON `measurement_points` (`greenhouse_id`, `device_id`);
--> statement-breakpoint
CREATE TABLE `plant_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`point_id` text NOT NULL,
	`plant_id` text NOT NULL,
	`assigned_at` text NOT NULL,
	`unassigned_at` text,
	`assigned_by` text NOT NULL,
	`reason` text,
	FOREIGN KEY (`point_id`, `greenhouse_id`) REFERENCES `measurement_points`(`id`, `greenhouse_id`) ON DELETE RESTRICT,
	FOREIGN KEY (`plant_id`, `greenhouse_id`) REFERENCES `plants`(`id`, `greenhouse_id`) ON DELETE RESTRICT,
	CHECK (`unassigned_at` IS NULL OR `unassigned_at` >= `assigned_at`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plant_assignments_one_active_per_point_unique` ON `plant_assignments` (`point_id`) WHERE `unassigned_at` IS NULL;
--> statement-breakpoint
CREATE INDEX `plant_assignments_point_time_idx` ON `plant_assignments` (`point_id`, `assigned_at`);
--> statement-breakpoint
CREATE INDEX `plant_assignments_plant_time_idx` ON `plant_assignments` (`plant_id`, `assigned_at`);
--> statement-breakpoint
ALTER TABLE `sensor_configs` ADD `measurement_point_id` text REFERENCES `measurement_points`(`id`) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX `sensor_configs_measurement_point_idx` ON `sensor_configs` (`measurement_point_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `sensor_configs_point_metric_unique` ON `sensor_configs` (`measurement_point_id`, `metric`) WHERE `measurement_point_id` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER `sensor_configs_point_greenhouse_insert` BEFORE INSERT ON `sensor_configs`
WHEN NEW.`measurement_point_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `measurement_points` WHERE `id` = NEW.`measurement_point_id` AND `greenhouse_id` = NEW.`greenhouse_id`
)
BEGIN
	SELECT RAISE(ABORT, 'sensor measurement point must belong to the same greenhouse');
END;
--> statement-breakpoint
CREATE TRIGGER `sensor_configs_point_greenhouse_update` BEFORE UPDATE OF `measurement_point_id`, `greenhouse_id` ON `sensor_configs`
WHEN NEW.`measurement_point_id` IS NOT NULL AND NOT EXISTS (
	SELECT 1 FROM `measurement_points` WHERE `id` = NEW.`measurement_point_id` AND `greenhouse_id` = NEW.`greenhouse_id`
)
BEGIN
	SELECT RAISE(ABORT, 'sensor measurement point must belong to the same greenhouse');
END;
