// ─────────────────────────────────────────────────────────────
// js/tournament-data.js — ชั้นข้อมูล (Firestore) ของโหมดทัวนาเมนต์แพ้คัดออก
// ตาม docs/01-requirements/01-spec/20261103-08-tournament-bracket-demo.md
//
// [แก้ 2026-11-09 — ผู้ใช้ตัดสิน] เลิกตายตัว 4 คน: ครูเลือกนักเรียนกี่คนก็ได้ (ตั้งแต่ 2 คน)
// ระบบสุ่มจับคู่ + สุ่มคนที่ได้บาย (seed = รหัสทัวนาเมนต์ บันทึกผลจับคู่ไว้ในเอกสาร)
// และครูลบทัวนาเมนต์ได้ (เช่นจำลองการต่อสู้ทุกวันก่อนเรียน)
//
// ไฟล์นี้ไม่คำนวณผลการต่อสู้เอง — เรียก window.คำนวณผลการต่อสู้ (js/combat-engine.js)
// เท่านั้นเสมอ ไม่มี HTML/DOM ในไฟล์นี้
//
// โครงสร้างเอกสาร:
//   tournaments/{tournamentId} = {
//     format: 2, createdByTeacherId, createdByTeacherName, createdAt, createdAtMs,
//     participantCount, roundCount, finalKey,
//     matches: {
//       "r1m1": { round: 1, index: 1, slotA, slotB, matchId, winnerSlot, bye },
//       ...                       // รอบ r มี 2^(roundCount-r) คู่ · finalKey = "r{roundCount}m1"
//     }
//   }
//   slot = { studentUid, studentName, speciesKey, stage, stats:{SPD,ATK,ACC,EVA,DEF,HP} } หรือ null (รอผู้เข้ารอบ)
//   bye: true = คู่ในรอบแรกที่มีคนเดียว (ได้บาย) — winnerSlot ตั้งเป็น "slotA" และเลื่อนเข้ารอบถัดไปตั้งแต่ตอนสร้าง
//   ผู้ชนะคู่ r{R}m{M} เลื่อนไปที่ r{R+1}m{ceil(M/2)} ฝั่ง slotA ถ้า M คี่ / slotB ถ้า M คู่
//   decidedByTeacher: true จะมีในคู่ที่ครูเลือกผู้ชนะเอง (window.ครูเลือกผู้ชนะ)
//
//   tournaments/{tournamentId}/matches/{matchId} = battle log เต็มก้อนจาก window.คำนวณผลการต่อสู้ + round
//   matchId = tournamentId + "-" + matchKey (deterministic — seed ของ engine มาจาก matchId)
//
// [แก้ 2026-11-17 — spec 08 ฌ. ครูประกาศผลทีละรอบ] ตาม docs/02-design/02-technical/detailed-design/
//   tournament-fight-match.md (DD-10), tournament-announce-round.md (DD-11), tournament-view-and-replay.md (DD-12)
//   - เอกสารใหม่มี announcedRound (เริ่ม 0) และทุกคู่มี fought (เริ่ม false)
//   - ต่อสู้ = เขียน battle log (+round) + ผลลับ results/{matchKey} + fought/matchId ใน transaction เดียว
//     **ไม่เขียน winnerSlot และไม่เลื่อนผู้ชนะ** (ผลยังเป็นความลับ)
//   - tournaments/{id}/results/{matchKey} = { matchId, winnerSlot ("slotA"|"slotB"|null=เสมอ), decidedByTeacher, foughtAt }
//     ครูอ่าน/เขียนได้คนเดียว (firestore.rules) — ผู้ชนะของคู่ที่ยังไม่ประกาศอยู่ที่นี่และใน battle log เท่านั้น
//   - ประกาศรอบ N = คัดลอกผู้ชนะทุกคู่ของรอบ N ลงเอกสารสาธารณะ + เลื่อนเข้ารอบ N+1 + announcedRound = N (transaction เดียว)
//   - คู่บาย: winnerSlot = "slotA" และเติมช่องรอบถัดไปตั้งแต่ตอนสร้างเหมือนเดิม (ฌ. ข้อ 11)
//   - เอกสารเก่าที่ไม่มี announcedRound = ประกาศครบทุกรอบแล้ว ดูผลได้อย่างเดียว (ฌ. ข้อ 9)
//
// เอกสารโครงเก่า (semifinal1/semifinal2/final) ยังอ่านแชมป์ได้ผ่าน แชมป์ของทัวนาเมนต์() ใน js/util.js
// ─────────────────────────────────────────────────────────────

