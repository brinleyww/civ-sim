'use strict';
// Great works drawn by kind (wonders.js holds what they are). Like the building sprites, each stands on its footprint seen from
// the south: the ground of its plot in plan, the work itself as a front elevation rising up the screen from the plot's front edge
// (bowls, basins and arenas are mostly plan). Every kind's shapes are built once as Path2Ds in world pixels (TS to a tile),
// origin at the plot's front-left corner, h measured upward; then cached as built, as a ruin (greyed, broken off, rubble) and
// drawn under construction by clipping the built picture to the work done so far and putting up scaffolding round it.
// Zoomed far out, a small diamond marks each one.

const WA = {
  stone: '#cbbf9f', stoneD: '#a39878', stoneL: '#e4dac0', brick: '#b8714f', brickD: '#8a4e36', brickL: '#d08a66', gold: '#e3c23c', goldD: '#b08f22',
  bronze: '#b0793a', bronzeD: '#7d5426', marble: '#ece6da', marbleD: '#c4bcac', red: '#a8432e', redD: '#7c2e20', slate: '#5c5f66', slateD: '#44474d',
  verd: '#6fa597', verdD: '#4f7f72', glass: '#9cc8dc', glassD: '#5d8aa6', steel: '#8a929c', steelD: '#5a6068', conc: '#c9c6bd', concD: '#a29f96',
  grass: '#7f9a5a', grassD: '#5e7a40', grassL: '#93ad6a', water: '#3f7fb0', waterL: '#7fb6d8', wood: '#8a5a36', woodD: '#5e3c22', dark: '#2f2a24',
  sand: '#d8c08a', pave: '#b9ad92', paveD: '#9d927a', white: '#f2f0ea', blue: '#4f86b0', fire: '#f0a030', fireL: '#ffe080', cream: '#e2d6b4',
};
// ---- the drawing kit ----
function waNew(K) { return { W: K.w * TS, D: K.h * TS, L: [], H: 1, x0: 1e9, x1: -1e9 }; }
function waLay(g, col, lw) {
  const top = g.L[g.L.length - 1];
  if (top && g.L.length > 1 && top[0] === col && top[2] === (lw || 0)) return top[1];  // the plot (layer 0) stays on its own
  const p = new Path2D(); g.L.push([col, p, lw || 0]); return p;
}
const waSee = (g, x, h) => { if (h > g.H) g.H = h; if (x < g.x0) g.x0 = x; if (x > g.x1) g.x1 = x; };
// a box from height h0 up by hh
function waR(g, col, x, h0, w, hh) { waLay(g, col).rect(x, -(h0 + hh), w, hh); waSee(g, x, h0 + hh); waSee(g, x + w, h0); }
// a polygon: [x, h, x, h, ...]
function waP(g, col, pts) { const p = waLay(g, col); p.moveTo(pts[0], -pts[1]); for (let k = 2; k < pts.length; k += 2) { p.lineTo(pts[k], -pts[k + 1]); waSee(g, pts[k], pts[k + 1]); } p.closePath(); waSee(g, pts[0], pts[1]); }
function waE(g, col, x, h, rx, ry, top) { const p = waLay(g, col); p.moveTo(x + rx, -h); p.ellipse(x, -h, rx, ry, 0, 0, top ? -Math.PI : Math.PI * 2, top); p.closePath(); waSee(g, x - rx, h + ry); waSee(g, x + rx, h); }
function waLn(g, col, lw, pts) { const p = waLay(g, col, lw); p.moveTo(pts[0], -pts[1]); for (let k = 2; k < pts.length; k += 2) { p.lineTo(pts[k], -pts[k + 1]); waSee(g, pts[k], pts[k + 1]); } waSee(g, pts[0], pts[1]); }
// a row of columns between x0 and x1
function waCols(g, col, x0, x1, n, h0, hh, cw) { const s = (x1 - x0 - cw) / Math.max(1, n - 1); for (let k = 0; k < n; k++) waR(g, col, x0 + k * s, h0, cw, hh); }
const waGround = (g, col) => { waR(g, col, 0.3, 0.3, g.W - 0.6, g.D - 0.6); g.H = 1; g.x0 = 1e9; g.x1 = -1e9; };  // the plot: not counted in the work's height
// a classical front: steps, a dark cella, columns, entablature and pediment
function waTemple(g, x0, x1, h0, ch, n, col, colD, roof) {
  const w = x1 - x0;
  waR(g, colD, x0 - 0.6, h0, w + 1.2, 0.8); waR(g, col, x0 - 0.3, h0 + 0.8, w + 0.6, 0.8);
  waR(g, WA.dark, x0 + 0.8, h0 + 1.6, w - 1.6, ch);
  waCols(g, col, x0 + 0.2, x1 - 0.2, n, h0 + 1.6, ch, Math.max(0.8, w / n * 0.42));
  waR(g, colD, x0, h0 + 1.6 + ch, w, 1.2);
  waP(g, roof || col, [x0 - 0.3, h0 + 2.8 + ch, x1 + 0.3, h0 + 2.8 + ch, (x0 + x1) / 2, h0 + 2.8 + ch + w * 0.2]);
}
const WA_ART = {
  henge: g => {
    waGround(g, WA.grass); waE(g, WA.grassL, 9, 9, 7.6, 5.6);
    const S = [];
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; S.push([9 + Math.cos(a) * 6.4, 9 + Math.sin(a) * 4.4, k]); }
    S.sort((a, b) => b[1] - a[1]);
    for (const [x, h, k] of S) { waR(g, k % 3 ? WA.stoneD : '#8f8a80', x - 0.8, h - 0.4, 1.6, 4.2); if (k % 4 === 0) waR(g, '#9c978c', x - 1.6, h + 3.6, 3.2, 0.9); }
    waR(g, '#8f8a80', 8.2, 8.6, 1.6, 2.8);
  },
  mound: g => {
    waGround(g, WA.grassD);
    const p = waLay(g, WA.grass); p.moveTo(0.6, -1); p.bezierCurveTo(2, -15, 16, -15, 17.4, -1); p.closePath(); waSee(g, 0.6, 12); waSee(g, 17.4, 1);
    const q = waLay(g, WA.grassL); q.moveTo(4, -6); q.bezierCurveTo(6, -12, 11, -12.5, 13, -10.5); q.lineTo(9, -6); q.closePath();
    waR(g, WA.stoneD, 7.6, 1, 2.8, 3.4); waR(g, WA.dark, 8.3, 1, 1.4, 2.6); waR(g, '#9c978c', 7.2, 4.2, 3.6, 0.8);
    waR(g, WA.stoneD, 8.6, 10.6, 0.9, 1.6);
  },
  ziggurat: g => {
    waGround(g, WA.sand);
    waR(g, WA.brickD, 1, 1, 22, 6); waR(g, WA.brick, 1, 6, 22, 1); waR(g, WA.brickD, 4, 7, 16, 5); waR(g, WA.brick, 4, 11, 16, 1);
    waR(g, WA.brickD, 7, 12, 10, 4); waR(g, WA.brick, 7, 15, 10, 1); waR(g, WA.blue, 9.4, 16, 5.2, 2.6); waR(g, WA.gold, 9.4, 18.6, 5.2, 0.6);
    waP(g, WA.brickL, [10.6, 1, 13.4, 1, 12.6, 16, 11.4, 16]);
    for (let k = 0; k < 6; k++) waR(g, WA.brick, 2 + k * 3.8, 2, 0.7, 3.4);
  },
  steppyramid: g => {
    waGround(g, WA.sand);
    for (let s = 0; s < 6; s++) { const x = 0.8 + s * 1.9, w = 22.4 - s * 3.8, h = 1 + s * 3; waR(g, WA.stoneD, x, h, w, 3); waR(g, WA.stoneL, x, h + 2.4, w, 0.6); }
    waP(g, WA.stone, [10.8, 1, 13.2, 1, 12.6, 19, 11.4, 19]);
    waR(g, WA.stoneL, 10.6, 19, 2.8, 2.4); waR(g, WA.dark, 11.5, 19, 1, 1.4);
  },
  royaltomb: g => {
    waGround(g, WA.paveD);
    waP(g, '#9a8a6c', [0.5, 1, 17.5, 1, 17.5, 13, 14, 16.5, 4, 16.5, 0.5, 13]);
    waTemple(g, 3, 15, 1, 6.5, 4, WA.stoneL, WA.stone);
    waR(g, WA.dark, 8, 2.6, 2, 3.6);
    waR(g, WA.stone, 0.8, 1, 2, 3); waR(g, WA.stoneD, 1.2, 4, 1.2, 1.6); waR(g, WA.stone, 15.2, 1, 2, 3); waR(g, WA.stoneD, 15.6, 4, 1.2, 1.6);
  },
  greatwall: g => {
    waGround(g, WA.grassD);
    waR(g, WA.stoneD, 0, 2, g.W, 5); waR(g, WA.stoneL, 0, 7, g.W, 0.8);
    for (let x = 0.3; x < g.W - 0.5; x += 1.8) waR(g, WA.stone, x, 7.8, 0.9, 0.9);
    for (const x of [1.5, 16, 30.5]) { waR(g, WA.stone, x, 1.5, 4, 9); waR(g, WA.stoneD, x + 2.6, 1.5, 1.4, 9); for (let q = 0; q < 3; q++) waR(g, WA.stoneL, x + q * 1.5, 10.5, 0.9, 1); waR(g, WA.dark, x + 1.6, 7, 0.8, 1.2); }
    waR(g, WA.dark, 17.2, 1.5, 1.6, 3); waP(g, WA.dark, [17.2, 4.5, 18.8, 4.5, 18, 5.4]);
  },
  beacon: g => {
    waGround(g, WA.paveD);
    waR(g, WA.stone, 4, 1, 4, 12); waR(g, WA.stoneD, 6.4, 1, 1.6, 12); waR(g, WA.dark, 5.3, 1, 1.2, 2.2);
    waR(g, WA.stoneL, 3.2, 13, 5.6, 1.2);
    waP(g, WA.fire, [4, 14.2, 8, 14.2, 7, 17, 6, 18.6, 5, 16.8]); waP(g, WA.fireL, [5.2, 14.2, 6.8, 14.2, 6, 16.6]);
  },
  colossus: g => {
    waGround(g, WA.paveD);
    waR(g, WA.marbleD, 3, 1, 12, 1.2); waR(g, WA.marble, 4, 2.2, 10, 3);
    waR(g, WA.bronze, 6.2, 5.2, 1.8, 7); waR(g, WA.bronzeD, 10, 5.2, 1.8, 7);
    waP(g, WA.bronze, [5.8, 12, 12.2, 12, 11.6, 19, 6.4, 19]); waR(g, WA.bronzeD, 9.6, 12, 2.2, 7);
    waR(g, WA.bronze, 4.2, 15, 1.6, 4); waP(g, WA.bronze, [11.6, 18, 13, 18, 14, 25, 12.8, 25.2]);
    waE(g, WA.bronze, 9, 20.6, 1.6, 1.6); waP(g, WA.goldD, [7.2, 21.4, 10.8, 21.4, 9, 23.6]);
    waP(g, WA.fire, [12.6, 25.2, 14.4, 25.2, 13.8, 27.6]);
  },
  lighthouse: g => {
    waGround(g, WA.paveD);
    waR(g, WA.stoneL, 1.5, 1, 9, 6); waR(g, WA.stone, 7.8, 1, 2.7, 6); waR(g, WA.dark, 5, 1, 2, 2.6);
    waR(g, WA.stoneL, 2.8, 7, 6.4, 7); waR(g, WA.stone, 7.4, 7, 1.8, 7); waR(g, WA.stoneD, 2.4, 13.6, 7.2, 0.8);
    waR(g, WA.stoneL, 4, 14.4, 4, 5); waR(g, WA.stone, 6.8, 14.4, 1.2, 5);
    waE(g, 'rgba(255,224,128,.35)', 6, 21.4, 4.4, 2.6); waP(g, WA.fire, [4.6, 19.4, 7.4, 19.4, 6.6, 22.6, 6, 23.6, 5.2, 22]); waR(g, WA.bronze, 5.4, 23.6, 1.2, 1.4);
  },
  library: g => {
    waGround(g, WA.pave);
    waE(g, WA.verd, 9, 12, 4.6, 4, true); waR(g, WA.verdD, 8.4, 16, 1.2, 1.4);
    waTemple(g, 1.6, 16.4, 1, 7, 6, WA.marble, WA.marbleD, WA.marbleD);
    waR(g, WA.goldD, 8.2, 13.4, 1.6, 0.8);
  },
  amphitheatre: g => {
    waGround(g, WA.pave);
    waE(g, WA.stoneD, 12, 11, 11.6, 9.6); waE(g, WA.stone, 12, 11.6, 10.2, 8.2); waE(g, WA.stoneL, 12, 12, 8.6, 6.6); waE(g, WA.stone, 12, 12.4, 7.2, 5.2);
    waE(g, WA.sand, 12, 12.6, 5.8, 4); waE(g, '#c8ae78', 12, 12.6, 2.4, 1.6);
    for (let k = 0; k < 9; k++) { const x = 2.6 + k * 2.35, dx = (x - 12) / 11.6, h = 11 - 9.6 * Math.sqrt(Math.max(0, 1 - dx * dx)); waR(g, WA.dark, x, h + 0.9, 1, 1.7); }
  },
  grandtemple: g => {
    waGround(g, WA.pave);
    waR(g, WA.red, 2.4, 13, 19.2, 1.4);
    waTemple(g, 2, 22, 1, 9, 8, WA.marble, WA.marbleD, WA.marbleD);
    waR(g, WA.gold, 1.6, 15.4, 1, 1.4); waR(g, WA.gold, 21.4, 15.4, 1, 1.4); waR(g, WA.gold, 11.5, 15.8, 1, 1.8);
  },
  pantheon: g => {
    waGround(g, WA.pave);
    waR(g, WA.stone, 2.5, 1, 13, 8); waE(g, '#b9b3a6', 9, 9, 6.6, 6, true); waE(g, '#d6d0c2', 7.4, 11.4, 2.4, 2.2, true); waR(g, WA.stoneD, 8.4, 14.8, 1.2, 0.6);
    waTemple(g, 4.6, 13.4, 1, 5, 4, WA.stoneL, WA.stone);
  },
  statue: g => {
    waGround(g, WA.pave);
    waR(g, WA.stoneD, 3, 1, 12, 1.2); waR(g, WA.stone, 4, 2.2, 10, 3.4);
    waR(g, WA.bronzeD, 5.6, 5.6, 6.8, 3.2); waR(g, WA.bronze, 5.6, 5.6, 2.2, 6.8); waR(g, WA.bronze, 10.2, 5.6, 2.2, 6.8);
    waP(g, WA.bronze, [6, 8.8, 12, 8.8, 11.4, 17, 6.6, 17]); waR(g, WA.bronzeD, 10, 8.8, 1.8, 8);
    waE(g, WA.bronze, 9, 18.6, 1.8, 1.8); waR(g, WA.gold, 7.4, 20, 3.2, 1); for (let q = 0; q < 3; q++) waP(g, WA.gold, [7.4 + q * 1.1, 21, 8.5 + q * 1.1, 21, 7.95 + q * 1.1, 22.4]);
    waR(g, WA.goldD, 12, 10, 1, 5.4);
  },
  palace: g => {
    waGround(g, WA.grass); waR(g, WA.pave, 9, 0.3, 6, 3);
    waR(g, WA.cream, 1, 1, 22, 8); waR(g, WA.red, 0.6, 9, 22.8, 1.6);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 9; k++) waR(g, WA.dark, 2.2 + k * 2.3, 2.6 + r * 3.2, 0.9, 1.6);
    waR(g, '#efe4c4', 8, 1, 8, 12); waR(g, WA.red, 7.6, 13, 8.8, 1.2); waE(g, WA.gold, 12, 14.2, 2.4, 2.6, true);
    waR(g, WA.dark, 11, 1, 2, 3.4); waR(g, WA.stoneD, 0.4, 1, 2.4, 11); waR(g, WA.red, 0.2, 12, 2.8, 1.2); waR(g, WA.stoneD, 21.2, 1, 2.4, 11); waR(g, WA.red, 21, 12, 2.8, 1.2);
  },
  cathedral: g => {
    waGround(g, WA.pave);
    waR(g, '#a9a79d', 4, 1, 16, 10); waP(g, WA.slate, [4, 11, 20, 11, 18, 15, 6, 15]);
    for (const x of [1.6, 17.4]) { waR(g, '#9c9a90', x, 1, 5, 18); waR(g, '#8a887e', x + 3.4, 1, 1.6, 18); waP(g, WA.slateD, [x - 0.2, 19, x + 5.2, 19, x + 2.5, 27]); waR(g, WA.dark, x + 1.8, 13, 1.4, 3); }
    waE(g, WA.blue, 12, 8, 2.4, 2.4); waE(g, '#c2453f', 12, 8, 1, 1); waP(g, WA.dark, [10.6, 1, 13.4, 1, 13.4, 4, 12, 5.6, 10.6, 4]);
    for (let k = 0; k < 4; k++) waR(g, '#8a887e', 5 + k * 4, 1, 0.8, 10);
  },
  greatmosque: g => {
    waGround(g, WA.pave);
    waR(g, WA.stoneL, 0.4, 1, 23.2, 3); for (let k = 0; k < 10; k++) waP(g, WA.dark, [1.2 + k * 2.3, 1, 2.4 + k * 2.3, 1, 2.4 + k * 2.3, 2.2, 1.8 + k * 2.3, 2.9, 1.2 + k * 2.3, 2.2]);
    waR(g, WA.cream, 4.5, 4, 15, 6); waE(g, WA.cream, 6.6, 10, 2, 2, true); waE(g, WA.cream, 17.4, 10, 2, 2, true);
    waR(g, WA.cream, 8.4, 10, 7.2, 2); waE(g, WA.verd, 12, 12, 5, 5.6, true); waR(g, WA.gold, 11.6, 17.6, 0.8, 1.8);
    for (const x of [1, 21.4]) { waR(g, WA.cream, x, 1, 1.6, 19); waR(g, WA.stoneD, x - 0.3, 14, 2.2, 0.8); waP(g, WA.verd, [x - 0.1, 20, x + 1.7, 20, x + 0.8, 23]); }
    waP(g, WA.dark, [11, 4, 13, 4, 13, 7, 12, 8.2, 11, 7]);
  },
  pagoda: g => {
    waGround(g, WA.pave);
    let w = 11, h = 1;
    for (let s = 0; s < 5; s++) {
      const x = 9 - w / 2, bh = 3.2 - s * 0.2;
      waR(g, WA.red, x, h, w, bh); waR(g, WA.redD, x + w * 0.7, h, w * 0.3, bh);
      waP(g, '#3f3a36', [x - 2.2, h + bh + 1.2, x - 1, h + bh, x + w + 1, h + bh, x + w + 2.2, h + bh + 1.2, x + w - 0.6, h + bh + 1.8, x + 0.6, h + bh + 1.8]);
      h += bh + 1.8; w -= 1.8;
    }
    waR(g, WA.gold, 8.6, h, 0.8, 4.6); for (let q = 0; q < 3; q++) waR(g, WA.goldD, 8.1, h + 1 + q * 1.1, 1.8, 0.4);
  },
  observatory: g => {
    waGround(g, WA.pave);
    waP(g, '#d79c78', [1, 1, 11, 1, 11, 15]); waP(g, '#c08262', [6, 1, 11, 1, 11, 15, 9.6, 15]);
    for (let k = 0; k < 7; k++) waR(g, WA.brickD, 3 + k * 1.2, 1 + k * 1.6 + 0.6, 1, 0.4);
    const p = waLay(g, '#e0b090', 1); p.moveTo(11.5, -1); p.arc(11.5, -1, 6, -Math.PI / 2, 0); waSee(g, 17.5, 7);
    waR(g, WA.stoneL, 13, 1, 4, 5); waE(g, WA.stone, 15, 6, 2, 2, true); waR(g, WA.dark, 14.6, 6.6, 0.8, 1.4);
  },
  clocktower: g => {
    waGround(g, WA.paveD);
    waR(g, WA.brick, 3, 1, 6, 19); waR(g, WA.brickD, 7.4, 1, 1.6, 19); waR(g, WA.stoneL, 2.6, 13, 6.8, 0.8); waR(g, WA.stoneL, 2.6, 19.6, 6.8, 0.8);
    waE(g, WA.white, 6, 16.4, 2.2, 2.2); waLn(g, WA.dark, 0.35, [6, 16.4, 6, 18]); waLn(g, WA.dark, 0.35, [6, 16.4, 7.2, 16.4]);
    for (let k = 0; k < 3; k++) waR(g, WA.dark, 4.2 + k * 1.4, 7, 0.7, 2.4);
    waR(g, WA.dark, 5.2, 1, 1.6, 2.6); waP(g, WA.verd, [2.6, 20.4, 9.4, 20.4, 6, 28.4]); waR(g, WA.gold, 5.8, 28.4, 0.4, 1.6);
  },
  clothhall: g => {
    waGround(g, WA.pave);
    waR(g, WA.brick, 0.5, 1, 17, 6.4); waP(g, WA.slate, [0.5, 7.4, 17.5, 7.4, 15, 10.4, 3, 10.4]);
    for (let k = 0; k < 8; k++) waP(g, WA.dark, [1.4 + k * 2.05, 1, 2.6 + k * 2.05, 1, 2.6 + k * 2.05, 3, 2 + k * 2.05, 3.7, 1.4 + k * 2.05, 3]);
    for (let k = 0; k < 8; k++) waR(g, WA.dark, 1.6 + k * 2.05, 4.8, 0.8, 1.4);
    waR(g, WA.brickL, 7, 1, 4, 15); waR(g, WA.brickD, 9.8, 1, 1.2, 15); waR(g, WA.dark, 8.4, 12, 1.2, 2.2); waP(g, WA.slateD, [6.6, 16, 11.4, 16, 9, 22]); waR(g, WA.gold, 8.8, 22, 0.4, 1.2);
  },
  statebasin: g => {
    waGround(g, WA.paveD);
    waR(g, WA.stoneL, 1.2, 1.2, 21.6, 15.6); waR(g, WA.water, 2.4, 2.4, 19.2, 13.2); waR(g, WA.waterL, 3.4, 12.6, 6, 0.5);
    waR(g, WA.stoneL, 9.6, 0.3, 1.4, 2.6); waR(g, WA.stoneL, 13, 0.3, 1.4, 2.6); waR(g, WA.water, 11, 0.3, 2, 2.4);
    waR(g, WA.woodD, 11, 1, 2, 0.4); waR(g, WA.woodD, 11, 2.2, 2, 0.4);
    waR(g, WA.wood, 5, 5, 4, 1.4); waR(g, WA.wood, 14, 9, 5, 1.4); waR(g, WA.cream, 15, 10.4, 1.2, 1.2);
    waLn(g, WA.woodD, 0.5, [20, 15, 20, 21, 16, 19.6]);
  },
  grandpalace: g => {
    waGround(g, WA.grass); waR(g, WA.grassL, 2, 0.4, 20, 2.4); waR(g, WA.pave, 10, 0.3, 4, 3);
    for (const [x, w] of [[0.4, 7], [16.6, 7]]) { waR(g, '#efe4c4', x, 2, w, 8); waP(g, '#5c6a7a', [x - 0.2, 10, x + w + 0.2, 10, x + w - 0.8, 11.8, x + 0.8, 11.8]); for (let k = 0; k < 3; k++) waR(g, WA.dark, x + 1 + k * 2.1, 4, 0.9, 2.4); }
    waR(g, '#f4ead0', 7, 2, 10, 10); waR(g, WA.marbleD, 7, 2, 10, 0.8);
    waCols(g, WA.white, 8, 16, 5, 2.8, 6.6, 0.8); waP(g, WA.marbleD, [7, 12, 17, 12, 12, 14.4]);
    waE(g, '#5c6a7a', 12, 14.2, 3.4, 3.8, true); waR(g, WA.gold, 11.6, 18, 0.8, 1.8);
  },
  royalobs: g => {
    waGround(g, WA.grass);
    waR(g, WA.brick, 1, 1, 16, 6.4); waR(g, WA.stoneL, 1, 7, 16, 0.6); for (let k = 0; k < 6; k++) waR(g, WA.white, 2 + k * 2.5, 3, 1, 2.4);
    waE(g, '#c9ccd0', 5, 7.6, 3, 3, true); waR(g, WA.dark, 4.6, 8.4, 0.8, 2.4); waE(g, '#c9ccd0', 13, 7.6, 2.6, 2.6, true); waR(g, WA.dark, 13.4, 8.2, 0.7, 1.8);
    waR(g, WA.brickD, 8.4, 7.6, 1.2, 4); waE(g, WA.gold, 9, 12, 0.9, 0.9);
  },
  basilica: g => {
    waGround(g, WA.pave); waE(g, WA.paveD, 12, 3, 10, 2.6);
    waR(g, WA.marbleD, 7.4, 9, 9.2, 4); for (let k = 0; k < 5; k++) waR(g, WA.dark, 8.2 + k * 1.8, 10, 0.7, 2);
    waE(g, '#7f93a6', 12, 13, 5.2, 5.6, true); waR(g, WA.marble, 11.2, 18.4, 1.6, 2.2); waR(g, WA.gold, 11.8, 20.6, 0.4, 1.6); waR(g, WA.gold, 11.3, 21.4, 1.4, 0.4);
    waR(g, WA.marble, 3, 1, 18, 8.4); waCols(g, WA.white, 4, 20, 8, 2, 6, 0.8); waR(g, WA.marbleD, 3, 8.4, 18, 1); waP(g, WA.marbleD, [8, 9.4, 16, 9.4, 12, 11.6]);
    waR(g, WA.dark, 11, 1, 2, 3);
  },
  opera: g => {
    waGround(g, WA.pave);
    waR(g, WA.cream, 1, 1, 16, 9); waR(g, WA.stoneD, 1, 1, 16, 1.2);
    for (let k = 0; k < 5; k++) waP(g, WA.dark, [2 + k * 3, 2.2, 4 + k * 3, 2.2, 4 + k * 3, 4.6, 3 + k * 3, 5.6, 2 + k * 3, 4.6]);
    waCols(g, WA.white, 1.6, 16.4, 6, 6, 3.6, 0.7); waR(g, WA.stoneD, 1, 9.6, 16, 0.8);
    waE(g, WA.verd, 9, 10.4, 5.4, 4.4, true); waR(g, WA.gold, 8.6, 14.8, 0.8, 1.6);
    waR(g, WA.gold, 1.2, 10.4, 1.2, 2); waR(g, WA.gold, 15.6, 10.4, 1.2, 2);
  },
  fairtower: g => {
    waGround(g, WA.grass); waR(g, WA.pave, 3, 0.3, 12, 4);
    const c = '#6a4f3a';
    waLn(g, c, 0.8, [1, 1, 7.6, 22, 8.4, 33]); waLn(g, c, 0.8, [17, 1, 10.4, 22, 9.6, 33]); waLn(g, c, 0.5, [9, 33, 9, 38]);
    waLn(g, c, 0.4, [3.6, 1, 7.8, 12]); waLn(g, c, 0.4, [14.4, 1, 10.2, 12]);
    for (let h = 3; h < 22; h += 2.4) { const a = 1 + (h - 1) / 21 * 6.6, b = 17 - (h - 1) / 21 * 6.6; waLn(g, c, 0.3, [a, h, b, h + 2.4]); waLn(g, c, 0.3, [b, h, a, h + 2.4]); }
    const p = waLay(g, c, 0.7); p.moveTo(4, -1); p.quadraticCurveTo(9, -10, 14, -1);
    waR(g, '#7d5e44', 3.2, 7.4, 11.6, 1); waR(g, '#7d5e44', 6.6, 15, 4.8, 0.9); waR(g, '#7d5e44', 8, 26, 2, 0.8);
  },
  crystal: g => {
    waGround(g, WA.grass);
    waR(g, WA.glass, 1, 1, 22, 6); waE(g, WA.glass, 12, 7, 11, 2.6, true); waE(g, '#b4d8e8', 12, 7, 5, 6, true);
    const p = waLay(g, WA.white, 0.3);
    for (let x = 2; x < 23; x += 1.6) { p.moveTo(x, -1); p.lineTo(x, -7); }
    p.moveTo(1, -4); p.lineTo(23, -4);
    for (let a = 0.25; a < Math.PI; a += 0.35) { p.moveTo(12, -7); p.lineTo(12 + Math.cos(a) * 5, -7 - Math.sin(a) * 6); }
    waR(g, WA.white, 11.4, 13, 1.2, 1.4); waR(g, WA.steelD, 10.8, 1, 2.4, 2.6);
  },
  publiclib: g => {
    waGround(g, WA.pave);
    waR(g, WA.white, 0.8, 1, 16.4, 9); waR(g, WA.marbleD, 0.4, 1, 17.2, 1);
    for (let k = 0; k < 5; k++) waP(g, WA.glassD, [2 + k * 3.1, 3, 3.6 + k * 3.1, 3, 3.6 + k * 3.1, 6.4, 2.8 + k * 3.1, 7.4, 2 + k * 3.1, 6.4]);
    waR(g, WA.marbleD, 0.8, 9.6, 16.4, 0.8); waR(g, WA.white, 6, 10.4, 6, 2.4);
    waE(g, WA.verd, 9, 12.8, 3.8, 4, true); waR(g, WA.white, 8.4, 16.6, 1.2, 1.6); waR(g, WA.verdD, 8.7, 18.2, 0.6, 1);
    waR(g, WA.stone, 3, 0.3, 1.6, 2); waR(g, WA.stone, 13.4, 0.3, 1.6, 2);
  },
  skyscraper: g => {
    waGround(g, WA.paveD);
    waR(g, '#c8c2b4', 1.6, 1, 8.8, 24); waR(g, '#a8a294', 7.6, 1, 2.8, 24);
    for (let k = 0; k < 5; k++) waR(g, '#6a7480', 2.4 + k * 1.5, 2.6, 0.6, 21);
    waR(g, '#c8c2b4', 2.8, 25, 6.4, 5); waR(g, '#a8a294', 7.4, 25, 1.8, 5); waR(g, '#d6d0c2', 3.8, 30, 4.4, 4);
    waP(g, '#e8e4d8', [4.4, 34, 7.6, 34, 6, 38]); waP(g, WA.steel, [5.7, 38, 6.3, 38, 6, 44]);
  },
  stadium: g => {
    waGround(g, WA.paveD);
    waE(g, WA.concD, 12, 11, 11.6, 9.6); waE(g, WA.conc, 12, 11.4, 10.6, 8.6); waE(g, '#b8322c', 12, 11.8, 9, 7); waE(g, '#2f5f9f', 12, 12, 7.6, 5.6);
    waR(g, '#4f8f40', 6, 9.2, 12, 5.6); waR(g, WA.white, 11.9, 9.2, 0.25, 5.6); waLn(g, WA.white, 0.25, [6.3, 9.5, 17.7, 9.5, 17.7, 14.5, 6.3, 14.5, 6.3, 9.5]);
    for (let k = 0; k < 10; k++) { const x = 2 + k * 2.2, dx = (x - 12) / 11.6, h = 11 - 9.6 * Math.sqrt(Math.max(0, 1 - dx * dx)); waR(g, WA.concD, x, h + 0.6, 0.6, 2.2); }
    for (const [x, h] of [[1.6, 4], [22.4, 4], [3, 19], [21, 19]]) { waLn(g, WA.steelD, 0.4, [x, h, x, h + 12]); waR(g, WA.white, x - 1, h + 12, 2, 1); }
  },
  broadcast: g => {
    waGround(g, WA.paveD);
    waR(g, WA.concD, 3, 1, 6, 2.4);
    waP(g, WA.conc, [4.8, 3.4, 7.2, 3.4, 6.5, 30, 5.5, 30]); waP(g, WA.concD, [6, 3.4, 7.2, 3.4, 6.5, 30, 6, 30]);
    waE(g, WA.conc, 6, 23.4, 3.2, 1.6); waR(g, WA.glassD, 2.9, 23.6, 6.2, 1); waE(g, WA.concD, 6, 25.6, 2.2, 0.9);
    waLn(g, WA.steelD, 0.4, [6, 30, 6, 40]); waR(g, '#d63b3b', 5.7, 39.6, 0.6, 0.6);
  },
  spacecentre: g => {
    waGround(g, WA.paveD); waR(g, '#6a6e72', 13, 0.3, 10, 4);
    waR(g, WA.white, 1, 1, 10, 17); waR(g, '#d8d8d4', 8.4, 1, 2.6, 17); waR(g, WA.dark, 4, 1, 3, 12);
    waR(g, '#2f5f9f', 1.6, 14, 3, 2.4); waR(g, '#b8322c', 1.6, 12.6, 3, 1);
    waR(g, '#b8322c', 14, 1, 3, 22); const p = waLay(g, '#7a1e18', 0.3); for (let h = 2; h < 23; h += 2) { p.moveTo(14, -h); p.lineTo(17, -h - 2); }
    waR(g, '#b8322c', 17, 16, 2.4, 0.8); waR(g, '#b8322c', 17, 9, 2.4, 0.8);
    waR(g, WA.white, 19, 2, 2.6, 18); waP(g, WA.white, [19, 20, 21.6, 20, 20.3, 23.6]); waR(g, WA.dark, 19, 6, 2.6, 0.6);
    waP(g, WA.white, [18.4, 2, 19, 2, 19, 5]); waP(g, WA.white, [21.6, 2, 22.2, 2, 21.6, 5]);
  },
  supertall: g => {
    waGround(g, WA.paveD);
    waP(g, '#7fa8c0', [1.4, 1, 10.6, 1, 9.6, 22, 8.4, 36, 7, 46, 5, 46, 3.6, 36, 2.4, 22]);
    waP(g, WA.glassD, [6, 1, 10.6, 1, 9.6, 22, 8.4, 36, 7, 46, 6, 46]);
    const p = waLay(g, '#c8dcea', 0.25); for (let h = 4; h < 45; h += 3) { const s = h < 22 ? (h - 1) / 21 : h < 36 ? 1 + (h - 22) / 14 : 2 + (h - 36) / 10, hw = 4.6 - s * 1.2; p.moveTo(6 - hw, -h); p.lineTo(6 + hw, -h); }
    waP(g, WA.steel, [5.6, 46, 6.4, 46, 6, 54]);
  },
  spaceelevator: g => {
    waGround(g, WA.paveD);
    waE(g, WA.concD, 9, 6, 8.4, 5); waE(g, WA.conc, 9, 6.6, 6.6, 3.8); waR(g, WA.steel, 5, 6, 8, 5); waR(g, WA.steelD, 11, 6, 2, 5);
    waE(g, WA.white, 9, 11, 4, 2, true);
    waLn(g, '#5fd0e0', 0.5, [9, 12, 9, 140]); waR(g, WA.white, 8, 44, 2, 3); waR(g, WA.white, 8.2, 92, 1.6, 2.4);
  },
};
// ---- the caches ----
const WA_GREY = new Map();
function waGrey(col) {
  let v = WA_GREY.get(col);
  if (v) return v;
  let r = 140, gg = 132, b = 120, a = '';
  const m = /^#([0-9a-f]{6})$/i.exec(col);
  if (m) { const n = parseInt(m[1], 16); r = (n >> 16) & 255; gg = (n >> 8) & 255; b = n & 255; }
  else { const q = /rgba?\(([^)]+)\)/.exec(col); if (q) { const s = q[1].split(','); r = +s[0]; gg = +s[1]; b = +s[2]; a = s[3] !== undefined ? s[3] : ''; } }
  const y = (r * 0.3 + gg * 0.55 + b * 0.15) * 0.85, mix = (c, t) => Math.round(c * 0.3 + t * 0.7);
  v = a ? `rgba(${mix(r, y + 6)},${mix(gg, y)},${mix(b, y - 6)},${a})` : `rgb(${mix(r, y + 6)},${mix(gg, y)},${mix(b, y - 6)})`;
  WA_GREY.set(col, v);
  return v;
}
const waCache = new Map();
function waGet(K) {
  let A = waCache.get(K.id);
  if (A) return A;
  const g = waNew(K);
  (WA_ART[K.id] || WA_ART.henge)(g);
  const ground = g.L[0];
  // the ruin: the lower part, broken off unevenly, greyed by weather, with fallen blocks in front
  const rh = Math.max(3, g.H * 0.38), clip = new Path2D(), rub = new Path2D();
  clip.moveTo(g.x0 - 1, 1); clip.lineTo(g.x0 - 1, -rh);
  for (let x = g.x0, k = 0; x <= g.x1 + 1; x += 1.3, k++) clip.lineTo(x, -rh * (0.45 + hash2(K.ix, k, 41) * 0.75));
  clip.lineTo(g.x1 + 1, 1); clip.closePath();
  for (let k = 0; k < 7; k++) { const x = 1 + hash2(K.ix, k, 43) * (g.W - 3), h = 0.5 + hash2(K.ix, k, 44) * Math.min(4, g.D * 0.4); rub.rect(x, -h - 1, 1 + hash2(K.ix, k, 45) * 1.4, 0.8 + hash2(K.ix, k, 46)); }
  const R0 = g.L.map(([c, p, lw], q) => [q === 0 ? c : waGrey(c), p, lw]);
  // scaffolding up the whole outline, cut back to the work done as it is drawn
  const sc = new Path2D();
  for (let x = Math.max(0.4, g.x0); x <= Math.min(g.W - 0.4, g.x1); x += 2.6) { sc.moveTo(x, -0.5); sc.lineTo(x, -g.H - 1.5); }
  for (let h = 2.5; h < g.H + 1.5; h += 3) { sc.moveTo(Math.max(0.4, g.x0), -h); sc.lineTo(Math.min(g.W - 0.4, g.x1), -h); }
  A = { L: g.L, R: R0, H: g.H, x0: g.x0, x1: g.x1, clip, rub, sc, ground };
  waCache.set(K.id, A);
  return A;
}
function waPaint(ctx, L, z, from) {
  for (let k = from || 0; k < L.length; k++) {
    const [st, p, lw] = L[k];
    if (lw) { ctx.strokeStyle = st; ctx.lineWidth = Math.max(lw, 0.6 / z); ctx.stroke(p); } else { ctx.fillStyle = st; ctx.fill(p); }
  }
}
// ---- drawing, called from drawWorld (render.js) with the screen transform; x0..y1 the tiles in view (with a margin) ----
const waVis = [];
const waFront = (a, b) => (a.y + a.sh) - (b.y + b.sh);
function drawWonders(ctx, c, z, x0, y0, x1, y1) {
  const L = W.wonders;
  if (!L || !L.length) return;
  waVis.length = 0;
  for (const o of L) {
    const K = WONDER[WN_IX[o.k]];
    if (!K || o.x + o.sw < x0 || o.x > x1 || o.y + o.sh < y0) continue;
    const H = waCache.has(K.id) ? waCache.get(K.id).H : 60;
    if (o.y - H / TS > y1) continue;
    waVis.push(o);
  }
  if (!waVis.length) return;
  waVis.sort(waFront);
  ctx.save();
  if (z < 0.5) {
    // far out: a small diamond, gold when standing, hollow while it goes up, grey as a ruin
    const r = Math.max(2.5, Math.min(6, TS * z * 1.2));
    ctx.lineWidth = 1;
    for (const o of waVis) {
      const sx = ((o.x + o.sw / 2) * TS - c.x) * z, sy = ((o.y + o.sh / 2) * TS - c.y) * z;
      ctx.beginPath(); ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r, sy); ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r, sy); ctx.closePath();
      ctx.fillStyle = o.st === 2 ? '#8a8478' : o.st === 0 ? 'rgba(227,194,60,.35)' : '#e3c23c'; ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,10,.8)'; ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
  for (const o of waVis) {
    const K = WONDER[WN_IX[o.k]], A = waGet(K), ox = o.x * TS, oy = (o.y + o.sh) * TS;
    ctx.setTransform(z, 0, 0, z, (ox - c.x) * z, (oy - c.y) * z);
    if (o.st === 2) {
      ctx.fillStyle = A.ground[0]; ctx.fill(A.ground[1]);
      ctx.save(); ctx.clip(A.clip); waPaint(ctx, A.R, z, 1); ctx.restore();
      ctx.fillStyle = '#8f887a'; ctx.fill(A.rub);
      continue;
    }
    if (o.st === 1) { waPaint(ctx, A.L, z); continue; }
    // going up: the ground, then as much as is built, and the scaffolding a little above it
    const f = clamp(o.prog / Math.max(1, o.need), 0, 1), hb = Math.max(0.6, A.H * f);
    ctx.fillStyle = A.ground[0]; ctx.fill(A.ground[1]);
    ctx.save(); ctx.beginPath(); ctx.rect(A.x0 - 2, -hb, A.x1 - A.x0 + 4, hb + 2); ctx.clip(); waPaint(ctx, A.L, z, 1); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(A.x0 - 2, -Math.min(A.H + 1.5, hb + 3), A.x1 - A.x0 + 4, Math.min(A.H + 1.5, hb + 3) + 1); ctx.clip();
    ctx.strokeStyle = K.era >= 6 ? '#9aa0a6' : '#8a6a44'; ctx.lineWidth = Math.max(0.35, 0.6 / z); ctx.stroke(A.sc); ctx.restore();
    if (K.era >= 6 && z >= 1) {
      // a tower crane beside it
      const cx = A.x1 + 1.2, ch = Math.min(A.H + 4, hb + 6);
      ctx.strokeStyle = '#d8a53a'; ctx.lineWidth = Math.max(0.5, 0.8 / z);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, -ch); ctx.moveTo(cx + 2, -ch); ctx.lineTo(cx - 9, -ch); ctx.moveTo(cx - 7, -ch); ctx.lineTo(cx - 7, -ch + 3); ctx.stroke();
    }
  }
  ctx.restore();
}
