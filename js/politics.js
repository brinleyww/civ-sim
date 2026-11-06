'use strict';
// Governments, rulers, factions, how realms feel about each other, alliances, and the paths a realm's habits carve out for it.

// st: rough stage of development. succ: how power passes. war/stab/res/trade/cons: how the system tends to behave. vote: holds elections.
const GOV = [
  { id: 'band', name: 'Band', ruler: ['Elder', 'Elder'], st: 0, succ: 'elder', war: 0, stab: 10, res: 1, trade: 1, cons: 1, about: 'A few families. Everyone knows everyone.' },
  { id: 'tribe', name: 'Tribe', ruler: ['Chieftess', 'Chief'], st: 1, succ: 'council', war: 0.6, stab: 5, res: 1, trade: 1, cons: 1.1, about: 'Clans under a leader who has to keep earning it.' },
  { id: 'chiefdom', name: 'Chiefdom', ruler: ['High Chieftess', 'High Chief'], st: 2, succ: 'heir', war: 1.1, stab: 0, res: 1, trade: 1, cons: 1.1, about: 'One family has risen over the rest.' },
  { id: 'confederacy', name: 'Confederacy', ruler: ['War Speaker', 'War Speaker'], st: 2, succ: 'council', war: 0.8, stab: 2, res: 1, trade: 1.05, cons: 1, about: 'Equal tribes who only agree when threatened.' },
  { id: 'citystate', name: 'City-State', ruler: ['Queen', 'King'], st: 3, succ: 'heir', war: 0.9, stab: 8, res: 1.08, trade: 1.1, cons: 0.9, about: 'One great town and its fields.' },
  { id: 'merchantrep', name: 'Merchant Republic', ruler: ['Doge', 'Doge'], st: 3, succ: 'merchants', war: 0.55, stab: 4, res: 1.08, trade: 1.35, cons: 0.7, vote: 1, about: 'Rich traders pick one of their own.' },
  { id: 'kingdom', name: 'Kingdom', ruler: ['Queen', 'King'], st: 4, succ: 'heir', war: 1.1, stab: 4, res: 1, trade: 1, cons: 1, about: 'A crown, a court and a dynasty.' },
  { id: 'feudal', name: 'Feudal Realm', ruler: ['Queen', 'King'], st: 4, succ: 'heir', war: 1.2, stab: -4, res: 0.92, trade: 0.95, cons: 1.15, about: 'Lords hold the land, and are loyal when it suits them.' },
  { id: 'theocracy', name: 'Theocracy', ruler: ['High Priestess', 'High Priest'], st: 4, succ: 'clergy', war: 1, stab: 10, res: 0.85, trade: 0.9, cons: 1, about: 'The temple rules.' },
  { id: 'despotism', name: 'Despotism', ruler: ['Tyrant', 'Tyrant'], st: 4, succ: 'strong', war: 1.5, stab: -14, res: 0.85, trade: 0.8, cons: 1.5, about: 'One person, and fear.' },
  { id: 'classical', name: 'Classical Republic', ruler: ['Consul', 'Consul'], st: 4, succ: 'vote', war: 0.85, stab: 5, res: 1.15, trade: 1.15, cons: 1, vote: 1, about: 'Citizens vote; slaves and strangers do not.' },
  { id: 'oligarchy', name: 'Oligarchy', ruler: ['First Citizen', 'First Citizen'], st: 4, succ: 'merchants', war: 0.8, stab: 0, res: 1, trade: 1.25, cons: 0.8, about: 'A handful of wealthy families.' },
  { id: 'empire', name: 'Empire', ruler: ['Empress', 'Emperor'], st: 5, succ: 'heir', war: 1.4, stab: -2, res: 1, trade: 1.05, cons: 1.2, about: 'Many peoples under one throne.' },
  { id: 'absolute', name: 'Absolute Monarchy', ruler: ['Queen', 'King'], st: 5, succ: 'heir', war: 1.15, stab: 5, res: 1.05, trade: 1, cons: 1.2, about: 'No parliament, no rival, one bureaucracy.' },
  { id: 'constmon', name: 'Constitutional Monarchy', ruler: ['Prime Minister', 'Prime Minister'], st: 6, succ: 'vote', war: 0.75, stab: 12, res: 1.15, trade: 1.2, cons: 0.9, vote: 1, about: 'A crown on the coins; the law above it.' },
  { id: 'republic', name: 'Republic', ruler: ['President', 'President'], st: 6, succ: 'vote', war: 0.8, stab: 8, res: 1.2, trade: 1.15, cons: 1, vote: 1, about: 'Elected government, no crown.' },
  { id: 'junta', name: 'Military Junta', ruler: ['Marshal', 'General'], st: 6, succ: 'strong', war: 1.7, stab: -10, res: 0.9, trade: 0.8, cons: 1.7, about: 'The army runs everything.' },
  { id: 'democracy', name: 'Democracy', ruler: ['President', 'President'], st: 7, succ: 'vote', war: 0.55, stab: 15, res: 1.3, trade: 1.25, cons: 0.8, vote: 1, about: 'Everyone votes. Slow to anger, hard to stop.' },
  { id: 'federation', name: 'Federation', ruler: ['Chancellor', 'Chancellor'], st: 7, succ: 'vote', war: 0.6, stab: 14, res: 1.25, trade: 1.3, cons: 0.9, vote: 1, about: 'States that keep their own laws.' },
  { id: 'socialist', name: 'Socialist State', ruler: ['General Secretary', 'General Secretary'], st: 7, succ: 'party', war: 1.05, stab: 3, res: 1.15, trade: 0.8, cons: 1.3, about: 'The party owns the factories.' },
  { id: 'corporate', name: 'Corporate State', ruler: ['Chief Executive', 'Chief Executive'], st: 8, succ: 'merchants', war: 0.85, stab: 6, res: 1.3, trade: 1.6, cons: 0.7, about: 'A board of directors with an army.' },
  { id: 'technocracy', name: 'Technocracy', ruler: ['Chief Scientist', 'Chief Scientist'], st: 8, succ: 'scholar', war: 0.5, stab: 12, res: 1.7, trade: 1.1, cons: 0.7, about: 'The experts decide.' },
];
const GOV_IX = {}; GOV.forEach((g, i) => { g.ix = i; GOV_IX[g.id] = i; });
const govSt = pol => GOV[pol.gov].st;
const polityTitle = pol => {
  const g = GOV[pol.gov];
  if (pol.rebel) return `${pol.name} Rising`;
  if (g.st <= 1) return `The ${pol.name} ${g.name}`;
  return `${g.name} of ${pol.name}`;
};

