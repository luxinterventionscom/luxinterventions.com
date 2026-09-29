// Page « Collectes des déchets » pour les locataires d'un immeuble (lecture seule, sans compte).
// Le lien contient un jeton (#…) ; la page lit la copie publique publiée par l'app Ares.
const API = document.querySelector('meta[name="pub-api"]').content.replace(/\/$/, '');
const token = (location.hash.match(/[0-9a-f]{32}/) || [])[0];
const app = document.getElementById('app');

const COLORS = { residuel: '#6b7280', organique: '#92400e', papier: '#2563eb', verre: '#15803d', valorlux: '#0891b2', encombrants: '#7c3aed', autre: '#9a958a' };
const L = {
  fr: {
    more: (n) => `Voir les ${n} suivantes`,
    locale: 'fr-LU', title: 'Collectes des déchets', sub: 'Calendrier de votre immeuble',
    tonight: 'Ce soir', today: "Aujourd'hui", tomorrow: 'Demain', putOut: 'sortez', nothing: 'Rien à sortir aujourd’hui ni demain.',
    next: 'Prochaines collectes', rules: 'Règles de votre immeuble', truck: 'passage du camion le', where: 'où',
    eve: 'La veille au soir', day: 'Le jour même, tôt le matin', after: (h) => `après ${h} h`, before: (h) => `avant ${h} h`,
    addCal: 'Ajouter à mon calendrier (iPhone, Mac, Outlook)', google: 'Ajouter à Google Agenda (Android)', download: 'Télécharger le calendrier (.ics)',
    calInfo: 'Votre téléphone vous rappellera au bon moment. Le calendrier se met à jour tout seul.',
    question: 'Une question ?', off: 'Ce lien n’est plus actif. Demandez le nouveau lien à votre gestionnaire.', updated: 'Mis à jour le',
    cats: { residuel: 'Déchets résiduels (poubelle grise)', organique: 'Biodéchets', papier: 'Papier / carton', verre: 'Verre', valorlux: 'Valorlux (sacs bleus)', encombrants: 'Encombrants', autre: 'Autre collecte' },
    lieux: { rue: 'sur le trottoir', soussol: 'au sous-sol (local poubelles)', garage: 'au garage', autre: 'voir la remarque' },
  },
  it: {
    more: (n) => `Vedi le altre ${n}`,
    locale: 'it-IT', title: 'Raccolta rifiuti', sub: 'Calendario del tuo palazzo',
    tonight: 'Stasera', today: 'Oggi', tomorrow: 'Domani', putOut: 'metti fuori', nothing: 'Niente da mettere fuori oggi né domani.',
    next: 'Prossime raccolte', rules: 'Regole del tuo palazzo', truck: 'passaggio del camion il', where: 'dove',
    eve: 'La sera prima', day: 'Il giorno stesso, di mattina presto', after: (h) => `dopo le ${h}`, before: (h) => `prima delle ${h}`,
    addCal: 'Aggiungi al mio calendario (iPhone, Mac, Outlook)', google: 'Aggiungi a Google Calendar (Android)', download: 'Scarica il calendario (.ics)',
    calInfo: 'Il tuo telefono ti avviserà al momento giusto. Il calendario si aggiorna da solo.',
    question: 'Una domanda?', off: 'Questo link non è più attivo. Chiedi il nuovo link al tuo amministratore.', updated: 'Aggiornato il',
    cats: { residuel: 'Indifferenziato (bidone grigio)', organique: 'Organico / umido', papier: 'Carta / cartone', verre: 'Vetro', valorlux: 'Valorlux (sacchi blu)', encombrants: 'Ingombranti', autre: 'Altra raccolta' },
    lieux: { rue: 'sul marciapiede', soussol: 'in cantina (locale rifiuti)', garage: 'in garage', autre: 'vedi la nota' },
  },
  de: {
    more: (n) => `Die nächsten ${n} anzeigen`,
    locale: 'de-LU', title: 'Müllabfuhr', sub: 'Abfuhrkalender Ihres Hauses',
    tonight: 'Heute Abend', today: 'Heute', tomorrow: 'Morgen', putOut: 'rausstellen', nothing: 'Heute und morgen nichts rausstellen.',
    next: 'Nächste Abholungen', rules: 'Regeln für Ihr Haus', truck: 'Abholung am', where: 'wo',
    eve: 'Am Vorabend', day: 'Am Abholtag, früh morgens', after: (h) => `ab ${h} Uhr`, before: (h) => `vor ${h} Uhr`,
    addCal: 'Zu meinem Kalender hinzufügen (iPhone, Mac, Outlook)', google: 'Zu Google Kalender hinzufügen (Android)', download: 'Kalender herunterladen (.ics)',
    calInfo: 'Ihr Telefon erinnert Sie rechtzeitig. Der Kalender aktualisiert sich automatisch.',
    question: 'Fragen?', off: 'Dieser Link ist nicht mehr aktiv. Bitte fragen Sie Ihre Verwaltung nach dem neuen Link.', updated: 'Aktualisiert am',
    cats: { residuel: 'Restmüll (graue Tonne)', organique: 'Biomüll', papier: 'Papier & Karton', verre: 'Glas', valorlux: 'Valorlux (blaue Säcke)', encombrants: 'Sperrmüll', autre: 'Sonstige Abfuhr' },
    lieux: { rue: 'auf dem Bürgersteig', soussol: 'im Keller (Müllraum)', garage: 'in der Garage', autre: 'siehe Hinweis' },
  },
  pt: {
    more: (n) => `Ver as próximas ${n}`,
    locale: 'pt-PT', title: 'Recolha do lixo', sub: 'Calendário do seu prédio',
    tonight: 'Esta noite', today: 'Hoje', tomorrow: 'Amanhã', putOut: 'pôr fora', nothing: 'Nada para pôr fora hoje nem amanhã.',
    next: 'Próximas recolhas', rules: 'Regras do seu prédio', truck: 'recolha no dia', where: 'onde',
    eve: 'Na véspera à noite', day: 'No próprio dia, de manhã cedo', after: (h) => `depois das ${h}h`, before: (h) => `antes das ${h}h`,
    addCal: 'Adicionar ao meu calendário (iPhone, Mac, Outlook)', google: 'Adicionar ao Google Calendar (Android)', download: 'Descarregar o calendário (.ics)',
    calInfo: 'O seu telemóvel avisa-o na hora certa. O calendário atualiza-se sozinho.',
    question: 'Alguma dúvida?', off: 'Este link já não está ativo. Peça o novo link ao seu gestor.', updated: 'Atualizado em',
    cats: { residuel: 'Lixo indiferenciado (contentor cinzento)', organique: 'Resíduos orgânicos', papier: 'Papel / cartão', verre: 'Vidro', valorlux: 'Valorlux (sacos azuis)', encombrants: 'Monstros', autre: 'Outra recolha' },
    lieux: { rue: 'no passeio', soussol: 'na cave (local do lixo)', garage: 'na garagem', autre: 'ver a nota' },
  },
  en: {
    more: (n) => `Show the next ${n}`,
    locale: 'en-GB', title: 'Waste collection', sub: 'Your building’s calendar',
    tonight: 'Tonight', today: 'Today', tomorrow: 'Tomorrow', putOut: 'put out', nothing: 'Nothing to put out today or tomorrow.',
    next: 'Next collections', rules: 'Rules for your building', truck: 'truck comes on', where: 'where',
    eve: 'The evening before', day: 'On the day, early morning', after: (h) => `after ${h}:00`, before: (h) => `before ${h}:00`,
    addCal: 'Add to my calendar (iPhone, Mac, Outlook)', google: 'Add to Google Calendar (Android)', download: 'Download the calendar (.ics)',
    calInfo: 'Your phone will remind you at the right time. The calendar updates itself.',
    question: 'Any question?', off: 'This link is no longer active. Ask your property manager for the new link.', updated: 'Updated on',
    cats: { residuel: 'Residual waste (grey bin)', organique: 'Organic waste', papier: 'Paper / cardboard', verre: 'Glass', valorlux: 'Valorlux (blue bags)', encombrants: 'Bulky waste', autre: 'Other collection' },
    lieux: { rue: 'on the pavement', soussol: 'in the basement (bin room)', garage: 'in the garage', autre: 'see note' },
  },
};
const pick = () => { try { const s = localStorage.getItem('collLang'); if (L[s]) return s; } catch {} const n = (navigator.language || 'fr').slice(0, 2); return L[n] ? n : 'fr'; };
let lang = pick();
let data = null;

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const fmt = (s, o) => new Date(s + 'T00:00:00').toLocaleDateString(L[lang].locale, o);
const long = (s) => fmt(s, { weekday: 'long', day: 'numeric', month: 'long' });
// « après 18 h » → dans la langue choisie ; texte libre sinon
function hourText(it) {
  const t = L[lang];
  const m = String(it.heure || '').match(/(\d{1,2})/);
  if (!m) return it.heure || '';
  return /avant|vor|antes|before|prima/i.test(it.heure) ? t.before(m[1]) : t.after(m[1]);
}
const whenRule = (it) => [it.sortie === 'jour' ? L[lang].day : L[lang].eve, hourText(it)].filter(Boolean).join(', ');
// Nom de la collecte : traduit, ou nom exact du calendrier de la commune si le type n'est pas reconnu
const catName = (x) => ((x.it.cat === 'autre' || !L[lang].cats[x.it.cat]) && x.it.names && x.it.names[x.d]) || L[lang].cats[x.it.cat] || x.it.cat;
const putDay = (it, d) => (it.sortie === 'jour' ? d : addDays(d, -1));

