'use strict';
// A battle. Companies keep formation and take orders from a general with a plan; each soldier has a weapon, armour, stamina, nerve and a place in the line,
// picks a real opponent, and can be wounded, knocked down, routed or taken prisoner. Sieges are the same fight with walls, gates, engines and hunger added.

// ---- companies ----
const unitClass = p => p.mount === 2 ? 'armor' : p.mount === 1 ? 'horse' : WEAPONS[p.wep || 0].kind > 0 ? 'shot' : WEAPONS[p.wep || 0].role === 'pole' ? 'pike' : 'foot';
const UNIT_WORD = { foot: 'Swords', pike: 'Spears', shot: 'Bows', horse: 'Riders', armor: 'Armour' };
const UNIT_SPEED = { foot: 0.1, pike: 0.085, shot: 0.1, horse: 0.2, armor: 0.17 };
function formUnits(army) {
  const by = {};
  for (const p of army.soldiers) { const c = unitClass(p); (by[c] = by[c] || []).push(p); }
  // a handful of odd men out don't make a company: they fall in with the largest
  const biggest = Object.keys(by).sort((a, b) => by[b].length - by[a].length)[0];
  for (const c in by) if (c !== biggest && c !== 'armor' && by[c].length < 4) { by[biggest].push(...by[c]); delete by[c]; }
  army.units = [];
  const big = army.home.mod.tier >= 3 ? 44 : 28;
  const n = {};
  for (const c in by) {
    const L = by[c];
    const parts = Math.max(1, Math.round(L.length / big));
    for (let q = 0; q < parts; q++) {
      const men = L.filter((_, k) => k % parts === q);
      n[c] = (n[c] || 0) + 1;
      let word = UNIT_WORD[c];
      if (c === 'shot') word = WEAPONS[men[0].wep].kind === 2 ? 'Rifles' : 'Bows';
      const u = { id: W.nextId++, army, kind: c, name: `${ordinal(n[c])} ${word}`, men, cap: null, x: army.x, y: army.y, tx: army.x, ty: army.y, ux: 1, uy: 0, order: 'hold', form: c === 'shot' || c === 'armor' ? 'loose' : 'line', flank: 0, wing: 0, engaged: 0, coh: 1, fled: 0 };
      for (const p of men) p.unit = u;
      pickCaptain(u);
      reform(u);
      army.units.push(u);
    }
  }
}
function pickCaptain(u) { let b = null, bs = -1; for (const p of u.men) { const s = Math.min(p.xp, 40) * 0.2 + p.leadM * 3 + p.fame * 0.3; if (s > bs) { bs = s; b = p; } } u.cap = b; }
// Everyone gets a place in the company: ranks for a line, a point for a wedge, room to breathe for guns.
function reform(u) {
  const M = u.men, n = M.length;
  if (!n) return;
  const sp = u.form === 'loose' ? 1.35 : u.kind === 'horse' ? 1.2 : 0.85;
  if (u.form === 'wedge') {
    let row = 0, k = 0;
    while (k < n) { const w = row * 2 + 1; for (let c = 0; c < w && k < n; c++, k++) { M[k].slotX = (c - row) * sp; M[k].slotY = -row * sp; } row++; }
    return;
  }
  const ranks = clamp(Math.ceil(Math.sqrt(n / 3.5)), 1, 5), cols = Math.ceil(n / ranks);
  for (let k = 0; k < n; k++) { M[k].slotX = (k % cols - (cols - 1) / 2) * sp; M[k].slotY = -Math.floor(k / cols) * sp; }
}
const unitWidth = u => Math.ceil(u.men.length / clamp(Math.ceil(Math.sqrt(u.men.length / 3.5)), 1, 5)) * (u.form === 'loose' ? 1.35 : 0.85);

// ---- plans a general can have ----
const PLANS = {
  line: 'Advance in line and win it hand to hand.',
  hold: 'Stand on good ground and let them come.',
  flank: 'Pin them in front, send the riders round the side.',
  envelop: 'Let the wings run ahead and close them in.',
  feint: 'Pretend to run, draw them on, then turn.',
  wedge: 'One hard point at their general.',
  fire: 'Stand off and shoot them to pieces.',
  blitz: 'Armour straight through the middle, infantry behind.',
  mob: 'Everyone forward at once.',
};
function pickPlan(S, E, B) {
  const g = S.general && S.general.alive ? S.general : null, lead = g ? g.leadM : 0.8;
  let n = 0, horse = 0, shot = 0, arm = 0;
  for (const u of S.units) { const c = u.men.length; n += c; if (u.kind === 'horse') horse += c; else if (u.kind === 'shot') shot += c; else if (u.kind === 'armor') arm += c; }
  let e = 1; for (const u of E.units) e += u.men.length;
  const r = n / e, home = S.home, know = id => home && home.tech[TECH_IX[id]];
  if (!g) return 'mob';
  if (B.town && S === B.sB) return shot > n * 0.2 ? 'fire' : 'hold';
  if (arm > n * 0.08) return 'blitz';
  if (shot > n * 0.55 && (know('rifle') || know('trenches'))) return 'fire';
  if (n < 12) return 'mob';
  if (lead >= 1.2 && r > 1.25 && n >= 30) return 'envelop';
  if (horse > n * 0.12 && lead >= 0.95) return 'flank';
  if (r < 0.7 && S.hill) return 'hold';
  if (lead >= 1.25 && know('warband') && rnd() < 0.2) return 'feint';
  if (lead >= 1.05 && n >= 20 && rnd() < 0.3) return 'wedge';
  if (shot > n * 0.5) return 'fire';
  if (r < 0.65) return 'hold';
  return know('phalanx') ? 'line' : 'mob';
}