// ---- paths: what a realm keeps doing, it gets better at. Nobody picks; the people's work earns them. ----
const PATHS = [
  { id: 'con', name: 'Conquest', col: '#e0705a', about: 'Earned by soldiering and winning battles.', nodes: [
    { name: 'Warrior Code', fx: { attack: 1.08, morale: 4 } }, { name: 'Standing Army', fx: { morale: 8, war: 1.15 } }, { name: 'Military State', fx: { attack: 1.08, conscript: 1.2 } }, { name: 'Total Mobilisation', fx: { conscript: 1.3, morale: 10 } }, { name: 'Eternal Conquest', fx: { attack: 1.12, admin: 30, war: 1.2 } } ] },
  { id: 'fro', name: 'Frontier', col: '#c8a45a', about: 'Earned by founding new settlements.', nodes: [
    { name: 'Pioneers', fx: { colony: 1.3 } }, { name: 'Land Grants', fx: { colony: 1.3, fields: 0.5 } }, { name: 'Roads to Everywhere', fx: { admin: 20, speed: 1.05 } }, { name: 'Manifest Destiny', fx: { colony: 1.5, birth: 1.05 } }, { name: 'A Settled Continent', fx: { admin: 40, farm: 1.05 } } ] },
  { id: 'com', name: 'Commerce', col: '#e6c170', about: 'Earned by merchants on the road.', nodes: [
    { name: 'Open Markets', fx: { trade: 1.08, share: 1.3 } }, { name: 'Trade Law', fx: { trade: 1.08, order: 3 } }, { name: 'Merchant Houses', fx: { cargo: 1.2 } }, { name: 'Free Ports', fx: { trade: 1.15, share: 1.4 } }, { name: 'World Market', fx: { trade: 1.2, cargo: 1.2 } } ] },
  { id: 'mar', name: 'Maritime', col: '#7fc6d8', about: 'Earned by fishing and sailing.', nodes: [
    { name: 'Salt in the Blood', fx: { fish: 1.15 } }, { name: 'Pilots’ Guild', fx: { seaRange: 1.2 } }, { name: 'Naval Power', fx: { fleet: 1.5, seaRange: 1.1 } }, { name: 'Overseas Companies', fx: { fleet: 1.4, cargo: 1.15 } }, { name: 'Ruler of the Waves', fx: { fleet: 1.5, seaRange: 1.4 } } ] },
  { id: 'fai', name: 'Faith', col: '#c6b8e6', about: 'Earned by priests and public service.', nodes: [
    { name: 'Common Rites', fx: { happy: 4 } }, { name: 'Pilgrim Roads', fx: { happy: 3, trade: 1.05 } }, { name: 'Holy Orders', fx: { order: 5, health: 0.97 } }, { name: 'Sacred Law', fx: { order: 6, morale: 5 } }, { name: 'A City of God', fx: { happy: 8, order: 6 } } ] },
  { id: 'lea', name: 'Learning', col: '#9fb9ee', about: 'Earned by scholars at work.', nodes: [
    { name: 'Teachers', fx: { research: 1.06 } }, { name: 'Open Debate', fx: { research: 1.08, share: 1.2 } }, { name: 'Patronage', fx: { research: 1.1 } }, { name: 'Royal Societies', fx: { research: 1.12, spread: 1.3 } }, { name: 'Age of Reason', fx: { research: 1.2 } } ] },
  { id: 'med', name: 'Medicine', col: '#a7d48a', about: 'Earned by healers at work and towns that look after their sick.', nodes: [
    { name: 'Wise Women', fx: { health: 0.97, infant: 0.95 } }, { name: 'Physicians’ Guild', fx: { health: 0.96 } }, { name: 'Quarantine Laws', fx: { contagion: 0.75 } }, { name: 'Public Hospitals', fx: { health: 0.94, recover: 1.2 } }, { name: 'A Healthy Nation', fx: { health: 0.9, infant: 0.85, contagion: 0.75 } } ] },
  { id: 'trn', name: 'Transport', col: '#9fb9ee', about: 'Earned by carters, merchants and the roads they wear in.', nodes: [
    { name: 'Beasts of Burden', fx: { cargo: 1.1 } }, { name: 'Coaching Roads', fx: { speed: 1.04, admin: 10 } }, { name: 'Turnpike Trusts', fx: { cargo: 1.12, trade: 1.05 } }, { name: 'Iron Roads', fx: { speed: 1.06, admin: 25 } }, { name: 'A Connected Nation', fx: { speed: 1.08, cargo: 1.2, admin: 40 } } ] },
  { id: 'agr', name: 'Food & Farming', col: '#8cc66a', about: 'Earned by farmers, herders and planters.', nodes: [
    { name: 'Seed Saving', fx: { farm: 1.05 } }, { name: 'Common Fields', fx: { farm: 1.06, herd: 1.1 } }, { name: 'Granary State', fx: { spoil: 0.85, store: 1.2 } }, { name: 'Improvers', fx: { farm: 1.1, deplete: 0.8 } }, { name: 'Land of Plenty', fx: { farm: 1.15, birth: 1.08 } } ] },
  { id: 'ind', name: 'Industry', col: '#b0a090', about: 'Earned by miners and makers.', nodes: [
    { name: 'Workshop Towns', fx: { craft: 1.06 } }, { name: 'Deep Pits', fx: { mine: 1.1 } }, { name: 'Tool Makers', fx: { craft: 1.1, tier: 0.25 } }, { name: 'Mills & Engines', fx: { craft: 1.15, mine: 1.1 } }, { name: 'Workshop of the World', fx: { craft: 1.25, build: 1.1 } } ] },
  { id: 'civ', name: 'City Life', col: '#d8a07a', about: 'Earned by builders.', nodes: [
    { name: 'Street Plans', fx: { build: 1.05, urban: 30 } }, { name: 'Public Works', fx: { build: 1.08, urban: 80 } }, { name: 'Civic Pride', fx: { happy: 5, urban: 200 } }, { name: 'Grand Boulevards', fx: { urban: 600, order: 4 } }, { name: 'The Great City', fx: { urban: 2500, build: 1.15 } } ] },
];
const PATH_COST = [260, 1300, 5200, 20000, 70000];
const NP = PATHS.length, PATH_IX = {}; PATHS.forEach((P, i) => { P.ix = i; PATH_IX[P.id] = i; P.nodes.forEach((n, k) => { n.key = P.id + (k + 1); n.path = i; n.tier = k; }); });
const pathXP = (pol, id, v) => { pol.pxp[PATH_IX[id]] += v; };
function pathsYear(pol) {
  for (let i = 0; i < NP; i++) {
    const P = PATHS[i], have = pol.ptier[i];
    if (have >= P.nodes.length || pol.pxp[i] < PATH_COST[have]) continue;
    const node = P.nodes[have];
    pol.ptier[i] = have + 1;
    pol.nodes.push(node.key);
    rebuildPolFx(pol);
    for (const t of W.towns) if (t.polity === pol) recomputeMods(t);
    if (pol.pop >= 40 && pol.capital && have >= 1 && !pol.rebel) chronT('gov', `The ${polityTitle(pol)} is shaped by its ${P.name.toLowerCase()}: ${node.name}.`, pol.capital);
    return;
  }
}
function rebuildPolFx(pol) {
  const fx = pol.fx = {};
  for (const key of pol.nodes) {
    const n = PATHS[PATH_IX[key.slice(0, 3)]].nodes[+key.slice(3) - 1];
    for (const k in n.fx) {
      if (MOD_ADD[k]) fx[k] = (fx[k] || 0) + n.fx[k];
      else fx[k] = (fx[k] || 1) * n.fx[k];
    }
  }
}

