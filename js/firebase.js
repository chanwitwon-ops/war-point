// ─────────────────────────────────────────────────────────────
// js/firebase.js — เปิดการเชื่อมต่อ Firebase ครั้งเดียว ให้ไฟล์อื่นเรียกใช้
// โหลดจาก CDN แบบ ES module (ไม่ต้องใช้ npm/bundler)
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

var app = initializeApp(window.FIREBASE_CONFIG);

// เก็บไว้ที่ window ให้ไฟล์อื่น (ที่เป็น script ธรรมดา ไม่ใช่ module) เรียกใช้ได้
window.db = getFirestore(app);
window.fsCollection = collection;
window.fsGetDocs = getDocs;
window.fsQuery = query;
window.fsOrderBy = orderBy;
window.fsDoc = doc;
window.fsSetDoc = setDoc;

// บอกไฟล์อื่นว่าเชื่อมต่อพร้อมแล้ว (module script โหลดหลัง script ธรรมดาเสมอ
// จึงต้องมีสัญญาณนี้ให้ไฟล์อื่นรอ แทนการเดาว่าพร้อมหรือยัง)
window.dispatchEvent(new Event("firebase-ready"));
