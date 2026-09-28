// Service worker Ares : met l'application en cache pour l'ouvrir hors ligne.
// Les données ne passent jamais par ce cache (elles sont chiffrées dans IndexedDB
// et les appels à l'API ne sont pas interceptés).
const CACHE = 'ares-shell-v2.10.1';
const SHELL = [
  '/locataires.html',
  '/ares/app.css',
  '/ares/app.js',
  '/ares/store.js',
  '/ares/crypto.js',
  '/ares/qrcode.js',
  '/locataires.webmanifest',
  '/ares/icons/favicon-32.png',
  '/ares/icons/ares-96.png',
  '/ares/icons/ares-192.png',
  '/ares/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ares-shell-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour recevoir les mises à jour), cache en secours hors ligne.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (!SHELL.includes(url.pathname) && url.pathname !== '/locataires') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('/locataires.html')))
  );
});
