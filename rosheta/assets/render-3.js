/* =====================================================================
   render-3.js — شاشات الأقفال ٤ → ٧
   ===================================================================== */
(function () {
  var esc = MZ.esc, ar = MZ.ar, E = RXR.EXT, M = RXR.MEXT;
  var IMG = "../../mizan/assets/img/";
  function act(ctx, id) { return RXR.act(ctx, id); }
  function axc(a) { return RX_AXES[a].c; }

  /* ───── سارة وعمر ومنى ───── */
  E.trio = function (it, ctx, step, fresh) {
    var foot = it.foot ? '<div class="x-sub" style="margin-top:26px">' + esc(it.foot) + "</div>" : "";
    return '<div class="x-trio' + (it.focus ? " has-focus" : "") + '">' + ["H", "V", "B"].map(function (a) {
      var A = RX_AXES[a], on = it.show.indexOf(a) !== -1;
      if (!on) return '<div class="tp off"></div>';
      return '<div class="tp' + (it.focus === a ? " focus" : "") + '" style="--c:' + A.c + '"><div class="ph"><img src="' + IMG + A.img + '.jpg" alt=""></div><b>' + esc(A.who) + "</b>" +
        (it.focus === a ? '<div class="th">' + esc(A.th) + "</div>" : "") + '<div class="q">' + esc(A.s) + "</div></div>";
    }).join("") + "</div>" + foot;
  };
  M.trio = function (it) { var a = it.focus; return a ? '<div class="m-card"><b>' + esc(RX_AXES[a].who) + "</b>" + esc(RX_AXES[a].th) + '<div class="m-s">' + esc(RX_AXES[a].s) + "</div></div>" : '<div class="m-big">' + esc(it.foot || "") + "</div>"; };

  /* ───── التلات أسئلة ───── */
  E.q3 = function () {
    return '<div class="x-q3">' + ["H", "V", "B"].map(function (a, i) {
      var A = RX_AXES[a];
      return '<div class="qc" style="--c:' + A.c + ";animation-delay:" + (i * .25) + 's"><img src="' + IMG + A.img + '.jpg" alt=""><b>' + esc(A.q) + "</b><span>" + esc(A.guard) + "</span></div>";
    }).join("") + "</div>";
  };
  M.q3 = function () { return ["H", "V", "B"].map(function (a) { return '<div class="m-card"><b>' + esc(RX_AXES[a].q) + "</b>" + esc(RX_AXES[a].guard) + "</div>"; }).join(""); };

  /* ───── خريطة الأبعاد التسعة ───── */
  E.dims9 = function (it) {
    var hl = it.hl || [];
    return '<div class="x-d9' + (hl.length ? " has-hl" : "") + '">' + ["H", "V", "B"].map(function (a) {
      var A = RX_AXES[a];
      return '<div class="row" style="--c:' + A.c + '"><div class="ax"><img src="' + IMG + A.img + '.jpg" alt=""><b>' + esc(A.q) + "</b></div>" +
        RX_DIMS.filter(function (d) { return d.ax === a; }).map(function (d) {
          return '<div class="dc' + (hl.indexOf(d.id) !== -1 ? " hl" : "") + '"><b>' + esc(d.n) + "</b><span>" + esc(d.q) + "</span></div>"; }).join("") + "</div>";
    }).join("") + "</div>";
  };
  M.dims9 = function () { return ["H", "V", "B"].map(function (a) { return '<div class="m-card"><b>' + esc(RX_AXES[a].q) + "</b>" + RX_DIMS.filter(function (d) { return d.ax === a; }).map(function (d) { return "<div>• " + esc(d.n) + ": " + esc(d.q) + "</div>"; }).join("") + "</div>"; }).join(""); };

  /* ───── الجمل على الأبعاد (حيّة) ───── */
  function topOf(o) { var best = null, n = 0, tot = 0; Object.keys(o || {}).forEach(function (k) { tot += o[k]; if (o[k] > n) { n = o[k]; best = k; } }); return { k: best, n: n, tot: tot }; }
  function chip(id, small) { var d = rxDim(id); if (!d) return ""; return '<span class="dchip' + (small ? " s" : "") + '" style="--c:' + axc(d.ax) + '">' + esc(d.n) + "</span>"; }
  E.dimboard = function (it, ctx, step) {
    var A = act(ctx, it.act), by = A.by || {}, hot = it.hot && it.hot[step], showKey = it.keyAt !== undefined && step >= it.keyAt;
    return '<div class="x-dmb' + (hot ? " has-hot" : "") + '"><div class="lg"><span class="cnt">' + (A.n ? "جاوب " + ar(A.n) : "لسه محدش جاوب…") + "</span></div>" + it.cards.map(function (c) {
      var f = (by[c.id] || {}).d || {}, t = topOf(f), others = Object.keys(f).filter(function (k) { return k !== t.k && f[k] / Math.max(1, t.tot) >= .15; });
      return '<div class="dr' + (hot === c.id ? " hot" : "") + '"><span class="no">' + ar(c.no) + '</span><span class="t">' + esc(c.t) + '</span><span class="v">' +
        (t.k ? chip(t.k) + '<em>' + ar(Math.round(100 * t.n / t.tot)) + "٪</em>" + others.map(function (k) { return chip(k, 1); }).join("") : "") +
        (showKey && it.key[c.id] && it.key[c.id] !== t.k ? '<span class="kk">الإطار: ' + chip(it.key[c.id], 1) + "</span>" : "") + "</span></div>";
    }).join("") + "</div>";
  };
  M.dimboard = function (it, ctx, step) { var hot = it.hot && it.hot[step], c = hot && it.cards.filter(function (x) { return x.id === hot; })[0]; return c ? '<div class="m-big">جملة ' + ar(c.no) + ": " + esc(c.t) + "</div>" : ""; };

  /* ───── الأربع أسباب عند الدكتور ───── */
  var FOUR = null;
  E.four = function (it) {
    if (it.list) FOUR = it.list;
    var L = it.list || FOUR || [], up = it.upto || L.length;
    return '<div class="x-four">' + L.map(function (x, i) {
      return '<div class="f' + (i < up ? " on" : "") + (i === up - 1 ? " cur" : "") + '"><i>' + x.ic + "</i><b>" + esc(x.h) + "</b><span>" + (i < up ? esc(x.s) : "") + "</span></div>";
    }).join("") + "</div>";
  };
  M.four = function (it) { var L = it.list || FOUR || []; return L.slice(0, it.upto || L.length).map(function (x) { return '<div class="m-card"><b>' + x.ic + " " + esc(x.h) + "</b>" + esc(x.s) + "</div>"; }).join(""); };

  /* ───── الأنواع الأربعة ───── */
  E.types = function (it) {
    return '<div class="x-types">' + RX_TYPES.map(function (t) {
      var f = it.focus === t.id;
      return '<div class="ty' + (f ? " focus" : "") + '" style="--c:' + t.c + '"><div class="h"><i>' + t.ic + "</i><b>" + esc(t.n) + "</b></div>" +
        (f ? '<div class="d">' + esc(t.d) + '</div><ul>' + t.q.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ul>" : "") +
        '<div class="sol"><span>الحل</span><b>' + esc(t.sol) + '</b></div><div class="who">صاحبه: ' + esc(t.who) + "</div></div>";
    }).join("") + "</div>";
  };
  M.types = function (it) { var t = rxType(it.focus); return t ? '<div class="m-card"><b>' + t.ic + " " + esc(t.n) + "</b>" + esc(t.d) + t.q.map(function (q) { return "<div>• " + esc(q) + "</div>"; }).join("") + '<div class="m-s">الحل: ' + esc(t.sol) + " · صاحبه: " + esc(t.who) + "</div></div>" : ""; };

  /* ───── الشبكة ٩ × ٤ ───── */
  E.grid = function (it, ctx, step) {
    var A = act(ctx, it.act), by = A.by || {}, showKey = step >= (it.keyAt || 99), hl = (it.rows && it.rows[step]) || null;
    var place = {};   /* "H2|p" → [أرقام الحالات] */
    RX_GC.forEach(function (c) {
      var cell = null;
      if (showKey) cell = RX_GC_KEY[c.id].d + "|" + RX_GC_KEY[c.id].t;
      else { var t = topOf((by[c.id] || {}).c); cell = t.k; }
      if (cell) (place[cell] = place[cell] || []).push(c);
    });
    var trainN = 0; Object.keys(place).forEach(function (k) { if (/\|k$/.test(k)) trainN += place[k].length; });
    var h = '<div class="x-grid' + (hl ? " has-hl" : "") + '"><div class="gh"><span></span>' + RX_TYPES.map(function (t) { return '<span style="--c:' + t.c + '">' + t.ic + " " + esc(t.n) + "</span>"; }).join("") + "</div>";
    RX_DIMS.forEach(function (d) {
      h += '<div class="gr' + (hl && hl.indexOf(d.id) !== -1 ? " hl" : "") + '"><span class="dn" style="--c:' + axc(d.ax) + '">' + esc(d.n) + "</span>" + RX_TYPES.map(function (t) {
        var L = place[d.id + "|" + t.id] || [];
        return '<span class="cell">' + L.map(function (c) { return '<i title="' + esc(c.t) + '">' + ar(c.no) + "</i>"; }).join("") + "</span>";
      }).join("") + "</div>";
    });
    h += '<div class="gf"><span></span>' + RX_TYPES.map(function (t) { return '<span>' + esc(t.sol) + "</span>"; }).join("") + "</div>";
    if (showKey) h += '<div class="cnt">في عمود التدريب: <b>' + ar(trainN) + "</b> من ١٢ · والسبعة التانيين: قرار، ودور تاني، ودعم</div>";
    else h += '<div class="cnt sm">' + (A.n ? "حط " + ar(A.n) + " · كل رقم في الخانة اللي أغلب القاعة اختارتها" : "لسه محدش حط حاجة…") + "</div>";
    return h + "</div>";
  };
  M.grid = function (it, ctx, step) {
    var showKey = step >= (it.keyAt || 99); if (!showKey) return '<div class="m-big">بص على الشبكة الكبيرة</div>';
    return '<div class="m-card"><b>الإجابات</b>' + RX_GC.map(function (c) { var k = RX_GC_KEY[c.id]; return '<div class="m-row"><span>' + ar(c.no) + ". " + esc(rxDim(k.d).n) + "</span><span>" + esc(rxType(k.t).n) + "</span></div>"; }).join("") + "</div>";
  };

  /* ───── بطاقتين جنب بعض ───── */
  E.cards2 = function (it) {
    return '<div class="x-c2">' + it.list.map(function (c, i) {
      var t = rxType(c.tone) || {};
      return '<div class="cc" style="--c:' + (t.c || "#dcae62") + ";animation-delay:" + (i * .3) + 's"><b>' + esc(c.h) + "</b>" + c.lines.map(function (l) { return "<div>• " + esc(l) + "</div>"; }).join("") + '<div class="to">' + esc(c.to) + "</div></div>";
    }).join("") + "</div>";
  };
  M.cards2 = function (it) { return it.list.map(function (c) { return '<div class="m-card"><b>' + esc(c.h) + "</b>" + c.lines.map(function (l) { return "<div>• " + esc(l) + "</div>"; }).join("") + '<div class="m-s">' + esc(c.to) + "</div></div>"; }).join(""); };

  /* ───── الخط اللي على الأرض ───── */
  E.linebar = function () {
    return '<div class="x-line"><div class="bar"><span class="a">أول مرة</span><span class="b">بعملها، بس مش كويس</span><span class="c">بعرف أعلّمها لغيري</span></div><div class="x-sub" style="margin-top:40px">هقول جملة… وكل واحد يقف في المكان اللي فعلًا بيعبّر عنه. مش اللي نفسه يبقى فيه.</div></div>';
  };
  M.linebar = function () { return '<div class="m-big">أول مرة ← بعملها بس مش كويس ← بعرف أعلّمها</div>'; };

  /* ───── سلّم النجاح ───── */
  var LAD = [
    { b: "e", h: "انبسطوا", s: "حضروا، وقيّموا كويس، والطاقة كانت عالية", k: "١ · ٢ · ٨" },
    { b: "l", h: "اتعلموا", s: "في آخر التدريب، عرفوا يعملوها في القاعة", k: "٣ · ٤" },
    { b: "a", h: "طبّقوا", s: "عملوها في الشارع، في الشغل الحقيقي", k: "٥ · ٦" },
    { b: "r", h: "فرقت", s: "النتيجة اللي كتبناها في القفل الأول اتحققت", k: "٧" }
  ];
  E.ladder = function (it) {
    var up = it.upto || 4;
    return '<div class="x-lad">' + LAD.map(function (r, i) {
      return (i === 2 && it.gap ? '<div class="gap">⚠ أكبر خسارة بتحصل هنا: بين «اتعلم» و«طبّق»</div>' : "") +
        '<div class="rg' + (i < up ? " on" : "") + (i === up - 1 ? " cur" : "") + '" style="--i:' + i + '"><span class="n">' + ar(i + 1) + '</span><b>' + (i < up ? esc(r.h) : "") + "</b><span class=\"s\">" + (i < up ? esc(r.s) : "") + '</span><span class="k">' + (i < up ? "كروت " + r.k : "") + "</span></div>";
    }).join("") + "</div>";
  };
  M.ladder = function (it) { return '<div class="m-card">' + LAD.slice(0, it.upto || 4).reverse().map(function (r) { return "<div><b style=\"display:inline\">" + esc(r.h) + "</b>: " + esc(r.s) + "</div>"; }).join("") + "</div>"; };
})();
