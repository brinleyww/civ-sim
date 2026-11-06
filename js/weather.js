'use strict';
// Weather. The air over the map is a coarse grid of cells, each with its own warmth, wind, damp, cloud and rain.
// Prevailing winds blow by latitude (trade winds, westerlies, polar easterlies); low-pressure systems wheel across it bringing storms, highs bring clear skies.
// Wet air rising over mountains drops its rain on the near side and leaves a dry shadow behind; warm seas feed it, cold dry land starves it.
// What falls over a season, against what usually falls there, is what decides a harvest. Seasons run opposite either side of the equator.

const WX_CELL = 6, WX_EVERY = 3;
const SEASON_AMP = 0.17;
// How far a row is into its own summer or winter: negative is winter. Tropics hardly change; the poles swing hard.
function seasonAt(y) {
  const f = (W.tick % TPY) / TPY, lat = W.latRow ? W.latRow[Math.min(W.h - 1, Math.max(0, y | 0))] : 0.5;
  const hemi = !W.latRow || y / W.h < W.eq ? 1 : -1;
  return -Math.cos((f - 0.08) * 6.283) * SEASON_AMP * clamp(0.2 + lat * 1.25, 0.2, 1.1) * hemi;
}
const wxCellOf = i => { const wx = W.wx; return (((i / W.w) | 0) / WX_CELL | 0) * wx.gw + ((i % W.w) / WX_CELL | 0); };
// In degrees, for people to read.
const tempC = T => Math.round((T - 0.4) * 62);

