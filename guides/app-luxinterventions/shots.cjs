// Captures de l'app LuxInterventions pour le manuel et le document à signer (FR · EN · DE).
// Avant : (cd ../.. && python3 -m http.server 8766) · puis : node shots.cjs <dossier de sortie>
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || __dirname + '/shots';
const U = 'http://localhost:8766/app.html';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // une « photo » de démonstration un peu plus jolie qu'un pixel
  const b = await chromium.launch();
  const photo = OUT + '/demo-photo.png';
  { const pg = await b.newPage({ viewport: { width: 600, height: 600 } }); await pg.setContent('<body style="margin:0;background:linear-gradient(135deg,#9fb4c8,#4d6680);height:600px;display:flex;align-items:center;justify-content:center;font:700 60px sans-serif;color:#fff">💧</body>'); await pg.screenshot({ path: photo }); await pg.close(); }
  const now = new Date(), d = (n) => new Date(now - n * 864e5).toISOString();
  const base = { statut: 'locataire', nom: 'Marie Dupont', tel: '+352 621 000 000', email: '', adresse: '12, rue des Prés, L-1234 Luxembourg', acces: '3ᵉ étage · code 1234', urg: 'jour', photos: [], via: 'wa' };
  const data = { me: { nom: 'Marie Dupont', tel: '+352 621 000 000', statut: 'locataire', adresse: '12, rue des Prés, L-1234 Luxembourg', acces: '3ᵉ étage · code 1234' }, reqs: [
    { ...base, id: 'r1', ref: 'LUX-W8BGPE', service: 'plomb', kind: 'dommage', notes: 'Fuite sous l’évier depuis ce matin.', st: 'envoyee', at: d(0) },
    { ...base, id: 'r2', ref: 'LUX-K2M9QA', service: 'serr', kind: 'devis', notes: 'Remplacer le cylindre de la porte d’entrée.', st: 'devis', at: d(3), via: 'mail', devis: { no: 'D-0042', at: d(2), name: 'devis-D-0042.pdf' } },
    { ...base, id: 'r3', ref: 'LUX-P7TR1C', service: 'elec', kind: 'devis', notes: 'Tableau électrique à remettre en conformité.', st: 'signe', at: d(8), devis: { no: 'D-0038', at: d(7), name: 'devis-D-0038.pdf', signedAt: d(6), signer: 'Marie Dupont' } },
    { ...base, id: 'r4', ref: 'LUX-Z4HN8D', service: 'toiture', kind: 'dommage', notes: 'Tuiles déplacées après la tempête.', st: 'fait', at: d(20), doneAt: d(15), avis: { stars: 5, q: { pon: 1, pro: 1, trav: 1 }, txt: 'Très bien, merci !', at: d(15) } },
  ] };
  for (const L of ['fr', 'en', 'de']) {
    const c = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 }); const p = await c.newPage();
    const shot = async (n) => { await p.waitForTimeout(450); await p.screenshot({ path: `${OUT}/${L}-${n}.png` }); };
    const go = async (h, theme = 'classique', inst = '1') => {
      await p.goto(U); await p.evaluate(([dd, l, t, i]) => { localStorage.setItem('luxapp', JSON.stringify(dd)); localStorage.setItem('luxappLang', l); localStorage.setItem('luxappTheme', t); if (i) localStorage.setItem('luxappInstHide', '1'); else localStorage.removeItem('luxappInstHide'); }, [data, L, theme, inst]);
      await p.goto(U + h); await p.reload(); await p.waitForTimeout(500);
    };
    await go(''); await shot('01-accueil');
    await go('', 'classique', ''); await p.click('details summary'); await p.waitForTimeout(3600); await shot('02-installer');
    await go('#/info/serr'); await shot('03-info-service');
    await go(''); await p.click('[data-k=plomb]'); await shot('04-etape1');
    await p.click('[data-act=next1]'); await p.waitForTimeout(300);
    await p.fill('#f-notes', L === 'de' ? 'Leck unter der Spüle seit heute Morgen.' : L === 'en' ? 'Leak under the sink since this morning.' : 'Fuite sous l’évier depuis ce matin.');
    await p.setInputFiles('[data-in=photo]', photo); await p.waitForTimeout(1500); await shot('05-etape2');
    await p.route('https://luxinterventions-hitcounter.weathered-tree-cfd3.workers.dev/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"url":"https://exemple/photo.jpg"}' }));
    await p.click('[data-act=next2]'); await p.waitForTimeout(800); await shot('06-etape3-envoi');
    await go('#/r/r1'); await p.click('[data-act=sent-pop]'); await shot('07-popup-transmise');
    await go('#/mes'); await shot('08-mes-demandes');
    await go('#/r/r1'); await shot('09-fiche-envoyee');
    await go('#/r/r2/devis'); await shot('10-devis-recu');
    await go('#/r/r2/signer');
    await p.$eval('#sig', (e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
    { const bb = await (await p.$('#sig canvas')).boundingBox(); await p.mouse.move(bb.x + 30, bb.y + 110); await p.mouse.down(); for (const [x, y] of [[70, 60], [110, 120], [150, 50], [190, 115], [240, 70], [290, 100]]) await p.mouse.move(bb.x + x, bb.y + y, { steps: 6 }); await p.mouse.up(); }
    await shot('11-signature');
    await go('#/r/r3'); await p.evaluate(() => window.scrollTo(0, 99999)); await shot('12-fait');
    await go('#/r/r1/avis'); await p.click('[data-avis=stars] [data-v="5"]'); await p.click('[data-avis=pon] [data-v="1"]'); await shot('13-avis');
    await p.evaluate(() => window.scrollTo(0, 99999)); await shot('14-cloturer');
    await go('#/infos'); await shot('15-infos');
    await go('#/legal'); await shot('16-legal');
    await go('#/moi'); await p.evaluate(() => window.scrollTo(0, 150)); await shot('17-moi-themes');
    await go('', 'nuit'); await shot('18-theme-nuit');
    await go('', 'prestige'); await shot('19-theme-prestige');
    await c.close();
    console.log(L, 'ok');
  }
  await b.close();
})();
