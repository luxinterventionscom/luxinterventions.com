// Tour des poubelles : qui sort les poubelles à chaque collecte (même calcul dans l'app de gestion et l'app des locataires).
// order : ordre des habitants ; events : collectes ; msgs : messages du fil (prendre / ne peux pas / fait) ;
// log : tours déjà mémorisés ; un oubli fait repasser la personne au tour suivant, un remplacement est « dû ».
export function binPlan(order, events, msgs, log, evalFrom, now) {
  const n = order.length, pen = [], owed = {}, out = [];
  let shift = 0;
  for (const e of events) {
    let who, extra = false;
    if (pen.length) { who = pen.shift(); extra = true; shift++; } else {
      who = order[(((e.k - shift) % n) + n) % n];
      const o = owed[who];
      if (o && o.length) who = o.shift();
    }
    let done = '', cant = '', forgot = false;
    const lg = log && log[e.p];
    if (lg) { who = lg.w || who; done = lg.d || ''; forgot = !!lg.f; } else {
      for (const m of (msgs || []).filter((x) => x.k === 'bin' && x.d === e.p)) {
        if (m.act === 'take') { who = m.m; cant = ''; }
        if (m.act === 'cant') cant = m.m;
        if (m.act === 'done' || m.act === 'instead') done = m.m;
      }
      forgot = !done && e.d < now && msgs != null && e.p >= evalFrom;
    }
    if (forgot) pen.push(who);
    if (done && done !== who) (owed[done] ||= []).push(who);
    out.push({ ...e, who, extra, done, cant, forgot });
  }
  return out;
}
