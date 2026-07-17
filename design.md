---
name: SmartGreenhouse
description: Premium dark-mode AI and IoT greenhouse monitoring dashboard
version: "1.0"
platforms:
  - Web Desktop
  - Web Tablet
  - Mobile Web
  - Progressive Web App
theme:
  default: dark
  future:
    - light
colors:
  primary: "#22C55E"
  primary-hover: "#16A34A"
  primary-soft: "rgba(34,197,94,0.12)"
  accent: "#84CC16"
  background: "#08120E"
  surface: "#101A16"
  card: "#14211B"
  card-hover: "#1A2A22"
  border: "rgba(255,255,255,0.08)"
  text-primary: "#FFFFFF"
  text-secondary: "#B7C5BD"
  text-muted: "#6F7C74"
  healthy: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
  information: "#3B82F6"
  offline: "#6B7280"
typography:
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  display:
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  h1:
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  h2:
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.25
  h3:
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  small:
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
layout:
  desktopFrame: "1440px"
  desktopContentMaxWidth: "1280px"
  sidebarWidth: "240px"
  topbarHeight: "72px"
  mobileBreakpoint: "768px"
  tabletBreakpoint: "1024px"
  grid: "12 columns"
  spacingSystem: "8pt"
rounded:
  small: "8px"
  medium: "12px"
  large: "20px"
  modal: "24px"
motion:
  fast: "120ms"
  normal: "200ms"
  slow: "320ms"
---

# Smart Greenhouse — UI/UX Design Specification

## 1. Document Purpose

เอกสารฉบับนี้กำหนดแนวทางการออกแบบส่วนติดต่อผู้ใช้ของระบบ **Smart Greenhouse – AI-Powered Plant Health Monitoring** อย่างละเอียด ตั้งแต่หน้า Landing Page ไปจนถึง Dashboard, Plant Monitoring, AI Detection, Device Control, Analytics, Alerts, Settings และ Mobile Version

เอกสารนี้ใช้เป็นข้อมูลอ้างอิงร่วมกันสำหรับ

- UI/UX Designer
- Figma Designer
- Frontend Developer
- React / Next.js Developer
- Mobile Developer
- Project Advisor
- Thesis Documentation
- QA และ Software Tester

เป้าหมายคือทำให้ทุกหน้าของระบบมีโครงสร้าง รูปแบบ และพฤติกรรมที่สอดคล้องกัน พร้อมนำไปสร้างเป็น Figma Prototype หรือพัฒนาเป็นระบบจริงได้โดยตรง

---

# 2. Product Vision

Smart Greenhouse เป็นระบบจัดการโรงเรือนอัจฉริยะที่รวมข้อมูลจากเซนเซอร์ อุปกรณ์ IoT กล้อง และระบบปัญญาประดิษฐ์ไว้ในแพลตฟอร์มเดียว

ผู้ใช้ต้องสามารถตอบคำถามสำคัญได้ภายในเวลาไม่กี่วินาที เช่น

- ตอนนี้อุณหภูมิภายในโรงเรือนเป็นอย่างไร
- ความชื้นในดินเพียงพอหรือไม่
- พืชต้นใดกำลังมีปัญหา
- AI ตรวจพบโรคหรือความผิดปกติหรือไม่
- ปั๊มน้ำหรือพัดลมกำลังทำงานอยู่หรือไม่
- มีการแจ้งเตือนใดที่ต้องรีบจัดการ
- แนวโน้มสภาพแวดล้อมในช่วงที่ผ่านมาเป็นอย่างไร

ระบบจึงต้องเน้นความชัดเจน ความเร็วในการอ่านข้อมูล และความปลอดภัยในการควบคุมอุปกรณ์

---

# 3. Creative Direction

## 3.1 Creative North Star

**“A Premium AI Operations Center for Living Plants”**

หน้าตาของระบบควรสื่อถึงศูนย์ควบคุมที่ทันสมัย แต่ยังคงความรู้สึกเป็นธรรมชาติ สงบ และเป็นมิตร

ระบบไม่ควรดูเหมือนหน้าจอวิศวกรรมที่ซับซ้อนเกินไป และไม่ควรใช้ภาพลักษณ์แบบ Hacker Terminal ที่มีสี Neon จำนวนมาก

## 3.2 Design Keywords

- Modern
- Minimal
- Premium
- Natural
- Calm
- Trustworthy
- Intelligent
- Data-focused
- AI-powered
- IoT-connected
- Real-time
- Accessible
- Responsive
- Professional
- Portfolio-ready

## 3.3 Visual Inspiration

- Apple — ความสะอาดและลำดับชั้นของข้อมูล
- Linear — Dark SaaS UI และการจัดองค์ประกอบที่แม่นยำ
- Vercel — พื้นที่ว่างและความคมของ Typography
- Notion — ความเรียบง่ายในการใช้งาน
- Stripe — การนำเสนอข้อมูลอย่างเป็นระบบ
- Modern agriculture platforms — การผสมผสานข้อมูลกับภาพพืชจริง

---

# 4. Core UX Principles

## 4.1 Important Information First

ค่าที่สำคัญที่สุดต้องปรากฏก่อนรายละเอียดรอง โดยเฉพาะ

