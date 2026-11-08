// ─────────────────────────────────────────────────────────────
// js/pet-config.js — ค่าคงที่ของระบบแต้ม/สัตว์เลี้ยง ตาม
// docs/01-requirements/01-spec/20260821-02-pet-points-and-weekly-arena.md หัวข้อ ซ.
//
// ขอบเขต (ยืนยันกับ user): ซื้อได้แค่สายพันธุ์เดียวก่อน (Pixie), คะแนนสอบแปลงเป็นแต้ม 1:1
//
// [แก้ 2026-11-08] ค่าสเตตัสเป็น 6 ค่าตามกลไก ง.๑ ของ war-point เอง (ไม่ใช้ชุด
// SPD/ATK/ACC/DEF/HP ที่พอร์ตมาจาก project_warpoint อีกต่อไป) — แยก "ค่าหลบหลีก" ออกจาก
// ความเร็ว และ HP เป็นค่าสเตตัสที่ 6 ในงบ +50 ต่อขั้น ตามที่ user เลือก
// การกระจายของ Pixie ("ภูติว่องไว") user เลือกเอง: ต่อขั้น SPD12 ATK7 ACC8 EVA12 DEF4 HP7 = 50
// ไม่มีพลังพิเศษ/สถานะผิดปกติในรอบนี้ (user ตัดสินใจ — หัวข้อ ช. ยังเป็น Open Question)
// ─────────────────────────────────────────────────────────────

window.PET_STAT_KEYS = ["SPD", "ATK", "ACC", "EVA", "DEF", "HP"];

window.PET_STAT_LABELS_TH = {
  SPD: "ความเร็ว",
  ATK: "พละกำลัง",
  ACC: "ความแม่นยำ",
  EVA: "ค่าหลบหลีก",
  DEF: "ค่าพลังป้องกัน",
  HP: "พลังชีวิต"
};

window.PET_SPECIES_LABELS = { pixie: "Pixie" };

// ต้นทุนแต้ม "จ่ายเพิ่ม" ต่อขั้น (ไม่ใช่ยอดสะสม) — ดัชนี 0 = ซื้อไข่, 1-4 = ร่างที่ 1-4
window.PET_STAGE_COST = [1, 5, 10, 15, 20]; // สะสม: 1, 6, 16, 31, 51

// แต้มสเตตัส +50 ที่ Pixie ได้ทุกขั้น แตกลง 6 ค่า (รวม 50 พอดี)
var PIXIE_PER_STAGE = { SPD: 12, ATK: 7, ACC: 8, EVA: 12, DEF: 4, HP: 7 };

// ค่าสเตตัสสะสม ณ แต่ละขั้น = (ดัชนี+1) × PIXIE_PER_STAGE — รวมทุกขั้นได้ 50 × (ดัชนี+1)
window.PET_STAGE_STATS = [0, 1, 2, 3, 4].map(function (ขั้น) {
  var ผล = {};
  window.PET_STAT_KEYS.forEach(function (k) { ผล[k] = PIXIE_PER_STAGE[k] * (ขั้น + 1); });
  return ผล;
});

window.PET_STAGE_LABELS = ["ไข่", "ร่างที่ 1", "ร่างที่ 2", "ร่างที่ 3", "ร่างที่ 4 (ร่างสุดท้าย)"];

window.PET_PURCHASABLE_SPECIES_KEY = "pixie";

window.PET_STAGE_CUMULATIVE_COST = (function () {
  var สะสม = 0;
  return window.PET_STAGE_COST.map(function (c) { สะสม += c; return สะสม; });
})();

// ─────────────────────────────────────────────────────────────
// สุ่มการกระจายค่าสเตตัส — สเปก 02 หัวข้อ ซ.14 (user ยืนยัน 2026-11-08)
//   - ผลรวมต่อขั้นคงที่ 50 (ร่างสุดท้ายรวม 250 เท่ากันทุกคน) สุ่มแค่การกระจาย
//   - แต่ละค่าต่อขั้นอยู่ในช่วง ±30% ของค่าฐาน Pixie (ปัดเข้าในเป็นจำนวนเต็ม):
//     SPD 9–15, ATK 5–9, ACC 6–10, EVA 9–15, DEF 3–5, HP 5–9
//   - สุ่มครั้งเดียวตอนได้สัตว์เลี้ยง แล้วทุกขั้นใช้ค่าต่อขั้นชุดนี้ × (ขั้น+1)
//   - กดสุ่มใหม่ได้ฟรีไม่จำกัด (js/pet-data.js → window.สุ่มสเตตัสใหม่)
// ช่วงเดียวกันนี้ถูกตรวจซ้ำใน firestore.rules (match /pets/{uid}) — แก้ที่นี่ต้องแก้ที่นั่นด้วย
// ─────────────────────────────────────────────────────────────
window.PET_STAT_POINTS_PER_STAGE = 50;
window.PET_BASE_PER_STAGE = PIXIE_PER_STAGE;
window.PET_STAT_RANDOM_SPREAD = 0.3;

