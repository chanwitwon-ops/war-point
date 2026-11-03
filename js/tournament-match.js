// ─────────────────────────────────────────────────────────────
// js/tournament-match.js — หน้ารายละเอียดผลแมตช์ 1 คู่ของทัวนาเมนต์ (เดโม 18 ธ.ค. 2026)
// ตามสเปก docs/01-requirements/01-spec/20261103-08-tournament-bracket-demo.md
//
// อ่านค่าจาก URL: tournament-match.html?tournamentId=...&slotKey=semifinal1|semifinal2|final
// แล้วอ่าน battle log ของแมตช์นั้นจากฟังก์ชันโหลด (ไม่ได้คำนวณผลเอง) มาแสดงทีละเหตุการณ์ตาม seq
//
// **ขอบเขตของไฟล์นี้ (ui-screens): ห้ามคำนวณผลการต่อสู้ และห้ามอ่าน/เขียน Firestore เอง**
// HP ที่แสดงในแต่ละขั้นมาจาก hpBefore/hpAfter/payload.hp ของ event ที่บันทึกไว้เท่านั้น
//
// ── สัญญา (contract) ของ window.โหลดทัวนาเมนต์ (ดูรายละเอียดเต็มในไฟล์ js/tournament.js) ──
//   [แก้ตามของจริงที่ data-auth-engineer ต่อมาแล้ว 2026-11-03 — ไม่มี .bracket/.matches ซ้อนอีกต่อไป]
//   window.โหลดทัวนาเมนต์(tournamentId) → Promise<Tournament | null>
//   Tournament[slotKey] = { slotA: {studentName, speciesKey, stats, statusAbility}, slotB: {...},
//                           matchId, winnerSlot, matchLog? }  — เป็น top-level key ตรงๆ ของ Tournament
//   Tournament[slotKey].matchLog = BattleLog | undefined — ผลของ window.คำนวณผลการต่อสู้ (sideA ↔ slotA, sideB ↔ slotB)
//   หมายเหตุ: ใน BattleLog ค่า result.winner และ match_end.payload.winner เป็น "A" | "B" | null
//   ส่วน round_end.payload.winner เป็น studentId — หน้านี้แปลงให้ถูกต้องแล้ว
//
// ── ที่วางภาพเคลื่อนไหว (จุดสลับคลิปวิดีโอในอนาคต) ──
//   ฟังก์ชัน วาดภาพเคลื่อนไหว() เป็นจุดเดียวที่เขียนลงกล่อง #ที่วางภาพเคลื่อนไหว
//   ตอนนี้เติมข้อความแทน (placeholder) — ในอนาคตแทนด้วย <video> ของสายพันธุ์ในฟังก์ชันนี้เท่านั้น
// ─────────────────────────────────────────────────────────────

