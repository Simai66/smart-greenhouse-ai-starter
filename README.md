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

## โครงสร้างสำคัญ

```text
app/
  api/sensors/route.ts       # ตัวอย่าง sensor API response
  globals.css                # Design tokens + responsive UI ทั้งระบบ
  layout.tsx                 # Metadata และ Inter font
  page.tsx                   # Application entry
components/
  dashboard/                 # Dashboard และ sensor overview
  plants/                    # Plant Monitoring
  ai/                        # AI Detection workflow
  devices/                   # Device control + safety feedback
  analytics/                 # Historical trends
  alerts/                    # Alert review / resolve flow
  settings/                  # Configuration starter
  ui/                        # Shared small components
lib/
  mock-data.ts               # ข้อมูลจำลองสำหรับ UI
  greenhouse-api.ts          # Adapter สำหรับเชื่อม backend จริง
types/
  greenhouse.ts              # Shared domain types
```

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
- Cloudflare R2: เก็บภาพพืชจากกล้อง
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

1. Apply `drizzle/0000_p0_foundation.sql` then
   `drizzle/0001_edge_agent_and_policies.sql` to the production D1 database.
2. Insert one `edge_agents` row per Pi and assign each device its `agent_id`,
   capability document, and an initial versioned `device_policies` row. Do not
   queue commands before these records exist.
3. Set a distinct Worker secret for each agent, named
   `GREENHOUSE_AGENT_SECRET_<AGENT_ID>` (at least 32 characters). Set browser
   roles with `GREENHOUSE_ADMIN_EMAILS` and `GREENHOUSE_OPERATOR_EMAILS`.
4. Configure Cloudflare Access in the Cloudflare dashboard: protect the public
   hostname, use Google as an identity provider, and let only approved email
   addresses/groups reach the application. This cannot be safely represented
   by a source-controlled application secret.
5. On the Pi, copy `edge-agent/docker-compose.example.yml`, set its four
   required values, and start it with Docker Compose. Its persistent volume is
   the recoverable outbound queue and local-policy state.

The supplied edge relay and sensor adapters are simulators. Before substituting
GPIO code, have an electrician/hardware owner review the pin map, relay logic
level, fused power path, maximum load runtime, and physical emergency stop.
The Docker image exposes no inbound port, defaults every relay to off, and the
cloud cannot initiate a connection to the Pi. To roll back an application
release, deploy the previous Worker/image; do not drop the additive D1 tables
because they contain audit history and queued command evidence.

## P0 safety configuration

Device commands now use `POST /api/device-commands` and require the hosted
ChatGPT identity headers plus a server-side role mapping. Configure these as
deployment secrets (comma-separated email addresses):

```text
GREENHOUSE_ADMIN_EMAILS=admin@example.com
GREENHOUSE_OPERATOR_EMAILS=operator@example.com
```

The command gateway adapter is deliberately fail-closed until it is replaced
with a signed, allow-listed gateway integration. A failed or missing gateway
never changes the UI to show that an actuator has been switched off. The
physical emergency interlock remains a required hardware responsibility.
