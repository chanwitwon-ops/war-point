# API Spec — war-point

- **อัปเดตล่าสุด:** 2026-11-17 — ทัวนาเมนต์แพ้คัดออก + กติกาครูประกาศผลทีละรอบ (spec 08 ซ./ฌ., AC-FE-31-3~19, AC-FE-43-1~2): เพิ่ม API-64~71 (สร้าง, รายการ, อ่านผัง, ต่อสู้คู่, ครูชี้ขาดกรณีเสมอ, **ประกาศผลรอบ**, อ่านรีเพลย์, ลบ) + ข้อ 1.8 + Gap G-API-14~19 — ไม่แตะ API-01~63 (รวม API-43~53 การแข่งรายสัปดาห์) · ไม่มี endpoint ยกเลิกประกาศ (ผู้ใช้ตัดสิน: ประกาศแล้วยกเลิกไม่ได้)
- **อัปเดตก่อนหน้า (2):** 2026-11-11 — กฎ B5 (คะแนนทศนิยม 1 ตำแหน่ง / ยอดสะสมมีเศษ): แก้ API-28 (ตรวจทศนิยม/ตัวเลขล้วน), API-33 (เพิ่ม `pendingFraction`, ตัวอย่างมีเศษ), หมายเหตุที่ API-36 (เศษไม่นับ) และ API-38 (คืนส่วนจำนวนเต็ม), ตัวอย่าง API-31/32 — ไม่เพิ่ม/ลบ endpoint, ไม่เปลี่ยนเงื่อนไข `available_points` ของ endpoint ซื้อ/ปลดล็อก — ปิด Gap B5 ฝั่ง api-spec แล้ว (ดู G-API-13)
- **อัปเดตก่อนหน้า (3):** 2026-08-25 — เพิ่ม API-62/API-63 สำหรับ FE-82/FE-83 (CMP-21 Pet Care and Bonding Module, ผูก ENT-27) ไม่มี endpoint เดิมถูกแก้ไข
- **รูปแบบ:** REST over HTTP, ข้อมูล JSON, Authentication แบบ Session-based (stateful) ตามที่ล็อกไว้ใน [[architecture#7-authentication--authorization|architecture.md ข้อ 7]]
- **ระดับความละเอียด:** Conceptual + Contract-level (ระบุ HTTP method/path/JSON shape ตามที่ [[architecture#7-authentication--authorization|architecture.md ข้อ 7]] ตัดสินใจไปแล้ว ไม่ผูกกับ framework ที่ implement จริง)
- **Base path:** `/api/v1`
- **ที่มา:** [[architecture|architecture]], [[database-schema|database-schema]], [[../../03-testing/01-test-plan/acceptance-criteria|acceptance-criteria]]
- **ส่งต่อไป:** [[detailed-design|detailed-design]]

---

## 1. ข้อตกลงร่วม (Convention)

### 1.1 การตั้งชื่อ path
- ทุก path ขึ้นต้นด้วย `/api/v1`
- คำนามใช้พหูพจน์ (`/lessons`, `/quizzes`) ยกเว้น singleton ของผู้ใช้เอง (`/student/me`, `/teacher/me`)
- แยก namespace ตามบทบาทที่มีสิทธิ์เรียกเมื่อ endpoint นั้นมีแต่บทบาทเดียวเรียกได้ (`/teacher/...`, `/student/...`) ส่วน endpoint ที่ทั้งสองบทบาทเรียกได้ (เช่น login, logout) ไม่มี prefix บทบาท

### 1.2 การแบ่งหน้า (Pagination) และการเรียงลำดับ
- List endpoint ที่ข้อมูลอาจมีจำนวนมาก (เช่น `POINTS_LEDGER_ENTRY`, roster) รองรับ query param `page` (เริ่ม 1) และ `pageSize` (ค่าเริ่มต้น 30 — เท่ากับขนาดห้องเรียนโดยประมาณ)
- Response ที่แบ่งหน้าห่อด้วย `data` (array) + `meta: { page, pageSize, total }`
- การเรียงลำดับใช้ query param `sort=<field>:<asc|desc>` เช่น `sort=totalScore:desc`

### 1.3 รูปแบบวันที่
- ทุก field วันที่-เวลาใช้ ISO 8601 UTC เช่น `"2026-08-23T09:00:00Z"`

### 1.4 รูปแบบ Response สำเร็จ

```json
{
  "data": { "...": "..." },
  "meta": null
}
```

### 1.5 รูปแบบ Response ผิดพลาด (ใช้โครงเดียวกันทั้งระบบ)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "กรุณากรอกชื่อชุดแบบทดสอบ"
  }
}
```

`message` เป็นข้อความภาษาไทยที่เป็นกลาง พร้อมแสดงตรงกับผู้ใช้ได้ทันที (ตาม DESIGN.md ข้อ 4.1 — ห้ามใช้ถ้อยคำตำหนิ), `code` เป็นค่าคงที่ที่ client ใช้ตัดสินใจ logic (ไม่ใช่ข้อความ)

### 1.6 Header ที่ต้องส่งทุก request
- `Cookie: war_point_session=<token>` — ตั้งโดย endpoint login/callback (`HttpOnly`, `Secure`) ตาม session-based auth ที่ CMP-03 ออกให้ ไม่ใช้ `Authorization: Bearer`
- `X-CSRF-Token: <token>` — บังคับสำหรับทุก request ที่เป็น `POST`/`PUT`/`PATCH` (มาตรการมาตรฐานคู่กับ cookie-based session กันการโจมตี CSRF) ค่านี้ได้มาจาก response ของ endpoint login/callback
- `Content-Type: application/json` สำหรับ request ที่มี body ยกเว้น endpoint อัปโหลดไฟล์ที่ใช้ `multipart/form-data`

### 1.7 กฎการซ่อนข้อมูลตามบทบาท (สืบทอดจาก architecture.md ข้อ 7)
ทุก endpoint ใต้ prefix `/teacher/...` **ต้องไม่มี field ต่อไปนี้ปรากฏใน response เลยแม้แต่ field เดียว** ไม่ว่าจะใช้ค่าใดก็ตาม (ซ่อนที่ชั้น service/serializer ก่อนส่ง ไม่ใช่ตัดที่ client): แต้มสะสมรวม, แต้มที่ใช้ได้, ขั้นการเติบโตของสัตว์เลี้ยง, ค่าสเตตัส, ชนิด/สายพันธุ์สัตว์เลี้ยง, HP ในแมตช์, ไอเทมที่ใช้ในแมตช์, ชื่อ-นามสกุลจริงของนักเรียน (ไม่มีอยู่ใน DB อยู่แล้วตาม [[database-schema#5-การเก็บข้อมูลส่วนบุคคลและการลบ|database-schema ข้อ 5]]) แต่ละ endpoint ที่เกี่ยวข้องจะระบุการซ่อนนี้ซ้ำไว้ในหัวข้อ "กฎทางธุรกิจ" เพื่อความชัดเจน

ข้อมูลของ CMP-21 (ความหิว, โควตาหาแต้มต่อวัน, ยอดสะสมรวมของค่าความผูกพัน) — ปัจจุบันไม่มี endpoint ฝั่งครูเข้าถึงข้อมูลนี้เลย (ไม่มี GET /teacher/... ที่แตะ ENT-27) แต่ถ้าเปิด endpoint ฝั่งครูในอนาคตต้องเพิ่มเข้ารายการห้ามส่งนี้ทันที

### 1.8 ข้อตกลงของ endpoint ทัวนาเมนต์ (API-64~71, เพิ่ม 2026-11-17)
- **สถานะของสัญญานี้:** ระบบจริงของทัวนาเมนต์ตอนนี้เป็น client เขียน/อ่าน Firestore ตรง ไม่มี REST server (ดู [[database-schema#3.1 การเก็บจริงบน Firestore (ทัวนาเมนต์) — เพิ่ม 2026-11-17|database-schema หัวข้อ 3.1]]) — path/status code ในหัวข้อนี้เป็น **สัญญาเชิงตรรกะ** ว่าแต่ละ operation ต้องรับอะไร คืนอะไร และปฏิเสธเมื่อไหร่ ตรง 1:1 กับ operation ที่โค้ดฝั่งครูต้องทำ (และ rules ที่ปิดการอ่านของนักเรียน) · ถ้าอนาคตมี server จริงให้ใช้สัญญานี้ได้เลย
- **เลขรอบและรหัสคู่:** `{round}` เป็นจำนวนเต็ม 1…`roundCount`; `{matchKey}` รูปแบบ `r{รอบ}m{ลำดับ}` (เช่น `r1m2`); `matchId` = `{tournamentId}-{matchKey}`
- **"ซ่อน ไม่ใช่ส่งมาแล้วให้ client ปิด":** ผู้ชนะของคู่ปกติในรอบที่ยังไม่ประกาศ (คู่บายไม่นับ — ตั้งตอนสร้าง) **ไม่ปรากฏใน response ของ endpoint ใดที่ส่งให้นักเรียน และไม่ปรากฏในผังที่ส่งให้ครูด้วย** (ครูเห็นได้เฉพาะจากการเปิดรีเพลย์ — API-70) · บังคับที่ข้อมูล: ฟิลด์เหล่านั้นไม่ได้ถูกเขียนลงเอกสารสาธารณะจนกว่าจะประกาศ ไม่ใช่แค่ตัดตอนสร้าง response
- **ทัวนาเมนต์เก่า (ไม่มี `announcedRound`):** ทุก endpoint อ่านปฏิบัติต่อเสมือน `announcedRound = roundCount` (ประกาศครบแล้ว) และตอบ `announcedRound` เป็น `roundCount` พร้อม `legacy: true`
- **หน้าต่างยืนยันก่อนประกาศ/ก่อนลบ เป็นหน้าที่ฝั่ง client** — API-69 และ API-71 ไม่รับ field "ยืนยันแล้ว" และไม่มีขั้น 2-step ฝั่ง server (ประกาศแล้วยกเลิกไม่ได้ จึงต้องถามก่อนกด)
- **ข้อความ `message` ของ 409 ด้านล่างเป็นข้อความเสนอ** — ข้อความสถานะ "รอครูประกาศผล" และชื่อปุ่มจริงยังไม่ล็อก (G-18 ของ acceptance-criteria)

---

## 2. ตารางสรุป Endpoint

| ID | Method | Path | ทำอะไร | บทบาทที่เรียกได้ | Feature |
|---|---|---|---|---|---|
| API-01 | POST | /api/v1/auth/student/login | นักเรียนล็อกอินด้วยรหัสประจำตัว+PIN | ทุกคน | FE-01 |
| API-02 | POST | /api/v1/auth/student/change-pin | นักเรียนตั้ง PIN ใหม่ (บังคับครั้งแรก) | นักเรียน | FE-47 |
| API-03 | POST | /api/v1/auth/teacher/google/callback | แลก authorization code ของ Google เป็น session ครู | ทุกคน | FE-03, FE-49 |
| API-04 | POST | /api/v1/auth/logout | ออกจากระบบ (revoke session) | นักเรียน, ครู | FE-01, FE-03 |
| API-05 | POST | /api/v1/teacher/students/{studentId}/reset-pin | ครูรีเซ็ต PIN ให้นักเรียน | ครู | FE-02 |
| API-06 | POST | /api/v1/teacher/students/{studentId}/unlock | ครูปลดล็อกบัญชีที่ถูกล็อคชั่วคราว | ครู | FE-48 |
| API-07 | POST | /api/v1/teacher/roster/import-file | นำเข้ารายชื่อจากไฟล์ | ครู | FE-04, FE-06, FE-07, FE-51 |
| API-08 | POST | /api/v1/teacher/roster/import-google-sheet | นำเข้ารายชื่อจากลิงก์ Google Sheets | ครู | FE-50, FE-06, FE-07, FE-51 |
| API-09 | POST | /api/v1/teacher/roster/students | เพิ่มนักเรียนทีละคน | ครู | FE-05, FE-06 |
| API-10 | GET | /api/v1/teacher/roster/students | รายชื่อนักเรียนสำหรับจัดการ | ครู | FE-52, FE-56 |
| API-11 | PATCH | /api/v1/teacher/roster/students/{studentId}/status | เปิด/ปิดการใช้งานนักเรียน | ครู | FE-56 |
| API-12 | PATCH | /api/v1/teacher/roster/students/{studentId}/nickname | ครูล้างชื่อเล่นของนักเรียน | ครู | FE-55 |
| API-13 | PUT | /api/v1/student/me/nickname | นักเรียนตั้งชื่อเล่นเอง | นักเรียน | FE-53, FE-54 |
| API-14 | GET | /api/v1/student/me | โปรไฟล์ของนักเรียนที่ล็อกอินอยู่ | นักเรียน | FE-47, FE-52 |
| API-15 | POST | /api/v1/teacher/lessons/link | เพิ่มบทเรียนจากลิงก์ | ครู | FE-08 |
| API-16 | POST | /api/v1/teacher/lessons/file | เพิ่มบทเรียนจากไฟล์ | ครู | FE-09, FE-40 |
| API-17 | POST | /api/v1/teacher/lessons/text | เพิ่มบทเรียนแบบพิมพ์ตรง | ครู | FE-37 |
| API-18 | GET | /api/v1/teacher/lessons | รายการบทเรียนทั้งหมด (รวมรอครูอนุมัติ) | ครู | FE-39 |
| API-19 | POST | /api/v1/teacher/lessons/ai-search | ให้ AI ค้นคลิปตามหัวข้อ | ครู | FE-11 |
| API-20 | POST | /api/v1/teacher/lessons/{lessonId}/approve | อนุมัติคลิปที่ AI เสนอ | ครู | FE-39 |
| API-21 | POST | /api/v1/teacher/lessons/{lessonId}/reject | ไม่อนุมัติคลิปที่ AI เสนอ | ครู | FE-39 |
| API-22 | GET | /api/v1/student/lessons | บทเรียนที่เผยแพร่แล้ว | นักเรียน | FE-08, FE-09, FE-10 |
| API-23 | POST | /api/v1/student/lessons/{lessonId}/tts | ขอให้ AI อ่านออกเสียงบทเรียน | นักเรียน | FE-10 |
| API-24 | POST | /api/v1/teacher/quizzes | สร้างแบบทดสอบ/ใบงาน/งานแนบไฟล์ | ครู | FE-12, FE-13, FE-14, FE-18, FE-19, FE-21, FE-38 |
| API-25 | POST | /api/v1/teacher/quizzes/ai-generate | ให้ AI ช่วยออกข้อสอบปรนัย | ครู | FE-15 |
| API-26 | GET | /api/v1/teacher/quizzes | รายการชุดแบบทดสอบทั้งหมด | ครู | FE-12–FE-19 |
| API-27 | GET | /api/v1/teacher/quizzes/{quizId}/submissions | รายการงานที่รอครูตรวจ | ครู | FE-17 |
| API-28 | POST | /api/v1/teacher/quizzes/{quizId}/submissions/{attemptId}/grade | บันทึกคะแนนที่ครูตรวจเอง | ครู | FE-17 |
| API-29 | GET | /api/v1/student/quizzes | รายการแบบทดสอบที่ทำได้ | นักเรียน | FE-20 |
| API-30 | GET | /api/v1/student/quizzes/{quizId} | รายละเอียดชุดแบบทดสอบเพื่อทำ | นักเรียน | FE-20 |
| API-31 | POST | /api/v1/student/quizzes/{quizId}/attempts | ส่งคำตอบ/ส่งงาน 1 รอบ | นักเรียน | FE-16, FE-20, FE-41 |
| API-32 | GET | /api/v1/student/quizzes/{quizId}/result | ดูคะแนนล่าสุด/รอบที่ดีที่สุด | นักเรียน | FE-16, FE-41 |
| API-33 | GET | /api/v1/student/me/points | ยอดแต้มสะสมรวม/ใช้ได้ | นักเรียน | FE-22, FE-23 |
| API-34 | GET | /api/v1/student/me/pet | สัตว์เลี้ยงที่ใช้งานอยู่ | นักเรียน | FE-76, FE-77 |
| API-35 | GET | /api/v1/species | รายชื่อสายพันธุ์ที่เลือกได้ (รวมพลังพิเศษประจำสาย) | นักเรียน | FE-44, FE-45 |
| API-36 | POST | /api/v1/student/me/pet/egg | ซื้อไข่และเลือกสายพันธุ์ | นักเรียน | FE-44, FE-75, FE-76 |
| API-37 | POST | /api/v1/student/me/pet/unlock-next-stage | ปลดล็อกขั้นเติบโตถัดไป | นักเรียน | FE-24, FE-77 |
| API-38 | POST | /api/v1/student/me/pet/reset | เปลี่ยนสายพันธุ์/รีเซ็ตตัวละคร | นักเรียน | FE-26 |
| API-39 | GET | /api/v1/student/me/pet/growth-path | อัลบั้มบันทึกเส้นทางการเติบโต | นักเรียน | FE-72, FE-73, FE-74 |
| API-40 | GET | /api/v1/shop/items | รายการไอเทมช่วยในร้าน | นักเรียน | FE-78 |
| API-41 | POST | /api/v1/student/me/items/purchase | ซื้อไอเทมช่วย | นักเรียน | FE-78 |
| API-42 | GET | /api/v1/student/me/items | ไอเทมที่ถือครองอยู่ | นักเรียน | FE-78 |
| API-43 | GET | /api/v1/student/arena/current | สถานะอารีน่าสัปดาห์นี้ + รายชื่อคู่แข่งที่เลือกได้ | นักเรียน | FE-27, FE-42, FE-76 |
| API-44 | POST | /api/v1/student/arena/current/opponent | เลือกคู่แข่งของตนเอง | นักเรียน | FE-42 |
| API-45 | POST | /api/v1/student/arena/matches/{matchId}/use-item | ใช้ไอเทมช่วยในแมตช์ | นักเรียน | FE-80, FE-81 |
| API-46 | GET | /api/v1/student/arena/matches/{matchId}/result | ดูผลแมตช์ของตนเอง | นักเรียน | FE-27, FE-32, FE-45, FE-79 |
| API-47 | GET | /api/v1/teacher/arena/current | ภาพรวมอารีน่าสัปดาห์นี้ (ไม่มีค่าสเตตัส) | ครู | FE-27 |
| API-48 | POST | /api/v1/teacher/arena/current/pair/random | สุ่มจับคู่แข่ง | ครู | FE-28 |
| API-49 | POST | /api/v1/teacher/arena/current/pair/manual | เลือกคู่แข่งเอง | ครู | FE-29 |
| API-50 | PUT | /api/v1/teacher/arena/settings/auto-pairing | เปิด/ปิดระบบจับคู่อัตโนมัติรายสัปดาห์ | ครู | FE-30 |
| API-51 | POST | /api/v1/teacher/arena/current/announce | ประกาศผลการแข่งขัน | ครู | FE-31 |
| API-52 | PUT | /api/v1/teacher/arena/current/broadcast-mode | เปิด/ปิดโหมดฉายผลในห้อง | ครู | FE-43 |
| API-53 | GET | /api/v1/teacher/arena/winner-stats | สถิติผู้ชนะสะสมของทั้งห้อง | ครู | FE-46 |
| API-54 | GET | /api/v1/student/me/badges | ดาว/สัญลักษณ์ของตนเอง | นักเรียน | FE-32 |
| API-55 | GET | /api/v1/teacher/overview | ตารางภาพรวมชั้นเรียน (เรียง/กรองได้) | ครู | FE-57, FE-58, FE-59, FE-60, FE-61, FE-62 |
| API-56 | POST | /api/v1/teacher/score-export/jobs | เริ่มงานส่งออก + เลือกข้อมูล | ครู | FE-34, FE-63, FE-64, FE-65 |
| API-57 | PUT | /api/v1/teacher/score-export/jobs/{jobId}/channel | เลือกช่องทางส่งออก | ครู | FE-66, FE-67 |
| API-58 | PUT | /api/v1/teacher/score-export/jobs/{jobId}/columns | เลือกคอลัมน์ปลายทาง | ครู | FE-68 |
| API-59 | POST | /api/v1/teacher/score-export/jobs/{jobId}/validate | ตรวจสอบข้อมูลก่อนส่ง | ครู | FE-69, FE-70 |
| API-60 | POST | /api/v1/teacher/score-export/jobs/{jobId}/confirm | ยืนยันส่งคะแนนจริง | ครู | FE-66, FE-71 |
| API-61 | GET | /api/v1/teacher/score-export/jobs/{jobId}/download | ดาวน์โหลดไฟล์คะแนน | ครู | FE-67 |
| API-62 | GET | /api/v1/student/me/pet/care-status | ดูสถานะการดูแลสัตว์เลี้ยงวันนี้ (โควตาหาแต้ม/ยอดสะสมรวม) | นักเรียน | FE-82, FE-83 |
| API-63 | POST | /api/v1/student/me/pet/care-actions | ทำ action ดูแลสัตว์เลี้ยง (ให้อาหาร/อาบน้ำ/ลูบหัว/เล่น-ออกกำลังกาย) | นักเรียน | FE-82, FE-83 |
| API-64 | POST | /api/v1/teacher/tournaments | สร้างทัวนาเมนต์ (เลือกนักเรียน ≥ 2 คน ระบบสุ่มจับคู่/บาย) | ครู | FE-31 (spec 08 ซ.) |
| API-65 | GET | /api/v1/tournaments | รายการทัวนาเมนต์ (แชมป์แสดงหลังประกาศรอบชิงเท่านั้น) | นักเรียน, ครู | FE-31 |
| API-66 | GET | /api/v1/tournaments/{tournamentId} | อ่านผังทัวนาเมนต์ (ตอบตามบทบาท) | นักเรียน, ครู | FE-31, FE-43 |
| API-67 | POST | /api/v1/teacher/tournaments/{tournamentId}/matches/{matchKey}/fight | ต่อสู้คู่ (คำนวณ + เก็บผลลับ ไม่เปิดเผยผู้ชนะ) | ครู | FE-31 |
| API-68 | POST | /api/v1/teacher/tournaments/{tournamentId}/matches/{matchKey}/decide-winner | ครูเลือกผู้ชนะกรณีเสมอจริง | ครู | FE-31 |
| API-69 | POST | /api/v1/teacher/tournaments/{tournamentId}/rounds/{round}/announce | **ประกาศผลรอบ** (เปิดเผยผู้ชนะ + เลื่อนเข้ารอบถัดไป) | ครู | FE-31 |
| API-70 | GET | /api/v1/tournaments/{tournamentId}/matches/{matchKey}/replay | อ่านรีเพลย์ (battle log) ของคู่ | นักเรียน (เมื่อรอบประกาศแล้ว), ครู (เสมอ) | FE-31, FE-43 |
| API-71 | DELETE | /api/v1/teacher/tournaments/{tournamentId} | ลบทัวนาเมนต์ถาวร | ครู | FE-31 (spec 08 ซ.) |

**สรุปจำนวนแยกตาม Method:** GET 26, POST 37, PUT 5, PATCH 2, DELETE 1 (รวม 71 endpoint) — ก่อนเพิ่ม 2026-11-17: GET 23, POST 33, PUT 5, PATCH 2 (รวม 63)

---

## 3. รายละเอียดแต่ละ Endpoint

### API-01 — นักเรียนล็อกอินด้วยรหัสประจำตัว + PIN
- **Method / Path:** `POST /api/v1/auth/student/login`
- **หน้าที่:** ตรวจรหัสประจำตัว+PIN แล้วออก session cookie
- **Feature ต้นทาง:** FE-01 | **Journey:** UJ-01 node A
- **สิทธิ์ที่ต้องมี:** ไม่ต้องล็อกอินมาก่อน (public)

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | studentCode | ข้อความสั้น | ใช่ | ต้องมีอยู่ในระบบและ `is_active = true` |
| body | pin | ข้อความสั้น | ใช่ | ตัวเลขล้วน (จำนวนหลักยังไม่ล็อก — ดู Gap) |

```json
{ "studentCode": "3001", "pin": "1234" }
```

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "studentId": "s-3001", "nickname": "น้องมิว", "mustChangePin": false } }
```

Response ตั้ง `Set-Cookie: war_point_session=...; HttpOnly; Secure` และคืน `X-CSRF-Token` มาด้วย

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่ส่ง studentCode หรือ pin | VALIDATION_ERROR | "กรุณากรอกรหัสประจำตัวและ PIN" |
| 401 | รหัสประจำตัวหรือ PIN ไม่ตรง | INVALID_CREDENTIALS | "รหัสประจำตัวหรือ PIN ยังไม่ตรงกับข้อมูลตัวอย่าง ลองใหม่อีกครั้ง" |
| 403 | บัญชีถูกปิดใช้งาน (ย้ายออก) | ACCOUNT_DISABLED | "บัญชีนี้ไม่สามารถใช้งานได้ กรุณาติดต่อครู" |
| 423 | บัญชีถูกล็อคชั่วคราวจากการกรอกผิดหลายครั้ง | ACCOUNT_LOCKED | "บัญชีถูกล็อคชั่วคราว กรุณาติดต่อครูเพื่อปลดล็อก" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ล็อกอินผิดเพิ่ม `STUDENT.failed_pin_attempts` ทีละ 1 ครั้งจนครบเกณฑ์ (ยังไม่ล็อกจำนวน) แล้วตั้ง `locked_until` ตาม AC-FE-48-1; สำเร็จแล้วรีเซ็ต `failed_pin_attempts=0` และอัปเดต `last_active_at` (AC-FE-52-1); ถ้า `must_change_pin=true` client ต้องพาไปหน้าเปลี่ยน PIN ก่อนใช้ endpoint อื่นตาม AC-FE-47-1 (บังคับที่ session flag ฝั่ง server ด้วย ไม่ใช่แค่ UI)

---

### API-02 — นักเรียนตั้ง PIN ใหม่ (บังคับครั้งแรก)
- **Method / Path:** `POST /api/v1/auth/student/change-pin`
- **หน้าที่:** เปลี่ยน PIN และปลด flag `must_change_pin`
- **Feature ต้นทาง:** FE-47 | **Journey:** UJ-01 node A (ต่อจาก login ครั้งแรก)
- **สิทธิ์ที่ต้องมี:** session นักเรียน (แม้ `must_change_pin=true` ก็เรียก endpoint นี้ได้ — เป็น endpoint เดียวที่อนุญาตก่อนปลด flag)

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | newPin | ข้อความสั้น | ใช่ | ตัวเลขล้วน ความยาวตามที่ระบบกำหนด (ยังไม่ล็อก) |

```json
{ "newPin": "5821" }
```

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "mustChangePin": false } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | PIN ใหม่ไม่ใช่ตัวเลขหรือความยาวไม่ตรงเกณฑ์ | VALIDATION_ERROR | "กรุณากรอก PIN ใหม่เป็นตัวเลขตามจำนวนหลักที่กำหนด" |
| 401 | ไม่มี session ที่ valid | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ไม่มีทาง "ข้าม"/"ทีหลัง" ได้ (AC-FE-47-2) — endpoint อื่นทั้งหมดของนักเรียนต้องตรวจ `must_change_pin` จาก session แล้วปฏิเสธด้วย 403 ถ้ายังไม่เปลี่ยน (ยกเว้น API-04 logout)

---

### API-03 — แลก authorization code ของ Google เป็น session ครู
- **Method / Path:** `POST /api/v1/auth/teacher/google/callback`
- **หน้าที่:** รับ authorization code จากหน้า redirect ของ Google OAuth แล้วให้ CMP-14 แลก token กับ Google (CMP-18) จากนั้นออก session ครู — การสร้างลิงก์ redirect ไป Google เองเป็นหน้าที่ของ client ตรงไปยัง Google โดยตรง ไม่ใช่ endpoint ของระบบนี้
- **Feature ต้นทาง:** FE-03, FE-49 | **Journey:** UJ-02 node A
- **สิทธิ์ที่ต้องมี:** ไม่ต้องล็อกอินมาก่อน (public)

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | authorizationCode | ข้อความสั้น | ใช่ | code ที่ Google ส่งกลับมาที่ redirect URI |

```json
{ "authorizationCode": "4/0Ab...xyz" }
```

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "teacherId": "t-01", "email": "kru-orn@example.com" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่ส่ง authorizationCode | VALIDATION_ERROR | "ไม่พบข้อมูลยืนยันตัวตนจาก Google กรุณาลองใหม่" |
| 502 | Google OAuth (CMP-18) ล่มหรือปฏิเสธ code | UPSTREAM_AUTH_FAILED | "ระบบยืนยันตัวตนขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ไม่ตรวจโดเมนอีเมล (AC-FE-49-2) — บัญชี Google ใดก็ล็อกอินได้ทั้งของโรงเรียนและส่วนตัว; ถ้าเป็น `google_subject_id` ใหม่ ให้สร้าง `TEACHER` แถวใหม่อัตโนมัติ

---

### API-04 — ออกจากระบบ
- **Method / Path:** `POST /api/v1/auth/logout`
- **หน้าที่:** revoke session ปัจจุบัน (`SESSION.is_active=false`)
- **Feature ต้นทาง:** FE-01, FE-03 (cross-cutting) | **Journey:** UJ-01/UJ-02/UJ-03/UJ-04
- **สิทธิ์ที่ต้องมี:** session ใดก็ได้ (นักเรียนหรือครู)

**Request:** ไม่มี body

**Response สำเร็จ** — `204 No Content`

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session ที่ valid อยู่แล้ว | UNAUTHENTICATED | "เซสชันหมดอายุแล้ว" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ลบ cookie ฝั่ง client ด้วย `Set-Cookie` ที่หมดอายุทันที

---

### API-05 — ครูรีเซ็ต PIN ให้นักเรียน
- **Method / Path:** `POST /api/v1/teacher/students/{studentId}/reset-pin`
- **หน้าที่:** สร้าง PIN ใหม่ให้นักเรียนคนนั้น
- **Feature ต้นทาง:** FE-02 | **Journey:** UJ-02 node F/G
- **สิทธิ์ที่ต้องมี:** session ครู

**Request:** ไม่มี body, path param `studentId`

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "studentCode": "3001", "newPin": "7742", "mustChangePin": true } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |
| 404 | ไม่พบ studentId | NOT_FOUND | "ไม่พบนักเรียนคนนี้ในระบบ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ตั้ง `must_change_pin=true` เสมอหลังรีเซ็ต (บังคับเปลี่ยน PIN รอบถัดไปเหมือน PIN เริ่มต้น); revoke session เดิมของนักเรียนคนนั้นทั้งหมด (AC-FE-02-1)

---

### API-06 — ครูปลดล็อกบัญชีที่ถูกล็อคชั่วคราว
- **Method / Path:** `POST /api/v1/teacher/students/{studentId}/unlock`
- **หน้าที่:** ล้าง `locked_until` และ `failed_pin_attempts`
- **Feature ต้นทาง:** FE-48 | **Journey:** UJ-02 (คู่กับ node F/G)
- **สิทธิ์ที่ต้องมี:** session ครู

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "studentId": "s-3001", "locked": false } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |
| 404 | ไม่พบ studentId | NOT_FOUND | "ไม่พบนักเรียนคนนี้ในระบบ" |
| 409 | บัญชีไม่ได้อยู่ในสถานะถูกล็อค | NOT_LOCKED | "บัญชีนี้ไม่ได้ถูกล็อคอยู่" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ตาม AC-FE-48-3 — หลังปลดล็อก นักเรียนล็อกอินได้ทันทีด้วย PIN เดิม (ไม่ต้องรีเซ็ต PIN)

