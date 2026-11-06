'use strict';
// Bridges. Wherever a street, a planned road or a railway crosses a river, a canal or a lake, that crossing is a bridge of its own
// (W.bridges). What kind it is gets chosen once, from what its builders know, how far it has to reach, how deep the water is,
// the ground (a gorge, a mountain), the weather (snow and rain want a roof), the traffic (foot, road or rail) and whether ships
// have to pass. Old ones may be rebuilt as something newer when the realm is rich, the famous old ones are often kept, armies
// burn or blow them up to hold a river line, and they are rebuilt once the war has moved on. Drawn by bridgeart.js.

// id | name | era | techs needed | material | longest crossing m | shortest it suits m | cost per m | upkeep per m a year |
// carries a day | km/h | f foot, r road, l rail | grand: always worth a name | what it is
const BRIDGE_SRC = `
ford|Ford and stepping stones|0||stone|30|0|0|0|300|4|fr|0|Flat stones across the shallows for walkers, and a ford beside them where carts splash through.
log|Log bridge|1|bridges|timber|16|0|1|0.4|600|5|fr|0|Two or three trunks felled across the narrow place, with planks pegged over them.
clapper|Clapper bridge|1|bridges,masonry|stone|30|0|2|0.05|500|5|fr|0|Great flat slabs laid from one stone pier to the next, low over the stream.
rope|Rope bridge|1|bridges,cordage|rope|160|20|1|0.8|150|3|f|0|Plaited ropes slung across the gorge, slats underfoot, and nothing to see below but the drop.
pontoon|Bridge of boats|2|bridges,barges|boats|900|40|1.5|0.9|1500|6|fr|1|Boats moored side by side across the current with a road of planks laid over them.
trestle|Timber trestle|2|bridges,carpentry|timber|350|15|2|0.5|2000|15|frl|0|A timber deck on rows of braced posts, quick to raise and quick to burn.
corbel|Corbelled stone bridge|2|bridges,corbelling|stone|24|0|3|0.05|800|6|fr|0|Each course of stone juts out over the last until the two sides meet over the water.
arch|Stone arch bridge|3|arches,bridges|stone|50|0|4|0.05|2500|15|fr|0|A single arch of wedge-shaped stones, each locking the next, that will stand for a thousand years.
causeway|Causeway|3|builtroads,engineering|stone|3000|150|2|0.2|4000|20|r|1|An embankment of rubble run out over the shallows, with arches where the water must pass.
multiarch|Many-arched stone bridge|4|bridges2|stone|900|40|5|0.08|5000|20|frl|1|Arch after arch across the wide river on piers with pointed cutwaters to part the floods.
aqueduct|Aqueduct bridge|3|aqueduct,arches|stone|600|60|7|0.1|2500|15|fr|1|Tier upon tier of arches carrying the town's water across the valley, and a road along the lower tier.
covered|Covered bridge|4|timberframe,bridges|timber|130|10|3|0.3|1500|12|fr|0|A timber bridge with walls and a roof, so the snow and rain never rot its beams.
inhabited|Bridge of houses and shops|4|bridges2,guilds|stone|320|30|8|0.2|4000|6|fr|1|Houses, shops and a chapel crowd both sides of the roadway, overhanging the river on timber struts.
drawbridge|Drawbridge|4|castles,bridges|timber|40|0|4|0.5|1500|8|fr|0|A timber leaf on chains between two gate towers: raised for a mast, or against an enemy.
bascule|Bascule bridge|6|steam,ironbridges|steel|130|20|9|0.6|20000|40|frl|1|Two counterweighted leaves that swing up from the towers to let the tall ships through.
swing|Swing bridge|6|steam,ironbridges|iron|160|15|8|0.6|15000|30|frl|0|The middle span turns on a pier in the river to open the channel to shipping.
castiron|Cast-iron arch|6|ironbridges|iron|120|20|6|0.15|8000|30|fr|1|Cast iron ribs poured in sections and bolted together, a whole gorge leapt in one span.
truss|Wrought-iron truss|6|puddling,railway|iron|600|30|6|0.3|20000|60|frl|0|A riveted lattice of wrought-iron triangles, light and stiff, built for the railways.
steeltruss|Steel truss|6|bessemer|steel|900|30|6|0.25|30000|80|frl|0|Steel girders in a lattice of verticals and diagonals, span after span.
viaduct|Railway viaduct|6|railway,masonry|brick|2000|60|7|0.1|40000|100|l|1|Millions of bricks in a long row of tall arches, carrying the line level across the valley.
tubular|Tubular girder bridge|6|puddling,railway,steamhammer|iron|500|100|9|0.3|30000|80|l|1|The trains run inside a great box of riveted iron plate laid from tower to tower.
cantilever|Cantilever bridge|6|bessemer,openhearth|steel|2000|300|10|0.3|60000|100|rl|1|Huge steel arms reach out from each pier and meet in the middle over the deep water.
suspension|Suspension bridge|6|suspension|steel|2500|150|10|0.35|60000|90|fr|1|The roadway hangs from cables slung over two tall towers and anchored deep in each bank.
steelarch|Steel arch bridge|7|openhearth,electric|steel|600|120|9|0.2|80000|90|frl|1|A great steel arch springs from bank to bank and the deck hangs from it.
concretearch|Concrete arch bridge|7|reinforced|concrete|450|15|6|0.08|50000|90|frl|0|A slender arch of reinforced concrete under the deck, with open spandrels.
tiedarch|Tied-arch bridge|7|welding,openhearth|steel|350|40|7|0.15|50000|90|frl|0|A bowstring arch above the deck, its ends tied together by the deck itself.
boxgirder|Box girder bridge|7|reinforced,welding|steel|1500|0|5|0.12|90000|110|frl|0|A deep hollow beam of welded steel or concrete on slim piers: plain, cheap and everywhere.
floating|Floating bridge|7|reinforced,highways|concrete|2500|400|6|0.4|60000|90|r|1|Hollow concrete pontoons anchored across a lake too deep for piers.
cablestayed|Cable-stayed bridge|8|welding,cad|steel|1200|150|9|0.2|120000|120|frl|1|Fans of straight cables run from tall pylons down to the deck.
bridgetunnel|Bridge-tunnel|8|tunnelboring,highways|concrete|40000|2000|14|0.5|150000|110|rl|1|A long bridge to an artificial island, then a tunnel under the shipping channel.
maglev|Maglev guideway|10|maglev|composite|6000|0|10|0.15|200000|450|l|0|A slim beam on Y-shaped piers that the trains float above, magnetically.
skyspan|Graphene skyspan|9|graphene|graphene|15000|200|12|0.05|300000|160|frl|1|A ribbon of graphene, thinner than a sheet of paper for its length, hung from a single soaring arch.
`;
const BRIDGE = [], BR_IX = {}, BR_BADTECH = [];
for (const line of BRIDGE_SRC.trim().split('\n')) {
  const [id, name, era, tech, mat, max, min, cost, upk, cap, kmh, use, grand, about] = line.split('|');
  const T = { id, name, era: +era, tech: tech ? tech.split(',') : [], mat, max: +max, min: +min, cost: +cost, upk: +upk, cap: +cap, kmh: +kmh, use, grand: grand === '1', about, ix: BRIDGE.length };
  T.tix = T.tech.map(t => TECH_IX[t]);
  if (T.tix.some(x => x === undefined)) { T.bad = true; BR_BADTECH.push(id + ':' + T.tech.filter(t => TECH_IX[t] === undefined).join(',')); }
  BR_IX[id] = T.ix; BRIDGE.push(T);
}
const BR_MOVABLE = { drawbridge: 1, bascule: 1, swing: 1 };
const BR_TILE_M = 60;  // metres to a tile, for spans
const brKnows = (t, T) => { if (!T.tix.length) return true; if (!t || !t.tech) return false; for (const x of T.tix) if (t.tech[x] !== 1) return false; return true; };

