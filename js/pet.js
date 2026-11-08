// ─────────────────────────────────────────────────────────────
// js/pet.js — หน้าสัตว์เลี้ยงของฉัน (นักเรียนเท่านั้น)
// ตาม docs/01-requirements/01-spec/20260821-02-pet-points-and-weekly-arena.md หัวข้อ ข. / ค. / ค.๑ / ซ.
//
// ไฟล์นี้ **ไม่คำนวณแต้ม/สเตตัส/ต้นทุนเอง** — อ่านค่าคงที่จาก window.PET_STAGE_* (js/pet-config.js)
// และเรียกการอ่าน/เขียนข้อมูลผ่าน 4 ฟังก์ชันของ js/pet-data.js (data-auth-engineer) เท่านั้น
// ห้ามเรียก fsGetDoc/fsSetDoc ตรงๆ ในไฟล์นี้
// ─────────────────────────────────────────────────────────────

// ── stub สัญญาของ js/pet-data.js ──
// ถ้า pet-data.js ยังไม่ถูกโหลด/ยังไม่ได้ต่อ logic ฟังก์ชันเหล่านี้จะ reject ด้วยข้อความไทย
// (หน้าจอแสดงเป็นกล่อง error ไม่พัง) ถ้า pet-data.js ประกาศไว้แล้ว จะใช้ของจริงเสมอ
// (โหลด pet-data.js ก่อน pet.js ใน pet.html)
//
// window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(uid) → Promise<{
//   totalPointsEarned, pointsAvailable,
//   pet: { speciesKey, stage, stats: {SPD,ATK,ACC,DEF,HP}, statusAbility, pointsSpent } | null,
//   growthHistory: [{ speciesKey, reachedStage, startedAt, endedAt }]
// }>
// window.ซื้อไข่(uid) → Promise<void>  — reject ด้วย Error ภาษาไทยถ้าแต้มไม่พอหรือมีสัตว์เลี้ยงอยู่แล้ว
// window.วิวัฒนาการ(uid) → Promise<void> — reject ถ้าแต้มไม่พอ / ถึงร่างสุดท้ายแล้ว / ยังไม่มีสัตว์เลี้ยง
// window.รีเซ็ตสัตว์เลี้ยง(uid) → Promise<void> — เริ่มจากไข่ใหม่ แต้มที่ใช้ไปคืนทั้งหมด
(function () {
  var ข้อความยังไม่เชื่อม = "ระบบข้อมูลสัตว์เลี้ยงยังไม่พร้อมใช้งาน (ยังไม่ได้โหลด js/pet-data.js)";
  function ยังไม่เชื่อม() {
    return Promise.reject(new Error(ข้อความยังไม่เชื่อม));
  }
  window.โหลดข้อมูลแต้มและสัตว์เลี้ยง = window.โหลดข้อมูลแต้มและสัตว์เลี้ยง || ยังไม่เชื่อม;
  window.ซื้อไข่ = window.ซื้อไข่ || ยังไม่เชื่อม;
  window.วิวัฒนาการ = window.วิวัฒนาการ || ยังไม่เชื่อม;
  window.รีเซ็ตสัตว์เลี้ยง = window.รีเซ็ตสัตว์เลี้ยง || ยังไม่เชื่อม;
})();