---

### API-07 — นำเข้ารายชื่อจากไฟล์
- **Method / Path:** `POST /api/v1/teacher/roster/import-file`
- **หน้าที่:** อ่านไฟล์ (Excel/CSV) แล้วสร้าง `STUDENT` ใหม่จากคอลัมน์ที่ครูเลือกเป็นรหัสประจำตัวเท่านั้น
- **Feature ต้นทาง:** FE-04, FE-06, FE-07, FE-51 | **Journey:** UJ-02 node B/C/E
- **สิทธิ์ที่ต้องมี:** session ครู

**Request** (`multipart/form-data`)

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| form | file | ไฟล์ | ใช่ | Excel หรือ CSV |
| form | studentCodeColumn | ข้อความสั้น | ใช่ | ชื่อ/ตำแหน่งคอลัมน์ที่เป็นรหัสประจำตัว (AC-FE-04-2) |

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "importedCount": 28, "skippedDuplicateCodes": ["3001"] } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่ส่งไฟล์หรือไม่เลือก studentCodeColumn | VALIDATION_ERROR | "กรุณาเลือกคอลัมน์ที่เป็นรหัสประจำตัวก่อน" |
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |
| 422 | ไฟล์อ่านไม่ได้/รูปแบบผิด | UNREADABLE_FILE | "ไม่สามารถอ่านไฟล์นี้ได้ กรุณาตรวจสอบรูปแบบไฟล์" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** เก็บเฉพาะคอลัมน์ที่เลือกเป็นรหัสประจำตัว **ไม่บันทึกคอลัมน์อื่นเข้าระบบเลยแม้จะมีชื่อจริงอยู่ในไฟล์** (AC-FE-07-1, AC-FE-51-2); รหัสที่ซ้ำกับที่มีอยู่แล้วถูกข้าม ไม่สร้างซ้ำ (สอดคล้อง AC-FE-05-3); ทุกรายการที่สร้างสำเร็จได้ PIN เริ่มต้นจากระบบอัตโนมัติ (FE-06) และ `must_change_pin=true`

---

### API-08 — นำเข้ารายชื่อจากลิงก์ Google Sheets
- **Method / Path:** `POST /api/v1/teacher/roster/import-google-sheet`
- **หน้าที่:** เหมือน API-07 แต่ดึงข้อมูลผ่าน CMP-14 → Google Sheets (CMP-19) แทนไฟล์อัปโหลด
- **Feature ต้นทาง:** FE-50, FE-06, FE-07, FE-51 | **Journey:** UJ-02 node B/C/E

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | sheetLink | ข้อความยาว | ใช่ | ต้องเป็นลิงก์ Google Sheets ที่ครูมีสิทธิ์อ่าน (AC-FE-50-2) |
| body | studentCodeColumn | ข้อความสั้น | ใช่ | เหมือน API-07 |

```json
{ "sheetLink": "https://docs.google.com/spreadsheets/d/xxx", "studentCodeColumn": "C" }
```

**Response สำเร็จ** — `201 Created` (โครงเหมือน API-07)

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่ส่ง sheetLink หรือ studentCodeColumn | VALIDATION_ERROR | "กรุณาวางลิงก์ Google Sheets ก่อน" |
| 403 | ครูไม่มีสิทธิ์อ่านชีทนี้ | SHEET_ACCESS_DENIED | "ไม่สามารถเข้าถึงชีทนี้ได้ กรุณาตรวจสอบสิทธิ์การแชร์" |
| 502 | Google Sheets (CMP-19) ล่ม/ตอบช้าเกินกำหนด | UPSTREAM_UNAVAILABLE | "เชื่อมต่อ Google Sheets ไม่สำเร็จ กรุณาใช้การอัปโหลดไฟล์แทน" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** เหมือน API-07; ตาม DF-02 ของ architecture.md ถ้าดึงไม่สำเร็จต้อง**ไม่บันทึกข้อมูลค้างครึ่งเดียว** (all-or-nothing ต่อการนำเข้าหนึ่งครั้ง)

---

### API-09 — เพิ่มนักเรียนทีละคน
- **Method / Path:** `POST /api/v1/teacher/roster/students`
- **หน้าที่:** สร้าง `STUDENT` 1 คน
- **Feature ต้นทาง:** FE-05, FE-06 | **Journey:** UJ-02 node B/D

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | studentCode | ข้อความสั้น | ใช่ | ไม่ซ้ำกับที่มีอยู่แล้ว (AC-FE-05-3) |

```json
{ "studentCode": "4103" }
```

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "studentId": "s-4103", "studentCode": "4103", "initialPin": "2098" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่กรอก studentCode | VALIDATION_ERROR | "กรุณากรอกรหัสประจำตัว" |
| 409 | studentCode ซ้ำกับที่มีอยู่แล้ว | DUPLICATE_STUDENT_CODE | "รหัสประจำตัวนี้มีอยู่ในระบบแล้ว" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ไม่มี field ให้ครูกรอก PIN เอง (AC-FE-06-2) — ระบบสร้างให้เสมอ

---

### API-10 — รายชื่อนักเรียนสำหรับจัดการ
- **Method / Path:** `GET /api/v1/teacher/roster/students`
- **หน้าที่:** ดึงรายชื่อทั้งหมดพร้อมสถานะใช้งาน/ล็อค/เวลาเข้าใช้งานล่าสุด
- **Feature ต้นทาง:** FE-52, FE-56 | **Journey:** UJ-02

**Request** (query) — `status`: `active` (ค่าเริ่มต้น) / `inactive` / `all`

**Response สำเร็จ** — `200 OK`

