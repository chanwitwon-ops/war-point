// ─────────────────────────────────────────────────────────────
// js/tournament.js — หน้าทัวนาเมนต์แพ้คัดออก (tournament.html)
// ตามสเปก docs/01-requirements/01-spec/20261103-08-tournament-bracket-demo.md
// และการเปลี่ยนแปลง 2026-11-08 (เลือกนักเรียนจากสัตว์เลี้ยงจริง, นักเรียนดูได้แบบอ่านอย่างเดียว)
//
// หน้านี้ทำงานตามค่าใน URL และบทบาท:
//   - ไม่มี ?tournamentId → รายการ "ทัวนาเมนต์ที่ผ่านมา" (ทุกบทบาท)
//                          + ฟอร์มสร้างทัวนาเมนต์ (ติ๊กเลือกนักเรียนกี่คนก็ได้ — เฉพาะครู)
//   - มี ?tournamentId=... → ผัง bracket ทุกรอบ (r1m1, r1m2 … → รอบชิง)
//                          ครูเห็นปุ่ม "ต่อสู้" / "เลือก X ชนะ" · นักเรียนอ่านอย่างเดียว (ไม่มีปุ่มเหล่านี้ใน DOM)
//
// **ขอบเขตของไฟล์นี้ (ui-screens): ห้ามคำนวณผลการต่อสู้/แต้มเอง และห้ามอ่าน/เขียน Firestore เอง**
// ผลแมตช์แสดงจาก matchLog ที่บันทึกไว้แล้วเท่านั้น ทุกการอ่าน/เขียนเรียกผ่านฟังก์ชันด้านล่าง
//
// ── สัญญา (contract) ──
// 1) window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์() → Promise<[{ uid, name, pet: {speciesKey, stage, stats} | null }]>
// 2) window.สร้างทัวนาเมนต์([slot, ...]) → Promise<tournamentId>  (อย่างน้อย 2 คน — ระบบสุ่มจับคู่/บายเอง)
//      slot = { studentUid, studentName, speciesKey, stage, stats: {SPD,ATK,ACC,EVA,DEF,HP} }
//      (stats/stage/speciesKey มาจาก pet ของนักเรียนที่เลือก — หน้านี้ไม่ได้ derive ค่าเอง)
// 3) window.โหลดทัวนาเมนต์(tournamentId) → Promise<Tournament>
//      Tournament.rounds = [[{ key, round, index, slotA, slotB, matchId, winnerSlot, bye, matchLog? }, ...], ...]
//      Tournament.roundCount, finalKey, participantCount
//      matchLog.result = { winner: "A" | "B" | null, reason: "ko" | "turn_limit" | "teacher_decides", turns }
// 4) window.คำนวณแมตช์ของทัวนาเมนต์(tournamentId, matchKey) → Promise<void>   (matchKey เช่น "r1m2")
// 5) window.ครูเลือกผู้ชนะ(tournamentId, matchKey, winnerSlot) → Promise<void>
//      ใช้เมื่อ matchLog.result.winner === null (เลือดเท่ากันครบ 30 เทิร์น) · winnerSlot = "slotA" | "slotB"
// 6) window.โหลดรายการทัวนาเมนต์() → Promise<[{ id, createdAt, participantCount, championName }]> เรียงใหม่สุดก่อน
// 7) window.ลบทัวนาเมนต์(tournamentId) → Promise<void> (ครูเท่านั้น)
//
// reject ทุกตัวด้วย Error ที่ .message เป็นภาษาไทย (หน้านี้แสดงในกล่องเตือนให้ผู้ใช้เห็น)
// ─────────────────────────────────────────────────────────────

