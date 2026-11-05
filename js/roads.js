'use strict';
// Roads by design. Trails, tracks and streets still wear in under feet and wheels (people.js), but once a realm has cars its
// state plans real roads: links between towns, ring roads, arterials, motorways between the big cities. They follow smooth
// alignments that ignore the tile grid, the land under them is bought (and whatever stands on it pulled down), and they take
// years to build. Each road type has a speed limit and rules about who may use it. Cars and lorries keep to the roads.

// id | name | speed limit km/h | width in tiles | who may use it | invention | surface | edge | look | lanes | what it is for
// who: f on foot, h riders and pack animals, c carts and carriages, b bicycles, u buses and trams, m cars, l lorries
const RT_SRC = `
footpath|Footpath|5|0.12|f|fire|#b8a27a||none|1|A trodden way for walkers. Nothing on wheels.
bridleway|Bridleway|12|0.18|fh|riding|#a89a6a||grass|1|Riders and pack trains; too narrow and soft for carts.
carttrack|Cart track|15|0.28|fhcb|wheel|#a88a5e||ruts|1|Two ruts and a grass hump, for carts and later tractors.
farmlane|Farm lane|30|0.32|fhcbml|cars|#8f8a7c|#6f6a5c|grass|1|A narrow metalled lane out to the farms.
villagestreet|Village street|30|0.4|fhcbuml|paved|#9c968a|#7a746a|none|2|The one street through a village.
cobbled|Cobbled street|20|0.42|fhcbuml|paved|#8d8a84|#5f5c58|cobble|2|Setts underfoot and iron wheels rattling over them.
pavedhighway|Paved highway|20|0.46|fhcbuml|builtroads|#a39f92|#77736a|slab|2|Stone slabs on a raised bed, straight from town to town, built for armies and the post.
turnpike|Turnpike|25|0.46|fhcbuml|turnpikes|#a8987a|#7d6f58|gravel|2|A graded gravel road kept up by the tolls at its gates.
residential|Residential street|30|0.42|fhcbuml|cars|#5d5f63|#9a978f|none|2|Houses on both sides, cars parked along the kerb.
culdesac|Cul-de-sac|20|0.4|fbm|suburbs|#5d5f63|#a5a29a|none|2|A dead end with a turning circle: nobody drives through.
highstreet|High street|20|0.52|fbum|cars|#55575b|#c9c2b2|zebra|2|Shops on both sides, buses, crossings, and everyone in town on a Saturday.
pedestrian|Pedestrian street|5|0.48|f|suburbs|#b9ad98|#8d826e|paving|1|Paved over for walkers; deliveries before ten only.
cyclepath|Cycle path|25|0.16|fb|bicycle|#9a5a48||cycle|1|A red strip for bicycles.
collector|Collector road|50|0.55|fhcbuml|cars|#4f5155|#8f8c85|centre|2|Gathers a district's streets and takes them to the main roads.
arterial|Arterial road|60|0.75|fbuml|cars|#47494d|#8f8c85|double|4|Four lanes from the centre out to the edge of the city.
avenue|Avenue|50|0.95|fbuml|cars|#4a4c50|#9a978f|trees|4|A grand boulevard with a planted median.
ringroad|Ring road|80|0.95|uml|highways|#424448|#8a877f|median|4|Takes through traffic round the city instead of across it.
rural|Rural road|90|0.5|fhcbuml|cars|#505256|#8a877f|dash|2|Two lanes across open country with a dashed white line.
mountain|Mountain pass road|50|0.45|fcbuml|cars|#505256|#d0ccc0|rail|2|Hairpins, crash barriers and a long drop.
causeway|Causeway|60|0.55|fcbuml|bridges|#56585c|#a8a498|dash|2|Carried over the water on an embankment and piers.
dual|Dual carriageway|110|1.05|uml|highways|#46484c|#7f7c74|grassmed|4|Two roads side by side with grass between them.
motorway|Motorway|120|1.35|uml|highways|#3e4044|#7a776f|barrier|6|Six lanes and hard shoulders; slip roads, no walkers, bicycles or carts.
sliproad|Slip road|70|0.42|uml|highways|#44464a|#7a776f|edge|1|Feeds traffic on and off the motorway.
tollway|Toll motorway|130|1.25|uml|highways|#3c3e42|#7a776f|barrier|4|A private motorway: faster and emptier, at a price at the booths.
busway|Busway|60|0.5|u|motorbus|#8a3a32|#7a776f|bus|2|Buses only: red tarmac and no queues.
service|Service road|30|0.35|fhcbuml|cars|#5a5c60|#8a877f|none|1|Round the back of the shops and the warehouses.
industrial|Industrial road|50|0.62|uml|lorries|#6a6a66|#8a877f|concrete|2|Concrete slabs for heavy lorries between the works and the docks.
smartway|Smart highway|160|1.35|m|autopilot|#2f3238|#5fd0e0|smart|6|Driverless traffic in close convoy, lit lanes, no human drivers.
`;
const RT = [null], RT_IX = {};
for (const line of RT_SRC.trim().split('\n')) {
  const [id, name, kmh, wid, who, tech, surf, edge, look, lanes, about] = line.split('|');
  const T = { id, name, kmh: +kmh, wid: +wid, who, tech, surf, edge: edge || '', look, lanes: +lanes, about, ix: RT.length };
  RT_IX[id] = T.ix; RT.push(T);
}
// What each way of travelling counts as on a road (travel classes as in core.js: 0 foot, 1 pack animal, 2 wagon, 3 carriage or bicycle,
// 4 tram or bus, 5 car, 6 electric car, 7 self-driving pod), and its top speed.
const RT_CLASS_WHO = ['f', 'h', 'c', 'c', 'u', 'm', 'm', 'm'], RT_CLASS_TOP = [5, 6, 8, 16, 50, 110, 120, 160];
// A step's cost falls with speed the way the game's own road table does: walking pace costs 4, a town car about 1.3, a pod 0.8.
const speedCost = kmh => 4 * Math.pow(5 / kmh, 0.45);
// RT_COST[class][type]: the step cost on that road, or -1 when that traveller isn't allowed on it.
const RT_COST = [];
for (let cl = 0; cl < 8; cl++) {
  const row = [0];
  for (let k = 1; k < RT.length; k++) {
    const T = RT[k];
    let who = RT_CLASS_WHO[cl];
    if (cl === 3 && !T.who.includes('c') && T.who.includes('b')) who = 'b';  // a bicycle may use a cycle path where a carriage may not
    row.push(T.who.includes(who) ? speedCost(Math.min(T.kmh, RT_CLASS_TOP[cl])) : -1);
  }
  RT_COST.push(row);
}
// On foot, a road you may walk is easy going; a motorway you may not is all but impassable.
const RT_FOOT = RT.map(T => T ? (T.who.includes('f') ? (T.look === 'cobble' ? 5 : 4) : 40) : 0);
// The step cost for a traveller of class `cl` on a road tile of type rt. landC is what the tile costs on foot.
// A vehicle that isn't allowed there is parked, and its driver walks.
function rtCost(cl, rt, landC) {
  const q = RT_COST[cl & 7][rt];
  if (q >= 0) return q;
  return RT_FOOT[rt] < 40 ? Math.max(RT_FOOT[rt], 4) : 40;
}
const rtAllows = (rt, who) => !rt || RT[rt].who.includes(who);

