---
name: build-prototype
description: สร้าง Interactive UI Prototype แบบ single-file HTML จาก requirement, backlog, feature list และ user journey โดยอ้างอิง design system จาก DESIGN.md ใช้เมื่อ user ต้องการทำ prototype, mockup, wireframe แบบกดได้, หรืออยากเห็นหน้าตาระบบก่อนเขียนโค้ดจริง ในโปรเจกต์ war-point
---

# Build Interactive Prototype

Skill นี้ทำงานแบบ interactive ในบทสนทนาหลัก เพราะต้อง **เสนอแผนให้ user รีวิวและยืนยันก่อนสร้างเสมอ** การเขียนไฟล์จริงมอบให้ agent `prototype-writer`

## ขั้นตอนการทำงาน

### 1. ตรวจว่ามี DESIGN.md แล้วหรือยัง

Read `DESIGN.md` ที่ root ของโปรเจกต์

**ถ้าไม่มี** ห้ามเดาสี/สไตล์เอง ให้ถาม user ก่อนว่าอยากได้ design system แบบไหน โดยใช้ AskUserQuestion เสนอทางเลือกโทนสี/สไตล์อย่างน้อย 3 แนวทาง (พร้อมข้อดี/ข้อเสีย) หรือให้ user ส่งตัวอย่างภาพ/โลโก้มา แล้วสร้าง `DESIGN.md` ให้ครบ 4 หัวข้อ (Brand Identity & CI, Design Tokens, UI Components & Patterns, UX Guidelines & Rules) ก่อนไปขั้นถัดไป

### 2. อ่านต้นทางและประเมินขอบเขต

Read `docs/01-requirements/feature-list.md`, `docs/01-requirements/user-journey.md`, spec ที่เกี่ยวข้องใน `docs/01-requirements/01-spec/`, และ wireframe เดิมใน `docs/02-design/01-prototypes/`

ถ้ายังไม่มี feature list / user journey ให้แจ้ง user ว่าควรรัน skill `sync-feature-journey` ก่อน เพราะ prototype ควรอ้างอิงลำดับขั้นจาก journey

### 3. ถามเรื่องเวอร์ชัน (ทุกครั้งที่มี prototype เดิมอยู่แล้ว)

ถ้าใน `docs/02-design/01-prototypes/` มีโฟลเดอร์ prototype อยู่แล้ว **ต้องถาม user ทุกครั้ง** ว่า:

- **สร้างโฟลเดอร์เวอร์ชันใหม่** — เหมาะเมื่อ flow เปลี่ยน หรือมี requirement ใหม่เข้ามา เพราะเก็บเวอร์ชันเก่าไว้เทียบได้ (แนะนำในกรณีนี้)
- **แก้ไขโฟลเดอร์ล่าสุด** — เหมาะเมื่อแค่ปรับรายละเอียด/แก้บั๊ก UI ไม่ได้เปลี่ยน flow ทำให้ไม่มีไฟล์ซ้ำซ้อน
- **แยกไฟล์ใหม่ในโฟลเดอร์เดิม** — เหมาะเมื่อเพิ่มหน้าจอของ flow อื่นที่ยังใช้ design เดียวกัน

ต้องบอก user ด้วยว่าแนะนำแบบไหนและเพราะอะไร

### 4. เสนอแผนให้ user ยืนยัน (ห้ามข้าม)

เสนอเป็นรายการสั้นๆ ว่า: จะทำ journey/feature ไหน, มีหน้าจออะไรบ้างกี่หน้า, interaction อะไรที่กดได้จริง, จะเก็บไว้ที่ path ไหน, และอะไรที่จะ **ไม่** ทำ (ตาม out-of-scope ใน spec)

ถ้ามีจุดใดไม่ชัดเจน ใช้ AskUserQuestion ถามพร้อมทางเลือกอย่างน้อย 3 แนวทาง + ข้อดี/ข้อเสีย + ข้อแนะนำ

**รอ user ยืนยันแผนก่อน** จึงไปขั้นถัดไป

### 5. มอบหมายให้ subagent สร้างไฟล์

เรียก agent `prototype-writer` (Agent tool, `subagent_type: prototype-writer`) พร้อมส่ง `target`, `screens`, `output`, `date` และรายละเอียดแผนที่ user ยืนยันแล้วครบถ้วน

### 6. ตรวจงานที่ subagent ส่งกลับ

ตรวจไฟล์ที่สร้าง 5 อย่าง: (ก) เป็น single file self-contained ไม่มี CDN/ไฟล์ภายนอก (ข) สีทั้งหมดมาจาก CSS variable ตาม `DESIGN.md` ไม่มี hex หลงมาใน component (ค) ทุกหน้าจอใน journey มีอยู่และกดสลับได้จริง (ง) ไม่มีฟีเจอร์นอกขอบเขตตาม spec (จ) มี `README.md` พร้อมตาราง mapping ครบ

### 7. รายงานผลให้ user

สรุป path (markdown link ไปยัง `index.html`), หน้าจอที่มี, click-through path ที่แนะนำให้ลองกด, ข้อจำกัดของ prototype แล้วเสนอเปิดดูใน browser ปิดท้ายด้วยการถามว่าจะ commit หรือไม่ **อย่า push เองโดยไม่ถาม**
