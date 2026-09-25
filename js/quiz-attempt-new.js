// ─────────────────────────────────────────────────────────────
// js/quiz-attempt-new.js — นักเรียนทำแบบทดสอบจริงแล้วส่ง (หน้าใหม่ของการบ้านนี้)
// โหลด quizSets/{quizSetId} มาแสดง (อ่านอย่างเดียว เหมือน js/quiz-sets.js) แล้ว
// วาดฟอร์มตาม format: mcq = เลือกตอบ (radio), worksheet/attachment = พิมพ์คำตอบ
//
// **ขอบเขตของไฟล์นี้ (ui-screens): ห้ามเขียน quizAttempts ลง Firestore เอง**
// เมื่อกดปุ่มส่งคำตอบ จะเรียก window.ส่งคำตอบแบบทดสอบ(...) แทน — ฟังก์ชันนี้เป็น
// ของ data-auth-engineer ที่จะมาต่อ logic การเขียน/คำนวณคะแนนจริงในรอบถัดไป
// ที่นี่แค่ประกาศ stub ไว้กันปุ่มพังตอนยังไม่มีใครต่อ
//
// ── สัญญา (contract) ของ window.ส่งคำตอบแบบทดสอบ ──
// เรียกด้วย object เดียว:
//   {
//     quizSetId: string,              // รหัสเอกสาร quizSets/{id} ที่กำลังทำ
//     quizSet: object,                // ข้อมูลเต็มของ quizSets/{id} ที่โหลดมา (title, format,
//                                     // fullScore, questions, ...) เผื่อไปคำนวณคะแนน/จดชื่อซ้ำ
//     คำตอบที่เลือก: Array<number|null> | null,
//                                     // เฉพาะ format "mcq": ดัชนีตัวเลือกที่นักเรียนเลือกต่อข้อ
//                                     // เรียงตาม quizSet.questions ทีละข้อ ข้อที่ไม่ตอบ = null
//                                     // (เป็น null ทั้งก้อนถ้า format ไม่ใช่ mcq)
//     ข้อความคำตอบ: string | null      // เฉพาะ format "worksheet"/"attachment": ข้อความที่พิมพ์
//                                     // (เป็น null ถ้า format เป็น mcq)
//   }
// คาดหวังว่าจะ return Promise:
//   - resolve ด้วย string รหัสเอกสาร quizAttempts ที่สร้างใหม่ (ใช้ redirect ต่อ
//     ไปหน้า quiz-attempt-detail.html?id=<newId>)
//   - reject ด้วย Error ที่มี .message เป็นข้อความไทยอ่านได้ (โชว์ในกล่องเตือนตรงนี้)
// หมายเหตุ: studentId/studentNickname ของผู้ส่งไม่ได้ส่งมาใน payload เพราะอ่านได้
// จาก window.CURRENT_USER อยู่แล้ว (uid, name) — ฝั่งที่ implement จริงเรียกใช้ตรงนั้นได้เลย
// ─────────────────────────────────────────────────────────────

