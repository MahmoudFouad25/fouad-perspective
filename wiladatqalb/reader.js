/* ولادة قلب — محرّك القارئ المشترك (الكتاب + رابط المرايا)
   الإعدادات في WQ_CFG داخل صفحة كلّ رابط. */
var MARKUP="<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\">\n  <symbol id=\"i-book\" viewBox=\"0 0 24 24\"><path d=\"M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z\"/><path d=\"M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5\"/></symbol>\n  <symbol id=\"i-list\" viewBox=\"0 0 24 24\"><path d=\"M9 6h11M9 12h11M9 18h11\"/><path d=\"M4 6h.01M4 12h.01M4 18h.01\"/></symbol>\n  <symbol id=\"i-search\" viewBox=\"0 0 24 24\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/></symbol>\n  <symbol id=\"i-type\" viewBox=\"0 0 24 24\"><path d=\"M4 7V5h11v2M9.5 5v14M7 19h5\"/><path d=\"M14 13v-1.5h7V13M17.5 11.5V19M16 19h3\"/></symbol>\n  <symbol id=\"i-moon\" viewBox=\"0 0 24 24\"><path d=\"M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z\"/></symbol>\n  <symbol id=\"i-sun\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/></symbol>\n  <symbol id=\"i-note\" viewBox=\"0 0 24 24\"><path d=\"M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z\"/><path d=\"M14 3v6h6M8 13h8M8 17h5\"/></symbol>\n  <symbol id=\"i-pen\" viewBox=\"0 0 24 24\"><path d=\"M12 20h9\"/><path d=\"M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z\"/></symbol>\n  <symbol id=\"i-copy\" viewBox=\"0 0 24 24\"><rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1\"/></symbol>\n  <symbol id=\"i-share\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"3\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-5-5L5 21\"/></symbol>\n  <symbol id=\"i-trash\" viewBox=\"0 0 24 24\"><path d=\"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6\"/></symbol>\n  <symbol id=\"i-x\" viewBox=\"0 0 24 24\"><path d=\"M18 6 6 18M6 6l12 12\"/></symbol>\n  <symbol id=\"i-next\" viewBox=\"0 0 24 24\"><path d=\"m15 18-6-6 6-6\"/></symbol>\n  <symbol id=\"i-prev\" viewBox=\"0 0 24 24\"><path d=\"m9 18 6-6-6-6\"/></symbol>\n  <symbol id=\"i-play\" viewBox=\"0 0 24 24\"><path d=\"M7 4v16l13-8z\"/></symbol>\n  <symbol id=\"i-pause\" viewBox=\"0 0 24 24\"><path d=\"M7 4h3v16H7zM14 4h3v16h-3z\"/></symbol>\n  <symbol id=\"i-clock\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></symbol>\n  <symbol id=\"i-check\" viewBox=\"0 0 24 24\"><path d=\"M20 6 9 17l-5-5\"/></symbol>\n  <symbol id=\"i-lock\" viewBox=\"0 0 24 24\"><rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V7a4 4 0 0 1 8 0v4\"/></symbol>\n  <symbol id=\"i-home\" viewBox=\"0 0 24 24\"><path d=\"M3 11 12 3l9 8\"/><path d=\"M5 10v10h14V10\"/></symbol>\n  <symbol id=\"i-back\" viewBox=\"0 0 24 24\"><path d=\"M9 18l6-6-6-6\"/></symbol>\n  <symbol id=\"i-leaf\" viewBox=\"0 0 24 24\"><path d=\"M12 21c-4.4 0-8-3.6-8-8 0-6 8-10 8-10s8 4 8 10c0 4.4-3.6 8-8 8z\"/><path d=\"M12 21V9\"/></symbol>\n  <symbol id=\"i-dl\" viewBox=\"0 0 24 24\"><path d=\"M12 3v12M7 10l5 5 5-5M5 21h14\"/></symbol>\n  <symbol id=\"i-orn\" viewBox=\"0 0 24 24\"><path d=\"M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z\"/></symbol>\n  <symbol id=\"g-idhn\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7.5v9\"/></symbol>\n  <symbol id=\"g-mub\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M13.5 8 9.5 12l4 4\"/></symbol>\n  <symbol id=\"g-ikh\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\" stroke-dasharray=\"2.5 3\"/><path d=\"m10.5 8 4 4-4 4\"/></symbol>\n  <symbol id=\"w-muw\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M8 20h8M12 15v5\"/></symbol>\n  <symbol id=\"w-shab\" viewBox=\"0 0 24 24\"><rect x=\"6\" y=\"7\" width=\"12\" height=\"14\" rx=\"3\"/><path d=\"M9 7V5a3 3 0 0 1 6 0v2M9 13h6\"/></symbol>\n  <symbol id=\"w-sayy\" viewBox=\"0 0 24 24\"><path d=\"M4 10h16l-1.5 10h-13z\"/><path d=\"M8 10a4 4 0 0 1 8 0\"/></symbol>\n  <symbol id=\"w-shay\" viewBox=\"0 0 24 24\"><path d=\"M3 9h7v6a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM14 9h7v6a3 3 0 0 1-3 3h-1a3 3 0 0 1-3-3z\"/><path d=\"M6 4v2.5M17.5 4v2.5\"/></symbol>\n  <symbol id=\"w-milaf\" viewBox=\"0 0 24 24\"><path d=\"M3 6h6l2 2h10v11H3z\"/><path d=\"M7 13h10\"/></symbol>\n  <symbol id=\"i-bell\" viewBox=\"0 0 24 24\"><path d=\"M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z\"/><path d=\"M10 21h4\"/></symbol>\n  <symbol id=\"i-phone\" viewBox=\"0 0 24 24\"><rect x=\"7\" y=\"2\" width=\"10\" height=\"20\" rx=\"2\"/><path d=\"M11 18h2\"/></symbol>\n  <symbol id=\"i-card\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"M3 10h18M7 15h6\"/></symbol>\n  <symbol id=\"i-plus\" viewBox=\"0 0 24 24\"><path d=\"M12 5v14M5 12h14\"/></symbol>\n  <symbol id=\"a-back\" viewBox=\"0 0 24 24\"><path d=\"M4.5 12a7.5 7.5 0 1 0 2.6-5.7\"/><path d=\"M5 3.5v4h4\"/></symbol>\n  <symbol id=\"a-fwd\" viewBox=\"0 0 24 24\"><path d=\"M20 12H4M10 6l-6 6 6 6\"/></symbol>\n  <symbol id=\"a-away\" viewBox=\"0 0 24 24\"><path d=\"M7 17 17 7M9 7h8v8\"/><path d=\"M4 20h2\" stroke-dasharray=\"1 2\"/></symbol>\n  <symbol id=\"i-bm\" viewBox=\"0 0 24 24\"><path d=\"M6 3h12v18l-6-4-6 4z\"/></symbol>\n  <symbol id=\"i-bmf\" viewBox=\"0 0 24 24\"><path d=\"M6 3h12v18l-6-4-6 4z\" fill=\"currentColor\"/></symbol>\n  <symbol id=\"i-help\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9.5\"/><path d=\"M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9\"/><path d=\"M12 17.3h.01\"/></symbol>\n  <symbol id=\"i-chat\" viewBox=\"0 0 24 24\"><path d=\"M4 5h16v11H9l-5 4z\"/><path d=\"M8 9h8M8 12h5\"/></symbol>\n  <symbol id=\"i-print\" viewBox=\"0 0 24 24\"><path d=\"M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z\"/></symbol>\n  <symbol id=\"i-sunrise\" viewBox=\"0 0 24 24\"><path d=\"M4 18h16M7 18a5 5 0 0 1 10 0M12 4v4M5 9l2 2M19 9l-2 2\"/></symbol>\n  <symbol id=\"i-eye\" viewBox=\"0 0 24 24\"><path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></symbol>\n</svg>\n\n<div class=\"boot\" id=\"boot\"><div class=\"rings\"><i></i><i></i><i></i><i></i></div><p>ولادة قلب</p></div>\n\n<!-- ═══════════ الواجهة ═══════════ -->\n<div id=\"home\"></div>\n\n<!-- ═══════════ القارئ ═══════════ -->\n<div id=\"reader\">\n  <div class=\"pbar\"><i id=\"pfill\"></i></div>\n  <header class=\"tbar\"><div class=\"tbar-in\">\n    <button class=\"ib\" data-act=\"home\" aria-label=\"واجهة الكتاب\" title=\"واجهة الكتاب\"><svg class=\"i\"><use href=\"#i-book\"/></svg></button>\n    <button class=\"ib\" data-act=\"toc\" aria-label=\"فهرس الفصل\" title=\"الفهرس\"><svg class=\"i\"><use href=\"#i-list\"/></svg></button>\n    <div class=\"tbar-c\"><b id=\"tTitle\"></b><span id=\"tCrumb\"></span></div>\n    <button class=\"ib\" data-act=\"search\" aria-label=\"البحث في الكتاب\" title=\"بحث\"><svg class=\"i\"><use href=\"#i-search\"/></svg></button>\n    <button class=\"ib\" data-act=\"settings\" aria-label=\"إعدادات القراءة\" title=\"إعدادات القراءة\"><svg class=\"i\"><use href=\"#i-type\"/></svg></button>\n  </div><div class=\"rail\" id=\"rail\" hidden></div></header>\n\n  <main class=\"page\" id=\"page\"></main>\n\n  <footer class=\"bbar\"><div class=\"bbar-in\">\n    <button class=\"navb\" id=\"bPrev\" data-act=\"prev\" aria-label=\"الفصل السابق\"><svg class=\"i\"><use href=\"#i-prev\"/></svg><span id=\"bPrevT\"></span></button>\n    <div class=\"bbar-mid\">\n      <button class=\"ib\" data-act=\"notebook\" aria-label=\"دفتري\" title=\"تظليلاتي وملاحظاتي\"><svg class=\"i\"><use href=\"#i-note\"/></svg><span class=\"badge\" id=\"nbBadge\" hidden></span></button>\n      <button class=\"ib\" data-act=\"bookmark\" id=\"bmBtn\" aria-label=\"ضع علامة هنا\" title=\"ضع علامة هنا\"><svg class=\"i\"><use href=\"#i-bm\"/></svg></button>\n      <div class=\"left-info\" id=\"leftInfo\"></div>\n      <button class=\"ib\" data-act=\"autoscroll\" id=\"asBtn\" aria-label=\"تمرير تلقائي\" title=\"تمرير تلقائي\"><svg class=\"i\"><use href=\"#i-play\"/></svg></button>\n      <button class=\"ib\" data-act=\"theme\" id=\"thBtn\" aria-label=\"الوضع الليلي\" title=\"الوضع الليلي\"><svg class=\"i\"><use href=\"#i-moon\"/></svg></button>\n    </div>\n    <button class=\"navb\" id=\"bNext\" data-act=\"next\" aria-label=\"الفصل التالي\"><span id=\"bNextT\"></span><svg class=\"i\"><use href=\"#i-next\"/></svg></button>\n  </div></footer>\n</div>\n\n<div class=\"scrim\" id=\"scrim\" data-act=\"close\"></div>\n\n<aside class=\"drawer r\" id=\"dToc\" aria-label=\"الفهرس\">\n  <div class=\"dh\"><h3>الفهرس</h3><button class=\"ib\" data-act=\"close\" aria-label=\"إغلاق\"><svg class=\"i\"><use href=\"#i-x\"/></svg></button></div>\n  <div class=\"tabs\"><button class=\"tab on\" data-tab=\"toc-ch\">هذا الفصل</button><button class=\"tab\" data-tab=\"toc-bk\">الكتاب كلّه</button></div>\n  <div class=\"db\" id=\"tocBody\"></div>\n</aside>\n\n<aside class=\"drawer r\" id=\"dNb\" aria-label=\"دفتري\">\n  <div class=\"dh\"><h3>دفتري</h3><button class=\"ib\" data-act=\"close\" aria-label=\"إغلاق\"><svg class=\"i\"><use href=\"#i-x\"/></svg></button></div>\n  <div class=\"tabs\"><button class=\"tab on\" data-tab=\"nb-ch\">هذا الفصل</button><button class=\"tab\" data-tab=\"nb-all\">الكتاب كلّه</button><button class=\"tab\" data-tab=\"nb-ref\">تأمّلاتي</button><button class=\"tab\" data-tab=\"nb-bm\">علاماتي</button></div>\n  <div class=\"db\" id=\"nbBody\"></div>\n</aside>\n\n<aside class=\"drawer l\" id=\"dSet\" aria-label=\"إعدادات القراءة\">\n  <div class=\"dh\"><h3>إعدادات القراءة</h3><button class=\"ib\" data-act=\"close\" aria-label=\"إغلاق\"><svg class=\"i\"><use href=\"#i-x\"/></svg></button></div>\n  <div class=\"db\" id=\"setBody\"></div>\n</aside>\n\n<div class=\"selbar\" id=\"selbar\" role=\"toolbar\" aria-label=\"أدوات النصّ المحدّد\">\n  <button class=\"sw sw-yellow\" data-hl=\"yellow\" aria-label=\"أصفر\"></button>\n  <button class=\"sw sw-green\" data-hl=\"green\" aria-label=\"أخضر\"></button>\n  <button class=\"sw sw-red\" data-hl=\"red\" aria-label=\"أحمر\"></button>\n  <button class=\"sw sw-blue\" data-hl=\"blue\" aria-label=\"أزرق\"></button>\n  <span class=\"sep\"></span>\n  <button class=\"ac\" data-sel=\"note\"><svg class=\"i\"><use href=\"#i-pen\"/></svg>ملاحظة</button>\n  <button class=\"ac\" data-sel=\"copy\" aria-label=\"نسخ\"><svg class=\"i\"><use href=\"#i-copy\"/></svg></button>\n  <button class=\"ac\" data-sel=\"share\" aria-label=\"اقتباس كصورة\"><svg class=\"i\"><use href=\"#i-share\"/></svg></button>\n  <button class=\"ac\" data-sel=\"del\" id=\"selDel\" aria-label=\"إزالة التظليل\"><svg class=\"i\"><use href=\"#i-trash\"/></svg></button>\n</div>\n\n<div class=\"modal\" id=\"mNote\"><div class=\"mbox\">\n  <div class=\"mh\"><h3>ملاحظتي</h3><button class=\"ib\" data-act=\"mclose\" aria-label=\"إغلاق\"><svg class=\"i\"><use href=\"#i-x\"/></svg></button></div>\n  <div class=\"mb\"><blockquote id=\"noteQ\"></blockquote><textarea id=\"noteT\" placeholder=\"اكتب ما حرّكته فيك هذه الكلمات…\"></textarea></div>\n  <div class=\"mf\"><button class=\"btn\" id=\"noteSave\">حفظ</button><button class=\"btn sec\" data-act=\"mclose\">إلغاء</button></div>\n</div></div>\n\n<div class=\"modal\" id=\"mSearch\"><div class=\"mbox\" style=\"height:80vh\">\n  <div class=\"srch\"><svg class=\"i\"><use href=\"#i-search\"/></svg><input id=\"sIn\" type=\"search\" placeholder=\"ابحث في الكتاب…\" autocomplete=\"off\"><button class=\"ib\" data-act=\"mclose\" aria-label=\"إغلاق\"><svg class=\"i\"><use href=\"#i-x\"/></svg></button></div>\n  <div class=\"sres\" id=\"sRes\"></div>\n</div></div>\n\n<div class=\"modal\" id=\"mShare\"><div class=\"mbox\">\n  <div class=\"mh\"><h3>اقتباس للمشاركة</h3><button class=\"ib\" data-act=\"mclose\" aria-label=\"إغلاق\"><svg class=\"i\"><use href=\"#i-x\"/></svg></button></div>\n  <div class=\"mb\"><img id=\"shareImg\" class=\"share-prev\" alt=\"صورة الاقتباس\"></div>\n  <div class=\"mf\"><button class=\"btn\" id=\"shareGo\">مشاركة</button><button class=\"btn sec\" id=\"shareDl\">تنزيل الصورة</button></div>\n</div></div>\n\n<div class=\"rpill\" id=\"resumePill\" role=\"status\"><svg class=\"i\"><use href=\"#i-bmf\"/></svg><span id=\"rpText\"></span><button data-act=\"fromTop\">من أوّل الفصل</button><button class=\"rpx\" data-act=\"rpClose\" aria-label=\"إغلاق\">×</button></div>\n<div class=\"toast\" id=\"toast\" role=\"status\"></div>";
(function(){
'use strict';

/* ══════════════════════════════════════════════
   ١. الأساسات
   ══════════════════════════════════════════════ */
var CFG=window.WQ_CFG||{};
var GUEST=!!CFG.guest;
document.body.insertAdjacentHTML('afterbegin',MARKUP);
if(CFG.bootTitle)document.querySelector('#boot p').textContent=CFG.bootTitle;
(function(){var s=document.createElement('script');s.src=(CFG.manifest||'manifest.js')+'?ts='+Date.now();s.onload=function(){window.__mOK&&window.__mOK()};s.onerror=function(){window.__mFail&&window.__mFail()};document.head.appendChild(s)})();
if(window.firebase&&!firebase.apps.length)firebase.initializeApp({apiKey:"AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",authDomain:"fouad-perspective.firebaseapp.com",projectId:"fouad-perspective",storageBucket:"fouad-perspective.firebasestorage.app",messagingSenderId:"1068763865336",appId:"1:1068763865336:web:b791abcd22d536aedd5b0d"});
var FS=window.firebase&&firebase.firestore?firebase.firestore():null;
/* في وضع الضيف: كلّ بيانات القارئ على جهازه فقط (واجهة تشبه الفايرستور) */
function localDB(){
  var P=(CFG.bookKey||'wq')+'::';
  return{collection:function(c){return{doc:function(id){var k=P+c+'/'+id;return{
    get:function(){var v=null;try{v=JSON.parse(localStorage.getItem(k))}catch(e){}return Promise.resolve({exists:!!v,data:function(){return JSON.parse(JSON.stringify(v))}})},
    set:function(d,o){var cur={};try{if(o&&o.merge)cur=JSON.parse(localStorage.getItem(k))||{}}catch(e){}
      (function m(a,b){for(var x in b){if(b[x]&&typeof b[x]==='object'&&!Array.isArray(b[x])&&a[x]&&typeof a[x]==='object')m(a[x],b[x]);else a[x]=b[x]}})(cur,JSON.parse(JSON.stringify(d)));
      try{localStorage.setItem(k,JSON.stringify(cur));return Promise.resolve()}catch(e){return Promise.reject(e)}}}}}}};
}
var db=GUEST?localDB():FS,auth=GUEST?null:firebase.auth(),FV=GUEST?{serverTimestamp:function(){return Date.now()}}:firebase.firestore.FieldValue;
function rid(){var r=ls('wq-rid');if(!r){r='r'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);ls('wq-rid',r)}return r}

var BOOK_KEY=CFG.bookKey||'wq-b1';               /* لا تغيّره — مفاتيح بيانات القرّاء */
var C_PROG='wiladatqalb_progress',C_HL='wiladatqalb_highlights',C_NOTES='wiladatqalb_notes';
var WPM=150;                        /* سرعة قراءة متأنّية */

var $=function(s,r){return(r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
var AR='٠١٢٣٤٥٦٧٨٩';
function ar(n){return String(n).replace(/[0-9]/g,function(d){return AR[d]})}
var ORD_M=['','الأوّل','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر','الثالث عشر','الرابع عشر','الخامس عشر'];
var ORD_F=['','الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة'];
function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function minutes(m){m=Math.max(1,Math.round(m));if(m>=60){var hh=Math.floor(m/60),mm=m%60;var hs=hh===1?'ساعة':hh===2?'ساعتان':ar(hh)+' ساعات';return mm?hs+' و'+minutes(mm):hs}if(m===1)return'دقيقة';if(m===2)return'دقيقتان';if(m<=10)return ar(m)+' دقائق';return ar(m)+' دقيقة'}
function toast(m){var t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(function(){t.classList.remove('on')},2300)}
function ls(k,v){try{if(v===undefined){var x=localStorage.getItem(k);return x?JSON.parse(x):null}localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function tc(e,sel){var t=e.target;if(t&&t.nodeType===3)t=t.parentElement;return t&&t.closest?t.closest(sel):null}
function debounce(fn,ms){var t;return function(){var a=arguments,s=this;clearTimeout(t);t=setTimeout(function(){fn.apply(s,a)},ms)}}

/* تهذيب طباعيّ عند العرض فقط (لا يمسّ ملفّات المحتوى) */
function typo(t){
  return t
    .replace(/ - /g,' — ')
    .replace(/([؀-ۿ])\s*,\s*/g,'$1، ')
    .replace(/"([^"\n]{1,200})"/g,'«$1»');
}
function rich(t){
  if(!t)return'';
  return esc(typo(t)).replace(/﴿([^﴾]+)﴾/g,'<span class="qv">﴿$1﴾</span>').replace(/\[(وقفة|مرآة جانبيّة)\]/g,'<span class="tchip">$1</span>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>');
}
function plain(t){return typo(String(t||'')).replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1')}

/* ══════════════════════════════════════════════
   ٢. الحالة
   ══════════════════════════════════════════════ */
var book=null,uid=null;
var flat=[];                 /* الفصول المنشورة بالترتيب */
var allCh=[];                /* كل الفصول (منشورة ومسودّة) */
var content={};              /* محتوى الفصول المحمّلة */
var loading={};              /* وعود التحميل */
var cur=-1;                  /* فهرس الفصل المفتوح في flat */
var prog={chapters:{}};      /* تقدّم القارئ */
var hls=[],notes=[],refl={}; /* بيانات الفصل المفتوح */
var nbCache={};              /* بيانات الدفتر لكلّ الفصول */

var PREF_DEF={fs:0,lh:2,cw:700,font:'zain',theme:'light',ta:'justify',as:2};
var prefs=Object.assign({},PREF_DEF,ls('wq3-prefs')||{});

/* ══════════════════════════════════════════════
   ٣. الإقلاع: الفهرس + الدخول
   ══════════════════════════════════════════════ */
var mReady=false,aReady=false;
window.__mOK=function(){
  if(!window.WQ_BOOK)return window.__mFail();
  book=window.WQ_BOOK;buildIndex();mReady=true;start();
};
window.__mFail=function(){hideBoot();$('#home').style.display='block';$('#home').innerHTML=wall('تعذّر فتح الكتاب','حدث خطأ أثناء التحميل. تأكّد من اتصالك ثمّ حدّث الصفحة.','')};

var REVIEW=(function(){try{if(/[?&]review=1/.test(location.search))sessionStorage.setItem('wq-review','1');if(/[?&]review=0/.test(location.search))sessionStorage.removeItem('wq-review');return sessionStorage.getItem('wq-review')==='1'}catch(e){return false}})();
function buildIndex(){
  var parts={};(book.parts||[]).forEach(function(p){parts[p.id]=p});
  flat=[];allCh=[];
  (book.stations||[]).forEach(function(st){
    var part=parts[st.part]||{id:'_',label:'',title:'',unit:'الفصل',unitGender:'m'};
    (st.chapters||[]).forEach(function(c){
      var o={id:c.id,number:c.number,title:c.title,file:c.file,v:c.v||1,pub:c.status==='published'||(c.status==='review'&&REVIEW),review:c.status==='review',station:st,part:part};
      o.label=unitLabel(o);
      allCh.push(o);
      if(o.pub){o.fi=flat.length;flat.push(o)}
    });
  });
}
function unitLabel(c){
  if(c.number===0)return'المدخل';
  var f=c.part.unitGender==='f';var w=(f?ORD_F:ORD_M)[c.number]||ar(c.number);
  return(c.part.unit||'الفصل')+' '+w;
}

if(GUEST){setTimeout(function(){uid=rid();aReady=true;start()},0)}
else auth.onAuthStateChanged(function(u){
  var id=u?u.uid:null;
  if(!id){try{var enc=localStorage.getItem('_enc_user');if(enc)id=JSON.parse(decodeURIComponent(atob(enc.split('').reverse().join('')))).id}catch(e){}}
  if(!id)id=localStorage.getItem('userId');
  uid=id;aReady=true;start();
});

function start(){
  if(!mReady||!aReady||start.done)return;start.done=true;
  applyPrefs();
  if(!uid){hideBoot();$('#home').style.display='block';$('#home').innerHTML=wall(book.title,'سجّل دخولك لتفتح الكتاب وتكمل رحلتك من حيث توقّفت.','<a class="cta" href="'+(CFG.loginUrl||'../login.html')+'"><span class="ct">تسجيل الدخول</span><svg class="i"><use href="#i-next"/></svg></a>');return}
  var local=ls(BOOK_KEY+'-prog');if(local&&local.chapters)prog=local;
  db.collection(C_PROG).doc(uid+'_'+BOOK_KEY).get().then(function(d){
    if(d.exists){var r=d.data();prog=mergeProg(prog,r)}
  }).catch(function(){}).then(function(){
    route(true);
    hideBoot();
    idle(prefetchAll);
  });
}
function mergeProg(a,b){
  var out={chapterId:a.chapterId||b.chapterId,chapters:Object.assign({},a.chapters||{})};
  var bc=b.chapters||{},lastT=0,lastId=null;
  Object.keys(bc).forEach(function(k){
    var x=out.chapters[k]||{},y=bc[k]||{},nw=(y.t||0)>(x.t||0)?y:x;
    out.chapters[k]={pct:Math.max(x.pct||0,y.pct||0),done:!!(x.done||y.done),b:nw.b,n:nw.n||x.n||y.n,h:nw.h,t:Math.max(x.t||0,y.t||0)};
  });
  Object.keys(out.chapters).forEach(function(k){var t=out.chapters[k].t||0;if(t>lastT){lastT=t;lastId=k}});
  if(lastId)out.chapterId=lastId;
  var ab=a.bookmarks||[],bb=b.bookmarks||[];
  out.bookmarks=(b.bmT||0)>(a.bmT||0)?bb:ab;out.bmT=Math.max(a.bmT||0,b.bmT||0);
  return out;
}
function hideBoot(){$('#boot').classList.add('gone')}
function idle(fn){(window.requestIdleCallback||function(f){setTimeout(f,1200)})(fn)}
function wall(t,p,btn){return'<div class="wall"><div><div class="rings"><i></i><i></i><i></i><i></i></div><h2>'+esc(t)+'</h2><p>'+esc(p)+'</p>'+btn+'</div></div>'}

/* ══════════════════════════════════════════════
   ٤. التوجيه (الواجهة ↔ الفصل) مع زرّ الرجوع
   ══════════════════════════════════════════════ */
function route(first){
  var p=new URLSearchParams(location.search),cid=p.get('ch');
  var i=cid?flat.findIndex(function(c){return c.id===cid}):-1;
  if(i>=0){var b=location.hash.match(/^#b(\d+)$/);openChapter(i,{push:false,block:b?+b[1]:null})}
  else showHome();
}
window.addEventListener('popstate',function(){closeAll();stopAS();route()});
function go(url,push){if(push)history.pushState(null,'',url);else history.replaceState(null,'',url)}

/* ══════════════════════════════════════════════
   ٥. تحميل الفصول
   ══════════════════════════════════════════════ */
function load(c){
  if(content[c.id])return Promise.resolve(content[c.id]);
  if(loading[c.id])return loading[c.id];
  loading[c.id]=new Promise(function(res,rej){
    window.WQ_CONTENT=window.WQ_CONTENT||{};
    var s=document.createElement('script');
    s.src=book.contentPath+c.file+'?v='+c.v+'.'+(book.version||1);
    s.onload=function(){var d=window.WQ_CONTENT[c.id];if(!d){delete loading[c.id];return rej()}content[c.id]=prep(d);res(content[c.id])};
    s.onerror=function(){delete loading[c.id];rej()};
    document.head.appendChild(s);
  });
  return loading[c.id];
}
function prep(d){
  var words=0,secs=[];
  (d.sections||[]).forEach(function(s,i){
    var t=(s.content||'');words+=t.split(/\s+/).filter(Boolean).length;
    if(s.type==='section_header')secs.push({i:i,t:t,lv:s.lv===1?1:2,rail:s.rail});
    else if(s.type==='door_open')secs.push({i:i,t:t,lv:1,door:s.door,rail:s.rail});
    else if(s.type==='style_open')secs.push({i:i,t:t,lv:2,door:s.door,style:1});
    else if(s.type==='tool_open'||s.type==='state_open')secs.push({i:i,t:t,lv:2});
  });
  d._words=words;d._min=words/WPM;d._secs=secs;d._rail=secs.filter(function(x){return x.rail});return d;
}
function prefetchAll(){flat.reduce(function(p,c){return p.then(function(){return load(c).catch(function(){})})},Promise.resolve()).then(function(){if($('#home').style.display==='block')refreshHomeTimes()})}

/* ══════════════════════════════════════════════
   ٦. الواجهة: غلاف + تقدّم + فهرس الرحلة
   ══════════════════════════════════════════════ */
function showHome(){
  cur=-1;stopAS();hideSel();
  $('#reader').style.display='none';$('#home').style.display='block';
  document.body.classList.remove('bars-hidden');
  go(location.pathname,false);
  var last=lastChapter(),lc=last?flat[last.i]:null;
  var doneN=flat.filter(function(c){return(prog.chapters[c.id]||{}).done}).length;
  var pct=flat.length?Math.round(flat.reduce(function(a,c){var x=prog.chapters[c.id]||{};return a+(x.done?100:(x.pct||0))},0)/flat.length):0;

  var h='<section class="hero"><div class="hero-bg"></div><div class="hero-art rings"><i></i><i></i><i></i><i></i></div>';
  h+='<div class="home-top">'+(CFG.backUrl?'<a class="ghost" href="'+CFG.backUrl+'"><svg class="i"><use href="#i-back"/></svg>'+esc(CFG.backLabel||'رحلاتي')+'</a>':'<span></span>')+'<div class="grp"><button class="ib" data-act="tour" aria-label="جولة تعريفيّة" title="جولة تعريفيّة"><svg class="i"><use href="#i-help"/></svg></button><button class="ib" data-act="search" aria-label="بحث"><svg class="i"><use href="#i-search"/></svg></button><button class="ib" data-act="theme" aria-label="الوضع الليلي"><svg class="i"><use href="#i-'+(prefs.theme==='dark'?'sun':'moon')+'"/></svg></button></div></div>';
  h+='<div class="hero-in"><div class="series">'+esc(book.seriesTitle||'')+'</div><h1>'+esc(book.title)+'</h1>';
  h+='<div class="blabel">'+esc(book.bookLabel||'')+'</div><div class="auth">'+esc(book.author||'')+'</div>';
  if(book.epigraph)h+='<p class="epi">'+esc(book.epigraph)+'</p>';else h+='<div style="height:34px"></div>';
  if(lc&&last.started){
    h+='<button class="cta" data-open="'+lc.fi+'"'+(last.fresh?' data-fresh="1"':'')+'><span class="ct"><small>'+(last.fresh?'تابع إلى ما بعده':'تابع من حيث توقّفت')+'</small>'+esc(lc.label)+' — '+esc(lc.title)+(last.p&&last.p.h?'<em class="cta-at">عند «'+esc(last.p.h)+'»</em>':'')+'</span><svg class="i"><use href="#i-next"/></svg></button>';
  }else if(flat.length){
    h+='<button class="cta" data-open="0"><span class="ct">ابدأ القراءة</span><svg class="i"><use href="#i-next"/></svg></button>';
  }
  var nbm=(prog.bookmarks||[]).length;
  h+='<div class="hero-links">'+(nbm?'<button class="ghost" data-act="bookmarksHome"><svg class="i"><use href="#i-bm"/></svg>علاماتي ('+ar(nbm)+')</button>':'')+'<button class="ghost" data-act="scrollToc"><svg class="i"><use href="#i-list"/></svg>فهرس الرحلة</button><button class="ghost" data-act="notebookHome"><svg class="i"><use href="#i-note"/></svg>دفتري</button></div>';
  h+='</div></section>';

  h+='<section class="stats">';
  h+='<div class="stat"><b>'+ar(flat.length)+'</b><span>'+(CFG.availLabel||'فصول متاحة')+'</span></div>';
  h+='<div class="stat"><b>'+ar(doneN)+'</b><span>أتممتها</span></div>';
  h+='<div class="stat"><b id="totTime">—</b><span>زمن القراءة</span></div>';
  h+='<div class="meter"><span>'+esc(CFG.progLabel||'تقدّمك في الكتاب')+'</span><div class="bar"><i style="width:'+pct+'%"></i></div><span>'+ar(pct)+'٪</span></div>';
  h+='</section>';

  if(CFG.homeNote)h+='<div class="guest-note">'+CFG.homeNote+'</div>';
  h+='<section class="toc" id="tocAnchor"><div class="toc-h"><h2>'+esc(CFG.tocTitle||'رحلة الكتاب')+'</h2><p>'+esc(CFG.tocSub||'كلّ فصلٍ باب، وكلّ بابٍ يفتح ما بعده.')+'</p></div>';
  (book.parts||[{id:'_'}]).forEach(function(p){
    var sts=(book.stations||[]).filter(function(s){return(s.part||'_')===p.id||(!book.parts)});
    if(!sts.length)return;
    var pc=allCh.filter(function(c){return c.part.id===p.id});
    var pub=pc.filter(function(c){return c.pub}).length;
    var single=(book.parts||[]).length<=1&&(book.stations||[]).length<=1;
    h+='<div class="part'+(single?' single':'')+'"><div class="part-h"><small>'+esc(p.label||'')+'</small><h3>'+esc(p.title||'')+'</h3><em>'+(pub?ar(pub)+' من '+ar(pc.length)+' متاحة':'قيد الكتابة')+'</em></div>';
    sts.forEach(function(st){
      h+='<div class="station"><div class="st-h"><span class="dot"></span><div>'+(single&&st.title===p.title?'':'<h4>'+esc(st.title)+'</h4>')+(st.gate?'<p>'+esc(st.gate)+'</p>':'')+'</div></div><div class="chs">';
      allCh.filter(function(c){return c.station===st}).forEach(function(c){h+=chRow(c,lc)});
      h+='</div></div>';
    });
    h+='</div>';
  });
  h+='</section><footer class="foot">'+esc(book.title)+' · '+esc(book.seriesTitle||'')+' · '+esc(book.author||'')+'</footer>';
  $('#home').innerHTML=h;
  window.scrollTo(0,0);
  refreshHomeTimes();
  setTimeout(function(){if(cur<0)startTour('home')},900);
}
function chRow(c,lc){
  var p=prog.chapters[c.id]||{};
  if(!c.pub)return'<div class="chrow lock" aria-disabled="true"><span class="n">'+(c.number?ar(c.number):'٠')+'</span><span class="t"><b>'+esc(c.title)+'</b><span>'+esc(c.label)+'</span></span><span class="st"><svg class="i"><use href="#i-lock"/></svg><span class="lbl">قريبًا</span></span></div>';
  var st;
  if(p.done)st='<svg class="i"><use href="#i-check"/></svg><span class="lbl">أتممته</span>';
  else if(p.pct>0)st=ring(p.pct)+'<span class="lbl">'+ar(p.pct)+'٪</span>';
  else st='';
  var cls='chrow'+(p.done?' done':'')+(lc&&lc.id===c.id?' cur':'');
  return'<button class="'+cls+'" data-open="'+c.fi+'"><span class="n">'+(c.number?ar(c.number):'٠')+'</span><span class="t"><b>'+esc(c.title)+(c.review?' <small class="rv">للمراجعة</small>':'')+'</b><span data-time="'+c.id+'">'+esc(c.label)+'</span></span><span class="st">'+st+'</span></button>';
}
function ring(p){var r=12,C=2*Math.PI*r;return'<svg class="prog-ring" viewBox="0 0 30 30"><circle class="bgc" cx="15" cy="15" r="'+r+'"/><circle class="fgc" cx="15" cy="15" r="'+r+'" stroke-dasharray="'+C+'" stroke-dashoffset="'+(C*(1-p/100))+'"/></svg>'}
function refreshHomeTimes(){
  var tot=0,all=true;
  flat.forEach(function(c){var d=content[c.id];var el=$('[data-time="'+c.id+'"]');
    if(d){tot+=d._min;if(el)el.textContent=c.label+' · '+minutes(d._min)}else all=false});
  var t=$('#totTime');if(t&&all){var hrs=tot/60;t.textContent=hrs>=1?ar(Math.round(hrs*10)/10).replace('.','٫')+' س':minutes(tot)}
}
function atEnd(p){return p.done&&(!p.n||p.b==null||p.b>=p.n-8)}
function resumable(p){return p&&p.b!=null&&p.b>2&&!atEnd(p)}
function lastChapter(){
  var id=prog.chapterId;var i=id?flat.findIndex(function(c){return c.id===id}):-1;
  if(i<0)return null;
  var p=prog.chapters[id]||{};
  if(atEnd(p)&&i<flat.length-1)return{i:i+1,started:true,fresh:true};
  return{i:i,started:true,p:resumable(p)?p:null};
}

/* ══════════════════════════════════════════════
   ٧. فتح الفصل وعرضه
   ══════════════════════════════════════════════ */
function openChapter(i,opt){
  opt=opt||{};
  if(i<0||i>=flat.length)return;
  var c=flat[i];
  closeAll();stopAS();hideSel();
  if(cur>=0)flushPos();
  cur=i;
  $('#home').style.display='none';$('#reader').style.display='block';
  document.body.classList.remove('bars-hidden');
  if(opt.push!==false)go(location.pathname+'?ch='+c.id,true);else go(location.pathname+'?ch='+c.id+location.hash,false);
  updateBars();
  $('#page').innerHTML='<div class="wall" style="min-height:60vh"><div><div class="rings" style="--rs:80px"><i></i><i></i><i></i><i></i></div></div></div>';
  load(c).then(function(d){
    if(cur!==i)return;
    render(c,d);
    var target=opt.block,resumed=false;
    if(target==null&&opt.resume!==false){var p=prog.chapters[c.id];if(resumable(p)){target=p.b;resumed=true}}
    requestAnimationFrame(function(){
      if(target!=null){jumpBlock(target,opt.block!=null)}else window.scrollTo(0,0);
      if(target!=null)settleJump(target,i);
      if(resumed)showResume(prog.chapters[c.id]);
      setTimeout(function(){if(cur===i)startTour('reader')},resumed?1600:1100);
    });
    loadChapterData(c);
    saveProg(true);
    if(i+1<flat.length)idle(function(){load(flat[i+1]).catch(function(){})});
  }).catch(function(){
    $('#page').innerHTML=wall('تعذّر فتح الفصل','تأكّد من اتصالك بالإنترنت ثمّ أعد المحاولة.','<button class="cta" data-open="'+i+'"><span class="ct">إعادة المحاولة</span></button>');
  });
}

function render(c,d){
  var secs=d.sections||[];
  var h='';
  var stPub=allCh.filter(function(x){return x.station===c.station&&x.pub});var stFirst=stPub.length&&stPub[0].id===c.id;
  if(stFirst&&c.station.gate)h+='<section class="gate"><span class="gl">'+esc(c.part.label?c.part.label+' · '+c.part.title:'')+'</span><h2>محطّة '+esc(c.station.title)+'</h2><p>'+esc(c.station.gate)+'</p></section>';
  h+='<header class="opener">'+(stFirst&&c.station.gate?'':'<div class="crumb">'+esc(c.part.label?c.part.label+' · ':'')+esc(c.station.title)+'</div>');
  if(d.mirror)h+='<div class="mirror-art" aria-hidden="true"><i></i></div>';
  h+='<span class="num">'+esc(c.label)+'</span><h1>'+esc(d.title||c.title)+'</h1>';
  h+='<div class="meta"><span><svg class="i"><use href="#i-clock"/></svg>'+minutes(d._min)+' قراءة</span>'+(d._secs.length?'<span><svg class="i"><use href="#i-list"/></svg>'+ar(d._secs.length)+' '+(d._secs.length>10?'وقفة':'وقفات')+'</span>':'')+'</div>';
  if(d._rail.length)h+='<nav class="omap" aria-label="خريطة '+esc(c.label)+'">'+d._rail.map(function(r,k){return'<button data-jump="'+r.i+'"'+(r.door?' class="dr-'+r.door+'"':'')+'><b>'+ar(k+1)+'</b>'+esc(r.rail)+'</button>'}).join('')+'</nav>';
  h+='<div class="orn"><svg><use href="#i-orn"/></svg></div></header><article class="art" id="art">';
  CUR_SECS=secs;
  for(var i=0;i<secs.length;i++){
    var s=secs[i];
    if(s.grp){
      var gi=i,gs=s.gs||'';
      h+='<div class="grp gs-'+gs+'">';
      if(GROUP_HEAD[gs])h+=GROUP_HEAD[gs](s);
      if(s.gt)h+='<div class="gt">'+esc(s.gt)+'</div>';
      h+='<div class="gin">';
      while(gi<secs.length&&secs[gi].grp===s.grp){h+=block(secs[gi],gi);gi++}
      h+='</div></div>';i=gi-1;
    }else h+=block(s,i);
  }
  h+='</article>'+fbChapterCard(c)+endCard(c);
  $('#page').innerHTML=h;
  buildRail(d);
  cacheLayout();
  observeReveal();
  fbFill();
  paintBms();
}
function block(s,i){
  var a=' id="b'+i+'" data-b="'+i+'"';
  if(MB[s.type])return MB[s.type](s,i,a);
  switch(s.type){
    case'prose':
      if(s.k||s.lbl||s.who||s.door||s.sign||s.pic||s.ans||s.qn||s.mn||s.cn)return decorated(s,i,a);
      return'<p class="b b-p"'+a+'><span class="bt">'+rich(s.content)+'</span></p>';
    case'section_header':
      if(s.lv===1)return'<header class="b b-part"'+a+'><span class="po" aria-hidden="true"><i></i><i></i><i></i></span><h2 class="bt">'+rich(s.content)+'</h2></header>';
      return'<h2 class="b b-h"'+a+'><span class="bt">'+rich(s.content)+'</span></h2>';
    case'divider':return'<div class="b b-d"'+a+' aria-hidden="true"><i></i><i></i><i></i></div>';
    case'verse':return'<figure class="b b-v"'+a+'><span class="br">﴿ </span><span class="bt">'+esc(s.content)+'</span><span class="br"> ﴾</span>'+(s.reference?'<figcaption class="ref">'+esc(s.reference)+'</figcaption>':'')+'</figure>';
    case'hadith':return'<figure class="b b-hd"'+a+'><span class="lbl">قال رسول الله ﷺ</span><span class="bt">«'+esc(s.content)+'»</span>'+(s.reference?'<figcaption class="ref">'+esc(s.reference)+'</figcaption>':'')+'</figure>';
    case'emphasis':return'<blockquote class="b b-e'+(s.door?' dr-'+s.door:'')+(s.big?' big':'')+'"'+a+'><span class="bt">'+rich(s.content)+'</span></blockquote>';
    case'pause':return'<aside class="b b-pz"'+a+'><div class="breath" aria-hidden="true"></div><span class="lbl">وقفة</span><span class="bt">'+rich(s.content)+'</span></aside>';
    case'reflection':return'<aside class="b b-r"'+a+'><span class="lbl"><svg class="i"><use href="#i-leaf"/></svg>سؤال للتأمّل</span><span class="bt">'+rich(s.content)+'</span><div class="ans"><textarea data-refl="'+i+'" placeholder="اكتب ما يحضرك هنا… لا يراه أحدٌ غيرك." aria-label="إجابتك"></textarea><div class="st" data-rst="'+i+'"></div></div></aside>';
    case'closing_quote':return'<blockquote class="b b-e"'+a+'><span class="bt">'+rich(s.content)+'</span>'+(s.reference?'<span class="ref">'+esc(s.reference)+'</span>':'')+'</blockquote>';
    case'exercise':return'<aside class="b b-r"'+a+'><span class="lbl">'+esc(s.title||'تمرين')+'</span><span class="bt">'+rich(s.content||s.description||'')+'</span>'+(s.url?'<p style="margin-top:.6em"><a class="ghost" href="'+esc(s.url)+'" target="_blank" rel="noopener">ابدأ التمرين</a></p>':'')+'</aside>';
    default:return'';
  }
}
/* ══════════════════════════════════════════════
   ٧-ب. كتل المرايا — لغة بصريّة للأبواب والأساليب والمشاهد
   ══════════════════════════════════════════════ */
var CUR_SECS=[];
var DOORS={idhn:{name:'باب الإذن',move:'يثبت'},mub:{name:'باب المبادرة',move:'يتقدّم'},ikh:{name:'باب الإخلاء',move:'يتراجع'}};
var DOOR_ORD=['','الباب الأوّل','الباب الثاني','الباب الثالث'];
var STYLE_ORD=['','الأسلوب الأوّل','الأسلوب الثاني','الأسلوب الثالث'];
var SIGN_ORD=['','العلامة الأولى','العلامة الثانية','العلامة الثالثة','العلامة الرابعة'];
var WHO={
  muw:{n:'الموظّفة',i:'w-muw'},shab:{n:'الشابّ',i:'w-shab'},sayy:{n:'السيّدة',i:'w-sayy'},shay:{n:'رجل الشاي',i:'w-shay'},milaf:{n:'صاحبة الملفّ',i:'w-milaf'},
  p1:{n:'الأوّل · يثبت',i:'g-idhn',d:'idhn'},p2:{n:'الثاني · يتقدّم',i:'g-mub',d:'mub'},p3:{n:'الثالث · يتراجع',i:'g-ikh',d:'ikh'}
};
function ico(id,cls){return'<svg class="'+(cls||'i')+'" aria-hidden="true"><use href="#'+id+'"/></svg>'}
function dchip(d){return'<span class="dchip dr-'+d+'">'+ico('g-'+d)+DOORS[d].name+'</span>'}
function splitHead(t){var k=t.indexOf(':');return k<0?esc(t):'<span class="pre">'+esc(t.slice(0,k+1))+'</span> '+esc(t.slice(k+1).trim())}

/* فقرة مزخرفة: تبقى الفقرة كما هي، وتُضاف حولها العلامات */
function decorated(s,i,a){
  var cls='b b-x',pre='',post='';
  if(s.door)cls+=' dr-'+s.door;
  if(s.who){var w=WHO[s.who];cls+=' has-who'+(w.d?' dr-'+w.d:'');pre+='<span class="who">'+ico(w.i)+esc(w.n)+'</span>'}
  if(s.sign)pre+='<span class="sign"><b>'+ar(s.sign)+'</b>'+SIGN_ORD[s.sign]+'</span>';
  else if(s.door&&!s.grp)pre+=dchip(s.door);
  if(s.qn){cls+=' k-qual';pre+='<span class="qh"><b>'+ar(s.qn)+'</b>'+esc(s.qlbl||'')+'</span>'}
  if(s.mn){var mc=mirrorChapters()[s.mn];cls+=' k-desc';a+=' style="--dp:'+s.mn+'"';pre+='<'+(mc&&mc.pub?'button data-open="'+mc.fi+'"':'span')+' class="mh"><i>'+ar(s.mn)+'</i>'+(mc?'المرآة '+ORD_F[s.mn]+' · '+esc(mc.title):'')+'</'+(mc&&mc.pub?'button':'span')+'>'}
  if(s.cn){pre+='<span class="cl cnl">'+esc(s.cn)+'</span>'}
  if(s.lbl){pre+='<span class="cl">'+(s.pic?picSvg(s.pic):'')+(s.ans?ico('a-'+s.ans):'')+esc(s.lbl)+'</span>'}
  switch(s.k){
    case'first':cls+=' k-first';pre+='<span class="kl">ما تقوله عن نفسك</span>';break;
    case'carry':cls+=' k-carry';pre+='<span class="kl">'+ico('i-leaf')+'احمله معك إلى يومك</span>';post+='<button class="carry-btn" data-carry="'+esc(s.key)+'">'+ico('i-plus')+'<span>احمله معي</span></button>';break;
    case'bridge':cls+=' k-bridge';post+='<span class="bridge-arrow" aria-hidden="true"></span>';break;
    case'term':cls+=' k-term';break;
    case'askq':cls+=' k-askq';pre+='<span class="qn">'+ar(s.n)+'</span>';break;
  }
  return'<div class="'+cls+'"'+a+'>'+pre+'<p class="bt">'+rich(s.content)+'</p>'+post+'</div>';
}
function picSvg(k){
  /* ثلاث صور للإخلاء: ينخفض · يخرج · يذوب */
  var fr='<rect x="2" y="3" width="36" height="26" rx="4" class="fr"/>';
  if(k==='low')return'<svg class="pic" viewBox="0 0 40 32">'+fr+'<circle cx="20" cy="17" r="4"/><path d="M13 29c1-5 4-7 7-7s6 2 7 7"/></svg>';
  if(k==='out')return'<svg class="pic" viewBox="0 0 40 32">'+fr+'<circle cx="37" cy="12" r="4"/><path d="M31 29c1-6 3-9 6-9"/></svg>';
  return'<svg class="pic" viewBox="0 0 40 32">'+fr+'<circle cx="20" cy="11" r="4" class="ghost"/><path d="M13 29c1-7 4-10 7-10s6 3 7 10" class="ghost"/></svg>';
}

var GROUP_HEAD={
  scene2:function(){return'<div class="scene-h">'+ico('i-phone')+'<span>منتصف الليل · رنّة</span></div>'},
  pause:function(){return'<div class="breath" aria-hidden="true"></div>'},
  breath:function(){return'<div class="breath" aria-hidden="true"></div>'},
  gentle:function(){return'<div class="gentle-i">'+ico('i-leaf')+'</div>'},
  side:function(){return'<div class="side-glass" aria-hidden="true"></div>'},
  descent:function(){return'<div class="desc-h"><span>السطح</span><i></i><span>الأعمق</span></div>'}
};

var MB={
  door_open:function(s,i,a){
    return'<section class="b b-door dr-'+s.door+'"'+a+'><div class="door-frame" aria-hidden="true"><span class="dleaf"></span>'+ico('g-'+s.door,'dg')+'</div><span class="dn">'+DOOR_ORD[s.n]+'</span><h2 class="bt">'+esc(s.content)+'</h2><span class="dm">حين يأتي الضغط · '+DOORS[s.door].move+'</span></section>';
  },
  style_open:function(s,i,a){
    var dots='';for(var k=1;k<=3;k++)dots+='<i'+(k===s.n?' class="on"':'')+'></i>';
    return'<div class="b b-style dr-'+s.door+'"'+a+'><span class="sl">'+ico('g-'+s.door)+DOORS[s.door].name+' · '+STYLE_ORD[s.n]+'<span class="sdots">'+dots+'</span></span><h3 class="bt">'+esc(s.content)+'</h3></div>';
  },
  tool_open:function(s,i,a){return'<div class="b b-tool"'+a+'><span class="tn">'+ar(s.n)+'</span><h3 class="bt">'+splitHead(s.content)+'</h3></div>'},
  state_open:function(s,i,a){
    var sc='';for(var k=1;k<=5;k++)sc+='<i'+(k===s.n?' class="on"':k<s.n?' class="past"':'')+'>'+ar(k)+'</i>';
    return'<div class="b b-state st'+s.n+'"'+a+'><span class="scale">'+sc+'</span><h3 class="bt">'+splitHead(s.content)+'</h3></div>';
  },
  beat:function(s,i,a){
    if(s.beat==='bell')return'<div class="b b-beat beat-bell reveal"'+a+'><span class="waves" aria-hidden="true"><i></i><i></i><i></i>'+ico('i-bell','bell')+'</span><p class="bt">'+rich(s.content)+'</p></div>';
    return'<div class="b b-beat beat-time reveal"'+a+'><svg class="arc" viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="26"/><circle cx="30" cy="30" r="26" class="sweep"/></svg><p class="bt">'+rich(s.content)+'</p></div>';
  },
  cast:function(s,i,a){
    var h='<figure class="b b-cast reveal"'+a+'><figcaption>في الردهة</figcaption><div class="cast">';
    ['muw','shab','sayy','shay','milaf'].forEach(function(k,j){h+='<span class="cm" style="--d:'+(j*90)+'ms">'+ico(WHO[k].i)+'<b>'+WHO[k].n+'</b></span>'});
    return h+'</div></figure>';
  },
  doormap:function(s,i,a){
    var cols={idhn:[],mub:[],ikh:[]},doorI={};
    CUR_SECS.forEach(function(x,j){if(x.type==='style_open')cols[x.door].push({i:j,t:x.content});if(x.type==='door_open')doorI[x.door]=j});
    var h='<figure class="b b-dmap reveal"'+a+'><figcaption>ثلاثة أبواب · تسعة أساليب</figcaption><div class="dmap">';
    ['idhn','mub','ikh'].forEach(function(d){
      h+='<div class="dcol dr-'+d+'"><button class="dh" data-jump="'+doorI[d]+'">'+ico('g-'+d)+'<b>'+DOORS[d].name+'</b><small>'+DOORS[d].move+'</small></button>';
      cols[d].forEach(function(x,k){h+='<button class="ds" data-jump="'+x.i+'"><i>'+ar(k+1)+'</i>'+esc(x.t)+'</button>'});
      h+='</div>';
    });
    return h+'</div></figure>';
  },
  flames:function(s,i,a){
    var f=function(h,op){return'<path class="fl" d="M20 '+(44-h)+'c4 '+(h*0.35)+' 8 '+(h*0.55)+' 4 '+h+'h-8c-4-'+(h*0.45)+' 0-'+(h*0.65)+' 4-'+h+'z" style="opacity:'+op+'"/>'};
    var pot='<path class="pot" d="M6 16h28v10a10 10 0 0 1-10 10h-8A10 10 0 0 1 6 26z"/><path class="pot" d="M3 16h34"/>';
    var mk=function(lbl,h,op,cls){return'<div class="fcell '+cls+'"><svg viewBox="0 0 40 50">'+pot+'<g transform="translate(0,4)">'+f(h,op)+'</g></svg><b>'+lbl+'</b></div>'};
    return'<figure class="b b-flames reveal"'+a+' aria-hidden="true">'+mk('نارٌ معتدلة',9,.9,'mid')+mk('نارٌ عالية',15,1,'high')+mk('نارٌ خامدة',3,.35,'low')+'</figure>';
  },
  prompt:function(s,i,a){return'<blockquote class="b b-prompt"'+a+'><span class="bt">'+esc(s.content)+'</span></blockquote>'},
  instrument:function(s,i,a){
    if(!s.url)return'<div class="b b-inst-hidden"'+a+' hidden></div>';
    return'<aside class="b b-inst"'+a+'><span class="kl">'+esc(s.title||'المقياس')+'</span><p>'+esc(s.desc||'')+'</p><a class="cta" href="'+esc(s.url)+'" target="_blank" rel="noopener"><span class="ct">ابدأ</span></a></aside>';
  },
  card_margin:function(s,i,a){
    var h='<div class="b b-card card-m"'+a+' data-card="margin"><div class="card-h">'+ico('i-card')+'<span>بطاقتك · كلمة الهامش</span></div>';
    h+='<div class="cm-edit">'+(s.q?'<p class="cm-q">'+esc(s.q)+'</p>':'')+'<div class="cm-pick">';
    (s.picks||[]).forEach(function(p,k){h+='<button class="pick" data-pick="'+esc(p)+'">'+(s.icons&&s.icons[k]?ico(s.icons[k]):'')+esc(p)+'</button>'});
    h+='</div><div class="cm-row"><input class="cm-word" maxlength="40" placeholder="'+((s.picks||[]).length?'أو اكتب كلمتك كما تأتيك…':'اكتب كلمتك كما تأتيك…')+'" aria-label="كلمتك في الهامش"><button class="btn cm-save">اكتبها</button></div></div>';
    h+='<div class="cm-locked" hidden><span class="lk">'+ico('i-lock')+'كلمتك في الهامش</span><b class="cm-val"></b><small>ولا تغيّرها مهما قرأتَ بعد ذلك.</small><button class="cm-fix" hidden>تصحيح خطأ في الكتابة</button></div></div>';
    return h;
  },
  card_final:function(s,i,a){
    var c=flat[cur],k=s.key||'row1';
    var h='<div class="b b-card card-f"'+a+' data-card="'+k+'"><div class="card-h">'+ico('i-card')+'<span>بطاقتك · السطر '+(ORD_M[s.row]||ar(s.row))+' — '+esc(c?c.label+': '+c.title:'')+'</span></div>';
    h+='<div class="cf-margin" hidden><span>كلمة الهامش</span><b class="cf-mv"></b></div>';
    h+='<div class="cf-edit">';
    h+='<label class="cf-l">الخانة الأولى · بكلماتك أنت</label><div class="cf-line"><span class="cf-pre">'+esc(s.prefix||'')+'</span><textarea data-cf="line" rows="2" placeholder="أوّل صيغةٍ تأتيك، ثمّ اترك القلم"></textarea></div>';
    if(s.doors){
      h+='<label class="cf-l">بابك</label><div class="cf-doors">';
      s.doors.forEach(function(d){h+='<span class="cf-dw"><button class="cf-d dr-'+d+'" data-door="'+d+'">'+ico('g-'+d)+DOORS[d].name+'</button><button class="cf-star" data-star="'+d+'" title="الأقوى" aria-label="الأقوى">★</button></span>'});
      h+='<button class="cf-d cf-none" data-door="none">لم أجد نفسي فيها</button></div><p class="cf-hint" data-hint="star" hidden>وجدت نفسك في بابين؟ ضع النجمة على الأقوى منهما.</p>';
    }
    h+='<label class="cf-l">الخانة الثانية · حالك فيه</label><div class="cf-states">';
    STATES.forEach(function(x){h+='<button class="cf-s" data-state="'+x[0]+'">'+x[1]+'</button>'});
    h+='</div><label class="cf-l">الخانة الثالثة · أين يظهر عندك</label><textarea data-cf="where" rows="2" placeholder="في كلّ مكان؟ أم في أماكن ومع أشخاصٍ بعينهم؟"></textarea>';
    h+='<div class="cf-foot"><button class="btn cf-lock">ثبّت سطري</button><span class="cf-st" aria-live="polite"></span></div>';
    h+='<p class="cf-note">ما تكتبه يُحفظ وأنت تكتب. وحين تثبّته لا يعود قابلاً للتعديل، لأنّ السطر كما كتبتَه أوّل مرّةٍ هو ما ستحتاج إليه في آخر الطريق.</p></div>';
    h+='<div class="cf-locked" hidden></div></div>';
    return h;
  },
  fig:function(s,i,a){return'<figure class="b b-fig fig-'+s.fig+' reveal"'+a+' aria-hidden="true">'+(FIGS[s.fig]||function(){return''})()+'</figure>'},
  card_full:function(s,i,a){
    var h='<section class="b b-cardfull"'+a+'><div class="cfu-h">'+ico('i-card')+'<b>بطاقتك</b><span>سبعة سطور، سطرٌ في آخر كلّ مرآة</span></div>';
    h+='<div class="cfu" role="table"><div class="cfu-r cfu-head" role="row"><span class="cfu-c0" role="columnheader"></span>';
    s.cols.forEach(function(t,k){h+='<span class="cfu-c c'+(k+1)+'" role="columnheader">'+esc(t)+'</span>'});
    h+='</div>';
    var ms=mirrorChapters();
    s.rows.forEach(function(t,k){
      var m=ms[k+1];
      h+='<div class="cfu-r" role="row" data-row="'+(k+1)+'"><span class="cfu-c0" role="rowheader"><i>'+ar(k+1)+'</i><small>'+(m?esc(m.title):'')+'</small></span>';
      h+='<span class="cfu-c c1" role="cell"><em class="cfu-pre">'+esc(t)+'</em><span class="cfu-v" data-v="line"></span></span>';
      h+='<span class="cfu-c c2" role="cell" data-lbl="'+esc(s.cols[1])+'"><span class="cfu-v" data-v="state"></span></span>';
      h+='<span class="cfu-c c3" role="cell" data-lbl="'+esc(s.cols[2])+'"><span class="cfu-v" data-v="where"></span></span>';
      h+='<span class="cfu-c c4" role="cell" data-lbl="'+esc(s.cols[3])+'"><span class="cfu-v" data-v="margin"></span></span></div>';
    });
    h+='</div><div class="cfu-tools"><button class="ghost" data-print="blank">'+ico('i-print')+'اطبعها فارغةً لتكتب بيدك</button><button class="ghost" data-print="mine">'+ico('i-print')+'اطبع بطاقتي كما كتبتُها</button></div></section>';
    return h;
  }
};

var STATES=[['hand','في يدي'],['over','يعمل فوق طاقته'],['dim','قد خمد'],['q','؟']];
function stateName(k){var x=STATES.find(function(s){return s[0]===k});return x?x[1]:''}
function mirrorChapters(){var o={};allCh.forEach(function(c){if(c.station&&c.station.id==='st-maraya'&&c.number>=1)o[c.number]=c});return o}

/* ─── رسوم المقدّمة ─── */
var FIGS={
  map:function(){
    return'<svg viewBox="0 0 320 170" class="fsvg"><rect x="8" y="8" width="304" height="154" rx="16" class="fr2"/>'+
      '<path d="M40 130c30-40 60-10 90-45s60-35 90-10 50 5 70-25" class="route"/>'+
      '<path d="M60 55l14-22 14 22zM82 55l12-18 12 18z" class="mnt"/><path d="M230 120l12-18 12 18z" class="mnt"/>'+
      '<circle cx="250" cy="55" r="7" class="well"/><circle cx="110" cy="128" r="6" class="well"/>'+
      '<g class="pin"><path d="M168 66c0-10 8-17 17-17s17 7 17 17c0 13-17 27-17 27s-17-14-17-27z"/><circle cx="185" cy="66" r="5.5" class="pinh"/></g>'+
      '<text x="185" y="112" class="ftx">أين أنت منها؟</text></svg>';
  },
  wind:function(){
    return'<svg viewBox="0 0 320 150" class="fsvg"><g class="gusts"><path d="M20 40h70c10 0 10-12 0-12"/><path d="M10 70h95"/><path d="M26 100h60c10 0 10 12 0 12"/></g>'+
      '<text x="62" y="138" class="ftx faint">الريح</text>'+
      '<g class="tree"><path d="M215 140v-40" class="trunk"/><g class="crown"><circle cx="215" cy="62" r="30"/><circle cx="192" cy="78" r="20"/><circle cx="238" cy="78" r="20"/></g></g>'+
      '<text x="215" y="148" class="ftx">الشجر يتحرّك</text></svg>';
  },
  mirrors3:function(){
    var fig=function(sx,sy){return'<g transform="translate(40 58) scale('+sx+' '+sy+') translate(-40 -58)"><circle cx="40" cy="42" r="9"/><path d="M24 80c2-14 8-22 16-22s14 8 16 22"/></g>'};
    var m=function(x,cls,lbl,sub,sx,sy){return'<g transform="translate('+x+' 0)" class="'+cls+'"><rect x="6" y="10" width="68" height="84" rx="34" class="mf"/>'+fig(sx,sy)+'<text x="40" y="116" class="ftx">'+lbl+'</text><text x="40" y="134" class="ftx faint">'+sub+'</text></g>'};
    return'<svg viewBox="0 0 300 145" class="fsvg">'+m(12,'m-cc','مقعّرة','تكبّر',1.25,1.25)+m(112,'m-cv','محدّبة','تصغّر',.7,.7)+m(212,'m-fl on','مستوية','بحجمه',1,1)+'</svg>';
  },
  stages:function(){
    var st=[['المشارطة','أوّل يومه','i-sunrise'],['المراقبة','وهي تعمل','i-eye'],['المحاسبة','آخر يومه','i-moon']];
    return'<div class="stg">'+st.map(function(x,k){return'<div class="stg-i"><span class="stg-n">'+ar(k+1)+'</span>'+ico(x[2])+'<b>'+x[0]+'</b><small>'+x[1]+'</small></div>'}).join('<span class="stg-a" aria-hidden="true"></span>')+'</div>';
  },
  heptad:function(){
    var h='<svg viewBox="0 0 260 230" class="fsvg"><circle cx="130" cy="112" r="16" class="core"/><circle cx="130" cy="112" r="34" class="halo"/>';
    for(var k=0;k<7;k++){var ang=-Math.PI/2+k*2*Math.PI/7,x=130+86*Math.cos(ang),y=112+86*Math.sin(ang);
      h+='<line x1="130" y1="112" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" class="ray"/><g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+')"><rect x="-13" y="-17" width="26" height="34" rx="13" class="mo"/><text y="5" class="mn">'+ar(k+1)+'</text></g>'}
    return h+'<text x="130" y="224" class="ftx">شيءٌ واحد من سبعة مواضع</text></svg>';
  }
};

/* ─── بيانات البطاقة والأسئلة المحمولة ─── */
var card={},carry={};
function rowKey(f){return f?f.dataset.card:'row1'}
function fillCards(){
  var m=$('.card-m');
  if(m){
    var locked=!!card.margin;
    $('.cm-edit',m).hidden=locked;$('.cm-locked',m).hidden=!locked;
    if(locked){$('.cm-val',m).textContent='«'+card.margin+'»';$('.cm-fix',m).hidden=!(card.marginAt&&Date.now()-card.marginAt<120000)}
  }
  var f=$('.card-f');
  if(f){
    var r=card[rowKey(f)]||{};
    $$('textarea[data-cf]',f).forEach(function(t){if(document.activeElement!==t)t.value=r[t.dataset.cf]||''});
    var doors=r.doors||{};
    $$('.cf-d',f).forEach(function(b){b.classList.toggle('on',b.dataset.door==='none'?!!r.none:!!doors[b.dataset.door])});
    var nOn=Object.keys(doors).filter(function(k){return doors[k]}).length;
    $$('.cf-star',f).forEach(function(b){b.hidden=!(nOn>1&&doors[b.dataset.star]);b.classList.toggle('on',r.strong===b.dataset.star)});
    var hint=$('[data-hint=star]',f);if(hint)hint.hidden=!(nOn>1&&!r.strong);
    $$('.cf-s',f).forEach(function(b){b.classList.toggle('on',r.state===b.dataset.state)});
    var mv=$('.cf-margin',f);mv.hidden=!card.margin;if(card.margin)$('.cf-mv',f).textContent='«'+card.margin+'»';
    $('.cf-lock',f).disabled=!(r.line&&r.line.trim());
    var lk=$('.cf-locked',f);
    $('.cf-edit',f).hidden=!!r.locked;lk.hidden=!r.locked;
    if(r.locked){
      var ds=Object.keys(doors).filter(function(k){return doors[k]}).map(function(k){return'<span class="dchip dr-'+k+'">'+ico('g-'+k)+DOORS[k].name+(r.strong===k?' ★':'')+'</span>'}).join(' ');
      lk.innerHTML='<span class="lk">'+ico('i-lock')+'سطرك كما كتبتَه</span><p class="cfl-line"><em>'+esc($('.cf-pre',f).textContent)+'</em> '+esc(r.line||'')+'</p>'+
        (ds||r.none?'<p class="cfl-m">'+(r.none?'لم أجد نفسي فيها':ds)+'</p>':'')+
        '<dl class="cfl-dl">'+(r.state?'<dt>حالك فيه</dt><dd>'+stateName(r.state)+'</dd>':'')+(r.where?'<dt>أين يظهر عندك</dt><dd>'+esc(r.where)+'</dd>':'')+'</dl>'+
        ((r.lockedAt&&Date.now()-r.lockedAt<120000)?'<button class="cm-fix cf-unlock">تصحيح خطأ في الكتابة</button>':'')+
        (allCh.some(function(c){return c.station&&c.station.id==='st-maraya'&&c.number===0&&c.pub})?'<button class="ghost cf-seeall" data-seecard="1">'+ico('i-card')+'بطاقتك كاملة</button>':'');
    }
  }
  $$('[data-carry]').forEach(function(b){var on=!!carry[b.dataset.carry];b.classList.toggle('on',on);b.innerHTML=(on?ico('i-check'):ico('i-plus'))+'<span>'+(on?'معك في دفترك':'احمله معي')+'</span>'});
  if($('.b-cardfull'))fillCardFull();
}
function saveCard(msg){
  var c=flat[cur];if(!c)return;nbCache[c.id]=Object.assign(nbCache[c.id]||{},{card:card});
  var st=$('.card-f .cf-st');
  if(!uid){if(st)st.textContent='محفوظ على هذا الجهاز';return}
  if(st)st.textContent='يُحفظ…';
  db.collection(C_NOTES).doc(docId(c.id)).set({card:card,updatedAt:FV.serverTimestamp()},{merge:true}).then(function(){if(st)st.textContent='محفوظ';if(msg)toast(msg)}).catch(function(){if(st)st.textContent='تعذّر الحفظ — تحقّق من الاتصال'});
}
var saveCardSoon=debounce(function(){saveCard()},800);
function saveCarry(){
  var c=flat[cur];if(!c)return;nbCache[c.id]=Object.assign(nbCache[c.id]||{},{carry:carry});
  if(uid)db.collection(C_NOTES).doc(docId(c.id)).set({carry:carry,updatedAt:FV.serverTimestamp()},{merge:true}).catch(function(){});
}

/* ─── البطاقة كاملة: تجمع السطور السبعة من المرايا ─── */
function cardData(){
  var ms=mirrorChapters(),ids=Object.keys(ms);
  return Promise.all(ids.map(function(n){
    var c=ms[n];
    if(flat[cur]&&flat[cur].id===c.id)return Promise.resolve([n,card]);
    if(nbCache[c.id]&&nbCache[c.id].card)return Promise.resolve([n,nbCache[c.id].card]);
    if(!uid)return Promise.resolve([n,{}]);
    return db.collection(C_NOTES).doc(docId(c.id)).get().then(function(d){var cd=d.exists?(d.data().card||{}):{};nbCache[c.id]=Object.assign(nbCache[c.id]||{},{card:cd});return[n,cd]}).catch(function(){return[n,{}]});
  })).then(function(arr){var o={};arr.forEach(function(x){o[x[0]]=x[1]});return o});
}
function fillCardFull(){
  var box=$('.b-cardfull');if(!box)return;
  cardData().then(function(o){
    $$('.cfu-r[data-row]',box).forEach(function(rw){
      var n=rw.dataset.row,cd=o[n]||{},r=cd['row'+n]||{};
      var set=function(k,v){var el=$('[data-v='+k+']',rw);if(el)el.textContent=v||''};
      set('line',r.line);set('state',stateName(r.state));set('where',r.where);set('margin',cd.margin?'«'+cd.margin+'»':'');
      rw.classList.toggle('filled',!!(r.line||cd.margin));
    });
  });
}
function printCard(mode){
  var box=$('.b-cardfull');
  var go=function(o){
    var cols=[],rows=[];
    if(box){$$('.cfu-head .cfu-c',box).forEach(function(e){cols.push(e.textContent)});$$('.cfu-r[data-row]',box).forEach(function(e){rows.push({n:e.dataset.row,pre:$('.cfu-pre',e).textContent,t:$('.cfu-c0 small',e).textContent})})}
    var base=location.href.replace(/[^\/]*$/,'');
    var f='@font-face{font-family:Z;src:url('+base+'../external-exercise/Adam-journey/fonts/Zain-Regular.ttf)}@font-face{font-family:Z;font-weight:700;src:url('+base+'../external-exercise/Adam-journey/fonts/Zain-Bold.ttf)}@font-face{font-family:Z;font-weight:900;src:url('+base+'../external-exercise/Adam-journey/fonts/Zain-Black.ttf)}';
    var css=f+'@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Z,serif;direction:rtl;color:#2A221C;margin:0}h1{font-size:26px;font-weight:900;color:#163A2C;margin:0 0 2px}p.s{margin:0 0 10px;color:#9C8C7B;font-size:13px}table{width:100%;border-collapse:collapse;table-layout:fixed}th{font-size:13px;color:#A87A2E;font-weight:800;padding:6px;border-bottom:2px solid #163A2C;text-align:right}td{border-bottom:1px solid #d9cdb8;vertical-align:top;padding:8px 6px;height:21mm;font-size:13px;line-height:1.6}td.n{width:12mm;text-align:center;font-weight:900;color:#A87A2E;font-size:18px}td.n small{display:block;font-size:10px;color:#9C8C7B;font-weight:700}td.l em{display:block;font-style:normal;font-weight:700;color:#163A2C}.w1{width:40%}.w2{width:14%}.w3{width:20%}.w4{width:14%}';
    var h='<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقتي — ولادة قلب</title><style>'+css+'</style></head><body><h1>بطاقتي</h1><p class="s">'+esc(book.title)+' · المرايا السبع</p><table><thead><tr><th style="width:12mm"></th>'+cols.map(function(c,k){return'<th class="w'+(k+1)+'">'+esc(c)+'</th>'}).join('')+'</tr></thead><tbody>';
    rows.forEach(function(r){
      var cd=(o&&o[r.n])||{},rr=cd['row'+r.n]||{};
      h+='<tr><td class="n">'+ar(r.n)+'<small>'+esc(r.t)+'</small></td><td class="l"><em>'+esc(r.pre)+'</em>'+(mode==='mine'?esc(rr.line||''):'')+'</td><td>'+(mode==='mine'?stateName(rr.state):'')+'</td><td>'+(mode==='mine'?esc(rr.where||''):'')+'</td><td>'+(mode==='mine'&&cd.margin?'«'+esc(cd.margin)+'»':'')+'</td></tr>';
    });
    h+='</tbody></table></body></html>';
    var fr=document.createElement('iframe');fr.style.cssText='position:fixed;width:0;height:0;border:0;left:-9999px';document.body.appendChild(fr);
    fr.onload=function(){setTimeout(function(){try{fr.contentWindow.focus();fr.contentWindow.print()}catch(e){toast('تعذّرت الطباعة')}setTimeout(function(){fr.remove()},4000)},500)};
    fr.srcdoc=h;
  };
  if(mode==='mine')cardData().then(go);else go(null);
}

document.addEventListener('click',function(e){
  var b=tc(e,'.b-card button,.b-cardfull button,[data-carry]');if(!b||cur<0)return;
  if(b.dataset.print){printCard(b.dataset.print);return}
  if(b.dataset.seecard){var m0=allCh.find(function(c){return c.station&&c.station.id==='st-maraya'&&c.number===0&&c.pub});if(m0){load(m0).then(function(d){var j=d.sections.findIndex(function(x){return x.type==='card_full'});openChapter(m0.fi,{block:j>=0?j:null})})}else toast('بطاقتك كاملة في مدخل المرايا');return}
  if(b.dataset.carry){var k=b.dataset.carry;if(carry[k])delete carry[k];else{carry[k]={at:new Date().toISOString()};toast('صار معك في دفترك')}saveCarry();fillCards();return}
  var m=b.closest('.card-m');
  if(m){
    if(b.dataset.pick){$('.cm-word',m).value=b.dataset.pick;$$('.pick',m).forEach(function(x){x.classList.toggle('on',x===b)});return}
    if(b.classList.contains('cm-save')){var v=$('.cm-word',m).value.trim();if(!v){$('.cm-word',m).focus();return}card.margin=v;card.marginAt=Date.now();fillCards();saveCard('كُتبت في هامش بطاقتك');return}
    if(b.classList.contains('cm-fix')){$('.cm-edit',m).hidden=false;$('.cm-locked',m).hidden=true;$('.cm-word',m).value=card.margin;delete card.margin;return}
  }
  var f=b.closest('.card-f');
  if(f){
    var r=card[rowKey(f)]=card[rowKey(f)]||{};r.doors=r.doors||{};
    if(b.classList.contains('cf-lock')){if(!(r.line&&r.line.trim()))return;r.locked=true;r.lockedAt=Date.now();fillCards();saveCard('ثُبّت سطرك في البطاقة');return}
    if(b.classList.contains('cf-unlock')){r.locked=false;fillCards();return}
    if(b.dataset.door){var d=b.dataset.door;if(d==='none'){r.none=!r.none;if(r.none){r.doors={};delete r.strong}}else{r.doors[d]=!r.doors[d];if(!r.doors[d])delete r.doors[d];r.none=false;if(r.strong&&!r.doors[r.strong])delete r.strong}}
    else if(b.dataset.star){r.strong=r.strong===b.dataset.star?null:b.dataset.star}
    else if(b.dataset.state){r.state=r.state===b.dataset.state?null:b.dataset.state}
    else return;
    fillCards();saveCardSoon();
  }
});
document.addEventListener('input',function(e){
  var t=e.target;if(!t.matches)return;
  if(t.matches('textarea[data-cf]')){var f=t.closest('.card-f'),r=card[rowKey(f)]=card[rowKey(f)]||{};r[t.dataset.cf]=t.value;var st=$('.card-f .cf-st');if(st)st.textContent='يُحفظ…';$('.cf-lock',f).disabled=!(r.line&&r.line.trim());saveCardSoon()}
});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('cm-word')){e.preventDefault();var m=e.target.closest('.card-m');$('.cm-save',m).click()}});

/* ─── شريط خريطة المرآة (تحت الشريط العلويّ) ─── */
function buildRail(d){
  var r=$('#rail');
  if(!d._rail||!d._rail.length){r.hidden=true;r.innerHTML='';document.body.classList.remove('has-rail');return}
  r.hidden=false;document.body.classList.add('has-rail');
  r.innerHTML=d._rail.map(function(x,k){return'<button class="rs'+(x.door?' dr-'+x.door:'')+'" data-jump="'+x.i+'" title="'+esc(x.rail)+'"><span class="rl">'+esc(x.rail)+'</span><span class="rb"><i></i></span></button>'}).join('');
}
function updateRail(){
  var d=content[flat[cur]&&flat[cur].id];if(!d||!d._rail||!d._rail.length)return;
  var y=window.scrollY+window.innerHeight*0.35;
  var ys=d._rail.map(function(x){var el=document.getElementById('b'+x.i);return el?el.getBoundingClientRect().top+window.scrollY:0});
  ys.push(layout.end||layout.bottom);
  var segs=$$('#rail .rs'),active=-1;
  segs.forEach(function(sg,k){
    var a=ys[k],b=ys[k+1],f=Math.max(0,Math.min(1,(y-a)/Math.max(1,b-a)));
    $('.rb i',sg).style.width=(f*100)+'%';
    if(y>=a&&y<b)active=k;
    sg.classList.toggle('on',y>=a&&y<b);sg.classList.toggle('past',y>=b);
  });
  var tc2=$('#tCrumb'),c=flat[cur];
  if(tc2&&c)tc2.textContent=c.label+(active>=0?' · '+d._rail[active].rail:' · '+c.station.title);
}

/* ─── ظهور هادئ للمشاهد والأشكال ─── */
var revealIO=window.IntersectionObserver?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');revealIO.unobserve(e.target)}})},{rootMargin:'0px 0px -12% 0px'}):null;
function observeReveal(){$$('.reveal').forEach(function(el){if(revealIO)revealIO.observe(el);else el.classList.add('in')})}


function endCard(c){
  var n=flat[c.fi+1];
  var h='<section class="end" id="endCard"><div class="rings"><i></i><i></i><i></i><i></i></div><h3>أتممت '+esc(c.label)+'</h3><p>خذ ما وصلك منه، ولا تستعجل ما لم يصل بعد.</p>';
  if(n&&n.station!==c.station)h+='<p class="st-close">هنا تنتهي محطّة «'+esc(c.station.title)+'»، وتبدأ محطّة «'+esc(n.station.title)+'».</p>';
  if(n)h+='<button class="next-card" data-open="'+n.fi+'" data-fresh="1"><span class="t"><small>التالي · '+esc(n.label)+'</small><b>'+esc(n.title)+'</b></span><svg class="i"><use href="#i-next"/></svg></button>';
  else{var nx=allCh[allCh.indexOf(c)+1];h+='<p style="margin-top:18px">'+(nx?(function(){var f=nx.part.unitGender==='f';return esc((nx.part.unit||'الفصل')+(f?' التالية':' التالي'))+' «'+esc(nx.title)+'» قيد الكتابة، '+(f?'وستظهر':'وسيظهر')+' هنا حين '+(f?'تكتمل':'يكتمل')+'.'})():'وصلت إلى آخر ما نُشر.')+'</p>'}
  h+='<div><button class="ghost" data-act="home"><svg class="i"><use href="#i-book"/></svg>فهرس الرحلة</button> <button class="ghost" data-act="notebook"><svg class="i"><use href="#i-note"/></svg>دفتري</button></div></section>';
  return h;
}
function updateBars(){
  var c=flat[cur];if(!c)return;
  $('#tTitle').textContent=c.title;
  $('#tCrumb').textContent=c.label+' · '+c.station.title;
  var p=flat[cur-1],n=flat[cur+1];
  $('#bPrev').disabled=!p;$('#bNext').disabled=!n;
  $('#bPrevT').textContent=p?p.title:'';$('#bNextT').textContent=n?n.title:'';
  $('#thBtn').innerHTML='<svg class="i"><use href="#i-'+(prefs.theme==='dark'?'sun':'moon')+'"/></svg>';
}
function jumpBlock(i,flash){
  var el=document.getElementById('b'+i);if(!el){window.scrollTo(0,0);return}
  var off=(document.body.classList.contains('has-rail')?140:110)+(el.classList.contains('b-door')?70:0);
  var y=el.getBoundingClientRect().top+window.scrollY-off;
  window.scrollTo(0,Math.max(0,y));
  if(flash){el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash')}
}

/* ══════════════════════════════════════════════
   ٨. التمرير: التقدّم، الموضع، إخفاء الأشرطة
   ══════════════════════════════════════════════ */
var layout={top:0,bottom:0,heads:[]};
function cacheLayout(){
  var art=$('#art');if(!art)return;
  var r=art.getBoundingClientRect();layout.top=r.top+window.scrollY;layout.bottom=r.bottom+window.scrollY;
  var ec=$('#endCard');layout.end=ec?ec.getBoundingClientRect().top+window.scrollY:layout.bottom;
  layout.heads=$$('.b-h,.b-part,.b-door,.b-style,.b-tool,.b-state',art).map(function(e){return{i:+e.dataset.b,y:e.getBoundingClientRect().top+window.scrollY}});
}
window.addEventListener('resize',debounce(cacheLayout,200));
if(window.ResizeObserver)new ResizeObserver(debounce(function(){if(cur>=0)cacheLayout()},150)).observe($('#page'));
if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',function(){if(cur>=0)cacheLayout()});
var lastY=0,ticking=false;
window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(onScroll)}},{passive:true});
function onScroll(){
  ticking=false;if(cur<0)return;
  var y=window.scrollY,vh=window.innerHeight;
  var span=Math.max(1,layout.bottom-layout.top-vh*0.6);
  var pct=Math.min(100,Math.max(0,Math.round((y-layout.top+vh*0.4)/span*100)));
  if(y+vh>layout.end+60)pct=100;
  $('#pfill').style.width=pct+'%';
  var d=content[flat[cur].id];
  if(d){var left=d._min*(1-pct/100);$('#leftInfo').innerHTML=pct>=99?'أتممت الفصل':ar(pct)+'٪<br>'+(left<1?'أقلّ من دقيقة':'بقي '+minutes(left))}
  if(!asOn&&!TOUR.on&&Math.abs(y-lastY)>6){
    var hide=y>lastY&&y>200;
    document.body.classList.toggle('bars-hidden',hide);
  }
  if(y+vh>=document.documentElement.scrollHeight-40)document.body.classList.remove('bars-hidden');
  lastY=y;
  trackPos(pct);
  updateRail();
  if($('#dToc').classList.contains('on'))markTocActive();
}
function curBlock(){
  var x=window.innerWidth/2,yy=Math.min(160,window.innerHeight*0.3);
  for(var k=0;k<6;k++){var el=document.elementFromPoint(x,yy+k*30);var b=el&&el.closest&&el.closest('[data-b]');if(b)return+b.dataset.b}
  return null;
}
var trackPos=function(pct){
  var c=flat[cur];if(!c)return;
  var p=prog.chapters[c.id]||(prog.chapters[c.id]={pct:0});
  var b=curBlock();if(b!=null){p.b=b;var d=content[c.id];if(d){p.n=d.sections.length;p.h=secName(d,b)}}
  updateBmBtn(b);
  if(pct>p.pct)p.pct=pct;
  p.t=Date.now();
  if(pct>=100&&!p.done){p.done=true;p.pct=100;saveProg(true);toast('أتممت '+c.label+' ✓');return}
  savePosSoon();
};
var savePosSoon=debounce(function(){saveProg(false)},4000);
function flushPos(){saveProg(true)}
function saveProg(remote){
  var c=flat[cur];if(!c)return;
  prog.chapterId=c.id;
  ls(BOOK_KEY+'-prog',prog);
  if(!uid)return;
  /* الموضع يُحفظ على الجهاز دائمًا، ويُرسل للسحابة عند الخروج أو تغيير الفصل أو كلّ ٥ دقائق فقط — توفيرًا للكتابات */
  if(!remote&&Date.now()-(saveProg._last||0)<300000)return;
  saveProg._last=Date.now();
  var chs={};chs[c.id]=prog.chapters[c.id]||{pct:0};
  db.collection(C_PROG).doc(uid+'_'+BOOK_KEY).set({book:BOOK_KEY,chapterId:c.id,chapterTitle:c.title,stationId:c.station.id,chapters:chs,updatedAt:FV.serverTimestamp()},{merge:true}).catch(function(){});
}
function saveBms(){
  prog.bmT=Date.now();ls(BOOK_KEY+'-prog',prog);
  if(uid)db.collection(C_PROG).doc(uid+'_'+BOOK_KEY).set({bookmarks:prog.bookmarks||[],bmT:prog.bmT},{merge:true}).catch(function(){});
}
function secName(d,b){var h='';for(var k=0;k<d._secs.length;k++){if(d._secs[k].i<=b)h=plain(d._secs[k].t);else break}return h.length>48?h.slice(0,46)+'…':h}
/* بعد القفز: نعيد الضبط حين تكتمل الخطوط والتخطيط، ما لم يتحرّك القارئ بنفسه */
var jumpGuard=0;
function settleJump(target,ci){
  var my=++jumpGuard,moved=false;
  var stop=function(){moved=true};
  ['wheel','touchmove','keydown','mousedown'].forEach(function(ev){window.addEventListener(ev,stop,{once:true,passive:true})});
  var again=function(){if(!moved&&my===jumpGuard&&cur===ci)jumpBlock(target,false)};
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){setTimeout(again,60)});
  setTimeout(again,500);setTimeout(again,1400);
}
function showResume(p){
  var el=$('#resumePill');if(!el)return;
  $('#rpText').textContent='رجعتُ بك إلى حيث توقّفت'+(p&&p.h?' · «'+p.h+'»':'');
  el.classList.add('on');clearTimeout(showResume._t);showResume._t=setTimeout(function(){el.classList.remove('on')},7000);
}
/* ─── العلامات اليدويّة ─── */
function bmsHere(){var c=flat[cur];return(prog.bookmarks||[]).filter(function(x){return c&&x.ch===c.id})}
function paintBms(){
  $$('#art .bm-rib').forEach(function(e){e.parentNode.classList.remove('has-bm');e.remove()});
  bmsHere().forEach(function(x){var el=document.getElementById('b'+x.b);if(el&&!$('.bm-rib',el)){el.classList.add('has-bm');el.insertAdjacentHTML('afterbegin','<i class="bm-rib" aria-hidden="true"></i>')}});
}
function updateBmBtn(b){
  var btn=$('#bmBtn');if(!btn)return;
  if(b==null)b=curBlock();
  var on=bmsHere().some(function(x){return Math.abs(x.b-b)<=1});
  btn.classList.toggle('on',on);btn.innerHTML='<svg class="i"><use href="#i-bm'+(on?'f':'')+'"/></svg>';
}
function toggleBm(){
  var c=flat[cur],d=c&&content[c.id];if(!d)return;
  var b=curBlock();if(b==null)return;
  var L=prog.bookmarks=prog.bookmarks||[];
  var ex=L.filter(function(x){return x.ch===c.id&&Math.abs(x.b-b)<=1});
  if(ex.length){prog.bookmarks=L.filter(function(x){return ex.indexOf(x)<0});toast('أُزيلت العلامة')}
  else{
    var s=d.sections[b]||{},t=plain(s.content||'').replace(/\s+/g,' ');
    L.push({id:Date.now(),ch:c.id,b:b,t:t.length>90?t.slice(0,88)+'…':t,h:secName(d,b),at:new Date().toISOString()});
    toast('وُضعت علامة هنا — تجدها في «دفتري»');
  }
  saveBms();paintBms();updateBmBtn(b);
}
document.addEventListener('visibilitychange',function(){if(document.hidden&&cur>=0)flushPos()});
window.addEventListener('pagehide',function(){if(cur>=0)flushPos()});

