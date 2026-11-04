'use strict';
// Harbour art: every port building (12 art pixels a tile, water along the bottom edge), boatyards and boathouses,
// and the newer merchant hulls. Loaded after art.js.

const PA = {
  sea: '#3f7fb0', seaL: '#7fb6d8', seaD: '#2f6a96', sand: '#d8c690', grass: '#7f8a6e', stone: '#a9a598', stoneL: '#c8c4b6', stoneD: '#8c887c',
  pave: '#9a8a6a', paveL: '#b5a585', conc: '#8c8a82', concL: '#a9a7a0', wood: '#7a5a35', woodL: '#a58650', woodD: '#4a3620', plank: '#8a6a3f',
  brick: '#a5533f', brickD: '#7a3a2c', tile: '#b4623f', steel: '#55595f', steelL: '#70757c', white: '#e8e4d8', glass: '#3f6a84', glassL: '#7fb6d8',
  yellow: '#d8a53a', red: '#c8452f', blue: '#3a7fb5', green: '#4fa35e', purple: '#8a5fb0', coal: '#2a2a2e', ore: '#8a4a3a', foot: 'rgba(0,0,0,.25)',
};
const BOX = ['#c8452f', '#3a7fb5', '#d8a53a', '#4fa35e', '#8a5fb0', '#e8e4d8'];
// little drawing pieces, all on the r(x, y, w, h, colour) brush
const paSea = (r, x, y, w, h) => { r(x, y, w, h, PA.sea); for (let k = 0; k < w; k += 5) r(x + k + ((y + k) % 3), y + 1 + (k % 2) * 2, 2, 1, PA.seaL); };
const paPiles = (r, x0, x1, y, h, col) => { for (let x = x0; x < x1; x += 3) r(x, y, 1, h || 3, col || PA.woodD); };
const paShed = (r, x, y, w, h, roof, wall, door) => { r(x, y, w, 2, roof); r(x, y + 2, w, h - 2, wall); r(x, y + 2, w, 1, 'rgba(0,0,0,.18)'); if (door !== false) r(x + Math.floor(w / 2) - 1, y + h - 3, 2, 3, '#2a2018'); };
const paBoat = (r, x, y, col, len) => { const L = len || 6; r(x, y, L, 2, col || PA.wood); r(x + 1, y + 2, L - 2, 1, PA.woodD); };
const paTank = (r, x, y, d, col, hi) => { const rr = d / 2; for (let k = 0; k < d; k++) { const hw = Math.round(Math.sqrt(Math.max(0, rr * rr - (k - rr + 0.5) * (k - rr + 0.5)))); r(x + Math.round(rr) - hw, y + k, hw * 2, 1, col); } r(x + Math.round(rr) - 1, y + 1, 2, 1, hi || '#fff'); };
const paCrane = (r, x, y, h, col, reach) => { r(x, y, 2, h, col); r(x - 1, y + h - 1, 4, 1, PA.steel); r(x - (reach || 6), y, (reach || 6) + 3, 1, col); r(x - (reach || 6), y + 1, 1, 3, '#2a2a2e'); };
const paGantry = (r, x, y, w, h, col) => { r(x, y, 1, h, col); r(x + w - 1, y, 1, h, col); r(x, y, w, 2, col); r(x + 1, y + 2, w - 2, 1, 'rgba(0,0,0,.2)'); r(x + Math.floor(w / 2) - 1, y + 2, 3, 2, PA.steel); };
const paBoxes = (r, x, y, cols, rows, seed) => { for (let a = 0; a < rows; a++) for (let b = 0; b < cols; b++) r(x + b * 4, y + a * 3, 3, 2, BOX[(a * 3 + b * 7 + (seed || 0)) % 6]); };
const paWin = (r, x, y, w, h, col, step) => { for (let yy = y; yy < y + h; yy += (step || 3)) for (let xx = x; xx < x + w; xx += 2) r(xx, yy, 1, 1, col || PA.glass); };
const paBollards = (r, x0, x1, y) => { for (let x = x0; x < x1; x += 5) r(x, y, 1, 1, '#2a2a2e'); };
const paHeap = (r, x, y, w, col, hi) => { for (let k = 0; k < Math.ceil(w / 2); k++) r(x + k, y - k, w - k * 2, 1, k === Math.ceil(w / 2) - 1 ? hi || col : col); };

