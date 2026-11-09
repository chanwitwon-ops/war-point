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
      // [เพิ่ม 2026-11-09] โหลด Firebase SDK จาก gstatic ไม่ได้ (เน็ตหลุด/เครือข่ายบล็อก) → firebase-ready
      // ไม่มีวันมา หน้าจะค้าง — รอ 15 วินาทีแล้วขึ้นกล่องเตือน + ปุ่มลองใหม่
      setTimeout(function () { if (!window.db) แสดงเชื่อมต่อไม่สำเร็จ(); }, 15000);
    }
  }

  function เริ่มตรวจ() {
    window.fbOnAuthStateChanged(window.auth, async function (user) {
      if (!user) {
        location.href = "login.html";
        return;
      }

      // [แก้ 2026-11-09] เดิมไม่ดัก error — เน็ตสะดุดตรงนี้หน้าจะค้าง "กำลังโหลด…" เงียบๆ
      // ตอนนี้ขึ้นกล่องเตือนพร้อมปุ่ม "ลองใหม่" แทน (ไม่ส่ง auth-ready เพราะยังไม่รู้บทบาท)
      var สแนปช็อต;
      try {
        สแนปช็อต = await window.fsGetDoc(window.fsDoc(window.db, "users", user.uid));
      } catch (err) {
        console.error(err);
        แสดงเชื่อมต่อไม่สำเร็จ();
        return;
      }
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

  function แสดงเชื่อมต่อไม่สำเร็จ() {
    if (document.getElementById("กล่องเชื่อมต่อไม่สำเร็จ")) return;
    var กล่อง = document.createElement("div");
    กล่อง.id = "กล่องเชื่อมต่อไม่สำเร็จ";
    กล่อง.className = "alert alert-error";
    กล่อง.setAttribute("role", "alert");
    กล่อง.innerHTML =
      "⚠️ เชื่อมต่อระบบไม่สำเร็จ — ตรวจอินเทอร์เน็ตแล้วกดลองใหม่" +
      '<div class="btn-row"><button type="button" class="btn-ok" id="ปุ่มลองเชื่อมต่อใหม่">ลองใหม่</button></div>';
    var ที่วาง = document.querySelector(".container") || document.body;
    ที่วาง.insertBefore(กล่อง, ที่วาง.firstChild);
    document.getElementById("ปุ่มลองเชื่อมต่อใหม่").addEventListener("click", function () { location.reload(); });
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
