// App des locataires NOBIS s.a.r.l. : la page s'ouvre même sans réseau (les données, elles, viennent du serveur).
const CACHE = 'espace-shell-v1.28.0';
const SHELL = ['/espace.html', '/espace.js', '/ares/espace-crypto.js', '/ares/push-client.js', '/ares/video-embed.js', '/ares/qrcode.js', '/espace.webmanifest', '/ares/icons/ares-192.png', '/ares/icons/nobis-logo.png', '/assets/fonts/fonts.css'];
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

// ── Notifications : le numéro sur l'icône (badge) monte à chaque nouveauté, et s'efface quand l'app est ouverte ──
const BADGE = 'badge-esp';
async function badgeGet() { try { const r = await (await caches.open(BADGE)).match('/n'); return r ? +(await r.text()) || 0 : 0; } catch { return 0; } }
async function badgeSet(n) {
  try { await (await caches.open(BADGE)).put('/n', new Response(String(n))); } catch { /* stockage indisponible */ }
  try { if (n > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(n); else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge(); } catch { /* badge non pris en charge */ }
}
self.addEventListener('push', (e) => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch { /* message vide */ }
  e.waitUntil((async () => {
    const n = (await badgeGet()) + 1;
    await badgeSet(n);
    await self.registration.showNotification(m.title || 'NOBIS s.a.r.l.', { body: m.body || '', icon: '/ares/icons/ares-192.png', badge: '/ares/icons/favicon-32.png', tag: m.tag || 'app', renotify: true, data: { url: m.url || '/espace.html' } });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/espace.html';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => new URL(x.url).pathname === url);
    return c ? c.focus() : self.clients.openWindow(url);
  }));
});
self.addEventListener('message', (e) => { if (e.data && typeof e.data.badge === 'number') e.waitUntil(badgeSet(Math.max(0, e.data.badge | 0))); });