if (typeof SPR !== 'undefined') Object.assign(SPR, {
  // ---- the first landings ----
  beachlanding: r => {
    r(0, 2, 12, 7, PA.sand); paSea(r, 0, 9, 12, 3); r(0, 8, 12, 1, '#e8dcae');
    for (let x = 1; x < 11; x += 3) r(x, 6, 1, 3, '#6b4a2a');  // log rollers
    paBoat(r, 1, 5, '#6b4a2c', 7); r(9, 2, 1, 4, PA.woodD); r(11, 2, 1, 4, PA.woodD); r(9, 2, 3, 1, PA.woodD); r(9, 3, 3, 2, '#c8b080');
    r(3, 2, 3, 2, '#55524c'); r(4, 2, 1, 1, '#ef8a2c');
  },
  fishjetty: r => {
    r(0, 2, 12, 4, PA.grass); paSea(r, 0, 6, 12, 6); r(4, 3, 3, 9, PA.plank); for (let y = 3; y < 12; y += 2) r(4, y, 3, 1, PA.woodD); paPiles(r, 3, 4, 7, 5); r(7, 7, 1, 5, PA.woodD);
    r(8, 2, 1, 4, PA.woodD); r(11, 2, 1, 4, PA.woodD); r(8, 2, 4, 1, PA.woodD); for (let x = 8; x < 12; x++) r(x, 3 + (x % 2), 1, 2, '#9a9a80');
    r(1, 3, 2, 2, '#b08a50'); r(1, 3, 2, 1, '#c8a060'); paBoat(r, 8, 9, '#6b4a2c', 4);
  },
  reedlanding: r => {
    r(0, 2, 12, 5, '#8a9a5a'); paSea(r, 0, 7, 12, 5); for (let x = 0; x < 12; x += 2) r(x, 6, 2, 2, '#c8b060');
    r(1, 2, 5, 3, '#c8b060'); r(1, 2, 5, 1, '#e0c878'); r(2, 3, 1, 2, '#5a4a2a');
    r(1, 9, 5, 2, '#d8c070'); r(0, 9, 1, 1, '#d8c070'); r(6, 8, 1, 1, '#d8c070'); r(7, 10, 4, 1, '#d8c070'); r(6, 10, 1, 1, '#c8b060');
  },
  hithe: r => {
    r(0, 2, 12, 5, PA.grass); paSea(r, 0, 7, 12, 5); r(0, 6, 12, 2, PA.plank); for (let x = 0; x < 12; x += 3) r(x, 6, 1, 2, PA.woodD); paPiles(r, 1, 12, 8, 2);
    paShed(r, 1, 1, 5, 5, '#7a4a30', '#c9ae7e'); r(8, 4, 2, 2, '#b89a64'); r(10, 3, 1, 3, PA.woodD); r(9, 3, 3, 1, PA.woodD);
  },
  saltquay: r => {
    r(0, 2, 12, 6, PA.pave); paSea(r, 0, 9, 12, 3); r(0, 8, 12, 1, PA.paveL); paPiles(r, 1, 12, 9, 3);
    r(1, 2, 7, 1, '#7a5a35'); r(1, 3, 1, 4, PA.woodD); r(7, 3, 1, 4, PA.woodD); paHeap(r, 2, 7, 5, '#f4f4ee', '#fff'); r(9, 5, 2, 3, '#8a6238'); r(9, 5, 2, 1, '#a07a48');
  },
  slipway: r => {
    r(0, 2, 12, 10, PA.grass); paSea(r, 0, 10, 12, 2); for (let y = 3; y < 11; y += 2) r(2, y, 8, 1, PA.plank); r(2, 3, 1, 8, PA.woodD); r(9, 3, 1, 8, PA.woodD);
    for (let x = 3; x < 9; x += 2) r(x, 4, 1, 5, '#c8a57a'); r(3, 8, 6, 1, '#6b4a2c'); r(3, 4, 6, 1, '#8a6238');
    r(10, 3, 2, 1, '#b89a64'); r(10, 5, 2, 1, '#b89a64'); r(10, 7, 2, 1, '#b89a64');
  },
  ferryslip: r => {
    r(0, 2, 12, 6, PA.grass); paSea(r, 0, 8, 12, 4); r(4, 5, 4, 7, PA.stone); for (let y = 6; y < 12; y += 2) r(4, y, 4, 1, PA.stoneD);
    paShed(r, 0, 2, 4, 4, '#7a4a30', '#c9ae7e'); r(10, 1, 1, 6, PA.woodD); r(9, 1, 3, 1, PA.woodD); r(9, 2, 2, 2, PA.yellow);
    paBoat(r, 8, 9, '#6b4a2c', 4);
  },
  packetpier: r => {
    r(0, 2, 12, 4, PA.pave); paSea(r, 0, 6, 12, 6); r(5, 4, 3, 8, PA.plank); paPiles(r, 5, 8, 9, 3); r(4, 11, 5, 1, PA.plank);
    paShed(r, 0, 1, 5, 5, '#3f5a70', PA.white); r(1, 4, 1, 1, PA.glass); r(10, 0, 1, 7, PA.woodD); r(8, 1, 5, 1, PA.woodD); r(8, 2, 1, 2, PA.red); r(11, 2, 1, 2, PA.blue); r(9, 3, 2, 1, PA.yellow);
  },
  paddlelanding: r => {
    r(0, 2, 12, 4, PA.grass); paSea(r, 0, 6, 12, 6); r(1, 8, 10, 3, '#55595f'); r(1, 8, 10, 1, PA.steelL); r(5, 5, 2, 3, PA.plank);
    r(2, 2, 3, 4, PA.white); r(2, 2, 3, 1, PA.red); r(3, 4, 1, 1, PA.glass); r(7, 9, 1, 1, '#2a2a2e'); r(9, 9, 1, 1, '#2a2a2e');
  },
  coastguard: r => {
    r(0, 2, 12, 7, PA.grass); paSea(r, 0, 9, 12, 3); r(7, 5, 3, 7, PA.conc); for (let y = 6; y < 12; y += 2) r(7, y, 3, 1, PA.concL);
    paShed(r, 0, 3, 6, 5, PA.red, PA.white); r(1, 6, 1, 1, PA.glass); r(4, 6, 1, 1, PA.glass); r(10, 0, 1, 7, PA.steelL); r(9, 1, 3, 1, PA.steelL); r(10, 0, 1, 1, PA.red);
    r(7, 7, 3, 3, PA.red); r(7, 7, 3, 1, '#ef6a4a'); r(8, 6, 1, 1, PA.white);
  },
  boatyard: r => {
    r(0, 2, 12, 8, PA.grass); paSea(r, 0, 10, 12, 2); paShed(r, 0, 2, 6, 6, '#6b4a2c', '#a58650', false); r(1, 5, 4, 3, '#3a2c1a');
    r(7, 5, 5, 2, '#8a6238'); for (let x = 7; x < 12; x += 2) r(x, 4, 1, 1, '#c8a57a'); r(6, 8, 6, 1, '#b89a64'); r(6, 9, 6, 1, '#9a7a48'); r(1, 9, 2, 1, PA.woodD);
  },
  boathouse: r => {
    paSea(r, 0, 8, 12, 4); r(0, 2, 12, 6, PA.grass); r(1, 2, 10, 2, '#5b3026'); r(1, 4, 10, 6, '#8a6238'); for (let x = 1; x < 11; x += 2) r(x, 4, 1, 6, '#6b4a2c');
    r(3, 7, 6, 5, '#2a2018'); r(4, 9, 4, 1, '#6b4a2c'); r(1, 10, 1, 2, PA.woodD); r(10, 10, 1, 2, PA.woodD);
  },
  // ---- stone harbours of the old world ----
  stonemole: r => {
    paSea(r, 0, 2, 24, 22); r(0, 2, 24, 6, PA.pave); r(0, 7, 24, 1, PA.paveL);
    r(18, 8, 4, 12, PA.stone); r(14, 18, 8, 4, PA.stone); r(18, 8, 1, 12, PA.stoneL); r(14, 18, 8, 1, PA.stoneL); for (let y = 9; y < 20; y += 3) r(19, y, 2, 1, PA.stoneD);
    paShed(r, 2, 2, 8, 6, PA.tile, '#c9ae7e'); paBollards(r, 1, 18, 8); r(12, 3, 3, 2, '#8a6238'); r(15, 4, 2, 2, '#b89a64');
    paBoat(r, 6, 12, '#6b4a2c', 8); r(9, 9, 1, 3, PA.woodD); paBoat(r, 4, 18, '#6b4a2c', 6);
  },
  emporium: r => {
    r(0, 2, 24, 16, PA.pave); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.paveL); paPiles(r, 1, 24, 19, 3);
    r(2, 3, 20, 2, PA.tile); r(2, 5, 20, 7, '#e0d4b4'); for (let x = 3; x < 22; x += 3) r(x, 5, 1, 7, '#c8bc9c'); r(10, 8, 4, 4, '#3a2c1a');
    for (let x = 2; x < 22; x += 3) { r(x, 13, 2, 3, '#b4683f'); r(x, 13, 2, 1, '#c87c50'); } r(14, 13, 8, 1, PA.red); r(14, 14, 8, 1, PA.white);
  },
  shipsheds: r => {
    r(0, 2, 24, 4, PA.stone); paSea(r, 0, 18, 24, 6);
    for (let k = 0; k < 4; k++) { const x = 1 + k * 6; r(x, 4, 5, 16, '#c9b68e'); r(x, 4, 5, 2, PA.tile); r(x + 1, 6, 3, 13, '#4a3a28'); r(x + 1, 10, 3, 6, '#6b4a2c'); r(x + 2, 9, 1, 1, '#b98142'); r(x + 5, 4, 1, 16, PA.stoneL); }
  },
  grainquay: r => {
    r(0, 2, 24, 16, PA.pave); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.paveL); paPiles(r, 1, 24, 19, 3);
    paShed(r, 1, 2, 13, 11, '#a5533f', '#d6c49c'); r(3, 6, 2, 2, '#3a2c1a'); r(9, 6, 2, 2, '#3a2c1a'); r(6, 9, 3, 4, '#3a2c1a');
    for (let x = 15; x < 23; x += 2) for (let y = 11; y < 16; y += 2) r(x, y, 2, 2, (x + y) % 4 ? '#d8bf74' : '#c8a860');
    r(17, 3, 1, 7, PA.woodD); r(14, 3, 8, 1, PA.woodD); r(14, 4, 1, 2, '#2a2a2e'); r(21, 4, 1, 2, '#2a2a2e');
  },
  beaconmole: r => {
    paSea(r, 0, 2, 24, 22); r(0, 2, 24, 4, PA.pave); r(2, 6, 4, 16, PA.stone); r(2, 6, 1, 16, PA.stoneL); r(2, 20, 18, 3, PA.stone); r(2, 20, 18, 1, PA.stoneL); paBollards(r, 3, 18, 22);
    r(16, 8, 5, 12, '#d6c49c'); r(16, 8, 1, 12, '#e9d8b3'); r(15, 6, 7, 2, '#b9a67f'); r(17, 3, 3, 3, '#ef8a2c'); r(18, 2, 1, 1, '#ffd34d'); r(17, 4, 3, 1, '#f5c94a');
    paBoat(r, 8, 15, '#6b4a2c', 7); r(11, 11, 1, 4, PA.woodD); r(12, 11, 3, 3, PA.white);
  },
  monsoonport: r => {
    r(0, 2, 24, 16, '#b8a070'); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, '#d0b888'); paPiles(r, 1, 24, 19, 3);
    r(1, 3, 9, 3, '#c8a050'); r(1, 6, 9, 6, '#8a5a30'); for (let x = 2; x < 10; x += 2) r(x, 7, 1, 4, '#6b3e20');  // carved hall, palm thatch
    r(12, 4, 11, 2, PA.red); r(12, 5, 11, 1, PA.yellow); r(13, 6, 1, 5, PA.woodD); r(22, 6, 1, 5, PA.woodD);
    for (let x = 13; x < 22; x += 2) { r(x, 10, 2, 2, ['#c8452f', '#d8a53a', '#7a4a20', '#4fa35e'][x % 4]); }
    r(4, 13, 3, 3, '#8a6238'); r(7, 14, 2, 2, '#c8a860'); r(20, 2, 1, 5, '#6b4a2c'); r(18, 2, 5, 1, '#4f8a3e');
  },
  customsquay: r => {
    r(0, 2, 24, 16, PA.pave); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.paveL); paPiles(r, 1, 24, 19, 3);
    paShed(r, 2, 2, 12, 10, PA.tile, PA.stoneL); paWin(r, 3, 6, 10, 2, '#3a2c1a', 3); r(7, 9, 2, 3, '#3a2c1a'); r(7, 2, 2, 1, PA.yellow);
    r(17, 6, 1, 6, PA.woodD); r(15, 6, 5, 1, PA.woodD); r(15, 7, 1, 2, '#9a9da2'); r(19, 7, 1, 2, '#9a9da2'); r(14, 9, 3, 1, PA.yellow); r(18, 9, 3, 1, PA.yellow);
    for (let x = 2; x < 22; x += 4) r(x, 13, 3, 3, '#8a6238');
  },
  timberpond: r => {
    r(0, 2, 24, 22, PA.grass); r(2, 5, 20, 15, PA.seaD); for (let y = 6; y < 19; y += 2) for (let x = 3 + (y % 4); x < 20; x += 6) r(x, y, 5, 1, '#8a6238');
    r(1, 4, 22, 1, PA.woodD); r(1, 20, 22, 1, PA.woodD); r(1, 4, 1, 17, PA.woodD); r(22, 4, 1, 17, PA.woodD); paSea(r, 0, 21, 24, 3);
    r(14, 1, 6, 4, '#7a5a35'); r(15, 1, 4, 1, '#a58650'); r(4, 2, 6, 2, '#c8a57a');
  },
  kontor: r => {
    r(0, 2, 24, 16, PA.pave); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.paveL); paPiles(r, 1, 24, 19, 3);
    for (let k = 0; k < 4; k++) r(5 + k, 1 + k * 0, 14 - k * 2, 1, PA.brickD); r(6, 0, 12, 2, PA.brickD); for (let s = 0; s < 4; s++) r(5 + s * 2, 2 - (s % 2), 2, 2, PA.brickD);
    r(5, 2, 14, 13, '#9c4d33'); paWin(r, 6, 4, 12, 9, '#e8d8a0', 3); r(11, 11, 3, 4, '#2a1a12'); r(17, 4, 4, 1, PA.woodD); r(20, 4, 1, 5, '#9a9da2');
    r(1, 12, 3, 3, '#8a6238'); r(20, 12, 3, 3, '#b89a64'); r(1, 15, 3, 1, '#6b4a2c');
  },
  craneharbour: r => {
    r(0, 2, 24, 16, PA.pave); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.paveL); paPiles(r, 1, 24, 19, 3);
    r(3, 5, 9, 10, '#8a6238'); r(3, 3, 9, 2, '#5b3026'); r(5, 7, 5, 5, '#4a3620'); for (let a = 0; a < 6; a++) r(7 + Math.round(Math.cos(a) * 2), 9 + Math.round(Math.sin(a) * 2), 1, 1, '#c8a57a');
    r(11, 4, 11, 1, PA.woodD); r(21, 5, 1, 6, '#2a2a2e'); r(20, 11, 3, 2, '#8a6238'); r(15, 13, 3, 3, '#6b4a2c'); r(18, 14, 3, 2, '#8a6238');
  },
  staplequay: r => {
    r(0, 2, 24, 16, PA.pave); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.paveL); paPiles(r, 1, 24, 19, 3);
    r(1, 2, 22, 2, PA.tile); r(1, 4, 22, 6, '#d6c49c'); for (let x = 2; x < 22; x += 4) { r(x, 6, 3, 4, '#3a2c1a'); r(x, 6, 3, 1, '#d6c49c'); }
    for (let x = 1; x < 13; x += 3) { r(x, 12, 3, 4, '#6b3e20'); r(x, 13, 3, 1, '#4a2a14'); } for (let x = 14; x < 23; x += 3) { r(x, 12, 3, 3, '#e8e0cc'); r(x, 12, 3, 1, '#fff'); }
  },
  herringport: r => {
    r(0, 2, 24, 14, PA.pave); paSea(r, 0, 16, 24, 8); r(0, 15, 24, 1, PA.paveL);
    paShed(r, 1, 2, 7, 7, '#55504a', '#c9ae7e'); paShed(r, 9, 2, 7, 7, '#55504a', '#c9ae7e'); for (let x = 17; x < 23; x += 2) for (let y = 4; y < 10; y += 2) r(x, y, 2, 2, '#6b4a2c');
    for (let x = 2; x < 22; x += 4) r(x, 11, 2, 2, '#9fb4c0'); paBoat(r, 2, 18, '#3f5a70', 6); paBoat(r, 10, 20, '#6b4a2c', 6); paBoat(r, 17, 17, '#3f5a70', 6); r(4, 14, 1, 4, PA.woodD);
    r(14, 3, 1, 1, '#fff'); r(20, 2, 1, 1, '#fff');
  },
  whalingstation: r => {
    r(0, 2, 24, 14, '#8c8a82'); paSea(r, 0, 16, 24, 8); r(4, 10, 10, 10, '#6d6b64'); for (let y = 11; y < 20; y += 2) r(4, y, 10, 1, '#5a5850');
    r(5, 12, 8, 4, '#3a3d42'); r(5, 12, 8, 1, '#55595f');  // a whale on the slip
    r(15, 5, 7, 6, '#7a4a30'); r(16, 7, 2, 2, '#2a1a12'); r(19, 7, 2, 2, '#2a1a12'); r(16, 8, 1, 1, '#ef8a2c'); r(20, 8, 1, 1, '#ef8a2c'); r(17, 1, 2, 4, '#3a3a3a'); r(16, 0, 3, 1, '#55555a');
    for (let x = 1; x < 4; x++) for (let y = 4; y < 14; y += 3) r(x, y, 1, 2, '#6b4a2c');
  },
  // ---- docks of the age of sail ----
  drydock: r => {
    r(0, 2, 24, 22, PA.stone); r(3, 4, 18, 18, '#6d6b64'); for (let y = 5; y < 22; y += 2) { r(3, y, 1, 1, PA.stoneD); r(20, y, 1, 1, PA.stoneD); }
    r(6, 6, 12, 13, '#6b4a2c'); r(7, 6, 10, 1, '#8a6238'); r(8, 19, 8, 1, '#4a3620'); for (let x = 6; x < 18; x += 3) { r(x - 1, 9, 1, 1, '#c8a57a'); r(x - 1, 15, 1, 1, '#c8a57a'); }
    r(2, 22, 20, 2, '#4a3620'); paSea(r, 0, 23, 24, 1); r(1, 3, 1, 5, PA.woodD); r(22, 3, 1, 5, PA.woodD);
  },
  canalbasin: r => {
    r(0, 2, 24, 22, PA.pave); r(3, 7, 18, 13, PA.seaD); r(3, 7, 18, 1, PA.seaL); r(10, 20, 4, 4, PA.seaD);
    for (let k = 0; k < 4; k++) { r(4 + k * 4, 9, 3, 9, ['#4f7a3a', '#a5533f', '#3a7fb5', '#d8a53a'][k]); r(4 + k * 4, 11, 3, 4, '#6b4a2c'); }
    paShed(r, 1, 1, 9, 5, '#5b3026', '#94503a'); paShed(r, 14, 1, 9, 5, '#5b3026', '#94503a'); r(21, 7, 1, 5, PA.woodD); r(17, 7, 5, 1, PA.woodD);
  },
  timberwharf: r => {
    r(0, 2, 24, 16, PA.pave); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.paveL); paPiles(r, 1, 24, 19, 3);
    for (let s = 0; s < 3; s++) for (let y = 0; y < 4; y++) { r(1 + s * 7, 4 + y * 3, 6, 2, y % 2 ? '#b89a64' : '#c8a57a'); r(1 + s * 7, 6 + y * 3, 6, 1, '#7a5a35'); }
    paCrane(r, 21, 2, 14, '#3a3d42', 5); r(16, 3, 1, 2, '#c8a57a');
  },
  wetdock: r => {
    r(0, 2, 36, 34, PA.pave); r(4, 10, 28, 20, PA.seaD); r(4, 10, 28, 1, PA.seaL); r(14, 30, 8, 6, PA.seaD); r(14, 31, 8, 1, '#4a3620'); r(14, 34, 8, 1, '#4a3620');
    for (let k = 0; k < 3; k++) paShed(r, 2 + k * 11, 2, 10, 7, '#5b3026', '#94503a');
    paShed(r, 0, 12, 3, 18, '#5b3026', '#94503a', false); paShed(r, 33, 12, 3, 18, '#5b3026', '#94503a', false);
    for (let k = 0; k < 3; k++) { r(6 + k * 9, 14 + (k % 2) * 7, 7, 3, '#4a3620'); r(9 + k * 9, 9 + (k % 2) * 7, 1, 6, '#2a1c10'); }
    paBollards(r, 5, 31, 11); paSea(r, 0, 35, 36, 1);
  },
  companydocks: r => {
    r(0, 2, 36, 34, PA.pave); r(0, 2, 36, 2, PA.brickD); r(0, 2, 2, 22, PA.brickD); r(34, 2, 2, 22, PA.brickD);
    for (let k = 0; k < 3; k++) { const x = 3 + k * 11; r(x, 5, 9, 2, '#55504a'); r(x, 7, 9, 13, PA.brick); paWin(r, x + 1, 9, 8, 9, '#2d2f36', 3); }
    r(16, 0, 1, 5, PA.woodD); r(17, 0, 4, 2, PA.red); r(17, 1, 4, 1, PA.white);
    paSea(r, 0, 26, 36, 10); r(0, 25, 36, 1, PA.paveL); paBollards(r, 1, 35, 25);
    for (let k = 0; k < 2; k++) { const x = 4 + k * 16; r(x, 30, 12, 3, '#46301c'); r(x + 4, 22, 1, 8, PA.woodD); r(x + 8, 23, 1, 7, PA.woodD); r(x + 2, 23, 5, 3, PA.white); r(x + 7, 24, 4, 3, PA.white); }
  },
  royaldockyard: r => {
    r(0, 2, 48, 46, PA.pave); paSea(r, 0, 40, 48, 8); r(0, 39, 48, 1, PA.paveL);
    for (let k = 0; k < 3; k++) { const x = 3 + k * 11; r(x, 18, 9, 22, '#7a6a52'); for (let y = 20; y < 40; y += 3) r(x, y, 9, 1, '#6b5b44'); r(x + 2, 22, 5, 15, '#46301c'); r(x + 3, 22, 3, 1, '#6b4a2c'); r(x + 4, 14, 1, 10, PA.woodD); }
    r(36, 4, 2, 34, '#c9ae7e'); r(36, 4, 2, 1, '#e0c890'); for (let y = 6; y < 38; y += 4) r(37, y, 1, 2, '#9a7a48');  // ropewalk
    paShed(r, 2, 3, 14, 10, '#55504a', '#c9ae7e'); paShed(r, 18, 3, 14, 10, '#5b3026', PA.brick); paWin(r, 19, 7, 12, 4, '#2d2f36', 3);
    r(40, 6, 6, 30, PA.seaD); for (let y = 8; y < 34; y += 3) r(41, y, 4, 1, '#8a6238');  // mast pond
    r(14, 0, 1, 4, PA.woodD); r(15, 0, 4, 2, PA.red);
  },
  // ---- steam and iron ----
  coalstaithes: r => {
    r(0, 2, 24, 8, '#55524c'); paSea(r, 0, 10, 24, 14);
    for (let x = 2; x < 22; x += 4) r(x, 8, 1, 16, '#4a3620'); r(0, 6, 24, 3, '#6b4a2c'); r(0, 6, 24, 1, '#8a6238'); r(0, 5, 24, 1, '#2a2a2e');
    for (let k = 0; k < 3; k++) { r(2 + k * 7, 2, 5, 3, '#3a3a3e'); r(2 + k * 7, 2, 5, 1, PA.coal); r(3 + k * 7, 5, 1, 1, '#1a1a1e'); r(5 + k * 7, 5, 1, 1, '#1a1a1e'); }
    r(9, 9, 2, 6, '#3a3a3e'); r(10, 15, 1, 2, PA.coal); r(4, 17, 16, 4, '#2d3036'); r(4, 17, 16, 1, '#4a4e55'); r(14, 14, 2, 3, '#2d3036');
  },
  steamerpier: r => {
    r(0, 2, 24, 6, PA.pave); paSea(r, 0, 8, 24, 16); r(9, 6, 5, 18, '#6d6b64'); r(9, 6, 1, 18, '#8c8a82'); for (let y = 9; y < 24; y += 3) { r(8, y, 1, 2, '#3a3a3e'); r(14, y, 1, 2, '#3a3a3e'); }
    r(7, 1, 9, 2, '#3f5a70'); r(7, 3, 9, 5, PA.white); paWin(r, 8, 4, 7, 2, PA.glass, 2); r(15, 14, 9, 5, '#2d3036'); r(15, 13, 9, 1, PA.white); r(19, 8, 2, 5, '#c8452f'); r(19, 8, 2, 1, '#1c1e22');
  },
  coalingstation: r => {
    r(0, 2, 24, 16, PA.conc); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.concL); paBollards(r, 1, 24, 17);
    paHeap(r, 1, 14, 9, PA.coal, '#45454a'); paHeap(r, 10, 14, 7, PA.coal, '#45454a'); r(18, 2, 1, 14, '#3a3d42'); r(13, 2, 9, 1, '#3a3d42'); r(13, 3, 1, 3, '#2a2a2e'); r(18, 14, 4, 3, '#55595f');
    r(19, 0, 2, 2, 'rgba(160,160,160,.6)'); for (let x = 2; x < 16; x += 4) r(x, 15, 2, 1, '#6b4a2c');
  },
  elevatorpier: r => {
    r(0, 2, 24, 16, PA.pave); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.paveL); paPiles(r, 1, 24, 19, 3);
    r(3, 0, 10, 16, '#a58650'); r(3, 0, 10, 2, '#7a5a35'); r(3, 0, 1, 16, '#c8a57a'); for (let y = 4; y < 15; y += 4) r(4, y, 8, 1, '#8a6a3f');
    r(13, 4, 9, 1, '#55595f'); r(21, 5, 1, 9, '#55595f'); r(15, 5, 1, 9, '#55595f'); r(20, 14, 3, 2, '#d8bf74'); r(14, 14, 3, 2, '#d8bf74');
  },
  emigrantquay: r => {
    r(0, 2, 24, 16, PA.pave); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.paveL); paBollards(r, 1, 24, 17);
    r(1, 2, 16, 3, '#55595f'); r(1, 5, 16, 6, '#c9ae7e'); paWin(r, 2, 6, 14, 2, '#3a2c1a', 3);
    for (let k = 0; k < 14; k++) { const x = 2 + (k * 7) % 20, y = 12 + (k * 3) % 4; r(x, y, 1, 2, ['#5a7fc8', '#a33a3a', '#2f6f4f', '#8b5aa8', '#6b4a2c'][k % 5]); r(x, y - 1, 1, 1, '#e0b090'); }
    r(18, 4, 4, 13, '#6d6b64'); r(19, 4, 2, 13, '#8c8a82'); r(17, 13, 3, 2, '#6b4a2c');
  },
  coldstore: r => {
    r(0, 2, 24, 16, PA.conc); paSea(r, 0, 18, 24, 6); r(0, 17, 24, 1, PA.concL); paBollards(r, 1, 24, 17);
    r(1, 3, 15, 12, '#efefef'); r(1, 3, 15, 1, '#fff'); r(1, 14, 15, 1, '#c5ccd3'); r(6, 10, 5, 5, '#8c939a'); r(19, 0, 2, 10, '#94503a'); r(18, 0, 4, 1, '#7a3a2c');
    r(17, 10, 6, 5, '#c5ccd3'); r(17, 10, 6, 1, '#e8ecef'); for (let x = 2; x < 15; x += 4) r(x, 16, 3, 1, '#c8452f');
  },
  trawlerdock: r => {
    r(0, 2, 24, 12, PA.conc); paSea(r, 0, 14, 24, 10); r(0, 13, 24, 1, PA.concL);
    r(1, 3, 22, 2, '#55595f'); r(1, 5, 22, 6, '#8c8a82'); for (let x = 2; x < 22; x += 3) r(x, 5, 1, 6, '#6d6b64'); r(3, 8, 18, 3, '#9fb4c0');
    for (let k = 0; k < 3; k++) { const x = 1 + k * 8; r(x, 18, 7, 3, '#2d3036'); r(x, 17, 7, 1, '#c8452f'); r(x + 4, 14, 2, 3, PA.white); r(x + 4, 13, 1, 1, '#2a2a2e'); r(x + 1, 15, 1, 2, '#55595f'); }
  },
  orejetty: r => {
    r(0, 2, 24, 7, '#7a6a5a'); paSea(r, 0, 9, 24, 15); paHeap(r, 1, 8, 9, PA.ore, '#a05a48'); paHeap(r, 11, 8, 7, PA.ore, '#a05a48');
    r(19, 3, 3, 21, '#55595f'); r(19, 3, 1, 21, '#70757c'); for (let y = 9; y < 24; y += 3) { r(18, y, 1, 2, '#3a3d42'); r(22, y, 1, 2, '#3a3d42'); } r(19, 2, 3, 1, '#d8a53a');
    r(13, 20, 6, 3, '#7a2c2c'); r(13, 20, 6, 1, '#9a3c3a');
  },
  pleasurepier: r => {
    r(0, 2, 24, 5, '#d8c690'); paSea(r, 0, 7, 24, 17); r(9, 5, 6, 19, '#8c7a5a'); for (let y = 8; y < 24; y += 3) { r(8, y, 1, 2, '#55524c'); r(15, y, 1, 2, '#55524c'); }
    r(5, 14, 14, 7, PA.white); r(5, 14, 14, 1, '#fff'); r(6, 11, 12, 3, '#3f8fa0'); r(11, 9, 2, 2, '#3f8fa0'); r(12, 8, 1, 1, PA.yellow); paWin(r, 6, 16, 12, 3, PA.glass, 2);
    for (let x = 9; x < 15; x++) r(x, 6 + (x % 2), 1, 1, ['#c8452f', '#d8a53a', '#3a7fb5'][x % 3]);
  },
  // ---- oil, cars and the modern harbour ----
  oiljetty: r => {
    r(0, 2, 24, 8, '#8c8a82'); paSea(r, 0, 10, 24, 14); paTank(r, 1, 2, 7, '#c5ccd3'); paTank(r, 9, 3, 6, '#c5ccd3'); paTank(r, 16, 2, 7, '#e8ecef');
    r(10, 9, 3, 14, '#70757c'); r(11, 9, 1, 14, '#2d3036'); r(5, 21, 13, 2, '#70757c'); r(7, 17, 1, 4, '#d8a53a'); r(15, 17, 1, 4, '#d8a53a'); r(6, 17, 3, 1, '#d8a53a'); r(14, 17, 3, 1, '#d8a53a');
  },
  floatingdock: r => {
    paSea(r, 0, 2, 24, 22); r(1, 4, 3, 19, '#c8452f'); r(20, 4, 3, 19, '#c8452f'); r(1, 20, 22, 3, '#a5352f'); r(1, 4, 3, 1, '#e8743a'); r(20, 4, 3, 1, '#e8743a');
    r(5, 8, 14, 10, '#3a3d42'); r(5, 8, 14, 2, '#55595f'); r(10, 4, 4, 4, PA.white); r(11, 2, 2, 2, '#2d3036');
    r(2, 0, 1, 5, PA.yellow); r(2, 0, 6, 1, PA.yellow); r(21, 0, 1, 5, PA.yellow); r(16, 0, 6, 1, PA.yellow);
  },
  offshorebase: r => {
    r(0, 2, 24, 14, PA.conc); paSea(r, 0, 16, 24, 8); r(0, 15, 24, 1, PA.concL);
    for (let y = 4; y < 12; y += 2) r(1, y, 9, 1, '#d8a53a'); r(1, 3, 1, 9, '#55595f'); r(9, 3, 1, 9, '#55595f');
    r(13, 3, 8, 8, '#55595f'); r(14, 4, 6, 6, '#3a3d42'); r(16, 5, 1, 4, PA.white); r(18, 5, 1, 4, PA.white); r(16, 7, 3, 1, PA.white);
    r(3, 17, 9, 4, '#e8743a'); r(3, 17, 9, 1, '#f09050'); r(9, 15, 3, 2, PA.white); r(14, 18, 8, 3, '#e8743a'); r(14, 18, 8, 1, '#f09050');
  },
  hoverport: r => {
    r(0, 2, 24, 8, PA.conc); paSea(r, 0, 16, 24, 8); r(4, 8, 16, 12, '#a9a7a0'); for (let y = 10; y < 20; y += 3) r(4, y, 16, 1, '#8c8a82');
    r(1, 2, 10, 5, PA.white); paWin(r, 2, 3, 8, 2, PA.glass, 2); r(1, 2, 10, 1, PA.blue);
    r(8, 11, 9, 5, '#2d3036'); r(9, 9, 7, 3, PA.white); r(14, 8, 2, 3, PA.red); r(9, 10, 5, 1, PA.glass);
  },
  marina: r => {
    r(0, 2, 24, 5, PA.grass); paSea(r, 0, 7, 24, 17); paShed(r, 1, 1, 8, 6, '#3f5a70', PA.white); r(15, 1, 1, 6, PA.white); r(16, 1, 3, 2, PA.blue);
    for (let k = 0; k < 3; k++) { const x = 3 + k * 8; r(x, 8, 1, 15, '#c9b68e'); for (let y = 9; y < 23; y += 3) { r(x - 3, y, 3, 2, '#efefef'); r(x + 1, y + 1, 3, 2, '#efefef'); r(x - 2, y - 2, 1, 2, '#9a9da2'); } }
  },
  ferryterminal: r => {
    r(0, 2, 36, 22, PA.conc); paSea(r, 0, 24, 36, 12); r(0, 23, 36, 1, PA.concL);
    r(2, 3, 14, 3, '#3f5a70'); r(2, 6, 14, 8, PA.white); paWin(r, 3, 7, 12, 5, PA.glass, 2);
    for (let y = 16; y < 22; y += 3) for (let x = 2; x < 20; x += 3) r(x, y, 2, 2, BOX[(x + y) % 5]);
    r(22, 20, 5, 10, '#55595f'); r(22, 20, 5, 1, PA.yellow); r(29, 20, 5, 10, '#55595f'); r(29, 20, 5, 1, PA.yellow);
    r(20, 29, 16, 5, PA.white); r(20, 29, 16, 1, '#fff'); r(20, 32, 16, 2, PA.blue); r(30, 26, 3, 3, PA.white);
  },
  linerterminal: r => {
    r(0, 2, 36, 22, PA.pave); paSea(r, 0, 24, 36, 12); r(0, 23, 36, 1, PA.paveL);
    r(3, 6, 30, 12, '#d6c49c'); r(3, 4, 30, 2, '#55595f'); paWin(r, 4, 8, 28, 8, '#3f5a70', 3); r(16, 0, 4, 6, '#d6c49c'); r(17, 1, 2, 2, '#fff'); r(17, 0, 2, 1, '#55595f');
    r(8, 18, 2, 8, '#8c8a82'); r(24, 18, 2, 8, '#8c8a82');
    r(2, 27, 32, 6, '#1c1e22'); r(2, 26, 32, 2, PA.white); paWin(r, 4, 26, 28, 1, PA.glass, 1); r(12, 23, 3, 3, PA.red); r(20, 23, 3, 3, PA.red);
  },
  roroterminal: r => {
    r(0, 2, 36, 24, PA.conc); paSea(r, 0, 26, 36, 10);
    for (let y = 4; y < 22; y += 3) for (let x = 2; x < 22; x += 3) r(x, y, 2, 2, BOX[(x * 3 + y) % 6]);
    r(24, 3, 10, 14, '#8c8a82'); for (let y = 5; y < 17; y += 3) r(24, y, 10, 1, '#6d6b64');
    r(4, 28, 30, 6, PA.white); r(4, 28, 30, 1, '#fff'); r(4, 31, 30, 1, PA.red); r(16, 24, 6, 4, '#55595f');
  },
  refineryterminal: r => {
    r(0, 2, 36, 26, '#8c8a82'); paSea(r, 0, 28, 36, 8);
    for (let k = 0; k < 3; k++) { r(3 + k * 5, 4 + k * 2, 3, 16 - k * 2, '#c5ccd3'); r(3 + k * 5, 4 + k * 2, 1, 16 - k * 2, '#e8ecef'); for (let y = 7 + k * 2; y < 20; y += 3) r(3 + k * 5, y, 3, 1, '#8c939a'); }
    r(30, 0, 2, 16, '#70757c'); r(30, 0, 2, 2, '#ef8a2c'); r(31, 0, 1, 1, '#ffd34d');
    paTank(r, 19, 6, 8, '#e8ecef'); paTank(r, 19, 15, 8, '#e8ecef'); for (let x = 2; x < 34; x += 6) r(x, 22, 4, 1, '#55595f');
    r(10, 23, 2, 9, '#70757c'); r(4, 30, 26, 4, '#3a3d42'); r(4, 30, 26, 1, '#55595f'); r(4, 32, 26, 2, '#7a3a2c');
  },
  gasterminal: r => {
    r(0, 2, 36, 26, PA.conc); paSea(r, 0, 28, 36, 8);
    for (let k = 0; k < 4; k++) { paTank(r, 2 + (k % 2) * 11, 3 + (k >> 1) * 11, 10, '#efefef', '#fff'); r(6 + (k % 2) * 11, 13 + (k >> 1) * 11, 2, 1, '#8c939a'); }
    r(25, 4, 9, 14, '#a9a7a0'); for (let x = 26; x < 34; x += 2) r(x, 5, 1, 12, '#70757c'); r(29, 18, 2, 12, '#70757c');
    r(4, 30, 28, 4, '#2d4a6a'); for (let k = 0; k < 4; k++) paTank(r, 6 + k * 6, 27, 4, '#e8ecef');
  },
  cruiseterminal: r => {
    r(0, 2, 36, 18, PA.pave); paSea(r, 0, 20, 36, 16); r(3, 4, 22, 10, '#7fb6d8'); r(3, 4, 22, 2, '#c5ccd3'); paWin(r, 4, 7, 20, 6, '#3f6a84', 2);
    for (let x = 27; x < 35; x += 3) { r(x, 7, 2, 4, PA.white); r(x, 10, 2, 1, '#2a2a2e'); }
    r(1, 22, 34, 10, '#fff'); r(1, 22, 34, 1, '#efefef'); for (let y = 23; y < 30; y += 2) paWin(r, 3, y, 30, 1, '#3f6a84', 1); r(1, 31, 34, 2, '#2d4a6a'); r(26, 18, 4, 4, PA.red); r(5, 20, 20, 2, '#e8ecef');
  },
  fishingharbour: r => {
    r(0, 2, 36, 12, PA.conc); paSea(r, 0, 14, 36, 22); r(0, 13, 36, 1, PA.concL); r(0, 30, 10, 6, PA.stone); r(26, 30, 10, 6, PA.stone);
    r(2, 3, 16, 2, '#55595f'); r(2, 5, 16, 7, '#8c8a82'); for (let x = 3; x < 18; x += 3) r(x, 5, 1, 7, '#6d6b64'); r(20, 3, 6, 9, '#efefef'); r(20, 3, 6, 1, '#fff'); r(28, 4, 6, 8, '#6b4a2c');
    for (let k = 0; k < 6; k++) { const x = 2 + (k % 3) * 11, y = 16 + (k >> 1 & 1) * 6 + (k > 2 ? 2 : 0); r(x, y, 8, 3, k % 2 ? '#2d3036' : '#3f5a70'); r(x + 5, y - 2, 2, 2, PA.white); r(x, y, 8, 1, k % 2 ? '#c8452f' : '#e8e4d8'); }
  },
  bulkterminal: r => {
    r(0, 2, 36, 24, '#7a7468'); paSea(r, 0, 26, 36, 10);
    paHeap(r, 1, 11, 14, PA.coal, '#45454a'); paHeap(r, 1, 21, 14, PA.ore, '#a05a48'); paHeap(r, 17, 11, 12, '#d8bf74', '#e8d08a');
    r(16, 2, 1, 22, '#d8a53a'); r(14, 12, 6, 1, '#d8a53a'); r(30, 4, 2, 22, '#55595f'); r(30, 4, 6, 1, '#55595f'); r(18, 22, 14, 2, '#70757c');
    r(3, 28, 30, 6, '#33404e'); r(3, 28, 30, 1, '#4a5868'); for (let x = 6; x < 30; x += 6) r(x, 28, 4, 1, '#8a5a3a');
  },
  navalcircle: r => {
    r(0, 2, 36, 34, PA.stone); for (let a = 0; a < 64; a++) { const t = a / 64 * 6.283; for (let k = 9; k < 14; k++) r(Math.round(18 + Math.cos(t) * k), Math.round(18 + Math.sin(t) * k * 0.9), 1, 1, k === 13 ? '#c9b68e' : '#b9a67f'); }
    for (let y = 8; y < 30; y++) for (let x = 6; x < 31; x++) { const dx = x - 18, dy = (y - 18) / 0.9; if (dx * dx + dy * dy < 81) r(x, y, 1, 1, PA.seaD); }
    for (let a = 0; a < 16; a++) { const t = a / 16 * 6.283; r(Math.round(18 + Math.cos(t) * 11), Math.round(18 + Math.sin(t) * 10), 1, 1, PA.tile); }
    r(15, 15, 6, 6, PA.stoneL); r(16, 11, 4, 6, '#d6c49c'); r(16, 10, 4, 1, PA.tile); r(17, 9, 2, 1, '#ef8a2c');
    r(15, 27, 6, 9, PA.sea); paSea(r, 0, 34, 36, 2);
  },
  junkharbour: r => {
    r(0, 2, 36, 34, PA.stone); r(3, 12, 30, 18, PA.seaD); r(3, 12, 30, 1, PA.seaL); r(13, 30, 10, 6, PA.sea);
    for (let k = 0; k < 3; k++) { const x = 2 + k * 11; r(x - 1, 3, 11, 2, '#a5352f'); r(x - 2, 4, 1, 1, '#a5352f'); r(x + 10, 4, 1, 1, '#a5352f'); r(x, 5, 9, 5, '#d6c49c'); r(x + 3, 7, 3, 3, '#3a2c1a'); }
    for (let k = 0; k < 3; k++) { const x = 6 + k * 9, y = 16 + (k % 2) * 6; r(x, y, 8, 3, '#6b4a2c'); r(x + 2, y - 5, 4, 5, '#c8a050'); for (let s = y - 5; s < y; s += 2) r(x + 2, s, 4, 1, '#8a6a30'); }
    paSea(r, 0, 35, 36, 1);
  },
  navalshipyard: r => {
    r(0, 2, 48, 46, PA.conc); paSea(r, 0, 38, 48, 10); r(0, 37, 48, 1, PA.concL);
    for (let k = 0; k < 2; k++) { const x = 4 + k * 20; r(x, 14, 14, 24, '#6d6b64'); r(x + 3, 18, 8, 18, '#5a636c'); r(x + 4, 17, 6, 1, '#747e88'); r(x + 5, 22, 4, 5, '#4a525a'); paGantry(r, x - 1, 6, 16, 32, PA.yellow); }
    r(44, 4, 2, 30, '#c8452f'); r(36, 4, 12, 1, '#c8452f'); r(37, 5, 1, 4, '#2a2a2e');
    paShed(r, 2, 3, 18, 8, '#55595f', '#8c8a82'); paWin(r, 3, 6, 16, 3, '#3f5a70', 2);
    r(4, 41, 40, 5, '#5a636c'); r(4, 41, 40, 1, '#747e88'); r(20, 38, 8, 3, '#6a747e');
  },
  autoterminal: r => {
    r(0, 2, 48, 36, '#7c7f83'); paSea(r, 0, 38, 48, 10);
    for (let b = 0; b < 4; b++) paBoxes(r, 2 + b * 11, 4, 2, 9, b * 5);
    for (let b = 0; b < 4; b++) { r(1 + b * 11, 3, 1, 28, '#d8e0e6'); r(10 + b * 11, 3, 1, 28, '#d8e0e6'); r(1 + b * 11, 3 + b * 5, 10, 1, '#d8e0e6'); }
    for (let k = 0; k < 6; k++) r(3 + k * 7, 33, 4, 2, '#e8e4d8');  // driverless carriers
    for (let k = 0; k < 3; k++) paGantry(r, 4 + k * 15, 26, 10, 14, '#3a7fb5');
    r(2, 41, 44, 5, '#2d4a6a'); paBoxes(r, 4, 39, 10, 1, 2);
  },
  megaport: r => {
    r(0, 2, 48, 36, '#7c7f83'); paSea(r, 0, 38, 48, 10);
    paBoxes(r, 2, 4, 5, 6, 1); paBoxes(r, 2, 24, 5, 3, 4);
    paTank(r, 24, 3, 8, '#e8ecef'); paTank(r, 33, 3, 8, '#e8ecef'); paTank(r, 24, 12, 8, '#c5ccd3');
    paHeap(r, 33, 21, 13, PA.coal, '#45454a'); paHeap(r, 24, 31, 10, PA.ore, '#a05a48');
    for (let k = 0; k < 3; k++) paGantry(r, 2 + k * 9, 28, 8, 12, '#d8a53a');
    r(1, 41, 30, 5, '#2d4a6a'); paBoxes(r, 3, 39, 7, 1, 3); r(33, 41, 14, 5, '#33404e'); r(33, 41, 14, 1, '#4a5868');
  },
  transshiphub: r => {
    paSea(r, 0, 2, 48, 46); r(10, 4, 28, 40, '#7c7f83');
    for (let b = 0; b < 3; b++) paBoxes(r, 13 + b * 8, 8, 2, 11, b * 2);
    for (let k = 0; k < 3; k++) { paGantry(r, 6, 6 + k * 13, 8, 10, '#3a7fb5'); paGantry(r, 34, 6 + k * 13, 8, 10, '#3a7fb5'); }
    r(1, 6, 5, 36, '#2d4a6a'); r(42, 6, 5, 36, '#7a3a2c'); for (let y = 8; y < 40; y += 3) { r(1, y, 4, 2, BOX[y % 6]); r(43, y, 3, 2, BOX[(y + 3) % 6]); }
  },
  greenport: r => {
    r(0, 2, 36, 24, PA.conc); paSea(r, 0, 26, 36, 10);
    for (let k = 0; k < 2; k++) { const x = 3 + k * 8; r(x, 4, 1, 16, '#efefef'); r(x - 3, 4, 7, 1, '#efefef'); r(x, 1, 1, 7, '#efefef'); }
    paTank(r, 18, 4, 7, '#e8ecef'); paTank(r, 26, 4, 7, '#e8ecef'); r(18, 12, 15, 6, '#4fa35e'); r(18, 12, 15, 1, '#7fc87a'); paWin(r, 19, 14, 13, 3, '#2d4a3a', 2);
    r(2, 22, 1, 6, '#d8a53a'); r(16, 22, 1, 6, '#d8a53a');
    r(4, 29, 28, 5, '#d8e0e6'); r(4, 29, 28, 1, '#fff'); r(10, 23, 3, 6, '#efefef'); r(22, 23, 3, 6, '#efefef');
  },
  floatingharbour: r => {
    paSea(r, 0, 2, 36, 34); r(3, 6, 30, 22, '#a9a7a0'); r(3, 6, 30, 1, '#c5ccd3'); for (let x = 3; x < 33; x += 6) r(x, 28, 2, 3, '#55595f');
    for (let k = 0; k < 4; k++) { r(5 + k * 7, 9, 5, 7, ['#e8ecef', '#7fb6d8', '#e8e4d8', '#c5ccd3'][k]); paWin(r, 6 + k * 7, 10, 3, 5, '#3f6a84', 2); }
    r(6, 18, 24, 6, '#7c7f83'); paBoxes(r, 7, 19, 5, 2, 1); paGantry(r, 25, 15, 7, 12, '#d8a53a');
    r(1, 30, 1, 5, '#55595f'); r(34, 30, 1, 5, '#55595f');
  },
});

