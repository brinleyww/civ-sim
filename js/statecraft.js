'use strict';
// Statecraft: the estates a realm is made of and what each of them wants, the laws it lives by, how far its people accept their rulers,
// what drives them to reform or revolt, treaties, royal marriages, leagues and federations, and the slow drift of births, cities and languages.
// Everything here is kept on pol.soc and t.soc as plain data. It runs once a year, from updatePolities (realms) and faithYear (towns).

// The estates. Their weight comes from pol.fac (nobles, merchants, clergy, people, army), the people split into peasants and workers as cities and mills grow.
const ESTATES = ['Nobility', 'Clergy', 'Burghers', 'Peasants', 'Workers', 'Officers'];
const EST_COL = ['#b69fee', '#c6b8e6', '#e6c170', '#8cc66a', '#d8a07a', '#e0705a'];
const E_NOB = 0, E_CLE = 1, E_BUR = 2, E_PEA = 3, E_WOR = 4, E_OFF = 5;
// Each law has a few settings, each needing ideas the realm knows. u: how much each estate likes it (nobility, clergy, burghers, peasants, workers, officers).
const LAWS = [
  { id: 'tax', name: 'Taxation', opts: [
    { n: 'Tribute and dues', u: [1, 1, -1, 0, 0, 0] },
    { n: 'Tax farming', need: ['currency'], u: [2, 1, 0, -2, -1, 0], fx: { trade: 0.98 }, say: 'sells the right to collect its taxes to whoever bids highest' },
    { n: 'Royal tax offices', need: ['civilservice'], u: [-1, 0, 1, 0, 0, 1], fx: { admin: 10, order: 2 }, say: 'sends salaried clerks to collect its taxes, and the tax farmers lose their trade' },
    { n: 'Income tax', need: ['incometax'], u: [-2, -1, -1, 1, 2, 0], fx: { admin: 15, order: 2, happy: 1 }, say: 'taxes incomes, the rich at a higher rate than the poor' } ] },
  { id: 'army', name: 'Soldiering', opts: [
    { n: 'Retinues and volunteers', u: [1, 0, 1, 1, 1, -1], fx: { conscript: 0.85 } },
    { n: 'Feudal levy', st: 2, u: [2, 0, 0, -1, -1, 0], fx: { farm: 0.99 }, say: 'makes every lord bring his men when the crown calls' },
    { n: 'Standing army', st: 4, u: [-1, 0, -1, 0, 0, 2], fx: { conscript: 1.1, morale: 5 }, say: 'raises a standing army, paid and drilled all year round' },
    { n: 'Mass conscription', need: ['nationalism'], u: [-1, 0, -1, -2, -2, 3], fx: { conscript: 1.35, morale: 6, happy: -3, craft: 0.97 }, say: 'calls up every young man for military service' } ] },
  { id: 'faith', name: 'Religion', opts: [
    { n: 'One faith, enforced', u: [1, 3, -1, 0, -1, 1], fx: { order: 4, research: 0.96 } },
    { n: 'Established church', need: ['theology'], u: [1, 2, 0, 1, 0, 0], fx: { order: 2 }, say: 'keeps its state church but stops hunting dissenters' },
    { n: 'Freedom of worship', need: ['humanism'], u: [0, -1, 2, 1, 1, 0], fx: { trade: 1.03, research: 1.03 }, say: 'lets everyone worship as they choose' },
    { n: 'Secular state', need: ['constitution'], u: [-1, -3, 1, 0, 1, -1], fx: { research: 1.06 }, say: 'separates church and state, and the priests lose their seats and their schools' } ] },
  { id: 'trade', name: 'Trade', opts: [
    { n: 'Tolls and staple towns', u: [1, 0, -2, 0, 0, 0], fx: { trade: 0.92 } },
    { n: 'Guild charters', need: ['guilds'], u: [0, 0, 1, 0, -1, 0], fx: { craft: 1.05, trade: 0.97 }, say: 'grants charters to its guilds, and only guild masters may practise a trade' },
    { n: 'Mercantilism', need: ['banking'], u: [0, 0, 1, 0, 0, 1], fx: { trade: 1.04, craft: 1.04, fleet: 1.1 }, say: 'protects its own makers with tariffs and hoards bullion' },
    { n: 'Free trade', need: ['banking', 'printing'], u: [-1, 0, 2, 0, 1, 0], fx: { trade: 1.14, share: 1.15, craft: 0.98 }, say: 'tears down its tariffs and opens its markets to the world' } ] },
  { id: 'labour', name: 'Labour', opts: [
    { n: 'Custom and kin', u: [0, 0, 0, 0, 0, 0] },
    { n: 'Serfdom', need: ['feudalism'], u: [3, 1, -1, -3, -2, 0], fx: { farm: 1.04, happy: -4, research: 0.95, colony: 0.85 }, say: 'binds its peasants to the land: they may not leave their lord' },
    { n: 'Free labour', need: ['humanism'], u: [-1, 0, 2, 1, 0, 0], fx: { craft: 1.03, research: 1.02, colony: 1.1 }, say: 'frees its peasants: anyone may now sell their work where they like' },
    { n: 'Labour laws', need: ['unions'], u: [-1, 0, -1, 1, 3, 0], fx: { happy: 4, order: 2, craft: 0.98, health: 0.98 }, say: 'limits working hours, bans child labour in the mills and legalises trade unions' } ] },
  { id: 'health', name: 'Public health', opts: [
    { n: 'Prayer and herbs', u: [0, 1, 0, 0, 0, 0] },
    { n: 'Quarantine laws', need: ['quarantine'], u: [0, 0, -1, 1, 1, 0], fx: { contagion: 0.8, trade: 0.99 }, say: 'orders ships held offshore and sick houses shut when fever comes' },
    { n: 'Sanitary boards', need: ['sanitation'], u: [0, 0, 0, 1, 2, 0], fx: { contagion: 0.8, health: 0.95, infant: 0.92 }, cost: 0.004, say: 'sets up boards of health to dig sewers and pipe clean water' },
    { n: 'Public health service', need: ['publichealth'], u: [-1, 0, -1, 2, 3, 1], fx: { contagion: 0.75, health: 0.9, infant: 0.85, plague: 0.8, recover: 1.15, happy: 2 }, cost: 0.012, say: 'opens a public health service: doctors, vaccination and hospitals for everyone' } ] },
  { id: 'vote', name: 'Franchise', opts: [
    { n: 'No vote', u: [1, 1, -1, 0, -1, 1] },
    { n: 'Men of property vote', u: [0, 0, 2, -1, -1, 0], fx: { trade: 1.02 }, say: 'gives the vote to men of property' },
    { n: 'All men vote', need: ['suffrage'], u: [-2, -1, 1, 1, 2, -1], fx: { order: 2, happy: 1 }, say: 'gives the vote to every grown man' },
    { n: 'Universal suffrage', need: ['suffrage', 'humanrights'], u: [-2, -1, 1, 2, 3, -1], fx: { order: 3, happy: 3, research: 1.02 }, say: 'gives the vote to women as well as men' } ] },
];
const LAW_TAX = 0, LAW_ARMY = 1, LAW_FAITH = 2, LAW_TRADE = 3, LAW_LAB = 4, LAW_HEALTH = 5, LAW_VOTE = 6;
// What each kind of government pushes for, whoever is in the room: [law, setting, how hard].
const GOV_LAWS = {
  theocracy: [[LAW_FAITH, 0, 1.5]], despotism: [[LAW_ARMY, 2, 1]], junta: [[LAW_ARMY, 3, 1.5]], feudal: [[LAW_LAB, 1, 1.2], [LAW_ARMY, 1, 1.2]],
  absolute: [[LAW_ARMY, 2, 1], [LAW_TAX, 2, 1]], socialist: [[LAW_LAB, 3, 2], [LAW_HEALTH, 3, 1.5], [LAW_TRADE, 1, 1], [LAW_FAITH, 3, 1]],
  merchantrep: [[LAW_TRADE, 3, 1.5]], oligarchy: [[LAW_TRADE, 3, 1]], corporate: [[LAW_TRADE, 3, 2], [LAW_LAB, 2, 1]],
  classical: [[LAW_VOTE, 1, 1.5]], constmon: [[LAW_VOTE, 2, 1]], republic: [[LAW_VOTE, 2, 1]], democracy: [[LAW_VOTE, 3, 1.5]], federation: [[LAW_VOTE, 3, 1.5]], technocracy: [[LAW_HEALTH, 3, 1]],
};
// Once a revolution wins, the new regime writes its own laws straight away.
const REGIME_LAWS = { republic: [[LAW_VOTE, 2], [LAW_LAB, 2], [LAW_FAITH, 2]], democracy: [[LAW_VOTE, 3], [LAW_LAB, 2], [LAW_FAITH, 3]], constmon: [[LAW_VOTE, 1], [LAW_FAITH, 1]],
  socialist: [[LAW_LAB, 3], [LAW_HEALTH, 3], [LAW_FAITH, 3], [LAW_TRADE, 1]], junta: [[LAW_ARMY, 3], [LAW_VOTE, 0]], despotism: [[LAW_ARMY, 2], [LAW_VOTE, 0]], theocracy: [[LAW_FAITH, 0]], oligarchy: [[LAW_TRADE, 3], [LAW_VOTE, 1]] };