function initWeather() {
  const gw = Math.ceil(W.w / WX_CELL), gh = Math.ceil(W.h / WX_CELL), n = gw * gh;
  const F = () => new Float32Array(n);
  const wx = W.wx = { gw, gh, hum: F(), cloud: F(), rain: F(), u: F(), v: F(), tmp: F(), base: F(), relief: F(), sea: F(), moist: F(), acc: F(), norm: new Float32Array(n * 4), wet: F(), dry: new Uint8Array(n), gx: F(), gy: F(), lift: F(), h2: F(), c2: F(), avg: F(), gAvg: 0, sys: [], step: 0 };
  const cnt = new Float32Array(n);
  for (let i = 0; i < W.w * W.h; i++) {
    const c = wxCellOf(i);
    cnt[c]++; wx.base[c] += W.temp[i]; wx.moist[c] += W.moist[i];
    if (W.water[i]) wx.sea[c]++; else wx.relief[c] = Math.max(wx.relief[c], W.elev[i]);
  }
  for (let c = 0; c < n; c++) {
    wx.base[c] /= cnt[c] || 1; wx.moist[c] /= cnt[c] || 1; wx.sea[c] /= cnt[c] || 1;
    wx.hum[c] = 0.3 + wx.sea[c] * 0.35 + wx.moist[c] * 0.2; wx.wet[c] = 1;
  }
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
    const c = cy * gw + cx, r = wx.relief;
    wx.gx[c] = (r[cy * gw + Math.min(gw - 1, cx + 1)] - r[cy * gw + Math.max(0, cx - 1)]) * 0.5;
    wx.gy[c] = (r[Math.min(gh - 1, cy + 1) * gw + cx] - r[Math.max(0, cy - 1) * gw + cx]) * 0.5;
  }
}
// Each row's prevailing wind: easterly trades near the equator, westerlies in the middle latitudes, easterlies again near the poles.
function prevailing(lat, hemi) {
  if (lat < 0.3) return [-0.55, 0.22 * hemi];
  if (lat < 0.72) return [0.85, -0.1 * hemi];
  return [-0.4, 0.12 * hemi];
}
let wxTrig = null, wxEx = null;  // scratch, not saved
function weatherTick() {
  const wx = W.wx;
  if (!wx) return;
  const { gw, gh } = wx, n = gw * gh, h = W.h, step = ++wx.step;
  const f = (W.tick % TPY) / TPY, clim = W.clim ? W.clim.t - (W.clim.ash > 0 ? 0.05 : 0) : 0;
  const S0 = wx.sys;
  // ---- systems are born, drift and die ----
  if (S0.length < Math.max(3, Math.min(16, n / 220)) && rnd() < 0.09) spawnSystem(wx, f);
  for (let k = S0.length - 1; k >= 0; k--) {
    const s = S0[k], cx = s.x | 0, cy = s.y | 0;
    if (--s.life <= 0 || cx < 0 || cy < 0 || cx >= gw || cy >= gh) { S0.splice(k, 1); continue; }
    const row = Math.min(h - 1, cy * WX_CELL), lat = W.latRow[row], hemi = row / h < W.eq ? 1 : -1;
    const [pu, pv] = prevailing(lat, hemi), c = cy * gw + cx;
    s.x += pu * 0.35 + s.dx; s.y += pv * 0.35 + s.dy;
    if (s.trop) { s.dy -= 0.002 * hemi; s.str += wx.sea[c] > 0.7 && wx.base[c] > 0.68 ? 0.012 : -0.03; }
    else s.str += s.life > s.life0 * 0.6 ? 0.01 : -0.012;
    if (s.str <= 0.15) { S0.splice(k, 1); continue; }
    // a tropical low over warm water that keeps deepening becomes a hurricane
    // only some do, and rarely two at once: each storm gets one chance, and the seas need time between them
    if (s.trop && s.str > 1.35 && !s.cyc && W.cyclones) {
      s.cyc = true;
      if (W.cyclones.length >= 2 || rnd() > 0.32 || W.tick - (W.lastCyc || -1e9) < TPY * 0.6) continue;
      W.lastCyc = W.tick;
      W.cyclones.push({ x: s.x * WX_CELL, y: s.y * WX_CELL, vx: (pu * 0.35 + s.dx) * WX_CELL / 24, vy: (pv * 0.35 + s.dy) * WX_CELL / 24, life: 70, r: 8 + rint(8), hit: false });
    }
  }
  // ---- winds ----
  const U = wx.u, V = wx.v, L = wx.lift;
  // sin/cos of each column's part of the wander, worked out once (angle sums do the rest)
  let T0 = wxTrig;
  if (!T0 || T0.length !== gw * 4) {
    T0 = wxTrig = new Float64Array(gw * 4);
    for (let cx = 0; cx < gw; cx++) { T0[cx * 4] = Math.sin(cx * 0.37); T0[cx * 4 + 1] = Math.cos(cx * 0.37); T0[cx * 4 + 2] = Math.sin(cx * 0.19); T0[cx * 4 + 3] = Math.cos(cx * 0.19); }
  }
  for (let cy = 0; cy < gh; cy++) {
    const row = Math.min(h - 1, cy * WX_CELL + 3), lat = W.latRow[row], hemi = row / h < W.eq ? 1 : -1;
    const pu = lat < 0.3 ? -0.55 : lat < 0.72 ? 0.85 : -0.4, pv = (lat < 0.3 ? 0.22 : lat < 0.72 ? -0.1 : 0.12) * hemi;  // prevailing(), without the array
    const pa = cy * 0.21 + step * 0.013, qa = -cy * 0.33 + step * 0.011, sp = Math.sin(pa), cp = Math.cos(pa), sq = Math.sin(qa), cq = Math.cos(qa);
    for (let cx = 0, c = cy * gw; cx < gw; cx++, c++) {
      const k = cx * 4;
      // the wind wanders a little of its own accord
      U[c] = pu + (T0[k] * cp + T0[k + 1] * sp) * 0.25;           // sin(cx*0.37 + cy*0.21 + step*0.013)
      V[c] = pv + (T0[k + 3] * cq - T0[k + 2] * sq) * 0.2;        // cos(cx*0.19 - cy*0.33 + step*0.011)
      L[c] = 0;
    }
  }
  let EX = wxEx;
  if (!EX || EX.length < gw) EX = wxEx = new Float64Array(gw);
  for (const s of S0) {
    const r = s.r, x0 = Math.max(0, Math.floor(s.x - r * 2)), x1 = Math.min(gw - 1, Math.ceil(s.x + r * 2)), y0 = Math.max(0, Math.floor(s.y - r * 2)), y1 = Math.min(gh - 1, Math.ceil(s.y + r * 2));
    const hemi = s.y * WX_CELL / h < W.eq ? 1 : -1, spin = s.kind * hemi * s.str, r2 = r * r;
    for (let cx = x0; cx <= x1; cx++) { const dx = cx - s.x; EX[cx] = Math.exp(-dx * dx / r2); }  // the falloff splits into a row part and a column part
    for (let cy = y0; cy <= y1; cy++) {
      const dy = cy - s.y, ey = Math.exp(-dy * dy / r2);
      if (ey < 0.05) continue;
      for (let cx = x0; cx <= x1; cx++) {
        const dx = cx - s.x, d2 = dx * dx + dy * dy, fall = EX[cx] * ey;
        if (fall < 0.05) continue;
        const c = cy * gw + cx, d = Math.sqrt(d2) + 0.5;
        // round the centre: lows turn one way, highs the other, and lows draw air in and up
        U[c] += (-dy / d * spin * 1.4 - dx / d * s.kind * 0.25 * s.str) * fall;
        V[c] += (dx / d * spin * 1.4 - dy / d * s.kind * 0.25 * s.str) * fall;
        L[c] += s.kind * s.str * fall * 0.55;
      }
    }
  }
  // ---- the air moves: carry damp and cloud downwind ----
  const H = wx.hum, C = wx.cloud, H2 = wx.h2, C2 = wx.c2, K = 0.5;
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
    const c = cy * gw + cx;
    let sx = cx - U[c] * K, sy = cy - V[c] * K;
    sx = sx < 0 ? 0 : sx > gw - 1.001 ? gw - 1.001 : sx; sy = sy < 0 ? 0 : sy > gh - 1.001 ? gh - 1.001 : sy;
    const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy, a = iy * gw + ix, b = a + 1, d = a + gw, e = d + 1;
    H2[c] = (H[a] * (1 - fx) + H[b] * fx) * (1 - fy) + (H[d] * (1 - fx) + H[e] * fx) * fy;
    C2[c] = (C[a] * (1 - fx) + C[b] * fx) * (1 - fy) + (C[d] * (1 - fx) + C[e] * fx) * fy;
  }
  // ---- and what happens in each cell: evaporation, lifting, cloud, rain ----
  let tot = 0;
  for (let cy = 0; cy < gh; cy++) {
    const row = Math.min(h - 1, cy * WX_CELL + 3), season = seasonAt(row), summer = season > 0.05;
    for (let cx = 0; cx < gw; cx++) {
      const c = cy * gw + cx, sea = wx.sea[c];
      const T = wx.base[c] + season + clim;
      wx.tmp[c] = T;
      let hum = H2[c], cloud = C2[c];
      hum += sea * (0.016 + 0.03 * clamp(T, 0, 1)) + (1 - sea) * wx.moist[c] * 0.007;
      const oro = Math.max(0, U[c] * wx.gx[c] + V[c] * wx.gy[c]) * 7;
      const convect = summer && T > 0.6 ? (T - 0.6) * hum * 0.7 : 0;
      const lift = oro + L[c] + convect;
      const sat = 0.2 + clamp(T, 0, 1.1) * 0.9;
      const thr = sat * (1 - clamp(lift, -0.3, 0.6));
      if (hum > thr) { const k = (hum - thr) * 0.35; hum -= k; cloud += k; }
      let rain = cloud * clamp(0.07 + lift * 0.5, 0.02, 0.6);
      if (lift < 0) { cloud *= 1 + lift * 0.4; rain *= 0.3; }   // a high: sinking air, clear skies
      cloud -= rain;
      cloud *= 0.985;
      H[c] = hum > 1.4 ? 1.4 : hum; C[c] = cloud > 1.2 ? 1.2 : cloud < 0 ? 0 : cloud;
      wx.rain[c] = rain;
      wx.acc[c] += rain;
      // what usually falls here, so 'heavy' means heavy for this place
      wx.avg[c] = wx.avg[c] ? wx.avg[c] * 0.996 + rain * 0.004 : rain;
      tot += rain;
    }
  }
  wx.gAvg = wx.gAvg ? wx.gAvg * 0.99 + tot / n * 0.01 : tot / n;
  // ---- the end of a season: how wet was it, against what's usual here at this time of year? ----
  if (W.tick % TPSEASON < WX_EVERY) seasonWeather(wx);
}
function spawnSystem(wx, f) {
  const { gw, gh } = wx;
  for (let q = 0; q < 10; q++) {
    const cx = rint(gw), cy = rint(gh), c = cy * gw + cx, row = Math.min(W.h - 1, cy * WX_CELL + 3), lat = W.latRow[row], season = seasonAt(row);
    const sea = wx.sea[c], T = wx.base[c] + season;
    let kind = 0, trop = false;
    if (sea > 0.6 && lat > 0.3 && lat < 0.82) kind = 1;                          // storms of the westerlies
    else if (sea > 0.7 && lat < 0.3 && T > 0.72 && season > 0.02) { kind = 1; trop = true; }  // a tropical low in the warm season
    else if (sea < 0.45 && ((lat > 0.22 && lat < 0.42) || (lat > 0.5 && season < -0.05))) kind = -1;  // subtropical and winter highs over land
    if (!kind) continue;
    const life = 90 + rint(120);
    wx.sys.push({ id: W.nextId++, x: cx + 0.5, y: cy + 0.5, dx: (rnd() - 0.5) * 0.08, dy: (rnd() - 0.5) * 0.08, r: kind > 0 ? (trop ? 2.5 : 3.5 + rnd() * 3) : 5 + rnd() * 4, str: trop ? 0.6 : 0.5 + rnd() * 0.5, kind, trop, life, life0: life, cyc: false });
    return;
  }
}
// What a season's rain did, cell by cell: the harvest factor for the next season, droughts and floods.
function seasonWeather(wx) {
  const { gw, gh } = wx, n = gw * gh, s = Math.floor((W.tick % TPY) / TPSEASON + 3) % 4;  // the season that just ended
  // a season's rain is judged over the country round about, not one patch of sky, and the farmers' luck swings less than a rain gauge does
  for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
    const c = cy * gw + cx;
    let a = 0, r = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= gw || y >= gh) continue;
      const q = y * gw + x, k = s * n + q, wt = dx || dy ? 1 : 2;
      a += wx.acc[q] * wt; r += (wx.norm[k] || wx.acc[q]) * wt;
    }
    const ratio = (a + 0.02) / (r + 0.02);
    wx.wet[c] = clamp(Math.sqrt(ratio) * (wx.anom ? wx.anom[c] : 1), 0.4, 1.7);  // El Nino, long droughts, bare hills (food.js)
    wx.dry[c] = wx.wet[c] < 0.7 ? Math.min(250, wx.dry[c] + 1) : 0;
  }
  for (let c = 0; c < n; c++) {
    const k = s * n + c, norm = wx.norm[k];
    wx.norm[k] = norm ? norm * 0.85 + wx.acc[c] * 0.15 : Math.max(wx.acc[c], 0.02);
    wx.acc[c] = 0;
  }
  agriSeason();
  if (W.tick < TPY * 2) return;
  // what it means for the towns under it
  for (const t of W.towns) {
    if (t.nomad || tn(t) < 40) continue;
    const c = wxCellOf(t.i), wet = wx.wet[c];
    // a whole year of it is a drought worth writing down; the chronicle notes the worst, not every dry valley
    if (wx.dry[c] === 4 && tn(t) >= 80 && !(t.droughtNote > year() - 25) && !(W.droughtNote > year() - 6)) { t.droughtNote = year(); W.droughtNote = year(); chronT('famine', `No rain worth the name at ${t.name} for a whole year. The wells are low and the fields crack.`, t); }
    if (wet > 1.5 && t.near.river > 0 && rnd() < 0.5) {
      // the river breaks its banks: fields drown, the mud it leaves is rich
      let lost = 0;
      for (const fl of t.fields) if (W.river[fl.i] || riverNear(W, fl.i % W.w, (fl.i / W.w) | 0, 2)) { if (W.stage[fl.i]) { W.stage[fl.i] = 0; dirty(fl.i); lost++; } W.fert[fl.i] = Math.min(255, W.fert[fl.i] + 6); }
      if (t.tech[TECH_IX.dikes] || t.mod.drought < 0.7) lost = Math.floor(lost / 3);
      if (lost >= 4 && !(t.floodNote > year() - 15) && !(W.floodNote > year() - 4)) { t.floodNote = year(); W.floodNote = year(); chronT('misc', `Weeks of rain, and the river at ${t.name} floods: ${lost} fields under water.`, t); }
    }
  }
}
// The season's rain where this tile is, as the crops feel it: a dry season starves them, a soaking one rots them.
function wxRain(i) {
  const wx = W.wx;
  if (!wx) return 1;
  const v = wx.wet[wxCellOf(i)];
  // an ordinary wet year helps about as much as an ordinary dry one hurts; only a real deluge does harm
  return v < 1 ? 1 - (1 - v) * 0.85 : v < 1.5 ? 1 + (v - 1) * 0.6 : 1.3 - (v - 1.5) * 0.8;
}
// How hard it's raining in a cell right now, against what usually falls there: 1 is an ordinary wet spell, 3 a downpour.
const wxRatio = c => { const wx = W.wx; return wx.rain[c] / Math.max(wx.avg[c], wx.gAvg * 0.6, 1e-5); };
// Is it raining hard here right now (0 = no more than usual, 1 = a downpour)?
function wxNow(i) {
  if (!W.wx) return 0;
  return clamp((wxRatio(wxCellOf(i)) - 1.2) / 2.5, 0, 1);
}
// How much snow or rain is falling compared with usual, for the snow sweep: averages about 1.
function wxFall(i) { return W.wx ? clamp(wxRatio(wxCellOf(i)), 0, 3) : 1; }
// What the sky is doing at a tile, as one of the battle weathers.
function wxKind(i) {
  const wx = W.wx;
  if (!wx) return 0;
  const c = wxCellOf(i), r = wxRatio(c), T = wx.tmp[c];
  if (r > 1.8) return T < SNOW_LINE ? 2 : 1;
  if (wx.cloud[c] > 0.55 && Math.abs(wx.u[c]) + Math.abs(wx.v[c]) < 0.5 && wx.hum[c] > 0.6) return 3;
  if (T > 0.88 && wx.cloud[c] < 0.15) return 4;
  return 0;
}
const WIND_NAMES = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
function wxDescribe(i) {
  const wx = W.wx;
  if (!wx) return '';
  const c = wxCellOf(i), r = wxRatio(c), T = wx.tmp[c], cl = wx.cloud[c], u = wx.u[c], v = wx.v[c];
  const sky = r > 3 ? (T < SNOW_LINE ? 'Heavy snow' : 'Heavy rain') : r > 1.8 ? (T < SNOW_LINE ? 'Snow' : 'Rain') : r > 1 && cl > 0.3 ? (T < SNOW_LINE ? 'Light snow' : 'Showers') : cl > 0.5 ? 'Overcast' : cl > 0.2 ? 'Cloudy' : 'Clear';
  const sp = Math.hypot(u, v), from = WIND_NAMES[(Math.round(Math.atan2(-v, -u) / (Math.PI / 4)) + 8) % 8];
  const wind = sp < 0.35 ? 'still air' : `${sp > 1.6 ? 'a gale' : sp > 0.9 ? 'a strong wind' : 'a breeze'} from the ${from}`;
  const wet = wx.wet[c], season = wet < 0.55 ? 'a dry season' : wet > 1.6 ? 'a very wet season' : wet > 1.2 ? 'a wet season' : 'a normal season';
  return `${sky}, ${tempC(T)}°C, ${wind}. ${cap(season)} so far.`;
}