// ---- starting a fight ----
function newSide(B, pol, home) { return { pol, home, armies: [], units: [], general: null, plan: 'line', men0: 0, dead: 0, cap: 0, fled: 0, down: 0, pressure: 0, broken: false, x: B.x, y: B.y, ux: 1, uy: 0, morale: 60, air: false, fighters: false, drones: false, helis: false, hill: false, lastOrderT: 0, lastAir: 0, lastHeli: 0 }; }
function addArmy(S, army, B) {
  S.armies.push(army);
  army.battle = B; army.phase = 'battle'; army.camp = false; army.side = S;
  if (!S.general || !S.general.alive) S.general = army.general;
  if (!army.units.length) formUnits(army);
  for (const u of army.units) { pickCaptain(u); S.units.push(u); u.order = 'hold'; u.flank = 0; }
  for (const p of army.soldiers) {
    p.btl = B; p.side = S; p.task = T_FIGHT; p.st = 0; p.wake = W.tick + rint(8); p.hidden = false; p.foe = null; p.flee = false; p.down = false; p.stam = Math.max(p.stam, 40);
    if (p.mor < 25) p.mor = 25 + rnd() * 15;
  }
  S.men0 += army.soldiers.length;
  S.menN = (S.menN || 0) + menOf(army);
}
function startBattle(a, b, town) {
  const B = {
    id: W.nextId++, town, x: town ? town.x : (a.x + b.x) / 2, y: town ? town.y : (a.y + b.y) / 2, start: W.tick, war: a.war, over: false, name: '', phase: 'fight', endT: 0, wx: 0, sA: null, sB: null, stage: town ? 'invest' : 'field', wallHP: null, gates: null, breaches: 0, ladders: false, loot: new Float32Array(WEAPONS.length), fallen: [], prisoners: 0, firedA: 0, ambush: false, militia: null, rec: null, hunger: 0, stageT: W.tick,
  };
  const place = town ? town.name : nearName(B.x, B.y);
  B.name = `${town ? 'Siege' : 'Battle'} of ${place}`;
  B.wx = weatherAt(B.x, B.y);
  B.sA = newSide(B, a.pol, a.home);
  if (town) {
    // an occupied town is defended by its garrison, anywhere else by whoever lives there
    if (town.occupier) {
      const g = town.garrison;
      if (!g || !g.soldiers.length) { liberate(town, `welcomes the army of ${a.pol.name} and is rid of`); if (!nextObjective(a)) endArmy(a); return null; }
      B.sB = newSide(B, town.occupier, g.home);
      addArmy(B.sA, a, B);
      addArmy(B.sB, g, B);
    } else {
      // a hopeless town might just open its gates
      const mine = armyStrength(a), theirs = townStrength(town);
      if (mine > theirs * 3.5 && rnd() < 0.3 && town.fortHP <= 0) { surrenderTown(a, town); return null; }
      B.sB = newSide(B, town.polity, town);
      addArmy(B.sA, a, B);
      B.militia = raiseMilitia(town, B);
      addArmy(B.sB, B.militia, B);
    }
    town.attack = B;
    town.warYear = year();
    setupWalls(B, town);
  } else {
    B.sB = newSide(B, b.pol, b.home);
    addArmy(B.sA, a, B);
    addArmy(B.sB, b, B);
    // ambush: a clever general hiding in the trees gets a first blow
    const here = Math.round(a.y) * W.w + Math.round(a.x);
    if (W.tree[here] > 2 && a.general && a.general.leadM > 1.1 && rnd() < 0.4) { B.ambush = true; for (const p of b.soldiers) p.mor -= 15; }
  }
  deploy(B.sA, B.sB, B);
  deploy(B.sB, B.sA, B);
  B.sA.plan = pickPlan(B.sA, B.sB, B); B.sB.plan = pickPlan(B.sB, B.sA, B);
  applyPlan(B.sA, B); applyPlan(B.sB, B);
  B.sA.air = hasAir(B.sA); B.sB.air = hasAir(B.sB);
  W.battles.push(B);
  if (B.war) {
    B.war.battles.push({ name: B.name, yr: Math.floor(year()), dead: 0, won: null, x: B.x, y: B.y });
    B.rec = B.war.battles[B.war.battles.length - 1];
    if (B.war.battles.length > 40) B.war.battles.shift();
  }
  const na = B.sA.men0, nb = B.sB.men0;
  const ma = B.sA.menN || na, mb = B.sB.menN || nb;
  if (na + nb >= 40) chron('war', town ? `${a.pol.name} lays siege to ${town.name}: ${ma} against ${mb}.` : `${B.ambush ? 'From the trees, the' : 'The'} armies of ${a.pol.name} and ${b.pol.name} meet near ${place}, in ${WX_NAME[B.wx]}: ${ma} against ${mb}.`, Math.round(B.x), Math.round(B.y), town);
  return B;
}
function nearName(x, y) {
  let best = null, bd = 1e9;
  for (const t of W.towns) { const d = (t.x - x) ** 2 + (t.y - y) ** 2; if (d < bd) { bd = d; best = t; } }
  return best ? best.name : 'the plain';
}
function surrenderTown(a, town) {
  chronT('war', `${town.name} sees what's coming and opens its gates to the army of ${a.pol.name}.`, town);
  const B = { sA: { dead: 0 }, sB: { dead: 0 } };
  occupy(town, a, B);
  if (!nextObjective(a)) endArmy(a);
}
// Soldiers first, then whoever else can hold something. The old and the young go indoors.
function raiseMilitia(t, B) {
  const m = { id: W.nextId++, pol: t.polity, war: B.war, home: t, target: t, goal: 'garrison', soldiers: [], units: [], start: W.tick, size: 0, battle: B, kills: 0, lost: 0, tgtPol: t.polity, phase: 'battle', morale: 50 + (t.mod.morale || 0) + (t.polity.capital === t ? 10 : 0), general: null, guns: [], landed: true, sailing: 0, x: t.x, y: t.y, name: `Defenders of ${t.name}`, taken: 0, path: null, pi: 0, rally: t.i, food: 0, foodMax: 0, power: 0, musterEnd: 0, militia: true, nextConvoy: 0, wins: 0, starving: 0, camp: false, razed: 0, side: null, lastEnc: 0, width: 4, ranks: 0, arriveT: 0 };
  const adults = [];
  for (const p of t.members) {
    const v = ageOf(p);
    if (p.army || p.aboard || p.task === T_MIGRATE || W.water[p.ti]) continue;
    if (v >= 15 && v < 58) adults.push(p);
    else { p.task = T_REST; p.step = 0; }
  }
  if (t.scale > 1.2) for (const p of promoteFolk(t, Math.min(t.folk, 150, Math.floor(adults.length * (t.scale - 1) * 0.2)), true)) { p.ti = p.nt = nearTile(t.i, 4); adults.push(p); }
  // in a big town each defender stands for a band of neighbours behind them
  m.rep = Math.max(1, Math.round(Math.min(t.scale || 1, 60))); m.hpK = Math.sqrt(m.rep); m.held = 0; m.peak = 0;
  adults.sort((x, y) => (y.job === J.SOLDIER ? 2 : 0) + y.str - (x.job === J.SOLDIER ? 2 : 0) - x.str);
  const cap = Math.ceil(adults.length * (t.count.barracks ? 0.7 : 0.55)) + 4;
  for (let k = 0; k < adults.length; k++) {
    const p = adults[k];
    if (k >= cap) { p.task = T_REST; p.step = 0; continue; }
    p.prevJob = p.job; p.army = m; p.carry = 0; p.ctype = -1; p.hidden = false; p.sideJ = 0;
    issueGear(p, t);
    m.soldiers.push(p);
  }
  let bg = null, bs = -1;
  for (const p of m.soldiers) { const v = p.leadM * 4 + p.fame + (p.xp || 0) * 0.2 + (p.job === J.SOLDIER ? 2 : 0); if (v > bs) { bs = v; bg = p; } }
  m.general = bg;
  formUnits(m);
  return m;
}
// Where everyone stands at the start: guns and missiles out front, solid foot in the middle, riders on the wings, reserves behind.
function deploy(S, E, B) {
  let cx = 0, cy = 0, n = 0;
  for (const a of S.armies) for (const p of a.soldiers) { cx += p.ti % W.w; cy += (p.ti / W.w) | 0; n++; }
  S.x = n ? cx / n : B.x; S.y = n ? cy / n : B.y;
  let ex = 0, ey = 0, m = 0;
  for (const a of E.armies) for (const p of a.soldiers) { ex += p.ti % W.w; ey += (p.ti / W.w) | 0; m++; }
  ex = m ? ex / m : B.x; ey = m ? ey / m : B.y;
  const dx = ex - S.x, dy = ey - S.y, d = Math.max(0.5, Math.hypot(dx, dy));
  S.ux = dx / d; S.uy = dy / d;
  const px = -S.uy, py = S.ux;
  const line = S.units.filter(u => u.kind === 'foot' || u.kind === 'pike'), wings = S.units.filter(u => u.kind === 'horse'), front = S.units.filter(u => u.kind === 'shot' || u.kind === 'armor');
  const i0 = (Math.round(S.y) * W.w + Math.round(S.x));
  S.hill = (W.elev[i0] || 0) > (W.elev[Math.round(ey) * W.w + Math.round(ex)] || 0) + 0.03;
  // on a siege, attackers start on the road in, defenders behind the walls
  let lat = -line.reduce((s, u) => s + unitWidth(u) + 1, 0) / 2;
  const reserve = line.length >= 4 ? line[line.length - 1] : null;
  for (const u of line) {
    if (u === reserve) continue;
    const w = unitWidth(u);
    u.x = S.x + px * (lat + w / 2); u.y = S.y + py * (lat + w / 2);
    u.wing = lat + w / 2;
    lat += w + 1;
  }
  if (reserve) { reserve.x = S.x - S.ux * 8; reserve.y = S.y - S.uy * 8; reserve.wing = 0; reserve.reserve = true; }
  lat = -front.reduce((s, u) => s + unitWidth(u) + 1, 0) / 2;
  for (const u of front) { const w = unitWidth(u); u.x = S.x + S.ux * 3.5 + px * (lat + w / 2); u.y = S.y + S.uy * 3.5 + py * (lat + w / 2); u.wing = lat + w / 2; lat += w + 1; }
  let side = -1, off = line.reduce((s, u) => s + unitWidth(u) + 1, 0) / 2 + 3;
  wings.forEach((u, k) => { u.x = S.x + px * side * off; u.y = S.y + py * side * off; u.wing = side * off; u.flankSide = side; side = -side; if (k % 2) off += unitWidth(u) + 2; });
  for (const u of S.units) { u.ux = S.ux; u.uy = S.uy; u.tx = u.x; u.ty = u.y; }
  // engines stand behind the line
  S.armies.forEach(a => a.guns.forEach((g, k) => { g.x = S.x - S.ux * (5 + (k % 3)) + px * (k - a.guns.length / 2) * 2.5; g.y = S.y - S.uy * (5 + (k % 3)) + py * (k - a.guns.length / 2) * 2.5; g.cool = W.tick + 30 + rint(40); }));
}
function applyPlan(S, B) {
  const P = S.plan;
  for (const u of S.units) {
    if (P === 'wedge' && u.kind === 'foot') { u.form = 'wedge'; reform(u); }
    if (S.pol && S.home && S.home.tech[TECH_IX.rifle] && u.kind !== 'horse') { u.form = 'loose'; reform(u); }
  }
  const g = S.general;
  if (g && g.alive) {
    const lift = (g.leadM - 1) * 14 + (g.traits.includes('warhero') ? 5 : 0);
    for (const u of S.units) for (const p of u.men) p.mor = clamp(p.mor + lift, 5, 100);
  }
}
// What a side can put in the air: bombers (an air base or radar cover), jet fighters, drones and helicopter gunships.
function hasAir(S) {
  let air = false;
  for (const a of S.armies) if (a.home.count.airbase) air = true;
  for (const t of W.towns) if (t.polity === S.pol) {
    if (t.count.airbase || t.count.radar) air = true;
    if (t.count.fighterbase) S.fighters = true;
    if (t.count.dronebase) S.drones = true;
    if (t.count.heliport && t.tech[TECH_IX.helicopters]) S.helis = true;
  }
  return air || S.drones;
}
function joinBattle(B, army, S) {
  if (B.over || army.battle) return;
  addArmy(S, army, B);
  for (const u of army.units) { u.x = army.x; u.y = army.y; u.tx = army.x; u.ty = army.y; const d = Math.max(0.5, Math.hypot(B.x - army.x, B.y - army.y)); u.ux = (B.x - army.x) / d; u.uy = (B.y - army.y) / d; }
  army.guns.forEach(g => { g.x = army.x; g.y = army.y; g.cool = W.tick + 40; });
  const E = S === B.sA ? B.sB : B.sA;
  for (const u of S.units) for (const p of u.men) p.mor = Math.min(100, p.mor + 9);
  E.pressure += 0.6;
  S.air = S.air || hasAir(S);
  S.menN = (S.menN || 0);
  if (army.soldiers.length >= 15) chron('war', `The ${army.name} arrives at the ${B.name} with ${menOf(army)} fresh soldiers.`, Math.round(B.x), Math.round(B.y));
  if (FXH) FXH.word(army.x, army.y, 'Reinforcements!', army.pol.color);
}

