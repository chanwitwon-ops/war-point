# CLAUDE.md

ไฟล์นี้ใช้เป็นแนวทางสำหรับ Claude Code (claude.ai/code) เมื่อเข้ามาทำงานกับโค้ดใน repository นี้

## สถานะปัจจุบันของ repository

repository นี้มี `docs/` (requirement, feature list, user journey, prototype, เอกสารทดสอบ), `DESIGN.md`, ชุด agent/skill ใน `.claude/` **และตั้งแต่การบ้าน Module 2 (Firestore) มีซอร์สโค้ดจริงส่วนหนึ่งแล้ว** — เฉพาะขอบเขตที่ระบุใน [SCOPE.md](../SCOPE.md) (quizAttempts + students + quizSets + reviews) ยังไม่ใช่ทั้งระบบตาม feature-list.md/database-schema.md ฉบับเต็ม

**ไฟล์ที่มีจริงตอนนี้:** `quiz-attempts.html`, `seed.html`, `js/*.js`, `css/style.css`, `static-server.ps1` (ยังไม่มี `index.html`) — ยังไม่มี build system/npm/bundler ใดๆ เป็น static HTML/JS ธรรมดา + Firebase Web SDK โหลดจาก CDN แบบ ES module

**วิธีรัน:** เปิด PowerShell ที่โฟลเดอร์นี้แล้วรัน `powershell -File static-server.ps1` (เปิดที่ port 3000) แล้วเข้า `http://localhost:3000/seed.html` เพื่อใส่ข้อมูลตัวอย่างก่อน จากนั้นเข้า `http://localhost:3000/quiz-attempts.html` เพื่อดูรายการจริงจาก Firestore — **ต้องเปิดผ่าน http:// เท่านั้น เปิดไฟล์ตรงๆ (`file://`) จะพังเพราะ ES module ของ Firebase ต้องการ origin ที่ไม่ใช่ file**

**อย่าคิดคำสั่ง build/lint/test ขึ้นมาเอง** ถ้ามีการเพิ่ม npm/bundler เข้ามาในอนาคต ให้อัปเดตไฟล์นี้ด้วยคำสั่งที่ใช้งานได้จริงในตอนนั้น

**ลำดับการเริ่มงานที่แนะนำ**

1. `/new-requirement` — บันทึก requirement แรกเข้า `01-spec/` และสร้าง `backlog.md`
2. `/sync-feature-journey` — สร้าง `feature-list.md` (FE-XX + MoSCoW) และ `user-journey.md` (UJ-XX + Mermaid)
3. `/build-prototype` — สร้าง `DESIGN.md` (ถ้ายังไม่มี skill จะถามโทนสี/สไตล์ให้) แล้วสร้าง interactive prototype
4. `/sync-test-plan` — สร้าง acceptance criteria, test plan และ test case
5. `/sync-architecture` → `/sync-api-db` → `/sync-detailed-design` → `/sync-nfr` — สาย technical spec (ต้องเรียงตามนี้ เพราะแต่ละตัวอ่าน output ของตัวก่อนหน้า)
6. `/audit-backlog` + `/audit-prototype` + `/audit-technical-spec` — ตรวจความสอดคล้องทั้งสายก่อน commit

prototype ที่สร้างแล้วเปิดดูได้โดยเปิดไฟล์ `index.html` ในโฟลเดอร์เวอร์ชันนั้นด้วย browser ตรงๆ ไม่ต้อง build และไม่ต้องรัน dev server

## โครงสร้างเอกสาร (`docs/`)

โฟลเดอร์ `docs/` ถูกออกแบบให้แทน workflow ของโปรเจกต์แบบเรียงลำดับ โดยแบ่งเป็นโฟลเดอร์หลักที่มีเลขนำหน้า:

