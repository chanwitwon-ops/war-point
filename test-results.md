# test-results.md — ผลการรันชุดทดสอบ Playwright (war-point)

รันด้วย `npm test` (Playwright) ต่อ Firebase project จริง `warpoint-191be` ผ่าน `http://localhost:3001`
(`npm run dev`) — บัญชีที่ใช้: `teacher`, `student1`, `student2` จาก `tests/test-accounts.local.js`

**รันล่าสุด (ผ่านทั้งหมด):** 2026-09-25 10:15 น. (SEAST) — `npm test` → **6/6 tests passed** (25.3s)
รันซ้ำอีกรอบก่อนหน้าด้วย `npx playwright test` ก็ผ่านทั้งหมดเช่นกัน (26.6s) — ยืนยันว่าไม่ใช่ฟลุ๊ค

```
Running 6 tests using 1 worker

  ok 1 tests/01-submit-and-list.spec.js      (5.2s)
  ok 2 tests/02-grade.spec.js                (7.9s)
  ok 3 tests/03-required-fields.spec.js      (4.8s)
  ok 4 tests/04-security-no-auth.spec.js › ไม่ล็อกอิน เปิด quiz-attempts.html          (0.5s)
  ok 5 tests/04-security-no-auth.spec.js › ไม่ล็อกอิน เปิด quiz-attempt-detail.html    (0.5s)
  ok 6 tests/05-security-cross-account.spec.js                                       (4.4s)

  6 passed (25.3s)
```

---

## สรุปผลต่อเทสต์

| # | ไฟล์ | ทดสอบอะไร | ผลล่าสุด |
|---|---|---|---|
| 1 | `tests/01-submit-and-list.spec.js` | นักเรียน (`student1`) ทำแบบทดสอบ `mcq` ชุดแรกที่เจอในระบบจนจบแล้วกดส่ง → ต้องเห็น attempt ใหม่ในหน้ารายการของตัวเอง (`quiz-attempts.html`) ทั้งก่อนและหลังรีเฟรชหน้า | **PASS** |
| 2 | `tests/02-grade.spec.js` | สร้าง `pending_review` attempt จริง (student1 ทำชุด `worksheet`/`attachment` แล้วส่ง) → ครูล็อกอิน เปิดจาก accordion ที่จัดกลุ่มตามชื่อนักเรียน → ให้คะแนน+feedback → status ต้องเปลี่ยนเป็น `graded` ทั้งบนหน้าจอทันทีและหลังรีเฟรช/เปิดหน้ารายการใหม่ | **PASS** |
| 3 | `tests/03-required-fields.spec.js` | ส่งแบบทดสอบ `worksheet`/`attachment` โดยเว้นช่องคำตอบว่างไว้ → ต้องไม่สร้าง `quizAttempts` ใหม่ (นับจำนวนแถวก่อน/หลังต้องเท่ากัน) และต้องมีข้อความเตือน inline พร้อมยังอยู่หน้าเดิม | **PASS** |
| 4 | `tests/04-security-no-auth.spec.js` (2 tests) | ไม่ล็อกอิน (browser context ใหม่ ไม่มี session ค้าง) เปิด `quiz-attempts.html` และ `quiz-attempt-detail.html?id=anything` ตรงๆ ผ่าน URL → ต้องเด้งไป `login.html` ทั้งคู่ ไม่มีข้อมูลหลุดออกมาก่อนเด้ง | **PASS** |
| 5 | `tests/05-security-cross-account.spec.js` | **[สำคัญที่สุด]** `student1` สร้าง attempt จริง → `student2` พยายามเปิด `quiz-attempt-detail.html?id=<id ของ student1>` ตรงๆ ผ่าน URL → ต้องไม่เห็นชื่อเล่น/ข้อมูลของ student1 บนจอ, ต้องเห็นข้อความ error แทน, และลอง query เอกสารเดียวกันตรงๆ ผ่าน Firestore SDK ที่หน้าโหลดไว้ (`window.fsGetDoc`) ต้องได้ error `permission-denied` — พิสูจน์ว่า security rule กันจริง ไม่ใช่แค่ UI ซ่อน | **PASS** |

