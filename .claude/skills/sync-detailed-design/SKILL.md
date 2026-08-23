---
name: sync-detailed-design
description: สร้างหรืออัปเดตเอกสาร Detailed Design — sequence diagram, pseudo code, business logic & validation rules, edge case & error handling และ security ระดับจุด จาก architecture, api spec, database schema และ acceptance criteria ใช้เมื่อ user ต้องการทำ detailed design, sequence flow, pseudo code, business rule, error handling ในโปรเจกต์ war-point
---

# Sync Detailed Design

Skill นี้ทำงานแบบ interactive ในบทสนทนาหลัก เพราะต้องยืนยันขอบเขตกับ user ก่อนเขียนไฟล์ การเขียนไฟล์จริงมอบให้ agent `detailed-design-writer`

เป้าหมาย: ทำให้คนเขียนโค้ด (หรือ AI) ไม่ต้องเดา logic เอง — ทุกลำดับขั้น เงื่อนไข ค่าขอบเขต และกรณีผิดพลาด ถูกเขียนไว้ล่วงหน้า

## ขั้นตอนการทำงาน

### 1. สำรวจสถานะปัจจุบัน

- Read `docs/02-design/02-technical/api-spec.md` และ `database-schema.md` — **ถ้ายังไม่มี ให้เตือน user ว่าควรทำ `sync-api-db` ก่อน** แล้วถามว่าจะทำต่อเลยหรือย้อนกลับ
- Read `docs/03-testing/01-test-plan/acceptance-criteria.md` — นับว่ามี AC กี่ข้อ
- List ไฟล์เดิมใน `docs/02-design/02-technical/detailed-design/` ถ้ามี

สรุปให้ user เห็น: มี endpoint กี่ตัว, AC กี่ข้อ, และมี flow ที่เขียน detailed design ไปแล้วกี่ flow

### 2. ยืนยันขอบเขตกับ user

ใช้ AskUserQuestion **ทุกคำถามต้องมีตัวเลือกอย่างน้อย 3 แนวทาง** พร้อมข้อดี/ข้อเสีย และตัวเลือกที่แนะนำ ประเด็นที่ต้องถาม:

1. **จะทำ flow ไหนบ้าง** — เสนอเป็นชุด เช่น (ก) เฉพาะ flow ที่มีการคำนวณ/หักแต้ม/เปลี่ยนสถานะ (ข) ทุก flow ของ MVP (ค) ทุก endpoint — แนะนำ (ก) ก่อน เพราะเป็นจุดที่ AI เดาผิดบ่อยที่สุด และค่าใช้จ่ายต่อประโยชน์ดีที่สุด
2. **ความละเอียดของ pseudo code** — ระดับขั้นตอนธุรกิจ / ระดับที่ระบุ transaction กับ rollback / ระดับใกล้โค้ดจริง
3. **จะรวม security กับ error catalog ไว้ไฟล์ hub หรือแยกต่อ flow**
4. **ถ้ามีไฟล์เดิม** — เขียนทับ หรืออัปเดตเฉพาะ flow ที่เลือก (แนะนำอัปเดตเฉพาะส่วน เพื่อรักษารหัส DD/BR/ERR เดิม)

**ถ้าพบว่า flow ใดต้องการกฎธุรกิจที่ไม่มีใน spec หรือ AC — อย่าให้ agent เดา** ให้ถาม user ก่อนโดยเสนอทางเลือกอย่างน้อย 3 แบบ แล้วถ้าเป็นกฎใหม่จริง ให้แนะนำให้เปิด requirement ใหม่ผ่าน skill `new-requirement`

### 3. มอบหมายให้ subagent เขียนไฟล์

เรียก agent `detailed-design-writer` (`subagent_type: detailed-design-writer`) พร้อมส่ง `flows`, `stack`, `mode`, `date` และข้อสรุปทั้งหมด รวมถึงกฎธุรกิจที่ user เพิ่งยืนยัน

ถ้าเป็นการแก้เอกสารเดิม ส่ง `mode: update` และระบุชัดว่า **ห้ามแตะรหัส DD-XX / BR-XX / ERR-XX เดิม และห้ามแตะไฟล์ flow อื่น**

### 4. ตรวจงานที่ subagent ส่งกลับ

**อย่าเชื่อรายงานของ agent ตามตัวอักษร** ต้องเปิดไฟล์ตรวจเองอย่างน้อย 4 ข้อ:

1. **สุ่ม 3 ตัวเลข** ใน pseudo code / ตารางกฎธุรกิจ แล้วเปิด `acceptance-criteria.md` หรือ `test-cases/*.md` เทียบว่าตรงกัน
2. **กฎ boundary ทุกข้อระบุเครื่องหมายชัด** (`>=` หรือ `>`) ไม่ใช่เขียนว่า "แต้มพอ"
3. ทุก flow มีกรณีผิดพลาดครบอย่างน้อย: ข้อมูลผิด / ไม่มีสิทธิ์ / หาไม่เจอ / กดซ้ำ / แย่งกันแก้พร้อมกัน
4. Mermaid sequence diagram: ชื่อ participant และข้อความครอบ double quote ครบ

ถ้าค่าที่วัดเองไม่ตรงกับรายงาน ให้ยึดค่าที่วัดเองและบอก user

### 5. รายงานผลให้ user

สรุป: path ไฟล์ (markdown link), รหัส+ชื่อ flow ที่ทำ, จำนวน BR และ ERR, AC ที่ยังไม่ถูก flow ใดครอบคลุม, ช่องว่างที่พบ
แจ้งว่ายังไม่ได้ commit/push และถามก่อน — **อย่า push เองโดยไม่ถาม**