```json
{
  "data": [
    { "studentId": "s-3001", "studentCode": "3001", "nickname": "น้องมิว", "isActive": true, "isLocked": false, "lastActiveAt": "2026-08-22T08:00:00Z" }
  ],
  "meta": { "page": 1, "pageSize": 30, "total": 28 }
}
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ไม่มี field แต้ม/ขั้นการเติบโตปนมาแม้ endpoint นี้เป็นของครู (ตามข้อ 1.7); ค่าเริ่มต้น `status=active` ทำให้นักเรียนที่ปิดใช้งานแล้วไม่ปรากฏในรายการที่ครูใช้ประจำวัน (AC-FE-56-2)

---

### API-11 — เปิด/ปิดการใช้งานนักเรียน
- **Method / Path:** `PATCH /api/v1/teacher/roster/students/{studentId}/status`
- **หน้าที่:** สลับ `is_active` ของ `STUDENT`
- **Feature ต้นทาง:** FE-56 | **Journey:** UJ-02

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | isActive | บูลีน | ใช่ | - |

```json
{ "isActive": false }
```

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "studentId": "s-3001", "isActive": false } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 404 | ไม่พบ studentId | NOT_FOUND | "ไม่พบนักเรียนคนนี้ในระบบ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ปิดใช้งาน**ไม่ลบข้อมูลใดๆ** (ตาม soft-delete policy ของ [[database-schema#0-หลักการออกแบบที่ยึดตลอดเอกสาร|database-schema ข้อ 0]]) — ข้อมูลแต้ม/สัตว์เลี้ยง/คะแนนเดิมยังอยู่ครบ

---

### API-12 — ครูล้างชื่อเล่นของนักเรียน
- **Method / Path:** `PATCH /api/v1/teacher/roster/students/{studentId}/nickname`
- **หน้าที่:** เคลียร์ `nickname` กลับเป็น null
- **Feature ต้นทาง:** FE-55 | **Journey:** UJ-02

**Request:** ไม่มี body (การ "ล้าง" ไม่ต้องส่งค่าใหม่)

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "studentId": "s-3001", "nickname": null } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 404 | ไม่พบ studentId | NOT_FOUND | "ไม่พบนักเรียนคนนี้ในระบบ" |
| 409 | นักเรียนยังไม่มีชื่อเล่นอยู่แล้ว | NICKNAME_ALREADY_EMPTY | "นักเรียนคนนี้ยังไม่ได้ตั้งชื่อเล่น" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** สอดคล้อง AC-FE-55-2 ที่ client ควร disable ปุ่มเมื่อไม่มีชื่อเล่น — server ยังต้องตรวจซ้ำและตอบ 409 กันกรณี client ไม่ sync ทัน

---

### API-13 — นักเรียนตั้งชื่อเล่นเอง
- **Method / Path:** `PUT /api/v1/student/me/nickname`
- **หน้าที่:** ตั้ง/แก้ไข `nickname` ของตนเอง ผ่านการกรองคำหยาบ
- **Feature ต้นทาง:** FE-53, FE-54 | **Journey:** UJ-01 (ก่อนหรือระหว่าง node A)
- **สิทธิ์ที่ต้องมี:** session นักเรียน (ตนเองเท่านั้น)

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | nickname | ข้อความสั้น | ใช่ | ไม่ว่าง (AC-FE-53-2), ไม่อยู่ในรายการคำไม่เหมาะสม (AC-FE-54-1) |

```json
{ "nickname": "น้องฟ้า" }
```

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "nickname": "น้องฟ้า" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ส่งค่าว่าง | VALIDATION_ERROR | "กรุณากรอกชื่อเล่นก่อน" |
| 422 | ชื่อเล่นอยู่ในรายการคำไม่เหมาะสม | INAPPROPRIATE_NICKNAME | "ชื่อนี้ใช้ไม่ได้ ลองตั้งชื่ออื่นดูนะ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ข้อความปฏิเสธเป็นกลาง ไม่ตำหนิ (ตาม DESIGN.md ข้อ 4.1, AC-FE-54-1)

---

### API-14 — โปรไฟล์ของนักเรียนที่ล็อกอินอยู่
- **Method / Path:** `GET /api/v1/student/me`
- **หน้าที่:** ข้อมูลพื้นฐานของนักเรียนเจ้าของ session
- **Feature ต้นทาง:** FE-47, FE-52 | **Journey:** cross-cutting UJ-01
- **สิทธิ์ที่ต้องมี:** session นักเรียน (ตนเองเท่านั้น)

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "studentId": "s-3001", "studentCode": "3001", "nickname": "น้องมิว", "mustChangePin": false } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ไม่มี field ชื่อจริงเพราะไม่มีเก็บอยู่ในระบบเลย (FE-07)

---

### API-15 — เพิ่มบทเรียนจากลิงก์
- **Method / Path:** `POST /api/v1/teacher/lessons/link`
- **หน้าที่:** สร้าง `LESSON(source_type='link', approval_status='published')`
- **Feature ต้นทาง:** FE-08 | **Journey:** UJ-02 node H/I

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | title | ข้อความสั้น | ใช่ | - |
| body | url | ข้อความยาว | ใช่ | - |

```json
{ "title": "คลิปเรื่องเศษส่วน", "url": "https://youtube.com/watch?v=xxx" }
```

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "lessonId": "l-01", "approvalStatus": "published" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่กรอก title หรือ url | VALIDATION_ERROR | "กรุณากรอกชื่อบทเรียนและลิงก์ให้ครบ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** เผยแพร่ทันที ไม่ต้องรออนุมัติ (ต่างจาก AI clip)

---

### API-16 — เพิ่มบทเรียนจากไฟล์
- **Method / Path:** `POST /api/v1/teacher/lessons/file`
- **หน้าที่:** อัปโหลดไฟล์ผ่าน CMP-15 ไปยัง Object Storage แล้วสร้าง `LESSON(source_type='file')` พร้อมตรวจว่าอ่านออกเสียงได้หรือไม่
- **Feature ต้นทาง:** FE-09, FE-40 | **Journey:** UJ-02 node H/J

**Request** (`multipart/form-data`)

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| form | title | ข้อความสั้น | ใช่ | - |
| form | file | ไฟล์ | ใช่ | - |

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "lessonId": "l-02", "approvalStatus": "published", "ttsSupported": false } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่กรอก title | VALIDATION_ERROR | "กรุณากรอกชื่อบทเรียน" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** `ttsSupported=false` เมื่อดึงข้อความจากไฟล์ไม่ได้ (เช่น ภาพสแกน) — ต้องแจ้งครูให้ชัดเจนตาม FE-40 ไม่ใช่ปล่อยให้เดา

---

### API-17 — เพิ่มบทเรียนแบบพิมพ์ตรง
- **Method / Path:** `POST /api/v1/teacher/lessons/text`
- **หน้าที่:** สร้าง `LESSON(source_type='text')`
- **Feature ต้นทาง:** FE-37 | **Journey:** UJ-01/UJ-02

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | title | ข้อความสั้น | ใช่ | - |
| body | textContent | ข้อความยาว | ใช่ | - |

**Response สำเร็จ** — `201 Created` — โครงเดียวกับ API-15

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่กรอก title หรือ textContent | VALIDATION_ERROR | "กรุณากรอกชื่อบทเรียนและเนื้อหา" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** `ttsSupported=true` เสมอ (ข้อความพิมพ์อ่านออกเสียงได้เต็มรูปแบบ)

---

### API-18 — รายการบทเรียนทั้งหมด (รวมรอครูอนุมัติ)
- **Method / Path:** `GET /api/v1/teacher/lessons`
- **หน้าที่:** ดูบทเรียนทุกสถานะรวม `pending_approval`
- **Feature ต้นทาง:** FE-39 | **Journey:** UJ-02 node K/L/L2

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "lessonId": "l-03", "title": "คลิปเรื่องวัฏจักรน้ำ", "sourceType": "ai_clip", "approvalStatus": "pending_approval" } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ต่างจาก API-22 (นักเรียน) ตรงที่ endpoint นี้เห็นทุกสถานะ

---

### API-19 — ให้ AI ค้นคลิปตามหัวข้อ
- **Method / Path:** `POST /api/v1/teacher/lessons/ai-search`
- **หน้าที่:** ส่งหัวข้อให้ CMP-13 → AI Service ค้นคลิป แล้วสร้าง `LESSON(source_type='ai_clip', approval_status='pending_approval')` ต่อรายการที่เสนอ
- **Feature ต้นทาง:** FE-11 | **Journey:** UJ-02 node K/L

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | topic | ข้อความสั้น | ใช่ | - |

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "lessonId": "l-04", "title": "คลิปเสนอโดย AI #1", "approvalStatus": "pending_approval" } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่กรอก topic | VALIDATION_ERROR | "กรุณาระบุหัวข้อที่ต้องการให้ AI ค้นหา" |
| 504 | AI Service (CMP-20) ตอบช้าเกินกำหนด | UPSTREAM_TIMEOUT | "AI ค้นคลิปไม่สำเร็จในตอนนี้ กรุณาลงบทเรียนด้วยลิงก์/ไฟล์แทน หรือลองใหม่ภายหลัง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ต้อง**ไม่บล็อก**วงจรหลัก — timeout แล้วต้องตอบ error ที่ชัดเจนให้ครูไปทางอื่นได้ทันที ไม่ค้างหน้าจอ (ตาม DF-02 ของ architecture.md)

---

### API-20 — อนุมัติคลิปที่ AI เสนอ
- **Method / Path:** `POST /api/v1/teacher/lessons/{lessonId}/approve`
- **หน้าที่:** เปลี่ยน `approval_status` เป็น `published`
- **Feature ต้นทาง:** FE-39 | **Journey:** UJ-02 node L2

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "lessonId": "l-04", "approvalStatus": "published" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 404 | ไม่พบ lessonId | NOT_FOUND | "ไม่พบบทเรียนนี้" |
| 409 | lessonId ไม่ได้อยู่ในสถานะ pending_approval | INVALID_STATE | "บทเรียนนี้ไม่ได้อยู่ในสถานะรออนุมัติ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ทันทีที่อนุมัติ ต้องปรากฏใน API-22 (ฝั่งนักเรียน) ในการเรียกครั้งถัดไป (AC-FE-39-1)

---

### API-21 — ไม่อนุมัติคลิปที่ AI เสนอ
- **Method / Path:** `POST /api/v1/teacher/lessons/{lessonId}/reject`
- **หน้าที่:** เปลี่ยน `approval_status` เป็น `rejected` และ `is_active=false`
- **Feature ต้นทาง:** FE-39 | **Journey:** UJ-02 node L2

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "lessonId": "l-04", "approvalStatus": "rejected" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 404 | ไม่พบ lessonId | NOT_FOUND | "ไม่พบบทเรียนนี้" |
| 409 | lessonId ไม่ได้อยู่ในสถานะ pending_approval | INVALID_STATE | "บทเรียนนี้ไม่ได้อยู่ในสถานะรออนุมัติ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** หลัง reject **ไม่มีทางเรียกกลับมาให้นักเรียนเห็นได้อีกเลย** ไม่มี endpoint ใดคืนสถานะกลับเป็น published (AC-FE-39-3)

---

### API-22 — บทเรียนที่เผยแพร่แล้ว
- **Method / Path:** `GET /api/v1/student/lessons`
- **หน้าที่:** รายการบทเรียนที่นักเรียนอ่านได้
- **Feature ต้นทาง:** FE-08, FE-09, FE-10 | **Journey:** UJ-01 node B–F
- **สิทธิ์ที่ต้องมี:** session นักเรียน

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "lessonId": "l-01", "title": "คลิปเรื่องเศษส่วน", "sourceType": "link", "ttsSupported": null } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** **query ต้องกรอง `approval_status='published' AND is_active=true` ที่ชั้น service เสมอ** — บทเรียนที่ `pending_approval`/`rejected` ต้องไม่ปรากฏใน response นี้เลยแม้แต่รายการเดียว (AC-FE-39-2, "ซ่อน ไม่ใช่ disable")

---

### API-23 — ขอให้ AI อ่านออกเสียงบทเรียน
- **Method / Path:** `POST /api/v1/student/lessons/{lessonId}/tts`
- **หน้าที่:** ส่งเนื้อหาบทเรียนให้ CMP-13 → AI Service แปลงเป็นเสียง
- **Feature ต้นทาง:** FE-10 | **Journey:** UJ-01 node E/F

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "audioUrl": "https://.../tts/l-03.mp3" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 409 | `ttsSupported=false` ของบทเรียนนี้ | TTS_NOT_SUPPORTED | "บทเรียนนี้อ่านออกเสียงไม่ได้ (ไฟล์ดึงข้อความไม่ออก)" |
| 504 | AI Service (CMP-20) ตอบช้าเกินกำหนด | UPSTREAM_TIMEOUT | "อ่านออกเสียงไม่สำเร็จในตอนนี้ ลองอ่านเป็นข้อความแทนได้เลย" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** timeout ต้อง fallback เป็น "อ่านบทเรียนแบบข้อความได้ตามปกติ" ไม่บล็อกทั้งหน้าจอ (DF-01 จุดพัง)

---

### API-24 — สร้างแบบทดสอบ/ใบงาน/งานแนบไฟล์
- **Method / Path:** `POST /api/v1/teacher/quizzes`
- **หน้าที่:** สร้าง `QUIZ_SET` (+`QUIZ_QUESTION`/`QUIZ_CHOICE` เมื่อ format=mcq)
- **Feature ต้นทาง:** FE-12, FE-13, FE-14, FE-18, FE-19, FE-21, FE-38 | **Journey:** UJ-02 node M–S

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | title | ข้อความสั้น | ใช่ | (AC-FE-12-2) |
| body | lessonId | รหัสอ้างอิง | ไม่ | null = ไม่ผูกบทเรียน (FE-38) |
| body | format | ข้อความสั้น (enum) | ใช่ | `mcq` \| `worksheet` \| `attachment` |
| body | fullScore | จำนวนเต็ม | ใช่ | > 0 (AC-FE-13-2) |
| body | maxAttempts | จำนวนเต็ม | ใช่ | ≥ 1 (AC-FE-18-2) |
| body | openAt / closeAt | วันที่-เวลา | ใช่ | closeAt > openAt (AC-FE-19-2) |
| body | questions | รายการ (เฉพาะ format=mcq) | ใช่เมื่อ mcq | แต่ละข้อมี choices อย่างน้อย 2 และมี `isCorrect=true` อย่างน้อย 1 |

```json
{
  "title": "แบบทดสอบเศษส่วน", "format": "mcq", "fullScore": 20, "maxAttempts": 3,
  "openAt": "2026-08-24T00:00:00Z", "closeAt": "2026-08-31T23:59:59Z",
  "questions": [ { "questionText": "1/2 + 1/2 = ?", "choices": [ { "choiceText": "1", "isCorrect": true }, { "choiceText": "2", "isCorrect": false } ] } ]
}
```

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "quizSetId": "q-01", "gradingMethod": "auto" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่กรอก title | VALIDATION_ERROR | "กรุณากรอกชื่อชุดแบบทดสอบ" |
| 400 | fullScore ≤ 0 | VALIDATION_ERROR | "กรุณากรอกคะแนนเต็มที่มากกว่า 0" |
| 400 | maxAttempts = 0 | VALIDATION_ERROR | "กรุณากรอกจำนวนรอบที่ทำซ้ำได้อย่างน้อย 1 รอบ" |
| 400 | ไม่กำหนด openAt/closeAt | VALIDATION_ERROR | "กรุณากำหนดวันเปิดและวันปิด" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** `grading_method` ถูก derive จาก `format` เสมอ (mcq→auto, worksheet/attachment→manual) ไม่ใช่ค่าที่ client ส่งมาเอง

---

### API-25 — ให้ AI ช่วยออกข้อสอบปรนัย
- **Method / Path:** `POST /api/v1/teacher/quizzes/ai-generate`
- **หน้าที่:** ส่ง topic ให้ CMP-13 → AI Service ออกข้อสอบปรนัย แล้วสร้าง `QUIZ_SET(format='mcq', creation_source='ai')` ให้ครูตรวจก่อนเผยแพร่จริง
- **Feature ต้นทาง:** FE-15 | **Journey:** UJ-02 node M/Q

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | topic | ข้อความสั้น | ใช่ | - |
| body | questionCount | จำนวนเต็ม | ใช่ | > 0 |

**Response สำเร็จ** — `200 OK` (draft ให้ครูตรวจ/แก้ก่อนบันทึกจริงผ่าน API-24)

```json
{ "data": { "title": "แบบทดสอบที่ AI สร้าง", "questions": [ { "questionText": "...", "choices": [ "..." ] } ] } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่กรอก topic | VALIDATION_ERROR | "กรุณาระบุหัวข้อที่ต้องการให้ AI ออกข้อสอบ" |
| 504 | AI Service (CMP-20) ตอบช้าเกินกำหนด | UPSTREAM_TIMEOUT | "AI ออกข้อสอบไม่สำเร็จในตอนนี้ กรุณาสร้างแบบทดสอบเองแทน หรือลองใหม่ภายหลัง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ผลลัพธ์เป็น **draft เท่านั้น** ยังไม่บันทึกเป็น `QUIZ_SET` จริงจนกว่าครูจะยืนยันผ่าน API-24 — ระบบไม่บังคับให้ครูต้องใช้เส้นทาง AI (spec 01 ข้อ ข.)

---

### API-26 — รายการชุดแบบทดสอบทั้งหมด (มุมครู)
- **Method / Path:** `GET /api/v1/teacher/quizzes`
- **หน้าที่:** ดูรายการชุดแบบทดสอบที่ครูสร้างไว้
- **Feature ต้นทาง:** FE-12–FE-19 | **Journey:** UJ-02

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "quizSetId": "q-01", "title": "แบบทดสอบเศษส่วน", "format": "mcq", "gradingMethod": "auto", "maxAttempts": 3, "openAt": "...", "closeAt": "..." } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** -

---

### API-27 — รายการงานที่รอครูตรวจ
- **Method / Path:** `GET /api/v1/teacher/quizzes/{quizId}/submissions`
- **หน้าที่:** ดึง `QUIZ_ATTEMPT` ของชุดนี้ที่ `status='pending_review'`
- **Feature ต้นทาง:** FE-17 | **Journey:** UJ-02 node U/W

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "attemptId": "a-01", "studentId": "s-3001", "nickname": "น้องมิว", "status": "pending_review", "workAttachmentUrl": "https://..." } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 404 | ไม่พบ quizId | NOT_FOUND | "ไม่พบชุดแบบทดสอบนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** -

---

### API-28 — บันทึกคะแนนที่ครูตรวจเอง
- **Method / Path:** `POST /api/v1/teacher/quizzes/{quizId}/submissions/{attemptId}/grade`
- **หน้าที่:** ตั้ง `score_awarded`, `status='graded'`
- **Feature ต้นทาง:** FE-17 | **Journey:** UJ-02 node U/W

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | score | ทศนิยม (ไม่เกิน 1 ตำแหน่ง) | ใช่ | ต้องเป็น**ตัวเลขล้วน** (JSON number หรือสตริงตัวเลขล้วนรูป `^\d+(\.\d)?$` — ไม่รับ `10abc`, `1e1`, `7.`), ทศนิยมไม่เกิน 1 ตำแหน่ง (7.5 ผ่าน, 7.55 ไม่ผ่าน — AC-FE-17-3/4/5) และ `0 <= score <= fullScore` ของชุดนั้น (AC-FE-17-2) |

