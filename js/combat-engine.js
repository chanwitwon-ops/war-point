// ─────────────────────────────────────────────────────────────
// js/combat-engine.js — เครื่องคำนวณผลการต่อสู้ (pure, deterministic)
// ตามสูตรที่ล็อกไว้ที่ docs/01-requirements/01-spec/20260821-02-pet-points-and-weekly-arena.md
// หัวข้อ ง.๒ (พอร์ตจาก project_warpoint 2026-11-03)
//
// ไฟล์นี้ไม่แตะ Firestore/DOM เลย — รับสเตตัสทั้งสองฝ่ายแล้วคืน battle log วัตถุเดียว
// ชั้น UI (ui-screens) มีหน้าที่แค่อ่าน events แล้ววาดภาพ/เล่นคลิป ห้ามคำนวณผลเอง
//
// ── สัญญา (contract) ของ window.คำนวณผลการต่อสู้ ──
// เรียกด้วย object เดียว:
//   {
//     matchId: string,              // ใช้ทำ seed — แมตช์เดียวกันต้องได้ผลเดิมเสมอ
//     mode: "league" | "knockout" | "practice",
//     sideA: ฝ่ายต่อสู้, sideB: ฝ่ายต่อสู้
//   }
// ฝ่ายต่อสู้ (side) = {
//   studentId: string, petName: string, species: string,
//   stats: { SPD, ATK, ACC, DEF, HP },     // จำนวนเต็ม 1-100 แต่ละค่า
//   statusAbility: "burn"|"bleed"|"poison"|"paralyze"|"blind"|"fear"|"charm" | null,
//   item: null | {
//     type: "cleanse" | "secondWind" | "statusBonus" | "excellenceCharm",
//     statusBonusTarget: string (เฉพาะ statusBonus),  statusBonusPct: number (1-5),
//     excellenceStat: "SPD"|"ATK"|"ACC"|"DEF"|"HP" (เฉพาะ excellenceCharm), excellencePct: number (8-10)
//   }
// }
// คืนค่า (ไม่ใช่ Promise — คำนวณจบในฟังก์ชันเดียว ไม่มี I/O):
//   { match_id, engine_version, seed, computed_at, mode, sideA, sideB, result, events }
// ตรงตามโครงสร้าง battle log ในสเปก — ดูรายละเอียด event 18 ชนิดที่ตารางในเอกสาร ง.๒
// ─────────────────────────────────────────────────────────────

