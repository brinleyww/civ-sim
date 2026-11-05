'use strict';
// War on the map: why realms fight, what they want from it, how armies are raised, fed and moved, and how it ends. What happens when armies meet is in battle.js.

const atWar = (a, b) => !!a.warsWith[b.id];
function shot(x0, y0, x1, y1, kind) {
  const S0 = W.shots;
  if (S0.length > 260) S0.shift();
  S0.push({ x0, y0, x1, y1, t: W.tick, kind });
}

// ---- arms: a town forges a mix of blades, polearms and missiles, the best of each it can pay for ----
function armsWanted(t) {
  const n = tn(t);
  const inWar = Object.keys(t.polity.warsWith).length > 0;
  return Math.ceil((n * 0.1 + 2) * (inWar ? 2.2 : 1) * (govSt(t.polity) >= 2 ? 1 : 0.3));
}
function totalArms(t) { let s = 0; for (let k = 1; k < WEAPONS.length; k++) s += t.arsenal[k]; return s; }
function totalArmor(t) { let s = 0; for (let k = 1; k < ARMORS.length; k++) s += t.armor[k]; return s; }
const ROLE_MIX = { melee: 0.42, pole: 0.2, ranged: 0.38 };
function forge(t, power) {
  const want = armsWanted(t);
  let made = false;
  if (totalArms(t) < want) {
    const have = { melee: 0, pole: 0, ranged: 0 };
    for (let k = 1; k < WEAPONS.length; k++) { const r = WEAPONS[k].role; if (have[r] !== undefined) have[r] += t.arsenal[k]; }
    const sum = have.melee + have.pole + have.ranged + 1;
    const roles = Object.keys(ROLE_MIX).sort((a, b) => (have[a] / sum - ROLE_MIX[a]) - (have[b] / sum - ROLE_MIX[b]));
    outer: for (const role of roles) {
      for (let k = WEAPONS.length - 1; k >= 1; k--) {
        const w = WEAPONS[k];
        if (w.role !== role || (w.techI >= 0 && !t.tech[w.techI]) || !canPay(t.stock, w.cost)) continue;
        pay(t.stock, w.cost);
        t.arsenal[k] += power;
        made = true;
        break outer;
      }
    }
  }
  if (totalArmor(t) < want * 0.8) {
    for (let k = ARMORS.length - 1; k >= 1; k--) {
      const a = ARMORS[k];
      if ((a.techI >= 0 && !t.tech[a.techI]) || !canPay(t.stock, a.cost)) continue;
      pay(t.stock, a.cost);
      t.armor[k] += power;
      made = true;
      break;
    }
  }
  if (t.count.tankworks && t.tanks < want * 0.08 && t.stock[R.STEEL] >= 8 && t.stock[R.OIL] >= 2) { t.stock[R.STEEL] -= 8; t.stock[R.OIL] -= 2; t.tanks++; made = true; }
  return made;
}
// Who gets what: sharp eyes get a missile weapon, the strong a blade, and everyone else takes what's in the rack.
function issueGear(p, t) {
  const roleWanted = p.aimM > 1.15 ? 'ranged' : p.str > 1.2 ? 'melee' : null;
  let w = 0;
  if (roleWanted) for (let k = WEAPONS.length - 1; k >= 1; k--) if (t.arsenal[k] >= 1 && WEAPONS[k].role === roleWanted) { w = k; break; }
  if (!w) {
    // no favourites left: spread them out by what's most plentiful among the best kinds
    let best = 0, bs = 0;
    for (let k = WEAPONS.length - 1; k >= 1; k--) { if (t.arsenal[k] < 1 || WEAPONS[k].role === 'mounted') continue; const s = t.arsenal[k] * (1 + k * 0.15); if (s > bs) { bs = s; best = k; } }
    w = best;
  }
  if (w) { t.arsenal[w]--; p.wepOwn = true; }
  else {
    // no forged weapon: a hunter brings a hunting bow or spear, everyone else a club or farm tool
    if (p.job === J.HUNT && t.tech[TECH_IX.bow]) w = WEAPON_IX.bow;
    else if (t.tech[TECH_IX.bow] && rnd() < 0.2) w = WEAPON_IX.bow;
    else if (rnd() < 0.3) w = WEAPON_IX.spear; else w = 0;
    p.wepOwn = false;
  }
  let a = 0;
  for (let k = ARMORS.length - 1; k >= 1; k--) if (t.armor[k] >= 1) { t.armor[k]--; a = k; break; }
  p.wep = w; p.arm = a; p.mount = 0;
  if (t.tanks >= 1) { t.tanks--; p.mount = 2; }
  else if ((t.count.stable || t.count.studfarm || t.tech[TECH_IX.chariot]) && t.tameHerd && HERD_TYPES[t.tameHerd.type].horse && t.tameHerd.n > 4 && rnd() < 0.22) { t.tameHerd.n--; p.mount = 1; }
  else if ((t.count.stable || t.count.studfarm) && rnd() < 0.16) p.mount = 1;
  if (p.mount === 1) {
    for (let k = WEAPONS.length - 1; k >= 1; k--) {
      const W2 = WEAPONS[k];
      if (W2.role === 'mounted' && (W2.techI < 0 || t.tech[W2.techI]) && canPay(t.stock, W2.cost)) { if (p.wepOwn) t.arsenal[w]++; pay(t.stock, W2.cost); p.wep = k; p.wepOwn = false; break; }
    }
  }
  const G = WEAPONS[p.wep];
  p.ammo = G.kind > 0 ? (G.ammo || 24) * (t.count.supplydepot ? 1.3 : 1) : 0;
  p.shield = G.role === 'melee' && !!t.tech[TECH_IX.bronzearmor] && !t.tech[TECH_IX.rifle];
  p.hp = maxHP(p);
  p.cdT = 0; p.stam = 100; p.wound = 0; p.bleed = 0; p.flee = false; p.down = false; p.foe = null;
  p.mor = clamp(42 + (t.mod.morale || 0) * 0.45 + (p.moraleM - 1) * 30 + Math.min(p.xp, 30) * 0.5 + rnd() * 12 + (t.count.drillyard ? 5 : 0) + (t.count.warcollege ? 4 : 0), 15, 95);
}
// A soldier in a big realm's army stands for a company (army.rep men), so it takes and deals that much more: the square root each way,
// so its weight in a fight goes with the number of men it stands for.
const maxHP = p => p.hpMax * (p.mount === 2 ? 6 : p.mount === 1 ? 1.25 : 1) * (p.army && p.army.hpK ? p.army.hpK : 1);
const menOf = a => a.soldiers.length * (a.rep || 1);
// The men a soldier stands for leave the town's crowd while the army is out, so the fields and workshops go short;
// whoever comes home goes back. The dead don't.
function withhold(army, p) {
  const r = (army.rep || 1) - 1, t = p.town;
  if (r <= 0 || !t) return;
  const take = Math.min(t.folk, r);
  if (take <= 0) return;
  t.folk -= take; W.folkN -= take; army.held = (army.held || 0) + take;
  t.scale = tn(t) / Math.max(1, t.members.length);
}
function giveBack(army, p) {
  const r = (army.rep || 1) - 1;
  if (r <= 0 || !(army.held > 0)) return;
  const t = p.town && p.town.alive ? p.town : army.home;
  if (!t || !t.alive) return;
  const give = Math.min(army.held, r);
  army.held -= give; t.folk += give; W.folkN += give;
  t.scale = tn(t) / Math.max(1, t.members.length);
}
// A town's defenders aren't taken out of anything, so when one of them dies the men behind them die too.
function militiaLost(p) {
  const a = p.army;
  if (!a || !a.militia || !(a.rep > 1)) return;
  const t = a.home, r = Math.min(t.folk, a.rep - 1);
  if (r > 0) { t.folk -= r; W.folkN -= r; t.scale = tn(t) / Math.max(1, t.members.length); }
}
// Deaths away from the battlefield, which in most wars were most of them.
function campDeath(army, v, cause) {
  if (!v) return;
  const r = army.rep || 1, war = army.war;
  if (war && !war.ended) { war.dead += r; if (war.a.includes(army.pol)) war.deadA += r; else war.deadB += r; war.campDead = (war.campDead || 0) + r; }
  killPerson(v, cause);
}
// How much of the able-bodied a realm puts in the field, by the age it lives in: every man who can hold a spear for a short raid,
// then the levies the harvest can spare, standing armies, mass conscription with railways and factories behind it,
// and at last small professional forces with machines doing the work. Total war squeezes out more.
function levyShare(t, pol) {
  const e = pol.era || 0, g = GOV[pol.gov], mob = pol.mob || 0;
  const base = e <= 1 ? 0.6 : e <= 3 ? 0.45 : e === 4 ? 0.42 : e === 5 ? 0.5 : e <= 7 ? 0.55 : 0.3;
  const surge = e <= 1 ? 0.3 : e <= 5 ? 0.6 : e <= 7 ? 1.2 : 0.9;
  return clamp(base * (1 + mob * surge) * g.cons * (t.count.barracks ? 1.15 : 1) * (t.mod.conscript || 1), 0.08, 0.8);
}
// Buildings soldiers live by in peace and fall in at in war (society.js puts them in t.forts, where standing soldiers drill).
const MIL_BASE = { barracks: 1, drillyard: 1, fort: 1, castle: 1, citadel: 1, starfort: 1, warcollege: 1, armoury: 1, supplydepot: 1 };
// Where a town's soldiers fall in: its barracks, drill yard or fort if it has one (the one nearest the enemy), otherwise open ground
// at the edge of town on the side facing the enemy. Never the middle of town.
function rallyPoint(t, target) {
  let best = null, bs = -1e9;
  for (const b of t.forts) {
    if (!b.done || b.ruin || !MIL_BASE[b.type]) continue;
    const s = (b.type === 'barracks' || b.type === 'drillyard' ? 2 : 1) - (target ? Math.hypot(b.x - target.x, b.y - target.y) * 0.02 : 0);
    if (s > bs) { bs = s; best = b; }
  }
  if (best) { const c = best.i + (best.size >> 1) * (W.w + 1); for (let k = 0; k < 8; k++) { const j = nearTile(c, best.size + 1); if (W.occ[j] !== 1 && W.occ[j] !== 3) return j; } return c; }
  let dx = 1, dy = 0;
  if (target && target !== t) { const d = Math.hypot(target.x - t.x, target.y - t.y) || 1; dx = (target.x - t.x) / d; dy = (target.y - t.y) / d; }
  for (let r = clamp(Math.round((t.radius || 13) * 0.55), 5, 14); r >= 3; r -= 2) {
    const x = Math.round(t.x + dx * r), y = Math.round(t.y + dy * r);
    if (x < 1 || y < 1 || x >= W.w - 1 || y >= W.h - 1) continue;
    const i = y * W.w + x;
    if (!W.water[i] && W.landId[i] === W.landId[t.i]) { const j = nearTile(i, 2); return W.occ[j] === 1 || W.occ[j] === 3 ? i : j; }
  }
  return nearTile(t.i, 5);
}
// Saves from before the bases counted: put a town's barracks and the like on its soldiers' list of places to drill.
function syncBases(t) {
  for (const b of t.blds) if (b.done && !b.ruin && MIL_BASE[b.type] && !t.forts.includes(b)) t.forts.push(b);
}
// Who can be called up: before the modern age, men only.
const callable = (p, e) => { const v = ageOf(p); return v >= 16 && v < 48 && (e >= 7 || p.sex === 1 || p.job === J.SOLDIER) && !p.army && !p.leader && p.task !== T_MIGRATE && !p.aboard && !p.btl && !W.water[p.ti]; };
// How long it takes to gather a host: a war band in days, feudal levies over months, a railway mobilisation in weeks.
const musterTicks = e => e <= 1 ? 15 : e <= 3 ? 45 : e <= 5 ? 60 : e <= 7 ? 35 : 20;
function returnGear(p, t) {
  if (p.wepOwn && p.wep > 0) t.arsenal[p.wep]++;
  if (p.arm > 0) t.armor[p.arm]++;
  if (p.mount === 2) t.tanks++;
  p.wep = 0; p.arm = 0; p.mount = 0; p.wepOwn = false; p.shield = false; p.ammo = 0;
}
const heldWeapon = p => WEAPONS[p.wep || 0];
function realmArms(pol) {
  const w = new Float32Array(WEAPONS.length), a = new Float32Array(ARMORS.length);
  let tanks = 0;
  for (const t of W.towns) { if (t.polity !== pol) continue; for (let k = 0; k < w.length; k++) w[k] += t.arsenal[k]; for (let k = 0; k < a.length; k++) a[k] += t.armor[k]; tanks += t.tanks; }
  return { w, a, tanks };
}

