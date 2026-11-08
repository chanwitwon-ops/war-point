// ─────────────────────────────────────────────────────────────
// js/tournament.js — หน้าทัวนาเมนต์แพ้คัดออก (tournament.html)
// ตามสเปก docs/01-requirements/01-spec/20261103-08-tournament-bracket-demo.md
// และการเปลี่ยนแปลง 2026-11-08 (เลือกนักเรียนจากสัตว์เลี้ยงจริง, นักเรียนดูได้แบบอ่านอย่างเดียว)
//
// หน้านี้ทำงานตามค่าใน URL และบทบาท:
//   - ไม่มี ?tournamentId → รายการ "ทัวนาเมนต์ที่ผ่านมา" (ทุกบทบาท)
//                          + ฟอร์มตั้งค่านักเรียน 4 คน (เฉพาะครู — ไม่อยู่ใน DOM ของนักเรียน)
//   - มี ?tournamentId=... → ผัง bracket (semifinal1, semifinal2 → final)
//                          ครูเห็นปุ่ม "ต่อสู้" / "เลือก X ชนะ" · นักเรียนอ่านอย่างเดียว (ไม่มีปุ่มเหล่านี้ใน DOM)
//
// **ขอบเขตของไฟล์นี้ (ui-screens): ห้ามคำนวณผลการต่อสู้/แต้มเอง และห้ามอ่าน/เขียน Firestore เอง**
// ผลแมตช์แสดงจาก matchLog ที่บันทึกไว้แล้วเท่านั้น ทุกการอ่าน/เขียนเรียกผ่านฟังก์ชันด้านล่าง
//
// ── สัญญา (contract) ──
// 1) window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์() → Promise<[{ uid, name, pet: {speciesKey, stage, stats} | null }]>
// 2) window.สร้างทัวนาเมนต์(bracketData) → Promise<tournamentId>
//      bracketData = { semifinal1: {slotA, slotB}, semifinal2: {slotA, slotB}, final: {slotA: null, slotB: null} }
//      slot = { studentUid, studentName, speciesKey, stage, stats: {SPD,ATK,ACC,EVA,DEF,HP} }
//      (stats/stage/speciesKey มาจาก pet ของนักเรียนที่เลือก — หน้านี้ไม่ได้ derive ค่าเอง)
// 3) window.โหลดทัวนาเมนต์(tournamentId) → Promise<Tournament | null>
//      Tournament.semifinal1 / semifinal2 / final = { slotA, slotB, matchId, winnerSlot, matchLog? }
//      matchLog.result = { winner: "A" | "B" | null, reason: "ko" | "turn_limit" | "teacher_decides", turns }
//      sideA ↔ slotA, sideB ↔ slotB · final.slotA/slotB เป็น null จนกว่า semifinal ทั้งคู่จบ
// 4) window.คำนวณแมตช์ของทัวนาเมนต์(tournamentId, slotKey) → Promise<void>
//      slotKey = "semifinal1" | "semifinal2" | "final"
// 5) window.ครูเลือกผู้ชนะ(tournamentId, slotKey, winnerSlot) → Promise<void>
//      ใช้เมื่อ matchLog.result.winner === null (เลือดเท่ากันครบ 30 เทิร์น) · winnerSlot = "slotA" | "slotB"
// 6) window.โหลดรายการทัวนาเมนต์() → Promise<[{ id, createdAt, createdByTeacherName, championName }]> เรียงใหม่สุดก่อน
//
// reject ทุกตัวด้วย Error ที่ .message เป็นภาษาไทย (หน้านี้แสดงในกล่องเตือนให้ผู้ใช้เห็น)
// ─────────────────────────────────────────────────────────────

