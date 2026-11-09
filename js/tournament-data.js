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
//   tournaments/{tournamentId}/matches/{matchId} = battle log เต็มก้อนจาก window.คำนวณผลการต่อสู้
//   matchId = tournamentId + "-" + matchKey (deterministic — seed ของ engine มาจาก matchId)
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
        matches[รหัสคู่(r, i)] = { round: r, index: i, slotA: null, slotB: null, matchId: null, winnerSlot: null, bye: false };
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

  async function อ่านทัวนาเมนต์(tournamentId) {
    var เอกสารอ้างอิง = window.fsDoc(window.db, "tournaments", tournamentId);
    var สแนปช็อต = await window.fsGetDoc(เอกสารอ้างอิง);
    if (!สแนปช็อต.exists()) throw new Error("ไม่พบทัวนาเมนต์นี้ — รหัส: " + tournamentId);
    var ข้อมูล = สแนปช็อต.data();
    if (!ข้อมูล.matches) throw new Error("ทัวนาเมนต์นี้เป็นรูปแบบเก่า (4 คนตายตัว) — ดูผลได้อย่างเดียว");
    return { ref: เอกสารอ้างอิง, ข้อมูล: ข้อมูล };
  }

  function ตรวจรหัสคู่(ข้อมูล, matchKey) {
    if (!รูปแบบรหัสคู่.test(String(matchKey)) || !ข้อมูล.matches[matchKey]) {
      throw new Error("ไม่พบคู่นี้ในทัวนาเมนต์ — รหัสคู่: " + matchKey);
    }
  }

  // ── window.คำนวณแมตช์ของทัวนาเมนต์(tournamentId, matchKey) ──
  // คำนวณด้วย engine → บันทึก battle log → อัปเดต winnerSlot → เลื่อนผู้ชนะเข้ารอบถัดไปอัตโนมัติ
  // คืน Promise<battle log>
  window.คำนวณแมตช์ของทัวนาเมนต์ = async function (tournamentId, matchKey) {
    var อ่าน = await อ่านทัวนาเมนต์(tournamentId);
    var ข้อมูล = อ่าน.ข้อมูล;
    ตรวจรหัสคู่(ข้อมูล, matchKey);
    var คู่แข่งขัน = ข้อมูล.matches[matchKey];
    if (คู่แข่งขัน.bye) throw new Error("คู่นี้ได้บาย ไม่ต้องต่อสู้");
    if (คู่แข่งขัน.matchId) throw new Error("คู่นี้ต่อสู้ไปแล้ว");
    if (!คู่แข่งขัน.slotA || !คู่แข่งขัน.slotB) {
      throw new Error("คู่นี้ยังไม่พร้อม — ต้องรอผลของรอบก่อนหน้าให้ครบทั้งสองฝั่ง");
    }

    var matchId = tournamentId + "-" + matchKey;
    try {
      var บันทึกผล = window.คำนวณผลการต่อสู้({
        matchId: matchId,
        sideA: แปลงช่องเป็นฝ่ายต่อสู้(คู่แข่งขัน.slotA),
        sideB: แปลงช่องเป็นฝ่ายต่อสู้(คู่แข่งขัน.slotB)
      });

      await window.fsSetDoc(window.fsDoc(window.db, "tournaments", tournamentId, "matches", matchId), บันทึกผล);

      var winnerSlotKey = null;
      if (บันทึกผล.result.winner === "A") winnerSlotKey = "slotA";
      else if (บันทึกผล.result.winner === "B") winnerSlotKey = "slotB";
      // เสมอจริง (winner null) → รอครูชี้ขาดผ่าน window.ครูเลือกผู้ชนะ ไม่สุ่มผู้ชนะ

      var ค่าที่จะอัปเดต = {};
      ค่าที่จะอัปเดต["matches." + matchKey + ".matchId"] = matchId;
      ค่าที่จะอัปเดต["matches." + matchKey + ".winnerSlot"] = winnerSlotKey;
      if (winnerSlotKey) {
        var ไป = ปลายทางของ(matchKey, ข้อมูล.roundCount);
        if (ไป) ค่าที่จะอัปเดต["matches." + ไป.key + "." + ไป.side] = ตัดสำเนาช่อง(คู่แข่งขัน[winnerSlotKey]);
      }
      await window.fsUpdateDoc(อ่าน.ref, ค่าที่จะอัปเดต);
      return บันทึกผล;
    } catch (err) {
      console.error(err);
      throw new Error("คำนวณผลแมตช์ไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.ครูเลือกผู้ชนะ(tournamentId, matchKey, winnerSlot) ──
  // ใช้เมื่อแมตช์คำนวณแล้วแต่ result.winner === null (%เลือดเท่ากันเป๊ะ) เท่านั้น
  window.ครูเลือกผู้ชนะ = async function (tournamentId, matchKey, winnerSlot) {
    if (winnerSlot !== "slotA" && winnerSlot !== "slotB") {
      throw new Error('winnerSlot ไม่ถูกต้อง — ต้องเป็น "slotA" หรือ "slotB" เท่านั้น');
    }
    var อ่าน = await อ่านทัวนาเมนต์(tournamentId);
    var ข้อมูล = อ่าน.ข้อมูล;
    ตรวจรหัสคู่(ข้อมูล, matchKey);
    var คู่ = ข้อมูล.matches[matchKey];
    if (!คู่.matchId) {
      throw new Error("แมตช์นี้ยังไม่ได้คำนวณผล — ครูเลือกผู้ชนะได้เฉพาะแมตช์ที่เสมอจริงหลังคำนวณแล้ว");
    }
    var สแนปช็อตแมตช์ = await window.fsGetDoc(window.fsDoc(window.db, "tournaments", tournamentId, "matches", คู่.matchId));
    if (!สแนปช็อตแมตช์.exists()) throw new Error("ไม่พบบันทึกผลแมตช์ — รหัส: " + คู่.matchId);
    var ผล = สแนปช็อตแมตช์.data().result;
    if (!ผล || ผล.winner !== null) throw new Error("แมตช์นี้มีผู้ชนะจากการคำนวณแล้ว ครูเลือกผู้ชนะเองไม่ได้");
    if (คู่.winnerSlot) throw new Error("แมตช์นี้ครูเลือกผู้ชนะไปแล้ว แก้ซ้ำไม่ได้");

    try {
      var ค่าที่จะอัปเดต = {};
      ค่าที่จะอัปเดต["matches." + matchKey + ".winnerSlot"] = winnerSlot;
      ค่าที่จะอัปเดต["matches." + matchKey + ".decidedByTeacher"] = true;
      var ไป = ปลายทางของ(matchKey, ข้อมูล.roundCount);
      if (ไป) ค่าที่จะอัปเดต["matches." + ไป.key + "." + ไป.side] = ตัดสำเนาช่อง(คู่[winnerSlot]);
      await window.fsUpdateDoc(อ่าน.ref, ค่าที่จะอัปเดต);
    } catch (err) {
      console.error(err);
      throw new Error("บันทึกผู้ชนะไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.โหลดทัวนาเมนต์(tournamentId) ──
  // คืนเอกสารทั้งก้อน + .rounds = [[{key, ...คู่, matchLog?}, ...], ...] เรียงตามรอบ/ลำดับ
  window.โหลดทัวนาเมนต์ = async function (tournamentId) {
    try {
      var สแนปช็อต = await window.fsGetDoc(window.fsDoc(window.db, "tournaments", tournamentId));
      if (!สแนปช็อต.exists()) throw new Error("ไม่พบทัวนาเมนต์นี้ — รหัส: " + tournamentId);
      var ข้อมูล = สแนปช็อต.data();
      ข้อมูล.id = สแนปช็อต.id;
      if (!ข้อมูล.matches) {
        throw new Error("ทัวนาเมนต์นี้สร้างด้วยระบบรุ่นเก่า (4 คนตายตัว) เปิดผังในระบบใหม่ไม่ได้");
      }

      var keys = Object.keys(ข้อมูล.matches);
      await Promise.all(keys.map(async function (k) {
        var คู่ = ข้อมูล.matches[k];
        if (คู่.matchId) {
          var ส = await window.fsGetDoc(window.fsDoc(window.db, "tournaments", tournamentId, "matches", คู่.matchId));
          คู่.matchLog = ส.exists() ? ส.data() : null;
        }
      }));

      ข้อมูล.rounds = [];
      for (var r = 1; r <= ข้อมูล.roundCount; r++) ข้อมูล.rounds.push([]);
      keys.forEach(function (k) {
        var คู่ = Object.assign({ key: k }, ข้อมูล.matches[k]);
        ข้อมูล.rounds[คู่.round - 1].push(คู่);
      });
      ข้อมูล.rounds.forEach(function (รอบ) { รอบ.sort(function (a, b) { return a.index - b.index; }); });
      return ข้อมูล;
    } catch (err) {
      console.error(err);
      throw new Error("โหลดทัวนาเมนต์ไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.ลบทัวนาเมนต์(tournamentId) ── (ครูเท่านั้น — rules บังคับ)
  // ลบ battle log ทุกแมตช์ก่อน แล้วค่อยลบตัวทัวนาเมนต์ (แชมป์หายจากกระดานเกียรติยศ/หน้าหลักด้วย)
  window.ลบทัวนาเมนต์ = async function (tournamentId) {
    try {
      var อ้างอิง = window.fsDoc(window.db, "tournaments", tournamentId);
      var ส = await window.fsGetDoc(อ้างอิง);
      if (!ส.exists()) return;
      var ข้อมูล = ส.data();
      var คู่ทั้งหมด = ข้อมูล.matches
        ? Object.keys(ข้อมูล.matches).map(function (k) { return ข้อมูล.matches[k]; })
        : ["semifinal1", "semifinal2", "final"].map(function (k) { return ข้อมูล[k] || {}; });
      for (var i = 0; i < คู่ทั้งหมด.length; i++) {
        if (คู่ทั้งหมด[i].matchId) {
          await window.fsDeleteDoc(window.fsDoc(window.db, "tournaments", tournamentId, "matches", คู่ทั้งหมด[i].matchId));
        }
      }
      await window.fsDeleteDoc(อ้างอิง);
    } catch (err) {
      console.error(err);
      throw new Error("ลบทัวนาเมนต์ไม่สำเร็จ: " + err.message);
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
