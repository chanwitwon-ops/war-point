---
name: sync-test-plan
description: สร้างหรืออัปเดตเอกสารทดสอบของโปรเจกต์ — Acceptance Criteria แบบ Given-When-Then, Test Plan ภาพรวม, และ Test Case แบบ step-by-step โดยอ้างอิงจาก requirement, backlog, feature list, user journey และ prototype ใช้เมื่อ user ต้องการทำ test spec, test case, test plan, acceptance criteria หรืออยากรู้ว่าเอกสารทดสอบครอบคลุม requirement ครบหรือยัง ในโปรเจกต์ war-point
---

# Sync Test Plan / Test Case / Acceptance Criteria

Skill นี้ทำงานแบบ interactive ในบทสนทนาหลัก เพราะต้องยืนยันขอบเขตการทดสอบกับ user ก่อน การเขียนไฟล์จริงมอบให้ agent `test-writer`

แนวคิดที่ยึด: **Shift-Left** — เขียน AC และ test case ตั้งแต่ตอนวิเคราะห์ requirement ไม่ใช่รอถึงตอนทดสอบ เพราะบั๊กที่เจอใน spec ถูกกว่าบั๊กที่หลุดไป production

## ขั้นตอนการทำงาน

### 1. สำรวจสถานะปัจจุบัน

Read/Glob:
- `docs/01-requirements/01-spec/*.md` (หัวข้อ Acceptance Criteria ในแต่ละ spec เป็นวัตถุดิบหลัก)
- `docs/01-requirements/backlog.md`, `feature-list.md`, `user-journey.md`
- `docs/03-testing/01-test-plan/` — ดูว่ามี `acceptance-criteria.md`, `test-plan.md`, `test-cases/` แล้วหรือยัง
- `docs/02-design/01-prototypes/` — ถ้ามี prototype ให้ใช้ชื่อปุ่ม/ข้อความจริงบนหน้าจอมาเขียน test step

สรุปให้ user เห็นว่า requirement/feature ไหนยังไม่มี AC หรือ test case รองรับ

### 2. ยืนยันขอบเขตกับ user

ใช้ AskUserQuestion **ทุกคำถามมีตัวเลือกอย่างน้อย 3 แนวทาง** พร้อมข้อดี/ข้อเสียและข้อแนะนำ ประเด็นที่ควรถาม:

- จะทำเอกสารทดสอบครบทั้ง 3 ตัว (AC + Test Plan + Test Case) หรือทำบางตัว
- จะครอบคลุมทุก feature หรือเจาะจง feature/journey เดียว (แนะนำเริ่มจาก journey ที่เป็นหัวใจของธุรกิจ เพื่อให้ traceability ครบก่อนขยาย)
- ระดับความละเอียดของ test case (เฉพาะ happy path / happy + negative / ครอบคลุม permission และ edge case ด้วย)

### 3. มอบหมายให้ subagent เขียนไฟล์

เรียก agent `test-writer` (Agent tool, `subagent_type: test-writer`) พร้อมส่ง `scope`, `deliverables`, `mode`, `date` และข้อสรุปที่ตกลงกับ user

### 4. ตรวจงานที่ subagent ส่งกลับ

ตรวจ 5 อย่าง: (ก) AC ทุกข้อเป็น Given-When-Then และมี 1 พฤติกรรมต่อ 1 ข้อ (ข) ทุก test case อ้างอิงกลับไปหา AC/feature/requirement ได้ (ค) Expected Result วัดผลได้จริง ไม่ใช่คำว่า "ทำงานถูกต้อง" (ง) มี negative/permission case ไม่ใช่แค่ happy path (จ) Traceability Matrix ครบและตรงกับไฟล์จริง

### 5. รายงานผลให้ user

สรุป path ไฟล์ทั้งหมด (markdown link), จำนวน AC และ test case แยกตามประเภท, Coverage Gap ที่พบ และถามว่าจะ commit หรือไม่ **อย่า push เองโดยไม่ถาม**
