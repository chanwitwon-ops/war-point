# spec.md — war-point (สรุปสเปคสำหรับการบ้าน Module 2 สัปดาห์ 9)

> รวม [SCOPE.md](SCOPE.md) + สถานะโค้ดจริงหลังการบ้านที่ 1–3 ไว้ในไฟล์เดียว ใช้เป็นใบสั่งงานให้ผู้ช่วย AI ทั้ง 3 ตัว (`ui-screens`, `data-auth-engineer`, `ai-quiz-assistant`) อ่านก่อนเริ่มงาน — ไม่ใช่สเปคฉบับเต็มของ war-point (ดูฉบับเต็มที่ `docs/`)

## ประโยคเดียวสรุประบบ

ระบบเก็บ **การส่งงาน/ทำแบบทดสอบของนักเรียน (quiz attempt)** ที่ **นักเรียน** เป็นผู้สร้างตอนส่งงาน มีสถานะ `submitted → pending_review → graded` และ **ครู** เป็นผู้เปลี่ยนสถานะตอนให้คะแนน/feedback — มี AI ช่วย 2 จุด: ครูออกข้อสอบจากบทเรียน และครูอ่านสรุปภาพรวมนักเรียนก่อนตรวจ

## 1. หน้าจอ (screens)

| ไฟล์ | หน้าที่ | เข้าถึงได้เมื่อ |
|---|---|---|
| `login.html` | เข้าสู่ระบบ (Firebase Auth อีเมล/รหัสผ่าน) | ไม่ต้องล็อกอิน |
| `register.html` | สมัครสมาชิก — ทุกบัญชีเริ่มต้น `role: "student"` เสมอ (ยกระดับเป็น teacher ต้องแก้ผ่าน Firebase Console) | ไม่ต้องล็อกอิน |
| `index.html` | redirect ไป `quiz-attempts.html` | ไม่ต้องล็อกอิน |
| `quiz-attempts.html` | รายการส่งงาน/ทำแบบทดสอบ — **student**: เห็นเฉพาะของตัวเอง (query กรองด้วย `studentId == uid`) · **teacher**: เห็นของทุกคน จัดเป็น**กลุ่ม/accordion แยกตามนักเรียน** (หัวข้อกลุ่ม = `studentNickname`, กดขยายดูรายการงานของนักเรียนคนนั้น) กันงานของหลายคนปนกันมั่วเมื่อรายการเยอะ | ต้องล็อกอิน |
| `quiz-attempt-detail.html` | รายละเอียดการส่งงาน 1 รายการ + ปุ่มครูให้คะแนน/เขียนรีวิว (เปลี่ยนสถานะ) + ปุ่ม **🤖 AI สรุปภาพรวมนักเรียน** (ระดับ 2) | ต้องล็อกอิน |
| `quiz-sets.html` | รายการชุดข้อสอบ/ใบงานที่มี — เพิ่มลิงก์ **"ทำแบบทดสอบนี้"** ต่อแถว (เห็นเฉพาะ student) ไปหน้า `quiz-attempt-new.html?quizSetId=...` | ต้องล็อกอิน |
| `quiz-attempt-new.html` **(ของใหม่ — เพิ่งเพิ่มการบ้านนี้)** | นักเรียนทำแบบทดสอบจริงแล้วส่ง — โหลด `quizSets/{id}` มาแสดง: **`mcq`** แสดงคำถาม+ตัวเลือกให้เลือกตอบ (radio) กดส่งแล้วตรวจ/คำนวณคะแนนอัตโนมัติทันที (`status: "graded"` ทันที ไม่มี `reviews`); **`worksheet`/`attachment`** มีช่องข้อความให้พิมพ์คำตอบ/สรุปงาน (ยังไม่รองรับอัปโหลดไฟล์จริง — Firebase Storage อยู่นอกขอบเขต) กดส่งแล้วสร้างเป็น `status: "pending_review"` รอครูตรวจ | ต้องล็อกอิน (เฉพาะ student — teacher ไม่มีเหตุผลต้องส่งงาน) |
| `quiz-set-new.html` | สร้างชุดข้อสอบใหม่ + ปุ่ม **🤖 AI ออกข้อสอบจากบทเรียน** (ระดับ 1) | ต้องล็อกอิน |
| `seed.html` | ใส่ข้อมูลตัวอย่างลง Firestore (เครื่องมือ dev) — **หลังการบ้านนี้ seed `quizAttempts`/`reviews` ไม่ได้แล้ว** (ดูหัวข้อ "ผลข้างเคียงจากการแก้ Security Rule" ท้ายไฟล์) ยังใช้ seed `students`/`quizSets` ได้ปกติ | ไม่ต้องล็อกอิน |

