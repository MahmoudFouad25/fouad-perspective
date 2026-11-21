/* ═══════════════════════════════════════════════════════════════
   مسارات الطاقة · طبقة «الحكاية» (بتشتغل بعد engine.js)
   - خيط الحكاية: خط دهبي بيترسم بين المحطات لحد المحطة الحالية
   - جوّ الفصل: لون المسرح بيتغيّر مع كل فصل
   - التركيز: اللي اتقال في نفس الصفحة يهدى، واللي بيتقال دلوقتي ينوّر
   - خيط المحور: لما تظهر محطة محور، بيطلع تحت عقد المحطات اللي نوّرت
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';
if(document.body.classList.contains('coach')) return;

var W = 1600, H = 900;
var sts = [].slice.call(document.querySelectorAll('#world .st'));
var world = document.getElementById('world');

/* ───── السما: نجوم بمواضع ثابتة (نفس الشكل كل مرة) ───── */
[].forEach.call(document.querySelectorAll('.sky'), function(sky, n){
  var s = 7 + n*13, html = '';
  function r(){ s = (s*9301+49297)%233280; return s/233280; }
  for(var k=0;k<90;k++){
    var z = r()<.12 ? 4 : (r()<.5 ? 2 : 3);
    html += '<i style="right:'+(r()*100).toFixed(2)+'%;top:'+(r()*100).toFixed(2)+'%;width:'+z+'px;height:'+z+'px;animation-delay:'+(r()*5).toFixed(2)+'s"></i>';
  }
  sky.innerHTML = html;
});

/* ───── خيط الحكاية ───── */
var NS = 'http://www.w3.org/2000/svg';
var trail = document.createElementNS(NS,'svg'); trail.id='trail';
var bg = document.createElementNS(NS,'path'); bg.setAttribute('class','bg');
var fg = document.createElementNS(NS,'path'); fg.setAttribute('class','fg');
trail.appendChild(bg); trail.appendChild(fg);
world.insertBefore(trail, world.firstChild);
var pts = sts.map(function(el){ var s=+(el.dataset.s||1); return [+el.dataset.x + W*s/2, +el.dataset.y + H*s/2]; });
var d = '';
pts.forEach(function(p,k){
  if(!k){ d += 'M'+p[0]+','+p[1]; return; }
  var q = pts[k-1], mx = (q[0]+p[0])/2;
  d += ' C'+mx+','+q[1]+' '+mx+','+p[1]+' '+p[0]+','+p[1];
});
bg.setAttribute('d', d); fg.setAttribute('d', d);
var total = fg.getTotalLength();
/* طول الخيط لحد كل محطة */
var lens = [0];
(function(){
  var acc = 0, tmp = document.createElementNS(NS,'path');
  trail.appendChild(tmp);
  for(var k=1;k<pts.length;k++){
    var q=pts[k-1], p=pts[k], mx=(q[0]+p[0])/2;
    tmp.setAttribute('d','M'+q[0]+','+q[1]+' C'+mx+','+q[1]+' '+mx+','+p[1]+' '+p[0]+','+p[1]);
    acc += tmp.getTotalLength(); lens.push(acc);
  }
  trail.removeChild(tmp);
})();
fg.style.strokeDasharray = total; fg.style.strokeDashoffset = total;

/* ───── خيط المحور ───── */
var thread = document.getElementById('thread');
var AX = +(thread && thread.dataset.n) || 11, thrT = null;
function showThread(n){
  if(!thread) return;
  var h = '<span>محطات المحور</span><span class="kn">';
  for(var k=1;k<=AX;k++){ h += (k>1?'<s></s>':'')+'<i class="'+(k<=n?'lit':'')+(k===n?' now':'')+'"></i>'; }
  thread.innerHTML = h+'</span><span>'+toAr(n)+' من '+toAr(AX)+'</span>';
  thread.classList.add('on');
  clearTimeout(thrT); thrT = setTimeout(function(){ thread.classList.remove('on'); }, 7000);
}
function toAr(s){ return String(s).replace(/\d/g,function(x){return '٠١٢٣٤٥٦٧٨٩'[x];}); }

/* ───── التحديث مع كل خطوة ───── */
var lastSt = null, lastKey = '';
function upd(){
  var cur = document.querySelector('#world .st.now'); if(!cur) return;
  var lv = +cur.dataset.lv || 0, key = cur.id+':'+lv;
  if(key === lastKey) return; lastKey = key;
  if(cur.dataset.ch) document.body.dataset.ch = cur.dataset.ch;
  var idx = sts.indexOf(cur);
  if(idx>-1) fg.style.strokeDashoffset = Math.max(0, total - lens[idx]);
  /* التركيز جوّه الصفحة */
  [].forEach.call(cur.querySelectorAll('.it'), function(el){
    var on = +el.dataset.on, v = el.classList.contains('vis');
    var focus = !el.closest('.nofocus');
    el.classList.toggle('past', focus && v && on < lv);
    el.classList.toggle('cur', v && on === lv);
  });
  /* ختم المحور */
  var ax = cur.querySelector('.axis.vis.cur');
  if(ax && cur !== lastSt + ':' ) showThread(+ax.dataset.ax || 1);
  lastSt = cur;
}
var mo = new MutationObserver(function(){ requestAnimationFrame(upd); });
sts.forEach(function(el){ mo.observe(el, {attributes:true, attributeFilter:['class','data-lv']}); });
setTimeout(upd, 60);

/* ───── كل صفحة لازم تتقري كاملة جوّه الإطار: لو زادت، تصغر على قدّه ───── */
function fit(){
  [].forEach.call(document.querySelectorAll('.pgi'), function(inner){
    inner.style.transform = '';
    var pg = inner.parentNode, cs = getComputedStyle(pg);
    var ah = pg.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var aw = pg.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var k = Math.min(1, ah / inner.scrollHeight, aw / inner.scrollWidth);
    if(k < 1) inner.style.transform = 'scale(' + k.toFixed(3) + ')';
  });
}
fit();
if(document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
window.addEventListener('load', fit);
})();
