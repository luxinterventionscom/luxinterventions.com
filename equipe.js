// App de l'équipe : planning personnel (quoi, où, quand), « commencé / fini / pas fini » avec note et photos,
// horaire, absences, coordonnées. Le lien contient l'identifiant et la clé (#id.clé) ; la clé ne quitte jamais le téléphone.
import { openJson, sealForOwner, codeHash, unwrapWithCode } from '/ares/espace-crypto.js';

const API = document.querySelector('meta[name="esp-api"]').content.replace(/\/$/, '');
const ACC = 'eqAccess';
const RX = /^([0-9a-f]{32})\.([A-Za-z0-9_-]{40,})$/;
let [id, key] = (location.hash.slice(1).match(RX) || []).slice(1);
if (id) { try { localStorage.setItem(ACC, id + '.' + key); } catch {} history.replaceState(null, '', location.pathname); }
else { try { [id, key] = ((localStorage.getItem(ACC) || '').match(RX) || []).slice(1); } catch {} }

const L = {
  fr: {
    loc: 'fr-LU', app: 'App de l’équipe', welcome: 'Votre planning, vos interventions et vos absences, sur votre téléphone.', code: 'Votre code personnel', codePh: 'ex. K7PM2-QXA4H', enter: 'Entrer', noCode: 'Pas de code ? Demandez-le à votre responsable.', badCode: 'Code inconnu. Vérifiez-le ou demandez un nouveau code.', off: 'Cet accès a été désactivé. Demandez un nouveau code à votre responsable.', mismatch: 'Ce code est pour l’app des locataires.',
    hello: 'Bonjour', today: 'Aujourd’hui', next: 'Prochains jours', none: 'Rien de prévu aujourd’hui.', noneNext: 'Rien de prévu.', late: 'en retard', start: '▶️ Je commence', done: '✅ Fini', inc: '⚠️ Pas fini', why: 'Pourquoi ce n’est pas fini ? (obligatoire)', whyPh: 'ex. il manque une pièce, locataire absent…', note: 'Note (facultatif)', notePh: 'ex. robinet changé, escalier lavé', photos: 'Photos (max. 3)', send: 'Envoyer', cancel: 'Annuler',
    st: { encours: '▶️ Commencé', fait: '✅ Fini', incomplet: '⚠️ Pas fini' }, at: 'à', consignes: 'Consignes', contact: 'Contact sur place', call: 'Appeler', commons: 'Parties communes',
    sched: 'Mon horaire', days: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'], noSched: 'Pas d’horaire enregistré.',
    abs: 'Mes absences', absNow: (t, f) => `${t}${f ? ' jusqu’au ' + f : ''}`, sick: 'Je suis malade / absent', types: { maladie: '🤒 Maladie', conges: '🏖️ Demande de congé', autre: '📌 Autre absence' }, from: 'Du', to: 'Au (inclus)', cert: 'Certificat médical (photo)', sickOk: 'Envoyé ✓ Votre responsable est prévenu.',
    info: 'Mes coordonnées', tel: 'Téléphone', mail: 'Email', adr: 'Adresse', ville: 'Code postal et ville', save: 'Envoyer', infoOk: 'Envoyé ✓',
    pending: (n) => `⏳ ${n} envoi${n > 1 ? 's' : ''} en attente : ${n > 1 ? 'ils partiront' : 'il partira'} dès qu’il y aura du réseau.`, retry: 'Réessayer', sent: 'Envoyé ✓',
    install: 'Ajoutez l’app à l’écran d’accueil : iPhone → Partager → « Sur l’écran d’accueil » ; Android → ⋮ → « Installer l’application ».', logout: 'Se déconnecter de ce téléphone', personal: 'Ce lien est personnel.', rgpd: 'Vos données sont chiffrées. Votre responsable voit ce que vous envoyez (statuts, notes, photos, absences, coordonnées).', need: 'Écrivez pourquoi ce n’est pas fini.',
  },
  it: {
    loc: 'it-IT', app: 'App della squadra', welcome: 'Il tuo planning, i tuoi interventi e le tue assenze, sul telefono.', code: 'Il tuo codice personale', codePh: 'es. K7PM2-QXA4H', enter: 'Entra', noCode: 'Non hai il codice? Chiedilo al tuo responsabile.', badCode: 'Codice sconosciuto. Controllalo o chiedi un nuovo codice.', off: 'Questo accesso è stato disattivato. Chiedi un nuovo codice al responsabile.', mismatch: 'Questo codice è per l’app degli inquilini.',
    hello: 'Ciao', today: 'Oggi', next: 'Prossimi giorni', none: 'Niente in programma oggi.', noneNext: 'Niente in programma.', late: 'in ritardo', start: '▶️ Inizio', done: '✅ Finito', inc: '⚠️ Non finito', why: 'Perché non è finito? (obbligatorio)', whyPh: 'es. manca un pezzo, inquilino assente…', note: 'Nota (facoltativa)', notePh: 'es. rubinetto cambiato, scale lavate', photos: 'Foto (max. 3)', send: 'Invia', cancel: 'Annulla',
    st: { encours: '▶️ Iniziato', fait: '✅ Finito', incomplet: '⚠️ Non finito' }, at: 'alle', consignes: 'Istruzioni', contact: 'Contatto sul posto', call: 'Chiama', commons: 'Parti comuni',
    sched: 'Il mio orario', days: ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'], noSched: 'Nessun orario registrato.',
    abs: 'Le mie assenze', absNow: (t, f) => `${t}${f ? ' fino al ' + f : ''}`, sick: 'Sono malato / assente', types: { maladie: '🤒 Malattia', conges: '🏖️ Richiesta di ferie', autre: '📌 Altra assenza' }, from: 'Dal', to: 'Al (incluso)', cert: 'Certificato medico (foto)', sickOk: 'Inviato ✓ Il tuo responsabile è avvisato.',
    info: 'I miei dati', tel: 'Telefono', mail: 'Email', adr: 'Indirizzo', ville: 'CAP e città', save: 'Invia', infoOk: 'Inviato ✓',
    pending: (n) => `⏳ ${n} invi${n > 1 ? 'i' : 'o'} in attesa: parti${n > 1 ? 'ranno' : 'rà'} appena c’è rete.`, retry: 'Riprova', sent: 'Inviato ✓',
    install: 'Aggiungi l’app alla schermata Home: iPhone → Condividi → « Aggiungi alla schermata Home »; Android → ⋮ → « Installa app ».', logout: 'Esci da questo telefono', personal: 'Questo link è personale.', rgpd: 'I tuoi dati sono cifrati. Il tuo responsabile vede ciò che invii (stati, note, foto, assenze, dati).', need: 'Scrivi perché non è finito.',
  },
  pt: {
    loc: 'pt-PT', app: 'App da equipa', welcome: 'O seu planeamento, as suas intervenções e ausências, no telemóvel.', code: 'O seu código pessoal', codePh: 'ex. K7PM2-QXA4H', enter: 'Entrar', noCode: 'Não tem código? Peça-o ao seu responsável.', badCode: 'Código desconhecido. Verifique-o ou peça um novo código.', off: 'Este acesso foi desativado. Peça um novo código ao responsável.', mismatch: 'Este código é para a app dos inquilinos.',
    hello: 'Olá', today: 'Hoje', next: 'Próximos dias', none: 'Nada previsto para hoje.', noneNext: 'Nada previsto.', late: 'em atraso', start: '▶️ Começo', done: '✅ Terminado', inc: '⚠️ Não terminado', why: 'Porque não está terminado? (obrigatório)', whyPh: 'ex. falta uma peça, inquilino ausente…', note: 'Nota (opcional)', notePh: 'ex. torneira trocada, escada lavada', photos: 'Fotos (máx. 3)', send: 'Enviar', cancel: 'Cancelar',
    st: { encours: '▶️ Começado', fait: '✅ Terminado', incomplet: '⚠️ Não terminado' }, at: 'às', consignes: 'Instruções', contact: 'Contacto no local', call: 'Ligar', commons: 'Partes comuns',
    sched: 'O meu horário', days: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'], noSched: 'Sem horário registado.',
    abs: 'As minhas ausências', absNow: (t, f) => `${t}${f ? ' até ' + f : ''}`, sick: 'Estou doente / ausente', types: { maladie: '🤒 Doença', conges: '🏖️ Pedido de férias', autre: '📌 Outra ausência' }, from: 'De', to: 'Até (inclusive)', cert: 'Atestado médico (foto)', sickOk: 'Enviado ✓ O seu responsável foi avisado.',
    info: 'Os meus dados', tel: 'Telefone', mail: 'Email', adr: 'Morada', ville: 'Código postal e cidade', save: 'Enviar', infoOk: 'Enviado ✓',
    pending: (n) => `⏳ ${n} envio${n > 1 ? 's' : ''} em espera: ${n > 1 ? 'partirão' : 'partirá'} quando houver rede.`, retry: 'Tentar de novo', sent: 'Enviado ✓',
    install: 'Adicione a app ao ecrã inicial: iPhone → Partilhar → « Adicionar ao ecrã principal »; Android → ⋮ → « Instalar app ».', logout: 'Sair deste telemóvel', personal: 'Este link é pessoal.', rgpd: 'Os seus dados estão cifrados. O seu responsável vê o que envia (estados, notas, fotos, ausências, dados).', need: 'Escreva porque não está terminado.',
  },
  de: {
    loc: 'de-LU', app: 'Team-App', welcome: 'Ihr Plan, Ihre Einsätze und Abwesenheiten, auf dem Telefon.', code: 'Ihr persönlicher Code', codePh: 'z. B. K7PM2-QXA4H', enter: 'Anmelden', noCode: 'Kein Code? Fragen Sie Ihren Verantwortlichen.', badCode: 'Unbekannter Code. Prüfen Sie ihn oder fragen Sie nach einem neuen.', off: 'Dieser Zugang wurde deaktiviert. Fragen Sie nach einem neuen Code.', mismatch: 'Dieser Code ist für die Mieter-App.',
    hello: 'Hallo', today: 'Heute', next: 'Nächste Tage', none: 'Heute nichts geplant.', noneNext: 'Nichts geplant.', late: 'verspätet', start: '▶️ Ich fange an', done: '✅ Fertig', inc: '⚠️ Nicht fertig', why: 'Warum nicht fertig? (Pflicht)', whyPh: 'z. B. Teil fehlt, Mieter nicht da…', note: 'Notiz (optional)', notePh: 'z. B. Hahn gewechselt, Treppe geputzt', photos: 'Fotos (max. 3)', send: 'Senden', cancel: 'Abbrechen',
    st: { encours: '▶️ Begonnen', fait: '✅ Fertig', incomplet: '⚠️ Nicht fertig' }, at: 'um', consignes: 'Anweisungen', contact: 'Kontakt vor Ort', call: 'Anrufen', commons: 'Gemeinschaftsbereiche',
    sched: 'Meine Arbeitszeiten', days: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'], noSched: 'Keine Arbeitszeiten erfasst.',
    abs: 'Meine Abwesenheiten', absNow: (t, f) => `${t}${f ? ' bis ' + f : ''}`, sick: 'Ich bin krank / abwesend', types: { maladie: '🤒 Krankheit', conges: '🏖️ Urlaubsantrag', autre: '📌 Andere Abwesenheit' }, from: 'Von', to: 'Bis (einschl.)', cert: 'Ärztliches Attest (Foto)', sickOk: 'Gesendet ✓ Ihr Verantwortlicher ist informiert.',
    info: 'Meine Kontaktdaten', tel: 'Telefon', mail: 'E-Mail', adr: 'Adresse', ville: 'PLZ und Ort', save: 'Senden', infoOk: 'Gesendet ✓',
    pending: (n) => `⏳ ${n} Sendung${n > 1 ? 'en' : ''} wartet: wird gesendet, sobald Netz da ist.`, retry: 'Erneut versuchen', sent: 'Gesendet ✓',
    install: 'App zum Startbildschirm hinzufügen: iPhone → Teilen → „Zum Home-Bildschirm“; Android → ⋮ → „App installieren“.', logout: 'Von diesem Telefon abmelden', personal: 'Dieser Link ist persönlich.', rgpd: 'Ihre Daten sind verschlüsselt. Ihr Verantwortlicher sieht, was Sie senden (Status, Notizen, Fotos, Abwesenheiten, Kontaktdaten).', need: 'Schreiben Sie, warum es nicht fertig ist.',
  },
  en: {
    loc: 'en-GB', app: 'Team app', welcome: 'Your schedule, your jobs and your absences, on your phone.', code: 'Your personal code', codePh: 'e.g. K7PM2-QXA4H', enter: 'Enter', noCode: 'No code? Ask your manager.', badCode: 'Unknown code. Check it or ask for a new one.', off: 'This access has been disabled. Ask your manager for a new code.', mismatch: 'This code is for the tenants app.',
    hello: 'Hello', today: 'Today', next: 'Next days', none: 'Nothing planned today.', noneNext: 'Nothing planned.', late: 'late', start: '▶️ I’m starting', done: '✅ Done', inc: '⚠️ Not finished', why: 'Why is it not finished? (required)', whyPh: 'e.g. a part is missing, tenant not home…', note: 'Note (optional)', notePh: 'e.g. tap replaced, stairs cleaned', photos: 'Photos (max. 3)', send: 'Send', cancel: 'Cancel',
    st: { encours: '▶️ Started', fait: '✅ Done', incomplet: '⚠️ Not finished' }, at: 'at', consignes: 'Instructions', contact: 'Contact on site', call: 'Call', commons: 'Common areas',
    sched: 'My hours', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], noSched: 'No hours recorded.',
    abs: 'My absences', absNow: (t, f) => `${t}${f ? ' until ' + f : ''}`, sick: 'I’m sick / absent', types: { maladie: '🤒 Sick leave', conges: '🏖️ Holiday request', autre: '📌 Other absence' }, from: 'From', to: 'To (included)', cert: 'Medical certificate (photo)', sickOk: 'Sent ✓ Your manager has been told.',
    info: 'My details', tel: 'Phone', mail: 'Email', adr: 'Address', ville: 'Postcode and town', save: 'Send', infoOk: 'Sent ✓',
    pending: (n) => `⏳ ${n} update${n > 1 ? 's' : ''} waiting: will be sent as soon as there is signal.`, retry: 'Retry', sent: 'Sent ✓',
    install: 'Add the app to your home screen: iPhone → Share → “Add to Home Screen”; Android → ⋮ → “Install app”.', logout: 'Log out of this phone', personal: 'This link is personal.', rgpd: 'Your data is encrypted. Your manager sees what you send (statuses, notes, photos, absences, details).', need: 'Write why it is not finished.',
  },
  es: {
    loc: 'es-ES', app: 'App del equipo', welcome: 'Tu planificación, tus intervenciones y tus ausencias, en el móvil.', code: 'Tu código personal', codePh: 'ej. K7PM2-QXA4H', enter: 'Entrar', noCode: '¿No tienes código? Pídeselo a tu responsable.', badCode: 'Código desconocido. Compruébalo o pide uno nuevo.', off: 'Este acceso ha sido desactivado. Pide un nuevo código a tu responsable.', mismatch: 'Este código es para la app de inquilinos.',
    hello: 'Hola', today: 'Hoy', next: 'Próximos días', none: 'Nada previsto hoy.', noneNext: 'Nada previsto.', late: 'con retraso', start: '▶️ Empiezo', done: '✅ Terminado', inc: '⚠️ No terminado', why: '¿Por qué no está terminado? (obligatorio)', whyPh: 'ej. falta una pieza, inquilino ausente…', note: 'Nota (opcional)', notePh: 'ej. grifo cambiado, escalera limpia', photos: 'Fotos (máx. 3)', send: 'Enviar', cancel: 'Cancelar',
    st: { encours: '▶️ Empezado', fait: '✅ Terminado', incomplet: '⚠️ No terminado' }, at: 'a las', consignes: 'Instrucciones', contact: 'Contacto en el lugar', call: 'Llamar', commons: 'Zonas comunes',
    sched: 'Mi horario', days: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], noSched: 'Sin horario registrado.',
    abs: 'Mis ausencias', absNow: (t, f) => `${t}${f ? ' hasta el ' + f : ''}`, sick: 'Estoy enfermo / ausente', types: { maladie: '🤒 Enfermedad', conges: '🏖️ Solicitud de vacaciones', autre: '📌 Otra ausencia' }, from: 'Desde', to: 'Hasta (incluido)', cert: 'Certificado médico (foto)', sickOk: 'Enviado ✓ Tu responsable está avisado.',
    info: 'Mis datos', tel: 'Teléfono', mail: 'Email', adr: 'Dirección', ville: 'Código postal y ciudad', save: 'Enviar', infoOk: 'Enviado ✓',
    pending: (n) => `⏳ ${n} envío${n > 1 ? 's' : ''} pendiente${n > 1 ? 's' : ''}: saldrá${n > 1 ? 'n' : ''} en cuanto haya cobertura.`, retry: 'Reintentar', sent: 'Enviado ✓',
    install: 'Añade la app a la pantalla de inicio: iPhone → Compartir → « Añadir a pantalla de inicio »; Android → ⋮ → « Instalar app ».', logout: 'Cerrar sesión en este móvil', personal: 'Este enlace es personal.', rgpd: 'Tus datos están cifrados. Tu responsable ve lo que envías (estados, notas, fotos, ausencias, datos).', need: 'Escribe por qué no está terminado.',
  },
};
const ICONS = { nettoyage: '🧹', reparation: '🔧', gros: '🚚', autre: '📌', entretien: '🔧' };
let data = null, lang = 'fr', loadErr = '', form = null, flash = '';
const app = document.getElementById('app');
const T = () => L[lang] || L.fr;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = isoDay(new Date());
const fmt = (s) => (s ? new Date(s.slice(0, 10) + 'T12:00:00').toLocaleDateString(T().loc, { day: 'numeric', month: 'long' }) : '');
const fmtDay = (s) => new Date(s + 'T12:00:00').toLocaleDateString(T().loc, { weekday: 'long', day: 'numeric', month: 'long' });
const pick = (d) => { const nav = (navigator.language || 'fr').slice(0, 2); return (d && L[d.lang] && d.lang) || (L[nav] ? nav : 'fr'); };
try { const s = localStorage.getItem('eqLang'); if (s && L[s]) lang = s; } catch {}