// ---- the newer merchant hulls, drawn into shipSprite's canvas (L wide, 40 tall, waterline about 30-33) ----
const SHIP_ART = {
  reedboat: (r, g, hull, sail, polCol) => { r(14, 30, 20, 3, '#c8b060'); r(12, 28, 3, 3, '#c8b060'); r(33, 27, 3, 3, '#c8b060'); for (let x = 15; x < 33; x += 3) r(x, 30, 1, 3, '#a89040'); r(23, 18, 1, 12, '#8a6a30'); sail(18, 19, 9, 8, polCol); },
  merchgalley: (r, g, hull, sail, polCol, cream, wood, woodL, woodD) => { hull(5, 28, 38, 5, wood, woodL, woodD); r(4, 25, 4, 3, woodL); r(40, 26, 4, 2, woodL); for (let k = 8; k < 40; k += 3) r(k, 33, 1, 3, woodL); r(23, 10, 2, 18, woodD); sail(14, 11, 20, 12, cream); r(14, 16, 20, 2, polCol); r(30, 24, 6, 4, '#8a6238'); },
  dhow: (r, g, hull, sail, polCol, cream, wood, woodL, woodD) => { hull(9, 28, 30, 5, wood, woodL, woodD); r(35, 25, 4, 3, woodL); r(9, 26, 3, 2, woodL); r(22, 8, 2, 20, woodD); g.fillStyle = cream; g.beginPath(); g.moveTo(10, 10); g.lineTo(36, 4); g.lineTo(24, 26); g.closePath(); g.fill(); g.fillStyle = polCol; g.fillRect(22, 4, 4, 2); },
  grainship: (r, g, hull, sail, polCol, cream, wood, woodL, woodD) => { hull(5, 25, 38, 8, wood, woodL, woodD); r(5, 21, 6, 4, woodL); r(38, 22, 6, 3, woodL); r(41, 19, 4, 3, '#d8b24a'); for (let x = 13; x < 36; x += 4) r(x, 22, 3, 3, '#d8bf74'); r(23, 5, 2, 20, woodD); sail(13, 6, 22, 13, cream); r(13, 10, 22, 2, polCol); r(33, 12, 1, 9, woodD); sail(34, 13, 6, 5, cream); },
  junk: (r, g, hull, sail, polCol, cream, wood, woodL, woodD) => { hull(6, 26, 36, 7, '#7a4a2c', '#9a6238', '#4a2a14'); r(4, 21, 9, 5, '#9a6238'); r(37, 22, 6, 4, '#9a6238'); r(16, 6, 2, 20, woodD); r(29, 9, 2, 17, woodD); for (const [x, y, w, h] of [[10, 7, 13, 14], [24, 10, 11, 12]]) { r(x, y, w, h, '#c8805a'); for (let s = y + 2; s < y + h; s += 3) r(x, s, w, 1, '#7a4a30'); } r(16, 3, 4, 2, polCol); },
  fluyt: (r, g, hull, sail, polCol, cream, wood, woodL, woodD) => { hull(7, 26, 34, 7, wood, woodL, woodD); r(7, 20, 7, 6, woodL); r(8, 21, 5, 1, '#d6b86a'); for (const x of [17, 28, 37]) { r(x, 5, 1, 21, woodD); sail(x - 5, 6, 10, 7, cream); sail(x - 5, 14, 10, 7, cream); } r(17, 3, 4, 2, polCol); },
  paddlesteamer: (r, g, hull, sail, polCol) => { hull(4, 28, 40, 5, '#2d3036', '#4a4e55', '#1c1e22'); r(8, 21, 32, 7, '#efefef'); r(8, 21, 32, 1, '#fff'); for (let k = 10; k < 38; k += 3) r(k, 23, 2, 2, '#3f6a84'); r(18, 25, 10, 8, '#a5352f'); r(19, 26, 8, 6, '#c8452f'); for (let k = 0; k < 4; k++) r(19 + k * 2, 25 + (k % 2) * 7, 1, 1, '#2a2a2e'); r(30, 10, 3, 11, '#2d3036'); r(30, 12, 3, 2, polCol); r(14, 13, 1, 8, '#2d3036'); },
  reefer: (r, g, hull, sail, polCol) => { hull(2, 26, 44, 7, '#e8e4d8', '#fff', '#a9a598'); r(2, 30, 44, 3, '#c8452f'); for (let k = 6; k < 30; k += 6) { r(k, 22, 5, 4, '#efefef'); r(k + 2, 16, 1, 6, '#55595f'); } r(32, 14, 11, 12, '#efefef'); r(33, 17, 9, 1, '#3f6a84'); r(33, 20, 9, 1, '#3f6a84'); r(36, 8, 4, 6, polCol); r(36, 8, 4, 1, '#1c1e22'); },
  coaster: (r, g, hull, sail, polCol) => { hull(6, 27, 36, 6, '#2f5a3a', '#3f7a4a', '#1f3a26'); r(6, 30, 36, 3, '#7a3a2c'); r(10, 23, 20, 4, '#55595f'); r(10, 23, 20, 1, '#70757c'); r(32, 16, 8, 11, '#e8e4d8'); r(33, 19, 6, 1, '#3f6a84'); r(35, 12, 3, 4, polCol); r(14, 17, 1, 6, '#d8a53a'); r(12, 17, 6, 1, '#d8a53a'); },
  hovercraft: (r, g, hull, sail, polCol) => { r(4, 29, 40, 4, '#2d3036'); r(3, 30, 42, 2, '#1c1e22'); r(6, 21, 34, 8, '#efefef'); r(6, 21, 34, 1, '#fff'); for (let k = 8; k < 32; k += 3) r(k, 24, 2, 2, '#3f6a84'); r(32, 12, 4, 9, polCol); r(37, 12, 4, 9, polCol); r(31, 11, 11, 1, '#55595f'); r(0, 33, 48, 2, 'rgba(255,255,255,.35)'); },
  roroship: (r, g, hull, sail, polCol) => { hull(0, 26, 64, 7, '#2d4a6a', '#3f6488', '#1c3048'); r(0, 30, 64, 3, '#8a3a2c'); r(2, 8, 54, 18, '#e8ecef'); r(2, 8, 54, 1, '#fff'); r(2, 18, 54, 1, polCol); r(46, 4, 9, 4, '#e8ecef'); for (let x = 47; x < 55; x += 2) r(x, 5, 1, 2, '#3f6a84'); r(56, 12, 6, 14, '#c5ccd3'); r(0, 24, 4, 4, '#55595f'); },
  rotorship: (r, g, hull, sail, polCol) => { hull(0, 26, 48, 7, '#d8e0e6', '#fff', '#8c939a'); r(0, 30, 48, 3, '#2d4a6a'); { const cols = ['#3a7fb5', '#d8a53a', '#4fa35e', '#c8452f']; for (let k = 3; k < 38; k += 5) for (let q = 0; q < 2; q++) r(k, 22 - q * 4, 4, 3, cols[(k + q) % 4]); } for (const x of [9, 22, 33]) { r(x, 2, 4, 14, '#efefef'); r(x, 2, 4, 1, polCol); r(x, 8, 4, 1, polCol); r(x + 3, 2, 1, 14, '#c5ccd3'); } r(40, 14, 7, 12, '#e8e4d8'); r(41, 17, 5, 1, '#3f6a84'); },
  collier: (r, g, hull, sail, polCol) => { hull(1, 26, 58, 7, '#2d3036', '#4a4e55', '#1c1e22'); r(1, 30, 58, 3, '#7a3a2c'); for (let k = 6; k < 48; k += 8) { r(k, 22, 6, 4, '#3a3a3e'); r(k + 1, 21, 4, 1, '#1a1a1e'); } for (const x of [12, 34]) { r(x, 10, 1, 12, '#55524c'); r(x - 4, 10, 9, 1, '#55524c'); } r(48, 14, 9, 12, '#e8e4d8'); r(49, 17, 7, 1, '#3f6a84'); r(50, 5, 4, 9, '#2d3036'); r(50, 7, 4, 2, polCol); r(51, 2, 2, 3, 'rgba(120,120,120,.6)'); },
  gascarrier: (r, g, hull, sail, polCol) => { hull(1, 26, 82, 7, '#2d4a6a', '#3f6488', '#1c3048'); r(1, 30, 82, 3, '#8a3a2c'); for (let k = 0; k < 4; k++) { const x = 6 + k * 15; r(x + 2, 15, 9, 1, '#efefef'); r(x, 16, 13, 10, '#efefef'); r(x + 1, 16, 4, 6, '#fff'); r(x, 25, 13, 1, '#c5ccd3'); } r(70, 11, 11, 15, '#e8e4d8'); r(70, 11, 11, 2, polCol); r(71, 15, 9, 1, '#3f6a84'); r(71, 19, 9, 1, '#3f6a84'); r(74, 5, 4, 6, '#2d3036'); },
};
