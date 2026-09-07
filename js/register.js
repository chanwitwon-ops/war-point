// ─────────────────────────────────────────────────────────────
// js/register.js — หน้าสมัครสมาชิก
// สมัครสำเร็จแล้วสร้างไฟล์ใหม่ใน users/{uid} ด้วย role เริ่มต้น student เสมอ
// (ยกระดับเป็น teacher ทำเองผ่าน Firebase Console เท่านั้น — ไม่มีปุ่มเลือก role ตอนสมัคร)
// ─────────────────────────────────────────────────────────────

(function () {
  var ฟอร์ม = document.getElementById("ฟอร์มสมัคร");
  var กล่องเตือน = document.getElementById("ข้อความเตือน");
  var ปุ่มสมัคร = document.getElementById("ปุ่มสมัคร");

  ฟอร์ม.addEventListener("submit", function (e) {
    e.preventDefault();

    var ชื่อเล่น = document.getElementById("name").value.trim();
    var email = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;

    if (!ชื่อเล่น || !email || !password) {
      เตือน("กรอกให้ครบทุกช่อง");
      return;
    }
    if (password.length < 6) {
      เตือน("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    ถ้าพร้อมแล้วให้สมัคร(ชื่อเล่น, email, password);
  });

  function ถ้าพร้อมแล้วให้สมัคร(ชื่อเล่น, email, password) {
    if (window.auth) {
      สมัครสมาชิก(ชื่อเล่น, email, password);
    } else {
      window.addEventListener("firebase-ready", function () { สมัครสมาชิก(ชื่อเล่น, email, password); }, { once: true });
    }
  }

  async function สมัครสมาชิก(ชื่อเล่น, email, password) {
    ปุ่มสมัคร.disabled = true;
    try {
      var ผลลัพธ์ = await window.fbCreateUser(window.auth, email, password);
      await window.fsSetDoc(window.fsDoc(window.db, "users", ผลลัพธ์.user.uid), {
        name: ชื่อเล่น,
        email: email,
        role: "student"
      });
      location.href = "quiz-attempts.html";
    } catch (err) {
      เตือน("สมัครไม่สำเร็จ: " + แปลข้อผิดพลาด(err));
      ปุ่มสมัคร.disabled = false;
    }
  }

  function แปลข้อผิดพลาด(err) {
    if (err.code === "auth/email-already-in-use") return "อีเมลนี้มีบัญชีอยู่แล้ว";
    if (err.code === "auth/weak-password") return "รหัสผ่านสั้นเกินไป";
    if (err.code === "auth/invalid-email") return "รูปแบบอีเมลไม่ถูกต้อง";
    return err.message;
  }

  function เตือน(ข้อความ) {
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    กล่องเตือน.classList.remove("hidden");
  }
})();