- Plant Health
- Critical Alerts
- Temperature
- Humidity
- Soil Moisture
- Device Status

## 4.2 Scan in Three Seconds

ผู้ใช้ควรเข้าใจสถานะภาพรวมของโรงเรือนได้ภายในสามวินาที โดยไม่ต้องเปิดกราฟหรือหน้ารายละเอียด

## 4.3 Action Near Information

ปุ่มหรือคำสั่งที่เกี่ยวข้องควรอยู่ใกล้ข้อมูลนั้น เช่น Card ของปั๊มน้ำควรมี Toggle และ Schedule ภายใน Card เดียวกัน

## 4.4 AI Must Explain

AI ไม่ควรแสดงเพียงคำว่า Healthy หรือ Unhealthy แต่ต้องแสดง

- Confidence
- Detected condition
- Severity
- Recommended action
- Detection time

## 4.5 Safe Device Control

คำสั่งที่อาจส่งผลต่อโรงเรือนต้องมีสถานะตอบกลับ เช่น

- Sending command
- Command successful
- Device offline
- Failed to respond

## 4.6 Responsive by Priority

บนหน้าจอเล็กไม่ควรย่อทุกอย่างลงอย่างเดียว แต่ต้องลดข้อมูลรองและคงเฉพาะข้อมูลที่จำเป็นต่อการตัดสินใจ

---

# 5. Design Tokens

## 5.1 Color Palette

### Primary Green

`#22C55E`

ใช้สำหรับ

- Primary CTA
- Toggle ON
- Active navigation
- Healthy status
- Success feedback
- Important chart highlights

### Primary Hover

`#16A34A`

ใช้เมื่อ Hover หรือ Pressed

### Primary Soft

`rgba(34,197,94,0.12)`

ใช้เป็นพื้นหลังของ

- Active menu
- Status badge
- Selected filter
- Highlighted icon container

### Accent Lime

`#84CC16`

ใช้เพียงเล็กน้อยกับ

- Positive trend
- Decorative glow
- Micro-interaction
- Energy-related information

### Background

`#08120E`

พื้นหลังหลักของระบบ

### Surface

`#101A16`

ใช้กับ

- Sidebar
- Topbar
- Secondary panel
- Modal backdrop container

### Card

`#14211B`

ใช้กับ

- KPI card
- Device card
- Chart card
- Alert card
- Plant card

### Card Hover

`#1A2A22`

### Border

`rgba(255,255,255,0.08)`

### Text Primary

`#FFFFFF`

### Text Secondary

`#B7C5BD`

### Text Muted

`#6F7C74`

## 5.2 Semantic Colors

### Healthy

`#22C55E`

### Warning

`#F59E0B`

### Danger

`#EF4444`

### Information

`#3B82F6`

### Offline

`#6B7280`

## 5.3 Color Usage Rules

- สีเขียวใช้กับสถานะปกติและ Action หลักเท่านั้น
- สีแดงห้ามใช้เพื่อการตกแต่ง
- สีสถานะต้องมีข้อความหรือไอคอนประกอบ
- กราฟหลายเส้นต้องใช้สีที่แยกกันได้ชัดเจน
- ค่า Disabled ต้องไม่เหมือน Offline status
- Background และ Card ต้องแตกต่างกันพอให้เห็นโครงสร้าง

---

# 6. Typography

## 6.1 Font Family

Primary font:

`Inter`

Fallback:

`system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`

## 6.2 Type Scale

### Display

- 48px
- Weight 700
- ใช้กับ Hero Heading

### H1

- 36px
- Weight 700
- ใช้กับชื่อหน้าหลัก

### H2

- 28px
- Weight 600
- ใช้กับชื่อ Section

### H3

- 22px
- Weight 600
- ใช้กับ Card หรือ Subsection

### Body

- 16px
- Weight 400
- ใช้กับข้อความหลัก

### Small

- 14px
- Weight 400
- ใช้กับคำอธิบายและข้อมูลรอง

### Caption

- 12px
- Weight 400–500
- ใช้กับ Timestamp, Badge และ Metadata

## 6.3 Number Formatting

ค่าจากเซนเซอร์ต้องอ่านง่าย เช่น

- `28.5°C`
- `65%`
- `42%`
- `12,500 lux`
- `92% confidence`

จำนวนทศนิยมต้องสม่ำเสมอตามชนิดข้อมูล

---

# 7. Spacing and Grid

## 7.1 Base Spacing

ใช้ระบบ 8pt

- 4px — Micro spacing
- 8px — Icon และ Label
- 12px — Compact elements
- 16px — Standard spacing
- 24px — Card padding
- 32px — Section spacing
- 48px — Major section
- 64px — Landing section

## 7.2 Desktop Grid

- Frame width: 1440px
- Sidebar: 240px
- Main content: Flexible
- Page padding: 24–32px
- 12-column grid
- Card gap: 16–24px

## 7.3 Tablet

- Sidebar collapses to icon navigation
- Two-column card layout
- Charts retain full width
- Main padding: 20px

## 7.4 Mobile

- Single-column layout
- Bottom navigation
- Horizontal filter scrolling
- Page padding: 16px
- Card gap: 12–16px

---

# 8. Global Application Shell

