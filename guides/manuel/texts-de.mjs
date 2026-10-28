// Handbuch — Deutsch
export default {
  title: 'Handbuch der Anwendung INTERVENTIONS',
  sub: 'Die Zentrale und ihre Apps — bebilderte Anleitung',
  toc: 'Inhalt',
  shotsNote: 'Die Bildschirmfotos zeigen erfundene Beispieldaten.',
  sec: {
    intro: ['Überblick', `
<p>Die Anwendung vereint in einer einzigen <b>Zentrale</b> alles, was Sie für die Verwaltung von Immobilien brauchen: technische Einsätze, Mieter, Mieten, Hotels, Airbnb, Taxis, Agenturen, Eigentümer und Buchhaltung. Rund um die Zentrale erhält jede Person ihre eigene App, ohne Passwort: ein <b>Zugangscode</b> genügt.</p>
<table><tr><th>App</th><th>Für wen</th><th>Was sie tut</th></tr>
<tr><td>🏢 Zentrale</td><td>Sie (Verwalter)</td><td>Alles verwalten, Zugänge der anderen Apps erstellen</td></tr>
<tr><td>🏠 Mieterbereich</td><td>Mieter</td><td>Einsatzanfragen, Dokumente, Mieten, Nachrichten</td></tr>
<tr><td>🛠️ Team-App</td><td>Techniker</td><td>Einsätze des Tages, Fotos, Unterschrift, Abschluss</td></tr>
<tr><td>🛎️ Mein Aufenthalt</td><td>Hotel- / Airbnb-Gäste</td><td>Ankunft, Taxi, Zimmer, Dienste, Nachrichten</td></tr>
<tr><td>🚕 Taxi</td><td>Taxiunternehmen</td><td>Fahrer, Fahrzeuge, Tarife, Fahrten annehmen</td></tr>
<tr><td>📣 Anzeigen</td><td>Restaurants, Bars (HORECA)</td><td>Werbung, Menüs, Veranstaltungen in den Apps</td></tr>
<tr><td>🔑 Kunden-Zentrale</td><td>Verwaltungen, Agenturen, Hotels als Kunden</td><td>Ihre eigene Zentrale, mit Lizenz</td></tr></table>
<p>Alle Daten werden <b>auf dem Gerät verschlüsselt</b>, bevor sie gesendet werden: Der Server speichert nur unlesbare Tresore.</p>`],
    start: ['Erste Schritte', `
<ol><li>Öffnen Sie die Zentrale auf dem Telefon oder Computer und wählen Sie Ihren <b>Zugangsschlüssel</b> (ein langer Satz, den nur Sie kennen). Bewahren Sie ihn sicher auf: Ohne ihn kann niemand — auch wir nicht — die Daten lesen.</li>
<li>Fügen Sie die Zentrale auf dem Telefon zum Startbildschirm hinzu: Sie öffnet sich dann wie eine App.</li>
<li>Die Zentrale ist <b>immer nur auf einem Gerät</b> geöffnet. Öffnen Sie sie anderswo, tippen Sie auf <b>„Übernehmen“</b>: Das andere Gerät wird geschlossen.</li>
<li>Die Sprache wählen Sie in den <b>Einstellungen</b> (Französisch, Italienisch, Deutsch, Englisch, Portugiesisch, Spanisch).</li></ol>
<p>Auf dem Telefon ist das Menü eine Leiste unten, die sich mit dem Finger verschieben lässt; am Computer steht es links. Die Tasten <b>＋</b> legen direkt einen neuen Eintrag an.</p>`],
    accueil: ['Start', `
<p>Die Startseite fasst den Tag zusammen: offene und dringende Einsätze, ausstehende Mieten, Hotelankünfte, ungelesene Nachrichten. Tippen Sie auf eine Zahl, um direkt zur Liste zu gelangen.</p>`],
    maintenance: ['Wartung und Einsätze', `
<p><b>Wartung</b> sammelt alle Einsätze: Ihre eigenen, die Anfragen der Mieter und die Anfragen Ihrer Lizenzkunden.</p>
<ol><li>Tippen Sie auf <b>＋</b>, um einen Einsatz anzulegen: Gebäude, Wohnung, Beschreibung, Dringlichkeit, Fotos.</li>
<li>Wählen Sie den <b>Techniker</b>: Er erhält den Einsatz sofort in seiner Team-App.</li>
<li>Verfolgen Sie den Stand: offen, in Arbeit, erledigt. Der Techniker fügt Fotos und Unterschrift hinzu; Sie bestätigen.</li></ol>
<p>Die Karte eines Technikers enthält Kontaktdaten, Beruf und den Reiter <b>App</b>, der seinen Zugangscode erstellt. Die <b>Rangliste</b> belohnt die aktivsten Mieter („Mieter des Jahres“).</p>`],
    proprietes: ['Meine Immobilien', `
<p>Hier erfassen Sie Ihre Gebäude und deren Einheiten (Wohnungen, Studios, Büros, Garagen…). Jede Einheit kann einen Mieter erhalten. Die Reiter <b>Mieter</b> und <b>Mieterverw.</b> befinden sich in diesem Bereich.</p>`],
    locataires: ['Mieter und ihre App', `
<ol><li>Tippen Sie unter <b>Mieter</b> auf <b>＋</b> und füllen Sie die Karte aus: Name, Telefon, Wohnung, Miete, Nebenkosten, Mietbeginn.</li>
<li>Öffnen Sie die Karte, Reiter <b>Bereich</b>, und aktivieren Sie den <b>Mieterbereich</b>: Ein Zugangscode erscheint.</li>
<li>Senden Sie Link und Code an den Mieter (WhatsApp, SMS, E-Mail). Er öffnet die App, gibt den Code ein, fertig.</li>
<li>Verliert der Mieter seinen Code, öffnen Sie erneut den Reiter <b>Bereich</b> und erstellen einen <b>neuen Code</b>: Der alte gilt nicht mehr.</li></ol>`],
    loyers: ['Mieten', `
<p><b>Mieterverw.</b> zeigt Monat für Monat erwartete, bezahlte und überfällige Mieten. Erfassen Sie eine Zahlung mit einem Tippen; der Mieter findet seine Quittungen in seiner App.</p>`],
    hotel: ['Hotel', `
<p>Der Bereich <b>Hotel</b> verwaltet Zimmer und Gäste.</p>
<ol><li><b>Hotel-Einstellungen</b>: Name, Adresse, Dienste, Speisekarte als PDF.</li>
<li><b>Zimmer</b>: Nummer, Etage, Kategorie, Typ, Personenzahl, m², Beschreibung und <b>Übergabeprotokoll beim Einzug</b> mit Fotos.</li>
<li><b>Gast</b>: Name, Land (mit Flagge), Daten, Zimmer, Verpflegung, Vorlieben und Allergien, bis zu 7 Fotos. Beim Speichern entsteht ein <b>Code</b> für die App <b>Mein Aufenthalt</b>.</li>
<li>Bei der Abreise erstellen Sie das <b>Übergabeprotokoll beim Auszug</b>.</li></ol>`],
    airbnb: ['Airbnb', `
<p>Der Bereich <b>Airbnb</b> funktioniert wie das Hotel, für pro Nacht vermietete Unterkünfte: Unterkünfte, Gäste, Protokolle, Code für die App Mein Aufenthalt.</p>`],
    taxis: ['Taxis', `
<p>Erfassen Sie die Partner-Taxiunternehmen. Jedes Unternehmen erhält einen Code für seine <b>Taxi</b>-App, in der es Fahrer, Fahrzeuge und Tarife verwaltet. Bestellt ein Gast in Mein Aufenthalt ein Taxi, erhält das Unternehmen die Fahrt, nimmt sie an oder lehnt sie ab, und der Gast verfolgt die Ankunft.</p>`],
    agences: ['Agenturen, Eigentümer und Bestand', `
<p><b>Agenturen</b>: Ihre Partner-Immobilienagenturen. Eine Agentur kann <b>auf eigene Rechnung</b>, für <b>Eigentümer</b> oder für <b>Investmentfonds</b> arbeiten.</p>
<p><b>Eigentümer</b>: die Eigentümer der Immobilien, die Sie verwalten.</p>
<p><b>Bestand</b>: Geben Sie in jeder Karte pro Objektart (Wohnungen, Studios, Garagen, Stellplätze, Büros, Restaurants…) die Menge über das Menü 1…10 / 10+ und dann die genaue Zahl an.</p>`],
    gerances: ['Verwaltungen', `
<p>Die Hausverwaltungen, mit denen Sie arbeiten: Kontaktdaten, betreute Gebäude, Bestand. Sie können auch ihre eigene Zentrale mit Lizenz erhalten.</p>`],
    compta: ['Buchhaltung, Abonnements und Werbekunden', `
<p><b>Buchhaltung</b>: Einnahmen und Ausgaben, Rechnungen der Einsätze, Monatssummen.</p>
<p><b>Abonnements</b>: die Abonnements Ihrer Kunden und der Reiter <b>Werbekunden</b> (HORECA). Legen Sie einen Werbekunden an: Er erhält einen Code für die App <b>Anzeigen</b>. Seine Anzeigen kommen hier zur <b>Freigabe</b> an, bevor sie in den Apps erscheinen.</p>
<p>Die Online-Zahlung ist noch nicht angeschlossen: Die Taste ist sichtbar, zeigt aber „nicht verbunden“.</p>`],
    reglages: ['Einstellungen', `
<p>Sprache, Firmendaten, Sicherung: <b>Verschlüsselte Sicherung</b> erstellt eine .ares-Datei, die nur mit Ihrem Schlüssel lesbar ist, <b>Lesbarer Export</b> eine unverschlüsselte JSON-Datei, <b>Importieren</b> lädt eine der beiden. Sichern Sie regelmäßig und bewahren Sie die Datei außerhalb des Telefons auf. Hier finden Sie auch die <b>Lizenzen</b>.</p>`],
    licences: ['Lizenzen', `
<p>Sie können Ihren Kunden (Verwaltungen, Agenturen, Eigentümern, Hotels, Airbnb) <b>eine eigene Zentrale</b> geben, getrennt und verschlüsselt.</p>
<ol><li><b>Tarife</b>: für jede Sparte der Preis für ein Jahr und der Rabatt für 2 und 3 Jahre.</li>
<li><b>＋ Kunde</b>: Sparte, Name, Telefon. Der Kunde startet mit einer <b>festen Testphase von 15 Tagen</b> und erhält einen Zugangscode.</li>
<li>Wählen Sie in der Kundenkarte das Paket <b>1, 2 oder 3 Jahre</b>: Der Preis ändert sich je nach Paket. Eine PDF-Rechnung wird erstellt, als bezahlt oder offen markiert.</li>
<li>Bei Ablauf wechselt die Zentrale des Kunden auf <b>Nur Lesen</b>; Sie können sie <b>sperren</b>, einen neuen Zugang erstellen oder sie <b>löschen</b> (mit Löschbescheinigung).</li></ol>
<p>Die Seite Lizenzen zeigt auch Statistiken, Register und CSV-Export.</p>`],
    client: ['Die Zentrale des Kunden', `
<p>Der Kunde öffnet seine Zentrale mit seinem Code und wählt seinen eigenen Schlüssel. Er sieht nur die Bereiche seiner Sparte, mit einem Hinweis zu Testphase oder Ablauf. Seine Immobilien verwaltet er selbst; die <b>Einsätze</b> führt weiterhin die Hauptzentrale aus: Seine <b>Anfragen</b> kommen verschlüsselt direkt in Ihrer <b>Wartung</b> an.</p>`],
    appLoc: ['App Mieterbereich', `
<p>Der Mieter sieht seine Wohnung, Mieten und Dokumente. Er sendet eine <b>Einsatzanfrage</b> mit Fotos und verfolgt den Fortschritt. Er erhält Ihre Nachrichten und Hinweise.</p>`],
    appEq: ['Team-App', `
<p>Der Techniker sieht die Einsätze des Tages mit Adresse und Route. Er fügt Vorher-/Nachher-Fotos hinzu, lässt unterschreiben und schließt den Einsatz ab: Sie sehen es sofort in der Zentrale.</p>`],
    appSejour: ['App Mein Aufenthalt und Fahrerseite', `
<p>Der Hotel- oder Airbnb-Gast öffnet <b>Mein Aufenthalt</b> mit seinem Code: Aufenthalt, Zimmer, Dienste, Speisekarte, Nachrichten.</p>
<p><b>Ankunft</b>: Er wählt „selbst“ oder <b>Taxi</b>. Mit Taxi sieht er die Entfernung in km und den Preis in €, und verfolgt die Ankunftszeit des Fahrers. Während des Aufenthalts kann er einen Fahrer buchen.</p>
<p>Der Fahrer erhält einen <b>Link</b> (nichts zu installieren): „Ich fahre los“, „Ich bin vor Ort“, „Gast an Bord“, „Angekommen“. Übertragen wird nur die Ankunftszeit, nie die Position.</p>`],
    appTaxi: ['Taxi-App', `
<p>Das Taxiunternehmen erfasst seine <b>Fahrer</b> und <b>Fahrzeuge</b> in drei Klassen: <b>Luxus</b>, <b>Komfort</b> und <b>Eco</b>, mit Tarifen (Grundpreis, km, Stunde, Tag) und Extras (Empfang, Getränke, Personenschutz…). Es erhält Fahrten, nimmt sie an oder lehnt sie ab und teilt den Fahrer zu.</p>`],
    appAnn: ['App Anzeigen (HORECA)', `
<p>Das Restaurant oder die Bar erstellt <b>Anzeigen</b>, Menüs und Veranstaltungen: Text, Bild, Tage und Uhrzeiten, Zeitfenster, Ziel-Apps und Preis. Jede Anzeige geht zur Freigabe an die Zentrale, bevor sie erscheint.</p>`],
    secu: ['Sicherheit und gute Praxis', `
<ul><li>Die Daten werden auf dem Gerät verschlüsselt; Ihr Schlüssel wird nie gesendet.</li>
<li>Geben Sie Ihren Schlüssel nie weiter; die anderen Apps nutzen eigene Codes, die Sie jederzeit ersetzen können.</li>
<li>Erstellen Sie Sicherungen (Einstellungen → Verschlüsselte Sicherung) und bewahren Sie sie außerhalb des Telefons auf; der lesbare Export ist nicht verschlüsselt.</li>
<li>Nur ein Gerät öffnet die Zentrale: „Übernehmen“ schließt das andere.</li></ul>`],
  },
};