const SOC_STAGE = ['', 'Many born, many die young', 'Fewer die young; families still large', 'Families are getting smaller', 'Small families, long lives'];
const SOC_BIRTH = [1, 1, 1, 0.93, 0.85];
const SOC_CLS = ['Nobles', 'Clergy', 'Merchants and masters', 'Peasants and fisherfolk', 'Labourers', 'Soldiers', 'Learned professions'];
const SOC_HIST = new Int32Array(20);

// ---- one pass over the towns each year, shared by every realm ----
const socG = new Map();
let socGY = -1;
function socPrep(Y) {
  socGY = Y; socG.clear();
  const fa = W.faiths || [], fst = fa.map(() => ({ pop: 0, lit: 0, sci: 0, rich: 0, hard: 0, enf: 0 }));
  for (const t of W.towns) {
    const pol = t.polity; if (!pol || !pol.alive) continue;
    let g = socG.get(pol.id);
    if (!g) socG.set(pol.id, g = { pop: 0, fam: 0, rw: 0, ue: 0, gini: 0, lit: 0, med: 0, urb: 0, kids: 0, work: 0, old: 0, mage: 0, ageW: 0, minC: 0, minF: 0, sick: 0, worst: null, wv: -1, part: new Set() });
    const n = tn(t); if (!n) continue;
    g.pop += n; if (t.famine > 0) g.fam += n;
    g.rw += Math.min(t.realWage || 1, 3) * n; g.ue += (t.unemp || 0) * n; g.gini += (t.gini || 0.3) * n; g.lit += t.literacy * n; g.med += t.medQ * n;
    if (n >= 220 && !t.nomad) g.urb += n;
    const s = t.soc; if (s) { g.kids += s.kids * n; g.work += s.work * n; g.old += s.old * n; g.mage += s.med * n; g.ageW += n; }
    if (t.culture !== pol.culture && !t.nomad) g.minC += n;
    const cf = pol.capital ? pol.capital.faith : -1;
    if (cf >= 0 && t.faith >= 0 && t.faith !== cf) g.minF += n;
    if (t.sick > 0 || t.lastPlague > Y - 8) g.sick = 1;
    if (t !== pol.capital && !t.nomad && !t.occupier && !t.attack && n >= 28) { const v = (t.famine > 0 ? 50 : 0) + (t.unrest || 0) + rnd(); if (v > g.wv) { g.wv = v; g.worst = t; } }
    for (const o of t.partners) if (o.polity !== pol) g.part.add(o.polity.id);
    if (t.seaPartners) for (const o of t.seaPartners) if (o.polity !== pol) g.part.add(o.polity.id);
    const q = t.faith >= 0 ? fst[t.faith] : null;
    if (q) {
      q.pop += n; q.lit += t.literacy * n; q.sci += ((knows(t, 'humanism') ? 0.5 : 0) + (knows(t, 'science') ? 0.5 : 0)) * n;
      q.rich += (t.count.temple || 0) + (t.count.cathedral || 0) * 3 + (t.count.monastery || 0) * 2;
      if (t.famine > 0 || t.sick > 0) q.hard += n;
      if (pol.soc && pol.soc.laws[LAW_FAITH] === 0 && cf === t.faith) q.enf += n;
    }
  }
  faithsSocYear(fa, fst, Y);
  diplomacyYear(Y);
}
// Churches grow rich and lazy with age and power; hard times and new reformers make people fervent, learning and science cool them.
function faithsSocYear(fa, fst, Y) {
  for (let i = 0; i < fa.length; i++) {
    const F = fa[i], q = fst[i];
    if (F.fervor === undefined) { F.fervor = 1; F.corrupt = 0; F.reformed = 0; F.reformY = -999; }
    if (!q.pop) continue;
    const lit = q.lit / q.pop, sci = q.sci / q.pop, hard = q.hard / q.pop, rich = Math.min(1, q.rich / (q.pop / 400 + 1)), enf = q.enf / q.pop;
    F.corrupt = clamp(F.corrupt + 0.002 + rich * 0.004 + enf * 0.003 - (F.reformed ? 0.002 : 0), 0, 1);
    const want = clamp(1.15 - lit * sci * 0.6 - F.corrupt * 0.3 + hard * 0.6 + (F.reformed && Y - F.born < 80 ? 0.2 : 0), 0.3, 1.5);
    F.fervor += (want - F.fervor) * 0.06;
  }
}
function socInit(pol) {
  const s = pol.soc = { y: -1, laws: [0, 0, 0, 0, 0, 0, 0], lawY: [0, 0, 0, 0, 0, 0, 0], appr: [60, 60, 60, 60, 60, 60], pow: [0.2, 0.1, 0.2, 0.3, 0, 0.2], legit: 60, press: 0, causes: [],
    dyn: pol.ruler && pol.ruler.fam ? pol.ruler.fam : '', dynY: Math.floor(year()), regent: 0, usurp: 0, auto: 0, tr: [], league: -1, drift: 0, revs: [], fx: {},
    demo: { kids: 0.35, work: 0.6, old: 0.05, med: 20, urb: 0, lit: 0, stage: 0, minC: 0, minF: 0 } };
  // a realm met for the first time (or from an old save) already has laws: let it settle on what its estates would want
  for (let L = 0; L < LAWS.length; L++) {
    let best = 0, bs = -1e9;
    for (let v = 0; v < LAWS[L].opts.length; v++) { if (!lawOpen(pol, L, v)) continue; const sc = lawScore(pol, s, L, v, false, false, 0); if (sc > bs) { bs = sc; best = v; } }
    s.laws[L] = best;
  }
  return s;
}

