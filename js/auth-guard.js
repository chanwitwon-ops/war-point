// ─────────────────────────────────────────────────────────────
// js/auth-guard.js — เฝ้าทุกหน้าที่ต้องล็อกอินก่อนถึงจะใช้ได้
// การบ้านที่ 2 (เทียบสัปดาห์ที่ 7 leaveeasy): ยังไม่ล็อกอิน → เด้งไปหน้า login.html
// ไม่ต้อง include ไฟล์นี้ใน login.html / register.html (ไม่งั้นเด้งวนลูป)
// ─────────────────────────────────────────────────────────────

(function () {
  ถ้าพร้อมแล้วให้ตรวจ();

  // js/firebase.js เป็น module โหลดแยกจากไฟล์นี้ ต้องรอให้มันเชื่อมต่อเสร็จก่อน
  function ถ้าพร้อมแล้วให้ตรวจ() {
    if (window.db) {
      เริ่มตรวจ();
    } else {
      window.addEventListener("firebase-ready", เริ่มตรวจ, { once: true });
    }
  }

  function เริ่มตรวจ() {
    window.fbOnAuthStateChanged(window.auth, async function (user) {
      if (!user) {
        location.href = "login.html";
        return;
      }

      var สแนปช็อต = await window.fsGetDoc(window.fsDoc(window.db, "users", user.uid));
      var ข้อมูลผู้ใช้ = สแนปช็อต.exists() ? สแนปช็อต.data() : { name: user.email, role: "student" };

      window.CURRENT_USER = {
        uid: user.uid,
        email: user.email,
        name: ข้อมูลผู้ใช้.name,
        role: ข้อมูลผู้ใช้.role
      };

      แสดงผู้ใช้ในนำทาง();
      window.dispatchEvent(new Event("auth-ready"));
    });
  }

  var ป้ายบทบาท = { student: "นักเรียน", teacher: "ครู" };

  function แสดงผู้ใช้ในนำทาง() {
    var กล่อง = document.getElementById("navUser");
    if (!กล่อง) return;

    var บทบาท = ป้ายบทบาท[window.CURRENT_USER.role] || window.CURRENT_USER.role;
    กล่อง.innerHTML =
      esc(window.CURRENT_USER.name) + " (" + esc(บทบาท) + ") " +
      '<button type="button" id="ปุ่มออกจากระบบ" class="btn-ghost">ออกจากระบบ</button>';

    document.getElementById("ปุ่มออกจากระบบ").addEventListener("click", function () {
      window.fbSignOut(window.auth).then(function () { location.href = "login.html"; });
    });
  }
})();
