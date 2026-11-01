// 💬 Chat des partenaires (sociétés de taxi, annonceurs) avec la centrale — comme celle des ouvriers.
// Les messages partent chiffrés pour la centrale ; les réponses arrivent dans les données de l'app.
// ✓ envoyé · ✓✓ arrivé à la centrale · ✓✓ bleu lu · ⋯ modifier / supprimer pendant 15 min · 🌐 traduction.
import { trButton } from '/ares/chattr.js';

const T = {
  fr: { t: '💬 Messages avec la centrale', hint: 'Seule la centrale lit vos messages.', ph: 'Écrire à la centrale…', send: 'Envoyer', me: 'Moi', ctr: 'Centrale', none: 'Aucun message. Écrivez ici à la centrale, 24 h / 24.', edited: 'modifié', menu: 'Options du message', edit: '✏️ Modifier', del: '🗑️ Supprimer', delQ: 'Supprimer ce message ?', editing: '✏️ Vous modifiez votre message', cancel: 'Annuler', late: 'Plus possible : 15 minutes sont passées.', nw: 'nouveau', quick: 'Réponses rapides' },
  it: { t: '💬 Messaggi con la centrale', hint: 'Solo la centrale legge i tuoi messaggi.', ph: 'Scrivi alla centrale…', send: 'Invia', me: 'Io', ctr: 'Centrale', none: 'Nessun messaggio. Scrivi qui alla centrale, 24 ore su 24.', edited: 'modificato', menu: 'Opzioni del messaggio', edit: '✏️ Modifica', del: '🗑️ Elimina', delQ: 'Eliminare questo messaggio?', editing: '✏️ Stai modificando il tuo messaggio', cancel: 'Annulla', late: 'Non più possibile: sono passati 15 minuti.', nw: 'nuovo', quick: 'Risposte rapide' },
  de: { t: '💬 Nachrichten mit der Zentrale', hint: 'Nur die Zentrale liest Ihre Nachrichten.', ph: 'An die Zentrale schreiben…', send: 'Senden', me: 'Ich', ctr: 'Zentrale', none: 'Keine Nachrichten. Schreiben Sie hier an die Zentrale, rund um die Uhr.', edited: 'bearbeitet', menu: 'Nachrichtenoptionen', edit: '✏️ Bearbeiten', del: '🗑️ Löschen', delQ: 'Diese Nachricht löschen?', editing: '✏️ Sie bearbeiten Ihre Nachricht', cancel: 'Abbrechen', late: 'Nicht mehr möglich: 15 Minuten sind vorbei.', nw: 'neu', quick: 'Schnellantworten' },
  pt: { t: '💬 Mensagens com a central', hint: 'Só a central lê as suas mensagens.', ph: 'Escrever à central…', send: 'Enviar', me: 'Eu', ctr: 'Central', none: 'Sem mensagens. Escreva aqui à central, 24 h por dia.', edited: 'editado', menu: 'Opções da mensagem', edit: '✏️ Editar', del: '🗑️ Apagar', delQ: 'Apagar esta mensagem?', editing: '✏️ Está a editar a sua mensagem', cancel: 'Cancelar', late: 'Já não é possível: passaram 15 minutos.', nw: 'nova', quick: 'Respostas rápidas' },
  en: { t: '💬 Messages with the office', hint: 'Only the office reads your messages.', ph: 'Write to the office…', send: 'Send', me: 'Me', ctr: 'Office', none: 'No messages yet. Write to the office here, 24/7.', edited: 'edited', menu: 'Message options', edit: '✏️ Edit', del: '🗑️ Delete', delQ: 'Delete this message?', editing: '✏️ You are editing your message', cancel: 'Cancel', late: 'No longer possible: 15 minutes have passed.', nw: 'new', quick: 'Quick replies' },
  es: { t: '💬 Mensajes con la central', hint: 'Solo la central lee sus mensajes.', ph: 'Escribir a la central…', send: 'Enviar', me: 'Yo', ctr: 'Central', none: 'Ningún mensaje. Escriba aquí a la central, 24 h al día.', edited: 'editado', menu: 'Opciones del mensaje', edit: '✏️ Editar', del: '🗑️ Eliminar', delQ: '¿Eliminar este mensaje?', editing: '✏️ Estás editando tu mensaje', cancel: 'Cancelar', late: 'Ya no es posible: han pasado 15 minutos.', nw: 'nuevo', quick: 'Respuestas rápidas' },
};
const EDIT_MS = 15 * 60000;
let cfg = null, menu = '', editing = '', draft = '', busy = false;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// cfg.labels(lang) peut remplacer les titres (ex. « Messages avec la réception » pour les clients d'un hôtel)
const tx = () => ({ ...(T[cfg.lang()] || T.fr), ...((cfg.labels && cfg.labels(cfg.lang())) || {}) });
const getJ = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const setJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* plein */ } };
const PK = () => 'pc:' + cfg.id(), EK = () => 'pcE:' + cfg.id(), SK = () => 'pcS:' + cfg.id();
const editable = (m) => m.from === 'p' && Date.now() - Date.parse(m.at) < EDIT_MS;

