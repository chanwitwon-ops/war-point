// ─────────────────────────────────────────────────────────────
// js/quiz-set-edit.js — หน้าครูแก้ไข/ลบชุดข้อสอบที่มีอยู่แล้ว (BACKLOG.md)
// โหลด quizSets/{id} มาแก้ไขคำถาม/ตัวเลือก/ชื่อ/คะแนนเต็ม แล้วบันทึกทับ หรือลบทิ้งทั้งชุด
// รองรับ format "mcq" + ชุดตรวจมือ "worksheet"/"attachment" (เพิ่ม 2026-11-10 สเปก 01 หัวข้อ ฉ.)
//   - เปลี่ยนประเภทชุดไม่ได้ (กันงานที่ส่งแล้วพัง)
//   - ชุดตรวจมือ: แก้ชื่อ/คะแนนเต็ม/จำนวนครั้ง/คำสั่งงาน · คะแนนเต็มล็อกเมื่อมีนักเรียนส่งงานแล้ว
//     (กันคะแนนเกินเต็ม และแต้มสัตว์เลี้ยงที่ใช้ไปแล้วติดลบ) — ล็อกที่หน้าเว็บ rules ไม่ได้นับงาน
//   - format อื่นที่ไม่รู้จัก เตือนว่าแก้ผ่านหน้านี้ไม่ได้ แทนที่จะแก้พังโครงสร้างข้อมูล
// ─────────────────────────────────────────────────────────────

