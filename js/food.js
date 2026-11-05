'use strict';
// Getting through a hungry season. When the stores run out a town doesn't just sit and starve: it kills part of the herd, goes back to
// the famine foods its grandparents knew, buys grain from whoever has some to spare, and in later ages the state steps in.
// Each step works better the more the town knows (see the food inventions in content.js), so the long line of farming and food
// inventions turns into fewer famines, not just bigger numbers.

// Returns how much food was found, in the same units as a season's eating (one adult, one season, one unit).
function emergencyFood(t, need, gap) {
  let got = 0;
  const st = t.stock, sc = t.scale;
  // the herd: kill the old and the barren first, and keep enough to breed back from
  const H = t.tameHerd;
  if (H && H.n > 6 && got < gap) {
    const per = 5 * t.mod.herd * (t.tech[TECH_IX.smoking] ? 1.25 : 1) * (t.tech[TECH_IX.saltworks] ? 1.15 : 1);
    const kill = Math.min(Math.floor(H.n * (t.mod.slaughter > 1 ? 0.45 : 0.3)), Math.ceil((gap - got) / per));
    if (kill > 0) { H.n -= kill; got += kill * per; t.slaughterY = (t.slaughterY || 0) + kill; }
  }
  // famine foods: roots, bark, acorns, shellfish, weeds nobody eats in a good year. Worth more to people who know where to look.
  if (got < gap) {
    const wild = (t.sForage.length * 0.4 + t.sFish.length * 0.5 + t.sTree.length * 0.05) * sc;
    const cap = need * clamp(0.3 * t.mod.famine * (knows(t, 'agriculture') ? 0.8 : 1.2), 0, 0.8);
    got += Math.min(gap - got, wild, cap);
  }
  // buying: from the nearest towns with grain to spare and no war with this one; by sea too, once both have harbours
  if (got < gap && !t.nomad) got += buyFood(t, gap - got);
  // relief: a state that runs soup kitchens or famine relief buys grain for the hungry with public money
  if (got < gap && t.mod.relief > 0 && t.polity.cur && t.polity.cur.kind >= 2) {
    const cur = t.polity.cur, want = Math.min(gap - got, need * 0.35 * t.mod.relief), price = want * (t.price ? t.price[R.FOOD] : 1);
    const pay = Math.min(price, Math.max(0, cur.treasury) * 0.2);
    if (pay > 0) { cur.treasury -= pay; cur.spentY += pay; got += want * pay / Math.max(price, 1e-6); t.reliefY = (t.reliefY || 0) + 1; }
  }
  // the last resort: the grain kept back to sow next year
  if (got < gap) got += eatSeed(t, gap - got, need);
  return got;
}
function buyFood(t, gap) {
  let got = 0;
  const reach = 30 * t.mod.cargo, seaReach = t.portLv ? 90 * t.mod.seaRange : 0;
  const cands = [];
  for (const o of W.towns) {
    if (o === t || !o.alive || o.nomad || o.attack || o.occupier) continue;
    const d = Math.abs(o.x - t.x) + Math.abs(o.y - t.y);
    const byLand = d < reach && W.landId[o.i] === W.landId[t.i], bySea = seaReach && o.portLv && d < seaReach;
    if (!byLand && !bySea) continue;
    if (o.polity !== t.polity && (atWar(o.polity, t.polity) || relOf(o.polity, t.polity) < -30)) continue;
    const spare = o.stock[R.FOOD] - tn(o) * 1.6;  // they keep a season and a half for themselves
    if (spare > 4) cands.push([d, o, spare]);
  }
  cands.sort((a, b) => a[0] - b[0]);
  for (const [, o, spare] of cands) {
    if (got >= gap) break;
    const amt = Math.min(gap - got, spare * 0.5);
    o.stock[R.FOOD] -= amt; got += amt;
    if (t.polity.cur && t.polity.cur.kind >= 2 && o.polity.cur && o.polity.cur.kind >= 2) payForGoods(t, o, R.FOOD, amt);
    else if (o.polity !== t.polity) adjustRel(o.polity, t.polity, 0.5);  // no money: a gift remembered
    t.boughtY = (t.boughtY || 0) + amt;
  }
  return got;
}

// A new village has nothing planted. Until the first fields are in, a few break ground and the rest live off the land.
function pioneering(t) {
  return knows(t, 'agriculture') && t.fields.length < Math.max(4, tn(t) * 0.12) && t.stock[R.FOOD] < tn(t) * 4;
}
// Settlers take a year's provisions with them when the town they leave can spare it.
function provision(from, to, people) {
  const want = people * 4 * (knows(from, 'granary') ? 1.3 : 1), have = to.stock[R.FOOD];
  if (have >= want) return;
  const give = Math.min(want - have, from.stock[R.FOOD] * 0.35);
  if (give > 0) { from.stock[R.FOOD] -= give; to.stock[R.FOOD] += give; }
}

