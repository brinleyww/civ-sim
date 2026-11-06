'use strict';
// How ideas are found, guarded, kept and carried off. Loaded after society.js; everything here is reached through small hooks in
// discover(), willShare(), tryForget() and recomputeMods(), so nothing breaks if a tool leaves this file out.
// All new fields are optional: old saves simply start without them.

// ---- trade secrets: a few crafts were guarded for centuries (silk, porcelain, Greek fire); guild crafts less so ----
const SECRET = new Uint8Array(NT);
const SECRET_RE = /porcelain|celadon|silk|greek fire|damascus|wootz|crucible steel|gunpowder|saltpetre|tyrian|purple dye|lacquer|cloisonn|glassblow|venetian glass|crystal glass|mirror|enamel/i;
// ---- inventions that need real stuff to hand: smelting copper is no use with no copper ----
const INPUTS = [  // [bit, test]
  [1, t => (t.near.copper > 0 && t.near.tin > 0) || t.stock[R.BRONZE] >= 2 || (t.stock[R.COPPER] >= 1 && t.stock[R.TIN] >= 1)],
  [2, t => t.near.copper > 0 || t.stock[R.COPPER] >= 1 || t.stock[R.BRONZE] >= 2],
  [4, t => t.near.iron > 0 || t.stock[R.IRON] >= 2 || t.stock[R.STEEL] >= 2],
  [8, t => t.near.coal > 0 || t.stock[R.COAL] >= 2],
  [16, t => t.near.oil > 0 || t.stock[R.OIL] >= 1],
  [32, t => t.near.gold > 0 || t.stock[R.GOLD] >= 1],
  [64, t => t.near.salt > 0 || t.near.coast > 0 || t.stock[R.SALT] >= 1],  // salt pans count
  [128, t => t.near.sulfur > 0 || t.stock[R.SULFUR] >= 1],
  [256, t => t.near.tin > 0 || t.stock[R.TIN] >= 1 || t.stock[R.BRONZE] >= 2],
];
const GATE_ID = { bronze: 1, bronzearmor: 1, surgery: 1, copper: 2, iron: 4, blast: 4, steel: 4, ironplough: 4, ironclad: 4, saltworks: 64 };
function inputBit(T) {
  if (GATE_ID[T.id]) return GATE_ID[T.id];
  const n = T.name;
  if (/\bBronze\b|\bPewter\b/.test(n)) return 1;
  if (/\bTin\b/.test(n)) return 256;
  if (/\bCopper\b|\bBrass\b/.test(n)) return 2;
  if (/\bIron\b|\bSteel\b|Ironclad/.test(n)) return 4;
  if (/\bCoal\b|\bCoke\b|Coking/.test(n)) return 8;
  if (T.era >= 6 && /\bOil\b|Petrol|Kerosene|Diesel|Refin/.test(n) && !/Olive|Linseed|Whale|Palm|Seed|Paint|Lamp|Cooking/.test(n)) return 16;
  if (/\bGold\b|\bGilt\b|Gilding/.test(n)) return 32;
  if (/\bSalt\b|\bSalted\b|\bBrine\b/.test(n)) return 64;
  if (/Sulphur|Sulfur/.test(n)) return 128;
  return 0;
}
const GATE_IX = [], GATE_BIT = [], DEPS = Array.from({ length: NT }, () => null);
for (const T of TECHS) {
  if (!T.start && (SECRET_RE.test(T.name) || SECRET_RE.test(T.id)) && !/Road|Route|Trade/.test(T.name)) SECRET[T.ix] = 2;
  else if (T.side && T.dom === J.CRAFT && T.era >= 2 && T.era <= 6) SECRET[T.ix] = 1;  // guild work: only guarded where guilds exist
  const b = T.fx && Object.keys(T.fx).length ? inputBit(T) : 0;
  if (b) { GATE_IX.push(T.ix); GATE_BIT.push(b); }
  for (const r of T.reqIx) (DEPS[r] || (DEPS[r] = [])).push(T.ix);
}
const GATE_B = new Uint8Array(NT); for (let q = 0; q < GATE_IX.length; q++) GATE_B[GATE_IX[q]] = GATE_BIT[q];  // each idea's input bit, by index
const PATENT_IX = TECH_IX.patents === undefined ? -1 : TECH_IX.patents, GUILD_IX = TECH_IX.guilds;
const inputMask = t => { if (!t.near || t.near.copper === undefined) return 0; let m = 0; for (const [b, f] of INPUTS) if (f(t)) m |= b; return m; };
const GATE_KEEP = 0.35;  // what traders and scrap still let a town get out of it
const FLAG_FX = { sail: 1, trans: 1, paved: 1, planned: 1, keep: 1, rail: 1, car: 1, plane: 1, ski: 1, plough: 1, ev: 1, locks: 1 };

