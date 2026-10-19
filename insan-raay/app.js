/* ═══════════════════════════════════════════════
   «إنسان» — منطق الصفحة
   • لا تسجيل دخول: الاسم والتليفون مرّةً واحدة، ثمّ يُحفظ كلّ شيء أوّلًا بأوّل.
   • كلّ زائر له وثيقة واحدة في Firebase:  insan_raay/{رقم عشوائي}
   • الرقم محفوظ في جهازه، فلو قفل الصفحة ورجع يكمل من مكانه.
   ═══════════════════════════════════════════════ */
(function(){
'use strict';
var COL='insan_raay', V=1, LS='insan-raay-v1';

/* ── Firebase ── */
var FS=null;
try{
  if(window.firebase){
    if(!firebase.apps.length)firebase.initializeApp({apiKey:"AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",authDomain:"fouad-perspective.firebaseapp.com",projectId:"fouad-perspective",storageBucket:"fouad-perspective.firebasestorage.app",messagingSenderId:"1068763865336",appId:"1:1068763865336:web:b791abcd22d536aedd5b0d"});
    FS=firebase.firestore();
  }
}catch(e){FS=null}

/* ── الحالة المحفوظة في الجهاز ── */
function load(){try{return JSON.parse(localStorage.getItem(LS))||null}catch(e){return null}}
function keep(){try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}}
function newId(){
  var c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',a=new Uint8Array(24),s='';
  (window.crypto||window.msCrypto).getRandomValues(a);
  for(var i=0;i<a.length;i++)s+=c[a[i]%c.length];
  return s;
}
var S=load()||{};
if(!S.id)S.id=newId();
S.reactions=S.reactions||{};S.notes=S.notes||{};S.subtitles=S.subtitles||[];
keep();

/* ── أدوات ── */
function $(s,r){return(r||document).querySelector(s)}
function $$(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
var toastT;function toast(t){var x=$('#toast');x.textContent=t;x.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){x.classList.remove('on')},2400)}
function digits(t){return String(t||'').replace(/[٠-٩]/g,function(d){return'٠١٢٣٤٥٦٧٨٩'.indexOf(d)}).replace(/[۰-۹]/g,function(d){return'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)})}
function clean(t,n){return String(t||'').trim().slice(0,n)}

/* ── المخاطبة: أنتَ / أنتِ ── */
function g(m,f){return S.address==='f'?f:m}
function applyAddr(){
  var f=S.address==='f';
  $$('.g').forEach(function(x){x.textContent=f?x.dataset.f:x.dataset.m});
}

/* ── الحفظ في Firebase ── */
function status(key,state){
  $$('[data-st="'+key+'"]').forEach(function(n){
    n.className='st'+(state==='ok'?' ok':state==='err'?' err':'');
    n.textContent=state==='ok'?'حُفظ ✓':state==='err'?'لم يُحفظ — تحقّق من الاتصال':state==='go'?'يُحفظ…':'';
  });
}
function push(fields,key){
  keep();
  if(!S.name||!S.phone)return Promise.resolve();
  var d={name:S.name,phone:S.phone,address:S.address||'m',v:V,
         updatedAt:FS?firebase.firestore.FieldValue.serverTimestamp():null};
  for(var k in fields)d[k]=fields[k];
  if(!S.started){d.startedAt=d.updatedAt;d.ua=navigator.userAgent.slice(0,180)}
  if(!FS){if(key)status(key,'err');return Promise.reject(new Error('offline'))}
  if(key)status(key,'go');
  return FS.collection(COL).doc(S.id).set(d,{merge:true}).then(function(){
    if(!S.started){S.started=true;keep()}
    if(key)status(key,'ok');
  }).catch(function(e){
    if(key)status(key,'err');
    console.warn('insan_raay',e&&e.code,e&&e.message);
    throw e;
  });
}
var timers={};
function later(key,fn){clearTimeout(timers[key]);timers[key]=setTimeout(fn,1100)}

/* ── التنقّل بين الشاشات ── */
var ORDER=['welcome','read','q1','q2','q3','done'];
function show(name){
  ORDER.forEach(function(n){$('#s-'+n).hidden=(n!==name)});
  S.step=name;keep();
  window.scrollTo(0,0);
  progress();
  if(name==='q2')renderSubs();
  if(name==='done')$('#cv-done').textContent=S.subtitles[S.pick||0]||S.subtitles[0]||'';
}
function progress(){
  var i=ORDER.indexOf(S.step), p;
  if(S.step==='read'){
    var h=document.documentElement, max=h.scrollHeight-h.clientHeight;
    p=0.1+0.45*(max>0?Math.min(1,h.scrollTop/max):0);
  }else p=[0.04,0,0.62,0.78,0.92,1][i];
  $('#prog i').style.width=(p*100)+'%';
}
window.addEventListener('scroll',function(){if(S.step==='read')progress()},{passive:true});
$$('[data-go]').forEach(function(b){b.addEventListener('click',function(){show(b.dataset.go)})});

/* ═════════ ١) التسجيل ═════════ */
$('#f-name').value=S.name||'';
$('#f-phone').value=S.phone||'';
$$('#f-addr .pill').forEach(function(p){
  p.classList.toggle('on',p.dataset.v===S.address);
  p.addEventListener('click',function(){
    S.address=p.dataset.v;
    $$('#f-addr .pill').forEach(function(x){x.classList.toggle('on',x===p)});
    $('#e-addr').hidden=true;applyAddr();keep();
  });
});
$('#b-start').addEventListener('click',function(){
  var nm=clean($('#f-name').value,80), ph=digits($('#f-phone').value).replace(/[^\d+]/g,'').slice(0,20);
  var ok=true;
  $('#e-name').hidden=!!nm; if(!nm)ok=false;
  var phOk=ph.replace(/\D/g,'').length>=10; $('#e-phone').hidden=phOk; if(!phOk)ok=false;
  $('#e-addr').hidden=!!S.address; if(!S.address)ok=false;
  if(!ok)return;
  S.name=nm;S.phone=ph;
  $('#hello-name').textContent=nm;
  var b=this;b.disabled=true;
  push({status:'يقرأ'}).then(function(){show('read')},function(){
    toast(g('تعذّر الاتصال، سنحاول الحفظ وأنت تقرأ','تعذّر الاتصال، سنحاول الحفظ وأنتِ تقرئين'));show('read');
  }).then(function(){b.disabled=false});
});

/* ═════════ ٢) القراءة ═════════ */
// هل مرّ بك هذا الإحساس؟
(function(){
  var box=$('#poll-feel');
  var THX=function(v){return{'كثيرًا':g('لستَ وحدك. هذا الكتاب كُتب لك.','لستِ وحدكِ. هذا الكتاب كُتب لكِ.'),'أحيانًا':'هذه اللحظات بالذات هي التي يتكلّم عنها الكتاب.','نادرًا':g('جميل. وربّما تعرف إنسانًا يمرّ به كثيرًا.','جميل. وربّما تعرفين إنسانًا يمرّ به كثيرًا.')}[v]||''};
  function paint(){$$('.chip',box).forEach(function(c){c.classList.toggle('on',c.dataset.v===S.feel)});$('.thx',box).textContent=THX(S.feel)}
  $$('.chip',box).forEach(function(c){c.addEventListener('click',function(){S.feel=c.dataset.v;paint();push({feel:S.feel}).catch(function(){})})});
  paint();
})();

// مكسور / مدفون
$$('#duo button').forEach(function(b){b.addEventListener('click',function(){b.classList.toggle('on')})});

// الدوائر الأربع
var RINGS=[
  ['الفؤاد','أعمق نقطةٍ في الإنسان. والكلمة في العربيّة من الاتّقاد، كالجمرة في وسط النار. وهو الذي يرى ولا يكذب. مثاله في الحياة: حين يكلّمك إنسانٌ كلامًا مقنعًا جدًّا، وعقلك يكاد يصدّقه، وشيءٌ في أعماقك يعرف أنّه لا يصدُق، ثمّ يتبيّن ذلك بعد شهور. هذا الذي عرف هو الفؤاد. ولهذا قال القرآن عن رؤية النبيّ ﷺ في المعراج: <span class="ayah">﴿مَا كَذَبَ الْفُؤَادُ مَا رَأَىٰ﴾</span>.'],
  ['القلب','حقيقة الإنسان، وموضع فهمه وإحساسه. والقرآن يقول <span class="ayah">﴿قُلُوبٌ يَعْقِلُونَ بِهَا﴾</span>، فالفهم الحقيقيّ في القلب لا في الرأس وحده. وسُمّي قلبًا لأنّه يتقلّب: يفرح ويحزن، ويقبل ويُعرض، كالريشة في الريح. وهذا ليس عيبًا فيه، بل طبيعته.'],
  ['النفس','المحرّك الذي يدفعك: يُنهضك في الصباح، ويأخذك إلى الطعام حين تجوع، وإلى الدفاع عمّن تحبّ. والكتاب يقول إنّ النفس ليست عدوًّا كما قيل للناس كثيرًا. هي طاقة، والطاقة تحتاج قائدًا. فإن قادها القلب سارت في خير، وإن استقلّت بالأمر أخذت صاحبها حيث لا يريد.'],
  ['الصدر','الساحة التي يظهر عليها ما يجري في الداخل. حين يضيق صدرك بلا سببٍ تعرفه، أو ينشرح فجأة كأنّ حملًا رُفع عنك، فهذا الصدر يُظهر لك حال أعماقك.']
];
function ring(i){
  $$('#rings .ring').forEach(function(r,j){r.classList.toggle('on',j===i);if(j===i)r.classList.add('seen')});
  $('#ring-txt').innerHTML='<h3>'+RINGS[i][0]+'</h3><p style="margin:0">'+RINGS[i][1]+'</p>';
}
$$('#rings .ring').forEach(function(r){r.addEventListener('click',function(){ring(+r.dataset.i)})});
ring(0);

// أجزاء القناع
$$('#flip button').forEach(function(b){b.addEventListener('click',function(){b.classList.toggle('on')})});

// صباحان
var MORN={
  asl:'<p><b>من أصلها:</b> تأخذ نفَسًا، وتنحني إلى طفلها وتكلّمه بهدوء، وتقول لزوجها: «أمهلني خمس دقائق». تفعل ما تقدر عليه، وتترك ما ليس في قدرتها.</p>',
  qina:'<p><b>من قناعها:</b> يرتفع في داخلها صوتٌ قديم: «لماذا أنا؟ أنا وحدي أحمل كلّ شيء»، فتصرخ في الجميع، ثمّ تجلس وحدها يأكلها الذنب.</p>'
};
var mornSeen={};
function morn(v){
  mornSeen[v]=1;
  $$('#morn-t button').forEach(function(b){b.classList.toggle('on',b.dataset.v===v)});
  $('#morn').innerHTML=MORN[v]+(mornSeen.asl&&mornSeen.qina?'<p style="color:var(--ink2);font-weight:800">نفس الصباح، وصباحان مختلفان تمامًا.</p>':'');
}
$$('#morn-t button').forEach(function(b){b.addEventListener('click',function(){morn(b.dataset.v)})});
morn('asl');

// تفاعل في آخر كلّ قسم
var CHIPS=['وصلني','لمسني','أريد أن أقرأه كاملًا','لم أفهمه جيّدًا'];
['core','dar','saey','tina','end'].forEach(function(k){
  var sec=$('section[data-k="'+k+'"]');if(!sec)return;
  var box=document.createElement('div');box.className='react';
  box.innerHTML='<div class="q">ما الذي تركه <span class="g" data-m="فيك" data-f="فيكِ">فيك</span> هذا الجزء؟</div><div class="chips">'+
    CHIPS.map(function(c){return'<button class="chip" data-v="'+c+'">'+c+'</button>'}).join('')+
    '</div><button class="note-btn"><span class="g" data-m="أضف" data-f="أضيفي">أضف</span> ملاحظة</button>'+
    '<div class="note" hidden><textarea maxlength="1500" placeholder="سطرٌ أو أكثر…"></textarea></div><div class="st" data-st="r-'+k+'"></div>';
  sec.appendChild(box);
  var chips=$$('.chip',box), ta=$('textarea',box), nb=$('.note-btn',box), nt=$('.note',box);
  function paint(){chips.forEach(function(c){c.classList.toggle('on',c.dataset.v===S.reactions[k])})}
  chips.forEach(function(c){c.addEventListener('click',function(){
    S.reactions[k]=(S.reactions[k]===c.dataset.v)?'':c.dataset.v;paint();
    var o={};o[k]=S.reactions[k];push({reactions:o},'r-'+k).catch(function(){});
  })});
  if(S.notes[k]){ta.value=S.notes[k];nt.hidden=false;nb.hidden=true}
  nb.addEventListener('click',function(){nt.hidden=false;nb.hidden=true;ta.focus()});
  ta.addEventListener('input',function(){
    S.notes[k]=clean(ta.value,1500);keep();
    later('n'+k,function(){var o={};o[k]=S.notes[k];push({notes:o},'r-'+k).catch(function(){})});
  });
  paint();
});

$('#b-toq').addEventListener('click',function(){push({status:'يجيب'}).catch(function(){});show('q1')});

/* ═════════ ٣) جملة واحدة ═════════ */
var one=$('#f-one');one.value=S.oneLine||'';
one.addEventListener('input',function(){S.oneLine=clean(one.value,1500);keep();later('one',function(){push({oneLine:S.oneLine},'oneLine').catch(function(){})})});
$('#b-q1').addEventListener('click',function(){
  if(!clean(one.value,1500)){toast(g('اكتب','اكتبي')+' جملتك أوّلًا، ولو قصيرة');one.focus();return}
  S.oneLine=clean(one.value,1500);
  push({oneLine:S.oneLine},'oneLine').catch(function(){});
  show('q2');
});

/* ═════════ ٤) العنوان الفرعيّ ═════════ */
var hasQalb=/قلب|قلوب/;
function renderSubs(){
  var box=$('#subs');box.innerHTML='';
  var list=S.subtitles.length?S.subtitles.slice():[''];
  if(S.pick==null||S.pick>=list.length)S.pick=0;
  list.forEach(function(v,i){
    var f=document.createElement('div');f.className='fld';
    f.innerHTML='<input maxlength="120" placeholder="'+(i===0?'اقتراحك الأوّل':'اقتراحٌ '+(i===1?'ثانٍ':'ثالث'))+'">';
    var inp=$('input',f);inp.value=v;
    if(i===S.pick)inp.classList.add('cur');
    inp.addEventListener('focus',function(){S.pick=i;$$('#subs input').forEach(function(x,j){x.classList.toggle('cur',j===i)});cover()});
    inp.addEventListener('input',function(){
      collect();cover();
      later('subs',function(){push({subtitles:S.subtitles.filter(Boolean)},'subtitles').catch(function(){})});
    });
    box.appendChild(f);
  });
  $('#b-addsub').hidden=list.length>=3;
  cover();
}
function collect(){S.subtitles=$$('#subs input').map(function(x){return clean(x.value,120)});keep()}
function cover(){
  var v=(S.subtitles[S.pick]||'').trim(), c=$('#cv-sub');
  c.textContent=v||'العنوان الفرعيّ يظهر هنا';c.classList.toggle('empty',!v);
  var bad=S.subtitles.some(function(s){return hasQalb.test(s)});
  $('#rule-qalb').classList.toggle('warn',bad);
}
$('#b-addsub').addEventListener('click',function(){
  collect();if(S.subtitles.length>=3)return;
  S.subtitles.push('');S.pick=S.subtitles.length-1;renderSubs();
  var ins=$$('#subs input');ins[ins.length-1].focus();
});
$('#b-q2').addEventListener('click',function(){
  collect();
  var list=S.subtitles.filter(Boolean);
  if(!list.length){toast(g('اكتب','اكتبي')+' اقتراحًا واحدًا على الأقلّ');return}
  if(list.some(function(s){return hasQalb.test(s)})){toast('في أحد الاقتراحات كلمة «قلب»، '+g('جرّب','جرّبي')+' غيرها');return}
  S.subtitles=list;
  push({subtitles:list},'subtitles').catch(function(){});
  show('q3');
});

/* ═════════ ٥) جملة لكلّ قسم ═════════ */
var SECS=[['f-dar','secDar'],['f-saey','secSaey'],['f-tina','secTina']];
SECS.forEach(function(p){
  var inp=$('#'+p[0]), pv=$('[data-prev="'+p[1]+'"]');
  inp.value=S[p[1]]||'';
  function paint(){var v=inp.value.trim();pv.textContent=v||'…';pv.classList.toggle('empty',!v)}
  inp.addEventListener('input',function(){
    S[p[1]]=clean(inp.value,200);keep();paint();
    later(p[1],function(){var o={};o[p[1]]=S[p[1]];push(o,'secs').catch(function(){})});
  });
  paint();
});
$('#b-q3').addEventListener('click',function(){
  var o={},empty=0;
  SECS.forEach(function(p){o[p[1]]=clean($('#'+p[0]).value,200);if(!o[p[1]])empty++});
  if(empty===3){toast(g('اكتب','اكتبي')+' جملةً لقسمٍ واحد على الأقلّ');return}
  o.status='خلص';if(FS)o.finishedAt=firebase.firestore.FieldValue.serverTimestamp();
  var b=this;b.disabled=true;b.textContent='يُرسَل…';
  push(o,'secs').then(function(){
    for(var k in o)if(k!=='finishedAt')S[k]=o[k];
    show('done');
  },function(){
    toast('لم تصل الإجابات — '+g('تحقّق من الاتصال وأعد المحاولة','تحقّقي من الاتصال وأعيدي المحاولة'));
  }).then(function(){b.disabled=false;b.textContent='أرسل إجاباتي'});
});

/* ═════════ ٦) الشكر ═════════ */
$('#b-share').addEventListener('click',function(){
  var url=location.href.split('#')[0].split('?')[0];
  if(navigator.share){navigator.share({title:'إنسان — كتابٌ قبل أن يُولد',text:'كتابٌ عن الفراغ الذي يحسّه كثيرٌ منّا ولا يقولونه. اقرأ عنه وقل رأيك:',url:url}).catch(function(){})}
  else{
    try{navigator.clipboard.writeText(url);toast('نُسخ الرابط')}catch(e){toast(url)}
  }
});

/* ── البداية ── */
applyAddr();
if(S.name)$('#hello-name').textContent=S.name;
var start=(S.name&&S.phone&&S.address&&S.step&&S.step!=='welcome')?S.step:'welcome';
show(start);
if(start!=='welcome'&&start!=='done')toast('أهلًا بعودتك، '+S.name);
})();
