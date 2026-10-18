import sqlite3
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "drizzle"


def apply_sql(connection: sqlite3.Connection, path: Path) -> None:
    sql = path.read_text(encoding="utf-8").replace("--> statement-breakpoint", "")
    connection.executescript(sql)


class MeasurementSchemaTests(unittest.TestCase):
    def setUp(self):
        self.connection = sqlite3.connect(":memory:")
        self.connection.execute("PRAGMA foreign_keys = ON")
        for name in (
            "0000_p0_foundation.sql",
            "0001_edge_agent_and_policies.sql",
            "0002_sensor_configs_and_reading_ids.sql",
            "0003_supabase_storage_images.sql",
        ):
            apply_sql(self.connection, MIGRATIONS / name)
        self.connection.execute("INSERT INTO greenhouses VALUES (?, ?, ?, ?)", ("GH-01", "Greenhouse 1", "Asia/Bangkok", "2026-01-01T00:00:00Z"))
        self.connection.execute("INSERT INTO edge_agents VALUES (?, ?, ?, ?, ?, ?)", ("PI-GH-01", "GH-01", "Pi 1", "offline", None, "2026-01-01T00:00:00Z"))
        self.connection.execute("INSERT INTO devices (id, greenhouse_id, agent_id, name, category, capabilities_json, reported_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ("SEN-ESP32-01-TEMP", "GH-01", "PI-GH-01", "Legacy temp", "sensor", "{}", "offline", "2026-01-01T00:00:00Z"))
        self.connection.execute("INSERT INTO sensor_configs (sensor_id, greenhouse_id, name, metric, unit, sampling_interval_seconds, calibration_scale, calibration_offset, enabled, config_version, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ("SEN-ESP32-01-TEMP", "GH-01", "Legacy temp", "temperature", "celsius", 30, "1", "0", 1, 1, "admin", "admin", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))
        self.connection.execute("INSERT INTO sensor_readings (id, greenhouse_id, sensor_id, metric, value, unit, sampled_at, received_at, quality, reading_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ("reading-1", "GH-01", "SEN-ESP32-01-TEMP", "temperature", "24", "celsius", "2026-01-01T00:00:00Z", "2026-01-01T00:00:01Z", "valid", "reading-1"))
        apply_sql(self.connection, MIGRATIONS / "0004_dual_measurement_points_and_plant_assignments.sql")

    def tearDown(self):
        self.connection.close()

    def test_keeps_legacy_sensor_identity_and_readings(self):
        reading = self.connection.execute("SELECT sensor_id, value FROM sensor_readings WHERE id = 'reading-1'").fetchone()
        config = self.connection.execute("SELECT sensor_id, measurement_point_id FROM sensor_configs").fetchone()
        self.assertEqual(reading, ("SEN-ESP32-01-TEMP", "24"))
        self.assertEqual(config, ("SEN-ESP32-01-TEMP", None))

    def test_supports_a_b_points_and_multiple_channels_per_point(self):
        self.connection.execute("INSERT INTO devices (id, greenhouse_id, agent_id, name, category, capabilities_json, reported_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ("ESP32-01", "GH-01", "PI-GH-01", "ESP32-01", "sensor-node", '{"sensorNode":true}', "offline", "2026-01-01T00:00:00Z"))
        for port in ("A", "B"):
            self.connection.execute("INSERT INTO measurement_points (id, greenhouse_id, device_id, port_key, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (f"ESP32-01-{port}", "GH-01", "ESP32-01", port, f"Point {port}", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))
        self.connection.execute("UPDATE sensor_configs SET measurement_point_id = 'ESP32-01-A' WHERE sensor_id = 'SEN-ESP32-01-TEMP'")
        self.connection.execute("INSERT INTO devices (id, greenhouse_id, agent_id, name, category, capabilities_json, reported_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ("SEN-ESP32-01-A-HUM", "GH-01", "PI-GH-01", "Humidity A", "sensor", '{"sensor":true}', "offline", "2026-01-01T00:00:00Z"))
        self.connection.execute("INSERT INTO sensor_configs (sensor_id, greenhouse_id, name, metric, unit, measurement_point_id, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ("SEN-ESP32-01-A-HUM", "GH-01", "Humidity A", "humidity", "percent", "ESP32-01-A", "admin", "admin", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))
        self.assertEqual(self.connection.execute("SELECT COUNT(*) FROM sensor_configs WHERE measurement_point_id = 'ESP32-01-A'").fetchone()[0], 2)

    def test_active_assignments_and_metric_links_are_unique(self):
        self.connection.execute("INSERT INTO devices (id, greenhouse_id, agent_id, name, category, capabilities_json, reported_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ("ESP32-01", "GH-01", "PI-GH-01", "ESP32-01", "sensor-node", '{"sensorNode":true}', "offline", "2026-01-01T00:00:00Z"))
        for port in ("A", "B"):
            self.connection.execute("INSERT INTO measurement_points (id, greenhouse_id, device_id, port_key, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", (f"ESP32-01-{port}", "GH-01", "ESP32-01", port, f"Point {port}", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))
        self.connection.execute("INSERT INTO plants VALUES (?, ?, ?, ?, ?, ?)", ("PLANT-01", "GH-01", "Plant 1", "active", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))
        self.connection.execute("INSERT INTO plant_assignments (id, greenhouse_id, point_id, plant_id, assigned_at, assigned_by) VALUES (?, ?, ?, ?, ?, ?)", ("assignment-1", "GH-01", "ESP32-01-A", "PLANT-01", "2026-01-01T00:00:00Z", "admin"))
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute("INSERT INTO plant_assignments (id, greenhouse_id, point_id, plant_id, assigned_at, assigned_by) VALUES (?, ?, ?, ?, ?, ?)", ("assignment-2", "GH-01", "ESP32-01-A", "PLANT-01", "2026-01-02T00:00:00Z", "admin"))
        self.connection.execute("INSERT INTO sensor_configs (sensor_id, greenhouse_id, name, metric, unit, measurement_point_id, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ("SEN-ESP32-01-A-NEW", "GH-01", "Duplicate temp", "temperature", "celsius", "ESP32-01-A", "admin", "admin", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute("INSERT INTO sensor_configs (sensor_id, greenhouse_id, name, metric, unit, measurement_point_id, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ("SEN-ESP32-01-A-OTHER", "GH-01", "Duplicate temp 2", "temperature", "celsius", "ESP32-01-A", "admin", "admin", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))

    def test_channel_cannot_link_to_point_in_another_greenhouse(self):
        self.connection.execute("INSERT INTO greenhouses VALUES (?, ?, ?, ?)", ("GH-02", "Greenhouse 2", "Asia/Bangkok", "2026-01-01T00:00:00Z"))
        self.connection.execute("INSERT INTO devices (id, greenhouse_id, agent_id, name, category, capabilities_json, reported_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", ("ESP32-01", "GH-01", "PI-GH-01", "ESP32-01", "sensor-node", "{}", "offline", "2026-01-01T00:00:00Z"))
        self.connection.execute("INSERT INTO measurement_points (id, greenhouse_id, device_id, port_key, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", ("ESP32-01-A", "GH-01", "ESP32-01", "A", "Point A", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))
        with self.assertRaises(sqlite3.IntegrityError):
            self.connection.execute("INSERT INTO sensor_configs (sensor_id, greenhouse_id, name, metric, unit, measurement_point_id, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", ("SEN-CROSS-GH", "GH-02", "Cross greenhouse", "temperature", "celsius", "ESP32-01-A", "admin", "admin", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"))


if __name__ == "__main__":
    unittest.main()
