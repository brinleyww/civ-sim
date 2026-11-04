'use strict';
// Money. First there's none, and people swap. Then shells or salt, then coin struck from real metal, then paper, then a central bank, then numbers on a screen.
// Each realm has its own currency, worth what people believe. Every town has prices set by what it has and what it wants, and wages set by what its workers make.
// Taxes fill a treasury that pays soldiers and builders; a shortfall means borrowing or debasing, and those have consequences: inflation, runs on the banks, default, depression.

// What a thing is worth, in grams of silver or thereabouts, when nobody is short of it.
const VALUE = new Float32Array(R.N);
[[R.FOOD, 1], [R.WOOD, 0.7], [R.STONE, 0.9], [R.CLAY, 0.6], [R.BRICK, 1.2], [R.COPPER, 3], [R.TIN, 6], [R.IRON, 2.5], [R.COAL, 1.5], [R.BRONZE, 8], [R.STEEL, 7], [R.TOOLS, 5], [R.CLOTH, 3], [R.GOODS, 4], [R.OIL, 6], [R.GOLD, 40], [R.SALT, 3], [R.SULFUR, 5], [R.URANIUM, 40], [R.GEMS, 50]].forEach(([r, v]) => { VALUE[r] = v; });
const MONEY_KIND = ['Barter', 'Goods as money', 'Struck coin', 'Banknotes', 'Paper money', 'Electronic money'];
const COIN_WORD = ['mark', 'crown', 'florin', 'ducat', 'talent', 'shekel', 'dinar', 'drachma', 'pound', 'thaler', 'real', 'sou', 'ryo', 'tael', 'denar', 'obol'];
const JOB_PAY = new Float32Array(J.N).fill(1);
[[J.FORAGE, 0.6], [J.HUNT, 0.8], [J.FISH, 0.8], [J.FARM, 0.7], [J.HERD, 0.8], [J.WOOD, 0.8], [J.STONE, 0.9], [J.CLAY, 0.8], [J.MINE, 1.2], [J.BUILD, 1.1], [J.CRAFT, 1.4], [J.TRADE, 2.2], [J.SCHOLAR, 1.8], [J.SOLDIER, 1.1], [J.SERVICE, 1.5], [J.SAILOR, 1.1], [J.GARDEN, 0.7], [J.CHILD, 0], [J.ELDER, 0.2], [J.NONE, 0.2]].forEach(([j, v]) => { JOB_PAY[j] = v; });

function newCurrency(pol) {
  return { name: 'goods', full: 'goods', kind: 0, treasury: 0, debt: 0, cut: 0, reformY: -999, rate: 0.08, tax: 0.1, tariff: 0.05, level: 1, infl: 0, value: 1, supply: 0, metal: 0, debase: 0, gdp: 0, gdpReal: 0, credit: 0, reserve: 0.25, slump: 0, boom: 0, incY: 0, spentY: 0, armyY: 0, buildY: 0, interestY: 0, tradeBal: 0, unpaid: 0, defaulted: -999, bubble: 0, history: [], note: 0 };
}
const hasCoin = pol => pol.cur.kind >= 2;
const bestMoneyKind = pol => { const K = pol.capital; if (!K) return 0; return K.tech[TECH_IX.digitalmoney] ? 5 : K.tech[TECH_IX.fiatmoney] ? 4 : K.tech[TECH_IX.banknotes] ? 3 : K.tech[TECH_IX.currency] ? 2 : K.tech[TECH_IX.commoditymoney] ? 1 : 0; };
// Switching to a new money is an event, and old coin isn't worth what it was.
function moneyReform(pol) {
  const cur = pol.cur, want = bestMoneyKind(pol);
  if (want <= cur.kind) return;
  const cap0 = pol.capital, was = cur.kind;
  cur.kind = want;
  if (was < 2 && want >= 2) {
    cur.name = `${pol.culture.name.slice(0, 5).toLowerCase()} ${pick(COIN_WORD)}`;
    // the first coinage: about half a year's output in circulation, so a coin starts out worth about what it says
    for (const t of W.towns) if (t.polity === pol) t.cash = Math.max(t.cash, (t.gdpReal || tn(t) * 4) * 0.5);
    cur.treasury += (cur.gdpLast || tn(cap0) * 4) * 0.08;
    cur.level = 1; cur.value = 1; cur.k = 0;
    if (tn(cap0) > 40) chronT('misc', `${polityTitle(pol)} strikes its first coins: the ${cur.name}.`, cap0);
  } else if (want === 3 && tn(cap0) > 60) chronT('misc', `Bank paper starts to pass for coin in ${pol.name}: a promise to pay in ${cur.name}s.`, cap0);
  else if (want === 4 && tn(cap0) > 60) chronT('misc', `${pol.name} cuts the ${cur.name} loose from metal. It's worth what the government says, as long as people believe it.`, cap0);
  else if (want === 5 && tn(cap0) > 60) chronT('misc', `Coins and notes vanish from ${pol.name}. The ${cur.name} is a number on a screen now.`, cap0);
}

