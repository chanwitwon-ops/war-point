// ─────────────────────────────────────────────────────────────
// local-ai-proxy/server.js — ตัวกลางเรียก OpenRouter แบบรันในเครื่องของครูเอง
// (ทางเลือกแบบไม่เสียเงิน แทน functions/index.js ที่ต้องใช้ Firebase Blaze plan)
//
// แนวคิด: ปุ่ม AI ทั้ง 2 จุดในแอป ("AI ออกข้อสอบจากบทเรียน", "AI สรุปภาพรวมนักเรียน")
// เป็นการกระทำของ "ครู" เท่านั้น ไม่มีนักเรียนคนไหนต้องใช้ endpoint นี้เลย — ครูจึง
// รันสคริปต์นี้บนเครื่องตัวเองตอนจะใช้ปุ่ม AI (เหมือนเปิด static-server.ps1 ตอน dev)
// คีย์ OpenRouter จริงอยู่ในเครื่องของครูเท่านั้น ไม่เคยถูกส่งออกไปที่เซิร์ฟเวอร์อื่น
// หรือฝังในโค้ดที่ deploy ขึ้น Firebase Hosting เลย
//
// ตั้งใจ bind กับ 127.0.0.1 เท่านั้น (ไม่ใช่ 0.0.0.0) — เครื่องอื่นในวง WiFi เดียวกัน
// เรียกเข้ามาไม่ได้ ต้องเป็นเบราว์เซอร์บนเครื่องเดียวกับที่รันสคริปต์นี้เท่านั้น
// (เบราว์เซอร์อนุญาตให้หน้า https:// เรียก http://localhost ได้ เป็นข้อยกเว้นมาตรฐาน
// สำหรับเครื่องมือ dev — ใช้ได้ทั้งตอนเปิดเว็บจริงที่ deploy แล้วและตอน dev ในเครื่อง)
//
// วิธีรัน: ตั้งค่าคีย์ก่อน แล้วรันสคริปต์นี้ — ดูขั้นตอนเต็มที่ CLAUDE.md หัวข้อ
// "AI proxy แบบรันในเครื่อง (ไม่เสียเงิน)"
//   set OPENROUTER_API_KEY=sk-or-xxxxx   (PowerShell: $env:OPENROUTER_API_KEY="sk-or-xxxxx")
//   node local-ai-proxy/server.js
// ─────────────────────────────────────────────────────────────

var http = require("http");

var PORT = 8787;
var ALLOWED_MODELS = ["google/gemini-2.5-flash-lite"];

// อนุญาตทั้งเว็บจริงที่ deploy แล้วและ origin ตอน dev ในเครื่อง (ปรับเพิ่มได้ถ้าพอร์ต dev ต่างจากนี้)
var ALLOWED_ORIGINS = [
  "https://warpoint-191be.web.app",
  "https://warpoint-191be.firebaseapp.com",
  "http://localhost:3000",
  "http://localhost:3001"
];

function อ่านคีย์() {
  var คีย์ = process.env.OPENROUTER_API_KEY;
  if (!คีย์) {
    try {
      // ทางเลือกสำรอง: อ่านจากไฟล์ local-ai-proxy/key.local.js (gitignored) ถ้าไม่ได้ตั้ง env var
      คีย์ = require("./key.local.js").OPENROUTER_API_KEY;
    } catch (e) {
      คีย์ = null;
    }
  }
  return คีย์;
}

var OPENROUTER_API_KEY = อ่านคีย์();
if (!OPENROUTER_API_KEY) {
  console.error("❌ ไม่พบคีย์ OpenRouter — ตั้งค่า OPENROUTER_API_KEY เป็น environment variable ก่อนรัน");
  console.error("   หรือสร้างไฟล์ local-ai-proxy/key.local.js (ดูตัวอย่างใน key.local.example.js)");
  process.exit(1);
}

function ตั้งหัวCORS(req, res) {
  var origin = req.headers.origin;
  if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

var server = http.createServer(function (req, res) {
  ตั้งหัวCORS(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url !== "/callAI" || req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "ไม่พบ endpoint นี้ — ใช้ POST /callAI เท่านั้น" }));
    return;
  }

  var ชิ้นข้อมูล = [];
  req.on("data", function (chunk) { ชิ้นข้อมูล.push(chunk); });
  req.on("end", async function () {
    var body;
    try {
      body = JSON.parse(Buffer.concat(ชิ้นข้อมูล).toString("utf-8") || "{}");
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "รูปแบบ request body ไม่ถูกต้อง (ต้องเป็น JSON)" }));
      return;
    }

    var messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "ต้องส่ง messages เป็น array ไม่ว่าง" }));
      return;
    }
    var โมเดลที่ใช้ = ALLOWED_MODELS.indexOf(body.model) !== -1 ? body.model : ALLOWED_MODELS[0];

    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 15000);

    try {
      var upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + OPENROUTER_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ model: โมเดลที่ใช้, messages: messages }),
        signal: controller.signal
      });

      if (!upstream.ok) {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "OpenRouter ตอบกลับผิดพลาด: HTTP " + upstream.status }));
        return;
      }

      var data = await upstream.json();
      var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!content) {
        res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "รูปแบบคำตอบจาก OpenRouter ไม่ถูกต้อง" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ content: content.trim() }));
    } catch (err) {
      if (err.name === "AbortError") {
        res.writeHead(504, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "รอนานเกิน 15 วินาที ไม่ได้รับคำตอบจาก AI" }));
      } else {
        console.error(err);
        res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "เรียก AI ไม่สำเร็จ: " + err.message }));
      }
    } finally {
      clearTimeout(timeout);
    }
  });
});

server.listen(PORT, "127.0.0.1", function () {
  console.log("✅ local AI proxy พร้อมใช้งานที่ http://localhost:" + PORT + "/callAI");
  console.log("   (bind เฉพาะ 127.0.0.1 — เครื่องอื่นในวง WiFi เรียกเข้ามาไม่ได้)");
  console.log("   เปิดเว็บ war-point ทิ้งไว้ในเบราว์เซอร์เครื่องนี้แล้วกดปุ่ม AI ได้เลย");
});
