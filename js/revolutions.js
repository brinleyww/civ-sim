'use strict';
// The two revolutions that remade the world. Each realm goes through its own, stage by stage, at a pace set by what it knows and what
// pushes it: land hunger and markets for the farming one; coal, iron, capital, spare hands and markets for the industrial one.
// The first realm to start does it the hard way; those that follow copy machines, methods and engineers from realms already ahead.
// The Agricultural Revolution frees hands from the land, and without those hands the Industrial Revolution can't get far.

const AG_STAGES = [
  { name: 'New rotations', need: ['turnips'], alt: ['threefield', 'legumes'], about: 'Turnips and clover in the fallow year: fodder for more beasts, more dung, better grain.' },
  { name: 'Improved breeds', need: ['breeding'], about: 'Bigger sheep, heavier cattle, seed picked from the best plants.' },
  { name: 'Enclosure', need: ['enclosure'], about: 'Hedges round the old commons: bigger farms, and smallholders pushed off the land into the towns.' },
  { name: 'Drills and drains', need: ['seeddrill', 'drainage'], about: 'Seed sown in rows, wet land drained: the same fields grow far more.' },
  { name: 'Farm machines', need: ['reaper'], alt: ['steamplough'], about: 'Reapers and threshers: one family farms what a village used to.' },
];
const IND_STAGES = [
  { name: 'Cottage industry', need: ['weaving', 'currency'], about: 'Merchants put out wool to spin and weave in farmhouses, and pay by the piece.' },
  { name: 'Mechanised mills', need: ['factory'], alt: ['watermill', 'printing', 'banking'], about: 'Spinning frames on a river: one mill does the work of a whole valley of spinners.' },
  { name: 'Steam power', need: ['steam'], about: 'Engines that work anywhere there is coal, not just where a river runs.' },
  { name: 'Coal and iron', need: ['blast'], about: 'Coke-fired furnaces: iron by the ton, coal pits sunk everywhere.' },
  { name: 'The factory system', need: ['factory', 'steel'], about: 'Thousands under one roof, working to the clock.' },
  { name: 'Railways', need: ['railway'], about: 'Iron roads bind the factories to the mines, the ports and each other.' },
];
const revKnows = (pol, ids) => ids.every(id => pol.know[TECH_IX[id]] === 1);
const stageOpen = (pol, S) => revKnows(pol, S.need) || (S.alt && revKnows(pol, S.alt));
function newRev() { return { st: [], P: 0, began: -1, done: -1, said: 0 }; }

function revolutionsYear() {
  const alive = W.polities.filter(p => p.alive && p.towns > 0 && p.pop > 0);
  for (const pol of alive) {
    if (!pol.agRev) pol.agRev = newRev();
    if (!pol.indRev) pol.indRev = newRev();
  }
  for (const pol of alive) agYear(pol, alive);
  for (const pol of alive) indYear(pol, alive);
  for (const pol of alive) revEffects(pol);
}
// How far ahead are the realms this one knows about? Ideas, machines and people cross borders.
function contactLead(pol, alive, key) {
  let best = 0;
  for (const o of alive) if (o !== pol && pol.known[o.id] && !atWar(o, pol)) best = Math.max(best, o[key].P - pol[key].P);
  return clamp(best, 0, 1);
}
function advance(pol, R0, STAGES, rate) {
  for (let k = 0; k < STAGES.length; k++) {
    R0.st[k] = R0.st[k] || 0;
    if (R0.st[k] >= 1) continue;
    if (k > 0 && R0.st[k - 1] < 0.5) break;  // each stage needs the last well under way
    if (!stageOpen(pol, STAGES[k])) break;
    R0.st[k] = Math.min(1, R0.st[k] + rate * (0.7 + rnd() * 0.6));
    break;  // one stage moves at a time; the next opens once this one is half done
  }
  let s = 0; for (let k = 0; k < STAGES.length; k++) s += R0.st[k] || 0;
  R0.P = s / STAGES.length;
}
function realmTowns(pol) { return W.towns.filter(t => t.polity === pol && t.alive && !t.nomad); }