/* نقرة على النصّ (بلا تحديد) تُظهر/تخفي الأشرطة — للجوّال */
$('#page').addEventListener('click',function(e){
  if(tc(e,'button,a,textarea,mark,input'))return;
  var s=window.getSelection();if(s&&String(s).trim())return;
  if(window.innerWidth<900)document.body.classList.toggle('bars-hidden');
});

/* ══════════════════════════════════════════════
   ٩. بيانات الفصل: تظليل + ملاحظات + تأمّلات
   ══════════════════════════════════════════════ */
function docId(cid){return uid+'_'+BOOK_KEY+'_'+cid}
function loadChapterData(c){
  hls=[];notes=[];refl={};card={};carry={};
  if(!uid){fillCards();return}
  Promise.all([
    db.collection(C_HL).doc(docId(c.id)).get().catch(function(){return null}),
    db.collection(C_NOTES).doc(docId(c.id)).get().catch(function(){return null})
  ]).then(function(r){
    if(flat[cur]!==c)return;
    hls=r[0]&&r[0].exists?(r[0].data().items||[]):[];
    var nd=r[1]&&r[1].exists?r[1].data():{};
    notes=nd.items||[];refl=nd.reflections||{};card=nd.card||{};carry=nd.carry||{};
    nbCache[c.id]={hls:hls,notes:notes,refl:refl,card:card,carry:carry};
    paintHL();fillRefl();fillCards();updateBadge();
  });
}
function saveHL(){var c=flat[cur];nbCache[c.id]={hls:hls,notes:notes,refl:refl,card:card,carry:carry};updateBadge();if(!uid)return;db.collection(C_HL).doc(docId(c.id)).set({items:hls,updatedAt:FV.serverTimestamp()}).catch(function(){toast('تعذّر الحفظ — تحقّق من الاتصال')})}
function saveNotes(){var c=flat[cur];nbCache[c.id]={hls:hls,notes:notes,refl:refl,card:card,carry:carry};updateBadge();if(!uid)return;return db.collection(C_NOTES).doc(docId(c.id)).set({items:notes,reflections:refl,updatedAt:FV.serverTimestamp()},{merge:true})}
function updateBadge(){var n=hls.length+notes.filter(function(x){return!x.hl}).length;var b=$('#nbBadge');b.hidden=!n;b.textContent=ar(n)}