// ---- laws ----
function voteCap(pol) { const g = GOV[pol.gov]; return g.vote ? [1, 3] : g.succ === 'merchants' ? [0, 1] : [0, 0]; }
function lawOpen(pol, L, v) {
  const O = LAWS[L].opts[v]; if (!O) return false;
  if (O.st && govSt(pol) < O.st) return false;
  if (O.need) for (const id of O.need) if (!knowsP(pol, id)) return false;
  if (L === LAW_VOTE) { const c = voteCap(pol); if (v < c[0] || v > c[1]) return false; }
  return true;
}
function lawScore(pol, s, L, v, war, plague, lit) {
  const O = LAWS[L].opts[v], pw = s.pow, rul = pol.ruler && pol.ruler.alive ? pol.ruler : null;
  let sc = 0;
  for (let e = 0; e < 6; e++) sc += pw[e] * O.u[e] * (L === LAW_VOTE && e >= E_BUR && e <= E_WOR ? 0.3 + lit : 1);
  const gl = GOV_LAWS[GOV[pol.gov].id];
  if (gl) for (const [l, want, w] of gl) if (l === L) sc += w * Math.max(0, 1 - Math.abs(v - want) * 0.5);
  if (L === LAW_ARMY && war) sc += v * 0.4;
  if (L === LAW_HEALTH && plague) sc += v * 0.5;
  if (rul) {
    if (hasTrait(rul, 'cruel') && ((L === LAW_LAB && v === 1) || (L === LAW_FAITH && v === 0))) sc += 0.5;
    if (hasTrait(rul, 'kind') && (L === LAW_LAB || L === LAW_HEALTH)) sc += v * 0.15;
    if (hasTrait(rul, 'pious') && L === LAW_FAITH && v <= 1) sc += 0.6;
    if (hasTrait(rul, 'greedy') && L === LAW_TAX && v === 1) sc += 0.4;
    if ((hasTrait(rul, 'wise') || hasTrait(rul, 'genius')) && (L === LAW_HEALTH || (L === LAW_FAITH && v === 2))) sc += 0.3;
  }
  return sc;
}
function setLaw(pol, s, L, v, Y, say) {
  const old = s.laws[L]; if (old === v) return;
  const A = LAWS[L].opts[old], B = LAWS[L].opts[v];
  for (let e = 0; e < 6; e++) s.appr[e] = clamp(s.appr[e] + (B.u[e] - A.u[e]) * 5, 0, 100);
  s.laws[L] = v; s.lawY[L] = Y;
  if (!say || pol.pop < 150 || !pol.capital) return;
  let text;
  if (L === LAW_LAB && old === 1) text = `Serfdom is abolished in ${pol.name}. The peasants may leave the land, and many leave for the towns.`;
  else if (v > old && B.say) text = `The ${polityTitle(pol)} ${B.say}.`;
  else text = `${pol.name} goes back to ${B.n.toLowerCase()}${v < old ? `, giving up ${A.n.toLowerCase()}` : ''}.`;
  chronT('gov', text, pol.capital);
}
function lawsYear(pol, s, Y, war, plague, lit) {
  // what the realm can no longer keep, it drops
  for (let L = 0; L < LAWS.length; L++) { let v = s.laws[L]; while (v > 0 && !lawOpen(pol, L, v)) v--; if (L === LAW_VOTE) { const c = voteCap(pol); v = clamp(v, c[0], c[1]); } if (v !== s.laws[L]) setLaw(pol, s, L, v, Y, false); }
  if (rnd() > 0.2 + s.press * 0.003) return;
  const L = rint(LAWS.length), cur = s.laws[L];
  if (Y - s.lawY[L] < 8) return;
  let best = cur, bs = lawScore(pol, s, L, cur, war, plague, lit) + 0.3;
  // labour is not a ladder: serfdom is a step aside from custom, and freed peasants are not bound again unless a hard regime wants it
  const cand = L !== LAW_LAB ? [cur - 1, cur + 1] : cur === 0 ? [1, 2] : cur === 1 ? [0, 2] : [cur - 1 === 1 && !{ feudal: 1, despotism: 1, junta: 1 }[GOV[pol.gov].id] ? -1 : cur - 1, cur + 1];
  for (const v of cand) { if (!lawOpen(pol, L, v)) continue; const sc = lawScore(pol, s, L, v, war, plague, lit); if (sc > bs) { bs = sc; best = v; } }
  if (best !== cur) setLaw(pol, s, L, best, Y, true);
}

