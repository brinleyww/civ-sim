'use strict';
// Individuals: life cycle, pathfinding walks, the work they do. Then war, plague, trade, ecology and the main tick.

const T_GATHER = 1, T_FARM = 2, T_CLEAR = 3, T_BUILD = 4, T_CRAFT = 5, T_POST = 6, T_TRADE = 7, T_REST = 8, T_WANDER = 9, T_MIGRATE = 10, T_WAR = 11, T_DEFEND = 12, T_RETURN = 13, T_HERD = 14, T_FIGHT = 15, T_BOARD = 16, T_ABOARD = 17, T_HUNT = 18, T_GARDEN = 19;

function plog(p, text) { p.log.push(`${Math.floor(year())}: ${text}`); if (p.log.length > 14) p.log.shift(); }

function newPerson(town, sex, age, mom, dad) {
  const p = {
    id: W.nextId++, name: personName(town.culture, sex), sex, born: W.tick - Math.floor(age * TPY), town, culture: town.culture,
    ti: town.i, nt: town.i, mv: 0, need: 4, spd: 2.5, st: 0, wake: W.tick + rint(30), path: null, pi: 0,
    job: age < 13 ? J.CHILD : J.NONE, task: 0, step: 0, tgt: 0, obj: null, carry: 0, ctype: -1, fat: rint(4), cnt: 0, skill: 0,
    home: null, spouse: null, momId: mom ? mom.id : -1, momName: mom ? mom.name : '', dadName: dad ? dad.name : '', kids: 0,
    hunger: 0, sick: 0, immune: 0, hidden: false, army: null, leader: false, fame: 0, cur: 0.5 + rnd(), log: [], alive: true, ix: W.people.length,
    lastBirth: -9, cause: '', traits: [], mi: town.members.length, hpMax: 100, hp: 100, wep: 0, arm: 0, mount: 0, wepOwn: false, xp: 0, kills: 0, btl: null, aboard: null, cdT: 0, swing: 0, lastKid: null, str: 1, spdM: 1, lifeM: 1, fertM: 1, sickM: 1, workM: 1, wisM: 1, moraleM: 1, leadM: 1, warM: 1, aimM: 1, jb: 0, jbM: 1, sideJ: 0, sideGuard: 0, prevJob: 0, sea: 0, shipRef: null, fromTown: null, spare: false,
    // the last few are for war: what they carry, how they're holding up, who they're fighting right now
    unit: null, side: null, foe: null, atkT: -99, hitT: -99, fx: 0, fy: 0, face: 1, stam: 100, mor: 60, ammo: 0, wound: 0, bleed: 0, flee: false, down: false, slotX: 0, slotY: 0, shield: false, sinceHit: 0, killer: '', game: 0, pk: 0, pow: false, cash: 0, fam: '', merc: false, origin: town.polity ? town.polity.id : -1,
    // working life: the trade they follow, how far they were schooled, and how long they've been out of work
    occ: -1, edu: -1, idleY: 0, lostOcc: -1, boat: 0, pw: -1, pwAt: -1,
    // city life: the workplace they go back to, whether they own a car, and where it is parked by day
    workB: null, car: 0, parkB: null,
    // schooling: the stage they are at now (index + 1), years into it, what they did before (stage, years, outcome, year), and whether they read
    sch: 0, schY: 0, schH: null, lit: 0,
  };
  inheritTraits(p, mom, dad);
  p.fam = dad && dad.fam ? dad.fam : mom && mom.fam ? mom.fam : familyName(town.culture);
  if (mom && mom.cash > 0) p.cash = mom.cash * 0.1;
  p.hp = p.hpMax;
  p.spd = walkSpeed(p);
  W.people.push(p); lodSlot(p.ix, p.id);
  town.members.push(p);
  return p;
}
function killPerson(p, cause) {
  if (!p.alive) return;
  p.alive = false; p.cause = cause;
  const P = W.people, last = P.pop();
  if (last !== p) { P[p.ix] = last; last.ix = p.ix; lodSlot(p.ix, last.id); }
  const t = p.town, M = t.members, lastM = M.pop();
  if (lastM !== p) { M[p.mi] = lastM; lastM.mi = p.mi; }
  if (p.aboard) { const q = p.aboard.pass.indexOf(p); if (q >= 0) p.aboard.pass.splice(q, 1); p.aboard = null; }
  p.btl = null; p.foe = null;
  if (p.unit) { const u = p.unit, q = u.men.indexOf(p); if (q >= 0) { u.men[q] = u.men[u.men.length - 1]; u.men.pop(); } p.unit = null; }
  if (p.home) p.home.res--;
  if (p.spouse) { p.spouse.spouse = null; plog(p.spouse, `Widowed: ${p.name} ${cause === 'old age' ? 'died of old age' : cause}.`); p.spouse = null; }
  if (p.army) { const a = p.army, q = a.soldiers.indexOf(p); if (q >= 0) a.soldiers.splice(q, 1); p.army = null; }
  plog(p, `Died aged ${Math.floor(ageOf(p))} (${cause}).`);
  W.deaths++; t.deathsY++;
  t.ageSum += ageOf(p); t.ageN++;
  if (p.cash > 0) { const heir = p.lastKid && p.lastKid.alive ? p.lastKid : p.spouse; if (heir && heir.alive) heir.cash += p.cash * 0.8; t.cash += p.cash * 0.2; }
  W.causes = W.causes || {}; W.causes[cause] = (W.causes[cause] || 0) + 1;
  if (tn(t) === 0) townDies(t);
  else if (!t.members.length) promoteFolk(t, Math.min(t.folk, 6));
}
function townDies(t) {
  if (!t.alive) return;
  t.alive = false;
  W.towns.splice(W.towns.indexOf(t), 1);
  delete W.townById[t.id];
  t.polity.towns--;
  if (t.peak >= 25) chronT('collapse', `${t.name} is abandoned. Its ${t.peak >= 100 ? 'great ' : ''}ruins stand empty.`, t);
  for (const b of t.blds.slice()) {
    if (t.nomad || b.type === 'hearth') { b.town = null; b.ruin = true; removeBuilding(b); continue; }
    b.ruin = true; b.ruinYear = year(); b.town = null;
    for (let dy = 0; dy < b.size; dy++) for (let dx = 0; dx < b.size; dx++) { const j = b.i + dx + dy * W.w; W.occ[j] = 4; updCost(j); dirty(j); }
  }
  for (const f of t.fields) { W.occ[f.i] = 0; W.stage[f.i] = 0; dirty(f.i); }
  t.fields.length = 0;
  releasePlots(t);
  if (t.tameHerd) t.tameHerd.owner = null;
  for (const s of t.ships.slice()) loseShip(s, 'abandoned');
  for (const o of W.towns) { const k = o.partners.indexOf(t); if (k >= 0) o.partners.splice(k, 1); if (o.seaPartners) { const q = o.seaPartners.indexOf(t); if (q >= 0) o.seaPartners.splice(q, 1); } }
}

