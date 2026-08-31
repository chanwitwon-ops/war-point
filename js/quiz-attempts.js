// ─────────────────────────────────────────────────────────────
// js/quiz-attempts.js — หน้ารายการการส่งงาน/ทำแบบทดสอบ (quizAttempts)
// อ่านจาก Firestore จริง (โฟลเดอร์หลัก quizAttempts) ไม่ใช่ข้อมูลฝังในไฟล์
// ─────────────────────────────────────────────────────────────

(function () {
  var กล่อง = document.getElementById("ผลลัพธ์");

  ถ้าพร้อมแล้วให้โหลด();

  // js/firebase.js เป็น module โหลดแยกจากไฟล์นี้ ต้องรอให้มันเชื่อมต่อเสร็จก่อน
  function ถ้าพร้อมแล้วให้โหลด() {
    if (window.db) {
      โหลดข้อมูล();
    } else {
      window.addEventListener("firebase-ready", โหลดข้อมูล, { once: true });
    }
  }

  async function โหลดข้อมูล() {
    try {
      var q = window.fsQuery(
        window.fsCollection(window.db, "quizAttempts"),
        window.fsOrderBy("submittedAt", "desc")
      );
      var สแนปช็อต = await window.fsGetDocs(q);

      var รายการทั้งหมด = [];
      สแนปช็อต.forEach(function (เอกสาร) {
        var ข้อมูล = เอกสาร.data();
        ข้อมูล.id = เอกสาร.id;
        รายการทั้งหมด.push(ข้อมูล);
      });

      // ถ้ามีสถานะติดมาท้าย URL ให้กรองเฉพาะสถานะนั้น
      var สถานะที่กรอง = ค่าจากURL("status");
      if (สถานะที่กรอง) {
        รายการทั้งหมด = รายการทั้งหมด.filter(function (a) { return a.status === สถานะที่กรอง; });
        document.querySelector(".subtitle").textContent =
          "กำลังแสดงเฉพาะสถานะ " + สถานะที่กรอง + " · รีเฟรชหน้าเพื่อดูทั้งหมด";
      }

      แสดงตาราง(รายการทั้งหมด);
    } catch (err) {
      กล่อง.innerHTML = "<p>โหลดข้อมูลไม่สำเร็จ: " + esc(err.message) + "</p>";
      console.error(err);
    }
  }

  function แสดงตาราง(รายการ) {
    if (รายการ.length === 0) {
      กล่อง.innerHTML = "<p>ยังไม่มีการส่งงานในระบบ</p>";
      return;
    }

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
        "<tr>" +
        "<td>" + esc(a.studentNickname) + "</td>" +
        "<td>" + esc(a.quizSetTitle) + "</td>" +
        "<td>" + ป้ายสถานะ(a.status) + "</td>" +
        '<td class="hide-mobile">' + (a.scoreAwarded == null ? "—" : esc(a.scoreAwarded)) + "</td>" +
        '<td class="hide-mobile">' + esc(a.submittedAt) + "</td>" +
        "</tr>";
    });

    html += "</tbody></table>";
    กล่อง.innerHTML = html;
  }
})();
