'use strict';
// Real ships. A hull is laid at a port, costs the town real materials, takes sailors' labour to finish, and sails from a real quay.

const LIST_OF = s => s.kind === 'war' ? WARSHIPS : MERCHANTMEN;
const shipDef = s => LIST_OF(s)[s.type];
// Tiles a tick. Under sail or oar a hull makes a few times a walker's pace; an engine many times it, and a modern freighter crosses an ocean in weeks.
const hullSpd = D => D.spd * (D.burn !== undefined || (D.cost && (D.cost[R.COAL] || D.cost[R.OIL] || D.cost[R.URANIUM])) ? 1.5 : 1);
// What a hull really carries, in loads (a load is about a person's food for a season, some 60 kg): a dugout half a tonne, a knarr
// some 25 tonnes, a carrack 600, a clipper 1500, a container ship tens of thousands, compressed towards the top so a giant hull
// doesn't swallow a whole city's stores. D.cap stays the hull's size (which berths, fuel, big or small). The hull itself is the
// shipping technology: inventions for carts and caravans don't make a ship's hold bigger, only better quays and cargo handling do.
const HOLD = {
  reedboat: 20, dugout: 12, outrigger: 40, rbarge: 280, barque: 320, knarr: 400, merchgalley: 800, dhow: 650, grainship: 2600, cog: 1200,
  junk: 3000, caravel: 950, carrack: 3600, fluyt: 4000, indiaman: 5200, clipper: 6000, paddlesteamer: 2200, steamer: 10000, reefer: 8500,
  coaster: 3500, tanker: 22000, freighter: 26000, hovercraft: 500, roroship: 18000, autocargo: 34000, rotorship: 30000,
  bulker: 34000, collier: 13000, supertanker: 60000, gascarrier: 45000, megabox: 80000, orecarrier: 90000,
};
for (const D of MERCHANTMEN) D.hold = HOLD[D.id] || D.cap * 12;
const holdOf = (D, t) => D.hold * clamp(1 + Math.log(Math.max(1, t.mod.cargo)) * 0.06, 1, 1.25);
const SHIP_NAMES_A = ['Swift', 'Grey', 'Lucky', 'Sea', 'Salt', 'Morning', 'Evening', 'Golden', 'Iron', 'Silver', 'Wandering', 'Faithful', 'Bold', 'Northern', 'Southern', 'Merry', 'Stormy', 'Patient'];
const SHIP_NAMES_B = ['Gull', 'Star', 'Wave', 'Maiden', 'Fortune', 'Heron', 'Dolphin', 'Wind', 'Crown', 'Rose', 'Promise', 'Tern', 'Pilgrim', 'Lady', 'Horizon'];

