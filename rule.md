# Smart Greenhouse Work Rules

## Scope

- ใช้กับ feature, bug fix, API, database, authentication, deployment และเอกสารใน repo นี้
- `AGENTS.md` เป็น workflow หลัก; ไฟล์นี้เพิ่มกฎเฉพาะระบบ Smart Greenhouse
- Active milestone: [`docs/feature-cards/2026-08-11-pm-release-readiness.md`](docs/feature-cards/2026-08-11-pm-release-readiness.md)
- Release posture: dashboard เป็น demo จนกว่า real-operation safety gate ใน feature card จะผ่าน
- Main agent รับผิดชอบผลลัพธ์สุดท้าย และเปิดใช้เฉพาะ role ที่จำเป็น
- กฎขัดกันหรือ requirement ยังเปลี่ยนผลลัพธ์ได้: หยุด ระบุ conflict แล้วขอ decision

## Recap: ห้ามทำ / ต้องทำแบบไหน

| ห้ามทำ | ต้องทำแบบไหน |
|---|---|
| เริ่มแก้โค้ดโดยไม่มี acceptance criteria | สร้าง feature card และกำหนด scope ก่อน |
| เดา behavior เมื่อ docs กับ code ขัดกัน | ระบุ conflict แล้วขอ decision |
| เขียน helper, abstraction หรือเพิ่ม package ซ้ำของเดิม | ค้นหาและ reuse pattern ที่มีอยู่ก่อน |
| ผสม shadcn กับ design system ใหม่ | ใช้ shadcn/Radix/Tailwind implementation ปัจจุบัน |
| เติมข้อมูล sensor/device ปลอมให้ดูเหมือนระบบจริง | แยก demo จาก real state และติดป้ายให้ชัด |
| แสดง actuator สำเร็จก่อน acknowledgement | รอ `acknowledged`; failure/offline ต้องคงสถานะไม่สำเร็จ |
| รับ input หรือเก็บ secret โดยไม่ validate/protect | validate ที่ boundary และเก็บ secret ใน environment เท่านั้น |
| ลบ D1 audit/history/queue หรือทำ migration เสี่ยงโดยไม่ review | ใช้ additive migration และเตรียม rollback |
| overwrite user changes, reset repo หรือขยาย scope เงียบ ๆ | ตรวจ `git status`, แก้เฉพาะไฟล์ที่เกี่ยวข้อง และบันทึก backlog |
| อ้างว่า test/lint/build ผ่านโดยไม่รัน | รัน check ตาม risk และรายงานผลจริงใน handoff |

## Before coding

- สร้าง feature card ก่อนลงมือ:
  - user outcome และ acceptance criteria ที่ตรวจได้
  - in-scope / out-of-scope
  - พื้นที่กระทบ: UI, API/database, deployment
  - assumption, unknown, risk
  - owner และ dependency order
- อ่านโค้ดและ caller ที่เกี่ยวข้องก่อนแก้ ใช้ pattern/helper/type เดิมก่อนเพิ่มของใหม่
- เพิ่ม dependency หรือ abstraction เฉพาะเมื่อของเดิมและ platform ใช้ไม่ได้; บันทึกเหตุผลใน feature card
- ตรวจ `git status` และรักษา user changes ที่มีอยู่ ห้าม reset หรือ overwrite งานที่ไม่เกี่ยวข้อง

## Sources of truth

- Product และ operation: `README.md`, `PRODUCT.md`, `docs/feature-cards/`, API contract ที่เกี่ยวข้อง
- UI/UX: `design.md` และ implementation ปัจจุบันใน `components/greenhouse/` กับ `components/ui/`
- Browser demo state: `lib/greenhouse-demo-store.ts`
- Presentation/view model: `lib/greenhouse-presentation.ts`
- Server rules และ validation: `lib/server/`, `app/api/`
- Persistence และ edge runtime: `db/`, `drizzle/`, `worker/`, `edge-agent/`
- ถ้าเอกสารกับโค้ดขัดกัน: ห้ามเดา; ระบุ conflict และอัปเดต source of truth ที่เหมาะสม

## UI rules