```json
{ "score": 7.5 }
```

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "attemptId": "a-01", "status": "graded", "score": 7.5 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | score นอกช่วง 0–fullScore (AC-FE-17-2) | VALIDATION_ERROR | "กรุณากรอกคะแนนระหว่าง 0 ถึง {fullScore}" |
| 400 | score มีทศนิยมเกิน 1 ตำแหน่ง เช่น 7.55 (AC-FE-17-4) | VALIDATION_ERROR | "ทศนิยมได้ 1 ตำแหน่ง เช่น 7.5" |
| 400 | score ไม่ใช่ตัวเลขล้วน เช่น `10abc` (AC-FE-17-5) — ห้ามตีความเป็น 10 | VALIDATION_ERROR | "ทศนิยมได้ 1 ตำแหน่ง เช่น 7.5" |
| 404 | ไม่พบ attemptId | NOT_FOUND | "ไม่พบงานที่ต้องการตรวจ" |

เมื่อตอบ 400 ทุกกรณี **ไม่บันทึกคะแนน** และ `status` ของงานยังเป็น `pending_review` (AC-FE-17-4/5)

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ผลรวมแต้มจากคะแนนนี้มีเศษได้ (1 คะแนน = 1 แต้ม): `POINTS_LEDGER_ENTRY.points_delta_total` เป็นทศนิยม 1 ตำแหน่ง ส่วน `points_delta_available = floor(ยอดสะสมใหม่) − floor(ยอดสะสมเดิม)` (เช่น สะสม 10 → 17.5 ใช้ได้ +7) ; การบันทึกคะแนนต้อง trigger การอัปเดต `STUDENT_QUIZ_RESULT` + สร้าง `POINTS_LEDGER_ENTRY(entry_type='quiz_score_conversion')` เฉพาะส่วน delta ถ้าคะแนนนี้ดีกว่ารอบก่อนหน้า (เหตุผลเดียวกับ FE-41 แม้ grading_method จะเป็น manual)

---

### API-29 — รายการแบบทดสอบที่ทำได้ (มุมนักเรียน)
- **Method / Path:** `GET /api/v1/student/quizzes`
- **หน้าที่:** ดึงชุดที่เปิดอยู่ (`open_at <= now <= close_at`) พร้อมสถานะทำแล้ว/ยังไม่ทำ/จำนวนรอบที่เหลือ
- **Feature ต้นทาง:** FE-20 | **Journey:** UJ-01 node G/H

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "quizSetId": "q-01", "title": "แบบทดสอบเศษส่วน", "attemptsUsed": 1, "maxAttempts": 3, "status": "not_done" } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** -

---

### API-30 — รายละเอียดชุดแบบทดสอบเพื่อทำ
- **Method / Path:** `GET /api/v1/student/quizzes/{quizId}`
- **หน้าที่:** ส่งคำถาม+ตัวเลือก (ไม่ส่ง `isCorrect`) ให้นักเรียนทำ
- **Feature ต้นทาง:** FE-20 | **Journey:** UJ-01 node G/H

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "quizSetId": "q-01", "questions": [ { "questionId": "qq-01", "questionText": "1/2 + 1/2 = ?", "choices": [ { "choiceId": "c-01", "choiceText": "1" } ] } ] } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | ยังไม่ถึง openAt หรือเลย closeAt แล้ว | QUIZ_NOT_OPEN | "แบบทดสอบชุดนี้ยังไม่เปิดหรือปิดรับคำตอบแล้ว" |
| 403 | ใช้ครบจำนวนรอบแล้ว | ATTEMPT_LIMIT_REACHED | "ทำครบจำนวนรอบที่กำหนดแล้ว" |
| 404 | ไม่พบ quizId | NOT_FOUND | "ไม่พบแบบทดสอบชุดนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** **ห้ามส่ง `isCorrect` ของ `QUIZ_CHOICE` มาด้วยเด็ดขาด** (กันนักเรียนดูเฉลยจาก network payload)

---

### API-31 — ส่งคำตอบ/ส่งงาน 1 รอบ
- **Method / Path:** `POST /api/v1/student/quizzes/{quizId}/attempts`
- **หน้าที่:** สร้าง `QUIZ_ATTEMPT` ใหม่ ตรวจปรนัยอัตโนมัติถ้า format=mcq แล้วส่งต่อ Points Ledger
- **Feature ต้นทาง:** FE-16, FE-20, FE-41 | **Journey:** UJ-01 node G–L

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| header | Idempotency-Key | ข้อความสั้น | ใช่ | ใช้กันส่งซ้ำจากเครือข่ายหลุด (DF-01) — map เข้า `client_request_id` |
| body | answers | รายการ (เฉพาะ mcq) | ใช่เมื่อ mcq | ต้องตอบครบทุกข้อ (AC-FE-20-2) |
| body | workAttachmentRef | ข้อความสั้น (เฉพาะ attachment) | ใช่เมื่อ attachment | รหัสไฟล์ที่อัปโหลดผ่าน CMP-15 ไว้ก่อนแล้ว |

```json
{ "answers": [ { "questionId": "qq-01", "choiceId": "c-01" } ] }
```

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "attemptId": "a-05", "attemptNumber": 2, "status": "graded", "scoreAwarded": 16, "isNewBest": true, "pointsEarnedThisAttempt": 6 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ตอบไม่ครบทุกข้อ | VALIDATION_ERROR | "กรุณาเลือกคำตอบให้ครบทุกข้อก่อนส่ง" |
| 403 | ใช้ครบจำนวนรอบแล้ว หรือปิดรับคำตอบแล้ว | ATTEMPT_LIMIT_REACHED / QUIZ_NOT_OPEN | "ทำครบจำนวนรอบที่กำหนดแล้ว" / "แบบทดสอบชุดนี้ปิดรับคำตอบแล้ว" |
| 409 | `Idempotency-Key` ซ้ำกับ request ก่อนหน้าที่สำเร็จแล้ว | DUPLICATE_REQUEST (คืนผลลัพธ์เดิม ไม่ใช่ error จริง — ตอบ 200 พร้อมผลเดิม) | - |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ทั้งหมดนี้อยู่ใน **1 database transaction เดียว**: (1) insert `QUIZ_ATTEMPT`, (2) ตรวจปรนัยถ้า format=mcq, (3) เทียบกับ `STUDENT_QUIZ_RESULT.best_score` เดิม — ถ้าดีกว่า อัปเดต best + คำนวณ `pointsEarnedThisAttempt = new_points - points_awarded_total เดิม` แล้ว insert `POINTS_LEDGER_ENTRY(entry_type='quiz_score_conversion')` และ `POINTS_ACCOUNT` ทั้งสองยอด; ถ้าไม่ดีกว่า `pointsEarnedThisAttempt=0` และ **ห้ามแก้ `best_score`/แต้มใดๆ** (AC-FE-41-1, AC-FE-41-2, AC-FE-22-1)

---

### API-32 — ดูคะแนนล่าสุด/รอบที่ดีที่สุด
- **Method / Path:** `GET /api/v1/student/quizzes/{quizId}/result`
- **หน้าที่:** ดึง `STUDENT_QUIZ_RESULT` ของนักเรียนเจ้าของ session
- **Feature ต้นทาง:** FE-16, FE-41 | **Journey:** UJ-01 node I/K/L

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "bestScore": 17.5, "fullScore": 20, "attemptsUsed": 2, "maxAttempts": 3 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 404 | ยังไม่เคยทำชุดนี้ | NOT_FOUND | "ยังไม่มีผลคะแนนของชุดนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** แสดงเฉพาะจำนวนข้อถูก/คะแนนโดยรวม ไม่มีข้อความตำหนิ/สีแดง (AC-FE-16-3)

---

### API-33 — ยอดแต้มสะสมรวม/ใช้ได้
- **Method / Path:** `GET /api/v1/student/me/points`
- **หน้าที่:** ดึง `POINTS_ACCOUNT` ของตนเอง
- **Feature ต้นทาง:** FE-22, FE-23 | **Journey:** UJ-01 node L

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "totalEarnedPoints": 17.5, "availablePoints": 17, "pendingFraction": 0.5 } }
```

| ฟิลด์ | ชนิด | ความหมาย |
|---|---|---|
| totalEarnedPoints | ทศนิยม (1 ตำแหน่ง) | ยอดสะสมรวม มีเศษได้ แสดงตามจริง (AC-FE-22-3) |
| availablePoints | จำนวนเต็ม | ยอดที่ใช้ได้ = `floor(totalEarnedPoints) − แต้มที่ใช้ไปทั้งหมด` (AC-FE-23-3) |
| pendingFraction | ทศนิยม (1 ตำแหน่ง, 0 ≤ ค่า < 1) | เศษที่ยังใช้ไม่ได้ = `totalEarnedPoints − floor(totalEarnedPoints)` — client ใช้แสดง "เศษ 0.5 แต้มรอสะสม" และ "ต้องได้อีก {1 − pendingFraction} แต้มจึงครบ 1" (spec 02 ข.6, AC-FE-23-3); ไม่ใช่คอลัมน์ในฐานข้อมูล คำนวณตอนตอบ |

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** `totalEarnedPoints` เป็นค่าที่ไม่มีวันลดจากการกระทำใดๆ (FE-22) — endpoint นี้ไม่มี parameter ให้แก้ไขค่าตรงๆ เลย (อ่านอย่างเดียว); `availablePoints` เป็นจำนวนเต็มเสมอ เศษไม่นับเป็นแต้มที่ใช้ได้ (spec 02 ข.5)

---

### API-34 — สัตว์เลี้ยงที่ใช้งานอยู่
- **Method / Path:** `GET /api/v1/student/me/pet`
- **หน้าที่:** ดึง `PET` (is_active=true) + `PET_STAT` ของตนเอง
- **Feature ต้นทาง:** FE-76, FE-77 | **Journey:** UJ-01 node L3/M/N

**Response สำเร็จ** — `200 OK`

```json
{
  "data": {
    "petId": "p-01", "speciesCode": "winged_egg", "stage": "stage1", "statTotal": 100,
    "stats": [ { "statKey": "speed", "value": 50 }, { "statKey": "power", "value": 30 }, { "statKey": "accuracy", "value": 20 } ],
    "nextStageCost": 10
  }
}
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 404 | ยังไม่เคยซื้อไข่ | NO_ACTIVE_PET | "ยังไม่มีสัตว์เลี้ยง — ไปซื้อไข่ตัวแรกกันเถอะ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** `nextStageCost=null` เมื่ออยู่ที่ `stage4` แล้ว (สูงสุดของรอบทดลองนี้ ตาม AC-FE-24-7)

---

### API-35 — รายชื่อสายพันธุ์ที่เลือกได้
- **Method / Path:** `GET /api/v1/species`
- **หน้าที่:** รายชื่อ `SPECIES` ทั้ง 3 สาย พร้อมพลังพิเศษประจำสาย (`SPECIAL_POWER`) ที่ผูกไว้แล้ว
- **Feature ต้นทาง:** FE-44, FE-45 | **Journey:** UJ-01 node L2
- **สิทธิ์ที่ต้องมี:** session นักเรียน

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "speciesId": "sp-01", "code": "winged_egg", "displayLabel": "ไข่มีปีก", "specialPowers": [ { "name": "ไฟไหม้", "description": "..." } ] } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** คืนครบ 3 รายการเสมอ ทุกรายการมีทั้งสีประจำสาย(client จัดการ)และป้ายชื่อ `displayLabel` (AC-FE-44-2); `specialPowers` อาจเป็น array ว่างถ้ายังไม่ล็อก mapping สายพันธุ์↔พลังพิเศษ (ดู Gap G-DB-03) — แต่ละรายการที่มีต้องแสดงทั้งชื่อพลังพิเศษและไอคอนคู่กันเสมอ ไม่สื่อด้วยสีเพียงอย่างเดียว (AC-FE-45-2) และพลังพิเศษของแต่ละสายต้องไม่เหมือนกันทุกประการ (AC-FE-45-3)

---

### API-36 — ซื้อไข่และเลือกสายพันธุ์
- **Method / Path:** `POST /api/v1/student/me/pet/egg`
- **หน้าที่:** หักแต้มที่ใช้ได้ 1 แต้ม แล้วสร้าง `PET(stage='egg', stat_total=50)` ใหม่พร้อมกระจาย `PET_STAT` ตามสัดส่วนสายพันธุ์
- **Feature ต้นทาง:** FE-44, FE-75, FE-76 | **Journey:** UJ-01 node L2/L3

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | speciesId | รหัสอ้างอิง | ใช่ | ต้องเป็น 1 ใน 3 สายที่ `SPECIES.is_active=true` |

```json
{ "speciesId": "sp-01" }
```

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "petId": "p-01", "stage": "egg", "statTotal": 50, "availablePoints": 0 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่ส่ง speciesId | VALIDATION_ERROR | "กรุณาเลือกสายพันธุ์ก่อน" |
| 409 | นักเรียนมีสัตว์เลี้ยงที่ใช้งานอยู่แล้ว | ACTIVE_PET_EXISTS | "มีสัตว์เลี้ยงที่ใช้งานอยู่แล้ว — ใช้เมนูรีเซ็ตถ้าต้องการเปลี่ยนสายพันธุ์" |
| 422 | `available_points < 1` | INSUFFICIENT_POINTS | "ยังสะสมแต้มที่ใช้ได้ไม่พอ ต้องมีอย่างน้อย 1 แต้ม (ตอนนี้มี {available} แต้ม)" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** เงื่อนไขใช้ `available_points >= 1` (ตาม AC-FE-75-2/3 — ทดสอบค่าขอบ `>=` ไม่ใช่ `>`); **เศษแต้มไม่นับ** — `available_points` เป็นจำนวนเต็ม (= floor ยอดสะสม − ที่ใช้ไป) ดังนั้นยอดสะสม 0.5 ได้ `available_points=0` จึงตอบ 422 `INSUFFICIENT_POINTS` ด้วยข้อความเป็นกลาง และเมื่อได้เศษอีก 0.5 รวมเป็น 1 ซื้อได้ (AC-FE-23-4/5); ทั้งหมดอยู่ใน 1 transaction: หักแต้ม → insert `POINTS_LEDGER_ENTRY(entry_type='egg_purchase')` → insert `PET` → insert `PET_STAT` ตามสัดส่วน (ตัวเลขสัดส่วนจริงยังไม่ล็อก — ดู Gap) → ยอดรวมของ `PET_STAT` ต้อง = 50 พอดี (AC-FE-77-2)

---

### API-37 — ปลดล็อกขั้นเติบโตถัดไป
- **Method / Path:** `POST /api/v1/student/me/pet/unlock-next-stage`
- **หน้าที่:** หักแต้มตามตารางต้นทุนขั้นต่อขั้น แล้วเลื่อน `stage` + เพิ่ม `stat_total`/`PET_STAT` +50
- **Feature ต้นทาง:** FE-24, FE-77 | **Journey:** UJ-01 node M/N/N5

**Request:** ไม่มี body (ปลดล็อก "ขั้นถัดไป" จากขั้นปัจจุบันเสมอ)

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "petId": "p-01", "stage": "stage1", "statTotal": 100, "availablePoints": 0 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 404 | ไม่มีสัตว์เลี้ยงที่ใช้งานอยู่ | NO_ACTIVE_PET | "ยังไม่มีสัตว์เลี้ยง — ไปซื้อไข่ตัวแรกกันเถอะ" |
| 409 | อยู่ที่ `stage4` แล้ว (สูงสุด) | STAGE_ALREADY_MAX | "สัตว์เลี้ยงของคุณโตเต็มที่แล้วในรอบทดลองนี้" |
| 422 | `available_points` ไม่ถึงเกณฑ์ของขั้นถัดไป | INSUFFICIENT_POINTS | "ยังสะสมแต้มที่ใช้ได้ไม่พอ ต้องมีอย่างน้อย {required} แต้ม (ตอนนี้มี {available} แต้ม)" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ต้นทุนต่อขั้นใช้ตารางที่ล็อกแล้ว (egg→stage1: 5, stage1→stage2: 10, stage2→stage3: 15, stage3→stage4: 20 — AC-FE-24-4~7) จ่ายแบบ**ขั้นต่อขั้น (incremental)** ไม่ใช่ยอดสะสม (AC-FE-24-9); เงื่อนไขคือ `available_points >= required` (`>=` ไม่ใช่ `>`, ทดสอบขอบตาม AC-FE-24-8); เพิ่ม `stat_total` +50 และกระจายลง `PET_STAT` ตามสัดส่วนสายพันธุ์ในทรานแซกชันเดียวกัน (AC-FE-77-1)

---

### API-38 — เปลี่ยนสายพันธุ์/รีเซ็ตตัวละคร
- **Method / Path:** `POST /api/v1/student/me/pet/reset`
- **หน้าที่:** ปิดใช้งาน `PET` ตัวปัจจุบัน (กลายเป็นประวัติ), คืนแต้มที่ใช้ได้กลับมาเท่ากับยอดสะสมรวมเต็มจำนวน **รวมแต้มที่เคยใช้ซื้อไอเทมช่วยด้วย**, เคลียร์ `STUDENT_ITEM_INVENTORY` ทั้งหมดของนักเรียนคนนี้ (`quantity=0`) ในธุรกรรมเดียวกัน — **ไม่ insert `PET` ใหม่ในจังหวะนี้** นักเรียนต้องเรียก API-36 (ซื้อไข่) แยกต่างหากอีกครั้งเพื่อสร้าง `PET` ใหม่
- **Feature ต้นทาง:** FE-26 | **Journey:** UJ-01 node M/N2/N3/N4

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | confirm | บูลีน | ใช่ | ต้องเป็น `true` (กันกดพลาด เพราะย้อนกลับไม่ได้) |