// ---- what an organic road (worn in, not planned) counts as ----
// Classified by its level, where it is and what the town knows. Used for the tile panel and for retyping streets once there are cars.
function organicType(i) {
  const lv = W.road[i];
  if (!lv) return 0;
  const t = W.townById[W.owner[i]];
  const d = t ? Math.hypot(i % W.w - t.x, ((i / W.w) | 0) - t.y) : 99, inTown = t && d <= urbanR(t), n = t ? tn(t) : 0;
  if (lv === 1) return t && knows(t, 'riding') && !inTown ? RT_IX.bridleway : RT_IX.footpath;
  if (lv === 2) return t && t.mod.car && !inTown ? RT_IX.farmlane : RT_IX.carttrack;
  if (lv === 3) {
    if (inTown) return n < 200 ? RT_IX.villagestreet : RT_IX.cobbled;
    return t && knows(t, 'turnpikes') ? RT_IX.turnpike : t && knows(t, 'builtroads') ? RT_IX.pavedhighway : RT_IX.carttrack;
  }
  if (!inTown) return RT_IX.rural;
  if (n < 250) return RT_IX.villagestreet;
  if (d <= 2.5 && n >= 400) return n >= 2500 && knows(t, 'suburbs') && (i * 7) % 5 === 0 ? RT_IX.pedestrian : RT_IX.highstreet;
  if (knows(t, 'suburbs') && d > urbanR(t) * 0.7 && (W.lanes[i] || 0) === 0) {
    let nb = 0; for (let k = 0; k < 4; k++) if (W.road[i + NB_D[k]]) nb++;
    if (nb === 1) return RT_IX.culdesac;
  }
  return RT_IX.residential;
}
// The built-up part of a town (its territory, t.radius, reaches much further).
const urbanR = t => 2 + Math.sqrt(t.blds.length + tn(t) * 0.1 + 12) * 0.85;
function roadTypeAt(i) { return (W.rtype && W.rtype[i]) || organicType(i); }

// ---- the planned network ----
// W.roadNet: { roads: [{ id, type, name, pts: [x, y, ...] in tiles, foot: [tiles], br: [from, to, ...] point ranges on bridges,
//   done, prog, need, pol, a, b, kind, y }], nodes: [{ x, y, r }] roundabouts, links: { 'a.b': 1 }, v, n, bought, spent }
function roadNet() {
  if (!W.roadNet) W.roadNet = { roads: [], nodes: [], links: {}, v: 0, n: 0, bought: 0, spent: 0, num: {} };
  if (!W.rtype || W.rtype.length !== W.w * W.h) W.rtype = new Uint8Array(W.w * W.h);
  return W.roadNet;
}
// For every tile in a finished road's footprint: which road and which point along it (for drawing traffic on the curve).
let roadOfT = null, roadSegT = null, roadOfV = -1, roadOfW = null;
function roadIndex() {
  const N = roadNet();
  if (roadOfT && roadOfV === N.v && roadOfW === W) return;
  const n = W.w * W.h;
  if (!roadOfT || roadOfT.length !== n) { roadOfT = new Int32Array(n); roadSegT = new Int32Array(n); }
  roadOfT.fill(0);
  for (let r = 0; r < N.roads.length; r++) {
    const R0 = N.roads[r];
    if (!R0.done) continue;
    const P = R0.pts, w = W.w;
    let last = 0;
    for (const j of R0.foot) {
      const x = j % w + 0.5, y = ((j / w) | 0) + 0.5;
      // the footprint runs along the line, so look near the last match first
      let bk = 0, bd = 1e9;
      const m = P.length >> 1;
      for (let k = Math.max(0, last - 16); k < Math.min(m, last + 16); k++) { const d = (P[k * 2] - x) ** 2 + (P[k * 2 + 1] - y) ** 2; if (d < bd) { bd = d; bk = k; } }
      if (bd > 2) for (let k = 0; k < m; k++) { const d = (P[k * 2] - x) ** 2 + (P[k * 2 + 1] - y) ** 2; if (d < bd) { bd = d; bk = k; } }
      last = bk;
      // a wider road wins the tile where two meet
      const cur = roadOfT[j];
      if (cur && RT[N.roads[cur - 1].type].wid >= RT[R0.type].wid) continue;
      roadOfT[j] = r + 1; roadSegT[j] = bk;
    }
  }
  roadOfV = N.v; roadOfW = W;
}

