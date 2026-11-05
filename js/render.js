'use strict';
// Terrain is painted per pixel into chunks, tiles repaint when the world changes, and everything alive is drawn on top each frame.

const CHUNK = 64;
const Render = {
  cam: { x: 0, y: 0, z: 1 }, cv: null, ctx: null, vw: 0, vh: 0,
  pix: null, base: null, img: null, chunks: [], cw: 0, ch: 0, dirtyTiles: new Set(), dirtyChunks: new Set(),
  snow: null, terr: null, mode: 'normal', modeCv: null, sel: null, hover: -1, time: 0, labels: [],
};
const rgb = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const PAL = ['#1b3c63', '#2f6f96', '#3a81a8', '#e4d7a4', '#7ba84b', '#b6aa5c', '#dcc689', '#568f40', '#34803d', '#4f7d5f', '#a9ad94', '#607f52', '#a9ac63', '#878179', '#eef1f4'].map(hex);

function initRender(canvas) {
  const R0 = Render;
  R0.cv = canvas; R0.ctx = canvas.getContext('2d', { alpha: false });
  const pw = W.w * TS, ph = W.h * TS;
  R0.base = new Uint32Array(pw * ph);
  R0.img = new ImageData(pw, ph);
  R0.pix = new Uint32Array(R0.img.data.buffer);
  paintBase();
  R0.pix.set(R0.base);
  for (let i = 0, n = W.w * W.h; i < n; i++) if (W.tree[i] || W.road[i] || W.occ[i] || W.rail[i] || W.ore[i] > 2 || W.canal[i] || (W.ditch && W.ditch[i]) || W.plant[i] || W.ice[i] > 80 || W.lane[i] >= SEA_LANE) paintTile(i);
  R0.cw = Math.ceil(W.w / CHUNK); R0.ch = Math.ceil(W.h / CHUNK);
  R0.chunks = [];
  for (let k = 0; k < R0.cw * R0.ch; k++) {
    const c = document.createElement('canvas');
    c.width = c.height = CHUNK * TS;
    R0.chunks.push(c);
    const cx = k % R0.cw, cy = (k / R0.cw) | 0;
    c.getContext('2d').putImageData(R0.img, -cx * CHUNK * TS, -cy * CHUNK * TS, cx * CHUNK * TS, cy * CHUNK * TS, CHUNK * TS, CHUNK * TS);
  }
  buildSnow();
  R0.terr = document.createElement('canvas'); R0.terr.width = W.w; R0.terr.height = W.h;
  R0.modeCv = document.createElement('canvas'); R0.modeCv.width = W.w; R0.modeCv.height = W.h;
  onDirty = i => R0.dirtyTiles.add(i);
  onTerritory = paintTerritory;
  onLandChange = i => repaintLand(i % W.w, (i / W.w) | 0, i % W.w, (i / W.w) | 0);
  setupFX();
  paintTerritory();
}

function paintBase(rx0, ry0, rx1, ry1) {
  const w = W.w, h = W.h, pw = w * TS, ph = h * TS, base = Render.base;
  const whole = rx0 === undefined;
  const pxA = whole ? 0 : Math.max(0, (rx0 - 1) * TS), pxB = whole ? pw : Math.min(pw, (rx1 + 2) * TS), pyA = whole ? 0 : Math.max(0, (ry0 - 1) * TS), pyB = whole ? ph : Math.min(ph, (ry1 + 2) * TS);
  const { elev, biome, water, temp, moist } = W;
  const shade = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const a = Math.max(0, elev[i - w - 1]), b = Math.max(0, elev[i + w + 1]);
    shade[i] = clamp(1 + (a - b) * 7.5, 0.62, 1.38);
  }
  const seed = W.seed;
  for (let py = pyA; py < pyB; py++) {
    const v = (py + 0.5) / TS - 0.5, y0 = clamp(Math.floor(v), 0, h - 2), fy = clamp(v - y0, 0, 1);
    for (let px = pxA; px < pxB; px++) {
      const u = (px + 0.5) / TS - 0.5, x0 = clamp(Math.floor(u), 0, w - 2), fx = clamp(u - x0, 0, 1);
      const i00 = y0 * w + x0, i10 = i00 + 1, i01 = i00 + w, i11 = i01 + 1;
      const wa = (1 - fx) * (1 - fy), wb = fx * (1 - fy), wc = (1 - fx) * fy, wd = fx * fy;
      const e = elev[i00] * wa + elev[i10] * wb + elev[i01] * wc + elev[i11] * wd;
      const n1 = hash2(px >> 1, py >> 1, seed), n2 = hash2(px, py, seed + 3);
      const tx0 = clamp(Math.round(u + (n1 - 0.5) * 1.5), 0, w - 1), ty0 = clamp(Math.round(v + (hash2(px >> 1, py >> 1, seed + 1) - 0.5) * 1.5), 0, h - 1);
      // what this pixel is comes from the tile it's actually in: water is water and land is land, so nothing ever stands in a painted sea
      const tile = Math.min(h - 1, (py / TS) | 0) * w + Math.min(w - 1, (px / TS) | 0);
      let t = ty0 * w + tx0, bi = biome[t], isWet = !!water[tile];
      // round the corners of the coast off a little, one pixel at most, so it doesn't look like stairs
      if (TS > 3) {
        const cx = px % TS, cy = py % TS, ex = cx === 0 ? -1 : cx === TS - 1 ? 1 : 0, ey = cy === 0 ? -w : cy === TS - 1 ? w : 0;
        if (ex && ey) { const a0 = water[tile + ex], b0 = water[tile + ey], c0 = water[tile + ex + ey]; if (!isWet && a0 && b0 && c0 && !W.occ[tile]) isWet = true; else if (isWet && !a0 && !b0 && !c0) isWet = false; }
      }
      if (isWet) { if (water[t]) { /* same water */ } else { t = tile; bi = water[tile] ? biome[tile] : B.SHALLOW; } if (!water[t]) bi = B.SHALLOW; }
      else if (water[t]) { t = tile; bi = biome[tile]; if (water[t]) bi = B.BEACH; }
      let r, g, b;
      if (isWet) {
        if (bi === B.LAKE) { const c = PAL[B.LAKE]; r = c[0]; g = c[1]; b = c[2]; }
        else {
          const d = clamp(-Math.min(e, 0) * 2.6, 0, 1), s = d * d * (3 - 2 * d);
          r = lerp(70, 22, s); g = lerp(146, 52, s); b = lerp(170, 92, s);
          if (e > -0.012) { const f = (e + 0.012) / 0.012; r = lerp(r, 196, f * 0.55); g = lerp(g, 216, f * 0.55); b = lerp(b, 205, f * 0.55); }
        }
        const wave = (n2 - 0.5) * 5; r += wave; g += wave; b += wave;
      } else {
        const c = PAL[bi];
        r = c[0]; g = c[1]; b = c[2];
        const lo = hash2(px >> 3, py >> 3, seed + 2) - 0.5;
        r += lo * 12; g += lo * 14; b += lo * 8;
        if (bi === B.GRASS || bi === B.FOREST) { const dry = 0.6 - moist[t]; r += dry * 30; g += dry * 6; b -= dry * 8; }
        if (bi === B.ROCK || bi === B.SNOW) {
          const crag = (n2 - 0.5) * 34;
          r += crag; g += crag; b += crag;
          const snowLine = 0.62 + temp[t] * 0.5;
          if (e > snowLine + (n1 - 0.5) * 0.05) { r = 235; g = 239; b = 243; }
        } else if (e > 0.32) { const q = clamp((e - 0.32) * 3, 0, 0.55); r = lerp(r, 134, q); g = lerp(g, 128, q); b = lerp(b, 118, q); }
        const sh = shade[i00] * wa + shade[i10] * wb + shade[i01] * wc + shade[i11] * wd;
        const d = 1 + (n2 - 0.5) * 0.09;
        r *= sh * d; g *= sh * d; b *= sh * d;
      }
      base[py * pw + px] = rgb(clamp(r, 0, 255) | 0, clamp(g, 0, 255) | 0, clamp(b, 0, 255) | 0);
    }
  }
  // rivers follow their real drainage line
  const rc = rgb(58, 128, 172);
  for (let i = 0, n = w * h; i < n; i++) {
    const lv = W.river[i];
    if (!lv) continue;
    if (!whole) { const rx = i % w, ry = (i / w) | 0; if (rx < rx0 - 2 || rx > rx1 + 2 || ry < ry0 - 2 || ry > ry1 + 2) continue; }
    const d = W.down[i];
    const ax = (i % w + 0.5) * TS, ay = (((i / w) | 0) + 0.5) * TS;
    const dx = d >= 0 ? (d % w + 0.5) * TS : ax, dy = d >= 0 ? (((d / w) | 0) + 0.5) * TS : ay;
    const rad = lv === 1 ? 0.55 : lv === 2 ? 1.1 : lv === 3 ? 1.9 : 2.8;
    for (let k = 0; k <= 8; k++) {
      const cx = lerp(ax, dx, k / 8), cy = lerp(ay, dy, k / 8);
      const R1 = Math.ceil(rad);
      for (let oy = -R1; oy <= R1; oy++) for (let ox = -R1; ox <= R1; ox++) {
        if (ox * ox + oy * oy > rad * rad + 0.3) continue;
        const qx = Math.round(cx + ox), qy = Math.round(cy + oy);
        if (qx >= 0 && qy >= 0 && qx < pw && qy < ph) base[qy * pw + qx] = rc;
      }
    }
  }
}

