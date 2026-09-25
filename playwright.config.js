// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  fullyParallel: false, // ทดสอบ Firestore จริง รันทีละตัวกันข้อมูลชนกัน
  // fullyParallel: false ทำให้เทสต์ "ในไฟล์เดียวกัน" รันเรียงกัน แต่ Playwright ยังสั่ง
  // รันคนละไฟล์พร้อมกันคนละ worker ได้อยู่ดีถ้าไม่ได้บังคับ workers ไว้ — ที่นี่ทุกไฟล์ตี
  // Firestore จริงร่วมกันด้วยบัญชีเดียวกัน (teacher/student1/student2) จึงบังคับ
  // workers: 1 ให้รันทีละไฟล์จริงๆ ตามเจตนาที่ comment ด้านบนบอกไว้
  workers: 1,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "tests/results.json" }]],
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3001",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