// ---- standings between realms: -100 to 100, kept on both sides ----
const relOf = (a, b) => a.rel[b.id] || 0;
function adjustRel(a, b, d) {
  if (a === b) return;
  const v = clamp((a.rel[b.id] || 0) + d, -100, 100);
  a.rel[b.id] = v; b.rel[a.id] = v;
}
const REL_NAMES = [[60, 'Close friends', '#8cc66a'], [30, 'Friendly', '#a7d48a'], [10, 'Cordial', '#c8d4a0'], [-10, 'Neutral', '#c5bba6'], [-30, 'Wary', '#e6c170'], [-60, 'Hostile', '#e0a070'], [-101, 'Bitter enemies', '#e0705a']];
function relLabel(a, b) {
  if (atWar(a, b)) return ['At war', '#ff6a50'];
  if (a.allies.includes(b.id)) return ['Allied', '#7fd0a8'];
  if (a.overlord === b.id) return ['Overlord', '#9fb9ee'];
  if (b.overlord === a.id) return ['Vassal', '#9fb9ee'];
  const v = relOf(a, b);
  for (const [lim, name, col] of REL_NAMES) if (v >= lim) return [name, col];
  return ['Neutral', '#c5bba6'];
}
const areAllies = (a, b) => a.allies.includes(b.id);
function makeAlliance(a, b) {
  if (areAllies(a, b) || a === b) return;
  a.allies.push(b.id); b.allies.push(a.id);
  if (a.capital && (a.pop + b.pop >= 60)) chronT('gov', `${a.name} and ${b.name} swear an alliance.`, a.capital);
  adjustRel(a, b, 8);
}
function breakAlliance(a, b, why) {
  if (!areAllies(a, b)) return;
  a.allies.splice(a.allies.indexOf(b.id), 1); b.allies.splice(b.allies.indexOf(a.id), 1);
  adjustRel(a, b, -15);
  if (a.capital && (a.pop + b.pop >= 60)) chronT('gov', `The alliance between ${a.name} and ${b.name} ends${why ? ': ' + why : ''}.`, a.capital);
}
// Trade warms relations; crowded borders, old wars and rulers who look for trouble cool them.
function relationsYear() {
  const seen = new Map();
  const note = (a, b, trade) => {
    if (a === b) return;
    const lo = a.id < b.id ? a : b, hi = a.id < b.id ? b : a, key = lo.id * 100000 + hi.id;
    let e = seen.get(key);
    if (!e) seen.set(key, e = { a: lo, b: hi, n: 0 });
    e.n += trade;
  };
  for (const t of W.towns) {
    for (const o of t.partners) note(t.polity, o.polity, 1);
    if (t.seaPartners) for (const o of t.seaPartners) note(t.polity, o.polity, 1);
  }
  for (const e of seen.values()) {
    const { a, b } = e;
    if (!a.alive || !b.alive) continue;
    a.known[b.id] = 1; b.known[a.id] = 1;
    let d = Math.min(e.n, 8) * 0.12;
    if (a.culture === b.culture || a.culture.parent === b.culture.id || b.culture.parent === a.culture.id) d += 0.5;
    if (atWar(a, b)) d -= 2.5;
    else {
      if ((a.crowdMax > 1.1 || b.crowdMax > 1.1)) d -= 0.5;
      if (a.pop > b.pop * 4 || b.pop > a.pop * 4) d -= 0.25;
      if (a.ruler && a.ruler.alive) d += (1 - a.ruler.warM) * 0.8 + (a.ruler.leadM - 1) * 0.5;
      if (b.ruler && b.ruler.alive) d += (1 - b.ruler.warM) * 0.8 + (b.ruler.leadM - 1) * 0.5;
      const ga = GOV[a.gov], gb = GOV[b.gov];
      if (ga.st >= 5 && gb.st >= 5) d += !!ga.vote === !!gb.vote ? 0.3 : -0.5;
      if (a.count_embassy) d += 0.25;
      if (b.count_embassy) d += 0.25;
    }
    for (const k of a.allies) { if (b.warsWithAny && W.polities[k] && atWar(W.polities[k], b)) d -= 1; if (areAllies(W.polities[k], b)) d += 0.4; }
    for (const k in a.warsWith) if (b.warsWith[k]) { d += 1.2; break; }  // a shared enemy
    if (areAllies(a, b)) d += 0.3;
    const v = relOf(a, b);
    adjustRel(a, b, d - v * 0.012);
    const now = relOf(a, b);
    // gestures and incidents
    if (rnd() < 0.015 && !atWar(a, b)) {
      const good = rnd() < 0.5;
      adjustRel(a, b, good ? 6 + rint(10) : -(6 + rint(12)));
      if (a.pop + b.pop > 300 && rnd() < 0.3 && a.capital) chronT('misc', good ? `Envoys from ${b.name} bring gifts to ${a.name}.` : pick([`A border killing sours ${a.name} against ${b.name}.`, `Envoys of ${a.name} are insulted at the court of ${b.name}.`, `${a.name} and ${b.name} quarrel over grazing rights.`]), a.capital);
    }
    if (!atWar(a, b) && now >= 45 && a.allies.length < 3 && b.allies.length < 3 && govSt(a) >= 2 && govSt(b) >= 2 && !areAllies(a, b) && rnd() < 0.05) makeAlliance(a, b);
    if (areAllies(a, b) && now < 12 && rnd() < 0.2) breakAlliance(a, b, 'too many broken promises');
  }
  // a realm that lost a province to a rising doesn't make friends with it for a long time
  for (const a of W.polities) {
    if (!a.alive || !a.grudge) continue;
    for (const k in a.grudge) {
      const b = W.polities[+k], gr = b && b.alive ? grudgeOf(a, b) : 0;
      if (gr <= 0) { delete a.grudge[k]; continue; }
      if (relOf(a, b) > 15 - gr) a.rel[b.id] = b.rel[a.id] = 15 - gr;
    }
  }
}
const grudgeOf = (a, b) => { const g = a.grudge && a.grudge[b.id]; return g ? Math.max(0, g.v - (year() - g.yr)) : 0; };

