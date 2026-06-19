/* Service Worker — QA/QC Leave PWA
 * ทำให้ติดตั้งเป็นแอปได้ + เปิดได้แม้ออฟไลน์ (app shell)
 * ไม่ยุ่งกับ API (POST ไป GAS) — ปล่อยให้วิ่ง network ตามปกติเสมอ
 * เวลาแก้ไฟล์แล้วอยากให้ผู้ใช้ได้ของใหม่ ให้เปลี่ยนเลข CACHE (เช่น v1 -> v2)
 */
const CACHE = 'qaqc-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // ไม่แตะ request ที่ไม่ใช่ GET (เช่น POST ไป API) — ปล่อยผ่าน network
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ของนอกโดเมน (CDN: tailwind, fullcalendar, fonts) — ปล่อยผ่าน ไม่ cache
  if (url.origin !== self.location.origin) return;

  // หน้าเว็บ (navigation) → network-first: ได้เวอร์ชันใหม่เสมอ, ออฟไลน์ค่อยใช้ cache
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // ไฟล์ asset ในโดเมน (ไอคอน ฯลฯ) → cache-first
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => cached))
  );
});