// cfg : { id: () => espace, data: () => données, send: async (o) => …, lang: () => 'fr', quick: [[emoji, {fr,it,…}], …] | null, refresh: async () => nouvelles données | null }
export function pchatInit(c) {
  cfg = c;
  if (!document.getElementById('pcCss')) { const st = document.createElement('style'); st.id = 'pcCss'; st.textContent = `.pc-c .chat{display:flex;flex-direction:column;gap:8px;max-height:55vh;overflow:auto;padding:10px;background:#f1efe8;border-radius:14px;margin-bottom:8px}
.pc-c .bub{max-width:85%;align-self:flex-start;background:#fff;border-radius:14px 14px 14px 4px;padding:8px 10px;color:#1d1b16}
.pc-c .bub.me{align-self:flex-end;background:#e0e7ff;border-radius:14px 14px 4px 14px}
.pc-c .bub.mgr{background:#fef3c7}
.pc-c .bub-h{font-size:12px;color:#6b6557}.pc-c .bub-h b{color:#1d1b16}
.pc-c .bub-x{white-space:pre-wrap;word-break:break-word;margin-top:2px}
.pc-c .bub-f{font-size:11px;color:#6b6557;text-align:right;margin-top:2px}
.pc-c .tk{letter-spacing:-3px;margin-left:4px;color:#9ca3af;font-weight:700}.pc-c .tk.rd{color:#2563eb}
.pc-c .bub-mn{float:right;border:0;background:none;font:700 16px system-ui,sans-serif;line-height:1;padding:0 2px 4px 10px;cursor:pointer;color:#6b6557}
.pc-c .bub-menu{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.pc-c .bub-menu button{border:0;border-radius:999px;padding:6px 10px;font:600 13px system-ui,sans-serif;background:#fff;box-shadow:0 0 0 1px #d6d3cb;cursor:pointer}
.pc-c .chat-ed{display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;color:#6d28d9;margin-bottom:6px}
.pc-c .chat-form{display:flex;gap:8px;align-items:flex-end}
.pc-c .chat-form textarea{flex:1;min-height:46px;margin:0}
.pc-c .chat-form .btn{width:auto;padding:12px 16px}
.pc-c .pill{display:inline-block;border:0;border-radius:999px;padding:6px 12px;font:600 13px system-ui,sans-serif;background:#e0e7ff;color:#3730a3;cursor:pointer}
.pc-c .pc-quick{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}`; document.head.append(st); }
  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('input', (e) => { if (e.target.closest && e.target.closest('#pcForm')) draft = e.target.value; });
  setInterval(() => { const el = document.getElementById('pcCard'); if (!el || document.visibilityState !== 'visible') return; const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) quiet(); }, 20000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.k === 'push') quiet(); });
  setTimeout(flush, 1500);
}
function list() {
  const d = cfg.data() || {}, srv = d.chat || [], known = new Set(srv.map((m) => m.id));
  const pend = getJ(PK()).filter((m) => !known.has(m.id));
  if (pend.length !== getJ(PK()).length) setJ(PK(), pend);
  const eds = getJ(EK()).filter((e) => { const m = srv.find((x) => x.id === e.id); return pend.some((x) => x.id === e.id) || (e.del ? !!m : m && (m.ed || '') < e.at); });
  if (eds.length !== getJ(EK()).length) setJ(EK(), eds);
  return [...srv, ...pend.map((m) => ({ ...m, from: 'p', wait: 1 }))]
    .map((m) => { const e = eds.find((z) => z.id === m.id); return !e ? m : e.del ? null : { ...m, x: e.x, ed: e.at }; })
    .filter(Boolean).slice(-50);
}
export function pchatCard() {
  const t = tx(), d = cfg.data() || {}, rd = d.chatRd || '', all = list();
  let seen = ''; try { seen = localStorage.getItem(SK()) || ''; } catch { /* stockage indisponible */ }
  const nw = all.filter((m) => m.from === 'mgr' && m.at > seen).length;
  const tm = (m) => new Date(m.at).toLocaleString(cfg.lang(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const tk = (m) => (m.from !== 'p' ? '' : m.wait ? '<span class="tk">✓</span>' : `<span class="tk${rd && m.at <= rd ? ' rd' : ''}">✓✓</span>`);
  const quick = cfg.quick ? `<div class="pc-quick" aria-label="${esc(t.quick)}">${cfg.quick.map(([em, l]) => { const txt = em + ' ' + (l[cfg.lang()] || l.fr); return `<button type="button" class="pill" data-pcq="${esc(txt)}">${esc(txt)}</button>`; }).join('')}</div>` : '';
  return `<div class="card pc-c" id="pcCard"><h2 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${esc(t.t)}${nw ? ` <span class="tag bad">${nw} ${esc(t.nw)}</span>` : ''}${trButton()}</h2><p class="meta" style="margin:0 0 8px">🔒 ${esc(t.hint)}</p>
    <div class="chat">${all.length ? all.map((m) => { const ed = editable(m); return `<div class="bub ${m.from === 'p' ? 'me' : 'mgr'}"><div class="bub-h"><b>${esc(m.from === 'p' ? t.me : t.ctr)}</b> · ${esc(tm(m))}${ed ? `<button type="button" class="bub-mn" data-pcmenu="${esc(m.id)}" aria-label="${esc(t.menu)}">⋯</button>` : ''}</div><div class="bub-x"${m.from === 'p' ? '' : ` data-trx="${esc(m.x)}"`}>${esc(m.x)}</div>`
      + `${m.ed || m.from === 'p' ? `<div class="bub-f">${m.ed ? esc(t.edited) : ''} ${tk(m)}</div>` : ''}`
      + `${ed && menu === m.id ? `<div class="bub-menu"><button type="button" data-pcop="edit" data-id="${esc(m.id)}">${esc(t.edit)}</button><button type="button" data-pcop="del" data-id="${esc(m.id)}">${esc(t.del)}</button></div>` : ''}</div>`; }).join('') : `<p class="meta" style="margin:0">${esc(t.none)}</p>`}</div>
    ${quick}<form id="pcForm">${editing ? `<div class="chat-ed"><span>${esc(t.editing)}</span><button type="button" class="pill" data-pcop="cancel">${esc(t.cancel)}</button></div>` : ''}<div class="chat-form"><textarea name="x" required maxlength="1500" placeholder="${esc(t.ph)}">${esc(draft)}</textarea><button class="btn" type="submit">${esc(t.send)}</button></div></form></div>`;
}
// la carte seule est redessinée (le reste de l'app ne bouge pas) ; texte et curseur gardés
function paint() {
  const cur = document.getElementById('pcCard');
  if (!cur) return;
  const ta = cur.querySelector('textarea'), foc = document.activeElement === ta, pos = ta ? ta.selectionStart : 0;
  const box = cur.querySelector('.chat'), atEnd = !box || box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
  cur.outerHTML = pchatCard();
  const nb = document.querySelector('#pcCard .chat'); if (nb && atEnd) nb.scrollTop = nb.scrollHeight;
  const nt = document.querySelector('#pcCard textarea'); if (nt && foc) { nt.focus(); nt.setSelectionRange(pos, pos); }
  seen();
}
function seen() {
  const d = cfg.data() || {}, last = (d.chat || []).filter((m) => m.from === 'mgr').reduce((a, m) => (m.at > a ? m.at : a), '');
  const el = document.getElementById('pcCard');
  if (!el || !last) return;
  const r = el.getBoundingClientRect();
  if (r.bottom > 0 && r.top < innerHeight && document.visibilityState === 'visible') { try { localStorage.setItem(SK(), last); } catch { /* stockage indisponible */ } }
}
async function quiet() {
  if (busy) return;
  busy = true;
  try { await flush(); const x = await cfg.refresh(); if (x) { const d = cfg.data(); if (d && JSON.stringify([x.chat, x.chatRd]) !== JSON.stringify([d.chat, d.chatRd])) { d.chat = x.chat; d.chatRd = x.chatRd; paint(); } } } catch { /* hors ligne */ }
  busy = false;
}
// messages pas encore partis (hors ligne) : renvoyés
async function flush() {
  const q = getJ(PK()).filter((m) => !m.sent);
  if (!q.length || !cfg.data()) return;
  try { await cfg.send({ type: 'pchat', items: q.map((m) => ({ k: 'msg', id: m.id, x: m.x, at: m.at })) }); setJ(PK(), getJ(PK()).map((m) => ({ ...m, sent: 1 }))); } catch { /* on réessaiera */ }
}
async function sendItem(it) { await cfg.send({ type: 'pchat', items: [it] }); }
function onClick(e) {
  const q = e.target.closest && e.target.closest('[data-pcq]');
  if (q) { const ta = document.querySelector('#pcForm textarea'); if (ta) { ta.value = q.dataset.pcq; draft = ta.value; document.getElementById('pcForm').requestSubmit(); } return; }
  const mn = e.target.closest && e.target.closest('[data-pcmenu]');
  if (mn) { menu = menu === mn.dataset.pcmenu ? '' : mn.dataset.pcmenu; return paint(); }
  const op = e.target.closest && e.target.closest('[data-pcop]');
  if (!op) return;
  const t = tx();
  menu = '';
  if (op.dataset.pcop === 'cancel') { editing = ''; draft = ''; return paint(); }
  const m = list().find((z) => z.id === op.dataset.id);
  if (!m || !editable(m)) { alert(t.late); return paint(); }
  if (op.dataset.pcop === 'edit') { editing = m.id; draft = m.x; paint(); const ta = document.querySelector('#pcForm textarea'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } return; }
  if (op.dataset.pcop === 'del') {
    if (!confirm(t.delQ)) return paint();
    const at = new Date().toISOString();
    setJ(EK(), [...getJ(EK()).filter((z) => z.id !== m.id), { id: m.id, del: 1, at }]);
    paint();
    sendItem({ k: 'msg-del', id: m.id, at }).catch(() => {});
  }
}
async function onSubmit(e) {
  if (e.target.id !== 'pcForm') return;
  e.preventDefault();
  const x = String(e.target.x.value || '').trim().slice(0, 1500);
  if (!x) return;
  const at = new Date().toISOString();
  if (editing) {
    const eid = editing, old = list().find((z) => z.id === eid);
    editing = ''; draft = '';
    if (!old || !editable(old)) { alert(tx().late); return paint(); }
    setJ(EK(), [...getJ(EK()).filter((z) => z.id !== eid), { id: eid, x, at }]);
    paint();
    sendItem({ k: 'msg-ed', id: eid, x, at }).catch(() => {});
    return;
  }
  const m = { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at, x };
  setJ(PK(), [...getJ(PK()), m].slice(-30));
  draft = '';
  paint();
  try { await sendItem({ k: 'msg', id: m.id, x, at }); setJ(PK(), getJ(PK()).map((z) => (z.id === m.id ? { ...z, sent: 1 } : z))); } catch { /* reste en attente, renvoyé plus tard */ }
}
