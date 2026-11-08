// ─────────────────────────────────────────────────────────────
// js/combat-engine.js — เครื่องคำนวณผลการต่อสู้ (pure, deterministic)
// ตามกลไก ง.๑ ของ docs/01-requirements/01-spec/20260821-02-pet-points-and-weekly-arena.md
// (ยิงระยะไกล ผลัดกันยิงทีละฝ่ายจน HP หมด, โดน/พลาดจากความแม่นยำปะทะค่าหลบหลีก,
// Perfect Block จากค่าพลังป้องกัน) และตัวเลขที่ user เลือกเองเมื่อ 2026-11-08
//
// [v2.0.0 — 2026-11-08] เขียนใหม่แทน v1 ที่ใช้สูตร/ตาราง 7 สถานะ/Best of 3 ซึ่งพอร์ตมาจาก
// project_warpoint (ขัดกติกาของโปรเจกต์ที่ห้ามหยิบสเปกจากที่นั่น) — ไม่มีพลังพิเศษ/สถานะ
// ผิดปกติในรอบนี้ และไม่มีจำนวนยกคงที่ (ง.๑: "ไม่ใช่จำนวนยกคงที่")
//
// สูตร:
//   ลำดับ   : ใครความเร็ว (SPD) มากกว่ายิงก่อนทุกเทิร์น เท่ากันทอยเหรียญจาก seed ทุกเทิร์น
//   โดน%    : clamp(80 + (ACC ผู้ยิง − EVA ผู้ถูกยิง), 50, 95)
//   บล็อก%  : min(15, DEF ผู้ถูกยิง ÷ 5) — ตรวจหลังยิงโดนเท่านั้น บล็อกแล้วดาเมจ 0
//   ดาเมจ   : round(ATK × 100 ÷ (100 + DEF) × สุ่ม 0.90–1.10) ขั้นต่ำ 1
//   เลือด   : HP × 6
//   เพดาน   : 30 เทิร์น — ครบแล้วใครเหลือ %เลือดมากกว่าชนะ เท่ากันเป๊ะ = winner null ให้ครูเลือก
//   ยิงสองลูก [v2.1.0]: หลังลูกแรกของแต่ละฝ่าย ทอยโอกาสยิงลูกที่สอง (แรงเท่าลูกแรก ทอยโดน/บล็อกแยก)
//             โอกาส% = clamp(30 + (SPD ÷ จำนวนขั้น − 12) × 8, 5, 95) [v2.2.0 จาก × 12]
//
// ── สัญญา (contract) ของ window.คำนวณผลการต่อสู้ ──
// input  = { matchId: string, sideA: ฝ่าย, sideB: ฝ่าย }
// ฝ่าย    = { studentId: string, petName: string, species: string,
//            stats: { SPD, ATK, ACC, EVA, DEF, HP } }
// output = { match_id, engine_version, seed, computed_at, sideA, sideB, result, events }
//   sideA/sideB = ฝ่ายเดิม + hpPool
//   result      = { winner: "A" | "B" | null, reason: "ko" | "turn_limit" | "teacher_decides", turns }
//   events[]    = { seq, turn, type, payload } โดย type เป็นหนึ่งใน:
//     match_start   {}
//     turn_start    { order: [studentId ผู้ยิงก่อน, studentId ผู้ยิงทีหลัง] }
//     attack        { actor, target }                         ← ประกาศว่ากำลังยิง (เล่นท่าเงยยิงฟ้า)
//     attack_missed { actor, target, hitChance, roll }        ← ฝ่ายรับหลบ
//     attack_blocked{ actor, target, blockChance, roll }      ← ฝ่ายรับบล็อก ดาเมจ 0
//     double_shot   { actor, chance, roll }                   ← [v2.1.0] ได้ยิงลูกที่สอง ตามด้วย attack อีกชุด
//     damage_dealt  { actor, target, amount, hpBefore, hpAfter }
//     ko            { target }
//     turn_limit    { hpPct: { A, B } }                       ← ครบ 30 เทิร์น
//     match_end     { winner: "A" | "B" | null, reason }
// ทุก event ที่ HP เปลี่ยนมี hpBefore/hpAfter เสมอ ชั้นแสดงผลห้ามคำนวณ HP เอง
// ─────────────────────────────────────────────────────────────

