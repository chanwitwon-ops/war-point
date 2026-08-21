# 01 - Requirements

รวมเอกสารทุกอย่างที่เกี่ยวกับ **ความต้องการของโปรเจกต์** ตั้งแต่ต้นน้ำถึงปลายน้ำ แบ่งเป็น 3 หมวดย่อยตามลำดับการไหลของงาน:

- [[01-spec/index|01-spec]] — ข้อกำหนด/สเปคของระบบ (อะไรที่ต้องมี)
- [[02-plan/index|02-plan]] — แผนงานและ roadmap (จะทำเมื่อไหร่ ทำอย่างไร)
- [[03-task/index|03-task]] — งานย่อยที่แตกออกมาให้ลงมือทำได้จริง (ทำทีละอย่างอย่างไร)

## เอกสารระดับโฟลเดอร์ (ยังไม่ถูกสร้าง)

เอกสาร 3 ฉบับนี้จะถูกสร้างโดย skill ไม่ต้องเขียนมือ:

| ไฟล์ | สร้างด้วย | เนื้อหา |
|---|---|---|
| `backlog.md` | skill `new-requirement` | รายการ requirement ทั้งหมดพร้อมสถานะ เรียงจากล่าสุดไปเก่าสุด |
| `feature-list.md` | skill `sync-feature-journey` | Feature List (รหัส `FE-XX`) จัดลำดับด้วย MoSCoW และ trace กลับไปหา spec ต้นทางทุกรายการ |
| `user-journey.md` | skill `sync-feature-journey` | User Journey (รหัส `UJ-XX`) — Persona + Mermaid diagram + mapping กลับไปหา feature และ requirement |

โฟลเดอร์นี้คือจุดเริ่มต้นของโปรเจกต์ ก่อนจะต่อยอดไปสู่การออกแบบใน [[../02-design/index|02-design]] และการทดสอบใน [[../03-testing/index|03-testing]]
