// L’ancien portail des gérances est retiré (v2.316) : ce service worker vide son cache et se désinstalle.
const CACHE = 'portail-shell-v1.999.0';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('portail-')) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
})()));
