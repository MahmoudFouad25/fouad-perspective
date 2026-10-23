// ==================== إيصالات الأقساط والتذكير التلقائي (المرحلة ٧) ====================
// بيتحط في telegram-bot-server.js بعد دوال المحفظة والنقاط، وبيستعمل اللي موجود هناك:
//   app, db, admin, bot, fetch, logMessage, getPaymentDetails, requireAdmin
//
// نقطتين ربط جوه /webhook (سطر واحد في كل واحدة):
//   ١) بعد ما المرفق يتحفظ:   if (await rcOnAttachment(chatId, result, firstName)) return res.sendStatus(200);
//   ٢) بعد تحليل الزرار:      if (action === 'rcpt') { await rcOnCallback(chatId, callbackQuery, params); return res.sendStatus(200); }
//
// الدوال الجديدة:
//   /installments/remind     (الأدمن)            تذكير بقسط واحد، فيه زرار «ابعت إيصال القسط»
//   /installments/run        (الأدمن أو المجدول)  التذكير التلقائي: قبل الميعاد بـ٣ أيام، ويوم الميعاد، وبعده بـ٣ أيام
//   /receipts/decision       (الأدمن)            اتسجل / اترفض / مش إيصال، والرسالة للطالب بتتبعت لوحدها
//
// كل إيصال بيتسجل في receipts/{id}:
//   { chatId, bookingId, idx, installmentNumber, amountExpected, courseName, studentName,
//     url, attachmentType, fileName, caption, source: button|auto|choice|unknown,
//     status: pending|approved|rejected|dismissed, candidates?, studentSaysWrong?, createdAt, decidedAt?, reason? }

const RC_TZ = 'Africa/Cairo';
const RC_DAY = 86400000;
const RC_INTENT_MS = 48 * 3600 * 1000;        // زرار «ابعت إيصال القسط» صالح ٤٨ ساعة

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
function rcFirstName(b) { return String((b.customer && b.customer.name) || '').trim().split(/\s+/)[0] || ''; }

// كل حجوزات المحادثة دي (الرقم ممكن يكون متسجل نص أو رقم)
async function rcBookingsForChat(chatId) {
    const ids = [String(chatId)];
    if (/^-?\d+$/.test(String(chatId))) ids.push(Number(chatId));
    const snap = await db.collection('tempBookings').where('telegramChatId', 'in', ids).get();
    const out = [];
    snap.forEach(d => out.push({ id: d.id, ...d.data() }));
    return out;
}
// أقرب قسط مفتوح في الحجز (أقدم واحد لسه ما اتدفعش)
function rcOpenInstallment(b) {
    if (!b || b.status === 'cancelled') return null;
    const pd = b.paymentDetails || {};
    const s = Array.isArray(pd.installmentSchedule) ? pd.installmentSchedule : [];
    for (let i = 0; i < s.length; i++) {
        if (s[i] && s[i].status !== 'paid' && rcLeft(s[i]) > 0) return { idx: i, inst: s[i] };
    }
    return null;
}
function rcAwaitingFirstReceipt(b) {
    return ['pending', 'confirmed'].includes(b.status) && b.automationWorkflow && b.automationWorkflow.currentState === 'awaiting_receipt';
}

async function rcSend(chatId, text, keyboard, extra) {
    const opts = { parse_mode: 'HTML', disable_web_page_preview: true };
    if (keyboard) opts.reply_markup = { inline_keyboard: keyboard };
    await bot.sendMessage(chatId, text, opts);     // البوت بيسجّل رسايله في المحادثة لوحده
}
function rcKeyboard(bookingId, idx) {
    return [
        [{ text: '📸 ابعت إيصال القسط', callback_data: `rcpt_send_${bookingId}_${idx}` }],
        [{ text: '💳 أدفع إزاي؟', callback_data: `rcpt_how_${bookingId}_${idx}` }, { text: '🙋 محتاج مساعدة', callback_data: `support_${bookingId}` }]
    ];
}