// The registry: { list: [records], n: next id, v: version, cy: chronicle year, cn: lines this year }. Records are plain data:
// { id, s: 'st' street | 'rd' planned road | 'rl' railway, t: [wet tiles], i: middle tile, r, q: planned road id and bridge range,
//   P: [ax, ay, bx, by] the deck's ends in tiles, w: deck width in tiles, k: type id, y: year built, nm: name, pol, bld: builder town,
//   sp: span m, lv: river size, sh: ships pass, cn: canal, lk: lake, gz: gorge, br: broken, by, ry: broken and rebuild years,
//   was: road or rail levels before it was broken, pt: an army's bridge of boats over the gap, keep: an old one kept, old: history }
function bridgeReg() {
  if (!W.bridges || !W.bridges.list) W.bridges = { list: [], n: 1, v: 0, cy: 0, cn: 0, init: 0 };
  return W.bridges;
}
// indexes, never saved: tile -> record, and a planned road's range -> record
let brIdx = null, brIdxV = -1, brIdxW = null, brRdIdx = null;
function bridgeIndex() {
  const B = bridgeReg();
  if (brIdx && brIdxV === B.v && brIdxW === W) return brIdx;
  brIdx = new Map(); brRdIdx = new Map();
  for (const r of B.list) {
    for (const i of r.t) if (!brIdx.has(i) || r.s === 'rd') brIdx.set(i, r);
    if (r.s === 'rd') brRdIdx.set(r.r * 256 + r.q, r);
  }
  brIdxV = B.v; brIdxW = W;
  return brIdx;
}
function bridgeAt(i) { return bridgeIndex().get(i) || null; }
const bridgeOfRoad = (R0, q) => { bridgeIndex(); return brRdIdx.get(R0.id * 256 + q) || null; };
const brWet = i => W.river[i] >= 2 || W.canal[i] > 0;
const brTown = r => W.townById[W.owner[r.i]] || W.towns.find(t => t.id === r.bld && t.alive) || null;
const brPol = r => { const t = W.townById[W.owner[r.i]]; return t ? t.polity : null; };  // whoever holds the banks now
function brNearTown(i, R) {
  const x = i % W.w, y = (i / W.w) | 0;
  let best = null, bd = R * R;
  for (const t of W.towns) { if (!t.alive) continue; const d = (t.x - x) ** 2 + (t.y - y) ** 2; if (d < bd) { bd = d; best = t; } }
  return best;
}