// ---- moving a town between realms is the one place all of this has to stay consistent ----
function transferTown(t, np) {
  const old = t.polity;
  if (old === np) return;
  t.cash *= old.cur.value / Math.max(np.cur.value, 0.0001);
  old.towns--; t.polity = np; np.towns++;
  if (old.capital === t) old.capital = null;
  recomputeMods(t);
  W.terrDirty = true;
}

// ---- the yearly realm update ----
function updatePolities() {
  const yr = year();
  for (const pol of W.polities) {
    if (!pol.alive) continue;
    pol.towns = 0; pol.pop = 0; pol.capital2 = null; pol.best = 0; pol.settled = 0; pol.techs = 0; pol.era = 0;
    pol.know.fill(0); pol._fac = pol._fac || [0, 0, 0, 0, 0]; pol._fac.fill(0); pol._unrest = 0; pol.crowdMax = 0; pol.soldiers = 0; pol.count_embassy = 0;
  }
  for (const t of W.towns) {
    const pol = t.polity, n = tn(t);
    pol.towns++; pol.pop += n;
    if (!t.nomad) pol.settled++;
    if (n > pol.best) { pol.best = n; pol.capital2 = t; }
    if (pol.know.length < NT) pol.know = fitNT(pol.know, Uint8Array);  // saves from before the new inventions
    const kn = pol.know, tt = t.tech, K = techCache(t).known;
    for (let q = 0; q < K.length; q++) if (tt[K[q]]) kn[K[q]] = 1;
    const j = t.jobs, f = pol._fac;
    f[0] += (t.count.palace || 0) * 30 + (t.count.castle || 0) * 30 + n * 0.04;
    f[1] += j[J.TRADE] * 3 + j[J.CRAFT] * 0.8 + j[J.SAILOR] * 1.5 + (t.count.bank || 0) * 10;
    f[2] += j[J.SERVICE] * 2 + (t.count.temple || 0) * 12 + (t.count.cathedral || 0) * 30 + (t.count.monastery || 0) * 15;
    f[3] += (j[J.FARM] + j[J.CRAFT] + j[J.MINE]) * 0.3 + n * 0.05;
    f[4] += j[J.SOLDIER] * 2.5 + (t.count.barracks || 0) * 14;
    pol._unrest += (t.unrest || 0) * n;
    pol.soldiers += j[J.SOLDIER];
    if (t.crowd > pol.crowdMax) pol.crowdMax = t.crowd;
    if (t.count.embassy) pol.count_embassy = 1;
    // what the people did this year shapes where the realm is heading
    const a = t.pathAct;
    const px = pol.pxp, pi = PATH_IX;
    px[pi.agr] += a[J.FARM] + a[J.HERD] + a[J.GARDEN]; px[pi.com] += a[J.TRADE] * 1.5; px[pi.mar] += a[J.FISH] + a[J.SAILOR] * 2;
    px[pi.fai] += a[J.SERVICE] * 2; px[pi.lea] += a[J.SCHOLAR] * 2; px[pi.ind] += a[J.CRAFT] + a[J.MINE]; px[pi.civ] += a[J.BUILD]; px[pi.con] += a[J.SOLDIER];
    px[pi.med] += a[J.SERVICE] * 0.8 + t.care / 150; px[pi.trn] += a[J.TRADE] * 0.8 + Math.min(t.roadScore, 4000) * 0.0025 + (t.trans || 0) * 2;
    a.fill(0);
  }
  relationsYear();
  for (const pol of W.polities) {
    if (!pol.alive) continue;
    if (pol.towns === 0) {
      killPolity(pol, yr);
      continue;
    }
    pol.peak = Math.max(pol.peak, pol.pop);
    if (!pol.capital || !pol.capital.alive || pol.capital.polity !== pol) pol.capital = pol.capital2;
    else if (pol.capital2 && tn(pol.capital2) > tn(pol.capital) * 2.5) pol.capital = pol.capital2;
    const cap = pol.capital;
    if (!cap) continue;
    let c = 0; for (let i = 0; i < NT; i++) if (pol.know[i]) c++;
    pol.techs = c;
    pol.era = eraOfKnown(X => pol.know[X.ix]);
    const sum = pol._fac.reduce((s, v) => s + v, 1);
    pol.fac = pol._fac.map(v => v / sum);
    const unrest = pol._unrest / Math.max(pol.pop, 1);
    const g = GOV[pol.gov], rul = pol.ruler && pol.ruler.alive ? pol.ruler : null;
    let want = 55 + g.stab - unrest * 0.5;
    if (rul) want += (rul.leadM - 1) * 30;
    else want -= 15;
    for (const k in pol.warsWith) { want -= 8; break; }
    want -= Math.max(0, pol.towns - (6 + govSt(pol) * 2 + cap.mod.admin * 0.06)) * 2;
    pol.stab += (clamp(want, 0, 100) - pol.stab) * 0.08;

    pathsYear(pol);
    reviewGov(pol, yr);
    statecraftYear(pol, yr);
    if (!pol.ruler || !pol.ruler.alive) chooseRuler(pol, 'death');
    else if (GOV[pol.gov].vote && yr >= pol.termEnd) chooseRuler(pol, 'vote');
    if (pol.warCool > 0) pol.warCool--;
    if (govSt(pol) >= 2 && pol.warCool <= 0) considerWar(pol);
    if (pol.towns >= 3 && rnd() < 0.2) maybeRebel(pol);
    if (pol.overlord !== null) tributeYear(pol);
  }
  if (Math.floor(yr) % 5 === 0) geoYear();
  warsYear();
  if (W.wars.length && rnd() < 0.5) missileYear();
  for (const t of W.towns) tryUnion(t);
}
function killPolity(pol, yr) {
  pol.alive = false; pol.fell = Math.floor(yr);
  for (const id of pol.allies.slice()) { const o = W.polities[id]; if (o) o.allies.splice(o.allies.indexOf(pol.id), 1); }
  pol.allies.length = 0;
  for (const k in pol.warsWith) dropFromWar(pol, pol.warsWith[k]);
  if (pol.ruler && pol.rulers.length) { const r = pol.rulers[pol.rulers.length - 1]; if (r.to === null) r.to = Math.floor(yr); }
  if (pol.peak >= 60 && govSt(pol) >= 2 && !pol.rebel) chron('gov', `The ${polityTitle(pol)} is no more, after ${Math.floor(yr - pol.founded)} years.`);
}
function tributeYear(pol) {
  const o = W.polities[pol.overlord];
  if (!o || !o.alive || !o.capital || !pol.capital) { pol.overlord = null; return; }
  const a = pol.capital, b = o.capital;
  for (const r of [R.GOLD, R.GOODS, R.FOOD, R.TOOLS]) { const v = a.stock[r] * 0.04; a.stock[r] -= v; b.stock[r] += v; }
  if (pol.cur.kind >= 2) { const v = Math.max(0, pol.cur.treasury * 0.08); pol.cur.treasury -= v; pol.cur.spentY += v; o.cur.treasury += v * fx(pol, o); flow(pol, o, 'tribute', v * pol.cur.value); }
  // a vassal who has outgrown the master stops paying
  if (pol.pop > o.pop * 0.9 && rnd() < 0.1) {
    pol.overlord = null;
    adjustRel(pol, o, -20);
    chronT('gov', `${pol.name} stops paying tribute to ${o.name}.`, a);
  }
}

