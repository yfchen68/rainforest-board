/* ============================================================
   智慧雨林 Capstone 課程設計工作坊｜講師看板 設定檔
   ------------------------------------------------------------
   只要改這一個檔案。改完存檔、推上 GitHub 就生效。
   ============================================================ */

/* ---------- 1. 現在要跑哪一場 ----------
   ★★ 兩場工作坊之間，只要改這一行。★★

   改了之後：名單自動換成該場的、資料自動存到該場的位置、
   看板標題也會顯示場次。安全規則不用動。                       */

window.SESSION = "s1";

/* ---------- 2. 場次資料 ---------- */

window.SESSIONS = {
  s1: { label: "第一場", date: "＿月＿日" },
  s2: { label: "第二場", date: "＿月＿日" }

  /* 以後還有第三場、第四場，就往下加：
       , s3: { label: "第三場", date: "11/20" }
     並在 roster.js 的 ROSTERS 加一份對應名單。
     安全規則不用改，Firebase 專案也不用開新的。

     代號不一定要 s1 s2，任何不含斜線的字串都行，
     用 "2026-09-05" 或 "north" 這種有意義的名字更好認。 */
};

/* ---------- 3. Firebase 設定 ----------
   這些值是公開的、可以放進 GitHub 公開 repo——Firebase 的 apiKey
   不是密碼，只是專案識別碼，官方文件明講可以公開。真正的防護是
   Firestore 安全規則（見 README）。                            */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDPzvP_GUzk3v-9eIwaWMCHabxzMSUMn4A",
  authDomain: "rainforest-capstone-workshop.firebaseapp.com",
  projectId: "rainforest-capstone-workshop",
  storageBucket: "rainforest-capstone-workshop.firebasestorage.app",
  messagingSenderId: "231664149889",
  appId: "1:231664149889:web:aac57802b61aa36d373480"
};

window.WORKSHOP = {
  title: "智慧雨林 Capstone 課程設計工作坊"
};

/* 資料實際存放位置：reports/{場次}/teachers/{老師}
   兩場資料完全分開，第二場不會蓋掉第一場。 */

/* ---------- 4. 當天的節奏（看板頂端會顯示現在該做什麼） ---------- */

window.SCHEDULE = [
  { start: "08:30", end: "09:00", label: "報到、複製工作區", gate: null },
  { start: "09:00", end: "09:15", label: "開場",             gate: null },
  { start: "09:15", end: "10:35", label: "模組一｜主題變議題", gate: 1 },
  { start: "10:35", end: "10:45", label: "休息",             gate: 1 },
  { start: "10:45", end: "11:35", label: "模組二（上）",      gate: 2 },
  { start: "11:35", end: "12:35", label: "午餐",             gate: 2 },
  { start: "12:35", end: "13:05", label: "模組二（下）",      gate: 2 },
  { start: "13:05", end: "14:00", label: "模組三",           gate: 2 },
  { start: "14:00", end: "14:10", label: "休息",             gate: 2 },
  { start: "14:10", end: "14:45", label: "模組四",           gate: 3 },
  { start: "14:45", end: "15:45", label: "模組五",           gate: 3 },
  { start: "15:45", end: "16:00", label: "收斂：30 天行動卡", gate: 3 }
];