// ---- choosing a kind ----
// Everything a builder weighs, read off the map around a crossing.
function bridgeCtx(r, t) {
  let lv = 0, canal = 0, lake = 0, ships = 0, gz = 0, wet = 0, cold = 0;
  for (const i of r.t) {
    lv = Math.max(lv, W.river[i]); if (W.canal[i]) canal = Math.max(canal, W.canal[i]); if (W.water[i]) lake = 1;
    if (W.lane[i] >= 4 && (W.river[i] >= 3 || W.water[i])) ships = 1;
    gz = Math.max(gz, slopeAt(i));
  }
  const i0 = r.i, x = i0 % W.w, y = (i0 / W.w) | 0;
  cold = W.temp[i0] < 0.33 ? 1 : 0; wet = W.moist[i0] > 0.78 ? 1 : 0;
  if (canal >= 2 && !ships) ships = 2;  // barges and coasters on a ship canal: fewer and smaller than on a great river
  const n = t ? tn(t) : 0, inTown = !!t && Math.hypot(t.x - x, t.y - y) <= urbanR(t);
  const lvl = t && t.polity && t.polity.cur ? t.polity.cur.level || 1 : 1;
  const gorge = gz > 0.05 || W.elev[i0] > 0.62;
  return {
    // a track up in the mountains is for walkers and pack trains: a rope bridge will do
    t, use: r.s === 'rl' ? 'l' : (r.road || 3) <= 2 && gorge ? 'f' : 'r', span: r.sp, lv, canal, lake, ships, cold, wet, n, inTown, road: r.road || 3,
    gorge, stony: gz > 0.025 || W.elev[i0] > 0.45,
    rich: !!t && t.cash > Math.max(50, n * 0.6 * lvl), walls: !!(t && t.walls && inTown),
    aq: !!(t && (t.count.aqueduct || 0) > 0 && inTown && hash2(x, y, 91) < 0.35),
  };
}
function chooseBridge(c, not) {
  let best = null, bs = -1e9;
  for (const T of BRIDGE) {
    if (T.bad || T.id === not || !T.use.includes(c.use) || c.span > T.max || !brKnows(c.t, T)) continue;
    let s = T.era * 10 + rnd() * 10;
    if (c.span < T.min) s -= 45;
    switch (T.id) {
      case 'ford': if (c.lv > 2 || c.ships || c.canal || c.lake) continue; s += c.road <= 2 ? 45 : -60; break;
      case 'clapper': case 'corbel': if (c.lv > 2 || c.ships || c.canal || c.lake) continue; s += c.stony ? 12 : -6; break;
      case 'log': if (c.lake) continue; break;
      case 'rope': if (!c.gorge) continue; s += 28; break;
      case 'pontoon': if (c.gorge || (c.lv < 4 && !c.lake && c.span < 150)) continue; s += c.lake ? 12 : -4; break;
      case 'causeway': if (!c.lake) continue; s += 12; break;
      case 'aqueduct': if (!c.aq) continue; s += 14; break;
      case 'covered': if (!c.cold && !c.wet) continue; s += 24; break;
      case 'inhabited': if (c.n < 500 || !c.inTown) continue; s += 20; break;
      case 'drawbridge': if (!c.ships && !c.walls) continue; s += c.t && c.t.tech[TECH_IX.steam] === 1 ? 0 : 22; break;
      case 'bascule': case 'swing': if (!c.ships && !c.canal) continue; s += ((c.ships === 1 ? (c.inTown ? 24 : 6) : c.ships ? 4 : 0) + (c.canal ? (T.id === 'swing' ? 6 : 2) : 0)) * (c.t && c.t.tech[TECH_IX.welding] === 1 ? 0.5 : 1); break;  // later, high fixed spans let the ships under
      case 'viaduct': s += c.gorge ? 26 : 8; break;
      case 'tubular': s += c.lv >= 4 || c.lake ? 8 : -12; break;
      case 'suspension': case 'cantilever': case 'cablestayed': s += (c.span >= 300 ? 15 : 0) + (c.gorge ? 10 : 0); break;
      case 'floating': if (!c.lake) continue; s += 10; break;
      case 'bridgetunnel': if (!c.lake || !c.ships) continue; s += 22; break;
      case 'maglev': s += 22; break;
    }
    if (c.ships && !BR_MOVABLE[T.id] && c.inTown && c.span < 120 && T.era >= 4) s -= 8;  // low town bridges stop the masts
    s -= T.cost * (c.span / 100) * (c.rich ? 0.3 : 1.2);
    if (s > bs) { bs = s; best = T; }
  }
  if (best) return best;
  // nothing they know reaches that far: the longest-reaching thing they do know, stretched
  for (const T of BRIDGE) if (!T.bad && T.use.includes(c.use) && brKnows(c.t, T) && T.id !== not && T.id !== 'ford' && (!best || T.max > best.max)) best = T;
  return best || BRIDGE[c.use === 'l' ? BR_IX.trestle : c.lv <= 2 && !c.lake ? BR_IX.ford : BR_IX.log];
}
// ---- names: only the long, grand or big-city ones get one ----
function bridgeName(r, T, c) {
  const t = c.t, ri = W.riverId ? W.riverId[r.i] : -1, rv = W.river[r.i] && W.rivers && W.rivers[ri] ? W.rivers[ri].name : '';
  const place = t ? t.name : rv || 'the Ford';
  const big = c.span >= 300 || (t && t.polity && t.polity.capital === t && T.grand && c.span >= 120);
  let nm = T.id === 'viaduct' || T.id === 'maglev' ? `${place} Viaduct` : T.id === 'aqueduct' ? `${place} Aqueduct` : T.id === 'inhabited' ? `${place} Bridge`
    : T.id === 'bascule' && c.n >= 1500 ? `${place} Tower Bridge` : T.id === 'bridgetunnel' ? `${place} Crossing` : T.id === 'causeway' ? `${place} Causeway`
    : big ? `Great Bridge of ${place}` : rv && hash2(r.i, 3, 5) < 0.5 ? `${rv} Bridge` : `${place} Bridge`;
  const used = n => bridgeReg().list.some(o => o !== r && o.nm === n);
  if (used(nm)) for (const p of ['New ', 'Upper ', 'Lower ', 'North ', 'South ', 'Second ']) { const q = nm.startsWith('Great ') ? nm.replace('Great ', p === 'New ' ? 'New Great ' : `${p}Great `) : p + nm; if (!used(q)) { nm = q; break; } }
  return nm;
}
const brNotable = (r, T, c) => T.grand || (T.era >= 2 && (r.sp >= 200 || (c.inTown && c.n >= 1500 && T.era >= 3)));
// Puts a kind on a record (new, rebuilt or replaced) and names it if it deserves one.
function setBridgeKind(r, T, c) {
  if (r.k && r.k !== T.id) (r.old || (r.old = [])).push(r.k + ':' + r.y);
  r.k = T.id; r.y = Math.floor(year()); r.br = 0; r.pt = 0;
  if (!r.nm && brNotable(r, T, c)) r.nm = bridgeName(r, T, c);
  if (r.s === 'rd') { const R0 = brRoad(r); if (R0) { if (!R0.brk) R0.brk = []; R0.brk[r.q] = T.id; } }
  bridgeReg().v++;
}
const brRoad = r => W.roadNet ? W.roadNet.roads.find(o => o.id === r.r) || null : null;
// The builders pay: in money where there is money, in timber, stone or metal where there isn't. Returns false if they can't.
function payBridge(t, T, span, must) {
  if (!t) return !must;
  const money = t.polity && t.polity.cur && t.polity.cur.kind >= 2, amt = T.cost * span * 0.05 * Math.max(1, t.wage || 1);
  if (money) { if (t.cash < amt * (must ? 2 : 0.5)) return !must; t.cash -= Math.min(t.cash, amt); return true; }
  const res = T.mat === 'timber' || T.mat === 'rope' || T.mat === 'boats' ? R.WOOD : T.mat === 'iron' ? R.IRON : T.mat === 'steel' ? R.STEEL : R.STONE, q = T.cost * span * 0.08;
  if (t.stock[res] < q * (must ? 2 : 0.5)) return !must;
  t.stock[res] -= Math.min(t.stock[res], q);
  return true;
}
const brSay = (text, t) => { const B = bridgeReg(), yr = Math.floor(year()); if (B.cy !== yr) { B.cy = yr; B.cn = 0; } if (!t || B.cn >= 4) return; B.cn++; chronT('misc', text, t); };
const brWater = r => { const n = typeof waterNameAt === 'function' ? waterNameAt(r.i) : ''; return n ? n.replace(/^The /, 'the ') : r.cn ? 'the canal' : 'the water'; };

