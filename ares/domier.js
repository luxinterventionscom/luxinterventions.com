// 🔧 DOMIER : bandeau « appelez-nous pour les réparations urgentes » (toutes les apps sauf l'équipe : ce sont eux, les DOMIER)
// La demande suit la chaîne : locataire → son gestionnaire ; client d'hôtel → son hôtel ; taxi, annonceur, clients du réseau → LUXINTERVENTION.
export const DOM_TEL = '+352 691 423 943';
const L = {
  fr: { sub: 'Appelez-nous pour les réparations urgentes', by: 'by LUXINTERVENTION', call: '📞 Appeler', ask: '🔧 Demander une intervention', room: '🔧 Un problème dans la chambre ?', sig: '🛠️ Signaler un problème',
    what: 'Quel problème ?', whatPh: 'ex. fuite d’eau, panne de courant, serrure bloquée…', where: 'Adresse', when: 'Quand êtes-vous disponible ?', acc: 'Accès (clé, code, personne sur place…)', tel: 'Téléphone', ph: 'Photos (3 maximum)', send: 'Envoyer', urg: 'Urgent',
    sent: 'Merci, demande envoyée : nous vous tenons au courant ici.', mine: 'Mes demandes', S: { wait: '⏳ reçue', afaire: '📋 prise en charge', planifie: '📅 planifiée', fait: '✅ faite' }, err: 'Envoi impossible, réessayez.', need: 'Décrivez le problème' },
  it: { sub: 'Chiamateci per le riparazioni urgenti', by: 'by LUXINTERVENTION', call: '📞 Chiama', ask: '🔧 Chiedi un intervento', room: '🔧 Un problema in camera?', sig: '🛠️ Segnala un problema',
    what: 'Quale problema?', whatPh: 'es. perdita d’acqua, corrente saltata, serratura bloccata…', where: 'Indirizzo', when: 'Quando sei disponibile?', acc: 'Accesso (chiave, codice, persona sul posto…)', tel: 'Telefono', ph: 'Foto (massimo 3)', send: 'Invia', urg: 'Urgente',
    sent: 'Grazie, richiesta inviata: ti teniamo al corrente qui.', mine: 'Le mie richieste', S: { wait: '⏳ ricevuta', afaire: '📋 presa in carico', planifie: '📅 programmata', fait: '✅ fatta' }, err: 'Invio impossibile, riprova.', need: 'Descrivi il problema' },
  de: { sub: 'Rufen Sie uns für dringende Reparaturen an', by: 'by LUXINTERVENTION', call: '📞 Anrufen', ask: '🔧 Einsatz anfragen', room: '🔧 Ein Problem im Zimmer?', sig: '🛠️ Problem melden',
    what: 'Welches Problem?', whatPh: 'z. B. Wasserleck, Stromausfall, Schloss klemmt…', where: 'Adresse', when: 'Wann sind Sie erreichbar?', acc: 'Zugang (Schlüssel, Code, Person vor Ort…)', tel: 'Telefon', ph: 'Fotos (max. 3)', send: 'Senden', urg: 'Dringend',
    sent: 'Danke, Anfrage gesendet: Sie sehen hier, wie es weitergeht.', mine: 'Meine Anfragen', S: { wait: '⏳ erhalten', afaire: '📋 übernommen', planifie: '📅 geplant', fait: '✅ erledigt' }, err: 'Senden nicht möglich, bitte erneut versuchen.', need: 'Beschreiben Sie das Problem' },
  pt: { sub: 'Ligue-nos para reparações urgentes', by: 'by LUXINTERVENTION', call: '📞 Ligar', ask: '🔧 Pedir uma intervenção', room: '🔧 Um problema no quarto?', sig: '🛠️ Comunicar um problema',
    what: 'Qual é o problema?', whatPh: 'ex. fuga de água, falta de luz, fechadura bloqueada…', where: 'Morada', when: 'Quando está disponível?', acc: 'Acesso (chave, código, pessoa no local…)', tel: 'Telefone', ph: 'Fotos (máximo 3)', send: 'Enviar', urg: 'Urgente',
    sent: 'Obrigado, pedido enviado: acompanhe aqui.', mine: 'Os meus pedidos', S: { wait: '⏳ recebido', afaire: '📋 em tratamento', planifie: '📅 agendado', fait: '✅ feito' }, err: 'Envio impossível, tente de novo.', need: 'Descreva o problema' },
  en: { sub: 'Call us for urgent repairs', by: 'by LUXINTERVENTION', call: '📞 Call', ask: '🔧 Request a repair', room: '🔧 A problem in the room?', sig: '🛠️ Report a problem',
    what: 'What is the problem?', whatPh: 'e.g. water leak, power cut, stuck lock…', where: 'Address', when: 'When are you available?', acc: 'Access (key, code, someone on site…)', tel: 'Phone', ph: 'Photos (up to 3)', send: 'Send', urg: 'Urgent',
    sent: 'Thank you, request sent: follow it here.', mine: 'My requests', S: { wait: '⏳ received', afaire: '📋 taken in charge', planifie: '📅 scheduled', fait: '✅ done' }, err: 'Sending failed, please try again.', need: 'Describe the problem' },
  es: { sub: 'Llámenos para reparaciones urgentes', by: 'by LUXINTERVENTION', call: '📞 Llamar', ask: '🔧 Pedir una intervención', room: '🔧 ¿Un problema en la habitación?', sig: '🛠️ Avisar de un problema',
    what: '¿Qué problema?', whatPh: 'p. ej. fuga de agua, corte de luz, cerradura bloqueada…', where: 'Dirección', when: '¿Cuándo está disponible?', acc: 'Acceso (llave, código, persona en el lugar…)', tel: 'Teléfono', ph: 'Fotos (máximo 3)', send: 'Enviar', urg: 'Urgente',
    sent: 'Gracias, solicitud enviada: síguela aquí.', mine: 'Mis solicitudes', S: { wait: '⏳ recibida', afaire: '📋 en curso', planifie: '📅 programada', fait: '✅ hecha' }, err: 'No se pudo enviar, inténtelo de nuevo.', need: 'Describa el problema' },
};
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let cfg = { lang: () => 'fr' }, msg = '', formOpen = false, last = {};
const tx = (lg) => L[lg || cfg.lang() || 'fr'] || L.fr;
const shut = () => { try { return localStorage.getItem('domierShut') === '1'; } catch { return false; } };
const telHref = (t) => 'tel:' + String(t || '').replace(/[^\d+]/g, '');
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
async function shrink(file) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return '';
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height);
  return b64(new Uint8Array(await (await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.8))).arrayBuffer()));
}
// o : { tel, who (nom de qui on appelle), form: true (demande ici) | 'room' (client d'hôtel), sig: true (bouton vers « Signaler » de l'app), list: [{ id, titre, st, at }], extra: html (bouton propre à l'app), lang, adresse }
export function domierHtml(o = {}) {
  last = o;
  const t = tx(o.lang), list = o.list || [];
  const sum = `<summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px"><span style="font-size:26px">🔧</span><span style="flex:1"><b style="font-size:18px;letter-spacing:.06em">DOMIER</b><span style="display:block;font-size:13px">${esc(t.sub)}</span><span style="display:block;font-size:10px;opacity:.7">${esc(t.by)}</span></span>${o.tel ? `<a class="btn sm" href="${esc(telHref(o.tel))}" style="white-space:nowrap" data-domier-call="1">${esc(t.call)}</a>` : ''}</summary>`;
  const form = o.form ? `${formOpen ? '' : `<button type="button" class="btn sm" data-domier-open="1" style="margin-top:8px">${esc(o.form === 'room' ? t.room : t.ask)}</button>`}
    ${formOpen ? `<form data-domier-form="1" style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
      <label>${esc(t.what)}</label><textarea name="texte" rows="3" maxlength="2000" required placeholder="${esc(t.whatPh)}"></textarea>
      <label class="chk"><input type="checkbox" name="urg"> <span>🚨 ${esc(t.urg)}</span></label>
      ${o.form === 'room' ? '' : `<label>${esc(t.where)}</label><input name="adresse" maxlength="160" value="${esc(o.adresse || '')}">`}
      <label>${esc(t.when)}</label><input name="dispo" maxlength="200">
      ${o.form === 'room' ? '' : `<label>${esc(t.acc)}</label><input name="acces" maxlength="200">`}
      <label>${esc(t.tel)}</label><input name="tel" type="tel" maxlength="30" value="${esc(o.myTel || '')}">
      <label>${esc(t.ph)}</label><input type="file" name="photos" accept="image/*" multiple>
      <button class="btn block" type="submit">${esc(t.send)}</button></form>` : ''}` : '';
  const mine = list.length ? `<p class="meta" style="margin:10px 0 2px"><b>${esc(t.mine)}</b></p>${list.slice(0, 8).map((x) => `<p class="meta" style="margin:0">${esc((t.S[x.st] || t.S.wait))} · ${esc(String(x.titre || '').slice(0, 60))}${x.at ? ' · ' + esc(String(x.at).slice(0, 10)) : ''}</p>`).join('')}` : '';
  return `<details class="card domier" data-domier="1" ${shut() ? '' : 'open'} style="border-left:5px solid #F97316">${sum}<div style="margin-top:6px">${o.sig ? `<button type="button" class="btn sm" data-domier-sig="1" style="margin-top:8px">${esc(t.sig)}</button>` : ''}${o.extra || ''}${form}${msg ? `<p class="ok" style="margin:8px 0 0"><b>${esc(msg)}</b></p>` : ''}${mine}</div></details>`;
}
function repaint() { for (const el of document.querySelectorAll('[data-domier]')) el.outerHTML = domierHtml(last); }
// lang : () => langue ; send : async (demande) => … (chiffrée pour le destinataire par l'app) ; rerender : () => … (redessine la page)
export function domierInit(o) {
  const first = !cfg.send;
  cfg = { ...cfg, ...o };
  if (!first) return;
  document.addEventListener('toggle', (e) => { const d = e.target; if (d && d.matches && d.matches('details[data-domier]')) { try { localStorage.setItem('domierShut', d.open ? '0' : '1'); } catch { /* rien */ } } }, true);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-domier-open]')) { e.preventDefault(); formOpen = true; msg = ''; repaint(); }
    if (e.target.closest('[data-domier-sig]')) { e.preventDefault(); const s = document.querySelector('[data-fold=signal]'); if (s) { s.open = true; s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  });
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-domier-form]');
    if (!f) return;
    e.preventDefault();
    const t = tx(), g = (k) => String((f.elements[k] && f.elements[k].value) || '').trim();
    if (!g('texte')) return alert(t.need);
    const btn = f.querySelector('button[type=submit]'); if (btn) btn.disabled = true;
    try {
      const photos = [];
      for (const file of [...((f.elements.photos && f.elements.photos.files) || [])].slice(0, 3)) { const p = await shrink(file); if (p) photos.push(p); }
      await cfg.send({ type: 'domier', texte: g('texte'), urg: !!(f.elements.urg && f.elements.urg.checked), adresse: g('adresse'), dispo: g('dispo'), acces: g('acces'), tel: g('tel'), photos });
      formOpen = false; msg = t.sent;
    } catch { msg = t.err; if (btn) btn.disabled = false; }
    repaint();
  });
}
