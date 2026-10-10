// Page publique d'un devis (lien ou QR code envoyé au client) : voir, imprimer, signer « Bon pour accord » sur son téléphone
const API = document.querySelector('meta[name="ptl-api"]').content.replace(/\/$/, '') + '/api/portail/pub/devis/';
const main = document.getElementById('main');
const token = (/[#&]t=([0-9a-f]{48})/.exec(location.hash) || [])[1] || '';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const eur = (n) => (Math.round((+n || 0) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const day = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const when = (ms) => new Date(ms).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
let D = null, pdfUrl = '';

async function load() {
  if (!token) { main.innerHTML = '<div class="card ko"><b>Lien incomplet.</b><p class="note">Ouvrez le lien complet reçu par WhatsApp, SMS ou email, ou scannez à nouveau le QR code.</p></div>'; return; }
  try {
    const r = await fetch(API + token, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Devis introuvable');
    D = j; render();
  } catch (e) { main.innerHTML = `<div class="card ko"><b>${esc(e.message)}</b><p class="note">Contactez LuxInterventions au +352 691 423 943.</p></div>`; }
}
async function pdf() {
  if (!pdfUrl) { const r = await fetch(API + token + '/pdf', { cache: 'no-store' }); if (!r.ok) throw new Error('PDF indisponible'); pdfUrl = URL.createObjectURL(await r.blob()); }
  return pdfUrl;
}
function render() {
  const ct = D.kind === 'contrat';
  const head = `<div class="card"><h1>${ct ? 'Offre de service' : 'Votre devis'}</h1><p class="no">N° ${esc(D.no)}</p>
    <dl class="kv">${D.client ? `<dt>Client</dt><dd>${esc(D.client)}</dd>` : ''}${D.title ? `<dt>Objet</dt><dd>${esc(D.title)}</dd>` : ''}
      <dt>${ct ? 'Forfait' : 'Total'}</dt><dd class="big">${eur(D.ttc)} TTC${ct ? ' / mois' : ''}</dd>
      ${D.pct ? `<dt>Acompte</dt><dd>${D.pct} % à l’accord : ${eur(D.acompte)}</dd>` : ''}
      ${D.valid_until ? `<dt>Valable jusqu’au</dt><dd>${day(D.valid_until)}</dd>` : ''}</dl>
    <div class="row"><button class="btn" data-a="view">📄 Voir le devis complet</button><button class="btn" data-a="dl">⬇️ Télécharger / imprimer</button></div>
    <iframe id="pv" title="Devis" hidden></iframe></div>`;
  let tail;
  if (D.status === 'accepte') tail = `<div class="card ok"><b>✅ Devis accepté et signé</b><p class="note">Signé par ${esc(D.sign_name || 'le client')} le ${when(D.decided_at)}. Merci pour votre confiance : LuxInterventions vous contacte pour organiser les travaux.</p></div>`;
  else if (D.status === 'refuse') tail = `<div class="card ko"><b>Devis refusé</b><p class="note">Réponse enregistrée le ${when(D.decided_at)}. Une question ? +352 691 423 943.</p></div>`;
  else if (D.expired) tail = '<div class="card ko"><b>Ce devis a expiré.</b><p class="note">Demandez une offre à jour à LuxInterventions : +352 691 423 943 · info@luxinterventions.com</p></div>';
  else tail = `<form class="card" id="sf"><h2 style="font-size:19px">✍️ Bon pour accord</h2>
    <p class="note">Lisez le devis complet, puis signez avec le doigt pour l’accepter.</p>
    <label class="f" for="nom">Nom et prénom</label><input type="text" id="nom" autocomplete="name">
    ${D.part ? `<p class="note">Vous disposez de <b>14 jours</b> après la signature pour vous rétracter, sans motif et sans frais (formulaire dans le devis).</p>
      <label class="chk"><input type="checkbox" id="early"><span>Je demande que les travaux commencent avant la fin du délai de rétractation. Si je me rétracte ensuite, je paierai les travaux déjà réalisés.</span></label>` : ''}
    <label class="f">Signature</label><canvas width="600" height="220" id="pad"></canvas>
    <div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="clear" style="flex:0 0 auto">Effacer</button></div>
    <p class="err" id="err"></p>
    <button class="btn primary block" type="submit">✅ J’accepte le devis et je signe</button>
    <div style="text-align:center;margin-top:8px"><button type="button" class="btn ghost" data-a="refuse">Refuser ce devis</button></div></form>`;
  main.innerHTML = head + tail;
  const c = document.getElementById('pad');
  if (c) pad(c);
}
// signature au doigt
let drawn = false;
function pad(c) {
  const x = c.getContext('2d');
  let on = null;
  c.addEventListener('pointerdown', (ev) => {
    ev.preventDefault(); c.setPointerCapture(ev.pointerId);
    const r = c.getBoundingClientRect(); on = (q) => [(q.clientX - r.left) * (c.width / r.width), (q.clientY - r.top) * (c.height / r.height)];
    x.lineWidth = 3.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#0b1f4d';
    const [a, b] = on(ev); x.beginPath(); x.moveTo(a, b); x.lineTo(a + 0.1, b + 0.1); x.stroke(); drawn = true;
  });
  c.addEventListener('pointermove', (ev) => { if (!on) return; const [a, b] = on(ev); x.lineTo(a, b); x.stroke(); });
  const up = () => { on = null; };
  c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
}
async function send(body) {
  const r = await fetch(API + token + '/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Envoi impossible');
}
document.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-a]'); if (!a) return;
  const k = a.dataset.a;
  try {
    if (k === 'view') { const f = document.getElementById('pv'); f.src = await pdf(); f.hidden = false; f.scrollIntoView({ behavior: 'smooth' }); }
    if (k === 'dl') { const l = document.createElement('a'); l.href = await pdf(); l.download = `Devis-${D.no}.pdf`; document.body.appendChild(l); l.click(); l.remove(); }
    if (k === 'clear') { const c = document.getElementById('pad'); c.getContext('2d').clearRect(0, 0, c.width, c.height); drawn = false; }
    if (k === 'refuse') {
      if (!confirm('Refuser ce devis ? LuxInterventions sera prévenu.')) return;
      await send({ status: 'refuse', nom: (document.getElementById('nom') || {}).value || '' }); await load();
    }
  } catch (err) { const m = document.getElementById('err'); if (m) m.textContent = err.message; else alert(err.message); }
});
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'sf') return;
  e.preventDefault();
  const err = document.getElementById('err'), nom = document.getElementById('nom').value.trim();
  if (!nom) { err.textContent = 'Indiquez votre nom et prénom.'; return; }
  if (!drawn) { err.textContent = 'Signez dans le cadre blanc avec le doigt.'; return; }
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Envoi…';
  try {
    await send({ status: 'accepte', nom, png: document.getElementById('pad').toDataURL('image/png'), early: !!(document.getElementById('early') || {}).checked });
    await load(); window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = '✅ J’accepte le devis et je signe'; }
});
load();
