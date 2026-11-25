// 🌐 App LuxInterventions : FR (langue de base) · EN · DE.
// L'app est écrite en français ; ce module traduit l'écran (textes, placeholders, aria-label) selon la langue choisie.
// Les messages envoyés à LuxInterventions (e-mail, WhatsApp, SMS) restent en FRANÇAIS (voir app.js).
// Clé = texte français exact (sans espaces au début/à la fin) → [anglais, allemand].
export const T = {
  // ── en-tête, barre du bas ──
  'Interventions techniques 7j/7 · 24h/24': ['Technical services 7/7 · 24/7', 'Technische Einsätze 7/7 · 24/7'],
  'Services': ['Services', 'Leistungen'], 'Demandes': ['Requests', 'Anfragen'], 'Infos': ['Info', 'Infos'], 'Légal': ['Legal', 'Rechtliches'], 'Moi': ['Me', 'Ich'],
  // ── installer l'app ──
  'Installer l’app': ['Install the app', 'App installieren'],
  'L’icône LuxInterventions sur votre téléphone, comme une vraie app': ['The LuxInterventions icon on your phone, like a real app', 'Das LuxInterventions-Symbol auf Ihrem Handy, wie eine echte App'],
  'Installer': ['Install', 'Installieren'], 'Voir comment faire': ['See how', 'So geht’s'],
  '1 · Touchez': ['1 · Tap', '1 · Tippen Sie auf'], 'Partager': ['Share', 'Teilen'], '⬆️ en bas': ['⬆️ at the bottom', '⬆️ unten'],
  '« Sur l’écran d’accueil »': ['“Add to Home Screen”', '„Zum Home-Bildschirm“'], 'puis Ajouter': ['then Add', 'dann Hinzufügen'],
  '3 · L’app est installée ✓': ['3 · The app is installed ✓', '3 · Die App ist installiert ✓'],
  '📋 Copier': ['📋 Copy', '📋 Kopieren'], '🔖 Ajouter un signet': ['🔖 Add bookmark', '🔖 Lesezeichen hinzufügen'],
  'Sur l’écran d’accueil': ['Add to Home Screen', 'Zum Home-Bildschirm'], '✓ L’icône est sur votre écran': ['✓ The icon is on your screen', '✓ Das Symbol ist auf Ihrem Bildschirm'],
  '1 · Touchez le menu': ['1 · Tap the menu', '1 · Tippen Sie auf das Menü'], 'en haut': ['at the top', 'oben'],
  '« Installer l’application »': ['“Install app”', '„App installieren“'], 'Installer l’application': ['Install app', 'App installieren'],
  '🔖 Favoris': ['🔖 Bookmarks', '🔖 Lesezeichen'], '🕘 Historique': ['🕘 History', '🕘 Verlauf'],
  // ── services ──
  'De quoi avez-vous besoin ?': ['What do you need?', 'Was brauchen Sie?'],
  'Touchez un service : dépannage ou devis.': ['Tap a service: repair or quote.', 'Tippen Sie auf eine Leistung: Reparatur oder Angebot.'],
  'Rapport d’expertise': ['Expert report', 'Gutachten'], 'Toiture': ['Roofing', 'Dach'], 'Jardinage': ['Gardening', 'Gartenpflege'],
  'Étanchéité': ['Waterproofing', 'Abdichtung'], 'Rénovation façades': ['Renovation & façades', 'Renovierung & Fassaden'], 'Rénovation et façades': ['Renovation and façades', 'Renovierung und Fassaden'],
  'Serrurerie': ['Locksmith', 'Schlüsseldienst'], 'Plomberie & Débouchage': ['Plumbing & Unblocking', 'Sanitär & Rohrreinigung'], 'Électricité': ['Electricity', 'Elektrik'],
  'Collecte déchets': ['Waste collection', 'Müllabfuhr'], 'Collecte Déchets & Déchets Spéciaux': ['Waste & Special Waste Collection', 'Abfall- & Sondermüllabholung'],
  'Déménagement': ['Moving', 'Umzug'], 'Bricolage': ['Handyman', 'Kleinreparaturen'], 'Bricolage & Améliorations': ['Handyman & Improvements', 'Kleinreparaturen & Verbesserungen'],
  'Nettoyage': ['Cleaning', 'Reinigung'], 'Nettoyage des résidences': ['Residential cleaning', 'Gebäudereinigung'], 'Panneaux solaires': ['Solar panels', 'Solaranlagen'],
  'Autre demande': ['Other request', 'Andere Anfrage'], 'Nouveau service': ['New service', 'Neue Leistung'], 'Bientôt': ['Soon', 'Bald'],
  'Détection de fuites, humidité, thermographie infrarouge, inspection vidéo et traçage de conduites.': ['Leak detection, damp, infrared thermography, video inspection and pipe tracing.', 'Lecksuche, Feuchtigkeit, Infrarot-Thermografie, Videoinspektion und Leitungsortung.'],
  'Réparations d’urgence, inspection, remplacement de tuiles. Intervention rapide après intempéries.': ['Emergency repairs, inspection, tile replacement. Fast response after storms.', 'Notreparaturen, Inspektion, Ziegelaustausch. Schneller Einsatz nach Unwettern.'],
  'Entretien des espaces verts, taille, tonte, nettoyage, déneigement et salage.': ['Green space maintenance, pruning, mowing, cleaning, snow clearing and gritting.', 'Grünflächenpflege, Schnitt, Mähen, Reinigung, Schneeräumung und Streuen.'],
  'Terrasses, toitures-terrasses, sous-sols. Diagnostic et traitement contre les infiltrations.': ['Terraces, flat roofs, basements. Diagnosis and treatment of water infiltration.', 'Terrassen, Flachdächer, Keller. Diagnose und Behandlung von Wassereintritt.'],
  'Travaux intérieurs et extérieurs, remise en état, rénovation complète. Service programmé.': ['Indoor and outdoor work, refurbishment, full renovation. Scheduled service.', 'Innen- und Außenarbeiten, Instandsetzung, Komplettrenovierung. Geplanter Service.'],
  'Ouverture de portes, remplacement de cylindres, sécurisation. Intervention nocturne garantie.': ['Door opening, cylinder replacement, securing. Night call-out guaranteed.', 'Türöffnung, Zylinderwechsel, Absicherung. Nachteinsatz garantiert.'],
  'Fuites, canalisations bouchées, WC, colonnes. Urgences nocturnes et week-end disponibles.': ['Leaks, blocked pipes, toilets, risers. Night and weekend emergencies available.', 'Lecks, verstopfte Leitungen, WC, Steigleitungen. Nacht- und Wochenendnotdienst verfügbar.'],
  'Dépannages, remise en conformité, tableaux électriques, urgences.': ['Repairs, compliance upgrades, electrical panels, emergencies.', 'Störungsbehebung, Normkonformität, Schaltschränke, Notfälle.'],
  'Service régulier en partenariat avec Arcolux. Gestion des déchets pour résidences et immeubles.': ['Regular service in partnership with Arcolux. Waste management for residences and buildings.', 'Regelmäßiger Service in Partnerschaft mit Arcolux. Abfallmanagement für Wohnanlagen und Gebäude.'],
  'Organisation et exécution de déménagements résidentiels. Devis gratuit, équipe certifiée.': ['Planning and carrying out home moves. Free quote, certified team.', 'Planung und Durchführung von Wohnungsumzügen. Kostenloses Angebot, zertifiziertes Team.'],
  'Petits travaux, montage de meubles, fixations, remplacement de vitrages, réparations diverses. Rapide et fiable.': ['Small jobs, furniture assembly, fixings, glazing replacement, various repairs. Fast and reliable.', 'Kleine Arbeiten, Möbelmontage, Befestigungen, Glasaustausch, diverse Reparaturen. Schnell und zuverlässig.'],
  'Entretien et nettoyage des parties communes.': ['Maintenance and cleaning of common areas.', 'Pflege und Reinigung der Gemeinschaftsbereiche.'],
  'Devis, pose et réparation de vos panneaux solaires.': ['Quote, installation and repair of your solar panels.', 'Angebot, Montage und Reparatur Ihrer Solaranlagen.'],
  'Ce qui n’est pas dans la liste : décrivez votre besoin, nous trouvons la bonne personne.': ['Not in the list? Describe what you need, we will find the right person.', 'Nicht in der Liste? Beschreiben Sie Ihren Bedarf, wir finden die richtige Person.'],
  'Diagnostic': ['Diagnosis', 'Diagnose'], 'Urgences': ['Emergencies', 'Notfälle'], 'Programmé': ['Scheduled', 'Geplant'], 'Dépannage': ['Repairs', 'Störungsdienst'],
  'Contrat': ['Contract', 'Vertrag'], 'Sur devis': ['On quote', 'Nach Angebot'], 'Rapide': ['Fast', 'Schnell'], 'Régulier': ['Regular', 'Regelmäßig'],
  'Devis · Pose · Réparation': ['Quote · Installation · Repair', 'Angebot · Montage · Reparatur'], '7j/7': ['7/7', '7/7'], '24h/24': ['24/7', '24/7'],
  '🚨 En cas d’urgence, le téléphone reste le moyen le plus rapide, 7j/7 et 24h/24.': ['🚨 In an emergency, the phone is still the fastest way, 7 days a week, 24 hours a day.', '🚨 Im Notfall ist das Telefon der schnellste Weg, 7 Tage die Woche, rund um die Uhr.'],
  // ── formulaire ──
  'Étape 1 sur 3 · Vous': ['Step 1 of 3 · You', 'Schritt 1 von 3 · Sie'], 'Étape 2 sur 3': ['Step 2 of 3', 'Schritt 2 von 3'],
  '🚨 Dommage': ['🚨 Damage', '🚨 Schaden'], '📝 Demande de devis': ['📝 Quote request', '📝 Angebotsanfrage'],
  'Vous êtes': ['You are', 'Sie sind'], 'Propriétaire': ['Owner', 'Eigentümer'], 'Locataire': ['Tenant', 'Mieter'], 'Syndic': ['Property manager', 'Hausverwaltung'],
  'Nom et prénom (ou société)': ['Full name (or company)', 'Vor- und Nachname (oder Firma)'], 'Téléphone': ['Phone', 'Telefon'], 'E-mail (facultatif)': ['E-mail (optional)', 'E-Mail (optional)'],
  '✓ Gardé sur ce téléphone pour la prochaine fois': ['✓ Kept on this phone for next time', '✓ Auf diesem Handy für das nächste Mal gespeichert'],
  'Continuer →': ['Continue →', 'Weiter →'], 'Annuler': ['Cancel', 'Abbrechen'], '‹ Retour': ['‹ Back', '‹ Zurück'],
  'Le problème': ['The problem', 'Das Problem'], 'Votre demande': ['Your request', 'Ihre Anfrage'],
  'Adresse de l’intervention': ['Address of the job', 'Einsatzadresse'], 'Accès (étage, code, clés…)': ['Access (floor, code, keys…)', 'Zugang (Etage, Code, Schlüssel…)'],
  'Photos (jusqu’à 3)': ['Photos (up to 3)', 'Fotos (bis zu 3)'], 'Décrivez le problème': ['Describe the problem', 'Beschreiben Sie das Problem'],
  'Décrivez les travaux souhaités': ['Describe the work you want', 'Beschreiben Sie die gewünschten Arbeiten'],
  'Urgence': ['Urgency', 'Dringlichkeit'], 'Normal': ['Normal', 'Normal'], 'Aujourd’hui': ['Today', 'Heute'], '🔴 Urgent': ['🔴 Urgent', '🔴 Dringend'],
  'Rue, n°, code postal, ville': ['Street, no., postcode, town', 'Straße, Nr., PLZ, Ort'],
  'Demande prête': ['Request ready', 'Anfrage bereit'], 'Envoyer à LuxInterventions par': ['Send to LuxInterventions by', 'An LuxInterventions senden per'],
  'Votre demande est gardée dans 📋 Mes demandes.': ['Your request is kept in 📋 My requests.', 'Ihre Anfrage wird unter 📋 Meine Anfragen gespeichert.'],
  'E-mail': ['E-mail', 'E-Mail'], '📋 Copier le texte': ['📋 Copy the text', '📋 Text kopieren'],
  // ── mes demandes / fiche ──
  'Mes demandes': ['My requests', 'Meine Anfragen'], '‹ Mes demandes': ['‹ My requests', '‹ Meine Anfragen'],
  'Aucune demande pour le moment.': ['No requests yet.', 'Noch keine Anfragen.'], 'Touchez 🏠 Services pour en faire une.': ['Tap 🏠 Services to make one.', 'Tippen Sie auf 🏠 Leistungen, um eine zu stellen.'],
  'Rien en cours.': ['Nothing in progress.', 'Nichts in Bearbeitung.'], 'Aucun travail terminé pour le moment.': ['No completed work yet.', 'Noch keine abgeschlossenen Arbeiten.'],
  '📨 Envoyée': ['📨 Sent', '📨 Gesendet'], '📝 Devis reçu': ['📝 Quote received', '📝 Angebot erhalten'], '✍️ Devis signé': ['✍️ Quote signed', '✍️ Angebot unterschrieben'], '✅ Terminé': ['✅ Completed', '✅ Abgeschlossen'], '❓ Fait ?': ['❓ Done?', '❓ Erledigt?'],
  'Demande envoyée': ['Request sent', 'Anfrage gesendet'], 'Travaux terminés': ['Work completed', 'Arbeiten abgeschlossen'],
  '✅ Envoyée': ['✅ Sent', '✅ Gesendet'], '📝 J’ai reçu un devis': ['📝 I received a quote', '📝 Ich habe ein Angebot erhalten'],
  '↻ Renvoyer': ['↻ Resend', '↻ Erneut senden'], '⭐ Satisfaction': ['⭐ Satisfaction', '⭐ Zufriedenheit'], '🗑️ Supprimer de ce téléphone': ['🗑️ Delete from this phone', '🗑️ Von diesem Handy löschen'],
  '✍️ Signer le devis': ['✍️ Sign the quote', '✍️ Angebot unterschreiben'], 'Renvoyer le devis signé': ['Send back the signed quote', 'Unterschriebenes Angebot zurücksenden'],
  'Et maintenant ?': ['What now?', 'Und jetzt?'], 'L’intervention a-t-elle été faite ?': ['Has the work been done?', 'Wurde der Einsatz durchgeführt?'],
  'Oui, c’est fait': ['Yes, it’s done', 'Ja, erledigt'], 'Pas encore': ['Not yet', 'Noch nicht'], '⭐ Donner mon avis': ['⭐ Give my feedback', '⭐ Meine Bewertung abgeben'],
  // ── devis / signature ──
  'Devis reçu': ['Quote received', 'Angebot erhalten'], 'Ajoutez le devis reçu de LuxInterventions (photo, capture d’écran ou PDF), puis signez-le.': ['Add the quote you received from LuxInterventions (photo, screenshot or PDF), then sign it.', 'Fügen Sie das Angebot von LuxInterventions hinzu (Foto, Screenshot oder PDF) und unterschreiben Sie es.'],
  'N° du devis (s’il y en a un)': ['Quote no. (if any)', 'Angebotsnr. (falls vorhanden)'], '📷 Photo du devis': ['📷 Photo of the quote', '📷 Foto des Angebots'], '📄 Fichier PDF du devis': ['📄 PDF file of the quote', '📄 PDF-Datei des Angebots'],
  'Le devis reste sur ce téléphone. Une photo est aussi envoyée à LuxInterventions avec votre signature ; un PDF reste seulement ici (LuxInterventions a déjà l’original).': ['The quote stays on this phone. A photo is also sent to LuxInterventions with your signature; a PDF stays only here (LuxInterventions already has the original).', 'Das Angebot bleibt auf diesem Handy. Ein Foto wird zusammen mit Ihrer Unterschrift an LuxInterventions gesendet; ein PDF bleibt nur hier (LuxInterventions hat das Original bereits).'],
  'ex. D-0042': ['e.g. D-0042', 'z. B. D-0042'], 'Signer le devis': ['Sign the quote', 'Angebot unterschreiben'], 'Nom du signataire': ['Name of the signatory', 'Name des Unterzeichners'],
  'Votre signature — « Bon pour accord »': ['Your signature — “Approved”', 'Ihre Unterschrift — „Einverstanden“'], '✍️ signez ici avec le doigt': ['✍️ sign here with your finger', '✍️ hier mit dem Finger unterschreiben'],
  '↺ Effacer la signature': ['↺ Clear signature', '↺ Unterschrift löschen'], '✅ Accepter et signer': ['✅ Accept and sign', '✅ Annehmen und unterschreiben'], 'Devis': ['Quote', 'Angebot'],
  // ── avis ──
  'Votre avis': ['Your feedback', 'Ihre Bewertung'], '⭐ Êtes-vous satisfait ?': ['⭐ Are you satisfied?', '⭐ Sind Sie zufrieden?'], 'Note générale': ['Overall rating', 'Gesamtnote'],
  'Ponctualité': ['Punctuality', 'Pünktlichkeit'], 'Propreté': ['Cleanliness', 'Sauberkeit'], 'Travail bien fait': ['Work well done', 'Gute Arbeit'],
  '👍 Oui': ['👍 Yes', '👍 Ja'], '👎 Non': ['👎 No', '👎 Nein'], 'Un commentaire (facultatif)': ['A comment (optional)', 'Ein Kommentar (optional)'],
  'Envoyer votre avis à LuxInterventions par': ['Send your feedback to LuxInterventions by', 'Bewertung an LuxInterventions senden per'], 'Dossier': ['File', 'Vorgang'],
  '✅ Clôturer la demande': ['✅ Close the request', '✅ Anfrage abschließen'],
  'La demande passe dans « ✅ Travaux terminés ». Vous la retrouvez toujours dans Demandes.': ['The request moves to “✅ Work completed”. You can always find it in Requests.', 'Die Anfrage wird unter „✅ Arbeiten abgeschlossen“ abgelegt. Sie finden sie immer unter Anfragen.'],
  // ── infos ──
  'Nos services': ['Our services', 'Unsere Leistungen'], 'ℹ️ Nos services': ['ℹ️ Our services', 'ℹ️ Unsere Leistungen'],
  'LuxInterventions coordonne des interventions techniques pour gérances, syndics et particuliers au Luxembourg et dans la Grande Région.': ['LuxInterventions coordinates technical services for property managers, building managers and private clients in Luxembourg and the Greater Region.', 'LuxInterventions koordiniert technische Einsätze für Hausverwaltungen, Syndikate und Privatpersonen in Luxemburg und der Großregion.'],
  'Version du logiciel :': ['Software version:', 'Softwareversion:'], '‹ Tous nos services': ['‹ All our services', '‹ Alle Leistungen'], '▶ Faire une demande': ['▶ Make a request', '▶ Anfrage stellen'],
  'Sur demande': ['On request', 'Auf Anfrage'], 'Décrivez votre besoin dans la demande : nous vous recontactons.': ['Describe what you need in the request: we will get back to you.', 'Beschreiben Sie Ihren Bedarf in der Anfrage: Wir melden uns.'],
  // ── légal ──
  'Informations légales': ['Legal information', 'Rechtliche Hinweise'], '⚖️ Informations légales': ['⚖️ Legal information', '⚖️ Rechtliche Hinweise'], 'Avertissement': ['Disclaimer', 'Haftungsausschluss'],
  'Les informations de cette app (services, délais, étiquettes comme « 24h/24 » ou « Devis gratuit ») sont fournies': ['The information in this app (services, timescales, labels such as “24/7” or “Free quote”) is provided', 'Die Informationen in dieser App (Leistungen, Fristen, Hinweise wie „24/7“ oder „Kostenloses Angebot“) dienen'],
  'à titre indicatif': ['for guidance only', 'nur zur Orientierung'],
  'et peuvent changer. Elles ne constituent pas une offre contractuelle : seules font foi les conditions convenues par écrit avec LuxInterventions (devis signé, contrat).': ['and may change. It is not a contractual offer: only the conditions agreed in writing with LuxInterventions (signed quote, contract) are binding.', 'und können sich ändern. Sie sind kein Vertragsangebot: Verbindlich sind nur die schriftlich mit LuxInterventions vereinbarten Bedingungen (unterschriebenes Angebot, Vertrag).'],
  'Envoyer une demande dans l’app': ['Sending a request in the app', 'Eine Anfrage in der App zu senden'], 'n’est pas une commande': ['is not an order', 'ist keine Bestellung'],
  ': LuxInterventions vous recontacte pour confirmer, et vous recevez un devis quand il en faut un. Un devis devient un accord quand vous le signez « Bon pour accord » et le renvoyez.': [': LuxInterventions contacts you to confirm, and you receive a quote when one is needed. A quote becomes an agreement when you sign it “Approved” and send it back.', ': LuxInterventions meldet sich zur Bestätigung, und Sie erhalten ein Angebot, wenn eines nötig ist. Ein Angebot wird zur Vereinbarung, wenn Sie es mit „Einverstanden“ unterschreiben und zurücksenden.'],
  'L’app fonctionne sur votre téléphone, sans compte. LuxInterventions ne répond pas des pertes de données du téléphone (changement, panne, effacement) : pensez à la 📦 sauvegarde dans « Moi ». En cas d’urgence, appelez le': ['The app works on your phone, without an account. LuxInterventions is not liable for data lost on the phone (new phone, breakdown, deletion): remember the 📦 backup in “Me”. In an emergency, call', 'Die App funktioniert auf Ihrem Handy, ohne Konto. LuxInterventions haftet nicht für Datenverlust auf dem Handy (Wechsel, Defekt, Löschung): Denken Sie an die 📦 Sicherung unter „Ich“. Im Notfall rufen Sie an:'],
  'Données personnelles (RGPD)': ['Personal data (GDPR)', 'Personenbezogene Daten (DSGVO)'], 'Sur votre téléphone': ['On your phone', 'Auf Ihrem Handy'],
  ': vos demandes, devis, signatures et avis restent uniquement ici. Pas de compte, pas de centrale, pas de suivi publicitaire.': [': your requests, quotes, signatures and feedback stay here only. No account, no central server, no advertising tracking.', ': Ihre Anfragen, Angebote, Unterschriften und Bewertungen bleiben nur hier. Kein Konto, keine Zentrale, kein Werbe-Tracking.'],
  'Ce que reçoit LuxInterventions': ['What LuxInterventions receives', 'Was LuxInterventions erhält'], ': seulement ce que': [': only what', ': nur das, was'], 'vous': ['you', 'Sie'],
  'envoyez (e-mail, WhatsApp, SMS) et les photos ou signatures jointes par lien.': ['send (e-mail, WhatsApp, SMS) and the photos or signatures attached as a link.', 'senden (E-Mail, WhatsApp, SMS), und die als Link angehängten Fotos oder Unterschriften.'],
  'Pourquoi': ['Why', 'Warum'], ': préparer et réaliser les devis et interventions demandés (mesures précontractuelles et exécution du contrat, art. 6.1.b RGPD).': [': to prepare and carry out the quotes and jobs requested (pre-contractual steps and performance of the contract, Art. 6(1)(b) GDPR).', ': um die angefragten Angebote und Einsätze vorzubereiten und durchzuführen (vorvertragliche Maßnahmen und Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO).'],
  'Combien de temps et vos droits': ['How long, and your rights', 'Wie lange, und Ihre Rechte'],
  ': comme pour les demandes faites sur le site, selon notre politique de confidentialité. Vous pouvez à tout moment consulter, corriger ou faire effacer vos données en nous écrivant.': [': as for requests made on the website, according to our privacy policy. You can view, correct or have your data deleted at any time by writing to us.', ': wie bei Anfragen über die Website, gemäß unserer Datenschutzerklärung. Sie können Ihre Daten jederzeit einsehen, berichtigen oder löschen lassen, indem Sie uns schreiben.'],
  '📄 Mentions légales complètes': ['📄 Full legal notice (French)', '📄 Vollständiges Impressum (Französisch)'], '🔒 Politique de confidentialité complète': ['🔒 Full privacy policy (French)', '🔒 Vollständige Datenschutzerklärung (Französisch)'],
  'Nous écrire': ['Write to us', 'Schreiben Sie uns'],
  // ── moi ──
  'Mes coordonnées': ['My details', 'Meine Kontaktdaten'], 'Nom, téléphone, adresse': ['Name, phone, address', 'Name, Telefon, Adresse'],
  '⚠️ Vos demandes et vos devis sont': ['⚠️ Your requests and quotes are', '⚠️ Ihre Anfragen und Angebote sind'], 'uniquement sur ce téléphone': ['only on this phone', 'nur auf diesem Handy'],
  '. Avant de changer de téléphone :': ['. Before changing phone:', '. Vor einem Handywechsel:'], '📦 Sauvegarder': ['📦 Back up', '📦 Sichern'], ', puis 📥 Importer sur le nouveau.': [', then 📥 Import on the new one.', ', dann 📥 auf dem neuen importieren.'],
  'Mes données': ['My data', 'Meine Daten'], 'Sauvegarder mes données': ['Back up my data', 'Meine Daten sichern'], 'Un fichier à garder ou à envoyer sur votre nouveau téléphone': ['A file to keep or send to your new phone', 'Eine Datei zum Aufbewahren oder für Ihr neues Handy'],
  'Importer sur ce téléphone': ['Import on this phone', 'Auf diesem Handy importieren'], 'Retrouver demandes et devis': ['Get back requests and quotes', 'Anfragen und Angebote wiederherstellen'],
  'Confidentialité': ['Privacy', 'Datenschutz'], 'Qui reçoit vos données et pourquoi': ['Who receives your data and why', 'Wer Ihre Daten erhält und warum'],
  'Avertissement, RGPD, mentions légales': ['Disclaimer, GDPR, legal notice', 'Haftungsausschluss, DSGVO, Impressum'], 'Contacter LuxInterventions': ['Contact LuxInterventions', 'LuxInterventions kontaktieren'],
  '‹ Moi': ['‹ Me', '‹ Ich'], 'Elles remplissent vos demandes toutes seules. Gardées seulement sur ce téléphone.': ['They fill in your requests automatically. Kept only on this phone.', 'Sie füllen Ihre Anfragen automatisch aus. Nur auf diesem Handy gespeichert.'],
  'Adresse': ['Address', 'Adresse'], 'Enregistrer': ['Save', 'Speichern'], 'Langue': ['Language', 'Sprache'],
  // ── confidentialité ──
  '🔒 Confidentialité': ['🔒 Privacy', '🔒 Datenschutz'], 'Qui reçoit vos données ?': ['Who receives your data?', 'Wer erhält Ihre Daten?'],
  'LuxInterventions, seulement quand': ['LuxInterventions, only when', 'LuxInterventions, nur wenn'], 'envoyez une demande ou un devis signé (e-mail, WhatsApp ou SMS).': ['send a request or a signed quote (e-mail, WhatsApp or SMS).', 'eine Anfrage oder ein unterschriebenes Angebot senden (E-Mail, WhatsApp oder SMS).'],
  'Pourquoi ?': ['Why?', 'Warum?'], 'Uniquement pour préparer et réaliser les devis et interventions que vous demandez.': ['Only to prepare and carry out the quotes and jobs you request.', 'Nur um die von Ihnen angefragten Angebote und Einsätze vorzubereiten und durchzuführen.'],
  'Où restent-elles ?': ['Where are they kept?', 'Wo bleiben sie?'], 'Vos demandes, vos devis et vos signatures restent': ['Your requests, quotes and signatures stay', 'Ihre Anfragen, Angebote und Unterschriften bleiben'], 'sur ce téléphone': ['on this phone', 'auf diesem Handy'],
  '. Il n’y a pas de compte ni de centrale.': ['. There is no account and no central server.', '. Es gibt kein Konto und keine Zentrale.'],
  'Le message que vous envoyez reste dans votre messagerie et dans celle de LuxInterventions.': ['The message you send stays in your messaging app and in that of LuxInterventions.', 'Die gesendete Nachricht bleibt in Ihrem Postfach und in dem von LuxInterventions.'],
  'Les photos et signatures envoyées sont gardées en ligne par LuxInterventions (un lien est mis dans votre message), le temps nécessaire au traitement de votre demande.': ['The photos and signatures sent are kept online by LuxInterventions (a link is added to your message) for as long as needed to handle your request.', 'Gesendete Fotos und Unterschriften werden von LuxInterventions online aufbewahrt (ein Link steht in Ihrer Nachricht), solange es für die Bearbeitung Ihrer Anfrage nötig ist.'],
  'Vos droits :': ['Your rights:', 'Ihre Rechte:'], 'pour obtenir, corriger ou faire supprimer vos données chez LuxInterventions, écrivez-nous (bouton ci-dessous). Sur ce téléphone, vous pouvez supprimer une demande à tout moment.': ['to obtain, correct or delete your data held by LuxInterventions, write to us (button below). On this phone, you can delete a request at any time.', 'um Ihre Daten bei LuxInterventions zu erhalten, zu berichtigen oder löschen zu lassen, schreiben Sie uns (Knopf unten). Auf diesem Handy können Sie eine Anfrage jederzeit löschen.'],
  'Votre responsabilité :': ['Your responsibility:', 'Ihre Verantwortung:'], 'vous choisissez ce que vous envoyez et à qui ; gardez une 📦 sauvegarde si vous changez de téléphone.': ['you choose what you send and to whom; keep a 📦 backup if you change phone.', 'Sie entscheiden, was Sie an wen senden; machen Sie eine 📦 Sicherung, wenn Sie das Handy wechseln.'],
  // ── pop-up ──
  'Demande transmise': ['Request sent', 'Anfrage übermittelt'], 'Votre demande d’intervention': ['Your service request', 'Ihre Einsatzanfrage'], 'Votre demande de devis': ['Your quote request', 'Ihre Angebotsanfrage'],
  'Vous pouvez être tranquille : nous vous recontactons au': ['You can relax: we will call you back on', 'Sie können beruhigt sein: Wir melden uns unter'], 'OK': ['OK', 'OK'],
  'Fermer': ['Close', 'Schließen'], 'Retirer': ['Remove', 'Entfernen'],
  // ── messages courts (toasts, confirmations) ──
  'Texte copié : collez-le dans votre message à LuxInterventions': ['Text copied: paste it into your message to LuxInterventions', 'Text kopiert: Fügen Sie ihn in Ihre Nachricht an LuxInterventions ein'],
  'Copiez ce texte :': ['Copy this text:', 'Kopieren Sie diesen Text:'],
  'Mémoire du téléphone pleine : 📦 sauvegardez puis supprimez d’anciennes demandes': ['Phone memory full: 📦 back up, then delete old requests', 'Handyspeicher voll: 📦 sichern, dann alte Anfragen löschen'],
  '✨ Nouveau service bientôt disponible : restez connecté !': ['✨ New service coming soon: stay tuned!', '✨ Neue Leistung bald verfügbar: bleiben Sie dran!'],
  'Choisissez : Propriétaire, Locataire ou Syndic': ['Choose: Owner, Tenant or Property manager', 'Wählen Sie: Eigentümer, Mieter oder Hausverwaltung'],
  'Écrivez votre nom et votre téléphone': ['Enter your name and phone number', 'Geben Sie Ihren Namen und Ihre Telefonnummer ein'],
  'Écrivez l’adresse de l’intervention': ['Enter the address of the job', 'Geben Sie die Einsatzadresse ein'],
  '✅ Demande gardée dans Mes demandes': ['✅ Request kept in My requests', '✅ Anfrage unter Meine Anfragen gespeichert'],
  'Clôturer cette demande ? Elle passe dans « Travaux terminés ».': ['Close this request? It moves to “Work completed”.', 'Diese Anfrage abschließen? Sie wird unter „Arbeiten abgeschlossen“ abgelegt.'],
  '✅ Demande clôturée': ['✅ Request closed', '✅ Anfrage abgeschlossen'], '✅ Travaux terminés : donnez votre avis': ['✅ Work completed: give your feedback', '✅ Arbeiten abgeschlossen: Geben Sie Ihre Bewertung ab'],
  'D’accord : on vous redemandera demain': ['OK: we will ask you again tomorrow', 'In Ordnung: Wir fragen morgen noch einmal'],
  'Choisissez une note de 1 à 5 étoiles': ['Choose a rating from 1 to 5 stars', 'Wählen Sie eine Bewertung von 1 bis 5 Sternen'], 'Merci pour votre avis !': ['Thank you for your feedback!', 'Danke für Ihre Bewertung!'],
  'Supprimer cette demande de ce téléphone ? (LuxInterventions garde le message déjà reçu)': ['Delete this request from this phone? (LuxInterventions keeps the message already received)', 'Diese Anfrage von diesem Handy löschen? (LuxInterventions behält die bereits erhaltene Nachricht)'],
  'Écrivez le nom du signataire': ['Enter the name of the signatory', 'Geben Sie den Namen des Unterzeichners ein'], 'Signez dans le cadre avec le doigt': ['Sign in the box with your finger', 'Unterschreiben Sie mit dem Finger im Feld'],
  '⏳ Envoi de la signature…': ['⏳ Sending the signature…', '⏳ Unterschrift wird gesendet…'], '✍️ Devis signé : renvoyez-le à LuxInterventions': ['✍️ Quote signed: send it back to LuxInterventions', '✍️ Angebot unterschrieben: Senden Sie es an LuxInterventions zurück'],
  'Enregistré': ['Saved', 'Gespeichert'], '📦 Fichier enregistré : gardez-le ou envoyez-le sur votre nouveau téléphone': ['📦 File saved: keep it or send it to your new phone', '📦 Datei gespeichert: Bewahren Sie sie auf oder senden Sie sie an Ihr neues Handy'],
  'Choisissez une photo': ['Choose a photo', 'Wählen Sie ein Foto'], 'Photo illisible': ['Unreadable photo', 'Foto nicht lesbar'], 'Image illisible': ['Unreadable image', 'Bild nicht lesbar'],
  'Choisissez une photo ou un PDF': ['Choose a photo or a PDF', 'Wählen Sie ein Foto oder ein PDF'], 'Ce fichier n’est pas une sauvegarde de l’app LuxInterventions': ['This file is not a LuxInterventions app backup', 'Diese Datei ist keine Sicherung der LuxInterventions-App'],
};