(function () {
  var ENGINE_VERSION = "2.2.0";
  var HP_MULTIPLIER = 6;
  var TURN_CAP = 30;
  // กลไกยิงสองลูก — user เลือก "ฐาน 30 / ต่อแต้ม 12" เมื่อ 2026-11-08 แล้วปรับเป็น "ต่อแต้ม 8"
  // เมื่อ 2026-11-09 พร้อมกติกาค่าสเตตัสมีราคา (ATK/HP แพงขึ้น ความเร็วจึงคุ้มเกิน: ชนะ 61% → 56%)
  // ร่างสุดท้าย SPD 45 / 60 / 75 → โอกาส 6% / 30% / 54%
  var DOUBLE_SHOT = { base: 30, perPoint: 8, min: 5, max: 95 };

  // xmur3 แฮช string เป็น seed + mulberry32 เป็นตัวสุ่ม — อัลกอริทึมสาธารณะมาตรฐาน
  // deterministic (seed เดิม = ผลเดิม) ห้ามใช้ Math.random() เพราะรีเพลย์ต้องได้ผลเดิมเสมอ
  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  function mulberry32(seed) {
    var a = seed;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function สร้างฝ่าย(side) {
    var hpPool = side.stats.HP * HP_MULTIPLIER;
    return {
      studentId: side.studentId,
      petName: side.petName,
      species: side.species,
      stats: side.stats,
      hpPool: hpPool,
      hp: hpPool
    };
  }

  window.คำนวณผลการต่อสู้ = function (input) {
    var seed = xmur3(String(input.matchId))();
    var rng = mulberry32(seed);
    function ทอย() { return Math.floor(rng() * 100) + 1; } // 1-100

    var A = สร้างฝ่าย(input.sideA);
    var B = สร้างฝ่าย(input.sideB);
    var events = [];
    var seq = 0;
    function บันทึก(turn, type, payload) {
      events.push({ seq: seq++, turn: turn, type: type, payload: payload || {} });
    }

    // [v2.1.0 — 2026-11-08 user เลือก] ยิงสองลูก: หลังยิงลูกแรกในเทิร์นของตัวเอง ทุกฝ่ายทอยโอกาส
    // ยิงลูกที่สอง ยิ่งความเร็วของตัวเองมาก ยิ่งมีโอกาสมาก ลูกที่สองแรงเท่าลูกแรก ทอยโดน/บล็อกแยกกัน
    // โอกาส% = clamp(ฐาน + (ความเร็วต่อขั้น − 12) × ต่อแต้ม, ต่ำสุด, สูงสุด)
    //   ความเร็วต่อขั้น = SPD ÷ จำนวนขั้น (จำนวนขั้น = งบที่ใช้ ÷ 67.5 ตามกติกา ซ.14) — 12 = ค่าฐาน Pixie
    //   จึงใช้ได้ทุกขั้น ไม่ใช่แค่ร่างสุดท้าย · ต่ำสุด > 0 = ทุกฝ่ายมีโอกาสยิงสองลูกเสมอ
    // ตัวเลขจริงอยู่ที่ DOUBLE_SHOT ด้านบน · หน้าจูน experiments/balance-sim/tune.html ทดลองค่าอื่นได้โดยตั้ง
    // window.__DOUBLE_SHOT_PARAMS = { base, perPoint, min, max } (ตั้งเป็น { base: null } = ปิดกลไก)
    function พารามิเตอร์ยิงสองลูก() {
      return window.__DOUBLE_SHOT_PARAMS || DOUBLE_SHOT;
    }

    // [v2.2.0] จำนวนขั้นคิดจาก "งบ" แทนผลรวม (กติกา ซ.14 ใหม่: ATK/HP แต้มละ 2.25 ค่าอื่น 1 งบ 67.5 ต่อขั้น)
    // ผลรวมตัวเลขของแต่ละตัวไม่เท่ากันแล้ว จึงหารด้วย 50 ไม่ได้ — ค่าฐาน Pixie เดิมได้จำนวนขั้นเท่าเดิมพอดี
    function จำนวนขั้นของ(ฝ่าย) {
      var s = ฝ่าย.stats;
      var งบ = s.SPD + s.ACC + s.EVA + s.DEF + 2.25 * (s.ATK + s.HP);
      return Math.max(1, Math.round(งบ / 67.5));
    }

    // ยิงตามสิทธิ์ของเทิร์นนั้น (1 หรือ 2 ลูก) — คืน true ถ้าฝ่ายรับหมดแรง
    function ยิงประจำเทิร์น(turn, ผู้ยิง, ผู้รับ) {
      if (ยิง(turn, ผู้ยิง, ผู้รับ)) return true;
      var p = พารามิเตอร์ยิงสองลูก();
      if (!p || p.base == null) return false;
      var ต่อขั้น = ผู้ยิง.stats.SPD / จำนวนขั้นของ(ผู้ยิง);
      var chance = clamp(Math.round(p.base + (ต่อขั้น - 12) * p.perPoint), p.min, p.max);
      var roll = ทอย();
      if (roll > chance) return false;
      บันทึก(turn, "double_shot", { actor: ผู้ยิง.studentId, chance: chance, roll: roll });
      return ยิง(turn, ผู้ยิง, ผู้รับ);
    }

    // คืน true ถ้าการยิงครั้งนี้ทำให้ฝ่ายรับหมดแรง
    function ยิง(turn, ผู้ยิง, ผู้รับ) {
      บันทึก(turn, "attack", { actor: ผู้ยิง.studentId, target: ผู้รับ.studentId });

      var hitChance = clamp(80 + (ผู้ยิง.stats.ACC - ผู้รับ.stats.EVA), 50, 95);
      var hitRoll = ทอย();
      if (hitRoll > hitChance) {
        บันทึก(turn, "attack_missed", { actor: ผู้ยิง.studentId, target: ผู้รับ.studentId, hitChance: hitChance, roll: hitRoll });
        return false;
      }

      var blockChance = Math.min(15, ผู้รับ.stats.DEF / 5);
      var blockRoll = ทอย();
      if (blockRoll <= blockChance) {
        บันทึก(turn, "attack_blocked", { actor: ผู้ยิง.studentId, target: ผู้รับ.studentId, blockChance: blockChance, roll: blockRoll });
        return false;
      }

      var ความแปรปรวน = 0.90 + (ทอย() - 1) / 99 * 0.20; // 1-100 → 0.90-1.10
      // ตัวจำลองความสมดุลทดลองปรับสูตรดาเมจได้ผ่าน window.__DAMAGE_PARAMS = { mult, exp }
      // (ไม่ตั้ง = สูตร ง.๓ เดิมทุกประการ: mult 1, exp 1) — exp < 1 ทำให้พละกำลังสูงๆ ได้ดาเมจโตช้าลง
      // โดยพละกำลัง 35 (Pixie ร่างสุดท้าย) ได้ค่าเท่าเดิมเสมอ
      var พลัง = ผู้ยิง.stats.ATK;
      var dp = window.__DAMAGE_PARAMS;
      if (dp) พลัง = 35 * Math.pow(Math.max(1, พลัง) / 35, dp.exp == null ? 1 : dp.exp) * (dp.mult == null ? 1 : dp.mult);
      var ดาเมจ = Math.max(1, Math.round(พลัง * 100 / (100 + ผู้รับ.stats.DEF) * ความแปรปรวน));
      var hpBefore = ผู้รับ.hp;
      ผู้รับ.hp = Math.max(0, ผู้รับ.hp - ดาเมจ);
      บันทึก(turn, "damage_dealt", {
        actor: ผู้ยิง.studentId, target: ผู้รับ.studentId, amount: ดาเมจ, hpBefore: hpBefore, hpAfter: ผู้รับ.hp
      });

      if (ผู้รับ.hp <= 0) {
        บันทึก(turn, "ko", { target: ผู้รับ.studentId });
        return true;
      }
      return false;
    }

    บันทึก(0, "match_start", {});

    var ผลลัพธ์ = null;
    for (var turn = 1; turn <= TURN_CAP && !ผลลัพธ์; turn++) {
      var ก่อน, หลัง;
      if (A.stats.SPD === B.stats.SPD) {
        ก่อน = ทอย() <= 50 ? A : B;
      } else {
        ก่อน = A.stats.SPD > B.stats.SPD ? A : B;
      }
      หลัง = ก่อน === A ? B : A;
      บันทึก(turn, "turn_start", { order: [ก่อน.studentId, หลัง.studentId] });

      if (ยิงประจำเทิร์น(turn, ก่อน, หลัง)) {
        ผลลัพธ์ = { winner: ก่อน === A ? "A" : "B", reason: "ko", turns: turn };
      } else if (ยิงประจำเทิร์น(turn, หลัง, ก่อน)) {
        ผลลัพธ์ = { winner: หลัง === A ? "A" : "B", reason: "ko", turns: turn };
      }
    }

    if (!ผลลัพธ์) {
      var pctA = A.hp / A.hpPool;
      var pctB = B.hp / B.hpPool;
      บันทึก(TURN_CAP, "turn_limit", { hpPct: { A: pctA, B: pctB } });
      if (pctA === pctB) {
        ผลลัพธ์ = { winner: null, reason: "teacher_decides", turns: TURN_CAP };
      } else {
        ผลลัพธ์ = { winner: pctA > pctB ? "A" : "B", reason: "turn_limit", turns: TURN_CAP };
      }
    }

    บันทึก(ผลลัพธ์.turns, "match_end", { winner: ผลลัพธ์.winner, reason: ผลลัพธ์.reason });

    function สรุปฝ่าย(f) {
      return { studentId: f.studentId, petName: f.petName, species: f.species, stats: f.stats, hpPool: f.hpPool };
    }

    return {
      match_id: input.matchId,
      engine_version: ENGINE_VERSION,
      seed: seed,
      computed_at: new Date().toISOString(),
      sideA: สรุปฝ่าย(A),
      sideB: สรุปฝ่าย(B),
      result: ผลลัพธ์,
      events: events
    };
  };
})();
