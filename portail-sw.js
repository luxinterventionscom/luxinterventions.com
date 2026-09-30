// Service worker du portail : application disponible hors ligne + notifications push.
const CACHE = 'portail-shell-v1.2.0';
const SHELL = ['/portail.html', '/portail/app.js', '/portail/demo.js', '/portail/portail.css', '/ares/app.css', '/ares/i18n.js', '/portail/i18n/de.js', '/portail/i18n/en.js', '/portail/i18n/pt.js', '/portail/i18n/es.js', '/portail.webmanifest', '/android-chrome-192x192.png', '/favicon-32x32.png', '/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('portail-shell-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !SHELL.includes(url.pathname)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'LuxInterventions', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'LuxInterventions', {
    body: d.body || '',
    tag: d.tag,
    renotify: !!d.tag,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: { url: d.url || '/portail.html' },
    requireInteraction: /URGENT/.test(d.title || ''),
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/portail.html';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).pathname.startsWith('/portail')) {
        await c.focus();
        c.postMessage({ type: 'open', url });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