// ---- the yearly realm update: estates, legitimacy, laws, grievances ----
function statecraftYear(pol, yr) {
  const Y = Math.floor(yr);
  if (socGY !== Y) socPrep(Y);
  const s = pol.soc || socInit(pol);
  if (s.y === Y || !pol.capital) return;
  s.y = Y;
  const g = socG.get(pol.id); if (!g || !g.pop) return;
  const g0 = GOV[pol.gov], rul = pol.ruler && pol.ruler.alive ? pol.ruler : null, L = s.laws;
  const F = g.fam / g.pop, lit = g.lit / g.pop, gini = g.gini / g.pop, rw = g.rw / g.pop, ue = g.ue / g.pop, urb = g.urb / g.pop;
  const war = Object.keys(pol.warsWith).length > 0, tired = Math.min(1, pol.warTired || 0), slump = pol.cur.slump || 0, tax = pol.cur.tax || 0.1;
  // demography: how old the realm is, how many live in cities, and where it is in the fall from big families to small
  const D = s.demo;
  if (g.ageW) { D.kids = g.kids / g.ageW; D.work = g.work / g.ageW; D.old = g.old / g.ageW; D.med = g.mage / g.ageW; }
  D.urb = urb; D.lit = lit; D.minC = g.minC / g.pop; D.minF = g.minF / g.pop;
  const med = g.med / g.pop;
  let stage = med >= 0.16 ? 2 : 1;
  if (stage === 2 && lit > 0.45 && urb > 0.25) stage = 3;
  if (stage === 3 && (knowsP(pol, 'pill') || lit > 0.85)) stage = 4;
  if (D.stage && stage > D.stage && stage >= 3 && pol.pop >= 300) chronT('misc', stage === 3 ? `Families in ${pol.name} are getting smaller. With most children now living to grow up, and more of them in school, parents have fewer.` : `Two children is the usual family in ${pol.name} now, and people live into their seventies.`, pol.capital);
  D.stage = stage;
  // who holds power: the estates, weighted by the factions, the franchise and how organised the commoners are
  const f = pol.fac, ind = clamp((pol.indRev ? pol.indRev.P : 0) * 0.8 + urb * 0.5, 0, 0.9), org = 0.7 + lit * 0.6, vl = L[LAW_VOTE];
  const pw = s.pow;
  pw[E_NOB] = f[0] * (1 - 0.15 * vl); pw[E_CLE] = f[2]; pw[E_BUR] = f[1] * (1 + (vl >= 1 ? 0.4 : 0));
  pw[E_PEA] = f[3] * (1 - ind) * org * (1 + Math.max(0, vl - 1) * 0.4); pw[E_WOR] = f[3] * ind * org * (1 + Math.max(0, vl - 1) * 0.5) * (L[LAW_LAB] === 3 ? 1.3 : 1); pw[E_OFF] = f[4];
  let ps = 0; for (let e = 0; e < 6; e++) ps += pw[e]; for (let e = 0; e < 6; e++) pw[e] /= ps || 1;
  // what each estate makes of things
  const cond = [0, 0, 0, 0, 0, 0];
  cond[E_NOB] = (g0.succ === 'heir' && g0.st <= 5 ? 8 : 0) - (g0.vote ? 6 : 0) - (g0.id === 'socialist' ? 25 : 0);
  cond[E_CLE] = (g0.id === 'theocracy' ? 15 : 0) - D.minF * 25 - (g0.id === 'socialist' ? 15 : 0);
  cond[E_BUR] = -30 * slump - 40 * Math.max(0, tax - 0.15) + (g0.succ === 'merchants' ? 12 : 0) - (war ? 4 : 0);
  cond[E_PEA] = -45 * F - 40 * Math.max(0, tax - 0.12) - (war ? 12 * tired : 0) - 30 * Math.max(0, gini - 0.4);
  cond[E_WOR] = -35 * F + clamp((rw - 1) * 15, -15, 10) - 60 * ue - 30 * slump - 30 * Math.max(0, gini - 0.4) + (g0.id === 'socialist' ? 15 : 0);
  cond[E_OFF] = (war ? 6 - 10 * tired : -3) + (g0.succ === 'strong' ? 15 : 0);
  if (rul) {
    const cr = hasTrait(rul, 'cruel'), ch = hasTrait(rul, 'charismatic');
    for (let e = 0; e < 6; e++) cond[e] += (cr ? (e === E_OFF ? 3 : -5) : 0) + (ch ? 4 : 0);
    if (hasTrait(rul, 'kind')) { cond[E_PEA] += 5; cond[E_WOR] += 5; }
    if (hasTrait(rul, 'pious')) cond[E_CLE] += 8;
    if (hasTrait(rul, 'greedy')) { cond[E_BUR] -= 4; cond[E_PEA] -= 4; }
  }
  let A = 0;
  for (let e = 0; e < 6; e++) {
    let u = 0; for (let k = 0; k < LAWS.length; k++) u += LAWS[k].opts[L[k]].u[e] * (k === LAW_VOTE && e >= E_BUR && e <= E_WOR ? 0.3 + lit : 1);
    s.appr[e] += (clamp(50 + u * 4 + cond[e], 0, 100) - s.appr[e]) * 0.15;
    A += pw[e] * s.appr[e];
  }
  // legitimacy: why people obey. Old dynasties, fair elections and a believed-in church make it; usurpers, regencies, hunger and plague unmake it.
  const cf = pol.capital.faith >= 0 && W.faiths ? W.faiths[pol.capital.faith] : null, fv = cf && cf.fervor !== undefined ? cf.fervor : 1;
  let T = { elder: 60, council: 55, heir: 40 + Math.min(30, (Y - s.dynY) / 4), vote: 45 + L[LAW_VOTE] * 6, merchants: 48, clergy: 40 + 20 * fv, strong: 25, party: 40, scholar: 50 }[g0.succ] || 50;
  if (rul) T += (hasTrait(rul, 'charismatic') ? 8 : 0) - (hasTrait(rul, 'cruel') ? 6 : 0) + (hasTrait(rul, 'wise') || hasTrait(rul, 'genius') ? 4 : 0) + (hasTrait(rul, 'kind') ? 4 : 0) + (hasTrait(rul, 'warhero') ? 5 : 0);
  else T -= 10;
  if (s.usurp > Y) T -= 20 * (s.usurp - Y) / 25;
  if (s.regent > Y) T -= 8;
  T += -30 * F - (g.sick ? 5 : 0) + (A - 50) * 0.5;
  s.legit = clamp(s.legit + (clamp(T, 0, 100) - s.legit) * 0.12, 0, 100);
  if (!(pol.stab >= 0)) pol.stab = 50;  // heal realms an older save left with no number here
  pol.stab = clamp(pol.stab + (s.legit - 50) * 0.012 + (A - 50) * 0.012, 0, 100);
  // public health costs money
  const hc = LAWS[LAW_HEALTH].opts[L[LAW_HEALTH]].cost;
  if (hc && pol.cur.kind >= 2) { const c = hc * Math.max(0, pol.cur.gdp || 0); pol.cur.treasury -= c; pol.cur.spentY = (pol.cur.spentY || 0) + c; }
  lawsYear(pol, s, Y, war, g.sick, lit);
  pressureYear(pol, s, g, Y, lit, F, gini, rw, ue, tax, tired, war);
  driftYear(pol, s, Y);
  socFx(pol, s);
}

