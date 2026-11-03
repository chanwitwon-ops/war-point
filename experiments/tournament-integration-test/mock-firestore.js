// ─────────────────────────────────────────────────────────────
// mock-firestore.js — จำลอง Firestore แบบ in-memory เพื่อทดสอบ js/tournament-data.js
// ใน browser จริงโดยไม่ต้องมี Firebase project จริง (scratch tool ทดสอบเท่านั้น)
// ให้ API surface ตรงกับที่ js/firebase.js ประกาศไว้จริง: fsDoc/fsCollection/fsSetDoc/fsGetDoc/fsUpdateDoc
// ─────────────────────────────────────────────────────────────
(function () {
  var store = {};
  var counter = 0;

  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  window.db = {};

  window.fsCollection = function (db, path) {
    return { __type: "collection", path: path };
  };

  window.fsDoc = function (a, b) {
    if (a && a.__type === "collection" && b === undefined) {
      var newId = "auto_" + (++counter);
      return { __type: "doc", path: a.path + "/" + newId, id: newId };
    }
    var segments = Array.prototype.slice.call(arguments, 1);
    var path = segments.join("/");
    var id = segments[segments.length - 1];
    return { __type: "doc", path: path, id: id };
  };

  window.fsSetDoc = function (docRef, data) {
    store[docRef.path] = clone(data);
    return Promise.resolve();
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
    return Promise.resolve();
  };

  window.CURRENT_USER = { uid: "teacher-test-uid", name: "ครูทดสอบ", role: "teacher" };

  window.__MOCK_STORE__ = store; // เปิดดูได้ตรงๆ เวลาดีบัก
})();
