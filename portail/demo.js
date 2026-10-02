// Mode démo du portail : tout se passe dans le navigateur, rien n'est envoyé au serveur.
// Mêmes réponses que l'API réelle (/api/portail/*), avec des données d'exemple.

const H = 3600000;
const now = Date.now();
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function createDemo() {
  const users = {
    sophie: { id: 'demo-sophie', org_id: 'demo-org', org_name: 'Gérance Démo', role: 'gerance_admin', name: 'Sophie (démo)', email: 'sophie@gerance-demo.lu', phone: '+352 621 000 000', active: 1, has_password: 1, last_login: now - 2 * H },
    marc: { id: 'demo-marc', org_id: 'demo-org', org_name: 'Gérance Démo', role: 'gerance_user', name: 'Marc (démo)', email: 'marc@gerance-demo.lu', phone: '', active: 1, has_password: 0, last_login: null },
    lux: { id: 'demo-lux', org_id: null, org_name: null, role: 'admin', name: 'Équipe LuxInterventions', email: 'equipe@luxinterventions.com', phone: '', active: 1, has_password: 1, last_login: now - H },
  };
  const orgs = [
    { id: 'demo-org', name: 'Gérance Démo', phone: '+352 20 00 00', email: 'contact@gerance-demo.lu', created_at: now - 90 * 24 * H },
    { id: 'demo-org2', name: 'Syndic Exemple', phone: '', email: '', created_at: now - 60 * 24 * H },
  ];
  const residences = [
    { id: 'r1', org_id: 'demo-org', name: 'Résidence Les Tilleuls', address: '12, rue des Tilleuls, L-1234 Luxembourg', access: 'Code porte 2580', keys_info: 'Boîte à clés à gauche de l’entrée, code 1990', contact_name: 'M. Weber (concierge)', contact_phone: '+352 691 111 111', notes: 'Local technique au sous-sol, compteurs derrière la porte grise.', apartments: 24, active: 1, created_at: now },
    { id: 'r2', org_id: 'demo-org', name: 'Résidence Kirchberg Parc', address: '5, avenue J.F. Kennedy, L-1855 Kirchberg', access: 'Badge chez le gardien', keys_info: '', contact_name: 'Mme Klein', contact_phone: '+352 691 222 222', notes: '', apartments: 48, active: 1, created_at: now },
    { id: 'r3', org_id: 'demo-org', name: 'Bonnevoie Centre', address: '80, rue de Bonnevoie, L-1260 Luxembourg', access: 'Interphone « Syndic »', keys_info: '', contact_name: '', contact_phone: '', notes: '', apartments: 16, active: 1, created_at: now },
    { id: 'r4', org_id: 'demo-org2', name: 'Résidence du Parc', address: '3, rue du Parc, L-8000 Strassen', access: '', keys_info: '', contact_name: '', contact_phone: '', notes: '', apartments: 30, active: 1, created_at: now },
  ];
  const tickets = [];
  const events = [];
  const photos = [];
  let ref = 1000;
  function seed(o) {
    const t = { id: id() + tickets.length, ref: ++ref, lieu: '', categorie: 'Autre', contact_name: '', contact_phone: '', acces: '', dispo: '', planned_at: null, technicien: null, rapport: null, taken_at: null, done_at: null, ...o };
    t.updated_at = o.updated_at || t.created_at;
    tickets.push(t);
    events.push({ id: id() + events.length, ticket_id: t.id, user_id: t.created_by, kind: 'create', status: 'recue', text: null, created_at: t.created_at });
    for (const e of o.history || []) events.push({ id: id() + events.length, ticket_id: t.id, text: null, status: null, ...e });
    delete t.history;
    return t;
  }
  const org = (rid) => residences.find((r) => r.id === rid).org_id;
  seed({ residence_id: 'r1', org_id: 'demo-org', urgence: 'urgent', categorie: 'Plomberie', lieu: 'App. 3B, cuisine', description: 'Fuite sous l’évier, l’eau coule dans l’appartement du dessous.', status: 'recue', created_by: 'demo-sophie', created_at: now - 20 * 60000, contact_name: 'Mme Rossi (locataire)', contact_phone: '+352 621 333 444' });
  seed({ residence_id: 'r2', org_id: 'demo-org', urgence: '24h', categorie: 'Électricité', lieu: 'Hall d’entrée', description: 'Plusieurs spots du hall ne fonctionnent plus.', status: 'planifiee', created_by: 'demo-marc', created_at: now - 26 * H, taken_at: now - 25.5 * H,
    planned_at: new Date(now + 3 * H).toISOString().slice(0, 16), technicien: 'Luca', updated_at: now - 25 * H,
    history: [
      { user_id: 'demo-lux', kind: 'status', status: 'prise', created_at: now - 25.5 * H },
      { user_id: 'demo-lux', kind: 'status', status: 'planifiee', text: 'Luca passe cet après-midi, merci de prévenir le concierge.', created_at: now - 25 * H },
    ] });
  seed({ residence_id: 'r3', org_id: 'demo-org', urgence: 'planifie', categorie: 'Serrurerie', lieu: 'Porte de la cave', description: 'La serrure de la cave commune est dure, il faut forcer.', status: 'terminee', created_by: 'demo-sophie', created_at: now - 6 * 24 * H, taken_at: now - 6 * 24 * H + 2 * H, done_at: now - 4 * 24 * H, updated_at: now - 4 * 24 * H,
    technicien: 'Marco', rapport: 'Cylindre remplacé, 3 clés remises au concierge.',
    history: [
      { user_id: 'demo-lux', kind: 'status', status: 'prise', created_at: now - 6 * 24 * H + 2 * H },
      { user_id: 'demo-sophie', kind: 'comment', text: 'Les clés sont chez M. Weber.', created_at: now - 5 * 24 * H },
      { user_id: 'demo-lux', kind: 'status', status: 'terminee', text: 'Cylindre remplacé, 3 clés remises au concierge.', created_at: now - 4 * 24 * H },
    ] });
  seed({ residence_id: 'r4', org_id: 'demo-org2', urgence: 'urgent', categorie: 'Chauffage / sanitaire', lieu: 'Chaufferie', description: 'Plus d’eau chaude dans tout l’immeuble.', status: 'encours', created_by: 'demo-lux', created_at: now - 3 * H, taken_at: now - 2.8 * H, updated_at: now - H,
    history: [{ user_id: 'demo-lux', kind: 'status', status: 'encours', text: 'Technicien sur place.', created_at: now - H }] });

  let me = users.sophie;
  const notices = [];
  const isAdmin = () => me.role === 'admin';
  const visible = (t) => isAdmin() || t.org_id === me.org_id;
  const withNames = (t) => {
    const r = residences.find((x) => x.id === t.residence_id);
    return { ...t, residence_name: r.name, residence_address: r.address, org_name: orgs.find((o) => o.id === t.org_id).name,
      created_by_name: (Object.values(users).find((u) => u.id === t.created_by) || {}).name, photos: photos.filter((p) => p.ticket_id === t.id).length };
  };
  const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
  const notify = (text) => notices.push(text);

  async function api(path, opts = {}) {
    const method = opts.method || 'GET';
    const url = new URL(path, 'https://demo/');
    const p = url.pathname.slice(1);
    const q = url.searchParams;
    let b = opts.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
    b = b || {};
    await new Promise((r) => setTimeout(r, 120)); // petit délai réaliste
    const scopeOrg = isAdmin() ? q.get('org') || null : me.org_id;

    if (p === 'me') return { user: { ...me }, vapidKey: null };
    if (['logout', 'push', 'push/test', 'me/password'].includes(p)) return { ok: true };

    // annonce d'exemple (dans le vrai portail, elles viennent de l'app de gestion)
    if (p === 'pubs') return { items: [{ id: 'demo1', slot: 'haut', cat: 'resto', nom: 'Pizzeria Da Mario', adresse: '12, rue de Hollerich, Luxembourg', texte: '−10 % pour les gérances et leurs résidents', tel: '+352 22 33 44', web: '', video: '', fin: '' }] };
    if (p === 'stats') {
      const ts = tickets.filter(visible).filter((t) => !scopeOrg || t.org_id === scopeOrg);
      const open = ts.filter((t) => ['recue', 'prise', 'planifiee', 'encours'].includes(t.status));
      const took = ts.filter((t) => t.taken_at);
      const rs = residences.filter((r) => r.active && (!scopeOrg || r.org_id === scopeOrg) && (isAdmin() || r.org_id === me.org_id));
      const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
      return { open: open.length, urgent: open.filter((t) => t.urgence === 'urgent').length, recue: ts.filter((t) => t.status === 'recue').length,
        doneMonth: ts.filter((t) => t.status === 'terminee').length, createdMonth: ts.length,
        avgTakeMs: avg(took.map((t) => t.taken_at - t.created_at)), avgTakeUrgentMs: avg(took.filter((t) => t.urgence === 'urgent').map((t) => t.taken_at - t.created_at)),
        residences: rs.length, apartments: rs.reduce((a, r) => a + (r.apartments || 0), 0) };
    }

    if (p === 'tickets' && method === 'GET') {
      const scope = q.get('scope') || 'active';
      let ts = tickets.filter(visible).filter((t) => !scopeOrg || t.org_id === scopeOrg);
      if (scope === 'active') ts = ts.filter((t) => ['recue', 'prise', 'planifiee', 'encours'].includes(t.status));
      if (scope === 'done') ts = ts.filter((t) => ['terminee', 'annulee'].includes(t.status));
      if (q.get('residence')) ts = ts.filter((t) => t.residence_id === q.get('residence'));
      const rank = { urgent: 0, '24h': 1, planifie: 2 };
      ts.sort((a, b) => (a.status === 'recue' ? 0 : 1) - (b.status === 'recue' ? 0 : 1) || rank[a.urgence] - rank[b.urgence] || b.updated_at - a.updated_at);
      return { tickets: ts.map(withNames) };
    }
    if (p === 'tickets' && method === 'POST') {
      const r = residences.find((x) => x.id === b.residence_id);
      if (!r) fail(400, 'Résidence inconnue');
      if (!b.urgence) fail(400, 'Urgence obligatoire');
      const t = seed({ residence_id: r.id, org_id: r.org_id, urgence: b.urgence, categorie: b.categorie, lieu: b.lieu, description: b.description, contact_name: b.contact_name, contact_phone: b.contact_phone, acces: b.acces, dispo: b.dispo, status: 'recue', created_by: me.id, created_at: Date.now() });
      if (!isAdmin()) notify(b.urgence === 'urgent' ? '📲 En réel, l’équipe LuxInterventions reçoit maintenant une alerte URGENTE sur son téléphone.' : '📲 En réel, l’équipe LuxInterventions reçoit maintenant une notification.');
      return { id: t.id, ref: t.ref };
    }
    const tm = p.match(/^tickets\/([^/]+)(?:\/(status|comments|photos))?$/);
    if (tm) {
      const t = tickets.find((x) => x.id === tm[1]);
      if (!t || !visible(t)) fail(404, 'Demande introuvable');
      if (!tm[2]) {
        const r = residences.find((x) => x.id === t.residence_id);
        return { ticket: { ...t }, residence: { ...r, org_name: orgs.find((o) => o.id === r.org_id).name },
          events: events.filter((e) => e.ticket_id === t.id).sort((a, b) => a.created_at - b.created_at).map((e) => { const u = Object.values(users).find((x) => x.id === e.user_id) || {}; return { ...e, user_name: u.name, user_role: u.role }; }),
          photos: photos.filter((x) => x.ticket_id === t.id).map(({ blob, ...x }) => x) };
      }
      if (tm[2] === 'status') {
        if (!isAdmin() && !(b.status === 'annulee' && t.status === 'recue')) fail(403, 'Seul LuxInterventions peut changer le statut');
        const e = { id: id(), ticket_id: t.id, user_id: me.id, kind: 'status', status: b.status, text: b.text || (b.status === 'terminee' ? b.rapport : null) || null, created_at: Date.now() };
        events.push(e);
        Object.assign(t, { status: b.status, updated_at: Date.now(), planned_at: b.planned_at ?? t.planned_at, technicien: b.technicien ?? t.technicien, rapport: b.rapport ?? t.rapport,
          taken_at: t.taken_at || (b.status !== 'annulee' ? Date.now() : null), done_at: b.status === 'terminee' ? Date.now() : t.done_at });
        if (isAdmin()) notify('📲 En réel, la gérance reçoit maintenant une notification : « ' + ({ prise: 'Prise en charge', planifiee: 'Planifiée', encours: 'En cours', terminee: 'Terminée', annulee: 'Annulée' }[b.status] || '') + ' ».');
        return { ok: true, event_id: e.id };
      }
      if (tm[2] === 'comments') {
        const e = { id: id(), ticket_id: t.id, user_id: me.id, kind: 'comment', status: null, text: b.text || null, created_at: Date.now() };
        events.push(e);
        t.updated_at = Date.now();
        if (b.text) notify(isAdmin() ? '📲 En réel, la gérance est prévenue de votre message.' : '📲 En réel, LuxInterventions est prévenu de votre message.');
        return { ok: true, event_id: e.id };
      }
      if (tm[2] === 'photos') {
        const ph = { id: id(), ticket_id: t.id, event_id: (opts.headers || {})['X-Event-Id'] || null, blob: opts.body, created_at: Date.now() };
        photos.push(ph);
        return { id: ph.id };
      }
    }
    const pm = p.match(/^photos\/(.+)$/);
    if (pm) {
      const ph = photos.find((x) => x.id === pm[1]);
      if (!ph) fail(404, 'Photo introuvable');
      return new Response(ph.blob);
    }

    if (p === 'residences' && method === 'GET') {
      const rs = residences.filter((r) => r.active && (isAdmin() ? !scopeOrg || r.org_id === scopeOrg : r.org_id === me.org_id));
      return { residences: rs.map((r) => ({ ...r, org_name: orgs.find((o) => o.id === r.org_id).name, tickets: tickets.filter((t) => t.residence_id === r.id).length,
        open: tickets.filter((t) => t.residence_id === r.id && ['recue', 'prise', 'planifiee', 'encours'].includes(t.status)).length })) };
    }
    if (p === 'residences' && method === 'POST') {
      if (!b.name) fail(400, 'Nom de la résidence obligatoire');
      const r = { id: id(), org_id: isAdmin() ? b.org_id || 'demo-org' : me.org_id, name: b.name, address: b.address, access: b.access, keys_info: b.keys_info, contact_name: b.contact_name, contact_phone: b.contact_phone, notes: b.notes, apartments: parseInt(b.apartments, 10) || null, active: 1, created_at: Date.now() };
      residences.push(r);
      return { id: r.id };
    }
    const rm = p.match(/^residences\/(.+)$/);
    if (rm) {
      const r = residences.find((x) => x.id === rm[1]);
      if (b.active === false) r.active = 0;
      else Object.assign(r, { name: b.name, address: b.address, access: b.access, keys_info: b.keys_info, contact_name: b.contact_name, contact_phone: b.contact_phone, notes: b.notes, apartments: parseInt(b.apartments, 10) || null });
      return { ok: true };
    }

    if (p === 'orgs' && method === 'GET') {
      const list = isAdmin() ? orgs : orgs.filter((o) => o.id === me.org_id);
      return { orgs: list.map((o) => ({ ...o, residences: residences.filter((r) => r.active && r.org_id === o.id).length, users: Object.values(users).filter((u) => u.org_id === o.id && u.active).length,
        open: tickets.filter((t) => t.org_id === o.id && ['recue', 'prise', 'planifiee', 'encours'].includes(t.status)).length })) };
    }
    if (p === 'orgs' && method === 'POST') { const o = { id: id(), name: b.name, phone: b.phone, email: b.email, created_at: Date.now() }; orgs.push(o); return { id: o.id }; }
    const om = p.match(/^orgs\/(.+)$/);
    if (om) { Object.assign(orgs.find((o) => o.id === om[1]), { name: b.name, phone: b.phone, email: b.email }); return { ok: true }; }

    if (p === 'users' && method === 'GET') {
      const list = Object.values(users).filter((u) => (isAdmin() ? true : u.org_id === me.org_id));
      return { users: list.map((u) => ({ ...u })) };
    }
    if (p === 'users' && method === 'POST') {
      const u = { id: id(), org_id: b.role === 'admin' ? null : isAdmin() ? b.org_id : me.org_id, role: b.role, name: b.name, email: b.email, phone: b.phone, active: 1, has_password: 0, last_login: null };
      users[u.id] = u;
      return { id: u.id, invite: 'd'.repeat(64) };
    }
    const um = p.match(/^users\/([^/]+)(\/invite)?$/);
    if (um) {
      if (um[2]) return { invite: 'd'.repeat(64) };
      const u = Object.values(users).find((x) => x.id === um[1]);
      if (b.active != null) u.active = b.active ? 1 : 0;
      return { ok: true };
    }
    fail(404, 'Non disponible en démo');
  }

  return {
    api,
    get me() { return me; },
    switchTo(role) { me = role === 'admin' ? users.lux : users.sophie; },
    takeNotices() { return notices.splice(0); },
  };
}