(function () {
  var STAT_KEYS = ["SPD", "ATK", "ACC", "EVA", "DEF", "HP"];
  var รูปแบบรหัสคู่ = /^r(\d+)m(\d+)$/;

  // ── สุ่มแบบมี seed (ผลจับคู่ทำซ้ำได้จากรหัสทัวนาเมนต์) ──
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
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ตัวสุ่มจาก(seed) { return mulberry32(xmur3(String(seed))()); }

  function สับลำดับ(รายการ, สุ่ม) {
    var ผล = รายการ.slice();
    for (var i = ผล.length - 1; i > 0; i--) {
      var j = Math.floor(สุ่ม() * (i + 1));
      var t = ผล[i]; ผล[i] = ผล[j]; ผล[j] = t;
    }
    return ผล;
  }

  // ── helper: ตัดสำเนาข้อมูลผู้เข้าแข่งขัน 1 ช่อง ให้เหลือเฉพาะ field ที่สเปกกำหนด ──
  function ตัดสำเนาช่อง(ช่อง) {
    var stats = {};
    STAT_KEYS.forEach(function (k) { stats[k] = ช่อง.stats[k]; });
    return {
      studentUid: ช่อง.studentUid,
      studentName: ช่อง.studentName,
      speciesKey: ช่อง.speciesKey,
      stage: ช่อง.stage,
      stats: stats
    };
  }

  function ตรวจสอบช่อง(ช่อง, ลำดับ) {
    var ชื่อช่อง = "ผู้เข้าแข่งขันคนที่ " + (ลำดับ + 1);
    if (!ช่อง || !ช่อง.studentUid || !ช่อง.studentName || !ช่อง.speciesKey || !ช่อง.stats) {
      throw new Error(ชื่อช่อง + " ข้อมูลไม่ครบ (ต้องมี studentUid, studentName, speciesKey, stage, stats)");
    }
    if (typeof ช่อง.stage !== "number" || ช่อง.stage % 1 !== 0 || ช่อง.stage < 0 || ช่อง.stage > 4) {
      throw new Error(ชื่อช่อง + " stage ต้องเป็นจำนวนเต็ม 0-4");
    }
    STAT_KEYS.forEach(function (k) {
      if (typeof ช่อง.stats[k] !== "number" || isNaN(ช่อง.stats[k])) {
        throw new Error(ชื่อช่อง + " stats ไม่ครบ — ขาดค่า " + k);
      }
    });
  }

  function แปลงช่องเป็นฝ่ายต่อสู้(ช่อง) {
    return { studentId: ช่อง.studentUid, petName: ช่อง.studentName, species: ช่อง.speciesKey, stats: ช่อง.stats };
  }

  function รหัสคู่(รอบ, ลำดับ) { return "r" + รอบ + "m" + ลำดับ; }

  // คู่ถัดไปที่ผู้ชนะของคู่นี้จะไป — null ถ้าเป็นรอบชิง
  function ปลายทางของ(matchKey, roundCount) {
    var m = รูปแบบรหัสคู่.exec(matchKey);
    var รอบ = Number(m[1]), ลำดับ = Number(m[2]);
    if (รอบ >= roundCount) return null;
    return { key: รหัสคู่(รอบ + 1, Math.ceil(ลำดับ / 2)), side: ลำดับ % 2 === 1 ? "slotA" : "slotB" };
  }

  // ── window.สร้างผังทัวนาเมนต์(ผู้เข้าแข่งขัน, seed) ── (pure — แยกออกมาเพื่อทดสอบได้)
  // คืน { participantCount, roundCount, finalKey, matches }
  window.สร้างผังทัวนาเมนต์ = function (ผู้เข้าแข่งขัน, seed) {
    var N = ผู้เข้าแข่งขัน.length;
    var ขนาด = 1;
    while (ขนาด < N) ขนาด *= 2;
    var roundCount = Math.round(Math.log(ขนาด) / Math.LN2);
    var คู่รอบแรก = ขนาด / 2;
    var จำนวนบาย = ขนาด - N; // < คู่รอบแรก เสมอ (N > ขนาด/2) → คู่รอบแรกมีบายได้ไม่เกิน 1 คนต่อคู่

    var สุ่ม = ตัวสุ่มจาก(seed);
    var ลำดับ = สับลำดับ(ผู้เข้าแข่งขัน.map(ตัดสำเนาช่อง), สุ่ม); // สุ่มจับคู่
    // คนที่ได้บาย = จำนวนบายคนแรกหลังสับ (สุ่มแล้ว) · วางคู่บายสลับกับคู่จริงให้กระจายทั่วผัง
    var คนได้บาย = ลำดับ.slice(0, จำนวนบาย);
    var คนแข่งรอบแรก = ลำดับ.slice(จำนวนบาย);
    var ตำแหน่งบาย = {};
    for (var b = 0; b < จำนวนบาย; b++) {
      ตำแหน่งบาย[Math.floor(b * คู่รอบแรก / จำนวนบาย)] = true;
    }

    var matches = {};
    for (var r = 1; r <= roundCount; r++) {
      var จำนวนคู่ = ขนาด / Math.pow(2, r);
      for (var i = 1; i <= จำนวนคู่; i++) {
        matches[รหัสคู่(r, i)] = { round: r, index: i, slotA: null, slotB: null, matchId: null, winnerSlot: null, bye: false, fought: false };
      }
    }

    for (var k = 0; k < คู่รอบแรก; k++) {
      var คู่ = matches[รหัสคู่(1, k + 1)];
      if (ตำแหน่งบาย[k]) {
        คู่.slotA = คนได้บาย.shift();
        คู่.bye = true;
        คู่.winnerSlot = "slotA";
        var ไป = ปลายทางของ(รหัสคู่(1, k + 1), roundCount);
        if (ไป) matches[ไป.key][ไป.side] = คู่.slotA;
      } else {
        คู่.slotA = คนแข่งรอบแรก.shift();
        คู่.slotB = คนแข่งรอบแรก.shift();
      }
    }

    return { participantCount: N, roundCount: roundCount, finalKey: รหัสคู่(roundCount, 1), matches: matches };
  };

  // ── window.สร้างทัวนาเมนต์(ผู้เข้าแข่งขัน) ──
  // ผู้เข้าแข่งขัน = [slot, ...] อย่างน้อย 2 คน ไม่ซ้ำกัน (ลำดับไม่มีผล — ระบบสุ่มจับคู่เอง)
  // คืน Promise<string> = tournamentId ที่สร้างใหม่
  window.สร้างทัวนาเมนต์ = async function (ผู้เข้าแข่งขัน) {
    if (!Array.isArray(ผู้เข้าแข่งขัน) || ผู้เข้าแข่งขัน.length < 2) {
      throw new Error("ต้องมีผู้เข้าแข่งขันอย่างน้อย 2 คน");
    }
    ผู้เข้าแข่งขัน.forEach(ตรวจสอบช่อง);
    var uidทั้งหมด = ผู้เข้าแข่งขัน.map(function (s) { return s.studentUid; });
    uidทั้งหมด.forEach(function (u, i) {
      if (uidทั้งหมด.indexOf(u) !== i) throw new Error("ผู้เข้าแข่งขันซ้ำกัน — เลือกนักเรียนแต่ละคนได้ครั้งเดียว");
    });

    var เอกสารใหม่ = window.fsDoc(window.fsCollection(window.db, "tournaments"));
    var ผัง = window.สร้างผังทัวนาเมนต์(ผู้เข้าแข่งขัน, เอกสารใหม่.id);
    var ข้อมูลใหม่ = {
      format: 2,
      createdByTeacherId: window.CURRENT_USER ? window.CURRENT_USER.uid : null,
      createdByTeacherName: window.CURRENT_USER ? window.CURRENT_USER.name : null,
      createdAt: เวลาตอนนี้(),
      createdAtMs: Date.now(),
      participantCount: ผัง.participantCount,
      roundCount: ผัง.roundCount,
      finalKey: ผัง.finalKey,
      announcedRound: 0, // [เพิ่ม 2026-11-17] ยังไม่ประกาศรอบใด — ผลทุกคู่เป็นความลับจนครูกดประกาศ
      matches: ผัง.matches
    };

    try {
      await window.fsSetDoc(เอกสารใหม่, ข้อมูลใหม่);
      return เอกสารใหม่.id;
    } catch (err) {
      console.error(err);
      throw new Error("สร้างทัวนาเมนต์ไม่สำเร็จ: " + err.message);
    }
  };

  // ── ตัวช่วยกติกาประกาศผลทีละรอบ (DD-10~12) ──
  function เป็นเอกสารเก่า(ข้อมูล) { return typeof ข้อมูล.announcedRound !== "number"; }
  // เอกสารเก่า (ไม่มี announcedRound) = ประกาศครบทุกรอบแล้ว (BR-31)
  function ประกาศถึงรอบ(ข้อมูล) { return เป็นเอกสารเก่า(ข้อมูล) ? ข้อมูล.roundCount : ข้อมูล.announcedRound; }
  function สู้แล้ว(คู่, เก่า) { return เก่า ? !!คู่.matchId : คู่.fought === true; }
  function ผู้ใช้เป็นครู() { return !!window.CURRENT_USER && window.CURRENT_USER.role === "teacher"; }
  function ผิดพลาด(code, ข้อความ) { var e = new Error(ข้อความ); e.code = code; return e; }
  function เอกสารทัวนาเมนต์(tid) { return window.fsDoc(window.db, "tournaments", tid); }
  function เอกสารผลลับ(tid, matchKey) { return window.fsDoc(window.db, "tournaments", tid, "results", matchKey); }
  function เอกสารบันทึกต่อสู้(tid, matchId) { return window.fsDoc(window.db, "tournaments", tid, "matches", matchId); }

  function ตรวจเอกสาร(สแนปช็อต, tid) {
    if (!สแนปช็อต.exists()) throw ผิดพลาด("TOURNAMENT_NOT_FOUND", "ไม่พบทัวนาเมนต์นี้ (อาจถูกลบไปแล้ว) — รหัส: " + tid);
    var ข้อมูล = สแนปช็อต.data();
    if (!ข้อมูล.matches) {
      throw ผิดพลาด("TOURNAMENT_LEGACY_FORMAT", "ทัวนาเมนต์นี้สร้างด้วยระบบรุ่นเก่า (4 คนตายตัว) เปิดผังในระบบใหม่ไม่ได้");
    }
    return ข้อมูล;
  }

  function ตรวจรหัสคู่(ข้อมูล, matchKey) {
    if (!รูปแบบรหัสคู่.test(String(matchKey)) || !ข้อมูล.matches[matchKey]) {
      throw ผิดพลาด("MATCH_NOT_FOUND", "ไม่พบคู่นี้ในทัวนาเมนต์ — รหัสคู่: " + matchKey);
    }
  }

  function ห่อข้อผิดพลาด(คำนำ, err) {
    console.error(err);
    var e = new Error(คำนำ + err.message);
    if (err.code) e.code = err.code;
    return e;
  }

  // ── window.คำนวณแมตช์ของทัวนาเมนต์(tournamentId, matchKey) ── (ครูเท่านั้น — DD-10 / API-67)
  // คำนวณด้วย engine แล้วเขียน 3 จุดใน transaction เดียว: battle log (+round), ผลลับ results/{matchKey},
  // และ matches.{key}.fought/matchId — **ไม่เขียนผู้ชนะลงเอกสารสาธารณะ ไม่เลื่อนผู้ชนะ** (รอครูประกาศรอบ)
  // คืน Promise<{ matchKey, matchId, needsTeacherDecision }> — ไม่มีผู้ชนะใน response (ครูอาจฉายจออยู่)
  window.คำนวณแมตช์ของทัวนาเมนต์ = async function (tournamentId, matchKey) {
    if (!ผู้ใช้เป็นครู()) throw ผิดพลาด("FORBIDDEN_ROLE", "เฉพาะครูเท่านั้นที่กดต่อสู้ได้");
    var อ้างอิง = เอกสารทัวนาเมนต์(tournamentId);
    try {
      return await window.fsRunTransaction(window.db, async function (tx) {
        var ข้อมูล = ตรวจเอกสาร(await tx.get(อ้างอิง), tournamentId);
        if (เป็นเอกสารเก่า(ข้อมูล)) {
          throw ผิดพลาด("TOURNAMENT_LEGACY", "ทัวนาเมนต์นี้สร้างก่อนมีระบบประกาศผล — ดูผลได้อย่างเดียว");
        }
        ตรวจรหัสคู่(ข้อมูล, matchKey);
        var คู่ = ข้อมูล.matches[matchKey];
        // ลำดับตรวจตาม API-67: บาย → สู้แล้ว → รอบยังไม่ปลดล็อก → ผู้เข้ารอบไม่ครบ
        if (คู่.bye) throw ผิดพลาด("MATCH_IS_BYE", "คู่นี้ได้บาย ไม่ต้องต่อสู้");
        if (คู่.fought === true) throw ผิดพลาด("MATCH_ALREADY_FOUGHT", "คู่นี้ต่อสู้ไปแล้ว");
        if (!(ข้อมูล.announcedRound >= คู่.round - 1)) { // BR-25
          throw ผิดพลาด("ROUND_NOT_UNLOCKED", "ต้องประกาศผล" + ชื่อรอบทัวนาเมนต์(คู่.round - 1, ข้อมูล.roundCount) + "ก่อน จึงจะต่อสู้รอบนี้ได้");
        }
        if (!คู่.slotA || !คู่.slotB) {
          throw ผิดพลาด("MATCH_NOT_READY", "คู่นี้ยังไม่พร้อม — ต้องมีผู้เข้ารอบครบทั้งสองฝั่ง");
        }

        var matchId = tournamentId + "-" + matchKey;
        var บันทึกผล = window.คำนวณผลการต่อสู้({
          matchId: matchId,
          sideA: แปลงช่องเป็นฝ่ายต่อสู้(คู่.slotA),
          sideB: แปลงช่องเป็นฝ่ายต่อสู้(คู่.slotB)
        });
        var winnerSlot = null; // เสมอจริง (winner null) → รอครูชี้ขาด ไม่สุ่ม (BR-33)
        if (บันทึกผล.result.winner === "A") winnerSlot = "slotA";
        else if (บันทึกผล.result.winner === "B") winnerSlot = "slotB";

        // round ใน battle log คือเงื่อนไขที่ rules ใช้ตัดสินว่านักเรียนอ่านได้หรือยัง (DD-12)
        tx.set(เอกสารบันทึกต่อสู้(tournamentId, matchId), Object.assign({}, บันทึกผล, { round: คู่.round }));
        tx.set(เอกสารผลลับ(tournamentId, matchKey), {
          matchId: matchId, winnerSlot: winnerSlot, decidedByTeacher: false, foughtAt: เวลาตอนนี้()
        });
        var ค่าที่จะอัปเดต = {};
        ค่าที่จะอัปเดต["matches." + matchKey + ".fought"] = true;
        ค่าที่จะอัปเดต["matches." + matchKey + ".matchId"] = matchId;
        tx.update(อ้างอิง, ค่าที่จะอัปเดต);
        return { matchKey: matchKey, matchId: matchId, needsTeacherDecision: winnerSlot === null };
      });
    } catch (err) {
      throw ห่อข้อผิดพลาด("คำนวณผลแมตช์ไม่สำเร็จ: ", err);
    }
  };

  // ── window.ครูเลือกผู้ชนะ(tournamentId, matchKey, winnerSlot) ── (ครูเท่านั้น — API-68)
  // ใช้เมื่อคู่ต่อสู้แล้วแต่เสมอจริง (ผลลับ winnerSlot === null) · เขียนที่ผลลับเท่านั้น ยังไม่แตะเอกสารสาธารณะ
  // (ผู้ชนะที่ครูเลือกจะปรากฏตอนประกาศรอบ) · เลือกได้ครั้งเดียว แก้ซ้ำไม่ได้
  window.ครูเลือกผู้ชนะ = async function (tournamentId, matchKey, winnerSlot) {
    if (!ผู้ใช้เป็นครู()) throw ผิดพลาด("FORBIDDEN_ROLE", "เฉพาะครูเท่านั้นที่เลือกผู้ชนะได้");
    if (winnerSlot !== "slotA" && winnerSlot !== "slotB") {
      throw ผิดพลาด("VALIDATION_ERROR", 'winnerSlot ไม่ถูกต้อง — ต้องเป็น "slotA" หรือ "slotB" เท่านั้น');
    }
    var อ้างอิง = เอกสารทัวนาเมนต์(tournamentId);
    try {
      await window.fsRunTransaction(window.db, async function (tx) {
        var ข้อมูล = ตรวจเอกสาร(await tx.get(อ้างอิง), tournamentId);
        if (เป็นเอกสารเก่า(ข้อมูล)) {
          throw ผิดพลาด("TOURNAMENT_LEGACY", "ทัวนาเมนต์นี้สร้างก่อนมีระบบประกาศผล — ดูผลได้อย่างเดียว");
        }
        ตรวจรหัสคู่(ข้อมูล, matchKey);
        var คู่ = ข้อมูล.matches[matchKey];
        if (คู่.bye || คู่.fought !== true) {
          throw ผิดพลาด("MATCH_NOT_READY", "คู่นี้ยังไม่ได้ต่อสู้ — ครูเลือกผู้ชนะได้เฉพาะคู่ที่เสมอหลังต่อสู้แล้ว");
        }
        if (คู่.round <= ข้อมูล.announcedRound) throw ผิดพลาด("ROUND_ALREADY_ANNOUNCED", "รอบนี้ประกาศผลไปแล้ว แก้ผู้ชนะไม่ได้");
        var ผลลับ = await tx.get(เอกสารผลลับ(tournamentId, matchKey));
        if (!ผลลับ.exists()) throw ผิดพลาด("INTERNAL_DATA_ERROR", "ไม่พบผลของคู่นี้ (ข้อมูลภายในผิดปกติ)");
        var ผล = ผลลับ.data();
        if (ผล.decidedByTeacher === true) throw ผิดพลาด("TIE_ALREADY_DECIDED", "คู่นี้ครูเลือกผู้ชนะไปแล้ว แก้ซ้ำไม่ได้");
        if (ผล.winnerSlot != null) throw ผิดพลาด("MATCH_NOT_TIED", "คู่นี้มีผู้ชนะจากการต่อสู้แล้ว ครูเลือกผู้ชนะเองไม่ได้");
        tx.update(เอกสารผลลับ(tournamentId, matchKey), { winnerSlot: winnerSlot, decidedByTeacher: true });
      });
    } catch (err) {
      throw ห่อข้อผิดพลาด("บันทึกผู้ชนะไม่สำเร็จ: ", err);
    }
  };

  // ── window.ประกาศผลรอบ(tournamentId, round) ── (ครูเท่านั้น — DD-11 / API-69)
  // คัดลอกผู้ชนะจากผลลับของทุกคู่ปกติในรอบนี้ลงเอกสารสาธารณะ + เลื่อนเข้ารอบถัดไป + announcedRound = round
  // ทั้งหมดใน transaction เดียว (พลาดจุดเดียว = ไม่เปลี่ยนอะไรเลย) · ประกาศแล้วยกเลิกไม่ได้ (ฌ. ข้อ 10)
  // คืน Promise<{ announcedRound, roundCount, championDecided }>
  window.ประกาศผลรอบ = async function (tournamentId, round) {
    if (!ผู้ใช้เป็นครู()) throw ผิดพลาด("FORBIDDEN_ROLE", "เฉพาะครูเท่านั้นที่ประกาศผลได้");
    if (typeof round !== "number" || round % 1 !== 0) throw ผิดพลาด("VALIDATION_ERROR", "เลขรอบไม่ถูกต้อง");
    var อ้างอิง = เอกสารทัวนาเมนต์(tournamentId);
    try {
      return await window.fsRunTransaction(window.db, async function (tx) {
        var ข้อมูล = ตรวจเอกสาร(await tx.get(อ้างอิง), tournamentId);
        if (round < 1 || round > ข้อมูล.roundCount) throw ผิดพลาด("VALIDATION_ERROR", "เลขรอบไม่ถูกต้อง");
        // ลำดับตรวจตาม API-69: ประกาศแล้ว → ข้ามรอบ → สู้ยังไม่ครบ → เสมอค้าง (BR-26)
        if (เป็นเอกสารเก่า(ข้อมูล) || round <= ข้อมูล.announcedRound) {
          throw ผิดพลาด("ROUND_ALREADY_ANNOUNCED", "รอบนี้ประกาศผลไปแล้ว");
        }
        if (round > ข้อมูล.announcedRound + 1) {
          throw ผิดพลาด("ROUND_SKIPPED", "ต้องประกาศผล" + ชื่อรอบทัวนาเมนต์(ข้อมูล.announcedRound + 1, ข้อมูล.roundCount) + "ก่อน");
        }
        var คู่ปกติ = Object.keys(ข้อมูล.matches).filter(function (k) {
          return ข้อมูล.matches[k].round === round && !ข้อมูล.matches[k].bye;
        });
        var ยังไม่สู้ = คู่ปกติ.filter(function (k) { return ข้อมูล.matches[k].fought !== true; });
        if (ยังไม่สู้.length > 0) {
          throw ผิดพลาด("ROUND_NOT_FULLY_FOUGHT", "ยังต่อสู้ไม่ครบทุกคู่ในรอบนี้ (เหลือ " + ยังไม่สู้.length + " คู่)");
        }
        var ผลลับทั้งหมด = {};
        for (var i = 0; i < คู่ปกติ.length; i++) {
          var ส = await tx.get(เอกสารผลลับ(tournamentId, คู่ปกติ[i]));
          if (!ส.exists()) throw ผิดพลาด("INTERNAL_DATA_ERROR", "ไม่พบผลของคู่ " + คู่ปกติ[i] + " (ข้อมูลภายในผิดปกติ)");
          ผลลับทั้งหมด[คู่ปกติ[i]] = ส.data();
        }
        var เสมอค้าง = คู่ปกติ.filter(function (k) {
          var w = ผลลับทั้งหมด[k].winnerSlot;
          return w !== "slotA" && w !== "slotB";
        });
        if (เสมอค้าง.length > 0) {
          throw ผิดพลาด("TIE_NOT_DECIDED", "ยังมีคู่ที่เสมอ " + เสมอค้าง.length + " คู่ — ครูต้องเลือกผู้ชนะก่อนประกาศ");
        }

        var ค่าที่จะอัปเดต = {};
        คู่ปกติ.forEach(function (k) {
          var ผล = ผลลับทั้งหมด[k];
          var คู่ = ข้อมูล.matches[k];
          ค่าที่จะอัปเดต["matches." + k + ".winnerSlot"] = ผล.winnerSlot;
          ค่าที่จะอัปเดต["matches." + k + ".decidedByTeacher"] = ผล.decidedByTeacher === true;
          var ไป = ปลายทางของ(k, ข้อมูล.roundCount);
          if (ไป) ค่าที่จะอัปเดต["matches." + ไป.key + "." + ไป.side] = ตัดสำเนาช่อง(คู่[ผล.winnerSlot]);
        });
        ค่าที่จะอัปเดต.announcedRound = round;
        tx.update(อ้างอิง, ค่าที่จะอัปเดต);
        return { announcedRound: round, roundCount: ข้อมูล.roundCount, championDecided: round === ข้อมูล.roundCount };
      });
    } catch (err) {
      throw ห่อข้อผิดพลาด("ประกาศผลไม่สำเร็จ: ", err);
    }
  };

  // ── window.โหลดทัวนาเมนต์(tournamentId) ── (ทุกบทบาท — DD-12 ส่วน A)
  // คืนเอกสาร + .rounds = [[{key, ...คู่, status, matchLog?}, ...], ...] เรียงตามรอบ/ลำดับ
  //   status: "bye" | "waiting_fight" | "waiting_announce" | "announced"
  //   winnerSlot ของคู่ปกติในรอบที่ยังไม่ประกาศถูกตั้งเป็น null เสมอ (ป้องกันซ้อนชั้น) — **ครูก็ไม่เห็นผู้ชนะบนผัง**
  //   matchLog โหลดเฉพาะคู่ที่ประกาศแล้ว (ใช้ป้ายเหตุผล) · รีเพลย์ใช้ window.โหลดรีเพลย์ของคู่
  //   legacy (เอกสารเก่า) / announcedRound / effectiveAnnouncedRound
  //   เฉพาะครู (นักเรียนไม่มี field เหล่านี้เลย): คู่.canFight, คู่.needsTeacherDecision, announceableRound,
  //     nextRoundInfo = { round, remaining, ties } (สถานะของรอบถัดไปที่ยังไม่ประกาศ — ใช้บอกเหตุผลที่ยังกดประกาศไม่ได้)
  window.โหลดทัวนาเมนต์ = async function (tournamentId) {
    try {
      var สแนปช็อต = await window.fsGetDoc(เอกสารทัวนาเมนต์(tournamentId));
      var ข้อมูล = ตรวจเอกสาร(สแนปช็อต, tournamentId);
      ข้อมูล.id = สแนปช็อต.id;
      var เก่า = เป็นเอกสารเก่า(ข้อมูล);
      var ประกาศถึง = ประกาศถึงรอบ(ข้อมูล);
      var ครู = ผู้ใช้เป็นครู();
      ข้อมูล.legacy = เก่า;
      ข้อมูล.effectiveAnnouncedRound = ประกาศถึง;

      var keys = Object.keys(ข้อมูล.matches);
      await Promise.all(keys.map(async function (k) {
        var คู่ = ข้อมูล.matches[k];
        var สู้ = สู้แล้ว(คู่, เก่า);
        var ประกาศแล้ว = คู่.round <= ประกาศถึง;
        คู่.fought = สู้;
        if (!คู่.bye && !ประกาศแล้ว) { คู่.winnerSlot = null; คู่.decidedByTeacher = false; } // BR-28
        คู่.status = คู่.bye ? "bye" : !สู้ ? "waiting_fight" : ประกาศแล้ว ? "announced" : "waiting_announce";

        if (คู่.status === "announced" && คู่.matchId) {
          try {
            var ส = await window.fsGetDoc(เอกสารบันทึกต่อสู้(tournamentId, คู่.matchId));
            คู่.matchLog = ส.exists() ? ส.data() : null;
          } catch (e) { console.error(e); คู่.matchLog = null; }
        }
        if (ครู && !เก่า) {
          คู่.canFight = !คู่.bye && !สู้ && !!คู่.slotA && !!คู่.slotB && ข้อมูล.announcedRound >= คู่.round - 1;
          คู่.needsTeacherDecision = false;
          if (คู่.status === "waiting_announce") {
            var ผล = await window.fsGetDoc(เอกสารผลลับ(tournamentId, k));
            // อ่านแค่ว่าเสมอค้างไหม — ไม่นำผู้ชนะลับมาใส่ผัง (AC-FE-43-2)
            คู่.needsTeacherDecision = ผล.exists() && ผล.data().winnerSlot == null;
          }
        }
      }));

      ข้อมูล.rounds = [];
      for (var r = 1; r <= ข้อมูล.roundCount; r++) ข้อมูล.rounds.push([]);
      keys.forEach(function (k) {
        var คู่ = Object.assign({ key: k }, ข้อมูล.matches[k]);
        ข้อมูล.rounds[คู่.round - 1].push(คู่);
      });
      ข้อมูล.rounds.forEach(function (รอบ) { รอบ.sort(function (a, b) { return a.index - b.index; }); });

      if (ครู && !เก่า) {
        ข้อมูล.announceableRound = null;
        ข้อมูล.nextRoundInfo = null;
        var N = ข้อมูล.announcedRound + 1;
        if (N <= ข้อมูล.roundCount) {
          var คู่ปกติ = ข้อมูล.rounds[N - 1].filter(function (ค) { return !ค.bye; });
          var เหลือ = คู่ปกติ.filter(function (ค) { return !ค.fought; }).length;
          var เสมอ = คู่ปกติ.filter(function (ค) { return ค.needsTeacherDecision; }).length;
          ข้อมูล.nextRoundInfo = { round: N, remaining: เหลือ, ties: เสมอ };
          if (เหลือ === 0 && เสมอ === 0) ข้อมูล.announceableRound = N; // BR-26
        }
      }
      return ข้อมูล;
    } catch (err) {
      throw ห่อข้อผิดพลาด("โหลดทัวนาเมนต์ไม่สำเร็จ: ", err);
    }
  };

  // ── window.โหลดรีเพลย์ของคู่(tournamentId, matchKey) ── (ทุกบทบาท — DD-12 ส่วน B / API-70)
  // นักเรียน: รอบที่ยังไม่ประกาศ → ROUND_NOT_ANNOUNCED ทันที (ตรวจก่อนว่าสู้แล้วหรือยัง ไม่อ่าน log เลย)
  // ครู: เปิดได้เสมอเมื่อสู้แล้ว (AC-FE-43-1) — การเปิดไม่แก้ข้อมูลใดๆ
  // คืน { tournament: { id, roundCount }, คู่: {...คู่ พร้อม winnerSlot/decidedByTeacher ที่เปิดเผยได้}, matchLog }
  window.โหลดรีเพลย์ของคู่ = async function (tournamentId, matchKey) {
    try {
      var ข้อมูล = ตรวจเอกสาร(await window.fsGetDoc(เอกสารทัวนาเมนต์(tournamentId)), tournamentId);
      ตรวจรหัสคู่(ข้อมูล, matchKey);
      var เก่า = เป็นเอกสารเก่า(ข้อมูล);
      var ประกาศแล้ว = ข้อมูล.matches[matchKey].round <= ประกาศถึงรอบ(ข้อมูล);
      var คู่ = Object.assign({ key: matchKey }, ข้อมูล.matches[matchKey]);
      var ครู = ผู้ใช้เป็นครู();
      if (!ครู && !ประกาศแล้ว) {
        throw ผิดพลาด("ROUND_NOT_ANNOUNCED", "รอครูประกาศผลก่อน จึงจะดูรีเพลย์ได้");
      }
      if (คู่.bye || !สู้แล้ว(คู่, เก่า) || !คู่.matchId) {
        throw ผิดพลาด("MATCH_NOT_FOUND", "คู่นี้ยังไม่ได้ต่อสู้ — รอครูกดต่อสู้ที่หน้าผังทัวนาเมนต์ก่อน");
      }
      var ส = await window.fsGetDoc(เอกสารบันทึกต่อสู้(tournamentId, คู่.matchId));
      if (!ส.exists()) throw ผิดพลาด("MATCH_NOT_FOUND", "ไม่พบรีเพลย์ของคู่นี้");

      if (!ประกาศแล้ว) {
        // ครูดูก่อนประกาศ: ผู้ชนะบนเอกสารสาธารณะยังว่าง — ใช้ผลลับเฉพาะกรณีครูชี้ขาดเสมอ
        คู่.winnerSlot = null;
        คู่.decidedByTeacher = false;
        var ผลลับ = await window.fsGetDoc(เอกสารผลลับ(tournamentId, matchKey));
        if (ผลลับ.exists() && ผลลับ.data().decidedByTeacher === true) {
          คู่.winnerSlot = ผลลับ.data().winnerSlot;
          คู่.decidedByTeacher = true;
        }
      }
      return { tournament: { id: tournamentId, roundCount: ข้อมูล.roundCount }, คู่: คู่, matchLog: ส.data(), announced: ประกาศแล้ว };
    } catch (err) {
      if (err.code === "ROUND_NOT_ANNOUNCED" || err.code === "MATCH_NOT_FOUND") throw err;
      throw ห่อข้อผิดพลาด("โหลดรีเพลย์ไม่สำเร็จ: ", err);
    }
  };

  // ── window.ลบทัวนาเมนต์(tournamentId) ── (ครูเท่านั้น — rules บังคับ)
  // ลบ battle log + ผลลับทุกคู่ก่อน แล้วค่อยลบตัวทัวนาเมนต์ (Firestore ไม่ลบ subcollection ให้เอง)
  // แชมป์หายจากกระดานเกียรติยศ/หน้าหลักด้วย
  window.ลบทัวนาเมนต์ = async function (tournamentId) {
    try {
      var อ้างอิง = เอกสารทัวนาเมนต์(tournamentId);
      var ส = await window.fsGetDoc(อ้างอิง);
      if (!ส.exists()) return;
      var ข้อมูล = ส.data();
      if (ข้อมูล.matches) {
        var keys = Object.keys(ข้อมูล.matches);
        for (var k = 0; k < keys.length; k++) {
          var คู่ = ข้อมูล.matches[keys[k]];
          if (คู่.matchId) await window.fsDeleteDoc(เอกสารบันทึกต่อสู้(tournamentId, คู่.matchId));
          if (คู่.fought === true) await window.fsDeleteDoc(เอกสารผลลับ(tournamentId, keys[k]));
        }
      } else {
        var เก่า = ["semifinal1", "semifinal2", "final"].map(function (k) { return ข้อมูล[k] || {}; });
        for (var i = 0; i < เก่า.length; i++) {
          if (เก่า[i].matchId) await window.fsDeleteDoc(เอกสารบันทึกต่อสู้(tournamentId, เก่า[i].matchId));
        }
      }
      await window.fsDeleteDoc(อ้างอิง);
    } catch (err) {
      throw ห่อข้อผิดพลาด("ลบทัวนาเมนต์ไม่สำเร็จ: ", err);
    }
  };

  // ── window.โหลดรายการทัวนาเมนต์() ──
  // คืน Promise<[{ id, createdAt, createdByTeacherName, participantCount, championName }]> ใหม่สุดก่อน
  window.โหลดรายการทัวนาเมนต์ = async function () {
    try {
      var ผล = await window.fsGetDocs(
        window.fsQuery(window.fsCollection(window.db, "tournaments"), window.fsOrderBy("createdAt", "desc"))
      );
      var รายการ = [];
      ผล.forEach(function (d) {
        var ข้อมูล = d.data();
        var แชมป์ = แชมป์ของทัวนาเมนต์(ข้อมูล);
        รายการ.push({
          id: d.id,
          createdAt: ข้อมูล.createdAt,
          createdAtMs: ข้อมูล.createdAtMs || 0,
          createdByTeacherName: ข้อมูล.createdByTeacherName != null ? ข้อมูล.createdByTeacherName : null,
          participantCount: ข้อมูล.participantCount || (ข้อมูล.matches ? null : 4),
          championName: แชมป์ ? แชมป์.slot.studentName : null
        });
      });
      // createdAt ละเอียดแค่นาที — ใช้ createdAtMs ตัดสินลำดับในนาทีเดียวกัน
      รายการ.sort(function (a, b) {
        if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
        return b.createdAtMs - a.createdAtMs;
      });
      return รายการ;
    } catch (err) {
      console.error(err);
      throw new Error("โหลดรายการทัวนาเมนต์ไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์() ──
  // คืน Promise<[{ uid, name, pet: {speciesKey, stage, stats} | null }]> เรียงชื่อภาษาไทย
  window.โหลดรายชื่อนักเรียนสำหรับทัวนาเมนต์ = async function () {
    try {
      var ผล = await window.fsGetDocs(
        window.fsQuery(window.fsCollection(window.db, "users"), window.fsWhere("role", "==", "student"))
      );
      var นักเรียน = [];
      ผล.forEach(function (d) { นักเรียน.push({ uid: d.id, name: d.data().name }); });

      var รายการ = await Promise.all(นักเรียน.map(async function (n) {
        var ส = await window.fsGetDoc(window.fsDoc(window.db, "pets", n.uid));
        var pet = null;
        if (ส.exists() && ส.data().pet) {
          var p = ส.data().pet;
          pet = { speciesKey: p.speciesKey, stage: p.stage, stats: p.stats };
        }
        return { uid: n.uid, name: n.name, pet: pet };
      }));

      รายการ.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), "th"); });
      return รายการ;
    } catch (err) {
      console.error(err);
      throw new Error("โหลดรายชื่อนักเรียนไม่สำเร็จ: " + err.message);
    }
  };
})();
