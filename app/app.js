// App LuxInterventions (v1.0.0) — une seule app pour tous, sans centrale ni compte.
// Demande : service → qui êtes-vous → le problème + photos → envoi par e-mail / WhatsApp / SMS.
// Les données (demandes, devis, signatures) restent UNIQUEMENT sur ce téléphone (localStorage) ; 📦 sauvegarde / import.
// Les photos et signatures passent par le Worker du site (PUT /api/upload/<id>/<1|2|3>), comme les formulaires du site.
import { luxMail, LUX_TEL, LUX_TEL_TXT } from './mail.js';

const WORKER = 'https://luxinterventions-hitcounter.weathered-tree-cfd3.workers.dev';
const KEY = 'luxapp';
const SERVICES = [
  ['toiture', 'Toiture', '🏗️', '#EBF3FB'], ['jardin', 'Jardinage', '🌿', '#EBF5EF'], ['etanch', 'Étanchéité', '🛡️', '#FDF0EB'],
  ['renov', 'Rénovation et façades', '🏘️', '#F3EEFB', 'Rénovation façades'], ['serr', 'Serrurerie', '🔐', '#FFF8E1'], ['plomb', 'Plomberie & Débouchage', '💧', '#EBF3FB'],
  ['elec', 'Électricité', '⚡', '#FFF3E0'], ['dechets', 'Collecte Déchets & Déchets Spéciaux', '🗑️', '#F5F5F5', 'Collecte déchets'], ['demen', 'Déménagement', '🚚', '#E8F4FD'],
  ['brico', 'Bricolage & Améliorations', '🔧', '#F0FBF0', 'Bricolage'], ['nett', 'Nettoyage des résidences', '🧹', '#E6F7F5', 'Nettoyage'], ['solaire', 'Panneaux solaires', '☀️', '#FFF7E0'],
];
const AUTRE = ['autre', 'Autre demande', '➕', '#eeeeee'];
const svc = (k) => SERVICES.find((s) => s[0] === k) || AUTRE;
const STATUTS = { proprietaire: 'Propriétaire', locataire: 'Locataire', syndic: 'Syndic' };
const URG = { normal: 'Normal', jour: 'Aujourd’hui', urgent: '🔴 Urgent' };
const ST = { envoyee: '📨 Envoyée', devis: '📝 Devis reçu', signe: '✍️ Devis signé', fait: '✅ Terminé' };
// « Envoyée » et « Terminé » sont deux choses différentes : la question « l’intervention a-t-elle été faite ? » arrive
// seulement après la signature du devis, ou 1 jour après l’envoi d’un dommage sans devis (et 1 jour après « Pas encore »)
const DAY = 864e5;
const askDone = (r) => r.st !== 'fait' && Date.now() - Date.parse(r.askAt || r.at) >= (r.askAt ? DAY : 0) && (r.devis ? !!r.devis.signedAt : Date.now() - Date.parse(r.at) >= DAY);
const AVQ = [['pon', 'Ponctualité'], ['pro', 'Propreté'], ['trav', 'Travail bien fait']];
const stars = (n) => '⭐'.repeat(n) + '☆'.repeat(5 - n);
let avis = null;
const VIA = { mail: 'e-mail', wa: 'WhatsApp', sms: 'SMS', copie: 'copie du texte' };

// ── mémoire du téléphone ──
const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY) || '{}'); return { me: d.me || {}, reqs: Array.isArray(d.reqs) ? d.reqs : [], v: 1 }; } catch { return { me: {}, reqs: [], v: 1 }; } };
let db = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch { toast('Mémoire du téléphone pleine : 📦 sauvegardez puis supprimez d’anciennes demandes'); return false; } };
const getReq = (id) => db.reqs.find((r) => r.id === id);

