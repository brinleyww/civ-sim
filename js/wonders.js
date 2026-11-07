'use strict';
// Great works. A rich, settled town now and then sets out to raise something to outlast it: a ring of standing stones, a ziggurat,
// a lighthouse over its harbour, a cathedral for its faith, an opera house, a tower of glass, a space centre. Each takes years of
// the town's labour and money (or stone, brick and timber where there is no money), stalls in famine and war, gives its town
// (and sometimes the whole realm) a little contentment, order, learning or trade, and can be looted or ruined in a sack. Ruins
// stay where they fell, and a later town may restore them. Records live in W.wonders (plain data, towns by id); wonderart.js
// draws them. The tiles they stand on are marked occupied (W.occ 1, with no building in W.bAt), so nothing builds, walks or
// lays a road across them.

// id | name | era | techs needed (a/b: either will do) | footprint w x h | material | work in builder-years | needs: c coast, r river, k capital,
// f a faith, b a frontier, u one to a realm | fx for its town | fx for the rest of its realm | what it is
const WONDER_SRC = `
henge|Stone circle|1|megaliths/calendar|3x3|stone|110||happy:3,order:1||A ring of standing stones dragged from far hills and set to catch the midsummer sunrise.
mound|Great mound|1|dolmens/megaliths|3x3|earth|130||order:2,morale:1||A green hill raised basket by basket over the chamber tombs of the first families.
ziggurat|Ziggurat|2|mudbrick,priests/writing|4x4|brick|380|r|happy:4,research:1.05||Terrace on terrace of fired brick, a stair to the shrine where the gods come down.
steppyramid|Step pyramid|2|masonry,pyramids/math|4x4|stone|460||happy:3,order:3|order:1|Six great steps of dressed stone over a king's burial, built by a nation's corvée.
royaltomb|Royal tomb|2|masonry,kingship/law|3x3|stone|300|k|order:2,happy:2||A rock-cut tomb behind colossal columns, where the dynasty lies in state.
greatwall|Great wall|2|masonry,citywalls/law|6x2|stone|420|bu|defend:1.12|defend:1.03|A long wall of rammed earth and stone along the frontier, with towers in sight of each other.
beacon|Beacon tower|2|lighthouses0/ships|2x2|stone|120|c|trade:1.04,seaRange:1.05||A stone tower where a fire burns every night to bring the boats home.
colossus|Colossus|2|bronze,lostwax/currency|3x3|bronze|340|c|happy:3,trade:1.06||A bronze giant astride the harbour mouth, cast piece by piece and raised on a marble plinth.
lighthouse|Great lighthouse|3|lighthouse/engineering|2x2|stone|300|c|trade:1.08,cargo:1.05||A tall stone tower on the harbour mole, its fire and mirror seen a day's sail out.
library|Great library|3|libraries/philosophy|3x3|stone|340||research:1.12|research:1.03|Hall after hall of scrolls copied from every ship that puts in, and the scholars to read them.
amphitheatre|Amphitheatre|3|amphitheatre/engineering|4x4|stone|450||happy:6,order:2||Tiers of stone seats round a sanded arena, for games, plays and the crowd's verdict.
grandtemple|Grand temple|3|masonry,theology/philosophy|4x4|stone|440|f|happy:4,order:1||Columns of marble round the sanctuary of the faith, its treasury full of offerings.
pantheon|Great dome|3|domes/engineering|3x3|stone|400||happy:4,research:1.03||A hall under a single coffered dome of concrete, open to the sky at its crown.
statue|Colossal statue|3|bronze,lostwax/iron|3x3|bronze|300||happy:3,morale:2||A seated figure of a god or a founder, taller than the houses, gilded and garlanded.
palace|Palace of state|3|law,feudalism/paved|4x4|stone|560|ku|order:4,admin:20|order:1|Courts, halls and gardens behind a great gate: the seat of the realm.
cathedral|Great cathedral|4|cathedrals/university|4x4|stone|900|f|happy:6,order:2||Generations of masons raise a nave of pointed arches and two towers over the town.
greatmosque|Great mosque|4|domes/engineering,theology/paper|4x4|stone|800|f|happy:6,research:1.03||A courtyard of arcades, a prayer hall under a great dome and minarets at its corners.
pagoda|Great pagoda|4|theology/paper|3x3|wood|600|f|happy:5,order:2||Storey on storey of curved eaves around a central mast, each roof hung with bells.
observatory|Great observatory|4|observatory/optics|3x3|stone|420||research:1.08||Great quadrants and sighting walls of stone where the heavens are measured to a hair.
clocktower|Clock tower|4|clocks/windmill|2x2|stone|240||trade:1.04,order:2||A tall tower with a clock face on each side and a bell that keeps the whole town's hours.
clothhall|Cloth hall|4|fairs/banking|3x3|brick|340||trade:1.07||A long hall of arcades and a belfry where the cloth of the whole region is sealed and sold.
statebasin|Grand basin|4|locks/canals|4x3|stone|480|r|trade:1.06,cargo:1.05||A great stone-lined basin and flight of locks where the river trade meets the town.
grandpalace|Grand palace|5|perspective/science|4x4|stone|880|ku|order:4,happy:3,admin:30|order:1|A palace laid out by the rules of perspective, with long wings, a cour d'honneur and formal gardens.
royalobs|Royal observatory|5|telescope/navigation|3x3|stone|480||research:1.1||Domes on the hill over the town, with telescopes that find new moons and keep the realm's time.
basilica|Domed basilica|5|perspective/science,domes/engineering|4x4|stone|900|f|happy:6,order:1||A church on a cross plan under a soaring double dome, with a colonnaded square before it.
opera|Opera house|6|gaslight/steam,theatre/printing|3x3|stone|560||happy:6,trade:1.03||Gilt boxes in a horseshoe of tiers, a gas-lit chandelier and a stage deep enough for armies.
fairtower|Exhibition tower|6|lifts/steel,bessemer/railway|3x3|steel|500||happy:4,trade:1.06||A lattice of riveted iron raised for a world's fair, and the tallest thing anyone has built.
crystal|Crystal palace|6|plateglass/factory,castiron/steel|4x3|iron|500||trade:1.06,research:1.04||An exhibition hall of cast iron and plate glass, bright as day inside, full of the world's machines.
publiclib|Grand public library|6|publiclibraries/telegraph|3x3|stone|440||research:1.08|research:1.02|Reading rooms under a great dome, open to anyone, with stacks deep enough to lose a year in.
skyscraper|Skyscraper|7|skyscrapers/electric,lifts/massprod|2x2|steel|560||trade:1.08||A steel frame clad in stone, setback over setback, crowned with a spire that catches the sun.
stadium|Great stadium|7|globalgames/cars,reinforced/massprod|4x4|concrete|680||happy:7||A concrete bowl for a hundred thousand, built to host the world at its games.
broadcast|Broadcast tower|7|television/computers|2x2|steel|340||happy:2,research:1.03,spread:1.1||A concrete needle with a revolving restaurant, sending the realm's news to every set in the land.
spacecentre|Space centre|8|spaceflight|4x4|steel|1400|u|research:1.1|research:1.03|Gantries, a vast assembly hall and a launch pad where people set off for other worlds.
supertall|Supertall tower|8|curtainwall/internet|2x2|steel|900||trade:1.1||A spire of glass and steel half a kilometre high, its top in the clouds.
spaceelevator|Space elevator|11|spaceelevator|3x3|composite|3000|u|trade:1.1,research:1.05|trade:1.03|A ribbon of carbon running up from a great anchor station into orbit, climbers riding it day and night.
`;
const WONDER = [], WN_IX = {}, WN_BADTECH = [];
for (const line of WONDER_SRC.trim().split('\n')) {
  const [id, name, era, tech, fp, mat, work, need, fx, rfx, about] = line.split('|');
  const P = s => { const o = {}; if (s) for (const kv of s.split(',')) { const [k, v] = kv.split(':'); o[k] = +v; } return o; };
  const [w, h] = fp.split('x').map(Number);
  const K = { id, name, era: +era, tech: tech ? tech.split(',') : [], w, h, mat, work: +work, need, fx: P(fx), rfx: rfx ? P(rfx) : null, about, ix: WONDER.length };
  // each needed thing may be had more than one way: 'pyramids/math' is either
  K.tix = K.tech.map(g => g.split('/').map(t => TECH_IX[t]).filter(x => x !== undefined));
  const miss = K.tech.join('/').split('/').filter(t => TECH_IX[t] === undefined);
  if (miss.length) WN_BADTECH.push(id + ':' + miss.join(','));
  if (K.tix.some(g => !g.length)) K.bad = true;
  WN_IX[id] = K.ix; WONDER.push(K);
}
const WN_RES = { stone: R.STONE, brick: R.BRICK, wood: R.WOOD, bronze: R.BRONZE, iron: R.STEEL, steel: R.STEEL, concrete: R.STONE, composite: R.STEEL };
// what it is really built of here: masonry is stone or fired brick, whichever the town has more of
const wnMat = (t, K) => { const r = WN_RES[K.mat]; return r === R.STONE || r === R.BRICK ? (t.stock[R.BRICK] > t.stock[R.STONE] ? R.BRICK : R.STONE) : r; };
// what each faith builds for its great house of worship, if the culture leaves it free to choose
const WN_FAITH = { 'the One': 'cathedral', 'the Book': 'greatmosque', 'the Path': 'pagoda', 'the Sun': 'grandtemple', 'the old gods': 'grandtemple', 'the Great Mother': 'basilica' };
const WN_NAMES = {
  henge: ['The Stones of {T}', '{W} Circle', 'The Ring of {W}'], mound: ['The Great Mound of {T}', '{W} Barrow', 'The Hill of the Ancestors at {T}'],
  ziggurat: ['The Ziggurat of {T}', 'The House of {W}', 'The Ziggurat of {R}'], steppyramid: ['The Step Pyramid of {R}', 'The Pyramid of {T}'],
  royaltomb: ['The Tomb of {R}', 'The Royal Tombs of {T}'], greatwall: ['The Great Wall of {P}', 'The Wall of {R}'],
  beacon: ['The Beacon of {T}', '{T} Light'], colossus: ['The Colossus of {T}'], lighthouse: ['The Pharos of {T}', 'The Great Lighthouse of {T}'],
  library: ['The Great Library of {T}', 'The Library of {R}'], amphitheatre: ['The Amphitheatre of {R}', 'The Great Arena of {T}'],
  grandtemple: ['The Temple of {G} at {T}', 'The Grand Temple of {F}', 'The Temple of {W}'], pantheon: ['The Pantheon of {T}', 'The Dome of {R}'],
  statue: ['The Statue of {W}', 'The Great {W} of {T}'], palace: ['The Palace of {R}', 'The {W} Palace'],
  cathedral: ['The Cathedral of St {S}', '{T} Cathedral', 'The Great Cathedral of {T}'], greatmosque: ['The Great Mosque of {T}', 'The Mosque of {R}'],
  pagoda: ['The {W} Pagoda', 'The Pagoda of {T}'], observatory: ['The Star Tower of {T}', 'The Observatory of {R}'],
  clocktower: ['{T} Clock Tower', 'The Tower of {R}'], clothhall: ['The Cloth Hall of {T}', 'The {W} Hall'], statebasin: ['The Grand Basin of {T}', 'The {R} Locks'],
  grandpalace: ['The Palace of {W}', 'The Grand Palace of {R}'], royalobs: ['The Royal Observatory of {T}', 'The {R} Observatory'],
  basilica: ['The Basilica of St {S}', 'The Basilica of {F}'], opera: ['The {T} Opera House', 'The {R} Opera'],
  fairtower: ['The {S} Tower', 'The {T} Exhibition Tower'], crystal: ['The Crystal Palace of {T}'], publiclib: ['{T} Public Library', 'The {S} Library'],
  skyscraper: ['The {S} Building', '{T} Tower'], stadium: ['{T} Stadium', 'The {P} National Stadium'], broadcast: ['{T} Broadcast Tower', 'The {T} Needle'],
  spacecentre: ['The {S} Space Centre', '{P} Space Centre'], supertall: ['{T} Sky Tower', 'The {S} Tower'], spaceelevator: ['The {P} Space Elevator', 'The {T} Skyhook'],
};
// minimum people for a town to think of it, by the realm's age
const WN_ERA_MAX = 6, wnPerEra = new Int32Array(ERAS.length);  // standing works of each age's kinds, counted each year
const WN_POP = [60, 75, 90, 100, 110, 120, 125, 130, 135, 140, 145, 150, 155, 160];