// ---- planning an alignment ----
// A search of its own (the path searches in core.js share their arrays with everyone else's walking).
let rgs = null, rcf = null, rst = null, rsid = 2, rhI = null, rhF = null, rhN = 0;
function rPush(i, f) { let k = rhN++; while (k > 0) { const p = (k - 1) >> 1; if (rhF[p] <= f) break; rhI[k] = rhI[p]; rhF[k] = rhF[p]; k = p; } rhI[k] = i; rhF[k] = f; }
function rPop() {
  const top = rhI[0], i = rhI[--rhN], f = rhF[rhN];
  let k = 0;
  for (;;) { let c = k * 2 + 1; if (c >= rhN) break; if (c + 1 < rhN && rhF[c + 1] < rhF[c]) c++; if (rhF[c] >= f) break; rhI[k] = rhI[c]; rhF[k] = rhF[c]; k = c; }
  rhI[k] = i; rhF[k] = f;
  return top;
}
// Nothing a road may go through: wonders, palaces, ports, airports, anything big or old and loved, deep sea, another realm's land.
const ROAD_KEEP = t => { const D = BLD[t]; return !D || D.portB || D.size >= 3 || (typeof HERITAGE !== 'undefined' && HERITAGE[t]) || t === 'airport' || t === 'airfield' || t === 'station' || t === 'grandstation' || t === 'hsrstation' || t === 'hearth'; };
// How a road of this kind weighs the ground: a motorway hates climbing and towns, a lane goes through anything.
const ROAD_PROFILE = {
  motor: { bld: 60, field: 4, slope: 2.6, water: 18, share: 0.45, organic: 0.9, landV: 40 },
  rural: { bld: 30, field: 2.5, slope: 1.2, water: 15, share: 0.4, organic: 0.6, landV: 20 },
  urban: { bld: 14, field: 1.5, slope: 0.8, water: 14, share: 0.35, organic: 0.45, landV: 10 },
};
function roadTilePass(j, pol) {
  const wa = W.water[j];
  if (wa === 2) return false;  // the open sea: no road goes there
  if (W.occ[j] === 1) { const b = W.bAt.get(j); if (b && b.type !== 'house' && ROAD_KEEP(b.type)) return false; }
  const own = W.townById[W.owner[j]];
  if (own && own.polity !== pol && !areAllies(pol, own.polity) && relOf(pol, own.polity) <= 20) return false;  // a friendly neighbour agrees to the road
  return true;
}
// Only the sea and an unfriendly border stop a footprint; a protected building it brushes is simply left standing beside the road.
function roadTileHard(j, pol) {
  if (W.water[j] === 2) return true;
  const own = W.townById[W.owner[j]];
  return !!(own && own.polity !== pol && !areAllies(pol, own.polity) && relOf(pol, own.polity) <= 20);
}
const keptBld = j => { if (W.occ[j] !== 1) return false; const b = W.bAt.get(j); return !!(b && b.type !== 'house' && ROAD_KEEP(b.type)); };
// Where a road leaves a town: the nearest street a few tiles out from the centre, on the side facing where it is going.
function townGate(t, tx2, ty2, pol) {
  const w = W.w, a = Math.atan2(ty2 - t.y, tx2 - t.x);
  let best = -1, bs = 1e9;
  for (let r = 2; r <= 6; r++) for (let da = -0.8; da <= 0.8; da += 0.2) {
    const x = Math.round(t.x + Math.cos(a + da) * r), y = Math.round(t.y + Math.sin(a + da) * r);
    if (x < 2 || y < 2 || x >= w - 2 || y >= W.h - 2) continue;
    const j = y * w + x;
    if (W.water[j] || !roadTilePass(j, pol) || W.occ[j] === 1) continue;
    const sc = r + Math.abs(da) * 2 - (W.road[j] >= 2 ? 3 : 0);
    if (sc < bs) { bs = sc; best = j; }
  }
  return best >= 0 ? best : t.i;
}
function roadStepCost(j, cur, P, pol) {
  if (!roadTilePass(j, pol)) return -1;
  let c = 1;
  const wa = W.water[j];
  if (wa || W.river[j] >= 2 || W.canal[j]) c += P.water;
  else c += climbOf(W.elev[j] - W.elev[cur]) * P.slope * 0.08 + slopeAt(j) * P.slope * 6;
  const oc = W.occ[j];
  if (oc === 1) c += P.bld + (W.land ? W.land[j] * P.landV * 0.05 : 0);
  else if (oc === 2) c += P.field;
  else if (oc === 3) c += W.road[j] ? 2 : 300;  // a wall: only through a gate
  if (W.rtype[j] && W.road[j] >= 4) c *= P.share;
  else if (W.road[j] >= 3) c *= P.organic;
  if (W.rail[j]) c += 2;
  if (W.tree[j]) c += 0.4;
  return c;
}
function planAlignment(a, b, P, pol, maxN) {
  const n = W.w * W.h, w = W.w;
  if (!rgs || rgs.length !== n) { rgs = new Float32Array(n); rcf = new Int32Array(n); rst = new Int32Array(n); rhI = new Int32Array(n * 2 + 16); rhF = new Float32Array(n * 2 + 16); rsid = 2; }
  const open = rsid, closed = rsid + 1; rsid += 2;
  if (rsid > 2000000000) { rst.fill(0); rsid = 2; }
  rhN = 0; rgs[a] = 0; rst[a] = open; rcf[a] = -1; rPush(a, 0);
  const bx = b % w, by = (b / w) | 0;
  let found = false, k = 0;
  while (rhN > 0) {
    const cur = rPop();
    if (rst[cur] === closed) continue;
    rst[cur] = closed;
    if (cur === b) { found = true; break; }
    if (++k > maxN) break;
    const g0 = rgs[cur], cx = cur % w;
    for (let q = 0; q < 8; q++) {
      const nx = cx + NB_X[q];
      if (nx < 1 || nx >= w - 1) continue;
      const ni = cur + NB_D[q];
      if (ni < w || ni >= n - w || rst[ni] === closed) continue;
      let c = ni === b ? 1 : roadStepCost(ni, cur, P, pol);
      if (c < 0) continue;
      if (q > 3) c *= 1.414;
      const g = g0 + c;
      if (rst[ni] === open && rgs[ni] <= g) continue;
      rgs[ni] = g; rst[ni] = open; rcf[ni] = cur;
      const dx = Math.abs(nx - bx), dy = Math.abs(((ni / w) | 0) - by);
      rPush(ni, g + (dx + dy - 0.586 * Math.min(dx, dy)) * 1.02);
    }
  }
  if (!found) return null;
  const out = [];
  for (let c = b; c !== -1; c = rcf[c]) out.push(c);
  return out.reverse();
}
// Tiles to a smooth curve: straighten (Douglas-Peucker), then round the corners (Chaikin).
function smoothLine(tiles, tol, rounds, closed) {
  const w = W.w;
  let P = [];
  for (const j of tiles) P.push([j % w + 0.5, ((j / w) | 0) + 0.5]);
  if (!closed && P.length > 2) {
    const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
    const dp = (s, e) => {
      let bi = -1, bd = tol;
      const [ax, ay] = P[s], [ex, ey] = P[e], L = Math.hypot(ex - ax, ey - ay) || 1;
      for (let k = s + 1; k < e; k++) { const d = Math.abs((ex - ax) * (ay - P[k][1]) - (ax - P[k][0]) * (ey - ay)) / L; if (d > bd) { bd = d; bi = k; } }
      if (bi >= 0) { keep[bi] = 1; dp(s, bi); dp(bi, e); }
    };
    dp(0, P.length - 1);
    P = P.filter((_, k) => keep[k]);
  }
  for (let r = 0; r < rounds; r++) {
    const Q = closed ? [] : [P[0]];
    const m = P.length, last = closed ? m : m - 1;
    for (let k = 0; k < last; k++) {
      const p = P[k], q = P[(k + 1) % m];
      Q.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
    }
    if (!closed) Q.push(P[m - 1]);
    P = Q;
  }
  // evenly spaced points, half a tile apart
  const out = [];
  for (let k = 0; k < P.length - (closed ? 0 : 1); k++) {
    const p = P[k], q = P[(k + 1) % P.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]), s = Math.max(1, Math.ceil(L / 0.5));
    for (let e = 0; e < s; e++) out.push(p[0] + (q[0] - p[0]) * e / s, p[1] + (q[1] - p[1]) * e / s);
  }
  if (!closed) out.push(P[P.length - 1][0], P[P.length - 1][1]);
  else out.push(out[0], out[1]);
  return out;
}
// Every tile the finished road covers, verges included.
function footprint(pts, wid) { return footprint0(pts, wid).filter(j => !keptBld(j)); }
function footprint0(pts, wid) {
  const w = W.w, set = new Set(), r = wid / 2 + 0.3;
  for (let k = 0; k < pts.length; k += 2) {
    const x = pts[k], y = pts[k + 1];
    for (let yy = Math.floor(y - r); yy <= Math.floor(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.floor(x + r); xx++) {
      if (xx < 1 || yy < 1 || xx >= w - 1 || yy >= W.h - 1) continue;
      if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r + 0.15) set.add(yy * w + xx);
    }
  }
  return [...set];
}
const footBlocked = (foot, pol) => foot.some(j => roadTileHard(j, pol));

