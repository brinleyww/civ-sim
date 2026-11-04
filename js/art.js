'use strict';
// People, trees, animals and ships, drawn at 24 pixels to a tile: twice the detail of the buildings' source art, in the same style.
// Everything is cached the first time it is seen, so a crowd costs little more than one person.

const ART_PX = 24;                // art pixels per tile
const HAIRS = ['#2a1d14', '#4a2e1a', '#6b4423', '#8c5f2f', '#b4883f', '#d6b86a', '#7a3a1f', '#a53f1f', '#1a1a1e', '#8e8e8e'];
const artCache = new Map();
function shadeHex(h, f) {
  const n = parseInt(h.slice(1), 16);
  const a = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => clamp(Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)), 0, 255));
  return `rgb(${a[0]},${a[1]},${a[2]})`;
}
function toHexRgb(c) {  // accepts '#rrggbb' or hsl() from a realm colour
  if (c[0] === '#') return c;
  const m = c.match(/hsl\((\d+),(\d+)%,(\d+)%\)/);
  if (!m) return '#888888';
  const [r, g, b] = hslRgb(m[1] / 360, m[2] / 100, m[3] / 100);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// What people wear follows the age their town lives in, then their work.
const JOB_CLOTHES = {
  [J.FORAGE]: ['#7a8c4a', '#6a7c3a'], [J.HUNT]: ['#8a6238', '#6e4c2a'], [J.FISH]: ['#4f7fa3', '#3d6685'], [J.FARM]: ['#a8913f', '#8c7833'], [J.HERD]: ['#a58a64', '#87704e'], [J.WOOD]: ['#5f7a3a', '#4d632f'],
  [J.STONE]: ['#878a8f', '#6e7176'], [J.CLAY]: ['#a56a44', '#8a5637'], [J.MINE]: ['#54575d', '#42454a'], [J.BUILD]: ['#c9792f', '#a86326'], [J.CRAFT]: ['#8b5aa8', '#71478a'], [J.TRADE]: ['#2f9f8c', '#267f70'],
  [J.SCHOLAR]: ['#d9d3c0', '#b8b29f'], [J.SERVICE]: ['#5a7fc8', '#4667a8'], [J.SAILOR]: ['#2f6f9f', '#265a82'], [J.SOLDIER]: ['#a33a3a', '#852e2e'], [J.GARDEN]: ['#5f9a58', '#4b7f46'], [J.CHILD]: ['#d6c98c', '#b8ab70'], [J.ELDER]: ['#9a9385', '#7d776b'], [J.NONE]: ['#b0a896', '#8f8778'],
};
// A person, facing right, about 13 art pixels tall. frame: 0 standing, 1 and 2 walking, 3 working or striking.
function personSprite(skin, hair, sex, job, frame, era, small, wep, arm, polCol, mount, leader, carry) {
  const key = `p${skin}|${hair}|${sex}|${job}|${frame}|${era}|${small ? 1 : 0}|${wep}|${arm}|${polCol}|${mount}|${leader ? 1 : 0}|${carry}`;
  let c = artCache.get(key);
  if (c) return c;
  if (artCache.size > 9000) artCache.clear();
  c = document.createElement('canvas');
  const W0 = 20, H0 = 22; c.width = W0; c.height = H0;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const cx = 9, base = 20;
  const skinD = shadeHex(skin, -0.18), hairC = HAIRS[hair], hairL = shadeHex(hairC, 0.2);
  // shadow on the ground
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(cx - 3, base + 1, 7, 1);
  if (mount === 2) {   // a tank, in the realm's colours
    const body = shadeHex(polCol, -0.45), hi = shadeHex(polCol, -0.25);
    r(1, 14, 17, 3, body); r(2, 13, 15, 1, hi); r(0, 17, 19, 3, '#2c2f33');
    for (let k = 1; k < 18; k += 3) r(k, 18, 1, 1, '#55595f');
    r(6, 10, 8, 3, hi); r(7, 9, 6, 1, shadeHex(polCol, -0.1)); r(13, 11, 7, 1, '#3a3d42');
    c.footX = 9; c.footY = base; artCache.set(key, c); return c;
  }
  const yb = mount === 1 ? base - 5 : base;
  if (mount === 1) {   // horse beneath
    const hc = '#6b4a2c', hd = '#533820', leg = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    r(3, 12, 12, 5, hc); r(3, 12, 12, 1, shadeHex(hc, 0.14)); r(14, 8, 3, 6, hc); r(15, 6, 4, 3, hc); r(18, 7, 1, 2, hd); r(15, 5, 2, 1, hd);
    r(1, 13, 2, 4, hd);  // tail
    r(4, 17, 2, 3 + leg, hd); r(7, 17, 2, 3 - leg, hd); r(10, 17, 2, 3 + leg, hd); r(13, 17, 2, 3 - leg, hd);
    r(6, 11, 6, 2, polCol);
  }
  const height = small ? 0.72 : 1;
  const legH = small ? 2 : 3, bodyH = small ? 4 : 5;
  const top = yb - legH - bodyH - 3;
  const [cl0, cl1] = job === J.SOLDIER ? [polCol, shadeHex(polCol, -0.25)] : (JOB_CLOTHES[job] || JOB_CLOTHES[J.NONE]);
  let clothes = cl0, dark = cl1;
  // the stone age wears hides; the modern age wears jackets
  if (era <= 1 && job !== J.SOLDIER) { clothes = shadeHex('#8d6a43', ((job * 7) % 5 - 2) * 0.05); dark = '#6d5233'; }
  else if (era >= 7 && job !== J.SOLDIER && job !== J.CHILD && job !== J.ELDER) { const v = ['#3a4655', '#4a4a50', '#2f3a48'][job % 3]; if (job > J.BUILD) { clothes = v; dark = shadeHex(v, -0.2); } }
  // legs
  const legA = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  const trouser = era >= 6 ? '#2e3540' : era <= 1 ? skinD : shadeHex(dark, -0.15);
  if (!(mount === 1)) {
    r(cx - 2 + (legA < 0 ? -1 : 0), yb - legH, 2, legH + (legA < 0 ? -1 : 0), trouser);
    r(cx + 1 + (legA > 0 ? 1 : 0), yb - legH, 2, legH + (legA > 0 ? -1 : 0), trouser);
    r(cx - 2 + (legA < 0 ? -1 : 0), yb - 1 + (legA < 0 ? -1 : 0), 2, 1, '#2b2118');
    r(cx + 1 + (legA > 0 ? 1 : 0), yb - 1 + (legA > 0 ? -1 : 0), 2, 1, '#2b2118');
  } else { r(cx - 3, yb - legH, 2, legH + 2, trouser); }
  // body, shaded left to right; skirts and robes run longer
  const by = yb - legH - bodyH;
  const robe = (sex === 0 && era >= 2 && era <= 6 && job !== J.SOLDIER) || job === J.SCHOLAR;
  r(cx - 2, by, 5, bodyH + (robe ? 2 : 0), clothes);
  r(cx - 2, by, 1, bodyH + (robe ? 2 : 0), shadeHex(toHexRgb(clothes), 0.12));
  r(cx + 2, by, 1, bodyH + (robe ? 2 : 0), dark);
  r(cx - 2, by + bodyH - 2, 5, 1, dark);
  // armour over the top
  const A = ARMORS[arm || 0];
  if (A && A.col) { r(cx - 2, by, 5, 3, A.col); r(cx - 2, by, 1, 3, shadeHex(A.col, 0.25)); r(cx + 2, by, 1, 3, shadeHex(A.col, -0.2)); r(cx - 2, by + 3, 5, 1, polCol); }
  if (job === J.SOLDIER && arm === 5) { r(cx - 2, by, 5, bodyH, shadeHex(polCol, -0.4)); r(cx - 1, by + 2, 3, 1, shadeHex(polCol, -0.2)); }
  // near arm
  const swing = frame === 3 ? -2 : frame === 1 ? 1 : frame === 2 ? -1 : 0;
  r(cx - 3, by + 1, 1, 3, skinD);
  r(cx + 3, by + 1 + (swing < 0 ? swing : 0), 1, 3, skin);
  // head
  const hy = by - 3;
  r(cx - 1, hy, 4, 3, skin); r(cx + 2, hy + 1, 1, 1, skinD); r(cx, hy + 3, 2, 1, skinD);
  r(cx + 2, hy + 1, 1, 1, '#1e1a16');   // eye
  // hair: short or long, by person
  r(cx - 1, hy - 1, 4, 1, hairC); r(cx - 2, hy, 1, sex === 0 ? 3 : 2, hairC); r(cx - 1, hy, 1, 1, hairL);
  if (sex === 0) { r(cx - 2, hy + 3, 1, 2, hairC); }
  if (job === J.ELDER) { r(cx - 1, hy - 1, 4, 1, '#c8c8c8'); r(cx - 2, hy, 1, 2, '#c8c8c8'); }
  // what they're holding and wearing on their head
  const hx = cx + 4, hyy = by + 1 + (swing < 0 ? swing : 0);
  if (job === J.SOLDIER) {
    const W1 = WEAPONS[wep || 0], k = W1.id;
    if (arm >= 2 && arm <= 4) { r(cx - 1, hy - 1, 4, 2, A.col); r(cx - 1, hy - 1, 1, 2, shadeHex(A.col, 0.3)); if (arm === 4) r(cx - 1, hy + 1, 2, 1, A.col); }
    if (arm === 5) { r(cx - 2, hy - 1, 6, 2, '#59605a'); r(cx - 1, hy - 2, 4, 1, '#6d756e'); }
    if (arm === 6) { r(cx - 2, hy - 1, 5, 2, '#30363c'); }
    if (arm === 7) { r(cx - 2, hy - 1, 5, 2, '#6d6a52'); r(cx - 1, hy, 3, 1, '#57553f'); }
    if (W1.kind === 1) {  // bows and crossbows
      if (k === 'xbow') { r(hx, hyy, 4, 1, '#6b4a2c'); r(hx + 3, hyy - 1, 1, 3, '#7c8288'); }
      else if (k === 'sling') { r(hx, hyy - (frame === 3 ? 4 : 0), 1, 4, '#a58a64'); r(hx, hyy - (frame === 3 ? 5 : -4), 2, 1, '#8b887f'); }
      else if (k === 'javelin') { r(hx - 1, hyy - 6, 1, 10, '#7a5a35'); r(hx - 1, hyy - 7, 1, 1, '#8a8378'); r(hx + 1, hyy - 5, 1, 9, '#7a5a35'); }
      else { g.strokeStyle = '#6b4a2c'; g.lineWidth = 1; g.beginPath(); g.arc(hx - 2, hyy + 1, k === 'lbow' ? 5 : 4, -1.1, 1.1); g.stroke(); r(hx + (k === 'lbow' ? 0 : -1), hyy - 3, 1, 8, 'rgba(235,235,225,.45)'); }
    } else if (W1.kind === 2) {  // guns
      const len = k === 'musket' || k === 'flint' ? 8 : k === 'rifle' ? 7 : 6;
      r(hx - 2, hyy + 1, len, 1, '#2d2f33'); r(hx - 3, hyy + 1, 2, 2, '#5a3f26');
      if (k === 'flint') r(hx + len - 2, hyy, 2, 1, '#c5ccd3');
      if (k === 'mg' || k === 'smart' || k === 'assault') r(hx + 1, hyy + 2, 1, 2, '#2d2f33');
      if (frame === 3) r(hx + len - 2, hyy, 2, 2, '#ffd34d');
    } else {  // blades, axes, spears
      const col = k === 'club' ? '#6b4a2c' : k === 'spear' ? '#8a8378' : k === 'axe' ? '#b98142' : k === 'bsword' ? '#c99a4a' : '#d6dbe0';
      if (k === 'spear') { r(hx, hyy - 7, 1, 12, '#7a5a35'); r(hx, hyy - 9, 1, 2, col); }
      else if (k === 'pike') { r(hx, hyy - 10, 1, 15, '#7a5a35'); r(hx, hyy - 12, 1, 2, '#c99a4a'); }
      else if (k === 'halberd') { r(hx, hyy - 8, 1, 13, '#7a5a35'); r(hx, hyy - 10, 3, 3, '#d6dbe0'); r(hx - 1, hyy - 9, 1, 1, '#d6dbe0'); }
      else if (k === 'lance') { r(hx - 2, hyy - 4, 12, 1, '#c9b48a'); r(hx + 10, hyy - 4, 2, 1, '#d6dbe0'); r(hx, hyy - 5, 2, 2, polCol); }
      else if (k === 'sabre') { r(hx, hyy - 6, 1, 7, '#d6dbe0'); r(hx + 1, hyy - 7, 1, 2, '#d6dbe0'); r(hx - 1, hyy, 3, 1, '#c99a4a'); }
      else if (k === 'axe') { r(hx, hyy - 4, 1, 7, '#7a5a35'); r(hx, hyy - 5, 3, 2, col); }
      else if (k === 'club') { r(hx, hyy - 3, 1, 5, '#6b4a2c'); r(hx, hyy - 5, 2, 2, '#5a3d22'); }
      else { r(hx, hyy - 6, 1, 7, col); r(hx - 1, hyy, 3, 1, '#7a5a35'); if (k === 'ssword') r(hx, hyy - 8, 1, 2, col); }
    }
    if (W1.kind === 0 && (arm === 2 || arm === 3)) { r(cx - 4, by + 1, 2, 4, polCol); r(cx - 4, by + 1, 1, 4, shadeHex(polCol, 0.25)); }  // shield
  } else switch (job) {
    case J.WOOD: r(hx, hyy - 4, 1, 7, '#7a5a35'); r(hx, hyy - 5, 3, 2, '#8d9299'); break;
    case J.MINE: case J.STONE: r(hx, hyy - 3, 1, 6, '#7a5a35'); r(hx - 2, hyy - 4, 5, 1, '#73777d'); r(cx - 1, hy - 1, 4, 1, job === J.MINE ? '#d6c23a' : hairC); break;
    case J.FARM: r(hx, hyy - 5, 1, 9, '#8a6a3a'); r(hx, hyy - 6, 3, 1, '#8d9299'); r(cx - 2, hy - 1, 6, 1, '#d6bf74'); r(cx - 1, hy - 2, 4, 1, '#d6bf74'); break;
    case J.FISH: r(hx, hyy - 7, 1, 10, '#7a5a35'); r(hx + 1, hyy - 7, 1, 1, '#9fb4c0'); break;
    case J.HUNT: r(hx, hyy - 7, 1, 12, '#7a5a35'); r(hx, hyy - 8, 1, 2, '#8a8378'); break;
    case J.BUILD: r(hx, hyy, 3, 1, '#6e5a3a'); r(hx + 2, hyy - 1, 1, 3, '#555'); if (era >= 6) { r(cx - 2, hy - 1, 5, 1, '#e8c23a'); r(cx - 1, hy - 2, 3, 1, '#e8c23a'); } break;
    case J.TRADE: r(cx - 4, by + 2, 2, 3, '#7a5a35'); r(cx - 4, by + 2, 2, 1, '#a07c4a'); break;
    case J.SCHOLAR: r(hx - 1, by + 2, 2, 3, '#e8dfc4'); r(hx - 1, by + 2, 1, 3, '#7a4a3a'); break;
    case J.SERVICE: r(cx - 1, hy - 2, 4, 1, shadeHex(clothes[0] === '#' ? clothes : '#5a7fc8', -0.2)); break;
    case J.SAILOR: r(cx - 1, hy - 1, 4, 1, '#e8e8e0'); break;
    case J.HERD: r(hx, hyy - 7, 1, 11, '#7a5a35'); r(hx + 1, hyy - 7, 1, 1, '#7a5a35'); break;
    case J.CRAFT: r(hx, hyy - 1, 2, 2, '#55585f'); r(hx, hyy + 1, 1, 2, '#7a5a35'); break;
    case J.GARDEN: r(hx, hyy - 4, 1, 8, '#7a5a35'); r(hx, hyy + 3, 3, 2, '#8d9299'); r(cx - 2, hy - 1, 6, 1, '#8fae5a'); r(cx - 1, hy - 2, 4, 1, '#8fae5a'); r(cx - 4, by + 2, 2, 3, '#6f8f3f'); break;
  }
  if (carry >= 0) { r(cx - 4, by - 1, 3, 4, carryCol(carry)); r(cx - 4, by - 1, 3, 1, shadeHex(toHexRgb(carryCol(carry)), 0.25)); }
  if (leader) { r(cx - 1, hy - 3, 4, 2, '#ffd34d'); r(cx - 1, hy - 4, 1, 1, '#ffd34d'); r(cx + 2, hy - 4, 1, 1, '#ffd34d'); r(cx, hy - 3, 1, 1, '#d8483a'); }
  c.footX = cx; c.footY = base;
  artCache.set(key, c);
  return c;
}

// ---- trees and animals ----
function treeSprite(kind, v) {
  const key = `t${kind}.${v}`;
  let c = artCache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = 24; c.height = 34;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(12, 31, 8, 2.5, 0, 0, 6.283); g.fill();
  const blob = (x, y, w, h, base, hi, lo) => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
      const nx = (dx + 0.5) / w * 2 - 1, ny = (dy + 0.5) / h * 2 - 1;
      if (nx * nx + ny * ny > 1 + (hash2(dx, dy, v) - 0.5) * 0.35) continue;
      const l = -nx * 0.5 - ny * 0.7 + (hash2(dx, dy, v + 3) - 0.5) * 0.7;
      r(x + dx, y + dy, 1, 1, l > 0.5 ? hi : l < -0.3 ? lo : base);
    }
  };
  if (kind === 0) {        // broadleaf
    r(11, 20, 3, 11, '#5e4228'); r(11, 20, 1, 11, '#7a5a38');
    const b = ['#4f8f3f', '#558f3a', '#4a8747'][v % 3];
    blob(3, 3 + v % 2, 18, 19, b, shadeHex(b, 0.22), shadeHex(b, -0.28));
    blob(6, 1 + v % 3, 12, 11, shadeHex(b, 0.06), shadeHex(b, 0.3), shadeHex(b, -0.15));
  } else if (kind === 1) { // conifer
    r(11, 24, 2, 7, '#54402a');
    const b = ['#2f6b4b', '#2a6346', '#34704e'][v % 3], hi = shadeHex(b, 0.22), lo = shadeHex(b, -0.3);
    for (let k = 0; k < 5; k++) { const w = 6 + k * 3, y = 2 + k * 5, x = 12 - w / 2; r(x, y, w, 5, b); r(x, y, w * 0.4, 5, hi); r(x + w * 0.7, y, w * 0.3, 5, lo); r(x, y + 4, w, 1, lo); }
    r(11, 0, 2, 3, b);
  } else if (kind === 2) { // jungle
    r(11, 16, 3, 15, '#6b4f30');
    const b = '#2f8f3f';
    blob(1, 6, 22, 13, b, shadeHex(b, 0.28), shadeHex(b, -0.3));
    blob(5, 1, 14, 10, shadeHex(b, 0.08), shadeHex(b, 0.34), shadeHex(b, -0.2));
    r(4, 24, 1, 6, '#3f9f4f'); r(19, 26, 1, 4, '#3f9f4f');
  } else {                 // acacia
    r(11, 18, 2, 13, '#6a4f30'); r(8, 16, 2, 4, '#6a4f30'); r(14, 15, 2, 4, '#6a4f30');
    const b = '#8a9a44';
    blob(2, 8, 20, 9, b, shadeHex(b, 0.26), shadeHex(b, -0.3));
  }
  artCache.set(key, c);
  return c;
}
// What people have planted, in three stages: just in the ground, grown, and ready to pick.
function plantSprite(k, stage, v) {
  const key = `pl${k}.${stage}.${v}`;
  let c = artCache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = 24; c.height = 26;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const P = PLANTS[k], leaf = `rgb(${P.col[0]},${P.col[1]},${P.col[2]})`, dot = `rgb(${P.dot[0]},${P.dot[1]},${P.dot[2]})`;
  const lit = shadeHex('#' + P.col.map(q => q.toString(16).padStart(2, '0')).join(''), 0.22), low = shadeHex('#' + P.col.map(q => q.toString(16).padStart(2, '0')).join(''), -0.3);
  const fruit = n => { if (stage === 2) for (let q = 0; q < n; q++) r(4 + ((hash2(q, v, k) * 15) | 0), 6 + ((hash2(q, v, k + 3) * 14) | 0), 2, 2, dot); };
  const soil = '#5a4630';
  const blob = (x, y, w, h) => { for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const nx = (dx + 0.5) / w * 2 - 1, ny = (dy + 0.5) / h * 2 - 1; if (nx * nx + ny * ny > 1 + (hash2(dx, dy, v + k) - 0.5) * 0.3) continue; const l = -nx * 0.5 - ny * 0.7 + (hash2(dx, dy, v + 3) - 0.5) * 0.6; r(x + dx, y + dy, 1, 1, l > 0.5 ? lit : l < -0.3 ? low : leaf); } };
  if (stage === 0) { r(7, 22, 10, 2, soil); r(11, 18, 2, 4, leaf); r(9, 18, 2, 1, lit); r(13, 19, 2, 1, lit); }
  else switch (PLANTS[k].id) {
    case 'berries': r(4, 22, 16, 2, soil); blob(4, 10, 16, 13); fruit(9); break;
    case 'sapling': r(11, 12, 2, 12, '#6b4f30'); blob(6, 2, 12, 12); break;
    case 'fruit': r(11, 14, 3, 10, '#6b4f30'); blob(3, 1, 18, 15); fruit(10); break;
    case 'veg': r(1, 18, 22, 6, soil); for (let q = 0; q < 3; q++) { r(3 + q * 7, 15, 4, 4, leaf); r(4 + q * 7, 13, 2, 2, lit); if (stage === 2) r(4 + q * 7, 18, 2, 2, q === 1 ? '#d8743a' : dot); } r(1, 22, 22, 1, '#3d2f20'); break;
    case 'herbs': r(2, 21, 20, 3, soil); for (let q = 0; q < 5; q++) { r(3 + q * 4, 15 + (q % 2), 2, 6, leaf); r(2 + q * 4, 14 + (q % 2), 4, 2, lit); if (stage === 2) r(3 + q * 4, 13 + (q % 2), 2, 1, dot); } break;
    case 'flax': r(1, 21, 22, 3, soil); for (let q = 0; q < 7; q++) { r(2 + q * 3, 11 + (q % 2) * 2, 1, 10, leaf); if (stage === 2) r(1 + q * 3, 10 + (q % 2) * 2, 3, 2, dot); else r(1 + q * 3, 10 + (q % 2) * 2, 3, 1, lit); } break;
    default: r(1, 22, 22, 2, soil); for (let q = 0; q < 3; q++) { r(3 + q * 8, 8, 1, 15, '#6b4f30'); r(1 + q * 8, 7, 7, 8, leaf); r(1 + q * 8, 7, 7, 2, lit); if (stage === 2) { r(3 + q * 8, 12, 3, 4, dot); r(4 + q * 8, 16, 1, 1, dot); } } r(0, 9, 24, 1, '#6b4f30');
  }
  artCache.set(key, c);
  return c;
}
function animalSprite(type, frame) {
  const key = `a${type}.${frame}`;
  let c = artCache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = 20; c.height = 14;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const H = HERD_TYPES[type], col = H.color, hi = shadeHex(col, 0.2), lo = shadeHex(col, -0.28);
  const leg = frame ? 1 : 0;
  const big = H.name === 'mammoth' ? 1 : 0;
  r(4 - big, 13, 12 + big * 2, 1, 'rgba(0,0,0,.22)');
  r(4 - big, 5 - big * 2, 10 + big * 2, 5 + big * 2, col); r(4 - big, 5 - big * 2, 10 + big * 2, 1, hi); r(4 - big, 9, 10 + big * 2, 1, lo);
  r(13 + big, 3 - big, 4, 4, col); r(16 + big, 4 - big, 2, 2, hi); r(17 + big, 4 - big, 1, 1, '#1a1a1a');
  r(5, 10, 2, 3 + (leg ? -1 : 0), lo); r(8, 10, 2, 3 - (leg ? 0 : 1), lo); r(11, 10, 2, 3 + (leg ? -1 : 0), lo);
  r(3 - big, 5 - big, 1, 3, lo);
  if (/deer|antelope/.test(H.name)) { r(15, 0, 1, 3, '#5a4228'); r(14, 1, 3, 1, '#5a4228'); }
  if (/aurochs|bison/.test(H.name)) { r(16, 2, 1, 2, '#ddd'); r(5, 4, 6, 2, lo); }
  if (/goat/.test(H.name)) { r(15, 1, 2, 2, '#b8b0a0'); }
  if (big) { r(18, 5, 1, 7, '#efe6d0'); r(17, 3, 2, 8, col); r(1, 6, 2, 4, lo); }
  if (/horses/.test(H.name)) { r(13, 2, 1, 4, lo); r(14, 2, 1, 1, lo); }
  if (/wolves/.test(H.name)) { r(14, 1, 1, 2, lo); r(16, 1, 1, 2, lo); r(1, 5, 3, 2, lo); r(17, 6, 2, 1, '#2a2a2a'); }
  if (/bears/.test(H.name)) { r(3, 3, 12, 3, col); r(4, 3, 10, 1, hi); r(14, 2, 1, 1, lo); r(16, 2, 1, 1, lo); r(17, 6, 2, 1, '#2a2118'); }
  if (/lions/.test(H.name)) { r(12, 1, 6, 7, '#8a6233'); r(14, 3, 4, 3, col); r(17, 4, 1, 1, '#1a1a1a'); r(1, 4, 3, 1, lo); r(0, 4, 1, 3, '#8a6233'); }
  artCache.set(key, c);
  return c;
}

