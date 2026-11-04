'use strict';
// City walls. The circuit follows the town's own shape, not the grid: a smooth ring round everything built, with towers along it and a
// gatehouse wherever a road passes. Three kinds: a timber palisade, stone walls, and low bastioned walls that shrug off cannon.
// A town that outgrows its walls builds a wider circuit; breaches are patched after a siege; in the railway age a big, safe city pulls them
// down and a boulevard follows the line. Under the hood the ring is still stamped onto tiles, because that's what people and armies walk on.

// fort: how much the walls add to the town's defence. hp / gate: what a stretch of wall or a gate takes to break. per: material per tile.
// tower: tiles between towers. shrug: how much of a cannonball's force the wall turns aside.
const WALL_KIND = [null,
  { name: 'timber palisade', fort: 30, hp: 16, gate: 22, res: R.WOOD, per: 0.5, tower: 9, shrug: 0, h: 0.45, w: 0.2, face: '#6b4a2c', top: '#8f6a3e', dark: '#4a321c' },
  { name: 'stone walls', fort: 60, hp: 32, gate: 45, res: R.STONE, per: 1, tower: 8, shrug: 0, h: 0.7, w: 0.3, face: '#938d80', top: '#bdb7a8', dark: '#6f6a5f' },
  { name: 'bastioned walls', fort: 110, hp: 46, gate: 70, res: R.STONE, per: 1.5, tower: 10, shrug: 0.5, h: 0.5, w: 0.38, face: '#8d8676', top: '#b3ac9b', dark: '#696356' },
];
const WALL_SKIP = new Set(['mine', 'dock', 'quarry', 'oilwell', 'mill', 'wharf', 'lighthouse']);
const WALL_N = 48;  // bearings the ring is measured along

function wallKindFor(t) {
  if (knows(t, 'starforts') && tn(t) >= 200) return 3;
  if (knows(t, 'masonry')) return 2;
  if (knows(t, 'palisade')) return 1;
  return 0;
}

// Once a year: build, repair, outgrow, upgrade or pull down.
function wallsYear(t) {
  if (t.nomad || t.attack || !t.alive) return;
  const n = tn(t), yr = year(), want = wallKindFor(t);
  const atWarNow = t.polity && Object.keys(t.polity.warsWith).length > 0;
  // a square wall from an older save, or a ring from before rings met their neighbours: replaced by a proper one when next needed
  if (t.walls && (!t.wallPath || !t.wallOn)) { clearWallTiles(t, false); t.walls = false; t.wallPath = null; t.wallKind = 0; recomputeMods(t); }
  const front = onFrontier(t);
  if (t.walls) {
    // railways and cannon make walls pointless; a town deep inside the realm lets them go once war has been gone a long time
    if (knows(t, 'railway') && t.warYear < yr - 40 && !atWarNow) { razeWalls(t, true); return; }
    if (!front && t.warYear < yr - 150 && !atWarNow) { razeWalls(t, knows(t, 'paved')); return; }
    repairWalls(t);
    if (want > t.wallKind && front && (atWarNow || t.warYear > yr - 60)) { raiseWalls(t, want, 'upgrade'); return; }
    if (n > (t.wallN || 0) * 1.5 && outsideWalls(t) > 0.3) raiseWalls(t, Math.max(want, t.wallKind), 'grow');
    return;
  }
  if (!want || n < (want === 1 ? 90 : 160) || knows(t, 'railway')) return;
  // walls are for the border: towns within reach of a foreign realm, or the capital of a realm at war
  const cap = t.polity && t.polity.capital === t && n >= 250;
  if (!front && !cap) return;
  // a palisade goes up when war has actually come to the town; stone walls when an enemy town is close, or fighting was recent here
  const threat = want === 1 ? (t.warYear > yr - 30 && (atWarNow || t.attack)) || t.warYear > yr - 8 : t.warYear > yr - 25 || (atWarNow && enemyNear(t));
  if (threat) raiseWalls(t, want, 'new');
}
function enemyNear(t) {
  for (const o of W.towns) if (o.alive && o.polity !== t.polity && Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 40 && atWar(o.polity, t.polity)) return true;
  return false;
}
// A border town: one belonging to another realm lies within a few days' march.
function onFrontier(t) {
  const yr = Math.floor(year());
  if (t.frontY === yr) return t.front;
  let f = false;
  for (const o of W.towns) {
    if (o === t || !o.alive || o.polity === t.polity || tn(o) < 40) continue;
    if (Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 26) { f = true; break; }
  }
  t.frontY = yr; t.front = f;
  return f;
}

