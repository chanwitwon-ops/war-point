# 01 - Test Plan

เก็บ **แผนการทดสอบ (Test Plan)** ที่เตรียมไว้ก่อนลงมือทดสอบจริง เช่น

- Acceptance Criteria แบบ Given-When-Then ต่อ feature
- Test case / test scenario ของแต่ละฟีเจอร์
- เงื่อนไขและข้อมูลที่ใช้ในการทดสอบ (test data)
- ขอบเขตของการทดสอบ (in scope / out of scope)

อ้างอิงจากข้อกำหนดใน [[../../01-requirements/01-spec/index|01-spec]] และการออกแบบใน [[../../02-design/index|02-design]] ผลของการทดสอบตาม test case เหล่านี้ให้บันทึกใน [[../02-test-result/index|02-test-result]]

## เอกสารในโฟลเดอร์นี้ (อัปเดตล่าสุด 2026-08-25)

สร้างด้วย skill `sync-test-plan` ทั้งหมด:

| เอกสาร | ระดับ | เนื้อหา |
|---|---|---|
| [[acceptance-criteria\|acceptance-criteria.md]] | ต่อ feature | Acceptance Criteria แบบ Given-When-Then (รหัส `AC-FE-XX-n`) + Traceability Matrix + ช่องว่างความครอบคลุม |
| [[test-plan\|test-plan.md]] | **1 ไฟล์ต่อโปรเจกต์** | Scope, Test Strategy, Test Environment, Risk Management, Entry/Exit Criteria, Schedule |
| `test-cases/{feature-slug}.md` | ต่อ feature หรือ journey | test case แบบ step-by-step (รหัส `TC-FE-XX-nnn`) ครบ 7 ช่อง |

**ไฟล์ `test-cases/` ที่สร้างแล้วจริง ณ วันที่ 2026-08-25:**

- [[test-cases/points-ledger|test-cases/points-ledger]]
- [[test-cases/pet-growth-economy|test-cases/pet-growth-economy]]
- [[test-cases/pet-species-and-egg|test-cases/pet-species-and-egg]]
- [[test-cases/weekly-arena|test-cases/weekly-arena]] **(อัปเดต 2026-08-25 — เพิ่ม FE-78/79/80/81 ปิด Coverage Gap G-14)**
- [[test-cases/pet-care-and-bonding|test-cases/pet-care-and-bonding]] **(เพิ่มใหม่ 2026-08-25 — FE-82/83/84)**
- [[test-cases/student-identity-and-roster|test-cases/student-identity-and-roster]] **(เพิ่มใหม่ 2026-08-25 — ปิด Coverage Gap G-13)**
- [[test-cases/teacher-lesson-and-quiz|test-cases/teacher-lesson-and-quiz]] **(เพิ่มใหม่ 2026-08-25 — ปิด Coverage Gap G-13)**
- [[test-cases/student-learn-and-pet|test-cases/student-learn-and-pet]] **(เพิ่มใหม่ 2026-08-25 — ปิด Coverage Gap G-13)**
- [[test-cases/teacher-class-overview|test-cases/teacher-class-overview]] **(เพิ่มใหม่ 2026-08-25 — ปิด Coverage Gap G-13)**
- [[test-cases/score-export-gradebook|test-cases/score-export-gradebook]] **(เพิ่มใหม่ 2026-08-25 — ปิด Coverage Gap G-13)**

**หมายเหตุ:** ช่อง Actual Result ในไฟล์ test case ทุกไฟล์ต้องเว้นว่างไว้เสมอ — ผลการทดสอบจริงและบั๊กที่พบให้บันทึกที่ [[../02-test-result/index|02-test-result]] เท่านั้น