// ---- the registry ----
let wnV = 0;  // bumped on every change; never saved
const wnReg = () => W.wonders || (W.wonders = []);
const wnBump = () => { wnV++; };
let wnIdx = null, wnIdxV = -1, wnIdxW = null;
function wonderAt(i) {
  if (!W.wonders || !W.wonders.length) return null;
  if (!wnIdx || wnIdxV !== wnV || wnIdxW !== W) {
    wnIdx = new Map(); wnIdxV = wnV; wnIdxW = W;
    for (const o of W.wonders) for (let dy = 0; dy < o.sh; dy++) for (let dx = 0; dx < o.sw; dx++) wnIdx.set(o.i + dx + dy * W.w, o);
  }
  return wnIdx.get(i) || null;
}
const wnKind = o => WONDER[WN_IX[o.k]] || WONDER[0];
// whoever holds the ground it stands on now, or the town that built it
const wnKeeper = o => { const t = W.townById[W.owner[o.i]]; if (t && t.alive && !t.nomad) return t; const b = W.townById[o.tw]; return b && b.alive ? b : null; };
const wnKnows = (t, K) => { for (const g of K.tix) { let ok = false; for (const x of g) if (t.tech[x] === 1) { ok = true; break; } if (!ok) return false; } return true; };
const wnTiles = o => { const L = []; for (let dy = 0; dy < o.sh; dy++) for (let dx = 0; dx < o.sw; dx++) L.push(o.i + dx + dy * W.w); return L; };
const wnSay = (kind, text, t) => { if (t) chronT(kind, text, t); };
const wnPct = o => Math.floor(clamp(o.prog / Math.max(1, o.need), 0, 1) * 100);