function fillRefl(){
  $$('textarea[data-refl]').forEach(function(t){var r=refl[t.dataset.refl];if(r&&r.text){t.value=r.text;$('[data-rst="'+t.dataset.refl+'"]').textContent='محفوظ'}});
}
var reflSave=debounce(function(i,v,c){
  if(flat[cur]!==c)return;
  refl[i]={text:v,at:new Date().toISOString()};
  if(!v.trim())delete refl[i];
  var st=$('[data-rst="'+i+'"]');
  var pr=saveNotes();
  if(pr&&pr.then)pr.then(function(){st&&(st.textContent='محفوظ')}).catch(function(){st&&(st.textContent='تعذّر الحفظ — سيُعاد عند الاتصال')});
  else st&&(st.textContent='محفوظ على هذا الجهاز');
},900);
document.addEventListener('input',function(e){
  var t=e.target;if(!t.matches||!t.matches('textarea[data-refl]'))return;
  var st=$('[data-rst="'+t.dataset.refl+'"]');if(st)st.textContent='يُحفظ…';
  reflSave(t.dataset.refl,t.value,flat[cur]);
});

/* ─── التظليل: يُخزَّن بموضعه (الفقرة + البداية + النهاية) ─── */
function btOf(i){var b=document.getElementById('b'+i);return b&&$('.bt',b)}
function textNodes(el){var out=[],w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);var n;while((n=w.nextNode()))out.push(n);return out}
function offsetIn(bt,node,off){var r=document.createRange();r.selectNodeContents(bt);r.setEnd(node,off);return r.toString().length}
function unpaint(){$$('mark.hl').forEach(function(m){var p=m.parentNode;while(m.firstChild)p.insertBefore(m.firstChild,m);p.removeChild(m);p.normalize()})}
function paintHL(){
  unpaint();
  var noteByHl={};notes.forEach(function(n){if(n.hl)noteByHl[n.hl]=1});
  hls.forEach(function(h){
    var bt=null,s=h.s,e=h.e;
    if(h.b!=null){bt=btOf(h.b);if(bt&&bt.textContent.slice(s,e)!==h.text){var k=bt.textContent.indexOf(h.text);s=k;e=k+h.text.length;if(k<0)bt=null}}
    if(!bt){ /* تظليلات قديمة بلا موضع: أوّل ظهور للنصّ */
      var all=$$('#art .bt');for(var j=0;j<all.length;j++){var k2=all[j].textContent.indexOf(h.text);if(k2>=0){bt=all[j];s=k2;e=k2+h.text.length;break}}
    }
    if(bt)wrap(bt,s,e,h,noteByHl[h.id]);
  });
}
function wrap(bt,s,e,h,hasNote){
  var pos=0;textNodes(bt).forEach(function(n){
    var len=n.length,a=Math.max(s,pos),b=Math.min(e,pos+len);
    if(a<b){
      var mid=n;if(a>pos)mid=n.splitText(a-pos);
      if(b<pos+len)mid.splitText(b-a);
      var m=document.createElement('mark');m.className='hl hl-'+h.color+(hasNote?' has-note':'');m.dataset.hl=h.id;
      mid.parentNode.insertBefore(m,mid);m.appendChild(mid);
    }
    pos+=len;
  });
}