// The ring: how far the town reaches along each bearing, plus room for a street inside the wall, smoothed and given a little give.
function planWalls(t) {
  const pts = [];
  for (const b of t.blds) {
    if (b.ruin || WALL_SKIP.has(b.type) || (BLD[b.type] && BLD[b.type].place === 'far')) continue;
    pts.push(b.x, b.y, b.x + b.size, b.y, b.x, b.y + b.size, b.x + b.size, b.y + b.size);
  }
  if (pts.length < 8) return null;
  let cx = 0, cy = 0; const np = pts.length / 2;
  for (let k = 0; k < pts.length; k += 2) { cx += pts[k]; cy += pts[k + 1]; }
  cx /= np; cy /= np;
  const r = new Float32Array(WALL_N);
  for (let k = 0; k < pts.length; k += 2) {
    const dx = pts[k] - cx, dy = pts[k + 1] - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    for (let q = 0; q < WALL_N; q++) {
      const th = q / WALL_N * 6.2832, c = Math.cos(th - a);
      if (c > 0.5) r[q] = Math.max(r[q], d * c);
    }
  }
  const sm = new Float32Array(WALL_N);
  for (let q = 0; q < WALL_N; q++) sm[q] = Math.max(r[q], (r[(q + WALL_N - 1) % WALL_N] + r[q] * 2 + r[(q + 1) % WALL_N]) / 4);
  for (let q = 0; q < WALL_N; q++) r[q] = Math.max(4, sm[q] + 2.4 + (hash2(t.id, q, 71) - 0.5) * 0.9);
  // a ring stops halfway to the next town, so two towns' walls meet along one line instead of crossing
  let rMax = 0; for (let q = 0; q < WALL_N; q++) rMax = Math.max(rMax, r[q]);
  for (const o of W.towns) {
    if (o === t || !o.alive || o.nomad) continue;
    const vx = o.x + 0.5 - cx, vy = o.y + 0.5 - cy, L2 = vx * vx + vy * vy;
    if (L2 > (rMax * 2 + 4) ** 2) continue;
    for (let q = 0; q < WALL_N; q++) {
      const th = q / WALL_N * 6.2832, dot = Math.cos(th) * vx + Math.sin(th) * vy;
      if (dot > 0) r[q] = Math.min(r[q], Math.max(3, L2 / (2 * dot)));
    }
  }
  for (let q = 0; q < WALL_N; q++) sm[q] = Math.min(r[q], (r[(q + WALL_N - 1) % WALL_N] + r[q] * 2 + r[(q + 1) % WALL_N]) / 4);
  r.set(sm);
  // walk the curve at about one tile a step
  const path = [];
  for (let q = 0; q < WALL_N; q++) {
    const q1 = (q + 1) % WALL_N, a0 = q / WALL_N * 6.2832, a1 = (q + 1) / WALL_N * 6.2832;
    const x0 = cx + Math.cos(a0) * r[q], y0 = cy + Math.sin(a0) * r[q], x1 = cx + Math.cos(a1) * r[q1], y1 = cy + Math.sin(a1) * r[q1];
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let s = 0; s < steps; s++) {
      const f = s / steps;
      path.push(+clamp(x0 + (x1 - x0) * f, 1, W.w - 2).toFixed(2), +clamp(y0 + (y1 - y0) * f, 1, W.h - 2).toFixed(2));
    }
  }
  return { cx, cy, r: Array.from(r, v => +v.toFixed(2)), path };
}
// The tiles under the curve, joined edge to edge so nobody slips through a diagonal gap.
function ringTiles(path) {
  const w = W.w, out = [], seen = new Set();
  let last = -1;
  const add = i => { if (!seen.has(i)) { seen.add(i); out.push(i); } };
  const n = path.length / 2;
  for (let k = 0; k <= n; k++) {
    const a = k % n, b = (k + 1) % n;
    const x0 = path[a * 2], y0 = path[a * 2 + 1], x1 = path[b * 2], y1 = path[b * 2 + 1];
    for (let s = 0; s < 4; s++) {
      const x = Math.floor(x0 + (x1 - x0) * s / 4), y = Math.floor(y0 + (y1 - y0) * s / 4), i = y * w + x;
      if (i === last) continue;
      if (last >= 0) { const lx = last % w, ly = (last / w) | 0; if (lx !== x && ly !== y) add(ly * w + x); }
      add(i); last = i;
    }
  }
  return out;
}
const insideWalls = (t, x, y) => {
  const dx = x - t.wallC[0], dy = y - t.wallC[1], f = ((Math.atan2(dy, dx) / 6.2832 + 1) % 1) * WALL_N, q = Math.floor(f) % WALL_N, g = f - Math.floor(f);
  return Math.hypot(dx, dy) < t.wallR[q] * (1 - g) + t.wallR[(q + 1) % WALL_N] * g;
};
function outsideWalls(t) {
  let out = 0, all = 0;
  for (const b of t.blds) if (b.type === 'house' && !b.ruin) { all++; if (!insideWalls(t, b.x + b.size / 2, b.y + b.size / 2)) out++; }
  return all ? out / all : 0;
}