function rcReminderText(b, idx, stage) {
    const inst = b.paymentDetails.installmentSchedule[idx];
    const name = rcFirstName(b);
    const late = rcDaysLate(inst.dueDate);
    const what = `<b>${rcEsc(rcInstName(inst, idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b>`;
    const amount = `<b>${rcMoney(rcLeft(inst))}</b>`;
    let line;
    if (stage === 'late3' || (stage === 'manual' && late > 0)) {
        line = `${what} عدّى ميعاده من ${late.toLocaleString('ar-EG')} ${late === 1 ? 'يوم' : 'أيام'}، والمبلغ ${amount}.\nلو حوّلت خلاص، ابعت صورة الإيصال من الزرار تحت. ولو فيه أي ظرف، كلّمنا ونرتّبها سوا.`;
    } else if (stage === 'due' || late === 0) {
        line = `النهارده ميعاد ${what}، والمبلغ ${amount}.`;
    } else {
        line = `${what} ميعاده <b>${rcEsc(rcDateText(inst.dueDate))}</b>، والمبلغ ${amount}.`;
    }
    return `أهلًا${name ? ' ' + rcEsc(name) : ''} 🌿\n${line}\n\nلما تحوّل، دوس «ابعت إيصال القسط» وابعت صورة الإيصال هنا.`;
}

async function rcRemind(b, idx, stage) {
    const chatId = b.telegramChatId;
    if (!chatId) return { ok: false, error: 'no-telegram' };
    await rcSend(chatId, rcReminderText(b, idx, stage), rcKeyboard(b.id, idx), { action: 'installment_reminder', bookingId: b.id, installmentIndex: idx, stage });
    await db.collection('tempBookings').doc(b.id).update({
        [`installmentReminders.${idx}_${stage === 'manual' ? 'manual_' + Date.now() : stage}`]: admin.firestore.FieldValue.serverTimestamp()
    });
    return { ok: true };
}

async function rcSaveReceipt(chatId, result, data) {
    const ref = await db.collection('receipts').add({
        chatId: String(chatId), kind: 'installment', status: 'pending',
        url: result.permanentUrl || null, attachmentType: result.attachmentType || null,
        fileName: result.fileName || null, caption: result.caption || null, fileId: result.fileId || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), ...data
    });
    await db.collection('telegramChats').doc(String(chatId)).set({
        lastReceiptAt: admin.firestore.FieldValue.serverTimestamp(), hasPendingReceipt: true
    }, { merge: true });
    return ref.id;
}
function rcReceiptFields(b, idx) {
    const inst = b.paymentDetails.installmentSchedule[idx];
    return {
        bookingId: b.id, idx, installmentNumber: inst.installmentNumber != null ? inst.installmentNumber : idx,
        amountExpected: rcLeft(inst), courseName: b.courseName || null,
        studentName: (b.customer && b.customer.name) || null, dueDate: inst.dueDate || null
    };
}

// بيرجّع true لو الإيصال اتعامل معاه هنا، false علشان الكود القديم يكمّل (إيصال الدفعة الأولى)
async function rcOnAttachment(chatId, result) {
    try {
        if (!result || !result.success) return false;
        const chatRef = db.collection('telegramChats').doc(String(chatId));
        const chatSnap = await chatRef.get();
        const intent = chatSnap.exists ? chatSnap.data().pendingReceipt : null;
        const bookings = await rcBookingsForChat(chatId);

        // ١) الطالب داس «ابعت إيصال القسط»
        if (intent && intent.bookingId && Date.now() - (intent.at || 0) < RC_INTENT_MS) {
            const b = bookings.find(x => x.id === intent.bookingId);
            const inst = b && b.paymentDetails && (b.paymentDetails.installmentSchedule || [])[intent.idx];
            if (b && inst) {
                const rid = await rcSaveReceipt(chatId, result, { ...rcReceiptFields(b, intent.idx), source: 'button' });
                await chatRef.set({ pendingReceipt: admin.firestore.FieldValue.delete() }, { merge: true });
                await rcAck(chatId, b, intent.idx, rid, false);
                return true;
            }
        }
        // ٢) حجز مستني إيصال الدفعة الأولى: زي ما هو
        if (bookings.some(rcAwaitingFirstReceipt)) return false;

        // ٣ و ٤) أقساط مفتوحة
        const open = bookings.map(b => ({ b, o: rcOpenInstallment(b) })).filter(x => x.o)
            .sort((x, y) => new Date(x.o.inst.dueDate) - new Date(y.o.inst.dueDate));
        if (open.length === 1) {
            const { b, o } = open[0];
            const rid = await rcSaveReceipt(chatId, result, { ...rcReceiptFields(b, o.idx), source: 'auto' });
            await rcAck(chatId, b, o.idx, rid, true);
            return true;
        }
        if (open.length > 1) {
            const rid = await rcSaveReceipt(chatId, result, {
                bookingId: null, idx: null, source: 'choice',
                candidates: open.slice(0, 6).map(x => ({ bookingId: x.b.id, idx: x.o.idx, courseName: x.b.courseName || '', amount: rcLeft(x.o.inst) })),
                studentName: (open[0].b.customer && open[0].b.customer.name) || null
            });
            await rcSend(chatId, 'وصلت الصورة ✅\nالإيصال ده لأنهي كورس؟',
                open.slice(0, 6).map((x, i) => [{ text: `${x.b.courseName || 'كورس'} · ${rcMoney(rcLeft(x.o.inst))}`, callback_data: `rcpt_pick_${rid}_${i}` }]),
                { action: 'receipt_choose_course', receiptId: rid });
            return true;
        }
        // حجز شغال (مش مستني إيصال) → الكود القديم يرد زي ما هو
        if (bookings.some(b => ['pending', 'pending_review', 'confirmed', 'paid'].includes(b.status))) return false;

        // ٥) مفيش حاجة مفتوحة
        const anyB = bookings[0];
        const rid = await rcSaveReceipt(chatId, result, { bookingId: anyB ? anyB.id : null, idx: null, source: 'unknown', studentName: anyB && anyB.customer ? anyB.customer.name : null });
        await rcSend(chatId, 'وصلت الصورة ✅\nهنراجعها ونرد عليك هنا.', null, { action: 'receipt_unknown', receiptId: rid });
        return true;
    } catch (e) {
        console.error('rcOnAttachment:', e);
        return false;
    }
}

