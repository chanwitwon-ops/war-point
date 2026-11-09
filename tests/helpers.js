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
  await page.waitForURL(/home(\.html)?$/); // หลังล็อกอินไปหน้าหลักแยกบทบาท (2026-11-08)
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

// ─────────────────────────────────────────────────────────────
// [เพิ่ม 2026-11-09] ชุดข้อสอบสำหรับเทสต์อัตโนมัติโดยเฉพาะ
// เดิมเทสต์ใช้ "ชุดแรกที่เจอในระบบ" ซึ่งเป็นชุดจริงของห้อง → ใช้สิทธิ์ทำข้อสอบ (maxAttempts)
// ของนักเรียนจริงจนหมด และเพิ่มแต้มให้บัญชีที่ใช้เดโม (ขวานฟ้า/เหินฟ้า)
// ตอนนี้เทสต์ใช้ 2 ชุดนี้เท่านั้น:
//   - testOnly: true → ซ่อนจากรายการชุดข้อสอบ/หน้าหลักของนักเรียน (js/quiz-sets.js, js/home-data.js)
//   - maxAttempts 1000 → รันเทสต์ซ้ำได้เรื่อยๆ (rules อ่าน maxAttempts ของชุดตรงๆ ไม่มีเพดาน)
//   - ได้ 0 คะแนนเสมอ: ข้อ mcq มีตัวเลือกแรกผิด (เทสต์เลือกตัวเลือกแรก) และเทสต์ 02 ให้ 0 คะแนน
//     → แต้มของบัญชีนักเรียนไม่เปลี่ยนจากการรันเทสต์
// ─────────────────────────────────────────────────────────────
const TEST_SETS = {
  mcq: {
    id: "autotest-mcq",
    data: {
      title: "[เทสต์อัตโนมัติ] ปรนัย",
      format: "mcq",
      fullScore: 1,
      maxAttempts: 1000,
      testOnly: true,
      gradingMethod: "auto",
      creationSource: "teacher",
      questions: [{
        questionText: "ข้อทดสอบอัตโนมัติ (Playwright)",
        choices: [
          { choiceText: "ตัวเลือกผิด (เทสต์เลือกตัวนี้เสมอ)", isCorrect: false },
          { choiceText: "ตัวเลือกถูก", isCorrect: true }
        ]
      }]
    }
  },
  worksheet: {
    id: "autotest-worksheet",
    data: {
      title: "[เทสต์อัตโนมัติ] ใบงาน",
      format: "worksheet",
      fullScore: 10,
      maxAttempts: 1000,
      testOnly: true,
      gradingMethod: "manual",
      creationSource: "teacher"
    }
  }
};

/**
 * สร้างชุดข้อสอบสำหรับเทสต์ ถ้ายังไม่มี (ล็อกอินเป็นครูใน context แยก — ไม่กระทบ page ของเทสต์)
 * เรียกใน test.beforeAll ของทุกไฟล์ที่ใช้ชุดเหล่านี้ (idempotent)
 */
async function ensureTestQuizSets(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await login(page, accounts.teacher);
    await page.evaluate(async (sets) => {
      for (const key of Object.keys(sets)) {
        const ref = window.fsDoc(window.db, "quizSets", sets[key].id);
        const snap = await window.fsGetDoc(ref);
        if (!snap.exists()) {
          await window.fsSetDoc(ref, Object.assign({ createdAt: "เทสต์อัตโนมัติ" }, sets[key].data));
        }
      }
    }, TEST_SETS);
  } finally {
    await context.close();
  }
}

/** ทำชุด mcq ของเทสต์ (เลือกตัวเลือกแรกทุกข้อ = ผิด → 0 คะแนน) แล้วส่ง — คืน { attemptId, title } */
async function submitTestMcqAttempt(page) {
  await page.goto("/quiz-attempt-new.html?quizSetId=" + TEST_SETS.mcq.id);
  await page.waitForSelector("#กล่องหลัก:not(.hidden)");
  const cards = page.locator("#กล่องคำถาม .question-card");
  const n = await cards.count();
  for (let i = 0; i < n; i++) {
    await cards.nth(i).locator('input[type="radio"]').first().check();
  }
  await page.locator("#ปุ่มส่งคำตอบ").click();
  await page.waitForURL(/quiz-attempt-detail\.html\?id=/);
  return { attemptId: new URL(page.url()).searchParams.get("id"), title: TEST_SETS.mcq.data.title };
}

/** ทำชุดใบงานของเทสต์ กรอก `text` แล้วส่ง → pending_review — คืน { attemptId, title } */
async function submitTestTextAttempt(page, text) {
  await page.goto("/quiz-attempt-new.html?quizSetId=" + TEST_SETS.worksheet.id);
  await page.waitForSelector("#กล่องหลัก:not(.hidden)");
  await page.locator("#ช่องคำตอบ").fill(text);
  await page.locator("#ปุ่มส่งคำตอบ").click();
  await page.waitForURL(/quiz-attempt-detail\.html\?id=/);
  return { attemptId: new URL(page.url()).searchParams.get("id"), title: TEST_SETS.worksheet.data.title };
}

module.exports = {
  accounts,
  login,
  logout,
  waitForResultsLoaded,
  findQuizSetLink,
  submitFirstMcqAttempt,
  submitFirstTextAttempt,
  TEST_SETS,
  ensureTestQuizSets,
  submitTestMcqAttempt,
  submitTestTextAttempt,
};
