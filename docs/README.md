# docs — หลักฐาน Checkpoint

โฟลเดอร์นี้ไว้เก็บภาพหน้าจอที่ GitHub มองไม่เห็นในโค้ด เช่น หน้า Firebase Console หรือ DevTools

## การบ้านที่ 2 — Module 2 (เทียบสัปดาห์ที่ 7 ของ leaveeasy)

| ไฟล์ | เนื้อหา | Checkpoint |
|---|---|---|
| `hw2-checkpoint1-incognito-login-online.png` | เปิด `https://warpoint-191be.web.app/login.html` จากหน้าต่าง **Incognito** (ไม่มี session/cache ค้าง) — โหลดจากโดเมนจริงสำเร็จ ปุ่มแสดงผลถูกต้อง | ✅ Checkpoint — Deploy ออนไลน์ใช้งานได้จริง |
| `hw2-checkpoint2-console-permission-denied.png` | จากหน้าต่าง Incognito เดียวกัน เปิด DevTools → Console → สั่งอ่าน `quizAttempts` ตรงผ่าน `window.db` โดยไม่ล็อกอิน ได้ `บล็อก: permission-denied Missing or insufficient permissions.` | ✅ Checkpoint — Firestore Security Rules บล็อกจริง ไม่ใช่แค่หน้าเว็บกันไว้ |

**สรุปสิ่งที่พิสูจน์แล้ว:**
- ต้องล็อกอินก่อนถึงจะอ่าน/เขียนข้อมูลได้ (ทั้งระดับหน้าเว็บ `js/auth-guard.js` และระดับ Firestore `firestore.rules`)
- เว็บ deploy ขึ้น Firebase Hosting จริง เข้าถึงได้จากอินเทอร์เน็ต ไม่ใช่แค่ localhost

ดูรายละเอียดสิทธิ์ตามบทบาท (student/teacher) ที่ [ACL.md](../ACL.md) — ส่วนที่มีเครื่องหมาย ⏳ ในนั้นยังไม่บังคับจริงในโค้ดวันนี้ รอการบ้านที่ 3
