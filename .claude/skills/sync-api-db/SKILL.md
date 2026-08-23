---
name: sync-api-db
description: สร้างหรืออัปเดตเอกสาร Database Schema (ERD + รายละเอียดตาราง) และ API Spec (endpoint, request/response, validation rules, status code) จาก architecture, requirement, feature list และ acceptance criteria ที่มี ใช้เมื่อ user ต้องการทำ db schema, database spec, ERD, api spec, endpoint, data contract ในโปรเจกต์ war-point
---

# Sync Database Schema & API Spec

Skill นี้ทำงานแบบ interactive ในบทสนทนาหลัก เพราะต้องยืนยันขอบเขตกับ user ก่อนเขียนไฟล์ การเขียนไฟล์จริงมอบให้ agent `api-db-writer`

เป้าหมาย: ให้ `database-schema.md` และ `api-spec.md` รองรับทุก feature ที่ไม่ใช่ระดับ `Won't` และค่าตัวเลขตรงกับ acceptance criteria และ test case

## ขั้นตอนการทำงาน

### 1. สำรวจสถานะปัจจุบัน

- Read `docs/02-design/02-technical/architecture.md` — **ถ้ายังไม่มี ให้เตือน user ว่าควรทำ architecture ก่อน** (ผ่าน skill `sync-architecture`) แล้วถามว่าจะทำต่อเลยหรือย้อนไปทำ architecture ก่อน
- Read `docs/01-requirements/feature-list.md`
- Read `docs/03-testing/01-test-plan/acceptance-criteria.md` และ list ไฟล์ใน `test-cases/`
- Read ไฟล์ปลายทางถ้ามีอยู่แล้ว

สรุปให้ user เห็น: feature กี่ตัว, มี entity/endpoint เดิมกี่ตัว, และ feature ไหนยังไม่มี endpoint รองรับ

### 2. ยืนยันขอบเขตกับ user

ใช้ AskUserQuestion **ทุกคำถามต้องมีตัวเลือกอย่างน้อย 3 แนวทาง** พร้อมข้อดี/ข้อเสีย และตัวเลือกที่แนะนำ ประเด็นที่ต้องถาม:

1. **ทำอะไรบ้าง** — DB อย่างเดียว / API อย่างเดียว / ทั้งคู่ (แนะนำทั้งคู่ เพราะ endpoint ต้องอ้าง field จริง)
2. **ชนิดฐานข้อมูล** — relational / document / ผสม พร้อมบอกว่าอันไหนเหมาะกับลักษณะข้อมูลของโปรเจกต์นี้และเพราะอะไร
3. **ระดับความละเอียด** — conceptual (ชนิดข้อมูลกลางๆ) / logical / physical ผูกกับ stack ที่เลือกแล้ว
4. **ขอบเขต** — ทุก feature / เฉพาะ MVP (Must) / เจาะจงบางเรื่อง
5. **การจัดการข้อมูลที่ถูกลบ** — ลบจริง / ปิดการใช้งาน (soft delete) / เก็บประวัติแยก — อ้างสิ่งที่ requirement ระบุไว้เป็นตัวตั้ง

**ห้ามเลือกเทคโนโลยีฐานข้อมูลแทน user** ถ้ายังไม่ตัดสินใจให้ใช้ `stack: conceptual`

### 3. มอบหมายให้ subagent เขียนไฟล์

เรียก agent `api-db-writer` (`subagent_type: api-db-writer`) พร้อมส่ง `targets`, `stack`, `db_kind`, `scope`, `mode`, `date` และข้อสรุปทั้งหมด

ถ้าเป็นการแก้เอกสารเดิม ส่ง `mode: update` และระบุชัดว่า **ห้ามแตะรหัส ENT-XX / API-XX เดิม**

### 4. ตรวจงานที่ subagent ส่งกลับ

**อย่าเชื่อรายงานของ agent ตามตัวอักษร** ต้องเปิดไฟล์ตรวจเองอย่างน้อย 4 ข้อ:

1. **นับ endpoint จริงจากไฟล์** แล้วเทียบกับตัวเลขที่ agent รายงานและกับตารางสรุปในเอกสาร
2. **สุ่มเช็คค่าตัวเลข 3 ค่า** ที่ปรากฏทั้งใน api-spec และ `acceptance-criteria.md` / `test-cases/*.md` ว่าตรงกัน (เช่น ราคา, เพดาน, จำนวนรอบ) — ถ้าไม่ตรงห้ามเลือกข้างเอง ให้เอาไปถาม user
3. ทุก endpoint มีอย่างน้อย 1 กรณีผิดพลาดพร้อม status code เป็นตัวเลข
4. ER Diagram: label บนเส้นความสัมพันธ์ที่เป็นภาษาไทยครอบด้วย double quote ครบทุกเส้น

ถ้าค่าที่วัดเองไม่ตรงกับรายงาน ให้ยึดค่าที่วัดเองและบอก user

### 5. รายงานผลให้ user

สรุป: path ไฟล์ (markdown link), จำนวน entity, จำนวน endpoint แยกตาม method, feature ที่ยังไม่มี endpoint รองรับ, ค่าที่พบว่าขัดกันระหว่างเอกสาร, ช่องว่างที่พบ
แจ้งว่ายังไม่ได้ commit/push และถามก่อน — **อย่า push เองโดยไม่ถาม**
