#!/usr/bin/env python3
"""Fail-closed Raspberry Pi gateway for LAN sensor nodes and cloud telemetry.

Cloud requests use the per-agent HMAC secret. LAN requests use separate
per-node tokens, so an ESP32 never receives the cloud credential. Relay and
sensor drivers remain simulators until hardware commissioning supplies a
reviewed pin map and sensor adapter.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import math
import os
import re
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

API_URL = os.environ.get("GREENHOUSE_API_URL", "").rstrip("/")
AGENT_ID = os.environ.get("GREENHOUSE_AGENT_ID", "")
AGENT_SECRET = os.environ.get("GREENHOUSE_AGENT_SECRET", "")
GREENHOUSE_ID = os.environ.get("GREENHOUSE_ID", "")
STATE_DIR = Path(os.environ.get("GREENHOUSE_STATE_DIR", "/var/lib/greenhouse-agent"))
POLL_SECONDS = max(5, int(os.environ.get("GREENHOUSE_POLL_SECONDS", "15")))
LOCAL_HOST = os.environ.get("GREENHOUSE_LISTEN_HOST", "0.0.0.0")
LOCAL_PORT = max(1, int(os.environ.get("GREENHOUSE_LISTEN_PORT", "8080")))
METRICS = {"temperature": "celsius", "humidity": "percent", "soil_moisture": "percent", "light": "lux"}
QUALITIES = {"valid", "suspect", "invalid"}
NODE_ID_PATTERN = re.compile(r"^[A-Z0-9_-]{3,64}$")
READING_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{2,159}$")


def now() -> datetime:
    return datetime.now(UTC)


def iso(value: datetime | None = None) -> str:
    return (value or now()).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_time(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def stable_reading_id(*parts: object) -> str:
    raw = "\x1f".join(str(part) for part in parts).encode()
    return "reading-" + hashlib.sha256(raw).hexdigest()


def parse_mapping(raw: str) -> dict[str, Any]:
    if not raw.strip():
        return {}
    try:
        value = json.loads(raw)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        result: dict[str, str] = {}
        for item in raw.split(","):
            node, separator, token = item.partition("=")
            if separator and node.strip() and token.strip():
                result[node.strip()] = token.strip()
        return result


def parse_node_tokens(raw: str) -> dict[str, str]:
    return {node: str(token) for node, token in parse_mapping(raw).items() if NODE_ID_PATTERN.fullmatch(node) and str(token)}


def parse_node_sensors(raw: str) -> dict[str, set[str]]:
    parsed = parse_mapping(raw)
    result: dict[str, set[str]] = {}
    for node, sensors in parsed.items():
        if not NODE_ID_PATTERN.fullmatch(node):
            continue
        if isinstance(sensors, str):
            result[node] = {item.strip() for item in sensors.split("|") if item.strip()}
        elif isinstance(sensors, list):
            result[node] = {str(item) for item in sensors if isinstance(item, str) and item.strip()}
    return result


class RelayDriver:
    """Safe simulator: construction and every unrecognised device are OFF."""

    def __init__(self) -> None:
        self._states: dict[str, str] = {}

    def all_off(self) -> None:
        for device_id in list(self._states):
            self._states[device_id] = "off"

    def set_state(self, device_id: str, state: str) -> str:
        if state not in {"on", "off"}:
            raise ValueError("relay state must be on or off")
        self._states[device_id] = state
        return state

    def state(self, device_id: str) -> str:
        return self._states.get(device_id, "off")


class SensorDriver:
    """Simulator input. Replace with reviewed sensor adapters in commissioning."""

    def readings(self, configs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        try:
            values = json.loads(os.environ.get("GREENHOUSE_SIMULATED_READINGS", '{"temperature":28.0,"humidity":65.0,"soil_moisture":42.0,"light":12500.0}'))
        except json.JSONDecodeError:
            values = {}
        sampled_at = iso()
        readings: list[dict[str, Any]] = []
        for config in configs:
            if config.get("enabled") is False:
                continue
            metric = config.get("metric")
            if metric not in METRICS:
                continue
            value = values.get(metric)
            valid = isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))
            readings.append({
                "sensorId": config.get("sensorId"),
                "metric": metric,
                "value": float(value) if valid else 0.0,
                "unit": config.get("unit", METRICS[metric]),
                "sampledAt": sampled_at,
                "quality": "valid" if valid else "invalid",
                "configVersion": int(config.get("configVersion", 1)),
            })
        return readings


@dataclass(frozen=True)
class Command:
    command_id: str
    device_id: str
    action: str
    idempotency_key: str
    expires_at: str
    max_runtime_seconds: int | None


class Store:
    def __init__(self) -> None:
        STATE_DIR.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(STATE_DIR / "agent.db", check_same_thread=False)
        self.lock = threading.RLock()
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("CREATE TABLE IF NOT EXISTS outbound_queue (id INTEGER PRIMARY KEY, path TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS processed_commands (idempotency_key TEXT PRIMARY KEY, completed_at TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS policies (device_id TEXT PRIMARY KEY, version INTEGER NOT NULL, policy TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS runtime (device_id TEXT PRIMARY KEY, last_on_at TEXT, last_off_at TEXT)")
        self.db.execute("CREATE TABLE IF NOT EXISTS sensor_configs (sensor_id TEXT PRIMARY KEY, config_version INTEGER NOT NULL, config TEXT NOT NULL, updated_at TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS inbound_readings (reading_id TEXT PRIMARY KEY, node_id TEXT NOT NULL, body TEXT NOT NULL, received_at TEXT NOT NULL, delivered_at TEXT)")
        self.db.commit()

    def queue(self, path: str, body: dict[str, Any]) -> None:
        with self.lock:
            self.db.execute("INSERT INTO outbound_queue(path, body, created_at) VALUES (?, ?, ?)", (path, json.dumps(body, separators=(",", ":")), iso()))
            self.db.commit()

    def queued(self) -> list[tuple[int, str, dict[str, Any]]]:
        with self.lock:
            return [(row[0], row[1], json.loads(row[2])) for row in self.db.execute("SELECT id, path, body FROM outbound_queue ORDER BY id LIMIT 100")]

    def remove_queued(self, queue_id: int) -> None:
        with self.lock:
            self.db.execute("DELETE FROM outbound_queue WHERE id = ?", (queue_id,))
            self.db.commit()

    def seen(self, key: str) -> bool:
        with self.lock:
            return self.db.execute("SELECT 1 FROM processed_commands WHERE idempotency_key = ?", (key,)).fetchone() is not None

    def mark_seen(self, key: str) -> None:
        with self.lock:
            self.db.execute("INSERT OR IGNORE INTO processed_commands(idempotency_key, completed_at) VALUES (?, ?)", (key, iso()))
            self.db.commit()

    def save_policy(self, device_id: str, version: int, policy: dict[str, Any]) -> None:
        with self.lock:
            previous = self.db.execute("SELECT version FROM policies WHERE device_id = ?", (device_id,)).fetchone()
            if previous and previous[0] >= version:
                return
            self.db.execute("INSERT INTO policies(device_id, version, policy) VALUES (?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET version=excluded.version, policy=excluded.policy", (device_id, version, json.dumps(policy)))
            self.db.commit()

    def policies(self) -> list[tuple[str, dict[str, Any]]]:
        with self.lock:
            return [(row[0], json.loads(row[1])) for row in self.db.execute("SELECT device_id, policy FROM policies")]

    def runtime(self, device_id: str) -> tuple[datetime | None, datetime | None]:
        with self.lock:
            row = self.db.execute("SELECT last_on_at, last_off_at FROM runtime WHERE device_id = ?", (device_id,)).fetchone()
        return (parse_time(row[0]) if row and row[0] else None, parse_time(row[1]) if row and row[1] else None)

    def set_runtime(self, device_id: str, state: str) -> None:
        on_at, off_at = self.runtime(device_id)
        if state == "on":
            on_at = now()
        else:
            off_at = now()
        with self.lock:
            self.db.execute("INSERT INTO runtime(device_id, last_on_at, last_off_at) VALUES (?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET last_on_at=excluded.last_on_at, last_off_at=excluded.last_off_at", (device_id, iso(on_at) if on_at else None, iso(off_at) if off_at else None))
            self.db.commit()

    def save_sensor_config(self, config: dict[str, Any]) -> None:
        sensor_id = str(config["sensorId"])
        version = int(config.get("configVersion", 1))
        with self.lock:
            previous = self.db.execute("SELECT config_version FROM sensor_configs WHERE sensor_id = ?", (sensor_id,)).fetchone()
            if previous and previous[0] >= version:
                return
            self.db.execute("INSERT INTO sensor_configs(sensor_id, config_version, config, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(sensor_id) DO UPDATE SET config_version=excluded.config_version, config=excluded.config, updated_at=excluded.updated_at", (sensor_id, version, json.dumps(config, separators=(",", ":")), iso()))
            self.db.commit()

    def sensor_configs(self) -> list[dict[str, Any]]:
        with self.lock:
            return [json.loads(row[0]) for row in self.db.execute("SELECT config FROM sensor_configs ORDER BY sensor_id")]

    def sensor_config(self, sensor_id: str) -> dict[str, Any] | None:
        with self.lock:
            row = self.db.execute("SELECT config FROM sensor_configs WHERE sensor_id = ?", (sensor_id,)).fetchone()
        return json.loads(row[0]) if row else None

    def save_inbound(self, reading_id: str, node_id: str, body: dict[str, Any]) -> bool:
        with self.lock:
            cursor = self.db.execute("INSERT OR IGNORE INTO inbound_readings(reading_id, node_id, body, received_at) VALUES (?, ?, ?, ?)", (reading_id, node_id, json.dumps(body, separators=(",", ":")), iso()))
            self.db.commit()
            return cursor.rowcount == 1


def command_expired(command: Command) -> bool:
    try:
        return parse_time(command.expires_at) <= now()
    except (TypeError, ValueError):
        return True


class CloudClient:
    def __init__(self) -> None:
        self.api_url = API_URL
        self.agent_id = AGENT_ID
        self.agent_secret = AGENT_SECRET
        self.greenhouse_id = GREENHOUSE_ID

    def signed_request(self, path: str, method: str = "GET", body: dict[str, Any] | None = None) -> dict[str, Any]:
        if not self.api_url or not self.agent_id or not self.agent_secret or not self.greenhouse_id:
            raise RuntimeError("GREENHOUSE_API_URL, GREENHOUSE_AGENT_ID, GREENHOUSE_AGENT_SECRET and GREENHOUSE_ID are required")
        raw = json.dumps(body, separators=(",", ":"), ensure_ascii=False) if body is not None else ""
        timestamp = iso()
        signature = base64.b64encode(hmac.new(self.agent_secret.encode(), f"{timestamp}.{raw}".encode(), hashlib.sha256).digest()).decode()
        request = urllib.request.Request(f"{self.api_url}{path}", data=raw.encode() if method != "GET" else None, method=method, headers={"Content-Type": "application/json", "X-Greenhouse-Agent": self.agent_id, "X-Greenhouse-Timestamp": timestamp, "X-Greenhouse-Signature": signature})
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read() or b"{}")


class Agent:
    def __init__(self) -> None:
        self.store = Store()
        self.cloud = CloudClient()
        self.relays = RelayDriver()
        self.sensors = SensorDriver()
        self.node_tokens = parse_node_tokens(os.environ.get("GREENHOUSE_NODE_TOKENS", ""))
        self.node_sensors = parse_node_sensors(os.environ.get("GREENHOUSE_NODE_SENSORS", ""))
        self.relays.all_off()

    def authenticate_node(self, node_id: str, token: str) -> bool:
        expected = self.node_tokens.get(node_id)
        return bool(NODE_ID_PATTERN.fullmatch(node_id) and expected and hmac.compare_digest(expected, token))

    def allowed_sensor(self, node_id: str, sensor_id: str) -> bool:
        if node_id in self.node_sensors:
            return sensor_id in self.node_sensors[node_id]
        return sensor_id in {config.get("sensorId") for config in self.store.sensor_configs()}

    def validate_local_telemetry(self, node_id: str, payload: object) -> tuple[dict[str, Any] | None, str | None, int]:
        if not NODE_ID_PATTERN.fullmatch(node_id):
            return None, "Invalid node identity.", 400
        if not isinstance(payload, dict) or payload.get("nodeId", node_id) != node_id or not isinstance(payload.get("readings"), list) or not payload["readings"] or len(payload["readings"]) > 100:
            return None, "Invalid telemetry envelope.", 400
        normalized: list[dict[str, Any]] = []
        for reading in payload["readings"]:
            if not isinstance(reading, dict):
                return None, "Invalid telemetry reading.", 400
            sensor_id = reading.get("sensorId")
            config = self.store.sensor_config(sensor_id) if isinstance(sensor_id, str) else None
            metric = reading.get("metric")
            unit = reading.get("unit")
            value = reading.get("value")
            quality = reading.get("quality")
            try:
                sampled_at = parse_time(str(reading.get("sampledAt")))
            except (TypeError, ValueError):
                return None, "A telemetry reading has an invalid timestamp.", 400
            age = now() - sampled_at
            if not isinstance(sensor_id, str) or not config or not self.allowed_sensor(node_id, sensor_id):
                return None, "Telemetry contains an unregistered sensor.", 403
            if metric != config.get("metric") or unit != config.get("unit") or metric not in METRICS or unit != METRICS[metric]:
                return None, "Telemetry metric or unit does not match local config.", 400
            if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(float(value)) or quality not in QUALITIES or age > timedelta(hours=24) or age < -timedelta(minutes=5):
                return None, "A telemetry reading is invalid, stale, or from the future.", 400
            supplied_id = reading.get("readingId")
            reading_id = supplied_id if isinstance(supplied_id, str) and READING_ID_PATTERN.fullmatch(supplied_id) else stable_reading_id(node_id, sensor_id, metric, unit, iso(sampled_at), value)
            config_version = reading.get("configVersion", config.get("configVersion", 1))
            if not isinstance(config_version, int) or isinstance(config_version, bool) or config_version < 1:
                return None, "configVersion must be a positive integer.", 400
            normalized.append({"readingId": reading_id, "sensorId": sensor_id, "metric": metric, "value": float(value), "unit": unit, "sampledAt": iso(sampled_at), "quality": quality, "configVersion": config_version})
        fresh: list[dict[str, Any]] = []
        duplicates = 0
        for reading in normalized:
            if self.store.save_inbound(reading["readingId"], node_id, reading):
                fresh.append(reading)
            else:
                duplicates += 1
        if fresh:
            self.store.queue("/api/agent/telemetry", {"greenhouseId": GREENHOUSE_ID, "agentId": AGENT_ID, "readings": fresh})
        return {"accepted": len(fresh), "duplicates": duplicates, "configVersion": max((item["configVersion"] for item in normalized), default=1), "receivedAt": iso()}, None, 202

    def local_config(self, node_id: str) -> dict[str, Any]:
        configs = [config for config in self.store.sensor_configs() if self.allowed_sensor(node_id, str(config.get("sensorId", "")))]
        return {"greenhouseId": GREENHOUSE_ID, "agentId": AGENT_ID, "nodeId": node_id, "configVersion": max((int(config.get("configVersion", 1)) for config in configs), default=0), "sensors": configs}

    def ack(self, command_id: str, status: str, reported_status: str | None = None, reason: str | None = None) -> None:
        body: dict[str, Any] = {"greenhouseId": GREENHOUSE_ID, "agentId": AGENT_ID, "status": status}
        if reported_status:
            body["reportedStatus"] = reported_status
        if reason:
            body["reason"] = reason
        path = f"/api/agent/commands/{urllib.parse.quote(command_id)}/ack"
        try:
            self.cloud.signed_request(path, "POST", body)
        except urllib.error.HTTPError as error:
            if error.code >= 500:
                self.store.queue(path, body)
        except (urllib.error.URLError, TimeoutError, OSError, RuntimeError):
            self.store.queue(path, body)

    def flush_queue(self) -> None:
        for queue_id, path, body in self.store.queued():
            try:
                self.cloud.signed_request(path, "POST", body)
                self.store.remove_queued(queue_id)
            except urllib.error.HTTPError as error:
                if error.code < 500:
                    self.store.remove_queued(queue_id)
                return
            except (urllib.error.URLError, TimeoutError, OSError, RuntimeError):
                return

    def apply_command(self, command: Command) -> None:
        if self.store.seen(command.idempotency_key):
            self.ack(command.command_id, "acknowledged", self.relays.state(command.device_id) if command.device_id != "ALL" else "off")
            return
        if command_expired(command):
            self.store.mark_seen(command.idempotency_key)
            self.ack(command.command_id, "failed", reason="Command expired before local execution.")
            return
        try:
            if command.action == "emergency_stop" and command.device_id == "ALL":
                self.relays.all_off()
                for device_id, _ in self.store.policies():
                    self.store.set_runtime(device_id, "off")
                state = "off"
            elif command.action in {"turn_on", "turn_off"}:
                state = "on" if command.action == "turn_on" else "off"
                policy = next((policy for device_id, policy in self.store.policies() if device_id == command.device_id), None)
                if not policy or not policy.get("manualAllowed", False):
                    raise PermissionError("Manual control is disabled by the local policy.")
                _, last_off = self.store.runtime(command.device_id)
                cooldown = int(policy.get("cooldownSeconds", 0))
                if state == "on" and last_off and now() < last_off + timedelta(seconds=cooldown):
                    raise PermissionError("Device cooldown is still active.")
                if state == "on" and command.max_runtime_seconds and command.max_runtime_seconds > int(policy.get("maxRuntimeSeconds", 0)):
                    raise PermissionError("Command runtime exceeds local policy.")
                self.relays.set_state(command.device_id, state)
                self.store.set_runtime(command.device_id, state)
            else:
                raise ValueError("Unsupported command.")
            self.store.mark_seen(command.idempotency_key)
            self.ack(command.command_id, "acknowledged", state)
        except (ValueError, PermissionError) as error:
            self.store.mark_seen(command.idempotency_key)
            self.ack(command.command_id, "failed", reason=str(error))

    def enforce_local_safety(self) -> None:
        for device_id, policy in self.store.policies():
            on_at, _ = self.store.runtime(device_id)
            if self.relays.state(device_id) == "on" and on_at and now() >= on_at + timedelta(seconds=int(policy["maxRuntimeSeconds"])):
                self.relays.set_state(device_id, "off")
                self.store.set_runtime(device_id, "off")

    def run_local_automation(self, readings: list[dict[str, Any]]) -> None:
        """Run only existing device policies; sensor config thresholds never relay-control."""
        values = {reading["metric"]: reading["value"] for reading in readings if reading.get("quality") != "invalid"}
        for device_id, policy in self.store.policies():
            threshold = policy.get("threshold")
            if policy.get("mode") != "auto" or not isinstance(threshold, dict):
                continue
            value = values.get(threshold.get("metric"))
            if not isinstance(value, (int, float)):
                continue
            should_run = value > threshold.get("value", float("inf")) if threshold.get("operator") == "above" else value < threshold.get("value", float("-inf"))
            _, last_off = self.store.runtime(device_id)
            cooldown = int(policy.get("cooldownSeconds", 0))
            if should_run and self.relays.state(device_id) == "off" and (not last_off or now() >= last_off + timedelta(seconds=cooldown)):
                self.relays.set_state(device_id, "on")
                self.store.set_runtime(device_id, "on")
            elif not should_run and self.relays.state(device_id) == "on":
                self.relays.set_state(device_id, "off")
                self.store.set_runtime(device_id, "off")

    def submit_telemetry(self, readings: list[dict[str, Any]]) -> None:
        fresh: list[dict[str, Any]] = []
        for reading in readings:
            sensor_id = reading.get("sensorId")
            reading_id = reading.get("readingId") or stable_reading_id(AGENT_ID, sensor_id, reading.get("metric"), reading.get("sampledAt"), reading.get("value"))
            normalized = {**reading, "readingId": reading_id}
            if self.store.save_inbound(reading_id, "agent", normalized):
                fresh.append(normalized)
        if not fresh:
            return
        body = {"greenhouseId": GREENHOUSE_ID, "agentId": AGENT_ID, "readings": fresh}
        try:
            self.cloud.signed_request("/api/agent/telemetry", "POST", body)
        except urllib.error.HTTPError as error:
            if error.code >= 500:
                self.store.queue("/api/agent/telemetry", body)
        except (urllib.error.URLError, TimeoutError, OSError, RuntimeError):
            self.store.queue("/api/agent/telemetry", body)

    def sync_config(self) -> None:
        payload = self.cloud.signed_request(f"/api/agent/config?greenhouseId={urllib.parse.quote(GREENHOUSE_ID)}&agentId={urllib.parse.quote(AGENT_ID)}")
        for config in payload.get("sensors", []):
            if isinstance(config, dict) and isinstance(config.get("sensorId"), str):
                self.store.save_sensor_config(config)
        for config in payload.get("config", []):
            if isinstance(config, dict) and isinstance(config.get("deviceId"), str):
                self.store.save_policy(config["deviceId"], int(config["version"]), config["policy"])

    def heartbeat(self) -> None:
        devices = [{"deviceId": device_id, "status": self.relays.state(device_id), "configVersion": 1} for device_id, _ in self.store.policies()]
        self.cloud.signed_request("/api/agent/heartbeat", "POST", {"greenhouseId": GREENHOUSE_ID, "agentId": AGENT_ID, "devices": devices})

    def cycle(self) -> None:
        self.enforce_local_safety()
        readings = self.sensors.readings(self.store.sensor_configs())
        self.run_local_automation(readings)
        try:
            self.flush_queue()
            self.sync_config()
            self.heartbeat()
            self.submit_telemetry(readings)
            response = self.cloud.signed_request(f"/api/agent/commands?greenhouseId={urllib.parse.quote(GREENHOUSE_ID)}&agentId={urllib.parse.quote(AGENT_ID)}")
            for item in response.get("commands", []):
                self.apply_command(Command(item["commandId"], item["deviceId"], item["action"], item["idempotencyKey"], item["expiresAt"], item.get("maxRuntimeSeconds")))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, RuntimeError) as error:
            print(f"cloud unavailable: {error}")

    def start_local_server(self) -> ThreadingHTTPServer:
        agent = self

        class Handler(BaseHTTPRequestHandler):
            def _write(self, payload: dict[str, Any], status: int) -> None:
                encoded = json.dumps(payload, separators=(",", ":")).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)

            def _node(self) -> tuple[str, bool]:
                node_id = self.headers.get("X-Greenhouse-Node", "")
                token = self.headers.get("X-Greenhouse-Token", "")
                return node_id, agent.authenticate_node(node_id, token)

            def do_GET(self) -> None:  # noqa: N802
                if self.path != "/v1/config":
                    self._write({"error": "Not found."}, 404)
                    return
                node_id, authenticated = self._node()
                if not authenticated:
                    self._write({"error": "Invalid node authentication."}, 401)
                    return
                self._write(agent.local_config(node_id), 200)

            def do_POST(self) -> None:  # noqa: N802
                if self.path != "/v1/telemetry":
                    self._write({"error": "Not found."}, 404)
                    return
                node_id, authenticated = self._node()
                if not authenticated:
                    self._write({"error": "Invalid node authentication."}, 401)
                    return
                try:
                    length = int(self.headers.get("Content-Length", "0"))
                    if length < 1 or length > 1_000_000:
                        raise ValueError
                    payload = json.loads(self.rfile.read(length))
                except (ValueError, json.JSONDecodeError):
                    self._write({"error": "Request body must be valid JSON."}, 400)
                    return
                result, error, status = agent.validate_local_telemetry(node_id, payload)
                self._write(result or {"error": error or "Telemetry rejected."}, status)

            def log_message(self, _format: str, *_args: object) -> None:
                return

        server = ThreadingHTTPServer((LOCAL_HOST, LOCAL_PORT), Handler)
        threading.Thread(target=server.serve_forever, name="greenhouse-local-http", daemon=True).start()
        return server

    def run(self) -> None:
        self.start_local_server()
        while True:
            self.cycle()
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    Agent().run()
