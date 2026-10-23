// ==================== إيصالات الأقساط والتذكير التلقائي (المرحلة ٨: كل السيناريوهات) ====================
// بيتحط في telegram-bot-server.js قبل function smartRound، وبيستعمل اللي موجود هناك:
//   app, db, admin, bot, fetch, getPaymentDetails, requireAdmin, messageTemplates, handleUnifiedHelpRequest
//
// نقاط الربط جوه /webhook (سطر واحد في كل واحدة):
//   ١) المرفقات العادية، بعد logMessage:        if (await rcOnAttachment(chatId, result, msg)) return res.sendStatus(200);
//   ٢) المرفقات في وضع المساعدة، بعد logMessage:  await rcOnAttachment(chatId, result, msg, { helpMode: true });
//   ٣) الرسايل النصية، قبل «أي رسالة أخرى»:       if (await rcOnText(chatId, text)) return res.sendStatus(200);
//   ٤) الأزرار، بعد تحليل الزرار:                 if (action === 'rcpt') { await rcOnCallback(chatId, callbackQuery, params); return res.sendStatus(200); }
//
// الدوال:
//   /installments/remind       (الأدمن)            تذكير بقسط واحد
//   /installments/run          (الأدمن أو المجدول)  التذكير التلقائي: قبل الميعاد بـ٣ أيام، يوم الميعاد، بعده بـ٣ أيام، وبعده بـ١٠ أيام
//   /installments/paid-notify  (الأدمن)            بعد تسجيل دفعة: رسالة تأكيد واحدة للطالب، وبيقفل الإيصالات وطلبات التأجيل بتاعتها
//   /installments/postpone     (الأدمن)            موافقة أو رفض طلب تأجيل قسط
//   /receipts/decision         (الأدمن)            اتسجل / اترفض / مش إيصال
//
// كل طلب بيستنى قرار الأدمن بيتسجل في receipts/{id}:
//   kind: installment (إيصال) | postpone (طلب تأجيل)
//   { chatId, bookingId, idx, installmentNumber, amountExpected, courseName, studentName,
//     url, attachmentType, fileName, caption, text, fileUniqueIds[], extra[],
//     source: button|auto|choice|unknown|help|text, status: pending|approved|rejected|dismissed,
//     candidates?, studentSaysWrong?, requestedDue?, days?, createdAt, createdMs, decidedAt?, reason? }

const RC_TZ = 'Africa/Cairo';
const RC_DAY = 86400000;
const RC_INTENT_MS = 48 * 3600 * 1000;      // زرار «ابعت إيصال القسط» صالح ٤٨ ساعة
const RC_MERGE_MS = 30 * 60 * 1000;         // صور ورا بعض خلال نص ساعة = نفس الإيصال
const RC_PANEL_MS = 6 * 3600 * 1000;        // قايمة الطالب بتظهر مرة كل ٦ ساعات بالكتير

function rcEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function rcNum(v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (v == null) return 0;
    const s = String(v).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[٬,\s]/g, '').replace(/٫/g, '.');
    const m = s.match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
}
function rcMoney(n) { return Math.round(rcNum(n)).toLocaleString('ar-EG') + ' ج.م'; }
function rcMs(v) {
    if (!v) return 0;
    if (typeof v === 'number') return v;
    if (typeof v.toMillis === 'function') return v.toMillis();
    const t = Date.parse(v);
    return isNaN(t) ? 0 : t;
}
function rcCairoDay(d) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: RC_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d || new Date());
    const g = t => p.find(x => x.type === t).value;
    return Date.parse(g('year') + '-' + g('month') + '-' + g('day') + 'T00:00:00Z');
}
// موجب = عدّى ميعاده بكام يوم، سالب = فاضل كام يوم
function rcDaysLate(dueIso, now) {
    if (!dueIso) return null;
    const d = new Date(dueIso);
    if (isNaN(d)) return null;
    return Math.round((rcCairoDay(now || new Date()) - rcCairoDay(d)) / RC_DAY);
}
function rcDateText(dueIso) {
    const d = new Date(dueIso);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat('ar-EG', { timeZone: RC_TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}
// يوم في القاهرة (الضهر) بعد كام يوم من تاريخ معيّن
function rcDayPlus(baseIso, days) {
    const base = Math.max(rcCairoDay(new Date()), baseIso ? rcCairoDay(new Date(baseIso)) : 0);
    return new Date(base + days * RC_DAY + 9 * 3600 * 1000).toISOString();
}
const RC_ORD = ['الأولى', 'التاني', 'التالت', 'الرابع', 'الخامس', 'السادس', 'السابع', 'التامن', 'التاسع', 'العاشر', 'الحداشر', 'الاتناشر'];
function rcInstName(inst, idx) {
    const n = inst && inst.installmentNumber != null ? Number(inst.installmentNumber) : idx;
    if (n === 0) return 'الدفعة الأولى';
    return 'القسط ' + (RC_ORD[n] || ('رقم ' + n.toLocaleString('ar-EG')));
}
function rcPaidOn(inst) {
    if (!inst) return 0;
    if (typeof inst.paidSoFar === 'number') return inst.paidSoFar;
    if (inst.status === 'paid') return rcNum(inst.amount);
    if (inst.status === 'partial') return Math.min(rcNum(inst.actualPaidAmount), rcNum(inst.amount));
    return 0;
}
function rcLeft(inst) { return inst && inst.status !== 'paid' ? Math.max(0, rcNum(inst.amount) - rcPaidOn(inst)) : 0; }
function rcFirstName(b) { return String((b && b.customer && b.customer.name) || '').trim().split(/\s+/)[0] || ''; }
function rcSchedule(b) { const s = b && b.paymentDetails && b.paymentDetails.installmentSchedule; return Array.isArray(s) ? s : []; }
function rcRef(b) { return db.collection(b._col || 'tempBookings').doc(b.id); }
function rcIsBlockedError(e) {
    const code = e && ((e.response && (e.response.statusCode || e.response.status)) || e.code);
    return code === 403 || /blocked|deactivated|chat not found|403/i.test(String((e && e.message) || ''));
}

// كل حجوزات المحادثة (الرقم ممكن يكون متسجل نص أو رقم). tempBookings هو الأساس، والطالب اللي اتحوّل بس بنجيبه من individualStudents
async function rcBookingsForChat(chatId) {
    const ids = [String(chatId)];
    if (/^-?\d+$/.test(String(chatId))) ids.push(Number(chatId));
    const [tb, st] = await Promise.all([
        db.collection('tempBookings').where('telegramChatId', 'in', ids).get(),
        db.collection('individualStudents').where('telegramChatId', 'in', ids).get().catch(() => ({ forEach() {} }))
    ]);
    const out = [], seen = {};
    tb.forEach(d => { seen[d.id] = 1; out.push({ id: d.id, _col: 'tempBookings', ...d.data() }); });
    st.forEach(d => { if (!seen[d.id]) out.push({ id: d.id, _col: 'individualStudents', ...d.data() }); });
    return out;
}
async function rcGetBooking(id) {
    if (!id) return null;
    let s = await db.collection('tempBookings').doc(String(id)).get();
    if (s.exists) return { id: s.id, _col: 'tempBookings', ...s.data() };
    s = await db.collection('individualStudents').doc(String(id)).get();
    return s.exists ? { id: s.id, _col: 'individualStudents', ...s.data() } : null;
}
// حجز أقساط شغال فعلًا: الدفعة الأولى اتأكدت (مش لسه في رحلة الحجز)
function rcInstallmentLive(b) {
    if (!b || b.status === 'cancelled' || b.archivedAsTest) return false;
    const pd = b.paymentDetails || {};
    const s = rcSchedule(b);
    if (!s.length || (pd.type && pd.type !== 'installment')) return false;
    return !!(b.paymentConfirmed || ['paid', 'transferred'].includes(b.status) || (s[0] && s[0].status === 'paid') || rcNum(pd.paidAmount) > 0);
}
// أقرب قسط مفتوح في الحجز (أقدم واحد لسه ما اتدفعش)
function rcOpenInstallment(b) {
    if (!rcInstallmentLive(b)) return null;
    const s = rcSchedule(b);
    for (let i = 0; i < s.length; i++) {
        if (s[i] && s[i].status !== 'paid' && rcLeft(s[i]) > 0) return { idx: i, inst: s[i] };
    }
    return null;
}
function rcOpenList(bookings) {
    return bookings.map(b => ({ b, o: rcOpenInstallment(b) })).filter(x => x.o)
        .sort((x, y) => new Date(x.o.inst.dueDate) - new Date(y.o.inst.dueDate));
}
function rcAwaitingFirstReceipt(b) {
    return ['pending', 'confirmed'].includes(b.status) && b.automationWorkflow && b.automationWorkflow.currentState === 'awaiting_receipt';
}
function rcIsStudent(b) {
    return !!b && b.status !== 'cancelled' && !b.archivedAsTest && (b.paymentConfirmed || ['paid', 'transferred'].includes(b.status) || rcInstallmentLive(b));
}
async function rcPendingForChat(chatId) {
    const snap = await db.collection('receipts').where('chatId', '==', String(chatId)).where('status', '==', 'pending').get();
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    return out;
}
async function rcSyncPendingFlag(chatId) {
    const still = await db.collection('receipts').where('chatId', '==', String(chatId)).where('status', '==', 'pending').limit(1).get();
    await db.collection('telegramChats').doc(String(chatId)).set({ hasPendingReceipt: !still.empty }, { merge: true });
}

// صورة أو PDF (أو ملف صورة) بس هم اللي ينفعوا إيصال
function rcIsReceiptFile(result, msg) {
    if (!result) return false;
    if (result.attachmentType === 'photo') return true;
    if (result.attachmentType === 'document') {
        const mt = String((msg && msg.document && msg.document.mime_type) || '').toLowerCase();
        const fn = String(result.fileName || '').toLowerCase();
        return /^image\//.test(mt) || mt === 'application/pdf' || /\.(pdf|jpe?g|png|webp|heic)$/.test(fn);
    }
    return false;
}
function rcUniqueId(msg) {
    if (!msg) return null;
    if (Array.isArray(msg.photo) && msg.photo.length) return msg.photo[msg.photo.length - 1].file_unique_id || null;
    if (msg.document) return msg.document.file_unique_id || null;
    return null;
}

async function rcSend(chatId, text, keyboard) {
    const opts = { parse_mode: 'HTML', disable_web_page_preview: true };
    if (keyboard) opts.reply_markup = { inline_keyboard: keyboard };
    try {
        await bot.sendMessage(chatId, text, opts);     // البوت بيسجّل رسايله في المحادثة لوحده
        return true;
    } catch (e) {
        if (rcIsBlockedError(e)) {
            await db.collection('telegramChats').doc(String(chatId)).set({ botBlocked: true, botBlockedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
            const err = new Error('blocked'); err.blocked = true; throw err;
        }
        throw e;
    }
}
function rcReminderKeyboard(bookingId, idx) {
    return [
        [{ text: '📸 ابعت إيصال القسط', callback_data: `rcpt_send_${bookingId}_${idx}` }],
        [{ text: '💳 أدفع إزاي؟', callback_data: `rcpt_how_${bookingId}_${idx}` }, { text: '📊 حسابي', callback_data: 'rcpt_status' }],
        [{ text: '🗓️ محتاج أأجل', callback_data: `rcpt_delay_${bookingId}_${idx}` }, { text: '🙋 محتاج مساعدة', callback_data: `support_${bookingId}` }]
    ];
}
function rcStudentKeyboard(bookings) {
    const anyId = (bookings.find(rcIsStudent) || bookings[0] || {}).id;
    const kb = [];
    if (rcOpenList(bookings).length) kb.push([{ text: '📸 ابعت إيصال قسط', callback_data: 'rcpt_any' }, { text: '🗓️ محتاج أأجل', callback_data: 'rcpt_delayany' }]);
    kb.push([{ text: '📊 حسابي', callback_data: 'rcpt_status' }].concat(anyId ? [{ text: '🙋 محتاج مساعدة', callback_data: `support_${anyId}` }] : []));
    kb.push([{ text: '🏠 القائمة الرئيسية', callback_data: 'rcpt_menu' }]);
    return kb;
}

function rcReminderText(b, idx, stage) {
    const inst = rcSchedule(b)[idx];
    const name = rcFirstName(b);
    const late = rcDaysLate(inst.dueDate);
    const what = `<b>${rcEsc(rcInstName(inst, idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b>`;
    const amount = `<b>${rcMoney(rcLeft(inst))}</b>`;
    const days = n => `${n.toLocaleString('ar-EG')} ${n === 1 ? 'يوم' : n <= 10 ? 'أيام' : 'يوم'}`;
    let line;
    if (stage === 'late10') {
        line = `${what} عدّى ميعاده من ${days(late)}، والمبلغ ${amount}.\nلو فيه ظرف، دوس «محتاج أأجل» واختار الميعاد اللي يناسبك، أو كلّمنا ونرتّبها سوا.`;
    } else if (stage === 'late3' || (stage === 'manual' && late > 0)) {
        line = `${what} عدّى ميعاده من ${days(late)}، والمبلغ ${amount}.\nلو حوّلت خلاص، ابعت صورة الإيصال من الزرار تحت. ولو فيه أي ظرف، كلّمنا ونرتّبها سوا.`;
    } else if (stage === 'due' || late === 0) {
        line = `النهارده ميعاد ${what}، والمبلغ ${amount}.`;
    } else {
        line = `${what} ميعاده <b>${rcEsc(rcDateText(inst.dueDate))}</b>، والمبلغ ${amount}.`;
    }
    const lateNow = stage === 'late3' || stage === 'late10' || (stage === 'manual' && late > 0);
    return `أهلًا${name ? ' ' + rcEsc(name) : ''} 🌿\n${line}` + (lateNow ? '' : '\n\nلما تحوّل، دوس «ابعت إيصال القسط» وابعت صورة الإيصال هنا.');
}
async function rcRemind(b, idx, stage) {
    const chatId = b.telegramChatId;
    if (!chatId) return { ok: false, error: 'no-telegram' };
    try {
        await rcSend(chatId, rcReminderText(b, idx, stage), rcReminderKeyboard(b.id, idx));
    } catch (e) {
        if (e.blocked) return { ok: false, error: 'blocked' };
        throw e;
    }
    await rcRef(b).update({
        [`installmentReminders.${idx}_${stage === 'manual' ? 'manual_' + Date.now() : stage}`]: admin.firestore.FieldValue.serverTimestamp()
    });
    return { ok: true };
}

// ---------- حفظ الإيصال ----------
async function rcSaveReceipt(chatId, result, msg, data) {
    const uid = rcUniqueId(msg);
    const ref = await db.collection('receipts').add({
        chatId: String(chatId), kind: 'installment', status: 'pending',
        url: (result && result.permanentUrl) || null, attachmentType: (result && result.attachmentType) || null,
        fileName: (result && result.fileName) || null, caption: (result && result.caption) || null, fileId: (result && result.fileId) || null,
        fileUniqueIds: uid ? [uid] : [], extra: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(), createdMs: Date.now(), ...data
    });
    await db.collection('telegramChats').doc(String(chatId)).set({
        lastReceiptAt: admin.firestore.FieldValue.serverTimestamp(), hasPendingReceipt: true
    }, { merge: true });
    return ref.id;
}
function rcReceiptFields(b, idx) {
    const inst = rcSchedule(b)[idx];
    return {
        bookingId: b.id, idx, installmentNumber: inst.installmentNumber != null ? inst.installmentNumber : idx,
        amountExpected: rcLeft(inst), courseName: b.courseName || null,
        studentName: (b.customer && b.customer.name) || null, dueDate: inst.dueDate || null
    };
}
function rcCandidates(open, skip) {
    return open.filter(x => !skip || !(x.b.id === skip.bookingId && x.o.idx === skip.idx)).slice(0, 6)
        .map(x => ({ bookingId: x.b.id, idx: x.o.idx, courseName: x.b.courseName || '', amount: rcLeft(x.o.inst), label: rcInstName(x.o.inst, x.o.idx) }));
}
// كل الأقساط المفتوحة (مش أول واحد بس) علشان «مش ده القسط»
function rcAllOpen(bookings) {
    const out = [];
    bookings.filter(rcInstallmentLive).forEach(b => rcSchedule(b).forEach((inst, idx) => {
        if (inst && inst.status !== 'paid' && rcLeft(inst) > 0) out.push({ b, o: { idx, inst } });
    }));
    return out.sort((x, y) => new Date(x.o.inst.dueDate) - new Date(y.o.inst.dueDate));
}

// بيرجّع true لو المرفق اتعامل معاه هنا، false علشان الكود القديم يكمّل (إيصال الدفعة الأولى، أو زائر من غير حجز)
// في وضع المساعدة: مفيش أي رد للطالب (الأدمن في المحادثة)، بس لو شكله إيصال قسط بيظهر للأدمن ككارت يقرر فيه
async function rcOnAttachment(chatId, result, msg, opts) {
    const help = !!(opts && opts.helpMode);
    try {
        if (!result || !result.success) return false;
        const isRc = rcIsReceiptFile(result, msg);
        const chatRef = db.collection('telegramChats').doc(String(chatId));
        const chatSnap = await chatRef.get();
        const intent = chatSnap.exists ? chatSnap.data().pendingReceipt : null;
        const bookings = await rcBookingsForChat(chatId);
        const say = async (t, kb) => { if (!help) await rcSend(chatId, t, kb); };

        if (!isRc) {
            // صوت أو فيديو: مش إيصال. الطالب المسجل ياخد رد هادي بدل رسالة «احجز دورة»
            if (help || !bookings.some(rcIsStudent) || bookings.some(b => ['pending', 'pending_review', 'confirmed'].includes(b.status))) return false;
            await say('وصلت ✅\nهنشوفها ونرد عليك هنا.');
            return true;
        }

        // نفس الصورة اتبعتت قبل كده
        const uid = rcUniqueId(msg);
        if (uid) {
            const dup = await db.collection('receipts').where('fileUniqueIds', 'array-contains', uid).get();
            const same = dup.docs.map(d => d.data()).find(d => String(d.chatId) === String(chatId));
            if (same) {
                await say(same.status === 'approved' ? 'الإيصال ده وصلنا قبل كده، واتسجل ✅'
                    : same.status === 'pending' ? 'الإيصال ده وصلنا قبل كده ✅ وهو عندنا في المراجعة.'
                    : 'الإيصال ده وصلنا قبل كده. لو فيه إيصال تاني، ابعته هنا.');
                return true;
            }
        }

        // صورة تانية ورا الأولى بشوية: نفس الإيصال (صفحتين، أو لقطتين للتحويل)
        const pend = (await rcPendingForChat(chatId)).filter(r => r.kind !== 'postpone');
        const recent = pend.filter(r => Date.now() - (r.createdMs || rcMs(r.createdAt)) < RC_MERGE_MS)
            .sort((a, b) => (b.createdMs || 0) - (a.createdMs || 0))[0];
        const intentOk = intent && intent.bookingId && Date.now() - (intent.at || 0) < RC_INTENT_MS;
        if (recent && (!intentOk || (recent.bookingId === intent.bookingId && recent.idx === intent.idx))) {
            await db.collection('receipts').doc(recent.id).update({
                extra: admin.firestore.FieldValue.arrayUnion({ url: result.permanentUrl || null, attachmentType: result.attachmentType || null, fileName: result.fileName || null, caption: result.caption || null, at: Date.now() }),
                ...(uid ? { fileUniqueIds: admin.firestore.FieldValue.arrayUnion(uid) } : {})
            });
            if (intentOk) await chatRef.set({ pendingReceipt: admin.firestore.FieldValue.delete() }, { merge: true });
            await say('وصلت ✅ واتضافت لنفس الإيصال.');
            return true;
        }

        // ١) الطالب داس «ابعت إيصال القسط»
        if (intentOk) {
            const b = bookings.find(x => x.id === intent.bookingId);
            const inst = b && rcSchedule(b)[intent.idx];
            await chatRef.set({ pendingReceipt: admin.firestore.FieldValue.delete() }, { merge: true });
            if (b && inst && rcLeft(inst) > 0) {
                const rid = await rcSaveReceipt(chatId, result, msg, { ...rcReceiptFields(b, intent.idx), source: help ? 'help' : 'button' });
                if (!help) await rcAck(chatId, b, intent.idx, rid, false);
                return true;
            }
        }
        if (help) {
            // في المساعدة: كارت للأدمن بس لو فيه أقساط مفتوحة، ومن غير ما نقاطع المحادثة
            const open = rcOpenList(bookings);
            if (!open.length) return false;
            if (open.length === 1) await rcSaveReceipt(chatId, result, msg, { ...rcReceiptFields(open[0].b, open[0].o.idx), source: 'help' });
            else await rcSaveReceipt(chatId, result, msg, { bookingId: null, idx: null, source: 'help', candidates: rcCandidates(open), studentName: (open[0].b.customer && open[0].b.customer.name) || null });
            return false;
        }

        // ٢) حجز مستني إيصال الدفعة الأولى: الكود القديم زي ما هو
        if (bookings.some(rcAwaitingFirstReceipt)) return false;

        // ٣ و ٤) أقساط مفتوحة
        const open = rcOpenList(bookings);
        if (open.length === 1) {
            const { b, o } = open[0];
            const rid = await rcSaveReceipt(chatId, result, msg, { ...rcReceiptFields(b, o.idx), source: 'auto' });
            await rcAck(chatId, b, o.idx, rid, true);
            return true;
        }
        if (open.length > 1) {
            const cands = rcCandidates(open);
            const rid = await rcSaveReceipt(chatId, result, msg, {
                bookingId: null, idx: null, source: 'choice', candidates: cands,
                studentName: (open[0].b.customer && open[0].b.customer.name) || null
            });
            await rcSend(chatId, 'وصلت الصورة ✅\nالإيصال ده لأنهي كورس؟',
                cands.map((c, i) => [{ text: `${c.courseName || 'كورس'} · ${rcMoney(c.amount)}`, callback_data: `rcpt_pick_${rid}_${i}` }])
                    .concat([[{ text: 'دي مش إيصال', callback_data: `rcpt_notrc_${rid}` }]]));
            return true;
        }
        // زائر، أو حجز لسه في أوله: الكود القديم يرد زي ما هو
        if (!bookings.length || bookings.some(b => ['pending', 'pending_review', 'confirmed'].includes(b.status) && !rcIsStudent(b))) return false;

        // ٥) طالب مسجل ومفيش قسط مفتوح: نسجّلها ونراجعها
        const anyB = bookings.find(rcIsStudent) || bookings[0];
        const rid = await rcSaveReceipt(chatId, result, msg, { bookingId: anyB.id, idx: null, source: 'unknown', courseName: anyB.courseName || null, studentName: anyB.customer ? anyB.customer.name : null });
        await rcSend(chatId, 'وصلت الصورة ✅\nهنراجعها ونرد عليك هنا.', [[{ text: 'دي مش إيصال', callback_data: `rcpt_notrc_${rid}` }]]);
        return true;
    } catch (e) {
        console.error('rcOnAttachment:', e);
        return false;
    }
}

async function rcAck(chatId, b, idx, receiptId, guessed) {
    const inst = rcSchedule(b)[idx];
    const text = `وصل إيصال <b>${rcEsc(rcInstName(inst, idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b> (${rcMoney(rcLeft(inst))}) ✅\nهنراجعه ونبعتلك التأكيد هنا.`;
    await rcSend(chatId, text, guessed ? [[{ text: 'مش ده القسط', callback_data: `rcpt_wrong_${receiptId}` }, { text: 'دي مش إيصال', callback_data: `rcpt_notrc_${receiptId}` }]] : null);
}

// ---------- الرسايل النصية ----------
const RC_SMALL_MS = 30 * 60 * 1000;         // رد التحية أو الشكر مرة كل نص ساعة بالكتير
// النص هنا متنضّف: أ إ آ ← ا، ى ← ي، ة ← ه، ومن غير تشكيل
function rcSmallTalk(t) {
    const x = String(t).trim();
    if (!x) return null;
    if (/^[\s\p{Extended_Pictographic}\u200d\ufe0f!.،,]+$/u.test(x)) return 'ack';
    if (/^(تمام|تمام تمام|اوك|اوكي|ok|okay|حاضر|ماشي|طيب|اه|ايوه|ايوا|خلاص|مفهوم|فهمت|تم)[\s!.،]*$/i.test(x)) return 'ack';
    if (/(شكرا|متشكر|متشكرين|تسلم|تسلمي|تسلموا|ربنا يكرمك|ربنا يكرمكم|جزاك الله|جزاكم الله|الف شكر|ميرسي|thanks|thank you)/i.test(x)) return 'thanks';
    if (/(السلام عليكم|سلام عليكم|السلام عليكو)/.test(x)) return 'salam';
    if (/صباح (الخير|النور|الفل)/.test(x)) return 'morning';
    if (/مساء (الخير|النور|الفل)/.test(x)) return 'evening';
    if (/^(اهلا|اهلين|هاي|هلا|مرحبا|ازيك|ازيكم|عامل ايه|عاملين ايه|hi|hello)(\s|$|!)/i.test(x)) return 'hello';
    return null;
}
// بيرجّع true لو الرسالة اتعامل معاها هنا (ومش هتطلع القائمة الرئيسية للطالب المسجل)
async function rcOnText(chatId, text) {
    try {
        if (!text || String(text).startsWith('/')) return false;
        const chatRef = db.collection('telegramChats').doc(String(chatId));
        const chatSnap = await chatRef.get();
        const cd = chatSnap.exists ? chatSnap.data() : {};
        const intent = cd.pendingReceipt;
        const bookings = await rcBookingsForChat(chatId);

        // داس «ابعت إيصال القسط» وكتب بدل ما يبعت صورة
        if (intent && intent.bookingId && Date.now() - (intent.at || 0) < RC_INTENT_MS) {
            const digits = (String(text).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).match(/\d/g) || []).length;
            const b = bookings.find(x => x.id === intent.bookingId);
            const inst = b && rcSchedule(b)[intent.idx];
            if (digits >= 6 && b && inst && rcLeft(inst) > 0) {
                await rcSaveReceipt(chatId, null, null, { ...rcReceiptFields(b, intent.idx), source: 'text', text: String(text).slice(0, 500) });
                await chatRef.set({ pendingReceipt: admin.firestore.FieldValue.delete() }, { merge: true });
                await rcSend(chatId, `وصلت بيانات تحويل <b>${rcEsc(rcInstName(inst, intent.idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b> ✅\nهنراجعها ونبعتلك التأكيد هنا. ولو معاك صورة الإيصال، ابعتها كمان.`);
                return true;
            }
            if (!intent.hinted) {
                await chatRef.set({ pendingReceipt: { ...intent, hinted: true } }, { merge: true });
                await rcSend(chatId, 'مستنيين صورة الإيصال 📎\nلو مش معاك صورة، اكتب رقم العملية والمبلغ في رسالة واحدة.', [[{ text: 'إلغاء', callback_data: 'rcpt_cancel' }]]);
                return true;
            }
        }

        if (!bookings.some(rcIsStudent)) return false;          // زائر: القائمة الرئيسية زي ما هي

        // الطالب كتب طلبه بدل ما يدوس الزرار
        const t = ' ' + String(text).replace(/[\u064B-\u0652\u0640]/g, '').replace(/[إأآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim() + ' ';
        if (/\s(ا?اجل|اجله|اجلها|تاجيل|اتاخر في القسط|مش هقدر ادفع|مش هعرف ادفع)/.test(t)) {
            await rcStartDelay(chatId, bookings);
            return true;
        }
        if (/(ابعت|ارسل|ابعتلكم|هبعت|عايز ابعت|عاوز ابعت)\s*(ال)?ايصال|\s(حولت|دفعت|سددت|حولتلكم|دفعتلكم)\s/.test(t)) {
            await rcStartAny(chatId, bookings);
            return true;
        }
        if (/(حسابي|فاضل|الباقي|باقي عليا|متبقي|المتبقي|اقساطي|كام قسط|القسط الجاي|ميعاد القسط)/.test(t)) {
            await rcSendStatus(chatId, bookings);
            return true;
        }
        // طرق الدفع
        if (/(طرق الدفع|طريقه الدفع|ادفع ازاي|احول ازاي|احول علي ايه|رقم فودافون|فودافون كاش|انستاباي|انستا باي|رقم الحساب|حساب البنك)/.test(t)) {
            const pay = ['vodafone', 'instapay', 'bank'].map(m => getPaymentDetails(m)).join('\n');
            const open = rcOpenList(bookings);
            await bot.sendMessage(chatId, `*طرق الدفع*\n${pay}\nبعد التحويل ابعت صورة الإيصال هنا.`, {
                parse_mode: 'Markdown', disable_web_page_preview: true,
                reply_markup: open.length ? { inline_keyboard: [[{ text: '📸 ابعت إيصال قسط', callback_data: 'rcpt_any' }]] } : undefined
            });
            return true;
        }
        // كلام صغير: تحية، شكر، «تمام». الرد بشري وقصير، ومن غير ما يبقى ردّ على ردّ
        const small = rcSmallTalk(t);
        const words = t.trim().split(/\s+/).filter(Boolean).length;
        const name = rcFirstName(bookings.find(rcIsStudent));
        const panelDue = Date.now() - rcMs(cd.rcPanelAt) > RC_PANEL_MS;
        if (small === 'ack') return true;                                    // «تمام» و«ماشي» و👍: مفيش رد
        if (small && words <= 6) {
            if (Date.now() - rcMs((cd.rcSmall || {})[small]) < RC_SMALL_MS && small !== 'salam') return true;
            const reply = small === 'thanks' ? 'العفو 🌿 ربنا يبارك فيك.'
                : small === 'salam' ? `وعليكم السلام ورحمة الله${name ? ' يا ' + rcEsc(name) : ''} 🌿`
                : small === 'morning' ? `صباح النور${name ? ' يا ' + rcEsc(name) : ''} 🌿`
                : small === 'evening' ? `مساء النور${name ? ' يا ' + rcEsc(name) : ''} 🌿`
                : `أهلًا بيك${name ? ' يا ' + rcEsc(name) : ''} 🌿`;
            const upd = { rcSmall: { [small]: Date.now() } };
            if (small !== 'thanks' && panelDue) upd.rcPanelAt = Date.now();
            await chatRef.set(upd, { merge: true });
            await rcSend(chatId, small === 'thanks' ? reply : reply + '\nتحت أمرك، اكتب محتاج إيه.', small !== 'thanks' && panelDue ? rcStudentKeyboard(bookings) : null);
            return true;
        }
        // طالب مسجل: رد هادي مرة كل كام ساعة، والأدمن بيشوف الرسالة في المكتب
        if (panelDue) {
            await chatRef.set({ rcPanelAt: Date.now() }, { merge: true });
            const hi = small === 'salam' ? `وعليكم السلام${name ? ' يا ' + rcEsc(name) : ''} 🌿` : `أهلًا${name ? ' ' + rcEsc(name) : ''} 🌿`;
            await rcSend(chatId, `${hi}\nوصلت رسالتك، وهنرد عليك هنا.`, rcStudentKeyboard(bookings));
        }
        return true;
    } catch (e) {
        console.error('rcOnText:', e);
        return false;
    }
}

// ---------- «حسابي» ----------
// كورس واحد = سطر واحد، حتى لو الطالب له أكتر من حجز في نفس الكورس (اتحجز تاني، أو حجز قديم)
function rcStudentCourses(bookings) {
    const groups = new Map();
    bookings.filter(rcIsStudent).forEach(b => {
        const k = String(b.courseName || b.courseId || b.id).trim().replace(/\s+/g, ' ');
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(b);
    });
    const t = b => rcMs(b.timestamp) || rcMs(b.createdAt) || 0;
    const out = [];
    groups.forEach(list => {
        const open = rcOpenList(list)[0];
        const pick = open ? open.b : (list.filter(rcInstallmentLive).sort((a, b) => t(b) - t(a))[0] || list.sort((a, b) => t(b) - t(a))[0]);
        out.push({ b: pick, ids: list.map(x => x.id), open: !!open });
    });
    return out.sort((x, y) => (y.open - x.open));
}
async function rcStatusText(chatId, bookings) {
    const pend = await rcPendingForChat(chatId);
    const blocks = [];
    const courses = rcStudentCourses(bookings);
    courses.slice(0, 10).forEach(({ b, ids }) => {
        const pd = b.paymentDetails || {};
        const s = rcSchedule(b);
        let h = `<b>${rcEsc(b.courseName || 'كورس')}</b>`;
        if (!s.length || !rcInstallmentLive(b)) { blocks.push(h + '\nاتدفع كامل ✅'); return; }
        const total = rcNum(pd.totalAmount) || s.reduce((a, x) => a + rcNum(x.amount), 0);
        const paid = s.reduce((a, x) => a + rcPaidOn(x), 0);
        h += `\nاتدفع ${rcMoney(paid)} من ${rcMoney(total)}`;
        pend.filter(r => ids.includes(r.bookingId)).forEach(r => {
            const inst = r.idx != null ? s[r.idx] : null;
            h += r.kind === 'postpone'
                ? `\n🗓️ طلب تأجيل ${rcEsc(rcInstName(inst, r.idx))} في المراجعة`
                : `\n📸 إيصال ${inst ? rcEsc(rcInstName(inst, r.idx)) : ''} وصل وهو في المراجعة`;
        });
        const o = rcOpenInstallment(b);
        if (!o) h += '\nاتدفع كامل ✅';
        else {
            const late = rcDaysLate(o.inst.dueDate);
            h += `\nاللي عليك دلوقتي: ${rcEsc(rcInstName(o.inst, o.idx))} · ${rcMoney(rcLeft(o.inst))}`;
            h += late > 0 ? ` · عدّى ميعاده من ${late.toLocaleString('ar-EG')} ${late === 1 ? 'يوم' : 'أيام'}` : late === 0 ? ' · ميعاده النهارده' : o.inst.dueDate ? ` · ${rcEsc(rcDateText(o.inst.dueDate))}` : '';
        }
        blocks.push(h);
    });
    if (!blocks.length) return 'مفيش كورسات مسجلة باسمك هنا لسه.';
    return '📊 <b>حسابك</b>\n\n' + blocks.join('\n\n') + (courses.length > 10 ? `\n\nو${(courses.length - 10).toLocaleString('ar-EG')} كورسات تانية اتدفعت كامل ✅` : '');
}
async function rcSendStatus(chatId, bookings) {
    const text = await rcStatusText(chatId, bookings);
    const kb = rcOpenList(bookings).length ? [[{ text: '📸 ابعت إيصال قسط', callback_data: 'rcpt_any' }, { text: '🗓️ محتاج أأجل', callback_data: 'rcpt_delayany' }]] : null;
    await rcSend(chatId, text, kb);
}
// «ابعت إيصال قسط» من غير ما نعرف أنهي قسط: لو واحد بس نستناه، لو أكتر نسأل
async function rcStartAny(chatId, bookings) {
    const open = rcOpenList(bookings);
    if (!open.length) { await rcSend(chatId, 'مفيش أقساط مستنية عندك دلوقتي ✅\nلو بعتّ صورة إيصال، هنراجعها ونرد عليك هنا.'); return; }
    if (open.length === 1) {
        const { b, o } = open[0];
        await db.collection('telegramChats').doc(String(chatId)).set({ pendingReceipt: { bookingId: b.id, idx: o.idx, at: Date.now() } }, { merge: true });
        await rcSend(chatId, `تمام. ابعت صورة إيصال <b>${rcEsc(rcInstName(o.inst, o.idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b> (${rcMoney(rcLeft(o.inst))}) هنا دلوقتي 📎`, [[{ text: 'إلغاء', callback_data: 'rcpt_cancel' }]]);
        return;
    }
    await rcSend(chatId, 'الإيصال ده لأنهي كورس؟', open.slice(0, 6).map(x => [{ text: `${x.b.courseName || 'كورس'} · ${rcInstName(x.o.inst, x.o.idx)} · ${rcMoney(rcLeft(x.o.inst))}`, callback_data: `rcpt_send_${x.b.id}_${x.o.idx}` }]));
}
// «محتاج أأجل» من غير ما نعرف أنهي قسط
function rcDelayOptions(b, idx) {
    const inst = rcSchedule(b)[idx];
    const opt = d => ({ text: `لحد ${rcDateText(rcDayPlus(inst.dueDate, d))}`, callback_data: `rcpt_dly_${b.id}_${idx}_${d}` });
    return {
        text: `تحب نأجل <b>${rcEsc(rcInstName(inst, idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b> (${rcMoney(rcLeft(inst))}) لحد إمتى؟`,
        kb: [[opt(7)], [opt(14)], [opt(30)], [{ text: '✍️ هكتب الظروف', callback_data: `support_${b.id}` }]]
    };
}
async function rcStartDelay(chatId, bookings) {
    const open = rcOpenList(bookings);
    if (!open.length) { await rcSend(chatId, 'مفيش أقساط عليك دلوقتي محتاجة تأجيل ✅'); return; }
    if (open.length === 1) { const o = rcDelayOptions(open[0].b, open[0].o.idx); await rcSend(chatId, o.text, o.kb); return; }
    await rcSend(chatId, 'تحب تأجل قسط أنهي كورس؟', open.slice(0, 6).map(x => [{ text: `${x.b.courseName || 'كورس'} · ${rcInstName(x.o.inst, x.o.idx)} · ${rcMoney(rcLeft(x.o.inst))}`, callback_data: `rcpt_delay_${x.b.id}_${x.o.idx}` }]));
}

// ---------- الأزرار ----------
async function rcOnCallback(chatId, cq, params) {
    const kind = params[0];
    const answer = (text) => bot.answerCallbackQuery(cq.id, text ? { text } : {}).catch(() => {});
    const chatRef = db.collection('telegramChats').doc(String(chatId));
    try {
        if (kind === 'send') {
            const bookingId = params.slice(1, -1).join('_'), idx = parseInt(params[params.length - 1], 10);
            const b = await rcGetBooking(bookingId);
            const inst = b && rcSchedule(b)[idx];
            if (!b || String(b.telegramChatId) !== String(chatId)) { await answer('الزرار ده مش متاح'); return; }
            if (!inst || rcLeft(inst) <= 0) {
                await answer('القسط ده اتسجل خلاص ✅');
                const next = rcOpenInstallment(b);
                await rcSend(chatId, `<b>${rcEsc(rcInstName(inst, idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b> اتسجل خلاص ✅` +
                    (next ? `\nاللي عليك دلوقتي: ${rcEsc(rcInstName(next.inst, next.idx))} · ${rcMoney(rcLeft(next.inst))}${next.inst.dueDate ? ' · ' + rcEsc(rcDateText(next.inst.dueDate)) : ''}` : ''),
                    next ? [[{ text: '📸 ابعت إيصال ' + rcInstName(next.inst, next.idx), callback_data: `rcpt_send_${b.id}_${next.idx}` }]] : null);
                return;
            }
            await chatRef.set({ pendingReceipt: { bookingId, idx, at: Date.now() } }, { merge: true });
            await answer('ابعت الإيصال دلوقتي');
            await rcSend(chatId, `تمام. ابعت صورة إيصال <b>${rcEsc(rcInstName(inst, idx))}</b> أو ملف PDF هنا دلوقتي 📎`);
            return;
        }
        if (kind === 'any') {
            await answer();
            await rcStartAny(chatId, await rcBookingsForChat(chatId));
            return;
        }
        if (kind === 'delayany') {
            await answer();
            await rcStartDelay(chatId, await rcBookingsForChat(chatId));
            return;
        }
        if (kind === 'cancel') {
            await chatRef.set({ pendingReceipt: admin.firestore.FieldValue.delete() }, { merge: true });
            await answer('اتلغى');
            await rcSend(chatId, 'تمام، اتلغى. لما تحب تبعت الإيصال، دوس «ابعت إيصال القسط» من أي تذكير، أو اكتب «حسابي».');
            return;
        }
        if (kind === 'how') {
            const bookingId = params.slice(1, -1).join('_'), idx = parseInt(params[params.length - 1], 10);
            await answer();
            const pay = ['vodafone', 'instapay', 'bank'].map(m => getPaymentDetails(m)).join('\n');
            await bot.sendMessage(chatId, `*طرق الدفع*\n${pay}\nبعد التحويل دوس الزرار وابعت الإيصال.`, {
                parse_mode: 'Markdown', disable_web_page_preview: true,
                reply_markup: { inline_keyboard: [[{ text: '📸 ابعت إيصال القسط', callback_data: `rcpt_send_${bookingId}_${idx}` }]] }
            });
            return;
        }
        if (kind === 'status') {
            await answer();
            await rcSendStatus(chatId, await rcBookingsForChat(chatId));
            return;
        }
        if (kind === 'menu') {
            await answer();
            const w = messageTemplates.welcome();
            await bot.sendMessage(chatId, w.text, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: w.keyboard } });
            return;
        }
        if (kind === 'pick') {
            const rid = params[1], i = parseInt(params[2], 10);
            const ref = db.collection('receipts').doc(rid);
            const snap = await ref.get();
            const c = snap.exists && (snap.data().candidates || [])[i];
            if (!c || String(snap.data().chatId) !== String(chatId)) { await answer('الاختيار ده مش متاح'); return; }
            if (snap.data().status !== 'pending') { await answer('الإيصال ده اتراجع خلاص'); return; }
            const b = await rcGetBooking(c.bookingId);
            if (!b || !rcSchedule(b)[c.idx]) { await answer('الحجز ده مش موجود'); return; }
            await ref.update({ ...rcReceiptFields(b, c.idx), source: 'choice', studentSaysWrong: false });
            await answer('تمام');
            await rcAck(chatId, b, c.idx, rid, false);
            return;
        }
        if (kind === 'wrong') {
            const rid = params[1];
            const ref = db.collection('receipts').doc(rid);
            const snap = await ref.get();
            if (!snap.exists || String(snap.data().chatId) !== String(chatId)) { await answer(); return; }
            const r = snap.data();
            const cands = rcCandidates(rcAllOpen(await rcBookingsForChat(chatId)), r);
            await ref.update({ studentSaysWrong: true, studentSaysWrongAt: admin.firestore.FieldValue.serverTimestamp(), candidates: cands });
            await answer('تمام');
            if (!cands.length) {
                await rcSend(chatId, 'تمام، هنراجع الإيصال بنفسنا ونتأكد هو لإيه. ولو حابب، اكتب هنا هو لإيه.');
                return;
            }
            await rcSend(chatId, 'تمام. الإيصال ده لأنهي قسط؟',
                cands.map((c, i) => [{ text: `${c.courseName || 'كورس'} · ${c.label} · ${rcMoney(c.amount)}`, callback_data: `rcpt_pick_${rid}_${i}` }])
                    .concat([[{ text: 'مش متأكد، راجعوه انتو', callback_data: `rcpt_unsure_${rid}` }]]));
            return;
        }
        if (kind === 'unsure') {
            await answer('تمام');
            await rcSend(chatId, 'تمام، هنراجعه بنفسنا ونأكدلك هنا.');
            return;
        }
        if (kind === 'notrc') {
            const rid = params[1];
            const ref = db.collection('receipts').doc(rid);
            const snap = await ref.get();
            if (!snap.exists || String(snap.data().chatId) !== String(chatId) || snap.data().status !== 'pending') { await answer(); return; }
            await ref.update({ status: 'dismissed', reason: 'الطالب قال إنها مش إيصال', decidedBy: 'student', decidedAt: admin.firestore.FieldValue.serverTimestamp() });
            await rcSyncPendingFlag(chatId);
            await answer('تمام');
            await rcSend(chatId, 'تمام 👌 اكتب لنا محتاج إيه، وهنرد عليك هنا.');
            return;
        }
        if (kind === 'delay') {
            const bookingId = params.slice(1, -1).join('_'), idx = parseInt(params[params.length - 1], 10);
            const b = await rcGetBooking(bookingId);
            const inst = b && rcSchedule(b)[idx];
            if (!b || String(b.telegramChatId) !== String(chatId) || !inst) { await answer('الزرار ده مش متاح'); return; }
            await answer();
            if (rcLeft(inst) <= 0) { await rcSend(chatId, `<b>${rcEsc(rcInstName(inst, idx))}</b> اتسجل خلاص ✅ مش محتاج تأجيل.`); return; }
            const o = rcDelayOptions(b, idx);
            await rcSend(chatId, o.text, o.kb);
            return;
        }
        if (kind === 'dly') {
            const bookingId = params.slice(1, -2).join('_'), idx = parseInt(params[params.length - 2], 10), days = parseInt(params[params.length - 1], 10);
            const b = await rcGetBooking(bookingId);
            const inst = b && rcSchedule(b)[idx];
            if (!b || String(b.telegramChatId) !== String(chatId) || !inst || ![7, 14, 30].includes(days)) { await answer('الزرار ده مش متاح'); return; }
            if (rcLeft(inst) <= 0) { await answer('القسط ده اتسجل خلاص ✅'); return; }
            const requestedDue = rcDayPlus(inst.dueDate, days);
            const data = { kind: 'postpone', bookingId: b.id, idx, installmentNumber: inst.installmentNumber != null ? inst.installmentNumber : idx,
                amountExpected: rcLeft(inst), courseName: b.courseName || null, studentName: (b.customer && b.customer.name) || null,
                dueDate: inst.dueDate || null, requestedDue, days };
            const pend = (await rcPendingForChat(chatId)).find(r => r.kind === 'postpone' && r.bookingId === b.id && r.idx === idx);
            if (pend) await db.collection('receipts').doc(pend.id).update({ requestedDue, days, updatedMs: Date.now() });
            else await rcSaveReceipt(chatId, null, null, data);
            await answer('وصل طلبك');
            await rcSend(chatId, `وصل طلبك ✅\nتأجيل <b>${rcEsc(rcInstName(inst, idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b> لحد <b>${rcEsc(rcDateText(requestedDue))}</b>.\nهنراجعه ونرد عليك هنا.`);
            return;
        }
        await answer();
    } catch (e) {
        console.error('rcOnCallback:', e);
        await answer('حصلت مشكلة، جرّب تاني');
    }
}

// ---------- التذكير ----------
app.post('/installments/remind', requireAdmin, async (req, res) => {
    try {
        const { bookingId, idx } = req.body || {};
        const b = await rcGetBooking(String(bookingId || ''));
        if (!b) return res.status(404).json({ ok: false, error: 'not-found' });
        const inst = rcSchedule(b)[idx];
        if (!inst || inst.status === 'paid' || rcLeft(inst) <= 0) return res.status(400).json({ ok: false, error: 'not-open' });
        const r = await rcRemind(b, Number(idx), 'manual');
        res.status(r.ok ? 200 : 400).json(r);
    } catch (e) { console.error('/installments/remind', e); res.status(500).json({ ok: false, error: 'server' }); }
});

// المهمة المجدولة (Cloud Scheduler) بتبعت توقيع جوجل (OIDC) بحساب الخدمة بتاع المشروع.
// البوت بيتأكد من التوقيع عند جوجل نفسه، فمفيش أي مفتاح سري متخزن أو متكتب في أي مكان.
const RC_SCHEDULER_SA = '1068763865336-compute@developer.gserviceaccount.com';
const RC_SCHEDULER_AUD = 'https://us-central1-fouad-perspective.cloudfunctions.net/telegramBot';
async function rcIsScheduler(req) {
    const m = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
    if (!m) return false;
    try {
        const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(m[1]));
        if (!r.ok) return false;
        const t = await r.json();
        return t.email === RC_SCHEDULER_SA && String(t.email_verified) === 'true'
            && String(t.aud || '').indexOf(RC_SCHEDULER_AUD) === 0
            && Number(t.exp || 0) * 1000 > Date.now();
    } catch (e) { return false; }
}
async function rcCronOrAdmin(req, res, next) {
    if (await rcIsScheduler(req)) { req.fromScheduler = true; return next(); }
    return requireAdmin(req, res, next);
}
// المرحلة اللي يستاهلها القسط النهارده (لو يوم فات، بنلحقه في اللي بعده)
function rcStageFor(inst, sent) {
    const late = rcDaysLate(inst.dueDate);
    if (late === null) return null;
    if (late >= 10 && late <= 30 && !sent.late10) return 'late10';
    if (late >= 3 && late <= 9 && !sent.late3) return 'late3';
    if (late >= 0 && late <= 2 && !sent.due) return 'due';
    if (late >= -3 && late <= -1 && !sent.pre3 && !sent.due) return 'pre3';
    return null;
}
app.post('/installments/run', rcCronOrAdmin, async (req, res) => {
    const dry = !!(req.body && req.body.dry);
    const out = { ok: true, dry, checked: 0, sent: 0, skippedNoTelegram: 0, skippedPending: 0, blocked: 0, failed: 0, items: [] };
    try {
        const [tb, st, rs] = await Promise.all([
            db.collection('tempBookings').where('paymentDetails.type', '==', 'installment').get(),
            db.collection('individualStudents').where('paymentDetails.type', '==', 'installment').get().catch(() => ({ docs: [] })),
            db.collection('receipts').where('status', '==', 'pending').get()
        ]);
        // أي حاجة الطالب بعتها ومستنية قرار: مش هنفكّره بيها
        const waiting = new Set(), waitingChat = new Set();
        rs.forEach(d => { const r = d.data(); if (r.bookingId && r.idx != null) waiting.add(r.bookingId + '_' + r.idx); else waitingChat.add(String(r.chatId)); });
        const all = [], seen = {};
        tb.docs.forEach(d => { seen[d.id] = 1; all.push({ id: d.id, _col: 'tempBookings', ...d.data() }); });
        st.docs.forEach(d => { if (!seen[d.id]) all.push({ id: d.id, _col: 'individualStudents', ...d.data() }); });
        const blockedChats = {};
        for (const b of all) {
            if (!rcInstallmentLive(b)) continue;
            const s = rcSchedule(b);
            const rem = b.installmentReminders || {};
            for (let i = 0; i < s.length; i++) {
                const inst = s[i];
                if (!inst || inst.status === 'paid' || rcLeft(inst) <= 0) continue;
                out.checked++;
                const sent = { pre3: !!rem[`${i}_pre3`], due: !!rem[`${i}_due`], late3: !!rem[`${i}_late3`], late10: !!rem[`${i}_late10`] };
                const stage = rcStageFor(inst, sent);
                if (!stage) continue;
                if (!b.telegramChatId) { out.skippedNoTelegram++; break; }
                if (waiting.has(b.id + '_' + i) || waitingChat.has(String(b.telegramChatId))) { out.skippedPending++; break; }
                const cid = String(b.telegramChatId);
                if (blockedChats[cid] === undefined) {
                    const cs = await db.collection('telegramChats').doc(cid).get();
                    blockedChats[cid] = !!(cs.exists && cs.data().botBlocked);
                }
                if (blockedChats[cid]) { out.blocked++; break; }
                out.items.push({ bookingId: b.id, idx: i, stage, name: (b.customer && b.customer.name) || '' });
                if (!dry) {
                    try {
                        const r = await rcRemind(b, i, stage);
                        if (r.ok) out.sent++; else if (r.error === 'blocked') { out.blocked++; blockedChats[cid] = true; }
                    } catch (e) { out.failed++; console.error('reminder', b.id, i, e && e.message); }
                }
                break;          // تذكير واحد بس لكل حجز في اليوم
            }
        }
        res.json(out);
    } catch (e) { console.error('/installments/run', e); res.status(500).json({ ok: false, error: 'server' }); }
});

// ---------- بعد تسجيل دفعة: تأكيد واحد للطالب ----------
// body: { bookingId, idx, amount, covered: [{idx, amount, status}], receiptId? }
function rcPaidText(b, idx, amount, covered) {
    const pd = b.paymentDetails || {};
    const s = rcSchedule(b);
    const name = rcFirstName(b);
    const course = `<b>${rcEsc(b.courseName || 'الكورس')}</b>`;
    const thanks = `شكرًا${name ? ' يا ' + rcEsc(name) : ''}.`;
    const total = rcNum(pd.totalAmount) || s.reduce((a, x) => a + rcNum(x.amount), 0);
    const paid = s.length ? s.reduce((a, x) => a + rcPaidOn(x), 0) : rcNum(pd.paidAmount);
    const next = rcOpenInstallment(b) || (s.length ? (() => { for (let i = 0; i < s.length; i++) if (rcLeft(s[i]) > 0) return { idx: i, inst: s[i] }; return null; })() : null);
    const cov = (Array.isArray(covered) && covered.length ? covered : [{ idx, amount, status: s[idx] && s[idx].status }]).filter(c => s[c.idx]);
    const inst = s[idx];
    let text;
    if (!next && total) {
        text = `اتسجل ${rcMoney(amount)} في ${course} ✅ ${thanks}\nكده الكورس اتدفع كامل 🎉`;
        return text;
    }
    if (cov.length > 1) {
        text = `اتسجل ${rcMoney(amount)} في ${course} ✅ ${thanks}\nغطّى: ${cov.map(c => rcEsc(rcInstName(s[c.idx], c.idx)) + (s[c.idx].status === 'paid' ? '' : ' (جزء منه)')).join('، ')}.`;
    } else if (inst && inst.status !== 'paid') {
        text = `اتسجل ${rcMoney(amount)} من <b>${rcEsc(rcInstName(inst, idx))}</b> في ${course} ✅ ${thanks}\nفاضل منه ${rcMoney(rcLeft(inst))}.`;
    } else {
        text = `اتسجل <b>${rcEsc(rcInstName(inst, idx))}</b> في ${course} (${rcMoney(amount)}) ✅ ${thanks}`;
    }
    if (total) text += `\nاتدفع ${rcMoney(paid)} من ${rcMoney(total)}.`;
    if (next) text += `\nاللي جاي: ${rcEsc(rcInstName(next.inst, next.idx))} · ${rcMoney(rcLeft(next.inst))}${next.inst.dueDate ? ' · ' + rcEsc(rcDateText(next.inst.dueDate)) : ''}.`;
    return text;
}
app.post('/installments/paid-notify', requireAdmin, async (req, res) => {
    try {
        const { bookingId, idx, amount, covered, receiptId } = req.body || {};
        const b = await rcGetBooking(String(bookingId || ''));
        if (!b) return res.status(404).json({ ok: false, error: 'not-found' });
        const i = Number(idx);
        if (!rcSchedule(b)[i]) return res.status(400).json({ ok: false, error: 'idx' });
        const idxs = new Set([i].concat((Array.isArray(covered) ? covered : []).map(c => Number(c.idx))));
        // نقفل الإيصالات وطلبات التأجيل اللي الدفعة دي غطّتها
        const rs = await db.collection('receipts').where('bookingId', '==', b.id).where('status', '==', 'pending').get();
        const closes = [];
        rs.forEach(d => {
            const r = d.data();
            const hit = r.idx != null && idxs.has(Number(r.idx));
            const isPost = r.kind === 'postpone';
            if (d.id === receiptId || (hit && !isPost) || (hit && isPost && rcLeft(rcSchedule(b)[r.idx]) <= 0))
                closes.push(db.collection('receipts').doc(d.id).update({
                    status: isPost ? 'dismissed' : 'approved', reason: isPost ? 'القسط اتدفع' : null,
                    decidedAt: admin.firestore.FieldValue.serverTimestamp(), decidedVia: 'payment'
                }));
        });
        if (receiptId && !closes.length) {
            const one = await db.collection('receipts').doc(String(receiptId)).get();
            if (one.exists && one.data().status === 'pending') closes.push(db.collection('receipts').doc(String(receiptId)).update({ status: 'approved', decidedAt: admin.firestore.FieldValue.serverTimestamp(), decidedVia: 'payment' }));
        }
        await Promise.all(closes);
        if (!b.telegramChatId) return res.json({ ok: true, sent: false, closed: closes.length, error: 'no-telegram' });
        await rcSyncPendingFlag(b.telegramChatId);
        try {
            await rcSend(b.telegramChatId, rcPaidText(b, i, rcNum(amount), covered), [[{ text: '📊 حسابي', callback_data: 'rcpt_status' }]]);
        } catch (e) {
            if (e.blocked) return res.json({ ok: true, sent: false, closed: closes.length, error: 'blocked' });
            throw e;
        }
        res.json({ ok: true, sent: true, closed: closes.length });
    } catch (e) { console.error('/installments/paid-notify', e); res.status(500).json({ ok: false, error: 'server' }); }
});

// ---------- طلب التأجيل ----------
// body: { requestId, decision: approved|rejected, newDate?: 'YYYY-MM-DD', reason? }
app.post('/installments/postpone', requireAdmin, async (req, res) => {
    try {
        const { requestId, decision, newDate, reason } = req.body || {};
        if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ ok: false, error: 'decision' });
        const ref = db.collection('receipts').doc(String(requestId || ''));
        const snap = await ref.get();
        if (!snap.exists || snap.data().kind !== 'postpone') return res.status(404).json({ ok: false, error: 'not-found' });
        const r = snap.data();
        if (r.status !== 'pending') return res.status(400).json({ ok: false, error: 'decided' });
        const b = await rcGetBooking(r.bookingId);
        const s = b ? rcSchedule(b) : [];
        const inst = s[r.idx];
        if (!b || !inst) return res.status(404).json({ ok: false, error: 'booking' });
        let text, kb = null, due = null;
        if (decision === 'approved') {
            due = newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate) ? new Date(newDate + 'T12:00:00+02:00').toISOString() : r.requestedDue;
            if (!due || isNaN(new Date(due))) return res.status(400).json({ ok: false, error: 'date' });
            const sched = s.map((x, k) => k === r.idx ? { ...x, dueDate: due, postponedFrom: x.dueDate || null, postponedAt: new Date().toISOString() } : x);
            const upd = { 'paymentDetails.installmentSchedule': sched };
            ['pre3', 'due', 'late3', 'late10'].forEach(st => { upd[`installmentReminders.${r.idx}_${st}`] = admin.firestore.FieldValue.delete(); });
            await rcRef(b).update(upd);
            text = `تمام ✅ اتأجل <b>${rcEsc(rcInstName(inst, r.idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b> لـ <b>${rcEsc(rcDateText(due))}</b>.\nهنفكّرك قبلها.`;
        } else {
            text = `${rcEsc(String(reason || 'مش هنقدر نأجل القسط ده المرة دي').trim())}.\nلو فيه ظرف، كلّمنا ونرتّبها سوا.`;
            kb = [[{ text: '🙋 محتاج مساعدة', callback_data: `support_${b.id}` }, { text: '📸 ابعت إيصال القسط', callback_data: `rcpt_send_${b.id}_${r.idx}` }]];
        }
        await ref.update({ status: decision, reason: reason ? String(reason).slice(0, 500) : null, approvedDue: due, decidedAt: admin.firestore.FieldValue.serverTimestamp() });
        await rcSyncPendingFlag(r.chatId);
        try { await rcSend(r.chatId, text, kb); }
        catch (e) { if (e.blocked) return res.json({ ok: true, sent: false, error: 'blocked' }); throw e; }
        res.json({ ok: true, sent: true, due });
    } catch (e) { console.error('/installments/postpone', e); res.status(500).json({ ok: false, error: 'server' }); }
});