```
00-archived        เอกสารที่เลิกใช้แล้ว/ถูกแทนที่ (ห้ามลบเอกสารทิ้ง ให้ย้ายมาเก็บไว้ที่นี่แทน)
01-requirements
  backlog.md       (ยังไม่มี) รายการ requirement ทั้งหมดเรียงตามเวลา ลิงก์ไปยัง spec ฉบับเต็ม
  feature-list.md  (ยังไม่มี) ความสามารถของระบบระดับ high-level (รหัส FE-XX) จัดลำดับด้วย MoSCoW
  user-journey.md  (ยังไม่มี) เส้นทางการใช้งานของผู้ใช้ (รหัส UJ-XX) เป็น Mermaid diagram + mapping กลับไปหา FE-XX
  01-spec          ต้นทางของความต้องการระบบ (ฟีเจอร์, user story, กฎทางธุรกิจ, ขอบเขตงาน)
  02-plan          แผนงาน/roadmap/phase ที่แตกมาจาก 01-spec
  03-task          รายการงานย่อยที่ลงมือทำได้จริง แตกมาจาก 02-plan
02-design
  01-prototypes    ต้นแบบหน้าตา UI/UX — wireframe แบบ markdown + interactive prototype (โฟลเดอร์ v{n}-{YYYYMMDD}-{slug}/)
  02-technical     การออกแบบเชิงเทคนิค (architecture, database schema, API design, เทคโนโลยีที่เลือกใช้)
03-testing
  01-test-plan     acceptance-criteria.md (Given-When-Then), test-plan.md (กลยุทธ์ระดับโปรเจกต์ 1 ไฟล์),
                   test-cases/{feature-slug}.md (step-by-step) — แตกมาจาก 01-spec, feature-list และ user-journey
  02-test-result   ผลการทดสอบจริงและบั๊กที่พบ เทียบกับ 01-test-plan
04-retrospectives  บทเรียนที่ได้หลังจบแต่ละ phase/sprint โดยอ้างอิงจาก 02-test-result และ 05-log
05-log             บันทึกความเคลื่อนไหว/การตัดสินใจสำคัญของโปรเจกต์ เรียงตามลำดับเวลา
```

แต่ละโฟลเดอร์จะมี `index.md` บอกไว้ว่ารับข้อมูลมาจากโฟลเดอร์ไหน และส่งต่อผลลัพธ์ไปที่โฟลเดอร์ไหน — ให้ยึดลำดับนี้เป็นลำดับการอ่าน/เขียนเอกสาร: `01-requirements` → `02-design` → `03-testing` → `04-retrospectives` โดยมี `05-log` ทำงานคู่ขนานไปตลอดในฐานะบันทึกตามเวลา และ `00-archived` เป็นที่เก็บเอกสารที่ถูกแทนที่ไปแล้ว

การอ้างอิงข้ามเอกสารใช้รูปแบบ wikilink สไตล์ Obsidian เช่น `[[../02-plan/index|02-plan]]` — เมื่อเพิ่มหรือแก้ไขเอกสาร ให้รักษารูปแบบการลิงก์นี้ไว้ เพื่อให้เอกสารทั้งหมดยังเชื่อมโยงกันได้

**ข้อตกลง: ห้ามลบเอกสารทิ้งโดยตรง** ตามที่ระบุใน `docs/00-archived/index.md` เอกสารที่ถูกยกเลิกหรือแทนที่แล้ว ให้ย้ายไปเก็บไว้ที่ `00-archived/` แทนการลบทิ้ง เพื่อรักษาประวัติการตัดสินใจของโปรเจกต์ไว้

## ลำดับการไหลของเอกสาร (document pipeline)

เอกสารในโปรเจกต์นี้ต่อกันเป็นสายเดียว — เมื่อแก้ต้นทาง ต้องไล่อัปเดตปลายทางให้ตรงกันด้วย:

