// ─────────────────────────────────────────────────────────────
// js/pet-animation.js — เวทีแอนิเมชันการต่อสู้ (ชั้นแสดงผลล้วน ไม่คำนวณผลใดๆ)
// ยกเทคนิคมาจากเครื่องมือทดลอง experiments/battle-animation-test/battle-test.html
// (chroma-key คีย์สีน้ำเงินออกผ่าน canvas, โหลดคลิปเป็น blob ล่วงหน้า, ยิงขึ้นฟ้าแล้วพลังงานร่วง
// ลงมาใส่เป้าหมาย) — ผู้เรียกบอกว่าจะเล่นท่าอะไรตาม battle log เท่านั้น
//
// สลับคลิปใหม่: วางไฟล์ทับใน assets/pets/<speciesKey>/ ชื่อเดิม ไม่ต้องแก้โค้ด (ถ้าจังหวะ
// เริ่มของคลิปใหม่ต่างจากเดิม ให้แก้ startOffset ใน PET_CLIP_CONFIG ด้านล่างเท่านั้น)
//
// ── สัญญา ──
// window.สร้างเวทีต่อสู้(ที่วาง: HTMLElement, speciesA: string, speciesB: string)
//   → เวที | null (null ถ้าสายพันธุ์ใดไม่มีคลิป — ผู้เรียกใช้ข้อความแทน)
// เวที.ยิง(ฝั่งผู้ยิง: "A"|"B", ผลลัพธ์: "hit"|"miss"|"block") → Promise  เล่นท่ายิง + ของตก + ท่ารับ
// เวที.ข้อความลอย(ฝั่ง, ข้อความ)                  แสดงตัวเลข/คำเหนือหัวชั่วครู่
// เวที.หมดแรง(ฝั่ง)  /  เวที.รีเซ็ต()               ทำให้ตัวที่แพ้จางลง / กลับสภาพเริ่มต้น
// ─────────────────────────────────────────────────────────────