// ======================================================================================================================
// The land itself: soils laid down by the rock beneath and the climate above, fields that wear out or are kept up by rotation
// and manure, irrigation that slowly salts the ground, herds bred up or grazed out, fishing banks that collapse, forests that
// go and (slowly) come back, and a climate with its own long moods: El Nino years, droughts that last a decade, a little ice age.
// Everything here is plain data on W (typed arrays and W.agri), so it saves with the world.

const ROCKS = ['', 'granite', 'limestone', 'basalt', 'sandstone', 'shale', 'river silt'];
// fm: fertility at the start; rg: how fast it recovers; hold: water it holds in a dry spell; drain: how well rain washes salt out; erode: how easily it blows or washes away
const SOILS = [null,
  { id: 'loam', name: 'Brown loam', fm: 1, rg: 1, hold: 1, drain: 1, erode: 1 },
  { id: 'alluvium', name: 'River alluvium', fm: 1.15, rg: 1.3, hold: 1.15, drain: 0.8, erode: 0.6 },
  { id: 'chernozem', name: 'Black earth', fm: 1.25, rg: 1.2, hold: 1.2, drain: 1, erode: 1.2 },
  { id: 'loess', name: 'Loess', fm: 1.12, rg: 1.05, hold: 1.05, drain: 1.1, erode: 1.8 },
  { id: 'clay', name: 'Heavy clay', fm: 1, rg: 0.9, hold: 1.25, drain: 0.5, erode: 0.7 },
  { id: 'sand', name: 'Sandy soil', fm: 0.78, rg: 0.7, hold: 0.6, drain: 1.6, erode: 1.4 },
  { id: 'laterite', name: 'Red laterite', fm: 0.92, rg: 0.6, hold: 0.8, drain: 1.2, erode: 1.3 },
  { id: 'podzol', name: 'Grey podzol', fm: 0.82, rg: 0.75, hold: 0.9, drain: 1.2, erode: 0.9 },
  { id: 'andosol', name: 'Volcanic ash soil', fm: 1.3, rg: 1.3, hold: 1.2, drain: 1.2, erode: 1.1 },
  { id: 'peat', name: 'Peat', fm: 0.75, rg: 0.8, hold: 1.4, drain: 0.4, erode: 0.5 },
  { id: 'rendzina', name: 'Thin chalky soil', fm: 0.95, rg: 1, hold: 0.7, drain: 1.5, erode: 1.3 },
  { id: 'stony', name: 'Thin stony soil', fm: 0.72, rg: 0.7, hold: 0.6, drain: 1.4, erode: 1.6 },
  { id: 'saline', name: 'Salt pan', fm: 0.5, rg: 0.5, hold: 0.5, drain: 0.3, erode: 1.2 },
];
const SOIL_IX = {}; SOILS.forEach((S, k) => { if (S) SOIL_IX[S.id] = k; });
const soilOf = i => SOILS[(W.soil && W.soil[i]) || 1] || SOILS[1];

