// 🚕 Page du chauffeur (lien reçu par WhatsApp / SMS, rien à installer) : il va chercher le client (trajet 1, vu par le client),
// puis « client à bord » → vers l'hôtel / le logement (trajet 2, vu par l'établissement). Seule l'heure d'arrivée est envoyée.
const API = document.querySelector('meta[name="esp-api"]').content.replace(/\/$/, '');
const app = document.getElementById('app');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let info = null;
try { info = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(location.hash.slice(1).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((location.hash.length + 2) % 4)), (c) => c.charCodeAt(0)))); } catch { info = null; }
const lg = (navigator.language || 'fr').slice(0, 2);
const W = {
  fr: { t: 'Course', pick: 'Prendre le client', to: 'Destination', go1: '🚕 Je pars chercher le client', at1: '📍 Je suis sur place', board: '🧳 Client à bord', at2: '✅ Arrivé à destination', mins: 'Arrivée dans :', gps: 'Votre heure d’arrivée est calculée avec la position du téléphone (elle n’est pas envoyée).', done: 'Course terminée — merci !', bad: 'Lien incomplet.', call: '📞 Appeler le client', nav: '🧭 Itinéraire', flight: 'Vol / train' },
  en: { t: 'Ride', pick: 'Pick up the guest', to: 'Destination', go1: '🚕 I’m going to pick up the guest', at1: '📍 I’m at the pickup point', board: '🧳 Guest on board', at2: '✅ Arrived at destination', mins: 'Arriving in:', gps: 'Your arrival time is computed from the phone position (the position is not sent).', done: 'Ride finished — thank you!', bad: 'Incomplete link.', call: '📞 Call the guest', nav: '🧭 Directions', flight: 'Flight / train' },
  de: { t: 'Fahrt', pick: 'Gast abholen', to: 'Ziel', go1: '🚕 Ich fahre zum Gast', at1: '📍 Ich bin vor Ort', board: '🧳 Gast an Bord', at2: '✅ Am Ziel angekommen', mins: 'Ankunft in:', gps: 'Ihre Ankunftszeit wird aus der Position des Telefons berechnet (die Position wird nicht gesendet).', done: 'Fahrt beendet — danke!', bad: 'Unvollständiger Link.', call: '📞 Gast anrufen', nav: '🧭 Route', flight: 'Flug / Zug' },
  it: { t: 'Corsa', pick: 'Prendere il cliente', to: 'Destinazione', go1: '🚕 Parto a prendere il cliente', at1: '📍 Sono sul posto', board: '🧳 Cliente a bordo', at2: '✅ Arrivato a destinazione', mins: 'Arrivo tra:', gps: 'L’ora di arrivo è calcolata con la posizione del telefono (la posizione non viene inviata).', done: 'Corsa terminata — grazie!', bad: 'Link incompleto.', call: '📞 Chiama il cliente', nav: '🧭 Percorso', flight: 'Volo / treno' },
  pt: { t: 'Corrida', pick: 'Buscar o cliente', to: 'Destino', go1: '🚕 Vou buscar o cliente', at1: '📍 Estou no local', board: '🧳 Cliente a bordo', at2: '✅ Cheguei ao destino', mins: 'Chegada dentro de:', gps: 'A hora de chegada é calculada com a posição do telemóvel (a posição não é enviada).', done: 'Corrida terminada — obrigado!', bad: 'Link incompleto.', call: '📞 Ligar ao cliente', nav: '🧭 Itinerário', flight: 'Voo / comboio' },
  es: { t: 'Carrera', pick: 'Recoger al cliente', to: 'Destino', go1: '🚕 Voy a recoger al cliente', at1: '📍 Estoy en el lugar', board: '🧳 Cliente a bordo', at2: '✅ Llegado a destino', mins: 'Llegada en:', gps: 'La hora de llegada se calcula con la posición del teléfono (la posición no se envía).', done: 'Carrera terminada — ¡gracias!', bad: 'Enlace incompleto.', call: '📞 Llamar al cliente', nav: '🧭 Ruta', flight: 'Vuelo / tren' },
};
const t = W[lg] || W.fr;
const K = 'drv:' + ((info && info.t1) || '');
let phase = (() => { try { return localStorage.getItem(K) || 'idle'; } catch { return 'idle'; } })();
const setPhase = (p) => { phase = p; try { localStorage.setItem(K, p); } catch { /* stockage indisponible */ } render(); };
const hav = (a, b) => { const R = 6371, r = (x) => (x * Math.PI) / 180, dl = r(b.lat - a.lat), dn = r(b.lon - a.lon); const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
async function post(tk, st, eta) {
  try { await fetch(`${API}/api/trip/${tk}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ st, eta, n: info.d || 'Taxi' }) }); } catch { /* hors ligne : prochain envoi */ }
}
// pendant un trajet : heure d'arrivée recalculée avec la position (si connue), envoyée au plus une fois par minute
let watch = null, last = 0;
function follow(tk, dest) {
  if (watch != null) navigator.geolocation.clearWatch(watch);
  watch = null;
  if (!dest || !navigator.geolocation) return;
  watch = navigator.geolocation.watchPosition((p) => {
    if (Date.now() - last < 60000) return;
    last = Date.now();
    const km = hav({ lat: p.coords.latitude, lon: p.coords.longitude }, dest) * 1.25;
    post(tk, 'go', Date.now() + (Math.round(km / 0.75) + 2) * 60000);
  }, () => {}, { maximumAge: 60000, timeout: 20000 });
}
function render() {
  if (!info || !info.t1 || !info.t2) { app.innerHTML = `<div class="card warnc"><p style="margin:0">${esc(t.bad)}</p></div>`; return; }
  const tel = String(info.gt || '').replace(/[^\d+]/g, '');
  const mins = (act) => `<p class="meta" style="margin:10px 0 4px">${esc(t.mins)}</p><div class="btns">${[5, 10, 15, 20, 30, 45].map((m) => `<button class="btn sm sec" data-act="${act}" data-m="${m}">${m} min</button>`).join('')}</div>`;
  const nav = (q) => (q ? `<a class="btn sm sec" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}" target="_blank" rel="noopener">${esc(t.nav)}</a>` : '');
  app.innerHTML = `<h1>🚕 ${esc(t.t)} · ${esc(info.n)}</h1>
    <div class="card"><p style="margin:0"><b>${esc(t.pick)} :</b> ${esc(info.f)}${info.q ? ' · 🕒 ' + esc(String(info.q).replace('T', ' ')) : ''}</p>
      ${info.v ? `<p class="meta" style="margin:4px 0 0">✈️ ${esc(t.flight)} : ${esc(info.v)}</p>` : ''}
      <p style="margin:8px 0 0"><b>${esc(t.to)} :</b> ${esc(info.s)}${info.sa ? ' — ' + esc(info.sa) : ''}</p>
      <div class="btns">${tel ? `<a class="btn sm" href="tel:${esc(tel)}">${esc(t.call)}</a>` : ''}${nav(phase === 'board' ? info.sa : info.f)}</div></div>
    <div class="card">
      ${phase === 'idle' ? `<button class="btn block big" data-act="go1">${esc(t.go1)}</button>${mins('go1')}` : ''}
      ${phase === 'go1' ? `<button class="btn block big" data-act="at1">${esc(t.at1)}</button>${mins('go1')}` : ''}
      ${phase === 'at1' ? `<button class="btn block big" data-act="board">${esc(t.board)}</button>` : ''}
      ${phase === 'board' ? `<button class="btn block big ok" data-act="at2">${esc(t.at2)}</button>${mins('board')}` : ''}
      ${phase === 'done' ? `<p class="okc" style="margin:0">${esc(t.done)}</p>` : ''}
      <p class="meta" style="margin:10px 0 0">${esc(t.gps)}</p></div>`;
}
app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || !info) return;
  const a = b.dataset.act, m = +b.dataset.m || 0;
  if (a === 'go1') { post(info.t1, 'go', Date.now() + (m || 20) * 60000); if (phase === 'idle') { follow(info.t1, info.fg); setPhase('go1'); } return; }
  if (a === 'at1') { post(info.t1, 'here'); follow(null, null); return setPhase('at1'); }
  if (a === 'board') { post(info.t2, 'go', Date.now() + (m || 25) * 60000); if (phase !== 'board') { follow(info.t2, info.sg); setPhase('board'); } return; }
  if (a === 'at2') { post(info.t2, 'here'); post(info.t1, 'stop'); follow(null, null); return setPhase('done'); }
});
render();
if (phase === 'go1') follow(info && info.t1, info && info.fg);
if (phase === 'board') follow(info && info.t2, info && info.sg);
