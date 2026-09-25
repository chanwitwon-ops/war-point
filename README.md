# war-point

🌐 **เว็บออนไลน์:** https://warpoint-191be.web.app
🧪 **รายงานผลการทดสอบ:** [test-results.md](test-results.md) — 6/6 ผ่าน
📝 **สิ่งที่ยังไม่เสร็จ:** [BACKLOG.md](BACKLOG.md)

โปรเจกต์นี้ใช้กระบวนการทำงานแบบเอกสารนำโค้ด (document-driven) โดยมี agent และ skill ช่วยในแต่ละ phase

## เริ่มต้น

เปิด Claude Code ในโฟลเดอร์นี้ แล้วเรียก skill ตามลำดับ

| ลำดับ | Skill | ได้อะไร |
|---|---|---|
| 1 | `/new-requirement` | requirement spec ใน `docs/01-requirements/01-spec/` + `backlog.md` |
| 2 | `/sync-feature-journey` | `feature-list.md` (FE-XX + MoSCoW) + `user-journey.md` (UJ-XX + Mermaid) |
| 3 | `/build-prototype` | `DESIGN.md` + interactive prototype แบบ single-file HTML |
| 4 | `/sync-test-plan` | acceptance criteria + test plan + test case |
| 5 | `/audit-backlog` และ `/audit-prototype` | รายงานความไม่สอดคล้องทั้งสาย ก่อน commit |

รายละเอียดข้อตกลงของโปรเจกต์ทั้งหมดอยู่ใน [CLAUDE.md](CLAUDE.md) และโครงเอกสารอยู่ใน [docs/](docs/)

## หมายเหตุ

ตั้งแต่การบ้าน Module 2 มีซอร์สโค้ดจริงส่วนหนึ่งแล้ว (Firestore + Firebase Authentication) ตามขอบเขตใน [SCOPE.md](SCOPE.md) — วิธีรันดูที่ [CLAUDE.md](CLAUDE.md) หัวข้อ "สถานะปัจจุบันของ repository" เว็บจริงอยู่ที่ https://warpoint-191be.web.app