```
01-spec (requirement)
   └─> backlog.md
         └─> feature-list.md (FE-XX, MoSCoW)
               └─> user-journey.md (UJ-XX, Mermaid)
                     ├─> 02-design/01-prototypes  (อ้างอิง DESIGN.md)
                     ├─> 02-design/02-technical/architecture.md (CMP-XX, DF-XX)
                     │     ├─> database-schema.md (ENT-XX, ERD)
                     │     ├─> api-spec.md (API-XX)
                     │     │     └─> detailed-design.md + detailed-design/{flow}.md (DD-XX, BR-XX, ERR-XX)
                     │     └─> non-functional-requirement.md (NFR-XX)
                     └─> 03-testing/01-test-plan/acceptance-criteria.md
                           ├─> test-plan.md
                           └─> test-cases/{feature-slug}.md
                                 └─> 03-testing/02-test-result
```

สาย technical spec รับ input จาก `feature-list.md` + `user-journey.md` + `acceptance-criteria.md` พร้อมกัน — **`acceptance-criteria.md` คือแหล่งความจริงของกฎธุรกิจและตัวเลข** เอกสาร technical ห้ามตั้งตัวเลขใหม่เอง ถ้าต้องการกฎที่ยังไม่มี ให้เปิด requirement ใหม่

**กฎการอ้างอิงข้ามเอกสาร:**

- Feature ทุกตัวต้อง trace กลับไปหา requirement spec ได้ — **ห้ามแต่ง feature ที่ไม่มีต้นทางในเอกสาร** ถ้าเห็นสิ่งที่ระบบควรมีแต่ยังไม่มี requirement รองรับ ให้บันทึกในหัวข้อ "ช่องว่างที่พบ (Gap)" ท้ายเอกสาร แล้วเปิด requirement ใหม่ผ่าน skill `new-requirement`
- รหัส `FE-XX`, `UJ-XX`, `AC-*`, `TC-*`, `CMP-XX`, `ENT-XX`, `API-XX`, `DD-XX`, `BR-XX`, `ERR-XX`, `NFR-XX` ที่ออกไปแล้ว **ห้ามเปลี่ยน** เพราะมีเอกสารอื่นอ้างถึง — ถ้าเลิกใช้ ให้คงรหัสไว้แล้วระบุสถานะ
- ทุก node ใน Mermaid diagram ต้องครอบข้อความด้วย double quote (`A["ข้อความ (FE-01)"]`) เพราะข้อความภาษาไทยและวงเล็บทำให้ Mermaid parse พลาด และต้องมีรหัส FE-XX กำกับท้ายข้อความเพื่อ mapping กลับได้ — **ยกเว้น `stateDiagram-v2`** ที่ห้ามครอบชื่อ state ด้วย quote ตรงในเส้น transition (`"A" --> "B"` parse ไม่ผ่าน) ต้องประกาศ `state "ข้อความไทย" as shortId` ก่อนแล้วเขียน transition ด้วย shortId ที่ไม่มี quote (label บนเส้น เช่น `shortId --> shortId2 : "ข้อความ"` ยังครอบ quote ได้ปกติ) — บั๊กนี้เคยเกิดจริงกับ `detailed-design/*.md` ทั้ง 6 ไฟล์เมื่อ 2026-08-23 แก้แล้วเมื่อ 2026-08-25

## Design System (`DESIGN.md`)

`DESIGN.md` ที่ root คือ **แหล่งเดียว** ของ design token (สี, ฟอนต์, spacing), UI component pattern และกฎ UX ของโปรเจกต์ — **ไฟล์นี้มีอยู่แล้ว** ห้ามสร้างทับ ถ้าต้องเพิ่ม token ให้ถาม user ก่อน (ห้ามเดาสีเอง)

- งาน UI/prototype ทุกชิ้น **ต้องอ่าน `DESIGN.md` ก่อนเขียนโค้ด** และคัดลอกค่า token มาประกาศเป็น CSS custom properties ที่ `:root` แล้วอ้างผ่าน `var(--token)` เท่านั้น — **ห้าม hardcode ค่า hex ใน rule ของ component และห้ามเดาสี/สไตล์เอง**
- prototype ต้องเป็น **single file, self-contained** เปิดแบบ offline ได้ — ห้ามอ้างอิง CDN, ฟอนต์ภายนอก หรือไฟล์รูปภายนอก (ใช้ inline SVG หรือ CSS shape แทน)

