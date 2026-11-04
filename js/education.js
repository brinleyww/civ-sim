'use strict';
// Schooling, one child at a time. Each age has its own ways of learning: an apprenticeship in a master's workshop,
// a temple school for the sons of the rich, grammar schools, parish and then public primary schools, secondary and
// technical schools, universities and graduate research. Schools have seats and need teachers; children walk to them
// in term time; fees keep the poor out until the state makes schooling free and then compulsory; poverty, work, war and
// distance end many a schooling early. What a person learned, and how far they got, is their record for life:
// it decides the trades open to them (p.edu), whether they can read (p.lit), and so the town's literacy and research.

// age0: entry age; len: years; lvl: the schooling it gives (1 apprenticed, 2 schooled, 3 college); lit: chance it teaches reading
// fee: a year's cost against the town wage; seats: per building; from: what must be finished first (any of)
// teach: the trades that do the teaching, and how many pupils each can take
const EDU_STAGES = [
  { id: 'apprentice', name: 'Apprenticeship', short: 'apprentice', tech: 'agriculture', age0: 12, len: 5, lvl: 1, lit: 0.1, fee: 0, girls: 0.5, work: 1,
    seats: { smithy: 4, carpenter: 4, guildhall: 20, kiln: 3, weaver: 3, tannery: 3, shipyard: 6, factory: 10, brickworks: 4, sawmill: 3, mill: 2 }, teach: null, about: 'Learning a trade at a master’s side, fed and housed in return for the work.' },
  { id: 'temple', name: 'Temple school', short: 'temple school', tech: 'writing', age0: 7, len: 6, lvl: 2, lit: 0.9, fee: 0.4, girls: 0.15, rich: 1,
    seats: { scribe: 20, temple: 10, monastery: 30, templecomplex: 40, library: 12 }, teach: [['priest', 15], ['monk', 12], ['scribe', 10]], about: 'Scribes and priests teach the sons of the powerful their letters and numbers.' },
  { id: 'grammar', name: 'Grammar school', short: 'grammar school', tech: 'philosophy', age0: 8, len: 7, lvl: 2, lit: 0.95, fee: 0.8, girls: 0.05, rich: 1,
    seats: { academy: 60, guildhall: 10, cathedral: 30, library: 10 }, teach: [['philosopher', 20], ['teacher', 25], ['priest', 8]], about: 'Latin, rhetoric and mathematics for boys whose families can pay.' },
  { id: 'primary', name: 'Primary school', short: 'primary school', tech: 'printing', age0: 6, len: 6, lvl: 2, lit: 0.9, fee: 0.2, girls: 0.6,
    seats: { school: 240, temple: 15, cathedral: 40, monastery: 20, almshouse: 15 }, teach: [['teacher', 30], ['priest', 12], ['monk', 8]], about: 'Reading, writing and sums for every child, at first in the church hall, later in a school of its own.' },
  { id: 'secondary', name: 'Secondary school', short: 'secondary school', tech: 'schools', age0: 12, len: 5, lvl: 2, lit: 1, fee: 0.5, girls: 0.8, from: ['primary', 'temple', 'grammar'],
    seats: { school: 120, academy: 60 }, teach: [['teacher', 22]], about: 'Sciences, languages and history until sixteen or so.' },
  { id: 'technical', name: 'Technical college', short: 'technical college', tech: 'steam', age0: 15, len: 3, lvl: 2, lit: 1, fee: 0.4, girls: 0.3, from: ['primary', 'secondary', 'apprentice'],
    seats: { school: 20, factory: 6, campus: 200, techcampus: 150, trainyard: 10 }, teach: [['engineer', 12], ['teacher', 20]], about: 'Mechanics’ institutes, then polytechnics: drawing, machines and electricity for the trades.' },
  { id: 'university', name: 'University', short: 'university', tech: 'university', age0: 18, len: 4, lvl: 3, lit: 1, fee: 2, girls: 0, from: ['secondary', 'grammar', 'temple'],
    seats: { university: 250, campus: 1500, academy: 30, teachhosp: 120, techcampus: 250 }, teach: [['professor', 14]], about: 'Lectures, libraries and examinations: law, medicine, theology, then every science.' },
  { id: 'graduate', name: 'Graduate research', short: 'graduate school', tech: 'science', age0: 22, len: 4, lvl: 3, lit: 1, fee: 1, girls: 0, from: ['university'],
    seats: { university: 25, campus: 200, lab: 15, quantumlab: 20, genecentre: 20, techcampus: 40 }, teach: [['professor', 6], ['scientist', 6]], about: 'Doctorates and research: the people who will make the next inventions.' },
];
const EDU_IX = {}; EDU_STAGES.forEach((S, k) => { S.k = k; EDU_IX[S.id] = k; S.techI = TECH_IX[S.tech] !== undefined ? TECH_IX[S.tech] : -1; S.fromI = (S.from || []).map(id => EDU_IX[id]); for (const b in S.seats) if (!BLD[b]) delete S.seats[b]; });
const EDU_OUT = ['finished', 'left: the family couldn’t pay', 'left to work', 'left for the war', 'left: no school near enough', 'left: no place for them', 'left for marriage', 'still there'];
// buildings children are taught in, and which stages use them
const EDU_BLD = {};
for (const S of EDU_STAGES) if (!S.work) for (const b in S.seats) (EDU_BLD[b] || (EDU_BLD[b] = [])).push(S.k);
const T_SCHOOL = 20;