## 8.1 Sidebar

### Structure

1. Brand logo
2. Main navigation
3. Monitoring navigation
4. System navigation
5. User or logout area

### Navigation Items

- Dashboard
- Plants
- AI Detection
- Devices
- Analytics
- Alerts
- Schedule
- Settings

### Active State

- Soft green background
- Primary green icon
- White text
- Optional subtle glow

### Hover State

- Card hover background
- Text becomes primary
- Transition 120–200ms

### Collapsed State

- Width approximately 72px
- Display icons only
- Tooltip appears on hover
- Active status remains visible

## 8.2 Topbar

### Left Area

- Page title or breadcrumb
- Optional greenhouse selector

### Center Area

- Global search
- Search placeholder: `Search plants, devices, or alerts`

### Right Area

- System status
- Notification bell
- User avatar
- Profile dropdown

### Notification Badge

- Show unread count
- Maximum display `9+`
- Danger color only when critical alert exists

## 8.3 Main Content

- Scrollable vertically
- Maximum content width may be applied on very large screens
- Sticky topbar
- Page title area remains compact

---

# 9. Global Components

## 9.1 Buttons

### Primary Button

- Background: Primary Green
- Text: White
- Height: 44px
- Radius: 12px
- Horizontal padding: 16–20px
- Icon gap: 8px

States:

- Default
- Hover
- Pressed
- Focus
- Loading
- Disabled

### Secondary Button

- Background: Card
- Border: 1px
- Text: White

### Ghost Button

- Transparent
- Text: Secondary
- Hover background: Card Hover

### Danger Button

- Red background
- ใช้เฉพาะ Action ที่มีความเสี่ยง

## 9.2 Inputs

- Height: 44–48px
- Radius: 12px
- Background: Surface or Card
- Border: 1px
- Placeholder: Muted text
- Focus ring: Primary Green

States:

- Empty
- Filled
- Focus
- Error
- Disabled
- Read-only

## 9.3 Select and Dropdown

- Same height as Input
- Chevron icon
- Dropdown layer uses Surface
- Selected row uses Primary Soft
- Keyboard navigation supported

## 9.4 Toggle

### ON

- Track: Primary Green
- Knob: White
- Status label: On

### OFF

- Track: Offline Gray
- Knob: White
- Status label: Off

### Loading

- Prevent repeated click
- Show small spinner or pending state

### Offline Device

- Disable toggle
- Show Offline badge
- Tooltip explains reason

## 9.5 Badge

Types:

- Healthy
- Warning
- Critical
- Information
- Offline
- Live
- Auto
- Manual

Badge must include text, not color alone

## 9.6 Modal

- Width based on content
- Max width 560px for standard dialogs
- Radius 24px
- Background Surface
- Header, content, action footer
- Close button at top right

## 9.7 Toast

Positions:

- Desktop: top-right
- Mobile: top-center

Types:

- Success
- Error
- Warning
- Information

## 9.8 Loading Skeleton

ใช้กับ

- KPI cards
- Plant grid
- Camera feed
- Chart
- Alert list

Skeleton ต้องมีรูปร่างใกล้เคียงเนื้อหาจริง

## 9.9 Empty State

ประกอบด้วย

- Icon or illustration
- Heading
- Description
- Optional action

ตัวอย่าง:

`No plants have been added yet.`

## 9.10 Error State

ประกอบด้วย

- Error title
- Short explanation
- Retry button
- Technical details only when needed

---

# 10. Page 01 — Landing Page

## 10.1 Purpose

หน้า Landing Page ใช้แนะนำระบบ Smart Greenhouse แสดงคุณค่าหลักของผลิตภัณฑ์ และนำผู้ใช้ไปยังหน้าเข้าสู่ระบบหรือ Dashboard

## 10.2 Page Structure

1. Header
2. Hero section
3. Feature overview
4. Benefits and statistics
5. Dashboard preview
6. AI capability section
7. Automation capability section
8. CTA section
9. Footer

## 10.3 Header

### Left

- Smart Greenhouse logo
- Product name

### Center or Right Navigation

- Features
- How It Works
- AI Monitoring
- About
- Contact

### Actions

- Login
- Get Started

### Behavior

- Transparent over Hero at top
- Becomes dark translucent surface after scroll
- Sticky on Desktop
- Mobile changes to hamburger menu

## 10.4 Hero Section

### Background

- Full-width real greenhouse photograph
- Dark overlay 45–65%
- Slight blur or gradient around text region

### Main Heading

`Smart Greenhouse`

`AI-Powered Plant Health Monitoring`

### Supporting Copy

อธิบายว่าระบบช่วยติดตามสภาพแวดล้อม วิเคราะห์สุขภาพพืชด้วย AI และควบคุมอุปกรณ์ได้จากศูนย์กลางเดียว

### Primary CTA

`Get Started`

### Secondary CTA

`View Dashboard`

### Visual Emphasis

- Green highlight on AI or Plant Health text
- Subtle glow behind main CTA
- Maximum text width around 600px

## 10.5 Feature Cards

จำนวน 4 ใบ

### AI Plant Detection

- Icon: Scan or Leaf
- Description: วิเคราะห์สุขภาพและความผิดปกติจากภาพใบพืช

