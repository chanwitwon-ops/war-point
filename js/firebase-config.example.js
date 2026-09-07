// ─────────────────────────────────────────────────────────────
// js/firebase-config.example.js — ต้นแบบ ให้คัดลอกเป็น js/firebase-config.js
// แล้วใส่ค่าจริงจาก Firebase Console → Project settings → Your apps
// (js/firebase-config.js ถูก gitignore ไว้แล้ว ไม่ต้องกลัวหลุดขึ้น GitHub)
// ─────────────────────────────────────────────────────────────

window.FIREBASE_CONFIG = {
  apiKey: "ใส่ค่าจริงจาก Firebase Console",
  authDomain: "ชื่อโปรเจกต์.firebaseapp.com",
  projectId: "ชื่อโปรเจกต์",
  storageBucket: "ชื่อโปรเจกต์.firebasestorage.app",
  messagingSenderId: "ใส่ค่าจริง",
  appId: "ใส่ค่าจริง"
};