// ── File d'attente : les envois partent dès qu'il y a du réseau (et sont regroupés) ──
const QK = () => 'eqQueue:' + id, LK = () => 'eqLocal:' + id;
const getJ = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const setJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage plein */ } };
async function flush() {
  let q = getJ(QK());
  if (!q.length || !data || !data.signalKey) return;
  while (q.length) {
    // paquets de ~3 Mo maximum (photos comprises)
    const batch = [];
    let size = 0;
    for (const it of q) { const n = JSON.stringify(it).length; if (batch.length && size + n > 3e6) break; batch.push(it); size += n; }
    try {
      const body = await sealForOwner(data.signalKey, { espace: id, t: new Date().toISOString(), type: 'equipe', items: batch });
      const r = await fetch(`${API}/api/esp/${id}/signal`, { method: 'POST', body });
      if (!r.ok) break;
    } catch { break; }
    q = q.slice(batch.length);
    setJ(QK(), q);
  }
  render();
}
function queue(item) {
  const q = getJ(QK());
  q.push(item);
  setJ(QK(), q);
  if (item.k === 'task') { const loc = getJ(LK()).filter((x) => x.at > new Date(Date.now() - 30 * 864e5).toISOString()); loc.push({ tid: item.tid, d: item.d, st: item.st, note: item.note, at: item.at }); setJ(LK(), loc); }
  return flush();
}
// Dernier état connu d'une intervention un jour donné (serveur + ce téléphone)
function stateOf(tid, d) {
  const t = data.tasks[tid] || {};
  const all = [...(t.journal || []).filter((x) => x.d === d), ...getJ(LK()).filter((x) => x.tid === tid && x.d === d)];
  all.sort((a, b) => (a.at || '').localeCompare(b.at || ''));
  return all[all.length - 1] || null;
}

