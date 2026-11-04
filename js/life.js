'use strict';
// The world being difficult: disasters, faiths, what people eat, whether they can read, the air they breathe, and what they leave to their children.

// ---- what people eat. A town living on one thing is a sicker town than one with fish, meat and greens as well. ----
const FOOD_KIND = { [J.FARM]: 0, [J.GARDEN]: 1, [J.FORAGE]: 1, [J.HUNT]: 2, [J.HERD]: 2, [J.FISH]: 3 };
const DIET_NAME = ['Grain', 'Fruit & greens', 'Meat', 'Fish'];
function dietYear(t) {
  const D = t.diet;
  const sum = D[0] + D[1] + D[2] + D[3];
  if (sum <= 0) return;
  let h = 0;
  for (let k = 0; k < 4; k++) { const f = D[k] / sum; if (f > 0) h -= f * Math.log(f); }
  t.dietScore = t.dietScore * 0.7 + clamp(h / 1.2, 0, 1) * 0.3;
  D.fill(0);
}
// ---- schools and literacy: invention takes people who can read what the last person worked out ----
function literacyYear(t) {
  // real schooling decides literacy, child by child (education.js); this older estimate is kept for scripts without it
  if (typeof educationYear === 'function') { if (t.polity.capital === t) eduLawYear(t.polity); educationYear(t); if (t.literacy > 0.5 && !t.litNote && tn(t) > 150) { t.litNote = true; chronT('tech', `More than half of ${t.name} can read now. Ideas start moving faster than people.`, t); } return; }
  const n = Math.max(tn(t), 1), m = t.mod;
  let seats = 0;
  for (const b of t.studies) seats += BLD[b.type].study || 0;
  const school = (t.count.school || 0) * 200 + (t.count.campus || 0) * 800 + (t.count.university || 0) * 150 + (t.count.library || 0) * 60 + (t.count.monastery || 0) * 40 + (t.count.scribe || 0) * 20 + seats * 3;
  const reach = (t.tech[TECH_IX.printing] ? 2.5 : 1) * (t.tech[TECH_IX.internet] ? 3 : 1);
  // before cheap books and free schools, reading is for a few
  const most = t.tech[TECH_IX.schools] ? 0.98 : t.tech[TECH_IX.printing] ? 0.5 : t.tech[TECH_IX.paper] ? 0.2 : 0.08;
  const target = clamp(school * reach / n, 0, most) * (t.tech[TECH_IX.writing] ? 1 : 0);
  t.literacy += (target - t.literacy) * 0.02;
  if (t.literacy > 0.5 && !t.litNote && tn(t) > 150) { t.litNote = true; chronT('tech', `More than half of ${t.name} can read now. Ideas start moving faster than people.`, t); }
}
// ---- smoke: an industrial town shortens the lives of everyone downwind ----
function pollutionYear(t) {
  let smoke = 0;
  for (const k in t.count) { const d = BLD[k]; if (d && d.smoke >= 2) smoke += (d.smoke - 1) * t.count[k]; }
  smoke -= (t.count.windfarm || 0) * 3 + (t.count.solarfarm || 0) * 3 + (t.count.carbonscrub || 0) * 8;
  if (t.tech[TECH_IX.renewables]) smoke *= 0.6;
  t.smog += (Math.min(2, Math.max(0, smoke) * 0.04) - t.smog) * 0.1;
  if (t.smog > 0.6) t.needs[TAG_IX.energy] += 0.2;
}
// ---- land wears out: a cleared slope washes away, and takes the soil with it ----
function erosionStep(i) {
  if (W.tree[i] > 0 || W.occ[i] === 1 || W.elev[i] < 0.14) return;
  const d = W.down[i];
  if (d < 0 || W.elev[i] - W.elev[d] < 0.012) return;
  if (W.baseFert[i] > 20 && rnd() < 0.04) { W.baseFert[i]--; if (W.fert[i] > W.baseFert[i]) W.fert[i] = W.baseFert[i]; }
}
// ---- buildings don't last for ever. What isn't kept up falls down, and the money for keeping it up comes from the treasury ----
function decayYear(t) {
  const cur = t.polity.cur;
  const poor = cur.kind >= 2 && cur.treasury <= 0 ? 3 : 1;
  const L = t.blds;
  if (!L.length) return;
  for (let k = 0, n = Math.ceil(L.length * 0.02); k < n; k++) {
    const b = L[rint(L.length)];
    if (!b || b.type === 'hearth' || !b.done) continue;
    const age = (W.tick - b.age) / TPY;
    if (age > 150 && b.type === 'house' && rnd() < 0.015 * poor * (HOUSES[b.tier].tier <= 1 ? 2.5 : 1)) { removeBuilding(b); }
    else if (age > 400 && b.type !== 'house' && !BLD[b.type].size && rnd() < 0.01 * poor) removeBuilding(b);
  }
}
// ---- families: everyone has a name to pass on, and some names come to matter ----
function familyName(c) { return cap(word(c, 1 + rint(2))) + pick(['', '', 'son', 'ar', 'ine', 'er', 'by', 'ov']); }