// Called at the end of genWorld (wd is the new world), or late on an old save (late: keep its fertility as it is).
function genSoils(wd, late) {
  const { w, h, elev, temp, moist, biome, water, river } = wd, n = w * h;
  const soil = wd.soil = new Uint8Array(n), rock = wd.rock = new Uint8Array(n);
  wd.salt = new Uint8Array(n); wd.fish0 = wd.baseFish.slice(); wd.tree0 = wd.baseTree.slice();
  const nR = makeNoise((wd.seed | 0) + 7771), nV = makeNoise((wd.seed | 0) + 7772), S = SOIL_IX;
  for (let i = 0; i < n; i++) {
    if (water[i]) continue;
    const x = i % w, y = (i / w) | 0, e = elev[i], T = temp[i], M = moist[i], b = biome[i];
    const basin = fbm(nR, x / h * 4, y / h * 4, 3), volc = fbm(nV, x / h * 3, y / h * 3, 2);
    const nearR = river[i] || riverNear(wd, x, y, 1);
    const rk = nearR && e < 0.2 ? 6 : volc > 0.32 ? 3 : e > 0.4 ? 1 : basin < -0.12 ? 5 : basin < 0.12 ? 2 : 4;
    rock[i] = rk;
    let s;
    if (nearR && e < 0.3 && b !== B.ROCK && b !== B.SNOW) s = S.alluvium;
    else if (b === B.MARSH) s = T < 0.4 ? S.peat : S.clay;
    else if (b === B.BEACH) s = S.sand;
    else if (b === B.DESERT) s = M < 0.08 && e < 0.12 && basin < 0 ? S.saline : S.sand;
    else if (b === B.ROCK || b === B.SNOW || e > 0.5) s = S.stony;
    else if (b === B.TUNDRA) s = M > 0.5 ? S.peat : S.podzol;
    else if (b === B.TAIGA) s = S.podzol;
    else if (rk === 3) s = S.andosol;
    else if ((b === B.JUNGLE || b === B.SAVANNA) && T > 0.66) s = S.laterite;
    else if ((b === B.STEPPE || b === B.GRASS) && M > 0.16 && M < 0.5 && T > 0.28 && T < 0.66) s = M < 0.27 ? S.loess : rk === 4 ? S.loam : S.chernozem;
    else if (rk === 2 && e > 0.2) s = S.rendzina;
    else if (rk === 4) s = M < 0.4 ? S.sand : S.loam;
    else if (rk === 5) s = M > 0.5 ? S.clay : S.loam;
    else s = S.loam;
    soil[i] = s;
  }
  // deltas: where a long river meets the sea it spreads a fan of silt, the richest ground there is
  const rv = wd.rivers || [];
  for (let i = w; i < n - w; i++) {
    if (!river[i] || water[i]) continue;
    let sea = false;
    for (let k = 0; k < 4; k++) { const j = i + (k === 0 ? 1 : k === 1 ? -1 : k === 2 ? w : -w); if (water[j] && biome[j] !== B.LAKE) sea = true; }
    const R0 = rv[wd.riverId[i]];
    if (!sea || !R0 || R0.len < 18) continue;
    const r = Math.min(6, 2 + R0.len / 40), cx = i % w, cy = (i / w) | 0;
    for (let dy = -r | 0; dy <= r; dy++) for (let dx = -r | 0; dx <= r; dx++) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || dx * dx + dy * dy > r * r) continue;
      const j = ny * w + nx;
      if (water[j] || elev[j] > 0.16) continue;
      soil[j] = S.alluvium; rock[j] = 6;
      if (!late) wd.fert[j] = wd.baseFert[j] = Math.max(wd.baseFert[j], 120 + ((hash2(nx, ny, wd.seed | 0) * 40) | 0));
    }
  }
  if (!late) for (let i = 0; i < n; i++) if (soil[i] && wd.baseFert[i]) wd.fert[i] = wd.baseFert[i] = clamp(Math.round(wd.baseFert[i] * SOILS[soil[i]].fm), 0, 255);
}

// ---- the state kept between years ----
function agriWorld() {
  if (!W.soil) genSoils(W, true);
  let A = W.agri;
  if (!A) A = W.agri = { enso: 0, ensoPh: rnd() * 6.28, ensoP: 4.5, ensoAmp: 0.8, dr: [], lia: 0, liaDur: 0, liaAt: 0, liaY: 0, cover: [], defoNote: [], volc: 0, t: {} };
  if (!A.volc && W.volcanoes && W.volcanoes.length) {
    A.volc = 1;
    for (const v of W.volcanoes) {
      const cx = v % W.w, cy = (v / W.w) | 0;
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= W.w || y >= W.h || dx * dx + dy * dy > 25) continue;
        const j = y * W.w + x;
        if (W.water[j] || W.elev[j] > 0.62) continue;
        W.soil[j] = SOIL_IX.andosol; W.rock[j] = 3; W.baseFert[j] = Math.min(255, Math.max(W.baseFert[j], W.baseFert[j] * 1.15 + 20));
      }
    }
  }
  return A;
}
function agriOf(t) {
  const T = agriWorld().t;
  return T[t.id] || (T[t.id] = { sys: 0, breed: 0, salt: 0, saltNote: -99, graze: 0, milk: 0, seed: 0, seedNote: -99, blight: 0, blightY: -99, hail: 0, murrY: -99, pr: 0, prAvg: 0, fishR: 1, fishNote: -99, spoil: 0, dustY: -99, game: 0 });
}
const FARM_SYS = ['Gathering', 'Shifting fields and long fallow', 'Fallow and manure', 'Three-field rotation', 'Four-course rotation: clover and turnips', 'Chemical fertiliser'];
const SYS_REGEN = [0, 0, 3, 6, 10, 16], SYS_CAP = [1, 1, 1, 1.04, 1.1, 1.3];
function farmSystem(t) {
  if (knows(t, 'superphosphate') || knows(t, 'fertilizer')) return 5;
  if (knows(t, 'turnips')) return 4;
  if (knows(t, 'threefield')) return 3;
  if (knows(t, 'manure') || knows(t, 'legumes')) return 2;
  return knows(t, 'agriculture') ? 1 : 0;
}

