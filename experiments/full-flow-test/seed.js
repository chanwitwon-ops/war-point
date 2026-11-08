// ─────────────────────────────────────────────────────────────
// experiments/full-flow-test/seed.js — เตรียมข้อมูลทั้งสายลง mock Firestore แล้วปล่อย auth-ready
// สายที่ทดสอบ: คะแนนสอบที่ตรวจแล้ว → แต้ม → นักเรียนซื้อไข่/วิวัฒนาการผ่าน js/pet-data.js จริง
// → หน้าจริง (tournament.js / home.js) อ่านข้อมูลชุดนี้
// บทบาท: ?role=teacher|student (จำไว้ใน sessionStorage เพราะหน้าจริง redirect แล้วตัด query ทิ้ง)
// ล้างข้อมูล: ?reset=1
// ─────────────────────────────────────────────────────────────
(async function () {
  var q = new URLSearchParams(location.search);
  if (q.get("reset")) { sessionStorage.clear(); location.href = location.pathname; return; }
  if (q.get("role")) sessionStorage.setItem("__harnessRole", q.get("role"));
  var บทบาท = sessionStorage.getItem("__harnessRole") || "teacher";

  var ผู้ใช้ = {
    teacher: { uid: "t1", name: "ครูสมศรี", role: "teacher" },
    student: { uid: "s1", name: "น้องเอ", role: "student" }
  };

  if (!sessionStorage.getItem("__harnessSeeded")) {
    var นักเรียน = [
      { uid: "s1", name: "น้องเอ", คะแนน: [20, 40], ขั้น: 4 },
      { uid: "s2", name: "น้องบี", คะแนน: [20, 15], ขั้น: 3 },
      { uid: "s3", name: "น้องซี", คะแนน: [16], ขั้น: 2 },
      { uid: "s4", name: "น้องดี", คะแนน: [6], ขั้น: 1 },
      { uid: "s5", name: "น้องอี", คะแนน: [], ขั้น: null } // ยังไม่ได้ซื้อไข่
    ];
    await window.fsSetDoc(window.fsDoc(window.db, "users", "t1"), { name: "ครูสมศรี", role: "teacher" });
    await window.fsSetDoc(window.fsDoc(window.db, "quizSets", "qs1"), { title: "เศษส่วน", format: "mcq", fullScore: 20 });
    await window.fsSetDoc(window.fsDoc(window.db, "quizSets", "qs2"), { title: "ทศนิยม", format: "mcq", fullScore: 40 });
    await window.fsSetDoc(window.fsDoc(window.db, "quizSets", "qs3"), { title: "ใบงานร้อยละ", format: "worksheet", fullScore: 10 });

    var n = 0;
    for (var i = 0; i < นักเรียน.length; i++) {
      var s = นักเรียน[i];
      await window.fsSetDoc(window.fsDoc(window.db, "users", s.uid), { name: s.name, role: "student" });
      for (var j = 0; j < s.คะแนน.length; j++) {
        await window.fsSetDoc(window.fsDoc(window.db, "quizAttempts", "a" + (++n)), {
          studentId: s.uid, studentNickname: s.name, quizSetId: j === 0 ? "qs1" : "qs2",
          status: "graded", scoreAwarded: s.คะแนน[j], submittedAt: "2026-11-0" + (j + 1) + " 10:00"
        });
      }
      if (s.ขั้น !== null) {
        await window.ซื้อไข่(s.uid);
        for (var k = 0; k < s.ขั้น; k++) await window.วิวัฒนาการ(s.uid);
      }
    }
    // งานรอตรวจ 1 ชิ้น ให้หน้าหลักครูนับได้
    await window.fsSetDoc(window.fsDoc(window.db, "quizAttempts", "a" + (++n)), {
      studentId: "s5", studentNickname: "น้องอี", quizSetId: "qs3", status: "pending_review", scoreAwarded: null, submittedAt: "2026-11-08 09:00"
    });
    sessionStorage.setItem("__harnessSeeded", "1");
  }

  window.CURRENT_USER = ผู้ใช้[บทบาท];
  window.dispatchEvent(new Event("auth-ready"));
})();
