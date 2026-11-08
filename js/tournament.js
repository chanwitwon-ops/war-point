// ─────────────────────────────────────────────────────────────
// js/tournament.js — หน้าตั้งค่า/ภาพรวมทัวนาเมนต์แพ้คัดออก (เดโม 18 ธ.ค. 2026)
// ตามสเปก docs/01-requirements/01-spec/20261103-08-tournament-bracket-demo.md
//
// หน้านี้ทำงานตามค่าใน URL:
//   - ไม่มี ?tournamentId  → แสดงฟอร์มกรอกนักเรียน 4 คน + เลือกสายพันธุ์ แล้วกด "เริ่มทัวนาเมนต์"
//   - มี ?tournamentId=... → โหลดทัวนาเมนต์มาวาดผัง bracket (semifinal1, semifinal2 → final)
//
// **ขอบเขตของไฟล์นี้ (ui-screens): ห้ามคำนวณผลการต่อสู้เอง และห้ามอ่าน/เขียน Firestore เอง**
// ผลทุกแมตช์แสดงจาก battle log ที่บันทึกไว้แล้วเท่านั้น (ดึงผ่าน window.โหลดทัวนาเมนต์)
// ปุ่ม "ต่อสู้" เรียก window.คำนวณแมตช์ของทัวนาเมนต์ ซึ่ง data-auth-engineer จะเป็นคนต่อ logic จริง
//
// ── สัญญา (contract) ของ 3 ฟังก์ชันที่หน้านี้เรียก (ประกาศ stub ไว้ด้านล่าง) ──
//
// 1) window.สร้างทัวนาเมนต์(bracketData) → Promise<string>
//    bracketData = {
//      semifinal1: { slotA: slot, slotB: slot },
//      semifinal2: { slotA: slot, slotB: slot },
//      final:      { slotA: null, slotB: null }      // เติมทีหลังจากผู้ชนะ semifinal
//    }
//    slot = { studentName, speciesKey, stats:{SPD,ATK,ACC,DEF,HP}, statusAbility }
//    (หน้านี้ดึง stats/statusAbility จาก window.TOURNAMENT_DEMO_SPECIES[speciesKey] เองตอนอ่านฟอร์ม
//    แล้วส่งมาครบในแต่ละ slot — data-auth-engineer ต้องการ field เหล่านี้ครบ ไม่ได้ derive เองจาก speciesKey)
//    resolve ด้วย id ของทัวนาเมนต์ที่สร้างใหม่ (หน้านี้จะ redirect ไป tournament.html?tournamentId=<id>)
//    reject ด้วย Error ที่ .message เป็นภาษาไทย (โชว์ในกล่องเตือนตรงนี้)
//
// 2) window.โหลดทัวนาเมนต์(tournamentId) → Promise<Tournament | null>
//    [แก้ตามของจริงที่ data-auth-engineer ต่อมาแล้ว 2026-11-03 — ไม่มี .bracket/.matches ซ้อนอีกต่อไป]
//    Tournament = {
//      id: string, createdByTeacherId, createdByTeacherName, createdAt,
//      semifinal1: { slotA, slotB, matchId, winnerSlot, matchLog? },
//      semifinal2: { slotA, slotB, matchId, winnerSlot, matchLog? },
//      final:      { slotA, slotB, matchId, winnerSlot, matchLog? }  // slotA/slotB เป็น null จนกว่า semifinal จะจบ
//    }
//    semifinal1/semifinal2/final เป็น top-level key ตรงๆ ของ Tournament (ไม่ได้ซ้อนใน .bracket/.matches)
//    matchLog = ผลที่บันทึกไว้จาก window.คำนวณผลการต่อสู้ (match_id, engine_version, seed, computed_at,
//               mode, sideA, sideB, result, events) เติมอัตโนมัติเมื่อ matchId ไม่ใช่ null — sideA ↔ slotA, sideB ↔ slotB
//    คืน null ถ้าไม่พบทัวนาเมนต์นี้ · reject ด้วย Error ที่ .message เป็นภาษาไทย
//    ผู้ชนะของรอบรองชนะเลิศ = matchLog.result.winner ("A" → slotA, "B" → slotB) — หน้านี้อ่านค่านี้ไปแสดงเท่านั้น
//    final.slotA/slotB ต้องถูกเติมโดยฝั่งบันทึกหลังผู้ชนะ semifinal ทั้ง 2 คู่ครบ (ยังเป็น null ตราบใดยังไม่ครบ
//    หน้านี้จะแสดง "รอผู้เข้ารอบ")
//
// 3) window.คำนวณแมตช์ของทัวนาเมนต์(tournamentId, slotKey) → Promise<void>
//    slotKey = "semifinal1" | "semifinal2" | "final"
//    ต้องคำนวณผลด้วย window.คำนวณผลการต่อสู้ (engine จาก combat-engine.js) จริงเท่านั้น
//    ห้ามกำหนดผู้ชนะไว้ล่วงหน้า แล้ว: บันทึก BattleLog ลง matches[slotKey] และเติม bracket.final
//    ให้ครบเมื่อจบ semifinal ทั้งคู่ · ถ้าผลเสมอ (result.winner = null) ไม่ต้องเลื่อนผู้เข้ารอบ
//    resolve เมื่อบันทึกเสร็จ (หน้านี้จะโหลดผังใหม่เอง) · reject ด้วย Error ที่ .message เป็นภาษาไทย
//
// 4) window.ดึงสัตว์เลี้ยงของนักเรียน(uid) → Promise<{speciesKey, stage, stats, statusAbility} | null>
//    (มาจาก js/pet-data.js — เพิ่ม 2026-11-08 เพื่อเชื่อมสัตว์เลี้ยงจริงของนักเรียนเข้าทัวนาเมนต์
//    แทนการพิมพ์ค่าสเตตัสสมมติเอง) คืน null ถ้านักเรียนยังไม่เคยซื้อไข่/ไม่มีสัตว์เลี้ยง
// ─────────────────────────────────────────────────────────────