// ---- the climate's moods, once a year; returns the extra cooling for climateYear ----
function climateMoods() {
  const A = agriWorld(), wx = W.wx, y = year() | 0;
  // El Nino and La Nina: a sloshing of the warm ocean every three to seven years
  A.ensoPh += 6.283 / A.ensoP;
  if (A.ensoPh > 6.283) { A.ensoPh -= 6.283; A.ensoP = 3 + rnd() * 4; A.ensoAmp = 0.4 + rnd() * 0.9; }
  A.enso = Math.sin(A.ensoPh) * A.ensoAmp;
  // droughts that last years, over a whole region
  for (let k = A.dr.length - 1; k >= 0; k--) {
    const d = A.dr[k];
    if (--d.left <= 0) {
      A.dr.splice(k, 1);
      const t = nearestTown(d.x * WX_CELL, d.y * WX_CELL, 40);
      if (t && y - d.y0 >= 4) chronT('famine', `After ${y - d.y0} dry years the rains come back to the country round ${t.name}.`, t);
    }
  }
  if (wx && A.dr.length < (W.w * W.h > 150000 ? 2 : 1) && rnd() < 0.022 && y > 20) {
    for (let q = 0; q < 30; q++) {
      const c = rint(wx.gw * wx.gh);
      if (wx.sea[c] > 0.5 || wx.base[c] < 0.35) continue;
      const d = { x: c % wx.gw, y: (c / wx.gw) | 0, r: 3 + rnd() * 4, left: 3 + rint(10), sev: 0.18 + rnd() * 0.25, y0: y };
      A.dr.push(d);
      const t = nearestTown(d.x * WX_CELL, d.y * WX_CELL, 40);
      if (t && tn(t) >= 40) chronT('famine', `A long drought settles over the lands around ${t.name}. Each spring the old say this year the rains will come.`, t);
      break;
    }
  }
  // a little ice age: a few weak suns and a run of eruptions, and the summers stay cold for generations
  if (A.liaDur) {
    if (y - A.liaAt >= A.liaDur) { A.liaDur = 0; A.liaY = y; }
  } else if (y > 80 && y - A.liaY > 260 && rnd() < 0.003) {
    A.liaAt = y; A.liaDur = 70 + rint(130); A.lia = 0.025 + rnd() * 0.03;
  }
  const cool = A.liaDur ? A.lia * Math.sin(Math.PI * clamp((y - A.liaAt) / A.liaDur, 0, 1)) : 0;
  if (A.liaDur && y - A.liaAt === 12) chron('misc', 'Cold wet summers, one after another: the harvests come in late and thin, the glaciers grow, and the rivers freeze hard enough for fairs on the ice.');
  if (wx) climateAnom(A, wx);
  return cool - A.enso * 0.006;
}
function nearestTown(x, y, r) {
  let best = null, bd = r * r;
  for (const t of W.towns) { if (!t.alive) continue; const d = (t.x - x) ** 2 + (t.y - y) ** 2; if (d < bd) { bd = d; best = t; } }
  return best;
}
// The year's rain multiplier for each weather cell, applied when the season's rain is judged (weather.js).
function climateAnom(A, wx) {
  const { gw, gh } = wx, n = gw * gh;
  if (!wx.anom || wx.anom.length !== n) wx.anom = new Float32Array(n);
  const earth = W.type === 'earth', e = A.enso;
  for (let cy = 0; cy < gh; cy++) {
    const row = Math.min(W.h - 1, cy * WX_CELL), lat = W.latRow[row], trop = clamp(1 - lat / 0.35, 0, 1);
    for (let cx = 0; cx < gw; cx++) {
      const c = cy * gw + cx;
      let dip;
      if (earth) {
        let lon = ((cx * WX_CELL + 3) / W.w) * 360 + EARTH_LON0; if (lon > 180) lon -= 360;
        dip = lon > 90 && lon < 160 ? -1 : lon > 65 && lon <= 90 ? -0.6 : lon > -95 && lon < -70 ? 1 : lon > 25 && lon < 45 && row / W.h > W.eq ? -0.5 : 0.15;
      } else dip = Math.cos(cx / gw * 6.283);
      let a = 1 + 0.2 * e * trop * dip + 0.04 * e * (1 - trop) * dip;
      for (const d of A.dr) { const dd = Math.hypot(cx - d.x, cy - d.y); if (dd < d.r) a *= 1 - d.sev * (1 - (dd / d.r) ** 2); }
      const cc = Math.min(9, (cx * WX_CELL / W.w * 10) | 0) + Math.min(9, (cy * WX_CELL / W.h * 10) | 0) * 10, cv = A.cover[cc];
      if (cv >= 0 && cv < 0.6) a *= 1 - 0.12 * clamp((0.6 - cv) / 0.45, 0, 1);  // bare hills hold no rain
      wx.anom[c] = clamp(a, 0.45, 1.5);
    }
  }
}

