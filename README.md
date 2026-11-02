# Verdant — Smart Greenhouse AI Dashboard

Starter project สำหรับระบบโรงเรือนอัจฉริยะตาม `design.md` โดยรวมข้อมูลเซ็นเซอร์ ผลตรวจสุขภาพพืชจาก AI การแจ้งเตือน และการควบคุมอุปกรณ์ IoT ไว้ในเว็บเดียว

## สิ่งที่มีในเวอร์ชันนี้

- Dashboard: Temperature, Humidity, Soil Moisture, Light Intensity, กราฟแนวโน้ม, Plant Health และ Alerts
- Plant Monitoring: การ์ดพืช 4 ต้น, ตัวกรองสถานะ และค้นหาพืช
- AI Detection: กล้องจำลอง, Bounding box, Confidence, Severity, Recommendation และสถานะ Processing
- Device Control: Auto/Manual mode, Pending → Acknowledged, Schedule, Toast และ Emergency Stop confirmation
- Analytics, Alerts และ Settings สำหรับใช้เป็นฐานพัฒนาต่อ
- Responsive shell: Sidebar บน Desktop, Drawer/Bottom navigation บน Mobile
- Mock API adapter และตัวอย่าง API route ที่เปลี่ยนเป็น Cloudflare D1, MQTT หรือ Raspberry Pi gateway ได้

## เริ่มต้นใช้งาน

ต้องมี Node.js 22.13 ขึ้นไป

```bash
npm install
npm run dev
```

ตรวจ production build:

```bash
npm run build
```

## Active UI structure

- `app/page.tsx` renders the Smart Greenhouse client.
- `components/greenhouse/greenhouse-app.tsx` owns navigation, demo-store
  lifecycle, search, dialogs, export, and feedback.
- `components/greenhouse/app-sidebar.tsx` and `site-header.tsx` provide the
  responsive shadcn application shell.
- `components/greenhouse/views/` contains the seven task-specific page views.
- `components/greenhouse/charts/` contains accessible Recharts views.
- `components/ui/` contains CLI-managed shadcn primitives.
- `lib/greenhouse-demo-store.ts` remains the browser demo source of truth.
- `lib/mock-data.ts` remains because the protected sensors API consumes it.


## จุดเชื่อมระบบจริง

1. เปลี่ยน `lib/greenhouse-api.ts` ให้เรียก Cloudflare Worker API หรือ MQTT gateway
2. เปลี่ยนข้อมูลใน `lib/mock-data.ts` เป็นผลจาก API / D1
3. Sensor gateway ส่งค่า Temperature, Humidity, Soil Moisture และ Light ตามช่วงเวลาที่กำหนด
4. Raspberry Pi ส่งรูปหรือ URL ของภาพ พร้อมผลโมเดล `classification`, `confidence`, `condition`, `severity` และ `recommendation`
5. Device command ต้องตอบกลับด้วย acknowledgement ก่อนเปลี่ยนสถานะ UI เป็นสำเร็จ

ตัวอย่าง sensor endpoint:

```text
GET /api/sensors
```

ตัวอย่าง command contract ที่แนะนำ:

```json
{
  "deviceId": "DEV-PUMP-01",
  "command": "turn_on",
  "requestedAt": "2026-07-17T03:00:00.000Z"
}
```

ผลตอบกลับ:

```json
{
  "deviceId": "DEV-PUMP-01",
  "status": "on",
  "acknowledgedAt": "2026-07-17T03:00:00.700Z"
}
```

## แนวทางพัฒนาต่อ

- Cloudflare D1: เก็บ sensor readings, AI detections, alerts และ device command logs
- Supabase Storage: เก็บภาพพืชจากกล้องใน bucket `greenhouse-images`
- Raspberry Pi 5: รัน OpenCV / TFLite แล้วส่งผลเข้า Worker API
- ESP32 / ESP8266: ส่ง telemetry และรับคำสั่งผ่าน MQTT หรือ gateway ภายใน
- Authentication: แยกสิทธิ์ Administrator, Operator และ Viewer
- Tests: เพิ่ม unit test สำหรับ API adapter และ end-to-end test สำหรับ command acknowledgement

