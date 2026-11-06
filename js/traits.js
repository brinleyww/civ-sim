'use strict';
// Everyone is born different. Traits run in families, change what a person can do, and push the inventions they care about.

// hp, str, def, spd, life (lower lives longer), fert, sick (lower resists), work, wis (ideas), morale, lead (ruling and command).
// job: a kind of work they're noticeably better at. ideas: { tag: weight } kinds of invention they push forward.
const TRAITS = [
  { id: 'strong', name: 'Strong', kind: 'body', rare: 8, str: 1.3, work: 1.08, opp: 'weak', col: '#d8805a', about: 'Hits harder, hauls more.' },
  { id: 'weak', name: 'Weak', kind: 'body', rare: 6, str: 0.72, work: 0.9, opp: 'strong', col: '#9a8f80', about: 'Tires quickly and hits soft.' },
  { id: 'giant', name: 'Giant', kind: 'body', rare: 1, hp: 1.5, str: 1.5, spd: 0.9, opp: 'tiny', col: '#d8805a', about: 'Towers over everyone.' },
  { id: 'tiny', name: 'Tiny', kind: 'body', rare: 2, hp: 0.8, str: 0.8, spd: 1.08, opp: 'giant', col: '#9a8f80', about: 'Small, quick, hard to hit.' },
  { id: 'swift', name: 'Swift', kind: 'body', rare: 7, spd: 1.28, opp: 'lame', col: '#7fc6d8', about: 'Walks and runs faster.' },
  { id: 'lame', name: 'Lame', kind: 'body', rare: 4, spd: 0.68, work: 0.95, opp: 'swift', col: '#9a8f80', about: 'A bad leg slows every journey.' },
  { id: 'tough', name: 'Tough', kind: 'body', rare: 8, hp: 1.35, life: 0.85, opp: 'frail', col: '#c8a45a', about: 'Takes a lot of killing.' },
  { id: 'frail', name: 'Frail', kind: 'body', rare: 5, hp: 0.7, life: 1.3, opp: 'tough', col: '#9a8f80', about: 'Sickly since childhood.' },
  { id: 'longlived', name: 'Long-lived', kind: 'body', rare: 4, life: 0.55, opp: 'frail', col: '#a7d48a', about: 'Family members reach a great age.' },
  { id: 'hardy', name: 'Disease-hardy', kind: 'body', rare: 5, sick: 0.45, col: '#a7d48a', about: 'Shrugs off fevers.' },
  { id: 'fertile', name: 'Fertile', kind: 'body', rare: 8, fert: 1.5, opp: 'barren', col: '#e6a7c6', about: 'A big family, usually.' },
  { id: 'barren', name: 'Childless', kind: 'body', rare: 4, fert: 0.15, opp: 'fertile', col: '#9a8f80', about: 'Children never come.' },
  { id: 'keeneye', name: 'Eagle-eyed', kind: 'body', rare: 5, aim: 1.4, job: J.HUNT, jobM: 1.2, col: '#7fc6d8', about: 'Deadly with anything that flies.' },

  { id: 'clever', name: 'Clever', kind: 'mind', rare: 8, wis: 1.5, opp: 'dull', ideas: { lore: 0.5, math: 0.5 }, col: '#9fb9ee', about: 'Quick to see how things work.' },
  { id: 'dull', name: 'Dull', kind: 'mind', rare: 5, wis: 0.5, opp: 'clever', col: '#9a8f80', about: 'Does as they did yesterday.' },
  { id: 'genius', name: 'Genius', kind: 'mind', rare: 0.5, wis: 5, ideas: { lore: 4, math: 4, machine: 3, elec: 3, med: 2, sky: 2 }, opp: 'dull', job: J.SCHOLAR, jobM: 1.25, col: '#ffe28a', about: 'Comes along once in a generation. Ideas pour out.' },
  { id: 'curious', name: 'Curious', kind: 'mind', rare: 9, wis: 1.25, ideas: { nature: 0.5, sea: 0.3, sky: 0.3 }, col: '#9fb9ee', about: 'Asks why, and goes to look.' },
  { id: 'wise', name: 'Wise', kind: 'mind', rare: 4, lead: 1.3, wis: 1.2, ideas: { law: 1 }, col: '#9fb9ee', about: 'People come for advice.' },

  { id: 'greenthumb', name: 'Green-Thumbed', kind: 'talent', rare: 6, job: J.FARM, jobM: 1.3, ideas: { farm: 2 }, col: '#8cc66a', about: 'Better harvests; pushes farming inventions.' },
  { id: 'beastfriend', name: 'Beast-Friend', kind: 'talent', rare: 5, job: J.HERD, jobM: 1.3, ideas: { farm: 1, nature: 1 }, col: '#8cc66a', about: 'Animals follow them around.' },
  { id: 'woodwise', name: 'Woodwise', kind: 'talent', rare: 5, job: J.WOOD, jobM: 1.3, ideas: { build: 1, energy: 0.5 }, col: '#8cc66a', about: 'Reads a forest like a book.' },
  { id: 'gatherer', name: 'Plant-Wise', kind: 'talent', rare: 5, job: J.FORAGE, jobM: 1.3, ideas: { nature: 2, med: 0.5 }, col: '#8cc66a', about: 'Knows what grows where.' },
  { id: 'seaborn', name: 'Sea-Born', kind: 'talent', rare: 5, job: J.FISH, jobM: 1.3, ideas: { sea: 2.5 }, col: '#7fc6d8', about: 'Happier afloat; pushes boats and navigation.' },
  { id: 'stargazer', name: 'Stargazer', kind: 'talent', rare: 3, ideas: { sky: 3, sea: 0.5 }, job: J.SCHOLAR, jobM: 1.2, col: '#b69fee', about: 'Up all night counting stars.' },
  { id: 'metalwise', name: 'Metal-Wise', kind: 'talent', rare: 4, job: J.MINE, jobM: 1.25, ideas: { metal: 3 }, col: '#d8b45a', about: 'Sees what’s in the rock; pushes bronze, iron, steel.' },
  { id: 'tinkerer', name: 'Tinkerer', kind: 'talent', rare: 4, job: J.CRAFT, jobM: 1.3, ideas: { machine: 3, craft: 1.5, elec: 1 }, col: '#d8b45a', about: 'Can’t leave a machine alone.' },
  { id: 'mason', name: 'Master Builder', kind: 'talent', rare: 4, job: J.BUILD, jobM: 1.4, ideas: { build: 2.5, urban: 2 }, col: '#d8b45a', about: 'Builds fast and well; pushes construction and city life.' },
  { id: 'healer', name: 'Healer', kind: 'talent', rare: 4, job: J.SERVICE, jobM: 1.2, ideas: { med: 3.5 }, sick: 0.8, col: '#a7d48a', about: 'Saves lives; pushes medicine.' },
  { id: 'merchantborn', name: 'Silver-Tongued', kind: 'talent', rare: 5, job: J.TRADE, jobM: 1.3, ideas: { trade: 2.5, law: 0.5 }, lead: 1.15, col: '#e6c170', about: 'Could sell sand in a desert.' },
  { id: 'numbers', name: 'Numbers Mind', kind: 'talent', rare: 3, ideas: { math: 3.5, trade: 0.7 }, job: J.SCHOLAR, jobM: 1.2, col: '#9fb9ee', about: 'Sums come easy; pushes mathematics and computing.' },
  { id: 'lawgiver', name: 'Lawgiver', kind: 'talent', rare: 2, lead: 1.25, ideas: { law: 3 }, col: '#9fb9ee', about: 'Born to write the rules.' },
  { id: 'firemaker', name: 'Fire-Touched', kind: 'talent', rare: 3, ideas: { energy: 3, metal: 1, war: 0.5 }, col: '#e0705a', about: 'Fascinated by what burns.' },
  { id: 'warsmith', name: 'Weaponsmith', kind: 'talent', rare: 3, job: J.CRAFT, jobM: 1.15, ideas: { war: 3.5, metal: 1 }, col: '#e0705a', about: 'Always thinking of a better blade.' },

  { id: 'brave', name: 'Brave', kind: 'heart', rare: 8, morale: 1.4, str: 1.08, opp: 'coward', col: '#e0705a', about: 'First up the ladder.' },
  { id: 'coward', name: 'Coward', kind: 'heart', rare: 5, morale: 0.55, spd: 1.05, opp: 'brave', col: '#9a8f80', about: 'First off the field.' },
  { id: 'warlike', name: 'Warlike', kind: 'heart', rare: 6, str: 1.18, war: 1.6, ideas: { war: 1.5 }, opp: 'peaceful', col: '#e0705a', about: 'A ruler like this looks for wars.' },
  { id: 'peaceful', name: 'Peaceful', kind: 'heart', rare: 6, str: 0.85, war: 0.5, lead: 1.05, opp: 'warlike', col: '#a7d48a', about: 'Makes treaties, not widows.' },
  { id: 'cruel', name: 'Cruel', kind: 'heart', rare: 3, str: 1.12, war: 1.3, lead: 0.8, opp: 'kind', col: '#c14b4b', about: 'Feared, not loved.' },
  { id: 'kind', name: 'Kind', kind: 'heart', rare: 7, lead: 1.15, opp: 'cruel', col: '#a7d48a', about: 'People forgive them a lot.' },
  { id: 'greedy', name: 'Greedy', kind: 'heart', rare: 5, ideas: { trade: 0.7 }, war: 1.15, lead: 0.92, col: '#e6c170', about: 'Never enough.' },
  { id: 'ambitious', name: 'Ambitious', kind: 'heart', rare: 5, lead: 1.1, war: 1.2, col: '#e6c170', about: 'Wants more, and will take it.' },
  { id: 'pious', name: 'Pious', kind: 'heart', rare: 8, ideas: { lore: 0.5 }, faith: 1, job: J.SERVICE, jobM: 1.1, col: '#c6b8e6', about: 'Devout, and happy in it.' },
  { id: 'charismatic', name: 'Charismatic', kind: 'heart', rare: 3, lead: 1.5, morale: 1.15, col: '#ffe28a', about: 'People follow them without quite knowing why.' },
  { id: 'lazy', name: 'Lazy', kind: 'heart', rare: 6, work: 0.8, opp: 'diligent', col: '#9a8f80', about: 'Works when watched.' },
  { id: 'diligent', name: 'Diligent', kind: 'heart', rare: 7, work: 1.15, opp: 'lazy', col: '#c8a45a', about: 'Up before the bell.' },
  { id: 'wanderer', name: 'Wanderer', kind: 'heart', rare: 4, spd: 1.1, ideas: { sea: 0.5, trade: 0.5 }, col: '#7fc6d8', about: 'Happiest somewhere new.' },
  { id: 'lucky', name: 'Lucky', kind: 'heart', rare: 2, life: 0.8, hp: 1.15, col: '#ffe28a', about: 'Arrows just seem to miss.' },
  { id: 'cursed', name: 'Unlucky', kind: 'heart', rare: 2, life: 1.2, opp: 'lucky', col: '#9a8f80', about: 'Roofs fall on this one.' },

  // Earned, never born with.
  { id: 'veteran', name: 'Veteran', kind: 'earned', rare: 0, str: 1.2, hp: 1.1, morale: 1.2, col: '#c8a45a', about: 'Has seen battle and lived.' },
  { id: 'warhero', name: 'War Hero', kind: 'earned', rare: 0, str: 1.3, hp: 1.15, morale: 1.5, lead: 1.2, col: '#ffe28a', about: 'Songs are sung about this one.' },
  { id: 'scarred', name: 'Scarred', kind: 'earned', rare: 0, hp: 0.9, work: 0.95, col: '#9a8f80', about: 'Badly wounded and never quite the same.' },
  { id: 'survivor', name: 'Plague Survivor', kind: 'earned', rare: 0, sick: 0.3, col: '#a7d48a', about: 'Lived through it. Probably immune now.' },
  { id: 'inventor', name: 'Renowned Inventor', kind: 'earned', rare: 0, wis: 1.4, lead: 1.1, col: '#ffe28a', about: 'Their discovery changed things.' },
];
const TRAIT_IX = {}; TRAITS.forEach((T, i) => { T.ix = i; TRAIT_IX[T.id] = i; });
const BORN_TRAITS = TRAITS.filter(T => T.rare > 0);
const BORN_TOTAL = BORN_TRAITS.reduce((s, T) => s + T.rare, 0);
const IDEA_TAGS = TRAITS.map(T => T.ideas ? Object.entries(T.ideas).map(([k, v]) => [TAG_IX[k], v]) : null);
const hasTrait = (p, id) => p.traits.includes(TRAIT_IX[id]);
function randomTrait() {
  let v = rnd() * BORN_TOTAL;
  for (const T of BORN_TRAITS) { v -= T.rare; if (v <= 0) return T.ix; }
  return BORN_TRAITS[0].ix;
}
function canHave(list, ix) {
  if (list.includes(ix)) return false;
  const T = TRAITS[ix];
  for (const k of list) { const o = TRAITS[k]; if (o.opp === T.id || T.opp === o.id) return false; }
  return true;
}
// Half of what a parent has tends to come down to the child; a little is new.
function inheritTraits(p, mom, dad) {
  const out = [];
  for (const par of [mom, dad]) {
    if (!par) continue;
    for (const k of par.traits) if (TRAITS[k].kind !== 'earned' && rnd() < (TRAITS[k].rare < 1 ? 0.08 : 0.32) && canHave(out, k)) out.push(k);
  }
  const fresh = out.length ? (rnd() < 0.45 ? 1 : 0) : 1 + (rnd() < 0.5 ? 1 : 0);
  for (let k = 0; k < fresh; k++) { const v = randomTrait(); if (canHave(out, v)) out.push(v); }
  while (out.length > 4) out.splice(rint(out.length), 1);
  p.traits = out;
  applyTraits(p);
}
function applyTraits(p) {
  let hp = 1, str = 1, spd = 1, life = 1, fert = 1, sick = 1, work = 1, wis = 1, morale = 1, lead = 1, war = 1, aim = 1, jb = 0, jbM = 1;
  for (const k of p.traits) {
    const T = TRAITS[k];
    if (T.hp) hp *= T.hp; if (T.str) str *= T.str; if (T.spd) spd *= T.spd; if (T.life) life *= T.life; if (T.fert) fert *= T.fert;
    if (T.sick) sick *= T.sick; if (T.work) work *= T.work; if (T.wis) wis *= T.wis; if (T.morale) morale *= T.morale; if (T.lead) lead *= T.lead;
    if (T.war) war *= T.war; if (T.aim) aim *= T.aim;
    if (T.job && T.jobM > jbM) { jb = T.job; jbM = T.jobM; }
  }
  p.hpMax = Math.round(100 * hp); p.str = str; p.spdM = spd; p.lifeM = life; p.fertM = fert; p.sickM = sick; p.workM = work; p.wisM = wis; p.moraleM = morale; p.leadM = lead; p.warM = war; p.aimM = aim; p.jb = jb; p.jbM = jbM;
  if (p.statOv) for (const k in p.statOv) p[k] = p.statOv[k];  // what the player set in the person editor wins
}
function addTrait(p, id) {
  const k = TRAIT_IX[id];
  if (p.traits.includes(k)) return false;
  p.traits.push(k);
  applyTraits(p);
  return true;
}
// How much a worker gets done: their build, their temper, and any knack for this job.
const workRate = (p, j) => p.workM * (p.jb === j ? p.jbM : 1);
// Forced on by the observer or the person editor: whatever it can't sit beside goes.
function forceTrait(p, id) {
  const T = TRAITS[TRAIT_IX[id]];
  p.traits = p.traits.filter(k => { const o = TRAITS[k]; return o.id !== id && o.opp !== id && T.opp !== o.id; });
  p.traits.push(T.ix);
  applyTraits(p);
}
function dropTrait(p, id) { const k = p.traits.indexOf(TRAIT_IX[id]); if (k >= 0) { p.traits.splice(k, 1); applyTraits(p); } }