async function compress(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  const b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.72));
  const u = new Uint8Array(await b.arrayBuffer());
  let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function taskCard(it, withBtns) {
  const t = T(), x = data.tasks[it.tid];
  if (!x) return '';
  const st = stateOf(it.tid, it.d);
  const tel = x.contact && x.contact.tel ? x.contact.tel.replace(/[^\d+]/g, '') : '';
  const done = st && st.st === 'fait';
  const f = form && form.tid === it.tid && form.d === it.d ? form : null;
  const btns = withBtns && !done && !f ? `<div class="btns">${!st || st.st !== 'encours' ? `<button class="btn sec" data-act="encours" data-tid="${it.tid}" data-d="${it.d}">${esc(t.start)}</button>` : ''}
      <button class="btn ok" data-act="fait" data-tid="${it.tid}" data-d="${it.d}">${esc(t.done)}</button>
      <button class="btn warn" data-act="incomplet" data-tid="${it.tid}" data-d="${it.d}">${esc(t.inc)}</button></div>` : '';
  const fh = f ? `<form class="act" data-tid="${it.tid}" data-d="${it.d}" data-st="${f.st}"><b>${esc(t.st[f.st])}</b>
      <label>${esc(f.st === 'incomplet' ? t.why : t.note)}</label><textarea name="note" placeholder="${esc(f.st === 'incomplet' ? t.whyPh : t.notePh)}" ${f.st === 'incomplet' ? 'required' : ''}></textarea>
      <label>${esc(t.photos)}</label><input type="file" name="photos" accept="image/*" multiple>
      <div class="btns"><button class="btn" type="submit">${esc(t.send)}</button><button class="btn sec" type="button" data-cancel="1">${esc(t.cancel)}</button></div></form>` : '';
  return `<div class="task ${done ? 'done' : ''}">
    <div class="tt">${ICONS[x.type] || '📌'} <b>${esc(x.titre)}</b>${it.late ? ` <span class="tag bad">${esc(t.late)}</span>` : ''}</div>
    <div class="meta">📍 ${esc(x.adresse)} · ${esc(x.lieu || t.commons)}${x.recur ? ' · 🔁 ' + esc(x.recur) : ''}</div>
    ${x.note ? `<div class="cons"><b>${esc(t.consignes)} :</b> ${esc(x.note)}</div>` : ''}
    ${x.contact ? `<div class="meta">👤 ${esc(t.contact)} : ${esc(x.contact.nom)}${tel ? ` · <a href="tel:${esc(tel)}">📞 ${esc(t.call)}</a>` : ''}</div>` : ''}
    ${st ? `<div class="stline ${st.st}">${esc(t.st[st.st])} · ${esc(fmt(st.at))} ${esc(t.at)} ${esc((st.at || '').slice(11, 16))}${st.note ? ' — ' + esc(st.note) : ''}</div>` : ''}
    ${btns}${fh}</div>`;
}

