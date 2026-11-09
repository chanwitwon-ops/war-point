// ─────────────────────────────────────────────────────────────
// js/leaderboard-data.js — ชั้นข้อมูลของกระดานเกียรติยศ (Leaderboard) บนหน้าแรกทัวนาเมนต์
// ตาม docs/01-requirements/01-spec/20261108-09-leaderboard.md
//
// ส่วนที่ 1 — คะแนนสูงสุด "ครึ่งบนของห้อง":
//   - คะแนน = ผลรวม scoreAwarded ของ quizAttempts ที่ status == "graded" เท่านั้น
//     (= แต้มที่ได้รับทั้งหมด ไม่หักแต้มที่ใช้ซื้อ/วิวัฒนาการสัตว์) ไม่มีช่องทางให้ครูเพิ่มแต้มเอง
//   - ครึ่งบน = ปัดขึ้น (31 คน → 16), คนคะแนนเท่ากับคนสุดท้ายในครึ่งบนขึ้นโชว์ทุกคน,
//     คนคะแนน 0 ถูกนับเป็นสมาชิกห้องตอนหาครึ่งแต่ไม่ขึ้นโชว์
//   - Gap G-LB-01: นักเรียนอ่าน quizAttempts ของคนอื่นไม่ได้ (ถูกต้องแล้ว) จึงให้ "ครู" เป็นคน
//     คำนวณแล้วบันทึกผลสรุปลง leaderboard/scores (rules: ทุกคนที่ล็อกอินอ่านได้ เขียนได้เฉพาะครู)
//     เก็บ **เฉพาะคนที่ขึ้นโชว์** — คนครึ่งล่างไม่มีชื่อ/คะแนนในเอกสารนี้เลย จึงไม่หลุดผ่าน DevTools
//     แต่ละคนเก็บ attemptIds ไว้ ตรวจย้อนได้ว่าคะแนนมาจากผลสอบชุดไหน
//   - ผลสรุปอัปเดตเมื่อครูเปิดหน้าแรกทัวนาเมนต์ และหลังครูตรวจงาน (quiz-attempt-detail.js)
//     แบบทดสอบปรนัยที่ตรวจอัตโนมัติตอนนักเรียนส่ง จะขึ้นกระดานเมื่อครูเปิดหน้าใดหน้าหนึ่งข้างต้นครั้งถัดไป
//
// ส่วนที่ 2 — แชมป์รายสัปดาห์: อ่านจาก tournaments (อ่านได้ทุกคนที่ล็อกอินอยู่แล้ว) ไม่เก็บซ้ำ
//
// ── สัญญา (contract) ──
// window.เลือกครึ่งบน([{uid, nickname, totalScore, attemptIds}]) → [{rank, uid, nickname, totalScore, attemptIds}]
//      ฟังก์ชันบริสุทธิ์ (ไม่แตะ Firestore) — แยกออกมาให้ทดสอบกฎขอบได้ตรงๆ
// window.คำนวณและบันทึกกระดานคะแนน() → Promise<{entries, classSize, computedAt}>   (ครูเท่านั้น)
// window.โหลดกระดานคะแนน() → Promise<{entries, classSize, computedAt} | null>
// window.โหลดทำเนียบแชมป์() → Promise<[{weekStart, weekLabel, champions:[{tournamentId, createdAt,
//      championName, speciesKey, stage, decidedByTeacher}]}]> เรียงสัปดาห์ใหม่สุดก่อน
// reject ด้วย Error ที่ .message เป็นภาษาไทย
// ─────────────────────────────────────────────────────────────