// ---- deciding to fight ----
function realmPower(pol) { let s = 0; for (const t of W.towns) if (t.polity === pol) s += townPower(t); return s; }
function townPower(t) {
  const n = tn(t);
  let best = 0; for (let k = 0; k < WEAPONS.length; k++) if (t.arsenal[k] >= 1) best = k;
  return n * t.mod.attack * (1 + WEAPONS[best].dmg / 22) * Math.max(t.toolMul, 1);
}
const defPower = t => tn(t) * t.mod.defend * (1 + (t.fortHP > 0 ? 0.35 + t.fortHP / 400 : 0));
// Every war has a reason and something it's meant to win. The goal decides when a side will stop.
const GOALS = {
  land: { text: 'over land', ask: 'wants the country round', annex: 1 },
  hunger: { text: 'for food', ask: 'wants the granaries of', annex: 0.6, raid: 1 },
  tin: { text: 'for the tin mines', ask: 'wants the tin of', annex: 1 },
  iron: { text: 'for the iron hills', ask: 'wants the iron of', annex: 1 },
  oil: { text: 'for oil', ask: 'wants the oil of', annex: 1 },
  'old hatred': { text: 'out of old hatred', ask: 'means to break', annex: 1, total: 1 },
  revenge: { text: 'for revenge', ask: 'means to win back', annex: 1 },
  holy: { text: 'in a holy war', ask: 'means to convert', annex: 1, total: 1 },
  tribute: { text: 'to force tribute', ask: 'demands tribute from', vassal: 1 },
  empire: { text: 'for empire', ask: 'means to swallow', annex: 1, total: 1 },
  raid: { text: 'for plunder', ask: 'sends raiders against', raid: 1 },
  'civil war': { text: 'in civil war', ask: 'fights for', annex: 1, total: 1 },
  provoked: { text: 'for reasons nobody can quite recall', ask: 'marches on', annex: 1 },
  debts: { text: 'to collect what it is owed', ask: 'comes to collect from', vassal: 1 },
  revolt: { text: 'to put down a rising', ask: 'marches to crush', annex: 1, total: 1 },
  reconquest: { text: 'to take back what broke away', ask: 'means to take back', annex: 1 },
};
const CAUSE_TEXT = {}; for (const k in GOALS) CAUSE_TEXT[k] = GOALS[k].text;
// How short of room a realm is, from 0 (plenty) to about 2: towns that keep failing to find a spot to build, farm families with
// no fields left, colonists with nowhere left to go, and towns packed past what they can hold. Worked out once a year.
function landHunger(pol) {
  const yr = Math.floor(year());
  if (pol.lhY === yr) return pol.lh;
  let s = 0, w = 0, worst = null, ws = 0;
  for (const t of W.towns) {
    if (t.polity !== pol || t.nomad || t.occupier) continue;
    const n = Math.sqrt(tn(t)), M = t.spotMissN;
    let h = 0;
    if (M) { let m = 0; for (const k in M) if (M[k] > m) m = M[k]; h += m * 0.18; }
    if (t.pushWhy === 'land') h += 0.45;
    if (t.noSiteY >= yr - 3) h += 0.5;
    h += clamp((t.crowd || 0) - 0.95, 0, 0.5);
    s += h * n; w += n;
    if (h * n > ws) { ws = h * n; worst = t; }
  }
  pol.lhY = yr; pol.lh = w ? s / w : 0; pol.lhTown = worst;
  return pol.lh;
}
const MOTIVE_NAME = { land: 'Short of land', hunger: 'Hungry', raid: 'Plunder', tin: 'Wants tin', iron: 'Wants iron', oil: 'Wants oil', revenge: 'Revenge for a lost war', holy: 'Holy war', tribute: 'Tribute from the weak', empire: 'Empire', 'old hatred': 'Old hatred', reconquest: 'Reconquest of a breakaway', debts: 'Unpaid debts', strength: 'Stronger, and close', foreign: 'Different people' };
// Why `pol` might attack town `o` from its town `a`: the score considerWar compares, the cause it would give, and each motive's
// weight, so the realm panel can show exactly what the rulers are weighing. Null if it wouldn't, or couldn't.
function warMotive(pol, a, o, ctx) {
  const foe = o.polity, yr = ctx.yr;
  if (foe === pol || o.attack || o.occupier || (pol.truce[foe.id] > yr) || areAllies(pol, foe) || pol.overlord === foe.id || foe.overlord === pol.id) return null;
  const d = Math.hypot(o.x - a.x, o.y - a.y);
  const reach = 34 + govSt(pol) * 7 + a.mod.admin * 0.5 + (a.mod.speed > 1 ? 10 : 0) + (a.navy ? 30 : 0);
  if (d > reach) return null;
  if (W.landId[o.i] !== W.landId[a.i] && a.portLv < 2) return null;
  // a sensible ruler counts the other side's friends as well
  let friends = 0;
  for (const k of foe.allies) { const f = W.polities[k]; if (f && f.alive) friends += f.pop * 0.4; }
  const power = (tn(a) * a.mod.attack * a.toolMul) / (defPower(o) * o.toolMul + friends * 0.25 + 1);
  const gr = grudgeOf(pol, foe), lh = ctx.lh;
  // a realm with no room left will take on a neighbour it would otherwise leave alone
  if (power < (gr > 20 ? 0.85 : lh > 0.6 ? 0.9 : 1.1)) return null;
  const rel = relOf(pol, foe);
  const parts = [];
  let s = power * 2 + 22 / (d + 6);
  parts.push(['strength', s]);
  const mul = (k, m) => { if (m !== 1) { s *= m; parts.push([k, m]); } };
  s *= clamp(1 - rel / 50, 0.1, 2.4);
  if (ctx.nukes.has(foe.id)) s *= ctx.nukes.has(pol.id) ? 0.15 : 0.35;
  if (inAssembly(pol) && inAssembly(foe)) s *= 0.6;
  if (o.nomad) s *= 0.5;
  if (o.culture !== a.culture) mul('foreign', 1.2);
  if (a.famine) mul(o.stock[R.FOOD] > tn(o) * 2 ? 'hunger' : 'raid', 1.5);
  // land hunger: the more cramped the realm, the more it wants the neighbour's open farmland, near and lightly held
  if (lh > 0.25 || pol.crowdMax > 1.05) mul('land', (1 + Math.max(lh - 0.15, pol.crowdMax > 1.05 ? 0.25 : 0) * 0.9) * clamp(0.7 + (o.sArable.length + o.fields.length * 0.5) / 120, 0.7, 1.6) * clamp(30 / (d + 15), 0.6, 1.4));
  if (knows(a, 'bronze') && o.near.tin > 0 && a.near.tin === 0) mul('tin', 1.6);
  if (knows(a, 'iron') && o.near.iron > 0 && a.near.iron === 0) mul('iron', 1.3);
  if (knows(a, 'combustion') && o.near.oil > 0 && a.near.oil === 0) mul('oil', 1.5);
  if (pol.lost && pol.lost[foe.id] > yr - 60) mul('revenge', 1.7);
  if (pol.fac[2] > 0.3 && o.culture.id !== a.culture.id) mul('holy', 1.1);
  if (foe.pop < pol.pop * 0.35) mul('tribute', 1.05);
  if (pol.nodes.includes('con3') && foe.pop < pol.pop * 0.7) mul('empire', 1.3);
  if (rel < -40) mul('old hatred', 1 + (-40 - rel) / 120);
  if (gr > 0) mul('reconquest', 1 + gr / 40);
  if (pol.unpaidBy && pol.unpaidBy[foe.id] > 200) mul('debts', 1.4);
  // the cause it gives is whichever motive weighs most; plain advantage is a war 'over land'
  let why = 'land', bw = 1.0001;
  for (const [k, m] of parts) if (k !== 'strength' && k !== 'foreign' && m > bw) { bw = m; why = k; }
  return { s, why, parts, power, d, o };
}
function warCtx(pol) {
  const nukes = new Set(); for (const t of W.towns) if (t.count.missilesilo && t.tech[TECH_IX.nuclear]) nukes.add(t.polity.id);
  return { yr: year(), nukes, lh: landHunger(pol) };
}
const warLust = pol => { const g = GOV[pol.gov], rul = pol.ruler && pol.ruler.alive ? pol.ruler : null; return g.war * (rul ? rul.warM : 1) * (pol.capital ? pol.capital.mod.war || 1 : 1) * (1 - clamp(pol.warTired || 0, 0, 0.8)); };
function considerWar(pol) {
  const towns = W.towns.filter(t => t.polity === pol && !t.nomad && !t.occupier);
  if (!towns.length) return;
  const lust = warLust(pol);
  const a = pick(towns);
  if (tn(a) < 32 || a.attack) return;
  const ctx = warCtx(pol);
  let best = null;
  for (const o of W.towns) { const m = warMotive(pol, a, o, ctx); if (m && (!best || m.s > best.s)) best = m; }
  if (!best) return;
  const chance = 0.26 * lust * (a.famine ? 2 : 1) * (best.why === 'land' && ctx.lh > 0.5 ? 1 + ctx.lh * 0.5 : 1);
  if (rnd() > chance) return;
  const war = startWar(pol, best.o.polity, best.why, a, best.o);
  if (war && best.why === 'land' && ctx.lh > 0.4 && pol.lhTown) chronT('war', `${pol.name} has no room left to grow: ${pol.lhTown.name} cannot find land to build on, and its young families have nowhere to farm. It means to take the country round ${best.o.name}.`, best.o);
}
// For the realm panel: against each neighbour it knows, the strongest case for war its rulers could make this year,
// and roughly how likely they are to act on it. The same scoring considerWar uses; worked out at most once a year per realm.
function grievances(pol) {
  const yr = Math.floor(year());
  if (pol.grvY === yr && pol.grv) return pol.grv;
  const towns = W.towns.filter(t => t.polity === pol && !t.nomad && !t.occupier && tn(t) >= 32);
  const ctx = warCtx(pol), lust = warLust(pol), rows = new Map();
  const sample = towns.length > 8 ? towns.slice().sort((x, y) => tn(y) - tn(x)).slice(0, 8) : towns;
  for (const a of sample) {
    let best = null;
    for (const o of W.towns) { const m = warMotive(pol, a, o, ctx); if (m && (!best || m.s > best.s)) best = m; }
    if (!best) continue;
    const foe = best.o.polity, r = rows.get(foe.id);
    if (!r) rows.set(foe.id, { foe, m: best, n: 1 }); else { r.n++; if (best.s > r.m.s) r.m = best; }
  }
  const out = [];
  for (const r of rows.values()) {
    // considerWar picks one of its towns at random and attacks whatever that town's best target is
    const p = govSt(pol) >= 2 && towns.length ? clamp(0.26 * lust * r.n / sample.length * (pol.warCool > 0 ? 0 : 1), 0, 1) : 0;
    out.push({ foe: r.foe, why: r.m.why, parts: r.m.parts.filter(q => q[0] !== 'strength'), power: r.m.power, score: r.m.s, chance: p, target: r.m.o });
  }
  out.sort((x, y) => y.score - x.score);
  pol.grvY = yr; pol.grv = out;
  return out;
}
function startWar(att, def, cause, home, target) {
  if (att === def || atWar(att, def)) return null;
  if (areAllies(att, def)) breakAlliance(att, def, 'one has attacked the other');
  const war = {
    id: W.nextId++, a: [att], b: [def], leadA: att, leadB: def, start: year(), cause, name: warName(att, def, cause), dead: 0, scoreA: 0, battles: [], sunk: 0, taken: 0, ended: false, firstHome: home || null, firstTarget: target || null,
    goal: GOALS[cause] || GOALS.land, target: target || null, exA: 0, exB: 0, deadA: 0, deadB: 0, razed: 0, prisoners: 0, won: [0, 0], protest: -99, mercs: 0,
  };
  // the first months of a war are its most popular
  att.support = Math.max(att.support, cause === 'revenge' || cause === 'holy' || cause === 'old hatred' ? 72 : 58); def.support = Math.max(def.support, 75);
  W.wars.push(war);
  att.warsWith[def.id] = war; def.warsWith[att.id] = war;
  att.warCool = 18 + rint(30); att.wars++;
  adjustRel(att, def, -30);
  att.mob = Math.max(att.mob, 0.2); def.mob = Math.max(def.mob, 0.35);
  const place = target || def.capital || att.capital;
  if (cause === 'revolt') {
    // a rising is the crown's own business: no allies, no coalitions
    if (place) chronT('war', `${att.name} sends its army to crush the ${war.name}.`, place);
    if (home && target) raiseArmy(home, target, war, 'conquer');
    return war;
  }
  if (place) chronT('war', `${att.name} declares war on ${def.name} ${CAUSE_TEXT[cause] || ''}: the ${war.name} begins.`, place);
  for (const k of def.allies.slice()) { const ally = W.polities[k]; if (ally && ally.alive && !atWar(ally, att) && relOf(ally, def) >= 20 && rnd() < 0.8) joinWar(war, ally, 'b'); }
  for (const k of att.allies.slice()) { const ally = W.polities[k]; if (ally && ally.alive && !atWar(ally, def) && relOf(ally, att) >= 40 && rnd() < 0.4) joinWar(war, ally, 'a'); }
  // a realm that keeps swallowing its neighbours finds them lining up against it
  if ((att.infamy || 0) > 22 && cause !== 'revolt') {
    for (const k in att.known) {
      const o = W.polities[+k];
      if (!o || !o.alive || o === def || o === att || war.b.includes(o) || war.a.includes(o) || atWar(o, att) || areAllies(o, att) || relOf(o, att) > 10) continue;
      if (rnd() < Math.min(0.45, att.infamy / 180)) { joinWar(war, o, 'b', 'coalition'); }
    }
  }
  if (home && target) raiseArmy(home, target, war, war.goal.raid ? 'raid' : 'conquer');
  return war;
}
function warName(a, b, cause) {
  if (cause === 'civil war') return `${a.name} Civil War`;
  if (cause === 'revolt') return `${b.name} Rising`;
  if (cause === 'reconquest') return `War to Retake ${b.name}`;
  if (cause === 'holy') return `${b.name} Crusade`;
  if (cause === 'tin' || cause === 'iron' || cause === 'oil') return `${cap(cause)} War`;
  if (cause === 'raid') return `${a.name} Raids`;
  if (cause === 'debts') return `War of the ${b.name} Bonds`;
  if (cause === 'revenge') return `War of ${a.name}'s Revenge`;
  const r = rnd();
  return r < 0.55 ? `${a.name}–${b.name} War` : r < 0.8 ? `War of ${b.name}` : `${a.name} War`;
}
function joinWar(war, pol, side, why) {
  const us = side === 'a' ? war.a : war.b, them = side === 'a' ? war.b : war.a;
  if (us.includes(pol) || them.includes(pol)) return;
  us.push(pol);
  for (const o of them) { pol.warsWith[o.id] = war; o.warsWith[pol.id] = war; adjustRel(pol, o, -18); }
  pol.mob = Math.max(pol.mob, 0.15);
  const friend = us[0], foe = them[0];
  const text = why === 'coalition' ? `Fearing what ${foe.name} will do next, ${pol.name} joins the coalition against it in the ${war.name}.`
    : why === 'grudge' ? `${pol.name} sees its chance against ${foe.name}, an old enemy, and enters the ${war.name} on the side of ${friend.name}.`
    : why === 'late' ? `With ${friend.name} hard pressed, ${pol.name} keeps its word at last and enters the ${war.name}.`
    : `${pol.name} honours its alliance and enters the ${war.name}.`;
  (war.joined = war.joined || []).push({ id: pol.id, side, why: why || 'ally', yr: Math.floor(year()) });
  if (pol.capital) chronT('war', text, pol.capital);
}
// Once a year in every war: allies who held back may come in after all, an old enemy of one side may see its chance, and friends
// who stay out still send money and food to a side that's struggling.
function alliesYear(war, A, B, yr) {
  const bal = war.balance || 0;
  for (const [S0, O, side] of [[A, B, 'a'], [B, A, 'b']]) {
    const lead = S0[0], enemy = O[0];
    if (!lead || !enemy) continue;
    const losing = side === 'a' ? bal < -10 : bal > 10;
    const hurt = W.towns.some(t => S0.includes(t.polity) && (t.occupier || t.attack));
    // allies who held back
    for (const k of lead.allies) {
      const al = W.polities[k];
      if (!al || !al.alive || A.includes(al) || B.includes(al) || areAllies(al, enemy) || al.truce[enemy.id] > yr || relOf(al, lead) < 20) continue;
      if (rnd() < 0.05 + (hurt ? 0.18 : 0) + (losing ? 0.1 : 0)) { joinWar(war, al, side, 'late'); continue; }
      // or at least pays for it
      if (al.cur.kind >= 2 && lead.cur.kind >= 2 && al.cur.treasury > 0 && lead.cur.treasury < al.cur.treasury * 0.3) {
        const v = al.cur.treasury * 0.08;
        al.cur.treasury -= v; al.cur.spentY += v; lead.cur.treasury += v * fx(al, lead);
        flow(al, lead, 'aid', v * al.cur.value);
        if (!(war.subs && war.subs[al.id])) { (war.subs = war.subs || {})[al.id] = 1; (war.joined = war.joined || []).push({ id: al.id, side, why: 'money', yr: Math.floor(yr) }); if (lead.capital) chronT('war', `${al.name} stays out of the ${war.name}, but pays for ${lead.name}'s armies.`, lead.capital); }
      }
      // and food into a besieged ally's town, if it can get it there
      for (const t of W.towns) {
        if (t.polity !== lead || !t.attack || t.attack.blockade || !al.capital || !al.capital.alive) continue;
        if (Math.hypot(t.x - al.capital.x, t.y - al.capital.y) > 70) continue;
        const f = Math.min(al.capital.stock[R.FOOD] * 0.06, tn(t) * 2);
        if (f > 5) { al.capital.stock[R.FOOD] -= f; t.stock[R.FOOD] += f; }
      }
    }
    // an old enemy of the other side, strong enough to matter, joins in for its own reasons
    for (const k in enemy.known) {
      const o = W.polities[+k];
      if (!o || !o.alive || o.pop <= 0 || A.includes(o) || B.includes(o) || areAllies(o, enemy) || o.truce[enemy.id] > yr || atWar(o, enemy) || govSt(o) < 2) continue;
      const hate = Math.max(-relOf(o, enemy) - 40, grudgeOf(o, enemy) - 15);
      if (hate <= 0 || o.pop < enemy.pop * 0.25 || relOf(o, lead) < -20) continue;
      if (rnd() < Math.min(0.12, hate / 500) * (losing ? 0.6 : 1.2)) joinWar(war, o, side, 'grudge');
    }
  }
}
function dropFromWar(pol, war) {
  for (const o of war.a.concat(war.b)) if (o.warsWith[pol.id] === war) delete o.warsWith[pol.id];
  for (const k in pol.warsWith) if (pol.warsWith[k] === war) delete pol.warsWith[k];
  const a = war.a.indexOf(pol); if (a >= 0) war.a.splice(a, 1);
  const b = war.b.indexOf(pol); if (b >= 0) war.b.splice(b, 1);
}