function raiseWalls(t, kind, why) {
  const plan = planWalls(t);
  if (!plan) return false;
  const K = WALL_KIND[kind], tiles = ringTiles(plan.path);
  let land = 0; for (const i of tiles) if (!W.water[i]) land++;
  const need = Math.ceil(land * K.per);
  // stone walls can be built in brick too; a palisade only takes timber
  const alt = K.res === R.STONE ? R.BRICK : -1;
  const have = t.stock[K.res] + (alt >= 0 ? t.stock[alt] : 0);
  if (have < need) return false;
  const fromMain = Math.min(t.stock[K.res], need);
  t.stock[K.res] -= fromMain; if (alt >= 0) t.stock[alt] -= need - fromMain;
  if (t.walls) clearWallTiles(t, false);
  const w = W.w, wall = [], gates = [], mine = new Set();
  for (const i of tiles) {
    if (i < w || i >= W.occ.length - w || W.water[i] || W.occ[i] === 1) continue;
    if (nearForeignWall(i, mine)) continue;  // a neighbour's wall already stands here: join it
    if (W.road[i] >= 2) { gates.push(i); continue; }  // a real road gets a gatehouse; a worn footpath is simply walled over
    if (W.road[i]) { W.road[i] = 0; updCost(i); }
    if (W.occ[i] === 2) dropField(i);
    W.occ[i] = 3; W.tree[i] = 0; W.plant[i] = 0; dirty(i);
    wall.push(i); mine.add(i);
  }
  // a ring no road crosses still needs a way out to the fields: cut gates on the far sides
  if (gates.length < 2 && wall.length > 8) for (const k of [0, Math.floor(wall.length / 2)]) {
    const i = wall[k]; W.occ[i] = 0; W.road[i] = Math.max(W.road[i], 1); updCost(i); dirty(i); gates.push(i);
  }
  t.walls = true; t.wallKind = kind; t.wallN = tn(t); t.wallY = Math.floor(year());
  t.wallPath = plan.path; t.wallC = [+plan.cx.toFixed(2), +plan.cy.toFixed(2)]; t.wallR = plan.r;
  t.wallTiles = wall.filter(i => W.occ[i] === 3); t.wallGates = gates;
  // which steps of the curve are this town's own wall or gate: the rest is sea, buildings, or a neighbour's wall it joins
  const own = new Set(t.wallTiles), gs = new Set(gates), np = plan.path.length / 2;
  t.wallOn = new Uint8Array(np);
  for (let k = 0; k < np; k++) {
    const k1 = (k + 1) % np, i = Math.floor((plan.path[k * 2 + 1] + plan.path[k1 * 2 + 1]) / 2) * w + Math.floor((plan.path[k * 2] + plan.path[k1 * 2]) / 2);
    let on = own.has(i) || gs.has(i);
    if (!on) for (let q = 0; q < 8 && !on; q++) on = own.has(i + NB_D[q]) && !nearForeignWall(i, own);
    t.wallOn[k] = on ? 1 : 0;
  }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let k = 0; k < plan.path.length; k += 2) { x0 = Math.min(x0, plan.path[k]); x1 = Math.max(x1, plan.path[k]); y0 = Math.min(y0, plan.path[k + 1]); y1 = Math.max(y1, plan.path[k + 1]); }
  t.wallBox = { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) };
  // towers at even spacing along the circuit, wherever the wall actually stands
  t.wallTowers = [];
  for (let k = 0, d = 0, n = plan.path.length / 2; k < n; k++) {
    const k1 = (k + 1) % n; d += Math.hypot(plan.path[k1 * 2] - plan.path[k * 2], plan.path[k1 * 2 + 1] - plan.path[k * 2 + 1]);
    if (d < K.tower) continue;
    const x = plan.path[k * 2], y = plan.path[k * 2 + 1], i = Math.floor(y) * w + Math.floor(x);
    if (own.has(i)) { t.wallTowers.push(x, y); d = 0; }
  }
  recomputeMods(t);
  t.fortHP = t.fortMax;
  const say = why === 'grow' ? `${t.name} has outgrown its walls, and builds a wider circuit round the new streets.`
    : why === 'upgrade' ? (kind === 3 ? `${t.name} rebuilds its walls low and angled, with bastions against cannon.` : `${t.name} replaces its palisade with stone walls.`)
    : kind === 1 ? `${t.name} raises a timber palisade.` : `${t.name} raises ${K.name}.`;
  chronT('misc', say, t);
  return true;
}
// Is there a wall here, or right next to it, that isn't this town's own? (own: a Set of this town's wall tiles, or null for "none yet")
function nearForeignWall(i, own) {
  if (W.occ[i] === 3 && !(own && own.has(i))) return true;
  for (let q = 0; q < 8; q++) { const j = i + NB_D[q]; if (j >= 0 && j < W.occ.length && W.occ[j] === 3 && !(own && own.has(j))) return true; }
  return false;
}
function clearWallTiles(t, road) {
  for (const i of t.wallTiles || []) {
    if (W.occ[i] === 3) W.occ[i] = 0;
    if (road && !W.water[i] && W.occ[i] === 0) W.road[i] = Math.max(W.road[i], 2);
    updCost(i); dirty(i);
  }
  t.wallTiles = []; t.wallGates = []; t.wallTowers = [];
}
function razeWalls(t, boulevard) {
  clearWallTiles(t, boulevard);
  t.walls = false; t.wallKind = 0; t.wallPath = null; t.wallBox = null; t.wallOn = null;
  recomputeMods(t);
  chronT('misc', boulevard ? `${t.name} pulls down its old walls. A broad boulevard follows the line where they stood.` : `${t.name}, far from any border now, lets its old walls go for building stone.`, t);
}
// Breaches are patched, a few stretches a year, as long as there's material.
function repairWalls(t) {
  if (!t.wallPath) return;
  const K = WALL_KIND[t.wallKind] || WALL_KIND[2];
  const gates = new Set(t.wallGates);
  let fixed = 0;
  for (const i of t.wallTiles) {  // only its own stretches: the gaps where it joins a neighbour's wall stay open
    if (fixed >= 8) break;
    if (W.occ[i] !== 0 || W.water[i] || W.road[i] >= 2 || gates.has(i)) continue;
    if (t.stock[K.res] < K.per) break;
    t.stock[K.res] -= K.per;
    W.road[i] = 0;
    W.occ[i] = 3; W.tree[i] = 0; W.plant[i] = 0; updCost(i); dirty(i);
    fixed++;
  }
}

