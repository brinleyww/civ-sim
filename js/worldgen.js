'use strict';
// Random worlds: tectonic-ish elevation, wind-driven rainfall, rivers that really drain, biomes, deposits, wild crops and herds.

const B = { DEEP: 0, SHALLOW: 1, LAKE: 2, BEACH: 3, GRASS: 4, SAVANNA: 5, DESERT: 6, FOREST: 7, JUNGLE: 8, TAIGA: 9, TUNDRA: 10, MARSH: 11, STEPPE: 12, ROCK: 13, SNOW: 14 };
const BIOME_NAME = ['Deep ocean', 'Shallow sea', 'Lake', 'Beach', 'Grassland', 'Savanna', 'Desert', 'Forest', 'Jungle', 'Taiga', 'Tundra', 'Marsh', 'Steppe', 'Mountain', 'Snowy peak'];
const ORE = { NONE: 0, STONE: 1, CLAY: 2, COPPER: 3, TIN: 4, IRON: 5, COAL: 6, GOLD: 7, OIL: 8, SALT: 9, SULFUR: 10, URANIUM: 11, GEMS: 12 };
const ORE_NAME = ['', 'Stone', 'Clay', 'Copper', 'Tin', 'Iron', 'Coal', 'Gold', 'Oil', 'Salt', 'Sulphur', 'Uranium', 'Gems & silver'];
const CROPS = [null,
  { name: 'wheat', yield: 1.0, tMin: 0.34, tMax: 0.72, mMin: 0.2 },
  { name: 'rice', yield: 1.15, tMin: 0.55, tMax: 1.0, mMin: 0.55 },
  { name: 'maize', yield: 0.9, tMin: 0.45, tMax: 0.9, mMin: 0.3 },
  { name: 'millet', yield: 0.8, tMin: 0.5, tMax: 1.0, mMin: 0.12 },
  { name: 'potatoes', yield: 0.95, tMin: 0.22, tMax: 0.6, mMin: 0.3 },
];
const HERD_TYPES = [
  { name: 'deer', meat: 5, dom: false, color: '#9a6b3f', cap: 16, biomes: [B.FOREST, B.TAIGA, B.GRASS] },
  { name: 'bison', meat: 9, dom: false, color: '#4c3524', cap: 30, biomes: [B.GRASS, B.STEPPE] },
  { name: 'mammoth', meat: 30, dom: false, color: '#6d4a33', cap: 8, biomes: [B.TUNDRA, B.STEPPE, B.TAIGA] },
  { name: 'antelope', meat: 4, dom: false, color: '#c49a5c', cap: 24, biomes: [B.SAVANNA, B.GRASS] },
  { name: 'wild goats', meat: 3, dom: true, color: '#cfc7b4', cap: 16, biomes: [B.ROCK, B.STEPPE, B.GRASS] },
  { name: 'aurochs', meat: 10, dom: true, color: '#3b2b22', cap: 14, biomes: [B.FOREST, B.GRASS] },
  { name: 'wild horses', meat: 6, dom: true, horse: true, color: '#7d5532', cap: 16, biomes: [B.STEPPE, B.GRASS] },
  { name: 'boar', meat: 5, dom: true, color: '#5a4636', cap: 14, hp: 2, bite: 0.04, biomes: [B.FOREST, B.JUNGLE] },
  // Some animals hunt back: they take stragglers and livestock until somebody goes out and kills them.
  { name: 'wolves', meat: 1, dom: false, pred: true, color: '#6f7275', cap: 9, hp: 2, bite: 0.12, biomes: [B.TAIGA, B.FOREST, B.TUNDRA, B.STEPPE] },
  { name: 'bears', meat: 8, dom: false, pred: true, color: '#4a3324', cap: 4, hp: 4, bite: 0.3, biomes: [B.TAIGA, B.FOREST] },
  { name: 'lions', meat: 3, dom: false, pred: true, color: '#c29a52', cap: 6, hp: 3, bite: 0.2, biomes: [B.SAVANNA, B.STEPPE] },
];
HERD_TYPES[1].hp = 2; HERD_TYPES[1].bite = 0.03;   // bison
HERD_TYPES[2].hp = 6; HERD_TYPES[2].bite = 0.1;    // mammoth
HERD_TYPES[5].hp = 3; HERD_TYPES[5].bite = 0.05;   // aurochs
// What people can plant by hand. Each is learned from doing the work, and needs its own soil and climate.
// job: who tends it. r: what it gives. grow: seasons until the first crop. every: seasons between crops.
const PLANTS = [null,
  { id: 'berries', name: 'Berry bushes', tech: 'berrypatch', r: 'FOOD', yield: 7, grow: 2, every: 4, tMin: 0.2, tMax: 0.95, mMin: 0.2, col: [62, 112, 58], dot: [170, 40, 70] },
  { id: 'sapling', name: 'Planted trees', tech: 'replanting', r: 'WOOD', yield: 0, grow: 10, every: 0, tMin: 0.15, tMax: 1, mMin: 0.15, col: [78, 130, 66], dot: [52, 96, 48] },
  { id: 'fruit', name: 'Fruit trees', tech: 'orchards', r: 'FOOD', yield: 16, grow: 10, every: 4, tMin: 0.32, tMax: 0.95, mMin: 0.25, col: [70, 128, 62], dot: [226, 120, 60] },
  { id: 'veg', name: 'Vegetable plot', tech: 'kitchengarden', r: 'FOOD', yield: 11, grow: 1, every: 2, tMin: 0.25, tMax: 0.95, mMin: 0.25, col: [96, 80, 52], dot: [120, 180, 70] },
  { id: 'herbs', name: 'Herb garden', tech: 'herbgarden', r: 'GOODS', yield: 1.2, grow: 2, every: 4, tMin: 0.25, tMax: 1, mMin: 0.2, col: [90, 110, 66], dot: [190, 150, 220] },
  { id: 'flax', name: 'Flax and cotton', tech: 'flaxfields', r: 'CLOTH', yield: 3, grow: 2, every: 4, tMin: 0.32, tMax: 1, mMin: 0.25, col: [112, 130, 80], dot: [150, 170, 235] },
  { id: 'vines', name: 'Vineyard', tech: 'vineyards', r: 'GOODS', yield: 4, grow: 6, every: 4, tMin: 0.45, tMax: 0.92, mMin: 0.15, col: [104, 112, 58], dot: [110, 50, 130] },
];