(function () {
  var กล่องกำลังโหลด = document.getElementById("กล่องกำลังโหลด");
  var กล่องไม่มีสิทธิ์ = document.getElementById("กล่องไม่มีสิทธิ์");
  var กล่องเตือน = document.getElementById("กล่องเตือนสัตว์เลี้ยง");
  var ที่วาง = document.getElementById("ที่วางสัตว์เลี้ยง");

  // ชื่อสเตตัสภาษาไทย — แพทเทิร์นเดียวกับ js/tournament-match.js
  var ชื่อสเตตัสไทย = { SPD: "ความเร็ว", ATK: "พละกำลัง", ACC: "ความแม่นยำ", DEF: "ค่าพลังป้องกัน", HP: "พลังชีวิต" };
  var ลำดับสเตตัส = ["SPD", "ATK", "ACC", "DEF", "HP"];

  // ดัชนีขั้นสุดท้าย (ร่างที่ 4) อ่านจากจำนวนป้ายขั้นใน pet-config.js ไม่ hardcode
  var ขั้นสุดท้าย = window.PET_STAGE_LABELS.length - 1;

  if (window.CURRENT_USER) {
    เริ่ม();
  } else {
    window.addEventListener("auth-ready", เริ่ม, { once: true });
  }

  function เริ่ม() {
    กล่องกำลังโหลด.classList.add("hidden");
    // ครูไม่มีสิทธิ์ใช้หน้านี้ — ไม่โหลดข้อมูลและไม่สร้างองค์ประกอบของนักเรียนใน DOM
    if (window.CURRENT_USER.role !== "student") {
      กล่องไม่มีสิทธิ์.classList.remove("hidden");
      return;
    }
    โหลด();
  }

  // คืน true ถ้าโหลดและแสดงผลสำเร็จ
  async function โหลด() {
    try {
      var ข้อมูล = await window.โหลดข้อมูลแต้มและสัตว์เลี้ยง(window.CURRENT_USER.uid);
      แสดงผล(ข้อมูล);
      return true;
    } catch (err) {
      console.error(err);
      กล่องกำลังโหลด.classList.add("hidden");
      แสดงเตือน(ข้อความของ(err));
      return false;
    }
  }

  function แสดงผล(ข้อมูล) {
    แสดงเตือน("");
    กล่องกำลังโหลด.classList.add("hidden");
    ที่วาง.classList.remove("hidden");

    var html =
      '<div class="card">' +
      '<p class="section-title">แต้มของฉัน</p>' +
      "<p>แต้มที่ใช้ได้ <strong>" + ข้อความตัวเลข(ข้อมูล.pointsAvailable) + "</strong> / สะสมรวม " +
      ข้อความตัวเลข(ข้อมูล.totalPointsEarned) + " แต้ม</p>" +
      "</div>";

    html += ข้อมูล.pet ? สร้างการ์ดสัตว์เลี้ยง(ข้อมูล) : สร้างการ์ดซื้อไข่(ข้อมูล);
    html += สร้างบันทึกการเติบโต(ข้อมูล.growthHistory);

    ที่วาง.innerHTML = html;
    ผูกปุ่ม(ข้อมูล);
  }

  // ── การ์ดซื้อไข่ (ยังไม่มีสัตว์เลี้ยง) ──
  function สร้างการ์ดซื้อไข่(ข้อมูล) {
    var ราคาไข่ = window.PET_STAGE_COST[0];
    var ขาด = ราคาไข่ - ข้อมูล.pointsAvailable;
    var html =
      '<div class="card">' +
      '<p class="section-title">ยังไม่มีสัตว์เลี้ยง</p>' +
      "<p>ซื้อไข่เพื่อเริ่มเลี้ยงสัตว์เลี้ยงตัวแรก ราคา " + ราคาไข่ + " แต้ม</p>" +
      '<div class="btn-row">' +
      '<button type="button" class="btn" id="ปุ่มซื้อไข่"' + (ขาด > 0 ? " disabled" : "") + ">" +
      "ซื้อไข่ (" + ราคาไข่ + " แต้ม)</button></div>";
    if (ขาด > 0) {
      html += '<p class="hint">ต้องการอีก ' + ขาด + " แต้ม</p>";
    }
    html += "</div>";
    return html;
  }

  // ── การ์ดสัตว์เลี้ยงปัจจุบัน ──
  function สร้างการ์ดสัตว์เลี้ยง(ข้อมูล) {
    var สัตว์ = ข้อมูล.pet;
    var ขั้น = สัตว์.stage;
    var ชื่อสาย = (window.TOURNAMENT_DEMO_SPECIES && window.TOURNAMENT_DEMO_SPECIES[สัตว์.speciesKey])
      ? window.TOURNAMENT_DEMO_SPECIES[สัตว์.speciesKey].label
      : สัตว์.speciesKey;
    var สเตตัส = สัตว์.stats || {};
    var สัดส่วนความคืบหน้า = Math.round(((ขั้น + 1) / window.PET_STAGE_LABELS.length) * 100);

    var html =
      '<div class="card pet-card">' +
      '<p class="section-title">สัตว์เลี้ยงปัจจุบัน</p>' +
      '<p class="pet-species">สายพันธุ์: ' + esc(ชื่อสาย) + "</p>" +
      '<p class="pet-stage-name">ขั้นปัจจุบัน: <strong>' + esc(window.PET_STAGE_LABELS[ขั้น] || "—") + "</strong></p>" +
      '<div class="progress-row">' +
      '<span class="progress-label">ขั้น ' + (ขั้น + 1) + " / " + window.PET_STAGE_LABELS.length + "</span>" +
      '<div class="progress-track"><div class="progress-fill" style="width: ' + สัดส่วนความคืบหน้า + '%"></div></div>' +
      "</div>" +
      '<p class="stat-caption">ค่าสเตตัสของขั้นนี้</p>' +
      '<div class="stat-chips">';

    ลำดับสเตตัส.forEach(function (key) {
      html +=
        '<span class="stat-chip">' + key + " · " + ชื่อสเตตัสไทย[key] + " <strong>" +
        ข้อความตัวเลข(สเตตัส[key]) + "</strong></span>";
    });
    html += "</div>";

    if (ขั้น < ขั้นสุดท้าย) {
      var ราคาถัดไป = window.PET_STAGE_COST[ขั้น + 1];
      var ขาด = ราคาถัดไป - ข้อมูล.pointsAvailable;
      html +=
        '<div class="btn-row">' +
        '<button type="button" class="btn" id="ปุ่มวิวัฒนาการ"' + (ขาด > 0 ? " disabled" : "") + ">" +
        "วิวัฒนาการ (ใช้เพิ่ม " + ราคาถัดไป + " แต้ม)</button></div>";
      if (ขาด > 0) {
        html += '<p class="hint">ต้องการอีก ' + ขาด + " แต้ม</p>";
      }
    } else {
      html += '<p class="hint">ถึงร่างสุดท้ายแล้ว 🎉</p>';
    }

    html +=
      '<div class="btn-row">' +
      '<button type="button" class="btn-danger" id="ปุ่มรีเซ็ต">รีเซ็ต (เริ่มใหม่จากไข่)</button></div>' +
      "</div>";
    return html;
  }

  // ── บันทึกเส้นทางการเติบโต (เรียงใหม่สุดก่อน) ──
  function สร้างบันทึกการเติบโต(ประวัติ) {
    var html = '<div class="card"><p class="section-title">บันทึกเส้นทางการเติบโต</p>';
    if (!ประวัติ || ประวัติ.length === 0) {
      html += '<p class="hint">ยังไม่มีบันทึกเส้นทางการเติบโต</p></div>';
      return html;
    }

    var เรียงแล้ว = ประวัติ.slice().sort(function (a, b) {
      return ข้อความ(b.startedAt).localeCompare(ข้อความ(a.startedAt));
    });

    html +=
      '<div class="table-scroll"><table><thead><tr>' +
      "<th>เริ่มเมื่อ</th><th>ไปถึงขั้น</th><th>จบเมื่อ</th>" +
      "</tr></thead><tbody>";
    เรียงแล้ว.forEach(function (รายการ) {
      html +=
        "<tr><td>" + esc(ข้อความ(รายการ.startedAt)) + "</td>" +
        "<td>" + esc(window.PET_STAGE_LABELS[รายการ.reachedStage] || "—") + "</td>" +
        "<td>" + (รายการ.endedAt == null ? "—" : esc(ข้อความ(รายการ.endedAt))) + "</td></tr>";
    });
    html += "</tbody></table></div></div>";
    return html;
  }

  // ── ผูกปุ่ม (สร้างใหม่ทุกครั้งที่ render) ──
  function ผูกปุ่ม() {
    var ปุ่มซื้อ = document.getElementById("ปุ่มซื้อไข่");
    if (ปุ่มซื้อ) {
      ปุ่มซื้อ.addEventListener("click", function () {
        ทำรายการ(ปุ่มซื้อ, "กำลังซื้อไข่...", function (uid) { return window.ซื้อไข่(uid); });
      });
    }

    var ปุ่มวิวัฒนาการ = document.getElementById("ปุ่มวิวัฒนาการ");
    if (ปุ่มวิวัฒนาการ) {
      ปุ่มวิวัฒนาการ.addEventListener("click", function () {
        ทำรายการ(ปุ่มวิวัฒนาการ, "กำลังวิวัฒนาการ...", function (uid) { return window.วิวัฒนาการ(uid); });
      });
    }

    var ปุ่มรีเซ็ต = document.getElementById("ปุ่มรีเซ็ต");
    if (ปุ่มรีเซ็ต) {
      ปุ่มรีเซ็ต.addEventListener("click", function () {
        var ยืนยัน = confirm(
          "รีเซ็ตสัตว์เลี้ยงและเริ่มใหม่จากไข่?\n" +
          "แต้มที่ใช้ไปกับตัวนี้จะได้คืนทั้งหมด แต่สัตว์เลี้ยงต้องเริ่มโตจากขั้นแรกใหม่ทั้งหมด\n" +
          "บันทึกเส้นทางการเติบโตจะยังอยู่"
        );
        if (!ยืนยัน) return;
        ทำรายการ(ปุ่มรีเซ็ต, "กำลังรีเซ็ต...", function (uid) { return window.รีเซ็ตสัตว์เลี้ยง(uid); });
      });
    }
  }

  // ทำรายการที่เขียนข้อมูล แล้วโหลดข้อมูลใหม่ทั้งหน้า (ไม่ reload ทั้งเพจ)
  async function ทำรายการ(ปุ่ม, ข้อความกำลังทำ, ฟังก์ชันหลัก) {
    var ข้อความเดิม = ปุ่ม.textContent;
    ปุ่ม.disabled = true;
    ปุ่ม.textContent = ข้อความกำลังทำ;
    แสดงเตือน("");

    try {
      await ฟังก์ชันหลัก(window.CURRENT_USER.uid);
    } catch (err) {
      console.error(err);
      แสดงเตือน(ข้อความของ(err));
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = ข้อความเดิม;
      return;
    }

    var โหลดสำเร็จ = await โหลด();
    if (!โหลดสำเร็จ) {
      // ทำรายการสำเร็จแล้วแต่โหลดข้อมูลใหม่ไม่ได้ — ปลดปุ่มให้กดใหม่ได้
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = ข้อความเดิม;
    }
  }

  function แสดงเตือน(ข้อความ_) {
    if (!ข้อความ_) {
      กล่องเตือน.classList.add("hidden");
      กล่องเตือน.textContent = "";
      return;
    }
    กล่องเตือน.textContent = ข้อความ_;
    กล่องเตือน.classList.remove("hidden");
  }

  function ข้อความของ(err) {
    return err && err.message ? err.message : String(err);
  }

  function ข้อความ(ค่า) {
    return ค่า == null ? "" : String(ค่า);
  }

  function ข้อความตัวเลข(ค่า) {
    return typeof ค่า === "number" ? String(ค่า) : "—";
  }
})();
