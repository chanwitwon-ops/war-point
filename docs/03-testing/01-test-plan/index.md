# 01 - Test Plan

เก็บ **แผนการทดสอบ (Test Plan)** ที่เตรียมไว้ก่อนลงมือทดสอบจริง เช่น

- Acceptance Criteria แบบ Given-When-Then ต่อ feature
- Test case / test scenario ของแต่ละฟีเจอร์
- เงื่อนไขและข้อมูลที่ใช้ในการทดสอบ (test data)
- ขอบเขตของการทดสอบ (in scope / out of scope)

อ้างอิงจากข้อกำหนดใน [[../../01-requirements/01-spec/index|01-spec]] และการออกแบบใน [[../../02-design/index|02-design]] ผลของการทดสอบตาม test case เหล่านี้ให้บันทึกใน [[../02-test-result/index|02-test-result]]

## เอกสารในโฟลเดอร์นี้ (ยังไม่ถูกสร้าง)

สร้างด้วย skill `sync-test-plan` ทั้งหมด:

| เอกสาร | ระดับ | เนื้อหา |
|---|---|---|
| `acceptance-criteria.md` | ต่อ feature | Acceptance Criteria แบบ Given-When-Then (รหัส `AC-FE-XX-n`) + Traceability Matrix + ช่องว่างความครอบคลุม |
| `test-plan.md` | **1 ไฟล์ต่อโปรเจกต์** | Scope, Test Strategy, Test Environment, Risk Management, Entry/Exit Criteria, Schedule |
| `test-cases/{feature-slug}.md` | ต่อ feature หรือ journey | test case แบบ step-by-step (รหัส `TC-FE-XX-nnn`) ครบ 7 ช่อง |

**หมายเหตุ:** ช่อง Actual Result ในไฟล์ test case ทุกไฟล์ต้องเว้นว่างไว้เสมอ — ผลการทดสอบจริงและบั๊กที่พบให้บันทึกที่ [[../02-test-result/index|02-test-result]] เท่านั้น
