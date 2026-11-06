'use strict';
// Cultures, polities (bands to empires), towns and everything a town decides: jobs, buildings, trade partners, inventions.

const year = () => W.tick / TPY;
const seasonOf = () => Math.floor(W.tick / TPSEASON) % 4;
const SEASON_NAME = ['Spring', 'Summer', 'Autumn', 'Winter'];
const tx = i => i % W.w, ty = i => (i / W.w) | 0;
const tdist = (a, b) => { const dx = a % W.w - b % W.w, dy = ((a / W.w) | 0) - ((b / W.w) | 0); return Math.sqrt(dx * dx + dy * dy); };
const ageOf = p => (W.tick - p.born) / TPY;

function chron(kind, text, x, y, town) {
  W.log.push({ yr: Math.floor(year()), kind, text, x: x === undefined ? -1 : x, y: y === undefined ? -1 : y, town: town ? town.id : -1 });
  if (W.log.length > 2500) W.log.splice(0, 500);
}
const chronT = (kind, text, t) => chron(kind, text, t.x, t.y, t);

// ---- languages: each culture has its own sounds, so names from one people look alike ----
const ONSETS = ['b', 'd', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'z', 'h', 'sh', 'th', 'kh', 'ch', 'y', 'f', 'dr', 'tr', 'gr', 'br', 'kr', 'st', 'q', 'j', 'w', 'ts'];
const VOWELS = ['a', 'e', 'i', 'o', 'u', 'a', 'e', 'i', 'ai', 'ei', 'ou', 'ia', 'ae', 'oa', 'y'];
const CODAS = ['', '', '', 'n', 'r', 'l', 's', 'th', 'm', 'k', 'sh', 'nd', 'rt', 'st', 'x', 'd'];
const TOWN_ENDS = ['a', 'ar', 'on', 'ia', 'or', 'um', 'et', 'an', 'is', 'ur', 'en', 'esh', 'ith', 'ak', 'os', 'ane', 'ul', 'ora', 'hal', 'mar', 'dun', 'ten', 'pur', 'gard'];
const sub = (a, n) => { const s = new Set(); while (s.size < n) s.add(pick(a)); return [...s]; };
function makeCulture(parent) {
  const c = {
    id: W.cultures.length, name: '',
    on: parent ? parent.on.slice() : sub(ONSETS, 7 + rint(5)),
    vo: parent ? parent.vo.slice() : sub(VOWELS, 3 + rint(3)),
    co: parent ? parent.co.slice() : sub(CODAS, 3 + rint(3)),
    ends: parent ? parent.ends.slice() : sub(TOWN_ENDS, 4 + rint(3)),
    fem: parent ? parent.fem : pick(['a', 'i', 'e', 'ia', 'ah', 'eth']),
    mas: parent ? parent.mas : pick(['', 'o', 'us', 'an', 'ir', 'ek']),
    hue: parent ? (parent.hue + 20 + rint(40)) % 360 : rint(360),
    skin: parent ? parent.skin : pick(['#f0c8a0', '#e0ac7c', '#c68b59', '#a06a3e', '#7c4f2c', '#5c3a21']),
    roof: parent ? parent.roof : rint(4), parent: parent ? parent.id : -1,
  };
  if (parent) { c.on[rint(c.on.length)] = pick(ONSETS); c.vo[rint(c.vo.length)] = pick(VOWELS); c.ends[rint(c.ends.length)] = pick(TOWN_ENDS); }
  c.name = cap(word(c, 2)) + pick(c.ends);
  W.cultures.push(c);
  return c;
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function word(c, syl) {
  let s = '';
  for (let i = 0; i < syl; i++) s += pick(c.on) + pick(c.vo) + (i === syl - 1 ? pick(c.co) : '');
  return s;
}
const townName = c => cap(word(c, 1 + rint(2))) + pick(c.ends);
const personName = (c, sex) => {
  const b = cap(word(c, 1 + rint(2)).replace(/[aeiouy]+$/, ''));
  return b + (sex === 0 ? c.fem : c.mas);
};

// ---- polities ----
function newPolity(culture, name) {
  const id = W.polities.length;
  if (!name) name = culture.name;
  for (let g = 0; g < 6 && W.polities.some(p => p.alive && p.name === name); g++) name = townName(culture);
  // the colour that's furthest from every realm alive right now, so no two neighbours are easily confused
  let hue = (id * 137.508 + culture.hue) % 360, gap = -1;
  for (let k = 0; k < 36; k++) {
    const h = k * 10 + culture.hue % 10;
    let near = 360;
    for (const o of W.polities) { if (!o.alive) continue; const d = Math.abs(h - o.hue), e = Math.min(d, 360 - d); if (e < near) near = e; }
    if (near > gap) { gap = near; hue = h; }
  }
  const light = [50, 62, 42][id % 3];
  const pol = { id, name, culture, gov: 0, color: `hsl(${hue.toFixed(0)},72%,${light}%)`, hue, light, capital: null, towns: 0, pop: 0, ruler: null, founded: Math.floor(year()), alive: true, warCool: 20 + rint(40), wars: 0, techs: 0, peak: 0, fell: 0, conquests: 0,
    rel: {}, known: {}, allies: [], cur: newCurrency(), warsWith: {}, truce: {}, overlord: null, infamy: 0, warTired: 0, mob: 0, lost: {}, armyN: 0, nodes: [], pxp: new Float32Array(NP), ptier: new Uint8Array(NP), fx: {}, stab: 60, fac: [0.2, 0.2, 0.2, 0.2, 0.2], _fac: [0, 0, 0, 0, 0], rulers: [], know: new Uint8Array(NT), crops: [], firsts: {}, termEnd: 0, agRev: null, indRev: null, revFx: null, revKey: '', govCool: 0, govSince: Math.floor(year()), crowdMax: 0, soldiers: 0, era: 0, sold: 0, bought: 0, support: 60, loansOut: 0, aidNote: 0, unpaidBy: {}, loanNote: 0, reliefNote: 0, capital2: undefined, best: undefined, settled: undefined, _unrest: undefined, lhY: undefined, lh: undefined, lhTown: undefined, geo: undefined, geoFx: undefined, geoNote: undefined, _wants: undefined, _wantsY: undefined, grudge: undefined, actY: undefined, actSum: undefined, firstWarship: undefined, rebel: undefined, rose: undefined };
  W.polities.push(pol);
  return pol;
}
// ---- towns ----
const MOD_MUL = ['farm', 'forage', 'hunt', 'fish', 'herd', 'wood', 'mine', 'build', 'craft', 'trade', 'cargo', 'speed', 'seaRange', 'health', 'infant', 'plague', 'spoil', 'store', 'deplete', 'cold', 'drought', 'attack', 'defend', 'research', 'spread', 'fire', 'war', 'conscript', 'colony', 'share', 'fleet', 'birth', 'contagion', 'recover', 'famine', 'slaughter', 'reserve'];
const MOD_ADD = { tier: 1, fields: 1, admin: 1, urban: 1, happy: 1, order: 1, morale: 1, relief: 1 };
function applyFx(m, fx, times) {
  for (const k in fx) {
    if (k === 'sail' || k === 'trans') m[k] = Math.max(m[k], fx[k]);
    else if (MOD_ADD[k]) m[k] += fx[k] * (times || 1);
    else if (k === 'paved' || k === 'planned' || k === 'keep' || k === 'rail' || k === 'car' || k === 'plane' || k === 'ski' || k === 'plough' || k === 'ev' || k === 'locks') m[k] = 1;
    else m[k] *= fx[k];
  }
}
function recomputeMods(t) {
  const m = t.mod;
  // every invention's fx, kept added up in the town's tech index (rebuilt if anything was forgotten behind its back)
  let C = techCache(t);
  for (let q = 0, K = C.known; q < K.length; q++) if (!t.tech[K[q]]) { techDirty(t); C = techCache(t); break; }
  const X = C.fx; for (const k in X) m[k] = X[k];
  if (typeof discoveryFx === 'function') discoveryFx(t, m);  // js/discovery.js: inputs to hand, golden and dark ages
  // what the realm has become, then what this town has actually built
  if (t.polity && t.polity.fx) applyFx(m, t.polity.fx);
  if (t.polity && t.polity.geoFx) applyFx(m, t.polity.geoFx);
  if (t.polity && t.polity.revFx) applyFx(m, t.polity.revFx);
  if (t.faith >= 0 && W.faiths && W.faiths[t.faith]) applyFx(m, faithFx(W.faiths[t.faith]));
  const B = bldMods(t);
  applyFx(m, B.fx);
  const fort = (t.walls ? (WALL_KIND[t.wallKind] || WALL_KIND[2]).fort : 0) + B.fort;
  t.fortMax = fort;
  t.care = B.care;  // how many people the town's healers can look after
  const K = id => t.tech[TECH_IX[id]];
  t.medQ = K('nanomed') ? 0.62 : K('pharma') ? 0.52 : K('antibiotics') ? 0.44 : K('nursing') ? 0.34 : K('sanitation') ? 0.3 : K('anatomy') ? 0.2 : K('hospitals') ? 0.16 : K('medicine') ? 0.13 : K('herbs') ? 0.07 : 0.03;
  if (fort > 0 && t.fortHP === 0 && !t.attack) t.fortHP = fort;
  if (t.fortHP > fort) t.fortHP = fort;
  // an engine needs something to burn: no oil, and it's back to trams and carts until the electric cars come
  t.trans = m.trans >= 5 && !m.ev && t.stock[R.OIL] < 1 ? Math.min(m.trans, 4) : m.trans;
  // the right trades filled, or not: see labourYear
  if (t.labQ && t.labQ !== 1) { m.craft *= t.labQ; m.build *= t.labQ; m.trade *= t.labQ; m.research *= Math.sqrt(t.labQ); }
  if (t.eduR && t.eduR !== 1) m.research *= t.eduR;  // graduates and good schools make inventors
  if (t.parkQ !== undefined && t.parkQ < 1) m.trade *= 0.95 + 0.05 * t.parkQ;  // drivers circling for a space, deliveries double-parked
  if (t.deskQ && t.deskQ < 1) { m.trade *= 0.9 + 0.1 * t.deskQ; m.research *= 0.92 + 0.08 * t.deskQ; }  // clerks in corridors: short of office space
}
// The buildings' share of a town's mods, added up once and kept until a building is finished or pulled down (both drop it), a quay
// is rebuilt (bumps t.hbV) or the town starts over (a fresh t.count). Transient, never saved.
const BLD_MODS = new WeakMap();
const bldModsDirty = t => BLD_MODS.delete(t);
function fxJoin(acc, fx) {  // the same rules as applyFx, gathered into one fx to apply later
  for (const k in fx) {
    const v = fx[k];
    if (k === 'sail' || k === 'trans') acc[k] = acc[k] === undefined ? v : Math.max(acc[k], v);
    else if (MOD_ADD[k]) acc[k] = (acc[k] || 0) + v;
    else if (k === 'paved' || k === 'planned' || k === 'keep' || k === 'rail' || k === 'car' || k === 'plane' || k === 'ski' || k === 'plough' || k === 'ev' || k === 'locks') acc[k] = 1;
    else acc[k] = (acc[k] === undefined ? 1 : acc[k]) * v;
  }
}
function bldMods(t) {
  let B = BLD_MODS.get(t);
  if (B && B.cnt === t.count && B.hb === t.hbV) return B;
  const fx = {}, cnt = t.count;
  let fort = 0, care = 0;
  for (let q = 0; q < BLD_FX.length; q++) {
    const id = BLD_FX[q], c = cnt[id];
    if (!c) continue;
    const def = BLD[id];
    if (def.fx) fxJoin(fx, def.fx);
    if (def.urban) fx.urban = (fx.urban || 0) + def.urban * c;
    if (def.happy) fx.happy = (fx.happy || 0) + def.happy * c;
    if (def.order) fx.order = (fx.order || 0) + def.order * c;
    if (def.fort) fort += def.fort * c;
    if (def.morale) fx.morale = (fx.morale || 0) + def.morale;
  }
  for (let q = 0; q < CARE_BLDS.length; q++) { const c = cnt[CARE_BLDS[q]]; if (c) care += BLD[CARE_BLDS[q]].care * c; }
  B = { cnt, hb: t.hbV, fx, fort, care };
  BLD_MODS.set(t, B);
  portStats(t);  // harbour level, yards and navy hang on the same counts
  return B;
}
// The share of a town that its healers can actually reach, counting the beds in its buildings and the people who do the caring.
const careCover = t => { const c = (t.care + t.jobs[J.SERVICE] * t.scale * 20) / Math.max(tn(t), 1); return c > 1 ? 1 : c; };
function newTown(pol, culture, i, nomad, name) {
  const t = {
    id: W.nextTown++, name: name || townName(culture), x: tx(i), y: ty(i), i, polity: pol, culture, nomad, founded: Math.floor(year()),
    members: [], blds: [], houses: [], queue: [], fields: [], mines: [], crafts: [], studies: [], services: [], depots: [], count: {},
    stock: new Float32Array(R.N), tech: new Uint8Array(NT), mod: {}, near: {}, jobs: new Int32Array(J.N), want: new Int32Array(J.N),
    prog: new Float32Array(NT), act: new Float32Array(J.N), pathAct: new Float32Array(J.N), needs: new Float32Array(TAGS.length), minds: new Float32Array(TAGS.length), arsenal: new Float32Array(WEAPONS.length), armor: new Float32Array(ARMORS.length), tanks: 0,
    cash: 0, outVal: 0, gdp: 0, gdpReal: 0, wage: 1, realWage: 1, gini: 0.3, price: Float32Array.from(VALUE), diet: new Float32Array(4), dietScore: 0.5, literacy: 0, smog: 0, faith: -1, ageSum: 0, ageN: 0, lifeExp: 30, folk: 0, scale: 1, trans: 0, geoNote: '', plots: [], plotC: new Int16Array(PLANTS.length), preyed: 0, occupier: null, occSince: 0, levy: 0, garrison: null,
    ec: null,
    ports: [], forts: [], ships: [], seaPartners: [], shipQ: null, portI: -1, portB: 0, portLv: 0, yards: 0, navy: 0, blockaded: 0, fortHP: 0, fortMax: 0, crowd: 0, support: 120, unrest: 0, workMul: 1, slumHz: 1, crowdBirth: 1, warExp: 0, armyCool: 0, frozeY: 0, sickY: 0,
    sForage: [], sTree: [], sStone: [], sClay: [], sOre: [], sFish: [], sBoat: [], sArable: [], sRoad: [], roadScore: 0, herds: [], partners: [],
    foodRate: 12, foodProd: 0, crop: 0, radius: 13, cap: 0, fcur: 0, famine: 0, sick: 0, attack: null, defenders0: 0,
    warYear: -999, tierName: '', alive: true, contacts: {}, walls: false, wallTiles: null, wallKind: 0, wallPath: null, wallGates: null, wallTowers: null, wallC: null, wallR: null, wallN: 0, wallY: -999, wallBox: null, wallOn: null, front: false, frontY: -1, spotMiss: null, clearY: -1, occN: null, occPay: null, occVac: null, eduMix: null, unemp: 0, displaced: 0, labQ: 1, hb: null, hbV: 0, portSt: null, gang: 1, boats: 0, boatsOut: 0, boatsSale: 0, boatsOrd: 0, sinceColony: 0, moved: 0,
    deathsY: 0, birthsY: 0, starvedY: 0, toolMul: 1, hasRail: 0, lastPlague: -99, monuments: 0, peak: 0, offset: rint(TPY),
    pushWhy: '', gamesY: -999, tourists: 0, blackout: -99, care: 0, medQ: 0.05, quarantined: -99, droughtNote: -99, floodNote: -99, soc: null,
    // fields other parts of the game fill in later, declared here (empty) so every town has the same shape and the hot loops stay fast
    nav: false, _outs: undefined, _outY: undefined, lastAct: undefined, lastTotal: undefined, edu: undefined, deskBy: undefined, deskNeedBy: undefined, desks: undefined, deskNeed: undefined, deskVac: undefined, deskRent: undefined, offPick: undefined, cars: undefined, parkNeed: undefined, parkHave: undefined, parkStreet: undefined, parkPick: undefined, boatsInit: undefined, storeBonus: undefined, plagueDead: undefined, plagueName: undefined, shipFill: undefined, spotMissN: undefined, noSiteY: undefined, ditchY: undefined, canalJob: undefined, ditchN: undefined, crushed: undefined, risings: undefined, buyMiss: undefined, boughtY: undefined, wasCity: undefined, shoreBuyY: undefined, settledBy: undefined, fairY: undefined, tameHerd: undefined, avT: undefined, avNote: undefined, slaughterY: undefined, boatsFirst: undefined, buyPlotY: undefined, buyPlotN: undefined, devN: undefined, devY: undefined, scorched: undefined, raidNote: undefined, wasMetropolis: undefined, famineNote: undefined,
  };
  W.towns.push(t);
  W.townById[t.id] = t;
  pol.towns++;
  recomputeMods(t);
  placeCenter(t);
  scanTown(t);
  return t;
}
function placeCenter(t) {
  const b = addBuilding(t, 'hearth', t.i, null, true);
  b.done = true;
  t.depots.push(b);
}
function townTier(t) {
  const n = tn(t);
  if (t.nomad) return 'Camp';
  return n < 30 ? 'Hamlet' : n < 90 ? 'Village' : n < 220 ? 'Town' : n < 550 ? 'City' : 'Metropolis';
}

// What a town can reach on foot. Rebuilt every year, so depleted forests and mined-out hills drop out by themselves.
function scanTown(t) {
  const w = W.w, h = W.h, r = t.radius, ro = r + 8;
  t.nav = !!(t.tech[TECH_IX.barges] || t.tech[TECH_IX.canals]);
  t.sForage.length = t.sTree.length = t.sStone.length = t.sClay.length = t.sOre.length = t.sFish.length = t.sBoat.length = t.sArable.length = t.sRoad.length = 0;
  let roads = 0;
  const near = t.near = { water: 0, fresh: 0, coast: 0, river: 0, wild: 0, wildBest: 0, domHerd: 0, horse: 0, clay: 0, stone: 0, copper: 0, tin: 0, iron: 0, coal: 0, oil: 0, gold: 0, salt: 0, sulfur: 0, uranium: 0, gems: 0 };
  const wildCount = [0, 0, 0, 0, 0, 0];
  const { water, river, forage, tree, ore, oreAmt, fert, occ, wild, fish, road, plant } = W;
  const crop = t.crop;
  for (let dy = -ro; dy <= ro; dy++) {
    const y = t.y + dy; if (y < 1 || y >= h - 1) continue;
    for (let dx = -ro; dx <= ro; dx++) {
      const x = t.x + dx; if (x < 1 || x >= w - 1) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 > ro * ro) continue;
      const i = y * w + x, inner = d2 <= r * r;
      if (water[i]) {
        if (inner && water[i] === 1 && fish[i] > 0 && (dx + dy) % 2 === 0) { t.sBoat.push(i); }
        if (W.biome[i] === B.LAKE) near.fresh++;
        continue;
      }
      if (ore[i] && oreAmt[i] > 0) {
        const o = ore[i];
        if (o === ORE.STONE) { near.stone++; if (inner) t.sStone.push(i); }
        else if (o === ORE.CLAY) { near.clay++; if (inner) t.sClay.push(i); }
        else {
          if (o === ORE.COPPER) near.copper++; else if (o === ORE.TIN) near.tin++; else if (o === ORE.IRON) near.iron++;
          else if (o === ORE.COAL) near.coal++; else if (o === ORE.OIL) near.oil++; else if (o === ORE.GOLD) near.gold++; else if (o === ORE.SALT) near.salt++; else if (o === ORE.SULFUR) near.sulfur++; else if (o === ORE.URANIUM) near.uranium++; else if (o === ORE.GEMS) near.gems++;
          t.sOre.push(i);
        }
      }
      if (!inner) continue;
      if (forage[i] > 0) t.sForage.push(i);
      if (tree[i] > 0) t.sTree.push(i);
      if (river[i]) { near.river++; near.fresh++; }
      if (road[i]) { roads += road[i]; t.sRoad.push(i); }
      if (wild[i]) { near.wild++; wildCount[wild[i]]++; }
      if (W.shoreDist[i] === 0) {
        let wet = false;
        for (let k = 0; k < 4; k++) { const ni = i + NB_D[k]; if (water[ni] === 1) { wet = true; if (W.biome[ni] === B.SHALLOW) near.coast++; } }
        if (wet) { near.water++; t.sFish.push(i); }
      }
      if (river[i]) { near.water++; if (fish[i] > 0) t.sFish.push(i); }
      if (t.nav) {
        // a bank a boat can tie up at
        let bank = false;
        for (let k = 0; k < 4; k++) { const ni = i + NB_D[k]; if (W.canal[ni] || river[ni] >= 3) bank = true; }
        if (bank && !river[i]) { t.sFish.push(i); near.coast++; }
      }
      if (occ[i] === 0 && fert[i] >= 40 && road[i] < 2 && river[i] < 2 && !ore[i] && !plant[i]) t.sArable.push(i);  // a creek runs through a field happily enough
    }
  }
  t.roadScore = roads;
  near.wildBest = 0; let bc = 0;
  for (let c = 1; c <= 5; c++) if (wildCount[c] > bc) { bc = wildCount[c]; near.wildBest = c; }
  t.herds.length = 0;
  for (const H of W.herds) {
    const dx = H.x - t.x, dy = H.y - t.y, d2 = dx * dx + dy * dy;
    if (d2 > (r + 6) * (r + 6) || H.n <= 0) continue;
    if (H.owner && H.owner !== t) continue;
    t.herds.push(H);
    const T = HERD_TYPES[H.type];
    if (T.dom) near.domHerd++;
    if (T.horse) near.horse++;
  }
}

