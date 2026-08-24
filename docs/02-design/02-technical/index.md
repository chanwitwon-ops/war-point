# 02 - Technical

เก็บเอกสาร **การออกแบบเชิงเทคนิค (Technical Design)** เช่น

- System architecture / โครงสร้างระบบโดยรวม
- Database schema
- API design / data contract
- เทคโนโลยีและไลบรารีที่เลือกใช้ พร้อมเหตุผล

เอกสารในโฟลเดอร์นี้คือพิมพ์เขียวที่ทีมพัฒนาใช้อ้างอิงตอนลงมือเขียนโค้ด และเป็นฐานในการวางแผนทดสอบใน [[../../03-testing/01-test-plan/index|01-test-plan]]

## เอกสารในโฟลเดอร์นี้

- [[architecture|architecture]] — High-Level Architecture ระดับ Conceptual (3-tier monolith, CMP-01 ถึง CMP-20, DF-01 ถึง DF-04) รับ input จาก [[../../01-requirements/feature-list|feature-list]], [[../../01-requirements/user-journey|user-journey]] และ [[../../03-testing/01-test-plan/acceptance-criteria|acceptance-criteria]]
- [[database-schema|database-schema]] — Database Schema ระดับ Conceptual + Logical (Relational, ENT-01 ถึง ENT-26, soft delete เป็นค่าเริ่มต้นทุกตาราง) รับ input จาก [[architecture|architecture]]
- [[api-spec|api-spec]] — API Spec แบบ REST/JSON (API-01 ถึง API-61, session-based auth) รับ input จาก [[architecture|architecture]] และ [[database-schema|database-schema]]
- [[detailed-design|detailed-design]] — Detailed Design ระดับ Conceptual (DD-01 ถึง DD-08, BR-01 ถึง BR-19, ERR-01 ถึง ERR-16 — ครอบเฉพาะ flow ที่มีการคำนวณ/หักแต้ม/เปลี่ยนสถานะรอบนี้) พร้อมไฟล์ต่อ flow ใน [[detailed-design/buy-egg-and-choose-species|detailed-design/]] รับ input จาก [[architecture|architecture]], [[api-spec|api-spec]], [[database-schema|database-schema]] และ [[../../03-testing/01-test-plan/acceptance-criteria|acceptance-criteria]]