// textes avec une partie variable (date, nombre, nom…) : [expression, [anglais, allemand]] — $1, $2… = parties variables
const VIA_T = { 'e-mail': ['e-mail', 'E-Mail'], WhatsApp: ['WhatsApp', 'WhatsApp'], SMS: ['SMS', 'SMS'], 'copie du texte': ['copied text', 'kopierten Text'] };
export const P = [
  [/^🕓 En cours \((\d+)\)$/, ['🕓 In progress ($1)', '🕓 In Bearbeitung ($1)']],
  [/^✅ Travaux terminés \((\d+)\)$/, ['✅ Work completed ($1)', '✅ Arbeiten abgeschlossen ($1)']],
  [/^(.+) · Dommage$/, ['$S1 · Damage', '$S1 · Schaden']],
  [/^(.+) · Devis$/, ['$S1 · Quote', '$S1 · Angebot']],
  [/^(\S+) · envoyée par (e-mail|WhatsApp|SMS|copie du texte)$/, ['$1 · sent by $V2', '$1 · gesendet per $V2']],
  [/^(\S+) · envoyée par (e-mail|WhatsApp|SMS|copie du texte) · devis (.+)$/, ['$1 · sent by $V2 · quote $3', '$1 · gesendet per $V2 · Angebot $3']],
  [/^(\S+)( · envoyée par (?:e-mail|WhatsApp|SMS|copie du texte))? · devis (.+)$/, ['$1 · quote $3', '$1 · Angebot $3']],
  [/^terminé le (\S+) · ⭐ avis à donner$/, ['completed on $1 · ⭐ feedback to give', 'abgeschlossen am $1 · ⭐ Bewertung ausstehend']],
  [/^terminé le (\S+) · ([⭐☆]+)$/, ['completed on $1 · $2', 'abgeschlossen am $1 · $2']],
  [/^(\S+) · réf\. (\S+) · par (e-mail|WhatsApp|SMS|copie du texte)$/, ['$1 · ref. $2 · by $V3', '$1 · Ref. $2 · per $V3']],
  [/^(\S+) · réf\. (\S+)$/, ['$1 · ref. $2', '$1 · Ref. $2']],
  [/^le (\S+) par (e-mail|WhatsApp|SMS|copie du texte)\. LuxInterventions vous recontacte\.$/, ['on $1 by $V2. LuxInterventions will contact you.', 'am $1 per $V2. LuxInterventions meldet sich bei Ihnen.']],
  [/^le (\S+)\. LuxInterventions vous recontacte\.$/, ['on $1. LuxInterventions will contact you.', 'am $1. LuxInterventions meldet sich bei Ihnen.']],
  [/^Devis (.+)$/, ['Quote $1', 'Angebot $1']],
  [/^Reçu le (\S+) · ✍️ signé « Bon pour accord » le (\S+)$/, ['Received on $1 · ✍️ signed “Approved” on $2', 'Erhalten am $1 · ✍️ unterschrieben „Einverstanden“ am $2']],
  [/^Reçu le (\S+)$/, ['Received on $1', 'Erhalten am $1']],
  [/^le (\S+)$/, ['on $1', 'am $1']],
  [/^Votre avis : ([⭐☆]+)( — « [\s\S]* »)? · envoyé le (\S+)$/, ['Your feedback: $1$2 · sent on $3', 'Ihre Bewertung: $1$2 · gesendet am $3']],
  [/^(.+) · demande du (\S+)$/, ['$S1 · request of $2', '$S1 · Anfrage vom $2']],
  [/^(.+) · terminé le (\S+)$/, ['$S1 · completed on $2', '$S1 · abgeschlossen am $2']],
  [/^✅ Demande clôturée le (\S+) : elle est dans « Travaux terminés »\.$/, ['✅ Request closed on $1: it is in “Work completed”.', '✅ Anfrage abgeschlossen am $1: Sie liegt unter „Arbeiten abgeschlossen“.']],
  [/^a été envoyée à LuxInterventions le (\S+) par (e-mail|WhatsApp|SMS|copie du texte)\.$/, ['was sent to LuxInterventions on $1 by $V2.', 'wurde am $1 per $V2 an LuxInterventions gesendet.']],
  [/^a été envoyée à LuxInterventions le (\S+)\.$/, ['was sent to LuxInterventions on $1.', 'wurde am $1 an LuxInterventions gesendet.']],
  [/^Réf\. (.+)$/, ['Ref. $1', 'Ref. $1']],
  [/^Infos (.+)$/, ['Info $S1', 'Infos $S1']],
  [/^(\d) sur 5$/, ['$1 out of 5', '$1 von 5']],
  [/^📥 (\d+) demandes? importées?$/, ['📥 $1 request(s) imported', '📥 $1 Anfrage(n) importiert']],
  [/^⏳ Envoi de la photo (\d+)…$/, ['⏳ Sending photo $1…', '⏳ Foto $1 wird gesendet…']],
  [/^(.*) · (Propriétaire|Locataire|Syndic)$/, ['$1 · $W2', '$1 · $W2']],
  [/^· (📝 Devis|🚨 Dommage) · (Normal|Aujourd’hui|🔴 Urgent)$/, ['· $W1 · $W2', '· $W1 · $W2']],
  [/^📷 (\d+) photos?( \(⚠️ pas toutes envoyées\))?$/, ['📷 $1 photo(s)$X2', '📷 $1 Foto(s)$X2']],
  [/^App LuxInterventions · v(.+)$/, ['LuxInterventions app · v$1', 'LuxInterventions-App · v$1']],
];
const W = { '📝 Devis': ['📝 Quote', '📝 Angebot'], '🚨 Dommage': ['🚨 Damage', '🚨 Schaden'], ...Object.fromEntries(['Propriétaire', 'Locataire', 'Syndic', 'Normal', 'Aujourd’hui', '🔴 Urgent'].map((k) => [k, T[k]])) };

export function tr(s, li) {
  if (li < 0 || s == null) return s;
  const k = String(s).trim();
  if (!k) return s;
  if (T[k]) return String(s).replace(k, T[k][li]);
  // plusieurs lignes (récapitulatif) : ligne par ligne
  if (k.includes('\n')) return String(s).split('\n').map((l) => tr(l, li)).join('\n');
  for (const [re, out] of P) {
    const m = k.match(re); if (!m) continue;
    const r = out[li].replace(/\$([SVWX]?)(\d)/g, (_, f, i) => {
      const v = m[+i] ?? '';
      if (f === 'S') return T[v] ? T[v][li] : v;
      if (f === 'V') return VIA_T[v] ? VIA_T[v][li] : v;
      if (f === 'W') return W[v] ? W[v][li] : v;
      if (f === 'X') return v ? (li === 0 ? ' (⚠️ not all sent)' : ' (⚠️ nicht alle gesendet)') : '';
      return v;
    });
    return String(s).replace(k, r);
  }
  return s;
}