// ---- building it: the land is bought, the road takes years, then it opens ----
const ROAD_WORK = { motorway: 22, tollway: 22, smartway: 22, dual: 30, ringroad: 26, arterial: 34, avenue: 30, busway: 40, rural: 50, mountain: 25, causeway: 18, collector: 50, villagestreet: 60, industrial: 40, sliproad: 50 };
// Splits a planned line into pieces by what it runs through: town streets inside towns, bridges or causeways over water, pass roads up mountains.
function pieceTypes(pts, type) {
  const w = W.w, out = [];
  const big = type === 'motorway' || type === 'tollway' || type === 'dual' || type === 'smartway';
  for (let k = 0; k < pts.length; k += 2) {
    const j = Math.floor(pts[k + 1]) * w + Math.floor(pts[k]);
    const t = W.townById[W.owner[j]];
    let ty = type;
    const inTown = t && tn(t) >= 80 && Math.hypot(pts[k] - t.x - 0.5, pts[k + 1] - t.y - 0.5) <= urbanR(t) * 0.85;
    if (inTown && (big || type === 'rural')) ty = big ? (tn(t) >= 600 ? 'arterial' : 'collector') : (tn(t) >= 500 ? 'collector' : 'villagestreet');
    else if (type === 'rural' && W.water[j]) ty = 'causeway';
    else if (type === 'rural' && slopeAt(j) > 0.07) ty = 'mountain';
    out.push(ty);
  }
  // no piece shorter than a few points: a pass road one tile long is just a bend
  for (let k = 1; k < out.length - 1; k++) if (out[k] !== out[k - 1] && out[k] !== out[k + 1]) out[k] = out[k - 1];
  const runs = [];
  let s = 0;
  for (let k = 1; k <= out.length; k++) if (k === out.length || out[k] !== out[s]) { runs.push([s, k, out[s]]); s = k; }
  for (let r = runs.length - 2; r >= 0; r--) if (runs[r][1] - runs[r][0] < 4 && runs.length > 1) { const nx = runs[r + 1]; nx[0] = runs[r][0]; runs.splice(r, 1); }
  return runs;
}
// Pays for the land under a planned road: every building in the way is bought and pulled down, fields are bought out.
// Returns the money it cost, or -1 if the realm can't afford it (then nothing is touched).
function buyLand(foot, pol, dry) {
  let cost = 0, n = 0;
  const seen = new Set();
  for (const j of foot) {
    if (W.occ[j] === 1) {
      const b = W.bAt.get(j);
      if (!b || seen.has(b)) continue;
      seen.add(b);
      const t = b.town || W.townById[W.owner[j]];
      const lvl = t ? (t.polity.cur.level || 1) : 1;
      const work = b.type === 'house' ? HOUSES[b.tier].work : (BLD[b.type] && BLD[b.type].work) || 50;
      cost += (t && W.land ? plotPrice(t, b.i, b.size) : 4 * lvl) + work * 0.3 * lvl;
      n++;
    } else if (W.occ[j] === 2) cost += (W.land ? W.land[j] * 3 : 2);
  }
  if (dry) return { cost, n };
  for (const b of seen) {
    if (!W.blds.includes(b)) continue;
    const t = b.town, lvl = t ? (t.polity.cur.level || 1) : 1;
    const work = b.type === 'house' ? HOUSES[b.tier].work : (BLD[b.type] && BLD[b.type].work) || 50;
    const price = (t && W.land ? plotPrice(t, b.i, b.size) : 4 * lvl) + work * 0.3 * lvl;
    // the owners are paid: the people who lived there, or the town for anything else
    if (t && t.alive) { const owners = t.members.filter(p => p.home === b); if (owners.length) for (const p of owners) p.cash += price / owners.length; else t.cash += price * 0.5; }
    removeBuilding(b);
  }
  for (const j of foot) {
    if (W.occ[j] === 2) dropField(j);
    if (W.occ[j] === 3) continue;
    W.tree[j] = 0; W.plant[j] = 0; W.forage[j] = 0;
    if (!W.water[j] && W.road[j] < 2) W.road[j] = 2;  // earthworks: the ground is cleared and graded
    W.wear[j] = Math.max(W.wear[j], 3000);
    updCost(j); dirty(j);
  }
  return { cost, n };
}
// Who pays: the realm's towns, richest first, in proportion.
function realmPay(pol, amt) {
  const T = W.towns.filter(t => t.alive && t.polity === pol && t.cash > 0);
  const total = T.reduce((s, t) => s + t.cash, 0);
  if (total < amt * 1.6) return false;
  for (const t of T) t.cash -= amt * t.cash / total;
  return true;
}
const realmCash = pol => W.towns.reduce((s, t) => s + (t.alive && t.polity === pol && t.cash > 0 ? t.cash : 0), 0);
// A whole project: the line, the land, the pieces. kind: link, ring, spoke, works.
function startRoad(pol, tiles, type, opt) {
  const N = roadNet(), T0 = RT[RT_IX[type]];
  let pts = smoothLine(tiles, opt.closed ? 0 : type === 'rural' ? 0.55 : 0.8, opt.closed ? 3 : type === 'rural' ? 2 : 3, opt.closed);
  let foot = footprint(pts, T0.wid);
  if (footBlocked(foot, pol)) { pts = smoothLine(tiles, 0.3, 1, opt.closed); foot = footprint(pts, T0.wid); }
  if (footBlocked(foot, pol)) return false;
  const cap = pol.capital && pol.capital.alive ? pol.capital : null;
  if (!cap) return false;
  // what it costs: the land, and building it (a motorway mile costs many times a lane's)
  const est = buyLand(foot, pol, true);
  const lvl = pol.cur.level || 1, build = foot.length * (8 + T0.wid * 30) * lvl * (cap.wage || 1) * 0.5;
  const money = pol.cur.kind >= 2;
  if (money && !realmPay(pol, est.cost + build)) return false;
  if (!money && cap.stock[R.STONE] < foot.length * 0.5) return false;
  if (!money) cap.stock[R.STONE] -= foot.length * 0.5;
  if (cap.stock[R.STEEL] > foot.length) cap.stock[R.STEEL] -= foot.length * 0.1 * T0.wid;
  const got = buyLand(foot, pol, false);
  N.bought += got.n; N.spent += est.cost;
  const runs = opt.closed ? [[0, pts.length >> 1, type]] : pieceTypes(pts, type);
  const id0 = ++N.n, name = opt.name || roadName(pol, type, opt);
  for (const [s, e, ty] of runs) {
    const sub = pts.slice(s * 2, Math.min(pts.length, e * 2 + 2));
    if (sub.length < 4) continue;
    const Tp = RT[RT_IX[ty]], f = footprint(sub, Tp.wid);
    const br = [];
    let inB = -1;
    for (let k = 0; k < sub.length; k += 2) {
      const j = Math.floor(sub[k + 1]) * W.w + Math.floor(sub[k]);
      const wet = W.water[j] || W.river[j] >= 2 || W.canal[j];
      if (wet && inB < 0) inB = k >> 1; else if (!wet && inB >= 0) { br.push(Math.max(0, inB - 1), k >> 1); inB = -1; }
    }
    if (inB >= 0) br.push(Math.max(0, inB - 1), (sub.length >> 1) - 1);
    const len = sub.length / 4;
    N.roads.push({ id: N.roads.length ? N.roads[N.roads.length - 1].id + 1 : 1, proj: id0, type: Tp.ix, name, pts: sub, foot: f, br, done: false, prog: 0, need: Math.max(1, len / (ROAD_WORK[ty] || 40)), pol: pol.id, a: opt.a ? opt.a.id : -1, b: opt.b ? opt.b.id : -1, kind: opt.kind, y: Math.floor(year()), bx0: 0, by0: 0, bx1: 0, by1: 0 });
    const R0 = N.roads[N.roads.length - 1];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let k = 0; k < sub.length; k += 2) { x0 = Math.min(x0, sub[k]); x1 = Math.max(x1, sub[k]); y0 = Math.min(y0, sub[k + 1]); y1 = Math.max(y1, sub[k + 1]); }
    R0.bx0 = x0 - 2; R0.by0 = y0 - 2; R0.bx1 = x1 + 2; R0.by1 = y1 + 2;
  }
  // roundabouts where a road meets another planned road end to end, and where a motorway comes down to a town road
  if (!opt.closed && runs.length) {
    const ends = [[pts[0], pts[1]], [pts[pts.length - 2], pts[pts.length - 1]]];
    for (let r = 1; r < runs.length; r++) { const k = runs[r][0] * 2; if ((runs[r - 1][2] === 'motorway' || runs[r - 1][2] === 'dual' || runs[r - 1][2] === 'tollway') !== (runs[r][2] === 'motorway' || runs[r][2] === 'dual' || runs[r][2] === 'tollway')) ends.push([pts[k], pts[k + 1]]); }
    for (const [x, y] of ends.slice(2)) N.nodes.push({ x, y, r: 0.8 });
  }
  N.v++;
  if (got.n >= 6) {
    const t = W.townById[W.owner[foot[foot.length >> 1]]] || opt.a;
    const tt = biggestOn(foot) || t;
    if (tt && tn(tt) > 200) chronT('misc', `The ${name} ${T0.ix === RT_IX.motorway || T0.ix === RT_IX.tollway ? 'motorway' : RT[RT_IX[type]].name.toLowerCase()} is to cut through ${tt.name}: the ${polityTitle(pol)} buys and pulls down ${got.n} buildings${money ? ` for ${fmtMoney(est.cost)} ${pol.cur.name}s` : ''}.`, tt);
  }
  return true;
}
// The town that loses most buildings to a new road.
function biggestOn(foot) {
  const c = new Map();
  for (const j of foot) { const t = W.townById[W.owner[j]]; if (t) c.set(t, (c.get(t) || 0) + 1); }
  let best = null, bn = 0;
  for (const [t, n] of c) if (n > bn) { bn = n; best = t; }
  return best;
}
function roadName(pol, type, opt) {
  const N = roadNet(), num = N.num[pol.id] || (N.num[pol.id] = { M: 0, A: 0, B: 0 });
  if (opt.kind === 'ring') return `${opt.a.name} Ring Road`;
  if (opt.kind === 'spoke') return `${opt.a.name} ${type === 'avenue' ? 'Avenue' : type === 'busway' ? 'Busway' : 'Road'}${opt.n > 1 ? ' ' + ['North', 'East', 'South', 'West', 'Upper', 'Lower'][opt.n % 6] : ''}`;
  if (opt.kind === 'works') return `${opt.a.name} Works Road`;
  const L = type === 'motorway' || type === 'tollway' || type === 'smartway' ? 'M' : type === 'dual' ? 'A' : 'B';
  return `${L}${++num[L]}`;
}
function openRoad(R0) {
  R0.done = true;
  const T = RT[R0.type];
  for (const j of R0.foot) {
    if (W.occ[j] === 3) continue;
    if (W.water[j]) { W.rtype[j] = R0.type; continue; }  // a bridge: the tile is still water underneath
    if (!W.rtype[j] || RT[W.rtype[j]].wid < T.wid) W.rtype[j] = R0.type;
    W.road[j] = 4; W.wear[j] = Math.max(W.wear[j], 3000);
    updCost(j); dirty(j);
  }
  roadNet().v++;
  const N = roadNet();
  // one line in the chronicle per project, when its main piece opens
  if ((T.id === 'motorway' || T.id === 'tollway' || T.id === 'dual' || T.id === 'ringroad' || T.id === 'avenue') && !N.roads.some(o => o.proj === R0.proj && o !== R0 && o.done && o.type === R0.type)) {
    const a = W.towns.find(t => t.id === R0.a), b = W.towns.find(t => t.id === R0.b);
    const tt = a || b;
    if (tt) chronT('misc', R0.kind === 'ring' ? `The ${R0.name} opens: traffic goes round ${a.name} instead of through it.` : a && b ? `The ${R0.name} ${T.name.toLowerCase()} opens between ${a.name} and ${b.name}.` : `The ${R0.name} opens in ${tt.name}.`, tt);
  }
}