// ---- once a year: the whole map (fish, forests, salt), then every town's land ----
function natureYear() {
  const A = agriWorld(), n = W.w * W.h, w = W.w;
  const { water, fish, baseFish, fish0, tree, baseTree, tree0, occ, road, elev, fert, baseFert, salt, moist, soil } = W;
  const s0 = new Float32Array(100), s1 = new Float32Array(100), cnt = new Float32Array(100);
  const nino = A.enso > 0.7;
  // boats under sail and oar thin a bank out; steam trawlers and factory ships can wipe one out
  const keep = W.eraNow >= 6 ? 0 : W.eraNow >= 4 ? 0.4 : 0.7;
  for (let i = 0; i < n; i++) {
    if (water[i]) {
      const b = baseFish[i], f0 = fish0[i];
      if (!f0) continue;
      // a bank fished down to a remnant year after year stops coming back: the breeding stock is gone
      if (b && fish[i] * 10 <= b * 3) { if (b > f0 * keep && rnd() < 0.2) baseFish[i] = b - 1; }
      else if (fish[i] >= b && b < f0 && rnd() < 0.08) baseFish[i] = b + 1;  // left alone, it slowly recovers
      if (nino && fish[i] > 1 && W.temp[i] > 0.62 && rnd() < 0.5) fish[i]--;  // warm water: the shoals go elsewhere
      continue;
    }
    const cc = Math.min(9, ((i % w) / w * 10) | 0) + Math.min(9, (((i / w) | 0) / W.h * 10) | 0) * 10, t0 = tree0[i];
    s0[cc] += t0; s1[cc] += tree[i]; cnt[cc]++;
    if (salt[i] && occ[i] !== 2 && rnd() < 0.2 + moist[i]) salt[i]--;
    if (t0 < 2) continue;
    if (tree[i] === 0 && occ[i] !== 1 && elev[i] > 0.26) {
      // a cleared hillside washes away: the soil goes first, and then the forest can't come back as it was
      if (rnd() < 0.05 * SOILS[soil[i] || 1].erode) {
        const own = occ[i] === 2 ? W.townById[W.owner[i]] : null;
        if (!(own && knows(own, 'terracing'))) {
          baseFert[i] = Math.max(10, baseFert[i] - 2); if (fert[i] > baseFert[i]) fert[i] = baseFert[i];
          if (occ[i] === 0 && baseTree[i] > 1 && rnd() < 0.25) baseTree[i]--;
        }
      }
    } else if (occ[i] === 0 && road[i] < 2 && baseTree[i] < t0 && tree[i] >= baseTree[i] && rnd() < 0.03) baseTree[i]++;  // scrub, then young wood, then forest again
  }
  for (let c = 0; c < 100; c++) {
    const was = A.cover[c];
    A.cover[c] = s0[c] > cnt[c] * 1.2 ? s1[c] / s0[c] : -1;
    if (was === undefined && A.cover[c] < 0.35) A.defoNote[c] = 1;  // already bare when we first looked
    if (A.cover[c] >= 0 && A.cover[c] < 0.35 && !(was >= 0 && was < 0.35) && !A.defoNote[c]) {
      const t = nearestTown(((c % 10) + 0.5) * W.w / 10, (((c / 10) | 0) + 0.5) * W.h / 10, Math.max(W.w, W.h) / 10);
      if (t && tn(t) >= 100) { A.defoNote[c] = 1; chronT('misc', `The forests round ${t.name} are nearly gone. Timber comes from far away now, the hills wash into the rivers, and the springs run dry.`, t); }
    }
  }
  const T = A.t;
  for (const id in T) { const t = W.townById[id]; if (!t || !t.alive) delete T[id]; }
  for (const t of W.towns) if (t.alive && (t.fields.length || t.tameHerd || t.sBoat.length)) landTownYear(t);
}
function landTownYear(t) {
  const a = agriOf(t), F = t.fields, y = year() | 0, fert = W.fert, base = W.baseFert, salt = W.salt, SI = SOIL_IX;
  a.sys = farmSystem(t);
  // ---- the fields: rotation and manure put back what the harvest took out; irrigation leaves salt behind ----
  if (F.length) {
    const H = t.tameHerd, manure = H && (a.sys >= 2 || knows(t, 'manure')) ? Math.min(6, H.n * 0.4 * (1 + a.breed) / F.length) : 0;
    const marl = knows(t, 'marling'), drains = knows(t, 'drainage'), drip = knows(t, 'dripirrigation'), regen = SYS_REGEN[a.sys], top0 = SYS_CAP[a.sys];
    let sSum = 0;
    for (const f of F) {
      const i = f.i, sk = W.soil[i] || 1, S = SOILS[sk];
      let g = (regen + manure) * S.rg + (f.rest > 0 ? 4 : 0);
      if (marl && (sk === SI.clay || sk === SI.podzol || sk === SI.peat)) g += 3;
      const top = Math.min(255, base[i] * top0);
      if (g > 0 && fert[i] < top) fert[i] = Math.min(top, fert[i] + g);
      // tropical red earth bakes hard once the forest is off it
      if (sk === SI.laterite && base[i] > 40 && rnd() < 0.3) base[i]--;
      // salt: canal water evaporates and leaves its salt behind; rain and floods wash it out again
      const M = W.moist[i], arid = clamp((0.55 - M) * 2, 0, 1) * clamp((W.temp[i] - 0.4) * 3, 0, 1);
      let ds = -(M * 3 * S.drain) - (W.river[i] ? 4 : 0) - (f.rest > 0 ? 2 : 0);
      if (!W.river[i] && wetField(i)) ds += (0.6 + 2.6 * arid) / S.drain * (drains ? 0.35 : 1) * (drip ? 0.3 : 1) + 0.9 * arid;
      const d = Math.floor(ds) + (rnd() < ds - Math.floor(ds) ? 1 : 0);
      if (d) salt[i] = clamp(salt[i] + d, 0, 255);
      sSum += salt[i];
    }
    a.salt = sSum / F.length;
    if (a.salt > 90 && y - a.saltNote > 60 && tn(t) >= 60) { a.saltNote = y; chronT('famine', `A white crust of salt spreads over the watered fields of ${t.name}. Wheat gives way to barley, and barley to bare ground.`, t); }
    // chemical fertiliser runs off into the sea, and the water off the shore goes dead in summer
    if (a.sys === 5 && t.sBoat.length && rnd() < 0.3) for (let k = 0; k < 6; k++) { const j = pick(t.sBoat); if (W.baseFish[j] > 1) W.baseFish[j]--; }
    // in a long drought the ploughed-up steppe blows away
    const c = W.wx && W.wx.anom ? W.wx.anom[wxCellOf(t.i)] : 1, s0 = W.soil[t.i];
    if (c < 0.8 && W.moist[t.i] < 0.5 && F.length > 10 && (s0 === SI.chernozem || s0 === SI.loess || s0 === SI.sand) && !knows(t, 'soilsurvey')) {
      for (const f of F) { fert[f.i] = Math.max(8, fert[f.i] - 10); if (rnd() < 0.15) base[f.i] = Math.max(10, base[f.i] - 2); }
      if (y - a.dustY > 50 && tn(t) >= 60) chronT('famine', `Black blizzards: the ploughed earth round ${t.name} lifts in the dry wind and buries the fences.`, t);
      a.dustY = y;
    }
    // blight comes to a staple grown everywhere and nothing else
    const risk = 0.0025 * (t.crop === 5 && W.moist[t.i] > 0.45 ? 3 : 1) * (F.length > 80 ? 1.6 : 1) * (knows(t, 'pesticides') || knows(t, 'cropdusting') ? 0.3 : 1);
    if (F.length >= 15 && t.crop && rnd() < risk) {
      a.blight = 1;
      for (const o of W.towns) if (o !== t && o.alive && o.crop === t.crop && o.fields.length >= 10 && Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 40 && rnd() < 0.25) agriOf(o).blight = 1;
    }
    if (W.temp[t.i] > 0.35 && W.temp[t.i] < 0.7 && t.near && !t.near.water && rnd() < 0.012) a.hail = 1;
  }
  // ---- the herd: bred up over the generations, but only as many as the pasture can carry ----
  const H = t.tameHerd;
  if (H && H.n > 0) {
    let know = 0;
    for (const id of ['cattle', 'sheep', 'dairy', 'horsebreeding', 'transhumance', 'studbooks', 'merino', 'heredity', 'artificialinsem']) if (knows(t, id)) know++;
    a.breed = clamp(a.breed + (Math.min(1, know * 0.12) - a.breed) * 0.03, 0, 1);
    const pasture = Math.max(8, (t.sArable.length - F.length) * 0.35 + t.sForage.length * 0.12) * (knows(t, 'fodder') ? 1.3 : 1) * (knows(t, 'watermeadow') ? 1.2 : 1) * (knows(t, 'feedlots') ? 2 : 1) * (t.nomad || knows(t, 'transhumance') ? 1.5 : 1);
    a.graze = H.n / pasture;
    if (a.graze > 1.25) {
      H.n = Math.max(4, Math.floor(H.n * 0.95));
      // too many mouths on dry grass: it doesn't grow back
      const hx = H.x | 0, hy = H.y | 0;
      for (let k = 0; k < 6; k++) {
        const j = clamp(hy + rint(5) - 2, 1, W.h - 2) * W.w + clamp(hx + rint(5) - 2, 1, W.w - 2);
        if (!W.water[j] && W.moist[j] < 0.4) { W.forage[j] = 0; if (W.baseForage[j] && rnd() < 0.3) W.baseForage[j]--; if (rnd() < 0.3) base[j] = Math.max(10, base[j] - 1); }
      }
    } else if (a.breed > 0.1 && a.graze < 0.9) H.n += Math.floor(H.n * 0.04 * a.breed + rnd());
    // murrain: the cattle plague runs from herd to herd
    if (H.n > 15 && y - a.murrY > 20 && rnd() < 0.004 * (knows(t, 'veterinary') ? 0.35 : 1)) murrain(t, a, 0.35 + rnd() * 0.35, true);
  }
  // ---- the fishing grounds: what's left of what there was ----
  const sea = t.sBoat;
  if (sea.length) { let b = 0, b0 = 0; for (let k = 0; k < 24; k++) { const j = sea[(k * 7919) % sea.length]; b += W.baseFish[j]; b0 += W.fish0[j]; } a.fishR = b0 ? b / b0 : 1; }
  if (a.fishR < 0.5 && y - a.fishNote > 80 && tn(t) >= 80) { a.fishNote = y; chronT('misc', `The fishing banks off ${t.name} are fished out. The boats go further every year and come back lighter.`, t); }
  // ---- what food costs, against what it usually costs ----
  if (t.price) { const p = t.price[R.FOOD]; a.pr = p; a.prAvg = a.prAvg ? a.prAvg * 0.92 + p * 0.08 : p; }
  // ---- the game in the country round about ----
  let g = 0;
  for (const hd of W.herds) if (!hd.owner && !HERD_TYPES[hd.type].pred && Math.abs(hd.x - t.x) + Math.abs(hd.y - t.y) < 30) g += hd.n;
  a.game = g;
}
function murrain(t, a, kill, first) {
  const H = t.tameHerd, lost = Math.floor(H.n * kill);
  H.n -= lost; a.murrY = year() | 0;
  if (!first) return;
  if (lost >= 12 && tn(t) >= 30) chronT('famine', `Murrain: the cattle plague sweeps through the herds of ${t.name}, and ${lost} beasts die in the fields.`, t);
  for (const o of W.towns) if (o !== t && o.alive && o.tameHerd && o.tameHerd.n > 6 && Math.abs(o.x - t.x) + Math.abs(o.y - t.y) < 35 && rnd() < 0.4 * (knows(o, 'veterinary') ? 0.4 : 1)) murrain(o, agriOf(o), kill * 0.6, false);
}

