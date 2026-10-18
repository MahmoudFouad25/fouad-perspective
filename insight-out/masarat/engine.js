/* ═══════════════════════════════════════════════════════════════
   مسارات الطاقة · محرّك «الخريطة الحيّة»
   - كاميرا بتتحرك في لوحة واحدة كبيرة (تقريب، وتبعيد، وطيران بين المحطات)
   - خطوات مربوطة بالسكربت، وكل خطوة بتظهّر جزء من المحطة
   - شاشة كوتش منفصلة (N) متزامنة مع العرض
   - شريط «التسجيل متوقف» (R)، ومؤقّت الصمت، ومؤقّت الاستراحة
   - كروت بتتسحب بين خانات
   ملف مشترك لكل لقاءات المرحلة.
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

var W = 1600, H = 900;
var MapShow = window.MapShow = {};

MapShow.init = function(cfg){
  var isCoach = /[?&]coach=1/.test(location.search);
  var steps = cfg.steps;
  var chanName = 'masarat-' + cfg.id;
  var chan = ('BroadcastChannel' in window) ? new BroadcastChannel(chanName) : null;
  var store = 'masarat-pos-' + cfg.id;

  if(isCoach){ document.body.classList.add('coach'); return coachMode(); }

  /* ───────── تجهيز العالم ───────── */
  var stage = document.getElementById('stage');
  var world = document.getElementById('world');
  var stations = {};
  var orbitEls = [].slice.call(document.querySelectorAll('.st[data-orbit]'))
    .sort(function(a,b){return (+a.dataset.orbit)-(+b.dataset.orbit);});
  var o = cfg.orbit;
  orbitEls.forEach(function(el,k){
    var s = +(el.dataset.s || o.s || 1);
    var a = (o.start + k*(360/orbitEls.length)) * Math.PI/180;
    var cx = o.rx*Math.cos(a), cy = o.ry*Math.sin(a);
    el.dataset.x = cx - W*s/2; el.dataset.y = cy - H*s/2; el.dataset.s = s;
    el.dataset.frac = k/orbitEls.length;
  });
  [].forEach.call(document.querySelectorAll('.st'), function(el){
    var x=+el.dataset.x, y=+el.dataset.y, s=+(el.dataset.s||1);
    el.style.left = x+'px'; el.style.top = y+'px';
    el.style.transform = 'scale('+s+')';
    stations[el.id] = {el:el, x:x, y:y, s:s};
  });

  /* خط الرحلة: بيترسم لحد المحطة الحالية */
  var journey = document.getElementById('journey');
  var jLen = 0;
  if(journey){ jLen = journey.getTotalLength(); journey.style.strokeDasharray = jLen; journey.style.strokeDashoffset = jLen; }

  /* حدود النظرة الشاملة */
  var ov = cfg.overview || (function(){
    var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(var k in stations){var t=stations[k];x0=Math.min(x0,t.x);y0=Math.min(y0,t.y);x1=Math.max(x1,t.x+W*t.s);y1=Math.max(y1,t.y+H*t.s);}
    return [x0-200,y0-200,x1-x0+400,y1-y0+400];
  })();

  /* ───────── الكاميرا ───────── */
  var cam = {cx:0, cy:0, z:1}, anim = null, target = null;
  function fitRect(r){
    var vw=innerWidth, vh=innerHeight, pad=r[4]||0.96;
    var z = Math.min(vw/r[2], vh/r[3]) * pad;
    return {cx:r[0]+r[2]/2, cy:r[1]+r[3]/2, z:z};
  }
  function apply(c){
    var vw=innerWidth, vh=innerHeight;
    world.style.transform = 'translate('+(vw/2-c.cx*c.z)+'px,'+(vh/2-c.cy*c.z)+'px) scale('+c.z+')';
  }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function ease(t){return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;}
  function fly(r, instant){
    target = r;
    var to = fitRect(r), from = {cx:cam.cx, cy:cam.cy, z:cam.z};
    if(anim){cancelAnimationFrame(anim); anim=null;}
    if(instant || reduce){ cam=to; apply(cam); world.classList.remove('moving'); return; }
    var vw=innerWidth;
    var d = Math.hypot(to.cx-from.cx, to.cy-from.cy);
    var l0=Math.log(from.z), l1=Math.log(to.z);
    var zm = Math.min(from.z, to.z, (vw*0.72)/(d||1));
    var bump = Math.max(0, Math.min(l0,l1) - Math.log(zm));
    var screenD = d*Math.max(from.z,to.z)/vw;
    var dur = Math.max(650, Math.min(2600, 700 + 300*Math.log2(1+screenD) + 260*bump + 120*Math.abs(l1-l0)));
    var t0 = performance.now();
    world.classList.add('moving');
    (function frame(now){
      var p = Math.min(1,(now-t0)/dur), t = ease(p);
      cam = {cx: from.cx+(to.cx-from.cx)*t, cy: from.cy+(to.cy-from.cy)*t,
             z: Math.exp(l0+(l1-l0)*t - bump*Math.sin(Math.PI*t))};
      apply(cam);
      if(p<1){ anim=requestAnimationFrame(frame); }
      else { anim=null; cam=to; apply(cam); world.classList.remove('moving'); }
    })(t0);
  }
  addEventListener('resize', function(){ if(target){ cam=fitRect(target); apply(cam);} });

  function rectFor(step){
    if(step.cam === 'overview') return ov;
    if(step.cam && step.cam.w) return [step.cam.x, step.cam.y, step.cam.w, step.cam.h, step.cam.pad];
    var t = stations[step.st];
    if(step.r) return [t.x+step.r[0]*t.s, t.y+step.r[1]*t.s, step.r[2]*t.s, step.r[3]*t.s, step.r[4]];
    return [t.x, t.y, W*t.s, H*t.s];
  }

  /* ───────── الحالة ───────── */
  var i = 0, recOn = false, overview = false;
  try{ var saved = +localStorage.getItem(store); if(saved>0 && saved<steps.length) i = saved; }catch(e){}

  function levelsAt(n){
    var lv = {}, wl = 0, ms = '';
    for(var k=0;k<=n;k++){ var s=steps[k]; if(s.st) lv[s.st]=s.on||0; if(s.wl) wl=Math.max(wl,s.wl); if(s.ms!=null) ms=s.ms; }
    return {lv:lv, wl:wl, ms:ms};
  }
  function setVis(root, level){
    [].forEach.call(root.querySelectorAll('[data-on],[data-only]'), function(el){
      if(el.closest('.st') !== root && root.classList.contains('st')) return;
      var v;
      if(el.dataset.only){ v = el.dataset.only.split(',').indexOf(String(level)) > -1; }
      else { v = level >= +el.dataset.on && (el.dataset.off==null || level < +el.dataset.off); }
      el.classList.toggle('vis', v);
    });
  }
  function render(){
    var L = levelsAt(i), step = steps[i];
    for(var id in stations){
      var el = stations[id].el, lv = L.lv[id]||0;
      el.dataset.lv = lv;
      for(var c=0;c<=40;c++) el.classList.toggle('l'+c, lv>=c && c>0);
      el.classList.toggle('now', id===step.st);
      setVis(el, lv);
    }
    var mapEl = document.getElementById('mapLayer');
    if(mapEl){
      mapEl.dataset.wl = L.wl;
      mapEl.setAttribute('data-ms', L.ms);
      for(var c2=1;c2<=20;c2++) mapEl.classList.toggle('w'+c2, L.wl>=c2);
      [].forEach.call(mapEl.querySelectorAll('[data-w]'), function(e){
        var v = L.wl >= +e.dataset.w && (e.dataset.woff==null || L.wl < +e.dataset.woff);
        e.classList.toggle('vis', v);
      });
    }
    if(journey){
      var st = stations[step.st], f = st && st.el.dataset.frac;
      if(f!=null) journey.style.strokeDashoffset = jLen*(1-(+f+0.001));
    }
  }

  function go(n, opts){
    opts = opts||{};
    n = Math.max(0, Math.min(steps.length-1, n));
    var prev = i; i = n;
    var step = steps[i];
    overview = false; document.body.classList.remove('ov');
    render();
    fly(rectFor(step), opts.instant);
    if(step.fx && cfg.fx && cfg.fx[step.fx]){ try{ cfg.fx[step.fx](stations[step.st]&&stations[step.st].el, step, n>prev); }catch(e){console.error(e);} }
    silence(step.sil||0);
    countdown(step);
    try{ localStorage.setItem(store, i); }catch(e){}
    hud(); send();
  }

  /* ───────── الصمت ───────── */
  var silEl = document.getElementById('sil'), silFg = silEl && silEl.querySelector('.fg'), silTimer=null, silEnd=0, silTotal=0;
  function silence(sec){
    clearTimeout(silTimer); silEnd=0; silTotal=sec;
    if(!silEl) return;
    silEl.classList.remove('on');
    silFg.style.transition='none'; silFg.style.strokeDashoffset = 126;
    if(!sec) return;
    silEnd = Date.now()+sec*1000;
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      silEl.classList.add('on');
      silFg.style.transition = 'stroke-dashoffset '+sec+'s linear';
      silFg.style.strokeDashoffset = 0;
    });});
    silTimer = setTimeout(function(){ silEl.classList.remove('on'); silEnd=0; send(); }, sec*1000+400);
  }

  /* ───────── مؤقّت الاستراحة ───────── */
  var cd = {end:0, left:0, run:false, el:null, t:null};
  function fmt(s){ s=Math.max(0,Math.round(s)); var m=Math.floor(s/60), r=s%60; return toAr(m+':'+(r<10?'0':'')+r); }
  function toAr(s){ return String(s).replace(/\d/g,function(d){return '٠١٢٣٤٥٦٧٨٩'[d];}); }
  function countdown(step){
    clearInterval(cd.t); cd.run=false; cd.el=null;
    if(!step.timer) return;
    var st = stations[step.st];
    cd.el = st && st.el.querySelector('[data-countdown]');
    cd.left = step.timer; cd.end = Date.now()+cd.left*1000; cd.run = true;
    tick(); cd.t = setInterval(tick, 250);
  }
  function tick(){
    if(cd.run) cd.left = Math.max(0,(cd.end-Date.now())/1000);
    if(cd.el){ cd.el.textContent = fmt(cd.left); cd.el.classList.toggle('done', cd.left<=0); }
    if(cd.left<=0){ cd.run=false; clearInterval(cd.t); }
  }
  function cdToggle(){
    if(!cd.el) return;
    if(cd.run){ cd.run=false; clearInterval(cd.t); }
    else if(cd.left>0){ cd.end=Date.now()+cd.left*1000; cd.run=true; cd.t=setInterval(tick,250); }
    tick(); send();
  }
  function cdAdd(sec){ if(!cd.el) return; cd.left=Math.max(0,cd.left+sec); cd.end=Date.now()+cd.left*1000; tick(); send(); }

  /* ───────── التسجيل ───────── */
  var recEl = document.getElementById('rec');
  function setRec(on){ recOn=!!on; recEl && recEl.classList.toggle('on', recOn); hud(); send(); }

  /* ───────── HUD والمساعدة ───────── */
  var hudEl = document.getElementById('hud');
  function hud(){
    if(!hudEl) return;
    var s = steps[i];
    hudEl.innerHTML = '<span>'+toAr(i+1)+' / '+toAr(steps.length)+'</span><span>'+(s.t||'')+'</span><span class="r">'+
      (s.rec==='off'?'⏸ اقفل التسجيل':s.rec==='on'?'⏺ رجّع التسجيل':'')+'</span>';
  }

  /* ───────── التحكم ───────── */
  function toggleOverview(){
    overview = !overview;
    document.body.classList.toggle('ov', overview);
    fly(overview ? ov : rectFor(steps[i]));
  }
  document.addEventListener('keydown', function(e){
    if(e.target.closest && e.target.closest('input,textarea')) return;
    var k = e.key;
    if(k==='ArrowLeft'||k==='ArrowDown'||k===' '||k==='PageDown'||k==='Enter'){ e.preventDefault(); go(i+1); }
    else if(k==='ArrowRight'||k==='ArrowUp'||k==='PageUp'||k==='Backspace'){ e.preventDefault(); go(i-1); }
    else if(k==='Home'){ go(0); }
    else if(k==='End'){ go(steps.length-1); }
    else if(k==='o'||k==='O'||k==='خ'){ toggleOverview(); }
    else if(k==='r'||k==='R'||k==='ق'){ setRec(!recOn); }
    else if(k==='n'||k==='N'||k==='ى'){ openCoach(); }
    else if(k==='h'||k==='H'||k==='ا'){ hudEl.classList.toggle('on'); }
    else if(k==='t'||k==='T'||k==='ف'){ cdToggle(); }
    else if(k==='f'||k==='F'||k==='ب'){ document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
    else if(k==='?'||k==='/'||k==='؟'){ document.getElementById('help').classList.toggle('on'); }
    else if(k==='Escape'){ document.getElementById('help').classList.remove('on'); if(overview) toggleOverview(); }
  });
  document.getElementById('help').addEventListener('click', function(){ this.classList.remove('on'); });
  stage.addEventListener('click', function(e){
    if(!overview) return;
    var st = e.target.closest('.st'); if(!st) return;
    for(var k=0;k<steps.length;k++){ if(steps[k].st===st.id){ go(k); return; } }
  });
  function openCoach(){ window.open(location.pathname+'?coach=1', 'masarat-coach-'+cfg.id, 'width=900,height=980'); }

  /* ───────── التزامن مع شاشة الكوتش ───────── */
  function send(){
    if(!chan) return;
    chan.postMessage({type:'state', i:i, rec:recOn,
      sil: silEnd ? {end:silEnd, total:silTotal} : null,
      cd: cd.el ? {left:cd.left, run:cd.run, end:cd.end} : null});
  }
  if(chan) chan.onmessage = function(m){
    var d = m.data||{};
    if(d.type==='go') go(d.i);
    else if(d.type==='next') go(i+1);
    else if(d.type==='prev') go(i-1);
    else if(d.type==='rec') setRec(d.on);
    else if(d.type==='ov') toggleOverview();
    else if(d.type==='cd') cdToggle();
    else if(d.type==='cdadd') cdAdd(d.s);
    else if(d.type==='sil') silence(steps[i].sil||0);
    else if(d.type==='hello') send();
  };

  /* ───────── السحب ───────── */
  [].forEach.call(document.querySelectorAll('[data-dnd]'), function(root){ dnd(root); });
  function dnd(root){
    var st = stations[root.closest('.st').id];
    root.addEventListener('pointerdown', function(e){
      var card = e.target.closest('.dnd-card'); if(!card) return;
      e.preventDefault();
      var sx=e.clientX, sy=e.clientY, k = cam.z*st.s, over=null;
      card.classList.add('drag'); card.setPointerCapture(e.pointerId);
      function mv(ev){
        card.style.transform = 'translate('+((ev.clientX-sx)/k)+'px,'+((ev.clientY-sy)/k)+'px) rotate(-2deg)';
        card.style.pointerEvents='none';
        var under = document.elementFromPoint(ev.clientX, ev.clientY);
        card.style.pointerEvents='';
        var stack = under && under.closest('.dnd-stack');
        if(stack && !root.contains(stack)) stack=null;
        if(over && over!==stack) over.classList.remove('over');
        over = stack; if(over) over.classList.add('over');
      }
      function up(){
        card.removeEventListener('pointermove', mv); card.removeEventListener('pointerup', up); card.removeEventListener('pointercancel', up);
        card.classList.remove('drag'); card.style.transform='';
        if(over){ over.classList.remove('over'); over.appendChild(card); card.classList.remove('fresh'); void card.offsetWidth; card.classList.add('fresh'); }
      }
      card.addEventListener('pointermove', mv); card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
    });
    var add = root.querySelector('.dnd-add'), tray = root.querySelector('.dnd-tray');
    if(add) add.addEventListener('keydown', function(e){
      if(e.key!=='Enter') return;
      var v = add.value.trim(); if(!v) return;
      var c = document.createElement('div'); c.className='dnd-card fresh'; c.textContent=v;
      tray.insertBefore(c, tray.firstChild); add.value='';
    });
  }

  /* ───────── البداية ───────── */
  render(); fly(rectFor(steps[i]), true); hud(); setRec(false);
  if(steps[i].fx && cfg.fx && cfg.fx[steps[i].fx]) cfg.fx[steps[i].fx](stations[steps[i].st]&&stations[steps[i].st].el, steps[i], true);
  MapShow.go = go;

  /* ═════════ شاشة الكوتش ═════════ */
  function md(src){
    function esc(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function inl(t){
      t = esc(t.replace(/\\([\[\]_*\-#>])/g,'$1'));
      return t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<i>$2</i>');
    }
    var out = '';
    String(src||'').split(/\n\s*\n/).forEach(function(blk){
      var b = blk.trim(); if(!b || /^-{3,}$/.test(b)) return;
      var plain = b.replace(/\\/g,'');
      var m = plain.match(/^\*\*\[([^\]]*)\]\*\*$/);
      if(m){
        var c = m[1], k = /^صمت/.test(c)?'sil':/^شاشة/.test(c)?'scr':/^التسجيل/.test(c)?'rec':'cue';
        var ic = {sil:'⏳ ', scr:'🖥 ', rec:'⏺⏸ ', cue:'▸ '}[k];
        out += '<div class="chip '+k+'">'+ic+inl(c)+'</div>'; return;
      }
      if(/^#{1,6}\s/.test(b)){ out += '<div class="sh">'+inl(b.replace(/^#{1,6}\s*/,''))+'</div>'; return; }
      if(/^>/.test(b)){ out += '<div class="bq">'+b.split('\n').map(function(l){ return inl(l.replace(/^>\s?/,'')); }).join('<br>')+'</div>'; return; }
      if(/^\*\*ملاحظة للكوتش/.test(b)){ out += '<div class="cn">'+inl(b).replace(/\n/g,'<br>')+'</div>'; return; }
      if(b.split('\n').every(function(l){ return /^\s*(-|\d+\.)\s/.test(l); })){
        out += '<ul>'+b.split('\n').map(function(l){ return '<li>'+inl(l.replace(/^\s*(-|\d+\.)\s/,''))+'</li>'; }).join('')+'</ul>'; return;
      }
      out += '<p>'+inl(b).replace(/\n/g,'<br>')+'</p>';
    });
    return out;
  }

  function coachMode(){
    var root = document.getElementById('coach');
    var cur = -1, rec = false, sil = null, cdS = null, lastSeen = 0;
    var SC = cfg.script || null, tips = cfg.tips || {};
    var fs = 22; try{ fs = +localStorage.getItem('masarat-coach-fs') || 22; }catch(e){}
    var extras = SC && SC.extras ? SC.extras.map(function(x){ return '<details class="ex"><summary>'+x.t+'</summary><div class="scr">'+md(x.md)+'</div></details>'; }).join('') : '';
    root.innerHTML =
      '<div class="main">'+
        '<div class="bar">'+
          '<div class="top"><span class="num" id="cNum"></span><span class="mvn" id="cMv"></span><span class="pill" id="cRec"></span><span class="clock" id="cClock"></span><span class="conn" id="cConn">مستني شاشة العرض...</span></div>'+
          '<div class="ctrl">'+
            '<button id="bPrev">→ السابق</button><button class="big" id="bNext">التالي ←</button>'+
            '<button class="rec" id="bRec"></button><button id="bOv">الخريطة كلها</button>'+
            '<button id="bCd" style="display:none">إيقاف/تشغيل المؤقّت</button><button id="bCdP" style="display:none">+١ دقيقة</button>'+
            '<span class="sp"></span><button id="bFm" title="تصغير الخط">أ−</button><button id="bFp" title="تكبير الخط">أ+</button>'+
          '</div>'+
          '<div class="ttl" id="cTtl"></div>'+
          '<div class="tip" id="cTip"></div>'+
        '</div>'+
        '<div class="card scr" id="cSay"></div>'+
        '<div class="card nxt"><div class="lbl">الشريحة الجاية</div><div class="nt" id="nTtl"></div><div class="scr" id="nSay"></div></div>'+
      '</div>'+
      '<div class="side"><div class="list" id="cList"></div>'+extras+'</div>';
    var list = document.getElementById('cList'), html='', lastMv='';
    steps.forEach(function(s,k){
      if(s.mv && s.mv!==lastMv){ html += '<h5>'+s.mv+'</h5>'; lastMv=s.mv; }
      html += '<a data-k="'+k+'">'+toAr(k+1)+' · '+(s.t||'')+(s.rec==='off'?'<span class="r">⏸</span>':s.rec==='on'?'<span class="r">⏺</span>':'')+'</a>';
    });
    list.innerHTML = html;
    list.addEventListener('click', function(e){ var a=e.target.closest('a'); if(a) post({type:'go', i:+a.dataset.k}); });
    function post(m){ chan && chan.postMessage(m); }
    function setFs(v){ fs=Math.max(15,Math.min(34,v)); document.documentElement.style.setProperty('--cfs', fs+'px'); try{ localStorage.setItem('masarat-coach-fs', fs); }catch(e){} }
    setFs(fs);
    document.getElementById('bNext').onclick = function(){ post({type:'next'}); };
    document.getElementById('bPrev').onclick = function(){ post({type:'prev'}); };
    document.getElementById('bRec').onclick = function(){ post({type:'rec', on:!rec}); };
    document.getElementById('bOv').onclick = function(){ post({type:'ov'}); };
    document.getElementById('bCd').onclick = function(){ post({type:'cd'}); };
    document.getElementById('bCdP').onclick = function(){ post({type:'cdadd', s:60}); };
    document.getElementById('bFm').onclick = function(){ setFs(fs-2); };
    document.getElementById('bFp').onclick = function(){ setFs(fs+2); };
    document.addEventListener('keydown', function(e){
      if(e.target.closest && e.target.closest('input,textarea')) return;
      var k=e.key;
      if(k==='ArrowLeft'||k===' '||k==='PageDown'){ e.preventDefault(); post({type:'next'}); }
      else if(k==='ArrowRight'||k==='PageUp'){ e.preventDefault(); post({type:'prev'}); }
      else if(k==='r'||k==='R'||k==='ق'){ post({type:'rec', on:!rec}); }
    });
    function stepText(k){ var s=steps[k]; if(!s) return ''; return (SC && SC.steps && SC.steps[k]) ? md(SC.steps[k]) : md(s.say||''); }
    function show(changed){
      var s = steps[cur] || steps[0], n = steps[cur+1];
      document.getElementById('cNum').textContent = toAr(cur+1)+' / '+toAr(steps.length);
      document.getElementById('cMv').textContent = s.mv||'';
      document.getElementById('cTtl').textContent = s.t||'';
      var tip = document.getElementById('cTip'); tip.textContent = tips[cur]||''; tip.style.display = tips[cur]?'':'none';
      if(changed){
        document.getElementById('cSay').innerHTML = stepText(cur) + (!SC && s.note ? '<div class="cn">'+s.note+'</div>' : '');
        window.scrollTo(0,0);
        document.getElementById('nTtl').textContent = n ? (n.t||'') : 'آخر شريحة';
        var nx = n ? stepText(cur+1) : '';
        var tmp = document.createElement('div'); tmp.innerHTML = nx;
        var first = [].slice.call(tmp.children).filter(function(c){ return !c.classList.contains('chip') && !c.classList.contains('cn') && !c.classList.contains('sh'); })[0];
        document.getElementById('nSay').innerHTML = first ? first.outerHTML : '';
      }
      var r = document.getElementById('cRec');
      r.className = 'pill'+(s.rec==='off'?' off':s.rec==='on'?' onr':'');
      r.textContent = s.rec==='off' ? '⏸ اقفل تسجيل زوم دلوقتي' : s.rec==='on' ? '⏺ رجّع تسجيل زوم دلوقتي' : '';
      r.style.display = s.rec ? '' : 'none';
      var b = document.getElementById('bRec'); b.classList.toggle('on', rec);
      b.textContent = rec ? '⏸ الشريط ظاهر · اخفيه' : '⏸ إظهار شريط «التسجيل متوقف»';
      var cdOn = !!cdS;
      document.getElementById('bCd').style.display = cdOn?'':'none';
      document.getElementById('bCdP').style.display = cdOn?'':'none';
      if(changed){
        [].forEach.call(list.querySelectorAll('a'), function(a){ a.classList.toggle('cur', +a.dataset.k===cur); });
        var c = list.querySelector('a.cur'); if(c && c.scrollIntoView) c.scrollIntoView({block:'center'});
      }
    }
    function clock(){
      var el = document.getElementById('cClock');
      if(sil && sil.end > Date.now()){ el.className='clock sil'; el.textContent = 'صمت '+toAr(Math.ceil((sil.end-Date.now())/1000)); }
      else if(cdS){ var l = cdS.run ? (cdS.end-Date.now())/1000 : cdS.left; el.className='clock'; el.textContent = fmt(l); }
      else { el.textContent=''; }
      var conn = document.getElementById('cConn');
      var ok = Date.now()-lastSeen < 60000;
      conn.className = 'conn'+(ok?' ok':''); conn.textContent = ok ? '● متصلة بالعرض' : 'مستني شاشة العرض...';
    }
    setInterval(clock, 250);
    if(chan) chan.onmessage = function(m){
      var d=m.data||{}; if(d.type!=='state') return;
      lastSeen = Date.now(); var ch = d.i!==cur; cur=d.i; rec=d.rec; sil=d.sil; cdS=d.cd; show(ch);
    };
    if(!chan){ document.getElementById('cConn').textContent = 'المتصفح ده مش بيدعم الربط بين الشاشتين. استخدم كروم أو إيدج.'; }
    cur = 0; show(true); post({type:'hello'});
    setInterval(function(){ if(Date.now()-lastSeen>5000) post({type:'hello'}); }, 3000);
  }
};
})();
