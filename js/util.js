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
