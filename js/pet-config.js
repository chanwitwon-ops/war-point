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
// [แก้ 2026-11-09 — user เลือก "ค่าสเตตัสมีราคา"] เดิมผลรวมต่อขั้นคงที่ 50 แต่จำลองแล้วพละกำลัง/
// พลังชีวิตคุ้มเกิน (ใครเทลงสองค่านี้ชนะ ~60%, สาย Behemoth ชนะ 80–97%) จึงเปลี่ยนเป็น "งบเท่ากัน":
//   - ราคาต่อแต้ม: ATK และ HP แต้มละ 2.25 · ค่าอื่นแต้มละ 1 (experiments/balance-sim/cost.html)
//   - งบต่อขั้น = งบที่ Pixie ใช้ด้วยค่าเดิม 12/7/8/12/4/7 = 67.5 (Pixie คงตัวเลขเดิม)
//   - สุ่มแล้วต้องใช้งบห่างจาก 67.5 ไม่เกิน 1 (ปัดเป็นจำนวนเต็มแล้วตรงพอดีไม่ได้ทุกกรณี)
//     คิดเป็นจำนวนเต็ม ×4: 4×(SPD+ACC+EVA+DEF) + 9×(ATK+HP) อยู่ในช่วง 266–274 ต่อขั้น
//   - แต่ละค่าต่อขั้นยังอยู่ในช่วง ±30% ของค่าฐาน Pixie: SPD 9–15, ATK 5–9, ACC 6–10, EVA 9–15, DEF 3–5, HP 5–9
//   - สุ่มครั้งเดียวตอนได้สัตว์เลี้ยง แล้วทุกขั้นใช้ค่าต่อขั้นชุดนี้ × (ขั้น+1)
//   - กดสุ่มใหม่ได้ฟรีไม่จำกัด (js/pet-data.js → window.สุ่มสเตตัสใหม่)
// ช่วงและงบเดียวกันนี้ถูกตรวจซ้ำใน firestore.rules (match /pets/{uid}) — แก้ที่นี่ต้องแก้ที่นั่นด้วย
// ─────────────────────────────────────────────────────────────
window.PET_BASE_PER_STAGE = PIXIE_PER_STAGE;
window.PET_STAT_RANDOM_SPREAD = 0.3;
window.PET_STAT_COST = { SPD: 1, ATK: 2.25, ACC: 1, EVA: 1, DEF: 1, HP: 2.25 };

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

// งบที่ใช้ (×4 ให้เป็นจำนวนเต็ม): 4 ต่อแต้มราคา 1 · 9 ต่อแต้มราคา 2.25
window.งบที่ใช้x4 = function (ค่า) {
  return window.PET_STAT_KEYS.reduce(function (s, k) { return s + ค่า[k] * window.PET_STAT_COST[k] * 4; }, 0);
};
window.งบที่ใช้ = function (ค่า) { return window.งบที่ใช้x4(ค่า) / 4; };
window.PET_STAT_BUDGET_PER_STAGE = window.งบที่ใช้(PIXIE_PER_STAGE); // 67.5
window.PET_STAT_BUDGET_TOLERANCE = 1;                                  // ห่างจากงบได้ไม่เกิน ±1 ต่อขั้น

// สุ่มค่าต่อขั้น 6 ค่า (จำนวนเต็ม ในช่วง ใช้งบห่างจาก 67.5 ไม่เกิน 1) — สุ่ม = ฟังก์ชันคืนเลข [0,1) ใส่เองได้ตอนทดสอบ
window.สุ่มการกระจายสเตตัส = function (สุ่ม) {
  สุ่ม = สุ่ม || Math.random;
  var ช่วง = window.PET_STAT_RANGE_PER_STAGE;
  var คีย์ = window.PET_STAT_KEYS;
  var เป้าx4 = window.PET_STAT_BUDGET_PER_STAGE * 4, คลาดx4 = window.PET_STAT_BUDGET_TOLERANCE * 4;
  for (var ลองใหม่ = 0; ลองใหม่ < 50; ลองใหม่++) {
    var ผล = {};
    คีย์.forEach(function (k) { ผล[k] = ช่วง[k].min + Math.floor(สุ่ม() * (ช่วง[k].max - ช่วง[k].min + 1)); });
    // ปรับทีละ 1 แต้มที่ค่าซึ่งยังขยับได้ จนงบเข้าเกณฑ์ (ช่วงงบรวม 49.5–85.5 ครอบ 67.5 เสมอ)
    for (var รอบ = 0; รอบ < 300; รอบ++) {
      var ต่าง = เป้าx4 - window.งบที่ใช้x4(ผล);
      if (Math.abs(ต่าง) <= คลาดx4) return ผล;
      var ขยับได้ = คีย์.filter(function (k) { return ต่าง > 0 ? ผล[k] < ช่วง[k].max : ผล[k] > ช่วง[k].min; });
      if (!ขยับได้.length) break;
      var เลือก = ขยับได้[Math.floor(สุ่ม() * ขยับได้.length)];
      ผล[เลือก] += ต่าง > 0 ? 1 : -1;
    }
  }
  return Object.assign({}, PIXIE_PER_STAGE); // กันพลาด (ไม่ควรเกิด): ใช้ค่าฐาน Pixie ซึ่งถูกกติกาแน่นอน
};

// ตรวจว่าการกระจายต่อขั้นถูกกติกา: ครบ 6 ค่า เป็นจำนวนเต็ม อยู่ในช่วง และใช้งบ 67.5 ± 1 (กติกาเดียวกับ firestore.rules)
window.ตรวจการกระจาย = function (ค่าต่อขั้น) {
  if (!ค่าต่อขั้น) return false;
  var ผ่าน = window.PET_STAT_KEYS.every(function (k) {
    var v = ค่าต่อขั้น[k], ช่วง = window.PET_STAT_RANGE_PER_STAGE[k];
    return Number.isInteger(v) && v >= ช่วง.min && v <= ช่วง.max;
  });
  return ผ่าน && Math.abs(window.งบที่ใช้x4(ค่าต่อขั้น) - window.PET_STAT_BUDGET_PER_STAGE * 4) <= window.PET_STAT_BUDGET_TOLERANCE * 4;
};

// ค่าสเตตัสของขั้น = ค่าต่อขั้น × (ขั้น+1) — ไม่ส่งค่าต่อขั้นมา = ใช้ค่าฐาน Pixie (สัตว์เลี้ยงก่อนมีกฎนี้)
window.สเตตัสของขั้น = function (ค่าต่อขั้น, ขั้น) {
  var ต่อขั้น = ค่าต่อขั้น || PIXIE_PER_STAGE;
  var ผล = {};
  window.PET_STAT_KEYS.forEach(function (k) { ผล[k] = ต่อขั้น[k] * (ขั้น + 1); });
  return ผล;
};
