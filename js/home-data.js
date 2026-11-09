// ─────────────────────────────────────────────────────────────
// js/home-data.js — ชั้นข้อมูล (Firestore) ของหน้าหลักแยกบทบาท
// ไม่มี HTML/DOM — อ่านอย่างเดียว ไม่พึ่งไฟล์ data อื่น (query เองทั้งหมด)
// ─────────────────────────────────────────────────────────────

(function () {
  // นักเรียน: ชุดข้อสอบทั้งหมดที่ยังไม่เคยส่งงาน
  window.โหลดชุดข้อสอบที่ยังไม่ทำ = async function (uid) {
    try {
      var งานของฉัน = await window.fsGetDocs(
        window.fsQuery(window.fsCollection(window.db, "quizAttempts"), window.fsWhere("studentId", "==", uid))
      );
      var ทำแล้ว = {};
      งานของฉัน.forEach(function (d) { ทำแล้ว[d.data().quizSetId] = true; });

      var ชุดทั้งหมด = await window.fsGetDocs(window.fsCollection(window.db, "quizSets"));
      var ผล = [];
      ชุดทั้งหมด.forEach(function (d) {
        if (ทำแล้ว[d.id]) return;
        var ข้อมูล = d.data();
        ผล.push({ id: d.id, title: ข้อมูล.title, format: ข้อมูล.format, fullScore: ข้อมูล.fullScore });
      });
      return ผล;
    } catch (err) {
      console.error(err);
      throw new Error("โหลดชุดข้อสอบที่ยังไม่ทำไม่สำเร็จ: " + err.message);
    }
  };

  // ครู: จำนวนงานที่รอตรวจ
  window.นับงานรอตรวจ = async function () {
    try {
      var ผล = await window.fsGetDocs(
        window.fsQuery(window.fsCollection(window.db, "quizAttempts"), window.fsWhere("status", "==", "pending_review"))
      );
      var n = 0;
      ผล.forEach(function () { n++; });
      return n;
    } catch (err) {
      console.error(err);
      throw new Error("นับงานรอตรวจไม่สำเร็จ: " + err.message);
    }
  };

  // ทัวนาเมนต์ล่าสุด (null ถ้ายังไม่มี)
  window.โหลดทัวนาเมนต์ล่าสุด = async function () {
    try {
      var ผล = await window.fsGetDocs(
        window.fsQuery(window.fsCollection(window.db, "tournaments"), window.fsOrderBy("createdAt", "desc"))
      );
      var แรก = null;
      ผล.forEach(function (d) {
        if (แรก) return;
        var ข้อมูล = d.data();
        var แชมป์ = แชมป์ของทัวนาเมนต์(ข้อมูล); // js/util.js — รองรับทั้งผังกี่คนก็ได้และผัง 4 คนแบบเก่า
        แรก = {
          id: d.id,
          createdAt: ข้อมูล.createdAt,
          championName: แชมป์ ? แชมป์.slot.studentName : null
        };
      });
      return แรก;
    } catch (err) {
      console.error(err);
      throw new Error("โหลดทัวนาเมนต์ล่าสุดไม่สำเร็จ: " + err.message);
    }
  };
})();