// ---- walls and gates ----
function setupWalls(B, t) {
  B.wallHP = new Map(); B.gates = new Map();
  B.ladders = !!t.tech[0] || true;
  if (!t.walls || !t.wallGates) return;
  const gateHP = (WALL_KIND[t.wallKind] || WALL_KIND[2]).gate + t.fortMax * 0.1;
  for (const i of t.wallGates) if (!W.water[i] && W.occ[i] !== 1) B.gates.set(i, gateHP);
}
function hitWall(B, i, pow) {
  const t = B.town;
  if (B.gates && B.gates.has(i)) {
    const v = B.gates.get(i) - pow;
    if (FXH) FXH.rubble(i % W.w, (i / W.w) | 0, 1);
    t.fortHP = Math.max(0, t.fortHP - pow * 0.3);
    if (v <= 0) { B.gates.delete(i); B.breaches++; if (FXH) FXH.word(i % W.w, (i / W.w) | 0, 'Gate down!', '#ffd34d'); } else B.gates.set(i, v);
    return;
  }
  if (W.occ[i] !== 3) return;
  const hp = (B.wallHP.has(i) ? B.wallHP.get(i) : (WALL_KIND[t.wallKind] || WALL_KIND[2]).hp + t.fortMax * 0.06) - pow;
  t.fortHP = Math.max(0, t.fortHP - pow * 0.5);
  if (FXH) FXH.rubble(i % W.w, (i / W.w) | 0, 1);
  if (hp <= 0) {
    W.occ[i] = 0; dirty(i); B.wallHP.delete(i); B.breaches++;
    if (FXH) { FXH.rubble(i % W.w, (i / W.w) | 0, 5); FXH.word(i % W.w, (i / W.w) | 0, 'Breach!', '#ffd34d'); }
    if (B.breaches === 1 && B.sA.men0 + B.sB.men0 >= 20) chronT('war', `The walls of ${t.name} are breached.`, t);
  } else B.wallHP.set(i, hp);
}
function nearestWallTile(B, x, y) {
  let best = -1, bd = 1e9;
  if (B.gates) for (const i of B.gates.keys()) { const d = (i % W.w - x) ** 2 + ((i / W.w | 0) - y) ** 2 - 12; if (d < bd) { bd = d; best = i; } }
  const L = B.town.wallTiles;
  if (L) for (let k = 0; k < L.length; k += 2) { const i = L[k]; if (W.occ[i] !== 3) continue; const d = (i % W.w - x) ** 2 + ((i / W.w | 0) - y) ** 2; if (d < bd) { bd = d; best = i; } }
  return best;
}
function wallsStand(B) { const t = B.town; return t && t.walls && t.fortHP > 0 && B.breaches === 0; }

