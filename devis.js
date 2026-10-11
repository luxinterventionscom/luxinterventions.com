// Page publique d'un devis (lien ou QR code envoyé au client) : voir, imprimer, signer « Bon pour accord » sur son téléphone
// Langue : celle du téléphone (fr, it, de, pt, en, es) ; le devis PDF lui-même reste en français.
const API = document.querySelector('meta[name="ptl-api"]').content.replace(/\/$/, '') + '/api/portail/pub/devis/';
const main = document.getElementById('main');
const token = (/[#&]t=([0-9a-f]{48})/.exec(location.hash) || [])[1] || '';
const TX = {
  fr: { loc: 'fr-FR', title: 'Votre devis', offer: 'Offre de service', no: 'N°', client: 'Client', obj: 'Objet', total: 'Total', forfait: 'Forfait', ttc: 'TTC', month: ' / mois', dep: 'Acompte', depTx: (p, a) => `${p} % à l’accord : ${a}`, valid: 'Valable jusqu’au', view: '📄 Voir le devis complet', dl: '⬇️ Télécharger / imprimer', okT: '✅ Devis accepté et signé', okTx: (n, d) => `Signé par ${n} le ${d}. Merci pour votre confiance : LuxInterventions vous contacte pour organiser les travaux.`, theClient: 'le client', refT: 'Devis refusé', refTx: (d) => `Réponse enregistrée le ${d}. Une question ? +352 691 423 943.`, expT: 'Ce devis a expiré.', expTx: 'Demandez une offre à jour à LuxInterventions : +352 691 423 943 · info@luxinterventions.com', sign: '✍️ Bon pour accord', signTx: 'Lisez le devis complet, puis signez avec le doigt pour l’accepter.', name: 'Nom et prénom', retr: 'Vous disposez de <b>14 jours</b> après la signature pour vous rétracter, sans motif et sans frais (formulaire dans le devis).', early: 'Je demande que les travaux commencent avant la fin du délai de rétractation. Si je me rétracte ensuite, je paierai les travaux déjà réalisés.', sig: 'Signature', clear: 'Effacer', accept: '✅ J’accepte le devis et je signe', refuse: 'Refuser ce devis', refuseQ: 'Refuser ce devis ? LuxInterventions sera prévenu.', needName: 'Indiquez votre nom et prénom.', needSig: 'Signez dans le cadre blanc avec le doigt.', sending: 'Envoi…', badLink: 'Lien incomplet.', badLinkTx: 'Ouvrez le lien complet reçu par WhatsApp, SMS ou email, ou scannez à nouveau le QR code.', contact: 'Contactez LuxInterventions au +352 691 423 943.', notFound: 'Devis introuvable', noPdf: 'PDF indisponible', sendErr: 'Envoi impossible', doc: 'Devis' },
  it: { loc: 'it-IT', title: 'Il vostro preventivo', offer: 'Offerta di servizio', no: 'N°', client: 'Cliente', obj: 'Oggetto', total: 'Totale', forfait: 'Canone', ttc: 'IVA incl.', month: ' / mese', dep: 'Acconto', depTx: (p, a) => `${p} % all’accettazione: ${a}`, valid: 'Valido fino al', view: '📄 Vedi il preventivo completo', dl: '⬇️ Scarica / stampa', okT: '✅ Preventivo accettato e firmato', okTx: (n, d) => `Firmato da ${n} il ${d}. Grazie per la fiducia: LuxInterventions vi contatta per organizzare i lavori.`, theClient: 'il cliente', refT: 'Preventivo rifiutato', refTx: (d) => `Risposta registrata il ${d}. Una domanda? +352 691 423 943.`, expT: 'Questo preventivo è scaduto.', expTx: 'Chiedete un’offerta aggiornata a LuxInterventions: +352 691 423 943 · info@luxinterventions.com', sign: '✍️ Per accettazione', signTx: 'Leggete il preventivo completo, poi firmate con il dito per accettarlo.', name: 'Nome e cognome', retr: 'Avete <b>14 giorni</b> dopo la firma per recedere, senza motivo e senza spese (modulo nel preventivo).', early: 'Chiedo che i lavori inizino prima della fine del periodo di recesso. Se poi recedo, pagherò i lavori già eseguiti.', sig: 'Firma', clear: 'Cancella', accept: '✅ Accetto il preventivo e firmo', refuse: 'Rifiuta questo preventivo', refuseQ: 'Rifiutare questo preventivo? LuxInterventions sarà avvisata.', needName: 'Indicate nome e cognome.', needSig: 'Firmate nel riquadro bianco con il dito.', sending: 'Invio…', badLink: 'Link incompleto.', badLinkTx: 'Aprite il link completo ricevuto via WhatsApp, SMS o email, o scansionate di nuovo il codice QR.', contact: 'Contattate LuxInterventions al +352 691 423 943.', notFound: 'Preventivo non trovato', noPdf: 'PDF non disponibile', sendErr: 'Invio impossibile', doc: 'Preventivo' },
  de: { loc: 'de-LU', title: 'Ihr Angebot', offer: 'Dienstleistungsangebot', no: 'Nr.', client: 'Kunde', obj: 'Betreff', total: 'Gesamt', forfait: 'Pauschale', ttc: 'brutto', month: ' / Monat', dep: 'Anzahlung', depTx: (p, a) => `${p} % bei Auftrag: ${a}`, valid: 'Gültig bis', view: '📄 Vollständiges Angebot ansehen', dl: '⬇️ Herunterladen / drucken', okT: '✅ Angebot angenommen und unterschrieben', okTx: (n, d) => `Unterschrieben von ${n} am ${d}. Danke für Ihr Vertrauen: LuxInterventions meldet sich, um die Arbeiten zu planen.`, theClient: 'dem Kunden', refT: 'Angebot abgelehnt', refTx: (d) => `Antwort gespeichert am ${d}. Eine Frage? +352 691 423 943.`, expT: 'Dieses Angebot ist abgelaufen.', expTx: 'Fragen Sie bei LuxInterventions ein aktuelles Angebot an: +352 691 423 943 · info@luxinterventions.com', sign: '✍️ Auftragsbestätigung', signTx: 'Lesen Sie das vollständige Angebot und unterschreiben Sie dann mit dem Finger, um es anzunehmen.', name: 'Vor- und Nachname', retr: 'Sie haben nach der Unterschrift <b>14 Tage</b> Zeit, ohne Angabe von Gründen und kostenlos zu widerrufen (Formular im Angebot).', early: 'Ich verlange, dass die Arbeiten vor Ablauf der Widerrufsfrist beginnen. Widerrufe ich danach, bezahle ich die bereits ausgeführten Arbeiten.', sig: 'Unterschrift', clear: 'Löschen', accept: '✅ Ich nehme das Angebot an und unterschreibe', refuse: 'Dieses Angebot ablehnen', refuseQ: 'Dieses Angebot ablehnen? LuxInterventions wird informiert.', needName: 'Bitte Vor- und Nachnamen angeben.', needSig: 'Unterschreiben Sie mit dem Finger im weißen Feld.', sending: 'Senden…', badLink: 'Unvollständiger Link.', badLinkTx: 'Öffnen Sie den vollständigen Link aus WhatsApp, SMS oder E-Mail oder scannen Sie den QR-Code erneut.', contact: 'Kontaktieren Sie LuxInterventions unter +352 691 423 943.', notFound: 'Angebot nicht gefunden', noPdf: 'PDF nicht verfügbar', sendErr: 'Senden nicht möglich', doc: 'Angebot' },
  pt: { loc: 'pt-PT', title: 'O seu orçamento', offer: 'Proposta de serviço', no: 'N.º', client: 'Cliente', obj: 'Assunto', total: 'Total', forfait: 'Avença', ttc: 'c/ IVA', month: ' / mês', dep: 'Sinal', depTx: (p, a) => `${p} % na aceitação: ${a}`, valid: 'Válido até', view: '📄 Ver o orçamento completo', dl: '⬇️ Descarregar / imprimir', okT: '✅ Orçamento aceite e assinado', okTx: (n, d) => `Assinado por ${n} em ${d}. Obrigado pela confiança: a LuxInterventions contacta-o para organizar os trabalhos.`, theClient: 'o cliente', refT: 'Orçamento recusado', refTx: (d) => `Resposta registada em ${d}. Alguma dúvida? +352 691 423 943.`, expT: 'Este orçamento expirou.', expTx: 'Peça uma proposta atualizada à LuxInterventions: +352 691 423 943 · info@luxinterventions.com', sign: '✍️ Aceite', signTx: 'Leia o orçamento completo e assine com o dedo para o aceitar.', name: 'Nome e apelido', retr: 'Dispõe de <b>14 dias</b> após a assinatura para desistir, sem motivo e sem custos (formulário no orçamento).', early: 'Peço que os trabalhos comecem antes do fim do prazo de desistência. Se depois desistir, pagarei os trabalhos já realizados.', sig: 'Assinatura', clear: 'Apagar', accept: '✅ Aceito o orçamento e assino', refuse: 'Recusar este orçamento', refuseQ: 'Recusar este orçamento? A LuxInterventions será avisada.', needName: 'Indique o seu nome e apelido.', needSig: 'Assine no quadro branco com o dedo.', sending: 'A enviar…', badLink: 'Link incompleto.', badLinkTx: 'Abra o link completo recebido por WhatsApp, SMS ou email, ou leia de novo o código QR.', contact: 'Contacte a LuxInterventions: +352 691 423 943.', notFound: 'Orçamento não encontrado', noPdf: 'PDF indisponível', sendErr: 'Envio impossível', doc: 'Orçamento' },
  en: { loc: 'en-GB', title: 'Your quote', offer: 'Service offer', no: 'No.', client: 'Client', obj: 'Subject', total: 'Total', forfait: 'Flat rate', ttc: 'incl. VAT', month: ' / month', dep: 'Deposit', depTx: (p, a) => `${p} % on acceptance: ${a}`, valid: 'Valid until', view: '📄 View the full quote', dl: '⬇️ Download / print', okT: '✅ Quote accepted and signed', okTx: (n, d) => `Signed by ${n} on ${d}. Thank you for your trust: LuxInterventions will contact you to arrange the work.`, theClient: 'the client', refT: 'Quote declined', refTx: (d) => `Answer saved on ${d}. Any question? +352 691 423 943.`, expT: 'This quote has expired.', expTx: 'Ask LuxInterventions for an updated offer: +352 691 423 943 · info@luxinterventions.com', sign: '✍️ Approval', signTx: 'Read the full quote, then sign with your finger to accept it.', name: 'First and last name', retr: 'You have <b>14 days</b> after signing to withdraw, without reason and free of charge (form in the quote).', early: 'I ask for the work to start before the end of the withdrawal period. If I withdraw afterwards, I will pay for the work already done.', sig: 'Signature', clear: 'Clear', accept: '✅ I accept the quote and sign', refuse: 'Decline this quote', refuseQ: 'Decline this quote? LuxInterventions will be told.', needName: 'Enter your first and last name.', needSig: 'Sign in the white box with your finger.', sending: 'Sending…', badLink: 'Incomplete link.', badLinkTx: 'Open the full link received by WhatsApp, SMS or email, or scan the QR code again.', contact: 'Contact LuxInterventions on +352 691 423 943.', notFound: 'Quote not found', noPdf: 'PDF not available', sendErr: 'Could not send', doc: 'Quote' },
  es: { loc: 'es-ES', title: 'Su presupuesto', offer: 'Oferta de servicio', no: 'N.º', client: 'Cliente', obj: 'Asunto', total: 'Total', forfait: 'Tarifa fija', ttc: 'IVA incl.', month: ' / mes', dep: 'Anticipo', depTx: (p, a) => `${p} % a la aceptación: ${a}`, valid: 'Válido hasta', view: '📄 Ver el presupuesto completo', dl: '⬇️ Descargar / imprimir', okT: '✅ Presupuesto aceptado y firmado', okTx: (n, d) => `Firmado por ${n} el ${d}. Gracias por su confianza: LuxInterventions le contacta para organizar los trabajos.`, theClient: 'el cliente', refT: 'Presupuesto rechazado', refTx: (d) => `Respuesta registrada el ${d}. ¿Alguna pregunta? +352 691 423 943.`, expT: 'Este presupuesto ha caducado.', expTx: 'Pida una oferta actualizada a LuxInterventions: +352 691 423 943 · info@luxinterventions.com', sign: '✍️ Conforme', signTx: 'Lea el presupuesto completo y firme con el dedo para aceptarlo.', name: 'Nombre y apellidos', retr: 'Dispone de <b>14 días</b> tras la firma para desistir, sin motivo y sin gastos (formulario en el presupuesto).', early: 'Pido que los trabajos empiecen antes del fin del plazo de desistimiento. Si después desisto, pagaré los trabajos ya realizados.', sig: 'Firma', clear: 'Borrar', accept: '✅ Acepto el presupuesto y firmo', refuse: 'Rechazar este presupuesto', refuseQ: '¿Rechazar este presupuesto? Se avisará a LuxInterventions.', needName: 'Indique su nombre y apellidos.', needSig: 'Firme en el recuadro blanco con el dedo.', sending: 'Enviando…', badLink: 'Enlace incompleto.', badLinkTx: 'Abra el enlace completo recibido por WhatsApp, SMS o email, o escanee de nuevo el código QR.', contact: 'Contacte con LuxInterventions: +352 691 423 943.', notFound: 'Presupuesto no encontrado', noPdf: 'PDF no disponible', sendErr: 'Envío imposible', doc: 'Presupuesto' },
};
const LANG = (() => { const q = (/[?&]lang=([a-z]{2})/.exec(location.search) || [])[1]; if (TX[q]) return q; for (const l of navigator.languages || [navigator.language || '']) { const k = String(l).slice(0, 2).toLowerCase(); if (TX[k]) return k; } return 'fr'; })();
const L = TX[LANG];
document.documentElement.lang = LANG;
document.title = L.title + ' — LuxInterventions';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const eur = (n) => (Math.round((+n || 0) * 100) / 100).toLocaleString(L.loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const day = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString(L.loc, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const when = (ms) => new Date(ms).toLocaleString(L.loc, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
let D = null, pdfUrl = '';

async function load() {
  if (!token) { main.innerHTML = `<div class="card ko"><b>${L.badLink}</b><p class="note">${L.badLinkTx}</p></div>`; return; }
  try {
    const r = await fetch(API + token, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || L.notFound);
    D = j; render();
  } catch (e) { main.innerHTML = `<div class="card ko"><b>${esc(e.message)}</b><p class="note">${L.contact}</p></div>`; }
}
async function pdf() {
  if (!pdfUrl) { const r = await fetch(API + token + '/pdf', { cache: 'no-store' }); if (!r.ok) throw new Error(L.noPdf); pdfUrl = URL.createObjectURL(await r.blob()); }
  return pdfUrl;
}
function render() {
  const ct = D.kind === 'contrat';
  const head = `<div class="card"><h1>${ct ? L.offer : L.title}</h1><p class="no">${L.no} ${esc(D.no)}</p>
    <dl class="kv">${D.client ? `<dt>${L.client}</dt><dd>${esc(D.client)}</dd>` : ''}${D.title ? `<dt>${L.obj}</dt><dd>${esc(D.title)}</dd>` : ''}
      <dt>${ct ? L.forfait : L.total}</dt><dd class="big">${eur(D.ttc)} ${L.ttc}${ct ? L.month : ''}</dd>
      ${D.pct ? `<dt>${L.dep}</dt><dd>${L.depTx(D.pct, eur(D.acompte))}</dd>` : ''}
      ${D.valid_until ? `<dt>${L.valid}</dt><dd>${day(D.valid_until)}</dd>` : ''}</dl>
    <div class="row"><button class="btn" data-a="view">${L.view}</button><button class="btn" data-a="dl">${L.dl}</button></div>
    <iframe id="pv" title="${L.doc}" hidden></iframe></div>`;
  let tail;
  if (D.status === 'accepte') tail = `<div class="card ok"><b>${L.okT}</b><p class="note">${L.okTx(esc(D.sign_name || L.theClient), when(D.decided_at))}</p></div>`;
  else if (D.status === 'refuse') tail = `<div class="card ko"><b>${L.refT}</b><p class="note">${L.refTx(when(D.decided_at))}</p></div>`;
  else if (D.expired) tail = `<div class="card ko"><b>${L.expT}</b><p class="note">${L.expTx}</p></div>`;
  else tail = `<form class="card" id="sf"><h2 style="font-size:19px">${L.sign}</h2>
    <p class="note">${L.signTx}</p>
    <label class="f" for="nom">${L.name}</label><input type="text" id="nom" autocomplete="name">
    ${D.part ? `<p class="note">${L.retr}</p>
      <label class="chk"><input type="checkbox" id="early"><span>${L.early}</span></label>` : ''}
    <label class="f">${L.sig}</label><canvas width="600" height="220" id="pad"></canvas>
    <div class="row" style="margin-top:8px"><button type="button" class="btn" data-a="clear" style="flex:0 0 auto">${L.clear}</button></div>
    <p class="err" id="err"></p>
    <button class="btn primary block" type="submit">${L.accept}</button>
    <div style="text-align:center;margin-top:8px"><button type="button" class="btn ghost" data-a="refuse">${L.refuse}</button></div></form>`;
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
  if (!r.ok) throw new Error(j.error || L.sendErr);
}
document.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-a]'); if (!a) return;
  const k = a.dataset.a;
  try {
    if (k === 'view') { const f = document.getElementById('pv'); f.src = await pdf(); f.hidden = false; f.scrollIntoView({ behavior: 'smooth' }); }
    if (k === 'dl') { const l = document.createElement('a'); l.href = await pdf(); l.download = `${L.doc}-${D.no}.pdf`; document.body.appendChild(l); l.click(); l.remove(); }
    if (k === 'clear') { const c = document.getElementById('pad'); c.getContext('2d').clearRect(0, 0, c.width, c.height); drawn = false; }
    if (k === 'refuse') {
      if (!confirm(L.refuseQ)) return;
      await send({ status: 'refuse', nom: (document.getElementById('nom') || {}).value || '' }); await load();
    }
  } catch (err) { const m = document.getElementById('err'); if (m) m.textContent = err.message; else alert(err.message); }
});
document.addEventListener('submit', async (e) => {
  if (e.target.id !== 'sf') return;
  e.preventDefault();
  const err = document.getElementById('err'), nom = document.getElementById('nom').value.trim();
  if (!nom) { err.textContent = L.needName; return; }
  if (!drawn) { err.textContent = L.needSig; return; }
  const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = L.sending;
  try {
    await send({ status: 'accepte', nom, png: document.getElementById('pad').toDataURL('image/png'), early: !!(document.getElementById('early') || {}).checked });
    await load(); window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = L.accept; }
});
load();
