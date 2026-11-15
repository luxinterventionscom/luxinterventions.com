# Liens des apps — qui va où

Une seule app par rôle : l'app reconnaît **qui vous êtes grâce au code** (l'inquilino d'une agence ou d'un propriétaire
utilise la même app que les nôtres, mais ne voit que sa maison et écrit à son gestionnaire).

| Adresse simple | Vraie page | Pour qui |
|---|---|---|
| /centraldomier.html | (page réelle) | **CENTRAL-DOMIER** : la centrale principale, sa propre adresse (même app que locataires.html) |
| /centraldomier/?<numéro> | (page réelle) | la centrale d'un **client** du réseau — seulement son numéro, aucun nom (lien de son invitation) |
| /centrale.html | locataires.html | la centrale (la nôtre ; celle d'un client avec `?t=code`) |
| /proprietaire.html | locataires.html | la centrale d'un **propriétaire / bailleur principal** du réseau (`?t=code`) — lien de son invitation |
| /agence.html | locataires.html | la centrale d'une **agence immobilière** du réseau (`?t=code`) |
| /gestionnaire.html | locataires.html | la centrale d'une **gérance** du réseau (`?t=code`) — /gerance.html reste le portail gratuit |
| /inquilini.html · /locataire.html | espace.html | l'app des locataires (de tous les gestionnaires) |
| /operai.html | equipe.html | l'app de l'équipe (ouvriers) |
| /autista.html | equipe.html | l'app des autisti (nos chauffeurs salariés, freelances avec ou sans société) |
| /ospiti.html · /hotel.html · /airbnb.html | hote.html | l'app des clients d'hôtel et d'Airbnb |
| /taxi.html | equipe.html?app=taxi | l'app du **tassista** (chauffeur d'une CENTRALE-TAXI), même moteur que l'app autista |
| /taxi-ditta.html | taxi-ditta.html | l'ancienne app des sociétés de taxi (en attendant qu'elles passent en CENTRALE-TAXI) |
| /annunci.html · /annonces.html | annonce.html | l'app des annonceurs (restaurants, bars…) |
| /gerance.html | portail.html | le portail gratuit des gérances |

Les adresses simples ne font que renvoyer à la vraie page (même code, même lien d'invitation).