// ---- the yearly council: each realm looks at the map and decides where to send people ----
const sideOf = (war, pol) => war.a.includes(pol) ? 'a' : 'b';
function warsYear() {
  const yr = year();
  // nerve and memory drain slowly away
  for (const pol of W.polities) if (pol.alive) { pol.infamy = (pol.infamy || 0) * 0.97; pol.warTired = (pol.warTired || 0) * 0.93; if (!Object.keys(pol.warsWith).length) { pol.mob = Math.max(0, (pol.mob || 0) - 0.08); pol.support += (60 - pol.support) * 0.2; } }
  for (const t of W.towns) if (t.occupier) occupationYear(t);
  for (const t of W.towns) for (const k in MIL_BASE) if (t.count[k]) { syncBases(t); break; }
  // an army in the field is paid, fed and shod every year it is out; a realm that can't pay finds its soldiers can't be relied on
  for (const a of W.armies) {
    if (a.militia || a.over) continue;
    const cur = a.pol.cur, bill = menOf(a) * Math.max(a.home.wage || 1, 1) * 0.35;
    if (cur.kind < 2) continue;
    cur.treasury -= bill; cur.spentY += bill;
    if (cur.treasury < 0) { a.morale = Math.max(0, a.morale - 6); a.pol.support = Math.max(0, a.pol.support - 1); a.unpaid = (a.unpaid || 0) + 1; }
  }
  for (let k = W.wars.length - 1; k >= 0; k--) {
    const war = W.wars[k];
    const A = war.a.filter(p => p.alive && p.towns > 0), B = war.b.filter(p => p.alive && p.towns > 0);
    if (!A.length || !B.length) { endWar(war, !A.length ? 'b' : 'a', 'conquest'); continue; }
    alliesYear(war, A, B, yr);
    for (const pol of A) warPlan(pol, B, war);
    for (const pol of B) warPlan(pol, A, war);
    if (rnd() < 0.3) spyYear(A, B, war);
    cyberYear(A, B, war);
    tryPeace(war, A, B, yr);
  }
}
// A rough guess at what's winning: land held, battles won, shipping sunk. Runs from -100 (side B) to 100 (side A).
function warBalance(war) {
  let hA = 0, hB = 0, pA = 1, pB = 1;
  for (const t of W.towns) {
    const pop = tn(t);
    if (war.a.includes(t.polity)) { pA += pop; if (t.occupier && war.b.includes(t.occupier)) hB += pop; }
    else if (war.b.includes(t.polity)) { pB += pop; if (t.occupier && war.a.includes(t.occupier)) hA += pop; }
  }
  return clamp(war.scoreA * 4 + (hA / pB - hB / pA) * 70, -100, 100);
}
function tryPeace(war, A, B, yr) {
  const age = yr - war.start, bal = warBalance(war);
  war.balance = bal;
  const pa = A.reduce((s, p) => s + p.pop, 0), pb = B.reduce((s, p) => s + p.pop, 0);
  // a mobilised country pays for every year of it, in men away from the fields and money it doesn't have
  const mobA = A.reduce((m, p) => Math.max(m, p.mob || 0), 0), mobB = B.reduce((m, p) => Math.max(m, p.mob || 0), 0);
  war.exA += (war.deadA / Math.max(pa, 1)) * 2.2 + 0.018 + mobA * 0.03 + (bal < -20 ? 0.03 : 0);
  war.exB += (war.deadB / Math.max(pb, 1)) * 2.2 + 0.018 + mobB * 0.03 + (bal > 20 ? 0.03 : 0);
  war.deadA = 0; war.deadB = 0;
  for (const p of A) { p.warTired = Math.max(p.warTired || 0, war.exA); p.mob = clamp(p.mob + (bal < -15 ? 0.1 : 0.02), 0, 1); homeFront(p, war, 'a', bal); }
  for (const p of B) { p.warTired = Math.max(p.warTired || 0, war.exB); p.mob = clamp(p.mob + (bal > 15 ? 0.1 : 0.02), 0, 1); homeFront(p, war, 'b', bal); }
  // a side with nothing left un-occupied has lost
  for (const [S0, win] of [[A, 'b'], [B, 'a']]) {
    const free = W.towns.some(t => S0.includes(t.polity) && !t.occupier);
    if (!free) { endWar(war, win, 'conquest'); return; }
  }
  if (war.cause === 'revolt') { revoltYear(war, yr, bal); return; }
  if (age < 2) return;
  const leader = bal > 0 ? 'a' : 'b', mag = Math.abs(bal);
  const exWin = leader === 'a' ? war.exA : war.exB, exLose = leader === 'a' ? war.exB : war.exA;
  const G = war.goal;
  let done = false;
  if (war.target && war.target.alive && war.target.occupier && war.target.occupier.alive && war.a.includes(war.target.occupier) && !G.total) done = true;
  if (G.raid && war.razed >= 3) done = true;
  if (G.vassal && mag > 25) done = true;
  // the winner stops when it's got what it came for or can't afford more; the loser stops when it's beaten
  // a people that has had enough makes its rulers sue for peace, winning or not
  const supW = Math.min(...(leader === 'a' ? A : B).map(p => p.support)), supL = Math.min(...(leader === 'a' ? B : A).map(p => p.support));
  // a war where nobody has fought for years is a war both sides would quietly like to stop
  const idle = Math.max(0, yr - (war.lastFight || war.start) - 3), stale = Math.min(0.5, idle * 0.1);
  const ask = 0.02 + exLose * 0.4 + mag * 0.006 + Math.max(0, 30 - supL) * 0.012 + stale;
  const accept = done ? 0.75 : clamp(0.02 + exWin * 0.55 + age * 0.006 - (G.total ? 0.06 : 0) + Math.max(0, 30 - supW) * 0.015 + stale, 0, 0.85);
  // a side that is beaten in the field and worn out at home simply gives up
  if (exLose > 1.1 && mag > 35 && rnd() < 0.5) { endWar(war, leader, 'capitulation'); return; }
  if (rnd() < ask && rnd() < accept) endWar(war, mag > 12 ? leader : null, 'treaty');
}
// The home front. A war people believe in survives losses; one they don't, doesn't. Defending your own land is easy to believe in;
// a long war of conquest, with sons coming home in boxes, prices up and taxes doubled, is not.
function homeFront(pol, war, side, bal) {
  const mine = side === 'a' ? 1 : -1, winning = bal * mine;
  const attacker = side === 'a' && war.leadA === pol, invaded = W.towns.some(t => t.polity === pol && t.occupier && atWar(t.occupier, pol));
  let want = attacker ? 52 : 70;
  if (war.goal.total && attacker) want -= 6;
  if (invaded) want += 12;                        // the enemy is on our soil
  if (war.cause === 'holy' && pol.fac[2] > 0.3) want += 10;
  want += clamp(winning * 0.25, -20, 15);
  want -= (side === 'a' ? war.exA : war.exB) * 55;
  want -= Math.max(0, pol.cur.infl) * 60 + Math.max(0, pol.cur.tax - 0.15) * 60;
  want -= Math.max(0, year() - war.start - 4) * 1.2;
  want += GOV[pol.gov].vote ? -4 : GOV[pol.gov].st >= 4 && GOV[pol.gov].stab < 0 ? 6 : 0;   // a tyrant can make people say they're for it
  if (pol.capital && pol.capital.tech[TECH_IX.radio]) want += 4;  // and so can a radio
  pol.support = clamp(pol.support + (clamp(want, 0, 100) - pol.support) * 0.35, 0, 100);
  if (pol.support < 25) {
    pol.stab -= 2;
    for (const t of W.towns) if (t.polity === pol && !t.occupier) t.unrest = Math.min(100, t.unrest + (25 - pol.support) * 0.4);
    if (pol.capital && !(war.protest > year() - 15)) { war.protest = year(); chronT('gov', `Crowds in ${pol.capital.name} turn against the ${war.name}. Nobody remembers what it was for.`, pol.capital); }
  }
}
// Where should the next host go? Save what's under attack first, win back what's lost, stop what's coming, then go looking for gains.
function warPlan(pol, foes, war) {
  const yr = year();
  const mine = W.armies.filter(a => a.pol === pol && a.goal !== 'garrison');
  const homes = W.towns.filter(t => t.polity === pol && !t.nomad && !t.occupier && !t.attack && tn(t) >= 20 && t.armyCool <= yr);
  if (!homes.length) return;
  const limit = 1 + Math.floor(pol.towns / 4) + Math.floor((pol.mob || 0) * 3);
  if (mine.length >= limit) return;
  const nearestHome = (x, y, land) => { let b = null, bd = 1e9; for (const h of homes) { if (land !== undefined && W.landId[h.i] !== land && h.portLv < 2) continue; const d = (h.x - x) ** 2 + (h.y - y) ** 2; if (d < bd) { bd = d; b = h; } } return b; };
  // whose towns we defend: our own, and those of anyone fighting on our side, if we're close enough to help
  const friends = ourSide(war, pol), farOK = (t, h) => t.polity === pol || (h && Math.hypot(h.x - t.x, h.y - t.y) < 60);
  const helping = t => t.polity === pol || !W.armies.some(a => a.target === t && a.pol !== pol && friends.includes(a.pol) && a.goal !== 'garrison');
  const sendHelp = (m, t) => { if (m && t.polity !== pol && menOf(m) >= 30) chronT('war', `${pol.name} sends the ${m.name} to help its ally ${t.polity.name} at ${t.name}.`, t); return m; };
  // relief
  for (const B of W.battles) {
    if (!B.town || B.war !== war || !friends.includes(B.town.polity) || mine.some(a => a.target === B.town) || !helping(B.town)) continue;
    const h = nearestHome(B.town.x, B.town.y, W.landId[B.town.i]);
    if (h && farOK(B.town, h) && sendHelp(raiseArmy(h, B.town, war, 'relieve'), B.town)) return;
  }
  // win back what's occupied
  for (const t of W.towns) {
    if (!friends.includes(t.polity) || !t.occupier || !foes.includes(t.occupier) || mine.some(a => a.target === t) || !helping(t)) continue;
    if (t.polity !== pol && rnd() < 0.5) continue;
    const h = nearestHome(t.x, t.y, W.landId[t.i]);
    if (h && farOK(t, h) && rnd() < 0.7 && sendHelp(raiseArmy(h, t, war, 'liberate'), t)) return;
  }
  // stop an invasion on the road
  for (const a of W.armies) {
    if (!foes.includes(a.pol) || a.goal === 'garrison' || !a.target || !friends.includes(a.target.polity) || a.battle) continue;
    // scorched earth: burn your own country ahead of a host you can't stop, so it finds nothing to eat
    const tt = a.target;
    if (tt.polity === pol && !(tt.scorched > W.tick) && armyStrength(a) > townStrength(tt) * 1.2 && (hasTr(pol.ruler && pol.ruler.alive ? pol.ruler : null, ['cruel']) || GOV[pol.gov].cons >= 1.2 || rnd() < 0.25)) scorch(tt, a);
    if (mine.some(m => m.target === a.target || m.chase === a) || !helping(tt)) continue;
    const h = nearestHome(a.target.x, a.target.y, W.landId[a.target.i]);
    if (h && farOK(tt, h) && rnd() < 0.7) { const m = sendHelp(raiseArmy(h, a.target, war, 'intercept'), tt); if (m) { m.chase = a; return; } }
  }
  // offensive: value over distance over how well it's held
  const ours = sideOf(war, pol);
  const G = ours === 'a' ? war.goal : GOALS.land;
  const home = pick(homes);
  let tgt = null, bs = 0;
  for (const o of W.towns) {
    if (!foes.includes(o.polity) || o.attack || o.occupier) continue;
    const overseas = W.landId[o.i] !== W.landId[home.i];
    if (overseas && (home.portLv < 2 || !home.ships.length)) continue;
    const d = Math.hypot(o.x - home.x, o.y - home.y) * (overseas ? 1.6 : 1);
    if (d >= 130) continue;
    let v = (6 + Math.sqrt(tn(o))) * (o.polity.capital === o ? 1.6 : 1) * (war.target === o ? 2 : 1);
    v /= (d + 12) * (1 + o.fortHP / 150);
    if (mine.some(a => a.target === o)) v *= 0.4;
    if (v > bs) { bs = v; tgt = o; }
  }
  if (!tgt) return;
  // nobody starts a campaign in a northern winter before there are railways to feed it: the armies go into winter quarters
  if ((pol.era || 0) < 6 && seasonAt(home.y) < -0.07 && W.temp[home.i] < 0.5 && rnd() < 0.85) return;
  const weak = tn(home) * home.mod.attack * home.scale < defPower(tgt) * 0.55;
  const raider = (G.raid || weak) && rnd() < 0.7;
  if (rnd() < 0.55 + (pol.mob || 0) * 0.4) raiseArmy(home, tgt, war, raider ? 'raid' : 'conquer');
}
function scorch(t, a) {
  t.scorched = W.tick + TPY * 1.5;
  let burned = 0;
  for (const f of t.fields) if (W.stage[f.i] && rnd() < 0.5) { W.stage[f.i] = 0; dirty(f.i); if (FXH && burned < 6) FXH.burn(f.i % W.w, (f.i / W.w) | 0); burned++; }
  t.stock[R.FOOD] *= 0.85;  // what couldn't be carried inside the walls
  t.unrest = Math.min(100, (t.unrest || 0) + 6);
  if (tn(t) > 30) chronT('war', `${t.polity.name} burns the fields round ${t.name} ahead of the ${a.name}, and leaves it nothing to eat.`, t);
}
// Spies: quiet killings, burned stores, stolen plans. Literate realms only.
function spyYear(A, B, war) {
  const us = rnd() < 0.5 ? A : B, them = us === A ? B : A;
  const pol = pick(us), foe = pick(them);
  if (!pol.capital || !foe.capital || !knows(pol.capital, 'writing')) return;
  const r = rnd();
  const army = W.armies.find(a => a.pol === foe && a.general && a.general.alive);
  if (r < 0.2 && army) {
    const g = army.general;
    if (rnd() < 0.3) { killPerson(g, 'assassinated'); if (army.soldiers.length > 20) chronT('war', `An assassin in the pay of ${pol.name} kills the general ${g.name} in camp.`, army.home); }
  } else if (r < 0.5) {
    const t = pick(W.towns.filter(x => x.polity === foe));
    if (t) { for (let k = 1; k < WEAPONS.length; k++) t.arsenal[k] *= 0.6; if (FXH) FXH.burn(t.x, t.y); if (tn(t) > 80 && rnd() < 0.3) chronT('war', `The arsenal of ${t.name} burns in the night. Nobody doubts who paid for the fire.`, t); }
  } else if (r < 0.75) {
    stealMilitary(foe.capital, pol.capital, 0.5);
  }
}