// ---- faith: gods are made by people, and people fight about them ----
const TENETS = [
  { id: 'peace', name: 'Peaceful', fx: { war: 0.7, health: 0.99 }, about: 'Killing is a sin.' },
  { id: 'holywar', name: 'Militant', fx: { war: 1.35, attack: 1.06 }, about: 'The faith spreads by the sword.' },
  { id: 'learned', name: 'Learned', fx: { research: 1.08 }, about: 'Study is prayer.' },
  { id: 'ascetic', name: 'Ascetic', fx: { spoil: 0.95, trade: 0.92 }, about: 'Want little, keep what you have.' },
  { id: 'merchant', name: 'Trading', fx: { trade: 1.12 }, about: 'Honest dealing pleases the gods.' },
  { id: 'fertile', name: 'Family', fx: { birth: 1.12 }, about: 'Be many.' },
  { id: 'healer', name: 'Healing', fx: { health: 0.96, plague: 0.9 }, about: 'Tending the sick is the first duty.' },
  { id: 'builder', name: 'Temple-building', fx: { build: 1.08, happy: 2 }, about: 'Stone to the sky.' },
];
const FAITH_KIND = ['ancestor spirits', 'the old gods', 'the One', 'the Path', 'the Sun', 'the Great Mother', 'the Book', 'the River'];
function newFaith(t, parent) {
  W.faiths = W.faiths || [];
  const id = W.faiths.length;
  const hue = (id * 97 + (parent ? parent.hue + 20 : t.culture.hue)) % 360;
  const tenets = parent ? parent.tenets.slice() : [];
  while (tenets.length < 2) { const q = rint(TENETS.length); if (!tenets.includes(q)) tenets.push(q); }
  if (parent) tenets[rint(2)] = rint(TENETS.length);
  const f = { id, name: `${cap(word(t.culture, 2))}ism`, kind: parent ? parent.kind : pick(FAITH_KIND), hue, color: `hsl(${hue},60%,62%)`, born: Math.floor(year()), home: t.name, parent: parent ? parent.id : -1, tenets, followers: 0, founder: '', alive: true };
  W.faiths.push(f);
  return f;
}
function faithFx(f) { const o = {}; for (const q of f.tenets) { const X = TENETS[q].fx; for (const k in X) o[k] = (o[k] === undefined ? (k === 'happy' ? 0 : 1) : o[k]) * (k === 'happy' ? 1 : X[k]) + (k === 'happy' ? X[k] : 0); } return o; }
function faithYear(t) {
  const yr = year();
  // the first temple gives a people something to believe in together
  if (t.faith < 0) {
    if ((knows(t, 'burial') || t.count.shrine) && rnd() < 0.05) {
      let near = null;
      for (const o of t.partners) if (o.faith >= 0) near = o;
      if (near && rnd() < 0.6) t.faith = near.faith;
      else { const f = newFaith(t, null); t.faith = f.id; const p = t.members[rint(t.members.length)]; if (p) { f.founder = p.name; p.fame += 4; plog(p, `Founded the worship of ${f.kind}.`); } if (tn(t) > 25) chronT('gov', `In ${t.name}, ${f.founder} teaches a new faith: ${f.name}, the way of ${f.kind}.`, t); }
      recomputeMods(t);
    }
    return;
  }
  const F = W.faiths[t.faith];
  F.followers += tn(t);
  // ideas travel with merchants and missionaries, faster to the faithless and into the crowded poor
  for (const o of t.partners) {
    if (o.faith === t.faith) continue;
    const pull = 0.01 + (t.count.temple || 0) * 0.004 + (t.count.cathedral || 0) * 0.02 + (t.count.monastery || 0) * 0.01 + (o.faith < 0 ? 0.04 : 0);
    if (rnd() < pull * (o.polity === t.polity ? 1.5 : 0.7) && rnd() < tn(t) / (tn(t) + tn(o))) {
      const old = o.faith;
      o.faith = t.faith; recomputeMods(o);
      if (old >= 0 && tn(o) > 60 && rnd() < 0.5) chronT('gov', `${o.name} turns from ${W.faiths[old].name} to ${F.name}.`, o);
    }
  }
  // a faith grown old and huge splits, usually over something very small
  if (F.followers > 3000 && tn(t) > 200 && rnd() < 0.0015 && t.polity.capital !== t) {
    const nf = newFaith(t, F);
    t.faith = nf.id; recomputeMods(t);
    chronT('gov', `A preacher in ${t.name} breaks with ${F.name}. The ${nf.name} schism has begun.`, t);
    adjustRel(t.polity, t.polity, 0);
    t.unrest = Math.min(100, t.unrest + 20);
  }
  // persecution: a faith that isn't the capital's has a hard time under a zealous ruler
  const cap0 = t.polity.capital;
  if (cap0 && cap0 !== t && cap0.faith >= 0 && cap0.faith !== t.faith) {
    const scienceAge = knows(cap0, 'humanism');
    t.unrest = Math.min(100, t.unrest + (scienceAge ? 0.5 : 3));
    if (!scienceAge && rnd() < 0.02 && tn(t) > 40) { chronT('gov', `Followers of ${F.name} are driven out of ${t.name} on the orders of the ${polityTitle(t.polity)}.`, t); const go = Math.floor(t.members.length * 0.05); for (let k = 0; k < go; k++) { const v = t.members[rint(t.members.length)]; if (v && !v.army && !v.leader && t.partners.length) { const to = pick(t.partners); moveTo(v, to); startMigrate(v, nearTile(to.i, 3)); } } }
  }
  // religion and neighbours: shared faith warms, different faith cools
  if (rnd() < 0.05) for (const o of t.partners) if (o.polity !== t.polity && o.polity.capital && t.polity.capital === t && o.polity.capital === o) adjustRel(t.polity, o.polity, o.faith === t.faith ? 1 : -0.6);
}
// ---- disasters ----
function disastersYear() {
  const w = W.w, h = W.h, land = w * h * 0.4;
  // the ground shakes where the mountains are young
  if (rnd() < 0.05 + land / 4e6) earthquake();
  if (W.volcanoes && rnd() < 0.012 * W.volcanoes.length / 3) eruption();
  // the dry season lights the forest
  // and a season with no rain lights it anywhere there's wood to burn
  for (let k = 0; k < 4; k++) {
    if (rnd() > 0.25) continue;
    const i = rint(w * h), dry = W.wx ? W.wx.wet[wxCellOf(i)] : 1;
    if (W.tree[i] >= 2 && W.temp[i] > 0.4 && seasonAt((i / w) | 0) > 0 && (dry < 0.5 || (W.moist[i] < 0.45 && dry < 1.1))) startWildfire(i);
  }
  // locusts rise out of the dry grass and follow the fields
  if (W.towns.length && rnd() < 0.03) {
    const t = pick(W.towns);
    if (t.fields.length > 6 && W.moist[t.i] < 0.5 && W.temp[t.i] > 0.5) W.swarms.push({ x: t.x + rnd() * 30 - 15, y: t.y + rnd() * 30 - 15, life: 40, t: t.id, ate: 0, vx: 0, vy: 0 });
  }
  // tropical cyclones form over warm water, and drown ships and coasts (with weather running, they grow out of its tropical lows instead)
  if (!W.wx && rnd() < 0.03) {
    for (let q = 0; q < 12; q++) {
      const i = rint(w * h);
      if (W.water[i] === 2 && W.temp[i] > 0.72) { W.cyclones.push({ x: i % w, y: (i / w) | 0, vx: (rnd() - 0.5) * 0.5, vy: (rnd() - 0.5) * 0.5, life: 90, r: 10 + rint(8), hit: false }); break; }
    }
  }
}
function earthquake() {
  const w = W.w;
  let at = -1;
  for (let q = 0; q < 40 && at < 0; q++) { const i = rint(w * W.h); if (!W.water[i] && W.elev[i] > 0.3) at = i; }
  if (at < 0) return;
  const x = at % w, y = (at / w) | 0, r = 10 + rint(10);
  let wrecked = 0, dead = 0, worst = null;
  for (const t of W.towns) {
    const d = Math.hypot(t.x - x, t.y - y);
    if (d > r + t.radius * 0.6) continue;
    const force = clamp(1 - d / (r + t.radius), 0.1, 1), stout = t.tech[TECH_IX.engineering] ? 0.7 : 1, modern = t.tech[TECH_IX.skyscrapers] ? 0.4 : 1;
    for (const b of t.blds.slice()) if (b.type !== 'hearth' && rnd() < 0.18 * force * stout * modern) { if (FXH) FXH.rubble(b.x, b.y, 2); removeBuilding(b); wrecked++; }
    const go = Math.floor(t.members.length * 0.04 * force * stout * modern);
    for (let k = 0; k < go; k++) { const v = t.members[rint(t.members.length)]; if (v) { killPerson(v, 'killed in an earthquake'); dead++; if (!t.alive) break; } }
    if (t.alive) { t.warYear = t.warYear; t.unrest = Math.min(100, t.unrest + 8); if (!worst || tn(t) > tn(worst)) worst = t; }
  }
  if (worst && wrecked >= 3) chronT('collapse', `The earth shakes under ${worst.name}. ${wrecked} buildings are down and ${dead} are dead.`, worst);
  // a quake near the sea sends a wave
  if (worst && W.shoreDist[at] <= 8 && rnd() < 0.3) {
    for (const t of W.towns) if (t.near.coast > 0 && Math.hypot(t.x - x, t.y - y) < 40) { for (const b of t.blds.slice()) if (b.type !== 'hearth' && W.shoreDist[b.i] <= 2 && rnd() < 0.35) removeBuilding(b); for (const s of t.ships) s.hp *= 0.6; }
    chronT('collapse', `The sea draws back from the coast near ${worst.name}, and then comes in again all at once.`, worst);
  }
}
function eruption() {
  const v = pick(W.volcanoes), x = v % W.w, y = (v / W.w) | 0, r = 7;
  if (FXH) FXH.boom(x, y, 12);
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const d2 = dx * dx + dy * dy, i = (y + dy) * W.w + x + dx;
    if (d2 > r * r || i < 0 || i >= W.tree.length || W.water[i]) continue;
    W.tree[i] = 0; W.plant[i] = 0; updCost(i);
    if (W.occ[i] === 1 && d2 < 25) { const b = W.bAt.get(i); if (b && b.type !== 'hearth') removeBuilding(b); }
    W.fert[i] = Math.min(255, W.fert[i] + 40); W.baseFert[i] = Math.min(255, W.baseFert[i] + 25);  // the ash makes the best soil there is, later
    dirty(i);
  }
  let dead = 0, near = null;
  for (const t of W.towns) { const d = Math.hypot(t.x - x, t.y - y); if (d > r + 16) continue; const go = Math.floor(t.members.length * (d < r ? 0.5 : 0.08)); for (let k = 0; k < go; k++) { const p = t.members[rint(t.members.length)]; if (p) { killPerson(p, 'killed by the volcano'); dead++; if (!t.alive) break; } } if (t.alive) near = t; }
  W.clim.ash = 3;  // a dark, cold few years everywhere
  chron('collapse', `The mountain above ${near ? near.name : 'the empty country'} explodes${dead ? `, killing ${dead}` : ''}. Ash turns the sun red, and the next summers are cold.`, x, y);
}
function startWildfire(i) { if (W.burning.length < 500) W.burning.push({ i, t: 5 + rint(10) }); }
function disastersTick() {
  const tick = W.tick;
  if (W.burning.length && tick % 6 === 0) {
    const B0 = W.burning;
    for (let k = B0.length - 1; k >= 0; k--) {
      const f = B0[k];
      if (--f.t <= 0) { B0[k] = B0[B0.length - 1]; B0.pop(); continue; }
      const i = f.i;
      if (W.tree[i]) { W.tree[i] = Math.max(0, W.tree[i] - 2); updCost(i); dirty(i); }
      W.plant[i] = 0;
      if (FXH && f.t % 3 === 0) FXH.burn(i % W.w, (i / W.w) | 0);
      if (W.snowD[i] > 10 || W.moist[i] > 0.7) continue;
      for (let q = 0; q < 8; q++) {
        const j = i + NB_D[q];
        if (j > 0 && j < W.tree.length && W.tree[j] > 0 && !W.water[j] && !W.road[j] && rnd() < 0.09 && B0.length < 500) B0.push({ i: j, t: 5 + rint(10) });
        else if (j > 0 && j < W.occ.length && W.occ[j] === 1 && rnd() < 0.01) { const b = W.bAt.get(j); if (b && b.type === 'house' && !(b.tier >= 4)) { if (FXH) FXH.burn(b.x, b.y); removeBuilding(b); } }
      }
    }
  }
  if (tick % 8 === 0) {
    for (let k = W.swarms.length - 1; k >= 0; k--) {
      const s = W.swarms[k], t = W.townById[s.t];
      if (--s.life <= 0 || !t) { if (t && s.ate > 10 && tn(t) > 30) chronT('famine', `A locust swarm strips the fields of ${t.name}: ${s.ate} harvests gone in days.`, t); W.swarms.splice(k, 1); continue; }
      s.x += (t.x - s.x) * 0.05 + (rnd() - 0.5); s.y += (t.y - s.y) * 0.05 + (rnd() - 0.5);
      for (const f of t.fields) { const dx = f.i % W.w - s.x, dy = ((f.i / W.w) | 0) - s.y; if (dx * dx + dy * dy < 25 && W.stage[f.i]) { W.stage[f.i] = 0; dirty(f.i); s.ate++; } }
    }
    for (let k = W.cyclones.length - 1; k >= 0; k--) {
      const c = W.cyclones[k];
      c.x += c.vx * 8; c.y += c.vy * 8; c.life--;
      if (c.life <= 0 || c.x < 3 || c.y < 3 || c.x > W.w - 4 || c.y > W.h - 4) { W.cyclones.splice(k, 1); continue; }
      for (const s of W.ships.slice()) { const dx = s.at % W.w - c.x, dy = ((s.at / W.w) | 0) - c.y; if (dx * dx + dy * dy < c.r * c.r && rnd() < 0.05) { s.hp -= 30; if (s.hp <= 0) { if (s.home && shipDef(s).hp > 40) chronT('misc', `A great storm sinks the ${s.name} of ${s.home.name}.`, s.home); loseShip(s, 'lost in a storm'); } } }
      const ci = Math.round(c.y) * W.w + Math.round(c.x);
      if (!c.landed && !W.water[ci]) { c.landed = true; landfall(c); c.life = Math.min(c.life, 14); c.r *= 0.8; }
      else for (const t of W.towns) { const dx = t.x - c.x, dy = t.y - c.y; if (dx * dx + dy * dy < c.r * c.r) t.stock[R.FOOD] *= 0.998; }
    }
  }
  if (W.clim.ash > 0 && tick % TPY === 0) W.clim.ash--;
}