function wantOf(t, r) {
  const n = tn(t) + 3, m = t.mod;
  switch (r) {
    case R.FOOD: return n * 6;
    case R.WOOD: return n * 1.6 + 14 + t.queue.length * 3;
    case R.STONE: return knows(t, 'masonry') ? n * 1.2 + 16 : 0;
    case R.CLAY: return knows(t, 'pottery') ? n * 0.5 + 8 : 0;
    case R.BRICK: return knows(t, 'mudbrick') ? n * 1.1 + 12 : 0;
    case R.COPPER: return knows(t, 'copper') && !t.tech[TECH_IX.blast] ? n * 0.25 + 8 : 0;
    case R.TIN: return knows(t, 'bronze') && !t.tech[TECH_IX.blast] ? n * 0.12 + 5 : 0;
    case R.IRON: return knows(t, 'iron') ? n * 0.35 + 8 : 0;
    case R.COAL: return knows(t, 'deepmine') ? n * 0.4 + 8 : 0;
    case R.BRONZE: return knows(t, 'copper') && !knows(t, 'iron') ? n * 0.2 + 4 : 0;
    case R.STEEL: return knows(t, 'iron') ? n * 0.3 + 6 : 0;
    case R.TOOLS: return m.tier > 0 || knows(t, 'copper') ? n * 0.3 + 3 : 0;
    case R.CLOTH: return knows(t, 'weaving') ? n * 0.25 + 3 : 0;
    case R.GOODS: return knows(t, 'pottery') ? n * 0.35 + 3 : 0;
    case R.OIL: return knows(t, 'combustion') ? n * 0.2 + 5 : 0;
    case R.GOLD: return knows(t, 'currency') ? n * 0.05 + 2 : 0;
    case R.SALT: return knows(t, 'saltworks') ? n * 0.06 + 3 : 0;
    case R.SULFUR: return knows(t, 'gunpowder') || knows(t, 'iron') ? n * 0.02 + 2 : 0;
    case R.URANIUM: return knows(t, 'nuclear') ? n * 0.005 + 2 : 0;
    case R.GEMS: return knows(t, 'currency') ? n * 0.015 + 1 : 0;
  }
  return 0;
}
const storeCap = t => (160 + tn(t) * 9 + (t.storeBonus || 0)) * t.mod.store;