// ---- what it does ----
// Per town, the fx its wonders give it: built ones for their keeper (and their realm), one being built costs the keeper a little
// of its builders' time. Rebuilt when the registry changes; applied by recomputeMods (society.js) through wonderFx.
let wnFx = null, wnFxV = -1, wnFxW = null;
function wnFxMap() {
  if (wnFx && wnFxV === wnV && wnFxW === W) return wnFx;
  wnFx = new Map(); wnFxV = wnV; wnFxW = W;
  const L = W.wonders;
  if (!L || !L.length) return wnFx;
  const add = (t, fx) => { let a = wnFx.get(t.id); if (!a) wnFx.set(t.id, a = {}); fxJoin(a, fx); };
  let byPol = null;
  for (const o of L) {
    if (o.st === 2) continue;
    const t = wnKeeper(o);
    if (!t) continue;
    if (o.st === 0) { add(t, { build: 0.94 }); continue; }
    const K = wnKind(o);
    add(t, K.fx);
    if (K.rfx) {
      if (!byPol) { byPol = new Map(); for (const q of W.towns) if (q.alive) { let a = byPol.get(q.polity); if (!a) byPol.set(q.polity, a = []); a.push(q); } }
      for (const q of byPol.get(t.polity) || []) if (q !== t) add(q, K.rfx);
    }
  }
  return wnFx;
}
function wonderFx(t, m) { if (!W.wonders || !W.wonders.length) return; const f = wnFxMap().get(t.id); if (f) applyFx(m, f); }
const wnSig = new Map();
let wnSigW = null;
function wnRefresh() {
  if (wnSigW !== W) { wnSig.clear(); wnSigW = W; }
  const F = wnFxMap();
  for (const t of W.towns) {
    if (!t.alive) continue;
    const f = F.get(t.id), s = f ? JSON.stringify(f) : '';
    if (s !== (wnSig.get(t.id) || '')) { if (s) wnSig.set(t.id, s); else wnSig.delete(t.id); recomputeMods(t); }
  }
}
const WN_FXW = { happy: 'contentment', order: 'order', admin: 'reach of government', morale: 'morale', research: 'research', trade: 'trade', cargo: 'cargo', defend: 'defence', seaRange: 'sea range', spread: 'spread of ideas' };
const wnFxText = fx => Object.keys(fx).map(k => MOD_ADD[k] ? `+${fx[k]} ${WN_FXW[k] || k}` : `${WN_FXW[k] || k} +${Math.round((fx[k] - 1) * 100)}%`).join(', ');
function wonderEffect(o) {
  const K = wnKind(o);
  if (o.st === 2) return 'None while it lies in ruins';
  if (o.st === 0) return 'Takes some of the town\'s builders while it goes up';
  return wnFxText(K.fx) + (K.rfx ? `; across the realm ${wnFxText(K.rfx)}` : '') + (K.need.includes('f') ? '; draws pilgrims to its faith' : '');
}

