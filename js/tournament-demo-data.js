// ─────────────────────────────────────────────────────────────
// js/tournament-demo-data.js — ค่าตั้งต้นของเดโมทัวนาเมนต์ 18 ธ.ค. 2026
// ตาม docs/01-requirements/01-spec/20261103-08-tournament-bracket-demo.md
//
// **ตัวเลขทั้งหมดในไฟล์นี้เป็นค่า manual สำหรับเดโมเท่านั้น** (ตาม Open Question
// ข้อ 3 ของสเปก 08) ไม่ใช่ค่าที่ผ่าน simulation จริง และไม่ใช่ตารางสเตตัสประจำ
// สายพันธุ์แบบถาวรของระบบ pet/growth เต็มรูปแบบ — งบรวมตั้งไว้ที่ 250 ให้ตรงกับ
// ค่ากลาง 50/ค่า ตามสเปก ง.๒ เท่านั้น ห้ามอ้างว่าเป็นค่าทางการของสายพันธุ์
//
// สถานะประจำตัว (statusAbility) ที่กำหนดให้แต่ละตัวในไฟล์นี้ก็เป็นการ "เลือกเพื่อ
// ให้เดโมมีสีสัน" เท่านั้น ยังไม่ใช่การปิด Open Question เรื่อง "สายพันธุ์ไหนได้
// พลังพิเศษอะไร" ของเอกสาร 02 หัวข้อ ช.
// ─────────────────────────────────────────────────────────────

window.TOURNAMENT_DEMO_SPECIES = {
  pixie: {
    label: "Pixie",
    stats: { SPD: 70, ATK: 40, ACC: 60, DEF: 30, HP: 50 }, // รวม 250
    statusAbility: "charm",
    animationStatus: "ready" // มีคลิปจริงแล้ว (ยัง 2/5 ท่ารอเปลี่ยนตาม README ของ experiments/battle-animation-test)
  },
  behemoth: {
    label: "Behemoth",
    stats: { SPD: 30, ATK: 60, ACC: 40, DEF: 80, HP: 40 }, // รวม 250
    statusAbility: "paralyze",
    animationStatus: "pending" // ยังไม่มีคลิป — ใช้ placeholder ไปก่อน
  },
  cannonTurtle: {
    label: "เต่าปืนใหญ่",
    stats: { SPD: 25, ATK: 70, ACC: 65, DEF: 50, HP: 40 }, // รวม 250
    statusAbility: "bleed",
    animationStatus: "pending"
  },
  dragon: {
    label: "มังกร",
    stats: { SPD: 45, ATK: 75, ACC: 45, DEF: 35, HP: 50 }, // รวม 250
    statusAbility: "burn",
    animationStatus: "pending"
  }
};

// โครงร่าง bracket เริ่มต้น — ให้หน้าจัดการทัวนาเมนต์กรอกชื่อนักเรียนจริง + เลือกสายพันธุ์ทับ placeholder นี้
window.TOURNAMENT_DEMO_BRACKET_TEMPLATE = {
  semifinal1: { slotA: { studentName: "", speciesKey: "pixie" }, slotB: { studentName: "", speciesKey: "behemoth" } },
  semifinal2: { slotA: { studentName: "", speciesKey: "cannonTurtle" }, slotB: { studentName: "", speciesKey: "dragon" } },
  final: { slotA: null, slotB: null } // เติมอัตโนมัติจากผู้ชนะ semifinal1/2
};