// ---- grievances, and what a realm does when they boil over ----
function pressureYear(pol, s, g, Y, lit, F, gini, rw, ue, tax, tired, war) {
  const L = s.laws, st = govSt(pol), auto = s.auto > Y;
  const c = [
    ['hunger', F * 30],
    ['inequality', Math.max(0, gini - 0.42) * 50],
    ['low wages', st >= 5 ? Math.max(0, 1 - rw) * 12 + ue * 25 : 0],
    ['taxes', Math.max(0, tax - 0.2) * 40 + (L[LAW_TAX] === 1 ? 1 : 0)],
    ['serfdom', L[LAW_LAB] === 1 && knowsP(pol, 'humanism') ? 4 : 0],
    ['no say in government', L[LAW_VOTE] === 0 && lit > 0.3 && st >= 4 && knowsP(pol, 'constitution') ? 2 + lit * 4 : 0],
    ['the war', war ? tired * 6 : 0],
    ['a ruler nobody accepts', s.legit < 35 ? (35 - s.legit) * 0.15 : 0],
    ['persecution', L[LAW_FAITH] === 0 ? s.demo.minF * 6 : 0],
    ['foreign rule', knowsP(pol, 'nationalism') ? s.demo.minC * (auto ? 2 : 5) : 0],
  ];
  const ideas = 0.6 + lit * 0.8 + (knowsP(pol, 'printing') ? 0.2 : 0) + (knowsP(pol, 'newspapers') ? 0.2 : 0);
  let sum = 0; for (const x of c) sum += x[1];
  s.press = clamp(s.press * 0.88 + sum * ideas, 0, 100);
  s.causes = c.filter(x => x[1] > 0.8).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  if (s.press < 55 || rnd() > 0.3 || !s.causes.length || pol.rebel) return;
  const rul = pol.ruler && pol.ruler.alive ? pol.ruler : null, cap = pol.capital, big = pol.pop >= 150;
  // the angriest estate that matters
  let e = E_PEA, ev = -1; for (let k = 0; k < 6; k++) { const v = s.pow[k] * (65 - s.appr[k]); if (v > ev) { ev = v; e = k; } }
  const listen = GOV[pol.gov].vote || (rul && (hasTrait(rul, 'kind') || hasTrait(rul, 'wise') || hasTrait(rul, 'genius'))) || s.legit > 55 || rnd() < 0.25;
  if (listen) {
    const why = s.causes[0];
    let did = '';
    const up = l => { const v = s.laws[l] + 1; if (lawOpen(pol, l, v)) { setLaw(pol, s, l, v, Y, false); return LAWS[l].opts[v].n.toLowerCase(); } return ''; };
    if (why === 'hunger' || why === 'taxes') { pol.cur.tax = Math.max(0.03, (pol.cur.tax || 0.1) - 0.04); did = why === 'hunger' ? 'opens the granaries and cuts taxes' : 'cuts taxes'; s.appr[E_PEA] += 10; }
    else if (why === 'inequality' || why === 'low wages') { const lv = s.laws[LAW_LAB] < 2 ? 2 : 3; let v = ''; if (s.laws[LAW_LAB] < lv && lawOpen(pol, LAW_LAB, lv)) { setLaw(pol, s, LAW_LAB, lv, Y, false); v = LAWS[LAW_LAB].opts[lv].n.toLowerCase(); } else v = up(LAW_HEALTH); if (v) did = `brings in ${v}`; }
    else if (why === 'serfdom') { if (lawOpen(pol, LAW_LAB, 2)) { setLaw(pol, s, LAW_LAB, 2, Y, false); did = 'frees the serfs'; } }
    else if (why === 'no say in government') { const v = up(LAW_VOTE); if (v) did = `widens the vote: ${v}`; else if (GOV[pol.gov].succ === 'heir' && govSt(pol) <= 5 && pol.gov !== GOV_IX.constmon) { setGov(pol, 'constmon', `The crown of ${pol.name} grants a constitution rather than lose everything. A parliament will sit.`); s.press -= 30; s.legit = Math.max(s.legit, 50); return; } }
    else if (why === 'persecution') { const v = up(LAW_FAITH); if (v) did = `stops hunting dissenters (${v})`; }
    else if (why === 'foreign rule') { s.auto = Y + 40; did = 'grants its minority provinces their own assemblies and their own tongue in the schools'; }
    else if (why === 'a ruler nobody accepts' && rul && GOV[pol.gov].succ === 'heir') { did = `sees ${rul.name} abdicate`; depose(pol, Y, 'the Abdicated'); }
    if (did) { s.press -= 25; s.legit = clamp(s.legit + 3, 0, 100); if (big) chronT('gov', `Reform in ${pol.name}: with ${s.causes.join(' and ')} stirring the streets, the ${polityTitle(pol)} ${did}.`, cap); return; }
  }
  // or the soldiers are sent in
  if (s.appr[E_OFF] > 50 && s.pow[E_OFF] > 0.1 && rnd() < 0.5) {
    s.press -= 12; s.legit = clamp(s.legit - 6, 0, 100);
    const t = g.worst; if (t) t.unrest = Math.min(100, (t.unrest || 0) + 20);
    if (big && rnd() < 0.5) chronT('war', `Troops fire on a crowd ${t ? `in ${t.name}` : `in ${cap.name}`} protesting against ${s.causes[0]}.`, t || cap);
    return;
  }
  if (s.press < 80 || rnd() > 0.35) return;
  revolution(pol, s, g, Y, e);
}
// Who wins depends on who rose: the officers take power, workers with the new ideas build a socialist state, townsmen write a constitution,
// priests take the crown for the gods; and peasants with no ideas but hunger simply take up arms.
function revolution(pol, s, g, Y, e) {
  const k = id => knowsP(pol, id), st = govSt(pol), g0 = GOV[pol.gov], why = s.causes.join(', ');
  let to = null;
  if (e === E_OFF) to = st >= 5 ? 'junta' : st >= 3 ? 'despotism' : null;
  else if (e === E_WOR && k('socialism')) to = 'socialist';
  else if ((e === E_BUR || e === E_WOR || e === E_PEA) && k('constitution') && st >= 3) to = k('suffrage') ? 'democracy' : (g0.succ === 'heir' && rnd() < 0.5 ? 'constmon' : 'republic');
  else if (e === E_CLE && st >= 3 && st <= 5) to = 'theocracy';
  else if (e === E_BUR && st >= 3 && st <= 5) to = 'oligarchy';
  if (!to || GOV_IX[to] === pol.gov) {
    const t = g.worst;
    if (t) { if (pol.pop >= 150) chronT('war', `The ${ESTATES[e].toLowerCase()} of ${t.name} rise against the ${polityTitle(pol)}: ${why}.`, t); startRevolt(pol, t); }
    s.press -= 30;
    return;
  }
  depose(pol, Y, 'the Deposed');
  setGov(pol, to, `Revolution in ${pol.name}! ${why.charAt(0).toUpperCase() + why.slice(1)} drive the ${ESTATES[e].toLowerCase()} into the streets, and the old order falls. The ${GOV[GOV_IX[to]].name} is proclaimed at ${pol.capital.name}.`);
  for (const [l, v] of REGIME_LAWS[to] || []) { let w = v; while (w > 0 && !lawOpen(pol, l, w)) w--; if (lawOpen(pol, l, w)) setLaw(pol, s, l, w, Y, false); }
  s.legit = 55; s.press = 15; s.dyn = ''; s.regent = 0;
  if (to === 'junta' || to === 'despotism') s.usurp = Y + 25;
  s.revs.push({ y: Y, to: GOV[GOV_IX[to]].name, why }); if (s.revs.length > 6) s.revs.shift();
  for (let q = 0; q < 6; q++) s.appr[q] = q === e ? 80 : clamp(s.appr[q] - 10, 0, 100);
}
function depose(pol, Y, ep) {
  const rul = pol.ruler; if (!rul) return;
  rul.leader = false;
  const last = pol.rulers[pol.rulers.length - 1];
  if (last && last.to === null) { last.to = Y; last.epithet = ep; }
  if (rul.alive) plog(rul, `Lost the throne of ${pol.name}.`);
  pol.ruler = null;
}