// Called from recomputeMods once every invention's fx is in: takes back most of what a town can't feed with its own inputs,
// then adds the realm's golden or dark age. Every change here is a plain scale, so nothing compounds.
function discoveryFx(t, m) {
  const mask = t._gate !== undefined ? t._gate : inputMask(t), tech = t.tech;
  // walk whichever is shorter: the gated ideas, or what the town knows (recomputeMods has just checked that list)
  const K = typeof techCache === 'function' ? techCache(t).known : null, byK = K && K.length < GATE_IX.length, n = byK ? K.length : GATE_IX.length;
  for (let q = 0; q < n; q++) {
    const ix = byK ? K[q] : GATE_IX[q], b = GATE_B[ix];
    if (!b || !tech[ix] || (mask & b)) continue;
    const fx = TECHS[ix].fx;
    for (const k in fx) {
      if (FLAG_FX[k]) continue;
      if (MOD_ADD[k]) m[k] -= fx[k] * (1 - GATE_KEEP);
      else if (fx[k] > 0) m[k] *= Math.pow(fx[k], GATE_KEEP - 1);
    }
  }
  const a = t.polity && t.polity.dAge;
  if (a === 1) { m.research *= 1.12; m.spread *= 1.1; }
  else if (a === -1) { m.research *= 0.85; m.spread *= 0.85; }
}

// ---- named inventors and ideas "in the air" ----
// Called from discover() once the inventor is chosen.
function discoverHook(t, T, who, first) {
  if (!first) return;
  const f = W.firsts[T.id];
  if (f && who) { f.wid = who.id; f.job = who.job; }
  // someone has done it: everyone who was close on the same problem now knows it can be done (Newton and Leibniz, Bell and Gray)
  const ix = T.ix, near = T.diff * 0.3, push = T.diff * 0.2;
  for (const o of W.towns) if (o !== t && o.alive && !o.tech[ix] && o.prog[ix] > near) o.prog[ix] += push;
  if (who) {
    const by = W.invBy || (W.invBy = {}), c = (by[who.id] || 0) + 1;
    by[who.id] = c;
    if (c === 3 || c === 6) {
      who.fame += 10;
      chronT('tech', c === 3 ? `${who.name} of ${t.name} has now made three things nobody had made before. People call them the cleverest mind of the age.` : `${who.name} of ${t.name}, with six firsts to their name, is the greatest inventor the world has known.`, t);
      plog(who, c === 3 ? 'Hailed as a great inventor.' : 'Hailed as the greatest inventor in the world.');
    }
  }
}

// ---- what crosses a border, and how readily: called from willShare(), returns a multiplier ----
function shareMul(seller, buyer, T) {
  let m = 1;
  const sp = seller.polity, bp = buyer.polity, f = W.firsts[T.id], age = f ? year() - f.year : 0;
  const sec = SECRET[T.ix];
  if (sec === 2 || (sec === 1 && seller.tech[GUILD_IX])) {
    // a guarded craft leaks only slowly, through runaway apprentices, smuggled seed and spies
    const lo = sec === 2 ? 0.2 : 0.55, leak = Math.min(1, age / (sec === 2 ? 300 : 150));
    m *= lo + (1 - lo) * leak;
  }
  // patents: the inventor's realm holds it close for twenty years
  if (PATENT_IX >= 0 && seller.tech[PATENT_IX] && f && f.pid === sp.id && age < 20) m *= 0.5;
  // real links: a shared faith, a trade route, a sea lane
  if (seller.faith >= 0 && seller.faith === buyer.faith) m *= 1.25;
  if (seller.partners.includes(buyer) || (seller.seaPartners && seller.seaPartners.includes(buyer))) m *= 1.2;
  if (sp.dAge === 1) m *= 1.15;
  if (bp.dAge === -1) m *= 0.8;
  if ((bp.warTired || 0) > 0.4) m *= 0.85;  // nobody has time for new ideas in a long war
  return m;
}

// ---- once a year per town, from tryForget ----
function discoveryYear(t) {
  const pol = t.polity, yr = Math.floor(year());
  if (t._gate === undefined) { t._gate = -1; t._dPol = pol.id; }
  const mask = inputMask(t);
  if (mask !== t._gate) { t._gate = mask; recomputeMods(t); }
  if (t._dPol !== pol.id) { const old = W.polities[t._dPol]; t._dPol = pol.id; if (old && (atWar(old, pol) || t.warYear > yr - 4)) spoils(t, pol); }
  if (pol.capital === t && pol.dY !== yr) { pol.dY = yr; realmAge(pol, yr); }
  practiceForget(t);
}

