// ─────────────────────────────────────────────────────────────
// tests/helpers.js — ฟังก์ชันช่วยที่ใช้ร่วมกันในหลายเทสต์
// ─────────────────────────────────────────────────────────────
const accounts = require("./test-accounts.local");

/** ล็อกอินด้วยบัญชีที่ระบุ (ต้องอยู่ที่หน้า login.html หรือหน้าไหนก็ได้ที่ยังไม่ล็อกอิน) */
async function login(page, account) {
  await page.goto("/login.html");
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(account.password);
  await page.locator("#ปุ่มล็อกอิน").click();
  await page.waitForURL(/quiz-attempts(\.html)?$/);
}

async function logout(page) {
  const btn = page.locator("#ปุ่มออกจากระบบ");
  if (await btn.count()) {
    await btn.click();
    await page.waitForURL(/login(\.html)?$/);
  }
}

/**
 * รอให้กล่อง #ผลลัพธ์ (ใช้ทั้งใน quiz-sets.html และ quiz-attempts.html) โหลดเสร็จจริง
 * — ต้องรอ "จนกว่าข้อความจะไม่ใช่ 'กำลังโหลด…' อีกต่อไป" ไม่ใช่แค่รอให้ element
 * <p>/<table> ตัวไหนก็ได้โผล่มา เพราะ placeholder ตอนกำลังโหลดก็เป็น <p>กำลังโหลด…</p>
 * เหมือนกัน (ถ้า waitForSelector("#ผลลัพธ์ table, #ผลลัพธ์ p") จะ resolve ทันทีตอนยัง
 * โหลดไม่เสร็จ แล้วโค้ดที่ตามมาจะอ่านข้อมูลที่ยังไม่มาจริง)
 */
async function waitForResultsLoaded(page, selector) {
  selector = selector || "#ผลลัพธ์";
  await page.waitForFunction(
    (sel) => {
      var el = document.querySelector(sel);
      if (!el) return false;
      var text = el.textContent || "";
      return text.indexOf("กำลังโหลด") === -1;
    },
    selector,
    { timeout: 30000 }
  );
}

/**
 * เปิด quiz-sets.html แล้วหาแถวแรกที่ฟอร์แมตตรงกับ formatLabels (ป้ายไทยที่วาดโดย
 * js/quiz-sets.js เช่น "ปรนัย" / "ใบงาน" / "แนบไฟล์") และมีลิงก์ "ทำแบบทดสอบนี้"
 * (มีเฉพาะ role student) — คืน { title, href } ของแถวแรกที่เจอ หรือ null ถ้าไม่มีเลย
 * ต้องล็อกอินเป็น student มาก่อนแล้วจึงจะเห็นลิงก์นี้
 */
async function findQuizSetLink(page, formatLabels) {
  await page.goto("/quiz-sets.html");
  await waitForResultsLoaded(page);
  const rows = page.locator("#ผลลัพธ์ table tbody tr.clickable-row");
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const formatText = (await row.locator("td").nth(1).innerText()).trim();
    if (formatLabels.includes(formatText)) {
      const link = row.locator('a:has-text("ทำแบบทดสอบนี้")');
      if (await link.count()) {
        const title = (await row.locator("td").nth(0).innerText()).trim();
        const href = await link.getAttribute("href");
        return { title, href };
      }
    }
  }
  return null;
}

/**
 * ทำแบบทดสอบฟอร์แมต mcq ชุดแรกที่เจอในระบบให้เสร็จ (เลือกตัวเลือกแรกทุกข้อ ไม่สนใจ
 * ว่าถูกหรือผิด เพราะแค่ต้องการให้มี attempt เกิดขึ้นจริง) แล้วกดส่ง — mcq ตรวจให้
 * คะแนนอัตโนมัติทันที (status: "graded") ต้องล็อกอินเป็น student มาก่อน
 * คืน { attemptId, title } — throw ถ้าไม่มีชุด mcq เลยในระบบ (ให้ผู้เรียกตัดสินใจว่า
 * จะ skip หรือ fail ต่อ)
 */
async function submitFirstMcqAttempt(page) {
  const found = await findQuizSetLink(page, ["ปรนัย"]);
  if (!found) {
    throw new Error(
      "ไม่พบชุดข้อสอบฟอร์แมต mcq (ป้าย \"ปรนัย\") เลยในระบบ quiz-sets.html — ต้องมีอย่างน้อย 1 ชุดจึงจะรันเทสต์นี้ได้ (ไม่ใช่บั๊ก แต่เป็น precondition ของข้อมูลทดสอบ)"
    );
  }
  await page.goto(found.href);
  await page.waitForSelector("#กล่องหลัก:not(.hidden)");
  const cards = page.locator("#กล่องคำถาม .question-card");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    await cards.nth(i).locator('input[type="radio"]').first().check();
  }
  await page.locator("#ปุ่มส่งคำตอบ").click();
  await page.waitForURL(/quiz-attempt-detail\.html\?id=/);
  const url = new URL(page.url());
  return { attemptId: url.searchParams.get("id"), title: found.title };
}

/**
 * ทำแบบทดสอบฟอร์แมต worksheet/attachment ชุดแรกที่เจอในระบบ กรอกข้อความ `text`
 * ในช่องคำตอบแล้วกดส่ง — สร้าง status: "pending_review" รอครูตรวจ
 * ต้องล็อกอินเป็น student มาก่อน
 * คืน { attemptId, title } — throw ถ้าไม่มีชุด worksheet/attachment เลยในระบบ
 */
async function submitFirstTextAttempt(page, text) {
  const found = await findQuizSetLink(page, ["ใบงาน", "แนบไฟล์"]);
  if (!found) {
    throw new Error(
      "ไม่พบชุดข้อสอบฟอร์แมต worksheet/attachment (ป้าย \"ใบงาน\"/\"แนบไฟล์\") เลยในระบบ quiz-sets.html — ต้องมีอย่างน้อย 1 ชุดจึงจะรันเทสต์นี้ได้ (ไม่ใช่บั๊ก แต่เป็น precondition ของข้อมูลทดสอบ)"
    );
  }
  await page.goto(found.href);
  await page.waitForSelector("#กล่องหลัก:not(.hidden)");
  await page.locator("#ช่องคำตอบ").fill(text);
  await page.locator("#ปุ่มส่งคำตอบ").click();
  await page.waitForURL(/quiz-attempt-detail\.html\?id=/);
  const url = new URL(page.url());
  return { attemptId: url.searchParams.get("id"), title: found.title };
}

module.exports = {
  accounts,
  login,
  logout,
  waitForResultsLoaded,
  findQuizSetLink,
  submitFirstMcqAttempt,
  submitFirstTextAttempt,
};
