# Feature card: PM release readiness and safe real-operation pilot

## Status and decision

- Status: Active
- Date: 2026-08-11
- Product owner: User / PM
- Delivery owner: Main agent
- Current milestone: Safe real-operation pilot readiness
- Release posture: Browser dashboard remains a clearly labelled demo until a
  provisioned Pi, Cloudflare Access, deployment secrets, API integration, and
  QA sign-off exist. No UI claim proves physical actuator state.

## Outcome

ทีมมี milestone เดียวที่ใช้จัดลำดับงานและตัดสิน release ได้ โดยแยก demo,
real telemetry และ physical device state ชัดเจน และไม่ปล่อยคำสั่งอุปกรณ์โดยไม่มี
auth, acknowledgement, audit evidence และ rollback plan.

## Acceptance criteria

- `AGENTS.md` บังคับอ่าน `rule.md` และ active feature card ก่อนทำงาน
- `rule.md` สรุปข้อห้ามและวิธีทำงาน พร้อมชี้มายัง feature card ใบนี้
- P0 acceptance matrix ผ่านครบ หรือ residual risk ได้รับการยอมรับเป็นลายลักษณ์อักษร
- Demo UI ไม่แสดงข้อมูลหรือสถานะ actuator เป็นหลักฐานจากอุปกรณ์จริง
- Real telemetry มีสถานะ `fresh`, `stale`, `missing` และระบุ source/config version
- Device command เดินตาม `pending` → `acknowledged` หรือ `failed`; timeout/offline
  ไม่เปลี่ยน UI เป็น success
- Auth, input validation, secret handling, migration rollback และ audit evidence
  ผ่าน review ก่อน pilot
- QA ตรวจ keyboard, responsive, accessibility, negative paths และ security input
- Release evidence ระบุ commands ที่รัน, ผลจริง, owner, monitoring และ rollback

## Scope

In scope:

- ผูก `AGENTS.md` กับ `rule.md` และ active feature card
- ล็อก release posture และ decision ปัจจุบัน
- จัด P0/P1/P2 backlog, acceptance matrix, risk register และ release gate
- ระบุ owner และ dependency order สำหรับงานถัดไป

Out of scope:

- แก้ UI, API, database, firmware, deployment หรือ hardware ในงาน PM นี้
- Provision production Cloudflare/Pi/ESP32 หรือส่งคำสั่ง actuator จริง
- เพิ่ม dependency, schema migration หรือเปลี่ยน product behavior

## Affected areas

- Docs/process only: `AGENTS.md`, `rule.md`, `docs/feature-cards/`
- No runtime, API, database หรือ deployment change

## Acceptance matrix

| Area | Pass condition | Owner | Dependency |
|---|---|---|---|
| Product truthfulness | Demo/live/device state แยกชัด; ไม่มี false success | Frontend + QA | Current UI contract |
| Telemetry | Freshness, quality, config version, dedupe และ offline path ตรวจได้ | Backend + Edge | API contract |
| Device commands | Pending/ack/failed/timeout ครบ; fail closed; audit evidence มี | Backend + Frontend | Auth + gateway |
| Authentication | Role mapping, protected routes และ invalid input fail closed | Backend | Deployment secrets |
| Database | Additive migration, audit preservation และ rollback ขั้นตอนได้ | Backend + DevOps | D1 environment |
| Accessibility | Keyboard, focus, 44px target, responsive และ reduced motion ผ่าน | Frontend + QA | UI implementation |
| Release operations | Env list, monitoring, smoke test และ rollback owner ระบุครบ | DevOps | Deployment target |

## Prioritized backlog

| Priority | Work item | Owner | Depends on |
|---|---|---|---|
| P0 | Publish and review telemetry/command/auth API contracts | Backend | Product decision |
| P0 | Verify real telemetry freshness, dedupe, queue and failure semantics | Backend + Edge | API contracts |
| P0 | Verify command acknowledgement, authorization and no-false-success UI | Backend + Frontend | Command contract |
| P0 | Run negative-path, accessibility, responsive and security-input QA | QA | P0 implementation |
| P1 | Configure Cloudflare Access, env secrets, monitoring and rollback runbook | DevOps | P0 QA evidence |
| P1 | Review Pi/ESP32 calibration, pin map, relay logic and physical interlock | Hardware owner | Deployment plan |
| P2 | Expand analytics, demo polish and non-critical UX improvements | Frontend | P0/P1 release |

## Risks and assumptions

- `AGENTS.md` contains a historical Astryx block while active app implementation
  uses shadcn/Radix/Tailwind; UI work must follow current code and `design.md`.
- No provisioned hardware or production environment is assumed in this PM task.
- Simulator output is not evidence of physical relay state.
- Cloudflare Access, deployment secrets and hardware commissioning need named
  owners before pilot approval.
- Sensor calibration, relay load limits and emergency interlock require hardware
  review; software QA cannot close those risks.

## Role and dependency order

1. PM: approve milestone, acceptance criteria, scope and residual-risk policy.
2. Backend: publish contracts; implement auth, validation, telemetry and command safety.
3. Edge: implement local cache/queue, retry, dedupe and signed cloud sync.
4. Frontend: render demo/live/device boundaries and command lifecycle truthfully.
5. DevOps: configure secrets, Access, monitoring and rollback.
6. QA: validate integrated matrix; report blocker/major/minor findings.

## Release gate

- All P0 acceptance-matrix rows pass.
- No open blocker or major issue without written PM acceptance.
- Relevant targeted tests, lint, typecheck and build pass; full gate runs for
  cross-layer or release changes.
- QA signs off integrated behavior and accessibility.
- Deployment env, monitoring, smoke test and rollback owner are documented.
- Physical pilot remains blocked until hardware review and emergency interlock
  evidence exist.

## Handoff

- Every work item links back to this card and names owner/dependency.
- Handoff is Thai and includes changed files, verification, next-role work,
  risks, trade-offs and out-of-scope observations.
