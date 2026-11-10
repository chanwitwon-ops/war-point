// ─────────────────────────────────────────────────────────────
// mock-firestore.js — จำลอง Firestore แบบ in-memory เพื่อทดสอบ js/tournament-data.js
// และ js/pet-data.js ใน browser จริงโดยไม่ต้องมี Firebase project จริง (scratch tool
// ทดสอบเท่านั้น) ให้ API surface ตรงกับที่ js/firebase.js ประกาศไว้จริง: fsDoc/fsCollection/
// fsSetDoc/fsGetDoc/fsUpdateDoc/fsWhere/fsQuery/fsGetDocs (เพิ่ม 2026-11-08 สำหรับ pet-data.js
// ที่ query quizAttempts ด้วย where 2 เงื่อนไข)
// ─────────────────────────────────────────────────────────────
(function () {
  var store = {};
  var collections = {}; // collectionPath -> { docId: data } — ไว้ทำ query ข้ามเอกสาร
  var counter = 0;

  // เปิดได้ด้วย window.__MOCK_PERSIST = true ก่อนโหลดไฟล์นี้: เก็บข้อมูลลง sessionStorage ให้
  // อยู่รอดข้ามการเปลี่ยนหน้า (หน้าจริงบางหน้า redirect หลังบันทึก) — เทสต์เดิมไม่เปิด จึงเหมือนเดิมทุกอย่าง
  var คีย์เก็บ = "__mockFirestore";
  if (window.__MOCK_PERSIST) {
    try {
      var เก่า = JSON.parse(sessionStorage.getItem(คีย์เก็บ) || "null");
      if (เก่า) { store = เก่า.store; collections = เก่า.collections; counter = เก่า.counter; }
    } catch (e) { /* ไม่มีของเก่า เริ่มว่าง */ }
  }
  function บันทึกถาวร() {
    if (!window.__MOCK_PERSIST) return;
    try {
      sessionStorage.setItem(คีย์เก็บ, JSON.stringify({ store: store, collections: collections, counter: counter }));
    } catch (e) { /* sessionStorage ใช้ไม่ได้ — ทดสอบแบบในหน่วยความจำต่อไป */ }
  }

  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  window.db = {};

  // [แก้ 2026-11-11] รองรับ subcollection เช่น fsCollection(db, "quizAttempts", id, "reviews")
  // เดิมเก็บแค่อาร์กิวเมนต์ที่ 2 ทำให้ reviews ไปอ่านจากคอลเลกชัน quizAttempts แทน
  window.fsCollection = function (db) {
    return { __type: "collection", path: Array.prototype.slice.call(arguments, 1).join("/") };
  };

  window.fsDoc = function (a, b) {
    if (a && a.__type === "collection" && b === undefined) {
      var newId = "auto_" + (++counter);
      return { __type: "doc", path: a.path + "/" + newId, id: newId, collectionPath: a.path };
    }
    var segments = Array.prototype.slice.call(arguments, 1);
    var path = segments.join("/");
    var id = segments[segments.length - 1];
    var collectionPath = segments.slice(0, -1).join("/");
    return { __type: "doc", path: path, id: id, collectionPath: collectionPath };
  };

  function เก็บลงดัชนีคอลเลกชัน(docRef, data) {
    if (!docRef.collectionPath) return;
    if (!collections[docRef.collectionPath]) collections[docRef.collectionPath] = {};
    collections[docRef.collectionPath][docRef.id] = data;
    บันทึกถาวร();
  }

  window.fsSetDoc = function (docRef, data, opts) {
    var merge = opts && opts.merge;
    var เดิม = store[docRef.path];
    var ใหม่ = merge && เดิม ? Object.assign({}, เดิม, clone(data)) : clone(data);
    store[docRef.path] = ใหม่;
    เก็บลงดัชนีคอลเลกชัน(docRef, ใหม่);
    return Promise.resolve();
  };

  // ── query ง่ายๆ: รองรับ fsWhere(field, "==", value) หลายเงื่อนไข (AND) เท่านั้น ──
  window.fsWhere = function (field, op, value) {
    return { __type: "where", field: field, op: op, value: value };
  };
  window.fsOrderBy = function (field, dir) {
    return { __type: "orderBy", field: field, dir: dir || "asc" };
  };
  window.fsQuery = function (collectionRef) {
    var clauses = Array.prototype.slice.call(arguments, 1);
    return { __type: "query", collectionPath: collectionRef.path, clauses: clauses };
  };
  window.fsGetDocs = function (collectionRefOrQuery) {
    var collectionPath = collectionRefOrQuery.collectionPath || collectionRefOrQuery.path;
    var wheres = (collectionRefOrQuery.clauses || []).filter(function (c) { return c.__type === "where"; });
    var orderBys = (collectionRefOrQuery.clauses || []).filter(function (c) { return c.__type === "orderBy"; });

    var ทั้งหมด = collections[collectionPath] || {};
    var ผลลัพธ์ = Object.keys(ทั้งหมด).map(function (id) { return { id: id, data: ทั้งหมด[id] }; });

    wheres.forEach(function (w) {
      ผลลัพธ์ = ผลลัพธ์.filter(function (d) { return d.data[w.field] === w.value; });
    });
    orderBys.forEach(function (o) {
      ผลลัพธ์.sort(function (a, b) {
        var av = a.data[o.field], bv = b.data[o.field];
        var cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return o.dir === "desc" ? -cmp : cmp;
      });
    });

    return Promise.resolve({
      forEach: function (fn) { ผลลัพธ์.forEach(function (d) { fn({ id: d.id, data: function () { return clone(d.data); } }); }); },
      docs: ผลลัพธ์.map(function (d) { return { id: d.id, data: function () { return clone(d.data); } }; }),
      size: ผลลัพธ์.length
    });
  };

  window.fsGetDoc = function (docRef) {
    var data = store[docRef.path];
    return Promise.resolve({
      exists: function () { return data !== undefined; },
      data: function () { return clone(data); },
      id: docRef.id
    });
  };

  window.fsUpdateDoc = function (docRef, partial) {
    var target = store[docRef.path];
    if (!target) throw new Error("mock: updateDoc เรียกกับ doc ที่ไม่มีอยู่จริง: " + docRef.path);
    Object.keys(partial).forEach(function (key) {
      if (key.indexOf(".") === -1) {
        target[key] = partial[key];
        return;
      }
      var parts = key.split(".");
      var obj = target;
      for (var i = 0; i < parts.length - 1; i++) {
        if (obj[parts[i]] == null) obj[parts[i]] = {};
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = partial[key];
    });
    เก็บลงดัชนีคอลเลกชัน(docRef, target);
    return Promise.resolve();
  };

  // [เพิ่ม 2026-11-09] สำหรับ window.ลบทัวนาเมนต์
  window.fsDeleteDoc = function (docRef) {
    delete store[docRef.path];
    if (docRef.collectionPath && collections[docRef.collectionPath]) {
      delete collections[docRef.collectionPath][docRef.id];
    }
    บันทึกถาวร();
    return Promise.resolve();
  };

  window.CURRENT_USER = { uid: "teacher-test-uid", name: "ครูทดสอบ", role: "teacher" };

  window.__MOCK_STORE__ = store; // เปิดดูได้ตรงๆ เวลาดีบัก
})();