// ---- finding the crossings: a sweep of the map once a year ----
let brStamp = null, brSid = 0;
const brStreet = i => W.road[i] >= 2 && W.occ[i] !== 3 && !(typeof inPlanned === 'function' && inPlanned(i));
const brCx = (j, rail) => { const x = j % W.w, y = (j / W.w) | 0; return rail ? x + 0.42 : x + 0.5 + (hash2(x, y, 71) - 0.5) * 0.433; };
const brCy = (j, rail) => { const x = j % W.w, y = (j / W.w) | 0; return rail ? y + 0.42 : y + 0.5 + (hash2(x, y, 72) - 0.5) * 0.433; };
// The two ends of a crossing: the dry street or track tiles either side of it, furthest apart.
function brEnds(G, rail) {
  const w = W.w, D = [], has = rail ? (j => W.rail[j] > 0) : (j => W.road[j] >= 1), inG = new Set(G);
  for (const g of G) for (let k = 0; k < 8; k++) { const j = g + NB_D[k]; if (!inG.has(j) && has(j) && !brWet(j) && !D.includes(j)) D.push(j); }
  const far = L => { let a = L[0], b = L[L.length - 1], bd = -1; for (const p of L) for (const q of L) { const d = (p % w - q % w) ** 2 + (((p / w) | 0) - ((q / w) | 0)) ** 2; if (d > bd) { bd = d; a = p; b = q; } } return [a, b]; };
  let A, Bt;
  if (D.length >= 2) [A, Bt] = far(D);
  else if (D.length === 1) { A = D[0]; let bd = -1; for (const g of G) { const d = (g % w - A % w) ** 2 + (((g / w) | 0) - ((A / w) | 0)) ** 2; if (d > bd) { bd = d; Bt = g; } } }
  else [A, Bt] = far(G);
  let ax = brCx(A, rail), ay = brCy(A, rail), bx = brCx(Bt, rail), by = brCy(Bt, rail);
  if (D.length === 1 || Math.abs(ax - bx) > W.w / 2) { const L = Math.hypot(bx - ax, by - ay) || 1; bx += (bx - ax) / L * 0.6; by += (by - ay) / L * 0.6; }
  if (Math.hypot(bx - ax, by - ay) < 0.8) { bx = ax + 1; }
  return [ax, ay, bx, by];
}
const brBase = (lv, cn) => cn ? (cn >= 2 ? 22 : 9) : lv >= 4 ? 150 : lv >= 3 ? 45 : 12;
// One crossing found on the map: matched to the record it already has, or a new bridge.
function brFound(B, G, s, idx, live, silent) {
  let r = null;
  for (const i of G) { const o = idx.get(i); if (o && o.s === s) { if (!r) r = o; else if (o !== r && !live.has(o)) { o.dead = 1; } } }
  const rail = s === 'rl';
  let lv = 0, cn = 0, road = 0;
  for (const i of G) { lv = Math.max(lv, W.river[i]); cn = Math.max(cn, W.canal[i]); road = Math.max(road, rail ? 4 : W.road[i]); }
  const P = brEnds(G, rail), len = Math.hypot(P[2] - P[0], P[3] - P[1]);
  // a street that runs along the river for a way, or forks on the water, is drawn tile by tile; only its width across counts
  const seg = len > 4.2 || G.length > 4 ? 1 : 0;
  const b0 = brBase(lv, cn), sp = Math.round(b0 + Math.max(0, Math.min(len, 4) - 2) * b0 * 0.5);  // the water's width, a little more on a skew
  if (r) {
    live.add(r);
    if (r.t.length !== G.length || r.t.some((x, k) => x !== G[k])) { r.t = G; r.i = G[G.length >> 1]; r.P = P; r.seg = seg; r.sp = sp; B.v++; }
    if (r.br && !r.pt) { brRebuild(r, true); return; }  // the locals put a crossing back themselves
    const up = r.k === 'ford' && road >= 3;
    r.road = road; r.w = rail ? (W.rail[r.i] >= 2 ? 0.42 : 0.3) : road <= 2 ? 0.3 : road === 3 ? 0.4 : 0.46 + Math.min(W.lanes[r.i] || 0, 3) * 0.18;
    if (up) { const t = brTown(r), c = bridgeCtx(r, t), N = chooseBridge(c, 'ford'); if (N.id !== 'ford') setBridgeKind(r, N, c); }
    return;
  }
  r = { id: B.n++, s, t: G, i: G[G.length >> 1], P, seg, w: 0.4, k: '', y: 0, nm: '', pol: -1, bld: -1, sp, lv, sh: 0, cn, lk: 0, gz: 0, br: 0, by: 0, ry: 0, was: null, pt: 0, keep: 0, old: null, road };
  r.w = rail ? (W.rail[r.i] >= 2 ? 0.42 : 0.3) : road <= 2 ? 0.3 : road === 3 ? 0.4 : 0.46 + Math.min(W.lanes[r.i] || 0, 3) * 0.18;
  brOpen(B, r, silent);
  live.add(r);
}
// A new bridge opens: its kind is chosen, its builders pay, and a grand one gets a line in the chronicle.
function brOpen(B, r, silent) {
  const t = W.townById[W.owner[r.i]] || brNearTown(r.i, 30), c = bridgeCtx(r, t);
  r.sh = c.ships; r.lk = c.lake; r.gz = c.gorge ? 1 : 0; r.lv = c.lv; r.cn = c.canal;
  if (t) { r.bld = t.id; r.pol = t.polity ? t.polity.id : -1; }
  const T = chooseBridge(c);
  setBridgeKind(r, T, c);
  r.old = null;
  if (silent) r.y = 0;  // already standing when the records begin
  B.list.push(r);
  if (!silent) payBridge(t, T, r.sp, false);
  if (!silent && r.nm && t) brSay(`The ${r.nm} opens over ${brWater(r)}: ${/^[aeiou]/i.test(T.name) ? 'an' : 'a'} ${T.name.toLowerCase()}, ${r.sp} m long.`, t);
}
function bridgesScan(silent) {
  const B = bridgeReg(), n = W.w * W.h, w = W.w;
  if (!brStamp || brStamp.length !== n) { brStamp = new Uint32Array(n); brSid = 0; }
  if (brSid > 4e9) { brStamp.fill(0); brSid = 0; }
  bridgeIndex();  // for brRdIdx
  // matched by kind of crossing: a street and a railway (or a planned road) on the same wet tile are separate bridges
  const live = new Set(), stack = [], sx = { st: new Map(), rl: new Map() };
  for (const r of B.list) if (sx[r.s]) for (const i of r.t) if (!sx[r.s].has(i)) sx[r.s].set(i, r);
  for (const s of ['st', 'rl']) {
    const idx = sx[s];
    const id = ++brSid, ok = s === 'st' ? brStreet : (j => W.rail[j] > 0);
    for (let i = w; i < n - w; i++) {
      if (brStamp[i] === id || !brWet(i) || !ok(i)) continue;
      const G = []; brStamp[i] = id; stack.push(i);
      while (stack.length) { const j = stack.pop(); G.push(j); for (let k = 0; k < 8; k++) { const q = j + NB_D[k]; if (q >= w && q < n - w && brStamp[q] !== id && brWet(q) && ok(q)) { brStamp[q] = id; stack.push(q); } } }
      G.sort((a, b) => a - b);
      brFound(B, G, s, idx, live, silent);
    }
  }
  // the planned roads: one bridge for each stretch over water
  const N = W.roadNet;
  if (N) for (const R0 of N.roads) {
    if (!R0.done || !R0.br || !R0.br.length) continue;
    for (let q = 0; q * 2 < R0.br.length; q++) {
      let r = brRdIdx.get(R0.id * 256 + q);
      if (r) { live.add(r); continue; }
      const a = R0.br[q * 2], b = R0.br[q * 2 + 1], P = R0.pts, T0 = [];
      for (let k = a; k <= b; k++) { const j = Math.floor(P[k * 2 + 1]) * w + Math.floor(P[k * 2]); if ((W.water[j] || brWet(j)) && !T0.includes(j)) T0.push(j); }
      if (!T0.length) continue;
      let lv = 0, cn = 0, lk = 0; for (const j of T0) { lv = Math.max(lv, W.river[j]); cn = Math.max(cn, W.canal[j]); if (W.water[j]) lk = 1; }
      const len = (b - a) * 0.5, b0 = brBase(lv, cn), sp = Math.round(lk ? Math.max(80, len * BR_TILE_M * 1.2) : b0 + Math.max(0, Math.min(len, 4) - 1.5) * b0 * 0.5);
      r = { id: B.n++, s: 'rd', t: T0, i: T0[T0.length >> 1], r: R0.id, q, P: [P[a * 2], P[a * 2 + 1], P[b * 2], P[b * 2 + 1]], w: RT[R0.type].wid, k: '', y: 0, nm: '', pol: R0.pol, bld: -1, sp, lv, sh: 0, cn, lk, gz: 0, br: 0, by: 0, ry: 0, was: null, pt: 0, keep: 0, old: null, road: 4 };
      brOpen(B, r, silent);
      live.add(r);
    }
  }
  // crossings that are gone (the street abandoned, the road or line taken up) go too; broken ones wait to be rebuilt
  const before = B.list.length;
  B.list = B.list.filter(r => !r.dead && (live.has(r) || (r.br && r.s !== 'rd')));
  if (B.list.length !== before) B.v++;
}

