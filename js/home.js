// ─────────────────────────────────────────────────────────────
// js/home.js — หน้าหลักแยกบทบาท (home.html)
// นักเรียน: การ์ดแต้ม · การ์ดสัตว์เลี้ยง · ชุดข้อสอบที่ยังไม่ทำ · ทัวนาเมนต์ล่าสุด
// ครู: การ์ดงานรอตรวจ · การ์ดชุดข้อสอบ · การ์ดทัวนาเมนต์ล่าสุด + ปุ่มสร้างใหม่
//
// ขอบเขต (ui-screens): ไม่อ่าน/เขียน Firestore เอง — เรียกผ่านฟังก์ชันตามสัญญาด้านล่าง
// การ์ดของบทบาทอื่นไม่ถูกสร้างใน DOM เลย (ซ่อน ไม่ใช่ disable)
//
// ── สัญญา (contract) ──
// window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(uid)  → js/pet-data.js (มีอยู่แล้ว)
//     Promise<{ totalPointsEarned, pointsAvailable, pet, growthHistory }>
// window.โหลดชุดข้อสอบที่ยังไม่ทำ(uid)     → Promise<[{ id, title, format, fullScore }]>  (js/home-data.js)
// window.นับงานรอตรวจ()                    → Promise<number>  (js/home-data.js)
// window.โหลดทัวนาเมนต์ล่าสุด()             → Promise<{ id, createdAt, championName } | null>  (js/home-data.js)
// ─────────────────────────────────────────────────────────────

