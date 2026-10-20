// « 🆕 Nouveau bien » (biens à louer / à vendre des agences, publiés par l'app de gestion) + légende des couleurs,
// partagés par l'app des locataires, l'app de l'équipe et le Portail gérance. Bannière bleu mer qui clignote
// tant que la personne n'a pas ouvert le nouveau bien ; fiche plein écran avec photos à faire glisser.
export const PALETTE = [
  ['int', '#F97316'], ['ger', '#1D4ED8'], ['bien', '#0077BE'], ['dev', '#8B5CF6'], ['loc', '#0D9488'],
  ['hot', '#92400E'], ['pub', '#DC2626'], ['avis', '#475569'], ['plan', '#4F46E5'],
];
const TX = {
  fr: { nb: 'Nouveau bien', nbs: 'Nouveaux biens', all: 'Biens à louer / à vendre', open: 'Voir', mo: '/ mois', ch: 'charges', sale: 'à vendre', dispo: 'Disponible le', pcs: 'Pièces et espaces', call: 'Appeler', mail: 'Email', close: 'Fermer', by: 'Contact',
    leg: 'Couleurs', legT: 'Légende des couleurs', legH: 'Touchez une couleur', sem: 'Points qui clignotent = feu tricolore : 🟢 aujourd’hui / tout va bien · 🟡 bientôt / demain · 🔴 urgent / problème',
    L: { int: ['Interventions et maintenance', 'demandes, travaux, équipe'], ger: ['Gérances', 'portail et demandes des gérances'], bien: ['Nouveau bien', 'biens à louer / à vendre des agences immobilières'], dev: ['Devis', 'offres de prix à signer'], loc: ['Locataires et loyers', 'logements, contrats, paiements'], hot: ['Hotel', 'chambres, clients, clés'], pub: ['Publicité', 'annonces des partenaires du quartier'], avis: ['Avis de l’immeuble', 'coupures, travaux dans les communs'], plan: ['Planning du jour', 'ce qui est prévu aujourd’hui'] },
    T: { appartement: 'Appartement', maison: 'Maison', villa: 'Villa', studio: 'Studio', chambre: 'Chambre', duplex: 'Duplex', penthouse: 'Penthouse', local: 'Local commercial', bureau: 'Bureau', entrepot: 'Entrepôt', terrain: 'Terrain', parking: 'Parking / garage', autre: 'Autre' },
    P: { chambre: 'Chambre', salon: 'Salon', sejour: 'Séjour', cuisine: 'Cuisine', sdb: 'Salle de bain', douche: 'Salle de douche', wc: 'WC', bureau: 'Bureau', dressing: 'Dressing', buanderie: 'Buanderie', cave: 'Cave', grenier: 'Grenier', balcon: 'Balcon', terrasse: 'Terrasse', jardin: 'Jardin', piscine: 'Piscine', garage: 'Garage', box: 'Box / parking', vitrine: 'Vitrine', reserve: 'Réserve', technique: 'Local technique', autre: 'Autre' } },
  it: { nb: 'Nuovo immobile', nbs: 'Nuovi immobili', all: 'Immobili in affitto / in vendita', open: 'Vedi', mo: '/ mese', ch: 'spese', sale: 'in vendita', dispo: 'Disponibile dal', pcs: 'Locali e spazi', call: 'Chiama', mail: 'Email', close: 'Chiudi', by: 'Contatto',
    leg: 'Colori', legT: 'Legenda dei colori', legH: 'Tocca un colore', sem: 'Pallini che lampeggiano = semaforo: 🟢 oggi / tutto ok · 🟡 presto / domani · 🔴 urgente / problema',
    L: { int: ['Interventi e manutenzione', 'richieste, lavori, squadra'], ger: ['Gérance', 'portale e richieste delle gérance'], bien: ['Nuovo immobile', 'immobili in affitto / in vendita delle agenzie immobiliari'], dev: ['Preventivi', 'offerte da firmare'], loc: ['Inquilini e affitti', 'alloggi, contratti, pagamenti'], hot: ['Hotel', 'camere, clienti, chiavi'], pub: ['Pubblicità', 'annunci dei partner del quartiere'], avis: ['Avvisi dell’immobile', 'interruzioni, lavori nelle parti comuni'], plan: ['Planning del giorno', 'cosa è previsto oggi'] },
    T: { appartement: 'Appartamento', maison: 'Casa', villa: 'Villa', studio: 'Monolocale', chambre: 'Camera', duplex: 'Duplex', penthouse: 'Attico', local: 'Locale commerciale', bureau: 'Ufficio', entrepot: 'Magazzino', terrain: 'Terreno', parking: 'Parcheggio / garage', autre: 'Altro' },
    P: { chambre: 'Camera', salon: 'Salotto', sejour: 'Soggiorno', cuisine: 'Cucina', sdb: 'Bagno', douche: 'Bagno con doccia', wc: 'WC', bureau: 'Studio', dressing: 'Cabina armadio', buanderie: 'Lavanderia', cave: 'Cantina', grenier: 'Soffitta', balcon: 'Balcone', terrasse: 'Terrazza', jardin: 'Giardino', piscine: 'Piscina', garage: 'Garage', box: 'Box / posto auto', vitrine: 'Vetrina', reserve: 'Magazzino', technique: 'Locale tecnico', autre: 'Altro' } },
  de: { nb: 'Neue Immobilie', nbs: 'Neue Immobilien', all: 'Immobilien zur Miete / zum Kauf', open: 'Ansehen', mo: '/ Monat', ch: 'Nebenkosten', sale: 'zu verkaufen', dispo: 'Frei ab', pcs: 'Räume und Flächen', call: 'Anrufen', mail: 'E-Mail', close: 'Schließen', by: 'Kontakt',
    leg: 'Farben', legT: 'Farblegende', legH: 'Tippen Sie auf eine Farbe', sem: 'Blinkende Punkte = Ampel: 🟢 heute / alles gut · 🟡 bald / morgen · 🔴 dringend / Problem',
    L: { int: ['Einsätze und Wartung', 'Anfragen, Arbeiten, Team'], ger: ['Verwaltungen', 'Portal und Anfragen der Verwaltungen'], bien: ['Neue Immobilie', 'Immobilien der Makler zur Miete / zum Kauf'], dev: ['Angebote', 'Kostenvoranschläge zum Unterschreiben'], loc: ['Mieter und Mieten', 'Wohnungen, Verträge, Zahlungen'], hot: ['Hotel', 'Zimmer, Gäste, Schlüssel'], pub: ['Werbung', 'Anzeigen der Partner im Viertel'], avis: ['Hinweise zum Gebäude', 'Unterbrechungen, Arbeiten im Gemeinschaftsbereich'], plan: ['Tagesplan', 'was heute geplant ist'] },
    T: { appartement: 'Wohnung', maison: 'Haus', villa: 'Villa', studio: 'Studio', chambre: 'Zimmer', duplex: 'Maisonette', penthouse: 'Penthouse', local: 'Geschäftsraum', bureau: 'Büro', entrepot: 'Lager', terrain: 'Grundstück', parking: 'Stellplatz / Garage', autre: 'Sonstiges' },
    P: { chambre: 'Schlafzimmer', salon: 'Wohnzimmer', sejour: 'Esszimmer', cuisine: 'Küche', sdb: 'Badezimmer', douche: 'Duschbad', wc: 'WC', bureau: 'Arbeitszimmer', dressing: 'Ankleide', buanderie: 'Waschküche', cave: 'Keller', grenier: 'Dachboden', balcon: 'Balkon', terrasse: 'Terrasse', jardin: 'Garten', piscine: 'Pool', garage: 'Garage', box: 'Box / Stellplatz', vitrine: 'Schaufenster', reserve: 'Lagerraum', technique: 'Technikraum', autre: 'Sonstiges' } },
  pt: { nb: 'Novo imóvel', nbs: 'Novos imóveis', all: 'Imóveis para arrendar / vender', open: 'Ver', mo: '/ mês', ch: 'despesas', sale: 'à venda', dispo: 'Disponível a partir de', pcs: 'Divisões e espaços', call: 'Ligar', mail: 'Email', close: 'Fechar', by: 'Contacto',
    leg: 'Cores', legT: 'Legenda das cores', legH: 'Toque numa cor', sem: 'Pontos a piscar = semáforo: 🟢 hoje / tudo bem · 🟡 em breve / amanhã · 🔴 urgente / problema',
    L: { int: ['Intervenções e manutenção', 'pedidos, trabalhos, equipa'], ger: ['Gestoras', 'portal e pedidos das gestoras'], bien: ['Novo imóvel', 'imóveis das agências para arrendar / vender'], dev: ['Orçamentos', 'propostas para assinar'], loc: ['Inquilinos e rendas', 'alojamentos, contratos, pagamentos'], hot: ['Hotel', 'quartos, clientes, chaves'], pub: ['Publicidade', 'anúncios dos parceiros do bairro'], avis: ['Avisos do prédio', 'cortes, obras nas partes comuns'], plan: ['Plano do dia', 'o que está previsto hoje'] },
    T: { appartement: 'Apartamento', maison: 'Casa', villa: 'Moradia', studio: 'Estúdio', chambre: 'Quarto', duplex: 'Duplex', penthouse: 'Penthouse', local: 'Loja', bureau: 'Escritório', entrepot: 'Armazém', terrain: 'Terreno', parking: 'Estacionamento / garagem', autre: 'Outro' },
    P: { chambre: 'Quarto', salon: 'Sala de estar', sejour: 'Sala de jantar', cuisine: 'Cozinha', sdb: 'Casa de banho', douche: 'Casa de banho com duche', wc: 'WC', bureau: 'Escritório', dressing: 'Closet', buanderie: 'Lavandaria', cave: 'Cave', grenier: 'Sótão', balcon: 'Varanda', terrasse: 'Terraço', jardin: 'Jardim', piscine: 'Piscina', garage: 'Garagem', box: 'Box / estacionamento', vitrine: 'Montra', reserve: 'Arrecadação', technique: 'Sala técnica', autre: 'Outro' } },
  en: { nb: 'New property', nbs: 'New properties', all: 'Properties to rent / for sale', open: 'View', mo: '/ month', ch: 'charges', sale: 'for sale', dispo: 'Available from', pcs: 'Rooms and spaces', call: 'Call', mail: 'Email', close: 'Close', by: 'Contact',
    leg: 'Colours', legT: 'Colour key', legH: 'Tap a colour', sem: 'Blinking dots = traffic light: 🟢 today / all good · 🟡 soon / tomorrow · 🔴 urgent / problem',
    L: { int: ['Jobs and maintenance', 'requests, works, team'], ger: ['Property managers', 'portal and requests of the managers'], bien: ['New property', 'estate agencies’ properties to rent / for sale'], dev: ['Quotes', 'offers to sign'], loc: ['Tenants and rents', 'units, leases, payments'], hot: ['Hotel', 'rooms, guests, keys'], pub: ['Advertising', 'ads from local partners'], avis: ['Building notices', 'outages, works in common areas'], plan: ['Today’s plan', 'what is planned today'] },
    T: { appartement: 'Flat', maison: 'House', villa: 'Villa', studio: 'Studio', chambre: 'Room', duplex: 'Duplex', penthouse: 'Penthouse', local: 'Shop', bureau: 'Office', entrepot: 'Warehouse', terrain: 'Land', parking: 'Parking / garage', autre: 'Other' },
    P: { chambre: 'Bedroom', salon: 'Living room', sejour: 'Dining room', cuisine: 'Kitchen', sdb: 'Bathroom', douche: 'Shower room', wc: 'WC', bureau: 'Study', dressing: 'Dressing room', buanderie: 'Laundry', cave: 'Cellar', grenier: 'Attic', balcon: 'Balcony', terrasse: 'Terrace', jardin: 'Garden', piscine: 'Pool', garage: 'Garage', box: 'Box / parking', vitrine: 'Shop window', reserve: 'Storeroom', technique: 'Plant room', autre: 'Other' } },
  es: { nb: 'Nuevo inmueble', nbs: 'Nuevos inmuebles', all: 'Inmuebles en alquiler / en venta', open: 'Ver', mo: '/ mes', ch: 'gastos', sale: 'en venta', dispo: 'Disponible desde el', pcs: 'Estancias y espacios', call: 'Llamar', mail: 'Email', close: 'Cerrar', by: 'Contacto',
    leg: 'Colores', legT: 'Leyenda de colores', legH: 'Toque un color', sem: 'Puntos que parpadean = semáforo: 🟢 hoy / todo bien · 🟡 pronto / mañana · 🔴 urgente / problema',
    L: { int: ['Intervenciones y mantenimiento', 'solicitudes, trabajos, equipo'], ger: ['Administradoras', 'portal y solicitudes de las administradoras'], bien: ['Nuevo inmueble', 'inmuebles de las agencias en alquiler / en venta'], dev: ['Presupuestos', 'ofertas para firmar'], loc: ['Inquilinos y alquileres', 'viviendas, contratos, pagos'], hot: ['Hotel', 'habitaciones, clientes, llaves'], pub: ['Publicidad', 'anuncios de los socios del barrio'], avis: ['Avisos del edificio', 'cortes, obras en zonas comunes'], plan: ['Plan del día', 'lo previsto hoy'] },
    T: { appartement: 'Piso', maison: 'Casa', villa: 'Chalet', studio: 'Estudio', chambre: 'Habitación', duplex: 'Dúplex', penthouse: 'Ático', local: 'Local comercial', bureau: 'Oficina', entrepot: 'Almacén', terrain: 'Terreno', parking: 'Aparcamiento / garaje', autre: 'Otro' },
    P: { chambre: 'Dormitorio', salon: 'Salón', sejour: 'Comedor', cuisine: 'Cocina', sdb: 'Baño', douche: 'Baño con ducha', wc: 'WC', bureau: 'Despacho', dressing: 'Vestidor', buanderie: 'Lavadero', cave: 'Bodega', grenier: 'Desván', balcon: 'Balcón', terrasse: 'Terraza', jardin: 'Jardín', piscine: 'Piscina', garage: 'Garaje', box: 'Box / plaza', vitrine: 'Escaparate', reserve: 'Trastero', technique: 'Cuarto técnico', autre: 'Otro' } },
};
const LOCS = { fr: 'fr-LU', it: 'it-IT', de: 'de-LU', pt: 'pt-PT', en: 'en-GB', es: 'es-ES' };
const NEW_DAYS = 30;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ls = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } } };
let cfg = { api: '', app: 'x', lang: () => 'fr' }, items = null, loading = false;
const urls = new Map();
const tx = () => TX[cfg.lang()] || TX.fr;
const eur = (n) => (+n || 0).toLocaleString(LOCS[cfg.lang()] || 'fr-LU', { maximumFractionDigits: 0 }) + ' €';
const fd = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString(LOCS[cfg.lang()] || 'fr-LU', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const isNew = (b) => b.cree && (Date.now() - new Date(b.cree + 'T00:00:00').getTime()) / 864e5 <= NEW_DAYS;
const seenKey = () => cfg.app + 'NbSeen';
const unseen = () => (items || []).filter((b) => isNew(b) && !(ls.get(seenKey()) || '').split(',').includes(b.id));

const CSS = `.mk{border:2px solid var(--mk)!important}
.mk-on{animation:mkGlow 1.5s ease-in-out infinite}
@keyframes mkGlow{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--mk) 55%,transparent)}50%{box-shadow:0 0 0 7px transparent,0 0 18px 2px color-mix(in srgb,var(--mk) 35%,transparent)}}
.mk-int{--mk:#F97316}.mk-ger{--mk:#1D4ED8}.mk-bien{--mk:#0077BE}.mk-dev{--mk:#8B5CF6}.mk-loc{--mk:#0D9488}.mk-hot{--mk:#92400E}.mk-pub{--mk:#DC2626}.mk-avis{--mk:#475569}.mk-plan{--mk:#4F46E5}
@media (prefers-reduced-motion:reduce){.mk-on{animation:none}}
.nb-ban{display:flex;align-items:center;gap:12px;width:100%;margin:12px 0;padding:12px 14px;border:2px solid #0077BE;border-radius:16px;background:linear-gradient(135deg,rgba(0,119,190,.13),rgba(0,119,190,.04));color:inherit;font:inherit;text-align:left;cursor:pointer;box-sizing:border-box}
.nb-ban.blink{animation:nbGlow 1.5s ease-in-out infinite}
@keyframes nbGlow{0%,100%{box-shadow:0 0 0 0 rgba(0,119,190,.55)}50%{box-shadow:0 0 0 7px rgba(0,119,190,0),0 0 18px 2px rgba(0,119,190,.35)}}
.nb-ban .nb-ic{flex:none;width:46px;height:46px;border-radius:12px;background:#0077BE;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;overflow:hidden}
.nb-ban .nb-ic img{width:100%;height:100%;object-fit:cover}
.nb-ban .nb-g{flex:1;min-width:0}.nb-ban b{display:block;color:#0077BE;font-size:15px}
.nb-ban .nb-s{display:block;font-size:13px;opacity:.85;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nb-ban .nb-go{flex:none;font-weight:700;color:#0077BE}
.nb-dlg{width:100vw;max-width:100vw;height:100%;max-height:100%;margin:0;padding:0;border:0;background:var(--bg,#f5f4f0);color:var(--text,#1b1a17)}
.nb-dlg::backdrop{background:rgba(0,0,0,.6)}
.nb-top{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:12px 16px;background:#0077BE;color:#fff}
.nb-top h2{flex:1;margin:0;font-size:17px;color:#fff;text-transform:none;letter-spacing:0;font-weight:800}.nb-top button{border:0;background:rgba(255,255,255,.2);color:#fff;font:inherit;font-weight:700;padding:8px 12px;border-radius:10px;cursor:pointer}
.nb-list{padding:12px 16px 40px;max-width:760px;margin:0 auto;display:grid;gap:16px}
.nb-card{background:var(--card,var(--surface,#fff));border:1px solid var(--line,var(--border,#e5e2da));border-radius:16px;overflow:hidden}
.nb-car{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;aspect-ratio:16/9;background:#0b1220}
.nb-car img{flex:none;width:100%;height:100%;object-fit:cover;scroll-snap-align:center}
.nb-car .nb-noph{flex:none;width:100%;display:flex;align-items:center;justify-content:center;font-size:48px}
.nb-body{padding:12px 14px}.nb-body h3{margin:0 0 4px;font-size:17px}
.nb-new{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:#0077BE;color:#fff;font-size:11px;font-weight:800;vertical-align:middle}
.nb-meta{font-size:13px;opacity:.8;margin:0 0 6px}.nb-pr{font-size:15px;margin:2px 0}.nb-pr b{color:#0077BE}
.nb-pcs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.nb-pcs span{font-size:12px;padding:3px 8px;border-radius:999px;background:rgba(0,119,190,.1)}
.nb-desc{white-space:pre-line;font-size:14px;margin:6px 0}
.nb-ct{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;font-size:13px}
.nb-ct a{display:inline-block;padding:8px 12px;border-radius:10px;background:#0077BE;color:#fff;text-decoration:none;font-weight:700}
@media (prefers-reduced-motion:reduce){.nb-ban.blink{animation:none}}`;

async function load() {
  if (loading || !cfg.api) return;
  loading = true;
  try { const r = await fetch(cfg.api + '/api/biens', { cache: 'no-store' }); if (r.ok) items = ((await r.json()).items || []); } catch { /* hors ligne */ }
  loading = false;
  paint();
}
async function photo(id, n) {
  const k = id + '/' + n;
  if (urls.has(k)) return urls.get(k);
  const r = await fetch(`${cfg.api}/api/biens/${id}/p${n}.jpg`);
  if (!r.ok) throw new Error('photo');
  const u = URL.createObjectURL(await r.blob());
  urls.set(k, u);
  return u;
}
function fillPhotos(root) {
  root.querySelectorAll('img[data-nbph]').forEach((im) => { const [id, n] = im.dataset.nbph.split('/'); delete im.dataset.nbph; photo(id, n).then((u) => { im.src = u; }).catch(() => im.remove()); });
}
const typeL = (b) => tx().T[b.type] || tx().T.autre;
function banHtml() {
  if (!items || !items.length) return '';
  const w = tx(), nu = unseen(), b = nu[0] || items[0];
  const head = nu.length > 1 ? `🆕 ${nu.length} · ${w.nbs}` : nu.length ? `🆕 ${w.nb}` : `🏠 ${w.all} (${items.length})`;
  const price = [b.louer && b.loyer ? eur(b.loyer) + ' ' + w.mo : '', b.vendre && b.prix ? eur(b.prix) : ''].filter(Boolean).join(' · ');
  return `<button type="button" class="nb-ban${nu.length ? ' blink' : ''}" data-nb-open="1"><span class="nb-ic">${b.nph ? `<img alt="" data-nbph="${esc(b.id)}/0">` : '🏠'}</span>
    <span class="nb-g"><b>${esc(head)}</b><span class="nb-s">${esc(b.titre)} · ${esc(typeL(b))}${b.surface ? ' · ' + esc(b.surface) + ' m²' : ''}${price ? ' · ' + esc(price) : ''}</span></span><span class="nb-go">${esc(w.open)} ›</span></button>`;
}
function cardHtml(b) {
  const w = tx(), tel = String((b.agence || {}).tel || '').replace(/[^\d+]/g, ''), mail = (b.agence || {}).email || '';
  const ph = b.nph ? Array.from({ length: b.nph }, (_, n) => `<img alt="" data-nbph="${esc(b.id)}/${n}">`).join('') : '<span class="nb-noph">🏠</span>';
  return `<article class="nb-card"><div class="nb-car">${ph}</div><div class="nb-body">
    <h3>${esc(b.titre)}${isNew(b) ? `<span class="nb-new">🆕 ${esc(w.nb)}</span>` : ''}</h3>
    <p class="nb-meta">${esc(typeL(b))}${b.surface ? ' · ' + esc(b.surface) + ' m²' : ''}${b.adresse ? ' · 📍 ' + esc(b.adresse) : ''}</p>
    ${b.louer && b.loyer ? `<p class="nb-pr"><b>${esc(eur(b.loyer))}</b> ${esc(w.mo)}${b.charges ? ` + ${esc(eur(b.charges))} ${esc(w.ch)}` : ''}</p>` : ''}
    ${b.vendre && b.prix ? `<p class="nb-pr"><b>${esc(eur(b.prix))}</b> ${esc(w.sale)}</p>` : ''}
    ${b.dispo ? `<p class="nb-meta">📅 ${esc(w.dispo)} ${esc(fd(b.dispo))}</p>` : ''}
    ${(b.pieces || []).length ? `<div class="nb-pcs" aria-label="${esc(w.pcs)}">${b.pieces.map((p) => `<span>${esc(w.P[p.k] || p.nom || w.P.autre)}${p.nom && w.P[p.k] ? ' · ' + esc(p.nom) : ''}${p.m2 ? ' · ' + esc(p.m2) + ' m²' : ''}</span>`).join('')}</div>` : ''}
    ${b.description ? `<p class="nb-desc">${esc(b.description)}</p>` : ''}
    ${(b.agence || {}).nom || tel || mail ? `<div class="nb-ct"><span>👤 ${esc(w.by)} : <b>${esc((b.agence || {}).nom || '')}</b></span>${tel ? `<a href="tel:${esc(tel)}">📞 ${esc(w.call)}</a>` : ''}${mail ? `<a href="mailto:${esc(mail)}?subject=${encodeURIComponent(b.titre)}">✉️ ${esc(w.mail)}</a>` : ''}</div>` : ''}
  </div></article>`;
}
function openAll() {
  const w = tx();
  let d = document.getElementById('nbDlg');
  if (!d) { d = document.createElement('dialog'); d.id = 'nbDlg'; d.className = 'nb-dlg'; document.body.appendChild(d); }
  const list = [...(items || [])].sort((a, b) => isNew(b) - isNew(a) || (b.cree || '').localeCompare(a.cree || ''));
  d.innerHTML = `<div class="nb-top"><h2>🏠 ${esc(w.all)}</h2><button type="button" data-nb-close="1">✕ ${esc(w.close)}</button></div><div class="nb-list">${list.map(cardHtml).join('')}</div>`;
  fillPhotos(d);
  if (!d.open) { try { d.showModal(); } catch { d.setAttribute('open', ''); } }
  ls.set(seenKey(), list.filter(isNew).map((b) => b.id).join(','));
  paint();
}
function paint() {
  document.querySelectorAll('[data-nb-slot]').forEach((el) => { el.innerHTML = banHtml(); fillPhotos(el); });
}

// La bannière (HTML) — à placer où l'on veut ; elle se remplit toute seule.
export function nbienBanner() { setTimeout(() => (items ? paint() : load()), 0); return `<div data-nb-slot>${banHtml()}</div>`; }
// api : adresse du Worker ; app : préfixe de stockage ('esp', 'eq', 'ptl') ; lang : fonction
export function nbienInit(opts) {
  cfg = { ...cfg, ...opts };
  if (nbienInit.done) return;
  nbienInit.done = true;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-nb-open]')) { e.preventDefault(); return openAll(); }
    if (e.target.closest('[data-nb-close]')) { const d = document.getElementById('nbDlg'); if (d) d.close(); return; }
  });
  setInterval(load, 10 * 60 * 1000);
}