// ---- every soldier: find an enemy, close, strike, hold your nerve ----
const _ga = new Map(), _gb = new Map();
function binPush(G, p) {
  const k = ((p.ti % W.w) >> 2) + (((p.ti / W.w) | 0) >> 2) * 10000;
  let c = G.get(k);
  if (!c) { c = []; G.set(k, c); }
  c.push(p);
}
function nearestIn(G, p, maxTiles) {
  const px = p.ti % W.w, py = (p.ti / W.w) | 0, cx = px >> 2, cy = py >> 2;
  let best = null, bd = 1e9;
  const R0 = Math.min(5, Math.ceil(maxTiles / 4));
  for (let r = 0; r <= R0; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const c = G.get(cx + dx + (cy + dy) * 10000);
      if (!c) continue;
      for (let k = 0; k < c.length; k++) {
        const q = c[k];
        if (q.down) continue;
        const ex = q.ti % W.w - px, ey = ((q.ti / W.w) | 0) - py, d = ex * ex + ey * ey;
        if (d < bd) { bd = d; best = q; }
      }
    }
    if (best && bd <= (r * 4) * (r * 4)) break;
  }
  return best;
}
function canEnter(p, B, j) {
  if (W.water[j] || W.occ[j] === 1) return false;
  if (B.town && p.side === B.sA) {
    if (W.occ[j] === 3) {
      if (B.stage !== 'storm') return false;
      if (B.towerNear && B.towerNear.has(j)) return rnd() < 0.6;
      return rnd() < 0.03;
    }
    if (B.gates && B.gates.has(j)) return false;
  }
  return true;
}
function stepToward(p, B, tx0, ty0) {
  const x = p.ti % W.w, y = (p.ti / W.w) | 0;
  const dx = Math.sign(Math.round(tx0) - x), dy = Math.sign(Math.round(ty0) - y);
  if (!dx && !dy) return false;
  const opts = _opts;
  opts[0] = dx; opts[1] = dy; opts[2] = dx; opts[3] = 0; opts[4] = 0; opts[5] = dy;
  opts[6] = dx; opts[7] = dy === 0 ? 1 : 0; opts[8] = dx === 0 ? 1 : 0; opts[9] = dy; opts[10] = dx; opts[11] = dy === 0 ? -1 : 0; opts[12] = dx === 0 ? -1 : 0; opts[13] = dy;
  for (let k = 0; k < 14; k += 2) {
    const ox = opts[k], oy = opts[k + 1];
    if (!ox && !oy) continue;
    const j = (y + oy) * W.w + x + ox;
    if (j < W.w || j >= W.occ.length - W.w) continue;
    if (!canEnter(p, B, j)) continue;
    p.path = [p.ti, j]; p.pi = 0; p.mv = 0; p.nt = j; p.need = stepNeed(p, p.ti, j); p.st = 1;
    return true;
  }
  return false;
}
const _opts = new Int8Array(14);
const DAGGER = { name: 'Dagger', role: 'melee', dmg: 5, rng: 1.5, cd: 6, pierce: 0, kind: 0 };
function bestReach(p, d2) {
  const w = WEAPONS[p.wep || 0];
  if (p.mount === 2) return w;
  if (w.kind > 0 && (p.ammo <= 0 || d2 <= 2.2)) return w.bayo ? { name: 'Bayonet', dmg: w.bayo, rng: 1.6, cd: 6, pierce: 0.2, kind: 0, role: 'melee' } : DAGGER;
  return w;
}
function soldierAct(p, B, S, E, G, tick) {
  if (p.down) return;
  const px = p.ti % W.w, py = (p.ti / W.w) | 0;
  if (p.bleed > 0) {
    p.hp -= p.bleed;
    if (p.hp <= 0) { soldierFalls(p, null, B, E, S, 'bled to death'); return; }
  }
  if (p.flee) { fleeStep(p, B, S, E, px, py); return; }
  const u = p.unit;
  // nerve: what's happening around them wears it down, a brave person takes longer to break
  p.mor -= S.pressure * 0.3 / p.moraleM;
  if (u && u.cap && !u.cap.alive) p.mor -= 0.1;
  if (tick - p.hitT > 40 && p.mor < 70) p.mor += 0.12;
  if (p.mor < 14 && rnd() < 0.25) { startFlee(p, S, E); return; }
  if (p.stam < 100) p.stam += (B.wx === WX.HEAT ? 0.2 : 0.45);
  if (p.st === 1) return;

  const order = u ? u.order : 'charge', w0 = WEAPONS[p.wep || 0], tank = p.mount === 2;
  const sight = clamp(Math.max(w0.rng + 3, 14) * (B.wx === WX.FOG ? 0.6 : 1), 6, 20);
  let e = p.foe;
  if (!e || !e.alive || e.down || e.btl !== B || tick % 15 < 3) {
    const n = nearestIn(G, p, sight);
    e = n || (e && e.alive && !e.down && e.btl === B ? e : null);
  }
  p.foe = e;
  if (e) {
    const ex = e.ti % W.w - px, ey = ((e.ti / W.w) | 0) - py, d2 = ex * ex + ey * ey;
    if (ex) p.face = ex < 0 ? -1 : 1;
    const wp = bestReach(p, d2), R0 = wp.rng * (wp.kind > 0 && W.elev[p.ti] > W.elev[e.ti] + 0.02 ? 1.15 : 1) * (W.occ[p.ti] === 3 ? 1.25 : 1) * (tank ? 1 : 1);
    if (d2 <= R0 * R0) {
      if (tick >= p.cdT) strike(p, e, B, S, E, wp, d2);
      if (wp.kind > 0 || d2 <= 2.4) return;
    }
    const chase = order === 'charge' || (order === 'advance' && d2 < 16) || (order === 'hold' && d2 < 5) || (order === 'shoot' && d2 < 3);
    if (chase && w0.kind === 0 || (chase && p.ammo <= 0) || (tank && order === 'charge')) {
      stepToward(p, B, e.ti % W.w, (e.ti / W.w) | 0);
      p.stam -= 0.3;
      return;
    }
  }
  // no one in reach: find your place in the company
  if (u) {
    const lat = -u.uy, lon = u.ux, sx = u.x + lat * p.slotX + u.ux * p.slotY, sy = u.y + lon * p.slotX + u.uy * p.slotY;
    const dx = sx - px, dy = sy - py;
    if (dx * dx + dy * dy > 1.6) { stepToward(p, B, sx, sy); return; }
    p.face = u.ux < 0 ? -1 : 1;
  }
}
function strike(att, def, B, S, E, w, d2) {
  const tick = W.tick, ranged = w.kind > 0, u = att.unit, tank = att.mount === 2;
  att.cdT = tick + w.cd * (att.stam < 25 ? 1.5 : 1) * (att.wound === 2 ? 1.4 : 1) * (0.85 + rnd() * 0.3);
  att.atkT = tick; att.swing = tick; att.fx = def.ti % W.w; att.fy = (def.ti / W.w) | 0; att.stam = Math.max(0, att.stam - (ranged ? 0.4 : 1.4)); def.foe = def.foe || att;
  const ax = att.ti % W.w, ay = (att.ti / W.w) | 0, dx = att.fx, dy = att.fy;
  if (ranged && !tank) {
    att.ammo--;
    if (w.damp && B.wx === WX.RAIN && rnd() < w.damp) return;  // wet powder
    shot(ax, ay, dx, dy, w.kind === 2 ? 2 : (w.id === 'sling' ? 5 : w.id === 'javelin' ? 6 : 0));
    if (FXH && w.kind === 2) FXH.muzzle(ax, ay, dx, dy);
  } else if (tank) { shot(ax, ay, dx, dy, 2); if (FXH) FXH.muzzle(ax, ay, dx, dy); }
  // can it land? skill against skill, the state of each, and the ground
  const skill = 1 + Math.min(att.xp || 0, 40) * 0.012;
  let hit = ranged ? 0.42 * att.aimM * (1 - Math.sqrt(d2) / (w.rng * 2.2)) : 0.62;
  hit *= skill * (att.stam < 25 ? 0.82 : 1) * (att.wound === 2 ? 0.75 : 1) * (u ? (0.85 + u.coh * 0.2) : 1) / clamp(1 + Math.min(def.xp || 0, 40) * 0.006, 1, 1.25);
  if (ranged) {
    if (W.tree[def.ti] > 2) hit *= 0.72;
    if (B.wx === WX.RAIN) hit *= 0.85; else if (B.wx === WX.FOG) hit *= 0.6; else if (B.wx === WX.SNOW) hit *= 0.85;
    if (att.side && att.side.home && att.side.home.count.archery && w.kind === 1) hit *= 1.2;
    if (def.mount === 1) hit *= 1.15;
    // shooting down from a ridge carries further and sees more; shooting up a slope doesn't
    const up = W.elev[att.ti] - W.elev[def.ti];
    if (up > 0.03) hit *= 1.12; else if (up < -0.03) hit *= 0.9;
  } else {
    // fighting your way uphill is slow, tiring work
    if (W.elev[def.ti] - W.elev[att.ti] > 0.04) { hit *= 0.88; att.stam = Math.max(0, att.stam - 0.6); }
    if (def.shield && rnd() < 0.2) { if (FXH) FXH.spark(dx, dy); hit = 0; }
    if (W.river[def.ti]) hit *= 1.15;
  }
  // caught from behind or from the side, while looking at somebody else
  const dirx = ax - dx, diry = ay - dy, front = def.side ? dirx * def.side.ux + diry * def.side.uy : 0;
  const rear = front < -0.5, flanked = def.foe && def.foe !== att;
  if (rear) hit *= 1.25;
  if (flanked) hit *= 1.12;
  if (W.occ[def.ti] === 3) hit *= 0.55;          // up on the wall
  else if (B.town && def.side === B.sB && B.town.fortHP > 0 && !inWalls(B, ax, ay)) hit *= 0.85;
  if (rnd() > hit) { if (FXH && !ranged) FXH.clash(att, def); return; }
  // how hard
  const A = ARMORS[def.arm || 0];
  let prot = A.prot * (1 - (w.pierce || 0));
  if (def.mount === 2) prot = Math.max(prot, 0.82 * (1 - (w.pierce || 0) * 0.5));
  let dmg = w.dmg * att.str * skill * (0.7 + rnd() * 0.6) * Math.sqrt(att.side && att.side.home ? att.side.home.mod.attack : 1) * (att.army && att.army.hpK ? att.army.hpK : 1);
  if (att.mount === 1) dmg *= 1.3;
  if (tank) dmg *= 3;
  if (u && att.mount === 1 && u.order === 'charge' && att.st !== 1 && tick - att.sinceHit > 30) { dmg *= 1.8; if (FXH) FXH.word(ax, ay, 'Charge!', S.pol.color); att.sinceHit = tick; def.mor -= 6; }
  if (def.mount === 1 && w.horse) dmg *= w.horse;
  if (W.elev[att.ti] > W.elev[def.ti] + 0.02) dmg *= 1.15;
  if (rear) dmg *= 1.3;
  if (def.side && def.side.home) dmg /= Math.sqrt(def.side.home.mod.defend);
  if (B.trench === def.side && def.st !== 1) dmg *= 0.6;
  // where it lands: a hit to the head ends things, a limb slows them down, deep cuts keep bleeding
  const r = rnd();
  let mult = 1;
  if (r < 0.1) mult = 1.9;
  else if (r < 0.28) { if (def.wound < 2) def.wound = 2; mult = 0.7; }
  else if (r < 0.46) { if (def.wound < 1) { def.wound = 1; def.spd *= 0.75; } mult = 0.7; }
  const pain = dmg * mult * (1 - prot);
  def.hp -= pain;
  def.hitT = tick; def.foe = att;
  if (!ranged && rnd() < 0.2 && def.mount !== 2) def.bleed = Math.min(2.5, def.bleed + 0.4);
  def.mor -= (pain / Math.max(def.hpMax, 30)) * 18 / def.moraleM;
  if (FXH) FXH.hit(att, def, w, pain, r < 0.1);
  if (def.hp > 0) return;
  soldierFalls(def, att, B, S, E, ranged ? 'shot in battle' : 'killed in battle', w);
}
const inWalls = (B, x, y) => { const b = B.town.wallBox; return !!b && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1; };
function soldierFalls(def, att, B, S, E, cause, w) {
  // S here is the side that did it, E the side that lost someone
  const general = E.general === def, wasCap = def.unit && def.unit.cap === def, pol = E.pol;
  if (att) {
    att.xp = (att.xp || 0) + 1; att.kills = (att.kills || 0) + 1;
    if (att.kills === 3 && addTrait(att, 'veteran')) plog(att, 'Hardened by battle.');
    if (att.kills === 9 && addTrait(att, 'warhero')) { att.fame += 5; plog(att, `Became a war hero at the ${B.name}.`); if (E.men0 + S.men0 >= 40) chron('war', `${att.name} of ${att.town.name} cuts through the enemy at the ${B.name}. People will tell this story.`, Math.round(B.x), Math.round(B.y)); }
    att.fame += 0.2;
    if (att.army) att.army.kills++;
    if (general) { att.fame += 3; plog(att, `Killed the enemy general ${def.name} at the ${B.name}.`); }
    plog(def, `Struck down by ${att.name} of ${att.town.polity.name}${w ? ' with a ' + w.name.toLowerCase() : ''}.`);
  }
  if (def.wepOwn && def.wep > 0 && rnd() < 0.35) B.loot[def.wep]++;
  // armour, tough people and luck: not everyone who falls is dead
  // and a surgeon behind the lines saves some of those who would have died where they lay
  const surgeons = E.home && E.home.mod ? E.home.mod.recover : 1;
  const survive = !general && def.mount !== 2 && rnd() < (0.14 + ARMORS[def.arm || 0].prot * 0.25 + (def.traits.includes('tough') ? 0.1 : 0)) * surgeons;
  if (FXH) FXH.fall(def, !survive);
  if (survive) {
    def.down = true; def.hp = 1; def.foe = null; def.bleed = 0; def.st = 2; def.wake = W.tick + 100000; def.path = null;
    B.fallen.push(def);
    E.down++;
  } else {
    if (E === B.sA) B.deadA = (B.deadA || 0) + 1; else B.deadB = (B.deadB || 0) + 1;
    E.dead++;
    const r = def.army && def.army.rep ? def.army.rep : 1;
    E.deadMen = (E.deadMen || 0) + r;
    if (B.war) { if (B.war.a.includes(pol)) B.war.deadA += r; else B.war.deadB += r; }
    militiaLost(def);
    killPerson(def, cause);
  }
  // the people next to them see it happen
  E.pressure += 1.2 / Math.max(E.men0, 6);
  S.pressure = Math.max(0, S.pressure - 0.4 / Math.max(S.men0, 6));
  if (general) {
    E.general = null; E.pressure += 0.8;
    for (const u of E.units) for (const p of u.men) p.mor -= 10;
    if (FXH) FXH.word(def.ti % W.w, (def.ti / W.w) | 0, 'General slain!', '#ff6a5a');
    if (E.men0 + S.men0 >= 30) chron('war', `${def.name}, general of ${pol.name}, falls at the ${B.name}.`, Math.round(B.x), Math.round(B.y));
    // the second in command takes over, not always well
    let best = null, bs = -1;
    for (const u of E.units) if (u.cap && u.cap.alive && !u.cap.flee && u.cap.leadM > bs) { bs = u.cap.leadM; best = u.cap; }
    if (best) { E.general = best; E.plan = 'mob'; for (const a of E.armies) if (a.general === def) a.general = best; plog(best, `Took command at the ${B.name} when the general fell.`); }
  }
  if (wasCap && def.unit) { const u = def.unit; pickCaptain(u); for (const p of u.men) p.mor -= 4; }
}
function startFlee(p, S, E) {
  p.flee = true; p.foe = null; S.fled++;
  if (p.unit) p.unit.fled++;
  if (FXH && rnd() < 0.08) FXH.word(p.ti % W.w, (p.ti / W.w) | 0, 'Run!', '#ffffff');
}
function fleeStep(p, B, S, E, px, py) {
  // running from the middle of the fight, and off the field if they make it
  const dx = px - B.x, dy = py - B.y, far = dx * dx + dy * dy;
  if (far > 900 || (far > 360 && B.phase === 'pursuit')) { leaveBattle(p, B, S); return; }
  if (p.st === 1) return;
  const d = Math.max(1, Math.sqrt(far));
  const hx = far < 4 ? -S.ux : dx / d, hy = far < 4 ? -S.uy : dy / d;
  p.face = hx < 0 ? -1 : 1;
  stepToward(p, B, px + hx * 5, py + hy * 5);
  // some find their nerve again once they're clear of it
  if (far > 200 && B.phase !== 'pursuit' && p.mor > 8 && rnd() < 0.03 && S.general && S.general.alive) { p.flee = false; p.mor = 40; S.fled--; if (p.unit) p.unit.fled = Math.max(0, p.unit.fled - 1); }
  else if (p.mor < 40) p.mor += 0.3;
}
function leaveBattle(p, B, S) {
  const u = p.unit;
  if (u) { const q = u.men.indexOf(p); if (q >= 0) { u.men[q] = u.men[u.men.length - 1]; u.men.pop(); } p.unit = null; }
  removeFromArmy(p);
  plog(p, `Ran from the ${B.name}.`);
  dismissSoldier(p);
  p.mor = 50;
}
// Prisoners: the cruel kill them, the merciful send them home, most make them work.
function takePrisoner(p, B, captor) {
  const pol = captor.pol, rul = pol.ruler && pol.ruler.alive ? pol.ruler : null;
  B.prisoners++;
  if (B.war) B.war.prisoners = (B.war.prisoners || 0) + 1;
  captor.cap++;
  if (rul && hasTrait(rul, 'cruel') && rnd() < 0.6) { killPerson(p, 'executed as a prisoner'); return; }
  removeFromArmy(p);
  p.btl = null; p.foe = null; p.flee = false; p.down = false;
  returnGear(p, p.town);
  const home = captor.home;
  if (rul && hasTrait(rul, 'kind')) { plog(p, `Taken at the ${B.name}, and released by ${pol.name}.`); p.army = null; p.task = T_RETURN; p.step = 0; p.st = 0; p.job = p.prevJob || J.WOOD; p.wake = W.tick + rint(30); p.hp = p.hpMax * 0.5; return; }
  p.army = null;
  if (home && home.alive && !p.leader) {
    plog(p, `Taken prisoner at the ${B.name} and put to work for ${pol.name}.`);
    moveTo(p, home);
    p.pow = true;
    startMigrate(p, nearTile(home.i, 3));
    p.job = J.WOOD;
    p.hp = p.hpMax * 0.6;
  } else { p.task = T_RETURN; p.step = 0; p.st = 0; p.job = p.prevJob || J.WOOD; }
}