// During a siege the towers shoot at anyone in reach: arrows, then muskets once the town has them.
function towersStep(B, tick) {
  const t = B.town, A = B.sA, D = B.sB;
  if (!t.wallTowers || !t.wallTowers.length || !(D.ok > 0) || !A.units.length) return;
  const gun = knows(t, 'musket'), reach = gun ? 11 : 8, dmg = gun ? 30 : 13;
  for (let k = 0; k < t.wallTowers.length; k += 2) {
    if ((tick + k * 7) % 24) continue;
    const x = t.wallTowers[k], y = t.wallTowers[k + 1];
    if (W.occ[Math.floor(y) * W.w + Math.floor(x)] !== 3) continue;  // this tower has fallen
    let best = null, bd = reach * reach;
    for (const u of A.units) { if (!u.men.length) continue; const d = (u.x - x) ** 2 + (u.y - y) ** 2; if (d < bd) { bd = d; best = u; } }
    if (!best) continue;
    const p = best.men[rint(best.men.length)];
    if (!p || !p.alive || p.down) continue;
    const px = p.ti % W.w, py = (p.ti / W.w) | 0;
    shot(x - 0.5, y - 1.5, px, py, gun ? 2 : 0);
    if (rnd() > (gun ? 0.45 : 0.35)) continue;
    const prot = ARMORS[p.arm || 0].prot;
    p.hp -= dmg * (1 - prot) * (0.6 + rnd() * 0.8);
    p.mor -= 3 / p.moraleM; p.hitT = W.tick;
    if (p.hp <= 0) soldierFalls(p, null, B, D, A, 'shot from the walls');
  }
}

