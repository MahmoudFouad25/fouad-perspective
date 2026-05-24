/* ============================================================
   result-codes.js — مولّد أكواد الاستئناف الدائمة
   صيغة: XXXX-XXXX (٨ خانات، ألفبائية بلا التباس)
   ============================================================ */
(function (global) {
    'use strict';

    // ألفبائية مقاومة للالتباس (بلا O/0 وI/1 وL)
    const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const SEG_LEN = 4;
    const SEG_COUNT = 2;

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

    function normalize(code) {
        if (!code) return '';
        return String(code).toUpperCase()
            .replace(/[^0-9A-Z]/g, '')
            .replace(/O/g, '0')
            .replace(/I/g, '1')
            .replace(/L/g, '1'); // الالتباس → يفشل التحقق عمداً
    }

    function format(code) {
        const n = normalize(code);
        if (n.length !== SEG_LEN * SEG_COUNT) return code;
        return n.slice(0, SEG_LEN) + '-' + n.slice(SEG_LEN);
    }

    function isValid(code) {
        const n = normalize(code);
        if (n.length !== SEG_LEN * SEG_COUNT) return false;
        for (const ch of n) {
            if (!ALPHABET.includes(ch)) return false;
        }
        return true;
    }

    global.ResultCodes = { randomCode, normalize, format, isValid };
})(window);