// ---- succession: who inherits, and what happens when nobody clearly does ----
function heirOf(pol, old) {
  let child = null, ca = -1, kin = null, ka = -1;
  for (const t of W.towns) {
    if (t.polity !== pol) continue;
    for (const p of t.members) {
      if (!p.alive || p === old || p.army || p.leader || p.task === T_MIGRATE) continue;
      const a = ageOf(p); if (a >= 75) continue;
      if ((p.momName === old.name || p.dadName === old.name) && a > ca) { child = p; ca = a; }
      else if (a >= 16 && old.fam && p.fam === old.fam && a > ka) { kin = p; ka = a; }
    }
  }
  if (child && ca >= 6) return { p: child, kind: ca < 16 ? 'minor' : 'child' };
  if (kin) return { p: kin, kind: 'kin' };
  return { p: null, kind: 'none' };
}
// A dynasty that dies out can leave its crown to the house it married into.
function personalUnion(pol, old) {
  const s = pol.soc; if (!s) return false;
  for (const x of s.tr) {
    if (x.k !== 'wed') continue;
    const q = W.polities[x.w];
    if (!q || !q.alive || !q.capital || !q.ruler || !q.ruler.alive || atWar(q, pol) || GOV[q.gov].succ !== 'heir' || q.pop < pol.pop * 0.4 || rnd() > 0.5) continue;
    const place = pol.capital;
    for (const t of W.towns.slice()) if (t.polity === pol) transferTown(t, q);
    if (place) chronT('gov', `The house of ${old.fam || old.name} dies out. By an old marriage treaty the crown of ${pol.name} passes to ${q.ruler.name} of ${q.name}, and two realms are ruled as one.`, place);
    return true;
  }
  return false;
}
function successionAfter(pol, old, next, how, why) {
  const s = pol.soc; if (!s || !next) return;
  const Y = Math.floor(year()), g = GOV[pol.gov];
  if (why === 'vote') s.legit = clamp(s.legit + 4, 0, 100);
  if (g.succ !== 'heir') { s.dyn = ''; return; }
  const big = pol.pop >= 200 && pol.capital;
  if (how === 'minor') { s.regent = Y + Math.max(1, Math.ceil(16 - ageOf(next))); s.legit -= 8; if (big) chronT('ruler', `${next.name} is only ${Math.floor(ageOf(next))}. A regency council of great lords will rule ${pol.name} until they come of age.`, pol.capital); }
  if (how === 'kin') { s.legit -= 6; if (big) chronT('ruler', `With no child to follow ${old.name}, the crown of ${pol.name} passes to a cousin, ${next.name}.`, pol.capital); }
  if (how === 'none' && old) { s.legit -= 20; if (big) chronT('ruler', `${old.name} dies without an heir. The great families of ${pol.name} quarrel over who should wear the crown, and settle on ${next.name}.`, pol.capital); }
  if (next.fam && next.fam !== s.dyn) {
    if (s.dyn && big && how !== 'none') chronT('ruler', `The house of ${next.fam} takes the throne of ${pol.name}.`, pol.capital);
    s.dyn = next.fam; s.dynY = Y;
  }
  s.legit = clamp(s.legit, 0, 100);
}
// how much more likely a disputed succession turns into civil war (used by chooseRuler)
const succRisk = (pol, how) => (how === 'none' ? 0.3 : how === 'minor' ? 0.12 : how === 'kin' ? 0.04 : how === 'child' ? -0.03 : 0) + (pol.soc && pol.soc.legit < 30 ? 0.1 : 0);

// ---- diplomacy: treaties, marriages, vassals, leagues and federations ----
const hasTreaty = (a, k, b) => a.soc.tr.some(x => x.k === k && x.w === b.id);
function addTreaty(a, b, k, end) { a.soc.tr.push({ k, w: b.id, end, y: Math.floor(year()) }); b.soc.tr.push({ k, w: a.id, end, y: Math.floor(year()) }); }
const SOC_REPUB = { confederacy: 1, citystate: 1, merchantrep: 1, classical: 1, oligarchy: 1, republic: 1, democracy: 1, federation: 1, constmon: 1 };
function diplomacyYear(Y) {
  W.leagues = W.leagues || [];
  for (const a of W.polities) {
    if (!a.alive || !a.soc) continue;
    const tr = a.soc.tr;
    for (let k = tr.length - 1; k >= 0; k--) {
      const x = tr[k], b = W.polities[x.w];
      if (!b || !b.alive || !b.soc || x.end < Y) { tr.splice(k, 1); continue; }
      if (atWar(a, b)) { tr.splice(k, 1); if (x.k === 'nap' && a.id < b.id && a.pop + b.pop > 300 && a.capital) chronT('war', `The pact between ${a.name} and ${b.name} is torn up by war.`, a.capital); continue; }
      adjustRel(a, b, x.k === 'wed' ? 0.3 : x.k === 'trade' ? 0.25 : 0.1);
    }
  }
  for (const a of W.polities) {
    if (!a.alive || !a.soc || !a.capital || govSt(a) < 2 || a.rebel || rnd() > 0.35) continue;
    const ga = socG.get(a.id); if (!ga) continue;
    for (const id of ga.part) {
      const b = W.polities[id];
      if (!b || b === a || !b.alive || !b.soc || !b.capital || b.rebel || atWar(a, b) || a.soc.tr.length >= 8 || b.soc.tr.length >= 8) continue;
      const r = relOf(a, b), big = a.pop + b.pop > 300, sa = govSt(a), sb = govSt(b);
      // (trade treaties themselves are money.js's business)
      if (sb >= 2 && r >= 0 && !areAllies(a, b) && !hasTreaty(a, 'nap', b) && a.soc.tr.filter(x => x.k === 'nap').length < 3 && (a.pop > b.pop * 2 || b.pop > a.pop * 2 || r >= 25) && rnd() < 0.02 * (knowsP(a, 'diplomacy') || knowsP(b, 'diplomacy') ? 2 : 1)) {
        const end = Y + 15 + rint(10);
        addTreaty(a, b, 'nap', end);
        a.truce[b.id] = Math.max(a.truce[b.id] || 0, end); b.truce[a.id] = Math.max(b.truce[a.id] || 0, end);
        if (big) chronT('misc', `${a.name} and ${b.name} swear not to make war on each other for ${end - Y} years.`, a.capital);
      } else if (sa >= 3 && sb >= 3 && GOV[a.gov].succ === 'heir' && GOV[b.gov].succ === 'heir' && r >= 25 && a.ruler && a.ruler.alive && b.ruler && b.ruler.alive && !hasTreaty(a, 'wed', b) && a.soc.tr.filter(x => x.k === 'wed').length < 2 && rnd() < 0.03) {
        addTreaty(a, b, 'wed', Y + 40); adjustRel(a, b, 10);
        const fa = a.ruler.fam || a.ruler.name, fb = b.ruler.fam || b.ruler.name;
        if (big) chronT('gov', fa === fb ? `A royal marriage joins two branches of the house of ${fa}, the one ruling ${a.name} and the other ${b.name}.` : `A royal marriage binds the house of ${fa} of ${a.name} to the house of ${fb} of ${b.name}.`, a.capital);
      }
      // a small realm next to a strong, armed one may choose tribute over war
      const [w, S] = a.pop < b.pop ? [a, b] : [b, a];
      if (w.overlord === null && S.overlord === null && w.pop < S.pop * 0.2 && govSt(S) >= 3 && r >= -10 && !areAllies(a, b) && (S.soldiers > w.pop * 0.25 || Object.keys(S.warsWith).length) && !W.polities.some(o => o.alive && o.overlord === w.id) && rnd() < 0.02) {
        w.overlord = S.id; adjustRel(w, S, 5);
        if (big) chronT('gov', `Rather than face the armies of ${S.name}, ${w.name} bows to it and agrees to pay tribute.`, w.capital);
      }
      // republics and free cities band together
      if (SOC_REPUB[GOV[a.gov].id] && SOC_REPUB[GOV[b.gov].id] && r >= 40 && (a.culture === b.culture || a.culture.parent === b.culture.id || b.culture.parent === a.culture.id || Object.keys(a.warsWith).some(q => b.warsWith[q])) && rnd() < 0.05) joinLeague(a, b, Y);
    }
  }
  leaguesYear(Y);
}
function joinLeague(a, b, Y) {
  const la = a.soc.league, lb = b.soc.league;
  if (la >= 0 && la === lb) return;
  if (la >= 0 && lb >= 0) return;
  const big = a.pop + b.pop > 200;
  if (la < 0 && lb < 0) {
    const L = { id: W.leagues.length, name: `${cap(word(a.culture, 2))} League`, members: [a.id, b.id], y: Y, alive: true };
    W.leagues.push(L); a.soc.league = b.soc.league = L.id;
    if (big) chronT('gov', `${a.name} and ${b.name} found the ${L.name}, swearing to defend each other and keep their roads open.`, a.capital);
    return;
  }
  const L = W.leagues[la >= 0 ? la : lb], nw = la >= 0 ? b : a;
  if (!L || !L.alive || L.members.length >= 8) return;
  L.members.push(nw.id); nw.soc.league = L.id;
  if (big) chronT('gov', `${nw.name} joins the ${L.name}.`, nw.capital);
}
function leaguesYear(Y) {
  for (const L of W.leagues) {
    if (!L.alive) continue;
    L.members = L.members.filter(id => { const p = W.polities[id]; return p && p.alive && p.soc && p.soc.league === L.id && SOC_REPUB[GOV[p.gov].id]; });
    for (const p of W.polities) if (p.soc && p.soc.league === L.id && !L.members.includes(p.id)) p.soc.league = -1;
    const M = L.members.map(id => W.polities[id]);
    for (let i = 0; i < M.length; i++) for (let j = i + 1; j < M.length; j++) {
      if (atWar(M[i], M[j])) { L.members.splice(L.members.indexOf(M[j].id), 1); M[j].soc.league = -1; continue; }
      adjustRel(M[i], M[j], 0.8);
      if (relOf(M[i], M[j]) >= 45 && M[i].allies.length < 3 && M[j].allies.length < 3 && rnd() < 0.1) makeAlliance(M[i], M[j]);
    }
    if (L.members.length < 2) { L.alive = false; for (const p of M) if (p.soc.league === L.id) p.soc.league = -1; continue; }
    // a league old and close enough becomes one nation
    if (M.length >= 3 && Y - L.y > 30 && rnd() < 0.02) {
      const top = M.slice().sort((x, y) => y.pop - x.pop)[0];
      let rs = 0, n = 0; for (const p of M) if (p !== top) { rs += relOf(p, top); n++; }
      const modern = knowsP(top, 'constitution');
      if (rs / n >= 50 && (modern || govSt(top) <= 3)) {
        for (const p of M) if (p !== top) for (const t of W.towns.slice()) if (t.polity === p) transferTown(t, top);
        L.alive = false; top.soc.league = -1;
        setGov(top, modern ? 'federation' : 'confederacy', `The ${L.name} becomes a single nation: ${M.length} members put their armies, coins and laws under one ${modern ? 'federal' : 'common'} government at ${top.capital.name}.`);
      }
    }
  }
}

