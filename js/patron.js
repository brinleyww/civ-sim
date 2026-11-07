'use strict';
// Patron mode: the player champions one realm and steers it with edicts paid for in Favour, which the realm earns by growing,
// holding together and winning. The simulation still runs the realm; edicts nudge it through the same machinery it uses itself.
// All state is plain data in W.patron (ids, not object references). patronYear runs once a year from yearlyWorld (people.js).

const PAT_FAV_MAX = 150, PAT_HIST = 40;
const patEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const patFmt = n => Math.round(n).toLocaleString('en-US');
const patYr = () => Math.floor(year());
const patD = (a, b) => Math.hypot(wdx(a.x, b.x), a.y - b.y);
const patPol = () => W.patron && W.patron.pol >= 0 ? W.polities[W.patron.pol] : null;
const patLive = pol => !!pol && pol.alive && pol.towns > 0 && pol.pop > 0;
const patTowns = pol => W.towns.filter(t => t.alive && t.polity === pol);
const patHome = pol => (pol.capital && pol.capital.alive && pol.capital.polity === pol) ? pol.capital : patTowns(pol).sort((a, b) => tn(b) - tn(a))[0] || null;
let patFail = '';
const patSay = msg => { patFail = msg; if (typeof toast === 'function') toast(msg, 3200); };
function patNote(txt) { const P = W.patron; P.hist.push({ y: patYr(), t: txt }); if (P.hist.length > PAT_HIST) P.hist.shift(); }
function patUnrest(pol) { let s = 0, n = 0; for (const t of W.towns) if (t.polity === pol) { const k = tn(t); s += (t.unrest || 0) * k; n += k; } return n ? s / n : 0; }
// great works: the tourist sights the towns have built, and any wonders from js/wonders.js
function patWorks(pol) {
  let c = 0;
  const ids = new Set();
  for (const t of W.towns) if (t.polity === pol) { ids.add(t.id); for (const k of TOURIST_BLDS) c += t.count[k] || 0; }
  const L = Array.isArray(W.wonders) ? W.wonders : W.wonders && typeof W.wonders === 'object' ? Object.values(W.wonders) : [];
  for (const w of L) if (w && w.st === 1) { const k = typeof wnKeeper === 'function' ? wnKeeper(w) : null; if (k ? k.polity === pol : ids.has(w.tw)) c += 3; }
  return c;
}

// ---- choosing a realm ----
function patronChoose(id) {
  const pol = W.polities[id];
  if (!patLive(pol)) return false;
  const old = W.patron;
  W.patron = { pol: id, since: patYr(), fav: old && old.pol >= 0 ? Math.min(40, Math.round((old.fav || 0) / 2)) : 25, gain: 0, cd: {}, hold: {}, amb: [], legacy: old ? old.legacy || 0 : 0, legList: old ? (old.legList || []).slice(-30) : [],
    hist: old ? (old.hist || []).slice(-10) : [], wins: 0, losses: 0, y: -1, era: pol.era || 0, conq: pol.conquests || 0, tids: [], wk: [], fell: null, realms: (old ? old.realms || 0 : 0) + 1 };
  patNote(`Became patron of ${polityTitle(pol)}.`);
  patTids(W.patron, pol);
  patAmbFill(W.patron, pol);
  return true;
}
function patTids(P, pol) { P.tids = patTowns(pol).sort((a, b) => tn(b) - tn(a)).slice(0, 80).map(t => t.id); }
// whoever holds most of what the fallen realm held: its conqueror, or the rising that took its place
function patHeirs(P) {
  const ids = new Set(P.tids || []), n = {};
  for (const t of W.towns) if (ids.has(t.id) && t.alive && patLive(t.polity)) n[t.polity.id] = (n[t.polity.id] || 0) + tn(t);
  return Object.keys(n).map(Number).sort((a, b) => n[b] - n[a]).slice(0, 3);
}