// ---- walking ----
function beginPath(p, path) {
  p.path = path; p.pi = 0; p.mv = 0;
  p.ti = path[0];
  if (path.length < 2) { p.st = 0; p.wake = W.tick; return; }
  p.nt = path[1]; p.need = stepNeed(p, p.ti, p.nt);
  p.st = 1;
}
function stepNeed(p, a, b) {
  let c;
  if (W.water[b]) c = SAIL_COST;
  else {
    const lv = W.road[b], t = p.town, tr = t.trans;
    c = W.cost[b];
    if (tr && lv && ROAD_SPEED[tr][lv] < c) c = ROAD_SPEED[tr][lv];
    if (tr && lv && W.rtype && W.rtype[b]) c = rtCost(tr, W.rtype[b], c);  // the road's speed limit, or on foot where this vehicle may not go
    if (W.rail[b] && t.mod.rail) c = c < 1.2 ? c : 1.2;
    // deep snow is hard going, unless they've learned to deal with it or the road's been ploughed
    const sn = W.snowD[b];
    if (sn > 14 && !(lv >= 3 && t.mod.plough)) c *= 1 + sn / (t.mod.ski ? 170 : 75);
    const crowd = W.tileN[b], room = TILE_CAP[lv] + W.lanes[b] * 6;
    if (crowd > room) c *= crowd > room * 3 ? 3 : crowd / room;
    // a downpour turns a dirt track to mud; a paved road shrugs it off
    if (lv < 3) { const r = wxNow(b); if (r > 0.2) c *= 1 + r * 0.6; }
    if (!W.water[a]) c += climbCost(a, b) * (lv >= 3 ? 0.45 : lv ? 0.75 : 1);
  }
  const diff = b - a;
  return (diff === 1 || diff === -1 || diff === W.w || diff === -W.w) ? c : c * 1.414;
}
const ROAD_NEXT = [80, 300, 1000, 3000, 1e9];
function stepTile(p) {
  p.mv -= p.need;
  const i = p.nt; p.ti = i; p.pi++;
  if (W.water[i] === 0) wearTile(i, p.town);
  if (p.pi >= p.path.length - 1) { p.st = 0; p.wake = W.tick; p.mv = 0; p.nt = i; return; }
  p.nt = p.path[p.pi + 1];
  p.need = stepNeed(p, i, p.nt);
}
function wearTile(i, t) {
  const v = W.wear[i], s = t.scale, add = s > 1.5 ? (s > 40 ? 40 : s | 0) : 1;
  if (v >= 60000) return;
  const nv = v + add;
  W.wear[i] = nv;
  if (nv >= ROAD_NEXT[W.road[i]]) wearRoad(i, t);
  else if (nv > 5000 && (nv & 255) < add) widenRoad(i, t, nv);
}
// Off screen nobody sees the steps, so a walk is just its time: the same distance at about the going rate, with no search and no steps.
// Feet still wear the ground along the way, so trails and roads go on forming where nobody's looking.
function quietWalk(p, to) {
  const w = W.w, a = p.ti, ax = a % w, ay = (a / w) | 0, bx = to % w, by = (to / w) | 0;
  const dx = Math.abs(bx - ax), dy = Math.abs(by - ay), n = dx > dy ? dx : dy;
  if (n < 1) return false;
  // not straight across a bay or a lake: the way round is far longer, and anyone glancing over would see them walk on water
  for (let k = 1; k < n; k++) if (W.water[Math.round(ay + (by - ay) * k / n) * w + Math.round(ax + (bx - ax) * k / n)]) return false;
  // the going rate, from ground sampled along the way; the doorways at either end don't count, or every walk home or to the store is timed as if through walls
  let sum = 0, cnt = 0;
  const S = Math.min(n, 7), at = k => Math.round(ay + (by - ay) * k / n) * w + Math.round(ax + (bx - ax) * k / n);
  for (let q = 1; q <= S; q++) {
    const k = Math.round(q * n / S), i = at(k), j = at(k - 1);  // one step of the line, j then i
    if (W.occ[i] === 1 || W.occ[i] === 3 || W.occ[j] === 1 || W.occ[j] === 3) continue;
    const d = i - j;
    sum += stepNeed(p, j, i) / (d === 1 || d === -1 || d === w || d === -w ? 1 : 1.414); cnt++;
  }
  const per = clamp(cnt ? sum / cnt : 10, 0.8, 40);
  for (let k = 1; k < n; k++) {
    const i = Math.round(ay + (by - ay) * k / n) * w + Math.round(ax + (bx - ax) * k / n);
    if (!W.water[i] && W.occ[i] !== 1 && W.occ[i] !== 3) wearTile(i, p.town);
  }
  p.path = new Int32Array([a, to]); p.pi = 0; p.mv = 0; p.nt = to; p.st = 1;
  p.need = (n + 0.414 * (dx > dy ? dy : dx)) * per * 1.2;  // a real route bends a little
  return true;
}
// The tile someone on a one-step path is passing over just now (for a quiet walk, somewhere along the straight line).
function glideTile(p) {
  const w = W.w, a = p.ti, b = p.nt, f = p.need > 0 ? (p.mv < p.need ? p.mv / p.need : 1) : 0;
  return Math.round(((a / w) | 0) + (((b / w) | 0) - ((a / w) | 0)) * f) * w + Math.round(a % w + (b % w - a % w) * f);
}
// Called away partway along a quiet walk (a fight, a new errand): they are where the walk had got to, not back where it began.
function settle(p) {
  const P0 = p.path;
  if (!P0 || P0.length !== 2 || p.pi !== 0 || p.mv <= 0 || p.ti !== P0[0] || p.nt !== P0[1]) return;
  const c = glideTile(p), mv0 = p.mv;
  p.mv = 0; if (p.st === 1) p.st = 0;
  if (c === p.ti) return;
  // a doorway is fine (a walk can start inside a building); open water or a wall is not, so the nearest ground beside it
  // mid-lake (a quiet walk goes straight over water), they turn back to the last dry ground on the way
  let j = c;
  if (W.water[j] || W.occ[j] === 3) {
    j = -1;
    const w = W.w, a = P0[0], b = P0[1], ax = a % w, ay = (a / w) | 0, n = Math.max(Math.abs(b % w - ax), Math.abs(((b / w) | 0) - ay)), f0 = Math.min(1, mv0 / p.need);
    for (let k = Math.floor(f0 * n); k > 0 && j < 0; k--) { const i = Math.round(ay + (((b / w) | 0) - ay) * k / n) * w + Math.round(ax + (b % w - ax) * k / n); if (!W.water[i] && W.occ[i] !== 3) j = i; }
  }
  if (j >= 0) { p.ti = j; p.nt = j; }
}
// A quiet walk has come into view: from here it's a real walk, round the buildings, from the spot they'd have reached.
// Without this the straight glide went through houses and walls, and anyone watching saw people pop from one place to the next.
let LOD_TURN = 1;  // how many ticks apart each walker is moved just now (1 in a small world)
function unquiet(p, c) {
  const a = p.ti, b = p.nt, w = W.w;
  if (Math.abs(a % w - b % w) <= 1 && Math.abs(((a / w) | 0) - ((b / w) | 0)) <= 1) return;  // an ordinary single step
  if (W.water[c] || W.occ[c] === 1 || W.occ[c] === 3) return;  // inside a building or out on a lake just now: finish the glide
  p.ti = c;
  if (c === b || straightWalk(p, b)) return;
  const path = findPath(c, b, 0, p.town.trans + (p.town.mod.rail ? 8 : 0));
  if (path && path !== PATH_BUSY) { beginPath(p, path); return; }
  p.ti = a;  // no way found yet: keep gliding, and try again next tick
}
// Enough feet make a trail, a trail becomes a road, and once a people knows how, the road gets paved.
function wearRoad(i, town) {
  if (W.water[i] || (W.river[i] >= 2 && !town.tech[TECH_IX.engineering] && !town.tech[TECH_IX.bridges])) return;
  const cur = W.road[i], m = town.mod;
  const lv = cur === 0 ? 1 : cur === 1 ? 2 : cur === 2 ? (m.paved ? 3 : 2) : (m.car ? 4 : m.paved ? 3 : 2);
  if (W.occ[i] === 1 || W.occ[i] === 2 || lv <= cur) return;
  W.road[i] = lv;
  if (lv >= 2 && W.tree[i]) W.tree[i] = 0;
  if (lv >= 2) W.plant[i] = 0;
  updCost(i); dirty(i);
  for (let k = 0; k < 8; k++) dirty(i + NB_D[k]);
}
// When even that isn't enough, a road spreads: a dirt track gets wider, a street gets another lane, and it eats whatever land is beside it.
function widenRoad(i, town, v) {
  const m = town.mod, lv = W.road[i], most = m.trans >= 5 ? 4 : m.paved ? 3 : 2;
  if (lv < 1 || W.lanes[i] >= most - 1) return;
  const need = 5000 * (W.lanes[i] + 1) * (W.lanes[i] + 1);
  if (v < need) return;
  // which way does it run? spread sideways, not along itself
  const w = W.w, ew = W.road[i - 1] || W.road[i + 1], ns = W.road[i - w] || W.road[i + w];
  const opts = ew && !ns ? [i - w, i + w] : ns && !ew ? [i - 1, i + 1] : [i - w, i + 1, i + w, i - 1];
  for (let q = 0; q < opts.length; q++) {
    const j = opts[(q + i) % opts.length];
    if (j < w || j >= W.occ.length - w || W.water[j] || W.occ[j] === 1 || W.occ[j] === 3 || W.road[j] >= lv || W.river[j] >= 2 || W.canal[j]) continue;
    if (W.occ[j] === 2) dropField(j);
    W.road[j] = lv; W.tree[j] = 0; W.plant[j] = 0; W.forage[j] = 0; W.wear[j] = Math.max(W.wear[j], v >> 1);
    W.lanes[i]++; W.lanes[j] = W.lanes[i];
    updCost(j); dirty(j); dirty(i);
    for (let k = 0; k < 8; k++) dirty(j + NB_D[k]);
    return;
  }
}
function walk(p, to, nextStep, mode) {
  if (p.mv > 0) settle(p);
  if (p.ti === to) { p.pw = -1; p.step = nextStep; p.st = 0; p.wake = W.tick; return; }
  // the search was busy last time, from this same spot to this same goal: the quick ways failed then and would again,
  // and while this tick's searching is spent there is nothing to do but wait a little longer
  const again = p.pw === to && p.pwAt === p.ti;
  if (again && nodeBudget <= 0) { p.wake = W.tick + 1 + rint(4); return; }
  p.pw = -1;
  if (!again && !mode && !inView(p.ti) && !inView(to) && !p.town.attack && !W.water[p.ti] && !W.water[to] && W.landId[p.ti] === W.landId[to] && quietWalk(p, to)) { p.step = nextStep; p.hidden = false; return; }
  // short trips across open ground need no search at all: most of a day's walking is next door
  if (!again && !mode && straightWalk(p, to)) { p.step = nextStep; p.hidden = false; return; }
  const cls = mode ? 0 : p.town.trans + (p.town.mod.rail ? 8 : 0);
  let path = findPath(p.ti, to, mode || 0, cls);
  if (path === PATH_BUSY) { p.pw = to; p.pwAt = p.ti; p.wake = W.tick + 1 + rint(4); return; }
  if (!path) {
    // walled in by buildings: squeeze through, rather than stand there for ever
    if (!mode) path = findPath(p.ti, to, 8, cls);
    if (path === PATH_BUSY) { p.pw = to; p.pwAt = p.ti; p.wake = W.tick + 1 + rint(4); return; }
    if (!path) { endTask(p, 12); return; }
  }
  p.step = nextStep; p.hidden = false;
  beginPath(p, path);
}
// Straight little strolls cost no search at all.
function stroll(p, to) {
  if (p.mv > 0) settle(p);
  const a = p.ti, ax = a % W.w, ay = (a / W.w) | 0, bx = to % W.w, by = (to / W.w) | 0;
  const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  if (n === 0) { p.st = 0; p.wake = W.tick + 20; return; }
  const path = new Int32Array(n + 1);
  for (let k = 0; k <= n; k++) {
    const j = Math.round(ay + (by - ay) * k / n) * W.w + Math.round(ax + (bx - ax) * k / n);
    if (W.water[j] || (k > 0 && (W.occ[j] === 1 || W.occ[j] === 3))) { p.st = 0; p.wake = W.tick + 30; return; }
    path[k] = j;
  }
  p.hidden = false;
  beginPath(p, path);
}
const lineClear = (ax, ay, bx, by, n, keepEnd) => {
  const w = W.w, water = W.water, cost = W.cost, occ = W.occ, tileN = W.tileN, elev = W.elev, dx = bx - ax, dy = by - ay;
  // a straight line is only the easy way if it doesn't go over a hill: much climbing and a search will find the way round
  let prev = ay * w + ax, climb = 0;
  for (let k = 1; k <= n; k++) {
    const j = Math.round(ay + dy * k / n) * w + Math.round(ax + dx * k / n);
    if (water[j]) return false;
    if ((k < n || !keepEnd) && (cost[j] > 70 || occ[j] === 1 || occ[j] === 3 || tileN[j] > 12)) return false;
    const d = elev[j] - elev[prev];
    if (d > 0.09) return false;
    if (d > CLIMB_FREE) climb += d - CLIMB_FREE;
    prev = j;
  }
  return climb < 0.12;
};
function straightWalk(p, to) {
  const a = p.ti, w = W.w, ax = a % w, ay = (a / w) | 0, bx = to % w, by = (to / w) | 0;
  const dx = bx - ax, dy = by - ay, n = Math.max(dx < 0 ? -dx : dx, dy < 0 ? -dy : dy);
  if (n > 44 || n === 0) return false;
  if (W.water[to]) return false;
  if (n <= 30 && lineClear(ax, ay, bx, by, n, true)) {
    const path = new Int32Array(n + 1);
    for (let k = 0; k <= n; k++) path[k] = Math.round(ay + dy * k / n) * w + Math.round(ax + dx * k / n);
    beginPath(p, path);
    return true;
  }
  return feelWay(p, a, to, ax, ay, bx, by, n);
}
// Something's in the way: head for the goal and step round whatever stops you, the way a person actually does. Costs a few dozen comparisons, against thousands for a search.
const _feel = new Int32Array(120);
function feelWay(p, a, to, ax, ay, bx, by, n) {
  const w = W.w, water = W.water, cost = W.cost, occ = W.occ, elev = W.elev, X = NB_X, Y = NB_Y, D = NB_D, limit = Math.min(118, n * 3 + 8);
  let cx = ax, cy = ay, cur = a, len = 0, last = -1, prev = -1;
  _feel[len++] = a;
  while (cur !== to) {
    if (len >= limit) return false;
    let best = -1, bs = 1e9, bk = 0;
    for (let k = 0; k < 8; k++) {
      const j = cur + D[k];
      if (j === last || j === prev) continue;
      if (j !== to && (water[j] || cost[j] > 70 || occ[j] === 1 || occ[j] === 3)) continue;
      if (water[j]) continue;
      const up = elev[j] - elev[cur];
      if (up > 0.1) continue;  // too steep to just scramble up: leave that to a proper search
      const ex = cx + X[k] - bx, ey = cy + Y[k] - by, s = (ex < 0 ? -ex : ex) + (ey < 0 ? -ey : ey) + (k > 3 ? 0.4 : 0) + (up > CLIMB_FREE ? (up - CLIMB_FREE) * 16 : 0);
      if (s < bs) { bs = s; best = j; bk = k; }
    }
    if (best < 0) return false;
    prev = last; last = cur;
    cur = best; cx += X[bk]; cy += Y[bk];
    _feel[len++] = cur;
  }
  beginPath(p, _feel.slice(0, len));
  return true;
}
const nearLand = i => { for (let k = 0; k < 8; k++) { const j = i + NB_D[k]; if (j > 0 && !W.water[j] && W.occ[j] !== 1 && !W.canal[j]) return j; } return i; };
function endTask(p, wait) { if (p.boat) returnBoat(p); p.pw = -1; p.task = 0; p.step = 0; p.obj = null; p.st = 0; p.wake = W.tick + (wait || 0); }
function workFor(p, ticks, nextStep, hidden) { p.st = 2; p.wake = W.tick + Math.max(1, ticks | 0); p.step = nextStep; p.hidden = !!hidden; }

