---
name: sync-feature-journey
description: ตรวจสอบและสร้าง/อัปเดต Feature List (พร้อมจัดลำดับด้วย MoSCoW) และ User Journey (Mermaid diagram + mapping กลับไปหา requirement) จาก requirement spec และ backlog ที่มีอยู่ ใช้เมื่อ user ต้องการสร้างหรืออัปเดต feature list, user journey, หรืออยากรู้ว่าเอกสารสองตัวนี้ยังตรงกับ requirement ล่าสุดหรือไม่ ในโปรเจกต์ war-point
---

# Sync Feature List & User Journey

Skill นี้ทำงานแบบ interactive ในบทสนทนาหลัก เพราะต้องยืนยันขอบเขตกับ user ก่อนเขียนไฟล์ การเขียนไฟล์จริงมอบให้ agent `feature-journey-writer`

เป้าหมาย: ให้ `docs/01-requirements/feature-list.md` และ `docs/01-requirements/user-journey.md` สะท้อน requirement ล่าสุดใน `01-spec/` และ `backlog.md` เสมอ

## ขั้นตอนการทำงาน

### 1. สำรวจสถานะปัจจุบัน

- Glob `docs/01-requirements/01-spec/*.md` และ Read `docs/01-requirements/backlog.md`
- Read `docs/01-requirements/feature-list.md` และ `docs/01-requirements/user-journey.md` ถ้ามี
- เทียบว่า requirement ทุกฉบับใน backlog ถูกครอบคลุมใน feature list แล้วหรือยัง และ journey ครอบคลุม flow ไหนไปแล้ว

สรุปให้ user เห็นสั้นๆ ว่า: requirement มีกี่ฉบับ, feature list มีอยู่แล้วหรือไม่, มีอะไรที่ยังขาด/ล้าสมัย

### 2. ยืนยันขอบเขตกับ user

ใช้ AskUserQuestion ถามเมื่อยังไม่ชัดเจน **ทุกคำถามต้องมีตัวเลือกอย่างน้อย 3 แนวทาง** พร้อมข้อดี/ข้อเสียสั้นๆ และระบุตัวเลือกที่แนะนำพร้อมเหตุผล ประเด็นที่ควรถาม:

- จะทำ feature list ครอบคลุมทุก requirement หรือเจาะจงเรื่องใดเรื่องหนึ่ง
- จะเขียน journey เรื่องไหน และกี่เรื่อง (แนะนำเริ่มจาก journey ของ persona ที่เป็นหัวใจของธุรกิจก่อน)
- ถ้ามีไฟล์เดิมอยู่แล้ว: เขียนทับทั้งไฟล์ หรืออัปเดตเฉพาะส่วนที่เปลี่ยน (แนะนำอัปเดตเฉพาะส่วน เพื่อรักษารหัส FE-XX เดิมไว้ไม่ให้ reference ที่อื่นพัง)

ถ้า requirement ที่จะทำมีจุดที่ยังไม่ชัด อย่าเดา — ถามให้ครบก่อน

### 3. มอบหมายให้ subagent เขียนไฟล์

เรียก agent `feature-journey-writer` (Agent tool, `subagent_type: feature-journey-writer`) พร้อมส่ง `scope`, `journey_targets`, `mode`, `date` และข้อสรุปที่ตกลงกับ user ทั้งหมด

### 4. ตรวจงานที่ subagent ส่งกลับ

- เปิดไฟล์ที่ถูกเขียนแล้วตรวจ 4 อย่าง: (ก) ทุก feature มี MoSCoW และ requirement ต้นทาง (ข) ทุก node ใน Mermaid มีรหัส FE-XX กำกับ (ค) syntax Mermaid ครอบข้อความไทยด้วย double quote ทุก node (ง) ไม่มี feature ที่แต่งขึ้นเองโดยไม่มีต้นทาง
- ถ้าพบปัญหา ให้แก้เองหรือสั่ง subagent แก้ ก่อนรายงาน user

### 5. รายงานผลให้ user

สรุป: path ไฟล์ (เป็น markdown link), จำนวน feature แยกตาม MoSCoW, journey ที่เขียน, ช่องว่างที่พบ และแจ้งว่าไฟล์ยังไม่ได้ commit/push — ถามก่อนว่าจะ commit หรือไม่ **อย่า push เองโดยไม่ถาม**
