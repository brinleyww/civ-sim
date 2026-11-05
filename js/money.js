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
  return { name: 'goods', full: 'goods', kind: 0, treasury: 0, debt: 0, cut: 0, reformY: -999, rate: 0.08, tax: 0.1, tariff: 0.05, level: 1, infl: 0, value: 1, supply: 0, metal: 0, debase: 0, gdp: 0, gdpReal: 0, credit: 0, reserve: 0.25, slump: 0, boom: 0, incY: 0, spentY: 0, armyY: 0, buildY: 0, interestY: 0, tradeBal: 0, unpaid: 0, defaulted: -999, bubble: 0, history: [], note: 0, pot: 0, trend: 0, gap: 0, pcLast: 0, bankCap: 0.08, crisis: 0, crisisY: -999, loans: 0, loansY: 0, lossY: 0, invY: 0, invLast: 0, gdpRealLast: 0, facing: 0, unionAvg: 0, strikes: 0, pacts: {} };
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
// The market clears on flows as well as shelves: a stock that ran down over the year means buyers outran sellers, and the price climbs
// even if something is still left. Made goods can't sell for long below what went into them, and a few big firms add their markup.
function pricesYear(t) {
  const P = t.price, lv = t.polity.cur.level, e = econOf(t), L = e.last, mk = e.markup;
  for (let r = 0; r < R.N; r++) {
    const w = wantOf(t, r), s = Math.max(0, t.stock[r]);  // an overdrawn store must not turn the price into NaN
    const scarcity = w > 0 ? clamp(Math.pow((w + 2) / (s + 2), 0.55), 0.3, 6) : clamp(Math.pow(8 / (s + 8), 0.3), 0.4, 1);
    // famine and siege push the price of bread out of reach
    const shock = r === R.FOOD && (t.famine > 1 || t.attack) ? 1.8 : 1;
    const flowF = w > 0 ? clamp(1 - (s - L[r]) / (w + s + 8) * 1.2, 0.75, 1.35) : 1;
    L[r] = s;
    const ins = ECON_IN[r];
    let target = VALUE[r] * scarcity * lv * shock * flowF;
    if (ins) {
      let floor = 0;
      for (let q = 0; q < ins.length; q += 2) floor += P[ins[q]] * ins[q + 1];
      target = Math.max(target * (1 + mk), Math.min(floor * (1.08 + mk), VALUE[r] * lv * 6));
    }
    P[r] = P[r] * 0.5 + target * 0.5;
    if (!(P[r] < Infinity)) P[r] = VALUE[r] * lv;  // heals a price already broken in a save
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
  const duty = can * tariffBetween(buyer.polity, seller.polity);
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
// (the buyer's duty comes off what the seller can hope to make, so a tariff wall really does cut trade)
const margin = (from, to, r) => (to.price[r] * to.polity.cur.value) * (from.polity === to.polity ? 1 : 1 - tariffBetween(to.polity, from.polity)) / Math.max(from.price[r] * from.polity.cur.value, 0.01);

// ---- a town's year: what it made, what its workers earned, what got taxed, who ended up with it ----
function econTown(t) {
  const cur = t.polity.cur, n = tn(t), e = econOf(t);
  pricesYear(t);
  const out = t.outVal;
  t.outVal = 0;
  firmsYear(t, e, cur, n);
  // services are worth something too, and a slump leaves people without work; a strike shuts the works for part of the year
  const svc = (t.jobs[J.SCHOLAR] + t.jobs[J.SERVICE] + t.jobs[J.TRADE]) * t.scale * 6;
  const real = (out + svc) * (1 - cur.slump * 0.35) * (1 + cur.boom * 0.1) * (1 - (t.unemp || 0) * 0.6) * (e.strike ? 1 - 0.22 * e.union : 1);
  t.gdpReal = real;
  cur.gdpReal += real;
  capitalYear(t, e, cur, real);
  e.migInShow = e.migIn; e.migIn = 0;
  if (cur.kind < 2) { t.gdp = real; t.wage = real / Math.max(n, 1); return; }
  const nominal = real * cur.level;
  t.gdp = nominal;
  cur.gdp += nominal;
  // who gets it: wages, profit and rent, settled by bargaining, market power and who owns the land
  sharesYear(t, e, n);
  const workers = Math.max(1, (t.members.length - t.jobs[J.CHILD] - t.jobs[J.ELDER]) * t.scale * (1 - (t.unemp || 0)));
  t.wage = nominal * e.ls / workers;
  // and the rent comes out of the pay packet before the bread does
  t.realWage = t.wage * (1 - Math.min(0.35, e.rs * 1.2)) / Math.max(t.price[R.FOOD], 0.05);
  // tax, as well as the realm can collect it
  const order = clamp(0.5 + t.mod.order * 0.01 + t.mod.admin * 0.002, 0.3, 1);
  const rate = cur.tax * (t.tech[TECH_IX.incometax] ? 1.15 : 1) * order * (t.occupier ? 0.2 : 1);
  const tax = nominal * rate;
  // money only moves here, it isn't created: a town can't pay tax it hasn't got
  const paid = Math.min(tax, t.cash * 0.6);
  t.cash -= paid;
  cur.treasury += paid; cur.incY += paid;
  // state-owned works hand their profits to the treasury
  if (e.state > 0.02) { const sp = Math.min(nominal * e.ks * e.state * 0.5, t.cash * 0.1); if (sp > 0) { t.cash -= sp; cur.treasury += sp; cur.incY += sp; } }
  cur.supply += t.cash;
  remittances(t);
  // inequality comes out of who earns what and who saves it; heavy tax and revolts bring it down a little
  classesYear(t, e, cur, nominal);
  if (cur.tax > 0.2 || t.unrest > 50) t.gini = Math.max(0.22, t.gini - (cur.tax > 0.2 ? (cur.tax - 0.2) * 0.1 : 0) - (t.unrest > 50 ? 0.01 : 0));
  creditTown(t, e, cur);
  // too much money at the top is its own kind of unrest, and so is a rent nobody can pay
  t.unrest = Math.max(0, t.unrest + Math.max(0, t.gini - 0.55) * 8 + cur.slump * 6 + Math.min(20, Math.max(0, cur.infl - 0.1) * 30) + Math.max(0, cur.tax - 0.2) * 40 + Math.max(0, e.rs - 0.16) * 25 + (e.strike ? 3 : 0));
  e.rwLast = t.realWage;
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
  cycleYear(pol, cur);
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
  tariffPolicy(pol, cur, cap0);
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
  banksYear(pol, cur, cap0);
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
  tradeTiesYear();
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

// ======== firms, capital, classes, credit, unions, rent, trade treaties ========
// Everything here moves money between people who already hold it (owners and savers, towns and treasuries) or turns goods into
// machines and buildings: none of it makes cash from nothing. A town's economy lives in t.ec, plain numbers only.
const ekn = (t, id) => TECH_IX[id] !== undefined && t.tech[TECH_IX[id]] === 1;
// What goes into each made thing, per unit, from the cheapest recipe the world knows: [input, qty, input, qty...]
const ECON_IN = (() => {
  const best = new Array(R.N).fill(null), cost = new Float32Array(R.N).fill(1e9);
  for (const b in RECIPES) for (const rec of RECIPES[b]) {
    let inC = 0, outV = 0;
    for (const k in rec.in) inC += rec.in[k] * VALUE[+k];
    for (const k in rec.out) outV += rec.out[k] * VALUE[+k];
    if (!(outV > 0) || !(inC > 0)) continue;
    for (const k in rec.out) {
      const r = +k, q = rec.out[k], c = inC * (q * VALUE[r] / outV) / q;
      if (q > 0 && c < cost[r]) {
        cost[r] = c;
        // each input's share of this output, by value
        const L = []; for (const i in rec.in) L.push(+i, rec.in[i] * (q * VALUE[r] / outV) / q);
        best[r] = L;
      }
    }
  }
  return best;
})();
// How much capital a unit of output needs, by the methods the town knows: a plough and a barn, then a mill, then a factory floor.
const kyOf = t => 0.6 + (ekn(t, 'wheel') ? 0.2 : 0) + (ekn(t, 'iron') ? 0.2 : 0) + (ekn(t, 'watermill') ? 0.2 : 0) + (ekn(t, 'steam') ? 0.5 : 0) + (ekn(t, 'factory') ? 0.5 : 0) + (ekn(t, 'railway') ? 0.3 : 0) + (ekn(t, 'electric') ? 0.4 : 0) + (ekn(t, 'massprod') ? 0.4 : 0) + (ekn(t, 'computers') ? 0.3 : 0);
function newEcon(t) {
  const real = t.gdpReal > 0 ? t.gdpReal : tn(t) * 3;
  return { K: real * kyOf(t) * 0.9, Ys: real, kq: 1, inv: 0, prof: 0.12, loans: 0, npl: 0, union: 0, barg: 0, strike: 0, strikeY: -99, noteY: -99,
    rs: 0.06, ls: 0.55, ks: 0.39, state: 0.03, firms: 1, fsize: 3, conc: 0.3, markup: 0.05, ltu: 0, rwLast: 0, migIn: 0, migInShow: 0, migOut: 0, wgini: 0.5,
    pc: Float32Array.of(0.8, 0.1, 0.07, 0.03), sh: Float32Array.of(0.45, 0.1, 0.35, 0.1), wl: Float32Array.of(0.25, 0.15, 0.4, 0.2), last: Float32Array.from(t.stock) };
}
const econOf = t => t.ec || (t.ec = newEcon(t));
const LANDED = { chiefdom: 1, kingdom: 1, feudal: 1, theocracy: 1, despotism: 1, empire: 1, absolute: 1, oligarchy: 1 };
const REPRESSIVE = { despotism: 1, absolute: 1, junta: 1, corporate: 1, empire: 1 };
// the biggest firm the times allow: a family bench, a guild shop, a merchant house, a mill, a company, a corporation
const FIRM_ERA = [['guilds', 8], ['merchanthouse', 12], ['commenda', 16], ['factory', 60], ['limitedliability', 160], ['massprod', 400], ['corporations', 900], ['computers', 1400]];
const OWN_WORD = ['family workshops', 'guild shops', 'merchant houses', 'mills and manufactories', 'joint-stock companies', 'corporations', 'state works'];
function firmsYear(t, e, cur, n) {
  const sc = t.scale, Jb = t.jobs, gid = GOV[t.polity.gov].id;
  const hired = (Jb[J.CRAFT] + Jb[J.TRADE] + Jb[J.SERVICE] + Jb[J.BUILD] + Jb[J.MINE]) * sc;
  let big = 4; for (const [id, s] of FIRM_ERA) if (ekn(t, id)) big = s;
  e.fsize = Math.max(2, Math.min(big, 3 + hired * 0.06));
  e.firms = Math.max(1, hired / e.fsize);
  // a few big houses set their own prices; guilds keep outsiders out, and competition law breaks the giants up
  e.conc = clamp(1.4 / Math.sqrt(e.firms + 1) + (ekn(t, 'guilds') && !ekn(t, 'factory') ? 0.12 : 0) + (gid === 'corporate' || gid === 'oligarchy' ? 0.1 : 0) - (ekn(t, 'antitrust') ? 0.15 : 0), 0.03, 0.85);
  e.markup = e.conc * 0.3;
  const st = gid === 'socialist' ? 0.65 : gid === 'technocracy' ? 0.2 : gid === 'junta' || gid === 'despotism' ? 0.15 : ekn(t, 'planning') ? 0.12 : 0.03;
  e.state += (st - e.state) * 0.1;
  // unions: the mills and mines organise, a hungry labour market makes them bold, a big queue at the gate makes them meek
  const ind = Math.min(1, (Jb[J.CRAFT] + Jb[J.MINE] + Jb[J.BUILD]) * sc / Math.max(n * 0.5, 1)), repress = REPRESSIVE[gid] ? 0.35 : 1;
  let ut = 0;
  if (ekn(t, 'unions')) ut = (0.06 + (t.count.union || 0) * 0.05 + ind * 0.45 + Math.max(0, t.gini - 0.4) * 0.6 - (t.unemp || 0) * 0.8) * repress;
  else if (ekn(t, 'guilds')) ut = 0.03 + ind * 0.2;
  if (gid === 'socialist') ut = Math.max(ut, 0.5);
  e.union += (clamp(ut, 0, 0.75) - e.union) * 0.12;
  e.barg *= 0.9; e.strike = 0;
  // a strike: pay falling behind prices, or owners taking a growing share, and organised workers walk out
  const yr = year();
  if (cur.kind >= 2 && e.union > 0.08 && gid !== 'socialist' && yr - e.strikeY > 3) {
    const fall = e.rwLast > 0 ? Math.max(0, 1 - t.realWage / e.rwLast) : 0;
    const squeeze = fall * 4 + Math.max(0, cur.infl - 0.04) * 3 + Math.max(0, e.ks - 0.36) * 2 + (cur.boom > 0.4 ? 0.08 : 0);
    if (rnd() < e.union * squeeze * 0.7) {
      e.strike = 1; e.strikeY = yr; cur.strikes = (cur.strikes || 0) + 1;
      if (repress < 1) { t.unrest += 10; e.union *= 0.7; } else { e.barg = Math.min(0.12, e.barg + 0.025 * (1 + e.union)); t.unrest += 3; }
      if (n > 400 && yr - e.noteY > 25) {
        e.noteY = yr;
        chronT('misc', repress < 1 ? `Strikers in ${t.name} are met with soldiers. The works reopen; the anger doesn't go away.` : `${t.name} downs tools: ${Math.round(e.union * 100)}% of its workers are in a union, and they want their pay to keep up with prices.`, t);
      }
    }
  }
}
// Machines and buildings: they wear out, and firms replace and add to them when the profit beats the interest.
// They're built out of the town's own timber, stone, brick, tools and steel, so industry pulls on the supply chain.
const INV_MAT = [[R.WOOD, 0.14], [R.STONE, 0.08], [R.BRICK, 0.1], [R.TOOLS, 0.2], [R.STEEL, 0.12]];
function capitalYear(t, e, cur, real) {
  if (t.nomad || !(real > 0)) return;
  // firms plan on what the town usually makes, not on one lucky or unlucky year
  e.Ys = e.Ys > 0 ? e.Ys * 0.75 + real * 0.25 : real;
  const Kdes = Math.max(1, e.Ys * kyOf(t)), money = cur.kind >= 2, crisis = cur.crisis > 0;
  e.K *= 1 - (0.045 + (t.attack ? 0.08 : 0) + (t.unrest > 60 ? 0.02 : 0));
  e.prof = e.ks * e.Ys / Math.max(e.K, 1);
  const hurdle = (money ? cur.rate : 0.07) + 0.025 + (crisis ? 0.06 : 0);
  // the accelerator: a growing economy wants more capacity, a shrinking one wants none
  const mood = clamp(1 + (cur.boom || 0) * 0.5 - (cur.slump || 0) * 0.7 + (cur.gap || 0) * 2, 0.15, 1.8);
  let want = Math.max(0, Kdes - e.K) * 0.22 * clamp(0.6 + (e.prof - hurdle) * 6, 0.1, 1.6) * mood;
  const S = e.sh, save = real * (S[2] * 0.35 + S[3] * 0.2 + S[1] * 0.08 + S[0] * 0.03);
  const lend = money && cur.kind >= 3 && !crisis && ekn(t, 'banking') ? real * clamp(0.04 + (cur.credit || 0) * 0.15, 0, 0.12) * clamp((cur.bankCap || 0.08) / 0.08, 0.2, 1.2) : 0;
  want = Math.min(want, save + lend + real * e.state * 0.06, real * 0.15);
  let inv = 0;
  if (want > 0.5) {
    let need = 0, got = 0;
    for (const [r, s] of INV_MAT) {
      const w = wantOf(t, r);
      if (w <= 0) continue;
      const q = want * s / VALUE[r], take = Math.min(q, Math.max(0, t.stock[r] - w * 0.5), t.stock[r] * 0.2);
      if (take > 0) t.stock[r] -= take;
      need += q * VALUE[r]; got += take * VALUE[r];
    }
    inv = want * (0.35 + 0.65 * (need > 0 ? got / need : 1));
    e.K += inv;
    if (lend > 0) e.loans += Math.min(lend, Math.max(0, inv - save * 0.5)) * cur.level;
  }
  e.inv = inv;
  cur.invY = (cur.invY || 0) + inv;
  e.kq = clamp(0.78 + 0.22 * Math.min(e.K / Kdes, 1.5), 0.78, 1.11) * (1 - e.state * 0.06);
}
function sharesYear(t, e, n) {
  const gid = GOV[t.polity.gov].id;
  // rent: dear land at the centre of a big town, a landed nobility, crowding, and none of it in a socialist state
  e.rs = clamp(0.025 + 0.012 * Math.log1p(n / 150) + (LANDED[gid] ? 0.07 : 0) + Math.max(0, (t.crowd || 0) - 0.9) * 0.1 + (W.land ? Math.min(0.05, landAt(t.i) * 0.0003) : 0) - (gid === 'socialist' ? 0.05 : 0), 0.02, 0.3);
  // labour's share: unions and a tight labour market push it up, market power and a queue at the gate push it down
  const tight = clamp(0.07 - (t.unemp || 0), -0.25, 0.07);
  const ls = 0.5 + e.union * 0.16 + e.barg + tight * 0.8 + (t.tech[TECH_IX.welfare] ? 0.03 : 0) + (gid === 'socialist' ? 0.08 : 0) - e.markup * 0.3;
  e.ls = clamp(Math.min(ls, 1 - e.rs - 0.08), 0.3, 0.8);
  e.ks = 1 - e.ls - e.rs;
}
// Lorenz curve over a few groups: pop and share both sum to 1.
function giniOf(pop, share) {
  const ix = [0, 1, 2, 3].sort((a, b) => share[a] / Math.max(pop[a], 1e-6) - share[b] / Math.max(pop[b], 1e-6));
  let cs = 0, area = 0;
  for (const i of ix) { area += pop[i] * (cs * 2 + share[i]); cs += share[i]; }
  return clamp(1 - area, 0, 1);
}
const SAVE_RATE = [0.03, 0.1, 0.35, 0.25];
// Four classes: labourers, the schooled trades, owners of firms, landlords. What each earns, what each keeps, and how unequal that makes the town.
function classesYear(t, e, cur, nominal) {
  let sk = 0, skN = 0, all = 0, allN = 0;
  if (t.occN && t.occPay) for (let k = 0; k < t.occN.length; k++) { const m = t.occN[k]; if (m <= 0) continue; const v = m * t.occPay[k]; all += v; allN += m; if (OCCS[k].edu >= 2) { sk += v; skN += m; } }
  const gid = GOV[t.polity.gov].id, C = e.pc, S = e.sh, Wl = e.wl;
  const pl = LANDED[gid] ? 0.035 : 0.015;
  // shares spread ownership wider: a company has many owners, a pension fund more
  const po = clamp(0.4 / e.fsize + (ekn(t, 'limitedliability') ? 0.02 : 0) + (ekn(t, 'pensions') ? 0.03 : 0), 0.008, 0.12) * (1 - e.state * 0.7);
  const wf = 1 - pl - po, ps = wf * (allN > 0 ? skN / allN : 0.1);
  C[0] = wf - ps; C[1] = ps; C[2] = po; C[3] = pl;
  const skS = (all > 0 ? sk / all : 0.15) * (1 - e.union * 0.15);
  // the state's own profits come back as public spending, shared by headcount among the workers
  const pub = e.ks * e.state;
  S[0] = e.ls * (1 - skS) + pub * (C[0] / wf); S[1] = e.ls * skS + pub * (C[1] / wf); S[2] = e.ks - pub; S[3] = e.rs;
  // savings: everyone keeps a little, owners and landlords a lot; borrowers' interest goes to whoever has savings in the bank
  const cash = Math.max(t.cash, 1);
  let tot = 0;
  for (let c = 0; c < 4; c++) { Wl[c] = Wl[c] * cash + Math.max(0, S[c]) * nominal * SAVE_RATE[c]; }
  const intr = Math.min(e.loans * (cur.rate + 0.02), Wl[2] * 0.3);
  if (intr > 0) { Wl[2] -= intr; Wl[0] += intr * 0.25; Wl[1] += intr * 0.4; Wl[3] += intr * 0.35; }
  for (let c = 0; c < 4; c++) tot += Wl[c];
  for (let c = 0; c < 4; c++) Wl[c] = Wl[c] / Math.max(tot, 1e-6);
  // between the classes, plus the spread within each
  const g = giniOf(C, S);
  t.gini = clamp(t.gini + (clamp(g + (1 - g) * 0.12, 0.22, 0.75) - t.gini) * 0.15, 0.22, 0.75);
  e.wgini = giniOf(C, Wl);
}
// Bank loans in a town: some go bad in a slump, more when prices fall and old debts grow heavier in real terms.
function creditTown(t, e, cur) {
  if (!(e.loans > 0)) { e.npl = 0; return; }
  e.npl = clamp(0.015 + (cur.slump || 0) * 0.12 + Math.max(0, -cur.infl - 0.02) * 0.8 + Math.max(0, (t.unemp || 0) - 0.08) * 0.4 + (e.prof < cur.rate ? 0.03 : 0) + (t.attack ? 0.1 : 0), 0, 0.5);
  const loss = e.loans * e.npl * 0.35;
  cur.loansY = (cur.loansY || 0) + e.loans; cur.lossY = (cur.lossY || 0) + loss;
  e.loans = Math.max(0, e.loans * 0.9 - loss);
}
// The banks' cushion, and what happens when it's gone.
function banksYear(pol, cur, cap0) {
  if (cur.bankCap === undefined) { cur.bankCap = 0.08; cur.crisis = 0; cur.strikes = 0; }
  if (cur.crisis > 0) cur.crisis--;
  const L = cur.loansY || 0, loss = cur.lossY || 0;
  cur.loans = L; cur.loansY = 0; cur.lossY = 0;
  cur.invLast = cur.invY || 0; cur.invY = 0; cur.gdpRealLast = cur.gdpReal;
  let un = 0, nn = 0;
  for (const t of W.towns) if (t.polity === pol && t.ec) { const m = tn(t); un += t.ec.union * m; nn += m; }
  cur.unionAvg = nn ? un / nn : 0;
  if (L <= 1) return;
  // the spread between what borrowers pay and savers get builds the cushion; bad loans and a lending spree eat it
  cur.bankCap = clamp(cur.bankCap + 0.022 - loss / L - (cur.credit || 0) * 0.01, -0.3, 0.14);
  if (cur.bankCap >= 0.02 || L < (cur.gdp || 0) * 0.1 || year() - (cur.crisisY || -999) < 10) return;
  // a banking crisis: credit stops, firms can't roll their loans, and the slump deepens
  cur.crisis = 4; cur.crisisY = year(); cur.slump = Math.min(1, (cur.slump || 0) + 0.45); cur.credit *= 0.4;
  const mine = W.towns.filter(t => t.polity === pol && t.ec && t.ec.loans > 0);
  const bail = cur.cb ? Math.min(Math.max(cur.treasury, 0) * 0.5, L * 0.08) : 0;
  if (bail > 0) {
    // the central bank stands behind the banks: the treasury's money goes to the towns that hold the loans
    cur.treasury -= bail; cur.spentY += bail;
    for (const t of mine) t.cash += bail * t.ec.loans / L;
    cur.bankCap += bail / L + 0.03;
    if (tn(cap0) > 60) chronT('collapse', `The banks of ${pol.name} are bust. The central bank stands behind them with ${fmtMoney(bail)} ${cur.name}s, and the queues go home.`, cap0);
  } else {
    // no lender of last resort: depositors lose their savings, and the debts are written down
    for (const t of mine) { const W0 = t.ec.wl; W0[0] *= 0.8; W0[1] *= 0.8; const s = W0[0] + W0[1] + W0[2] + W0[3]; for (let c = 0; c < 4; c++) W0[c] /= s; t.ec.loans *= 0.7; t.unrest += 8; }
    cur.bankCap = 0.06; pol.stab -= 6;
    if (tn(cap0) > 60) chronT('collapse', `Bank after bank shuts its doors in ${pol.name}. Savers lose everything, and the works that lived on credit close.`, cap0);
  }
}
// Output against its trend: the business cycle as people feel it, per head so that a conquest isn't a boom.
function cycleYear(pol, cur) {
  // (a harvest is lumpy, so the year's figure is smoothed a little before it's compared)
  const raw = cur.gdpReal / Math.max(pol.pop || 1, 1);
  if (!(cur.pot > 0) || !(cur.pcLast > 0)) { cur.pot = raw; cur.pcLast = raw; cur.gap = 0; return; }
  const pc = cur.pcLast * 0.5 + raw * 0.5;
  cur.trend = (cur.trend || 0) * 0.9 + clamp(pc / cur.pcLast - 1, -0.2, 0.2) * 0.1;
  cur.pot = cur.pot * (1 + cur.trend) * 0.88 + pc * 0.12;
  cur.gap = clamp(pc / Math.max(cur.pot, 1e-6) - 1, -0.25, 0.25);
  cur.pcLast = pc;
  // an economy running well above its trend overheats: credit grows faster, and the fall is harder
  if (cur.gap > 0.08) cur.credit = (cur.credit || 0) + 0.01;
}
// What a realm's duties are against another's goods: nothing under a trade treaty.
const tariffBetween = (a, b) => a === b ? 0 : a.cur.pacts && a.cur.pacts[b.id] ? 0 : a.cur.tariff;
// Tariffs: a mercantilist court protects its workshops, a slump brings tariff walls (that make it worse), and a realm whose
// goods are taxed abroad answers in kind.
function tariffPolicy(pol, cur, cap0) {
  const prot = 0.04 + (ekn(cap0, 'mercantilism') && !ekn(cap0, 'freezones') ? 0.06 : 0) + (cur.tradeBal < 0 ? 0.04 : 0) + (cur.slump || 0) * 0.08
    + Math.max(0, (cur.facing || 0) - cur.tariff) * 0.6 - (pol.nodes.includes('com2') ? 0.03 : 0) - (ekn(cap0, 'freezones') ? 0.03 : 0) - (GOV[pol.gov].id === 'corporate' ? 0.02 : 0);
  cur.tariff = clamp(cur.tariff + (clamp(prot, 0, 0.4) - cur.tariff) * 0.3, 0, 0.4);
}
// Trade ties, once a year from last year's ledger: slumps spread down the trade routes, realms learn what duties their goods face,
// and good partners sign treaties to trade free of duty (which keeps them friendly).
function tradeTiesYear() {
  const F = W.flowsLast;
  if (!F) return;
  const imp = {}, fT = {}, fW = {}, yr = year();
  for (const key in F) {
    const f = F[key];
    if (!(f.trade > 0)) continue;
    const a = W.polities[f.from], b = W.polities[f.to];
    if (!a || !b || !a.alive || !b.alive || a.cur.kind < 2 || b.cur.kind < 2) continue;
    const ga = Math.max((a.cur.gdpLast || 0) * a.cur.value, 1), gb = Math.max((b.cur.gdpLast || 0) * b.cur.value, 1);
    const wa = Math.min(0.5, f.trade / ga), wb = Math.min(0.5, f.trade / gb);
    imp[a.id] = (imp[a.id] || 0) + wa * (b.cur.slump || 0);
    imp[b.id] = (imp[b.id] || 0) + wb * (a.cur.slump || 0);
    // b sold to a: b's goods pay a's duty
    fT[b.id] = (fT[b.id] || 0) + f.trade * tariffBetween(a, b); fW[b.id] = (fW[b.id] || 0) + f.trade;
    const pa = a.cur.pacts || (a.cur.pacts = {}), pb = b.cur.pacts || (b.cur.pacts = {});
    if (!pa[b.id] && wa > 0.01 && wb > 0.01 && !atWar(a, b) && relOf(a, b) > 25 && rnd() < 0.06) {
      pa[b.id] = Math.floor(yr); pb[a.id] = Math.floor(yr);
      if (a.capital) chronT('gov', `${a.name} and ${b.name} sign a trade treaty: their goods cross the border free of duty.`, a.capital);
    }
  }
  for (const id in imp) { const c = W.polities[+id].cur; c.slump = Math.min(1, (c.slump || 0) + imp[id] * 0.3); }
  for (const pol of W.polities) {
    if (!pol.alive || pol.cur.kind < 2) continue;
    const c = pol.cur;
    c.facing = fW[pol.id] ? fT[pol.id] / fW[pol.id] : c.facing * 0.8;
    const P = c.pacts || (c.pacts = {});
    for (const k in P) {
      const o = W.polities[+k];
      if (!o || !o.alive) { delete P[k]; continue; }
      if (atWar(pol, o) || relOf(pol, o) < -10) {
        delete P[k]; if (o.cur.pacts) delete o.cur.pacts[pol.id];
        if (pol.capital) chronT('gov', `The trade treaty between ${pol.name} and ${o.name} is torn up, and the customs posts go back up.`, pol.capital);
      } else if (pol.id < o.id) adjustRel(pol, o, 1);
    }
  }
}
// Extra unemployment from the labour market's side: a slump below trend, union wages above the going rate, and the long-term
// jobless who find it ever harder to get back in; investment and building take some up.
function econUnemp(t) {
  const e = t.ec, cur = t.polity.cur;
  if (!e) return 0;
  e.ltu = e.ltu * 0.8 + Math.max(0, (t.unemp || 0) - 0.06) * 0.2;
  return Math.max(0, -(cur.gap || 0)) * 0.25 + e.union * 0.025 + e.ltu * 0.25 - Math.min(0.03, e.inv / Math.max(t.gdpReal, 1) * 0.25) + (e.strike ? 0.02 : 0);
}
// The panel: firms, capital, credit, unions, rent, classes for a town; cycle, banks and treaties for a realm. (UI only.)
function econMoreHTML(x) {
  const pc = v => Math.round(v * 100) + '%';
  if (x.cur) {
    const c = x.cur;
    if (c.kind < 2) return '';
    const d = Math.max(c.gdpLast || 1, 1), g = c.gap || 0;
    const pacts = Object.keys(c.pacts || {}).map(id => W.polities[+id]).filter(o => o && o.alive);
    return `<div class="kv"><span>Business cycle</span><b>${g > 0.04 ? 'Above trend' : g < -0.04 ? 'Below trend' : 'On trend'} (${g >= 0 ? '+' : ''}${(g * 100).toFixed(1)}%)</b><span>Investment</span><b>${pc((c.invLast || 0) / Math.max(c.gdpRealLast || 1, 1))} of output</b><span>Bank loans</span><b>${pc((c.loans || 0) / d)} of output</b><span>Banks' cushion</span><b>${pc(c.bankCap === undefined ? 0.08 : c.bankCap)}${c.crisis > 0 ? ' · in crisis' : ''}</b><span>In a union</span><b>${pc(c.unionAvg || 0)}</b><span>Duty faced abroad</span><b>${pc(c.facing || 0)}</b></div>
    ${pacts.length ? `<div class="sub">Trades duty-free with ${pacts.slice(0, 5).map(o => esc(o.name)).join(', ')}${pacts.length > 5 ? ` and ${pacts.length - 5} more` : ''}.</div>` : ''}`;
  }
  const t = x, e = t.ec;
  if (!e || t.polity.cur.kind < 2) return '';
  const own = e.state > 0.4 ? 6 : Math.min(5, FIRM_ERA.reduce((s, [id, z], k) => ekn(t, id) ? [1, 2, 2, 3, 4, 4, 5, 5][k] : s, 0));
  const S = e.sh, C = e.pc, Wl = e.wl, Kd = Math.max(1, (t.gdpReal || 1) * kyOf(t));
  const cls = ['Labourers', 'Schooled trades', 'Owners', 'Landlords'], col = ['#c8a45a', '#8cc66a', '#6ab0e0', '#c27ad0'];
  return `<div class="kv"><span>Firms</span><b>${fmt(Math.round(e.firms))} ${OWN_WORD[own]}</b><span>Hands per firm</span><b>~${Math.round(e.fsize)}</b><span>Market power</span><b>${e.conc > 0.45 ? 'Few sellers' : e.conc > 0.2 ? 'Some big ones' : 'Competitive'}, +${pc(e.markup)}</b><span>Capital vs need</span><b>${pc(e.K / Kd)}</b><span>Invested</span><b>${pc(e.inv / Math.max(t.gdpReal || 1, 1))} of output</b><span>Profit rate</span><b>${(e.prof * 100).toFixed(1)}%</b>${e.state > 0.05 ? `<span>Owned by the state</span><b>${pc(e.state)}</b>` : ''}<span>Bank loans</span><b>${fmt(e.loans)}${e.npl > 0.04 ? `, ${pc(e.npl)} bad` : ''}</b><span>In a union</span><b>${pc(e.union)}${e.strike ? ' · on strike' : ''}</b><span>Land rent</span><b>${pc(e.rs)} of income</b>${e.migOut || e.migInShow ? `<span>Moved for work</span><b>${fmt(Math.round(e.migOut))} out, ${fmt(Math.round(e.migInShow))} in</b>` : ''}</div>
  <div class="sub">Each class: share of people, then of income / wealth.</div>
  ${cls.map((n, c) => bar(`${n} ${pc(C[c])}`, S[c], 1, col[c], `${pc(S[c])} / ${pc(Wl[c])}`)).join('')}`;
}
