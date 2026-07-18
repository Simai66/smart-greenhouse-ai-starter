# Real greenhouse — next steps

## Current baseline

The repository contains the Cloud-to-Pi foundation: signed Pi requests,
telemetry ingestion, heartbeats, a poll-only command queue, acknowledgements,
policy revisions, and a fail-closed simulated Pi agent. It is not yet wired to
physical GPIO or the rendered dashboard.

## 1. Provision and validate the edge path

**Owner:** DevOps/edge, then QA. **Depends on:** applied D1 migrations.

1. Configure Cloudflare Access with Google, restrict the public hostname to
   approved identities, and set the role email secrets.
2. Create a distinct agent secret for each Pi; register its `edge_agents` row,
   assign its devices and capabilities, and create initial policies.
3. Deploy the Worker and run `edge-agent` in simulator mode first.
4. QA the protocol: bad HMAC, stale telemetry, duplicate and expired commands,
   delayed ACK, D1 error, offline Pi, policy rejection, and emergency-stop
   rejection when agent freshness is unknown.

**Exit criteria:** a simulator can send valid telemetry, receive a queued
command, return a verified ACK, and continue its stored automation after the
cloud endpoint is unavailable.

## 2. Connect the operations dashboard

**Owner:** Backend contract review → Frontend → QA. **Depends on:** step 1.

1. Add read APIs for latest telemetry, agent/device freshness, command history,
   policy history, and alerts; establish pagination and CSV-export contracts.
2. Replace the current explicitly labelled demo data only after live APIs are
   available. Show sensor freshness, Pi connectivity, actual relay state,
   command states, and automation reason.
3. Add capability-specific device-policy forms. Admin edits policies, operator
   issues permitted manual commands, viewer remains read-only.
4. Make the UI disable cloud commands whenever its Pi is stale/offline.

**Exit criteria:** keyboard and mobile tested live control UX never presents a
queued command as a confirmed relay state.

## 3. Hardware commissioning

**Owner:** hardware/edge engineer, QA. **Depends on:** simulator acceptance.

1. Review Pi pin map, relay active level, load ratings, fusing, watchdog and a
   physical emergency stop/interlock. Replace only the simulator adapters with
   hardware adapters behind the existing safety checks.
2. Calibrate temperature, humidity, soil-moisture, and light sensors; record
   calibration metadata and test disconnected/noisy sensor quality states.
3. Conduct supervised dry-runs for pump, fan, grow light, and mist maker.

**Exit criteria:** every actuator starts OFF after reboot; max runtime and
cooldown work without cloud access; physical emergency stop wins over software.

## 4. Alerts and remote operations

**Owner:** Backend → Frontend → QA. **Depends on:** live data.

Implement threshold/offline/command-failure rules, alert lifecycle audit trail,
and LINE Messaging API delivery. Use a signed dashboard link and never embed a
device secret in LINE payloads.

## Deferred

Camera/AI detection, reporting, multi-greenhouse onboarding, per-agent
emergency-stop fan-out, and calibration workflow remain post-stabilisation
work. Multi-agent emergency stop requires a command record and ACK state per
agent before it can be safely enabled.