- ใช้ shadcn/Radix/Tailwind patterns ที่มีอยู่; ห้ามสร้าง design system ที่สองหรือเพิ่ม generic scaffold
- ยึด approved light baseline ใน `design.md`: botanical green, readable hierarchy, responsive desktop/tablet/mobile
- ทุก control ต้องใช้ semantic HTML, keyboard ได้, focus ชัด, hit area อย่างน้อย 44px และเคารพ `prefers-reduced-motion`
- รองรับ loading, empty, error, stale, offline และ pending states เมื่อ flow มีสถานะเหล่านี้
- ใช้ token/CSS variable และ component props ก่อน raw color/size; raw value ใช้เฉพาะ token หรือกรณีมีเหตุผลชัดเจน
- ห้ามสร้างข้อมูล operation ปลอมเพื่อทำให้หน้าดูสมบูรณ์; demo ต้องแยกและติดป้ายชัดเจน
- UI ห้ามรายงาน actuator สำเร็จจนกว่าจะได้รับ acknowledgement จริง

## API, auth, database, device safety

- API ใหม่หรือ API ที่เปลี่ยนต้องมี contract ก่อน frontend integration: method/path, auth, request/response, error format, pagination และ edge cases
- Validate และจำกัด user-controlled input ที่ trust boundary; error response ต้องสม่ำเสมอและไม่เปิดเผย secret
- Authentication และ authorization ต้อง fail closed; secret อยู่ใน deployment environment เท่านั้น ห้ามใส่ใน client, source หรือ log
- Device command lifecycle: `pending` → `acknowledged` หรือ `failed`; timeout, offline และ rejection ห้ามเปลี่ยน UI เป็น success
- Emergency stop ต้องยืนยันก่อนส่งคำสั่ง; physical interlock และ electrician/hardware review ยังเป็นข้อบังคับ
- D1/Drizzle migration ต้อง additive และ review rollback; ห้ามลบ audit history, queued command evidence หรือข้อมูล operation โดยพลการ
- Simulator, demo store และ real device state ต้องไม่ถูกนำเสนอปะปนกัน

## Role flow

| Change | Order |
|---|---|
| UI/client only | Frontend → QA |
| API/database/auth | Backend → Frontend เมื่อจำเป็น → QA |
| UI + new/changed API | Backend contract → Backend + Frontend → QA integration |
| CI/CD/deployment/infrastructure | DevOps → QA smoke |
| Small isolated defect | Scope owner → targeted QA |

- QA ตรวจ happy path, edge case, failure, regression, accessibility, security input และ responsive behavior
- QA ไม่แก้โค้ดเองเว้นแต่ได้รับมอบหมาย; รายงาน severity, reproduction, expected และ actual
- งานที่ไม่เกี่ยวข้องให้บันทึกเป็น note/backlog ห้ามขยาย scope

## Verification commands

ใช้ Node.js `>=22.13.0` และ npm

| Check | Command |
|---|---|
| Install | `npm install` |
| Dev server | `npm run dev` |
| File-scoped lint | `bash scripts/sites-env.sh -- eslint <changed-files>` |
| Typecheck | `npx tsc --noEmit` |
| Targeted TypeScript test | `node --experimental-strip-types --test tests/<file>.test.ts` |
| Targeted JavaScript test | `node --test tests/<file>.test.mjs` |
| Python tests | `python3 -m unittest discover -s edge-agent -p 'test_*.py'` |
| Production build | `npm run build` |
| Full gate | `npm test` |

- Docs-only change: ตรวจ diff และ `git diff --check`; ไม่ต้องรัน full gate โดยไม่มี code impact
- UI/API/runtime change: รัน targeted tests, lint, typecheck และ build ตามความเสี่ยง
- ก่อน handoff ให้ระบุ command ที่รันและผลลัพธ์จริง ห้ามอ้างว่า pass โดยไม่รัน

## Definition of done

- Acceptance criteria ผ่าน และไม่มี requirement ที่ยังตีความสองแบบ
- Relevant tests, lint, typecheck, build และ QA ผ่านตาม scope
- UI ผ่าน keyboard, responsive และ accessibility checks เมื่อเกี่ยวข้อง
- API input validation, auth, error contract และ migration/rollback ครบเมื่อเกี่ยวข้อง
- Handoff ภาษาไทยต้องมี:
  1. files/config ที่เปลี่ยนและ verification
  2. งานที่ role อื่นต้องทำต่อ
  3. risk, trade-off และ out-of-scope
- Commit/push ทำเมื่อผู้ใช้ร้องขอหรือ workflow อนุมัติ; AI commit ต้องมี attribution ของ model
