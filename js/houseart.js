'use strict';
// Houses up to the tenement, drawn in the town's own vernacular (see townlook.js): walls of logs, half-timber, stone, brick or
// adobe; thatch, tile, slate or flat roofs; shutters and flower boxes where people are doing well, boarded windows, moss and
// washing lines where they are not; soot in the works towns and scorch marks after a fight. Same 12-pixel grid as sprites.js.
const HA_SHUT = ['#3f6f8f', '#7a3a2a', '#4f7a3f', '#2f4f6f'];
const HA_THATCH = ['#c9a860', '#dcc07a', '#9c7f3e', '#b8964e'], HA_SLATE = ['#5d6670', '#76808a', '#454c55', '#535b65'];
const HA_SHOP = ['#b8423a', '#3a6fa8', '#4f8a3e', '#c9902a'];

function haWall(r, x, y, w, h, mat, E, cond, v) {
  if (mat === 0) {
    const bm = '#5e4527';
    if (E === 0) { for (let j = 0; j < h; j++) r(x, y + j, w, 1, j % 2 ? '#7a5a34' : '#94704a'); r(x, y, 1, h, bm); r(x + w - 1, y, 1, h, bm); return; }  // logs
    r(x, y, w, h, cond >= 2 ? '#e2d4b0' : '#cdbb92');  // plaster between the beams
    r(x, y, 1, h, bm); r(x + w - 1, y, 1, h, bm); r(x, y, w, 1, bm); r(x + (w >> 1), y, 1, h, bm);
    if (h > 3) { r(x, y + (h >> 1), w, 1, bm); r(x + 1, y + 1, 1, 1, bm); r(x + w - 2, y + 1, 1, 1, bm); }
  } else if (mat === 1) {
    r(x, y, w, h, '#a39f95');
    for (let j = 0; j < h; j++) for (let i = (j % 2) * 2; i < w; i += 3) r(x + i, y + j, 1, 1, '#87837a');
    for (let k = 0; k < (w * h) >> 3; k++) { const q = hash2(k, v, 41); r(x + ((q * 977) | 0) % w, y + ((q * 131) | 0) % h, 1, 1, '#b9b5ab'); }
  } else if (mat === 2) {
    for (let j = 0; j < h; j++) r(x, y + j, w, 1, j % 2 ? '#a0533b' : '#ad5e43');
    for (let j = 0; j < h; j += 2) r(x + ((j >> 1) % 2) * 3 + 1, y + j, 1, 1, '#c27a5c');
  } else {
    const white = cond >= 2 && E >= 1;  // limewash where people can afford it
    r(x, y, w, h, white ? '#e8dfca' : '#cba878'); r(x, y + h - 1, w, 1, white ? '#cfc3a6' : '#a8895a');
    if (cond === 0) { r(x + 2, y + 1, 1, 2, '#9c7f52'); r(x + w - 3, y + 2, 1, 1, '#9c7f52'); }
  }
}
// A pitched roof seen from the front: narrow ridge, wide eaves.
function haRoof(r, x, y, w, h, roof, pal, cond, v) {
  const P = roof === 1 ? ROOFS[pal] : roof === 2 ? HA_SLATE : HA_THATCH, rf = P[0], hi = P[1], lo = P[2], rd = roof === 1 ? shadeHex(rf, -0.1) : P[3];
  for (let j = 0; j < h; j++) {
    const ins = Math.max(0, 2 - j), last = j === h - 1, xx = x + ins - (last ? 1 : 0), ww = w - ins * 2 + (last ? 2 : 0);
    r(xx, y + j, ww, 1, j === 0 ? hi : last ? lo : rf);
    if (j === 0 || last) continue;
    if (roof === 0) { for (let i = j % 2; i < ww; i += 2) r(xx + i, y + j, 1, 1, rd); }  // straw
    else if (j % 2 === 0) { for (let i = (j >> 1) % 2; i < ww; i += 2) r(xx + i, y + j, 1, 1, rd); }  // courses of tile or slate
    r(xx, y + j, 1, 1, hi);
  }
  if (roof === 0) for (let i = 0; i < w + 2; i += 2) r(x - 1 + i, y + h, 1, 1, lo);  // thatch hangs ragged below the eaves
  if (cond === 0) { r(x + 2 + v % 3, y + 2, 2, 1, roof === 0 ? '#7a6a3a' : '#6d7f45'); r(x + w - 4, y + h - 2, 1, 1, '#3a2c1e'); }
  else if (cond === 3) r(x + 2, y, w - 4, 1, shadeHex(hi, 0.18));
}
function haWin(r, x, y, w, h, E, cond, v, k, scar, roomy) {
  const q = hash2(x * 7 + k, y, v);
  if (cond === 0 && q > 0.6) { r(x, y, w, h, '#8a6a40'); r(x, y + (h >> 1), w, 1, '#6e5232'); return; }  // boarded up
  r(x, y, w, h, E === 0 ? '#2c2118' : q > 0.72 ? '#f0e2a4' : E === 1 ? '#3d4650' : '#384a5c');
  if (E >= 1 && h >= 2) r(x, y, 1, 1, '#9fb4c4');
  if (scar && q < 0.2) { r(x, y - 1, w + 1, 1, '#2a2420'); r(x, y, w, h, '#1e1814'); }  // burnt out
  if (roomy && cond >= 2 && E >= 1) { const s = HA_SHUT[(v + k) & 3]; r(x - 1, y, 1, h, s); r(x + w, y, 1, h, s); }  // painted shutters
  else if (cond >= 2 && E >= 1) r(x, y + h, w, 1, '#d9d4c8');  // a stone sill
  if (cond === 3 && !(k & 1)) { r(x, y + h, w, 1, '#4f8a3e'); r(x + (v & 1), y + h, 1, 1, '#e05a6a'); }  // a window box
}
function haDoor(r, x, y, h, E, cond, pal, v) {
  r(x, y, 2, h, cond >= 2 && E >= 1 ? ROOFS[(pal + v + 1) % ROOFS.length][2] : '#4a3420'); r(x, y, 2, 1, '#2a1d12');
  if (E >= 1) r(x + 1, y + (h >> 1), 1, 1, '#c9a14a');
}
function haChimney(r, x, y, mat) { r(x, y, 2, 3, mat === 1 ? '#8b887f' : '#7a3e2c'); r(x, y, 2, 1, '#3a3430'); }
function haScorch(r, w, h, v) { for (let k = 0; k < 3; k++) { const q = hash2(k, v, 5); r(1 + ((q * 97) | 0) % (w - 3), 2 + ((q * 53) | 0) % (h - 4), 2, 1, 'rgba(24,18,14,.55)'); } }
// The post pass: soot dulls everything in the works towns, and neglect greys a house down.
function haPost(L) {
  if (!L.soot && L.cond > 0) return null;
  return g => { g.globalCompositeOperation = 'source-atop'; g.fillStyle = L.soot ? 'rgba(28,24,22,.26)' : 'rgba(96,88,72,.16)'; g.fillRect(0, 0, g.canvas.width, g.canvas.height); g.globalCompositeOperation = 'source-over'; };
}
function vernacularHouse(tier, pal, v, L) {
  const id = HOUSES[tier].id, E = L.eb, cond = L.cond, scar = L.scar, post = haPost(L);
  const pitched = L.roof === 3 ? 1 : L.roof, shadow = 'rgba(0,0,0,.25)';
  switch (id) {
    case 'tent': return mkSprite(12, 12, r => {
      const hide = ['#b89a6e', '#a98a63', '#c2a477', '#9e7f58'][v & 3], hd = shadeHex(hide, -0.18), hl = shadeHex(hide, 0.14);
      r(4, 0, 1, 2, '#5a4128'); r(7, 0, 1, 2, '#5a4128'); r(5, 1, 2, 1, '#5a4128');  // poles crossed at the smoke hole
      for (let j = 0; j < 9; j++) { const w = 2 + Math.round(j * 1.1), x = 6 - (w >> 1); r(x, 2 + j, w, 1, hide); r(x, 2 + j, 1, 1, hl); r(x + w - 1, 2 + j, 1, 1, hd); }
      r(2, 7, 8, 1, ['#a84a2a', '#3f5a7a', '#d6b86a', '#5a7a3a'][(v + pal) & 3]);  // a painted band
      r(5, 6, 2, 5, '#3c2c1a'); r(6, 6, 1, 5, '#2a1e12'); r(1, 11, 10, 1, shadow);
    }, post);
    case 'hut': return mkSprite(12, 12, r => {
      const mud = L.mat >= 2, wall = mud ? '#b8956a' : '#9a7a4e', wd = shadeHex(wall, -0.2);
      r(2, 7, 8, 4, wall); r(2, 7, 1, 4, shadeHex(wall, 0.12)); r(9, 7, 1, 4, wd);
      if (!mud) for (let j = 0; j < 4; j++) for (let i = j % 2; i < 8; i += 2) r(2 + i, 7 + j, 1, 1, wd);  // wattle
      for (let j = 0; j < 7; j++) { const w = Math.min(12, 2 + j * 2), x = 6 - (w >> 1); r(x, 1 + j, w, 1, j === 0 ? HA_THATCH[1] : j === 6 ? HA_THATCH[2] : HA_THATCH[0]); for (let i = j % 2; i < w; i += 2) if (j && j < 6) r(x + i, 1 + j, 1, 1, HA_THATCH[3]); }
      r(5, 0, 2, 1, '#7a5a34'); const dx = v & 1 ? 3 : 6; r(dx, 8, 2, 3, '#3c2c1a');
      if (cond === 0) r(3 + v % 4, 4, 2, 1, '#7a6a3a');
      if (scar) haScorch(r, 12, 12, v);
      r(1, 11, 10, 1, shadow);
    }, post);
    case 'mudhouse': return mkSprite(12, 12, r => {
      const dx = v & 1 ? 2 : 7, wx = v & 1 ? 7 : 3;
      if (L.roof === 3 || L.mat === 3) {  // flat roof behind a parapet, roof beams poking through
        r(1, 3, 10, 2, '#d9bc8c'); r(1, 3, 10, 1, '#e6cda2'); r(1, 5, 10, 1, '#a8895a');
        haWall(r, 1, 6, 10, 5, 3, E, cond, v);
        for (let i = 2; i < 10; i += 3) r(i, 6, 1, 1, '#6b4f30');
        if (v & 2) { r(7, 1, 3, 2, '#cba878'); r(7, 1, 3, 1, '#e0c494'); r(8, 2, 1, 1, '#4a3620'); }  // a room on the roof
      } else { haRoof(r, 1, 1, 10, 5, 0, pal, cond, v); haWall(r, 1, 6, 10, 5, 3, E, cond, v); }
      haDoor(r, dx, 8, 3, E, cond, pal, v); haWin(r, wx, 7, 2, 1, E, cond, v, 0, scar, true);
      if (scar) haScorch(r, 12, 12, v);
      r(1, 11, 10, 1, shadow);
    }, post);
    case 'cottage': case 'stonehouse': return mkSprite(12, 13, r => {
      const mat = id === 'cottage' ? (L.mat === 3 ? 3 : 0) : (L.mat === 2 ? 2 : 1);
      const d = v % 3, slots = [2, 5, 8];
      haWall(r, 1, 7, 10, 5, mat, E, cond, v);
      if (mat === 1) r(1, 11, 10, 1, '#7f7b70');  // a plinth of bigger stones
      haRoof(r, 1, 1, 10, 6, pitched, pal, cond, v);
      if (E >= 1 || mat !== 0) haChimney(r, v & 2 ? 8 : 2, 0, mat);
      haDoor(r, slots[d], 9, 3, E, cond, pal, v);
      for (let k = 0; k < 3; k++) if (k !== d) { haWin(r, slots[k], 8, 2, 2, E, cond, v, k, scar, true); if (mat >= 1) r(slots[k], 7, 2, 1, '#c9c4b8'); }
      if (scar) haScorch(r, 12, 13, v);
      r(1, 12, 10, 1, shadow);
    }, post);
    case 'townhouse': return mkSprite(12, 18, r => {
      const mat = L.mat, jetty = mat === 0 && E >= 1;
      haWall(r, 1, 13, 10, 4, mat, E, cond, v);
      haWall(r, jetty ? 0 : 1, 6, jetty ? 12 : 10, 7, mat, E, cond, v + 1);
      if (jetty) r(0, 13, 12, 1, '#3e2c18');  // the upper floors lean out over the street
      haRoof(r, 1, 1, 10, 5, pitched, pal, cond, v);
      if (v & 1) { r(5, 2, 2, 3, pitched === 2 ? HA_SLATE[1] : ROOFS[pal][1]); r(5, 3, 2, 1, '#3d4650'); }  // a dormer
      haChimney(r, v & 2 ? 9 : 1, 0, mat);
      if (mat === 1 || cond === 3) r(1, 6, 10, 1, '#d9d4c8');  // cornice
      for (let f = 0; f < 2; f++) for (let k = 0; k < 3; k++) haWin(r, 2 + k * 3, 7 + f * 3, 2, 2, E, cond, v, f * 3 + k, scar);
      if (v === 3 && E >= 1) {  // a shop on the ground floor
        const a = HA_SHOP[(pal + v) & 3];
        for (let i = 1; i < 11; i++) r(i, 13, 1, 1, i % 2 ? a : '#efe9da');
        r(2, 14, 4, 2, '#f0e2a4'); r(2, 14, 4, 1, '#c9b46a');
        haDoor(r, 8, 14, 3, E, cond, pal, v);
      } else { haDoor(r, 5, 14, 3, E, cond, pal, v); haWin(r, 2, 14, 2, 2, E, cond, v, 7, scar); haWin(r, 8, 14, 2, 2, E, cond, v, 8, scar); }
      if (scar) haScorch(r, 12, 18, v);
      r(1, 17, 10, 1, shadow);
    }, post);
    case 'tenement': return mkSprite(12, 24, r => {
      const mat = L.mat === 1 ? 1 : L.mat === 3 ? 3 : 2;
      r(1, 3, 10, 2, '#55504a'); r(1, 3, 10, 1, '#6b665f');
      r(2, 0, 2, 3, '#5b3026'); r(8, 0, 2, 3, '#5b3026'); r(2, 0, 2, 1, '#2a2420'); r(8, 0, 2, 1, '#2a2420');
      haWall(r, 1, 5, 10, 18, mat, E, cond, v);
      r(1, 5, 10, 1, cond >= 2 ? '#d9d4c8' : '#7a766c');  // cornice
      for (let f = 0; f < 5; f++) for (let k = 0; k < 3; k++) haWin(r, 2 + k * 3, 6 + f * 3, 2, 2, E, cond, v, f * 3 + k, scar);
      if (cond <= 1) for (const yy of [8, 14]) { r(1, yy, 10, 1, 'rgba(70,60,50,.5)'); for (let k = 0; k < 4; k++) r(2 + k * 2 + (yy & 1), yy + 1, 1, 1 + (k & 1), ['#e8e4d8', '#b8423a', '#3a6fa8', '#d6c98c'][(k + v) & 3]); }  // washing out to dry
      if (v & 1) { const a = HA_SHOP[(pal + v) & 3]; for (let i = 1; i < 11; i++) r(i, 20, 1, 1, i % 2 ? a : '#efe9da'); r(2, 21, 3, 2, '#f0e2a4'); }
      haDoor(r, 6, 20, 3, E, cond, pal, v);
      if (scar) haScorch(r, 12, 24, v);
      r(1, 23, 10, 1, shadow);
    }, post);
  }
  return null;
}
