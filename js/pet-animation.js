// ─────────────────────────────────────────────────────────────
// js/pet-animation.js — เวทีแอนิเมชันการต่อสู้ (ชั้นแสดงผลล้วน ไม่คำนวณผลใดๆ)
// ยกเทคนิคมาจากเครื่องมือทดลอง experiments/battle-animation-test/battle-test.html
// (chroma-key คีย์สีน้ำเงินออกผ่าน canvas, โหลดคลิปเป็น blob ล่วงหน้า) · ลูกพลังยิงตรงแนวนอนจากคทา
// ไปหาเป้า โดยโค้ดเป็นคนพาลูกไป (เปลี่ยนจากยิงขึ้นฟ้าเมื่อ 2026-11-08) — ผู้เรียกบอกว่าจะเล่นท่าอะไรตาม battle log เท่านั้น
//
// สลับคลิปใหม่: วางไฟล์ทับใน assets/pets/<speciesKey>/ ชื่อเดิม ไม่ต้องแก้โค้ด (ถ้าจังหวะ
// เริ่มของคลิปใหม่ต่างจากเดิม ให้แก้ startOffset ใน PET_CLIP_CONFIG ด้านล่างเท่านั้น)
//
// ── สัญญา ──
// window.สร้างเวทีต่อสู้(ที่วาง: HTMLElement, speciesA: string, speciesB: string)
//   → เวที | null (null ถ้าสายพันธุ์ใดไม่มีคลิป — ผู้เรียกใช้ข้อความแทน)
// เวที.ยิง(ฝั่งผู้ยิง: "A"|"B", ผลลัพธ์: "hit"|"miss"|"block") → Promise  เล่นท่ายิง + ลูกพลังบินตรงไปหาเป้า + ท่ารับ
// เวที.ข้อความลอย(ฝั่ง, ข้อความ)                  แสดงตัวเลข/คำเหนือหัวชั่วครู่
// เวที.หมดแรง(ฝั่ง)  /  เวที.รีเซ็ต()               ทำให้ตัวที่แพ้จางลง / กลับสภาพเริ่มต้น
// ─────────────────────────────────────────────────────────────