// ---- where it goes ----
// Is a footprint clear ground? Fields and footpaths are taken (they are cleared); houses, streets, water and rails are not.
function wnFree(i, sw, sh) {
  const w = W.w, x0 = i % w, y0 = (i / w) | 0;
  if (x0 < 2 || x0 + sw >= w - 2 || y0 < 2 || y0 + sh >= W.h - 2) return false;
  for (let dy = 0; dy < sh; dy++) for (let dx = 0; dx < sw; dx++) {
    const j = i + dx + dy * w;
    if (W.water[j] || W.river[j] || W.canal[j] || W.rail[j] || W.road[j] >= 2 || W.plant[j]) return false;
    const o = W.occ[j];
    if (o === 1 || o === 3 || o === 4) return false;
    if (W.biome[j] === B.SNOW || (W.biome[j] === B.ROCK && W.elev[j] > 0.62)) return false;
    if (slopeAt(j) > 0.13) return false;
  }
  // room to walk round it: most of the ring of tiles outside stays open
  let open = 0, all = 0;
  const ok = j => j > 0 && j < W.occ.length && !W.water[j] && W.occ[j] !== 1 && W.occ[j] !== 3;
  for (let k = -1; k <= sw; k++) { all += 2; if (ok(i + k - w)) open++; if (ok(i + k + sh * w)) open++; }
  for (let k = 0; k < sh; k++) { all += 2; if (ok(i - 1 + k * w)) open++; if (ok(i + sw + k * w)) open++; }
  return open >= all * 0.6;
}
const wnNearSea = (i, sw, sh) => { const w = W.w; for (let dy = -1; dy <= sh; dy++) for (let dx = -1; dx <= sw; dx++) { if (dy >= 0 && dy < sh && dx >= 0 && dx < sw) continue; const j = i + dx + dy * w; if (j > 0 && j < W.water.length && W.water[j] && !W.river[j]) return true; } return false; };
const wnNearRiver = (i, sw, sh) => { const w = W.w; for (let dy = -1; dy <= sh; dy++) for (let dx = -1; dx <= sw; dx++) { const j = i + dx + dy * w; if (j > 0 && j < W.river.length && (W.river[j] >= 2 || W.canal[j])) return true; } return false; };
function wnSite(t, K) {
  const w = W.w, sw = K.w, sh = K.h, n = tn(t), r0 = 2 + Math.sqrt(t.blds.length + n * 0.1 + 12) * 0.85;
  let best = -1, bs = -1e9;
  const tryAt = (i, bonus) => {
    if (i < w * 2 || i >= W.occ.length - w * (sh + 2) || !wnFree(i, sw, sh)) return;
    if (K.need.includes('c') && !wnNearSea(i, sw, sh)) return;
    if (K.need.includes('r') && !wnNearRiver(i, sw, sh)) return;
    const cx = (i % w) + sw / 2, cy = ((i / w) | 0) + sh / 2, d = Math.hypot(wdx(t.x, cx), cy - t.y);
    if (d < 2.5) return;  // the market square and the hearth stay where they are
    const s = bonus - d * 1.2 - slopeAt(i) * 40 - (W.occ[i] === 2 ? 1 : 0) + rnd();
    if (s > bs) { bs = s; best = i; }
  };
  if (K.need.includes('c')) {
    // by the harbour if it has one, otherwise somewhere along its shore
    const spots = t.ports.length ? t.ports.map(b => b.i) : t.sFish.slice(0, 80);
    for (const s of spots) for (let dy = -sh - 2; dy <= 2; dy++) for (let dx = -sw - 2; dx <= 2; dx++) tryAt(s + dx + dy * w, t.ports.length ? 6 : 0);
    return best;
  }
  if (K.need.includes('b')) {
    // a frontier wall faces the nearest foreign town
    let foe = null, fd = 1e9;
    for (const o of W.towns) { if (!o.alive || o.polity === t.polity || tn(o) < 20) continue; const d = Math.abs(wdx(t.x, o.x)) + Math.abs(o.y - t.y); if (d < fd) { fd = d; foe = o; } }
    if (!foe) return -1;
    const a = Math.atan2(foe.y - t.y, wdx(t.x, foe.x));
    for (let d = r0 + 1; d < r0 + 10; d += 1) for (let da = -0.7; da <= 0.7; da += 0.14) {
      const x = Math.round(t.x + Math.cos(a + da) * d - sw / 2), y = Math.round(t.y + Math.sin(a + da) * d - sh / 2);
      tryAt(y * w + x, 30 - Math.abs(da) * 6 + d * 0.8);
    }
    return best;
  }
  let found = 0;
  for (let d = 3; d < r0 * 2.4 + 7 && found < 14; d += 1) {
    const steps = Math.ceil(d * 4), ph = rnd() * 6.283;
    for (let s = 0; s < steps; s++) {
      const a = ph + s / steps * 6.283, x = Math.round(t.x + Math.cos(a) * d - sw / 2), y = Math.round(t.y + Math.sin(a) * d - sh / 2);
      const b0 = best; tryAt(y * w + x, 0); if (best !== b0) found++;
    }
  }
  if (best < 0 && sw === sh && n >= 200 && !K.need.includes('r')) {
    // no room: an old quarter near the middle is bought out for it
    const i = clearOldQuarter(t, sw);
    if (i >= 0 && wnFree(i, sw, sh)) best = i;
  }
  return best;
}
function wnClaim(o) {
  for (const j of wnTiles(o)) {
    if (W.occ[j] === 2) dropField(j);
    W.tree[j] = 0; W.forage[j] = 0;
    if (W.road[j] === 1) { W.road[j] = 0; W.wear[j] = 0; }
    W.occ[j] = 1; updCost(j); dirty(j);
  }
}
function wnRelease(o) { for (const j of wnTiles(o)) { if (W.occ[j] === 1 && !W.bAt.get(j)) W.occ[j] = 0; updCost(j); dirty(j); } }