// ---- the generals: every so often each side looks at the field and gives orders ----
function nearestUnit(u, E) {
  let best = null, bd = 1e9;
  for (let k = 0; k < E.units.length; k++) { const o = E.units[k]; if (!o.men.length || o.order === 'rout') continue; const d = (o.x - u.x) ** 2 + (o.y - u.y) ** 2; if (d < bd) { bd = d; best = o; } }
  return best;
}
function commandSide(S, E, B, tick) {
  // first, who's still there at all
  let alive = 0, ok = 0;
  for (let k = S.units.length - 1; k >= 0; k--) {
    const u = S.units[k];
    if (!u.men.length) { S.units.splice(k, 1); continue; }
    let fled = 0, cx = 0, cy = 0, c = 0, near = 0;
    for (let q = 0; q < u.men.length; q++) {
      const p = u.men[q];
      if (p.flee) { fled++; continue; }
      if (p.down) continue;
      const x = p.ti % W.w, y = (p.ti / W.w) | 0;
      cx += x; cy += y; c++;
    }
    alive += u.men.length; ok += c;
    u.engaged = 0;
    u.fled = fled;
    if (c) {
      const ax = cx / c, ay = cy / c;
      u.coh = clamp(1 - Math.hypot(ax - u.x, ay - u.y) / 14, 0, 1);
      // a company that's fallen behind its own banner waits for itself
      if (Math.hypot(ax - u.x, ay - u.y) > 7) { u.x = lerp(u.x, ax, 0.4); u.y = lerp(u.y, ay, 0.4); }
    }
    if (fled > u.men.length * 0.55 || c === 0) {
      if (u.order !== 'rout' && u.men.length >= 5 && FXH) FXH.word(u.x, u.y, `${u.name} break!`, '#ffffff');
      u.order = 'rout';
      S.pressure += 0.5;
      for (const p of u.men) if (!p.flee && !p.down && rnd() < 0.5) p.mor -= 12;
    } else if (u.order === 'rout' && fled < u.men.length * 0.3) u.order = 'hold';
    if (tick % 96 < 24 && c > 2) reform(u);
  }
  S.alive = alive; S.ok = ok;
  S.morale = 0; let mc = 0;
  for (const u of S.units) for (let q = 0; q < u.men.length; q += 4) { S.morale += u.men[q].mor; mc++; }
  S.morale = mc ? S.morale / mc : 0;
  // the odds weigh on everyone, a general's voice holds them up
  const lost = (S.dead + S.down + S.cap) / Math.max(S.men0, 1), odds = (E.ok || 1) / Math.max(ok, 1);
  let press = lost * 0.9 + Math.max(0, odds - 1.3) * 0.65;
  if (!S.general || !S.general.alive) press += 0.6;
  if (S.armies[0] && S.armies[0].starving > 0) press += 0.7;
  if (B.town && S === B.sB && B.hunger) press += 0.9;
  if (B.town && S === B.sA && tick - B.start > TPY * 3) press += 0.5;
  S.pressure = S.pressure * 0.7 + press * 0.3;
  // a side with few left standing is finished
  if (!S.broken && (ok === 0 || (ok < S.men0 * 0.28 && E.ok > ok * 1.2) || S.morale < 12)) { breakSide(S, E, B, tick); return; }
  if (S.broken) return;

  const age = tick - B.start, P = S.plan, town = B.town;
  const leader = S.general && S.general.alive;
  for (let k = 0; k < S.units.length; k++) {
    const u = S.units[k];
    if (u.order === 'rout') continue;
    const e = nearestUnit(u, E);
    if (!e) { u.order = 'hold'; continue; }
    const dx = e.x - u.x, dy = e.y - u.y, d = Math.max(0.5, Math.hypot(dx, dy));
    u.ux = lerp(u.ux, dx / d, 0.3); u.uy = lerp(u.uy, dy / d, 0.3);
    const n = Math.hypot(u.ux, u.uy) || 1; u.ux /= n; u.uy /= n;
    u.tx = e.x; u.ty = e.y;
    if (town) { siegeOrder(u, e, d, S, E, B, tick); continue; }
    const w0 = u.men[0] ? WEAPONS[u.men[0].wep || 0] : DAGGER;
    if (u.kind === 'shot') {
      const out = u.men.every(p => p.ammo <= 0);
      if (out) u.order = 'charge';
      else if (d < w0.rng * 0.85) { u.order = 'shoot'; u.tx = u.x; u.ty = u.y; if (d < 4 && e.kind !== 'shot') { u.tx = u.x - dx / d * 4; u.ty = u.y - dy / d * 4; u.order = 'advance'; } }
      else u.order = 'advance';
      continue;
    }
    if (u.reserve && leader && age < 200 && !(S.morale < 40 && age > 80)) { u.order = 'hold'; u.tx = u.x; u.ty = u.y; continue; }
    if (u.reserve) { u.reserve = false; if (leader && FXH) FXH.word(u.x, u.y, 'The reserve!', S.pol.color); for (const p of u.men) p.mor = Math.min(100, p.mor + 6); }
    if (u.kind === 'horse' && (P === 'flank' || P === 'envelop' || P === 'blitz') && leader) { flankOrder(u, e, E, S, d); continue; }
    if (P === 'hold' || P === 'fire') { if (d < 7 || age > 400) u.order = 'charge'; else { u.order = 'hold'; u.tx = u.x; u.ty = u.y; } continue; }
    if (P === 'feint' && age < 110) {
      // the centre falls back in good order and draws them in
      u.order = 'advance'; u.tx = u.x - S.ux * 3; u.ty = u.y - S.uy * 3;
      continue;
    }
    if (P === 'envelop' && Math.abs(u.wing) > 3) { const q = E.x + (u.wing > 0 ? 1 : -1) * -S.uy * 6 + S.ux * 3, r = E.y + (u.wing > 0 ? 1 : -1) * S.ux * 6 + S.uy * 3; u.tx = q; u.ty = r; u.order = d < 5 ? 'charge' : 'advance'; continue; }
    if (P === 'wedge' && E.general && E.general.alive && E.general.unit) { const g = E.general.unit; u.tx = g.x; u.ty = g.y; u.order = d < 8 ? 'charge' : 'advance'; continue; }
    u.order = d < 7 || P === 'mob' ? 'charge' : 'advance';
  }
  if (P === 'feint' && age >= 110 && age < 140 && leader && FXH && age % 24 < 3) FXH.word(S.x, S.y, 'Turn and strike!', S.pol.color);
  S.x = lerp(S.x, avgX(S), 0.4); S.y = lerp(S.y, avgY(S), 0.4);
}
const avgX = S => { let s = 0, c = 0; for (const u of S.units) { s += u.x; c++; } return c ? s / c : S.x; };
const avgY = S => { let s = 0, c = 0; for (const u of S.units) { s += u.y; c++; } return c ? s / c : S.y; };
function flankOrder(u, e, E, S, d) {
  // out wide, round the end of their line, then in from behind
  const side = u.flankSide || 1, ux = E.ux, uy = E.uy, px = -uy * side, py = ux * side;
  if (!u.flank) u.flank = 1;
  if (u.flank === 1) {
    u.tx = E.x + px * 14; u.ty = E.y + py * 14; u.order = 'advance';
    if (Math.hypot(u.tx - u.x, u.ty - u.y) < 5) u.flank = 2;
    return;
  }
  if (u.flank === 2) {
    u.tx = E.x - ux * 8 + px * 4; u.ty = E.y - uy * 8 + py * 4; u.order = 'advance';
    if (Math.hypot(u.tx - u.x, u.ty - u.y) < 5) u.flank = 3;
    return;
  }
  u.order = 'charge'; u.tx = E.x; u.ty = E.y;
}
function siegeOrder(u, e, d, S, E, B, tick) {
  const t = B.town, attacking = S === B.sA;
  if (attacking) {
    if (B.stage === 'storm') { u.tx = t.x; u.ty = t.y; u.order = 'charge'; return; }
    // ring the place, out of arrow range when there's a wall
    const a = Math.atan2(u.y - t.y, u.x - t.x), r = (t.wallBox ? Math.max(t.wallBox.x1 - t.wallBox.x0, t.wallBox.y1 - t.wallBox.y0) / 2 : t.radius * 0.5) + 6;
    u.tx = t.x + Math.cos(a) * r; u.ty = t.y + Math.sin(a) * r;
    u.order = u.kind === 'shot' ? 'shoot' : 'hold';
    if (u.kind === 'shot') { u.tx = t.x + Math.cos(a) * (r - 2); u.ty = t.y + Math.sin(a) * (r - 2); }
    return;
  }
  // defenders hold the wall until there's nothing to hold it for; then it's in the streets
  if (B.stage === 'storm' || !t.walls) { if (d < 9 || B.stage === 'storm') u.order = 'charge'; else u.order = 'hold'; return; }
  const a = Math.atan2(B.sA.y - t.y, B.sA.x - t.x), bx = t.wallBox;
  const r = bx ? Math.max(bx.x1 - bx.x0, bx.y1 - bx.y0) / 2 - 1.5 : 3;
  const spread = (u.id % 5 - 2) * 0.35;
  u.tx = t.x + Math.cos(a + spread) * r; u.ty = t.y + Math.sin(a + spread) * r;
  u.order = u.kind === 'shot' ? 'shoot' : 'hold';
  // or come out swinging if the besiegers look thin
  if (S.ok > (E.ok || 1) * 1.5 && tick % 240 < 24) { u.order = 'charge'; u.tx = e.x; u.ty = e.y; if (FXH && rnd() < 0.2) FXH.word(u.x, u.y, 'Sally!', S.pol.color); }
}
function moveUnits(S, B) {
  const snow = B.wx === WX.SNOW ? 0.8 : 1;
  for (let k = 0; k < S.units.length; k++) {
    const u = S.units[k];
    if (u.order === 'rout') continue;
    const dx = u.tx - u.x, dy = u.ty - u.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.4) continue;
    const i = Math.round(u.y) * W.w + Math.round(u.x);
    const terr = clamp(10 / (W.cost[i] || 10), 0.5, 1.2);
    // nobody marches faster than the company can stay together
    const v = UNIT_SPEED[u.kind] * 6 * snow * terr * (u.order === 'charge' ? 1.5 : 1) * (0.5 + u.coh * 0.5) * (u.order === 'hold' ? 0.5 : 1);
    u.x += dx / d * Math.min(v, d); u.y += dy / d * Math.min(v, d);
  }
}
function breakSide(S, E, B, tick) {
  S.broken = true;
  if (FXH) FXH.word(S.x, S.y, `${S.pol.name} break!`, '#ffffff');
  for (const u of S.units) { u.order = 'rout'; for (const p of u.men) if (!p.flee && !p.down) startFlee(p, S, E); }
  B.phase = 'pursuit'; B.endT = tick + 45 + (E.units.some(u => u.kind === 'horse') ? 40 : 0);
  B.winner = S === B.sA ? 'b' : 'a';
}