// ---- the Weather view ----
function drawWeather(ctx, z) {
  const wx = W.wx, R0 = Render;
  if (!wx) return;
  const { gw, gh } = wx;
  if (!R0.wxCv || R0.wxCv.width !== gw) { R0.wxCv = document.createElement('canvas'); R0.wxCv.width = gw; R0.wxCv.height = gh; R0.wxImg = R0.wxCv.getContext('2d').createImageData(gw, gh); }
  if ((R0.frameN || 0) % 4 === 0) {
    const d = R0.wxImg.data;
    for (let c = 0; c < gw * gh; c++) {
      const T = clamp(wx.tmp[c], 0, 1.1), cl = clamp(wx.cloud[c] * 1.4, 0, 1), r = clamp((wxRatio(c) - 0.8) / 2.5, 0, 1);
      // warmth as a wash of colour, cold blue to hot red; cloud whitens it; rain darkens it blue-grey
      let R = T < 0.5 ? 60 + T * 160 : 140 + (T - 0.5) * 220, G = T < 0.5 ? 110 + T * 160 : 190 - (T - 0.5) * 220, Bc = T < 0.5 ? 230 - T * 120 : 170 - (T - 0.5) * 220;
      R = R + (235 - R) * cl; G = G + (238 - G) * cl; Bc = Bc + (242 - Bc) * cl;
      R -= r * 90; G -= r * 70; Bc -= r * 20;
      d[c * 4] = R; d[c * 4 + 1] = G; d[c * 4 + 2] = Bc; d[c * 4 + 3] = 70 + cl * 120 + r * 40;
    }
    R0.wxCv.getContext('2d').putImageData(R0.wxImg, 0, 0);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(R0.wxCv, 0, 0, gw * WX_CELL * TS, gh * WX_CELL * TS);
  // rain and snow falling, and the wind, only where you're looking
  const c0 = R0.cam, s = WX_CELL * TS, x0 = Math.max(0, Math.floor(c0.x / s)), x1 = Math.min(gw - 1, Math.ceil((c0.x + R0.vw / z) / s)), y0 = Math.max(0, Math.floor(c0.y / s)), y1 = Math.min(gh - 1, Math.ceil((c0.y + R0.vh / z) / s));
  const step = Math.max(1, Math.ceil((x1 - x0) / 60)), time = R0.time;
  ctx.lineWidth = 1.2 / z;
  for (let cy = y0; cy <= y1; cy += step) for (let cx = x0; cx <= x1; cx += step) {
    const c = cy * gw + cx, r = clamp((wxRatio(c) - 0.8) / 2.5, 0, 1), u = wx.u[c], v = wx.v[c], bx = cx * s, by = cy * s;
    if (r > 0.08 && wx.cloud[c] > 0.12) {
      const snow = wx.tmp[c] < SNOW_LINE, k = Math.min(6, 1 + Math.floor(r * 6));
      ctx.strokeStyle = snow ? 'rgba(255,255,255,0.85)' : 'rgba(120,170,255,0.8)'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let q = 0; q < k; q++) {
        const hx = hash2(cx * 7 + q, cy * 3, 11), hy = hash2(cx, cy * 5 + q, 12), ph = (time * (snow ? 0.25 : 1.1) + hy) % 1;
        const px = bx + hx * s * step + u * ph * s * 0.3, py = by + ph * s * step;
        if (snow) { ctx.fillRect(px, py, 2.5 / z, 2.5 / z); }
        else { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + u * 3, py + 7); ctx.stroke(); }
      }
    }
    if ((cx + cy) % (step * 3) === 0) {
      // the wind: a short arrow showing where the air is going
      const len = Math.min(1.8, Math.hypot(u, v)) * s * 0.35, a = Math.atan2(v, u), mx = bx + s / 2, my = by + s / 2;
      const ex = mx + Math.cos(a) * len, ey = my + Math.sin(a) * len;
      ctx.strokeStyle = 'rgba(20,30,40,0.55)';
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ex, ey); ctx.lineTo(ex - Math.cos(a - 0.5) * len * 0.35, ey - Math.sin(a - 0.5) * len * 0.35); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(a + 0.5) * len * 0.35, ey - Math.sin(a + 0.5) * len * 0.35); ctx.stroke();
    }
  }
  // the pressure systems themselves
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const sy of wx.sys) {
    const px = sy.x * s, py = sy.y * s, rad = sy.r * s * 0.6;
    ctx.strokeStyle = sy.kind > 0 ? 'rgba(200,60,60,0.6)' : 'rgba(60,90,200,0.55)';
    ctx.lineWidth = 2 / z;
    for (let ring = 1; ring <= 3; ring++) { ctx.beginPath(); ctx.arc(px, py, rad * ring / 3, 0, 6.283); ctx.stroke(); }
    ctx.fillStyle = sy.kind > 0 ? '#d23c3c' : '#3c5ad2';
    ctx.font = `700 ${(22 / z).toFixed(1)}px system-ui, sans-serif`;
    ctx.fillText(sy.kind > 0 ? 'L' : 'H', px, py);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