// ---- names ----
function wnName(t, K) {
  const c = t.culture, pol = t.polity, F = t.faith >= 0 && W.faiths ? W.faiths[t.faith] : null;
  const rul = pol.ruler && pol.ruler.alive && pol.ruler.name ? pol.ruler.name.split(' ')[0] : personName(c, rint(2));
  const tok = { T: t.name, R: rul, P: pol.name, W: cap(word(c, 2)), F: F ? F.name : t.name, G: F ? F.kind.replace(/^the /, 'the ') : 'the Gods', S: personName(c, rint(2)) };
  const fill = s => s.replace(/\{(\w)\}/g, (_, k) => tok[k]);
  const L = WN_NAMES[K.id] || ['The ' + K.name + ' of {T}'];
  const used = n => wnReg().some(o => o.nm === n);
  const start = rint(L.length);
  for (let q = 0; q < L.length; q++) { const n = fill(L[(start + q) % L.length]); if (!used(n)) return n; }
  const n0 = fill(L[start]);
  for (const p of ['New ', 'Second ', 'Greater ']) { const q = n0.replace(/^The /, 'The ' + p); if (!used(q)) return q.startsWith('The ') ? q : p + n0; }
  return n0 + ' II';
}

// ---- choosing what to build ----
const wnAge = t => (t.polity && t.polity.era) || 0;
const wnRich = (t, K) => {
  const cur = t.polity.cur, n = tn(t);
  if (cur.kind >= 2) return t.cash > n * Math.max(0.5, t.wage || 1) * 0.25;
  const r = wnMat(t, K);
  return r === undefined ? t.stock[R.FOOD] > n * 4 : t.stock[r] > 30 + K.work * 0.05;
};
function wnProsper(t) {
  const n = tn(t);
  return t.alive && !t.nomad && !t.occupier && !t.attack && !t.famine && !(t.starvedY > 0) && t.stock[R.FOOD] > n * 2 && (t.unrest || 0) < 45 && n >= WN_POP[Math.min(WN_POP.length - 1, wnAge(t))];
}
function wnChoose(t, held, free) {
  const age = wnAge(t), F = t.faith >= 0 && W.faiths ? W.faiths[t.faith] : null, pref = F ? WN_FAITH[F.kind] : null, cap0 = t.polity.capital === t;
  let best = null, bs = -1e9, top = 0;
  for (const k of held) top = Math.max(top, WONDER[WN_IX[k]].era);  // a town that has one builds something newer next
  for (const K of WONDER) {
    if (K.bad || K.era > age + 1 || K.era < age - 2 || K.era < top || (!free && wnPerEra[K.era] >= WN_ERA_MAX) || !wnKnows(t, K) || held.has(K.id)) continue;
    const nd = K.need;
    if (nd.includes('k') && !cap0) continue;
    if (nd.includes('f') && !F) continue;
    if (nd.includes('u') && W.wonders.some(o => o.k === K.id && o.st !== 2 && o.pol === t.polity.id)) continue;
    if (nd.includes('c') && !(t.ports.length || t.sFish.length > 6)) continue;
    if (nd.includes('r') && !t.near.river) continue;
    if (nd.includes('b') && !onFrontier(t)) continue;
    if (!free && !wnRich(t, K)) continue;
    let s = 20 - Math.abs(age - K.era) * 9 + hash2(t.culture.id, K.ix, 77) * 16 + rnd() * 6;
    if (nd.includes('f')) s += pref ? (pref === K.id ? 14 : -10) : 0;
    if (nd.includes('c') && t.ports.length) s += 4;
    if (nd.includes('k') || nd.includes('u')) s += 3;
    if (s > bs) { bs = s; best = K; }
  }
  return best;
}
// Starts one. free: paid for from outside (the Patron), so the town's own purse doesn't decide it.
function wnBegin(t, K, free) {
  const i = wnSite(t, K);
  if (i < 0) return null;
  const L = wnReg(), yr = Math.floor(year());
  const o = { id: (W.wonderN = (W.wonderN || 0) + 1), k: K.id, nm: wnName(t, K), tw: t.id, pol: t.polity.id, i, x: i % W.w, y: (i / W.w) | 0, sw: K.w, sh: K.h, st: 0, prog: 0, need: K.work, sy: yr, y: 0, ry: 0, how: '', by: '', stall: 0, fn: t.faith, rest: 0, unk: 0, spent: 0 };
  wnClaim(o);
  L.push(o); wnBump();
  if (K.work >= 400 || t.polity.capital === t || free) wnSay('wonder', `${t.name} begins work on ${o.nm}, ${/^[aeiou]/i.test(K.name) ? 'an' : 'a'} ${K.name.toLowerCase()}.`, t);
  return o;
}