// ---- jobs: every season the town shifts labour toward what it is short of ----
function planJobs(t) {
  const m = t.members, adults = [];
  const jobs = t.jobs; jobs.fill(0);
  for (let k = 0; k < m.length; k++) {
    const p = m[k], a = ageOf(p);
    if (p.army) { jobs[J.SOLDIER]++; continue; }
    if (a < 13) { p.job = J.CHILD; jobs[J.CHILD]++; continue; }
    // full-time students (not apprentices, who learn on the job) stay out of the workforce until they finish
    if (p.sch > 0 && a < 30 && !EDU_STAGES[p.sch - 1].work) { p.job = J.CHILD; jobs[J.CHILD]++; continue; }
    if (a >= 62) { p.job = J.ELDER; jobs[J.ELDER]++; continue; }
    adults.push(p);
  }
  const n = adults.length; if (!n) return;
  // demands are worked out for the whole population, then shared among the people being simulated one by one
  const pop = tn(t), sc = t.scale, st = t.stock, want = t.want; want.fill(0);
  const pst = govSt(t.polity), atW = Object.keys(t.polity.warsWith).length > 0;
  const yrs = st[R.FOOD] / (pop * 4 + 1) / t.mod.reserve;  // a town that has learned to keep reserves aims for bigger stores
  const need = pop * 4 * (yrs < 0.4 ? 1.5 : yrs < 1 ? 1.2 : yrs < 2.5 ? 1 : yrs < 5 ? 0.7 : 0.4);
  let foodW = clamp(Math.ceil(need / Math.max(2.5, t.foodRate)), Math.min(n, 1), yrs < 0.15 ? n : Math.ceil(n * 0.82));

  // who gets the food-worker slots depends on what the land offers
  const farmOK = knows(t, 'agriculture') && t.crop > 0 && (t.fields.length > 0 || t.sArable.length > 0);
  const fishOK = knows(t, 'fishing') && (t.sFish.length > 0 || t.sBoat.length > 0);
  const herdOK = t.tameHerd && t.tameHerd.n > 0;
  const huntN = t.herds.reduce((s, H) => s + (H.owner ? 0 : H.n), 0);
  let f = foodW;
  // there's only so much land to plough: past that, more farmers just get in each other's way
  const farmCap = farmOK ? Math.ceil((t.fields.length + t.sArable.length) / (4.5 + t.mod.fields) * 1.15 / sc) + 1 : 0;
  if (farmOK && pioneering(t)) {
    // nothing planted yet: a few break ground, the rest fish, hunt and gather until the first harvest
    const fa = Math.min(f, Math.max(2, Math.ceil(f * 0.3))); want[J.FARM] = fa; f -= fa;
    const fi = fishOK ? Math.min(f, Math.ceil(f * 0.45)) : 0; want[J.FISH] = fi; f -= fi;
    const hu = huntN > 3 ? Math.min(f, Math.ceil(f * 0.35)) : 0; want[J.HUNT] = hu; f -= hu;
    if (t.sForage.length > 0) want[J.FORAGE] = f; else want[fishOK ? J.FISH : J.HUNT] += f;
  } else if (farmOK) {
    const fi = fishOK ? Math.min(f, Math.ceil(f * 0.12)) : 0; want[J.FISH] = fi; f -= fi;
    const he = herdOK ? Math.min(f, Math.ceil(f * 0.14)) : 0; want[J.HERD] = he; f -= he;
    want[J.FARM] = Math.min(f, farmCap);
    const over = f - want[J.FARM];
    if (over > 0) {
      // the landless take to the boats and the herds where there are fish and beasts enough, and otherwise find other work
      const fishRoom = Math.max(0, Math.ceil((t.sFish.length + t.sBoat.length) / 4 / sc) - want[J.FISH]);
      const herdRoom = herdOK ? Math.max(0, Math.ceil(t.tameHerd.n / 5 / sc) - want[J.HERD]) : 0;
      const fo = fishOK ? Math.min(Math.ceil(over * 0.6), fishRoom) : 0, ho = Math.min(Math.ceil(over * 0.25), herdRoom);
      want[J.FISH] += fo; want[J.HERD] += ho;
      foodW -= Math.max(0, over - fo - ho);
    }
  } else {
    const he = herdOK ? Math.min(f, Math.ceil(f * 0.25)) : 0; want[J.HERD] = he; f -= he;
    const fi = fishOK ? Math.min(f, Math.ceil(f * (t.sBoat.length > 40 ? 0.5 : 0.3))) : 0; want[J.FISH] = fi; f -= fi;
    const hu = huntN > 3 ? Math.min(f, Math.ceil(f * 0.32)) : 0; want[J.HUNT] = hu; f -= hu;
    if (t.sForage.length > 0 || (!hu && !fi)) want[J.FORAGE] = f;
    else want[J.HUNT] += f;
  }
  let rest = n - foodW;
  const give = (job, c) => { c = Math.min(rest, Math.max(0, Math.ceil(c))); want[job] += c; rest -= c; };
  const short = r => { const w = wantOf(t, r); return w > 0 ? clamp(1 - st[r] / w, 0, 1) : 0; };
  // even a farming town keeps a few hunters, and more when something is killing its people
  if (farmOK && huntN > 3 && (t.preyed || !t.mod.car)) give(J.HUNT, Math.min(rest * 0.08, 1 + n * 0.01) + (t.preyed ? 3 : 0));
  else if (!farmOK && t.preyed && huntN > 0) give(J.HUNT, 3);
  // planters: anyone who's learned to grow something on purpose
  let plantable = false;
  for (let k = 1; k < PLANTS.length; k++) if (knows(t, PLANTS[k].tech)) { plantable = true; break; }
  if (plantable) give(J.GARDEN, Math.min(rest * (t.nomad ? 0.12 : 0.16), 1 + t.plots.length / 7 + (yrs < 1 ? 2 : 0) + n * 0.012));

  if (t.queue.length) give(J.BUILD, Math.min(t.queue.length * 2, rest * 0.34 + 1));
  if (t.sTree.length) give(J.WOOD, rest * 0.45 * short(R.WOOD) + 0.3);
  if (t.sOre.length && t.mines.length) {
    let mw = 0;
    for (const b of t.mines) { const o = oreRes(W.ore[b.i]); if (o >= 0 && st[o] < wantOf(t, o) * 1.4) mw += 2; }
    give(J.MINE, mw);
  }
  if (knows(t, 'pottery') && t.sClay.length) give(J.CLAY, rest * 0.25 * short(R.CLAY));
  if (t.sStone.length && wantOf(t, R.STONE) > 0) give(J.STONE, rest * 0.25 * short(R.STONE));
  if (t.crafts.length) {
    const c = t.crafts.length * (knows(t, 'factory') ? 4 : 1.5);
    give(J.CRAFT, Math.min(c, rest * 0.5));
  }
  if (t.partners.length && !t.nomad) give(J.TRADE, Math.max(1, (pop / 45 + (t.count.market || 0) * 2 + (t.count.dock || 0)) / sc));
  if (t.canalJob || t.fillJob) give(J.BUILD, Math.min(rest * 0.3, 6));
  const studySeats = t.studies.reduce((s, b) => s + (BLD[b.type].study || 0), 0);
  // clerks, tutors and people of leisure: a big town that can write has some scholars even where there's no room for a college
  const clerks = pop >= 150 && knows(t, 'writing') ? pop * (0.004 + t.literacy * 0.02) / sc : 0;
  if (studySeats || clerks) give(J.SCHOLAR, Math.min(studySeats + clerks, rest * 0.3));
  if (t.services.length) give(J.SERVICE, Math.min(t.services.reduce((s, b) => s + (BLD[b.type].service || 0), 0), rest * 0.3));
  if (pst >= 2 && pop >= 30) give(J.SOLDIER, Math.min(rest * 0.3, (pop * (atW ? 0.06 : 0.018) * GOV[t.polity.gov].cons * t.mod.conscript * (1 - (t.polity.cur.cut || 0) * 0.8) + (t.count.barracks ? 4 : 0)) / sc) - jobs[J.SOLDIER]);
  if (t.portLv) give(J.SAILOR, Math.min(rest * 0.25, t.ships.length * 1.5 + (t.shipQ ? 4 : 0) + t.portLv));

  // anyone left works wherever more would help
  if (rest > 0) {
    if (t.crafts.length && rest > 3) give(J.CRAFT, rest * 0.3);
    if (t.queue.length) give(J.BUILD, rest * 0.4);
    if (t.sTree.length && st[R.WOOD] < storeCap(t) * 0.8) give(J.WOOD, rest * 0.5);
    if (yrs > 4 && t.crafts.length) want[J.CRAFT] += rest;
    else if (farmOK && want[J.FARM] < farmCap) { const a = Math.min(rest, farmCap - want[J.FARM]); want[J.FARM] += a; rest -= a; if (rest > 0) want[t.crafts.length ? J.CRAFT : J.BUILD] += rest; }
    else if (farmOK) want[t.crafts.length ? J.CRAFT : fishOK ? J.FISH : J.BUILD] += rest;
    else if (t.sForage.length) want[J.FORAGE] += rest; else want[J.HUNT] += rest;
    rest = 0;
  }

  // keep people in their trade when possible
  const left = want.slice();
  const free = [], rest2 = [];
  for (let k = 0; k < n; k++) {
    const p = adults[k];
    if (left[p.job] > 0 && p.job > J.ELDER) { left[p.job]--; jobs[p.job]++; } else rest2.push(p);
  }
  // people with a knack go where it helps first
  for (let k = 0; k < rest2.length; k++) {
    const p = rest2[k];
    if (p.jb && left[p.jb] > 0) { p.job = p.jb; p.skill = 0; left[p.jb]--; jobs[p.jb]++; } else free.push(p);
  }
  let j = J.FORAGE;
  for (const p of free) {
    while (j < J.N && left[j] <= 0) j++;
    if (j >= J.N) { p.job = farmOK && jobs[J.FARM] < farmCap ? J.FARM : farmOK ? J.BUILD : J.FORAGE; jobs[p.job]++; continue; }
    if (p.job !== j) { p.job = j; p.skill = 0; }
    left[j]--; jobs[j]++;
  }
}
const oreRes = o => o === ORE.COPPER ? R.COPPER : o === ORE.TIN ? R.TIN : o === ORE.IRON ? R.IRON : o === ORE.COAL ? R.COAL : o === ORE.GOLD ? R.GOLD : o === ORE.OIL ? R.OIL : o === ORE.SALT ? R.SALT : o === ORE.SULFUR ? R.SULFUR : o === ORE.URANIUM ? R.URANIUM : o === ORE.GEMS ? R.GEMS : -1;

// ---- building ----
const canPay = (st, cost) => { for (const k in cost) if (st[k] < cost[k]) return false; return true; };
const pay = (st, cost) => { for (const k in cost) st[k] -= cost[k]; };
function updCost(i) {
  let c = W.baseCost[i];
  if (W.water[i]) { W.cost[i] = 255; return; }
  const r = W.road[i];
  if (r === 1) c = Math.min(c, Math.max(8, c * 0.75)); else if (r === 2) c = Math.min(c, 7); else if (r === 3) c = 5; else if (r >= 4) c = 4;
  if (r && W.rtype && W.rtype[i]) c = RT_FOOT[W.rtype[i]];  // on foot: easy along a street, all but forbidden along a motorway
  if (W.canal[i] && !r) c = Math.max(c, 80);  // a canal needs a bridge or a long way round
  if (W.occ[i] === 1) c = Math.max(c, 80);
  W.cost[i] = c;
}
function addBuilding(t, type, i, tier, instant) {
  const def = type === 'house' ? HOUSES[tier] : BLD[type];
  const size = def.size || 1;
  const b = { type, tier: tier === null ? 0 : tier, town: t, i, x: tx(i), y: ty(i), size, done: false, prog: 0, need: def.work || 50, res: 0, up: -1, id: W.nextId++, k: W.blds.length, ruin: false, ruinYear: 0, age: W.tick, name: '', var: rint(4), cars: 0 };
  W.blds.push(b);
  t.blds.push(b);
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
    const j = i + dx + dy * W.w;
    clearTile(j, t);
    W.occ[j] = 1; W.bAt.set(j, b);
    updCost(j); dirty(j);
  }
  if (!instant) t.queue.push(b);
  return b;
}
function clearTile(j, t) {
  if (W.occ[j] === 2 && t) { dropField(j); }
  if (W.occ[j] === 4 || W.occ[j] === 1) { const old = W.bAt.get(j); if (old) removeBuilding(old); }
  if (W.tree[j]) { W.tree[j] = 0; }
  W.forage[j] = 0;
  W.plant[j] = 0; W.plantS[j] = 0;
}
function dropField(j) {
  W.occ[j] = 0; W.stage[j] = 0;
  const own = W.townById[W.owner[j]];
  for (const tn of own ? [own] : W.towns) {
    const k = tn.fields.findIndex(f => f.i === j);
    if (k >= 0) { tn.fields.splice(k, 1); return; }
  }
  for (const tn of W.towns) { const k = tn.fields.findIndex(f => f.i === j); if (k >= 0) { tn.fields.splice(k, 1); return; } }
}
function removeBuilding(b) {
  const last = W.blds.pop();
  if (last !== b) { W.blds[b.k] = last; last.k = b.k; }
  for (let dy = 0; dy < b.size; dy++) for (let dx = 0; dx < b.size; dx++) {
    const j = b.i + dx + dy * W.w;
    W.occ[j] = 0; W.bAt.delete(j); updCost(j); dirty(j);
  }
  const t = b.town;
  if (t && !b.ruin) {
    const drop = a => { const k = a.indexOf(b); if (k >= 0) a.splice(k, 1); };
    drop(t.blds); drop(t.houses); drop(t.queue); drop(t.mines); drop(t.crafts); drop(t.studies); drop(t.services); drop(t.depots); drop(t.ports); drop(t.forts);
    if (b.type === 'house') { t.cap -= HOUSES[b.tier].cap; for (const p of t.members) if (p.home === b) p.home = null; }
    else if (b.done && t.count[b.type]) { t.count[b.type]--; bldModsDirty(t); }
    else if (!b.done && t.count['q_' + b.type]) t.count['q_' + b.type]--;
    const def = BLD[b.type];
    if (def && def.store && b.done) t.storeBonus = (t.storeBonus || 0) - def.store;
    if (b.done && b.type !== 'house') { t.portI = -1; if (BLD[b.type] && BLD[b.type].port) t.hbV = (t.hbV || 0) + 1; recomputeMods(t); }
  }
}
function finishBuilding(b) {
  const t = b.town;
  if (b.upT) { portRebuilt(b); return; }  // an old quay rebuilt as a newer one
  const k = t.queue.indexOf(b); if (k >= 0) t.queue.splice(k, 1);
  if (b.up >= 0) {  // an old house rebuilt in better materials
    t.cap += HOUSES[b.up].cap - HOUSES[b.tier].cap; b.tier = b.up; b.up = -1; b.prog = 0;
    if (HOUSES[b.tier].id === 'midrise') b.var = midStyle(t);
    dirtyB(b); return;
  }
  b.done = true;
  if (b.type === 'house') { t.houses.push(b); t.cap += HOUSES[b.tier].cap; return; }
  const def = BLD[b.type];
  t.count[b.type] = (t.count[b.type] || 0) + 1; bldModsDirty(t);
  if (t.count['q_' + b.type]) t.count['q_' + b.type]--;
  if (def.port) { t.ports.push(b); t.portI = -1; t.hbV = (t.hbV || 0) + 1; }
  if (def.fort || MIL_BASE[b.type]) t.forts.push(b);  // where standing soldiers drill and muster
  if (def.craft) t.crafts.push(b);
  if (def.study) t.studies.push(b);
  if (def.service) t.services.push(b);
  if (def.store) { t.storeBonus = (t.storeBonus || 0) + def.store; t.depots.push(b); }
  if (b.type === 'plaza') t.depots.push(b);
  if (b.type === 'mine' || b.type === 'oilwell') t.mines.push(b);
  if (b.type === 'monument') {
    t.monuments++;
    const era = maxEra(t);
    const kind = era <= 1 ? 'Stone Circle' : era === 2 ? pick(['Ziggurat', 'Great Pyramid', 'Sun Temple']) : era === 3 ? pick(['Colossus', 'Great Forum', 'Pantheon']) : era === 4 ? pick(['Cathedral', 'Great Mosque', 'Grand Pagoda']) : era === 5 ? pick(['Grand Dome', 'Royal Observatory']) : era === 6 ? pick(['Iron Tower', 'Crystal Hall']) : pick(['Sky Tower', 'Grand Arena']);
    b.name = `${kind} of ${t.name}`;
    b.era = era;
    chronT('wonder', `${t.name} completes the ${kind}. It took generations of labour.`, t);
  }
  if (b.type === 'palace') chronT('gov', `A palace rises in ${t.name}, seat of the ${polityTitle(t.polity)}.`, t);
  if (b.type === 'launchpad') chronT('wonder', `${t.name} builds a launch complex. Rockets stand against the sky.`, t);
  recomputeMods(t);
  if (b.type === 'merchantport' && tn(t) > 60) chronT('misc', `${t.name} opens a great merchant port.`, t);
  if (b.type === 'navalbase') chronT('war', `${t.name} becomes a military port of ${t.polity.name}.`, t);
  if (b.type === 'castle' || b.type === 'starfort') chronT('war', `${t.name} raises a ${def.name.toLowerCase()}.`, t);
  if (b.type === 'metro' && tn(t) > 800) chronT('wonder', `The first trains run under ${t.name}.`, t);
  if (b.type === 'cathedral') chronT('wonder', `After generations of work, the great cathedral of ${t.name} is finished.`, t);
}
const dirtyB = b => { for (let dy = 0; dy < b.size; dy++) for (let dx = 0; dx < b.size; dx++) dirty(b.i + dx + dy * W.w); };
function maxEra(t) { return techCache(t).era; }

