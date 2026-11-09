// ─────────────────────────────────────────────────────────────
// js/tournament-match.js — หน้ารายละเอียดผลแมตช์ 1 คู่ของทัวนาเมนต์ (เดโม 18 ธ.ค. 2026)
// ตามสเปก docs/01-requirements/01-spec/20261103-08-tournament-bracket-demo.md
//
// อ่านค่าจาก URL: tournament-match.html?tournamentId=...&match=r1m2 (รหัสคู่)
// แล้วเล่น battle log ที่บันทึกไว้ (ไม่คำนวณผลเอง) ทั้งเป็นแอนิเมชัน Pixie และบันทึกข้อความ
// เปิดได้ทั้งครูและนักเรียน (นักเรียนดูอย่างเดียว — หน้านี้ไม่มีปุ่มเขียนข้อมูลใดๆ อยู่แล้ว)
//
// ── สัญญาที่ใช้ ──
//   window.โหลดทัวนาเมนต์(tournamentId) → Tournament (js/tournament-data.js)
//     Tournament.matches[matchKey] = { slotA, slotB, matchId, winnerSlot, decidedByTeacher?, matchLog? }
//     slot = { studentUid, studentName, speciesKey, stage, stats }
//   matchLog = ผลของ window.คำนวณผลการต่อสู้ v2 (js/combat-engine.js) — sideA ↔ slotA
//     result = { winner: "A"|"B"|null, reason: "ko"|"turn_limit"|"teacher_decides", turns }
//   window.สร้างเวทีต่อสู้(ที่วาง, speciesA, speciesB) (js/pet-animation.js) — null ถ้าไม่มีคลิป
// ─────────────────────────────────────────────────────────────

