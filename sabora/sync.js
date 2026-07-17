/* ============================================================
   sync.js — الحالة المشتركة بين لوحة المدرب وغرفة التمرين
   الصفحتين بيستدعوا الملف ده. غيّر سطر واحد بس تحت.
   ============================================================ */

/* ⬇⬇⬇ حط هنا لينك Realtime Database (مش Firestore) — الخطوات في آخر الملف ⬇⬇⬇ */
const FIREBASE_URL = "";
/*  مشروع fouad-perspective شغّال Firestore بس، فاللينك ده لسه مش موجود.
    بعد ما تفعّل RTDB هيبقى شكله واحد من دول حسب السيرفر اللي تختاره:
      https://fouad-perspective-default-rtdb.firebaseio.com                      (us-central1)
      https://fouad-perspective-default-rtdb.europe-west1.firebasedatabase.app   (أقرب لمصر)
    انسخ اللي الكونسول نفسه بيوريهولك — متكتبوش من دماغك.
    سيبه فاضي → الصفحتين هيشتغلوا على نفس المتصفح بس (كويس للتجربة). */

const SYNC = (() => {
  const SKEY = "sbm:state:v2";
  const RKEY = (r, l, d) => `sbm:res:${r}:${l}:${d}`;

  /* ---------- 1) Firebase عبر REST — ده اللي بيشتغل عبر ٧٥ موبايل ---------- */
  const fb = {
    mode: "firebase",
    url: p => `${FIREBASE_URL.replace(/\/$/, "")}/sbm/${p}.json`,
    async setState(s) {
      const r = await fetch(fb.url("state"), { method: "PUT", body: JSON.stringify(s) });
      if (!r.ok) throw new Error("PUT " + r.status);
    },
    async getState() {
      const r = await fetch(fb.url("state"));
      if (!r.ok) throw new Error("GET " + r.status);
      return await r.json();
    },
    async putResult(round, lap, dev, arr) {
      const r = await fetch(fb.url(`res/${round}/${lap}/${dev}`), { method: "PUT", body: JSON.stringify(arr) });
      if (!r.ok) throw new Error("PUT " + r.status);
    },
    // طلب واحد بس بيرجّع كل نتايج اللفة (أو الجولة كلها لو lap=null)
    async getResults(round, lap) {
      const r = await fetch(fb.url(lap ? `res/${round}/${lap}` : `res/${round}`));
      if (!r.ok) throw new Error("GET " + r.status);
      const j = await r.json();
      if (!j) return [];
      const out = [];
      const walk = o => Object.values(o || {}).forEach(v => Array.isArray(v) ? out.push(v) : (v && typeof v === "object" && walk(v)));
      walk(j);
      return out;
    }
  };

  /* ---------- 2) نفس المتصفح — للتجربة على اللابتوب قبل الكامب ---------- */
  const bc = (typeof BroadcastChannel !== "undefined") ? new BroadcastChannel("sbm") : null;
  const mem = { state: null, res: {} };
  const ls = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    keys(pre) { try { return Object.keys(localStorage).filter(k => k.startsWith(pre)); } catch (e) { return []; } }
  };
  const local = {
    mode: "local",
    async setState(s) { mem.state = s; ls.set(SKEY, s); bc && bc.postMessage({ t: "state", s }); },
    async getState() { return ls.get(SKEY) || mem.state; },
    async putResult(round, lap, dev, arr) { const k = RKEY(round, lap, dev); mem.res[k] = arr; ls.set(k, arr); },
    async getResults(round, lap) {
      const pre = lap ? `sbm:res:${round}:${lap}:` : `sbm:res:${round}:`;
      const ks = ls.keys(pre);
      const out = ks.map(k => ls.get(k)).filter(Array.isArray);
      if (out.length) return out;
      return Object.entries(mem.res).filter(([k]) => k.startsWith(pre)).map(([, v]) => v);
    }
  };
  if (bc) bc.onmessage = e => { if (e.data && e.data.t === "state") mem.state = e.data.s; };

  /* ---------- 3) جوه Claude — عشان المعاينة هنا تشتغل ---------- */
  const claude = {
    mode: "claude",
    async setState(s) { await window.storage.set(SKEY, JSON.stringify(s), true); },
    async getState() { const r = await window.storage.get(SKEY, true); return r && r.value ? JSON.parse(r.value) : null; },
    async putResult(round, lap, dev, arr) { await window.storage.set(RKEY(round, lap, dev), JSON.stringify(arr), true); },
    async getResults(round, lap) {
      const pre = lap ? `sbm:res:${round}:${lap}:` : `sbm:res:${round}:`;
      const l = await window.storage.list(pre, true);
      const ks = (l && l.keys) || [];
      const vals = await Promise.all(ks.map(async k => { try { const r = await window.storage.get(k, true); return JSON.parse(r.value); } catch (e) { return null; } }));
      return vals.filter(Array.isArray);
    }
  };

  /* ---------- اختيار الطبقة ---------- */
  let impl = local;
  if (FIREBASE_URL && FIREBASE_URL.trim()) impl = fb;
  else if (typeof window !== "undefined" && window.storage && window.storage.set) impl = claude;

  const label = { firebase: "متصل بكل الأجهزة", claude: "معاينة داخل Claude", local: "نفس المتصفح بس" }[impl.mode];

  return {
    mode: impl.mode,
    label,
    dev: Math.random().toString(36).slice(2, 9),
    setState: s => impl.setState(s),
    getState: () => impl.getState(),
    putResult: (r, l, d, a) => impl.putResult(r, l, d, a),
    getResults: (r, l) => impl.getResults(r, l),
    // بيرجّع true لو الوضع ده بيوصل لأجهزة تانية فعلًا
    crossDevice: impl.mode === "firebase" || impl.mode === "claude",
    /* اختبار اتصال حقيقي: بيكتب ويقرا ويمسح */
    async test(){
      if(impl.mode!=="firebase") return { ok:false, msg:"لسه شغال على "+label+". حط لينك RTDB في sync.js الأول." };
      const t = Date.now();
      try{
        const w = await fetch(fb.url("ping"), { method:"PUT", body: JSON.stringify(t) });
        if(!w.ok) return { ok:false, msg: (w.status===401||w.status===403)
            ? "القاعدة رافضة الكتابة (خطأ "+w.status+") — قواعد /sbm لسه مقفولة."
            : "الكتابة فشلت (خطأ "+w.status+") — راجع اللينك." };
        const r = await fetch(fb.url("ping"));
        const v = await r.json();
        if(v!==t) return { ok:false, msg:"كتب بس ما قراش صح — راجع اللينك." };
        await fetch(fb.url("ping"), { method:"DELETE" });
        return { ok:true, msg:"شغال. القاعدة بتستقبل وبترجّع — الموبايلات هتتزامن." };
      }catch(e){ return { ok:false, msg:"مفيش وصول للقاعدة أصلًا — اللينك غلط أو النت مقطوع." }; }
    }
  };
})();

