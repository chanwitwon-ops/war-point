// ─────────────────────────────────────────────────────────────
// js/quiz-set-new.js — หน้าครูสร้างชุดข้อสอบ ด้วยความช่วยเหลือของ AI (FE-15 + FE-37)
// AI เสนอร่างคำถามจากเนื้อหาบทเรียน — ครูตรวจ/แก้ไข/เพิ่มเองได้ก่อนบันทึกเสมอ
// ─────────────────────────────────────────────────────────────

(function () {
  var กล่องไม่มีสิทธิ์ = document.getElementById("กล่องไม่มีสิทธิ์");
  var กล่องหลัก = document.getElementById("กล่องหลัก");

  var ช่องชื่อชุด = document.getElementById("ชื่อชุด");
  var ช่องคะแนนเต็ม = document.getElementById("คะแนนเต็ม");
  var ช่องเนื้อหาบทเรียน = document.getElementById("เนื้อหาบทเรียน");
  var ช่องจำนวนข้อ = document.getElementById("จำนวนข้อ");

  var ปุ่มAIออกข้อสอบ = document.getElementById("ปุ่มAIออกข้อสอบ");
  var กล่องสถานะAI = document.getElementById("กล่องสถานะAI");
  var กล่องเตือนAI = document.getElementById("กล่องเตือนAI");

  var กล่องคำถาม = document.getElementById("กล่องคำถาม");
  var ปุ่มเพิ่มข้อเอง = document.getElementById("ปุ่มเพิ่มข้อเอง");
  var ปุ่มบันทึกชุด = document.getElementById("ปุ่มบันทึกชุด");
  var กล่องเตือนบันทึก = document.getElementById("กล่องเตือนบันทึก");
  var กล่องสำเร็จ = document.getElementById("กล่องสำเร็จ");

  // ── สถานะในหน่วยความจำ ──
  var คำถามทั้งหมด = [];      // [{ questionText, choices: [{choiceText, isCorrect}] }]
  var บันทึกการเรียกAI = [];   // เก็บทุกครั้งที่เรียก AI สำเร็จ ไว้เขียนลง aiLog ตอนบันทึกจริง

  ถ้าพร้อมแล้วให้ตรวจสิทธิ์();

  function ถ้าพร้อมแล้วให้ตรวจสิทธิ์() {
    if (window.CURRENT_USER) {
      ตรวจสิทธิ์();
    } else {
      window.addEventListener("auth-ready", ตรวจสิทธิ์, { once: true });
    }
  }

  function ตรวจสิทธิ์() {
    if (window.CURRENT_USER.role !== "teacher") {
      กล่องไม่มีสิทธิ์.classList.remove("hidden");
      return;
    }
    กล่องหลัก.classList.remove("hidden");
    วาดคำถาม();
  }

  ปุ่มAIออกข้อสอบ.addEventListener("click", ให้AIออกข้อสอบ);
  ปุ่มเพิ่มข้อเอง.addEventListener("click", function () {
    คำถามทั้งหมด.push(คำถามว่าง());
    วาดคำถาม();
  });
  ปุ่มบันทึกชุด.addEventListener("click", บันทึกชุดข้อสอบ);

  function คำถามว่าง() {
    return {
      questionText: "",
      choices: [
        { choiceText: "", isCorrect: true },
        { choiceText: "", isCorrect: false },
        { choiceText: "", isCorrect: false },
        { choiceText: "", isCorrect: false }
      ]
    };
  }

  // ── เรียก AI ให้ออกข้อสอบจากเนื้อหาบทเรียน ──
  async function ให้AIออกข้อสอบ() {
    กล่องเตือนAI.classList.add("hidden");
    กล่องสถานะAI.classList.add("hidden");

    var เนื้อหา = ช่องเนื้อหาบทเรียน.value.trim();
    var จำนวนข้อ = parseInt(ช่องจำนวนข้อ.value, 10);

    if (!เนื้อหา) {
      เตือนAI("พิมพ์เนื้อหาบทเรียนก่อน จึงจะให้ AI ออกข้อสอบได้");
      return;
    }
    if (!จำนวนข้อ || จำนวนข้อ < 1 || จำนวนข้อ > 10) {
      เตือนAI("จำนวนข้อต้องเป็นตัวเลข 1–10");
      return;
    }

    ปุ่มAIออกข้อสอบ.disabled = true;
    ปุ่มAIออกข้อสอบ.textContent = "🤖 กำลังออกข้อสอบ...";

    var ข้อความระบบ =
      "คุณคือผู้ช่วยออกข้อสอบปรนัยสำหรับครู จากเนื้อหาบทเรียนที่ได้รับ " +
      "ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอกเหนือจาก JSON ห้ามใส่ ```\n" +
      "รูปแบบ JSON ต้องเป็น array ของคำถาม จำนวน " + จำนวนข้อ + " ข้อ แต่ละข้อมีรูปแบบนี้เป๊ะ:\n" +
      '{"questionText": "...", "choices": [{"choiceText": "...", "isCorrect": true}, {"choiceText": "...", "isCorrect": false}, ...]}\n' +
      "กติกา: แต่ละข้อมีตัวเลือก 4 ข้อ ต้องมี isCorrect เป็น true เพียง 1 ตัวเลือกต่อข้อเท่านั้น " +
      "คำถามและตัวเลือกต้องมาจากเนื้อหาที่ให้เท่านั้น ห้ามแต่งเรื่องนอกเนื้อหา";

    try {
      var คำตอบดิบ = await เรียกโมเดลAI([
        { role: "system", content: ข้อความระบบ },
        { role: "user", content: เนื้อหา }
      ]);

      var รายการที่ตรวจแล้ว = ตรวจโครงสร้างคำถามจากAI(คำตอบดิบ, จำนวนข้อ);

      บันทึกการเรียกAI.push({
        input: "เนื้อหาบทเรียน: " + เนื้อหา + "\nจำนวนข้อที่ขอ: " + จำนวนข้อ,
        output: คำตอบดิบ,
        createdAt: เวลาตอนนี้()
      });

      คำถามทั้งหมด = รายการที่ตรวจแล้ว;
      วาดคำถาม();
      สถานะAI("✅ AI ออกข้อสอบให้ " + รายการที่ตรวจแล้ว.length + " ข้อ — ตรวจสอบและแก้ไขได้ก่อนบันทึกจริงด้านล่าง");
    } catch (err) {
      เตือนAI("ให้ AI ออกข้อสอบไม่สำเร็จ: " + err.message);
      console.error(err);
    } finally {
      ปุ่มAIออกข้อสอบ.disabled = false;
      ปุ่มAIออกข้อสอบ.textContent = "🤖 ให้ AI ช่วยออกข้อสอบจากบทเรียนนี้";
    }
  }

  // ── ตรวจว่า AI ตอบมาเป็น JSON ที่ใช้ได้จริง — ไม่ผ่านข้อไหนโยน error ทันที ไม่บันทึกครึ่ง ๆ กลาง ๆ ──
  function ตรวจโครงสร้างคำถามจากAI(ข้อความดิบ, จำนวนข้อที่ขอ) {
    var ข้อความสะอาด = ข้อความดิบ.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();

    var แปลงแล้ว;
    try {
      แปลงแล้ว = JSON.parse(ข้อความสะอาด);
    } catch (e) {
      throw new Error("AI ไม่ได้ตอบเป็น JSON ที่อ่านได้ ลองกดใหม่อีกครั้ง");
    }

    if (!Array.isArray(แปลงแล้ว) || แปลงแล้ว.length === 0) {
      throw new Error("รูปแบบคำตอบไม่ใช่รายการคำถามที่ถูกต้อง");
    }
    if (จำนวนข้อที่ขอ && แปลงแล้ว.length !== จำนวนข้อที่ขอ) {
      throw new Error("AI ออกคำถามมา " + แปลงแล้ว.length + " ข้อ แต่ขอไป " + จำนวนข้อที่ขอ + " ข้อ ไม่ครบตามที่ขอ ลองกดใหม่อีกครั้ง");
    }

    แปลงแล้ว.forEach(function (ข้อ, ลำดับ) {
      if (!ข้อ || typeof ข้อ.questionText !== "string" || !ข้อ.questionText.trim()) {
        throw new Error("ข้อ " + (ลำดับ + 1) + " ไม่มีคำถาม");
      }
      if (!Array.isArray(ข้อ.choices) || ข้อ.choices.length < 2) {
        throw new Error("ข้อ " + (ลำดับ + 1) + " มีตัวเลือกไม่ครบ");
      }
      var จำนวนถูก = ข้อ.choices.filter(function (c) { return c && c.isCorrect === true; }).length;
      if (จำนวนถูก !== 1) {
        throw new Error("ข้อ " + (ลำดับ + 1) + " ต้องมีคำตอบถูกเพียง 1 ตัวเลือก (พบ " + จำนวนถูก + ")");
      }
      ข้อ.choices.forEach(function (c, ci) {
        if (!c || typeof c.choiceText !== "string" || !c.choiceText.trim()) {
          throw new Error("ข้อ " + (ลำดับ + 1) + " ตัวเลือกที่ " + (ci + 1) + " ไม่มีข้อความ");
        }
      });
    });

    return แปลงแล้ว.map(function (ข้อ) {
      return {
        questionText: ข้อ.questionText.trim(),
        choices: ข้อ.choices.map(function (c) { return { choiceText: c.choiceText.trim(), isCorrect: !!c.isCorrect }; })
      };
    });
  }

  // ── วาดฟอร์มคำถามที่แก้ไขได้ จาก คำถามทั้งหมด ──
  function วาดคำถาม() {
    if (คำถามทั้งหมด.length === 0) {
      กล่องคำถาม.innerHTML = "";
      return;
    }

    var html = คำถามทั้งหมด.map(function (ข้อ, qi) {
      var ตัวเลือกHtml = ข้อ.choices.map(function (c, ci) {
        return (
          '<div class="choice-row">' +
          '<input type="radio" name="ถูก-' + qi + '" data-q="' + qi + '" data-c="' + ci + '" class="choice-correct"' +
          (c.isCorrect ? " checked" : "") + ">" +
          '<input type="text" data-q="' + qi + '" data-c="' + ci + '" class="choice-text" placeholder="ตัวเลือกที่ ' + (ci + 1) + '" value="' + esc(c.choiceText) + '">' +
          "</div>"
        );
      }).join("");

      return (
        '<div class="card question-card">' +
        "<label>คำถามข้อ " + (qi + 1) + "</label>" +
        '<textarea rows="2" data-q="' + qi + '" class="q-text">' + esc(ข้อ.questionText) + "</textarea>" +
        "<label>ตัวเลือก (เลือกวงกลมหน้าอันที่ถูก)</label>" +
        ตัวเลือกHtml +
        '<div class="btn-row"><button type="button" class="btn-danger" data-remove-q="' + qi + '">ลบข้อนี้</button></div>' +
        "</div>"
      );
    }).join("");

    กล่องคำถาม.innerHTML = html;
  }

  // ── event delegation: แก้ไขคำถาม/ตัวเลือก/ลบข้อ ──
  กล่องคำถาม.addEventListener("input", function (e) {
    var qi = e.target.dataset.q;
    if (qi == null) return;
    qi = parseInt(qi, 10);

    if (e.target.classList.contains("q-text")) {
      คำถามทั้งหมด[qi].questionText = e.target.value;
    } else if (e.target.classList.contains("choice-text")) {
      var ci = parseInt(e.target.dataset.c, 10);
      คำถามทั้งหมด[qi].choices[ci].choiceText = e.target.value;
    }
  });

  กล่องคำถาม.addEventListener("change", function (e) {
    if (!e.target.classList.contains("choice-correct")) return;
    var qi = parseInt(e.target.dataset.q, 10);
    var ci = parseInt(e.target.dataset.c, 10);
    คำถามทั้งหมด[qi].choices.forEach(function (c, i) { c.isCorrect = (i === ci); });
  });

  กล่องคำถาม.addEventListener("click", function (e) {
    var qi = e.target.dataset.removeQ;
    if (qi == null) return;
    คำถามทั้งหมด.splice(parseInt(qi, 10), 1);
    วาดคำถาม();
  });

  // ── บันทึกชุดข้อสอบจริงลง Firestore ──
  async function บันทึกชุดข้อสอบ() {
    กล่องเตือนบันทึก.classList.add("hidden");
    กล่องสำเร็จ.classList.add("hidden");

    var ชื่อชุด = ช่องชื่อชุด.value.trim();
    var คะแนนเต็ม = parseInt(ช่องคะแนนเต็ม.value, 10);

    if (!ชื่อชุด) {
      เตือนบันทึก("พิมพ์ชื่อชุดข้อสอบก่อน");
      return;
    }
    if (!คะแนนเต็ม || คะแนนเต็ม <= 0) {
      เตือนบันทึก("คะแนนเต็มต้องเป็นตัวเลขมากกว่า 0");
      return;
    }
    if (คำถามทั้งหมด.length === 0) {
      เตือนบันทึก("ต้องมีอย่างน้อย 1 ข้อ ก่อนบันทึก");
      return;
    }

    // ตรวจซ้ำจากค่าที่แก้ในฟอร์มจริง ก่อนเขียนลงฐาน — กันกรณีครูลบข้อความจนว่างเปล่าหลัง AI เติมให้
    for (var i = 0; i < คำถามทั้งหมด.length; i++) {
      var ข้อ = คำถามทั้งหมด[i];
      if (!ข้อ.questionText.trim()) {
        เตือนบันทึก("ข้อ " + (i + 1) + " ยังไม่มีคำถาม");
        return;
      }
      var มีตัวเลือกว่าง = ข้อ.choices.some(function (c) { return !c.choiceText.trim(); });
      if (มีตัวเลือกว่าง) {
        เตือนบันทึก("ข้อ " + (i + 1) + " มีตัวเลือกที่ยังไม่ได้กรอก");
        return;
      }
      var จำนวนถูก = ข้อ.choices.filter(function (c) { return c.isCorrect; }).length;
      if (จำนวนถูก !== 1) {
        เตือนบันทึก("ข้อ " + (i + 1) + " ต้องเลือกคำตอบที่ถูก 1 ข้อ");
        return;
      }
    }

    ปุ่มบันทึกชุด.disabled = true;
    ปุ่มบันทึกชุด.textContent = "กำลังบันทึก...";

    try {
      var เอกสารใหม่ = window.fsDoc(window.fsCollection(window.db, "quizSets"));
      await window.fsSetDoc(เอกสารใหม่, {
        title: ชื่อชุด,
        format: "mcq",
        fullScore: คะแนนเต็ม,
        creationSource: บันทึกการเรียกAI.length > 0 ? "ai" : "teacher",
        gradingMethod: "auto",
        questions: คำถามทั้งหมด,
        createdByTeacherId: window.CURRENT_USER.uid,
        createdByTeacherName: window.CURRENT_USER.name,
        createdAt: เวลาตอนนี้()
      });

      for (var j = 0; j < บันทึกการเรียกAI.length; j++) {
        await window.fsSetDoc(
          window.fsDoc(window.db, "quizSets", เอกสารใหม่.id, "aiLog", "log-" + Date.now() + "-" + j),
          บันทึกการเรียกAI[j]
        );
      }

      กล่องสำเร็จ.textContent = "✅ บันทึกชุดข้อสอบ \"" + ชื่อชุด + "\" สำเร็จแล้ว (" + คำถามทั้งหมด.length + " ข้อ)";
      กล่องสำเร็จ.classList.remove("hidden");
    } catch (err) {
      เตือนบันทึก("บันทึกไม่สำเร็จ: " + err.message);
      console.error(err);
    } finally {
      ปุ่มบันทึกชุด.disabled = false;
      ปุ่มบันทึกชุด.textContent = "บันทึกชุดข้อสอบ";
    }
  }

  function เตือนAI(ข้อความ) {
    กล่องเตือนAI.textContent = "⚠️ " + ข้อความ;
    กล่องเตือนAI.classList.remove("hidden");
  }

  function สถานะAI(ข้อความ) {
    กล่องสถานะAI.textContent = ข้อความ;
    กล่องสถานะAI.classList.remove("hidden");
  }

  function เตือนบันทึก(ข้อความ) {
    กล่องเตือนบันทึก.textContent = "⚠️ " + ข้อความ;
    กล่องเตือนบันทึก.classList.remove("hidden");
  }
})();
