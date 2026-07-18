# Greenhouse edge-agent API v1

All payload timestamps are ISO-8601 UTC. Browser endpoints are protected by
Cloudflare Access and the application role mapping. Edge endpoints use a
per-agent HMAC-SHA-256 signature and are not browser endpoints.

## Agent authentication

For every `/api/agent/*` request, the Pi sends:

```text
X-Greenhouse-Agent: PI-GH-01
X-Greenhouse-Timestamp: 2026-07-18T03:00:00.000Z
X-Greenhouse-Signature: base64(HMAC-SHA-256(secret, timestamp + "." + raw-body))
```

The timestamp must be within five minutes of the Worker clock. The Worker
looks up the secret named `GREENHOUSE_AGENT_SECRET_<agentId>`; agent IDs are
restricted to uppercase letters, digits, `_`, and `-`. `GET` signatures use an
empty body. The agent must never send this secret as a request field.

Errors use `{ "error": "..." }`. Authentication errors are `401`, invalid
or unauthorised input is `400`/`403`, unavailable storage is `503`.

## Browser command queue

`POST /api/device-commands` (operator or admin)

```json
{
  "greenhouseId": "GH-01",
  "deviceId": "DEV-PUMP-01",
  "command": "turn_on",
  "maxRuntimeSeconds": 180
}
```

The mandatory `Idempotency-Key` header is returned unchanged by a duplicate
request. The response is a command in `requested`, `dispatched`,
`acknowledged`, `failed`, or `timed_out` state. The Worker returns `409` when
the target is offline/stale or manual operation is disallowed. It never waits
for a Pi acknowledgement. In this release an `emergency_stop` is accepted only
when exactly one fresh agent is registered to the greenhouse; multi-agent
emergency fan-out needs per-agent acknowledgement records and is deferred.

`GET /api/device-commands?greenhouseId=GH-01` returns the latest 50 audit
records to viewer and above.

## Edge endpoints

`POST /api/agent/telemetry`

```json
{
  "greenhouseId": "GH-01",
  "agentId": "PI-GH-01",
  "readings": [{
    "sensorId": "SEN-TH-01", "metric": "temperature",
    "value": 28.5, "unit": "celsius", "sampledAt": "2026-07-18T03:00:00.000Z",
    "quality": "valid"
  }]
}
```

Allowed metrics are `temperature`, `humidity`, `soil_moisture`, and `light`.
Quality is `valid`, `suspect`, or `invalid`; invalid samples are retained for
diagnostics but do not imply healthy telemetry. A request accepts at most 100
readings and sample time must be no older than 24 hours or more than five
minutes in the future.

`POST /api/agent/heartbeat`

```json
{
  "greenhouseId": "GH-01", "agentId": "PI-GH-01",
  "devices": [{"deviceId": "DEV-PUMP-01", "status": "off", "configVersion": 3}]
}
```

The heartbeat records freshness and only permits registered devices belonging
to the agent's greenhouse.

`GET /api/agent/commands?greenhouseId=GH-01&agentId=PI-GH-01`

Returns non-expired `requested`/`dispatched` commands for that agent and marks
new ones `dispatched`. Each item includes `commandId`, `deviceId`, `action`,
`correlationId`, `idempotencyKey`, `expiresAt`, and `maxRuntimeSeconds`.

`POST /api/agent/commands/:commandId/ack`

```json
{
  "greenhouseId": "GH-01", "agentId": "PI-GH-01",
  "status": "acknowledged", "reportedStatus": "on"
}
```

`status` is `acknowledged` or `failed`; failures require `reason` (up to 300
characters). A repeated acknowledgement is idempotent. The Worker logs every
state change.

`GET /api/agent/config?greenhouseId=GH-01&agentId=PI-GH-01`

Returns policy documents and their versions for the agent's devices. A policy
has `mode` (`manual`/`auto`), `manualAllowed`, optional `schedule`, optional
`threshold`, `maxRuntimeSeconds`, and `cooldownSeconds`; fields are validated
against the device capability before persistence.

`PUT /api/devices/:deviceId/policy` (admin) creates the next immutable policy
revision. Request body: `{ "greenhouseId": "GH-01", "policy": { ... } }`.
