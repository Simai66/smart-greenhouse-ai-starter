import importlib.util
import os
import pathlib
import sys
import tempfile
import unittest
from datetime import timedelta


MODULE_PATH = pathlib.Path(__file__).with_name("greenhouse_agent.py")
SPEC = importlib.util.spec_from_file_location("greenhouse_agent", MODULE_PATH)
assert SPEC and SPEC.loader
agent_module = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = agent_module
SPEC.loader.exec_module(agent_module)


class EdgeAgentTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        agent_module.STATE_DIR = pathlib.Path(self.tempdir.name)
        agent_module.GREENHOUSE_ID = "GH-01"
        agent_module.AGENT_ID = "PI-GH-01"
        agent_module.AGENT_SECRET = "x" * 40
        self.agent = agent_module.Agent()
        self.agent.node_tokens = {"ESP32-01": "lan-token"}
        self.agent.node_sensors = {"ESP32-01": {"SEN-01"}}
        self.agent.store.save_sensor_config({
            "sensorId": "SEN-01",
            "name": "Temperature",
            "metric": "temperature",
            "unit": "celsius",
            "configVersion": 3,
            "enabled": True,
        })

    def tearDown(self) -> None:
        self.agent.store.db.close()
        self.tempdir.cleanup()

    def test_fixture_image_queues_offline_and_flushes_after_reconnect(self):
        fixture = pathlib.Path(self.tempdir.name) / "fixture.jpg"
        fixture.write_bytes(b"fixture-jpeg")
        previous_fixture = agent_module.CAPTURE_FIXTURE
        previous_command = agent_module.CAPTURE_COMMAND
        previous_interval = agent_module.CAPTURE_INTERVAL_SECONDS
        agent_module.CAPTURE_FIXTURE = str(fixture)
        agent_module.CAPTURE_COMMAND = ""
        agent_module.CAPTURE_INTERVAL_SECONDS = 1
        try:
            def offline(*_args, **_kwargs):
                raise agent_module.urllib.error.URLError("offline")

            self.agent.cloud.upload_image = offline
            self.agent.capture_once(force=True)
            queued = self.agent.store.queued()
            self.assertEqual(len(queued), 1)
            local_path = pathlib.Path(queued[0][2]["localPath"])
            self.assertTrue(local_path.exists())

            uploaded = []
            self.agent.cloud.upload_image = lambda path, metadata, detections: uploaded.append((path, metadata, detections)) or {"status": "ready"}
            self.agent.flush_queue()
            self.assertEqual(uploaded[0][1]["cameraId"], "CAM-A-01")
            self.assertEqual(self.agent.store.queued(), [])
            self.assertFalse(local_path.exists())
        finally:
            agent_module.CAPTURE_FIXTURE = previous_fixture
            agent_module.CAPTURE_COMMAND = previous_command
            agent_module.CAPTURE_INTERVAL_SECONDS = previous_interval

    def reading(self, **changes):
        value = {
            "readingId": "ESP32-01-SEN-01-1",
            "sensorId": "SEN-01",
            "metric": "temperature",
            "value": 28.5,
            "unit": "celsius",
            "sampledAt": agent_module.iso(),
            "quality": "valid",
            "configVersion": 3,
        }
        value.update(changes)
        return value

    def test_node_auth_and_sensor_allow_list(self):
        self.assertTrue(self.agent.authenticate_node("ESP32-01", "lan-token"))
        self.assertFalse(self.agent.authenticate_node("ESP32-01", "wrong"))
        self.assertFalse(self.agent.authenticate_node("ESP32-02", "lan-token"))
        result, error, status = self.agent.validate_local_telemetry("ESP32-01", {"nodeId": "ESP32-01", "readings": [self.reading(sensorId="SEN-02")]})
        self.assertIsNone(result)
        self.assertEqual(status, 403)
        self.assertIn("unregistered", error or "")

    def test_local_queue_deduplicates_and_survives_restart(self):
        payload = {"nodeId": "ESP32-01", "readings": [self.reading()]}
        result, error, status = self.agent.validate_local_telemetry("ESP32-01", payload)
        self.assertEqual((error, status), (None, 202))
        self.assertEqual(result["accepted"], 1)
        self.assertEqual(len(self.agent.store.queued()), 1)

        result, error, status = self.agent.validate_local_telemetry("ESP32-01", payload)
        self.assertEqual((error, status), (None, 202))
        self.assertEqual(result["accepted"], 0)
        self.assertEqual(result["duplicates"], 1)
        self.assertEqual(len(self.agent.store.queued()), 1)

        self.agent.store.db.close()
        restarted = agent_module.Agent()
        restarted.node_tokens = {"ESP32-01": "lan-token"}
        restarted.node_sensors = {"ESP32-01": {"SEN-01"}}
        result, error, status = restarted.validate_local_telemetry("ESP32-01", payload)
        self.assertEqual((error, status), (None, 202))
        self.assertEqual(result["accepted"], 0)
        restarted.store.db.close()

    def test_rejects_stale_and_invalid_quality_value(self):
        stale = agent_module.iso(agent_module.now() - timedelta(hours=25))
        result, error, status = self.agent.validate_local_telemetry("ESP32-01", {"nodeId": "ESP32-01", "readings": [self.reading(sampledAt=stale)]})
        self.assertIsNone(result)
        self.assertEqual(status, 400)
        result, error, status = self.agent.validate_local_telemetry("ESP32-01", {"nodeId": "ESP32-01", "readings": [self.reading(value=float("nan"), quality="invalid")]})
        self.assertIsNone(result)
        self.assertEqual(status, 400)

    def test_config_cache_keeps_newer_version(self):
        self.agent.store.save_sensor_config({"sensorId": "SEN-01", "metric": "temperature", "unit": "celsius", "configVersion": 4, "enabled": False})
        self.agent.store.save_sensor_config({"sensorId": "SEN-01", "metric": "temperature", "unit": "celsius", "configVersion": 3, "enabled": True})
        self.assertEqual(self.agent.store.sensor_config("SEN-01")["configVersion"], 4)
        self.assertFalse(self.agent.store.sensor_config("SEN-01")["enabled"])

    def test_simulator_can_be_disabled_without_emitting_invalid_readings(self):
        previous = os.environ.get("GREENHOUSE_SIMULATED_READINGS")
        os.environ["GREENHOUSE_SIMULATED_READINGS"] = "disabled"
        try:
            self.assertEqual(self.agent.sensors.readings(self.agent.store.sensor_configs()), [])
        finally:
            if previous is None:
                os.environ.pop("GREENHOUSE_SIMULATED_READINGS", None)
            else:
                os.environ["GREENHOUSE_SIMULATED_READINGS"] = previous


if __name__ == "__main__":
    unittest.main()