```json
{ "confirm": true }
```

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "previousPetId": "p-01", "availablePoints": 56, "totalEarnedPoints": 56 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | `confirm` ไม่ใช่ `true` | VALIDATION_ERROR | "กรุณายืนยันการรีเซ็ต" |
| 404 | ไม่มีสัตว์เลี้ยงที่ใช้งานอยู่ | NO_ACTIVE_PET | "ยังไม่มีสัตว์เลี้ยงให้รีเซ็ต" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ตาม [[../../01-requirements/01-spec/20260823-06-battle-support-items|spec 06]] Open Question ข้อ 6 (ปิดแล้ว 2026-08-23) — (1) หลังรีเซ็ต `available_points = floor(total_earned_points)` เสมอ — **คืนเป็นส่วนจำนวนเต็มของยอดสะสม** (spec 02 ข้อ ข.3 + ข.5, AC-FE-23-6: สะสม 7.5 → ใช้ได้กลับเป็น 7 และ `totalEarnedPoints` ยังเป็น 7.5; ถ้ายอดสะสมไม่มีเศษก็เท่ากับ `total_earned_points` พอดีเหมือนเดิม) โดยยอดที่คืนนับรวมแต้มที่เคยใช้ซื้อไอเทมช่วย (API-41) ด้วยเต็มจำนวน ไม่ใช่เฉพาะค่าไข่/ค่าขั้น; ตัวอย่าง response ด้านบนใช้ยอดสะสมจำนวนเต็ม (56) จึงได้ค่าเท่ากัน; (2) **ไม่ insert `PET` ใหม่ทันทีในจังหวะเดียวกับการรีเซ็ต** — `PET` เดิมถูกตั้ง `is_active=false` เท่านั้น (กลายเป็นรายการในอัลบั้ม FE-72/73 อัตโนมัติ) นักเรียนต้องเรียก API-36 (ซื้อไข่) แยกต่างหากอีกครั้งเพื่อสร้าง `PET` ใหม่; (3) `STUDENT_ITEM_INVENTORY` ทั้งหมดของนักเรียนคนนี้ถูกเคลียร์ทิ้งพร้อมกัน (`quantity=0`) ในธุรกรรมเดียวกัน — นี่คือกลไกที่ปิดช่องโหว่ "รีเซ็ตแล้วได้แต้มค่าไอเทมคืนวนซ้ำ" (ได้แต้มคืนเต็มแต่ต้องเสียไอเทมทั้งหมดที่ถือครองอยู่)

---

### API-39 — อัลบั้มบันทึกเส้นทางการเติบโต
- **Method / Path:** `GET /api/v1/student/me/pet/growth-path`
- **หน้าที่:** ดึงทุกแถว `PET` (ทั้ง active และ inactive) ของตนเอง เรียงตาม `created_at`
- **Feature ต้นทาง:** FE-72, FE-73, FE-74 | **Journey:** UJ-01 node N3/N4

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "petId": "p-00", "speciesCode": "legged_egg", "highestStage": "stage3", "isActive": false }, { "petId": "p-01", "speciesCode": "winged_egg", "highestStage": "stage1", "isActive": true } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** จำนวนรายการต้อง**ไม่ลดลงไม่ว่าจะรีเซ็ตกี่ครั้ง** (AC-FE-73-2); ไม่มีทาง "สลับกลับไปใช้" ตัวที่ `isActive=false` ได้ (AC-FE-74-2) — endpoint นี้เป็น read-only ล้วน ไม่มี action ให้เปลี่ยนสถานะ

---

### API-40 — รายการไอเทมช่วยในร้าน
- **Method / Path:** `GET /api/v1/shop/items`
- **หน้าที่:** รายชื่อ `SHOP_ITEM` ทั้งหมดที่เปิดขาย
- **Feature ต้นทาง:** FE-78 | **Journey:** UJ-01 node M/O
- **สิทธิ์ที่ต้องมี:** session นักเรียน

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "shopItemId": "si-01", "code": "cleanse_status", "name": "ล้างสถานะ", "pricePoints": null } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** `pricePoints` เป็น `null`/placeholder จนกว่าราคาจะถูกล็อก (ดู Gap) — **ห้าม client เดาราคาเอง ต้องรอค่าจาก server เท่านั้น**

---

### API-41 — ซื้อไอเทมช่วย
- **Method / Path:** `POST /api/v1/student/me/items/purchase`
- **หน้าที่:** หัก `available_points` แล้วเพิ่ม `STUDENT_ITEM_INVENTORY.quantity`
- **Feature ต้นทาง:** FE-78 | **Journey:** UJ-01 node M/O

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | shopItemId | รหัสอ้างอิง | ใช่ | - |

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "shopItemId": "si-01", "quantity": 1, "availablePoints": 14 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่ส่ง shopItemId หรือรูปแบบไม่ถูกต้อง | VALIDATION_ERROR | "กรุณาเลือกไอเทมที่ต้องการซื้อ" |
| 404 | ไม่พบ shopItemId | NOT_FOUND | "ไม่พบไอเทมนี้" |
| 422 | `available_points` ไม่พอ | INSUFFICIENT_POINTS | "ยังสะสมแต้มที่ใช้ได้ไม่พอสำหรับไอเทมนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** การหักแต้มผ่าน transaction เดียวกับ insert `POINTS_LEDGER_ENTRY(entry_type='item_purchase')` (กัน race condition เดียวกับ API-36/37); ซื้อไอเทมไม่กระทบ `PET_STAT`/`stat_total` เลย (spec 06 ข้อ ค. — ไอเทมไม่เพิ่มค่าสเตตัส)

---

### API-42 — ไอเทมที่ถือครองอยู่
- **Method / Path:** `GET /api/v1/student/me/items`
- **หน้าที่:** ดึง `STUDENT_ITEM_INVENTORY` ของตนเอง
- **Feature ต้นทาง:** FE-78 | **Journey:** UJ-01/UJ-03

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "shopItemId": "si-01", "code": "cleanse_status", "quantity": 1 } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** -

---

### API-43 — สถานะอารีน่าสัปดาห์นี้ (มุมนักเรียน)
- **Method / Path:** `GET /api/v1/student/arena/current`
- **หน้าที่:** ดึงสถานะสัปดาห์ปัจจุบัน + รายชื่อเพื่อนที่เลือกเป็นคู่แข่งได้ (ไม่มีคะแนน/สถานะทำงานของเพื่อน)
- **Feature ต้นทาง:** FE-27, FE-42, FE-76 | **Journey:** UJ-01 node L3/N5/P, UJ-03 node C/D

**Response สำเร็จ** — `200 OK`

```json
{
  "data": {
    "arenaWeekId": "aw-14", "status": "open",
    "myMatch": null,
    "availableOpponents": [ { "studentId": "s-4001", "nickname": "ต้นกล้า" } ]
  }
}
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** `availableOpponents` มีเฉพาะ `studentId`/`nickname` **ห้ามมีคะแนนแบบทดสอบ สถานะทำ/ไม่ทำ หรือแต้มของเพื่อนปนมาเลย** (AC-FE-42-2)

---

### API-44 — เลือกคู่แข่งของตนเอง
- **Method / Path:** `POST /api/v1/student/arena/current/opponent`
- **หน้าที่:** สร้าง `ARENA_MATCH(pairing_method='student_choice')`
- **Feature ต้นทาง:** FE-42 | **Journey:** UJ-03 node C/D

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | opponentStudentId | รหัสอ้างอิง | ใช่ | ต้องอยู่ใน `availableOpponents` ของ API-43 |

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "matchId": "am-01", "status": "pending" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 409 | นักเรียนมีคู่แข่งของสัปดาห์นี้อยู่แล้ว | MATCH_ALREADY_EXISTS | "เลือกคู่แข่งของสัปดาห์นี้ไปแล้ว" |
| 422 | opponentStudentId ไม่อยู่ในรายชื่อที่เลือกได้ | INVALID_OPPONENT | "ไม่สามารถเลือกคู่แข่งคนนี้ได้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** -

---

### API-45 — ใช้ไอเทมช่วยในแมตช์
- **Method / Path:** `POST /api/v1/student/arena/matches/{matchId}/use-item`
- **หน้าที่:** insert `MATCH_ITEM_USAGE` พร้อมบังคับ 1 ครั้ง/ไอเทม/แมตช์ที่ระดับฐานข้อมูล
- **Feature ต้นทาง:** FE-80, FE-81 | **Journey:** UJ-03 node P1

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | shopItemId | รหัสอ้างอิง | ใช่ | ต้องเป็นไอเทมที่นักเรียนถือครองอยู่ (`STUDENT_ITEM_INVENTORY.quantity > 0`) |

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "matchId": "am-01", "shopItemId": "si-02", "used": true } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่ส่ง shopItemId หรือรูปแบบไม่ถูกต้อง | VALIDATION_ERROR | "กรุณาเลือกไอเทมที่ต้องการใช้" |
| 404 | ไม่พบ matchId หรือไม่ใช่คู่ของตนเอง | NOT_FOUND | "ไม่พบแมตช์นี้" |
| 409 | เคยใช้ไอเทมนี้ในแมตช์นี้ไปแล้ว | ITEM_ALREADY_USED | "ใช้ไอเทมนี้ในแมตช์นี้ไปแล้ว" |
| 409 | แมตช์นี้ประกาศผลแล้ว | MATCH_ALREADY_ANNOUNCED | "แมตช์นี้จบไปแล้ว ใช้ไอเทมไม่ได้อีก" |
| 422 | ไม่มีไอเทมนี้ถือครองอยู่ | ITEM_NOT_OWNED | "ไม่มีไอเทมนี้ในคลังของคุณ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** unique constraint `(arena_match_id, student_id, shop_item_id)` ที่ระดับฐานข้อมูลเป็นตัวกันจริง ไม่ใช่แค่ disable ปุ่มที่ client (ตาม DF-03 ของ architecture.md)

---

### API-46 — ดูผลแมตช์ของตนเอง
- **Method / Path:** `GET /api/v1/student/arena/matches/{matchId}/result`
- **หน้าที่:** แสดงผลแพ้-ชนะ (เฉพาะหลังประกาศผลแล้ว) — **ไม่ส่งค่าสเตตัสของคู่แข่ง**
- **Feature ต้นทาง:** FE-27, FE-32, FE-45, FE-79 | **Journey:** UJ-01 node P/Q, UJ-03 node P2/P3

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "matchId": "am-01", "result": "win", "opponentNickname": "ต้นกล้า", "specialPowersTriggered": [ { "name": "ติดพิษ", "target": "opponent" } ], "note": "จบแมตช์แล้ว สัตว์เลี้ยงกลับสภาพเดิม ไม่เสียแต้ม ไม่ลดขั้น" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | แมตช์ยังไม่ประกาศผล | RESULT_NOT_ANNOUNCED | "ยังไม่ประกาศผลของแมตช์นี้" |
| 404 | ไม่พบ matchId หรือไม่ใช่คู่ของตนเอง | NOT_FOUND | "ไม่พบแมตช์นี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ผู้แพ้ **ไม่มีข้อความ/ไอคอนเชิงลงโทษ** (AC-FE-32-2); ระบุชัดว่าไม่มีผลเสียใดๆ ต่อสัตว์เลี้ยง (AC-FE-27-2, spec 06 ข้อ ข.) — field ที่ตอบกลับไม่มีค่าสเตตัส/HP ของคู่แข่งเลย มีเพียงผลแพ้-ชนะและ nickname

---

### API-47 — ภาพรวมอารีน่าสัปดาห์นี้ (มุมครู)
- **Method / Path:** `GET /api/v1/teacher/arena/current`
- **หน้าที่:** ดูสถานะจับคู่/ผลแพ้-ชนะของทุกคู่ในสัปดาห์นี้
- **Feature ต้นทาง:** FE-27 | **Journey:** UJ-03 node A/B

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "matchId": "am-01", "studentA": "3001", "studentB": "4001", "pairingMethod": "student_choice", "status": "pending" } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** **ไม่มีตัวเลขค่าสเตตัส ขั้นการเติบโต แต้ม หรือ HP ของนักเรียนคนใดปรากฏใน response นี้เลยแม้แต่ field เดียว** มีเพียงรหัสประจำตัว/ชื่อเล่นและสถานะแมตช์ (AC-FE-27-3 — "ซ่อน ไม่ใช่ disable")

---

### API-48 — สุ่มจับคู่แข่ง
- **Method / Path:** `POST /api/v1/teacher/arena/current/pair/random`
- **หน้าที่:** สร้าง `ARENA_MATCH(pairing_method='teacher_random')` ให้ครบทุกคนที่ยังไม่มีคู่
- **Feature ต้นทาง:** FE-28 | **Journey:** UJ-03 node C/E

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "matchesCreated": 14 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** กดซ้ำก่อนประกาศผล = แทนที่คู่เดิมทั้งหมดด้วยชุดใหม่ (`is_active=false` คู่เดิม แล้วสร้างใหม่ — AC-FE-28-2) ไม่มีนักเรียนถูกจับคู่ซ้ำสองคู่ในสัปดาห์เดียว

---

### API-49 — เลือกคู่แข่งเอง (มุมครู)
- **Method / Path:** `POST /api/v1/teacher/arena/current/pair/manual`
- **หน้าที่:** สร้าง `ARENA_MATCH(pairing_method='teacher_manual')` สำหรับคู่ที่ครูเลือก
- **Feature ต้นทาง:** FE-29 | **Journey:** UJ-03 node C/F

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | studentAId | รหัสอ้างอิง | ใช่ | ต้องไม่ซ้ำกับ studentBId (AC-FE-29-2) |
| body | studentBId | รหัสอ้างอิง | ใช่ | เช่นเดียวกัน |

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "matchId": "am-15" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | studentAId = studentBId | VALIDATION_ERROR | "กรุณาเลือกนักเรียนสองคนที่ไม่ซ้ำกัน" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** -

---

### API-50 — เปิด/ปิดระบบจับคู่อัตโนมัติรายสัปดาห์
- **Method / Path:** `PUT /api/v1/teacher/arena/settings/auto-pairing`
- **หน้าที่:** ตั้ง `ARENA_WEEK.auto_pairing_enabled` ที่คงอยู่ข้ามสัปดาห์
- **Feature ต้นทาง:** FE-30 | **Journey:** UJ-03 node C/G/O

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | enabled | บูลีน | ใช่ | - |

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "enabled": true } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** เมื่อ `enabled=true` ระบบต้องสร้างคู่แข่งของสัปดาห์ใหม่ให้เองทันทีที่สัปดาห์เริ่ม โดยครูไม่ต้องกดซ้ำ (AC-FE-30-2)

---

### API-51 — ประกาศผลการแข่งขัน
- **Method / Path:** `POST /api/v1/teacher/arena/current/announce`
- **หน้าที่:** เปลี่ยนทุก `ARENA_MATCH` ของสัปดาห์นี้เป็น `status='announced'`, คำนวณผล (ถ้ายังไม่คำนวณ), อัปเดต `WINNER_STAT`
- **Feature ต้นทาง:** FE-31 | **Journey:** UJ-03 node I

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "matchesAnnounced": 14 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |
| 409 | ไม่มีคู่แข่งใดของสัปดาห์นี้ | NO_MATCHES | "ยังไม่มีคู่แข่งของสัปดาห์นี้ให้ประกาศผล" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ก่อนเรียก endpoint นี้ นักเรียน**ยังไม่เห็นผลแพ้-ชนะของตนเองเลย** (AC-FE-31-2) — สถานะ "คำนวณแล้วรอประกาศ" (`computed`) ต้องแยกจาก "ประกาศแล้ว" (`announced`) อย่างชัดเจนในระบบ ไม่ใช่ประกาศอัตโนมัติแม้คำนวณเสร็จแล้ว

---

### API-52 — เปิด/ปิดโหมดฉายผลในห้อง
- **Method / Path:** `PUT /api/v1/teacher/arena/current/broadcast-mode`
- **หน้าที่:** สลับโหมดแสดงผลแบบฉายในห้อง (Could — จังหวะอัปเดตแบบ real-time หรือ refresh เองยังไม่ตัดสิน)
- **Feature ต้นทาง:** FE-43 | **Journey:** UJ-03 node J/K

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | enabled | บูลีน | ใช่ | - |

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "enabled": true } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** endpoint นี้เป็นเพียง toggle สถานะ — กลไก push/real-time จริงยังเป็น Open Decision ของ architecture.md ข้อ 8 (ดู Gap)

---

### API-53 — สถิติผู้ชนะสะสมของทั้งห้อง
- **Method / Path:** `GET /api/v1/teacher/arena/winner-stats`
- **หน้าที่:** ดึง `WINNER_STAT` ทุกคน
- **Feature ต้นทาง:** FE-46 | **Journey:** UJ-03 node N

**Response สำเร็จ** — `200 OK`

```json
{ "data": [ { "studentId": "s-3001", "nickname": "น้องมิว", "winCount": 3 } ] }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ไม่มี field ใดเกี่ยวกับของรางวัลจริง/การจ่ายเงิน (AC-FE-46-2)

---

### API-54 — ดาว/สัญลักษณ์ของตนเอง
- **Method / Path:** `GET /api/v1/student/me/badges`
- **หน้าที่:** ดึงจำนวนดาวที่ได้จากการชนะ (มาจาก `WINNER_STAT` ของตนเอง)
- **Feature ต้นทาง:** FE-32 | **Journey:** UJ-01 node Q/R

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "starCount": 3 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** -

---

### API-55 — ตารางภาพรวมชั้นเรียน
- **Method / Path:** `GET /api/v1/teacher/overview`
- **หน้าที่:** รวมสถานะทำ/ไม่ทำ, คะแนนรายคน, เวลาเข้าใช้งานล่าสุด, สัญลักษณ์เตือน — รองรับเรียง/กรอง
- **Feature ต้นทาง:** FE-57, FE-58, FE-59, FE-60, FE-61, FE-62 | **Journey:** UJ-02 node X, UJ-03 node A0

**Request** (query) — `sort`, `filter` (ค่าที่รองรับยังไม่ล็อกครบ — ดู Gap; อย่างน้อยต้องมี `sort=totalScore:desc`, `filter=needsAttention`)

**Response สำเร็จ** — `200 OK`

