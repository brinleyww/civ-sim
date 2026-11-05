'use strict';
// How a town's streets look, read from the sim: what its builders can get (the land round about decides timber, stone, brick or
// adobe, and what goes on the roof), how well the houses are kept (wages against the world's, hunger, crowding, unrest,
// occupation), soot from the works, and scars from fighting. The house sprites are drawn from this; the town panel says it.
// Kept off W (it is all derived), refreshed every half year per town, with a little hysteresis so the look does not flicker.

const LOOK_MAT = ['timber', 'stone', 'brick', 'adobe'];
const LOOK_ROOF = ['thatch', 'tile', 'slate', 'flat'];
const LOOK_COND = ['squalid', 'worn', 'kept', 'fine'];
const _looks = new Map();
let _lookAvgWage = 1, _lookAvgT = -1e9;

function lookAvgWage() {
  if (W.tick - _lookAvgT < TPY && _lookAvgT <= W.tick) return _lookAvgWage;
  let s = 0, n = 0;
  for (const t of W.towns) if (t.alive && t.realWage > 0) { const k = Math.sqrt(tn(t)); s += t.realWage * k; n += k; }
  _lookAvgWage = n ? s / n : 1; _lookAvgT = W.tick;
  return _lookAvgWage;
}
// What the country round the town gives a builder: forest, quarried hills, river clay or dry plain.
function lookMaterial(t, era) {
  const w = W.w, h = W.h, bio = W.biome;
  let tim = (t.sTree ? t.sTree.length : 0) * 0.4, sto = (t.sStone ? t.sStone.length : 0) * 1.2, cla = (t.sClay ? t.sClay.length : 0) * 1.4, dry = 0, cold = 0, wet = 0;
  for (let dy = -8; dy <= 8; dy += 2) for (let dx = -8; dx <= 8; dx += 2) {
    const x = t.x + dx, y = t.y + dy;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const b = bio[y * w + x];
    if (b === B.FOREST || b === B.TAIGA) { tim += 1; if (b === B.TAIGA) cold++; }
    else if (b === B.JUNGLE) { tim += 0.8; wet++; }
    else if (b === B.ROCK || b === B.SNOW) { sto += 1.5; cold += 0.5; }
    else if (b === B.TUNDRA) { sto += 0.4; cold++; }
    else if (b === B.DESERT) dry += 1.3;
    else if (b === B.SAVANNA || b === B.STEPPE) dry += 0.55;
    else if (b === B.MARSH || b === B.LAKE) { cla += 0.6; wet++; }
    else if (b === B.GRASS) cla += 0.25;
  }
  const sc = [tim, sto, cla * (era >= 2 ? 1 : 0.3), dry];
  if (era >= 6 && tn(t) > 150) sc[2] += 6 + sc[0] * 0.6;   // the works fire bricks by the million; towns burnt once stop building in wood
  return { sc, cold, wet, dry };
}
function townLook(t) {
  let L = _looks.get(t.id);
  if (L && W.tick - L.t < TPY / 2 && L.t <= W.tick) return L;
  const era = t.polity ? t.polity.era || 0 : 0;
  const M = lookMaterial(t, era);
  let mat = 0;
  for (let k = 1; k < 4; k++) if (M.sc[k] > M.sc[mat]) mat = k;
  if (L && L.mat !== mat && M.sc[mat] < M.sc[L.mat] * 1.3) mat = L.mat;   // builders keep to what they know
  // the roof: thatch until tiles can be fired, slate where it is cold and stony, flat roofs where it hardly rains
  let roof = mat === 3 && M.wet < 3 ? 3 : era <= 2 ? 0 : (M.cold > 6 || (mat === 1 && M.cold > 2)) ? 2 : era <= 3 && mat === 0 ? 0 : 1;
  if (era >= 6 && roof === 0) roof = 1;
  // upkeep: what people earn against the world, then what has gone wrong lately
  const rel = Math.max(0.05, (t.realWage || 1) / Math.max(0.05, lookAvgWage()));
  let s = 1.6 + Math.log2(rel) * 0.9;
  if (t.famine > 0) s -= 0.8;
  if ((t.unrest || 0) > 50) s -= 0.6;
  if (t.crowd > 1.1) s -= 0.6;
  if (t.occupier) s -= 0.9;
  if (t.gini > 0.5) s -= 0.3;
  if (t.monuments > 0) s += 0.2;
  s = clamp(s, 0, 3);
  let cond = L ? L.cond : Math.round(s);
  if (Math.abs(s - cond) > 0.65) cond = Math.round(s);
  const now = year();
  const soot = era >= 6 && (t.smog || 0) > 0.3 ? 1 : 0;
  const scar = t.attack || (t.warYear > -999 && now - t.warYear < 3 && t.fortHP < t.fortMax * 0.8) || (t.occupier && now - (t.occSince || 0) < 5) ? 1 : 0;
  const eb = era <= 3 ? 0 : era <= 5 ? 1 : 2;
  const key = mat * 32 + roof * 8 + cond * 2 + soot + (scar ? 128 : 0) + eb * 256;
  L = { t: W.tick, mat, roof, cond, soot, scar, eb, key, sc: M.sc, rel };
  _looks.set(t.id, L);
  if (_looks.size > 4000) _looks.clear();
  return L;
}
// One or two lines for the town panel (called from townHTML in ui.js).
function townLookHTML(t) {
  if (!t || !t.alive) return '';
  const L = townLook(t), era = t.polity ? t.polity.era || 0 : 0;
  const walls = L.mat === 0 ? (era <= 3 ? 'log and wattle' : 'timber-framed') : L.mat === 1 ? 'stone' : L.mat === 2 ? 'brick' : 'sun-dried adobe';
  const roofs = ['thatched roofs', 'tiled roofs', 'slate roofs', 'flat roofs'][L.roof];
  const why = L.mat === 0 ? 'woods close by' : L.mat === 1 ? 'stone in the hills' : L.mat === 2 ? (era >= 6 && tn(t) > 150 ? 'brickworks' : 'clay in the river banks') : 'dry plains with little wood';
  const cond = ['squalid and patched', 'worn', 'well kept', 'fine, with painted shutters'][L.cond];
  const col = ['#e0705a', '#e6c170', '#8cc66a', '#7fd0c8'][L.cond];
  const extra = [L.soot ? 'black with soot' : '', L.scar ? 'scarred by fighting' : ''].filter(Boolean).join(', ');
  return `<span>Streets</span><b>${walls[0].toUpperCase() + walls.slice(1)} houses, ${roofs} (from ${why})</b><span>Upkeep</span><b style="color:${col}">${cond[0].toUpperCase() + cond.slice(1)}${extra ? ' · ' + extra : ''} · wages ${Math.round(L.rel * 100)}% of the world's</b>`;
}