// ---- raising an army ----
function raiseArmy(a, target, war, goal, quiet) {
  const pol = a.polity, g = GOV[pol.gov], e = pol.era || 0;
  portOf(a);
  const fit = a.members.filter(p => callable(p, e));
  if (fit.length < 8) return null;
  // standing soldiers first, the strongest conscripts next
  fit.sort((x, y) => (y.job === J.SOLDIER ? 2 : 0) + y.str - (x.job === J.SOLDIER ? 2 : 0) - x.str);
  const pros = fit.filter(p => p.job === J.SOLDIER).length;
  const share = levyShare(a, pol);
  let size = Math.min(fit.length, Math.max(8, pros, Math.floor(fit.length * share)));
  // in a city far bigger than the people being simulated, each figure stands for more men (army.rep)
  if (goal === 'raid') size = Math.min(size, 10 + rint(24));
  size = Math.min(size, 700);
  const takers = fit.slice(0, size);
  // the rest of the realm sends its contingents: every town within a few days' march on the same land, by the same levy
  const contingents = [];
  if (goal !== 'raid') {
    for (const o of W.towns) {
      if (o === a || o.polity !== pol || o.nomad || o.occupier || o.attack || !o.alive || W.landId[o.i] !== W.landId[a.i] || tn(o) < 25) continue;
      const d = Math.hypot(o.x - a.x, o.y - a.y);
      if (d > (goal === 'intercept' ? 26 : 48) + (e >= 6 ? 30 : 0)) continue;  // railways bring them from much further; a host sent to stop an invasion can't wait long
      const f2 = o.members.filter(p => callable(p, e));
      f2.sort((x, y) => (y.job === J.SOLDIER ? 2 : 0) + y.str - (x.job === J.SOLDIER ? 2 : 0) - x.str);
      const n2 = Math.min(f2.length, Math.round(f2.length * levyShare(o, pol) * (goal === 'intercept' ? 0.7 : 1)), 300);
      if (n2 >= 2) { for (let k = 0; k < n2; k++) takers.push(f2[k]); contingents.push(o); }
      if (takers.length >= 1400) break;
    }
  }
  size = takers.length;
  // how many men each figure stands for: the crowd behind the people being simulated, in the towns that sent them
  let sc = 0; for (const p of takers) sc += Math.max(1, tn(p.town) / Math.max(1, p.town.members.length));
  const rep = goal === 'raid' ? 1 : Math.max(1, Math.round(Math.min(sc / Math.max(1, size), 120)));
  const army = {
    id: W.nextId++, pol, war, home: a, target, goal: goal || 'conquer', soldiers: [], units: [], start: W.tick, size, battle: null, kills: 0, lost: 0, tgtPol: target.polity,
    phase: 'muster', morale: 55 + (a.mod.morale || 0), general: null, mercs: 0, guns: [], landed: false, sailing: 0, x: a.x, y: a.y, name: '', taken: 0, path: null, pi: 0, rally: rallyPoint(a, target), food: 0, foodMax: 0, power: 0,
    // a host sent to stop an invasion or lift a siege goes with whoever is ready; anyone else gathers the whole levy first
    musterEnd: W.tick + (goal === 'intercept' || goal === 'relieve' ? 10 + rint(10) + (contingents.length ? 12 : 0) : musterTicks(e) + rint(20) + (contingents.length ? 25 : 0)), militia: false, nextConvoy: 0, wins: 0, starving: 0, camp: false, razed: 0, side: null, lastEnc: 0, width: 4, ranks: 0, arriveT: 0,
    rep, hpK: Math.sqrt(rep), held: 0, peak: 0, reinfT: W.tick, levy: e <= 5 && pros < size * 0.5, era: e,
  };
  for (let k = 0; k < size; k++) {
    const p = takers[k];
    p.prevJob = p.job === J.SOLDIER ? J.SOLDIER : p.job;
    p.army = army; p.job = J.SOLDIER; p.task = T_WAR; p.step = 0; p.st = 0; p.wake = W.tick + rint(16); p.carry = 0; p.ctype = -1; p.hidden = false; p.sideJ = 0;
    issueGear(p, p.town || a);
    withhold(army, p);
    army.soldiers.push(p);
  }
  army.contingents = contingents.length;
  if (contingents.length) { army.rallyOf = {}; for (const o of contingents) army.rallyOf[o.id] = rallyPoint(o, a); army.joinT = W.tick + Math.min(30, Math.round((army.musterEnd - W.tick) * 0.3)); }
  // a rich realm with an unwilling people buys the soldiers it can't raise: hard men from far away, paid by the year, loyal to the purse
  const cur = pol.cur;
  if (cur.kind >= 2 && goal !== 'raid' && !a.nomad && knows(a, 'currency')) {
    const each = Math.max(a.wage, 1) * 3;
    const hire = Math.min(80, Math.floor(size * 0.6), Math.floor((cur.treasury - each * 12) / each));
    if (hire >= 5 && (pol.support < 55 || defPower(target) > tn(a) * 0.5 || fit.length < 20)) {
      for (let k = 0; k < hire; k++) {
        const p = newPerson(a, rnd() < 0.9 ? 0 : 1, 20 + rint(16));
        p.ti = p.nt = nearTile(a.i, 4); p.xp = 10 + rint(25); p.str = 1.05 + rnd() * 0.25; p.merc = true;
        p.prevJob = J.SOLDIER; p.army = army; p.job = J.SOLDIER; p.task = T_WAR; p.step = 0; p.st = 0; p.wake = W.tick + rint(16); p.hidden = false;
        plog(p, `Took ${pol.name}’s money to fight for it.`);
        issueGear(p, a);
        army.soldiers.push(p);
      }
      cur.treasury -= hire * each; cur.spentY += hire * each; army.mercs = hire;
      if (war) war.mercs += hire;
      size += hire; army.size = size;
    }
  }
  // the most respected soldier leads, and a good one is worth a lot
  let bg = null, bs = -1;
  for (const p of army.soldiers) { const v = p.leadM * 4 + p.fame + (p.xp || 0) * 0.2 + (p.warM - 1) * 2; if (v > bs) { bs = v; bg = p; } }
  army.general = bg;
  if (bg) { bg.fame += 1; plog(bg, `Led the host of ${a.name} against ${target.name}.`); army.morale += (bg.leadM - 1) * 18 + Math.min(bg.fame, 30) * 0.3; }
  // a host sent to save a town, or led by someone in a hurry, marches day and night and leaves stragglers on the road
  army.forced = target !== a && goal !== 'raid' && (goal === 'relieve' || goal === 'intercept' || (bg && hasTr(bg, BOLD) && rnd() < 0.4));
  // soldiers know what the people at home think of the war
  army.morale += (pol.support - 55) * 0.15;
  army.name = armyName(army);
  formUnits(army);
  // engines for walls, guns for everyone
  const wantsWalls = target.fortHP > 0 && !target.nomad, field = a.tech[TECH_IX.cannon] || a.tech[TECH_IX.artillery];
  if ((wantsWalls || field) && goal !== 'raid') {
    const n = 1 + Math.floor(size / 40) + (a.count.siegeyard ? 2 : 0) + (a.count.gunfoundry ? 2 : 0);
    for (let q = 0; q < n; q++) {
      const ty = bestEngine(a, q);
      if (ty < 0 || !canPay(a.stock, SIEGE[ty].cost)) break;
      pay(a.stock, SIEGE[ty].cost);
      army.guns.push({ id: W.nextId++, type: ty, x: a.x, y: a.y, hp: SIEGE[ty].hp, cool: 0, tx: 0, ty: 0, fireT: -99 });
    }
  }
  // food for the road: what the town can spare, out of its own mouths; a campaign's first bills are paid up front, the rest by the year
  const men = menOf(army);
  army.peak = army.soldiers.length;
  if (pol.cur.kind >= 2) { const bill = men * Math.max(a.wage, 1) * 0.12; pol.cur.treasury -= bill; pol.cur.spentY += bill; }
  const takeFood = Math.min(a.stock[R.FOOD] * 0.3, men * 3);
  a.stock[R.FOOD] -= takeFood;
  army.food = takeFood; army.foodMax = Math.max(takeFood, men * 2);
  W.armies.push(army);
  pol.warCool = Math.max(pol.warCool, 6);
  a.armyCool = year() + 5 + rint(7);
  a.warYear = year(); target.warYear = year();
  a.warExp = Math.min((a.warExp || 0) + 1, 6);
  target.warExp = Math.min((target.warExp || 0) + 1, 6);
  const soldier = a.mod.tier >= 2 ? 'soldiers' : 'warriors';
  const gear = WEAPONS[army.soldiers.reduce((b, p) => Math.max(b, p.wep), 0)].name.toLowerCase();
  if (W.landId[target.i] !== W.landId[a.i]) {
    army.phase = 'embark';
    army.embarkBy = W.tick + TPY * 2;
    const landing = findLanding(target.i);
    army.landing = landing;
    if (!landing) { endArmy(army); return null; }
    for (const p of army.soldiers) { p.task = T_BOARD; p.step = 0; p.tgt = a.portB !== undefined ? a.portB : a.i; }
    chronT('war', `${men} ${soldier} of ${pol.name} gather at the port of ${a.name} to sail against ${target.name}.`, a);
  } else if (!quiet && (size >= 25 || tn(target) > 40)) {
    const verb = goal === 'relieve' ? 'to relieve' : goal === 'liberate' ? 'to retake' : goal === 'raid' ? 'to raid' : goal === 'intercept' ? 'to defend' : 'against';
    chronT('war', `${pol.name} ${contingents.length ? `calls up ${men} ${soldier} from ${a.name} and ${contingents.length === 1 ? contingents[0].name : contingents.length + ' other towns'}, to march` : `marches ${men} ${soldier} from ${a.name}`} ${verb} ${target.name}, armed with ${gear}${/s$/.test(gear) ? '' : 's'}.`, target);
  }
  return army;
}
function armyName(army) {
  const a = army.home, pol = army.pol, k = (pol.armyN = (pol.armyN || 0) + 1);
  if (pol.rebel) return `Rebels of ${a.name}`;
  if (a.mod.tier >= 3 && menOf(army) > 300) return `${ordinal(k)} Army of ${pol.name}`;
  return army.goal === 'raid' ? `Raiders of ${a.name}` : `Host of ${a.name}`;
}
const ordinal = n => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
function bestEngine(t, q) {
  let b = -1;
  for (let k = 0; k < SIEGE.length; k++) { const S0 = SIEGE[k]; if (S0.techI >= 0 && !t.tech[S0.techI]) continue; if (!canPay(t.stock, S0.cost)) continue; if (q === 0 && S0.kind === 'ram') { b = k; break; } if (q % 3 === 1 && S0.kind === 'tower') { b = k; break; } if (S0.kind === 'gun') b = k; }
  return b;
}