// ---- ships: a real hull, a sail in the realm's colour, a wake behind ----
function shipSprite(kind, type, polCol, flip) {
  const key = `s${kind}.${type}.${polCol}.${flip ? 1 : 0}`;
  let c = artCache.get(key);
  if (c) return c;
  const D = (kind === 'war' ? WARSHIPS : MERCHANTMEN)[type], id = D.id;
  const L = D.len || 48;  // the bulk hulls are far longer than anything else afloat
  c = document.createElement('canvas'); c.width = L; c.height = 40;
  const g = c.getContext('2d');
  if (flip) { g.translate(L, 0); g.scale(-1, 1); }
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const wood = '#6b4a2c', woodL = '#8a6238', woodD = '#46301c';
  const sail = (x, y, w, h, col) => { r(x, y, w, h, col); r(x, y, 1, h, shadeHex(toHexRgb(col), -0.15)); r(x + w - 1, y, 1, h, shadeHex(toHexRgb(col), 0.2)); r(x, y + h - 1, w, 1, shadeHex(toHexRgb(col), -0.2)); };
  const hull = (x, y, w, h, col, hi, lo) => { r(x, y, w, h, col); r(x + 2, y + h, w - 4, 2, lo); r(x, y, w, 1, hi); r(x + w - 1, y - 1, 2, 2, col); };
  const cream = '#efe7d3';
  if (typeof SHIP_ART !== 'undefined' && SHIP_ART[id]) SHIP_ART[id](r, g, hull, sail, polCol, cream, wood, woodL, woodD, type);
  else switch (id) {
    case 'dugout': hull(14, 30, 18, 3, wood, woodL, woodD); r(20, 26, 2, 4, '#c8a57a'); r(26, 27, 2, 3, '#b08a60'); break;
    case 'outrigger': hull(10, 30, 26, 3, wood, woodL, woodD); r(14, 35, 20, 2, woodL); r(17, 32, 1, 3, woodD); r(30, 32, 1, 3, woodD); r(22, 12, 1, 18, woodD); g.fillStyle = polCol; g.beginPath(); g.moveTo(23, 12); g.lineTo(34, 27); g.lineTo(23, 27); g.closePath(); g.fill(); break;
    case 'barque': hull(13, 29, 22, 4, wood, woodL, woodD); r(23, 11, 1, 18, woodD); sail(16, 12, 14, 12, polCol); break;
    case 'cog': hull(10, 27, 28, 6, wood, woodL, woodD); r(10, 24, 6, 3, woodL); r(23, 7, 2, 20, woodD); sail(14, 8, 18, 14, cream); r(14, 14, 18, 3, polCol); break;
    case 'carrack': hull(7, 26, 34, 7, wood, woodL, woodD); r(7, 21, 8, 5, woodL); r(35, 22, 6, 4, woodL); r(17, 6, 2, 20, woodD); r(29, 9, 2, 17, woodD); sail(11, 7, 14, 12, cream); sail(25, 10, 11, 10, cream); r(11, 11, 14, 2, polCol); break;
    case 'indiaman': hull(5, 25, 38, 8, wood, woodL, woodD); r(5, 19, 10, 6, woodL); for (let k = 15; k < 40; k += 4) r(k, 27, 2, 2, '#1f1a14'); r(16, 3, 2, 22, woodD); r(29, 6, 2, 19, woodD); sail(9, 4, 16, 8, cream); sail(9, 13, 16, 7, cream); sail(24, 7, 13, 7, cream); sail(24, 15, 13, 6, cream); r(16, 1, 5, 2, polCol); break;
    case 'steamer': hull(5, 25, 38, 8, '#2d3036', '#4a4e55', '#1c1e22'); r(14, 18, 20, 7, '#e8e4d8'); r(14, 18, 20, 1, '#fff'); for (let k = 16; k < 33; k += 3) r(k, 21, 1, 2, '#3f6a84'); r(22, 7, 4, 11, polCol); r(22, 7, 4, 2, '#1c1e22'); r(10, 11, 1, 14, '#2d3036'); break;
    case 'freighter': hull(1, 26, 46, 7, '#7a3a2c', '#9a4c3a', '#4a221a'); r(1, 30, 46, 3, '#3a3d42'); { const cols = ['#c8452f', '#3a7fb5', '#d8a53a', '#4fa35e', '#8a5fb0']; for (let k = 4; k < 36; k += 5) for (let q = 0; q < 2; q++) r(k, 20 - q * 4, 4, 3, cols[(k + q * 3 + type) % 5]); } r(38, 13, 8, 13, '#e8e4d8'); r(38, 13, 8, 2, polCol); for (let k = 39; k < 45; k += 2) r(k, 17, 1, 2, '#3f6a84'); break;
    case 'rbarge': hull(6, 30, 36, 4, wood, woodL, woodD); r(10, 26, 28, 4, '#a58a64'); r(12, 25, 8, 2, '#c9ae7e'); r(24, 25, 10, 2, '#8a6238'); r(39, 22, 1, 8, woodD); break;
    case 'knarr': hull(10, 28, 28, 5, wood, woodL, woodD); r(10, 25, 3, 3, woodL); r(35, 25, 3, 3, woodL); r(23, 10, 2, 18, woodD); sail(15, 11, 18, 13, polCol); for (let k = 15; k < 33; k += 4) r(k, 11, 2, 13, cream); break;
    case 'caravel': hull(9, 27, 30, 6, wood, woodL, woodD); r(9, 23, 7, 4, woodL); r(18, 8, 2, 19, woodD); r(29, 11, 2, 16, woodD); g.fillStyle = cream; g.beginPath(); g.moveTo(19, 8); g.lineTo(28, 22); g.lineTo(11, 22); g.closePath(); g.fill(); g.beginPath(); g.moveTo(30, 11); g.lineTo(37, 23); g.lineTo(24, 23); g.closePath(); g.fill(); r(18, 5, 4, 2, polCol); break;
    case 'clipper': hull(4, 27, 40, 5, woodD, woodL, '#2a1c10'); r(44, 27, 4, 2, woodL); for (const x of [13, 24, 35]) { r(x, 2, 1, 25, woodD); sail(x - 7, 3, 14, 6, cream); sail(x - 6, 10, 12, 6, cream); sail(x - 7, 17, 14, 7, cream); } r(13, 0, 5, 2, polCol); break;
    case 'tanker': hull(1, 26, 46, 7, '#3a3d42', '#55595f', '#23252a'); r(1, 30, 46, 3, '#7a3a2c'); for (let k = 4; k < 34; k += 6) r(k, 22, 5, 4, '#c5ccd3'); r(36, 15, 10, 11, '#e8e4d8'); r(36, 15, 10, 2, polCol); r(38, 18, 6, 2, '#3f6a84'); r(40, 9, 3, 6, '#2d3036'); break;
    case 'autocargo': hull(0, 26, 48, 7, '#d8e0e6', '#fff', '#8c939a'); { const cols = ['#3a7fb5', '#d8a53a', '#4fa35e', '#c8452f']; for (let k = 3; k < 44; k += 5) for (let q = 0; q < 3; q++) r(k, 22 - q * 4, 4, 3, cols[(k + q) % 4]); } r(20, 2, 1, 8, '#70757c'); r(19, 4, 3, 1, polCol); break;
    case 'bulker': {  // black hull, red below the waterline, brown hatch covers between deck cranes, bridge aft
      hull(1, 26, 74, 7, '#33404e', '#4a5868', '#1f2832'); r(1, 30, 74, 3, '#8a3a2c'); r(68, 23, 7, 3, '#33404e'); r(68, 23, 7, 1, '#4a5868');
      for (let k = 16; k < 66; k += 9) { r(k, 22, 7, 4, '#8a5a3a'); r(k, 22, 7, 1, '#a8744e'); if (k % 18 === 16) { r(k + 7, 13, 1, 13, '#d8a53a'); r(k + 3, 13, 5, 1, '#d8a53a'); } }
      r(3, 12, 11, 14, '#e8e4d8'); r(3, 12, 11, 2, polCol); r(4, 16, 9, 1, '#3f6a84'); r(4, 20, 9, 1, '#3f6a84'); r(6, 6, 4, 6, '#2d3036'); r(6, 7, 4, 1, polCol);
      break;
    }
    case 'supertanker': {  // long low hull, green deck with its pipe run, bridge and funnel at the stern
      hull(1, 26, 86, 7, '#3a3d42', '#55595f', '#23252a'); r(1, 30, 86, 3, '#7a3a2c'); r(16, 24, 68, 2, '#5f6b4a'); r(18, 23, 62, 1, '#c5ccd3');
      for (let k = 22; k < 80; k += 12) r(k, 21, 2, 2, '#c5ccd3'); r(46, 19, 5, 4, '#c5ccd3'); r(80, 17, 1, 7, '#55595f');
      r(3, 11, 12, 15, '#e8e4d8'); r(3, 11, 12, 2, polCol); r(4, 15, 10, 1, '#3f6a84'); r(4, 19, 10, 1, '#3f6a84'); r(7, 4, 4, 7, '#2d3036'); r(7, 5, 4, 1, polCol);
      break;
    }
    case 'megabox': {  // containers stacked five high from end to end, bridge two-thirds forward, funnel behind
      hull(0, 26, 96, 7, '#2d4a6a', '#3f6488', '#1c3048'); r(0, 30, 96, 3, '#8a3a2c');
      const cols = ['#c8452f', '#3a7fb5', '#d8a53a', '#4fa35e', '#8a5fb0', '#e8e4d8'];
      for (let k = 3; k < 92; k += 4) { if (k > 60 && k < 74) continue; const hgt = 5 - ((k * 5) % 7 === 0 ? 1 : 0); for (let q = 0; q < hgt; q++) { r(k, 22 - q * 3, 4, 3, cols[(k * 7 + q * 3 + type) % 6]); r(k + 3, 22 - q * 3, 1, 3, 'rgba(0,0,0,.25)'); } }
      r(64, 3, 8, 23, '#e8e4d8'); r(64, 3, 8, 2, polCol); for (let y = 7; y < 22; y += 3) r(65, y, 6, 1, '#3f6a84'); r(18, 4, 4, 6, '#2d3036'); r(18, 5, 4, 1, polCol);
      break;
    }
    case 'orecarrier': {  // red hull, grey hatches with ore heaped in the holds, a white bridge with a sensor dome and no crew to speak of
      hull(1, 26, 90, 7, '#7a2c2c', '#9a3c3a', '#4a1a1a'); r(1, 30, 90, 3, '#3a3d42'); r(84, 23, 7, 3, '#7a2c2c');
      for (let k = 18; k < 82; k += 10) { r(k, 23, 8, 3, '#55595f'); r(k + 2, 21, 4, 2, '#8a5a3a'); r(k + 3, 20, 2, 1, '#a0704a'); }
      r(3, 10, 12, 16, '#efefef'); r(3, 10, 12, 2, polCol); r(4, 14, 10, 1, '#3f6a84'); r(4, 18, 10, 1, '#3f6a84'); r(6, 4, 4, 6, '#2d3036'); r(11, 6, 3, 3, '#c5ccd3');
      break;
    }
    case 'longship': hull(4, 29, 40, 4, wood, woodL, woodD); r(2, 25, 3, 6, woodL); r(43, 25, 3, 6, woodL); r(1, 23, 3, 2, woodD); r(44, 23, 3, 2, woodD); r(23, 11, 2, 18, woodD); sail(14, 12, 20, 13, cream); for (let k = 14; k < 34; k += 5) r(k, 12, 2, 13, polCol); for (let k = 8; k < 40; k += 5) r(k, 27, 2, 2, polCol); break;
    case 'trireme': hull(4, 27, 40, 6, wood, woodL, woodD); r(44, 30, 4, 2, '#b98142'); for (let q = 0; q < 3; q++) for (let k = 7; k < 41; k += 3) r(k, 33 + q, 1, 2, woodL); r(23, 11, 2, 16, woodD); sail(14, 12, 20, 11, polCol); r(5, 24, 5, 3, woodL); break;
    case 'frigate': hull(5, 26, 38, 7, woodD, woodL, '#2a1c10'); r(5, 29, 38, 1, '#e8e0cc'); for (let k = 8; k < 41; k += 4) r(k, 29, 2, 2, '#14100c'); for (const x of [13, 24, 34]) { r(x, 3, 1, 23, woodD); sail(x - 6, 4, 12, 8, cream); sail(x - 6, 13, 12, 8, cream); } r(13, 1, 5, 2, polCol); break;
    case 'shipline': hull(1, 22, 46, 11, woodD, woodL, '#2a1c10'); for (let y = 24; y < 33; y += 3) { r(1, y + 2, 46, 1, '#d6b86a'); for (let k = 3; k < 45; k += 4) r(k, y, 2, 2, '#14100c'); } r(1, 15, 12, 7, woodL); for (const x of [10, 23, 36]) { r(x, 0, 2, 22, woodD); sail(x - 7, 1, 15, 6, cream); sail(x - 7, 8, 15, 6, cream); sail(x - 7, 15, 15, 6, cream); } r(23, 0, 6, 2, polCol); break;
    case 'dreadnought': hull(0, 25, 48, 8, '#5a636c', '#747e88', '#32383f'); r(12, 14, 22, 11, '#6a747e'); r(12, 14, 22, 1, '#8a949e'); r(20, 4, 5, 10, '#4a525a'); r(4, 21, 8, 4, '#6a747e'); r(0, 22, 6, 1, '#2a2f34'); r(36, 21, 8, 4, '#6a747e'); r(42, 22, 6, 1, '#2a2f34'); r(14, 11, 6, 3, '#6a747e'); r(10, 12, 5, 1, '#2a2f34'); r(27, 11, 6, 3, '#6a747e'); r(32, 12, 5, 1, '#2a2f34'); r(22, 0, 1, 5, '#2a2f34'); r(23, 1, 4, 2, polCol); break;
    case 'submarine': r(4, 31, 40, 4, '#2d3036'); r(2, 32, 44, 2, '#23252a'); r(20, 27, 8, 4, '#3a3d42'); r(23, 23, 1, 4, '#3a3d42'); r(24, 23, 3, 1, '#3a3d42'); r(25, 28, 3, 1, polCol); r(0, 36, 48, 2, 'rgba(255,255,255,.2)'); break;
    case 'carrier': hull(0, 26, 48, 7, '#59626c', '#747e88', '#32383f'); r(0, 22, 48, 4, '#6a747e'); r(0, 22, 48, 1, '#9aa2aa'); for (let k = 3; k < 44; k += 7) r(k, 23, 3, 1, '#e8e4d8'); r(32, 12, 8, 10, '#6a747e'); r(32, 12, 8, 1, '#8a949e'); r(35, 6, 2, 6, '#2a2f34'); r(36, 7, 4, 2, polCol); r(7, 20, 7, 2, '#3a4148'); r(18, 20, 7, 2, '#3a4148'); break;
    case 'cruiser': hull(1, 26, 46, 6, '#6a747e', '#8a949e', '#3a4148'); r(14, 15, 20, 11, '#7d8791'); r(14, 15, 20, 1, '#9aa2aa'); r(21, 7, 4, 8, '#59626c'); for (let k = 4; k < 13; k += 3) r(k, 23, 2, 3, '#2a2f34'); for (let k = 36; k < 45; k += 3) r(k, 23, 2, 3, '#2a2f34'); r(22, 3, 1, 4, '#2a2f34'); r(23, 4, 4, 2, polCol); break;
    case 'nuclearsub': r(1, 30, 46, 5, '#23252a'); r(0, 31, 48, 3, '#1c1e22'); r(19, 25, 10, 5, '#2d3036'); r(22, 21, 1, 4, '#3a3d42'); r(25, 26, 3, 1, polCol); r(0, 36, 48, 2, 'rgba(255,255,255,.2)'); break;
    case 'droneship': hull(0, 26, 48, 7, '#d8e0e6', '#fff', '#8c939a'); r(0, 22, 48, 4, '#c5ccd3'); for (let k = 3; k < 45; k += 4) { r(k, 15 + (k % 3) * 2, 3, 1, '#2d3036'); r(k + 1, 16 + (k % 3) * 2, 1, 1, polCol); } r(20, 17, 8, 5, '#8c939a'); break;
    case 'galley': hull(5, 28, 38, 5, wood, woodL, woodD); r(41, 29, 5, 2, '#b98142'); r(24, 10, 2, 18, woodD); sail(16, 11, 18, 12, polCol); r(16, 15, 18, 2, cream); for (let k = 8; k < 40; k += 4) r(k, 33, 1, 3, woodL); break;
    case 'manowar': hull(3, 24, 42, 9, woodD, woodL, '#2a1c10'); r(3, 28, 42, 1, '#d6b86a'); for (let k = 7; k < 42; k += 4) r(k, 26, 2, 2, '#14100c'); for (let k = 7; k < 42; k += 4) r(k, 30, 2, 2, '#14100c'); r(3, 18, 11, 6, woodL); r(12, 1, 2, 23, woodD); r(24, 0, 2, 24, woodD); r(35, 5, 2, 19, woodD); sail(6, 3, 13, 8, cream); sail(6, 12, 13, 7, cream); sail(18, 2, 14, 8, cream); sail(18, 11, 14, 8, cream); sail(30, 7, 12, 6, cream); sail(30, 14, 12, 6, cream); r(24, 0, 6, 2, polCol); break;
    case 'ironclad': hull(3, 26, 42, 7, '#3e4248', '#5a5f66', '#23252a'); r(14, 18, 16, 8, '#4a4f56'); r(14, 18, 16, 1, '#646a72'); r(20, 8, 4, 10, '#26282c'); r(32, 22, 8, 4, '#55595f'); r(38, 23, 7, 1, '#26282c'); r(6, 22, 7, 4, '#55595f'); r(1, 23, 6, 1, '#26282c'); r(12, 14, 1, 12, '#26282c'); r(12, 13, 4, 2, polCol); break;
    default: hull(1, 26, 46, 6, '#59626c', '#747e88', '#32383f'); r(16, 16, 16, 10, '#6a747e'); r(16, 16, 16, 1, '#8a949e'); r(21, 7, 5, 9, '#4a525a'); r(27, 11, 2, 5, '#2a2f34'); r(35, 21, 8, 5, '#6a747e'); r(41, 22, 6, 1, '#2a2f34'); r(4, 21, 8, 5, '#6a747e'); r(0, 22, 5, 1, '#2a2f34'); r(21, 2, 1, 6, '#2a2f34'); r(19, 4, 6, 2, polCol);
  }
  artCache.set(key, c);
  return c;
}

