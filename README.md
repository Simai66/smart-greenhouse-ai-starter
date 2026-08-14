# Verdant — Smart Greenhouse AI Dashboard

เว็บ workspace สำหรับผู้ดูแลและผู้ปฏิบัติงานโรงเรือน ใช้ดู telemetry, หลักฐานพืช,
การแจ้งเตือน และสถานะอุปกรณ์ โดยเน้นข้อมูลที่ตรวจสอบได้และการควบคุมที่ปลอดภัย

> สถานะปัจจุบัน: browser dashboard เป็น demo ที่ติดป้ายชัดเจน ยังไม่ใช่หลักฐานว่า
> sensor หรือ relay จริงทำงาน จนกว่า D1, Cloudflare Access, Pi, gateway และ QA
> safety gate จะผ่าน

## สิ่งที่มีใน repository

- shadcn/Radix/Tailwind dashboard แบบ responsive สำหรับ 7 หน้า: dashboard, plants,
  AI evidence, devices, analytics, alerts และ settings
- Browser demo state ที่ไม่เติม operational readings หรือ actuator success ปลอม
- API foundation สำหรับ telemetry, heartbeat, sensor config, policy และ command queue
- Signed Pi edge-agent พร้อม local queue, dedupe, retry และ simulator
- ESP32 reference firmware สำหรับส่งข้อมูลเข้า Pi ภายใน LAN
- D1 schema และ additive migrations สำหรับ telemetry, policy, alert และ command audit

## ขอบเขตที่ยังไม่พร้อม production

- Dashboard ยังอ่าน demo store เป็นหลัก; live API ยังไม่ถูกนำมาแทนที่ทั้งหมด
- Command gateway จริงยัง fail closed จนกว่าจะมี signed, allow-listed gateway
- Simulator ไม่ใช่หลักฐาน relay จริง
- ยังไม่มีการยืนยัน Cloudflare Access, deployment secrets, D1 environment หรือ Pi จริง
- R2/camera image evidence, GPIO และ hardware emergency interlock ยังต้อง review

## เริ่มต้นใช้งาน

ต้องมี Node.js >=22.13.0 และ npm

~~~bash
npm install
npm run dev
~~~

คำสั่งตรวจสอบ:

~~~bash
npm run lint
npm run typecheck
npm test
~~~

npm test รวม unit tests, Python edge-agent tests, typecheck, production build
และ rendered HTML smoke tests

คำสั่งเสริม:

~~~bash
npm run build
npm run validate:artifact
npm run db:generate
~~~

ใช้ db:generate เฉพาะเมื่อแก้ schema และต้อง review migration ก่อน apply จริง

## โครงสร้างสำคัญ

- app/ — page routes และ API routes
- components/greenhouse/ — active dashboard UI และ page views
- components/ui/ — shadcn primitives ที่ใช้ร่วมกัน
- lib/greenhouse-demo-store.ts — source of truth ของ browser demo
- lib/greenhouse-presentation.ts — presentation/view-model adapter
- lib/server/ — auth, validation, policy และ command safety
- db/ — Drizzle schema และ D1 access
- drizzle/ — migrations ที่ต้อง apply ตามลำดับ
- edge-agent/ — Pi agent, local queue และ simulator tests
- firmware/esp32/ — ESP32 reference firmware
- docs/api/edge-agent-v1.md — API contract สำหรับ Pi/Worker
- docs/feature-cards/ — acceptance criteria, backlog และ release gate

## Demo, live telemetry และ physical state

ระบบแยกข้อมูลสามชั้น:

1. Demo state — local browser state สำหรับพัฒนาและสาธิต
2. Live telemetry — ค่าจาก API พร้อม fresh, stale, missing, quality และ config version
3. Physical state — สถานะที่ Pi/อุปกรณ์รายงานหลังคำสั่งได้รับ acknowledgement

ห้ามใช้ demo value หรือ simulator output เป็นหลักฐานอุปกรณ์จริง
Command ต้องเดินตาม pending → acknowledged หรือ failed; timeout, offline
และ rejection ต้องไม่เปลี่ยน UI เป็น success

## Cloudflare bindings และ D1

ไฟล์ .openai/hosting.json ระบุชื่อ binding ที่ runtime ใช้:

- DB — Cloudflare D1 สำหรับ telemetry, policy, alert และ command audit
- IMAGES — Cloudflare R2 สำหรับภาพกล้อง/AI เมื่อ image evidence พร้อม

ไฟล์นี้ระบุชื่อ binding เท่านั้น ไม่ได้สร้าง resource หรือยืนยันว่า account เชื่อมแล้ว
ต้องแยก database ระหว่าง staging กับ production และห้ามใส่ token, secret หรือข้อมูล
ส่วนตัวลงใน source control

### สร้างและตรวจ D1

Login ด้วย Wrangler แล้วตรวจ database ที่มีอยู่:

~~~bash
npx wrangler login
npx wrangler d1 list
~~~

ตัวอย่างสร้าง staging database ชื่อด้านล่างเท่านั้น ไม่ใช่ชื่อ production ที่บังคับใช้:

~~~bash
npx wrangler d1 create smart-greenhouse-staging --binding DB --location apac
~~~

หลังเลือก target database แล้ว apply migrations ผ่าน remote database:

~~~bash
npx wrangler d1 migrations apply smart-greenhouse-staging --remote
npx wrangler d1 execute smart-greenhouse-staging --remote --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
~~~

เปลี่ยน smart-greenhouse-staging เป็นชื่อ database ของ environment ที่อนุมัติ
Migration ปัจจุบันคือ drizzle/0000_p0_foundation.sql,
0001_edge_agent_and_policies.sql และ 0002_sensor_configs_and_reading_ids.sql ตามลำดับ

migrations apply ต้องผ่าน review ก่อน production; Wrangler จะขอ confirmation และ
สร้าง backup ก่อน apply. ห้าม drop ตาราง audit/history/queue เพื่อ rollback ให้ deploy
Worker/image รุ่นก่อนแทน

### R2

ยังไม่ต้องสร้าง R2 สำหรับ dashboard demo. สร้างและผูก bucket เป็น IMAGES เมื่อมี
camera upload, image retention, access policy และ QA สำหรับ image evidence แล้ว

## Real-operation checklist

ทำตาม dependency order:

1. สร้าง D1 target และ apply migrations 0000 → 0001 → 0002
2. ผูก D1 จริงเข้ากับ binding DB ของ deployment environment
3. เพิ่ม edge_agents, devices, capabilities และ versioned device policies
4. ตั้ง secrets ใน deployment environment เท่านั้น:
   - GREENHOUSE_AGENT_SECRET_<AGENT_ID> — secret แยกต่อ Pi ความยาวอย่างน้อย 32 ตัวอักษร
   - GREENHOUSE_ADMIN_EMAILS — รายชื่อ admin คั่นด้วย comma
   - GREENHOUSE_OPERATOR_EMAILS — รายชื่อ operator คั่นด้วย comma
5. ตั้ง Cloudflare Access ป้องกัน public hostname และจำกัด identity/group ที่อนุมัติ
6. ตั้งค่า Pi agent และ LAN node tokens; ห้ามใส่ cloud HMAC secret ใน ESP32
7. ทดสอบ bad HMAC, stale telemetry, duplicate/expired command, delayed ACK, offline Pi,
   policy rejection และ emergency-stop rejection
8. ให้ QA ตรวจ keyboard, responsive, accessibility, negative paths และ security input

อ่าน edge-agent API contract และ real-greenhouse roadmap ก่อน provision:

- docs/api/edge-agent-v1.md
- docs/roadmaps/real-greenhouse-next-steps.md

## Safety และ rollback

- Auth และ authorization ต้อง fail closed
- Device command สำเร็จได้เมื่อมี acknowledgement จริงเท่านั้น
- Secret อยู่ใน Cloudflare/Pi environment ไม่อยู่ใน client, source หรือ log
- Migration ต้อง additive และรักษา audit evidence กับ queued command evidence
- ก่อนใช้ GPIO จริง ต้อง review pin map, relay logic level, fuse, load limit, watchdog
  และ physical emergency stop โดย hardware owner/electrician
- หาก release มีปัญหา ให้ deploy Worker/image รุ่นก่อน; ห้ามลบ D1 tables เพื่อ rollback

## Troubleshooting

### Cloudflare D1 binding DB is unavailable

ตรวจว่า deployment environment ผูก database จริงกับ binding ชื่อ DB แล้ว
การมี d1: DB ใน .openai/hosting.json อย่างเดียวไม่พอ

### Wrangler บอกว่า login หมดอายุ

รัน npx wrangler login ใหม่ หรือใช้ CLOUDFLARE_API_TOKEN ใน environment ที่ปลอดภัย
ห้ามส่ง token ผ่าน chat หรือ commit ลง repository

### หน้าเว็บไม่มี telemetry หรือ actuator state

เป็น behavior ที่คาดไว้ของ demo จนกว่าจะเชื่อม live API, Pi และ gateway ที่ผ่าน safety gate

## Contribution checklist

ก่อนส่งงาน:

1. อ่าน AGENTS.md, rule.md และ active feature card
2. ตรวจ git status และแก้เฉพาะไฟล์ใน scope
3. ไม่เพิ่มข้อมูล operation ปลอม หรือเคลม physical state จาก simulator
4. รัน npm test, npm run lint และ git diff --check ตามความเสี่ยง
5. บันทึก command, ผลจริง, residual risk และงานที่ role อื่นต้องทำต่อ

รายละเอียด product, design และ operation อยู่ใน PRODUCT.md, design.md,
docs/feature-cards/ และ docs/api/