function render() {
  const t = T();
  document.documentElement.lang = lang;
  const langs = `<div class="langs">${Object.keys(L).map((k) => `<button data-lang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('')}</div>`;
  const top = (name) => `<div class="top"><span class="brandx"><img class="top-logo" src="/ares/icons/nobis-logo.png" alt="" width="76" height="32"><b>${esc(name)}</b></span>${langs}</div>`;
  if (!data) {
    app.innerHTML = `${top('NOBIS s.a.r.l.')}
      <h1 style="text-align:center;margin-top:18px">👷 ${esc(t.app)}</h1><p class="sub" style="text-align:center">${esc(t.welcome)}</p>
      ${loadErr ? `<div class="card warnc"><p style="margin:0">${esc(loadErr)}</p></div>` : ''}
      <div class="card"><form id="codeForm"><label>${esc(t.code)}</label>
        <input type="text" name="code" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="${esc(t.codePh)}" style="font-size:22px;letter-spacing:.08em;text-align:center" required>
        <button class="btn block" style="margin-top:12px" type="submit">${esc(t.enter)}</button></form>
        <p class="meta" style="text-align:center;margin:10px 0 0">${esc(t.noCode)}</p></div>
      <p class="meta" style="text-align:center">${esc(t.install)}</p>`;
    return;
  }
  const d = data, out = [];
  document.title = `${t.app} — ${d.societe.nom}`;
  out.push(`${top(d.societe.nom)}<h1>${esc(t.hello)} ${esc(d.prenom || d.nom)} 👋</h1><p class="sub">${esc([d.metier, d.societe.nom].filter(Boolean).join(' · '))}</p>`);
  const q = getJ(QK());
  if (q.length) out.push(`<div class="card warnc"><p style="margin:0 0 8px">${esc(t.pending(q.length))}</p><button class="btn sec sm" data-retry="1">${esc(t.retry)}</button></div>`);
  if (flash) out.push(`<div class="card okc"><p style="margin:0">${esc(flash)}</p></div>`);
  const absNow = (d.absences || []).find((a) => a.debut <= today && (!a.fin || a.fin >= today));
  if (absNow) out.push(`<div class="card warnc"><p style="margin:0"><b>${esc(t.absNow(t.types[absNow.type] || absNow.type, fmt(absNow.fin)))}</b></p></div>`);
  const todays = d.items.filter((x) => x.d <= today && (x.d === today || x.late));
  out.push(`<div class="card"><h2>📅 ${esc(t.today)} · ${esc(fmtDay(today))}</h2>${todays.length ? todays.map((x) => taskCard(x, true)).join('') : `<p class="meta" style="margin:0">${esc(t.none)}</p>`}</div>`);
  const nexts = d.items.filter((x) => x.d > today);
  const byDay = {};
  for (const x of nexts) (byDay[x.d] ||= []).push(x);
  out.push(`<div class="card"><h2>🗓️ ${esc(t.next)}</h2>${nexts.length ? Object.keys(byDay).sort().map((dd) => `<div class="day">${esc(fmtDay(dd))}</div>${byDay[dd].map((x) => taskCard(x, false)).join('')}`).join('') : `<p class="meta" style="margin:0">${esc(t.noneNext)}</p>`}</div>`);
  const hs = (d.horaires || []).slice().sort((a, b) => a.j - b.j);
  out.push(`<div class="card"><h2>🕒 ${esc(t.sched)}</h2>${hs.length ? hs.map((h) => `<div class="row"><b style="width:110px">${esc(t.days[h.j])}</b><span class="grow">${esc(h.de)}–${esc(h.a)}${h.lieu ? `<br><span class="meta">📍 ${esc(h.lieu)}</span>` : ''}</span></div>`).join('') : `<p class="meta" style="margin:0">${esc(t.noSched)}</p>`}</div>`);
  const absList = (d.absences || []).filter((a) => !a.fin || a.fin >= today);
  out.push(`<div class="card"><h2>🤒 ${esc(t.abs)}</h2>${absList.map((a) => `<div class="row"><span class="grow">${esc(t.types[a.type] || a.type)} · ${esc(fmt(a.debut))}${a.fin ? ' → ' + esc(fmt(a.fin)) : ''}</span></div>`).join('')}
    <details class="more"><summary>${esc(t.sick)}</summary><form id="absForm">
      <label>${esc(t.abs)}</label><select name="type">${Object.entries(t.types).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
      <label>${esc(t.from)}</label><input type="date" name="debut" value="${today}" required>
      <label>${esc(t.to)}</label><input type="date" name="fin">
      <label>${esc(t.note)}</label><textarea name="note" style="min-height:70px"></textarea>
      <label>${esc(t.cert)}</label><input type="file" name="photo" accept="image/*">
      <button class="btn block" style="margin-top:12px" type="submit">${esc(t.send)}</button></form></details></div>`);
  out.push(`<div class="card"><details class="more"><summary>✏️ ${esc(t.info)}</summary><form id="infoForm">
      <label>${esc(t.tel)}</label><input type="tel" name="tel" value="${esc(d.me.tel)}">
      <label>${esc(t.mail)}</label><input type="email" name="mail" value="${esc(d.me.mail)}">
      <label>${esc(t.adr)}</label><input type="text" name="adresse" value="${esc(d.me.adresse)}">
      <label>${esc(t.ville)}</label><input type="text" name="ville" value="${esc(d.me.ville)}">
      <button class="btn block" style="margin-top:12px" type="submit">${esc(t.save)}</button></form></details></div>`);
  out.push(`<p class="meta" style="text-align:center">${esc(t.install)}</p>
    <div class="card notice"><p class="meta" style="margin:0">🔒 ${esc(t.rgpd)}</p><p class="meta" style="margin:8px 0 0"><a href="#" data-logout="1">${esc(t.logout)}</a> · ${esc(t.personal)}${d.societe.tel ? ` · ${esc(d.societe.nom)} <a href="tel:${esc(d.societe.tel.replace(/[^\d+]/g, ''))}">${esc(d.societe.tel)}</a>` : ''}</p></div>`);
  app.innerHTML = out.join('');
}

app.addEventListener('click', async (e) => {
  const lb = e.target.closest('[data-lang]');
  if (lb) { lang = lb.dataset.lang; try { localStorage.setItem('eqLang', lang); } catch {} return render(); }
  if (e.target.closest('[data-logout]')) { e.preventDefault(); try { localStorage.removeItem(ACC); } catch {} id = key = ''; data = null; loadErr = ''; return render(); }
  if (e.target.closest('[data-retry]')) return flush();
  if (e.target.closest('[data-cancel]')) { form = null; return render(); }
  const ab = e.target.closest('[data-act]');
  if (ab) {
    flash = '';
    const { act, tid, d } = ab.dataset;
    if (act === 'encours') { await queue({ k: 'task', tid, d, st: 'encours', note: '', at: new Date().toISOString() }); return render(); }
    form = { tid, d, st: act };
    render();
    const ta = app.querySelector('form.act textarea'); if (ta) ta.focus();
  }
});
app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target, t = T(), btn = f.querySelector('button[type=submit]');
  if (f.id === 'codeForm') {
    btn.disabled = true; btn.textContent = '…';
    try {
      const code = f.code.value;
      const r = await fetch(`${API}/api/esp-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ h: await codeHash(code) }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 404 ? t.badCode : j.error || r.status);
      id = j.id; key = await unwrapWithCode(code, j.salt, j.wk);
      try { localStorage.setItem(ACC, id + '.' + key); } catch {}
      loadErr = '';
      await load();
    } catch (err) { loadErr = err.message || String(err); render(); }
    return;
  }
  btn.disabled = true; btn.textContent = '…';
  try {
    if (f.classList.contains('act')) {
      const note = f.note.value.trim();
      if (f.dataset.st === 'incomplet' && !note) { alert(t.need); btn.disabled = false; btn.textContent = t.send; return; }
      const photos = [];
      for (const file of [...f.photos.files].slice(0, 3)) photos.push(await compress(file));
      form = null;
      await queue({ k: 'task', tid: f.dataset.tid, d: f.dataset.d, st: f.dataset.st, note, photos, at: new Date().toISOString() });
      flash = t.sent;
    } else if (f.id === 'absForm') {
      const photos = f.photo.files[0] ? [await compress(f.photo.files[0])] : [];
      await queue({ k: 'abs', type: f.type.value, debut: f.debut.value, fin: f.fin.value, note: f.note.value.trim(), photos, at: new Date().toISOString() });
      flash = t.sickOk;
    } else if (f.id === 'infoForm') {
      await queue({ k: 'info', tel: f.tel.value, mail: f.mail.value, adresse: f.adresse.value, ville: f.ville.value, at: new Date().toISOString() });
      flash = t.infoOk;
    }
  } catch (err) { alert('⚠ ' + (err.message || err)); }
  render();
  scrollTo(0, 0);
});

async function load() {
  data = null;
  if (id && key) {
    try {
      const r = await fetch(`${API}/api/esp/${id}`, { cache: 'no-store' });
      if (r.ok) {
        const x = await openJson(key, await r.arrayBuffer());
        if (x && x.kind === 'equipe') data = x;
        else { loadErr = T().mismatch; try { localStorage.removeItem(ACC); } catch {} location.replace(`/espace.html#${id}.${key}`); return; }
      } else if (r.status === 404) { try { localStorage.removeItem(ACC); } catch {} id = key = ''; loadErr = T().off; }
    } catch { loadErr = '⚠ offline'; }
  }
  try { if (!localStorage.getItem('eqLang')) lang = pick(data); } catch { lang = pick(data); }
  render();
  flush();
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && id && key && !form) load(); });
addEventListener('online', () => flush());
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/equipe-sw.js', { scope: '/equipe' }).catch(() => {});
lang = (() => { try { return localStorage.getItem('eqLang') || pick(null); } catch { return pick(null); } })();
load();