// ---- a year's work ----
// The builders it can spare, and the money or materials to keep them at it. Returns the work done.
function wnWork(o, t, K) {
  const n = tn(t), pol = t.polity;
  if (t.occupier || t.attack || t.famine || t.starvedY > 0 || t.stock[R.FOOD] < n * 0.5) { o.stall++; return 0; }
  const crew = t.jobs[J.BUILD] * t.scale * 0.35 + n * 0.045 + 2;  // some of its builders, and labourers called up from the rest
  let f = crew * t.mod.build * Math.sqrt(Math.max(0.5, Math.min(2, t.toolMul || 1)));
  if (Object.keys(pol.warsWith).length) f *= onFrontier(t) ? 0.35 : 0.7;  // men and money go to the war
  f = Math.min(f, o.need / (K.era >= 6 ? 3 : K.era >= 3 ? 6 : 8));  // however many hands, it takes some years
  const cur = pol.cur;
  if (cur.kind >= 2) {
    const want = f * Math.max(0.5, t.wage || 1) * 1.2;
    let paid = Math.min(want, Math.max(0, t.cash) * 0.4);
    t.cash -= paid;
    if (paid < want && (pol.capital === t || K.need.includes('u') || K.need.includes('k'))) { const q = Math.min(want - paid, Math.max(0, cur.treasury) * 0.08); cur.treasury -= q; cur.spentY += q; paid += q; }
    o.spent += paid;
    f *= want > 0 ? paid / want : 1;
  } else {
    const r = wnMat(t, K);
    if (r !== undefined) { const want = f * 0.6, got = Math.min(want, t.stock[r] * 0.5); t.stock[r] -= got; f *= want > 0 ? 0.25 + 0.75 * got / want : 1; }
    else { const want = f * 2, got = Math.min(want, Math.max(0, t.stock[R.FOOD] - n * 2) * 0.2); t.stock[R.FOOD] -= got; f *= 0.3 + 0.7 * got / Math.max(want, 0.01); }  // the labourers have to eat
  }
  if (f < crew * 0.15) o.stall++; else o.stall = 0;
  return f;
}
function wnFinish(o, t, K) {
  const yr = Math.floor(year());
  o.st = 1; o.y = yr; o.prog = o.need; o.stall = 0; o.unk = 0; wnBump();
  if (o.rest) { wnSay('wonder', `${t.name} finishes restoring ${o.nm}, ruined in ${o.ry}.`, t); o.rest = 0; return; }
  const yrs = yr - o.sy;
  wnSay('wonder', `${t.name} completes ${o.nm} after ${yrs} year${yrs === 1 ? '' : 's'}. ${K.about}`, t);
}
// Ruins it: o.how 'sacked', 'burnt', 'fell'... by: who did it
function wnRuin(o, how, by) {
  o.st = 2; o.ry = Math.floor(year()); o.how = how; o.by = by || ''; o.stall = 0; o.rest = 0; wnBump();
}