// ---- engines, shells and bombers ----
function enginesStep(S, E, B, tick) {
  const t = B.town;
  B.towerNear = S === B.sA ? null : B.towerNear;
  for (const a of S.armies) for (let k = a.guns.length - 1; k >= 0; k--) {
    const g = a.guns[k], D = SIEGE[g.type];
    // overrun by anyone with a blade?
    const G = E.grid;
    if (G) {
      const cell = G.get((Math.round(g.x) >> 2) + (Math.round(g.y) >> 2) * 10000);
      if (cell) for (let q = 0; q < cell.length; q++) {
        const p = cell[q];
        if (p.flee || p.down) continue;
        const dx = p.ti % W.w - g.x, dy = ((p.ti / W.w) | 0) - g.y;
        if (dx * dx + dy * dy < 4) { g.hp -= 3; if (g.hp <= 0) break; }
      }
      if (g.hp <= 0) { if (FXH) FXH.boom(g.x, g.y, 2); a.guns.splice(k, 1); continue; }
    }
    if (D.kind === 'ram') {
      if (!t || S !== B.sA) continue;
      const to = nearestWallTile(B, g.x, g.y);
      if (to < 0) continue;
      const tx0 = to % W.w, ty0 = (to / W.w) | 0, dx = tx0 - g.x, dy = ty0 - g.y, d = Math.hypot(dx, dy);
      if (d > 1.4) { g.x += dx / d * 0.5; g.y += dy / d * 0.5; }
      else if (tick >= g.cool) { g.cool = tick + D.cd; g.fireT = tick; hitWall(B, to, D.pow * (t.count.barbican ? 0.8 : 1)); }
      continue;
    }
    if (D.kind === 'tower') {
      if (!t || S !== B.sA) continue;
      const to = nearestWallTile(B, g.x, g.y);
      if (to < 0) continue;
      const tx0 = to % W.w, ty0 = (to / W.w) | 0, dx = tx0 - g.x, dy = ty0 - g.y, d = Math.hypot(dx, dy);
      if (d > 1.6) { g.x += dx / d * 0.3; g.y += dy / d * 0.3; }
      else { B.towerNear = B.towerNear || new Set(); B.towerNear.add(to); }
      continue;
    }
    if (tick < g.cool) continue;
    // a gun: walls while there are walls, otherwise whoever's packed closest
    let tx0 = -1, ty0 = -1, wall = -1;
    if (t && S === B.sA && B.stage === 'invest') { wall = nearestWallTile(B, g.x, g.y); if (wall >= 0) { tx0 = wall % W.w; ty0 = (wall / W.w) | 0; } }
    if (tx0 < 0) {
      let best = null, bs = 1e9;
      for (const o of E.units) { if (!o.men.length) continue; const d = Math.hypot(o.x - g.x, o.y - g.y); if (d <= D.rng && d - o.men.length * 0.1 < bs) { bs = d - o.men.length * 0.1; best = o; } }
      if (!best) { if (t && S === B.sA) { const d = Math.hypot(t.x - g.x, t.y - g.y); if (d > D.rng - 2) { g.x += (t.x - g.x) / d * 0.3; g.y += (t.y - g.y) / d * 0.3; } } continue; }
      tx0 = best.x + (rnd() - 0.5) * 5; ty0 = best.y + (rnd() - 0.5) * 5;
    } else if (Math.hypot(tx0 - g.x, ty0 - g.y) > D.rng) { const d = Math.hypot(tx0 - g.x, ty0 - g.y); g.x += (tx0 - g.x) / d * 0.3; g.y += (ty0 - g.y) / d * 0.3; continue; }
    g.cool = tick + D.cd * (B.wx === WX.RAIN && D.id === 'cannon' ? 1.5 : 1);
    g.fireT = tick; g.tx = tx0; g.ty = ty0;
    shot(g.x, g.y, tx0, ty0, 3);
    if (FXH && (D.id === 'cannon' || D.id === 'artillery' || D.id === 'rocketarty')) FXH.muzzle(g.x, g.y, tx0, ty0, true);
    if (wall >= 0) hitWall(B, wall, D.pow * (1 - ((WALL_KIND[t.wallKind] || WALL_KIND[2]).shrug || 0)));
    shellHit(B, E, S, tx0, ty0, D.splash, a);
    for (let q = 1; q < (D.salvo || 1); q++) shellHit(B, E, S, tx0 + (rnd() - 0.5) * 8, ty0 + (rnd() - 0.5) * 8, D.splash * 0.5, a);
  }
}
function shellHit(B, E, S, x, y, splash, a) {
  if (!splash) return;
  if (FXH) FXH.boom(x, y, splash > 50 ? 3 : 2);
  const G = E.grid; if (!G) return;
  const cx = Math.round(x) >> 2, cy = Math.round(y) >> 2;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const c = G.get(cx + dx + (cy + dy) * 10000);
    if (!c) continue;
    for (let k = c.length - 1; k >= 0; k--) {
      const p = c[k];
      if (!p.alive || p.down) continue;
      const ex = p.ti % W.w - x, ey = ((p.ti / W.w) | 0) - y, d2 = ex * ex + ey * ey;
      if (d2 > 5) continue;
      p.mor -= 4 / p.moraleM;
      p.hitT = W.tick;
      const prot = p.mount === 2 ? 0.7 : ARMORS[p.arm || 0].prot * 0.3;
      p.hp -= splash * (1 - d2 / 6) * (1 - prot) * (0.6 + rnd() * 0.7);
      if (p.hp <= 0) soldierFalls(p, null, B, S, E, 'killed by shellfire');
    }
  }
}
function airStep(S, E, B, tick) {
  if (S.helis && tick - S.lastHeli >= 70 && E.units.length) {  // gunships rake whoever is out in the open
    S.lastHeli = tick;
    const u = E.units[rint(E.units.length)];
    const down = (E.fighters || E.air) && rnd() < (E.fighters ? 0.3 : 0.15);
    if (FXH) FXH.plane(S.x, S.y, u.x, u.y, S.pol.color, down);
    if (!down) for (let q = 0; q < 3; q++) shellHit(B, E, S, u.x + (rnd() - 0.5) * 4, u.y + (rnd() - 0.5) * 4, 35);
  }
  if (!S.air || tick - S.lastAir < (S.drones ? 60 : 90)) return;
  S.lastAir = tick;
  // flak and fighters may get them first; drones are small and hard to hit
  const lose = (E.fighters ? 0.6 : E.air ? 0.35 : 0) * (S.drones ? 0.5 : 1);
  if (rnd() < lose) { if (FXH) FXH.plane(S.x, S.y, E.x, E.y, S.pol.color, true); return; }
  if (FXH) FXH.plane(S.x, S.y, E.x, E.y, S.pol.color, false);
  for (let q = 0; q < 6; q++) {
    const u = E.units.length ? E.units[rint(E.units.length)] : null;
    if (!u) break;
    shot(u.x + (rnd() - 0.5) * 2, u.y - 20, u.x + (rnd() - 0.5) * 2, u.y, 4);
    shellHit(B, E, S, u.x + (rnd() - 0.5) * 6, u.y + (rnd() - 0.5) * 6, 70);
  }
}
function siegeStep(B, tick) {
  const t = B.town, A = B.sA, D = B.sB;
  // the defenders' stores go down, and when they run out everyone knows
  if (t.alive) {
    t.stock[R.FOOD] = Math.max(0, t.stock[R.FOOD] - tn(t) * 0.03 * (t.count.granary ? 0.75 : 1));
    B.hunger = t.stock[R.FOOD] < 1 ? (B.hunger || 0) + 1 : 0;
  }
  if (B.stage === 'invest') {
    // fire from the walls? stone at the gates? ladders at the ready? the attackers make up their minds
    // the odds in men, not figures: a big realm's figures stand for whole companies
    const rA = (A.menN || A.men0) / Math.max(1, A.men0), rD = (D.menN || D.men0) / Math.max(1, D.men0);
    const ratio = (A.ok || 1) * rA / Math.max((D.ok || 1) * rD, 1), wait = tick - B.stageT;
    const open = !t.walls || t.fortHP <= 0 || B.breaches >= 2;
    const guns = A.armies.some(a => a.guns.length);
    if (open || (wait > 140 && ratio >= 1.5) || (!guns && wait > 240) || wait > 520) {
      B.stage = 'storm'; B.stageT = tick;
      if (FXH) FXH.word(t.x, t.y, 'Storm the town!', A.pol.color);
      if (A.men0 + D.men0 >= 40) chronT('war', `${A.pol.name} storms ${t.name}${B.breaches ? ' through the breach' : ' with ladders'}.`, t);
      for (const u of A.units) for (const p of u.men) p.mor = Math.min(100, p.mor + 5);
    }
    if (B.hunger > 8 && rnd() < 0.2 && D.morale < 45) { breakSide(D, A, B, tick); chronT('war', `${t.name} starves, and gives up.`, t); return; }
  } else if (t.alive) {
    // fire spreads through streets being fought over; those who didn't get indoors are in the way
    if (rnd() < 0.3 && t.blds.length > 1) {
      const b = t.blds[rint(t.blds.length)];
      if (b.type !== 'hearth') { if (FXH) FXH.burn(b.x, b.y); if (b.type === 'house' && rnd() < 0.2) removeBuilding(b); }
    }
    if (rnd() < 0.2 && tn(t)) { const v = t.members[rint(t.members.length)]; if (v && !v.army) killPerson(v, 'killed in the streets'); }
  }
  // every so often a soldier on the wall is worth a mention
  if (!t.alive) return;
  if (t.walls) towersStep(B, tick);
  if (t.fortHP < t.fortMax && B.stage === 'invest' && D.ok > 3) t.fortHP = Math.min(t.fortMax, t.fortHP + 0.3);
}

