'use strict';
// Snow is a real depth on every tile. It falls where it's cold and wet, packs down year on year into glaciers, melts into the rivers in spring,
// slides off steep slopes, buries roads and fields, freezes lakes and seas shut, and follows a climate that wanders over the centuries.

const SNOW_LINE = 0.36;
const seasonTemp = () => { const f = (W.tick % TPY) / TPY; return -Math.cos((f - 0.08) * 6.283) * 0.17; };  // coldest just after the new year
// The climate drifts: long cold spells and warm centuries on its own, and industry warms it for good.
function climateYear() {
  const C = W.clim, y = year();
  const natural = Math.sin(y / 170 + C.phase) * 0.035 + Math.sin(y / 53 + C.phase * 2) * 0.015;
  let burn = 0;
  for (const t of W.towns) burn += (t.count.factory || 0) + (t.count.steelworks || 0) * 3 + (t.count.powerplant || 0) * 3 + (t.count.refinery || 0) * 2 - (t.count.windfarm || 0) - (t.count.solarfarm || 0) - (t.count.carbonscrub || 0) * 8;
  C.co2 = Math.max(0, C.co2 + burn * 0.000012 - C.co2 * 0.004);
  const was = C.t;
  C.t = natural + Math.min(0.16, C.co2) - (C.ash > 0 ? 0.05 : 0) - climateMoods();  // El Nino, long droughts, a little ice age (food.js)
  if (C.t < -0.035 && was >= -0.035 && y - C.note > 120) { C.note = y; chron('misc', 'The winters are getting longer. Glaciers creep down the valleys, and old people say it was never like this.'); }
  if (C.t > 0.09 && was <= 0.09 && y - C.note > 120) { C.note = y; chron('misc', 'The snows retreat up the mountains. The world is warming, and the smoke of the cities is why.'); }
  natureYear();  // fish stocks, forests, salt, and every town's fields and herds (food.js)
}
// One slice of the map each tick, so every tile is looked at a few times a season.
function snowSweep() {
  const n = W.w * W.h, per = Math.ceil(n / 60), S0 = W.snowD, ice = W.ice, tmp = W.temp, wet = W.moist, water = W.water;
  const cl = W.climate, wx = W.wx;
  const w = W.w, h = W.h;
  let i = W.snowCur || 0;
  // winter in the north is summer in the south
  let row = -1, sea = 0, cRow = 0;
  const rain = wx && wx.rain, avg = wx && wx.avg, g6 = wx ? Math.max(wx.gAvg * 0.6, 1e-5) : 0, gw = wx ? wx.gw : 0;
  for (let k = 0; k < per; k++) {
    i++; if (i >= n) i = 0;
    const y = (i / w) | 0;
    if (y !== row) { row = y; sea = seasonAt(y) + W.clim.t; cRow = (y / WX_CELL | 0) * gw; }
    const T = tmp[i] + sea;
    if (water[i]) {
      if (water[i] === 3) continue;
      // still water freezes first; the open ocean only in the far cold
      const lim = water[i] === 2 ? 0.1 : W.biome[i] === B.LAKE ? 0.3 : 0.2;
      const v = ice[i];
      if (T < lim) { if (v < 200) { ice[i] = v + 10; if (v <= 80 && v + 10 > 80) dirty(i); } }
      else if (v > 0) { const nv = v > 20 ? v - 20 : 0; ice[i] = nv; if (v > 80 && nv <= 80) dirty(i); }
      continue;
    }
    const d = S0[i];
    if (T < SNOW_LINE) {
      // it snows when the weather brings it: heavy under a storm, hardly at all under clear cold skies
      const rainy = cl[((i / w / h * 10) | 0) * 10 + (((i % w) / w * 10) | 0)] || 1;
      let now = 1;
      if (wx) {  // wxFall(i), inlined
        const c = cRow + ((i - y * w) / WX_CELL | 0), a = avg[c], r = rain[c] / (a > g6 ? a : g6);
        now = 0.3 + (r > 3 ? 3 : r < 0 ? 0 : r) * 0.7;
      }
      const fall = (1.5 + wet[i] * 11) * rainy * now * Math.min(1, (SNOW_LINE - T) * 8 + 0.3);
      if (d < 250) S0[i] = Math.min(250, d + Math.ceil(fall));
    } else if (d > 0) {
      const old = d > 200 ? 0.25 : 1;  // glacier ice is slow to go
      const melt = Math.ceil((T - SNOW_LINE) * 100 * old) + 2;
      const left = Math.max(0, d - melt);
      S0[i] = left;
      if (W.river[i] || W.down[i] >= 0) W.melt = (W.melt || 0) + (d - left);
    }
    // deep old snow creeps downhill as a glacier, grinding everything in its way
    if (d > 235 && T < SNOW_LINE + 0.05) {
      const dn = W.down[i];
      if (dn >= 0 && !water[dn] && S0[dn] < 200 && W.occ[dn] === 0 && rnd() < 0.05) { S0[dn] = Math.min(250, S0[dn] + 30); W.tree[dn] = 0; W.plant[dn] = 0; }
    }
    // an overloaded steep slope lets go
    if (d > 150 && T > SNOW_LINE - 0.06 && W.elev[i] > 0.3) {
      const dn = W.down[i];
      if (dn >= 0 && W.elev[i] - W.elev[dn] > 0.03 && rnd() < 0.0012) avalanche(i);
    }
  }
  W.snowCur = i;
}
function avalanche(i) {
  const w = W.w;
  let c = i, run = 0, load = W.snowD[i];
  W.snowD[i] = 20;
  let hit = null, dead = 0;
  while (run < 16 && c >= 0 && !W.water[c]) {
    W.snowD[c] = Math.min(250, W.snowD[c] + 25);
    W.tree[c] = 0;
    const b = W.occ[c] === 1 ? W.bAt.get(c) : null;
    if (b && b.town && b.type !== 'hearth') { hit = b.town; if (FXH) FXH.rubble(c % w, (c / w) | 0, 3); removeBuilding(b); dead++; }
    if (FXH && run % 3 === 0) FXH.snowPuff(c % w, (c / w) | 0);
    dirty(c); updCost(c);
    c = W.down[c]; run++;
  }
  if (hit && hit.alive && !(hit.avT > W.tick - TPY * 12)) {
    hit.avT = W.tick;
    for (let k = 0; k < 2 + rint(4); k++) { const v = hit.members[rint(hit.members.length)]; if (v && !v.army) killPerson(v, 'buried by an avalanche'); }
    if (hit.alive && tn(hit) > 15 && !(hit.avNote > year() - 40)) { hit.avNote = year(); chronT('misc', `An avalanche comes down on ${hit.name}, burying ${dead === 1 ? 'a building' : dead + ' buildings'}.`, hit); }
  }
}
// Blizzards are weather you can watch: a white storm that crosses the map, burying what it passes and killing whoever's caught in it.
function stormsTick() {
  const St = W.storms;
  if (St.length < 4 && W.tick % 30 === 0 && rnd() < 0.12) {
    // blizzards start on cold wet ground in that hemisphere's winter, under a storm if there is one
    for (let q = 0; q < 8; q++) {
      const i = rint(W.w * W.h), sea = seasonAt((i / W.w) | 0) + W.clim.t;
      if (sea > -0.06 || W.water[i] || W.temp[i] + sea >= SNOW_LINE - 0.05 || W.moist[i] < 0.25) continue;
      if (W.wx && wxFall(i) < 1.2 && rnd() < 0.7) continue;
      St.push({ x: i % W.w, y: (i / W.w) | 0, vx: (rnd() - 0.5) * 0.3, vy: (rnd() - 0.5) * 0.3, r: 8 + rint(12), life: 60 + rint(100), named: false });
      break;
    }
  }
  for (let k = St.length - 1; k >= 0; k--) {
    const s = St[k];
    s.x += s.vx; s.y += s.vy; s.life--;
    if (s.life <= 0 || s.x < 2 || s.y < 2 || s.x > W.w - 3 || s.y > W.h - 3) { St.splice(k, 1); continue; }
    if (W.tick % 8 !== 0) continue;
    const r = s.r, w = W.w;
    for (let q = 0; q < r * 6; q++) {
      const a = rnd() * 6.283, d = Math.sqrt(rnd()) * r, j = ((s.y + Math.sin(a) * d) | 0) * w + ((s.x + Math.cos(a) * d) | 0);
      if (j > 0 && j < W.snowD.length && !W.water[j]) W.snowD[j] = Math.min(250, W.snowD[j] + 12);
    }
    for (const t of W.towns) {
      const dx = t.x - s.x, dy = t.y - s.y;
      if (dx * dx + dy * dy > r * r) continue;
      t.stock[R.WOOD] = Math.max(0, t.stock[R.WOOD] - tn(t) * 0.02);
      if (rnd() < 0.2 * t.mod.cold) { const v = t.members[rint(t.members.length)]; if (v && !v.hidden && !v.army) { const a0 = ageOf(v); if (a0 < 8 || a0 > 55 || rnd() < 0.25) { killPerson(v, 'died in a blizzard'); t.frozeY++; } } }
      if (!t.alive) continue;
      if (!s.named && tn(t) >= 40) { s.named = true; chronT('misc', `A great blizzard buries ${t.name}.`, t); }
    }
  }
}
// Melted snow goes somewhere: a heavy spring floods the valley towns, renews their soil, and sometimes drowns their fields.
function meltSeason() {
  const m = W.melt || 0;
  W.melt = 0;
  if (seasonOf() !== 0 && seasonOf() !== 1) return;
  const land = W.w * W.h * 0.4, heavy = m / land;
  if (heavy < 8) return;
  for (const t of W.towns) {
    if (!t.near.river || t.nomad || rnd() > clamp((heavy - 8) * 0.012, 0, 0.1)) continue;
    let wrecked = 0;
    for (const f of t.fields) { if (W.river[f.i] || riverNear(W, f.i % W.w, (f.i / W.w) | 0, 2)) { if (W.stage[f.i]) { W.stage[f.i] = 0; dirty(f.i); wrecked++; } W.fert[f.i] = Math.min(255, W.fert[f.i] + 10); } }
    if (wrecked >= 4 && tn(t) > 25) chronT('misc', `Snowmelt floods the river at ${t.name}, drowning ${wrecked} fields and leaving rich mud behind.`, t);
  }
}
// How much snow is lying around a town, for the panels and its farmers.
const snowAt = i => W.snowD[i];
