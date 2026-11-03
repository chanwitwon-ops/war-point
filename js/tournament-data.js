// ─────────────────────────────────────────────────────────────
// js/tournament-data.js — ชั้นข้อมูล (Firestore) ของโหมดทัวนาเมนต์แพ้คัดออก
// ตาม docs/01-requirements/01-spec/20261103-08-tournament-bracket-demo.md
//
// ไฟล์นี้ไม่คำนวณผลการต่อสู้เอง — เรียก window.คำนวณผลการต่อสู้ (js/combat-engine.js)
// เท่านั้นเสมอ หน้าที่ของไฟล์นี้คือ อ่าน/เขียน Firestore + ต่อผลที่ engine คืนมา
// เข้ากับโครง bracket เท่านั้น ไม่มี HTML/DOM ในไฟล์นี้ (ui-screens จัดการหน้าจอ)
//
// โครงสร้างเอกสาร:
//   tournaments/{tournamentId} = {
//     createdByTeacherId, createdByTeacherName, createdAt,
//     semifinal1: { slotA, slotB, matchId, winnerSlot },
//     semifinal2: { slotA, slotB, matchId, winnerSlot },
//     final:      { slotA, slotB, matchId, winnerSlot }   // slotA/slotB เริ่มเป็น null
//   }
//   โดย slotA/slotB (เมื่อมีผู้เข้าแข่งขัน) = { studentName, speciesKey, stats, statusAbility }
//   matchId ชี้ไปที่ tournaments/{id}/matches/{matchId} (ถ้ายังไม่คำนวณ = null)
//   winnerSlot = "slotA" | "slotB" | null (null = ยังไม่คำนวณ หรือเสมอจริง รอครูชี้ขาด)
//
//   tournaments/{tournamentId}/matches/{matchId} = battle log เต็มก้อนที่ได้จาก
//   window.คำนวณผลการต่อสู้ โดยตรง (ไม่ตัดทอน) — matchId = tournamentId + "-" + slotKey
//   เพื่อให้ deterministic (คำนวณซ้ำแมตช์เดิมได้ผลเดิมเสมอ ตามสเปก ง.๒ ข้อ 13)
// ─────────────────────────────────────────────────────────────