```json
{
  "data": [
    {
      "studentId": "s-3001", "nickname": "น้องมิว", "lastActiveAt": "2026-08-13T08:00:00Z",
      "quizStatus": [ { "quizSetId": "q-01", "status": "done", "score": 18 } ],
      "warningBadge": "▲ ควรดูแล"
    }
  ],
  "meta": { "page": 1, "pageSize": 30, "total": 28, "inactiveOverThresholdCount": 1 }
}
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** **ห้ามมีแต้มสะสมรวม/แต้มที่ใช้ได้/ขั้นการเติบโต/ค่าสเตตัส/ชนิดสัตว์เลี้ยงของนักเรียนคนใดปรากฏใน response นี้เลย** (AC-FE-58-2, AC-FE-58-3); ตัวกรองที่ไม่มีใครตรงเงื่อนไขต้องคืน array ว่างพร้อม status 200 ปกติ ไม่ใช่ error (AC-FE-62-3); เกณฑ์ "ไม่เข้าใช้งานนาน" และชุดสัญลักษณ์เตือนยังไม่ล็อก (ดู Gap)

---

### API-56 — เริ่มงานส่งออก + เลือกข้อมูล
- **Method / Path:** `POST /api/v1/teacher/score-export/jobs`
- **หน้าที่:** สร้าง `SCORE_EXPORT_JOB(status='draft')` + `SCORE_EXPORT_JOB_ITEM`
- **Feature ต้นทาง:** FE-34, FE-63, FE-64, FE-65 | **Journey:** UJ-04 node A/B/C/D

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | dataScope | ข้อความสั้น (enum) | ใช่ | `per_quiz` \| `aggregate` (เลือกได้ทีละแบบ — AC-FE-65-2) |
| body | quizSetIds | รายการ (เฉพาะ per_quiz) | ใช่เมื่อ per_quiz | อย่างน้อย 1 ชุด (AC-FE-63-3) |

```json
{ "dataScope": "per_quiz", "quizSetIds": ["q-01", "q-03"] }
```

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "jobId": "job-01", "status": "draft" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | dataScope=per_quiz แต่ quizSetIds ว่าง | VALIDATION_ERROR | "กรุณาเลือกชุดแบบทดสอบที่จะส่งออกอย่างน้อย 1 ชุด" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ตัวเลือกข้อมูลมีเพียง `per_quiz`/`aggregate` **ไม่มีตัวเลือกแต้ม/ขั้นการเติบโต/ค่าสเตตัสให้เลือกเลย** (AC-FE-63-2)

---

### API-57 — เลือกช่องทางส่งออก
- **Method / Path:** `PUT /api/v1/teacher/score-export/jobs/{jobId}/channel`
- **หน้าที่:** ตั้ง `channel` + ปลายทาง (ลิงก์ชีท หรือ รูปแบบไฟล์)
- **Feature ต้นทาง:** FE-66, FE-67 | **Journey:** UJ-04 node E/F/G

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | channel | ข้อความสั้น (enum) | ใช่ | `google_sheets` \| `file_download` (เลือกได้ทีละแบบ — AC-FE-67-2) |
| body | destinationSheetLink | ข้อความยาว | ใช่เมื่อ google_sheets | - |
| body | fileFormat | ข้อความสั้น | ใช่เมื่อ file_download | ยังไม่ล็อกค่า enum ที่แน่นอน (ดู Gap) |

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "jobId": "job-01", "channel": "google_sheets" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | channel=google_sheets แต่ไม่ส่ง destinationSheetLink | VALIDATION_ERROR | "กรุณาวางลิงก์ Google Sheets ปลายทางก่อน" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** เลือก `file_download` แล้ว **ไม่มีขั้นตอนขอสิทธิ์ Google ใดๆ เกิดขึ้น** (AC-FE-67-2)

---

### API-58 — เลือกคอลัมน์ปลายทาง
- **Method / Path:** `PUT /api/v1/teacher/score-export/jobs/{jobId}/columns`
- **หน้าที่:** อัปเดต `destination_column` ของแต่ละ `SCORE_EXPORT_JOB_ITEM`
- **Feature ต้นทาง:** FE-68 | **Journey:** UJ-04 node H

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | mappings | รายการ `{ quizSetId, destinationColumn }` | ใช่ | ห้ามคอลัมน์ซ้ำกันภายในงานเดียว (AC-FE-68-2) |

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "jobId": "job-01", "mappings": [ { "quizSetId": "q-01", "destinationColumn": "C" } ] } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 409 | คอลัมน์ปลายทางซ้ำกันภายในงานเดียว | COLUMN_ALREADY_MAPPED | "คอลัมน์นี้ถูกเลือกไปแล้ว กรุณาเลือกคอลัมน์อื่น" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ไม่บังคับให้ครูจัดสมุดคะแนนใหม่ตามลำดับของระบบ (AC-FE-68-1) — ครูกำหนดคอลัมน์เองอิสระ

---

### API-59 — ตรวจสอบข้อมูลก่อนส่ง
- **Method / Path:** `POST /api/v1/teacher/score-export/jobs/{jobId}/validate`
- **หน้าที่:** จับคู่รหัสประจำตัวกับปลายทาง, สร้างรายงาน `SCORE_EXPORT_SKIPPED_ROW`, เปลี่ยน `status='validated'`
- **Feature ต้นทาง:** FE-69, FE-70 | **Journey:** UJ-04 node I/J

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "matchedStudentCount": 13, "skippedRows": [ { "sourceRowReference": "5001", "reason": "ไม่พบรหัสนี้ในระบบ" } ] } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 409 | ยังไม่ได้เลือก channel/columns ให้ครบก่อน | INCOMPLETE_JOB | "กรุณาเลือกช่องทางและคอลัมน์ปลายทางให้ครบก่อนตรวจสอบ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** จับคู่ด้วย**รหัสประจำตัวเท่านั้น** ไม่ใช้ชื่อหรือลำดับแถว (AC-FE-69-2); ยังไม่มีการเขียนข้อมูลจริงเกิดขึ้นในขั้นนี้ (เป็นแค่ dry-run)

---

### API-60 — ยืนยันส่งคะแนนจริง
- **Method / Path:** `POST /api/v1/teacher/score-export/jobs/{jobId}/confirm`
- **หน้าที่:** เขียนข้อมูลจริงไปยัง Google Sheets (ผ่าน CMP-14) หรือเตรียมไฟล์ให้ดาวน์โหลด แล้วตั้ง `status='completed'`
- **Feature ต้นทาง:** FE-66, FE-71 | **Journey:** UJ-04 node K/L/M

**Request:** ไม่มี body

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "jobId": "job-01", "status": "completed" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 409 | `status` ไม่ใช่ `validated` | NOT_VALIDATED_YET | "กรุณาตรวจสอบข้อมูลก่อนส่งก่อนกดยืนยัน" |
| 502 | Google Sheets (CMP-19) เขียนไม่สำเร็จระหว่างทาง | UPSTREAM_WRITE_FAILED | "ส่งคะแนนไม่สำเร็จบางส่วน กรุณาตรวจสอบและลองใหม่" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ปุ่มนี้ (จาก client) ต้องถูก disable จนกว่า `status='validated'` (AC-FE-71-1, AC-FE-71-3) — **ก่อนเรียก endpoint นี้ต้องไม่มีการเขียนอะไรเลย** (AC-FE-71-2); แถวที่อยู่ใน `SCORE_EXPORT_SKIPPED_ROW` ต้องไม่ถูกเขียนทับ (AC-FE-70-2); นโยบายกรณีส่งซ้ำรอบสองยังไม่ล็อก (ดู Gap)

---

### API-61 — ดาวน์โหลดไฟล์คะแนน
- **Method / Path:** `GET /api/v1/teacher/score-export/jobs/{jobId}/download`
- **หน้าที่:** สร้างไฟล์คะแนนผ่าน CMP-15 → Object Storage แล้วคืนลิงก์ดาวน์โหลด (เฉพาะ `channel='file_download'` และ `status='completed'`)
- **Feature ต้นทาง:** FE-67 | **Journey:** UJ-04 node G/N

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "downloadUrl": "https://.../export/job-01.csv", "fileFormat": "csv" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 404 | jobId ไม่พบ หรือ `channel != 'file_download'` | NOT_FOUND | "ไม่พบไฟล์คะแนนนี้" |
| 409 | `status != 'completed'` | NOT_READY | "ยังไม่พร้อมให้ดาวน์โหลด กรุณายืนยันส่งก่อน" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ไฟล์ที่สร้างไม่มีชื่อจริง/แต้ม/ขั้นการเติบโตปนอยู่เลย (เหตุผลเดียวกับ AC-FE-64-2)

---

### API-62 — สถานะการดูแลสัตว์เลี้ยงวันนี้
- **Method / Path:** `GET /api/v1/student/me/pet/care-status`
- **หน้าที่:** อ่าน `PET_CARE_STATE` (ENT-27) ของ `PET` ที่ active อยู่ของตนเอง คืน "โควตาหาแต้มต่อวัน" ที่ใช้ไปแล้ว + เพดาน และ "ยอดสะสมรวม" — **ห้ามคืนค่า `hunger_today` ดิบ** (เป็นค่าซ่อนล้วนๆ ตามสเปก FE-82 ไม่ต้องส่งให้ client เห็นตัวเลขจริง)
- **Feature ต้นทาง:** FE-82, FE-83 | **Journey:** UJ-01 node PC1/PC2
- **สิทธิ์ที่ต้องมี:** session นักเรียน, ดูได้เฉพาะของตนเองเท่านั้น (pet_id derive จาก session ไม่รับเป็น query param)

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "dailyQuotaUsed": 4, "dailyQuotaCap": 10, "totalBonding": 27 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |
| 404 | ไม่มี `PET` ที่ active อยู่ (ยังไม่เคยซื้อไข่) | NO_ACTIVE_PET | "ยังไม่มีสัตว์เลี้ยง — ไปซื้อไข่ตัวแรกกันเถอะ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ก่อนอ่านค่าต้องรัน lazy reset ตามกฎของ `PET_CARE_STATE` (database-schema.md ENT-27) ก่อนเสมอ — ถ้า `last_recorded_date` ไม่ใช่วันนี้ ให้ตั้ง `hunger_today=0`, `daily_bonding_quota_used=0` (ไม่แตะ `total_bonding_score`) แล้วอัปเดต `last_recorded_date` ก่อนค่อยคืนค่า `dailyQuotaUsed`/`totalBonding` (ตรงกับ AC-FE-83-4 ซึ่งเช็คผลตอน "เปิดหน้าสัตว์เลี้ยงของฉัน" ไม่ใช่แค่ตอนกด action); `dailyQuotaCap` คืนค่าคงที่ 10 เสมอเพื่อให้ client ไม่ต้อง hardcode เพดานเอง

---

### API-63 — ทำ action ดูแลสัตว์เลี้ยง
- **Method / Path:** `POST /api/v1/student/me/pet/care-actions`
- **หน้าที่:** บันทึกผลของการกด action ดูแลสัตว์เลี้ยง 1 ครั้งลง `PET_CARE_STATE` (ENT-27) ของ `PET` ที่ active อยู่ของตนเอง ตามกฎความหิว (เฉพาะ `feed`) และเพดานรวม 10 หน่วย/วัน
- **Feature ต้นทาง:** FE-82, FE-83 | **Journey:** UJ-01 node PC1/PC2
- **สิทธิ์ที่ต้องมี:** session นักเรียน, กระทำได้เฉพาะกับ `PET` ที่ active ของตนเองเท่านั้น (pet_id derive จาก session เช่นเดียวกับ API-34/API-37/API-38 ไม่รับ `petId` ใน request)

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | actionType | ข้อความสั้น (enum) | ใช่ | ต้องเป็น 1 ใน `feed`(ให้อาหาร), `bathe`(อาบน้ำ), `pat`(ลูบหัว), `play`(เล่น/ออกกำลังกาย) — ตรงกับ 4 action ที่ล็อกไว้ในสเปก ห้ามขยายเพิ่มเอง |

```json
{ "actionType": "feed" }
```

**Response สำเร็จ — นับผลปกติ (ยังไม่ติดเพดานใดๆ)** — `200 OK`

```json
{ "data": { "actionType": "feed", "resultStatus": "counted", "dailyQuotaUsed": 4, "totalBonding": 27, "message": null } }
```

**Response สำเร็จ — `actionType=feed` แต่ความหิวเต็มแล้ว (ครั้งที่ 4+ ของวัน)** — `200 OK` (ไม่ error เพราะเป็นพฤติกรรมปกติที่ระบบยอมรับ ปุ่มยังกดได้ตามปกติ)

```json
{ "data": { "actionType": "feed", "resultStatus": "already_full", "dailyQuotaUsed": 3, "totalBonding": 27, "message": "ตัวละครอิ่มแล้ว" } }
```

**Response สำเร็จ — ถึงเพดานรวม 10/วันแล้ว (ทุก action)** — `200 OK` (ไม่ error เช่นกัน ปุ่มยังกดได้ตามปกติ)

```json
{ "data": { "actionType": "bathe", "resultStatus": "daily_cap_reached", "dailyQuotaUsed": 10, "totalBonding": 30, "message": "วันนี้ดูแลเต็มที่แล้ว พรุ่งนี้ค่อยมาใหม่นะ" } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | ไม่ส่ง `actionType` หรือค่าไม่ตรงกับ 4 ค่าที่กำหนด | VALIDATION_ERROR | "กรุณาเลือก action ดูแลสัตว์เลี้ยงที่ถูกต้อง" |
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |
| 404 | ไม่มี `PET` ที่ active อยู่ (ยังไม่เคยซื้อไข่) | NO_ACTIVE_PET | "ยังไม่มีสัตว์เลี้ยง — ไปซื้อไข่ตัวแรกกันเถอะ" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:**
  1. ก่อนประมวลผลทุกครั้งต้องรัน lazy reset ของ `PET_CARE_STATE` ก่อนเสมอ (เทียบ `last_recorded_date` กับวันนี้ — เหมือน API-62)
  2. ลำดับการตรวจสำหรับ `actionType=feed`: ตรวจ `hunger_today < 3` ก่อน — ถ้าเต็มแล้ว (`hunger_today = 3`) คืน `resultStatus="already_full"` ทันที **ไม่แตะ `hunger_today`, `daily_bonding_quota_used`, `total_bonding_score` เลย** (AC-FE-82-2); ถ้ายังไม่เต็ม ให้ `hunger_today += 1` แล้วไปเช็คเพดานรวมต่อในข้อ 3 (AC-FE-82-1)
  3. สำหรับ `bathe`/`pat`/`play` (ไม่มีเพดานของตัวเอง — AC-FE-82-3) และกรณี `feed` ที่ผ่านข้อ 2 มาแล้ว: ตรวจ `daily_bonding_quota_used < 10` — ถ้าเต็มแล้ว (`= 10`) คืน `resultStatus="daily_cap_reached"` โดย**ไม่เพิ่ม** `daily_bonding_quota_used`/`total_bonding_score` อีก (AC-FE-83-3); ถ้ายังไม่เต็ม ให้ `daily_bonding_quota_used += 1` และ `total_bonding_score += 1` แล้วคืน `resultStatus="counted"` (AC-FE-83-1/83-2, ทดสอบขอบที่ 9→10)
  4. Action ทั้ง 4 แบบ**ไม่มีผลใดๆ ต่อ `POINTS_ACCOUNT`/`available_points` (FE-23) และไม่มีผลใดๆ ต่อ `PET_STAT`/ค่าสเตตัสต่อสู้ (FE-77) ไม่ว่ากรณีใด** — endpoint นี้ต้องไม่ query หรือแก้ไข 2 entity ดังกล่าวเลย (AC-FE-82-4, AC-FE-82-5)
  5. `message` เป็น `null` เมื่อ `resultStatus="counted"` (ไม่ต้องมี feedback พิเศษ) และเป็นข้อความภาษาไทยตามสเปกเป๊ะเมื่อ `resultStatus` เป็น `already_full`/`daily_cap_reached` เพื่อให้ client แสดง feedback ได้ทุกครั้งที่กด (ห้ามกดเงียบๆ ตามสเปก)

---

### API-64 — สร้างทัวนาเมนต์
- **Method / Path:** `POST /api/v1/teacher/tournaments`
- **หน้าที่:** ครูเลือกนักเรียนตั้งแต่ 2 คนขึ้นไป ระบบดึงสัตว์เลี้ยงจริงของแต่ละคนมาบันทึกเป็น snapshot ณ ตอนนี้ สุ่มจับคู่ + สุ่มคนได้บาย (seed = รหัสทัวนาเมนต์) แล้วสร้างผังทุกรอบจนถึงรอบชิง — ตั้ง `announcedRound = 0` และทุกคู่ `fought=false`, คู่ปกติ `winnerSlot=null` (คู่บายมี `winnerSlot=slotA` และคนได้บายถูกเติมลงช่องรอบถัดไปทันที)
- **Feature ต้นทาง:** FE-31 (ผูกไปก่อน — spec 08 ซ. ยังไม่มี FE ของตัวเอง ดู G-API-14) | **Journey:** UJ-03
- **สิทธิ์ที่ต้องมี:** session ครูเท่านั้น

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | studentIds | รายการรหัสอ้างอิง | ใช่ | จำนวน **>= 2** คน, ไม่ซ้ำกัน, แต่ละคนต้องมีสัตว์เลี้ยงที่ active อยู่ (นักเรียนที่ยังไม่มีสัตว์เลี้ยงเลือกไม่ได้) |

```json
{ "studentIds": ["s-3001", "s-3002", "s-3003", "s-3004", "s-3005", "s-3006"] }
```

**Response สำเร็จ** — `201 Created`

```json
{ "data": { "id": "T9xKq2", "participantCount": 6, "roundCount": 3, "finalKey": "r3m1", "byeCount": 2, "announcedRound": 0 } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | `studentIds` น้อยกว่า 2 คน, ไม่ใช่รายการ หรือมีรหัสซ้ำ | VALIDATION_ERROR | "กรุณาเลือกนักเรียนอย่างน้อย 2 คน และเลือกแต่ละคนได้ครั้งเดียว" |
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |
| 403 | session ไม่ใช่ครู (เช่นนักเรียนเรียก) | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |
| 404 | มีรหัสนักเรียนที่ไม่พบในระบบ | STUDENT_NOT_FOUND | "ไม่พบนักเรียนที่เลือกบางคน กรุณาโหลดรายชื่อใหม่" |
| 409 | มีนักเรียนที่ยังไม่มีสัตว์เลี้ยง | STUDENT_HAS_NO_PET | "มีนักเรียนที่ยังไม่มีสัตว์เลี้ยง เลือกเข้าทัวนาเมนต์ไม่ได้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** จำนวนรอบ = ceil(log2(จำนวนผู้เข้าแข่ง)) (เช่น 6 คน = 3 รอบ บาย 2 คน — spec 08 ซ.) · ผลจับคู่บันทึกตั้งแต่สร้าง เปิดดูซ้ำไม่เปลี่ยน · **ไม่มีผู้ชนะของคู่ปกติ/การเลื่อนจากคู่ปกติถูกเขียนตอนสร้าง — แต่คู่บายมี `winnerSlot` และคนได้บายถูกเติมลงช่องรอบถัดไปตั้งแต่ตอนสร้าง** (ผู้ใช้ตัดสิน 2026-11-17: บายไม่ใช่ผลการต่อสู้, G-DB-15) · ค่าสเตตัสบันทึกตาม ณ ตอนสร้าง (AC ของ spec 08 ข้อ ข.)

---

### API-65 — รายการทัวนาเมนต์
- **Method / Path:** `GET /api/v1/tournaments`
- **หน้าที่:** รายการทัวนาเมนต์ใหม่สุดก่อน ใช้กับหน้าหลัก (การ์ดทัวนาเมนต์ล่าสุด) และกระดานเกียรติยศ (แชมป์รายสัปดาห์)
- **Feature ต้นทาง:** FE-31 | **Journey:** UJ-03
- **สิทธิ์ที่ต้องมี:** session นักเรียนหรือครู

**Request** — query `page`, `pageSize` ตามข้อ 1.2

**Response สำเร็จ** — `200 OK`

```json
{
  "data": [
    { "id": "T9xKq2", "createdAt": "2026-11-17T01:00:00Z", "createdByTeacherName": "ครูมายด์", "participantCount": 6, "roundCount": 3, "announcedRound": 2, "championName": null, "legacy": false }
  ],
  "meta": { "page": 1, "pageSize": 30, "total": 1 }
}
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | `page`/`pageSize` ไม่ใช่จำนวนเต็มบวก | VALIDATION_ERROR | "ค่าการแบ่งหน้าไม่ถูกต้อง" |
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** `championName` เป็น **null จนกว่า `announcedRound = roundCount`** (หรือ `legacy: true`) — ทั้งนักเรียนและครูได้ค่าเดียวกัน (AC-FE-31-15, 31-17, 31-18) · แชมป์คือผู้ชนะของ `finalKey` ซึ่งยังไม่ถูกเขียนก่อนประกาศรอบชิง จึงไม่รั่วแม้ฝั่ง client อ่านเอกสารตรง · ไม่มีรายการ/ผู้ชนะของคู่ใดของรอบที่ยังไม่ประกาศใน response นี้

---

### API-66 — อ่านผังทัวนาเมนต์ (ตอบตามบทบาท)
- **Method / Path:** `GET /api/v1/tournaments/{tournamentId}`
- **หน้าที่:** ผังทุกรอบ ทุกคู่ พร้อมสถานะ — เนื้อหาต่างกันตามบทบาทผู้เรียก (ดูตาราง "ซ่อนตามบทบาท")
- **Feature ต้นทาง:** FE-31, FE-43 | **Journey:** UJ-03
- **สิทธิ์ที่ต้องมี:** session นักเรียนหรือครู (นักเรียนทุกคน ทั้งที่ลงแข่งและไม่ลง ได้ข้อมูลชุดเดียวกัน)

**Response สำเร็จ** — `200 OK` (ตัวอย่างฝั่งนักเรียน: 6 คน, ประกาศรอบ 1 แล้ว, ต่อสู้รอบ 2 ไปแล้ว 1 คู่ ยังไม่ประกาศรอบ 2)

```json
{
  "data": {
    "id": "T9xKq2", "participantCount": 6, "roundCount": 3, "finalKey": "r3m1",
    "announcedRound": 1, "champion": null, "legacy": false,
    "rounds": [
      { "round": 1, "announced": true, "matches": [
        { "key": "r1m1", "slotA": { "studentUid": "s-3001", "studentName": "น้องมิว", "speciesKey": "pixie", "stage": 4 }, "slotB": { "studentUid": "s-3002", "studentName": "น้องฟ้า", "speciesKey": "pixie", "stage": 4 }, "bye": false, "fought": true, "status": "announced", "winnerSlot": "slotA", "replayAvailable": true },
        { "key": "r1m2", "slotA": { "studentUid": "s-3003", "studentName": "น้องบิว", "speciesKey": "pixie", "stage": 4 }, "slotB": null, "bye": true, "fought": false, "status": "bye", "winnerSlot": "slotA", "replayAvailable": false }
      ] },
      { "round": 2, "announced": false, "matches": [
        { "key": "r2m1", "slotA": { "studentUid": "s-3001", "studentName": "น้องมิว", "speciesKey": "pixie", "stage": 4 }, "slotB": { "studentUid": "s-3003", "studentName": "น้องบิว", "speciesKey": "pixie", "stage": 4 }, "bye": false, "fought": true, "status": "waiting_announce", "winnerSlot": null, "replayAvailable": false }
      ] },
      { "round": 3, "announced": false, "matches": [
        { "key": "r3m1", "slotA": null, "slotB": null, "bye": false, "fought": false, "status": "waiting_fight", "winnerSlot": null, "replayAvailable": false }
      ] }
    ]
  }
}
```

**ซ่อนตามบทบาท (ซ่อนที่ข้อมูล ไม่ใช่ส่งมาแล้วให้ client ปิด)**

| Field | นักเรียน | ครู |
|---|---|---|
| `winnerSlot` ของคู่ปกติในรอบที่ `round > announcedRound` (คู่บายมีค่า `slotA` เสมอ) | **ไม่มีค่า (null เสมอ)** — ไม่เคยถูกเขียนลงเอกสารสาธารณะ (AC-FE-31-4) | **null เสมอเช่นกัน** — ผังของครูไม่เฉลยผู้ชนะก่อนประกาศ (AC-FE-43-2) |
| `slotA`/`slotB` ของรอบ ≥ 2 ที่ยังไม่ประกาศรอบก่อนหน้า (ยกเว้นช่องที่มาจากคู่บาย ซึ่งมีชื่อคนได้บายตั้งแต่สร้าง) | null (AC-FE-31-4) | null (AC-FE-43-2) |
| `champion` | null จนกว่า `announcedRound = roundCount` (AC-FE-31-15) | เช่นเดียวกัน |
| `status = waiting_announce` + `fought` | เห็น (ใช้แสดง "รอครูประกาศผล" — AC-FE-31-3) | เห็น |
| ผลลับ (ENT-30), battle log, `needsTeacherDecision`, `canFight`, `announceableRound` | **ไม่มี field เหล่านี้ใน response เลย** (ไม่ใช่ `false`) — ไม่มีปุ่มประกาศผลใน DOM (AC-FE-31-7) | `needsTeacherDecision` (คู่เสมอรอชี้ขาด) และ `canFight` ต่อคู่, `announceableRound` (เลขรอบที่กดประกาศได้ตอนนี้ หรือ null) |
| `stats` ของผู้เข้าแข่งในผัง | ไม่ส่ง | ไม่ส่ง (ผังไม่ต้องใช้ — ดู G-API-18) |

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |
| 404 | ไม่พบทัวนาเมนต์ (รวมกรณีถูกลบแล้ว) | TOURNAMENT_NOT_FOUND | "ไม่พบทัวนาเมนต์นี้" |
| 422 | เอกสารรุ่นเก่า 4 คนตายตัว (ไม่มีผังแบบ `matches`) | TOURNAMENT_LEGACY_FORMAT | "ทัวนาเมนต์นี้สร้างด้วยระบบรุ่นเก่า เปิดผังในระบบใหม่ไม่ได้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** `status` derive จาก `bye`, `fought`, `round` เทียบ `announcedRound` (`waiting_fight` / `waiting_announce` / `announced` / `bye`) ตามตาราง enum ของ database-schema · **ไม่มีการเปิดเผยตามเวลา** — เวลาผ่านไปข้ามคืนผลก็ยังไม่ปรากฏจนกว่าครูกด API-69 (AC-FE-31-19) · หลังประกาศรอบ N: ผู้ชนะทุกคู่ของรอบ N ปรากฏ และช่องรอบ N+1 มีชื่อผู้เข้ารอบ (AC-FE-31-10, 31-12) · ทัวนาเมนต์เก่าตอบ `announced: true` ทุกรอบ

---

### API-67 — ต่อสู้คู่
- **Method / Path:** `POST /api/v1/teacher/tournaments/{tournamentId}/matches/{matchKey}/fight`
- **หน้าที่:** คำนวณผลคู่นี้ด้วย engine จริง (ง.๓ ของ spec 02, seed จาก `matchId`) แล้วเก็บ battle log (ENT-31, ใส่ `round`) + ผลลับ (ENT-30) + ตั้ง `fought=true` — **ไม่เขียน `winnerSlot` และไม่เลื่อนผู้ชนะ** ("ประลองแล้วเงียบ")
- **Feature ต้นทาง:** FE-31 | **Journey:** UJ-03
- **สิทธิ์ที่ต้องมี:** session ครูเท่านั้น

**Request** — ไม่มี body

**Response สำเร็จ** — `200 OK` (**ไม่มีผู้ชนะใน response** — ครูอาจฉายจอค้างอยู่)

```json
{ "data": { "matchKey": "r1m1", "matchId": "T9xKq2-r1m1", "fought": true, "status": "waiting_announce", "needsTeacherDecision": false, "roundReadyToAnnounce": false } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |
| 403 | session ไม่ใช่ครู (นักเรียนเรียก — ต่อสู้ไม่ได้) | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |
| 404 | ไม่พบทัวนาเมนต์ หรือไม่พบ `matchKey` ในผัง | TOURNAMENT_NOT_FOUND / MATCH_NOT_FOUND | "ไม่พบทัวนาเมนต์หรือคู่นี้" |
| 409 | คู่นี้ต่อสู้ไปแล้ว (`fought = true`) | MATCH_ALREADY_FOUGHT | "คู่นี้ต่อสู้ไปแล้ว" |
| 409 | **ต่อสู้รอบ N+1 ก่อนประกาศรอบ N** — คู่อยู่รอบ `R` และ `announcedRound < R − 1` | ROUND_NOT_UNLOCKED | "ต้องประกาศผลรอบก่อนหน้าก่อน จึงจะต่อสู้รอบนี้ได้" |
| 409 | คู่ได้บาย (`bye = true`) | MATCH_IS_BYE | "คู่นี้ได้บาย ไม่ต้องต่อสู้" |
| 409 | ฝั่งใดฝั่งหนึ่งยังว่าง (`slotA`/`slotB` เป็น null) | MATCH_NOT_READY | "คู่นี้ยังไม่พร้อม ต้องรอผลของรอบก่อนหน้าให้ครบทั้งสองฝั่ง" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ต่อสู้คู่รอบ `R` ได้เมื่อ **`announcedRound >= R − 1`** (รอบ 1 ต่อสู้ได้เสมอ; รอบ N+1 ต้อง `announcedRound >= N`) — ไม่ล็อกตามเวลา ประกาศแล้วกดต่อสู้รอบถัดไปได้ทันที (AC-FE-31-13, 31-14) · ลำดับตรวจ 409: `MATCH_IS_BYE` → `MATCH_ALREADY_FOUGHT` → `ROUND_NOT_UNLOCKED` → `MATCH_NOT_READY` · เขียน 3 เอกสาร (log, ผลลับ, `fought`) ใน transaction เดียว · ผลเสมอจริง → `needsTeacherDecision: true` (ใช้ API-68) · `roundReadyToAnnounce` = ทุกคู่ของรอบนี้ต่อสู้ครบและไม่มีคู่เสมอค้าง (ใช้ขึ้นปุ่มประกาศ — AC-FE-31-9) · ทัวนาเมนต์เก่า: ดู G-API-17

---

### API-68 — ครูเลือกผู้ชนะกรณีเสมอจริง
- **Method / Path:** `POST /api/v1/teacher/tournaments/{tournamentId}/matches/{matchKey}/decide-winner`
- **หน้าที่:** ใช้เมื่อคู่ที่ต่อสู้แล้วมีผลเสมอจริง (ครบ 30 เทิร์น เลือด % เท่ากันเป๊ะ) — บันทึกผู้ชนะที่ครูเลือกลงผลลับ **ยังไม่เปิดเผยจนกว่าจะประกาศรอบ** (มีอยู่ในโค้ดเดิมคือ `window.ครูเลือกผู้ชนะ` แต่เดิมเขียนลงเอกสารสาธารณะทันที — ต้องเปลี่ยนจังหวะ)
- **Feature ต้นทาง:** FE-31 | **Journey:** UJ-03
- **สิทธิ์ที่ต้องมี:** session ครูเท่านั้น

**Request**

| ส่วน | ชื่อ | ชนิด | บังคับ | กฎตรวจสอบ |
|---|---|---|---|---|
| body | winnerSlot | ข้อความสั้น (enum) | ใช่ | `slotA` หรือ `slotB` เท่านั้น |

```json
{ "winnerSlot": "slotB" }
```

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "matchKey": "r1m1", "needsTeacherDecision": false, "roundReadyToAnnounce": true } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | `winnerSlot` ไม่ใช่ `slotA`/`slotB` | VALIDATION_ERROR | "กรุณาเลือกผู้ชนะจากสองฝ่ายของคู่นี้" |
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |
| 403 | session ไม่ใช่ครู | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |
| 404 | ไม่พบทัวนาเมนต์หรือคู่ | TOURNAMENT_NOT_FOUND / MATCH_NOT_FOUND | "ไม่พบทัวนาเมนต์หรือคู่นี้" |
| 409 | คู่ยังไม่ได้ต่อสู้ | MATCH_NOT_FOUGHT | "คู่นี้ยังไม่ได้ต่อสู้ ชี้ขาดไม่ได้" |
| 409 | คู่นี้มีผู้ชนะจากการคำนวณแล้ว (ไม่ใช่เสมอ) | MATCH_NOT_A_TIE | "คู่นี้มีผู้ชนะจากการคำนวณแล้ว ครูเลือกผู้ชนะเองไม่ได้" |
| 409 | ครูชี้ขาดไปแล้ว (แก้ซ้ำไม่ได้) | WINNER_ALREADY_DECIDED | "คู่นี้ชี้ขาดไปแล้ว แก้ซ้ำไม่ได้" |
| 409 | รอบของคู่ประกาศไปแล้ว (`round <= announcedRound`) | ROUND_ALREADY_ANNOUNCED | "รอบนี้ประกาศผลไปแล้ว" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ไม่ใช้การสุ่มตัดสิน (spec 08 จ.) · Response ไม่มีผู้ชนะ (ครูรู้อยู่แล้วจากที่เลือก และผังยังต้องไม่เฉลย — AC-FE-43-2) · ทัวนาเมนต์เก่า: ดู G-API-17

---

### API-69 — ประกาศผลรอบ
- **Method / Path:** `POST /api/v1/teacher/tournaments/{tournamentId}/rounds/{round}/announce`
- **หน้าที่:** เปิดเผยผลของ **ทุกคู่ในรอบ `round` พร้อมกัน** — คัดลอกผู้ชนะจากผลลับ (ENT-30) ไปเอกสารสาธารณะ (`winnerSlot`, `decidedByTeacher`) + เลื่อนผู้ชนะของคู่ปกติเข้าช่องรอบ `round+1` (คนได้บายถูกเติมไปแล้วตั้งแต่ตอนสร้าง) + ตั้ง `announcedRound = round` ใน transaction เดียว (ลำดับตาม database-schema 3.1 (จ)) · **ประกาศแล้วยกเลิก/ซ่อนกลับไม่ได้** ไม่มี endpoint ย้อน
- **Feature ต้นทาง:** FE-31 | **Journey:** UJ-03
- **สิทธิ์ที่ต้องมี:** session ครูเท่านั้น (ระบบไม่ประกาศเองตามเวลา — AC-FE-31-19)

**Request** — path `round` (จำนวนเต็ม 1…`roundCount`), ไม่มี body · **หน้าต่างยืนยัน "ประกาศแล้วยกเลิกไม่ได้" เป็นหน้าที่ฝั่ง client**

**Response สำเร็จ** — `200 OK` (ตัวอย่าง: ประกาศรอบ 1 ของทัวนาเมนต์ 6 คน)

```json
{
  "data": {
    "tournamentId": "T9xKq2", "announcedRound": 1, "roundCount": 3, "championDecided": false,
    "announcedMatches": [
      { "key": "r1m1", "winnerSlot": "slotA", "decidedByTeacher": false },
      { "key": "r1m2", "winnerSlot": "slotA", "decidedByTeacher": null }
    ]
  }
}
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 400 | `round` ไม่ใช่จำนวนเต็ม หรือนอกช่วง 1…`roundCount` | VALIDATION_ERROR | "เลขรอบไม่ถูกต้อง" |
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |
| 403 | session ไม่ใช่ครู (นักเรียนเรียก — ประกาศไม่ได้) | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |
| 404 | ไม่พบทัวนาเมนต์ | TOURNAMENT_NOT_FOUND | "ไม่พบทัวนาเมนต์นี้" |
| 409 | **ประกาศรอบที่ประกาศไปแล้ว** (`round <= announcedRound` รวมทัวนาเมนต์เก่า/กดซ้ำสองครั้ง) | ROUND_ALREADY_ANNOUNCED | "รอบนี้ประกาศผลไปแล้ว" |
| 409 | **ประกาศข้ามรอบ** (`round > announcedRound + 1`) | ROUND_SKIPPED | "ต้องประกาศผลรอบก่อนหน้าก่อน" |
| 409 | **ประกาศรอบที่ยังสู้ไม่ครบ** — มีคู่ปกติในรอบ `round` ที่ `fought = false` | ROUND_NOT_FULLY_FOUGHT | "ยังมีคู่ในรอบนี้ที่ยังไม่ได้ต่อสู้ ต่อสู้ให้ครบก่อนประกาศผล" |
| 409 | มีคู่เสมอที่ครูยังไม่ชี้ขาด (พฤติกรรมชั่วคราว — ดู G-API-16 ข) | TIE_NOT_DECIDED | "ยังมีคู่เสมอที่ต้องเลือกผู้ชนะก่อนประกาศผล" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:**
  0. ในตัวอย่างข้างบน `r1m2` เป็นคู่บาย — `winnerSlot` ถูกตั้งไว้แล้วตั้งแต่ตอนสร้าง (ไม่ใช่ผลที่เพิ่งเปิดเผย) แต่แสดงรวมใน `announcedMatches` เพื่อให้ครบทุกคู่ของรอบ
  1. ประกาศรอบ N ได้เมื่อ **`announcedRound == N − 1`** (นั่นคือ `round == announcedRound + 1` พอดี) **และ** ทุกคู่ปกติของรอบ N `fought = true` พร้อมมีผู้ชนะแน่ชัด — คู่บายนับว่าผ่าน (AC-FE-31-8 ต่อสู้ไม่ครบ 1 จาก 2 คู่ → ปฏิเสธ; AC-FE-31-9 ครบพอดี → ผ่าน)
  2. ลำดับตรวจ 409: `ROUND_ALREADY_ANNOUNCED` → `ROUND_SKIPPED` → `ROUND_NOT_FULLY_FOUGHT` → `TIE_NOT_DECIDED`
  3. เมื่อสำเร็จ: นักเรียนเห็นผู้ชนะทุกคู่ของรอบ N, เปิดรีเพลย์ได้ (API-70), ช่องรอบ N+1 มีชื่อผู้เข้ารอบ (AC-FE-31-10/11/12) · เมื่อ `round == roundCount`: `championDecided = true` และแชมป์ปรากฏบนผัง/รายการ (API-65, 66) → กระดานเกียรติยศและหน้าหลักแสดงแชมป์ (AC-FE-31-16/17/18)
  4. การประกาศรอบ N ไม่ทำให้ต่อสู้ได้เกินรอบ N+1 (รอบ N+2 ต้องรอประกาศรอบ N+1)
  5. **ต้อง atomic** — ถ้ากดซ้ำ 2 ครั้งพร้อมกัน ครั้งที่สองต้องเห็น `announcedRound` ใหม่แล้วตอบ 409 `ROUND_ALREADY_ANNOUNCED` (ไม่เลื่อนผู้ชนะซ้ำ)
  6. คะแนน "คะแนนสูงสุด" บนกระดานเกียรติยศ (จากแบบทดสอบ) ไม่เกี่ยวข้อง ไม่ถูกแตะ (spec 08 ฌ.8)

---

### API-70 — อ่านรีเพลย์ (battle log) ของคู่
- **Method / Path:** `GET /api/v1/tournaments/{tournamentId}/matches/{matchKey}/replay`
- **หน้าที่:** คืน battle log ของคู่ให้เล่นรีเพลย์โดยไม่คำนวณใหม่
- **Feature ต้นทาง:** FE-31, FE-43 | **Journey:** UJ-03
- **สิทธิ์ที่ต้องมี:** **ครู: ได้เสมอ** (แม้รอบยังไม่ประกาศ — เพื่อฉายในคาบโฮมรูม, AC-FE-43-1) · **นักเรียน: ได้เมื่อรอบของคู่ประกาศแล้วเท่านั้น** (`round <= announcedRound` หรือทัวนาเมนต์เก่า) ไม่ว่าจะเป็นคู่ของตัวเองหรือไม่

**Response สำเร็จ** — `200 OK`

```json
{
  "data": {
    "matchId": "T9xKq2-r1m1", "matchKey": "r1m1", "round": 1,
    "engineVersion": "…", "seed": 123456789, "computedAt": "2026-11-17T01:30:00Z",
    "sideA": { "…": "…" }, "sideB": { "…": "…" },
    "result": { "winner": "A", "reason": "ko", "turns": 14 },
    "events": [ { "seq": 1, "turn": 1, "type": "…", "payload": { } } ],
    "teacherDecidedWinnerSlot": null
  }
}
```

(`sideA`/`sideB`/`events` ตามรูปที่ `js/combat-engine.js` สร้าง — ไม่กำหนดซ้ำในเอกสารนี้ ชุด event เป็น Open Question ของ spec 08)

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |
| 403 | **นักเรียนขอรีเพลย์ของรอบที่ยังไม่ประกาศ** (`round > announcedRound`) | ROUND_NOT_ANNOUNCED | "รอครูประกาศผลก่อน จึงจะดูรีเพลย์ได้" |
| 404 | ไม่พบทัวนาเมนต์/คู่ หรือคู่นี้ยังไม่ได้ต่อสู้/เป็นคู่บาย (ไม่มี battle log) | MATCH_NOT_FOUND | "ไม่พบรีเพลย์ของคู่นี้" |
| 422 | เอกสารรุ่นเก่า 4 คนตายตัว | TOURNAMENT_LEGACY_FORMAT | "ทัวนาเมนต์นี้สร้างด้วยระบบรุ่นเก่า เปิดไม่ได้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ลำดับตรวจฝั่งนักเรียน: ไม่พบทัวนาเมนต์ → 404, **รอบยังไม่ประกาศ → 403 ก่อนเสมอ** (แม้คู่ยังไม่ได้ต่อสู้ — ไม่บอกรายละเอียดเพิ่ม), แล้วจึง 404 ถ้าไม่มี log · ใน log มีผู้ชนะ (`result.winner`, event `match_end`) จึงต้องปิดที่ **rules ของฐานข้อมูลด้วย** ไม่ใช่แค่ตรวจที่ endpoint (AC-FE-31-6: นักเรียนอ่านตรงได้ `permission-denied`) · `teacherDecidedWinnerSlot` มีค่าเฉพาะคู่ที่ครูชี้ขาด และส่งให้นักเรียนเมื่อรอบประกาศแล้วเท่านั้น (ครูได้เสมอ) · การเปิดรีเพลย์ของครูไม่เปลี่ยนสถานะรอบ (ยัง "ยังไม่ประกาศ" — AC-FE-43-1)

---

### API-71 — ลบทัวนาเมนต์
- **Method / Path:** `DELETE /api/v1/teacher/tournaments/{tournamentId}`
- **หน้าที่:** ลบทัวนาเมนต์ถาวร: ผล, ผลลับ, battle log ทุกคู่ และผังหายทั้งหมด แชมป์หายจากกระดานเกียรติยศ/หน้าหลัก (spec 08 ซ.) — ครูอาจจำลองการต่อสู้ทุกวันแล้วลบรอบที่ไม่ต้องการ
- **Feature ต้นทาง:** FE-31 (spec 08 ซ.) | **Journey:** UJ-03
- **สิทธิ์ที่ต้องมี:** session ครูเท่านั้น (นักเรียนลบไม่ได้)

**Request** — ไม่มี body · **หน้าต่างยืนยันก่อนลบเป็นหน้าที่ฝั่ง client**

**Response สำเร็จ** — `200 OK`

```json
{ "data": { "id": "T9xKq2", "deleted": true } }
```

**Response ผิดพลาด**

| Status | เมื่อไหร่ | รหัสข้อผิดพลาด | ข้อความถึงผู้ใช้ |
|---|---|---|---|
| 401 | ไม่มี session | UNAUTHENTICATED | "กรุณาเข้าสู่ระบบใหม่อีกครั้ง" |
| 403 | session ไม่ใช่ครู (นักเรียนเรียก) | FORBIDDEN_ROLE | "ไม่มีสิทธิ์ทำรายการนี้" |
| 404 | ไม่พบทัวนาเมนต์ | TOURNAMENT_NOT_FOUND | "ไม่พบทัวนาเมนต์นี้" |

- **กฎทางธุรกิจที่ endpoint นี้บังคับ:** ลบ `results/` และ `matches/` (battle log) ทุกเอกสารก่อน แล้วลบเอกสารทัวนาเมนต์ (Firestore ไม่ลบ subcollection อัตโนมัติ) · **เป็นข้อยกเว้นของ soft delete** (database-schema หัวเอกสาร / G-DB-18) · ลบได้ทุกสถานะ (ก่อน/หลังประกาศ) ตาม spec 08 ซ.

---

## 4. ช่องว่างที่พบ (Gap)

- **G-API-01:** จำนวนหลักของ PIN และเกณฑ์ล็อคชั่วคราว (จำนวนครั้งที่กรอกผิด + ระยะเวลาล็อค) ยังไม่ล็อก — กระทบ validation ของ API-01/API-02 และเงื่อนไขที่แน่นอนของ `423 ACCOUNT_LOCKED`
- **G-API-02:** ราคาไอเทมช่วยในร้าน (`SHOP_ITEM.price_points` ที่ API-40/41 ใช้) ยังไม่ล็อก — response ปัจจุบันคืน `pricePoints: null`/placeholder เท่านั้น
- **G-API-03:** กฎการถือครองไอเทม (ซื้อซ้ำได้ไหม/ใช้แล้วหมดไปหรือใช้ได้ทุกแมตช์) ยังไม่ล็อก — กระทบว่า API-45 (ใช้ไอเทม) ควรหัก `STUDENT_ITEM_INVENTORY.quantity` หรือไม่ ปัจจุบัน endpoint นี้ยังไม่หักจำนวน รอการตัดสินใจ
- **G-API-04:** สูตรตัดสินแพ้-ชนะและสูตรคำนวณ HP ยังไม่มี — API-51 (ประกาศผล) และ API-46 (ดูผลแมตช์) อธิบายเฉพาะ "ทำอะไร" (คำนวณที่ server, ซ่อนค่าสเตตัส) แต่ยังไม่มี business logic รายละเอียดของการคำนวณเอง
- **G-API-05:** ~~ช่องโหว่ "รีเซ็ตแล้วได้แต้มค่าไอเทมคืนวนซ้ำ" ยังไม่ปิด — กระทบ business logic ของ API-38 (reset) โดยตรงว่าต้องยกเว้น `entry_type='item_purchase'` ออกจากยอดที่คืนหรือไม่ เอกสารนี้ระบุพฤติกรรมที่ต้องรอการตัดสินใจไว้ชัดเจนแล้วในรายละเอียด endpoint แทนการเดา~~ — **ปิดแล้ว (2026-08-25):** ตาม [[../../01-requirements/01-spec/20260823-06-battle-support-items|spec 06]] Open Question ข้อ 6 (ปิดแล้ว 2026-08-23) API-38 คืนแต้มเต็มจำนวนรวมแต้มที่เคยใช้ซื้อไอเทมด้วย (ไม่ยกเว้น `entry_type='item_purchase'`) แต่ในธุรกรรมเดียวกันจะเคลียร์ `STUDENT_ITEM_INVENTORY` ของนักเรียนคนนั้นทั้งหมดเป็น `quantity=0` และไม่ insert `PET` ใหม่ทันที (ต้องเรียก API-36 แยกต่างหาก) — นี่คือกลไกที่ปิดช่องโหว่ ดูรายละเอียดเต็มที่ database-schema.md (ENT-15, ENT-18) และ detailed-design/reset-pet.md (DD-03, BR-09)
- **G-API-06:** เกณฑ์ "ไม่เข้าใช้งานนาน" (จำนวนวัน) และชุดสัญลักษณ์เตือนของ API-55 ยังไม่ล็อก — response ตัวอย่างใช้ค่าจาก prototype (7 วัน, "▲ ควรดูแล") เป็นตัวอย่างเท่านั้น ไม่ใช่ค่าจริงที่ล็อกแล้ว
- **G-API-07:** รายการตัวเลือก `sort`/`filter` ที่ต้องมีจริงทั้งหมดของ API-55 ยังไม่ล็อกครบ — สเปกระบุเพียงตัวอย่าง
- **G-API-08:** รูปแบบไฟล์ที่ API-57/61 รองรับ (`fileFormat`) ยังไม่ล็อก enum ที่แน่นอน
- **G-API-09:** นโยบายส่งคะแนนซ้ำรอบสอง (API-56/60) — เขียนทับ/เพิ่มคอลัมน์ใหม่/ถามครูก่อน ยังไม่ล็อก — ปัจจุบัน schema/endpoint ออกแบบเป็น "งานใหม่ทุกครั้ง" ยังไม่มีกลไกอ้างอิงงานก่อนหน้า
- **G-API-10:** ยังไม่ตัดสินว่าคะแนนที่ API-56 ส่งออกใช้คะแนนดิบ (`score_awarded`) หรือคะแนนที่ปรับสัดส่วนแล้ว และยังไม่ตัดสินว่ารวมคะแนนจากงานที่ครูตรวจเอง (worksheet/attachment) ด้วยหรือไม่
- **G-API-11:** โหมดฉายผลในห้อง (API-52, FE-43) ต้องเป็น real-time push หรือครูรีเฟรชเองพอ ยังไม่ตัดสิน — กระทบว่าต้องมี WebSocket/SSE gateway เพิ่มหรือไม่ (Open Decision ของ architecture.md ข้อ 8)
- **G-API-12 (พบใหม่ 2026-08-25):** สเปก FE-82/FE-83 (`20260825-07-pet-care-and-bonding.md`) และ AC-FE-82/AC-FE-83 ไม่มีข้อทดสอบกรณีที่ "ความหิวเต็ม" (`hunger_today=3`) กับ "เพดานรวม 10/วัน" (`daily_bonding_quota_used=10`) เกิดพร้อมกันตอนกด `feed` (เช่น กด `feed` ครั้งที่ 3 ของวันในจังหวะที่เพดานรวมเต็มพอดีจากการกด action อื่นมาก่อน) — API-63 ในเอกสารนี้เลือกลำดับตรวจ "เช็คความหิวเต็มก่อนสำหรับ `feed` เท่านั้น แล้วจึงเช็คเพดานรวมทีหลัง" เป็นการตีความที่สอดคล้องกับข้อความสเปกที่มีอยู่ (ไม่ใช่ตัวเลขใหม่) แต่ยังไม่ผ่านการยืนยันจาก requirement โดยตรง — ถ้าต้องการล็อกลำดับนี้อย่างเป็นทางการ ควรเปิด requirement เพิ่มเติมหรือเพิ่ม AC ทดสอบเคสนี้ชัดเจน
- **G-API-13 — ปิดแล้ว (2026-11-11, Gap B5 ฝั่ง api-spec):** กฎคะแนนทศนิยม 1 ตำแหน่งและกฎ "ยอดที่ใช้ได้ = ส่วนจำนวนเต็มของยอดสะสม" (spec 01 ง. / spec 02 ข.4–6, AC-FE-17-3/4/5, AC-FE-22-3, AC-FE-23-3/4/5/6) บันทึกลง API-28, API-31 (ตัวอย่าง), API-32 (ตัวอย่าง), API-33, API-36, API-38 แล้ว — endpoint ที่เช็ค `available_points` (API-36/37/41) ไม่เปลี่ยนเงื่อนไข เพราะ `available_points` ยังเป็นจำนวนเต็ม
- **G-API-14 (พบใหม่ 2026-11-17):** spec 08 (ทัวนาเมนต์) และ spec 09 (leaderboard) ยังไม่มี FE-XX ของตัวเอง — API-64~71 ผูก FE-31/FE-43 ไปก่อนตาม AC-FE-31-3~19 / AC-FE-43-1~2 (ตรงกับ G-18 ของ acceptance-criteria) ต้องไล่ `/sync-feature-journey` ออก FE ใหม่แล้วแก้คอลัมน์ Feature
- **G-API-15 (พบใหม่ 2026-11-17):** การตัดสินใจ 2026-11-17 ข้อ 3 (ทัวนาเมนต์เก่า = ประกาศแล้ว) และข้อ 4 (ประกาศแล้วยกเลิกไม่ได้ → ไม่มี endpoint ยกเลิก) ใช้ใน API-65/66/69/70 แล้ว แต่ Open Questions ใน spec 08 ยังเขียนว่ายัง "ไม่ได้ถาม" ทั้งสองข้อ — ต้องไปปิดใน spec 08 (ไม่ทำในรอบนี้) · detailed-design ยังไม่มี flow ทัวนาเมนต์ (ต้องไล่ `/sync-detailed-design`)
- **G-API-16 (อัปเดตตามผู้ใช้ 2026-11-17):** (ก) **ปิดแล้ว** — คู่บาย: ผู้ใช้ตัดสินให้เลื่อนเข้ารอบ 2 **ตอนสร้างทันที** (บายไม่ใช่ผลการต่อสู้ ทุกคนรู้ตั้งแต่จับคู่ ตรงกับโค้ดเดิม) — ดู G-DB-15; AC-FE-31-4 ส่วนช่องรอบถัดไปต้องตีความไม่รวมคนได้บาย (ข) **คู่เสมอ:** กติกาปัจจุบันยังเป็นครูตัดสินคู่เสมอ (spec 08 จ.) ระหว่างนี้คู่เสมอที่ยังไม่ตัดสินทำให้ประกาศรอบไม่ได้ (409 `TIE_NOT_DECIDED` คงไว้เป็นพฤติกรรมชั่วคราว ไม่มี AC ทดสอบตรงๆ) · **ผู้ใช้เสนอแนวคิด tie-break อัตโนมัติ (ยังไม่ล็อก)** เช่น ประลองต่อแบบจำกัดเวลา/จำนวนรอบ (ทำดาเมจมากสุดใน 30 วินาที หรือเลือดเหลือมากกว่า) — ต้องเปิด requirement ใหม่ ถ้าล็อกแล้ว API-68, ข้อ 409 `TIE_NOT_DECIDED` ของ API-69 และสถานะ `needsTeacherDecision` จะเปลี่ยน — เอกสารนี้ไม่ออกแบบ tie-break เอง (G-DB-16)
- **G-API-17 (พบใหม่ 2026-11-17):** ทัวนาเมนต์เก่า (ไม่มี `announcedRound`) ที่ยังมีคู่ไม่ได้ต่อสู้ — API-67/68 ยังไม่ระบุพฤติกรรม (เก่าเขียน `winnerSlot` สาธารณะทันที) ต้องตัดสินว่าให้สู้ต่อแบบเก่า, ห้ามสู้ (เป็นอ่านอย่างเดียว), หรือแปลงเป็นกติกาใหม่ · ปัจจุบันไม่ต้องมีผลเพราะ spec ระบุเก่า = ประกาศแล้ว (ถือว่าจบ)
- **G-API-18 (พบใหม่ 2026-11-17):** (ก) **ค่าขัดกันระหว่างเอกสาร:** ข้อ 1.7 และ architecture ข้อ 7 ห้าม endpoint ฝั่งครูส่ง "ชนิด/สายพันธุ์สัตว์เลี้ยง, ค่าสเตตัส" แต่ spec 08 ข./ง. และโค้ดจริงให้ครูเห็นผู้เข้าแข่งพร้อมสัตว์เลี้ยงและเก็บ snapshot สเตตัสในผัง — เอกสารนี้ไม่เลือกข้างเอง: ผังส่ง `speciesKey`/`stage` แต่ไม่ส่ง `stats`, และ API-66/70 ใช้ path ร่วม (ไม่มี prefix `/teacher`) เพื่อไม่ชนกฎ 1.7 อย่างเป็นทางการ — **ต้องให้ผู้ใช้ตัดสิน** ว่าทัวนาเมนต์เป็นข้อยกเว้นหรือไม่ (ดู G-DB-17) (ข) `studentName` ใน slot มาจาก `users.name` — ต้องยืนยันว่าเป็นชื่อเล่นตาม FE-07
- **G-API-19 (พบใหม่ 2026-11-17):** (ก) endpoint ดึงรายชื่อนักเรียนที่มีสัตว์เลี้ยง (dropdown ตอนสร้างทัวนาเมนต์ — โค้ดมี `โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์`) ยังไม่มี API ในเอกสารนี้ เพราะผู้ใช้กำหนดรายการ endpoint รอบนี้ไว้ 7 รายการ + รายการ (API-65) — ต้องตัดสินว่าจะเพิ่มหรือไม่ (ข) ระบบจริงเรียก Firestore ตรง ไม่มี REST server — status code/`code` ในหัวข้อ API-64~71 เป็นสัญญาเชิงตรรกะ (ข้อ 1.8) rules บังคับได้แน่นอนเฉพาะ "นักเรียนอ่านผลลับไม่ได้/เขียนไม่ได้" ส่วน 409 ลำดับธุรกิจบังคับที่โค้ดฝั่งครู (G-DB-19)
- **ไม่มีช่องว่างอื่นที่กระทบโครงสร้าง endpoint ระดับนี้นอกเหนือจากที่ระบุข้างต้น** — ทุก endpoint ใน spec นี้ trace กลับไปหา FE ได้ครบ ไม่มี endpoint ใดที่ไม่มีต้นทาง