// Where the eye comes ashore: wind flattens what's weak, and the sea comes in over the low ground behind the beach.
// The surge stays a few months, drowning crops and salting the fields, then drains (W.surges, drawn over the land).
function landfall(c) {
  const w = W.w, R0 = Math.max(6, c.r), flood = new Set(), q = [], depth = new Map();
  const x0 = Math.max(1, Math.floor(c.x - R0)), x1 = Math.min(w - 2, Math.ceil(c.x + R0)), y0 = Math.max(1, Math.floor(c.y - R0)), y1 = Math.min(W.h - 2, Math.ceil(c.y + R0));
  const sea = j => W.water[j] === 2 || (W.water[j] === 1 && W.biome[j] === B.SHALLOW);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * w + x;
    if (W.water[i] || W.elev[i] > 0.04 || (x - c.x) ** 2 + (y - c.y) ** 2 > R0 * R0 * 0.6) continue;
    if (sea(i - 1) || sea(i + 1) || sea(i - w) || sea(i + w)) { flood.add(i); depth.set(i, 1); q.push(i); }
  }
  for (let k = 0; k < q.length; k++) {
    const i = q[k], d = depth.get(i);
    if (d >= 4) continue;
    for (const j of [i - 1, i + 1, i - w, i + w]) {
      if (flood.has(j) || W.water[j] || W.elev[j] > 0.04) continue;
      flood.add(j); depth.set(j, d + 1); q.push(j);
    }
  }
  let crops = 0, houses = 0, dead = 0, worst = null;
  for (const i of flood) {
    if (W.occ[i] === 2 && W.stage[i]) { W.stage[i] = 0; crops++; }
    W.fert[i] = Math.max(0, W.fert[i] - 25); W.plant[i] = 0; dirty(i);
  }
  // the wind, worst near the eye
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * w + x, d2 = (x - c.x) ** 2 + (y - c.y) ** 2;
    if (W.tree[i] && d2 < R0 * R0 * 0.5 && rnd() < 0.5) { W.tree[i] = W.tree[i] >> 1; dirty(i); }
  }
  for (const t of W.towns) {
    const d2 = (t.x - c.x) ** 2 + (t.y - c.y) ** 2;
    if (d2 > R0 * R0) continue;
    const near = 1 - Math.sqrt(d2) / R0, before = tn(t);
    for (const b of t.blds.slice()) {
      if (b.type === 'hearth' || b.ruin) continue;
      const wet = flood.has(b.y * w + b.x), weak = b.type === 'house' && b.tier <= 3;
      const p = wet ? (b.type === 'house' && b.tier <= 4 ? 0.6 : 0.15) : weak ? 0.35 * near : 0.04 * near;
      if (rnd() < p) { removeBuilding(b); if (b.type === 'house') houses++; }
    }
    for (const p of t.members.slice()) {
      if (!p.alive) continue;
      if (flood.has(p.ti) ? rnd() < 0.15 : (p.st === 1 && rnd() < 0.015 * near)) { killPerson(p, flood.has(p.ti) ? 'drowned in the storm surge' : 'killed in the hurricane'); dead++; }
    }
    t.stock[R.FOOD] *= 1 - 0.25 * (0.4 + near); t.stock[R.WOOD] *= 0.9;
    if (!worst || before > tn(worst)) worst = t;
  }
  W.surges = W.surges || [];
  if (flood.size) W.surges.push({ tiles: [...flood], until: W.tick + Math.round(TPY * (0.25 + rnd() * 0.2)) });
  if (worst && tn(worst) + dead > 30) chronT('collapse', `A hurricane comes ashore at ${worst.name}${dead ? `: ${dead} dead` : ''}${houses ? `, ${houses} houses gone` : ''}${flood.size > 20 ? ', and the sea floods the low ground' : ''}${crops > 4 ? `, drowning ${crops} fields` : ''}.`, worst);
}
// The sea drains back off the low ground; until it does, nothing grows there.
function surgesTick() {
  const S = W.surges;
  for (let k = S.length - 1; k >= 0; k--) {
    const s = S[k];
    if (W.tick >= s.until) { for (const i of s.tiles) dirty(i); S.splice(k, 1); continue; }
    if (W.tick % 20 === 0) for (const i of s.tiles) if (W.occ[i] === 2 && W.stage[i]) { W.stage[i] = 0; dirty(i); }
  }
}
