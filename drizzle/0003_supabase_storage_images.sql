ALTER TABLE `detections` ADD `image_id` text;
--> statement-breakpoint
CREATE INDEX `detections_image_idx` ON `detections` (`image_id`);
--> statement-breakpoint
CREATE TABLE `inspection_images` (
	`id` text PRIMARY KEY NOT NULL,
	`greenhouse_id` text NOT NULL,
	`source` text NOT NULL,
	`camera_id` text,
	`plant_id` text,
	`bucket` text NOT NULL,
	`object_path` text NOT NULL,
	`public_url` text,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`captured_at` text,
	`uploaded_at` text,
	`expires_at` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`expired_at` text,
	UNIQUE(`object_path`)
);
--> statement-breakpoint
CREATE INDEX `inspection_images_greenhouse_created_idx` ON `inspection_images` (`greenhouse_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `inspection_images_greenhouse_camera_idx` ON `inspection_images` (`greenhouse_id`,`camera_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `inspection_images_expiry_idx` ON `inspection_images` (`status`,`expires_at`);