(function () {
  // ── stub: กันหน้าพังตอนยังไม่มี js/home-data.js (แต่ละการ์ดจะแสดงข้อความไม่สำเร็จของตัวเอง) ──
  var ข้อความยังไม่เชื่อม = "ระบบข้อมูลหน้าหลักยังไม่พร้อมใช้งาน (ยังไม่ได้โหลด js/home-data.js)";
  function ยังไม่เชื่อม() {
    return Promise.reject(new Error(ข้อความยังไม่เชื่อม));
  }
  window.โหลดชุดข้อสอบที่ยังไม่ทำ = window.โหลดชุดข้อสอบที่ยังไม่ทำ || ยังไม่เชื่อม;
  window.นับงานรอตรวจ = window.นับงานรอตรวจ || ยังไม่เชื่อม;
  window.โหลดทัวนาเมนต์ล่าสุด = window.โหลดทัวนาเมนต์ล่าสุด || ยังไม่เชื่อม;

  var คำทักทาย = document.getElementById("คำทักทาย");
  var กล่องเตือน = document.getElementById("กล่องเตือนหน้าหลัก");
  var ที่วาง = document.getElementById("เนื้อหาหน้าหลัก");

  var ป้ายบทบาท = { student: "นักเรียน", teacher: "ครู" };
  var ป้ายฟอร์แมต = { mcq: "ปรนัย", worksheet: "ใบงาน", attachment: "แนบไฟล์" };

  if (window.CURRENT_USER) {
    เริ่ม();
  } else {
    window.addEventListener("auth-ready", เริ่ม, { once: true });
  }

  function เริ่ม() {
    var บทบาท = window.CURRENT_USER.role;
    คำทักทาย.textContent = "สวัสดี " + (window.CURRENT_USER.name || "") + " (" + (ป้ายบทบาท[บทบาท] || บทบาท) + ")";

    if (บทบาท === "student") {
      วาดหน้านักเรียน();
    } else if (บทบาท === "teacher") {
      วาดหน้าครู();
    } else {
      กล่องเตือน.textContent = "⚠️ ไม่รู้จักบทบาทของบัญชีนี้ จึงแสดงหน้าหลักไม่ได้";
      กล่องเตือน.classList.remove("hidden");
    }
  }

  // ── นักเรียน ─────────────────────────────────────────────────

  function วาดหน้านักเรียน() {
    var uid = window.CURRENT_USER.uid;
    // ใช้ข้อมูลแต้ม/สัตว์เลี้ยงชุดเดียวกันสำหรับ 2 การ์ด (เรียกอ่านครั้งเดียว)
    var โหลดแต้มและสัตว์เลี้ยง = ครั้งเดียว(function () {
      return window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(uid);
    });

    ที่วาง.innerHTML =
      สร้างการ์ด("การ์ดแต้ม", "แต้มของฉัน") +
      สร้างการ์ด("การ์ดสัตว์เลี้ยง", "สัตว์เลี้ยงของฉัน") +
      สร้างการ์ด("การ์ดชุดข้อสอบ", "ชุดข้อสอบที่ยังไม่ทำ") +
      สร้างการ์ด("การ์ดทัวนาเมนต์", "ทัวนาเมนต์ล่าสุด");

    ใส่เนื้อหา("การ์ดแต้ม", โหลดแต้มและสัตว์เลี้ยง, วาดการ์ดแต้ม);
    ใส่เนื้อหา("การ์ดสัตว์เลี้ยง", โหลดแต้มและสัตว์เลี้ยง, วาดการ์ดสัตว์เลี้ยง);
    ใส่เนื้อหา("การ์ดชุดข้อสอบ", function () {
      return window.โหลดชุดข้อสอบที่ยังไม่ทำ(uid);
    }, วาดการ์ดชุดข้อสอบ);
    ใส่เนื้อหา("การ์ดทัวนาเมนต์", function () {
      return window.โหลดทัวนาเมนต์ล่าสุด();
    }, function (ข้อมูล) {
      return วาดการ์ดทัวนาเมนต์(ข้อมูล, false);
    });
  }

  function วาดการ์ดแต้ม(ข้อมูล) {
    return (
      "<p>ใช้ได้ <strong>" + ข้อความตัวเลข(ข้อมูล.pointsAvailable) + "</strong> แต้ม</p>" +
      '<p class="hint">สะสมรวม ' + ข้อความตัวเลข(ข้อมูล.totalPointsEarned) + " แต้ม จากคะแนนที่ตรวจแล้ว (1 คะแนน = 1 แต้ม)</p>"
    );
  }

  function วาดการ์ดสัตว์เลี้ยง(ข้อมูล) {
    var สัตว์ = ข้อมูล.pet;
    var ลิงก์ = '<div class="btn-row"><a class="btn-ghost" href="pet.html">ไปหน้าสัตว์เลี้ยง →</a></div>';

    if (!สัตว์) {
      return (
        "<p>ยังไม่มีสัตว์เลี้ยง</p>" +
        '<p class="hint">ไปซื้อไข่ราคา ' + window.PET_STAGE_COST[0] + " แต้มที่หน้าสัตว์เลี้ยง</p>" +
        ลิงก์
      );
    }

    var ชื่อสาย = (window.PET_SPECIES_LABELS || {})[สัตว์.speciesKey] || สัตว์.speciesKey || "ไม่ระบุสายพันธุ์";
    var ชื่อขั้น = window.PET_STAGE_LABELS[สัตว์.stage] || "ไม่ทราบขั้น";
    return (
      "<p>สายพันธุ์: " + esc(ชื่อสาย) + "</p>" +
      "<p>ขั้นปัจจุบัน: <strong>" + esc(ชื่อขั้น) + "</strong>" +
      ' <span class="sub-note">(ขั้น ' + (สัตว์.stage + 1) + " / " + window.PET_STAGE_LABELS.length + ")</span></p>" +
      ลิงก์
    );
  }

  function วาดการ์ดชุดข้อสอบ(รายการ) {
    if (!รายการ || รายการ.length === 0) {
      return '<p class="hint">ตอนนี้ไม่มีชุดข้อสอบที่ค้างทำ</p>';
    }
    return (
      '<ul class="link-list">' +
      รายการ.map(function (ชุด) {
        return (
          "<li><span><strong>" + esc(ชุด.title || "(ไม่มีชื่อชุด)") + "</strong>" +
          '<br><span class="sub-note">' + esc(ป้ายฟอร์แมต[ชุด.format] || ชุด.format || "") +
          " · คะแนนเต็ม " + esc(ชุด.fullScore == null ? "—" : ชุด.fullScore) + "</span></span>" +
          '<a class="btn-ghost" href="quiz-attempt-new.html?quizSetId=' + encodeURIComponent(ชุด.id) + '">ทำแบบทดสอบนี้</a>' +
          "</li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  // ── ครู ─────────────────────────────────────────────────────

  function วาดหน้าครู() {
    ที่วาง.innerHTML =
      สร้างการ์ด("การ์ดงานรอตรวจ", "งานรอตรวจ") +
      สร้างการ์ด("การ์ดชุดข้อสอบ", "ชุดข้อสอบ") +
      สร้างการ์ด("การ์ดทัวนาเมนต์", "ทัวนาเมนต์");

    ใส่เนื้อหา("การ์ดงานรอตรวจ", function () {
      return window.นับงานรอตรวจ();
    }, วาดการ์ดงานรอตรวจ);

    document.getElementById("การ์ดชุดข้อสอบ").innerHTML =
      '<div class="btn-row">' +
      '<a class="btn-ghost" href="quiz-set-new.html">สร้างชุดข้อสอบ →</a>' +
      '<a class="btn-ghost" href="quiz-sets.html">รายการชุดข้อสอบทั้งหมด →</a>' +
      "</div>";

    ใส่เนื้อหา("การ์ดทัวนาเมนต์", function () {
      return window.โหลดทัวนาเมนต์ล่าสุด();
    }, function (ข้อมูล) {
      return วาดการ์ดทัวนาเมนต์(ข้อมูล, true);
    });
  }

  function วาดการ์ดงานรอตรวจ(จำนวน) {
    return (
      "<p>มีงานรอตรวจ <strong>" + ข้อความตัวเลข(จำนวน) + "</strong> ชิ้น</p>" +
      '<div class="btn-row"><a class="btn-ghost" href="quiz-attempts.html?status=pending_review">ดูงานที่รอตรวจ →</a></div>'
    );
  }

  // เป็นครู: เพิ่มปุ่มสร้างทัวนาเมนต์ใหม่ (การสร้างทำที่ tournament.html)
  function วาดการ์ดทัวนาเมนต์(ข้อมูล, เป็นครู) {
    var html = "";
    if (!ข้อมูล) {
      html += '<p class="hint">ยังไม่มีทัวนาเมนต์ในระบบ</p>';
    } else {
      html +=
        "<p>จัดเมื่อ " + esc(ข้อมูล.createdAt || "—") + "</p>" +
        "<p>" + (ข้อมูล.championName
          ? "แชมป์: <strong>" + esc(ข้อมูล.championName) + "</strong>"
          : "ยังไม่มีแชมป์") + "</p>";
    }

    var ปุ่ม = "";
    if (ข้อมูล) {
      ปุ่ม += '<a class="btn-ghost" href="tournament.html?tournamentId=' + encodeURIComponent(ข้อมูล.id) + '">ดูผังทัวนาเมนต์ →</a>';
    }
    // นักเรียนไม่มีปุ่มสร้าง (ไม่ใส่ลิงก์นี้ใน DOM)
    if (เป็นครู) {
      ปุ่ม += '<a class="btn-ok" href="tournament.html">+ สร้างทัวนาเมนต์ใหม่</a>';
    }
    if (ปุ่ม) {
      html += '<div class="btn-row">' + ปุ่ม + "</div>";
    }
    return html;
  }

  // ── ตัวช่วย ─────────────────────────────────────────────────

  function สร้างการ์ด(รหัส, หัวข้อ) {
    return (
      '<div class="card home-card">' +
      '<p class="section-title">' + esc(หัวข้อ) + "</p>" +
      '<div id="' + รหัส + '"><p class="hint">กำลังโหลด…</p></div>' +
      "</div>"
    );
  }

  // โหลดข้อมูลแล้ววาดลงการ์ด — ถ้าล้มเหลวแสดงข้อความเฉพาะการ์ดนั้น ไม่กระทบการ์ดอื่น
  function ใส่เนื้อหา(รหัส, ตัวโหลด, วาด) {
    var กล่อง = document.getElementById(รหัส);
    return Promise.resolve()
      .then(ตัวโหลด)
      .then(function (ผล) {
        กล่อง.innerHTML = วาด(ผล);
      })
      .catch(function (err) {
        console.error(err);
        กล่อง.innerHTML =
          '<div class="alert alert-error">โหลดไม่สำเร็จ: ' +
          esc(err && err.message ? err.message : String(err)) + "</div>";
      });
  }

  // คืนฟังก์ชันที่เรียกฟังก์ชันจริงแค่ครั้งเดียว แล้วใช้ผลเดิมซ้ำ
  function ครั้งเดียว(ฟังก์ชัน) {
    var ผลที่เก็บไว้ = null;
    return function () {
      if (ผลที่เก็บไว้ === null) {
        ผลที่เก็บไว้ = ฟังก์ชัน();
      }
      return ผลที่เก็บไว้;
    };
  }

  function ข้อความตัวเลข(ค่า) {
    return typeof ค่า === "number" ? String(ค่า) : "0";
  }
})();