// ---- yearly ----
function roadsYear() {
  const N = roadNet();
  // construction goes on
  for (const R0 of N.roads) {
    if (R0.done) continue;
    R0.prog += 1;
    if (R0.prog >= R0.need) openRoad(R0);
  }
  // streets worn in by use take their proper type once there are cars, so the rules and limits apply to them too
  retypeStreets();
  // each motoring realm starts at most one project a year (two for a big one), and keeps a few going at once
  const yr = Math.floor(year());
  for (const pol of W.polities) {
    if (!pol.alive || !pol.capital || !pol.capital.alive || !pol.capital.mod.car) continue;
    const busy = N.roads.filter(r => !r.done && r.pol === pol.id).length;
    if (busy >= 4 + Math.floor(pol.pop / 20000)) continue;
    if (pol._roadY === yr) continue;
    pol._roadY = yr;
    const tries = pol.pop > 15000 ? 2 : 1;
    for (let k = 0; k < tries; k++) planOne(pol);
  }
}
// The streets of a motoring town: every worn-in road tile gets the type its place calls for. A slice of the map each year.
function retypeStreets() {
  const n = W.w * W.h, per = Math.ceil(n / 4);
  let i = W.rtSweep || 0;
  for (let k = 0; k < per; k++) {
    i++; if (i >= n) i = 0;
    const lv = W.road[i];
    if (!lv) { if (W.rtype[i] && !W.water[i] && !inPlanned(i)) W.rtype[i] = 0; continue; }
    if (inPlanned(i)) continue;
    const t = W.townById[W.owner[i]];
    if (!t || !t.mod.car) { if (W.rtype[i]) { W.rtype[i] = 0; updCost(i); } continue; }
    const ty = organicType(i);
    if (W.rtype[i] !== ty) { W.rtype[i] = ty; updCost(i); dirty(i); }
  }
  W.rtSweep = i;
}
const inPlanned = i => { roadIndex(); return roadOfT[i] > 0; };
const linkKey = (a, b) => a.id < b.id ? a.id + '.' + b.id : b.id + '.' + a.id;
function planOne(pol) {
  const N = roadNet(), towns = W.towns.filter(t => t.alive && t.polity === pol && !t.nomad && tn(t) >= 60);
  if (!towns.length) return;
  const cap = pol.capital, hw = knows(cap, 'highways');
  const cand = [];
  // links between towns: each town to its nearest bigger neighbours on the same land
  for (const t of towns) {
    const near = [];
    for (const o of W.towns) {
      if (o === t || !o.alive || o.nomad || tn(o) < 60 || W.landId[o.i] !== W.landId[t.i]) continue;
      if (o.polity !== pol && !(areAllies(pol, o.polity) || relOf(pol, o.polity) > 20)) continue;
      const d = Math.hypot(o.x - t.x, o.y - t.y);
      if (d > 90 || d < 6) continue;
      near.push([o, d]);
    }
    near.sort((a, b) => a[1] - b[1]);
    for (const [o, d] of near.slice(0, 3)) {
      if (N.links[linkKey(t, o)]) continue;
      const pa = tn(t), pb = tn(o);
      const type = hw && pa >= 1500 && pb >= 1500 ? (knows(cap, 'autopilot') ? 'smartway' : GOV[pol.gov].id === 'corporate' || GOV[pol.gov].id === 'oligarchy' ? 'tollway' : 'motorway') : hw && Math.min(pa, pb) >= 500 ? 'dual' : 'rural';
      cand.push({ kind: 'link', a: t, b: o, type, sc: Math.sqrt(pa * pb) / (d + 8) * (type === 'motorway' ? 1.4 : 1) });
    }
  }
  // inside the cities: a ring road, arterial spokes, a grand avenue, a busway, a road to the works
  for (const t of towns) {
    const n = tn(t), have = N.roads.filter(r => r.a === t.id && r.kind !== 'link');
    if (hw && n >= 2500 && !have.some(r => r.kind === 'ring')) cand.push({ kind: 'ring', a: t, type: 'ringroad', sc: n / 300 });
    const spokes = have.filter(r => r.kind === 'spoke');
    const sp = new Set(spokes.map(r => r.proj)).size;
    if (n >= 500 && sp < Math.min(6, 2 + Math.floor(n / 1500))) {
      const type = t === cap && n >= 3000 && !spokes.some(r => RT[r.type].id === 'avenue') ? 'avenue' : knows(t, 'motorbus') && n >= 3000 && !spokes.some(r => RT[r.type].id === 'busway') ? 'busway' : 'arterial';
      cand.push({ kind: 'spoke', a: t, type, n: sp, sc: n / 600 });
    }
    if (knows(t, 'lorries') && n >= 400 && !have.some(r => r.kind === 'works')) {
      const works = t.blds.find(b => b.done && (b.type === 'factory' || b.type === 'steelworks' || b.type === 'carplant' || b.type === 'gigafactory' || b.type === 'containerport' || b.type === 'refinery' || b.type === 'chipfab'));
      if (works) cand.push({ kind: 'works', a: t, type: 'industrial', bld: works, sc: n / 900 });
    }
  }
  if (!cand.length) return;
  cand.sort((a, b) => b.sc - a.sc);
  for (const c of cand.slice(0, 3)) if (buildPlan(pol, c)) return;
}
function buildPlan(pol, c) {
  const N = roadNet(), t = c.a;
  nodeBudget = Math.max(nodeBudget, 1);
  if (c.kind === 'link') {
    const P = c.type === 'rural' ? ROAD_PROFILE.rural : ROAD_PROFILE.motor;
    const tiles = planAlignment(townGate(t, c.b.x, c.b.y, pol), townGate(c.b, t.x, t.y, pol), P, pol, 90000);
    N.links[linkKey(t, c.b)] = 1;  // tried: a link that can't be found isn't tried again every year
    if (!tiles || tiles.length < 6) return false;
    if (!startRoad(pol, tiles, c.type, { kind: 'link', a: t, b: c.b })) { delete N.links[linkKey(t, c.b)]; return false; }
    return true;
  }
  if (c.kind === 'ring') {
    const r0 = clamp(urbanR(t) * 1.05, 5, 22), w = W.w, ring = [];
    for (let k = 0; k < 64; k++) {
      const a = k / 64 * 6.283;
      let got = -1;
      for (const dr of [0, 1, -1, 2, -2, 3, 4]) {
        const x = Math.round(t.x + Math.cos(a) * (r0 + dr)), y = Math.round(t.y + Math.sin(a) * (r0 + dr));
        if (x < 2 || y < 2 || x >= w - 2 || y >= W.h - 2) continue;
        const j = y * w + x;
        if (W.water[j] || !roadTilePass(j, pol)) continue;
        got = j; break;
      }
      ring.push(got);
    }
    // the ring is broken where the sea comes in: then it is an arc from shore to shore
    const closed = !ring.includes(-1);
    let best = ring;
    if (!closed) {
      const s0 = ring.indexOf(-1), runs = [];
      let cur = [];
      for (let k = 1; k <= 64; k++) { const j = ring[(s0 + k) % 64]; if (j < 0) { if (cur.length) runs.push(cur); cur = []; } else cur.push(j); }
      if (cur.length) runs.push(cur);
      best = runs.sort((a, b) => b.length - a.length)[0];
    }
    // neighbouring samples can be several tiles apart: join them with straight tile runs so the footprint is whole
    const joined = [];
    for (let k = 0; best && k < best.length; k++) {
      const a = best[k], b = best[(k + 1) % best.length];
      if (k === best.length - 1 && !closed) { joined.push(a); break; }
      const ax = a % w, ay = (a / w) | 0, bx = b % w, by = (b / w) | 0, s = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
      for (let e = 0; e < s; e++) joined.push(Math.round(ay + (by - ay) * e / s) * w + Math.round(ax + (bx - ax) * e / s));
    }
    best = joined;
    if (!best || best.length < 12) return false;
    return startRoad(pol, best, 'ringroad', { kind: 'ring', a: t, closed });
  }
  if (c.kind === 'spoke' || c.kind === 'works') {
    const w = W.w;
    let from = t.i, to = -1;
    if (c.kind === 'works') {
      // from the works gate to the nearest big road, or to the town centre
      from = c.bld.i + c.bld.size * w + (c.bld.size >> 1);
      if (from >= W.occ.length || W.water[from]) from = c.bld.i - w;
      roadIndex();
      let bd = 1e9;
      for (let r = 0; r < N.roads.length; r++) { const R0 = N.roads[r]; if (!R0.done || RT[R0.type].wid < 0.7) continue; for (let k = 0; k < R0.pts.length; k += 8) { const d = Math.hypot(R0.pts[k] - c.bld.x, R0.pts[k + 1] - c.bld.y); if (d < bd && d < 30) { bd = d; to = Math.floor(R0.pts[k + 1]) * w + Math.floor(R0.pts[k]); } } }
      if (to < 0) to = t.i;
    } else {
      // out from the centre, between the spokes already built, to the edge of the city and a little beyond
      const used = N.roads.filter(r => r.a === t.id && r.kind === 'spoke').map(r => Math.atan2(r.pts[r.pts.length - 1] - t.y, r.pts[r.pts.length - 2] - t.x));
      let ba = 0, bs = -1;
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * 6.283;
        let gap = 7;
        for (const u of used) gap = Math.min(gap, Math.abs(((a - u + 9.425) % 6.283) - 3.1416));
        const R1 = urbanR(t) + 4, x = Math.round(t.x + Math.cos(a) * R1), y = Math.round(t.y + Math.sin(a) * R1);
        if (x < 2 || y < 2 || x >= w - 2 || y >= W.h - 2) continue;
        const j = y * w + x;
        if (W.water[j] || !roadTilePass(j, pol)) continue;
        const sc = gap + rnd() * 0.3;
        if (sc > bs) { bs = sc; ba = j; }
      }
      if (bs < 0.5) return false;
      to = ba;
    }
    const tiles = planAlignment(from, to, ROAD_PROFILE.urban, pol, 30000);
    if (!tiles || tiles.length < 5) return false;
    return startRoad(pol, tiles, c.type, { kind: c.kind, a: t, n: c.n || 0 });
  }
  return false;
}

