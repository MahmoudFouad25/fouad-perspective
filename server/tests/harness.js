// قاعدة بيانات وهمية تكفي للاختبار
const store = {}; let auto = 0;
const DEL = { __del: 1 }, TS = { __ts: 1 };
function col(name){ store[name] = store[name] || {}; return store[name]; }
function setPath(o, path, v){ const k = path.split('.'); let t = o; for (let i=0;i<k.length-1;i++){ t[k[i]] = t[k[i]] || {}; t = t[k[i]]; } const l=k.at(-1); if (v===DEL) delete t[l]; else if (v&&v.__au) { t[l]=(t[l]||[]).concat(v.__au.filter(x=>!(t[l]||[]).some(y=>JSON.stringify(y)===JSON.stringify(x)))); } else t[l] = v===TS? new Date().toISOString(): v; }
function getPath(o, path){ return path.split('.').reduce((a,k)=>a==null?a:a[k], o); }
function docRef(c, id){ return {
  id,
  get: async()=>{ const d=col(c)[id]; return { id, exists: !!d, data: ()=> d && JSON.parse(JSON.stringify(d)) }; },
  set: async(v, o)=>{ const cur = (o&&o.merge&&col(c)[id]) || {}; const n = o&&o.merge? cur : {}; for (const k in v) { if (v[k]===DEL) delete n[k]; else if (v[k]&&v[k].__au) n[k]=(n[k]||[]).concat(v[k].__au); else if (v[k]&&typeof v[k]==='object'&&!Array.isArray(v[k])&&!v[k].__ts) { n[k]=Object.assign({}, n[k]||{}); for (const kk in v[k]) { if (v[k][kk]===DEL) delete n[k][kk]; else n[k][kk]=v[k][kk]; } } else n[k] = v[k]===TS? new Date().toISOString(): v[k]; } col(c)[id]=n; },
  update: async(v)=>{ if(!col(c)[id]) throw new Error('no doc '+c+'/'+id); for (const k in v) setPath(col(c)[id], k, v[k]); }
};}
function query(c, filters=[], lim){ return {
  where:(f,op,v)=>query(c,[...filters,[f,op,v]],lim), limit:(n)=>query(c,filters,n), orderBy:()=>query(c,filters,lim),
  get: async()=>{ let docs = Object.entries(col(c)).filter(([id,d])=>filters.every(([f,op,v])=>{const x=getPath(d,f); return op==='=='? x===v : op==='in'? v.includes(x) : op==='array-contains'? Array.isArray(x)&&x.includes(v) : false;}));
    if (lim) docs = docs.slice(0,lim); const ds = docs.map(([id,d])=>({id, ref: docRef(c,id), data:()=>JSON.parse(JSON.stringify(d))}));
    return { docs: ds, empty: !ds.length, size: ds.length, forEach: f=>ds.forEach(f) }; }
};}
global.db = { collection: (c)=>({ ...query(c), doc: (id)=>docRef(c,id), add: async(v)=>{ const id='r'+(++auto); await docRef(c,id).set(v); return {id}; } }) };
global.admin = { firestore: { FieldValue: { serverTimestamp: ()=>TS, delete: ()=>DEL, arrayUnion: (...v)=>({__au:v}) } } };
global.crypto = require('crypto');
global.sent = [];
global.blockedIds=new Set(); global.bot = { sendMessage: async (chatId, text, opts)=>{ if (blockedIds.has(String(chatId))) { const e=new Error('ETELEGRAM: 403 Forbidden: bot was blocked by the user'); e.response={statusCode:403}; throw e; } sent.push({chatId, text, opts}); }, answerCallbackQuery: async ()=>{} };
global.messageTemplates={welcome:()=>({text:'WELCOME',keyboard:[]})};
global.logMessage = async ()=>{};
global.getPaymentDetails = (m)=>'['+m+']';
global.requireAdmin = (req,res,next)=> req.headers.admin ? next() : res.status(401).json({ok:false});
const routes = {}; global.app = { post: (p, ...h)=>{ routes[p]=h; } };
global.call = async (p, body, headers={}) => { const h = routes[p]; let out; const res = { code:200, status(c){this.code=c; return this;}, json(o){ out={code:this.code, ...o}; }, sendStatus(c){out={code:c};} };
  const run = async (i)=>{ if (i>=h.length) return; await h[i]({body, headers}, res, ()=>run(i+1)); }; await run(0); return out; };
global.store = store;