// ── petits outils ──
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'r' + Date.now() + Math.random().toString(36).slice(2));
const fmt = (iso) => { try { return new Date(iso).toLocaleDateString('fr-LU', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return iso; } };
const view = document.getElementById('view');
let toastT;
function toast(t) { const el = document.getElementById('toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 3200); }
const setSub = (t) => { document.getElementById('topSub').textContent = t || 'Interventions techniques 7j/7 · 24h/24'; };

// photo → JPEG réduit (envoi) + miniature (gardée sur le téléphone)
function toJpeg(file, max, q) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight; const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? res({ blob: b, data: c.toDataURL('image/jpeg', q) }) : rej(new Error('image'))), 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
    img.src = url;
  });
}
// data:… → Blob (sans fetch : la politique de sécurité de la page interdit fetch sur data:)
const dataBlob = (d) => { const [h, b64] = d.split(','), bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: (h.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream' }); };
async function upload(rid, slot, blob, type) {
  const r = await fetch(`${WORKER}/api/upload/${rid}/${slot}`, { method: 'PUT', headers: { 'Content-Type': type }, body: blob });
  if (!r.ok) throw new Error('upload ' + r.status);
  return (await r.json()).url;
}

// ── envoi : e-mail, WhatsApp, SMS, copie ──
const waNum = LUX_TEL.replace(/\D/g, '');
async function sendVia(via, subject, text) {
  if (via === 'mail') location.href = `mailto:${luxMail()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  else if (via === 'wa') window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  else if (via === 'sms') location.href = `sms:${LUX_TEL}?&body=${encodeURIComponent(text)}`;
  else {
    try { await navigator.clipboard.writeText(text); toast('Texte copié : collez-le dans votre message à LuxInterventions'); }
    catch { prompt('Copiez ce texte :', text); }
  }
}
const sendBtns = (act) => `<div class="three">
  <button type="button" style="background:var(--accent)" data-act="${act}" data-via="mail"><em>✉️</em>E-mail</button>
  <button type="button" style="background:#25D366" data-act="${act}" data-via="wa"><em>💬</em>WhatsApp</button>
  <button type="button" style="background:var(--blue)" data-act="${act}" data-via="sms"><em>📱</em>SMS</button></div>
  <button type="button" class="btn gh" data-act="${act}" data-via="copie">📋 Copier le texte</button>`;

function reqText(r) {
  const s = svc(r.service);
  return '=== ' + (r.kind === 'devis' ? 'DEMANDE DE DEVIS' : 'DEMANDE D’INTERVENTION — DOMMAGE') + ' ===\n\n'
    + 'SERVICE : ' + s[1] + '\nURGENCE : ' + (URG[r.urg] || 'Normal') + '\nRÉFÉRENCE : ' + r.ref + '\n\n'
    + '--- QUI ---\n' + (STATUTS[r.statut] || '') + '\nNom : ' + r.nom + '\nTél : ' + r.tel + '\nE-mail : ' + (r.email || 'non renseigné') + '\n\n'
    + '--- OÙ ---\n' + r.adresse + (r.acces ? '\nAccès : ' + r.acces : '') + '\n\n'
    + '--- LE PROBLÈME / LA DEMANDE ---\n' + (r.notes || '—') + '\n\n'
    + '--- PHOTOS ---\n' + (r.photos.filter((p) => p.url).map((p) => p.url).join('\n') || 'Aucune photo') + '\n\n'
    + '=== Envoyé depuis l’app LuxInterventions ===';
}
const reqSubject = (r) => `[LuxInterventions] ${r.kind === 'devis' ? 'Demande de devis' : 'Dommage'} : ${svc(r.service)[1]} — ${r.nom}`;

// ── brouillon de la demande en cours (pas encore enregistré) ──
let draft = null;
const newDraft = (service) => ({ id: uid(), ref: 'LUX-' + Date.now().toString(36).toUpperCase().slice(-6), service, kind: 'dommage', statut: db.me.statut || '', nom: db.me.nom || '', tel: db.me.tel || '', email: db.me.email || '',
  adresse: db.me.adresse || '', acces: db.me.acces || '', notes: '', urg: 'normal', photos: [], st: 'brouillon' });

// ── écrans ──
const nav = (tab) => document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (location.hash === '' || location.hash === '#/') render(); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
function installBox() {
  if (standalone()) return '';
  try { if (localStorage.getItem('luxappInstHide') === '1') return ''; } catch { /* */ }
  // toujours la clip iPhone / Android (le bouton « Installer » seulement quand le téléphone le permet)
  return `<div class="inst" style="flex-wrap:wrap"><span style="font-size:26px">📲</span><div class="g"><b>Installer l’app</b>L’icône LuxInterventions sur votre téléphone, comme une vraie app</div>${deferredInstall ? '<button data-act="install">Installer</button>' : ''}<button class="x" data-act="inst-hide" aria-label="Fermer">✕</button>
    <div data-install-clip style="width:100%;background:#fff;border-radius:12px;margin-top:6px;padding:2px 0"></div></div>`;
}

const SCREENS = {
  home() {
    nav('services'); setSub();
    return `${installBox()}<h2>De quoi avez-vous besoin ?</h2><p class="sub">Touchez un service : dépannage ou devis.</p>
      <div class="grid">${SERVICES.map(([k, n, e, c, sh]) => `<button class="tile" data-act="svc" data-k="${k}"><i style="background:${c}">${e}</i><span>${esc(sh || n)}</span></button>`).join('')}</div>
      <button class="row" style="margin-top:10px" data-act="svc" data-k="autre"><i style="background:#eee">➕</i><span class="g"><b>Autre demande</b><small>Ce qui n’est pas dans la liste</small></span></button>`;
  },
  step1() {
    const d = draft, s = svc(d.service); nav('services'); setSub(s[1]);
    return `<div class="steps"><i class="on"></i><i></i><i></i></div>
      <div class="hd"><i style="background:${s[3]}">${s[2]}</i><div><b>${esc(s[1])}</b><small>Étape 1 sur 3 · Vous</small></div></div>
      <div class="seg" data-seg="kind"><button type="button" data-v="dommage" class="${d.kind === 'dommage' ? 'on' : ''}">🚨 Dommage</button><button type="button" data-v="devis" class="${d.kind === 'devis' ? 'on' : ''}">📝 Demande de devis</button></div>
      <label>Vous êtes <span class="req">*</span></label>
      <div class="seg" data-seg="statut">${Object.entries(STATUTS).map(([k, v]) => `<button type="button" data-v="${k}" class="${d.statut === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      <label for="f-nom">Nom et prénom (ou société) <span class="req">*</span></label><input type="text" id="f-nom" data-f="nom" value="${esc(d.nom)}" autocomplete="name" maxlength="120">
      <label for="f-tel">Téléphone <span class="req">*</span></label><input type="tel" id="f-tel" data-f="tel" value="${esc(d.tel)}" autocomplete="tel" maxlength="40">
      <label for="f-mail">E-mail (facultatif)</label><input type="email" id="f-mail" data-f="email" value="${esc(d.email)}" autocomplete="email" maxlength="120">
      <p class="sub">✓ Gardé sur ce téléphone pour la prochaine fois</p>
      <button class="btn" data-act="next1">Continuer →</button>
      <button class="btn gh" data-act="cancel">Annuler</button>`;
  },
  step2() {
    const d = draft, s = svc(d.service); nav('services'); setSub(s[1]);
    const ph = [0, 1, 2].map((i) => (d.photos[i] ? `<div class="ph"><img src="${d.photos[i].th}" alt=""><button class="x" data-act="ph-del" data-i="${i}" aria-label="Retirer">✕</button></div>`
      : i === d.photos.length ? `<label class="ph" style="margin:0">📷<input type="file" accept="image/*" data-in="photo" hidden></label>` : '<div class="ph" style="border-style:dotted;opacity:.4"></div>')).join('');
    return `<div class="steps"><i class="on"></i><i class="on"></i><i></i></div>
      <button class="back" data-act="go" data-to="#/f/1">‹ Retour</button>
      <div class="hd"><i style="background:${s[3]}">${s[2]}</i><div><b>${d.kind === 'devis' ? 'Votre demande' : 'Le problème'}</b><small>Étape 2 sur 3</small></div></div>
      <label for="f-adr">Adresse de l’intervention <span class="req">*</span></label><input type="text" id="f-adr" data-f="adresse" value="${esc(d.adresse)}" autocomplete="street-address" maxlength="200" placeholder="Rue, n°, code postal, ville">
      <label for="f-acc">Accès (étage, code, clés…)</label><input type="text" id="f-acc" data-f="acces" value="${esc(d.acces)}" maxlength="200">
      <label>Photos (jusqu’à 3)</label><div class="photos">${ph}</div>
      <label for="f-notes">${d.kind === 'devis' ? 'Décrivez les travaux souhaités' : 'Décrivez le problème'} <span class="req">*</span></label><textarea id="f-notes" data-f="notes" maxlength="2000">${esc(d.notes)}</textarea>
      <label>Urgence</label>
      <div class="seg" data-seg="urg">${Object.entries(URG).map(([k, v]) => `<button type="button" data-v="${k}" class="${d.urg === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      <button class="btn" data-act="next2">Continuer →</button>`;
  },
  step3() {
    const d = draft, s = svc(d.service); nav('services'); setSub('Demande prête');
    const recap = `${s[2]} <b>${esc(s[1])}</b> · ${d.kind === 'devis' ? '📝 Devis' : '🚨 Dommage'} · ${URG[d.urg]}\n👤 ${esc(d.nom)} · ${STATUTS[d.statut]}\n📞 ${esc(d.tel)}\n📍 ${esc(d.adresse)}${d.acces ? ' · ' + esc(d.acces) : ''}\n📷 ${d.photos.length} photo${d.photos.length > 1 ? 's' : ''}${d.photos.some((p) => !p.url) ? ' (⚠️ pas toutes envoyées)' : ''}\n📝 ${esc(d.notes.slice(0, 140))}${d.notes.length > 140 ? '…' : ''}`;
    return `<div class="steps"><i class="on"></i><i class="on"></i><i class="on"></i></div>
      <button class="back" data-act="go" data-to="#/f/2">‹ Retour</button>
      <div class="recap">${recap}</div>
      <label>Envoyer à LuxInterventions par</label>${sendBtns('send')}
      <p class="sub" style="margin-top:12px">Votre demande est gardée dans 📋 Mes demandes.</p>`;
  },
  mes() {
    nav('mes'); setSub('Mes demandes');
    const L = db.reqs.slice().sort((a, b) => (b.at || '').localeCompare(a.at || ''));
    const row = (r) => { const s = svc(r.service); return `<button class="row" data-act="go" data-to="#/r/${r.id}"><i style="background:${s[3]}">${s[2]}</i><span class="g"><b>${esc(s[1])} · ${r.kind === 'devis' ? 'Devis' : 'Dommage'}</b><small>${r.st === 'fait' ? 'terminé le ' + fmt(r.doneAt || r.at) + (r.avis ? ' · ' + stars(r.avis.stars) : ' · ⭐ avis à donner') : fmt(r.at) + (r.via ? ' · envoyée par ' + VIA[r.via] : '') + (r.devis && r.devis.no ? ' · devis ' + esc(r.devis.no) : '')}</small></span><span class="bd b-${r.st}">${askDone(r) ? '❓ Fait ?' : ST[r.st] || ''}</span></button>`; };
    const open = L.filter((r) => r.st !== 'fait'), done = L.filter((r) => r.st === 'fait');
    if (!L.length) return '<h2>Mes demandes</h2><p class="empty">Aucune demande pour le moment.<br>Touchez 🏠 Services pour en faire une.</p>';
    return `<h2>Mes demandes</h2>
      <div class="sec">🕓 En cours (${open.length})</div>${open.length ? open.map(row).join('') : '<p class="sub">Rien en cours.</p>'}
      <div class="sec">✅ Travaux terminés (${done.length})</div>${done.length ? done.map(row).join('') : '<p class="sub">Aucun travail terminé pour le moment.</p>'}`;
  },
  req(id) {
    const r = getReq(id); if (!r) return SCREENS.mes();
    const s = svc(r.service); nav('mes'); setSub(s[1]);
    const dv = r.devis;
    return `<button class="back" data-act="go" data-to="#/mes">‹ Mes demandes</button>
      <div class="hd"><i style="background:${s[3]}">${s[2]}</i><div><b>${esc(s[1])} · ${r.kind === 'devis' ? 'Devis' : 'Dommage'}</b><small>${fmt(r.at)} · réf. ${esc(r.ref)}${r.via ? ' · par ' + VIA[r.via] : ''}</small></div><span class="bd b-${r.st}" style="margin-left:auto">${ST[r.st]}</span></div>
      ${r.st === 'fait' ? `<div class="note ok-note">✅ <b>Travaux terminés</b> le ${fmt(r.doneAt || r.at)}${r.avis ? `<br>Votre avis : ${stars(r.avis.stars)}${r.avis.txt ? ' — « ' + esc(r.avis.txt.slice(0, 120)) + ' »' : ''} · envoyé le ${fmt(r.avis.at)}` : ''}</div>${r.avis ? '' : `<button class="btn" style="margin-bottom:12px" data-act="go" data-to="#/r/${r.id}/avis">⭐ Donner mon avis</button>`}`
        : `<div class="note" style="background:#EBF3FB;color:#1f4f7a">📨 <b>Demande envoyée</b> le ${fmt(r.at)}${r.via ? ' par ' + VIA[r.via] : ''}. LuxInterventions vous recontacte.</div>`}
      <div class="recap">👤 ${esc(r.nom)} · ${STATUTS[r.statut] || ''}\n📞 ${esc(r.tel)}\n📍 ${esc(r.adresse)}${r.acces ? ' · ' + esc(r.acces) : ''}\n📝 ${esc(r.notes)}</div>
      ${r.photos.length ? `<div class="photos">${r.photos.map((p) => `<div class="ph" style="cursor:default"><img src="${p.th}" alt=""></div>`).join('')}</div>` : ''}
      ${dv ? `<div class="sec">Devis${dv.no ? ' ' + esc(dv.no) : ''}</div>
        ${dv.th ? `<img class="devimg" src="${dv.th}" alt="Devis">` : dv.name ? `<div class="pdfbox">📄 ${esc(dv.name)}</div>` : ''}
        <p class="sub">Reçu le ${fmt(dv.at)}${dv.signedAt ? ` · ✍️ signé « Bon pour accord » le ${fmt(dv.signedAt)}` : ''}</p>
        ${dv.sigTh ? `<img class="devimg" style="max-height:120px;object-fit:contain" src="${dv.sigTh}" alt="Signature">` : ''}
        ${dv.signedAt ? `<label>Renvoyer le devis signé</label>${sendBtns('resend-sig')}` : `<button class="btn" data-act="go" data-to="#/r/${r.id}/signer">✍️ Signer le devis</button>`}`
      : `<button class="btn" data-act="go" data-to="#/r/${r.id}/devis">📝 J’ai reçu un devis</button>`}
      ${r.st === 'fait' ? '' : askDone(r) ? `<div class="sec">Et maintenant ?</div><div class="recap" style="text-align:center"><b>L’intervention a-t-elle été faite ?</b><div class="three" style="grid-template-columns:1fr 1fr;margin:10px 0 0"><button type="button" style="background:var(--green)" data-act="fait" data-id="${r.id}"><em>✅</em>Oui, c’est fait</button><button type="button" style="background:#8a857b" data-act="pas-encore" data-id="${r.id}"><em>⏳</em>Pas encore</button></div></div>` : ''}
      ${r.st === 'fait' ? '' : `<button class="btn gh" data-act="resend" data-id="${r.id}">↻ Renvoyer la demande</button>`}
      <button class="btn gh" style="color:#b91c1c" data-act="del" data-id="${r.id}">🗑️ Supprimer de ce téléphone</button>`;
  },
  devis(id) {
    const r = getReq(id); if (!r) return SCREENS.mes();
    nav('mes'); setSub('Devis reçu');
    return `<button class="back" data-act="go" data-to="#/r/${id}">‹ Retour</button>
      <h2>📝 J’ai reçu un devis</h2><p class="sub">Ajoutez le devis reçu de LuxInterventions (photo, capture d’écran ou PDF), puis signez-le.</p>
      <label for="f-dno">N° du devis (s’il y en a un)</label><input type="text" id="f-dno" data-dv="no" maxlength="40" placeholder="ex. D-0042">
      <label class="btn gh" style="margin:0 0 12px">📷 Photo du devis<input type="file" accept="image/*" data-in="devis" hidden></label>
      <label class="btn gh" style="margin:0 0 12px">📄 Fichier PDF du devis<input type="file" accept="application/pdf" data-in="devis" hidden></label>
      <p class="sub">Le devis reste sur ce téléphone. Une photo est aussi envoyée à LuxInterventions avec votre signature ; un PDF reste seulement ici (LuxInterventions a déjà l’original).</p>`;
  },
  signer(id) {
    const r = getReq(id); if (!r || !r.devis) return SCREENS.mes();
    const dv = r.devis; nav('mes'); setSub('Signer le devis');
    return `<button class="back" data-act="go" data-to="#/r/${id}">‹ Retour</button>
      <div class="hd"><i style="background:#FFF8E1">📝</i><div><b>Devis${dv.no ? ' ' + esc(dv.no) : ''}</b><small>Reçu le ${fmt(dv.at)}</small></div></div>
      ${dv.th ? `<img class="devimg" src="${dv.th}" alt="Devis">` : `<div class="pdfbox">📄 ${esc(dv.name || 'Devis')}</div>`}
      <label for="f-sname">Nom du signataire <span class="req">*</span></label><input type="text" id="f-sname" data-sn="1" value="${esc(r.nom)}" maxlength="120">
      <label>Votre signature — « Bon pour accord » <span class="req">*</span></label>
      <div class="sig" id="sig"><canvas></canvas><span>✍️ signez ici avec le doigt</span></div>
      <button class="back" data-act="sig-clear">↺ Effacer la signature</button>
      <button class="btn" data-act="sign" data-id="${id}">✅ Accepter et signer</button>`;
  },
  avis(id) {
    const r = getReq(id); if (!r) return SCREENS.mes();
    nav('mes'); setSub('Votre avis');
    if (!avis || avis.id !== id) avis = { id, stars: 0, q: {}, txt: '' };
    return `<button class="back" data-act="go" data-to="#/r/${id}">‹ Retour</button>
      <h2>⭐ Êtes-vous satisfait ?</h2><p class="sub">${esc(svc(r.service)[1])} · terminé le ${fmt(r.doneAt)}</p>
      <label>Note générale <span class="req">*</span></label>
      <div class="seg" data-avis="stars" style="font-size:24px">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}" class="${avis.stars >= n ? 'on' : ''}" aria-label="${n} sur 5">${avis.stars >= n ? '⭐' : '☆'}</button>`).join('')}</div>
      ${AVQ.map(([k, l]) => `<label>${l}</label><div class="seg" data-avis="${k}"><button type="button" data-v="1" class="${avis.q[k] === 1 ? 'on' : ''}">👍 Oui</button><button type="button" data-v="0" class="${avis.q[k] === 0 ? 'on' : ''}">👎 Non</button></div>`).join('')}
      <label for="f-av">Un commentaire (facultatif)</label><textarea id="f-av" data-av="txt" maxlength="1000">${esc(avis.txt)}</textarea>
      <label>Envoyer votre avis à LuxInterventions par</label>${sendBtns('avis-send')}`;
  },
  moi() {
    nav('moi'); setSub('Moi');
    const m = db.me;
    return `<h2>Moi</h2>
      <button class="row" data-act="go" data-to="#/moi/edit"><i style="background:#EBF3FB">👤</i><span class="g"><b>${esc(m.nom || 'Mes coordonnées')}</b><small>${esc([m.tel, STATUTS[m.statut]].filter(Boolean).join(' · ') || 'Nom, téléphone, adresse')}</small></span><span class="bd b-envoyee">✏️</span></button>
      <div class="note">⚠️ Vos demandes et vos devis sont <b>uniquement sur ce téléphone</b>. Avant de changer de téléphone : <b>📦 Sauvegarder</b>, puis 📥 Importer sur le nouveau.</div>
      <div class="sec">Mes données</div>
      <button class="row" data-act="backup"><i style="background:#E7F4EC">📦</i><span class="g"><b>Sauvegarder mes données</b><small>Un fichier à garder ou à envoyer sur votre nouveau téléphone</small></span></button>
      <label class="row" style="margin-bottom:9px"><i style="background:#F3EEFB">📥</i><span class="g"><b>Importer sur ce téléphone</b><small>Retrouver demandes et devis</small></span><input type="file" accept="application/json,.json" data-in="import" hidden></label>
      <div class="sec">Infos</div>
      <button class="row" data-act="go" data-to="#/conf"><i style="background:#F5F5F5">🔒</i><span class="g"><b>Confidentialité</b><small>Qui reçoit vos données et pourquoi</small></span></button>
      <div class="sec">Contacter LuxInterventions</div>
      ${sendBtns('contact')}
      <a class="btn gh" href="tel:${LUX_TEL}">📞 Appeler ${LUX_TEL_TXT}</a>
      <p class="sub" style="text-align:center;margin-top:18px">App LuxInterventions · v1.2.0</p>`;
  },
  edit() {
    nav('moi'); setSub('Mes coordonnées'); const m = db.me;
    return `<button class="back" data-act="go" data-to="#/moi">‹ Moi</button><h2>Mes coordonnées</h2><p class="sub">Elles remplissent vos demandes toutes seules. Gardées seulement sur ce téléphone.</p>
      <label>Vous êtes</label><div class="seg" data-seg="me-statut">${Object.entries(STATUTS).map(([k, v]) => `<button type="button" data-v="${k}" class="${m.statut === k ? 'on' : ''}">${v}</button>`).join('')}</div>
      <label for="m-nom">Nom et prénom (ou société)</label><input type="text" id="m-nom" data-me="nom" value="${esc(m.nom)}" maxlength="120">
      <label for="m-tel">Téléphone</label><input type="tel" id="m-tel" data-me="tel" value="${esc(m.tel)}" maxlength="40">
      <label for="m-mail">E-mail</label><input type="email" id="m-mail" data-me="email" value="${esc(m.email)}" maxlength="120">
      <label for="m-adr">Adresse</label><input type="text" id="m-adr" data-me="adresse" value="${esc(m.adresse)}" maxlength="200">
      <label for="m-acc">Accès (étage, code, clés…)</label><input type="text" id="m-acc" data-me="acces" value="${esc(m.acces)}" maxlength="200">
      <button class="btn" data-act="me-save">Enregistrer</button>`;
  },
  conf() {
    nav('moi'); setSub('Confidentialité');
    return `<button class="back" data-act="go" data-to="#/moi">‹ Moi</button><h2>🔒 Confidentialité</h2><div class="text">
      <p><b>Qui reçoit vos données ?</b> LuxInterventions, seulement quand <b>vous</b> envoyez une demande ou un devis signé (e-mail, WhatsApp ou SMS).</p>
      <p><b>Pourquoi ?</b> Uniquement pour préparer et réaliser les devis et interventions que vous demandez.</p>
      <p><b>Où restent-elles ?</b></p><ul>
        <li>Vos demandes, vos devis et vos signatures restent <b>sur ce téléphone</b>. Il n’y a pas de compte ni de centrale.</li>
        <li>Le message que vous envoyez reste dans votre messagerie et dans celle de LuxInterventions.</li>
        <li>Les photos et signatures envoyées sont gardées en ligne par LuxInterventions (un lien est mis dans votre message), le temps nécessaire au traitement de votre demande.</li></ul>
      <p><b>Vos droits :</b> pour obtenir, corriger ou faire supprimer vos données chez LuxInterventions, écrivez-nous (bouton ci-dessous). Sur ce téléphone, vous pouvez supprimer une demande à tout moment.</p>
      <p><b>Votre responsabilité :</b> vous choisissez ce que vous envoyez et à qui ; gardez une 📦 sauvegarde si vous changez de téléphone.</p></div>
      ${sendBtns('contact')}`;
  },
};

// ── signature au doigt ──
let sigPad = null;
function sigInit() {
  const box = document.getElementById('sig'); if (!box) { sigPad = null; return; }
  const c = box.querySelector('canvas'), r = c.getBoundingClientRect(), dpr = Math.max(1, window.devicePixelRatio || 1);
  c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
  const x = c.getContext('2d'); x.scale(dpr, dpr); x.lineWidth = 2.4; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#1B2E4B';
  sigPad = { c, used: false };
  let on = false, lx = 0, ly = 0;
  const pt = (e) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  c.addEventListener('pointerdown', (e) => { on = true; [lx, ly] = pt(e); c.setPointerCapture(e.pointerId); box.querySelector('span').hidden = true; });
  c.addEventListener('pointermove', (e) => { if (!on) return; const [nx, ny] = pt(e); x.beginPath(); x.moveTo(lx, ly); x.lineTo(nx, ny); x.stroke(); lx = nx; ly = ny; sigPad.used = true; });
  const up = () => { on = false; }; c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
}

// ── rendu ──
function render() {
  const h = location.hash || '#/';
  let m;
  if (/^#\/f\/[123]$/.test(h)) { if (!draft) { location.hash = '#/'; return; } view.innerHTML = SCREENS['step' + h.slice(-1)](); }
  else if ((m = h.match(/^#\/r\/([\w-]+)\/devis$/))) view.innerHTML = SCREENS.devis(m[1]);
  else if ((m = h.match(/^#\/r\/([\w-]+)\/signer$/))) view.innerHTML = SCREENS.signer(m[1]);
  else if ((m = h.match(/^#\/r\/([\w-]+)\/avis$/))) view.innerHTML = SCREENS.avis(m[1]);
  else if ((m = h.match(/^#\/r\/([\w-]+)$/))) view.innerHTML = SCREENS.req(m[1]);
  else if (h === '#/mes') view.innerHTML = SCREENS.mes();
  else if (h === '#/moi') view.innerHTML = SCREENS.moi();
  else if (h === '#/moi/edit') view.innerHTML = SCREENS.edit();
  else if (h === '#/conf') view.innerHTML = SCREENS.conf();
  else view.innerHTML = SCREENS.home();
  sigInit();
  if (window.luxInstallClip) view.querySelectorAll('[data-install-clip]').forEach(window.luxInstallClip);
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

// ── saisie ──
view.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.f && draft) draft[t.dataset.f] = t.value;
  if (t.dataset.av && avis) avis.txt = t.value;
});
view.addEventListener('click', async (e) => {
  const sb = e.target.closest('.seg button');
  if (sb) {
    const seg = sb.parentElement.dataset.seg;
    sb.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b === sb));
    const av = sb.parentElement.dataset.avis;
    if (av && avis) { if (av === 'stars') { avis.stars = +sb.dataset.v; render(); } else avis.q[av] = +sb.dataset.v; return; }
    if (seg === 'me-statut') sb.parentElement.dataset.val = sb.dataset.v;
    else if (draft) draft[seg] = sb.dataset.v;
    return;
  }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, via = b.dataset.via;
  if (a === 'go') { location.hash = b.dataset.to; return; }
  if (a === 'svc') { draft = newDraft(b.dataset.k); location.hash = '#/f/1'; return; }
  if (a === 'cancel') { draft = null; location.hash = '#/'; return; }
  if (a === 'install' && deferredInstall) { deferredInstall.prompt(); deferredInstall = null; render(); return; }
  if (a === 'inst-hide') { try { localStorage.setItem('luxappInstHide', '1'); } catch { /* */ } render(); return; }
  if (a === 'next1') {
    if (!draft.statut) return toast('Choisissez : Propriétaire, Locataire ou Syndic');
    if (!draft.nom.trim() || !draft.tel.trim()) return toast('Écrivez votre nom et votre téléphone');
    Object.assign(db.me, { statut: draft.statut, nom: draft.nom.trim(), tel: draft.tel.trim(), email: draft.email.trim() }); save();
    location.hash = '#/f/2'; return;
  }
  if (a === 'ph-del') { draft.photos.splice(+b.dataset.i, 1); render(); return; }
  if (a === 'next2') {
    if (!draft.adresse.trim()) return toast('Écrivez l’adresse de l’intervention');
    if (!draft.notes.trim()) return toast(draft.kind === 'devis' ? 'Décrivez les travaux souhaités' : 'Décrivez le problème');
    Object.assign(db.me, { adresse: draft.adresse.trim(), acces: draft.acces.trim() }); save();
    // envoi des photos (au mieux : une photo qui ne passe pas n'empêche pas la demande)
    b.disabled = true;
    for (let i = 0; i < draft.photos.length; i++) {
      const p = draft.photos[i]; if (p.url || !p.blob) continue;
      b.textContent = `⏳ Envoi de la photo ${i + 1}…`;
      try { p.url = await upload(draft.id, i + 1, p.blob, 'image/jpeg'); } catch { /* sans cette photo */ }
    }
    location.hash = '#/f/3'; return;
  }
  if (a === 'send') {
    const r = { ...draft, photos: draft.photos.map((p) => ({ url: p.url || '', th: p.th })), at: new Date().toISOString(), st: 'envoyee', via };
    const old = getReq(r.id); if (old) Object.assign(old, r); else db.reqs.push(r);
    save();
    await sendVia(via, reqSubject(r), reqText(r));
    draft = null;
    setTimeout(() => { location.hash = '#/r/' + r.id; toast('✅ Demande gardée dans Mes demandes'); }, via === 'copie' ? 400 : 1200);
    return;
  }
  if (a === 'resend') { const r = getReq(b.dataset.id); if (r) { draft = { ...r, photos: r.photos.map((p) => ({ ...p })) }; location.hash = '#/f/3'; } return; }
  if (a === 'fait') { const r = getReq(b.dataset.id); if (r) { r.st = 'fait'; r.doneAt = new Date().toISOString(); save(); location.hash = '#/r/' + r.id + '/avis'; toast('✅ Travaux terminés : donnez votre avis'); } return; }
  if (a === 'pas-encore') { const r = getReq(b.dataset.id); if (r) { r.askAt = new Date().toISOString(); save(); render(); toast('D’accord : on vous redemandera demain'); } return; }
  if (a === 'avis-send') {
    const r = getReq(location.hash.split('/')[2]); if (!r || !avis) return;
    if (!avis.stars) return toast('Choisissez une note de 1 à 5 étoiles');
    r.avis = { stars: avis.stars, q: { ...avis.q }, txt: avis.txt.trim(), at: new Date().toISOString() }; save();
    const s = svc(r.service);
    const text = '=== AVIS CLIENT — TRAVAUX TERMINÉS ===\n\n' + 'Service : ' + s[1] + '\nDemande : ' + r.ref + ' du ' + fmt(r.at) + '\nTerminé le : ' + fmt(r.doneAt) + '\nClient : ' + r.nom + ' · ' + r.tel + '\nAdresse : ' + r.adresse + '\n\n'
      + 'Note : ' + r.avis.stars + '/5 ' + stars(r.avis.stars) + '\n' + AVQ.map(([k, l]) => l + ' : ' + (r.avis.q[k] === 1 ? '👍 oui' : r.avis.q[k] === 0 ? '👎 non' : '—')).join('\n')
      + '\n\nCommentaire : ' + (r.avis.txt || '—') + '\n\n=== Envoyé depuis l’app LuxInterventions ===';
    await sendVia(via, `[LuxInterventions] Avis ${r.avis.stars}/5 — ${s[1]} — ${r.nom}`, text);
    avis = null; setTimeout(() => { location.hash = '#/r/' + r.id; toast('Merci pour votre avis !'); }, via === 'copie' ? 400 : 1200);
    return;
  }
  if (a === 'del') {
    if (!confirm('Supprimer cette demande de ce téléphone ? (LuxInterventions garde le message déjà reçu)')) return;
    db.reqs = db.reqs.filter((x) => x.id !== b.dataset.id); save(); location.hash = '#/mes'; return;
  }
  if (a === 'sig-clear') { render(); return; }
  if (a === 'sign') {
    const r = getReq(b.dataset.id); if (!r) return;
    const who = (view.querySelector('[data-sn]') || {}).value || '';
    if (!who.trim()) return toast('Écrivez le nom du signataire');
    if (!sigPad || !sigPad.used) return toast('Signez dans le cadre avec le doigt');
    b.disabled = true; b.textContent = '⏳ Envoi de la signature…';
    const sigData = sigPad.c.toDataURL('image/png');
    const sigBlob = dataBlob(sigData);
    const rid = uid(), dv = r.devis;
    try { dv.sigUrl = await upload(rid, 1, sigBlob, 'image/png'); } catch { dv.sigUrl = ''; }
    if (dv.blobData && !dv.devUrl) { try { dv.devUrl = await upload(rid, 2, dataBlob(dv.blobData), 'image/jpeg'); } catch { dv.devUrl = ''; } }
    delete dv.blobData;
    dv.sigTh = sigData; dv.signedAt = new Date().toISOString(); dv.signer = who.trim(); r.st = 'signe';
    save(); location.hash = '#/r/' + r.id; toast('✍️ Devis signé : renvoyez-le à LuxInterventions'); return;
  }
  if (a === 'resend-sig') {
    const r = getReq(location.hash.split('/')[2]); if (!r || !r.devis) return;
    const dv = r.devis, s = svc(r.service);
    const text = '=== DEVIS ACCEPTÉ — « BON POUR ACCORD » ===\n\n' + 'Devis : ' + (dv.no || '(sans numéro)') + '\nService : ' + s[1] + '\nDemande : ' + r.ref + ' du ' + fmt(r.at) + '\n\n'
      + 'Signé par : ' + dv.signer + '\nLe : ' + new Date(dv.signedAt).toLocaleString('fr-LU') + '\nTél : ' + r.tel + '\nAdresse : ' + r.adresse + '\n\n'
      + 'Signature : ' + (dv.sigUrl || '(non envoyée : connexion)') + '\n' + (dv.devUrl ? 'Photo du devis signé : ' + dv.devUrl + '\n' : '')
      + '\n=== Envoyé depuis l’app LuxInterventions ===';
    await sendVia(via, `[LuxInterventions] Devis accepté ${dv.no || ''} — ${r.nom}`, text);
    return;
  }
  if (a === 'contact') { await sendVia(via, '[LuxInterventions] Question', 'Bonjour LuxInterventions,\n\n'); return; }
  if (a === 'me-save') {
    view.querySelectorAll('[data-me]').forEach((i) => { db.me[i.dataset.me] = i.value.trim(); });
    const sv = view.querySelector('[data-seg=me-statut]').dataset.val; if (sv) db.me.statut = sv;
    save(); toast('Enregistré'); location.hash = '#/moi'; return;
  }
  if (a === 'backup') {
    const blob = new Blob([JSON.stringify({ app: 'luxinterventions', v: 1, at: new Date().toISOString(), ...db })], { type: 'application/json' });
    const u = URL.createObjectURL(blob), l = document.createElement('a');
    l.href = u; l.download = `luxinterventions-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(l); l.click(); l.remove();
    setTimeout(() => URL.revokeObjectURL(u), 5000);
    toast('📦 Fichier enregistré : gardez-le ou envoyez-le sur votre nouveau téléphone');
  }
});
view.addEventListener('change', async (e) => {
  const t = e.target, f = t.files && t.files[0]; if (!f) return;
  if (t.dataset.in === 'photo' && draft) {
    if (!/^image\//.test(f.type)) return toast('Choisissez une photo');
    try { const big = await toJpeg(f, 1600, 0.82), th = await toJpeg(f, 360, 0.7); draft.photos.push({ blob: big.blob, th: th.data, url: '' }); } catch { toast('Photo illisible'); }
    render(); return;
  }
  if (t.dataset.in === 'devis') {
    const r = getReq(location.hash.split('/')[2]); if (!r) return;
    const no = ((view.querySelector('[data-dv=no]') || {}).value || '').trim();
    const dv = { no, at: new Date().toISOString() };
    if (f.type === 'application/pdf') { dv.name = f.name; }
    else if (/^image\//.test(f.type)) { try { const big = await toJpeg(f, 1600, 0.82), th = await toJpeg(f, 900, 0.72); dv.th = th.data; dv.blobData = big.data; } catch { return toast('Image illisible'); } }
    else return toast('Choisissez une photo ou un PDF');
    r.devis = dv; r.st = 'devis';
    if (!save()) { delete dv.blobData; save(); }
    location.hash = '#/r/' + r.id + '/signer'; return;
  }
  if (t.dataset.in === 'import') {
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== 'luxinterventions' || !Array.isArray(d.reqs)) throw new Error('fichier');
      let n = 0; for (const r of d.reqs) { if (r && r.id && !getReq(r.id)) { db.reqs.push(r); n++; } }
      db.me = { ...(d.me || {}), ...Object.fromEntries(Object.entries(db.me).filter(([, v]) => v)) };
      save(); toast(`📥 ${n} demande${n > 1 ? 's' : ''} importée${n > 1 ? 's' : ''}`); render();
    } catch { toast('Ce fichier n’est pas une sauvegarde de l’app LuxInterventions'); }
  }
});

render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/app-sw.js', { scope: '/app' }).catch(() => {});
