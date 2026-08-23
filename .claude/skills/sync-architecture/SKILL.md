---
name: sync-architecture
description: สร้างหรืออัปเดตเอกสาร High-Level Architecture (แผนภาพสถาปัตยกรรม, ตาราง component, data flow, authentication/authorization) จาก requirement spec, feature list, user journey และ prototype ที่มี ใช้เมื่อ user ต้องการทำ architecture, โครงสร้างระบบ, data flow, หรืออยากรู้ว่าสถาปัตยกรรมยังตรงกับ requirement ล่าสุดหรือไม่ ในโปรเจกต์ war-point
---

# Sync High-Level Architecture

Skill นี้ทำงานแบบ interactive ในบทสนทนาหลัก เพราะต้องยืนยันขอบเขตกับ user ก่อนเขียนไฟล์ การเขียนไฟล์จริงมอบให้ agent `architecture-writer`

เป้าหมาย: ให้ `docs/02-design/02-technical/architecture.md` สะท้อนสิ่งที่ระบบต้องทำตาม `feature-list.md` และ `user-journey.md` ล่าสุด

## ขั้นตอนการทำงาน

### 1. สำรวจสถานะปัจจุบัน

- Read `docs/01-requirements/feature-list.md`, `user-journey.md`
- Read `docs/02-design/02-technical/architecture.md` ถ้ามี
- ดูว่ามี prototype เวอร์ชันไหนบ้างใน `docs/02-design/01-prototypes/`
- นับว่า feature มีกี่ตัว, journey มีกี่เส้น, และมี component เดิมกี่ตัว

สรุปให้ user เห็นสั้นๆ ก่อนถาม

### 2. ยืนยันขอบเขตกับ user

ใช้ AskUserQuestion **ทุกคำถามต้องมีตัวเลือกอย่างน้อย 3 แนวทาง** พร้อมข้อดี/ข้อเสีย และระบุตัวเลือกที่แนะนำพร้อมเหตุผล ประเด็นที่ต้องถาม:

1. **ระดับความละเอียด** — conceptual (ไม่ผูกกับเทคโนโลยี) / ผูกกับ tech stack ที่เลือกแล้ว / ทำ conceptual ก่อนแล้วค่อยเติมภายหลัง
2. **รูปแบบสถาปัตยกรรม** — เช่น 3-tier monolith / modular monolith / serverless / microservice พร้อมบอกตรงๆ ว่าแบบไหนเกินความจำเป็นสำหรับขนาดของโปรเจกต์นี้
3. **รูปแบบ Authentication ต่อบทบาท** — อ้างสิ่งที่ requirement ระบุไว้แล้วเป็นตัวตั้ง (เช่น นักเรียนใช้รหัส+PIN, ครูใช้บัญชี Google) แล้วถามเฉพาะส่วนที่ยังไม่ระบุ เช่น session-based หรือ token-based
4. **รูปแบบ Authorization** — RBAC / ABAC / ผสม
5. **จะวาด data flow ของ journey ไหนบ้าง** — แนะนำเริ่มจาก journey ที่เป็นหัวใจของระบบ
6. **ข้อจำกัดที่ต้องรู้** — จำนวนผู้ใช้พร้อมกัน, ต้องใช้บนมือถือไหม, งบ/โฮสต์ที่มี, ต้องเชื่อมระบบภายนอกอะไร

**ห้ามเดา tech stack แทน user เด็ดขาด** ถ้า user ยังไม่ตัดสินใจ ให้ใช้ `stack: conceptual`

### 3. มอบหมายให้ subagent เขียนไฟล์

เรียก agent `architecture-writer` (`subagent_type: architecture-writer`) พร้อมส่ง `stack`, `tier_style`, `scope`, `data_flows`, `mode`, `date`, `constraints` และข้อสรุปที่ตกลงกับ user ทั้งหมด

ถ้าเป็นการแก้เอกสารที่ตรวจผ่านแล้ว ต้องส่ง `mode: update` และระบุชัดว่า **ห้ามแตะรหัส CMP-XX เดิมและหัวข้อใดบ้าง**

### 4. ตรวจงานที่ subagent ส่งกลับ

**อย่าเชื่อรายงานของ agent ตามตัวอักษร** ต้องเปิดไฟล์ตรวจเองอย่างน้อย 4 ข้อ:

1. ทุก node ใน Mermaid ครอบข้อความด้วย double quote และมีรหัส `CMP-XX` กำกับ
2. ทุก component ในตารางอ้าง FE-XX ที่มีอยู่จริงใน feature-list (สุ่มเช็ค 3 ตัว โดยเปิด feature-list เทียบ)
3. ถ้าประกาศว่า conceptual — grep หาชื่อเทคโนโลยีเฉพาะ (PostgreSQL, React, Node, VARCHAR ฯลฯ) ต้องไม่เจอ
4. ตาราง Role × Permission ไม่ขัดกับสิ่งที่ requirement ระบุไว้

ถ้าค่าที่วัดเองไม่ตรงกับที่ agent รายงาน ให้ยึดค่าที่วัดเองและบอก user ว่ารายงานคลาดเคลื่อนตรงไหน

### 5. รายงานผลให้ user

สรุป: path ไฟล์ (markdown link), จำนวน component แยกตามชั้น, data flow ที่วาด, รูปแบบ auth ที่เลือก, Open Decision ที่ยังค้าง, ช่องว่างที่พบ
แจ้งว่ายังไม่ได้ commit/push และถามก่อนว่าจะ commit หรือไม่ — **อย่า push เองโดยไม่ถาม**
