'use strict';
// Canals. Ships only float on water, big rivers and what people dig, so a town with no way to the sea has a reason to dig, and two seas with a neck of land between them
// have a very good one. A canal is surveyed along the easiest ground, dug a tile at a time by the town's builders, needs locks to climb, and belongs to whoever dug it.

const CANAL_TILE_COST = { [R.WOOD]: 1.5, [R.STONE]: 2 };
// The cheapest line across land from a (a tile, or a list of tiles to start from) to anywhere on the goal network, to tile b,
// or to any water tile goalFn accepts. No going through buildings. A step in the ground needs locks.
function surveyCanal(a, goalNet, b, locks, maxLen, goalFn) {
  const water = W.water, w = W.w, elev = W.elev, occ = W.occ, net = W.seaNet;
  const open = sid, closed = sid + 1; sid += 2;
  if (sid > 2000000000) { stampA.fill(0); sid = 2; }
  heapN = 0;
  const starts = typeof a === 'number' ? [a] : a;
  for (const s0 of starts) { gs[s0] = 0; stampA[s0] = open; cf[s0] = -1; hPush(s0, 0); }
  const ax = starts[0] % w, ay = (starts[0] / w) | 0;
  const isGoal = j => goalFn ? goalFn(j) : goalNet ? net[j] === goalNet : j === b;
  let n = 0, end = -1;
  while (heapN > 0) {
    const cur = hPop();
    if (stampA[cur] === closed) continue;
    stampA[cur] = closed;
    if (cf[cur] >= 0 && isGoal(cur)) { end = cur; break; }
    if (++n > 12000) break;
    if (maxLen && Math.abs(cur % w - ax) + Math.abs(((cur / w) | 0) - ay) > maxLen) continue;
    const g0 = gs[cur];
    for (let k = 0; k < 8; k++) {
      const ni = cur + NB_D[k];
      if (stampA[ni] === closed || water[ni] === 3) continue;
      // a cut goes across land only: the one stretch of water it may enter is the one it's meant to reach
      if (net[ni]) { if (!isGoal(ni) || k > 3 || net[cur]) continue; }
      else if (water[ni] || occ[ni] === 1 || occ[ni] === 3 || occ[ni] === 4) continue;
      const step = Math.abs(elev[ni] - elev[cur]);
      if (step > 0.02 && !locks) continue;
      let c = 12 + Math.max(0, elev[ni]) * 90 + (step > 0.02 ? step * 700 : 0) + (W.biome[ni] === B.ROCK ? 60 : 0) + (occ[ni] === 2 ? 4 : 0) + (W.road[ni] >= 2 ? 10 : 0);
      if (k > 3) c *= 1.414;
      const g = g0 + c;
      if (stampA[ni] === open && gs[ni] <= g) continue;
      gs[ni] = g; stampA[ni] = open; cf[ni] = cur;
      hPush(ni, g);
    }
  }
  if (end < 0) return null;
  const out = [];
  for (let c = end; c >= 0; c = cf[c]) if (!net[c]) out.push(c);
  out.reverse();
  return out.length ? out : null;
}
// Where a cut from this town may start: any stretch of its own navigable water close by, not just the harbour mouth,
// since the quays are hemmed in by the town itself.
function cutStarts(t, port, r) {
  const w = W.w, here = W.seaNet[port], out = [port];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = t.x + dx, y = t.y + dy;
    if (x < 1 || y < 1 || x >= w - 1 || y >= W.h - 1 || (dx + dy) & 1) continue;
    const j = y * w + x;
    if (W.seaNet[j] === here && j !== port) out.push(j);
  }
  return out;
}
function digCanalTile(i, level, job) {
  if (!level) {  // an irrigation ditch: a narrow cut along the field edge, not a waterway
    if (W.occ[i] === 1 || W.occ[i] === 3 || W.water[i] || W.river[i] || W.canal[i]) return;
    if (W.occ[i] === 2) dropField(i);
    ditchArr()[i] = 1;
    W.tree[i] = 0; W.plant[i] = 0;
    updCost(i); dirty(i);
    for (let k = 0; k < 4; k++) dirty(i + NB_D[k]);
    return;
  }
  if (W.occ[i] === 2) dropField(i);
  if (W.occ[i] === 1 || W.occ[i] === 3 || W.water[i]) return;
  W.canal[i] = Math.max(W.canal[i], level);
  W.canalId[i] = job.id;
  W.tree[i] = 0; W.forage[i] = 0; W.plant[i] = 0; W.baseTree[i] = 0; W.baseForage[i] = 0;
  if (W.ditch) W.ditch[i] = 0;
  updCost(i); dirty(i);
  for (let k = 0; k < 4; k++) dirty(i + NB_D[k]);
}
const CUT_NAMES = ['Canal', 'New Cut', 'Navigation', 'Grand Canal', 'Ship Canal', 'Junction Canal'];
function startCanal(t, path, level, what) {
  const m = W.canals.length;
  let name = `${t.name} ${level === 2 ? 'Ship Canal' : 'Canal'}`;
  for (let k = 0; W.canals.some(c => c.name === name) && k < CUT_NAMES.length; k++) name = `${t.name} ${CUT_NAMES[k]}`;
  t.canalJob = { id: m + 1, path, built: 0, level, prog: 0, name, what, upgrade: false };
  chronT('misc', `${t.name} begins digging ${what}: ${path.length === 1 ? 'one tile' : path.length + ' tiles'} of earth to move.`, t);
}
// Once a year a town with the know-how and the money asks whether a cut would pay: a ditch for its fields first,
// then a barge canal to water it has no boat route to, or a ship canal through a neck of land.
function considerCanals(t) {
  if (t.canalJob || t.nomad || t.occupier || t.attack) return;
  if (considerDitch(t)) return;
  if (tn(t) < 80 || !t.tech[TECH_IX.canals]) return;
  if (t.stock[R.STONE] + t.stock[R.BRICK] < 20 || t.stock[R.WOOD] < 15 || rnd() > (t.tech[TECH_IX.shipcanal] ? 0.35 : 0.25)) return;
  const level = t.tech[TECH_IX.shipcanal] ? 2 : 1, locks = !!t.mod.locks, range = level === 2 ? 46 : 26;
  // widen an old barge cut into a proper ship canal
  if (level === 2) {
    for (const c of W.canals) {
      if (c.level !== 1 || c.owner !== t.polity.id || !c.path) continue;
      t.canalJob = { id: c.id, path: c.path, built: 0, level: 2, prog: 0, name: c.name, what: `the ${c.name} wider for ocean ships`, upgrade: true };
      chronT('misc', `${t.name} starts widening the ${c.name} for ocean ships.`, t);
      return;
    }
  }
  const port = portOf(t);
  if (port < 0) {
    // cut off inland: dig to the nearest water a boat can get out on
    const path = nearestNet(t, locks, range);
    if (path) startCanal(t, path, level, 'a canal to open water');
    return;
  }
  // a neck of land between two seas, or a long way round that a short cut would save
  const here = W.seaNet[port];
  let best = null, bs = 0;
  for (const o of W.towns) {
    if (o === t || !o.alive || W.landId[o.i] !== W.landId[t.i] || atWar(t.polity, o.polity)) continue;
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    if (d > range) continue;
    const q = o.portLv ? portOf(o) : waterNear(o.i, 4);
    if (q < 0) continue;
    let gain = 0;
    if (W.seaNet[q] !== here) gain = (o.portLv ? 100 : 40) / (d + 5) * Math.sqrt(Math.max(tn(o), 20) / 100);
    else {
      nodeBudget = Math.max(nodeBudget, 1);
      const route = findShipPath(port, q, 15);
      if (route && route !== PATH_BUSY && route.length > d * 3.5) gain = (route.length / (d + 5));
    }
    if (gain > bs) { bs = gain; best = o; }
  }
  // the town's own trade by sea: is any of it going the long way round a neck of land a cut could save?
  let cut = null;
  for (const o of (t.seaPartners || []).slice(0, 6)) {
    const sc = shortcutFor(port, o, range);
    if (!sc) continue;
    const g = sc.saved / 40 * Math.sqrt(Math.max(tn(o), 1) / 100);
    if (g > bs) { bs = g; cut = sc; best = o; }
  }
  // a lake or a navigable river within reach that no boat from here can get to yet: a barge cut joins it to the rest
  if (!best) {
    const lk = otherWater(port, range * 0.7);
    if (lk >= 0) { const path = surveyCanal(cutStarts(t, port, 10), W.seaNet[lk], -1, locks, range); if (path && path.length <= range) startCanal(t, path, 1, `a barge canal to the ${waterNameAt(lk) || 'water inland'}`); }
    return;
  }
  if (cut) {
    const path = surveyCanal(cutStarts(t, port, 10), 0, cut.to, locks, range);
    if (path && path.length <= range * 1.6) startCanal(t, path, level, `a short cut for the ships to ${best.name}, saving ${Math.round(cut.saved)} leagues`);
    return;
  }
  const q = best.portLv ? portOf(best) : waterNear(best.i, 4);
  if (q < 0) return;
  const w = W.w, qx = q % w, qy = (q / w) | 0, diff = W.seaNet[q] !== here;
  // to other water: anywhere on it will do; round a long coast: come out on the same water close to the other town
  const near = j => W.seaNet[j] === here && Math.abs(j % w - qx) + Math.abs(((j / w) | 0) - qy) <= 6;
  const path = surveyCanal(cutStarts(t, port, 10), diff ? W.seaNet[q] : 0, -1, locks, range, diff ? null : near);
  if (path && path.length <= range * 1.6) startCanal(t, path, diff || level === 2 ? level : 1, `a canal through to ${best.name}`);
}
// Ships from here to o sail the long way round. Walk the straight line between the two harbours: after the first stretch of land,
// where does the water start again, and how much shorter is the voyage from there?
function shortcutFor(port, o, range) {
  const q = portOf(o);
  if (q < 0) return null;
  nodeBudget = Math.max(nodeBudget, 1);
  const route = findShipPath(port, q, 15);
  if (!route || route === PATH_BUSY) return null;
  const w = W.w, ax = port % w, ay = (port / w) | 0, bx = q % w, by = (q / w) | 0, d = Math.hypot(bx - ax, by - ay);
  if (d < 14 || route.length < d * 1.8) return null;
  let land = 0;
  for (let k = 1; k < d; k++) {
    const j = Math.round(ay + (by - ay) * k / d) * w + Math.round(ax + (bx - ax) * k / d);
    if (!W.seaNet[j]) { land++; if (land > range) return null; continue; }
    if (!land) continue;
    nodeBudget = Math.max(nodeBudget, 1);
    const rest = findShipPath(j, q, 15);
    if (!rest || rest === PATH_BUSY) return null;
    const saved = route.length - (land * 1.3 + rest.length + k - land);
    return saved > route.length * 0.3 && saved > 18 ? { to: j, saved, land } : null;
  }
  return null;
}
// The nearest navigable water to a tile, within r (or -1).
function waterNear(i, r) {
  const w = W.w, x0 = i % w, y0 = (i / w) | 0;
  for (let d = 0; d <= r; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
    const j = (y0 + dy) * w + x0 + dx;
    if (j > 0 && j < W.seaNet.length && W.seaNet[j]) return j;
  }
  return -1;
}
// Navigable water of another network near a harbour: worth a cut if it is a real lake or river, not a puddle.
function otherWater(port, r) {
  const w = W.w, x0 = port % w, y0 = (port / w) | 0, here = W.seaNet[port], size = netSizes();
  let best = -1, bs = 0;
  for (let k = 0; k < 90; k++) {
    const a = rnd() * 6.283, d = 3 + rnd() * r, x = Math.round(x0 + Math.cos(a) * d), y = Math.round(y0 + Math.sin(a) * d);
    if (x < 1 || y < 1 || x >= w - 1 || y >= W.h - 1) continue;
    const j = y * w + x, n = W.seaNet[j];
    if (!n || n === here || (size[n] || 0) < 40) continue;
    const sc = Math.sqrt(size[n]) / (d + 6);
    if (sc > bs) { bs = sc; best = j; }
  }
  return best;
}
// How many tiles each water network has; counted at most once a year.
let _netSz = null, _netSzY = -1, _netSzW = null;
function netSizes() {
  const yr = Math.floor(year());
  if (_netSz && _netSzY === yr && _netSzW === W) return _netSz;
  _netSz = {}; _netSzY = yr; _netSzW = W;
  const N = W.seaNet;
  for (let i = 0; i < N.length; i++) if (N[i]) _netSz[N[i]] = (_netSz[N[i]] || 0) + 1;
  return _netSz;
}
// ---- irrigation ditches: small cuts carrying river or lake water to the fields. No boat uses them; the crops do. ----
const ditchArr = () => W.ditch || (W.ditch = new Uint8Array(W.w * W.h));
const isLake = j => W.water[j] && W.biome[j] === B.LAKE;
// Fresh water a ditch can draw from: a river, a lake, a canal, or a ditch already flowing.
const freshAt = j => W.river[j] > 0 || isLake(j) || W.canal[j] > 0 || (W.ditch && W.ditch[j] && !W.occ[j]);
// A field with water running beside it doesn't care what the sky does.
function wetField(i) {
  if (W.river[i]) return true;
  for (let k = 0; k < 8; k++) { const j = i + NB_D[k]; if (W.river[j] || isLake(j) || W.canal[j] || (W.ditch && W.ditch[j] && !W.occ[j])) return true; }
  return false;
}
// The shortest ditch from any of these dry fields back to fresh water, searched from all of them at once.
// Water only runs downhill: without lifting gear the source must sit no lower than the field it feeds.
let _dRoot = null;
function surveyDitch(fields, lift) {
  const w = W.w, elev = W.elev, occ = W.occ, road = W.road, n0 = W.w * W.h;
  if (!_dRoot || _dRoot.length !== n0) _dRoot = new Int32Array(n0);
  const root = _dRoot;
  const open = sid, closed = sid + 1; sid += 2;
  if (sid > 2000000000) { stampA.fill(0); sid = 2; }
  heapN = 0;
  for (const f of fields) { gs[f] = 0; stampA[f] = open; cf[f] = -1; root[f] = f; hPush(f, 0); }
  let n = 0, end = -1;
  while (heapN > 0) {
    const cur = hPop();
    if (stampA[cur] === closed) continue;
    stampA[cur] = closed;
    const r0 = root[cur];
    if (cur !== r0) {
      let src = -1;
      for (let k = 0; k < 4; k++) { const j = cur + NB_D[k]; if (freshAt(j)) { src = j; break; } }
      if (src >= 0 && (lift || elev[src] + 0.03 >= elev[r0])) { end = cur; break; }  // a little head is won with a scoop or a weir
    }
    if (++n > 4000) break;
    const g0 = gs[cur], rx = r0 % w, ry = (r0 / w) | 0;
    for (let k = 0; k < 4; k++) {  // ditches run square to the field edges
      const ni = cur + NB_D[k];
      if (stampA[ni] === closed || W.water[ni] || W.river[ni] || W.canal[ni] || occ[ni] === 1 || occ[ni] === 3 || occ[ni] === 4 || road[ni] >= 2) continue;
      if (Math.abs(ni % w - rx) + Math.abs(((ni / w) | 0) - ry) > 14) continue;
      const c = (occ[ni] === 2 ? 30 : 10) + (road[ni] ? 10 : 0) + Math.max(0, elev[ni] - elev[cur]) * 400 - (W.ditch && W.ditch[ni] ? 6 : 0);
      const g = g0 + Math.max(2, c);
      if (stampA[ni] === open && gs[ni] <= g) continue;
      gs[ni] = g; stampA[ni] = open; cf[ni] = cur; root[ni] = r0;
      hPush(ni, g);
    }
  }
  if (end < 0) return null;
  const out = [];
  for (let c = end; c >= 0 && c !== root[end]; c = cf[c]) if (!(W.ditch && W.ditch[c] && !W.occ[c])) out.push(c);
  return out.length ? out : null;
}
// Farms in dry or middling country near fresh water dig ditches out to the fields that lack it.
function considerDitch(t) {
  const yr = year();
  if ((t.ditchY || -99) > yr - 1.5 || !t.tech[TECH_IX.irrigation] || t.fields.length < 4 || t.stock[R.WOOD] < 3) return false;
  t.ditchY = yr;
  const dry = [];
  for (const f of t.fields) if (!wetField(f.i)) dry.push(f.i);
  if (dry.length < 3) return false;
  let moist = 0; for (let k = 0; k < 8; k++) moist += W.moist[pick(dry)]; moist /= 8;
  if (moist > 0.82) return false;  // wet country: the rain does the work
  const lift = knows(t, 'shaduf') || knows(t, 'screwpump') || knows(t, 'steam');
  const best = surveyDitch(dry, lift);
  if (!best) return false;
  t.canalJob = { id: 0, path: best, built: 0, level: 0, prog: 0, name: '', what: 'an irrigation ditch', upgrade: false };
  if (!W.ditchFirst) { W.ditchFirst = 1; chronT('tech', `The farmers of ${t.name} dig the first irrigation ditch, leading river water out to fields the rain never fed enough.`, t); }
  else if (!t.ditchN && tn(t) > 400) chronT('misc', `${t.name} digs ditches to water its fields.`, t);
  return true;
}
function nearestNet(t, locks, range) {
  // the closest navigable tile, looked for in widening rings
  for (let r = 3; r <= range; r += 3) {
    for (let q = 0; q < r * 4; q++) {
      const a = (q / (r * 4)) * 6.283, i = Math.round(t.y + Math.sin(a) * r) * W.w + Math.round(t.x + Math.cos(a) * r);
      if (i > 0 && i < W.seaNet.length && W.seaNet[i]) return surveyCanal(t.i, W.seaNet[i], -1, locks, range + 4);
    }
  }
  return null;
}
// A builder's spell of digging. Called from their work step.
function digCanal(p, t) {
  const J0 = t.canalJob;
  if (!J0) return;
  if (J0.path[J0.built] === undefined) { finishCanal(t); return; }
  const ditch = !J0.level;
  J0.prog += 30 * t.mod.build * t.toolMul * workRate(p, J.BUILD) * t.scale;
  // a good spell of digging can carry on into the next stretch, a few tiles at most
  for (let n = 0; n < (ditch ? 4 : 2); n++) {
    const i = J0.path[J0.built];
    if (i === undefined) break;
    if (ditch ? t.stock[R.WOOD] < 0.5 : !canPay(t.stock, CANAL_TILE_COST) && t.stock[R.BRICK] < 3) return;
    const need = (ditch ? 14 : J0.level === 2 ? 95 : 45) * (1 + W.elev[i] * 2);
    if (J0.prog < need) return;
    J0.prog -= need;
    if (ditch) t.stock[R.WOOD] -= 0.5;
    else if (canPay(t.stock, CANAL_TILE_COST)) pay(t.stock, CANAL_TILE_COST); else t.stock[R.BRICK] -= 3;
    if (FXH && !ditch) FXH.rubble(i % W.w, (i / W.w) | 0, 1);
    digCanalTile(i, J0.level, J0);
    J0.built++;
  }
  J0.prog = Math.min(J0.prog, 200);
  if (J0.built >= J0.path.length) finishCanal(t);
}
function finishCanal(t) {
  const J0 = t.canalJob;
  t.canalJob = null;
  if (!J0) return;
  if (!J0.level) { t.ditchN = (t.ditchN || 0) + 1; return; }  // a ditch: the fields beside it are wet now, nothing else changes
  if (J0.upgrade) { const c = W.canals.find(k => k.id === J0.id); if (c) c.level = 2; }
  else W.canals.push({ id: J0.id, name: J0.name, owner: t.polity.id, town: t.id, level: J0.level, len: J0.path.length, path: J0.path, traffic: 0, built: Math.floor(year()) });
  linkSeaNet();
  pathCache.clear(); shipCache.clear();
  t.portI = -1;
  for (const o of W.towns) o.portI = -1;
  chronT('wonder', J0.upgrade ? `The ${J0.name} is widened. Ocean ships pass through ${t.name} now.` : `The ${J0.name} opens. Boats can reach where only carts could go.`, t);
  scanTown(t);
  pathXP(t.polity, 'mar', 200);
}
// ---- filling in the shallows. New land is hugely expensive, so a town only does it when it has no room left and can pay. ----
const FILL_COST = 260;   // in gold-weight coin, per tile, before local prices
// Would this tile be safe to fill? It has to touch land, leave the water around it joined up, and stay out of the way of shipping and harbours.
// What filling one tile costs, as a multiple of shallow water by the beach: the further out the more stone it swallows,
// open ocean takes it by the shipload, and a shipping lane means paying off every merchant who used it.
function fillMul(i) {
  let m = 1 + Math.min(W.shoreDist[i] || 0, 8) * 0.25;
  if (W.water[i] === 2) m *= 8;
  if (W.lane[i] > 0) m *= 1 + Math.min(W.lane[i], 36) * 0.3;
  return m;
}
function fillSafe(i) {
  if ((W.water[i] !== 1 && W.water[i] !== 2) || W.ice[i] > 80) return false;
  const w = W.w, ring = [i - w - 1, i - w, i - w + 1, i + 1, i + w + 1, i + w, i + w - 1, i - 1];
  let wet = 0, joins = 0, land = 0;
  for (let k = 0; k < 8; k++) {
    const a = !!W.water[ring[k]], b = !!W.water[ring[(k + 1) % 8]];
    if (a) wet++; else land++;
    if (a !== b) joins++;
    if (W.occ[ring[k]] === 1) { const bd = W.bAt.get(ring[k]); if (bd && BLD[bd.type] && BLD[bd.type].port) return false; }  // never fill in front of a quay
    if (W.canal[ring[k]]) return false;
  }
  if (!land || wet < 3) return false;
  // water on two separate sides means this tile is a channel: closing it could cut a route
  if (joins > 2) return false;
  // nor the last of a small lake
  const bd = W.bodies[W.body[i]];
  if (bd && bd.kind === 'lake' && bd.area < 40) return false;
  return true;
}
function considerFill(t) {
  if (t.fillJob || t.canalJob || t.occupier || t.attack || t.nomad || rnd() > 0.08) return;
  if (tn(t) < 260 || t.crowd < 0.9 || !t.tech[TECH_IX.engineering] || t.near.water === 0) return;
  // only when there's really nowhere else to build
  if (t.sArable.length > tn(t) * 0.05 + 12) return;
  const cur = t.polity.cur, price = FILL_COST * Math.max(1, cur.level) * 6;
  if (cur.kind < 2 || cur.treasury < price * 4) return;
  const w = W.w, r = t.radius, tiles = [];
  for (let k = 0; k < 300 && tiles.length < 14; k++) {
    const a = rnd() * 6.283, d = rnd() * r, i = Math.round(t.y + Math.sin(a) * d) * w + Math.round(t.x + Math.cos(a) * d);
    if (i > w && i < W.water.length - w && fillSafe(i) && !tiles.includes(i)) tiles.push(i);
  }
  // the cheap tiles first, and only as many as the treasury can stand
  tiles.sort((a, b) => fillMul(a) - fillMul(b) || W.shoreDist[a] - W.shoreDist[b]);
  let sum = 0, n = 0;
  while (n < tiles.length && (sum + fillMul(tiles[n])) * FILL_COST * Math.max(1, cur.level) < cur.treasury * 0.5) sum += fillMul(tiles[n++]);
  tiles.length = n;
  if (tiles.length < 3) return;
  t.fillJob = { tiles, built: 0, prog: 0, spent: 0 };
  chronT('misc', `With nowhere left to grow, ${t.name} votes the money to fill in part of its shore.`, t);
}
function fillStep(p, t) {
  const J0 = t.fillJob;
  if (!J0) return;
  const i = J0.tiles[J0.built], cur = t.polity.cur;
  if (i === undefined) { t.fillJob = null; return; }
  J0.prog += 30 * t.mod.build * t.toolMul * workRate(p, J.BUILD) * t.scale;
  if (J0.prog < 220) return;
  J0.prog = 0; J0.built++;
  const cost = FILL_COST * Math.max(1, cur.level) * fillMul(i), rock = W.water[i] === 2 ? 64 : 16;
  // it might have stopped being safe while they worked; and when the money or the stone run out, so does the project
  if (cur.treasury < cost || t.stock[R.STONE] + t.stock[R.BRICK] < rock) { t.fillJob = null; chronT('misc', `${t.name} runs out of money for its sea wall, and the work stops.`, t); return; }
  if (!fillSafe(i)) { if (J0.built >= J0.tiles.length) t.fillJob = null; return; }
  cur.treasury -= cost; cur.spentY += cost; J0.spent += cost;
  if (t.stock[R.STONE] >= rock) t.stock[R.STONE] -= rock; else { const s0 = t.stock[R.STONE]; t.stock[R.STONE] = 0; t.stock[R.BRICK] -= rock - s0; }
  fillTile(i);
  if (FXH) FXH.rubble(i % W.w, (i / W.w) | 0, 3);
  if (J0.built >= J0.tiles.length) {
    t.fillJob = null;
    if (tn(t) > 100) chronT('wonder', `${t.name} finishes its new waterfront: ${J0.tiles.length} blocks of land where the sea used to be, at a cost of ${Math.round(J0.spent)} ${cur.name}.`, t);
    scanTown(t);
  }
}
function fillTile(i) {
  W.water[i] = 0; W.biome[i] = B.GRASS; W.elev[i] = 0.012; W.shoreDist[i] = 0; W.body[i] = 0;
  W.seaNet[i] = 0; W.fish[i] = W.baseFish[i] = 0; W.ice[i] = 0; W.lane[i] = 0; W.snowD[i] = 0;
  W.fert[i] = W.baseFert[i] = 50; W.forage[i] = W.baseForage[i] = 0;
  W.baseCost[i] = 10; W.cost[i] = 10;
  let id = 0;
  for (let k = 0; k < 8 && !id; k++) { const j = i + NB_D[k]; if (!W.water[j] && W.landId[j] > 0) id = W.landId[j]; }
  W.landId[i] = id;
  pathCache.clear(); shipCache.clear();
  if (onLandChange) onLandChange(i);
  dirty(i);
}
// Tolls for the owner.
function canalsYear() {
  for (const c of W.canals) {
    const pol = W.polities[c.owner], town = W.townById[c.town];
    if (!pol || !pol.alive || !town || !town.alive) continue;
    if (town.polity !== pol) { c.owner = town.polity.id; chronT('misc', `Control of the ${c.name} passes to ${town.polity.name}.`, town); continue; }
    if (c.traffic) { town.stock[R.GOLD] += c.traffic * 0.05; pol.cur.treasury += c.traffic * 0.6; pol.cur.incY += c.traffic * 0.6; c.traffic = 0; }
  }
}
// Is this tile a cut someone at war with these ships won't let them through?
function canalClosed(i, pol) {
  const id = W.canalId[i];
  if (!id) return false;
  const c = W.canals[id - 1];
  if (!c) return false;
  c.traffic++;
  const own = W.polities[c.owner];
  return own && own !== pol && atWar(own, pol);
}