// ---- town prices: dear when short, cheap when plentiful, and measured in the local money ----
function pricesYear(t) {
  const P = t.price, lv = t.polity.cur.level;
  for (let r = 0; r < R.N; r++) {
    const w = wantOf(t, r), s = t.stock[r];
    const scarcity = w > 0 ? clamp(Math.pow((w + 2) / (s + 2), 0.55), 0.3, 6) : clamp(Math.pow(8 / (s + 8), 0.3), 0.4, 1);
    // famine and siege push the price of bread out of reach
    const shock = r === R.FOOD && (t.famine > 1 || t.attack) ? 1.8 : 1;
    P[r] = P[r] * 0.5 + VALUE[r] * scarcity * lv * shock * 0.5;
  }
}
// What's owed when goods cross a border or a street: value in the seller's money, tariffs to whoever controls the gate.
function goodsValue(from, r, amount) { return amount * from.price[r]; }
// A merchant's sale. Pays for goods in real money where there is money; tax on the way in; a border means an exchange rate.
function payForGoods(buyer, seller, r, amount) {
  const curB = buyer.polity.cur, curS = seller.polity.cur;
  if (curB.kind < 2 || curS.kind < 2) return;
  const price = amount * buyer.price[r];
  const can = Math.min(price, buyer.cash);
  buyer.cash -= can;
  if (buyer.polity === seller.polity) { seller.cash += can; return; }
  const duty = can * curB.tariff;
  curB.treasury += duty; curB.incY += duty;
  const got = (can - duty) * fx(buyer.polity, seller.polity);
  seller.cash += got;
  curB.tradeBal -= can; curS.tradeBal += got;
  flow(buyer.polity, seller.polity, 'trade', (can - duty) * curB.value);
}
// ---- money between realms. Every currency is worth what the world thinks it is; this is how much of b's money one of a's buys. ----
const fx = (a, b) => a === b ? 1 : a.cur.value / Math.max(b.cur.value, 1e-7);
// A ledger of what moved between realms this year, counted in the world's yardstick (a gram or so of silver).
function flow(from, to, kind, v) {
  if (!(v > 0) || from === to) return;
  const F = W.flows || (W.flows = {}), key = from.id + '>' + to.id;
  const e = F[key] || (F[key] = { from: from.id, to: to.id, trade: 0, loan: 0, interest: 0, remit: 0, tribute: 0, aid: 0, war: 0 });
  e[kind] += v;
}
// Someone moving to another realm takes their savings, changed into the new money at whatever the rate is that day.
function emigrate(p, to) {
  const from = p.town;
  if (from === to) return;
  const amt = Math.min(Math.max(p.cash, 0), Math.max(from.cash, 0));
  if (from.polity !== to.polity && amt > 0 && from.polity.cur.kind >= 2 && to.polity.cur.kind >= 2) {
    from.cash -= amt; const got = amt * fx(from.polity, to.polity); to.cash += got; p.cash = got;
    flow(from.polity, to.polity, 'remit', amt * from.polity.cur.value);
  } else if (from.polity !== to.polity) p.cash = 0;
  else { from.cash -= amt; to.cash += amt; }
  moveTo(p, to);
}
// People who left home send some of their pay back to their families.
function remittances(t) {
  const pol = t.polity;
  if (pol.cur.kind < 2 || !t.members.length) return;
  const by = {};
  for (const p of t.members) {
    const o = p.origin;
    if (o < 0 || o === pol.id || p.job === J.CHILD) continue;
    by[o] = (by[o] || 0) + 1;
  }
  for (const k in by) {
    const home = W.polities[+k];
    if (!home || !home.alive || home.cur.kind < 2 || !home.capital || atWar(home, pol)) continue;
    const amt = Math.min(by[k] * t.scale * (t.wage || 1) * 0.06, t.cash * 0.05);
    if (amt <= 0) continue;
    t.cash -= amt;
    // it lands where most of them came from: the old country's towns, shared out by size
    const towns = W.towns.filter(x => x.polity === home);
    const tot = towns.reduce((s, x) => s + tn(x), 0) || 1, got = amt * fx(pol, home);
    for (const x of towns) x.cash += got * tn(x) / tot;
    flow(pol, home, 'remit', amt * pol.cur.value);
  }
}
// ---- loans between realms: a rich treasury lends to a short one, at a price, and remembers if it isn't paid back ----
function findLender(pol, need) {
  let best = null, bs = 0;
  for (const o of W.polities) {
    if (!o.alive || o === pol || o.cur.kind < 3 || !o.capital || !o.capital.tech[TECH_IX.banking] || atWar(o, pol)) continue;
    if (!pol.known[o.id] && !o.known[pol.id]) continue;
    const rel = relOf(o, pol);
    if (rel < 10) continue;
    if ((W.loans || []).some(L => L.from === o.id && L.to === pol.id && L.missed > 0)) continue;
    const spare = o.cur.treasury - o.cur.gdpLast * 0.15;
    const inTheirs = need * fx(pol, o);
    if (spare < inTheirs * 1.5) continue;
    const s = spare / inTheirs + rel * 0.05 + (areAllies(o, pol) ? 3 : 0);
    if (s > bs) { bs = s; best = o; }
  }
  return best;
}
function borrowAbroad(pol, gap) {
  const lender = findLender(pol, gap);
  if (!lender) return false;
  const amt = gap * fx(pol, lender), risk = Math.max(0, pol.cur.debt / Math.max(pol.cur.gdpLast || 1, 1) - 0.4) * 0.06;
  const rate = clamp(lender.cur.rate + 0.02 + risk + (year() - pol.cur.defaulted < 40 ? 0.05 : 0), 0.02, 0.35);
  lender.cur.treasury -= amt; lender.cur.spentY += amt;
  pol.cur.treasury += gap;
  (W.loans || (W.loans = [])).push({ id: W.nextId++, from: lender.id, to: pol.id, amt, left: amt, rate, start: Math.floor(year()), missed: 0 });
  lender.loansOut += amt;
  flow(lender, pol, 'loan', amt * lender.cur.value);
  if (amt * lender.cur.value > 400 && !(pol.loanNote > year() - 20) && pol.capital) { pol.loanNote = year(); chronT('gov', `${lender.name} lends ${pol.name} ${fmtMoney(amt)} ${lender.cur.name}s at ${Math.round(rate * 100)}%.`, pol.capital); }
  return true;
}
// Once a year every foreign loan is serviced: interest and a slice of the principal, changed into the lender's money. Miss twice and it's a default.
function loansYear() {
  const L = W.loans || [];
  for (let k = L.length - 1; k >= 0; k--) {
    const ln = L[k], a = W.polities[ln.from], b = W.polities[ln.to];
    if (!a || !b || !a.alive || !b.alive || ln.left <= 0.5) { if (a) a.loansOut = Math.max(0, a.loansOut - ln.left); L.splice(k, 1); continue; }
    if (b.cur.kind < 2 || a.cur.kind < 2) continue;
    const due = ln.left * ln.rate + ln.left * 0.06, inB = due * fx(a, b);
    if (b.cur.treasury >= inB && !atWar(a, b)) {
      b.cur.treasury -= inB; b.cur.spentY += inB; b.cur.interestY += ln.left * ln.rate * fx(a, b);
      a.cur.treasury += due; a.cur.incY += due;
      a.loansOut = Math.max(0, a.loansOut - ln.left * 0.06);
      ln.left -= ln.left * 0.06; ln.missed = 0;
      flow(b, a, 'interest', due * a.cur.value);
    } else {
      ln.missed++;
      if (ln.missed >= 3) {
        adjustRel(a, b, -30);
        a.unpaidBy[b.id] = (a.unpaidBy[b.id] || 0) + ln.left * a.cur.value;
        a.loansOut = Math.max(0, a.loansOut - ln.left);
        b.cur.defaulted = year();
        if (b.capital) chronT('collapse', `${b.name} stops paying what it owes ${a.name}: ${fmtMoney(ln.left)} ${a.cur.name}s, written off in anger.`, b.capital);
        L.splice(k, 1);
      }
    }
  }
}
// A friend in famine gets help: grain and coin from a realm that can spare it. It buys goodwill that lasts.
function aidYear() {
  for (const pol of W.polities) {
    if (!pol.alive || !pol.capital || pol.cur.kind < 2) continue;
    const hungry = W.towns.filter(t => t.polity === pol && (t.famine > 1 || (t.starvedY > tn(t) * 0.03 && tn(t) > 40)));
    if (!hungry.length) continue;
    let donor = null, bs = 0;
    for (const o of W.polities) {
      if (!o.alive || o === pol || !o.capital || o.cur.kind < 2 || atWar(o, pol) || (o.aidNote > year() - 6)) continue;
      const rel = relOf(o, pol) + (areAllies(o, pol) ? 30 : 0) + (o.overlord === pol.id || pol.overlord === o.id ? 20 : 0);
      if (rel < 35) continue;
      const spare = o.cur.treasury - o.cur.gdpLast * 0.2;
      if (spare <= 0) continue;
      if (spare + rel > bs) { bs = spare + rel; donor = o; }
    }
    if (!donor) continue;
    const gift = Math.max(0, (donor.cur.treasury - donor.cur.gdpLast * 0.2) * 0.15);
    if (gift <= 0) continue;
    donor.cur.treasury -= gift; donor.cur.spentY += gift; donor.aidNote = year();
    const got = gift * fx(donor, pol);
    for (const t of hungry) t.cash += got / hungry.length;
    // and grain, if the giver has it near enough to send
    const dc = donor.capital;
    if (dc.stock[R.FOOD] > tn(dc) * 3) { const g = dc.stock[R.FOOD] * 0.15; dc.stock[R.FOOD] -= g; for (const t of hungry) t.stock[R.FOOD] += g * 0.8 / hungry.length; }
    adjustRel(donor, pol, 8);
    flow(donor, pol, 'aid', gift * donor.cur.value);
    if (gift * donor.cur.value > 100) chronT('gov', `${donor.name} sends coin and grain to famine-struck ${pol.name}.`, hungry[0]);
  }
}
const fmtMoney = v => v >= 1e9 ? (v / 1e9).toFixed(1) + ' billion' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' million' : v >= 1e4 ? Math.round(v / 1000) + ' thousand' : String(Math.round(v));
// Would this town pay enough for a load to be worth the walk?
const margin = (from, to, r) => (to.price[r] * to.polity.cur.value) / Math.max(from.price[r] * from.polity.cur.value, 0.01);

