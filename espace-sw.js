// App des locataires NOBIS s.a.r.l. : la page s'ouvre même sans réseau (les données, elles, viennent du serveur).
const CACHE = 'espace-shell-v1.21.0';
const SHELL = ['/espace.html', '/espace.js', '/ares/espace-crypto.js', '/ares/qrcode.js', '/espace.webmanifest', '/ares/icons/ares-192.png', '/ares/icons/nobis-logo.png', '/assets/fonts/fonts.css'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('espace-shell-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !SHELL.includes(url.pathname)) return;
  e.respondWith(
    // toujours redemander au serveur (sinon le navigateur garde l'ancienne version jusqu'à 10 min)
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
