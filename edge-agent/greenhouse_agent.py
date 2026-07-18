#!/usr/bin/env python3
"""Fail-closed reference agent for a Raspberry Pi greenhouse controller.

The shipped RelayDriver is a simulator. Replace it only after a reviewed GPIO
pin map and physical emergency-stop/interlock are installed. The agent has no
HTTP server; every cloud interaction is an outbound, signed HTTPS request.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

API_URL = os.environ.get("GREENHOUSE_API_URL", "").rstrip("/")
AGENT_ID = os.environ.get("GREENHOUSE_AGENT_ID", "")
AGENT_SECRET = os.environ.get("GREENHOUSE_AGENT_SECRET", "")
GREENHOUSE_ID = os.environ.get("GREENHOUSE_ID", "")
STATE_DIR = Path(os.environ.get("GREENHOUSE_STATE_DIR", "/var/lib/greenhouse-agent"))
POLL_SECONDS = max(5, int(os.environ.get("GREENHOUSE_POLL_SECONDS", "15")))


def now() -> datetime:
    return datetime.now(UTC)


def iso(value: datetime | None = None) -> str:
    return (value or now()).isoformat(timespec="milliseconds").replace("+00:00", "Z")


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
    """Simulator input for integration testing; replace with reviewed sensor adapters."""

    def readings(self) -> list[dict[str, Any]]:
        values = json.loads(os.environ.get("GREENHOUSE_SIMULATED_READINGS", '{"temperature":28.0,"humidity":65.0,"soil_moisture":42.0,"light":12500.0}'))
        sampled_at = iso()
        return [{"sensorId": f"SIM-{metric.upper()}", "metric": metric, "value": value, "unit": {"temperature": "celsius", "humidity": "percent", "soil_moisture": "percent", "light": "lux"}[metric], "sampledAt": sampled_at, "quality": "valid"} for metric, value in values.items() if metric in {"temperature", "humidity", "soil_moisture", "light"} and isinstance(value, (int, float))]


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
        self.db = sqlite3.connect(STATE_DIR / "agent.db")
        self.db.execute("CREATE TABLE IF NOT EXISTS outbound_queue (id INTEGER PRIMARY KEY, path TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS processed_commands (idempotency_key TEXT PRIMARY KEY, completed_at TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS policies (device_id TEXT PRIMARY KEY, version INTEGER NOT NULL, policy TEXT NOT NULL)")
        self.db.execute("CREATE TABLE IF NOT EXISTS runtime (device_id TEXT PRIMARY KEY, last_on_at TEXT, last_off_at TEXT)")
        self.db.commit()

    def queue(self, path: str, body: dict[str, Any]) -> None:
        self.db.execute("INSERT INTO outbound_queue(path, body, created_at) VALUES (?, ?, ?)", (path, json.dumps(body, separators=(",", ":")), iso()))
        self.db.commit()

    def queued(self) -> list[tuple[int, str, dict[str, Any]]]:
        return [(row[0], row[1], json.loads(row[2])) for row in self.db.execute("SELECT id, path, body FROM outbound_queue ORDER BY id LIMIT 100")]

    def remove_queued(self, queue_id: int) -> None:
        self.db.execute("DELETE FROM outbound_queue WHERE id = ?", (queue_id,))
        self.db.commit()

    def seen(self, key: str) -> bool:
        return self.db.execute("SELECT 1 FROM processed_commands WHERE idempotency_key = ?", (key,)).fetchone() is not None

    def mark_seen(self, key: str) -> None:
        self.db.execute("INSERT OR IGNORE INTO processed_commands(idempotency_key, completed_at) VALUES (?, ?)", (key, iso()))
        self.db.commit()

    def save_policy(self, device_id: str, version: int, policy: dict[str, Any]) -> None:
        previous = self.db.execute("SELECT version FROM policies WHERE device_id = ?", (device_id,)).fetchone()
        if previous and previous[0] >= version:
            return
        self.db.execute("INSERT INTO policies(device_id, version, policy) VALUES (?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET version=excluded.version, policy=excluded.policy", (device_id, version, json.dumps(policy)))
        self.db.commit()

    def policies(self) -> list[tuple[str, dict[str, Any]]]:
        return [(row[0], json.loads(row[1])) for row in self.db.execute("SELECT device_id, policy FROM policies")]

    def runtime(self, device_id: str) -> tuple[datetime | None, datetime | None]:
        row = self.db.execute("SELECT last_on_at, last_off_at FROM runtime WHERE device_id = ?", (device_id,)).fetchone()
        return (parse_time(row[0]) if row and row[0] else None, parse_time(row[1]) if row and row[1] else None)

    def set_runtime(self, device_id: str, state: str) -> None:
        on_at, off_at = self.runtime(device_id)
        if state == "on": on_at = now()
        else: off_at = now()
        self.db.execute("INSERT INTO runtime(device_id, last_on_at, last_off_at) VALUES (?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET last_on_at=excluded.last_on_at, last_off_at=excluded.last_off_at", (device_id, iso(on_at) if on_at else None, iso(off_at) if off_at else None))
        self.db.commit()


def parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


class CloudClient:
    def signed_request(self, path: str, method: str = "GET", body: dict[str, Any] | None = None) -> dict[str, Any]:
        if not API_URL or not AGENT_ID or not AGENT_SECRET or not GREENHOUSE_ID:
            raise RuntimeError("GREENHOUSE_API_URL, GREENHOUSE_AGENT_ID, GREENHOUSE_AGENT_SECRET and GREENHOUSE_ID are required")
        raw = json.dumps(body, separators=(",", ":")) if body is not None else ""
        timestamp = iso()
        signature = base64.b64encode(hmac.new(AGENT_SECRET.encode(), f"{timestamp}.{raw}".encode(), hashlib.sha256).digest()).decode()
        request = urllib.request.Request(f"{API_URL}{path}", data=raw.encode() if method != "GET" else None, method=method, headers={"Content-Type": "application/json", "X-Greenhouse-Agent": AGENT_ID, "X-Greenhouse-Timestamp": timestamp, "X-Greenhouse-Signature": signature})
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read() or b"{}")


def command_expired(command: Command) -> bool:
    try:
        return parse_time(command.expires_at) <= now()
    except (TypeError, ValueError):
        return True


class Agent:
    def __init__(self) -> None:
        self.store = Store()
        self.cloud = CloudClient()
        self.relays = RelayDriver()
        self.sensors = SensorDriver()
        self.relays.all_off()

    def ack(self, command_id: str, status: str, reported_status: str | None = None, reason: str | None = None) -> None:
        body: dict[str, Any] = {"greenhouseId": GREENHOUSE_ID, "agentId": AGENT_ID, "status": status}
        if reported_status: body["reportedStatus"] = reported_status
        if reason: body["reason"] = reason
        path = f"/api/agent/commands/{urllib.parse.quote(command_id)}/ack"
        try:
            self.cloud.signed_request(path, "POST", body)
        except urllib.error.HTTPError as error:
            if error.code >= 500:
                self.store.queue(path, body)
        except (urllib.error.URLError, TimeoutError, OSError):
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
            except (urllib.error.URLError, TimeoutError, OSError):
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
                for device_id, _ in self.store.policies(): self.store.set_runtime(device_id, "off")
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
        """Run only locally stored rules; this never depends on cloud reachability."""
        values = {reading["metric"]: reading["value"] for reading in readings}
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
        body = {"greenhouseId": GREENHOUSE_ID, "agentId": AGENT_ID, "readings": readings}
        try:
            self.cloud.signed_request("/api/agent/telemetry", "POST", body)
        except urllib.error.HTTPError as error:
            if error.code >= 500:
                self.store.queue("/api/agent/telemetry", body)
        except (urllib.error.URLError, TimeoutError, OSError):
            self.store.queue("/api/agent/telemetry", body)

    def sync_config(self) -> None:
        payload = self.cloud.signed_request(f"/api/agent/config?greenhouseId={urllib.parse.quote(GREENHOUSE_ID)}&agentId={urllib.parse.quote(AGENT_ID)}")
        for config in payload.get("config", []): self.store.save_policy(config["deviceId"], int(config["version"]), config["policy"])

    def heartbeat(self) -> None:
        devices = [{"deviceId": device_id, "status": self.relays.state(device_id), "configVersion": 1} for device_id, _ in self.store.policies()]
        self.cloud.signed_request("/api/agent/heartbeat", "POST", {"greenhouseId": GREENHOUSE_ID, "agentId": AGENT_ID, "devices": devices})

    def cycle(self) -> None:
        self.enforce_local_safety()
        readings = self.sensors.readings()
        self.run_local_automation(readings)
        try:
            self.flush_queue()
            self.sync_config()
            self.heartbeat()
            self.submit_telemetry(readings)
            response = self.cloud.signed_request(f"/api/agent/commands?greenhouseId={urllib.parse.quote(GREENHOUSE_ID)}&agentId={urllib.parse.quote(AGENT_ID)}")
            for item in response.get("commands", []): self.apply_command(Command(item["commandId"], item["deviceId"], item["action"], item["idempotencyKey"], item["expiresAt"], item.get("maxRuntimeSeconds")))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, RuntimeError) as error:
            print(f"cloud unavailable: {error}")

    def run(self) -> None:
        while True:
            self.cycle()
            time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    Agent().run()
