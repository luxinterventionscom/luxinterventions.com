// App LuxInterventions : l'app s'ouvre même sans réseau (les envois, eux, demandent une connexion).
const CACHE = 'luxapp-v1.0.0';
const SHELL = ['/app.html', '/app/app.js?v=1.0.0', '/app/app.css?v=1.0.0', '/app/mail.js', '/app.webmanifest', '/assets/luxinterventions-logo.png', '/ares/icons/lux-192.png', '/ares/icons/lux-favicon-32.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('luxapp-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  // d'abord le réseau (toujours la dernière version), sinon la copie gardée
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && SHELL.includes(u.pathname + u.search)) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('/app.html'))));
});