## 2. โครงสร้างข้อมูล (Firestore collections)

| โฟลเดอร์ | เทียบเท่า LeaveEasy | ฟิลด์หลัก |
|---|---|---|
| `students` | `users` | `studentCode`, `nickname`, `isActive`, `aiSummary` (ผลสรุปล่าสุดจาก AI ระดับ 2), `aiSummaryUpdatedAt` |
| `students/{id}/aiLog` | — (ของใหม่) | `input`, `output`, `createdAt` — log ทุกครั้งที่เรียก AI สรุปภาพรวมนักเรียนคนนั้น |
| `quizSets` | `leaveTypes` | `title`, `format` (`mcq` \| `worksheet` \| `attachment`), `fullScore`, `creationSource` (`"ai"` \| `"teacher"`) |
| `quizSets/{id}/aiLog` | — (ของใหม่) | log ทุกครั้งที่ AI ช่วยออกข้อสอบชุดนั้น |
| `quizAttempts` | `leaveRequests` | `studentId`, `studentNickname` (จดซ้ำ), `quizSetId`, `quizSetTitle` (จดซ้ำ), `status`, `scoreAwarded`, `submittedAt`, `submittedText` (เฉพาะ `worksheet`/`attachment` — ข้อความที่นักเรียนพิมพ์ส่ง ให้ครูอ่านตอนตรวจ) |
| `quizAttempts/{id}/reviews` | `approvals` | `teacherName`, `feedback`, `scoreGiven`, `reviewedAt` — มีเฉพาะงานที่ครูตรวจมือ (`worksheet`/`attachment`), งาน `mcq` ตรวจอัตโนมัติไม่มี review |
| `users/{uid}` | — (auth-linked) | `role` (`"student"` \| `"teacher"`) ผูกกับ Firebase Auth uid |

**สถานะของ `quizAttempts.status`:** `submitted` (นักเรียนเพิ่งส่ง, เฉพาะ `mcq` ที่ตรวจอัตโนมัติได้ทันทีจะข้ามไป `graded` เลย) → `pending_review` (รอครูตรวจ, ใช้กับ `worksheet`/`attachment`) → `graded` (ครูให้คะแนนแล้ว, **สถานะปลายทาง เปลี่ยนกลับไม่ได้**)

## 3. บทบาทผู้ใช้ (roles)

| บทบาท | ทำได้ | ทำไม่ได้ |
|---|---|---|
| 🙋 **student** | ส่งงานใหม่ (บันทึก `studentId` เป็น uid ตัวเอง) · ดูรายการส่งงาน **เฉพาะของตัวเอง** · ดูรายละเอียด 1 รายการของตัวเอง | ให้คะแนน/เขียนรีวิว (ไม่มีปุ่มนี้เลย) · แก้ไข/เพิ่ม/ลบ `quizSets` · **เปิดดู/ดึงข้อมูลงานของนักเรียนคนอื่นไม่ได้เลย ทั้งหน้าจอและระดับ Firestore rule** |
| ✅ **teacher** | เห็นรายการส่งงาน **ของทุกคน จัดกลุ่มตามนักเรียน** · ให้คะแนน/เขียนรีวิวงานที่ `pending_review` (→ `graded` + สร้าง `reviews` subdoc) · ใช้ปุ่ม AI ทั้ง 2 จุด | เปลี่ยนสถานะงานที่ `graded` แล้วกลับเป็น `pending_review` |

**เปลี่ยนจากเดิม (สำคัญ):** เดิม `quiz-attempts.html` ทุกคนที่ล็อกอินเห็นทุกรายการปนกันหมด (ทำเครื่องหมาย ⏳ ไว้ใน ACL.md ว่ายังไม่บังคับ) — **รอบนี้ต้องแก้ทั้งฝั่งหน้าจอ (query กรอง/จัดกลุ่ม) และฝั่ง Firestore Security Rules (เช็คว่า `studentId` ตรงกับ `request.auth.uid` จริง ไม่ใช่แค่ล็อกอินหรือยัง)** เพราะเป็นเงื่อนไขที่เทสต์ความปลอดภัยข้อ 5 (บัญชีที่สองเปิดของบัญชีแรกไม่ได้) ของการบ้านนี้จะพิสูจน์โดยตรง — งานนี้เป็นของ `data-auth-engineer` (แก้ rule) ร่วมกับ `ui-screens` (แก้ query/จัดกลุ่ม)

