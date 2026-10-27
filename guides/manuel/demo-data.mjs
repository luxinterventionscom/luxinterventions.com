// Données d'exemple du manuel (neutres : noms et adresses inventés) — export v2 importé dans la central (Réglages → Importer)
const d0 = new Date(), iso = (d) => d.toISOString().slice(0, 10), plus = (n) => { const d = new Date(d0); d.setDate(d.getDate() + n); return iso(d); };
const T = iso(d0), Y = d0.getFullYear(), M = d0.getMonth() + 1;
const st = { v: 2 };
const put = (c, id, r) => { (st[c] ||= {})[id] = { id, ...r }; };
// immeubles et logements
put('immeubles', 'im1', { adresse: '12, rue des Exemples', ville: 'L-1234 Luxembourg', type: 'immeuble', proprietaire: 'SCI Exemple', loyer: 0, charges: 0, note: '' });
put('immeubles', 'im2', { adresse: '8, avenue du Modèle', ville: 'L-4321 Esch-sur-Alzette', type: 'immeuble', proprietaire: 'Propriétaire Démo', loyer: 0, charges: 0, note: '' });
put('logements', 'lg1', { nom: 'Appartement 1', immId: 'im1', type: 'appartement', surface: 62, etage: '1', partie: '', loyer: 1350, note: '', ch: 2 });
put('logements', 'lg2', { nom: 'Studio 2', immId: 'im1', type: 'studio', surface: 31, etage: '2', partie: '', loyer: 950, note: '' });
put('logements', 'lg3', { nom: 'Appartement 3', immId: 'im2', type: 'appartement', surface: 75, etage: 'RDC', partie: '', loyer: 1500, note: '', ch: 2 });
put('logements', 'lg4', { nom: 'Chambre 1', immId: 'im2', type: 'chambre', surface: 14, etage: '1', partie: 'Colocation A', loyer: 700, note: '' });
const loc = (id, prenom, nom, immId, logId, loyer, debut) => put('locataires', id, { prenom, nom, immId, logId, loyer, debut, tel: '+352 600 000 00' + id.slice(-1), mail: id + '@exemple.lu', caution: loyer * 2, cautionNote: '', cautionDate: debut, cautionMode: 'virement', fin: '', revision: '' });
loc('lc1', 'Anna', 'Martin', 'im1', 'lg1', 1350, `${Y - 1}-03-01`);
loc('lc2', 'Paulo', 'Silva', 'im1', 'lg2', 950, `${Y}-01-01`);
loc('lc3', 'Laura', 'Weber', 'im2', 'lg3', 1500, `${Y - 2}-09-01`);
loc('lc4', 'Marco', 'Rossi', 'im2', 'lg4', 700, `${Y}-02-01`);
for (const [l, mt] of [['lc1', 1350], ['lc2', 950], ['lc3', 1500]]) put('paiements', `${l}-${Y}-${M}`, { locId: l, y: Y, m: M, date: T, montant: mt });
// équipe
put('intervenants', 'w1', { genre: 'interne', cat: 'quotidien', prenom: 'Luc', nom: 'Bernard', metier: 'plombier', tel: '+352 621 000 001', mail: '' });
put('intervenants', 'w2', { genre: 'interne', cat: 'quotidien', prenom: 'Sofia', nom: 'Costa', metier: 'electricien', tel: '+352 621 000 002', mail: '' });
put('intervenants', 'w3', { genre: 'interne', cat: 'quotidien', prenom: 'Nadia', nom: 'Klein', metier: 'menage', tel: '+352 621 000 003', mail: '' });
// interventions
const job = (id, r) => put('taches', id, { type: 'reparation', immId: '', logId: '', locId: '', intervenantId: '', date: T, recur: '', statut: 'afaire', note: '', ...r });
job('t1', { titre: 'Fuite sous l’évier', immId: 'im1', logId: 'lg1', locId: 'lc1', intervenantId: 'w1', statut: 'planifie', heure: '10:00', urgent: true });
job('t2', { titre: 'Prise électrique HS', immId: 'im1', logId: 'lg2', locId: 'lc2', intervenantId: 'w2', statut: 'planifie', heure: '14:30' });
job('t3', { titre: 'Porte du garage bloquée', immId: 'im2', statut: 'afaire', date: plus(1) });
job('t4', { titre: 'Ménage des communs', type: 'nettoyage', immId: 'im1', intervenantId: 'w3', statut: 'fait', date: plus(-1), doneDate: plus(-1) });
// hôtel / Airbnb
put('reglages', 'hoteConf', { nom: 'Hôtel Démo', adresse: '1, place de l’Exemple, L-1111 Luxembourg', tel: '+352 400 000', wa: '', txPc: 5, txKm: 2.2, txAero: 40, txGare: 20, drivers: [{ nom: 'Marc (chauffeur)', tel: '+352 691 000 010', auto: 'Berline noire', plaque: 'LU-0001' }] });
put('reglages', 'ch-hotel-101', { lieu: 'hotel', num: '101', etage: '1', cat: 'deluxe', typ: 'double', persMax: 2, m2: 24, npieces: 1, desc: 'Chambre calme côté jardin, lit 160, douche à l’italienne, wifi.', ph: {} });
put('reglages', 'ch-hotel-102', { lieu: 'hotel', num: '102', etage: '1', cat: 'standard', typ: 'twin', persMax: 2, m2: 20, npieces: 1, desc: 'Deux lits simples, bureau, wifi.', ph: {} });
put('reglages', 'ch-airbnb-studio-centre', { lieu: 'airbnb', num: 'Studio Centre', etage: '3', typ: 'studio', persMax: 2, m2: 30, npieces: 1, adresse: '5, rue du Centre, Luxembourg', desc: 'Studio lumineux, cuisine équipée, wifi.', ph: {} });
put('hotes', 'h1', { lieu: 'hotel', prenom: 'Emma', nom: 'Dupont', tel: '+33 600 000 001', mail: '', langue: 'fr', pers: 2, chambre: '101', etage: '1', arrivee: T, depart: plus(3), hdeb: '15:00', hfin: '11:00', formule: 'pdj', pref: 'Sans gluten', code: '482915', appCode: '731204' });
put('hotes', 'h2', { lieu: 'airbnb', prenom: 'John', nom: 'Smith', tel: '+44 7000 000001', mail: '', langue: 'en', pers: 1, chambre: 'Studio Centre', adresse: '5, rue du Centre, Luxembourg', arrivee: plus(1), depart: plus(5), hdeb: '16:00', hfin: '10:00', formule: 'seul', code: '205581', appCode: '440987' });
// agences, propriétaires, biens
put('agences', 'ag1', { type: 'agence', nom: 'Immo Exemple S.à r.l.', adresse: '20, boulevard Démo, Luxembourg', rcs: 'B000001', tel: '+352 270 000', email: 'contact@immo-exemple.lu', bankLater: true, dir: { prenom: 'Claire', nom: 'Muller', email: 'claire@immo-exemple.lu' }, pour: ['soi', 'fonds'], fonds: 'Fonds Exemple SICAV', pat: { appartement: { q: '10+', n: '24' }, studio: { q: '6' }, garage: { q: '10+' }, bureau: { q: '3' }, resto: { q: '1' } } });
put('agences', 'pr1', { type: 'proprio', nom: 'Jean Exemple', tel: '+352 691 000 020', bankLater: true, dir: {}, pat: { appartement: { q: '3' }, parkext: { q: '4' }, commerce: { q: '1' } } });
put('biens', 'b1', { agenceId: 'ag1', propriete: 'tiers', tiersNom: 'M. Exemple', titre: 'Appartement 2 chambres avec terrasse', type: 'appartement', surface: 78, adresse: '3, rue Démo, Luxembourg', dispo: plus(30), louer: true, vendre: false, loyer: 1650, charges: 180, prix: '', description: 'Lumineux, terrasse 12 m², cave, parking.', pieces: [{ k: 'chambre' }, { k: 'chambre' }, { k: 'salon' }, { k: 'cuisine' }, { k: 'sdb' }], cree: T, photos: [] });
// annonce d'un partenaire (HORECA)
put('avis', 'p1', { kind: 'pub', st: 'ok', type: 'evenement', cat: 'bar', nom: 'Bistrot Démo — Happy hour', adresse: '10, rue du Marché, Luxembourg', texte: 'Cocktails −50 % de 17 h à 19 h', tel: '+352 270 001', web: '', video: '', slot: 'haut', aud: ['loc', 'hote', 'eq'], debut: plus(-2), fin: plus(20), immId: '' });
process.stdout.write(JSON.stringify(st));
