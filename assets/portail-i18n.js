// Section « Portail Syndic / Gérance » de la page d'accueil en 6 langues (FR · DE · EN · IT · PT · ES).
// Le reste du site reste en français. Choix mémorisé ; sinon la langue du navigateur.
(function () {
  const LANGS = ['fr', 'de', 'en', 'pt', 'es', 'it'];
  // français → [allemand, anglais, portugais, espagnol, italien]
  const T = {
    'Espace Digital': ['Digitaler Bereich', 'Digital area', 'Área digital', 'Área digital', 'Spazio digitale'],
    'Portail': ['Portal', 'Portal', 'Portal', 'Portal', 'Portale'],
    'Syndic / Gérance': ['Hausverwaltung / Verwaltung', 'Building & property managers', 'Condomínio / Administração', 'Administrador de fincas / Gestión', 'Amministrazioni di condominio'],
    "Accédez à votre tableau de bord, suivez vos interventions en temps réel et téléchargez vos rapports — 24h/24, depuis n'importe quel appareil.": ['Greifen Sie auf Ihr Dashboard zu, verfolgen Sie Ihre Einsätze in Echtzeit und laden Sie Ihre Berichte herunter — rund um die Uhr, von jedem Gerät.', 'Access your dashboard, follow your call-outs in real time and download your reports — 24/7, from any device.', 'Aceda ao seu painel, acompanhe as intervenções em tempo real e descarregue os seus relatórios — 24h/24, a partir de qualquer dispositivo.', 'Accede a tu panel, sigue tus intervenciones en tiempo real y descarga tus informes — 24 h, desde cualquier dispositivo.', 'Accedete alla vostra dashboard, seguite gli interventi in tempo reale e scaricate i rapporti — 24 ore su 24, da qualsiasi dispositivo.'],
    '🏢 Syndic / Gérance': ['🏢 Hausverwaltung', '🏢 Property managers', '🏢 Condomínio / Administração', '🏢 Administración', '🏢 Amministrazioni'],
    '🎁 Bonus Partenaires': ['🎁 Partner-Bonus', '🎁 Partner bonus', '🎁 Bónus parceiros', '🎁 Bonus socios', '🎁 Bonus partner'],
    "Votre portail d'interventions": ['Ihr Einsatzportal', 'Your call-out portal', 'O seu portal de intervenções', 'Tu portal de intervenciones', 'Il vostro portale interventi'],
    'Réservé aux syndics et gérances partenaires': ['Nur für Partner-Hausverwaltungen', 'For partner building and property managers only', 'Reservado às administrações parceiras', 'Reservado a administradores y gestorías asociados', 'Riservato agli amministratori partner'],
    'Immeubles suivis': ['Betreute Gebäude', 'Buildings covered', 'Prédios acompanhados', 'Edificios atendidos', 'Palazzi seguiti'],
    'Appartements sous gestion technique': ['Wohnungen in technischer Betreuung', 'Flats under technical management', 'Apartamentos em gestão técnica', 'Pisos en gestión técnica', 'Appartamenti in gestione tecnica'],
    'Gérances partenaires': ['Partnerverwaltungen', 'Partner property managers', 'Administrações parceiras', 'Gestorías asociadas', 'Amministrazioni partner'],
    'Disponibilité': ['Verfügbarkeit', 'Availability', 'Disponibilidade', 'Disponibilidad', 'Disponibilità'],
    '7j/7 · 24h/24': ['7/7 · 24 Std.', '24/7', '7/7 · 24h', '7/7 · 24 h', '7 su 7 · 24 ore'],
    'Ce que vous pouvez faire': ['Was Sie tun können', 'What you can do', 'O que pode fazer', 'Lo que puedes hacer', 'Cosa potete fare'],
    "Depuis le téléphone ou l'ordinateur": ['Vom Handy oder Computer', 'From your phone or computer', 'No telemóvel ou no computador', 'Desde el móvil o el ordenador', 'Dal telefono o dal computer'],
    "Demande d'intervention en 30 secondes": ['Einsatzanfrage in 30 Sekunden', 'Call-out request in 30 seconds', 'Pedido de intervenção em 30 segundos', 'Solicitud de intervención en 30 segundos', 'Richiesta di intervento in 30 secondi'],
    'Urgence · photos': ['Dringlichkeit · Fotos', 'Urgency · photos', 'Urgência · fotos', 'Urgencia · fotos', 'Urgenza · foto'],
    'Alerte immédiate à notre équipe': ['Sofortiger Alarm an unser Team', 'Instant alert to our team', 'Alerta imediato à nossa equipa', 'Alerta inmediata a nuestro equipo', 'Avviso immediato alla nostra squadra'],
    '🔴 Urgent': ['🔴 Dringend', '🔴 Urgent', '🔴 Urgente', '🔴 Urgente', '🔴 Urgente'],
    'Suivi en temps réel': ['Verfolgung in Echtzeit', 'Real-time tracking', 'Acompanhamento em tempo real', 'Seguimiento en tiempo real', 'Andamento in tempo reale'],
    'Reçue → Terminée': ['Eingegangen → Erledigt', 'Received → Done', 'Recebido → Concluído', 'Recibida → Terminada', 'Ricevuta → Terminata'],
    'Messages et photos dans chaque demande': ['Nachrichten und Fotos in jeder Anfrage', 'Messages and photos in every request', 'Mensagens e fotos em cada pedido', 'Mensajes y fotos en cada solicitud', 'Messaggi e foto in ogni richiesta'],
    'Rapport mensuel par résidence': ['Monatsbericht pro Wohnanlage', 'Monthly report per residence', 'Relatório mensal por condomínio', 'Informe mensual por comunidad', 'Rapporto mensile per condominio'],
    'Accès personnel pour chaque collaborateur': ['Persönlicher Zugang für jeden Mitarbeiter', 'Personal access for each colleague', 'Acesso pessoal para cada colaborador', 'Acceso personal para cada colaborador', 'Accesso personale per ogni collaboratore'],
    'Portail Syndic / Gérance': ['Portal für Hausverwaltungen', 'Property manager portal', 'Portal Condomínio / Administração', 'Portal de administración', 'Portale amministrazioni'],
    'Accès sur invitation — installable sur téléphone comme une application': ['Zugang auf Einladung — wie eine App auf dem Handy installierbar', 'Access by invitation — installs on your phone like an app', 'Acesso por convite — instala-se no telemóvel como uma app', 'Acceso por invitación — se instala en el móvil como una app', 'Accesso su invito — si installa sul telefono come un’app'],
    'Accéder au portail →': ['Zum Portal →', 'Go to the portal →', 'Aceder ao portal →', 'Acceder al portal →', 'Vai al portale →'],
    'Voir la démo': ['Demo ansehen', 'See the demo', 'Ver a demo', 'Ver la demo', 'Guarda la demo'],
    '📄 Guide (PDF)': ['📄 Anleitung (PDF)', '📄 Guide (PDF)', '📄 Guia (PDF)', '📄 Guía (PDF)', '📄 Guida (PDF)'],
    'Demander un accès': ['Zugang anfragen', 'Request access', 'Pedir acesso', 'Pedir acceso', 'Chiedi un accesso'],
    'NOBIS s.a.r.l. · Gestion locative': ['NOBIS s.a.r.l. · Mietverwaltung', 'NOBIS s.a.r.l. · Rental management', 'NOBIS s.a.r.l. · Gestão de arrendamento', 'NOBIS s.a.r.l. · Gestión de alquileres', 'NOBIS s.a.r.l. · Gestione affitti'],
    'Espace réservé — gestion de notre propre parc locatif': ['Geschützter Bereich — Verwaltung unseres eigenen Mietbestands', 'Private area — management of our own rental portfolio', 'Área reservada — gestão do nosso próprio parque de arrendamento', 'Área reservada — gestión de nuestro propio parque de alquiler', 'Area riservata — gestione del nostro patrimonio in affitto'],
    '🔑 Accès réservé locataires': ['🔑 Bereich für Mieter', '🔑 Tenants’ area', '🔑 Área dos inquilinos', '🔑 Área de inquilinos', '🔑 Area riservata inquilini'],
    '🔒 Accès réservé NOBIS s.a.r.l.': ['🔒 Zugang nur für NOBIS s.a.r.l.', '🔒 NOBIS s.a.r.l. access only', '🔒 Acesso reservado NOBIS s.a.r.l.', '🔒 Acceso reservado NOBIS s.a.r.l.', '🔒 Accesso riservato NOBIS s.a.r.l.'],
    'Votre app : loyers, quittances, documents, collectes, signaler un problème': ['Ihre App: Mieten, Quittungen, Dokumente, Müllabfuhr, Problem melden', 'Your app: rent, receipts, documents, waste collection, report a problem', 'A sua app: rendas, recibos, documentos, recolhas, comunicar um problema', 'Tu app: alquileres, recibos, documentos, recogidas, avisar de un problema', 'La vostra app: affitti, ricevute, documenti, raccolta rifiuti, segnalare un problema'],
    'Accès avec le code personnel fourni par votre gestionnaire.': ['Zugang mit dem persönlichen Code Ihres Verwalters.', 'Access with the personal code given by your manager.', 'Acesso com o código pessoal dado pelo seu gestor.', 'Acceso con el código personal que te da tu gestor.', 'Accesso con il codice personale dato dal vostro gestore.'],
    "📱 Télécharger l'app des locataires NOBIS s.a.r.l.": ['📱 Mieter-App NOBIS s.a.r.l. herunterladen', '📱 Download the NOBIS s.a.r.l. tenants app', '📱 Descarregar a app dos inquilinos NOBIS s.a.r.l.', '📱 Descargar la app de inquilinos NOBIS s.a.r.l.', '📱 Scarica l’app degli inquilini NOBIS s.a.r.l.'],
    "Don · prêt · location d'outils et d'objets entre particuliers": ['Verschenken · Verleihen · Vermieten von Werkzeug und Gegenständen unter Privatpersonen', 'Give · lend · rent tools and items between individuals', 'Doação · empréstimo · aluguer de ferramentas e objetos entre particulares', 'Donación · préstamo · alquiler de herramientas y objetos entre particulares', 'Dono · prestito · noleggio di attrezzi e oggetti tra privati'],
    'Annonces des locataires NOBIS s.a.r.l. avec photos et prix · contact par email · paiement entre vous.': ['Anzeigen der Mieter von NOBIS s.a.r.l. mit Fotos und Preisen · Kontakt per E-Mail · Zahlung untereinander.', 'Listings from NOBIS s.a.r.l. tenants with photos and prices · contact by email · payment between you.', 'Anúncios dos inquilinos NOBIS s.a.r.l. com fotos e preços · contacto por email · pagamento entre vocês.', 'Anuncios de los inquilinos de NOBIS s.a.r.l. con fotos y precios · contacto por email · pago entre vosotros.', 'Annunci degli inquilini NOBIS s.a.r.l. con foto e prezzi · contatto via email · pagamento tra voi.'],
    '🧰 Voir les annonces': ['🧰 Anzeigen ansehen', '🧰 See the listings', '🧰 Ver os anúncios', '🧰 Ver los anuncios', '🧰 Vedi gli annunci'],
    '📄 Comment ça marche (PDF)': ['📄 So funktioniert es (PDF, FR)', '📄 How it works (PDF, FR)', '📄 Como funciona (PDF, FR)', '📄 Cómo funciona (PDF, FR)', '📄 Come funziona (PDF, FR)'],
    'Paliers partenaires': ['Partnerstufen', 'Partner tiers', 'Níveis de parceiro', 'Niveles de socio', 'Livelli partner'],
    "Selon le chiffre d'affaires annuel confié à LuxInterventions": ['Je nach Jahresumsatz, der LuxInterventions anvertraut wird', 'Based on the annual turnover entrusted to LuxInterventions', 'Consoante o volume de negócios anual confiado à LuxInterventions', 'Según la facturación anual confiada a LuxInterventions', 'In base al fatturato annuo affidato a LuxInterventions'],
    'Avantages de bienvenue': ['Willkommensvorteile', 'Welcome benefits', 'Vantagens de boas-vindas', 'Ventajas de bienvenida', 'Vantaggi di benvenuto'],
    'Remise sur les interventions': ['Rabatt auf Einsätze', 'Discount on call-outs', 'Desconto nas intervenções', 'Descuento en las intervenciones', 'Sconto sugli interventi'],
    'Remise renforcée + cadeaux': ['Höherer Rabatt + Geschenke', 'Bigger discount + gifts', 'Desconto reforçado + ofertas', 'Descuento mayor + regalos', 'Sconto maggiore + regali'],
    '🏅 Partenaire Premium': ['🏅 Premium-Partner', '🏅 Premium partner', '🏅 Parceiro Premium', '🏅 Socio Premium', '🏅 Partner Premium'],
    'Conditions sur mesure': ['Maßgeschneiderte Konditionen', 'Tailor-made terms', 'Condições à medida', 'Condiciones a medida', 'Condizioni su misura'],
    "Plus le chiffre d'affaires confié par votre syndic / gérance est élevé, plus les remises et cadeaux proposés par LuxInterventions sont importants. Seuils et avantages communiqués à chaque partenaire.": ['Je höher der Umsatz, den Ihre Hausverwaltung anvertraut, desto größer die Rabatte und Geschenke von LuxInterventions. Schwellen und Vorteile werden jedem Partner mitgeteilt.', 'The more turnover your building or property manager entrusts to us, the bigger the discounts and gifts from LuxInterventions. Thresholds and benefits are shared with each partner.', 'Quanto maior o volume de negócios confiado pela sua administração, maiores os descontos e ofertas da LuxInterventions. Limiares e vantagens comunicados a cada parceiro.', 'Cuanto mayor sea la facturación que nos confía tu administración, mayores serán los descuentos y regalos de LuxInterventions. Umbrales y ventajas comunicados a cada socio.', 'Più alto è il fatturato affidato dalla vostra amministrazione, più grandi sono gli sconti e i regali di LuxInterventions. Soglie e vantaggi comunicati a ogni partner.'],
    'Connaître mes conditions →': ['Meine Konditionen erfahren →', 'Find out my terms →', 'Conhecer as minhas condições →', 'Conocer mis condiciones →', 'Scopri le mie condizioni →'],
    'Tableau de bord bonus': ['Bonus-Dashboard', 'Bonus dashboard', 'Painel de bónus', 'Panel de bonus', 'Dashboard bonus'],
    'Bientôt dans votre portail': ['Bald in Ihrem Portal', 'Coming soon to your portal', 'Em breve no seu portal', 'Pronto en tu portal', 'Presto nel vostro portale'],
    "Chiffre d'affaires de l'année": ['Jahresumsatz', 'Turnover for the year', 'Volume de negócios do ano', 'Facturación del año', 'Fatturato dell’anno'],
    'Palier actuel': ['Aktuelle Stufe', 'Current tier', 'Nível atual', 'Nivel actual', 'Livello attuale'],
    'Prochain palier': ['Nächste Stufe', 'Next tier', 'Próximo nível', 'Siguiente nivel', 'Prossimo livello'],
    'Montant restant affiché': ['Restbetrag angezeigt', 'Remaining amount shown', 'Montante em falta indicado', 'Importe restante mostrado', 'Importo mancante indicato'],
    'Remises & cadeaux obtenus': ['Erhaltene Rabatte & Geschenke', 'Discounts & gifts received', 'Descontos e ofertas obtidos', 'Descuentos y regalos obtenidos', 'Sconti e regali ottenuti'],
    '🎁 Historique complet': ['🎁 Vollständiger Verlauf', '🎁 Full history', '🎁 Histórico completo', '🎁 Historial completo', '🎁 Storico completo'],
    'Vous recommandez une gérance': ['Sie empfehlen eine Verwaltung', 'You recommend a property manager', 'Recomenda uma administração', 'Recomiendas una gestoría', 'Raccomandate un’amministrazione'],
    'Bonus parrainage': ['Empfehlungsbonus', 'Referral bonus', 'Bónus de recomendação', 'Bonus por recomendación', 'Bonus presentazione'],
  };
  // guide PDF du portail dans chaque langue
  const GUIDES = { fr: 'portail-guide-fr.pdf', de: 'portail-anleitung-de.pdf', en: 'portail-guide-en.pdf', pt: 'portail-guia-pt.pdf', es: 'portail-guia-es.pdf', it: 'portail-guida-it.pdf' };
  const sec = document.getElementById('portail');
  if (!sec) return;
  const orig = new WeakMap(); // nœud texte → texte français
  function apply(lang) {
    const i = LANGS.indexOf(lang) - 1;
    const w = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.parentElement && n.parentElement.closest('.ptl-langs')) continue;
      if (!orig.has(n)) orig.set(n, n.nodeValue);
      const fr = orig.get(n), core = fr.replace(/\s+/g, ' ').trim();
      const tr = i >= 0 && T[core] ? T[core][i] : null;
      n.nodeValue = tr ? fr.replace(fr.trim(), tr) : fr;
    }
    sec.setAttribute('lang', lang);
    const g = sec.querySelector('.ptl-guide');
    if (g) g.href = '/guides/' + GUIDES[lang];
    sec.querySelectorAll('.ptl-langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }
  let lang = 'fr';
  try { const s = localStorage.getItem('siteLang'); if (LANGS.includes(s)) lang = s; else { const n = (navigator.language || '').slice(0, 2).toLowerCase(); if (LANGS.includes(n)) lang = n; } } catch { /* stockage indisponible */ }
  sec.querySelectorAll('.ptl-langs button').forEach((b) => b.addEventListener('click', () => {
    try { localStorage.setItem('siteLang', b.dataset.lang); } catch { /* stockage indisponible */ }
    apply(b.dataset.lang);
  }));
  if (lang !== 'fr') apply(lang); else sec.querySelectorAll('.ptl-langs button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === 'fr')));
})();
