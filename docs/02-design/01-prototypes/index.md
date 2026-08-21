# 01 - Prototypes

เก็บ **ต้นแบบหน้าตาของระบบ (UI/UX Prototype)** เช่น

- Wireframe / mockup ของแต่ละหน้าจอ
- User flow และ navigation flow
- Interactive prototype แบบกดใช้ได้จริง

ใช้สำหรับสื่อสารและตกลงหน้าตาของระบบก่อนลงมือพัฒนาจริง โดยอ้างอิงความต้องการจาก [[../../01-requirements/01-spec/index|01-spec]] และส่งต่อรายละเอียดเชิงระบบให้ [[../02-technical/index|02-technical]]

## Interactive Prototype (single-file HTML)

สร้างด้วย skill `build-prototype` โฟลเดอร์จะขึ้นต้นด้วย `v{n}-{YYYYMMDD}-{slug}` ภายในมี `index.html` (เปิดด้วย browser ได้ทันที self-contained ไม่ต้องต่ออินเทอร์เน็ต) และ `README.md` (ขอบเขต + click-through path + ข้อจำกัด)

**ต้องมี `DESIGN.md` ที่ root ก่อน** — ถ้ายังไม่มี skill `build-prototype` จะถามโทนสี/สไตล์แล้วสร้างให้

| เวอร์ชัน | วันที่ | ขอบเขต | สถานะ |
|---|---|---|---|
| _(ยังไม่มี)_ | | | |
