// LGR · Lux Gestion Résidences : l'app s'ouvre même sans réseau (les documents déjà vus sont dans le coffre de l'appareil).
const CACHE = 'lgr-v1.0.1';
const B = '/LGR-residences/';
const SHELL = [B, B + 'app.js?v=1.0.1', B + 'app.css?v=1.0.1', B + 'core.js', B + 'viewer.js', B + 'i18n.js', B + 'manifest.webmanifest', B + 'icons/lgr-192.png', B + 'icons/lgr-180.png', B + 'icons/lgr-32.png',
  B + 'vendor/pdf.min.mjs', B + 'vendor/pdf.worker.min.mjs', '/ares/crypto.js', '/ares/xlsx.js', '/ares/pdfmini.js', '/assets/fonts/fonts.css'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('lgr-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const key = u.pathname + u.search;
  // d'abord le réseau (toujours la dernière version), sinon la copie gardée ; les polices restent en cache
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && (SHELL.includes(key) || u.pathname.startsWith('/assets/fonts/'))) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || (e.request.mode === 'navigate' ? caches.match(B) : undefined))));
});