// ---- ambitions: three at a time; meeting one earns Favour and goes into the Legacy ----
const PAT_AMB = {
  age: { yrs: 80, rew: 40, can: pol => (pol.era || 0) < ERAS.length - 1, mk: pol => ({ need: (pol.era || 0) + 1 }), txt: a => `Reach the ${ERAS[a.need]}`, now: pol => ERAS[pol.era || 0], ok: (pol, a) => (pol.era || 0) >= a.need },
  pop: { yrs: 40, rew: 25, can: () => true, mk: pol => ({ need: Math.max(pol.pop + 60, Math.round(pol.pop * 1.4 / 10) * 10) }), txt: a => `Grow to ${patFmt(a.need)} people`, now: pol => patFmt(pol.pop), ok: (pol, a) => pol.pop >= a.need },
  towns: { yrs: 40, rew: 25, can: () => true, mk: pol => ({ need: pol.towns + 2 }), txt: a => `Rule ${a.need} towns`, now: pol => pol.towns, ok: (pol, a) => pol.towns >= a.need },
  take: { yrs: 40, rew: 30, can: () => true, mk: pol => ({ need: (pol.conquests || 0) + 1 }), txt: () => 'Take a town in war', ok: (pol, a) => (pol.conquests || 0) >= a.need },
  win: { yrs: 50, rew: 35, can: () => true, mk: (pol, P) => ({ need: P.wins + 1 }), txt: () => 'Win a war', ok: (pol, a, P) => P.wins >= a.need },
  port: { yrs: 40, rew: 20, can: pol => !W.towns.some(t => t.polity === pol && t.portLv >= 1) && W.towns.some(t => t.polity === pol && t.near && t.near.coast > 0), mk: () => ({}), txt: () => 'Own a working harbour', ok: pol => W.towns.some(t => t.polity === pol && t.portLv >= 1) },
  work: { yrs: 60, rew: 40, can: () => true, mk: pol => ({ need: patWorks(pol) + 1 }), txt: () => 'Raise a great work', ok: (pol, a) => patWorks(pol) >= a.need },
  plague: { yrs: 60, rew: 25, can: () => true, mk: () => ({}), txt: a => a.py ? `Come through the plague of ${a.py}` : 'Come through a plague', ok: (pol, a) => {
    if (!a.py) { for (const t of W.towns) if (t.polity === pol && t.lastPlague > a.y0) { a.py = Math.floor(t.lastPlague); break; } return false; }
    return patYr() >= a.py + 5; } },
  peace: { yrs: 35, rew: 25, can: () => true, mk: () => ({ need: 20, calm: 0 }), txt: a => `Keep the peace for ${a.need} years`, now: (pol, a) => `${a.calm} so far`, ok: (pol, a) => { a.calm = Object.keys(pol.warsWith).length ? 0 : a.calm + 1; return a.calm >= a.need; } },
  techs: { yrs: 40, rew: 25, can: () => true, mk: pol => ({ need: pol.techs + Math.max(12, Math.round(pol.techs * 0.12)) }), txt: a => `Know ${patFmt(a.need)} inventions`, now: pol => patFmt(pol.techs), ok: (pol, a) => pol.techs >= a.need },
  stable: { yrs: 30, rew: 20, can: pol => pol.stab < 70, mk: () => ({ need: 80 }), txt: a => `Bring stability up to ${a.need}`, now: pol => Math.round(pol.stab), ok: (pol, a) => pol.stab >= a.need },
  ally: { yrs: 40, rew: 20, can: pol => !pol.allies.length, mk: () => ({}), txt: () => 'Win an ally', ok: pol => pol.allies.length > 0 },
  rich: { yrs: 30, rew: 20, can: pol => pol.cur.kind >= 2 && pol.cur.gdp > 0, mk: pol => ({ need: Math.round(Math.max(pol.cur.treasury * 2, pol.cur.gdp * 0.25, 100)) }), txt: (a, pol) => `Fill the treasury with ${fmtMoney(a.need)} ${pol ? pol.cur.name + 's' : ''}`, now: pol => fmtMoney(Math.max(0, pol.cur.treasury)), ok: (pol, a) => pol.cur.treasury >= a.need },
};
function patAmbFill(P, pol) {
  const yr = patYr();
  while (P.amb.length < 3) {
    const have = new Set(P.amb.map(a => a.k)), opts = Object.keys(PAT_AMB).filter(k => !have.has(k) && k !== P.lastAmb && PAT_AMB[k].can(pol, P));
    if (!opts.length) break;
    const k = pick(opts), A = PAT_AMB[k];
    P.amb.push(Object.assign({ k, y0: yr, by: yr + A.yrs, rew: A.rew }, A.mk(pol, P)));
  }
}
function patAmbYear(P, pol) {
  const yr = patYr();
  for (let q = P.amb.length - 1; q >= 0; q--) {
    const a = P.amb[q], A = PAT_AMB[a.k];
    if (!A) { P.amb.splice(q, 1); continue; }
    if (A.ok(pol, a, P)) {
      const txt = A.txt(a, pol);
      P.fav = Math.min(PAT_FAV_MAX, P.fav + a.rew); P.legacy += a.rew;
      P.legList.push({ y: yr, t: `${txt} (${pol.name})`, v: a.rew }); if (P.legList.length > 40) P.legList.shift();
      patNote(`Ambition met: ${txt}. +${a.rew} Favour.`);
      if (pol.capital && pol.pop >= 60) chronT('gov', `${pol.name} fulfils a great ambition: ${txt.charAt(0).toLowerCase() + txt.slice(1)}.`, pol.capital);
      P.amb.splice(q, 1); P.lastAmb = a.k;
    } else if (yr > a.by) { patNote(`Ambition missed: ${A.txt(a, pol)}.`); P.amb.splice(q, 1); P.lastAmb = a.k; }
  }
  patAmbFill(P, pol);
}

// ---- the yearly update ----
function patronYear() {
  const P = W.patron;
  if (!P || P.pol < 0 || P.fell) return;
  const yr = patYr();
  if (P.y === yr) return;
  P.y = yr;
  const pol = W.polities[P.pol];
  if (!patLive(pol)) {
    P.fell = { y: yr, name: pol ? pol.name : '?', heirs: patHeirs(P) };
    patNote(`${P.fell.name} has fallen.`);
    patSay(`Your realm, ${P.fell.name}, has fallen.`);
    return;
  }
  patTids(P, pol);
  // what went well, or badly, this year
  let wins = 0, losses = 0;
  const wk = new Set(P.wk);
  for (let k = W.warLog.length - 1; k >= 0; k--) {
    const e = W.warLog[k];
    if (e.to < yr - 2) break;
    const key = e.name + '|' + e.from + '|' + e.to;
    if (wk.has(key)) continue;
    if (!(e.sideA.split(', ').includes(pol.name) || e.sideB.split(', ').includes(pol.name))) continue;
    P.wk.push(key); if (P.wk.length > 30) P.wk.shift();
    if (e.winner === pol.name) { wins++; P.wins++; patNote(`Won the ${e.name}.`); }
    else if (e.winner) { losses++; P.losses++; patNote(`Lost the ${e.name}.`); }
  }
  const conq = Math.max(0, (pol.conquests || 0) - P.conq); P.conq = pol.conquests || 0;
  const eraUp = Math.max(0, (pol.era || 0) - P.era); P.era = Math.max(P.era, pol.era || 0);
  if (eraUp) patNote(`${pol.name} enters the ${ERAS[pol.era]}.`);
  const base = (1 + Math.sqrt(pol.pop) / 5 + Math.min(pol.towns, 30) * 0.2) * (0.6 + clamp(pol.stab, 0, 100) / 125);
  P.gain = clamp(base + wins * 8 + conq * 3 + eraUp * 10 - losses * 2, 0, 25);
  P.fav = Math.min(PAT_FAV_MAX, P.fav + P.gain);
  patHolds(P, pol, yr);
  patAmbYear(P, pol);
}
// edicts that last: kept up once a year until they run out
function patHolds(P, pol, yr) {
  const H = P.hold;
  for (const k in H) if (H[k].until < yr) { delete H[k]; patNote(`${PAT_HOLD_NAME[k] || k} comes to an end.`); }
  if (H.tax && pol.cur.kind >= 2) pol.cur.tax = H.tax.v;
  if (H.mob) pol.mob = Math.max(pol.mob || 0, H.mob.v);
  if (H.fest) for (const t of W.towns) if (t.polity === pol) t.unrest = (t.unrest || 0) * 0.6;
  if (H.focus) patFocusPush(pol, H.focus.b, 0.14);
}
const PAT_HOLD_NAME = { tax: 'The tax decree', mob: 'The levy', fest: 'The festival', focus: 'The research focus' };
// a push on the open ideas of one line of invention, in every town of the realm (society.js tryInvent finishes them)
function patFocusPush(pol, b, f) {
  const Bq = BRANCHES[b]; if (!Bq) return 0;
  const S = Bq._ixs || (Bq._ixs = new Set(Bq.ids.map(id => TECH_IX[id])));
  let n = 0;
  for (const t of W.towns) {
    if (t.polity !== pol || !t.alive || t.nomad) continue;
    const F = techCache(t).front, open = [];
    for (let k = 0; k < F.length; k++) { const i = F[k]; if (S.has(i) && !t.tech[i] && eligible(t, TECHS[i])) open.push(TECHS[i]); }
    open.sort((x, y) => x.diff - y.diff);
    for (let k = 0; k < Math.min(2, open.length); k++) { const T = open[k]; t.prog[T.ix] += inventCost(t, T) * f; n++; }
  }
  return n;
}

