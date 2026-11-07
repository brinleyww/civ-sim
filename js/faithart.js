'use strict';
// Holy buildings in the look of the faith that raised them (HOLY and HOLY_NAME in life.js): a spirit house on stilts for the ancestors,
// a stave hall for the old gods, a church for the One, a pagoda for the Path, a stepped pyramid for the Sun, a round domed temple for
// the Great Mother, a mosque for the Book and a tower temple over a bathing tank for the River. Tier 0 shrine .. 4 temple precinct.

const FA_SH = 'rgba(0,0,0,.25)', FA_GOLD = '#e3c23c';
const faR = Math.round;
// stepped triangle: a gable or a spire
function faTri(r, cx, top, half, h, col) { for (let k = 0; k < h; k++) { const w = Math.max(1, faR(half * (k + 1) / h)); r(cx - w, top + k, w * 2, 1, col); } }
function faDome(r, cx, base, rad, col, hi) {
  for (let y = 0; y < rad; y++) { const d = rad - y - 0.5, w = Math.max(1, faR(Math.sqrt(Math.max(0, rad * rad - d * d)))); r(cx - w, base - rad + y, w * 2, 1, col); }
  if (hi && rad > 2) r(cx - faR(rad * 0.55), base - rad + 1 + (rad > 4 ? 1 : 0), Math.max(1, faR(rad * 0.35)), 1, hi);
}
function faDisc(r, cx, cy, rad, col) { for (let y = -rad; y <= rad; y++) { const w = faR(Math.sqrt(Math.max(0, rad * rad - y * y))); if (w) r(cx - w, cy + y, w * 2, 1, col); } }
function faTree(r, x, y, s) { r(x, y + s, 1, s, '#5b4128'); faDisc(r, x, y, s, '#4f7d45'); r(x - faR(s / 2), y - faR(s / 2), Math.max(1, faR(s / 2)), 1, '#6c9b5c'); }
const faWall = (r, P, h, col, top) => { r(0, P - 2 - h, 1, h, col); r(P - 1, P - 2 - h, 1, h, col); r(0, P - 2 - h, P, 1, top); r(0, P - 3, P, 1, col); };

