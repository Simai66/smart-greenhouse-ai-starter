# แผนภาพโครงสร้างฐานข้อมูล (ER Diagram)

แผนภาพนี้อ้างอิง schema ปัจจุบันจาก `db/schema.ts` และ migration ใน `drizzle/` สำหรับฐานข้อมูล Cloudflare D1 (SQLite)

![Smart Greenhouse database ER diagram](./database-er-diagram-clean.png)

- [เปิดไฟล์ SVG](./database-er-diagram.svg) สำหรับซูมโดยไม่แตก
- Source สำหรับแก้ layout: `database-er-diagram.dot`

## Mermaid source

```mermaid
erDiagram
    GREENHOUSES ||--o{ EDGE_AGENTS : "มี"
    GREENHOUSES ||--o{ DEVICES : "มี"
    GREENHOUSES ||--o{ SENSOR_CONFIGS : "ตั้งค่า"
    GREENHOUSES ||--o{ SENSOR_READINGS : "บันทึก"
    GREENHOUSES ||--o{ DEVICE_COMMANDS : "ออกคำสั่ง"
    GREENHOUSES ||--o{ DEVICE_POLICIES : "กำหนดนโยบาย"
    GREENHOUSES ||--o{ DETECTIONS : "ตรวจพบ"
    GREENHOUSES ||--o{ ALERTS : "แจ้งเตือน"

    EDGE_AGENTS o|--o{ DEVICES : "ควบคุม"
    DEVICES ||--o{ SENSOR_READINGS : "ส่งค่าจากเซ็นเซอร์"
    DEVICES ||--o| SENSOR_CONFIGS : "เป็นเซ็นเซอร์"
    DEVICES ||--o{ DEVICE_COMMANDS : "รับคำสั่ง"
    DEVICES ||--o| DEVICE_POLICIES : "มีนโยบายปัจจุบัน"
    DEVICES ||--o{ DEVICE_POLICY_REVISIONS : "มีประวัตินโยบาย"
    DEVICE_COMMANDS ||--o{ DEVICE_COMMAND_EVENTS : "มีเหตุการณ์"

    GREENHOUSES {
        string id PK
        string name
        string timezone
        string created_at
    }

    EDGE_AGENTS {
        string id PK
        string greenhouse_id FK
        string name
        string status
        string last_seen_at "nullable"
        string created_at
    }

    DEVICES {
        string id PK
        string greenhouse_id FK
        string agent_id FK "nullable"
        string name
        string category
        string capabilities_json
        string reported_status
        string last_seen_at "nullable"
        string updated_at
    }

    SENSOR_READINGS {
        string id PK
        string reading_id UK "nullable; retry dedupe"
        string greenhouse_id FK
        string sensor_id FK
        string metric
        string value
        string unit
        string sampled_at
        string received_at
        string quality
        int config_version "nullable"
    }

    SENSOR_CONFIGS {
        string sensor_id PK, FK
        string greenhouse_id FK
        string name
        string metric
        string unit
        int sampling_interval_seconds
        string calibration_scale
        string calibration_offset
        int enabled
        string min_threshold "nullable"
        string max_threshold "nullable"
        int config_version
        string created_by
        string updated_by
        string created_at
        string updated_at
    }

    DEVICE_COMMANDS {
        string id PK
        string greenhouse_id FK
        string device_id FK
        string action
        string state
        string idempotency_key UK
        string requested_by
        string requested_at
        string correlation_id "nullable"
        string expires_at "nullable"
        int max_runtime_seconds "nullable"
        string dispatched_at "nullable"
        string acknowledged_at "nullable"
        string failure_reason "nullable"
    }

    DEVICE_COMMAND_EVENTS {
        string id PK
        string command_id FK
        string state
        string occurred_at
        string metadata_json "nullable"
    }

    DEVICE_POLICIES {
        string device_id PK, FK
        string greenhouse_id FK
        int version
        string policy_json
        string updated_by
        string updated_at
    }

    DEVICE_POLICY_REVISIONS {
        string id PK
        string device_id FK
        int version
        string policy_json
        string updated_by
        string updated_at
    }

    DETECTIONS {
        string id PK
        string greenhouse_id FK
        string plant_id "logical reference"
        string image_key
        string model_version
        string classification
        string confidence
        string severity
        string detected_at
    }

    ALERTS {
        string id PK
        string greenhouse_id FK
        string source "polymorphic reference"
        string severity
        string title
        string status
        string opened_at
        string resolved_at "nullable"
        string resolved_by "nullable"
    }
```

## ความสัมพันธ์หลัก

- โรงเรือนหนึ่งแห่งมี edge agent, อุปกรณ์, sensor reading, คำสั่ง, detection และ alert ได้หลายรายการ
- edge agent หนึ่งตัวควบคุมอุปกรณ์ได้หลายตัว แต่อุปกรณ์ยังไม่จำเป็นต้องผูก agent (`agent_id` เป็น nullable)
- อุปกรณ์หนึ่งตัวมีนโยบายปัจจุบันได้สูงสุดหนึ่งรายการ และมี revision history ได้หลายรายการ
- คำสั่งอุปกรณ์หนึ่งรายการมี event log ได้หลายรายการ
- `sensor_readings.sensor_id` อ้างถึงอุปกรณ์ประเภทเซ็นเซอร์ใน `devices.id`
- `sensor_configs` เป็น source of truth สำหรับ metric, calibration, sampling, enable state และ threshold ของ sensor channel
- `sensor_readings.reading_id` เป็น stable idempotency key สำหรับ retry จาก edge agent

## ข้อสังเกตจาก schema ปัจจุบัน

- ความสัมพันธ์ทั้งหมดในภาพเป็น **logical foreign keys**; migration ปัจจุบันสร้าง index แต่ยังไม่ได้ประกาศ SQLite `FOREIGN KEY` constraints
- `detections.plant_id` ยังไม่มีตาราง `plants` ให้บังคับความสัมพันธ์
- `alerts.source` เป็น polymorphic text ยังไม่อ้างถึงตารางใดโดยตรง
- `capabilities_json`, `policy_json` และ `metadata_json` เก็บ JSON ในคอลัมน์ `TEXT`
- ข้อมูล demo ฝั่ง browser เช่น zone, crop batch, plant, camera และ sensor configuration ยังอยู่ใน local state/localStorage ไม่ใช่ตาราง D1
