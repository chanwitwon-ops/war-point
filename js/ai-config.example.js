// ─────────────────────────────────────────────────────────────
// js/ai-config.example.js — ต้นแบบ
//
// [แก้ 2026-11-03] ไม่มี apiKey ในไฟล์นี้อีกต่อไป — คีย์ OpenRouter จริงย้ายไปอยู่
// ฝั่งเซิร์ฟเวอร์แล้ว (Secret Manager ของ Cloud Function ดู functions/index.js และ
// CLAUDE.md หัวข้อ "Cloud Function (AI proxy)") ไฟล์นี้เหลือไว้แค่เลือก model เท่านั้น
//
// วิธีใช้: คัดลอกไฟล์นี้เป็นชื่อ js/ai-config.js (ไฟล์นั้นถูก .gitignore ไว้
// จะไม่ถูก push ขึ้น GitHub) ถ้าไม่สร้างไฟล์นี้ ระบบจะใช้ model เริ่มต้นที่ตั้งไว้
// ฝั่งเซิร์ฟเวอร์ให้เอง (ALLOWED_MODELS[0] ใน functions/index.js)
// ─────────────────────────────────────────────────────────────

window.AI_CONFIG = {
  model: "google/gemini-2.5-flash-lite"
};