// ---- the observer's blessings and curses: t.boon = { kind: last year it holds }. Old saves have none, and nothing else needs it ----
const BOON = {
  bless: { farm: 1.25, health: 0.82, birth: 1.3, happy: 10, name: 'Blessed', col: '#ffe28a' },
  curse: { farm: 0.75, health: 1.2, birth: 0.7, happy: -10, name: 'Cursed', col: '#b59ad8' },
  plenty: { farm: 1.35, name: 'Years of plenty', col: '#a7d48a' },
  want: { farm: 0.55, name: 'Years of want', col: '#e0a070' },
};
const BOON_OPP = { bless: 'curse', curse: 'bless', plenty: 'want', want: 'plenty' };
function giveBoon(t, k, yrs) {
  const b = t.boon || (t.boon = {});
  delete b[BOON_OPP[k]];
  b[k] = Math.max(b[k] || 0, Math.floor(year()) + yrs - 1);  // holds through that year
  recomputeMods(t);
}
const boonLeft = (t, k) => t.boon && t.boon[k] !== undefined ? Math.max(0, t.boon[k] - Math.floor(year()) + 1) : 0;
// From recomputeMods: plain scales, nothing compounds.
function powerFx(t, m) {
  for (const k in t.boon) {
    const X = BOON[k];
    if (!X) continue;
    if (X.farm) m.farm *= X.farm; if (X.health) m.health *= X.health; if (X.birth) m.birth *= X.birth; if (X.happy) m.happy += X.happy;
  }
}
// Once a year per town, from townYear.
function powersYear(t) {
  const b = t.boon, yr = Math.floor(year());
  if (b) {
    let gone = false;
    for (const k in b) {
      if (b[k] >= yr) continue;
      delete b[k]; gone = true;
      if ((k === 'bless' || k === 'curse') && tn(t) > 15) chronT('misc', k === 'bless' ? `The blessing on ${t.name} fades. Its people still talk about the good years.` : `The curse on ${t.name} lifts at last.`, t);
    }
    if (gone) { if (!Object.keys(b).length) t.boon = null; recomputeMods(t); }
    const n = tn(t);
    if (b.bless >= yr) { t.famine = 0; if (t.stock[R.FOOD] < n * 2) t.stock[R.FOOD] += n * 1.2; t.unrest *= 0.6; }
    if (b.curse >= yr) { t.unrest = Math.min(100, t.unrest + 5); t.stock[R.FOOD] *= 0.9; }
    if (b.want >= yr) t.stock[R.FOOD] *= 0.85;
  }
  if (W.genii && W.genii.length) geniusYear(t);
}
// A genius the observer made works the town's open problems every year they live: a fifth of an idea's cost a year, and the credit when it comes.
const GENIUS_PUSH = 0.2;
function geniusYear(t) {
  const G = W.genii;
  for (let k = G.length - 1; k >= 0; k--) {
    const p = G[k];
    if (!p.alive || !hasTrait(p, 'genius')) { G.splice(k, 1); continue; }
    if (p.town !== t || p.army || ageOf(p) < 14) continue;
    let T = p.gWork >= 0 ? TECHS[p.gWork] : null;
    if (!T || t.tech[T.ix] || !eligible(t, T)) T = geniusPick(t);
    if (!T) { p.gWork = -1; continue; }
    p.gWork = T.ix;
    const cost = inventCost(t, T);
    t.prog[T.ix] += cost * GENIUS_PUSH * (ageOf(p) > 62 ? 0.5 : 1);
    if (t.prog[T.ix] < cost) continue;
    const first = !W.firsts[T.id];
    t._who = p; discover(t, T); t._who = null;
    p.gWork = -1; p.gN = (p.gN || 0) + 1;
    if (first && typeof toast === 'function') toast(`${p.name} of ${t.name} works out ${T.name}.`);
  }
}
function geniusPick(t) {
  const F = techCache(t).front, I = IDEA_TAGS[TRAIT_IX.genius];
  let best = null, bs = -1;
  for (let k = 0; k < F.length; k++) {
    const T = TECHS[F[k]];
    if (t.tech[T.ix] || (T.cond && !T.cond(t))) continue;
    let s = t.prog[T.ix] / inventCost(t, T) + rnd() * 0.3 + (W.firsts[T.id] ? 0 : 0.6);  // the unknown to everyone, by choice
    for (let e = 0; e < I.length; e++) if (I[e][0] === T.tagI) s += I[e][1] * 0.08;
    if (s > bs) { bs = s; best = T; }
  }
  return best;
}