/* ─── شريط التحديد ─── */
var sel=null; /* {b,s,e,text,hlId} */
function readSel(){
  var s=window.getSelection();if(!s||s.rangeCount===0||s.isCollapsed)return null;
  var r=s.getRangeAt(0);
  var sb=(r.startContainer.nodeType===3?r.startContainer.parentElement:r.startContainer).closest('.bt');
  if(!sb||!$('#art').contains(sb))return null;
  var eb=(r.endContainer.nodeType===3?r.endContainer.parentElement:r.endContainer).closest('.bt');
  var bi=+sb.closest('[data-b]').dataset.b;
  var st=offsetIn(sb,r.startContainer,r.startOffset);
  var en=eb===sb?offsetIn(sb,r.endContainer,r.endOffset):sb.textContent.length; /* لو امتدّ التحديد لفقرة أخرى نقف عند آخر الأولى */
  var raw=sb.textContent.slice(st,en);
  var lt=raw.length-raw.replace(/^\s+/,'').length,rt=raw.length-raw.replace(/\s+$/,'').length;
  st+=lt;en-=rt;var text=sb.textContent.slice(st,en);
  if(text.length<2)return null;
  return{b:bi,s:st,e:en,text:text,rect:r.getBoundingClientRect(),multi:eb!==sb};
}
function showSel(rect,existing){
  var bar=$('#selbar');bar.classList.add('on');
  $('#selDel').style.display=existing?'':'none';
  $$('.sw',bar).forEach(function(b){b.classList.toggle('on',!!existing&&existing.color===b.dataset.hl)});
  var bw=bar.offsetWidth,bh=bar.offsetHeight;
  var x=rect.left+rect.width/2-bw/2+window.scrollX;x=Math.max(8,Math.min(x,window.innerWidth-bw-8));
  var touch=('ontouchstart' in window);
  var y=rect.top+window.scrollY-bh-12;if(touch||rect.top<bh+80)y=rect.bottom+window.scrollY+(touch?44:12);
  bar.style.left=x+'px';bar.style.top=y+'px';
}
function hideSel(){$('#selbar').classList.remove('on');sel=null}
function onSelEnd(){
  setTimeout(function(){
    if(cur<0)return;
    var s=readSel();
    if(!s){if(!(sel&&sel.hlId))hideSel();return}
    sel=s;showSel(s.rect,null);
  },20);
}
document.addEventListener('mouseup',function(e){if(tc(e,'#selbar,.drawer,.modal'))return;onSelEnd()});
document.addEventListener('touchend',function(e){if(tc(e,'#selbar,.drawer,.modal'))return;setTimeout(onSelEnd,250)});
document.addEventListener('selectionchange',debounce(function(){var s=window.getSelection();if(s&&!s.isCollapsed&&cur>=0&&('ontouchstart' in window))onSelEnd()},400));
document.addEventListener('mousedown',function(e){if(!tc(e,'#selbar'))if(!tc(e,'mark.hl'))hideSel()});
/* نقرة على تظليل موجود */
document.addEventListener('click',function(e){
  var m=tc(e,'mark.hl');if(!m||cur<0)return;
  var s=window.getSelection();if(s&&!s.isCollapsed)return;
  var h=hls.find(function(x){return String(x.id)===m.dataset.hl});if(!h)return;
  var rect=m.getBoundingClientRect();
  sel={b:h.b,s:h.s,e:h.e,text:h.text,hlId:h.id};showSel(rect,h);
  e.stopPropagation();
});
$('#selbar').addEventListener('mousedown',function(e){e.preventDefault()});
$('#selbar').addEventListener('click',function(e){
  var b=tc(e,'button');if(!b||!sel)return;
  if(b.dataset.hl){applyColor(b.dataset.hl);return}
  var a=b.dataset.sel;
  if(a==='note'){var h=sel.hlId?hls.find(function(x){return x.id===sel.hlId}):applyColor('yellow',true);openNote(h)}
  else if(a==='copy'){copyQuote(sel.text)}
  else if(a==='share'){shareQuote(sel.text)}
  else if(a==='del'){removeHL(sel.hlId)}
  else if(a==='fb'){window.__openFb&&window.__openFb({kind:'line',b:sel.b,quote:sel.text})}
});
function applyColor(color,keep){
  var h;
  if(sel.hlId){h=hls.find(function(x){return x.id===sel.hlId});h.color=color}
  else{
    /* لو يتداخل مع تظليل قائم في نفس الفقرة نستبدله */
    hls=hls.filter(function(x){return!(x.b===sel.b&&x.s<sel.e&&x.e>sel.s)});
    h={id:Date.now(),b:sel.b,s:sel.s,e:sel.e,text:sel.text,color:color,at:new Date().toISOString()};hls.push(h);
  }
  saveHL();paintHL();
  window.getSelection().removeAllRanges();
  if(!keep){hideSel()}else{sel.hlId=h.id}
  return h;
}
function removeHL(id){hls=hls.filter(function(x){return x.id!==id});var had=notes.length;notes=notes.filter(function(n){return n.hl!==id});saveHL();if(notes.length!==had)saveNotes();paintHL();hideSel()}

