'use strict';
// Shared constants, seeded RNG, noise and A* pathfinding. Plain scripts, so the game opens with a double click.

const TPY = 240;             // ticks per year
const TPSEASON = 60;
const TS = 6;                // terrain pixels per tile
const SAIL_COST = 6;

let W = null;                // the world: plain data only, so it can be saved with structured clone
let RS = 1;                  // rng state
let onDirty = null;          // renderer hook: a tile's appearance changed
let onLandChange = null;     // renderer hook: a tile became land
// The tiles on screen (plus a margin), set by the renderer each frame. Work that only shows, like street crowding, is done only in here.
// Empty until something draws, so a run with no screen skips that work everywhere.
const VIEW = { x0: 0, y0: 0, x1: -1, y1: -1 }, VIEW_MARGIN = 12, FAR_Z = 1;
const inView = i => {
  let x = i % W.w; const y = (i / W.w) | 0;
  if (W.wrap) { if (x < VIEW.x0) x += W.w; else if (x > VIEW.x1) x -= W.w; }  // the view can run over the date line
  return x >= VIEW.x0 && x <= VIEW.x1 && y >= VIEW.y0 && y <= VIEW.y1;
};
// On a world that wraps east to west (the Earth map), the shorter way from column ax to column bx, across the seam if need be.
const wdx = (ax, bx) => { let d = bx - ax; if (W.wrap) { const w = W.w; if (d > w / 2) d -= w; else if (d < -w / 2) d += w; } return d; };
// The tile one step from i in direction k; on a wrapping world a step off one side comes in on the other.
const stepWrap = (i, k) => { const ni = i + NB_D[k]; if (!W.wrap || !NB_X[k]) return ni; const x = i % W.w; return x === 0 && NB_X[k] < 0 ? ni + W.w : x === W.w - 1 && NB_X[k] > 0 ? ni - W.w : ni; };
let FXH = null;              // renderer hook: sparks, blood and smoke. Stays null without a screen, so the simulation never depends on it.

