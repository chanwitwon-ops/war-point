// ─────────────────────────────────────────────────────────────
// js/nav.js — แถบเมนูด้านบนที่ใช้ร่วมกันทุกหน้า
// แก้เมนูที่ไฟล์นี้ที่เดียว ทุกหน้าเปลี่ยนตามพร้อมกัน
//
// วิธีใช้: ทุกหน้ามี <div id="nav"></div> ไว้บนสุดของ body
// ─────────────────────────────────────────────────────────────

(function () {
  var เมนู = [
    { href: "home.html", ชื่อ: "หน้าหลัก" },
    { href: "quiz-attempts.html", ชื่อ: "รายการส่งงาน" },
    { href: "quiz-sets.html", ชื่อ: "รายการชุดข้อสอบ" },
    { href: "quiz-set-new.html", ชื่อ: "สร้างชุดข้อสอบ", teacherOnly: true },
    { href: "tournament.html", ชื่อ: "ทัวนาเมนต์" },
    { href: "pet.html", ชื่อ: "สัตว์เลี้ยงของฉัน", studentOnly: true }
  ];

  // ชื่อไฟล์ของหน้าที่กำลังเปิดอยู่ เอาไว้ขีดเส้นใต้เมนูที่ตรงกัน
  var หน้าปัจจุบัน = location.pathname.split("/").pop() || "home.html";

  // แบรนด์เป็นลิงก์กลับหน้าหลักด้วย
  var html = '<div class="navbar"><a class="brand" href="home.html">🎮 war-point</a>';
  เมนู.forEach(function (m) {
    var active = m.href === หน้าปัจจุบัน ? " active" : "";
    var class์ = (m.teacherOnly ? "nav-teacher-only" : "") + (m.studentOnly ? "nav-student-only" : "") + active;
    html += '<a href="' + m.href + '"' + (class์ ? ' class="' + class์.trim() + '"' : "") + ">" + m.ชื่อ + "</a>";
  });
  // ช่องว่างสำหรับแสดงชื่อคนที่ล็อกอินอยู่ (เติมค่าโดย auth-guard.js)
  html += '<span class="nav-user" id="navUser"></span></div>';

  var ที่วาง = document.getElementById("nav");
  if (ที่วาง) ที่วาง.innerHTML = html;

  // เมนูเฉพาะ teacher (เช่น "สร้างชุดข้อสอบ") ต้องรอรู้บทบาทก่อนถึงจะซ่อนได้
  // (ตอน render ครั้งแรกยังไม่รู้ role — ใช้ auth-ready ที่ auth-guard.js ยิงมาทีหลัง)
  // ต้อง render เมนูทันทีแบบไม่รอ เพราะ auth-guard.js เองก็ต้องการ #navUser
  // อยู่แล้วตอนมันทำงาน (ถ้ารอ auth-ready ก่อน จะทำให้ #navUser ยังไม่มีตอนนั้น)
  window.addEventListener("auth-ready", function () {
    if (window.CURRENT_USER && window.CURRENT_USER.role !== "teacher") {
      document.querySelectorAll(".nav-teacher-only").forEach(function (el) {
        el.classList.add("hidden");
      });
    }
    // เมนูเฉพาะนักเรียน (เช่น "สัตว์เลี้ยงของฉัน") ซ่อนจากครู
    if (window.CURRENT_USER && window.CURRENT_USER.role !== "student") {
      document.querySelectorAll(".nav-student-only").forEach(function (el) {
        el.classList.add("hidden");
      });
    }
  });
})();
