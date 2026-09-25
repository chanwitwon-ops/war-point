// ─────────────────────────────────────────────────────────────
// js/quiz-attempt-detail.js — หน้ารายละเอียดการส่งงาน 1 รายการ
// ครู (role=teacher) ให้คะแนน/เขียนรีวิวได้ที่นี่ (FE-17) — สร้างเอกสารใน
// reviews subcollection + เปลี่ยนสถานะเป็น graded (ปลายทาง เปลี่ยนกลับไม่ได้)
// ─────────────────────────────────────────────────────────────

(function () {
  var รหัสงาน = ค่าจากURL("id");
  var กล่องงาน = document.getElementById("กล่องงาน");
  var กล่องรีวิว = document.getElementById("กล่องรีวิว");
  var กล่องสรุปนักเรียน = document.getElementById("กล่องสรุปนักเรียน");
  var ปุ่มสรุปนักเรียน = document.getElementById("ปุ่มสรุปนักเรียน");
  var กล่องข้อความสรุป = document.getElementById("กล่องข้อความสรุป");
  var กล่องเตือนสรุป = document.getElementById("กล่องเตือนสรุป");

  var งาน = null;
  var ชุดข้อสอบ = null;
  var รีวิวทั้งหมด = [];

  ปุ่มสรุปนักเรียน.addEventListener("click", ให้AIสรุปภาพรวมนักเรียน);

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

      if (window.CURRENT_USER.role === "teacher" && งาน.studentId) {
        กล่องสรุปนักเรียน.classList.remove("hidden");
        var สแนปช็อตนักเรียน = await window.fsGetDoc(window.fsDoc(window.db, "students", งาน.studentId));
        if (สแนปช็อตนักเรียน.exists() && สแนปช็อตนักเรียน.data().aiSummary) {
          แสดงสรุป(สแนปช็อตนักเรียน.data().aiSummary);
        }
      }
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

    if (งาน.submittedText) {
      แถว.push(["คำตอบที่ส่ง", esc(งาน.submittedText)]);
    }

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

  // ── ระดับ 2: AI อ่านประวัติทุกชุดที่นักเรียนคนนี้เคยถูกตรวจ (หลายรายการ + หลายรีวิว) ──
  // แล้วสรุปภาพรวมให้ครูอ่านประกอบการพิจารณา — เขียนกลับลง students/{id} + จด aiLog ทุกครั้งที่เรียก
  async function ให้AIสรุปภาพรวมนักเรียน() {
    กล่องเตือนสรุป.classList.add("hidden");
    ปุ่มสรุปนักเรียน.disabled = true;
    ปุ่มสรุปนักเรียน.textContent = "🤖 กำลังอ่านประวัติและสรุป...";

    try {
      // ① อ่านหลายที่ — งานทุกชิ้นของนักเรียนคนนี้ + รีวิวของแต่ละชิ้น
      var qงานทั้งหมด = window.fsQuery(
        window.fsCollection(window.db, "quizAttempts"),
        window.fsWhere("studentId", "==", งาน.studentId)
      );
      var สแนปช็อตงานทั้งหมด = await window.fsGetDocs(qงานทั้งหมด);

      var รายการสรุป = [];
      for (var i = 0; i < สแนปช็อตงานทั้งหมด.docs.length; i++) {
        var เอกสารงาน = สแนปช็อตงานทั้งหมด.docs[i];
        var ข้อมูลงาน = เอกสารงาน.data();
        if (ข้อมูลงาน.status !== "graded") continue;   // สรุปเฉพาะที่ตรวจแล้วจริง มีข้อมูลให้อ่าน

        var qรีวิวของงานนี้ = window.fsQuery(
          window.fsCollection(window.db, "quizAttempts", เอกสารงาน.id, "reviews"),
          window.fsOrderBy("reviewedAt")
        );
        var สแนปช็อตรีวิวของงานนี้ = await window.fsGetDocs(qรีวิวของงานนี้);
        var ความเห็นทั้งหมด = [];
        สแนปช็อตรีวิวของงานนี้.forEach(function (r) { ความเห็นทั้งหมด.push(r.data().feedback); });

        รายการสรุป.push({
          quizSetTitle: ข้อมูลงาน.quizSetTitle,
          scoreAwarded: ข้อมูลงาน.scoreAwarded,
          feedbacks: ความเห็นทั้งหมด
        });
      }

      if (รายการสรุป.length === 0) {
        เตือนสรุป("นักเรียนคนนี้ยังไม่มีงานที่ตรวจแล้วสักชิ้น จึงยังสรุปภาพรวมไม่ได้");
        return;
      }

      // ② ตัดสินใจ/สรุป — ส่งประวัติทั้งหมดให้ AI เขียนสรุปสั้น ๆ
      var ข้อมูลที่ส่ง = รายการสรุป.map(function (r) {
        return "ชุด: " + r.quizSetTitle + " · คะแนน: " + r.scoreAwarded +
               (r.feedbacks.length ? " · ความเห็นครู: " + r.feedbacks.join(" / ") : "");
      }).join("\n");

      var สรุป = await เรียกโมเดลAI([
        {
          role: "system",
          content:
            "คุณคือผู้ช่วยสรุปภาพรวมพัฒนาการของนักเรียนให้ครูอ่านประกอบการพิจารณา " +
            "จากประวัติคะแนนและความเห็นที่เคยได้รับในทุกชุดที่ตรวจแล้ว " +
            "เขียนสรุปสั้น ๆ ภาษาไทยไม่เกิน 3 ประโยค เน้นข้อเท็จจริงจากข้อมูลที่ให้เท่านั้น " +
            "ห้ามให้คำแนะนำเชิงตัดสินหรือให้คะแนนใหม่"
        },
        { role: "user", content: ข้อมูลที่ส่ง }
      ]);

      // ③ เขียนกลับ — บันทึกสรุปลงเอกสารนักเรียน
      await window.fsUpdateDoc(window.fsDoc(window.db, "students", งาน.studentId), {
        aiSummary: สรุป,
        aiSummaryUpdatedAt: เวลาตอนนี้()
      });

      // ④ จดบันทึก — เก็บทุกครั้งที่เรียก AI ไว้ใน aiLog ของนักเรียนคนนี้
      await window.fsSetDoc(
        window.fsDoc(window.db, "students", งาน.studentId, "aiLog", "log-" + Date.now()),
        { input: ข้อมูลที่ส่ง, output: สรุป, createdAt: เวลาตอนนี้() }
      );

      แสดงสรุป(สรุป);
    } catch (err) {
      เตือนสรุป("ให้ AI สรุปไม่สำเร็จ: " + err.message);
      console.error(err);
    } finally {
      ปุ่มสรุปนักเรียน.disabled = false;
      ปุ่มสรุปนักเรียน.textContent = "🤖 ให้ AI สรุปภาพรวมของนักเรียนคนนี้";
    }
  }

  function แสดงสรุป(ข้อความ) {
    กล่องข้อความสรุป.textContent = "🤖 " + ข้อความ;
    กล่องข้อความสรุป.classList.remove("hidden");
  }

  function เตือนสรุป(ข้อความ) {
    กล่องเตือนสรุป.textContent = "⚠️ " + ข้อความ;
    กล่องเตือนสรุป.classList.remove("hidden");
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