function buildable(i, size, allowFields, allowPaths) {
  const w = W.w;
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
    const j = i + dx + dy * w;
    if (j >= W.occ.length || W.water[j] || W.river[j]) return false;
    const o = W.occ[j];
    if (o === 1 || o === 3) return false;
    if (o === 2 && !allowFields) return false;
    if (W.rail[j] || W.canal[j]) return false;
    const b = W.biome[j];
    if (b === B.ROCK && W.elev[j] > 0.62) return false;
    if (b === B.SNOW || W.snowD[j] > 200) return false;
    if (W.road[j] >= (allowPaths ? 2 : 1)) return false;  // paths stay paths: nobody builds across where everyone walks (but an airport out of town can take a footpath)
  }
  // a house won't stand on a cliff, and a big building needs fairly level ground
  if (slopeAt(i) > (size > 1 ? 0.11 : 0.17)) return false;
  return true;
}
// A new building mustn't wall anything in: at least a couple of open tiles around its edge, so people can get to it and past it.
function hasAccess(i, size) {
  const w = W.w;
  let free = 0;
  const open = j => j > 0 && j < W.occ.length && !W.water[j] && W.occ[j] !== 1 && W.occ[j] !== 3;
  for (let k = -1; k <= size; k++) { if (open(i + k - w)) free++; if (open(i + k + size * w)) free++; }
  for (let k = 0; k < size; k++) { if (open(i - 1 + k * w)) free++; if (open(i + size + k * w)) free++; }
  return free >= Math.max(3, size * 2 + 1);
}
// Older quarters grow organically round the centre; once Engineering arrives new streets follow a grid.
// A search that found nothing finds nothing again the same tick (planBuildings asks once per kind of building): remember the misses.
const FS_MISS = new Set(), FS_KIND = { shore: 1, river: 2, far: 3, stone: 4, ore: 5 };
let FS_TICK = -1;
function findSpot(t, size, kind, pref) {
  if (FS_TICK !== W.tick) { FS_MISS.clear(); FS_TICK = W.tick; }
  const mk = t.id * 1024 + size * 16 + (kind ? FS_KIND[kind] || 7 : 0) * 2 + (pref > 0 ? 1 : 0);
  if (FS_MISS.has(mk)) return -1;
  const best = findSpot0(t, size, kind, pref);
  if (best < 0) FS_MISS.add(mk);
  return best;
}
function findSpot0(t, size, kind, pref) {
  const w = W.w, n = tn(t);
  const r0 = 2 + Math.sqrt(t.blds.length + n * 0.1 + 12) * 0.85;
  let best = -1, bestS = -1e9;
  const tries = kind ? 50 : 26;
  for (let k = 0; k < tries; k++) {
    let i;
    if (kind === 'shore') {
      if (!t.sFish.length) return -1;
      i = pick(t.sFish); if (W.river[i]) continue;
      if (size > 1) i += (rint(5) - 2 - size + 1) + (rint(5) - 2 - size + 1) * w;
    }
    else if (kind === 'river') {
      const a = rnd() * 6.283, d = 1 + rnd() * t.radius;
      const qx = t.x + Math.round(Math.cos(a) * d);
      if (qx < 2 || qx >= w - 5) continue;
      i = (t.y + Math.round(Math.sin(a) * d)) * w + qx;
      if (i < w || i >= W.occ.length - w) continue;
      let wet = false; for (let q = 0; q < 8; q++) if (W.river[i + NB_D[q]]) wet = true;
      if (!wet) continue;
    } else {
      const a = rnd() * 6.283, d = (kind === 'far' ? r0 + 4 + rnd() * 8 : Math.sqrt(rnd()) * r0 * (1 + k / 22) + 0.5);
      const qx = t.x + Math.round(Math.cos(a) * d);
      if (qx < 2 || qx >= w - 5) continue;
      i = (t.y + Math.round(Math.sin(a) * d)) * w + qx;
    }
    if (i < w || i >= W.occ.length - w * 4) continue;
    if (!buildable(i, size, n > 60, kind === 'far') || !hasAccess(i, size)) continue;
    const s = spotScore(t, i, size, n, pref);
    if (s > bestS) { bestS = s; best = i; }
  }
  if (best < 0 && (!kind || kind === 'far')) best = findSpotWide(t, size, r0, pref, kind === 'far');
  if (best < 0 && kind === 'shore') best = findShoreWide(t, size);
  if (best < 0 && !kind && pref > 0 && n >= 150) best = buyPlot(t, size);  // dear central land: buy out old houses
  if (best >= 0 && kind === 'far') for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) { const j = best + dx + dy * w; if (W.road[j]) { W.road[j] = 0; W.wear[j] = 0; } }
  return best;
}
function spotScore(t, i, size, n, pref) {
  const x = tx(i), y = ty(i);
  const dx = x - t.x, dy = y - t.y;
  let s = -Math.sqrt(dx * dx + dy * dy) * 1.1 + rnd() * 2;
  let around = 0, roadNear = 0;
  for (let q = 0; q < 8; q++) { const ni = i + NB_D[q]; if (W.occ[ni] === 1) around++; if (W.road[ni] >= 1) roadNear++; }
  if (W.occ[i] === 2) s -= 3;
  if (W.ore[i] >= ORE.COPPER) s -= 6;
  s += Math.min(roadNear, 2) * 1.5;
  if (t.mod.planned && n > 80) {  // keep a street lattice clear
    const gx = ((dx % 5) + 5) % 5, gy = ((dy % 4) + 4) % 4;
    if (size === 1 && (gx === 0 || gy === 0)) s -= 8;
  } else {
    // older quarters wind: leave crooked lanes between the houses so people can get through
    const wob = (hash2(x >> 2, y >> 2, 57) * 3) | 0, gx = ((dx + wob) % 4 + 4) % 4, gy = ((dy + wob) % 3 + 3) % 3;
    if (size === 1 && gx === 0 && gy !== 1) s -= 7;
    if (size === 1 && gy === 0 && gx !== 2) s -= 7;
    if (around > 4) s -= (around - 4) * 3;
  }
  s -= W.elev[i] * 6 + slopeAt(i) * 45;
  // nobody builds high in the mountains or on a bog if they can help it, and a town grows round its water
  if (W.biome[i] === B.MARSH) s -= 4;
  // shops, offices and flats pay for dear land; farms and works go where it's cheap
  if (pref && W.land && n >= 60) s += pref * 8 * Math.min(1.5, landRel(t, i));
  return s;
}
// A big town's middle fills up, and a few random looks find nothing. Walk outward ring by ring until some real spots turn up;
// if there's still no room for something big, pull down a block of the oldest houses to make it.
function findSpotWide(t, size, r0, pref, far) {
  t.spotMiss = t.spotMiss || {};
  const mk = far ? size + 10 : size;
  if (t.spotMiss[mk] > W.tick) return -1;
  const w = W.w, n = tn(t), ph = rnd() * 6.283;
  let best = -1, bestS = -1e9, found = 0, looked = 0;
  // no room for a cottage means no room for anything bigger either: don't walk the rings again to find that out
  let boxed = false;
  if (!far) for (let s = 1; s < size; s++) if (t.spotMiss[s] > W.tick) { boxed = true; break; }
  // something that wants open country (an airport) looks well out past the houses
  if (!boxed) for (let d = Math.max(2, r0 * (far ? 1 : 0.7)); d < r0 * (far ? 5 : 3) + (far ? 24 : 8) && found < 8 && looked < (far ? 14000 : 7000); d += 1) {
    const steps = Math.ceil(d * 6.283);
    for (let s = 0; s < steps; s++) {
      const a = ph + s / steps * 6.283, x = Math.round(t.x + Math.cos(a) * d), y = Math.round(t.y + Math.sin(a) * d);
      if (x < 2 || x >= w - 5 || y < 1 || y >= W.h - 5) continue;
      const i = y * w + x; looked++;
      if (!buildable(i, size, n > 60, far) || !hasAccess(i, size)) continue;
      found++;
      const sc = spotScore(t, i, size, n, pref);
      if (sc > bestS) { bestS = sc; best = i; }
    }
  }
  if (best < 0 && size > 1 && n >= 250 && !far) best = clearOldQuarter(t, size);
  // a town boxed in by water, hills and its neighbours stays boxed in: each miss in a row waits longer before looking again (a season, up to a year)
  t.spotMissN = t.spotMissN || {};
  if (best < 0) { const k = t.spotMissN[mk] = Math.min(4, (t.spotMissN[mk] || 0) + 1); t.spotMiss[mk] = W.tick + (TPY >> 2) * k; }
  else t.spotMissN[mk] = 0;
  return best;
}
// The oldest houses near the middle come down, and their people move into whatever the town builds next.
function clearOldQuarter(t, size) {
  const yr = Math.floor(year());
  if (t.clearY === yr) return -1;
  const top = bestHouse(t), w = W.w;
  if (top <= 1) return -1;
  const old = t.houses.filter(b => b.size === 1 && b.done && b.up < 0 && b.tier < top && !b.ruin);
  old.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
  for (let k = 0; k < old.length && k < 60; k++) {
    const h = old[k];
    for (let oy = 0; oy < size; oy++) for (let ox = 0; ox < size; ox++) {
      const i = h.i - ox - oy * w, take = [];
      let ok = slopeAt(i) <= (size > 1 ? 0.11 : 0.17);
      for (let dy = 0; dy < size && ok; dy++) for (let dx = 0; dx < size && ok; dx++) {
        const j = i + dx + dy * w;
        if (j < w || j >= W.occ.length - w || W.water[j] || W.river[j] || W.road[j] >= 1 || W.rail[j] || W.canal[j] || W.occ[j] === 3) { ok = false; break; }
        if (W.occ[j] === 1) {
          const b = W.bAt.get(j);
          if (!b || b.town !== t || b.type !== 'house' || b.size !== 1 || !b.done || b.up >= 0 || b.tier >= top) ok = false;
          else if (!take.includes(b)) take.push(b);
        }
      }
      if (!ok || !take.length || !hasAccess(i, size)) continue;
      for (const b of take) removeBuilding(b);
      t.clearY = yr;
      return i;
    }
  }
  return -1;
}
function bestHouse(t) {
  if (t.nomad) return 0;
  for (let k = HOUSES.length - 1; k >= 1; k--) {
    const H = HOUSES[k];
    if (H.tech && !knows(t, H.tech)) continue;
    if (tn(t) < (H.minPop || 0)) continue;
    if (canPay(t.stock, H.cost)) return k;
  }
  return -1;
}
const Q_KEY = {}; for (const k in BLD) Q_KEY[k] = 'q_' + k;  // t.count's key for one queued, built once
// each building's tech as an index, in build order; made on first use since other files still reorder BUILD_ORDER as they load
const ordTix = L => Int32Array.from(L, id => BLD[id].tech ? (TECH_IX[BLD[id].tech] === undefined ? NT : TECH_IX[BLD[id].tech]) : -1);
const ORD_TIX = { bo: [], uo: [] };
function planBuildings(t) {
  const n = tn(t), st = t.stock;
  if (!n) return;
  const maxQ = Math.min(70, 2 + Math.floor(n / 25));
  // housing first
  let queuedCap = 0;
  for (const b of t.queue) if (b.type === 'house' && !b.done) queuedCap += HOUSES[b.tier].cap;
  let guard = 3 + Math.floor(n / 300);
  while (t.cap + queuedCap < n * 1.05 + 1 && t.queue.length < maxQ && guard-- > 0) {
    const tier = densityTier(t, bestHouse(t), n * 1.05 + 1 - t.cap - queuedCap);
    if (tier < 0) break;
    const i = findSpot(t, HOUSES[tier].size || 1, undefined, landPrefOf('house', tier, t));
    if (i < 0) break;
    pay(st, HOUSES[tier].cost);
    const nb = addBuilding(t, 'house', i, tier);
    if (HOUSES[tier].id === 'midrise') nb.var = midStyle(t);
    queuedCap += HOUSES[tier].cap;
  }
  if (t.nomad) return;
  // a crowded town builds what lets it hold more people before anything else
  let picks = 1 + Math.floor(n / 500);
  const tech = t.tech;
  const tryBuild = (id, tix) => {
    if (tix >= 0 && tech[tix] !== 1) return false;  // knows(t, def.tech), looked up once
    const def = BLD[id];
    const qk = Q_KEY[id] || 'q_' + id, have = (t.count[id] || 0) + (t.count[qk] || 0);
    if (have >= (def.urban ? 99 : def.craft ? 12 : 6) || have >= def.want(t)) return false;  // the cheap cap before want()
    const cost = canPay(st, def.cost) ? def.cost : (def.altCost && canPay(st, def.altCost)) ? def.altCost : null;
    if (!cost || !canFund(t, def.work)) return false;
    const i = findSpot(t, def.size, def.place, landPrefOf(id, 0, t));
    if (i < 0) return false;
    pay(st, cost);
    fund(t, def.work);
    addBuilding(t, id, i, null);
    t.count[qk] = (t.count[qk] || 0) + 1;
    return true;
  };
  if (ORD_TIX.bo.length !== BUILD_ORDER.length || ORD_TIX.uo.length !== URBAN_ORDER.length) { ORD_TIX.bo = ordTix(BUILD_ORDER); ORD_TIX.uo = ordTix(URBAN_ORDER); }
  const BT = ORD_TIX.bo, UT = ORD_TIX.uo;
  if (t.crowd > 0.85) for (let k = 0; k < URBAN_ORDER.length && t.queue.length < maxQ && picks > 0; k++) if (tryBuild(URBAN_ORDER[k], UT[k])) picks--;
  for (let k = 0; k < BUILD_ORDER.length && t.queue.length < maxQ && picks > 0; k++) if (tryBuild(BUILD_ORDER[k], BT[k])) picks--;
  // mines on deposits within reach
  if (t.queue.length < maxQ && t.sOre.length && tn(t) >= 25) planMine(t);
}
function planMine(t) {
  for (const [ore, tech] of [[ORE.COPPER, 'copper'], [ORE.TIN, 'copper'], [ORE.SALT, 'saltworks'], [ORE.IRON, 'iron'], [ORE.SULFUR, 'iron'], [ORE.COAL, 'deepmine'], [ORE.GOLD, 'currency'], [ORE.GEMS, 'currency'], [ORE.OIL, 'combustion'], [ORE.URANIUM, 'nuclear']]) {
    if (!knows(t, tech)) continue;
    const r = oreRes(ore);
    if (t.stock[r] > wantOf(t, r) && t.mines.length) continue;
    if (t.mines.some(b => W.ore[b.i] === ore) || t.queue.some(b => (b.type === 'mine' || b.type === 'oilwell') && W.ore[b.i] === ore)) continue;
    const type = ore === ORE.OIL ? 'oilwell' : 'mine', def = BLD[type];
    if (!canPay(t.stock, def.cost)) continue;
    let best = -1, bd = 1e9;
    for (const i of t.sOre) {
      if (W.ore[i] !== ore || W.occ[i] === 1) continue;
      const d = Math.abs(tx(i) - t.x) + Math.abs(ty(i) - t.y);
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) continue;
    pay(t.stock, def.cost);
    addBuilding(t, type, best, null);
    return;
  }
}
function upgradeHouses(t) {
  const tier = bestHouse(t);
  const n = tn(t);
  if (tier <= 1 || t.queue.length > 3 + n / 150) return;
  if (HOUSES[tier].minPop && t.cap > n * 1.4) return;  // no towers without the crowd to fill them
  if (HOUSES[tier].size > 1) return;  // the biggest blocks are built new, not rebuilt from a house
  const old = t.houses.filter(b => b.tier < tier && b.up < 0 && b.size === 1);
  if (!old.length) return;
  // central houses get rebuilt first
  old.sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y));
  for (let k = 0, c = 1 + Math.floor(n / 800); k < old.length && k < c; k++) {
    if (!canPay(t.stock, HOUSES[tier].cost)) return;
    const b = old[k];
    pay(t.stock, HOUSES[tier].cost);
    b.up = tier; b.prog = 0; b.need = HOUSES[tier].work;
    t.queue.push(b);
    dirtyB(b);
  }
}
// ---- inventions and how they spread ----
// Each town's tech index: what it knows, the fx of all that added up, its latest age, and the frontier (ideas not known whose
// every prerequisite is). Transient, kept in a WeakMap so it is never saved; built on first use, and again after a forgetting.
const TECH_KIDS = Array.from({ length: NT }, () => []);
for (const T of TECHS) for (const r of T.reqIx) TECH_KIDS[r].push(T.ix);
const NT_INV = TECHS.filter(T => !T.start).length;
const TECH_IDX = new WeakMap();
const fitNT = (a, Ty) => { if (a && a.length >= NT) return a; const b = new Ty(NT); if (a) b.set(a); return b; };  // saves from before the new inventions
function canStudy(t, i) {
  const T = TECHS[i];
  if (!T.dom || T.start || t.tech[i]) return false;
  for (const r of T.reqIx) if (!t.tech[r]) return false;
  return true;
}
function techCache(t) {
  let C = TECH_IDX.get(t);
  if (C && C.tech === t.tech) return C;
  if (t.tech.length < NT) { t.tech = fitNT(t.tech, Uint8Array); t.prog = fitNT(t.prog, Float32Array); }
  const m = {}, tech = t.tech;
  for (const k of MOD_MUL) m[k] = 1;
  m.sail = 0; m.trans = 0; m.ski = 0; m.plough = 0; m.ev = 0; m.locks = 0; m.tier = 0; m.fields = 0; m.admin = 0; m.paved = 0; m.planned = 0; m.keep = 0; m.rail = 0; m.car = 0; m.plane = 0; m.urban = 0; m.happy = 0; m.order = 0; m.morale = 0; m.relief = 0;
  C = { tech, known: [], front: [], inF: new Uint8Array(NT), fx: m, era: 0 };
  for (let i = 0; i < NT; i++) {
    if (tech[i]) { C.known.push(i); const T = TECHS[i]; if (T.fx) applyFx(m, T.fx); if (T.era > C.era) C.era = T.era; }
    else if (canStudy(t, i)) { C.inF[i] = 1; C.front.push(i); }
  }
  TECH_IDX.set(t, C);
  return C;
}
const techDirty = t => TECH_IDX.delete(t);  // call after writing t.tech other than through learn()
function techGain(t, ix) {  // learn()'s hook: keeps the index in step
  const C = TECH_IDX.get(t);
  if (!C || C.tech !== t.tech) return;
  const T = TECHS[ix];
  C.known.push(ix);
  if (T.fx) applyFx(C.fx, T.fx);
  if (T.era > C.era) C.era = T.era;
  for (const k of TECH_KIDS[ix]) if (!C.inF[k] && canStudy(t, k)) { C.inF[k] = 1; C.front.push(k); }
}
function learn(t, ix, quiet) {
  if (t.tech[ix]) return;
  t.tech[ix] = 1;
  techGain(t, ix);
  recomputeMods(t);
  const T = TECHS[ix];
  if (T.id === 'agriculture') settleCrop(t);
  if (T.id === 'husbandry') tameHerd(t);
}
// A town grows what its land offers, or what its realm and trading partners have shown it.
function settleCrop(t) {
  if (t.crop) return;
  const cands = [];
  if (t.near.wildBest) cands.push(t.near.wildBest);
  for (const c of t.polity.crops) if (!cands.includes(c)) cands.push(c);
  for (const o of t.partners) if (o.crop && !cands.includes(o.crop)) cands.push(o.crop);
  let best = 0, bs = 0;
  for (const c of cands) {
    let s = cropSuit(c, t.i);
    for (let k = 0; k < 10 && t.sArable.length; k++) s += cropSuit(c, pick(t.sArable));
    s = s / (t.sArable.length ? 11 : 1) * CROPS[c].yield;
    if (s > bs) { bs = s; best = c; }
  }
  if (bs > 0.08) { t.crop = best; if (!t.polity.crops.includes(best)) t.polity.crops.push(best); }
}
function settleDown(t) {
  t.nomad = false;
  chronT('found', `The band at ${t.name} stops wandering and builds a permanent village.`, t);
}
function tameHerd(t) {
  if (t.tameHerd) return;
  const H = t.herds.filter(h => HERD_TYPES[h.type].dom && !h.owner && h.n > 0).sort((a, b) => b.n - a.n)[0];
  if (!H) {
    t.tameHerd = { id: W.nextId++, x: t.x + 2, y: t.y + 2, type: 4, n: 4, tx: t.x, ty: t.y, owner: t };
    W.herds.push(t.tameHerd);
    return;
  }
  const take = Math.min(H.n, 5);
  H.n -= take;
  t.tameHerd = { id: W.nextId++, x: H.x, y: H.y, type: H.type, n: take, tx: t.x, ty: t.y, owner: t };
  W.herds.push(t.tameHerd);
}
const NEED_WHY = { farm: 'Hunger drove them to it.', nature: 'Hunger drove them to it.', warm: 'Too many had frozen.', med: 'Too many had died of sickness.', war: 'War taught them.', metal: 'They were desperate for better tools.', urban: 'The town had grown too crowded to bear.', energy: 'The forests were running out.', build: 'There was never enough room.', law: 'The town was close to riot.', trade: 'What they needed was not here.', sea: 'The land could not hold them.' };
function discover(t, T) {
  const adults = t.members.filter(p => ageOf(p) >= 14 && !p.army);
  // whoever comes up with it is usually someone with a head for that sort of thing, doing that sort of work
  let who = null, bs = -1;
  for (let k = 0; k < 40 && adults.length; k++) {
    const p = adults[rint(adults.length)];
    let s = rnd() + (p.job === T.dom ? 2 : p.job === T.alt ? 1 : 0) + (p.wisM - 1) * 2;
    for (const q of p.traits) { const I = IDEA_TAGS[q]; if (I) for (let e = 0; e < I.length; e++) if (I[e][0] === T.tagI) s += I[e][1]; }
    if (s > bs) { bs = s; who = p; }
  }
  const first = !W.firsts[T.id], pol = t.polity, realmFirst = !pol.firsts[T.id];
  const why = t.needs[T.tagI] > 1.2 ? NEED_WHY[T.tag] : null;
  if (first) {
    W.firsts[T.id] = { year: Math.floor(year()), town: t.name, who: who ? who.name : 'unknown', polity: pol.name, pid: pol.id, x: t.x, y: t.y };
    W.eraNow = eraOfKnown(X => X.start || W.firsts[X.id]);
    if (typeof discoverHook === 'function') discoverHook(t, T, who, true);  // js/discovery.js: names the inventor, puts the idea "in the air"
    if (T.id === 'agriculture') {
      const c = t.near.wildBest || 1;
      chronT('tech', `${who ? who.name + ' of ' : 'People at '}${t.name} sow the first deliberate field of ${CROPS[c].name}. Agriculture is born.`, t);
    } else {
      const jw = who && who.job > J.ELDER ? JOB_NAME[who.job].toLowerCase() : '';
      chronT('tech', `${who ? who.name + (jw ? `, ${/^[aeiou]/.test(jw) ? 'an' : 'a'} ${jw} of ${t.name},` : ' of ' + t.name) : 'People at ' + t.name} ${pick(['invents', 'devises', 'discovers', 'works out'])}: ${T.name}.${why ? ' ' + why : ''}`, t);
    }
  } else if (realmFirst && tn(t) > 20) {
    // independent discovery: the same idea turning up far apart within a few years
    const f = W.firsts[T.id], yrs = f ? Math.floor(year()) - f.year : 99;
    chronT('spread', f && !T.side && f.pid !== pol.id && yrs <= 10 ? `${t.name} works out ${T.name} on its own, ${yrs ? yrs + (yrs === 1 ? ' year after ' : ' years after ') : 'in the same year as '}${f.town} in ${f.polity}.` : `${t.name} works out ${T.name} for itself${why ? '. ' + why : '.'}`, t);
  }
  if (realmFirst) pol.firsts[T.id] = Math.floor(year());
  if (T.id === 'agriculture') {
    const c = t.near.wildBest;
    if (c && !pol.crops.includes(c)) pol.crops.push(c);
    if (c && !t.crop) t.crop = c;
  }
  learn(t, T.ix);
  if (who) {
    who.fame += 3 + T.era; plog(who, `Invented ${T.name}.`);
    if (first && T.era >= 1 && addTrait(who, 'inventor')) plog(who, 'Became famous for it.');
  }
  if (T.id === 'spaceflight') {
    W.spaceRace = true;
    W.rockets = W.rockets || [];
    W.rockets.push({ x: t.x, y: t.y, t0: W.tick });
    chronT('wonder', `A rocket from ${t.name} carries people off this world.`, t);
  }
  if (T.id === 'rockets') { W.rockets = W.rockets || []; W.rockets.push({ x: t.x, y: t.y, t0: W.tick }); }
}
function eligible(t, T) {
  if (T.start || t.tech[T.ix]) return false;
  for (const r of T.reqIx) if (!t.tech[r]) return false;
  return !T.cond || T.cond(t);
}
// Nothing here counts years. An idea grows from work actually done this season, pushed harder by what the town is desperate for and by who lives there.
function researchPts(t, T, total, L) {
  const act = t.act, m = t.mod, far = L && T.era >= 3 ? L : null;
  const dom = act[T.dom] + (far ? far[T.dom] : 0), alt = T.alt ? act[T.alt] + (far ? far[T.alt] : 0) : 0, sch = act[J.SCHOLAR] + (far ? far[J.SCHOLAR] : 0);
  let pts = (dom + alt * 0.7 + total * 0.025) * ACT_VALUE * (1 + t.literacy * 0.5);
  pts *= 1 + (m.research - 1) * 0.3;
  if (T.era >= 2) pts += sch * ACT_VALUE * 2.2 * Math.pow(m.research, 0.7);
  pts += t.minds[T.tagI] * 1.6;
  if (T.mil) pts += (t.warExp || 0) * Math.sqrt(tn(t)) * 0.9;
  const links = 1 + Math.min(t.partners.length + (t.seaPartners ? t.seaPartners.length : 0), 6) * 0.12;
  const need = 1 + Math.min(t.needs[T.tagI], 3) * 0.7;
  return pts * links * need * W.inv * ERA_PACE[T.era] * GOV[t.polity.gov].res;
}
const inventCost = (t, T) => T.diff * (0.65 + hash2(t.id, T.ix, W.seed) * 0.7);
function tryInvent(t) {
  const act = t.act;
  let total = 0;
  for (let j = J.FORAGE; j < J.N; j++) total += act[j];
  if (total > 0) {
    // only the frontier: ideas not known whose every prerequisite is; anything learned meanwhile drops out as we pass
    const L = lettersFor(t), C = techCache(t), F = C.front, tech = t.tech, prog = t.prog;
    let n = 0;
    for (let k = 0; k < F.length; k++) {
      const i = F[k];
      if (tech[i]) { C.inF[i] = 0; continue; }
      F[n++] = i;
      const T = TECHS[i];
      if (T.cond && !T.cond(t)) continue;  // on the frontier, so the rest of eligible() holds
      prog[i] += researchPts(t, T, total, L);
      if (prog[i] >= inventCost(t, T)) discover(t, T);
    }
    F.length = n;
  }
  t.lastAct = act.slice();
  t.lastTotal = total;
  act.fill(0);
}
// The republic of letters: from the Iron Age on, people working the same problem in different towns write to each other, so a
// realm's whole effort counts towards each town's ideas. More of it gets through with paper, presses, encyclopedias and the
// telegraph; with printing, books cross borders too, to every realm known and not at war.
const LET_BUF = new Float32Array(J.N);
function realmAct(pol, yr) {
  if (pol.actY === yr && pol.actSum) return pol.actSum;
  const s = new Array(J.N).fill(0);
  for (const o of W.towns) if (o.polity === pol && o.alive && o.lastAct) for (let j = 0; j < J.N; j++) s[j] += o.lastAct[j];
  pol.actY = yr; pol.actSum = s;
  return s;
}
function lettersFor(t) {
  if (!knows(t, 'writing')) return null;
  const pol = t.polity, yr = Math.floor(year()), mine = realmAct(pol, yr), own = t.lastAct, L = LET_BUF;
  const reach = 0.15 + (knows(t, 'paper') ? 0.2 : 0) + (knows(t, 'printing') ? 0.3 : 0) + (knows(t, 'encyclopedia') ? 0.1 : 0) + (knows(t, 'telegraph') ? 0.15 : 0);
  for (let j = 0; j < J.N; j++) L[j] = Math.max(0, mine[j] - (own ? own[j] : 0)) * reach;
  if (knows(t, 'printing')) for (const o of W.polities) {
    if (o === pol || !o.alive || !o.towns || !pol.known[o.id] || atWar(o, pol)) continue;
    const s = realmAct(o, yr);
    for (let j = 0; j < J.N; j++) L[j] += s[j] * reach * 0.15;
  }
  return L;
}
const ACT_VALUE = 0.45;
// The Middle Ages to the Industrial Age are the slow climb: costs keep rising, and the big boosts to research only come with the
// Scientific Method at the far end of it. Without the higher pace there, big worlds sat in the Renaissance for centuries.
const ERA_PACE = [1.3, 0.75, 0.42, 0.32, 0.5, 0.55, 0.36, 0.19, 0.15, 0.13, 0.12, 0.12, 0.11, 0.11];
// Pressure from what's going wrong steers invention: famine toward farming, freezing toward clothes, plague toward medicine.
function needsYear(t) {
  const N = t.needs, n = tn(t), st = t.stock;
  for (let k = 0; k < N.length; k++) N[k] *= 0.82;
  const yrs = st[R.FOOD] / Math.max(n * 4, 1), TI = TAG_IX;
  if (yrs < 1 || t.famine) { const v = t.famine ? 1.4 : 0.5; N[TI.farm] += v; N[TI.nature] += v; }
  if (t.frozeY) N[TI.warm] += Math.min(t.frozeY * 0.3, 2);
  if (W.temp[t.i] < 0.4) N[TI.warm] += 0.12;
  if (t.sickY) N[TI.med] += Math.min(t.sickY / Math.max(n, 1) * 8, 2.5);
  if (t.warYear > year() - 8) N[TI.war] += 0.7;
  if (wantOf(t, R.TOOLS) > st[R.TOOLS]) N[TI.metal] += 0.25;
  if (t.queue.length > 4 || t.cap < n) N[TI.build] += 0.3;
  if (t.crowd > 0.7) N[TI.urban] += (t.crowd - 0.7) * 2.5;
  if (t.sTree.length < 10 || st[R.WOOD] < wantOf(t, R.WOOD) * 0.2) N[TI.energy] += 0.5;
  if ((t.unrest || 0) > 20) N[TI.law] += 0.5;
  if (t.near.tin + t.near.copper + t.near.iron === 0) N[TI.trade] += 0.15;
  if (t.near.coast > 0 && t.sArable.length < 60) N[TI.sea] += 0.3;
  t.frozeY = 0; t.sickY = 0;
  if (t.warExp) t.warExp *= 0.88;
  // who is around: everyone's habits of mind, added up
  const M = t.minds; M.fill(0);
  const P = t.members;
  for (let k = 0; k < P.length; k++) {
    const tr = P[k].traits;
    for (let q = 0; q < tr.length; q++) { const I = IDEA_TAGS[tr[q]]; if (I) for (let e = 0; e < I.length; e++) M[I[e][0]] += I[e][1]; }
  }
}
// Inside a realm, what one town knows reaches the next along its roads.
function teach(from, to, rate) {
  const sr = rate * Math.max(from.mod.spread, 1) * (from.mod.keep ? 1.6 : 1);
  // seed travels with the know-how, if it can grow here
  if (from.crop && !to.crop && cropSuit(from.crop, to.i) > 0.25 && knows(to, 'agriculture')) to.crop = from.crop;
  const K = techCache(from).known, inF = techCache(to).inF;
  for (let q = 0; q < K.length; q++) {
    const i = K[q];
    if (to.tech[i] || !inF[i] || !from.tech[i]) continue;  // inF: every prerequisite known, as eligible() would check
    const T = TECHS[i];
    if (T.cond && !T.cond(to)) continue;
    if (rnd() < sr) {
      learn(to, i);
      if (to.crop === 0 && T.id === 'agriculture') settleCrop(to);
    }
  }
  if (from.crop && !to.crop && knows(to, 'agriculture')) settleCrop(to);
}
// Between realms an idea only moves if the owner agrees to part with it, and the other side will pay, along a route that really exists.
function willShare(seller, buyer, T) {
  const a = seller.polity, b = buyer.polity;
  if (atWar(a, b)) return 0;
  const rel = relOf(a, b), allied = areAllies(a, b);
  if (rel < -30) return 0;
  let p = allied ? 0.5 : 0.05 + clamp(rel, -30, 60) * 0.0025;
  if (a.overlord === b.id || b.overlord === a.id) p += 0.15;
  if (T.mil) p *= allied ? 0.4 : 0.08;
  p *= seller.mod.share || 1;
  p *= 1 + Math.min(buyer.needs[T.tagI], 3) * 0.5;
  if (typeof shareMul === 'function') p *= shareMul(seller, buyer, T);  // js/discovery.js: secrets, patents, faith and trade links
  const g = GOV[a.gov];
  if (g.id === 'despotism' || g.id === 'junta') p *= 0.5;
  if (a.ruler && a.ruler.alive) { if (hasTrait(a.ruler, 'greedy')) p *= 0.7; if (hasTrait(a.ruler, 'kind')) p *= 1.2; }
  return clamp(p, 0, 0.9);
}
const TECH_PRICE = T => (T.era + 1) * (T.era + 1) * 1.6 * (T.mil ? 2 : 1);
const PAY_WITH = [[R.GEMS, 10], [R.GOLD, 8], [R.GOODS, 2], [R.TOOLS, 2], [R.CLOTH, 1.5], [R.BRONZE, 3], [R.STEEL, 3], [R.FOOD, 0.25]];
const TK_POOL = [], TK_SIDE = [];
function tradeKnowledge(seller, buyer) {
  // the big ideas are what people cross borders to buy: the age-making ones come up far more often than the side crafts
  // the buyer's frontier flags (inF) stand in for eligible(): unknown, not a start idea, every prerequisite known; only cond is left
  const pool = TK_POOL, side = TK_SIDE, K = techCache(seller).known, st = seller.tech, bt = buyer.tech, inF = techCache(buyer).inF;
  pool.length = 0; side.length = 0;
  for (let q = 0; q < K.length; q++) {
    const i = K[q];
    if (bt[i] || !inF[i] || !st[i]) continue;
    const T = TECHS[i];
    if (T.cond && !T.cond(buyer)) continue;
    (T.side ? side : pool).push(i);
  }
  if (!pool.length && !side.length) return false;
  const T = TECHS[pool.length && rnd() < pool.length * 3 / (pool.length * 3 + side.length * 0.5) ? pool[rint(pool.length)] : side.length ? side[rint(side.length)] : pool[rint(pool.length)]];
  const allied = areAllies(seller.polity, buyer.polity);
  if (rnd() > willShare(seller, buyer, T)) return false;
  // a fair price, paid in whatever the buyer can spare
  let price = allied ? 0 : TECH_PRICE(T), paid = '';
  if (price > 0) {
    for (const [r, val] of PAY_WITH) {
      const can = Math.max(0, buyer.stock[r] - wantOf(buyer, r) * 0.5);
      if (can * val >= price) { const a = price / val; buyer.stock[r] -= a; seller.stock[r] += a; paid = `${Math.max(1, Math.round(a))} ${RES_NAME[r].toLowerCase()}`; price = 0; break; }
    }
    if (price > 0) return false;  // can't afford it yet
  }
  learn(buyer, T.ix);
  seller.polity.sold++; buyer.polity.bought++;
  adjustRel(seller.polity, buyer.polity, allied ? 0.5 : 1.2);
  pathXP(seller.polity, 'com', 6 + T.era * 4);
  const big = tn(buyer) > 30 && T.era >= 1;
  if (big) chronT('spread', allied ? `${seller.name} shares ${T.name} with its allies at ${buyer.name}.` : `${buyer.name} buys the secret of ${T.name} from ${seller.name} for ${paid}.`, buyer);
  return true;
}
// A merchant, ship or train has arrived: goods have moved, now maybe ideas do too.
function exchange(a, b, via) {
  if (a.polity === b.polity) { teach(a, b, 0.05); teach(b, a, 0.05); return; }
  tradeKnowledge(a, b); tradeKnowledge(b, a);
  if (via && via.pass === undefined && via.sick > 0 && b.sick <= 0 && rnd() < 0.6) infectTown(b, 3);
  if (via && a.sick > 0 && b.sick <= 0 && via.pass !== undefined && b.lastPlague < year() - 20 && rnd() < 0.12) { b.lastPlague = year(); b.plagueName = a.plagueName; b.plagueDead = 0; infectTown(b, 2); if (tn(b) > 150) chronT('plague', `A ship from ${a.name} carries ${a.plagueName || 'sickness'} into ${b.name}.`, b); }
}
// Small isolated groups really do forget skills nobody practises (the Tasmania effect).
function tryForget(t) {
  if (typeof discoveryYear === 'function') discoveryYear(t);  // js/discovery.js: inputs, spoils of war, golden and dark ages, lost know-how
  const n = tn(t);
  if (n >= 14 || t.mod.keep || rnd() > 0.02) return;
  if (t.polity.towns > 3) return;
  const ks = []; for (const i of techCache(t).known) if (t.tech[i] && !TECHS[i].start && TECHS[i].era >= 1) ks.push(i);
  if (!ks.length) return;
  const ix = pick(ks);
  if (TECH_KIDS[ix].some(k => t.tech[k])) return;
  t.tech[ix] = 0; techDirty(t); recomputeMods(t);
  if (n > 8 && TECHS[ix].era >= 2) chronT('misc', `The dwindling people of ${t.name} lose the art of ${TECHS[ix].name}.`, t);
}

