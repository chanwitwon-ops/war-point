// ─────────────────────────────────────────────────────────────
// 03-required-fields.spec.js — ส่งงานโดยเว้นช่องคำตอบไว้ (worksheet/attachment)
// ต้องไม่บันทึก quizAttempts ใหม่ และต้องมีข้อความแจ้งเตือน (ไม่ใช่ปล่อยผ่านเงียบๆ)
// อ้างอิง js/quiz-attempt-new.js ฟังก์ชัน ส่งคำตอบ() บรรทัดตรวจ `if (!ข้อความ)` และ
// tester.md ข้อ 3
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");
const { accounts, login, findQuizSetLink, waitForResultsLoaded } = require("./helpers");

test("ส่งงาน worksheet/attachment โดยเว้นช่องคำตอบว่างไว้ ต้องไม่บันทึกและมีข้อความเตือน", async ({ page }) => {
  await login(page, accounts.student2);

  // นับจำนวนงานที่ student2 มีอยู่ก่อน เป็น baseline เทียบหลังพยายามส่งที่ควรจะ fail
  await page.goto("/quiz-attempts.html");
  await waitForResultsLoaded(page);
  const countBefore = await page.locator("tr[data-id]").count();

  const found = await findQuizSetLink(page, ["ใบงาน", "แนบไฟล์"]);
  test.skip(!found, "ไม่พบชุดข้อสอบฟอร์แมต worksheet/attachment เลยในระบบ quiz-sets.html — เป็น precondition ของข้อมูลทดสอบ ไม่ใช่บั๊ก");

  await page.goto(found.href);
  await page.waitForSelector("#กล่องหลัก:not(.hidden)");

  // ไม่กรอกอะไรในช่องคำตอบเลย แล้วกดส่งทันที
  await page.locator("#ปุ่มส่งคำตอบ").click();

  // ต้องไม่พาไปหน้าอื่น (ยังอยู่ quiz-attempt-new.html หน้าเดิม) และต้องมีข้อความเตือนแบบ inline
  await expect(page).toHaveURL(/quiz-attempt-new\.html/);
  const กล่องเตือนส่ง = page.locator("#กล่องเตือนส่ง");
  await expect(กล่องเตือนส่ง).toBeVisible();
  await expect(กล่องเตือนส่ง).toContainText("พิมพ์คำตอบ");

  // ปุ่มส่งต้องกลับมากดได้อีก (ไม่ค้างเป็น "กำลังส่งคำตอบ...")
  await expect(page.locator("#ปุ่มส่งคำตอบ")).toBeEnabled();
  await expect(page.locator("#ปุ่มส่งคำตอบ")).toHaveText("ส่งคำตอบ");

  // ตรวจว่าไม่มี quizAttempts ใหม่ถูกสร้างขึ้นจริง — จำนวนแถวในรายการต้องเท่าเดิม
  await page.goto("/quiz-attempts.html");
  await waitForResultsLoaded(page);
  const countAfter = await page.locator("tr[data-id]").count();
  expect(countAfter).toBe(countBefore);
});