ข้อมูลในหน้าเว็บเป็นข้อมูลจำลองเพื่อแสดง flow และสถานะต่าง ๆ ก่อนเชื่อมฮาร์ดแวร์จริง

## Real-operation foundation (Pi → Cloud only)

The P0/P1 edge protocol, D1 migration, and reference Pi agent are included in
this repository. Read [the API contract](docs/api/edge-agent-v1.md) before
provisioning a device. The current rendered dashboard intentionally remains a
clearly labelled demo until a provisioned Pi is integrated; it must not be
used as evidence that a relay changed state.

1. Apply additive D1 migrations in order: `0000_p0_foundation.sql`,
   `0001_edge_agent_and_policies.sql`,
   `0002_sensor_configs_and_reading_ids.sql`,
   `0003_supabase_storage_images.sql`, then
   `0004_dual_measurement_points_and_plant_assignments.sql`, then
   `0005_agent_request_nonces.sql`.
   Back up staging D1 before applying. App rollback is safe because migration
   `0004` only adds tables, columns, and indexes; retain the added schema and
   assignment history when rolling back the Worker. Recover incorrect mappings
   with a new audited assignment rather than deleting history.
2. Insert one `edge_agents` row per Pi and assign each device its `agent_id`,
   capability document, and an initial versioned `device_policies` row. Do not
   queue commands before these records exist.
3. Set a distinct Worker secret for each agent, named
   `GREENHOUSE_AGENT_SECRET_<AGENT_ID>` with non-alphanumeric characters
   changed to `_` (for example `PI-GH-01` becomes
   `GREENHOUSE_AGENT_SECRET_PI_GH_01`; at least 32 characters). Also set
   `CLOUDFLARE_ACCESS_SERVICE_TOKEN_ID_PI_GH_01` and
   `CLOUDFLARE_ACCESS_SERVICE_AUD` after creating the Access Service Auth app.
   Set browser roles with `GREENHOUSE_ADMIN_EMAILS` and
   `GREENHOUSE_OPERATOR_EMAILS`.
