/* ====================================================================
   منظور الفؤاد — Result Codes
   توليد كود مكوّن من ٨ خانات (4-4) مقاوم للتخمين.
   ──────────────────────────────────────────────────────────────────── */

(function (global) {
  'use strict';

  // ألفبائيّة بدون أحرف ملتبسة: O/0, I/1, L
  const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const SEG_LEN  = 4;
  const SEG_COUNT = 2;

  // ── Generation ──
  function randomCode() {
    const total = SEG_LEN * SEG_COUNT;
    const buf = new Uint32Array(total);
    crypto.getRandomValues(buf);
    let raw = '';
    for (let i = 0; i < total; i++) {
      raw += ALPHABET[buf[i] % ALPHABET.length];
    }
    return raw.slice(0, SEG_LEN) + '-' + raw.slice(SEG_LEN);
  }

  // ── Normalisation ──
  function normalize(code) {
    if (!code) return '';
    return String(code)
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, '')
      .replace(/O/g, '0')   // O→0  (لكن alphabet ما فيش 0 — هتفشل validation وده مقصود)
      .replace(/I/g, '1')   // I→1
      .replace(/L/g, '1');
  }

  function format(code) {
    const norm = normalize(code);
    if (norm.length !== SEG_LEN * SEG_COUNT) return code;
    return norm.slice(0, SEG_LEN) + '-' + norm.slice(SEG_LEN);
  }

  // ── Validation ──
  function isValid(code) {
    const norm = normalize(code);
    if (norm.length !== SEG_LEN * SEG_COUNT) return false;
    for (const ch of norm) {
      if (!ALPHABET.includes(ch)) return false;
    }
    return true;
  }

  // مساحة الكود ≈ ٣١^٨ ≈ ٨.٥ × ١٠^١١ احتمال.
  // مع ٢٠٠ مسجّل، احتمال التصادم العشوائيّ ≈ ١ في ٤ مليار.
  // محاولات التخمين ضدّ Firestore = خناق طبيعيّ من Quotas + Rules.

  global.ResultCodes = { randomCode, normalize, format, isValid };
})(window);