// ---- broken and mended ----
const brMx = r => (r.P[0] + r.P[2]) / 2, brMy = r => (r.P[1] + r.P[3]) / 2;
// Breaks a bridge: the deck goes, so the crossing costs what fording it costs. how: 'burnt', 'blown', 'pulled down', 'fell', 'swept away'.
function blowBridge(r, how, by) {
  if (!r || r.br || r.s === 'rl' || r.k === 'ford') return false;  // nothing to break at a ford
  const yr = Math.floor(year());
  r.br = 1; r.by = yr; r.how = how || 'broken'; r.ry = yr + 2 + Math.floor(rnd() * 5); r.was = [];
  for (const i of r.t) { r.was.push(W.road[i]); if (!W.water[i] && W.road[i]) { W.road[i] = 0; updCost(i); dirty(i); } }
  bridgeReg().v++;
  return true;
}
// Mends it, as whatever its builders would put up now. locals: people forded it and wore a way back over on their own.
function brRebuild(r, locals) {
  if (!r.br) return;
  const t = brTown(r), c = bridgeCtx(r, t);
  if (r.was) r.t.forEach((i, k) => { const lv = r.was[k] || 0; if (!W.water[i] && lv > W.road[i]) { W.road[i] = lv; updCost(i); dirty(i); } });
  r.was = null;
  const old = r.k, T = locals ? chooseBridge({ ...c, rich: false }) : chooseBridge(c);
  setBridgeKind(r, T, c);
  if (r.nm && t && !locals) brSay(`The ${r.nm}, ${r.how === 'blown' ? 'blown up' : r.how || 'broken'} in ${r.by}, is rebuilt${T.id !== old ? ' as ' + (/^[aeiou]/i.test(T.name) ? 'an ' : 'a ') + T.name.toLowerCase() : ''}.`, t);
}
// An army's bridge of boats over a broken one: passable for now, until the bridge is put back properly.
function throwPontoon(r, pol) {
  if (!r.br || r.pt || r.s === 'rd') return false;
  r.pt = pol ? pol.id : 1;
  for (const i of r.t) if (!W.water[i] && W.road[i] < 2) { W.road[i] = 2; updCost(i); dirty(i); }
  bridgeReg().v++;
  return true;
}
// Called by armyUpdate (war.js) as a host moves. A host falling back burns the bridges behind it; a town an army is marching on
// breaks the bridges in front of it; and an army that knows boats throws its own bridge over a broken one in its way.
function bridgesArmy(a) {
  const B = W.bridges;
  if (!B || !B.list.length || ((W.tick / 20 + (a.id || 0)) | 0) % 3 || a.phase === 'sail' || a.phase === 'embark' || a.militia || !a.war) return;
  const L = B.list, pol = a.pol, kn = id => a.home && a.home.tech && TECH_IX[id] !== undefined && a.home.tech[TECH_IX[id]] === 1;
  const how = T => kn('gunpowder') || kn('dynamite') ? 'blown' : T.mat === 'timber' || T.mat === 'rope' || T.mat === 'boats' ? 'burnt' : 'pulled down';
  if (a.regroup && a.goal === 'relieve') {
    let foe = null, fd = 40 * 40;
    for (const o of W.armies) { if (o === a || o.phase === 'sail' || !o.pol || !atWar(pol, o.pol)) continue; const d = (o.x - a.x) ** 2 + (o.y - a.y) ** 2; if (d < fd) { fd = d; foe = o; } }
    if (foe) for (const r of L) {
      if (r.br || r.s === 'rl') continue;
      const dx = brMx(r) - a.x, dy = brMy(r) - a.y;
      if (dx * dx + dy * dy > 144 || dx * (foe.x - a.x) + dy * (foe.y - a.y) <= 0 || rnd() > 0.5) continue;
      const T = BRIDGE[BR_IX[r.k]], h = how(T);
      if (blowBridge(r, h, pol) && (r.nm || menOf(a) >= 200)) brSay(`The ${a.name} falls back over ${brWater(r)} and the ${r.nm || T.name.toLowerCase()} is ${h === 'blown' ? 'blown up' : h} behind it.`, brTown(r) || a.home);
      break;
    }
  }
  const tg = a.target;
  if (a.phase === 'march' && tg && tg.alive && tg.polity && tg.polity !== pol && atWar(pol, tg.polity)) {
    const ex = tg.x - a.x, ey = tg.y - a.y, L2 = ex * ex + ey * ey;
    if (L2 < 1600 && L2 > 9) for (const r of L) {
      if (r.br || r.s === 'rl' || brPol(r) !== tg.polity) continue;
      const px = brMx(r) - a.x, py = brMy(r) - a.y, f = (px * ex + py * ey) / L2;
      if (f < 0.05 || f > 0.92 || Math.abs(px * ey - py * ex) / Math.sqrt(L2) > 3) continue;
      if (rnd() > (r.keep || r.nm ? 0.15 : 0.35)) continue;
      const T = BRIDGE[BR_IX[r.k]], kt = TECH_IX.gunpowder !== undefined && tg.tech[TECH_IX.gunpowder] === 1, h = kt ? 'blown' : T.mat === 'timber' || T.mat === 'rope' || T.mat === 'boats' ? 'burnt' : 'pulled down';
      if (blowBridge(r, h, tg.polity) && (r.nm || menOf(a) >= 200)) brSay(`With the ${a.name} on the march, ${tg.name} ${h === 'blown' ? 'blows up' : h === 'burnt' ? 'burns' : 'pulls down'} the ${r.nm || T.name.toLowerCase()} over ${brWater(r)}.`, tg);
      break;
    }
  }
  if (a.phase === 'march' && kn('bridges') && (kn('barges') || kn('ships'))) for (const r of L) {
    if (!r.br || r.pt || r.s === 'rd' || (brMx(r) - a.x) ** 2 + (brMy(r) - a.y) ** 2 > 36) continue;
    if (throwPontoon(r, pol) && menOf(a) >= 150) brSay(`The ${a.name} throws a bridge of boats across ${brWater(r)} where the ${r.nm || 'old bridge'} stood.`, brTown(r) || a.home);
    break;
  }
}