function wondersYear() {
  const L = wnReg(), yr = Math.floor(year());
  wnBump();  // keepers and realms may have changed hands since last year
  // ---- the ones that exist ----
  for (let k = L.length - 1; k >= 0; k--) {
    const o = L[k], K = wnKind(o);
    // swallowed by the sea or dug through: gone altogether
    if (wnTiles(o).some(j => W.water[j])) { wnRelease(o); L.splice(k, 1); wnBump(); continue; }
    for (const j of wnTiles(o)) if (W.occ[j] === 0) { W.occ[j] = 1; updCost(j); }
    const t = wnKeeper(o);
    if (o.st === 0) {
      if (!t) {
        // its town is gone: the half-built work is left to the weather
        if (o.prog < o.need * 0.15) { wnRelease(o); L.splice(k, 1); wnBump(); } else wnRuin(o, 'abandoned');
        continue;
      }
      o.prog += wnWork(o, t, K);
      if (o.prog >= o.need) { wnFinish(o, t, K); continue; }
      if (o.stall >= 50) {
        if (o.prog < o.need * 0.25) { if (K.work >= 400) wnSay('misc', `${t.name} gives up on ${o.nm}.`, t); wnRelease(o); L.splice(k, 1); wnBump(); }
        else { wnRuin(o, 'abandoned'); if (K.work >= 400) wnSay('misc', `Work on ${o.nm} stops for good, and the unfinished walls are left standing.`, t); }
      }
      continue;
    }
    if (o.st === 1) {
      if (!t) {
        // nobody keeps it: timber rots in a few decades, stone takes centuries to come down
        o.unk++;
        const p = K.mat === 'wood' ? 0.05 : K.mat === 'stone' || K.mat === 'earth' || K.mat === 'brick' ? 0.006 : 0.02;
        if (o.unk > 15 && rnd() < p) wnRuin(o, 'fell');
        continue;
      }
      o.unk = 0;
      // pilgrims and preachers carry its faith along the trade roads
      if (K.need.includes('f') && t.faith >= 0 && W.faiths && W.faiths[t.faith]) {
        const F = W.faiths[t.faith];
        for (const q of t.partners) {
          if (q.faith === t.faith || !q.alive || rnd() > 0.012) continue;
          const old = q.faith;
          q.faith = t.faith; recomputeMods(q);
          if (old >= 0 && tn(q) > 80 && rnd() < 0.4) chronT('gov', `Pilgrims coming home from ${o.nm} bring ${F.name} to ${q.name}.`, q);
        }
      }
      continue;
    }
    // ruins: a town that can afford it, and knows how, may put it back
    if (t && !o.rest && yr - o.ry >= 10 && wnProsper(t) && wnKnows(t, K) && wnRich(t, K) && !L.some(q => q.st === 0 && wnKeeper(q) === t) && rnd() < 0.02) {
      o.st = 0; o.rest = 1; o.prog = o.need * (o.how === 'abandoned' ? 0.3 : 0.45); o.tw = t.id; o.pol = t.polity.id; o.sy = yr; o.stall = 0; wnBump();
      wnSay('wonder', `${t.name} sets out to restore ${o.nm}, in ruins since ${o.ry}.`, t);
    }
  }
  // ---- new ones ----
  // the world holds only so many of each age's works: a few dozen standing by modern times, not hundreds
  const lim = 4 + (W.eraNow || 0) * 6;
  let live = 0; wnPerEra.fill(0);
  for (const o of L) if (o.st !== 2) { live++; wnPerEra[wnKind(o).era]++; }
  if (live < lim) {
    const busy = new Set(), held = new Map();
    const hold = (t, k) => { let h = held.get(t.id); if (!h) held.set(t.id, h = new Set()); h.add(k); };
    for (const o of L) { const t = wnKeeper(o), b = W.townById[o.tw]; if (b && b !== t && b.alive) hold(b, o.k); if (!t) continue; if (o.st === 0) busy.add(t.id); hold(t, o.k); }
    for (const t of W.towns) {
      if (busy.has(t.id) || !wnProsper(t)) continue;
      const h = held.get(t.id) || new Set(), n = tn(t), age = wnAge(t), min = WN_POP[Math.min(WN_POP.length - 1, age)];
      let mine = 0; for (const k of h) mine++;
      if (mine >= 1 + Math.floor(n / (min * 1.2)) + (t.polity.capital === t ? 1 : 0)) continue;
      const p = 0.006 * Math.min(3, n / min) * (t.polity.capital === t ? 1.8 : 1);
      if (rnd() > p) continue;
      const K = wnChoose(t, h, false);
      if (K && wnBegin(t, K, false)) { live++; wnPerEra[K.era]++; busy.add(t.id); if (live >= lim) break; }
    }
  }
  wnRefresh();
}
// A sacked town (war.js occupy): what stands may be stripped or pulled down; scaffolding burns.
function wondersSacked(t, pol, cruel) {
  const L = W.wonders;
  if (!L || !L.length) return;
  for (const o of L) {
    if (o.st === 2 || wnKeeper(o) !== t) continue;
    const K = wnKind(o);
    if (o.st === 0) {
      o.prog *= cruel ? 0.4 : 0.75; wnBump();
      if (cruel && o.prog < o.need * 0.2) { wnRuin(o, 'burnt', pol.name); chronT('war', `The ${pol.name} burn the scaffolding of the unfinished ${o.nm}.`, t); }
      continue;
    }
    const faithFoe = K.need.includes('f') && pol.capital && pol.capital.faith !== o.fn;
    if (rnd() < (cruel ? 0.45 : 0.08) + (faithFoe ? 0.15 : 0)) {
      wnRuin(o, K.mat === 'wood' ? 'burnt' : 'sacked', pol.name);
      chronT('war', `${o.nm} is ${K.mat === 'wood' ? 'burnt' : 'pulled down'} by the ${pol.name} in the sack of ${t.name}.`, t);
    } else if (!(o.loot > year() - 40) && rnd() < 0.5) {
      // its treasure goes home with the victors
      const v = pol.cur.kind >= 2 ? Math.min(t.cash * 0.2, tn(t) * 2) : 0;
      if (v > 0) { t.cash -= v; pol.cur.treasury += v; }
      o.loot = Math.floor(year()); wnBump();
      chronT('war', `The ${pol.name} strip ${o.nm} of its treasures.`, t);
    }
  }
}
// The Patron (patron.js) pays for a great work in a town: speeds one under way, restores a ruin, or starts a new one.
// Returns what happened, or null if there's nothing to be done there.
function wonderFund(t) {
  if (!t || !t.alive || t.nomad || !W.towns) return null;
  const L = wnReg();
  const cur0 = L.find(o => o.st === 0 && wnKeeper(o) === t);
  if (cur0) {
    cur0.prog = Math.min(cur0.need, cur0.prog + cur0.need * 0.25); cur0.stall = 0; wnBump();
    if (cur0.prog >= cur0.need) { wnFinish(cur0, t, wnKind(cur0)); wnRefresh(); return `${cur0.nm} is finished.`; }
    return `Work on ${cur0.nm} speeds up: ${wnPct(cur0)}% done.`;
  }
  const ruin = L.find(o => o.st === 2 && wnKeeper(o) === t && wnKnows(t, wnKind(o)));
  if (ruin) {
    ruin.st = 0; ruin.rest = 1; ruin.prog = ruin.need * 0.6; ruin.tw = t.id; ruin.pol = t.polity.id; ruin.sy = Math.floor(year()); ruin.stall = 0; wnBump();
    wnSay('wonder', `${t.name} sets out to restore ${ruin.nm}, in ruins since ${ruin.ry}.`, t);
    wnRefresh();
    return `Restoration of ${ruin.nm} begins.`;
  }
  const held = new Set(); for (const o of L) if (wnKeeper(o) === t) held.add(o.k);
  const K = wnChoose(t, held, true);
  if (!K) return null;
  const o = wnBegin(t, K, true);
  if (!o) return null;
  o.prog = o.need * 0.15;
  wnRefresh();
  return `Work begins on ${o.nm}.`;
}

