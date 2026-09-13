// ─────────────────────────────────────────────────────────────
// js/ai.js — ตัวช่วยเรียก AI ผ่าน OpenRouter ใช้ร่วมกันหลายหน้า
// อ่านคีย์จาก window.AI_CONFIG (js/ai-config.js ไฟล์แยกที่ .gitignore ไว้)
// ─────────────────────────────────────────────────────────────

// ส่ง messages แบบเดียวกับ OpenAI chat format ไปให้ AI ผ่าน OpenRouter
// timeoutMs: เกินเวลานี้แล้วยังไม่ตอบ ให้ยกเลิกและโยน error ออกมา (ค่าเริ่มต้น 15 วินาที)
async function เรียกโมเดลAI(messages, timeoutMs) {
  var ตัวควบคุม = new AbortController();
  var ตัวจับเวลา = setTimeout(function () { ตัวควบคุม.abort(); }, timeoutMs || 15000);

  try {
    var res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + window.AI_CONFIG.apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: window.AI_CONFIG.model, messages: messages }),
      signal: ตัวควบคุม.signal
    });

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    var data = await res.json();
    var คำตอบ = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!คำตอบ) {
      throw new Error("รูปแบบคำตอบไม่ถูกต้อง");
    }
    return คำตอบ.trim();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("รอนานเกิน 15 วินาที ไม่ได้รับคำตอบจาก AI");
    }
    throw err;
  } finally {
    clearTimeout(ตัวจับเวลา);
  }
}
