// ─────────────────────────────────────────────────────────────
// js/data.js — ข้อมูลตัวอย่างสำหรับ seed ลง Firestore (ชื่อสมมติทั้งหมด)
// ขอบเขตตาม SCOPE.md — นักเรียนส่งงาน (quizAttempts) → ครูตรวจ (reviews)
// ─────────────────────────────────────────────────────────────

window.WAR_POINT_DATA = {
  // ENT-01 STUDENT (ย่อ) — users ของระบบนี้
  students: [
    { id: "std001", studentCode: "1001", nickname: "มดแดง", isActive: true },
    { id: "std002", studentCode: "1002", nickname: "พลอยใส", isActive: true },
    { id: "std003", studentCode: "1003", nickname: "เต่าทอง", isActive: true }
  ],

  // ENT-05 QUIZ_SET (ย่อ) — types ที่เลือกทำได้
  quizSets: [
    { id: "quiz001", title: "แบบทดสอบคณิตศาสตร์ บทที่ 1", format: "mcq", fullScore: 10 },
    { id: "quiz002", title: "ใบงานวิทยาศาสตร์ เรื่องพืช", format: "worksheet", fullScore: 20 },
    { id: "quiz003", title: "งานส่งไฟล์ภาษาไทย เรื่องคำควบกล้ำ", format: "attachment", fullScore: 15 }
  ],

  // ENT-08 QUIZ_ATTEMPT (ย่อ) — โฟลเดอร์หลัก
  // studentNickname / quizSetTitle จดซ้ำไว้ตามที่ระบุใน SCOPE.md (กัน query ซ้ำตอนแสดงหน้ารายการ)
  quizAttempts: [
    {
      id: "att001", studentId: "std001", studentNickname: "มดแดง",
      quizSetId: "quiz001", quizSetTitle: "แบบทดสอบคณิตศาสตร์ บทที่ 1",
      status: "graded", scoreAwarded: 9, submittedAt: "2026-08-20 09:15"
    },
    {
      id: "att002", studentId: "std002", studentNickname: "พลอยใส",
      quizSetId: "quiz002", quizSetTitle: "ใบงานวิทยาศาสตร์ เรื่องพืช",
      status: "pending_review", scoreAwarded: null, submittedAt: "2026-08-25 14:02"
    },
    {
      // format=attachment → ตรวจอัตโนมัติไม่ได้ ตาม DD-05 ต้องเป็น pending_review ทันทีที่ส่ง ไม่ใช่ submitted
      id: "att003", studentId: "std003", studentNickname: "เต่าทอง",
      quizSetId: "quiz003", quizSetTitle: "งานส่งไฟล์ภาษาไทย เรื่องคำควบกล้ำ",
      status: "pending_review", scoreAwarded: null, submittedAt: "2026-08-29 10:30"
    },
    {
      id: "att004", studentId: "std001", studentNickname: "มดแดง",
      quizSetId: "quiz002", quizSetTitle: "ใบงานวิทยาศาสตร์ เรื่องพืช",
      status: "graded", scoreAwarded: 18, submittedAt: "2026-08-21 11:00"
    },
    {
      id: "att005", studentId: "std002", studentNickname: "พลอยใส",
      quizSetId: "quiz001", quizSetTitle: "แบบทดสอบคณิตศาสตร์ บทที่ 1",
      status: "pending_review", scoreAwarded: null, submittedAt: "2026-08-30 08:45"
    }
  ],

  // reviews = approvals subfolder — มีเฉพาะ attempt ที่ status = graded เท่านั้น
  reviews: [
    {
      attemptId: "att001", id: "rev001",
      teacherName: "ครูสมศรี", feedback: "ทำได้ดีมาก ตรวจทานอีกนิดเรื่องเครื่องหมาย",
      scoreGiven: 9, reviewedAt: "2026-08-20 15:00"
    },
    {
      attemptId: "att004", id: "rev002",
      teacherName: "ครูสมศรี", feedback: "อธิบายละเอียดดี ทำได้เกือบเต็ม ขาดแค่สรุปท้ายเรื่อง",
      scoreGiven: 18, reviewedAt: "2026-08-21 16:30"
    }
  ]
};