function render() {
  const t = L[lang];
  document.documentElement.lang = lang;
  document.title = `${t.title} — ${data ? data.adresse : ''}`;
  const langs = `<div class="langs">${Object.keys(L).map((k) => `<button data-lang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>`;
  if (!data) { app.innerHTML = langs + `<p class="err">${esc(t.off)}</p>`; return; }
  const today = iso(new Date()), tom = addDays(today, 1);
  const ev = [];
  for (const it of data.items) for (const d of it.dates || []) ev.push({ it, d, p: putDay(it, d) });
  ev.sort((a, b) => a.p.localeCompare(b.p));
  const soon = ev.filter((x) => x.p === today || x.p === tom);
  const label = (x) => (x.p === today ? (x.it.sortie === 'jour' ? t.today : t.tonight) : t.tomorrow);
  const nowCard = `<div class="card ${soon.length ? 'now' : ''}">${soon.length ? soon.map((x) => `<p style="margin:4px 0"><b>${esc(label(x))}</b> — ${esc(t.putOut)} : <b>${esc(catName(x))}</b>${hourText(x.it) ? ' · ' + esc(hourText(x.it)) : ''}<br><span class="meta">${esc(t.where)} : ${esc(t.lieux[x.it.lieu] || '')}${x.it.note ? ' · ' + esc(x.it.note) : ''}</span></p>`).join('') : `<p style="margin:0">✓ ${esc(t.nothing)}</p>`}</div>`;
  const upcoming = ev.filter((x) => x.p >= today).slice(0, 24);
  const row = (x) => `<div class="row"><span class="dot" style="background:${COLORS[x.it.cat] || '#999'}"></span><div><div class="when">${esc(long(x.p))} — ${esc(t.putOut)} ${esc(catName(x))}</div><div class="meta">${esc(t.truck)} ${esc(long(x.d))} · ${esc(t.lieux[x.it.lieu] || '')}</div></div></div>`;
  const list = `<div class="card"><h2>${esc(t.next)}</h2>${upcoming.slice(0, 3).map(row).join('')}${upcoming.length > 3 ? `<details class="more"><summary>${esc(t.more(upcoming.length - 3))}</summary>${upcoming.slice(3).map(row).join('')}</details>` : ''}</div>`;
  const rules = `<div class="card"><h2>${esc(t.rules)}</h2>${data.items.map((it) => `<div class="row"><span class="dot" style="background:${COLORS[it.cat] || '#999'}"></span><div><div class="when">${esc(t.cats[it.cat] || it.cat)}</div><div class="meta">${esc(whenRule(it))} · ${esc(t.lieux[it.lieu] || '')}${it.note ? ' · ' + esc(it.note) : ''}</div></div></div>`).join('')}</div>`;
  const ics = `${API}/api/pub/${token}.ics?lang=${lang}`;
  const webcal = ics.replace(/^https:/, 'webcal:');
  const cal = `<div class="card"><div class="btns">
    <a class="btn" href="${esc(webcal)}">📅 ${esc(t.addCal)}</a>
    <a class="btn sec" href="https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}" target="_blank" rel="noopener">${esc(t.google)}</a>
    <a class="btn sec" href="${esc(ics)}" download="collectes.ics">${esc(t.download)}</a></div>
    <p class="meta" style="margin:10px 0 0;text-align:center">${esc(t.calInfo)}</p></div>`;
  const foot = `<p class="foot">${data.societe ? esc(t.question) + ' ' + esc(data.societe) + (data.tel ? ` · <a href="tel:${esc(data.tel.replace(/[^\d+]/g, ''))}">${esc(data.tel)}</a>` : '') + '<br>' : ''}${esc(t.updated)} ${esc(fmt(data.updated.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }))}</p>`;
  app.innerHTML = `${langs}<h1>${esc(t.title)}</h1><p class="sub">${esc(data.adresse)} · ${esc(t.sub)}</p>${nowCard}${list}${rules}${cal}${foot}`;
}

app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-lang]');
  if (!b) return;
  lang = b.dataset.lang;
  try { localStorage.setItem('collLang', lang); } catch {}
  render();
});

(async () => {
  if (token) {
    try {
      const r = await fetch(`${API}/api/pub/${token}.json`, { cache: 'no-store' });
      if (r.ok) data = await r.json();
    } catch {}
  }
  render();
})();