(function () {
  var SLOT_KEYS = ["semifinal1", "semifinal2", "final"];

  // ── helper: ตัดสำเนาข้อมูลผู้เข้าแข่งขัน 1 ช่อง ให้เหลือเฉพาะ field ที่สเปกกำหนด ──
  function ตัดสำเนาช่อง(ช่อง) {
    return {
      studentName: ช่อง.studentName,
      speciesKey: ช่อง.speciesKey,
      stats: {
        SPD: ช่อง.stats.SPD,
        ATK: ช่อง.stats.ATK,
        ACC: ช่อง.stats.ACC,
        DEF: ช่อง.stats.DEF,
        HP: ช่อง.stats.HP
      },
      statusAbility: ช่อง.statusAbility != null ? ช่อง.statusAbility : null
    };
  }

  function ตรวจสอบคู่(bracketData, key) {
    var คู่ = bracketData && bracketData[key];
    if (!คู่ || !คู่.slotA || !คู่.slotB) {
      throw new Error("ข้อมูล " + key + " ไม่ครบ — ต้องมีผู้เข้าแข่งขันทั้งฝั่ง A และ B");
    }
    ["slotA", "slotB"].forEach(function (ฝั่ง) {
      var ช่อง = คู่[ฝั่ง];
      if (!ช่อง || !ช่อง.studentName || !ช่อง.speciesKey || !ช่อง.stats) {
        throw new Error(key + "." + ฝั่ง + " ข้อมูลไม่ครบ (ต้องมี studentName, speciesKey, stats)");
      }
    });
  }

  // ── helper: แปลงช่อง bracket ให้เป็นรูปแบบ "ฝ่ายต่อสู้" ที่ window.คำนวณผลการต่อสู้ ต้องการ ──
  function แปลงช่องเป็นฝ่ายต่อสู้(ช่อง) {
    return {
      studentId: ช่อง.studentName, // เดโมนี้ตั้งชื่อนักเรียนด้วยมือ ไม่ได้ผูกกับ uid ล็อกอิน
      petName: ช่อง.studentName,
      species: ช่อง.speciesKey,
      stats: ช่อง.stats,
      statusAbility: ช่อง.statusAbility || null,
      item: null // เดโมนี้ไม่ใช้ไอเทมสนับสนุน
    };
  }

  // ── window.สร้างทัวนาเมนต์(bracketData) ──
  // bracketData = { semifinal1: {slotA, slotB}, semifinal2: {slotA, slotB} }
  // (final ไม่ต้องส่งมา — ระบบสร้างเป็น slotA:null, slotB:null เสมอ รอผู้ชนะ semifinal)
  // คืน Promise<string> = tournamentId ที่สร้างใหม่
  window.สร้างทัวนาเมนต์ = async function (bracketData) {
    ตรวจสอบคู่(bracketData, "semifinal1");
    ตรวจสอบคู่(bracketData, "semifinal2");

    var ข้อมูลใหม่ = {
      createdByTeacherId: window.CURRENT_USER ? window.CURRENT_USER.uid : null,
      createdByTeacherName: window.CURRENT_USER ? window.CURRENT_USER.name : null,
      createdAt: เวลาตอนนี้(),
      semifinal1: {
        slotA: ตัดสำเนาช่อง(bracketData.semifinal1.slotA),
        slotB: ตัดสำเนาช่อง(bracketData.semifinal1.slotB),
        matchId: null,
        winnerSlot: null
      },
      semifinal2: {
        slotA: ตัดสำเนาช่อง(bracketData.semifinal2.slotA),
        slotB: ตัดสำเนาช่อง(bracketData.semifinal2.slotB),
        matchId: null,
        winnerSlot: null
      },
      final: { slotA: null, slotB: null, matchId: null, winnerSlot: null }
    };

    try {
      var เอกสารใหม่ = window.fsDoc(window.fsCollection(window.db, "tournaments"));
      await window.fsSetDoc(เอกสารใหม่, ข้อมูลใหม่);
      return เอกสารใหม่.id;
    } catch (err) {
      console.error(err);
      throw new Error("สร้างทัวนาเมนต์ไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.คำนวณแมตช์ของทัวนาเมนต์(tournamentId, slotKey) ──
  // slotKey: "semifinal1" | "semifinal2" | "final"
  // อ่าน slotA/slotB จาก tournament doc, เรียก window.คำนวณผลการต่อสู้, บันทึก battle
  // log เต็มลง tournaments/{id}/matches/{matchId}, อัปเดต winnerSlot ของคู่นั้น และถ้า
  // เป็น semifinal ให้เติมผู้ชนะเข้า final.slotA/slotB อัตโนมัติ
  // คืน Promise ที่ resolve ด้วย battle log object เต็ม (เหมือนที่ window.คำนวณผลการต่อสู้ คืนมา)
  window.คำนวณแมตช์ของทัวนาเมนต์ = async function (tournamentId, slotKey) {
    if (SLOT_KEYS.indexOf(slotKey) === -1) {
      throw new Error('slotKey ไม่ถูกต้อง — ต้องเป็น "semifinal1", "semifinal2" หรือ "final" เท่านั้น');
    }

    var เอกสารอ้างอิง = window.fsDoc(window.db, "tournaments", tournamentId);
    var สแนปช็อต = await window.fsGetDoc(เอกสารอ้างอิง);
    if (!สแนปช็อต.exists()) {
      throw new Error("ไม่พบทัวนาเมนต์นี้ — รหัส: " + tournamentId);
    }

    var ข้อมูลทัวนาเมนต์ = สแนปช็อต.data();
    var คู่แข่งขัน = ข้อมูลทัวนาเมนต์[slotKey];
    if (!คู่แข่งขัน || !คู่แข่งขัน.slotA || !คู่แข่งขัน.slotB) {
      throw new Error(
        slotKey === "final"
          ? "คู่ชิงชนะเลิศยังไม่พร้อม — ต้องรอผลรอบรองชนะเลิศทั้ง 2 คู่ให้เสร็จก่อน"
          : "คู่นี้ยังไม่มีผู้เข้าแข่งขันครบทั้งสองฝั่ง"
      );
    }

    var matchId = tournamentId + "-" + slotKey;

    try {
      var inputข้อมูล = {
        matchId: matchId,
        mode: "knockout",
        sideA: แปลงช่องเป็นฝ่ายต่อสู้(คู่แข่งขัน.slotA),
        sideB: แปลงช่องเป็นฝ่ายต่อสู้(คู่แข่งขัน.slotB)
      };

      // ชั้นคำนวณ (pure, ไม่ใช่ Promise) — ห้าม reimplement สูตรใดๆ ที่นี่
      var บันทึกผล = window.คำนวณผลการต่อสู้(inputข้อมูล);

      await window.fsSetDoc(
        window.fsDoc(window.db, "tournaments", tournamentId, "matches", matchId),
        บันทึกผล
      );

      var winnerSlotKey = null;
      if (บันทึกผล.result.winner === "A") winnerSlotKey = "slotA";
      else if (บันทึกผล.result.winner === "B") winnerSlotKey = "slotB";
      // ผลเสมอจริง (result.reason === "teacher_decides") -> winnerSlotKey เป็น null
      // ตามสเปกหัวข้อ จ. ให้ครูเป็นผู้ชี้ขาดเอง ไม่สุ่มผู้ชนะ — ฟังก์ชันนี้ไม่ตัดสินแทน

      var ค่าที่จะอัปเดต = {};
      ค่าที่จะอัปเดต[slotKey + ".matchId"] = matchId;
      ค่าที่จะอัปเดต[slotKey + ".winnerSlot"] = winnerSlotKey;

      if (winnerSlotKey && (slotKey === "semifinal1" || slotKey === "semifinal2")) {
        var ผู้ชนะ = คู่แข่งขัน[winnerSlotKey];
        var ปลายทาง = slotKey === "semifinal1" ? "final.slotA" : "final.slotB";
        ค่าที่จะอัปเดต[ปลายทาง] = ตัดสำเนาช่อง(ผู้ชนะ);
      }

      await window.fsUpdateDoc(เอกสารอ้างอิง, ค่าที่จะอัปเดต);

      return บันทึกผล;
    } catch (err) {
      console.error(err);
      throw new Error("คำนวณผลแมตช์ไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.โหลดทัวนาเมนต์(tournamentId) ──
  // อ่าน tournament doc กลับมาทั้งก้อน — ถ้าคู่ไหนมี matchId แล้ว แนบ battle log
  // เต็มของคู่นั้นไว้ที่ <slotKey>.matchLog ด้วย (ไม่ต้องคำนวณใหม่ อ่านจาก log เดิม)
  // คืน Promise<object>
  window.โหลดทัวนาเมนต์ = async function (tournamentId) {
    try {
      var สแนปช็อต = await window.fsGetDoc(window.fsDoc(window.db, "tournaments", tournamentId));
      if (!สแนปช็อต.exists()) {
        throw new Error("ไม่พบทัวนาเมนต์นี้ — รหัส: " + tournamentId);
      }

      var ข้อมูล = สแนปช็อต.data();
      ข้อมูล.id = สแนปช็อต.id;

      for (var i = 0; i < SLOT_KEYS.length; i++) {
        var key = SLOT_KEYS[i];
        var คู่ = ข้อมูล[key];
        if (คู่ && คู่.matchId) {
          var สแนปช็อตแมตช์ = await window.fsGetDoc(
            window.fsDoc(window.db, "tournaments", tournamentId, "matches", คู่.matchId)
          );
          คู่.matchLog = สแนปช็อตแมตช์.exists() ? สแนปช็อตแมตช์.data() : null;
        }
      }

      return ข้อมูล;
    } catch (err) {
      console.error(err);
      throw new Error("โหลดทัวนาเมนต์ไม่สำเร็จ: " + err.message);
    }
  };
})();