function repaintLand(x0, y0, x1, y1) {
  const R0 = Render;
  paintBase(x0, y0, x1, y1);
  const w = W.w, pw = w * TS;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const a = y * TS * pw + x * TS;
    for (let py = 0; py < TS; py++) { const q = a + py * pw; for (let px = 0; px < TS; px++) R0.pix[q + px] = R0.base[q + px]; }
    dirty(y * w + x);
  }
}
function blend(p, r, g, b, a) {
  const q = Render.pix[p];
  const ir = q & 255, ig = (q >> 8) & 255, ib = (q >> 16) & 255;
  Render.pix[p] = rgb((ir + (r - ir) * a) | 0, (ig + (g - ig) * a) | 0, (ib + (b - ib) * a) | 0);
}
const FIELD_C = [[122, 92, 58], [118, 110, 62], [92, 142, 58], [214, 182, 70]];
const ROAD_C = [null, [170, 148, 104], [176, 150, 110], [158, 156, 148], [70, 70, 74]];
function paintTile(i) {
  const w = W.w, pw = w * TS, x = i % w, y = (i / w) | 0;
  const ox = x * TS, oy = y * TS, pix = Render.pix, base = Render.base;
  for (let py = 0; py < TS; py++) { const a = (oy + py) * pw + ox; for (let px = 0; px < TS; px++) pix[a + px] = base[a + px]; }
  const occ = W.occ[i];
  if (occ === 2) {
    const s = W.stage[i], c = FIELD_C[s];
    const horiz = hash2(x >> 2, y >> 2, 11) > 0.5;
    for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) {
      const stripe = (horiz ? py : px) % 2 === 0;
      const k = stripe ? 1 : 0.8;
      if (px === 0 || py === 0) { blend((oy + py) * pw + ox + px, c[0] * 0.8, c[1] * 0.8, c[2] * 0.8, 0.8); continue; }
      pix[(oy + py) * pw + ox + px] = rgb((c[0] * k) | 0, (c[1] * k) | 0, (c[2] * k) | 0);
    }
  } else if (occ === 1 || occ === 4) {
    for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) blend((oy + py) * pw + ox + px, 138, 118, 88, occ === 1 ? 0.5 : 0.3);
  } else if (occ === 3) {  // trodden ground under a wall; the wall itself is drawn over the top as a curve (walls.js)
    for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) blend((oy + py) * pw + ox + px, 120, 104, 80, 0.45);
  }
  if (occ === 0 && W.ore[i] > 2) {
    const c = ORE_COL[W.ore[i]];
    for (let k = 0; k < 2; k++) {
      const a = hash2(x, y, k + 40), b = hash2(x, y, k + 60);
      const q = (oy + 1 + ((b * 4) | 0)) * pw + ox + 1 + ((a * 4) | 0);
      pix[q] = c;
    }
  }
  // a dug waterway: stone banks, still water, and a lock wherever the ground steps up or down
  const cv = W.canal[i];
  if (cv) {
    const dn = cv === 2 ? 0 : 1;
    for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) {
      const edge = (px < dn || py < dn || px >= TS - dn || py >= TS - dn);
      pix[(oy + py) * pw + ox + px] = edge ? rgb(128, 122, 108) : rgb(52 + ((px + py) & 1) * 6, 112 + ((px + py) & 1) * 6, 150);
    }
    for (let k = 0; k < 4; k++) {
      const ni = i + NB_D[k];
      if (W.canal[ni] && Math.abs(W.elev[ni] - W.elev[i]) > 0.02) { for (let s = 0; s < TS; s++) { const px = NB_Y[k] ? s : (NB_X[k] > 0 ? TS - 1 : 0), py = NB_Y[k] ? (NB_Y[k] > 0 ? TS - 1 : 0) : s; pix[(oy + py) * pw + ox + px] = rgb(60, 44, 30); } }
    }
  }
  // an irrigation ditch: a thin line of water joining its neighbours, the river or lake it draws from, and the canals
  if (W.ditch && W.ditch[i] && occ !== 1 && occ !== 2) {
    const wet = j => (W.ditch[j] && W.occ[j] !== 1 && W.occ[j] !== 2) || W.river[j] || W.canal[j] || W.water[j];
    const h = TS >> 1, mid = (px, py) => { const q = (oy + py) * pw + ox + px; pix[q] = rgb(70, 128, 170); };
    let any = false;
    for (let k = 0; k < 4; k++) {
      if (!wet(i + NB_D[k])) continue;
      any = true;
      for (let s = 0; s <= h; s++) { const px = NB_X[k] ? (NB_X[k] > 0 ? h + s : h - s) : h, py = NB_Y[k] ? (NB_Y[k] > 0 ? h + s : h - s) : h; if (px >= 0 && px < TS && py >= 0 && py < TS) mid(px, py); }
    }
    if (!any) for (let s = 1; s < TS - 1; s++) mid(s, h);
  }
  // Paths wander: each road tile has its own off-grid centre, and the road runs from centre to centre, wider the busier it is.
  const lv = W.road[i];
  // a planned road is drawn as a smooth curve over the terrain (roads.js); its tiles only get a graded verge here
  if (lv > 0 && W.occ[i] !== 3 && typeof inPlanned === 'function' && inPlanned(i)) {
    for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) blend((oy + py) * pw + ox + px, 150, 146, 128, 0.35);
  } else if (lv > 0 && W.occ[i] !== 3) {
    const rt = W.rtype ? W.rtype[i] : 0;
    const c = (W.river[i] || W.canal[i]) && lv >= 2 ? [132, 98, 62] : rt && lv >= 3 ? hex(RT[rt].surf) : ROAD_C[lv];
    const a = lv === 1 ? 0.72 : 0.96;
    const rad = (lv === 1 ? 0.7 : lv === 2 ? 1.05 : 1.3) + Math.min(W.lanes[i], 3) * 0.55;
    const cxOf = (qx, qy) => (qx - x) * TS + 3 + (hash2(qx, qy, 71) - 0.5) * 2.6, cyOf = (qx, qy) => (qy - y) * TS + 3 + (hash2(qx, qy, 72) - 0.5) * 2.6;
    const mx = cxOf(x, y), my = cyOf(x, y);
    const line = (x1, y1, r) => {
      const n0 = Math.ceil(Math.hypot(x1 - mx, y1 - my)) * 2 + 1;
      for (let s = 0; s <= n0; s++) {
        const lx = lerp(mx, x1, s / n0), ly = lerp(my, y1, s / n0), R1 = Math.ceil(r);
        for (let q = -R1; q <= R1; q++) for (let e = -R1; e <= R1; e++) {
          const px = Math.round(lx + e), py = Math.round(ly + q);
          if (px < 0 || py < 0 || px >= TS || py >= TS || e * e + q * q > r * r + 0.3) continue;
          blend((oy + py) * pw + ox + px, c[0], c[1], c[2], a);
        }
      }
    };
    let joined = 0;
    for (let k = 0; k < 8; k++) {
      const ni = i + NB_D[k];
      if (ni < 0 || ni >= W.road.length || !W.road[ni]) continue;
      if (k > 3 && (W.road[i + NB_X[k]] || W.road[i + NB_Y[k] * w])) continue;  // don't draw the corner twice
      joined++;
      const qx = x + NB_X[k], qy = y + NB_Y[k];
      line((mx + cxOf(qx, qy)) / 2, (my + cyOf(qx, qy)) / 2, rad);
    }
    if (!joined) line(mx, my, rad);
    // lanes on a busy modern road
    if (lv >= 4 && W.lanes[i] >= 1) for (let s = 0; s < 3; s++) pix[(oy + 2 + s * 2 - 1) * pw + ox + 3] = rgb(226, 214, 130);
  }
  if (W.rail[i]) {
    const dbl = W.rail[i] >= 2;
    for (let k = 0; k < 8; k++) {
      const ni = i + NB_D[k];
      if (ni < 0 || ni >= W.rail.length || !W.rail[ni]) continue;
      for (let s = 0; s <= 3; s++) {
        const px = 2 + NB_X[k] * s, py = 2 + NB_Y[k] * s;
        if (px < 0 || py < 0 || px >= TS || py >= TS) continue;
        pix[(oy + py) * pw + ox + px] = rgb(44, 42, 46);
        if (dbl) { const qx = px + (NB_Y[k] ? 2 : 0), qy = py + (NB_X[k] ? 2 : 0); if (qx < TS && qy < TS) pix[(oy + qy) * pw + ox + qx] = rgb(44, 42, 46); }
        if (s % 2 === 0) { const qx = px + (NB_Y[k] ? 1 : 0), qy = py + (NB_X[k] ? 1 : 0); if (qx < TS && qy < TS) pix[(oy + qy) * pw + ox + qx] = rgb(92, 72, 50); }
      }
    }
  }
  if (W.ice[i] > 80 && W.water[i]) for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) blend((oy + py) * pw + ox + px, 226, 238, 246, 0.82);
  // a shipping lane: so many hulls have passed that the way is buoyed and charted, a pale streak of churned water
  else if (W.water[i] && W.lane[i] >= SEA_LANE) { const a = W.lane[i] >= SEA_LANE * 3 ? 0.26 : 0.16; for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) if ((px + py * 3 + x + y) % 5 < 2) blend((oy + py) * pw + ox + px, 200, 228, 240, a); }
  const tr = W.tree[i];
  if (tr > 0 && occ === 0 && !W.water[i]) paintTrees(i, tr, ox, oy, x, y);
  const pk = W.plant[i];
  if (pk && occ === 0) {
    const P = PLANTS[pk], s = W.plantS[i], c0 = P.col, c1 = P.dot;
    for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) if ((px + py * 3) % 4 !== 1) blend((oy + py) * pw + ox + px, c0[0], c0[1], c0[2], s === 0 ? 0.35 : 0.7);
    if (s === 2) for (let k = 0; k < 4; k++) { const a = (hash2(x, y, k + 150) * TS) | 0, b = (hash2(x, y, k + 170) * TS) | 0; pix[(oy + b) * pw + ox + a] = rgb(c1[0], c1[1], c1[2]); }
  }
}
const ORE_COL = [0, 0, 0, rgb(70, 170, 140), rgb(190, 190, 205), rgb(150, 86, 62), rgb(66, 62, 62), rgb(240, 205, 70), rgb(46, 40, 56), rgb(235, 232, 225), rgb(214, 208, 70), rgb(120, 220, 110), rgb(150, 120, 225)];
function paintTrees(i, tr, ox, oy, x, y) {
  const pw = W.w * TS, pix = Render.pix, b = W.biome[i];
  const conifer = b === B.TAIGA || (W.temp[i] < 0.4), jungle = b === B.JUNGLE, acacia = b === B.SAVANNA || b === B.STEPPE;
  const count = tr >= 5 ? 3 : tr >= 3 ? 2 : 1;
  const put = (px, py, c) => { if (px >= 0 && py >= 0 && px < TS && py < TS) pix[(oy + py) * pw + ox + px] = c; };
  if (tr >= 3) for (let py = 0; py < TS; py++) for (let px = 0; px < TS; px++) blend((oy + py) * pw + ox + px, 34, 66, 36, 0.1 + hash2(ox + px, oy + py, 5) * 0.14);
  for (let k = 0; k < count; k++) {
    const a = hash2(x, y, k * 7 + 1), c = hash2(x, y, k * 7 + 2), v = hash2(x, y, k * 7 + 3);
    const cx = count === 1 ? 2 + ((a * 2) | 0) : k === 0 ? 1 + ((a * 2) | 0) : k === 1 ? 3 + ((a * 2) | 0) : 1 + ((a * 4) | 0);
    const cy = count === 1 ? 2 + ((c * 2) | 0) : k === 2 ? 1 : k === 0 ? 3 : 3 + ((c * 2) | 0);
    const dv = (v * 26) | 0;
    if (conifer) {
      const m = rgb(38 + dv * 0.4, 86 + dv, 62 + dv * 0.3), d = rgb(26 + dv * 0.2, 60 + dv * 0.6, 44);
      put(cx, cy - 2, m); put(cx - 1, cy - 1, d); put(cx, cy - 1, m); put(cx + 1, cy - 1, m); put(cx - 1, cy, d); put(cx, cy, m); put(cx + 1, cy, m); put(cx, cy + 1, rgb(70, 50, 32));
    } else if (acacia) {
      const m = rgb(112 + dv, 128 + dv, 60);
      put(cx - 1, cy - 1, m); put(cx, cy - 1, m); put(cx + 1, cy - 1, m); put(cx, cy, rgb(84, 62, 36)); put(cx, cy + 1, rgb(84, 62, 36));
    } else {
      const g0 = jungle ? 118 : 104, m = rgb(50 + dv * 0.5, g0 + dv, 46 + dv * 0.3), d = rgb(34 + dv * 0.3, (g0 - 34) + dv * 0.6, 34), h = rgb(80 + dv, g0 + 30 + dv, 60);
      put(cx, cy - 1, h); put(cx - 1, cy, m); put(cx, cy, m); put(cx + 1, cy, m); put(cx - 1, cy - 1, m); put(cx + 1, cy - 1, m); put(cx, cy + 1, d); put(cx - 1, cy + 1, d); put(cx + 1, cy + 1, d);
    }
  }
}
// The snow layer comes straight from how deep it really lies, repainted a few times a second a strip at a time.
function buildSnow() {
  const c = document.createElement('canvas'); c.width = W.w; c.height = W.h;
  Render.snow = c;
  Render.snowG = c.getContext('2d');
  Render.snowIm = Render.snowG.createImageData(W.w, W.h);
  Render.snowY = 0;
  paintSnow(W.h);
}
function paintSnow(rows) {
  const w = W.w, h = W.h, d = Render.snowIm.data, S0 = W.snowD, ice = W.ice;
  let y = Render.snowY;
  const y0 = y;
  for (let k = 0; k < rows; k++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, q = i * 4, v = S0[i];
      const deep = v > 200;  // old ice is bluer
      d[q] = deep ? 214 : 240; d[q + 1] = deep ? 232 : 244; d[q + 2] = 250;
      d[q + 3] = v < 3 ? 0 : Math.min(240, 40 + v * 3);
    }
    y++;
    if (y >= h) y = 0;
  }
  Render.snowY = y;
  if (y > y0) Render.snowG.putImageData(Render.snowIm, 0, 0, 0, y0, w, y - y0);
  else Render.snowG.putImageData(Render.snowIm, 0, 0);
}
function paintTerritory() {
  const g = Render.terr.getContext('2d'), im = g.createImageData(W.w, W.h), d = im.data, w = W.w, n = w * W.h, owner = W.owner;
  // one lookup per town id, so the sweep below stays fast on big maps
  const maxId = W.nextTown + 1, polOf = new Int32Array(maxId).fill(-1), cols = {};
  for (const t of W.towns) {
    // ground taken in war shows in the colour of whoever's holding it, so the front line can be read off the map
    const P = t.occupier && t.occupier.alive ? t.occupier : t.polity;
    if (!cols[P.id]) cols[P.id] = hslRgb(P.hue / 360, 0.8, P.light / 100);
    polOf[t.id] = P.id;
  }
  for (let i = w; i < n - w; i++) {
    const id = owner[i];
    if (id < 0) continue;
    const pid = polOf[id];
    if (pid < 0) continue;
    const c = cols[pid];
    // the sea isn't a frontier: only land next to someone else's land, or unclaimed land, gets the bright edge
    const water = W.water;
    const differs = j => !water[j] && (owner[j] < 0 ? -1 : polOf[owner[j]]) !== pid;
    const border = differs(i - 1) || differs(i + 1) || differs(i - w) || differs(i + w);
    const q = i * 4;
    d[q] = c[0]; d[q + 1] = c[1]; d[q + 2] = c[2]; d[q + 3] = border ? 245 : 88;
  }
  g.putImageData(im, 0, 0);
}
function hslRgb(h, s, l) {
  const f = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3) * 255 | 0, f(p, q, h) * 255 | 0, f(p, q, h - 1 / 3) * 255 | 0];
}
// Map lenses: fertility and buried resources, painted once a tile per pixel.
function paintMode() {
  const g = Render.modeCv.getContext('2d'), im = g.createImageData(W.w, W.h), d = im.data, n = W.w * W.h, m = Render.mode;
  const RC = { 1: [150, 150, 150], 2: [190, 110, 70], 3: [70, 210, 170], 4: [225, 225, 245], 5: [210, 110, 70], 6: [20, 20, 22], 7: [255, 220, 70], 8: [120, 40, 170], 9: [240, 238, 230], 10: [225, 215, 60], 11: [90, 240, 90], 12: [170, 130, 240] };
  const CC = [null, [240, 200, 80], [120, 220, 240], [250, 150, 50], [210, 170, 110], [190, 120, 200]];
  let R0land = 1; if (m === 'land' && W.land) for (let i = 0; i < n; i++) if (W.land[i] > R0land) R0land = W.land[i];
  for (let i = 0; i < n; i++) {
    let c = null, a = 0;
    if (m === 'fertility') {
      if (!W.water[i]) { const f = W.fert[i] / 200; c = [lerp(150, 30, f), lerp(100, 170, f), lerp(50, 50, f)]; a = 170; }
    } else if (m === 'faith') {
      const t0 = W.townById[W.owner[i]];
      if (t0 && t0.faith >= 0 && !W.water[i]) { const f = W.faiths[t0.faith]; c = hslRgb(f.hue / 360, 0.65, 0.55); a = 170; }
    } else if (m === 'land') {
      // cheap is a cool dark green, dear runs up through gold to red; the scale is the dearest plot in the world
      if (!W.water[i] && W.land) { const f = Math.min(1, Math.sqrt(W.land[i] / R0land)); c = f < 0.5 ? [lerp(30, 230, f * 2), lerp(70, 200, f * 2), lerp(60, 60, f * 2)] : [lerp(230, 225, f * 2 - 1), lerp(200, 50, f * 2 - 1), lerp(60, 40, f * 2 - 1)]; a = 60 + f * 170; }
    } else if (m === 'resources') {
      if (W.ore[i] && W.oreAmt[i] > 0) { c = RC[W.ore[i]]; a = W.ore[i] <= 2 ? 120 : 245; }
      else if (W.wild[i]) { c = CC[W.wild[i]]; a = 120; }
      else if (!W.water[i]) { c = [30, 30, 30]; a = 90; }
    }
    if (c) { d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = a; }
  }
  g.putImageData(im, 0, 0);
}

