# war-point

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

ยังไม่มีซอร์สโค้ดของแอปพลิเคชันในโปรเจกต์นี้ — เอกสารและ prototype มาก่อน