// ---- languages: dialects drift apart, and minorities slowly take on their rulers' tongue ----
function driftYear(pol, s, Y) {
  if (Y % 5 || govSt(pol) < 2) return;
  const c = pol.capital;
  let far = false;
  for (const o of W.polities) if (o !== pol && o.alive && o.culture === pol.culture && o.capital && Math.hypot(o.capital.x - c.x, o.capital.y - c.y) > 45) { far = true; break; }
  s.drift = far ? s.drift + 5 : Math.max(0, s.drift - 5);
  if (s.drift < 250 || rnd() > 0.1) return;
  const old = pol.culture, nc = makeCulture(old);
  pol.culture = nc; s.drift = 0;
  for (const t of W.towns) if (t.polity === pol && t.culture === old) t.culture = nc;
  if (pol.pop >= 100) chronT('misc', `The speech of ${pol.name} has drifted so far from the old ${old.name} that it is a language of its own now: ${nc.name}.`, c);
}
function townSocYear(t) {
  const s = t.soc || (t.soc = { kids: 0.35, work: 0.6, old: 0.05, med: 20, assim: 0, cls: [0, 0, 0, 0, 0, 0, 0] });
  const m = t.members, len = m.length;
  if (len) {
    const step = len > 240 ? Math.floor(len / 240) : 1, H = SOC_HIST;
    let k = 0, o = 0, n = 0; H.fill(0);
    for (let q = 0; q < len; q += step) { const a = ageOf(m[q]); n++; if (a < 15) k++; else if (a >= 65) o++; H[Math.min(19, a / 5 | 0)]++; }
    s.kids = k / n; s.old = o / n; s.work = 1 - s.kids - s.old;
    let c = 0, h = 0; for (; h < 19; h++) { c += H[h]; if (c >= n / 2) break; }
    s.med = h * 5 + 2.5;
  }
  // who lives here, from the work the town does
  const j = t.jobs, pol = t.polity, ind = pol && pol.indRev ? pol.indRev.P : 0, C = s.cls, st = pol ? govSt(pol) : 0;
  const work = Math.max(1, len - j[J.CHILD] - j[J.ELDER] - j[J.NONE]);
  C[0] = work * (st >= 2 && st <= 6 && !GOV[pol.gov].vote ? 0.02 : 0.005) * (1 + ((t.count.castle || 0) + (t.count.palace || 0)) * 0.2);
  C[1] = t.faith >= 0 ? j[J.SERVICE] * 0.35 : 0;
  C[2] = j[J.TRADE] + j[J.CRAFT] * (1 - ind) + j[J.SAILOR] * 0.3;
  C[3] = j[J.FARM] + j[J.HERD] + j[J.GARDEN] + j[J.FORAGE] + j[J.HUNT] + j[J.FISH];
  C[4] = j[J.MINE] + j[J.CRAFT] * ind + j[J.BUILD] + j[J.WOOD] + j[J.STONE] + j[J.CLAY] + j[J.SAILOR] * 0.7;
  C[5] = j[J.SOLDIER];
  C[6] = j[J.SCHOLAR] + j[J.SERVICE] * (t.faith >= 0 ? 0.65 : 1);
  let cs = 0; for (let q = 0; q < 7; q++) cs += C[q]; for (let q = 0; q < 7; q++) C[q] = cs ? C[q] / cs : 0;
  // a town of another tongue under this realm's rule
  if (!pol || t.nomad || !pol.capital) return;
  const pc = pol.culture, tc = t.culture;
  if (tc === pc) { s.assim = 0; return; }
  const kin = tc.parent === pc.id || pc.parent === tc.id, auto = pol.soc && pol.soc.auto > year();
  let r = (0.003 + (pol.eduLaw || 0) * 0.004 + t.literacy * 0.005 + (kin ? 0.004 : 0) + (t.faith === pol.capital.faith ? 0.002 : 0)) / (1 + Math.sqrt(tn(t)) / 20);
  if (knows(t, 'nationalism')) { r *= 0.4; if (!kin && !auto) t.unrest = Math.min(100, (t.unrest || 0) + 1.5); }
  if (auto) r *= 0.3;
  if (t.occupier) r = 0;
  s.assim += r;
  if (s.assim >= 1) { s.assim = 0; t.culture = pc; if (tn(t) > 60) chronT('misc', `The people of ${t.name} have stopped speaking ${tc.name} at home. It is a ${pc.name} town now.`, t); }
}

