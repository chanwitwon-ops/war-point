// ─────────────────────────────────────────────────────────────
// js/pet-data.js — ชั้นข้อมูล (Firestore) ของระบบแต้ม + สัตว์เลี้ยง
// ตาม docs/01-requirements/01-spec/20260821-02-pet-points-and-weekly-arena.md
// หัวข้อ ข. ระบบแต้ม และ ซ. เศรษฐกิจแต้มและตารางการแปลงร่าง
//
// ขอบเขตรอบนี้ (ยืนยันกับ user 2026-11-08): ซื้อได้แค่สายพันธุ์เดียวก่อน (Pixie),
// คะแนนสอบแปลงเป็นแต้ม 1:1 — ตัวเลขต้นทุน/สเตตัสทั้งหมดอ่านจาก window.PET_STAGE_*
// (js/pet-config.js) เท่านั้น ห้าม reimplement สูตรคำนวณในไฟล์นี้
//
// ไฟล์นี้ไม่มี HTML/DOM ใดๆ (ui-screens คือ js/pet.js จัดการหน้าจอ) — หน้าที่เดียว
// คือ อ่าน/เขียน Firestore ให้ตรงสัญญาที่ js/pet.js ประกาศ stub ไว้
//
// โครงสร้างเอกสาร pets/{uid}  (uid = Firebase Auth uid ของนักเรียนเจ้าของ):
//   {
//     pet: {                      // null ถ้ายังไม่เคยซื้อไข่ (หรือรีเซ็ตไปแล้ว)
//       speciesKey: "pixie",
//       stage: 0-4,               // ดัชนีตรงกับ PET_STAGE_STATS / PET_STAGE_COST
//       stats: { SPD, ATK, ACC, EVA, DEF, HP },  // ค่าสะสม ณ stage ปัจจุบัน = statsPerStage × (stage+1)
//       statsPerStage: { SPD, ..., HP },  // [เพิ่ม 2026-11-08 สเปก 02 ซ.14] การกระจายต่อขั้นที่สุ่มได้
//                                         // (รวม 50) — ไม่มี field นี้ = สัตว์เลี้ยงก่อนกฎใหม่ ใช้ค่าฐาน Pixie
//       pointsSpent: number       // แต้มที่จ่ายไปแล้วสะสมทั้งหมดของตัวนี้ (ซื้อไข่ + วิวัฒนาการทุกขั้น)
//     } | null,
//     growthHistory: [            // ประวัติ "ชีวิต" ของสัตว์เลี้ยงแต่ละตัว (ซื้อไข่ใหม่ = เพิ่มรายการใหม่)
//       {
//         speciesKey: "pixie",
//         reachedStage: 0-4,      // stage สูงสุดที่เคยไปถึงในชีวิตนี้
//         startedAt: "YYYY-MM-DD HH:mm", // เวลาที่ซื้อไข่ (เวลาตอนนี้() จาก js/util.js)
//         endedAt: "YYYY-MM-DD HH:mm" | null // null = ยังเลี้ยงอยู่ตอนนี้, ไม่ null = ถูกรีเซ็ตไปแล้ว
//       }
//     ]
//   }
//
// pointsAvailable **ไม่ถูกเก็บในเอกสารนี้** — คำนวณสดทุกครั้งที่โหลด เพื่อไม่ให้มีปัญหา
// ข้อมูลเพี้ยน: pointsAvailable = totalPointsEarned (ผลรวม scoreAwarded ของ quizAttempts
// ที่ studentId == uid และ status == "graded") ลบด้วย pet.pointsSpent (0 ถ้ายังไม่มี pet)
//
// **หมายเหตุความเสี่ยงที่พบระหว่างทำ (ไม่ได้แก้เอง เพราะถูกสั่งห้ามแตะ firestore.rules):**
// กฎ match /pets/{uid} ปัจจุบันบังคับ `request.resource.data.pet.stage is int` ทุกครั้งที่
// allow create/update การเขียน pet: null ตอนรีเซ็ต (window.รีเซ็ตสัตว์เลี้ยง ด้านล่าง) จะเข้า
// เงื่อนไข "เข้าถึง .stage ของค่า null" ซึ่งเป็น evaluation error ใน Firestore Rules (CEL)
// — ผลคือกฎนี้น่าจะปฏิเสธการเขียนรีเซ็ตจริงในโปรดักชัน ต้องแก้ firestore.rules ให้ยอมรับ
// กรณี pet == null ด้วย (เช่น `(request.resource.data.pet == null || (...stage...))`) ก่อน
// ขึ้นจริง — รายงานไว้ในหมายเหตุส่งงาน ไม่ได้แก้ไฟล์นั้นเองตามขอบเขตที่ได้รับ
// ─────────────────────────────────────────────────────────────