/* ─── الملاحظات ─── */
var noteCtx=null;
function openNote(h,existing){
  noteCtx={hl:h?h.id:null,id:existing?existing.id:null};
  var n=existing||(h?notes.find(function(x){return x.hl===h.id}):null);
  if(n)noteCtx.id=n.id;
  $('#noteQ').textContent=h?h.text:(n&&n.ref&&n.ref!=='ملاحظة عامّة'?n.ref:'ملاحظة عامّة على '+flat[cur].label);
  $('#noteT').value=n?n.text:'';
  hideSel();openModal('mNote');setTimeout(function(){$('#noteT').focus()},80);
}
$('#noteSave').addEventListener('click',function(){
  var v=$('#noteT').value.trim();
  if(noteCtx.id){var n=notes.find(function(x){return x.id===noteCtx.id});if(v)n.text=v;else notes=notes.filter(function(x){return x!==n})}
  else if(v){var h=noteCtx.hl?hls.find(function(x){return x.id===noteCtx.hl}):null;notes.push({id:Date.now(),text:v,hl:noteCtx.hl,b:h?h.b:null,ref:h?h.text.slice(0,80):'ملاحظة عامّة',at:new Date().toISOString()})}
  var p=saveNotes();closeModal();paintHL();toast(v?'حُفظت الملاحظة':'حُذفت الملاحظة');
  if($('#dNb').classList.contains('on'))renderNb();
});