function genWorld(opt) {
  const { w, h, seed, type } = opt;
  RS = seed | 0;
  const n = w * h;
  const elev = new Float32Array(n), temp = new Float32Array(n), moist = new Float32Array(n);
  const biome = new Uint8Array(n), river = new Uint8Array(n), water = new Uint8Array(n);
  const down = new Int32Array(n).fill(-1);
  const nA = makeNoise(rint(1e9)), nB = makeNoise(rint(1e9)), nC = makeNoise(rint(1e9)), nD = makeNoise(rint(1e9)), nE = makeNoise(rint(1e9));
  const aspect = w / h;

  // ---- elevation ----
  const latRow = new Float32Array(h);
  let eq;
  if (type === 'earth') eq = earthElevation(elev, w, h, nA, nB, nC, latRow);
  else {
    const freq = type === 'archipelago' ? 4.2 : type === 'pangea' ? 1.7 : 2.3;
    const landFrac = type === 'archipelago' ? 0.26 : type === 'pangea' ? 0.5 : type === 'inland' ? 0.55 : 0.4;
    const raw = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = x / h, ny = y / h;
      const wx = fbm(nC, nx * 2.1, ny * 2.1, 3) * 0.32, wy = fbm(nC, nx * 2.1 + 31, ny * 2.1 + 17, 3) * 0.32;
      let e = fbm(nA, (nx + wx) * freq, (ny + wy) * freq, 6, 2.05, 0.52);
      const plate = fbm(nD, nx * 1.6 + 9, ny * 1.6, 3);
      const ridge = 1 - Math.abs(fbm(nB, (nx + wx) * 3.4, (ny + wy) * 3.4, 4)) * 2.6;
      e += Math.max(0, ridge) ** 3 * clamp(plate * 2.4 + 0.55, 0, 1) * 0.42;
      const cx = x / w - 0.5, cy = y / h - 0.5;
      const r = Math.sqrt(cx * cx * 4 + cy * cy * 4);
      if (type === 'pangea') e += 0.5 * (1 - r * r) - 0.1;
      if (type === 'inland') e += 0.6 * Math.exp(-((r - 0.62) ** 2) / 0.05) - 0.2;
      const d = Math.min(x, w - 1 - x, y, h - 1 - y) / (0.11 * Math.min(w, h));
      if (d < 1) e -= (1 - d) * (1 - d) * 0.9;
      raw[y * w + x] = e;
    }
    const sorted = Float32Array.from(raw).sort();
    const sea = sorted[Math.floor(n * (1 - landFrac))];
    const eMax = sorted[n - 1], eMin = sorted[0];
    for (let i = 0; i < n; i++) {
      const e = raw[i] - sea;
      elev[i] = e > 0 ? Math.pow(e / (eMax - sea), 1.35) : -Math.pow(-e / (sea - eMin), 0.8);
    }
    // ---- one equator somewhere on the map ----
    eq = 0.35 + rnd() * 0.3;
    for (let y = 0; y < h; y++) latRow[y] = Math.abs(y / h - eq) / Math.max(eq, 1 - eq);
  }

  // ---- temperature ----
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, lat = latRow[y];
    const t = 1.02 - lat * 1.02 + fbm(nE, x / h * 3, y / h * 3, 3) * 0.16 - Math.max(0, elev[i]) * 0.62;
    temp[i] = clamp(t, 0, 1);
  }

  // ---- rainfall: air carries moisture along the wind, wrings out over rising ground ----
  const rain = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const lat = latRow[y];
    const dir = (lat < 0.33 || lat > 0.72) ? -1 : 1;  // trade winds and polar easterlies blow west
    let m = 0.9;
    for (let k = 0; k < w; k++) {
      const x = dir > 0 ? k : w - 1 - k, i = y * w + x;
      if (elev[i] <= 0) { m = Math.min(1, m + 0.035); rain[i] = m * 0.5; continue; }
      const prev = dir > 0 ? i - 1 : i + 1;
      const rise = k > 0 ? Math.max(0, elev[i] - Math.max(0, elev[prev])) : 0;
      const fall = Math.min(m, m * 0.016 + rise * m * 5);
      rain[i] = fall * 16 + 0.05;
      m = Math.max(0.03, m - fall + 0.0015);
    }
  }
  const tmpB = new Float32Array(n);
  for (let pass = 0; pass < 3; pass++) {
    const R = 3;
    for (let y = 0; y < h; y++) { let s = 0, c = 0; for (let x = 0; x < w; x++) { s += rain[y * w + x]; c++; if (x > R * 2) { s -= rain[y * w + x - R * 2 - 1]; c--; } tmpB[y * w + Math.max(0, x - R)] = s / c; } }
    for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let y = 0; y < h; y++) { s += tmpB[y * w + x]; c++; if (y > R * 2) { s -= tmpB[(y - R * 2 - 1) * w + x]; c--; } rain[Math.max(0, y - R) * w + x] = s / c; } }
  }
  // rank-normalise so every world has a sensible spread of dry and wet land
  const landRain = [];
  for (let i = 0; i < n; i++) if (elev[i] > 0) landRain.push(rain[i]);
  landRain.sort((a, b) => a - b);
  const rainRank = v => {
    let lo = 0, hi = landRain.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (landRain[m] < v) lo = m + 1; else hi = m; }
    return lo / Math.max(1, landRain.length - 1);
  };
  const beltAt = type === 'earth' ? 0.24 : 0.36;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, lat = latRow[y];
    const belt = Math.exp(-((lat - beltAt) ** 2) / 0.012) * 0.2;  // subtropical desert belt
    moist[i] = clamp(0.08 + rainRank(rain[i]) * 0.86 + fbm(nE, x / h * 5 + 40, y / h * 5, 3) * 0.22 - belt, 0, 1);
  }

  // ---- rivers: priority flood fills sinks and gives every tile a drain ----
  const filled = new Float32Array(n), seen = new Uint8Array(n), order = new Int32Array(n);
  const hp = []; const hPushL = (i, e) => { let k = hp.length; hp.push([i, e]); while (k > 0) { const p = (k - 1) >> 1; if (hp[p][1] <= e) break; const t = hp[p]; hp[p] = hp[k]; hp[k] = t; k = p; } };
  const hPopL = () => { const top = hp[0], last = hp.pop(); if (hp.length) { hp[0] = last; let k = 0; for (;;) { let c = k * 2 + 1; if (c >= hp.length) break; if (c + 1 < hp.length && hp[c + 1][1] < hp[c][1]) c++; if (hp[c][1] >= hp[k][1]) break; const t = hp[c]; hp[c] = hp[k]; hp[k] = t; k = c; } } return top; };
  // only water that really reaches the open sea counts as sea level; anything lower but walled in is a basin that has to fill up and spill
  const ocean = new Uint8Array(n);
  {
    const st = new Int32Array(n); let sp = 0;
    for (let x = 0; x < w; x++) { for (const y of [0, h - 1]) { const i = y * w + x; if (elev[i] <= 0 && !ocean[i]) { ocean[i] = 1; st[sp++] = i; } } }
    for (let y = 0; y < h; y++) { for (const x of [0, w - 1]) { const i = y * w + x; if (elev[i] <= 0 && !ocean[i]) { ocean[i] = 1; st[sp++] = i; } } }
    while (sp) { const i = st[--sp], x = i % w, y = (i / w) | 0; for (let k = 0; k < 4; k++) { const nx = x + NB_X[k], ny = y + NB_Y[k]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const ni = ny * w + nx; if (elev[ni] <= 0 && !ocean[ni]) { ocean[ni] = 1; st[sp++] = ni; } } }
  }
  for (let i = 0; i < n; i++) if (ocean[i]) { seen[i] = 1; filled[i] = elev[i]; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!ocean[i]) continue;
    for (let k = 0; k < 4; k++) {
      const nx = x + NB_X[k], ny = y + NB_Y[k];
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && !ocean[ny * w + nx]) { hPushL(i, elev[i]); break; }
    }
  }
  let oc = 0;
  while (hp.length) {
    const [i, e] = hPopL();
    if (!ocean[i]) order[oc++] = i;
    const x = i % w, y = (i / w) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = x + NB_X[k], ny = y + NB_Y[k];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (seen[ni]) continue;
      seen[ni] = 1; down[ni] = i;
      filled[ni] = Math.max(elev[ni], e + 0.00002);
      hPushL(ni, filled[ni]);
    }
  }
  // Basins fill to their rim and spill. A very deep one would drown the country round it, so it only rises so far and cuts a gorge through its lowest rim instead.
  const forced = new Uint8Array(n), mark = new Int32Array(n), stk = new Int32Array(n);
  const LAKE_MIN = 0.012, MAX_DEPTH = 0.1;
  const labelLakes = () => {
    const regions = []; mark.fill(0);
    for (let s = 0; s < n; s++) {
      if (ocean[s] || mark[s] || filled[s] - elev[s] <= LAKE_MIN) continue;
      const id = regions.length + 1, reg = { id, tiles: [], low: s };
      let sp = 0; stk[sp++] = s; mark[s] = id;
      while (sp) {
        const i = stk[--sp]; reg.tiles.push(i);
        if (elev[i] < elev[reg.low]) reg.low = i;
        const x = i % w, y = (i / w) | 0;
        for (let k = 0; k < 8; k++) { const nx = x + NB_X[k], ny = y + NB_Y[k]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const ni = ny * w + nx; if (!ocean[ni] && !mark[ni] && filled[ni] - elev[ni] > LAKE_MIN) { mark[ni] = id; stk[sp++] = ni; } }
      }
      regions.push(reg);
    }
    return regions;
  };
  for (const reg of labelLakes()) {
    const surface = filled[reg.low];
    if (surface - elev[reg.low] <= MAX_DEPTH) continue;
    const level = elev[reg.low] + MAX_DEPTH * 0.7;
    for (const i of reg.tiles) filled[i] = Math.max(elev[i], level);
    // the outlet: follow the drain from the deepest point until the ground is below the new shore
    let c = reg.low, guard = 0;
    while (c >= 0 && !ocean[c] && guard++ < n) {
      if (elev[c] > level) { elev[c] = level; filled[c] = level; forced[c] = 1; }
      else if (filled[c] <= level && mark[c] !== reg.id) break;
      c = down[c];
    }
  }
  const acc = new Float32Array(n);
  for (let i = 0; i < n; i++) if (!ocean[i]) acc[i] = 0.1 + moist[i];
  for (let k = oc - 1; k >= 0; k--) { const i = order[k], d = down[i]; if (d >= 0 && !ocean[d]) acc[d] += acc[i]; }
  const landCount = oc;
  const riverT = Math.max(14, landCount * 0.0013);
  // whatever a lake holds has to leave by its outlet, and the wider the lake the bigger the river
  const lakes = labelLakes();
  for (const reg of lakes) {
    let c = reg.low, guard = 0;
    while (c >= 0 && mark[c] === reg.id && guard++ < n) c = down[c];
    reg.outlet = c;
    const flow = riverT * (reg.tiles.length < 30 ? 1 : reg.tiles.length < 250 ? 4 : 10);
    guard = 0;
    while (c >= 0 && !ocean[c] && mark[c] === 0 && guard++ < n) { if (acc[c] < flow) acc[c] = flow; forced[c] = 1; c = down[c]; }
    reg.into = c;
  }

  // ---- biomes ----
  for (let i = 0; i < n; i++) {
    const e = elev[i], t = temp[i], m = moist[i];
    if (ocean[i]) { biome[i] = B.DEEP; water[i] = 2; continue; }
    if (filled[i] - e > LAKE_MIN) { biome[i] = B.LAKE; water[i] = 1; continue; }
    if (e > 0.72 && t < 0.2) biome[i] = B.SNOW;
    else if (e > 0.5) biome[i] = B.ROCK;
    else if (t < 0.15) biome[i] = B.TUNDRA;
    else if (t < 0.32) biome[i] = m > 0.35 ? B.TAIGA : B.TUNDRA;
    else if (t < 0.62) biome[i] = m < 0.2 ? B.DESERT : m < 0.36 ? B.STEPPE : m < 0.6 ? B.GRASS : B.FOREST;
    else biome[i] = m < 0.16 ? B.DESERT : m < 0.42 ? B.SAVANNA : m < 0.68 ? B.GRASS : B.JUNGLE;
    if (e < 0.018 && m > 0.75 && t > 0.3 && hash2(i % w >> 2, (i / w | 0) >> 2, seed) < 0.7) biome[i] = B.MARSH;
  }
  // rivers mark their course; shores and ocean depth come from BFS off the land
  // 1 is a creek, 2 a stream, 3 a river boats can use, 4 a great river
  for (let i = 0; i < n; i++) if (water[i] === 0 && (acc[i] > riverT || forced[i])) river[i] = acc[i] > riverT * 30 ? 4 : acc[i] > riverT * 10 ? 3 : acc[i] > riverT * 3 ? 2 : 1;
  const dist = new Int16Array(n).fill(-1); const q = new Int32Array(n); let qh = 0, qt = 0;
  for (let i = 0; i < n; i++) if (water[i] !== 2) { dist[i] = 0; q[qt++] = i; }
  while (qh < qt) {
    const i = q[qh++], x = i % w, y = (i / w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = x + NB_X[k], ny = y + NB_Y[k];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (dist[ni] < 0) { dist[ni] = dist[i] + 1; q[qt++] = ni; }
    }
  }
  const shoreDist = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    shoreDist[i] = Math.min(dist[i], 255);
    if (water[i] === 2 && dist[i] <= 5) { water[i] = 1; biome[i] = B.SHALLOW; }
    if (water[i] === 0 && biome[i] !== B.ROCK && biome[i] !== B.SNOW && elev[i] < 0.03 && !river[i]) {
      const x = i % w, y = (i / w) | 0; let shore = false;
      for (let k = 0; k < 8 && !shore; k++) { const ni = (y + NB_Y[k]) * w + x + NB_X[k]; if (ni >= 0 && ni < n && elev[ni] <= 0) shore = true; }
      if (shore && biome[i] !== B.MARSH) biome[i] = B.BEACH;
    }
    if (i % w === 0 || i % w === w - 1 || i < w || i >= n - w) { water[i] = 3; river[i] = 0; biome[i] = B.DEEP; }
  }

  // ---- every water body has a name and a place in the drainage: creek into stream into river into lake into sea ----
  const body = new Int16Array(n), bodies = [null];
  const nameSyl = ['Ar', 'Bel', 'Cor', 'Dun', 'El', 'Fen', 'Gal', 'Har', 'Ith', 'Jor', 'Kel', 'Lor', 'Mar', 'Nor', 'Os', 'Pel', 'Quel', 'Ros', 'Sel', 'Tor', 'Ul', 'Ver', 'Wen', 'Yar', 'Zan'], nameEnd = ['a', 'ane', 'ath', 'en', 'esh', 'ia', 'in', 'on', 'or', 'os', 'um', 'une', 'yr'];
  const wname = () => pick(nameSyl) + (rnd() < 0.5 ? pick(nameSyl).toLowerCase() : '') + pick(nameEnd);
  const seaMin = Math.max(110, landCount * 0.009);
  for (let s = 0; s < n; s++) {
    if (!water[s] || water[s] === 3 || body[s]) continue;
    const id = bodies.length, isOcean = !!ocean[s];
    let sp = 0, sx = 0, sy = 0, area = 0; stk[sp++] = s; body[s] = id;
    while (sp) {
      const i = stk[--sp], x = i % w, y = (i / w) | 0; sx += x; sy += y; area++;
      for (let k = 0; k < 8; k++) { const nx = x + NB_X[k], ny = y + NB_Y[k]; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const ni = ny * w + nx; if (water[ni] && water[ni] !== 3 && !body[ni] && !!ocean[ni] === isOcean) { body[ni] = id; stk[sp++] = ni; } }
    }
    const kind = isOcean ? 'ocean' : area >= seaMin ? 'sea' : 'lake', nm = wname();
    bodies.push({ id, kind, area, x: sx / area, y: sy / area, name: isOcean ? `The ${nm} Ocean` : kind === 'sea' ? `The ${nm} Sea` : `Lake ${nm}`, outlet: -1, into: 0 });
  }
  for (const reg of lakes) {
    const id = body[reg.tiles[0]];
    if (!id || !bodies[id]) continue;
    bodies[id].outlet = reg.outlet; bodies[id].into = reg.into >= 0 ? body[reg.into] : 0;
  }
  // rivers: named from the mouth up, with each big enough tributary a river of its own
  const riverId = new Int16Array(n), rivers = [null];
  for (let k = 0; k < oc; k++) {
    const i = order[k];
    if (!river[i]) continue;
    const d = down[i];
    if (d >= 0 && river[d] && riverId[d] && acc[i] >= acc[d] * 0.45) { riverId[i] = riverId[d]; rivers[riverId[i]].len++; continue; }
    const id = rivers.length;
    riverId[i] = id; rivers.push({ id, name: wname(), len: 1, into: d >= 0 ? (body[d] || 0) : 0 });
  }

  const world = {
    w, h, seed, type, cfg: opt, tick: 0, nextId: 1, rs: 0, maxPop: opt.maxPop || 5000, inv: opt.inv || 1, eq, latRow,
    elev, temp, moist, biome, river, water, down, shoreDist, body, bodies, riverId, rivers,
    lane: new Uint8Array(n), canal: new Uint8Array(n), canalId: new Int16Array(n), canals: [], lanes: new Uint8Array(n), tileN: new Uint8Array(n), snowD: new Uint8Array(n), ice: new Uint8Array(n), seaNet: new Int32Array(n), storms: [], clim: { t: 0, phase: rnd() * 6.283, note: 0, co2: 0 },
    tree: new Uint8Array(n), baseTree: new Uint8Array(n), forage: new Uint8Array(n), baseForage: new Uint8Array(n),
    fert: new Uint8Array(n), baseFert: new Uint8Array(n), ore: new Uint8Array(n), oreAmt: new Uint16Array(n),
    wild: new Uint8Array(n), fish: new Uint8Array(n), baseFish: new Uint8Array(n),
    baseCost: new Uint8Array(n), cost: new Uint8Array(n), occ: new Uint8Array(n), owner: new Int16Array(n).fill(-1),
    wear: new Uint16Array(n), road: new Uint8Array(n), landId: new Int16Array(n), stage: new Uint8Array(n), plant: new Uint8Array(n), plantS: new Uint8Array(n),
    rail: new Uint8Array(n), bAt: new Map(), blds: [],
    people: [], towns: [], polities: [], cultures: [], herds: [], armies: [], trains: [], planes: [],
    log: [], history: [], firsts: {}, climate: new Float32Array(100), eco: 0, nextTown: 1,
    deaths: 0, births: 0, spaceRace: false,
  };
  const prev = W; W = world;

  // ---- vegetation and soil ----
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, b = biome[i];
    if (water[i]) continue;
    const pat = fbm(nD, x / h * 11, y / h * 11, 3);
    let tr = 0;
    if (b === B.FOREST) tr = pat > -0.25 ? 4 + rint(3) : 1;
    else if (b === B.JUNGLE) tr = 5 + rint(2);
    else if (b === B.TAIGA) tr = pat > -0.2 ? 3 + rint(3) : 0;
    else if (b === B.GRASS) tr = pat > 0.18 ? 2 + rint(3) : (rnd() < 0.03 ? 1 : 0);
    else if (b === B.SAVANNA) tr = rnd() < 0.07 ? 1 : 0;
    else if (b === B.STEPPE) tr = rnd() < 0.015 ? 1 : 0;
    else if (b === B.MARSH) tr = pat > 0 ? 2 : 0;
    else if (b === B.ROCK) tr = (elev[i] < 0.6 && temp[i] > 0.25 && pat > 0) ? 1 + rint(2) : 0;
    world.tree[i] = world.baseTree[i] = tr;
    const nearRiver = riverNear(world, x, y, 2);
    let fo = 0;
    if (b === B.FOREST || b === B.GRASS) fo = 4; else if (b === B.JUNGLE) fo = 4; else if (b === B.SAVANNA || b === B.MARSH) fo = 3;
    else if (b === B.STEPPE || b === B.TAIGA) fo = 2; else if (b === B.TUNDRA || b === B.BEACH) fo = 1;
    if (nearRiver) fo += 1;
    if (hash2(x >> 1, y >> 1, seed + 5) > 0.42) fo = 0;  // wild food grows in patches
    world.forage[i] = world.baseForage[i] = fo;
    let fe = clamp(moist[i] * 1.2, 0.05, 1) * clamp(temp[i] * 2.2 - 0.25, 0, 1) * 200;
    fe *= clamp(1.25 - elev[i] * 2.2, 0.08, 1);
    if (nearRiver) fe = fe * 0.7 + 90;  // flood plains: a river makes even desert farmable
    if (b === B.ROCK || b === B.SNOW || b === B.BEACH) fe *= 0.2;
    world.fert[i] = world.baseFert[i] = clamp(fe, 0, 255);
  }

  // ---- deposits come in clusters; tin is rare, which is why bronze needs trade ----
  const lands = []; for (let i = 0; i < n; i++) if (!water[i]) lands.push(i);
  const place = (ore, count, rad, amt, ok) => {
    let made = 0;
    for (let t = 0; t < count * 60 && made < count; t++) {
      const c = pick(lands);
      if (!ok(c)) continue;
      made++;
      const cx = c % w, cy = (c / w) | 0, r = rad * (0.6 + rnd() * 0.7);
      for (let dy = -r | 0; dy <= r; dy++) for (let dx = -r | 0; dx <= r; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
        const ni = ny * w + nx;
        if (water[ni] || world.ore[ni]) continue;
        const d = Math.sqrt(dx * dx + dy * dy) / r;
        if (d > 1 || rnd() < d * d * 0.8 + 0.1) continue;
        world.ore[ni] = ore; world.oreAmt[ni] = amt * (0.5 + rnd());
      }
    }
  };
  const L = lands.length;
  // Each deposit has the shape its geology gives it. Coal lies in long seams through old lowland basins; iron in thin bands along hill country;
  // copper in round clusters by mountain belts; gold in hairline veins high up; oil in a few rare basins of small pools; salt on flats and shores.
  const nG1 = makeNoise(rint(1e9)), nG2 = makeNoise(rint(1e9)), nG3 = makeNoise(rint(1e9)), nP = makeNoise(rint(1e9));
  for (const i of lands) {
    const x = i % w, y = (i / w) | 0, nx = x / h, ny = y / h, e = elev[i];
    const basin = fbm(nP, nx * 2.6, ny * 2.6, 3);  // old sediment on one side of zero, old mountain roots on the other
    if (e > 0.04 && e < 0.42 && basin < 0.04 && Math.abs(fbm(nG1, nx * 5.5, ny * 5.5, 2)) < 0.016) { world.ore[i] = ORE.COAL; world.oreAmt[i] = 1000 + rnd() * 900; continue; }
    if (e > 0.13 && basin > -0.12 && Math.abs(fbm(nG2, nx * 8, ny * 8, 2)) < 0.0085) { world.ore[i] = ORE.IRON; world.oreAmt[i] = 700 + rnd() * 600; continue; }
    if (e > 0.32 && basin > 0.14 && Math.abs(fbm(nG3, nx * 13, ny * 13, 2)) < 0.0042) { world.ore[i] = ORE.GOLD; world.oreAmt[i] = 120 + rnd() * 160; continue; }
  }
  const high = v => i => elev[i] > v;
  place(ORE.COPPER, Math.max(6, L / 2600), 3, 700, i => elev[i] > 0.2 && elev[i] < 0.55);
  place(ORE.TIN, Math.max(3, L / 10000), 2, 450, i => elev[i] > 0.28);
  place(ORE.GEMS, Math.max(3, L / 9000), 1.6, 220, high(0.34));
  place(ORE.SULFUR, Math.max(3, L / 8000), 1.6, 380, high(0.42));
  place(ORE.URANIUM, Math.max(2, L / 15000), 1.6, 300, high(0.28));
  place(ORE.SALT, Math.max(4, L / 5000), 3, 900, i => biome[i] === B.DESERT || biome[i] === B.BEACH || (biome[i] === B.STEPPE && moist[i] < 0.25));
  // oil: very few basins, each a scatter of small pools with a lot in them
  const oilBasins = Math.max(2, Math.round(L / 11000));
  for (let c = 0, tries = 0; c < oilBasins && tries < 900; tries++) {
    const a = pick(lands), bi = biome[a];
    if (!(bi === B.DESERT || bi === B.BEACH || bi === B.MARSH || bi === B.STEPPE) || elev[a] > 0.22) continue;
    c++;
    const pools = 2 + rint(3), ax = a % w, ay = (a / w) | 0;
    for (let q = 0; q < pools; q++) {
      const px = ax + rint(17) - 8, py = ay + rint(17) - 8, r = 1 + rint(2);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const j = (py + dy) * w + px + dx;
        if (j < 0 || j >= n || water[j] || world.ore[j] || dx * dx + dy * dy > r * r) continue;
        world.ore[j] = ORE.OIL; world.oreAmt[j] = 2200 + rnd() * 1800;
      }
    }
  }
  // a little of what's in the hills washes down the creeks as placer gold
  for (const i of lands) if (river[i] && !world.ore[i] && elev[i] > 0.14 && elev[i] < 0.36 && hash2(i % w, (i / w) | 0, seed + 31) < 0.012) { world.ore[i] = ORE.GOLD; world.oreAmt[i] = 80; }
  for (const i of lands) {
    if (world.ore[i]) continue;
    const x = i % w, y = (i / w) | 0;
    if (elev[i] > 0.24 && hash2(x >> 1, y >> 1, seed + 8) < 0.28) { world.ore[i] = ORE.STONE; world.oreAmt[i] = 1500; }
    else if (riverNear(world, x, y, 2) && hash2(x >> 1, y >> 1, seed + 9) < 0.3 && biome[i] !== B.ROCK) { world.ore[i] = ORE.CLAY; world.oreAmt[i] = 800; }
  }

  // ---- wild crops grow only where they evolved, so farming starts in a few cradles ----
  const cradles = 3 + rint(4) + Math.floor(L / 12000);
  for (let c = 0; c < cradles; c++) {
    const crop = 1 + rint(5), C = CROPS[crop];
    let at = -1;
    for (let t = 0; t < 400 && at < 0; t++) { const i = pick(lands); if (cropSuit(crop, i) > 0.8 && world.fert[i] > 50) at = i; }
    if (at < 0) continue;
    const cx = at % w, cy = (at / w) | 0, r = 16 + rint(14);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
      const ni = ny * w + nx;
      if (water[ni] || world.wild[ni]) continue;
      if (dx * dx + dy * dy < r * r && cropSuit(crop, ni) > 0.3 && hash2(nx >> 1, ny >> 1, seed + c) < 0.45) world.wild[ni] = crop;
    }
  }

  // ---- fish ----
  for (let i = 0; i < n; i++) {
    if (water[i] === 1 && shoreDist[i] <= 3) world.fish[i] = world.baseFish[i] = 3 + rint(5);
    else if (water[i] === 1) world.fish[i] = world.baseFish[i] = 3;
    else if (river[i]) world.fish[i] = world.baseFish[i] = river[i] + 1;
  }

  // ---- movement cost, land masses ----
  for (let i = 0; i < n; i++) {
    let c = 255;
    if (water[i] === 0) {
      const b = biome[i], e = elev[i];
      c = b === B.ROCK ? 34 + e * 70 : b === B.SNOW ? 110 : b === B.MARSH ? 28 : b === B.JUNGLE ? 20 : b === B.DESERT ? 13 : b === B.TUNDRA ? 14 : 10;
      c += world.tree[i] * 1.5 + e * 16;
      if (river[i]) c += river[i] === 1 ? 4 : 12 + river[i] * 9;  // you can step over a creek; a river needs a ford or a bridge
    }
    world.baseCost[i] = clamp(c, 8, 255);
    world.cost[i] = world.baseCost[i];
  }
  let lid = 0; world.landId.fill(-1);
  for (let i = 0; i < n; i++) {
    if (water[i] || world.landId[i] >= 0) continue;
    lid++; qh = qt = 0; q[qt++] = i; world.landId[i] = lid;
    while (qh < qt) {
      const j = q[qh++];
      for (let k = 0; k < 8; k++) { const ni = j + NB_X[k] + NB_Y[k] * w; if (ni >= 0 && ni < n && !water[ni] && world.landId[ni] < 0) { world.landId[ni] = lid; q[qt++] = ni; } }
    }
  }

  // ---- herds ----
  const herdCount = Math.floor(L / 170);
  for (let k = 0; k < herdCount; k++) {
    const i = pick(lands), ty = [];
    HERD_TYPES.forEach((H, ix) => { if (H.biomes.includes(biome[i])) ty.push(ix); });
    if (!ty.length) continue;
    const type = pick(ty), H = HERD_TYPES[type];
    if (H.pred && rnd() < 0.55) continue;  // hunters are rarer than what they hunt
    world.herds.push({ id: k, x: i % w + 0.5, y: ((i / w) | 0) + 0.5, type, n: Math.ceil(H.cap * (0.4 + rnd() * 0.6)), tx: i % w, ty: (i / w) | 0, owner: null });
  }
  W = prev;
  return world;
}
// Everything a ship could ever float on, joined up: water, big rivers and any canal that's been dug. Ships can only go where this reaches.
function linkSeaNet() {
  const n = W.w * W.h, net = W.seaNet, st = new Int32Array(n);
  net.fill(0);
  const ok = i => (W.water[i] === 1 || W.water[i] === 2) || W.river[i] >= 3 || W.canal[i] > 0;
  let id = 0;
  for (let s = 0; s < n; s++) {
    if (net[s] || !ok(s)) continue;
    id++;
    let sp = 0; st[sp++] = s; net[s] = id;
    while (sp) { const i = st[--sp]; for (let k = 0; k < 8; k++) { const ni = i + NB_D[k]; if (ni >= 0 && ni < n && !net[ni] && ok(ni)) { net[ni] = id; st[sp++] = ni; } } }
  }
}
function waterNameAt(i) {
  if (W.body[i] && W.bodies[W.body[i]]) return W.bodies[W.body[i]].name;
  if (W.river[i] && W.rivers[W.riverId[i]]) { const nm = W.rivers[W.riverId[i]].name; return W.river[i] === 1 ? `${nm} Creek` : W.river[i] === 2 ? `${nm} Stream` : `The River ${nm}`; }
  return '';
}

function riverNear(wd, x, y, r) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= wd.w || ny >= wd.h) continue;
    if (wd.river[ny * wd.w + nx]) return true;
  }
  return false;
}
function cropSuit(crop, i) {
  const C = CROPS[crop], t = W.temp[i], m = W.moist[i];
  if (W.water[i] || W.biome[i] === B.ROCK || W.biome[i] === B.SNOW) return 0;
  let s = 1;
  if (t < C.tMin) s *= clamp(1 - (C.tMin - t) * 6, 0, 1);
  if (t > C.tMax) s *= clamp(1 - (t - C.tMax) * 6, 0, 1);
  const wet = m + (W.river[i] ? 0.4 : 0) + W.fert[i] / 900;
  if (wet < C.mMin) s *= clamp(1 - (C.mMin - wet) * 5, 0, 1);
  return s;
}