function flushDirty() {
  const R0 = Render;
  if (R0.dirtyTiles.size) {
    let budget = 900;
    for (const i of R0.dirtyTiles) {
      paintTile(i);
      R0.dirtyTiles.delete(i);
      R0.dirtyChunks.add(((i / W.w | 0) / CHUNK | 0) * R0.cw + ((i % W.w) / CHUNK | 0));
      if (--budget <= 0) break;
    }
  }
  if (R0.dirtyChunks.size) {
    const cs = CHUNK * TS, c = R0.cam;
    const x0 = Math.floor(c.x / cs), x1 = Math.floor((c.x + R0.vw / c.z) / cs), y0 = Math.floor(c.y / cs), y1 = Math.floor((c.y + R0.vh / c.z) / cs);
    let n = 3;
    for (const k of R0.dirtyChunks) {
      const cx = k % R0.cw, cy = (k / R0.cw) | 0;
      if (cx < x0 || cx > x1 || cy < y0 || cy > y1) continue;
      R0.chunks[k].getContext('2d').putImageData(R0.img, -cx * cs, -cy * cs, cx * cs, cy * cs, cs, cs);
      R0.dirtyChunks.delete(k);
      if (--n <= 0) break;
    }
  }
}

// ---- the frame ----
function personPos(p, out) {
  const w = W.w;
  let f = 0, a = p.ti, b = a;
  if (p.need > 0 && p.st === 1) {
    // in a big world each walker is moved every few ticks; between those visits carry them on at their pace, along the path, so they glide instead of hopping
    let mv = p.mv + (LOD_TURN > 1 ? p.spd * ((p.id + W.tick) % LOD_TURN) : 0);
    b = p.nt; f = mv / p.need;
    for (let k = p.pi + 1, nd = p.need; f > 1 && k + 1 < p.path.length; k++) { mv -= nd; a = p.path[k]; b = p.path[k + 1]; nd = stepNeed(p, a, b); f = mv / nd; }
    if (f > 1) f = 1;
  } else if (p.need > 0 && p.mv > 0 && p.pi === 0 && p.path && p.path.length === 2 && p.ti === p.path[0]) { b = p.nt; f = Math.min(1, p.mv / p.need); }  // called away mid-walk: still where they'd got to, until the next visit settles them there
  const jx = ((p.id * 2654435761) >>> 0) / 4294967296 - 0.5, jy = ((p.id * 40503 * 65537) >>> 0) / 4294967296 - 0.5;
  out.x = (a % w + (b % w - a % w) * f + 0.5 + jx * 0.7) * TS;
  out.y = (((a / w) | 0) + (((b / w) | 0) - ((a / w) | 0)) * f + 0.5 + jy * 0.7) * TS;
  return out;
}
const _pos = { x: 0, y: 0 };
const _vis = [];
const FAR_BLD_COL = ['#77736a', '#a3a39c', '#c9805e', '#c7a56a', '#e0d4b8'];  // ruins, towers, brick, timber, everything else
function drawFrame(dt) {
  const R0 = Render, ctx = R0.ctx, c = R0.cam, z = c.z, vw = R0.vw, vh = R0.vh;
  R0.time += dt;
  flushDirty();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#16345c'; ctx.fillRect(0, 0, vw, vh);
  const vx0 = c.x, vy0 = c.y, vx1 = c.x + vw / z, vy1 = c.y + vh / z;
  // zoomed far out a person is a dot a pixel or two across, and nobody can see them go round a house: the whole map walks the cheap way, as if off screen
  if (z < FAR_Z) { VIEW.x0 = 0; VIEW.x1 = -1; VIEW.y0 = 0; VIEW.y1 = -1; }
  else { VIEW.x0 = vx0 / TS - VIEW_MARGIN; VIEW.x1 = vx1 / TS + VIEW_MARGIN; VIEW.y0 = vy0 / TS - VIEW_MARGIN; VIEW.y1 = vy1 / TS + VIEW_MARGIN; }
  // snow lies exactly as deep as it really is
  if ((R0.frameN = (R0.frameN || 0) + 1) % 6 === 0) paintSnow(Math.max(8, Math.ceil(W.h / 8)));
  if ((R0.mode === 'faith' || R0.mode === 'land') && W.tick % 120 === 0) paintMode();
  if (!W.wrap) { drawWorld(dt); return; }
  // a world that wraps round (the Earth) is drawn once for every copy of it the view takes in, side by side, so there's never an edge east or west
  const pw = W.w * TS, x0 = c.x, labs = [], hits = [], vis0 = R0.visP || 0;
  let seen = 0;
  for (let k = Math.floor(x0 / pw); k * pw < x0 + vw / z; k++) {
    c.x = x0 - k * pw; R0.visP = vis0;
    drawWorld(dt);
    seen += R0.visP || 0;
    for (const L of R0.labels) labs.push(L);
    if (R0.battleHits) for (const h of R0.battleHits) hits.push(h);
  }
  c.x = x0; R0.visP = seen;
  R0.labels.length = 0; for (const L of labs) R0.labels.push(L);
  if (R0.battleHits) { R0.battleHits.length = 0; for (const h of hits) R0.battleHits.push(h); }
  // from far out, a hint of the globe: the far north and south fade towards the poles
  if (z < 0.9) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const ph = W.h * TS, a = clamp((0.9 - z) * 0.5, 0, 0.3), band = ph * 0.14 * z;
    for (const [y0, y1] of [[-c.y * z, -c.y * z + band], [(ph - c.y) * z, (ph - c.y) * z - band]]) {
      const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(8,14,24,${a})`); g.addColorStop(1, 'rgba(8,14,24,0)');
      ctx.fillStyle = g; ctx.fillRect(0, Math.min(y0, y1), vw, Math.abs(y1 - y0));
    }
  }
}
// One copy of the world, as the camera sees it now.
function drawWorld(dt) {
  const R0 = Render, ctx = R0.ctx, c = R0.cam, z = c.z, vw = R0.vw, vh = R0.vh;
  ctx.imageSmoothingEnabled = z < 1;
  const tx0 = Math.round(-c.x * z), ty0 = Math.round(-c.y * z);
  ctx.setTransform(z, 0, 0, z, tx0, ty0);
  const cs = CHUNK * TS;
  const vx0 = c.x, vy0 = c.y, vx1 = c.x + vw / z, vy1 = c.y + vh / z;
  for (let cy = Math.max(0, Math.floor(vy0 / cs)); cy < R0.ch && cy * cs < vy1; cy++) {
    for (let cx = Math.max(0, Math.floor(vx0 / cs)); cx < R0.cw && cx * cs < vx1; cx++) {
      ctx.drawImage(R0.chunks[cy * R0.cw + cx], cx * cs, cy * cs, cs + 0.6 / z, cs + 0.6 / z);
    }
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(R0.snow, 0, 0, W.w * TS, W.h * TS);
  const mode = R0.mode;
  if (mode === 'fertility' || mode === 'resources' || mode === 'faith' || mode === 'land') {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(R0.modeCv, 0, 0, W.w * TS, W.h * TS);
  }
  // realm colours stay on at every zoom; close up they just get quieter so the town can be read through them
  const terrA = mode === 'kingdoms' ? 0.95 : mode === 'normal' && UI.borders ? clamp(0.8 - z * 0.14, 0.38, 0.7) : 0;
  if (terrA > 0.01) {
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = terrA;
    ctx.drawImage(R0.terr, 0, 0, W.w * TS, W.h * TS);
    ctx.globalAlpha = 1;
  }
  if (mode === 'weather') drawWeather(ctx, z);
  // the planned roads, then the traffic on them, under the trees and buildings
  drawRoadNet(ctx, z);
  drawRoadTraffic(ctx, z);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = z < 4;

  drawRails(ctx, c, z);
  drawTrees(ctx, c, z, vw, vh);
  drawHerds(ctx, c, z, vw, vh);

  // buildings, back to front
  const vis = _vis; vis.length = 0;
  const bl = W.blds, marg = 8;
  const bx0 = vx0 / TS - marg, bx1 = vx1 / TS + marg, by0 = vy0 / TS - 2, by1 = vy1 / TS + marg;
  drawSurges(ctx, c, z, bx0, by0, bx1, by1);
  drawWalls(ctx, c, z, bx0, by0, bx1, by1);
  // Buildings: auto (drawn close up, small squares far out), on (drawn at every zoom) or off (never)
  const bmode = UI.blds;
  if (bmode !== 'off') for (let k = 0; k < bl.length; k++) { const b = bl[k]; if (b.x > bx0 && b.x < bx1 && b.y > by0 && b.y < by1) vis.push(b); }
  const unit = z / 2;  // screen pixels per sprite pixel
  if (bmode === 'off') { /* hidden */ }
  else if (z >= 0.5 || bmode === 'on') {
    vis.sort((a, b) => (a.y + a.size) - (b.y + b.size));
    for (let k = 0; k < vis.length; k++) {
      const b = vis[k], sx = Math.round((b.x * TS - c.x) * z), sy = Math.round(((b.y + b.size) * TS - c.y) * z);
      const pw = b.size * SPR_PX * unit;
      if (!b.ruin && !b.done) {
        // source art is doubled by refine(): every sprite here has twice as many pixels as it takes up on the art grid
        const site = siteSprite(b.size);
        const sp = buildingSprite(b);
        const f = clamp(b.prog / b.need, 0, 1);
        const hs = sp.height * unit * 0.5;
        if (f > 0.03) { const sh = sp.height * f; ctx.drawImage(sp, 0, sp.height - sh, sp.width, sh, sx, sy - hs * f, sp.width * unit * 0.5, hs * f); }
        ctx.globalAlpha = 0.85; ctx.drawImage(site, sx, sy - pw, pw, pw); ctx.globalAlpha = 1;
      } else {
        const sp = buildingSprite(b);
        const hs = sp.height * unit * 0.5;
        ctx.drawImage(sp, sx, sy - hs, sp.width * unit * 0.5, hs);
        if (b.up >= 0) { const site = siteSprite(b.size); ctx.globalAlpha = 0.6; ctx.drawImage(site, sx, sy - pw, pw, pw); ctx.globalAlpha = 1; }
        const def = b.type === 'house' ? null : BLD[b.type];
        if (def && def.smoke && z >= 1 && !b.ruin) drawSmoke(ctx, b, sx, sy - hs, unit, def.smoke);
      }
    }
  } else {
    const ts = Math.max(1, TS * z), FC = FAR_BLD_COL;
    // one pass per colour, so the canvas changes colour five times rather than once per building
    for (let q = 0; q < FC.length; q++) {
      ctx.fillStyle = FC[q];
      for (let k = 0; k < vis.length; k++) {
        const b = vis[k];
        if ((b.ruin ? 0 : b.type === 'house' ? (b.tier >= 6 ? 1 : b.tier >= 2 ? 2 : 3) : 4) !== q) continue;
        const s = ts * b.size;
        ctx.fillRect((b.x * TS - c.x) * z, (b.y * TS - c.y) * z, s + 0.5, s + 0.5);
      }
    }
  }
  if (typeof drawParked === 'function') drawParked(ctx, c, z, vw, vh);  // parked cars, under the people (parkart.js)
  drawFires(ctx, c, z);
  drawFights(ctx, c, z);
  drawGroundFX(ctx, c, z);
  drawCrowds(ctx, c, z, vw, vh);
  drawPeople(ctx, c, z, vw, vh);
  drawShips(ctx, c, z, vw, vh);
  drawShots(ctx, c, z);
  drawTrains(ctx, c, z);
  drawPlanes(ctx, c, z);
  drawHelis(ctx, c, z);
  drawRockets(ctx, c, z);
  drawSelection(ctx, c, z);
  drawTopFX(ctx, c, z, dt);
  drawBattles(ctx, c, z);
  drawLabels(ctx, c, z, vw, vh);
}
function drawSmoke(ctx, b, sx, sy, unit, kind) {
  const n = kind >= 2 ? 3 : 2, W0 = b.size * SPR_PX * unit;
  const t = Render.time * 0.35 + b.id * 0.137;
  ctx.fillStyle = kind >= 2 ? 'rgba(70,68,66,.5)' : 'rgba(205,200,195,.55)';
  for (let k = 0; k < n; k++) {
    const f = (t + k / n) % 1;
    const r = (1 + f * 2.4) * unit;
    ctx.beginPath();
    ctx.arc(sx + W0 * 0.72 + Math.sin(f * 6 + b.id) * 3 * unit, sy - f * 16 * unit, r, 0, 6.283);
    ctx.fill();
  }
}
// Close up, the forest stands up off the ground as proper trees.
function drawTrees(ctx, c, z, vw, vh) {
  if (z < 1.8 || Render.mode === 'kingdoms') return;
  const w = W.w, tree = W.tree, occ = W.occ, biome = W.biome, temp = W.temp;
  const x0 = Math.max(0, Math.floor(c.x / TS) - 1), x1 = Math.min(w - 1, Math.ceil((c.x + vw / z) / TS) + 1);
  const y0 = Math.max(0, Math.floor(c.y / TS) - 1), y1 = Math.min(W.h - 1, Math.ceil((c.y + vh / z) / TS) + 2);
  const u = z * 0.25;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * w + x, tr = tree[i];
      const pk = W.plant[i];
      if (pk && !occ[i]) {
        const sp = plantSprite(pk, W.plantS[i], (x * 3 + y * 5) % 3), sw = sp.width * u, sh = sp.height * u;
        ctx.drawImage(sp, (x * TS + 3 - c.x) * z - sw / 2, ((y + 1) * TS - c.y) * z - sh, sw, sh);
      }
      if (!tr || occ[i]) continue;
      const b = biome[i];
      const kind = b === B.JUNGLE ? 2 : (b === B.TAIGA || temp[i] < 0.4) ? 1 : (b === B.SAVANNA || b === B.STEPPE) ? 3 : 0;
      const n = tr >= 5 && z >= 3.5 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const v = ((x * 7 + y * 13 + k * 5) >>> 0) % 4;
        const sp = treeSprite(kind, v);
        const jx = hash2(x, y, k + 90) * 0.8 - 0.4, jy = hash2(x, y, k + 91) * 0.6 - 0.3;
        const sc = (tr >= 3 ? 1 : 0.72) * (0.85 + hash2(x, y, k + 92) * 0.3);
        const sw = sp.width * u * sc, sh = sp.height * u * sc;
        const sx = ((x + 0.5 + jx) * TS - c.x) * z - sw / 2, sy = ((y + 0.9 + jy) * TS - c.y) * z - sh;
        ctx.drawImage(sp, sx, sy, sw, sh);
      }
    }
  }
}
function drawHerds(ctx, c, z, vw, vh) {
  // what was killed lies on the ground first
  const C = W.carcasses;
  if (z >= 1) for (let k = 0; k < C.length; k++) {
    const f = C[k], sx = (f.x * TS - c.x) * z, sy = (f.y * TS - c.y) * z;
    if (sx < -40 || sy < -40 || sx > vw + 40 || sy > vh + 40) continue;
    const u = z * 0.25, age = W.tick - f.t;
    ctx.fillStyle = 'rgba(106,20,18,.7)'; ctx.beginPath(); ctx.ellipse(sx, sy + 2 * u, 7 * u, 3 * u, 0, 0, 6.283); ctx.fill();
    if (f.butchered) { ctx.fillStyle = '#e8e0cc'; ctx.fillRect(sx - 4 * u, sy, 8 * u, u); ctx.fillRect(sx - 2 * u, sy - u, u, 3 * u); ctx.fillRect(sx + u, sy - u, u, 3 * u); continue; }
    const sp = animalSprite(f.type, 0), rot = (f.left ? -1 : 1) * Math.min(1, age / 8) * 1.45;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(rot); ctx.drawImage(darkSprite(sp), -sp.width * u / 2, -sp.height * u * 0.7, sp.width * u, sp.height * u); ctx.restore();
  }
  if (z < 0.7) return;
  const close = z >= 1.8;
  const sz = Math.max(1, z * 0.75), u = z * 0.25;
  for (const h of W.herds) {
    const sx = (h.x * TS - c.x) * z, sy = (h.y * TS - c.y) * z;
    if (sx < -60 || sy < -60 || sx > vw + 60 || sy > vh + 60) continue;
    const T = HERD_TYPES[h.type];
    const n = Math.min(h.n, 9), flee = h.flee > W.tick;
    const fr = (Render.time * (flee ? 9 : 2.5)) & 1, left = h.tx < h.x;
    if (!close) ctx.fillStyle = T.color;
    for (let k = 0; k < n; k++) {
      const a = hash2(h.id, k, 1), b = hash2(h.id, k, 2);
      const big = h.type === 2 ? 2 : T.name === 'bears' ? 1.3 : 1;
      const ax = sx + (a - 0.5) * 2.2 * TS * z, ay = sy + (b - 0.5) * 1.9 * TS * z;
      if (close) {
        const sp = animalSprite(h.type, (fr + k) & 1), dw = sp.width * u * (big > 1 ? big * 0.75 : 1), dh = sp.height * u * (big > 1 ? big * 0.75 : 1);
        if (left) { ctx.save(); ctx.translate(ax, 0); ctx.scale(-1, 1); ctx.drawImage(sp, -dw / 2, ay - dh, dw, dh); ctx.restore(); } else ctx.drawImage(sp, ax - dw / 2, ay - dh, dw, dh);
      } else ctx.fillRect(ax, ay, sz * 1.8 * big, sz * big);
    }
  }
}
const SKIN_SIZE = 1;
function drawPeople(ctx, c, z, vw, vh) {
  const P = W.people, close = z >= 1.4, w = W.w, tick = W.tick;
  const t = Render.time;
  // from far away a huge crowd is drawn as a sample: same look, far less work. The sample is chosen by who people are, not where they
  // sit in the list, which shuffles with every birth and death: picked by place, a different crowd was drawn each frame and every dot flashed.
  const stride = !close && P.length > 12000 ? Math.ceil(P.length / 12000) : 1;
  // the same goes for a packed square seen close up: past a couple of thousand on screen, nobody can tell.
  // The level only moves when the crowd has really changed, or people blink as it flips between two levels.
  const want = close && Render.visP > 1800 ? Math.ceil(Render.visP / 1800) : 1, th0 = Render.thin || 1;
  const thin = Render.thin = !close ? 1 : want > th0 || Render.visP < 1800 * (th0 - 1) * 0.85 ? want : th0;
  let seen = 0;
  const u = z * 0.25;
  const x0 = c.x / TS - 2, x1 = (c.x + vw / z) / TS + 2, y0 = c.y / TS - 2, y1 = (c.y + vh / z) / TS + 2;
  const eraOf = p => p.town.polity.era || 0;
  for (let k = 0; k < P.length; k++) {
    const p = P[k];
    if (p.hidden || (stride > 1 && p.id % stride !== 0)) continue;
    const ti = p.ti, tx1 = ti % w, ty1 = (ti / w) | 0;
    if (tx1 < x0 || tx1 > x1 || ty1 < y0 || ty1 > y1) continue;
    seen++;
    if (thin > 1 && p.id % thin !== 0 && !p.leader && UI.follow !== p && !p.btl) continue;
    personPos(p, _pos);
    let sx = (_pos.x - c.x) * z, sy = (_pos.y - c.y) * z;
    const onWater = W.water[ti] !== 0;
    const armed = p.btl || p.army;
    const col = p.sick > 0 ? '#9ccf4a' : armed || p.job === J.SOLDIER ? p.town.polity.color : JOB_COLOR[p.job];
    if (!close) {
      // dots are gathered by colour and drawn together below: one colour change per colour instead of one per person
      if (onWater && z >= 0.6) _dotBoat.push(sx, sy);
      let D = _dots.get(col); if (!D) { D = []; _dots.set(col, D); }
      D.push(sx, sy);
      continue;
    }
    if (onWater) { drawBoat(ctx, p, sx, sy, z); continue; }
    // someone in a fight: their colour at their feet, a lunge when they strike, a flinch when they're hit, a line to whoever they're fighting
    const age = tick - p.atkT, hurt = tick - p.hitT;
    if (armed) {
      const flee = p.flee;
      ctx.fillStyle = col; ctx.globalAlpha = p.btl ? 0.75 : 0.5;
      ctx.beginPath(); ctx.ellipse(sx, sy + u, 4.5 * u * (p.mount ? 1.8 : 1), 2.2 * u, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      // a short bright line to whoever they're fighting; for missile troops, a brief thin one
      if (p.btl && p.foe && age < 12 && p.foe.alive) {
        const near = Math.abs(p.foe.ti % w - tx1) <= 2 && Math.abs(((p.foe.ti / w) | 0) - ty1) <= 2;
        if (near || age < 4) {
          personPos(p.foe, _pos2);
          ctx.strokeStyle = col; ctx.globalAlpha = (1 - age / 12) * (near ? 0.85 : 0.22); ctx.lineWidth = Math.max(1, z * (near ? 0.3 : 0.15));
          ctx.beginPath(); ctx.moveTo(sx, sy - 6 * u); ctx.lineTo((_pos2.x - c.x) * z, (_pos2.y - c.y) * z - 6 * u); ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }
    if (age < 7 && (p.btl || p.task === T_HUNT)) {
      const w0 = WEAPONS[p.wep || 0], melee = p.btl ? w0.kind === 0 || (p.foe && Math.abs(p.fx - tx1) <= 1 && Math.abs(p.fy - ty1) <= 1) : false;
      const dx = p.fx - tx1, dy = p.fy - ty1, d = Math.max(0.5, Math.hypot(dx, dy)), reach = (melee ? 3.2 : 0.8) * u * Math.sin(age / 7 * Math.PI);
      sx += dx / d * reach * 2; sy += dy / d * reach;
    }
    if (hurt < 5) { const dx = p.foe ? tx1 - p.foe.ti % w : -p.face, q = (5 - hurt) * u * 0.4; sx += Math.sign(dx) * q; }
    if (p.st === 1 && p.job > J.ELDER && !p.army && drawVehicle(ctx, p, ti, sx, sy, z, (p.nt % w) < (ti % w))) continue;
    const walking = p.st === 1;
    const fighting = age < 6;
    const working = p.st === 2 && !p.hidden;
    const frame = fighting ? 3 : walking ? (((t * (p.flee ? 12 : 6) + p.id * 0.37) | 0) % 2 + 1) : working && ((t * 3 + p.id * 0.31) | 0) % 2 ? 3 : 0;
    const job = armed ? J.SOLDIER : p.job;
    const sp = personSprite(p.culture.skin, p.id % HAIRS.length, p.sex, job, p.down ? 0 : frame, eraOf(p), p.job === J.CHILD, p.wep || 0, p.arm || 0, job === J.SOLDIER ? toHexRgb(p.town.polity.color) : '#888888', p.mount || 0, p.leader, p.carry > 0 ? p.ctype : -1);
    const dw = sp.width * u, dh = sp.height * u;
    // in a fight, they face their enemy; anywhere else, the way they're walking
    const left = p.down ? p.face < 0 : (armed && p.btl) || p.task === T_HUNT ? (walking ? (p.nt % w) < (ti % w) : p.face < 0) : walking && (p.nt % w) < (ti % w);
    const yy = sy - sp.footY * u;
    if (p.down) {  // lying where they fell, still breathing
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(left ? -1.5 : 1.5); ctx.drawImage(darkSprite(sp), -sp.footX * u, -sp.footY * u, dw, dh); ctx.restore();
      continue;
    }
    if (left) { ctx.save(); ctx.translate(sx, 0); ctx.scale(-1, 1); ctx.drawImage(sp, -sp.footX * u, yy, dw, dh); if (hurt < 3) { ctx.globalAlpha = 0.8; ctx.drawImage(flashSprite(sp), -sp.footX * u, yy, dw, dh); ctx.globalAlpha = 1; } ctx.restore(); }
    else { ctx.drawImage(sp, sx - sp.footX * u, yy, dw, dh); if (hurt < 3) { ctx.globalAlpha = 0.8; ctx.drawImage(flashSprite(sp), sx - sp.footX * u, yy, dw, dh); ctx.globalAlpha = 1; } }
    if (age < 5 && p.btl && WEAPONS[p.wep || 0].kind === 0) {  // the swing itself
      const f = age / 5, dir = left ? -1 : 1, ax = sx + dir * 5 * u, ay = sy - 9 * u, r0 = (WEAPONS[p.wep || 0].rng > 2 ? 11 : 8) * u;
      ctx.strokeStyle = `rgba(255,250,235,${0.85 * (1 - f)})`; ctx.lineWidth = Math.max(1, z * 0.5);
      ctx.beginPath();
      if (dir > 0) ctx.arc(ax, ay, r0, -1.4 + f * 1.6, -0.2 + f * 1.8); else ctx.arc(ax, ay, r0, Math.PI + 0.2 - f * 1.8, Math.PI + 1.4 - f * 1.6);
      ctx.stroke();
    }
    if (p.btl && z >= 1.8 && p.hp < maxHP(p)) { const m = maxHP(p), f = clamp(p.hp / m, 0, 1), bw = 7 * u + 2; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(sx - bw / 2 - 0.5, yy - 3.5, bw + 1, 3); ctx.fillStyle = f > 0.5 ? '#7fd06a' : f > 0.25 ? '#e6c170' : '#e0705a'; ctx.fillRect(sx - bw / 2, yy - 3, bw * f, 2); }
    if (p.flee && z >= 1.6) { ctx.fillStyle = '#f4f1de'; ctx.fillRect(sx + 3 * u, yy - 2 * u, 3 * u, 2 * u); ctx.fillStyle = '#2a2622'; ctx.fillRect(sx + 2.5 * u, yy - 2.5 * u, 0.7 * u, 5 * u); }
    if (p.unit && p.unit.cap === p && z >= 2) { ctx.fillStyle = '#ffd34d'; ctx.fillRect(sx - u, yy - 1.5 * u, 2 * u, 1.5 * u); }
  }
  if (!close) {
    if (_dotBoat.length) { ctx.fillStyle = '#6b4a2a'; for (let k = 0; k < _dotBoat.length; k += 2) ctx.fillRect(_dotBoat[k] - 2, _dotBoat[k + 1], 4, 2); _dotBoat.length = 0; }
    const s = z < 0.7 ? 1 : 2;
    for (const [col, D] of _dots) { if (!D.length) continue; ctx.fillStyle = col; for (let k = 0; k < D.length; k += 2) ctx.fillRect(D[k], D[k + 1], s, s); D.length = 0; }
  }
  Render.visP = seen;
}
const _dots = new Map(), _dotBoat = [];
const _pos2 = { x: 0, y: 0 };
const _vehSlot = new Map();  // filled by drawVehicle while people are drawn, emptied by drawShips once they're done
// Anyone travelling by more than their feet, in whatever their town has got to by now. Returns false for those on foot.
function drawVehicle(ctx, p, ti, x, y, z, left) {
  const t = p.town, tr = t.trans, lv = W.road[ti];
  const rail = W.rail[ti] && t.mod.rail;
  if (!rail && !(tr >= 4 && lv >= 3) && !(tr >= 2 && tr <= 3 && lv >= 2)) return false;
  // a road this vehicle may not use (a footpath, a pedestrian street, a busway for a car): it's parked, and they walk
  const rt = W.rtype ? W.rtype[ti] : 0;
  if (!rail && rt && RT_COST[tr & 7][rt] < 0) return false;
  const c0 = Render.cam, h = (p.id * 0.6180339) % 1;
  // only those who own a car drive one; the rest walk, or a few of them stand for a bus or tram full of people on a road that carries one
  let tr2 = tr;
  if (!rail && tr >= 5 && !p.car) { if (h < 0.1 && knows(t, 'motorbus') && (!rt || RT_COST[4][rt] >= 0)) tr2 = 4; else return false; }
  else if (!rail && tr === 4 && h >= 0.25) return false;
  const kind = rail ? 'train' : vehicleKind(t, tr2, h);
  const col = rail ? (t.tech[TECH_IX.hsr] ? '#efefef' : t.tech[TECH_IX.electricrail] ? '#3a5a7a' : '#8a3b30') : kind === 'oxcart' && p.carry > 0 ? carryCol(p.ctype) : vehicleColour(kind, h, t.polity);
  // on a planned road: on the curve, in its lane, turned the way the road runs
  let wx = x / z + c0.x, wy = y / z + c0.y, ang;
  if (!rail && rt && roadSnap(ti, wx, wy, left)) { wx = _snap.x; wy = _snap.y; ang = _snap.ang; }
  else {
    // on a worn-in street: the way they're heading, queued one length behind whoever is ahead on the same tile, keeping to their side
    const w = W.w, nt = p.nt >= 0 ? p.nt : ti;
    ang = nt !== ti ? Math.atan2(((nt / w) | 0) - ((ti / w) | 0), nt % w - ti % w) : (left ? Math.PI : 0);
    const key = ti * 8 + (((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8), n = _vehSlot.get(key) || 0;
    if (n >= 4) return true;  // a jam: the rest are hidden in it
    _vehSlot.set(key, n + 1);
    const gap = ((VEH_SIZE[kind] || VEH_SIZE.sedan)[0] + 2) / 4, side = rail ? 0 : 0.55;
    wx += -Math.cos(ang) * gap * n - Math.sin(ang) * side; wy += -Math.sin(ang) * gap * n + Math.cos(ang) * side;
  }
  ctx.save(); ctx.setTransform(z, 0, 0, z, -c0.x * z, -c0.y * z);
  ctx.imageSmoothingEnabled = z < 3;
  drawVehicleSprite(ctx, wx, wy, ang, kind, col);
  ctx.restore();
  return true;
}
// Past what can be run person by person, the rest of the city still fills the streets. These are only pictures: they walk the road tiles and do nothing else.
function drawCrowds(ctx, c, z, vw, vh) {
  if (z < 1.4 || !W.folkN) return;
  const u = z * 0.25, now = Render.time;
  for (const t of W.towns) {
    if (t.folk < 20 || !t.sRoad.length) continue;
    const sx = (t.x * TS - c.x) * z, sy = (t.y * TS - c.y) * z, rad = (t.radius + 8) * TS * z;
    if (sx < -rad || sy < -rad || sx > vw + rad || sy > vh + rad) continue;
    const L = t.sRoad, n = Math.min(450, L.length * 3, Math.floor(t.folk / 8));
    const col = toHexRgb(t.polity.color), era = t.polity.era || 0;
    for (let k = 0; k < n; k++) {
      const i = L[(k * 7919) % L.length], tx1 = i % W.w, ty1 = (i / W.w) | 0;
      const h = hash2(tx1, ty1, k), sp0 = 0.25 + h * 0.35, ph = now * sp0 + h * 6.283, off = Math.sin(ph) * 0.45;
      const x = ((tx1 + 0.5 + (k & 1 ? off : (h - 0.5) * 0.7)) * TS - c.x) * z, y = ((ty1 + 0.5 + (k & 1 ? (h - 0.5) * 0.7 : off)) * TS - c.y) * z;
      if (x < -20 || y < -20 || x > vw + 20 || y > vh + 20) continue;
      const job = 3 + (k % 14);
      const sp = personSprite(t.culture.skin, k % HAIRS.length, k & 1, job, ((now * 5 + k) | 0) % 2 + 1, era, k % 7 === 0, 0, 0, col, 0, false, -1);
      ctx.drawImage(sp, x - sp.footX * u, y - sp.footY * u, sp.width * u, sp.height * u);
    }
  }
}
function carryCol(r) { return r === R.FOOD ? '#d8b24a' : r === R.WOOD ? '#8a6238' : r === R.STONE ? '#a0a0a0' : r === R.CLAY ? '#b5714a' : r <= R.COAL ? '#55585f' : '#c9a14a'; }
// A fishing boat or skiff from the town's wharf, with its crew aboard.
function drawBoat(ctx, p, x, y, z) {
  const u = z * 0.25;
  const m = p.town.mod, modern = m.rail || m.car;
  ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x - 12 * u, y + 2 * u, 24 * u, u);
  ctx.fillStyle = modern ? '#3a3d42' : '#6b4a2c'; ctx.fillRect(x - 10 * u, y - u, 20 * u, 3 * u);
  ctx.fillStyle = modern ? '#55595f' : '#8a6238'; ctx.fillRect(x - 10 * u, y - u, 20 * u, u);
  if (modern) { ctx.fillStyle = '#e8e8e0'; ctx.fillRect(x - 2 * u, y - 5 * u, 6 * u, 4 * u); }
  else if (knows(p.town, 'sailing')) { ctx.fillStyle = '#46301c'; ctx.fillRect(x, y - 10 * u, u, 10 * u); ctx.fillStyle = '#efe7d3'; ctx.fillRect(x + u, y - 10 * u, 6 * u, 7 * u); }
  ctx.fillStyle = JOB_COLOR[p.job]; ctx.fillRect(x - 5 * u, y - 4 * u, 3 * u, 3 * u);
  ctx.fillStyle = p.culture.skin; ctx.fillRect(x - 5 * u, y - 6 * u, 3 * u, 2 * u);
}
function shipPos(s, out) {
  const w = W.w, a = s.at, b = s.state === 1 ? s.nx : a, f = s.state === 1 ? s.frac : 0;
  let x = a % w + wdx(a % w, b % w) * f + 0.5, y = ((a / w) | 0) + (((b / w) | 0) - ((a / w) | 0)) * f + 0.5;  // over the date line, the short way
  // alongside: hard up against the quay
  if (s.state !== 1 && s.berth && s.berth.i === a) { x += s.berth.qx * 0.42; y += s.berth.qy * 0.42; }
  // warping in to a berth or out to a mooring: eased across from where it was
  if (s.mvT !== undefined && s.state !== 1) {
    const e = (W.tick - s.mvT) / SHIP_WARP;
    if (e < 1) { const q = e * e * (3 - 2 * e), ax = s.mvA % w + 0.5, ay = ((s.mvA / w) | 0) + 0.5; x = ax + (x - ax) * q; y = ay + (y - ay) * q; }
  }
  out.x = x * TS; out.y = y * TS;
  return out;
}
const SHIP_WARP = 14;  // ticks a ship takes to come alongside or move to a mooring
function drawShips(ctx, c, z, vw, vh) {
  _vehSlot.clear();  // drawn after the people: the road traffic queues start afresh next frame
  drawBoatStores(ctx, c, z, vw, vh);
  drawBoatRuns(ctx, c, z, vw, vh);
  const S0 = W.ships; if (!S0.length) return;
  const u = Math.max(z * 0.25, 0.42), now = W.tick;
  ctx.imageSmoothingEnabled = u < 1;
  for (let k = 0; k < S0.length; k++) {
    const s = S0[k];
    shipPos(s, _pos);
    let sx = (_pos.x - c.x) * z, sy = (_pos.y - c.y) * z;
    if (sx < -100 || sy < -40 || sx > vw + 100 || sy > vh + 40) continue;
    if (z < 0.7) { const L0 = s.kind === 'war' ? 0 : (MERCHANTMEN[s.type].len || 0); ctx.fillStyle = s.kind === 'war' ? '#d63b3b' : '#f0e6c8'; ctx.fillRect(sx - 1 - (L0 ? 2 : 0), sy - 1, L0 ? 7 : 3, 2); continue; }
    // a ship keeps facing the way it last sailed; lying still it doesn't spin round
    if (s.state === 1 && s.nx !== s.at) { const d = wdx(s.at % W.w, s.nx % W.w); if (d) s.faceL = d < 0 ? 1 : 0; }
    const left = !!s.faceL, moving = s.state === 1;
    const along = s.state === 2 || (s.state === 0 && s.berth && s.berth.i === s.at);
    // at anchor or on a mooring it rides the swell a little; alongside it sits still against the fenders
    if (!moving && !along) sy += Math.sin(now * 0.07 + s.id) * 0.6 * u;
    const sp = shipSprite(s.kind, s.type, toHexRgb(s.pol.color), left);
    const dw = sp.width * u, dh = sp.height * u;
    if (moving) {  // wake behind the hull
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      const dir = left ? 1 : -1;
      ctx.fillRect(sx + dir * dw * 0.45 - (left ? 0 : dw * 0.5), sy + 2 * u, dw * 0.5, 2 * u);
    } else if (s.mvT !== undefined && now - s.mvT < SHIP_WARP) {  // churned water while it warps in or out
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(sx - dw * 0.4, sy + 2 * u, dw * 0.8, 1.5 * u);
    }
    if (s.state === 3 && !along) {  // anchor chain down into the water
      ctx.strokeStyle = 'rgba(40,40,40,.55)'; ctx.lineWidth = Math.max(1, u * 0.7);
      const ax = sx + (left ? -1 : 1) * dw * 0.38; ctx.beginPath(); ctx.moveTo(ax, sy - 2 * u); ctx.lineTo(ax + (left ? -1 : 1) * 4 * u, sy + 4 * u); ctx.stroke();
    }
    ctx.drawImage(sp, sx - dw / 2, sy - dh * 0.82, dw, dh);
    if (along && s.berth) drawAlongside(ctx, s, sx, sy, dw, dh, u, now);
    if (Render.sel && Render.sel.obj === s) { ctx.strokeStyle = '#ffe28a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy - dh * 0.3, Math.max(dw * 0.6, 9), 0, 6.283); ctx.stroke(); }
  }
  ctx.imageSmoothingEnabled = z < 4;
}
// Made fast to the quay: mooring lines fore and aft, and while the dock gang works, the cargo going ashore or aboard:
// sacks and barrels carried over a gangway at first, then swung over by a crane, then whole boxes under a gantry.
function drawAlongside(ctx, s, sx, sy, dw, dh, u, now) {
  const x = s.berth, qx = x.qx, qy = x.qy;
  const kx = qx * 6 * u, ky = qy * 6 * u;  // towards the quay
  ctx.strokeStyle = 'rgba(230,220,190,.75)'; ctx.lineWidth = Math.max(1, u * 0.6);
  ctx.beginPath();
  ctx.moveTo(sx - dw * 0.4, sy - 2 * u); ctx.lineTo(sx - dw * 0.48 + kx, sy - 2 * u + ky);
  ctx.moveTo(sx + dw * 0.4, sy - 2 * u); ctx.lineTo(sx + dw * 0.48 + kx, sy - 2 * u + ky);
  ctx.stroke();
  if (s.state !== 2 || s.hph == null || W.tick >= s.hDone) return;
  const D = shipDef(s), era = BLD[x.b.type] ? BLD[x.b.type].era || 0 : 0;
  const ashore = s.hph !== 'load' && s.hph !== 'reload';  // unloading carries things off the ship
  let r = 0; for (let q = 1; q < R.N; q++) if (s.cargo[q] > s.cargo[r]) r = q;
  const col = s.load > 0 ? carryCol(r) : '#c9a14a';
  const deck = { x: sx, y: sy - dh * 0.35 }, quay = { x: sx + kx * 2.2, y: sy - 2 * u + ky * 2.2 };
  if (era >= 7 && (D.ck === 'box' || x.ck.includes('box'))) {
    // a gantry crane straddling the quay, its trolley running out over the ship
    const gx = sx + Math.sin(now * 0.05 + s.id) * dw * 0.3, top = Math.min(quay.y, deck.y) - 16 * u;
    ctx.fillStyle = '#d8a53a';
    ctx.fillRect(gx - 1.5 * u, top, 3 * u, quay.y - top); ctx.fillRect(gx - 1.5 * u + kx * 1.4, top, 3 * u, quay.y - top);
    ctx.fillRect(gx - 4 * u - Math.abs(kx), top - 2 * u, Math.abs(kx) * 2.4 + 8 * u, 2 * u);
    const ph = (now * 0.04 + s.id * 0.3) % 1, t0 = ashore ? ph : 1 - ph;
    const bx = deck.x + (quay.x - deck.x) * t0 + (gx - sx) * 0.5, by = top + 2 * u + Math.sin(t0 * Math.PI) * -1 * u + (t0 < 0.2 || t0 > 0.8 ? 10 * u : 4 * u);
    ctx.strokeStyle = 'rgba(40,40,40,.6)'; ctx.lineWidth = Math.max(1, u * 0.5); ctx.beginPath(); ctx.moveTo(bx + 1.5 * u, top); ctx.lineTo(bx + 1.5 * u, by); ctx.stroke();
    ctx.fillStyle = ['#c8452f', '#3a7fb5', '#d8a53a', '#4fa35e'][(s.id + ((now * 0.04) | 0)) & 3]; ctx.fillRect(bx - u, by, 5 * u, 2.5 * u);
    return;
  }
  if (x.crane) {
    // a crane on the quay swings its jib out over the hold: lift, across, down
    const ph = (now * 0.03 + s.id * 0.37) % 1, t0 = ashore ? ph : 1 - ph;
    const px = quay.x, py = quay.y;
    const tipX = deck.x + (px - deck.x) * t0, tipY = Math.min(py, deck.y) - 12 * u;
    ctx.strokeStyle = era >= 6 ? '#3a3d42' : '#5e4527'; ctx.lineWidth = Math.max(1, u);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, tipY + 2 * u); ctx.lineTo(tipX, tipY); ctx.stroke();
    const hookY = tipY + (t0 < 0.15 || t0 > 0.85 ? 9 * u : 3 * u);
    ctx.strokeStyle = 'rgba(40,40,40,.6)'; ctx.lineWidth = Math.max(1, u * 0.5); ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.lineTo(tipX, hookY); ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(tipX - 1.5 * u, hookY, 3 * u, 2.5 * u);
    return;
  }
  // by hand: porters over the gangway with sacks and barrels
  ctx.strokeStyle = 'rgba(120,90,50,.9)'; ctx.lineWidth = Math.max(1, u * 1.2);
  ctx.beginPath(); ctx.moveTo(deck.x, deck.y + 4 * u); ctx.lineTo(quay.x, quay.y); ctx.stroke();
  for (let q = 0; q < 3; q++) {
    const ph = (now * 0.035 + q / 3 + s.id * 0.1) % 1, t0 = ashore ? ph : 1 - ph;
    const px = deck.x + (quay.x - deck.x) * t0, py = deck.y + 4 * u + (quay.y - deck.y - 4 * u) * t0 - 3 * u;
    ctx.fillStyle = '#5a4630'; ctx.fillRect(px - 0.7 * u, py, 1.4 * u, 3 * u);
    ctx.fillStyle = col; ctx.fillRect(px - 1.3 * u, py - 2.2 * u, 2.6 * u, 2.2 * u);
  }
}
// The boats a town owns, pulled up beside the boathouse or jetty where they are kept.
function drawBoatStores(ctx, c, z, vw, vh) {
  if (z < 0.9 || typeof boatStore !== 'function') return;
  const u = z * 0.25;
  for (const t of W.towns) {
    if (!t.alive || !(t.boats > 0)) continue;
    const sx0 = (t.x * TS - c.x) * z, sy0 = (t.y * TS - c.y) * z;
    if (sx0 < -300 || sy0 < -300 || sx0 > vw + 300 || sy0 > vh + 300) continue;
    const b = boatStore(t);
    if (!b) continue;
    const free = Math.min(8, Math.max(0, t.boats - (t.boatsOut || 0)));
    const modern = t.mod.rail || t.mod.car;
    for (let k = 0; k < free; k++) {
      const bx = ((b.x + (k % 4) * 0.5 + 0.1) * TS - c.x) * z, by = ((b.y + b.size + 0.15 + ((k / 4) | 0) * 0.45) * TS - c.y) * z;
      ctx.fillStyle = modern ? '#e8e8e0' : '#6b4a2c'; ctx.fillRect(bx, by, 9 * u, 2.5 * u);
      ctx.fillStyle = modern ? '#3f6a84' : '#8a6238'; ctx.fillRect(bx + u, by, 7 * u, u);
    }
  }
}
// Boats bought from another town on their way over: on a cart by road, or rowed along the coast in a string.
function drawBoatRuns(ctx, c, z, vw, vh) {
  const R0 = W.boatRuns;
  if (!R0 || !R0.length || z < 0.7) return;
  const u = z * 0.25;
  for (const r of R0) {
    const k = Math.floor(r.k), f = r.k - k, a = r.path[k], b = r.path[Math.min(k + 1, r.path.length - 1)];
    const x = ((a % W.w + (b % W.w - a % W.w) * f + 0.5) * TS - c.x) * z, y = ((((a / W.w) | 0) + (((b / W.w) | 0) - ((a / W.w) | 0)) * f + 0.5) * TS - c.y) * z;
    if (x < -40 || y < -40 || x > vw + 40 || y > vh + 40) continue;
    if (r.sea) {
      for (let q = 0; q < Math.min(4, r.n); q++) { ctx.fillStyle = '#6b4a2c'; ctx.fillRect(x - q * 10 * u, y + Math.sin(W.tick * 0.2 + q) * u, 8 * u, 2.5 * u); }
      ctx.fillStyle = r.pol; ctx.fillRect(x + 2 * u, y - 4 * u, 2 * u, 3 * u);
    } else {
      ctx.fillStyle = '#5a4630'; ctx.fillRect(x - 5 * u, y - 2 * u, 10 * u, 3 * u);
      ctx.fillStyle = '#2a2420'; ctx.fillRect(x - 4 * u, y + u, 2 * u, 2 * u); ctx.fillRect(x + 2 * u, y + u, 2 * u, 2 * u);
      ctx.fillStyle = '#8a6238'; ctx.fillRect(x - 6 * u, y - 5 * u, 12 * u, 2.5 * u);
      ctx.fillStyle = '#6b5a3a'; ctx.fillRect(x + 6 * u, y - u, 4 * u, 3 * u);  // the ox or horse in front
    }
  }
}
function drawFires(ctx, c, z) {
  if (!W.fires || !W.fires.length) return;
  const now = W.tick, F = W.fires;
  for (let k = F.length - 1; k >= 0; k--) {
    const f = F[k], age = now - f.t;
    if (age > 70) { F.splice(k, 1); continue; }
    const sx = ((f.x + 0.5) * TS - c.x) * z, sy = ((f.y + 0.5) * TS - c.y) * z;
    for (let q = 0; q < 4; q++) {
      const v = (age + q * 7) % 16 / 16;
      ctx.fillStyle = q % 2 ? 'rgba(255,170,50,.8)' : 'rgba(230,70,30,.75)';
      ctx.beginPath(); ctx.arc(sx + (hash2(f.x, q, 2) - 0.5) * 6 * z, sy - v * 9 * z, (1.4 - v) * 1.6 * z, 0, 6.283); ctx.fill();
    }
  }
}
function drawRails() {}
// Locomotives, coaches and wagons, each following the track (railart.js).
function drawTrains(ctx, c, z) { drawTrainSets(ctx, c, z); }
// Airliners: a shadow on the ground that slides away as the plane climbs, the plane a little bigger the higher it is, and a plane
// or two parked on the apron of any field that has seen traffic lately. From far away, only dots.
const _pp = { x: 0, y: 0, a: 0, h: 0 };
function drawOnePlane(ctx, kind, col, sx, sy, ang, h, z) {
  const u = Math.max(z * 0.25, 0.35) * (1 + h / 110), sp = planeSprite(kind, col, false), sh = planeSprite(kind, col, true), w = sp.width * (sp.k || 1) * u;
  ctx.globalAlpha = 0.24 - Math.min(h, 30) * 0.004;
  ctx.save(); ctx.translate(sx + h * z * 0.3, sy + h * z * 0.08); ctx.rotate(ang); ctx.drawImage(sh, -w / 2, -w / 2, w, w); ctx.restore();
  ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(sx, sy - h * z); ctx.rotate(ang); ctx.drawImage(sp, -w / 2, -w / 2, w, w); ctx.restore();
}
function drawPlanes(ctx, c, z) {
  if (!W.planes || typeof flightPose === 'undefined') return;
  const vw = ctx.canvas.width, vh = ctx.canvas.height;
  if (z >= 0.7) {
    const A = airportsNow();
    for (const ap of A) {
      const t = ap.t;
      if (!(W.tick - (t.airLast || -1e9) < TPY * 2)) continue;
      const sx = (ap.ax * TS - c.x) * z, sy = (ap.ay * TS - c.y) * z;
      if (sx < -60 || sy < -60 || sx > vw + 60 || sy > vh + 60) continue;
      const col = toHexRgb(t.polity.color), kind = ap.big && knows(t, 'jetliners') ? 1 : 0;
      drawOnePlane(ctx, kind, col, sx, sy, Math.PI, 0, z);
      if (ap.bx >= 0 && W.tick - t.airLast < TPY / 2) drawOnePlane(ctx, kind, col, (ap.bx * TS - c.x) * z, sy, Math.PI, 0, z);
    }
  }
  for (const f of W.planes) {
    if (f.p === undefined) continue;
    flightPose(f, _pp);
    const sx = (_pp.x * TS - c.x) * z, sy = (_pp.y * TS - c.y) * z;
    if (sx < -60 || sy < -60 || sx > vw + 60 || sy > vh + 60 + _pp.h * z) continue;
    if (z < 0.7) { ctx.fillStyle = '#f4f6f8'; ctx.fillRect(sx - 1, sy - _pp.h * z - 1, 2, 2); continue; }
    const pol = W.polities[f.pol];
    drawOnePlane(ctx, f.kind, toHexRgb(pol ? pol.color : '#c2453f'), sx, sy, _pp.a, _pp.h, z);
  }
}
// Helicopters circle any town with a helipad; drones buzz over towns with a drone hangar.
function drawHelis(ctx, c, z) {
  const u = Math.max(1, z * 0.6), now = Render.time;
  for (const t of W.towns) {
    const n = (t.count.heliport || 0) + (t.count.dronebase || 0);
    if (!n) continue;
    const sx0 = (t.x * TS - c.x) * z, sy0 = (t.y * TS - c.y) * z;
    if (sx0 < -200 || sy0 < -200 || sx0 > ctx.canvas.width + 200 || sy0 > ctx.canvas.height + 200) continue;
    for (let k = 0; k < Math.min(n, 3); k++) {
      const drone = k >= (t.count.heliport || 0), a = now * (drone ? 0.9 : 0.45) + t.id * 1.7 + k * 2.1;
      const sx = sx0 + Math.cos(a) * (drone ? 5 : 8) * TS * z * 0.5, sy = sy0 + Math.sin(a) * (drone ? 3.5 : 5) * TS * z * 0.5, h = (drone ? 16 : 22) * z;
      // a soft shadow on the ground under it
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(sx + h * 0.25, sy, (drone ? 2.2 : 3.4) * u, (drone ? 1.2 : 1.5) * u, 0, 0, 6.283); ctx.fill();
      ctx.save(); ctx.translate(sx, sy - h); ctx.rotate(a + 1.571);
      if (drone) {
        // a quadcopter: an X of arms, a rotor blur at each tip, a little body with a camera
        ctx.strokeStyle = '#3a3d42'; ctx.lineWidth = Math.max(0.8, 0.45 * u);
        ctx.beginPath(); ctx.moveTo(-1.6 * u, -1.6 * u); ctx.lineTo(1.6 * u, 1.6 * u); ctx.moveTo(1.6 * u, -1.6 * u); ctx.lineTo(-1.6 * u, 1.6 * u); ctx.stroke();
        ctx.fillStyle = 'rgba(200,210,220,.35)'; for (const [dx, dy] of [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]]) { ctx.beginPath(); ctx.arc(dx * u, dy * u, 1.1 * u, 0, 6.283); ctx.fill(); }
        ctx.fillStyle = '#55595f'; ctx.fillRect(-0.8 * u, -0.8 * u, 1.6 * u, 1.6 * u); ctx.fillStyle = '#e04a3a'; ctx.fillRect(0.5 * u, -0.25 * u, 0.4 * u, 0.5 * u);
      } else {
        const col = t.polity ? toHexRgb(t.polity.color) : '#3a3f46';
        // tail boom and tail rotor, then the cabin: rounded, shaded, a glass nose
        ctx.fillStyle = shadeHex(col, -0.25); ctx.fillRect(1 * u, -0.28 * u, 4.2 * u, 0.56 * u);
        ctx.fillStyle = 'rgba(60,60,64,.55)'; ctx.fillRect(4.9 * u, -1.1 * u, 0.35 * u, 2.2 * u);
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(-0.4 * u, 0, 2.1 * u, 1.25 * u, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = shadeHex(col, 0.3); ctx.beginPath(); ctx.ellipse(-0.6 * u, -0.45 * u, 1.4 * u, 0.45 * u, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#2a3846'; ctx.beginPath(); ctx.ellipse(-1.8 * u, 0, 0.8 * u, 0.9 * u, 0, 0, 6.283); ctx.fill();
        // the main rotor: a pale disc of blur with two blades turning in it
        ctx.fillStyle = 'rgba(220,226,232,.18)'; ctx.beginPath(); ctx.arc(-0.2 * u, 0, 4.6 * u, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(40,42,46,.55)'; ctx.lineWidth = Math.max(0.8, u * 0.3); const r = now * 30;
        ctx.beginPath(); ctx.moveTo(-0.2 * u + Math.cos(r) * 4.4 * u, Math.sin(r) * 4.4 * u); ctx.lineTo(-0.2 * u - Math.cos(r) * 4.4 * u, -Math.sin(r) * 4.4 * u);
        ctx.moveTo(-0.2 * u + Math.cos(r + 1.571) * 4.4 * u, Math.sin(r + 1.571) * 4.4 * u); ctx.lineTo(-0.2 * u - Math.cos(r + 1.571) * 4.4 * u, -Math.sin(r + 1.571) * 4.4 * u); ctx.stroke();
        ctx.fillStyle = '#2a2c30'; ctx.beginPath(); ctx.arc(-0.2 * u, 0, 0.45 * u, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }
  }
}
// Storm-surge water lying over the low ground until it drains, fading as it goes.
function drawSurges(ctx, c, z, x0, y0, x1, y1) {
  if (!W.surges || !W.surges.length) return;
  const s0 = TS * z;
  for (const s of W.surges) {
    const left = s.until - W.tick;
    ctx.fillStyle = `rgba(70,120,160,${clamp(left / 40, 0.2, 0.62)})`;
    for (const i of s.tiles) {
      const x = i % W.w, y = (i / W.w) | 0;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      ctx.fillRect((x * TS - c.x) * z, (y * TS - c.y) * z, s0 + 0.5, s0 + 0.5);
    }
  }
}
function drawRockets(ctx, c, z) {
  if (!W.rockets) return;
  for (let k = W.rockets.length - 1; k >= 0; k--) {
    const r = W.rockets[k], age = (W.tick - r.t0);
    if (age > 500) { W.rockets.splice(k, 1); continue; }
    const sx = ((r.x + 1) * TS - c.x) * z, sy = ((r.y + 1) * TS - c.y) * z - age * age * 0.006 * z;
    ctx.fillStyle = '#efefef'; ctx.fillRect(sx - 2 * z, sy - 8 * z, 4 * z, 8 * z);
    ctx.fillStyle = '#ffb545'; ctx.fillRect(sx - 1.5 * z, sy, 3 * z, (3 + (age % 4)) * z);
    ctx.fillStyle = 'rgba(230,230,230,.35)'; ctx.fillRect(sx - 2 * z, sy + 5 * z, 4 * z, Math.min(age * z, 900));
  }
}
function drawFights(ctx, c, z) {
  if (!W.fights) return;
  for (const f of W.fights) {
    const age = W.tick - f.t;
    if (age > 22) continue;
    for (let k = 0; k < 6; k++) {
      const a = hash2(f.t, k, 3) * 6.283, d = hash2(f.t, k, 4) * 26 * z;
      ctx.fillStyle = k % 2 ? '#ffcf4a' : '#ff5a3a';
      ctx.fillRect((f.x * TS - c.x) * z + Math.cos(a) * d, (f.y * TS - c.y) * z + Math.sin(a) * d, Math.max(2, z), Math.max(2, z));
    }
  }
}
function drawSelection(ctx, c, z) {
  const s = Render.sel;
  if (!s) return;
  ctx.lineWidth = 2; ctx.strokeStyle = '#ffe28a';
  if (s.kind === 'person' && s.obj.alive) {
    if (s.obj.aboard) shipPos(s.obj.aboard, _pos); else personPos(s.obj, _pos);
    const sx = (_pos.x - c.x) * z, sy = (_pos.y - c.y) * z;
    ctx.beginPath(); ctx.arc(sx + z * 0.5, sy, Math.max(7, 4 * z), 0, 6.283); ctx.stroke();
    // show where they're headed
    const p = s.obj;
    if (p.st === 1 && p.path && p.pi < 4000) {
      ctx.strokeStyle = 'rgba(255,226,138,.6)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(sx, sy);
      for (let k = p.pi + 1; k < p.path.length; k += 1) { const i = p.path[k]; ctx.lineTo(((i % W.w + 0.5) * TS - c.x) * z, ((((i / W.w) | 0) + 0.5) * TS - c.y) * z); }
      ctx.stroke(); ctx.setLineDash([]);
    }
  } else if (s.kind === 'building') {
    const b = s.obj;
    ctx.strokeRect((b.x * TS - c.x) * z, (b.y * TS - c.y) * z, b.size * TS * z, b.size * TS * z);
  } else if (s.kind === 'town' && s.obj.alive) {
    const t = s.obj;
    ctx.beginPath(); ctx.arc((t.x * TS + 3 - c.x) * z, (t.y * TS + 3 - c.y) * z, t.radius * TS * z, 0, 6.283);
    ctx.strokeStyle = 'rgba(255,226,138,.35)'; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
  } else if (s.kind === 'tile') {
    const i = s.obj;
    ctx.strokeRect((i % W.w * TS - c.x) * z, (((i / W.w) | 0) * TS - c.y) * z, TS * z, TS * z);
  }
}
// Which realm the player is looking at right now: picked, hovered in the list, or the owner of whatever's selected.
function focusRealm() {
  if (UI.hoverPol) return UI.hoverPol;
  const s = Render.sel;
  if (!s) return null;
  if (s.kind === 'pol') return s.obj;
  if (s.kind === 'town' && s.obj.alive) return s.obj.polity;
  if (s.kind === 'person' && s.obj.alive) return s.obj.town.polity;
  if (s.kind === 'building' && s.obj.town) return s.obj.town.polity;
  if (s.kind === 'army' || s.kind === 'ship') return s.obj.pol;
  return null;
}
// Lines from a capital to every town it rules, and rings round them, so a realm's reach can be read at a glance.
function drawRealmLinks(ctx, c, z, vw, vh) {
  const focus = focusRealm(), all = Render.mode === 'kingdoms';
  if (!focus && !all) return;
  const toS = t => [((t.x + 0.5) * TS - c.x) * z, ((t.y + 0.5) * TS - c.y) * z];
  for (const t of W.towns) {
    const P = t.polity;
    if (!all && P !== focus) continue;
    const isF = P === focus, [sx, sy] = toS(t);
    ctx.strokeStyle = P.color; ctx.lineWidth = isF ? 2 : 1.2;
    ctx.globalAlpha = isF ? 0.9 : 0.45;
    const cap0 = P.capital;
    if (cap0 && cap0 !== t && cap0.alive) {
      const [ax, ay] = toS(cap0);
      ctx.setLineDash(isF ? [7, 5] : [4, 5]); ctx.lineDashOffset = isF ? -Render.time * 14 : 0;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(sx, sy); ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
    }
    if (isF) {
      const r = Math.max(8, Math.sqrt(tn(t)) * 0.5 * TS * z * 0.5) + Math.sin(Render.time * 3) * 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // and whoever owes it tribute
  if (focus) for (const o of W.polities) {
    if (!o.alive || !o.capital || !focus.capital) continue;
    if (o.overlord !== focus.id && focus.overlord !== o.id) continue;
    const [ax, ay] = toS(focus.capital), [bx, by] = toS(o.capital);
    ctx.strokeStyle = '#e6c170'; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.5; ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
}
function drawLabels(ctx, c, z, vw, vh) {
  const L = Render.labels; L.length = 0;
  drawRealmLinks(ctx, c, z, vw, vh);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const names = UI.names || 'all';
  // kingdoms: wide lettering when zoomed far out, or at any zoom when only realm names are wanted
  if (names !== 'none' && (z < 0.75 || names === 'realms')) {
    const groups = new Map();
    for (const t of W.towns) {
      if (t.polity.pop < 40) continue;
      let g = groups.get(t.polity);
      if (!g) groups.set(t.polity, g = { x: 0, y: 0, w: 0, xx: 0 });
      const k = tn(t); g.x += t.x * k; g.y += t.y * k; g.w += k; g.xx += t.x * t.x * k;
    }
    ctx.globalAlpha = names === 'realms' ? 0.85 : clamp((0.75 - z) * 3.5, 0, 0.75);
    // biggest realms claim their space first; a name that would overlap one already written is left out,
    // and so are realms too small to matter from this far out
    const order = [...groups].sort((a, b) => b[0].pop - a[0].pop);
    const top = order.length ? order[0][0].pop : 0, minPop = z < 0.5 ? top * clamp((0.5 - z) * 0.12, 0, 0.04) : 0;
    const taken = [], zs = clamp(z / 0.6, 0.5, 1);
    for (const [pol, g] of order) {
      if (pol.pop < minPop) continue;
      const mx = g.x / g.w, sx = (mx * TS - c.x) * z, sy = (g.y / g.w * TS - c.y) * z;
      if (sx < -300 || sy < -60 || sx > vw + 300 || sy > vh + 60) continue;
      // no wider than the realm itself looks on screen, with a little grace
      const span = 2.4 * Math.sqrt(Math.max(1, g.xx / g.w - mx * mx)) * TS * z + 50;
      const size = Math.round(Math.min(clamp(9 + Math.sqrt(pol.pop) * 0.55, 11, 26) * zs, span / (pol.name.length * 0.7)));
      if (size < 8) continue;
      ctx.font = `italic 600 ${size}px Georgia, serif`;
      const name = pol.name.toUpperCase().split('').join(' ');
      const w = ctx.measureText(name).width, y = sy - size * 1.1;
      const x0 = sx - w / 2 - 4, x1 = sx + w / 2 + 4, y0 = y - size * 0.6 - 2, y1 = y + size * 0.6 + 2;
      if (taken.some(r => x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1])) continue;
      taken.push([x0, y0, x1, y1]);
      ctx.lineWidth = size >= 14 ? 3 : 2; ctx.strokeStyle = 'rgba(15,20,28,.65)'; ctx.strokeText(name, sx, y);
      ctx.fillStyle = '#f4ead2'; ctx.fillText(name, sx, y);
    }
    ctx.globalAlpha = 1;
  }
  // seas and lakes have names, and big rivers
  if (names !== 'none' && z < 1.6 && W.bodies) {
    ctx.fillStyle = 'rgba(205,232,250,.75)';
    for (let k = 1; k < W.bodies.length; k++) {
      const b = W.bodies[k];
      if (b.kind === 'ocean' ? z > 0.5 : b.kind === 'lake' ? (b.area < 40 || z < 0.5) : false) continue;
      const sx = ((b.x + 0.5) * TS - c.x) * z, sy = ((b.y + 0.5) * TS - c.y) * z;
      if (sx < -80 || sy < -20 || sx > vw + 80 || sy > vh + 20) continue;
      ctx.font = `italic ${b.kind === 'lake' ? 11 : b.kind === 'sea' ? 14 : 16}px Georgia, serif`;
      ctx.fillText(b.name, sx, sy);
    }
  }
  const focus = focusRealm();
  for (const t of W.towns) {
    const n = tn(t), P = t.polity;
    const need = t.nomad ? 1.2 : n < 30 ? 0.8 : n < 90 ? 0.55 : n < 220 ? 0.32 : 0.15;
    const isF = P === focus;
    if (z < need && !isF) {
      // too small to name from here, but still a dot in its realm's colour
      if (z >= 0.3) { const dx = ((t.x + 0.5) * TS - c.x) * z, dy = ((t.y + 0.5) * TS - c.y) * z; ctx.fillStyle = P.color; ctx.fillRect(dx - 2, dy - 2, 4, 4); ctx.strokeStyle = 'rgba(12,16,22,.75)'; ctx.lineWidth = 1; ctx.strokeRect(dx - 2.5, dy - 2.5, 5, 5); }
      continue;
    }
    const sx = ((t.x + 0.5) * TS - c.x) * z, sy = (t.y * TS - c.y) * z - 14 - Math.min(z * 3, 12);
    if (sx < -90 || sy < -30 || sx > vw + 90 || sy > vh + 30) continue;
    const size = n >= 550 ? 14 : n >= 220 ? 13 : n >= 90 ? 12 : 11;
    const isCap = P.capital === t;
    const holder = t.occupier && t.occupier.alive ? t.occupier : null;
    // a flag flying over the town centre, in the colour of whoever holds it
    if (z >= 0.55) drawFlag(ctx, ((t.x + 0.5) * TS - c.x) * z, ((t.y + 0.9) * TS - c.y) * z, (holder || P).color, isCap ? 15 + z * 5 : 10 + z * 4, isCap ? 12 + z * 2 : 8 + z * 1.5, t.id);
    if (names !== 'all') continue;
    ctx.font = `${n >= 90 || isCap ? '600 ' : ''}${size}px Georgia, serif`;
    const label = t.name, tw = ctx.measureText(label).width, crown = isCap ? 13 : 0;
    const showRealm = (z >= 0.9 || n >= 220 || isF) && !t.nomad;
    const sub = holder ? `held by ${holder.name}` : P.name;
    ctx.font = 'italic 10px Georgia, serif';
    const sw = showRealm ? ctx.measureText(sub).width : 0;
    const boxW = Math.max(tw + crown, sw) + 14, boxH = size + 5 + (showRealm ? 11 : 0), x0 = sx - boxW / 2, y0 = sy - size / 2 - 3;
    // the plate: colour tab down the left for the realm, a second tab when someone else holds it
    ctx.fillStyle = isF ? 'rgba(48,38,18,.9)' : 'rgba(12,16,22,.72)'; ctx.fillRect(x0, y0, boxW, boxH);
    ctx.fillStyle = P.color; ctx.fillRect(x0, y0, 5, boxH);
    if (holder) { ctx.fillStyle = holder.color; ctx.fillRect(x0, y0 + boxH / 2, 5, boxH / 2); }
    if (isF) { ctx.strokeStyle = P.color; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 0.5, y0 + 0.5, boxW - 1, boxH - 1); }
    const tx1 = sx + 2.5 + crown / 2;
    if (isCap) { const cx = tx1 - tw / 2 - 8, cy = sy; ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(cx - 5, cy + 4); ctx.lineTo(cx - 5, cy - 3); ctx.lineTo(cx - 2.5, cy); ctx.lineTo(cx, cy - 4); ctx.lineTo(cx + 2.5, cy); ctx.lineTo(cx + 5, cy - 3); ctx.lineTo(cx + 5, cy + 4); ctx.closePath(); ctx.fill(); }
    ctx.font = `${n >= 90 || isCap ? '600 ' : ''}${size}px Georgia, serif`;
    ctx.fillStyle = t.sick > 0 ? '#c3e36a' : t.attack ? '#ff8f7a' : t.famine > 1 ? '#f0b46a' : '#fff6e0';
    ctx.fillText(label, tx1, sy);
    if (showRealm) { ctx.font = 'italic 10px Georgia, serif'; ctx.fillStyle = holder ? '#ff9f8a' : '#d8ccb0'; ctx.fillText(sub, sx + 2.5, sy + size / 2 + 6); }
    L.push({ t, x: x0, y: y0, w: boxW, h: boxH });
  }
}
function centerOn(wx, wy, z) {
  const c = Render.cam;
  if (z) { c.z = z; clampCam(); }  // the zoom it can really have first, or the centre is worked out for a zoom that's then changed
  c.x = wx * TS - Render.vw / 2 / c.z;
  c.y = wy * TS - Render.vh / 2 / c.z;
  clampCam();
}
function clampCam() {
  const c = Render.cam, pw = W.w * TS, ph = W.h * TS;
  const mz = Math.min(Render.vw / pw, Render.vh / ph) * 0.9;
  if (c.z < mz) c.z = mz;
  if (c.z > 10) c.z = 10;
  // the view may run a third of a screen past the edge, so realms on the rim aren't stuck under the panels
  const vwW = Render.vw / c.z, vhW = Render.vh / c.z, mx = vwW * 0.35, my = vhW * 0.35;
  // round the world east and west there's no edge at all: keep going and you come back to where you started
  if (W.wrap) c.x = ((c.x % pw) + pw) % pw;
  else c.x = clamp(c.x, Math.min(-mx, pw - vwW - mx), Math.max(mx, pw - vwW + mx));
  c.y = clamp(c.y, Math.min(-my, ph - vhW - my), Math.max(my, ph - vhW + my));
}
function drawMinimap(cv) {
  const g = cv.getContext('2d'), s = cv.width / (W.w * TS), s0 = s;
  g.imageSmoothingEnabled = true;
  const R0 = Render, cs = CHUNK * TS;
  for (let k = 0; k < R0.chunks.length; k++) {
    const cx = k % R0.cw, cy = (k / R0.cw) | 0;
    g.drawImage(R0.chunks[k], cx * cs * s, cy * cs * s, cs * s + 1, cs * s + 1);
  }
  if (UI.terrainDirty) { UI.terrainDirty = false; }
  g.globalAlpha = 0.5; g.imageSmoothingEnabled = false; g.drawImage(R0.terr, 0, 0, cv.width, cv.height); g.globalAlpha = 1;
  for (const s of W.ships) { g.fillStyle = s.kind === 'war' ? '#ff5a3a' : '#f0e6c8'; g.fillRect((s.at % W.w) * TS * s0, ((s.at / W.w) | 0) * TS * s0, 1, 1); }
  for (const t of W.towns) {
    const n = tn(t), cap0 = t.polity.capital === t;
    const q = n >= 220 ? 3 : n >= 60 ? 2 : 1, x = t.x * TS * s, y = t.y * TS * s;
    g.fillStyle = 'rgba(10,12,16,.85)'; g.fillRect(x - q / 2 - 1, y - q / 2 - 1, q + 2, q + 2);
    g.fillStyle = t.attack ? '#ff5a3a' : cap0 ? '#ffd34d' : (t.occupier || t.polity).color;
    g.fillRect(x - q / 2, y - q / 2, q, q);
  }
  for (const B of W.battles) { const x = B.x * TS * s, y = B.y * TS * s; g.strokeStyle = (Math.floor(Render.time * 2) & 1) ? '#ff5a3a' : '#ffd34d'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 4, 0, 6.283); g.stroke(); }
  for (const A of W.armies) { if (A.goal === 'garrison' || A.battle) continue; g.fillStyle = A.pol.color; g.fillRect(A.x * TS * s - 1, A.y * TS * s - 1, 2, 2); }
  const c = R0.cam;
  g.strokeStyle = '#ffe28a'; g.lineWidth = 1;
  g.strokeRect(c.x * s, c.y * s, R0.vw / c.z * s, R0.vh / c.z * s);
  if (W.wrap) g.strokeRect((c.x - W.w * TS) * s, c.y * s, R0.vw / c.z * s, R0.vh / c.z * s);  // the part of the view that's come round the other side
}