// How a government changes: slowly, from who holds power and what ideas have reached the capital; or suddenly, when it fails.
function setGov(pol, id, text) {
  const ix = GOV_IX[id];
  if (ix === pol.gov) return;
  const old = GOV[pol.gov];
  pol.gov = ix;
  pol.govCool = 15 + rint(20);
  pol.govSince = Math.floor(year());
  if (GOV[ix].st >= 3 || old.st >= 3) if (pol.capital) chronT('gov', text || `The ${polityTitle(pol)} is proclaimed at ${pol.capital.name}.`, pol.capital);
  if (old.succ !== GOV[ix].succ) pol.termEnd = 0;
}
function reviewGov(pol, yr) {
  const k = id => pol.know[TECH_IX[id]] === 1;
  const g = GOV[pol.gov], id = g.id, st = g.st, f = pol.fac, stab = pol.stab;
  const merchants = f[1], clergy = f[2], people = f[3], army = f[4];
  const rul = pol.ruler && pol.ruler.alive ? pol.ruler : null;
  if (pol.settled === 0) { if (id !== 'band') pol.gov = GOV_IX.band; return; }
  if (id === 'band') { pol.gov = GOV_IX.tribe; return; }
  if (pol.govCool > 0) { pol.govCool--; return; }
  // growth
  if (id === 'tribe' && (pol.pop >= 90 || pol.settled >= 3)) return setGov(pol, pol.settled >= 4 && rnd() < 0.3 ? 'confederacy' : 'chiefdom');
  if ((id === 'chiefdom' || id === 'confederacy') && k('writing')) {
    if (pol.settled <= 2) return setGov(pol, merchants > 0.3 ? 'merchantrep' : 'citystate');
    return setGov(pol, 'kingdom');
  }
  if ((id === 'chiefdom' || id === 'confederacy') && (pol.settled >= 5 || pol.pop >= 320)) return setGov(pol, 'kingdom');
  if ((id === 'citystate' || id === 'merchantrep') && pol.settled >= 4 && rnd() < 0.3) return setGov(pol, 'kingdom');
  if ((id === 'kingdom' || id === 'feudal') && pol.settled >= 8 && (k('law') || pol.settled >= 12)) return setGov(pol, 'empire', `${pol.name} now rules ${pol.towns} towns and calls itself an empire.`);
  if (id === 'kingdom' && k('feudalism') && pol.settled >= 5 && rnd() < 0.1) return setGov(pol, 'feudal', `${pol.name} parcels its lands out to sworn lords.`);
  if (id === 'kingdom' && clergy > 0.34 && k('priests') && rnd() < 0.05) return setGov(pol, 'theocracy', `The priests of ${pol.name} take the crown for the gods.`);
  if ((id === 'citystate' || id === 'kingdom') && k('citizenship') && pol.settled <= 6 && rnd() < 0.03) return setGov(pol, 'classical', `The people of ${pol.name} drive out the ${rul ? g.ruler[rul.sex === 0 ? 0 : 1].toLowerCase() : 'throne'} and vote for a republic.`);
  if ((id === 'citystate' || id === 'classical') && merchants > 0.38 && rnd() < 0.05) return setGov(pol, 'oligarchy', `A few merchant families now run ${pol.name}.`);
  if ((id === 'kingdom' || id === 'feudal' || id === 'empire') && k('absolutism') && rnd() < 0.1) return setGov(pol, 'absolute', `The nobles of ${pol.name} are brought to heel. There is one crown now, and no rival.`);
  // revolutions driven by ideas
  if (st >= 3 && st <= 5 && !g.vote && k('constitution')) {
    const press = (merchants + people) * (stab < 45 ? 0.2 : 0.05);
    if (rnd() < press) return setGov(pol, rnd() < 0.5 && (id === 'kingdom' || id === 'absolute') ? 'constmon' : 'republic', `Revolution in ${pol.name}. The ruler yields to a written constitution.`);
  }
  if (id === 'classical' && k('constitution') && rnd() < 0.08) return setGov(pol, 'republic', `${pol.name} writes its old liberties into a modern constitution.`);
  if ((id === 'classical' || id === 'oligarchy') && pol.settled >= 8 && !k('constitution') && rnd() < 0.06) return setGov(pol, 'empire', `A general of ${pol.name} takes the title of emperor, and the old republic ends.`);
  if ((id === 'constmon' || id === 'republic') && k('suffrage') && rnd() < 0.12) return setGov(pol, 'democracy', `${pol.name} extends the vote to everyone.`);
  if ((id === 'democracy' || id === 'republic') && pol.settled >= 10 && rnd() < 0.04) return setGov(pol, 'federation', `${pol.name} reorganises as a federation of states.`);
  if (st >= 5 && st <= 7 && id !== 'socialist' && k('socialism') && (pol.crowdMax > 1.05 || stab < 40) && people > 0.25 && rnd() < 0.05) return setGov(pol, 'socialist', `Workers seize the factories of ${pol.name}. A socialist state is declared.`);
  if (k('multinationals') && id !== 'corporate' && merchants > 0.42 && rnd() < 0.02) return setGov(pol, 'corporate', `The great companies of ${pol.name} now run the state outright.`);
  if (k('thinkingmachines') && id !== 'technocracy' && rnd() < 0.03) return setGov(pol, 'technocracy', `${pol.name} hands its government to its scientists and their machines.`);
  // failure
  if (st >= 4 && stab < 24 && army > 0.14 && id !== 'junta' && rnd() < 0.12) {
    if (rul) { rul.leader = false; pol.ruler = null; }
    if (pol.soc) pol.soc.usurp = Math.floor(yr) + 25;
    setGov(pol, st >= 5 ? 'junta' : 'despotism', `Soldiers seize power in ${pol.name}.`);
    return;
  }
  if (st >= 3 && st <= 5 && stab < 32 && rul && hasTrait(rul, 'cruel') && id !== 'despotism' && rnd() < 0.08) return setGov(pol, 'despotism', `${rul.name} throws out the old law of ${pol.name} and rules by fear.`);
  if ((id === 'despotism' || id === 'junta') && stab > 45 && rnd() < 0.05) return setGov(pol, k('constitution') ? 'republic' : st >= 5 ? 'absolute' : 'kingdom', `The hard years end in ${pol.name}. Something more settled takes their place.`);
}