(function () {
  function เอกสารกระดาน() {
    return window.fsDoc(window.db, "leaderboard", "scores");
  }

  // ── ฟังก์ชันบริสุทธิ์: เลือกคนที่ขึ้นโชว์ ──
  window.เลือกครึ่งบน = function (นักเรียนทั้งหมด) {
    var รายการ = (นักเรียนทั้งหมด || []).slice().sort(function (a, b) {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return String(a.nickname || "").localeCompare(String(b.nickname || ""), "th");
    });
    if (รายการ.length === 0) return [];

    var จำนวนครึ่ง = Math.ceil(รายการ.length / 2);          // นับคนคะแนน 0 ด้วย
    var เส้นตัด = รายการ[จำนวนครึ่ง - 1].totalScore;           // คะแนนของคนสุดท้ายในครึ่งบน

    var ผล = [];
    var อันดับก่อนหน้า = 0;
    var คะแนนก่อนหน้า = null;
    รายการ.forEach(function (น, i) {
      if (น.totalScore < เส้นตัด || น.totalScore <= 0) return; // ต่ำกว่าเส้น หรือยังไม่มีคะแนน → ไม่โชว์
      var อันดับ = น.totalScore === คะแนนก่อนหน้า ? อันดับก่อนหน้า : i + 1; // คะแนนเท่ากันได้อันดับเดียวกัน
      อันดับก่อนหน้า = อันดับ;
      คะแนนก่อนหน้า = น.totalScore;
      ผล.push({
        rank: อันดับ,
        uid: น.uid,
        nickname: น.nickname,
        totalScore: น.totalScore,
        attemptIds: (น.attemptIds || []).slice()
      });
    });
    return ผล;
  };

  // ── ครูคำนวณจากข้อมูลจริงแล้วบันทึกผลสรุป ──
  window.คำนวณและบันทึกกระดานคะแนน = async function () {
    if (!window.CURRENT_USER || window.CURRENT_USER.role !== "teacher") {
      throw new Error("เฉพาะครูเท่านั้นที่อัปเดตกระดานคะแนนได้");
    }
    try {
      var ผู้ใช้ = await window.fsGetDocs(
        window.fsQuery(window.fsCollection(window.db, "users"), window.fsWhere("role", "==", "student"))
      );
      var ตามuid = {};
      ผู้ใช้.forEach(function (d) {
        var ข้อมูล = d.data();
        ตามuid[d.id] = { uid: d.id, nickname: ข้อมูล.name || "ไม่ระบุชื่อ", totalScore: 0, attemptIds: [], งาน: [] };
      });

      var งาน = await window.fsGetDocs(
        window.fsQuery(window.fsCollection(window.db, "quizAttempts"), window.fsWhere("status", "==", "graded"))
      );
      งาน.forEach(function (d) {
        var ข้อมูล = d.data();
        var น = ตามuid[ข้อมูล.studentId];
        if (!น || typeof ข้อมูล.scoreAwarded !== "number") return; // ไม่ใช่นักเรียนในห้อง หรือยังไม่มีคะแนน
        น.งาน.push(ข้อมูล);
        น.attemptIds.push(d.id);
      });

      // [แก้ 2026-11-09] ทำซ้ำได้หลายครั้ง → คะแนนรอบดีที่สุดของแต่ละชุด (ตรงกับแต้มใน js/pet-data.js)
      var ทั้งห้อง = Object.keys(ตามuid).map(function (k) {
        var น = ตามuid[k];
        น.totalScore = แต้มจากคะแนนดีที่สุดต่อชุด(น.งาน);
        delete น.งาน;
        return น;
      });
      var ผลสรุป = {
        entries: window.เลือกครึ่งบน(ทั้งห้อง),
        classSize: ทั้งห้อง.length,
        computedAt: เวลาตอนนี้(),
        computedByTeacherName: window.CURRENT_USER.name || null
      };
      await window.fsSetDoc(เอกสารกระดาน(), ผลสรุป);
      return ผลสรุป;
    } catch (err) {
      console.error(err);
      throw new Error("อัปเดตกระดานคะแนนไม่สำเร็จ: " + err.message);
    }
  };

  window.โหลดกระดานคะแนน = async function () {
    try {
      var สแนปช็อต = await window.fsGetDoc(เอกสารกระดาน());
      if (!สแนปช็อต.exists()) return null;
      var ข้อมูล = สแนปช็อต.data();
      return {
        entries: Array.isArray(ข้อมูล.entries) ? ข้อมูล.entries : [],
        classSize: ข้อมูล.classSize || 0,
        computedAt: ข้อมูล.computedAt || null
      };
    } catch (err) {
      console.error(err);
      throw new Error("โหลดกระดานคะแนนไม่สำเร็จ: " + err.message);
    }
  };

  // ── แชมป์รายสัปดาห์ ──
  var ชื่อเดือน = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

  // "YYYY-MM-DD HH:mm" → วันจันทร์ของสัปดาห์นั้น (เวลาท้องถิ่น) หรือ null ถ้าอ่านไม่ออก
  function วันจันทร์ของ(ข้อความเวลา) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ข้อความเวลา || ""));
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var ถอย = (d.getDay() + 6) % 7; // จันทร์ = 0
    d.setDate(d.getDate() - ถอย);
    return d;
  }

  function รูปแบบวัน(d, ใส่ปี) {
    return d.getDate() + " " + ชื่อเดือน[d.getMonth()] + (ใส่ปี ? " " + (d.getFullYear() + 543) : "");
  }

  function ป้ายสัปดาห์(จันทร์) {
    var อาทิตย์ = new Date(จันทร์.getFullYear(), จันทร์.getMonth(), จันทร์.getDate() + 6);
    return รูปแบบวัน(จันทร์, จันทร์.getFullYear() !== อาทิตย์.getFullYear()) + " – " + รูปแบบวัน(อาทิตย์, true);
  }

  function รหัสวัน(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  window.โหลดทำเนียบแชมป์ = async function () {
    try {
      var ผล = await window.fsGetDocs(
        window.fsQuery(window.fsCollection(window.db, "tournaments"), window.fsOrderBy("createdAt", "desc"))
      );
      var ตามสัปดาห์ = {};
      ผล.forEach(function (d) {
        var ข้อมูล = d.data();
        var f = ข้อมูล.final;
        if (!f || (f.winnerSlot !== "slotA" && f.winnerSlot !== "slotB") || !f[f.winnerSlot]) return; // ยังไม่มีแชมป์
        var จันทร์ = วันจันทร์ของ(ข้อมูล.createdAt);
        if (!จันทร์) return;
        var แชมป์ = f[f.winnerSlot];
        var คีย์ = รหัสวัน(จันทร์);
        if (!ตามสัปดาห์[คีย์]) {
          ตามสัปดาห์[คีย์] = { weekStart: คีย์, weekLabel: ป้ายสัปดาห์(จันทร์), champions: [] };
        }
        ตามสัปดาห์[คีย์].champions.push({
          tournamentId: d.id,
          createdAt: ข้อมูล.createdAt,
          championName: แชมป์.studentName || "ไม่ระบุชื่อ",
          speciesKey: แชมป์.speciesKey || null,
          stage: typeof แชมป์.stage === "number" ? แชมป์.stage : null,
          decidedByTeacher: f.decidedByTeacher === true
        });
      });
      return Object.keys(ตามสัปดาห์).sort().reverse().map(function (k) { return ตามสัปดาห์[k]; });
    } catch (err) {
      console.error(err);
      throw new Error("โหลดทำเนียบแชมป์ไม่สำเร็จ: " + err.message);
    }
  };
})();
