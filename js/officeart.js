'use strict';
// Mid-rise blocks and offices: drawn from their style rows (offices.js), bottom-anchored like the apartment and tower houses,
// 12 art pixels a tile wide. Loaded after portart.js; sprites.js hands houses of the mid-rise tier and every office to these.

const ofHash = (a, b, c) => ((Math.imul(a + 1, 73856093) ^ Math.imul(b + 7, 19349663) ^ Math.imul(c + 3, 83492791)) >>> 0) % 100;
const OF_LIT = '#f5e6a1', OF_CARS = ['#c8452f', '#3a7fb5', '#d8d4c8', '#2d3036', '#d8a53a', '#8c939a'];

// ---- mid-rise blocks ----
function midriseSprite(v, pal) {
  const M = MIDRISE[v] || MIDRISE[0];
  const st = M.st, H = Math.round(8 + st * 3.4), nm = M.name.toLowerCase();
  const [rf, rhi, rlo] = ROOFS[pal % ROOFS.length];
  const wall = M.wall, trim = M.trim, dark = '#2d2f36', glass = '#38505f';
  const green = /green|forest|solarpunk|garden|bosco/.test(nm), brick = /brick|georgian|victorian|edwardian|model|warehouse/.test(nm) || M.wall === '#a5533f' || M.wall === '#94503a';
  const timber = /timber|half/.test(nm), panel = /panel|plattenbau|khrushch|prefab|system/.test(nm), gable = /gable|canal/.test(nm);
  return mkSprite(12, H, r => {
    const roofH = M.roof === 'm' || M.roof === 'p' ? 4 : M.roof === 's' ? 5 : 2, gH = 4;
    const top = roofH, bot = H - 1, bodyTop = top, gTop = bot - gH;
    // stepped (art deco) blocks narrow towards the top; the rest fill the plot
    const xL = y => M.roof === 's' && y < top + 4 ? 3 : M.roof === 's' && y < top + 7 ? 2 : 1, xW = y => 12 - xL(y) * 2;
    for (let y = bodyTop; y < bot; y++) r(xL(y), y, xW(y), 1, wall);
    r(1, bodyTop, 1, bot - bodyTop, 'rgba(255,255,255,.12)'); r(10, bodyTop, 1, bot - bodyTop, 'rgba(0,0,0,.12)');
    if (brick) for (let y = bodyTop + 1; y < gTop; y += 2) r(xL(y), y, xW(y), 1, 'rgba(0,0,0,.06)');
    if (timber) { for (let y = bodyTop; y < gTop; y += 3) r(1, y, 10, 1, trim); for (let x = 1; x < 11; x += 3) r(x, bodyTop, 1, gTop - bodyTop, trim); }
    // storeys and their windows
    for (let k = 0; k < st - 1; k++) {
      const y = gTop - 3 - k * 3;
      if (y < bodyTop + 1) break;
      const a = xL(y), w = xW(y);
      switch (M.win) {
        case 'r': r(a + 1, y + 1, w - 2, 1, glass); r(a + 1, y + 1, w - 2, 1, ofHash(v, k, 1) < 25 ? OF_LIT : glass); r(a, y + 2, w, 1, trim); break;
        case 'g': for (let x = a; x < a + w; x++) r(x, y, 1, 3, (x - a) % 3 === 0 ? trim : ofHash(v, k, x) < 18 ? OF_LIT : '#5a7f9c'); break;
        case 'b': for (let x = a + 1; x < a + w - 1; x += 3) r(x, y, 2, 2, ofHash(v, k, x) < 20 ? OF_LIT : dark); r(a, y + 2, w, 1, '#3a3d42'); if (green) for (let x = a; x < a + w; x += 2) r(x, y + 2, 1, 1, '#4f8a3e'); break;
        case 'y': r(a + 3, y, 4, 3, trim); r(a + 4, y, 2, 2, glass); r(a + 1, y, 1, 2, dark); r(a + w - 2, y, 1, 2, dark); break;
        case 'l': for (let x = a + 1; x < a + w - 1; x += 4) { r(x, y, 3, 2, '#1e2024'); r(x, y + 2, 3, 1, trim); if (green) r(x, y + 1, 1, 1, '#5f9a48'); } break;
        case 'a': for (let x = a + 1; x < a + w - 1; x += 3) { r(x, y, 1, 2, ofHash(v, k, x) < 15 ? OF_LIT : dark); r(x, y - 1, 1, 1, trim); } break;
        default: for (let x = a + 1; x < a + w - 1; x += 3) { r(x, y, 1, 2, ofHash(v, k, x) < 15 ? OF_LIT : dark); r(x - 0, y + 2, 1, 1, trim); }
      }
      if (panel) r(a, y + 2, w, 1, 'rgba(0,0,0,.18)');
    }
    if (panel) for (let x = 3; x < 11; x += 3) r(x, bodyTop, 1, gTop - bodyTop, 'rgba(0,0,0,.12)');
    if (green && M.win !== 'b') for (let y = bodyTop + 2; y < gTop; y += 3) for (let x = 1; x < 11; x += 4) r(x + (y % 2), y, 2, 1, '#5f9a48');
    // the ground floor
    r(1, gTop, 10, 1, trim);
    if (M.ground === 's') { r(1, gTop + 1, 10, 3, '#4a3a2c'); r(2, gTop + 2, 3, 2, '#9fc0d0'); r(7, gTop + 2, 3, 2, '#9fc0d0'); r(1, gTop + 1, 5, 1, ['#c2453f', '#3f8fc2', '#4fa35e', '#e3a23c'][v % 4]); r(6, gTop + 1, 5, 1, ['#e3a23c', '#c2453f', '#3f8fc2', '#4fa35e'][v % 4]); r(5, gTop + 2, 1, 2, '#201814'); }
    else if (M.ground === 'c') { r(1, gTop + 1, 10, 3, '#3a2c22'); for (let x = 1; x < 11; x += 3) r(x, gTop + 1, 1, 3, trim); }
    else if (M.ground === 'l') { r(1, gTop + 1, 10, 3, wall); r(3, gTop + 1, 6, 3, '#7fb6d8'); r(5, gTop + 1, 1, 3, trim); }
    else { r(1, gTop + 1, 10, 3, wall); r(5, gTop + 1, 2, 3, '#201814'); r(2, gTop + 2, 1, 1, dark); r(9, gTop + 2, 1, 1, dark); }
    // the roof
    if (M.roof === 'm') { r(1, top - 1, 10, 1, '#4a525a'); r(2, top - 3, 8, 2, '#5a6470'); r(3, top - 4, 6, 1, '#6a747e'); r(3, top - 3, 1, 1, '#d8d4c8'); r(6, top - 3, 1, 1, '#d8d4c8'); r(8, top - 3, 1, 1, '#d8d4c8'); r(0, top, 12, 1, trim); }
    else if (M.roof === 'p') {
      if (gable) { r(3, top - 4, 6, 1, wall); r(2, top - 3, 8, 1, wall); r(1, top - 2, 10, 2, wall); r(5, top - 3, 2, 2, dark); r(2, top - 4, 1, 1, trim); r(9, top - 4, 1, 1, trim); }
      else { r(4, top - 4, 4, 1, rhi); r(2, top - 3, 8, 1, rf); r(1, top - 2, 10, 2, rf); r(1, top - 1, 10, 1, rlo); r(2, top - 4, 1, 3, '#5b3026'); }
    }
    else if (M.roof === 'c') { r(0, top - 2, 12, 2, trim); r(0, top - 1, 12, 1, 'rgba(0,0,0,.15)'); }
    else if (M.roof === 'g') { r(1, top - 2, 10, 2, '#4f8a3e'); for (let x = 2; x < 10; x += 3) r(x, top - 3, 2, 1, '#6faa52'); }
    else if (M.roof === 's') { r(3, top - 1, 6, 1, trim); r(5, top - 4, 2, 3, wall); r(5, top - 5, 2, 1, trim); }
    else { r(1, top - 1, 10, 1, trim); r(8, top - 2, 2, 1, '#70757c'); }
    r(1, H - 1, 10, 1, 'rgba(0,0,0,.25)');
  });
}

