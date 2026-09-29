// Page publique « Don · prêt · location » : annonces des locataires ARES S.A. (approuvées par le gestionnaire).
// Aucune adresse email n'est écrite dans la page : elle est demandée au serveur seulement après un vrai clic
// sur « Je suis intéressé » (essais limités), puis la messagerie s'ouvre avec un message tout prêt.
(function () {
  const API = document.querySelector('meta[name="tools-api"]').content.replace(/\/$/, '');
  const L = {
    fr: {
      loc: 'fr-LU', h1: 'Don · prêt · location d’objets', intro: 'Outils, électroménager, meubles… proposés par les locataires ARES S.A. : donnés, prêtés ou loués entre particuliers. Contact par email, paiement directement entre vous.',
      all: 'Tout', kinds: { don: '🎁 Don', pret: '🤝 Prêt gratuit', loc: '💶 Location' }, free: 'Gratuit', units: { h: '/ heure', j: '/ jour', we: '/ week-end', s: '/ semaine', u: '' },
      lieu: 'Remise :', cond: 'Conditions :', since: 'Publiée le', btn: '✉️ Je suis intéressé', write: 'Écrivez à', empty: 'Aucune annonce pour le moment. Revenez bientôt !', busy: 'Trop de demandes, réessayez plus tard.',
      postT: 'Publier une annonce', post: 'Réservé aux locataires ARES S.A. : publiez vos objets depuis votre app (rubrique « 🧰 Don · prêt · location »). Chaque annonce est vérifiée avant sa mise en ligne.', app: '📱 Ouvrir l’app des locataires',
      subj: (t) => `Je suis intéressé : ${t}`, body: (n, t) => `Bonjour ${n},\n\nJe suis intéressé(e) par votre annonce « ${t} » vue sur luxinterventions.com.\n\nMon numéro de téléphone : \n\nMerci !`,
      rulesT: 'Règles d’utilisation',
      rules: ['LuxInterventions / ARES S.A. met seulement les annonces en ligne : nous ne sommes ni vendeur, ni loueur, ni garant des objets proposés par les locataires (pour nos propres objets, nous agissons comme n’importe quel particulier).',
        'Les annonces sont publiées par les locataires ARES S.A. et vérifiées avant publication ; tout contenu illicite ou inapproprié est retiré.',
        'Le contact se fait par email ; ensuite, échangez comme vous le souhaitez. Ne partagez que les informations nécessaires.',
        'Le paiement se fait directement entre vous, en espèces à la remise. Aucun paiement ne passe par ce site.',
        'Vérifiez l’objet ensemble à la remise et au retour (photos conseillées). Caution, durée et état au retour : à convenir entre vous.',
        'Interdits : armes, produits dangereux ou inflammables, bouteilles de gaz, médicaments, objets volés ou contrefaits, animaux.',
        'Utilisez les objets prêtés ou loués avec soin et selon leur notice ; en cas de dommage, arrangez-vous entre vous.'],
    },
    it: {
      loc: 'it-IT', h1: 'Regalo · prestito · noleggio di oggetti', intro: 'Attrezzi, elettrodomestici, mobili… proposti dagli inquilini ARES S.A.: regalati, prestati o noleggiati tra privati. Contatto per email, pagamento direttamente tra voi.',
      all: 'Tutto', kinds: { don: '🎁 Regalo', pret: '🤝 Prestito gratuito', loc: '💶 Noleggio' }, free: 'Gratis', units: { h: '/ ora', j: '/ giorno', we: '/ weekend', s: '/ settimana', u: '' },
      lieu: 'Consegna:', cond: 'Condizioni:', since: 'Pubblicato il', btn: '✉️ Sono interessato', write: 'Scrivi a', empty: 'Ancora nessun annuncio. Torna presto!', busy: 'Troppe richieste, riprova più tardi.',
      postT: 'Pubblicare un annuncio', post: 'Riservato agli inquilini ARES S.A.: pubblica i tuoi oggetti dalla tua app (rubrica « 🧰 Regalo · prestito · noleggio »). Ogni annuncio è verificato prima di andare online.', app: '📱 Apri l’app degli inquilini',
      subj: (t) => `Sono interessato: ${t}`, body: (n, t) => `Buongiorno ${n},\n\nsono interessato/a al suo annuncio « ${t} » visto su luxinterventions.com.\n\nIl mio numero di telefono: \n\nGrazie!`,
      rulesT: 'Regole d’uso',
      rules: ['LuxInterventions / ARES S.A. mette solo gli annunci online: non siamo né venditori, né noleggiatori, né garanti degli oggetti proposti dagli inquilini (per i nostri oggetti agiamo come un qualsiasi privato).',
        'Gli annunci sono pubblicati dagli inquilini ARES S.A. e verificati prima della pubblicazione; ogni contenuto illecito o inadatto viene tolto.',
        'Il contatto avviene per email; poi scambiatevi i dati che volete. Condividete solo le informazioni necessarie.',
        'Il pagamento avviene direttamente tra voi, in contanti alla consegna. Nessun pagamento passa da questo sito.',
        'Controllate l’oggetto insieme alla consegna e alla restituzione (foto consigliate). Cauzione, durata e stato alla restituzione: da concordare tra voi.',
        'Vietati: armi, prodotti pericolosi o infiammabili, bombole di gas, medicinali, oggetti rubati o contraffatti, animali.',
        'Usate gli oggetti prestati o noleggiati con cura e secondo le istruzioni; in caso di danni, accordatevi tra voi.'],
    },
    de: {
      loc: 'de-LU', h1: 'Verschenken · verleihen · vermieten', intro: 'Werkzeug, Haushaltsgeräte, Möbel… angeboten von Mietern der ARES S.A.: verschenkt, verliehen oder vermietet von privat an privat. Kontakt per E-Mail, Bezahlung direkt untereinander.',
      all: 'Alle', kinds: { don: '🎁 Geschenkt', pret: '🤝 Kostenlos leihen', loc: '💶 Vermietung' }, free: 'Kostenlos', units: { h: '/ Stunde', j: '/ Tag', we: '/ Wochenende', s: '/ Woche', u: '' },
      lieu: 'Übergabe:', cond: 'Bedingungen:', since: 'Veröffentlicht am', btn: '✉️ Ich bin interessiert', write: 'Schreiben Sie an', empty: 'Noch keine Anzeigen. Schauen Sie bald wieder vorbei!', busy: 'Zu viele Anfragen, bitte später erneut versuchen.',
      postT: 'Anzeige aufgeben', post: 'Nur für Mieter der ARES S.A.: Bieten Sie Ihre Sachen in Ihrer App an (Rubrik „🧰 Verschenken · verleihen · vermieten“). Jede Anzeige wird vor der Veröffentlichung geprüft.', app: '📱 Mieter-App öffnen',
      subj: (t) => `Ich bin interessiert: ${t}`, body: (n, t) => `Hallo ${n},\n\nich interessiere mich für Ihre Anzeige „${t}“ auf luxinterventions.com.\n\nMeine Telefonnummer: \n\nDanke!`,
      rulesT: 'Nutzungsregeln',
      rules: ['LuxInterventions / ARES S.A. stellt die Anzeigen nur online: Wir sind weder Verkäufer noch Vermieter noch Garant der von Mietern angebotenen Gegenstände (bei eigenen Gegenständen handeln wir wie jede Privatperson).',
        'Die Anzeigen werden von Mietern der ARES S.A. aufgegeben und vor der Veröffentlichung geprüft; rechtswidrige oder unpassende Inhalte werden entfernt.',
        'Der Kontakt erfolgt per E-Mail; danach tauschen Sie aus, was Sie möchten. Teilen Sie nur die nötigen Informationen.',
        'Bezahlt wird direkt untereinander, bar bei der Übergabe. Über diese Seite laufen keine Zahlungen.',
        'Prüfen Sie den Gegenstand gemeinsam bei Übergabe und Rückgabe (Fotos empfohlen). Kaution, Dauer und Rückgabezustand vereinbaren Sie untereinander.',
        'Verboten: Waffen, gefährliche oder brennbare Stoffe, Gasflaschen, Medikamente, gestohlene oder gefälschte Gegenstände, Tiere.',
        'Behandeln Sie geliehene oder gemietete Gegenstände sorgfältig und nach Anleitung; bei Schäden einigen Sie sich untereinander.'],
    },
    pt: {
      loc: 'pt-PT', h1: 'Doar · emprestar · alugar objetos', intro: 'Ferramentas, eletrodomésticos, móveis… propostos pelos inquilinos da ARES S.A.: doados, emprestados ou alugados entre particulares. Contacto por email, pagamento diretamente entre vocês.',
      all: 'Tudo', kinds: { don: '🎁 Doação', pret: '🤝 Empréstimo grátis', loc: '💶 Aluguer' }, free: 'Grátis', units: { h: '/ hora', j: '/ dia', we: '/ fim de semana', s: '/ semana', u: '' },
      lieu: 'Entrega:', cond: 'Condições:', since: 'Publicado em', btn: '✉️ Estou interessado', write: 'Escreva para', empty: 'Ainda não há anúncios. Volte em breve!', busy: 'Demasiados pedidos, tente mais tarde.',
      postT: 'Publicar um anúncio', post: 'Reservado aos inquilinos da ARES S.A.: publique os seus objetos na sua app (rubrica « 🧰 Doar · emprestar · alugar »). Cada anúncio é verificado antes de ficar online.', app: '📱 Abrir a app dos inquilinos',
      subj: (t) => `Estou interessado: ${t}`, body: (n, t) => `Olá ${n},\n\nestou interessado/a no seu anúncio « ${t} » visto em luxinterventions.com.\n\nO meu número de telefone: \n\nObrigado!`,
      rulesT: 'Regras de utilização',
      rules: ['A LuxInterventions / ARES S.A. apenas coloca os anúncios online: não somos vendedor, nem locador, nem garante dos objetos propostos pelos inquilinos (nos nossos próprios objetos agimos como qualquer particular).',
        'Os anúncios são publicados pelos inquilinos da ARES S.A. e verificados antes da publicação; qualquer conteúdo ilícito ou inadequado é retirado.',
        'O contacto faz-se por email; depois, troquem os dados que quiserem. Partilhe apenas as informações necessárias.',
        'O pagamento faz-se diretamente entre vocês, em numerário na entrega. Nenhum pagamento passa por este site.',
        'Verifiquem o objeto juntos na entrega e na devolução (fotos aconselhadas). Caução, duração e estado na devolução: a combinar entre vocês.',
        'Proibidos: armas, produtos perigosos ou inflamáveis, botijas de gás, medicamentos, objetos roubados ou contrafeitos, animais.',
        'Use os objetos emprestados ou alugados com cuidado e segundo as instruções; em caso de dano, entendam-se entre vocês.'],
    },
    en: {
      loc: 'en-GB', h1: 'Give · lend · rent items', intro: 'Tools, appliances, furniture… offered by ARES S.A. tenants: given away, lent or rented between private people. Contact by email, payment directly between you.',
      all: 'All', kinds: { don: '🎁 Free', pret: '🤝 Free loan', loc: '💶 Rental' }, free: 'Free', units: { h: '/ hour', j: '/ day', we: '/ weekend', s: '/ week', u: '' },
      lieu: 'Handover:', cond: 'Conditions:', since: 'Posted on', btn: '✉️ I’m interested', write: 'Write to', empty: 'No listings yet. Come back soon!', busy: 'Too many requests, please try again later.',
      postT: 'Post a listing', post: 'For ARES S.A. tenants only: post your items from your app (section “🧰 Give · lend · rent”). Every listing is checked before going online.', app: '📱 Open the tenant app',
      subj: (t) => `I’m interested: ${t}`, body: (n, t) => `Hello ${n},\n\nI’m interested in your listing “${t}” on luxinterventions.com.\n\nMy phone number: \n\nThanks!`,
      rulesT: 'Terms of use',
      rules: ['LuxInterventions / ARES S.A. only puts the listings online: we are not the seller, lender or guarantor of items offered by tenants (for our own items, we act like any private person).',
        'Listings are posted by ARES S.A. tenants and checked before publication; any illegal or inappropriate content is removed.',
        'Contact is by email; after that, exchange whatever details you wish. Only share what is necessary.',
        'Payment is made directly between you, in cash on handover. No payment goes through this site.',
        'Check the item together on handover and return (photos recommended). Deposit, duration and return condition: agree between you.',
        'Forbidden: weapons, dangerous or flammable products, gas bottles, medicines, stolen or counterfeit goods, animals.',
        'Use lent or rented items with care and according to their instructions; in case of damage, settle it between you.'],
    },
    es: {
      loc: 'es-ES', h1: 'Regalar · prestar · alquilar objetos', intro: 'Herramientas, electrodomésticos, muebles… propuestos por los inquilinos de ARES S.A.: regalados, prestados o alquilados entre particulares. Contacto por email, pago directamente entre vosotros.',
      all: 'Todo', kinds: { don: '🎁 Regalo', pret: '🤝 Préstamo gratis', loc: '💶 Alquiler' }, free: 'Gratis', units: { h: '/ hora', j: '/ día', we: '/ fin de semana', s: '/ semana', u: '' },
      lieu: 'Entrega:', cond: 'Condiciones:', since: 'Publicado el', btn: '✉️ Me interesa', write: 'Escribe a', empty: 'Todavía no hay anuncios. ¡Vuelve pronto!', busy: 'Demasiadas solicitudes, inténtalo más tarde.',
      postT: 'Publicar un anuncio', post: 'Reservado a los inquilinos de ARES S.A.: publica tus objetos desde tu app (sección « 🧰 Regalar · prestar · alquilar »). Cada anuncio se revisa antes de publicarse.', app: '📱 Abrir la app de inquilinos',
      subj: (t) => `Me interesa: ${t}`, body: (n, t) => `Hola ${n},\n\nme interesa tu anuncio « ${t} » visto en luxinterventions.com.\n\nMi número de teléfono: \n\n¡Gracias!`,
      rulesT: 'Normas de uso',
      rules: ['LuxInterventions / ARES S.A. solo publica los anuncios: no somos vendedor, arrendador ni garante de los objetos propuestos por los inquilinos (con nuestros propios objetos actuamos como cualquier particular).',
        'Los anuncios los publican los inquilinos de ARES S.A. y se revisan antes de publicarse; se retira cualquier contenido ilícito o inapropiado.',
        'El contacto se hace por email; después, intercambiad los datos que queráis. Comparte solo la información necesaria.',
        'El pago se hace directamente entre vosotros, en efectivo en la entrega. Ningún pago pasa por esta web.',
        'Revisad el objeto juntos en la entrega y en la devolución (se aconsejan fotos). Fianza, duración y estado en la devolución: a acordar entre vosotros.',
        'Prohibido: armas, productos peligrosos o inflamables, bombonas de gas, medicamentos, objetos robados o falsificados, animales.',
        'Usa los objetos prestados o alquilados con cuidado y según sus instrucciones; en caso de daño, arreglaos entre vosotros.'],
    },
  };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let lang = (() => { try { const s = localStorage.getItem('toolsLang'); if (L[s]) return s; } catch {} const n = (navigator.language || 'fr').slice(0, 2); return L[n] ? n : 'fr'; })();
  let items = null, filter = '';
  const T = () => L[lang];
  const money = (n) => new Intl.NumberFormat(T().loc, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n || 0);
  const price = (it) => (it.kind === 'loc' ? `${money(it.price)} ${T().units[it.unit] || ''}`.trim() : T().free);
  const day = (ms) => new Date(ms).toLocaleDateString(T().loc, { day: 'numeric', month: 'long', year: 'numeric' });

  function render() {
    const t = T();
    document.documentElement.lang = lang;
    document.getElementById('langs').innerHTML = Object.keys(L).map((k) => `<button data-lang="${k}" aria-pressed="${k === lang}">${k.toUpperCase()}</button>`).join('');
    document.getElementById('h1').textContent = t.h1;
    document.getElementById('intro').textContent = t.intro;
    document.getElementById('filters').innerHTML = [['', t.all], ...Object.entries(t.kinds)].map(([k, v]) => `<button data-filter="${k}" aria-pressed="${filter === k}">${esc(v)}</button>`).join('');
    const list = (items || []).filter((it) => !filter || it.kind === filter);
    document.getElementById('list').innerHTML = items == null ? '<p class="empty">…</p>' : !list.length ? `<p class="empty">${esc(t.empty)}</p>`
      : `<div class="grid">${list.map((it) => `<article class="item" data-id="${esc(it.id)}">
          <img class="ph" src="${API}/api/tools/${esc(it.id)}/p0.jpg" alt="${esc(it.title)}" loading="lazy">
          ${it.photos > 1 ? `<div class="thumbs">${Array.from({ length: it.photos }, (_, i) => `<img src="${API}/api/tools/${esc(it.id)}/p${i}.jpg" alt="" data-photo="${i}" aria-current="${i === 0}" loading="lazy">`).join('')}</div>` : ''}
          <div class="body"><span class="badge ${esc(it.kind)}">${esc(t.kinds[it.kind] || it.kind)}</span>
            <h2>${esc(it.title)}</h2><div class="price">${esc(price(it))}</div>
            ${it.desc ? `<div class="desc">${esc(it.desc)}</div>` : ''}
            ${it.rules ? `<div class="meta"><b>${esc(t.cond)}</b> ${esc(it.rules)}</div>` : ''}
            <div class="meta">${it.lieu ? `${esc(t.lieu)} ${esc(it.lieu)} · ` : ''}${esc(t.since)} ${esc(day(it.created))}</div>
            <div class="reveal" data-reveal></div>
            <button class="btn" data-contact="${esc(it.id)}">${esc(t.btn)}</button></div></article>`).join('')}</div>`;
    document.getElementById('post').innerHTML = `<h2>🧰 ${esc(t.postT)}</h2><p style="margin:0 0 12px">${esc(t.post)}</p><a class="btn sec" href="/espace.html">${esc(t.app)}</a>`;
    document.getElementById('regles').innerHTML = `<h2>📜 ${esc(t.rulesT)}</h2><ol>${t.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>`;
  }

  document.addEventListener('click', async (e) => {
    const lb = e.target.closest('[data-lang]');
    if (lb) { lang = lb.dataset.lang; try { localStorage.setItem('toolsLang', lang); } catch {} return render(); }
    const fb = e.target.closest('[data-filter]');
    if (fb) { filter = fb.dataset.filter; return render(); }
    const ph = e.target.closest('[data-photo]');
    if (ph) {
      const art = ph.closest('.item');
      art.querySelector('.ph').src = ph.src;
      art.querySelectorAll('[data-photo]').forEach((x) => x.setAttribute('aria-current', x === ph));
      return;
    }
    const cb = e.target.closest('[data-contact]');
    if (cb) {
      if (!e.isTrusted) return; // seulement un vrai clic humain
      const it = (items || []).find((x) => x.id === cb.dataset.contact);
      if (!it) return;
      cb.disabled = true;
      try {
        const r = await fetch(`${API}/api/tools/${it.id}/contact`, { method: 'POST' });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(r.status === 429 ? T().busy : j.error || r.status);
        const t = T();
        const href = `mailto:${j.mail}?subject=${encodeURIComponent(t.subj(it.title))}&body=${encodeURIComponent(t.body(j.name || '', it.title))}`;
        const box = cb.parentElement.querySelector('[data-reveal]');
        box.innerHTML = `${esc(t.write)} <a href="${esc(href)}">${esc(j.mail)}</a>`;
        location.href = href;
      } catch (err) { alert('⚠ ' + (err.message || err)); }
      cb.disabled = false;
    }
  });

  render();
  fetch(`${API}/api/tools`, { cache: 'no-store' }).then((r) => r.json()).then((j) => { items = j.items || []; render(); }).catch(() => { items = []; render(); });
})();