// ---- marching: the host follows one road as a column, so you can watch it come ----
function soldierGo(p, to) {
  if (p.ti === to) { p.st = 0; p.wake = W.tick + 6 + rint(8); return; }
  if (straightWalk(p, to)) return;
  const path = findPath(p.ti, to, 0);
  if (path && path !== PATH_BUSY) { beginPath(p, path); return; }
  p.st = 0; p.wake = W.tick + 10 + rint(12);
}
function warStep(p) {
  const a = p.army;
  if (!a) { endTask(p); return; }
  p.hidden = false;
  // contingents fall in at their own town's base first, then march to join the main host
  if (a.phase === 'muster') { const own = a.rallyOf && W.tick < a.joinT ? a.rallyOf[p.town.id] : undefined; soldierGo(p, own !== undefined ? own : a.rally); return; }
  if (a.phase === 'march' && a.path) {
    const P = a.path, L = P.length - 1, idx = clamp(Math.floor(a.pi - p.slotY * 1.1), 0, L), base = P[idx], w = W.w;
    const nx = P[Math.min(idx + 1, L)], dx = nx % w - base % w, dy = ((nx / w) | 0) - ((base / w) | 0);
    const off = Math.round(p.slotX);
    const q = base + dy * off + dx * off * -w;  // sideways of the direction of travel
    const to = (q > 0 && q < W.water.length && !W.water[q] && W.occ[q] !== 3) ? q : base;
    soldierGo(p, to);
    return;
  }
  if (a.phase === 'garrison' || a.camp) {
    p.st = 2; p.wake = W.tick + 40 + rint(40);
    if (rnd() < 0.3) { const c = a.goal === 'garrison' ? a.target.i : Math.round(a.y) * W.w + Math.round(a.x); soldierGo(p, nearTile(c, 5)); }
    return;
  }
  p.st = 2; p.wake = W.tick + 20 + rint(20);
}
function boardStep(p) {
  if (p.step === 0) { walk(p, p.tgt, 1, 0); if (p.task === 0) { p.task = T_BOARD; p.step = 1; p.st = 2; p.wake = W.tick + 4; } return; }
  p.st = 2; p.wake = W.tick + 8; p.step = 1;
  if (p.army) return;  // soldiers wait on the quay until armyUpdate has a hull for them
  const s = p.shipRef;
  if (!s || s.sunk || s.mission !== 'carry') {  // the ship's gone without them
    p.shipRef = null;
    if (p.fromTown && p.fromTown.alive) moveTo(p, p.fromTown);
    endTask(p, 5);
    return;
  }
  if (boardShip(p, s)) { p.shipRef = null; if (s.pass.length >= s.expect) s.ready = true; }
}
// Someone who ended up on the wrong side of the water settles wherever they can reach.
function strand(p) {
  let best = null, bd = 1e9;
  for (const t of W.towns) { if (W.landId[t.i] !== W.landId[p.ti]) continue; const d = Math.hypot(t.x - p.ti % W.w, t.y - ((p.ti / W.w) | 0)); if (d < bd) { bd = d; best = t; } }
  if (best) { moveTo(p, best); p.task = T_MIGRATE; p.step = 0; p.tgt = nearTile(best.i, 3); p.st = 0; p.wake = W.tick + 5; return true; }
  return false;
}
function returnStep(p) {
  if (p.step === 0) {
    if (W.landId[p.town.i] !== W.landId[p.ti] && !W.water[p.ti]) { if (strand(p)) return; }
    walk(p, nearTile(p.town.i, 3), 1, 0);
    if (p.task === 0) { p.task = T_RETURN; p.step = 1; p.st = 2; p.wake = W.tick + 10; }
    return;
  }
  if (p.prevJob) p.job = p.prevJob;
  if (ageOf(p) < 13) p.job = J.CHILD;
  endTask(p);
}
function dismissSoldier(p) {
  if (p.army && p.alive) giveBack(p.army, p);
  p.army = null; p.btl = null; p.unit = null; p.foe = null; p.flee = false; p.down = false; p.task = T_RETURN; p.step = 0; p.st = 0; p.wake = W.tick + rint(30); p.hidden = false;
  p.job = p.prevJob || J.WOOD;
  if (p.alive) { returnGear(p, p.town); if (p.hp > maxHP(p)) p.hp = maxHP(p); }
}
function endArmy(army) {
  for (const p of army.soldiers) dismissSoldier(p);
  army.soldiers.length = 0; army.units.length = 0;
  army.over = true;
  if (army.target && army.target.garrison === army) army.target.garrison = null;
  const k = W.armies.indexOf(army); if (k >= 0) W.armies.splice(k, 1);
}
function planRoute(army) {
  // from wherever the middle of the host is, by road if there is one
  const first = army.soldiers.find(p => !p.aboard);
  if (!first) return false;
  let from = first.ti;
  const cx = Math.round(army.y) * W.w + Math.round(army.x);
  if (!W.water[cx] && W.landId[cx] === W.landId[from]) from = cx;
  let to = nearTile(army.target.i, 5);
  if (W.landId[to] !== W.landId[from]) to = army.target.i;
  nodeBudget = Math.max(nodeBudget, 1);
  let path = findPath(from, to, 0);
  if (path === PATH_BUSY) return false;
  // a host camped in a walled town, or marching on one, goes out by the gate and in by the breach: through the walls if it must
  if (!path) { nodeBudget = Math.max(nodeBudget, 1); path = findPath(from, to, 8); if (path === PATH_BUSY) return false; }
  if (!path) {
    army.lost = (army.lost || 0) + 1;
    if (army.lost < 4) return false;  // try again from a different spot next time
    if (army.soldiers.length > 20) chronT('war', `The ${army.name} can find no way to ${army.target.name}, and turns for home.`, army.home);
    endArmy(army);
    return false;
  }
  army.path = path; army.pi = 0; army.arriveT = 0;
  // a column: ranks wide enough to keep it from stretching for miles
  const n = army.soldiers.length, width = clamp(Math.round(Math.sqrt(n * 0.6)), 2, 14);
  army.width = width; army.ranks = Math.ceil(n / width);
  army.soldiers.forEach((p, k) => { p.slotX = k % width - (width - 1) / 2; p.slotY = Math.floor(k / width); });
  return true;
}
function armyStrength(a) {
  let s = 0;
  const S0 = a.soldiers, n = S0.length;
  for (let k = 0; k < n; k++) { const p = S0[k], w = WEAPONS[p.wep || 0]; s += (w.dmg + 4) * (1 + ARMORS[p.arm || 0].prot) * (p.mount === 2 ? 4 : p.mount === 1 ? 1.5 : 1); }
  a.power = s * (a.rep || 1) * (a.morale / 60) * Math.sqrt(a.home.mod.attack);
  return a.power;
}
function townStrength(t) { let s = 0; for (const p of t.members) { const a = ageOf(p); if (a >= 16 && a < 58) s += 10; } return s * Math.max(1, t.scale || 1) * t.mod.defend * (1 + t.fortHP / 120); }
// Weather's different every season in every region.
function weatherAt(x, y) {
  const i = (y | 0) * W.w + (x | 0);
  if (W.wx) return wxKind(i);
  const s = seasonOf(), c = Math.floor(W.tick / TPSEASON), h = hash2((x / 16) | 0, (y / 16) | 0, c * 31);
  const wet = W.moist[i], temp = W.temp[i] - (s === 3 ? 0.2 : s === 1 ? -0.1 : 0);
  if (temp < 0.3 && h < 0.55) return WX.SNOW;
  if (h < 0.15 + wet * 0.4) return WX.RAIN;
  if (h > 0.9 && wet > 0.4) return WX.FOG;
  if (temp > 0.85 && h > 0.6) return WX.HEAT;
  return WX.CLEAR;
}
const WX = { CLEAR: 0, RAIN: 1, SNOW: 2, FOG: 3, HEAT: 4 }, WX_NAME = ['clear skies', 'rain', 'snow', 'fog', 'burning heat'];

