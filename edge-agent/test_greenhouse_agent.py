import importlib.util
import io
import json
import os
import pathlib
import sys
import tempfile
import unittest
from datetime import timedelta
from unittest.mock import MagicMock, patch


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

    def test_capture_retains_transient_http_failures_and_discards_invalid_uploads(self):
        for status in (408, 429, 503, 400):
            with self.subTest(status=status):
                image = pathlib.Path(self.tempdir.name) / f"capture-{status}.jpg"
                image.write_bytes(b"jpeg")
                failure = agent_module.urllib.error.HTTPError("https://storage.invalid", status, "failure", {}, None)
                self.addCleanup(failure.close)
                with patch.object(self.agent.camera, "capture", return_value=(image, "image/jpeg")), patch.object(self.agent.camera, "detections", return_value=[]), patch.object(self.agent.cloud, "upload_image", side_effect=failure):
                    self.agent.capture_once(force=True)
                if status == 400:
                    self.assertFalse(image.exists())
                    self.assertEqual(self.agent.store.queued(), [])
                else:
                    self.assertTrue(image.exists())
                    self.assertEqual(len(self.agent.store.queued()), 1)
                    with patch.object(self.agent.cloud, "upload_image", return_value={"status": "ready"}):
                        self.agent.flush_queue()
                    self.assertFalse(image.exists())
                    self.assertEqual(self.agent.store.queued(), [])

    def test_upload_retries_resume_same_image_after_lost_response_and_restart(self):
        for lost_at in ("reservation", "put", "complete", "detections"):
            with self.subTest(lost_at=lost_at):
                image = pathlib.Path(self.tempdir.name) / f"{lost_at}.jpg"
                image.write_bytes(b"jpeg")
                metadata = {"greenhouseId": "GH-01", "cameraId": "CAM-A-01", "contentType": "image/jpeg", "byteSize": 4, "capturedAt": "2026-09-25T00:00:00.000Z"}
                results = [{"plantId": "PLANT-01", "classification": "healthy", "confidence": 98, "severity": "none"}]
                self.agent.store.queue_image(image, metadata, results)
                queued_id = self.agent.store.queued()[0][2]["metadata"]["imageId"]
                server = {"status": "pending", "object": False, "lost": False}
                reservations, put_calls, detection_calls = [], [], []

                def lose(stage):
                    if stage == lost_at and not server["lost"]:
                        server["lost"] = True
                        raise TimeoutError("response lost after server commit")

                def signed(route, method="GET", body=None):
                    if route.endswith("/upload-url"):
                        self.assertEqual(body["imageId"], queued_id)
                        reservations.append(body["imageId"])
                        lose("reservation")
                        return {"imageId": queued_id, "status": server["status"], "uploadUrl": "https://storage.invalid/upload"}
                    self.assertEqual(body["imageId"], queued_id)
                    if route.endswith("/complete"):
                        if not server["object"]:
                            error = agent_module.urllib.error.HTTPError("https://api.invalid", 409, "missing", {}, io.BytesIO(b'{"error":{"code":"UPLOAD_NOT_FOUND"}}'))
                            self.addCleanup(error.close)
                            raise error
                        server["status"] = "ready"
                        lose("complete")
                        return {"imageId": queued_id, "status": "ready"}
                    self.assertTrue(route.endswith("/detections"))
                    detection_calls.append(json.dumps(body, sort_keys=True))
                    lose("detections")
                    return {"insertedCount": 1}

                def put(request, **kwargs):
                    put_calls.append(request.full_url)
                    server["object"] = True
                    lose("put")
                    return MagicMock()

                with patch.object(agent_module.CloudClient, "signed_request", side_effect=signed), patch.object(agent_module.urllib.request, "urlopen", side_effect=put):
                    self.agent.flush_queue()
                    self.assertTrue(image.exists())
                    self.assertEqual(len(self.agent.store.queued()), 1)
                    self.agent.store.db.close()
                    self.agent = agent_module.Agent()
                    self.agent.flush_queue()
                self.assertEqual(self.agent.store.queued(), [])
                self.assertFalse(image.exists())
                self.assertEqual(len(reservations), 2)
                self.assertEqual(len(set(reservations)), 1)
                self.assertEqual(len(put_calls), 1)
                self.assertEqual(len(set(detection_calls)), 1)
                self.assertEqual(len(detection_calls), 2 if lost_at == "detections" else 1)

    def test_legacy_image_queue_persists_id_before_network_request(self):
        image = pathlib.Path(self.tempdir.name) / "legacy.jpg"
        image.write_bytes(b"jpeg")
        self.agent.store.queue(agent_module.IMAGE_QUEUE_PATH, {"localPath": str(image), "metadata": {"capturedAt": agent_module.iso()}, "detections": []})
        def offline(path, metadata, detections):
            self.assertEqual(metadata["imageId"], self.agent.store.queued()[0][2]["metadata"]["imageId"])
            raise TimeoutError("offline")
        with patch.object(self.agent.cloud, "upload_image", side_effect=offline):
            self.agent.flush_queue()
            first_id = self.agent.store.queued()[0][2]["metadata"]["imageId"]
            self.agent.flush_queue()
            self.assertEqual(self.agent.store.queued()[0][2]["metadata"]["imageId"], first_id)

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