(function () {
  var tournamentId = ค่าจากURL("tournamentId");

  // ป้ายเหตุผลของผลแมตช์ (อ่านจาก matchLog.result.reason) — ไม่แสดงสกอร์ยกแล้ว
  var ป้ายเหตุผล = {
    ko: "น็อคเอาต์",
    turn_limit: "ครบ 30 เทิร์น ชนะด้วยเลือดที่เหลือ",
    teacher_decides: "ครูตัดสิน"
  };

  var จำนวนขั้นต่ำ = 2; // [แก้ 2026-11-09] เลือกได้ตั้งแต่ 2 คนจนถึงทุกคนที่มีสัตว์เลี้ยง

  var กล่องกำลังโหลด = document.getElementById("กล่องกำลังโหลด");
  var ที่วางหลัก = document.getElementById("ที่วางหลัก");

  // รายชื่อนักเรียนที่โหลดมาล่าสุด (ใช้ในฟอร์มครูเท่านั้น)
  var รายชื่อนักเรียน = [];

  // ── stub: กันหน้าพังตอนยังไม่ได้ต่อระบบบันทึกจริง (ดูสัญญาข้างบน) ──
  window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์ = window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์ || async function () {
    throw new Error("ยังไม่ได้เชื่อมระบบโหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์");
  };

  window.สร้างทัวนาเมนต์ = window.สร้างทัวนาเมนต์ || async function () {
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

  window.ลบทัวนาเมนต์ = window.ลบทัวนาเมนต์ || async function () {
    throw new Error("ยังไม่ได้เชื่อมระบบลบทัวนาเมนต์");
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
  // [แก้ 2026-11-09] เลือกนักเรียนกี่คนก็ได้ (ติ๊กจากรายชื่อ) — ระบบสุ่มจับคู่และสุ่มคนได้บายเอง

  async function โหลดฟอร์มตั้งค่า() {
    var กล่อง = document.getElementById("กล่องฟอร์มตั้งค่า");
    try {
      รายชื่อนักเรียน = (await window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์()) || [];
    } catch (err) {
      console.error(err);
      กล่อง.innerHTML =
        '<p class="section-title">สร้างทัวนาเมนต์ใหม่</p>' +
        '<div class="alert alert-error">⚠️ โหลดรายชื่อนักเรียนไม่สำเร็จ: ' + esc(err.message) + "</div>";
      return;
    }
    วาดฟอร์มตั้งค่า(กล่อง);
  }

  function วาดฟอร์มตั้งค่า(กล่อง) {
    var จำนวนที่มีสัตว์เลี้ยง = รายชื่อนักเรียน.filter(function (น) { return น.pet != null; }).length;

    var html =
      '<p class="section-title">สร้างทัวนาเมนต์ใหม่</p>' +
      '<p class="hint">ติ๊กเลือกนักเรียนที่จะลงแข่ง (อย่างน้อย ' + จำนวนขั้นต่ำ + ' คน) — ระบบสุ่มจับคู่ ' +
      'ถ้าจำนวนคนไม่ลงตัว ระบบสุ่มคนที่ได้บาย (ผ่านเข้ารอบถัดไปโดยไม่ต้องสู้) · นักเรียนที่ยังไม่ได้ซื้อไข่เลือกไม่ได้</p>';

    if (รายชื่อนักเรียน.length === 0) {
      html += '<div class="alert alert-error">⚠️ ยังไม่มีนักเรียนในระบบ จึงเริ่มทัวนาเมนต์ไม่ได้</div>';
    } else if (จำนวนที่มีสัตว์เลี้ยง < จำนวนขั้นต่ำ) {
      html +=
        '<div class="alert alert-error">⚠️ เริ่มทัวนาเมนต์ไม่ได้ — ตอนนี้มีนักเรียนที่มีสัตว์เลี้ยงเพียง ' +
        จำนวนที่มีสัตว์เลี้ยง + " คน ต้องมีอย่างน้อย " + จำนวนขั้นต่ำ + " คน</div>";
    }

    if (จำนวนที่มีสัตว์เลี้ยง > 0) {
      html += '<div class="btn-row"><button type="button" class="btn-ghost" id="ปุ่มเลือกทั้งหมด">เลือกทุกคนที่มีสัตว์เลี้ยง</button></div>';
    }

    html += '<div class="choice-list">' + รายชื่อนักเรียน.map(function (น) {
      var ไม่มีสัตว์เลี้ยง = น.pet == null;
      var ข้อความ = (น.name || "ไม่ระบุชื่อ") + " — " +
        (ไม่มีสัตว์เลี้ยง ? "ยังไม่ได้ซื้อไข่" : ชื่อสายพันธุ์(น.pet.speciesKey) + " " + ชื่อขั้น(น.pet.stage));
      return (
        '<label class="choice-row">' +
        '<input type="checkbox" data-student-uid="' + esc(น.uid) + '"' + (ไม่มีสัตว์เลี้ยง ? " disabled" : "") + ">" +
        "<span>" + esc(ข้อความ) + "</span>" +
        "</label>"
      );
    }).join("") + "</div>";

    html +=
      '<p class="hint" id="สรุปที่เลือก"></p>' +
      '<div id="กล่องเตือนตั้งค่า" class="alert alert-error hidden"></div>' +
      '<div class="btn-row"><button type="button" class="btn" id="ปุ่มเริ่มทัวนาเมนต์" disabled>เริ่มทัวนาเมนต์</button></div>';

    กล่อง.innerHTML = html;

    กล่อง.querySelectorAll("[data-student-uid]").forEach(function (ช่อง) {
      ช่อง.addEventListener("change", อัปเดตสรุปที่เลือก);
    });
    var ปุ่มทั้งหมด = document.getElementById("ปุ่มเลือกทั้งหมด");
    if (ปุ่มทั้งหมด) {
      ปุ่มทั้งหมด.addEventListener("click", function () {
        กล่อง.querySelectorAll("[data-student-uid]:not(:disabled)").forEach(function (ช่อง) { ช่อง.checked = true; });
        อัปเดตสรุปที่เลือก();
      });
    }
    document.getElementById("ปุ่มเริ่มทัวนาเมนต์").addEventListener("click", เริ่มทัวนาเมนต์);
    อัปเดตสรุปที่เลือก();
  }

  function uidที่เลือก() {
    return Array.prototype.map.call(
      document.querySelectorAll("[data-student-uid]:checked"),
      function (ช่อง) { return ช่อง.getAttribute("data-student-uid"); }
    );
  }

  // แสดงจำนวนคน/จำนวนรอบ/จำนวนบาย ที่จะได้ ก่อนกดเริ่ม
  function อัปเดตสรุปที่เลือก() {
    var n = uidที่เลือก().length;
    var สรุป = document.getElementById("สรุปที่เลือก");
    var ปุ่ม = document.getElementById("ปุ่มเริ่มทัวนาเมนต์");
    if (n < จำนวนขั้นต่ำ) {
      สรุป.textContent = "เลือกแล้ว " + n + " คน — ต้องเลือกอย่างน้อย " + จำนวนขั้นต่ำ + " คน";
      ปุ่ม.disabled = true;
      return;
    }
    var ขนาด = 1;
    while (ขนาด < n) ขนาด *= 2;
    var รอบ = Math.round(Math.log(ขนาด) / Math.LN2);
    var บาย = ขนาด - n;
    สรุป.textContent = "เลือกแล้ว " + n + " คน → แข่ง " + รอบ + " รอบ" + (บาย > 0 ? " · สุ่มให้ได้บาย " + บาย + " คน" : "");
    ปุ่ม.disabled = false;
  }

  // อ่านค่าจากฟอร์ม → รายชื่อผู้เข้าแข่งขันตามสัญญา หรือ { error }
  function อ่านฟอร์ม() {
    var uids = uidที่เลือก();
    if (uids.length < จำนวนขั้นต่ำ) {
      return { error: "เลือกนักเรียนอย่างน้อย " + จำนวนขั้นต่ำ + " คนก่อน จึงจะเริ่มทัวนาเมนต์ได้" };
    }
    var ผู้เข้าแข่งขัน = [];
    for (var i = 0; i < uids.length; i++) {
      var น = รายชื่อนักเรียน.filter(function (x) { return x.uid === uids[i]; })[0];
      if (!น || !น.pet) {
        return { error: "นักเรียนที่เลือกยังไม่มีสัตว์เลี้ยง — เลือกใหม่" };
      }
      var สเตตัส = คัดลอกสเตตัส(น.pet.stats);
      if (!สเตตัส) {
        return { error: "สเตตัสของสัตว์เลี้ยงของ " + (น.name || "นักเรียนคนนี้") + " ไม่ครบ — ตรวจข้อมูลก่อนเริ่มทัวนาเมนต์" };
      }
      ผู้เข้าแข่งขัน.push({
        studentUid: น.uid,
        studentName: น.name || "ไม่ระบุชื่อ",
        speciesKey: น.pet.speciesKey,
        stage: น.pet.stage,
        stats: สเตตัส
      });
    }
    return { ผู้เข้าแข่งขัน: ผู้เข้าแข่งขัน };
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
      var รหัสใหม่ = await window.สร้างทัวนาเมนต์(ผลอ่าน.ผู้เข้าแข่งขัน);
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
              (t.participantCount ? esc(t.participantCount) + " คน · " : "") +
              (t.championName ? "แชมป์: " + esc(t.championName) : "ยังไม่มีแชมป์") +
              "</span>" +
              (เป็นครู() ? ' <button type="button" class="btn-ghost" data-delete-tournament="' + esc(t.id) + '">ลบ</button>' : "") +
              "</li>"
            );
          }).join("") +
          "</ul>";
      }
      if (เป็นครู()) html += '<div id="กล่องเตือนลบ" class="alert alert-error hidden"></div>';
      กล่อง.innerHTML = html;
      กล่อง.querySelectorAll("[data-delete-tournament]").forEach(function (ปุ่ม) {
        ปุ่ม.addEventListener("click", function () {
          กดลบทัวนาเมนต์(ปุ่ม.getAttribute("data-delete-tournament"), ปุ่ม, document.getElementById("กล่องเตือนลบ"), function () {
            โหลดรายการทัวนาเมนต์ที่ผ่านมา();
            โหลดทำเนียบแชมป์();
          });
        });
      });
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

    // [แก้ 2026-11-09] ผังกี่รอบก็ได้ — 1 คอลัมน์ต่อรอบ (จอแคบเรียงลงล่าง)
    var แชมป์ = แชมป์ของทัวนาเมนต์(ทัวนาเมนต์);
    กล่อง.innerHTML =
      กล่องเตือนผัง +
      '<p class="section-title">' + esc(ทัวนาเมนต์.participantCount) + " คน · " + esc(ทัวนาเมนต์.roundCount) + " รอบ" +
        (ทัวนาเมนต์.createdAt ? ' <span class="sub-note">' + esc(ทัวนาเมนต์.createdAt) + "</span>" : "") + "</p>" +
      (แชมป์ ? '<p class="bracket-champion">👑 แชมป์: ' + esc(แชมป์.slot.studentName) + "</p>" : "") +
      '<div class="bracket bracket-rounds">' +
        ทัวนาเมนต์.rounds.map(function (คู่ในรอบ, i) {
          return (
            '<div class="bracket-col">' +
              '<p class="bracket-round-title">' + esc(ชื่อรอบทัวนาเมนต์(i + 1, ทัวนาเมนต์.roundCount)) + "</p>" +
              '<div class="bracket-col-matches">' +
                คู่ในรอบ.map(function (คู่) { return สร้างกล่องคู่(คู่, ทัวนาเมนต์); }).join("") +
              "</div>" +
            "</div>"
          );
        }).join("") +
      "</div>" +
      '<p class="hint">ระบบสุ่มจับคู่และสุ่มคนที่ได้บายตอนสร้างทัวนาเมนต์ — ผู้ชนะแต่ละคู่เลื่อนเข้ารอบถัดไปโดยอัตโนมัติ · กด "ดูรายละเอียด" เพื่อดูรีเพลย์การต่อสู้</p>' +
      (เป็นครู()
        ? '<div class="btn-row"><button type="button" class="btn-ghost" id="ปุ่มลบทัวนาเมนต์นี้">ลบทัวนาเมนต์นี้</button></div>'
        : "");

    var ปุ่มลบ = document.getElementById("ปุ่มลบทัวนาเมนต์นี้");
    if (ปุ่มลบ) {
      ปุ่มลบ.addEventListener("click", function () {
        กดลบทัวนาเมนต์(tournamentId, ปุ่มลบ, document.getElementById("กล่องเตือนผัง"), function () {
          location.href = "tournament.html";
        });
      });
    }

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

  function สร้างกล่องคู่(คู่, ทัวนาเมนต์) {
    var key = คู่.key;
    var slotA = คู่.slotA || null;
    var slotB = คู่.slotB || null;
    var ผู้ชนะ = หาผู้ชนะ(คู่);

    var ข้อความสถานะ;
    var ปุ่มHtml = "";

    if (คู่.bye) {
      ข้อความสถานะ = "ได้บาย — ผ่านเข้ารอบถัดไปโดยไม่ต้องสู้";
      return (
        '<div class="bracket-match is-bye" data-slot-key="' + esc(key) + '">' +
          สร้างช่องฝ่าย(slotA, false) +
          '<p class="bracket-status">' + ข้อความสถานะ + "</p>" +
        "</div>"
      );
    }

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
        encodeURIComponent(tournamentId) + "&match=" + encodeURIComponent(key) + '">ดูรายละเอียด →</a></div>';
    } else if (slotA && slotB) {
      ข้อความสถานะ = "ยังไม่ได้ต่อสู้";
      if (เป็นครู()) {
        ปุ่มHtml =
          '<div class="btn-row"><button type="button" class="btn-ok" data-action-slot-key="' + esc(key) + '">ต่อสู้</button></div>';
      }
    } else {
      ข้อความสถานะ = "รอผู้เข้ารอบ — รอผลของรอบก่อนหน้า";
    }

    return (
      '<div class="bracket-match" data-slot-key="' + esc(key) + '">' +
        '<p class="bracket-match-title">คู่ที่ ' + esc(คู่.index) + "</p>" +
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

  // ลบทัวนาเมนต์ (ครูเท่านั้น) — ยืนยันก่อน เพราะลบแล้วกู้คืนไม่ได้ และแชมป์จะหายจากกระดานเกียรติยศ
  async function กดลบทัวนาเมนต์(รหัส, ปุ่ม, กล่องเตือน, เมื่อสำเร็จ) {
    if (!window.confirm("ลบทัวนาเมนต์นี้? ผลการแข่งและรีเพลย์ทั้งหมดจะหายไป และกู้คืนไม่ได้")) return;
    ปุ่ม.disabled = true;
    ปุ่ม.textContent = "กำลังลบ...";
    try {
      await window.ลบทัวนาเมนต์(รหัส);
      เมื่อสำเร็จ();
    } catch (err) {
      console.error(err);
      if (กล่องเตือน) แสดงเตือนในกล่อง(กล่องเตือน, err.message);
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = "ลบ";
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
