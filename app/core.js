// ═══════════════════════════════════════════════════════════
// نواة تطبيق منظور الفؤاد — مشتركة بين شاشة الدخول والشاشة الرئيسية
// لا تعتمد على أي ملف خارج فولدر app، لكنها تكتب الجلسة بنفس
// المفاتيح التي تقرؤها صفحات الكورسات حتى تفتح الكورسات مباشرة.
// ═══════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── إعداد Firebase (نفس المشروع) ──
  const _k = ['QUl6YVN5', 'RGowYlY1', 'Z3N5UmJx', 'cHh6VzBa', 'ZDl3allt', 'cTUzLVhk', 'ajN3'];
  const firebaseConfig = {
    apiKey: _k.map(p => atob(p)).join(''),
    authDomain: 'fouad-perspective.firebaseapp.com',
    projectId: 'fouad-perspective',
    storageBucket: 'fouad-perspective.firebasestorage.app',
    messagingSenderId: '1068763865336',
    appId: '1:1068763865336:web:b791abcd22d536aedd5b0d',
    measurementId: 'G-RY1FYVB3Q9'
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // ── المسارات: التطبيق في /app، والموقع في الفولدر الأب ──
  const SITE = new URL('../', location.href).href;
  const PATHS = {
    login: './index.html',
    home: './home.html',
    admin: SITE + 'admin/dashboard.html',
    course: id => `${SITE}${id}/course-view.html?id=${encodeURIComponent(id)}`
  };

  const ADMIN_EMAIL = 'admin@fouad-academy.com';
  const SUPPORT_WHATSAPP = 'https://wa.me/201024584537';
  const DEFAULT_NAME = 'روح باحثة';

  // ── التخزين المشفّر: مطابق تمامًا لما تقرؤه صفحات الموقع ──
  const SecureStorage = {
    encrypt(data) {
      try {
        return btoa(encodeURIComponent(JSON.stringify(data))).split('').reverse().join('');
      } catch (e) { return null; }
    },
    decrypt(enc) {
      try {
        return JSON.parse(decodeURIComponent(atob(enc.split('').reverse().join(''))));
      } catch (e) { return null; }
    },
    setItem(key, value) {
      const enc = this.encrypt(value);
      if (enc) localStorage.setItem('_enc_' + key, enc);
    },
    getItem(key) {
      const enc = localStorage.getItem('_enc_' + key);
      return enc ? this.decrypt(enc) : null;
    }
  };

  // ── الجلسة ──
  const Session = {
    save(userId, email, userData) {
      const name = userData.personalInfo?.name || DEFAULT_NAME;
      const level = userData.accountStatus?.level || 'STANDARD';
      const status = userData.accountStatus?.status || 'active';

      localStorage.setItem('userId', userId);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userName', name);
      localStorage.setItem('userLevel', level);
      localStorage.setItem('userStatus', status);

      SecureStorage.setItem('user', { id: userId, email, name, level, status, timestamp: Date.now() });
      sessionStorage.setItem('_session', SecureStorage.encrypt({ uid: userId, name, timestamp: Date.now() }));
    },

    // معرّف المستخدم الحالي — نفس ترتيب صفحة الكورسات
    userId() {
      const secure = SecureStorage.getItem('user');
      return (secure && secure.id) || localStorage.getItem('userId') || null;
    },

    async clear() {
      try { await auth.signOut(); } catch (e) { /* تجاهل */ }
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  function isBlocked(userData) {
    return userData.accountStatus?.status === 'inactive' || userData.accountStatus?.suspended === true;
  }

  function isAdmin(email, userData) {
    return email === ADMIN_EMAIL || userData.auth?.role === 'admin';
  }

  // فك كلمة المرور المؤقتة (Base64 أو نص خام) — نفس منطق صفحة الدخول
  function decodeTempPassword(raw) {
    try {
      const decoded = atob(raw);
      return /^[\x20-\x7E@.؀-ۿ]+$/.test(decoded) ? decoded : raw;
    } catch (e) {
      return raw;
    }
  }

  // تنسيق النصوص بنفس رموز لوحة الإدارة
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function formatText(text) {
    if (!text) return '';
    return String(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong class="t-blue">$1</strong>')
      .replace(/<<(.*?)>>/g, '<span class="t-chip">$1</span>')
      .replace(/##(.*?)##/g, '<span class="t-gold">$1</span>')
      .replace(/\|\|(.*?)\|\|/g, '<em class="t-muted">$1</em>')
      .replace(/\^\^(.*?)\^\^/g, '<span class="t-green">$1</span>')
      .replace(/\n/g, '<br>');
  }

  // فتح الروابط الخارجية (واتساب وغيره) خارج التطبيق
  function openExternal(url) {
    if (!url) return;
    const w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }

  // ── رسائل خفيفة داخل التطبيق ──
  function toast(message, type = 'info', ms = 2600) {
    let host = document.getElementById('toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  // ── تسجيل الـ Service Worker ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  window.FP = {
    auth, db, PATHS, SITE, SUPPORT_WHATSAPP, DEFAULT_NAME,
    SecureStorage, Session, isBlocked, isAdmin, decodeTempPassword,
    escapeHtml, formatText, openExternal, toast
  };
})();