(function () {
  var ENGINE_VERSION = "1.0.0";

  var HP_MULTIPLIER = 8;
  var TURN_CAP_PER_ROUND = 20;
  var ROUNDS_TO_WIN = 2;
  var MAX_ROUNDS = 3;
  var MAX_CONCURRENT_STATUSES = 2;

  // ตารางสถานะผิดปกติทั้ง 7 แบบ — ตัวเลขตรงตามสเปก ง.๒ ข้อ 9 (ห้ามกระจายตัวเลขไปที่อื่น)
  var STATUS_TABLE = {
    burn:     { group: "dot",    baseChance: 25, pctPerTick: 0.06, duration: 2 },
    bleed:    { group: "dot",    baseChance: 30, pctPerTick: 0.05, duration: 3 },
    poison:   { group: "dot",    baseChance: 30, pctPerTick: 0.04, duration: 4 },
    paralyze: { group: "debuff", baseChance: 20, duration: 2, mods: { SPD: -0.30, ACC: -0.15 } },
    blind:    { group: "debuff", baseChance: 15, duration: 2, mods: { ACC: -0.40 } },
    fear:     { group: "debuff", baseChance: 20, duration: 2, mods: { ACC: -0.20, ATK: -0.20 } },
    charm:    { group: "block",  baseChance: 10, duration: 1 }
  };

  // ── PRNG กำหนดผลได้เอง (ห้ามใช้ Math.random() ตามสเปก ง.๒ ข้อ 13) ──
  // xmur3 แฮช string เป็น seed ตัวเลข แล้วใช้ mulberry32 เป็นตัวสุ่ม — มาตรฐานทั่วไป
  // ไม่ใช่ crypto-grade แต่ deterministic reproducible ซึ่งเป็นสิ่งที่สเปกต้องการ
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

  function สร้างตัวสุ่มจาก(matchId) {
    var seedFn = xmur3(String(matchId));
    var seed = seedFn();
    var rng = mulberry32(seed);
    return { seed: seed, roll: function () { return Math.floor(rng() * 100) + 1; } }; // 1-100
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ── snapshot เครื่องรางความเป็นเลิศ (+8-10% สเตตัส 1 ค่า) ก่อนเริ่มแมตช์ ──
  function ใช้เครื่องรางถ้ามี(stats, item) {
    var ผล = { SPD: stats.SPD, ATK: stats.ATK, ACC: stats.ACC, DEF: stats.DEF, HP: stats.HP };
    if (item && item.type === "excellenceCharm" && ผล[item.excellenceStat] != null) {
      ผล[item.excellenceStat] = Math.round(ผล[item.excellenceStat] * (1 + item.excellencePct / 100));
    }
    return ผล;
  }

  function สร้างฝ่าย(side) {
    var statsAfterCharm = ใช้เครื่องรางถ้ามี(side.stats, side.item);
    return {
      studentId: side.studentId,
      petName: side.petName,
      species: side.species,
      baseStats: statsAfterCharm,
      statusAbility: side.statusAbility || null,
      item: side.item || null,
      itemUsed: false,       // หัวใจไม่ย่อท้อ / ยาล้างพิษ — ใช้ได้ 1 ครั้งต่อแมตช์ ไม่รีเซ็ตรายยก
      hpMax: statsAfterCharm.HP * HP_MULTIPLIER,
      hp: statsAfterCharm.HP * HP_MULTIPLIER,
      statuses: []           // { status, remaining }
    };
  }

  function สเตตัสใช้งานจริง(fighter, stat) {
    var ค่า = fighter.baseStats[stat];
    for (var i = 0; i < fighter.statuses.length; i++) {
      var mods = STATUS_TABLE[fighter.statuses[i].status].mods;
      if (mods && mods[stat] != null) ค่า += fighter.baseStats[stat] * mods[stat];
    }
    return Math.max(0, ค่า);
  }

  function ติดหลงไหลอยู่ไหม(fighter) {
    return fighter.statuses.some(function (s) { return s.status === "charm"; });
  }

  function เพิ่มสถานะ(fighter, statusName, events, round, turn, chance, roll, seq) {
    var def = STATUS_TABLE[statusName];
    var existing = fighter.statuses.filter(function (s) { return s.status === statusName; })[0];
    if (existing) {
      existing.remaining = def.duration;
      events.push({ seq: seq, round: round, turn: turn, type: "status_refreshed", payload: { target: fighter.studentId, status: statusName, duration: def.duration } });
      return;
    }
    if (fighter.statuses.length >= MAX_CONCURRENT_STATUSES) {
      fighter.statuses.sort(function (a, b) { return a.remaining - b.remaining; });
      var removed = fighter.statuses.shift().status;
      events.push({ seq: seq, round: round, turn: turn, type: "status_replaced", payload: { target: fighter.studentId, removed: removed, added: statusName } });
    } else {
      events.push({ seq: seq, round: round, turn: turn, type: "status_applied", payload: { target: fighter.studentId, status: statusName, chance: chance, roll: roll, duration: def.duration } });
    }
    fighter.statuses.push({ status: statusName, remaining: def.duration });
  }

  // ── ลำดับการคำนวณ 1 การโจมตี (8 ขั้นตามสเปก ง.๒ ข้อ 11 — ห้ามสลับลำดับ) ──
  function โจมตีหนึ่งครั้ง(ctx, actor, defender, events, round, turn, reason) {
    var seqRef = ctx.seqRef;

    if (ติดหลงไหลอยู่ไหม(actor)) {
      events.push({ seq: seqRef.n++, round: round, turn: turn, type: "status_blocked_turn", payload: { target: actor.studentId, status: "charm" } });
      return { ko: false };
    }

    var ACC = สเตตัสใช้งานจริง(actor, "ACC");
    var SPDdef = สเตตัสใช้งานจริง(defender, "SPD");
    var DEF = สเตตัสใช้งานจริง(defender, "DEF");
    var ATK = สเตตัสใช้งานจริง(actor, "ATK");

    if (reason === "speed_double") {
      events.push({ seq: seqRef.n++, round: round, turn: turn, type: "extra_attack", payload: { actor: actor.studentId, reason: "speed_double" } });
    }
    events.push({ seq: seqRef.n++, round: round, turn: turn, type: "action_declared", payload: { actor: actor.studentId, action: "melee", target: defender.studentId } });

    var hitChance = clamp(75 + 0.5 * (ACC - SPDdef), 40, 95);
    var hitRoll = ctx.rng.roll();
    if (hitRoll > hitChance) {
      events.push({ seq: seqRef.n++, round: round, turn: turn, type: "attack_missed", payload: { actor: actor.studentId, target: defender.studentId, hitChance: hitChance, roll: hitRoll } });
      return { ko: false };
    }

    var blockChance = Math.min(25, DEF * 0.2);
    var blockRoll = ctx.rng.roll();
    if (blockRoll <= blockChance) {
      events.push({ seq: seqRef.n++, round: round, turn: turn, type: "attack_blocked", payload: { actor: actor.studentId, target: defender.studentId, blockChance: blockChance, roll: blockRoll } });
      return { ko: false };
    }

    var damageBase = (ATK * 150) / (100 + DEF);
    var variance = 0.90 + ctx.rng.roll() / 100 * 0.20; // 1-100 -> 0.90-1.10 โดยประมาณ
    var damage = Math.max(1, Math.round(damageBase * variance));
    var hpBefore = defender.hp;
    defender.hp = Math.max(0, defender.hp - damage);
    events.push({ seq: seqRef.n++, round: round, turn: turn, type: "damage_dealt", payload: { actor: actor.studentId, target: defender.studentId, amount: damage, hpBefore: hpBefore, hpAfter: defender.hp } });

    var isEnergy = false;
    if (defender.statusAbility) {
      var statusDef = STATUS_TABLE[defender.statusAbility];
      var itemBonus = 0;
      if (actor.item && actor.item.type === "statusBonus" && actor.item.statusBonusTarget === defender.statusAbility) {
        itemBonus = actor.item.statusBonusPct;
      }
      var statusResist = สเตตัสใช้งานจริง(defender, "HP") * 0.2;
      var applyChance = clamp(statusDef.baseChance + itemBonus - statusResist, 5, 90);
      var applyRoll = ctx.rng.roll();
      if (applyRoll <= applyChance) {
        isEnergy = true;
        if (defender.item && defender.item.type === "cleanse" && !defender.itemUsed) {
          defender.itemUsed = true;
          events.push({ seq: seqRef.n++, round: round, turn: turn, type: "item_triggered", payload: { owner: defender.studentId, item: "cleanse", effect: "status_cleared_on_first_hit" } });
        } else {
          เพิ่มสถานะ(defender, defender.statusAbility, events, round, turn, applyChance, applyRoll, seqRef.n++);
        }
      }
    }
    // บันทึกว่าการโจมตีครั้งนี้เป็น melee หรือ energy ไว้ใน action_declared ไม่ต้องย้อนแก้ — ชั้นแอนิเมชันอ่านจาก status_applied ที่ตามมาแทนได้
    void isEnergy;

    if (defender.hp <= 0) {
      if (defender.item && defender.item.type === "secondWind" && !defender.itemUsed) {
        defender.itemUsed = true;
        defender.hp = 1;
        events.push({ seq: seqRef.n++, round: round, turn: turn, type: "item_triggered", payload: { owner: defender.studentId, item: "secondWind", effect: "survive_at_1hp" } });
        return { ko: false };
      }
      events.push({ seq: seqRef.n++, round: round, turn: turn, type: "ko", payload: { target: defender.studentId, round: round } });
      return { ko: true };
    }
    return { ko: false };
  }

  function จบเทิร์นของ(fighter, events, round, turn, ctx) {
    var ตาย = false;
    for (var i = fighter.statuses.length - 1; i >= 0; i--) {
      var s = fighter.statuses[i];
      var def = STATUS_TABLE[s.status];
      if (def.group === "dot") {
        var amount = Math.max(1, Math.round(fighter.hpMax * def.pctPerTick));
        var hpBefore = fighter.hp;
        fighter.hp = Math.max(0, fighter.hp - amount);
        events.push({ seq: ctx.seqRef.n++, round: round, turn: turn, type: "status_tick", payload: { target: fighter.studentId, status: s.status, amount: amount, hpBefore: hpBefore, hpAfter: fighter.hp } });
        if (fighter.hp <= 0) ตาย = true;
      }
      s.remaining -= 1;
      if (s.remaining <= 0) {
        events.push({ seq: ctx.seqRef.n++, round: round, turn: turn, type: "status_expired", payload: { target: fighter.studentId, status: s.status } });
        fighter.statuses.splice(i, 1);
      }
    }
    if (ตาย) {
      events.push({ seq: ctx.seqRef.n++, round: round, turn: turn, type: "ko", payload: { target: fighter.studentId, round: round } });
    }
    return ตาย;
  }

  function เล่นหนึ่งยก(ctx, A, B, events, round) {
    A.hp = A.hpMax; A.statuses = [];
    B.hp = B.hpMax; B.statuses = [];
    events.push({ seq: ctx.seqRef.n++, round: round, turn: 0, type: "round_start", payload: { round: round, hp: { A: A.hp, B: B.hp } } });

    for (var turn = 1; turn <= TURN_CAP_PER_ROUND; turn++) {
      var spdA = สเตตัสใช้งานจริง(A, "SPD");
      var spdB = สเตตัสใช้งานจริง(B, "SPD");
      var first, second;
      if (spdA === spdB) {
        first = ctx.rng.roll() <= 50 ? A : B;
      } else {
        first = spdA > spdB ? A : B;
      }
      second = first === A ? B : A;
      events.push({ seq: ctx.seqRef.n++, round: round, turn: turn, type: "turn_start", payload: { order: [first.studentId, second.studentId] } });

      var r1 = โจมตีหนึ่งครั้ง(ctx, first, second, events, round, turn, null);
      if (r1.ko) return จบยก(first, second, "ko");

      var r2 = โจมตีหนึ่งครั้ง(ctx, second, first, events, round, turn, null);
      if (r2.ko) return จบยก(second, first, "ko");

      var fastSpd = สเตตัสใช้งานจริง(first, "SPD");
      var slowSpd = สเตตัสใช้งานจริง(second, "SPD");
      if (slowSpd > 0 && fastSpd >= slowSpd * 2) {
        var r3 = โจมตีหนึ่งครั้ง(ctx, first, second, events, round, turn, "speed_double");
        if (r3.ko) return จบยก(first, second, "ko");
      }

      var aDied = จบเทิร์นของ(A, events, round, turn, ctx);
      var bDied = จบเทิร์นของ(B, events, round, turn, ctx);
      if (aDied && bDied) return จบยก(null, null, "ko"); // ตายพร้อมกันจาก DOT — ให้เป็นยกเสมอ
      if (aDied) return จบยก(B, A, "ko");
      if (bDied) return จบยก(A, B, "ko");
    }

    // ครบเพดานเทิร์น — ตัดสินด้วย %HP ที่เหลือ
    var pctA = A.hp / A.hpMax;
    var pctB = B.hp / B.hpMax;
    if (pctA === pctB) return จบยก(null, null, "turn_limit");
    return pctA > pctB ? จบยก(A, B, "turn_limit") : จบยก(B, A, "turn_limit");

    function จบยก(winner, loser, reason) {
      events.push({
        seq: ctx.seqRef.n++, round: round, turn: null, type: "round_end",
        payload: { round: round, winner: winner ? winner.studentId : null, draw: !winner, reason: reason, hp: { A: A.hp, B: B.hp } }
      });
      return { winner: winner ? (winner === A ? "A" : "B") : null, hpPctA: A.hp / A.hpMax, hpPctB: B.hp / B.hpMax };
    }
  }

  window.คำนวณผลการต่อสู้ = function (input) {
    var rng = สร้างตัวสุ่มจาก(input.matchId);
    var ctx = { rng: rng, seqRef: { n: 0 } };
    var A = สร้างฝ่าย(input.sideA);
    var B = สร้างฝ่าย(input.sideB);

    var events = [];
    events.push({ seq: ctx.seqRef.n++, round: null, turn: null, type: "match_start", payload: {} });

    var roundsWonA = 0, roundsWonB = 0;
    var hpPctSumA = 0, hpPctSumB = 0;
    var roundsPlayed = 0;

    for (var round = 1; round <= MAX_ROUNDS; round++) {
      var r = เล่นหนึ่งยก(ctx, A, B, events, round);
      roundsPlayed++;
      hpPctSumA += r.hpPctA; hpPctSumB += r.hpPctB;
      if (r.winner === "A") roundsWonA++;
      else if (r.winner === "B") roundsWonB++;

      if (roundsWonA >= ROUNDS_TO_WIN || roundsWonB >= ROUNDS_TO_WIN) break;
    }

    var winnerKey = null, reason = "rounds";
    if (roundsWonA !== roundsWonB) {
      winnerKey = roundsWonA > roundsWonB ? "A" : "B";
    } else if (hpPctSumA !== hpPctSumB) {
      winnerKey = hpPctSumA > hpPctSumB ? "A" : "B";
      reason = "hp_sum_tiebreak";
    } else if (A.baseStats.SPD !== B.baseStats.SPD) {
      winnerKey = A.baseStats.SPD > B.baseStats.SPD ? "A" : "B";
      reason = "spd_tiebreak";
    } else {
      reason = input.mode === "knockout" ? "teacher_decides" : "draw";
    }

    events.push({
      seq: ctx.seqRef.n++, round: null, turn: null, type: "match_end",
      payload: { winner: winnerKey, score: { A: roundsWonA, B: roundsWonB }, reason: reason }
    });

    return {
      match_id: input.matchId,
      engine_version: ENGINE_VERSION,
      seed: rng.seed,
      computed_at: new Date().toISOString(),
      mode: input.mode,
      sideA: { studentId: A.studentId, petName: A.petName, species: A.species, stats: A.baseStats, statusAbility: A.statusAbility, item: A.item, hpPool: A.hpMax },
      sideB: { studentId: B.studentId, petName: B.petName, species: B.species, stats: B.baseStats, statusAbility: B.statusAbility, item: B.item, hpPool: B.hpMax },
      result: { winner: winnerKey, score: { A: roundsWonA, B: roundsWonB }, reason: reason },
      events: events
    };
  };
})();
