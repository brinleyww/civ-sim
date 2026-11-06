'use strict';
// Where roads meet. Worked out from the road network whenever it changes (never stored in the save), and drawn with the roads:
// crossroads and T-junctions with stop and give-way lines, traffic lights cycling through their phases, mini and large
// roundabouts, zebra crossings, grade-separated interchanges (an overbridge, a diamond, a cloverleaf, a stack), rail level
// crossings with barriers that come down for a train, and bridges where a road crosses a river or a canal.

// How grand a road is: 3 motorway, 2 dual carriageway or ring road, 1 a main street, 0 everything else.
const RD_CLASS = {};
for (let k = 1; k < RT.length; k++) {
  const id = RT[k].id;
  RD_CLASS[k] = id === 'motorway' || id === 'tollway' || id === 'smartway' ? 3 : id === 'dual' || id === 'ringroad' ? 2 : id === 'arterial' || id === 'avenue' || id === 'collector' || id === 'industrial' || id === 'busway' || id === 'highstreet' ? 1 : 0;
}
const JN_NAME = { stack: 'Stack interchange', clover: 'Cloverleaf', diamond: 'Diamond interchange', flyover: 'Overbridge', roundabout: 'Roundabout', mini: 'Mini roundabout', signals: 'Traffic lights', cross: 'Crossroads', tee: 'T-junction', level: 'Level crossing', railbridge: 'Bridge over the railway' };
let JN = null;
const jnTownAt = (x, y) => { const j = (y | 0) * W.w + (x | 0); return j >= 0 && j < W.w * W.h ? W.townById[W.owner[j]] || null : null; };
// angle of a road's line at point index k
function rdAngle(P, k) {
  const m = P.length >> 1, a = Math.max(0, k - 1), b = Math.min(m - 1, k + 1);
  return Math.atan2(P[b * 2 + 1] - P[a * 2 + 1], P[b * 2] - P[a * 2]);
}
function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
  const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy, den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return -1;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / den, u = ((cx - ax) * ry - (cy - ay) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}
