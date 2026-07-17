import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  name: text("name").notNull(),
  category: text("category").notNull(),
  reportedStatus: text("reported_status").notNull().default("offline"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("devices_greenhouse_idx").on(table.greenhouseId)]);

export const sensorReadings = sqliteTable("sensor_readings", {
  id: text("id").primaryKey(),
  greenhouseId: text("greenhouse_id").notNull(),
  sensorId: text("sensor_id").notNull(),
  metric: text("metric").notNull(),
  value: text("value").notNull(),
  unit: text("unit").notNull(),
  sampledAt: text("sampled_at").notNull(),
  receivedAt: text("received_at").notNull(),
  quality: text("quality").notNull().default("valid"),
}, (table) => [
  index("sensor_readings_greenhouse_sampled_idx").on(table.greenhouseId, table.sampledAt),
  index("sensor_readings_sensor_sampled_idx").on(table.sensorId, table.sampledAt),
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
