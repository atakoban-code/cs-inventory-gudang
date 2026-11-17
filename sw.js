/* Service worker: membuat aplikasi tetap terbuka tanpa internet.
   - Halaman utama: coba ambil versi terbaru dulu (maks 3 detik), kalau gagal pakai salinan di HP.
   - File lain (ikon, manifest): pakai salinan di HP dulu.
   Pembaruan aplikasi muncul otomatis saat dibuka dalam keadaan online. */
const CACHE = 'inventory-v2';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req) {
  return new Promise((resolve) => {
    let done = false;
    const fromCache = () => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'));
    const timer = setTimeout(() => { if (!done) fromCache().then((r) => { if (r && !done) { done = true; resolve(r); } }); }, 3000);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
      }
      if (!done) { done = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      if (!done) fromCache().then((r) => { done = true; resolve(r || Response.error()); });
    });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req)); return; }
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