(function () {
  var quizSetId = ค่าจากURL("quizSetId");

  var กล่องไม่มีสิทธิ์ = document.getElementById("กล่องไม่มีสิทธิ์");
  var กล่องไม่พบ = document.getElementById("กล่องไม่พบ");
  var ข้อความไม่พบ = document.getElementById("ข้อความไม่พบ");
  var กล่องหลัก = document.getElementById("กล่องหลัก");
  var ชื่อชุดข้อสอบEl = document.getElementById("ชื่อชุดข้อสอบ");
  var รายละเอียดชุดข้อสอบEl = document.getElementById("รายละเอียดชุดข้อสอบ");
  var กล่องคำถาม = document.getElementById("กล่องคำถาม");
  var กล่องเตือนส่ง = document.getElementById("กล่องเตือนส่ง");
  var ปุ่มส่งคำตอบ = document.getElementById("ปุ่มส่งคำตอบ");

  var ชุดข้อสอบ = null;

  // ต่อระบบบันทึกจริง: สร้างเอกสาร quizAttempts ใหม่ — mcq ตรวจอัตโนมัติทันที
  // (status: "graded" พร้อมคะแนน) ส่วน worksheet/attachment เป็น "pending_review"
  // รอครูตรวจ (เก็บข้อความที่พิมพ์ไว้ที่ submittedText ให้ครูอ่านตอนตรวจ)
  window.ส่งคำตอบแบบทดสอบ = window.ส่งคำตอบแบบทดสอบ || async function (payload) {
    var quizSet = payload.quizSet;

    var ข้อมูลใหม่ = {
      studentId: window.CURRENT_USER.uid,
      studentNickname: window.CURRENT_USER.name,
      quizSetId: payload.quizSetId,
      quizSetTitle: quizSet.title,
      submittedAt: เวลาตอนนี้()
    };

    if (quizSet.format === "mcq") {
      var คำถามทั้งหมด = Array.isArray(quizSet.questions) ? quizSet.questions : [];
      var จำนวนข้อ = คำถามทั้งหมด.length;
      var จำนวนถูก = 0;

      for (var i = 0; i < จำนวนข้อ; i++) {
        var ตัวเลือก = Array.isArray(คำถามทั้งหมด[i].choices) ? คำถามทั้งหมด[i].choices : [];
        var ดัชนีที่ถูก = ตัวเลือก.findIndex(function (c) { return c && c.isCorrect === true; });
        if (payload.คำตอบที่เลือก[i] != null && payload.คำตอบที่เลือก[i] === ดัชนีที่ถูก) {
          จำนวนถูก++;
        }
      }

      ข้อมูลใหม่.status = "graded";
      ข้อมูลใหม่.scoreAwarded = จำนวนข้อ > 0 ? Math.round((จำนวนถูก / จำนวนข้อ) * quizSet.fullScore) : 0;
    } else {
      // worksheet / attachment — รอครูตรวจมือ เก็บข้อความที่พิมพ์ไว้ให้ครูอ่านตอนตรวจ
      ข้อมูลใหม่.status = "pending_review";
      ข้อมูลใหม่.scoreAwarded = null;
      ข้อมูลใหม่.submittedText = payload.ข้อความคำตอบ;
    }

    try {
      var เอกสารใหม่ = window.fsDoc(window.fsCollection(window.db, "quizAttempts"));
      await window.fsSetDoc(เอกสารใหม่, ข้อมูลใหม่);
      return เอกสารใหม่.id;
    } catch (err) {
      console.error(err);
      throw new Error("บันทึกคำตอบลงระบบไม่สำเร็จ: " + err.message);
    }
  };

  ปุ่มส่งคำตอบ.addEventListener("click", ส่งคำตอบ);

  ถ้าพร้อมแล้วให้เริ่ม();

  function ถ้าพร้อมแล้วให้เริ่ม() {
    if (window.CURRENT_USER) {
      เริ่ม();
    } else {
      window.addEventListener("auth-ready", เริ่ม, { once: true });
    }
  }

  function เริ่ม() {
    if (window.CURRENT_USER.role !== "student") {
      กล่องไม่มีสิทธิ์.classList.remove("hidden");
      return;
    }
    if (!quizSetId) {
      แสดงไม่พบ("ไม่พบชุดข้อสอบที่ต้องการ — ลิงก์นี้ไม่มีรหัสชุดข้อสอบ กรุณากลับไปเลือกจากหน้ารายการชุดข้อสอบใหม่");
      return;
    }
    โหลดชุดข้อสอบ();
  }

  async function โหลดชุดข้อสอบ() {
    try {
      var สแนปช็อต = await window.fsGetDoc(window.fsDoc(window.db, "quizSets", quizSetId));
      if (!สแนปช็อต.exists()) {
        แสดงไม่พบ("ไม่พบชุดข้อสอบนี้ — อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง");
        return;
      }
      ชุดข้อสอบ = สแนปช็อต.data();
      ชุดข้อสอบ.id = สแนปช็อต.id;

      วาดฟอร์ม();
      กล่องหลัก.classList.remove("hidden");
    } catch (err) {
      แสดงไม่พบ("โหลดชุดข้อสอบไม่สำเร็จ: " + err.message);
      console.error(err);
    }
  }

  var ป้ายฟอร์แมต = { mcq: "ปรนัย (ตรวจให้คะแนนอัตโนมัติทันที)", worksheet: "ใบงาน (รอครูตรวจ)", attachment: "แนบไฟล์ (รอครูตรวจ)" };

  function วาดฟอร์ม() {
    ชื่อชุดข้อสอบEl.textContent = ชุดข้อสอบ.title || "(ไม่มีชื่อชุด)";
    รายละเอียดชุดข้อสอบEl.textContent =
      "ประเภท: " + (ป้ายฟอร์แมต[ชุดข้อสอบ.format] || ชุดข้อสอบ.format) +
      " · คะแนนเต็ม " + (ชุดข้อสอบ.fullScore != null ? esc(ชุดข้อสอบ.fullScore) : "—");

    if (ชุดข้อสอบ.format === "mcq") {
      วาดฟอร์มMCQ();
    } else {
      // worksheet / attachment — และฟอร์แมตอื่นที่ไม่รู้จัก ให้ตกมาที่ช่องข้อความไว้ก่อน
      วาดฟอร์มข้อความ();
    }
  }

  function วาดฟอร์มMCQ() {
    if (!Array.isArray(ชุดข้อสอบ.questions) || ชุดข้อสอบ.questions.length === 0) {
      กล่องคำถาม.innerHTML = "<p>ชุดข้อสอบนี้ยังไม่มีคำถามเลย — ยังทำไม่ได้ กรุณาติดต่อครูผู้สอน</p>";
      ปุ่มส่งคำตอบ.disabled = true;
      return;
    }

    var html = ชุดข้อสอบ.questions.map(function (ข้อ, qi) {
      var ตัวเลือกHtml = (Array.isArray(ข้อ.choices) ? ข้อ.choices : []).map(function (c, ci) {
        // จงใจไม่แสดง c.isCorrect ที่นี่ — ไม่งั้นนักเรียนจะเห็นเฉลยตอนทำข้อสอบ
        return (
          '<label class="choice-row">' +
          '<input type="radio" name="ข้อ-' + qi + '" value="' + ci + '">' +
          "<span>" + esc(c.choiceText) + "</span>" +
          "</label>"
        );
      }).join("");

      return (
        '<div class="card question-card">' +
        "<p><strong>ข้อ " + (qi + 1) + ".</strong> " + esc(ข้อ.questionText) + "</p>" +
        ตัวเลือกHtml +
        "</div>"
      );
    }).join("");

    กล่องคำถาม.innerHTML = html;
  }

  function วาดฟอร์มข้อความ() {
    var ป้าย = ชุดข้อสอบ.format === "attachment"
      ? "พิมพ์ลิงก์หรือรายละเอียดไฟล์ที่ส่ง (ยังไม่รองรับอัปโหลดไฟล์จริง)"
      : "พิมพ์คำตอบ/สรุปใบงานของคุณ";

    กล่องคำถาม.innerHTML =
      '<div class="card">' +
      '<label for="ช่องคำตอบ">' + ป้าย + "</label>" +
      '<textarea id="ช่องคำตอบ" rows="8" placeholder="พิมพ์ที่นี่..."></textarea>' +
      "</div>";
  }

  async function ส่งคำตอบ() {
    กล่องเตือนส่ง.classList.add("hidden");

    var payload = {
      quizSetId: quizSetId,
      quizSet: ชุดข้อสอบ,
      คำตอบที่เลือก: null,
      ข้อความคำตอบ: null
    };

    if (ชุดข้อสอบ.format === "mcq") {
      payload.คำตอบที่เลือก = ชุดข้อสอบ.questions.map(function (ข้อ, qi) {
        var ที่เลือก = กล่องคำถาม.querySelector('input[name="ข้อ-' + qi + '"]:checked');
        return ที่เลือก ? parseInt(ที่เลือก.value, 10) : null;
      });
    } else {
      var ช่องคำตอบ = document.getElementById("ช่องคำตอบ");
      var ข้อความ = ช่องคำตอบ ? ช่องคำตอบ.value.trim() : "";
      if (!ข้อความ) {
        เตือนส่ง("พิมพ์คำตอบก่อน จึงจะส่งได้");
        return;
      }
      payload.ข้อความคำตอบ = ข้อความ;
    }

    ปุ่มส่งคำตอบ.disabled = true;
    ปุ่มส่งคำตอบ.textContent = "กำลังส่งคำตอบ...";

    try {
      var รหัสงานใหม่ = await window.ส่งคำตอบแบบทดสอบ(payload);
      location.href = "quiz-attempt-detail.html?id=" + encodeURIComponent(รหัสงานใหม่);
    } catch (err) {
      เตือนส่ง("ส่งคำตอบไม่สำเร็จ: " + err.message);
      console.error(err);
      ปุ่มส่งคำตอบ.disabled = false;
      ปุ่มส่งคำตอบ.textContent = "ส่งคำตอบ";
    }
  }

  function แสดงไม่พบ(ข้อความ) {
    ข้อความไม่พบ.textContent = ข้อความ;
    กล่องไม่พบ.classList.remove("hidden");
  }

  function เตือนส่ง(ข้อความ) {
    กล่องเตือนส่ง.textContent = "⚠️ " + ข้อความ;
    กล่องเตือนส่ง.classList.remove("hidden");
  }
})();