// ---- drawing: a band with a face and a lit top, towers, gatehouses and rubble where it's broken ----
function drawWalls(ctx, c, z, x0, y0, x1, y1) {
  if (z < 0.2) return;
  const u = TS * z;
  for (const t of W.towns) {
    if (!t.walls || !t.wallPath || !t.wallBox) continue;
    const bx = t.wallBox;
    if (bx.x1 < x0 || bx.x0 > x1 || bx.y1 < y0 || bx.y0 > y1) continue;
    const K = WALL_KIND[t.wallKind] || WALL_KIND[2], P = t.wallPath, n = P.length / 2, gates = new Set(t.wallGates);
    const sx = x => (x * TS - c.x) * z, sy = y => (y * TS - c.y) * z, h = K.h * u, lw = Math.max(1, K.w * u);
    // which stretches stand: the tile under each step's midpoint says
    const state = new Uint8Array(n);  // 0 nothing (sea or a building), 1 standing, 2 gate, 3 broken
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n, i = Math.floor((P[k * 2 + 1] + P[k1 * 2 + 1]) / 2) * W.w + Math.floor((P[k * 2] + P[k1 * 2]) / 2);
      state[k] = (t.wallOn && !t.wallOn[k]) || W.water[i] || W.occ[i] === 1 ? 0 : W.occ[i] === 3 ? 1 : gates.has(i) || W.road[i] ? 2 : 3;
    }
    // stray stubs a few tiles long, cut off by houses on both sides, read as clutter: leave them out unless they hold a gate
    const hidden = new Set();
    for (let k = 0; k < n; k++) {
      if (state[k] !== 1 || state[(k + n - 1) % n] === 1) continue;
      let e = k, len = 0;
      while (state[e % n] === 1 && len < n) { e++; len++; }
      if (len >= 5 || len >= n || state[(k + n - 1) % n] === 2 || state[e % n] === 2 || state[e % n] === 3 || state[(k + n - 1) % n] === 3) continue;
      for (let q = k; q < e; q++) { state[q % n] = 0; hidden.add(Math.floor(P[(q % n) * 2 + 1]) * W.w + Math.floor(P[(q % n) * 2])); }
    }
    const run = (dy, col, width, dash) => {
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.setLineDash(dash || []);
      ctx.beginPath();
      let on = false;
      for (let k = 0; k <= n; k++) {
        const q = k % n, s = state[(k + n - 1) % n] === 1 || state[q] === 1;
        if (!s) { on = false; continue; }
        const X = sx(P[q * 2]), Y = sy(P[q * 2 + 1]) - dy;
        if (on && state[(k + n - 1) % n] === 1) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); on = true; }
      }
      ctx.stroke();
    };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (t.wallKind === 3) run(0, 'rgba(110,125,70,.4)', lw * 2);  // the earth glacis in front
    run(-u * 0.15, 'rgba(0,0,0,.28)', lw * 1.3);  // shadow at the foot
    if (z >= 0.6) for (let f = 0; f < h; f += Math.max(1, lw * 0.6)) run(f, K.face, lw);
    else run(h * 0.5, K.face, lw);
    run(h, K.top, lw * 0.75);
    if (z >= 1.2) {
      if (t.wallKind === 1) run(h + u * 0.12, K.dark, lw * 0.45, [Math.max(1, u * 0.18), Math.max(1, u * 0.14)]);  // sharpened stakes
      else run(h + u * 0.14, K.dark, lw * 0.5, [Math.max(1, u * 0.3), Math.max(1, u * 0.3)]);  // battlements
    }
    ctx.setLineDash([]);
    // rubble where it's been breached
    ctx.fillStyle = '#7d786d';
    for (let k = 0; k < n; k++) if (state[k] === 3) {
      const X = sx(P[k * 2]), Y = sy(P[k * 2 + 1]);
      for (let q = 0; q < 3; q++) ctx.fillRect(X + (hash2(k, q, t.id) - 0.5) * u, Y + (hash2(q, k, t.id) - 0.5) * u * 0.6, Math.max(1, u * 0.3), Math.max(1, u * 0.22));
    }
    // towers: square timber platforms, round stone towers, or arrow-headed bastions pointing outward
    const T = t.wallTowers || [];
    for (let k = 0; k < T.length; k += 2) {
      const x = T[k], y = T[k + 1], i = Math.floor(y) * W.w + Math.floor(x);
      if (W.occ[i] !== 3 || hidden.has(i)) continue;
      const X = sx(x), Y = sy(y);
      if (t.wallKind === 3) {
        const ox = x - t.wallC[0], oy = y - t.wallC[1], d = Math.hypot(ox, oy) || 1, nx = ox / d, ny = oy / d, L = 1.3 * u, S = 0.95 * u;
        const pts = [[X + nx * L, Y + ny * L], [X - ny * S, Y + nx * S], [X - nx * u * 0.3, Y - ny * u * 0.3], [X + ny * S, Y - nx * S]];
        for (const [col, dy] of [[K.face, 0], [K.top, h]]) { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([a, b], q) => q ? ctx.lineTo(a, b - dy) : ctx.moveTo(a, b - dy)); ctx.closePath(); ctx.fill(); }
      } else {
        const tw = (t.wallKind === 1 ? 0.7 : 0.9) * u, th = h * (t.wallKind === 1 ? 1.8 : 1.75);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X - tw / 2, Y - u * 0.1, tw, u * 0.3);
        ctx.fillStyle = K.face; ctx.fillRect(X - tw / 2, Y - th, tw, th);
        ctx.fillStyle = K.dark; ctx.fillRect(X - tw / 2, Y - th, Math.max(1, tw * 0.2), th);
        ctx.fillStyle = K.top; ctx.fillRect(X - tw / 2 - u * 0.08, Y - th - u * 0.3, tw + u * 0.16, u * 0.3);
        if (z >= 1.2) { ctx.fillStyle = K.dark; for (let q = 0; q < 3; q++) ctx.fillRect(X - tw / 2 + q * tw * 0.4, Y - th - u * 0.5, tw * 0.2, u * 0.22); ctx.fillStyle = '#2a2420'; ctx.fillRect(X - u * 0.1, Y - th * 0.6, u * 0.2, u * 0.35); }
      }
    }
    // gatehouses: a tower each side of the road and a dark arch
    for (const i of t.wallGates || []) {
      if (W.water[i]) continue;
      const x = i % W.w + 0.5, y = ((i / W.w) | 0) + 0.5, X = sx(x), Y = sy(y);
      const gw = 0.95 * u, gh = h * 1.5;
      ctx.fillStyle = K.dark; ctx.fillRect(X - gw * 0.9, Y - gh, gw * 0.5, gh); ctx.fillRect(X + gw * 0.4, Y - gh, gw * 0.5, gh);
      ctx.fillStyle = K.top; ctx.fillRect(X - gw * 0.95, Y - gh - u * 0.25, gw * 1.9, u * 0.3);
      ctx.fillStyle = K.face; ctx.fillRect(X - gw * 0.4, Y - gh, gw * 0.8, gh * 0.45);
    }
  }
  ctx.lineCap = 'butt';
}