// A town taken in war gives up its learned men and its books: the conqueror's capital learns a little of what it knew.
function spoils(t, pol) {
  const cap = pol.capital;
  if (!cap || !cap.alive || cap === t || cap.polity !== pol) return;
  let best = -1, b2 = -1, s1 = -1, s2 = -1;
  for (let i = 0; i < NT; i++) {
    if (!t.tech[i] || cap.tech[i] || !eligible(cap, TECHS[i])) continue;
    const s = TECHS[i].era * 2 + (TECHS[i].side ? 0 : 3) + rnd();
    if (s > s1) { b2 = best; s2 = s1; best = i; s1 = s; } else if (s > s2) { b2 = i; s2 = s; }
  }
  if (best < 0) return;
  learn(cap, best);
  if (b2 >= 0 && eligible(cap, TECHS[b2])) learn(cap, b2);
  const T = TECHS[best];
  if (T.era >= 1 && tn(t) > 30) chronT('spread', `Scholars and craftsmen carried off from ${t.name} teach ${cap.name} ${T.name}.`, cap);
}

// Golden ages of learning need scholars, peace, order and money; dark ones follow collapse, plague and long war.
function realmAge(pol, yr) {
  let N = 0, S = 0, pop = 0, sick = 0, lit = 0;
  for (const o of W.towns) {
    if (o.polity !== pol || !o.alive) continue;
    const n = tn(o);
    N += o.members.length; S += o.jobs[J.SCHOLAR]; pop += n; lit += o.literacy * n;
    if (o.sick > 0) sick += o.plagueDead || 0;  // the dead of outbreaks still raging (people simulated, like N)
  }
  if (!N || !pop) return;
  lit /= pop;
  const pk = pol.dPk = Math.max(pop, (pol.dPk || pop) * 0.98);  // a fall measured against recent years, not a peak centuries gone
  const war = Object.keys(pol.warsWith).length > 0, tired = pol.warTired || 0, stab = pol.stab >= 0 ? pol.stab : 50;
  const rich = !pol.cur || pol.cur.kind < 2 || pol.cur.treasury > 0;
  const dark = (pk > 200 && pop < pk * 0.45) || sick > N * 0.08 || tired > 0.6 || stab < 18;
  const gold = !dark && pol.era >= 2 && pol.towns >= 2 && N >= 80 && S / N >= 0.035 && stab >= 60 && !war && tired < 0.1 && rich && lit >= 0.1;
  const was = pol.dAge || 0, cap = pol.capital, since = yr - (pol.dAgeY || 0);
  pol.dRun = gold ? (pol.dRun || 0) + 1 : 0;
  let now = was;
  if (dark && was !== -1) now = -1;
  else if (was === -1 && !dark && since >= 12) now = 0;
  else if (was === 0 && pol.dRun >= 3) now = 1;
  else if (was === 1 && !gold && since >= 15) now = 0;
  if (now === was) return;
  pol.dAge = now; pol.dAgeY = yr;
  for (const o of W.towns) if (o.polity === pol) recomputeMods(o);
  if (!cap || pol.pop < 150) return;
  const why = sick > N * 0.08 ? 'Plague has emptied the schools.' : tired > 0.6 ? 'Years of war have used up every hand and every coin.' : pk > 200 && pop < pk * 0.45 ? 'The realm is a shadow of what it was.' : 'Nobody can keep order long enough to think.';
  if (now === 1) chronT('tech', `A golden age of learning dawns in ${pol.name}. Scholars crowd ${cap.name}, and new ideas come thick and fast.`, cap);
  else if (now === -1) chronT('collapse', `${pol.name} sinks into a dark age. ${why}`, cap);
  else if (was === 1) chronT('tech', `The golden age of ${pol.name} fades.`, cap);
  else chronT('tech', `${pol.name} comes out of its dark age.`, cap);
}

// Know-how lives in hands: a small town with nobody doing that work loses the finer crafts first. A realm can teach them back.
function practiceForget(t) {
  const n = tn(t);
  if (n >= 150 || !t.members.length) return;
  const p = 0.08 * (1 - n / 150) * (t.mod.keep ? 0.35 : 1) * (t.polity.dAge === -1 ? 2 : 1);
  if (rnd() > p) return;
  const jobs = t.jobs, tech = t.tech;
  for (let k = 0; k < 40; k++) {
    const ix = rint(NT);
    if (!tech[ix]) continue;
    const T = TECHS[ix];
    if (!T.side || T.era < 1 || T.start || jobs[T.dom] > 0 || (T.alt && jobs[T.alt] > 0)) continue;
    const D = DEPS[ix];
    if (D) { let used = false; for (let q = 0; q < D.length; q++) if (tech[D[q]]) { used = true; break; } if (used) continue; }
    tech[ix] = 0;
    t.prog[ix] = Math.max(t.prog[ix], T.diff * 0.4);  // half-remembered: quicker to work out again
    recomputeMods(t);
    return;
  }
}
