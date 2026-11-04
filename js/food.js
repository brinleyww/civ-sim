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
