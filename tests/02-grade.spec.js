// ─────────────────────────────────────────────────────────────
// 02-grade.spec.js — ครูตรวจให้คะแนนงานที่ pending_review → status เปลี่ยนเป็น graded จริง
// ทั้งบนหน้าจอและฐานข้อมูล (เปิดใหม่/รีเฟรชแล้วยังเห็นค่าที่เปลี่ยน)
// ต้องมี pending_review attempt ก่อน — สร้างจริงผ่านการทำแบบทดสอบ worksheet/attachment
// (เพราะ mcq ตรวจอัตโนมัติ ไม่มี pending_review ให้ตรวจ) แล้วให้ teacher เปิดจาก
// accordion กลุ่มของนักเรียนคนนั้น (ตาม spec.md: teacher เห็นงานจัดกลุ่มตามนักเรียน)
// อ้างอิง tester.md ข้อ 2
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");
const { accounts, login, logout, submitFirstTextAttempt, waitForResultsLoaded } = require("./helpers");

test("ครูให้คะแนนงาน pending_review แล้วสถานะเปลี่ยนเป็น graded จริง (รอดรีเฟรช)", async ({ page }) => {
  const answerText = "คำตอบทดสอบจาก Playwright — " + Date.now();

  // 1) student1 ทำแบบทดสอบ worksheet/attachment แล้วส่ง → ได้ status pending_review
  await login(page, accounts.student1);
  const { attemptId, title } = await submitFirstTextAttempt(page, answerText);
  expect(attemptId).toBeTruthy();
  await expect(page.locator("#กล่องงาน")).toContainText("รอครูตรวจ");
  await expect(page.locator("#กล่องงาน")).toContainText(answerText);
  await logout(page);

  // 2) ครูล็อกอิน เข้าหน้ารายการ ต้องเห็นงานนี้จัดกลุ่มอยู่ใต้ชื่อเล่นของ student1
  //    (accordion แยกตามนักเรียน ไม่ใช่ตารางแบนปนกัน — ตรวจตาม "เพิ่มเติมเฉพาะ war-point")
  await login(page, accounts.teacher);
  await page.goto("/quiz-attempts.html");
  await waitForResultsLoaded(page);

  const studentGroup = page.locator(".accordion-group", { hasText: accounts.student1.name });
  await expect(studentGroup).toHaveCount(1);

  // เปิด accordion ของนักเรียนคนนี้ (details/summary — คลิกที่ summary เพื่อกาง)
  await studentGroup.locator("summary").click();

  const row = studentGroup.locator('tr[data-id="' + attemptId + '"]');
  await expect(row).toBeVisible();
  await expect(row).toContainText("รอครูตรวจ");

  await row.click();
  await page.waitForURL(new RegExp("quiz-attempt-detail\\.html\\?id=" + attemptId));

  // 3) กรอกคะแนน + feedback แล้วบันทึก
  await expect(page.locator("#ช่องคะแนน")).toBeVisible();
  await page.locator("#ช่องคะแนน").fill("8");
  const feedbackText = "ทำได้ดี ทดสอบให้คะแนนโดย Playwright";
  await page.locator("#ช่องความเห็น").fill(feedbackText);
  await page.locator("#ปุ่มให้คะแนน").click();

  // 4) สถานะต้องเปลี่ยนเป็น graded บนหน้าจอทันที และฟอร์มให้คะแนนต้องหายไป (ตรวจแล้วแก้กลับไม่ได้)
  await expect(page.locator("#กล่องงาน")).toContainText("ตรวจแล้ว");
  await expect(page.locator("#กล่องงาน")).toContainText("8");
  await expect(page.locator("#ช่องคะแนน")).toHaveCount(0);
  await expect(page.locator("#รายการรีวิว")).toContainText(feedbackText);

  // 5) รีเฟรชหน้า (อ่านจาก Firestore ใหม่) ต้องยังเห็นค่าที่เปลี่ยนอยู่ — พิสูจน์ว่าบันทึกจริง
  await page.reload();
  await expect(page.locator("#กล่องงาน")).toContainText("ตรวจแล้ว");
  await expect(page.locator("#กล่องงาน")).toContainText("8");
  await expect(page.locator("#รายการรีวิว")).toContainText(feedbackText);

  // 6) และในรายการรวม (quiz-attempts.html) ก็ต้องเห็นสถานะใหม่เช่นกัน
  await page.goto("/quiz-attempts.html");
  await waitForResultsLoaded(page);
  const groupAfter = page.locator(".accordion-group", { hasText: accounts.student1.name });
  await groupAfter.locator("summary").click();
  const rowAfter = groupAfter.locator('tr[data-id="' + attemptId + '"]');
  await expect(rowAfter).toContainText("ตรวจแล้ว");
  void title; // เก็บไว้เผื่อ debug ไม่ได้ใช้ assert โดยตรง
});