/* ─── نسخ ومشاركة الاقتباس ─── */
function citation(){var c=flat[cur];return'— '+book.title+'، '+c.label+': '+c.title}
function copyQuote(t){
  var s='«'+t+'»\n'+citation();
  (navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(function(){toast('نُسخ الاقتباس')}).catch(function(){toast('تعذّر النسخ')});
  hideSel();window.getSelection().removeAllRanges();
}
var shareBlob=null;
function shareQuote(t){
  hideSel();window.getSelection().removeAllRanges();
  var dark=prefs.theme==='dark';
  var W=1080,H=1350,cv=document.createElement('canvas');cv.width=W;cv.height=H;var x=cv.getContext('2d');
  var bg=dark?'#101412':'#F6F0E6',ink=dark?'#8FCBAE':'#163A2C',gold=dark?'#D6AE6E':'#A87A2E',txt=dark?'#E6DDCF':'#2A221C',mut=dark?'#7B7263':'#9C8C7B';
  var fam="'Zain','ZainLocal',serif";
  Promise.all([document.fonts.load('700 60px Zain'),document.fonts.load('900 60px Zain'),document.fonts.load('700 60px ZainLocal')]).catch(function(){}).then(function(){
    x.fillStyle=bg;x.fillRect(0,0,W,H);
    var g=x.createRadialGradient(W/2,H*0.42,10,W/2,H*0.42,W*0.7);g.addColorStop(0,dark?'rgba(214,174,110,.10)':'rgba(168,122,46,.10)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,W,H);
    x.strokeStyle=gold;[420,310,200].forEach(function(r,k){x.globalAlpha=[.10,.16,.24][k];x.lineWidth=3;x.beginPath();x.arc(W/2,H*0.42,r,0,Math.PI*2);x.stroke()});x.globalAlpha=1;
    x.direction='rtl';x.textAlign='center';
    x.fillStyle=gold;x.font='700 150px '+fam;x.fillText('«',W/2,300);
    var size=t.length>260?46:t.length>160?54:t.length>90?62:72,lh=size*1.75;
    x.font='700 '+size+'px '+fam;x.fillStyle=txt;
    var words=t.split(/\s+/),lines=[],line='';
    words.forEach(function(w){var test=line?line+' '+w:w;if(x.measureText(test).width>W-200&&line){lines.push(line);line=w}else line=test});if(line)lines.push(line);
    var maxL=Math.floor(640/lh);if(lines.length>maxL){lines=lines.slice(0,maxL);lines[maxL-1]+=' …'}
    var y0=H*0.44-(lines.length*lh)/2+size*0.6;
    lines.forEach(function(l,k){x.fillText(l,W/2,y0+k*lh)});
    x.fillStyle=gold;x.fillRect(W/2-40,H-300,80,4);
    x.fillStyle=ink;x.font='900 64px '+fam;x.fillText(book.title,W/2,H-200);
    x.fillStyle=mut;x.font='400 36px '+fam;x.fillText(flat[cur].title+' · '+(book.author||''),W/2,H-140);
    cv.toBlob(function(b){shareBlob=b;$('#shareImg').src=URL.createObjectURL(b);openModal('mShare')},'image/png');
  });
}
$('#shareDl').addEventListener('click',function(){if(!shareBlob)return;var a=document.createElement('a');a.href=URL.createObjectURL(shareBlob);a.download='ولادة-قلب-اقتباس.png';a.click()});
$('#shareGo').addEventListener('click',function(){
  if(!shareBlob)return;var f=new File([shareBlob],'wiladat-qalb.png',{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[f]}))navigator.share({files:[f],title:book.title}).catch(function(){});
  else $('#shareDl').click();
});

/* ══════════════════════════════════════════════
   ١٠. الألواح: الفهرس · الدفتر · الإعدادات
   ══════════════════════════════════════════════ */
var tocTab='toc-ch',nbTab='nb-ch',nbFromHome=false;
function openDrawer(id){closeAll(true);$('#'+id).classList.add('on');$('#scrim').classList.add('on')}
function closeAll(keepSel){$$('.drawer').forEach(function(d){d.classList.remove('on')});$('#scrim').classList.remove('on');if(!keepSel)hideSel()}
function openModal(id){$('#'+id).classList.add('on')}
function closeModal(){$$('.modal').forEach(function(m){m.classList.remove('on')})}
$$('.modal').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m)closeModal()})});

function renderToc(){
  $$('#dToc .tab').forEach(function(t){t.classList.toggle('on',t.dataset.tab===tocTab)});
  var h='';
  if(tocTab==='toc-ch'){
    var c=flat[cur],d=c&&content[c.id];
    if(!d||!d._secs.length)h='<div class="empty">لا عناوين داخليّة في هذا الفصل.</div>';
    else{h='<button class="tl-sec" data-jump="0"><i></i>بداية '+esc(c.label)+'</button>';d._secs.forEach(function(s){h+='<button class="tl-sec lv'+(s.lv||2)+(s.door?' dr-'+s.door:'')+'" data-jump="'+s.i+'"><i></i>'+esc(plain(s.t))+'</button>'})}
  }else{
    var lastSt=null;
    allCh.forEach(function(c){
      if(c.station!==lastSt){lastSt=c.station;h+='<div class="tl-grp">'+esc((c.part.title?c.part.title+' · ':'')+c.station.title)+'</div>'}
      var p=prog.chapters[c.id]||{};
      if(!c.pub)h+='<div class="tl-ch lock"><span class="n">'+(c.number?ar(c.number):'٠')+'</span>'+esc(c.title)+'<span class="ok"><svg class="i" style="width:16px"><use href="#i-lock"/></svg></span></div>';
      else h+='<button class="tl-ch'+(c.fi===cur?' on':'')+'" data-open="'+c.fi+'"><span class="n">'+(c.number?ar(c.number):'٠')+'</span>'+esc(c.title)+(p.done?'<span class="ok"><svg class="i" style="width:18px"><use href="#i-check"/></svg></span>':'')+'</button>';
    });
  }
  $('#tocBody').innerHTML=h;markTocActive();
}
function markTocActive(){
  if(tocTab!=='toc-ch')return;
  var y=window.scrollY+140,act=0;
  layout.heads.forEach(function(hd){if(hd.y<=y)act=hd.i});
  $$('#tocBody .tl-sec').forEach(function(b){var j=+b.dataset.jump;b.classList.toggle('on',j===act);b.classList.toggle('past',j<act)});
}