function agYear(pol, alive) {
  const R0 = pol.agRev, towns = realmTowns(pol);
  if (!towns.length || pol.pop < 300) return;
  const n = towns.reduce((s, t) => s + tn(t), 0);
  const land = towns.reduce((s, t) => s + (t.pushWhy === 'land' || t.crowd > 0.9 ? tn(t) : 0), 0) / n;
  const market = pol.cur && pol.cur.kind >= 2 ? 1 : 0.3;
  const learn = clamp(towns.reduce((s, t) => s + t.literacy * tn(t), 0) / n * 2 + (pol.know[TECH_IX.agsociety] ? 0.4 : 0) + (pol.know[TECH_IX.printing] ? 0.2 : 0), 0, 1);
  const rate = 0.012 + land * 0.05 + market * 0.02 + learn * 0.025 + contactLead(pol, alive, 'agRev') * 0.06;
  const before = R0.P, cradle = towns.reduce((a, t) => t.fields.length > a.fields.length ? t : a, towns[0]);
  advance(pol, R0, AG_STAGES, rate);
  const yr = Math.floor(year());
  if (R0.began < 0 && (R0.st[1] || 0) > 0) {
    R0.began = yr;
    const first = !W.agRevFirst;
    if (first) W.agRevFirst = pol.id;
    chronT('wonder', first ? `The Agricultural Revolution begins in ${pol.name}, in the fields round ${cradle.name}. Nobody alive has seen harvests like it.` : `The new farming reaches ${pol.name}: rotations, better breeds and hedged fields spread from parish to parish.`, cradle);
  }
  // enclosure: the hedges go up, the commons go, and the smallholders go to town
  if ((R0.st[2] || 0) > 0 && (R0.st[2] || 0) < 1) { urbanDrift(pol, towns, 0.012); for (const t of towns) if (tn(t) < 150) t.unrest = Math.min(100, t.unrest + 1.5); }
  if (before < 0.5 && R0.P >= 0.5 && R0.said < 1) { R0.said = 1; chronT('misc', `In ${pol.name} one farmer now feeds three families. The young walk to the towns to find work.`, cradle); }
  if (R0.done < 0 && R0.P >= 1) { R0.done = yr; chronT('wonder', `${pol.name}'s Agricultural Revolution is complete, ${yr - R0.began} years after it began.`, cradle); }
}

