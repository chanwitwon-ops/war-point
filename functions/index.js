// ─────────────────────────────────────────────────────────────
// functions/index.js — Cloud Function กลางสำหรับเรียก OpenRouter
//
// แก้หัวข้อ BACKLOG.md "ย้ายคีย์ AI ไปไว้ฝั่งที่ผู้ใช้แตะไม่ได้" — เดิม js/ai.js
// เรียก OpenRouter ตรงจากเบราว์เซอร์ ทำให้คีย์หลุดออกไปกับทุก request (เห็นได้จาก
// DevTools → Network) ตอนนี้คีย์อยู่ที่นี่เท่านั้น (Secret Manager ของ Firebase)
// เบราว์เซอร์เรียกมาที่ฟังก์ชันนี้แทน ไม่เห็นคีย์จริงเลย
//
// Deploy: ดูขั้นตอนเต็มที่ CLAUDE.md หัวข้อ "Cloud Function (AI proxy)"
// ─────────────────────────────────────────────────────────────

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

const OPENROUTER_API_KEY = defineSecret("OPENROUTER_API_KEY");

// กันไม่ให้ใครยิง request มาสั่งโมเดลแปลกๆ ที่แพงกว่า/ไม่ได้ตั้งใจให้ใช้
const ALLOWED_MODELS = ["google/gemini-2.5-flash-lite"];

exports.callAI = onRequest(
  { secrets: [OPENROUTER_API_KEY], cors: true, timeoutSeconds: 30, region: "asia-southeast1" },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "ใช้ POST เท่านั้น" });
      return;
    }

    // ── ตรวจ Firebase ID token จาก header Authorization: Bearer <token> ──
    var authHeader = req.get("Authorization") || "";
    var match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      res.status(401).json({ error: "ต้องล็อกอินก่อนใช้ฟีเจอร์ AI" });
      return;
    }

    var decoded;
    try {
      decoded = await admin.auth().verifyIdToken(match[1]);
    } catch (err) {
      res.status(401).json({ error: "เซสชันหมดอายุ — กรุณาล็อกอินใหม่" });
      return;
    }

    // ── ฟีเจอร์ AI ทั้ง 2 จุดในแอป (ออกข้อสอบ/สรุปภาพรวมนักเรียน) เป็นปุ่มของ teacher
    // เท่านั้น — ตรวจซ้ำฝั่งเซิร์ฟเวอร์ด้วย ไม่พึ่งแค่ UI ซ่อนปุ่ม ──
    var userDoc = await admin.firestore().collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "teacher") {
      res.status(403).json({ error: "ฟีเจอร์นี้สำหรับครูเท่านั้น" });
      return;
    }

    var body = req.body || {};
    var messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "ต้องส่ง messages เป็น array ไม่ว่าง" });
      return;
    }
    var โมเดลที่ใช้ = ALLOWED_MODELS.indexOf(body.model) !== -1 ? body.model : ALLOWED_MODELS[0];

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);

    try {
      var upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + OPENROUTER_API_KEY.value(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model: โมเดลที่ใช้, messages: messages }),
        signal: controller.signal
      });

      if (!upstream.ok) {
        res.status(502).json({ error: "OpenRouter ตอบกลับผิดพลาด: HTTP " + upstream.status });
        return;
      }

      var data = await upstream.json();
      var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!content) {
        res.status(502).json({ error: "รูปแบบคำตอบจาก OpenRouter ไม่ถูกต้อง" });
        return;
      }

      res.status(200).json({ content: content.trim() });
    } catch (err) {
      if (err.name === "AbortError") {
        res.status(504).json({ error: "รอนานเกิน 15 วินาที ไม่ได้รับคำตอบจาก AI" });
      } else {
        console.error(err);
        res.status(500).json({ error: "เรียก AI ไม่สำเร็จ: " + err.message });
      }
    } finally {
      clearTimeout(timeout);
    }
  }
);
