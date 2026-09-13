// ─────────────────────────────────────────────────────────────
// js/quiz-sets.js — รายการชุดข้อสอบทั้งหมด (ให้ครูดูว่าสร้างอะไรไปแล้วบ้าง)
// คลิกแถวใดก็ได้เพื่อกางดูคำถาม/ตัวเลือกทั้งชุด
// ─────────────────────────────────────────────────────────────

(function () {
  var กล่อง = document.getElementById("ผลลัพธ์");
  var รายการทั้งหมด = [];
  var กางอยู่ = {};   // { [quizSetId]: true } — จำว่าแถวไหนกางอยู่

  ถ้าพร้อมแล้วให้โหลด();

  function ถ้าพร้อมแล้วให้โหลด() {
    if (window.db) {
      โหลดข้อมูล();
    } else {
      window.addEventListener("firebase-ready", โหลดข้อมูล, { once: true });
    }
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

    var html =
      "<table><thead><tr>" +
      "<th>ชื่อชุด</th><th>ประเภท</th><th>คะแนนเต็ม</th>" +
      '<th class="hide-mobile">ที่มา</th><th class="hide-mobile">จำนวนข้อ</th>' +
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
        "</tr>" +
        '<tr id="แถวกาง-' + esc(q.id) + '" class="hidden"><td colspan="5">' + วาดคำถาม(q) + "</td></tr>";
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
    return q.questions.map(function (ข้อ, qi) {
      var ตัวเลือก = ข้อ.choices.map(function (c) {
        return "<li" + (c.isCorrect ? ' style="font-weight:600"' : "") + ">" +
               esc(c.choiceText) + (c.isCorrect ? " ✅" : "") + "</li>";
      }).join("");
      return (
        "<p><strong>ข้อ " + (qi + 1) + ".</strong> " + esc(ข้อ.questionText) + "</p>" +
        "<ul>" + ตัวเลือก + "</ul>"
      );
    }).join("<hr>");
  }
})();