(function () {
  function copyOf(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }

  function เอกสารอ้างอิงของ(uid) {
    return window.fsDoc(window.db, "pets", uid);
  }

  // อ่าน pets/{uid} แบบดิบ — คืนรูปแบบ normalize แล้วเสมอ (pet: null ถ้าไม่มี, growthHistory: [])
  async function อ่านเอกสารดิบ(uid) {
    var สแนปช็อต = await window.fsGetDoc(เอกสารอ้างอิงของ(uid));
    if (!สแนปช็อต.exists()) {
      return { pet: null, growthHistory: [] };
    }
    var ข้อมูล = สแนปช็อต.data();
    return {
      pet: ข้อมูล.pet != null ? ข้อมูล.pet : null,
      growthHistory: Array.isArray(ข้อมูล.growthHistory) ? ข้อมูล.growthHistory : []
    };
  }

  // ── window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(uid) ──
  // คืน Promise<{ totalPointsEarned, pointsAvailable, pet, growthHistory }>
  window.โหลดข้อมูลแต้มและสัตว์เลี้ยง = async function (uid) {
    try {
      var สแนปช็อตงานที่ตรวจแล้ว = await window.fsGetDocs(
        window.fsQuery(
          window.fsCollection(window.db, "quizAttempts"),
          window.fsWhere("studentId", "==", uid),
          window.fsWhere("status", "==", "graded")
        )
      );

      // [แก้ 2026-11-09] ทำซ้ำได้หลายครั้ง → นับคะแนนรอบดีที่สุดของแต่ละชุด (js/util.js)
      var รายการงาน = [];
      สแนปช็อตงานที่ตรวจแล้ว.forEach(function (เอกสาร) { รายการงาน.push(เอกสาร.data()); });
      var totalPointsEarned = แต้มจากคะแนนดีที่สุดต่อชุด(รายการงาน);

      var ข้อมูลสัตว์เลี้ยง = await อ่านเอกสารดิบ(uid);
      var pointsAvailable = totalPointsEarned - (ข้อมูลสัตว์เลี้ยง.pet ? ข้อมูลสัตว์เลี้ยง.pet.pointsSpent : 0);

      return {
        totalPointsEarned: totalPointsEarned,
        pointsAvailable: pointsAvailable,
        pet: ข้อมูลสัตว์เลี้ยง.pet,
        growthHistory: ข้อมูลสัตว์เลี้ยง.growthHistory
      };
    } catch (err) {
      console.error(err);
      throw new Error("โหลดข้อมูลแต้ม/สัตว์เลี้ยงไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.ซื้อไข่(uid) ──
  window.ซื้อไข่ = async function (uid) {
    var สถานะปัจจุบัน = await window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(uid);

    if (สถานะปัจจุบัน.pet !== null) {
      throw new Error("มีสัตว์เลี้ยงอยู่แล้ว ต้องรีเซ็ตก่อนถึงจะซื้อไข่ใหม่ได้");
    }

    var ต้นทุนไข่ = window.PET_STAGE_COST[0];
    if (สถานะปัจจุบัน.pointsAvailable < ต้นทุนไข่) {
      throw new Error(
        "แต้มไม่พอซื้อไข่ — ต้องการ " + ต้นทุนไข่ + " แต้ม มีแต้มที่ใช้ได้อยู่ " +
        สถานะปัจจุบัน.pointsAvailable + " แต้ม"
      );
    }

    var ต่อขั้น = window.สุ่มการกระจายสเตตัส(); // สเปก 02 ซ.14 — สุ่มครั้งเดียวต่อชีวิต
    var petใหม่ = {
      speciesKey: window.PET_PURCHASABLE_SPECIES_KEY,
      stage: 0,
      statsPerStage: ต่อขั้น,
      stats: window.สเตตัสของขั้น(ต่อขั้น, 0),
      pointsSpent: ต้นทุนไข่
    };

    var growthHistoryใหม่ = สถานะปัจจุบัน.growthHistory.concat([{
      speciesKey: window.PET_PURCHASABLE_SPECIES_KEY,
      reachedStage: 0,
      startedAt: เวลาตอนนี้(),
      endedAt: null
    }]);

    try {
      await window.fsSetDoc(
        เอกสารอ้างอิงของ(uid),
        { pet: petใหม่, growthHistory: growthHistoryใหม่ },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      throw new Error("ซื้อไข่ไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.ซื้อร่างสุดท้าย(uid) ── (สเปก 02 ซ.13 เพิ่ม 2026-11-08)
  // ซื้อร่างสุดท้ายรวดเดียวเมื่อยังไม่มีสัตว์เลี้ยง — ราคา = แต้มสะสมทั้งเส้น (PET_STAGE_CUMULATIVE_COST
  // ของร่างสุดท้าย) ไม่ลด/ไม่เพิ่มราคา, สเตตัส = PET_STAGE_STATS ของร่างสุดท้าย, pointsSpent เท่ากับเดินทีละขั้นครบ
  // ผลลัพธ์จึงเหมือนซื้อไข่แล้ววิวัฒนาการครบทุกขั้นทุกประการ (รีเซ็ตแล้วได้แต้มคืนเต็มตามกฎเดิม)
  window.ซื้อร่างสุดท้าย = async function (uid) {
    var สถานะปัจจุบัน = await window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(uid);

    if (สถานะปัจจุบัน.pet !== null) {
      throw new Error("มีสัตว์เลี้ยงอยู่แล้ว — ใช้ปุ่มวิวัฒนาการต่อ หรือรีเซ็ตก่อนถึงจะซื้อร่างสุดท้ายรวดเดียวได้");
    }

    var ขั้นสุดท้าย = window.PET_STAGE_COST.length - 1;
    var ราคารวม = window.PET_STAGE_CUMULATIVE_COST[ขั้นสุดท้าย];
    if (สถานะปัจจุบัน.pointsAvailable < ราคารวม) {
      throw new Error(
        "แต้มไม่พอซื้อร่างสุดท้าย — ต้องการ " + ราคารวม + " แต้ม มีแต้มที่ใช้ได้อยู่ " +
        สถานะปัจจุบัน.pointsAvailable + " แต้ม (ขาดอีก " + (ราคารวม - สถานะปัจจุบัน.pointsAvailable) + " แต้ม)"
      );
    }

    var ต่อขั้นใหม่ = window.สุ่มการกระจายสเตตัส(); // สเปก 02 ซ.14
    var petใหม่ = {
      speciesKey: window.PET_PURCHASABLE_SPECIES_KEY,
      stage: ขั้นสุดท้าย,
      statsPerStage: ต่อขั้นใหม่,
      stats: window.สเตตัสของขั้น(ต่อขั้นใหม่, ขั้นสุดท้าย),
      pointsSpent: ราคารวม
    };

    var growthHistoryใหม่ = สถานะปัจจุบัน.growthHistory.concat([{
      speciesKey: window.PET_PURCHASABLE_SPECIES_KEY,
      reachedStage: ขั้นสุดท้าย,
      startedAt: เวลาตอนนี้(),
      endedAt: null
    }]);

    try {
      await window.fsSetDoc(
        เอกสารอ้างอิงของ(uid),
        { pet: petใหม่, growthHistory: growthHistoryใหม่ },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      throw new Error("ซื้อร่างสุดท้ายไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.วิวัฒนาการ(uid) ──
  window.วิวัฒนาการ = async function (uid) {
    var สถานะปัจจุบัน = await window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(uid);

    if (!สถานะปัจจุบัน.pet) {
      throw new Error("ยังไม่มีสัตว์เลี้ยง ซื้อไข่ก่อน");
    }
    if (สถานะปัจจุบัน.pet.stage >= 4) {
      throw new Error("สัตว์เลี้ยงถึงร่างสุดท้ายแล้ว");
    }

    var ขั้นถัดไป = สถานะปัจจุบัน.pet.stage + 1;
    var ต้นทุนขั้นถัดไป = window.PET_STAGE_COST[ขั้นถัดไป];

    if (สถานะปัจจุบัน.pointsAvailable < ต้นทุนขั้นถัดไป) {
      var ส่วนต่าง = ต้นทุนขั้นถัดไป - สถานะปัจจุบัน.pointsAvailable;
      throw new Error("แต้มไม่พอให้วิวัฒนาการ — ต้องการอีก " + ส่วนต่าง + " แต้ม");
    }

    // วิวัฒนาการใช้การกระจายเดิมของตัวนี้ (ไม่สุ่มใหม่) — สัตว์เลี้ยงก่อนกฎ ซ.14 ใช้ค่าฐาน Pixie
    var ต่อขั้นเดิม = สถานะปัจจุบัน.pet.statsPerStage || copyOf(window.PET_BASE_PER_STAGE);
    // [2026-11-09] การกระจายที่สุ่มด้วยกติกาเดิม (ผลรวม 50) อาจใช้งบเกินกติกาใหม่ ซึ่ง firestore.rules
    // จะปฏิเสธ — สุ่มใหม่ให้ตามกติกาปัจจุบันแทน (ผลรวมความแข็งแรงยังเท่าเดิม เพราะงบเท่ากันทุกตัว)
    if (!window.ตรวจการกระจาย(ต่อขั้นเดิม)) ต่อขั้นเดิม = window.สุ่มการกระจายสเตตัส();
    var petใหม่ = {
      speciesKey: สถานะปัจจุบัน.pet.speciesKey,
      stage: ขั้นถัดไป,
      statsPerStage: ต่อขั้นเดิม,
      stats: window.สเตตัสของขั้น(ต่อขั้นเดิม, ขั้นถัดไป),
      pointsSpent: สถานะปัจจุบัน.pet.pointsSpent + ต้นทุนขั้นถัดไป
    };

    var growthHistoryใหม่ = สถานะปัจจุบัน.growthHistory.map(function (รายการ) {
      if (รายการ.endedAt == null) {
        return Object.assign({}, รายการ, { reachedStage: ขั้นถัดไป });
      }
      return รายการ;
    });

    try {
      await window.fsUpdateDoc(เอกสารอ้างอิงของ(uid), { pet: petใหม่, growthHistory: growthHistoryใหม่ });
    } catch (err) {
      console.error(err);
      throw new Error("วิวัฒนาการไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.สุ่มสเตตัสใหม่(uid) ── (สเปก 02 ซ.14 เพิ่ม 2026-11-08)
  // สุ่มการกระจายค่าสเตตัสใหม่ ฟรี ไม่จำกัดครั้ง — ผลรวมต่อขั้นเท่าเดิม (50) เปลี่ยนแค่การกระจาย
  // ไม่กระทบทัวนาเมนต์ที่สร้างไปแล้ว (tournament-data คัดลอกสเตตัสไว้ตอนสร้าง)
  // คืน Promise<{ statsPerStage, stats }> ชุดใหม่
  window.สุ่มสเตตัสใหม่ = async function (uid) {
    var สถานะปัจจุบัน = await window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(uid);
    if (!สถานะปัจจุบัน.pet) {
      throw new Error("ยังไม่มีสัตว์เลี้ยง ซื้อไข่หรือซื้อร่างสุดท้ายก่อน แล้วค่อยสุ่มสเตตัส");
    }
    var ต่อขั้น = window.สุ่มการกระจายสเตตัส();
    var petใหม่ = Object.assign({}, สถานะปัจจุบัน.pet, {
      statsPerStage: ต่อขั้น,
      stats: window.สเตตัสของขั้น(ต่อขั้น, สถานะปัจจุบัน.pet.stage)
    });
    try {
      await window.fsUpdateDoc(เอกสารอ้างอิงของ(uid), { pet: petใหม่ });
    } catch (err) {
      console.error(err);
      throw new Error("สุ่มสเตตัสใหม่ไม่สำเร็จ: " + err.message);
    }
    return { statsPerStage: ต่อขั้น, stats: petใหม่.stats };
  };

  // ── window.รีเซ็ตสัตว์เลี้ยง(uid) ──
  window.รีเซ็ตสัตว์เลี้ยง = async function (uid) {
    var สถานะปัจจุบัน = await window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(uid);

    if (!สถานะปัจจุบัน.pet) {
      throw new Error("ไม่มีสัตว์เลี้ยงให้รีเซ็ต");
    }

    var ตอนนี้ = เวลาตอนนี้();
    var growthHistoryใหม่ = สถานะปัจจุบัน.growthHistory.map(function (รายการ) {
      if (รายการ.endedAt == null) {
        return Object.assign({}, รายการ, { endedAt: ตอนนี้ });
      }
      return รายการ;
    });

    try {
      await window.fsUpdateDoc(เอกสารอ้างอิงของ(uid), { pet: null, growthHistory: growthHistoryใหม่ });
    } catch (err) {
      console.error(err);
      throw new Error("รีเซ็ตสัตว์เลี้ยงไม่สำเร็จ: " + err.message);
    }
  };

  // ── window.ดึงสัตว์เลี้ยงของนักเรียน(uid) ──
  // ใช้สำหรับหน้าทัวนาเมนต์ — ดึงแค่ pet ของ uid ที่ระบุ ไม่คำนวณแต้ม
  // คืน Promise<{speciesKey, stage, stats} | null>
  window.ดึงสัตว์เลี้ยงของนักเรียน = async function (uid) {
    try {
      var สแนปช็อต = await window.fsGetDoc(เอกสารอ้างอิงของ(uid));
      if (!สแนปช็อต.exists()) return null;

      var ข้อมูล = สแนปช็อต.data();
      if (!ข้อมูล.pet) return null;

      return {
        speciesKey: ข้อมูล.pet.speciesKey,
        stage: ข้อมูล.pet.stage,
        stats: ข้อมูล.pet.stats
      };
    } catch (err) {
      console.error(err);
      throw new Error("ดึงสัตว์เลี้ยงของนักเรียนไม่สำเร็จ: " + err.message);
    }
  };
})();