/* ============================================================
   تشغيل RTDB على مشروع fouad-perspective — من غير ما تلمس Firestore
   ------------------------------------------------------------
   ⚠ ما تفتحش "Test mode" على المشروع. قواعد Realtime Database منفصلة
     تمامًا عن قواعد Firestore — فإحنا هنفتح مسار /sbm بس، وبيانات
     الطلبة والمعاملات في Firestore هتفضل مقفولة زي ما هي.

   1. console.firebase.google.com ← مشروع fouad-perspective
   2. Build ← Realtime Database ← Create Database
        • السيرفر: Belgium (europe-west1) — أقرب حاجة لمصر
        • ابدأ بـ Start in locked mode (مش test mode)
   3. تاب Rules ← امسح اللي فيه والصق ده ← Publish:

        {
          "rules": {
            "sbm": { ".read": true, ".write": true },
            "$rest": { ".read": false, ".write": false }
          }
        }

      كده /sbm مفتوح للتمرين، وأي مسار تاني في RTDB مقفول،
      و Firestore (courses / users / transactions / wallet) ما اتلمسش.

   4. انسخ اللينك اللي فوق الجدول في تاب Data وحطه في FIREBASE_URL فوق.
   5. ارفع التلات ملفات في نفس الفولدر: coach.html · training-room.html · sync.js
   6. افتح coach.html ← دوس «اختبر الاتصال» ← لازم تشوف رسالة خضرا.

   🧹 بعد الكامب على طول: Rules ← خلي الاتنين false، أو امسح عقدة sbm
      من تاب Data. دقيقة واحدة وتخلص.
   ============================================================ */