// ---- rulers: chosen according to the government, and their temperament steers the realm ----
function chooseRuler(pol, why) {
  const c = pol.capital; if (!c) return;
  const g = GOV[pol.gov], old = pol.ruler;
  const can = c.members.filter(p => { const a = ageOf(p); return a >= 18 && a < 75 && !p.army && p.task !== T_MIGRATE; });
  if (!can.length) return;
  const score = p => {
    let s = p.fame + ageOf(p) * 0.02 + (p.leadM - 1) * 8;
    switch (g.succ) {
      case 'elder': s += ageOf(p) * 0.3; break;
      case 'clergy': if (hasTrait(p, 'pious')) s += 6; if (p.job === J.SERVICE) s += 4; break;
      case 'merchants': if (p.job === J.TRADE) s += 6; if (hasTrait(p, 'merchantborn')) s += 6; if (hasTrait(p, 'greedy')) s += 2; break;
      case 'strong': if (p.job === J.SOLDIER) s += 8; if (hasTrait(p, 'warhero')) s += 8; if (hasTrait(p, 'cruel')) s += 4; s += (p.warM - 1) * 6; break;
      case 'scholar': if (p.job === J.SCHOLAR) s += 8; s += (p.wisM - 1) * 6; break;
      case 'vote': case 'party': s += (p.leadM - 1) * 8 + rnd() * 5; break;
    }
    return s;
  };
  let next = null, how = '';
  // primogeniture across the whole realm, then kin of the house; a house that dies out may pass its crown by marriage
  if (old && g.succ === 'heir') { const h = heirOf(pol, old); next = h.p; how = h.kind; if (how === 'none' && personalUnion(pol, old)) { old.leader = false; return; } }
  if (!next) {
    let bs = -1e9;
    for (const p of can) { const s = score(p); if (s > bs) { bs = s; next = p; } }
  }
  const yr = Math.floor(year());
  if (old) {
    old.leader = false;
    const last = pol.rulers[pol.rulers.length - 1];
    if (last && last.to === null) { last.to = yr; last.epithet = epithetFor(old, pol, last); }
  }
  // a vote can return the same person
  if (next === old && old && old.alive) {
    old.leader = true;
    pol.rulers.push({ name: next.name, title: g.ruler[next.sex === 0 ? 0 : 1], from: yr, to: null, conq0: pol.conquests, epithet: '', sex: next.sex });
    pol.termEnd = yr + 6 + rint(4);
    return;
  }
  pol.ruler = next; next.leader = true; next.fame += 2;
  const title = g.ruler[next.sex === 0 ? 0 : 1];
  plog(next, `Became ${title} of the ${pol.name}.`);
  pol.rulers.push({ name: next.name, title, from: yr, to: null, conq0: pol.conquests, epithet: '', sex: next.sex });
  if (pol.rulers.length > 30) pol.rulers.shift();
  pol.termEnd = g.vote ? yr + 6 + rint(4) : 1e9;
  successionAfter(pol, old, next, how, why);
  if (g.st >= 3 && pol.pop >= 200) chronT('ruler', why === 'vote' ? `${next.name} wins the vote and becomes ${title} of ${pol.name}.` : `${title} ${next.name} ${old ? 'succeeds to rule' : 'comes to rule'} ${pol.name}.`, c);
  if (old && why === 'death' && !g.vote && g.st >= 3 && pol.towns >= (how === 'none' ? 3 : 5) && rnd() < 0.05 + pol.towns * 0.012 + (pol.stab < 35 ? 0.2 : 0) + succRisk(pol, how)) civilWar(pol);
}
function epithetFor(p, pol, rec) {
  const conq = pol.conquests - (rec.conq0 || 0), rule = (rec.to || 0) - rec.from;
  if (conq >= 5) return 'the Conqueror';
  if (conq >= 2 && hasTrait(p, 'cruel')) return 'the Butcher';
  if (hasTrait(p, 'cruel')) return 'the Cruel';
  if (hasTrait(p, 'genius') || hasTrait(p, 'wise')) return 'the Wise';
  if (hasTrait(p, 'kind')) return 'the Good';
  if (hasTrait(p, 'giant')) return 'the Giant';
  if (hasTrait(p, 'pious')) return 'the Pious';
  if (hasTrait(p, 'greedy')) return 'the Greedy';
  if (hasTrait(p, 'charismatic')) return 'the Beloved';
  if (rule >= 35) return 'the Old';
  if (rule <= 2) return 'the Brief';
  return '';
}
// Realms overreach: past what their roads and records can hold together, far-off towns start to slip away.
function maybeRebel(pol) {
  const cap = pol.capital; if (!cap || pol.rebel) return;
  const reach = 34 + cap.mod.admin + govSt(pol) * 3;
  const hold = 5 + govSt(pol) + cap.mod.admin * 0.08;
  const strain = (1 + Math.max(0, pol.towns - hold) * 0.35 + (W.people.length && pol.pop > W.people.length * 0.45 ? 1.5 : 0)) * clamp(1.7 - pol.stab / 50, 0.4, 2.5);
  for (const t of W.towns) {
    if (t.polity !== pol || t === cap || t.nomad || t.occupier || t.attack) continue;
    const d = Math.hypot(t.x - cap.x, t.y - cap.y);
    const unrest = ((d / reach) ** 2 * 0.012 + (t.famine > 0 ? 0.015 : 0) + (t.unrest || 0) * 0.0006) * strain * (t.crushed > year() - 25 ? 0.4 : 1);
    if (tn(t) >= 28 && rnd() < unrest) { startRevolt(pol, t); return; }
  }
}
// Breaking away takes a rising first. The town and any neighbours who share its grievances take up arms, the crown sends an army,
// and only if that army can't put them down (beaten, broke, busy with another war, or simply worn out) do they go free.
function startRevolt(pol, t) {
  const cap = pol.capital;
  if (!cap || pol.rebel || t.polity !== pol || t === cap || t.nomad || t.occupier || t.attack) return null;
  const yr = year();
  const np = secede(pol, t, 0, true);
  np.rebel = { from: pol.id, seat: t, start: yr, joined: 0, over: '' };
  np.mob = 0.6; np.support = 85; np.warCool = 99;
  for (const o of W.towns) {
    if (o.polity !== pol || o === cap || o.nomad || o.occupier || o.attack) continue;
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    if (d > 24) continue;
    const want = (o.unrest || 0) / 100 * 0.8 + (o.famine > 0 ? 0.2 : 0) + (o.culture !== cap.culture ? 0.15 : 0);
    if (rnd() < want * (1 - d / 30)) { transferTown(o, np); np.rebel.joined++; }
  }
  const j = np.rebel.joined;
  chronT('gov', `${t.name} rises against the ${polityTitle(pol)}${j ? `, and ${j === 1 ? 'a neighbouring town joins it' : j + ' neighbouring towns join it'}` : ''}.`, t);
  // the crown marches from its nearest loyal town that can raise a host
  let home = null, bd = 1e9;
  for (const o of W.towns) {
    if (o.polity !== pol || o.occupier || o.attack || o.nomad || tn(o) < 25 || W.landId[o.i] !== W.landId[t.i]) continue;
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    if (d < bd) { bd = d; home = o; }
  }
  pol.truce[np.id] = 0;
  const war = startWar(pol, np, 'revolt', home, t);
  // and the rebels arm themselves
  if (war && tn(t) >= 20) {
    const a = raiseArmy(t, t, war, 'relieve', true);
    if (a) chronT('war', `${menOf(a)} rebels take up arms in ${t.name}.`, t);
  }
  return war;
}
// Once a year while a rising lasts: it spreads, it gives up, or the crown does.
function revoltYear(war, yr, bal) {
  const crown = war.leadA, reb = war.leadB, age = yr - war.start;
  if (!reb.rebel) return;
  const seat = reb.rebel.seat;
  if (seat && seat.alive) for (const o of W.towns) {
    if (o.polity !== crown || o === crown.capital || o.occupier || o.attack || o.nomad) continue;
    const d = Math.hypot(o.x - seat.x, o.y - seat.y);
    if (d < 30 && rnd() < ((o.unrest || 0) / 100 * 0.25 + (crown.support < 30 ? 0.04 : 0)) * (1 - d / 34)) { transferTown(o, reb); chronT('gov', `${o.name} joins the ${war.name}.`, o); }
  }
  const held = seat && seat.alive && seat.polity === reb && !seat.occupier;
  // the rebels lay down their arms when the crown holds their country and their hearts have gone out of it
  if (bal > 30 && rnd() < 0.15 + war.exB * 0.6 + (held ? 0 : 0.3)) { endWar(war, 'a', 'capitulation'); return; }
  if (!held || age < 2) return;
  // the crown lets them go when it can't win, can't pay, is fighting someone else too, or has simply had enough
  const busy = Object.values(crown.warsWith).some(w => w !== war);
  const give = 0.02 + war.exA * 0.4 + Math.max(0, -bal) * 0.01 + (busy ? 0.08 : 0) + Math.max(0, age - 6) * 0.05 + Math.max(0, 30 - crown.support) * 0.01;
  if (rnd() < give) endWar(war, 'b', 'treaty');
}
// How a rising ends: crushed and its towns handed back, or free, with a realm of its own and a neighbour that won't forget it.
function revoltOver(war, winner) {
  const crown = war.leadA, reb = war.leadB, yr = year();
  if (!reb.rebel) return;
  const seat = reb.rebel.seat, start = Math.floor(reb.rebel.start), towns = W.towns.filter(t => t.polity === reb);
  const place = seat && seat.alive ? seat : crown.capital;
  if (winner === 'a' && crown.alive) {
    const cruel = crown.ruler && crown.ruler.alive && hasTrait(crown.ruler, 'cruel');
    let hanged = 0;
    for (const t of towns) {
      if (t.occupier) liberate(t, null);
      transferTown(t, crown);
      t.unrest = Math.min(100, (t.unrest || 0) + 15); t.crushed = yr;
      const n = Math.ceil(t.members.length * (cruel ? 0.05 : 0.015));
      for (let k = 0; k < n && t.members.length; k++) { const p = t.members[rint(t.members.length)]; if (!p.leader && !p.army) { killPerson(p, 'hanged after the rising'); hanged++; } }
      (t.risings = t.risings || []).push({ yr: start, end: Math.floor(yr), won: false, against: crown.name });
    }
    if (reb.ruler && reb.ruler.alive) { killPerson(reb.ruler, 'executed for leading a rising'); hanged++; }
    crown.stab = Math.max(0, crown.stab - 4);
    reb.rebel.over = 'crushed';
    if (place) chronT('gov', `The ${war.name} is crushed after ${Math.max(1, Math.round(yr - war.start))} years and ${war.dead} dead, and ${towns.length > 1 ? towns.length + ' towns go' : (seat && seat.alive ? seat.name : 'the town') + ' goes'} back to the ${polityTitle(crown)}${hanged ? `. ${hanged} are hanged for it` : ''}.`, place);
    return;
  }
  for (const t of towns) (t.risings = t.risings || []).push({ yr: start, end: Math.floor(yr), won: true, against: crown.name });
  reb.rebel = null;
  reb.rose = { from: crown.id, yr: start };
  reb.warCool = 20;
  if (crown.alive) {
    crown.grudge = crown.grudge || {};
    crown.grudge[reb.id] = { yr: Math.floor(yr), v: 60 + rint(30) };
    crown.lost = crown.lost || {}; crown.lost[reb.id] = yr;
    crown.stab = Math.max(0, crown.stab - 8);
    adjustRel(crown, reb, -50);
  }
  if (place) chronT('gov', `${seat && seat.alive ? seat.name : reb.name} wins its freedom from the ${polityTitle(crown)} after ${Math.max(1, Math.round(yr - war.start))} years and ${war.dead} dead, and the ${polityTitle(reb)} is born. ${crown.name} will not forget it.`, place);
}
function secede(pol, t, r, rising) {
  const c = rnd() < 0.5 ? makeCulture(t.culture) : t.culture;
  const np = newPolity(c, c === t.culture || rising ? t.name : c.name);
  transferTown(t, np);
  np.capital = t; np.gov = GOV.findIndex(g => g.st === Math.min(govSt(pol), 4)); np.warCool = 25;
  np.stab = 45; np.pxp.set(pol.pxp); np.pxp.forEach((v, i) => { np.pxp[i] = v * 0.4; });
  np.crops = pol.crops.slice();
  np.cur.kind = Math.min(pol.cur.kind, 2); np.cur.name = pol.cur.name === 'goods' ? 'goods' : `${np.name.slice(0, 5).toLowerCase()} ${pick(COIN_WORD)}`; np.cur.level = 1; np.cur.value = pol.cur.value * pol.cur.level;
  if (!rising) {
    chronT('gov', `${t.name} breaks away from the ${polityTitle(pol)} and founds the ${polityTitle(np)}.`, t);
    for (const o of W.towns) if (o !== t && o.polity === pol && o !== pol.capital && Math.hypot(o.x - t.x, o.y - t.y) < r && rnd() < 0.55) transferTown(o, np);
  }
  adjustRel(pol, np, -45);
  np.known[pol.id] = 1; pol.known[np.id] = 1;
  for (const k of pol.allies) np.rel[k] = (pol.rel[k] || 0) * 0.5;
  return np;
}
// A disputed succession can tear a big realm in two.
function civilWar(pol) {
  const towns = W.towns.filter(t => t.polity === pol && t !== pol.capital && !t.nomad && tn(t) >= 25);
  if (towns.length < 2) return;
  const far = towns.sort((a, b) => Math.hypot(b.x - pol.capital.x, b.y - pol.capital.y) - Math.hypot(a.x - pol.capital.x, a.y - pol.capital.y))[0];
  chronT('gov', `The death of the ruler of ${pol.name} sets rival heirs against each other.`, pol.capital);
  // the pretender's town rises, and wins its own realm only if the crown can't put it down
  startRevolt(pol, far);
}
// Small polities sometimes join a strong neighbour without a fight.
function tryUnion(t) {
  if (t.polity.capital !== t || t.polity.rebel || rnd() > 0.006) return;
  const old = t.polity;
  // a long-standing vassal that likes its overlord is folded in by treaty; two friendly crowns can marry into one
  if (old.overlord !== null) {
    const lord = W.polities[old.overlord];
    if (lord && lord.alive && relOf(old, lord) >= 35 && year() - old.founded > 40) {
      for (const q of W.towns.slice()) if (q.polity === old) transferTown(q, lord);
      chronT('gov', `${old.name} is folded into the ${polityTitle(lord)} by treaty, after years of paying tribute.`, t);
      return;
    }
  }
  for (const o of t.partners) {
    const np = o.polity;
    if (np === old || govSt(np) < 2 || atWar(old, np)) continue;
    const rel = relOf(old, np);
    const small = old.towns <= 1 && govSt(old) < 3 && tn(t) <= 60 && np.pop >= old.pop * 4 && rel >= -5;
    const wed = rel >= 62 && areAllies(old, np) && np.pop >= old.pop && old.culture.id === np.culture.id;
    if (!small && !wed) continue;
    for (const q of W.towns.slice()) if (q.polity === old) transferTown(q, np);
    chronT('gov', wed ? `A royal marriage joins ${old.name} to the ${polityTitle(np)}. No blood is spilled.` : `${t.name} pledges itself to the ${polityTitle(np)}.`, t);
    return;
  }
}
// What's under a realm's land shapes what it becomes. Compared against the rest of the world, whatever it has most of gives it a character of its own.
const GEO = {
  coal: { name: 'Coal country', test: t => t.near.coal, fx: { craft: 1.12, mine: 1.1 }, about: 'Seams under every hill. Furnaces never go out here.' },
  iron: { name: 'Iron hills', test: t => t.near.iron, fx: { attack: 1.08, craft: 1.05 }, about: 'Ore enough to arm everyone. Its smiths and soldiers are known for it.' },
  copper: { name: 'Bronze traders', test: t => t.near.copper + t.near.tin * 4, fx: { trade: 1.1, craft: 1.05 }, about: 'Everyone needs what comes out of these mines.' },
  gold: { name: 'Golden kingdom', test: t => t.near.gold * 3 + t.near.gems * 2, fx: { trade: 1.2, order: 3 }, about: 'Rich beyond sense, and everyone knows it.' },
  oil: { name: 'Oil state', test: t => t.near.oil * 3, fx: { cargo: 1.15, trade: 1.08 }, about: 'It sits on what the modern world runs on.' },
  salt: { name: 'Salt lords', test: t => t.near.salt * 2, fx: { spoil: 0.82, trade: 1.06 }, about: 'Food keeps here, and everyone pays for salt.' },
  sulfur: { name: 'Fire mountains', test: t => t.near.sulfur * 4, fx: { attack: 1.06, mine: 1.08 }, about: 'Brimstone in the rocks, and powder for anyone who pays.' },
  uranium: { name: 'Heavy earth', test: t => t.near.uranium * 5, fx: { research: 1.05 }, about: 'A strange glow in the old mountains.' },
  grain: { name: 'Breadbasket', test: t => t.sArable.length * 0.12, fx: { farm: 1.1, birth: 1.05 }, about: 'Deep soil as far as you can see.' },
  timber: { name: 'Timber realm', test: t => t.sTree.length * 0.12, fx: { wood: 1.2, build: 1.08 }, about: 'Forest to the horizon. Everything here is built of wood.' },
  fish: { name: 'Fisher folk', test: t => t.sBoat.length * 0.12, fx: { fish: 1.2, seaRange: 1.1 }, about: 'A people who look out to sea before they look anywhere else.' },
  stone: { name: 'Stone people', test: t => t.near.stone * 0.25, fx: { defend: 1.1, build: 1.05 }, about: 'Everything is built to last, and walls come easily.' },
};
function geoYear() {
  const keys = Object.keys(GEO), world = {}, count = W.towns.length || 1;
  for (const k of keys) { let s = 0; for (const t of W.towns) s += GEO[k].test(t); world[k] = s / count + 0.5; }
  for (const pol of W.polities) {
    if (!pol.alive || !pol.towns || govSt(pol) < 2) continue;
    let best = null, bs = 1.3;
    const list = W.towns.filter(t => t.polity === pol);
    for (const k of keys) { let s = 0; for (const t of list) s += GEO[k].test(t); s = s / Math.max(1, list.length) / world[k]; if (s > bs) { bs = s; best = k; } }
    if (best === pol.geo) continue;
    pol.geo = best; pol.geoFx = best ? GEO[best].fx : null;
    for (const t of list) recomputeMods(t);
    if (best && pol.capital && pol.pop > 80 && !pol.geoNote) { pol.geoNote = true; chronT('gov', `People have started calling the ${polityTitle(pol)} the ${GEO[best].name.toLowerCase()}. ${GEO[best].about}`, pol.capital); }
  }
}