(function () {
  var tournamentId = ค่าจากURL("tournamentId");
  var slotKey = ค่าจากURL("slotKey");

  var ชื่อรอบ = {
    semifinal1: "รอบรองชนะเลิศ คู่ที่ 1",
    semifinal2: "รอบรองชนะเลิศ คู่ที่ 2",
    final: "รอบชิงชนะเลิศ"
  };

  // ชื่อสถานะไทยตามสเปก (engine ใช้คีย์อังกฤษ ต้องแปลงตอนแสดงผล)
  var ชื่อสถานะไทย = {
    burn: "ไฟไหม้",
    bleed: "เลือดไหล",
    poison: "พิษ",
    paralyze: "ชา",
    blind: "ตาบอด",
    fear: "หวาดกลัว",
    charm: "หลงไหล"
  };

  var ชื่อไอเทม = {
    cleanse: "ไอเทมล้างสถานะ",
    secondWind: "ไอเทมป้องกันการโจมตีถึงตาย"
  };

  var ชื่อเหตุผลแมตช์ = {
    rounds: "ชนะ 2 ยกก่อน",
    hp_sum_tiebreak: "ยกเท่ากัน ตัดสินด้วยผลรวม %HP ที่เหลือ",
    spd_tiebreak: "ตัดสินด้วยค่าความเร็วฐาน",
    draw: "เสมอจริง",
    teacher_decides: "เสมอ — รอครูชี้ขาด"
  };

  var ชื่อเหตุผลยก = {
    ko: "น็อคเอาต์",
    turn_limit: "ครบ 20 เทิร์น ตัดสินด้วย %HP ที่เหลือ"
  };

  var ชื่อสเตตัสไทย = { SPD: "ความเร็ว", ATK: "พละกำลัง", ACC: "ความแม่นยำ", DEF: "ค่าพลังป้องกัน", HP: "พลังชีวิต" };
  var ลำดับสเตตัส = ["SPD", "ATK", "ACC", "DEF", "HP"];

  var ระยะเวลาต่อเหตุการณ์ = 900; // มิลลิวินาที — เดโมใช้ความเร็วเดียว ยังไม่มี x1/x2

  var กล่องกำลังโหลด = document.getElementById("กล่องกำลังโหลด");
  var กล่องไม่มีสิทธิ์ = document.getElementById("กล่องไม่มีสิทธิ์");
  var กล่องไม่พบ = document.getElementById("กล่องไม่พบ");
  var ข้อความไม่พบ = document.getElementById("ข้อความไม่พบ");
  var กล่องหลัก = document.getElementById("กล่องหลัก");
  var หัวข้อแมตช์ = document.getElementById("หัวข้อแมตช์");
  var คำอธิบายแมตช์ = document.getElementById("คำอธิบายแมตช์");
  var ลิงก์กลับผัง = document.getElementById("ลิงก์กลับผัง");
  var กล่องฝ่าย = document.getElementById("กล่องฝ่าย");
  var กล่องผลสรุป = document.getElementById("กล่องผลสรุป");
  var ที่วางภาพเคลื่อนไหว = document.getElementById("ที่วางภาพเคลื่อนไหว");
  var ตัวนับเหตุการณ์ = document.getElementById("ตัวนับเหตุการณ์");
  var ปุ่มเล่น = document.getElementById("ปุ่มเล่น");
  var ปุ่มก้าวถัดไป = document.getElementById("ปุ่มก้าวถัดไป");
  var ปุ่มกลับไปต้น = document.getElementById("ปุ่มกลับไปต้น");
  var กล่องบันทึก = document.getElementById("บันทึกเหตุการณ์");

  var ทัวนาเมนต์ = null;
  var แมตช์ = null;
  var ฝ่าย = null;          // { A: {studentId, name, speciesLabel, stats, hpPool, pendingClip, isWinner}, B: {...} }
  var เหตุการณ์ = [];        // battle log events เรียงตาม seq
  var สแนปช็อตHP = [];       // สแนปช็อตHP[i] = HP ของทั้งสองฝ่ายหลังเหตุการณ์ที่ i-1 (index 0 = ก่อนเริ่ม)
  var ตำแหน่ง = 0;           // จำนวนเหตุการณ์ที่แสดงไปแล้ว
  var กำลังเล่น = false;
  var ตัวจับเวลา = null;

  // ── stub: กันหน้าพังตอนยังไม่มีใครต่อระบบโหลดจริง (รูปแบบเดียวกับ js/tournament.js) ──
  window.โหลดทัวนาเมนต์ = window.โหลดทัวนาเมนต์ || async function (tournamentId) {
    throw new Error("ยังไม่ได้เชื่อมระบบโหลดทัวนาเมนต์");
  };

  function ถ้าพร้อมแล้วให้เริ่ม() {
    if (window.CURRENT_USER) {
      เริ่ม();
    } else {
      window.addEventListener("auth-ready", เริ่ม, { once: true });
    }
  }

  function เริ่ม() {
    กล่องกำลังโหลด.classList.add("hidden");

    if (window.CURRENT_USER.role !== "teacher") {
      กล่องไม่มีสิทธิ์.classList.remove("hidden");
      return;
    }

    ลิงก์กลับผัง.href = "tournament.html" + (tournamentId ? "?tournamentId=" + encodeURIComponent(tournamentId) : "");
    โหลดแมตช์();
  }

  async function โหลดแมตช์() {
    if (!tournamentId) {
      แสดงไม่พบ("ไม่พบรหัสทัวนาเมนต์ในลิงก์ — กลับไปเลือกแมตช์จากหน้าผังทัวนาเมนต์");
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(ชื่อรอบ, slotKey)) {
      แสดงไม่พบ("ไม่พบแมตช์นี้ — ลิงก์ไม่ถูกต้อง");
      return;
    }

    try {
      var ผลโหลด = await window.โหลดทัวนาเมนต์(tournamentId);
      if (!ผลโหลด) {
        แสดงไม่พบ("ไม่พบทัวนาเมนต์นี้ — ลิงก์อาจไม่ถูกต้อง");
        return;
      }

      var คู่ = ผลโหลด[slotKey] || null;
      var บันทึก = คู่ ? คู่.matchLog : null;
      if (!บันทึก) {
        แสดงไม่พบ("แมตช์นี้ยังไม่ได้ต่อสู้ — กลับไปกดต่อสู้ที่หน้าผังทัวนาเมนต์ก่อน");
        return;
      }

      ทัวนาเมนต์ = ผลโหลด;
      แมตช์ = บันทึก;

      ฝ่าย = {
        A: สร้างข้อมูลฝ่าย("A", คู่.slotA, บันทึก.sideA),
        B: สร้างข้อมูลฝ่าย("B", คู่.slotB, บันทึก.sideB)
      };
      เหตุการณ์ = Array.isArray(บันทึก.events) ? บันทึก.events : [];
      สแนปช็อตHP = คำนวณสแนปช็อตHP(เหตุการณ์);

      วาดหัวข้อ();
      วาดฝ่าย();
      วาดผลสรุป();
      กล่องหลัก.classList.remove("hidden");
      ไปตำแหน่ง(0);
    } catch (err) {
      แสดงไม่พบ("โหลดข้อมูลแมตช์ไม่สำเร็จ: " + err.message);
      console.error(err);
    }
  }

  // ── ข้อมูลฝ่าย: ชื่อ/สายพันธุ์มาจากผัง, สเตตัสและ hpPool มาจาก battle log ──
  function สร้างข้อมูลฝ่าย(ค, slot, side) {
    var s = side || {};
    var ข้อมูลสาย = slot && window.TOURNAMENT_DEMO_SPECIES ? window.TOURNAMENT_DEMO_SPECIES[slot.speciesKey] : null;
    var สเตตัส = s.stats || (ข้อมูลสาย && ข้อมูลสาย.stats) || {};
    var ผู้ชนะ = แมตช์.result && (แมตช์.result.winner === ค);

    return {
      studentId: s.studentId == null ? null : s.studentId,
      name: slot && slot.studentName ? slot.studentName : "ฝ่าย " + ค,
      speciesLabel: slot ? ชื่อสายพันธุ์(slot.speciesKey) : (s.species || "ไม่ระบุสายพันธุ์"),
      stats: สเตตัส,
      hpPool: typeof s.hpPool === "number" ? s.hpPool : null,
      pendingClip: !!(ข้อมูลสาย && ข้อมูลสาย.animationStatus === "pending"),
      isWinner: !!ผู้ชนะ
    };
  }

  function ฝั่งของ(studentId) {
    if (studentId == null) return null;
    if (ฝ่าย.A.studentId === studentId) return "A";
    if (ฝ่าย.B.studentId === studentId) return "B";
    return null;
  }

  function ชื่อของ(studentId) {
    var ค = ฝั่งของ(studentId);
    return ค ? ฝ่าย[ค].name : "ไม่ทราบชื่อ";
  }

  // อ่าน HP หลังทุกเหตุการณ์จากค่าที่ engine บันทึกไว้ (ไม่คำนวณดาเมจเอง)
  function คำนวณสแนปช็อตHP(events) {
    var hp = { A: ฝ่าย.A.hpPool, B: ฝ่าย.B.hpPool };
    var ผล = [{ A: hp.A, B: hp.B }];

    events.forEach(function (ev) {
      var p = ev.payload || {};
      if ((ev.type === "round_start" || ev.type === "round_end") && p.hp) {
        hp = { A: p.hp.A, B: p.hp.B };
      } else if ((ev.type === "damage_dealt" || ev.type === "status_tick") && typeof p.hpAfter === "number") {
        var ค1 = ฝั่งของ(p.target);
        if (ค1) hp[ค1] = p.hpAfter;
      } else if (ev.type === "item_triggered" && p.effect === "survive_at_1hp") {
        var ค2 = ฝั่งของ(p.owner);
        if (ค2) hp[ค2] = 1;
      }
      ผล.push({ A: hp.A, B: hp.B });
    });

    return ผล;
  }

  // ── แปลง event type เป็นข้อความไทย (ครบ 18 ชนิดตามสเปก ง.๒ ข้อ 14) ──
  function ข้อความเหตุการณ์(ev) {
    var p = ev.payload || {};
    switch (ev.type) {
      case "match_start":
        return "เริ่มแมตช์ (Best of 3 ยก)";
      case "round_start":
        return "เริ่มยก " + ev.round + " — HP ของทั้งสองฝ่ายกลับเต็ม และสถานะถูกล้าง";
      case "turn_start":
        return ชื่อของ(p.order && p.order[0]) + " ได้ลงมือก่อนในเทิร์นนี้";
      case "extra_attack":
        return ชื่อของ(p.actor) + " โจมตีเพิ่มอีกครั้ง (ความเร็วมากกว่าเท่าตัว)";
      case "action_declared":
        return ชื่อของ(p.actor) + (p.action === "energy" ? " ใช้พลังพิเศษใส่ " : " โจมตีระยะประชิดใส่ ") + ชื่อของ(p.target);
      case "attack_missed":
        return ชื่อของ(p.actor) + " โจมตีพลาด!";
      case "attack_blocked":
        return ชื่อของ(p.target) + " ป้องกันการโจมตีของ " + ชื่อของ(p.actor) + " ได้";
      case "damage_dealt":
        return ชื่อของ(p.target) + " โดนโจมตี เสียเลือด " + p.amount + " หน่วย (HP " + p.hpBefore + " → " + p.hpAfter + ")";
      case "status_applied":
        return ชื่อของ(p.target) + " ติดสถานะ (" + สถานะไทย(p.status) + ")";
      case "status_refreshed":
        return ชื่อของ(p.target) + " ได้รับสถานะ (" + สถานะไทย(p.status) + ") อีกครั้ง — นับระยะเวลาใหม่";
      case "status_replaced":
        return ชื่อของ(p.target) + " สถานะ (" + สถานะไทย(p.removed) + ") ถูกแทนที่ด้วย (" + สถานะไทย(p.added) + ")";
      case "status_tick":
        return ชื่อของ(p.target) + " ได้รับผลจากสถานะ (" + สถานะไทย(p.status) + ") เสียเลือด " + p.amount + " หน่วย";
      case "status_expired":
        return "สถานะ (" + สถานะไทย(p.status) + ") ของ " + ชื่อของ(p.target) + " หมดอายุแล้ว";
      case "status_blocked_turn":
        return ชื่อของ(p.target) + " อยู่ในสถานะ (" + สถานะไทย(p.status) + ") — ข้ามเทิร์นนี้ โจมตีไม่ได้";
      case "item_triggered":
        if (p.item === "cleanse") return ชื่อของ(p.owner) + " ใช้" + ชื่อไอเทม.cleanse + " — ล้างพลังพิเศษที่ติดอยู่";
        if (p.item === "secondWind") return ชื่อของ(p.owner) + " ใช้" + ชื่อไอเทม.secondWind + " — ยังอยู่ที่ 1 HP";
        return ชื่อของ(p.owner) + " ใช้ไอเทม";
      case "ko":
        return ชื่อของ(p.target) + " หมดแรง (KO)";
      case "round_end":
        var เหตุผลยก = ชื่อเหตุผลยก[p.reason] || p.reason;
        if (p.winner) return ชื่อของ(p.winner) + " ชนะยกนี้ (" + เหตุผลยก + ")";
        return "ยกนี้เสมอ (" + เหตุผลยก + ")";
      case "match_end":
        if (p.winner === "A" || p.winner === "B") {
          return ฝ่าย[p.winner].name + " ชนะแมตช์ (" + สกอร์(p.score) + ")";
        }
        return "แมตช์นี้เสมอ — " + (ชื่อเหตุผลแมตช์[p.reason] || p.reason || "");
      default:
        return ev.type;
    }
  }

  function สถานะไทย(คีย์) {
    return ชื่อสถานะไทย[คีย์] || คีย์ || "ไม่ทราบสถานะ";
  }

  function สกอร์(score) {
    if (!score) return "—";
    return score.A + " – " + score.B + " ยก";
  }

  function ป้ายตำแหน่ง(ev) {
    if (!ev.round) return "แมตช์";
    return "ยก " + ev.round + (ev.turn ? " · เทิร์น " + ev.turn : "");
  }

  // ── วาดส่วนหัว/ฝ่าย/ผลสรุป (ครั้งเดียวตอนโหลด) ──
  function วาดหัวข้อ() {
    หัวข้อแมตช์.textContent = ชื่อรอบ[slotKey];
    คำอธิบายแมตช์.textContent = ฝ่าย.A.name + " VS " + ฝ่าย.B.name + " · Best of 3 ยก";
  }

  function วาดฝ่าย() {
    กล่องฝ่าย.innerHTML = ["A", "B"].map(function (ค, i) {
      var ข้อมูล = ฝ่าย[ค];
      var ชิปสเตตัส = ลำดับสเตตัส.map(function (k) {
        var ป้าย = ชื่อสเตตัสไทย[k] ? k + " · " + ชื่อสเตตัสไทย[k] : k;
        var ค่า = ข้อมูล.stats[k] != null ? ข้อมูล.stats[k] : "—";
        return '<span class="stat-chip">' + esc(ป้าย) + " " + esc(ค) + "</span>";
      }).join("");

      var ฝ่ายHtml =
        '<div class="fighter' + (ข้อมูล.isWinner ? " is-winner" : "") + '">' +
          (ข้อมูล.isWinner ? '<p class="slot-result">✓ ผู้ชนะแมตช์</p>' : "") +
          '<p class="fighter-name">' + esc(ข้อมูล.name) + "</p>" +
          '<p class="fighter-species">' + esc(ข้อมูล.speciesLabel) + "</p>" +
          (ข้อมูล.pendingClip ? '<p class="note-tag">ยังไม่มีคลิปของสายพันธุ์นี้ — ใช้ข้อความแทนไปก่อน</p>' : "") +
          '<p class="stat-caption">ค่าสเตตัส (ค่าสมมติ)</p>' +
          '<div class="stat-chips">' + ชิปสเตตัส + "</div>" +
          '<div class="hp-track"><div class="hp-fill" data-hp-fill="' + ค + '"></div></div>' +
          '<p class="hp-text" data-hp-text="' + ค + '"></p>' +
        "</div>";

      return (i === 1 ? '<p class="vs-big">VS</p>' : "") + ฝ่ายHtml;
    }).join("");
  }

  function วาดผลสรุป() {
    var ผล = แมตช์.result || {};
    var ผู้ชนะ = ผล.winner;
    var แถวผู้ชนะ;

    if (ผู้ชนะ === "A" || ผู้ชนะ === "B") {
      แถวผู้ชนะ = "✓ " + ฝ่าย[ผู้ชนะ].name + " (" + ฝ่าย[ผู้ชนะ].speciesLabel + ")";
    } else {
      แถวผู้ชนะ = "ยังไม่มีผู้ชนะ — เสมอ รอครูชี้ขาด";
    }

    กล่องผลสรุป.innerHTML =
      แถวสรุป("ผู้ชนะ", แถวผู้ชนะ) +
      แถวสรุป("สกอร์ยก", ฝ่าย.A.name + " " + สกอร์(ผล.score) + " " + ฝ่าย.B.name) +
      แถวสรุป("เหตุผล", ชื่อเหตุผลแมตช์[ผล.reason] || ผล.reason || "—");
  }

  function แถวสรุป(หัว, ค่า) {
    return '<div class="field-row"><span class="k">' + esc(หัว) + "</span><span>" + esc(ค่า) + "</span></div>";
  }

  // ── การเล่นทีละเหตุการณ์ (setTimeout ง่ายๆ ไม่มี x1/x2 ในรอบนี้) ──
  function ไปตำแหน่ง(n) {
    ตำแหน่ง = Math.max(0, Math.min(n, เหตุการณ์.length));
    รีเฟรช();
  }

  function รีเฟรช() {
    วาดHP(สแนปช็อตHP[ตำแหน่ง]);
    วาดภาพเคลื่อนไหว();
    วาดบันทึก();

    ตัวนับเหตุการณ์.textContent = "เหตุการณ์ที่ " + ตำแหน่ง + " / " + เหตุการณ์.length;

    var จบแล้ว = ตำแหน่ง >= เหตุการณ์.length;
    ปุ่มเล่น.disabled = เหตุการณ์.length === 0;
    ปุ่มเล่น.textContent = กำลังเล่น ? "⏸ หยุด" : (จบแล้ว && เหตุการณ์.length > 0 ? "▶ เล่นใหม่" : "▶ เล่น");
    ปุ่มก้าวถัดไป.disabled = จบแล้ว;
  }

  function วาดHP(สแนป) {
    ["A", "B"].forEach(function (ค) {
      var pool = ฝ่าย[ค].hpPool;
      var hp = สแนป ? สแนป[ค] : null;
      var แถบ = กล่องฝ่าย.querySelector('[data-hp-fill="' + ค + '"]');
      var ข้อความ = กล่องฝ่าย.querySelector('[data-hp-text="' + ค + '"]');
      if (!แถบ || !ข้อความ) return;

      if (pool == null || hp == null) {
        แถบ.style.width = "0%";
        ข้อความ.textContent = "HP: ไม่มีข้อมูล";
        return;
      }

      var สัดส่วน = pool > 0 ? Math.max(0, Math.min(1, hp / pool)) : 0;
      แถบ.style.width = (สัดส่วน * 100).toFixed(1) + "%";
      แถบ.classList.toggle("is-low", สัดส่วน <= 0.3);
      ข้อความ.textContent = "HP " + hp + " / " + pool + " (ค่าสมมติ)";
    });
  }

  // จุดเดียวที่เขียนลงกล่องภาพเคลื่อนไหว — ตอนนี้เป็นข้อความแทน
  // ในอนาคตเปลี่ยนเป็น <video> ของสายพันธุ์ตรงนี้ได้ โดยไม่ต้องแก้โครงหน้า
  function วาดภาพเคลื่อนไหว() {
    var ปัจจุบัน = ตำแหน่ง > 0 ? เหตุการณ์[ตำแหน่ง - 1] : null;
    var หัวข้อ = ปัจจุบัน
      ? ข้อความเหตุการณ์(ปัจจุบัน)
      : "กดเล่นหรือก้าวถัดไปเพื่อเริ่มดูผลการต่อสู้";

    ที่วางภาพเคลื่อนไหว.innerHTML =
      '<p class="stage-note">ภาพเคลื่อนไหวยังไม่พร้อม — แสดงเหตุการณ์เป็นข้อความแทน</p>' +
      '<p class="stage-headline">' + esc(หัวข้อ) + "</p>";
  }

  function วาดบันทึก() {
    if (ตำแหน่ง === 0) {
      กล่องบันทึก.innerHTML = '<li class="event-empty">ยังไม่มีเหตุการณ์ — กดเล่นเพื่อเริ่ม</li>';
      return;
    }

    กล่องบันทึก.innerHTML = เหตุการณ์.slice(0, ตำแหน่ง).map(function (ev, i) {
      return (
        '<li class="' + (i === ตำแหน่ง - 1 ? "is-current" : "") + '">' +
        '<span class="event-round">' + esc(ป้ายตำแหน่ง(ev)) + "</span>" +
        esc(ข้อความเหตุการณ์(ev)) +
        "</li>"
      );
    }).join("");
    กล่องบันทึก.scrollTop = กล่องบันทึก.scrollHeight;
  }

  function สลับเล่น() {
    if (กำลังเล่น) {
      หยุด();
      return;
    }
    if (เหตุการณ์.length === 0) return;
    if (ตำแหน่ง >= เหตุการณ์.length) ตำแหน่ง = 0;

    กำลังเล่น = true;
    รีเฟรช();
    ก้าวอัตโนมัติ();
  }

  function ก้าวอัตโนมัติ() {
    ตัวจับเวลา = setTimeout(function () {
      ไปตำแหน่ง(ตำแหน่ง + 1);
      if (ตำแหน่ง >= เหตุการณ์.length) {
        หยุด();
        return;
      }
      ก้าวอัตโนมัติ();
    }, ระยะเวลาต่อเหตุการณ์);
  }

  function หยุด() {
    กำลังเล่น = false;
    clearTimeout(ตัวจับเวลา);
    ตัวจับเวลา = null;
    รีเฟรช();
  }

  function ก้าวทีละเหตุการณ์() {
    หยุด();
    ไปตำแหน่ง(ตำแหน่ง + 1);
  }

  function กลับไปต้น() {
    หยุด();
    ไปตำแหน่ง(0);
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

  // ── ผูกปุ่มควบคุม และเริ่มทำงาน (เรียกท้ายสุดหลังประกาศตัวแปรทั้งหมดแล้ว) ──
  ปุ่มเล่น.addEventListener("click", สลับเล่น);
  ปุ่มก้าวถัดไป.addEventListener("click", ก้าวทีละเหตุการณ์);
  ปุ่มกลับไปต้น.addEventListener("click", กลับไปต้น);

  ถ้าพร้อมแล้วให้เริ่ม();
})();