// ---- airliners, seen from above and pointing right (+x), in white with the realm's colour on the tail and a stripe ----
// kind 0 propliner, 1 jetliner, 2 widebody. shadow: the same outline in black, for the shadow on the ground.
function planeSprite(kind, polCol, shadow) {
  const key = `air${kind}.${polCol}.${shadow ? 1 : 0}`;
  let c = artCache.get(key);
  if (c) return c;
  const S = [20, 26, 34][kind], cy = S / 2;
  c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const poly = (col, ...pts) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]); g.closePath(); g.fill(); };
  const body = '#eef0f2', wing = '#d4d9de', eng = '#8c939a';
  if (kind === 0) {
    r(4, 8, 13, 4, wing); r(8, 1, 4, 18, wing); r(8, 1, 4, 1, '#fff');   // straight wing
    r(3, 9, 15, 2, body); r(17, 9, 2, 2, '#3a3d42');
    r(9, 4, 3, 2, eng); r(9, 14, 3, 2, eng); r(12, 3, 1, 4, 'rgba(40,40,40,.55)'); r(12, 13, 1, 4, 'rgba(40,40,40,.55)');
    r(2, 6, 3, 8, wing); r(1, 9, 4, 2, polCol); r(6, 9, 9, 1, polCol);
  } else if (kind === 1) {
    poly(wing, 15, cy - 1, 9, 1, 7, 1, 10, cy - 1); poly(wing, 15, cy + 1, 9, S - 1, 7, S - 1, 10, cy + 1);   // swept wings
    poly(wing, 5, cy - 1, 2, cy - 6, 1, cy - 6, 2, cy - 1); poly(wing, 5, cy + 1, 2, cy + 6, 1, cy + 6, 2, cy + 1);
    r(2, cy - 1, 21, 3, body); r(23, cy - 1, 2, 3, '#dfe3e6'); r(24, cy, 1, 1, '#3a3d42');
    r(11, cy - 6, 3, 2, eng); r(11, cy + 5, 3, 2, eng);
    r(1, cy - 1, 4, 3, polCol); r(5, cy, 17, 1, polCol);
  } else {
    poly(wing, 20, cy - 2, 12, 1, 9, 1, 14, cy - 2); poly(wing, 20, cy + 2, 12, S - 1, 9, S - 1, 14, cy + 2);
    poly(wing, 6, cy - 2, 2, cy - 8, 1, cy - 8, 3, cy - 2); poly(wing, 6, cy + 2, 2, cy + 8, 1, cy + 8, 3, cy + 2);
    r(2, cy - 2, 28, 5, body); r(30, cy - 2, 2, 5, '#dfe3e6'); r(32, cy - 1, 1, 3, '#dfe3e6'); r(31, cy - 1, 1, 1, '#3a3d42');
    r(15, cy - 8, 4, 2, eng); r(12, cy - 12, 4, 2, eng); r(15, cy + 7, 4, 2, eng); r(12, cy + 11, 4, 2, eng);
    r(1, cy - 2, 5, 5, polCol); r(6, cy, 23, 1, polCol);
  }
  if (shadow) { g.globalCompositeOperation = 'source-in'; r(0, 0, S, S, '#000'); }
  artCache.set(key, c);
  return c;
}
// A small airfield (2x2): a paved strip along the bottom, a hangar, an apron and a windsock. Planes land on the strip.
if (typeof SPR !== 'undefined') SPR.airfield = r => {
  r(0, 2, 24, 22, '#7f8a6e'); r(1, 15, 22, 5, '#4a4d50'); for (let x = 3; x < 22; x += 4) r(x, 17, 2, 1, '#e8e8e0'); r(1, 15, 1, 5, '#e8e8e0'); r(22, 15, 1, 5, '#e8e8e0');
  r(2, 4, 9, 2, '#6d7680'); r(2, 6, 9, 6, '#b4bcc2'); r(4, 8, 5, 4, '#3a3d42'); r(12, 8, 10, 5, '#8c8a82'); r(12, 13, 2, 2, '#8c8a82');
  r(19, 3, 1, 6, '#55595f'); r(20, 3, 3, 2, '#e8743a'); r(22, 3, 1, 1, '#efefef');
};
