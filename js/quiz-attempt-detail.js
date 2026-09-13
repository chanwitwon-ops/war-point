// ─────────────────────────────────────────────────────────────
// js/quiz-attempt-detail.js — หน้ารายละเอียดการส่งงาน 1 รายการ
// ครู (role=teacher) ให้คะแนน/เขียนรีวิวได้ที่นี่ (FE-17) — สร้างเอกสารใน
// reviews subcollection + เปลี่ยนสถานะเป็น graded (ปลายทาง เปลี่ยนกลับไม่ได้)
// ─────────────────────────────────────────────────────────────

(function () {
  var รหัสงาน = ค่าจากURL("id");
  var กล่องงาน = document.getElementById("กล่องงาน");
  var กล่องรีวิว = document.getElementById("กล่องรีวิว");

  var งาน = null;
  var ชุดข้อสอบ = null;
  var รีวิวทั้งหมด = [];

  ถ้าพร้อมแล้วให้โหลด();

  function ถ้าพร้อมแล้วให้โหลด() {
    if (window.CURRENT_USER) {
      โหลดข้อมูล();
    } else {
      window.addEventListener("auth-ready", โหลดข้อมูล, { once: true });
    }
  }

  async function โหลดข้อมูล() {
    try {
      var สแนปช็อตงาน = await window.fsGetDoc(window.fsDoc(window.db, "quizAttempts", รหัสงาน));
      if (!สแนปช็อตงาน.exists()) {
        กล่องงาน.innerHTML = "<p>ไม่พบการส่งงานที่ต้องการ — อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>";
        return;
      }
      งาน = สแนปช็อตงาน.data();
      งาน.id = สแนปช็อตงาน.id;

      if (งาน.quizSetId) {
        var สแนปช็อตชุด = await window.fsGetDoc(window.fsDoc(window.db, "quizSets", งาน.quizSetId));
        ชุดข้อสอบ = สแนปช็อตชุด.exists() ? สแนปช็อตชุด.data() : null;
      }

      var qรีวิว = window.fsQuery(
        window.fsCollection(window.db, "quizAttempts", รหัสงาน, "reviews"),
        window.fsOrderBy("reviewedAt")
      );
      var สแนปช็อตรีวิว = await window.fsGetDocs(qรีวิว);
      รีวิวทั้งหมด = [];
      สแนปช็อตรีวิว.forEach(function (เอกสาร) {
        var ข้อมูล = เอกสาร.data();
        ข้อมูล.id = เอกสาร.id;
        รีวิวทั้งหมด.push(ข้อมูล);
      });

      วาดงาน();
      วาดรีวิว();
      กล่องรีวิว.classList.remove("hidden");
    } catch (err) {
      กล่องงาน.innerHTML = "<p>โหลดข้อมูลไม่สำเร็จ: " + esc(err.message) + "</p>";
      console.error(err);
    }
  }

  function วาดงาน() {
    var แถว = [
      ["นักเรียน", esc(งาน.studentNickname)],
      ["ชุดที่ทำ", esc(งาน.quizSetTitle)],
      ["สถานะ", ป้ายสถานะ(งาน.status)],
      ["คะแนน", งาน.scoreAwarded == null ? "—" : esc(งาน.scoreAwarded) + (ชุดข้อสอบ ? " / " + esc(ชุดข้อสอบ.fullScore) : "")],
      ["ส่งเมื่อ", esc(งาน.submittedAt)]
    ];

    var html = แถว.map(function (r) {
      return '<div class="field-row"><span class="k">' + r[0] + "</span><span>" + r[1] + "</span></div>";
    }).join("");

    var เป็นครู = window.CURRENT_USER.role === "teacher";

    if (งาน.status === "pending_review" && เป็นครู) {
      var คะแนนเต็มป้าย = ชุดข้อสอบ ? esc(ชุดข้อสอบ.fullScore) : "?";
      html +=
        "<label>ให้คะแนน (เต็ม " + คะแนนเต็มป้าย + ")</label>" +
        '<input type="text" id="ช่องคะแนน" placeholder="เช่น 15">' +
        "<label>ความเห็น/feedback ถึงนักเรียน</label>" +
        '<textarea id="ช่องความเห็น" rows="3" placeholder="พิมพ์ความเห็นถึงนักเรียน"></textarea>' +
        '<div id="กล่องเตือนให้คะแนน" class="alert alert-error hidden"></div>' +
        '<div class="btn-row"><button type="button" class="btn-ok" id="ปุ่มให้คะแนน">บันทึกคะแนน</button></div>';
    } else if (งาน.status !== "pending_review") {
      html += '<p class="hint">ใบงานนี้ตรวจแล้ว เปลี่ยนสถานะต่อไม่ได้</p>';
    }

    กล่องงาน.innerHTML = html;

    if (งาน.status === "pending_review" && เป็นครู) {
      document.getElementById("ปุ่มให้คะแนน").addEventListener("click", ให้คะแนน);
    }
  }

  async function ให้คะแนน() {
    var ช่องคะแนน = document.getElementById("ช่องคะแนน");
    var ช่องความเห็น = document.getElementById("ช่องความเห็น");
    var เตือน = document.getElementById("กล่องเตือนให้คะแนน");
    var ปุ่ม = document.getElementById("ปุ่มให้คะแนน");

    var คะแนน = parseFloat(ช่องคะแนน.value);
    var ความเห็น = ช่องความเห็น.value.trim();
    var คะแนนเต็ม = ชุดข้อสอบ ? ชุดข้อสอบ.fullScore : null;

    เตือน.classList.add("hidden");

    if (isNaN(คะแนน) || คะแนน < 0 || (คะแนนเต็ม != null && คะแนน > คะแนนเต็ม)) {
      เตือน.textContent = "⚠️ คะแนนต้องอยู่ระหว่าง 0 ถึง " + (คะแนนเต็ม != null ? คะแนนเต็ม : "คะแนนเต็ม");
      เตือน.classList.remove("hidden");
      return;
    }
    if (!ความเห็น) {
      เตือน.textContent = "⚠️ พิมพ์ความเห็นถึงนักเรียนก่อน จึงจะบันทึกคะแนนได้";
      เตือน.classList.remove("hidden");
      return;
    }

    ปุ่ม.disabled = true;
    try {
      await window.fsSetDoc(
        window.fsDoc(window.db, "quizAttempts", งาน.id, "reviews", "rev-" + Date.now()),
        {
          teacherName: window.CURRENT_USER.name,
          feedback: ความเห็น,
          scoreGiven: คะแนน,
          reviewedAt: เวลาตอนนี้()
        }
      );

      await window.fsUpdateDoc(window.fsDoc(window.db, "quizAttempts", งาน.id), {
        status: "graded",
        scoreAwarded: คะแนน
      });

      งาน.status = "graded";
      งาน.scoreAwarded = คะแนน;
      วาดงาน();
      await โหลดข้อมูล();
    } catch (err) {
      เตือน.textContent = "⚠️ บันทึกคะแนนไม่สำเร็จ: " + err.message;
      เตือน.classList.remove("hidden");
      console.error(err);
      ปุ่ม.disabled = false;
    }
  }

  function วาดรีวิว() {
    var ที่วาง = document.getElementById("รายการรีวิว");
    if (รีวิวทั้งหมด.length === 0) {
      ที่วาง.innerHTML = "<p>ยังไม่มีการตรวจในรายการนี้</p>";
      return;
    }
    ที่วาง.innerHTML = รีวิวทั้งหมด.map(function (r) {
      return '<div class="comment"><div class="meta">' + esc(r.teacherName) + " · " + esc(r.reviewedAt) +
             " · คะแนน " + esc(r.scoreGiven) + "</div><div>" + esc(r.feedback) + "</div></div>";
    }).join("");
  }
})();