### Real-time Monitoring

- Icon: Activity
- Description: ติดตามค่าจากเซนเซอร์แบบเรียลไทม์

### Smart Automation

- Icon: Sliders or Zap
- Description: ควบคุมปั๊ม พัดลม แสง และอุปกรณ์อัตโนมัติ

### Data Analytics

- Icon: Chart
- Description: วิเคราะห์แนวโน้มข้อมูลย้อนหลัง

### Card Style

- Semi-transparent dark surface
- Border
- Icon container with Primary Soft
- Hover lift
- Short copy only

## 10.6 Benefits Section

### Statistics

- 95% AI detection accuracy
- 24/7 monitoring
- Real-time device control
- Multiple plant monitoring

### Rule

ใช้เฉพาะข้อมูลที่ผ่านการยืนยัน หากเป็นข้อมูลตัวอย่างให้ระบุเป็น Demo หรือ Prototype

## 10.7 Dashboard Preview

- Large product screenshot
- Floating KPI cards
- Temperature
- Plant Health
- Active Devices
- Alerts

### Interaction

- Optional parallax on desktop
- No heavy animation
- Cards stack naturally on mobile

## 10.8 AI Capability Section

Split layout

### Left

- Plant leaf image
- Detection bounding box
- Confidence overlay

### Right

- Heading
- Feature explanation
- Benefits
- CTA to AI Detection page

## 10.9 Automation Section

แสดงอุปกรณ์

- Water Pump
- Ventilation Fan
- Grow Light
- Mist Maker

ใช้ Device Cards แบบย่อและแสดง Toggle เพื่อสื่อประสบการณ์จริง

## 10.10 Final CTA

Heading:

`Grow Smarter with Real-Time Insight`

Actions:

- Get Started
- Contact Project Team

## 10.11 Footer

Columns:

- Product
- Features
- Resources
- Contact

Bottom:

- Copyright
- Privacy
- Terms
- Version

## 10.12 Responsive Behavior

### Tablet

- Hero becomes two rows
- Feature cards 2 columns
- Dashboard preview full width

### Mobile

- Navigation collapses
- Hero text centered or left aligned
- CTAs stack vertically
- Feature cards single column
- Hide nonessential decorative elements

---

# 11. Page 02 — Login Page

## 11.1 Purpose

ใช้เข้าสู่ระบบอย่างรวดเร็ว ปลอดภัย และสร้างความน่าเชื่อถือ

## 11.2 Desktop Layout

Split screen approximately 45/55

### Left Panel

- Greenhouse photograph
- Dark green overlay
- Brand logo
- Welcome message
- Key statistics

Example:

- 95% Detection Accuracy
- 24/7 Monitoring
- 100+ Detections

### Right Panel

- Login card
- Email
- Password
- Remember me
- Forgot password
- Sign in
- Optional Google sign-in
- Sign-up link

## 11.3 Login Card

- Width 420–480px
- White or very light card may be used for contrast
- Radius 20px
- Soft shadow
- Strong hierarchy

## 11.4 Form Behavior

### Email

- Validate email format
- Error appears below field

### Password

- Show/hide icon
- Caps Lock warning optional

### Submit

- Loading spinner
- Prevent duplicate submission

### Error

Examples:

- Incorrect email or password
- Account disabled
- Connection error

## 11.5 Accessibility

- Every input has visible label
- Submit via Enter
- Focus order follows layout
- Error connected using ARIA

## 11.6 Mobile

- Hide large image or reduce to small branded header
- Form occupies full width
- Maintain 16px page padding
- Keyboard does not cover submit button

---

# 12. Page 03 — Dashboard

## 12.1 Purpose

แสดงภาพรวมสถานะโรงเรือนทั้งหมดในหน้าเดียว

## 12.2 Information Priority

1. Critical alert
2. Plant health
3. Environmental KPI
4. Active devices
5. Sensor trends
6. Recent events

## 12.3 Page Header

### Left

- Title: `Dashboard`
- Subtitle: greenhouse name and last update

### Right

- Date range
- Refresh
- Export summary
- System status badge

## 12.4 KPI Cards

จำนวน 4 ใบ

### Temperature

- Value: `28.5°C`
- Trend compared with previous period
- Thermometer icon
- Normal range

### Humidity

- Value: `65%`
- Droplet icon

### Soil Moisture

- Value: `42%`
- Soil or leaf icon

### Light Intensity

- Value: `12,500 lux`
- Sun icon

### KPI Card Structure

1. Icon and label
2. Main value
3. Trend
4. Status text
5. Optional mini sparkline

## 12.5 Plant Health Summary

- Overall status
- Number healthy
- Number warning
- Number unhealthy
- Health rate
- Link to Plant Monitoring

## 12.6 Device Summary

- Active devices count
- Total devices
- Offline devices
- Auto mode status
- Quick link to Device Control

## 12.7 Sensor Overview Chart

### Chart Type

Multi-series line chart

### Series

- Temperature
- Humidity
- Soil Moisture

### Controls

- Today
- 7 days
- 30 days
- Custom

### Chart Behavior

- Tooltip
- Legend
- Hover values
- Empty state
- Loading state

## 12.8 Recent Alerts

แสดง 3–5 รายการล่าสุด

