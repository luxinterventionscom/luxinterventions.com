// 🔧 DOMIER : bandeau « appelez-nous pour les réparations urgentes » (toutes les apps sauf l'équipe : ce sont eux, les DOMIER)
// La demande suit la chaîne : locataire → son gestionnaire ; client d'hôtel → son hôtel ; taxi, annonceur, clients du réseau → LUXINTERVENTION.
export const DOM_TEL = '+352 691 423 943';
const L = {
  fr: { U: { urgent: '🔴 Urgent', rapide: '🟠 Rapide (48 h)', plan: '📅 À planifier' }, date: 'Date souhaitée', heure: 'Heure', kind: 'Type', K: { once: '🔧 Une fois (réparation, panne)', reg: '🔁 Régulier (ménage, jardin, entretien)' }, svc: 'Service', SV: { menage: '🧹 Ménage', jardin: '🌿 Jardin', entretien: '🔧 Entretien', autre: '📋 Autre' }, freq: 'Fréquence', F: { hebdo: 'Chaque semaine', '2sem': 'Toutes les 2 semaines', mois: 'Chaque mois' }, jours: 'Jours', J: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'], urgT: 'Urgence',
    sub: 'Appelez-nous pour les réparations urgentes', by: 'by LUXINTERVENTION', call: '📞 Appeler', ask: '🔧 Demander une intervention', room: '🔧 Un problème dans la chambre ?', sig: '🛠️ Signaler un problème',
    what: 'Quel problème ?', whatPh: 'ex. fuite d’eau, panne de courant, serrure bloquée…', where: 'Adresse', when: 'Quand êtes-vous disponible ?', acc: 'Accès (clé, code, personne sur place…)', tel: 'Téléphone', ph: 'Photos (3 maximum)', send: 'Envoyer', urg: 'Urgent',
    sent: 'Merci, demande envoyée : nous vous tenons au courant ici.', mine: 'Mes demandes', S: { wait: '⏳ reçue', afaire: '📋 prise en charge', planifie: '📅 planifiée', fait: '✅ faite' }, err: 'Envoi impossible, réessayez.', need: 'Décrivez le problème' },
  it: { U: { urgent: '🔴 Urgente', rapide: '🟠 Rapido (48 h)', plan: '📅 Da programmare' }, date: 'Data desiderata', heure: 'Ora', kind: 'Tipo', K: { once: '🔧 Una volta (riparazione, guasto)', reg: '🔁 Regolare (pulizie, giardino, manutenzione)' }, svc: 'Servizio', SV: { menage: '🧹 Pulizie', jardin: '🌿 Giardino', entretien: '🔧 Manutenzione', autre: '📋 Altro' }, freq: 'Frequenza', F: { hebdo: 'Ogni settimana', '2sem': 'Ogni 2 settimane', mois: 'Ogni mese' }, jours: 'Giorni', J: ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'], urgT: 'Urgenza',
    sub: 'Chiamateci per le riparazioni urgenti', by: 'by LUXINTERVENTION', call: '📞 Chiama', ask: '🔧 Chiedi un intervento', room: '🔧 Un problema in camera?', sig: '🛠️ Segnala un problema',
    what: 'Quale problema?', whatPh: 'es. perdita d’acqua, corrente saltata, serratura bloccata…', where: 'Indirizzo', when: 'Quando sei disponibile?', acc: 'Accesso (chiave, codice, persona sul posto…)', tel: 'Telefono', ph: 'Foto (massimo 3)', send: 'Invia', urg: 'Urgente',
    sent: 'Grazie, richiesta inviata: ti teniamo al corrente qui.', mine: 'Le mie richieste', S: { wait: '⏳ ricevuta', afaire: '📋 presa in carico', planifie: '📅 programmata', fait: '✅ fatta' }, err: 'Invio impossibile, riprova.', need: 'Descrivi il problema' },
  de: { U: { urgent: '🔴 Dringend', rapide: '🟠 Schnell (48 h)', plan: '📅 Zu planen' }, date: 'Gewünschtes Datum', heure: 'Uhrzeit', kind: 'Art', K: { once: '🔧 Einmalig (Reparatur, Panne)', reg: '🔁 Regelmäßig (Reinigung, Garten, Wartung)' }, svc: 'Dienst', SV: { menage: '🧹 Reinigung', jardin: '🌿 Garten', entretien: '🔧 Wartung', autre: '📋 Anderes' }, freq: 'Häufigkeit', F: { hebdo: 'Jede Woche', '2sem': 'Alle 2 Wochen', mois: 'Jeden Monat' }, jours: 'Tage', J: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], urgT: 'Dringlichkeit',
    sub: 'Rufen Sie uns für dringende Reparaturen an', by: 'by LUXINTERVENTION', call: '📞 Anrufen', ask: '🔧 Einsatz anfragen', room: '🔧 Ein Problem im Zimmer?', sig: '🛠️ Problem melden',
    what: 'Welches Problem?', whatPh: 'z. B. Wasserleck, Stromausfall, Schloss klemmt…', where: 'Adresse', when: 'Wann sind Sie erreichbar?', acc: 'Zugang (Schlüssel, Code, Person vor Ort…)', tel: 'Telefon', ph: 'Fotos (max. 3)', send: 'Senden', urg: 'Dringend',
    sent: 'Danke, Anfrage gesendet: Sie sehen hier, wie es weitergeht.', mine: 'Meine Anfragen', S: { wait: '⏳ erhalten', afaire: '📋 übernommen', planifie: '📅 geplant', fait: '✅ erledigt' }, err: 'Senden nicht möglich, bitte erneut versuchen.', need: 'Beschreiben Sie das Problem' },
  pt: { U: { urgent: '🔴 Urgente', rapide: '🟠 Rápido (48 h)', plan: '📅 A agendar' }, date: 'Data desejada', heure: 'Hora', kind: 'Tipo', K: { once: '🔧 Uma vez (reparação, avaria)', reg: '🔁 Regular (limpeza, jardim, manutenção)' }, svc: 'Serviço', SV: { menage: '🧹 Limpeza', jardin: '🌿 Jardim', entretien: '🔧 Manutenção', autre: '📋 Outro' }, freq: 'Frequência', F: { hebdo: 'Todas as semanas', '2sem': 'De 2 em 2 semanas', mois: 'Todos os meses' }, jours: 'Dias', J: ['Se', 'Te', 'Qa', 'Qi', 'Sx', 'Sá', 'Do'], urgT: 'Urgência',
    sub: 'Ligue-nos para reparações urgentes', by: 'by LUXINTERVENTION', call: '📞 Ligar', ask: '🔧 Pedir uma intervenção', room: '🔧 Um problema no quarto?', sig: '🛠️ Comunicar um problema',
    what: 'Qual é o problema?', whatPh: 'ex. fuga de água, falta de luz, fechadura bloqueada…', where: 'Morada', when: 'Quando está disponível?', acc: 'Acesso (chave, código, pessoa no local…)', tel: 'Telefone', ph: 'Fotos (máximo 3)', send: 'Enviar', urg: 'Urgente',
    sent: 'Obrigado, pedido enviado: acompanhe aqui.', mine: 'Os meus pedidos', S: { wait: '⏳ recebido', afaire: '📋 em tratamento', planifie: '📅 agendado', fait: '✅ feito' }, err: 'Envio impossível, tente de novo.', need: 'Descreva o problema' },
  en: { U: { urgent: '🔴 Urgent', rapide: '🟠 Fast (48 h)', plan: '📅 To schedule' }, date: 'Preferred date', heure: 'Time', kind: 'Type', K: { once: '🔧 One-off (repair, breakdown)', reg: '🔁 Regular (cleaning, garden, maintenance)' }, svc: 'Service', SV: { menage: '🧹 Cleaning', jardin: '🌿 Garden', entretien: '🔧 Maintenance', autre: '📋 Other' }, freq: 'Frequency', F: { hebdo: 'Every week', '2sem': 'Every 2 weeks', mois: 'Every month' }, jours: 'Days', J: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], urgT: 'Urgency',
    sub: 'Call us for urgent repairs', by: 'by LUXINTERVENTION', call: '📞 Call', ask: '🔧 Request a repair', room: '🔧 A problem in the room?', sig: '🛠️ Report a problem',
    what: 'What is the problem?', whatPh: 'e.g. water leak, power cut, stuck lock…', where: 'Address', when: 'When are you available?', acc: 'Access (key, code, someone on site…)', tel: 'Phone', ph: 'Photos (up to 3)', send: 'Send', urg: 'Urgent',
    sent: 'Thank you, request sent: follow it here.', mine: 'My requests', S: { wait: '⏳ received', afaire: '📋 taken in charge', planifie: '📅 scheduled', fait: '✅ done' }, err: 'Sending failed, please try again.', need: 'Describe the problem' },
  es: { U: { urgent: '🔴 Urgente', rapide: '🟠 Rápido (48 h)', plan: '📅 A programar' }, date: 'Fecha deseada', heure: 'Hora', kind: 'Tipo', K: { once: '🔧 Una vez (reparación, avería)', reg: '🔁 Regular (limpieza, jardín, mantenimiento)' }, svc: 'Servicio', SV: { menage: '🧹 Limpieza', jardin: '🌿 Jardín', entretien: '🔧 Mantenimiento', autre: '📋 Otro' }, freq: 'Frecuencia', F: { hebdo: 'Cada semana', '2sem': 'Cada 2 semanas', mois: 'Cada mes' }, jours: 'Días', J: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'], urgT: 'Urgencia',
    sub: 'Llámenos para reparaciones urgentes', by: 'by LUXINTERVENTION', call: '📞 Llamar', ask: '🔧 Pedir una intervención', room: '🔧 ¿Un problema en la habitación?', sig: '🛠️ Avisar de un problema',
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
      <label>${esc(t.urgT)}</label>${Object.entries(t.U).map(([k, v]) => `<label class="chk"><input type="radio" name="urg" value="${k}" required data-domier-urg="1"> <span>${esc(v)}</span></label>`).join('')}
      <div data-domier-plan hidden><label style="flex:1">${esc(t.date)}<input type="date" name="date" min="${new Date().toISOString().slice(0, 10)}"></label><label style="flex:1">${esc(t.heure)}<input type="time" name="heure"></label></div>
      ${o.form === 'room' ? '' : `<label>${esc(t.kind)}</label>${Object.entries(t.K).map(([k, v], i) => `<label class="chk"><input type="radio" name="kind" value="${k}" ${i ? '' : 'checked'} data-domier-kind="1"> <span>${esc(v)}</span></label>`).join('')}
      <div data-domier-reg hidden style="padding:8px;border:1px dashed #ccc;border-radius:10px">
        <label>${esc(t.svc)}<select name="svc">${Object.entries(t.SV).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
        <label>${esc(t.freq)}<select name="freq">${Object.entries(t.F).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
        <span>${esc(t.jours)}</span><div style="display:flex;gap:4px;flex-wrap:wrap">${t.J.map((j, i) => `<label class="chip"><input type="checkbox" name="jours" value="${i + 1}"> ${esc(j)}</label>`).join('')}</div></div>`}
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
  document.addEventListener('change', (e) => {
    const f = e.target.closest && e.target.closest('[data-domier-form]');
    if (!f) return;
    const pl = f.querySelector('[data-domier-plan]'), rg = f.querySelector('[data-domier-reg]');
    if (pl) pl.hidden = !(f.elements.urg && f.elements.urg.value === 'plan');
    if (rg) rg.hidden = !(f.elements.kind && f.elements.kind.value === 'reg');
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
      const kind = g('kind') === 'reg' ? 'reg' : 'once', jours = [...f.querySelectorAll('[name=jours]:checked')].map((c) => +c.value);
      await cfg.send({ type: 'domier', texte: g('texte'), urg: g('urg') || 'plan', date: g('urg') === 'plan' ? g('date') : '', heure: g('urg') === 'plan' ? g('heure') : '', kind, ...(kind === 'reg' ? { svc: g('svc'), freq: g('freq'), jours } : {}), adresse: g('adresse'), dispo: g('dispo'), acces: g('acces'), tel: g('tel'), photos });
      formOpen = false; msg = t.sent;
    } catch { msg = t.err; if (btn) btn.disabled = false; }
    repaint();
  });
}
