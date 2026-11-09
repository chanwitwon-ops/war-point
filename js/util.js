// ─────────────────────────────────────────────────────────────
// js/util.js — ตัวช่วยเล็ก ๆ ที่ทุกหน้าเรียกใช้
// ─────────────────────────────────────────────────────────────

// แปลงข้อความของผู้ใช้ให้ปลอดภัยก่อนเอาไปวางในหน้าเว็บ
// ถ้าไม่ทำ ข้อความที่มีเครื่องหมาย < > จะทำให้หน้าเว็บเพี้ยนได้
function esc(ข้อความ) {
  return String(ข้อความ == null ? "" : ข้อความ)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ป้ายสถานะสี — submitted=เทา, pending_review=เหลือง, graded=เขียว
function ป้ายสถานะ(สถานะ) {
  return '<span class="badge badge-' + esc(สถานะ) + '">' + esc(ชื่อสถานะไทย(สถานะ)) + "</span>";
}

function ชื่อสถานะไทย(สถานะ) {
  if (สถานะ === "submitted") return "ส่งแล้ว";
  if (สถานะ === "pending_review") return "รอครูตรวจ";
  if (สถานะ === "graded") return "ตรวจแล้ว";
  return สถานะ;
}

// อ่านค่าที่ต่อท้าย URL เช่น quiz-attempt-detail.html?id=att001
function ค่าจากURL(ชื่อ) {
  return new URLSearchParams(location.search).get(ชื่อ) || "";
}

// เวลาปัจจุบันในรูปแบบอ่านง่าย เช่น "2026-09-12 16:30"
function เวลาตอนนี้() {
  var d = new Date();
  var สองหลัก = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + สองหลัก(d.getMonth() + 1) + "-" + สองหลัก(d.getDate()) +
         " " + สองหลัก(d.getHours()) + ":" + สองหลัก(d.getMinutes());
}

// ── จำนวนครั้งที่ทำชุดข้อสอบได้ (ครูตั้งต่อชุด — เพิ่ม 2026-11-09) ──
// ชุดที่ยังไม่เคยตั้ง (ไม่มี maxAttempts) ใช้ค่าเริ่มต้น 3 ครั้ง · ช่วงที่ครูตั้งได้ 1–10
// ต้องตรงกับ firestore.rules (quizAttempts create)
var จำนวนครั้งเริ่มต้น = 3;
var จำนวนครั้งสูงสุดที่ตั้งได้ = 10;
function จำนวนครั้งที่ทำได้(ชุดข้อสอบ) {
  var n = ชุดข้อสอบ && ชุดข้อสอบ.maxAttempts;
  return (Number.isInteger(n) && n >= 1 && n <= จำนวนครั้งสูงสุดที่ตั้งได้) ? n : จำนวนครั้งเริ่มต้น;
}

// ── แต้มรวม = คะแนนรอบดีที่สุดของแต่ละชุด รวมกันทุกชุด (เพิ่ม 2026-11-09) ──
// ทำซ้ำได้หลายครั้ง แต่ไม่นับซ้ำ และรอบหลังที่ได้น้อยกว่าไม่ทำให้แต้มลด
// รายการงาน = ข้อมูล quizAttempts ของนักเรียนคนเดียว (เฉพาะที่ graded)
function แต้มจากคะแนนดีที่สุดต่อชุด(รายการงาน) {
  var ดีสุด = {};
  รายการงาน.forEach(function (งาน, i) {
    if (typeof งาน.scoreAwarded !== "number") return;
    var k = งาน.quizSetId ? "ชุด:" + งาน.quizSetId : "ไม่มีชุด:" + i; // ไม่มีรหัสชุด → นับแยกทีละงาน
    if (!(k in ดีสุด) || งาน.scoreAwarded > ดีสุด[k]) ดีสุด[k] = งาน.scoreAwarded;
  });
  return Object.keys(ดีสุด).reduce(function (s, k) { return s + ดีสุด[k]; }, 0);
}