// ---- what the screen shows ----
function wonderInfo(o) {
  const K = wnKind(o), t = wnKeeper(o), b = W.townById[o.tw];
  const state = o.st === 0 ? `${o.rest ? 'Being restored' : 'Being built'}, ${wnPct(o)}%${o.stall ? ' (stalled)' : ''}`
    : o.st === 1 ? `Built ${o.y}${o.loot ? `, looted ${o.loot}` : ''}` : `${o.how === 'abandoned' ? 'Left unfinished' : o.how === 'fell' ? 'Fell into ruin' : o.how === 'burnt' ? 'Burnt' : 'Ruined'}${o.by ? ' by the ' + o.by : ''} in ${o.ry}`;
  return { name: o.nm, kind: K.name, state, town: t ? t.name : b ? b.name : '', effect: wonderEffect(o), about: K.about, built: o.y || null, ruined: o.st === 2 };
}
function wonderTip(o) { const f = wonderInfo(o); return `${f.name}${f.name.includes(f.kind) ? '' : ' (' + f.kind.toLowerCase() + ')'} · ${f.state}`; }
function wonderTileRows(i, rows) {
  const o = wonderAt(i);
  if (!o) return;
  const f = wonderInfo(o);
  rows.push(['Great work', f.name], ['Kind', f.kind], ['State', f.state], ['Effect', f.effect], ['', f.about]);
}
function wonderTownHTML(t) {
  const L = W.wonders;
  if (!L || !L.length) return '';
  const mine = L.filter(o => wnKeeper(o) === t);
  if (!mine.length) return '';
  return `<h4>Great works</h4>${mine.map(o => { const f = wonderInfo(o); return `<div class="sub"><b>${esc(f.name)}</b>: ${esc(f.kind.toLowerCase())}, ${esc(f.state.charAt(0).toLowerCase() + f.state.slice(1))}. ${esc(f.effect)}.</div>`; }).join('')}`;
}
function wondersStatsHTML() {
  const L = W.wonders;
  if (!L || !L.length) return '';
  const rows = L.slice().sort((a, b) => (a.st === 2) - (b.st === 2) || (a.y || 1e9) - (b.y || 1e9) || a.sy - b.sy);
  return `<h3 style="font:600 14px var(--sans);color:var(--chart-ink);margin:12px 0 4px">Wonders of the world</h3><table class="dt"><thead><tr><th>Great work</th><th>Kind</th><th>Town</th><th>Realm</th><th>State</th></tr></thead><tbody>${rows.map(o => {
    const f = wonderInfo(o), t = wnKeeper(o), p = t ? t.polity : W.polities[o.pol];
    return `<tr><td>${esc(f.name)}</td><td>${esc(f.kind)}</td><td>${esc(f.town || '–')}</td><td>${p ? esc(p.name) : '–'}</td><td>${esc(f.state)}</td></tr>`;
  }).join('')}</tbody></table>`;
}
// For balance checks: how many of each kind, by state.
function wondersSummary() {
  const c = {};
  for (const o of wnReg()) { const k = o.k + (o.st === 0 ? '(building)' : o.st === 2 ? '(ruin)' : ''); c[k] = (c[k] || 0) + 1; }
  return JSON.stringify(c);
}