function rnd() {
  RS = (RS + 0x6D2B79F5) | 0;
  let t = Math.imul(RS ^ (RS >>> 15), 1 | RS);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rint = n => Math.floor(rnd() * n);
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dirty = i => { if (onDirty) onDirty(i); };
// How many live in a town, counting those simulated as a crowd rather than one by one.
const tn = t => t.members.length + t.folk;
const worldPop = () => W.people.length + (W.folkN || 0);

function hash2(x, y, s) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s | 0, 2147483647 - 18);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function makeNoise(seed) {
  const saved = RS; RS = seed | 0;
  const perm = new Uint8Array(512), gx = new Float32Array(256), gy = new Float32Array(256);
  const p = []; for (let i = 0; i < 256; i++) p.push(i);
  for (let i = 255; i > 0; i--) { const j = rint(i + 1); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  for (let i = 0; i < 256; i++) { const a = rnd() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
  RS = saved;
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = perm[X + perm[Y]], b = perm[X + 1 + perm[Y]], c = perm[X + perm[Y + 1]], d = perm[X + 1 + perm[Y + 1]];
    const n00 = gx[a] * xf + gy[a] * yf, n10 = gx[b] * (xf - 1) + gy[b] * yf;
    const n01 = gx[c] * xf + gy[c] * (yf - 1), n11 = gx[d] * (xf - 1) + gy[d] * (yf - 1);
    const u = fade(xf), v = fade(yf);
    return (n00 + (n10 - n00) * u + (n01 - n00) * v + (n00 - n10 - n01 + n11) * u * v) * 1.5;
  };
}
function fbm(n, x, y, oct, lac = 2, gain = 0.5) {
  let s = 0, a = 1, t = 0;
  for (let i = 0; i < oct; i++) { s += n(x, y) * a; t += a; a *= gain; x = x * lac + 13.7; y = y * lac + 7.3; }
  return s / t;
}

// ---- A* over the tile grid. mode 0: land only, 1: + shallow water, 2: + open ocean ----
const PATH_BUSY = 1;
let gs, cf, stampA, heapI, heapF, heapN = 0, sid = 2, nodeBudget = 0;
let pathCache = new Map();
// Ships keep their routes much longer than people do: ports don't move, and the sea only changes when land or canals do.
let shipCache = new Map();
const NB_X = [1, -1, 0, 0, 1, 1, -1, -1], NB_Y = [0, 0, 1, -1, 1, -1, 1, -1];
let NB_D = null, RT_D = null;  // RT_D[k]: the tile to the right of a step in direction k

// ---- ice you can walk on: a lake, a river or a strait frozen thick enough is a road until the thaw (snow.js grows and melts W.ice) ----
// ICE_WALK: bears a walker; ICE_SAFE: what the careful wait for. Below ICE_SAFE a path pays extra, so people keep to the thick ice.
const ICE_WALK = 90, ICE_SAFE = 130, ICE_COST = 12;  // ice is drawn frozen past 80: what looks frozen bears a walker
let ICE_N = 0;               // walkable ice tiles just now: when there are none, pathing does no ice checks at all
let iceLink = null;          // landId -> the root of the landmasses the ice joins to it (null: no ice touches any shore)
let iceStale = true, iceLinkT = -1e9, iceRouteT = 0, iceClearT = -1e9, iceSeen = null;
const iceJoined = (a, b) => a === b || (iceLink !== null && a >= 0 && b >= 0 && iceLink.has(a) && iceLink.get(a) === iceLink.get(b));
// a tile someone on foot may stand on: dry ground, or water frozen thick enough
const footOK = i => W.water[i] === 0 || (ICE_N > 0 && W.water[i] !== 3 && W.ice[i] >= ICE_WALK);
// whether a whole people would trust this route: any ice on it thick enough to hold them all the way over
const iceSafe = path => { if (!ICE_N) return true; for (let k = 0; k < path.length; k++) { const j = path[k]; if (W.water[j] && W.ice[j] < ICE_SAFE) return false; } return true; };
// snow.js calls this when a tile's ice crosses ICE_WALK. A thaw makes any cached ice route a lie, so the cache goes (not more than every 20 ticks).
function iceTurn(up) {
  ICE_N += up ? 1 : -1; if (ICE_N < 0) ICE_N = 0;
  iceStale = true;
  if (!up && iceRouteT) iceRouteT = -1;  // a route over the ice is stored somewhere: drop the cache when allowed
}
// Once a tick (stepWorld): keep the cache honest after a thaw, and which shores the ice joins, at most every 60 ticks and only when it changed.
function iceTick() {
  if (iceRouteT === -1 && W.tick - iceClearT > 20) {
    pathCache.clear(); iceClearT = W.tick; iceRouteT = 0;
    // a host marching over a lake that's going soft plans a new road (war.js plans it again when the old one is gone)
    if (W.armies) for (const a of W.armies) if (a.path && a.phase === 'march') for (let k = 0; k < a.path.length; k++) { const j = a.path[k]; if (W.water[j] && W.ice[j] < ICE_WALK) { a.path = null; break; } }
  }
  if ((iceStale && W.tick - iceLinkT >= 60) || W.tick % (TPY * 2) === 77) iceRelink();  // and now and then regardless, so the count never drifts
}
// Flood each sheet of walkable ice and join every landmass it touches. Also recounts ICE_N, so it never drifts.
function iceRelink() {
  iceStale = false; iceLinkT = W.tick; iceLink = null;
  const ice = W.ice, water = W.water, lid = W.landId, n = ice ? ice.length : 0;
  if (!n) { ICE_N = 0; return; }
  if (!iceSeen || iceSeen.length !== n) iceSeen = new Uint8Array(n); else iceSeen.fill(0);
  const seen = iceSeen, par = new Map(), st = [];
  const find = a => { while (par.get(a) !== a) a = par.get(a); return a; };
  let cnt = 0;
  for (let i = 0; i < n; i++) {
    if (seen[i] || ice[i] < ICE_WALK || !water[i] || water[i] === 3) continue;
    let root = -1; st.length = 0; st.push(i); seen[i] = 1;
    while (st.length) {
      const c = st.pop(); cnt++;
      for (let k = 0; k < 8; k++) {
        const j = c + NB_D[k];
        if (j < 0 || j >= n) continue;
        if (!water[j]) {
          const L = lid[j]; if (L < 0) continue;
          if (!par.has(L)) par.set(L, L);
          const r = find(L);
          if (root < 0) root = r; else if (r !== root) par.set(r, root);
        } else if (!seen[j] && water[j] !== 3 && ice[j] >= ICE_WALK) { seen[j] = 1; st.push(j); }
      }
    }
  }
  ICE_N = cnt;
  if (par.size > 1) { iceLink = new Map(); for (const L of par.keys()) iceLink.set(L, find(L)); }
}
function initPathing() {
  const n = W.w * W.h;
  gs = new Float32Array(n); cf = new Int32Array(n); stampA = new Int32Array(n);
  heapI = new Int32Array(n * 2 + 16); heapF = new Float32Array(n * 2 + 16);
  sid = 2; pathCache = new Map(); shipCache = new Map();
  NB_D = NB_X.map((dx, k) => dx + NB_Y[k] * W.w);
  RT_D = NB_X.map((dx, k) => -NB_Y[k] + dx * W.w);
  if (!W.seaW) W.seaW = new Uint8Array(n);
  if (!W.rtype || W.rtype.length !== n) W.rtype = new Uint8Array(n);  // road types (roads.js)
  iceRouteT = 0; iceClearT = -1e9; iceRelink();
}
function hPush(i, f) {
  let k = heapN++;
  while (k > 0) {
    const p = (k - 1) >> 1;
    if (heapF[p] <= f) break;
    heapI[k] = heapI[p]; heapF[k] = heapF[p]; k = p;
  }
  heapI[k] = i; heapF[k] = f;
}
function hPop() {
  const top = heapI[0];
  heapN--;
  if (heapN > 0) {
    const i = heapI[heapN], f = heapF[heapN];
    let k = 0;
    for (;;) {
      let c = k * 2 + 1;
      if (c >= heapN) break;
      if (c + 1 < heapN && heapF[c + 1] < heapF[c]) c++;
      if (heapF[c] >= f) break;
      heapI[k] = heapI[c]; heapF[k] = heapF[c]; k = c;
    }
    heapI[k] = i; heapF[k] = f;
  }
  return top;
}
// How well each way of travelling does on each kind of road, as a step cost. Lower is faster. class 0 is on foot and just uses the land's own cost.
// classes: 1 pack animal, 2 wagon, 3 carriage or bicycle, 4 tram or bus, 5 car, 6 electric car, 7 self-driving pod.
const ROAD_SPEED = [null, [99, 7.5, 6, 4.5, 4], [99, 99, 4.8, 3.6, 3], [99, 99, 4.2, 3, 2.4], [99, 99, 99, 2.4, 1.8], [99, 99, 99, 2, 1.3], [99, 99, 99, 1.6, 1], [99, 99, 99, 1.2, 0.8]];
// Climbing is slow and coming down a steep slope is not free either, so a path bends round a mountain unless the way round is much longer.
// Rolling country costs nothing extra: only a real climb does.
const CLIMB_UP = 160, CLIMB_DOWN = 45, CLIMB_FREE = 0.03;
const climbOf = d => d > CLIMB_FREE ? (d - CLIMB_FREE) * CLIMB_UP : d < -CLIMB_FREE * 1.5 ? (-d - CLIMB_FREE * 1.5) * CLIMB_DOWN : 0;
const climbCost = (a, b) => climbOf(W.elev[b] - W.elev[a]);
// How steep the ground is here: the biggest drop to a neighbour.
function slopeAt(i) {
  const e = W.elev, w = W.w; let m = 0;
  const water = W.water, n = e.length, ei = e[i];
  for (let k = 0; k < 4; k++) {  // west, east, north, south: no list to build each call
    const j = k === 0 ? i - 1 : k === 1 ? i + 1 : k === 2 ? i - w : i + w;
    if (j < 0 || j >= n || water[j]) continue;
    const d = ei - e[j], a = d < 0 ? -d : d; if (a > m) m = a;
  }
  return m;
}
// How many people a tile can comfortably have on it, by what's been built there.
const TILE_CAP = [5, 7, 11, 18, 30];
const NO_PATH = new Int32Array(0);
// Returns an Int32Array of tiles, null when unreachable, or PATH_BUSY when this tick's search budget ran out.
// People don't go through buildings or walls, except the one they're leaving and the one they're heading for. mode + 8 ignores that, for anyone truly boxed in.
function findPath(a, b, mode0, cls0) {
  if (a === b) return new Int32Array([a]);
  const water = W.water, cost = W.cost, w = W.w, occ = W.occ, road = W.road, tileN = W.tileN, bAt = W.bAt, rail = W.rail, elev = W.elev, rtype = W.rtype;
  const cls = cls0 || 0, loose = mode0 >= 8, mode = mode0 & 7, rc = cls ? ROAD_SPEED[cls & 7] : null, onRail = cls >= 8;
  if (water[b] === 3) return null;
  if (mode === 0 && water[a] === 0 && water[b] === 0 && W.landId[a] !== W.landId[b] && !iceJoined(W.landId[a], W.landId[b])) return null;
  const ice = W.ice, onIce = ICE_N > 0 && mode < 2;  // on foot (or by boat over open water), frozen water bears a walker
  if (mode === 0 && water[b] && !(onIce && ice[b] >= ICE_WALK)) return null;  // open water on foot: no search could end there
  const key = ((a * 1048576 + b) * 16 + mode0) * 16 + cls;
  const hit = pathCache.get(key);
  if (hit) return hit.length ? hit : null;
  if (nodeBudget <= 0) return PATH_BUSY;
  const startB = occ[a] === 1 ? bAt.get(a) : null, goalB = occ[b] === 1 ? bAt.get(b) : null;
  // a little greedy on purpose: people take a good way, not the perfect one, and the search stays small
  const hMul = rc ? 7.5 : 11;

  const bx = b % w, by = (b / w) | 0;
  const open = sid, closed = sid + 1; sid += 2;
  if (sid > 2000000000) { stampA.fill(0); sid = 2; }
  heapN = 0;
  gs[a] = 0; stampA[a] = open; cf[a] = -1;
  hPush(a, 0);
  let n = 0, found = false;
  // nobody searches the whole continent to cross the street: if it isn't found about where it should be, it's walled off
  const reach = Math.max(Math.abs(a % w - bx), Math.abs(((a / w) | 0) - by));
  const maxN = Math.min(40000, 500 + reach * reach * 8);
  while (heapN > 0) {
    const cur = hPop();
    if (stampA[cur] === closed) continue;
    stampA[cur] = closed;
    if (cur === b) { found = true; break; }
    if (++n > maxN) break;
    const g0 = gs[cur], curDry = water[cur] === 0, curLand = curDry || (onIce && mode < water[cur] && ice[cur] >= ICE_WALK);
    for (let k = 0; k < 8; k++) {
      const ni = cur + NB_D[k];
      if (stampA[ni] === closed) continue;
      const wa = water[ni];
      let c;
      if (wa === 0) {
        const oc = occ[ni];
        if (oc === 1) {
          if (!loose) { if (goalB === null && startB === null) continue; const bd = bAt.get(ni); if (bd !== goalB && bd !== startB) continue; c = 12; }
          else c = 90;
        } else if (oc === 3) {
          if (!loose && ni !== b) continue;
          c = 90;
        } else {
          const lv = road[ni];
          c = cost[ni];
          if (rc && lv && rc[lv] < c) c = rc[lv];
          // a road of a known type: its speed limit, and whether this traveller may use it at all (roads.js)
          if (rtype && rtype[ni]) c = cls ? rtCost(cls & 7, rtype[ni], c) : cost[ni];
          if (onRail && rail[ni]) c = 1;
          // a packed street is slow, so people take the next one over
          const crowd = tileN[ni];
          if (crowd > 5) { const over = crowd - TILE_CAP[lv]; if (over > 0) c += over > 20 ? 20 : over; }
          // a road is graded, so it takes the slope easier; a railway can barely climb at all
          if (curDry && !(onRail && rail[ni])) c += climbOf(elev[ni] - elev[cur]) * (lv >= 3 ? 0.45 : lv ? 0.75 : 1);
        }
      }
      let dry = wa === 0;
      if (wa === 3) continue;
      else if (!dry) {
        if (mode >= wa) c = SAIL_COST;
        else if (onIce && ice[ni] >= ICE_WALK) { const v = ice[ni]; c = v >= ICE_SAFE ? ICE_COST : ICE_COST + (ICE_SAFE - v) * 0.5; dry = true; }  // barely thick: only when the way round is long
        else continue;
      }
      if (curLand !== dry) c += 50;
      if (k > 3) c *= 1.414;
      const g = g0 + c;
      if (stampA[ni] === open && gs[ni] <= g) continue;
      gs[ni] = g; stampA[ni] = open; cf[ni] = cur;
      const nx = ni % w, ny = (ni / w) | 0;
      const dx = Math.abs(nx - bx), dy = Math.abs(ny - by);
      hPush(ni, g + (dx + dy - 0.586 * Math.min(dx, dy)) * hMul);
    }
  }
  nodeBudget -= n;
  if (!found) { pathCache.set(key, NO_PATH); return null; }
  let len = 1;
  for (let c = b; c !== a; c = cf[c]) len++;
  const path = new Int32Array(len);
  for (let c = b, k = len - 1; k >= 0; k--) { path[k] = c; c = cf[c]; }
  // a route over the ice is only good till the thaw: remembered, so the thaw can clear the cache (iceTick)
  if (onIce && iceRouteT >= 0) for (let k = 0; k < len; k++) if (water[path[k]]) { iceRouteT = W.tick + 1; break; }
  if (pathCache.size > 240000) pathCache.clear();
  pathCache.set(key, path);
  pathCache.set(((b * 1048576 + a) * 16 + mode0) * 16 + cls, path.slice().reverse());
  return path;
}
// Water that enough ships have crossed lately to count as a shipping lane: quicker to sail, and the route captains prefer.
const SEA_LANE = 24;
// A ship's route: water and proper waterways only, never over land. spec: 1 may cross deep ocean, 2 may use big rivers, 4 may use barge canals, 8 may use ship canals,
// 16 a big hull that drags in shallow water and keeps to the deep wherever it can.
function findShipPath(a, b, spec) {
  if (a === b) return new Int32Array([a]);
  if (W.seaNet[a] !== W.seaNet[b] || !W.seaNet[a]) return null;
  const key = (a * 1048576 + b) * 32 + spec;
  const hit = shipCache.get(key);
  if (hit) return hit;
  if (pathCache.has(-key - 1)) return null;  // no way through lately (ice, say): asked again after the short cache clears
  if (nodeBudget <= 0) return PATH_BUSY;
  const water = W.water, river = W.river, canal = W.canal, ice = W.ice, lane = W.lane, seaW = W.seaW, w = W.w, bx = b % w, by = (b / w) | 0;
  const deepOK = spec & 1, riverOK = spec & 2, c1 = spec & 4, c2 = spec & 8, shoal = spec & 16 ? 18 : 6, wrap = !!W.wrap, hw = w / 2;
  const open = sid, closed = sid + 1; sid += 2;
  if (sid > 2000000000) { stampA.fill(0); sid = 2; }
  heapN = 0;
  gs[a] = 0; stampA[a] = open; cf[a] = -1;
  hPush(a, 0);
  let n = 0, found = false;
  // an ocean crossing is a long search; a hop down the coast is a short one
  const span = Math.max(Math.abs(wdx(a % w, bx)), Math.abs(((a / w) | 0) - by)), maxN = Math.min(260000, Math.max(60000, span * span * 4));
  while (heapN > 0) {
    const cur = hPop();
    if (stampA[cur] === closed) continue;
    stampA[cur] = closed;
    if (cur === b) { found = true; break; }
    if (++n > maxN) break;
    const g0 = gs[cur];
    const cx = wrap ? cur % w : -1;
    for (let k = 0; k < 8; k++) {
      let ni = cur + NB_D[k];
      if (cx === 0 && NB_X[k] < 0) ni += w; else if (cx === w - 1 && NB_X[k] > 0) ni -= w;  // over the date line
      if (stampA[ni] === closed) continue;
      const wa = water[ni];
      let c = shoal;
      if (wa === 3) continue;
      if (wa === 2) { if (!deepOK) continue; c = 5; }
      else if (wa === 0) {
        const cv = canal[ni];
        if (cv) { if (cv === 1 ? !(c1 || c2) : !c2) continue; c = 9; }
        else if (river[ni] >= 3) { if (!riverOK) continue; c = 8; }
        else continue;
      }
      if (ice[ni] > 80 && ni !== b) continue;  // frozen over
      if (lane[ni] >= SEA_LANE) c *= 0.82;
      // a widened fairway runs two ways: keep to the right-hand edge, so ships heading the other way pass on the far side
      if (seaW[ni]) { const r = ni + RT_D[k]; if (seaW[r] && lane[r] >= SEA_LANE) c *= 1.12; }
      if (k > 3) c *= 1.414;
      const g = g0 + c;
      if (stampA[ni] === open && gs[ni] <= g) continue;
      gs[ni] = g; stampA[ni] = open; cf[ni] = cur;
      const nx = ni % w, ny = (ni / w) | 0, dy = Math.abs(ny - by);
      let dx = Math.abs(nx - bx); if (wrap && dx > hw) dx = w - dx;
      hPush(ni, g + (dx + dy - 0.586 * Math.min(dx, dy)) * 7);
    }
  }
  nodeBudget -= n;
  if (!found) { pathCache.set(-key - 1, NO_PATH); return null; }
  let len = 1;
  for (let c = b; c !== a; c = cf[c]) len++;
  const path = new Int32Array(len);
  for (let c = b, k = len - 1; k >= 0; k--) { path[k] = c; c = cf[c]; }
  if (shipCache.size > 60000) shipCache.clear();
  shipCache.set(key, path);
  return path;
}

// ---- saves. The world is one web of objects (people point at towns, towns at realms, realms at people, and on round), and a
// structured clone walks it recursively, so a long game grows chains deep enough to overflow the stack. A save is packed flat
// first: every object goes into one table and each reference becomes a short string. Nothing in the world itself changes.
const PK_REF = '\u0001', PK_ESC = '\u0002';
function packWorld(root) {
  const ids = new Map([[root, 0]]), src = [root], tab = [];
  const enc = v => {
    if (v === null || typeof v !== 'object') return typeof v === 'string' && v.charCodeAt(0) <= 2 ? PK_ESC + v : v;
    let k = ids.get(v);
    if (k === undefined) { k = src.length; ids.set(v, k); src.push(v); }
    return PK_REF + k;
  };
  for (let q = 0; q < src.length; q++) {
    const o = src[q];
    let c;
    if (ArrayBuffer.isView(o) || o instanceof ArrayBuffer || o instanceof Date || o instanceof RegExp) c = o;  // leaves: cloned as they are
    else if (Array.isArray(o)) { const n = o.length; c = new Array(n); for (let i = 0; i < n; i++) if (i in o) c[i] = enc(o[i]); }
    else if (o instanceof Map) { c = []; for (const [k, v] of o) c.push(enc(k), enc(v)); c = { [PK_REF + 'map']: c }; }
    else if (o instanceof Set) { c = []; for (const v of o) c.push(enc(v)); c = { [PK_REF + 'set']: c }; }
    else { c = {}; for (const k of Object.keys(o)) c[k] = enc(o[k]); }
    tab.push(c);
  }
  return { flat: 1, tab };
}
function unpackWorld(P) {
  const tab = P.tab, MAP = PK_REF + 'map', SET = PK_REF + 'set', later = [];
  // maps and sets are made fresh, so they have to exist before anything is pointed at them
  for (let q = 0; q < tab.length; q++) { const c = tab[q]; if (c && (c[MAP] || c[SET])) { later.push(q, c); tab[q] = c[MAP] ? new Map() : new Set(); } }
  const dec = v => {
    if (typeof v !== 'string') return v;
    const c = v.charCodeAt(0);
    return c === 1 ? tab[+v.slice(1)] : c === 2 ? v.slice(1) : v;
  };
  for (let q = 0; q < tab.length; q++) {
    const o = tab[q];
    if (ArrayBuffer.isView(o) || o instanceof Map || o instanceof Set || o instanceof ArrayBuffer || o instanceof Date || o instanceof RegExp) continue;
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) if (i in o) o[i] = dec(o[i]); }
    else for (const k in o) o[k] = dec(o[k]);
  }
  for (let q = 0; q < later.length; q += 2) {
    const m = tab[later[q]], c = later[q + 1];
    if (c[MAP]) { const a = c[MAP]; for (let i = 0; i < a.length; i += 2) m.set(dec(a[i]), dec(a[i + 1])); }
    else for (const v of c[SET]) m.add(dec(v));
  }
  return tab[0];
}
