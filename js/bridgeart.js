'use strict';
// Bridges drawn by kind (bridges.js holds what they are). Seen from above and a little from the south: a bridge's piers and
// cutwaters show in plan, the face of the side nearest the viewer shows its arches with their reflections, and anything above
// the deck (towers, cables, trusses, roofs, houses) leans up the screen. Each bridge's shapes are built once as Path2Ds in its
// own frame (u along the deck from end A, v across it), cached, and drawn with one transform. Far out, just a band.

// [deck, parapet or edge, structure, accent] by kind
const BA_COL = {
  ford: ['#bfae86', '#a89a76', '#8f8a80', '#d8d2c4'], log: ['#7a5a36', '#5a3f24', '#4e3720', '#9a7a52'], clapper: ['#9d988c', '#77736a', '#6a665e', '#b8b3a6'],
  rope: ['#a0814f', '#d8c08a', '#5a4428', '#c8a870'], pontoon: ['#9a7a50', '#6a4a2e', '#5a3c22', '#b89a6a'], trestle: ['#8f6f47', '#5e4428', '#6e5233', '#a88a5e'],
  corbel: ['#a9a291', '#857e6e', '#8a8372', '#c4bdab'], arch: ['#b9b09c', '#8f8676', '#a39a86', '#d2cab6'], causeway: ['#a39a86', '#857c6a', '#8f866f', '#c2b9a2'],
  multiarch: ['#b6ad98', '#8b8270', '#a0977f', '#d0c7b1'], aqueduct: ['#c4b89c', '#968a6e', '#b0a486', '#4a8ab8'], covered: ['#8a6a44', '#5e4428', '#8a3a2a', '#b05a3e'],
  inhabited: ['#b0a690', '#8a806c', '#a0977f', '#9a5a3a'], drawbridge: ['#8a6a44', '#5e4428', '#8f8676', '#4a4a4e'], bascule: ['#5c6168', '#3f4348', '#b8b0a0', '#3a5a7a'],
  swing: ['#5a5f66', '#3a3e44', '#4a6a5a', '#c8c2b4'], castiron: ['#4a4e55', '#2e3238', '#3a3e46', '#7a8088'], truss: ['#55595f', '#3a3e44', '#8a929c', '#6a7078'],
  steeltruss: ['#5f6a66', '#40484a', '#8fae9a', '#7f9a8a'], viaduct: ['#9c5a3e', '#7a4430', '#a0583c', '#b8775a'], tubular: ['#4a4e54', '#33363b', '#3f4348', '#6a6e74'],
  cantilever: ['#5a5f66', '#3a3e44', '#a8432e', '#c8634e'], suspension: ['#585c62', '#3c4046', '#b8463a', '#d8d4c8'], steelarch: ['#5a5e64', '#3c4046', '#7a8a9a', '#9aaaba'],
  concretearch: ['#c9c6bd', '#a6a399', '#d6d3ca', '#b8b5ac'], tiedarch: ['#5a5e64', '#c8ccd0', '#e8ecef', '#4a7ab8'], boxgirder: ['#55585c', '#9a9a94', '#8a8e92', '#b6b8b6'],
  floating: ['#55585c', '#a8a8a2', '#8a8c88', '#c8c8c2'], cablestayed: ['#55585c', '#c8ccd0', '#eef0f2', '#d8dcdf'], bridgetunnel: ['#55585c', '#a8a8a2', '#9a9a96', '#c8b88a'],
  maglev: ['#e8ecef', '#c8ccd0', '#d8dcdf', '#5fd0e0'], skyspan: ['#2a3038', '#5fd0e0', '#8ae8f0', '#c8f8ff'],
};
const BA_WATER_DK = 'rgba(16,34,48,.55)', BA_WATER_LT = 'rgba(200,228,240,.22)', BA_SHADOW = 'rgba(0,0,0,.28)';
// ---- building a bridge's picture ----
function baFrame(r, P) {
  const ax = P[0] * TS, ay = P[1] * TS, bx = P[2] * TS, by = P[3] * TS, L = Math.hypot(bx - ax, by - ay) || 1, ang = Math.atan2(by - ay, bx - ax);
  const c = Math.cos(ang), sn = Math.sin(ang);
  // hu, hv: which way "up" (a height above the deck) runs in the bridge's own frame; vs: the edge nearest the viewer
  return { r, ax, ay, L, ang, hw: Math.max(0.9, (r.w || 0.4) * TS / 2), hu: -sn * 0.7, hv: -c * 0.7, vs: c >= 0 ? 1 : -1, ec: Math.abs(c), U: [], D: [], O: [], fine: false, col: BA_COL[r.k] || BA_COL.log };
}
function baLay(A, st, lw, a) { const p = new Path2D(); A.push([st, p, lw || 0, a || 1]); return p; }
const baRect = (p, u0, v0, u1, v1) => p.rect(Math.min(u0, u1), Math.min(v0, v1), Math.abs(u1 - u0), Math.abs(v1 - v0));
const baLine = (p, u0, v0, u1, v1) => { p.moveTo(u0, v0); p.lineTo(u1, v1); };
// a point `h` above (or below, if negative) the deck at (u, v)
const baU = (g, u, h) => u + h * g.hu, baV = (g, v, h) => v + h * g.hv;
function baPoly(p, pts) { p.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) p.lineTo(pts[k], pts[k + 1]); p.closePath(); }
// the deck: the parapet band, then the roadway. from/to leave a gap (an open span, a broken one)
function baDeck(g, col, edge, segs) {
  const hw = g.hw, S = segs || [[0, g.L]];
  const e = baLay(g.D, edge), d = baLay(g.D, col);
  for (const [a, b] of S) { baRect(e, a, -hw - 0.45, b, hw + 0.45); baRect(d, a, -hw, b, hw); }
  g.deck = S;
}
// the face of the near side, `dep` deep down to the water
function baFascia(g, dep, col, a0, a1) {
  if (g.ec < 0.2) return;
  const v = g.vs * (g.hw + 0.45), p = baLay(g.U, col), u0 = a0 || 0, u1 = a1 === undefined ? g.L : a1;
  baPoly(p, [u0, v, u1, v, baU(g, u1, -dep), baV(g, v, -dep), baU(g, u0, -dep), baV(g, v, -dep)]);
}
// arch openings in the near face, each with its reflection in the water below it
function baArches(g, n, dep, rise, pier, col, u0, u1) {
  if (g.ec < 0.2) return;
  const a = u0 || 0, b = u1 === undefined ? g.L : u1, sp = (b - a) / n, v = g.vs * (g.hw + 0.45);
  const dk = baLay(g.U, BA_WATER_DK), lt = baLay(g.U, BA_WATER_LT), ring = col && g.fine ? baLay(g.U, col, 0.3) : null;
  for (let k = 0; k < n; k++) {
    const m = a + sp * (k + 0.5), half = sp / 2 - pier;
    if (half <= 0.2) continue;
    for (const [p, dir] of [[dk, 1], [lt, -0.8]]) {
      p.moveTo(baU(g, m - half, -dep), baV(g, v, -dep));
      for (let q = 1; q <= 10; q++) { const t = Math.PI * q / 10, h = dep - Math.sin(t) * rise * dir; p.lineTo(baU(g, m - Math.cos(t) * half, -h), baV(g, v, -h)); }
      p.closePath();
    }
    if (ring) for (let q = 0; q <= 10; q++) { const t = Math.PI * q / 10, h = dep - Math.sin(t) * (rise + 0.35); (q ? ring.lineTo : ring.moveTo).call(ring, baU(g, m - Math.cos(t) * (half + 0.3), -h), baV(g, v, -h)); }
  }
}
// piers in the river, wider than the deck, with pointed cutwaters both ways to part the current
function baPiers(g, us, pw, col, cut) {
  const p = baLay(g.U, col), ext = g.hw + 0.45 + (cut ? pw * 1.6 : 0.3);
  for (const u of us) {
    if (cut) baPoly(p, [u - pw, -g.hw - 0.45, u, -ext, u + pw, -g.hw - 0.45, u + pw, g.hw + 0.45, u, ext, u - pw, g.hw + 0.45]);
    else baRect(p, u - pw, -ext, u + pw, ext);
  }
}
const baSpans = (g, n) => { const out = []; for (let k = 1; k < n; k++) out.push(g.L * k / n); return out; };
// rails on a railway deck: two lines and the sleepers
function baRails(g) {
  if (g.r.s !== 'rl' || g.r.k === 'maglev') return;
  const sl = baLay(g.D, '#5c4a36', 0.5), rl = baLay(g.D, '#2c2a2e', 0.3), q = g.hw * 0.42;
  for (let u = 0.3; u < g.L; u += 0.9) baLine(sl, u, -q * 1.5, u, q * 1.5);
  baLine(rl, 0, -q, g.L, -q); baLine(rl, 0, q, g.L, q);
}
// a lattice above the deck along both edges (a truss): top chord at height h, diagonals, verticals, and the bracing across the top
function baTruss(g, h, col, step, pratt) {
  const p = baLay(g.O, col, g.fine ? 0.35 : 0.6), hw = g.hw + 0.2, n = Math.max(2, Math.round(g.L / step)), st = g.L / n;
  for (const v of [-hw, hw]) {
    baLine(p, baU(g, 0, h * 0.3), baV(g, v, h * 0.3), baU(g, 0, h), baV(g, v, h)); baLine(p, baU(g, 0, h), baV(g, v, h), baU(g, g.L, h), baV(g, v, h));
    baLine(p, baU(g, g.L, h), baV(g, v, h), baU(g, g.L, h * 0.3), baV(g, v, h * 0.3));
    if (!g.fine) continue;
    for (let k = 0; k < n; k++) {
      const u0 = k * st, u1 = u0 + st;
      if (pratt) { baLine(p, u0, v, baU(g, u0, h), baV(g, v, h)); baLine(p, k < n / 2 ? u1 : u0, v, baU(g, k < n / 2 ? u0 : u1, h), baV(g, v, h)); }
      else { baLine(p, u0, v, baU(g, u0 + st / 2, h), baV(g, v, h)); baLine(p, baU(g, u0 + st / 2, h), baV(g, v, h), u1, v); }
    }
  }
  if (g.fine) for (let k = 0; k < n; k++) { const u0 = k * st, u1 = u0 + st; baLine(p, baU(g, u0, h), baV(g, -hw, h), baU(g, u1, h), baV(g, hw, h)); baLine(p, baU(g, u0, h), baV(g, hw, h), baU(g, u1, h), baV(g, -hw, h)); }
}
// towers: a leg up from each edge at u, joined across the top (and halfway up)
function baTower(g, u, h, col, lw) {
  const p = baLay(g.O, col, lw || 1.1), hw = g.hw + 0.35;
  baLine(p, u, -hw, baU(g, u, h), baV(g, -hw, h)); baLine(p, u, hw, baU(g, u, h), baV(g, hw, h));
  baLine(p, baU(g, u, h), baV(g, -hw, h), baU(g, u, h), baV(g, hw, h));
  if (h > 4) baLine(p, baU(g, u, h * 0.55), baV(g, -hw, h * 0.55), baU(g, u, h * 0.55), baV(g, hw, h * 0.55));
}
// a cable or rib along both edges through three heights (start, middle, end), with hangers down to the deck
function baCurve(g, A, u0, u1, h0, hm, h1, col, lw, hang, hcol) {
  const p = baLay(A, col, lw), hc = 2 * hm - (h0 + h1) / 2, hp = hang && g.fine ? baLay(A, hcol || col, 0.2) : null, hw = g.hw + 0.3;
  for (const v of [-hw, hw]) {
    p.moveTo(baU(g, u0, h0), baV(g, v, h0)); p.quadraticCurveTo(baU(g, (u0 + u1) / 2, hc), baV(g, v, hc), baU(g, u1, h1), baV(g, v, h1));
    if (hp) for (let u = u0 + hang; u < u1 - hang * 0.5; u += hang) { const t = (u - u0) / (u1 - u0), h = (1 - t) * (1 - t) * h0 + 2 * t * (1 - t) * hc + t * t * h1; if (h > 0.3) baLine(hp, u, v, baU(g, u, h), baV(g, v, h)); }
  }
}
// a row of buildings along each side of the deck, overhanging the water (the inhabited bridge)
function baHouses(g) {
  const hw = g.hw, roof = baLay(g.O, g.col[3]), roof2 = baLay(g.O, '#7a6a5a'), wall = baLay(g.O, '#d8c8a8'), wall2 = baLay(g.O, '#c8b490'), ridge = g.fine ? baLay(g.O, 'rgba(40,24,16,.45)', 0.25) : null;
  const r = g.r, H = 2.2;
  for (const side of [-1, 1]) {
    let u = 0.6;
    for (let k = 0; u < g.L - 0.8; k++) {
      const len = 1.1 + hash2(r.id, k + side * 50, 31) * 1.3, gap = hash2(r.id, k, 33) < 0.2 ? 0.7 : 0.15, h = H * (0.8 + hash2(r.id, k, 35) * 0.5);
      const ue = Math.min(g.L - 0.6, u + len), v0 = side * hw * 0.42, v1 = side * (hw + 1.9);
      const near = side === g.vs ? v1 : v0;
      // the wall facing the viewer, then the roof lifted above the footprint
      baPoly(k & 1 ? wall2 : wall, [u, near, ue, near, baU(g, ue, h), baV(g, near, h), baU(g, u, h), baV(g, near, h)]);
      baPoly(k & 1 ? roof2 : roof, [baU(g, u, h), baV(g, v0, h), baU(g, ue, h), baV(g, v0, h), baU(g, ue, h), baV(g, v1, h), baU(g, u, h), baV(g, v1, h)]);
      if (ridge) baLine(ridge, baU(g, u, h + 0.5), baV(g, (v0 + v1) / 2, h + 0.5), baU(g, ue, h + 0.5), baV(g, (v0 + v1) / 2, h + 0.5));
      u = ue + gap;
    }
  }
  // the chapel in the middle, a little taller
  const m = g.L / 2, cp = baLay(g.O, '#a89f8a'), h = H * 1.6;
  baPoly(cp, [baU(g, m - 0.9, h), baV(g, -hw - 1.6, h), baU(g, m + 0.9, h), baV(g, -hw - 1.6, h), baU(g, m + 0.9, h), baV(g, -hw * 0.4, h), baU(g, m - 0.9, h), baV(g, -hw * 0.4, h)]);
}
// a roof the length of the deck, with the near wall under it and small windows (the covered bridge)
function baRoof(g, h, col, wcol) {
  const hw = g.hw + 0.5, vn = g.vs * hw, wall = baLay(g.O, wcol), roof = baLay(g.O, col), ridge = baLay(g.O, shadeHex(col, 0.25), 0.5);
  baPoly(wall, [0, vn, g.L, vn, baU(g, g.L, h), baV(g, vn, h), baU(g, 0, h), baV(g, vn, h)]);
  baPoly(roof, [baU(g, -0.3, h), baV(g, -hw - 0.4, h), baU(g, g.L + 0.3, h), baV(g, -hw - 0.4, h), baU(g, g.L + 0.3, h), baV(g, hw + 0.4, h), baU(g, -0.3, h), baV(g, hw + 0.4, h)]);
  baLine(ridge, baU(g, -0.3, h + 0.6), baV(g, 0, h + 0.6), baU(g, g.L + 0.3, h + 0.6), baV(g, 0, h + 0.6));
  if (g.fine) { const wn = baLay(g.O, 'rgba(20,14,10,.7)'); for (let u = 1; u < g.L - 0.8; u += 1.6) baPoly(wn, [u, vn, u + 0.6, vn, baU(g, u + 0.6, h * 0.6), baV(g, vn, h * 0.6), baU(g, u, h * 0.6), baV(g, vn, h * 0.6)]); }
}
// boats or pontoons across the current under a deck
function baBoats(g, step, len, col, hi, u0, u1) {
  const p = baLay(g.U, col), q = baLay(g.U, hi), a = u0 || 0.4, b = u1 === undefined ? g.L - 0.4 : u1;
  for (let u = a; u <= b; u += step) { p.moveTo(u + step * 0.36, 0); p.ellipse(u, 0, step * 0.36, len, 0, 0, 6.283); if (g.fine) { q.moveTo(u + step * 0.2, 0); q.ellipse(u, 0, step * 0.2, len * 0.75, 0, 0, 6.283); } }
}
// the stepped opening of a corbelled bridge in the near face
function baCorbel(g, dep) {
  if (g.ec < 0.2) return;
  const p = baLay(g.U, BA_WATER_DK), v = g.vs * (g.hw + 0.45), m = g.L / 2, w = g.L * 0.32, st = 4, pts = [];
  for (let k = 0; k <= st; k++) { const h = dep - (dep - 0.6) * k / st, ww = w * (1 - k / (st + 1)); pts.push([m - ww, h], [m - ww * 0.85, h]); }
  const out = [];
  for (const [u, h] of pts) out.push(baU(g, u, -h), baV(g, v, -h));
  for (let k = pts.length - 1; k >= 0; k--) { const [u, h] = pts[k]; out.push(baU(g, 2 * m - u, -h), baV(g, v, -h)); }
  baPoly(p, out);
}
// ---- each kind: its shapes under the deck (g.U), the deck (g.D) and above it (g.O) ----
const BA_ART = {
  ford: g => {
    const p = baLay(g.U, g.col[0], 0, 0.8); baRect(p, 0.6, -g.hw * 1.6, g.L - 0.6, g.hw * 1.6);
    const st = baLay(g.D, g.col[2]), hi = g.fine ? baLay(g.D, g.col[3]) : null;
    for (let u = 0.9, k = 0; u < g.L - 0.6; u += 1.05, k++) { const v = -g.hw * 0.9 + (k & 1) * 0.5; st.moveTo(u + 0.45, v); st.ellipse(u, v, 0.45, 0.38, 0, 0, 6.283); if (hi) { hi.moveTo(u + 0.08, v - 0.1); hi.ellipse(u - 0.12, v - 0.1, 0.2, 0.15, 0, 0, 6.283); } }
    if (g.fine) { const rut = baLay(g.D, 'rgba(90,70,40,.35)', 0.3); baLine(rut, 0.6, g.hw * 0.5, g.L - 0.6, g.hw * 0.5); baLine(rut, 0.6, g.hw * 1.1, g.L - 0.6, g.hw * 1.1); }
  },
  log: g => {
    const logs = baLay(g.D, g.col[0], g.hw * 0.7), bark = g.fine ? baLay(g.D, g.col[1], g.hw * 0.22) : null;
    for (const v of [-g.hw * 0.62, 0, g.hw * 0.62]) { baLine(logs, -0.2, v, g.L + 0.2, v); if (bark) baLine(bark, -0.2, v + g.hw * 0.18, g.L + 0.2, v + g.hw * 0.18); }
  },
  clapper: g => {
    const n = Math.max(2, Math.round(g.L / 2.4)), sp = g.L / n;
    baPiers(g, baSpans(g, n), 0.5, g.col[2], false);
    const p = baLay(g.D, g.col[0]), e = baLay(g.D, g.col[1]);
    for (let k = 0; k < n; k++) { baRect(e, k * sp + 0.1, -g.hw - 0.3, (k + 1) * sp - 0.1, g.hw + 0.3); baRect(p, k * sp + 0.25, -g.hw - 0.1, (k + 1) * sp - 0.25, g.hw + 0.1); }
  },
  rope: g => {
    const sag = Math.min(4, g.L * 0.12), hw = g.hw, slat = baLay(g.D, g.col[0], 0.45), rope = baLay(g.O, g.col[1], 0.3), post = baLay(g.D, g.col[2]);
    const at = u => -sag * 4 * (u / g.L) * (1 - u / g.L);
    for (let u = 0.4; u < g.L; u += 0.55) { const h = at(u); baLine(slat, baU(g, u, h), baV(g, -hw, h), baU(g, u, h), baV(g, hw, h)); }
    for (const v of [-hw, hw]) for (const dh of [0, 1.4]) { rope.moveTo(baU(g, 0, dh), baV(g, v, dh)); for (let q = 1; q <= 12; q++) { const u = g.L * q / 12, h = at(u) + dh; rope.lineTo(baU(g, u, h), baV(g, v, h)); } }
    for (const u of [0, g.L]) for (const v of [-hw, hw]) baRect(post, u - 0.3, v - 0.3, u + 0.3, v + 0.3);
  },
  pontoon: g => { baBoats(g, 1.5, g.hw * 1.9, g.col[1], g.col[3]); baDeck(g, g.col[0], g.col[2]); if (g.fine) { const pl = baLay(g.D, 'rgba(60,40,20,.35)', 0.2); for (let u = 0.3; u < g.L; u += 0.6) baLine(pl, u, -g.hw, u, g.hw); } },
  trestle: g => {
    const n = Math.max(2, Math.round(g.L / 1.4)), dep = 3;
    baFascia(g, 0.6, g.col[1]);
    if (g.ec >= 0.2) { const p = baLay(g.U, g.col[2], 0.35), v = g.vs * (g.hw + 0.45); for (let k = 0; k <= n; k++) { const u = g.L * k / n; baLine(p, u, v, baU(g, u, -dep), baV(g, v, -dep)); if (k < n && g.fine) { const u2 = g.L * (k + 1) / n; baLine(p, u, v, baU(g, u2, -dep), baV(g, v, -dep)); baLine(p, u2, v, baU(g, u, -dep), baV(g, v, -dep)); } } }
    baPiers(g, baSpans(g, n), 0.3, g.col[2], false); baDeck(g, g.col[0], g.col[1]);
    if (g.fine) { const pl = baLay(g.D, 'rgba(50,34,18,.3)', 0.2); for (let u = 0.3; u < g.L; u += 0.7) baLine(pl, u, -g.hw, u, g.hw); }
  },
  corbel: g => { baFascia(g, 2.4, g.col[2]); baCorbel(g, 2.4); baDeck(g, g.col[0], g.col[1]); },
  arch: g => { baFascia(g, 3, g.col[2]); baArches(g, 1, 3, 2.4, 0.5, g.col[3]); baDeck(g, g.col[0], g.col[1]); },
  causeway: g => {
    const e = baLay(g.U, '#8a8270'), m = g.L / 2, gap = Math.min(g.L * 0.2, 4);
    baRect(e, -0.3, -g.hw - 1.6, m - gap, g.hw + 1.6); baRect(e, m + gap, -g.hw - 1.6, g.L + 0.3, g.hw + 1.6);
    baFascia(g, 2, g.col[2], m - gap - 0.5, m + gap + 0.5); baArches(g, 2, 2, 1.5, 0.4, g.col[3], m - gap, m + gap); baDeck(g, g.col[0], g.col[1]);
  },
  multiarch: g => { const n = Math.max(2, Math.round(g.L / 3.2)); baFascia(g, 3, g.col[2]); baArches(g, n, 3, 2.2, 0.45, g.col[3]); baPiers(g, baSpans(g, n), 0.55, g.col[2], true); baDeck(g, g.col[0], g.col[1]); },
  aqueduct: g => {
    const n = Math.max(2, Math.round(g.L / 3)); baFascia(g, 6, g.col[2]); baArches(g, n, 6, 2.6, 0.45, g.col[3]);
    // the small arches of the upper tier, three to each big one below
    if (g.ec >= 0.2) { const up = baLay(g.U, BA_WATER_DK), v = g.vs * (g.hw + 0.45), m2 = n * 3, sp = g.L / m2; for (let k = 0; k < m2; k++) { const m = sp * (k + 0.5), half = sp / 2 - 0.25; up.moveTo(baU(g, m - half, -2.2), baV(g, v, -2.2)); for (let q = 1; q <= 6; q++) { const t = Math.PI * q / 6, h = 2.2 - Math.sin(t) * 1.4; up.lineTo(baU(g, m - Math.cos(t) * half, -h), baV(g, v, -h)); } up.closePath(); } }
    baPiers(g, baSpans(g, n), 0.5, g.col[2], false); baDeck(g, g.col[0], g.col[1]);
    const ch = baLay(g.D, g.col[3], g.hw * 0.5); baLine(ch, 0, -g.hw * 0.45, g.L, -g.hw * 0.45);
  },
  covered: g => { const n = Math.max(1, Math.round(g.L / 4)); baPiers(g, baSpans(g, n), 0.5, '#8f8676', false); baDeck(g, g.col[0], g.col[1]); baRoof(g, 2.2, g.col[2], g.col[3]); },
  inhabited: g => { const n = Math.max(2, Math.round(g.L / 3)); baFascia(g, 3, g.col[2]); baArches(g, n, 3, 2, 0.5, g.col[2]); baPiers(g, baSpans(g, n), 0.6, g.col[2], true); baDeck(g, g.col[0], g.col[1]); baHouses(g); },
  // the movable ones leave their moving span out of the deck: it is drawn each frame (baMoving)
  drawbridge: g => {
    const a = g.L * 0.3, b = g.L * 0.7; baFascia(g, 2.4, '#8f8676'); baPiers(g, [a, b], 0.9, '#8f8676', false); baDeck(g, g.col[0], g.col[1], [[0, a], [b, g.L]]);
    for (const u of [a, b]) { const p = baLay(g.O, '#8f8676'), q = baLay(g.O, '#5e5a52'); baPoly(p, [u - 1, -g.hw - 0.9, u + 1, -g.hw - 0.9, baU(g, u + 1, 3.5), baV(g, -g.hw - 0.9, 3.5), baU(g, u - 1, 3.5), baV(g, -g.hw - 0.9, 3.5)]); baPoly(q, [baU(g, u - 1, 3.5), baV(g, -g.hw - 0.9, 3.5), baU(g, u + 1, 3.5), baV(g, -g.hw - 0.9, 3.5), baU(g, u + 1, 3.5), baV(g, g.hw + 0.9, 3.5), baU(g, u - 1, 3.5), baV(g, g.hw + 0.9, 3.5)]); }
    g.mv = [a, b];
  },
  bascule: g => {
    const a = g.L * 0.32, b = g.L * 0.68, big = g.L > 14; baPiers(g, [a, b], 1.2, '#9a9282', false); baDeck(g, g.col[0], g.col[1], [[0, a], [b, g.L]]);
    if (big) { for (const u of [a, b]) baTower(g, u, 7, g.col[2], 1.6); const w = baLay(g.O, g.col[3], 0.8); for (const v of [-g.hw - 0.35, g.hw + 0.35]) baLine(w, baU(g, a, 6.3), baV(g, v, 6.3), baU(g, b, 6.3), baV(g, v, 6.3)); baCurve(g, g.O, 0, a, 0.5, 3.5, 6.3, g.col[3], 0.4, 0.8); baCurve(g, g.O, b, g.L, 6.3, 3.5, 0.5, g.col[3], 0.4, 0.8); }
    else { const p = baLay(g.O, '#3a3e44'); for (const u of [a, b]) baRect(p, u - 0.7, -g.hw - 1.2, u + 0.7, -g.hw - 0.2); }
    g.mv = [a, b];
  },
  swing: g => { const a = g.L * 0.28, b = g.L * 0.72; baPiers(g, [a, b], 0.5, '#8a8678', false); const tt = baLay(g.U, '#8a8678'); tt.arc(g.L / 2, 0, Math.min((b - a) * 0.22, g.hw * 1.9), 0, 6.283); baDeck(g, g.col[0], g.col[1], [[0, a], [b, g.L]]); g.mv = [a, b]; },
  castiron: g => {
    baFascia(g, 3, 'rgba(60,64,70,.5)'); baArches(g, 1, 3, 2.6, 0.3, null);
    if (g.ec >= 0.2) { const rib = baLay(g.U, g.col[2], 0.45), v = g.vs * (g.hw + 0.45); for (const dr of [0, 0.7, 1.4]) { rib.moveTo(baU(g, 0.3, -3), baV(g, v, -3)); for (let q = 1; q <= 12; q++) { const t = Math.PI * q / 12, h = 3 - Math.sin(t) * (2.6 + dr * 0.25); rib.lineTo(baU(g, g.L / 2 - Math.cos(t) * (g.L / 2 - 0.3), -h), baV(g, v, -h)); } } if (g.fine) { const ring = baLay(g.U, g.col[3], 0.25); for (const f of [0.18, 0.82]) { const u = g.L * f; ring.moveTo(baU(g, u + 0.5, -0.9), baV(g, v, -0.9)); ring.arc(baU(g, u, -0.9), baV(g, v, -0.9), 0.5, 0, 6.283); } } }
    baDeck(g, g.col[0], g.col[1]);
  },
  truss: g => { const n = Math.max(1, Math.round(g.L / 8)); baPiers(g, baSpans(g, n), 0.6, '#8f8676', false); baDeck(g, g.col[0], g.col[1]); baTruss(g, 2.6, g.col[2], 1.3, false); },
  steeltruss: g => { const n = Math.max(1, Math.round(g.L / 10)); baPiers(g, baSpans(g, n), 0.6, '#8a8a84', false); baDeck(g, g.col[0], g.col[1]); baTruss(g, 3.2, g.col[2], 1.5, true); },
  viaduct: g => { const n = Math.max(3, Math.round(g.L / 1.8)); baFascia(g, 6, g.col[2]); baArches(g, n, 6, 4.2, 0.3, g.col[3]); baPiers(g, baSpans(g, n), 0.35, g.col[2], false); baDeck(g, g.col[0], g.col[1]); },
  tubular: g => {
    const n = Math.max(2, Math.round(g.L / 9)), us = [0.4, ...baSpans(g, n), g.L - 0.4]; baPiers(g, us.slice(1, -1), 0.9, '#9a9282', false); baDeck(g, g.col[0], g.col[1]);
    const tb = baLay(g.O, g.col[2]), top = baLay(g.O, g.col[3]), h = 2.4, hw = g.hw + 0.5, vn = g.vs * hw;
    baPoly(tb, [0, vn, g.L, vn, baU(g, g.L, h), baV(g, vn, h), baU(g, 0, h), baV(g, vn, h)]);
    baPoly(top, [baU(g, 0, h), baV(g, -hw, h), baU(g, g.L, h), baV(g, -hw, h), baU(g, g.L, h), baV(g, hw, h), baU(g, 0, h), baV(g, hw, h)]);
    for (const u of us) { const t = baLay(g.O, '#a89f8a'); baPoly(t, [baU(g, u - 0.8, h + 1.5), baV(g, -hw - 0.3, h + 1.5), baU(g, u + 0.8, h + 1.5), baV(g, -hw - 0.3, h + 1.5), baU(g, u + 0.8, h + 1.5), baV(g, hw + 0.3, h + 1.5), baU(g, u - 0.8, h + 1.5), baV(g, hw + 0.3, h + 1.5)]); }
    if (g.fine) { const rv = baLay(g.O, 'rgba(20,20,24,.5)', 0.2); for (const f of [0.35, 0.7]) baLine(rv, baU(g, 0, h * f), baV(g, vn, h * f), baU(g, g.L, h * f), baV(g, vn, h * f)); }
  },
  cantilever: g => {
    const n = Math.max(2, Math.round(g.L / 16)), sp = g.L / n, H = 7; baDeck(g, g.col[0], g.col[1]);
    const p = baLay(g.O, g.col[2], g.fine ? 0.7 : 1), lat = g.fine ? baLay(g.O, g.col[3], 0.25) : null;
    for (let k = 0; k <= n; k++) {
      const u = k * sp, arm = sp * 0.38;
      baPiers(g, [Math.min(g.L - 0.5, Math.max(0.5, u))], 1, '#9a9282', false);
      for (const v of [-g.hw - 0.4, g.hw + 0.4]) for (const d of [-1, 1]) {
        const tip = u + d * arm; if (tip < -0.1 || tip > g.L + 0.1) continue;
        baLine(p, baU(g, u, H), baV(g, v, H), baU(g, tip, H * 0.28), baV(g, v, H * 0.28)); baLine(p, u, v, tip, v); baLine(p, u, v, baU(g, u, H), baV(g, v, H));
        baLine(p, baU(g, u, -1.5), baV(g, v, -1.5), baU(g, tip, 0), baV(g, v, 0));
        if (lat) for (let q = 1; q < 4; q++) { const uu = u + d * arm * q / 4, hh = H - (H - H * 0.28) * q / 4; baLine(lat, uu, v, baU(g, uu, hh), baV(g, v, hh)); baLine(lat, uu, v, baU(g, u + d * arm * (q - 1) / 4, H - (H - H * 0.28) * (q - 1) / 4), baV(g, v, H - (H - H * 0.28) * (q - 1) / 4)); }
      }
    }
  },
  suspension: g => {
    const a = g.L * 0.18, b = g.L * 0.82, H = Math.min(12, 4 + g.L * 0.12); baPiers(g, [a, b], 1, '#9a9282', false); baDeck(g, g.col[0], g.col[1]);
    baCurve(g, g.O, a, b, H, 0.6, H, g.col[3], 0.45, 0.9); baCurve(g, g.O, 0, a, 0.2, H * 0.4, H, g.col[3], 0.45, 0.9); baCurve(g, g.O, b, g.L, H, H * 0.4, 0.2, g.col[3], 0.45, 0.9);
    for (const u of [a, b]) baTower(g, u, H + 0.4, g.col[2], 1.3);
  },
  steelarch: g => { const H = Math.min(10, 3 + g.L * 0.14); baPiers(g, [0.8, g.L - 0.8], 1, '#9a9282', false); baDeck(g, g.col[0], g.col[1]); baCurve(g, g.O, 0.4, g.L - 0.4, -1.2, H, -1.2, g.col[2], 0.9, 0.8, g.col[3]); baCurve(g, g.O, 0.9, g.L - 0.9, -1.2, H - 1.4, -1.2, g.col[2], 0.5); },
  concretearch: g => {
    baFascia(g, 3.2, 'rgba(180,176,166,.25)');
    if (g.ec >= 0.2) { const rib = baLay(g.U, g.col[2], 0.9), col = baLay(g.U, g.col[2], 0.35), v = g.vs * (g.hw + 0.45); rib.moveTo(baU(g, 0.3, -3.2), baV(g, v, -3.2)); for (let q = 1; q <= 14; q++) { const t = Math.PI * q / 14, h = 3.2 - Math.sin(t) * 2.8; rib.lineTo(baU(g, g.L / 2 - Math.cos(t) * (g.L / 2 - 0.3), -h), baV(g, v, -h)); } for (let u = 1; u < g.L - 0.5; u += 1.2) { const t = Math.acos(clamp((g.L / 2 - u) / (g.L / 2 - 0.3), -1, 1)), h = 3.2 - Math.sin(t) * 2.8; baLine(col, u, v, baU(g, u, -h), baV(g, v, -h)); } }
    baArches(g, 1, 3.2, 2.8, 0.3, null); baDeck(g, g.col[0], g.col[1]);
  },
  tiedarch: g => { const H = Math.min(7, 2.5 + g.L * 0.12); baDeck(g, g.col[0], g.col[1]); baPiers(g, [0.6, g.L - 0.6], 0.8, '#9a9a94', false); baCurve(g, g.O, 0.3, g.L - 0.3, 0, H, 0, g.col[2], 0.8, 0.7, g.col[3]); },
  boxgirder: g => { const n = Math.max(2, Math.round(g.L / 6)); baFascia(g, 1.2, g.col[2]); if (g.ec >= 0.2) { const p = baLay(g.U, '#a8a8a2', 0.7), v = g.vs * (g.hw + 0.45); for (const u of baSpans(g, n)) baLine(p, baU(g, u, -1.2), baV(g, v, -1.2), baU(g, u, -3.5), baV(g, v, -3.5)); } baPiers(g, baSpans(g, n), 0.45, '#a8a8a2', false); baDeck(g, g.col[0], g.col[1]); },
  floating: g => { const p = baLay(g.U, g.col[2]), s = baLay(g.U, 'rgba(40,40,40,.35)', 0.25); baRect(p, 1, -g.hw * 1.9, g.L - 1, g.hw * 1.9); for (let u = 1 + 2.2; u < g.L - 1; u += 2.2) baLine(s, u, -g.hw * 1.9, u, g.hw * 1.9); baDeck(g, g.col[0], g.col[1]); },
  cablestayed: g => {
    const two = g.L > 18, us = two ? [g.L * 0.25, g.L * 0.75] : [g.L * 0.5], H = Math.min(13, 4 + g.L * 0.16), reach = two ? g.L * 0.24 : g.L * 0.45;
    baPiers(g, us, 0.9, '#a8a8a2', false); baDeck(g, g.col[0], g.col[1]);
    const cb = baLay(g.O, g.col[1], g.fine ? 0.2 : 0.35), py = baLay(g.O, g.col[2], 1.2), n = g.fine ? 7 : 3;
    for (const u of us) {
      for (const v of [-g.hw - 0.3, g.hw + 0.3]) { baLine(py, u, v, baU(g, u, H), baV(g, 0, H)); for (let k = 1; k <= n; k++) for (const d of [-1, 1]) baLine(cb, baU(g, u, H * (0.6 + 0.4 * k / n)), baV(g, v * 0.2, H * (0.6 + 0.4 * k / n)), u + d * reach * k / n, v); }
    }
  },
  bridgetunnel: g => {
    const a = g.L * 0.42, b = g.L * 0.86, isl = baLay(g.U, '#c8b88a'), gr = baLay(g.U, '#7a9a5a'), tn = baLay(g.U, 'rgba(30,40,50,.35)', g.hw * 1.6);
    for (const u of [a, b]) { isl.moveTo(u + 2.2, 0); isl.ellipse(u, 0, 2.2, g.hw * 2.4, 0, 0, 6.283); gr.moveTo(u + 1.2, 0); gr.ellipse(u, 0, 1.2, g.hw * 1.3, 0, 0, 6.283); }
    baLine(tn, a, 0, b, 0);
    baPiers(g, baSpans({ L: a }, Math.max(2, Math.round(a / 6))), 0.45, '#a8a8a2', false); baDeck(g, g.col[0], g.col[1], [[0, a], [b, g.L]]);
    const pt = baLay(g.D, '#1e2226'); for (const [u, d] of [[a, 1], [b, -1]]) baRect(pt, u, -g.hw - 0.3, u + d * 0.9, g.hw + 0.3);
  },
  maglev: g => { const n = Math.max(2, Math.round(g.L / 2.4)); const p = baLay(g.U, '#c8ccd0', 0.6); for (const u of baSpans(g, n)) { baLine(p, u, -g.hw * 1.4, u, g.hw * 1.4); } baDeck(g, g.col[0], g.col[1]); const l = baLay(g.D, g.col[3], 0.35); baLine(l, 0, 0, g.L, 0); },
  skyspan: g => { const H = Math.min(16, 5 + g.L * 0.1); baDeck(g, g.col[0], g.col[1]); const gl = baLay(g.D, g.col[3], 0.25, 0.8); baLine(gl, 0, -g.hw, g.L, -g.hw); baLine(gl, 0, g.hw, g.L, g.hw); baCurve(g, g.O, 0, g.L, -0.5, H, -0.5, g.col[2], 0.35, 1.2, 'rgba(200,248,255,.5)'); },
};
// ---- broken, mended with boats, or drawn tile by tile ----
function baBroken(g) {
  const a = g.L * 0.32, b = g.L * 0.68;
  baPiers(g, [a, b], 0.6, g.col[2], false);
  baDeck(g, g.col[0], g.col[1], [[0, a], [b, g.L]]);
  const db = baLay(g.U, 'rgba(40,32,24,.75)');
  for (let k = 0; k < 7; k++) { const u = a + (b - a) * hash2(g.r.id, k, 41), v = (hash2(g.r.id, k, 43) - 0.5) * g.hw * 3; baRect(db, u - 0.4, v - 0.2, u + 0.4, v + 0.2); }
  if (g.r.pt) { baBoats(g, 1.3, g.hw * 1.6, '#6a4a2e', '#9a7a50', a - 0.4, b + 0.4); const pl = baLay(g.U, '#a08458'); baRect(pl, a - 0.5, -g.hw * 0.7, b + 0.5, g.hw * 0.7); }
}
// A street running along the water for a way, or forking on it: its deck drawn from tile to tile like the street itself.
function baSegments(r, col) {
  const p = new Path2D(), w = W.w, inT = new Set(r.t);
  for (const i of r.t) {
    const x = i % w, y = (i / w) | 0, cx = brCx(i) * TS, cy = brCy(i) * TS;
    let any = false;
    for (let k = 0; k < 8; k++) {
      const j = i + NB_D[k];
      if (!W.road[j] && !inT.has(j)) continue;
      if (k > 3 && (W.road[i + NB_X[k]] || W.road[i + NB_Y[k] * w])) continue;
      any = true; p.moveTo(cx, cy); p.lineTo((cx + brCx(j) * TS) / 2, (cy + brCy(j) * TS) / 2);
    }
    if (!any) { p.moveTo(cx - 1, cy); p.lineTo(cx + 1, cy); }
  }
  return { seg: p, col };
}
// ---- the cache: one picture per bridge, rebuilt when it changes or the zoom crosses into close-up ----
const baCache = new Map();
let baCacheW = null;
function baGet(r, fine) {
  if (baCacheW !== W) { baCache.clear(); baSub.clear(); baCacheW = W; }
  let c = baCache.get(r.id);
  const v = W.bridges.v;  // every change to a record bumps it; the key is built only when it moved
  if (c && c.v === v && c.f === fine && c.w === r.w) return c;
  const key = r.k + (r.br ? 'x' : '') + (r.pt ? 'p' : '') + (fine ? 'f' : '') + r.P.join(',') + r.w + (r.seg ? 's' : '');
  if (c && c.key === key) { c.v = v; c.f = fine; c.w = r.w; return c; }
  if (r.seg && r.s !== 'rd') { c = baSegments(r, BA_COL[r.k] || BA_COL.log); c.key = key; c.v = v; c.f = fine; c.w = r.w; baCache.set(r.id, c); return c; }
  const g = baFrame(r, r.P);
  g.fine = fine;
  if (r.br) baBroken(g); else (BA_ART[r.k] || BA_ART.log)(g);
  if (!r.br) baRails(g);
  const sh = new Path2D();
  for (const [a, b] of g.deck || [[0, g.L]]) baRect(sh, a, -g.hw - 0.45, b, g.hw + 0.45);
  c = { key, g, sh, mv: g.mv || null, v, f: fine, w: r.w };
  baCache.set(r.id, c);
  if (baCache.size > 4000) baCache.delete(baCache.keys().next().value);
  return c;
}
function baPaint(ctx, A, z) {
  for (const [st, p, lw, al] of A) {
    if (al !== 1) ctx.globalAlpha = al;
    if (lw) { ctx.strokeStyle = st; ctx.lineWidth = Math.max(lw, 0.5 / z); ctx.stroke(p); } else { ctx.fillStyle = st; ctx.fill(p); }
    if (al !== 1) ctx.globalAlpha = 1;
  }
}
// ---- movable spans: up for a passing ship (and now and then for the barges nobody draws) ----
const baOpen = new Map();
function baMoving(ctx, c, r, z, onRoad) {
  const g = c.g, [a, b] = c.mv, mx = (r.P[0] + r.P[2]) / 2, my = (r.P[1] + r.P[3]) / 2, w = W.w;
  let want = r.sh && ((Render.time * 0.7 + r.id * 13) % 60) < 7 ? 1 : 0;
  if (!want && W.ships) for (const s of W.ships) { const sx = s.at % w, sy = (s.at / w) | 0; if (Math.abs(sx - mx) < 3.5 && Math.abs(sy - my) < 3.5) { want = 1; break; } }
  let f = baOpen.get(r.id) || 0;
  f += clamp(want - f, -0.02, 0.02); baOpen.set(r.id, f);
  if (onRoad && f < 0.01) return;  // shut, the planned road's own surface is the deck
  const col = g.col[0], edge = g.col[1], hw = g.hw;
  const leaf = (u0, len, ang) => {
    // a leaf hinged at u0, raised by ang: it shortens in plan and rises up the screen
    const ca = Math.cos(ang), sa = Math.sin(ang), u1 = u0 + len * ca, h = Math.abs(len) * sa * 1.4;
    ctx.fillStyle = edge; ctx.beginPath(); ctx.moveTo(u0, -hw - 0.45); ctx.lineTo(baU(g, u1, h), baV(g, -hw - 0.45, h)); ctx.lineTo(baU(g, u1, h), baV(g, hw + 0.45, h)); ctx.lineTo(u0, hw + 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shadeHex(col, ang > 0.3 ? 0.12 : 0); ctx.beginPath(); ctx.moveTo(u0, -hw); ctx.lineTo(baU(g, u1, h), baV(g, -hw, h)); ctx.lineTo(baU(g, u1, h), baV(g, hw, h)); ctx.lineTo(u0, hw); ctx.closePath(); ctx.fill();
  };
  if (r.k === 'swing') {
    // the middle span turns on its pier
    const m = (a + b) / 2, L2 = (b - a) / 2, ang = f * Math.PI / 2;
    ctx.save(); ctx.translate(m, 0); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-L2 + 0.8, -hw - 0.45 + 1, L2 * 2, hw * 2 + 0.9);
    ctx.fillStyle = edge; ctx.fillRect(-L2, -hw - 0.45, L2 * 2, hw * 2 + 0.9); ctx.fillStyle = col; ctx.fillRect(-L2, -hw, L2 * 2, hw * 2);
    if (z >= 1.6) { ctx.strokeStyle = g.col[2]; ctx.lineWidth = 0.35; ctx.strokeRect(-L2 * 0.6, -hw - 0.2, L2 * 1.2, hw * 2 + 0.4); }
    ctx.restore();
  } else if (r.k === 'drawbridge') leaf(a, b - a, f * 1.2);
  else { const half = (b - a) / 2; leaf(a, half, f * 1.25); leaf(b, -half, f * 1.25); }
}
// ---- drawing, inside the world transform (1 unit = 1 terrain pixel), called from drawRoadNet (roads.js) ----
// which: 'tile' the street and railway bridges (all of each, before the street junctions); 'rd0' under the planned roads (piers,
// arches, parapet band; the road surface goes over it); 'rd1' over them (towers, cables, trusses, moving spans).
const baVis = [];
function drawBridges(ctx, z, x0, y0, x1, y1, which) {
  const B = W.bridges;
  if (!B || !B.list.length || z < 0.22) return;
  const rd = which !== 'tile', far = z < 0.5, fine = z >= 1.6;
  baVis.length = 0;
  for (const r of B.list) {
    if ((r.s === 'rd') !== rd || !r.P) continue;
    const mx0 = Math.min(r.P[0], r.P[2]), mx1 = Math.max(r.P[0], r.P[2]), my0 = Math.min(r.P[1], r.P[3]), my1 = Math.max(r.P[1], r.P[3]);
    if (mx1 < x0 - 3 || mx0 > x1 + 3 || my1 < y0 - 3 || my0 > y1 + 5) continue;
    baVis.push(r);
  }
  if (!baVis.length) return;
  ctx.save(); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  for (const r of baVis) {
    const col = BA_COL[r.k] || BA_COL.log;
    if (rd) { baRoadBridge(ctx, r, z, far, fine, which, col); continue; }
    if (far || r.seg) {
      // far out (and the long street bridges at any zoom): a band in the bridge's colours along its deck
      const c = r.seg ? baGet(r, false) : null, wd = (r.w || 0.4) * TS;
      if (!c) { ctx.beginPath(); ctx.moveTo(r.P[0] * TS, r.P[1] * TS); ctx.lineTo(r.P[2] * TS, r.P[3] * TS); }  // no Path2D a frame
      if (r.br) { ctx.globalAlpha = 0.5; }
      ctx.lineCap = 'round';
      ctx.strokeStyle = col[1]; ctx.lineWidth = wd * 1.45 + 0.6; c ? ctx.stroke(c.seg) : ctx.stroke();
      ctx.strokeStyle = col[0]; ctx.lineWidth = wd; c ? ctx.stroke(c.seg) : ctx.stroke();
      ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
      continue;
    }
    const c = baGet(r, fine), g = c.g;
    ctx.save(); ctx.translate(g.ax + 1.3, g.ay + 1.9); ctx.rotate(g.ang); ctx.fillStyle = BA_SHADOW; ctx.fill(c.sh); ctx.restore();
    ctx.save(); ctx.translate(g.ax, g.ay); ctx.rotate(g.ang);
    baPaint(ctx, g.U, z); baPaint(ctx, g.D, z);
    if (c.mv && !r.br) baMoving(ctx, c, r, z);
    baPaint(ctx, g.O, z);
    ctx.restore();
  }
  ctx.restore();
}
// A bridge on a planned road: its deck is the road's own curve; the structure follows the straight line between its ends.
const baSub = new Map();
function baRoadBridge(ctx, r, z, far, fine, which, col) {
  const R0 = brRoad(r);
  if (!R0 || !R0.done || !R0.br) return;
  const T = RT[R0.type], a = R0.br[r.q * 2], b = R0.br[r.q * 2 + 1];
  if (a === undefined || !T) return;
  const c = far ? null : baGet(r, fine);
  if (which === 'rd0') {
    let sp = baSub.get(r.id);
    if (!sp || sp.k !== a + ',' + b + ',' + R0.pts.length) { sp = subPath(R0, a, b); sp.k = a + ',' + b + ',' + R0.pts.length; baSub.set(r.id, sp); }
    ctx.strokeStyle = BA_SHADOW; ctx.lineWidth = T.wid * TS * 1.5; ctx.save(); ctx.translate(TS * 0.25, TS * 0.35); ctx.stroke(sp); ctx.restore();
    if (c) { const g = c.g; ctx.save(); ctx.translate(g.ax, g.ay); ctx.rotate(g.ang); baPaint(ctx, g.U, z); ctx.restore(); }
    if (!r.br) { ctx.strokeStyle = col[1]; ctx.lineWidth = T.wid * TS * 1.32; ctx.stroke(sp); }
    return;
  }
  if (!c) return;
  const g = c.g;
  ctx.save(); ctx.translate(g.ax, g.ay); ctx.rotate(g.ang);
  // broken: the water shows through the gap in the road, with the wreck in it
  if (r.br) { ctx.fillStyle = r.lk ? '#3c6f96' : '#3a80ac'; ctx.fillRect(g.L * 0.32, -g.hw - 0.6, g.L * 0.36, g.hw * 2 + 1.2); baPaint(ctx, g.U, z); ctx.restore(); return; }
  if (c.mv) baMoving(ctx, c, r, z, true);
  baPaint(ctx, g.O, z);
  ctx.restore();
}
