// Manuel — français (langue de référence ; les autres langues suivent les mêmes clés)
export default {
  title: 'Manuel de l’application INTERVENTIONS',
  sub: 'La centrale et ses applications — guide illustré',
  toc: 'Sommaire',
  shotsNote: 'Les captures montrent des données d’exemple fictives.',
  sec: {
    intro: ['Vue d’ensemble', `
<p>L’application réunit dans une seule <b>centrale</b> tout ce qu’il faut pour gérer des biens : interventions techniques, locataires, loyers, hôtels, Airbnb, taxis, agences, propriétaires et comptabilité. Autour de la centrale, chaque personne reçoit sa propre application, sans mot de passe à retenir : un simple <b>code d’accès</b> suffit.</p>
<table><tr><th>Application</th><th>Pour qui</th><th>Ce qu’elle fait</th></tr>
<tr><td>🏢 Centrale</td><td>Vous (gestionnaire)</td><td>Tout gérer, créer les accès des autres applications</td></tr>
<tr><td>🏠 Espace locataire</td><td>Locataires</td><td>Demandes d’intervention, documents, loyers, messages</td></tr>
<tr><td>🛠️ Équipe</td><td>Techniciens</td><td>Interventions du jour, photos, signature, fin de travail</td></tr>
<tr><td>🛎️ Mon séjour</td><td>Clients d’hôtel / Airbnb</td><td>Arrivée, taxi, chambre, services, messages</td></tr>
<tr><td>🚕 Taxi</td><td>Sociétés de taxi</td><td>Chauffeurs, voitures, tarifs, courses à accepter</td></tr>
<tr><td>📣 Annonces</td><td>Restaurants, bars (HORECA)</td><td>Publicités, menus, événements dans les applications</td></tr>
<tr><td>🔑 Centrale client</td><td>Gérances, agences, hôtels clients</td><td>Leur propre centrale, sous licence</td></tr></table>
<p>Toutes les données sont <b>chiffrées sur l’appareil</b> avant d’être envoyées : le serveur ne garde que des coffres illisibles.</p>`],
    start: ['Premiers pas', `
<ol><li>Ouvrez la centrale sur votre téléphone ou votre ordinateur et choisissez votre <b>clé d’accès</b> (une phrase longue que vous seul connaissez). Notez-la en lieu sûr : sans elle, personne — pas même nous — ne peut relire les données.</li>
<li>Sur téléphone, ajoutez la centrale à l’écran d’accueil : elle s’ouvre alors comme une application.</li>
<li>La centrale ne s’ouvre que sur <b>un appareil à la fois</b>. Si vous l’ouvrez ailleurs, touchez <b>« Prendre la main »</b> : l’autre appareil se ferme.</li>
<li>La langue se choisit dans <b>Réglages</b> (français, italien, allemand, anglais, portugais, espagnol).</li></ol>
<p>Sur téléphone, le menu est une barre en bas de l’écran qui défile au doigt ; sur ordinateur, il est à gauche. Les boutons <b>＋</b> créent directement une fiche.</p>`],
    accueil: ['Accueil', `
<p>L’accueil résume la journée : interventions ouvertes et urgentes, loyers en attente, arrivées à l’hôtel, messages non lus. Touchez un chiffre pour aller directement à la liste correspondante.</p>`],
    maintenance: ['Maintenance et interventions', `
<p><b>Maintenance</b> regroupe toutes les interventions : celles créées par vous, celles demandées par les locataires et celles envoyées par vos clients sous licence.</p>
<ol><li>Touchez <b>＋</b> pour créer une intervention : bien, logement, description, urgence, photos.</li>
<li>Choisissez le <b>technicien</b> : il la reçoit aussitôt dans son application Équipe.</li>
<li>Suivez l’état : à faire, en cours, terminée. Le technicien ajoute photos et signature ; vous validez.</li></ol>
<p>La fiche d’un technicien contient ses coordonnées, son métier et l’onglet <b>App</b> qui crée son code d’accès. Le <b>Classement</b> récompense les locataires les plus actifs (« locataire de l’année »).</p>`],
    proprietes: ['Mes Propriétés', `
<p>Ici vous enregistrez vos immeubles et leurs logements (appartements, studios, bureaux, garages…). Chaque logement peut recevoir un locataire. Les onglets <b>Locataires</b> et <b>Gestion loc.</b> sont rangés dans cette rubrique.</p>`],
    locataires: ['Locataires et leur application', `
<ol><li>Dans <b>Locataires</b>, touchez <b>＋</b> et remplissez la fiche : nom, téléphone, logement, loyer, charges, début du bail.</li>
<li>Ouvrez la fiche, onglet <b>Espace</b>, puis activez l’<b>espace locataire</b> : un code d’accès s’affiche.</li>
<li>Envoyez le lien et le code au locataire (WhatsApp, SMS, e-mail). Il ouvre l’application, tape le code, et c’est tout.</li>
<li>Si le locataire perd son code, ouvrez à nouveau l’onglet <b>Espace</b> et créez un <b>nouveau code</b> : l’ancien ne fonctionne plus.</li></ol>`],
    loyers: ['Loyers', `
<p><b>Gestion loc.</b> montre, mois par mois, les loyers attendus, payés et en retard. Enregistrez un paiement en un toucher ; le locataire retrouve ses quittances dans son application.</p>`],
    hotel: ['Hôtel', `
<p>La rubrique <b>Hotel</b> gère les chambres et les clients.</p>
<ol><li><b>Réglages de l’hôtel</b> : nom, adresse, services, menu en PDF.</li>
<li><b>Chambres</b> : numéro, étage, catégorie, type, nombre de personnes, m², description et <b>état des lieux d’entrée</b> avec photos.</li>
<li><b>Client</b> : nom, pays (avec drapeau), dates, chambre, formule repas, préférences et allergies, jusqu’à 7 photos. En enregistrant, un <b>code</b> est créé pour l’application <b>Mon séjour</b>.</li>
<li>Au départ, faites l’<b>état des lieux de sortie</b> du client.</li></ol>`],
    airbnb: ['Airbnb', `
<p>La rubrique <b>Airbnb</b> fonctionne comme l’hôtel, pour des logements loués à la nuit : logements, voyageurs, état des lieux, code de l’application Mon séjour.</p>`],
    taxis: ['Taxis', `
<p>Enregistrez les sociétés de taxi partenaires. Chaque société reçoit un code pour son application <b>Taxi</b> où elle gère chauffeurs, voitures et tarifs. Quand un client demande un taxi dans Mon séjour, la société reçoit la course, l’accepte ou la refuse, et le client suit l’arrivée.</p>`],
    agences: ['Agences, propriétaires et patrimoine', `
<p><b>Agences</b> : vos agences immobilières partenaires. Une agence peut travailler pour <b>son propre compte</b>, pour des <b>propriétaires</b> ou pour des <b>fonds d’investissement</b>.</p>
<p><b>Propriétaires</b> : les propriétaires des biens que vous gérez.</p>
<p><b>Patrimoine</b> : dans chaque fiche, indiquez par type de bien (appartements, studios, garages, parkings, bureaux, restaurants…) la quantité avec le menu 1…10 / 10+, puis le nombre exact.</p>`],
    gerances: ['Gérances', `
<p>Les gérances (syndics) avec lesquelles vous travaillez : coordonnées, immeubles suivis, patrimoine. Elles peuvent aussi recevoir leur propre centrale sous licence.</p>`],
    compta: ['Comptabilité, abonnements et annonceurs', `
<p><b>Comptabilité</b> : recettes et dépenses, factures des interventions, totaux par mois.</p>
<p><b>Abonnements</b> : les abonnements de vos clients et l’onglet <b>Annonceurs</b> (HORECA). Créez un annonceur : il reçoit un code pour l’application <b>Annonces</b>. Ses publicités arrivent ici pour <b>approbation</b> avant d’apparaître dans les applications.</p>
<p>Le paiement en ligne n’est pas encore branché : le bouton est visible mais indique « non connecté ».</p>`],
    reglages: ['Réglages', `
<p>Langue, coordonnées de la société, sauvegarde : <b>Sauvegarde chiffrée</b> crée un fichier .ares lisible uniquement avec votre clé, <b>Export lisible</b> un fichier JSON non chiffré, <b>Importer</b> recharge l’un ou l’autre. Faites une sauvegarde régulière et gardez-la hors du téléphone. C’est aussi ici que se trouvent les <b>Licences</b>.</p>`],
    licences: ['Licences', `
<p>Vous pouvez donner à vos clients (gérances, agences, propriétaires, hôtels, Airbnb) <b>leur propre centrale</b>, séparée et chiffrée.</p>
<ol><li><b>Tarifs</b> : pour chaque filière, le prix d’un an et la remise pour 2 et 3 ans.</li>
<li><b>＋ Client</b> : filière, nom, téléphone. Le client démarre avec un <b>essai fixe de 15 jours</b> et reçoit un code d’accès.</li>
<li>Dans la fiche du client, choisissez le forfait <b>1, 2 ou 3 ans</b> : le prix change selon le forfait. Une facture PDF est créée, marquée payée ou à payer.</li>
<li>À l’échéance, la centrale du client passe en <b>lecture seule</b> ; vous pouvez la <b>bloquer</b>, créer un nouvel accès ou la <b>supprimer</b> (un certificat de suppression est délivré).</li></ol>
<p>La page Licences montre aussi statistiques, registre et export CSV.</p>`],
    client: ['La centrale du client', `
<p>Le client ouvre sa centrale avec son code et choisit sa propre clé. Il ne voit que les rubriques de sa filière, avec un bandeau d’essai ou d’échéance. Il gère ses biens lui-même ; les <b>interventions</b> restent faites par la centrale principale : ses <b>demandes</b> arrivent chiffrées directement dans votre <b>Maintenance</b>.</p>`],
    appLoc: ['Application Espace locataire', `
<p>Le locataire voit son logement, ses loyers et documents. Il envoie une <b>demande d’intervention</b> avec photos et suit son avancement. Il reçoit vos messages et avis.</p>`],
    appEq: ['Application Équipe', `
<p>Le technicien voit ses interventions du jour avec adresse et itinéraire. Il ajoute photos avant/après, fait signer et termine l’intervention : vous le voyez aussitôt dans la centrale.</p>`],
    appSejour: ['Application Mon séjour et page chauffeur', `
<p>Le client d’hôtel ou d’Airbnb ouvre <b>Mon séjour</b> avec son code : séjour, chambre, services, menu, messages.</p>
<p><b>Arrivée</b> : il choisit « par moi-même » ou <b>taxi</b>. Avec le taxi, il voit la distance en km et le prix en €, et suit l’heure d’arrivée du chauffeur. Pendant le séjour il peut réserver un chauffeur.</p>
<p>Le chauffeur reçoit un <b>lien</b> (rien à installer) : « je pars », « je suis sur place », « client à bord », « arrivé ». Seule l’heure d’arrivée est transmise, jamais la position.</p>`],
    appTaxi: ['Application Taxi', `
<p>La société de taxi enregistre ses <b>chauffeurs</b> et ses <b>voitures</b> en trois classes : <b>luxe</b>, <b>confort</b> et <b>éco</b>, avec tarifs (prise en charge, km, heure, journée) et extras (accueil, boissons, garde du corps…). Elle reçoit les courses, les accepte ou les refuse et désigne le chauffeur.</p>`],
    appAnn: ['Application Annonces (HORECA)', `
<p>Le restaurant ou le bar crée ses <b>annonces</b>, menus et événements : texte, image, jours et heures, créneau, applications ciblées et prix. Chaque annonce est envoyée pour approbation dans la centrale avant d’être diffusée.</p>`],
    secu: ['Sécurité et bonnes pratiques', `
<ul><li>Les données sont chiffrées sur l’appareil ; votre clé n’est jamais envoyée.</li>
<li>Ne communiquez jamais votre clé ; les autres applications utilisent leurs propres codes, que vous pouvez remplacer à tout moment.</li>
<li>Faites des sauvegardes (Réglages → Sauvegarde chiffrée) et gardez-les hors du téléphone ; l’export lisible n’est pas chiffré.</li>
<li>Un seul appareil à la fois ouvre la centrale : « Prendre la main » ferme l’autre.</li></ul>`],
  },
};
