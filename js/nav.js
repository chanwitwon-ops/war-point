// ─────────────────────────────────────────────────────────────
// js/nav.js — แถบเมนูด้านบนที่ใช้ร่วมกันทุกหน้า
// แก้เมนูที่ไฟล์นี้ที่เดียว ทุกหน้าเปลี่ยนตามพร้อมกัน
//
// วิธีใช้: ทุกหน้ามี <div id="nav"></div> ไว้บนสุดของ body
// ─────────────────────────────────────────────────────────────

(function () {
  var เมนู = [
    { href: "quiz-attempts.html", ชื่อ: "รายการส่งงาน" },
    { href: "quiz-sets.html", ชื่อ: "รายการชุดข้อสอบ" },
    { href: "quiz-set-new.html", ชื่อ: "สร้างชุดข้อสอบ (AI)", teacherOnly: true }
  ];

  // ชื่อไฟล์ของหน้าที่กำลังเปิดอยู่ เอาไว้ขีดเส้นใต้เมนูที่ตรงกัน
  var หน้าปัจจุบัน = location.pathname.split("/").pop() || "quiz-attempts.html";

  var html = '<div class="navbar"><span class="brand">🎮 war-point</span>';
  เมนู.forEach(function (m) {
    var active = m.href === หน้าปัจจุบัน ? " active" : "";
    var class์ = (m.teacherOnly ? "nav-teacher-only" : "") + active;
    html += '<a href="' + m.href + '"' + (class์ ? ' class="' + class์.trim() + '"' : "") + ">" + m.ชื่อ + "</a>";
  });
  // ช่องว่างสำหรับแสดงชื่อคนที่ล็อกอินอยู่ (เติมค่าโดย auth-guard.js)
  html += '<span class="nav-user" id="navUser"></span></div>';

  var ที่วาง = document.getElementById("nav");
  if (ที่วาง) ที่วาง.innerHTML = html;

  // เมนูเฉพาะ teacher (เช่น "สร้างชุดข้อสอบ (AI)") ต้องรอรู้บทบาทก่อนถึงจะซ่อนได้
  // (ตอน render ครั้งแรกยังไม่รู้ role — ใช้ auth-ready ที่ auth-guard.js ยิงมาทีหลัง)
  // ต้อง render เมนูทันทีแบบไม่รอ เพราะ auth-guard.js เองก็ต้องการ #navUser
  // อยู่แล้วตอนมันทำงาน (ถ้ารอ auth-ready ก่อน จะทำให้ #navUser ยังไม่มีตอนนั้น)
  window.addEventListener("auth-ready", function () {
    if (window.CURRENT_USER && window.CURRENT_USER.role !== "teacher") {
      document.querySelectorAll(".nav-teacher-only").forEach(function (el) {
        el.classList.add("hidden");
      });
    }
  });
})();