4. Configure Cloudflare Access in the dashboard before exposing browser APIs.
   The staging Worker uses Google sign-in and validates Access JWTs itself; see
   [Google login setup](#cloudflare-access-google-login) below. Keep OAuth
   credentials and approved-user policy in Cloudflare, never in source.
5. On the Pi, copy `edge-agent/docker-compose.example.yml`, set its six
   required cloud values (`GREENHOUSE_API_URL`, `GREENHOUSE_ID`,
   `GREENHOUSE_AGENT_ID`, `GREENHOUSE_AGENT_SECRET`,
   `GREENHOUSE_ACCESS_CLIENT_ID`, `GREENHOUSE_ACCESS_CLIENT_SECRET`) plus LAN
   node token/allow-list values. Keep the environment file owner-only and wait
   for the rollout gate below before starting it. Its persistent volume is the recoverable outbound
   queue, inbound reading dedupe, sensor config cache, and local-policy state.
6. Flash `firmware/esp32` with PlatformIO after assigning each ESP32 a unique
   LAN node token. Firmware calls Pi only; it contains no cloud HMAC secret.

### Inspecting rejected Pi outbox records

The Pi keeps permanent cloud `4xx` rejections in `outbound_quarantine` instead
of deleting telemetry, acknowledgements, or captured images. Inspect records on
the Pi without printing credentials:

```sql
SELECT id, path, status_code, status_text, rejected_at
FROM outbound_quarantine
ORDER BY id;
```

Review `body` locally before replay. To move one corrected record back to the
outbox, replace `<id>` with its numeric quarantine ID and run this transaction
against `/var/lib/greenhouse-agent/agent.db`:

```sql
BEGIN IMMEDIATE;
INSERT INTO outbound_queue(path, body, created_at)
SELECT path, body, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM outbound_quarantine WHERE id = <id>;
DELETE FROM outbound_quarantine WHERE id = <id>;
COMMIT;
```

Do not replay unchanged payloads rejected for permanent validation errors.
Quarantined camera files remain on disk; remove them only after operator review
and a verified backup. Monitor the quarantine count and available Pi disk space.

### Staging deployment

`wrangler.staging.jsonc` binds Worker `smart-greenhouse-ai-staging` to the
remote D1 database `smart-greenhouse-staging`. Verify the Cloudflare account
email and register a `workers.dev` subdomain before publishing:

The agent secret must be at least 32 characters. Staging config sets
`GREENHOUSE_AUTH_MODE=cloudflare-access`; the app returns 503 until the Access
team domain and audience are configured. Complete the Access setup below before
exposing browser APIs. Do not deploy the new agent verifier until Access service
app, Worker secrets, migration, and Pi values are ready. Do not commit secrets or
put them in ESP32 firmware.

The Pi relay adapter remains a simulator. The staging ESP32 firmware reads the
SHT30 on I2C `0x44` (`SDA=21`, `SCL=22`) for the temperature channel; BH1750 and
AB142 remain out of P0. Before adding actuator GPIO code, have an
electrician/hardware owner review the pin map, relay logic level, fused power
path, maximum load runtime, and physical emergency stop.
The Docker image exposes only the LAN sensor HTTP port, defaults every relay to
off, and the cloud cannot initiate a connection to the Pi. To roll back an application
release, deploy the previous Worker/image; do not drop the additive D1 tables
because they contain audit history and queued command evidence.

### Supabase Storage image setup

Create bucket `greenhouse-images` in the existing Supabase project. Set it to
Public read, allow `image/jpeg`, `image/png`, and `image/webp`, and set the file
limit to 10 MiB. Public URLs expose images until the 15-day cleanup cron removes
them; use a private bucket with signed read URLs before handling sensitive
commercial imagery.

Set Storage and browser-role Worker secrets without committing them:

```bash
npx wrangler secret put SUPABASE_URL --config wrangler.staging.jsonc
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.staging.jsonc
npx wrangler secret put SUPABASE_STORAGE_BUCKET --config wrangler.staging.jsonc
npx wrangler secret put GREENHOUSE_ADMIN_EMAILS --config wrangler.staging.jsonc
npx wrangler secret put GREENHOUSE_OPERATOR_EMAILS --config wrangler.staging.jsonc
```

`SUPABASE_SERVICE_ROLE_KEY` is used only by Worker. Browser and Pi receive
short-lived signed upload URLs, never this key. Configure Supabase Storage CORS
for the staging hostname so browser `PUT` requests to signed URLs are allowed.
See [the image API contract](docs/api/images-v1.md) and [the edge API
contract](docs/api/edge-agent-v1.md).

## Cloudflare Access Google login

Cloudflare Access performs the Google login and protects the entire staging
hostname, including browser APIs. The Worker separately verifies
`Cf-Access-Jwt-Assertion` against the Access signing keys, issuer, audience, and
time claims; direct requests to the public `workers.dev` origin cannot bypass
API identity checks.

1. In Google Cloud Console, create a Web OAuth client. Add
   `https://<team>.cloudflareaccess.com` as an authorized JavaScript origin and
   `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback` as an authorized
   redirect URI.
2. In Cloudflare Zero Trust → Integrations → Identity providers, add Google
   using that client ID and client secret. Keep the client secret in Cloudflare.
3. In Access → Applications, create a self-hosted application for the exact
   staging hostname `smart-greenhouse-ai-staging.smart-greenhouse-ai.workers.dev`.
   Set Google as the login method and add an Allow policy containing only
   approved email addresses. Create a separate self-hosted application for the
   same hostname and `/api/agent/*` path. Give it a Service Auth policy scoped
   to the one GH-01 service token. Do not add an Everyone Bypass policy. The
   Worker verifies the app-specific AUD, signed service-token assertion, token
   ID binding, and per-agent HMAC. In Access settings, enable Strict Service
   Token Authentication so bad service credentials return 401/403 rather than
   an interactive login redirect.
4. Copy the Access team domain (`https://<team>.cloudflareaccess.com`) and this
   application's AUD tag. Store the app values as Worker secrets, so a later
   Wrangler deploy cannot replace dashboard-only variables:

   ```bash
   npx wrangler secret put CLOUDFLARE_ACCESS_TEAM_DOMAIN --config wrangler.staging.jsonc
   npx wrangler secret put CLOUDFLARE_ACCESS_AUD --config wrangler.staging.jsonc
   npx wrangler secret put CLOUDFLARE_ACCESS_SERVICE_AUD --config wrangler.staging.jsonc
   npx wrangler secret put GREENHOUSE_ADMIN_EMAILS --config wrangler.staging.jsonc
   npx wrangler secret put GREENHOUSE_OPERATOR_EMAILS --config wrangler.staging.jsonc
   npx wrangler secret put CLOUDFLARE_ACCESS_SERVICE_TOKEN_ID_PI_GH_01 --config wrangler.staging.jsonc
   npx wrangler secret put GREENHOUSE_AGENT_SECRET_PI_GH_01 --config wrangler.staging.jsonc
   ```

   Enter the values only at the interactive prompts. A user allowed by Access
   but absent from both role lists is a viewer. Keep values out of client code
   and logs.
5. After verifying backup and Access setup, confirm staging shows only
   `0005_agent_request_nonces.sql` pending, then apply migrations:

   ```bash
   npx wrangler d1 migrations list smart-greenhouse-staging --remote --config wrangler.staging.jsonc
   npx wrangler d1 migrations apply smart-greenhouse-staging --remote --config wrangler.staging.jsonc
   ```

   Configure the Pi's owner-only environment file. Deploy the new Worker only
   after browser/service-token secrets and Pi values are ready. Roll out both
   together; Worker rejects old HMAC-only requests. Keep the nonce table during
   Worker rollback.
6. Deploy staging with `npx wrangler deploy --config wrangler.staging.jsonc`,
   then start the updated Pi. Open the staging hostname in a private browser window,
   complete Google login, then request `/api/sensors?greenhouseId=GH-01`. Confirm an approved
   viewer receives 200, an unauthenticated request is redirected or denied by
   Access, and a Google identity outside the allow policy is blocked. Unit
   tests cover verifier outcomes for missing or invalid assertions. Confirm
   actual browser/API response codes during the staging smoke test.
   Do not treat successful login alone as evidence that telemetry or hardware
   is commissioned.

The code change protects API routes even when someone calls the `workers.dev`
origin directly. The Access application is still required to provide the Google
login screen and block the whole site before it reaches the Worker.

For Pi, store `GREENHOUSE_ACCESS_CLIENT_ID`,
`GREENHOUSE_ACCESS_CLIENT_SECRET`, and `GREENHOUSE_AGENT_SECRET` in a Pi-only
environment file with owner-only read/write permissions. Worker migration and
Pi credentials must be coordinated: the new verifier rejects old HMAC-only
requests. Back up staging D1, apply migration `0005`, set Worker secrets, and
then roll out the Pi configuration and Worker together. A Worker rollback must
retain the nonce table. Pi treats `401`/`403` auth and scope responses as
retryable so the persistent outbox does not discard readings during this
transition.

## P0 safety configuration

Device commands use `POST /api/device-commands` and require the active server
identity provider plus a server-side role mapping. Configure these as
comma-separated deployment variables/secrets:

```text
GREENHOUSE_ADMIN_EMAILS=admin@example.com
GREENHOUSE_OPERATOR_EMAILS=operator@example.com
```

The command gateway adapter is deliberately fail-closed until it is replaced
with a signed, allow-listed gateway integration. A failed or missing gateway
never changes the UI to show that an actuator has been switched off. The
physical emergency interlock remains a required hardware responsibility.