Each row:

- Severity icon
- Title
- Short description
- Timestamp
- Status

CTA:

`View All Alerts`

## 12.9 Quick Actions

- Start Water Pump
- Open AI Camera
- Add Plant
- Export Report

Dangerous action may require confirmation

## 12.10 Responsive

### Tablet

- KPI cards 2 x 2
- Chart full width
- Alerts below chart

### Mobile

- KPI cards 2 columns
- Summary cards stacked
- Chart simplified
- Quick actions horizontal scroll

---

# 13. Page 04 — Plant Monitoring

## 13.1 Purpose

แสดงรายการพืชแต่ละต้นและสถานะสุขภาพล่าสุด

## 13.2 Header

### Left

- Title: `Plant Monitoring`
- Subtitle: total plants and last sync

### Right

- Add Plant
- Scan Plant
- View layout selector

## 13.3 Filters

- All Plants
- Healthy
- Warning
- Unhealthy
- Offline Camera

Additional controls:

- Search
- Sort by status
- Sort by latest update
- Greenhouse zone

## 13.4 Plant Grid

Desktop: 3 columns  
Large desktop: 4 columns  
Tablet: 2 columns  
Mobile: 2 or 1 column depending on card type

## 13.5 Plant Card

### Content

- Plant image
- Plant name
- Plant ID
- Health badge
- AI confidence
- Last detection
- Quick menu

### Example

- Tomato 01
- Healthy
- Confidence 96%
- Updated 10 min ago

### Hover

- Image slightly zooms
- Card border becomes green
- Detail action appears

### Click

เปิด Plant Detail drawer or page

## 13.6 Plant Detail

### Overview

- Large plant image
- Health status
- Confidence
- Last update
- Plant age
- Location or zone

### Sensor Context

- Temperature
- Humidity
- Soil moisture
- Light

### AI History

- Detection timeline
- Disease probability
- Images

### Notes

- Operator notes
- Treatment history

### Actions

- Run AI Detection
- Capture New Image
- Edit Plant
- Archive Plant

## 13.7 Add Plant Flow

Fields:

- Plant name
- Plant type
- Planting date
- Zone
- Camera source
- Notes

Validation:

- Required name
- Valid camera mapping
- Duplicate ID warning

## 13.8 Empty State

`No plants found`

Actions:

- Add Plant
- Clear Filters

---

# 14. Page 05 — AI Detection

## 14.1 Purpose

แสดงภาพจากกล้อง ผลการตรวจจับ และคำแนะนำจาก AI

## 14.2 Page Layout

Desktop uses two-column main area

- Left: Camera or image
- Right: Detection result

Bottom:

- Detection history

## 14.3 Header

- Title: `AI Detection`
- Plant selector
- Camera selector
- Capture button
- Upload image button

## 14.4 Live Camera Panel

### Content

- Camera image
- Live badge
- Camera status
- Timestamp
- Fullscreen button
- Capture button

### Bounding Box

ใช้เส้นสีเขียวหรือสีแดงตามผล

Label includes:

- Detected class
- Confidence

### Camera States

- Live
- Connecting
- Offline
- Permission denied
- No image
- Error

## 14.5 Detection Result Card

### Health Classification

- Healthy
- Unhealthy
- Unknown

### Confidence

- Percentage
- Progress bar
- Model version

### Detected Disease

- Disease name
- Severity
- Affected area
- Probability

### Recommendation

แสดงคำแนะนำแบบ Actionable เช่น

- Check affected leaves
- Reduce leaf wetness
- Improve ventilation
- Isolate plant
- Capture another image

### Disclaimer

AI result is decision support and may require manual confirmation

## 14.6 Detection Action

Button:

`Run Detection`

States:

- Ready
- Processing
- Completed
- Failed

During processing:

- Disable duplicate action
- Show progress
- Preserve image

## 14.7 Detection History

Grid or horizontal gallery

Each item:

- Thumbnail
- Date
- Result
- Confidence
- Status dot

Filters:

- All
- Healthy
- Unhealthy
- Date

## 14.8 Detection Detail Modal

- Full image
- Bounding boxes
- Result
- Confidence
- Model information
- Environmental sensor values at detection time
- Export result

## 14.9 Mobile

- Camera first
- Result directly below
- History horizontal carousel
- Sticky Run Detection button

---

# 15. Page 06 — Device Control

## 15.1 Purpose

ควบคุมอุปกรณ์ IoT และแสดงสถานะการทำงาน

## 15.2 Header

- Title: `Device Control`
- Auto/Manual mode
- Emergency stop
- Add device

## 15.3 Category Tabs

- All Devices
- Irrigation
- Environment
- Lighting
- Other

## 15.4 Device Cards

Devices:

- Water Pump
- Ventilation Fan
- Grow Light
- Mist Maker
- Heater
- Shade Net

## 15.5 Device Card Structure

1. Icon
2. Device name
3. Device status
4. Toggle
5. Last action
6. Schedule summary
7. More menu

## 15.6 Status Types

- On
- Off
- Auto
- Scheduled
- Offline
- Error
- Pending

## 15.7 Toggle Interaction

When user switches:

1. UI shows Pending
2. Command sent to device
3. Device confirms status
4. UI shows success