// ---- yearly: find new crossings, keep them up, mend the broken, now and then put up something better ----
const brUpP = t => t.cash > tn(t) * 0.6 ? 0.08 : 0.04;  // a rich town rebuilds sooner
const BR_OLD_STONE = { arch: 1, multiarch: 1, aqueduct: 1, inhabited: 1, covered: 1, clapper: 1, corbel: 1, castiron: 1, viaduct: 1 };
function bridgesYear() {
  const B = bridgeReg(), first = !B.init;
  bridgesScan(first);
  B.init = 1;
  const yr = Math.floor(year());
  for (const r of B.list) {
    const T = BRIDGE[BR_IX[r.k]];
    if (!T) { r.k = 'log'; continue; }
    const t = brTown(r);
    if (r.br) {
      // put back once the war has moved on, by whoever holds the bank now
      if (t && r.how === 'fell' && r.ry > yr + 5) r.ry = yr + 2 + Math.floor(rnd() * 4);  // someone holds its banks again
      if (!t || yr < r.ry) continue;
      if (W.armies.some(o => o.pol && t.polity && o.pol !== t.polity && atWar(o.pol, t.polity) && (o.x - brMx(r)) ** 2 + (o.y - brMy(r)) ** 2 < 625)) { r.ry = yr + 1; continue; }
      if (payBridge(t, T, r.sp, yr - r.by < 6)) brRebuild(r, false); else r.ry = yr + 2;  // after a few years they find the means somehow
      continue;
    }
    if ((r.id + yr) % 5) continue;  // the rest a fifth of the bridges a year, so the work is spread out
    if (!t) {
      // nobody keeps it up: timber rots, ropes fray, boats sink, and in time even iron rusts through
      const p = T.mat === 'timber' || T.mat === 'rope' || T.mat === 'boats' ? 0.12 : T.mat === 'stone' || T.mat === 'brick' ? 0.005 : 0.03;
      if (r.s !== 'rl' && T.id !== 'ford' && rnd() < p) { blowBridge(r, 'fell'); r.ry = yr + 999; }
      continue;
    }
    if (t.polity && t.polity.cur && t.polity.cur.kind >= 2) t.cash -= Math.min(Math.max(0, t.cash), T.upk * r.sp * 0.01 * 5 * Math.max(1, t.wage || 1) * 0.1);
    // an old famous one is often kept, whatever comes after
    const age = yr - r.y;
    if (!r.kc && r.y && age >= 150 && (r.nm || BR_OLD_STONE[T.id]) && BR_OLD_STONE[T.id]) { r.kc = 1; if (rnd() < 0.7) { r.keep = 1; if (r.nm) brSay(`The ${r.nm} has stood ${age} years over ${brWater(r)}, and ${t.name} means to keep it.`, t); } }
    if (r.keep || rnd() > (T.id === 'ford' || T.id === 'log' || T.id === 'pontoon' ? 0.25 : brUpP(t))) continue;
    const c = bridgeCtx(r, t), N = chooseBridge(c);
    if (N.id === T.id || N.era < T.era + (T.era <= 1 ? 1 : 2)) continue;
    if (!payBridge(t, N, r.sp, true)) continue;
    const was = T.name.toLowerCase(), nm0 = r.nm;
    setBridgeKind(r, N, c);
    if (r.nm) brSay(`${nm0 ? 'The ' + nm0 : 'The old ' + was + ' at ' + t.name} is pulled down and ${/^[aeiou]/i.test(N.name) ? 'an' : 'a'} ${N.name.toLowerCase()} put up in its place${nm0 ? '' : ': the ' + r.nm}.`, t);
  }
}
// What the tile panel can show on a click: name, kind, the year it went up, and a sentence or two about it.
function bridgeInfo(i) {
  const r = bridgeAt(i);
  if (!r) return null;
  const T = BRIDGE[BR_IX[r.k]] || BRIDGE[BR_IX.log], t = brTown(r);
  const what = `${/^[aeiou]/i.test(T.name) ? 'An' : 'A'} ${T.name.toLowerCase()} carrying ${r.s === 'rl' ? 'the railway' : r.road <= 2 ? 'a track' : 'the road'} over ${brWater(r)}, ${r.sp} m long.`;
  const state = r.br ? (r.pt ? ` Broken in ${r.by}; an army's bridge of boats crosses the gap.` : ` ${r.how === 'fell' ? 'Fallen in' : r.how === 'blown' ? 'Blown up in' : r.how === 'burnt' ? 'Burnt in' : 'Broken in'} ${r.by}.`) : r.keep ? ' Kept for its age and beauty.' : '';
  const hist = r.old && r.old.length ? ` Before it: ${r.old.map(s => { const [k, y] = s.split(':'); const O = BRIDGE[BR_IX[k]]; return (O ? O.name.toLowerCase() : k) + (+y ? ' (' + y + ')' : ''); }).join(', ')}.` : '';
  return {
    name: r.nm || (t ? `${T.name} at ${t.name}` : T.name), kind: T.name, type: T.id, built: r.y || null, span: r.sp, material: T.mat, carries: T.cap, kmh: T.kmh,
    broken: !!r.br, kept: !!r.keep, ships: !!r.sh, about: `${what} ${T.about}${state}${hist}`,
  };
}
// How many of each kind there are, for balance checks.
function bridgeCounts() { const c = {}; for (const r of bridgeReg().list) c[r.k + (r.br ? '(broken)' : '')] = (c[r.k + (r.br ? '(broken)' : '')] || 0) + 1; return c; }