// ---- the realm's laws ----
// 0 none; 1 free compulsory primary school; 2 compulsory to sixteen; 3 free university as well.
const EDU_LAW_NAME = ['No school laws', 'Free, compulsory primary school', 'Compulsory schooling to sixteen', 'Free schooling up to university'];
function eduLawYear(pol) {
  const c = pol.capital;
  if (!c || !c.alive) return;
  const g = GOV[pol.gov], law = pol.eduLaw || 0, st = g.st;
  let want = 0;
  if (knows(c, 'schools') && (st >= 5 || g.vote)) want = 1;  // the first school laws came from reforming monarchs as much as from republics
  if (want >= 1 && (knows(c, 'massprod') || knows(c, 'radio')) && st >= 6) want = 2;
  if (want >= 2 && knows(c, 'computers') && (g.vote || g.id === 'socialist' || g.id === 'technocracy')) want = 3;
  if (g.id === 'despotism' || g.id === 'junta') want = Math.min(want, 1);
  if (want > law) {
    pol.eduLaw = law + 1;  // one step at a time
    const yr = Math.floor(year());
    if (pol.pop > 300) chronT('gov', [null, `The ${polityTitle(pol)} makes schooling free and compulsory for every child up to twelve. Child labour begins to end.`, `${pol.name} raises the school-leaving age to sixteen.`, `${pol.name} abolishes university fees: anyone who passes the examinations may study.`][pol.eduLaw], c);
    if (pol.eduLaw === 1 && !W.eduLawFirst) { W.eduLawFirst = yr; chronT('tech', `${pol.name} is the first realm in the world to send every child to school by law.`, c); }
  } else if (want < law && rnd() < 0.2) pol.eduLaw = want;  // a tyrant can take it away again
}
// May children this young be put to work? Until there is a school law, from about ten in a settled age.
const childLabour = t => !(t.polity.eduLaw >= 1) && knows(t, 'agriculture') && !t.nomad;

// ---- who goes, and what it costs ----
function eduOpen(t, S) { return S.techI < 0 ? false : !!t.tech[S.techI]; }
function stageFree(t, S) {
  const L = t.polity.eduLaw || 0;
  return S.fee === 0 || (L >= 1 && S.id === 'primary') || (L >= 2 && (S.id === 'secondary' || S.id === 'technical')) || (L >= 3 && (S.id === 'university' || S.id === 'graduate'));
}
function compulsory(t, S, age) {
  const L = t.polity.eduLaw || 0;
  return (L >= 1 && S.id === 'primary' && age < 12) || (L >= 2 && S.id === 'secondary' && age < 16);
}
// Girls: kept out of most schooling for most of history; admitted as the ideas and the governments change.
function girlsIn(t, S) {
  if (knows(t, 'schools') && (t.polity.eduLaw >= 1 || GOV[t.polity.gov].vote)) return S.id === 'university' || S.id === 'graduate' ? (knows(t, 'massprod') ? 1 : 0.35) : 1;
  return S.girls;
}
// How well off the child's household is, 0..1: the house they live in, and in a money economy what the family holds.
function familyMeans(t, p) {
  let w = p.home ? clamp(HOUSES[p.home.tier].cap >= 12 ? 0.55 : p.home.tier / 6, 0, 1) : 0.15;
  // a child's own purse starts as a tenth of its mother's, so it stands for the family's
  if (t.polity.cur.kind >= 2) w = w * 0.4 + clamp(p.cash * 10 / Math.max(1, (t.wage || 1) * 8), 0, 1) * 0.6;
  return w;
}
const clever = p => (typeof TRAIT_IX !== 'undefined' && (p.traits.includes(TRAIT_IX.clever) || p.traits.includes(TRAIT_IX.genius) || p.traits.includes(TRAIT_IX.curious))) ? 1 : 0;