// ---- what all this does to every town in the realm (merged into revFx by revEffects) ----
function socFx(pol, s) {
  const fx = {};
  const add = o => { for (const k in o) { if (MOD_ADD[k]) fx[k] = (fx[k] || 0) + o[k]; else fx[k] = (fx[k] || 1) * o[k]; } };
  for (let L = 0; L < LAWS.length; L++) { const O = LAWS[L].opts[s.laws[L]]; if (O.fx) add(O.fx); }
  const D = s.demo;
  if (D.stage >= 3) add({ birth: SOC_BIRTH[D.stage] });
  if (D.work > 0.64) add({ craft: 1.03, trade: 1.02 });  // the demographic dividend: many hands, few mouths
  if (D.old > 0.18) add({ craft: 0.97 });
  if (s.league >= 0) add({ share: 1.1 });
  if (s.regent > Math.floor(year())) add({ order: -2 });
  for (const k in fx) fx[k] = Math.round(fx[k] * 1000) / 1000;
  s.fx = fx;
}

// ---- panels ----
function realmSocHTML(p) {
  const s = p.soc; if (!s || !p.alive) return '';
  const Y = Math.floor(year()), D = s.demo, g = GOV[p.gov];
  const notes = [];
  if (s.dyn && g.succ === 'heir') notes.push(`The house of ${esc(s.dyn)}, on the throne since ${s.dynY}.`);
  if (s.regent > Y) notes.push(`A regency council rules until ${s.regent}, when the heir comes of age.`);
  if (s.usurp > Y) notes.push('The ruler took power by force, and many still call it theft.');
  if (s.auto > Y) notes.push('Its minority provinces keep their own assemblies.');
  let h = `<h4>Court and estates</h4>${bar('Legitimacy', s.legit, 100, s.legit < 35 ? '#e0705a' : '#9fb9ee', Math.round(s.legit))}`;
  h += ESTATES.map((n, e) => s.pow[e] < 0.02 ? '' : bar(`${n} ${Math.round(s.pow[e] * 100)}%`, s.appr[e], 100, s.appr[e] < 35 ? '#e0705a' : EST_COL[e], Math.round(s.appr[e]))).join('');
  h += `<div class="sub">Bars show how content each estate is; the share is its weight at court.</div>${notes.map(t => `<div class="sub">${t}</div>`).join('')}`;
  h += `<h4>Laws</h4><div class="kv">${LAWS.map((L, k) => `<span>${L.name}</span><b>${esc(L.opts[s.laws[k]].n)}</b>`).join('')}${typeof EDU_LAW_NAME !== 'undefined' ? `<span>Schooling</span><b>${esc(EDU_LAW_NAME[p.eduLaw || 0])}</b>` : ''}</div>`;
  h += bar('Discontent', s.press, 100, s.press > 55 ? '#e0705a' : '#e6c170', Math.round(s.press));
  if (s.causes.length) h += `<div class="sub">Grievances: ${s.causes.map(esc).join(', ')}.</div>`;
  if (s.revs.length) h += `<div class="sub">Revolutions: ${s.revs.map(r => `${r.y} (${esc(r.to)})`).join(', ')}.</div>`;
  const kinds = { nap: 'Non-aggression pacts with', wed: 'Royal marriages with' }, rows = [];
  for (const k in kinds) { const L = s.tr.filter(x => x.k === k).map(x => W.polities[x.w]).filter(o => o && o.alive); if (L.length) rows.push(`${kinds[k]} ${L.map(o => esc(o.name)).join(', ')}.`); }
  const lg = s.league >= 0 && W.leagues ? W.leagues[s.league] : null;
  if (lg && lg.alive) rows.push(`Member of the ${esc(lg.name)} (${lg.members.length} members, since ${lg.y}).`);
  if (rows.length) h += `<h4>Treaties</h4>${rows.map(r => `<div class="sub">${r}</div>`).join('')}`;
  h += `<h4>Its people</h4><div class="kv"><span>Living in cities</span><b>${Math.round(D.urb * 100)}%</b><span>Children, working age, old</span><b>${Math.round(D.kids * 100)} / ${Math.round(D.work * 100)} / ${Math.round(D.old * 100)}%</b><span>Median age</span><b>${Math.round(D.med)}</b><span>Families</span><b>${SOC_STAGE[D.stage]}</b><span>Language</span><b>${esc(p.culture.name)}</b>${D.minC > 0.01 ? `<span>Speak another tongue</span><b>${Math.round(D.minC * 100)}%</b>` : ''}${D.minF > 0.01 ? `<span>Follow another faith</span><b>${Math.round(D.minF * 100)}%</b>` : ''}</div>`;
  return h;
}
function socTownHTML(t) {
  const s = t.soc; if (!s || !tn(t)) return '';
  const tags = s.cls.map((v, k) => v >= 0.01 ? `<span>${SOC_CLS[k]} ${Math.round(v * 100)}%</span>` : '').join('');
  const pol = t.polity, F = t.faith >= 0 && W.faiths ? W.faiths[t.faith] : null;
  const fv = F && F.fervor !== undefined ? F.fervor : 1;
  const lang = pol && pol.culture !== t.culture && !t.nomad ? `${esc(t.culture.name)}, under ${esc(pol.culture.name)}-speaking rulers (${Math.round(s.assim * 100)}% of the way to their tongue)` : esc(t.culture.name);
  return `<h4>Society</h4><div class="tags">${tags}</div><div class="kv"><span>Children, working age, old</span><b>${Math.round(s.kids * 100)} / ${Math.round(s.work * 100)} / ${Math.round(s.old * 100)}%</b><span>Median age</span><b>${Math.round(s.med)}</b><span>Speaks</span><b>${lang}</b>${F ? `<span>Faith</span><b>${esc(F.name)}: ${fv > 1.15 ? 'fervent' : fv > 0.8 ? 'devout' : fv > 0.55 ? 'lukewarm' : 'mostly habit'}${F.corrupt > 0.55 ? ', priests grown rich' : ''}${F.reformed ? ', reformed' : ''}</b>` : ''}</div>`;
}
