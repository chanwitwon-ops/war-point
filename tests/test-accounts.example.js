// ─────────────────────────────────────────────────────────────
// tests/test-accounts.example.js — ต้นแบบบัญชีทดสอบสำหรับ Playwright
//
// ไฟล์นี้ไม่มีรหัสผ่านจริง จึง commit ขึ้น GitHub ได้อย่างปลอดภัย
// ไฟล์จริงคือ tests/test-accounts.local.js ซึ่งถูกกันไว้ใน .gitignore แล้ว
//
// วิธีเตรียม (ต้องทำเองก่อนรันเทสต์ — Claude สร้างบัญชี/ล็อกอินแทนไม่ได้):
// 1. คัดลอกไฟล์นี้เป็น tests/test-accounts.local.js
// 2. สมัครบัญชีจริงผ่าน register.html — 2 บัญชีนักเรียน (student1, student2)
//    ทุกบัญชีที่สมัครใหม่เริ่มต้นเป็น role "student" อยู่แล้วโดยอัตโนมัติ
// 3. จะให้บัญชีไหนเป็น teacher ต้องไปแก้ field `role` เป็น "teacher" เองใน
//    Firebase Console > Firestore Database > โฟลเดอร์ users > เอกสารของบัญชีนั้น
//    (client แก้ role ตัวเองไม่ได้ ตาม firestore.rules)
// 4. ใส่อีเมล/รหัสผ่าน/ชื่อเล่นที่สมัครไว้จริงลงด้านล่างนี้ใน tests/test-accounts.local.js
// ─────────────────────────────────────────────────────────────

module.exports = {
  teacher: { email: "teacher@example.com", password: "รหัสผ่านจริง", role: "teacher", name: "ชื่อที่สมัครไว้" },
  student1: { email: "student1@example.com", password: "รหัสผ่านจริง", role: "student", name: "ชื่อเล่นที่สมัครไว้" },
  student2: { email: "student2@example.com", password: "รหัสผ่านจริง", role: "student", name: "ชื่อเล่นที่สมัครไว้" },
};