// ---- the yearly round: enrolment, a year's learning, leaving ----
function educationYear(t) {
  if (t.nomad || !t.members.length) return;
  if (!W.eduStart) W.eduStart = W.tick;
  const sc = t.scale || 1, yr = Math.floor(year()), NS = EDU_STAGES.length;
  const E = t.edu || (t.edu = { seats: new Float32Array(NS), pupils: new Float32Array(NS), teach: new Float32Array(NS), q: new Float32Array(NS).fill(1), done: new Float32Array(NS), drop: new Float32Array(NS), childWork: 0, spend: 0, want: 0, uniWant: 0 });
  const seats = E.seats, pupils = E.pupils; seats.fill(0); pupils.fill(0);
  for (let k = 0; k < NS; k++) { const S = EDU_STAGES[k]; if (!eduOpen(t, S)) continue; for (const b in S.seats) seats[k] += (t.count[b] || 0) * S.seats[b]; }
  // apprenticeships: any master can take one, so the town's craft and building work counts too
  seats[0] += (t.jobs[J.CRAFT] + t.jobs[J.BUILD] + t.jobs[J.TRADE]) * sc * 0.35 + tn(t) * 0.01;
  for (const p of t.members) if (p.sch > 0) pupils[p.sch - 1] += sc;
  // teachers: the trades that teach, against the pupils; with no labour figures yet, a fair guess
  for (let k = 0; k < NS; k++) {
    const S = EDU_STAGES[k];
    if (!S.teach) { E.q[k] = 1; continue; }
    let can = 0;
    for (const [id, per] of S.teach) if (OCC_IX[id] !== undefined && t.occN) can += (t.occN[OCC_IX[id]] || 0) * per;
    E.teach[k] = can;
    const crowd = seats[k] > 0 ? clamp(seats[k] / Math.max(pupils[k], 1), 0.4, 1.2) : 0.5;
    const staff = t.occN ? clamp(can / Math.max(pupils[k], 1), 0.25, 1.2) : 0.8;
    E.q[k] = clamp(Math.min(crowd, 1.1) * 0.45 + staff * 0.55, 0.2, 1.15);
  }
  // public money for free schools: a town that can't pay its teachers teaches less
  let spend = 0;
  if (t.polity.cur.kind >= 2) {
    for (let k = 0; k < NS; k++) if (stageFree(t, EDU_STAGES[k]) && EDU_STAGES[k].fee) spend += pupils[k] * EDU_STAGES[k].fee * (t.wage || 1) * 0.05;
    const paid = Math.min(spend, Math.max(0, t.cash) * 0.25);
    t.cash -= paid;
    if (spend > 0) { const f = clamp(paid / spend, 0.5, 1); for (let k = 0; k < NS; k++) if (stageFree(t, EDU_STAGES[k])) E.q[k] *= f; }
  }
  E.spend = spend;
  const left = new Float32Array(NS); for (let k = 0; k < NS; k++) left[k] = Math.max(0, seats[k] - pupils[k]);
  const war = Object.keys(t.polity.warsWith).length > 0, hungry = t.stock[R.FOOD] < tn(t) * 1.2;
  const money = t.polity.cur.kind >= 2, wage = t.wage || 1;
  let childWork = 0;
  E.done.fill(0); E.drop.fill(0);
  for (const p of t.members) {
    if (!p.alive) continue;
    const a = ageOf(p);
    if (p.lit === undefined) p.lit = rnd() < t.literacy ? 1 : 0;  // people from before the schools were counted
    // born under the new schools: whoever reaches working age without any schooling has none, rather than a guess
    if (p.edu < 0 && a >= 12 && p.born >= W.eduStart - 12 * TPY) p.edu = 0;
    if (p.sch > 0) { schoolYear(t, p, a, E, war, hungry, money, wage); continue; }
    if (a > 25 || p.army) continue;
    // a new stage: the youngest first stage open to them, if there is room, they qualify and the family can let them go
    for (let k = NS - 1; k >= 0; k--) {
      const S = EDU_STAGES[k], age0 = S.age0;
      if (a < age0 || a >= age0 + 1.5 || !eduOpen(t, S)) continue;
      if (S.fromI.length && !S.fromI.some(f => didFinish(p, f))) continue;
      if (didFinish(p, k)) continue;
      const must = compulsory(t, S, a);
      if (!must && left[k] < sc * 0.5) continue;
      let pr = must ? 0.97 : 0.5;
      if (p.sex === 1 && !must) pr *= girlsIn(t, S);
      else if (p.sex === 1) pr *= Math.max(0.85, girlsIn(t, S));
      if (!stageFree(t, S)) {
        const means = familyMeans(t, p);
        // fees: the rich pay without noticing, the poor not at all, unless a patron or a scholarship spots a clever child
        pr *= clamp(means * 1.6 - S.fee * 0.25, 0, 1) + (clever(p) ? 0.25 : 0.03);
        if (S.rich) pr *= means > 0.45 ? 1 : 0.25;
      }
      if (S.work) pr = must ? 0 : 0.35 * (p.sex === 0 ? 1 : S.girls);  // apprenticeships only for those not in school
      if (!must && hungry) pr *= 0.6;
      if (rnd() >= pr) continue;
      p.sch = k + 1; p.schY = 0;
      if (!S.work) left[k] -= sc;
      break;
    }
    if (!p.sch && a >= 10 && a < 13 && childLabour(t)) childWork++;
  }
  E.childWork = childWork * sc;
  // literacy: the share of everyone ten or over who can read, from what they really learned
  let rd = 0, all = 0, e1 = 0, e2 = 0, e3 = 0, adults = 0;
  for (const p of t.members) {
    const a = ageOf(p);
    if (a >= 10) { all++; if (p.lit) rd++; }
    // self-taught: a few adults learn to read from neighbours, cheap books and libraries
    if (a >= 15 && !p.lit && t.tech[TECH_IX.printing] && rnd() < 0.004 + (t.count.library ? 0.004 : 0)) p.lit = 1;
    if (a >= 13 && p.job > J.ELDER && p.edu >= 0) { adults++; if (p.edu >= 1) e1++; if (p.edu >= 2) e2++; if (p.edu >= 3) e3++; }
  }
  if (all > 0 && t.tech[TECH_IX.writing]) t.literacy += (rd / all - t.literacy) * 0.5;
  E.mix = adults >= 8 ? [e1 / adults, e2 / adults, e3 / adults] : null;
  // research: graduates and well-taught schools make inventors
  const colShare = E.mix ? E.mix[2] : 0, phd = pupils[EDU_IX.graduate] / Math.max(1, tn(t) * sc);
  const r = clamp(1 + colShare * 0.5 + phd * 6 + (pupils[EDU_IX.primary] > 0 ? (E.q[EDU_IX.primary] - 0.8) * 0.05 : 0), 0.98, 1.25);
  if (Math.abs(r - (t.eduR || 1)) > 0.01) { t.eduR = r; recomputeMods(t); }
  // how many schools the town should have: compulsory children need seats, and families who'd pay want them
  const kids = t.members.reduce((s, p) => { const a = ageOf(p); return s + (a >= 6 && a < 16 ? 1 : 0); }, 0) * sc;
  const target = (t.polity.eduLaw || 0) >= 1 ? kids * 0.95 : kids * (knows(t, 'schools') ? 0.5 : 0.2);
  const have = seats[EDU_IX.primary] + seats[EDU_IX.secondary];
  E.want = knows(t, 'schools') ? (t.count.school || 0) + (have < target ? Math.ceil((target - have) / 360) : 0) : 0;
  E.uniWant = knows(t, 'university') && pupils[EDU_IX.university] > seats[EDU_IX.university] * 0.9 ? (t.count.university || 0) + 1 : 0;
  // under a school law the state builds the schools itself, out of taxes, buying out old houses for the plot if it must
  if ((t.polity.eduLaw || 0) >= 1 && E.want > (t.count.school || 0) + (t.count.q_school || 0)) stateBuild(t, 'school');
  else if ((t.polity.eduLaw || 0) >= 3 && E.uniWant > (t.count.university || 0) + (t.count.q_university || 0)) stateBuild(t, 'university');
  if (seats[EDU_IX.university] > 0 && E.done[EDU_IX.university] > 0) {
    W.uniFirst = W.uniFirst || 0;
    if (!W.uniFirst) { W.uniFirst = yr; chronT('tech', `The first students graduate from the university at ${t.name}: doctors, lawyers and theologians, examined in public.`, t); }
  }
}
function stateBuild(t, id) {
  const D = BLD[id];
  if (!D || (D.tech && !knows(t, D.tech))) return;
  const cost = canPay(t.stock, D.cost) ? D.cost : D.altCost && canPay(t.stock, D.altCost) ? D.altCost : null;
  if (!cost) return;
  let i = findSpot(t, D.size, D.place, landPrefOf(id, 0, t));
  if (i < 0 && typeof buyPlot === 'function') i = buyPlot(t, D.size);
  if (i < 0) return;
  pay(t.stock, cost);
  addBuilding(t, id, i, null);
  t.count['q_' + id] = (t.count['q_' + id] || 0) + 1;
}
const didFinish = (p, k) => { const H = p.schH; if (!H) return false; for (let q = 0; q < H.length; q += 4) if (H[q] === k && H[q + 2] === 0) return true; return false; };
// One year at school for one pupil: learn, perhaps leave early, perhaps finish.
function schoolYear(t, p, a, E, war, hungry, money, wage) {
  const k = p.sch - 1, S = EDU_STAGES[k];
  p.schY++;
  let out = -1;
  if (!eduOpen(t, S)) out = 4;
  else if (!S.work && E.seats[k] <= 0) out = 4;  // the school has gone: none near enough
  else if (p.army || (war && p.sex === 0 && a >= 16 && rnd() < 0.08)) out = 3;
  else if (!compulsory(t, S, a)) {
    const poor = stageFree(t, S) ? 0.02 : clamp(0.12 - familyMeans(t, p) * 0.12, 0.01, 0.12);
    const work = (hungry ? 0.08 : 0.02) + (childLabour(t) && a >= 10 && !S.work ? 0.04 : 0);
    if (rnd() < poor) out = 1;
    else if (rnd() < work) out = 2;
    else if (p.sex === 1 && a >= 16 && !knows(t, 'schools') && rnd() < 0.1) out = 6;
  }
  if (out < 0 && p.schY >= S.len) out = 0;
  if (out < 0) return;
  // what they take away: a full course at a good school teaches more than a crowded one; leaving early teaches some
  const q = E.q[k], frac = out === 0 ? 1 : p.schY / S.len;
  if (out === 0) { p.edu = Math.max(p.edu, S.lvl); E.done[k] += t.scale || 1; }
  else { E.drop[k] += t.scale || 1; if (frac >= 0.6 && S.lvl >= 2) p.edu = Math.max(p.edu, S.lvl - 1); }
  if (!p.lit && rnd() < S.lit * Math.min(1, q) * (0.3 + frac * 0.7)) p.lit = 1;
  if (S.lvl === 3 && out === 0 && rnd() < 0.3) p.skill += 4;
  const H = p.schH || (p.schH = []);
  H.push(k, p.schY, out, Math.floor(year()));
  if (H.length > 24) H.splice(0, 4);
  p.sch = 0; p.schY = 0;
  if (p.job === J.CHILD && a >= 13) p.job = J.NONE;  // into the world of work
}