// ℹ️ Infos : un seul cadre blanc repliable, le même dans toutes les apps (bas de page) — légende des couleurs.
const IB = {
  fr: { t: 'Infos' },
  it: { t: 'Info' },
  de: { t: 'Infos' },
  pt: { t: 'Infos' },
  en: { t: 'Info' },
  es: { t: 'Info' },
};
const IB_CSS = `.ib{margin:14px 0;border:1px solid #e3ded3;border-radius:16px;background:#fff;color:#1d1b16;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.ib>summary{display:flex;align-items:center;gap:8px;padding:12px 14px;cursor:pointer;list-style:none;font-weight:700}
.ib>summary::-webkit-details-marker{display:none}
.ib>summary::after{content:'▾';margin-left:auto;color:#8a8478;transition:transform .15s}.ib[open]>summary::after{transform:rotate(180deg)}
.ib-dots{display:inline-flex;gap:3px}.ib-dots i{width:14px;height:5px;border-radius:3px}
.ib-sec{padding:4px 14px 12px;border-top:1px solid #eee9de}
.ib-sec h4{margin:10px 0 6px;font-size:14px}
.ib-sec p{margin:0 0 6px;font-size:13px;line-height:1.4;color:#3b382f}
.ib-row{display:flex;gap:8px;align-items:baseline}.ib-row i{flex:0 0 18px;height:6px;border-radius:3px;transform:translateY(-2px)}`;
export function infoBox({ lang = '' } = {}) {
  if (!document.getElementById('ibCss')) {
    const st = document.createElement('style'); st.id = 'ibCss'; st.textContent = IB_CSS; document.head.appendChild(st);
    // ouvert / fermé : gardé quand l'écran se redessine
    document.addEventListener('toggle', (e) => { if (e.target.matches && e.target.matches('details[data-ib]')) ls.set(cfg.app + 'IbOpen', e.target.open ? '1' : ''); }, true);
  }
  const L = lang || cfg.lang(), w = TX[L] || TX.fr, b = IB[L] || IB.fr;
  return `<details class="ib" data-ib="1" data-notr${ls.get(cfg.app + 'IbOpen') === '1' ? ' open' : ''}><summary>ℹ️ ${esc(b.t)} <span class="ib-dots" aria-hidden="true">${PALETTE.map(([, c]) => `<i style="background:${c}"></i>`).join('')}</span></summary>
  <div class="ib-sec"><h4>🎨 ${esc(w.legT)}</h4>${PALETTE.map(([k, c]) => `<p class="ib-row"><i style="background:${c}"></i><span><b>${esc(w.L[k][0])}</b> — ${esc(w.L[k][1])}</span></p>`).join('')}<p>${esc(w.sem)}</p></div>
  </details>`;
}
