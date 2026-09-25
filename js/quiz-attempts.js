// ─────────────────────────────────────────────────────────────
// js/quiz-attempts.js — หน้ารายการการส่งงาน/ทำแบบทดสอบ (quizAttempts)
// อ่านจาก Firestore จริง (โฟลเดอร์หลัก quizAttempts) ไม่ใช่ข้อมูลฝังในไฟล์
// student: เห็นเฉพาะของตัวเอง (query กรองด้วย studentId == uid ตัวเอง)
// teacher: เห็นของทุกคน จัดเป็นกลุ่ม/accordion แยกตามนักเรียน (studentNickname)
// ─────────────────────────────────────────────────────────────

(function () {
  var กล่อง = document.getElementById("ผลลัพธ์");

  ถ้าพร้อมแล้วให้โหลด();

  // ต้องรอทั้ง Firebase เชื่อมต่อเสร็จ (window.db) และรู้ตัวตน/บทบาทผู้ใช้ก่อน
  // (window.CURRENT_USER มาจาก auth-guard.js) เพราะ query ของ student ต้องใช้ uid กรอง
  function ถ้าพร้อมแล้วให้โหลด() {
    if (window.CURRENT_USER) {
      เริ่มหลังรู้บทบาท();
    } else {
      window.addEventListener("auth-ready", เริ่มหลังรู้บทบาท, { once: true });
    }
  }

  function เริ่มหลังรู้บทบาท() {
    // ลิงก์ "ใส่ข้อมูลตัวอย่าง" ซ่อนไว้ตั้งแต่ต้นใน HTML แล้ว (class="hidden")
    // โชว์เฉพาะ teacher ไว้ใช้เตรียมข้อมูลทดสอบ — student ไม่ควรเห็นเครื่องมือ dev นี้
    if (window.CURRENT_USER.role === "teacher") {
      var ลิงก์ = document.getElementById("ลิงก์ใส่ข้อมูลตัวอย่าง");
      if (ลิงก์) ลิงก์.classList.remove("hidden");
    }
    โหลดข้อมูล();
  }

  async function โหลดข้อมูล() {
    try {
      var เป็นครู = window.CURRENT_USER.role === "teacher";
      var รายการทั้งหมด;

      if (เป็นครู) {
        // teacher: เห็นของทุกคน (ยังเรียงตาม submittedAt ที่ Firestore ได้เพราะเป็น field เดียว)
        var qครู = window.fsQuery(
          window.fsCollection(window.db, "quizAttempts"),
          window.fsOrderBy("submittedAt", "desc")
        );
        var สแนปช็อตครู = await window.fsGetDocs(qครู);
        รายการทั้งหมด = [];
        สแนปช็อตครู.forEach(function (เอกสาร) {
          var ข้อมูล = เอกสาร.data();
          ข้อมูล.id = เอกสาร.id;
          รายการทั้งหมด.push(ข้อมูล);
        });
      } else {
        // student: กรองเฉพาะของตัวเอง (studentId == uid) — ไม่ใช้ orderBy ร่วมกับ where
        // ต่าง field กัน (ต้องสร้าง composite index) จึงเรียงลำดับฝั่ง JS แทน
        var qนักเรียน = window.fsQuery(
          window.fsCollection(window.db, "quizAttempts"),
          window.fsWhere("studentId", "==", window.CURRENT_USER.uid)
        );
        var สแนปช็อตนักเรียน = await window.fsGetDocs(qนักเรียน);
        รายการทั้งหมด = [];
        สแนปช็อตนักเรียน.forEach(function (เอกสาร) {
          var ข้อมูล = เอกสาร.data();
          ข้อมูล.id = เอกสาร.id;
          รายการทั้งหมด.push(ข้อมูล);
        });
        รายการทั้งหมด.sort(function (a, b) {
          return (b.submittedAt || "").localeCompare(a.submittedAt || "");
        });
      }

      // ถ้ามีสถานะติดมาท้าย URL ให้กรองเฉพาะสถานะนั้น (ใช้ได้ทั้ง 2 บทบาท)
      var สถานะที่กรอง = ค่าจากURL("status");
      if (สถานะที่กรอง) {
        รายการทั้งหมด = รายการทั้งหมด.filter(function (a) { return a.status === สถานะที่กรอง; });
        document.querySelector(".subtitle").textContent =
          "กำลังแสดงเฉพาะสถานะ " + สถานะที่กรอง + " · รีเฟรชหน้าเพื่อดูทั้งหมด";
      }

      if (เป็นครู) {
        แสดงกลุ่มตามนักเรียน(รายการทั้งหมด);
      } else {
        แสดงตารางของตัวเอง(รายการทั้งหมด);
      }
    } catch (err) {
      กล่อง.innerHTML = "<p>โหลดข้อมูลไม่สำเร็จ: " + esc(err.message) + "</p>";
      console.error(err);
    }
  }

  // ── student: ตารางแบนเหมือนเดิม แต่เป็นของตัวเองเท่านั้น ──
  function แสดงตารางของตัวเอง(รายการ) {
    if (รายการ.length === 0) {
      กล่อง.innerHTML = "<p>คุณยังไม่มีงานที่ส่งเลย</p>";
      return;
    }
    กล่อง.innerHTML = สร้างตาราง(รายการ);
    ผูกคลิกแถว(กล่อง);
  }

  // ── teacher: จัดกลุ่ม/accordion แยกตามนักเรียน (หัวข้อกลุ่ม = studentNickname) ──
  function แสดงกลุ่มตามนักเรียน(รายการ) {
    if (รายการ.length === 0) {
      กล่อง.innerHTML = "<p>ยังไม่มีการส่งงานในระบบ</p>";
      return;
    }

    var กลุ่ม = {};
    var ลำดับชื่อ = [];
    รายการ.forEach(function (a) {
      var ชื่อ = a.studentNickname == null ? "" : a.studentNickname;
      if (!กลุ่ม[ชื่อ]) {
        กลุ่ม[ชื่อ] = [];
        ลำดับชื่อ.push(ชื่อ);
      }
      กลุ่ม[ชื่อ].push(a);
    });
    ลำดับชื่อ.sort(function (a, b) { return a.localeCompare(b, "th"); });

    var html = "";
    ลำดับชื่อ.forEach(function (ชื่อ) {
      var งานของนักเรียนคนนี้ = กลุ่ม[ชื่อ];
      html +=
        '<details class="accordion-group">' +
        '<summary class="accordion-header">' +
        "<span>" + esc(ชื่อ) + "</span>" +
        '<span class="count">' + งานของนักเรียนคนนี้.length + " รายการ</span>" +
        "</summary>" +
        '<div class="accordion-body">' + สร้างตาราง(งานของนักเรียนคนนี้) + "</div>" +
        "</details>";
    });

    กล่อง.innerHTML = html;
    ผูกคลิกแถว(กล่อง);
  }

  function สร้างตาราง(รายการ) {
    var html =
      "<table><thead><tr>" +
      "<th>นักเรียน</th>" +
      "<th>ชุดที่ทำ</th>" +
      "<th>สถานะ</th>" +
      '<th class="hide-mobile">คะแนน</th>' +
      '<th class="hide-mobile">ส่งเมื่อ</th>' +
      "</tr></thead><tbody>";

    รายการ.forEach(function (a) {
      html +=
        '<tr class="clickable-row" data-id="' + esc(a.id) + '">' +
        "<td>" + esc(a.studentNickname) + "</td>" +
        "<td>" + esc(a.quizSetTitle) + "</td>" +
        "<td>" + ป้ายสถานะ(a.status) + "</td>" +
        '<td class="hide-mobile">' + (a.scoreAwarded == null ? "—" : esc(a.scoreAwarded)) + "</td>" +
        '<td class="hide-mobile">' + esc(a.submittedAt) + "</td>" +
        "</tr>";
    });

    html += "</tbody></table>";
    return html;
  }

  function ผูกคลิกแถว(ที่วาง) {
    ที่วาง.querySelectorAll("[data-id]").forEach(function (แถว) {
      แถว.addEventListener("click", function () {
        location.href = "quiz-attempt-detail.html?id=" + encodeURIComponent(แถว.dataset.id);
      });
    });
  }
})();