(function () {
  var tournamentId = ค่าจากURL("tournamentId");
  // [แก้ 2026-11-09] ทัวนาเมนต์กี่คนก็ได้ — ระบุคู่ด้วย ?match=r1m2 (รหัสคู่ใน tournaments/{id}.matches)
  var matchKey = ค่าจากURL("match");
  var หัวข้อของคู่ = "";

  var ชื่อเหตุผล = {
    ko: "น็อคเอาต์",
    turn_limit: "ครบ 30 เทิร์น ชนะด้วยเลือดที่เหลือมากกว่า",
    teacher_decides: "เลือดเท่ากันเป๊ะหลังครบ 30 เทิร์น — ครูเป็นผู้ตัดสิน"
  };

  var พักระหว่างจังหวะ = 450;      // มิลลิวินาที หลังแอนิเมชันแต่ละจังหวะจบ
  var นานจังหวะไม่มีภาพ = 900;    // ใช้เมื่อไม่มีคลิป (แสดงข้อความแทน)

  window.โหลดทัวนาเมนต์ = window.โหลดทัวนาเมนต์ || async function () {
    throw new Error("ยังไม่ได้เชื่อมระบบโหลดทัวนาเมนต์");
  };

  var กล่องกำลังโหลด = document.getElementById("กล่องกำลังโหลด");
  var กล่องไม่พบ = document.getElementById("กล่องไม่พบ");
  var ข้อความไม่พบ = document.getElementById("ข้อความไม่พบ");
  var กล่องหลัก = document.getElementById("กล่องหลัก");
  var หัวข้อแมตช์ = document.getElementById("หัวข้อแมตช์");
  var คำอธิบายแมตช์ = document.getElementById("คำอธิบายแมตช์");
  var ลิงก์กลับผัง = document.getElementById("ลิงก์กลับผัง");
  var กล่องฝ่าย = document.getElementById("กล่องฝ่าย");
  var กล่องผลสรุป = document.getElementById("กล่องผลสรุป");
  var ที่วางภาพเคลื่อนไหว = document.getElementById("ที่วางภาพเคลื่อนไหว");
  var ข้อความใต้ภาพ = document.getElementById("ข้อความใต้ภาพ");
  var ตัวนับเหตุการณ์ = document.getElementById("ตัวนับเหตุการณ์");
  var ปุ่มเล่น = document.getElementById("ปุ่มเล่น");
  var ปุ่มก้าวถัดไป = document.getElementById("ปุ่มก้าวถัดไป");
  var ปุ่มกลับไปต้น = document.getElementById("ปุ่มกลับไปต้น");
  var กล่องบันทึก = document.getElementById("บันทึกเหตุการณ์");

  var คู่ = null;
  var แมตช์ = null;
  var ฝ่าย = null;          // { A: {...}, B: {...} }
  var เหตุการณ์ = [];
  var สแนปช็อตHP = [];       // สแนปช็อตHP[i] = HP ทั้งสองฝ่ายหลังแสดงเหตุการณ์ไปแล้ว i ตัว
  var จังหวะ = [];           // [{ เริ่ม, จบ }] ช่วงดัชนีเหตุการณ์ที่เล่นเป็นแอนิเมชันเดียวกัน
  var ตำแหน่ง = 0;           // จำนวนเหตุการณ์ที่แสดงไปแล้ว
  var กำลังเล่น = false;
  var กำลังเล่นจังหวะ = false;
  var รุ่นการเล่น = 0;       // เพิ่มทุกครั้งที่หยุด/รีเซ็ต — ลูปที่ค้างจากรุ่นเก่าจะเลิกเอง
  var เวที = null;

  if (window.CURRENT_USER) {
    เริ่ม();
  } else {
    window.addEventListener("auth-ready", เริ่ม, { once: true });
  }

  function เริ่ม() {
    กล่องกำลังโหลด.classList.add("hidden");
    ลิงก์กลับผัง.href = "tournament.html" + (tournamentId ? "?tournamentId=" + encodeURIComponent(tournamentId) : "");
    โหลดแมตช์();
  }

  async function โหลดแมตช์() {
    if (!tournamentId) {
      แสดงไม่พบ("ไม่พบรหัสทัวนาเมนต์ในลิงก์ — กลับไปเลือกแมตช์จากหน้าผังทัวนาเมนต์");
      return;
    }
    if (!/^r\d+m\d+$/.test(matchKey)) {
      แสดงไม่พบ("ไม่พบแมตช์นี้ — ลิงก์ไม่ถูกต้อง");
      return;
    }

    try {
      var ผลโหลด = await window.โหลดทัวนาเมนต์(tournamentId);
      if (!ผลโหลด) {
        แสดงไม่พบ("ไม่พบทัวนาเมนต์นี้ — ลิงก์อาจไม่ถูกต้อง");
        return;
      }
      คู่ = (ผลโหลด.matches && ผลโหลด.matches[matchKey]) || null;
      if (คู่) {
        หัวข้อของคู่ = ชื่อรอบทัวนาเมนต์(คู่.round, ผลโหลด.roundCount) + " · คู่ที่ " + คู่.index;
      }
      แมตช์ = คู่ ? คู่.matchLog : null;
      if (!แมตช์) {
        แสดงไม่พบ("แมตช์นี้ยังไม่ได้ต่อสู้ — รอครูกดต่อสู้ที่หน้าผังทัวนาเมนต์ก่อน");
        return;
      }

      ฝ่าย = {
        A: สร้างข้อมูลฝ่าย(คู่.slotA, แมตช์.sideA),
        B: สร้างข้อมูลฝ่าย(คู่.slotB, แมตช์.sideB)
      };
      เหตุการณ์ = Array.isArray(แมตช์.events) ? แมตช์.events : [];
      สแนปช็อตHP = คำนวณสแนปช็อตHP(เหตุการณ์);
      จังหวะ = แบ่งจังหวะ(เหตุการณ์);

      วาดหัวข้อ();
      วาดฝ่าย();
      วาดผลสรุป();
      กล่องหลัก.classList.remove("hidden");

      เวที = window.สร้างเวทีต่อสู้
        ? window.สร้างเวทีต่อสู้(ที่วางภาพเคลื่อนไหว, ฝ่าย.A.speciesKey, ฝ่าย.B.speciesKey)
        : null;
      if (!เวที) {
        ที่วางภาพเคลื่อนไหว.innerHTML = '<p class="stage-note">ยังไม่มีคลิปของสายพันธุ์นี้ — แสดงเหตุการณ์เป็นข้อความแทน</p>';
      }

      ไปตำแหน่ง(0);
    } catch (err) {
      แสดงไม่พบ("โหลดข้อมูลแมตช์ไม่สำเร็จ: " + err.message);
      console.error(err);
    }
  }

  function สร้างข้อมูลฝ่าย(slot, side) {
    var s = side || {};
    var sl = slot || {};
    var speciesKey = sl.speciesKey || s.species || "";
    return {
      studentId: s.studentId,
      name: sl.studentName || s.petName || "ไม่ทราบชื่อ",
      speciesKey: speciesKey,
      speciesLabel: (window.PET_SPECIES_LABELS && window.PET_SPECIES_LABELS[speciesKey]) || speciesKey || "ไม่ระบุสายพันธุ์",
      stageLabel: typeof sl.stage === "number" && window.PET_STAGE_LABELS ? window.PET_STAGE_LABELS[sl.stage] : "",
      stats: s.stats || sl.stats || {},
      hpPool: typeof s.hpPool === "number" ? s.hpPool : null
    };
  }

  function ฝั่งของ(studentId) {
    if (ฝ่าย.A.studentId === studentId) return "A";
    if (ฝ่าย.B.studentId === studentId) return "B";
    return null;
  }

  function ชื่อของ(studentId) {
    var ค = ฝั่งของ(studentId);
    return ค ? ฝ่าย[ค].name : "ไม่ทราบชื่อ";
  }

  // HP หลังทุกเหตุการณ์ อ่านจาก hpAfter ที่ engine บันทึกไว้เท่านั้น (ไม่คำนวณดาเมจเอง)
  function คำนวณสแนปช็อตHP(events) {
    var hp = { A: ฝ่าย.A.hpPool, B: ฝ่าย.B.hpPool };
    var ผล = [{ A: hp.A, B: hp.B }];
    events.forEach(function (ev) {
      var p = ev.payload || {};
      if (ev.type === "damage_dealt" && typeof p.hpAfter === "number") {
        var ค = ฝั่งของ(p.target);
        if (ค) hp[ค] = p.hpAfter;
      }
      ผล.push({ A: hp.A, B: hp.B });
    });
    return ผล;
  }

  // การยิง 1 ครั้ง = attack + ผลของมัน (+ ko ถ้ามี) เล่นเป็นแอนิเมชันก้อนเดียว
  function แบ่งจังหวะ(events) {
    var ผล = [];
    var i = 0;
    while (i < events.length) {
      var เริ่มที่ = i;
      // ลูกที่สอง [engine v2.1.0]: double_shot + attack ที่ตามมา + ผล (+ ko) เป็นจังหวะเดียว
      if (events[i].type === "double_shot" && i + 1 < events.length && events[i + 1].type === "attack") i++;
      if (events[i].type === "attack") {
        i++;
        if (i < events.length && /^(attack_missed|attack_blocked|damage_dealt)$/.test(events[i].type)) i++;
        if (i < events.length && events[i].type === "ko") i++;
      } else {
        i++;
      }
      ผล.push({ เริ่ม: เริ่มที่, จบ: i });
    }
    return ผล;
  }

  function ข้อความเหตุการณ์(ev) {
    var p = ev.payload || {};
    switch (ev.type) {
      case "match_start":
        return "เริ่มการต่อสู้! สู้ยกเดียวจนเลือดฝ่ายใดหมด (เพดาน 30 เทิร์น)";
      case "turn_start":
        var ความเร็วเท่ากัน = ฝ่าย.A.stats.SPD === ฝ่าย.B.stats.SPD;
        return "เทิร์น " + ev.turn + " — " + ชื่อของ(p.order && p.order[0]) + " ได้ยิงก่อน" +
          (ความเร็วเท่ากัน ? " (ความเร็วเท่ากัน สุ่มได้)" : " (เร็วกว่า)");
      case "attack":
        return ชื่อของ(p.actor) + " ยิงพลังใส่ " + ชื่อของ(p.target);
      case "double_shot":
        return "⚡ " + ชื่อของ(p.actor) + " เร็วพอ ได้ยิงลูกที่สอง! (โอกาส " + p.chance + "% ทอยได้ " + p.roll + ")";
      case "attack_missed":
        return ชื่อของ(p.target) + " หลบได้! (โอกาสโดน " + p.hitChance + "% ทอยได้ " + p.roll + ")";
      case "attack_blocked":
        return ชื่อของ(p.target) + " บล็อกได้ ไม่เสียเลือด! (โอกาสบล็อก " + p.blockChance + "% ทอยได้ " + p.roll + ")";
      case "damage_dealt":
        return ชื่อของ(p.target) + " โดน เสียเลือด " + p.amount + " (HP " + p.hpBefore + " → " + p.hpAfter + ")";
      case "ko":
        return ชื่อของ(p.target) + " หมดแรง!";
      case "turn_limit":
        var pct = p.hpPct || {};
        return "ครบ 30 เทิร์น — เลือดที่เหลือ " + ฝ่าย.A.name + " " + เปอร์เซ็นต์(pct.A) + " / " + ฝ่าย.B.name + " " + เปอร์เซ็นต์(pct.B);
      case "match_end":
        if (p.winner === "A" || p.winner === "B") {
          return "🏆 " + ฝ่าย[p.winner].name + " ชนะ! (" + (ชื่อเหตุผล[p.reason] || p.reason) + ")";
        }
        return "เลือดเท่ากันเป๊ะ — รอครูตัดสินผู้ชนะ";
      default:
        return ev.type; // event ชนิดที่ไม่รู้จัก — แสดงชื่อดิบ ไม่พัง
    }
  }

  function เปอร์เซ็นต์(x) {
    return typeof x === "number" ? Math.round(x * 100) + "%" : "—";
  }

  function วาดหัวข้อ() {
    หัวข้อแมตช์.textContent = หัวข้อของคู่;
    คำอธิบายแมตช์.textContent = ฝ่าย.A.name + " VS " + ฝ่าย.B.name + " · สู้ยกเดียวจนเลือดหมด";
  }

  function วาดฝ่าย() {
    var ผู้ชนะ = ผู้ชนะจริง();
    กล่องฝ่าย.innerHTML = ["A", "B"].map(function (ค, i) {
      var ข้อมูล = ฝ่าย[ค];
      var ชิป = (window.PET_STAT_KEYS || []).map(function (k) {
        var ป้าย = window.PET_STAT_LABELS_TH ? window.PET_STAT_LABELS_TH[k] : k;
        var ค่า = ข้อมูล.stats[k] != null ? ข้อมูล.stats[k] : "—";
        return '<span class="stat-chip">' + esc(ป้าย) + " " + esc(ค่า) + "</span>";
      }).join("");
      var html =
        '<div class="fighter' + (ผู้ชนะ === ค ? " is-winner" : "") + '">' +
          (ผู้ชนะ === ค ? '<p class="slot-result">🏆 ผู้ชนะ</p>' : "") +
          '<p class="fighter-name">' + esc(ข้อมูล.name) + "</p>" +
          '<p class="fighter-species">' + esc(ข้อมูล.speciesLabel) + (ข้อมูล.stageLabel ? " · " + esc(ข้อมูล.stageLabel) : "") + "</p>" +
          '<div class="stat-chips">' + ชิป + "</div>" +
          '<div class="hp-track"><div class="hp-fill" data-hp-fill="' + ค + '"></div></div>' +
          '<p class="hp-text" data-hp-text="' + ค + '"></p>' +
        "</div>";
      return (i === 1 ? '<p class="vs-big">VS</p>' : "") + html;
    }).join("");
  }

  // ผู้ชนะจริงของคู่นี้: ใช้ winnerSlot ที่บันทึกไว้ก่อน (รวมกรณีครูตัดสิน) แล้วค่อยใช้ผลจาก engine
  function ผู้ชนะจริง() {
    if (คู่ && คู่.winnerSlot === "slotA") return "A";
    if (คู่ && คู่.winnerSlot === "slotB") return "B";
    var w = แมตช์.result && แมตช์.result.winner;
    return w === "A" || w === "B" ? w : null;
  }

  function วาดผลสรุป() {
    var ผล = แมตช์.result || {};
    var ผู้ชนะ = ผู้ชนะจริง();
    var แถวผู้ชนะ = ผู้ชนะ ? "🏆 " + ฝ่าย[ผู้ชนะ].name : "ยังไม่มีผู้ชนะ — รอครูตัดสิน";
    var เหตุผล = คู่ && คู่.decidedByTeacher ? "ครูเป็นผู้ตัดสิน (เลือดเท่ากันเป๊ะหลังครบ 30 เทิร์น)" : (ชื่อเหตุผล[ผล.reason] || ผล.reason || "—");
    กล่องผลสรุป.innerHTML =
      แถวสรุป("ผู้ชนะ", แถวผู้ชนะ) +
      แถวสรุป("เหตุผล", เหตุผล) +
      แถวสรุป("จำนวนเทิร์น", ผล.turns != null ? String(ผล.turns) : "—");
  }

  function แถวสรุป(หัว, ค่า) {
    return '<div class="field-row"><span class="k">' + esc(หัว) + "</span><span>" + esc(ค่า) + "</span></div>";
  }

  // ── การเล่น ──────────────────────────────────────────────────

  function ไปตำแหน่ง(n) {
    ตำแหน่ง = Math.max(0, Math.min(n, เหตุการณ์.length));
    รีเฟรช();
  }

  function รีเฟรช() {
    วาดHP(สแนปช็อตHP[ตำแหน่ง]);
    วาดบันทึก();
    var ล่าสุด = ตำแหน่ง > 0 ? เหตุการณ์[ตำแหน่ง - 1] : null;
    ข้อความใต้ภาพ.textContent = ล่าสุด ? ข้อความเหตุการณ์(ล่าสุด) : "กดเล่นเพื่อเริ่มดูการต่อสู้";
    ตัวนับเหตุการณ์.textContent = "เหตุการณ์ที่ " + ตำแหน่ง + " / " + เหตุการณ์.length;

    var จบแล้ว = ตำแหน่ง >= เหตุการณ์.length;
    ปุ่มเล่น.disabled = เหตุการณ์.length === 0;
    ปุ่มเล่น.textContent = กำลังเล่น ? "⏸ หยุด" : (จบแล้ว && เหตุการณ์.length > 0 ? "▶ เล่นใหม่" : "▶ เล่น");
    ปุ่มก้าวถัดไป.disabled = จบแล้ว || กำลังเล่นจังหวะ;
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
      ข้อความ.textContent = "HP " + hp + " / " + pool;
    });
  }

  function วาดบันทึก() {
    if (ตำแหน่ง === 0) {
      กล่องบันทึก.innerHTML = '<li class="event-empty">ยังไม่มีเหตุการณ์ — กดเล่นเพื่อเริ่ม</li>';
      return;
    }
    กล่องบันทึก.innerHTML = เหตุการณ์.slice(0, ตำแหน่ง).map(function (ev, i) {
      return (
        '<li class="' + (i === ตำแหน่ง - 1 ? "is-current" : "") + '">' +
        '<span class="event-round">' + (ev.turn ? "เทิร์น " + esc(ev.turn) : "แมตช์") + "</span>" +
        esc(ข้อความเหตุการณ์(ev)) +
        "</li>"
      );
    }).join("");
    กล่องบันทึก.scrollTop = กล่องบันทึก.scrollHeight;
  }

  function จังหวะถัดไป() {
    for (var i = 0; i < จังหวะ.length; i++) {
      if (จังหวะ[i].เริ่ม >= ตำแหน่ง) return จังหวะ[i];
    }
    return null;
  }

  function รอ(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // เล่นแอนิเมชันของ 1 จังหวะ แล้วเลื่อนตำแหน่งไปท้ายจังหวะ
  async function เล่นจังหวะ(จ, รุ่น) {
    กำลังเล่นจังหวะ = true;
    รีเฟรช();
    var แรก = เหตุการณ์[จ.เริ่ม];
    // ลูกที่สอง: จังหวะเริ่มด้วย double_shot แล้วตามด้วย attack — ยิงเร็วต่อเนื่องไม่เล่นท่าร่ายซ้ำ
    var ลูกที่สอง = แรก.type === "double_shot";
    var ยิงครั้งนี้ = ลูกที่สอง ? เหตุการณ์[จ.เริ่ม + 1] : แรก;

    if (เวที && ยิงครั้งนี้ && ยิงครั้งนี้.type === "attack") {
      var ผู้ยิง = ฝั่งของ(ยิงครั้งนี้.payload.actor);
      var เป้า = ฝั่งของ(ยิงครั้งนี้.payload.target);
      var ผล = เหตุการณ์[จ.เริ่ม + (ลูกที่สอง ? 2 : 1)];
      var ชนิดผล = ผล && ผล.type === "attack_missed" ? "miss" : ผล && ผล.type === "attack_blocked" ? "block" : "hit";
      ข้อความใต้ภาพ.textContent = ข้อความเหตุการณ์(แรก);
      await เวที.ยิง(ผู้ยิง, ชนิดผล, { ลูกที่สอง: ลูกที่สอง });
      if (รุ่น !== รุ่นการเล่น) return;
      if (ชนิดผล === "miss") เวที.ข้อความลอย(เป้า, "หลบ!");
      else if (ชนิดผล === "block") เวที.ข้อความลอย(เป้า, "บล็อก!");
      else if (ผล) เวที.ข้อความลอย(เป้า, "-" + ผล.payload.amount);
      var อันสุดท้าย = เหตุการณ์[จ.จบ - 1];
      if (อันสุดท้าย.type === "ko") เวที.หมดแรง(เป้า);
      ไปตำแหน่ง(จ.จบ);
      await รอ(พักระหว่างจังหวะ);
    } else {
      ไปตำแหน่ง(จ.จบ);
      await รอ(เวที ? 350 : นานจังหวะไม่มีภาพ);
    }
    กำลังเล่นจังหวะ = false;
    รีเฟรช();
  }

  async function สลับเล่น() {
    if (กำลังเล่น) {
      หยุด();
      return;
    }
    if (เหตุการณ์.length === 0) return;
    if (ตำแหน่ง >= เหตุการณ์.length) กลับไปต้น();

    กำลังเล่น = true;
    var รุ่น = ++รุ่นการเล่น;
    รีเฟรช();
    while (กำลังเล่น && รุ่น === รุ่นการเล่น) {
      var จ = จังหวะถัดไป();
      if (!จ) break;
      await เล่นจังหวะ(จ, รุ่น);
    }
    if (รุ่น === รุ่นการเล่น) {
      กำลังเล่น = false;
      รีเฟรช();
    }
  }

  function หยุด() {
    กำลังเล่น = false;
    รุ่นการเล่น++;
    กำลังเล่นจังหวะ = false;
    รีเฟรช();
  }

  async function ก้าวทีละจังหวะ() {
    if (กำลังเล่นจังหวะ) return;
    กำลังเล่น = false;
    var รุ่น = ++รุ่นการเล่น;
    var จ = จังหวะถัดไป();
    if (จ) await เล่นจังหวะ(จ, รุ่น);
  }

  function กลับไปต้น() {
    หยุด();
    if (เวที) เวที.รีเซ็ต();
    ไปตำแหน่ง(0);
  }

  function แสดงไม่พบ(ข้อความ) {
    ข้อความไม่พบ.textContent = ข้อความ;
    กล่องไม่พบ.classList.remove("hidden");
  }

  ปุ่มเล่น.addEventListener("click", สลับเล่น);
  ปุ่มก้าวถัดไป.addEventListener("click", ก้าวทีละจังหวะ);
  ปุ่มกลับไปต้น.addEventListener("click", กลับไปต้น);
})();