## Agent และ Skill ของโปรเจกต์

แต่ละ phase มี skill (คุยกับ user + ยืนยันขอบเขต) คู่กับ agent (เขียนไฟล์) เสมอ — **skill เป็นตัวถาม agent เป็นตัวเขียน** ห้ามให้ agent ถามคำถามกับ user เอง

| Phase | Skill (interactive) | Agent | ผลลัพธ์ |
|---|---|---|---|
| Requirement | `new-requirement` | `requirement-doc-writer` | `01-spec/*.md`, `backlog.md` |
| Feature & Journey | `sync-feature-journey` | `feature-journey-writer` | `feature-list.md`, `user-journey.md` |
| Prototype | `build-prototype` | `prototype-writer` | `02-design/01-prototypes/v{n}-*/` |
| Testing | `sync-test-plan` | `test-writer` | `acceptance-criteria.md`, `test-plan.md`, `test-cases/*.md` |
| Architecture | `sync-architecture` | `architecture-writer` | `02-design/02-technical/architecture.md` |
| DB & API | `sync-api-db` | `api-db-writer` | `database-schema.md`, `api-spec.md` |
| Detailed Design | `sync-detailed-design` | `detailed-design-writer` | `detailed-design.md`, `detailed-design/{flow}.md` |
| NFR | `sync-nfr` | `nfr-writer` | `non-functional-requirement.md` |
| ตรวจสอบเอกสาร | `audit-backlog` | `backlog-auditor` *(read-only)* | รายงานความไม่สอดคล้องทั้งสาย spec → test-cases |
| ตรวจสอบ prototype | `audit-prototype` | `prototype-auditor` *(read-only)* | รายงานความไม่สอดคล้องของ prototype กับ DESIGN.md + เอกสารต้นทาง |
| ตรวจสอบ tech spec | `audit-technical-spec` | `technical-spec-auditor` *(read-only)* | รายงานความไม่สอดคล้องของ architecture/DB/API/detailed design/NFR กับเอกสารต้นทาง |

**ตัวตรวจกับตัวแก้ต้องแยกกัน:** agent ที่ลงท้ายด้วย `-auditor` เป็น **read-only** (ไม่มี Write/Edit) หน้าที่คือรายงานปัญหาพร้อมหลักฐานตัวเลขเท่านั้น การแก้ต้องผ่าน skill ที่ถาม user ก่อน แล้วส่งงานต่อให้ writer agent ของเอกสารนั้น — ห้ามให้ตัวตรวจแก้เอกสารเองแล้วรายงานว่า "ผ่าน"

**ข้อตกลงร่วมของทุก skill:**

- เมื่อมีจุดที่ไม่ชัดเจน ต้องถาม user ด้วย AskUserQuestion โดย**เสนอทางเลือกอย่างน้อย 3 แนวทาง** พร้อมข้อดี/ข้อเสีย และระบุตัวเลือกที่แนะนำพร้อมเหตุผล — อย่าเดาแทน user
- ทุก skill ต้องเขียน log ต่อท้าย `docs/05-log/{YYYYMMDD}-log.md` (ต่อท้าย ห้ามลบของเดิม)
- **ห้าม commit/push เองโดยไม่ถาม user ก่อน**
- **อย่าเชื่อรายงานของ agent ตามตัวอักษร** — ต้องสุ่มยืนยันเองอย่างน้อย 3 ข้อที่ agent บอกว่าผ่าน โดยเฉพาะข้อที่เป็นตัวเลข ถ้าค่าไม่ตรงให้ยึดค่าที่วัดเองและบอก user ว่ารายงานคลาดเคลื่อนตรงไหน
- เมื่อสั่ง writer agent ให้แก้เอกสารที่ตรวจผ่านแล้ว ต้องส่ง `mode: update` และ**ระบุชัดว่าห้ามแตะไฟล์/รหัสอะไร** เพื่อไม่ให้การแก้จุดเดียวไปพังส่วนอื่น