**ไม่พบบั๊กความปลอดภัยข้อ 5 — cross-account block ทำงานถูกต้องทั้งฝั่งหน้าจอและฝั่ง Firestore rule จริง** (`firestore.rules` บังคับ `resource.data.studentId == request.auth.uid || isTeacher()` ตอน read และปฏิเสธ `student2` ด้วย `permission-denied` เมื่อ query ตรง — ยืนยันด้วยโค้ดเทสต์ ไม่ใช่แค่คาดเดา)

---

## ปัญหาที่เจอระหว่างเขียน/รัน และการวินิจฉัย (โค้ดแอปไม่ผิดสักจุด — เป็นปัญหาฝั่งเทสต์/โครงสร้างรันเทสต์ทั้งหมด)

ตามกติกาเหล็กของ `tester.md`: ทุกครั้งที่เทสต์ไม่ผ่าน ต้องอธิบายก่อนว่าเป็น (1) โค้ดแอปผิดจริง หรือ (2) เทสต์เขียนคาดหวังผิด — ด้านล่างคือทุกจุดที่เจอระหว่างทำงานจริง พร้อมข้อสรุปว่าเป็นกรณีไหน (ทั้งหมดเป็นกรณี 2 หรือปัญหาโครงสร้างรันเทสต์ที่ไม่ใช่ HTML/JS/firestore.rules ของแอป — **ไม่มีจุดไหนต้องแก้โค้ดแอป**):

