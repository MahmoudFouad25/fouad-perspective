// ==================== مسح الباسوردات المحفوظة (المرحلة ٦) ====================
// الباسورد بيتحفظ عند جوجل بس (Firebase Auth)، وما بيتكتبش في أي ملف.
// /auth/admin-secure-password  { userId }      → عميل واحد (بعد إنشاء حساب من صفحة أدمن)
// /auth/admin-migrate-passwords { limit, after } → كل العملاء على دفعات (مرة واحدة)
// الاتنين للأدمن بس، ومش بيغيّروا باسورد أي عميل: نفس الباسورد اللي معاه بيتنقل للمكان المحمي.

async function pwSecureOne(ref, u) {
    const FV = admin.firestore.FieldValue;
    const a = (u && u.auth) || {};
    const email = String((u && u.personalInfo && u.personalInfo.email) || '').trim().toLowerCase();
    let stored = a.tempPassword || null;
    if (!stored) {
        const sec = await db.collection('user_secrets').doc(ref.id).get();
        if (sec.exists) stored = sec.data().tempPassword || null;
    }
    let result = stored ? 'moved' : 'none';
    if (stored) {
        const plain = decodeStoredPassword(stored);
        if (!email) result = 'no-email';
        else if (!plain || plain.length < 6) result = 'weak';
        else {
            const rec = await upsertAuthUser(email, plain);
            await ref.update({ 'auth.authUid': rec.uid });
        }
    }
    const upd = { 'auth.passwordSecuredAt': FV.serverTimestamp() };
    if ('tempPassword' in a) upd['auth.tempPassword'] = FV.delete();
    if (u && 'tempPassword' in u) upd.tempPassword = FV.delete();
    await ref.update(upd);
    await db.collection('user_secrets').doc(ref.id).delete().catch(() => {});
    const st = await db.collection('individualStudents').where('userId', '==', ref.id).get();
    for (const d of st.docs) {
        const x = d.data();
        if ('accountPassword' in x || 'tempPassword' in x) await d.ref.update({ accountPassword: FV.delete(), tempPassword: FV.delete() });
    }
    return result;
}

app.post('/auth/admin-secure-password', requireAdmin, async (req, res) => {
    try {
        const userId = String((req.body && req.body.userId) || '');
        if (!userId || userId.includes('/')) return res.status(400).json({ ok: false, error: 'bad-request' });
        const ref = db.collection('users').doc(userId);
        const s = await ref.get();
        if (!s.exists) return res.status(404).json({ ok: false, error: 'not-found' });
        const result = await pwSecureOne(ref, s.data());
        res.json({ ok: true, result });
    } catch (e) {
        console.error('admin-secure-password:', e && e.code, e && e.message);
        res.status(500).json({ ok: false, error: 'server', code: (e && e.code) || null });
    }
});

app.post('/auth/admin-migrate-passwords', requireAdmin, async (req, res) => {
    try {
        const limit = Math.max(1, Math.min(60, Number((req.body && req.body.limit) || 25)));
        const after = req.body && req.body.after ? String(req.body.after) : null;
        let q = db.collection('users').orderBy(admin.firestore.FieldPath.documentId()).limit(limit);
        if (after) q = q.startAfter(after);
        const snap = await q.get();
        const counts = { moved: 0, none: 0, weak: 0, 'no-email': 0, failed: 0 };
        const needReset = [];
        for (const d of snap.docs) {
            try {
                const r = await pwSecureOne(d.ref, d.data());
                counts[r] = (counts[r] || 0) + 1;
                if (r === 'weak' || r === 'no-email') needReset.push({ id: d.id, name: (d.data().personalInfo || {}).name || '', why: r });
            } catch (e) {
                counts.failed++;
                needReset.push({ id: d.id, name: (d.data().personalInfo || {}).name || '', why: 'failed:' + ((e && e.code) || '') });
                console.error('migrate-passwords', d.id, e && e.code, e && e.message);
            }
        }
        const last = snap.docs.length ? snap.docs[snap.docs.length - 1].id : null;
        res.json({ ok: true, processed: snap.size, counts, needReset, next: snap.size === limit ? last : null });
    } catch (e) {
        console.error('admin-migrate-passwords:', e && e.code, e && e.message);
        res.status(500).json({ ok: false, error: 'server' });
    }
});