// ---- offices ----
const OF_MAT = { b: ['#a5533f', '#c8705a'], s: ['#b9b2a0', '#d4cebd'], t: ['#c9ae7e', '#5e4527'], w: ['#e6dcc2', '#f4ecd8'], a: ['#d6b86a', '#ead08a'], r: ['#c87c50', '#e09a6a'], e: ['#8a8a90', '#a8a8ae'],
  c: ['#a9a598', '#c5c1b4'], g: ['#5a7f9c', '#86aac4'], m: ['#8ab0c8', '#c8e0ee'], k: ['#2d3036', '#4a4e55'], n: ['#5f8a4f', '#86b06a'], l: ['#d8e0e6', '#f0f4f6'], h: ['#c8a070', '#e0bc88'] };
function officeSprite(type, pal) {
  const D = BLD[type], s = D.size || 1, W0 = s * 12, fl = D.floors || 1, look = D.look || 'sfs';
  const [mc, mr, mw] = look;
  const [wall, hi] = OF_MAT[mc] || OF_MAT.s, sec = (OFF_SECTORS[D.sec] || OFF_SECTORS.gen).col;
  const [rf, rhi, rlo] = ROOFS[pal % ROOFS.length];
  const seed = type.length * 31 + type.charCodeAt(0);
  // business parks and campuses: low blocks among trees and car parks, not a tower
  if (s >= 3 && fl <= 4) return mkSprite(W0, W0 + 6, r => campus(r, W0, W0 + 6, fl, wall, hi, mr, mw, sec, seed));
  const cap = s === 1 ? 100 : 120;
  const H = fl <= 3 ? W0 + (mr === 'f' || mr === 'g' || mr === 'h' || mr === 'x' ? 0 : 4) : Math.min(cap, Math.round(W0 * 0.7 + fl * 2.6 + 8));
  return mkSprite(W0, H, r => {
    const crown = mr === 'c' ? Math.min(18, 6 + fl * 0.4) | 0 : mr === 'd' ? 6 + s * 2 : mr === 'o' ? 10 : mr === 'p' || mr === 'm' ? 4 : mr === 's' ? 2 : 2;
    const top = Math.max(crown, 2), bot = H - 1;
    // setbacks: the tower steps in twice on the way up
    const inset = y => { if (mr !== 's') return 1; const f = (y - top) / Math.max(1, bot - top); return f < 0.18 ? Math.max(1, Math.round(W0 * 0.26)) : f < 0.4 ? Math.max(1, Math.round(W0 * 0.14)) : 1; };
    for (let y = top; y < bot; y++) { const a = inset(y); r(a, y, W0 - a * 2, 1, wall); r(a, y, 1, 1, hi); r(W0 - a - 1, y, 1, 1, 'rgba(0,0,0,.18)'); }
    // windows
    const gTop = bot - 4;
    for (let y = top + 2; y < gTop; y++) {
      const a = inset(y) + 1, b2 = W0 - inset(y) - 1, row = y - top;
      switch (mw) {
        case 'c': for (let x = a; x < b2; x++) r(x, y, 1, 1, (x - a) % 3 === 2 ? hi : ofHash(seed, y >> 1, x >> 1) < 14 ? OF_LIT : (row % 2 ? '#3f6a84' : '#4f7f9c')); break;
        case 'r': if (row % 3 === 0) for (let x = a; x < b2; x++) r(x, y, 1, 1, ofHash(seed, y, x >> 2) < 18 ? OF_LIT : '#38505f'); break;
        case 'b': for (let x = a; x < b2; x++) r(x, y, 1, 1, (x - a) % 2 ? hi : ofHash(seed, y >> 1, x) < 12 ? OF_LIT : '#3f6a84'); break;
        case 'g': if (row % 2 === 0) for (let x = a; x < b2; x += 2) r(x, y, 1, 1, ofHash(seed, y, x) < 16 ? OF_LIT : '#2d3640'); break;
        case 't': if (row % 4 < 3) for (let x = a + 1; x < b2 - 1; x += 3) r(x, y, 1, 1, ofHash(seed, y >> 2, x) < 15 ? OF_LIT : '#2d2f36'); break;
        case 'a': if (row % 4 < 3) for (let x = a + 1; x < b2 - 1; x += 3) r(x, y, 1, 1, row % 4 === 0 ? hi : ofHash(seed, y >> 2, x) < 15 ? OF_LIT : '#2d2f36'); break;
        default: if (row % 3 === 1) for (let x = a + 1; x < b2 - 1; x += 3) r(x, y, 1, 1, ofHash(seed, y, x) < 12 ? OF_LIT : '#2d2f36');
      }
    }
    if (mc === 't') for (let y = top; y < gTop; y += 4) r(1, y, W0 - 2, 1, '#5e4527');
    if (mc === 'n') for (let y = top + 1; y < gTop; y += 3) for (let x = 1 + (y % 2); x < W0 - 1; x += 3) r(x, y, 1, 1, '#4f8a3e');
    if (mc === 'h') for (let x = 2; x < W0 - 1; x += 4) r(x, top, 1, gTop - top, '#a07a48');
    // the street front: a lobby, a door, and the sign in the sector's colour
    r(1, gTop, W0 - 2, 1, hi);
    if (D.era >= 7) { r(2, gTop + 1, W0 - 4, 3, '#7fb6d8'); for (let x = 3; x < W0 - 2; x += 3) r(x, gTop + 1, 1, 3, hi); }
    else { r(1, gTop + 1, W0 - 2, 3, wall); for (let x = 2; x < W0 - 2; x += 3) r(x, gTop + 2, 1, 1, '#2d2f36'); r((W0 >> 1) - 1, gTop + 1, 2, 3, '#201814'); }
    r((W0 >> 1) - 2, gTop, 4, 1, sec);
    // the crown
    const cx = W0 >> 1, a0 = inset(top);
    switch (mr) {
      case 'p': r(cx - 2, top - 4, 4, 1, rhi); r(2, top - 3, W0 - 4, 1, rf); r(1, top - 2, W0 - 2, 2, rf); r(1, top - 1, W0 - 2, 1, rlo); break;
      case 'm': r(2, top - 4, W0 - 4, 1, '#6a747e'); r(1, top - 3, W0 - 2, 3, '#5a6470'); for (let x = 3; x < W0 - 2; x += 3) r(x, top - 2, 1, 1, '#d8d4c8'); break;
      case 'd': { const R0 = Math.min(cx - 1, crown - 1); for (let k = 0; k < R0; k++) { const hw = Math.round(Math.sqrt(R0 * R0 - k * k)); r(cx - hw, top - 1 - k, hw * 2, 1, k < R0 / 2 ? '#6a9a8a' : '#7fb0a0'); } r(cx, top - R0 - 2, 1, 2, '#d8a53a'); break; }
      case 'c': { for (let k = 0; k < crown - 1; k++) { const hw = Math.max(0, Math.round((1 - k / (crown - 1)) * Math.max(1, W0 / 6))); r(cx - hw, top - 1 - k, hw * 2 + 1, 1, k % 3 ? hi : wall); } r(cx, 0, 1, 2, '#d8d4c8'); break; }
      case 'o': r(cx - 2, top - 9, 4, 9, wall); r(cx - 2, top - 9, 4, 1, hi); r(cx - 1, top - 7, 2, 2, '#efe7d3'); r(cx, top - 7, 1, 1, '#2d2f36'); r(cx - 1, top - 10, 2, 1, rf); break;
      case 'h': r(a0, top - 2, W0 - a0 * 2, 2, '#3a3d42'); r(cx - 2, top - 2, 4, 2, '#55595f'); r(cx - 1, top - 2, 1, 2, '#efefef'); r(cx + 1, top - 2, 1, 2, '#efefef'); r(a0, top - 3, 1, 1, '#ff4a3a'); r(W0 - a0 - 1, top - 3, 1, 1, '#ff4a3a'); break;
      case 'g': r(a0, top - 1, W0 - a0 * 2, 1, '#4f8a3e'); for (let x = a0 + 1; x < W0 - a0 - 1; x += 3) { r(x, top - 3, 2, 2, '#5f9a48'); r(x, top - 3, 1, 1, '#79b45a'); } break;
      case 'x': for (let x = 1; x < W0 - 1; x++) r(x, top - 1 - ((x - 1) % 4 < 2 ? (x - 1) % 4 : 0), 1, 1 + ((x - 1) % 4 < 2 ? (x - 1) % 4 : 0), (x - 1) % 4 === 1 ? '#7fb6d8' : '#70757c'); break;
      case 's': r(a0, top - 1, W0 - a0 * 2, 1, hi); if (fl > 12) { r(cx, top - 6, 1, 5, '#70757c'); r(cx, top - 7, 1, 1, '#ff4a3a'); } break;
      default: r(1, top - 1, W0 - 2, 1, hi); if (fl > 6) { r(2, top - 2, 3, 1, '#70757c'); r(W0 - 5, top - 2, 2, 1, '#70757c'); }
    }
    // a flag or a lit sign on top of anything taller than its neighbours
    if (fl >= 3 && mr !== 'c' && mr !== 'o') { r(W0 - 3, Math.max(0, top - 5 - (mr === 'd' ? crown - 2 : 0)), 1, 4, '#55595f'); r(W0 - 2, Math.max(0, top - 5 - (mr === 'd' ? crown - 2 : 0)), 2, 2, sec); }
    r(1, H - 1, W0 - 2, 1, 'rgba(0,0,0,.25)');
  });
}
// A campus or business park: two or three low buildings, lawns and trees, a car park with cars.
function campus(r, W0, H, fl, wall, hi, mr, mw, sec, seed) {
  const g0 = H - W0;
  r(0, g0 + 2, W0, W0 - 2, '#7f9a5e');
  for (let k = 0; k < 9; k++) { const x = 2 + (ofHash(seed, k, 1) % (W0 - 5)), y = g0 + 4 + (ofHash(seed, k, 2) % (W0 - 8)); r(x, y, 3, 2, '#4f7a3a'); r(x + 1, y - 1, 1, 1, '#6a9a4a'); }
  // the car park along the front, with cars in it
  r(1, H - 7, W0 - 2, 5, '#55595f'); for (let x = 2; x < W0 - 2; x += 3) { r(x, H - 7, 1, 5, '#8c8a82'); if (ofHash(seed, x, 3) < 70) r(x + 1, H - 6, 1, 2, OF_CARS[ofHash(seed, x, 4) % 6]); }
  const blocks = [[2, g0 + 3, Math.round(W0 * 0.45), 10 + fl * 2], [Math.round(W0 * 0.55), g0 + 6, Math.round(W0 * 0.4), 8 + fl * 2], [Math.round(W0 * 0.3), g0 + 1, Math.round(W0 * 0.32), 6 + fl * 2]];
  blocks.sort((a, b) => a[1] + a[3] - (b[1] + b[3]));
  for (const [x, y0, w, h] of blocks) {
    const y = Math.min(y0 + 8, H - 9 - h), bot = y + h;
    r(x, y, w, h, wall); r(x, y, w, 1, hi); r(x, y, 1, h, hi); r(x + w - 1, y, 1, h, 'rgba(0,0,0,.18)');
    for (let yy = y + 2; yy < bot - 1; yy += (mw === 'r' ? 3 : 2)) for (let xx = x + 1; xx < x + w - 1; xx += (mw === 'c' || mw === 'r' ? 1 : 2)) r(xx, yy, 1, 1, ofHash(seed, yy, xx) < 15 ? OF_LIT : '#3f6a84');
    if (mr === 'g') { r(x, y - 1, w, 1, '#4f8a3e'); for (let xx = x + 1; xx < x + w - 1; xx += 3) r(xx, y - 2, 1, 1, '#79b45a'); }
    else if (mr === 'x') for (let xx = x; xx < x + w; xx++) r(xx, y - ((xx - x) % 3 === 1 ? 1 : 0), 1, 1, '#70757c');
    else r(x, y - 1, w, 1, '#70757c');
    r(x + (w >> 1) - 1, bot - 2, 2, 2, '#7fb6d8');
  }
  r(W0 - 4, g0 + 1, 1, 6, '#55595f'); r(W0 - 3, g0 + 1, 2, 2, sec);
  r(1, H - 1, W0 - 2, 1, 'rgba(0,0,0,.25)');
}