(function () {
  var PET_CLIP_CONFIG = {
    pixie: {
      base: "assets/pets/pixie/",
      startOffset: { idle: 0, cast: 0, hit: 0, dodge: 1.6 },
      // ตำแหน่ง crop ลูกพลังงานในเฟรมคลิป projectile (วัดจากคลิปปัจจุบัน — คลิปใหม่อาจต้องวัดใหม่)
      projectileRect: { x: 259, y: 74, w: 346, h: 346 }
    }
  };

  var ท่าทั้งหมด = ["idle", "cast", "hit", "dodge"];

  // พื้นหลังคลิปเป็นสีน้ำเงิน (ดู comment ใน battle-test.html เรื่องไล่เฉด) — ค่าเดียวกับที่ทดสอบผ่านแล้ว
  function ความโปร่งใส(r, g, b) {
    return (b > 150 && b - r > 60 && b - g > 40) ? 0 : 255;
  }

  function วาดแบบคีย์สี(ctx, video, w, h, srcRect) {
    if (srcRect) {
      ctx.drawImage(video, srcRect.x, srcRect.y, srcRect.w, srcRect.h, 0, 0, w, h);
    } else {
      ctx.drawImage(video, 0, 0, w, h);
    }
    var เฟรม = ctx.getImageData(0, 0, w, h);
    var d = เฟรม.data;
    for (var i = 0; i < d.length; i += 4) {
      var a = ความโปร่งใส(d[i], d[i + 1], d[i + 2]);
      if (a < d[i + 3]) d[i + 3] = a;
    }
    ctx.putImageData(เฟรม, 0, 0);
  }

  // โหลดทั้งไฟล์เป็น blob ก่อน — seek ทันที ไม่ค้างเฟรมว่าง (ดูเหตุผลใน battle-test.html)
  var แคชblob = {};
  function blobของ(url) {
    if (!แคชblob[url]) {
      แคชblob[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error("โหลดคลิปไม่ได้: " + url);
        return r.blob();
      }).then(function (b) { return URL.createObjectURL(b); });
    }
    return แคชblob[url];
  }

  function วิดีโอเงียบ() {
    var v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    return v;
  }

  function สร้างตัวละคร(canvas, config, หันซ้าย) {
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    var วิดีโอ = {};
    ท่าทั้งหมด.forEach(function (ท่า) {
      var v = วิดีโอเงียบ();
      blobของ(config.base + ท่า + ".mp4").then(function (url) { v.src = url; }).catch(function (e) { console.error(e); });
      var offset = config.startOffset[ท่า] || 0;
      if (offset > 0) {
        v.addEventListener("loadedmetadata", function () { v.currentTime = offset; }, { once: true });
      }
      วิดีโอ[ท่า] = v;
    });

    var ปัจจุบัน = วิดีโอ.idle;
    var หยุดวาด = false;

    // ท่าหลบต้องหลบ "ออกจาก" คู่ต่อสู้ — จึงกลับด้านจากท่าปกติเสมอ
    function กลับด้านสำหรับ(ท่า) {
      return ท่า === "dodge" ? !หันซ้าย : หันซ้าย;
    }

    function วนวาด() {
      if (หยุดวาด) return;
      if (ปัจจุบัน.readyState >= 2) วาดแบบคีย์สี(ctx, ปัจจุบัน, canvas.width, canvas.height);
      requestAnimationFrame(วนวาด);
    }
    วนวาด();

    function เล่น(ท่า, วนซ้ำ) {
      return new Promise(function (resolve) {
        Object.keys(วิดีโอ).forEach(function (k) { if (k !== ท่า) วิดีโอ[k].pause(); });
        ปัจจุบัน = วิดีโอ[ท่า];
        ปัจจุบัน.loop = !!วนซ้ำ;
        var offset = config.startOffset[ท่า] || 0;
        if (Math.abs(ปัจจุบัน.currentTime - offset) > 0.05) ปัจจุบัน.currentTime = offset;
        canvas.style.transform = กลับด้านสำหรับ(ท่า) ? "scaleX(-1)" : "none";
        var p = ปัจจุบัน.play();
        if (p && p.catch) p.catch(function () { /* autoplay ถูกบล็อก — ยังวาดเฟรมแรกได้ */ });
        if (วนซ้ำ) {
          resolve();
          return;
        }
        // กันค้างถ้าคลิปโหลดไม่ได้/เล่นไม่ได้: ปล่อยต่อหลัง 4 วินาทีอย่างช้าที่สุด
        var กันค้าง = setTimeout(resolve, 4000);
        ปัจจุบัน.onended = function () {
          clearTimeout(กันค้าง);
          if (offset > 0) ปัจจุบัน.currentTime = offset;
          resolve();
        };
      });
    }

    เล่น("idle", true);
    return { canvas: canvas, เล่น: เล่น, ทำลาย: function () { หยุดวาด = true; } };
  }

  window.สร้างเวทีต่อสู้ = function (ที่วาง, speciesA, speciesB) {
    var configA = PET_CLIP_CONFIG[speciesA];
    var configB = PET_CLIP_CONFIG[speciesB];
    if (!configA || !configB) return null;

    ที่วาง.innerHTML =
      '<div class="battle-arena">' +
        '<div class="battle-side" data-side="A"><canvas class="battle-sprite" width="864" height="496"></canvas>' +
          '<div class="battle-float" aria-live="polite"></div></div>' +
        '<div class="battle-side" data-side="B"><canvas class="battle-sprite" width="864" height="496"></canvas>' +
          '<div class="battle-float" aria-live="polite"></div></div>' +
        '<canvas class="battle-projectile" width="200" height="120"></canvas>' +
      "</div>";

    var สนาม = ที่วาง.querySelector(".battle-arena");
    var ฝั่ง = {
      A: ที่วาง.querySelector('[data-side="A"]'),
      B: ที่วาง.querySelector('[data-side="B"]')
    };
    var ตัวละคร = {
      A: สร้างตัวละคร(ฝั่ง.A.querySelector("canvas"), configA, false),
      B: สร้างตัวละคร(ฝั่ง.B.querySelector("canvas"), configB, true)
    };

    // ลูกพลังงานที่ร่วงจากฟ้า — ใช้คลิป projectile ของฝ่ายผู้ยิง
    var canvasลูก = ที่วาง.querySelector(".battle-projectile");
    var ctxลูก = canvasลูก.getContext("2d", { willReadFrequently: true });
    var วิดีโอลูก = { A: วิดีโอเงียบ(), B: วิดีโอเงียบ() };
    blobของ(configA.base + "projectile.mp4").then(function (u) { วิดีโอลูก.A.src = u; }).catch(function (e) { console.error(e); });
    blobของ(configB.base + "projectile.mp4").then(function (u) { วิดีโอลูก.B.src = u; }).catch(function (e) { console.error(e); });
    var ลูกที่ใช้ = null;
    var rectลูกที่ใช้ = null;
    var หยุดวาดลูก = false;
    (function วนวาดลูก() {
      if (หยุดวาดลูก) return;
      if (ลูกที่ใช้ && ลูกที่ใช้.readyState >= 2) {
        วาดแบบคีย์สี(ctxลูก, ลูกที่ใช้, canvasลูก.width, canvasลูก.height, rectลูกที่ใช้);
      }
      requestAnimationFrame(วนวาดลูก);
    })();

    function ร่วงใส่(ฝั่งเป้าหมาย, ฝั่งผู้ยิง) {
      return new Promise(function (resolve) {
        var config = ฝั่งผู้ยิง === "A" ? configA : configB;
        ลูกที่ใช้ = วิดีโอลูก[ฝั่งผู้ยิง];
        rectลูกที่ใช้ = config.projectileRect;
        var กรอบสนาม = สนาม.getBoundingClientRect();
        var กรอบเป้า = ฝั่ง[ฝั่งเป้าหมาย].getBoundingClientRect();
        var กรอบลูก = canvasลูก.getBoundingClientRect();
        var x = (กรอบเป้า.left - กรอบสนาม.left) + กรอบเป้า.width / 2 - กรอบลูก.width / 2;
        var yเริ่ม = -กรอบลูก.height * 1.5;
        var yจบ = (กรอบเป้า.top - กรอบสนาม.top) + กรอบเป้า.height * 0.75 - กรอบลูก.height / 2;
        var นาน = 500;

        ลูกที่ใช้.currentTime = 1.0;
        ลูกที่ใช้.playbackRate = 0.0625;
        var p = ลูกที่ใช้.play();
        if (p && p.catch) p.catch(function () {});

        canvasลูก.style.transition = "none";
        canvasลูก.style.left = x + "px";
        canvasลูก.style.top = yเริ่ม + "px";
        canvasลูก.style.opacity = "1";
        requestAnimationFrame(function () {
          canvasลูก.style.transition = "top " + นาน + "ms ease-in";
          canvasลูก.style.top = yจบ + "px";
        });
        setTimeout(function () {
          canvasลูก.style.opacity = "0";
          resolve();
        }, นาน + 50);
      });
    }

    function ข้อความลอย(ฝั่งไหน, ข้อความ) {
      var กล่อง = ฝั่ง[ฝั่งไหน].querySelector(".battle-float");
      กล่อง.textContent = ข้อความ;
      กล่อง.classList.remove("is-showing");
      void กล่อง.offsetWidth; // รีสตาร์ท CSS animation
      กล่อง.classList.add("is-showing");
    }

    return {
      ยิง: function (ผู้ยิง, ผลลัพธ์) {
        var เป้า = ผู้ยิง === "A" ? "B" : "A";
        return ตัวละคร[ผู้ยิง].เล่น("cast", false).then(function () {
          var ท่ารับ;
          if (ผลลัพธ์ === "miss") {
            ท่ารับ = ตัวละคร[เป้า].เล่น("dodge", false);
          } else if (ผลลัพธ์ === "block") {
            // ยังไม่มีคลิปท่าบล็อก — ยืนรับ + เอฟเฟกต์โล่ (CSS) แทน
            ฝั่ง[เป้า].classList.remove("is-blocking");
            void ฝั่ง[เป้า].offsetWidth;
            ฝั่ง[เป้า].classList.add("is-blocking");
            ท่ารับ = Promise.resolve();
          } else {
            ท่ารับ = ตัวละคร[เป้า].เล่น("hit", false);
          }
          return Promise.all([ร่วงใส่(เป้า, ผู้ยิง), ท่ารับ]);
        }).then(function () {
          ตัวละคร.A.เล่น("idle", true);
          ตัวละคร.B.เล่น("idle", true);
        });
      },
      ข้อความลอย: ข้อความลอย,
      หมดแรง: function (ฝั่งไหน) { ฝั่ง[ฝั่งไหน].classList.add("is-ko"); },
      รีเซ็ต: function () {
        ฝั่ง.A.classList.remove("is-ko", "is-blocking");
        ฝั่ง.B.classList.remove("is-ko", "is-blocking");
        canvasลูก.style.opacity = "0";
        ตัวละคร.A.เล่น("idle", true);
        ตัวละคร.B.เล่น("idle", true);
      },
      ทำลาย: function () {
        หยุดวาดลูก = true;
        ตัวละคร.A.ทำลาย();
        ตัวละคร.B.ทำลาย();
      }
    };
  };
})();