// ---- every season: food keeps or rots by the climate and the store, the dairy gives, and blight or hail can strike ----
function agriSeason() {
  const A = W.agri;
  if (!A) return;
  const s = seasonOf(), y = year() | 0;  // the season just beginning
  for (const t of W.towns) {
    const a = A.t[t.id];
    if (!a || !t.alive) continue;
    const st = t.stock, T = W.temp[t.i], M = W.moist[t.i];
    // heat and damp rot food; a cold dry winter keeps it
    const heat = (T - 0.45) * 1.6 + (M - 0.45) * 0.8 + (s === 2 ? 0.25 : s === 0 ? -0.2 : 0);
    const prot = t.count.icehouse || knows(t, 'refrigeration') ? 0.3 : t.count.cannery ? 0.5 : t.count.granary || t.count.elevator ? 0.7 : knows(t, 'saltworks') || knows(t, 'smoking') ? 0.85 : 1;
    const extra = clamp(0.022 * heat, -0.01, 0.03) * prot;
    if (st[R.FOOD] > 0) st[R.FOOD] *= 1 - extra;
    a.spoil = a.spoil * 0.75 + ((t.count.granary ? 0.08 : 0.2) * t.mod.spoil + extra * 4) * 0.25;
    // milk, cheese and butter from the herd
    const H = t.tameHerd;
    if (H && H.n > 3 && (knows(t, 'dairy') || knows(t, 'cheese') || knows(t, 'butter'))) {
      const v = Math.min(H.n * 0.1 * (1 + a.breed) * (knows(t, 'creamsep') ? 1.3 : 1) * (s === 3 ? 0.5 : 1), tn(t) * 0.2);
      st[R.FOOD] += v; t.foodProd += v; a.milk = v;
    } else a.milk = 0;
    if ((a.blight || a.hail) && (s === 2 || s === 3) && t.fields.length) {
      const share = a.blight ? 0.5 + rnd() * 0.3 : 0.12 + rnd() * 0.25;
      let lost = 0;
      for (const f of t.fields) if (W.stage[f.i] > 0 && rnd() < share) { W.stage[f.i] = 0; dirty(f.i); lost++; }
      if (a.blight && lost >= 10 && tn(t) >= 40 && y - a.blightY > 30) chronT('famine', `Blight in the ${CROPS[t.crop].name} at ${t.name}: the plants blacken and rot within a week, ${lost} fields of them.`, t);
      else if (a.hail && !a.blight && lost >= 15 && tn(t) >= 80 && !(W.agri.hailY > y - 8)) { W.agri.hailY = y; chronT('misc', `A hailstorm flattens ${lost} fields of ${CROPS[t.crop].name} round ${t.name} a few weeks before the harvest.`, t); }
      if (a.blight) a.blightY = y;
      a.blight = 0; a.hail = 0;
    }
  }
}