// ancestor spirits: halls of carved timber on stilts under steep thatch, with painted spirit poles
function faAncestor(r, P, tier) {
  const g = P - 2;
  const hall = (x0, w, h) => {
    for (let x = x0 + 1; x < x0 + w - 1; x += 3) r(x, g - 2, 1, 2, '#4a3322');
    r(x0, g - h, w, h - 2, '#8a6440'); r(x0, g - h, w, 1, '#a57a50');
    r(x0 + (w >> 1) - 1, g - 6 > g - h ? g - 6 : g - h + 1, 2, 4, '#2e2014');
    const rh = Math.max(3, faR(w * 0.45)); faTri(r, x0 + (w >> 1), g - h - rh, (w >> 1) + 2, rh, '#b89a5a');
    r(x0 - 1, g - h - 1, w + 2, 1, '#8f7440');
    r(x0 + (w >> 1) - 2, g - h - rh - 1, 1, 1, '#5b4128'); r(x0 + (w >> 1) + 1, g - h - rh - 1, 1, 1, '#5b4128');  // crossed gable horns
  };
  const pole = (x, h) => { r(x, g - h, 2, h, '#6b4a2b'); const cs = ['#b83a2e', FA_GOLD, '#2f5d7a', '#e8e4d8']; for (let y = g - h + 1, k = 0; y < g - 1; y += 3, k++) r(x, y, 2, 1, cs[k % 4]); r(x - 1, g - h, 4, 1, '#b83a2e'); };
  if (tier === 0) { r(5, 6, 2, 6, '#5b4128'); r(3, 3, 6, 3, '#8a6440'); r(5, 4, 2, 2, '#2e2014'); faTri(r, 6, 0, 4, 3, '#b89a5a'); }
  else if (tier === 4) { for (let x = 2; x < P - 2; x += 7) pole(x, 9 + (x % 3) * 2); faTree(r, 6, 8, 4); faTree(r, P - 7, 9, 4); hall(12, P - 24, 18); }
  else {
    const w = tier === 3 ? P - 8 : tier === 2 ? P - 11 : P - 8, h = tier === 3 ? 16 : 11;
    hall(4, w, h); pole(1, faR(P * 0.55)); pole(P - 3, faR(P * 0.5));
    if (tier === 2) { r(P - 8, g - 6, 6, 4, '#8a6440'); faTri(r, P - 5, g - 9, 4, 3, '#b89a5a'); }
    if (tier === 3) pole(faR(P / 2) - 1, 7);
  }
  r(1, P - 1, P - 2, 1, FA_SH);
}
// the old gods: rings of standing stones, and dark stave halls with roof on roof and dragon heads at the gables
function faOldGods(r, P, tier) {
  const g = P - 2;
  const stone = (x, h) => { r(x, g - h, 2, h, '#8d8a80'); r(x, g - h, 1, h, '#a8a59a'); };
  const stave = (cx, w, h, tiers) => {
    r(cx - (w >> 1), g - h, w, h, '#4a3322'); for (let x = cx - (w >> 1) + 1; x < cx + (w >> 1); x += 2) r(x, g - h + 1, 1, h - 1, '#5a4030');
    r(cx - 1, g - 4, 2, 4, '#20160e');
    let top = g - h, half = (w >> 1) + 2;
    for (let k = 0; k < tiers; k++) {
      const rh = Math.max(3, faR(half * 0.8)); faTri(r, cx, top - rh, half, rh, '#3a2c22'); r(cx - half, top - 1, half * 2, 1, '#2a2018');
      r(cx - half - 1, top - 2, 1, 1, '#c9a24a'); r(cx + half, top - 2, 1, 1, '#c9a24a');  // dragon heads
      top -= rh - 1; half = Math.max(2, faR(half * 0.6));
    }
    r(cx, top - 3, 1, 3, '#2a2018');
  };
  if (tier === 0) { stone(1, 6); stone(5, 8); stone(9, 6); r(1, g - 8, 10, 1, '#8d8a80'); r(5, g - 9, 2, 1, '#a8a59a'); }
  else if (tier === 4) { for (let x = 1; x < P - 2; x += 5) stone(x, 5 + (x % 4)); stave(P >> 1, 16, 12, 3); }
  else {
    stave(tier === 2 ? 9 : P >> 1, tier === 3 ? 16 : 12, tier === 3 ? 12 : 8, tier === 3 ? 3 : 2);
    if (tier === 2) { r(16, g - 5, 7, 5, '#5a4030'); faTri(r, 19, g - 8, 4, 3, '#3a2c22'); }
    if (tier === 3) { stone(1, 7); stone(P - 3, 7); }
  }
  r(1, P - 1, P - 2, 1, FA_SH);
}
// the One: a church with a pointed gable, a bell tower and spire under the cross; twin towers and a rose window for a cathedral
function faOne(r, P, tier, pal) {
  const g = P - 2, Rf = ROOFS[pal], st = '#d9d2c0', sd = '#b5ad98', dk = '#3d3a40';
  const cross = (x, y) => { r(x, y - 3, 1, 3, FA_GOLD); r(x - 1, y - 2, 3, 1, FA_GOLD); };
  const church = (x0, w, h) => {
    r(x0, g - h, w, h, st); r(x0, g - h, w, 1, '#e8e4d8'); r(x0 + w - 1, g - h, 1, h, sd);
    const cx = x0 + (w >> 1); r(cx - 1, g - 4, 2, 4, '#4a3a28'); r(cx - 1, g - 5, 2, 1, sd);
    for (let x = x0 + 2; x < x0 + w - 2; x += 3) if (Math.abs(x - cx) > 1) r(x, g - h + 2, 1, 2, dk);
    const rh = Math.max(3, faR(w * 0.4)); faTri(r, cx, g - h - rh, (w >> 1) + 1, rh, Rf[0]); r(x0 - 1, g - h - 1, w + 2, 1, Rf[2]);
    cross(cx, g - h - rh);
  };
  const tower = (x, w, h) => { r(x, g - h, w, h, st); r(x + w - 1, g - h, 1, h, sd); r(x + (w >> 1), g - h + 2, 1, 2, dk); faTri(r, x + (w >> 1), g - h - faR(w * 1.6), (w >> 1) + 1, faR(w * 1.6), '#55585f'); cross(x + (w >> 1), g - h - faR(w * 1.6)); };
  if (tier === 0) { church(3, 7, 5); }
  else if (tier === 3 || tier === 4) {
    const o = tier === 4 ? 6 : 0, W0 = P - 2 * o;
    if (tier === 4) { faWall(r, P, 4, '#a9a39a', '#c4beb2'); r(1, g - 9, 5, 6, st); faTri(r, 3, g - 12, 3, 3, Rf[0]); r(P - 6, g - 9, 5, 6, st); faTri(r, P - 4, g - 12, 3, 3, Rf[0]); }
    church(o + 7, W0 - 14, faR(P * 0.42)); tower(o + 1, 6, faR(P * 0.55)); tower(P - o - 7, 6, faR(P * 0.55));
    faDisc(r, P >> 1, g - faR(P * 0.3), 2, '#5c6fa8'); r((P >> 1) - 1, g - faR(P * 0.3), 2, 1, '#c25a5a');  // the rose window
  } else {
    church(2, 14, 9); tower(17, 5, 12);
    if (tier === 2) { for (let x = 0; x < P; x += 3) { r(x, g - 4, 2, 4, sd); r(x + 2, g - 4, 1, 1, sd); } r(0, g - 5, P, 1, Rf[2]); }  // the cloister
  }
  r(1, P - 1, P - 2, 1, FA_SH);
}
// the Path: tiered pagodas with upturned eaves, red-pillared halls and white stupas
function faPath(r, P, tier) {
  const g = P - 2, red = '#b83a2e', wall = '#e2d6b8', eave = '#3c4a4f';
  const pagoda = (cx, base, tiers, w0, th) => {
    let y = base, w = w0;
    for (let k = 0; k < tiers; k++) {
      r(cx - w + 1, y - th + 1, 2 * w - 2, th - 1, k === 0 ? red : wall); r(cx - w + 1, y - th + 1, 1, th - 1, red); r(cx + w - 2, y - th + 1, 1, th - 1, red);
      r(cx - w - 1, y - th, 2 * w + 2, 1, eave); r(cx - w - 2, y - th - 1, 1, 1, eave); r(cx + w + 1, y - th - 1, 1, 1, eave);
      y -= th; w = Math.max(2, w - (w0 > 5 ? 1 : 0) - (k % 2));
    }
    r(cx, y - 4, 1, 4, FA_GOLD); r(cx - 1, y - 2, 3, 1, FA_GOLD);
  };
  const hall = (x0, w, h) => { r(x0, g - h, w, h, wall); for (let x = x0; x < x0 + w; x += 3) r(x, g - h, 1, h, red); r(x0 + (w >> 1) - 1, g - 4, 2, 4, '#5a2a20'); r(x0 - 2, g - h - 1, w + 4, 1, eave); faTri(r, x0 + (w >> 1), g - h - 4, (w >> 1) + 1, 3, eave); r(x0 - 3, g - h - 2, 1, 1, eave); r(x0 + w + 2, g - h - 2, 1, 1, eave); };
  const gate = (cx, w, h) => { r(cx - (w >> 1), g - h, 1, h, red); r(cx + (w >> 1), g - h, 1, h, red); r(cx - (w >> 1) - 2, g - h, w + 5, 1, '#2a2a2a'); r(cx - (w >> 1) - 1, g - h + 2, w + 3, 1, red); };
  if (tier === 0) { r(2, g - 2, 8, 2, '#c9c2b0'); faDome(r, 6, g - 2, 4, '#ece6d6', '#fff8e8'); r(5, g - 8, 2, 2, '#c9c2b0'); r(6, g - 11, 1, 3, FA_GOLD); }
  else if (tier === 1) pagoda(P >> 1, g, 3, 7, 5);
  else if (tier === 2) { hall(2, 12, 6); pagoda(19, g, 3, 4, 4); }
  else if (tier === 3) pagoda(P >> 1, g, 6, 11, 5);
  else { gate(8, 8, 10); hall(17, 16, 7); pagoda(P - 7, g, 5, 5, 6); }
  r(1, P - 1, P - 2, 1, FA_SH);
}
// the Sun: stepped pyramids with a stair up the face, a shrine at the top and a golden disc
function faSun(r, P, tier) {
  const g = P - 2;
  const pyr = (cx, levels, w0, lh) => {
    let w = w0;
    for (let k = 0; k < levels; k++) { r(cx - w, g - (k + 1) * lh, 2 * w, lh, k % 2 ? '#c7b48a' : '#b5a178'); r(cx - w, g - (k + 1) * lh, 2 * w, 1, '#d8c79f'); w = Math.max(2, w - Math.max(1, faR(w0 / levels))); }
    const top = g - levels * lh;
    r(cx - 1, top, 2, levels * lh, '#9c8a64'); for (let y = top + 1; y < g; y += 2) r(cx - 1, y, 2, 1, '#867550');
    r(cx - 2, top - 3, 4, 3, '#b0453a'); r(cx - 1, top - 2, 2, 2, '#3a2418');
    return top - 3;
  };
  if (tier === 0) { r(3, g - 3, 6, 3, '#b5a178'); r(5, g - 7, 2, 4, '#9c8a64'); faDisc(r, 6, 2, 2, FA_GOLD); }
  else if (tier === 2) { const t = pyr(8, 3, 7, 4); faDisc(r, 8, t - 3, 2, FA_GOLD); r(15, g - 5, 8, 5, '#d8c79f'); r(15, g - 5, 8, 1, '#e8dbb6'); r(18, g - 3, 2, 3, '#5a3a20'); }
  else if (tier === 4) { const t = pyr(P >> 1, 6, 15, 5); faDisc(r, P >> 1, t - 4, 3, FA_GOLD); pyr(5, 2, 4, 3); pyr(P - 5, 2, 4, 3); r(0, g, P, 1, '#cbbd99'); }
  else { const n = tier === 3 ? 6 : 4, t = pyr(P >> 1, n, tier === 3 ? 16 : 10, tier === 3 ? 4 : 3); faDisc(r, P >> 1, t - 3, tier === 3 ? 3 : 2, FA_GOLD); }
  r(1, P - 1, P - 2, 1, FA_SH);
}
// the Great Mother: round temples ringed with columns under a green dome, set among gardens; a grotto for a shrine
function faMother(r, P, tier) {
  const g = P - 2, col = '#efeadd', dome = '#5f8f6a';
  const round = (cx, w, h) => {
    r(cx - (w >> 1) - 1, g - 2, w + 2, 2, '#cfc6b0'); r(cx - (w >> 1) - 1, g - 2, w + 2, 1, '#e0d8c4');
    r(cx - (w >> 1), g - h, w, h - 2, '#8a7f6a'); for (let x = cx - (w >> 1); x < cx + (w >> 1); x += 2) r(x, g - h, 1, h - 2, col);
    r(cx - (w >> 1) - 1, g - h - 1, w + 2, 1, '#e0d8c4'); faDome(r, cx, g - h - 1, (w >> 1), dome, '#86b48f'); r(cx, g - h - 1 - (w >> 1) - 2, 1, 2, FA_GOLD);
  };
  if (tier === 0) { faDome(r, 6, g, 5, '#8d8a80', '#a8a59a'); r(4, g - 4, 4, 4, '#2c2620'); r(5, g - 3, 2, 3, '#efeadd'); faTree(r, 10, 4, 1); }
  else if (tier === 2) { round(8, 10, 8); r(15, g - 6, 8, 6, '#d9cdb4'); faTri(r, 19, g - 9, 5, 3, '#b0453a'); faTree(r, 20, 4, 3); }
  else if (tier === 4) { faWall(r, P, 3, '#b8ae98', '#d0c7b2'); faTree(r, 5, 7, 4); faTree(r, P - 6, 8, 4); faTree(r, 10, 14, 3); faTree(r, P - 11, 15, 3); round(P >> 1, 20, 14); }
  else { round(P >> 1, tier === 3 ? 24 : 14, tier === 3 ? 12 : 8); if (tier === 1) { faTree(r, 2, 6, 2); faTree(r, P - 3, 6, 2); } }
  r(1, P - 1, P - 2, 1, FA_SH);
}
// the Book: mosques with a dome over a prayer hall and slender minarets with a crescent at the top
function faBook(r, P, tier) {
  const g = P - 2, st = '#e8dfca', sd = '#c9bea4', dome = tier >= 3 ? '#4f8f86' : '#c9b48a';
  const cres = (x, y) => { r(x, y - 2, 1, 2, FA_GOLD); r(x - 1, y - 3, 1, 1, FA_GOLD); r(x + 1, y - 3, 1, 1, FA_GOLD); };
  const minaret = (x, h) => { r(x, g - h, 2, h, st); r(x + 1, g - h, 1, h, sd); r(x - 1, g - h + 3, 4, 1, sd); r(x - 1, faR(g - h * 0.45), 4, 1, sd); faTri(r, x + 1, g - h - 3, 1, 3, dome); cres(x + 1, g - h - 3); };
  const hall = (cx, w, h, rad) => {
    r(cx - (w >> 1), g - h, w, h, st); r(cx + (w >> 1) - 1, g - h, 1, h, sd); r(cx - (w >> 1), g - h, w, 1, '#f4eedf');
    r(cx - 1, g - 5, 3, 5, '#3a3a44'); r(cx, g - 6, 1, 1, '#3a3a44');  // a pointed arch
    for (let x = cx - (w >> 1) + 2; x < cx + (w >> 1) - 2; x += 3) if (Math.abs(x - cx) > 2) r(x, g - h + 2, 1, 2, '#3a3a44');
    r(cx - rad, g - h - 1, rad * 2, 1, sd); faDome(r, cx, g - h - 1, rad, dome, tier >= 3 ? '#7bb5ab' : '#e0cfa6'); cres(cx, g - h - 1 - rad);
  };
  if (tier === 0) hall(6, 8, 5, 3);
  else if (tier === 2) { for (let x = 0; x < P - 5; x += 4) { r(x, g - 6, 4, 6, st); r(x + 1, g - 4, 2, 4, '#3a3a44'); } r(0, g - 7, P - 5, 1, sd); faDome(r, 8, g - 7, 3, dome); minaret(P - 4, 18); }
  else if (tier === 4) { faWall(r, P, 4, sd, st); hall(P >> 1, 26, 12, 10); minaret(2, 30); minaret(P - 4, 30); minaret(10, 22); minaret(P - 12, 22); }
  else { const w = tier === 3 ? 26 : 14; hall(P >> 1, w, tier === 3 ? 11 : 7, tier === 3 ? 9 : 5); minaret(1, tier === 3 ? 26 : 16); if (tier === 3) { minaret(P - 3, 26); faDome(r, 9, g - 11, 4, dome); faDome(r, P - 9, g - 11, 4, dome); } }
  r(1, P - 1, P - 2, 1, FA_SH);
}
// the River: curved, ribbed tower temples over stepped bathing tanks
function faRiver(r, P, tier) {
  const g = P - 2, s1 = '#c98f5a', s2 = '#b07a48';
  const tank = (x, w) => { r(x, g - 1, w, 2, '#4a86b8'); r(x, g - 1, w, 1, '#6fa6d0'); r(x - 1, g - 2, w + 2, 1, '#cfc6b0'); r(x - 2, g - 3, w + 4, 1, '#bdb39c'); };
  const spire = (cx, base, w, h) => {
    r(cx - w - 1, base - 3, 2 * w + 2, 3, '#a87048'); r(cx - 1, base - 3, 2, 3, '#3a2418');
    for (let y = 0; y < h; y++) { const f = y / h, ww = Math.max(1, faR(w * (1 - f * f * 0.8))); r(cx - ww, base - 3 - y - 1, 2 * ww, 1, y % 3 === 0 ? s2 : s1); }
    const top = base - 3 - h; r(cx - 2, top - 1, 4, 1, '#e0b070'); r(cx, top - 4, 1, 3, FA_GOLD);
  };
  if (tier === 0) { tank(2, 8); spire(6, g - 2, 2, 5); }
  else if (tier === 2) { spire(7, g, 4, 12); r(13, g - 6, 10, 6, '#d9b98a'); r(13, g - 7, 10, 1, '#a87048'); r(17, g - 4, 2, 4, '#3a2418'); }
  else if (tier === 4) { tank(6, P - 12); spire(P >> 1, g - 3, 8, 26); spire(8, g - 3, 4, 12); spire(P - 8, g - 3, 4, 12); }
  else if (tier === 3) { spire(P >> 1, g - 3, 7, 22); spire(5, g - 3, 3, 9); spire(P - 5, g - 3, 3, 9); tank(4, P - 8); }
  else { spire(P >> 1, g - 3, 5, 13); tank(3, P - 6); }
  r(1, P - 1, P - 2, 1, FA_SH);
}
const FA_STYLE = [faAncestor, faOldGods, faOne, faPath, faSun, faMother, faBook, faRiver];
function faithSprite(type, fk, size, pal) {
  const px = size * SPR_PX, fn = FA_STYLE[fk] || FA_STYLE[2];
  return mkSprite(px, px, r => fn(r, px, HOLY[type], pal || 0));
}