// ---- a town's year: what it made, what its workers earned, what got taxed, who ended up with it ----
function econTown(t) {
  const cur = t.polity.cur, n = tn(t);
  pricesYear(t);
  const out = t.outVal;
  t.outVal = 0;
  // services are worth something too, and a slump leaves people without work
  const svc = (t.jobs[J.SCHOLAR] + t.jobs[J.SERVICE] + t.jobs[J.TRADE]) * t.scale * 6;
  const real = (out + svc) * (1 - cur.slump * 0.35) * (1 + cur.boom * 0.1) * (1 - (t.unemp || 0) * 0.6);
  t.gdpReal = real;
  cur.gdpReal += real;
  if (cur.kind < 2) { t.gdp = real; t.wage = real / Math.max(n, 1); return; }
  const nominal = real * cur.level;
  t.gdp = nominal;
  cur.gdp += nominal;
  // who gets it: wages, then profit, then rent. More unequal the older and more feudal the place, less so with unions and welfare.
  const lab = clamp(0.62 + (t.count.union ? 0.08 : 0) + (t.tech[TECH_IX.welfare] ? 0.06 : 0) - t.gini * 0.3, 0.3, 0.8);
  const workers = Math.max(1, (t.members.length - t.jobs[J.CHILD] - t.jobs[J.ELDER]) * t.scale * (1 - (t.unemp || 0)));
  t.wage = nominal * lab / workers;
  t.realWage = t.wage / Math.max(t.price[R.FOOD], 0.05);
  // tax, as well as the realm can collect it
  const order = clamp(0.5 + t.mod.order * 0.01 + t.mod.admin * 0.002, 0.3, 1);
  const rate = cur.tax * (t.tech[TECH_IX.incometax] ? 1.15 : 1) * order * (t.occupier ? 0.2 : 1);
  const tax = nominal * rate;
  // money only moves here, it isn't created: a town can't pay tax it hasn't got
  const paid = Math.min(tax, t.cash * 0.6);
  t.cash -= paid;
  cur.treasury += paid; cur.incY += paid;
  cur.supply += t.cash;
  remittances(t);
  // inequality creeps up with trade and cities; heavy tax and revolts bring it down
  const pull = 0.3 + Math.min(0.3, t.jobs[J.TRADE] * t.scale / Math.max(n, 1) * 3) + (n > 1000 ? 0.1 : 0) + (GOV[t.polity.gov].st <= 3 ? 0.05 : 0) - (t.tech[TECH_IX.welfare] ? 0.14 : 0) - cur.tax * 0.4;
  t.gini = clamp(t.gini + (pull - t.gini) * 0.03 - (t.unrest > 50 ? 0.01 : 0), 0.22, 0.75);
  // too much money at the top is its own kind of unrest
  t.unrest = Math.max(0, t.unrest + Math.max(0, t.gini - 0.55) * 8 + cur.slump * 6 + Math.min(20, Math.max(0, cur.infl - 0.1) * 30) + Math.max(0, cur.tax - 0.2) * 40);
}
// ---- a realm's year: pay the bills, and if they can't be paid, find a way. Every way costs something later. ----
function econRealm(pol) {
  const cur = pol.cur, cap0 = pol.capital;
  if (!cap0) return;
  moneyReform(pol);
  const K = cur.kind;
  cur.history.push(Math.round(cur.level * 100) / 100);
  if (cur.history.length > 200) cur.history.shift();
  if (K < 2) { cur.gdpLast = cur.gdpReal; cur.gdpReal = 0; cur.gdp = 0; return; }
  // the bills
  const soldiers = pol.soldiers * cap0.scale + W.armies.reduce((s, a) => s + (a.pol === pol ? a.soldiers.length : 0), 0);
  const wageNow = Math.max(0.5, cap0.wage || 2);
  // hired companies cost three times a conscript
  let mercs = 0; for (const a of W.armies) if (a.pol === pol && a.mercs) { let c = 0; for (const p of a.soldiers) if (p.merc) c++; a.mercs = c; mercs += c; }
  const army = soldiers * wageNow * 0.5 + mercs * wageNow * 1.5;
  const interest = cur.debt * cur.rate;
  let upkeep = 0; for (const t of W.towns) if (t.polity === pol) upkeep += t.blds.length * 0.12 * cur.level;
  const court = (pol.ruler && pol.ruler.alive && hasTrait(pol.ruler, 'greedy') ? 0.06 : 0.025) * cur.gdp;
  // a treasury that can't pay its way cuts back: a smaller court, fewer soldiers on the payroll, repairs put off
  const bills = (army + upkeep + court) * (1 - (cur.cut || 0)) + interest;
  cur.armyY = army; cur.interestY = interest; cur.spentY += bills;
  const income = cur.incY;
  cur.treasury -= bills;
  // what the government spends lands back in people's pockets, where it does
  let pops = 0; for (const t of W.towns) if (t.polity === pol) pops += tn(t);
  const paidOut = Math.min(bills, Math.max(0, bills + Math.min(cur.treasury, 0)));
  for (const t of W.towns) if (t.polity === pol) t.cash += paidOut * tn(t) / Math.max(pops, 1);
  // the shortfall: borrow while anyone will lend, otherwise debase or print, otherwise don't pay people
  if (cur.treasury < 0) {
    const gap = -cur.treasury;
    let canBorrow = cap0.tech[TECH_IX.publicdebt] && cur.debt < cur.gdp * 1.4 && year() - cur.defaulted > 25;
    if (canBorrow) { cur.debt += gap; cur.treasury = 0; }
    else if (year() - cur.defaulted > 15 && borrowAbroad(pol, gap)) { cur.treasury = Math.max(cur.treasury, 0); canBorrow = true; }
    else if (K >= 4 && !(cur.cb && cur.infl > 0.5)) { cur.treasury = 0; cur.printY = gap; }  // the printing press
    else if (K === 2 || K === 3) {
      // clip the coin: more coins, less silver in each
      cur.debase = clamp(cur.debase + 0.05, 0, 0.9);
      // there's only so much copper you can slip into silver before people weigh the coins
      cur.printY = Math.min(gap * 0.5, (cur.supply || 0) * 0.03);
      if (gap * 0.5 > cur.printY) cur.unpaid++;
      cur.treasury = 0;
      if (cur.debase > 0.4 && year() - cur.note > 40 && tn(cap0) > 80) { cur.note = year(); chronT('misc', `The ${cur.name} of ${pol.name} is more copper than silver now, and everyone can tell.`, cap0); }
    } else { cur.treasury = 0; cur.unpaid++; }
    // payroll missed: an unpaid army is a dangerous army
    if (cur.debase > 0.6 || (!canBorrow && K < 4)) {
      cur.unpaid++;
      for (const a of W.armies) if (a.pol === pol) a.morale = Math.max(0, a.morale - 6);
      pol.stab -= 2;
      if (cur.unpaid === 4 && tn(cap0) > 60) chronT('gov', `The soldiers of ${pol.name} haven't been paid in years, and are starting to say so.`, cap0);
      if (cur.unpaid > 6 && rnd() < 0.1 && pol.towns >= 2) { const towns = W.towns.filter(t => t.polity === pol && t !== cap0); if (towns.length) { const q = pick(towns); chronT('gov', `Unpaid troops mutiny at ${q.name}.`, q); q.unrest = Math.min(100, q.unrest + 40); } }
    }
    cur.cut = clamp((cur.cut || 0) + 0.08, 0, 0.6);
  } else {
    cur.unpaid = 0;
    cur.cut = Math.max(0, (cur.cut || 0) - 0.04);
    if (cur.treasury > cur.gdp * 0.4 && cur.debt > 0) { const pay0 = Math.min(cur.debt, cur.treasury * 0.5); cur.debt -= pay0; cur.treasury -= pay0; }
    // a treasury sitting on a mountain of coin spends it on public works, and the coin goes back round
    const spare = cur.treasury - cur.gdp * 0.3;
    if (spare > 0) { cur.treasury -= spare * 0.5; for (const t of W.towns) if (t.polity === pol) t.cash += spare * 0.5 * tn(t) / Math.max(pops, 1); }
  }
  // interest follows risk, and the central bank when there is one
  const dg = cur.debt / Math.max(cur.gdp, 1);
  const baseRate = cur.cb ? clamp(0.02 + Math.max(0, cur.infl) * 1.2 - cur.slump * 0.03, 0.005, 0.3) : 0.08;
  cur.rate = clamp(baseRate + Math.max(0, dg - 0.5) * 0.08 + (year() - cur.defaulted < 30 ? 0.05 : 0), 0.005, 0.4);
  // too much debt to service: stop paying, and nobody lends for a generation
  if (cur.debt > Math.max(50, cur.gdp * 0.3) && (dg > 1.6 || (interest > cur.gdp * 0.14 && rnd() < 0.15))) defaultOn(pol);
  // metal in the vaults
  const mint = cap0.count.mint ? 1.5 : 1;
  let metal = 0;
  for (const t of W.towns) if (t.polity === pol) { metal += t.stock[R.GOLD] * 40 + t.stock[R.GEMS] * 20; }
  cur.metal = metal;
  // a gold strike floods the country with coin: rich people, then rising prices for everyone else
  // the mint turns real gold into coin, and uses it up doing so
  let coin = 0;
  if (K <= 3) for (const t of W.towns) if (t.polity === pol && t.stock[R.GOLD] > 2) { const g = t.stock[R.GOLD] * 0.12 * mint; t.stock[R.GOLD] -= g; coin += g * VALUE[R.GOLD] * cur.level * 0.25; }
  if (coin > 0) cap0.cash += coin;
  // honest coin comes back once the treasury can afford to recoin
  if (cur.debase > 0 && cur.treasury > 0) cur.debase = Math.max(0, cur.debase - 0.03);
  // banks: lend out most of what's deposited, and there's suddenly more money than there is metal
  // a growing economy with too little coin drags hoards and foreign silver into circulation, so prices fall only so far
  if (cur.level < 0.7 && K <= 3) cap0.cash += cur.supply * 0.04;
  const banks = cap0.tech[TECH_IX.banking] ? clamp(W.towns.reduce((s, t) => s + (t.polity === pol ? (t.count.bank || 0) + (t.count.exchange || 0) * 3 : 0), 0) / 6 + 0.15, 0, 1) : 0;
  const reserve = cur.cb ? 0.1 : 0.25;
  cur.credit = clamp(cur.credit + banks * (0.03 + cur.boom * 0.03) - cur.slump * 0.08, 0, banks * (1 / reserve - 1) * 0.5);
  // money chasing goods: this is what sets the price level
  const supply = (cur.supply + cur.treasury * 0.2 + coin + (cur.printY || 0)) * (1 + cur.credit);
  const realOut = Math.max(cur.gdpReal, 1);
  // the yardstick: when the coin was first struck, this much money against this much output meant prices of 1
  // (the first year of coin hasn't been counted yet, so the yardstick waits a year)
  if (!cur.k && cur.supply > 0) cur.k = Math.max(supply / realOut, 0.01);
  const fair = cur.k ? (supply / realOut) / cur.k / Math.max(1 - cur.debase * 0.8, 0.2) : cur.level;
  const lastLv = cur.level;
  // prices are sticky: they climb slowly and fall slower, except when the presses are running flat out
  const printing = (cur.printY || 0) / Math.max(supply, 1);
  const up = K >= 4 && printing > 0.1 ? 3 : K >= 3 ? 0.25 : 0.12;
  const step = clamp((fair - cur.level) / cur.level * 0.25, -0.06, up);
  cur.level = clamp(cur.level * (1 + step), 0.2, 1e9);
  cur.infl = cur.level / lastLv - 1;
  // the printing press puts its money in people's hands
  if (cur.printY) { const each = cur.printY / Math.max(pol.towns, 1); for (const t of W.towns) if (t.polity === pol) t.cash += each; cur.printY = 0; }
  // what it's worth abroad: falls with inflation, rises with a trade surplus and metal in the vault
  cur.confidence = clamp((cur.confidence || 1) * (1 + clamp(cur.tradeBal / Math.max(cur.gdp, 1), -0.2, 0.2) * 0.1) * (year() - cur.defaulted < 15 ? 0.98 : 1.002), 0.4, 1.6);
  cur.value = clamp((1 / cur.level) * cur.confidence * (1 - cur.debase * 0.4) * (1 - Math.min(0.4, dg * 0.1)), 1e-7, 100);
  cur.tradeBal *= 0.5;
  // tax policy: a sensible treasury raises rates when short, lowers them when flush; rulers vary
  const short = bills / Math.max(income, 1);
  const greedy = pol.ruler && pol.ruler.alive && hasTrait(pol.ruler, 'greedy') ? 0.03 : 0;
  // a war people believe in can be taxed for; a war they don't, can't
  const atWarNow = Object.keys(pol.warsWith).length > 0, warTax = atWarNow && pol.support > 35 ? 0.06 : 0;
  const max = (K >= 4 ? 0.42 : K === 3 ? 0.28 : 0.2) + warTax;
  cur.tax = clamp(cur.tax + (short > 1.1 ? 0.012 : short < 0.7 ? -0.008 : 0) + greedy * 0.05 + (warTax && short > 0.9 ? 0.01 : 0), 0.03, max);
  cur.tariff = clamp(0.05 + (pol.nodes.includes('com2') ? -0.03 : 0) + (cur.tradeBal < 0 ? 0.04 : 0), 0, 0.3);
  // central bank
  if (!cur.cb && cap0.tech[TECH_IX.centralbank]) { cur.cb = true; if (tn(cap0) > 80) chronT('misc', `${pol.name} founds a central bank, and hands it the job of worrying about prices.`, cap0); }
  // hyperinflation: past a point, nobody holds money at all
  if (cur.infl > 0.5 && year() - cur.note > 8) { cur.note = year(); pol.stab -= 15; if (tn(cap0) > 40) chronT('collapse', `Prices in ${pol.name} are up by half in a year. People are paid at noon and spend it by one.`, cap0); }
  // a new coin is a last resort, and nobody tries it twice in a lifetime unless they must
  const sinceReform = year() - (cur.reformY || -999);
  if (cur.level > 40 && cur.infl > 0.3 && sinceReform > 12) newMoney(pol);
  // metal money can only lose so much before a king has to recoin it
  else if (K <= 3 && cur.level > 6 && sinceReform > 40 && rnd() < 0.25) newMoney(pol);
  else if (cur.debase > 0.7 && K >= 2 && sinceReform > 40 && rnd() < 0.08) newMoney(pol);
  creditCycle(pol, cap0);
  cur.gdpLast = cur.gdp; cur.gdp = 0; cur.gdpReal = 0; cur.supply = 0; cur.incY = 0; cur.spentY = 0;
}
// A new coin to replace the wreck of the old one. It wipes out savers, and it's the only thing that ends it.
function newMoney(pol) {
  const cur = pol.cur, cap0 = pol.capital, nm = `new ${cur.name.replace(/^new /, '')}`;
  const cut = 1 / Math.max(cur.level, 1);
  for (const t of W.towns) if (t.polity === pol) { t.cash *= cut * 0.6; for (let r = 0; r < R.N; r++) t.price[r] *= cut; }
  cur.debt *= cut * 0.5; cur.treasury *= cut;
  cur.level = 1; cur.infl = 0; cur.debase = 0; cur.k = 0; cur.value = clamp(cur.value / cut, 0.01, 2); cur.reformY = year();
  if (cur.name !== nm) cur.name = nm;
  pol.stab -= 8;
  chronT('collapse', `${pol.name} tears up its money and starts again with the ${nm}. A lifetime's savings buy a loaf.`, cap0);
}
function defaultOn(pol) {
  const cur = pol.cur, cap0 = pol.capital;
  if (cur.debt < 1) return;
  chronT('collapse', `${pol.name} can't pay its debts, and says so. ${Math.round(cur.debt)} ${cur.name}s in bonds are worthless by evening.`, cap0);
  cur.debt *= 0.25; cur.defaulted = year(); cur.slump = Math.min(1, cur.slump + 0.6);
  pol.stab -= 12;
  for (const k of Object.keys(pol.known)) adjustRel(W.polities[+k], pol, -4);
}
// Good years breed borrowing, borrowing breeds a boom, a boom breeds a crash. Exchanges make the highs higher and the lows lower.
function creditCycle(pol, cap0) {
  const cur = pol.cur;
  const hasEx = W.towns.some(t => t.polity === pol && t.count.exchange);
  if (cur.slump > 0) { cur.slump = Math.max(0, cur.slump - 0.1 - (cur.cb ? 0.06 : 0)); cur.boom = 0; }
  else if (cur.credit > 0.1) cur.boom = clamp(cur.boom + 0.04 + (hasEx ? 0.03 : 0), 0, 1);
  if (hasEx) {
    cur.bubble = clamp(cur.bubble + (cur.boom * 0.1) - (cur.slump * 0.3), 0, 2);
    if (cur.bubble > 1 && rnd() < cur.bubble * 0.08) {
      cur.bubble = 0;
      cur.slump = Math.min(1, cur.slump + 0.7); cur.credit *= 0.5;
      if (tn(cap0) > 80) chronT('collapse', `The exchange in ${pol.name} collapses in a morning. Fortunes vanish, and the shipping bubble is suddenly a thing everyone saw coming.`, cap0);
      return;
    }
  }
  // the banks themselves can go: one rumour and everyone wants their money on the same day
  if (cur.credit > 0.2 && cur.boom > 0.5 && rnd() < 0.02 + cur.credit * 0.03 - (cur.cb ? 0.02 : 0)) {
    cur.slump = Math.min(1, cur.slump + 0.5); cur.credit *= 0.6; cur.boom = 0;
    if (tn(cap0) > 80) chronT('collapse', `A run on the banks of ${pol.name}. Queues round the block, shutters down by noon, and a hard few years to follow.`, cap0);
  }
}
function econYear() {
  for (const pol of W.polities) if (pol.alive && pol.towns) econRealm(pol);
  loansYear();
  aidYear();
  W.flowsLast = W.flows || {}; W.flows = {};
}
// What spending looks like from the builder's side: can the treasury afford this building? (No money yet: nobody's counting.)
function canFund(t, cost) {
  const cur = t.polity.cur;
  if (cur.kind < 2) return true;
  return cur.treasury >= cost * cur.level * 0.15;
}
function fund(t, cost) {
  const cur = t.polity.cur;
  if (cur.kind < 2) return;
  const a = cost * cur.level * 0.15;
  cur.treasury -= a; cur.spentY += a; cur.buildY += a;
  t.cash += a;  // the builders spend it here
}
// A person's purse: paid by job and skill, spends most of it, and the lucky ones pass some on.
function personMoney(p) {
  const t = p.town, cur = t.polity.cur;
  if (cur.kind < 2) return;
  // out of work: nothing, or a little from the state where there's welfare
  const wage = p.idleY > 0 ? (t.tech[TECH_IX.welfare] ? (t.wage || 0) * 0.3 : 0) : (t.wage || 0) * occPayOf(p) * (1 + Math.min(p.skill, 40) * 0.015) * (p.merc ? 2.5 : 1);
  // an income tax takes its share of every pay packet; before that, the state taxed the town, not the person
  const net = wage * (1 - (t.tech[TECH_IX.incometax] ? cur.tax * 0.8 : 0));
  const taste = p.traits.includes('greedy') ? 0.7 : p.traits.includes('kind') ? 0.95 : 0.85;
  // savings in a bank earn a little, and lose it all in a run
  const bank = t.count.bank || t.count.exchange ? cur.rate * 0.4 - cur.slump * 0.15 : 0;
  p.cash = p.cash * (1 - cur.infl * 0.8 + bank) + net * (1 - taste) + (p.job === J.TRADE ? net * 0.3 * (0.5 + rnd()) : 0);
  if (p.cash < 0) p.cash = 0;
}
// Rich or poor, compared with everyone else in town.
const wealthWord = p => { const w = (p.town.wage || 1) * 2, v = p.cash / Math.max(w, 0.01); return v > 10 ? 'Wealthy' : v > 3 ? 'Comfortable' : v > 0.8 ? 'Getting by' : 'Poor'; };