function portOf(t) {
  if (t.portI >= 0 && W.seaNet[t.portI]) return t.portI;
  t.portI = -1;
  for (const b of t.blds) {
    if (!b.done || b.type === 'house') continue;
    const def = BLD[b.type];
    if (!def || !def.port) continue;
    for (let dy = -1; dy <= b.size; dy++) for (let dx = -1; dx <= b.size; dx++) {
      const j = b.i + dx + dy * W.w;
      if (j > 0 && j < W.occ.length && W.seaNet[j]) { t.portI = j; t.portB = b.i; return j; }
    }
  }
  return -1;
}
// What water a hull can use: only sea-going ones cross the deep, only shallow ones go up rivers and through barge cuts.
function shipSpec(D, home) {
  let spec = 0;
  if (D.sea >= 2) spec |= 1;
  if (D.draft <= 1) spec |= 2 | 4;
  if (D.draft <= 2) spec |= 8;
  if (bigHull(D)) spec |= 16;
  return spec;
}
// The big cargo hulls (tankers, container ships, bulk carriers and bigger): deep draught, no rivers or canals, crawl in the shallows,
// and only a big port (merchant port or container port, on real sea water) can build, home or receive them.
const bigHull = D => !!(D.bulk || D.cap >= 600);
const BIG_PORT = 3, SHOAL_SPEED = 0.4;
function portStats(t) {
  let lv = 0, yards = 0, navy = 0;
  for (const k in t.count) {
    const def = BLD[k];
    if (def && def.port && t.count[k] > 0) { lv = Math.max(lv, def.port); yards += (def.yard || (def.port >= 2 ? 1 : 0)) * t.count[k]; if (def.navy) navy += t.count[k]; }
  }
  t.portLv = lv; t.yards = yards; t.navy = navy;
}
function findSeaPartners(t) {
  t.seaPartners = t.seaPartners || [];
  t.seaPartners.length = 0;
  if (!t.portLv || t.nomad) return;
  const R0 = 42 * t.mod.seaRange * t.mod.trade, list = [], mine = portOf(t);
  if (mine < 0) return;
  const net = W.seaNet[mine];
  for (const o of W.towns) {
    if (o === t || !o.portLv || o.nomad) continue;
    const q = portOf(o);
    if (q < 0 || W.seaNet[q] !== net) continue;  // no water between them, no trade by water
    const d = Math.hypot(wdx(t.x, o.x), o.y - t.y);  // across the date line on the Earth map
    if (d <= R0) list.push({ o, d });
  }
  list.sort((a, b) => a.d - b.d);
  for (let k = 0; k < list.length && k < 7; k++) t.seaPartners.push(list[k].o);
  // a port with ocean-going hulls trades across the sea too: the biggest harbours on other shores, however far
  if (t.mod.sail >= 2) {
    const far = [];
    for (const o of W.towns) {
      if (o === t || !o.portLv || o.nomad || W.landId[o.i] === W.landId[t.i] || t.seaPartners.includes(o) || atWar(t.polity, o.polity)) continue;
      const q = portOf(o);
      if (q < 0 || W.seaNet[q] !== net) continue;
      far.push({ o, v: tn(o) / (Math.hypot(wdx(t.x, o.x), o.y - t.y) + 40) });
    }
    far.sort((a, b) => b.v - a.v);
    for (let k = 0; k < far.length && k < 3; k++) t.seaPartners.push(far[k].o);
  }
}
// Somewhere worth sailing to: an empty, well-watered coast on another shore that a ship from here can reach.
function overseasSite(t) {
  const port = portOf(t);
  if (port < 0) return -1;
  const net = W.seaNet[port], w = W.w, wants = realmWants(t.polity);
  let best = -1, bs = 1.5;
  for (let k = 0; k < 160; k++) {
    const i = rint(W.w * W.h);
    if (W.water[i] || W.river[i] || W.occ[i] || W.shoreDist[i] > 2 || W.landId[i] === W.landId[t.i]) continue;
    const b = W.biome[i];
    if (b === B.ROCK || b === B.SNOW || b === B.TUNDRA || slopeAt(i) > 0.12) continue;
    // reachable by sea from here: some water next to it belongs to the same sea
    let ok = false;
    for (let q = 0; q < 8 && !ok; q++) { for (let r = 1; r <= 3 && !ok; r++) { const j = i + NB_X[q] * r + NB_Y[q] * r * w; if (j > 0 && j < W.seaNet.length && W.seaNet[j] === net) ok = true; } }
    if (!ok) continue;
    let crowded = false;
    for (const o of W.towns) { const dx = o.x - i % w, dy = o.y - ((i / w) | 0); if (dx * dx + dy * dy < 260) { crowded = true; break; } }
    if (crowded) continue;
    const own = W.townById[W.owner[i]];
    const s = siteScore(t, i, false, wants) - (own ? 3 : 0) - Math.hypot(t.x - i % w, t.y - i / w) * 0.006 + rnd() * 1.5;
    if (s > bs) { bs = s; best = i; }
  }
  return best;
}
// Yearly: does this port want another hull, and can it pay for one?
// The seas hold as many hulls as the world's trade can use: about one seagoing ship per hundred people, within what the computer can sail.
function shipCap() {
  const y = Math.floor(W.tick / TPY);
  if (W._shipCapY !== y) { W._shipCapY = y; W._shipCap = clamp(worldPop() / 100, W.shipMax, 600); }
  return W._shipCap;
}
function planShips(t) {
  if (!t.portLv || t.nomad || t.shipQ) return;
  const fleet = t.ships;
  let mer = 0, war = 0;
  for (const s of fleet) { if (s.kind === 'war') war++; else mer++; }
  const m = t.mod;
  const atWarNow = Object.keys(t.polity.warsWith).length > 0;
  if (t.navy > 0 && W.ships.length < shipCap()) {
    const wantW = Math.ceil((t.navy * (atWarNow ? 5 : 2)) * (m.fleet || 1));
    // a balanced fleet: mostly ships of the line, escorts to hunt submarines, then whatever special hulls the realm has learned to build
    const have = {};
    for (const s of fleet) if (s.kind === 'war') { const r0 = WARSHIPS[s.type].role; have[r0] = (have[r0] || 0) + 1; }
    const SHARE = { carrier: 0.1, missile: 0.12, sub: 0.18, raid: 0.15, escort: 0.28, line: 0.5 };
    let ty = -1;
    for (const role in SHARE) {
      if (war > 1 && (have[role] || 0) >= Math.max(1, war * SHARE[role])) continue;
      for (let k = WARSHIPS.length - 1; k >= 0; k--) { const D = WARSHIPS[k]; if (D.role === role && (D.techI < 0 || t.tech[D.techI]) && canPay(t.stock, D.cost)) { ty = k; break; } }
      if (ty >= 0) break;
    }
    if (ty < 0) ty = bestOf(WARSHIPS, t);
    if (war < wantW && ty >= 0 && canPay(t.stock, WARSHIPS[ty].cost)) {
      pay(t.stock, WARSHIPS[ty].cost);
      t.shipQ = { kind: 'war', type: ty, prog: 0, need: 500 + WARSHIPS[ty].hp * 2 };
      return;
    }
  }
  const trade = t.seaPartners && t.seaPartners.length;
  const wantM = Math.min(24, Math.ceil(((t.count.wharf ? 0.6 : 0) + (t.count.dock || 0) * 1.4 + t.yards * 1.2 + tn(t) / 250) * (m.fleet || 1)));
  if (!trade) return;
  // bulk hulls are counted on their own: a full fleet of small traders doesn't stop a big port laying one down,
  // and when the seas are full the two oldest small hulls at the quay are sold to make way for it
  let ty = bulkWant(t, fleet, mer);
  if (ty >= 0 && W.ships.length >= shipCap() && !retireSmall(t, 2)) ty = -1;
  if (ty >= 0) { pay(t.stock, MERCHANTMEN[ty].cost); t.shipQ = { kind: 'trade', type: ty, prog: 0, need: 240 + MERCHANTMEN[ty].hp * 2 }; return; }
  // a fleet that sails half empty doesn't need another hull; one that keeps sailing near empty sells its smallest
  const fill = t.shipFill === undefined ? 0.5 : t.shipFill;
  if (mer > 2 && fill < 0.12) { retireSmall(t, 1); t.shipFill = 0.3; return; }
  if (mer >= wantM || W.ships.length >= shipCap() || (mer >= 2 && fill < 0.25)) return;
  for (let k = MERCHANTMEN.length - 1; k >= 0; k--) {
    const D = MERCHANTMEN[k];
    if (D.bulk || (D.techI >= 0 && !t.tech[D.techI]) || D.port > t.portLv) continue;
    if (bigHull(D) && (t.portLv < BIG_PORT || !deepQuay(t))) continue;
    // only a hull the home quays can take, and a special cargo only where there is a quay for it and the cargo to carry
    if (!canBerth(t, D) || (D.ck && D.ck !== 'gen' && D.ck !== 'pass' && !hasPortFor(t, D.ck))) continue;
    if (D.ck === 'pass' && tn(t) < 300) continue;
    if (canPay(t.stock, D.cost)) { ty = k; break; }
  }
  if (ty < 0) return;
  pay(t.stock, MERCHANTMEN[ty].cost);
  t.shipQ = { kind: 'trade', type: ty, prog: 0, need: 240 + MERCHANTMEN[ty].hp * 2 };
}
// Sells n of a port's smallest idle traders (tied up, carrying nobody), for a little of what they cost. False if it hasn't n to spare.
function retireSmall(t, n) {
  const idle = t.ships.filter(s => s.kind === 'trade' && s.state === 0 && s.mission === 'trade' && !s.pass.length && !bigHull(MERCHANTMEN[s.type]));
  if (idle.length < n) return false;
  idle.sort((a, b) => a.type - b.type || a.built - b.built);
  for (let k = 0; k < n; k++) {
    const s = idle[k], D = MERCHANTMEN[s.type];
    if (s.load > 0) unloadShip(s, t);
    for (const r in D.cost) t.stock[r] += D.cost[r] * 0.3;
    loseShip(s, 'sold');
  }
  return true;
}
// A deep-water quay: a river landing can't take a bulk hull.
const deepQuay = t => { const q = portOf(t); return q >= 0 && W.water[q] > 0; };
// Every other big deep-water port on the same sea that isn't at war with this one: where big hulls may trade.
const _bigP = [];
function bigPorts(t) {
  _bigP.length = 0;
  const q = portOf(t);
  if (q < 0) return _bigP;
  const net = W.seaNet[q];
  for (const o of W.towns) {
    if (o === t || !o.alive || o.nomad || o.portLv < BIG_PORT || tn(o) < 300 || atWar(t.polity, o.polity)) continue;
    const p = portOf(o);
    if (p < 0 || !W.water[p] || W.seaNet[p] !== net) continue;
    _bigP.push(o);
  }
  return _bigP;
}
// How much of a bulk hull's cargo one port could really send another: spare at one end, wanted at the other, and worth the trip.
function haulFor(from, to, D) {
  let v = 0;
  for (const r of D.hauls) {
    const spare = from.stock[r] - wantOf(from, r) * 0.9, lack = wantOf(to, r) - to.stock[r];
    if (spare < 10 || lack < 10) continue;
    if (from.polity.cur.kind >= 2 && to.polity.cur.kind >= 2 && margin(from, to, r) < 1) continue;
    v += Math.min(spare, lack);
  }
  return v;
}
// A big port with far partners and plenty to ship lays down a bulk hull, of whichever kind carries what it has most of.
function bulkWant(t, fleet, mer) {
  if (mer < 3 || t.portLv < BIG_PORT || tn(t) < 450 || !deepQuay(t)) return -1;
  let bulk = 0;
  for (const s of fleet) if (s.kind !== 'war' && MERCHANTMEN[s.type].bulk) bulk++;
  if (bulk >= Math.min(4, Math.floor(tn(t) / 900) + (t.count.containerport ? 1 : 0))) return -1;
  let far = 0;
  for (const o of bigPorts(t)) if (Math.hypot(o.x - t.x, o.y - t.y) > 25) far++;
  if (!far) return -1;
  let best = -1, bs = 80;
  for (const D of MERCHANTMEN) {
    if (!D.bulk || (D.techI >= 0 && !t.tech[D.techI]) || D.port > t.portLv || !canPay(t.stock, D.cost) || !canBerth(t, D)) continue;
    let s = 0;
    for (const r of D.hauls) s += Math.max(0, t.stock[r] - wantOf(t, r));
    s *= 1 + D.ix * 0.03;
    if (s > bs) { bs = s; best = D.ix; }
  }
  return best;
}
// Where a bulk hull goes: the far, big, deep-water port with the most to carry both ways. Long runs score higher.
function bulkRun(h, D, P) {
  let best = null, bs = 30;
  for (const o of P) {
    if (!o.alive || o.portLv < BIG_PORT || tn(o) < 300 || atWar(h.polity, o.polity) || o.blockaded > W.tick || relOf(h.polity, o.polity) < -55 || !deepQuay(o)) continue;
    if (!canBerth(o, D)) { const st = portStat(o); st.turn++; st.turnCk = D.ck || 'bulk'; continue; }
    const v = haulFor(h, o, D) + haulFor(o, h, D) * 0.7;
    const sc = v * (0.5 + Math.min(Math.hypot(o.x - h.x, o.y - h.y), 240) / 80) * (0.8 + rnd() * 0.4);
    if (sc > bs) { bs = sc; best = o; }
  }
  return best;
}
function launchShip(t, q) {
  t.shipQ = null;
  const at = portOf(t);
  if (at < 0) return null;
  const D = (q.kind === 'war' ? WARSHIPS : MERCHANTMEN)[q.type];
  const s = {
    id: W.nextId++, kind: q.kind, type: q.type, home: t, pol: t.polity, at, nx: at, frac: 0, path: null, pi: 0, state: 0, wait: W.tick + 20 + rint(60),
    hp: D.hp, cargo: new Float32Array(R.N), load: 0, dest: null, mission: q.kind === 'war' ? 'guard' : 'trade', pass: [], doom: -1, name: `${pick(SHIP_NAMES_A)} ${pick(SHIP_NAMES_B)}`, voyages: 0, built: Math.floor(year()), dir: 1, wake: 0, cool: 0, onDone: null, block: 0,
    leg: undefined, hph: undefined, hTown: undefined, mvA: undefined, mvT: undefined, berth: undefined, lighter: undefined, hStart: undefined, hDone: undefined, army: undefined, landing: undefined, landTile: undefined, ready: undefined, expect: undefined,  // filled in later; declared so every ship has the same shape
  };
  t.ships.push(s); W.ships.push(s);
  if (!W.firstShip && q.kind === 'trade') { W.firstShip = true; chronT('tech', `The first trading vessel, the ${s.name}, slides off the slip at ${t.name}.`, t); }
  if (q.kind === 'trade' && D.bulk) {
    const F = W.bulkFirst || (W.bulkFirst = {});
    if (!F[D.id]) { F[D.id] = 1; chronT('tech', `${t.name} launches the ${s.name}, the first ${D.name.toLowerCase()}: ${D.hold.toLocaleString('en')} loads in a single hull.`, t); }
  }
  if (q.kind === 'war' && t.navy && !t.polity.firstWarship) { t.polity.firstWarship = true; if (t.polity.pop > 80) chronT('war', `The military port of ${t.name} launches the first warship of ${t.polity.name}, the ${s.name}.`, t); }
  return s;
}
function loseShip(s, how) {
  const k = W.ships.indexOf(s); if (k >= 0) W.ships.splice(k, 1);
  const h = s.home; if (h) { const q = h.ships.indexOf(s); if (q >= 0) h.ships.splice(q, 1); }
  s.sunk = how;
  if (s.berth) releaseBerth(s);
  for (const p of s.pass.slice()) if (p.alive) killPerson(p, 'drowned');
  s.pass.length = 0;
  if (typeof Render !== 'undefined' && Render.sel && Render.sel.obj === s) Render.sel = null;
}
function setCourse(s, to) {
  nodeBudget = Math.max(nodeBudget, 1);
  const path = findShipPath(s.at, to, shipSpec(shipDef(s), s.home));
  if (!path || path === PATH_BUSY) return path === PATH_BUSY ? 0 : -1;
  if (s.berth) releaseBerth(s);
  s.state = 1; s.hTown = null;
  s.path = path; s.pi = 0; s.frac = 0; s.nx = path.length > 1 ? path[1] : path[0]; s.state = 1;
  return 1;
}
// Everything a port trades must leave on a hull and come back on one.
function loadShip(s, from, to) {
  s.cargo.fill(0); s.load = 0;
  const D = shipDef(s), cap = holdOf(D, from);
  if (D.hauls) {  // only its own kind of cargo, and no more than the far end is short of
    for (const r of D.hauls) {
      if (s.load >= cap) break;
      if (from.polity.cur.kind >= 2 && to.polity.cur.kind >= 2 && margin(from, to, r) < 1) continue;
      const a = Math.min(cap - s.load, from.stock[r] - wantOf(from, r) * 0.9, (wantOf(to, r) - to.stock[r]) * 1.5 + 10);
      if (a > 1) { from.stock[r] -= a; s.cargo[r] += a; s.load += a; }
    }
    return;
  }
  for (let q = 0; q < 3 && s.load < cap; q++) {
    const r = bestCargo(from, to, cap - s.load);
    if (r < 0) break;
    const a = Math.min(cap - s.load, from.stock[r] - wantOf(from, r) * 0.9);
    if (a <= 0) break;
    from.stock[r] -= a; s.cargo[r] += a; s.load += a;
  }
}
function unloadShip(s, to) {
  for (let r = 0; r < R.N; r++) if (s.cargo[r] > 0) { if (s.home && to !== s.home) payForGoods(to, s.home, r, s.cargo[r]); to.stock[r] += s.cargo[r]; s.cargo[r] = 0; }
  s.load = 0;
}
// A big hull whose home lost its big port: it moves to the nearest big port of its own realm it can sail to, or it is sold off.
function rehomeBig(s, h, D) {
  const net = W.seaNet[s.at];
  let best = null, bd = 1e9;
  for (const o of W.towns) {
    if (o === h || !o.alive || o.polity !== h.polity || o.portLv < BIG_PORT || !deepQuay(o) || W.seaNet[portOf(o)] !== net) continue;
    const d = Math.hypot(o.x - h.x, o.y - h.y);
    if (d < bd) { bd = d; best = o; }
  }
  if (best) {
    const k = h.ships.indexOf(s); if (k >= 0) h.ships.splice(k, 1);
    best.ships.push(s); s.home = best;
    unloadShip(s, h);
    const r = setCourse(s, portOf(best));
    if (r !== 0) { s.mission = 'trade'; s.leg = 2; s.dest = null; s.wait = W.tick + 30; if (r > 0) return; }
    else { s.wait = W.tick + 4; return; }
  }
  // nowhere to go: sold for scrap, and some of the steel comes back
  unloadShip(s, h);
  for (const r in D.cost) h.stock[r] += D.cost[r] * 0.4;
  if (D.bulk && tn(h) > 200) chronT('misc', `With no big harbour left at ${h.name}, the ${D.name.toLowerCase()} ${s.name} is sold for scrap.`, h);
  loseShip(s, 'sold');
}
function shipThink(s) {
  const h = s.home;
  if (!h || !h.alive) { loseShip(s, 'abandoned'); return; }
  if (s.pol !== h.polity) s.pol = h.polity;
  if (s.kind === 'war') return warshipThink(s);
  if (s.mission === 'carry') {  // waiting at the quay for passengers
    if (W.tick < s.wait && !s.ready) return;
    if (!s.pass.length) { s.mission = 'trade'; s.landing = -1; return; }
    if (!s.landing || s.landing < 0) { disembark(s); return; }
    const r = setCourse(s, s.landing, Math.max(h.mod.sail, 1));
    if (r === 0) { s.wait = W.tick + 5; return; }
    if (r < 0) { disembark(s); return; }
    s.mission = 'carrying';
    return;
  }
  if (W.tick < s.wait) return;
  if (s.pend) { const q = s.pend; s.pend = null; depart(s, q.to, q.leg); return; }
  const D0 = shipDef(s);
  if (bigHull(D0) && (h.portLv < BIG_PORT || !deepQuay(h))) { rehomeBig(s, h, D0); return; }
  if (h.blockaded > W.tick) { s.wait = W.tick + 30; return; }
  const big = bigHull(D0);
  const P = big ? bigPorts(h) : h.seaPartners;  // a big hull trades with the big ports on its sea, however far
  if (!P || !P.length) { s.wait = W.tick + (big ? 200 : 60); return; }
  const from = portOf(h), spec = shipSpec(D0, h);
  if (D0.bulk) {  // a bulk hull waits at the quay until a real long haul is worth it
    const o = bulkRun(h, D0, P);
    if (!o) { s.wait = W.tick + 120 + rint(120); return; }
    nodeBudget = Math.max(nodeBudget, 1);
    const p0 = findShipPath(from, portOf(o), spec);
    if (p0 === PATH_BUSY) { s.wait = W.tick + 4; return; }
    if (!p0) { s.wait = W.tick + 300 + rint(200); return; }
    s.dest = o; s.mission = 'trade'; s.leg = -1;
    enterHarbour(h, s, 'load');  // alongside to load first: the voyage starts when the holds are full
    return;
  }
  let best = null, bs = -1;
  // with bulk hulls at home, the small ships leave the longest runs to them and work the near coast
  let bulkHome = false;
  if (h.portLv >= 3) for (const x of h.ships) if (x.kind !== 'war' && MERCHANTMEN[x.type].bulk) { bulkHome = true; break; }
  for (let k = 0; k < 4; k++) {
    const o = pick(P);
    if (!o.alive || atWar(h.polity, o.polity) || o.blockaded > W.tick) continue;
    if (big && (o.portLv < BIG_PORT || !deepQuay(o))) continue;  // a big hull only puts in at a big port
    if (relOf(h.polity, o.polity) < -55) continue;
    // no quay there that can take a hull this size, or this cargo: the port loses the trade (and notices)
    if (!canBerth(o, D0)) { const st = portStat(o); st.turn++; st.turnCk = D0.ck || 'gen'; continue; }
    const out = exportTo(h, o, D0), back = exportTo(o, h, D0), fair = Math.min(D0.hold, D0.cap * 3);  // a part cargo worth the passage
    // a short hop to a town down the road goes cheaper by cart, pack train or lorry: the ship stays in port
    if (landBeats(h, o, D0, Math.max(out, back, fair * 0.2))) continue;
    const sc = (out > fair * 0.1 ? 1 : 0) + (back > fair * 0.1 ? 1 : 0) + Math.min(out + back, fair) / fair + rnd() * 0.5 - (bulkHome && Math.hypot(o.x - h.x, o.y - h.y) > 90 ? 0.8 : 0);
    if (sc > bs) { bs = sc; best = o; }
  }
  // not worth sailing: nothing to carry either way, or nowhere to carry it
  if (!best || bs < 0.6) { s.wait = W.tick + 60 + rint(60); return; }
  const to = portOf(best);
  if (to < 0) { s.wait = W.tick + 40; return; }
  nodeBudget = Math.max(nodeBudget, 1);
  const p0 = findShipPath(from, to, spec);
  if (p0 === PATH_BUSY) { s.wait = W.tick + 4; return; }
  if (!p0) { s.wait = W.tick + 200 + rint(200); return; }
  s.dest = best; s.mission = 'trade'; s.leg = -1;
  enterHarbour(h, s, 'load');
}
// The holds are full (or the cargo is ashore): cast off and sail for `to`. leg 0 outward, 1 homeward.
function depart(s, to, leg) {
  releaseBerth(s);
  s.state = 0; s.hph = null; s.hTown = null; s.lighter = false;
  const h = s.home;
  if (!to || !to.alive || !h || !h.alive) { if (h && h.alive) { unloadShip(s, h); idleAt(s, h); } return; }
  const r = setCourse(s, portOf(to));
  if (r === 0) { s.pend = { to, leg }; s.wait = W.tick + 4; return; }
  if (r < 0) {
    if (leg === 0) { unloadShip(s, h); idleAt(s, h); }
    else { unloadShip(s, h); s.at = s.nx = portOf(h); idleAt(s, h); }  // no way home by water: it gets there somehow
    return;
  }
  s.leg = leg;
  const D = shipDef(s);
  // coal or oil for the passage, from the bunkers of the port it leaves
  if (D.burn !== undefined) { const from = leg === 0 ? h : to === h && s.dest ? s.dest : h, need = D.cap * 0.00015 * (D.burnMul || 1) * s.path.length; from.stock[D.burn] = Math.max(0, from.stock[D.burn] - need); }
  if (leg !== 0) return;
  // the odd passage ends badly; lighthouses and better ships help
  // and the open ocean is worse than the coast, more so for small hulls and whoever can't tell where they are
  let deep = 0; for (let q = 0; q < s.path.length; q += 4) if (W.water[s.path[q]] === 2) deep++;
  const blue = 1 + Math.min(deep, 60) * 0.05 * (knows(h, 'chronometer') ? 0.3 : knows(h, 'navigation') ? 0.6 : 1);
  const lit = c => (c.count.lighthouse ? 0.5 : 1) * (c.count.beaconmole || c.count.coastguard ? 0.75 : 1);
  const wreck = (D.bulk ? 0.008 : 0.012 * blue) * (D.tough || 1) * lit(h) * (lit(to) * 0.6 + 0.4) * (knows(h, 'compass') ? 0.6 : 1) * (knows(h, 'steamship') ? 0.4 : 1) * (knows(h, 'radio') ? 0.6 : 1);
  s.doom = rnd() < wreck ? 1 + rint(Math.max(1, s.path.length - 1)) : -1;
}
// Laid up at home between voyages: out on a mooring, so the berths are free for ships that are working.
function idleAt(s, h) {
  s.state = 0; s.leg = 2; s.hph = null; s.hTown = null; s.lighter = false; s.path = null;
  moveShipTo(s, moorTile(h, s));
  s.wait = W.tick + 25 + rint(60);
}
// Dock workers are done: what happens next depends on why the ship came in.
function handlingDone(s) {
  const t = s.hTown, h = s.home, ph = s.hph;
  if (ph === 'load') {
    const o = s.dest;
    if (!o || !o.alive) { releaseBerth(s); idleAt(s, h); return; }
    loadShip(s, h, o);
    // how full the port's ships sail: owners order hulls when they're full and sell them when they sail empty (planShips)
    { const D1 = shipDef(s); h.shipFill = (h.shipFill === undefined ? 0.5 : h.shipFill) * 0.85 + Math.min(1, s.load / Math.min(D1.hold, D1.cap * 3)) * 0.15; }
    // an empty run there and back isn't worth the crew's wages and the dues: unload again and wait for trade
    if (s.load < Math.min(shipDef(s).hold, shipDef(s).cap * 3) * 0.06 && exportTo(o, h, shipDef(s)) < Math.min(shipDef(s).hold, shipDef(s).cap * 3) * 0.1) { unloadShip(s, h); releaseBerth(s); idleAt(s, h); s.wait += 60; return; }
    depart(s, o, 0);
  } else if (ph === 'unload') {
    const o = t;
    unloadShip(s, o);
    s.voyages++;
    h.act[J.SAILOR] += 3; h.pathAct[J.SAILOR] += 3;
    exchange(h, o, s);
    adjustRel(h.polity, o.polity, 0.4);
    if (!h.contacts[o.id] && o.polity !== h.polity && tn(h) > 40 && rnd() < 0.4) chronT('misc', `Sailors of ${h.name} come ashore at ${o.name}, across the water.`, o);
    h.contacts[o.id] = 1; o.contacts[h.id] = 1;
    loadShip(s, o, h);
    // the return cargo goes aboard at the same berth
    s.hph = 'reload';
    if (s.load > 0 && s.berth) s.hDone = W.tick + Math.round(clamp(s.load / (s.berth.rate * berthMul(s.berth, shipDef(s)) * (o.gang || 1)), 6, 300));
    else if (s.load > 0) s.hDone = W.tick + Math.round(clamp(s.load / (0.3 * (o.gang || 1)), 10, 300));
  } else if (ph === 'reload') {
    depart(s, h, 1);
  } else {  // home: the cargo goes ashore, then out to a mooring
    unloadShip(s, h);
    releaseBerth(s);
    idleAt(s, h);
  }
}
function shipArrive(s) {
  const h = s.home;
  s.state = 0; s.path = null;
  if (s.mission === 'carrying') { disembark(s); return; }
  if (s.kind === 'war') { s.wait = W.tick + 30; if (h && s.at === portOf(h)) navyBerth(s, h); return; }
  if (s.leg === 0 && s.dest && s.dest.alive) { enterHarbour(s.dest, s, 'unload'); return; }
  if (s.leg === 1 && h && h.alive) { enterHarbour(h, s, 'home'); return; }
  if (h && h.alive) idleAt(s, h);
  else { s.leg = 2; s.wait = W.tick + 25 + rint(60); }
}
// A warship back home lies alongside at the naval base if there is room, otherwise on a mooring.
function navyBerth(s, h) {
  const H = harbour(h);
  for (const x of H.berths) if (!x.ship && x.ck.includes('navy') && x.cls >= Math.min(3, shipCls(shipDef(s)))) { x.ship = s; s.berth = x; moveShipTo(s, x.i); return; }
  moveShipTo(s, moorTile(h, s));
}
function disembark(s) {
  const land = s.landTile >= 0 && s.landTile !== undefined ? s.landTile : (s.home ? s.home.i : 0);
  for (const p of s.pass) {
    if (!p.alive) continue;
    p.aboard = null; p.hidden = false; p.ti = p.nt = land; p.mv = 0; p.st = 0; p.wake = W.tick + rint(16);
    if (p.task === T_ABOARD) { p.task = p.army ? T_WAR : T_MIGRATE; p.step = 0; p.tgt = p.army ? p.tgt : p.town.i; }
  }
  s.pass.length = 0;
  if (s.army) { s.army.landed = true; s.army.sailing = Math.max(0, (s.army.sailing || 1) - 1); s.army = null; }
  s.mission = 'trade'; s.landing = -1; s.landTile = -1; s.ready = false;
  const r = setCourse(s, portOf(s.home), Math.max(s.home.mod.sail, 1));
  s.leg = 2;
  if (r <= 0) { s.state = 0; s.wait = W.tick + 30; }
}
// Finds water close to a site, with land beside it that really connects to the site.
function findLanding(site) {
  const w = W.w, sx = site % w, sy = (site / w) | 0, lid = W.landId[site];
  for (let r = 1; r <= 34; r += 1) {
    for (let k = 0; k < r * 5; k++) {
      const a = (k / (r * 5)) * 6.283, x = Math.round(sx + Math.cos(a) * r), y = Math.round(sy + Math.sin(a) * r);
      if (x < 2 || y < 2 || x >= w - 2 || y >= W.h - 2) continue;
      const i = y * w + x;
      if (W.water[i] || W.landId[i] !== lid) continue;
      for (let q = 0; q < 4; q++) { const n = i + NB_D[q]; if (W.water[n] === 1) return { water: n, land: i }; }
    }
  }
  return null;
}
// Takes a docked merchantman away from trading to carry people. They walk to the quay and board, then it sails.
function commandeer(t, count, army) {
  const out = [];
  let room = 0;
  for (const s of t.ships) {
    if (s.kind !== 'trade' || s.state !== 0) continue;
    if (s.mission !== 'trade' && !(army && s.army === army && s.mission === 'carry')) continue;
    out.push(s); room += shipDef(s).men;
    if (room >= count) break;
  }
  return { ships: out, room };
}
function boardShip(p, s) {
  if (s.pass.length >= shipDef(s).men) return false;
  s.pass.push(p);
  p.aboard = s; p.hidden = true; p.st = 2; p.wake = W.tick + 100000; p.task = T_ABOARD; p.step = 0;
  return true;
}
// ---- keeping ships apart: every tick each ship under way marks the water it is on (a big hull the tiles around it too) in a grid of ship ids ----
let shipGrid = null, shipGridW = null, shipHd = null, nearHd = 0;  // shipHd: which way the ship on that tile is heading, 1-9 (5 = still)
const shipGridOn = [];
const headOf = s => { const w = W.w, dx = s.nx % w - s.at % w, dy = ((s.nx / w) | 0) - ((s.at / w) | 0); return (Math.sign(dx) + 1) + (Math.sign(dy) + 1) * 3 + 1; };
function markShips(S0) {
  const w = W.w, n = W.w * W.h;
  if (!shipGrid || shipGrid.length !== n || shipGridW !== W) { shipGrid = new Int32Array(n); shipHd = new Uint8Array(n); shipGridW = W; shipGridOn.length = 0; }
  for (let k = 0; k < shipGridOn.length; k++) shipGrid[shipGridOn[k]] = 0;
  shipGridOn.length = 0;
  for (let k = 0; k < S0.length; k++) {
    const s = S0[k];
    if (s.state !== 1) continue;  // tied up at a quay: harbours hold any number
    const id = s.id + 1, hd = headOf(s);
    if (bigHull(shipDef(s))) {
      for (let q = 0; q < 8; q++) { const j = s.at + NB_X[q] + NB_Y[q] * w; if (j >= 0 && j < n && !shipGrid[j]) { shipGrid[j] = id; shipHd[j] = hd; shipGridOn.push(j); } }
    }
    shipGrid[s.at] = id; shipHd[s.at] = hd; shipGridOn.push(s.at);
    if (s.nx !== s.at) { shipGrid[s.nx] = id; shipHd[s.nx] = hd; shipGridOn.push(s.nx); }
  }
}
// Another ship on tile i, or (for a big hull, r = 1) next to it? Leaves which way it was heading in nearHd.
function shipNear(i, r, id) {
  const o = shipGrid[i];
  if (o && o !== id) { nearHd = shipHd[i]; return true; }
  if (!r) return false;
  const n = shipGrid.length;
  for (let q = 0; q < 8; q++) { const j = i + NB_X[q] + NB_Y[q] * W.w; if (j >= 0 && j < n && shipGrid[j] && shipGrid[j] !== id) { nearHd = shipHd[j]; return true; } }
  return false;
}
// ---- fairways that widen: where ships keep stopping for each other, worst of all two meeting head on, the pilots buoy a broader channel ----
let seaJam = null, seaJamW = null;
const JAM_WIDEN = 90, LANE_WIDE = 3;  // a year's worth of stand-offs before widening; at most 3 rings either side
function noteJam(s, hd) {
  if (seaJamW !== W) { seaJam = new Uint16Array(W.w * W.h); seaJamW = W; }
  const a = headOf(s) - 1, b = hd - 1;
  const ax = a % 3 - 1, ay = ((a / 3) | 0) - 1, bx = b % 3 - 1, by = ((b / 3) | 0) - 1;
  const add = ax * bx + ay * by < 0 ? 4 : 1;  // someone coming the other way and nowhere to pass counts far more than a queue
  const i = s.at;
  if (seaJam[i] < 65000) seaJam[i] += add;
}
// Once a year per water tile (from the ecology sweep): widen a jammed lane, or let an idle widening lapse.
function fairwayYear(i) {
  const sw = W.seaW, jam = seaJamW === W ? seaJam[i] : 0;
  if (jam) seaJam[i] = 0;
  if (jam >= JAM_WIDEN && W.lane[i] >= SEA_LANE && sw[i] < LANE_WIDE) widenAt(i);
  else if (sw[i] && jam < 8 && W.lane[i] < SEA_LANE * 2 && rnd() < 0.12) sw[i]--;  // the trade moved on: the buoys come up
}
function widenAt(i) {
  const w = W.w, net = W.seaNet[i], lv = ++W.seaW[i], x0 = i % w, y0 = (i / w) | 0;
  for (let dy = -lv; dy <= lv; dy++) for (let dx = -lv; dx <= lv; dx++) {
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= w || y >= W.h) continue;
    const j = y * w + x, wa = W.water[j];
    if ((wa !== 1 && wa !== 2) || W.seaNet[j] !== net || W.canal[j]) continue;
    if (!W.seaW[j]) W.seaW[j] = 1;
    if (W.lane[j] < SEA_LANE) { W.lane[j] = SEA_LANE; dirty(j); }
  }
  shipCache.clear();  // routes planned on the old channel
  let t = null, bd = 30 * 30;
  for (const o of W.towns) { if (!o.alive) continue; const ex = o.x - x0, ey = o.y - y0, d = ex * ex + ey * ey; if (d < bd) { bd = d; t = o; } }
  if (t && (t.fairY == null || year() - t.fairY > 40)) {
    t.fairY = Math.floor(year());
    chronT('misc', lv === 1 ? `Ships off ${t.name} keep stopping for each other in the narrow channel; the pilots buoy a wider fairway, one side for each way.`
      : `The fairway off ${t.name} is widened again: ${lv * 2 + 1} hulls abreast now.`, t);
  }
}
// Blocked for a few ticks: slip round the other ship through a free neighbouring stretch of open water that rejoins the route.
function sidestep(s, def) {
  const p = s.path, pi = s.pi, w = W.w, id = s.id + 1;
  if (pi + 2 >= p.length) return false;
  const back = p[pi + 2], bx = back % w, by = (back / w) | 0, net = W.seaNet[s.at], deepOK = def.sea >= 2;
  for (let pass = 0, q = 0; pass < 2; q = q === 7 ? (pass++, 0) : q + 1) {  // the buoyed fairway first, any open water after
    const j = s.at + NB_X[q] + NB_Y[q] * w;
    if (j === s.nx || j < 0 || j >= W.water.length) continue;
    if (pass === 0 && !W.seaW[j]) continue;
    const wa = W.water[j];
    if (wa !== 1 && !(wa === 2 && deepOK)) continue;
    if (W.seaNet[j] !== net || W.ice[j] > 80 || (shipGrid[j] && shipGrid[j] !== id)) continue;
    if (Math.abs(j % w - bx) > 1 || Math.abs(((j / w) | 0) - by) > 1) continue;
    const np = p.slice(); np[pi + 1] = j;  // the route may be shared through the path cache: change a copy
    s.path = np; s.nx = j;
    return true;
  }
  return false;
}
function shipTick() {
  const S0 = W.ships, tick = W.tick;
  markShips(S0);
  boatRunsTick();
  for (let k = S0.length - 1; k >= 0; k--) {
    const s = S0[k];
    if (!s) continue;  // a ship sunk earlier this tick shortens the list
    if (s.state === 0) { if (tick % 8 === (s.id & 7)) shipThink(s); continue; }
    if (s.state >= 2) { if ((tick & 3) === (s.id & 3)) harbourTick(s); continue; }  // alongside, or at anchor waiting for a berth
    const def = shipDef(s), m = s.home ? s.home.mod.speed : 1, big = bigHull(def);
    // give way: hold back while the water ahead is taken, slow down if the next stretch is; never wait for ever
    let give = 1;
    if (s.path && s.pi >= 2 && s.pi < s.path.length - 3) {
      const id = s.id + 1;
      if (shipNear(s.nx, big ? 1 : 0, id)) {
        s.block = (s.block || 0) + 1;
        noteJam(s, nearHd);
        if (s.block > 24) give = 0.5;                      // waited long enough: squeeze past
        else if (s.block >= 4 && sidestep(s, def)) give = 0.6;
        else give = 0;
      } else {
        s.block = 0;
        if (shipNear(s.path[s.pi + 2], 0, id)) give = 0.5;
      }
    }
    // on a charted lane the pilots know every current and shoal, and ships make better time; a big hull crawls in shallow water
    s.frac += hullSpd(def) * (0.8 + m * 0.2) * (W.lane[s.at] >= SEA_LANE ? 1.15 : 1) * (big && W.water[s.at] === 1 ? SHOAL_SPEED : 1) * give;
    while (s.frac >= 1 && s.path) {
      s.frac -= 1; s.pi++;
      if (s.pi >= s.path.length - 1) { s.at = s.path[s.path.length - 1]; s.nx = s.at; s.frac = 0; shipArrive(s); break; }
      s.at = s.path[s.pi]; s.nx = s.path[s.pi + 1];
      // the canal keeper won't open the gates for an enemy; lock gates take time for everyone
      if (W.canal[s.nx]) {
        if (canalClosed(s.nx, s.pol)) { s.frac = 0; s.state = 0; s.path = null; s.wait = tick + 90; if (s.kind === 'trade' && s.load > 0 && s.home) unloadShip(s, s.home); break; }
        if (Math.abs(W.elev[s.nx] - W.elev[s.at]) > 0.02) s.frac -= 1.5;
      }
      if (!W.seaNet[s.nx]) { s.frac = 0; s.state = 0; s.path = null; s.wait = tick + 8; break; }  // filled in since the route was planned
      if (W.lane[s.at] < 250) { W.lane[s.at]++; if (W.lane[s.at] === SEA_LANE) dirty(s.at); }
      if (W.ice[s.nx] > 80) { s.frac = 0; s.state = 0; s.path = null; s.wait = tick + 60; break; }  // frozen in: go back when it thaws
      if (s.pi === s.doom) {
        const h = s.home;
        if (def.cap >= 22 || s.pass.length) chronT('misc', `The ${def.name.toLowerCase()} ${s.name} of ${h.name} is lost at sea${s.load > 5 ? ' with its cargo' : ''}.`, h);
        loseShip(s, 'wrecked'); break;
      }
    }
    if (s.kind === 'war' && tick % 6 === (s.id % 6)) warshipFight(s);
  }
}
// ---- war at sea ----
const inRange = (s, o, r) => { const dx = s.at % W.w - o.at % W.w, dy = ((s.at / W.w) | 0) - ((o.at / W.w) | 0); return dx * dx + dy * dy <= r * r; };
function warshipFight(s) {
  const def = WARSHIPS[s.type];
  if (W.tick < s.cool) return;
  let best = null, bd = 1e9;
  for (const o of W.ships) {
    if (o === s || o.pol === s.pol || !atWar(s.pol, o.pol)) continue;
    const dx = s.at % W.w - o.at % W.w, dy = ((s.at / W.w) | 0) - ((o.at / W.w) | 0);
    let d = dx * dx + dy * dy;
    if (d > def.rng * def.rng) continue;
    const od = shipDef(o);
    // a submarine can only be hit by something built to hunt it; it goes for merchants first, and escorts go for it
    if (o.kind === 'war' && od.role === 'sub' && !def.asw) continue;
    if (def.role === 'sub' && o.kind === 'war' && od.asw) d += 400;
    if (def.role === 'sub' && o.kind === 'trade') d -= 200;
    if (def.asw && o.kind === 'war' && od.role === 'sub') d -= 200;
    if (d < bd) { bd = d; best = o; }
  }
  if (!best) return;
  s.cool = W.tick + (def.role === 'sub' ? 20 : def.role === 'missile' ? 16 : 12);
  best.hp -= def.atk * (0.6 + rnd() * 0.8) * (def.role === 'sub' ? 1.6 : 1);
  shot(s.at % W.w, (s.at / W.w) | 0, best.at % W.w, (best.at / W.w) | 0, def.rng > 4 ? 3 : 1);
  if (FXH) FXH.muzzle(s.at % W.w, (s.at / W.w) | 0, best.at % W.w, (best.at / W.w) | 0, def.atk > 30);
  if (best.hp <= 0) {
    const was = shipDef(best), own = best.home;
    W.navalLoss = (W.navalLoss || 0) + 1;
    const cargo = best.load;
    if (cargo > 0) for (let r = 0; r < R.N; r++) s.home.stock[r] += best.cargo[r] * 0.5;
    if (was.hp >= 60 || best.pass.length) chronT('war', `The ${def.name.toLowerCase()} ${s.name} of ${s.pol.name} sinks the ${was.name.toLowerCase()} ${best.name}${best.pass.length ? ' with everyone aboard' : ''}.`, own || s.home);
    adjustRel(s.pol, best.pol, -2);
    const war = s.pol.warsWith[best.pol.id];
    if (war) war.sunk = (war.sunk || 0) + 1;
    pathXP(s.pol, 'mar', 30);
    loseShip(best, 'sunk');
  }
}
// What each kind of warship does once it's in position, besides fight other ships.
function warshipRole(s, tgt) {
  const def = WARSHIPS[s.type], tick = W.tick;
  if (def.role === 'raid' && tgt) {
    // longships land, burn and carry off
    for (let q = 0; q < 3; q++) {
      if (!tgt.fields.length) break;
      const f = pick(tgt.fields);
      if (W.stage[f.i]) { W.stage[f.i] = 0; dirty(f.i); s.home.stock[R.FOOD] += 5; if (FXH) FXH.burn(f.i % W.w, (f.i / W.w) | 0); }
    }
    const a = Math.min(tgt.stock[R.GOLD] * 0.1, 6); tgt.stock[R.GOLD] -= a; s.home.stock[R.GOLD] += a;
    tgt.warYear = year();
    if (rnd() < 0.2 && tgt.members.length) { const v = tgt.members[rint(tgt.members.length)]; if (v && !v.army) killPerson(v, 'killed by raiders from the sea'); }
    if (tn(tgt) > 40 && !(tgt.raidNote > year() - 25)) { tgt.raidNote = year(); chronT('war', `Longships of ${s.pol.name} come ashore at ${tgt.name}, burning what they can't carry.`, tgt); }
    return;
  }
  if (def.role === 'carrier' && tick % 80 < 20) {
    // planes off the deck: any battle in reach, otherwise the port itself
    for (const B of W.battles) {
      if (Math.hypot(B.x - s.at % W.w, B.y - ((s.at / W.w) | 0)) > 40) continue;
      const E = atWar(s.pol, B.sA.pol) ? B.sA : atWar(s.pol, B.sB.pol) ? B.sB : null;
      if (!E) continue;
      const S0 = E === B.sA ? B.sB : B.sA;
      if (FXH) FXH.plane(s.at % W.w, (s.at / W.w) | 0, E.x, E.y, s.pol.color, false);
      for (let q = 0; q < 3; q++) { const u = E.units.length ? E.units[rint(E.units.length)] : null; if (u) shellHit(B, E, S0, u.x + (rnd() - 0.5) * 5, u.y + (rnd() - 0.5) * 5, 60); }
      return;
    }
    if (tgt && tgt.alive) { if (FXH) { FXH.plane(s.at % W.w, (s.at / W.w) | 0, tgt.x, tgt.y, s.pol.color, false); FXH.boom(tgt.x + rint(9) - 4, tgt.y + rint(9) - 4, 2); } if (tgt.fortHP > 0) tgt.fortHP = Math.max(0, tgt.fortHP - 6); }
    return;
  }
  // heavy guns and missiles reach over the water and start taking the town apart
  if ((def.bomb || def.role === 'missile') && tgt && tgt.alive && tick % 40 < 8) {
    if (tgt.fortHP > 0) tgt.fortHP = Math.max(0, tgt.fortHP - def.atk * 0.2);
    shot(s.at % W.w, (s.at / W.w) | 0, tgt.x, tgt.y, 3);
    if (rnd() < 0.08) { const b = tgt.blds.length ? tgt.blds[rint(tgt.blds.length)] : null; if (b && b.type !== 'hearth') { if (FXH) FXH.boom(b.x, b.y, 2); removeBuilding(b); } }
  }
}
function warshipThink(s) {
  const h = s.home;
  if (W.tick < s.wait) return;
  // sail on enemy shipping, otherwise guard the home port
  let tgt = null, bd = 1e9;
  for (const k in h.polity.warsWith) {
    const foe = W.polities[+k];
    if (!foe || !foe.alive) continue;
    for (const o of W.towns) {
      if (o.polity !== foe || !o.portLv) continue;
      const d = Math.hypot(o.x - h.x, o.y - h.y);
      if (d < bd && d < 60 * h.mod.seaRange) { bd = d; tgt = o; }
    }
  }
  if (tgt) {
    const to = portOf(tgt);
    if (to >= 0 && !inRangeTile(s.at, to, 5)) {
      const near = to;
      const r = setCourse(s, near, Math.max(h.mod.sail, 1));
      if (r === 1) { s.dest = tgt; s.mission = 'blockade'; return; }
    }
    if (to >= 0) {
      if (WARSHIPS[s.type].role !== 'sub') tgt.blockaded = W.tick + 60;
      warshipFight(s);
      s.wait = W.tick + 20;
      warshipRole(s, tgt);
      return;
    }
  }
  const home = portOf(h);
  if (home >= 0 && s.at !== home && !inRangeTile(s.at, home, 2)) { setCourse(s, home, Math.max(h.mod.sail, 1)); s.mission = 'guard'; return; }
  warshipFight(s);
  s.wait = W.tick + 40;
}
const inRangeTile = (a, b, r) => { const dx = a % W.w - b % W.w, dy = ((a / W.w) | 0) - ((b / W.w) | 0); return dx * dx + dy * dy <= r * r; };