function nbItem(c,h,n){
  var q=h?h.text:(n.ref&&n.ref!=='ملاحظة عامّة'?n.ref:'');
  var s='<div class="nb-item" data-goto="'+c.fi+'" data-gb="'+(h?h.b:(n.b!=null?n.b:''))+'">';
  if(q)s+='<div class="nb-q c-'+(h?h.color:'yellow')+'">'+esc(q)+'</div>';
  if(n)s+='<div class="nb-n">'+esc(n.text)+'</div>';
  var date=new Date((h||n).at||Date.now());
  s+='<div class="nb-m"><span>'+date.toLocaleDateString('ar-EG',{day:'numeric',month:'long'})+'</span><span class="sp"></span>';
  if(cur===c.fi){s+='<button data-nbnote="'+(h?h.id:'')+'" data-nbn="'+(n?n.id:'')+'">'+(n?'تعديل':'أضف ملاحظة')+'</button>';s+='<button data-nbdel="'+(h?'h'+h.id:'n'+n.id)+'">حذف</button>'}
  return s+'</div></div>';
}
function chapterNb(c,data){
  var out='';var used={};
  (data.hls||[]).slice().sort(function(a,b){return(a.b-b.b)||(a.s-b.s)}).forEach(function(h){var n=(data.notes||[]).find(function(x){return x.hl===h.id});if(n)used[n.id]=1;out+=nbItem(c,h,n)});
  (data.notes||[]).forEach(function(n){if(!used[n.id])out+=nbItem(c,null,n)});
  return out;
}
function renderNb(){
  if(cur<0&&nbTab==='nb-ch')nbTab='nb-all';
  $$('#dNb .tab').forEach(function(t){t.classList.toggle('on',t.dataset.tab===nbTab);if(t.dataset.tab==='nb-ch')t.style.display=cur>=0?'':'none'});
  var body=$('#nbBody');
  if(nbTab==='nb-bm'){
    var L=(prog.bookmarks||[]).slice().sort(function(a,b){var ia=flat.findIndex(function(c){return c.id===a.ch}),ib=flat.findIndex(function(c){return c.id===b.ch});return(ia-ib)||(a.b-b.b)});
    var hb='',last=null;
    L.forEach(function(x){var c=flat.find(function(z){return z.id===x.ch});if(!c)return;
      if(x.ch!==last){last=x.ch;hb+='<div class="nb-chh">'+esc(c.label+' · '+c.title)+'</div>'}
      hb+='<div class="nb-item bm-item" data-goto="'+c.fi+'" data-gb="'+x.b+'"><div class="bm-h"><svg class="i"><use href="#i-bmf"/></svg>'+esc(x.h||c.title)+'</div><div class="bm-t">'+esc(x.t)+'</div><div class="nb-m"><span>'+new Date(x.at).toLocaleDateString('ar-EG',{day:'numeric',month:'long'})+'</span><span class="sp"></span><button data-bmdel="'+x.id+'">إزالة</button></div></div>'});
    body.innerHTML=hb||'<div class="empty"><svg class="i"><use href="#i-bm"/></svg><br>لا علامات بعد.<br>اضغط زرّ العلامة في الشريط السفليّ لتضع علامةً عند أيّ موضعٍ تريد الرجوع إليه.<br><small>وموضعك الأخير يُحفظ وحده دائمًا.</small></div>';
    return;
  }
  if(nbTab==='nb-ch'){
    var c=flat[cur];var inner=chapterNb(c,{hls:hls,notes:notes});
    body.innerHTML='<div class="nb-tools"><button class="ghost" data-act="freeNote"><svg class="i"><use href="#i-pen"/></svg>ملاحظة عامّة</button></div>'+(inner||'<div class="empty"><svg class="i"><use href="#i-pen"/></svg><br>حدّد أيّ جملة في الفصل لتظلّلها أو تكتب عليها ملاحظة.</div>');
    return;
  }
  body.innerHTML='<div class="empty">جارٍ جمع دفترك…</div>';
  fetchAllNb().then(function(){
    var h='';
    if(nbTab==='nb-all'){
      flat.forEach(function(c){var d=nbCache[c.id];if(!d)return;var inner=chapterNb(c,d);if(inner)h+='<div class="nb-chh">'+esc(c.label+' · '+c.title)+'</div>'+inner});
      if(h)h='<div class="nb-tools"><button class="ghost" data-act="exportNb"><svg class="i"><use href="#i-dl"/></svg>تنزيل دفتري كملفّ نصّي</button></div>'+h;
      else h='<div class="empty"><svg class="i"><use href="#i-note"/></svg><br>دفترك فارغ حتى الآن.<br>كلّ ما تظلّله أو تكتبه أثناء القراءة يُجمع هنا.</div>';
    }else{
      flat.forEach(function(c){var d=nbCache[c.id];if(!d)return;var keys=Object.keys(d.refl||{}).filter(function(k){return d.refl[k].text&&d.refl[k].text.trim()});
        var cc=content[c.id],extra=nbCardHtml(c,d,cc);if(!keys.length&&!extra)return;
        h+='<div class="nb-chh">'+esc(c.label+' · '+c.title)+'</div>'+extra;
        keys.sort(function(a,b){return a-b}).forEach(function(k){var q=cc&&cc.sections[k]?plain(cc.sections[k].content):'سؤال للتأمّل';h+='<div class="nb-item" data-goto="'+c.fi+'" data-gb="'+k+'"><div class="nb-q c-green">'+esc(q)+'</div><div class="nb-n">'+esc(d.refl[k].text)+'</div></div>'})});
      if(!h)h='<div class="empty"><svg class="i"><use href="#i-leaf"/></svg><br>في آخر كلّ فصلٍ أسئلة للتأمّل.<br>ما تكتبه فيها، وما تكتبه في بطاقتك، وما تحمله معك من أسئلة، يُجمع هنا.</div>';
    }
    body.innerHTML=h;
  });
}
function nbCardHtml(c,d,cc){
  var h='',cd=d.card||{},rk=Object.keys(cd).find(function(k){return/^row\d$/.test(k)}),r=rk?cd[rk]:{};
  if(cd.margin||r.line||r.where||r.state||r.none||(r.doors&&Object.keys(r.doors).length)){
    var ds=Object.keys(r.doors||{}).filter(function(k){return r.doors[k]}).map(function(k){return DOORS[k].name+(r.strong===k?' ★':'')}).join('، ');
    var stt={hand:'في يدي',over:'يعمل فوق طاقته',dim:'قد خمد',q:'؟'}[r.state]||'';
    h+='<div class="nb-card nb-item" data-goto="'+c.fi+'" data-gb="'+(cc?cc.sections.findIndex(function(x){return x.type==='card_final'}):'')+'"><h5>بطاقتك</h5>';
    if(cd.margin)h+='<p>الهامش: <b>«'+esc(cd.margin)+'»</b></p>';
    if(r.line)h+='<p>أوّل ما يفعله جسدي تحت الضغط أن… <b>'+esc(r.line)+'</b></p>';
    if(ds||r.none)h+='<p>بابك: <b>'+(r.none?'لم أجد نفسي فيها':esc(ds))+'</b></p>';
    if(stt)h+='<p>حالك فيه: <b>'+stt+'</b></p>';
    if(r.where)h+='<p>أين يظهر: <b>'+esc(r.where)+'</b></p>';
    h+='</div>';
  }
  var ck=Object.keys(d.carry||{});
  if(ck.length&&cc){ck.forEach(function(k){var j=cc.sections.findIndex(function(x){return x.key===k});if(j<0)return;h+='<div class="nb-item" data-goto="'+c.fi+'" data-gb="'+j+'"><div class="nb-q c-green">'+esc(plain(cc.sections[j].content))+'</div><div class="nb-m"><span>سؤالٌ تحمله معك</span></div></div>'})}
  return h;
}
function fetchAllNb(){
  if(!uid)return Promise.resolve();
  return Promise.all(flat.map(function(c){
    if(nbCache[c.id]&&c.fi!==cur)return Promise.resolve();
    if(c.fi===cur){nbCache[c.id]={hls:hls,notes:notes,refl:refl,card:card,carry:carry};return Promise.resolve()}
    return Promise.all([db.collection(C_HL).doc(docId(c.id)).get().catch(function(){return null}),db.collection(C_NOTES).doc(docId(c.id)).get().catch(function(){return null})]).then(function(r){
      var nd=r[1]&&r[1].exists?r[1].data():{};
      nbCache[c.id]={hls:r[0]&&r[0].exists?(r[0].data().items||[]):[],notes:nd.items||[],refl:nd.reflections||{},card:nd.card||{},carry:nd.carry||{}};
    });
  })).then(function(){return Promise.all(flat.filter(function(c){var d=nbCache[c.id];return d&&(Object.keys(d.refl||{}).length||Object.keys(d.carry||{}).length||d.card&&Object.keys(d.card).length)}).map(function(c){return load(c).catch(function(){})}))});
}
function exportNb(){
  var out=book.title+' — دفتري\n'+(book.author||'')+'\n\n';
  flat.forEach(function(c){var d=nbCache[c.id];if(!d)return;var body='';
    (d.hls||[]).slice().sort(function(a,b){return(a.b-b.b)||(a.s-b.s)}).forEach(function(h){body+='«'+h.text+'»\n';var n=(d.notes||[]).find(function(x){return x.hl===h.id});if(n)body+='   ✎ '+n.text+'\n';body+='\n'});
    (d.notes||[]).filter(function(n){return!n.hl}).forEach(function(n){body+='✎ '+n.text+'\n\n'});
    var cc=content[c.id];Object.keys(d.refl||{}).forEach(function(k){if(!d.refl[k].text)return;body+='؟ '+(cc?plain(cc.sections[k].content):'')+'\n   '+d.refl[k].text+'\n\n'});
    var cd=d.card||{},rk=Object.keys(cd).find(function(k){return/^row\d$/.test(k)}),r=rk?cd[rk]:{};
    if(cd.margin||r.line){body+='▢ بطاقتك\n';if(cd.margin)body+='   الهامش: «'+cd.margin+'»\n';if(r.line)body+='   أوّل ما يفعله جسدي تحت الضغط أن… '+r.line+'\n';var ds=Object.keys(r.doors||{}).filter(function(k){return r.doors[k]}).map(function(k){return DOORS[k].name+(r.strong===k?' ★':'')}).join('، ');if(ds||r.none)body+='   بابك: '+(r.none?'لم أجد نفسي فيها':ds)+'\n';var stt={hand:'في يدي',over:'يعمل فوق طاقته',dim:'قد خمد',q:'؟'}[r.state];if(stt)body+='   حالك فيه: '+stt+'\n';if(r.where)body+='   أين يظهر: '+r.where+'\n';body+='\n'}
    if(body)out+='━━━━ '+c.label+': '+c.title+' ━━━━\n\n'+body;
  });
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([out],{type:'text/plain;charset=utf-8'}));a.download='دفتري — ولادة قلب.txt';a.click();
}

/* ─── الإعدادات ─── */
var FONTS={zain:"'Zain','ZainLocal','Noto Naskh Arabic',serif",amiri:"'Amiri',serif",naskh:"'Noto Naskh Arabic',serif"};
function baseFs(){return window.innerWidth<640?19:20}
function applyPrefs(){
  var r=document.documentElement;
  r.setAttribute('data-theme',prefs.theme==='light'?'':prefs.theme);
  r.style.setProperty('--fs',(prefs.fs||baseFs())+'px');
  r.style.setProperty('--lh',prefs.lh);
  r.style.setProperty('--cw',prefs.cw+'px');
  r.style.setProperty('--ta',prefs.ta);
  r.style.setProperty('--f-body',FONTS[prefs.font]||FONTS.zain);
  var mc={light:'#F6F0E6',sepia:'#EFE3CC',dark:'#101412'}[prefs.theme];$('meta[name=theme-color]').setAttribute('content',mc);
  $$('[data-act=theme]').forEach(function(b){b.innerHTML='<svg class="i"><use href="#i-'+(prefs.theme==='dark'?'sun':'moon')+'"/></svg>'});
  ls('wq3-prefs',prefs);
  if(cur>=0)setTimeout(cacheLayout,60);
}
function renderSet(){
  var fs=prefs.fs||baseFs();
  var seg=function(key,opts){return'<div class="seg">'+opts.map(function(o){return'<button data-pref="'+key+'" data-v="'+o[0]+'" class="'+(String(prefs[key])===String(o[0])?'on':'')+'">'+o[1]+'</button>'}).join('')+'</div>'};
  var h='';
  h+='<div class="set-g"><div class="set-l">حجم الخط <b id="fsv">'+ar(fs)+'</b></div><input type="range" min="16" max="30" step="1" value="'+fs+'" data-range="fs" aria-label="حجم الخط"><div class="fprev">وحين يحلّ الليل وترتخي الستائر، تجلس لتُحصي ما أنجزت.</div></div>';
  h+='<div class="set-g"><div class="set-l">نوع الخط</div>'+seg('font',[['zain','زين'],['amiri','أميري'],['naskh','نسخ']])+'</div>';
  h+='<div class="set-g"><div class="set-l">تباعد الأسطر</div>'+seg('lh',[[1.7,'متقارب'],[2,'عادي'],[2.3,'مريح'],[2.6,'واسع']])+'</div>';
  h+='<div class="set-g"><div class="set-l">عرض النصّ</div>'+seg('cw',[[600,'ضيّق'],[700,'عادي'],[840,'واسع']])+'</div>';
  h+='<div class="set-g"><div class="set-l">محاذاة الفقرات</div>'+seg('ta',[['justify','ضبط الطرفين'],['right','إلى اليمين']])+'</div>';
  h+='<div class="set-g"><div class="set-l">لون الصفحة</div><div class="themes"><button data-pref="theme" data-v="light" class="'+(prefs.theme==='light'?'on':'')+'">فاتح</button><button data-pref="theme" data-v="sepia" class="'+(prefs.theme==='sepia'?'on':'')+'">ورقيّ</button><button data-pref="theme" data-v="dark" class="'+(prefs.theme==='dark'?'on':'')+'">ليليّ</button></div></div>';
  h+='<div class="set-g"><div class="set-l">سرعة التمرير التلقائيّ <b id="asv">'+ar(prefs.as)+'</b></div><input type="range" min="1" max="6" step="1" value="'+prefs.as+'" data-range="as" aria-label="سرعة التمرير"></div>';
  h+='<div class="set-g"><button class="ghost" data-act="resetPrefs">استعادة الإعدادات الافتراضيّة</button></div>';
  h+='<div class="set-g"><button class="ghost" data-act="tour"><svg class="i"><use href="#i-help"/></svg>أعد الجولة التعريفيّة</button></div>';
  $('#setBody').innerHTML=h;
}
$('#setBody').addEventListener('input',function(e){
  var r=e.target.dataset.range;if(!r)return;
  prefs[r]=+e.target.value;$('#'+r+'v').textContent=ar(prefs[r]);applyPrefs();
});
$('#setBody').addEventListener('click',function(e){
  var b=tc(e,'[data-pref]');if(!b)return;
  var k=b.dataset.pref,v=b.dataset.v;prefs[k]=isNaN(+v)?v:+v;applyPrefs();renderSet();
});

/* ─── البحث في الكتاب ─── */
function norm(s){return String(s).replace(/[ً-ْٰـ]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')}
function openSearch(){
  openModal('mSearch');var inp=$('#sIn');inp.value='';$('#sRes').innerHTML='<div class="sr-cnt">اكتب كلمةً أو جزءًا من جملة.</div>';setTimeout(function(){inp.focus()},60);
  Promise.all(flat.map(function(c){return load(c).catch(function(){})}));
}
$('#sIn').addEventListener('input',debounce(function(){
  var q=$('#sIn').value.trim();var res=$('#sRes');
  if(q.length<2){res.innerHTML='<div class="sr-cnt">اكتب كلمةً أو جزءًا من جملة.</div>';return}
  Promise.all(flat.map(function(c){return load(c).catch(function(){})})).then(function(){
    var nq=norm(q),out=[],count=0;
    flat.forEach(function(c){var d=content[c.id];if(!d)return;
      d.sections.forEach(function(s,i){if(!s.content)return;var t=plain(s.content),n=norm(t),k=n.indexOf(nq);if(k<0)return;count++;
        if(out.length>=80)return;
        /* خريطة من النصّ المُطبَّع إلى الأصليّ */
        var map=[],j=0;for(var z=0;z<t.length;z++){if(!/[ً-ْٰـ]/.test(t[z]))map.push(z)}
        var a=map[k]||0,b=(map[k+nq.length-1]||a)+1;
        var st=Math.max(0,a-60),en=Math.min(t.length,b+80);
        out.push('<button class="sr-i" data-goto="'+c.fi+'" data-gb="'+i+'"><small>'+esc(c.label+' · '+c.title)+'</small><p>'+(st>0?'… ':'')+esc(t.slice(st,a))+'<mark>'+esc(t.slice(a,b))+'</mark>'+esc(t.slice(b,en))+(en<t.length?' …':'')+'</p></button>');
      });
    });
    res.innerHTML='<div class="sr-cnt">'+(count?ar(count)+' نتيجة':'لا نتائج')+'</div>'+out.join('');
  });
},220));

/* ─── التمرير التلقائيّ ─── */
var asOn=false,asRaf=0,asAcc=0;
function toggleAS(){asOn?stopAS():startAS()}
function startAS(){asOn=true;$('#asBtn').classList.add('on');$('#asBtn').innerHTML='<svg class="i"><use href="#i-pause"/></svg>';document.body.classList.add('bars-hidden');var last=performance.now();
  (function step(t){if(!asOn)return;var dt=t-last;last=t;asAcc+=[0,14,22,32,45,62,85][prefs.as]*dt/1000;var px=Math.floor(asAcc);if(px){window.scrollBy(0,px);asAcc-=px}
    if(window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2){stopAS();return}asRaf=requestAnimationFrame(step)})(last);}
function stopAS(){if(!asOn)return;asOn=false;cancelAnimationFrame(asRaf);var b=$('#asBtn');b.classList.remove('on');b.innerHTML='<svg class="i"><use href="#i-play"/></svg>';document.body.classList.remove('bars-hidden')}
['wheel','touchstart','keydown'].forEach(function(ev){window.addEventListener(ev,function(e){if(asOn&&!(tc(e,'.bbar')))stopAS()},{passive:true})});

/* ══════════════════════════════════════════════
   ١١. توزيع النقرات
   ══════════════════════════════════════════════ */
document.addEventListener('click',function(e){
  var t=tc(e,'[data-act],[data-open],[data-jump],[data-goto],[data-tab],[data-nbdel],[data-nbnote],[data-bmdel]');if(!t)return;
  if(t.dataset.bmdel){var bid=+t.dataset.bmdel;prog.bookmarks=(prog.bookmarks||[]).filter(function(x){return x.id!==bid});saveBms();paintBms();updateBmBtn();renderNb();e.stopPropagation();return}
  if(t.dataset.open!=null){var fi=+t.dataset.open;var fresh=t.dataset.fresh;closeModal();openChapter(fi,{resume:!fresh});return}
  if(t.dataset.jump!=null){closeAll();jumpBlock(+t.dataset.jump,false);return}
  if(t.dataset.goto!=null){var gi=+t.dataset.goto,gb=t.dataset.gb===''?null:+t.dataset.gb;closeAll();closeModal();
    if(gi===cur){if(gb!=null)jumpBlock(gb,true)}else openChapter(gi,{block:gb});return}
  if(t.dataset.tab){var tb=t.dataset.tab;if(tb.indexOf('toc')===0){tocTab=tb;renderToc()}else{nbTab=tb;renderNb()}return}
  if(t.dataset.nbdel){var k=t.dataset.nbdel,id=+k.slice(1);if(k[0]==='h')removeHL(id);else{notes=notes.filter(function(n){return n.id!==id});saveNotes();paintHL()}renderNb();return}
  if(t.dataset.nbnote!=null){var hid=+t.dataset.nbnote,nid=+t.dataset.nbn;var h=hid?hls.find(function(x){return x.id===hid}):null;var n=nid?notes.find(function(x){return x.id===nid}):null;closeAll();openNote(h,n);return}
  switch(t.dataset.act){
    case'home':closeAll();flushPos();showHome();break;
    case'toc':if(cur<0)return;tocTab='toc-ch';renderToc();openDrawer('dToc');break;
    case'notebook':nbTab=cur>=0?'nb-ch':'nb-all';renderNb();openDrawer('dNb');break;
    case'notebookHome':nbTab='nb-all';renderNb();openDrawer('dNb');break;
    case'settings':renderSet();openDrawer('dSet');break;
    case'search':openSearch();break;
    case'theme':prefs.theme=prefs.theme==='dark'?'light':'dark';applyPrefs();break;
    case'autoscroll':toggleAS();break;
    case'prev':if(cur>0)openChapter(cur-1,{});break;
    case'next':if(cur<flat.length-1)openChapter(cur+1,{});break;
    case'close':closeAll();break;
    case'tour':closeAll();closeModal();setTimeout(function(){startTour(cur<0?'home':'reader',true)},cur<0?0:350);break;
    case'bookmark':toggleBm();break;
    case'bookmarksHome':nbTab='nb-bm';renderNb();openDrawer('dNb');break;
    case'fromTop':$('#resumePill').classList.remove('on');window.scrollTo({top:0,behavior:'smooth'});break;
    case'rpClose':$('#resumePill').classList.remove('on');break;
    case'fbGeneral':window.__openFb&&window.__openFb({kind:'general'});break;
    case'mclose':closeModal();break;
    case'scrollToc':$('#tocAnchor').scrollIntoView({behavior:'smooth'});break;
    case'freeNote':closeAll();openNote(null,null);break;
    case'exportNb':exportNb();break;
    case'resetPrefs':prefs=Object.assign({},PREF_DEF);applyPrefs();renderSet();break;
  }
});
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){closeAll();closeModal();hideSel();return}
  if(tc(e,'input,textarea'))return;
  if(cur<0)return;
  if(e.key==='ArrowLeft'&&!e.altKey&&!e.metaKey){if(cur<flat.length-1)openChapter(cur+1,{})}
  else if(e.key==='ArrowRight'&&!e.altKey&&!e.metaKey){if(cur>0)openChapter(cur-1,{})}
  else if(e.key==='/'){e.preventDefault();openSearch()}
});
window.addEventListener('resize',function(){if(!prefs.fs)applyPrefs()});


/* ══════════════════════════════════════════════
   ١٢. الرأي (يعمل حين CFG.feedback) — يُرسَل إلى المؤلّف
   ══════════════════════════════════════════════ */