If no confirmation:

- Revert or mark Unknown
- Show error toast
- Offer Retry

## 15.8 Auto Mode

When Auto mode is active:

- Manual toggle may be disabled
- Explain automation rule
- Provide Override action

Example:

`Controlled automatically when soil moisture is below 35%.`

## 15.9 Schedule Section

Display:

- Next irrigation
- Grow light period
- Ventilation schedule

Actions:

- View Schedule
- Add Schedule
- Edit Schedule

## 15.10 Emergency Stop

- Danger button
- Requires confirmation
- Explains affected devices
- Logs operator and time

## 15.11 Device Detail Drawer

Information:

- Device ID
- Connection status
- Last heartbeat
- Firmware
- Operating time
- Recent commands
- Automation rules

## 15.12 Mobile

- Single-column device list
- Toggle remains right aligned
- Emergency stop in overflow or protected action
- Category tabs horizontally scroll

---

# 16. Page 07 — Analytics

## 16.1 Purpose

วิเคราะห์แนวโน้มข้อมูลสภาพแวดล้อม สุขภาพพืช และการทำงานของอุปกรณ์

## 16.2 Header

- Title: `Analytics`
- Date range
- Greenhouse selector
- Export button

## 16.3 Metric Selector

- Temperature
- Humidity
- Soil Moisture
- Light Intensity
- Plant Health
- Device Runtime

## 16.4 Time Range

- Today
- 7 Days
- 30 Days
- 3 Months
- Custom

## 16.5 Main Chart

### Type

Line or area chart

### Features

- Tooltip
- Legend
- Zoom
- Reference range
- Anomaly markers
- Missing-data indicator

## 16.6 Summary Cards

- Average
- Maximum
- Minimum
- Variability
- Time in optimal range

## 16.7 Comparison

Options:

- Compare plants
- Compare zones
- Compare periods
- Compare sensor sources

## 16.8 Event Overlay

Show device actions on chart, for example

- Pump turned on
- Fan activated
- Grow light off
- AI detected abnormality

## 16.9 Export

Formats:

- CSV
- PDF report
- Image

Export modal includes:

- Date range
- Metrics
- File format
- Include summary
- Include chart

## 16.10 Empty Data

- Explain no data for period
- Provide change range action
- Do not show misleading zero line

## 16.11 Mobile

- One chart at a time
- Metric dropdown
- Simplified tooltip
- Summary cards 2 columns

---

# 17. Page 08 — Alerts

## 17.1 Purpose

รวมการแจ้งเตือนและช่วยให้ผู้ใช้จัดลำดับการตอบสนอง

## 17.2 Header

- Title: `Alerts`
- Unread count
- Mark all as read
- Alert settings

## 17.3 Filter Tabs

- All
- Critical
- Warning
- Information
- Resolved

## 17.4 Additional Filters

- Date range
- Plant
- Device
- Sensor
- Status

## 17.5 Alert List

Each alert contains:

- Severity icon
- Title
- Description
- Source
- Timestamp
- Read status
- Resolution status
- Action

Examples:

- High Temperature
- Low Soil Moisture
- Water Pump On
- Grow Light Off
- Humidity High
- AI Detected Unhealthy Plant

## 17.6 Critical Alert Design

- Red icon
- Red badge
- Clear action
- No large red card background unless necessary

## 17.7 Alert Detail

- Full description
- Sensor values
- Threshold
- Related plant/device
- Timeline
- Recommended action
- Mark resolved
- Add note

## 17.8 Alert Status

- Unread
- Acknowledged
- In Progress
- Resolved

## 17.9 Bulk Actions

- Mark read
- Mark resolved
- Export
- Delete only when permitted

## 17.10 Mobile

- Compact list
- Severity icon remains visible
- Swipe actions optional
- Detail opens full-screen sheet

---

# 18. Page 09 — Settings

## 18.1 Purpose

จัดการข้อมูลผู้ใช้ โรงเรือน อุปกรณ์ การแจ้งเตือน และระบบ

## 18.2 Settings Navigation

Tabs or sidebar:

- Profile
- Greenhouse
- Devices
- Notifications
- AI Model
- System
- Security

## 18.3 Profile

Fields:

- Avatar
- Full name
- Email
- Role
- Phone
- Language

Actions:

- Change photo
- Save changes
- Change password

## 18.4 Greenhouse Settings

Fields:

- Greenhouse name
- Location
- Time zone
- Crop type
- Number of zones
- Optimal ranges

Optimal ranges:

- Temperature
- Humidity
- Soil moisture
- Light intensity

## 18.5 Device Settings

- Device list
- Pair device
- Rename device
- Assign zone
- Test connection
- Remove device

## 18.6 Notification Settings

Channels:

- In-app
- Email
- Push notification
- Optional SMS

Alert levels:

- Critical
- Warning
- Information

Quiet hours:

- Start time
- End time
- Critical override

## 18.7 AI Model Settings

Display:

- Current model
- Version
- Last updated
- Supported classes
- Confidence threshold

Controls:

- Threshold slider
- Auto-run detection
- Detection interval
- Data retention

## 18.8 System Settings

- Theme
- Language
- Date format
- Units
- Data refresh interval
- Export defaults