## สิ่งที่ต้องพิสูจน์ ไม่ใช่แค่ตรวจสายตา

ข้อเหล่านี้เคยหลุดมาแล้วเพราะดูด้วยตาว่า "น่าจะถูก" — ต้องวัดจริงทุกครั้ง

| เรื่อง | วิธีพิสูจน์ |
|---|---|
| Mermaid diagram | เรียก `mermaid.parse()` / `render()` จริง ไม่ใช่ตรวจ syntax ด้วยตา |
| prototype self-contained | ดูรายการ network request จริง — ต้องมีแค่ไฟล์ HTML เอง |
| contrast ตาม DESIGN.md ข้อ 4.8 | วัดทุก element ที่มีข้อความ ทุกหน้าจอ ทุกบทบาท รวม modal/sheet ที่ต้องเปิดก่อนวัด |
| สิทธิ์ตาม role "ซ่อน ไม่ใช่ disable" | สลับ role แล้วนับ input / ตรวจ DOM ว่าข้อมูลหวงไม่หลุด |
| กฎ boundary (เช่น `<=` ไม่ใช่ `<`) | กดใช้จริงด้วยค่าที่ขอบแล้ววัดผล |
| ค่าที่ปรากฏหลายที่ (ราคา, ชื่อปุ่ม, ชื่อสถานะ) | เทียบข้ามไฟล์ด้วยสคริปต์ ไม่ใช่ไล่อ่าน |
| ตัวเลขสรุปที่เอกสารอ้างถึงตัวเอง | นับใหม่จากไฟล์จริง |

## บทเรียนที่ยกมาจากโปรเจกต์ก่อน (my-coffee-store)

ข้อเหล่านี้เคยทำให้งานพลาดมาแล้วจริง อย่าให้เกิดซ้ำ

- **เลือก design token ต้องวัด contrast ตอนตั้งค่า ไม่ใช่ตอนตรวจ prototype** — โปรเจกต์ก่อนตั้งสีจากความสวยงามแล้วพบภายหลังว่าตัวอักษรสถานะวัดได้เพียง 2.5–3.9:1 ต่ำกว่าเกณฑ์ 4.5:1 ที่เอกสารเดียวกันประกาศไว้เอง ต้องกลับมาเพิ่ม "ink token" ทั้งชุดและไล่แก้ทุกไฟล์
- **สคริปต์ตรวจที่ตอบว่า "ผ่าน" ต้องดูตัวหารด้วย** — ถ้าจำนวนรายการที่ตรวจเป็น 0 แปลว่าเครื่องมือพัง ไม่ใช่งานสะอาด (เคยเกิดกับ regex ตรวจ wikilink ที่แมตช์ได้ 0 เส้นแล้วสรุปว่าไม่มีลิงก์เสีย)
- **อย่าใช้ bash heredoc กับสคริปต์ที่มี backslash** — backslash จะถูกกลืนทำให้ regex เพี้ยนเงียบๆ ให้เขียนไฟล์สคริปต์ด้วย Write แล้วรันแทน
- **contrast/touch target ต้องวัดตอน UI มีของจริงอยู่** — วัดตอนตะกร้าว่างหรือ modal ยังไม่เปิด จะไม่เห็นปุ่มที่มีปัญหา และต้องวัด element ที่อยู่นอก `section.screen` ด้วย
- **ค่า mock ที่ปรากฏหลายที่ต้องมีเจ้าของเดียว** — prototype 2 เวอร์ชันเคยตั้งตัวเลขชุดเดียวกันไม่ตรงกันและไม่ตรงกับ test data ทำให้ test case รันไม่ผ่านทั้งที่ตรรกะถูก