// Eating the seed corn: food now, and half-sown fields next spring.
function eatSeed(t, gap, need) {
  if (t.nomad || t.fields.length < 8 || gap < need * 0.4) return 0;
  const a = agriOf(t);
  let k = Math.floor(t.fields.length * Math.min(0.35, gap / need * 0.5)), got = 0, n = 0;
  for (const f of t.fields) { if (k <= 0 || got >= gap) break; if (f.rest > 0) continue; f.rest = 2; k--; n++; got += 1.5; }
  a.seed = n;
  const y = year() | 0;
  if (n >= 10 && tn(t) >= 40 && y - a.seedNote > 40 && !(W.agri.seedY > y - 12)) { a.seedNote = W.agri.seedY = y; chronT('famine', `They are eating the seed corn at ${t.name}. Next spring many of the fields will lie unsown.`, t); }
  return Math.min(got, gap);
}

// ---- the town panel and the tile panel ----
function landTownHTML(t) {
  const A = W.agri, a = A && A.t[t.id];
  if (!a) return '';
  const out = [], row = (k, v) => out.push(`<span>${k}</span><b>${esc(v)}</b>`), pct = v => Math.round(v * 100) + '%';
  if (t.fields.length) {
    let nut = 0; for (const f of t.fields) nut += W.fert[f.i] / Math.max(40, W.baseFert[f.i]);
    row('Soil', `${soilOf(t.i).name} over ${ROCKS[W.rock[t.i]] || 'rock'} · fields at ${pct(Math.min(1.3, nut / t.fields.length))} of their strength${a.salt > 30 ? ` · ${a.salt > 120 ? 'badly' : 'a little'} salted` : ''}`);
    row('Farming', FARM_SYS[a.sys] + (a.seed && t.fields.some(f => f.rest > 0) ? ` · ${a.seed} fields unsown for want of seed` : ''));
  }
  if (t.tameHerd) row('Pasture', `${a.graze > 1.25 ? 'Overgrazed' : a.graze > 0.9 ? 'Fully stocked' : 'Grass to spare'} · ${a.breed > 0.6 ? 'improved breeds' : a.breed > 0.25 ? 'bred up a little' : 'landrace stock'}${a.milk > 0.5 ? ` · milk for ${a.milk.toFixed(0)} a season` : ''}`);
  if (!t.nomad) row('Stores', `about ${pct(clamp(a.spoil, 0, 0.6))} spoils in a year`);
  if (t.sBoat.length) row('Fishing banks', a.fishR > 0.9 ? 'Full of fish' : `${pct(a.fishR)} of what they were`);
  if (a.game) row('Game nearby', `${a.game} head`);
  if (a.prAvg > 0 && t.polity.cur && t.polity.cur.kind >= 2) row('Bread price', `${(a.pr / a.prAvg).toFixed(2)}× the usual`);
  const moods = [], wx = W.wx;
  if (A.enso > 0.7) moods.push('an El Niño year'); else if (A.enso < -0.7) moods.push('a La Niña year');
  if (wx) { const c = wxCellOf(t.i), cx = c % wx.gw, cy = (c / wx.gw) | 0; for (const d of A.dr) if (Math.hypot(cx - d.x, cy - d.y) < d.r) moods.push(`year ${(year() | 0) - d.y0 + 1} of a long drought`); }
  if (A.liaDur) moods.push('a little ice age');
  if (moods.length) row('Climate', cap(moods.join(', ')));
  return out.join('');
}
function landTileRows(i, rows) {
  if (!W.soil) return;
  if (!W.water[i]) {
    rows.push(['Ground', `${soilOf(i).name} over ${ROCKS[W.rock[i]] || 'rock'}`]);
    if (W.salt[i] > 30) rows.push(['Salt', W.salt[i] > 120 ? 'A white crust: little will grow' : 'Salty']);
    if (W.tree0[i] >= 3 && W.baseTree[i] < W.tree0[i] - 1) rows.push(['Forest', 'Cut down and washed bare']);
  } else if (W.fish0[i] > 1 && W.baseFish[i] < W.fish0[i] * 0.6) rows.push(['Fish stocks', W.baseFish[i] ? 'Overfished' : 'Collapsed']);
}
