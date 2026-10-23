require('./harness.js');
const fs=require('fs'); eval(fs.readFileSync(require('path').join(__dirname,'..','bot-receipts-routes.js'),'utf8')+';global.rcOnAttachment=rcOnAttachment;global.rcOnCallback=rcOnCallback;global.rcOnText=rcOnText;global.rcStageFor=rcStageFor;');
const assert=require('assert');
const day=864e5, iso=d=>new Date(Date.now()+d*day).toISOString();
function sched(paidN, dues, amt=2100){ return dues.map((d,i)=>({installmentNumber:i, amount:amt, dueDate:iso(d), status:i<paidN?'paid':'pending'})); }
const photo=(u)=>({photo:[{file_unique_id:u+'s'},{file_unique_id:u}]});
const R=(u)=>({success:true,attachmentType:'photo',permanentUrl:'https://x/'+u+'.jpg',fileId:'f'+u});
const last=()=>sent.at(-1);
const kb=(m)=>((m.opts||{}).reply_markup||{}).inline_keyboard||[];
const cbs=(m)=>kb(m).flat().map(b=>b.callback_data);
const rcpts=(chat)=>Object.entries(store.receipts||{}).filter(([id,r])=>r.chatId===String(chat)).map(([id,r])=>({id,...r}));
let n=0; const ok=(c,m)=>{assert(c,m);n++;console.log('✓',m)};
(async()=>{
 // ===== ١: طالب بكورس واحد =====
 store.tempBookings={ b1:{status:'transferred',paymentConfirmed:true,telegramChatId:111,courseName:'الحضن الدافئ',customer:{name:'منة شريف'},paymentDetails:{type:'installment',totalAmount:6300,paidAmount:2100,installmentSchedule:sched(1,[-30,3,33])}} };
 ok(await rcOnAttachment(111,R('a'),photo('a'))===true,'صورة من غير زرار: اتربطت تلقائي');
 let r=rcpts(111)[0]; ok(r.bookingId==='b1'&&r.idx===1&&r.source==='auto'&&r.fileUniqueIds[0]==='a','اتسجلت للقسط التاني ومعاها بصمة الملف');
 ok(/القسط التاني/.test(last().text)&&cbs(last()).includes('rcpt_wrong_'+r.id)&&cbs(last()).includes('rcpt_notrc_'+r.id),'الرد فيه «مش ده القسط» و«دي مش إيصال»');
 // نفس الصورة تاني
 ok(await rcOnAttachment(111,R('a2'),photo('a'))===true&&/وصلنا قبل كده/.test(last().text)&&rcpts(111).length===1,'نفس الصورة مرتين: مفيش إيصال مكرر');
 // صورة تانية ورا الأولى
 await rcOnAttachment(111,R('b'),photo('b')); r=rcpts(111)[0];
 ok(rcpts(111).length===1&&r.extra.length===1&&r.fileUniqueIds.includes('b')&&/لنفس الإيصال/.test(last().text),'صورة تانية خلال نص ساعة: اتضافت لنفس الإيصال');
 // صوت
 ok(await rcOnAttachment(111,{success:true,attachmentType:'voice',permanentUrl:'https://x/v.ogg'},{voice:{}})===true&&rcpts(111).length===1&&/هنشوفها/.test(last().text),'رسالة صوتية: مش إيصال، ورد هادي');
 // PDF وملف تاني
 store.receipts[r.id].createdMs=Date.now()-3600e3;
 ok(await rcOnAttachment(111,{success:true,attachmentType:'document',fileName:'receipt.pdf',permanentUrl:'https://x/p.pdf'},{document:{mime_type:'application/pdf',file_unique_id:'p'}})===true&&rcpts(111).length===2,'ملف PDF: إيصال جديد (بعد نص ساعة)');
 ok(await rcOnAttachment(111,{success:true,attachmentType:'document',fileName:'notes.docx'},{document:{mime_type:'application/msword',file_unique_id:'w'}})===true&&rcpts(111).length===2,'ملف Word: مش إيصال');
 // «دي مش إيصال»
 const pdf=rcpts(111)[1]; await rcOnCallback(111,{id:'c'},['notrc',pdf.id]);
 ok(store.receipts[pdf.id].status==='dismissed'&&store.receipts[pdf.id].decidedBy==='student'&&/اكتب لنا/.test(last().text),'الطالب قال «دي مش إيصال»: اتشالت');
 // «مش ده القسط» → يختار
 await rcOnCallback(111,{id:'c'},['wrong',r.id]);
 ok(/لأنهي قسط/.test(last().text)&&cbs(last()).includes('rcpt_pick_'+r.id+'_0')&&cbs(last()).includes('rcpt_unsure_'+r.id),'«مش ده القسط»: البوت عرض الأقساط التانية');
 await rcOnCallback(111,{id:'c'},['pick',r.id,'0']);
 ok(store.receipts[r.id].idx===2&&store.receipts[r.id].studentSaysWrong===false&&/القسط التالت/.test(last().text),'اختار القسط التالت: الإيصال اتعدّل');
 // ===== ٢: الزرار =====
 store.receipts[r.id].createdMs=Date.now()-3600e3;
 await rcOnCallback(111,{id:'c'},['send','b1','1']); ok(store.telegramChats['111'].pendingReceipt.idx===1,'زرار «ابعت إيصال القسط» سجّل النية');
 // كتب بدل الصورة
 ok(await rcOnText(111,'حولت خلاص')===true&&/مستنيين صورة/.test(last().text)&&store.telegramChats['111'].pendingReceipt.hinted,'كتب كلام بدل الصورة: تلميح مرة واحدة');
 ok(await rcOnText(111,'رقم العملية 123456789 المبلغ 2100')===true&&rcpts(111).some(x=>x.source==='text'&&x.idx===1)&&!store.telegramChats['111'].pendingReceipt,'كتب رقم العملية: اتسجل كإيصال نصي');
 // زرار لقسط اتدفع
 store.tempBookings.b1.paymentDetails.installmentSchedule[1].status='paid';
 await rcOnCallback(111,{id:'c'},['send','b1','1']);
 ok(/اتسجل خلاص/.test(last().text)&&cbs(last())[0]==='rcpt_send_b1_2'&&!store.telegramChats['111'].pendingReceipt,'زرار قديم لقسط اتدفع: بيقول اتسجل ويعرض اللي بعده');
 await rcOnCallback(222,{id:'c'},['send','b1','2']); ok(!(store.telegramChats['222']||{}).pendingReceipt,'محادثة تانية ما تقدرش تستعمل زرار حجز مش بتاعها');
 // إلغاء
 await rcOnCallback(111,{id:'c'},['send','b1','2']); await rcOnCallback(111,{id:'c'},['cancel']);
 ok(!store.telegramChats['111'].pendingReceipt&&/اتلغى/.test(last().text),'إلغاء النية');
 // حسابي
 await rcOnText(111,'هو فاضل عليا كام؟');
 ok(/حسابك/.test(last().text)&&/الحضن الدافئ/.test(last().text)&&/في المراجعة/.test(last().text),'«فاضل كام»: حسابه وفيه الإيصال اللي في المراجعة');
 // رسالة عادية من طالب: رد هادي مرة واحدة
 const before=sent.length; ok(await rcOnText(111,'عندي سؤال عن المحاضرة')===true&&sent.length===before+1&&/وصلت رسالتك/.test(last().text),'طالب كتب رسالة: رد هادي بدل القائمة الرئيسية');
 ok(await rcOnText(111,'محتاج حاجة')===true&&sent.length===before+1,'الرسالة التانية: من غير رد تاني (مش سبام)');
 ok(await rcOnText(999,'السلام عليكم')===false,'زائر: القائمة الرئيسية زي ما هي');
 await rcOnCallback(111,{id:'c'},['menu']); ok(last().text==='WELCOME','زرار القائمة الرئيسية شغال');
 // ===== ٣: كورسين =====
 store.tempBookings.b3={status:'transferred',telegramChatId:'333',courseName:'المحراب',customer:{name:'أحمد'},paymentDetails:{type:'installment',paidAmount:2100,installmentSchedule:sched(1,[-10,5])}};
 store.tempBookings.b4={status:'paid',telegramChatId:333,courseName:'Insight Out',customer:{name:'أحمد'},paymentDetails:{type:'installment',paidAmount:2100,installmentSchedule:sched(1,[-10,-2])}};
 await rcOnAttachment(333,R('c'),photo('c'));
 ok(/لأنهي كورس/.test(last().text)&&kb(last()).length===3&&kb(last())[0][0].text.startsWith('Insight Out'),'كورسين: سأل، والأقرب ميعادًا الأول، وفيه «دي مش إيصال»');
 const c3=rcpts(333)[0]; await rcOnCallback(333,{id:'c'},['pick',c3.id,'1']); ok(store.receipts[c3.id].bookingId==='b3','اختار الكورس');
 await rcOnCallback(333,{id:'c'},['any']); ok(/لأنهي كورس/.test(last().text)&&cbs(last()).length===2,'«ابعت إيصال قسط» من القايمة: بيسأل لأنهي كورس');
 // ===== ٤: الدفعة الأولى والزائر =====
 store.tempBookings.b5={status:'confirmed',telegramChatId:'555',automationWorkflow:{currentState:'awaiting_receipt'}};
 ok(await rcOnAttachment(555,R('d'),photo('d'))===false,'إيصال الدفعة الأولى: الكود القديم');
 ok(await rcOnAttachment(444,R('e'),photo('e'))===false,'زائر من غير حجز: الكود القديم');
 store.tempBookings.b6={status:'confirmed',telegramChatId:'666',paymentDetails:{type:'installment',installmentSchedule:sched(0,[0,30])}};
 ok(await rcOnAttachment(666,R('f'),photo('f'))===false,'حجز أقساط لسه دفعته الأولى ما اتأكدتش: مش قسط');
 // طالب دفع كامل
 store.tempBookings.b7={status:'transferred',paymentConfirmed:true,telegramChatId:'777',courseName:'رحلة آدم',customer:{name:'سلمى'},paymentDetails:{type:'full'}};
 ok(await rcOnAttachment(777,R('g'),photo('g'))===true&&rcpts(777)[0].source==='unknown'&&/هنراجعها/.test(last().text),'طالب دافع كامل وبعت صورة: بتتسجل للمراجعة');
 // طالب في individualStudents بس
 store.individualStudents={ s1:{telegramChatId:888,courseName:'Reignite',paymentConfirmed:true,customer:{name:'نور'},paymentDetails:{type:'installment',paidAmount:1000,installmentSchedule:sched(1,[-20,1],1000)}} };
 ok(await rcOnAttachment(888,R('h'),photo('h'))===true&&rcpts(888)[0].bookingId==='s1','الطالب المحوّل اللي في individualStudents بس: اتعرف');
 // ===== ٥: وضع المساعدة =====
 const k5=sent.length; store.tempBookings.b9={status:'transferred',telegramChatId:'909',courseName:'X',customer:{name:'هالة'},paymentDetails:{type:'installment',paidAmount:2100,installmentSchedule:sched(1,[-30,-1])}};
 ok(await rcOnAttachment(909,R('i'),photo('i'),{helpMode:true})===false&&rcpts(909)[0].source==='help'&&sent.length===k5,'في وضع المساعدة: كارت للأدمن ومن غير أي رد للطالب');
 // ===== ٦: التأجيل =====
 await rcOnCallback(909,{id:'c'},['delay','b9','1']);
 ok(/لحد إمتى/.test(last().text)&&cbs(last()).includes('rcpt_dly_b9_1_14')&&cbs(last()).includes('support_b9'),'محتاج أأجل: اختيارات المدة');
 await rcOnCallback(909,{id:'c'},['dly','b9','1','14']);
 let pp=rcpts(909).find(x=>x.kind==='postpone'); ok(pp&&pp.days===14&&pp.status==='pending'&&/وصل طلبك/.test(last().text),'طلب التأجيل اتسجل');
 await rcOnCallback(909,{id:'c'},['dly','b9','1','30']); ok(rcpts(909).filter(x=>x.kind==='postpone').length===1&&store.receipts[pp.id].days===30,'غيّر المدة: نفس الطلب اتعدّل');
 await rcOnCallback(909,{id:'c'},['dly','b9','1','99']); ok(store.receipts[pp.id].days===30,'مدة مش من الاختيارات: مرفوضة');
 r=await call('/installments/postpone',{requestId:pp.id,decision:'approved',newDate:'2030-01-15'},{admin:1});
 const s9=store.tempBookings.b9.paymentDetails.installmentSchedule[1];
 ok(r.ok&&s9.dueDate.startsWith('2030-01-15')&&s9.postponedFrom&&/اتأجل/.test(last().text)&&store.receipts[pp.id].status==='approved','الأدمن وافق بميعاد تاني: الجدول اتعدّل والطالب عرف');
 r=await call('/installments/postpone',{requestId:pp.id,decision:'approved'},{admin:1}); ok(r.code===400,'قرار مرتين على نفس الطلب: مرفوض');
 // ===== ٧: التذكير =====
 for (const k of Object.keys(store.tempBookings)) if (!['b1','b3'].includes(k)) delete store.tempBookings[k];
 store.individualStudents={};
 store.tempBookings.t1={status:'transferred',paymentConfirmed:true,telegramChatId:'1001',courseName:'رحلة آدم',customer:{name:'سلمى'},paymentDetails:{type:'installment',paidAmount:2100,installmentSchedule:sched(1,[-40,3,33])}};
 store.tempBookings.t2={status:'transferred',paymentConfirmed:true,telegramChatId:'1002',courseName:'المحراب',customer:{name:'عمر'},paymentDetails:{type:'installment',paidAmount:2100,installmentSchedule:sched(1,[-40,-4])}};
 store.tempBookings.t3={status:'transferred',paymentConfirmed:true,telegramChatId:'1003',courseName:'Y',customer:{name:'قافل'},paymentDetails:{type:'installment',paidAmount:2100,installmentSchedule:sched(1,[-40,0])}};
 store.tempBookings.t4={status:'transferred',paymentConfirmed:true,telegramChatId:'1004',courseName:'Z',customer:{name:'ليلى'},paymentDetails:{type:'installment',paidAmount:2100,installmentSchedule:sched(1,[-40,-12])}};
 store.tempBookings.t5={status:'confirmed',telegramChatId:'1005',paymentDetails:{type:'installment',installmentSchedule:sched(0,[-1,30])}};
 store.tempBookings.t6={status:'transferred',paymentConfirmed:true,telegramChatId:'1006',courseName:'W',customer:{name:'سما'},paymentDetails:{type:'installment',paidAmount:2100,installmentSchedule:sched(1,[-40,-1])}};
 store.receipts.rp={chatId:'1006',bookingId:'t6',idx:1,status:'pending',kind:'installment'};
 blockedIds.add('1003');
 // ما نلمسش الحجزين بتوع الأقسام اللي فاتت
 store.tempBookings.b1.installmentReminders={'2_pre3':1,'2_due':1}; store.tempBookings.b3.installmentReminders={'1_pre3':1};
 const k7=sent.length; r=await call('/installments/run',{},{admin:1});
 const st=id=>(r.items.find(x=>x.bookingId===id)||{}).stage;
 ok(st('t1')==='pre3'&&st('t2')==='late3'&&st('t4')==='late10','المراحل: قبل الميعاد، متأخر ٣، متأخر ١٠');
 ok(!st('t5'),'حجز دفعته الأولى ما اتأكدتش: مفيش تذكير قسط');
 ok(!st('t6')&&r.skippedPending>=1,'فيه إيصال مستني مراجعة: مفيش تذكير');
 ok(r.blocked===1&&store.telegramChats['1003'].botBlocked===true&&r.sent>=3,'طالب قافل البوت: التشغيل كمّل للباقيين واتعلّم عليه');
 const m10=sent.slice(k7).find(m=>m.chatId==='1004'); ok(/محتاج أأجل/.test(m10.text)&&cbs(m10).includes('rcpt_delay_t4_1'),'تذكير بعد ١٠ أيام: بيعرض التأجيل');
 r=await call('/installments/run',{},{admin:1}); ok(!r.items.length,'تاني مرة نفس اليوم: مفيش تكرار');
 r=await call('/installments/remind',{bookingId:'t3',idx:1},{admin:1}); ok(r.code===400&&r.error==='blocked','تذكير يدوي لطالب قافل البوت: الأدمن بيعرف');
 // ===== ٨: التأكيد الموحّد بعد تسجيل الدفعة =====
 store.receipts.rx={chatId:'1002',bookingId:'t2',idx:1,status:'pending',kind:'installment'};
 store.receipts.ry={chatId:'1002',bookingId:'t2',idx:1,status:'pending',kind:'postpone'};
 const sc=store.tempBookings.t2.paymentDetails.installmentSchedule; sc[1].status='paid'; store.tempBookings.t2.paymentDetails.paidAmount=4200;
 r=await call('/installments/paid-notify',{bookingId:'t2',idx:1,amount:2100,covered:[{idx:1,amount:2100,status:'paid'}],receiptId:'rx'},{admin:1});
 ok(r.ok&&r.sent&&store.receipts.rx.status==='approved'&&store.receipts.ry.status==='dismissed'&&/اتسجل/.test(last().text)&&/كامل/.test(last().text),'دفعة آخر قسط: تأكيد واحد «اتدفع كامل»، والإيصال وطلب التأجيل اتقفلوا');
 ok(store.telegramChats['1002'].hasPendingReceipt===false,'الشارة راحت من المحادثة');
 // جزئي
 const s1=store.tempBookings.t1.paymentDetails.installmentSchedule; s1[1].status='partial'; s1[1].paidSoFar=1000;
 r=await call('/installments/paid-notify',{bookingId:'t1',idx:1,amount:1000},{admin:1});
 ok(/١٬٠٠٠ ج.م من/.test(last().text)&&/فاضل منه ١٬١٠٠/.test(last().text),'دفعة جزئية: الرسالة بتقول دفع قد إيه وفاضل قد إيه');
 // توزيع على قسطين
 s1[1].status='paid'; s1[1].paidSoFar=2100; s1[2].status='partial'; s1[2].paidSoFar=500;
 r=await call('/installments/paid-notify',{bookingId:'t1',idx:1,amount:1600,covered:[{idx:1,amount:1100,status:'paid'},{idx:2,amount:500,status:'partial'}]},{admin:1});
 ok(/غطّى: القسط التاني، القسط التالت \(جزء منه\)/.test(last().text),'مبلغ غطّى أكتر من قسط: الرسالة موضحاه');
 r=await call('/installments/paid-notify',{bookingId:'t3',idx:1,amount:2100},{admin:1}); ok(r.ok&&r.sent===false&&r.error==='blocked','تأكيد لطالب قافل البوت: الأدمن بيعرف');
 // القرار القديم لسه شغال
 store.receipts.rz={chatId:'333',bookingId:'b3',idx:1,status:'pending',kind:'installment'};
 r=await call('/receipts/decision',{receiptId:'rz',decision:'rejected',reason:'المبلغ مش باين'},{admin:1});
 ok(/المبلغ مش باين/.test(last().text)&&cbs(last())[0]==='rcpt_send_b3_1','الرفض: السبب وزرار ابعته تاني');
 r=await call('/installments/run',{},{}); ok(r.code===401,'التشغيل من غير أدمن ولا جوجل: مرفوض');
 // أسماء فيها HTML
 store.tempBookings.h={status:'transferred',paymentConfirmed:true,telegramChatId:'1009',courseName:'<b>x</b>',customer:{name:'<script>'},paymentDetails:{type:'installment',installmentSchedule:sched(1,[-40,3])}};
 await call('/installments/remind',{bookingId:'h',idx:1},{admin:1}); ok(!/<script>/.test(last().text)&&/&lt;script&gt;/.test(last().text),'الأسماء بتتنضّف');
 // ===== ٩: «حسابي» مع حجوزات مكررة، والطلبات المكتوبة =====
 store.tempBookings.d1={status:'paid',paymentConfirmed:true,telegramChatId:'2001',courseName:'ملاذ الحيارى',customer:{name:'ماما'},paymentDetails:{type:'full'},timestamp:iso(-50)};
 store.tempBookings.d2={status:'paid',paymentConfirmed:true,telegramChatId:'2001',courseName:'ملاذ الحيارى',customer:{name:'ماما'},paymentDetails:{type:'full'},timestamp:iso(-40)};
 store.tempBookings.d3={status:'transferred',paymentConfirmed:true,telegramChatId:'2001',courseName:'ملاذ الحيارى',customer:{name:'ماما'},paymentDetails:{type:'installment',paidAmount:1000,installmentSchedule:sched(1,[-30,-2],1000)},timestamp:iso(-30)};
 store.tempBookings.d4={status:'paid',paymentConfirmed:true,telegramChatId:'2001',courseName:'المحراب',customer:{name:'ماما'},paymentDetails:{type:'full'}};
 store.tempBookings.d5={status:'paid',paymentConfirmed:true,archivedAsTest:true,telegramChatId:'2001',courseName:'جاهز للتحول',paymentDetails:{type:'full'}};
 await rcOnText(2001,'حسابي'); const st9=last().text;
 ok((st9.match(/ملاذ الحيارى/g)||[]).length===1&&(st9.match(/المحراب/g)||[]).length===1&&!/جاهز للتحول/.test(st9),'«حسابي»: كل كورس مرة واحدة، والحجز التجريبي مش ظاهر');
 ok(st9.indexOf('ملاذ الحيارى')<st9.indexOf('المحراب')&&/اللي عليك دلوقتي: القسط التاني/.test(st9),'الكورس اللي عليه قسط مفتوح ظاهر الأول، وبالقسط بتاعه');
 ok(cbs(last()).includes('rcpt_delayany')&&cbs(last()).includes('rcpt_any'),'تحت «حسابي»: ابعت إيصال، ومحتاج أأجل');
 await rcOnText(2001,'محتاج أأجل'); ok(/تحب نأجل/.test(last().text)&&cbs(last()).includes('rcpt_dly_d3_1_7'),'كتب «محتاج أأجل»: البوت فهم وعرض المدد');
 await rcOnText(2001,'ممكن تأجيل القسط؟'); ok(/تحب نأجل/.test(last().text),'كتب «تأجيل»: نفس الحاجة');
 await rcOnText(2001,'انا حولت'); ok(/ابعت صورة إيصال/.test(last().text)&&store.telegramChats['2001'].pendingReceipt.bookingId==='d3','كتب «حولت»: البوت مستني الإيصال للقسط الصح');
 await rcOnCallback(2001,{id:'c'},['cancel']);
 store.tempBookings.d6={status:'transferred',paymentConfirmed:true,telegramChatId:'2001',courseName:'الحضن الدافئ',customer:{name:'ماما'},paymentDetails:{type:'installment',paidAmount:1000,installmentSchedule:sched(1,[-30,5],1000)}};
 await rcOnCallback(2001,{id:'c'},['delayany']); ok(/أنهي كورس/.test(last().text)&&cbs(last()).length===2,'أكتر من كورس عليه أقساط: بيسأل يأجل أنهي');
 const n9=sent.length; await rcOnText(2001,'عاجل لو سمحت'); ok(!sent.slice(n9).some(m=>/تحب نأجل/.test(m.text)),'«عاجل» مش بتتفهم تأجيل');
 // ===== ١٠: التحية والشكر و«تمام» وطرق الدفع =====
 store.telegramChats['2001']={}; let k10=sent.length;
 await rcOnText(2001,'السلام عليكم'); ok(/وعليكم السلام ورحمة الله يا ماما/.test(last().text)&&cbs(last()).includes('rcpt_status'),'«السلام عليكم»: رد السلام والقايمة');
 await rcOnText(2001,'شكرا جدا'); ok(/العفو/.test(last().text),'«شكرًا»: العفو');
 k10=sent.length; await rcOnText(2001,'متشكر'); ok(sent.length===k10,'شكر تاني على طول: مفيش ردّ على ردّ');
 await rcOnText(2001,'تمام'); await rcOnText(2001,'👍🙏'); ok(sent.length===k10,'«تمام» وإيموجي: مفيش رد');
 store.telegramChats['2001']={}; await rcOnText(2001,'صباح الخير'); ok(/صباح النور/.test(last().text),'«صباح الخير»: صباح النور');
 await rcOnText(2001,'السلام عليكم'); ok(/وعليكم السلام/.test(last().text)&&!cbs(last()).length,'سلام تاني: بيترد عليه، من غير ما القايمة تتكرر');
 await rcOnText(2001,'ازاي احول القسط؟ انستاباي ولا فودافون'); ok(/طرق الدفع/.test(last().text)&&cbs(last()).includes('rcpt_any'),'سأل عن طرق الدفع: الطرق وزرار الإيصال');
 store.telegramChats['2001']={}; await rcOnText(2001,'السلام عليكم انا عندي مشكلة في الدخول على المنصة من امبارح'); ok(/وعليكم السلام/.test(last().text)&&/وصلت رسالتك/.test(last().text),'سلام ومعاه سؤال: سلام و«وصلت رسالتك»');
 ok(await rcOnText(999,'السلام عليكم')===false,'زائر بيسلّم: القائمة الرئيسية زي ما هي');
 // كل الأزرار تحت حد تليجرام (٦٤ بايت)
 const all=sent.flatMap(m=>cbs(m)); ok(all.every(c=>Buffer.byteLength(c)<=64),'كل بيانات الأزرار أقل من ٦٤ بايت');
 console.log(`\nكل الاختبارات عدّت (${n})`);
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