// ---- edicts ----
const patWarsOf = pol => [...new Set(Object.values(pol.warsWith))];
function patNeighbours(pol, peace) {
  const mine = W.towns.filter(t => t.polity === pol && !t.nomad), best = {};
  for (const o of W.towns) {
    const q = o.polity;
    if (q === pol || !patLive(q) || o.nomad) continue;
    if (peace === 'peace' ? atWar(pol, q) : false) continue;
    let d = 1e9; for (const t of mine) { const v = patD(t, o); if (v < d) d = v; }
    if (d < 90 && (!best[q.id] || d < best[q.id].d)) best[q.id] = { q, d, o };
  }
  return Object.values(best).sort((a, b) => a.d - b.d).slice(0, 10);
}
const patRelTxt = (pol, q) => typeof relLabel === 'function' ? relLabel(pol, q)[0] : '';
const PAT_EDICTS = [
  { id: 'war', name: 'Declare war', cost: 35, cd: 15, about: 'March on a neighbour. The realm’s own generals fight it.',
    need: pol => !pol.settled ? 'A people with no settled towns can’t wage a war of conquest.' : '',
    targets: pol => patNeighbours(pol).filter(r => !atWar(pol, r.q)).map(r => ({ v: r.q.id, label: r.q.name, sub: `${patFmt(r.q.pop)} people · ${patRelTxt(pol, r.q)}${areAllies(pol, r.q) ? ' · your ally!' : ''}`, col: r.q.color })),
    act: (pol, P, v) => {
      const foe = W.polities[+v]; if (!patLive(foe) || atWar(pol, foe)) return false;
      let home = null, tgt = null, bd = 1e9;
      for (const a of W.towns) { if (a.polity !== pol || a.nomad || a.occupier || a.attack || tn(a) < 20) continue; for (const o of W.towns) { if (o.polity !== foe) continue; const d = patD(a, o); if (d < bd) { bd = d; home = a; tgt = o; } } }
      if (!tgt) for (const o of W.towns) if (o.polity === foe) { tgt = o; break; }
      const g = typeof grievances === 'function' ? grievances(pol).find(r => r.foe === foe) : null;
      pol.truce[foe.id] = 0; foe.truce[pol.id] = 0; pol.warCool = 0;
      const war = startWar(pol, foe, g && GOALS[g.why] ? g.why : 'land', home, tgt);
      if (!war) return false;
      pol.infamy = (pol.infamy || 0) + 3;
      return `War with ${foe.name}: the ${war.name}.`;
    } },
  { id: 'peace', name: 'Sue for peace', cost: 25, cd: 10, about: 'Send envoys to end a war. Terms follow how the war stands.',
    need: pol => patWarsOf(pol).length ? '' : 'The realm is at peace.',
    targets: pol => patWarsOf(pol).map(w => { const bal = (w.balance || 0) * (w.a.includes(pol) ? 1 : -1); return { v: w.id, label: w.name, sub: bal > 12 ? 'we are winning' : bal < -12 ? 'we are losing' : 'nobody is winning', col: bal > 12 ? 'var(--green)' : bal < -12 ? 'var(--red)' : 'var(--ink3)' }; }),
    act: (pol, P, v) => {
      const w = W.wars.find(x => x.id === +v); if (!w || w.ended) return false;
      const side = w.a.includes(pol) ? 'a' : 'b', lead = side === 'a' ? w.leadA : w.leadB, bal = (w.balance || 0) * (side === 'a' ? 1 : -1);
      if (lead === pol || w.cause === 'revolt') endWar(w, bal > 12 ? side : bal < -12 ? (side === 'a' ? 'b' : 'a') : null, 'treaty');
      else { const foes = side === 'a' ? w.b : w.a; dropFromWar(pol, w); for (const q of foes) { pol.truce[q.id] = q.truce[pol.id] = patYr() + 15; } }
      if (pol.capital) chronT('war', `${pol.name} sues for peace, and the ${w.name} is over for it.`, pol.capital);
      return `Peace: the ${w.name} is over for ${pol.name}.`;
    } },
  { id: 'levy', name: 'Raise the levies', cost: 20, cd: 12, about: 'Call up the able-bodied for six years. Bigger hosts, and a host marches at once if at war. People grumble.',
    need: pol => !pol.settled ? 'There are no settled towns to raise men from.' : '',
    act: (pol, P) => {
      const yr = patYr();
      P.hold.mob = { v: 0.75, until: yr + 5 }; pol.mob = Math.max(pol.mob || 0, 0.75);
      for (const a of W.armies) if (a.pol === pol) a.morale = Math.min(100, a.morale + 8);
      pol.stab = clamp(pol.stab - 3, 0, 100); if (pol.soc) pol.soc.appr[E_PEA] = clamp(pol.soc.appr[E_PEA] - 6, 0, 100);
      let raised = '';
      const w = patWarsOf(pol)[0];
      if (w) {
        const foes = w.a.includes(pol) ? w.b : w.a;
        let home = null, tgt = null, bd = 1e9;
        for (const a of W.towns) { if (a.polity !== pol || a.nomad || a.occupier || a.attack || tn(a) < 25) continue; for (const o of W.towns) { if (!foes.includes(o.polity) || W.landId[o.i] !== W.landId[a.i]) continue; const d = patD(a, o); if (d < bd) { bd = d; home = a; tgt = o; } } }
        if (home && raiseArmy(home, tgt, w, 'conquer')) raised = ` A host marches from ${home.name} on ${tgt.name}.`;
      }
      if (pol.capital) chronT('war', `${pol.name} calls up its levies. Every village sends its young men.${raised}`, pol.capital);
      return `The levies are called up.${raised}`;
    } },
  { id: 'focus', name: 'Research focus', cost: 30, cd: 20, about: 'For fifteen years, scholars across the realm push on one line of invention.',
    need: pol => !pol.settled ? 'Wanderers have no schools to direct.' : '',
    targets: () => BRANCHES.map((b, i) => ({ v: i, label: b.name, sub: b.about, col: b.col })),
    act: (pol, P, v) => {
      const b = +v; if (!BRANCHES[b]) return false;
      P.hold.focus = { b, until: patYr() + 14 };
      patFocusPush(pol, b, 0.2);
      return `Scholars of ${pol.name} turn to ${BRANCHES[b].name.toLowerCase()}.`;
    } },
  { id: 'taxdown', name: 'Lower taxes', cost: 15, cd: 10, about: 'Cut the tax rate for eight years. Glad people, a thinner treasury.',
    need: pol => pol.cur.kind < 2 ? 'There is no coin to tax yet.' : pol.cur.tax <= 0.04 ? 'Taxes are already as low as they go.' : '',
    act: (pol, P) => {
      const v = Math.max(0.03, pol.cur.tax - 0.06);
      P.hold.tax = { v, until: patYr() + 7 }; pol.cur.tax = v;
      for (const t of W.towns) if (t.polity === pol) t.unrest = (t.unrest || 0) * 0.7;
      if (pol.soc) { pol.soc.appr[E_PEA] = clamp(pol.soc.appr[E_PEA] + 10, 0, 100); pol.soc.appr[E_BUR] = clamp(pol.soc.appr[E_BUR] + 8, 0, 100); }
      pol.stab = clamp(pol.stab + 3, 0, 100);
      return `Taxes in ${pol.name} fall to ${Math.round(v * 100)}%.`;
    } },
  { id: 'taxup', name: 'Raise taxes', cost: 10, cd: 10, about: 'Raise the tax rate for eight years, and collect a levy now. People resent it.',
    need: pol => pol.cur.kind < 2 ? 'There is no coin to tax yet.' : '',
    act: (pol, P) => {
      const v = Math.min(0.48, pol.cur.tax + 0.06), extra = Math.max(0, pol.cur.gdp || 0) * 0.05;
      P.hold.tax = { v, until: patYr() + 7 }; pol.cur.tax = v; pol.cur.treasury += extra;
      for (const t of W.towns) if (t.polity === pol) t.unrest = Math.min(100, (t.unrest || 0) + 8);
      if (pol.soc) { pol.soc.appr[E_PEA] = clamp(pol.soc.appr[E_PEA] - 8, 0, 100); pol.soc.appr[E_BUR] = clamp(pol.soc.appr[E_BUR] - 8, 0, 100); }
      pol.stab = clamp(pol.stab - 3, 0, 100);
      return `Taxes in ${pol.name} rise to ${Math.round(v * 100)}%${extra > 0 ? `, and ${fmtMoney(extra)} ${pol.cur.name}s come in at once` : ''}.`;
    } },
  { id: 'fest', name: 'Great festival', cost: 20, cd: 12, about: 'Feasts, games and processions. Calmer streets for three years; the capital pays in food and goods.',
    act: (pol, P) => {
      const cap0 = patHome(pol); if (!cap0) return false;
      cap0.stock[R.FOOD] *= 0.85; cap0.stock[R.GOODS] *= 0.85;
      for (const t of W.towns) if (t.polity === pol) t.unrest = (t.unrest || 0) * 0.3;
      P.hold.fest = { until: patYr() + 2 };
      pol.stab = clamp(pol.stab + 6, 0, 100); pol.support = clamp((pol.support || 60) + 10, 0, 100);
      if (pol.soc) { pol.soc.legit = clamp(pol.soc.legit + 4, 0, 100); for (let e = 0; e < 6; e++) pol.soc.appr[e] = clamp(pol.soc.appr[e] + 5, 0, 100); }
      chronT('misc', `A great festival fills the streets of ${cap0.name}: feasting, games and processions for days on end.`, cap0);
      return `A great festival in ${cap0.name}.`;
    } },
  { id: 'colony', name: 'Found a colony', cost: 30, cd: 12, about: 'Send settlers out from the capital to empty land in the direction you choose. They stay loyal.',
    need: pol => { const h = patHome(pol); return !h || h.nomad ? 'There is no settled capital to send settlers from.' : tn(h) < 16 ? `${h.name} is too small to spare settlers.` : ''; },
    targets: () => [['n', 'North'], ['e', 'East'], ['s', 'South'], ['w', 'West']].map(([v, l]) => ({ v, label: l, sub: 'from the capital' })),
    act: (pol, P, v) => patColony(pol, v) },
  { id: 'work', name: 'Fund a great work', cost: 40, cd: 25, about: 'Pour the realm’s wealth into a wonder at the capital.',
    hide: () => typeof wonderFund !== 'function',
    act: pol => {
      const cap0 = patHome(pol); if (!cap0 || typeof wonderFund !== 'function') return false;
      const r = wonderFund(cap0);
      if (r === false || r === null || r === undefined) return false;
      return typeof r === 'string' ? r : `${cap0.name} begins a great work.`;
    } },
  { id: 'crack', name: 'Crack down', cost: 25, cd: 12, about: 'Troops in the streets: unrest is crushed, risings put down harder, and towns slow to rebel again. Legitimacy suffers.',
    act: pol => {
      const yr = year();
      for (const t of W.towns) if (t.polity === pol) { t.unrest = Math.min(t.unrest || 0, 8); t.crushed = yr; }
      let hit = 0;
      for (const w of W.wars) if (w.cause === 'revolt' && w.a.includes(pol)) { w.scoreA += 10; hit++; for (const a of W.armies) if (a.pol === pol && a.war === w) a.morale = Math.min(100, a.morale + 15); }
      pol.stab = clamp(pol.stab + 5, 0, 100);
      if (pol.soc) { const s = pol.soc; s.press *= 0.4; s.legit = clamp(s.legit - 6, 0, 100); s.appr[E_PEA] = clamp(s.appr[E_PEA] - 8, 0, 100); s.appr[E_WOR] = clamp(s.appr[E_WOR] - 8, 0, 100); s.appr[E_OFF] = clamp(s.appr[E_OFF] + 6, 0, 100); }
      if (pol.capital) chronT('war', `${pol.name} sends soldiers into its own streets. Agitators are hanged and meetings broken up${hit ? ', and the war on the rebels is pressed without mercy' : ''}.`, pol.capital);
      return `Order is restored in ${pol.name}${hit ? ' and the rebels are hard pressed' : ''}.`;
    } },
  { id: 'pact', name: 'Trade pact', cost: 15, cd: 10, about: 'Open the borders to a neighbour: no duties on trade, a pledge not to fight for twenty years, warmer relations.',
    need: pol => govSt(pol) < 1 ? 'A band has nobody to sign treaties.' : '',
    targets: pol => patNeighbours(pol, 'peace').filter(r => !(pol.cur.pacts && pol.cur.pacts[r.q.id])).map(r => ({ v: r.q.id, label: r.q.name, sub: `${patFmt(r.q.pop)} people · ${patRelTxt(pol, r.q)}`, col: r.q.color })),
    act: (pol, P, v) => {
      const q = W.polities[+v]; if (!patLive(q) || atWar(pol, q)) return false;
      if (relOf(pol, q) < -40) { patSay(`${q.name} will not even receive your envoys.`); return false; }
      const Y = patYr();
      (pol.cur.pacts || (pol.cur.pacts = {}))[q.id] = Y; (q.cur.pacts || (q.cur.pacts = {}))[pol.id] = Y;
      pol.known[q.id] = 1; q.known[pol.id] = 1;
      if (pol.soc && q.soc && !hasTreaty(pol, 'nap', q)) addTreaty(pol, q, 'nap', Y + 20);
      pol.truce[q.id] = Math.max(pol.truce[q.id] || 0, Y + 20); q.truce[pol.id] = Math.max(q.truce[pol.id] || 0, Y + 20);
      adjustRel(pol, q, 20);
      if (pol.capital) chronT('gov', `${pol.name} and ${q.name} open their borders to each other: free trade, and a pledge of peace for twenty years.`, pol.capital);
      return `A trade pact with ${q.name}.`;
    } },
  { id: 'general', name: 'Raise a great general', cost: 25, cd: 15, about: 'A brave, gifted young soldier at the capital, who will lead the next host the realm sends out.',
    act: (pol, P) => {
      const t = patHome(pol); if (!t) return false;
      const ok = t.members.filter(p => p.alive && !p.army && !p.btl && !p.aboard && !p.leader && ageOf(p) >= 17 && ageOf(p) <= 40);
      if (!ok.length) { patSay(`Nobody in ${t.name} is fit to lead.`); return false; }
      const best = ok.filter(p => p.job === J.SOLDIER || hasTrait(p, 'brave')), c = pick(best.length ? best : ok);
      for (const id of ['brave', 'charismatic', 'warhero', pick(['strong', 'tough', 'swift'])]) forceTrait(c, id);
      c.fame += 30; c.xp = Math.max(c.xp || 0, 50);
      if (c.job !== J.SOLDIER && c.job > J.ELDER) { t.jobs[c.job]--; c.job = J.SOLDIER; t.jobs[J.SOLDIER]++; c.skill = 0; }
      plog(c, `Raised up by the crown of ${pol.name} to lead its armies.`);
      P.gen = { id: c.id, name: c.name };
      chronT('gov', `${c.name} of ${t.name} is given command of the armies of ${pol.name}: young, fearless, and followed without question.`, t);
      return `${c.name} will lead the armies of ${pol.name}.`;
    } },
  { id: 'gov', name: 'Change government', cost: 45, cd: 30, about: 'Proclaim a new form of government. Stability and legitimacy take a blow while it settles.',
    need: pol => !pol.settled ? 'Wanderers have no government to change.' : '',
    targets: pol => patGovs(pol).map(g => ({ v: g.id, label: g.name, sub: g.about })),
    act: (pol, P, v) => {
      if (!patGovs(pol).some(g => g.id === v) || !pol.capital) return false;
      setGov(pol, v, `By decree, ${pol.name} becomes a ${GOV[GOV_IX[v]].name.toLowerCase()}. The ${GOV[GOV_IX[v]].name} is proclaimed at ${pol.capital.name}.`);
      const s = pol.soc;
      if (s) { const Y = patYr(); for (const [l, w0] of REGIME_LAWS[v] || []) { let w = w0; while (w > 0 && !lawOpen(pol, l, w)) w--; if (lawOpen(pol, l, w)) setLaw(pol, s, l, w, Y, false); } s.legit = clamp(s.legit - 10, 0, 100); }
      pol.stab = clamp(pol.stab - 8, 0, 100);
      return `${pol.name} is now a ${GOV[pol.gov].name.toLowerCase()}.`;
    } },
  { id: 'faith', name: 'State religion', cost: 30, cd: 25, about: 'Make one faith the realm’s own. The capital and most towns take it up; some resent it.',
    need: pol => patFaiths(pol).length ? '' : 'No faith is practised in the realm yet.',
    targets: pol => patFaiths(pol).map(([F, n]) => ({ v: F.id, label: F.name, sub: `the way of ${F.kind} · ${patFmt(n)} followers here`, col: F.color })),
    act: (pol, P, v) => {
      const F = W.faiths && W.faiths[+v]; if (!F) return false;
      let won = 0;
      for (const t of W.towns) {
        if (t.polity !== pol || t.faith === F.id) continue;
        if (t === pol.capital || t.faith < 0 || rnd() < 0.6) { if (t.faith >= 0) t.unrest = Math.min(100, (t.unrest || 0) + 6); t.faith = F.id; recomputeMods(t); won++; }
      }
      F.fervor = Math.min(1.5, (F.fervor || 1) + 0.15);
      if (pol.soc) pol.soc.legit = clamp(pol.soc.legit + 4, 0, 100);
      if (pol.capital) chronT('gov', `${F.name} is proclaimed the faith of ${pol.name}${won ? `, and ${won} town${won === 1 ? '' : 's'} turn${won === 1 ? 's' : ''} to it` : ''}.`, pol.capital);
      return `${F.name} is the faith of ${pol.name}.`;
    } },
];
const PAT_EDICT = {}; PAT_EDICTS.forEach(e => { PAT_EDICT[e.id] = e; });
function patGovs(pol) {
  const st = govSt(pol), e = pol.era || 0;
  return GOV.filter(g => g.ix !== pol.gov && g.st >= 1 && g.st >= st - 1 && (g.st <= st || (g.st === st + 1 && e >= g.st - 1)));
}
function patFaiths(pol) {
  if (!W.faiths) return [];
  const n = {};
  for (const t of W.towns) if (t.polity === pol && t.faith >= 0 && W.faiths[t.faith]) n[t.faith] = (n[t.faith] || 0) + tn(t);
  return Object.keys(n).map(Number).sort((a, b) => n[b] - n[a]).slice(0, 6).map(k => [W.faiths[k], n[k]]);
}
// settlers through the same founding as any colony (society.js tryColonize), aimed one way and kept loyal (as main.js migrate)
function patColony(pol, dir) {
  const t = patHome(pol), D = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }[dir];
  if (!t || !D || tn(t) < 16 || t.members.length < 8) return false;
  const inDir = (o, s) => { const dx = wdx(o.x, s % W.w), dy = ((s / W.w) | 0) - o.y, d = Math.hypot(dx, dy) || 1; return (dx * D[0] + dy * D[1]) / d > 0.45; };
  const n0 = W.towns.length, cp = colonyPush, fs0 = findSite, was = t.moved, why = t.pushWhy, since = t.sinceColony;
  colonyPush = () => 2; t.moved = -999; t.sinceColony = 0;
  try {
    for (let q = 0; q < 6 && W.towns.length === n0; q++) {
      t.pushWhy = q < 2 ? '' : 'land';
      const wide = q >= 3;
      findSite = (o, mn, mx, nm) => { for (let k = 0; k < 8; k++) { const s = wide ? fs0(o, mn, Math.max(mx, 110), true) : fs0(o, mn, mx, nm); if (s >= 0 && inDir(o, s)) return s; } return -1; };
      nodeBudget = Math.max(nodeBudget, 30000);
      tryColonize(t);
    }
  } finally { colonyPush = cp; findSite = fs0; t.pushWhy = why; if (W.towns.length === n0) { t.moved = was; t.sinceColony = since; } }
  const nt = W.towns.length > n0 ? W.towns[W.towns.length - 1] : null;
  if (!nt) { patSay(`The settlers of ${t.name} find no land that way.`); return false; }
  if (nt.polity !== pol) transferTown(nt, pol);  // under the crown's charter: the realm left behind has no towns, and is gone next year
  if (W.landId[nt.i] === W.landId[t.i]) {
    const more = Math.min(20, Math.floor(t.members.length * 0.08));
    for (let q = 0, moved = 0; q < t.members.length * 2 && moved < more && t.members.length > 8; q++) {
      const p = t.members[rint(t.members.length)];
      if (!p || p.army || p.btl || p.aboard || p.leader || ageOf(p) < 15 || ageOf(p) > 55) continue;
      moveTo(p, nt); startMigrate(p, nearTile(nt.i, 3)); moved++;
    }
    planJobs(t); planJobs(nt);
  }
  updateTerritory();
  chronT('found', `By charter of the ${polityTitle(pol)}, settlers from ${t.name} found ${nt.name}.`, nt);
  return `Settlers from ${t.name} found ${nt.name}.`;
}
// what stands in the way of an edict right now ('' when nothing)
function patBlock(e, pol, P) {
  const yr = patYr();
  if ((P.cd[e.id] || 0) > yr) return `Ready in ${P.cd[e.id] - yr} year${P.cd[e.id] - yr === 1 ? '' : 's'}.`;
  if (P.fav < e.cost) return `Needs ${e.cost} Favour.`;
  const r = e.need ? e.need(pol, P) : '';
  if (r) return r;
  if (e.targets && !e.targets(pol, P).length) return 'Nobody to direct it at.';
  return '';
}
function patronIssue(id, v) {
  const P = W.patron, pol = patPol(), e = PAT_EDICT[id];
  if (!P || !e || !patLive(pol) || P.fell || (e.hide && e.hide())) return { ok: false, msg: 'Not possible.' };
  const why = patBlock(e, pol, P);
  if (why) return { ok: false, msg: why };
  if (e.targets && !e.targets(pol, P).some(x => String(x.v) === String(v))) return { ok: false, msg: 'Choose a target.' };
  patFail = '';
  const r = e.act(pol, P, v);
  if (!r) return { ok: false, msg: (patFail ? patFail + ' ' : 'Nothing came of it. ') + 'No Favour spent.' };
  P.fav -= e.cost; P.cd[e.id] = patYr() + e.cd;
  patNote(`${e.name}: ${r}`);
  return { ok: true, msg: r };
}

