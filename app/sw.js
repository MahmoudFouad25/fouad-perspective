// Service Worker — تطبيق منظور الفؤاد
// يحفظ واجهة التطبيق على الجهاز ويعرض صفحة «لا يوجد اتصال» عند انقطاع النت.
// لا يتدخّل في بيانات Firebase ولا في صفحات الكورسات.
// عند أي تعديل على ملفات التطبيق: غيّر رقم الإصدار هنا.

const VERSION = 'fp-app-v1';
const SHELL = [
  './index.html',
  './home.html',
  './offline.html',
  './app.css',
  './core.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Firebase والخطوط والمكتبات: مباشرة من النت

  // الصفحات: النت أولًا (حتى تظهر التحديثات فورًا)، ثم المحفوظ، ثم صفحة عدم الاتصال
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req, { ignoreSearch: true })) || caches.match('./offline.html'))
    );
    return;
  }

  // ملفات التطبيق الثابتة: المحفوظ فورًا مع تحديثه في الخلفية
  event.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
