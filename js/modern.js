'use strict';
// The modern world between realms: an assembly of nations, the International Games, tourists spending foreign money, and wars fought on computers.

const knowsP = (pol, id) => !!pol && ((pol.know && pol.know[TECH_IX[id]] === 1) || !!(pol.capital && pol.capital.tech[TECH_IX[id]]));
const inAssembly = pol => !!(W.assembly && pol && W.assembly.members.includes(pol.id));

function modernYear() {
  const yr = Math.floor(year());
  assemblyYear(yr);
  if (yr % 4 === 0) gamesYear(yr);
  tourismYear();
}

// Realms that know of the Assembly send delegates to the biggest member capital. Grudges between members cool, and their wars end sooner.
function assemblyYear(yr) {
  const mem = W.polities.filter(p => p.alive && p.towns > 0 && knowsP(p, 'worldassembly'));
  if (mem.length < 2) { if (W.assembly) W.assembly.members = mem.map(p => p.id); return; }
  const A = W.assembly || (W.assembly = { town: -1, since: yr, members: [] });
  const fresh = A.town >= 0 ? mem.filter(p => !A.members.includes(p.id)) : [];
  A.members = mem.map(p => p.id);
  const host = W.towns.find(t => t.id === A.town);
  if (!host || !host.alive || host.occupier || !inAssembly(host.polity)) {
    const cap = mem.map(p => p.capital).filter(t => t && t.alive && !t.occupier).sort((a, b) => tn(b) - tn(a))[0];
    if (!cap) return;
    const first = A.town < 0;
    A.town = cap.id;
    chronT('gov', first ? `Delegates from ${mem.length} realms meet in ${cap.name}: the first World Assembly.` : `The World Assembly moves to ${cap.name}.`, cap);
  } else if (fresh.length) chronT('gov', `${fresh[0].name} takes its seat in the World Assembly.`, host);
  for (let i = 0; i < mem.length; i++) for (let j = i + 1; j < mem.length; j++) if (relOf(mem[i], mem[j]) < 0) adjustRel(mem[i], mem[j], 1);
  for (const war of W.wars) if (war.a.some(inAssembly) && war.b.some(inAssembly)) { war.exA += 0.03; war.exB += 0.03; }
}

// Every four years one big city hosts the Games. Everyone not at war with the hosts comes; medals follow size and luck.
function gamesYear(yr) {
  const pols = W.polities.filter(p => p.alive && p.towns > 0 && knowsP(p, 'globalgames'));
  if (!pols.length) return;
  const cands = W.towns.filter(t => pols.includes(t.polity) && t.alive && !t.occupier && !t.attack && tn(t) >= 300 && !(t.gamesY > yr - 60)).sort((a, b) => tn(b) - tn(a)).slice(0, 6);
  if (!cands.length) return;
  const host = pick(cands);
  host.gamesY = yr;
  const come = W.polities.filter(p => p.alive && p.towns > 0 && (knowsP(p, 'globalgames') || knowsP(p, 'radio')) && !atWar(p, host.polity));
  const away = pols.filter(p => atWar(p, host.polity));
  for (const p of come) adjustRel(p, host.polity, 2);
  let top = null, ts = -1;
  for (const p of come) { const s = p.pop * (0.5 + rnd()) * (p === host.polity ? 1.3 : 1); if (s > ts) { ts = s; top = p; } }
  W.gamesN = (W.gamesN || 0) + 1;
  chronT('wonder', `The ${ordinal(W.gamesN)} International Games open in ${host.name}, with athletes from ${come.length} realm${come.length === 1 ? '' : 's'}${away.length ? `; ${away[0].name} stays away` : ''}. ${top.name} tops the medal table.`, host);
}

// Sights draw visitors from every realm whose people can fly abroad and aren't at war with the hosts. They spend money the realm earns in tax.
function tourismYear() {
  const fliers = W.polities.filter(p => p.alive && p.towns > 0 && (knowsP(p, 'masstourism') || knowsP(p, 'jetliners')));
  for (const t of W.towns) t.tourists = 0;
  if (!fliers.length) return;
  for (const t of W.towns) {
    if (!t.alive || t.occupier || t.nomad || tn(t) < 100) continue;
    let draw = 0;
    for (const k of TOURIST_BLDS) if (t.count[k]) draw += BLD[k].tourist * t.count[k];
    if (t.near.coast > 2 && W.temp[t.i] > 0.62) draw += 1;  // a warm beach
    if (draw <= 0) continue;
    let from = 0;
    for (const p of fliers) if (p !== t.polity && !atWar(p, t.polity)) from++;
    const home = knowsP(t.polity, 'masstourism') ? 1 : 0;
    if (!from && !home) continue;
    t.tourists = Math.round(draw * (40 + tn(t) * 0.04) * (Math.min(from, 12) * 0.5 + home));
    const cur = t.polity.cur;
    if (!cur) continue;
    const v = Math.min(t.tourists * 0.02 * (cur.level || 1), (cur.gdpLast || 0) * 0.04);
    if (v > 0) { cur.treasury += v; cur.incY += v; }
  }
}

// During a war, a realm with a cyber command attacks the enemy's capital: blackouts, emptied banks, wrecked factories. A defender with its own command often turns it back.
function cyberYear(A, B, war) {
  for (const [S0, F] of [[A, B], [B, A]]) for (const pol of S0) {
    if (rnd() > 0.5 || !W.towns.some(t => t.polity === pol && t.count.cybercmd && !t.occupier)) continue;
    const foe = pick(F), tgt = foe.capital;
    if (!tgt || !tgt.alive) continue;
    const guarded = W.towns.some(t => t.polity === foe && t.count.cybercmd);
    if (guarded && rnd() < 0.5) { if (rnd() < 0.3) chronT('war', `${foe.name}'s hackers turn back an attack from ${pol.name}.`, tgt); continue; }
    const say = rnd() < 0.35, roll = rnd();
    if (roll < 0.4) {
      tgt.blackout = Math.floor(year());
      tgt.stock[R.GOODS] *= 0.85; tgt.stock[R.FOOD] *= 0.95;
      if (say) chronT('war', `Hackers from ${pol.name} black out ${tgt.name}. Trains stop and hospitals run on generators.`, tgt);
    } else if (roll < 0.7) {
      const cur = foe.cur, v = cur ? Math.max(0, cur.treasury) * 0.06 : 0;
      if (v > 0) { cur.treasury -= v; cur.spentY += v; }
      if (say) chronT('war', `Money vanishes from ${foe.name}'s banks overnight. Nobody can prove ${pol.name} took it.`, tgt);
    } else {
      tgt.stock[R.GOODS] *= 0.8; tgt.stock[R.TOOLS] *= 0.9;
      if (say) chronT('war', `A computer worm from ${pol.name} wrecks the factories of ${tgt.name}.`, tgt);
    }
  }
}
