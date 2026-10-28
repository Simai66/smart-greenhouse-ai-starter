CREATE TABLE `agent_request_nonces` (
	`agent_id` text NOT NULL,
	`nonce` text NOT NULL,
	`expires_at` text NOT NULL,
	PRIMARY KEY(`agent_id`, `nonce`)
);
--> statement-breakpoint
CREATE INDEX `agent_request_nonces_expiry_idx` ON `agent_request_nonces` (`expires_at`);