// ---- food and sickness: armies have always lost more to these than to the enemy ----
function nearFriendly(army, r) {
  let best = null, bd = r * r;
  for (const t of W.towns) {
    if (t.occupier ? t.occupier !== army.pol : (t.polity !== army.pol && !areAllies(t.polity, army.pol))) continue;
    const d = (t.x - army.x) ** 2 + (t.y - army.y) ** 2;
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}
function supplyArmy(army) {
  const S0 = army.soldiers, n = S0.length;
  if (!n) return;
  const men = n * (army.rep || 1), eat = men * 20 / TPY * 1.3;
  const depot = army.home.count.supplydepot ? 1.4 : 1;
  const near = nearFriendly(army, 18);
  if (near && army.food < army.foodMax) {
    const a = Math.min(near.stock[R.FOOD] * 0.05, army.foodMax - army.food, eat * 3);
    near.stock[R.FOOD] -= a; army.food += a;
  }
  // baggage trains from home, if the road's open
  if (!near && W.tick >= army.nextConvoy && army.home.alive && !army.home.attack && W.landId[army.home.i] === W.landId[S0[0].ti]) {
    army.nextConvoy = W.tick + 100;
    // a long road eats its own wagons: beyond a few days' march only part of a train arrives, unless it goes by rail or lorry
    const far = Math.hypot(army.home.x - army.x, army.home.y - army.y), mech = army.home.mod.rail || army.home.mod.car;
    const load = Math.min(army.home.stock[R.FOOD] * 0.12, men * 3 * depot) * (mech ? 1 : clamp(40 / (far + 10), 0.25, 1));
    if (load > 2 && W.convoys.length < 80) { army.home.stock[R.FOOD] -= load; W.convoys.push({ id: W.nextId++, army, x: army.home.x, y: army.home.y, food: load, pol: army.pol, motor: !!army.home.mod.car }); }
  }
  // on enemy ground, the country feeds them, like it or not
  if (army.food < eat * 8 && !near) pillage(army, 3);
  army.food -= eat;
  if (army.food < 0) {
    army.food = 0;
    army.starving++;
    army.morale -= 1.6;
    if (rnd() < 0.5) { const v = S0[rint(S0.length)]; if (v && v !== army.general) campDeath(army, v, 'starved on campaign'); }
  } else army.starving = Math.max(0, army.starving - 1);
}
function armyAttrition(army) {
  const S0 = army.soldiers, n = S0.length;
  if (!n) return;
  const i = Math.round(army.y) * W.w + Math.round(army.x), t = army.home.mod;
  // the bigger the camp and the poorer the medicine, the more fever kills
  const fever = 0.035 * t.health * t.plague * Math.sqrt(t.contagion) * (n > 60 ? 1.5 : 1) * (army.home.count.fieldhospital ? 0.6 : 1) * (army.goal === 'garrison' ? 0.5 : 1);
  if (rnd() < n * fever * 20 / TPY) { const v = S0[rint(S0.length)]; campDeath(army, v, 'died of camp fever'); }
  if (!S0.length) return;
  const cold = seasonAt(army.y) < -0.07 && W.temp[i] < 0.5, biome = W.biome[i];
  if (cold && !t.car && rnd() < n * 0.1 * 20 / TPY) { const v = S0[rint(S0.length)]; campDeath(army, v, 'froze on the march'); }
  if (!S0.length) return;
  if (biome === B.DESERT && !t.car && !W.river[i] && rnd() < n * 0.08 * 20 / TPY) { const v = S0[rint(S0.length)]; campDeath(army, v, 'died of thirst on the march'); }
  if (!S0.length) return;
  // hired swords go when the money does
  if (army.mercs > 0 && army.pol.cur.unpaid > 0 && rnd() < 0.25) {
    const v = S0.find(p => p.merc && p !== army.general);
    if (v) { removeFromArmy(v); plog(v, `Walked out of the ${army.name}: no pay, no fight.`); dismissSoldier(v); v.task = T_RETURN; army.mercs--; army.deserted = (army.deserted || 0) + 1; }
  }
  // a levy goes home for the harvest whatever its lord says, and anyone is homesick after a year away; professionals stay
  if (army.levy && army.goal !== 'garrison' && W.tick - army.start > 60) {
    const autumn = seasonOf() === 2, long = W.tick - army.start > TPY;
    const go = autumn ? Math.ceil(n * 0.03) : long && rnd() < 0.5 ? 1 : 0;
    for (let k = 0; k < go; k++) {
      const v = S0[rint(S0.length)];
      if (!v || v === army.general || v.merc || v.prevJob === J.SOLDIER) continue;
      removeFromArmy(v); plog(v, `Went home from the ${army.name}${autumn ? ' to get the harvest in' : ''}.`); dismissSoldier(v); v.task = T_RETURN; army.deserted = (army.deserted || 0) + 1;
    }
    if (long) army.morale = Math.max(0, army.morale - 0.12);
  }
  // and when the pay and the food stop, people leave, sooner if nobody at home wants this war
  if ((army.morale < 28 || (army.pol.support < 22 && army.morale < 45)) && rnd() < 0.3) {
    const v = S0[rint(S0.length)];
    if (v && v !== army.general) { removeFromArmy(v); plog(v, `Deserted the ${army.name}.`); dismissSoldier(v); v.task = T_RETURN; army.deserted = (army.deserted || 0) + 1; }
  }
}
// Replacements: while the realm is mobilised, drafts from home fill the gaps in a host that is still in the field.
function reinforce(army) {
  if (army.goal === 'raid' || army.goal === 'garrison' || army.militia || !army.war || army.war.ended || W.tick - (army.reinfT || 0) < 120) return;
  army.reinfT = W.tick;
  const pol = army.pol, home = army.home, S0 = army.soldiers;
  if (!army.peak) army.peak = S0.length;
  if ((pol.mob || 0) < 0.3 || S0.length >= army.peak * 0.7 || !home.alive || home.attack || home.occupier || home.polity !== pol) return;
  const first = S0.find(p => !p.aboard);
  if (!first || W.landId[first.ti] !== W.landId[home.i]) return;
  const e = pol.era || 0, fit = home.members.filter(p => callable(p, e));
  const n = Math.min(Math.floor(army.peak * 0.7) - S0.length, Math.floor(fit.length * levyShare(home, pol) * 0.5), 160);
  if (n < 3) return;
  fit.sort((x, y) => y.str - x.str);
  const w0 = Math.max(2, army.width);
  for (let k = 0; k < n; k++) {
    const p = fit[k];
    p.prevJob = p.job; p.army = army; p.job = J.SOLDIER; p.task = T_WAR; p.step = 0; p.st = 0; p.wake = W.tick + rint(16); p.carry = 0; p.ctype = -1; p.hidden = false; p.sideJ = 0;
    p.slotX = k % w0 - (w0 - 1) / 2; p.slotY = army.ranks + Math.floor(k / w0);
    issueGear(p, home); withhold(army, p);
    S0.push(p);
  }
  army.ranks += Math.ceil(n / w0);
  formUnits(army);
  army.morale = Math.min(95, army.morale + 4);
  if (n * (army.rep || 1) >= 150) chronT('war', `${n * (army.rep || 1)} fresh drafts from ${home.name} march out to fill the ranks of the ${army.name}.`, home);
}
// Beaten but not destroyed: what's left falls back on the nearest friendly town to lick its wounds and wait for drafts.
function retreatArmy(army) {
  const S0 = army.soldiers;
  if (army.militia || army.goal === 'garrison' || army.goal === 'raid' || !army.war || army.war.ended || S0.length < Math.max(8, army.peak * 0.25)) return false;
  const first = S0.find(p => !p.aboard);
  if (!first) return false;
  const land = W.landId[first.ti], pol = army.pol;
  let best = null, bd = 60 * 60;
  for (const t of W.towns) {
    if (!t.alive || t.occupier || t.attack || W.landId[t.i] !== land || (t.polity !== pol && !areAllies(t.polity, pol))) continue;
    const d = (t.x - army.x) ** 2 + (t.y - army.y) ** 2;
    if (d < bd) { bd = d; best = t; }
  }
  if (!best) return false;
  army.target = best; army.goal = 'relieve'; army.regroup = true; army.phase = 'march'; army.path = null; army.arriveT = 0; army.holdT = 0; army.chase = null; army.start = W.tick;
  army.morale = Math.max(army.morale, 30);
  for (const p of S0) { p.task = T_WAR; p.step = 0; p.st = 0; p.wake = W.tick + rint(30); p.btl = null; p.foe = null; p.flee = false; }
  if (menOf(army) >= 100) chronT('war', `What is left of the ${army.name}, ${menOf(army)} strong, falls back on ${best.name} to regroup.`, best);
  return true;
}
function removeFromArmy(p) {
  const a = p.army;
  if (a) { const q = a.soldiers.indexOf(p); if (q >= 0) a.soldiers.splice(q, 1); }
  if (p.unit) { const u = p.unit, q = u.men.indexOf(p); if (q >= 0) { u.men[q] = u.men[u.men.length - 1]; u.men.pop(); } p.unit = null; }
}
// Burn what can't be carried: fields, plots, barns. It feeds the army and starves the enemy.
function pillage(army, hits) {
  let best = null, bd = 900;
  for (const t of W.towns) {
    if (t.polity === army.pol || !atWar(army.pol, t.polity) || t.occupier === army.pol) continue;
    const d = (t.x - army.x) ** 2 + (t.y - army.y) ** 2;
    if (d < bd) { bd = d; best = t; }
  }
  if (!best) return 0;
  let got = 0;
  for (let k = 0; k < hits; k++) {
    if (best.fields.length) {
      const f = pick(best.fields);
      if (W.stage[f.i] !== 0) { got += 4 + W.stage[f.i] * 3; W.stage[f.i] = 0; dirty(f.i); }
      W.fert[f.i] = Math.max(0, W.fert[f.i] - 12);
      if (FXH) FXH.burn(f.i % W.w, (f.i / W.w) | 0);
    } else if (best.plots.length) {
      const f = pick(best.plots);
      if (W.plant[f.i] === f.k) { W.plant[f.i] = 0; W.plantS[f.i] = 0; dirty(f.i); got += 3; if (FXH) FXH.burn(f.i % W.w, (f.i / W.w) | 0); }
    } else got += 1;
  }
  const scorched = best.scorched > W.tick;
  const taken = Math.min(best.stock[R.FOOD] * (scorched ? 0.01 : 0.03), army.soldiers.length * (army.rep || 1));
  best.stock[R.FOOD] -= taken; got += taken;
  if (scorched) got *= 0.25;  // the country was burned before they got there
  army.food += got;
  army.razed++;
  best.warYear = year();
  best.unrest = Math.min(100, (best.unrest || 0) + 0.5);
  adjustRel(best.polity, army.pol, -0.4);
  if (army.war) army.war.razed = (army.war.razed || 0) + (army.razed % 6 === 0 ? 1 : 0);
  if (army.razed === 6 && tn(best) > 30) chronT('war', `The ${army.name} is burning the fields around ${best.name}.`, best);
  return got;
}
function convoysTick() {
  const C = W.convoys;
  for (let k = C.length - 1; k >= 0; k--) {
    const c = C[k], a = c.army;
    if (!a || a.over || !a.soldiers.length) { C[k] = C[C.length - 1]; C.pop(); continue; }
    const dx = a.x - c.x, dy = a.y - c.y, d = Math.sqrt(dx * dx + dy * dy), v = c.motor ? 0.32 : 0.12;
    if (d < 3) { a.food += c.food; C[k] = C[C.length - 1]; C.pop(); continue; }
    c.x += dx / d * v; c.y += dy / d * v;
    if (W.tick % 30 !== k % 30) continue;
    // riders on the road
    for (const o of W.armies) {
      if (o.pol === c.pol || !atWar(o.pol, c.pol) || o.phase === 'embark' || o.phase === 'sail') continue;
      if ((o.x - c.x) ** 2 + (o.y - c.y) ** 2 < 25) {
        o.food += c.food * 0.7;
        if (FXH) FXH.burn(c.x, c.y);
        if (o.war) o.war.convoys = (o.war.convoys || 0) + 1;
        C[k] = C[C.length - 1]; C.pop();
        break;
      }
    }
  }
}

// ---- every so often: where's the host, is it fed, who's nearby, what next? ----
function armyUpdate(army) {
  const tg = army.target, pol = army.pol, S0 = army.soldiers;
  if (army.phase === 'sail') {
    if (!S0.length) { endArmy(army); return; }  // the whole host went down with its ships
    if (army.landed || army.sailing === 0 || !W.ships.some(s => s.army === army)) {
      army.phase = 'march'; army.path = null; for (const p of S0) if (!p.aboard) { p.task = T_WAR; p.step = 0; p.st = 0; p.wake = W.tick + rint(20); }
      // an amphibious landing: unopposed is a gift, under the guns of a host waiting on the beach is a slaughter
      if (army.landed && !army.saidLand && S0.length) {
        army.saidLand = 1;
        const lx = army.landing ? army.landing.land % W.w : army.x, ly = army.landing ? (army.landing.land / W.w) | 0 : army.y;
        const foe = W.armies.find(o => o.pol !== pol && atWar(pol, o.pol) && o.phase !== 'sail' && (o.x - lx) ** 2 + (o.y - ly) ** 2 < 200);
        if (foe) { army.morale = Math.max(0, army.morale - 12); for (let q = 0; q < Math.ceil(S0.length * 0.05); q++) { const v = S0[rint(S0.length)]; if (v && v !== army.general) campDeath(army, v, 'killed in the landing'); } }
        if (menOf(army) >= 60) chronT('war', foe ? `The ${army.name} lands under the guns of the ${foe.name}, and pays for every yard of beach.` : `The ${army.name} comes ashore unopposed.`, army.target);
      }
    }
    return;
  }
  if (S0.length === 0) { endArmy(army); return; }
  let sx = 0, sy = 0, n = 0;
  for (let k = 0; k < S0.length; k++) { const p = S0[k]; if (p.aboard) continue; sx += p.ti % W.w; sy += (p.ti / W.w) | 0; n++; }
  if (n) { army.x = sx / n; army.y = sy / n; }
  if (army.general && !army.general.alive) {  // someone has to take over
    let best = null, bs = -1;
    for (const p of S0) { const v = p.leadM * 3 + Math.min(p.xp, 30) * 0.1 + p.fame * 0.5; if (v > bs) { bs = v; best = p; } }
    army.general = best;
  }
  if (army.phase === 'embark') { armyEmbark(army); return; }
  if (army.battle) { armyAttrition(army); supplyArmy(army); return; }

  if (!army.home.alive) army.home = pol.capital && pol.capital.alive ? pol.capital : army.home;
  if (army.goal === 'garrison') { garrisonUpdate(army); return; }
  const valid = tg.alive && army.war && !army.war.ended && tg.occupier !== pol && (tg.polity === pol || areAllies(pol, tg.polity) || atWar(pol, tg.polity) || (tg.occupier && atWar(pol, tg.occupier)) || ourSide(army.war, pol).includes(tg.polity));
  if (!valid) { if (!nextObjective(army)) endArmy(army); return; }
  armyStrength(army);
  supplyArmy(army);
  armyAttrition(army);
  if (!S0.length) { endArmy(army); return; }
  for (let k = 0; k < S0.length; k++) { const p = S0[k]; if (p.hp < maxHP(p)) p.hp = Math.min(maxHP(p), p.hp + 0.6); if (p.stam < 100) p.stam = Math.min(100, p.stam + 8); if (p.wound && rnd() < 0.01) p.wound = 0; }
  army.morale = clamp(army.morale + (army.food > 0 ? 0.08 : -0.3), 0, 100);
  if (encounter(army)) return;
  // the last day's march: the town comes out to fight, or shuts its gates; a relief army brings the besiegers to battle
  if (army.phase === 'march' && tg.alive) {
    const d2 = (army.x - tg.x) ** 2 + (army.y - tg.y) ** 2, left = army.path ? army.path.length - 1 - army.pi : 99;
    if (d2 < 260 || left < 18) {
      if ((army.goal === 'conquer' || army.goal === 'raid') && !army.met && !tg.attack && !tg.occupier && d2 > 25) { army.met = 1; if (sallyOut(tg, army)) return; }
      const B = tg.attack;
      if (B && B.town === tg && B.stage === 'invest' && army.goal !== 'raid' && !ourSide(army.war, B.sA.pol).includes(pol) && (B.sB.pol === pol || ourSide(army.war, pol).includes(B.sB.pol) || areAllies(pol, B.sB.pol)) && reliefBattle(B, army)) return;
    }
  }
  reinforce(army);

  if (army.phase === 'muster') {
    // the host waits at the rally point until most of the contingents are in, or until it can't wait any longer
    if (W.tick >= army.musterEnd) {
      const rx = army.rally % W.w, ry = (army.rally / W.w) | 0;
      let inn = 0; for (const p of S0) { const dx = p.ti % W.w - rx, dy = ((p.ti / W.w) | 0) - ry; if (dx * dx + dy * dy < 100) inn++; }
      const fast = army.goal === 'intercept' || army.goal === 'relieve';
      if ((inn >= S0.length * (fast ? 0.4 : 0.75) || W.tick > army.musterEnd + (fast ? 25 : 90)) && planRoute(army)) army.phase = 'march';
    }
    return;
  }
  // nobody crosses a northern winter who can help it
  const here = Math.round(army.y) * W.w + Math.round(army.x), winter = seasonAt(army.y) < -0.07 && W.temp[here] < 0.45 && !army.home.mod.car && (W.tick - army.start) > 80;
  const nearTarget = Math.hypot(army.x - tg.x, army.y - tg.y) < 18;
  army.camp = winter && !nearTarget;
  if (army.camp) return;
  // a host sent to stop another goes looking for it instead of waiting at home
  const ch = army.chase;
  if (ch && (ch.over || !ch.soldiers.length || ch.phase === 'sail' || (army.chaseUntil && W.tick > army.chaseUntil))) { army.chase = null; army.chaseUntil = 0; if (army.goal !== 'intercept') army.path = null; }
  else if (ch && W.tick - (army.chaseT || 0) >= 80) {
    army.chaseT = W.tick;
    const from = S0[0].ti, to = Math.round(ch.y) * W.w + Math.round(ch.x);
    if (!W.water[to] && W.landId[to] === W.landId[from]) {
      nodeBudget = Math.max(nodeBudget, 1);
      const p2 = findPath(from, to, 0);
      if (p2 && p2 !== PATH_BUSY) { army.path = p2; army.pi = Math.min(army.ranks * 1.1, p2.length - 1); army.arriveT = 0; }
    }
  }
  if (!army.path) { planRoute(army); return; }
  // the head of the column moves on at the pace of its slowest
  const P = army.path, L = P.length - 1;
  let budget = 20 * 2.5 * army.home.mod.speed * (army.guns.length ? 0.8 : 1) * clamp(army.morale / 50, 0.7, 1.1);
  if (army.goal === 'relieve') budget *= 1.2;
  if (army.forced) {
    budget *= 1.45;
    army.morale = Math.max(0, army.morale - 0.15);
    if (rnd() < S0.length * 0.002) { const v = S0[rint(S0.length)]; if (v && v !== army.general) campDeath(army, v, 'collapsed on a forced march'); }
    if (!army.saidForced) { army.saidForced = 1; if (menOf(army) >= 150) chronT('war', `The ${army.name} goes on a forced march to ${tg.name}, and leaves stragglers all along the road.`, tg); }
  }
  while (budget > 0 && army.pi < L + army.ranks * 1.1) { const c = army.pi < L ? W.cost[P[Math.floor(army.pi) + 1]] || 10 : 10; budget -= c; army.pi++; }
  let arrived = 0;
  for (let k = 0; k < S0.length; k++) { const p = S0[k], dx = p.ti % W.w - tg.x, dy = ((p.ti / W.w) | 0) - tg.y; if (dx * dx + dy * dy < 120) arrived++; }
  if (arrived >= Math.ceil(S0.length * 0.6) && !army.chase) { arriveAt(army); return; }
  if (army.pi >= L && !army.arriveT) army.arriveT = W.tick;
  if (army.arriveT && W.tick - army.arriveT > 120 && arrived > 0) { arriveAt(army); return; }
  if (W.tick - army.start > TPY * 7) { if (tg.alive) chronT('war', `The ${army.name} gives up on ${tg.name} and turns for home.`, tg); endArmy(army); }
}
function armyEmbark(army) {
  const a = army.home, S0 = army.soldiers;
  const quay = portOf(a);
  if (quay < 0) { endArmy(army); return; }
  let waiting = 0;
  const ships = commandeer(a, S0.length, army);
  let si = 0;
  for (const p of S0) {
    if (p.aboard) continue;
    waiting++;
    const dx = p.ti % W.w - a.portB % W.w, dy = ((p.ti / W.w) | 0) - ((a.portB / W.w) | 0);
    if (dx * dx + dy * dy > 16 || si >= ships.ships.length) continue;
    let s = ships.ships[si];
    if (s.pass.length >= shipDef(s).men) { si++; s = ships.ships[si]; if (!s) continue; }
    s.mission = 'carry'; s.army = army; s.landing = army.landing.water; s.landTile = army.landing.land; s.wait = W.tick + 1e7;
    boardShip(p, s);
    waiting--;
  }
  if ((waiting === 0 && S0.length) || W.tick > army.embarkBy) {
    for (const s of a.ships) if (s.mission === 'carry' && s.army === army) { s.ready = true; army.sailing++; }
    if (army.sailing === 0) { endArmy(army); return; }
    for (const p of S0.slice()) if (!p.aboard) { removeFromArmy(p); dismissSoldier(p); }
    army.phase = 'sail';
  }
}
// Who's in the way? Hosts within sight fight or slip away, and anyone near a battle their side's in comes to help.
function encounter(army) {
  const pol = army.pol, x = army.x, y = army.y;
  for (const B of W.battles) {
    if (B.over) continue;
    const d = (B.x - x) ** 2 + (B.y - y) ** 2;
    if (d > 256) continue;
    const onA = pol === B.sA.pol || areAllies(pol, B.sA.pol), onB = pol === B.sB.pol || areAllies(pol, B.sB.pol);
    if (onA && atWar(pol, B.sB.pol)) { joinBattle(B, army, B.sA); return true; }
    if (onB && atWar(pol, B.sA.pol)) { joinBattle(B, army, B.sB); return true; }
  }
  let seek = null, sd = 1e9;
  for (const o of W.armies) {
    if (o === army || o.battle || !atWar(pol, o.pol) || o.phase === 'embark' || o.phase === 'sail') continue;
    const dx = o.x - x, dy = o.y - y, dd = dx * dx + dy * dy;
    // scouts see a host a day's march off; a stronger army on campaign goes after it rather than walk past
    if (dd > 230) { if (dd < 700 && !army.chase && army.phase === 'march' && army.goal !== 'raid' && army.goal !== 'garrison' && o.goal !== 'garrison' && !o.militia && dd < sd) { seek = o; sd = dd; } continue; }
    if (o.fabian && W.tick - (o.harryT || 0) < 120 && rnd() < 0.65) continue;  // a shadowing army that won't stand is hard to bring to battle
    // scouts report what's over the hill; a much weaker host tries to get away if it isn't defending anything
    const mine = armyStrength(army), theirs = armyStrength(o);
    const defending = army.goal === 'relieve' || army.goal === 'intercept' || army.goal === 'garrison';
    // Fabian war: a careful general who is badly outnumbered won't give battle at all, but shadows the enemy, cuts up its foragers and burns its wagons
    const g = army.general && army.general.alive ? army.general : null;
    if (mine < theirs * 0.5 && g && army.goal !== 'garrison' && army.goal !== 'raid' && army.soldiers.length >= 10 && (hasTr(g, SLY) || hasTr(g, WARY) || g.leadM >= 1.2)) {
      if (W.tick - (army.harryT || 0) < 60) continue;
      army.harryT = W.tick;
      o.food *= 0.88; o.morale = Math.max(0, o.morale - 3);
      for (let q = 0; q < 2; q++) { const v = o.soldiers[rint(o.soldiers.length)]; if (v && v !== o.general) campDeath(o, v, 'cut down while foraging'); }
      if (!army.fabian) { army.fabian = 1; if (menOf(army) >= 60) chronT('war', `${g.name} will not give battle to the larger ${o.name}, and harries its foragers and baggage instead.`, army.home); }
      continue;
    }
    if (!defending && mine < theirs * 0.45 && rnd() < 0.7 && W.tick - army.lastEnc > 100) {
      army.lastEnc = W.tick;
      if (army.soldiers.length >= 15 && rnd() < 0.4) chronT('war', `The ${army.name} declines battle against the larger ${o.name} and falls back.`, army.home);
      endArmy(army);
      return true;
    }
    startBattle(army, o, null, { kind: o.chase === army || army.chase === o ? 'intercept' : 'meet' });
    return true;
  }
  if (seek && W.tick - (army.seekT || 0) > 200) {
    army.seekT = W.tick;
    const g = army.general && army.general.alive ? army.general : null;
    if (armyStrength(army) > armyStrength(seek) * (hasTr(g, BOLD) ? 0.9 : 1.25) && rnd() < 0.6) {
      army.chase = seek; army.chaseUntil = W.tick + 160; army.chaseT = 0;
      if (menOf(army) >= 120) chronT('war', `Scouts find the ${seek.name} a day's march off, and the ${army.name} turns to bring it to battle.`, army.target);
    }
  }
  return false;
}
// Whoever fights on the same side in a war, allies or not.
const ourSide = (war, pol) => !war ? [pol] : war.a.includes(pol) ? war.a : war.b.includes(pol) ? war.b : [pol];
// An army is a day's march off. With walls and the odds against them, the town shuts its gates and waits; otherwise its people
// march out to meet the enemy on the best ground they can find between, and so most battles are fought in the open.
function sallyOut(t, inv) {
  const pol = t.polity, war = inv.war;
  // a field army of theirs nearby comes to stop it instead
  for (const o of W.armies) {
    if (o.battle || o.over || o.goal === 'garrison' || o.militia || o.phase === 'sail' || o.phase === 'embark' || !(o.pol === pol || ourSide(war, pol).includes(o.pol))) continue;
    if ((o.x - t.x) ** 2 + (o.y - t.y) ** 2 > 900) continue;
    if (!o.chase) { o.chase = inv; o.chaseT = 0; o.chaseUntil = W.tick + 200; }
    return false;
  }
  if (t.nomad || tn(t) < 12) return false;
  const theirs = armyStrength(inv), mine = levyStrength(t);
  const walls = t.walls && t.fortHP > t.fortMax * 0.4;
  const rul = pol.ruler && pol.ruler.alive ? pol.ruler : null;
  const nerve = (hasTr(rul, BOLD) ? 1.25 : hasTr(rul, WARY) ? 0.8 : 1) * (inv.goal === 'raid' ? 1.4 : 1);
  if (mine * nerve < theirs * (walls ? 1.1 : 0.55)) {
    if (walls && tn(t) >= 40) chronT('war', `${t.name} shuts its gates as the ${inv.name} comes into sight.`, t);
    return false;
  }
  // the best ground between town and enemy: a ridge, or a river in front of it
  let gx = t.x, gy = t.y, gs = -1e9;
  const dx = inv.x - t.x, dy = inv.y - t.y, d = Math.max(1, Math.hypot(dx, dy)), px = -dy / d, py = dx / d;
  for (const f of [0.25, 0.4, 0.55]) for (const l of [-3, 0, 3]) {
    const x = Math.round(t.x + dx * f + px * l), y = Math.round(t.y + dy * f + py * l);
    if (x < 1 || y < 1 || x >= W.w - 1 || y >= W.h - 1) continue;
    const i = y * W.w + x;
    if (W.water[i] || W.landId[i] !== W.landId[t.i]) continue;
    let s = (W.elev[i] - W.elev[Math.round(inv.y) * W.w + Math.round(inv.x)]) * 60 - Math.abs(l) * 0.1;
    for (let q = 1; q < 6; q++) { const j = Math.round(y + (inv.y - y) * q / 6) * W.w + Math.round(x + (inv.x - x) * q / 6); if (W.river[j] && !W.water[j]) { s += 4; break; } }
    if (s > gs) { gs = s; gx = x; gy = y; }
  }
  const host = raiseMilitia(t, { war });
  if (host.soldiers.length < 6) { disbandMilitia(host, t); return false; }
  host.name = `Levy of ${t.name}`;
  const B = startBattle(inv, host, null, { kind: inv.goal === 'raid' ? 'levy' : 'sally', ground: { x: gx, y: gy }, town: t });
  if (!B) { disbandMilitia(host, t); return false; }
  return true;
}
// What a town's levy would be worth in the open, on the same scale as armyStrength: the share of its grown-ups raiseMilitia would take,
// armed from its racks as far as they go, at a levy's middling nerve. No walls out there.
function levyStrength(t) {
  let n = 0;
  for (const p of t.members) { const v = ageOf(p); if (v >= 15 && v < 58 && !p.army && !p.aboard) n++; }
  n = Math.ceil(n * (t.count.barracks ? 0.7 : 0.55));
  let w = 0, best = 0, a = 0, bestA = 0;
  for (let k = WEAPONS.length - 1; k >= 1; k--) if (t.arsenal[k] >= 1) { w += t.arsenal[k]; if (!best) best = k; }
  for (let k = ARMORS.length - 1; k >= 1; k--) if (t.armor[k] >= 1) { a += t.armor[k]; if (!bestA) bestA = k; }
  const armed = Math.min(1, w / Math.max(1, n)), armd = Math.min(1, a / Math.max(1, n));
  const per = 4 + (WEAPONS[best].dmg * armed + 2 * (1 - armed)), prot = 1 + ARMORS[bestA].prot * armd;
  return n * per * prot * Math.max(1, Math.round(Math.min(t.scale || 1, 60))) * ((50 + (t.mod.morale || 0)) / 60) * Math.sqrt(t.mod.attack);
}
// A relief army close by: the besiegers can't fight the town and the relief at once. They turn to face it (from behind their
// own lines, if they dug them), and the siege waits on the outcome.
function reliefBattle(B, rel) {
  const t = B.town, bes = B.sA.armies.filter(a => !a.militia && !a.over && a.soldiers.length);
  if (!bes.length || B.over) return false;
  const lines = !!B.lines;
  suspendSiege(B);
  const nb = startBattle(rel, bes[0], null, { kind: 'relief', lines, town: t });
  if (nb) for (const a of bes.slice(1)) joinBattle(nb, a, nb.sB);
  return !!nb;
}
function arriveAt(army) {
  const tg = army.target, pol = army.pol;
  army.arriveT = 0;
  // at the gates at last: the town's last chance to come out and fight rather than be besieged
  if ((army.goal === 'conquer' || army.goal === 'raid') && !army.met && tg.alive && !tg.attack && !tg.occupier && atWar(pol, tg.polity)) { army.met = 1; if (sallyOut(tg, army)) return; }
  if (army.goal === 'raid') {
    // burn and carry off, then go home before anyone comes
    pillage(army, 6);
    army.raidT = (army.raidT || 0) + 1;
    if (army.raidT === 1 && army.soldiers.length >= 8 && tn(tg) > 15) chronT('war', `Raiders of ${pol.name} fall on the country round ${tg.name}.`, tg);
    if (army.raidT > 8 || army.food > army.foodMax * 3) {
      const loot = Math.min(army.food * 0.5, 200);
      if (army.home.alive) army.home.stock[R.FOOD] += loot;
      if (army.war) army.war.scoreA += (sideOf(army.war, pol) === 'a' ? 0.3 : -0.3);
      endArmy(army);
    }
    return;
  }
  if (tg.occupier === pol) { if (!nextObjective(army)) endArmy(army); return; }
  if (tg.attack) {
    // already under siege: join in, on whichever side we're on
    const B = tg.attack;
    if (B.sA.pol === pol || areAllies(pol, B.sA.pol)) joinBattle(B, army, B.sA);
    else if (B.sB.pol === pol || areAllies(pol, B.sB.pol) || atWar(pol, B.sA.pol)) joinBattle(B, army, B.sB);
    return;
  }
  if (army.goal === 'relieve' || army.goal === 'intercept') {
    if (!army.holdT) army.holdT = W.tick;
    if (W.tick - army.holdT > 260) { if (!nextObjective(army)) endArmy(army); }
    return;
  }
  if (!atWar(pol, tg.polity) && !(tg.occupier && atWar(pol, tg.occupier))) { if (!nextObjective(army)) endArmy(army); return; }
  startBattle(army, null, tg);
}
function nextObjective(army) {
  const war = army.war, pol = army.pol;
  if (!war || war.ended) return false;
  if (army.soldiers.length < 8 || army.morale < 25 || army.food <= 0) return false;
  const foes = sideOf(war, pol) === 'a' ? war.b : war.a;
  const land = W.landId[army.soldiers[0].ti];
  let best = null, bs = 0;
  for (const o of W.towns) {
    if (W.landId[o.i] !== land) continue;
    const mine = o.polity === pol;
    if (mine ? !(o.occupier && foes.includes(o.occupier)) : !foes.includes(o.polity) || o.occupier) continue;
    const d = Math.hypot(o.x - army.x, o.y - army.y);
    if (d > 60) continue;
    const v = (6 + Math.sqrt(tn(o))) / (d + 8) * (mine ? 2 : 1) / (1 + o.fortHP / 200);
    if (v > bs) { bs = v; best = o; }
  }
  if (!best) return false;
  army.target = best; army.start = W.tick; army.phase = 'march'; army.path = null; army.goal = best.polity === pol ? 'liberate' : army.goal === 'raid' ? 'raid' : 'conquer'; army.holdT = 0; army.raidT = 0; army.regroup = false;
  for (const p of army.soldiers) { p.task = T_WAR; p.step = 0; p.st = 0; p.wake = W.tick + rint(30); p.btl = null; p.foe = null; p.flee = false; }
  return true;
}

// ---- occupation: a taken town keeps its people and its flag until the treaty says otherwise ----
function occupy(t, army, B) {
  const pol = army.pol, old = t.polity, home = army.home;
  const rul = pol.ruler && pol.ruler.alive ? pol.ruler : null;
  const cruel = rul && hasTrait(rul, 'cruel');
  const loot = cruel ? 0.65 : 0.4;
  for (let r = 0; r < R.N; r++) { const a = t.stock[r] * loot; t.stock[r] -= a; if (home.alive) home.stock[r] += a * 0.7; }
  for (let k = 0; k < WEAPONS.length; k++) { const a = Math.floor(t.arsenal[k] * 0.5); t.arsenal[k] -= a; if (home.alive) home.arsenal[k] += a; }
  // the town chest goes home too, at whatever it's worth
  { const v = t.cash * loot; t.cash -= v; if (pol.cur.kind >= 2) pol.cur.treasury += v * old.cur.value / Math.max(pol.cur.value, 0.0001); }
  const wasCap = old.capital === t;
  t.occupier = pol; t.occSince = year();
  W.terrDirty = true;
  pol.conquests++;
  if (!army.war || army.war.cause !== 'revolt') pol.infamy = (pol.infamy || 0) + (6 + Math.sqrt(tn(t)) * 0.6) * (wasCap ? 2 : 1);
  old.lost = old.lost || {}; old.lost[pol.id] = year();
  teach(t, home, 0.3); teach(home, t, 0.3);
  stealMilitary(t, home, 0.5);
  t.warYear = year();
  t.unrest = (t.unrest || 0) + 25;
  army.taken++;
  const dead = B.sA.dead + B.sB.dead;
  chronT('war', dead < 4 ? `${t.name} opens its gates to the ${polityTitle(pol)}.` : cruel ? `${t.name} falls to the ${polityTitle(pol)} and is put to the sword. ${dead} die in the fighting, and the sack is worse.` : `${t.name} falls to the ${polityTitle(pol)} after a fight that cost ${dead} lives.`, t);
  pathXP(pol, 'con', 120);
  if (cruel) {
    // the people simulated one by one, then the same share of the crowd behind them (tn counts both; members holds only the first)
    for (let k = t.members.length - 1; k >= 0; k--) { const p = t.members[k]; if (p && rnd() < 0.18 && !p.army) killPerson(p, 'killed in the sack'); }
    if (t.alive && t.folk > 0) { const f = Math.floor(t.folk * 0.18); t.folk -= f; W.folkN -= f; t.scale = tn(t) / Math.max(1, t.members.length); }
    if (!t.alive) return;
    let burned = 0;
    for (const b of t.blds.slice()) { if (b.type === 'hearth' || b.up >= 0) continue; if (rnd() < 0.12) { if (FXH) FXH.burn(b.x, b.y); removeBuilding(b); burned++; } }
  }
  if (wasCap) {
    old.stab -= 25;
    const heirs = W.towns.filter(o => o.polity === old && !o.occupier);
    old.capital = heirs.length ? heirs.sort((a, b) => tn(b) - tn(a))[0] : t;
  }
  if (army.war) { army.war.taken++; army.war.scoreA += sideOf(army.war, pol) === 'a' ? 0.6 : -0.6; }
  // part of the host stays behind to hold it
  const stay = Math.min(army.soldiers.length - 8 > 0 ? Math.ceil(army.soldiers.length * 0.2) : 0, 8 + Math.floor(tn(t) * 0.08));
  if (stay >= 3) {
    const g = { id: W.nextId++, pol, war: army.war, home: army.home, target: t, goal: 'garrison', soldiers: [], units: [], start: W.tick, size: stay, battle: null, kills: 0, lost: 0, tgtPol: t.polity, phase: 'garrison', morale: army.morale, general: null, guns: [], landed: false, sailing: 0, x: t.x, y: t.y, name: `Garrison of ${t.name}`, taken: 0, path: null, pi: 0, rally: t.i, food: stay * 3, foodMax: stay * 5, power: 0, musterEnd: 0, militia: false, nextConvoy: 0, wins: 0, starving: 0, camp: false, razed: 0, side: null, lastEnc: 0, width: 4, ranks: 0, arriveT: 0 };
    const moved = army.soldiers.splice(army.soldiers.length - stay, stay);
    for (const p of moved) { if (p.unit) { const u = p.unit, q = u.men.indexOf(p); if (q >= 0) { u.men[q] = u.men[u.men.length - 1]; u.men.pop(); } p.unit = null; } p.army = g; p.task = T_WAR; p.step = 0; p.st = 0; p.wake = W.tick + rint(30); g.soldiers.push(p); }
    g.general = g.soldiers[0];
    g.rep = army.rep || 1; g.hpK = army.hpK || 1; g.peak = stay; g.reinfT = W.tick;
    const hs = Math.min(army.held || 0, stay * (g.rep - 1)); g.held = hs; army.held = (army.held || 0) - hs;
    formUnits(g);
    t.garrison = g;
    W.armies.push(g);
  }
}
function garrisonUpdate(g) {
  const t = g.target;
  armyStrength(g);
  if (!t.alive || t.occupier !== g.pol) { endArmy(g); return; }
  if (t.stock[R.FOOD] > 2) { const a = Math.min(t.stock[R.FOOD] * 0.02, g.soldiers.length * 0.1); t.stock[R.FOOD] -= a; g.food = Math.min(g.foodMax, g.food + a); }
  armyAttrition(g);
  if (!g.soldiers.length) { endArmy(g); return; }
  encounter(g);
}
function occupationYear(t) {
  const occ = t.occupier;
  if (!occ.alive || !t.alive || !atWar(occ, t.polity)) { liberate(t, null); return; }
  // tribute to the occupier, and resentment
  if (occ.capital && occ.capital.alive) for (const r of [R.FOOD, R.GOLD, R.GOODS, R.STEEL, R.TOOLS]) { const a = t.stock[r] * 0.12; t.stock[r] -= a; occ.capital.stock[r] += a; }
  t.unrest = Math.min(100, t.unrest + 6);
  const garr = t.garrison && !t.garrison.over ? t.garrison.soldiers.length : 0;
  const n = tn(t);
  // partisans rise when the garrison's small and the people have had enough; woods and hills to hide in make it a guerrilla war
  const rough = (W.tree[t.i] > 2 ? 1 : 0) + ((W.elev[t.i] || 0) > 0.55 ? 1 : 0), modern = (t.polity.era || 0) >= 6;
  if (rnd() < (0.05 + (t.unrest / 100) * 0.25) * (1 + rough * 0.4) - garr / Math.max(n, 1) * 0.5) {
    const hit = Math.min(garr, 1 + rint(4) + rough + (modern ? 2 : 0));
    occ.warTired = (occ.warTired || 0) + 0.01 * (1 + rough);
    if (rough && !t.guerrilla && n > 30) { t.guerrilla = 1; chronT('war', `The hills and woods round ${t.name} fill with guerrillas. The ${occ.name} garrison holds the town by day and nothing at night.`, t); }
    for (let k = 0; k < hit && t.garrison; k++) { const v = t.garrison.soldiers[rint(t.garrison.soldiers.length)]; if (v) killPerson(v, 'killed by partisans'); }
    if (FXH) FXH.burn(t.x, t.y);
    if (!t.garrison || !t.garrison.soldiers.length) { liberate(t, 'rises and throws out'); return; }
    if (rnd() < 0.2 && n > 30) chronT('war', `Partisans in ${t.name} ambush the garrison of ${occ.name}.`, t);
  }
}
function liberate(t, how) {
  const old = t.occupier;
  if (!old) return;
  t.occupier = null;
  if (t.garrison) { const g = t.garrison; t.garrison = null; endArmy(g); }
  W.terrDirty = true;
  if (how && t.alive) chronT('war', `${t.name} ${how} its ${old.name} occupiers.`, t);
}
function annex(t, pol) {
  const g = t.garrison;
  t.occupier = null; t.garrison = null;
  transferTown(t, pol);
  // settlers follow the flag, and over time the new town learns its new rulers' ways
  const cap0 = pol.capital;
  if (cap0 && cap0.alive && cap0 !== t && W.landId[cap0.i] === W.landId[t.i]) {
    const movers = founders(cap0, Math.min(14, Math.floor(tn(cap0) * 0.03)));
    for (const p of movers) { moveTo(p, t); startMigrate(p, nearTile(t.i, 3)); }
    teach(cap0, t, 0.25);
    t.settledBy = pol.id;
  }
  if (g) {
    // the garrison settles in as the new order, and the men behind each figure with it
    if (g.held > 0) { t.folk += g.held; W.folkN += g.held; g.held = 0; }
    for (const p of g.soldiers.slice()) { removeFromArmy(p); p.army = null; p.prevJob = J.SOLDIER; p.btl = null; returnGear(p, p.town); moveTo(p, t); p.job = J.SOLDIER; p.task = 0; p.st = 0; p.wake = W.tick + rint(40); }
    endArmy(g);
  }
}
function stealMilitary(from, to, chance) {
  for (let i = 0; i < NT; i++) {
    const T = TECHS[i];
    if (!T.mil || !from.tech[i] || to.tech[i] || !eligible(to, T)) continue;
    if (rnd() < chance) {
      learn(to, i);
      if (tn(to) > 40) chronT('spread', `${to.name} learns ${T.name} the hard way, from the enemy in the field.`, to);
      return;
    }
  }
}
// ---- the end of it ----
function endWar(war, winner, how) {
  if (war.ended) return;
  war.ended = true;
  const k = W.wars.indexOf(war); if (k >= 0) W.wars.splice(k, 1);
  const yr = year();
  const all = war.a.concat(war.b);
  for (const p of war.a) for (const q of war.b) {
    if (p.warsWith[q.id] === war) delete p.warsWith[q.id];
    if (q.warsWith[p.id] === war) delete q.warsWith[p.id];
    p.truce[q.id] = q.truce[p.id] = yr + 15 + rint(25);
    adjustRel(p, q, 10);
  }
  for (const B of W.battles.slice()) if (B.war === war) battleEnd(B, rnd() < 0.5 ? 'a' : 'b', true);
  if (war.cause === 'revolt') revoltOver(war, winner);
  const win = winner === 'a' ? war.leadA : winner === 'b' ? war.leadB : null, lose = winner === 'a' ? war.leadB : winner === 'b' ? war.leadA : null;
  const winSide = winner === 'a' ? war.a : winner === 'b' ? war.b : [], loseSide = winner === 'a' ? war.b : winner === 'b' ? war.a : [];
  // what was taken: the winners keep it, the losers hand it back
  let ceded = 0, returned = 0;
  const cededNames = [];
  const G = war.goal, totalWin = how === 'conquest' || how === 'capitulation', mag = Math.abs(war.balance || 0);
  // the treaty follows the map: a narrow win keeps a little of what it holds, a crushing one keeps all of it
  const keep = totalWin ? 1 : clamp((mag - 10) / 45, 0.1, 1) * (G.annex !== undefined ? (G.annex || 0.5) : 0.4);
  for (const t of W.towns.slice()) {
    if (!t.occupier || !all.includes(t.occupier) || !all.includes(t.polity)) continue;
    const taker = t.occupier;
    if (winSide.includes(taker) && (totalWin || t === war.target || rnd() < keep)) { cededNames.push(t.name); annex(t, taker); ceded++; }
    else { liberate(t, null); returned++; }
  }
  for (const a of W.armies.slice()) if (a.war === war && !a.battle && a.phase !== 'sail') endArmy(a);
  war.endYear = Math.floor(yr);
  war.ceded = ceded;
  W.warLog.push({ name: war.name, from: Math.floor(war.start), to: war.endYear, dead: war.dead, sideA: war.a.map(p => p.name).join(', '), sideB: war.b.map(p => p.name).join(', '), winner: win ? win.name : null, cause: war.cause, taken: war.taken, sunk: war.sunk, battles: war.battles.length, ceded, prisoners: war.prisoners });
  if (W.warLog.length > 80) W.warLog.shift();
  W.warDead = (W.warDead || 0) + war.dead;
  const place = (win && win.capital) || (war.leadA.capital) || (war.leadB.capital);
  let terms = '';
  if (win && lose && lose.alive && (how === 'treaty' || how === 'capitulation') && war.cause !== 'revolt') {
    if (how === 'capitulation') terms += ` ${lose.name} surrenders unconditionally.`;
    if (ceded) terms += ` ${lose.name} cedes ${cededNames.length <= 4 ? cededNames.join(', ').replace(/, ([^,]*)$/, ' and $1') : ceded + ' towns'}, the towns it could not win back.`;
    if (returned) terms += ` ${returned === 1 ? 'One occupied town goes' : returned + ' occupied towns go'} back.`;
    if ((G.vassal || lose.pop < win.pop * 0.45 || how === 'capitulation') && lose.overlord === null && rnd() < (G.vassal || how === 'capitulation' ? 0.9 : 0.4)) { lose.overlord = win.id; terms += ` ${lose.name} becomes a vassal, and pays tribute.`; }
    else if (lose.capital && win.capital) {
      for (const r of [R.GOLD, R.GOODS, R.TOOLS]) { const v = lose.capital.stock[r] * 0.5; lose.capital.stock[r] -= v; win.capital.stock[r] += v; }
      const owed = Math.min(lose.cur.gdpLast * clamp(mag / 200, 0.05, 0.5) || 0, 1e7);
      if (lose.cur.kind >= 2 && owed > 0) { lose.cur.debt += owed; if (win.cur.kind >= 2) { win.cur.treasury += owed * fx(lose, win); flow(lose, win, 'war', owed * lose.cur.value); } terms += ` ${lose.name} owes ${Math.round(owed)} ${lose.cur.name}s in reparations, and will be paying for a generation.`; }
      else terms += ` ${lose.name} pays a heavy indemnity.`;
    }
    if (win.capital && lose.capital) stealMilitary(lose.capital, win.capital, 0.5);
    if (war.cause === 'debts' && win.unpaidBy) delete win.unpaidBy[lose.id];
  } else if (!win && returned) terms = ' Everything goes back as it was.';
  if (place && (war.dead >= 5 || war.taken) && war.cause !== 'revolt') chronT('war', `The ${war.name} ends after ${Math.max(1, Math.round(yr - war.start))} years and ${war.dead} dead. ${win ? win.name + ' has the better of it.' : 'Nobody really won.'}${terms}`, place);
  for (const pol of all) { if (pol.alive) { pol.warCool = Math.max(pol.warCool, 10 + rint(25)); pol.mob = Math.min(pol.mob || 0, 0.2); } }
}
// ---- the last resort: a realm that's losing badly and has the missiles will use them ----
function missileYear() {
  for (const t of W.towns) {
    if (!t.count.missilesilo || !t.tech[TECH_IX.nuclear] || t.occupier) continue;
    const pol = t.polity;
    for (const k in pol.warsWith) {
      const war = pol.warsWith[k], foe = W.polities[+k];
      if (!foe || !foe.alive || !foe.capital) continue;
      const bal = sideOf(war, pol) === 'a' ? (war.balance || 0) : -(war.balance || 0);
      const mad = W.towns.some(o => o.polity === foe && o.count.missilesilo);  // both sides lose if both have them
      const need = bal < -35 || (pol.capital && pol.capital.occupier);
      if (need && rnd() < (mad ? 0.05 : 0.18)) { launchMissile(t, foe.capital); return; }
    }
  }
}
function launchMissile(a, b) {
  W.missiles = W.missiles || [];
  W.missiles.push({ a, b, x0: a.x, y0: a.y, x1: b.x, y1: b.y, t: 0, v: 3.5 / Math.max(50, Math.hypot(a.x - b.x, a.y - b.y) * 6), pol: a.polity });
  chronT('war', `${a.polity.name} launches a missile from ${a.name}. Everyone who sees it knows where it's going.`, b);
}
function missilesTick() {
  const M = W.missiles;
  for (let k = M.length - 1; k >= 0; k--) {
    const m = M[k];
    m.t += m.v;
    if (m.t < 1) continue;
    M.splice(k, 1);
    blast(m.x1, m.y1, m.pol);
  }
}
function blast(x, y, pol) {
  const r = 9;
  if (FXH) FXH.boom(x, y, 16);
  let dead = 0;
  for (let i = W.people.length - 1; i >= 0; i--) {
    const p = W.people[i];
    const dx = p.ti % W.w - x, dy = ((p.ti / W.w) | 0) - y, d2 = dx * dx + dy * dy;
    if (d2 > r * r * 2.2) continue;
    if (rnd() < (d2 < r * r ? 0.85 : 0.4)) { killPerson(p, 'killed by the bomb'); dead++; }
  }
  for (const b of W.blds.slice()) {
    if (Math.hypot(b.x - x, b.y - y) > r) continue;
    if (b.type === 'hearth' && b.town && b.town.alive) continue;
    if (FXH && rnd() < 0.3) FXH.burn(b.x, b.y);
    removeBuilding(b);
  }
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (dx * dx + dy * dy > r * r) continue;
    const i = (y + dy) * W.w + x + dx;
    if (i < 0 || i >= W.tree.length || W.water[i]) continue;
    W.tree[i] = 0; W.baseTree[i] = 0; W.forage[i] = 0; W.fert[i] = Math.min(W.fert[i], 8); W.plant[i] = 0; updCost(i); dirty(i);
  }
  chron('war', `The bomb falls. ${dead} die in a moment, and nothing grows there for a long time.`, Math.round(x), Math.round(y));
  // the whole world looks at the one who did it
  for (const o of W.polities) if (o.alive && o !== pol) adjustRel(o, pol, -40);
  pol.infamy = (pol.infamy || 0) + 80;
}