function depotFor(p) {
  const D = p.town.depots; let best = p.town.i, bd = 1e9;
  const x = p.ti % W.w, y = (p.ti / W.w) | 0;
  for (let k = 0; k < D.length; k++) { const b = D[k], d = Math.abs(b.x - x) + Math.abs(b.y - y); if (d < bd) { bd = d; best = b.i; } }
  return best;
}
function deposit(p) {
  const t = p.town;
  if (p.carry > 0 && p.ctype >= 0) {
    const haul = p.carry * t.scale;
    t.stock[p.ctype] += haul;
    t.outVal += haul * VALUE[p.ctype];
    if (p.ctype === R.FOOD) { t.foodProd += haul; const fk = FOOD_KIND[p.job]; if (fk !== undefined) t.diet[fk] += haul; }
  }
  p.carry = 0; p.ctype = -1;
}
function siteNear(list, p, ok) {
  if (!list.length) return -1;
  let best = -1, bd = 1e9;
  const x = p.ti % W.w, y = (p.ti / W.w) | 0, crowd = W.tileN;
  for (let k = 0; k < 7; k++) {
    const i = list[Math.floor(rnd() * list.length)];
    if (!ok(i)) continue;
    // nobody wants to work a spot three others are already standing on
    const d = Math.abs(i % W.w - x) + Math.abs(((i / W.w) | 0) - y) + crowd[i] * 4;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
const hasForage = i => W.forage[i] > 0;
const hasTree = i => W.tree[i] > 0;
const hasRock = i => W.oreAmt[i] > 0;
const hasFishLand = i => { if (W.river[i] && W.fish[i] > 0) return true; for (let k = 0; k < 4; k++) if (W.fish[i + NB_D[k]] > 0) return true; return false; };
const hasFish = i => W.fish[i] > 0;
// The long swings (droughts called down, wet decades) times this season's real weather.
const rainAt = i => { const cx = Math.floor((i % W.w) / W.w * 10), cy = Math.floor(((i / W.w) | 0) / W.h * 10); return W.climate[cy * 10 + cx] * wxRain(i); };

// ---- choosing what to do ----
function think(p) {
  switch (p.task) {
    case 0: return chooseTask(p);
    case T_GATHER: return gatherStep(p);
    case T_FARM: return farmStep(p);
    case T_CLEAR: return clearStep(p);
    case T_BUILD: return buildStep(p);
    case T_CRAFT: return craftStep(p);
    case T_POST: return postStep(p);
    case T_TRADE: return tradeStep(p);
    case T_REST: return restStep(p);
    case T_WANDER: return wanderStep(p);
    case T_MIGRATE: return migrateStep(p);
    case T_WAR: return warStep(p);
    case T_RETURN: return returnStep(p);
    case T_HERD: return herdStep(p);
    case T_FIGHT: return fightStep(p);
    case T_BOARD: return boardStep(p);
    case T_ABOARD: p.st = 2; p.wake = W.tick + 40; return;
    case T_HUNT: return huntStep(p);
    case T_GARDEN: return gardenStep(p);
    case T_SCHOOL: return schoolStep(p);
  }
}
function chooseTask(p) {
  const t = p.town, j = p.job;
  p.hidden = false;
  if (j === J.CHILD && p.sch > 0 && schoolDay(p)) return;  // term time: off to school
  if (j <= J.ELDER) return startWander(p);
  if (t.attack) { p.task = T_REST; p.step = 0; return restStep(p); }  // anyone not fighting stays indoors
  if (++p.fat >= shiftsBeforeHome(p)) { p.fat = 0; p.task = T_REST; p.step = 0; return restStep(p); }
  p.task = 0; p.step = 0;
  doJob(p, j, 0);
}
function doJob(p, j, depth) {
  const t = p.town;
  switch (j) {
    case J.FORAGE: case J.WOOD: case J.CLAY: case J.STONE: case J.FISH: case J.MINE:
      p.task = T_GATHER; p.step = 0; return gatherStep(p);
    case J.HUNT: p.task = T_HUNT; p.step = 0; p.cnt = 0; return huntStep(p);
    case J.GARDEN: p.task = T_GARDEN; p.step = 0; p.cnt = 0; return gardenStep(p);
    case J.FARM: {
      p.task = T_FARM; p.step = 0; p.cnt = 0; return farmStep(p);
    }
    case J.HERD: p.task = T_HERD; p.step = 0; return herdStep(p);
    case J.BUILD: p.task = T_BUILD; p.step = 0; return buildStep(p);
    case J.CRAFT: p.task = T_CRAFT; p.step = 0; return craftStep(p);
    case J.SCHOLAR: case J.SERVICE: case J.SOLDIER: case J.SAILOR: p.task = T_POST; p.step = 0; return postStep(p);
    case J.TRADE: p.task = T_TRADE; p.step = 0; return tradeStep(p);
  }
  if (depth === 0) startWander(p); else endTask(p, 20);
}
// What a worker does when their own job has nothing on: help on site, cut wood, or just rest.
function sideJob(p) {
  const t = p.town;
  if (t.queue.length) return doJob(p, J.BUILD, 1);
  if (t.sTree.length && t.stock[R.WOOD] < storeCap(t) * 0.7) { p.sideJ = J.WOOD; return doJob(p, J.WOOD, 1); }
  if (t.sForage.length && t.stock[R.FOOD] < tn(t) * 3) { p.sideJ = J.FORAGE; return doJob(p, J.FORAGE, 1); }
  return startWander(p);
}
function startWander(p) { p.task = T_WANDER; p.step = 0; wanderStep(p); }
// Off work, a child or one of the old: home, an outing to the square or market, or a walk down the street (citylife.js).
function wanderStep(p) { return freeTimeStep(p); }
function restStep(p) {
  if (p.step === 0) { walk(p, p.home ? p.home.i : p.town.i, 1); return; }
  if (p.step === 1) { workFor(p, 35 + rint(45), 2, true); return; }  // the evening and the night at home
  endTask(p);
}
function didWork(p, j) { const t = p.town; t.act[j] += p.wisM * t.scale; t.pathAct[j] += t.scale; }
function migrateStep(p) {
  if (p.step === 0) { walk(p, p.tgt, 1, 0); return; }
  endTask(p, rint(10));
}
function gatherStep(p) {
  const t = p.town, m = t.mod;
  const j = p.sideJ || p.job;
  if (p.step === 0) {
    let to = -1, mode = 0;
    switch (j) {
      case J.FORAGE: to = siteNear(t.sForage, p, hasForage); break;
      case J.WOOD: to = siteNear(t.sTree, p, hasTree); break;
      case J.CLAY: to = siteNear(t.sClay, p, hasRock); break;
      case J.STONE: to = siteNear(t.sStone, p, hasRock); break;
      case J.FISH:
        // boats go out from a wharf or harbour; without one, you fish from the bank
        // and only in a boat the town really has, taken from where it is kept
        if (m.sail >= 1 && t.sBoat.length && t.portLv && rnd() < 0.65 && portOf(t) >= 0 && takeBoat(p)) { to = siteNear(t.sBoat, p, hasFish); mode = 1; if (to < 0) returnBoat(p); }
        if (to < 0) { to = siteNear(t.sFish, p, hasFishLand); mode = 0; }
        break;
      case J.MINE: {
        // a random one of the mines still worth working, picked without making a list of them
        const M = t.mines, ok = b => b.done && W.oreAmt[b.i] > 0 && t.stock[oreRes(W.ore[b.i])] < wantOf(t, oreRes(W.ore[b.i])) * 1.5;
        let n = 0;
        for (let k = 0; k < M.length; k++) if (ok(M[k])) n++;
        if (n) { let r = Math.floor(rnd() * n); for (let k = 0; k < M.length; k++) if (ok(M[k]) && r-- === 0) { p.obj = M[k]; to = M[k].i; break; } }
        break;
      }
    }
    if (to < 0) { p.sideJ = 0; p.obj = null; p.task = 0; return sideJobOnce(p); }
    p.tgt = to; p.sea = mode ? 1 : 0;
    p.step = 6;  // the spot is chosen (and any boat taken): a busy search only means walking there a little later
  }
  if (p.step === 6) {
    if (p.sea) { const bs = boatStore(t); walk(p, bs ? bs.i : t.portB, 4, 0); }
    else walk(p, p.tgt, 1, 0);
    return;
  }
  if (p.step === 4) { walk(p, p.tgt, 1, 1); return; }
  if (p.step === 1) {
    const dur = j === J.FORAGE ? 14 : j === J.WOOD ? 24 / m.wood : j === J.FISH ? 20 : j === J.MINE ? 40 / m.mine : 24;
    workFor(p, dur, 2, j === J.MINE);
    return;
  }
  if (p.step === 2) { harvest(p, j); p.hidden = false; p.step = 5; }
  if (p.step === 5) {  // home with the load (again, if the search was busy: the harvest is in hand already)
    if (W.water[p.ti]) { const bs = boatStore(t), back = bs ? bs.i : t.portLv && portOf(t) >= 0 ? t.portB : depotFor(p); walk(p, back, 3, 1); }
    else walk(p, depotFor(p), 3, 0);
    return;
  }
  deposit(p); p.sideJ = 0; p.skill++;
  didWork(p, j);
  endTask(p);
}
function sideJobOnce(p) {
  if (p.sideGuard === W.tick) { endTask(p, 15); return; }
  p.sideGuard = W.tick;
  sideJob(p);
}
function harvest(p, j) {
  const t = p.town, m = t.mod, i = p.tgt, tool = t.toolMul;
  let a = 0, r = R.FOOD;
  const skill = 1 + Math.min(p.skill, 40) * 0.005;
  switch (j) {
    case J.FORAGE: {
      if (W.forage[i] > 0) {
        W.forage[i]--;
        const season = seasonOf(), cold = season === 3 && W.temp[i] < 0.55;
        a = (cold ? 3 : 6.6) * m.forage * skill * clamp(rainAt(i), 0.6, 1.4);
      }
      break;
    }
    case J.WOOD: {
      r = R.WOOD;
      if (W.tree[i] > 0) {
        W.tree[i]--;
        a = 4 * m.wood * tool * skill;
        if (t.count.sawmill) a *= 1.4;
        if (W.tree[i] === 0) {
          updCost(i);
          // a people who've learned to replant put a sapling in the stump's place
          if (knows(t, 'replanting') && rnd() < (t.mod.wood > 1.2 ? 0.7 : 0.35) && !t.nomad) setPlant(t, i, PLANT_IX.sapling);
        }
        dirty(i);
      }
      break;
    }
    case J.CLAY: r = R.CLAY; a = 4 * tool * skill; W.oreAmt[i] = Math.max(0, W.oreAmt[i] - 2); break;
    case J.STONE: r = R.STONE; a = 3.5 * tool * m.mine * skill * (t.count.quarry ? 1.5 : 1); W.oreAmt[i] = Math.max(0, W.oreAmt[i] - 2); break;
    case J.FISH: {
      let best = i;
      if (!W.water[i] && !W.river[i]) for (let k = 0; k < 4; k++) if (W.fish[i + NB_D[k]] > W.fish[best]) best = i + NB_D[k];
      if (W.fish[best] > 0) {
        W.fish[best]--;
        a = (W.water[i] ? 4.5 : 3.5) * m.fish * skill;
        if (t.count.dock) a *= 1.2;
      }
      break;
    }
    case J.MINE: {
      const b = p.obj;
      if (b && W.oreAmt[b.i] > 0) {
        r = oreRes(W.ore[b.i]);
        a = 4 * m.mine * tool * skill;
        W.oreAmt[b.i] = Math.max(0, W.oreAmt[b.i] - a);
        if (W.oreAmt[b.i] <= 0) { chronT('misc', `The ${ORE_NAME[W.ore[b.i]].toLowerCase()} mine at ${t.name} runs dry.`, t); b.spent = true; const k = t.mines.indexOf(b); if (k >= 0) t.mines.splice(k, 1); }
      }
      break;
    }
  }
  p.carry = a * workRate(p, j); p.ctype = r; p.obj = null;
}

// ---- farming ----
const fieldTarget = t => Math.min(Math.ceil(t.jobs[J.FARM] * (3.5 + t.mod.fields)), t.fields.length + t.sArable.length);
// Farmers work the nearest field that needs them, so a holding gets tended as a block.
function nextField(t, wantStage, p) {
  const F = t.fields, n = F.length; if (!n) return null;
  const x = p.ti % W.w, y = (p.ti / W.w) | 0, st = W.stage, now = W.tick;
  let best = null, bd = 1e9;
  const tries = Math.min(n, 40);
  for (let k = 0; k < tries; k++) {
    t.fcur = (t.fcur + 7) % n;
    const f = F[t.fcur];
    if (st[f.i] !== wantStage || f.rest > 0 || now - f.by < 20) continue;
    const d = Math.abs(f.i % W.w - x) + Math.abs(((f.i / W.w) | 0) - y);
    if (d < bd) { bd = d; best = f; if (d <= 2) break; }
  }
  if (best) best.by = now;
  return best;
}
function farmStep(p) {
  const t = p.town, s = seasonOf();
  const planting = s <= 1, want = planting ? 0 : 3;
  if (p.step === 0) {
    const f = nextField(t, want, p);
    if (!f) {
      if (p.carry > 0) { walk(p, depotFor(p), 3); return; }
      // every field is sown: time to break new ground
      if (planting && t.crop && t.fields.length < fieldTarget(t)) { p.task = T_CLEAR; p.step = 0; return clearStep(p); }
      p.task = 0; return sideJobOnce(p);
    }
    p.obj = f; p.tgt = f.i;
    walk(p, f.i, 1);
    return;
  }
  if (p.step === 1) { workFor(p, 7 / (1 + t.mod.fields * 0.25), 2); return; }
  if (p.step === 2) {
    const f = p.obj; p.obj = null;
    if (f && W.occ[f.i] === 2) {
      if (planting && W.stage[f.i] === 0) {
        if (W.fert[f.i] < 28) f.rest = 1;  // worn-out soil goes fallow
        else if (W.snowD[f.i] < 80) { W.stage[f.i] = 1; W.snowD[f.i] = 0; dirty(f.i); }  // nobody sows into a deep drift
      } else if (W.stage[f.i] === 3) {
        W.stage[f.i] = 0; dirty(f.i);
        const crop = CROPS[t.crop];
        const suit = clamp(cropSuit(t.crop, f.i), 0.25, 1);
        let rain = 1 + (rainAt(f.i) - 1) * t.mod.drought;
        // water led in by a ditch or a river bank: no drought, and dry land watered grows the most
        if (wetField(f.i)) rain = Math.max(rain, 1) * (1.08 + Math.max(0, 0.6 - W.moist[f.i]) * 0.5);
        const y = workRate(p, J.FARM) * 8.5 * crop.yield * suit * Math.pow(W.fert[f.i] / 140, 0.6) * t.mod.farm * t.toolMul * clamp(rain, 0.15, 1.5) * (t.count.mill || t.count.windmill ? 1.06 : 1);
        p.carry += y; p.ctype = R.FOOD;
        const dep = (2 + rint(4)) * t.mod.deplete * (W.river[f.i] || W.moist[f.i] > 0.85 ? 0.5 : 1);
        W.fert[f.i] = Math.max(0, W.fert[f.i] - dep);
      }
    }
    p.cnt++;
    if (planting && p.cnt < 6) { p.step = 0; p.st = 0; p.wake = W.tick; return; }
    if (!planting && p.cnt < 2 + t.mod.fields) { p.step = 0; p.st = 0; p.wake = W.tick; return; }
    didWork(p, J.FARM);
    if (p.carry > 0) { p.step = 4; walk(p, depotFor(p), 3); return; }
    endTask(p);
    return;
  }
  if (p.step === 4) { walk(p, depotFor(p), 3); return; }  // the search was busy last time
  deposit(p); endTask(p);
}
function clearStep(p) {
  const t = p.town;
  if (p.step === 0) {
    // a faint footpath gets ploughed under; a real road doesn't
    const ok = i => W.occ[i] === 0 && !W.water[i] && W.road[i] < 2 && !W.plant[i] && !W.canal[i];
    let best = -1, bs = -1e9;
    for (let k = 0; k < 8; k++) {
      const i = t.sArable.length ? pick(t.sArable) : -1;
      if (i < 0 || !ok(i)) continue;
      const d = Math.hypot(tx(i) - t.x, ty(i) - t.y);
      let around = 0; for (let q = 0; q < 4; q++) if (W.occ[i + NB_D[q]] === 2) around++;
      // farms go where land is cheap: a field on ground the town could build on is a poor bargain
      const s = W.fert[i] * 0.05 + around * 2 - d * 0.6 - W.tree[i] * 0.6 - (d < 3 ? 6 : 0) - (tn(t) >= 150 ? landRel(t, i) * 12 : 0);
      if (s > bs) { bs = s; best = i; }
    }
    if (best < 0) { p.task = 0; return sideJobOnce(p); }
    p.tgt = best;
    walk(p, best, 1);
    return;
  }
  if (p.step === 1) { workFor(p, 12 + W.tree[p.tgt] * 6, 2); return; }
  const i = p.tgt;
  if (W.occ[i] === 0) {
    if (W.tree[i]) t.stock[R.WOOD] += W.tree[i];
    W.tree[i] = 0; W.occ[i] = 2; W.stage[i] = 0; W.forage[i] = 0; W.road[i] = 0; W.wear[i] = 0;
    t.fields.push({ i, rest: 0, by: 0 });
    updCost(i); dirty(i);
  }
  endTask(p);
}
function herdStep(p) {
  const t = p.town, H = t.tameHerd;
  if (p.step === 0) {
    if (!H) { p.task = 0; return sideJobOnce(p); }
    const to = (H.y | 0) * W.w + (H.x | 0);
    p.tgt = W.water[to] ? t.i : to;
    walk(p, p.tgt, 1);
    return;
  }
  if (p.step === 1) { workFor(p, 34, 2); return; }
  if (p.step === 2) {
    if (H && H.n > 3) {
      const take = rnd() < 0.5 ? 1 : 0;
      H.n -= take;
      p.carry = (HERD_TYPES[H.type].meat * take + 4) * t.mod.herd * workRate(p, J.HERD);
      p.ctype = R.FOOD;
      if (knows(t, 'weaving')) t.stock[R.CLOTH] += 0.3;
    }
    didWork(p, J.HERD);
    p.step = 4;
  }
  if (p.step === 4) { walk(p, depotFor(p), 3); return; }
  deposit(p); endTask(p);
}

// ---- hunting: find a herd, get close, bring one animal down, butcher it where it fell, carry the meat home ----
const animalAt = (H, k, out) => { out.x = H.x + (hash2(H.id, k, 1) - 0.5) * 2.2; out.y = H.y + (hash2(H.id, k, 2) - 0.5) * 1.9; return out; };
const _ap = { x: 0, y: 0 };
const huntRange = t => t.tech[TECH_IX.rifle] ? 12 : t.tech[TECH_IX.musket] ? 8 : t.tech[TECH_IX.bow] ? 6.5 : 2.4;
function quarryFor(t, p) {
  // anything killing the town's people comes first, then whatever is close and worth the walk
  let best = null, bs = -1e9;
  const x = p.ti % W.w, y = (p.ti / W.w) | 0;
  for (let k = 0; k < t.herds.length; k++) {
    const H = t.herds[k];
    if (H.owner || H.n <= 0) continue;
    const T = HERD_TYPES[H.type];
    if (T.pred && !t.preyed && rnd() < 0.7) continue;
    let s = T.meat + Math.min(H.n, 12) * 0.3 - Math.hypot(H.x - x, H.y - y) * 0.25 + rnd() * 2;
    if (T.pred && t.preyed) s += 30;
    if ((T.hp || 1) > 3 && t.jobs[J.HUNT] < 4) continue;  // nobody takes on a mammoth alone
    if (s > bs) { bs = s; best = H; }
  }
  return best;
}
function stalk(p, H) {
  const t = p.town, r = Math.max(1, huntRange(t) - 1.2), x = p.ti % W.w, y = (p.ti / W.w) | 0;
  const d = Math.max(0.01, Math.hypot(H.x - x, H.y - y));
  const tx0 = Math.round(H.x + (x - H.x) / d * Math.min(r, d)), ty0 = Math.round(H.y + (y - H.y) / d * Math.min(r, d));
  const to = clamp(ty0, 1, W.h - 2) * W.w + clamp(tx0, 1, W.w - 2);
  if (W.water[to] || W.landId[to] !== W.landId[p.ti]) { endHunt(p); return; }
  walk(p, to, 1, 0);
}
function endHunt(p) { p.obj = null; didWork(p, J.HUNT); if (p.carry > 0) { p.task = T_HUNT; p.step = 5; walk(p, depotFor(p), 6, 0); return; } endTask(p, 10); }
function huntStep(p) {
  const t = p.town;
  switch (p.step) {
    case 0: {
      const H = quarryFor(t, p);
      if (!H) { p.obj = null; p.task = 0; return sideJobOnce(p); }
      p.obj = H; p.cnt = 0;
      return stalk(p, H);
    }
    case 1: {  // got to where the herd was
      const H = p.obj;
      if (!H || H.n <= 0) return endHunt(p);
      const d = Math.hypot(H.x - p.ti % W.w, H.y - ((p.ti / W.w) | 0));
      if (d <= huntRange(t) + 1.2) { p.fx = H.x; p.fy = H.y; p.face = H.x < p.ti % W.w ? -1 : 1; p.step = 2; p.st = 2; p.hidden = false; p.wake = W.tick + 6 + rint(10); return; }
      if (++p.cnt > 4) return endHunt(p);
      return stalk(p, H);
    }
    case 2: {  // the throw, the shot, the thrust
      const H = p.obj;
      if (!H || H.n <= 0) return endHunt(p);
      huntStrike(p, H);
      return;
    }
    case 3: { p.step = 4; p.st = 2; p.wake = W.tick + 20 + rint(10); p.atkT = W.tick; return; }  // reached the carcass: butcher it
    case 4: {
      const C = p.obj; p.obj = null;
      const T = HERD_TYPES[C.type], m = t.mod;
      p.carry = (8 + T.meat * 2.8) * m.hunt * t.toolMul * workRate(p, J.HUNT); p.ctype = R.FOOD;
      if (knows(t, 'hides')) t.stock[R.CLOTH] += T.meat * 0.05;
      C.butchered = true;
      p.skill++;
      p.step = 5;
      walk(p, depotFor(p), 6, 0);
      return;
    }
    case 5: return walk(p, depotFor(p), 6, 0);  // the search was busy last time
    default: deposit(p); didWork(p, J.HUNT); endTask(p);
  }
}
function huntStrike(p, H) {
  const t = p.town, T = HERD_TYPES[H.type], tick = W.tick, k = Math.min(H.n, 9) - 1;
  animalAt(H, Math.max(k, 0), _ap);
  p.atkT = tick; p.fx = _ap.x; p.fy = _ap.y;
  const r = huntRange(t), ranged = r > 3;
  if (ranged) shot(p.ti % W.w, (p.ti / W.w) | 0, _ap.x, _ap.y, r > 7 ? 2 : 0);
  const skill = 1 + Math.min(p.skill, 40) * 0.008;
  const hit = rnd() < 0.62 * p.aimM * skill * Math.sqrt(t.mod.hunt);
  if (hit) H.wound = (H.wound || 0) + p.str * (ranged ? 1 : 1.2) * (r > 7 ? 2.5 : 1);
  // anything struck turns on its attacker or bolts
  const angry = T.bite && rnd() < T.bite * (hit ? 0.8 : 0.3) * (ranged ? 0.4 : 1);
  H.flee = tick + 40;
  const dx = H.x - p.ti % W.w, dy = H.y - ((p.ti / W.w) | 0), d = Math.max(0.1, Math.hypot(dx, dy));
  if (!T.pred) { H.tx = clamp(H.x + dx / d * (10 + rnd() * 10), 2, W.w - 3); H.ty = clamp(H.y + dy / d * (10 + rnd() * 10), 2, W.h - 3); }
  if (hit && (H.wound || 0) >= (T.hp || 1)) {
    H.wound = 0; H.n--;
    if (FXH) FXH.blood(_ap.x, _ap.y, 5);
    const C = dropCarcass(_ap.x, _ap.y, H.type, p.ti % W.w > _ap.x);
    plogFirst(p, T);
    p.game++;
    if (T.pred) { p.fame += 0.5; t.preyed = 0; if (hasTrait(p, 'keeneye') || rnd() < 0.1) plog(p, `Killed one of the ${T.name} that had been preying on ${t.name}.`); }
    if (H.type === 2 && H.n === 0 && !W.mammothNote) { W.mammothNote = true; chronT('misc', `Hunters near ${t.name} kill what may be the last great mammoths of the region.`, t); }
    p.obj = C; p.step = 3;
    const to = Math.round(_ap.y) * W.w + Math.round(_ap.x);
    if (W.water[to]) { C.butchered = true; p.obj = null; return endHunt(p); }
    walk(p, to, 3, 0);
    return;
  }
  if (angry) {
    p.hitT = tick;
    p.hp -= (12 + rnd() * 32) * (1 + ((T.hp || 1) - 1) * 0.2);
    if (FXH) FXH.blood(p.ti % W.w, (p.ti / W.w) | 0, 3);
    if (p.hp <= 0) {
      killPerson(p, `killed by ${T.name}`);
      t.preyed = 1;
      if (tn(t) > 20 && rnd() < 0.2) chronT('misc', `${T.name === 'mammoth' ? 'A mammoth' : cap(T.name)} kill${T.name === 'mammoth' ? 's' : ''} the hunter ${p.name} of ${t.name}.`, t);
      return;
    }
    plog(p, `Mauled while hunting ${T.name}.`);
    return endHunt(p);
  }
  if (++p.cnt > 5) return endHunt(p);
  p.step = 1; p.st = 0; p.wake = tick + 4 + rint(6);
}
function plogFirst(p, T) { if (!p.game) plog(p, `Brought down their first ${T.name.replace('wild ', '').replace(/s$/, '')}.`); }
function dropCarcass(x, y, type, left) {
  const A = W.carcasses;
  if (A.length > 160) A.shift();
  const c = { x, y, type, t: W.tick, left: !!left, butchered: false };
  A.push(c);
  return c;
}
// Predators prowl: they pull down wild herds, take livestock, and sometimes a person who's alone outside the walls.
function predatorAct(h) {
  const T = HERD_TYPES[h.type], tick = W.tick;
  if (tick < (h.next || 0)) return;
  h.next = tick + 120 + rint(260);
  let town = null, bd = 1e9;
  for (const t of W.towns) { const d = (t.x - h.x) ** 2 + (t.y - h.y) ** 2; if (d < bd) { bd = d; town = t; } }
  const near = town && bd < (town.radius + 8) * (town.radius + 8) && !town.attack;
  if (near && town.tameHerd && town.tameHerd.n > 2 && rnd() < 0.35) {
    const H = town.tameHerd; h.tx = H.x; h.ty = H.y;
    animalAt(H, 0, _ap); H.n--; dropCarcass(_ap.x, _ap.y, H.type, rnd() < 0.5); if (FXH) FXH.blood(_ap.x, _ap.y, 4);
    town.preyed = 1;
    return;
  }
  if (near && tn(town) > 12 && rnd() < 0.05 + T.bite * 0.3) {
    for (let k = 0; k < 6; k++) {
      const p = town.members[rint(town.members.length)];
      if (p.hidden || p.btl || p.army || p.aboard) continue;
      const x = p.ti % W.w, y = (p.ti / W.w) | 0;
      if (Math.hypot(x - h.x, y - h.y) > 14) continue;
      h.x = x + 0.5; h.y = y + 0.5; h.tx = h.x; h.ty = h.y; h.flee = tick + 4;
      p.hitT = tick;
      town.preyed = 1;
      if (FXH) FXH.blood(x, y, 4);
      if (rnd() < T.bite) {
        const who = p.name;
        killPerson(p, `killed by ${T.name}`);
        if (town.alive && tn(town) > 25 && rnd() < 0.15) chronT('misc', `${cap(T.name)} kill ${who} just outside ${town.name}.`, town);
      } else plog(p, `Attacked by ${T.name} and got away.`);
      return;
    }
  }
  // otherwise go after whatever is grazing nearby
  let prey = null; bd = 400;
  for (const o of W.herds) { if (o === h || o.owner || HERD_TYPES[o.type].pred || o.n <= 0) continue; const d = (o.x - h.x) ** 2 + (o.y - h.y) ** 2; if (d < bd) { bd = d; prey = o; } }
  if (prey) {
    h.tx = prey.x; h.ty = prey.y;
    if (bd < 16 && prey.n > 1) { animalAt(prey, Math.min(prey.n, 9) - 1, _ap); prey.n--; prey.flee = tick + 40; prey.tx = clamp(prey.x + (prey.x - h.x) * 3, 2, W.w - 3); prey.ty = clamp(prey.y + (prey.y - h.y) * 3, 2, W.h - 3); dropCarcass(_ap.x, _ap.y, prey.type, h.x > _ap.x); if (FXH) FXH.blood(_ap.x, _ap.y, 3); }
  }
}

// ---- planting: berries near camp, trees where the forest has gone, gardens, orchards, vines. A plot belongs to a town. ----
const PLANT_IX = {}; PLANTS.forEach((P, k) => { if (P) { PLANT_IX[P.id] = k; P.res = R[P.r]; } });
const plantFits = (k, i) => { const P = PLANTS[k], c = W.temp[i], m = W.moist[i]; return c >= P.tMin && c <= P.tMax && m >= P.mMin && !W.water[i] && !W.river[i] && W.occ[i] === 0 && !W.plant[i] && !W.ore[i] && W.road[i] < 1; };
function setPlant(t, i, k) {
  W.plant[i] = k; W.plantS[i] = 0;
  W.forage[i] = 0;
  t.plots.push({ i, k, age: 0, ripe: false, by: 0 });
  t.plotC[k]++;
  dirty(i);
}
function clearPlot(t, f, j) {
  const last = t.plots.length - 1;
  t.plots[j] = t.plots[last]; t.plots.pop();
  t.plotC[f.k]--;
}
// Abandoned plots go wild: berries and fruit keep feeding whoever comes by, the rest fades back into grass.
function releasePlots(t) {
  for (const f of t.plots) {
    if (W.plant[f.i] !== f.k) continue;
    const P = PLANTS[f.k];
    W.plant[f.i] = 0; W.plantS[f.i] = 0;
    if (P.id === 'berries' || P.id === 'fruit') W.forage[f.i] = W.baseForage[f.i] = Math.max(W.baseForage[f.i], 5);
    if (P.id === 'fruit' || P.id === 'sapling') W.tree[f.i] = W.baseTree[f.i] = Math.max(W.baseTree[f.i], 2);
    dirty(f.i);
  }
  t.plots.length = 0;
  t.plotC.fill(0);
}
function plotSeason(t, season) {
  const F = t.plots;
  for (let j = F.length - 1; j >= 0; j--) {
    const f = F[j], P = PLANTS[f.k];
    if (W.plant[f.i] !== f.k) { clearPlot(t, f, j); continue; }  // built over, burned or paved
    f.age++;
    const was = W.plantS[f.i];
    if (P.id === 'sapling') {
      if (f.age >= P.grow) {  // grown up: now it's simply a tree
        W.plant[f.i] = 0; W.plantS[f.i] = 0;
        W.tree[f.i] = Math.max(W.tree[f.i], 3 + rint(3)); W.baseTree[f.i] = Math.max(W.baseTree[f.i], 4);
        updCost(f.i); dirty(f.i);
        clearPlot(t, f, j);
      } else { const s = f.age >= 5 ? 1 : 0; if (s !== was) { W.plantS[f.i] = s; dirty(f.i); } }
      continue;
    }
    const cold = season === 3 && W.temp[f.i] < 0.55;
    if (f.age >= P.grow && !cold && (f.age - P.grow) % P.every === 0) f.ripe = true;
    const s = f.ripe ? 2 : f.age >= P.grow ? 1 : 0;
    if (s !== was) { W.plantS[f.i] = s; dirty(f.i); }
  }
}
// Keeps going until the town has about what it could use of each thing it knows how to grow.
function choosePlant(t) {
  const n = tn(t), st = t.stock, c = t.plotC;
  const knowsP = id => knows(t, PLANTS[PLANT_IX[id]].tech);
  const hungry = st[R.FOOD] < n * 3;
  const opts = [];
  const add = (id, room, w) => { if (w > 0 && knowsP(id) && c[PLANT_IX[id]] < room) opts.push([PLANT_IX[id], w]); };
  add('berries', n * 0.14 + 5, t.nomad ? 2 : hungry ? 1.5 : 0.6);
  if (t.nomad) return opts.length ? opts[0][0] : 0;
  const trees = t.sTree.length;
  add('sapling', n * 0.2 + 14, (trees < n * 0.5 + 12 || st[R.WOOD] < wantOf(t, R.WOOD) * 0.5) ? 2.2 : 0.2);
  add('veg', n * 0.16 + 5, hungry ? 2.4 : 0.8);
  add('fruit', n * 0.08 + 3, hungry ? 1.2 : 0.7);
  add('herbs', n * 0.025 + 2, t.sick > 0 || t.mod.health > 0.9 ? 0.7 : 0.25);
  add('flax', n * 0.05 + 2, st[R.CLOTH] < wantOf(t, R.CLOTH) ? 1.2 : 0.1);
  add('vines', n * 0.04 + 2, st[R.GOODS] < wantOf(t, R.GOODS) ? 0.9 : 0.2);
  if (!opts.length) return 0;
  let v = rnd() * opts.reduce((s, o) => s + o[1], 0);
  for (const o of opts) { v -= o[1]; if (v <= 0) return o[0]; }
  return opts[0][0];
}
function plantSite(t, k, p) {
  let best = -1, bs = -1e9;
  const L = t.sArable;
  if (!L.length) return -1;
  const x = p.ti % W.w, y = (p.ti / W.w) | 0;
  for (let q = 0; q < 12; q++) {
    const i = L[rint(L.length)];
    if (!plantFits(k, i) || W.tree[i] > 2) continue;
    let around = 0; for (let e = 0; e < 8; e++) if (W.plant[i + NB_D[e]] === k) around += 2; else if (W.occ[i + NB_D[e]] === 1) around += k === PLANT_IX.veg ? 1 : 0;
    const dT = Math.hypot(i % W.w - t.x, ((i / W.w) | 0) - t.y);
    const s = around - Math.hypot(i % W.w - x, ((i / W.w) | 0) - y) * 0.35 - (k === PLANT_IX.sapling ? Math.abs(dT - t.radius * 0.8) * 0.3 : dT * 0.25) + rnd();
    if (s > bs) { bs = s; best = i; }
  }
  return best;
}
function gardenStep(p) {
  const t = p.town;
  if (p.step === 0) {
    // what's ripe gets picked first
    const F = t.plots, now = W.tick;
    let best = null, bd = 1e9;
    for (let q = 0, n = Math.min(F.length, 30); q < n; q++) {
      const f = F[rint(F.length)];
      if (!f.ripe || now - f.by < 30 || W.plant[f.i] !== f.k) continue;
      const d = Math.abs(f.i % W.w - p.ti % W.w) + Math.abs(((f.i / W.w) | 0) - ((p.ti / W.w) | 0));
      if (d < bd) { bd = d; best = f; }
    }
    if (best) { best.by = now; p.obj = best; p.tgt = best.i; p.pk = 0; return walk(p, best.i, 1, 0); }
    const k = choosePlant(t);
    if (k) {
      const i = plantSite(t, k, p);
      if (i >= 0) { p.obj = null; p.tgt = i; p.pk = k; return walk(p, i, 1, 0); }
    }
    if (p.carry > 0) return walk(p, depotFor(p), 3, 0);
    p.task = 0;
    return sideJobOnce(p);
  }
  if (p.step === 1) { p.atkT = W.tick; p.fx = p.ti % W.w + 1; p.fy = (p.ti / W.w) | 0; return workFor(p, (p.obj ? 9 : 14) / (t.count.treenursery ? 1.5 : 1), 2); }
  if (p.step === 2) {
    const f = p.obj; p.obj = null;
    const k = p.pk; p.pk = 0;
    if (f) {
      if (f.ripe && W.plant[f.i] === f.k) {
        const P = PLANTS[f.k];
        f.ripe = false; W.plantS[f.i] = 1; dirty(f.i);
        const soil = Math.pow(W.fert[f.i] / 140, 0.5);
        const amt = P.yield * soil * Math.sqrt(t.mod.farm) * t.toolMul * workRate(p, J.GARDEN) * (t.count.greenhouse ? 1.1 : 1);
        if (p.carry > 0 && p.ctype !== P.res) t.stock[p.ctype] += p.carry, p.carry = 0;
        p.carry += amt; p.ctype = P.res;
      }
    } else if (k && plantFits(k, p.tgt)) {
      if (W.tree[p.tgt]) { t.stock[R.WOOD] += W.tree[p.tgt]; W.tree[p.tgt] = 0; updCost(p.tgt); }
      setPlant(t, p.tgt, k);
      if (W.people.length < 3000 && t.plots.length === 1 && tn(t) >= 12) chronT('misc', `${p.name} of ${t.name} plants ${PLANTS[k].name.toLowerCase()}, and people come to see if it will take.`, t);
    }
    p.cnt++;
    if (p.cnt < 4 && (p.carry < 16)) { p.step = 0; p.st = 0; p.wake = W.tick; return; }
    didWork(p, J.GARDEN);
    p.skill++;
    if (p.carry > 0) { p.step = 4; return walk(p, depotFor(p), 3, 0); }
    return endTask(p);
  }
  if (p.step === 4) return walk(p, depotFor(p), 3, 0);  // the search was busy last time
  deposit(p); didWork(p, J.GARDEN); endTask(p);
}

// ---- builders, crafters, scholars ----
function buildStep(p) {
  const t = p.town;
  if (p.step === 0) {
    const Q = t.queue;
    // the canal needs diggers whenever the town can spare them
    if (t.canalJob && (!Q.length || rnd() < 0.4)) { const c = t.canalJob, at = c.path[c.built]; if (at !== undefined) { p.obj = c; p.tgt = at; walk(p, nearLand(at), 1); return; } }
    if (t.fillJob && (!Q.length || rnd() < 0.35)) { const c = t.fillJob, at = c.tiles[c.built]; if (at !== undefined) { p.obj = c; p.tgt = at; walk(p, nearLand(at), 1); return; } }
    if (!Q.length) { p.task = 0; return sideJobOnce(p); }
    let best = Q[0], bd = 1e9;
    for (let k = 0; k < Q.length && k < 6; k++) {
      const b = Q[k], d = Math.abs(b.x - p.ti % W.w) + Math.abs(b.y - ((p.ti / W.w) | 0));
      if (d < bd) { bd = d; best = b; }
    }
    p.obj = best; p.tgt = best.i;
    walk(p, best.i, 1);
    return;
  }
  if (p.step === 1) { workFor(p, 30, 2); return; }
  const b = p.obj;
  if (b && b.path) { p.obj = null; digCanal(p, t); didWork(p, J.BUILD); endTask(p); return; }
  if (b && b.tiles) { p.obj = null; fillStep(p, t); didWork(p, J.BUILD); endTask(p); return; }
  if (b && t.queue.includes(b)) {
    b.prog += 30 * t.mod.build * t.toolMul * workRate(p, J.BUILD) * t.scale;
    if (b.prog >= b.need) finishBuilding(b);
  }
  p.skill++;
  didWork(p, J.BUILD);
  endTask(p);
}
function craftStep(p) {
  const t = p.town;
  if (p.step === 0) {
    const C = t.crafts;
    if (!C.length) { p.task = 0; return sideJobOnce(p); }
    const b = workSite(p, C);
    const rec = chooseRecipe(t, b.type);
    if (!rec && !BLD[b.type].forge) { p.task = 0; return sideJobOnce(p); }
    p.obj = b;
    walk(p, b.i, 1);
    return;
  }
  if (p.step === 1) { workFor(p, 45, 2, true); return; }
  const b = p.obj;
  if (b) {
    const def = BLD[b.type];
    const rec = chooseRecipe(t, b.type);
    // a smith forges arms whenever the town is short of them, and makes tools the rest of the time
    if (def.forge && forge(t, def.forge * t.scale)) p.skill++;
    else if (rec) {
      // a whole workshop's worth, if the stores can pay for it
      let times = t.scale;
      for (const k in rec.in) if (rec.in[k] > 0) times = Math.min(times, t.stock[k] / rec.in[k]);
      times = Math.max(1, times);
      for (const k in rec.in) t.stock[k] -= rec.in[k] * times;
      const mul = t.mod.craft * (1 + Math.min(p.skill, 30) * 0.01) * workRate(p, J.CRAFT) * times;
      for (const k in rec.out) { t.stock[k] += rec.out[k] * mul; t.outVal += rec.out[k] * mul * VALUE[k]; }
      p.skill++;
    }
    didWork(p, J.CRAFT);
  }
  endTask(p);
}
function chooseRecipe(t, type) {
  const list = RECIPES[type]; if (!list) return null;
  let best = null, bs = 0;
  for (const rec of list) {
    if (rec.tech && !knows(t, rec.tech)) continue;
    if (rec.not && knows(t, rec.not)) continue;
    if (!canPay(t.stock, rec.in)) continue;
    let s = 0;
    for (const k in rec.out) { const w = wantOf(t, +k); if (w > 0) s = Math.max(s, 1 - t.stock[k] / w); }
    if (s > bs) { bs = s; best = rec; }
  }
  return best;
}
function postStep(p) {
  const t = p.town;
  if (p.step === 0) {
    const j = p.job;
    let list = j === J.SCHOLAR ? t.studies : j === J.SAILOR ? t.ports : j === J.SOLDIER ? t.forts : t.services;
    if ((j === J.SCHOLAR || j === J.SERVICE) && deskWorker(p)) { const o = officesOf(t); if (o.length) list = o; }  // a desk job is done in an office
    if (j === J.SOLDIER && !list.length) {  // drill on open ground at the edge of town
      p.obj = null;
      walk(p, nearTile(t.i, 5), 1);
      return;
    }
    if (j === J.SCHOLAR && !list.length) {  // a clerk or tutor works at home
      p.obj = null;
      walk(p, p.home ? p.home.i : t.i, 1);
      return;
    }
    if (!list.length) { p.task = 0; return sideJobOnce(p); }
    const b = workSite(p, list);
    p.obj = b;
    walk(p, b.i, 1);
    return;
  }
  if (p.step === 1) { workFor(p, p.job === J.SOLDIER ? 40 : 70, 2, p.job !== J.SOLDIER && p.job !== J.SAILOR); return; }
  p.skill++;
  didWork(p, p.job);
  if (p.job === J.SOLDIER) p.xp = (p.xp || 0) + 0.04;
  if (p.job === J.SAILOR && t.shipQ) {
    const q = t.shipQ;
    q.prog += 60 * t.mod.build * t.toolMul * workRate(p, J.SAILOR) * t.scale;
    if (q.prog >= q.need) launchShip(t, q);
  }
  endTask(p);
}

// ---- trade: merchants carry surpluses to towns that lack them, and ideas and germs ride along ----
function bestCargo(from, to, cap) {
  let best = -1, bs = 0;
  for (let r = 0; r < R.N; r++) {
    const surplus = from.stock[r] - wantOf(from, r) * 0.9;
    if (surplus < 1) continue;
    const w = wantOf(to, r);
    if (w <= 0) continue;
    const lack = (w - to.stock[r]) / w;
    if (lack <= 0.05) continue;
    let s = lack * Math.min(surplus, cap) * (r === R.TIN || r === R.COPPER || r === R.IRON || r === R.COAL ? 2 : 1);
    // a real merchant goes where the price gap is
    if (from.polity.cur.kind >= 2) { const m0 = margin(from, to, r); if (m0 < 1.02) continue; s *= Math.min(m0, 3); }
    if (s > bs) { bs = s; best = r; }
  }
  return best;
}
function tradeStep(p) {
  const t = p.town, cap = 6 * t.mod.cargo * t.scale;
  if (p.step === 0) {
    if (!t.partners.length) { p.task = 0; return sideJobOnce(p); }
    const o = pick(t.partners);
    if (!o.alive) { endTask(p, 5); return; }
    const r = bestCargo(t, o, cap);
    const back = bestCargo(o, t, cap);
    if (r < 0 && back < 0) { p.task = 0; if (rnd() < 0.15) return firstContactWalk(p, o); return sideJobOnce(p); }
    if (r >= 0) { const a = Math.min(cap, t.stock[r] - wantOf(t, r) * 0.9); t.stock[r] -= a; p.carry = a; p.ctype = r; }
    p.obj = o;
    p.task = T_TRADE;
    walk(p, nearTile(o.i, 1), 1, 0);
    return;
  }
  if (p.step === 1) { workFor(p, 16, 2); return; }
  if (p.step === 2) {
    const o = p.obj;
    if (o && o.alive) {
      if (p.carry > 0 && p.ctype >= 0) { payForGoods(o, t, p.ctype, p.carry); p.cash += p.carry * o.price[p.ctype] * 0.02; o.stock[p.ctype] += p.carry; p.carry = 0; p.ctype = -1; }
      meet(t, o, p);
      const back = bestCargo(o, t, cap);
      if (back >= 0) { const a = Math.min(cap, o.stock[back] - wantOf(o, back) * 0.9); if (a > 0) { o.stock[back] -= a; p.carry = a; p.ctype = back; } }
    }
    walk(p, t.i, 3, 0);
    return;
  }
  if (p.carry > 0 && p.ctype >= 0) { const o2 = p.obj; if (o2 && o2.alive) payForGoods(t, o2, p.ctype, p.carry); t.stock[p.ctype] += p.carry; p.carry = 0; p.ctype = -1; }
  p.skill++;
  didWork(p, J.TRADE);
  endTask(p);
}
function firstContactWalk(p, o) { p.obj = o; p.task = T_TRADE; p.carry = 0; p.ctype = -1; walk(p, nearTile(o.i, 1), 1, 0); }
function meet(a, b, carrier) {
  if (!a.contacts[b.id]) {
    a.contacts[b.id] = 1; b.contacts[a.id] = 1;
    if (a.polity !== b.polity && a.culture !== b.culture && tn(a) > 25 && tn(b) > 25 && rnd() < 0.5) chronT('misc', `Merchants from ${a.name} reach ${b.name} and ${pick(['find a people who speak another tongue', 'trade through gestures', 'are stared at in the market'])}.`, b);
  }
  exchange(a, b, null);
  if (a.polity !== b.polity) adjustRel(a.polity, b.polity, 0.15);
  if (carrier && carrier.sick > 0 && b.sick <= 0 && rnd() < 0.6) infectTown(b, 3);
  if (b.sick > 0 && carrier && carrier.sick <= 0 && carrier.immune < year() && rnd() < 0.4) carrier.sick = 3;
}

// ---- plague ----
function infectTown(t, n) {
  const m = t.members;
  for (let k = 0; k < n; k++) { const p = pick(m); if (p && p.immune < year() && p.sick <= 0) p.sick = 2 + rint(2); }
  t.sick = 1;
}
function tryPlagueStart(t) {
  const n = tn(t), yr = year();
  if (n < 40 || t.sick > 0 || t.lastPlague > yr - 40) return;
  if (rnd() < 0.00035 * Math.sqrt(n) * (1 + t.partners.length * 0.1) * t.mod.plague * (t.mod.health < 1 ? t.mod.health : 1)) {
    t.lastPlague = yr;
    infectTown(t, 3 + Math.floor(n / 40));
    t.plagueDead = 0;
    W.plagueName = pick(['Red Fever', 'the Sweat', 'the Pox', 'the Coughing Sickness', 'the Black Fever', 'the Flux', 'Grey Plague', 'the Spotted Death']);
    t.plagueName = W.plagueName;
    chronT('plague', `${W.plagueName} breaks out in ${t.name}.`, t);
  }
}
function plagueSeason(t) {
  const m = t.members, n = m.length, yr = year();
  let I = 0; for (const p of m) if (p.sick > 0) I++;
  if (I === 0) {
    t.sick = 0;
    if (t.plagueDead >= 60 || (t.plagueDead >= 25 && t.plagueDead > tn(t) * 0.25)) chronT('plague', `The sickness passes from ${t.name}, leaving ${t.plagueDead} dead.`, t);
    t.plagueDead = 0;
    return;
  }
  // crowded, dirty streets pass it on; quarantine, clean water and a health service slow it down; good care keeps more of the sick alive
  const beta = 1.7 * I / n * t.mod.contagion * Math.sqrt(t.slumHz) * (t.quarantined > yr - 2 ? 0.6 : 1);
  const cfr = 0.09 * t.mod.plague * (1 - careCover(t) * t.medQ * 1.2);  for (let k = m.length - 1; k >= 0; k--) {
    const p = m[k];
    if (p.sick > 0) {
      p.sick--;
      const a = ageOf(p);
      if (rnd() < cfr * p.sickM * (a < 6 || a > 50 ? 1.7 : 1)) { t.plagueDead = (t.plagueDead || 0) + 1; t.sickY++; killPerson(p, 'plague'); continue; }
      if (p.sick === 0) { p.immune = yr + 25 + rint(30); if (rnd() < 0.06 && addTrait(p, 'survivor')) plog(p, 'Survived the sickness.'); }
    } else if (p.immune < yr && rnd() < beta) { p.sick = 2 + rint(2); }
  }
  if (!t.alive) return;
  // it travels with merchants on the road and sailors in the harbour, unless the gates are shut
  const share = I / Math.max(n, 1);
  for (const list of [t.partners, t.seaPartners || []]) for (const o of list) {
    if (o.sick > 0 || o.lastPlague >= yr - 10 || tn(o) <= 4) continue;
    let ch = (list === t.partners ? 0.15 : 0.1) * share * o.mod.contagion;
    // a town that knows about quarantine closes its gates when it hears what's coming
    if (o.tech[TECH_IX.quarantine] && share > 0.04) {
      if (o.quarantined < yr - 3 && tn(o) > 150) chronT('plague', `${o.name} shuts its gates and turns ships away: ${t.plagueName || 'sickness'} is loose in ${t.name}.`, o);
      o.quarantined = yr; ch *= 0.2;
    }
    if (rnd() < ch) {
      o.lastPlague = yr; o.plagueDead = 0; o.plagueName = t.plagueName; infectTown(o, 2);
      if (tn(o) > 260) chronT('plague', `${cap(t.plagueName || 'sickness')} spreads from ${t.name} to ${o.name}${list === t.partners ? '' : ' by ship'}.`, o);
    }
  }
}

// ---- ecology: one slice of the map each tick, so every tile gets visited once a year ----
function ecologySweep() {
  const n = W.w * W.h, per = Math.ceil(n / TPY);
  const { tree, baseTree, forage, baseForage, fert, baseFert, fish, baseFish, wear, road, occ, water } = W;
  let i = W.eco;
  for (let k = 0; k < per; k++) {
    i++; if (i >= n) i = 0;
    if (water[i]) {
      if (fish[i] < baseFish[i] && rnd() < 0.28) fish[i]++;
      // a lane nobody sails any more is forgotten in a few years
      fairwayYear(i);
      // a buoyed fairway stays charted while it lasts, even on the side nobody happened to use this year
      const ln = W.lane[i];
      if (ln) { const nv = W.seaW[i] ? Math.max(SEA_LANE, (ln * 0.75) | 0) : (ln * 0.75) | 0; W.lane[i] = nv; if (ln >= SEA_LANE && nv < SEA_LANE) dirty(i); }
      continue;
    }
    if (occ[i] === 0 && road[i] < 2) {
      if (tree[i] < baseTree[i]) {
        // saplings need a neighbouring tree to seed from
        if (rnd() < 0.2 && (tree[i] > 0 || tree[i + 1] > 1 || tree[i - 1] > 1 || tree[i + W.w] > 1 || tree[i - W.w] > 1)) { tree[i]++; updCost(i); dirty(i); }
      }
      if (forage[i] < baseForage[i] && rnd() < 0.3) forage[i]++;
    }
    if (k % 7 === 0) erosionStep(i);
    if (fert[i] < baseFert[i]) {
      fert[i] = Math.min(baseFert[i], fert[i] + (occ[i] !== 2 ? 5 : W.river[i] ? 6 : 2));
      if (W.river[i] && occ[i] === 2) fert[i] = Math.min(baseFert[i], fert[i] + 6);  // floods renew the soil
    }
    if (W.fish[i] < W.baseFish[i] && rnd() < 0.5) W.fish[i]++;
    const v = wear[i];
    if (v > 0) {
      wear[i] = v - Math.ceil(v * 0.07);
      const r = road[i];
      if (r > 0) {
        if (r === 1 && wear[i] < 35) { road[i] = 0; updCost(i); dirty(i); }
        else if (r === 2 && wear[i] < 130) { road[i] = 1; updCost(i); dirty(i); }
        else if (r >= 2 && wear[i] >= 800 && r < 3) {
          const own = W.townById[W.owner[i]];
          if (own && own.mod.paved) { road[i] = 3; updCost(i); dirty(i); }
        } else if (r === 3 && wear[i] >= 2400) {
          const own = W.townById[W.owner[i]];
          if (own && own.mod.car) { road[i] = 4; updCost(i); dirty(i); }
        }
      }
    }
    if (occ[i] === 4) {
      const b = W.bAt.get(i);
      if (b && b.ruin && year() - b.ruinYear > 160 && rnd() < 0.03) removeBuilding(b);
    }
  }
  W.eco = i;
}
function herdsTick() {
  const H = W.herds;
  for (let k = H.length - 1; k >= 0; k--) {
    const h = H[k];
    if (h.n <= 0) { H[k] = H[H.length - 1]; H.pop(); if (h.owner && h.owner.tameHerd === h) h.owner.tameHerd = null; continue; }
    const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.sqrt(dx * dx + dy * dy);
    if (HERD_TYPES[h.type].pred) predatorAct(h);
    if (h.n <= 0) continue;
    if (d < 0.5) {
      if (h.owner) { h.tx = h.owner.x + (rnd() - 0.5) * 14; h.ty = h.owner.y + (rnd() - 0.5) * 14; }
      else { h.tx = h.x + (rnd() - 0.5) * 24; h.ty = h.y + (rnd() - 0.5) * 24; }
      h.tx = clamp(h.tx, 2, W.w - 3); h.ty = clamp(h.ty, 2, W.h - 3);
      const i = (h.ty | 0) * W.w + (h.tx | 0);
      if (W.water[i] || W.biome[i] === B.SNOW) { h.tx = h.x; h.ty = h.y; }
      continue;
    }
    const run = h.flee > W.tick ? 1.5 : HERD_TYPES[h.type].pred ? 0.4 : 0.25;
    const nx = h.x + dx / d * run, ny = h.y + dy / d * run;
    if (W.water[(ny | 0) * W.w + (nx | 0)]) { h.tx = h.x; h.ty = h.y; continue; }
    h.x = nx; h.y = ny;
  }
  // carcasses lie where they fell until someone butchers them or the birds finish
  const C = W.carcasses;
  for (let k = C.length - 1; k >= 0; k--) { const c = C[k]; if (W.tick - c.t > (c.butchered ? 90 : 420)) { C[k] = C[C.length - 1]; C.pop(); } }
}
function herdsYear() {
  for (const h of W.herds) {
    const T = HERD_TYPES[h.type];
    const cap = h.owner ? 24 + h.owner.jobs[J.HERD] * 12 : T.cap;
    if (h.n > 0 && h.n < cap) h.n = Math.min(cap, h.n + Math.max(1, Math.round(h.n * 0.14)) * (rnd() < 0.8 ? 1 : 0));
    // herds that thrive send out new herds
    if (!h.owner && h.n >= T.cap * 0.9 && W.herds.length < W.herdMax && rnd() < 0.08) {
      h.n = Math.floor(h.n / 2);
      W.herds.push({ id: W.nextId++, x: h.x, y: h.y, type: h.type, n: h.n, tx: h.x + (rnd() - 0.5) * 30, ty: h.y + (rnd() - 0.5) * 30, owner: null });
    }
  }
}

// ---- rail and air ----
function maybeRail(t) {
  if (!t.mod.rail || tn(t) < 90 || t.nomad || (W.railJobs || 0) > 2 || t.hasRail >= 2 + Math.floor(tn(t) / 1500) || rnd() > 0.15) return;
  if (t.stock[R.STEEL] < 12 && t.stock[R.IRON] < 20) return;
  if ((t.count.station || 0) === 0) return;
  W.rails = W.rails || [];
  let best = null, bd = 1e9;
  for (const o of W.towns) {
    if (o === t || o.nomad || tn(o) < 60 || W.landId[o.i] !== W.landId[t.i]) continue;
    if (!o.mod.rail || o.hasRail >= 3) continue;
    if (W.rails.some(r => (r.a === t && r.b === o) || (r.a === o && r.b === t))) continue;
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    if (d < bd && d < 90) { bd = d; best = o; }
  }
  if (!best) return;
  nodeBudget = Math.max(nodeBudget, 1);
  const path = findPath(t.i, best.i, 0);
  if (!path || path === PATH_BUSY) return;
  W.rails.push({ a: t, b: best, path, built: 0, done: false, pos: 0, dir: 1, id: W.nextId++ });
  W.railJobs = (W.railJobs || 0) + 1;
  t.stock[R.STEEL] = Math.max(0, t.stock[R.STEEL] - 12);
  t.hasRail++; best.hasRail++;
  if (W.rails.length <= 6) chronT('misc', `Work begins on a railway from ${t.name} to ${best.name}.`, t);
}
function railTick() {
  if (!W.rails) return;
  markTrains();  // block signals: see ships.js
  for (let k = W.rails.length - 1; k >= 0; k--) {
    const r = W.rails[k];
    if (!r.done) {
      if (W.tick % 3 === 0) {
        const i = r.path[r.built++];
        if (i !== undefined && W.water[i] === 0) { W.rail[i] = 1; dirty(i); }
        if (r.built >= r.path.length) { r.done = true; r.pos = 0; W.railJobs--; if (W.rails.length <= 6) chronT('misc', `The first train runs from ${r.a.name} to ${r.b.name}.`, r.a); }
      }
      continue;
    }
    if (!r.a.alive || !r.b.alive) { W.rails.splice(k, 1); continue; }
    if (trainHeld(r, k)) continue;  // red signal: the line ahead is taken
    r.pos += r.dir * 0.7;
    if (r.pos >= r.path.length - 1 || r.pos <= 0) {
      const from = r.dir > 0 ? r.a : r.b, to = r.dir > 0 ? r.b : r.a;
      const cap = 40 * from.mod.cargo;
      for (let q = 0; q < 3; q++) { const c = bestCargo(from, to, cap); if (c < 0) break; const a = Math.min(cap / 3, from.stock[c] - wantOf(from, c) * 0.9); if (a > 0) { from.stock[c] -= a; to.stock[c] += a; } }
      exchange(from, to, null);
      r.dir = -r.dir; r.pos = clamp(r.pos, 0, r.path.length - 1);
      r.trips = (r.trips || 0) + 1;
      // a busy line gets a second track, and a second track wants land
      if (r.trips === 24) { for (const i of r.path) { if (W.rail[i] === 1) { W.rail[i] = 2; dirty(i); } } if (W.rails.length <= 12) chronT('misc', `The line from ${r.a.name} to ${r.b.name} is doubled.`, r.a); }
    }
  }
}
// Real flights between airports and airfields: see airTick in ships.js.
function planeTick() { airTick(); }

// ---- territory: towns project influence by size; each tile belongs to the strongest ----
let terrStr = null;
let onTerritory = null;
// A town's reach spreads out over the land, not as a circle: open grass and roads carry it far, forest, marsh, desert and
// mountains slow it, a big river is a natural border, and it never crosses the sea. A little lumpy noise lets borders wander.
// Each tile goes to whichever town holds it most firmly, measured as a share of that town's own reach.
const HOLD_BIOME = [0, 0, 0, 10, 10, 10, 16, 13, 18, 14, 15, 18, 10, 22, 28];
let terrDist = null, terrHold = null;
const terrBuckets = [], terrTouched = [];
function holdCost(i) {
  const x = i % W.w, y = (i / W.w) | 0;
  let c = HOLD_BIOME[W.biome[i]] || 12;
  c += Math.min(30, slopeAt(i) * 260);
  if (W.elev[i] > 0.45) c += (W.elev[i] - 0.45) * 60;
  if (W.river[i] >= 2) c += 18;
  if (W.road[i]) c *= 0.6;
  c *= 0.75 + hash2(x >> 3, y >> 3, 17) * 0.3 + hash2(x, y, 19) * 0.12;
  return c < 4 ? 4 : c > 250 ? 250 : Math.round(c);
}
function terrHoldAll() {
  const n = W.w * W.h;
  if (!terrStr || terrStr.length !== n) { terrStr = new Float32Array(n); terrDist = new Int32Array(n).fill(-1); terrHold = new Uint8Array(n); }
  for (let i = 0; i < n; i++) terrHold[i] = W.water[i] ? 0 : holdCost(i);
}
// One town's reach, cheapest first, bucket by bucket (the costs are small whole numbers), into str/own.
function terrFlood(t, str, own) {
  if (W.water[t.i]) return;
  const B0 = terrBuckets, T0 = terrTouched;
  const r = clamp(9 + Math.sqrt(tn(t)) * 1.5 + (t.nomad ? -2 : 0), 7, 46), budget = Math.round(r * 10);
  for (let b = 0; b <= budget; b++) { if (B0[b]) B0[b].length = 0; else B0[b] = []; }
  terrDist[t.i] = 0; B0[0].push(t.i); T0.push(t.i);
  for (let b = 0; b <= budget; b++) {
    const L = B0[b];
    for (let q = 0; q < L.length; q++) {
      const i = L[q];
      if (terrDist[i] !== b) continue;
      const s = 1 - b / (budget + 10);
      if (s > str[i]) { str[i] = s; own[i] = t.id; }
      for (let k = 0; k < 8; k++) {
        const j = i + NB_D[k], c = terrHold[j];
        if (!c) continue;
        const nd = b + (k < 4 ? c : (c * 1.41) | 0);
        if (nd > budget) continue;
        const d0 = terrDist[j];
        if (d0 < 0 || nd < d0) { if (d0 < 0) T0.push(j); terrDist[j] = nd; B0[nd].push(j); }
      }
    }
  }
  for (let k = 0; k < T0.length; k++) terrDist[T0[k]] = -1;
  T0.length = 0;
}
function updateTerritory() {
  terrJob = null;  // fresher than any spread-out pass still under way
  terrHoldAll();
  terrStr.fill(0); W.owner.fill(-1);
  for (const t of W.towns) terrFlood(t, terrStr, W.owner);
  if (onTerritory) onTerritory();
}
// The same borders worked out a couple of dozen towns a tick, so the new year doesn't stall on them; the map changes over in one go at the end.
let terrJob = null;
function terrBegin() {
  terrHoldAll();
  const n = W.w * W.h;
  if (!terrJob || terrJob.str.length !== n) terrJob = { w: W, towns: null, k: 0, str: new Float32Array(n), own: new Int16Array(n) };
  const J0 = terrJob;
  J0.w = W; J0.towns = W.towns.slice(); J0.k = 0; J0.str.fill(0); J0.own.fill(-1);
}
function terrStep() {
  const J0 = terrJob;
  if (!J0 || !J0.towns) return;
  if (J0.w !== W || J0.own.length !== W.owner.length) { terrJob = null; return; }
  const T = J0.towns, end = Math.min(T.length, J0.k + 24);
  for (; J0.k < end; J0.k++) terrFlood(T[J0.k], J0.str, J0.own);
  if (J0.k < T.length) return;
  W.owner.set(J0.own); J0.towns = null;
  if (onTerritory) onTerritory();
}

// ---- the crowd: past what the computer can run person by person, a town keeps some people individually and treats the rest as a number ----
// The individuals are a fair sample. What they earn is multiplied up by how many they stand for, and the crowd is born and dies at the rate they do,
// so a city of a hundred thousand still farms, trades, starves, catches plague and marches to war the same way.
function promoteFolk(t, count, adultsOnly) {
  const out = [];
  for (let k = 0; k < count && t.folk > 0; k++) {
    const r = rnd(), age = adultsOnly ? 18 + rnd() * 28 : r < 0.26 ? rnd() * 13 : r < 0.92 ? 14 + rnd() * 46 : 60 + rnd() * 18;
    const p = newPerson(t, rnd() < 0.5 ? 0 : 1, age);
    p.ti = p.nt = nearTile(t.i, 3);
    if (age >= 62) p.job = J.ELDER;
    t.folk--; W.folkN--;
    out.push(p);
  }
  t.scale = tn(t) / Math.max(1, t.members.length);
  return out;
}
function absorbPerson(p) {
  p.alive = false; p.cause = 'lost in the crowd';
  const P = W.people, last = P.pop();
  if (last !== p) { P[p.ix] = last; last.ix = p.ix; lodSlot(p.ix, last.id); }
  const t = p.town, M = t.members, lastM = M.pop();
  if (lastM !== p) { M[p.mi] = lastM; lastM.mi = p.mi; }
  if (p.home) p.home.res--;
  if (p.spouse) { p.spouse.spouse = null; p.spouse = null; }
  t.folk++; W.folkN++;
}
function folkYear(t) {
  const A = t.members.length, f = t.folk;
  if (f > 0 && A > 0) {
    const r = clamp((t.birthsY - t.deathsY) / A, -0.25, 0.09), d = Math.round(f * r);
    t.folk = Math.max(0, f + d); W.folkN += t.folk - f;
    if (d > 0) W.births += d; else W.deaths -= d;
  }
  const tot = tn(t), wp = worldPop(), cap = W.agentCap;
  const want = wp <= cap ? tot : clamp(Math.ceil(cap * tot / wp), Math.min(tot, 30), tot);
  if (A > want * 1.08) {
    let go = Math.ceil((A - want) * 0.3);
    for (let k = 0; k < go * 4 && go > 0 && t.members.length > 12; k++) {
      const p = t.members[rint(t.members.length)];
      if (p.army || p.btl || p.leader || p.aboard || p.task === T_MIGRATE || p.task === T_BOARD || p.task === T_RETURN) continue;
      if (typeof UI !== 'undefined' && (UI.follow === p || (Render.sel && Render.sel.obj === p))) continue;
      absorbPerson(p); go--;
    }
  } else if (A < want && t.folk > 0) promoteFolk(t, Math.ceil((want - A) * 0.3));
  t.scale = tn(t) / Math.max(1, t.members.length);
}

// ---- yearly person ----
function personYear(p) {
  const a = ageOf(p), t = p.town, m = t.mod;
  p.spd = walkSpeed(p);
  personMoney(p);
  if (!p.btl && p.hp < p.hpMax) p.hp = Math.min(p.hpMax, p.hp + p.hpMax * 0.5);
  // mortality: infant risk, background risk, then ageing
  let hz;
  if (a < 5) hz = 0.075 * m.infant;
  else if (a < 15) hz = 0.009 * m.health;
  else hz = (0.0085 * m.health + 0.00042 * Math.exp(0.082 * (a - 5 * (1 - m.health) * 4)));
  if (p.hunger >= 1) hz *= 1.6;
  // poor food, foul air and poverty all shorten a life; a rich person can buy their way out of some of it
  hz *= p.lifeM * t.slumHz * (1.18 - t.dietScore * 0.32) * (1 + t.smog * 0.35);
  if (t.polity.cur.kind >= 2 && p.cash > (t.wage || 1) * 6) hz *= 0.82;
  // a healer within reach, and what they know, is the difference between a fever and a funeral
  hz *= 1 - careCover(t) * t.medQ * (a < 5 ? 1.15 : a > 60 ? 0.6 : 1);
  if (rnd() < hz) { killPerson(p, a < 5 ? 'childhood illness' : a > 55 ? 'old age' : pick(['fever', 'an accident', 'infection', 'a wound'])); return; }

  if (a >= 13 && a < 14 && p.job === J.CHILD && !(p.sch > 0)) p.job = J.NONE;
  if (a >= 62 && p.job !== J.SOLDIER && !p.spare) { p.spare = true; p.job = J.ELDER; }

  // marriage
  if (a >= 16 && a < 46 && !p.spouse && p.sex === 0) {
    const m2 = t.members;
    for (let k = 0; k < 10; k++) {
      const o = m2[rint(m2.length)];
      if (o.sex === 1 && !o.spouse && !o.army && ageOf(o) >= 16 && ageOf(o) < 55 && (o.momId !== p.momId || p.momId < 0)) {
        p.spouse = o; o.spouse = p;
        plog(p, `Married ${o.name}.`); plog(o, `Married ${p.name}.`);
        if (o.home && !p.home && o.home.res < HOUSES[o.home.tier].cap) { p.home = o.home; p.home.res++; }
        else if (p.home && !o.home && p.home.res < HOUSES[p.home.tier].cap) { o.home = p.home; o.home.res++; }
        break;
      }
    }
    // no one here? look next door (a real source of gene and idea flow)
    if (!p.spouse && m2.length < 30 && t.partners.length && rnd() < 0.2) {
      const nb = pick(t.partners);
      const o = nb.members.find(q => q.sex === 1 && !q.spouse && !q.army && ageOf(q) >= 16 && ageOf(q) < 50);
      if (o) { moveTo(o, t); startMigrate(o, nearTile(t.i, 3)); p.spouse = o; o.spouse = p; plog(p, `Married ${o.name} of ${nb.name}.`); plog(o, `Left ${nb.name} to marry ${p.name}.`); }
    }
  }
  // housing
  if (!p.home && t.houses.length) {
    for (let k = 0; k < 8; k++) {
      const h = pick(t.houses);
      if (h.res < HOUSES[h.tier].cap) { h.res++; p.home = h; break; }
    }
  }
  // births
  if (p.sex === 0 && p.spouse && a >= 16 && a < 44 && p.kids < 9 && p.hunger === 0) {
    const crowd = t.cap >= tn(t) || t.nomad ? 1 : 0.45;
    const room = 1 - Math.pow(worldPop() / W.maxPop, 2.5);
    // lean years and no land of their own to farm: people marry later and have fewer children, which is how most of history kept its numbers down
    const food = (t.stock[R.FOOD] > tn(t) * 0.9 ? 1 : t.stock[R.FOOD] > tn(t) * 0.3 ? 0.7 : 0.35) * (t.starvedY > 0 ? 0.6 : 1) * (t.pushWhy === 'land' ? 0.7 : 1);
    const few = tn(t) < 30 ? 1.25 : 1;
    const modern = m.infant < 0.5 ? 0.65 : 1;  // the demographic transition
    const educated = 1 - t.literacy * 0.35;     // and the more people read, the smaller the family
    const nomadSpacing = t.nomad ? 0.8 : 1;  // a band on the move spaces its children about three years apart
    if (year() - p.lastBirth >= (t.nomad ? 3 : 2) && rnd() < 0.42 * crowd * room * food * modern * educated * nomadSpacing * few * p.fertM * t.crowdBirth * m.birth * (1 - t.polity.cur.slump * 0.3)) {
      const c = newPerson(t, rnd() < 0.5 ? 0 : 1, 0, p, p.spouse);
      c.ti = c.nt = p.ti;
      c.home = p.home; if (p.home) p.home.res++;
      p.kids++; p.lastBirth = year(); if (p.spouse) p.spouse.kids++;
      plog(p, `Gave birth to ${c.name}.`); plog(p.spouse, `Child born: ${c.name}.`);
      plog(c, `Born in ${t.name}.`);
      p.lastKid = c; if (p.spouse) p.spouse.lastKid = c;
      W.births++; t.birthsY++;
    }
  }
}

// ---- the tick ----
// stepWorld's copy of each list slot's person id, kept in step wherever someone is added or moved (lodSlot), so the turns pass the
// others over without reaching into the person, or even the list, at all. Rebuilt whole for a new or loaded world, and once a year.
let LOD_ID = new Int32Array(0), LOD_W = null;
function lodSlot(k, id) {
  if (LOD_W !== W) return;
  if (k >= LOD_ID.length) { const g = new Int32Array(k + 4096); g.set(LOD_ID); LOD_ID = g; }
  LOD_ID[k] = id;
}
function lodRebuild() {
  const P = W.people, n = P.length;
  if (LOD_ID.length < n) LOD_ID = new Int32Array(n + 4096);
  for (let k = 0; k < n; k++) LOD_ID[k] = P[k].id;
  LOD_W = W;
}
function stepWorld() {
  W.tick++;
  const tick = W.tick;
  const P = W.people;
  nodeBudget = 3000 + Math.min(4000, P.length >> 4);
  const m0 = tick % TPY;
  // huge crowds are visited in turns, moving further each visit: same pace, a fraction of the work
  const n0 = P.length, turn = n0 < 5000 ? 1 : n0 < 12000 ? 2 : n0 < 24000 ? 3 : n0 < 45000 ? 4 : 6;
  const vw = VIEW.x1 >= VIEW.x0, vx0 = VIEW.x0, vx1 = VIEW.x1, vy0 = VIEW.y0, vy1 = VIEW.y1, w = W.w;
  if (turn === 1) {
    for (let k = n0 - 1; k >= 0; k--) {
      const p = P[k];
      if (p.st === 1) {
        if (vw && p.path.length === 2) { const i = glideTile(p); if (inView(i)) unquiet(p, i); }
        p.mv += p.spd; if (p.mv >= p.need) stepTile(p);
      }
      else { if (p.mv > 0) settle(p); if (tick >= p.wake) think(p); }
      if ((p.id + m0) % TPY === 0 && p.alive) personYear(p);
    }
  } else if (!vw) {
    // nobody is on screen to glide (far out, or no screen): only this turn's share is visited. Each slot's id is kept beside the list,
    // so the others are passed over without reaching into the person at all (a slot whose occupant changed is read afresh).
    if (LOD_W !== W || m0 === 0) lodRebuild();
    for (let k = n0 - 1; k >= 0; k--) {
      if ((LOD_ID[k] + tick) % turn !== 0) continue;
      const p = P[k];
      if (!p) continue;  // the list shrank under us this tick
      if (p.st === 1) { p.mv += p.spd * turn; while (p.st === 1 && p.mv >= p.need) stepTile(p); }
      else { if (p.mv > 0) settle(p); if (tick >= p.wake) think(p); }
      if ((p.id + m0) % TPY === 0 && p.alive) personYear(p);
    }
  } else {
    // (the renderer carries each walker on between visits, so the turns don't show as hops: see personPos)
    for (let k = n0 - 1; k >= 0; k--) {
      const p = P[k];
      if (vw && p.st === 1 && p.path.length === 2) { const i = glideTile(p); if (inView(i)) unquiet(p, i); }  // inView knows the Earth map wraps
      if ((p.id + tick) % turn !== 0) continue;
      if (p.st === 1) { p.mv += p.spd * turn; while (p.st === 1 && p.mv >= p.need) stepTile(p); }  // every step they've earned since the last visit
      else { if (p.mv > 0) settle(p); if (tick >= p.wake) think(p); }
      if ((p.id + m0) % TPY === 0 && p.alive) personYear(p);
    }
  }
  LOD_TURN = turn;
  if (tick % 4 === 0) herdsTick();
  if (tick % WX_EVERY === 0) weatherTick();
  ecologySweep();
  snowSweep();
  if (W.storms.length || tick % 30 === 0) stormsTick();
  if (W.surges && W.surges.length) surgesTick();
  if (W.burning.length || W.swarms.length || W.cyclones.length || (W.clim.ash > 0 && tick % TPY === 0)) disastersTick();
  // who's standing where: the street gets slower as it fills, and people route round it
  // only on screen: off it, nobody is watching the jam and the streets count as clear
  if (tick % (n0 > 8000 ? 32 : 16) === 0) {
    const N = W.tileN; N.fill(0);
    if (VIEW.x1 >= VIEW.x0) {
      const w = W.w, x0 = VIEW.x0, x1 = VIEW.x1, y0 = VIEW.y0, y1 = VIEW.y1;
      for (let k = 0; k < n0; k++) {
        const p = P[k];
        if (!p || p.hidden) continue;
        const i = p.ti, x = i % w, y = (i / w) | 0;
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        if (N[i] < 250) N[i]++;
      }
    }
  }
  if (tick % (TPY * 6) === 120) pathCache.clear();
  const towns = W.towns;
  for (let k = towns.length - 1; k >= 0; k--) {
    const t = towns[k];
    if ((tick + t.offset) % TPSEASON === 0) townSeason(t, Math.floor((tick + t.offset) / TPSEASON) % 4);
    if (t.alive && (tick + t.offset) % TPY === 7) { townYear(t); if (t.alive) maybeRail(t); }
    else if (t.alive && (tick + t.offset) % TPY === 120) cityYear(t);  // its streets and car parks, half a year from its own new year (once spread out, not all on the world's)
  }
  if (tick % TPSEASON === 0) {
    const s = seasonOf();
    for (const t of towns) fieldSeason(t, s);
    meltSeason();
  }
  if (tick % 20 === 0) for (let k = W.armies.length - 1; k >= 0; k--) armyUpdate(W.armies[k]);
  for (let k = W.battles.length - 1; k >= 0; k--) battleStep(W.battles[k]);
  if (W.convoys.length) convoysTick();
  if (W.missiles.length) missilesTick();
  if (W.ships.length) shipTick();
  if (W.rails) railTick();
  if (tick % 2 === 0 && W.polities.some(p => p.alive && p.techs > 60)) planeTick();
  const yp = tick % TPY;
  if (yp < 9) yearlyWorld(yp);
  if (terrJob && terrJob.towns) terrStep();
}
// The new year's world-wide work, spread over its first few ticks (a phase a tick) so the turn of the year doesn't stall the game.
function yearlyWorld(ph) {
  if (ph === undefined) { for (let k = 0; k < 9; k++) yearlyWorld(k); for (const t of W.towns) if (t.alive) cityYear(t); if (terrJob && terrJob.towns) { while (terrJob && terrJob.towns) terrStep(); } return; }
  if (ph === 1) { updatePolities(); return; }
  if (ph === 2) { revolutionsYear(); for (const pol of W.polities) if (pol.alive && pol.towns > 1) reliefYear(pol); return; }
  if (ph === 3) { econYear(); return; }
  if (ph === 4) { landYear(); return; }
  if (ph === 5) { roadsYear(); modernYear(); return; }
  if (ph === 6) { if (W.terrDirty || Math.floor(W.tick / TPY) % 3 === 0) { W.terrDirty = false; terrBegin(); } return; }
  if (ph === 7) { yearHistory(); return; }
  if (ph === 8) { disastersYear(); canalsYear(); return; }
  // weather wanders: most years are fine, some regions have droughts or floods
  const c = W.climate, drift = W.climateDrift;
  // the weather itself makes the ordinary good and bad years now; this is only the slow swing between wetter and drier decades
  for (let k = 0; k < 100; k++) {
    const shock = (rnd() + rnd() + rnd() - 1.5) * 0.1;
    c[k] = clamp(1 + (c[k] - 1) * 0.75 + shock, 0.3, 1.5);
  }
  if (rnd() < 0.012) {
    const cx = rint(10), cy = rint(10);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (cy + dy >= 0 && cy + dy < 10 && cx + dx >= 0 && cx + dx < 10) c[(cy + dy) * 10 + cx + dx] = 0.3;
    const big = W.towns.filter(t => Math.abs(t.x / W.w * 10 - cx) < 3 && Math.abs(t.y / W.h * 10 - cy) < 3 && tn(t) > 50);
    if (big.length) chronT('famine', `Great drought across the lands around ${big[0].name}.`, big[0]);
  }
  herdsYear();
  climateYear();
}
function yearHistory() {
  const yr = Math.floor(W.tick / TPY);
  if (yr % 5 === 0) {
    const row = { yr, pop: worldPop(), towns: W.towns.length, cities: W.towns.filter(t => tn(t) >= 220).length, techs: Object.keys(W.firsts).length + TECHS.filter(T => T.start).length, pols: [] };
    const top = W.polities.filter(p => p.alive && p.pop > 0).sort((a, b) => b.pop - a.pop).slice(0, 10);
    row.pols = top.map(p => [p.id, p.pop, p.techs]);
    W.history.push(row);
    if (W.history.length > 1600) { W.history = W.history.filter((_, k) => k % 2 === 0); }
  }
}

// ---- starting the world ----
const SAVE_VER = 7;
function createWorld(opt) {
  const world = genWorld(opt);
  W = world;
  W.townById = {};
  W.climate.fill(1);
  W.herdMax = Math.max(W.herds.length * 1.4, 50);
  W.ver = SAVE_VER;
  W.ships = []; W.shipMax = Math.max(60, (W.w * W.h) / 400); W.wars = []; W.battles = []; W.shots = []; W.warLog = []; W.fires = []; W.fights = []; W.carcasses = []; W.convoys = []; W.missiles = []; W.assembly = null; W.gamesN = 0; W.folkN = 0; W.agentCap = opt.agentCap || 60000; W.burning = []; W.swarms = []; W.cyclones = []; W.faiths = [];
  W.eraNow = 0;
  // a few peaks are volcanoes
  W.volcanoes = [];
  for (let q = 0; q < 8000 && W.volcanoes.length < Math.max(2, W.w * W.h / 30000); q++) { const i = rint(W.w * W.h); if (W.elev[i] > 0.45 && !W.water[i] && !W.volcanoes.some(v => Math.abs(v % W.w - i % W.w) < 30 && Math.abs(v / W.w - i / W.w) < 30)) W.volcanoes.push(i); }
  initPathing();
  linkSeaNet();
  initWeather();
  // first peoples start where a band could actually live: mild, wet, plenty to gather
  const lands = [];
  for (let i = 0; i < W.w * W.h; i += 3) {
    if (W.water[i] || W.river[i] || W.temp[i] < 0.42 || W.temp[i] > 0.9) continue;
    const b = W.biome[i];
    if (b === B.ROCK || b === B.SNOW || b === B.MARSH || b === B.DESERT || b === B.TUNDRA) continue;
    let food = 0, wet = 0, things = 0;
    for (let k = 0; k < 40; k++) {
      const j = i + (rint(25) - 12) + (rint(25) - 12) * W.w;
      if (j > 0 && j < W.occ.length) { food += W.forage[j]; if (W.river[j] || W.biome[j] === B.LAKE) wet++; if (W.ore[j] > 0) things++; if (W.tree[j]) things += 0.2; }
    }
    // nobody starts where there's nothing to drink
    if (food >= 26 && wet >= 1) lands.push(i);
  }
  if (lands.length < 50) for (let i = 0; i < W.w * W.h; i += 3) if (!W.water[i] && !W.river[i] && W.temp[i] > 0.3 && W.biome[i] !== B.ROCK && W.biome[i] !== B.SNOW) lands.push(i);
  const starts = [];
  const want = opt.tribes || 8;
  for (let g = 0; g < 4000 && starts.length < want; g++) {
    const i = pick(lands);
    if (!i) break;
    const minD = Math.min(W.w, W.h) * Math.max(0.03, 0.32 - g * 0.00015);
    if (starts.some(s => tdist(s, i) < minD)) continue;
    starts.push(i);
  }
  for (const i of starts) spawnTribe(i, opt.perTribe || 22);
  if (W.autoPop === undefined) W.autoPop = !!opt.autoPop;
  scanAllTowns();
  updatePolities();
  updateTerritory();
  chron('misc', `People wander the world in ${starts.length} scattered bands, with fire, stone blades and very little else.`);
  return W;
}
function spawnTribe(i, count) {
  const c = makeCulture(null);
  const pol = newPolity(c);
  const t = newTown(pol, c, i, true);
  for (let k = 0; k < NT; k++) if (TECHS[k].start) t.tech[k] = 1;
  techDirty(t); recomputeMods(t);
  t.arsenal[1] = 0;
  t.stock[R.FOOD] = count * 14; t.stock[R.WOOD] = 12;
  for (let k = 0; k < count; k++) {
    const a = k < 4 ? 28 + rnd() * 20 : rnd() * 40;
    const p = newPerson(t, k % 2, a);
    p.ti = p.nt = nearTile(i, 3);
    p.kids = Math.floor(rnd() * 2);
  }
  // pair adults so the band isn't all strangers on day one
  const f = t.members.filter(p => p.sex === 0 && ageOf(p) >= 16), m = t.members.filter(p => p.sex === 1 && ageOf(p) >= 16);
  for (let k = 0; k < Math.min(f.length, m.length); k++) { f[k].spouse = m[k]; m[k].spouse = f[k]; }
  scanTown(t);
  planJobs(t);
  planBuildings(t);
  return t;
}
function scanAllTowns() { for (const t of W.towns) scanTown(t); }
