// Manual — English
export default {
  title: 'INTERVENTIONS application manual',
  sub: 'The central app and its companion apps — illustrated guide',
  toc: 'Contents',
  shotsNote: 'Screenshots show fictitious sample data.',
  sec: {
    intro: ['Overview', `
<p>The application brings together in one <b>central app</b> everything needed to manage property: technical jobs, tenants, rents, hotels, Airbnb, taxis, agencies, owners and accounting. Around the central app, each person gets their own app, with no password to remember: an <b>access code</b> is enough.</p>
<table><tr><th>App</th><th>For whom</th><th>What it does</th></tr>
<tr><td>🏢 Central</td><td>You (manager)</td><td>Manage everything, create access for the other apps</td></tr>
<tr><td>🏠 Tenant space</td><td>Tenants</td><td>Repair requests, documents, rents, messages</td></tr>
<tr><td>🛠️ Team app</td><td>Technicians</td><td>Today’s jobs, photos, signature, job done</td></tr>
<tr><td>🛎️ My stay</td><td>Hotel / Airbnb guests</td><td>Arrival, taxi, room, services, messages</td></tr>
<tr><td>🚕 Taxi</td><td>Taxi companies</td><td>Drivers, cars, rates, rides to accept</td></tr>
<tr><td>📣 Ads</td><td>Restaurants, bars (HORECA)</td><td>Adverts, menus, events inside the apps</td></tr>
<tr><td>🔑 Client central</td><td>Management companies, agencies, hotels as clients</td><td>Their own central, under licence</td></tr></table>
<p>All data is <b>encrypted on the device</b> before it is sent: the server only keeps unreadable vaults.</p>`],
    start: ['Getting started', `
<ol><li>Open the central app on your phone or computer and choose your <b>access key</b> (a long sentence only you know). Keep it somewhere safe: without it nobody — not even us — can read the data.</li>
<li>On a phone, add the central app to the home screen: it then opens like an app.</li>
<li>The central app is open on <b>one device at a time</b>. If you open it elsewhere, tap <b>“Take over”</b>: the other device is closed.</li>
<li>Choose the language in <b>Settings</b> (French, Italian, German, English, Portuguese, Spanish).</li></ol>
<p>On a phone the menu is a bar at the bottom that scrolls sideways; on a computer it is on the left. The <b>＋</b> buttons create a new record directly.</p>`],
    accueil: ['Home', `
<p>Home sums up the day: open and urgent jobs, pending rents, hotel arrivals, unread messages. Tap a number to go straight to the matching list.</p>`],
    maintenance: ['Maintenance and jobs', `
<p><b>Maintenance</b> gathers every job: the ones you create, the ones requested by tenants and the ones sent by your licensed clients.</p>
<ol><li>Tap <b>＋</b> to create a job: building, unit, description, urgency, photos.</li>
<li>Choose the <b>technician</b>: they receive it straight away in their Team app.</li>
<li>Follow the status: to do, in progress, done. The technician adds photos and a signature; you approve.</li></ol>
<p>A technician’s card holds contact details, trade and the <b>App</b> tab that creates their access code. The <b>Ranking</b> rewards the most active tenants (“tenant of the year”).</p>`],
    proprietes: ['My properties', `
<p>Here you record your buildings and their units (flats, studios, offices, garages…). Each unit can receive a tenant. The <b>Tenants</b> tabs are found in this section.</p>`],
    locataires: ['Tenants and their app', `
<ol><li>In <b>Tenants</b>, tap <b>＋</b> and fill in the card: name, phone, unit, rent, charges, lease start.</li>
<li>Open the card, <b>Space</b> tab, and switch on the <b>tenant space</b>: an access code appears.</li>
<li>Send the link and the code to the tenant (WhatsApp, SMS, e-mail). They open the app, type the code, and that’s it.</li>
<li>If the tenant loses the code, open the <b>Space</b> tab again and create a <b>new code</b>: the old one stops working.</li></ol>`],
    loyers: ['Rents', `
<p>The rents view shows, month by month, rents expected, paid and late. Record a payment with one tap; the tenant finds the receipts in their app.</p>`],
    hotel: ['Hotel', `
<p>The <b>Hotel</b> section manages rooms and guests.</p>
<ol><li><b>Hotel settings</b>: name, address, services, menu as PDF.</li>
<li><b>Rooms</b>: number, floor, category, type, number of people, m², description and <b>check-in inventory</b> with photos.</li>
<li><b>Guest</b>: name, country (with flag), dates, room, meal plan, preferences and allergies, up to 7 photos. Saving creates a <b>code</b> for the <b>My stay</b> app.</li>
<li>At departure, do the guest’s <b>check-out inventory</b>.</li></ol>`],
    airbnb: ['Airbnb', `
<p>The <b>Airbnb</b> section works like the hotel, for places rented by the night: places, guests, inventories, code for the My stay app.</p>`],
    taxis: ['Taxis', `
<p>Record your partner taxi companies. Each company receives a code for its <b>Taxi</b> app, where it manages drivers, cars and rates. When a guest asks for a taxi in My stay, the company receives the ride, accepts or refuses it, and the guest follows the arrival.</p>`],
    agences: ['Agencies, owners and portfolio', `
<p><b>Agencies</b>: your partner estate agencies. An agency can work <b>on its own account</b>, for <b>owners</b> or for <b>investment funds</b>.</p>
<p><b>Owners</b>: the owners of the properties you manage.</p>
<p><b>Portfolio</b>: in each card, give for each type of property (flats, studios, garages, parking spaces, offices, restaurants…) the quantity with the 1…10 / 10+ menu, then the exact number.</p>`],
    gerances: ['Management companies', `
<p>The property management companies you work with: contact details, buildings, portfolio. They can also get their own central under licence.</p>`],
    compta: ['Accounting, subscriptions and advertisers', `
<p><b>Accounting</b>: income and expenses, job invoices, monthly totals.</p>
<p><b>Subscriptions</b>: your clients’ subscriptions and the <b>Advertisers</b> tab (HORECA). Create an advertiser: they get a code for the <b>Ads</b> app. Their adverts arrive here for <b>approval</b> before appearing in the apps.</p>
<p>Online payment is not connected yet: the button is visible but shows “not connected”.</p>`],
    reglages: ['Settings', `
<p>Language, company details, backup: <b>Encrypted backup</b> creates an .ares file readable only with your key, <b>Readable export</b> an unencrypted JSON file, <b>Import</b> loads either. Back up regularly and keep the file off the phone. This is also where the <b>Licences</b> are.</p>`],
    licences: ['Licences', `
<p>You can give your clients (management companies, agencies, owners, hotels, Airbnb) <b>their own central</b>, separate and encrypted.</p>
<ol><li><b>Rates</b>: for each line of business, the price for one year and the discount for 2 and 3 years.</li>
<li><b>＋ Client</b>: line of business, name, phone. The client starts with a <b>fixed 15-day trial</b> and receives an access code.</li>
<li>In the client’s card, choose the <b>1, 2 or 3-year</b> package: the price changes with the package. A PDF invoice is created, marked paid or unpaid.</li>
<li>When it expires, the client’s central becomes <b>read-only</b>; you can <b>block</b> it, create new access or <b>delete</b> it (a deletion certificate is issued).</li></ol>
<p>The Licences page also shows statistics, a register and CSV export.</p>`],
    client: ['The client’s central', `
<p>The client opens their central with their code and chooses their own key. They only see the sections of their line of business, with a trial or expiry banner. They manage their properties themselves; <b>jobs</b> are still carried out by the main central: their <b>requests</b> arrive encrypted directly in your <b>Maintenance</b>.</p>`],
    appLoc: ['Tenant space app', `
<p>The tenant sees their home, rents and documents. They send a <b>repair request</b> with photos and follow its progress. They receive your messages and notices.</p>`],
    appEq: ['Team app', `
<p>The technician sees today’s jobs with address and route. They add before/after photos, get a signature and close the job: you see it at once in the central app.</p>`],
    appSejour: ['My stay app and driver page', `
<p>The hotel or Airbnb guest opens <b>My stay</b> with their code: stay, room, services, menu, messages.</p>
<p><b>Arrival</b>: they choose “on my own” or <b>taxi</b>. With a taxi they see the distance in km and the price in €, and follow the driver’s arrival time. During the stay they can book a driver.</p>
<p>The driver receives a <b>link</b> (nothing to install): “I’m on my way”, “I’m here”, “guest on board”, “arrived”. Only the arrival time is sent, never the position.</p>`],
    appTaxi: ['Taxi app', `
<p>The taxi company records its <b>drivers</b> and <b>cars</b> in three classes: <b>luxury</b>, <b>comfort</b> and <b>eco</b>, with rates (pick-up, km, hour, day) and extras (meet & greet, drinks, bodyguard…). It receives rides, accepts or refuses them and assigns the driver.</p>`],
    appAnn: ['Ads app (HORECA)', `
<p>The restaurant or bar creates its <b>adverts</b>, menus and events: text, picture, days and hours, slot, target apps and price. Each advert is sent for approval to the central app before it is shown.</p>`],
    secu: ['Security and good practice', `
<ul><li>Data is encrypted on the device; your key is never sent.</li>
<li>Never share your key; the other apps use their own codes, which you can replace at any time.</li>
<li>Make backups (Settings → Encrypted backup) and keep them off the phone; the readable export is not encrypted.</li>
<li>Only one device opens the central app: “Take over” closes the other.</li></ul>`],
  },
};