(function () {
  var tournamentId = ค่าจากURL("tournamentId");

  var ชื่อรอบ = {
    semifinal1: "รอบรองชนะเลิศ คู่ที่ 1",
    semifinal2: "รอบรองชนะเลิศ คู่ที่ 2",
    final: "รอบชิงชนะเลิศ"
  };

  // ป้ายเหตุผลของผลแมตช์ (อ่านจาก matchLog.result.reason) — ไม่แสดงสกอร์ยกแล้ว
  var ป้ายเหตุผล = {
    ko: "น็อคเอาต์",
    turn_limit: "ครบ 30 เทิร์น ชนะด้วยเลือดที่เหลือ",
    teacher_decides: "ครูตัดสิน"
  };

  // ช่องเลือกนักเรียน 4 ช่อง (รองชนะเลิศ 2 คู่ × 2 ฝั่ง)
  var ช่องเลือกนักเรียน = [
    { key: "semifinal1", side: "slotA", ป้าย: "รอบรองชนะเลิศ คู่ที่ 1 · ฝั่ง A" },
    { key: "semifinal1", side: "slotB", ป้าย: "รอบรองชนะเลิศ คู่ที่ 1 · ฝั่ง B" },
    { key: "semifinal2", side: "slotA", ป้าย: "รอบรองชนะเลิศ คู่ที่ 2 · ฝั่ง A" },
    { key: "semifinal2", side: "slotB", ป้าย: "รอบรองชนะเลิศ คู่ที่ 2 · ฝั่ง B" }
  ];

  var กล่องกำลังโหลด = document.getElementById("กล่องกำลังโหลด");
  var ที่วางหลัก = document.getElementById("ที่วางหลัก");

  // รายชื่อนักเรียนที่โหลดมาล่าสุด (ใช้ในฟอร์มครูเท่านั้น)
  var รายชื่อนักเรียน = [];

  // ── stub: กันหน้าพังตอนยังไม่ได้ต่อระบบบันทึกจริง (ดูสัญญาข้างบน) ──
  window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์ = window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์ || async function () {
    throw new Error("ยังไม่ได้เชื่อมระบบโหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์");
  };

  window.สร้างทัวนาเมนต์ = window.สร้างทัวนาเมนต์ || async function (bracketData) {
    throw new Error("ยังไม่ได้เชื่อมระบบบันทึกทัวนาเมนต์ — ยังเริ่มทัวนาเมนต์จริงไม่ได้");
  };

  window.โหลดทัวนาเมนต์ = window.โหลดทัวนาเมนต์ || async function (tournamentId) {
    throw new Error("ยังไม่ได้เชื่อมระบบโหลดทัวนาเมนต์");
  };

  window.คำนวณแมตช์ของทัวนาเมนต์ = window.คำนวณแมตช์ของทัวนาเมนต์ || async function (tournamentId, slotKey) {
    throw new Error("ยังไม่ได้เชื่อมระบบคำนวณแมตช์ — ยังต่อสู้จริงไม่ได้");
  };

  window.ครูเลือกผู้ชนะ = window.ครูเลือกผู้ชนะ || async function (tournamentId, slotKey, winnerSlot) {
    throw new Error("ยังไม่ได้เชื่อมระบบเลือกผู้ชนะ — ยังบันทึกผลเสมอไม่ได้");
  };

  window.โหลดรายการทัวนาเมนต์ = window.โหลดรายการทัวนาเมนต์ || async function () {
    throw new Error("ยังไม่ได้เชื่อมระบบโหลดรายการทัวนาเมนต์");
  };

  // กระดานเกียรติยศ (สเปก 09) — สัญญาอยู่ที่หัวไฟล์ js/leaderboard-data.js
  window.คำนวณและบันทึกกระดานคะแนน = window.คำนวณและบันทึกกระดานคะแนน || async function () {
    throw new Error("ยังไม่ได้เชื่อมระบบกระดานคะแนน");
  };
  window.โหลดกระดานคะแนน = window.โหลดกระดานคะแนน || async function () {
    throw new Error("ยังไม่ได้เชื่อมระบบกระดานคะแนน");
  };
  window.โหลดทำเนียบแชมป์ = window.โหลดทำเนียบแชมป์ || async function () {
    throw new Error("ยังไม่ได้เชื่อมระบบทำเนียบแชมป์");
  };

  function เป็นครู() {
    return !!window.CURRENT_USER && window.CURRENT_USER.role === "teacher";
  }

  function ถ้าพร้อมแล้วให้เริ่ม() {
    if (window.CURRENT_USER) {
      เริ่ม();
    } else {
      window.addEventListener("auth-ready", เริ่ม, { once: true });
    }
  }

  function เริ่ม() {
    กล่องกำลังโหลด.classList.add("hidden");
    if (tournamentId) {
      โหลดผัง();
    } else {
      วาดหน้าแรกทัวนาเมนต์();
    }
  }

  // ── หน้าแรก (ไม่มี tournamentId) ─────────────────────────────

  function วาดหน้าแรกทัวนาเมนต์() {
    // ฟอร์มตั้งค่าสร้างเฉพาะเมื่อเป็นครู — นักเรียนจะไม่มีองค์ประกอบนี้ใน DOM
    // กระดานเกียรติยศอยู่บนสุดเสมอ (สเปก 09) — ทุกบทบาทที่ล็อกอินเห็น
    var html =
      '<div class="card honor-board" id="กล่องกระดานเกียรติยศ">' +
        '<p class="section-title">🏆 กระดานเกียรติยศ</p>' +
        '<div class="honor-grid">' +
          '<section class="honor-col" id="กระดานคะแนน" aria-label="คะแนนสูงสุด"><p class="hint">กำลังโหลดคะแนน…</p></section>' +
          '<section class="honor-col" id="ทำเนียบแชมป์" aria-label="แชมป์รายสัปดาห์"><p class="hint">กำลังโหลดแชมป์…</p></section>' +
        "</div>" +
      "</div>";
    if (เป็นครู()) {
      html += '<div class="card" id="กล่องฟอร์มตั้งค่า"><p class="hint">กำลังโหลดรายชื่อนักเรียน…</p></div>';
    }
    html += '<div class="card" id="กล่องรายการทัวนาเมนต์"><p class="hint">กำลังโหลดรายการ…</p></div>';
    ที่วางหลัก.innerHTML = html;

    โหลดกระดานคะแนน();
    โหลดทำเนียบแชมป์();
    if (เป็นครู()) {
      โหลดฟอร์มตั้งค่า();
    }
    โหลดรายการทัวนาเมนต์ที่ผ่านมา();
  }

  // ── กระดานเกียรติยศ: ส่วนที่ 1 คะแนนสูงสุดครึ่งบนของห้อง ──
  // ครูคำนวณใหม่จากข้อมูลจริงทุกครั้งที่เปิดหน้านี้ · นักเรียนอ่านผลสรุปที่ครูบันทึกไว้ล่าสุด
  async function โหลดกระดานคะแนน() {
    var กล่อง = document.getElementById("กระดานคะแนน");
    var หัว = '<p class="honor-title">คะแนนสูงสุด · ครึ่งบนของห้อง</p>';
    var กระดาน = null;
    var คำเตือน = "";
    try {
      if (เป็นครู()) {
        try {
          กระดาน = await window.คำนวณและบันทึกกระดานคะแนน();
        } catch (err) {
          console.error(err);
          คำเตือน = '<div class="alert alert-error">⚠️ ' + esc(err.message) + " — แสดงผลสรุปล่าสุดที่บันทึกไว้แทน</div>";
          กระดาน = await window.โหลดกระดานคะแนน();
        }
      } else {
        กระดาน = await window.โหลดกระดานคะแนน();
      }
    } catch (err) {
      console.error(err);
      กล่อง.innerHTML = หัว + '<div class="alert alert-error">⚠️ ' + esc(err.message) + "</div>";
      return;
    }

    var รายการ = กระดาน ? กระดาน.entries : [];
    var html = หัว + คำเตือน;
    if (รายการ.length === 0) {
      html += '<p class="hint">ยังไม่มีนักเรียนที่มีคะแนนจากแบบทดสอบที่ตรวจแล้ว</p>';
    } else {
      var uidฉัน = window.CURRENT_USER ? window.CURRENT_USER.uid : null;
      html +=
        '<ol class="honor-list">' +
        รายการ.map(function (น) {
          var ของฉัน = น.uid === uidฉัน;
          return (
            '<li class="honor-row' + (ของฉัน ? " is-me" : "") + '">' +
              '<span class="honor-rank" aria-label="อันดับ ' + esc(น.rank) + '">' + esc(น.rank) + "</span>" +
              '<span class="honor-name">' + esc(น.nickname) + (ของฉัน ? " (คุณ)" : "") + "</span>" +
              '<span class="honor-score">' + esc(น.totalScore) + " แต้ม</span>" +
            "</li>"
          );
        }).join("") +
        "</ol>";
    }
    html +=
      '<p class="sub-note">นับจากคะแนนแบบทดสอบที่ครูตรวจแล้วเท่านั้น (รวมแต้มที่ใช้เลี้ยงสัตว์ไปแล้ว)' +
      (กระดาน && กระดาน.computedAt ? " · อัปเดตล่าสุด " + esc(กระดาน.computedAt) : "") +
      "</p>";
    กล่อง.innerHTML = html;
  }

  // ── กระดานเกียรติยศ: ส่วนที่ 2 แชมป์รายสัปดาห์ ──
  async function โหลดทำเนียบแชมป์() {
    var กล่อง = document.getElementById("ทำเนียบแชมป์");
    var หัว = '<p class="honor-title">แชมป์รายสัปดาห์</p>';
    try {
      var สัปดาห์ทั้งหมด = (await window.โหลดทำเนียบแชมป์()) || [];
      if (สัปดาห์ทั้งหมด.length === 0) {
        กล่อง.innerHTML = หัว + '<p class="hint">ยังไม่มีทัวนาเมนต์ที่ได้แชมป์</p>';
        return;
      }
      กล่อง.innerHTML =
        หัว +
        '<ul class="honor-weeks">' +
        สัปดาห์ทั้งหมด.map(function (ส) {
          return (
            '<li class="honor-week">' +
              '<p class="honor-week-label">สัปดาห์ ' + esc(ส.weekLabel) + "</p>" +
              ส.champions.map(function (ช) {
                return (
                  '<p class="honor-champ">' +
                    '<a href="tournament.html?tournamentId=' + encodeURIComponent(ช.tournamentId) + '">👑 ' + esc(ช.championName) + "</a>" +
                    '<span class="sub-note"> · ' + esc(ชื่อสายพันธุ์(ช.speciesKey)) + " " + esc(ชื่อขั้น(ช.stage)) + "</span>" +
                    (ช.decidedByTeacher ? '<span class="honor-tag">ครูตัดสิน</span>' : "") +
                  "</p>"
                );
              }).join("") +
            "</li>"
          );
        }).join("") +
        "</ul>";
    } catch (err) {
      console.error(err);
      กล่อง.innerHTML = หัว + '<div class="alert alert-error">⚠️ ' + esc(err.message) + "</div>";
    }
  }

  // ── ฟอร์มตั้งค่า (ครูเท่านั้น) ──

  async function โหลดฟอร์มตั้งค่า() {
    var กล่อง = document.getElementById("กล่องฟอร์มตั้งค่า");
    try {
      รายชื่อนักเรียน = (await window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์()) || [];
    } catch (err) {
      console.error(err);
      กล่อง.innerHTML =
        '<p class="section-title">ตั้งค่านักเรียน 4 คน</p>' +
        '<div class="alert alert-error">⚠️ โหลดรายชื่อนักเรียนไม่สำเร็จ: ' + esc(err.message) + "</div>";
      return;
    }
    วาดฟอร์มตั้งค่า(กล่อง);
  }

  function วาดฟอร์มตั้งค่า(กล่อง) {
    var จำนวนที่มีสัตว์เลี้ยง = รายชื่อนักเรียน.filter(function (น) { return น.pet != null; }).length;
    var เริ่มได้ = จำนวนที่มีสัตว์เลี้ยง >= ช่องเลือกนักเรียน.length;

    var html =
      '<p class="section-title">ตั้งค่านักเรียน 4 คน</p>' +
      '<p class="hint">เลือกนักเรียนจากรายชื่อ — นักเรียนที่ยังไม่ได้ซื้อไข่เลือกไม่ได้ และเลือกคนเดิมซ้ำในหลายช่องไม่ได้</p>';

    if (รายชื่อนักเรียน.length === 0) {
      html += '<div class="alert alert-error">⚠️ ยังไม่มีนักเรียนในระบบ จึงเริ่มทัวนาเมนต์ไม่ได้</div>';
    } else if (!เริ่มได้) {
      html +=
        '<div class="alert alert-error">⚠️ เริ่มทัวนาเมนต์ไม่ได้ — ตอนนี้มีนักเรียนที่มีสัตว์เลี้ยงเพียง ' +
        จำนวนที่มีสัตว์เลี้ยง + " คน ต้องมีอย่างน้อย " + ช่องเลือกนักเรียน.length + " คน</div>";
    }

    ช่องเลือกนักเรียน.forEach(function (ช่อง) {
      var รหัส = ช่อง.key + "-" + ช่อง.side;
      html +=
        '<div class="slot-form-row">' +
        '<p class="slot-form-title">' + esc(ช่อง.ป้าย) + "</p>" +
        '<label for="เลือก-' + รหัส + '">นักเรียน</label>' +
        '<select id="เลือก-' + รหัส + '" data-slot-select="' + รหัส + '"></select>' +
        "</div>";
    });

    html +=
      '<div id="กล่องเตือนตั้งค่า" class="alert alert-error hidden"></div>' +
      '<div class="btn-row"><button type="button" class="btn" id="ปุ่มเริ่มทัวนาเมนต์"' +
      (เริ่มได้ ? "" : " disabled") + ">เริ่มทัวนาเมนต์</button></div>";

    กล่อง.innerHTML = html;

    กล่อง.querySelectorAll("[data-slot-select]").forEach(function (ตัวเลือก) {
      ตัวเลือก.addEventListener("change", รีเฟรชตัวเลือกนักเรียน);
    });
    document.getElementById("ปุ่มเริ่มทัวนาเมนต์").addEventListener("click", เริ่มทัวนาเมนต์);
    รีเฟรชตัวเลือกนักเรียน();
  }

  // เติมตัวเลือกใหม่ทุกช่องตามค่าที่เลือกอยู่ — คนที่เลือกไว้ช่องอื่นแล้ว หรือยังไม่มีสัตว์เลี้ยง จะถูกปิดการเลือก
  function รีเฟรชตัวเลือกนักเรียน() {
    var รหัสช่องทั้งหมด = ช่องเลือกนักเรียน.map(function (ช่อง) { return ช่อง.key + "-" + ช่อง.side; });

    var ค่าที่เลือกไว้ = {};
    รหัสช่องทั้งหมด.forEach(function (รหัส) {
      var ตัวเลือก = document.getElementById("เลือก-" + รหัส);
      ค่าที่เลือกไว้[รหัส] = ตัวเลือก ? ตัวเลือก.value : "";
    });

    รหัสช่องทั้งหมด.forEach(function (รหัส) {
      var ตัวเลือก = document.getElementById("เลือก-" + รหัส);
      if (!ตัวเลือก) return;
      var ที่เลือกอยู่ = ค่าที่เลือกไว้[รหัส];

      var html = '<option value="">— เลือกนักเรียน —</option>';
      รายชื่อนักเรียน.forEach(function (น) {
        var ไม่มีสัตว์เลี้ยง = น.pet == null;
        var ถูกเลือกช่องอื่น = รหัสช่องทั้งหมด.some(function (อื่น) {
          return อื่น !== รหัส && ค่าที่เลือกไว้[อื่น] === น.uid;
        });
        var ปิด = ไม่มีสัตว์เลี้ยง || ถูกเลือกช่องอื่น;

        var ข้อความ = (น.name || "ไม่ระบุชื่อ") + " — " +
          (ไม่มีสัตว์เลี้ยง
            ? "ยังไม่ได้ซื้อไข่"
            : ชื่อสายพันธุ์(น.pet.speciesKey) + " " + ชื่อขั้น(น.pet.stage));
        if (ถูกเลือกช่องอื่น) {
          ข้อความ += " (เลือกไว้ช่องอื่นแล้ว)";
        }

        html +=
          '<option value="' + esc(น.uid) + '"' +
          (น.uid === ที่เลือกอยู่ ? " selected" : "") +
          (ปิด ? " disabled" : "") + ">" +
          esc(ข้อความ) + "</option>";
      });
      ตัวเลือก.innerHTML = html;
    });
  }

  // อ่านค่าจากฟอร์ม → bracketData ตามสัญญา หรือ { error } ถ้ากรอกไม่ครบ/ไม่ถูกต้อง
  function อ่านฟอร์ม() {
    var bracketData = {
      semifinal1: { slotA: null, slotB: null },
      semifinal2: { slotA: null, slotB: null },
      final: { slotA: null, slotB: null }
    };
    var เลือกแล้ว = {};

    for (var i = 0; i < ช่องเลือกนักเรียน.length; i++) {
      var ช่อง = ช่องเลือกนักเรียน[i];
      var รหัส = ช่อง.key + "-" + ช่อง.side;
      var uid = document.getElementById("เลือก-" + รหัส).value;

      if (!uid) {
        return { error: "เลือกนักเรียนให้ครบ 4 คนก่อน จึงจะเริ่มทัวนาเมนต์ได้" };
      }
      if (Object.prototype.hasOwnProperty.call(เลือกแล้ว, uid)) {
        return { error: "นักเรียนคนเดิมถูกเลือกซ้ำ — เลือกให้แต่ละช่องเป็นคนละคน" };
      }
      เลือกแล้ว[uid] = true;

      var น = รายชื่อนักเรียน.filter(function (x) { return x.uid === uid; })[0];
      if (!น || !น.pet) {
        return { error: "นักเรียนที่เลือกยังไม่มีสัตว์เลี้ยง — เลือกใหม่" };
      }
      var สเตตัส = คัดลอกสเตตัส(น.pet.stats);
      if (!สเตตัส) {
        return { error: "สเตตัสของสัตว์เลี้ยงของ " + (น.name || "นักเรียนคนนี้") + " ไม่ครบ — ตรวจข้อมูลก่อนเริ่มทัวนาเมนต์" };
      }

      bracketData[ช่อง.key][ช่อง.side] = {
        studentUid: น.uid,
        studentName: น.name || "ไม่ระบุชื่อ",
        speciesKey: น.pet.speciesKey,
        stage: น.pet.stage,
        stats: สเตตัส
      };
    }

    return { bracketData: bracketData };
  }

  // คัดลอกเฉพาะ 6 ค่าสเตตัสตาม PET_STAT_KEYS — ถ้าขาดค่าใดค่าหนึ่งคืน null (ไม่เดาค่าให้)
  function คัดลอกสเตตัส(สเตตัส) {
    var ผล = {};
    var ครบ = true;
    window.PET_STAT_KEYS.forEach(function (k) {
      if (สเตตัส && typeof สเตตัส[k] === "number") {
        ผล[k] = สเตตัส[k];
      } else {
        ครบ = false;
      }
    });
    return ครบ ? ผล : null;
  }

  async function เริ่มทัวนาเมนต์() {
    var เตือน = document.getElementById("กล่องเตือนตั้งค่า");
    var ปุ่ม = document.getElementById("ปุ่มเริ่มทัวนาเมนต์");
    เตือน.classList.add("hidden");

    var ผลอ่าน = อ่านฟอร์ม();
    if (ผลอ่าน.error) {
      แสดงเตือนในกล่อง(เตือน, ผลอ่าน.error);
      return;
    }

    ปุ่ม.disabled = true;
    ปุ่ม.textContent = "กำลังสร้างทัวนาเมนต์...";

    try {
      var รหัสใหม่ = await window.สร้างทัวนาเมนต์(ผลอ่าน.bracketData);
      location.href = "tournament.html?tournamentId=" + encodeURIComponent(รหัสใหม่);
    } catch (err) {
      console.error(err);
      แสดงเตือนในกล่อง(เตือน, "เริ่มทัวนาเมนต์ไม่สำเร็จ: " + err.message);
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = "เริ่มทัวนาเมนต์";
    }
  }

  // ── รายการทัวนาเมนต์ที่ผ่านมา (ทุกบทบาท) ──

  async function โหลดรายการทัวนาเมนต์ที่ผ่านมา() {
    var กล่อง = document.getElementById("กล่องรายการทัวนาเมนต์");
    try {
      var รายการ = (await window.โหลดรายการทัวนาเมนต์()) || [];
      var html = '<p class="section-title">ทัวนาเมนต์ที่ผ่านมา</p>';

      if (รายการ.length === 0) {
        html += '<p class="hint">ยังไม่มีทัวนาเมนต์ในระบบ</p>';
      } else {
        html +=
          '<ul class="link-list">' +
          รายการ.map(function (t) {
            return (
              "<li>" +
              '<a href="tournament.html?tournamentId=' + encodeURIComponent(t.id) + '">' + esc(t.createdAt || "ไม่ทราบเวลา") + "</a>" +
              '<span class="sub-note">' +
              (t.championName ? "แชมป์: " + esc(t.championName) : "ยังไม่มีแชมป์") +
              "</span></li>"
            );
          }).join("") +
          "</ul>";
      }
      กล่อง.innerHTML = html;
    } catch (err) {
      console.error(err);
      กล่อง.innerHTML =
        '<p class="section-title">ทัวนาเมนต์ที่ผ่านมา</p>' +
        '<div class="alert alert-error">⚠️ โหลดรายการไม่สำเร็จ: ' + esc(err.message) + "</div>";
    }
  }

  // ── หน้าผัง (มี tournamentId) ─────────────────────────────

  async function โหลดผัง() {
    ที่วางหลัก.innerHTML =
      '<div class="top-links"><a href="tournament.html">← ทัวนาเมนต์ทั้งหมด</a></div>' +
      '<div class="card" id="กล่องผัง"><p class="hint">กำลังโหลดผัง…</p></div>';

    var กล่อง = document.getElementById("กล่องผัง");
    try {
      var ทัวนาเมนต์ = await window.โหลดทัวนาเมนต์(tournamentId);
      if (!ทัวนาเมนต์) {
        กล่อง.innerHTML =
          '<div class="alert alert-error">⚠️ ไม่พบทัวนาเมนต์นี้ — ลิงก์อาจไม่ถูกต้อง หรือยังไม่เคยเริ่มทัวนาเมนต์</div>';
        return;
      }
      วาดผัง(ทัวนาเมนต์);
    } catch (err) {
      console.error(err);
      กล่อง.innerHTML = '<div class="alert alert-error">⚠️ โหลดทัวนาเมนต์ไม่สำเร็จ: ' + esc(err.message) + "</div>";
    }
  }

  function วาดผัง(ทัวนาเมนต์) {
    var กล่อง = document.getElementById("กล่องผัง");

    // กล่องเตือนของการกดปุ่มครู — สร้างเฉพาะครู
    var กล่องเตือนผัง = เป็นครู() ? '<div id="กล่องเตือนผัง" class="alert alert-error hidden"></div>' : "";

    กล่อง.innerHTML =
      กล่องเตือนผัง +
      '<div class="bracket">' +
        '<div class="bracket-col bracket-col-sf">' +
          สร้างกล่องคู่("semifinal1", ทัวนาเมนต์) +
          สร้างกล่องคู่("semifinal2", ทัวนาเมนต์) +
        "</div>" +
        '<div class="bracket-connector" aria-hidden="true"></div>' +
        '<div class="bracket-col bracket-col-final">' +
          สร้างกล่องคู่("final", ทัวนาเมนต์) +
        "</div>" +
      "</div>" +
      '<p class="hint">รอบรองชนะเลิศ 2 คู่ — ผู้ชนะทั้งสองคู่เลื่อนเข้ารอบชิงชนะเลิศโดยอัตโนมัติ · กด "ดูรายละเอียด" เพื่อดูบันทึกการต่อสู้ทีละเหตุการณ์</p>';

    // ปุ่มของครูเท่านั้น — นักเรียนไม่มี element เหล่านี้ใน DOM
    กล่อง.querySelectorAll("[data-action-slot-key]").forEach(function (ปุ่ม) {
      ปุ่ม.addEventListener("click", function () { กดต่อสู้(ปุ่ม); });
    });
    กล่อง.querySelectorAll("[data-pick-slot-key]").forEach(function (ปุ่ม) {
      ปุ่ม.addEventListener("click", function () { กดเลือกผู้ชนะ(ปุ่ม); });
    });
  }

  // หาผู้ชนะของคู่ — ผลจากการต่อสู้ก่อน ถ้าไม่มี (เสมอ) ใช้ winnerSlot ที่ครูเลือกไว้
  function หาผู้ชนะ(คู่) {
    var บันทึก = คู่.matchLog;
    if (บันทึก && บันทึก.result && (บันทึก.result.winner === "A" || บันทึก.result.winner === "B")) {
      return {
        ฝั่ง: บันทึก.result.winner === "A" ? "slotA" : "slotB",
        เหตุผล: บันทึก.result.reason || null
      };
    }
    if (คู่.winnerSlot === "slotA" || คู่.winnerSlot === "slotB") {
      return { ฝั่ง: คู่.winnerSlot, เหตุผล: "teacher_decides" };
    }
    return { ฝั่ง: null, เหตุผล: null };
  }

  function สร้างกล่องคู่(key, ทัวนาเมนต์) {
    var คู่ = ทัวนาเมนต์[key] || {};
    var slotA = คู่.slotA || null;
    var slotB = คู่.slotB || null;
    var ผู้ชนะ = หาผู้ชนะ(คู่);

    var ข้อความสถานะ;
    var ปุ่มHtml = "";

    if (คู่.matchLog) {
      if (ผู้ชนะ.ฝั่ง) {
        var slotชนะ = ผู้ชนะ.ฝั่ง === "slotA" ? slotA : slotB;
        var ป้าย = ผู้ชนะ.เหตุผล && ป้ายเหตุผล[ผู้ชนะ.เหตุผล] ? " (" + ป้ายเหตุผล[ผู้ชนะ.เหตุผล] + ")" : "";
        ข้อความสถานะ = "ผู้ชนะ: " + esc(slotชนะ ? slotชนะ.studentName : "ไม่ทราบชื่อ") + esc(ป้าย);
      } else {
        ข้อความสถานะ = "ผลเสมอ — รอครูตัดสิน";
        if (เป็นครู() && slotA && slotB) {
          ปุ่มHtml +=
            '<div class="btn-row">' +
            ปุ่มเลือกผู้ชนะ(key, "slotA", slotA.studentName) +
            ปุ่มเลือกผู้ชนะ(key, "slotB", slotB.studentName) +
            "</div>";
        }
      }
      ปุ่มHtml +=
        '<div class="btn-row"><a class="btn-ghost" href="tournament-match.html?tournamentId=' +
        encodeURIComponent(tournamentId) + "&slotKey=" + encodeURIComponent(key) + '">ดูรายละเอียด →</a></div>';
    } else if (slotA && slotB) {
      ข้อความสถานะ = "ยังไม่ได้ต่อสู้";
      if (เป็นครู()) {
        ปุ่มHtml =
          '<div class="btn-row"><button type="button" class="btn-ok" data-action-slot-key="' + esc(key) + '">ต่อสู้</button></div>';
      }
    } else {
      ข้อความสถานะ = key === "final"
        ? "รอผู้เข้ารอบ — ต้องมีผู้ชนะรอบรองชนะเลิศครบทั้ง 2 คู่ก่อน"
        : "รอผู้เข้ารอบ";
    }

    return (
      '<div class="bracket-match" data-slot-key="' + esc(key) + '">' +
        '<p class="bracket-match-title">' + esc(ชื่อรอบ[key]) + "</p>" +
        สร้างช่องฝ่าย(slotA, ผู้ชนะ.ฝั่ง === "slotA") +
        '<p class="vs-mark">VS</p>' +
        สร้างช่องฝ่าย(slotB, ผู้ชนะ.ฝั่ง === "slotB") +
        '<p class="bracket-status">' + ข้อความสถานะ + "</p>" +
        ปุ่มHtml +
      "</div>"
    );
  }

  function สร้างช่องฝ่าย(slot, ชนะ) {
    if (!slot) {
      return '<div class="bracket-slot is-empty"><span class="slot-name">รอผู้เข้ารอบ</span></div>';
    }
    return (
      '<div class="bracket-slot' + (ชนะ ? " is-winner" : "") + '">' +
        '<span class="slot-name">' + esc(slot.studentName) + "</span>" +
        '<span class="slot-species">' + esc(ชื่อสายพันธุ์(slot.speciesKey)) + " · " + esc(ชื่อขั้น(slot.stage)) + "</span>" +
        (ชนะ ? '<span class="slot-result">✓ ผู้ชนะ</span>' : "") +
      "</div>"
    );
  }

  function ปุ่มเลือกผู้ชนะ(key, side, ชื่อ) {
    return (
      '<button type="button" class="btn-ok" data-pick-slot-key="' + esc(key) +
      '" data-pick-side="' + esc(side) + '">เลือก ' + esc(ชื่อ || "ฝั่งนี้") + " ชนะ</button>"
    );
  }

  async function กดต่อสู้(ปุ่ม) {
    var key = ปุ่ม.getAttribute("data-action-slot-key");
    ปุ่ม.disabled = true;
    ปุ่ม.textContent = "กำลังคำนวณ...";
    ซ่อนเตือนผัง();

    try {
      await window.คำนวณแมตช์ของทัวนาเมนต์(tournamentId, key);
      await โหลดผัง();
    } catch (err) {
      console.error(err);
      เตือนผัง("คำนวณแมตช์ไม่สำเร็จ: " + err.message);
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = "ต่อสู้";
    }
  }

  async function กดเลือกผู้ชนะ(ปุ่ม) {
    var key = ปุ่ม.getAttribute("data-pick-slot-key");
    var side = ปุ่ม.getAttribute("data-pick-side");
    var ปุ่มทั้งหมด = document.querySelectorAll("[data-pick-slot-key]");

    ปุ่มทั้งหมด.forEach(function (b) { b.disabled = true; });
    ซ่อนเตือนผัง();

    try {
      await window.ครูเลือกผู้ชนะ(tournamentId, key, side);
      await โหลดผัง();
    } catch (err) {
      console.error(err);
      เตือนผัง("เลือกผู้ชนะไม่สำเร็จ: " + err.message);
      ปุ่มทั้งหมด.forEach(function (b) { b.disabled = false; });
    }
  }

  function เตือนผัง(ข้อความ) {
    var กล่องเตือน = document.getElementById("กล่องเตือนผัง");
    if (!กล่องเตือน) return;
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    กล่องเตือน.classList.remove("hidden");
  }

  function ซ่อนเตือนผัง() {
    var กล่องเตือน = document.getElementById("กล่องเตือนผัง");
    if (!กล่องเตือน) return;
    กล่องเตือน.textContent = "";
    กล่องเตือน.classList.add("hidden");
  }

  // ── ตัวช่วย ─────────────────────────────────────────────────

  function แสดงเตือนในกล่อง(กล่อง, ข้อความ) {
    กล่อง.textContent = "⚠️ " + ข้อความ;
    กล่อง.classList.remove("hidden");
  }

  function ชื่อสายพันธุ์(key) {
    var ชื่อ = window.PET_SPECIES_LABELS ? window.PET_SPECIES_LABELS[key] : null;
    return ชื่อ || key || "ไม่ระบุสายพันธุ์";
  }

  function ชื่อขั้น(stage) {
    if (typeof stage === "number" && window.PET_STAGE_LABELS[stage]) {
      return window.PET_STAGE_LABELS[stage];
    }
    return "ไม่ทราบขั้น";
  }

  // เรียกท้ายสุด หลังประกาศตัวแปรทั้งหมดแล้ว
  ถ้าพร้อมแล้วให้เริ่ม();
})();
