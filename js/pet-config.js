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