// ---- drawing: cached curves, drawn under the buildings, with casing, surface and markings ----
const roadPathCache = new Map();
let roadPathV = -1;
function roadPath(R0) {
  let p = roadPathCache.get(R0.id);
  if (p && p.v === R0.pts.length) return p;
  p = new Path2D();
  const P = R0.pts;
  p.moveTo(P[0] * TS, P[1] * TS);
  for (let k = 2; k < P.length; k += 2) p.lineTo(P[k] * TS, P[k + 1] * TS);
  p.v = P.length;
  roadPathCache.set(R0.id, p);
  return p;
}
function subPath(R0, s, e) {
  const p = new Path2D(), P = R0.pts;
  p.moveTo(P[s * 2] * TS, P[s * 2 + 1] * TS);
  for (let k = s + 1; k <= e && k * 2 < P.length; k++) p.lineTo(P[k * 2] * TS, P[k * 2 + 1] * TS);
  return p;
}
// Called inside the world transform (1 unit = 1 terrain pixel), after the terrain and before trees and buildings.
function drawRoadNet(ctx, z) {
  const N = W.roadNet;
  const c = Render.cam, x0 = c.x / TS, y0 = c.y / TS, x1 = x0 + Render.vw / z / TS, y1 = y0 + Render.vh / z / TS;
  // the junctions of the worn-in streets, on the tile grid (junctions.js)
  if (typeof drawStreetJunctions === 'function') drawStreetJunctions(ctx, z, x0, y0, x1, y1);
  if (!N || !N.roads.length) return;
  if (roadPathV !== N.v) { roadPathCache.clear(); roadPathV = N.v; }
  const vis = [];
  for (const R0 of N.roads) if (R0.bx1 > x0 && R0.bx0 < x1 && R0.by1 > y0 && R0.by0 < y1) vis.push(R0);
  if (!vis.length) return;
  const JX = typeof drawJunctionRamps === 'function';
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  vis.sort((a, b) => RT[a.type].wid - RT[b.type].wid);
  const far = z < 0.45;
  // under construction: graded earth and a line of orange cones
  for (const R0 of vis) {
    if (R0.done) continue;
    const T = RT[R0.type], p = roadPath(R0);
    ctx.strokeStyle = '#9a7a52'; ctx.globalAlpha = 0.85; ctx.lineWidth = T.wid * TS * 1.15; ctx.stroke(p);
    if (!far) { ctx.setLineDash([TS * 0.3, TS * 0.9]); ctx.strokeStyle = '#e8743a'; ctx.globalAlpha = 1; ctx.lineWidth = Math.max(0.6, T.wid * TS * 0.12); ctx.stroke(p); ctx.setLineDash([]); }
  }
  ctx.globalAlpha = 1;
  // bridges: a shadow on the water and parapets
  for (const R0 of vis) {
    if (!R0.done || !R0.br.length) continue;
    const T = RT[R0.type];
    for (let k = 0; k < R0.br.length; k += 2) {
      const sp = subPath(R0, R0.br[k], R0.br[k + 1]);
      ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = T.wid * TS * 1.5; ctx.save(); ctx.translate(TS * 0.25, TS * 0.35); ctx.stroke(sp); ctx.restore();
      ctx.strokeStyle = '#b8b2a4'; ctx.lineWidth = T.wid * TS * 1.32; ctx.stroke(sp);
    }
  }
  // the slip roads and loops of the interchanges, under the roads they join
  if (JX) drawJunctionRamps(ctx, z, x0, y0, x1, y1);
  // casing (verges and kerbs), then the surface, so junctions merge cleanly
  for (const R0 of vis) {
    if (!R0.done) continue;
    const T = RT[R0.type];
    ctx.strokeStyle = T.edge || shadeHex(T.surf, -0.25); ctx.lineWidth = T.wid * TS * (far ? 1.1 : 1.22); ctx.stroke(roadPath(R0));
  }
  for (const R0 of vis) {
    if (!R0.done) continue;
    const T = RT[R0.type];
    ctx.strokeStyle = T.surf; ctx.lineWidth = T.wid * TS; ctx.stroke(roadPath(R0));
  }
  // roundabouts
  for (const nd of N.nodes) {
    if (nd.x < x0 - 2 || nd.x > x1 + 2 || nd.y < y0 - 2 || nd.y > y1 + 2) continue;
    ctx.fillStyle = '#7a776f'; ctx.beginPath(); ctx.arc(nd.x * TS, nd.y * TS, nd.r * TS * 1.12, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#44464a'; ctx.beginPath(); ctx.arc(nd.x * TS, nd.y * TS, nd.r * TS, 0, 6.283); ctx.fill();
    if (!far) { ctx.fillStyle = '#5f8f48'; ctx.beginPath(); ctx.arc(nd.x * TS, nd.y * TS, nd.r * TS * 0.45, 0, 6.283); ctx.fill(); }
  }
  if (!far) for (const R0 of vis) { if (R0.done) drawMarkings(ctx, R0, z); }
  if (JX) { drawJunctionTops(ctx, z, x0, y0, x1, y1); drawJunctionMarks(ctx, z, x0, y0, x1, y1); }
  ctx.restore();
}
function drawMarkings(ctx, R0, z) {
  const T = RT[R0.type], p = roadPath(R0), w = T.wid * TS;
  const thin = Math.max(0.12, 0.6 / z);
  ctx.lineCap = 'butt';
  switch (T.look) {
    case 'dash': ctx.setLineDash([w * 0.6, w * 0.7]); ctx.strokeStyle = '#e8e6dc'; ctx.lineWidth = thin; ctx.stroke(p); break;
    case 'centre': ctx.setLineDash([w * 0.5, w * 0.5]); ctx.strokeStyle = '#d8d4c4'; ctx.lineWidth = thin; ctx.stroke(p); break;
    case 'double': ctx.strokeStyle = '#d8c25a'; ctx.lineWidth = thin * 2.6; ctx.stroke(p); ctx.strokeStyle = T.surf; ctx.lineWidth = thin * 0.9; ctx.stroke(p);
      if (z >= 1.4) { ctx.setLineDash([w * 0.25, w * 0.3]); ctx.strokeStyle = 'rgba(232,230,220,.7)'; ctx.lineWidth = w * 0.52; ctx.stroke(p); ctx.strokeStyle = T.surf; ctx.setLineDash([]); ctx.lineWidth = w * 0.48; ctx.stroke(p); ctx.strokeStyle = '#d8c25a'; ctx.lineWidth = thin * 2.6; ctx.stroke(p); ctx.strokeStyle = T.surf; ctx.lineWidth = thin * 0.9; ctx.stroke(p); } break;
    case 'median': case 'barrier': case 'smart': {
      // lane lines either side, a solid edge line, and the central reservation
      if (z >= 1.1) {
        ctx.setLineDash([w * 0.18, w * 0.3]); ctx.strokeStyle = T.look === 'smart' ? T.edge : 'rgba(232,230,220,.75)'; ctx.lineWidth = w * (T.lanes >= 6 ? 0.66 : 0.5); ctx.stroke(p);
        ctx.setLineDash([]); ctx.strokeStyle = T.surf; ctx.lineWidth = w * (T.lanes >= 6 ? 0.64 : 0.48) - thin; ctx.stroke(p);
        if (T.lanes >= 6) { ctx.setLineDash([w * 0.18, w * 0.3]); ctx.strokeStyle = 'rgba(232,230,220,.75)'; ctx.lineWidth = w * 0.32; ctx.stroke(p); ctx.setLineDash([]); ctx.strokeStyle = T.surf; ctx.lineWidth = w * 0.3 - thin; ctx.stroke(p); }
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = T.look === 'barrier' ? '#b8b4a8' : T.look === 'smart' ? T.edge : '#5f8f48'; ctx.lineWidth = T.look === 'median' ? w * 0.12 : thin * 1.8; ctx.stroke(p);
      break;
    }
    case 'grassmed': ctx.strokeStyle = '#6f9a50'; ctx.lineWidth = w * 0.22; ctx.stroke(p); if (z >= 1.2) { ctx.setLineDash([w * 0.3, w * 0.35]); ctx.strokeStyle = 'rgba(232,230,220,.6)'; ctx.lineWidth = w * 0.62; ctx.stroke(p); ctx.setLineDash([]); ctx.strokeStyle = T.surf; ctx.lineWidth = w * 0.6 - thin; ctx.stroke(p); ctx.strokeStyle = '#6f9a50'; ctx.lineWidth = w * 0.22; ctx.stroke(p); } break;
    case 'trees': {
      ctx.strokeStyle = '#6f9a50'; ctx.lineWidth = w * 0.2; ctx.stroke(p);
      if (z >= 1) { ctx.fillStyle = '#4f7f3a'; const P = R0.pts; for (let k = 0; k < P.length; k += 4) { ctx.beginPath(); ctx.arc(P[k] * TS, P[k + 1] * TS, w * 0.13, 0, 6.283); ctx.fill(); } }
      break;
    }
    case 'bus': ctx.setLineDash([w * 0.4, w * 0.4]); ctx.strokeStyle = '#e8e6dc'; ctx.lineWidth = thin; ctx.stroke(p); break;
    case 'concrete': if (z >= 1.4) { ctx.setLineDash([thin, w * 0.45]); ctx.strokeStyle = 'rgba(40,40,40,.35)'; ctx.lineWidth = w * 0.9; ctx.stroke(p); } break;
    case 'rail': ctx.strokeStyle = '#d0ccc0'; ctx.lineWidth = w * 1.05; ctx.globalCompositeOperation = 'destination-over'; ctx.stroke(p); ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([w * 0.5, w * 0.6]); ctx.strokeStyle = '#e8e6dc'; ctx.lineWidth = thin; ctx.stroke(p); break;
    case 'edge': ctx.strokeStyle = 'rgba(232,230,220,.5)'; ctx.lineWidth = thin; ctx.stroke(p); break;
  }
  ctx.setLineDash([]);
  ctx.lineCap = 'round';
}
// Traffic that is only a picture: cars, lorries and buses running along the finished roads, thicker near big towns.
// The people who really drive are drawn by drawVehicle, snapped onto the same curves.
function drawRoadTraffic(ctx, z) {
  const N = W.roadNet;
  if (!N || !N.roads.length || z < 0.7) return;
  const c = Render.cam, x0 = c.x / TS - 1, y0 = c.y / TS - 1, x1 = x0 + Render.vw / z / TS + 2, y1 = y0 + Render.vh / z / TS + 2;
  const now = Render.time;
  let drawn = 0;
  for (const R0 of N.roads) {
    if (!R0.done || R0.bx1 < x0 || R0.bx0 > x1 || R0.by1 < y0 || R0.by0 > y1) continue;
    const T = RT[R0.type];
    if (!T.who.includes('m') && !T.who.includes('u')) continue;
    const P = R0.pts, m = P.length >> 1;
    const a = W.towns.find(t => t.id === R0.a);
    const busy = a ? clamp(Math.sqrt(tn(a)) / 40, 0.2, 1.6) : 0.5;
    const dens = (T.lanes >= 6 ? 0.9 : T.lanes >= 4 ? 0.6 : 0.3) * busy;
    const cars = Math.min(60, Math.round(m * 0.22 * dens));
    const v = Math.min(T.kmh, 120) / 40;  // points a second
    // each lane in each direction runs at one speed with its cars evenly spaced, so nobody drives through anybody
    const perDir = T.lanes >= 4 ? T.lanes >> 1 : 1, perLane = Math.max(1, Math.ceil(cars / 2 / perDir));
    for (let q = 0; q < cars; q++) {
      const dir = q & 1, ln = (q >> 1) % perDir, slot = Math.floor((q >> 1) / perDir), h = hash2(R0.id, q, 31);
      const lv = v * (1 - ln * 0.12), pos0 = (now * lv + (slot + hash2(R0.id, ln * 2 + dir, 7) * 0.5) * (m - 1) / perLane) % (m - 1);
      const pos = dir ? (m - 1) - pos0 : pos0, k = Math.floor(pos), f = pos - k;
      const ax = P[k * 2], ay = P[k * 2 + 1], bx = P[k * 2 + 2], by = P[k * 2 + 3];
      if (bx === undefined) continue;
      const x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      let ang = Math.atan2(by - ay, bx - ax);
      if (dir) ang += Math.PI;
      // keep left or right of the centre line by direction, in the inner or outer lane
      const lane = T.wid * (T.lanes >= 4 ? (0.12 + ln * (0.36 / perDir)) : 0.25);
      const ox = -Math.sin(ang) * lane, oy = Math.cos(ang) * lane;
      const tr = a ? Math.max(5, a.trans) : 5, h2 = (h * 7.31) % 1;
      const kind = T.look === 'smart' ? 'pod' : !T.who.includes('m') ? (T.who.includes('u') ? 'bus' : 'bicycle') : T.who.includes('l') && h > 0.8 ? ['lorry', 'tanker', 'flatbed', 'lorry'][(h * 40 | 0) % 4] : h < 0.05 && T.who.includes('u') ? 'bus' : vehicleKind(a, tr, h2);
      drawVehicleSprite(ctx, (x + ox) * TS, (y + oy) * TS, ang, kind, vehicleColour(kind, h2, a ? a.polity : null));
      if (++drawn > 900) return;
    }
  }
}
// Where a real driver on a planned road tile is drawn: on the curve, in their lane. Returns false off the planned roads.
const _snap = { x: 0, y: 0, ang: 0 };
function roadSnap(ti, wx, wy, left) {
  if (!W.roadNet || !W.roadNet.roads.length) return false;
  roadIndex();
  const r = roadOfT[ti];
  if (!r) return false;
  const R0 = W.roadNet.roads[r - 1], P = R0.pts, k = Math.min(roadSegT[ti], (P.length >> 1) - 2);
  const ax = P[k * 2] * TS, ay = P[k * 2 + 1] * TS, bx = P[k * 2 + 2] * TS, by = P[k * 2 + 3] * TS;
  const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
  const f = clamp(((wx - ax) * dx + (wy - ay) * dy) / L2, -0.5, 1.5);
  let ang = Math.atan2(dy, dx);
  if ((Math.cos(ang) < 0) !== !!left) ang += Math.PI;
  const lane = RT[R0.type].wid * TS * 0.25;
  _snap.x = ax + dx * f - Math.sin(ang) * lane; _snap.y = ay + dy * f + Math.cos(ang) * lane; _snap.ang = ang;
  return true;
}