// ---- towns over a year ----
// What a realm would cross the map for: ore its smiths need and none of its towns can dig.
function realmWants(pol) {
  if (pol._wantsY === Math.floor(year())) return pol._wants;
  const has = new Set(), cap0 = pol.capital, out = [];
  for (const t of W.towns) if (t.polity === pol) for (const k of ['copper', 'tin', 'iron', 'coal', 'oil', 'salt', 'gold']) if (t.near[k] > 0) has.add(k);
  if (cap0) {
    if (knows(cap0, 'copper') && !has.has('copper')) out.push(ORE.COPPER);
    if (knows(cap0, 'bronze') && !has.has('tin')) out.push(ORE.TIN);
    if (knows(cap0, 'iron') && !has.has('iron')) out.push(ORE.IRON);
    if ((knows(cap0, 'deepmine') || knows(cap0, 'steam')) && !has.has('coal')) out.push(ORE.COAL);
    if (knows(cap0, 'combustion') && !has.has('oil')) out.push(ORE.OIL);
    if (!has.has('salt')) out.push(ORE.SALT);
    if (knows(cap0, 'currency') && !has.has('gold')) out.push(ORE.GOLD);
  }
  pol._wants = out; pol._wantsY = Math.floor(year());
  return out;
}
// How good a place is to live, as the people choosing it would see it: water first, then soil, wood and game, then ore and a city to sell to. Cold, steep and dry put them off.
function siteScore(t, i, nomad, wants) {
  const w = W.w, h = W.h, x = i % w, y = (i / w) | 0;
  let s = 0, fertSum = 0, fresh = 0, sea = 0, forageSum = 0, treeSum = 0, ores = 0, want = 0, wild = 0, slope = 0, land = 0, snow = 0, free = 0;
  for (let q = 0; q < 30; q++) {
    const r = 1.5 + rnd() * 11, ang = rnd() * 6.283;
    const nx = Math.round(x + Math.cos(ang) * r), ny = Math.round(y + Math.sin(ang) * r);
    if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
    const j = ny * w + nx;
    if (W.river[j] || W.biome[j] === B.LAKE) fresh++;
    else if (W.water[j]) sea++;
    if (W.water[j]) continue;
    land++;
    fertSum += W.fert[j]; forageSum += W.forage[j]; if (W.tree[j]) treeSum++;
    slope += slopeAt(j); snow += W.snowD[j];
    if (W.ore[j] >= ORE.COPPER) { ores++; if (wants && wants.includes(W.ore[j])) want++; }
    if (W.wild[j]) wild++;
    // ploughable and nobody's already: the thing a farming family needs most
    // (a town's claim reaches far past its fields: only land close to another town counts as theirs)
    if (W.fert[j] >= 40 && !W.occ[j] && W.road[j] < 2 && slopeAt(j) < 0.1) { const ot = W.owner[j] >= 0 ? W.townById[W.owner[j]] : null; if (!ot || Math.abs(ot.x - nx) + Math.abs(ot.y - ny) > 9 + Math.sqrt(tn(ot)) * 0.4) free++; }
  }
  if (!land) return -99;
  if (!nomad) s += Math.min(free, 24) * 0.14 - (free < 6 ? 2 : 0);
  const fert = fertSum / land, steep = slope / land;
  // fresh water is the first thing anyone looks for; the sea is fish and a harbour, but you can't drink it
  s += Math.min(fresh, 5) * 1.3 + Math.min(sea, 4) * (nomad ? 0.3 : 0.45);
  if (!fresh) s -= knows(t, 'wells') ? 2 : sea ? 4.5 : 7;
  s += fert * (nomad ? 0.012 : 0.07) + Math.min(treeSum, 7) * 0.32 + wild * (nomad ? 0.25 : 0.12);
  s += nomad ? forageSum * 0.2 : Math.min(ores, 4) * 0.5 + Math.min(want, 3) * 2.2;
  // the cold, the heights and broken ground are where people go last
  if (W.temp[i] < 0.34) s -= (0.34 - W.temp[i]) * (knows(t, 'hides') ? 12 : 40);
  s -= Math.min(snow / land, 200) * 0.02;
  s -= steep * 38 + Math.max(0, W.elev[i] - 0.25) * 9;
  if (W.biome[i] === B.DESERT) s -= 3;
  if (W.biome[i] === B.MARSH) s -= 2;
  return s;
}
function findSite(t, minR, maxR, nomad) {
  const w = W.w, h = W.h, pol = t.polity, wants = nomad ? null : realmWants(pol);
  let best = -1, bestS = -1e9;
  const others = W.towns;
  for (let k = 0; k < 90; k++) {
    const a = rnd() * 6.283, d = minR + rnd() * (maxR - minR);
    const x = Math.round(t.x + Math.cos(a) * d), y = Math.round(t.y + Math.sin(a) * d);
    if (x < 4 || y < 4 || x >= w - 4 || y >= h - 4) continue;
    const i = y * w + x;
    if (W.water[i] || W.river[i] || W.occ[i] || W.road[i] >= 2) continue;
    const b = W.biome[i];
    if (b === B.ROCK || b === B.SNOW || slopeAt(i) > 0.14) continue;
    if (W.landId[i] !== W.landId[t.i] && t.portLv < 1) continue;
    // villages can sit close together; nobody builds in a city's shadow
    let bad = false;
    for (const o of others) {
      const dx = o.x - x, dy = o.y - y, d2 = dx * dx + dy * dy, big = tn(o);
      const room = nomad ? 100 : big > 400 ? 340 : big > 120 ? 240 : 170;
      if (d2 < room && !(nomad && o === t)) { bad = true; break; }
    }
    if (bad) continue;
    let s = rnd() * 2.5 - d * 0.045 + siteScore(t, i, nomad, wants);
    if (!nomad) {
      // a growing city's hinterland draws people to it, as long as it isn't on top of it
      let pull = 0; for (const o of others) { const dx = o.x - x, dy = o.y - y, d2 = dx * dx + dy * dy, big = tn(o); if (big > 60 && d2 < 3600) pull += Math.sqrt(big) * 0.012 * (1 - Math.sqrt(d2) / 60); }
      s += Math.min(pull, 5);
      // someone else's country is trouble; your own empty land is the natural place to fill
      const own = W.townById[W.owner[i]];
      if (own) { const near = Math.hypot(own.x - x, own.y - y) < 14 + Math.sqrt(tn(own)) * 0.5; if (own.polity === pol) s += 0.6; else if (near) s -= atWar(own.polity, pol) ? 6 : relOf(own.polity, pol) > 30 ? 1.5 : 3.5; else s -= 0.8; }
    }
    if (s > bestS) { bestS = s; best = i; }
  }
  // Nowhere worth going is a reason to stay home.
  if (!nomad && bestS < 0.5) return -1;
  return best;
}
function moveTo(p, town) {
  const old = p.town;
  if (old === town) return;
  const M = old.members, last = M.pop();
  if (last !== p) { M[p.mi] = last; last.mi = p.mi; }
  p.mi = town.members.length;
  town.members.push(p);
  if (p.home) { p.home.res--; p.home = null; }
  p.town = town; p.spd = walkSpeed(p);
  p.culture = town.culture;
}
// about a fifth of a tile a tick over grass: a dugout keeps up with a walker, a sailing ship makes a few times the pace, a car or a steamer many times
const walkSpeed = p => 3.2 * p.town.mod.speed * p.spdM * (p.mount === 1 ? 1.7 : p.mount === 2 ? 1.6 : 1);
function startMigrate(p, i) {
  p.task = T_MIGRATE; p.step = 0; p.tgt = i; p.st = 0; p.wake = W.tick + rint(8); p.hidden = false; p.carry = 0;
}
// A family-based split: couples and their children leave together.
function founders(t, count) {
  const out = new Set(), m = t.members;
  for (let g = 0; g < 200 && out.size < count; g++) {
    const p = pick(m);
    if (p.army || p.leader || ageOf(p) < 15 || ageOf(p) > 45 || out.has(p)) continue;
    out.add(p);
    if (p.spouse && !p.spouse.army) out.add(p.spouse);
    const momId = p.sex === 0 ? p.id : (p.spouse ? p.spouse.id : -1);
    for (const c of m) if (c.momId === momId && ageOf(c) < 15) out.add(c);
  }
  return [...out];
}
// Why families leave home: too many in town, too little to eat, or every field within a day's walk already taken. Most of all the last.
function colonyPush(t) {
  const n = tn(t);
  if (t.nomad) return n > 42 ? 0.5 : 0;
  const limit = Math.max(70 + Math.min(t.fields.length, 200) * 1.2 + (knows(t, 'writing') ? 60 : 0) + (knows(t, 'engineering') ? 80 : 0) + (knows(t, 'printing') ? 150 : 0) + (knows(t, 'factory') ? 400 : 0), (100 + t.mod.urban) * 0.55);
  let push = 0, why = '';
  if (n > limit) { push += (t.crowd > 1 ? 0.25 : 0.09) + Math.min(0.3, (n / limit - 1) * 0.5); why = 'crowd'; }
  const starved = t.starvedY / Math.max(t.members.length, 1);
  if (n > 30 && (starved > 0.004 || t.famine > 0)) { push += Math.min(0.55, 0.15 + starved * 25); why = 'hunger'; }
  // land hunger: once the farmland round a town is all taken, the young have to go and find their own
  if (n > 45 && t.crop && !t.mod.rail) {
    const room = t.sArable.length + t.fields.length, need = t.jobs[J.FARM] * t.scale * (4.5 + t.mod.fields);
    if (room < need * 1.15) { push += Math.min(0.45, (1.15 - room / Math.max(need, 1)) * 0.6); why = 'land'; }
  }
  // and younger children inherit nothing: a steady trickle of new villages from any healthy place
  if (n > 70 && !knows(t, 'factory')) push += 0.035;
  // and a port with ocean-going hulls sends people to see what's on the other side
  if (n > 100 && t.mod.sail >= 2 && t.portLv >= 1 && t.ships.length) { push += 0.06; if (!why) why = 'sea'; }
  t.pushWhy = why;
  return push * t.mod.colony;
}
function tryColonize(t) {
  const n = tn(t), yr = year();
  if (t.moved > yr - 5 || t.occupier || t.attack) return;
  if (rnd() > colonyPush(t)) return;
  const hungry = t.pushWhy === 'hunger' || t.pushWhy === 'land';
  if (worldPop() > W.maxPop * 0.97) return;
  let site = -1;
  const sea = t.portLv >= 1 && t.near.coast > 0;
  const far = sea ? 28 + 26 * t.mod.seaRange : t.nomad ? 42 : 34 + t.mod.admin * 0.2;
  for (let k = 0; k < 2 && site < 0; k++) site = findSite(t, 13, far, t.nomad);
  // nothing near home: the land-hungry go further, out past the last village of their people
  if (site < 0 && !t.nomad) site = findSite(t, far, far * (hungry ? 2.2 : 1.7), false);
  // a realm with ships that cross oceans looks beyond the horizon: empty coasts on other shores
  if ((site < 0 || t.pushWhy === 'sea' || rnd() < 0.25) && !t.nomad && t.mod.sail >= 2 && t.portLv >= 1) { const o = overseasSite(t); if (o >= 0) site = o; }
  if (site < 0) { if (hungry) t.noSiteY = Math.floor(yr); return; }  // nowhere left to go: the realm feels it (war.js landHunger)
  const overseas = W.landId[site] !== W.landId[t.i];
  nodeBudget = Math.max(nodeBudget, 1);
  let carrier = null, landing = null;
  if (overseas) {
    // settlers can only cross on a ship that's actually at the quay
    const fleet = commandeer(t, 8);
    if (!fleet.ships.length) return;
    // the open ocean needs a hull built for it
    carrier = fleet.ships.find(s => shipDef(s).sea >= 2) || fleet.ships[0];
    landing = findLanding(site);
    if (!landing) return;
    const route = findShipPath(portOf(t), landing.water, shipSpec(shipDef(carrier), t));
    if (!route || route === PATH_BUSY) return;
  } else {
    const test = findPath(t.i, site, 0);
    if (!test || test === PATH_BUSY) return;
  }
  let group = founders(t, Math.round(clamp(n * 0.28, 8, 36)));
  if (carrier) group = group.slice(0, shipDef(carrier).men);
  if (group.length < 5) return;
  const pol = t.polity;
  // whether a new village stays loyal comes down to how far the crown's reach goes: roads, writing, horses, a navy
  const cap0 = pol.capital && pol.capital.alive ? pol.capital : t;
  const reach = 24 + govSt(pol) * 7 + cap0.mod.admin * 0.45 + (knows(cap0, 'writing') ? 14 : 0) + (cap0.mod.speed - 1) * 60 + (cap0.trans || 0) * 4;
  const dc = Math.hypot(tx(site) - cap0.x, ty(site) - cap0.y);
  const away = clamp((dc - reach) / Math.max(reach, 1), 0, 1.5);
  let leave = t.nomad ? (tdist(t.i, site) > 26 ? 0.5 : 0) : away * 0.45 + (overseas ? (t.portLv >= 2 && t.navy ? 0.12 : 0.4) : 0);
  if (pol.stab < 35) leave += 0.1;
  let newPol = pol, culture = t.culture;
  if (rnd() < leave) {
    if (rnd() < 0.4) culture = makeCulture(t.culture);
    newPol = (t.nomad || rnd() < 0.6) ? newPolity(culture) : pol;
  }
  if (newPol !== pol) { newPol.crops = pol.crops.slice(); adjustRel(pol, newPol, 15); newPol.known[pol.id] = 1; pol.known[newPol.id] = 1; newPol.gov = t.nomad ? 0 : GOV_IX.tribe; }
  const nt = newTown(newPol, culture, site, t.nomad);
  nt.tech.set(t.tech); nt.prog.set(t.prog); techDirty(nt); recomputeMods(nt); nt.crop = t.crop;
  if (!nt.crop && knows(nt, 'agriculture')) settleCrop(nt);
  nt.radius = 13;
  scanTown(nt);
  for (let r = 0; r < R.N; r++) { const part = t.stock[r] * clamp(group.length / n, 0.1, 0.4); nt.stock[r] += part; t.stock[r] -= part; }
  provision(t, nt, group.length * t.scale);
  if (carrier) {
    carrier.mission = 'carry'; carrier.landing = landing.water; carrier.landTile = landing.land; carrier.wait = W.tick + 200; carrier.expect = group.length; carrier.ready = false;
    for (const p of group) { moveTo(p, nt); p.shipRef = carrier; p.fromTown = t; p.task = T_BOARD; p.step = 0; p.st = 0; p.wake = W.tick + rint(8); p.tgt = t.portB; p.hidden = false; p.carry = 0; }
    pathXP(pol, 'mar', 40);
  } else for (const p of group) { moveTo(p, nt); startMigrate(p, nearTile(site, 3)); }
  // in a town too big to follow one by one, the crowd it stands for goes along too
  if (t.folk > 0 && t.scale > 1.05) { const extra = Math.min(t.folk, Math.round(group.length * (t.scale - 1))); t.folk -= extra; nt.folk += extra; nt.scale = tn(nt) / Math.max(1, nt.members.length); t.scale = tn(t) / Math.max(1, t.members.length); }
  if (t.tameHerd && t.tameHerd.n > 6 && !overseas) { const k = Math.floor(t.tameHerd.n / 3); t.tameHerd.n -= k; nt.tameHerd = { id: W.nextId++, x: t.x, y: t.y, type: t.tameHerd.type, n: k, tx: nt.x, ty: nt.y, owner: nt }; W.herds.push(nt.tameHerd); }
  planJobs(t); planJobs(nt);
  t.moved = yr; nt.moved = yr;
  pathXP(pol, 'fro', 120);
  const kind = t.pushWhy === 'hunger' ? 'Hungry families' : t.pushWhy === 'land' ? 'Families with no land to farm' : t.nomad ? 'Part of the band' : 'Settlers';
  if (!t.nomad || overseas) chronT('found', `${kind} from ${t.name} ${overseas ? `board the ${carrier.name} to cross the water and found` : 'set out and found'} ${nt.name}.`, nt);
  if (newPol !== pol && !t.nomad) chronT('gov', `${nt.name} owes nothing to ${pol.name}: a new people, the ${newPol.name}, begins here.`, nt);
}
function nearTile(i, r) {
  for (let k = 0; k < 8; k++) {
    const j = i + (rint(r * 2 + 1) - r) + (rint(r * 2 + 1) - r) * W.w;
    if (j > 0 && j < W.occ.length && !W.water[j]) return j;
  }
  return i;
}
// Foragers strip an area, then the whole camp walks somewhere better.
function tryRelocate(t) {
  const n = tn(t), yr = year();
  if (t.moved > yr - 4 || !n) return;
  let food = 0; for (const i of t.sForage) food += W.forage[i];
  let herd = 0; for (const H of t.herds) herd += H.n * 2;
  const perHead = (food + herd + t.sFish.length * 0.6) / n;
  if (perHead > 2.2 && t.stock[R.FOOD] > n * 0.5) return;
  const site = findSite(t, 11, 30, true);
  if (site < 0) return;
  nodeBudget = Math.max(nodeBudget, 1);
  const test = findPath(t.i, site, 0);
  if (!test || test === PATH_BUSY) return;
  for (const b of t.blds.slice()) removeBuilding(b);
  releasePlots(t);
  t.i = site; t.x = tx(site); t.y = ty(site); t.moved = yr; t.cap = 0;
  t.queue.length = 0; t.count = {};
  placeCenter(t);
  scanTown(t);
  for (const p of t.members) { if (p.home) p.home = null; if (!p.army) startMigrate(p, nearTile(site, 3)); }
}
// Merchants walk these routes. Anything across water goes by ship from a port.
function findPartners(t) {
  const m = t.mod, list = [];
  const landR = 22 * m.trade * (1 + m.cargo * 0.12) + (m.paved ? 14 : 0) + (m.rail ? 30 : 0) + (m.car ? 30 : 0);
  for (const o of W.towns) {
    if (o === t || o.nomad) continue;
    const dx = o.x - t.x, dy = o.y - t.y, d = Math.sqrt(dx * dx + dy * dy);
    if (W.landId[o.i] === W.landId[t.i] && d <= landR) {
      if (atWar(t.polity, o.polity)) continue;
      if (relOf(t.polity, o.polity) < -55) continue;  // no dealings with bitter enemies
      list.push({ o, d });
    }
  }
  list.sort((a, b) => a.d - b.d);
  t.partners = list.slice(0, 7).map(e => e.o);
}
// How many people this place can really hold together, and what happens when it holds more.
function crowdYear(t) {
  const n = tn(t), m = t.mod;
  // A place holds as many as its water, streets, markets and housing allow.
  const drink = t.near.fresh > 0 ? 60 : (t.count.well || t.count.cistern || t.count.aqueduct) ? 30 : t.near.water > 0 ? 10 : 0;
  const markets = (t.count.market || 0) * 90 + (t.count.bazaar || 0) * 320 + (t.count.plaza || 0) * 40 + (t.count.mall || 0) * 600;
  t.support = 45 + drink + m.urban + t.roadScore * 0.3 + markets + Math.min(t.cap, n * 2) * 0.1;
  const c = n / t.support;
  t.crowd = c;
  const ex = Math.max(0, c - 1);
  t.workMul = 1 / (1 + ex * 0.35);
  t.slumHz = 1 + Math.min(ex, 3) * 0.55;
  t.crowdBirth = 1 / (1 + ex * 1.2);
  const roofs = t.cap < n ? (n - t.cap) / n : 0;
  const target = clamp(ex * 38 + (t.famine ? 18 : 0) + roofs * 18 + (t.sick > 0 ? 6 : 0) - m.happy * 0.7 - m.order * 0.7, 0, 100);
  t.unrest += (target - t.unrest) * 0.25;
  if (t.nomad || n < 60) return;
  if (ex > 0.08 && t.lastPlague < year() - 15 && rnd() < (0.015 + ex * 0.05) * (m.plague < 0.5 ? 0.3 : 1) * m.contagion) {
    t.lastPlague = year();
    t.plagueName = pick(['Slum Fever', 'the Bloody Flux', 'Gaol Fever', 'Cholera', 'Tenement Cough']);
    t.plagueDead = 0;
    infectTown(t, 3 + Math.floor(n / 50));
    chronT('plague', `Filth and crowding breed ${t.plagueName} in ${t.name}.`, t);
  }
  if (rnd() < (0.0015 + ex * 0.025) * m.fire) greatFire(t);
  if (t.unrest > 30) { t.stock[R.GOODS] *= 0.97; t.stock[R.GOLD] *= 0.97; t.stock[R.FOOD] *= 0.985; }
  if (t.unrest > 55 && rnd() < 0.08 + (t.unrest - 55) * 0.004 && !t.attack) riot(t);
  // those who can leave, leave: from crowded streets to where there's room and work, and from empty larders to full ones
  const hungry = t.starvedY > 0 && n > 20;
  if (ex > 0.2 || hungry) {
    const dest = t.partners.filter(o => (o.polity === t.polity || relOf(t.polity, o.polity) > 10) && o.crowd < 0.9 && (!hungry || o.stock[R.FOOD] > tn(o) * 2.5) && (t.polity.cur.kind < 2 || o.realWage >= t.realWage * 0.9));
    if (dest.length) {
      const to = pick(dest), go = Math.min(30, hungry ? 2 + t.starvedY * 2 : Math.floor(n * 0.012 * Math.min(ex + 0.5, 2)));
      for (let k = 0; k < go; k++) {
        const p = t.members[rint(t.members.length)];
        if (!p || p.army || p.leader || p.btl || p.aboard || p.task === T_MIGRATE) continue;
        emigrate(p, to);
        startMigrate(p, nearTile(to.i, 3));
        p.job = J.NONE;
      }
    }
  }
}
// The state granary: a realm that can write things down moves grain from full storehouses to hungry towns, by cart or barge, losing some on the way.
function reliefYear(pol) {
  const cap0 = pol.capital;
  if (!cap0 || pol.towns < 2 || !(knows(cap0, 'granary') && knows(cap0, 'writing'))) return;
  const mine = W.towns.filter(t => t.polity === pol && !t.nomad && !t.attack);
  const needy = mine.filter(t => t.stock[R.FOOD] < tn(t) * 1.2 && (t.starvedY > 0 || t.famine > 0 || t.stock[R.FOOD] < tn(t) * 0.5));
  if (!needy.length) return;
  const reach = 45 + cap0.mod.admin * 0.4 + (cap0.mod.rail ? 80 : 0) + (cap0.trans || 0) * 6;
  let sent = 0, biggest = null;
  for (const t of needy) {
    let want = tn(t) * 2 - t.stock[R.FOOD];
    for (const o of mine) {
      if (want <= 0) break;
      if (o === t || (W.landId[o.i] !== W.landId[t.i] && !(o.portLv && t.portLv))) continue;
      const spare = o.stock[R.FOOD] - tn(o) * 3;
      if (spare <= 0) continue;
      const d = Math.hypot(o.x - t.x, o.y - t.y);
      if (d > reach) continue;
      const amt = Math.min(spare * 0.5, want), lost = clamp(0.06 + d * (o.mod.rail ? 0.0008 : 0.003), 0, 0.5);
      o.stock[R.FOOD] -= amt; t.stock[R.FOOD] += amt * (1 - lost); want -= amt * (1 - lost); sent += amt;
      // the treasury buys it from the farmers who grew it, where there's money to buy with
      if (pol.cur.kind >= 2) { const bill = amt * o.price[R.FOOD] * 0.5; const paid = Math.min(bill, Math.max(0, pol.cur.treasury)); pol.cur.treasury -= paid; pol.cur.spentY += paid; o.cash += paid; }
      if (!biggest || amt > biggest.amt) biggest = { t, o, amt };
    }
  }
  if (biggest && biggest.amt > tn(biggest.t) * 0.8 && tn(biggest.t) > 60 && !(pol.reliefNote > year() - 25)) { pol.reliefNote = year(); chronT('famine', `Grain carts roll from ${biggest.o.name} to hungry ${biggest.t.name}, sent by the ${polityTitle(pol)}.`, biggest.t); }
}
function greatFire(t) {
  const H = t.houses;
  if (H.length < 8) return;
  const c = pick(H), r = 3 + rint(4);
  let burned = 0;
  for (const b of H.slice()) {
    if (Math.abs(b.x - c.x) > r || Math.abs(b.y - c.y) > r) continue;
    if (HOUSES[b.tier].id === 'stonehouse' && rnd() < 0.7) continue;
    if (b.tier >= 6 && rnd() < 0.85) continue;
    if (W.fights) W.fires.push({ x: b.x, y: b.y, t: W.tick });
    removeBuilding(b); burned++;
  }
  if (W.fires.length > 80) W.fires.splice(0, W.fires.length - 80);
  if (burned >= 3) {
    let dead = 0;
    for (const p of t.members.slice()) { const dx = (p.ti % W.w) - c.x, dy = ((p.ti / W.w) | 0) - c.y; if (dx * dx + dy * dy < r * r && rnd() < 0.15) { killPerson(p, 'died in a fire'); dead++; } }
    if (t.alive) chronT('collapse', `A great fire sweeps through ${t.name}. ${burned} homes burn${dead ? `, and ${dead} die` : ''}.`, t);
  }
}
function riot(t) {
  const n = tn(t), dead = 1 + rint(Math.max(2, Math.floor(n * 0.01)));
  for (let k = 0; k < dead && t.members.length; k++) killPerson(t.members[rint(t.members.length)], 'killed in a riot');
  if (!t.alive) return;
  for (let k = 0; k < 3 && t.houses.length; k++) if (rnd() < 0.4) removeBuilding(pick(t.houses));
  t.stock[R.FOOD] *= 0.85;
  t.polity.stab -= 3;
  if (tn(t) > 60 && !(t.riotNote > year() - 20)) { t.riotNote = year(); chronT('collapse', `Riots break out in ${t.name}: too many people, too little of everything.`, t); }
  t.unrest *= 0.8;
  if (t.polity.capital !== t && t.polity.towns >= 2 && tn(t) >= 28 && rnd() < 0.12) startRevolt(t.polity, t);
}
function townYear(t) {
  const n = tn(t);
  if (!n) return;
  t.radius = clamp(Math.round(13 + Math.sqrt(n) * 0.75 + (t.mod.car ? 8 : 0)), 13, 46);
  t.peak = Math.max(t.peak, n);
  scanTown(t);
  if (!t.nomad) { findPartners(t); findSeaPartners(t); planShips(t); planPorts(t); boatYear(t); }
  crowdYear(t);
  if (!t.alive) return;
  if (t.count && !t.nomad) { considerCanals(t); considerFill(t); }
  // salt is what keeps food through the winter
  if (t.stock[R.SALT] > tn(t) * 0.02) { t.stock[R.SALT] -= tn(t) * 0.02; t.stock[R.FOOD] *= 1.03; }
  for (let k = 0; k < BLD_YIELD.length; k++) {
    const id = BLD_YIELD[k], c = t.count[id];
    if (!c) continue;
    const Y = BLD[id].yield;
    for (const r in Y) { const v = Y[r] * c * (+r === R.FOOD ? Math.sqrt(t.mod.farm) : 1); t.stock[r] += v; if (+r === R.FOOD) t.foodProd += v * 0.25; }
  }
  if (t.fortHP < t.fortMax && !t.attack) t.fortHP = Math.min(t.fortMax, t.fortHP + Math.max(4, t.fortMax * 0.06));
  needsYear(t);

  // spoilage and upkeep
  const st = t.stock;
  const granaries = (t.count.granary || 0);
  const spoil = (granaries ? 0.08 : 0.2) * t.mod.spoil;
  st[R.FOOD] *= 1 - spoil;
  const capS = storeCap(t);
  for (let r = 0; r < R.N; r++) if (st[r] > capS * (r === R.FOOD ? 4 : 1)) st[r] = capS * (r === R.FOOD ? 4 : 1);
  if (t.mod.tier > 0 || knows(t, 'copper')) {
    const workers = n * 0.6, use = workers * 0.1;
    if (st[R.TOOLS] >= use) { st[R.TOOLS] -= use; t.toolMul = 1 + t.mod.tier * 0.28 + 0.1; }
    else { t.toolMul = 1 + (st[R.TOOLS] / Math.max(use, 1)) * (t.mod.tier * 0.28 + 0.1); st[R.TOOLS] = 0; }
  } else t.toolMul = 1;
  t.toolMul *= t.workMul * (1 - t.polity.cur.slump * 0.2);

  // how much food did each food worker really bring in?
  const fw = t.jobs[J.FARM] + t.jobs[J.FORAGE] + t.jobs[J.HUNT] + t.jobs[J.FISH] + t.jobs[J.HERD] + t.jobs[J.GARDEN];
  if (fw > 0) t.foodRate = t.foodRate * 0.6 + (t.foodProd / fw) * 0.4;
  t.foodProd = 0;

  if (!t.crop && knows(t, 'agriculture')) settleCrop(t);
  // fields nobody can work go back to the wild, farthest first
  const spare = t.fields.length - Math.ceil(t.jobs[J.FARM] * (4.5 + t.mod.fields) + 4);
  if (spare > 0) {
    t.fields.sort((a, b) => Math.abs(a.i % W.w - t.x) + Math.abs(((a.i / W.w) | 0) - t.y) - Math.abs(b.i % W.w - t.x) - Math.abs(((b.i / W.w) | 0) - t.y));
    for (let k = 0; k < Math.min(spare, 12); k++) { const f = t.fields.pop(); W.occ[f.i] = 0; W.stage[f.i] = 0; updCost(f.i); dirty(f.i); }
  }
  tryInvent(t);
  tryForget(t);
  const capT = t.polity.capital;
  if (capT && capT !== t && capT.alive && capT.mod.keep && rnd() < 0.4) teach(capT, t, 0.03);
  for (const o of t.partners) if (o.polity === t.polity && rnd() < 0.5) teach(o, t, 0.04);
  if (t.nomad) {
    // neighbouring bands swap what they've seen when they meet, if they aren't enemies
    for (const o of W.towns) { if (o !== t && Math.hypot(o.x - t.x, o.y - t.y) < 26 && rnd() < 0.25) { if (o.polity === t.polity) teach(o, t, 0.05); else if (relOf(o.polity, t.polity) > -20 && rnd() < 0.3) tradeKnowledge(o, t); } }
    tryRelocate(t);
    if (!t.nomad) return;
    if (knows(t, 'agriculture') && t.crop && n >= 14 && rnd() < 0.15) settleDown(t);
    else if (knows(t, 'fishing') && t.sFish.length + t.sBoat.length > 55 && n >= 22 && rnd() < 0.008) settleDown(t);
  }
  if (!t.nomad) {
    upgradeHouses(t);
    wallsYear(t);
  }
  tryColonize(t);
  tryPlagueStart(t);
  tierCheck(t);
  dietYear(t); literacyYear(t); pollutionYear(t); faithYear(t); decayYear(t);
  labourYear(t); officeYear(t); redevelopYear(t); econTown(t);
  if (t.ageN >= 5) { t.lifeExp = t.lifeExp * 0.8 + (t.ageSum / t.ageN) * 0.2; t.ageSum = 0; t.ageN = 0; }
  folkYear(t);
  t.deathsY = t.birthsY = t.starvedY = 0;
}
function tierCheck(t) {
  const name = townTier(t);
  if (name !== t.tierName) {
    if ((name === 'City' || name === 'Metropolis') && (t.tierName === 'Town' || t.tierName === 'City') && t.peak === tn(t) && !t['was' + name]) {
      t['was' + name] = true;
      if (!W.firstCity && name === 'City') { W.firstCity = true; chronT('found', `${t.name} becomes the first true city in the world: ${tn(t)} people in one place.`, t); }
      else chronT('found', `${t.name} has grown into a ${name.toLowerCase()}.`, t);
    }
    t.tierName = name;
  }
}
function townSeason(t, season) {
  const m = t.members, n = m.length, st = t.stock;
  if (!n) return;
  // eating
  let need = 0;
  for (let k = 0; k < n; k++) need += ageOf(m[k]) < 13 ? 0.65 : 1;
  need *= t.scale;
  const have = st[R.FOOD];
  let fedShare = 1;
  if (have >= need) st[R.FOOD] = have - need;
  else {
    // short: the herd, famine foods, grain bought from the neighbours, relief (food.js)
    const found = emergencyFood(t, need, need - have);
    fedShare = Math.min(1, (have + found) / need); st[R.FOOD] = 0;
  }
  let starving = 0;
  // a small shortfall is shared out as short rations; a big one isn't enough to go round, and it's the poor, the very young and the old who go without
  const short = fedShare >= 1 ? 0 : clamp((0.95 - fedShare) * 1.25, 0, 1);
  const money = t.polity.cur.kind >= 2, wage = Math.max(t.wage || 1, 0.01);
  for (let k = n - 1; k >= 0; k--) {
    const p = m[k];
    let q = short;
    if (q > 0) {
      if (money) { const rich = p.cash / wage; q *= rich > 6 ? 0.25 : rich > 2 ? 0.6 : rich > 0.5 ? 1 : 1.5; }
      const a = ageOf(p); if (a < 6 || a > 60) q *= 1.25;
    }
    if (rnd() >= q) { if (p.hunger > 0) p.hunger--; }
    else {
      p.hunger++;
      if (p.hunger >= 2) {
        starving++;
        const a = ageOf(p);
        if (rnd() < 0.22 * (a < 6 || a > 55 ? 1.8 : 1)) { killPerson(p, 'starved'); t.starvedY++; }
      }
    }
  }
  t.famine = starving > n * 0.15 ? (t.famine + 1) : Math.max(0, t.famine - 1);
  if (t.famine === 2 && m.length >= 30 && !(t.famineNote > year() - 30)) { t.famineNote = year(); chronT('famine', `Famine grips ${t.name}.`, t); }
  if (!t.alive) return;

  // winter fires
  if (seasonAt(t.y) < -0.06 && W.temp[t.i] < 0.5) {
    // the deeper the snow lying round the town, the more it burns and the harder the winter bites
    const drift = W.snowD[t.i] / 250, fuel = tn(t) * 0.3 * clamp(1.4 - W.temp[t.i] * 2, 0.2, 1) * (1 + drift);
    if (st[R.WOOD] >= fuel) st[R.WOOD] -= fuel;
    else {
      st[R.WOOD] = 0;
      const risk = 0.05 * t.mod.cold * clamp(1.2 - W.temp[t.i] * 2.4, 0.1, 1) * (1 + drift);
      for (let k = m.length - 1; k >= 0; k--) { const p = m[k], a = ageOf(p); if ((a < 6 || a > 50) && rnd() < risk) { killPerson(p, 'froze'); t.frozeY++; } }
      if (!t.alive) return;
    }
  }
  if (t.sick > 0) plagueSeason(t);
  if (!t.alive) return;
  // enemy ships off the harbour: no fishing fleet out, no grain ships in, and prices climb
  if (t.blockaded > W.tick && t.portLv) { st[R.FOOD] *= 0.96; t.unrest = Math.min(100, t.unrest + 1.5); t.polity.support = Math.max(0, t.polity.support - 0.5); }
  // nowhere to drink: a dry season kills, unless there are wells
  if (!t.near.fresh && !t.nomad && !t.count.well && !t.count.cistern && !t.count.aqueduct && !t.count.desalplant && W.moist[t.i] < 0.4 && season === 1 && rnd() < 0.3) {
    const v = t.members[rint(t.members.length)];
    if (v) { killPerson(v, 'died of thirst'); if (!t.alive) return; }
    t.needs[TAG_IX.build] += 0.2;
  }
  planJobs(t);
  planBuildings(t);
}
// A field's season: planted in spring and summer, ripe by autumn, gone if nobody cuts it before the next spring.
function fieldSeason(t, season) {
  const F = t.fields, st = W.stage;
  if (t.plots.length) plotSeason(t, season);
  for (let k = 0; k < F.length; k++) {
    const f = F[k], s = st[f.i];
    let v = s;
    if (season === 0) { if (s > 0) v = 0; if (f.rest > 0) f.rest--; }
    else if (s === 1) v = 2;
    else if (s === 2) v = 3;
    if (v !== s) { st[f.i] = v; dirty(f.i); }
  }
}
