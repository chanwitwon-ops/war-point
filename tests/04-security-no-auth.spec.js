// ─────────────────────────────────────────────────────────────
// 04-security-no-auth.spec.js — [ความปลอดภัย] ไม่ล็อกอินแล้วเปิดหน้าที่ต้องล็อกอินตรงๆ
// ผ่าน URL ต้องเข้าไม่ได้เลย (auth-guard.js เด้งกลับ login.html) และห้ามเห็นข้อมูลใดๆ
// รั่วออกมาก่อนเด้งกลับ อ้างอิง js/auth-guard.js และ tester.md ข้อ 4
//
// แต่ละ test ของ Playwright ได้ browser context ใหม่ที่ไม่มี session ค้างอยู่แล้ว
// โดยดีฟอลต์ (ไม่มีการตั้ง storageState ใน playwright.config.js) จึงตรงกับโจทย์
// "fresh browser context, no stored session" พอดี
// ─────────────────────────────────────────────────────────────
const { test, expect } = require("@playwright/test");

test("ไม่ล็อกอิน เปิด quiz-attempts.html ตรงๆ ต้องเด้งไป login.html", async ({ page }) => {
  await page.goto("/quiz-attempts.html");
  await page.waitForURL(/login(\.html)?(\?.*)?$/);
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  // ต้องไม่มีร่องรอยของหน้ารายการส่งงานหลุดมาด้วย
  await expect(page.locator("#ผลลัพธ์")).toHaveCount(0);
});

test("ไม่ล็อกอิน เปิด quiz-attempt-detail.html?id=anything ตรงๆ ต้องเด้งไป login.html", async ({ page }) => {
  await page.goto("/quiz-attempt-detail.html?id=anything");
  await page.waitForURL(/login(\.html)?(\?.*)?$/);
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  // ต้องไม่มีร่องรอยของหน้ารายละเอียดงานหลุดมาด้วย
  await expect(page.locator("#กล่องงาน")).toHaveCount(0);
});