window.PET_STAT_RANGE_PER_STAGE = (function () {
  var ช่วง = {};
  window.PET_STAT_KEYS.forEach(function (k) {
    var ฐาน = PIXIE_PER_STAGE[k];
    // ปัดเข้าใน: ต่ำสุดปัดขึ้น สูงสุดปัดลง (กันเศษทศนิยมลอย เช่น 12×1.3 = 15.600000000000001)
    ช่วง[k] = {
      min: Math.ceil(+(ฐาน * (1 - window.PET_STAT_RANDOM_SPREAD)).toFixed(6)),
      max: Math.floor(+(ฐาน * (1 + window.PET_STAT_RANDOM_SPREAD)).toFixed(6))
    };
  });
  return ช่วง;
})();

// สุ่มค่าต่อขั้น 6 ค่า (จำนวนเต็ม ในช่วง ผลรวม 50 พอดี) — สุ่ม = ฟังก์ชันคืนเลข [0,1) ใส่เองได้ตอนทดสอบ
window.สุ่มการกระจายสเตตัส = function (สุ่ม) {
  สุ่ม = สุ่ม || Math.random;
  var ช่วง = window.PET_STAT_RANGE_PER_STAGE;
  var คีย์ = window.PET_STAT_KEYS;
  var ผล = {};
  var รวม = 0;
  คีย์.forEach(function (k) {
    ผล[k] = ช่วง[k].min + Math.floor(สุ่ม() * (ช่วง[k].max - ช่วง[k].min + 1));
    รวม += ผล[k];
  });
  // ปรับทีละ 1 แต้มที่ค่าซึ่งยังขยับได้ จนผลรวมเท่าเป้า (ช่วงรวม 37–63 ครอบ 50 เสมอ จึงจบแน่นอน)
  var ส่วนต่าง = window.PET_STAT_POINTS_PER_STAGE - รวม;
  while (ส่วนต่าง !== 0) {
    var ขยับได้ = คีย์.filter(function (k) {
      return ส่วนต่าง > 0 ? ผล[k] < ช่วง[k].max : ผล[k] > ช่วง[k].min;
    });
    var เลือก = ขยับได้[Math.floor(สุ่ม() * ขยับได้.length)];
    ผล[เลือก] += ส่วนต่าง > 0 ? 1 : -1;
    ส่วนต่าง += ส่วนต่าง > 0 ? -1 : 1;
  }
  return ผล;
};

// ตรวจว่าการกระจายต่อขั้นถูกกติกา: ครบ 6 ค่า เป็นจำนวนเต็ม อยู่ในช่วง และรวม 50 (กติกาเดียวกับ firestore.rules)
window.ตรวจการกระจาย = function (ค่าต่อขั้น) {
  if (!ค่าต่อขั้น) return false;
  var รวม = 0;
  var ผ่าน = window.PET_STAT_KEYS.every(function (k) {
    var v = ค่าต่อขั้น[k], ช่วง = window.PET_STAT_RANGE_PER_STAGE[k];
    รวม += v;
    return Number.isInteger(v) && v >= ช่วง.min && v <= ช่วง.max;
  });
  return ผ่าน && รวม === window.PET_STAT_POINTS_PER_STAGE;
};

// ค่าสเตตัสของขั้น = ค่าต่อขั้น × (ขั้น+1) — ไม่ส่งค่าต่อขั้นมา = ใช้ค่าฐาน Pixie (สัตว์เลี้ยงก่อนมีกฎนี้)
window.สเตตัสของขั้น = function (ค่าต่อขั้น, ขั้น) {
  var ต่อขั้น = ค่าต่อขั้น || PIXIE_PER_STAGE;
  var ผล = {};
  window.PET_STAT_KEYS.forEach(function (k) { ผล[k] = ต่อขั้น[k] * (ขั้น + 1); });
  return ผล;
};