// ---- one step of battle ----
function battleStep(B) {
  if (B.over) return;
  const tick = W.tick;
  if ((tick + B.id) % 3) return;
  const A = B.sA, D = B.sB;
  // sorted into a grid so everyone can find their nearest enemy
  _ga.clear(); _gb.clear();
  for (let k = 0; k < A.units.length; k++) { const M = A.units[k].men; for (let q = 0; q < M.length; q++) binPush(_ga, M[q]); }
  for (let k = 0; k < D.units.length; k++) { const M = D.units[k].men; for (let q = 0; q < M.length; q++) binPush(_gb, M[q]); }
  A.grid = _ga; D.grid = _gb;
  if ((tick + B.id) % 24 === 0) {
    B.wx = (tick + B.id) % 240 === 0 ? weatherAt(B.x, B.y) : B.wx;
    commandSide(A, D, B, tick);
    commandSide(D, A, B, tick);
    B.trench = D.home && D.home.tech[TECH_IX.trenches] && D.plan !== 'mob' && tick - B.start > 60 ? D : A.home && A.home.tech[TECH_IX.trenches] && A.plan === 'fire' ? A : null;
    if (FXH && B.trench && tick % 96 === B.id % 96) FXH.trench(B.trench);
    if (B.over) return;
  }
  if ((tick + B.id) % 6 === 0) {
    moveUnits(A, B); moveUnits(D, B);
    enginesStep(A, D, B, tick); enginesStep(D, A, B, tick);
    airStep(A, D, B, tick); airStep(D, A, B, tick);
  }
  if (B.town && (tick + B.id) % 30 === 0) siegeStep(B, tick);
  if (B.over) return;
  const pursuit = B.phase === 'pursuit';
  for (let s = 0; s < 2; s++) {
    const S = s ? D : A, E = s ? A : D, G = s ? _ga : _gb;
    for (let k = S.units.length - 1; k >= 0; k--) {
      const M = S.units[k] && S.units[k].men;
      if (!M) continue;
      for (let q = M.length - 1; q >= 0; q--) {
        const p = M[q];
        if (!p || !p.alive) continue;
        soldierAct(p, B, S, E, G, tick);
      }
    }
    if (pursuit && S.broken) {
      // whoever's caught throws down their weapon, or doesn't get the chance
      for (let k = S.units.length - 1; k >= 0; k--) {
        const M = S.units[k] && S.units[k].men;
        if (!M) continue;
        for (let q = M.length - 1; q >= 0; q--) {
          const p = M[q];
          if (p && p.alive && p.flee && p.hitT === tick && rnd() < 0.4) takePrisoner(p, B, E);
        }
      }
    }
  }
  if (B.over) return;
  // running out of people is the end of it
  const na = countMen(A), nb = countMen(D);
  if (na === 0 || nb === 0 || (B.phase === 'pursuit' && tick >= B.endT)) {
    const win = B.phase === 'pursuit' ? B.winner : (na === 0 ? 'b' : 'a');
    battleEnd(B, win);
    return;
  }
  if (tick - B.start > TPY * 8) battleEnd(B, 'b');
}
function countMen(S) { let n = 0; for (let k = 0; k < S.units.length; k++) n += S.units[k].men.length; return n; }
function fightStep(p) {
  if (!p.btl || p.btl.over) { p.btl = null; p.down = false; if (p.army) { p.task = T_WAR; p.step = 1; p.st = 2; p.wake = W.tick + 20; } else endTask(p, 4); return; }
  p.st = 0; p.wake = W.tick + 6;
}

