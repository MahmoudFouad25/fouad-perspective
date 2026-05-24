/* ============================================================
   firebase-config.js — Shared Firebase Bootstrap
   موضعه: /js/firebase-config.js  (في جذر المشروع)
   كل صفحات النظام تستهلكه ولا تعيد تهيئة Firebase
   ============================================================ */
(function () {
    'use strict';

    // ⚠️ ضع هنا إعدادات مشروع Firebase الخاص بك
    const firebaseConfig = {
    apiKey: "AIzaSyDj0bV5gsyRbqpxzW0Zd9wjYmq53-Xdj3w",
    authDomain: "fouad-perspective.firebaseapp.com",
    projectId: "fouad-perspective",
    storageBucket: "fouad-perspective.firebasestorage.app",
    messagingSenderId: "1068763865336",
    appId: "1:1068763865336:web:b791abcd22d536aedd5b0d",
    measurementId: "G-RY1FYVB3Q9"
};

    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK لم يُحمَّل قبل firebase-config.js');
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        window.db = firebase.firestore();
        window.firebaseReady = true;
        document.dispatchEvent(new CustomEvent('firebaseReady'));
        console.log('✅ Firebase initialized');
    } catch (err) {
        console.error('فشل تهيئة Firebase:', err);
        window.firebaseReady = false;
    }
})();
