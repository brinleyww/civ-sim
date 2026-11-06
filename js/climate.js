'use strict';
// Peoples and the land they come from. Every town has a home climate, a mix of seven kinds of country, that it starts with from
// the people who founded it and slowly takes on from where it really is, over a few generations. A host carries its home town's
// climate on campaign: away from it the winter, the sand, the fevers and the heights kill more and fight it worse, and a people at
// home in its own country barely notices them. Regional gear (techfam_d.js) closes some of the gap, but only people who live in
// that country work it out; an invader gets it by holding such land.
const CLIM_N = 7, CL_COLD = 0, CL_TEMP = 1, CL_DESERT = 2, CL_JUNGLE = 3, CL_STEPPE = 4, CL_MOUNT = 5, CL_SEA = 6;
const CLIM_NAME = ['cold country', 'temperate lands', 'desert', 'jungle', 'steppe', 'highlands', 'sea coast'];
const CLIM_COND = ['Lives in cold country', 'Lives in temperate lands', 'Lives in the desert', 'Lives in the jungle', 'Lives on the steppe', 'Lives in the highlands', 'Lives on a sea coast'];
const CLIM_HERE = ['winter cold', '', 'heat and thirst', 'jungle', 'open steppe', 'mountains', ''];
// older inventions that count as gear for a kind of country too (only ones that need that country: camels and mules go everywhere)
const CLIM_OLD = [[], [], [], ['quinine'], [], [], []];
const CLIM_TECHS = [[], [], [], [], [], [], []];
const _ct = new Float32Array(CLIM_N), _cs = new Float32Array(CLIM_N);
// What kind of country one tile is: each kind 0..1. The sea coast is a town's, not a tile's.
function climAt(i, o) {
  const T = W.temp[i], m = W.moist[i], b = W.biome[i], e = Math.max(0, W.elev[i]);
  o[CL_COLD] = clamp((0.55 - T) / 0.25, 0, 1);
  o[CL_DESERT] = b === B.DESERT ? 1 : clamp((0.24 - m) / 0.1, 0, 1) * clamp((T - 0.45) / 0.15, 0, 1);
  o[CL_JUNGLE] = b === B.JUNGLE ? 1 : b === B.MARSH && T > 0.6 ? 0.7 : clamp((T - 0.62) / 0.12, 0, 1) * clamp((m - 0.6) / 0.15, 0, 1);
  o[CL_STEPPE] = b === B.STEPPE ? 1 : b === B.SAVANNA ? 0.75 : b === B.GRASS ? 0.45 : 0;
  o[CL_MOUNT] = b === B.ROCK || b === B.SNOW ? 1 : clamp((e - 0.28) / 0.2, 0, 1);
  o[CL_SEA] = 0;
  o[CL_TEMP] = clamp(1 - o[CL_COLD] - o[CL_DESERT] - o[CL_JUNGLE] - clamp((T - 0.7) / 0.12, 0, 1), 0, 1);
  return o;
}
// A town's own country: the ground round about, and the sea if it lives by it.
function nativeClim(t) {
  const h = new Array(CLIM_N).fill(0), w = W.w, x0 = t.i % w, y0 = (t.i / w) | 0;
  let c = 0;
  for (let dy = -4; dy <= 4; dy += 4) for (let dx = -4; dx <= 4; dx += 4) {
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= w || y >= W.h || W.water[y * w + x]) continue;
    climAt(y * w + x, _ct); c++;
    for (let k = 0; k < CLIM_N; k++) h[k] += _ct[k];
  }
  if (!c) { climAt(t.i, _ct); c = 1; for (let k = 0; k < CLIM_N; k++) h[k] = _ct[k]; }
  for (let k = 0; k < CLIM_N; k++) h[k] = Math.round(h[k] / c * 1000) / 1000;
  h[CL_SEA] = t.near ? clamp((t.near.coast - 20) / 200, 0, 1) : 0;  // a little salt water in reach is not a sea people
  return h;
}
// Lazily made (old saves have none) and moved a little towards the real country once a year.
const HC_RATE = 0.025;
function homeClim(t) {
  let h = t.hc;
  const y = Math.floor(W.tick / TPY);
  if (h && t.hcY === y) return h;
  const nat = nativeClim(t), c = t.culture;
  if (!h || h.length !== CLIM_N) {
    // a young town is still its founders' people; an old one has long been at home here
    h = t.hc = c && c.hc && year() - (t.founded || 0) < 40 ? c.hc.slice() : nat;
    t.hcY = y;
    if (c && !c.hc) c.hc = h.slice();
    return h;
  }
  const f = 1 - Math.pow(1 - HC_RATE, Math.min(200, y - (t.hcY || 0)));
  for (let k = 0; k < CLIM_N; k++) h[k] = Math.round((h[k] + (nat[k] - h[k]) * f) * 1000) / 1000;
  t.hcY = y;
  // a people's climate is where most of it lives
  if (c) { if (!c.hc) c.hc = h.slice(); else for (let k = 0; k < CLIM_N; k++) c.hc[k] = Math.round((c.hc[k] + (h[k] - c.hc[k]) * 0.03) * 1000) / 1000; }
  return h;
}
// What land a realm holds, as a bit per kind of country, worked out for every realm at once once a year.
let HC_POLY = -1;
const HC_MASK = new Map();
function realmClim(pol) {
  const y = Math.floor(W.tick / TPY);
  if (HC_POLY !== y) {
    HC_POLY = y; HC_MASK.clear();
    for (const o of W.towns) {
      if (!o.alive || !o.polity) continue;
      const h = homeClim(o);
      let m = HC_MASK.get(o.polity.id) || 0;
      for (let k = 0; k < CLIM_N; k++) if (h[k] >= 0.35) m |= 1 << k;
      HC_MASK.set(o.polity.id, m);
    }
  }
  return pol ? HC_MASK.get(pol.id) || 0 : 0;
}
const climOK = (t, k) => homeClim(t)[k] >= 0.35 || !!(realmClim(t.polity) & (1 << k));
// The regional gear a town knows, 0..0.5 per kind of country; counted again every half year or when its knowledge changes.
const HC_GEAR = new WeakMap();
function climGear(t) {
  let e = HC_GEAR.get(t);
  if (e && e.tech === t.tech && W.tick - e.t < 120) return e.g;
  if (!e) { e = { g: new Float32Array(CLIM_N), t: 0, tech: null }; HC_GEAR.set(t, e); }
  e.t = W.tick; e.tech = t.tech;
  const tech = t.tech;
  for (let k = 0; k < CLIM_N; k++) {
    const L = CLIM_TECHS[k];
    let n = 0;
    for (let q = 0; q < L.length; q++) if (tech[L[q]]) n++;
    e.g[k] = 0.5 * (1 - Math.exp(-n / 8));
  }
  return e.g;
}
// How used to a kind of country a town's people are: born to it, or kitted out for it. 0..0.95.
const climAdapt = (t, k) => t ? Math.min(0.95, homeClim(t)[k] * 0.85 + climGear(t)[k]) : 0;
// How hard the country here is on people right now: winter cold, heat and thirst, jungle, height. The steppe slot is open ground.
function stressAt(i, y, o) {
  climAt(i, _ct);
  const s = seasonAt(y), T = W.temp[i];
  o[CL_COLD] = clamp((0.5 - T) / 0.2, 0, 1.5) * (s < -0.03 ? clamp((-s - 0.03) / 0.08, 0, 1) : 0) + (T < 0.2 ? 0.3 : 0);
  o[CL_TEMP] = 0;
  o[CL_DESERT] = _ct[CL_DESERT] * (s > 0.04 ? 1.2 : 0.8);
  o[CL_JUNGLE] = _ct[CL_JUNGLE];
  o[CL_STEPPE] = _ct[CL_STEPPE];
  o[CL_MOUNT] = _ct[CL_MOUNT];
  o[CL_SEA] = 0;
  return o;
}
const CL_HARSH = [CL_COLD, CL_DESERT, CL_JUNGLE, CL_MOUNT];
// how unsuited people from town t are to the country under them: 0 is at home, about 1 is a hard country they have never known
function climUnsuit(t, st) {
  let u = 0;
  for (const k of CL_HARSH) if (st[k] > 0) u += st[k] * Math.pow(1 - climAdapt(t, k), 1.5);
  return Math.min(u, 1.5);
}
// ---- on campaign ----
// Deaths of the road, as many as the rate says (not one at a time), and never the general.
function climKill(army, x, cause, k) {
  const S0 = army.soldiers;
  if (x <= 0 || !S0.length) return 0;
  let n = Math.floor(x) + (rnd() < x % 1 ? 1 : 0);
  n = Math.min(n, Math.max(1, Math.ceil(S0.length * 0.012)));
  let d = 0;
  for (let q = 0; q < n && S0.length; q++) { const v = S0[rint(S0.length)]; if (!v || v === army.general) continue; campDeath(army, v, cause); d++; }
  if (d) { army.climDead = (army.climDead || 0) + d * (army.rep || 1); army.climK = k; }
  return d;
}
// The frost, the thirst, the fevers and the heights, every time the host is looked at (war.js armyAttrition). The old rates are
// for a host that is half used to the country; locals hardly suffer, strangers to it twice as much.
function climAttrition(army, i, m) {
  const S0 = army.soldiers, n = S0.length, home = army.home;
  if (!n || !home) return;
  const base = n * 20 / TPY, st = stressAt(i, army.y, _cs), hard = k => 0.05 + 1.75 * Math.pow(1 - climAdapt(home, k), 1.5);
  if (seasonAt(army.y) < -0.07 && W.temp[i] < 0.5 && !m.car) climKill(army, base * 0.1 * clamp((0.5 - W.temp[i]) / 0.2, 0.3, 1.5) * hard(CL_COLD) * (army.camp ? 0.6 : 1), army.camp ? 'froze in winter quarters' : 'froze on the march', CL_COLD);
  if (W.biome[i] === B.DESERT && !m.car && !W.river[i]) climKill(army, base * 0.08 * hard(CL_DESERT), 'died of thirst on the march', CL_DESERT);
  if (st[CL_JUNGLE] > 0.4) climKill(army, base * 0.05 * st[CL_JUNGLE] * hard(CL_JUNGLE) * Math.sqrt(m.health), 'died of fever in the jungle', CL_JUNGLE);
  if (st[CL_MOUNT] > 0.5 && !m.car) climKill(army, base * 0.025 * st[CL_MOUNT] * hard(CL_MOUNT), 'died in the mountains', CL_MOUNT);
  // a country that is wrong for them wears down the spirit as well as the body
  const u = climUnsuit(home, st);
  if (u > 0.25) army.morale = Math.max(0, army.morale - (u - 0.25) * 0.6);
  climBroken(army);
}
// When the country has done more to a host than the enemy: say so, and what is left turns back.
const CL_BREAK = [
  (a, d, tg) => `Winter breaks the ${a.name}: ${d} of its men have frozen on the road${tg ? ' to ' + tg.name : ''}, in a country whose own people hardly feel the cold.`, null,
  (a, d, tg) => `The desert breaks the ${a.name}: ${d} of its men have died of heat and thirst${tg ? ' on the way to ' + tg.name : ''}.`,
  (a, d, tg) => `Fever and the forest break the ${a.name}: ${d} of its men have died in the jungle${tg ? ' before ' + tg.name : ''}.`, null,
  (a, d, tg) => `The mountains break the ${a.name}: ${d} of its men lost to cold, thin air and the drop${tg ? ' on the road to ' + tg.name : ''}.`, null];
