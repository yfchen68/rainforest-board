/* ============================================================
   db.js｜連線層
   ------------------------------------------------------------
   - 沒設定 Firebase 時自動進入示範模式（假資料，不連外）
   - 送不出去的回報會排隊存在瀏覽器裡，連線恢復自動補送
   - 刻意寫成一般 script（不是 module），這樣直接用瀏覽器
     打開檔案（file://）也能測，不用架伺服器
   - 這個檔案不用改
   ============================================================ */
(function () {
  var CFG = window.FIREBASE_CONFIG || {};
  var DEMO = !CFG.apiKey;

  /* 場次：兩場資料完全分開，路徑是 reports/{場次}/teachers/{老師} */
  var SESSION = window.SESSION || "s1";
  var COLL = "reports/" + SESSION + "/teachers";
  var SESSION_INFO = (window.SESSIONS && window.SESSIONS[SESSION]) || { label: SESSION, date: "" };

  /* 名單也跟著場次走，index.html 與 board.html 只要讀 window.ROSTER 就好 */
  window.ROSTER = (window.ROSTERS && window.ROSTERS[SESSION]) || window.ROSTER || [];

  var QUEUE_KEY = "rainforest_queue_" + SESSION;
  var DEMO_KEY = "rainforest_demo_" + SESSION;
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  var fb = null;

  /* ---------- 初始化 ---------- */
  function ensure() {
    if (DEMO) return Promise.resolve(null);
    if (fb) return Promise.resolve(fb);
    return Promise.all([
      import(SDK + "firebase-app.js"),
      import(SDK + "firebase-firestore.js")
    ]).then(function (mods) {
      var app = mods[0].initializeApp(CFG);
      fb = { fs: mods[1], db: mods[1].getFirestore(app) };
      return fb;
    });
  }

  /* ---------- 工具 ---------- */
  function docKey(name) {
    return String(name).trim().replace(/[\/\.\#\$\[\]]/g, "_").slice(0, 100) || "unknown";
  }
  function nowHM() {
    var d = new Date();
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  /* ---------- 待送佇列 ---------- */
  function readQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch (e) { return []; }
  }
  function writeQueue(q) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
  }

  function push(rec) {
    return ensure().then(function (h) {
      var ref = h.fs.doc(h.db, COLL, docKey(rec.name));
      var body = Object.assign({}, rec, { updatedAt: h.fs.serverTimestamp() });
      return h.fs.setDoc(ref, body, { merge: true });
    });
  }

  /* 權限被拒 ≠ 網路不通。前者重試一百次也不會成功，
     多半是安全規則過期、或規則路徑跟 SESSION 對不上。 */
  function isDenied(e) {
    var s = String((e && (e.code || e.message)) || "");
    return s.indexOf("permission-denied") >= 0 || s.indexOf("PERMISSION_DENIED") >= 0
        || s.indexOf("Missing or insufficient permissions") >= 0;
  }

  /* ---------- 送出一筆回報 ---------- */
  function report(payload) {
    var rec = Object.assign({}, payload, { updatedAtLocal: Date.now(), updatedAtHM: nowHM() });
    if (DEMO) {
      var all = demoRead();
      all[docKey(rec.name)] = Object.assign({}, all[docKey(rec.name)] || {}, rec);
      demoWrite(all);
      return Promise.resolve({ ok: true, demo: true });
    }
    return push(rec).then(function () {
      return { ok: true };
    }).catch(function (e) {
      if (isDenied(e)) {
        console.error("Firestore 拒絕寫入。檢查：①安全規則的到期日是不是過了 " +
                      "②規則路徑是不是 reports/{session}/teachers/{teacher} " +
                      "③目前 SESSION = " + SESSION + "，寫入路徑 = " + COLL, e);
        return { ok: false, denied: true, error: String((e && e.message) || e) };
      }
      var q = readQueue(); q.push(rec); writeQueue(q);
      return { ok: false, queued: true, error: String((e && e.message) || e) };
    });
  }

  /* ---------- 補送 ---------- */
  function startRetryLoop(onChange) {
    function tick() {
      var q = readQueue();
      if (!q.length || DEMO) return;
      var rest = [];
      var chain = Promise.resolve();
      q.forEach(function (rec) {
        chain = chain.then(function () {
          return push(rec).catch(function (e) {
            /* 權限問題丟回佇列也沒用，直接放棄，免得無限重試 */
            if (!isDenied(e)) rest.push(rec);
          });
        });
      });
      chain.then(function () {
        writeQueue(rest);
        if (onChange) onChange(rest.length);
      });
    }
    setInterval(tick, 5000);
    window.addEventListener("online", tick);
    tick();
  }

  /* ---------- 訂閱全場狀態 ---------- */
  function subscribe(cb) {
    if (DEMO) {
      var emit = function () { cb(Object.keys(demoRead()).map(function (k) { return demoRead()[k]; })); };
      emit();
      setInterval(emit, 1500);
      window.addEventListener("storage", emit);
      return;
    }
    ensure().then(function (h) {
      h.fs.onSnapshot(h.fs.collection(h.db, COLL), function (snap) {
        cb(snap.docs.map(function (d) { return d.data(); }));
      }, function (err) {
        console.error("看板連線中斷：", err);
        cb(null, err);
      });
    }).catch(function (err) {
      console.error("Firebase 載入失敗：", err);
      cb(null, err);
    });
  }

  /* ---------- 示範模式：資料存在本機 ---------- */
  function demoRead() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY) || "{}"); } catch (e) { return {}; }
  }
  function demoWrite(o) {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(o)); } catch (e) {}
  }
  function demoSeed() {
    var roster = window.ROSTER || [];
    var states = ["進行中", "通過", "卡住", "未開始"];
    var blockers = [
      "系所 PO 對映卡住，不確定算不算已涵蓋",
      "焦點議題拿掉技術詞之後好像什麼都不剩",
      "Milestone 刪不下手，每個都覺得重要",
      "R2 跟 R3 只差在數量，怕學生只求數量不管品質"
    ];
    var out = {};
    roster.forEach(function (t, i) {
      if (i % 5 === 4) return; // 留幾個未回報
      var s = states[i % states.length];
      out[docKey(t.name)] = {
        name: t.name, school: t.school, domain: t.domain, table: t.table,
        gate1: (i % 3 === 0) ? "通過" : s,
        gate2: (i > 2) ? s : "未開始",
        gate3: "未開始",
        blocker: (s === "卡住") ? blockers[i % blockers.length] : "",
        needField: (i % 4 === 0),
        siteUrl: (i % 3 === 0) ? "https://example.notion.site/demo" : "",
        updatedAtHM: nowHM()
      };
    });
    demoWrite(out);
  }
  function demoClear() { demoWrite({}); }

  /* ---------- 壓測用：刪掉指定開頭的資料 ---------- */
  function wipePrefix(prefix) {
    if (DEMO) {
      var all = demoRead(), n = 0;
      Object.keys(all).forEach(function (k) {
        if (String(all[k].name || "").indexOf(prefix) === 0) { delete all[k]; n++; }
      });
      demoWrite(all);
      return Promise.resolve(n);
    }
    return ensure().then(function (h) {
      return h.fs.getDocs(h.fs.collection(h.db, COLL)).then(function (snap) {
        var jobs = [];
        snap.forEach(function (docSnap) {
          var nm = String((docSnap.data() || {}).name || "");
          if (nm.indexOf(prefix) === 0) jobs.push(h.fs.deleteDoc(docSnap.ref));
        });
        return Promise.all(jobs).then(function () { return jobs.length; });
      });
    });
  }

  window.DB = {
    wipePrefix: wipePrefix,
    DEMO: DEMO,
    session: SESSION,
    sessionLabel: SESSION_INFO.label,
    sessionDate: SESSION_INFO.date,
    path: COLL,
    docKey: docKey,
    nowHM: nowHM,
    report: report,
    startRetryLoop: startRetryLoop,
    subscribe: subscribe,
    queueLength: function () { return readQueue().length; },
    demoSeed: demoSeed,
    demoClear: demoClear
  };
})();