(function () {
  var PET_CLIP_CONFIG = {
    pixie: {
      base: "assets/pets/pixie/",
      startOffset: { idle: 0, cast: 0, hit: 0, dodge: 1.6 },
      // ตำแหน่ง crop ลูกพลังงานในเฟรมคลิป projectile (วัดจากคลิปปัจจุบัน — คลิปใหม่อาจต้องวัดใหม่)
      // ใช้เฉพาะสายพันธุ์ที่ไม่มี castRelease (Pixie ใช้ก้อนพลังจากท่าร่ายแทน ดูด้านล่าง)
      projectileRect: { x: 259, y: 74, w: 346, h: 346 },
      // [เพิ่ม 2026-11-08] ปรับขนาด/ตำแหน่งตัวละครให้เท่ากันทุกคลิป — แต่ละคลิปที่ AI สร้างมาซูมไม่เท่ากัน
      // วัดกรอบตัวละครทุกเฟรม (ffmpeg 10fps, ตัดพื้นหลังและแสงออก) ที่ท่าปกติต้นคลิป:
      //   idle สูง 360 เท้าที่ y 432 กลางตัว x 433 (ใช้เป็นมาตรฐาน)
      //   cast สูง 440 เท้า 476 กลาง 384 · hit สูง 320 เท้า 418 กลาง 436 · dodge สูง 336 เท้า 396 กลาง 431
      // ย่อ/ขยายทั้งคลิปด้วยค่าคงที่ s แล้วเลื่อนให้จุด (ax, ay) ของคลิปไปอยู่ที่จุดมาตรฐานของ idle
      // (ค่าคงที่ต่อคลิป ไม่ปรับทีละเฟรม — ท่าทางในคลิป เช่น ตัวพุ่งออกข้างตอนหลบ จึงยังอยู่ครบ)
      // ท่าที่ต้องกลับด้านเทียบกับท่ายืน (ดู กลับด้านสำหรับ):
      //   dodge — ในคลิปตัวพุ่งไปทางขวา ต้องกลับให้หลบ "ออกจาก" คู่ต่อสู้เสมอ
      //   hit   — คลิปนี้ AI สร้างมากลับด้าน (ถือคทามือซ้ายของจอ ท่าอื่นถือขวา) และตัวเด้งไปทางขวา
      //           กลับด้านแล้วคทาอยู่ข้างเดิม และตัวเด้งถอยออกจากฝั่งที่ถูกยิงมา (วัดเฟรมจริง 2026-11-08)
      flip: { dodge: true, hit: true },
      fit: {
        anchor: { x: 433, y: 432 },
        cast: { s: 360 / 440, ax: 384, ay: 476 },
        hit: { s: 360 / 320, ax: 436, ay: 418 },
        dodge: { s: 360 / 336, ax: 431, ay: 396 }
      },
      // [เพิ่ม 2026-11-08] คลิปท่าร่ายของ Pixie ปล่อยก้อนพลังสีขาวเหลืองก้อนใหญ่ออกจากคทาเองในคลิป
      // (วัดจากเฟรมจริงด้วย ffmpeg): หลุดจากคทาที่ 3.3 วินาที จุดศูนย์กลาง (665, 260) ในเฟรม 864×496
      // ขนาดราว 100px — ตั้งแต่วินาทีนั้นจะลบพิกเซลสว่าง (ก้อนพลัง/ประกาย) ทางขวาของ x 645 ทิ้ง แล้วให้โค้ดวาดก้อนพลัง
      // ขนาด/สีเดียวกันบินต่อไปหาเป้า ก้อนที่เห็นตอนร่ายกับก้อนที่ยิงออกไปจึงเป็นก้อนเดียวกัน
      castRelease: {
        at: 3.3,
        x: 665, y: 260, size: 100,
        eraseRightOf: 645,
        // สีแสงเก็บจากเฟรมคลิป (เป็นสีของเอฟเฟกต์ในคลิป ไม่ใช่สี UI จึงไม่ได้มาจาก token)
        glow: ["rgba(255,255,250,1)", "rgba(255,248,200,0.95)", "rgba(255,236,150,0.45)", "rgba(255,230,140,0)"]
      }
    }
  };

  var ท่าทั้งหมด = ["idle", "cast", "hit", "dodge"];

  // พื้นหลังคลิปเป็นสีน้ำเงิน (ดู comment ใน battle-test.html เรื่องไล่เฉด) — ค่าเดียวกับที่ทดสอบผ่านแล้ว
  function ความโปร่งใส(r, g, b) {
    if (b > 150 && b - r > 60 && b - g > 40) return 0;
    // [เพิ่ม 2026-11-08] ขอบแสงฟุ้งรอบคทา (ฟ้าอ่อนอมเขียว เช่น 190,235,255) ไม่ผ่านเกณฑ์ข้างบน
    // จึงค้างเป็นวงแสงสีฟ้า — ให้จางตามความ "ฟ้า" แทน · ปลอดภัยกับตัวละคร เพราะสีเขียว/น้ำตาล/ขาว
    // ของตัวละครมี b ไม่เกิน g หรือ b แทบเท่า r เสมอ
    if (b > g && b - r > 25) return Math.max(0, Math.min(255, 255 - (b - r - 25) * 7));
    return 255;
  }

  // พิกัดในเฟรมคลิป → พิกัดบน canvas ตัวละคร หลังปรับขนาดตาม fit ของท่านั้น (ไม่มี fit = เท่าเดิม)
  function แปลงตามfit(fit, x, y) {
    if (!fit) return { x: x, y: y, s: 1 };
    return { x: fit.tx + (x - fit.ax) * fit.s, y: fit.ty + (y - fit.ay) * fit.s, s: fit.s };
  }

  function วาดแบบคีย์สี(ctx, video, w, h, srcRect, fit) {
    if (srcRect) {
      ctx.drawImage(video, srcRect.x, srcRect.y, srcRect.w, srcRect.h, 0, 0, w, h);
    } else if (fit) {
      // canvas ตัวละครขนาดเท่าเฟรมคลิป (864×496) — วาดย่อ/ขยายแล้วเลื่อนให้จุดยึดตรงกับมาตรฐาน
      var มุม = แปลงตามfit(fit, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(video, มุม.x, มุม.y, w * fit.s, h * fit.s);
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

    // ท่าที่ระบุใน config.flip กลับด้านจากท่าปกติเสมอ (เหตุผลของแต่ละท่าอยู่ที่ PET_CLIP_CONFIG)
    function กลับด้านสำหรับ(ท่า) {
      var ต้องกลับ = config.flip ? !!config.flip[ท่า] : ท่า === "dodge";
      return ต้องกลับ ? !หันซ้าย : หันซ้าย;
    }

    // จังหวะปล่อยก้อนพลังของท่าร่าย (ถ้าสายพันธุ์นี้มี castRelease) — resolve เมื่อคลิปเดินถึงวินาทีที่กำหนด
    var รอปล่อย = null;   // { resolve } ระหว่างเล่นท่าร่าย
    var ลบขวา = false;     // หลังปล่อยแล้ว ลบส่วนขวาของเฟรมท่าร่าย (ก้อนพลังของคลิป) ทิ้ง

    // fit ของแต่ละท่า พร้อมจุดปลายทาง (tx, ty) = จุดมาตรฐานของ idle
    var fitของท่า = {};
    ท่าทั้งหมด.forEach(function (ท่า) {
      var f = config.fit && config.fit[ท่า];
      fitของท่า[ท่า] = f ? { s: f.s, ax: f.ax, ay: f.ay, tx: config.fit.anchor.x, ty: config.fit.anchor.y } : null;
    });

    function วนวาด() {
      if (หยุดวาด) return;
      if (ปัจจุบัน.readyState >= 2) {
        var ท่าที่เล่น = ท่าทั้งหมด.filter(function (k) { return วิดีโอ[k] === ปัจจุบัน; })[0];
        วาดแบบคีย์สี(ctx, ปัจจุบัน, canvas.width, canvas.height, null, fitของท่า[ท่าที่เล่น]);
        var ปล่อย = config.castRelease;
        if (ปล่อย && ปัจจุบัน === วิดีโอ.cast) {
          if (รอปล่อย && ปัจจุบัน.currentTime >= ปล่อย.at) {
            ลบขวา = true;
            var r = รอปล่อย.resolve;
            รอปล่อย = null;
            r();
          }
          if (ลบขวา) {
            // ลบเฉพาะพิกเซลสว่างขาวเหลือง (ก้อนพลัง + ประกาย) ทางขวาของคทา — ไม่ลบทั้งแถบ
            // เพราะท่าตามหลังการยิงมีปลายปีกยื่นเข้ามาในแถบนั้น (ลบทั้งแถบแล้วปีกขาดเป็นเส้นตรง)
            // eraseRightOf เป็นพิกัดในเฟรมคลิป — แปลงตาม fit ของท่าร่ายก่อน (canvas ขนาดเท่าเฟรม)
            var x0 = Math.max(0, Math.round(แปลงตามfit(fitของท่า.cast, ปล่อย.eraseRightOf, 0).x));
            var ส่วนขวา = ctx.getImageData(x0, 0, canvas.width - x0, canvas.height);
            var px = ส่วนขวา.data;
            for (var i = 0; i < px.length; i += 4) {
              // สว่างขาวเหลือง = แกนก้อนพลัง/ประกาย · อมฟ้า (b > r) = วงแสงฟุ้งรอบก้อน
              // ปีก/ตัว/คทาเป็นเขียว-น้ำตาล (b < r เสมอ) จึงไม่โดนลบ
              if ((px[i] > 200 && px[i + 1] > 190) || px[i + 2] > px[i]) px[i + 3] = 0;
            }
            ctx.putImageData(ส่วนขวา, x0, 0);
          }
        }
      }
      requestAnimationFrame(วนวาด);
    }
    วนวาด();

    // เริ่มท่าร่ายแล้วคืน { ปล่อย: Promise (ตอนก้อนพลังหลุดจากคทา), จบ: Promise (คลิปจบ) }
    // สายพันธุ์ที่ไม่มี castRelease: ปล่อยตอนคลิปจบ (พฤติกรรมเดิม)
    function เล่นท่าร่าย() {
      ลบขวา = false;
      var จบ = เล่น("cast", false);
      if (!config.castRelease) return { ปล่อย: จบ, จบ: จบ };
      var ปล่อย = new Promise(function (resolve) { รอปล่อย = { resolve: resolve }; });
      // กันค้าง: ถ้าคลิปจบก่อนถึงจังหวะปล่อย (เช่นโหลดไม่ได้) ให้ปล่อยตอนจบ
      จบ.then(function () {
        if (รอปล่อย) { var r = รอปล่อย.resolve; รอปล่อย = null; r(); }
      });
      return { ปล่อย: ปล่อย, จบ: จบ };
    }

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
    return { canvas: canvas, เล่น: เล่น, เล่นท่าร่าย: เล่นท่าร่าย, ทำลาย: function () { หยุดวาด = true; } };
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

    // ลูกพลังงานที่ยิงตรงแนวนอนจากคทาไปหาเป้า — ใช้คลิป projectile ของฝ่ายผู้ยิง (ปักไว้เฟรมเดียว)
    // [เปลี่ยน 2026-11-08] จาก "ยิงขึ้นฟ้าแล้วร่วง" เป็น "ยิงตรงแนวนอน" หลังทดลองเทียบ 4 แบบใน
    // experiments/attack-style-compare/ — คลิปท่าร่าย (ยื่นคทาไปข้างหน้า) และคลิปลูกพลัง (บินแนวนอน)
    // ที่มีอยู่เข้ากับแนวนอนพอดี ไม่ต้องทำคลิปใหม่ · ปัญหาเดิมของแนวนอน (ก.ย.) คือให้คลิปพาลูกข้ามจอเอง
    // รอบนี้โค้ดเป็นคนพาลูกไป จึงเล็งตรงเป้าทุกครั้ง
    var canvasลูก = ที่วาง.querySelector(".battle-projectile");
    var ctxลูก = canvasลูก.getContext("2d", { willReadFrequently: true });
    var วิดีโอลูก = { A: วิดีโอเงียบ(), B: วิดีโอเงียบ() };
    blobของ(configA.base + "projectile.mp4").then(function (u) { วิดีโอลูก.A.src = u; }).catch(function (e) { console.error(e); });
    blobของ(configB.base + "projectile.mp4").then(function (u) { วิดีโอลูก.B.src = u; }).catch(function (e) { console.error(e); });
    var ลูกที่ใช้ = null;
    var rectลูกที่ใช้ = null;
    var แสงที่ใช้ = null;   // สีแสงของ castRelease — ถ้ามี วาดก้อนพลังด้วยโค้ดแทนคลิป projectile
    var หยุดวาดลูก = false;
    (function วนวาดลูก(ตอนนี้) {
      if (หยุดวาดลูก) return;
      if (แสงที่ใช้) {
        วาดก้อนแสง(ตอนนี้ || 0);
      } else if (ลูกที่ใช้ && ลูกที่ใช้.readyState >= 2) {
        วาดแบบคีย์สี(ctxลูก, ลูกที่ใช้, canvasลูก.width, canvasลูก.height, rectลูกที่ใช้);
      }
      requestAnimationFrame(วนวาดลูก);
    })();

    // ก้อนแสงแบบเดียวกับในคลิปท่าร่าย: แกนขาว → เหลืองอ่อน → แสงฟุ้งจางออก (กระพริบเบาๆ)
    function วาดก้อนแสง(ตอนนี้) {
      var w = canvasลูก.width, h = canvasลูก.height;
      var กระพริบ = 1 + 0.06 * Math.sin(ตอนนี้ / 70);
      ctxลูก.clearRect(0, 0, w, h);
      var g = ctxลูก.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, (w / 2) * กระพริบ);
      // แกนทึบขาวราว 1 ใน 3 ของรัศมี (ตรงกับก้อนในคลิปที่แกนสว่างจัด) แล้วค่อยฟุ้งจางออก
      g.addColorStop(0, แสงที่ใช้[0]);
      g.addColorStop(0.32, แสงที่ใช้[0]);
      g.addColorStop(0.5, แสงที่ใช้[1]);
      g.addColorStop(0.72, แสงที่ใช้[2]);
      g.addColorStop(1, แสงที่ใช้[3]);
      ctxลูก.fillStyle = g;
      ctxลูก.fillRect(0, 0, w, h);
    }

    // เวลาบินของลูกพลัง (ms) — โดน/บล็อก: หยุดที่เป้า · พลาด: เฉียดเหนือหัวแล้วเลยออกไป
    var เวลาบินถึงเป้า = 450;
    var เวลาบินพลาด = 700;

    // จุดในสนาม (พิกัดเทียบกับ .battle-arena): ปลายคทาของผู้ยิง (ค่อนไปทางคู่ต่อสู้ ระดับอก) / ลำตัวของเป้า
    function จุดของ(ฝั่งไหน, ส่วน) {
      var a = สนาม.getBoundingClientRect();
      var r = ฝั่ง[ฝั่งไหน].getBoundingClientRect();
      var กลางX = r.left - a.left + r.width / 2;
      var บน = r.top - a.top;
      if (ส่วน === "คทา") {
        return { x: กลางX + (ฝั่งไหน === "A" ? 1 : -1) * r.width * 0.18, y: บน + r.height * 0.45 };
      }
      return { x: กลางX, y: บน + r.height * 0.55, สูง: r.height };
    }

    // แปลงพิกัดในเฟรมคลิป (864×496) เป็นพิกัดในสนาม — ฝั่ง B กลับด้านภาพ จึงกลับแกน x ด้วย
    function จุดจากเฟรม(ฝั่งไหน, fx, fy) {
      var a = สนาม.getBoundingClientRect();
      var r = ฝั่ง[ฝั่งไหน].getBoundingClientRect();
      var สัดส่วนX = ฝั่งไหน === "B" ? 1 - fx / 864 : fx / 864;
      return { x: r.left - a.left + r.width * สัดส่วนX, y: r.top - a.top + r.height * (fy / 496), กว้าง: r.width };
    }

    function วางลูก(x, y) {
      canvasลูก.style.left = (x - canvasลูก.offsetWidth / 2) + "px";
      canvasลูก.style.top = (y - canvasลูก.offsetHeight / 2) + "px";
    }

    function ยิงตรงไปหา(ฝั่งเป้าหมาย, ฝั่งผู้ยิง, โดน) {
      return new Promise(function (resolve) {
        var config = ฝั่งผู้ยิง === "A" ? configA : configB;
        var ปล่อย = config.castRelease;
        var ต้น;
        if (ปล่อย) {
          // ก้อนพลังจากท่าร่าย: เริ่มที่ตำแหน่งเดียวกับก้อนในคลิป ขนาดเท่ากัน (ตามสัดส่วนตัวละครบนจอ)
          // ตำแหน่ง/ขนาดในคลิปต้องผ่าน fit ของท่าร่ายเหมือนตัวละคร ไม่งั้นจุดปล่อยเพี้ยนจากคทา
          var fitร่าย = config.fit && config.fit.cast
            ? { s: config.fit.cast.s, ax: config.fit.cast.ax, ay: config.fit.cast.ay, tx: config.fit.anchor.x, ty: config.fit.anchor.y }
            : null;
          var จุดในcanvas = แปลงตามfit(fitร่าย, ปล่อย.x, ปล่อย.y);
          ต้น = จุดจากเฟรม(ฝั่งผู้ยิง, จุดในcanvas.x, จุดในcanvas.y);
          var ขนาด = Math.round(ต้น.กว้าง * (ปล่อย.size * จุดในcanvas.s / 864) * 1.6); // ×1.6 เผื่อแสงฟุ้งรอบแกน
          canvasลูก.width = 128;            // ต้องเป็นจัตุรัส ไม่งั้นก้อนแสงถูกยืดเป็นวงรี
          canvasลูก.height = 128;
          canvasลูก.style.width = ขนาด + "px";
          canvasลูก.style.height = ขนาด + "px";
          แสงที่ใช้ = ปล่อย.glow;
          ลูกที่ใช้ = null;
        } else {
          canvasลูก.width = 200;            // ขนาดเดิมของ canvas ลูกพลังจากคลิป
          canvasลูก.height = 120;
          canvasลูก.style.width = "";
          canvasลูก.style.height = "";
          แสงที่ใช้ = null;
          ลูกที่ใช้ = วิดีโอลูก[ฝั่งผู้ยิง];
          rectลูกที่ใช้ = config.projectileRect;
          ลูกที่ใช้.currentTime = 1.0;     // เฟรมแรกของคลิปยังไม่มีลูกพลัง — ปักไว้ช่วงที่เห็นลูกชัด
          ลูกที่ใช้.playbackRate = 0.0625;
          var p = ลูกที่ใช้.play();
          if (p && p.catch) p.catch(function () {});
          ต้น = จุดของ(ฝั่งผู้ยิง, "คทา");
        }

        var เป้า = จุดของ(ฝั่งเป้าหมาย, "ลำตัว");
        // พลาด = เฉียดเหนือหัวแล้วบินเลยต่อไปจนพ้นขอบสนาม
        var ปลายX = โดน ? เป้า.x : เป้า.x + (เป้า.x - ต้น.x) * 0.7;
        var ปลายY = โดน ? เป้า.y : เป้า.y - เป้า.สูง * 0.45;
        var นาน = โดน ? เวลาบินถึงเป้า : เวลาบินพลาด;

        // คลิปลูกพลังบินไปทางขวา — ฝั่ง B ยิงกลับทาง ต้องกลับด้านให้หางลูกพลังชี้ถูก
        canvasลูก.style.transform = ฝั่งผู้ยิง === "B" ? "scaleX(-1)" : "none";
        วางลูก(ต้น.x, ต้น.y);
        canvasลูก.style.opacity = "1";

        var เริ่ม = performance.now();
        (function ก้าว(ตอนนี้) {
          var t = Math.min(1, (ตอนนี้ - เริ่ม) / นาน);
          วางลูก(ต้น.x + (ปลายX - ต้น.x) * t, ต้น.y + (ปลายY - ต้น.y) * t);
          if (t < 1) {
            requestAnimationFrame(ก้าว);
          } else {
            canvasลูก.style.opacity = "0";
            resolve();
          }
        })(เริ่ม);
      });
    }

    function รอ(ms) {
      return new Promise(function (r) { setTimeout(r, ms); });
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
        var ร่าย = ตัวละคร[ผู้ยิง].เล่นท่าร่าย();
        // ยิงตอนก้อนพลังหลุดจากคทา (ไม่ต้องรอท่าร่ายจบ) — ท่าตามหลังการยิงของผู้ยิงเล่นต่อจนจบคลิป
        return ร่าย.ปล่อย.then(function () {
          var พลาด = ผลลัพธ์ === "miss";
          var การบิน = ยิงตรงไปหา(เป้า, ผู้ยิง, !พลาด);
          // ท่าโดนเริ่มตอนลูกถึงเป้าพอดี — ท่าหลบเริ่มทันทีที่ปล่อยลูก เพราะคลิปหลบมีช่วงออกตัว
          // ราว 0.1–0.2 วินาที และลูกที่พลาดผ่านตัวเป้าที่ราว 0.4 วินาที (วัดจากภาพจริง 2026-11-08)
          var ท่ารับ = รอ(พลาด ? 0 : เวลาบินถึงเป้า).then(function () {
            if (พลาด) return ตัวละคร[เป้า].เล่น("dodge", false);
            if (ผลลัพธ์ === "block") {
              // ยังไม่มีคลิปท่าบล็อก — ยืนรับ + เอฟเฟกต์โล่ (CSS) แทน
              ฝั่ง[เป้า].classList.remove("is-blocking");
              void ฝั่ง[เป้า].offsetWidth;
              ฝั่ง[เป้า].classList.add("is-blocking");
              return null;
            }
            return ตัวละคร[เป้า].เล่น("hit", false);
          });
          return Promise.all([การบิน, ท่ารับ, ร่าย.จบ]);
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