(function () {
  var tournamentId = ค่าจากURL("tournamentId");

  var ชื่อรอบ = {
    semifinal1: "รอบรองชนะเลิศ คู่ที่ 1",
    semifinal2: "รอบรองชนะเลิศ คู่ที่ 2",
    final: "รอบชิงชนะเลิศ"
  };

  var กล่องกำลังโหลด = document.getElementById("กล่องกำลังโหลด");
  var กล่องไม่มีสิทธิ์ = document.getElementById("กล่องไม่มีสิทธิ์");
  var กล่องไม่พบ = document.getElementById("กล่องไม่พบ");
  var ข้อความไม่พบ = document.getElementById("ข้อความไม่พบ");
  var กล่องตั้งค่า = document.getElementById("กล่องตั้งค่า");
  var กล่องฟอร์มนักเรียน = document.getElementById("กล่องฟอร์มนักเรียน");
  var กล่องเตือนตั้งค่า = document.getElementById("กล่องเตือนตั้งค่า");
  var ปุ่มเริ่มทัวนาเมนต์ = document.getElementById("ปุ่มเริ่มทัวนาเมนต์");
  var กล่องผัง = document.getElementById("กล่องผัง");
  var ที่วางผัง = document.getElementById("ที่วางผัง");
  var กล่องเตือนผัง = document.getElementById("กล่องเตือนผัง");

  // ── stub: กันปุ่มพังตอนยังไม่มีใครต่อระบบบันทึกจริง (รูปแบบเดียวกับ js/quiz-attempt-new.js) ──
  // data-auth-engineer จะต่อโค้ดจริงทับ/แทนที่ stub เหล่านี้ตามสัญญาข้างบน
  window.สร้างทัวนาเมนต์ = window.สร้างทัวนาเมนต์ || async function (bracketData) {
    throw new Error("ยังไม่ได้เชื่อมระบบบันทึกทัวนาเมนต์ — ยังเริ่มทัวนาเมนต์จริงไม่ได้");
  };

  window.โหลดทัวนาเมนต์ = window.โหลดทัวนาเมนต์ || async function (tournamentId) {
    throw new Error("ยังไม่ได้เชื่อมระบบโหลดทัวนาเมนต์");
  };

  window.คำนวณแมตช์ของทัวนาเมนต์ = window.คำนวณแมตช์ของทัวนาเมนต์ || async function (tournamentId, slotKey) {
    throw new Error("ยังไม่ได้เชื่อมระบบคำนวณแมตช์ — ยังต่อสู้จริงไม่ได้");
  };

  window.ดึงสัตว์เลี้ยงของนักเรียน = window.ดึงสัตว์เลี้ยงของนักเรียน || async function (uid) {
    throw new Error("ยังไม่ได้เชื่อมระบบสัตว์เลี้ยง (js/pet-data.js)");
  };

  // เก็บสัตว์เลี้ยงจริงที่ดึงมาได้แล้วต่อ slot (รหัสช่อง -> {speciesKey,stats,statusAbility,uid})
  // ถ้า slot ไหนไม่มีใน object นี้ แปลว่ายังใช้ค่าสมมติจาก dropdown ตามเดิม
  var สัตว์เลี้ยงจริงที่ดึงมา = {};

  function ถ้าพร้อมแล้วให้เริ่ม() {
    if (window.CURRENT_USER) {
      เริ่ม();
    } else {
      window.addEventListener("auth-ready", เริ่ม, { once: true });
    }
  }

  function เริ่ม() {
    กล่องกำลังโหลด.classList.add("hidden");

    // ทั้งหน้าเป็นงานของครู (ตั้งค่า/กดต่อสู้) นักเรียนเห็นแค่กล่องไม่มีสิทธิ์
    if (window.CURRENT_USER.role !== "teacher") {
      กล่องไม่มีสิทธิ์.classList.remove("hidden");
      return;
    }

    if (tournamentId) {
      โหลดผัง();
    } else {
      วาดฟอร์มตั้งค่า();
      กล่องตั้งค่า.classList.remove("hidden");
    }
  }

  // ── หน้าตั้งค่า ──────────────────────────────────────────────

  var ช่องฝ่าย = [
    { key: "semifinal1", side: "slotA", ป้าย: "รอบรองชนะเลิศ คู่ที่ 1 · ฝั่ง A" },
    { key: "semifinal1", side: "slotB", ป้าย: "รอบรองชนะเลิศ คู่ที่ 1 · ฝั่ง B" },
    { key: "semifinal2", side: "slotA", ป้าย: "รอบรองชนะเลิศ คู่ที่ 2 · ฝั่ง A" },
    { key: "semifinal2", side: "slotB", ป้าย: "รอบรองชนะเลิศ คู่ที่ 2 · ฝั่ง B" }
  ];

  function วาดฟอร์มตั้งค่า() {
    var ตั้งต้น = window.TOURNAMENT_DEMO_BRACKET_TEMPLATE;
    var ตัวเลือกสาย = Object.keys(window.TOURNAMENT_DEMO_SPECIES);

    กล่องฟอร์มนักเรียน.innerHTML = ช่องฝ่าย.map(function (ช่อง) {
      var ค่าเริ่ม = ตั้งต้น[ช่อง.key][ช่อง.side];
      var รหัสช่อง = ช่อง.key + "-" + ช่อง.side;
      var ตัวเลือกHtml = ตัวเลือกสาย.map(function (k) {
        var เลือก = ค่าเริ่ม && ค่าเริ่ม.speciesKey === k ? " selected" : "";
        return '<option value="' + esc(k) + '"' + เลือก + ">" + esc(ชื่อสายพันธุ์(k)) + "</option>";
      }).join("");

      return (
        '<div class="slot-form-row">' +
        '<p class="slot-form-title">' + esc(ช่อง.ป้าย) + "</p>" +
        '<label for="ชื่อ-' + รหัสช่อง + '">ชื่อนักเรียน</label>' +
        '<input type="text" id="ชื่อ-' + รหัสช่อง + '" placeholder="พิมพ์ชื่อที่ใช้แสดงของนักเรียน" value="' + esc(ค่าเริ่ม ? ค่าเริ่ม.studentName : "") + '">' +
        '<label for="สายพันธุ์-' + รหัสช่อง + '">สายพันธุ์ (ค่าสมมติสำหรับเดโม)</label>' +
        '<select id="สายพันธุ์-' + รหัสช่อง + '">' + ตัวเลือกHtml + "</select>" +
        '<label for="uid-' + รหัสช่อง + '">หรือ: Firebase UID ของนักเรียน (ใช้สัตว์เลี้ยงจริงแทนค่าสมมติด้านบน)</label>' +
        '<div class="btn-row">' +
        '<input type="text" id="uid-' + รหัสช่อง + '" placeholder="เว้นว่างถ้าจะใช้ค่าสมมติ">' +
        '<button type="button" class="btn-ghost" data-fetch-pet-slot="' + esc(รหัสช่อง) + '">ดึงสัตว์เลี้ยงจริง</button>' +
        "</div>" +
        '<p class="hint" id="สถานะดึงสัตว์เลี้ยง-' + รหัสช่อง + '"></p>' +
        "</div>"
      );
    }).join("");

    ปุ่มเริ่มทัวนาเมนต์.addEventListener("click", เริ่มทัวนาเมนต์);
    กล่องฟอร์มนักเรียน.querySelectorAll("[data-fetch-pet-slot]").forEach(function (ปุ่ม) {
      ปุ่ม.addEventListener("click", function () { ดึงสัตว์เลี้ยงจริงของช่อง(ปุ่ม.getAttribute("data-fetch-pet-slot")); });
    });
  }

  async function ดึงสัตว์เลี้ยงจริงของช่อง(รหัสช่อง) {
    var ช่องUid = document.getElementById("uid-" + รหัสช่อง);
    var ช่องสถานะ = document.getElementById("สถานะดึงสัตว์เลี้ยง-" + รหัสช่อง);
    var uid = ช่องUid.value.trim();

    if (!uid) {
      delete สัตว์เลี้ยงจริงที่ดึงมา[รหัสช่อง];
      ช่องสถานะ.textContent = "ไม่ได้ใส่ UID — จะใช้ค่าสมมติจาก dropdown ด้านบนแทน";
      return;
    }

    ช่องสถานะ.textContent = "กำลังดึงข้อมูล...";
    try {
      var สัตว์ = await window.ดึงสัตว์เลี้ยงของนักเรียน(uid);
      if (!สัตว์) {
        delete สัตว์เลี้ยงจริงที่ดึงมา[รหัสช่อง];
        ช่องสถานะ.textContent = "นักเรียนคนนี้ยังไม่มีสัตว์เลี้ยง (ยังไม่เคยซื้อไข่) — จะใช้ค่าสมมติแทน";
        return;
      }
      สัตว์เลี้ยงจริงที่ดึงมา[รหัสช่อง] = {
        uid: uid,
        speciesKey: สัตว์.speciesKey,
        stats: สัตว์.stats,
        statusAbility: สัตว์.statusAbility
      };
      ช่องสถานะ.textContent =
        "✅ ดึงสำเร็จ: " + ชื่อสายพันธุ์(สัตว์.speciesKey) +
        " (" + (window.PET_STAGE_LABELS ? window.PET_STAGE_LABELS[สัตว์.stage] : "ขั้น " + สัตว์.stage) + ")";
    } catch (err) {
      delete สัตว์เลี้ยงจริงที่ดึงมา[รหัสช่อง];
      ช่องสถานะ.textContent = "⚠️ ดึงไม่สำเร็จ: " + err.message;
      console.error(err);
    }
  }

  function อ่านฟอร์ม() {
    var bracketData = {
      semifinal1: { slotA: null, slotB: null },
      semifinal2: { slotA: null, slotB: null },
      final: { slotA: null, slotB: null }
    };
    var ชื่อที่เห็นแล้ว = {};

    for (var i = 0; i < ช่องฝ่าย.length; i++) {
      var ช่อง = ช่องฝ่าย[i];
      var รหัสช่อง = ช่อง.key + "-" + ช่อง.side;
      var ชื่อ = document.getElementById("ชื่อ-" + รหัสช่อง).value.trim();
      var สาย = document.getElementById("สายพันธุ์-" + รหัสช่อง).value;

      if (!ชื่อ) {
        return { error: "กรอกชื่อนักเรียนให้ครบ 4 คนก่อน จึงจะเริ่มทัวนาเมนต์ได้" };
      }
      var กุญแจชื่อ = ชื่อ.toLowerCase();
      if (ชื่อที่เห็นแล้ว[กุญแจชื่อ]) {
        return { error: "ชื่อ \"" + ชื่อ + "\" ซ้ำกันมากกว่า 1 คน — ใส่ชื่อให้แต่ละคนไม่ซ้ำกัน" };
      }
      ชื่อที่เห็นแล้ว[กุญแจชื่อ] = true;

      // ใช้สัตว์เลี้ยงจริงที่ดึงมาแล้วถ้ามี (และ UID ในช่องยังตรงกับตอนที่กดดึง — กันกรณีแก้ UID
      // แล้วลืมกดดึงใหม่) ไม่งั้น fallback ไปใช้ค่าสมมติจาก dropdown สายพันธุ์ตามเดิม
      var ช่องUidEl = document.getElementById("uid-" + รหัสช่อง);
      var uidปัจจุบัน = ช่องUidEl ? ช่องUidEl.value.trim() : "";
      var สัตว์จริง = สัตว์เลี้ยงจริงที่ดึงมา[รหัสช่อง];

      if (สัตว์จริง && uidปัจจุบัน && สัตว์จริง.uid === uidปัจจุบัน) {
        bracketData[ช่อง.key][ช่อง.side] = {
          studentName: ชื่อ,
          speciesKey: สัตว์จริง.speciesKey,
          stats: สัตว์จริง.stats,
          statusAbility: สัตว์จริง.statusAbility
        };
      } else {
        var ข้อมูลสาย = window.TOURNAMENT_DEMO_SPECIES[สาย];
        bracketData[ช่อง.key][ช่อง.side] = {
          studentName: ชื่อ,
          speciesKey: สาย,
          stats: ข้อมูลสาย.stats,
          statusAbility: ข้อมูลสาย.statusAbility
        };
      }
    }

    return { bracketData: bracketData };
  }

  async function เริ่มทัวนาเมนต์() {
    กล่องเตือนตั้งค่า.classList.add("hidden");

    var ผลอ่าน = อ่านฟอร์ม();
    if (ผลอ่าน.error) {
      เตือนตั้งค่า(ผลอ่าน.error);
      return;
    }

    ปุ่มเริ่มทัวนาเมนต์.disabled = true;
    ปุ่มเริ่มทัวนาเมนต์.textContent = "กำลังสร้างทัวนาเมนต์...";

    try {
      var รหัสใหม่ = await window.สร้างทัวนาเมนต์(ผลอ่าน.bracketData);
      location.href = "tournament.html?tournamentId=" + encodeURIComponent(รหัสใหม่);
    } catch (err) {
      เตือนตั้งค่า("เริ่มทัวนาเมนต์ไม่สำเร็จ: " + err.message);
      console.error(err);
      ปุ่มเริ่มทัวนาเมนต์.disabled = false;
      ปุ่มเริ่มทัวนาเมนต์.textContent = "เริ่มทัวนาเมนต์";
    }
  }

  function เตือนตั้งค่า(ข้อความ) {
    กล่องเตือนตั้งค่า.textContent = "⚠️ " + ข้อความ;
    กล่องเตือนตั้งค่า.classList.remove("hidden");
  }

  // ── หน้าผังภาพรวม ─────────────────────────────────────────────

  async function โหลดผัง() {
    try {
      var ทัวนาเมนต์ = await window.โหลดทัวนาเมนต์(tournamentId);
      if (!ทัวนาเมนต์) {
        แสดงไม่พบ("ไม่พบทัวนาเมนต์นี้ — ลิงก์อาจไม่ถูกต้อง หรือยังไม่เคยเริ่มทัวนาเมนต์");
        return;
      }
      วาดผัง(ทัวนาเมนต์);
      กล่องผัง.classList.remove("hidden");
    } catch (err) {
      แสดงไม่พบ("โหลดทัวนาเมนต์ไม่สำเร็จ: " + err.message);
      console.error(err);
    }
  }

  function วาดผัง(ทัวนาเมนต์) {
    ที่วางผัง.innerHTML =
      '<div class="bracket">' +
        '<div class="bracket-col bracket-col-sf">' +
          สร้างกล่องคู่("semifinal1", ทัวนาเมนต์) +
          สร้างกล่องคู่("semifinal2", ทัวนาเมนต์) +
        "</div>" +
        '<div class="bracket-connector" aria-hidden="true"></div>' +
        '<div class="bracket-col bracket-col-final">' +
          สร้างกล่องคู่("final", ทัวนาเมนต์) +
        "</div>" +
      "</div>";

    ที่วางผัง.querySelectorAll("[data-action-slot-key]").forEach(function (ปุ่ม) {
      ปุ่ม.addEventListener("click", function () { กดต่อสู้(ปุ่ม); });
    });
  }

  function สร้างกล่องคู่(key, ทัวนาเมนต์) {
    var คู่ = ทัวนาเมนต์[key] || {};
    var slotA = คู่.slotA || null;
    var slotB = คู่.slotB || null;
    var บันทึก = คู่.matchLog || null;
    var ผู้ชนะ = บันทึก && บันทึก.result ? บันทึก.result.winner : null; // "A" | "B" | null (ยังไม่ชนะ/เสมอ)

    var ข้อความสถานะ;
    var ปุ่มHtml = "";

    if (บันทึก) {
      var ลิงก์รายละเอียด =
        'tournament-match.html?tournamentId=' + encodeURIComponent(ทัวนาเมนต์.id || tournamentId) +
        "&slotKey=" + encodeURIComponent(key);

      if (ผู้ชนะ === "A" || ผู้ชนะ === "B") {
        var slotชนะ = ผู้ชนะ === "A" ? slotA : slotB;
        var คะแนน = บันทึก.result.score || { A: 0, B: 0 };
        var คะแนนฝั่งชนะ = ผู้ชนะ === "A" ? คะแนน.A : คะแนน.B;
        ข้อความสถานะ =
          "ผู้ชนะ: " + esc(slotชนะ ? slotชนะ.studentName : "ไม่ทราบชื่อ") +
          " · ชนะ " + esc(คะแนนฝั่งชนะ) + " ยก";
      } else {
        ข้อความสถานะ = "เสมอ — รอครูชี้ขาด";
      }
      ปุ่มHtml = '<div class="btn-row"><a class="btn-ghost" href="' + ลิงก์รายละเอียด + '">ดูรายละเอียด →</a></div>';
    } else if (slotA && slotB) {
      ข้อความสถานะ = "ยังไม่ได้ต่อสู้";
      ปุ่มHtml =
        '<div class="btn-row"><button type="button" class="btn-ok" data-action-slot-key="' + esc(key) + '">ต่อสู้</button></div>';
    } else {
      ข้อความสถานะ = "รอผู้เข้ารอบ — ต้องมีผู้ชนะรอบรองชนะเลิศครบทั้ง 2 คู่ก่อน";
    }

    return (
      '<div class="bracket-match" data-slot-key="' + esc(key) + '">' +
        '<p class="bracket-match-title">' + esc(ชื่อรอบ[key]) + "</p>" +
        สร้างช่องฝ่าย(slotA, ผู้ชนะ === "A") +
        '<p class="vs-mark">VS</p>' +
        สร้างช่องฝ่าย(slotB, ผู้ชนะ === "B") +
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
        '<span class="slot-species">' + esc(ชื่อสายพันธุ์(slot.speciesKey)) + "</span>" +
        (ชนะ ? '<span class="slot-result">✓ ผู้ชนะ</span>' : "") +
      "</div>"
    );
  }

  async function กดต่อสู้(ปุ่ม) {
    var key = ปุ่ม.getAttribute("data-action-slot-key");
    ปุ่ม.disabled = true;
    ปุ่ม.textContent = "กำลังคำนวณ...";
    กล่องเตือนผัง.classList.add("hidden");

    try {
      await window.คำนวณแมตช์ของทัวนาเมนต์(tournamentId, key);
      await โหลดผัง();
    } catch (err) {
      เตือนผัง("คำนวณแมตช์ไม่สำเร็จ: " + err.message);
      console.error(err);
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = "ต่อสู้";
    }
  }

  function เตือนผัง(ข้อความ) {
    กล่องเตือนผัง.textContent = "⚠️ " + ข้อความ;
    กล่องเตือนผัง.classList.remove("hidden");
  }

  // ── ตัวช่วย ─────────────────────────────────────────────────

  function ชื่อสายพันธุ์(key) {
    var ข้อมูล = window.TOURNAMENT_DEMO_SPECIES && window.TOURNAMENT_DEMO_SPECIES[key];
    return ข้อมูล ? ข้อมูล.label : (key || "ไม่ระบุสายพันธุ์");
  }

  function แสดงไม่พบ(ข้อความ) {
    ข้อความไม่พบ.textContent = ข้อความ;
    กล่องไม่พบ.classList.remove("hidden");
  }

  // เรียกท้ายสุด หลังประกาศตัวแปรทั้งหมดแล้ว (ป้องกัน ช่องฝ่าย ยังเป็น undefined ตอน auth พร้อมทันที)
  ถ้าพร้อมแล้วให้เริ่ม();
})();
