/* ═══════════════════════════════════════════════
   فصول المعادن — محرّك القراءة وإبداء الرأي
   • لا تسجيل دخول: القارئ يكتب اسمه مرّةً واحدة في أوّل الصفحة.
   • يضغط على أيّ فقرة فيعلّق عليها في مكانها، ويُحفظ التعليق فورًا.
   • في الطريق وقفاتٌ قصيرة خاصّة بهذا الفصل، وفي آخره أسئلة ختاميّة.
   • كلّ ما يكتبه يصل إلى المؤلّف ويُقرأ من:  maaden/admin.html
   ═══════════════════════════════════════════════ */
(function(){
'use strict';
var D=window.MAADEN, CFG=window.MAADEN_CFG||{};
if(!D){document.body.innerHTML='<p style="padding:40px;text-align:center">تعذّر تحميل الفصل.</p>';return}
var MID=D.id, COL=CFG.collection||'maaden_feedback', FALLBACK='maraya_feedback';

/* ── Firebase ── */
var FS=null;
try{
  if(window.firebase){
    if(!firebase.apps.length)firebase.initializeApp({apiKey:"AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",authDomain:"fouad-perspective.firebaseapp.com",projectId:"fouad-perspective",storageBucket:"fouad-perspective.firebasestorage.app",messagingSenderId:"1068763865336",appId:"1:1068763865336:web:b791abcd22d536aedd5b0d"});
    FS=firebase.firestore();
  }
}catch(e){FS=null}

/* ── تخزين محلّيّ آمن ── */
function lsGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
var rid=lsGet('mdn-rid',null);
if(!rid){rid='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);lsSet('mdn-rid',rid)}
var KC='mdn-c-'+MID, KK='mdn-k-'+MID, KP='mdn-p-'+MID;
var myC=lsGet(KC,[]), myK=lsGet(KK,{}), myP=lsGet(KP,{max:0,last:0});
function name(){return lsGet('mdn-name','')}

/* ── أدوات ── */
function $(s,r){return(r||document).querySelector(s)}
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function plain(h){var d=document.createElement('div');d.innerHTML=h;return d.textContent}
function ayah(h){return h.replace(/﴿[^﴾]+﴾/g,function(m){return'<span class="q-ayah">'+m+'</span>'})}
var AR='٠١٢٣٤٥٦٧٨٩';function ar(n){return String(n).replace(/[0-9]/g,function(d){return AR[d]})}
var toastT;function toast(t){var x=$('#toast');x.textContent=t;x.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){x.classList.remove('on')},2200)}
var ICO={
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>'
};

/* ── الإرسال إلى المؤلّف ── */
var useCol=lsGet('mdn-col',COL);
function send(docId,data){
  data.rid=rid;data.name=name();data.metal=MID;data.metalTitle=D.title;data.book='maaden';data.v=D.v||1;
  data.ua=navigator.userAgent.slice(0,120);
  if(!FS)return Promise.reject(new Error('offline'));
  data.at=firebase.firestore.FieldValue.serverTimestamp();
  return FS.collection(useCol).doc(docId).set(data,{merge:true}).catch(function(err){
    if(useCol!==FALLBACK&&err&&/permission/i.test(String(err.code||err.message))){
      useCol=FALLBACK;lsSet('mdn-col',FALLBACK);
      return FS.collection(useCol).doc(docId).set(data,{merge:true});
    }
    throw err;
  });
}
function status(node,state){
  if(!node)return;
  node.className='st'+(state==='ok'?' ok':state==='err'?' err':'');
  node.textContent=state==='ok'?'وصل ✓':state==='err'?'لم يصل — تحقّق من الاتصال وأعد المحاولة':'يُرسَل…';
}

/* ═════════ بناء الصفحة ═════════ */
var root=$('#app');
document.title=D.title+' — ولادة قلب';
var wrap=el('div','wrap');root.appendChild(wrap);
var head=el('header','top',
  '<div class="series">'+esc(D.series)+'</div>'+
  '<h1 class="title">'+esc(D.title)+'</h1>'+
  '<div class="byline">'+esc(D.author)+' · نسخةٌ للقراءة وإبداء الرأي قبل النشر</div>'+
  '<svg class="orn" viewBox="0 0 72 14" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M0 7h26M46 7h26"/><path d="M36 1l6 6-6 6-6-6z"/></svg>'+
  '<div class="hello" id="hello"></div>');
wrap.appendChild(head);

var NB={}, total=0, curSec='', checkEls={};
D.blocks.forEach(function(b){
  var t=b.t;
  if(t==='sec'){curSec=b.x;wrap.appendChild(el('h2','sec',esc(b.x)));return}
  if(t==='part'){curSec=b.x;wrap.appendChild(el('h2','part',esc(b.x)));return}
  if(t==='sub'){curSec=b.x;wrap.appendChild(el('h3','sub',esc(b.x)));return}
  if(t==='hr'){wrap.appendChild(el('div','hr','✦ ✦ ✦'));return}
  if(t==='check'){var c=buildCheck(b.id);if(c)wrap.appendChild(c);return}
  var inner;
  if(t==='mother')inner='<div class="mother"><div class="m1">'+b.x+'</div><div class="m2">'+ayah(b.x2||'')+'</div></div>';
  else if(t==='lead')inner='<p class="lead">'+ayah(b.x)+'</p>';
  else if(t==='lie')inner='<p class="lie">'+b.x+'</p>';
  else if(t==='truth')inner='<p class="truth">'+b.x+'</p>';
  else if(t==='mirror')inner='<div class="mirror"><span class="tag">مرآةٌ جانبيّة</span>'+b.x+'</div>';
  else inner='<p>'+ayah(b.x)+'</p>';
  var blk=el('div','blk',inner);blk.id='b'+b.n;blk.dataset.n=b.n;blk.dataset.sec=curSec;
  blk.dataset.text=plain(b.x+(b.x2?' '+b.x2:''));
  var pin=el('button','pin',ICO.chat);pin.setAttribute('aria-label','علّق على هذه الفقرة');pin.tabIndex=-1;blk.appendChild(pin);
  wrap.appendChild(blk);
  var mine=el('div','mine');mine.id='mine'+b.n;wrap.appendChild(mine);
  NB[b.n]=blk;total=Math.max(total,b.n);
});
wrap.appendChild(el('div','thanks','شكرًا لأنّك قرأت حتّى هنا. كلّ ما كتبتَه وصل إلى <b>محمود</b> كما كتبتَه.'));
var tst=el('div');tst.id='toast';document.body.appendChild(tst);
var prog=el('div',null,'<i></i>');prog.id='prog';document.body.appendChild(prog);

/* ═════════ التعليق على الفقرة ═════════ */
var TAGS=['وصلني','لمسني','لم أفهمه','ثقيل عليّ','أطول من اللازم','لا أوافق'];
var openBox=null;
function closeBox(){if(openBox){openBox.blk.classList.remove('open');openBox.box.remove();openBox=null}}
function selIn(blk){
  var s=window.getSelection&&window.getSelection();
  if(!s||s.isCollapsed||!s.rangeCount)return'';
  var r=s.getRangeAt(0);if(!blk.contains(r.commonAncestorContainer))return'';
  return s.toString().trim().slice(0,400);
}
function openFor(blk,edit){
  var n=+blk.dataset.n;
  if(openBox&&openBox.n===n&&!edit){closeBox();return}
  closeBox();
  var sel=edit?(edit.sel||''):selIn(blk);
  var quote=sel||blk.dataset.text;
  var tags=edit?(edit.tags||[]).slice():[];
  var box=el('div','cbox',
    '<div class="qt">'+(sel?'«'+esc(sel)+'»':esc(quote.length>180?quote.slice(0,180)+'…':quote))+'</div>'+
    '<div class="chips">'+TAGS.map(function(t){return'<button class="chip'+(tags.indexOf(t)>=0?' on':'')+'" data-t="'+t+'">'+t+'</button>'}).join('')+'</div>'+
    '<textarea class="ta" placeholder="اكتب ما خطر لك هنا: ما وصلك، ما غمض، ما ثقل، أو ما تقترحه…">'+esc(edit?edit.text||'':'')+'</textarea>'+
    '<div class="row"><button class="btn" data-a="save">'+(edit?'احفظ التعديل':'أرسل')+'</button><button class="btn sec" data-a="cancel">إغلاق</button><span class="st"></span></div>');
  blk.classList.add('open');
  blk.parentNode.insertBefore(box,blk.nextSibling);
  openBox={n:n,blk:blk,box:box};
  box.addEventListener('click',function(e){
    var c=e.target.closest('.chip');
    if(c){c.classList.toggle('on');var t=c.dataset.t,i=tags.indexOf(t);if(i>=0)tags.splice(i,1);else tags.push(t);return}
    var a=e.target.closest('[data-a]');if(!a)return;
    if(a.dataset.a==='cancel'){closeBox();return}
    var text=$('textarea',box).value.trim();
    if(!text&&!tags.length){toast('اختر وصفًا أو اكتب كلمة');return}
    var id=edit?edit.id:(rid+'_'+MID+'_p'+n+'_'+Date.now().toString(36));
    var rec={id:id,n:n,sec:blk.dataset.sec,sel:sel,quote:quote.slice(0,400),tags:tags,text:text,t:Date.now()};
    a.disabled=true;var st=$('.st',box);status(st);
    send(id,{kind:'para',n:n,total:total,sec:rec.sec,quote:rec.quote,sel:sel||'',tags:tags,text:text,deleted:false}).then(function(){
      upsertMine(rec);closeBox();renderMine(n);toast('وصل تعليقك ✓');
    }).catch(function(){a.disabled=false;status(st,'err');upsertMine(rec);renderMine(n)});
  });
  if(!edit&&window.matchMedia('(hover:hover)').matches)setTimeout(function(){var t=$('textarea',box);t&&t.focus({preventScroll:true})},60);
}
function upsertMine(rec){var i=myC.findIndex(function(x){return x.id===rec.id});if(i>=0)myC[i]=rec;else myC.push(rec);lsSet(KC,myC)}
function renderMine(n){
  var box=$('#mine'+n);if(!box)return;
  var L=myC.filter(function(x){return x.n===n});
  NB[n]&&NB[n].classList.toggle('has',L.length>0);
  box.innerHTML=L.map(function(x){
    return'<div class="mc" data-id="'+x.id+'">'+(x.sel?'<div class="sq">«'+esc(x.sel.length>90?x.sel.slice(0,90)+'…':x.sel)+'»</div>':'')+
      (x.tags&&x.tags.length?'<div class="tg">'+x.tags.map(esc).join(' · ')+'</div>':'')+
      (x.text?'<div>'+esc(x.text)+'</div>':'')+
      '<div class="ac"><button data-m="edit">تعديل</button><button data-m="del">حذف</button></div></div>';
  }).join('');
}
wrap.addEventListener('click',function(e){
  var mc=e.target.closest('.mc [data-m]');
  if(mc){
    var card=mc.closest('.mc'),id=card.dataset.id,rec=myC.find(function(x){return x.id===id});if(!rec)return;
    if(mc.dataset.m==='edit'){openFor(NB[rec.n],rec);return}
    if(!confirm('تحذف هذا التعليق؟'))return;
    send(id,{kind:'para',deleted:true}).catch(function(){});
    myC=myC.filter(function(x){return x.id!==id});lsSet(KC,myC);renderMine(rec.n);toast('حُذف');return;
  }
  if(e.target.closest('.cbox,.check,a,button:not(.pin)'))return;
  var blk=e.target.closest('.blk');if(!blk)return;
  openFor(blk);
});
Object.keys(NB).forEach(function(n){renderMine(+n)});

/* ═════════ الوقفات ═════════ */
function buildCheck(id){
  var C=D.checks&&D.checks[id];if(!C)return null;
  var saved=myK[id]||{a:{},text:'',t:{}};
  var h='<div class="ct">'+ICO.pause+esc(C.title)+'</div>'+
    '<div class="cs">'+(C.end?'أسئلةٌ أخيرة، أجب عمّا تحبّ منها.':'وقفةٌ قصيرة، أجب عمّا تحبّ منها ثمّ أكمل. ما تختاره يصل وحده.')+'</div>';
  C.qs.forEach(function(q,i){
    var sel=saved.a[i]||[];
    h+='<div class="qq">'+esc(q.q)+(q.multi?' <span style="font-weight:400;color:var(--muted);font-size:14px">(يمكن أكثر من اختيار)</span>':'')+'</div><div class="chips" data-q="'+i+'" data-multi="'+(q.multi?1:0)+'">'+
      q.o.map(function(o){return'<button class="chip'+(sel.indexOf(o)>=0?' on':'')+'" data-o="'+esc(o)+'">'+esc(o)+'</button>'}).join('')+'</div>';
  });
  if(C.ph)h+='<textarea class="ta" data-k="text" placeholder="'+esc(C.ph)+'">'+esc(saved.text||'')+'</textarea>';
  (C.txt||[]).forEach(function(t){h+='<div class="tq">'+esc(t.q)+'</div><textarea class="ta" data-k="t:'+t.k+'">'+esc((saved.t||{})[t.k]||'')+'</textarea>'});
  h+='<div class="row">'+(C.ph||C.txt?'<button class="btn" data-a="send">أرسل</button>':'')+'<span class="st"></span></div>';
  var box=el('div','check'+(C.end?' end':''),h);box.dataset.id=id;checkEls[id]=box;
  var timer;
  function collect(){
    var s={a:{},text:'',t:{}};
    box.querySelectorAll('.chips').forEach(function(ch){s.a[ch.dataset.q]=[].map.call(ch.querySelectorAll('.chip.on'),function(c){return c.dataset.o})});
    box.querySelectorAll('textarea').forEach(function(ta){var k=ta.dataset.k;if(k==='text')s.text=ta.value.trim();else s.t[k.slice(2)]=ta.value.trim()});
    return s;
  }
  function push(){
    var s=collect();myK[id]=s;lsSet(KK,myK);
    var st=$('.st',box);status(st);
    var answers={};C.qs.forEach(function(q,i){answers['q'+i]={q:q.q,a:s.a[i]||[]}});
    var texts={};(C.txt||[]).forEach(function(t){texts[t.k]={q:t.q,a:s.t[t.k]||''}});
    send(rid+'_'+MID+'_k_'+id,{kind:'check',ck:id,ckTitle:C.title,answers:answers,text:s.text,texts:texts,end:!!C.end})
      .then(function(){status(st,'ok')}).catch(function(){status(st,'err')});
  }
  box.addEventListener('click',function(e){
    var c=e.target.closest('.chip');
    if(c){
      var grp=c.parentNode;
      if(grp.dataset.multi!=='1')grp.querySelectorAll('.chip.on').forEach(function(x){if(x!==c)x.classList.remove('on')});
      c.classList.toggle('on');clearTimeout(timer);timer=setTimeout(push,500);return;
    }
    if(e.target.closest('[data-a=send]'))push();
  });
  box.addEventListener('input',function(e){if(e.target.tagName==='TEXTAREA'){clearTimeout(timer);timer=setTimeout(push,2500)}});
  box.addEventListener('focusout',function(e){if(e.target.tagName==='TEXTAREA'){clearTimeout(timer);push()}});
  return box;
}

/* ═════════ بوّابة الاسم ═════════ */
function hello(){
  $('#hello').innerHTML='أهلًا <b>'+esc(name())+'</b>. اضغط على أيّ فقرة تقف عندها، أو حدّد جملةً بعينها ثمّ اضغط، واكتب ما خطر لك في مكانه. وستجد في الطريق وقفاتٍ قصيرة، وفي آخر الفصل أسئلةً أخيرة. كلّ ما تكتبه يصل إليّ وحده.<br><button class="chg" id="chgName">لستَ '+esc(name())+'؟ غيّر الاسم</button>';
}
function gate(first){
  var g=el('div');g.id='gate';
  g.innerHTML='<div class="gbox">'+
    '<div class="series">'+esc(D.series)+'</div>'+
    '<h1>'+esc(D.title)+'</h1>'+
    (first?'<p>هذا فصلٌ من الكتاب قبل أن يُنشر، أضعه بين يديك لأسمع رأيك فيه: في المعنى، وفي المشاهد، وفي اللغة. اقرأه على مهل، ولا تجامل.</p>'+
    '<ul class="how"><li>اضغط على أيّ فقرة لتعلّق عليها وأنت تقرأ، قبل أن تنسى ما خطر لك.</li><li>ستجد وقفاتٍ قصيرة بين أجزاء الفصل، وأسئلةً أخيرة في آخره.</li><li>كلّ ما تكتبه يصل إليّ وحدي.</li></ul>':'<p>غيّر اسمك، وما تكتبه بعد ذلك يصل بالاسم الجديد.</p>')+
    '<input id="gName" maxlength="60" placeholder="اسمك" value="'+esc(name())+'">'+
    '<div><button class="btn" id="gGo">'+(first?'ابدأ القراءة':'احفظ')+'</button></div>'+
    '<div class="small">محمود فؤاد</div></div>';
  document.body.appendChild(g);document.body.style.overflow='hidden';
  var inp=$('#gName',g);setTimeout(function(){inp.focus()},80);
  function go(){
    var v=inp.value.trim();if(v.length<2){inp.focus();toast('اكتب اسمك من فضلك');return}
    lsSet('mdn-name',v);g.remove();document.body.style.overflow='';hello();
    send(rid+'_'+MID+'_start',{kind:'start',total:total}).catch(function(){});
    if(first&&myP.last>8)resumeOffer();
  }
  $('#gGo',g).addEventListener('click',go);
  inp.addEventListener('keydown',function(e){if(e.key==='Enter')go()});
}
document.addEventListener('click',function(e){if(e.target.id==='chgName')gate(false)});

/* ═════════ التقدّم في القراءة ═════════ */
var dirty=false,lastSend=0;
var io=('IntersectionObserver' in window)?new IntersectionObserver(function(es){
  es.forEach(function(en){if(en.isIntersecting){var n=+en.target.dataset.n;myP.last=n;if(n>myP.max){myP.max=n;dirty=true}}});
  lsSet(KP,myP);
  $('#prog i').style.width=Math.round(myP.last/total*100)+'%';
},{rootMargin:'0px 0px -60% 0px'}):null;
if(io)Object.keys(NB).forEach(function(n){io.observe(NB[n])});
function flushProg(force){
  if(!name()||!dirty)return;var now=Date.now();if(!force&&now-lastSend<20000)return;
  dirty=false;lastSend=now;
  send(rid+'_'+MID+'_prog',{kind:'progress',maxN:myP.max,total:total,pct:Math.round(myP.max/total*100)}).catch(function(){dirty=true});
}
setInterval(function(){flushProg(false)},5000);
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flushProg(true)});

function resumeOffer(){
  var b=el('div','cbox','<div style="text-align:center">توقّفتَ في المرّة السابقة عند منتصف الطريق. <div class="row" style="justify-content:center"><button class="btn" data-r="go">أكمل من حيث توقّفت</button><button class="btn sec" data-r="no">من البداية</button></div></div>');
  b.style.cssText='position:fixed;bottom:16px;inset-inline:16px;max-width:520px;margin:0 auto;z-index:40';
  document.body.appendChild(b);
  b.addEventListener('click',function(e){var r=e.target.closest('[data-r]');if(!r)return;if(r.dataset.r==='go'){var t=NB[myP.last];t&&t.scrollIntoView({block:'center'})}b.remove()});
  setTimeout(function(){b.remove()},15000);
}

/* ═════════ البدء ═════════ */
var deep=location.hash&&/^#b\d+$/.test(location.hash)?NB[+location.hash.slice(2)]:null;
if(!name())gate(true);
else{hello();if(deep)setTimeout(function(){deep.scrollIntoView({block:'center'});deep.classList.add('open');setTimeout(function(){deep.classList.remove('open')},2500)},300);else if(myP.last>8)resumeOffer()}
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeBox()});
})();
