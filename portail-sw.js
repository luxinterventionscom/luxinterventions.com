// Service worker du portail : application disponible hors ligne + notifications push.
const CACHE = 'portail-shell-v1.43.1';
const SHELL = ['/portail.html', '/portail/app.js', '/portail/demo.js', '/portail/portail.css', '/ares/app.css', '/ares/i18n.js', '/ares/video-embed.js', '/ares/pubstat.js', '/ares/reqmark.js', '/ares/wxradio.js', '/ares/ptl-invite.js', '/portail/i18n/de.js', '/portail/i18n/en.js', '/portail/i18n/pt.js', '/portail/i18n/es.js', '/portail/i18n/it.js', '/portail.webmanifest', '/portail/icons/ptl-192.png', '/portail/icons/ptl-180.png', '/portail/icons/ptl-32.png', '/portail/icons/ptl-banner.webp', '/favicon-32x32.png'];

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
    // toujours redemander au serveur (sinon le navigateur garde l'ancienne version jusqu'à 10 min)
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

// Les notifications arrivent du serveur en français : on les traduit ici dans la langue choisie dans le portail.
const PUSH_WORDS = {
  //            de, en, it, pt, es
  'URGENT': ['DRINGEND', 'URGENT', 'URGENTE', 'URGENTE', 'URGENTE'],
  'Sous 24 h': ['Innerhalb von 24 Std.', 'Within 24 h', 'Entro 24 ore', 'Em 24 h', 'En 24 h'],
  'Planifié': ['Geplant', 'Scheduled', 'Pianificato', 'Planeado', 'Planificado'],
  'Reçue': ['Eingegangen', 'Received', 'Ricevuta', 'Recebido', 'Recibida'],
  'Prise en charge': ['Übernommen', 'Taken on', 'Presa in carico', 'Assumido', 'Asumida'],
  'Planifiée': ['Geplant', 'Scheduled', 'Pianificata', 'Planeada', 'Planificada'],
  'En cours': ['In Arbeit', 'In progress', 'In corso', 'Em curso', 'En curso'],
  'Terminée': ['Abgeschlossen', 'Finished', 'Terminata', 'Concluído', 'Terminada'],
  'Annulée': ['Storniert', 'Cancelled', 'Annullata', 'Cancelado', 'Cancelada'],
  'Message de': ['Nachricht von', 'Message from', 'Messaggio da', 'Mensagem de', 'Mensaje de'],
  'Les notifications fonctionnent ✓': ['Die Benachrichtigungen funktionieren ✓', 'Notifications are working ✓', 'Le notifiche funzionano ✓', 'As notificações funcionam ✓', 'Las notificaciones funcionan ✓'],
  'Intervention': ['Einsatz', 'Job', 'Intervento', 'Intervenção', 'Intervención'],
  'Plomberie': ['Sanitär / Klempner', 'Plumbing', 'Idraulica', 'Canalização', 'Fontanería'],
  'Électricité': ['Elektrik', 'Electrical', 'Elettricità', 'Eletricidade', 'Electricidad'],
  'Serrurerie': ['Schlüsseldienst', 'Locksmith', 'Fabbro', 'Serralharia', 'Cerrajería'],
  'Chauffage / sanitaire': ['Heizung / Sanitär', 'Heating / plumbing fixtures', 'Riscaldamento / sanitari', 'Aquecimento / sanitários', 'Calefacción / sanitarios'],
  'Toiture / façade': ['Dach / Fassade', 'Roof / façade', 'Tetto / facciata', 'Telhado / fachada', 'Tejado / fachada'],
  'Vitrerie': ['Glaserei', 'Glazing', 'Vetreria', 'Vidraria', 'Cristalería'],
  'Menuiserie': ['Schreinerei', 'Joinery', 'Falegnameria', 'Carpintaria', 'Carpintería'],
  'Peinture': ['Malerarbeiten', 'Painting', 'Tinteggiatura', 'Pintura', 'Pintura'],
  'Nettoyage': ['Reinigung', 'Cleaning', 'Pulizia', 'Limpeza', 'Limpieza'],
  'Espaces verts': ['Grünanlagen', 'Green spaces', 'Aree verdi', 'Espaços verdes', 'Zonas verdes'],
  'Ascenseur': ['Aufzug', 'Lift', 'Ascensore', 'Elevador', 'Ascensor'],
  'Autre': ['Sonstiges', 'Other', 'Altro', 'Outro', 'Otro'],
};
const PUSH_LANGS = ['de', 'en', 'it', 'pt', 'es'];
const reEsc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function trPush(d, lang) {
  const i = PUSH_LANGS.indexOf(lang);
  if (i < 0) return d;
  const keys = Object.keys(PUSH_WORDS).sort((a, b) => b.length - a.length);
  const tr = (txt, whole) => {
    if (!txt) return txt;
    if (whole) return PUSH_WORDS[txt] ? PUSH_WORDS[txt][i] : txt;
    for (const k of keys) txt = txt.replace(new RegExp('(^|[\\s·#🔴🟠🟢—])' + reEsc(k) + '(?=$|[\\s—:✓])', 'g'), (_, p) => p + PUSH_WORDS[k][i]);
    return txt;
  };
  // titre : mots fixes (urgence, statut, « Message de ») ; texte : seulement le type d'intervention au début
  const title = tr(d.title || '');
  let body = d.body || '';
  if (PUSH_WORDS[body]) body = PUSH_WORDS[body][i];
  else { const m = /^([^—:]+?)( — | : )/.exec(body); if (m && PUSH_WORDS[m[1]]) body = PUSH_WORDS[m[1]][i] + body.slice(m[1].length); }
  return { ...d, title, body };
}
async function pushLang() {
  try { const r = await (await caches.open('ptl-pref')).match('/__ptl-lang'); return r ? (await r.text()).trim() : 'fr'; } catch { return 'fr'; }
}

self.addEventListener('push', (e) => {
  let d0 = {};
  try { d0 = e.data ? e.data.json() : {}; } catch { d0 = { title: 'LuxInterventions', body: e.data && e.data.text() }; }
  e.waitUntil(pushLang().then((lang) => { const d = trPush(d0, lang); return self.registration.showNotification(d.title || 'LuxInterventions', {
    body: d.body || '',
    tag: d.tag,
    renotify: !!d.tag,
    icon: '/portail/icons/ptl-192.png',
    badge: '/favicon-32x32.png',
    data: { url: d.url || '/portail.html' },
    requireInteraction: /URGENT/.test(d0.title || ''),
  }); }));
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
