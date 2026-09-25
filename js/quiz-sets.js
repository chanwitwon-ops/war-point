// ─────────────────────────────────────────────────────────────
// js/quiz-sets.js — รายการชุดข้อสอบทั้งหมด (ให้ครูดูว่าสร้างอะไรไปแล้วบ้าง)
// คลิกแถวใดก็ได้เพื่อกางดูคำถาม/ตัวเลือกทั้งชุด
// ─────────────────────────────────────────────────────────────

(function () {
  var กล่อง = document.getElementById("ผลลัพธ์");
  var รายการทั้งหมด = [];
  var กางอยู่ = {};   // { [quizSetId]: true } — จำว่าแถวไหนกางอยู่

  ถ้าพร้อมแล้วให้โหลด();

  // ต้องรอ auth-ready (ไม่ใช่แค่ firebase-ready) เพราะการวาดตารางต้องรู้บทบาทผู้ใช้
  // ก่อน — ใช้ตัดสินว่าจะแสดงลิงก์ "ทำแบบทดสอบนี้" ต่อแถวหรือไม่ (เฉพาะ student)
  function ถ้าพร้อมแล้วให้โหลด() {
    if (window.CURRENT_USER) {
      เริ่มหลังรู้บทบาท();
    } else {
      window.addEventListener("auth-ready", เริ่มหลังรู้บทบาท, { once: true });
    }
  }

  function เริ่มหลังรู้บทบาท() {
    // ลิงก์ "+ สร้างชุดข้อสอบใหม่ (AI)" ซ่อนไว้ตั้งแต่ต้นใน HTML แล้ว (class="hidden")
    // โชว์เฉพาะ teacher เท่านั้น — student กดเข้าไปก็โดนกันที่หน้า quiz-set-new.html
    // อยู่แล้ว (ตรวจสิทธิ์() ใน quiz-set-new.js) แต่ไม่ควรมีลิงก์ให้กดตั้งแต่แรก
    if (window.CURRENT_USER.role === "teacher") {
      var ลิงก์ = document.getElementById("ลิงก์สร้างชุดใหม่");
      if (ลิงก์) ลิงก์.classList.remove("hidden");
    }
    โหลดข้อมูล();
  }

  async function โหลดข้อมูล() {
    try {
      var สแนปช็อต = await window.fsGetDocs(window.fsCollection(window.db, "quizSets"));
      รายการทั้งหมด = [];
      สแนปช็อต.forEach(function (เอกสาร) {
        var ข้อมูล = เอกสาร.data();
        ข้อมูล.id = เอกสาร.id;
        รายการทั้งหมด.push(ข้อมูล);
      });
      วาดตาราง();
    } catch (err) {
      กล่อง.innerHTML = "<p>โหลดข้อมูลไม่สำเร็จ: " + esc(err.message) + "</p>";
      console.error(err);
    }
  }

  var ป้ายที่มา = { ai: "🤖 AI ช่วยออก", teacher: "ครูพิมพ์เอง" };
  var ป้ายฟอร์แมต = { mcq: "ปรนัย", worksheet: "ใบงาน", attachment: "แนบไฟล์" };

  function วาดตาราง() {
    if (รายการทั้งหมด.length === 0) {
      กล่อง.innerHTML = "<p>ยังไม่มีชุดข้อสอบในระบบ</p>";
      return;
    }

    // นักเรียนเท่านั้นที่ต้องทำแบบทดสอบ — ครูสร้างชุดข้อสอบ ไม่ต้องทำเอง
    var เป็นนักเรียน = window.CURRENT_USER && window.CURRENT_USER.role === "student";
    var จำนวนคอลัมน์ = เป็นนักเรียน ? 6 : 5;

    var html =
      "<table><thead><tr>" +
      "<th>ชื่อชุด</th><th>ประเภท</th><th>คะแนนเต็ม</th>" +
      '<th class="hide-mobile">ที่มา</th><th class="hide-mobile">จำนวนข้อ</th>' +
      (เป็นนักเรียน ? "<th></th>" : "") +
      "</tr></thead><tbody>";

    รายการทั้งหมด.forEach(function (q) {
      var จำนวนข้อ = Array.isArray(q.questions) ? q.questions.length : "—";
      html +=
        '<tr class="clickable-row" data-id="' + esc(q.id) + '">' +
        "<td>" + esc(q.title) + "</td>" +
        "<td>" + esc(ป้ายฟอร์แมต[q.format] || q.format) + "</td>" +
        "<td>" + esc(q.fullScore) + "</td>" +
        '<td class="hide-mobile">' + esc(ป้ายที่มา[q.creationSource] || q.creationSource || "—") + "</td>" +
        '<td class="hide-mobile">' + esc(จำนวนข้อ) + "</td>" +
        (เป็นนักเรียน
          ? '<td><a class="btn-ghost" href="quiz-attempt-new.html?quizSetId=' + esc(q.id) +
            '" onclick="event.stopPropagation()">ทำแบบทดสอบนี้</a></td>'
          : "") +
        "</tr>" +
        '<tr id="แถวกาง-' + esc(q.id) + '" class="hidden"><td colspan="' + จำนวนคอลัมน์ + '">' + วาดคำถาม(q) + "</td></tr>";
    });

    html += "</tbody></table>";
    กล่อง.innerHTML = html;

    กล่อง.querySelectorAll("tr.clickable-row").forEach(function (แถว) {
      แถว.addEventListener("click", function () {
        var id = แถว.dataset.id;
        กางอยู่[id] = !กางอยู่[id];
        document.getElementById("แถวกาง-" + id).classList.toggle("hidden", !กางอยู่[id]);
      });
    });
  }

  function วาดคำถาม(q) {
    if (!Array.isArray(q.questions) || q.questions.length === 0) {
      return "<p>ชุดนี้ยังไม่มีคำถาม</p>";
    }
    // เฉลย (isCorrect) โชว์ได้เฉพาะ teacher เท่านั้น — นักเรียนเห็นแล้วจะไปทำ
    // ข้อสอบชุดนี้ต่อได้คะแนนเต็มทุกครั้งโดยไม่ต้องตอบจริง (quiz-attempt-new.html)
    var เป็นครู = window.CURRENT_USER && window.CURRENT_USER.role === "teacher";
    return q.questions.map(function (ข้อ, qi) {
      var ตัวเลือก = ข้อ.choices.map(function (c) {
        var ถูกและเป็นครู = เป็นครู && c.isCorrect;
        return "<li" + (ถูกและเป็นครู ? ' style="font-weight:600"' : "") + ">" +
               esc(c.choiceText) + (ถูกและเป็นครู ? " ✅" : "") + "</li>";
      }).join("");
      return (
        "<p><strong>ข้อ " + (qi + 1) + ".</strong> " + esc(ข้อ.questionText) + "</p>" +
        "<ul>" + ตัวเลือก + "</ul>"
      );
    }).join("<hr>");
  }
})();