// ---- the panel ----
const PUI = { pick: null, choosing: false, press: false, el: null };
function patMark(p) { return W && W.patron && W.patron.pol === p.id && !W.patron.fell ? '<span class="patCrown" title="The realm you champion">♛</span> ' : ''; }
function patSelPol() {
  if (typeof Render === 'undefined' || !Render.sel) return null;
  const s = Render.sel, o = s.obj;
  const p = s.kind === 'pol' ? o : s.kind === 'town' ? o.polity : s.kind === 'person' ? o.town && o.town.polity : s.kind === 'ship' ? o.pol : null;
  return patLive(p) ? p : null;
}
function patChooserHTML(P) {
  const sel = patSelPol(), list = W.polities.filter(patLive).sort((a, b) => b.pop - a.pop).slice(0, 30);
  let h = '<p class="patSub">Choose one realm to champion. It still runs itself, but you can steer it with edicts paid for in Favour, which it earns by growing, holding together and winning.</p>';
  if (P && P.fell) {
    h += `<div class="patFell">${patEsc(P.fell.name)} fell in ${P.fell.y}.${P.fell.heirs.length ? ' Its lands are held by:' : ''}`;
    for (const id of P.fell.heirs) { const q = W.polities[id]; if (patLive(q)) h += ` <button data-pchoose="${q.id}"><i class="patSw" style="background:${q.color}"></i>Champion ${patEsc(q.name)}</button>`; }
    h += '</div>';
  }
  if (sel) h += `<div class="patSel"><button data-pchoose="${sel.id}"><i class="patSw" style="background:${sel.color}"></i>Champion the realm of the selection: <b>${patEsc(polityTitle(sel))}</b></button></div>`;
  if (PUI.choosing && P && !P.fell) h += '<div class="patSel"><button data-pcancel>Keep championing ' + patEsc(W.polities[P.pol].name) + '</button></div>';
  h += '<div class="patList">' + list.map(p => `<div class="patRow" data-pchoose="${p.id}"><i class="patSw" style="background:${p.color}"></i><div><b>${patEsc(p.name)}</b><small>${GOV[p.gov].name} · ${ERAS[p.era || 0]}</small></div><span>${patFmt(p.pop)} people</span><span>${p.towns} town${p.towns === 1 ? '' : 's'}</span></div>`).join('') + '</div>';
  return h;
}
function patRealmHTML(P, pol) {
  const yr = patYr(), cur = pol.cur, rul = pol.ruler && pol.ruler.alive ? pol.ruler : null, wars = patWarsOf(pol), un = patUnrest(pol);
  const stat = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  const allies = pol.allies.map(id => W.polities[id]).filter(Boolean).map(q => q.name);
  let h = `<div class="patHead"><i class="patSw big" style="background:${pol.color}"></i><div><h3>${patEsc(polityTitle(pol))}</h3><small>Your realm since ${P.since}${P.realms > 1 ? ` · realm ${P.realms} you have championed` : ''}</small></div><button data-pchange>Change realm</button></div>`;
  h += '<div class="patStats">' + stat('People', patFmt(pol.pop)) + stat('Towns', pol.towns) + stat('Age', ERAS[pol.era || 0]) + stat('Government', GOV[pol.gov].name)
    + stat('Ruler', rul ? patEsc(rul.name) : 'none') + stat('Stability', Math.round(pol.stab)) + stat('Unrest', Math.round(un) + (un > 40 ? ' ⚠' : ''))
    + stat('Legitimacy', pol.soc ? Math.round(pol.soc.legit) : '–')
    + stat('Treasury', cur.kind >= 2 ? `${fmtMoney(cur.treasury)} ${patEsc(cur.name)}s${cur.debt > 1 ? ` (debt ${fmtMoney(cur.debt)})` : ''}` : MONEY_KIND[cur.kind])
    + stat('Taxes', cur.kind >= 2 ? Math.round(cur.tax * 100) + '%' : '–') + stat('Soldiers', patFmt(pol.soldiers || 0))
    + stat('Wars', wars.length ? wars.map(w => patEsc(w.name)).join(', ') : 'at peace') + stat('Allies', allies.length ? patEsc(allies.join(', ')) : 'none') + '</div>';
  h += `<div class="patFav"><span>Favour</span><div class="t"><i style="width:${clamp(P.fav / PAT_FAV_MAX * 100, 0, 100)}%"></i></div><b>${Math.floor(P.fav)} / ${PAT_FAV_MAX}</b><small>+${P.gain.toFixed(1)} a year</small><span class="patLeg">Legacy <b>${patFmt(P.legacy)}</b></span></div>`;
  // edicts
  h += '<h4>Edicts</h4><div class="patEdicts">';
  for (const e of PAT_EDICTS) {
    if (e.hide && e.hide()) continue;
    const why = patBlock(e, pol, P), on = PUI.pick === e.id;
    h += `<div class="patEd${why ? ' off' : ''}${on ? ' on' : ''}" ${why ? '' : `data-pedict="${e.id}"`} title="${patEsc(why || e.about)}"><b>${e.name}</b><em>${e.cost}</em><small>${patEsc(why || e.about)}</small></div>`;
  }
  h += '</div>';
  if (PUI.pick) {
    const e = PAT_EDICT[PUI.pick], T = e && e.targets ? e.targets(pol, P) : [];
    h += `<div class="patPick"><b>${e ? e.name : ''}:</b> choose ${PUI.pick === 'war' || PUI.pick === 'pact' ? 'a realm' : PUI.pick === 'peace' ? 'a war' : PUI.pick === 'colony' ? 'a direction' : 'one'} <button data-pcancel>Cancel</button><div>`
      + T.map(x => `<button data-ptarget="${patEsc(x.v)}">${x.col ? `<i class="patSw" style="background:${x.col}"></i>` : ''}${patEsc(x.label)}${x.sub ? `<small>${patEsc(x.sub)}</small>` : ''}</button>`).join('') + '</div></div>';
  }
  const H = P.hold, hold = [];
  if (H.tax) hold.push(`Taxes held at ${Math.round(H.tax.v * 100)}% until ${H.tax.until}`);
  if (H.mob) hold.push(`Levies called up until ${H.mob.until}`);
  if (H.fest) hold.push(`Festival spirit until ${H.fest.until}`);
  if (H.focus) hold.push(`Research focus on ${BRANCHES[H.focus.b].name.toLowerCase()} until ${H.focus.until}`);
  if (hold.length) h += `<div class="patHold">${hold.map(patEsc).join(' · ')}</div>`;
  // ambitions, legacy, what the patron has done
  h += '<div class="patCols"><div><h4>Ambitions</h4>' + (P.amb.length ? P.amb.map(a => { const A = PAT_AMB[a.k]; return `<div class="patAmb"><b>${patEsc(A.txt(a, pol))}</b><small>${A.now ? 'now ' + patEsc(A.now(pol, a)) + ' · ' : ''}${Math.max(0, a.by - yr)} years left · +${a.rew} Favour</small></div>`; }).join('') : '<small>None for now.</small>');
  h += '<h4>Legacy</h4>' + (P.legList.length ? P.legList.slice(-8).reverse().map(l => `<div class="patLine"><b>${l.y}</b>${patEsc(l.t)} <em>+${l.v}</em></div>`).join('') : '<small>Nothing yet. Meet an ambition to begin one.</small>');
  h += '</div><div><h4>What you have done</h4>' + (P.hist.length ? P.hist.slice(-14).reverse().map(l => `<div class="patLine"><b>${l.y}</b>${patEsc(l.t)}</div>`).join('') : '<small>Nothing yet.</small>') + '</div></div>';
  return h;
}
function patRender(force) {
  if (typeof document === 'undefined' || !PUI.el || PUI.el.hidden || !W) return;
  if (PUI.press && !force) return;
  const P = W.patron, pol = patPol();
  const body = PUI.el.querySelector('.patBody');
  const h = !P || P.pol < 0 || P.fell || PUI.choosing || !patLive(pol) ? patChooserHTML(P) : patRealmHTML(P, pol);
  if (body._h !== h) { body.innerHTML = h; body._h = h; }
}
function patronOpen() {
  if (!PUI.el || !W) return;
  PUI.pick = null; PUI.choosing = false;
  PUI.el.hidden = false; patRender(true);
}
function patClick(e) {
  const P = W && W.patron;
  const c = e.target.closest('[data-pchoose]');
  if (c) { if (patronChoose(+c.dataset.pchoose)) { PUI.choosing = false; PUI.pick = null; const pol = patPol(); patSay(`You now champion ${pol.name}.`); if (typeof updateRealms === 'function') updateRealms(); } return patRender(true); }
  if (e.target.closest('[data-pchange]')) { PUI.choosing = true; PUI.pick = null; return patRender(true); }
  if (e.target.closest('[data-pcancel]')) { PUI.choosing = false; PUI.pick = null; return patRender(true); }
  const t = e.target.closest('[data-ptarget]');
  if (t && PUI.pick && P) { const r = patronIssue(PUI.pick, t.dataset.ptarget); PUI.pick = null; patSay(r.msg); return patRender(true); }
  const d = e.target.closest('[data-pedict]');
  if (d && P) {
    const ed = PAT_EDICT[d.dataset.pedict]; if (!ed) return;
    if (ed.targets) { PUI.pick = PUI.pick === ed.id ? null : ed.id; return patRender(true); }
    const r = patronIssue(ed.id); patSay(r.msg); return patRender(true);
  }
}
const PAT_CSS = `
#patronModal .card { max-width: 920px; }
.patSub { color: var(--ink2); margin: 0 0 10px; }
.patSw { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
.patSw.big { width: 18px; height: 18px; border-radius: 3px; margin: 0; }
.patList { display: flex; flex-direction: column; gap: 2px; }
.patRow { display: grid; grid-template-columns: 16px 1fr auto 70px; gap: 10px; align-items: center; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
.patRow:hover { background: rgba(255,255,255,.07); }
.patRow small { display: block; color: var(--ink3); font-size: 11px; }
.patRow span { color: var(--ink2); font-variant-numeric: tabular-nums; text-align: right; }
.patSel, .patFell { margin: 0 0 10px; color: var(--ink2); }
.patFell { color: var(--red); }
.patFell button { margin: 4px 4px 0 0; }
.patHead { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.patHead > div { flex: 1; }
.patHead h3 { font-size: 17px; }
.patHead small { color: var(--ink3); }
.patStats { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px 14px; margin-bottom: 10px; }
.patStats div { display: flex; flex-direction: column; min-width: 0; }
.patStats span { color: var(--ink3); font-size: 11px; }
.patStats b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.patFav { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.patFav .t { flex: 1; height: 8px; background: var(--panel2); border-radius: 4px; overflow: hidden; }
.patFav .t i { display: block; height: 100%; background: var(--gold); }
.patFav small { color: var(--ink3); }
.patLeg { margin-left: 12px; color: var(--ink2); }
.patLeg b { color: var(--gold); }
#patronModal h4 { font: 600 14px var(--serif); color: var(--gold); margin: 12px 0 6px; }
.patEdicts { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px; }
.patEd { position: relative; background: var(--panel2); border: 1px solid var(--line); border-radius: 5px; padding: 6px 8px 6px; cursor: pointer; }
.patEd:hover { border-color: var(--gold); }
.patEd.on { border-color: var(--gold); background: rgba(230,193,112,.12); }
.patEd.off { opacity: .5; cursor: default; }
.patEd.off:hover { border-color: var(--line); }
.patEd em { position: absolute; right: 8px; top: 6px; font-style: normal; color: var(--gold); font-variant-numeric: tabular-nums; }
.patEd small { display: block; color: var(--ink3); font-size: 11px; margin-top: 2px; }
.patPick { margin-top: 8px; padding: 8px; border: 1px solid var(--gold); border-radius: 5px; }
.patPick > div { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.patPick button small { display: block; color: var(--ink3); font-size: 10px; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.patHold { margin-top: 8px; color: var(--blue); font-size: 12px; }
.patCols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.patAmb { padding: 3px 0; }
.patAmb small, .patCols > div > small { display: block; color: var(--ink3); font-size: 11px; }
.patLine { font-size: 12px; color: var(--ink2); padding: 1px 0; }
.patLine b { color: var(--ink3); font-weight: 400; margin-right: 6px; font-variant-numeric: tabular-nums; }
.patLine em { color: var(--gold); font-style: normal; }
.patCrown { color: var(--gold); }
@media (max-width: 640px) { .patCols { grid-template-columns: 1fr; } }
`;
function patInitDOM() {
  if (PUI.el || !document.body) return;
  const st = document.createElement('style'); st.textContent = PAT_CSS; document.head.appendChild(st);
  const m = document.createElement('div');
  m.id = 'patronModal'; m.className = 'modal'; m.hidden = true;
  m.innerHTML = '<div class="card"><button class="close" data-close>×</button><h2>Patron</h2><div class="patBody"></div></div>';
  document.body.appendChild(m);
  PUI.el = m;
  const body = m.querySelector('.patBody');
  body.addEventListener('click', patClick);
  body.addEventListener('mousedown', () => { PUI.press = true; });
  window.addEventListener('mouseup', () => { PUI.press = false; });
  const b = document.getElementById('bPatron');
  if (b) b.addEventListener('click', patronOpen);
  setInterval(() => { if (!m.hidden) patRender(); }, 1000);
}
if (typeof document !== 'undefined') { if (document.body) patInitDOM(); else document.addEventListener('DOMContentLoaded', patInitDOM); }