(function () {
  var quizSetId = ค่าจากURL("id");

  var กล่องกำลังโหลด = document.getElementById("กล่องกำลังโหลด");
  var กล่องไม่มีสิทธิ์ = document.getElementById("กล่องไม่มีสิทธิ์");
  var กล่องไม่พบ = document.getElementById("กล่องไม่พบ");
  var ข้อความไม่พบ = document.getElementById("ข้อความไม่พบ");
  var กล่องหลัก = document.getElementById("กล่องหลัก");

  var ช่องชื่อชุด = document.getElementById("ชื่อชุด");
  var ช่องคะแนนเต็ม = document.getElementById("คะแนนเต็ม");
  var ช่องจำนวนครั้ง = document.getElementById("จำนวนครั้ง");
  var กล่องคำถาม = document.getElementById("กล่องคำถาม");
  var ปุ่มเพิ่มข้อเอง = document.getElementById("ปุ่มเพิ่มข้อเอง");
  var ปุ่มบันทึก = document.getElementById("ปุ่มบันทึก");
  var ปุ่มลบ = document.getElementById("ปุ่มลบ");
  var กล่องเตือนบันทึก = document.getElementById("กล่องเตือนบันทึก");
  var กล่องสำเร็จ = document.getElementById("กล่องสำเร็จ");

  var ข้อความประเภท = document.getElementById("ข้อความประเภท");
  var หมายเหตุคะแนนเต็ม = document.getElementById("หมายเหตุคะแนนเต็ม");
  var ป้ายจำนวนครั้ง = document.getElementById("ป้ายจำนวนครั้ง");
  var ส่วนคำสั่งงาน = document.getElementById("ส่วนคำสั่งงาน");
  var ช่องคำสั่งงาน = document.getElementById("คำสั่งงาน");
  var ตัวนับคำสั่งงาน = document.getElementById("ตัวนับคำสั่งงาน");

  var ชุดข้อสอบเดิม = null;
  var คำถามทั้งหมด = [];
  var เป็นตรวจมือ = false;
  var ล็อกคะแนนเต็ม = false;

  var ชื่อประเภท = { mcq: "ปรนัย (ตรวจอัตโนมัติ)", worksheet: "ใบงาน (ครูตรวจเอง)", attachment: "แนบไฟล์ (ครูตรวจเอง)" };

  function อัปเดตตัวนับ() {
    ตัวนับคำสั่งงาน.textContent =
      ช่องคำสั่งงาน.value.length.toLocaleString("en-US") + " / " +
      ความยาวคำสั่งงานสูงสุด.toLocaleString("en-US") + " ตัวอักษร";
  }
  ช่องคำสั่งงาน.addEventListener("input", อัปเดตตัวนับ);

  // นับงานที่นักเรียนส่งชุดนี้แล้ว (ครูอ่าน quizAttempts ได้ทั้งหมดตาม rules)
  async function นับงานที่ส่งแล้ว() {
    var ผล = await window.fsGetDocs(window.fsQuery(
      window.fsCollection(window.db, "quizAttempts"),
      window.fsWhere("quizSetId", "==", quizSetId)
    ));
    return ผล.size;
  }

  function ตั้งล็อกคะแนนเต็ม(จำนวนงาน) {
    ล็อกคะแนนเต็ม = จำนวนงาน > 0;
    ช่องคะแนนเต็ม.disabled = ล็อกคะแนนเต็ม;
    หมายเหตุคะแนนเต็ม.classList.toggle("hidden", !ล็อกคะแนนเต็ม);
    if (ล็อกคะแนนเต็ม) {
      หมายเหตุคะแนนเต็ม.textContent = "🔒 คะแนนเต็มล็อกแล้ว เพราะนักเรียนส่งงานชุดนี้แล้ว " + จำนวนงาน +
        " ชิ้น — กันคะแนนที่ตรวจไปแล้วเกินเต็มและแต้มสัตว์เลี้ยงที่ใช้ไปแล้วติดลบ ถ้าต้องเปลี่ยนจริงให้สร้างชุดใหม่";
    }
  }

  ถ้าพร้อมแล้วให้เริ่ม();

  function ถ้าพร้อมแล้วให้เริ่ม() {
    if (window.CURRENT_USER) {
      เริ่ม();
    } else {
      window.addEventListener("auth-ready", เริ่ม, { once: true });
    }
  }

  function เริ่ม() {
    กล่องกำลังโหลด.classList.add("hidden");

    if (window.CURRENT_USER.role !== "teacher") {
      กล่องไม่มีสิทธิ์.classList.remove("hidden");
      return;
    }
    if (!quizSetId) {
      แสดงไม่พบ("ไม่พบรหัสชุดข้อสอบในลิงก์ — กลับไปเลือกจากหน้ารายการชุดข้อสอบใหม่");
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
      ชุดข้อสอบเดิม = สแนปช็อต.data();

      เป็นตรวจมือ = เป็นชุดตรวจมือ(ชุดข้อสอบเดิม.format);
      if (ชุดข้อสอบเดิม.format !== "mcq" && !เป็นตรวจมือ) {
        แสดงไม่พบ('ชุดนี้เป็นฟอร์แมต "' + (ชุดข้อสอบเดิม.format || "ไม่ทราบ") + '" — หน้านี้แก้ไขได้เฉพาะปรนัย ใบงาน และแนบไฟล์');
        return;
      }

      ข้อความประเภท.textContent = "ประเภท: " + ชื่อประเภท[ชุดข้อสอบเดิม.format] + " — เปลี่ยนประเภทไม่ได้ ถ้าต้องการประเภทอื่นให้สร้างชุดใหม่";
      ช่องชื่อชุด.value = ชุดข้อสอบเดิม.title || "";
      ช่องคะแนนเต็ม.value = ชุดข้อสอบเดิม.fullScore != null ? ชุดข้อสอบเดิม.fullScore : "";
      ช่องจำนวนครั้ง.value = จำนวนครั้งที่ทำได้(ชุดข้อสอบเดิม);

      if (เป็นตรวจมือ) {
        ส่วนคำสั่งงาน.classList.remove("hidden");
        กล่องคำถาม.classList.add("hidden");
        ปุ่มเพิ่มข้อเอง.classList.add("hidden");
        ป้ายจำนวนครั้ง.textContent = "นักเรียนส่งได้กี่ครั้ง (1–10 · ทุกครั้งที่ส่งคืองานที่ครูต้องตรวจ · นับคะแนนรอบดีที่สุด)";
        ช่องคำสั่งงาน.value = ชุดข้อสอบเดิม.instructions || "";
        อัปเดตตัวนับ();
        ตั้งล็อกคะแนนเต็ม(await นับงานที่ส่งแล้ว());
        if (typeof window.ติดปุ่มไมค์ === "function") {
          window.ติดปุ่มไมค์(ช่องคำสั่งงาน, document.getElementById("ปุ่มไมค์คำสั่งงาน"), document.getElementById("กล่องสถานะไมค์"));
        }
        กล่องหลัก.classList.remove("hidden");
        return;
      }
      คำถามทั้งหมด = (Array.isArray(ชุดข้อสอบเดิม.questions) ? ชุดข้อสอบเดิม.questions : []).map(function (ข้อ) {
        return {
          questionText: ข้อ.questionText || "",
          choices: (Array.isArray(ข้อ.choices) ? ข้อ.choices : []).map(function (c) {
            return { choiceText: c.choiceText || "", isCorrect: !!c.isCorrect };
          })
        };
      });

      วาดคำถาม();
      กล่องหลัก.classList.remove("hidden");
    } catch (err) {
      แสดงไม่พบ("โหลดชุดข้อสอบไม่สำเร็จ: " + err.message);
      console.error(err);
    }
  }

  ปุ่มเพิ่มข้อเอง.addEventListener("click", function () {
    คำถามทั้งหมด.push(คำถามว่าง());
    วาดคำถาม();
  });
  ปุ่มบันทึก.addEventListener("click", บันทึกการแก้ไข);
  ปุ่มลบ.addEventListener("click", ลบชุดข้อสอบ);

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

  // ── วาดฟอร์มคำถามที่แก้ไขได้ (แพทเทิร์นเดียวกับ js/quiz-set-new.js) ──
  function วาดคำถาม() {
    if (คำถามทั้งหมด.length === 0) {
      กล่องคำถาม.innerHTML = "<p>ชุดนี้ยังไม่มีคำถามเลย — กดเพิ่มข้อด้านล่าง</p>";
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

  // ── บันทึกทับชุดเดิม (ไม่กระทบ quizAttempts ที่ทำไปแล้ว เพราะคะแนนที่ตรวจแล้วถูกบันทึก
  // แยกไว้ใน quizAttempts.scoreAwarded ไม่ได้อ้างอิงกลับมาที่ questions ของ quizSets) ──
  async function บันทึกการแก้ไข() {
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
    var จำนวนครั้ง = Number(ช่องจำนวนครั้ง.value.trim());
    if (!Number.isInteger(จำนวนครั้ง) || จำนวนครั้ง < 1 || จำนวนครั้ง > จำนวนครั้งสูงสุดที่ตั้งได้) {
      เตือนบันทึก("จำนวนครั้งที่ทำได้ต้องเป็นตัวเลข 1–" + จำนวนครั้งสูงสุดที่ตั้งได้);
      return;
    }

    if (เป็นตรวจมือ) {
      await บันทึกชุดตรวจมือ(ชื่อชุด, คะแนนเต็ม, จำนวนครั้ง);
      return;
    }

    if (คำถามทั้งหมด.length === 0) {
      เตือนบันทึก("ต้องมีอย่างน้อย 1 ข้อ ก่อนบันทึก");
      return;
    }

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

    ปุ่มบันทึก.disabled = true;
    ปุ่มบันทึก.textContent = "กำลังบันทึก...";

    try {
      await window.fsUpdateDoc(window.fsDoc(window.db, "quizSets", quizSetId), {
        title: ชื่อชุด,
        fullScore: คะแนนเต็ม,
        maxAttempts: จำนวนครั้ง,
        questions: คำถามทั้งหมด
      });
      กล่องสำเร็จ.textContent = "✅ บันทึกการแก้ไขสำเร็จแล้ว";
      กล่องสำเร็จ.classList.remove("hidden");
    } catch (err) {
      เตือนบันทึก("บันทึกไม่สำเร็จ: " + err.message);
      console.error(err);
    } finally {
      ปุ่มบันทึก.disabled = false;
      ปุ่มบันทึก.textContent = "บันทึกการแก้ไข";
    }
  }

  async function บันทึกชุดตรวจมือ(ชื่อชุด, คะแนนเต็ม, จำนวนครั้ง) {
    var คำสั่งงาน = ช่องคำสั่งงาน.value.trim();
    if (!คำสั่งงาน) {
      เตือนบันทึก("พิมพ์ (หรือพูด) คำสั่งงานก่อน — นักเรียนจะได้รู้ว่าต้องทำอะไร");
      return;
    }
    if (คำสั่งงาน.length > ความยาวคำสั่งงานสูงสุด) {
      เตือนบันทึก("คำสั่งงานยาวเกิน " + ความยาวคำสั่งงานสูงสุด.toLocaleString("en-US") + " ตัวอักษร");
      return;
    }

    ปุ่มบันทึก.disabled = true;
    ปุ่มบันทึก.textContent = "กำลังบันทึก...";

    try {
      var ข้อมูล = { title: ชื่อชุด, maxAttempts: จำนวนครั้ง, instructions: คำสั่งงาน };
      // ตรวจซ้ำตอนกดบันทึก — ระหว่างเปิดหน้าอยู่อาจมีนักเรียนเพิ่งส่ง
      var จำนวนงาน = await นับงานที่ส่งแล้ว();
      if (จำนวนงาน > 0) {
        if (!ล็อกคะแนนเต็ม) ตั้งล็อกคะแนนเต็ม(จำนวนงาน);
        if (คะแนนเต็ม !== ชุดข้อสอบเดิม.fullScore) {
          ช่องคะแนนเต็ม.value = ชุดข้อสอบเดิม.fullScore;
          เตือนบันทึก("เปลี่ยนคะแนนเต็มไม่ได้แล้ว เพราะมีนักเรียนส่งงาน " + จำนวนงาน + " ชิ้น — คืนค่าเดิมให้แล้ว กดบันทึกอีกครั้งเพื่อบันทึกส่วนอื่น");
          return;
        }
      } else {
        ข้อมูล.fullScore = คะแนนเต็ม;
      }

      await window.fsUpdateDoc(window.fsDoc(window.db, "quizSets", quizSetId), ข้อมูล);
      Object.assign(ชุดข้อสอบเดิม, ข้อมูล);
      กล่องสำเร็จ.textContent = "✅ บันทึกการแก้ไขสำเร็จแล้ว";
      กล่องสำเร็จ.classList.remove("hidden");
    } catch (err) {
      เตือนบันทึก("บันทึกไม่สำเร็จ: " + err.message);
      console.error(err);
    } finally {
      ปุ่มบันทึก.disabled = false;
      ปุ่มบันทึก.textContent = "บันทึกการแก้ไข";
    }
  }

  async function ลบชุดข้อสอบ() {
    กล่องเตือนบันทึก.classList.add("hidden");

    var ยืนยัน = confirm(
      'ลบชุดข้อสอบ "' + (ชุดข้อสอบเดิม ? ชุดข้อสอบเดิม.title : "") + '" ถาวร?\n' +
      "การกระทำนี้ย้อนกลับไม่ได้ — งานที่นักเรียนเคยส่งไว้ (quizAttempts) จะยังอยู่ แต่จะไม่เห็นว่ามาจากชุดไหน"
    );
    if (!ยืนยัน) return;

    ปุ่มลบ.disabled = true;
    ปุ่มลบ.textContent = "กำลังลบ...";

    try {
      await window.fsDeleteDoc(window.fsDoc(window.db, "quizSets", quizSetId));
      location.href = "quiz-sets.html";
    } catch (err) {
      เตือนบันทึก("ลบไม่สำเร็จ: " + err.message);
      console.error(err);
      ปุ่มลบ.disabled = false;
      ปุ่มลบ.textContent = "ลบชุดข้อสอบนี้";
    }
  }

  function แสดงไม่พบ(ข้อความ) {
    ข้อความไม่พบ.textContent = ข้อความ;
    กล่องไม่พบ.classList.remove("hidden");
  }

  function เตือนบันทึก(ข้อความ) {
    กล่องเตือนบันทึก.textContent = "⚠️ " + ข้อความ;
    กล่องเตือนบันทึก.classList.remove("hidden");
  }
})();