## 4. ฟีเจอร์ AI (2 ระดับ ผ่าน OpenRouter, `js/ai.js`)

1. **ระดับ 1 — AI ออกข้อสอบจากบทเรียน** (`quiz-set-new.html`, FE-15/FE-37): ครูพิมพ์เนื้อหาบทเรียน + จำนวนข้อ (1–10) → AI ร่างคำถามปรนัยให้ → ครูตรวจ/แก้ก่อนบันทึกเสมอ → log ทุกครั้งที่เรียกไว้ที่ `quizSets/{id}/aiLog`
2. **ระดับ 2 — AI สรุปภาพรวมนักเรียน** (`quiz-attempt-detail.html`): ครูกดปุ่ม → อ่านประวัติทุกงานที่ `graded` แล้วของนักเรียนคนนั้น (คะแนน + feedback จากทุก review) → AI เขียนสรุปสั้นไม่เกิน 3 ประโยค → เขียนกลับ `students/{id}.aiSummary` + log ที่ `students/{id}/aiLog`
3. คีย์ OpenRouter อยู่ใน `js/ai-config.js` (gitignore ไว้แล้ว ใช้ `js/ai-config.example.js` เป็นต้นแบบ) — **ห้าม hardcode คีย์ลงไฟล์ที่จะ push**
4. ทั้ง 2 จุดต้อง timeout ไม่เกิน 15 วินาทีแล้วแจ้งเตือน ไม่ทำหน้าจอค้าง (ดู `เรียกโมเดลAI()` ใน `js/ai.js`)

## 5. สิ่งที่ไม่ทำใน Module นี้ (out of scope)

- **Firestore Security Rules แยกตาม role เต็มรูปแบบ** — รอบนี้แก้ 2 จุดแล้ว: (1) เจ้าของข้อมูล `quizAttempts` อ่าน/สร้างได้เฉพาะ `studentId == request.auth.uid` หรือ teacher (2) เขียน `reviews` ได้เฉพาะ teacher — ที่ยังไม่ทำคือ rule จำกัด `students`/`quizSets` ให้เขียนได้เฉพาะ teacher (วันนี้นักเรียนที่ล็อกอินแล้วยังเขียนทับเอกสารพวกนี้ได้ผ่าน devtools แม้หน้าจอจะไม่มีปุ่มให้ทำ) — บันทึกไว้ใน BACKLOG.md
- **หน้าจอจัดการ `quizSets`** (แก้ไข/ลบชุดข้อสอบของครู) — มีแค่หน้าสร้างใหม่ (`quiz-set-new.html`), ยังไม่มีแก้/ลบ
- **ระบบล็อกอินแบบ "รหัสประจำตัว + PIN" (นักเรียน) / Google Login (ครู)** ตามที่ออกแบบไว้ใน `docs/03-testing/01-test-plan/test-cases/student-identity-and-roster.md` — การบ้านนี้ใช้ Firebase Auth อีเมล/รหัสผ่านแบบเดียวกับ LeaveEasy แทนเป็นตัวจำลอง
- **แดชบอร์ดสรุป, ระบบ pet/economy, weekly arena** และฟีเจอร์อื่นทั้งหมดใน `feature-list.md` ที่อยู่นอก FE-16/17/18/20/41 — ยกไป Module 3 (ดู [BACKLOG.md](BACKLOG.md) หลังสร้าง)
- **จำนวนรอบที่ทำซ้ำได้ต่อชุด (FE-18) และการยึดคะแนนรอบดีที่สุด (FE-41)** — ยังไม่มีในโค้ด แม้จะอยู่ในตาราง feature ก็ตาม ระบบวันนี้ทำได้รอบเดียวต่อชุด

## ผลข้างเคียงจากการแก้ Security Rule รอบนี้

- **`seed.html` ใส่ข้อมูลตัวอย่างของ `quizAttempts`/`reviews` ไม่ได้อีกต่อไป** — ข้อมูลตัวอย่างใน `js/data.js` ใช้ `studentId` ปลอม (เช่น `std001`) ที่ไม่ตรงกับ uid จริงของ Firebase Auth คนไหนเลย กฎใหม่ (ต้อง `studentId == request.auth.uid` ตอนสร้าง) จึงปฏิเสธการ seed ส่วนนี้ (ส่วน `students`/`quizSets` ยัง seed ได้ปกติ) — รอบนี้จะสร้างข้อมูลทดสอบผ่านการสมัคร+ส่งงานจริงในแอปแทน (ให้ Playwright ทำตอนเขียนเทสต์) ไม่แก้ `seed.js`
