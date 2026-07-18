# Feature card — Real greenhouse foundation

## User outcome

An authenticated operator can request a safe device action from the dashboard
API, while a registered Raspberry Pi agent polls for that action, validates its
expiry and idempotency key locally, and reports an acknowledgement or failure.
Administrators can version per-device automation policies. The cloud never
opens a connection to a Pi or controls GPIO directly.

## Acceptance criteria

- Pi-facing telemetry, heartbeat, command polling, configuration retrieval,
  and command-acknowledgement endpoints require a signed agent request.
- Telemetry rejects malformed values, unknown metrics, invalid quality values,
  stale/future timestamps, and unauthorised greenhouse/agent pairs.
- Operator commands are queued only for a fresh, online registered device;
  they include a correlation ID, idempotency key, and expiry. A duplicate
  idempotency key returns the original command.
- Device policies are capability-aware, validated and versioned. Only admins
  may update policy; viewers remain read-only and operators may issue commands
  only within a policy that permits manual operation.
- The Pi reference agent defaults all relays OFF, honours TTL/max-runtime and
  cooldown, retains an outbound telemetry queue, and continues local
  automation while cloud requests fail.
- The public dashboard contains no claim that simulated data is live hardware;
  Cloudflare Access remains the boundary for Google sign-in.
- Lint, unit tests, and production build pass.

## Scope

- **In:** D1 schema/migration, Cloud API contracts, signed Pi agent protocol,
  reference Docker Pi agent and simulator, role enforcement, policy history,
  operational runbook, and focused tests.
- **Out:** provisioning Google/Cloudflare Access in an account, GPIO pin
  assignments or driving high-voltage hardware, LINE credentials/delivery,
  camera/AI, and migration of the existing demo dashboard to live data.

## Affected areas

- UI: existing demo truthfulness is retained; live UI integration is deferred
  until a Pi has been provisioned.
- API/database: yes — D1 schema and public/agent endpoints.
- Deployment infrastructure: documented Cloudflare Access and secret setup;
  no account configuration can be committed safely.

## Assumptions and material risks

- Each greenhouse has a distinct `agentId` and HMAC secret held only by that
  Pi and the Worker secret configuration. Agent IDs are registered in D1.
- Relay and sensor adapters are intentionally simulated until a reviewed
  hardware pin map and physical emergency-stop/interlock are supplied.
- D1 migration must be applied before deployment. Rolling back application
  code is safe; tables are additive and should be retained rather than dropped.
- Cloudflare Access protects browser routes. Worker APIs still enforce app
  roles and signed Pi credentials because access rules alone are insufficient
  for a device protocol.

## Owners and dependency order

1. Backend — publish contract, add schema and fail-closed agent/command APIs.
2. Edge/DevOps — implement the Pi reference agent and deployment runbook
   against that contract.
3. Frontend — replace demo data only after a provisioned device is available;
   no change is made in this delivery.
4. QA — exercise contract validation and agent simulator, then lint/test/build.
