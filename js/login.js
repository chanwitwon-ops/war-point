// ─────────────────────────────────────────────────────────────
// js/login.js — หน้าเข้าสู่ระบบ
// ─────────────────────────────────────────────────────────────

(function () {
  var ฟอร์ม = document.getElementById("ฟอร์มล็อกอิน");
  var กล่องเตือน = document.getElementById("ข้อความเตือน");
  var ปุ่มล็อกอิน = document.getElementById("ปุ่มล็อกอิน");

  ฟอร์ม.addEventListener("submit", function (e) {
    e.preventDefault();

    var email = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;

    if (!email || !password) {
      เตือน("กรอกอีเมลและรหัสผ่านให้ครบ");
      return;
    }

    ถ้าพร้อมแล้วให้เข้าสู่ระบบ(email, password);
  });

  function ถ้าพร้อมแล้วให้เข้าสู่ระบบ(email, password) {
    if (window.auth) {
      เข้าสู่ระบบ(email, password);
    } else {
      window.addEventListener("firebase-ready", function () { เข้าสู่ระบบ(email, password); }, { once: true });
    }
  }

  async function เข้าสู่ระบบ(email, password) {
    ปุ่มล็อกอิน.disabled = true;
    try {
      await window.fbSignIn(window.auth, email, password);
      location.href = "quiz-attempts.html";
    } catch (err) {
      เตือน("เข้าสู่ระบบไม่สำเร็จ: " + แปลข้อผิดพลาด(err));
      ปุ่มล็อกอิน.disabled = false;
    }
  }

  function แปลข้อผิดพลาด(err) {
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    }
    return err.message;
  }

  function เตือน(ข้อความ) {
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    กล่องเตือน.classList.remove("hidden");
  }
})();