var FB=!!CFG.feedback,C_FB=CFG.feedbackCollection||'maraya_feedback';
var FB_Q=[
  {k:'found',t:'هل وجدتَ نفسك فيما قرأت؟',o:['نعم، بوضوح','إلى حدٍّ ما','لا']},
  {k:'heavy',t:'أين ثقل عليك الكلام أو غمض؟',ta:1},
  {k:'touch',t:'أيّ موضعٍ لمسك أكثر من غيره؟',ta:1},
  {k:'more',t:'كلمةٌ أخيرة تحبّ أن تقولها',ta:1}
];
function fbName(){return ls('wq-fbname')||''}
function fbSend(docid,data){
  if(!FS)return Promise.reject();
  data.rid=rid();data.name=data.name||fbName();data.book=BOOK_KEY;data.ua=navigator.userAgent.slice(0,120);
  data.at=firebase.firestore.FieldValue.serverTimestamp();
  return FS.collection(C_FB).doc(docid).set(data,{merge:true});
}
if(FB){
  /* زرّ «رأيك» في شريط التحديد */
  var sb=$('#selbar'),fbBtn=document.createElement('button');
  fbBtn.className='ac fb-ac';fbBtn.dataset.sel='fb';fbBtn.innerHTML='<svg class="i"><use href="#i-chat"/></svg>رأيك';
  sb.insertBefore(fbBtn,$('[data-sel=note]',sb));
  /* زرّ الرأي العامّ في الشريط العلويّ */
  var tb=$('.tbar-in [data-act=search]');var gb=document.createElement('button');
  gb.className='ib fb-top';gb.dataset.act='fbGeneral';gb.setAttribute('aria-label','أرسل رأيك');gb.title='أرسل رأيك';gb.innerHTML='<svg class="i"><use href="#i-chat"/></svg>';
  tb.parentNode.insertBefore(gb,tb);
  /* نافذة الرأي */
  document.body.insertAdjacentHTML('beforeend','<div class="modal" id="mFb"><div class="mbox"><div class="mh"><h3 id="fbT">رأيك</h3><button class="ib" data-act="mclose" aria-label="إغلاق"><svg class="i"><use href="#i-x"/></svg></button></div><div class="mb"><blockquote id="fbQ"></blockquote><textarea id="fbText" placeholder="قل ما تحبّ: ما وصلك، ما غمض عليك، ما ثقل، ما تقترحه…"></textarea><input id="fbName" class="fb-name" placeholder="اسمك (اختياريّ)" maxlength="60"></div><div class="mf"><button class="btn" id="fbSend">أرسل</button><button class="btn sec" data-act="mclose">إلغاء</button></div></div></div>');
  var fbCtx=null;
  window.__openFb=function(ctx){
    fbCtx=ctx;$('#fbT').textContent=ctx.kind==='line'?'رأيك في هذا الموضع':'رأيك';
    var q=$('#fbQ');q.hidden=!ctx.quote;q.textContent=ctx.quote||'';
    $('#fbText').value='';$('#fbName').value=fbName();
    hideSel();openModal('mFb');setTimeout(function(){$('#fbText').focus()},80);
  };
  $('#fbSend').addEventListener('click',function(){
    var t=$('#fbText').value.trim();if(!t){$('#fbText').focus();return}
    var nm=$('#fbName').value.trim();if(nm)ls('wq-fbname',nm);
    var c=flat[cur],b=this;b.disabled=true;
    fbSend(rid()+'_'+Date.now(),{kind:fbCtx.kind,chapter:c?c.id:null,chapterTitle:c?c.label+': '+c.title:null,block:fbCtx.b!=null?fbCtx.b:null,quote:fbCtx.quote||null,text:t,name:nm})
      .then(function(){closeModal();toast('وصل رأيك، شكرًا لك');window.getSelection().removeAllRanges()})
      .catch(function(){toast('تعذّر الإرسال — تحقّق من الاتصال')})
      .then(function(){b.disabled=false});
  });
}
function fbChapterCard(c){
  if(!FB)return'';
  var h='<section class="fbc" data-fbc="'+c.id+'"><div class="fbc-h"><svg class="i"><use href="#i-chat"/></svg><b>رأيك في '+esc(c.label)+'</b></div><p class="fbc-s">كلامك يصل إلى المؤلّف مباشرةً، ويُعين على أن يخرج الكتاب على أحسن وجه.</p>';
  FB_Q.forEach(function(q){
    h+='<label class="fbc-l">'+esc(q.t)+'</label>';
    if(q.o)h+='<div class="fbc-o">'+q.o.map(function(o){return'<button class="cf-s" data-fbo="'+q.k+'" data-v="'+esc(o)+'">'+esc(o)+'</button>'}).join('')+'</div>';
    else h+='<textarea data-fbq="'+q.k+'" rows="2"></textarea>';
  });
  h+='<input class="fb-name" data-fbq="name" placeholder="اسمك (اختياريّ)" maxlength="60"><div class="fbc-f"><button class="btn" data-fbsend="'+c.id+'">أرسل رأيي</button><span class="fbc-st"></span></div></section>';
  return h;
}
function fbFill(){
  var box=$('.fbc');if(!box)return;
  var saved=ls(BOOK_KEY+'-fb-'+box.dataset.fbc)||{};
  $$('[data-fbq]',box).forEach(function(t){t.value=t.dataset.fbq==='name'?(saved.name||fbName()):(saved[t.dataset.fbq]||'')});
  $$('[data-fbo]',box).forEach(function(b){b.classList.toggle('on',saved[b.dataset.fbo]===b.dataset.v)});
  if(saved.sentAt){$('.fbc-st',box).textContent='أرسلتَ رأيك — يمكنك تعديله وإرساله مرّةً أخرى';$('[data-fbsend]',box).textContent='حدّث رأيي'}
}
document.addEventListener('click',function(e){
  if(!FB)return;
  var o=tc(e,'[data-fbo]');
  if(o){var box=o.closest('.fbc'),k=BOOK_KEY+'-fb-'+box.dataset.fbc,sv=ls(k)||{};sv[o.dataset.fbo]=sv[o.dataset.fbo]===o.dataset.v?'':o.dataset.v;ls(k,sv);fbFill();return}
  var s=tc(e,'[data-fbsend]');
  if(s){
    var box=s.closest('.fbc'),cid=s.dataset.fbsend,k=BOOK_KEY+'-fb-'+cid,sv=ls(k)||{};
    $$('[data-fbq]',box).forEach(function(t){sv[t.dataset.fbq]=t.value.trim()});
    var any=FB_Q.some(function(q){return sv[q.k]});if(!any){toast('اكتب شيئًا أو اختر إجابة أوّلًا');return}
    if(sv.name)ls('wq-fbname',sv.name);
    var c=flat.find(function(x){return x.id===cid});s.disabled=true;$('.fbc-st',box).textContent='يُرسَل…';
    var data={kind:'chapter',chapter:cid,chapterTitle:c?c.label+': '+c.title:cid,name:sv.name||''};FB_Q.forEach(function(q){data[q.k]=sv[q.k]||''});
    fbSend(rid()+'_'+cid+'_chapter',data).then(function(){sv.sentAt=Date.now();ls(k,sv);fbFill();toast('وصل رأيك، شكرًا لك')}).catch(function(){$('.fbc-st',box).textContent='تعذّر الإرسال — تحقّق من الاتصال'}).then(function(){s.disabled=false});
  }
});
document.addEventListener('input',function(e){
  if(!FB||!e.target.matches||!e.target.matches('.fbc [data-fbq]'))return;
  var box=e.target.closest('.fbc'),k=BOOK_KEY+'-fb-'+box.dataset.fbc,sv=ls(k)||{};sv[e.target.dataset.fbq]=e.target.value;ls(k,sv);
});


/* ══════════════════════════════════════════════
   ١٣. الجولة التعريفيّة — تظهر أوّل مرّة، وتُعاد من «؟»
   ══════════════════════════════════════════════ */
var TOUR={on:false,steps:[],i:0,kind:null};
function tourSteps(kind){
  var unit=(book.parts&&book.parts[0]&&book.parts[0].unit)||'الفصل',isF=book.parts&&book.parts[0]&&book.parts[0].unitGender==='f';
  var S=[];
  if(kind==='home'){
    S.push({t:'أهلًا بك في «'+book.title+'»',x:'جولةٌ قصيرة تعرّفك بما في هذه الصفحة وأين تجد كلّ شيء. لن تأخذ منك أكثر من دقيقة، وتستطيع أن تتخطّاها متى شئت.'});
    S.push({el:'.hero .cta',t:(lastChapter()?'تابع من حيث توقّفت':'ابدأ من هنا'),x:'هذا الزرّ يفتح لك القراءة. وحين تعود بعد ذلك يأخذك إلى الموضع الذي وقفتَ عنده بالضبط، ويذكر لك اسم القسم.'});
    S.push({el:'.toc .chrow',t:'فهرس '+(CFG.tocTitle||'الرحلة'),x:'هنا ترتيب القراءة كلّه. اضغط أيّ '+unit+' متاح'+(isF?'ة':'')+' لتفتح'+(isF?'ها':'ه')+'. وما عليه قفلٌ مكتوبٌ بجواره «قريبًا» لم يُتَح بعد، وسيظهر حين يكتمل. وتظهر بجوار كلّ '+unit+' نسبة ما قرأتَ منه.'});
    S.push({el:'.stats',t:'تقدّمك',x:'كم '+unit+' متاحًا، وكم أتممت، وكم يأخذ من الوقت، ونسبة ما قرأتَه كلّه.'});
    if(CFG.guest)S.push({el:'.guest-note',t:'بلا حساب',x:'لا تحتاج أن تسجّل دخولك. وكلّ ما تكتبه أو تظلّله يُحفظ على جهازك هذا وحده، فافتح الرابط من الجهاز نفسه لتجد ما تركته.'});
    S.push({el:'.hero-links [data-act=notebookHome]',t:'دفتري',x:'كلّ ما ظلّلتَه، وما كتبتَه من ملاحظاتٍ وتأمّلات، وعلاماتك، مجموعٌ في مكانٍ واحد. وتستطيع أن تنزّله كملفّ.'});
    S.push({el:'.home-top [data-act=search]',t:'البحث',x:'ابحث عن أيّ كلمةٍ أو جملةٍ في كلّ ما نُشر، ثمّ اضغط النتيجة لتصل إلى موضعها.'});
    S.push({el:'.home-top [data-act=theme]',t:'الوضع الليليّ',x:'للقراءة في الليل أو في الضوء الخافت. وفي إعدادات القراءة داخل '+unit+' تجد لونًا ورقيًّا أيضًا.'});
    S.push({el:'.home-top [data-act=tour]',t:'هذه الجولة',x:'إن نسيتَ شيئًا، اضغط هنا في أيّ وقتٍ لتعيد الجولة.',last:'ابدأ القراءة'});
  }else{
    S.push({el:'.opener',t:'افتتاحيّة '+unit,x:'اسم '+unit+'، وكم يأخذ من الوقت، وعدد وقفاته.'+($('.omap')?' والأزرار تحت العنوان خريطةٌ لأقسامه: اضغط أيّها لتنتقل إليه.':'')});
    if($('#rail')&&!$('#rail').hidden)S.push({el:'#rail',t:'أين أنت الآن',x:'هذا الشريط يُريك أقسام '+unit+' وأين وصلتَ منها وأنت تقرأ. واضغط أيّ قسمٍ لتنتقل إليه.'});
    S.push({el:'.tbar [data-act=toc]',t:'الفهرس',x:'عناوين '+unit+' كلّها، وفهرس الكتاب كاملًا. ومنه تنتقل إلى أيّ موضع.'});
    S.push({el:'.tbar [data-act=home]',t:'الواجهة',x:'يرجعك إلى الصفحة الأولى وفهرس الرحلة.'});
    S.push({el:'#art .b-p',t:'حدّد أيّ جملة',x:'اضغط على الجملة واسحب لتحدّدها، فيظهر لك شريطٌ صغير:',tools:1});
    S.push({el:'#bmBtn',t:'ضع علامة',x:'موضعك يُحفظ وحده دائمًا. لكن إن أردتَ أن تعود إلى فقرةٍ بعينها، اضغط هنا فتظهر بجوارها شريطةٌ ذهبيّة، وتجدها في «دفتري ← علاماتي».'});
    S.push({el:'.bbar [data-act=notebook]',t:'دفتري',x:'تظليلاتك وملاحظاتك في هذا '+unit+' وفي الكتاب كلّه، وإجاباتك عن أسئلة التأمّل، وعلاماتك.'});
    S.push({el:'#leftInfo',t:'ما بقي',x:'نسبة ما قرأتَ، وكم بقي من الوقت حتّى تُتمّ '+unit+'.'});
    S.push({el:'.bbar [data-act=autoscroll]',t:'التمرير التلقائيّ',x:'تنزل الصفحة وحدها وأنت تقرأ، ويتوقّف التمرير حين تلمس الشاشة. وتضبط سرعته من الإعدادات.'});
    S.push({el:'.tbar [data-act=settings]',t:'إعدادات القراءة',x:'حجم الخطّ ونوعه، وتباعد الأسطر، وعرض النصّ، ولون الصفحة: فاتح أو ورقيّ أو ليليّ.'});
    if(FB)S.push({el:'.tbar [data-act=fbGeneral]',t:'رأيك',x:'اكتب رأيك في أيّ وقت. وفي آخر كلّ '+unit+' أسئلةٌ قصيرة عن تجربتك معه. وكلّ ذلك يصل إلى المؤلّف مباشرةً.'});
    S.push({el:'#bNext',t:(isF?'التالية':'التالي'),x:'حين تُتمّ '+unit+' تجد في آخر'+(isF?'ها':'ه')+' زرًّا إلى ما بعد'+(isF?'ها':'ه')+'. ويمكنك أن تنتقل من هنا أيضًا.',last:'ابدأ القراءة'});
  }
  return S;
}
function tourVisible(el){if(!el)return false;var r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'}
function startTour(kind,force){
  if(TOUR.on)return;
  var key=BOOK_KEY+'-tour-'+kind;
  if(!force&&ls(key))return;
  if($('.modal.on')||$('.drawer.on'))return;
  TOUR={on:true,kind:kind,i:0,steps:tourSteps(kind).filter(function(s){return!s.el||tourVisible($(s.el))})};
  ls(key,1);
  stopAS();hideSel();document.body.classList.remove('bars-hidden');document.body.classList.add('touring');
  var ov=$('#tour');ov.hidden=false;requestAnimationFrame(function(){ov.classList.add('on')});
  showStep(0);
}
function endTour(){
  if(!TOUR.on)return;TOUR.on=false;var ov=$('#tour');ov.classList.remove('on');document.body.classList.remove('touring');
  setTimeout(function(){ov.hidden=true},300);
}
function showStep(i){
  var S=TOUR.steps;if(i<0||i>=S.length){endTour();return}
  TOUR.i=i;var s=S[i],el=s.el?$(s.el):null;
  var tip=$('#tourTip'),hole=$('#tourHole');
  var h='<div class="tt-n">'+ar(i+1)+' / '+ar(S.length)+'</div><h4>'+esc(s.t)+'</h4><p>'+esc(s.x)+'</p>';
  if(s.tools)h+='<div class="tt-tools"><span class="sw sw-yellow"></span><span class="sw sw-green"></span><span class="sw sw-red"></span><span class="sw sw-blue"></span><em>ظلّل بلونٍ</em>'+
    (FB?'<b><svg class="i"><use href="#i-chat"/></svg>رأيك</b>':'')+'<b><svg class="i"><use href="#i-pen"/></svg>ملاحظة</b><b><svg class="i"><use href="#i-copy"/></svg>انسخ</b><b><svg class="i"><use href="#i-share"/></svg>صورة</b></div>';
  h+='<div class="tt-f"><button class="tt-skip" data-tour="skip">'+(i===S.length-1?'':'تخطَّ الجولة')+'</button><span class="sp"></span>'+(i>0?'<button class="tt-prev" data-tour="prev">السابق</button>':'')+'<button class="btn tt-next" data-tour="next">'+(i===S.length-1?(s.last||'تمّ'):'التالي')+'</button></div>';
  h+='<div class="tt-dots">'+S.map(function(_,k){return'<i'+(k===i?' class="on"':'')+'></i>'}).join('')+'</div>';
  tip.innerHTML=h;
  var place=function(){
    if(!TOUR.on||TOUR.i!==i)return;
    if(!el){hole.classList.add('none');hole.style.cssText='';tip.classList.add('center');tip.style.cssText='';return}
    hole.classList.remove('none');tip.classList.remove('center');
    var r=el.getBoundingClientRect(),pad=8,vw=window.innerWidth,vh=window.innerHeight;
    var hh=Math.min(r.height+pad*2,vh*0.5);
    hole.style.cssText='top:'+(r.top-pad)+'px;left:'+(r.left-pad)+'px;width:'+(r.width+pad*2)+'px;height:'+hh+'px;border-radius:'+(Math.min(22,(r.height+pad*2)/2))+'px';
    var tw=Math.min(360,vw-24),th=tip.offsetHeight||200;
    var below=r.top-pad+hh+14,above=r.top-pad-14-th;
    var top=(below+th<vh-8)?below:(above>8?above:Math.max(8,vh-th-8));
    var left=r.left+r.width/2-tw/2;left=Math.max(12,Math.min(left,vw-tw-12));
    tip.style.cssText='top:'+top+'px;left:'+left+'px;width:'+tw+'px';
  };
  TOUR.place=place;
  if(el){
    var r=el.getBoundingClientRect(),fixed=getComputedStyle(el).position==='fixed'||el.closest('.tbar,.bbar');
    if(!fixed&&(r.top<90||r.bottom>window.innerHeight-90)){el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(place,420)}else place();
  }else place();
  setTimeout(place,40);
  $('.tt-next',tip).focus({preventScroll:true});
}
document.addEventListener('click',function(e){
  var b=tc(e,'[data-tour]');if(!b)return;
  var a=b.dataset.tour;
  if(a==='next'){if(TOUR.i>=TOUR.steps.length-1){var k=TOUR.kind;endTour();if(k==='home'&&cur<0){var l=lastChapter();openChapter(l?l.i:0,l&&l.fresh?{resume:false}:{})}}else showStep(TOUR.i+1)}
  else if(a==='prev')showStep(TOUR.i-1);
  else if(a==='skip')endTour();
});
document.addEventListener('keydown',function(e){
  if(!TOUR.on)return;
  if(e.key==='Escape'){endTour();e.stopImmediatePropagation()}
  else if(e.key==='ArrowLeft'||e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();showStep(TOUR.i+1)}
  else if(e.key==='ArrowRight'){e.preventDefault();e.stopImmediatePropagation();showStep(TOUR.i-1)}
},true);
window.addEventListener('resize',debounce(function(){if(TOUR.on&&TOUR.place)TOUR.place()},150));
window.addEventListener('scroll',function(){if(TOUR.on&&TOUR.place)requestAnimationFrame(TOUR.place)},{passive:true});
document.body.insertAdjacentHTML('beforeend','<div class="tour" id="tour" hidden><div class="tour-hole" id="tourHole"></div><div class="tour-tip" id="tourTip" role="dialog" aria-live="polite"></div></div>');

})();