// ---- how it ended ----
function battleEnd(B, winner, forced) {
  if (B.over) return;
  B.over = true;
  const k = W.battles.indexOf(B); if (k >= 0) W.battles.splice(k, 1);
  const A = B.sA, D = B.sB, Wn = winner === 'a' ? A : D, Ls = winner === 'a' ? D : A;
  // the dead in men, not figures: each figure in a big army stands for a company
  const dead = (A.deadMen || A.dead) + (D.deadMen || D.dead), war = B.war;
  if (war) {
    war.dead += dead; war.lastFight = year();
    const aOnSideA = war.a.includes(A.pol);
    const aWon = winner === 'a';
    war.scoreA += (aWon === aOnSideA ? 1 : -1) * (B.town ? 1.5 : 1) * clamp(dead / 40 + 0.4, 0.5, 2);
    war.won[(aWon === aOnSideA) ? 0 : 1]++;
    if (B.rec) { B.rec.dead = dead; B.rec.won = Wn.pol.name; }
    adjustRel(A.pol, D.pol, -clamp(dead * 0.05, 0.5, 6));
  }
  // the winners hold the ground, so they get their own wounded back, and the other side's
  const mend = S => (S.home && S.home.count.fieldhospital ? 0.3 : 0) + (S.home && S.home.tech[TECH_IX.surgery] ? 0.2 : 0) + (S.home && S.home.tech[TECH_IX.antibiotics] ? 0.25 : 0);
  for (const p of B.fallen) {
    if (!p.alive) continue;
    p.down = false; p.st = 0; p.wake = W.tick + rint(20); p.hp = maxHP(p) * 0.35; p.bleed = 0;
    if (p.side === Wn || forced) {
      if (rnd() < 0.3 + mend(p.side)) { if (rnd() < 0.5 && addTrait(p, 'scarred')) plog(p, `Badly wounded at the ${B.name}, and lived.`); else if (rnd() < 0.3 && addTrait(p, 'lame')) plog(p, `Lost the use of a leg at the ${B.name}.`); }
      else { if (war && p.army) war.dead += p.army.rep || 1; militiaLost(p); killPerson(p, 'died of wounds'); }
    } else if (rnd() < 0.5) takePrisoner(p, B, Wn);
    else { if (war && p.army) war.dead += p.army.rep || 1; militiaLost(p); killPerson(p, 'died of wounds'); }
  }
  B.fallen.length = 0;
  // what was dropped on the field
  const wT = Wn.home, lT = Ls.home;
  if (wT && wT.alive) for (let q = 1; q < WEAPONS.length; q++) if (B.loot[q] >= 1) wT.arsenal[q] += B.loot[q];
  if (wT && lT && wT.alive && lT.alive && !forced) { stealMilitary(lT, wT, 0.04 + dead * 0.002); stealMilitary(wT, lT, 0.08 + dead * 0.004); }
  for (const t of [wT, lT]) if (t && t.alive) { t.warExp = Math.min((t.warExp || 0) + 1 + dead * 0.02, 6); t.warYear = year(); }
  if (!forced) pathXP(Wn.pol, 'con', 30 + dead);
  // everyone stands down
  const stand = S => { for (const a of S.armies) { a.battle = null; a.side = null; for (const p of a.soldiers) { p.btl = null; p.foe = null; p.flee = false; p.down = false; p.bleed = 0; p.mor = clamp(p.mor + 15, 20, 90); p.stam = Math.max(p.stam, 40); if (p.task === T_FIGHT) { p.task = T_WAR; p.step = 0; } p.st = 0; p.wake = W.tick + rint(30); if (p.hp <= 0) p.hp = 10; } } };
  stand(A); stand(D);
  const t = B.town;
  if (t) {
    t.attack = null;
    if (B.militia) {
      for (const p of B.militia.soldiers.slice()) { p.army = null; p.btl = null; p.unit = null; if (p.alive) { returnGear(p, t); p.hp = p.hpMax; p.task = 0; p.st = 0; p.wake = W.tick + rint(20); p.job = p.prevJob || J.NONE; } }
      B.militia.soldiers.length = 0; B.militia.units.length = 0; B.militia.over = true;
    }
    if (forced) { for (const a of A.armies.concat(D.armies)) if (!a.militia) endArmy(a); return; }
    if (winner === 'a') {
      const a0 = A.armies[0];
      if (t.alive && a0) {
        if (t.occupier) {
          const was = t.occupier;
          liberate(t, null);
          chronT('war', `The army of ${A.pol.name} drives the ${was.name} garrison out of ${t.name}.`, t);
          if (t.polity !== A.pol && atWar(A.pol, t.polity)) occupy(t, a0, B);
          if (war) war.scoreA += war.a.includes(A.pol) ? 0.5 : -0.5;
        } else occupy(t, a0, B);
      }
      for (const a of A.armies) { a.morale = Math.min(95, a.morale + 12); if (!nextObjective(a)) endArmy(a); }
    } else {
      if (dead >= 4 || A.men0 >= 15) chronT('war', `${t.name} throws back the army of ${A.pol.name}. ${dead} are dead${B.prisoners ? ` and ${B.prisoners} taken` : ''}.`, t);
      for (const a of A.armies.slice()) if (!retreatArmy(a)) endArmy(a);
      for (const a of D.armies.slice()) { if (a.militia) continue; a.morale = Math.min(95, a.morale + 10); if (!nextObjective(a)) endArmy(a); }
    }
    return;
  }
  if (forced) { for (const a of A.armies.concat(D.armies)) endArmy(a); return; }
  if (dead >= 10) chron('war', `${Wn.pol.name} wins the ${B.name}: ${dead} dead${B.prisoners ? `, ${B.prisoners} prisoners` : ''}, and ${Ls.pol.name} in flight. ${planWord(Wn.plan)}`, Math.round(B.x), Math.round(B.y));
  for (const a of Ls.armies.slice()) if (!retreatArmy(a)) endArmy(a);
  for (const a of Wn.armies.slice()) {
    a.morale = Math.min(95, a.morale + 8); a.wins++;
    if (a.goal === 'garrison') { a.phase = 'garrison'; for (const p of a.soldiers) { p.task = T_WAR; p.step = 0; } continue; }
    if (a.goal === 'relieve' || a.goal === 'intercept') { if (!nextObjective(a)) endArmy(a); continue; }
    a.phase = 'march'; a.path = null; a.arriveT = 0;
    for (const p of a.soldiers) { p.task = T_WAR; p.step = 0; p.st = 0; p.wake = W.tick + rint(30); }
  }
}
const planWord = P => ({ flank: 'Their riders decided it.', envelop: 'The wings closed in and that was that.', feint: 'The false retreat worked.', wedge: 'The wedge went straight through.', fire: 'Nobody got close enough to matter.', blitz: 'The armour went through them.', hold: 'They held their ground and let the enemy break.', line: '', mob: '' })[P] || '';