// ---- a day at school ----
// A pupil in term time (not the summer) walks to a school building, spends the day inside, and walks home.
function schoolDay(p) {
  const k = p.sch - 1, S = EDU_STAGES[k];
  if (!S || S.work || seasonOf() === 1) return false;
  const t = p.town;
  let best = null, bd = 1e9;
  for (const b of t.blds) {
    if (!b.done || !S.seats[b.type]) continue;
    const d = Math.abs(b.x - tx(p.ti)) + Math.abs(b.y - ty(p.ti));
    if (d < bd) { bd = d; best = b; }
  }
  if (!best) return false;
  p.task = T_SCHOOL; p.step = 0; p.obj = best;
  walk(p, best.i, 1, 0);
  return true;
}
function schoolStep(p) {
  if (p.step === 1) { workFor(p, 26 + rint(10), 2, true); return; }  // lessons, out of sight inside
  if (p.step === 2) { p.hidden = false; walk(p, p.home ? p.home.i : p.town.i, 3, 0); return; }
  endTask(p, 4 + rint(12));
}

// ---- shown in the panels ----
function eduPersonHTML(p) {
  const rows = [];
  if (p.sch > 0) { const S = EDU_STAGES[p.sch - 1]; rows.push(`<div class="sub">At ${esc(S.short)}, year ${p.schY + 1} of ${S.len}.</div>`); }
  const H = p.schH;
  if (H && H.length) for (let q = 0; q < H.length; q += 4) { const S = EDU_STAGES[H[q]]; rows.push(`<div class="sub">${esc(S.name)}: ${H[q + 1]} year${H[q + 1] === 1 ? '' : 's'}, ${esc(EDU_OUT[H[q + 2]])} (year ${H[q + 3]})</div>`); }
  if (!rows.length) return '';
  return `<h4>Schooling</h4>${rows.join('')}<div class="sub">${p.lit ? 'Can read and write.' : 'Cannot read.'}</div>`;
}
function eduTownHTML(t) {
  const E = t.edu;
  if (!E) return '';
  const rows = [];
  for (let k = 0; k < EDU_STAGES.length; k++) {
    const S = EDU_STAGES[k];
    if (!eduOpen(t, S) && !E.pupils[k]) continue;
    if (!E.pupils[k] && !E.seats[k]) continue;
    const seat = S.work ? '' : ` of ${fmt(Math.round(E.seats[k]))} places`;
    rows.push(`<span>${esc(S.name)}</span><b>${fmt(Math.round(E.pupils[k]))}${seat}${S.teach ? ` · ${Math.round(E.q[k] * 100)}% taught` : ''}</b>`);
  }
  const law = t.polity.eduLaw || 0, drop = E.drop.reduce((s, v) => s + v, 0), done = E.done.reduce((s, v) => s + v, 0);
  rows.push(`<span>School law</span><b>${esc(EDU_LAW_NAME[law])}</b>`);
  if (done + drop > 0) rows.push(`<span>Left last year</span><b>${fmt(Math.round(done))} finished, ${fmt(Math.round(drop))} early</b>`);
  if (E.childWork >= 1) rows.push(`<span>Children at work</span><b>${fmt(Math.round(E.childWork))}</b>`);
  if (E.mix) rows.push(`<span>Grown-ups schooled</span><b>${Math.round(E.mix[1] * 100)}%, ${Math.round(E.mix[2] * 100)}% college</b>`);
  return rows.length > 2 ? `<h4>Education</h4><div class="kv">${rows.join('')}</div>` : '';
}
function eduBuildingHTML(b) {
  const L = EDU_BLD[b.type], t = b.town;
  if (!L || !t || !t.edu || !b.done) return '';
  const parts = [];
  for (const k of L) {
    const S = EDU_STAGES[k];
    if (!eduOpen(t, S) || !t.edu.seats[k]) continue;
    const share = S.seats[b.type] / t.edu.seats[k], pupils = t.edu.pupils[k] * share, teach = S.teach ? t.edu.teach[k] * share / (S.teach[0][1] || 20) : 0;
    parts.push(`<div class="sub">${esc(S.name)}: ${fmt(Math.round(pupils))} pupils for ${S.seats[b.type]} places${S.teach ? `, about ${fmt(Math.round(teach))} teaching` : ''}.</div>`);
  }
  return parts.length ? `<h4>Teaching</h4>${parts.join('')}` : '';
}
// Schools and universities are built as the pupils need them, not by a fixed head-count.
if (BLD.school) { const w0 = BLD.school.want; BLD.school.want = t => Math.max(w0(t), t.edu ? t.edu.want : 0); }
if (BLD.university) { const w0 = BLD.university.want; BLD.university.want = t => Math.max(w0(t), t.edu ? t.edu.uniWant : 0); }
// and near the front of the queue: a town with children to teach builds the school before the opera house
for (const id of ['school', 'university']) { const k = BUILD_ORDER.indexOf(id); if (k >= 0) { BUILD_ORDER.splice(k, 1); BUILD_ORDER.splice(Math.min(3, BUILD_ORDER.length), 0, id); } }