// What a meeting of two roads becomes: by how grand each is, how busy the place is and what its people know.
function jnKind(cM, cm, t, four, h) {
  const n = t ? tn(t) : 0, kn = id => t && knows(t, id);
  if (cM === 3) return cm === 3 ? (kn('computers') || n >= 4000 ? 'stack' : 'clover') : cm === 2 ? 'clover' : cm === 1 ? 'diamond' : 'flyover';
  // no roundabouts (the user's choice): busy crossings get traffic lights once there is electricity, the rest are plain crossroads
  if (cM === 2) return cm === 2 ? 'diamond' : kn('electric') ? 'signals' : 'cross';
  if (!four) return cM >= 1 && n >= 1500 && kn('electric') ? 'signals' : 'tee';
  if (cM === 1 && cm >= 1) return n >= 800 && kn('electric') ? 'signals' : 'cross';
  if (cM === 1) return n >= 2500 && kn('electric') ? 'signals' : 'cross';
  return 'cross';
}
function buildJunctions() {
  const N = W.roadNet;
  if (JN && JN.v === (N ? N.v : -1) && JN.W === W && JN.rv === (W.rails ? W.rails.length : 0)) return JN;
  JN = { v: N ? N.v : -1, W, rv: W.rails ? W.rails.length : 0, list: [], zebra: [], rail: [] };
  if (!N) return JN;
  const R = N.roads.filter(r => r.done), cell = new Map(), key = (x, y) => ((y >> 1) * 4096 + (x >> 1));
  for (let r = 0; r < R.length; r++) {
    const P = R[r].pts;
    for (let k = 0; k + 3 < P.length; k += 2) {
      const x0 = Math.min(P[k], P[k + 2]) | 0, x1 = Math.max(P[k], P[k + 2]) | 0, y0 = Math.min(P[k + 1], P[k + 3]) | 0, y1 = Math.max(P[k + 1], P[k + 3]) | 0;
      for (let y = y0; y <= y1 + 1; y += 2) for (let x = x0; x <= x1 + 1; x += 2) { const q = key(x, y); let L = cell.get(q); if (!L) cell.set(q, L = []); L.push(r, k >> 1); }
    }
  }
  const add = (x, y, rA, kA, rB, kB, four) => {
    for (const J of JN.list) if ((J.x - x) ** 2 + (J.y - y) ** 2 < 2.2) return;
    for (const nd of N.nodes) if ((nd.x - x) ** 2 + (nd.y - y) ** 2 < 2) return;  // a planned roundabout is there already
    const A = R[rA], B = R[rB], cA = RD_CLASS[A.type], cB = RD_CLASS[B.type], swap = cB > cA || (cB === cA && RT[B.type].wid > RT[A.type].wid);
    const M = swap ? B : A, m = swap ? A : B, kM = swap ? kB : kA, km = swap ? kA : kB;
    const t = jnTownAt(x, y), kind = jnKind(RD_CLASS[M.type], RD_CLASS[m.type], t, four, hash2(x | 0, y | 0, 17));
    JN.list.push({ x, y, kind, aM: rdAngle(M.pts, kM), am: rdAngle(m.pts, km), wM: RT[M.type].wid, wm: RT[m.type].wid, tM: M.type, tm: m.type, four, mEnd: four ? 0 : (km < 2 ? 1 : -1), name: JN_NAME[kind] });
  };
  // crossings: one road's segment through another's
  for (let r = 0; r < R.length; r++) {
    const P = R[r].pts;
    for (let k = 0; k + 3 < P.length; k += 2) {
      const L = cell.get(key(P[k] | 0, P[k + 1] | 0));
      if (!L) continue;
      for (let q = 0; q < L.length; q += 2) {
        const r2 = L[q], k2 = L[q + 1];
        if (r2 <= r || R[r2].proj === R[r].proj) continue;
        const Q = R[r2].pts, t = segHit(P[k], P[k + 1], P[k + 2], P[k + 3], Q[k2 * 2], Q[k2 * 2 + 1], Q[k2 * 2 + 2], Q[k2 * 2 + 3]);
        if (t < 0) continue;
        const m2 = Q.length >> 1;
        // a road that only touches another at its very end is a T, not a crossing
        const endA = (k >> 1) < 1 || (k >> 1) >= (P.length >> 1) - 2, endB = k2 < 1 || k2 >= m2 - 2;
        add(P[k] + (P[k + 2] - P[k]) * t, P[k + 1] + (P[k + 3] - P[k + 1]) * t, r, k >> 1, r2, k2, !(endA || endB));
      }
    }
  }
  // T-junctions: a road ending on the side of another
  for (let r = 0; r < R.length; r++) {
    const P = R[r].pts, m = P.length >> 1;
    for (const e of [0, m - 1]) {
      const x = P[e * 2], y = P[e * 2 + 1], L = cell.get(key(x | 0, y | 0));
      if (!L) continue;
      let best = -1, bk = 0, bd = 1e9;
      for (let q = 0; q < L.length; q += 2) {
        const r2 = L[q], k2 = L[q + 1];
        if (r2 === r || R[r2].proj === R[r].proj) continue;
        const Q = R[r2].pts, d = (Q[k2 * 2] - x) ** 2 + (Q[k2 * 2 + 1] - y) ** 2;
        if (d < bd) { bd = d; best = r2; bk = k2; }
      }
      if (best < 0 || bd > (RT[R[best].type].wid / 2 + 1.2) ** 2) continue;
      add(x, y, best, bk, r, e, false);
    }
  }
  // zebra crossings along busy town main roads, and the level crossings and rail bridges where roads meet a railway
  for (const R0 of R) {
    const T = RT[R0.type], P = R0.pts, m = P.length >> 1;
    if ((T.id === 'arterial' || T.id === 'avenue' || T.id === 'highstreet' || T.id === 'collector') && W.towns) {
      for (let k = 6; k < m - 6; k += 9) {
        const x = P[k * 2], y = P[k * 2 + 1], t = jnTownAt(x, y);
        if (!t || tn(t) < 600 || Math.hypot(x - t.x, y - t.y) > urbanR(t)) continue;
        if (JN.list.some(J => (J.x - x) ** 2 + (J.y - y) ** 2 < 9)) continue;
        JN.zebra.push({ x, y, a: rdAngle(P, k), w: T.wid });
      }
    }
    if (!W.rail) continue;
    let last = -9;
    for (let k = 0; k < m; k++) {
      const j = (P[k * 2 + 1] | 0) * W.w + (P[k * 2] | 0);
      if (!W.rail[j] || k - last < 4) continue;
      last = k;
      const cls = RD_CLASS[R0.type];
      // which train passes here, and where along its line, so the barriers can come down for it
      let ri = -1, rp = 0;
      if (W.rails) for (let q = 0; q < W.rails.length && ri < 0; q++) { const pa = W.rails[q].path, ix = pa.indexOf(j); if (ix >= 0) { ri = q; rp = ix; } }
      JN.rail.push({ x: P[k * 2], y: P[k * 2 + 1], a: rdAngle(P, k), w: T.wid, kind: cls >= 2 ? 'railbridge' : 'level', ri, rp, surf: T.surf });
    }
  }
  return JN;
}
// ---- drawing (inside the world transform: 1 unit = 1 terrain pixel, TS to a tile) ----
const jnVis = (J, x0, y0, x1, y1, m) => J.x > x0 - m && J.x < x1 + m && J.y > y0 - m && J.y < y1 + m;
function jnStroke(ctx, path, w, surf, edge) {
  ctx.strokeStyle = edge; ctx.lineWidth = w * TS * 1.22; ctx.stroke(path);
  ctx.strokeStyle = surf; ctx.lineWidth = w * TS; ctx.stroke(path);
}
// A slip road from the main road to the minor one, as a smooth curve: the ramps of diamonds, cloverleaves and stacks.
function jnRamp(J, sM, sm) {
  const ux = Math.cos(J.aM), uy = Math.sin(J.aM), vx = Math.cos(J.am), vy = Math.sin(J.am);
  const nx = -uy, ny = ux, side = Math.sign(nx * vx * sm + ny * vy * sm) || 1;
  const d = J.wM / 2 + 2.4, e = J.wM / 2 + 1.3;
  const qx = J.x + ux * sM * d + nx * side * (J.wM / 2 + 0.1), qy = J.y + uy * sM * d + ny * side * (J.wM / 2 + 0.1);
  const px = J.x + vx * sm * e + ux * sM * (J.wm / 2 + 0.15), py = J.y + vy * sm * e + uy * sM * (J.wm / 2 + 0.15);
  const p = new Path2D();
  p.moveTo(qx * TS, qy * TS);
  p.quadraticCurveTo((J.x + ux * sM * d * 0.45 + vx * sm * e * 1.05 + nx * side * 0.4) * TS, (J.y + uy * sM * d * 0.45 + vy * sm * e * 1.05 + ny * side * 0.4) * TS, px * TS, py * TS);
  return p;
}
// Under the roads: the ramps and loops of the interchanges.
function drawJunctionRamps(ctx, z, x0, y0, x1, y1) {
  const J0 = buildJunctions(), SL = RT[RT_IX.sliproad];
  for (const J of J0.list) {
    if (!jnVis(J, x0, y0, x1, y1, 8) || (J.kind !== 'diamond' && J.kind !== 'clover' && J.kind !== 'stack')) continue;
    for (const sM of [-1, 1]) for (const sm of [-1, 1]) jnStroke(ctx, jnRamp(J, sM, sm), SL.wid, SL.surf, SL.edge);
    if (J.kind === 'clover') {
      // four loops, one in each quarter between the roads
      const ux = Math.cos(J.aM), uy = Math.sin(J.aM), vx = Math.cos(J.am), vy = Math.sin(J.am), rl = J.wM / 2 + 1.15;
      for (const sM of [-1, 1]) for (const sm of [-1, 1]) {
        const cx = J.x + (ux * sM + vx * sm) * rl * 0.98, cy = J.y + (uy * sM + vy * sm) * rl * 0.98;
        const p = new Path2D(); p.arc(cx * TS, cy * TS, rl * 0.72 * TS, 0, 6.283);
        ctx.fillStyle = '#6f9a50'; ctx.fill(p);
        jnStroke(ctx, p, SL.wid, SL.surf, SL.edge);
      }
    }
  }
}
// On top of the road surface: roundabouts, the decks of overbridges and the high ramps of a stack.
function drawJunctionTops(ctx, z, x0, y0, x1, y1) {
  const J0 = buildJunctions(), far = z < 0.45;
  for (const J of J0.list) {
    if (!jnVis(J, x0, y0, x1, y1, 6)) continue;
    const cx = J.x * TS, cy = J.y * TS;
    if (J.kind === 'roundabout' || J.kind === 'mini') {
      const big = J.kind === 'roundabout', r = (big ? Math.max(J.wM, J.wm) * 0.9 + 0.55 : Math.max(J.wM, J.wm) * 0.55) * TS, TM = RT[J.tM];
      ctx.fillStyle = TM.edge || '#7a776f'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.14, 0, 6.283); ctx.fill();
      ctx.fillStyle = TM.surf; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.283); ctx.fill();
      if (big) {
        ctx.fillStyle = '#d8d4c8'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#5f8f48'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.44, 0, 6.283); ctx.fill();
        if (!far) { ctx.fillStyle = '#3f6f32'; ctx.beginPath(); ctx.arc(cx + r * 0.1, cy - r * 0.08, r * 0.16, 0, 6.283); ctx.fill(); }
      } else { ctx.fillStyle = '#e8e6dc'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.28, 0, 6.283); ctx.fill(); }
      continue;
    }
    if (J.kind === 'flyover' || J.kind === 'diamond' || J.kind === 'clover' || J.kind === 'stack') {
      // the main road carried over the other on a short bridge: its shadow on the road below, parapets along its edges
      const ux = Math.cos(J.aM), uy = Math.sin(J.aM), L = J.wm / 2 + 0.9, TM = RT[J.tM];
      const p = new Path2D(); p.moveTo((J.x - ux * L) * TS, (J.y - uy * L) * TS); p.lineTo((J.x + ux * L) * TS, (J.y + uy * L) * TS);
      ctx.save(); ctx.lineCap = 'butt';
      ctx.strokeStyle = 'rgba(0,0,0,.32)'; ctx.lineWidth = J.wM * TS * 1.25; ctx.translate(TS * 0.3, TS * 0.4); ctx.stroke(p); ctx.translate(-TS * 0.3, -TS * 0.4);
      ctx.strokeStyle = '#cfcabd'; ctx.lineWidth = J.wM * TS * 1.3; ctx.stroke(p);
      ctx.strokeStyle = TM.surf; ctx.lineWidth = J.wM * TS * 1.02; ctx.stroke(p);
      if (!far && TM.lanes >= 4) { ctx.setLineDash([J.wM * TS * 0.18, J.wM * TS * 0.3]); ctx.strokeStyle = 'rgba(232,230,220,.7)'; ctx.lineWidth = Math.max(0.15, 0.6 / z); ctx.stroke(p); ctx.setLineDash([]); }
      ctx.restore();
      if (J.kind === 'stack') {
        // the flyover ramps of a stack, sweeping round high over everything, each with its shadow
        const SL = RT[RT_IX.sliproad], R1 = (J.wM / 2 + 2.1) * TS;
        for (let q = 0; q < 4; q++) {
          const a0 = J.aM + q * Math.PI / 2 + 0.25, arc = new Path2D(); arc.arc(cx, cy, R1, a0, a0 + Math.PI / 2 - 0.5);
          ctx.save(); ctx.translate(TS * 0.45, TS * 0.6); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = SL.wid * TS * 1.3; ctx.stroke(arc); ctx.restore();
          ctx.strokeStyle = '#cfcabd'; ctx.lineWidth = SL.wid * TS * 1.35; ctx.stroke(arc);
          ctx.strokeStyle = SL.surf; ctx.lineWidth = SL.wid * TS; ctx.stroke(arc);
        }
      }
    }
  }
  // a railway under a main road: a deck with parapets over the track
  for (const X of J0.rail) {
    if (X.kind !== 'railbridge' || !jnVis(X, x0, y0, x1, y1, 4)) continue;
    const ux = Math.cos(X.a), uy = Math.sin(X.a), L = 0.75, p = new Path2D();
    p.moveTo((X.x - ux * L) * TS, (X.y - uy * L) * TS); p.lineTo((X.x + ux * L) * TS, (X.y + uy * L) * TS);
    ctx.save(); ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = X.w * TS * 1.25; ctx.translate(TS * 0.25, TS * 0.35); ctx.stroke(p); ctx.translate(-TS * 0.25, -TS * 0.35);
    ctx.strokeStyle = '#cfcabd'; ctx.lineWidth = X.w * TS * 1.3; ctx.stroke(p);
    ctx.strokeStyle = X.surf; ctx.lineWidth = X.w * TS; ctx.stroke(p);
    ctx.restore();
  }
}
// The phase of a set of lights: the main road's green, its amber, the side road's green, its amber.
function jnPhase(J) {
  const t = (Render.time + J.x * 0.37 + J.y * 0.21) % 10;
  return t < 4.2 ? [0, 2] : t < 5 ? [1, 2] : t < 9.2 ? [2, 0] : [2, 1];  // [main, side]: 0 green, 1 amber, 2 red
}
const JN_LAMP = ['#4fe36a', '#ffb02a', '#ff4a3a'];
// A white line across one carriageway of an arm, `d` tiles out from the middle of the junction.
function jnBar(ctx, x, y, a, d, half, w, dashed) {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const bx = (x + ux * d) * TS, by = (y + uy * d) * TS;
  ctx.lineWidth = w; ctx.setLineDash(dashed ? [half * TS * 0.18, half * TS * 0.12] : []);
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + nx * half * TS, by + ny * half * TS); ctx.stroke();
  ctx.setLineDash([]);
}
function jnZebra(ctx, x, y, a, wid, z) {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, n = Math.max(4, Math.round(wid * 7));
  ctx.fillStyle = '#ecebe4';
  for (let q = 0; q < n; q++) {
    const s = (q / (n - 1) - 0.5) * wid * 0.9;
    ctx.save(); ctx.translate((x + nx * s) * TS, (y + ny * s) * TS); ctx.rotate(a); ctx.fillRect(-0.18 * TS, -wid * 0.045 * TS, 0.36 * TS, wid * 0.07 * TS); ctx.restore();
  }
  if (z >= 1.4) for (const s of [-1, 1]) { const px = (x + nx * s * (wid / 2 + 0.12)) * TS, py = (y + ny * s * (wid / 2 + 0.12)) * TS; ctx.fillStyle = '#2a2c30'; ctx.fillRect(px - 0.15, py - 0.15, 0.3, 0.3); ctx.fillStyle = (Render.time % 1) < 0.5 ? '#ffb02a' : '#a86a20'; ctx.beginPath(); ctx.arc(px, py, 0.32, 0, 6.283); ctx.fill(); }
}
// On top of everything on the road: stop and give-way lines, the lights, zebras and level crossings.
function drawJunctionMarks(ctx, z, x0, y0, x1, y1) {
  if (z < 0.6) return;
  const J0 = buildJunctions(), lw = Math.max(0.2, 0.5 / z);
  ctx.save(); ctx.lineCap = 'butt';
  for (const J of J0.list) {
    if (!jnVis(J, x0, y0, x1, y1, 3)) continue;
    if (J.kind !== 'signals' && J.kind !== 'cross' && J.kind !== 'tee') continue;
    const arms = [];  // [angle out along the arm, half-width of the road, is main road, distance out to the line]
    for (const s of [0, Math.PI]) arms.push([J.aM + s, J.wM / 2, true, J.wm / 2 + 0.2]);
    if (J.four) for (const s of [0, Math.PI]) arms.push([J.am + s, J.wm / 2, false, J.wM / 2 + 0.2]);
    else arms.push([J.am + (J.mEnd > 0 ? 0 : Math.PI), J.wm / 2, false, J.wM / 2 + 0.2]);
    const ph = J.kind === 'signals' ? jnPhase(J) : null;
    for (const [a, half, main, d] of arms) {
      if (!ph && main) continue;  // the main road runs straight through; only the side roads give way
      ctx.strokeStyle = '#ecebe4';
      // traffic keeps right: the line runs across the incoming lanes, the right half seen from the junction
      jnBar(ctx, J.x, J.y, a, d, -half * 0.95, ph || J.kind === 'cross' ? lw * 1.6 : lw * 1.1, !ph && J.kind === 'tee');
      if (!ph && J.kind === 'tee' && z >= 1.1) jnBar(ctx, J.x, J.y, a, d + 0.12, -half * 0.95, lw * 1.1, true);
      if (ph) {
        // the signal head on its pole at the kerb, lit by phase; a zebra over the arm in a busy town
        const ux = Math.cos(a), uy = Math.sin(a), px = (J.x + ux * (d + 0.05) - uy * (-half - 0.18)) * TS, py = (J.y + uy * (d + 0.05) + ux * (-half - 0.18)) * TS;
        const st = main ? ph[0] : ph[1];
        ctx.fillStyle = '#1e1f22'; ctx.fillRect(px - 0.42, py - 0.42, 0.84, 0.84);
        ctx.fillStyle = JN_LAMP[st]; ctx.beginPath(); ctx.arc(px, py, 0.32, 0, 6.283); ctx.fill();
        if (z >= 1.6) { ctx.fillStyle = JN_LAMP[st]; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(px, py, 0.8, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
        if (z >= 1.1) jnZebra(ctx, J.x + ux * (d + 0.5), J.y + uy * (d + 0.5), a + Math.PI / 2, half * 2, 0);
      }
    }
    if (J.kind === 'tee' && z >= 1.3) {
      // the give-way triangle painted on the side road
      const a = J.am + (J.mEnd > 0 ? 0 : Math.PI), ux = Math.cos(a), uy = Math.sin(a), d = J.wM / 2 + 0.85, nx = -uy, ny = ux, s = -J.wm * 0.22;
      const tx = (J.x + ux * d + nx * s) * TS, ty = (J.y + uy * d + ny * s) * TS;
      ctx.strokeStyle = '#ecebe4'; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(tx - ux * TS * 0.35 + nx * 0.6, ty - uy * TS * 0.35 + ny * 0.6); ctx.lineTo(tx - ux * TS * 0.35 - nx * 0.6, ty - uy * TS * 0.35 - ny * 0.6); ctx.lineTo(tx + ux * TS * 0.25, ty + uy * TS * 0.25); ctx.closePath(); ctx.stroke();
    }
  }
  for (const Z of J0.zebra) if (jnVis(Z, x0, y0, x1, y1, 2)) jnZebra(ctx, Z.x, Z.y, Z.a + Math.PI / 2, Z.w, z);
  // level crossings: red-and-white barriers either side of the track, down and flashing while a train is near
  for (const X of J0.rail) {
    if (X.kind !== 'level' || !jnVis(X, x0, y0, x1, y1, 2)) continue;
    const r = X.ri >= 0 ? W.rails[X.ri] : null, shut = r && r.done && Math.abs(r.pos - X.rp) < 9;
    const ux = Math.cos(X.a), uy = Math.sin(X.a), nx = -uy, ny = ux, flash = (Render.time % 0.8) < 0.4;
    for (const s of [-1, 1]) {
      const bx = (X.x + ux * s * 0.62) * TS, by = (X.y + uy * s * 0.62) * TS;
      const px = bx + nx * s * (X.w / 2 + 0.15) * TS, py = by + ny * s * (X.w / 2 + 0.15) * TS;
      ctx.fillStyle = '#2a2c30'; ctx.fillRect(px - 0.35, py - 0.35, 0.7, 0.7);
      if (shut) {
        // the boom across its half of the road, in red and white
        const ex = px - nx * s * X.w * 0.98 * TS * 0.5, ey = py - ny * s * X.w * 0.98 * TS * 0.5;
        ctx.lineWidth = Math.max(0.35, 0.28 * TS * 0.3); ctx.setLineDash([0.7, 0.7]); ctx.strokeStyle = '#d8302a'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.lineDashOffset = 0.7; ctx.strokeStyle = '#f2f2ee'; ctx.stroke(); ctx.lineDashOffset = 0; ctx.setLineDash([]);
        ctx.fillStyle = flash ? '#ff3a2a' : '#5a1a14'; ctx.beginPath(); ctx.arc(px, py, 0.32, 0, 6.283); ctx.fill();
      } else { ctx.strokeStyle = '#d8302a'; ctx.lineWidth = 0.35; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + ux * s * 0.2 * TS, py + uy * s * 0.2 * TS); ctx.stroke(); }
    }
  }
  ctx.restore();
}
// ---- the worn-in streets of a motoring town: junctions on the tile grid, read off the map for the part in view ----
let jsCache = null;
function streetJunctions(x0, y0, x1, y1) {
  const X0 = Math.max(1, Math.floor(x0)), Y0 = Math.max(1, Math.floor(y0)), X1 = Math.min(W.w - 2, Math.ceil(x1)), Y1 = Math.min(W.h - 2, Math.ceil(y1));
  const tk = W.tick >> 5;
  if (jsCache && jsCache.W === W && jsCache.tk === tk && jsCache.X0 === X0 && jsCache.Y0 === Y0 && jsCache.X1 === X1 && jsCache.Y1 === Y1) return jsCache.list;
  const list = [], w = W.w, road = W.road, rail = W.rail;
  if ((X1 - X0) * (Y1 - Y0) <= 60000) for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const i = y * w + x, lv = road[i];
    if (lv < 2 || W.occ[i] === 3) continue;
    if (typeof inPlanned === 'function' && inPlanned(i)) continue;
    if (rail[i]) { const t = W.townById[W.owner[i]]; if (t && t.mod.rail) list.push({ i, x, y, kind: 'level', arms: 0 }); continue; }
    // the arms the street really has, joined the way paintTile joins them: straight neighbours, and a diagonal only where no straight one covers that corner
    let arms = 0, n = 0;
    for (let k = 0; k < 8; k++) {
      const ni = i + NB_D[k];
      if (road[ni] < 2 || (k > 3 && (road[i + NB_X[k]] || road[i + NB_Y[k] * w]))) continue;
      arms |= 1 << k; n++;
    }
    const t = W.townById[W.owner[i]];
    // a bridge on a made-up street (a ford on a cart track has none)
    if (W.river[i] >= 2 || W.canal[i]) { if (lv >= 3 || (t && t.mod.car)) list.push({ i, x, y, kind: 'bridge', arms }); continue; }
    if (n < 3 || lv < 3 || !t || !t.mod.car) continue;  // white lines only on a made-up street, not on a dirt lane
    const pop = tn(t), h = hash2(x, y, 23), busy = W.lanes[i] >= 1 || W.rtype[i] === RT_IX.highstreet || W.rtype[i] === RT_IX.collector;
    const kind = busy && pop >= 1200 && knows(t, 'electric') ? 'signals' : n >= 4 ? 'cross' : 'tee';
    // the main road is the two busiest, widest arms; the others give way to it
    const sc = k => (W.lanes[i + NB_D[k]] || 0) * 4 + road[i + NB_D[k]] + hash2(x, k, 5) * 0.5;
    const ks = []; for (let k = 0; k < 8; k++) if (arms & (1 << k)) ks.push(k);
    ks.sort((a, b) => sc(b) - sc(a));
    list.push({ i, x, y, kind, arms, main: (1 << ks[0]) | (1 << ks[1]) });
  }
  jsCache = { W, tk, X0, Y0, X1, Y1, list };
  return list;
}
// Street centres wander off the grid a little (render.js paintTile): the junction is drawn where the road really runs.
const stCx = (x, y) => x * TS + 3 + (hash2(x, y, 71) - 0.5) * 2.6, stCy = (x, y) => y * TS + 3 + (hash2(x, y, 72) - 0.5) * 2.6;
function drawStreetJunctions(ctx, z, x0, y0, x1, y1) {
  if (z < 1.2) return;
  const L = streetJunctions(x0, y0, x1, y1), lw = Math.max(0.32, 0.9 / z);
  ctx.save(); ctx.lineCap = 'butt';
  for (const J of L) {
    const cx = stCx(J.x, J.y), cy = stCy(J.x, J.y), i = J.i;
    if (J.kind === 'bridge') {
      if (typeof drawBridges === 'function' && typeof bridgeAt === 'function' && bridgeAt(J.i)) continue;  // drawn by kind (bridgeart.js)
      // low stone or steel parapets along the deck where a street crosses a river or canal
      const ew = (J.arms & 3) || !(J.arms & 12);
      ctx.strokeStyle = '#c8c2b4'; ctx.lineWidth = 0.45;
      for (const s of [-1, 1]) { ctx.beginPath(); if (ew) { ctx.moveTo(cx - TS * 0.55, cy + s * 1.9); ctx.lineTo(cx + TS * 0.55, cy + s * 1.9); } else { ctx.moveTo(cx + s * 1.9, cy - TS * 0.55); ctx.lineTo(cx + s * 1.9, cy + TS * 0.55); } ctx.stroke(); }
      continue;
    }
    if (J.kind === 'level') {
      const shut = W.rails && W.rails.some(r => r.done && Math.abs((r.pos | 0) - r.path.indexOf(i)) < 6 && r.path.indexOf(i) >= 0);
      ctx.fillStyle = shut ? ((Render.time % 0.8) < 0.4 ? '#ff3a2a' : '#5a1a14') : '#2a2c30';
      ctx.fillRect(cx - 2.4, cy - 2.4, 0.7, 0.7); ctx.fillRect(cx + 1.7, cy + 1.7, 0.7, 0.7);
      if (shut) { ctx.strokeStyle = '#d8302a'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.moveTo(cx - 2, cy - 2); ctx.lineTo(cx + 0.2, cy - 2); ctx.moveTo(cx + 2, cy + 2); ctx.lineTo(cx - 0.2, cy + 2); ctx.stroke(); }
      continue;
    }
    if (J.kind === 'mini') { ctx.fillStyle = '#ecebe4'; ctx.beginPath(); ctx.arc(cx, cy, 0.9, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#ecebe4'; ctx.lineWidth = lw * 0.7; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, 6.283); ctx.setLineDash([0.5, 0.5]); ctx.stroke(); ctx.setLineDash([]); continue; }
    const ph = J.kind === 'signals' ? jnPhase({ x: J.x, y: J.y }) : null;
    for (let k = 0; k < 8; k++) {
      if (!(J.arms & (1 << k))) continue;
      const main = !!(J.main & (1 << k));
      if (!ph && main) continue;  // the main street runs straight through
      const ox = stCx(J.x + NB_X[k], J.y + NB_Y[k]), oy = stCy(J.x + NB_X[k], J.y + NB_Y[k]), a = Math.atan2(oy - cy, ox - cx);
      const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, d = 2.1, half = 1.5 + Math.min(W.lanes[i + NB_D[k]] || 0, 2) * 0.5;
      ctx.strokeStyle = '#ecebe4'; ctx.lineWidth = ph ? lw * 1.4 : lw;
      ctx.setLineDash(!ph && J.kind === 'tee' ? [0.45, 0.35] : []);
      ctx.beginPath(); ctx.moveTo(cx + ux * d, cy + uy * d); ctx.lineTo(cx + ux * d - nx * half, cy + uy * d - ny * half); ctx.stroke(); ctx.setLineDash([]);
      if (ph) {
        const st = main ? ph[0] : ph[1], px = cx + ux * (d + 0.3) - nx * (half + 0.5), py = cy + uy * (d + 0.3) - ny * (half + 0.5);
        ctx.fillStyle = '#1e1f22'; ctx.fillRect(px - 0.38, py - 0.38, 0.76, 0.76); ctx.fillStyle = JN_LAMP[st]; ctx.beginPath(); ctx.arc(px, py, 0.27, 0, 6.283); ctx.fill();
        if (z >= 1.8) { ctx.fillStyle = '#ecebe4'; for (let q = -2; q <= 2; q++) { const sx = cx + ux * (d + 0.9) + nx * q * 0.6, sy = cy + uy * (d + 0.9) + ny * q * 0.6; ctx.save(); ctx.translate(sx, sy); ctx.rotate(a); ctx.fillRect(-0.45, -0.17, 0.9, 0.34); ctx.restore(); } }
      }
    }
  }
  ctx.restore();
}