1. **`findQuizSetLink`/หน้ารายการรอโหลดเสร็จเร็วเกินไป (เทสต์ผิด)** — ตอนแรกใช้ `page.waitForSelector("#ผลลัพธ์ table, #ผลลัพธ์ p")` แต่ตอนกำลังโหลดข้อมูล หน้าก็แสดง `<p>กำลังโหลด…</p>` อยู่แล้ว (เข้าเงื่อนไข selector "หรือมี p" ทันที) ทำให้โค้ดเทสต์อ่านตารางที่ยังไม่มาจริง แล้วสรุปผิดว่า "ไม่มีชุดข้อสอบ mcq/worksheet เลยในระบบ" ทั้งที่จริงมีอยู่ (ยืนยันด้วยสคริปต์ตรวจสอบชั่วคราวที่ query Firestore ตรง พบ `quizSets` 4 ชุด ครบทั้ง mcq/worksheet/attachment) — แก้โดยเพิ่ม `waitForResultsLoaded()` ใน `tests/helpers.js` ที่รอจนกว่าข้อความในกล่องจะไม่ใช่ "กำลังโหลด" อีกต่อไปจริงๆ
2. **`serve` (dev server ที่ใช้รัน `npm run dev`) เปิด "clean URLs" โดย default (ปัญหาโครงสร้างรันเทสต์ ไม่ใช่โค้ดแอป)** — พบว่าเมื่อคลิกลิงก์ `quiz-attempt-new.html?quizSetId=xxx` (ลิงก์จริงในแอปที่ `quiz-sets.html` สร้างไว้ ถูกต้องตามสเปค) แพ็กเกจ `serve` จะ 301-redirect เป็น `/quiz-attempt-new` **โดยตัด query string ทิ้งไปด้วย** (ยืนยันด้วย `curl -sD -` เห็น `Location: /quiz-attempt-new` ไม่มี `?quizSetId=...`) ทำให้หน้า `quiz-attempt-new.html` โหลดมาโดยไม่มี `quizSetId` แล้วขึ้น "ไม่พบชุดข้อสอบที่ต้องการ" เสมอ — **นี่ไม่ใช่บั๊กของโค้ดแอป** เพราะ Firebase Hosting จริง (`firebase.json` ไม่ได้ตั้ง `cleanUrls`) ไม่ทำพฤติกรรมนี้ เว็บที่ deploy จริงจึงไม่ควรเจอปัญหานี้ — แต่เป็นความไม่ตรงกันระหว่าง dev server ที่ใช้ทดสอบกับพฤติกรรมจริงของ Firebase Hosting ที่ระบุไว้ว่า "เทียบเท่ากันทุกประการ" จึงแก้ที่ **เพิ่มไฟล์ `serve.json` ที่ root (`{"cleanUrls": false}`)** ให้ dev server หยุด redirect ตัด query string ทิ้ง ไม่ได้แตะไฟล์ HTML/JS/firestore.rules ของแอปเลย
3. **`fullyParallel: false` ใน `playwright.config.js` ไม่ได้บังคับ `workers: 1` จริง (ความเสี่ยงด้านโครงสร้างรันเทสต์)** — comment ในไฟล์ config บอกเจตนาไว้ชัดว่า "ทดสอบ Firestore จริง รันทีละตัวกันข้อมูลชนกัน" แต่ `fullyParallel: false` มีผลแค่ "เทสต์ในไฟล์เดียวกัน" รันเรียงกัน ส่วนคนละไฟล์ Playwright ยังส่งไปรันคนละ worker พร้อมกันได้ตามจำนวน CPU (พบว่ารันจริงด้วย 5 workers พร้อมกัน) ซึ่งเสี่ยงชนกันเพราะทุกไฟล์ใช้บัญชี `teacher`/`student1`/`student2` ชุดเดียวกันตีฐานข้อมูลจริงพร้อมกัน — แก้โดยเพิ่ม `workers: 1` ใน `playwright.config.js` ให้ตรงกับเจตนาที่ comment ระบุไว้จริง (ไม่ใช่ไฟล์แอป)
4. **`page.waitForLoadState("networkidle")` ค้างจนหมดเวลาในเทสต์ 5 (เทสต์เขียนผิดวิธีรอ)** — Firestore ใช้ long-polling/stream ค้างการเชื่อมต่อไว้ตลอดเวลาที่หน้าเปิดอยู่ เครือข่ายจึงไม่มีวัน "idle" จริงตามที่ Playwright นิยาม ทำให้ `waitForLoadState("networkidle")` timeout เสมอไม่ว่าอะไรจะเกิดขึ้นจริงบนหน้าก็ตาม — แก้โดยเปลี่ยนไปรอเงื่อนไขที่ตรงกับสิ่งที่ต้องการจริง (`page.waitForFunction` รอจนข้อความในกล่องงานไม่ใช่ placeholder "กำลังโหลดข้อมูล…" อีกต่อไป ไม่ว่าผลจะสำเร็จหรือ error ก็ตาม)

**สรุป:** หลังแก้ทั้ง 4 จุดข้างต้น (ทั้งหมดอยู่ในไฟล์ `tests/*.js`, `playwright.config.js`, และไฟล์ config ใหม่ `serve.json` — ไม่มีจุดไหนแตะ `.html`, `js/*.js` ของแอป, หรือ `firestore.rules` เลย) รันซ้ำ 2 รอบติดกันผ่านครบ 6/6 ทุกครั้ง

---

## ไฟล์ที่เพิ่ม/แก้ระหว่างงานนี้

- เพิ่ม: `tests/01-submit-and-list.spec.js`, `tests/02-grade.spec.js`, `tests/03-required-fields.spec.js`, `tests/04-security-no-auth.spec.js`, `tests/05-security-cross-account.spec.js`
- แก้: `tests/helpers.js` (เพิ่ม `waitForResultsLoaded`, `findQuizSetLink`, `submitFirstMcqAttempt`, `submitFirstTextAttempt` — ใช้ร่วมกันหลายไฟล์เทสต์)
- แก้: `playwright.config.js` (เพิ่ม `workers: 1` ให้ตรงกับเจตนาเดิมของ comment ในไฟล์)
- เพิ่ม: `serve.json` ที่ root (`{"cleanUrls": false}`) ให้ dev server ที่ใช้ทดสอบ (`serve -l 3001 .`) มีพฤติกรรมตรงกับ Firebase Hosting จริง (ไม่ redirect ตัด query string ทิ้ง)
