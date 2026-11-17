// ─────────────────────────────────────────────────────────────
// js/firebase.js — เปิดการเชื่อมต่อ Firebase ครั้งเดียว ให้ไฟล์อื่นเรียกใช้
// โหลดจาก CDN แบบ ES module (ไม่ต้องใช้ npm/bundler)
// การบ้านที่ 2: เพิ่ม Firebase Authentication (login/register) ตามแบบ leaveeasy
// ─────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";

var app = initializeApp(window.FIREBASE_CONFIG);

// เก็บไว้ที่ window ให้ไฟล์อื่น (ที่เป็น script ธรรมดา ไม่ใช่ module) เรียกใช้ได้
window.db = getFirestore(app);
window.fsCollection = collection;
window.fsGetDocs = getDocs;
window.fsGetDoc = getDoc;
window.fsQuery = query;
window.fsOrderBy = orderBy;
window.fsWhere = where;
window.fsDoc = doc;
window.fsSetDoc = setDoc;
window.fsUpdateDoc = updateDoc;
window.fsDeleteDoc = deleteDoc;
window.fsLimit = limit;
window.fsStartAfter = startAfter;
// นับจำนวนเอกสารโดยไม่ดึงเนื้อหา (คิด 1 read ต่อ 1,000 รายการ) — ใช้เช็คว่ากระดานคะแนนต้องคำนวณใหม่ไหม (B3)
window.fsGetCount = getCountFromServer;
// [เพิ่ม 2026-11-17] ทัวนาเมนต์ประกาศผลทีละรอบ: ต่อสู้/ประกาศต้องเขียนหลายจุดพร้อมกัน (ครบหรือไม่เขียนเลย)
window.fsRunTransaction = runTransaction;

window.auth = getAuth(app);
window.fbOnAuthStateChanged = onAuthStateChanged;
window.fbSignIn = signInWithEmailAndPassword;
window.fbCreateUser = createUserWithEmailAndPassword;
window.fbSignOut = signOut;

// บอกไฟล์อื่นว่าเชื่อมต่อพร้อมแล้ว (module script โหลดหลัง script ธรรมดาเสมอ
// จึงต้องมีสัญญาณนี้ให้ไฟล์อื่นรอ แทนการเดาว่าพร้อมหรือยัง)
window.dispatchEvent(new Event("firebase-ready"));