// ---------- قرار الإيصال ----------
app.post('/receipts/decision', requireAdmin, async (req, res) => {
    try {
        const { receiptId, decision, reason } = req.body || {};
        if (!['approved', 'rejected', 'dismissed'].includes(decision)) return res.status(400).json({ ok: false, error: 'decision' });
        const ref = db.collection('receipts').doc(String(receiptId || ''));
        const snap = await ref.get();
        if (!snap.exists) return res.status(404).json({ ok: false, error: 'not-found' });
        const r = snap.data();
        await ref.update({ status: decision, reason: reason ? String(reason).slice(0, 500) : null, decidedAt: admin.firestore.FieldValue.serverTimestamp() });
        await rcSyncPendingFlag(r.chatId);

        if (decision === 'dismissed' || !r.chatId) return res.json({ ok: true, sent: false });
        const b = r.bookingId ? await rcGetBooking(r.bookingId) : null;
        let text, kb = null;
        if (decision === 'approved') {
            const inst = b && r.idx != null ? rcSchedule(b)[r.idx] : null;
            text = b && inst ? rcPaidText(b, r.idx, rcPaidOn(inst) || r.amountExpected, null)
                : `اتسجل إيصالك${b && b.courseName ? ' في <b>' + rcEsc(b.courseName) + '</b>' : ''} ✅ شكرًا${b && rcFirstName(b) ? ' يا ' + rcEsc(rcFirstName(b)) : ''}.`;
            kb = [[{ text: '📊 حسابي', callback_data: 'rcpt_status' }]];
        } else {
            const why = (reason ? String(reason).trim() : 'الإيصال مش واضح').replace(/[.。]+$/, '');
            const inst = b && r.idx != null ? rcSchedule(b)[r.idx] : null;
            kb = r.bookingId && r.idx != null ? [[{ text: '📸 ابعت الإيصال تاني', callback_data: `rcpt_send_${r.bookingId}_${r.idx}` }]] : null;
            text = `راجعنا ${inst ? 'إيصال <b>' + rcEsc(rcInstName(inst, r.idx)) + '</b>' + (b.courseName ? ' في <b>' + rcEsc(b.courseName) + '</b>' : '') : 'الإيصال'}: ${rcEsc(why)}.\nممكن تبعته تاني؟`;
        }
        try { await rcSend(r.chatId, text, kb); }
        catch (e) { if (e.blocked) return res.json({ ok: true, sent: false, error: 'blocked' }); throw e; }
        res.json({ ok: true, sent: true });
    } catch (e) { console.error('/receipts/decision', e); res.status(500).json({ ok: false, error: 'server' }); }
});
// ============================================================
