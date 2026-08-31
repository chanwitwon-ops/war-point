// ─────────────────────────────────────────────────────────────
// js/seed.js — ใส่ข้อมูลตัวอย่างลง Firestore จริง (รันครั้งเดียว)
// ใช้ข้อมูลชุดเดียวกับ js/data.js ตาม SCOPE.md
// ─────────────────────────────────────────────────────────────

(function () {
  var ปุ่ม = document.getElementById("ปุ่มซีด");
  var สถานะ = document.getElementById("สถานะซีด");

  ถ้าพร้อมแล้วให้ผูกปุ่ม();

  function ถ้าพร้อมแล้วให้ผูกปุ่ม() {
    if (window.db) {
      ผูกปุ่ม();
    } else {
      window.addEventListener("firebase-ready", ผูกปุ่ม, { once: true });
    }
  }

  function ผูกปุ่ม() {
    ปุ่ม.disabled = false;
    ปุ่ม.addEventListener("click", function () {
      ปุ่ม.disabled = true;
      เริ่มซีด();
    });
  }

  async function เริ่มซีด() {
    try {
      แจ้ง("กำลังใส่ students…");
      for (var i = 0; i < window.WAR_POINT_DATA.students.length; i++) {
        var s = window.WAR_POINT_DATA.students[i];
        await window.fsSetDoc(window.fsDoc(window.db, "students", s.id), {
          studentCode: s.studentCode, nickname: s.nickname, isActive: s.isActive
        });
      }

      แจ้ง("กำลังใส่ quizSets…");
      for (var j = 0; j < window.WAR_POINT_DATA.quizSets.length; j++) {
        var q = window.WAR_POINT_DATA.quizSets[j];
        await window.fsSetDoc(window.fsDoc(window.db, "quizSets", q.id), {
          title: q.title, format: q.format, fullScore: q.fullScore
        });
      }

      แจ้ง("กำลังใส่ quizAttempts…");
      for (var k = 0; k < window.WAR_POINT_DATA.quizAttempts.length; k++) {
        var a = window.WAR_POINT_DATA.quizAttempts[k];
        var ข้อมูล = {};
        Object.keys(a).forEach(function (คีย์) {
          if (คีย์ !== "id") ข้อมูล[คีย์] = a[คีย์];
        });
        await window.fsSetDoc(window.fsDoc(window.db, "quizAttempts", a.id), ข้อมูล);
      }

      แจ้ง("กำลังใส่ reviews (โฟลเดอร์ย่อยของแต่ละ quizAttempt)…");
      for (var m = 0; m < window.WAR_POINT_DATA.reviews.length; m++) {
        var r = window.WAR_POINT_DATA.reviews[m];
        await window.fsSetDoc(
          window.fsDoc(window.db, "quizAttempts", r.attemptId, "reviews", r.id),
          {
            teacherName: r.teacherName, feedback: r.feedback,
            scoreGiven: r.scoreGiven, reviewedAt: r.reviewedAt
          }
        );
      }

      แจ้ง("✅ ใส่ข้อมูลตัวอย่างสำเร็จ — เปิด Firebase Console ดูได้เลย");
    } catch (err) {
      แจ้ง("❌ ใส่ข้อมูลไม่สำเร็จ: " + err.message);
      console.error(err);
      ปุ่ม.disabled = false;
    }
  }

  function แจ้ง(ข้อความ) {
    สถานะ.textContent = ข้อความ;
  }
})();