// ---- keeping trains apart: block signalling. Each running train marks the track under its four cars; a train holds at the signal
// while the next stretch ahead is taken, except where a doubled line lets trains going opposite ways pass. After a while it goes anyway. ----
let trainGrid = null, trainGridW = null;
const trainGridOn = [], _thx = [], _thy = [];
function markTrains() {
  const n = W.w * W.h, R0 = W.rails;
  if (!trainGrid || trainGrid.length !== n || trainGridW !== W) { trainGrid = new Int32Array(n); trainGridW = W; trainGridOn.length = 0; }
  for (let k = 0; k < trainGridOn.length; k++) trainGrid[trainGridOn[k]] = 0;
  trainGridOn.length = 0;
  for (let k = 0; k < R0.length; k++) {
    const r = R0[k];
    if (!r.done) continue;
    const L = r.path.length - 1, f0 = clamp(Math.round(r.pos), 0, L), f1 = clamp(f0 + r.dir, 0, L);
    _thx[k] = r.path[f1] % W.w - r.path[f0] % W.w; _thy[k] = ((r.path[f1] / W.w) | 0) - ((r.path[f0] / W.w) | 0);
    for (let q = 0; q <= 4; q++) {
      const j = r.path[clamp(Math.round(r.pos - r.dir * q), 0, L)];
      if (!trainGrid[j]) { trainGrid[j] = k + 1; trainGridOn.push(j); }
    }
  }
}
function trainHeld(r, k) {
  const L = r.path.length - 1;
  for (let q = 1; q <= 3; q++) {
    const ix = Math.round(r.pos + r.dir * q);
    if (ix < 0 || ix > L) break;
    const j = r.path[ix], o = trainGrid[j];
    if (!o || o === k + 1) continue;
    // on double track a train coming the other way keeps to its own line
    if (W.rail[j] === 2 && _thx[o - 1] * _thx[k] + _thy[o - 1] * _thy[k] < 0) continue;
    r.hold = (r.hold || 0) + 1;
    if (r.hold > 45) return false;  // the signal has been red too long: proceed with caution
    return true;
  }
  r.hold = 0;
  return false;
}
// ---- airliners: flights between towns with a finished airport or airfield ----
// A flight in W.planes is plain data: the two towns, the plane kind, distance flown `d`, and its route as points `p` (x,y pairs in tiles)
// with running lengths `c`: apron, taxiway, runway start, lift-off, climb-out, final approach, touchdown, roll-out, taxiway, apron.
// cruise: tiles a tick at height. alt: cruising height in screen pixels at zoom 1. climb: height gained per tile flown. cap: freight aboard.
const PLANE_KIND = [
  // cap: freight in the belly, in loads (some 60 kg each): a propliner a couple of tonnes, a jet's hold ten or fifteen, a widebody's thirty-odd
  { name: 'propliner', cruise: 0.55, alt: 15, climb: 1.5, cap: 40 },
  { name: 'jetliner', cruise: 0.95, alt: 24, climb: 1.7, cap: 220 },
  { name: 'widebody', cruise: 1.05, alt: 28, climb: 1.4, cap: 560 },
];
const FL_RUN = 2, FL_UP = 3, FL_FIX = 5, FL_DOWN = 6, FL_STOP = 7, HOLD_LAP = 30, HOLD_STEP = 6.2832 / HOLD_LAP;
let airList = [], airListT = -1e9, airListW = null;
// Every working airport and airfield, with its runway (the strip along the bottom of the sprite) and the apron where planes park.
function airportsNow() {
  if (airListW === W && W.tick - airListT < 60 && W.tick >= airListT) return airList;
  airListW = W; airListT = W.tick; airList = [];
  for (const t of W.towns) {
    if (!t.alive || t.nomad || !(t.count.airport || t.count.airfield)) continue;
    let b = null;
    for (const q of t.blds) if (q.done && !q.ruin && (q.type === 'airport' || (q.type === 'airfield' && !b))) { b = q; if (q.type === 'airport') break; }
    if (!b) continue;
    const big = b.type === 'airport';
    airList.push(big
      ? { t, big, x0: b.x + 3 / 12, x1: b.x + 33 / 12, ry: b.y + 29.5 / 12, ax: b.x + 2.3, ay: b.y + 1.92, bx: b.x + 1.15 }
      : { t, big, x0: b.x + 2 / 12, x1: b.x + 22 / 12, ry: b.y + 17.5 / 12, ax: b.x + 1.42, ay: b.y + 0.9, bx: -1 });
  }
  return airList;
}
// How busy a field is: bigger towns and later ages fly more; an airfield sees a fraction of an airport's traffic.
function airTraffic(ap) {
  const t = ap.t;
  const lv = knows(t, 'masstourism') ? 2.2 : knows(t, 'jetliners') ? 1.6 : knows(t, 'airlines') ? 1.1 : 0.6;
  return lv * (ap.big ? 1 : 0.45) * clamp(Math.sqrt(tn(t) / 400), 0.5, 2.5);
}
// How far a plane from here can go: propliners hop between neighbours, airliners reach further, jets go anywhere from a real airport.
function airRange(ap) {
  const t = ap.t;
  if (!ap.big) return knows(t, 'jetliners') ? 110 : 70;
  return knows(t, 'jetliners') ? 9999 : knows(t, 'airlines') ? 170 : 110;
}
const _fcand = [], _fw = [];
function launchFlight(A) {
  let tot = 0;
  for (const ap of A) tot += airTraffic(ap);
  if (rnd() > Math.min(0.9, 0.08 + tot * 0.05)) return;
  let r = rnd() * tot, a = A[0];
  for (const ap of A) { r -= airTraffic(ap); if (r <= 0) { a = ap; break; } }
  const ta = a.t, ra = airRange(a);
  _fcand.length = 0; _fw.length = 0; tot = 0;
  for (const o of A) {
    const tb = o.t;
    if (o === a || !tb.alive) continue;
    const d = Math.hypot(tb.x - ta.x, tb.y - ta.y);
    if (d < 12 || d > Math.min(ra, airRange(o))) continue;
    if (ta.polity !== tb.polity && (atWar(ta.polity, tb.polity) || relOf(ta.polity, tb.polity) < -40)) continue;
    // home routes and trading partners fill the timetable; strangers get the odd flight
    let link = ta.polity === tb.polity ? 1 : 0.3;
    if (ta.partners.includes(tb) || (ta.seaPartners && ta.seaPartners.includes(tb))) link += 0.6;
    if (ta.contacts[tb.id]) link += 0.15;
    const w = link * Math.sqrt(tn(ta) * tn(tb)) / (30 + d) * (o.big ? 1 : 0.5);
    _fcand.push(o); _fw.push(w); tot += w;
  }
  if (!_fcand.length) return;
  r = rnd() * tot;
  let b = _fcand[0];
  for (let k = 0; k < _fcand.length; k++) { r -= _fw[k]; if (r <= 0) { b = _fcand[k]; break; } }
  const tb = b.t, dist = Math.hypot(tb.x - ta.x, tb.y - ta.y);
  const jet = knows(ta, 'jetliners');
  const kind = !jet || !a.big || !b.big ? (jet && dist > 40 ? 1 : 0) : (dist > 150 || tn(ta) + tn(tb) > 3000) && rnd() < 0.7 ? 2 : 1;
  // take off and land into the direction of travel
  const east = tb.x >= ta.x, sa = east ? a.x0 : a.x1, ea = east ? a.x1 : a.x0, ua = east ? 1 : -1;
  const xa = lerp(sa, ea, 0.8), cx = xa + ua * 4;
  const inE = tb.x + 0.5 >= cx, sb = inE ? b.x0 : b.x1, eb = inE ? b.x1 : b.x0, ub = inE ? 1 : -1;
  const xb = lerp(sb, eb, 0.12), rb = lerp(sb, eb, 0.85);
  const p = [a.ax, a.ay, sa, a.ay, sa, a.ry, xa, a.ry, cx, a.ry - 0.3, xb - ub * 5, b.ry, xb, b.ry, rb, b.ry, rb, b.ay, b.ax, b.ay];
  const c = [0];
  for (let k = 2; k < p.length; k += 2) c.push(c[c.length - 1] + Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]));
  // a little freight in the hold, paid for on landing
  const K = PLANE_KIND[kind], cap = K.cap;
  let res = bestCargo(ta, tb, cap), amt = 0;
  if (res >= 0) { amt = Math.min(cap, ta.stock[res] - wantOf(ta, res) * 0.9); if (amt > 0) ta.stock[res] -= amt; else { res = -1; amt = 0; } }
  // eastbound and westbound traffic cruise at different heights, and every other flight a little higher again
  W.planes.push({ a: ta, b: tb, kind, d: 0, p, c, res, amt, pol: ta.polity.id, lay: (east ? 0 : 5) + (W.planes.length & 1) * 2.5, hold: 0, stack: 0, ox: 0, oy: 0 });
  ta.airLast = W.tick;
  if (!W.firstFlight) { W.firstFlight = 1; chronT('tech', `The first passenger flight takes off from ${ta.name}, bound for ${tb.name}.`, ta); }
  if (kind > 0 && !W.firstJet) { W.firstJet = 1; chronT('tech', `A jet airliner flies from ${ta.name} to ${tb.name}, faster than anyone has ever travelled for a fare.`, ta); }
}
// Height above the ground at distance d along the route: climbs after lift-off, holds cruise, descends to touchdown.
function flightAlt(f, d) {
  const K = PLANE_KIND[f.kind], c = f.c;
  if (d <= c[FL_UP] || d >= c[FL_DOWN]) return 0;
  return Math.min(K.alt + (f.lay || 0), (d - c[FL_UP]) * K.climb, (c[FL_DOWN] - d) * K.climb * 0.8) + (f.hold > 0 ? f.stack * 5 : 0);
}
// Is the runway at town t taken: someone rolling for take-off, or on short final or rolling out after landing?
// An arriving plane also keeps its distance behind another one already on final (gap: tiles before touchdown).
function runwayBusy(t, f, gap) {
  for (const g of W.planes) {
    if (g === f || g.p === undefined) continue;
    const c = g.c;
    if (g.a === t && g.d >= c[FL_RUN] - 0.06 && g.d < c[FL_UP] + 1) return true;
    if (g.b === t && g.d >= c[FL_DOWN] - gap && g.d < c[FL_STOP]) return true;
  }
  return false;
}
// Everything the renderer needs: where the plane is, how high, which way it points. A plane in a hold circles its final approach fix.
const _fpA = { x: 0, y: 0 }, _fpB = { x: 0, y: 0 };
function flightPose(f, out) {
  const d = f.d, c = f.c, p = f.p;
  flightAt(f, Math.max(0, d - 0.6), _fpA); flightAt(f, d + 0.6, _fpB); flightAt(f, d, out);
  out.a = Math.atan2(_fpB.y - _fpA.y, _fpB.x - _fpA.x);
  if (f.hold > 0 && Math.abs(d - c[FL_FIX]) < 0.01) {
    const ph = f.hold * HOLD_STEP, ub = p[FL_DOWN * 2] >= p[FL_FIX * 2] ? 1 : -1;
    out.x += ub * 1.2 * Math.sin(ph); out.y += 1.2 * (1 - Math.cos(ph)); out.a = Math.atan2(Math.sin(ph), ub * Math.cos(ph));
  }
  out.x += f.ox || 0; out.y += f.oy || 0;
  out.h = flightAlt(f, d);
  return out;
}
// Where on the route a flight is (tiles); used by the renderer.
function flightAt(f, d, out) {
  const c = f.c, p = f.p;
  if (d <= 0) { out.x = p[0]; out.y = p[1]; return out; }
  let k = 1;
  while (k < c.length - 1 && c[k] < d) k++;
  const L = c[k] - c[k - 1], u = L > 0 ? clamp((d - c[k - 1]) / L, 0, 1) : 1;
  out.x = lerp(p[k * 2 - 2], p[k * 2], u); out.y = lerp(p[k * 2 - 1], p[k * 2 + 1], u);
  return out;
}
function landFlight(f) {
  const a = f.a, b = f.b;
  if (!b.alive) return;
  b.airLast = W.tick;
  if (f.res >= 0 && f.amt > 0) { b.stock[f.res] += f.amt; if (a.alive && a !== b) payForGoods(b, a, f.res, f.amt); }
  if (!a.alive) return;
  if (rnd() < 0.25) meet(a, b, null);
  // visitors spend their own money where there is something to see
  const ca = a.polity.cur, cb = b.polity.cur;
  if (b.tourists > 0 && a.polity !== b.polity && ca && cb && ca.kind >= 2 && cb.kind >= 2 && a.cash > 0) {
    const v = a.cash * 0.0004 * (f.kind + 1), got = v * fx(a.polity, b.polity);
    a.cash -= v; b.cash += got;
    ca.tradeBal -= v; cb.tradeBal += got;
    flow(a.polity, b.polity, 'trade', v * ca.value);
  }
}
// Two planes in the air that would overlap on screen (height included) ease apart sideways; the nudge fades once they are clear.
const _sx = [], _sy = [], _sh = [];
const _spose = { x: 0, y: 0, a: 0, h: 0 };
function airSpread(P) {
  const n = P.length;
  for (let k = 0; k < n; k++) {
    const f = P[k];
    f.ox *= 0.94; f.oy *= 0.94;
    flightPose(f, _spose);
    if (_spose.h < 3) { f.ox *= 0.6; f.oy *= 0.6; }
    _sx[k] = _spose.x; _sy[k] = _spose.y - _spose.h / TS; _sh[k] = _spose.h;
  }
  for (let i = 0; i < n; i++) {
    if (_sh[i] < 3) continue;
    for (let j = i + 1; j < n; j++) {
      if (_sh[j] < 3) continue;
      let dx = _sx[j] - _sx[i], dy = _sy[j] - _sy[i];
      const d2 = dx * dx + dy * dy;
      if (d2 > 2.4) continue;
      const d = Math.max(Math.sqrt(d2), 0.05);
      if (d2 < 1e-4) { dx = 0; dy = 1; }
      const a = P[i], b = P[j], push = 0.12 * (1.55 - d);
      a.ox -= dx / d * push; a.oy -= dy / d * push; b.ox += dx / d * push; b.oy += dy / d * push;
      for (const g of [a, b]) { const m = Math.hypot(g.ox, g.oy); if (m > 1.4) { g.ox *= 1.4 / m; g.oy *= 1.4 / m; } }
    }
  }
}
// Called every other tick: move what's flying, and now and then send off another flight.
function airTick() {
  const P = W.planes || (W.planes = []);
  for (let k = P.length - 1; k >= 0; k--) {
    const f = P[k];
    if (f.p === undefined) { P.splice(k, 1); continue; }  // a flight from an older save
    const c = f.c, d = f.d, K = PLANE_KIND[f.kind];
    let v;
    if (d < c[FL_RUN] || d >= c[FL_STOP]) v = 0.07;                                                   // taxiing
    else if (d < c[FL_UP]) v = 0.15 + 0.35 * (d - c[FL_RUN]) / Math.max(0.1, c[FL_UP] - c[FL_RUN]);  // take-off roll
    else if (d >= c[FL_DOWN]) v = 0.45 - 0.33 * (d - c[FL_DOWN]) / Math.max(0.1, c[FL_STOP] - c[FL_DOWN]);  // landing roll
    else v = 0.42 + (K.cruise - 0.42) * Math.min(1, flightAlt(f, d) / K.alt);                        // slow near the ground
    const nd = d + v * 2;
    // one plane on a runway at a time: hold short on the taxiway, or circle the approach fix until it's clear (never for ever)
    if (d < c[FL_RUN] - 0.06 && nd >= c[FL_RUN] - 0.06) {
      if (f.hold < 90 && runwayBusy(f.a, f, 2)) { f.hold++; continue; }
      f.hold = 0;
    } else if (d < c[FL_FIX] && nd >= c[FL_FIX]) {
      if (f.hold === 0 && runwayBusy(f.b, f, 3.5)) {
        let n = 0; for (const g of P) if (g !== f && g.b === f.b && g.hold > 0 && Math.abs(g.d - g.c[FL_FIX]) < 0.01) n++;
        f.stack = n; f.hold = 1; f.d = c[FL_FIX] - 0.001; continue;
      }
      if (f.hold > 0) {
        f.hold++;
        if (f.hold % HOLD_LAP !== 0 || (f.hold < HOLD_LAP * 3 && runwayBusy(f.b, f, 3.5))) continue;  // finish the lap first
        f.hold = 0; f.stack = 0;
      }
    }
    f.d = nd;
    if (f.d >= c[c.length - 1]) { P.splice(k, 1); landFlight(f); }
  }
  airSpread(P);
  if (W.tick % 6 !== 0) return;
  const A = airportsNow();
  if (A.length < 2 || P.length >= Math.min(36, 2 + A.length * 2)) return;
  launchFlight(A);
}
