import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * P0 domain storage. Times are ISO-8601 UTC strings so gateway sample time and
 * server receive time remain distinguishable when clocks drift or reconnect.
 */
export const greenhouses = sqliteTable("greenhouses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull(),
  createdAt: text("created_at").notNull(),
});

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  greenhouseId: text("greenhouse_id").notNull(),
  agentId: text("agent_id"),
  name: text("name").notNull(),
  category: text("category").notNull(),
  capabilitiesJson: text("capabilities_json").notNull().default("{}"),
  reportedStatus: text("reported_status").notNull().default("offline"),
  lastSeenAt: text("last_seen_at"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("devices_greenhouse_idx").on(table.greenhouseId)]);

export const edgeAgents = sqliteTable("edge_agents", {
  id: text("id").primaryKey(),
  greenhouseId: text("greenhouse_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("offline"),
  lastSeenAt: text("last_seen_at"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("edge_agents_greenhouse_idx").on(table.greenhouseId)]);

export const sensorReadings = sqliteTable("sensor_readings", {
  id: text("id").primaryKey(),
  readingId: text("reading_id"),
  greenhouseId: text("greenhouse_id").notNull(),
  sensorId: text("sensor_id").notNull(),
  metric: text("metric").notNull(),
  value: text("value").notNull(),
  unit: text("unit").notNull(),
  sampledAt: text("sampled_at").notNull(),
  receivedAt: text("received_at").notNull(),
  quality: text("quality").notNull().default("valid"),
  configVersion: integer("config_version"),
}, (table) => [
  index("sensor_readings_greenhouse_sampled_idx").on(table.greenhouseId, table.sampledAt),
  index("sensor_readings_sensor_sampled_idx").on(table.sensorId, table.sampledAt),
  uniqueIndex("sensor_readings_reading_id_unique").on(table.readingId),
]);

export const sensorConfigs = sqliteTable("sensor_configs", {
  sensorId: text("sensor_id").primaryKey(),
  greenhouseId: text("greenhouse_id").notNull(),
  name: text("name").notNull(),
  metric: text("metric").notNull(),
  unit: text("unit").notNull(),
  samplingIntervalSeconds: integer("sampling_interval_seconds").notNull().default(30),
  calibrationScale: text("calibration_scale").notNull().default("1"),
  calibrationOffset: text("calibration_offset").notNull().default("0"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  minThreshold: text("min_threshold"),
  maxThreshold: text("max_threshold"),
  configVersion: integer("config_version").notNull().default(1),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("sensor_configs_greenhouse_idx").on(table.greenhouseId),
  index("sensor_configs_greenhouse_enabled_idx").on(table.greenhouseId, table.enabled),
]);

export const deviceCommands = sqliteTable("device_commands", {
  id: text("id").primaryKey(),
  greenhouseId: text("greenhouse_id").notNull(),
  deviceId: text("device_id").notNull(),
  action: text("action").notNull(),
  state: text("state").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  requestedBy: text("requested_by").notNull(),
  requestedAt: text("requested_at").notNull(),
  correlationId: text("correlation_id"),
  expiresAt: text("expires_at"),
  maxRuntimeSeconds: integer("max_runtime_seconds"),
  dispatchedAt: text("dispatched_at"),
  acknowledgedAt: text("acknowledged_at"),
  failureReason: text("failure_reason"),
}, (table) => [
  index("device_commands_greenhouse_requested_idx").on(table.greenhouseId, table.requestedAt),
  index("device_commands_device_requested_idx").on(table.deviceId, table.requestedAt),
]);

export const deviceCommandEvents = sqliteTable("device_command_events", {
  id: text("id").primaryKey(),
  commandId: text("command_id").notNull(),
  state: text("state").notNull(),
  occurredAt: text("occurred_at").notNull(),
  metadataJson: text("metadata_json"),
}, (table) => [index("device_command_events_command_idx").on(table.commandId, table.occurredAt)]);

export const devicePolicies = sqliteTable("device_policies", {
  deviceId: text("device_id").primaryKey(),
  greenhouseId: text("greenhouse_id").notNull(),
  version: integer("version").notNull(),
  policyJson: text("policy_json").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("device_policies_greenhouse_idx").on(table.greenhouseId)]);

export const devicePolicyRevisions = sqliteTable("device_policy_revisions", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  version: integer("version").notNull(),
  policyJson: text("policy_json").notNull(),
  updatedBy: text("updated_by").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("device_policy_revisions_device_idx").on(table.deviceId, table.version),
]);

export const detections = sqliteTable("detections", {
  id: text("id").primaryKey(),
  greenhouseId: text("greenhouse_id").notNull(),
  plantId: text("plant_id").notNull(),
  imageKey: text("image_key").notNull(),
  modelVersion: text("model_version").notNull(),
  classification: text("classification").notNull(),
  confidence: text("confidence").notNull(),
  severity: text("severity").notNull(),
  detectedAt: text("detected_at").notNull(),
});

export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  greenhouseId: text("greenhouse_id").notNull(),
  source: text("source").notNull(),
  severity: text("severity").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("open"),
  openedAt: text("opened_at").notNull(),
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by"),
});
