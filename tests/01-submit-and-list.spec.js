// ─────────────────────────────────────────────────────────────
// 01-submit-and-list.spec.js — เส้นทางหลัก: นักเรียนทำแบบทดสอบ (mcq) แล้วส่ง
// ต้องเห็นงานที่ส่งในรายการของตัวเอง (quiz-attempts.html) จริง รวมถึงหลังรีเฟรชหน้า
// อ้างอิง spec.md หัวข้อ 1 (screens: quiz-sets.html → quiz-attempt-new.html →
// quiz-attempts.html) และ tester.md ข้อ 1
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");
const { accounts, login, submitFirstMcqAttempt, waitForResultsLoaded } = require("./helpers");

test("นักเรียนทำแบบทดสอบ mcq แล้วส่ง เห็นในรายการของตัวเอง (รวมหลังรีเฟรช)", async ({ page }) => {
  await login(page, accounts.student1);

  // ทำแบบทดสอบ mcq ชุดแรกที่เจอในระบบให้เสร็จแล้วกดส่ง — ถ้าไม่มีชุด mcq เลยในระบบ
  // ให้ throw ข้อความชัดเจน (ถือเป็น blocker ของข้อมูลทดสอบ ไม่ใช่บั๊กแอป)
  const { attemptId, title } = await submitFirstMcqAttempt(page);
  expect(attemptId).toBeTruthy();

  // mcq ตรวจให้คะแนนอัตโนมัติทันที ต้องเห็นสถานะ "ตรวจแล้ว" (graded) บนหน้ารายละเอียดทันที
  await expect(page.locator("#กล่องงาน")).toContainText("ตรวจแล้ว");
  await expect(page.locator("#กล่องงาน")).toContainText(title);

  // ไปหน้ารายการของตัวเอง ต้องเห็นแถวของ attempt ที่เพิ่งส่ง
  await page.goto("/quiz-attempts.html");
  await waitForResultsLoaded(page);
  const row = page.locator('tr[data-id="' + attemptId + '"]');
  await expect(row).toBeVisible();
  await expect(row).toContainText(title);
  await expect(row).toContainText("ตรวจแล้ว");

  // รีเฟรชหน้าแล้วข้อมูลต้องยังอยู่ (พิสูจน์ว่าบันทึกลง Firestore จริง ไม่ใช่แค่ state ในหน่วยความจำ)
  await page.reload();
  await waitForResultsLoaded(page);
  const rowAfterReload = page.locator('tr[data-id="' + attemptId + '"]');
  await expect(rowAfterReload).toBeVisible();
  await expect(rowAfterReload).toContainText(title);
});