## 18.9 Security

- Change password
- Two-factor authentication
- Active sessions
- Login history
- Sign out all devices

## 18.10 Save Behavior

- Sticky Save bar when changes exist
- Unsaved changes warning
- Success toast
- Validation summary on error

## 18.11 Mobile

- Settings shown as list
- Each section opens separate screen
- Save button sticky at bottom

---

# 19. Mobile Application Specification

## 19.1 Navigation

Bottom navigation:

- Home
- Plants
- Devices
- Alerts
- More

The More page contains:

- Analytics
- Settings
- Profile

## 19.2 Mobile Dashboard

### Header

- Greenhouse name
- Notification
- Profile

### KPI Grid

2 columns

- Temperature
- Humidity
- Soil Moisture
- Light

### Plant Health

Single summary card

### Alerts

Top 3 alerts

### Quick Actions

- Scan Plant
- Water Pump
- Open Camera

## 19.3 Mobile Plant Monitoring

- Compact 2-column grid
- Image-first card
- Health badge
- Tap opens detail
- Filters horizontally scroll

## 19.4 Mobile AI Detection

- Full-width camera
- Detection result
- Confidence
- Recommendation
- Sticky action button

## 19.5 Mobile Device Control

- Device list
- Large toggle
- Status text
- Schedule summary

## 19.6 Mobile Analytics

- Metric selector
- Date selector
- Single chart
- Summary cards

## 19.7 Mobile Alerts

- Priority-first list
- Critical alerts pinned
- Pull to refresh
- Full-screen detail

---

# 20. Responsive Breakpoints

## Desktop Large

`>= 1440px`

- Sidebar expanded
- 4-column plant grid
- Full analytics controls

## Desktop

`1200px–1439px`

- Sidebar expanded
- 3-column plant grid
- Dashboard full layout

## Tablet Landscape

`1024px–1199px`

- Sidebar collapsed
- KPI 2 columns
- Plant grid 2 columns

## Tablet Portrait

`768px–1023px`

- Drawer navigation
- Single or 2-column layout
- Charts full width

## Mobile

`< 768px`

- Bottom navigation
- Single-column content
- Compact typography
- Sticky actions

---

# 21. Interaction and Motion

## 21.1 Timing

- Hover: 120ms
- Standard transition: 200ms
- Modal: 240–320ms
- Chart transition: 300ms

## 21.2 Card Hover

- Translate Y -2px
- Border slightly brighter
- No excessive scale

## 21.3 Button Interaction

- Pressed state slightly darkens
- Loading retains button width
- Disabled removes shadow and lowers opacity

## 21.4 Modal

- Fade backdrop
- Scale from 0.98 to 1
- Focus trapped inside

## 21.5 Reduced Motion

Respect `prefers-reduced-motion`

---

# 22. Accessibility

## 22.1 Contrast

- Body text minimum 4.5:1
- Large text minimum 3:1
- Interactive boundaries minimum 3:1

## 22.2 Keyboard

All functions must support keyboard navigation

- Tab
- Shift + Tab
- Enter
- Space
- Escape
- Arrow keys in dropdowns

## 22.3 Focus State

- Minimum 2px focus ring
- Must be visible against dark surface

## 22.4 Touch Target

Minimum 44 × 44px

## 22.5 Status Communication

Never use color alone

Example:

- Red dot + `Critical`
- Green icon + `Healthy`
- Gray icon + `Offline`

## 22.6 Charts

- Accessible legend
- Data table alternative when possible
- Tooltips available by keyboard
- Patterns or labels for critical information

---

# 23. Data States

ทุกหน้าที่ดึงข้อมูลต้องรองรับสถานะต่อไปนี้

## Loading

- Skeleton
- Spinner for action only

## Success

- Normal content
- Last updated time

## Empty

- Explanation
- Suggested action

## Partial Data

- Show available data
- Mark missing values
- Do not block entire page

## Offline

- Offline banner
- Cached data timestamp
- Disable unavailable controls

## Error

- Friendly explanation
- Retry
- Technical details optional

---

# 24. Notification and Feedback Rules

## Success

Example:

`Water pump has been turned on.`

## Warning

Example:

`Device command is taking longer than expected.`

## Error

Example:

`Unable to connect to the ventilation fan.`

## Information

Example:

`AI model update is available.`

Feedback must explain

- What happened
- Which item was affected
- What user can do next

---

# 25. Content Style

## Tone

- Clear
- Calm
- Professional
- Direct
- Helpful

## Avoid

- Technical jargon without explanation
- Long error messages
- Ambiguous commands
- Exaggerated AI claims

## Button Labels

Use action verbs

- Add Plant
- Run Detection
- Turn On
- Save Changes
- Export Report
- View Alerts

Avoid generic labels such as

- OK
- Submit
- Click Here

---

# 26. Iconography

Preferred libraries:

- Lucide Icons
- Feather Icons

Style:

- Outline
- Rounded
- Consistent stroke
- 18–24px standard size

Examples:

- Dashboard: LayoutDashboard
- Plants: Leaf
- AI Detection: ScanLine
- Devices: Cpu
- Analytics: LineChart
- Alerts: Bell
- Settings: Settings
- Pump: Droplets
- Fan: Fan
- Light: Sun