function indYear(pol, alive) {
  const R0 = pol.indRev, towns = realmTowns(pol);
  if (!towns.length || pol.pop < 400) return;
  const agP = pol.agRev ? pol.agRev.P : 0;
  const coal = towns.some(t => t.near.coal > 0) ? 1 : towns.some(t => t.stock[R.COAL] > 5) ? 0.6 : 0.1;
  const iron = towns.some(t => t.near.iron > 0) ? 1 : towns.some(t => t.stock[R.IRON] > 5) ? 0.6 : 0.15;
  const cur = pol.cur, rich = cur && cur.kind >= 2 ? clamp(cur.treasury / Math.max(1, cur.gdpLast || 1) + (pol.know[TECH_IX.banking] ? 0.3 : 0) + (pol.know[TECH_IX.stockmarket] ? 0.3 : 0), 0, 1) : 0;
  const hands = clamp(agP / 0.6, 0.15, 1);  // without the farming revolution there's nobody spare to work the machines
  const markets = clamp(towns.reduce((s, t) => s + (t.partners.length + (t.seaPartners ? t.seaPartners.length : 0)), 0) / 25, 0, 1);
  // cottage industry and the first mills come before the revolution proper; from steam on, it needs the hands the farms have freed
  const rate = (0.008 + coal * 0.025 + iron * 0.015 + rich * 0.025 + markets * 0.015 + contactLead(pol, alive, 'indRev') * 0.07) * (revStageNow(R0, IND_STAGES) >= 2 ? hands : 1);
  const before = R0.P, cradle = towns.reduce((a, t) => tn(t) > tn(a) ? t : a, towns[0]);
  advance(pol, R0, IND_STAGES, rate);
  const yr = Math.floor(year());
  if (R0.began < 0 && (R0.st[2] || 0) > 0) {
    R0.began = yr;
    const first = !W.indRevFirst;
    if (first) W.indRevFirst = pol.id;
    chronT('wonder', first ? `The Industrial Revolution begins in ${pol.name}. In ${cradle.name} the first mills turn, and the world will never be the same.` : `${pol.name} begins to industrialise, with machines and engineers from abroad.`, cradle);
  }
  // machine-breakers: the mills put the hand-weavers out of work, and they come at night with hammers
  if ((R0.st[1] || 0) > 0.3 && pol.know[TECH_IX.factory] && !(R0.said & 2)) { R0.said |= 2; cradle.unrest = Math.min(100, cradle.unrest + 15); chronT('misc', `Machine-breakers smash the new looms in ${cradle.name}. The hand-weavers say the mills have taken their bread.`, cradle); }
  if (R0.began >= 0) urbanDrift(pol, towns, 0.008 + R0.P * 0.012);
  if (before < 0.5 && R0.P >= 0.5 && !(R0.said & 4)) { R0.said |= 4; chronT('misc', `Smoke hangs over ${cradle.name}. Its mills and foundries never stop, and its streets fill with people from the country.`, cradle); }
  if (R0.done < 0 && R0.P >= 1) {
    R0.done = yr;
    const first = !W.indRevDone; if (first) W.indRevDone = pol.id;
    chronT('wonder', first ? `${pol.name} becomes the workshop of the world: its Industrial Revolution is complete.` : `${pol.name}'s Industrial Revolution is complete.`, cradle);
  }
}
// The countryside empties into the cities that have work: real people walk there, and the crowds they stand for follow.
function urbanDrift(pol, towns, share) {
  const cities = towns.filter(t => tn(t) >= 300 && t.crowd < 1.05 && !t.attack).sort((a, b) => tn(b) - tn(a));
  if (!cities.length) return;
  for (const t of towns) {
    if (tn(t) >= 300 || t.attack || t.occupier) continue;
    const go = Math.floor(tn(t) * share + rnd());
    if (go <= 0) continue;
    const to = cities[rint(Math.min(3, cities.length))];
    let moved = 0;
    if (t.folk > 0) { const f = Math.min(t.folk, go); t.folk -= f; to.folk += f; moved += f; }
    for (const p of t.members.slice()) {
      if (moved >= go) break;
      const a = ageOf(p);
      if (a < 16 || a > 40 || p.army || p.leader) continue;
      moveTo(p, to); startMigrate(p, nearTile(to.i, 4)); moved++;
    }
  }
}
// What each revolution does to every town in the realm, scaled by how far it has got.
function revEffects(pol) {
  const a = pol.agRev ? pol.agRev.P : 0, i0 = pol.indRev ? pol.indRev.P : 0, i = pol.indRev && pol.indRev.began >= 0 ? i0 : i0 * 0.4;  // cottage industry alone changes little
  const k = id => pol.know[TECH_IX[id]] === 1;
  const fx = {};
  if (a > 0) Object.assign(fx, { farm: 1 + 0.55 * a, herd: 1 + 0.35 * a, deplete: 1 - 0.35 * a, fields: 2.5 * a, famine: 1 + 0.3 * a, infant: 1 - 0.1 * a });
  if (i > 0) {
    Object.assign(fx, { craft: 1 + 1.4 * i, mine: 1 + 0.5 * i, build: 1 + 0.4 * i, cargo: 1 + 0.3 * i, research: 1 + 0.25 * i, trade: 1 + 0.2 * i, urban: Math.round(600 * i) });
    // the dark satanic mills: overcrowded, filthy and angry, until sanitation and unions catch up
    if (!k('sanitation')) fx.health = 1 + 0.15 * i;
    fx.happy = -5 * i + (k('unions') ? 3 * i : 0) + (k('welfare') ? 2 * i : 0);
    fx.order = -3 * i + (k('suffrage') ? 2 * i : 0);
  }
  const key = JSON.stringify(fx);
  if (key === pol.revKey) return;
  pol.revKey = key; pol.revFx = fx;
  for (const t of W.towns) if (t.polity === pol) recomputeMods(t);
}
const revStageNow = (R0, STAGES) => { for (let k = 0; k < STAGES.length; k++) if ((R0.st[k] || 0) < 1) return k; return STAGES.length; };