async function rcAck(chatId, b, idx, receiptId, guessed) {
    const inst = b.paymentDetails.installmentSchedule[idx];
    const text = `وصل إيصال <b>${rcEsc(rcInstName(inst, idx))}</b> في <b>${rcEsc(b.courseName || 'الكورس')}</b> (${rcMoney(rcLeft(inst))}) ✅\nهنراجعه ونبعتلك التأكيد هنا.`;
    await rcSend(chatId, text, guessed ? [[{ text: 'مش ده القسط', callback_data: `rcpt_wrong_${receiptId}` }]] : null,
        { action: 'receipt_received', bookingId: b.id, installmentIndex: idx, receiptId });
}

async function rcOnCallback(chatId, cq, params) {
    const kind = params[0];
    const answer = (text) => bot.answerCallbackQuery(cq.id, text ? { text } : {}).catch(() => {});
    try {
        if (kind === 'send') {
            const bookingId = params.slice(1, -1).join('_'), idx = parseInt(params[params.length - 1], 10);
            await db.collection('telegramChats').doc(String(chatId)).set({ pendingReceipt: { bookingId, idx, at: Date.now() } }, { merge: true });
            await answer('ابعت الإيصال دلوقتي');
            await rcSend(chatId, 'تمام. ابعت صورة الإيصال أو ملف PDF هنا دلوقتي 📎', null, { action: 'receipt_intent', bookingId, installmentIndex: idx });
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
        if (kind === 'pick') {
            const rid = params[1], i = parseInt(params[2], 10);
            const ref = db.collection('receipts').doc(rid);
            const snap = await ref.get();
            const c = snap.exists && (snap.data().candidates || [])[i];
            if (!c || String(snap.data().chatId) !== String(chatId)) { await answer('الاختيار ده مش متاح'); return; }
            const bs = await db.collection('tempBookings').doc(c.bookingId).get();
            if (!bs.exists) { await answer('الحجز ده مش موجود'); return; }
            const b = { id: bs.id, ...bs.data() };
            await ref.update({ ...rcReceiptFields(b, c.idx), source: 'choice' });
            await answer('تمام');
            await rcAck(chatId, b, c.idx, rid, false);
            return;
        }
        if (kind === 'wrong') {
            const rid = params[1];
            const ref = db.collection('receipts').doc(rid);
            const snap = await ref.get();
            if (!snap.exists || String(snap.data().chatId) !== String(chatId)) { await answer(); return; }
            await ref.update({ studentSaysWrong: true, studentSaysWrongAt: admin.firestore.FieldValue.serverTimestamp() });
            await answer('تمام');
            await rcSend(chatId, 'تمام، هنراجع الإيصال بنفسنا ونتأكد هو لأنهي قسط. ولو حابب، اكتب هنا هو لإيه.', null, { action: 'receipt_wrong', receiptId: rid });
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
        const snap = await db.collection('tempBookings').doc(String(bookingId || '')).get();
        if (!snap.exists) return res.status(404).json({ ok: false, error: 'not-found' });
        const b = { id: snap.id, ...snap.data() };
        const inst = ((b.paymentDetails || {}).installmentSchedule || [])[idx];
        if (!inst || inst.status === 'paid') return res.status(400).json({ ok: false, error: 'not-open' });
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
    if (late >= 3 && late <= 10 && !sent.late3) return 'late3';
    if (late >= 0 && late <= 2 && !sent.due) return 'due';
    if (late >= -3 && late <= -1 && !sent.pre3 && !sent.due) return 'pre3';
    return null;
}
app.post('/installments/run', rcCronOrAdmin, async (req, res) => {
    const dry = !!(req.body && req.body.dry);
    const out = { ok: true, dry, checked: 0, sent: 0, skippedNoTelegram: 0, items: [] };
    try {
        const snap = await db.collection('tempBookings').where('paymentDetails.type', '==', 'installment').get();
        for (const d of snap.docs) {
            const b = { id: d.id, ...d.data() };
            if (b.status === 'cancelled' || b.archivedAsTest) continue;
            const s = (b.paymentDetails || {}).installmentSchedule || [];
            const rem = b.installmentReminders || {};
            for (let i = 0; i < s.length; i++) {
                const inst = s[i];
                if (!inst || inst.status === 'paid' || rcLeft(inst) <= 0) continue;
                out.checked++;
                const sent = { pre3: !!rem[`${i}_pre3`], due: !!rem[`${i}_due`], late3: !!rem[`${i}_late3`] };
                const stage = rcStageFor(inst, sent);
                if (!stage) continue;
                if (!b.telegramChatId) { out.skippedNoTelegram++; continue; }
                out.items.push({ bookingId: b.id, idx: i, stage, name: (b.customer && b.customer.name) || '' });
                if (!dry) { await rcRemind(b, i, stage); out.sent++; }
                break;          // تذكير واحد بس لكل حجز في اليوم
            }
        }
        res.json(out);
    } catch (e) { console.error('/installments/run', e); res.status(500).json({ ok: false, error: 'server' }); }
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
        const still = await db.collection('receipts').where('chatId', '==', String(r.chatId)).where('status', '==', 'pending').limit(1).get();
        await db.collection('telegramChats').doc(String(r.chatId)).set({ hasPendingReceipt: !still.empty }, { merge: true });

        if (decision === 'dismissed' || !r.chatId) return res.json({ ok: true, sent: false });
        let b = null;
        if (r.bookingId) { const bs = await db.collection('tempBookings').doc(r.bookingId).get(); if (bs.exists) b = { id: bs.id, ...bs.data() }; }
        const name = b ? rcFirstName(b) : '';
        if (decision === 'approved') {
            const pd = (b && b.paymentDetails) || {};
            const s = pd.installmentSchedule || [];
            const inst = r.idx != null ? s[r.idx] : null;
            const total = rcNum(pd.totalAmount), paid = rcNum(pd.paidAmount);
            const next = b ? rcOpenInstallment(b) : null;
            let text = `اتسجل ${inst ? '<b>' + rcEsc(rcInstName(inst, r.idx)) + '</b>' : 'إيصالك'}${b && b.courseName ? ' في <b>' + rcEsc(b.courseName) + '</b>' : ''} ✅ شكرًا${name ? ' يا ' + rcEsc(name) : ''}.`;
            if (total) text += `\nاتدفع ${rcMoney(paid)} من ${rcMoney(total)}.`;
            text += next ? `\nالقسط الجاي ${rcEsc(rcDateText(next.inst.dueDate))} (${rcMoney(rcLeft(next.inst))}).` : (total ? '\nكده الكورس اتدفع كامل 🎉' : '');
            await rcSend(r.chatId, text, null, { action: 'receipt_approved', receiptId, bookingId: r.bookingId || null });
        } else {
            const why = reason ? String(reason).trim() : 'الإيصال مش واضح';
            const kb = r.bookingId && r.idx != null ? [[{ text: '📸 ابعت الإيصال تاني', callback_data: `rcpt_send_${r.bookingId}_${r.idx}` }]] : null;
            await rcSend(r.chatId, `${rcEsc(why)}.\nممكن تبعت الإيصال تاني؟`, kb, { action: 'receipt_rejected', receiptId });
        }
        res.json({ ok: true, sent: true });
    } catch (e) { console.error('/receipts/decision', e); res.status(500).json({ ok: false, error: 'server' }); }
});
// ============================================================
