// ─────────────────────────────────────────────────────────────
// js/ai.js — ตัวช่วยเรียก AI ใช้ร่วมกันหลายหน้า
//
// [แก้ 2026-11-03 — ปิดช่องโหว่ที่สำคัญที่สุดใน BACKLOG.md] เดิมไฟล์นี้เรียก
// OpenRouter ตรงจากเบราว์เซอร์พร้อมคีย์ลับ ทำให้ใครก็ตามที่เปิด DevTools → Network
// เห็นคีย์ได้ทันที — ตอนนี้เรียกผ่าน **ตัวกลางที่รันในเครื่องของครูเอง**
// (`local-ai-proxy/server.js`) แทน เลือกทางนี้แทน Cloud Function (`functions/`
// ที่เขียนสำรองไว้แล้วแต่ยังไม่ได้ใช้ เพราะต้องอัปเกรด Firebase เป็น Blaze plan/ผูกบัตร
// ซึ่งผู้ใช้เลือกว่ายังไม่อยากทำตอนนี้) — คีย์ OpenRouter จริงจึงอยู่ในเครื่องของครูเท่านั้น
// ไม่เคยถูกส่งขึ้นเซิร์ฟเวอร์ไหนหรือฝังในโค้ดที่ deploy เลย
//
// window.AI_CONFIG (จาก js/ai-config.js ที่ .gitignore ไว้) ตอนนี้ใช้แค่เลือก model
// เท่านั้น — ไม่มี apiKey อีกต่อไป (ดู js/ai-config.example.js)
//
// **หมายเหตุสำคัญ:** ปุ่ม AI ทั้ง 2 จุด (ออกข้อสอบ/สรุปภาพรวมนักเรียน) เป็นฟีเจอร์ของ
// ครูเท่านั้น ไม่มีนักเรียนคนไหนต้องใช้เลย — ครูต้องรัน `local-ai-proxy/server.js`
// บนเครื่องตัวเองก่อนทุกครั้งที่จะกดปุ่ม AI (ดูวิธีรันที่ CLAUDE.md หัวข้อ "AI proxy
// แบบรันในเครื่อง") ใช้ได้ทั้งตอนเปิดเว็บ dev ในเครื่องและเว็บจริงที่ deploy แล้ว
// (เบราว์เซอร์อนุญาตหน้า https:// เรียก http://localhost ได้ เป็นข้อยกเว้นมาตรฐาน)
// ถ้าไม่ได้รัน proxy ไว้ ปุ่ม AI จะขึ้น error "เชื่อมต่อ AI proxy ในเครื่องไม่ได้"
// ─────────────────────────────────────────────────────────────

var AI_PROXY_URL = "http://localhost:8787/callAI";

// ส่ง messages แบบเดียวกับ OpenAI chat format ไปให้ AI ผ่าน proxy ในเครื่องของครู
// timeoutMs: เกินเวลานี้แล้วยังไม่ตอบ ให้ยกเลิกและโยน error ออกมา (ค่าเริ่มต้น 15 วินาที)
async function เรียกโมเดลAI(messages, timeoutMs) {
  var ตัวควบคุม = new AbortController();
  var ตัวจับเวลา = setTimeout(function () { ตัวควบคุม.abort(); }, timeoutMs || 15000);

  try {
    var res;
    try {
      res = await fetch(AI_PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: window.AI_CONFIG && window.AI_CONFIG.model, messages: messages }),
        signal: ตัวควบคุม.signal
      });
    } catch (เครือข่ายล้มเหลว) {
      if (เครือข่ายล้มเหลว.name === "AbortError") throw เครือข่ายล้มเหลว;
      throw new Error("เชื่อมต่อ AI proxy ในเครื่องไม่ได้ — ต้องรัน local-ai-proxy/server.js บนเครื่องนี้ก่อน (ดู CLAUDE.md)");
    }

    var data = await res.json().catch(function () { return {}; });

    if (!res.ok) {
      throw new Error(data.error || ("HTTP " + res.status));
    }
    if (!data.content) {
      throw new Error("รูปแบบคำตอบไม่ถูกต้อง");
    }
    return data.content;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("รอนานเกิน 15 วินาที ไม่ได้รับคำตอบจาก AI");
    }
    throw err;
  } finally {
    clearTimeout(ตัวจับเวลา);
  }
}
