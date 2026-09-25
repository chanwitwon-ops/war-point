// ─────────────────────────────────────────────────────────────
// 05-security-cross-account.spec.js — [ความปลอดภัย ข้อสำคัญที่สุด] student2 ต้องเปิด
// รายละเอียดการส่งงานของ student1 ไม่ได้เลย ทั้งทางหน้าจอและทางตรงผ่าน Firestore SDK
// (พิสูจน์ว่า security rule กันจริง ไม่ใช่แค่หน้าจอซ่อน) — ถ้าเทสต์นี้ fail (คือเปิดเข้าไป
// เห็นข้อมูลจริงได้) ให้ถือเป็นบั๊กความปลอดภัยระดับร้ายแรงทันที
// อ้างอิง firestore.rules (match /quizAttempts/{attemptId} allow read) และ tester.md ข้อ 5
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");
const { accounts, login, logout, submitFirstMcqAttempt } = require("./helpers");

test("[security] student2 เปิดดูรายละเอียดงานของ student1 ผ่าน URL ตรงๆ ไม่ได้", async ({ page }) => {
  // 1) สร้าง attempt ที่เป็นของ student1 แน่นอน (ทำ mcq ให้เสร็จ ไม่ต้องรอครูตรวจ)
  await login(page, accounts.student1);
  const { attemptId } = await submitFirstMcqAttempt(page);
  expect(attemptId).toBeTruthy();
  await logout(page);

  // 2) student2 ล็อกอินแล้วพยายามเปิดรายละเอียดของ student1 ตรงๆ ผ่าน URL
  await login(page, accounts.student2);
  await page.goto("/quiz-attempt-detail.html?id=" + encodeURIComponent(attemptId));
  // ห้ามใช้ waitForLoadState("networkidle") — Firestore ใช้ long-polling/stream ค้างไว้
  // ตลอดเวลา เครือข่ายจะไม่มีวัน "idle" จริง ต้องรอจนกว่าข้อความในกล่องงานจะไม่ใช่
  // placeholder "กำลังโหลดข้อมูล…" อีกต่อไปแทน (โหลดเสร็จไม่ว่าจะสำเร็จหรือ error)
  await page.waitForFunction(() => {
    var el = document.querySelector("#กล่องงาน");
    return !!el && (el.textContent || "").indexOf("กำลังโหลดข้อมูล") === -1;
  }, null, { timeout: 30000 });

  const bodyText = (await page.locator("#กล่องงาน").innerText()).trim();

  // ต้องไม่เห็นชื่อเล่นของ student1 (ข้อมูลเจ้าของจริง) หลุดออกมาในหน้าจอเด็ดขาด
  if (bodyText.includes(accounts.student1.name)) {
    throw new Error(
      "CRITICAL SECURITY BUG: หน้า quiz-attempt-detail.html แสดงข้อมูลของ student1 " +
      "(ชื่อเล่น \"" + accounts.student1.name + "\") ให้ student2 เห็นได้ทั้งที่ไม่ใช่เจ้าของงาน — " +
      "เนื้อหาที่เห็นจริง: " + bodyText
    );
  }

  // ควรเห็นข้อความ error จากการโหลดไม่สำเร็จแทน (permission-denied ถูกจับใน try/catch
  // ของ js/quiz-attempt-detail.js ฟังก์ชัน โหลดข้อมูล())
  expect(bodyText).toMatch(/ไม่สำเร็จ|permission|denied|ไม่พบ/i);

  // 3) พิสูจน์ว่า security rule กันจริงระดับ Firestore ไม่ใช่แค่หน้าจอซ่อน — เรียก SDK
  //    ที่หน้านี้โหลดไว้อยู่แล้ว (window.db/window.fsDoc/window.fsGetDoc จาก js/firebase.js)
  //    ลอง query เอกสารเดียวกันตรงๆ เหมือนเปิด dev console เอง
  const directQueryResult = await page.evaluate(async (id) => {
    try {
      const snap = await window.fsGetDoc(window.fsDoc(window.db, "quizAttempts", id));
      return { blocked: false, exists: snap.exists(), data: snap.exists() ? snap.data() : null };
    } catch (err) {
      return { blocked: true, code: err && err.code, message: err && err.message };
    }
  }, attemptId);

  if (!directQueryResult.blocked) {
    throw new Error(
      "CRITICAL SECURITY BUG: student2 สามารถ query เอกสาร quizAttempts/" + attemptId +
      " ของ student1 ได้ตรงๆ ผ่าน Firestore SDK (ข้าม UI ไปเลย) — " +
      "ได้ข้อมูลจริง: " + JSON.stringify(directQueryResult.data) +
      " — แปลว่า firestore.rules ไม่ได้บังคับ studentId == request.auth.uid จริงตามที่ตั้งใจ"
    );
  }
  expect(String(directQueryResult.code || "")).toMatch(/permission-denied/i);
});