---

# 27. Photography and Illustration

## Photography

Use

- Real greenhouse
- Real tomato plants
- Healthy leaves
- Camera inspection
- Natural lighting

## Image Treatment

- Dark overlay
- Controlled saturation
- High-quality crop
- Avoid stock imagery that looks unrelated

## Plant Cards

Images should use consistent ratio, preferably 4:3 or 1:1

## AI Detection

Image must remain clear enough to inspect affected areas

---

# 28. Figma File Structure

Recommended pages:

1. `00 Cover`
2. `01 Foundations`
3. `02 Components`
4. `03 Landing`
5. `04 Authentication`
6. `05 Dashboard`
7. `06 Plant Monitoring`
8. `07 AI Detection`
9. `08 Device Control`
10. `09 Analytics`
11. `10 Alerts`
12. `11 Settings`
13. `12 Mobile`
14. `13 Prototype`
15. `14 Archive`

## Frame Naming

Examples:

- `Landing / Desktop / Default`
- `Login / Desktop / Default`
- `Dashboard / Desktop / Loaded`
- `Dashboard / Desktop / Loading`
- `Plants / Mobile / Empty`
- `AI Detection / Desktop / Processing`

## Component Naming

Examples:

- `Button/Primary/Default`
- `Button/Primary/Loading`
- `Card/KPI/Temperature`
- `Badge/Status/Healthy`
- `Navigation/Sidebar/Item`
- `Control/Toggle/On`

---

# 29. Component Variants

## Button Variants

- Type: Primary, Secondary, Ghost, Danger
- Size: Small, Medium, Large
- State: Default, Hover, Pressed, Focus, Loading, Disabled
- Icon: None, Left, Right, Icon-only

## Status Badge Variants

- Healthy
- Warning
- Critical
- Information
- Offline
- Live

## Device Card Variants

- On
- Off
- Auto
- Offline
- Error
- Pending

## Plant Card Variants

- Healthy
- Warning
- Unhealthy
- No Image
- Loading

## Alert Row Variants

- Critical
- Warning
- Information
- Read
- Unread
- Resolved

---

# 30. Prototype Flow

## Main User Flow

1. Open Landing Page
2. Click Get Started
3. Login
4. View Dashboard
5. Open Plant Monitoring
6. Select Tomato 03
7. Run AI Detection
8. View unhealthy result
9. Open recommendation
10. Go to Device Control
11. Turn on ventilation
12. Return to Alerts
13. Mark alert resolved

## Prototype Requirements

- Navigation links work
- Hover states for key components
- Modal interactions
- Toggle feedback
- Mobile bottom navigation
- Loading and success states

---

# 31. Implementation Notes for React / Next.js

## Suggested Page Routes

```text
/
 /login
 /dashboard
 /plants
 /plants/[id]
 /ai-detection
 /devices
 /analytics
 /alerts
 /settings
```

## Suggested Component Structure

```text
components/
  layout/
    Sidebar
    Topbar
    MobileNavigation
  ui/
    Button
    Input
    Badge
    Modal
    Toast
    Toggle
  dashboard/
    KpiCard
    SensorChart
    PlantHealthSummary
    DeviceSummary
  plants/
    PlantCard
    PlantDetail
  ai/
    CameraPanel
    DetectionResult
    DetectionHistory
  devices/
    DeviceCard
    ScheduleCard
  analytics/
    MetricChart
    SummaryCard
  alerts/
    AlertRow
    AlertDetail
```

## State Management

Recommended state categories:

- Authentication
- Selected greenhouse
- Sensor data
- Plant data
- Device commands
- Alerts
- UI preferences

## Real-time Data

Use clear connection states:

- Connected
- Reconnecting
- Offline
- Last synced

---

# 32. Acceptance Criteria

## Visual

- All pages follow the same color and spacing system
- Components use consistent radius
- Typography hierarchy is clear
- Dark surfaces remain distinguishable

## Functional

- Navigation works
- Device controls return status
- AI detection shows progress and result
- Filters update data
- Export flow is understandable

## Responsive

- No horizontal overflow
- Touch targets meet minimum size
- Mobile navigation remains accessible
- Charts adapt to screen width

## Accessibility

- Keyboard usable
- Focus visible
- Text contrast passes WCAG AA
- Status does not rely on color alone

---

# 33. Final Experience

ผู้ใช้ควรรู้สึกว่า Smart Greenhouse เป็นระบบที่

- เข้าใจง่ายตั้งแต่ครั้งแรก
- ดูทันสมัยและน่าเชื่อถือ
- ช่วยตัดสินใจได้เร็ว
- แสดงผล AI อย่างโปร่งใส
- ควบคุมอุปกรณ์ได้อย่างปลอดภัย
- ดูข้อมูลย้อนหลังได้สะดวก
- ใช้งานได้ทั้ง Desktop และ Mobile
- พร้อมพัฒนาต่อเป็นผลิตภัณฑ์จริง

ดีไซน์ต้องรักษาสมดุลระหว่างความเป็นเทคโนโลยีและความเป็นธรรมชาติ โดยไม่ลดทอนความชัดเจนของข้อมูลหรือความสะดวกในการใช้งาน