function climBroken(army) {
  const d = army.climDead || 0;
  if (army.saidClim || d < 40 || army.goal === 'garrison' || army.militia || army.battle) return;
  if (d < (menOf(army) + d) * 0.2 || !CL_BREAK[army.climK || 0]) return;
  army.saidClim = 1;
  army.morale = Math.max(0, army.morale - 10);
  const tg = army.target && army.target.polity !== army.pol ? army.target : null;
  const back = (army.goal === 'conquer' || army.goal === 'intercept' || army.goal === 'liberate') && retreatArmy(army);
  chronT('war', CL_BREAK[army.climK || 0](army, d, tg) + (back ? ' What is left turns back.' : ''), army.home);
  if (army.war) army.war.climBroke = (army.war.climBroke || 0) + 1;
}
// A host born to the cold keeps campaigning through a winter that sends everyone else into quarters.
const winterReady = t => climAdapt(t, CL_COLD) >= 0.6;
// Hills, forest and deep snow slow strangers to them more than locals (war.js march budget).
function climPace(army) {
  const home = army.home;
  if (!home) return 1;
  const i = Math.round(army.y) * W.w + Math.round(army.x), st = stressAt(i, army.y, _cs);
  return clamp(1 - st[CL_MOUNT] * 0.3 * (1 - climAdapt(home, CL_MOUNT)) - st[CL_JUNGLE] * 0.25 * (1 - climAdapt(home, CL_JUNGLE)) - Math.min(st[CL_COLD], 1) * 0.15 * (1 - climAdapt(home, CL_COLD)), 0.6, 1);
}
// Sea peoples and marines land in good order; landlubbers pay for every yard of beach (war.js landings).
const landMul = army => army.home ? 1 - 0.6 * climAdapt(army.home, CL_SEA) : 1;
// A cold country fights an invasion by giving ground: it burns the land ahead of a host that is not ready for its winter, and lets
// the winter do the rest. Called from war.js warPlan when a host marches on one of its towns.
function coldRetreat(tt, a) {
  if (!a.home || W.temp[tt.i] > 0.48 || seasonAt(tt.y) > 0.04) return false;
  return climAdapt(tt, CL_COLD) >= 0.55 && climAdapt(a.home, CL_COLD) < 0.45 && rnd() < 0.5;
}
function burnAhead(tt, a) {
  const pol = tt.polity;
  let n = 0;
  for (const o of W.towns) {
    if (n >= 2 || o === tt || o.polity !== pol || !o.alive || o.scorched > W.tick || (o.x - a.x) ** 2 + (o.y - a.y) ** 2 > 900) continue;
    o.scorched = W.tick + TPY;
    for (const f of o.fields) if (W.stage[f.i] && rnd() < 0.4) { W.stage[f.i] = 0; dirty(f.i); }
    o.stock[R.FOOD] *= 0.9; o.unrest = Math.min(100, (o.unrest || 0) + 4); n++;
  }
  if (menOf(a) >= 60) chronT('war', `${pol.name} falls back before the ${a.name}, burning the country as it goes, and leaves the winter to fight it.`, tt);
}
// A careful defender at home in its own winter will not give battle to a host that is not, but harries it instead (war.js encounter).
function winterWait(army, o) {
  if (!army.home || !o.home || army.home.polity !== army.pol) return false;
  const i = Math.round(army.y) * W.w + Math.round(army.x), own = W.owner[i] >= 0 ? W.townById[W.owner[i]] : null;
  return !!own && own.polity === army.pol && seasonAt(army.y) < -0.03 && W.temp[i] < 0.48 && winterReady(army.home) && climAdapt(o.home, CL_COLD) < 0.45;
}
// ---- in battle ----
// Each side's fighting strength for the country the battle is in (battle.js strike uses S.cf, and S.cfH for riders), set when the
// battle starts or a host joins it; the soldiers' spirits move with it once per host.
function climSide(S, B) {
  const t = S.home;
  if (!t || !t.tech) { S.cf = 1; S.cfH = 1; return; }
  const i = Math.round(B.y) * W.w + Math.round(B.x), st = stressAt(i, B.y, _cs), h = homeClim(t);
  let f = 1 - 0.16 * climUnsuit(t, st);
  // on their own ground the paths, the people and the country are theirs
  const own = W.owner[i] >= 0 ? W.townById[W.owner[i]] : null, home = !!own && own.polity === S.pol;
  if (home) f += 0.05;
  // and those born to a hard country fight best in it: highlanders on slopes, forest folk under cover, desert and cold peoples in theirs
  if (st[CL_MOUNT] > 0.3) f += 0.06 * h[CL_MOUNT] * Math.min(st[CL_MOUNT], 1);
  if (st[CL_JUNGLE] > 0.3 || W.tree[i] > 2) f += 0.05 * h[CL_JUNGLE];
  if (st[CL_DESERT] > 0.3) f += 0.04 * h[CL_DESERT];
  if (st[CL_COLD] > 0.3) f += 0.05 * h[CL_COLD];
  S.cf = clamp(f, 0.75, 1.15);
  // riders of the steppe on open grass
  S.cfH = st[CL_STEPPE] > 0.4 && W.tree[i] <= 2 ? 1 + 0.18 * Math.min(1, h[CL_STEPPE] + climGear(t)[CL_STEPPE]) : 1;
  const dm = (S.cf - 1) * 50;
  let fresh = false;
  for (const a of S.armies) if (a.cfB !== B.id) { a.cfB = B.id; fresh = true; for (const p of a.soldiers) p.mor = clamp(p.mor + dm, 10, 100); }
  if (!fresh) return;
  S.morale = clamp(S.morale + dm * 0.5, 0, 100);
  if (S.men0 < 20) return;
  if (S.cf < 0.9) bNote(B, `The ${CLIM_HERE[CL_HARSH.reduce((b, k) => st[k] * (1 - climAdapt(t, k)) > st[b] * (1 - climAdapt(t, b)) ? k : b, CL_COLD)] || 'country'} tells on ${S.pol.name}`, S.x, S.y, S.pol.color);
  else if (S.cf > 1.07) bNote(B, home ? `${S.pol.name} fights on home ground` : `${S.pol.name} knows this country`, S.x, S.y, S.pol.color);
}
// ---- words for the panels ----
function climList(h) {
  const L = [];
  for (let k = 0; k < CL_SEA; k++) if (h[k] >= 0.4 && k !== CL_TEMP) L.push([h[k], k]);
  L.sort((a, b) => b[0] - a[0]);
  return (L.length ? L.slice(0, 2).map(e => CLIM_NAME[e[1]]).join(' and ') : CLIM_NAME[CL_TEMP]) + (h[CL_SEA] >= 0.5 ? ' by the sea' : '');
}
const homeClimText = t => t ? 'Home climate: ' + climList(homeClim(t)) + '.' : '';
const cultureClimText = c => c && c.hc ? climList(c.hc) : '';
// For the army panel (ui.js): where its people come from, the country it is in, and how well they cope.
function armyClimateText(a) {
  const t = a && a.home;
  if (!t || !W) return '';
  const i = Math.round(a.y) * W.w + Math.round(a.x), st = stressAt(i, a.y, _cs), here = [];
  for (const k of CL_HARSH) {
    if (st[k] < 0.3) continue;
    const ad = climAdapt(t, k);
    here.push(`${CLIM_HERE[k]} (${ad >= 0.6 ? 'well suited' : ad >= 0.3 ? 'half used to it' : 'unsuited'})`);
  }
  const u = climUnsuit(t, st), g = climGear(t);
  let gear = 0;
  for (const k of CL_HARSH) if (g[k] > 0.05) gear++;
  return `${homeClimText(t)} Here: ${here.length ? here.join(', ') : 'easy country'}.` + (u > 0.25 ? ` Fights at ${Math.round((1 - 0.16 * u) * 100)}%.` : '') + (gear ? ` Has gear for ${gear} hard ${gear > 1 ? 'kinds' : 'kind'} of country.` : '');
}
// ---- the regional inventions: only towns living in that country, or realms holding some, can work them out or learn them ----
(function () {
  const fam = {};
  for (const F of GEN_FAMILIES) if (F.cl !== undefined) fam[F.k] = F.cl;
  for (const T of TECHS) {
    const m = /^g_([a-z]+)\d+_\d+$/.exec(T.id);
    if (!m || fam[m[1]] === undefined) continue;
    const k = fam[m[1]];
    T.cond = t => climOK(t, k); T.condText = CLIM_COND[k] + ', or holds land there'; T.clim = k;
    CLIM_TECHS[k].push(T.ix);
  }
  CLIM_OLD.forEach((L, k) => { for (const id of L) if (TECH_IX[id] !== undefined) CLIM_TECHS[k].push(TECH_IX[id]); });
})();
