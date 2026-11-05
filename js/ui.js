'use strict';
// Panels: realms list, chronicle, inspector, inventions and statistics.

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => Math.round(n).toLocaleString('en-US');
const UI = { filter: 'all', logSeen: -1, logCount: 0, techSel: null, follow: null, followDead: null, slots: new Map(), borders: true, blds: 'auto', names: 'all', techRealm: -1, techView: 'tree', mins: {}, allHidden: false };

function toast(msg, ms) {
  const el = $('toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(UI.toastT);
  UI.toastT = setTimeout(() => { el.hidden = true; }, ms || 2600);
}
const worldEra = () => W.eraNow || 0;
// The age on the top bar belongs to whichever realm you're looking at; with nothing selected it's the world's most advanced.
function eraInFocus() {
  const s = Render.sel;
  let pol = null;
  if (s) pol = s.kind === 'pol' ? s.obj : s.kind === 'town' ? s.obj.polity : s.kind === 'person' ? s.obj.town.polity : s.kind === 'ship' ? s.obj.pol : null;
  if (pol) return [`${ERAS[pol.era || 0]} (${pol.name})`, pol];
  let best = null;
  for (const p of W.polities) if (p.alive && p.pop > 0 && (!best || p.techs > best.techs)) best = p;
  return [best ? `Leading: ${ERAS[best.era || 0]}` : ERAS[0], best];
}
function updateTop() {
  $('yr').textContent = 'Year ' + fmt(Math.floor(year()));
  $('season').textContent = SEASON_NAME[seasonOf()];
  $('era').textContent = eraInFocus()[0];
  $('sPop').textContent = fmt(worldPop());
  $('sPop').title = `Limit ${fmt(W.maxPop)}. ${fmt(W.people.length)} are simulated one by one right now, as many as this computer can run; the rest as crowds that work, grow and die the same way.`;
  $('sTowns').textContent = fmt(W.towns.length);
  $('sKing').textContent = fmt(W.polities.filter(p => p.alive && p.pop > 0).length);
  $('sTech').textContent = `${Object.keys(W.firsts).length}/${TECHS.filter(T => !T.start).length}`;
  $('sWar').textContent = W.wars.length;
}
// Panels refresh several times a second. Rewriting one that hasn't changed, or that the player is pressing on, loses their click,
// their hover and their text selection, so those are left alone.
function setHTML(el, h) {
  if (el._h === h) return true;
  if (UI.pressEl && el.contains(UI.pressEl)) return false;
  el.innerHTML = h; el._h = h;
  return true;
}
function updateRealms() {
  const list = W.polities.filter(p => p.alive && p.pop > 0).sort((a, b) => b.pop - a.pop).slice(0, 40);
  setHTML($('realmList'), list.map(p => `<div class="realm" data-pol="${p.id}"><i style="background:${p.color}"></i><div class="n">${esc(p.name)}${Object.keys(p.warsWith).length ? ' <em class="atwar">at war</em>' : ''}<small>${GOV[p.gov].name}${p.geo ? ' · ' + esc(GEO[p.geo].name) : ''} · ${ERAS[p.era || 0]}</small></div><div class="p">${fmt(p.pop)}</div></div>`).join(''));
  const wl = W.wars;
  $('warCount').textContent = wl.length ? `(${wl.length})` : '';
  const fights = W.battles.slice().sort((a, b) => (b.sA.men0 + b.sB.men0) - (a.sA.men0 + a.sB.men0)).slice(0, 8);
  const fightRows = fights.map(B => { const na = B.sA.ok === undefined ? B.sA.men0 : B.sA.ok, nb = B.sB.ok === undefined ? B.sB.men0 : B.sB.ok, f = na / Math.max(na + nb, 1) * 100; return `<div class="battleRow" data-b="${B.id}"><b>${esc(B.name)}</b><div class="vs"><i style="width:${f}%;background:${B.sA.pol.color}"></i><i style="width:${100 - f}%;background:${B.sB.pol.color}"></i></div><small>${esc(B.sA.pol.name)} ${na} · ${nb} ${esc(B.sB.pol.name)}</small></div>`; }).join('');
  setHTML($('warList'), fightRows +(wl.length ? wl.slice(-14).reverse().map(w => { const bal = w.balance || 0; const lead = bal > 8 ? w.leadA.name : bal < -8 ? w.leadB.name : ''; return `<div class="warRow" data-war="${w.id}"><b>${esc(w.name)}</b><small>${Math.max(1, Math.floor(year() - w.start))} yrs · ${fmt(w.dead)} dead · ${w.a.length + w.b.length} realms${lead ? ' · ' + esc(lead) + ' ahead' : ''}</small></div>`; }).join('') : '<div class="none">The world is at peace, for now.</div>'));
}
function updateChronicle(force) {
  const log = W.log;
  const stamp = log.length ? log[log.length - 1] : null;
  if (!force && stamp === UI.logSeen) return;
  UI.logSeen = stamp;
  const f = UI.filter;
  const match = e => f === 'all' ? (e.kind !== 'spread') : f === 'tech' ? (e.kind === 'tech' || e.kind === 'spread' || e.kind === 'wonder') : f === 'war' ? e.kind === 'war' : f === 'gov' ? (e.kind === 'gov' || e.kind === 'ruler' || e.kind === 'found') : (e.kind === 'plague' || e.kind === 'famine' || e.kind === 'collapse');
  const out = [];
  for (let k = log.length - 1; k >= 0 && out.length < 90; k--) {
    const e = log[k];
    if (match(e)) out.push(`<div class="ev ${e.kind}" data-x="${e.x}" data-y="${e.y}" data-t="${e.town}"><b>${e.yr}</b>${esc(e.text)}</div>`);
  }
  if (!setHTML($('log'), out.join(''))) UI.logSeen = null;  // pressed on just now: try again next time
}

// ---- the inspector ----
function select(kind, obj) {
  Render.sel = kind ? { kind, obj } : null;
  updateInspector();
}
const bar = (label, v, max, col, shown) => `<div class="bar"><span>${label}</span><div class="t"><i style="width:${clamp(v / Math.max(max, 1) * 100, 0, 100)}%;background:${col}"></i></div><em>${shown === undefined ? v : shown}</em></div>`;
const townLink = t => t && t.alive ? `<a class="link" data-act="town" data-id="${t.id}">${esc(t.name)}</a>` : esc(t ? t.name : '?');
const polLink = p => `<a class="link" data-act="pol" data-id="${p.id}">${esc(polityTitle(p))}</a>`;
function taskText(p) {
  if (!p.alive) return `Died: ${p.cause}`;
  const t = p.task;
  const walking = p.st === 1;
  switch (t) {
    case T_GATHER: { const j = p.sideJ || p.job; const n = { [J.FORAGE]: 'wild food', [J.WOOD]: 'timber', [J.CLAY]: 'clay', [J.STONE]: 'stone', [J.FISH]: 'fish', [J.HUNT]: 'game', [J.MINE]: 'ore' }[j] || 'goods'; return p.step === 1 ? `Walking out for ${n}` : p.step === 2 ? `Working: ${n}` : `Carrying ${n} home`; }
    case T_FARM: return (seasonOf() <= 1 ? 'Sowing' : 'Harvesting') + ' the fields';
    case T_CLEAR: return 'Clearing new farmland';
    case T_HERD: return 'Tending the herd';
    case T_BUILD: return walking ? 'Walking to a building site' : 'Building';
    case T_CRAFT: return walking ? 'Off to the workshop' : `At work in the ${p.obj ? BLD[p.obj.type].name.toLowerCase() : 'workshop'}`;
    case T_POST: return p.job === J.SOLDIER ? 'Drilling with the garrison' : p.job === J.SAILOR ? (p.town.shipQ ? `Building a ${(p.town.shipQ.kind === 'war' ? WARSHIPS : MERCHANTMEN)[p.town.shipQ.type].name.toLowerCase()} at the yard` : 'Working the quays') : walking ? 'On the way to work' : `Working in the ${p.obj ? BLD[p.obj.type].name.toLowerCase() : 'office'}`;
    case T_TRADE: return p.step <= 2 && p.obj ? `Trading${p.carry > 0 ? ' ' + RES_NAME[p.ctype].toLowerCase() : ''} to ${p.obj.name}` : 'Heading home from market';
    case T_REST: return p.hidden ? 'Resting at home' : 'Walking home';
    case T_WANDER: return p.job === J.CHILD ? 'Playing' : p.job === J.ELDER ? 'Sitting in the sun' : 'Idling';
    case T_MIGRATE: return `Travelling to ${p.town.name}`;
    case T_WAR: return !p.army ? 'At war' : p.army.goal === 'garrison' ? `Holding ${p.army.target.name}` : p.army.camp ? 'In winter camp' : p.army.phase === 'muster' ? 'Mustering' : `Marching on ${p.army.target.name}`;
    case T_FIGHT: return !p.btl ? 'Fighting' : p.down ? `Lying wounded at the ${p.btl.name}` : p.flee ? `Running from the ${p.btl.name}` : p.foe && p.foe.alive ? `Fighting ${p.foe.name} of ${p.foe.town.polity.name}` : `In the line at the ${p.btl.name}`;
    case T_HUNT: { const H = p.obj && p.obj.n !== undefined ? p.obj : null; return p.step >= 5 ? 'Carrying meat home' : p.step >= 3 ? 'Butchering a kill' : H ? `Hunting ${HERD_TYPES[H.type].name.replace('wild ', '')}` : 'Out hunting'; }
    case T_SCHOOL: return p.step === 1 ? 'Walking to school' : p.step === 2 ? `In lessons at the ${esc(p.obj && BLD[p.obj.type] ? BLD[p.obj.type].name.toLowerCase() : 'school')}` : 'Walking home from school';
    case T_GARDEN: return p.obj ? `Picking ${PLANTS[p.obj.k].name.toLowerCase()}` : p.pk ? `Planting ${PLANTS[p.pk].name.toLowerCase()}` : 'Tending the plots';
    case T_BOARD: return 'Walking to the ship';
    case T_ABOARD: return p.aboard ? `At sea aboard the ${p.aboard.name}` : 'At sea';
    case T_RETURN: return 'Marching home';
  }
  return 'Deciding what to do';
}
function updateInspector() {
  const el = $('right');
  const s = Render.sel;
  if (!s) { el.hidden = true; return; }
  el.hidden = false;
  let h = '', title = '';
  if (s.kind === 'person') { h = personHTML(s.obj); title = s.obj.name; }
  else if (s.kind === 'town') { title = s.obj.name; h = !s.obj.alive ? `<div class="sub">Abandoned. Only ruins remain.</div>` : townHTML(s.obj); }
  else if (s.kind === 'pol') { title = polityTitle(s.obj); h = polHTML(s.obj); }
  else if (s.kind === 'building') { const b = s.obj; title = b.ruin ? 'Ruins' : (b.name || (b.type === 'house' ? HOUSES[b.tier].name : BLD[b.type].name)); h = buildingHTML(b); }
  else if (s.kind === 'tile') { title = BIOME_NAME[W.biome[s.obj]]; h = tileHTML(s.obj); }
  else if (s.kind === 'ship') { title = s.obj.name; h = shipHTML(s.obj); }
  else if (s.kind === 'battle') { title = s.obj.name; h = battleHTML(s.obj); }
  else if (s.kind === 'war') { title = s.obj.name; h = warHTML(s.obj); }
  else if (s.kind === 'army') { title = s.obj.name; h = armyHTML(s.obj); }
  $('rightName').textContent = title;
  const body = $('rightBody'), scroll = body.scrollTop;
  if (body._h === h) return;  // unchanged: keep the player's hover and text selection
  body.innerHTML = h; body._h = h;
  body.scrollTop = scroll;
}
const tagHTML = (T, extra) => `<span class="trait" style="border-color:${T.col};color:${T.col}" title="${esc(T.about)}">${esc(T.name)}${extra || ''}</span>`;
function personHTML(p) {
  const a = Math.floor(ageOf(p));
  const heal = p.hunger >= 2 ? 'Starving' : p.hunger === 1 ? 'Hungry' : p.sick > 0 ? 'Sick' : 'Well';
  const parents = (p.momName || p.dadName) ? `${esc(p.momName || '?')} & ${esc(p.dadName || '?')}` : 'unknown';
  const title = p.leader && p.town.polity.ruler === p ? `${GOV[p.town.polity.gov].ruler[p.sex === 0 ? 0 : 1]} of ${esc(p.town.polity.name)}` : p.idleY > 0 ? `Out of work${p.lostOcc >= 0 ? ' (was a ' + OCCS[p.lostOcc].name.toLowerCase() + ')' : ''}` : occName(p);
  const kid = p.lastKid && p.lastKid.alive ? p.lastKid : null;
  const focusing = UI.follow === p;
  const gear = p.army || p.btl ? `<span>Armed with</span><b>${esc(WEAPONS[p.wep || 0].name)}${p.ammo > 0 ? ` (${Math.floor(p.ammo)} shots)` : ''}${p.shield ? ' and a shield' : ''}</b><span>Wearing</span><b>${esc(ARMORS[p.arm || 0].name)}</b>${p.mount ? `<span>Riding</span><b>${p.mount === 2 ? 'A tank' : 'A warhorse'}</b>` : ''}${p.unit ? `<span>Company</span><b>${esc(p.unit.name)}${p.unit.cap === p ? ' (captain)' : ''}</b>` : ''}${p.foe && p.foe.alive ? `<span>Fighting</span><b><a class="link" data-act="person" data-id="${p.foe.ix}">${esc(p.foe.name)}</a> of ${esc(p.foe.town.polity.name)}</b>` : ''}` : '';
  const hp = p.btl || p.army ? `${bar('Hit points', Math.max(0, p.hp), maxHP(p), '#7fd06a', Math.max(0, Math.round(p.hp)))}${bar('Stamina', p.stam, 100, '#7fb6d8', Math.round(p.stam))}${bar('Nerve', p.mor, 100, '#e6c170', Math.round(p.mor))}${p.wound || p.bleed > 0 ? `<div class="sub" style="color:#ff8f7a">${p.wound === 2 ? 'Wounded in the arm. ' : p.wound === 1 ? 'Wounded in the leg. ' : ''}${p.bleed > 0 ? 'Bleeding.' : ''}</div>` : ''}` : '';
  return `<div class="sub">${title}, ${p.alive ? 'age ' + a : 'died at ' + a}</div>
  <div class="tags">${p.traits.map(k => tagHTML(TRAITS[k])).join('') || '<span>Nothing remarkable</span>'}</div>
  <div class="btnrow">${p.alive ? `<button data-act="focus" class="wide">${focusing ? 'Stop focusing' : 'Focus on this person'}</button>` : kid ? `<button data-act="focuskid" class="wide">Focus on their child, ${esc(kid.name)}</button>` : ''}</div>
  <div class="kv"><span>Doing</span><b>${esc(taskText(p))}</b>
  <span>Home town</span><b>${townLink(p.town)}</b>
  <span>Realm</span><b>${polLink(p.town.polity)}</b>
  <span>Culture</span><b>${esc(p.culture.name)}</b>
  ${p.edu >= 0 ? `<span>Schooling</span><b>${EDU_NAME[p.edu]}</b>` : ''}${p.workB && !p.workB.ruin && p.job > J.ELDER ? `<span>Works at</span><b>${esc(BLD[p.workB.type] ? BLD[p.workB.type].name : p.workB.type)}</b>` : ''}${p.car ? `<span>Car</span><b>${p.parkB && p.parkB !== p.home ? `parked by day ${BLD[p.parkB.type] && BLD[p.parkB.type].parking ? 'in the ' + esc(BLD[p.parkB.type].name.toLowerCase()) : 'at work'}` : 'kept at home'}</b>` : ''}
  ${p.occ >= 0 && p.town.occPay && p.town.polity.cur.kind >= 2 ? `<span>Pay</span><b>${fmtMoney((p.town.wage || 0) * occPayOf(p))} ${esc(p.town.polity.cur.name)}s a year</b>` : ''}
  ${p.idleY > 0 ? `<span>Out of work</span><b>${p.idleY} year${p.idleY === 1 ? '' : 's'}</b>` : ''}
  <span>Health</span><b>${heal}</b>
  ${gear}
  ${p.kills ? `<span>Enemies killed</span><b>${p.kills}</b>` : ''}
  ${p.game ? `<span>Animals killed</span><b>${p.game}</b>` : ''}
  ${p.army ? `<span>Army</span><b><a class="link" data-act="army" data-id="${p.army.id}">${esc(p.army.name)}</a></b>` : ''}
  ${p.carry > 0 ? `<span>Carrying</span><b>${p.carry.toFixed(1)} ${RES_NAME[p.ctype].toLowerCase()}</b>` : ''}
  <span>Parents</span><b>${parents}</b>
  <span>Family</span><b>${esc(p.fam)}</b>
  ${p.town.polity.cur.kind >= 2 ? `<span>Means</span><b>${wealthWord(p)} (${Math.round(p.cash)} ${esc(p.town.polity.cur.name)})</b>` : ''}
  <span>Partner</span><b>${p.spouse ? `<a class="link" data-act="person" data-id="${p.spouse.ix}">${esc(p.spouse.name)}</a>` : 'none'}</b>
  <span>Children</span><b>${p.kids}${kid && p.alive ? ` (<a class="link" data-act="person" data-id="${kid.ix}">${esc(kid.name)}</a>)` : ''}</b></div>
  ${eduPersonHTML(p)}<h4>Abilities</h4>${hp}
  ${statBar('Strength', p.str)}${statBar('Speed', p.spdM)}${statBar('Work', p.workM)}${statBar('Ideas', p.wisM)}${statBar('Bravery', p.moraleM)}${statBar('Leadership', p.leadM)}${statBar('Lifespan', 1 / p.lifeM)}${statBar('Resists disease', 1 / p.sickM)}
  <h4>Life</h4><div class="biolog">${p.log.slice().reverse().map(esc).join('<br>') || 'Nothing yet of note.'}</div>`;
}
const statBar = (label, v) => bar(label, clamp(v, 0, 2), 2, v >= 1.05 ? '#8cc66a' : v <= 0.95 ? '#e0a070' : '#8f8775', v === 1 ? 'avg' : `${Math.round(v * 100)}%`);
const TRANS_NAME = ['On foot', 'Pack animals', 'Wagons', 'Carriages and bicycles', 'Trams and buses', 'Cars', 'Electric cars', 'Self-driving pods'];
function townEconHTML(t) {
  const cur = t.polity.cur, tops = [R.FOOD, R.WOOD, R.CLOTH, R.TOOLS, R.STEEL, R.GOODS];
  if (cur.kind < 2) return `<div class="sub">${cur.kind ? 'People swap salt, shells and cattle.' : 'No money yet. People swap what they have.'}</div>`;
  return `<div class="kv"><span>Output a year</span><b>${fmt(t.gdp)} ${esc(cur.name)}</b><span>Typical wage</span><b>${t.wage.toFixed(1)}</b><span>Loaf-equivalent wage</span><b>${t.realWage.toFixed(1)}</b><span>Money in town</span><b>${fmt(t.cash)}</b><span>Top tenth holds</span><b>${Math.round(t.gini * 70)}%</b></div>
  <div class="goods">${tops.filter(r => wantOf(t, r) > 0 || t.stock[r] > 1).map(r => `<div><span>${RES_NAME[r]}</span><b>${t.price[r] < 10 ? t.price[r].toFixed(1) : fmt(t.price[r])}</b></div>`).join('')}</div>${econMoreHTML(t)}`;
}
function realmEconHTML(p) {
  const c = p.cur, d = c.gdpLast || 1;
  if (c.kind < 2) return `<div class="sub">${MONEY_KIND[c.kind]}. Nobody here is counting yet.</div>`;
  const hl = c.slump > 0.2 ? 'In a depression' : c.boom > 0.5 ? 'Booming' : c.infl > 0.1 ? 'Prices running away' : 'Steady';
  return `<div class="kv"><span>Money</span><b>${esc(c.name)} (${MONEY_KIND[c.kind].toLowerCase()})</b><span>Economy</span><b>${hl}</b><span>Output a year</span><b>${fmt(d)}</b><span>Per person</span><b>${(d / Math.max(p.pop, 1)).toFixed(1)}</b><span>Treasury</span><b>${fmt(c.treasury)}</b><span>Debt</span><b>${fmt(c.debt)} (${Math.round(c.debt / d * 100)}% of output)</b><span>Interest</span><b>${(c.rate * 100).toFixed(1)}%</b><span>Inflation</span><b>${(c.infl * 100).toFixed(1)}%</b><span>Prices since it began</span><b>${c.level.toFixed(1)}x</b><span>Tax rate</span><b>${Math.round(c.tax * 100)}%</b><span>Tariff</span><b>${Math.round(c.tariff * 100)}%</b><span>Worth abroad</span><b>${c.value.toFixed(3)}</b>${c.debase > 0.05 ? `<span>Metal in the coin</span><b>${Math.round((1 - c.debase) * 100)}%</b>` : ''}</div>
  ${c.unpaid ? `<div class="sub" style="color:#ff8f7a">The soldiers haven't been paid for ${c.unpaid} years.</div>` : ''}${econMoreHTML(p)}`;
}
function townHTML(t) {
  const n = tn(t), st = t.stock, yrs = st[R.FOOD] / Math.max(n * 4, 1);
  const goods = [];
  for (let r = 0; r < R.N; r++) {
    const w = wantOf(t, r);
    if (st[r] < 0.5 && w <= 0) continue;
    goods.push(`<div><span class="${w > 0 && st[r] < w * 0.25 ? 'lack' : ''}">${RES_NAME[r]}</span><b>${fmt(st[r])}</b></div>`);
  }
  const jobs = [];
  let maxJ = 1; for (let j = J.FORAGE; j < J.N; j++) maxJ = Math.max(maxJ, t.jobs[j]);
  for (let j = J.FORAGE; j < J.N; j++) if (t.jobs[j] > 0) jobs.push([j, t.jobs[j]]);
  jobs.sort((a, b) => b[1] - a[1]);
  const ks = []; for (let i = 0; i < NT; i++) if (t.tech[i] && !TECHS[i].start) ks.push(TECHS[i]);
  const blds = {};
  for (const b of t.blds) { if (!b.done || b.type === 'hearth') continue; const nm = b.type === 'house' ? HOUSES[b.tier].name : BLD[b.type].name; blds[nm] = (blds[nm] || 0) + 1; }
  const rose = t.risings && t.risings[t.risings.length - 1];
  const status = [t.occupier ? `<b style="color:#ff8f7a">Occupied by ${esc(t.occupier.name)}</b>` : '', t.polity.rebel && !t.polity.rebel.over ? `<b style="color:#ff8f7a">In revolt against ${esc((W.polities[t.polity.rebel.from] || {}).name || 'its realm')} since ${t.polity.rebel.start | 0}</b>` : '', rose && !t.polity.rebel ? `<span>Rose against ${esc(rose.against)} in ${rose.yr}: ${rose.won ? 'won its freedom' : 'crushed'}</span>` : '',t.attack ? '<b style="color:#ff8f7a">Under attack</b>' : '', t.sick > 0 ? '<b style="color:#c3e36a">Plague</b>' : '', t.famine > 1 ? '<b style="color:#f0b46a">Famine</b>' : '', t.crowd > 1.15 ? '<b style="color:#f0b46a">Overcrowded</b>' : '', t.unrest > 45 ? '<b style="color:#ff8f7a">Restless</b>' : '', t.blockaded > W.tick ? '<b style="color:#ff8f7a">Blockaded</b>' : ''].filter(Boolean).join(' · ');
  // what this town is closest to working out
  const prog = [];
  const tot = t.lastTotal || 0;
  for (let i = 0; i < NT; i++) { const T = TECHS[i]; if (T.dom && !t.tech[i] && t.prog[i] > 0 && eligible(t, T)) prog.push([T, t.prog[i] / inventCost(t, T)]); }
  prog.sort((a, b) => b[1] - a[1]);
  const pressures = [];
  for (let k = 0; k < t.needs.length; k++) if (t.needs[k] > 0.6) pressures.push([TAGS[k], t.needs[k]]);
  pressures.sort((a, b) => b[1] - a[1]);
  const arms = [];
  for (let k = WEAPONS.length - 1; k >= 1; k--) if (t.arsenal[k] >= 1) arms.push(`<span>${Math.floor(t.arsenal[k])} ${esc(WEAPONS[k].name)}</span>`);
  for (let k = ARMORS.length - 1; k >= 1; k--) if (t.armor[k] >= 1) arms.push(`<span>${Math.floor(t.armor[k])} ${esc(ARMORS[k].name)}</span>`);
  if (t.tanks >= 1) arms.push(`<span>${t.tanks} tanks</span>`);
  const crowdCol = t.crowd > 1.1 ? '#e0705a' : t.crowd > 0.85 ? '#e6c170' : '#8cc66a';
  return `<div class="sub">${townTier(t)} of ${fmt(n)} · founded year ${t.founded}${status ? '<br>' + status : ''}</div>
  <div class="kv"><span>Realm</span><b>${polLink(t.polity)}</b>
  <span>Culture</span><b>${esc(t.culture.name)}</b>
  ${t.folk ? `<span>Simulated</span><b>${fmt(t.members.length)} one by one, ${fmt(t.folk)} as a crowd</b>` : ''}
  <span>Water</span><b>${t.near.fresh ? 'Fresh water close by' : t.count.well || t.count.cistern || t.count.aqueduct ? 'Wells and cisterns' : t.near.water ? 'Only salt water' : 'None nearby'}</b>
  <span>Getting about</span><b>${TRANS_NAME[t.trans]}${t.mod.rail ? ', railway' : ''}</b>
  ${typeof townLookHTML === 'function' ? townLookHTML(t) : ''}
  <span>Housing</span><b>${fmt(n)} in space for ${fmt(t.cap)}</b>
  <span>Food in store</span><b>${yrs.toFixed(1)} years</b>
  ${t.crop ? `<span>Staple</span><b>${CROPS[t.crop].name} · ${t.fields.length} fields</b>` : ''}
  ${t.tameHerd ? `<span>Herd</span><b>${t.tameHerd.n} ${HERD_TYPES[t.tameHerd.type].name.replace('wild ', '')}</b>` : ''}
  ${landTownHTML(t)}
  ${t.plots.length ? `<span>Planted</span><b>${PLANTS.map((P, k) => P && t.plotC[k] ? `${t.plotC[k]} ${P.name.toLowerCase()}` : '').filter(Boolean).slice(0, 4).join(', ')}</b>` : ''}
  <span>Trades with</span><b>${t.partners.length ? t.partners.slice(0, 3).map(townLink).join(', ') + (t.partners.length > 3 ? ` +${t.partners.length - 3}` : '') : 'nobody yet'}</b>
  ${t.seaPartners && t.seaPartners.length ? `<span>By sea to</span><b>${t.seaPartners.slice(0, 3).map(townLink).join(', ')}${t.seaPartners.length > 3 ? ` +${t.seaPartners.length - 3}` : ''}</b>` : ''}</div>
  <h4>Economy</h4>${townEconHTML(t)}
  <h4>Life here</h4>
  ${bar('Literacy', t.literacy, 1, '#9fb9ee', Math.round(t.literacy * 100) + '%')}${bar('Variety of food', t.dietScore, 1, '#8cc66a', Math.round(t.dietScore * 100) + '%')}${t.smog > 0.05 ? bar('Smog', t.smog, 2, '#a5a298', Math.round(t.smog * 50) + '%') : ''}
  ${bar('Healthcare', careCover(t), 1, '#a7d48a', Math.round(careCover(t) * 100) + '%')}
  <div class="sub">${['Herbs and prayers', 'Herbal lore', 'Physicians', 'Hospitals', 'Anatomists and surgeons', 'Clean water and germ theory', 'Trained nurses', 'Antibiotics', 'Modern medicine', 'Nanomedicine'][[0.03, 0.07, 0.13, 0.16, 0.2, 0.3, 0.34, 0.44, 0.52, 0.62].indexOf(t.medQ)] || 'Herbal lore'}: those it reaches are about ${Math.round(t.medQ * 100)}% less likely to die of what ails them.${t.quarantined > year() - 2 ? ' Gates shut for quarantine.' : ''}</div>
  ${W.wx && !t.nomad ? `<div class="sub">${esc(wxDescribe(t.i))}</div>` : ''}
  ${t.pushWhy ? `<div class="sub">${t.pushWhy === 'land' ? 'Every field within reach is taken: young families are leaving to farm elsewhere.' : t.pushWhy === 'hunger' ? 'Hungry: some are leaving to find food.' : t.pushWhy === 'sea' ? 'Its ships cross the ocean: some sail off to settle distant shores.' : 'Crowded: some are moving out to found new villages.'}</div>` : ''}
  ${t.walls && t.wallKind ? `<div class="sub">Behind ${WALL_KIND[t.wallKind].name} (year ${t.wallY}) with ${t.wallTowers.length / 2} towers and ${t.wallGates.length} gate${t.wallGates.length === 1 ? '' : 's'}.</div>` : ''}${t.tourists > 0 ? `<div class="sub">About ${fmt(t.tourists)} visitors from abroad a year spend their money here.</div>` : ''}${t.gamesY > year() - 12 ? `<div class="sub">Hosted the International Games in year ${t.gamesY}.</div>` : ''}${t.blackout > year() - 3 ? `<div class="sub">Enemy hackers blacked the city out in year ${t.blackout}.</div>` : ''}${W.assembly && W.assembly.town === t.id ? '<div class="sub">Seat of the World Assembly.</div>' : ''}
  <div class="kv"><span>Average age at death</span><b>${Math.round(t.lifeExp)}</b>${t.faith >= 0 ? `<span>Faith</span><b>${esc(W.faiths[t.faith].name)}</b>` : ''}</div>
  <h4>City life</h4>
  ${bar('Crowding', t.crowd, 1.6, crowdCol, Math.round(t.crowd * 100) + '%')}
  <div class="sub">Its streets, water and services can comfortably hold ${fmt(t.support)}.${t.crowd > 1 ? ' Past that: disease, fires, crime and riots.' : ''}</div>
  ${bar('Unrest', t.unrest, 100, t.unrest > 45 ? '#e0705a' : '#c8a45a', Math.round(t.unrest))}
  ${bar('Contentment', t.mod.happy, 60, '#8cc66a', Math.round(t.mod.happy))}
  ${bar('Order', t.mod.order, 60, '#7fb6d8', Math.round(t.mod.order))}
  <h4>Goods</h4><div class="goods">${goods.join('')}</div>
  <h4>Who does what</h4>${jobs.map(([j, c]) => bar(JOB_NAME[j], c, maxJ, JOB_COLOR[j])).join('')}
  ${t.jobs[J.CHILD] + t.jobs[J.ELDER] ? `<div class="sub" style="margin-top:3px">plus ${t.jobs[J.CHILD]} children, ${t.jobs[J.ELDER]} elders</div>` : ''}
  ${eduTownHTML(t)}${socTownHTML(t)}${t.occN ? `<h4>Trades and pay</h4>${townWorkHTML(t)}` : ''}${harbourHTML(t)}${officeHTML(t)}${parkingHTML(t)}
  ${t.devN ? `<div class="sub">${t.devN} old buildings bought and pulled down for new ones, last in year ${t.devY}.</div>` : ''}
  <h4>Working out</h4>${prog.slice(0, 4).map(([T, v]) => bar(esc(T.name), v, 1, '#e6c170', Math.floor(v * 100) + '%')).join('') || '<div class="sub">Nothing close yet.</div>'}
  ${pressures.length ? `<div class="sub" style="margin-top:3px">Pushed on by need: ${pressures.slice(0, 3).map(e => TAG_NAME[e[0]]).join(', ')}.</div>` : ''}
  <h4>Defences and arms</h4>
  ${t.fortMax > 0 ? bar('Fortifications', t.fortHP, t.fortMax, '#a5a298', Math.round(t.fortHP)) : '<div class="sub">No fortifications.</div>'}
  <div class="tags">${arms.join('') || '<span>The store is empty</span>'}</div>
  ${t.ships.length || t.shipQ || t.portLv ? `<h4>Port</h4><div class="sub">${t.ships.length ? t.ships.length + ' ships' : 'No ships yet'}${t.shipQ ? ` · ${(t.shipQ.kind === 'war' ? WARSHIPS : MERCHANTMEN)[t.shipQ.type].name} on the slip, ${Math.floor(t.shipQ.prog / t.shipQ.need * 100)}%` : ''}</div>
  <div class="tags">${t.ships.slice(0, 10).map(s => `<a class="link" data-act="ship" data-id="${s.id}">${esc(s.name)}</a>`).join(' ')}</div>` : ''}
  <h4>Buildings</h4><div class="tags">${Object.entries(blds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span>${v > 1 ? v + ' ' : ''}${esc(k)}</span>`).join('') || '<span>Nothing yet</span>'}</div>
  ${t.queue.length ? `<div class="sub" style="margin-top:4px">Under construction: ${t.queue.slice(0, 4).map(b => b.type === 'house' ? HOUSES[b.up >= 0 ? b.up : b.tier].name : BLD[b.type].name).join(', ')}</div>` : ''}
  <h4>Knows (${ks.length})</h4><div class="tags">${ks.slice(-14).reverse().map(T => `<span>${esc(T.name)}</span>`).join('')}${ks.length > 14 ? '<span>…</span>' : ''}</div>`;
}
function polHTML(p) {
  const towns = W.towns.filter(t => t.polity === p).sort((a, b) => tn(b) - tn(a));
  const r = p.ruler && p.ruler.alive ? p.ruler : null;
  const g = GOV[p.gov];
  const facs = ['Nobles', 'Merchants', 'Clergy', 'The people', 'The army'], facCol = ['#b69fee', '#e6c170', '#c6b8e6', '#8cc66a', '#e0705a'];
  const known = Object.keys(p.known).map(k => W.polities[+k]).filter(o => o && o.alive && o !== p && o.pop > 0).sort((a, b) => relOf(p, b) - relOf(p, a));
  const arm = realmArms(p);
  const armTags = [];
  for (let k = WEAPONS.length - 1; k >= 1; k--) if (arm.w[k] >= 1) armTags.push(`<span>${Math.floor(arm.w[k])} ${esc(WEAPONS[k].name)}</span>`);
  for (let k = ARMORS.length - 1; k >= 1; k--) if (arm.a[k] >= 1) armTags.push(`<span>${Math.floor(arm.a[k])} ${esc(ARMORS[k].name)}</span>`);
  if (arm.tanks >= 1) armTags.push(`<span>${arm.tanks} tanks</span>`);
  const fleet = W.ships.filter(s => s.pol === p);
  const warships = fleet.filter(s => s.kind === 'war').length;
  const armies = W.armies.filter(a => a.pol === p);
  const wars = [...new Set(Object.values(p.warsWith))];
  const allies = p.allies.map(k => W.polities[k]).filter(o => o && o.alive);
  const past = p.rulers.slice().reverse().filter(q => q.to !== null).slice(0, 6);
  return `<div class="sub">${p.alive ? `Since year ${p.founded}` : `Fell in year ${p.fell}`}. ${esc(g.about)}</div>
  ${p.geo ? `<div class="sub" style="color:#e6c170">${esc(GEO[p.geo].name)}. ${esc(GEO[p.geo].about)}</div>` : ''}
  <div class="btnrow"><button data-act="techs" data-id="${p.id}" class="wide">See what this realm knows</button></div>
  <div class="kv"><span>Government</span><b>${g.name}</b>
  ${r ? `<span>Ruler</span><b><a class="link" data-act="person" data-id="${r.ix}">${g.ruler[r.sex === 0 ? 0 : 1]} ${esc(r.name)}</a></b>` : ''}
  <span>Capital</span><b>${p.capital ? townLink(p.capital) : 'none'}</b>
  <span>People</span><b>${fmt(p.pop)}</b>
  <span>Peak</span><b>${fmt(p.peak)}</b>
  <span>Age</span><b>${ERAS[p.era || 0]}</b>
  <span>Inventions known</span><b>${p.techs}</b>
  ${p.overlord !== null ? `<span>Pays tribute to</span><b>${polLink(W.polities[p.overlord])}</b>` : ''}
  <span>Wars started</span><b>${p.wars}</b>
  <span>Towns taken</span><b>${p.conquests}</b></div>
  ${r ? `<div class="tags" style="margin-top:4px">${r.traits.map(k => tagHTML(TRAITS[k])).join('')}</div>` : ''}
  <h4>Money</h4>${realmEconHTML(p)}
  <h4>Politics</h4>
  ${bar('Stability', p.stab, 100, p.stab < 35 ? '#e0705a' : '#8cc66a', Math.round(p.stab))}
  ${p.fac.map((v, k) => bar(facs[k], v, 1, facCol[k], Math.round(v * 100) + '%')).join('')}
  <h4>Standings with others</h4>
  ${known.length ? known.slice(0, 14).map(o => { const [lab, col] = relLabel(p, o), v = relOf(p, o); return `<div class="standing"><i style="background:${o.color}"></i><a class="link" data-act="pol" data-id="${o.id}">${esc(o.name)}</a><span class="st" style="color:${col}">${lab}</span><div class="rel"><u style="left:${v >= 0 ? 50 : 50 + v / 2}%;width:${Math.abs(v) / 2}%;background:${col}"></u></div></div>`; }).join('') : '<div class="sub">Has met nobody yet.</div>'}
  ${allies.length ? `<div class="sub" style="margin-top:3px">Allied with ${allies.map(o => esc(o.name)).join(', ')}.</div>` : ''}
  ${grievancesHTML(p)}
  <h4>War</h4>
  ${wars.length ? wars.map(w => `<div><a class="link" data-act="war" data-id="${w.id}">${esc(w.name)}</a> <span style="color:var(--ink3)">${esc(CAUSE_TEXT[w.cause] || '')}</span></div>`).join('') + bar('Support at home', p.support, 100, p.support < 30 ? '#e0705a' : '#8cc66a', Math.round(p.support) + '%') : '<div class="sub">At peace.</div>'}${inAssembly(p) ? '<div class="sub">Sends delegates to the World Assembly.</div>' : ''}${W.towns.some(o => o.polity === p && o.count.missilesilo) ? '<div class="sub">Has nuclear missiles: few dare attack it.</div>' : ''}${revolutionHTML(p)}${realmSocHTML(p)}
  ${(W.loans || []).some(l => l.to === p.id) ? `<div class="sub">Owes ${(W.loans || []).filter(l => l.to === p.id).map(l => `${fmt(Math.round(l.left))} ${esc(W.polities[l.from].cur.name)}s to ${esc(W.polities[l.from].name)}`).join(', ')}.</div>` : ''}
  <div class="kv"><span>Soldiers</span><b>${fmt(p.soldiers)}</b><span>Armies in the field</span><b>${armies.length}</b><span>Warships</span><b>${warships}</b><span>Merchant ships</span><b>${fleet.length - warships}</b></div>
  ${armies.slice(0, 4).map(a => `<div><a class="link" data-act="army" data-id="${a.id}">${esc(a.name)}</a> <span style="color:var(--ink3)">${a.soldiers.length}</span></div>`).join('')}
  <div class="tags" style="margin-top:4px">${armTags.join('') || '<span>No forged weapons yet</span>'}</div>
  <h4>Paths</h4>
  ${PATHS.map(P => { const tier = p.ptier[P.ix]; const next = tier < P.nodes.length ? PATH_COST[tier] : 0; if (tier === 0 && p.pxp[P.ix] < PATH_COST[0] * 0.3) return ''; return `<div class="sub" style="margin-top:2px"><b style="color:${P.col}">${P.name}</b>: ${tier ? esc(P.nodes[tier - 1].name) : 'starting out'}</div>${next ? bar('Next', p.pxp[P.ix], next, P.col, Math.floor(p.pxp[P.ix] / next * 100) + '%') : ''}`; }).join('')}
  ${past.length ? `<h4>Past rulers</h4>${past.map(q => `<div class="sub">${q.from}–${q.to}: ${esc(q.title)} ${esc(q.name)}${q.epithet ? ' ' + q.epithet : ''}</div>`).join('')}` : ''}
  <h4>Settlements (${towns.length})</h4>${towns.slice(0, 18).map(t => `<div class="kv"><span>${townLink(t)}</span><b>${fmt(tn(t))}</b></div>`).join('')}`;
}
function shipHTML(s) {
  const D = shipDef(s), cargo = [];
  for (let r = 0; r < R.N; r++) if (s.cargo[r] >= 0.5) cargo.push(`<div><span>${RES_NAME[r]}</span><b>${fmt(s.cargo[r])}</b></div>`);
  const doing = s.sunk ? `Lost: ${s.sunk}` : s.kind === 'war' ? (s.mission === 'blockade' ? `Blockading ${s.dest ? s.dest.name : ''}` : 'Guarding the home port') : s.mission === 'carrying' ? `Carrying ${s.pass.length} passengers` : s.state === 1 && s.dest ? (s.leg === 0 ? `Sailing to ${s.dest.name}` : `Sailing home from ${s.dest.name}`) : s.state === 2 && s.hTown ? `Alongside at ${s.hTown.name}, ${s.hph === 'load' || s.hph === 'reload' ? 'loading' : 'unloading'} (${Math.round(clamp((W.tick - (s.hStart || W.tick)) / Math.max(1, (s.hDone || W.tick) - (s.hStart || W.tick)), 0, 1) * 100)}%)` : s.state === 3 && s.hTown ? (s.lighter ? `At anchor off ${s.hTown.name}: no quay big enough, so lighters work the cargo` : `At anchor off ${s.hTown.name}, waiting for a berth`) : s.berth ? 'Alongside in its home port' : 'Laid up on a mooring';
  return `<div class="sub">${esc(D.name)} of ${esc(s.pol.name)}</div>
  <div class="kv"><span>Doing</span><b>${esc(doing)}</b><span>Home port</span><b>${townLink(s.home)}</b><span>Built</span><b>Year ${s.built}</b><span>Voyages</span><b>${s.voyages}</b><span>Speed</span><b>${D.spd}</b>${s.kind === 'trade' ? `<span>Size</span><b>Needs a berth for ${CLS_NAME[shipCls(D)]}</b><span>Carries</span><b>${CK_NAME[D.ck || 'gen']}</b>` : ''}</div>
  ${bar('Hull', s.hp, D.hp, '#a5a298', Math.round(s.hp))}
  ${s.kind === 'trade' ? `<h4>Cargo</h4><div class="goods">${cargo.join('') || '<div><span>Empty</span></div>'}</div>` : `<div class="kv"><span>Guns</span><b>${D.atk}</b><span>Range</span><b>${D.rng} tiles</b></div>`}`;
}
const ORDER_NAME = { hold: 'Holding', advance: 'Advancing', shoot: 'Firing', charge: 'Charging', rout: 'Routed' };
function sideHTML(B, S) {
  const n = S.ok === undefined ? S.men0 : S.ok, g = S.general && S.general.alive ? S.general : null;
  const c = {}; let horse = 0, tank = 0;
  for (const u of S.units) for (const p of u.men) { const k = WEAPONS[p.wep || 0].name; c[k] = (c[k] || 0) + 1; if (p.mount === 1) horse++; else if (p.mount === 2) tank++; }
  const guns = {}; for (const a of S.armies) for (const e of a.guns) { const k = SIEGE[e.type].name; guns[k] = (guns[k] || 0) + 1; }
  const gear = Object.entries(c).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => `<span>${v} ${esc(k)}</span>`).join('') + (horse ? `<span>${horse} mounted</span>` : '') + (tank ? `<span>${tank} tanks</span>` : '') + Object.entries(guns).map(([k, v]) => `<span>${v} ${esc(k)}</span>`).join('');
  const units = S.units.filter(u => u.men.length).slice(0, 8).map(u => `<div class="unitRow"><span>${esc(u.name)}</span><em>${u.men.length}</em><i>${ORDER_NAME[u.order] || u.order}</i></div>`).join('');
  return `<h4 style="color:${S.pol.color}">${esc(S.pol.name)}${S.broken ? ' · broken' : ''}</h4>
  ${bar('Standing', n, Math.max(S.men0, 1), S.pol.color, n)}${bar('Morale', S.morale, 100, '#e6c170', Math.max(0, Math.round(S.morale)))}
  <div class="sub">${g ? `General <a class="link" data-act="person" data-id="${g.ix}">${esc(g.name)}</a>` : 'No general left'}: <b>${esc(PLAN_NAME[S.plan] || '')}</b>. ${esc(PLANS[S.plan] || '')}${S.encircled ? ' <b style="color:#ff8f7a">Surrounded.</b>' : ''}</div>
  <div class="sub">${S.dead} dead · ${S.down} down · ${S.fled} running · ${S.cap} prisoners taken${S.air ? ' · air cover' : ''}</div>
  <div class="tags">${gear}</div>${units}`;
}
function battleHTML(B) {
  if (B.over) return `<div class="sub">This is over. ${B.sA.dead + B.sB.dead} died.</div>`;
  const t = B.town;
  return `<div class="sub">Part of the ${B.war ? `<a class="link" data-act="war" data-id="${B.war.id}">${esc(B.war.name)}</a>` : 'fighting'}, going on for ${Math.floor((W.tick - B.start) / TPY * 12)} months, in ${WX_NAME[B.wx]}. ${B.kind && B.kind !== 'siege' ? esc(BATTLE_KIND[B.kind] || '') : ''}${!t && B.openT > W.tick ? ' The skirmishers are at work; the main lines have not closed yet.' : ''}${B.phase === 'pursuit' ? (B.result === 'withdrawal' ? ' One side is falling back in good order.' : ' One side has broken and is being run down.') : ''}${B.lines ? ' The besiegers have dug lines round the town.' : ''}${B.ambush ? ' It began as an ambush.' : ''}${B.nightT ? ' It began as a night attack.' : ''}${B.ford ? ' A river runs between them.' : ''}${B.siegePlan ? ` ${SIEGE_SAY[B.siegePlan]}` : ''}${B.blockade ? ' A fleet blockades the harbour.' : ''}</div>
  ${B.notes && B.notes.length ? `<div class="sub">${B.notes.map(esc).join(' · ')}</div>` : ''}
  <div class="btnrow"><button data-act="watch" data-id="${B.id}" class="wide">Watch this up close</button></div>
  ${t ? `<div class="sub">${B.stage === 'storm' ? 'They are storming the town.' : 'Encircled, and being worn down.'}${B.hunger ? ' The food has run out.' : ''}${B.breaches ? ` ${B.breaches} breaches in the walls.` : ''}</div>${t.fortMax ? bar('Fortifications', t.fortHP, t.fortMax, '#a5a298', Math.round(t.fortHP)) : ''}` : ''}
  ${sideHTML(B, B.sA)}${sideHTML(B, B.sB)}`;
}
function armyHTML(a) {
  const c = {}, d = {};
  for (const p of a.soldiers) { const n = WEAPONS[p.wep || 0].name; c[n] = (c[n] || 0) + 1; const m = ARMORS[p.arm || 0].name; d[m] = (d[m] || 0) + 1; }
  const phase = { march: `Marching on ${a.target.name}`, muster: 'Mustering', battle: 'In battle', embark: 'Boarding at the port', sail: 'At sea', garrison: `Holding ${a.target.name}` }[a.camp ? '' : a.phase] || (a.camp ? 'In winter camp' : a.phase);
  const goal = a.regroup ? 'to regroup and wait for drafts' : { conquer: 'to take it', raid: 'to burn and loot', relieve: 'to lift the siege', liberate: 'to win it back', intercept: 'to stop the enemy on the road', garrison: 'against rebels and relief' }[a.goal] || '';
  const days = a.soldiers.length ? a.food / (a.soldiers.length * 1.3) : 0;
  return `<div class="sub">${esc(a.pol.name)}, ${esc(phase)} ${esc(goal)}</div>
  <div class="kv"><span>Soldiers</span><b>${fmt(menOf(a))}</b>${(a.rep || 1) > 1 ? `<span>On the map</span><b>${a.soldiers.length} figures, ${a.rep} men each</b>` : ''}${a.phase === 'muster' ? `<span>Mobilising</span><b>${a.contingents ? `with ${a.contingents} towns' contingents` : 'at the rally point'}</b>` : ''}${a.levy ? `<span>Raised as</span><b>a levy, it melts away at harvest</b>` : ''}${a.unpaid ? `<span>Pay</span><b>in arrears</b>` : ''}<span>General</span><b>${a.general && a.general.alive ? `<a class="link" data-act="person" data-id="${a.general.ix}">${esc(a.general.name)}</a>` : 'dead'}</b><span>From</span><b>${townLink(a.home)}</b><span>Kills</span><b>${a.kills}</b>${a.deserted ? `<span>Deserted</span><b>${a.deserted}</b>` : ''}</div>
  ${bar('Morale', a.morale, 100, '#e6c170', Math.round(a.morale))}${bar('Supplies', days, 2, a.starving ? '#e0705a' : '#8cc66a', a.starving ? 'starving' : `${days.toFixed(1)} years`)}
  <h4>Companies</h4>${a.units.filter(u => u.men.length).map(u => `<div class="unitRow"><span>${esc(u.name)}</span><em>${u.men.length}</em></div>`).join('')}
  <h4>Weapons</h4><div class="tags">${Object.entries(c).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<span>${v} ${esc(k)}</span>`).join('')}</div>
  <h4>Armour</h4><div class="tags">${Object.entries(d).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<span>${v} ${esc(k)}</span>`).join('')}</div>
  ${a.guns.length ? `<h4>Engines</h4><div class="tags">${a.guns.map(g => `<span>${esc(SIEGE[g.type].name)}</span>`).join('')}</div>` : ''}
  ${a.battle ? `<div class="btnrow"><a class="link" data-act="battle" data-id="${a.battle.id}">${esc(a.battle.name)}</a></div>` : ''}`;
}
// Why this realm might go to war, and with whom: the same weighing its rulers do each year (war.js warMotive), worked out once a year.
const JOIN_WHY = { ally: 'as an ally', late: 'later, as an ally', coalition: 'in a coalition', grudge: 'out of an old grudge', money: 'paid, but stayed out' };
function grievancesHTML(p) {
  if (!p.alive || !p.capital) return '';
  const G = grievances(p).slice(0, 6), lh = p.lh || 0;
  const rows = G.map(g => {
    const odds = g.power >= 2 ? 'much stronger' : g.power >= 1.3 ? 'stronger' : 'about even';
    const tr = p.truce[g.foe.id] > year() ? `, truce until ${Math.floor(p.truce[g.foe.id])}` : '';
    const parts = g.parts.filter(q => q[1] > 1.001).sort((x, y) => y[1] - x[1]).map(q => `${esc(MOTIVE_NAME[q[0]] || q[0])} ×${q[1].toFixed(1)}`).join(', ');
    const pct = Math.round(g.chance * 100);
    return `<div class="sub" style="margin-top:3px"><i style="display:inline-block;width:8px;height:8px;background:${g.foe.color};margin-right:4px"></i><a class="link" data-act="pol" data-id="${g.foe.id}">${esc(g.foe.name)}</a>: <b>${esc(MOTIVE_NAME[g.why] || g.why)}</b> (wants ${esc(g.target.name)}). ${odds}, relations ${Math.round(relOf(p, g.foe))}${tr}. War this year: ${govSt(p) < 2 ? 'not yet, it is no state to wage one' : pct < 1 ? 'unlikely' : '~' + pct + '%'}${parts ? `<br><span style="color:var(--ink3)">${parts}</span>` : ''}</div>`;
  }).join('');
  return `<h4>Reasons for war</h4>${lh > 0.25 ? `<div class="sub" style="color:#f0b46a">Short of land${p.lhTown ? `: ${esc(p.lhTown.name)} can't find room to build or farm` : ''}.</div>` : ''}${rows || '<div class="sub">No neighbour it could take on, or no reason to.</div>'}${p.warCool > 0 ? `<div class="sub">Not ready for another war for ${p.warCool} years.</div>` : ''}`;
}
function warHTML(w) {
  const armies = W.armies.filter(a => a.war === w), battles = W.battles.filter(b => b.war === w);
  const list = L => L.map(p => `<a class="link" data-act="pol" data-id="${p.id}">${esc(p.name)}</a>`).join(', ');
  const bal = w.ended ? 0 : warBalance(w), held = W.towns.filter(t => t.occupier && (w.a.includes(t.occupier) || w.b.includes(t.occupier)) && (w.a.includes(t.polity) || w.b.includes(t.polity)));
  return `<div class="sub">Began year ${Math.floor(w.start)} ${esc(CAUSE_TEXT[w.cause] || '')}${w.ended ? `, ended year ${w.endYear}` : ''}. ${esc(w.leadA.name)} ${esc(w.goal.ask)} ${esc(w.target ? w.target.name : w.leadB.name)}.</div>
  <div class="kv"><span>Side one</span><b>${list(w.a)}</b><span>Side two</span><b>${list(w.b)}</b><span>Dead in battle</span><b>${fmt(w.dead)}</b><span>Battles won</span><b>${w.won[0]} to ${w.won[1]}</b><span>Towns taken</span><b>${w.taken}</b><span>Prisoners</span><b>${w.prisoners || 0}</b><span>Ships sunk</span><b>${w.sunk || 0}</b>${w.campDead ? `<span>Died of sickness, cold and hunger</span><b>${fmt(w.campDead)}</b>` : ''}<span>Under arms</span><b>${fmt(W.armies.filter(a => !a.militia && w.a.includes(a.pol)).reduce((s0, a) => s0 + menOf(a), 0))} to ${fmt(W.armies.filter(a => !a.militia && w.b.includes(a.pol)).reduce((s0, a) => s0 + menOf(a), 0))}</b>${w.convoys ? `<span>Supply trains lost</span><b>${w.convoys}</b>` : ''}</div>
  <div class="kv"><span>Why</span><b>${esc(MOTIVE_NAME[w.cause] || CAUSE_TEXT[w.cause] || w.cause)}</b><span>Aim</span><b>${esc(w.leadA.name)} ${esc(w.goal.ask)} ${esc(w.target ? w.target.name : w.leadB.name)}</b></div>
  ${w.joined && w.joined.length ? `<h4>Who joined</h4>${w.joined.map(j => { const q = W.polities[j.id]; return q ? `<div class="sub">${j.yr}: ${polLink(q)} ${esc(JOIN_WHY[j.why] || j.why)}, for ${esc((j.side === 'a' ? w.leadA : w.leadB).name)}</div>` : ''; }).join('')}` : ''}
  ${bar('Who’s winning', 50 + bal / 2, 100, '#e6c170', bal > 8 ? esc(w.leadA.name) : bal < -8 ? esc(w.leadB.name) : 'Even')}
  ${bar('Side one is tired', w.exA, 1, '#c8a45a', Math.round(w.exA * 100) + '%')}${bar('Side two is tired', w.exB, 1, '#c8a45a', Math.round(w.exB * 100) + '%')}
  ${held.length ? `<h4>Occupied</h4>${held.map(t => `<div class="sub">${townLink(t)}: held by ${esc(t.occupier.name)}${t.garrison && t.garrison.soldiers.length ? `, ${t.garrison.soldiers.length} in garrison` : ''}</div>`).join('')}` : ''}
  ${battles.length ? `<h4>Fighting now</h4>${battles.map(b => `<div><a class="link" data-act="battle" data-id="${b.id}">${esc(b.name)}</a></div>`).join('')}` : ''}
  ${armies.length ? `<h4>Armies</h4>${armies.map(a => `<div><a class="link" data-act="army" data-id="${a.id}">${esc(a.name)}</a> <span style="color:var(--ink3)">${a.soldiers.length}, ${esc(a.pol.name)}</span></div>`).join('')}` : ''}
  ${w.battles.length ? `<h4>Battles</h4>${w.battles.slice(-10).reverse().map(b => `<div class="sub">${b.yr}: ${esc(b.name)}${b.won ? `, won by ${esc(b.won)}, ${b.dead} dead${b.result === 'withdrawal' ? ', the losers falling back in order' : b.result === 'encircled' ? ', the losers surrounded' : ''}` : ''}</div>`).join('')}` : ''}`;
}
// The top panel for whoever the camera is following.
function updateFocus() {
  const el = $('focus'), p = UI.follow || UI.followDead;
  if (!p) { el.hidden = true; return; }
  el.hidden = false;
  $('focusName').textContent = `${p.name}, ${Math.floor(ageOf(p))}`;
  $('focusDoing').textContent = taskText(p);
  setHTML($('focusTraits'), p.traits.map(k => tagHTML(TRAITS[k])).join(''));
  const kid = p.lastKid && p.lastKid.alive ? p.lastKid : null;
  const key = `${p.id}.${p.alive}.${kid ? kid.id : 0}`;
  if (UI.focusKey !== key) {
    UI.focusKey = key;
    $('focusBtns').innerHTML = (!p.alive && kid ? `<button data-act="focuskid">Follow ${esc(kid.name)}</button>` : '') + `<button data-act="unfocus">${p.alive ? 'Stop' : 'Close'}</button>`;
    const g = $('focusPic').getContext('2d');
    g.clearRect(0, 0, 40, 44);
    g.imageSmoothingEnabled = false;
    if (typeof document !== 'undefined') { const job = p.army || p.btl ? J.SOLDIER : p.job; const sp = personSprite(p.culture.skin, p.id % HAIRS.length, p.sex, job, 0, p.town.polity.era || 0, p.job === J.CHILD, p.wep || 0, p.arm || 0, toHexRgb(p.town.polity.color), p.mount || 0, p.leader, -1); g.drawImage(sp, 0, 0, sp.width * 2, sp.height * 2); }
  }
}
function buildingHTML(b) {
  if (b.ruin) return `<div class="sub">Abandoned in year ${Math.floor(b.ruinYear)}. Grass is taking it back.</div>`;
  const t = b.town, isH = b.type === 'house';
  let extra = '';
  if (isH) {
    const list = t.members.filter(p => p.home === b).slice(0, 12);
    extra = `<h4>Lives here (${b.res}/${HOUSES[b.tier].cap})</h4>${list.map(p => `<div><a class="link" data-act="person" data-id="${p.ix}">${esc(p.name)}</a> <span style="color:var(--ink3)">${esc(occName(p))}, ${Math.floor(ageOf(p))}</span></div>`).join('') || '<div class="sub">Nobody at the moment.</div>'}`;
  } else if (RECIPES[b.type]) {
    const r = chooseRecipe(t, b.type);
    extra = `<h4>Making</h4><div class="sub">${r ? Object.keys(r.out).map(k => RES_NAME[k]).join(', ') : 'Idle: short of materials, or the town has plenty'}</div>`;
  } else if (b.type === 'mine' || b.type === 'oilwell') {
    extra = `<h4>Deposit</h4><div class="sub">${ORE_NAME[W.ore[b.i]]}: ${fmt(W.oreAmt[b.i])} left</div>`;
  }
  const about = !isH && BLD[b.type].about ? `<div class="sub">${esc(BLD[b.type].about)}</div>` : '';
  const fxs = [];
  if (!isH) { const d = BLD[b.type]; if (d.urban) fxs.push(`<span>Room for ${fmt(d.urban)} more people</span>`); if (d.happy) fxs.push(`<span>+${d.happy} contentment</span>`); if (d.order) fxs.push(`<span>+${d.order} order</span>`); if (d.fort) fxs.push(`<span>+${d.fort} fortification</span>`); if (d.study) fxs.push(`<span>${d.study} scholars</span>`); if (d.port && (d.yard || !d.portB)) fxs.push(`<span>Launches ships</span>`); if (d.portB) fxs.push(`<span>${d.berths} berth${d.berths > 1 ? 's' : ''} for ${CLS_NAME[d.cls || d.port || 1]}</span>`, `<span>${esc(d.ck.map(k => CK_NAME[k]).join(', '))}${d.only ? ' only' : ''}</span>`); if (d.parking) fxs.push(`<span>${fmt(d.parking)} ${d.look.kind === 'bike' ? 'bicycle' : 'parking'} spaces</span>`, `<span>${b.cars || 0} parked now</span>`); if (d.office) fxs.push(`<span>${fmt(d.desks)} desks</span>`, `<span>${esc(OFF_SECTORS[d.sec].name)}</span>`, `<span>${d.floors} floor${d.floors > 1 ? 's' : ''}</span>`); if (d.boatRoom) fxs.push(`<span>Keeps ${d.boatRoom} boats</span>`); if (d.boatsY) fxs.push(`<span>Builds ${d.boatsY} boats a year</span>`); if (d.forge) fxs.push(`<span>Forges arms</span>`); if (d.store) fxs.push(`<span>+${d.store} storage</span>`); if (d.yield) fxs.push(`<span>Grows food</span>`); }
  const plot = W.land && t.polity.cur.kind >= 2 ? `<div class="sub">Land: ${landWord(landAt(b.i), landPeak(t))}. The plot would fetch about ${fmtMoney(plotPrice(t, b.i, b.size))} ${esc(t.polity.cur.name)}s.</div>` : '';
  return `<div class="sub">${townLink(t)}${b.done ? '' : ` · under construction, ${Math.floor(clamp(b.prog / b.need, 0, 1) * 100)}%`}${b.up >= 0 ? ` · being rebuilt as ${HOUSES[b.up].name.toLowerCase()}` : ''}</div>${isH && HOUSES[b.tier].id === 'midrise' && MIDRISE[b.var % MIDRISE.length] ? `<div class="sub">${esc(MIDRISE[b.var % MIDRISE.length].name)}, ${MIDRISE[b.var % MIDRISE.length].st} storeys.</div>` : ''}${plot}${about}${fxs.length ? `<div class="tags">${fxs.join('')}</div>` : ''}${extra}${isH ? '' : eduBuildingHTML(b)}`;
}
function tileHTML(i) {
  const own = W.townById[W.owner[i]];
  const rows = [];
  rows.push(['Elevation', W.water[i] ? 'Sea level' : `${Math.round(W.elev[i] * 3000)} m`]);
  rows.push(['Climate', `${W.temp[i] > 0.66 ? 'Hot' : W.temp[i] > 0.42 ? 'Mild' : W.temp[i] > 0.25 ? 'Cool' : 'Freezing'}, ${W.moist[i] > 0.55 ? 'wet' : W.moist[i] > 0.28 ? 'moderate' : 'dry'}`]);
  if (!W.water[i]) {
    rows.push(['Soil', W.fert[i] > 120 ? 'Rich' : W.fert[i] > 60 ? 'Decent' : W.fert[i] > 25 ? 'Poor' : 'Barren']);
    if (W.tree[i]) rows.push(['Trees', W.tree[i] >= 4 ? 'Thick' : 'Scattered']);
    if (W.ore[i] && W.oreAmt[i] > 0) rows.push(['Deposit', ORE_NAME[W.ore[i]]]);
    if (W.wild[i]) rows.push(['Wild crop', CROPS[W.wild[i]].name]);
    if (W.road[i] || (W.rtype && W.rtype[i])) {
      const rt = roadTypeAt(i), T = RT[rt], R0 = typeof roadOfT !== 'undefined' && W.roadNet ? (roadIndex(), W.roadNet.roads[roadOfT[i] - 1]) : null;
      const WHO = { f: 'walkers', h: 'riders', c: 'carts', b: 'bicycles', u: 'buses', m: 'cars', l: 'lorries' };
      if (T) {
        rows.push(['Road', `${R0 && R0.name && R0.name !== T.name ? esc(R0.name) + ', ' : ''}${T.name.toLowerCase()}`]);
        rows.push(['Speed limit', `${T.kmh} km/h`]);
        rows.push(['For', T.who.split('').map(k => WHO[k]).join(', ')]);
        rows.push(['', esc(T.about)]);
        if (R0 && !R0.done) rows.push(['Building', `${Math.round(R0.prog / R0.need * 100)}%, opens about year ${Math.ceil(year() + R0.need - R0.prog)}`]);
      }
    }
    if (W.river[i]) { const flows = W.rivers[W.riverId[i]]; rows.push(['Water', waterNameAt(i)]); if (flows && flows.into && W.bodies[flows.into]) rows.push(['Flows into', W.bodies[flows.into].name]); }
    if (W.canal[i]) { const cn = W.canals[W.canalId[i] - 1]; rows.push(['Canal', cn ? `${cn.name}, ${cn.level === 2 ? 'ship canal' : 'barge canal'}` : 'Dug by hand']); }
    if (W.ditch && W.ditch[i] && W.occ[i] !== 1 && W.occ[i] !== 2) rows.push(['Water', 'An irrigation ditch']);
    else if (W.occ[i] === 2 && wetField(i)) rows.push(['Water', 'Irrigated']);
    if (W.lanes[i]) rows.push(['Width', `${W.lanes[i] + 1} lanes`]);
  } else {
    rows.push(['Water', waterNameAt(i)]);
    const bd = W.bodies[W.body[i]];
    if (bd) { rows.push(['Size', bd.kind === 'ocean' ? 'Open ocean' : `${fmt(bd.area)} tiles`]); if (bd.into && W.bodies[bd.into]) rows.push(['Drains into', W.bodies[bd.into].name]); else if (bd.outlet >= 0 && bd.kind !== 'ocean') rows.push(['Drains by', waterNameAt(bd.outlet) || 'a river']); }
    if (W.fish[i]) rows.push(['Fish', W.fish[i] > 3 ? 'Plenty' : 'Some']);
    if (W.ice[i] > 80) rows.push(['Ice', 'Frozen over']);
    if (W.lane[i] >= SEA_LANE) rows.push(['Shipping', W.seaW[i] ? 'A widened fairway: ships keep to the right' : W.lane[i] >= SEA_LANE * 3 ? 'A busy shipping lane' : 'A shipping lane']);
  }
  landTileRows(i, rows);
  if (W.snowD[i] > 5) rows.push(['Snow', W.snowD[i] > 200 ? 'Glacier' : `${W.snowD[i]} cm`]);
  if (W.wx) rows.push(['Weather', wxDescribe(i)]);
  if (W.type === 'earth') { const lat = earthLat((i / W.w) | 0, W.h), lon = ((i % W.w) + 0.5) / W.w * 360 + EARTH_LON0, L = lon > 180 ? lon - 360 : lon; rows.push(['On the globe', `${Math.abs(lat).toFixed(0)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(L).toFixed(0)}°${L >= 0 ? 'E' : 'W'}`]); }
  return `<div class="sub">${own ? 'Land of ' + townLink(own) : 'Unclaimed'}</div><div class="kv">${rows.map(([a, b]) => `<span>${a}</span><b>${esc(b)}</b>`).join('')}</div>`;
}

// ---- inventions ----
function townsKnowing(ix) { let n = 0; for (const t of W.towns) if (t.tech[ix]) n++; return n; }
function techViewPol() { const id = UI.techRealm; if (id < 0) return null; const p = W.polities[id]; return p && p.alive ? p : null; }
function openTech(pol) {
  $('techModal').hidden = false;
  if (pol) UI.techRealm = pol.id;
  else if (UI.techRealm === -1 && Render.sel) { const s = Render.sel; const q = s.kind === 'pol' ? s.obj : s.kind === 'town' ? s.obj.polity : s.kind === 'person' ? s.obj.town.polity : null; if (q) UI.techRealm = q.id; }
  const list = W.polities.filter(p => p.alive && p.pop > 0).sort((a, b) => b.pop - a.pop);
  if (UI.techRealm !== -1 && !techViewPol()) UI.techRealm = -1;
  $('techRealm').innerHTML = `<option value="-1">The whole world</option>` + list.map(p => `<option value="${p.id}" ${p.id === UI.techRealm ? 'selected' : ''}>${esc(p.name)} (${p.techs})</option>`).join('');
  document.querySelectorAll('#techTabs button').forEach(b => b.classList.toggle('on', b.dataset.v === UI.techView));
  if (UI.techView === 'paths') { $('techInfo').hidden = true; renderPaths(); return; }
  if (UI.techView === 'branches') { $('techInfo').hidden = false; renderBranches(); techDetail(UI.techSel); return; }
  $('techInfo').hidden = false;
  const pv = techViewPol();
  const has = T => T.start || (pv ? pv.know[T.ix] === 1 : !!W.firsts[T.id]);
  const reach = {};
  for (const T of TECHS) reach[T.id] = !T.start && T.reqIx.every(r => has(TECHS[r]));
  let html = '<div id="techGrid"><svg id="techLines"></svg>';
  ERAS.forEach((name, e) => {
    html += `<div class="ecol"><h4>${name}</h4>`;
    for (const T of TECHS) {
      if (T.era !== e) continue;
      const f = W.firsts[T.id], known = has(T);
      const when = pv ? (pv.firsts[T.id] !== undefined ? `year ${pv.firsts[T.id]}` : known && !T.start ? 'learned from others' : '') : (f ? `year ${f.year}` : '');
      html += `<div class="tile ${known ? 'known' : reach[T.id] ? 'ready' : ''} ${T.mil ? 'mil' : ''} ${UI.techSel === T.id ? 'sel' : ''}" data-tech="${T.id}">${esc(T.name)}${when ? `<small>${when}</small>` : T.start ? '<small>from the start</small>' : ''}</div>`;
    }
    html += '</div>';
  });
  html += '</div>';
  $('techTree').innerHTML = html;
  drawTechLines();
  techDetail(UI.techSel);
}
// Three long lines of invention side by side, each step in the order people usually reach it.
function renderBranches() {
  const pv = techViewPol();
  const has = T => T.start || (pv ? pv.know[T.ix] === 1 : !!W.firsts[T.id]);
  let h = `<p class="pathIntro">${pv ? esc(pv.name) : 'The whole world'}: each line runs from the first step to the last. Lit steps are known; outlined ones could be worked out next.</p><div class="branches">`;
  for (const Bq of BRANCHES) {
    const list = Bq.ids.map(id => TECHS[TECH_IX[id]]);
    const done = list.filter(has).length;
    h += `<div class="branch"><h4 style="color:${Bq.col}">${Bq.name}</h4><div class="sub">${esc(Bq.about)}</div>${bar('Known', done, list.length, Bq.col, `${done}/${list.length}`)}`;
    let era = -1;
    for (const T of list) {
      if (T.era !== era) { era = T.era; h += `<div class="beras">${esc(ERAS[era])}</div>`; }
      const known = has(T), ready = !known && T.reqIx.every(r => has(TECHS[r]));
      const when = pv ? pv.firsts[T.id] : W.firsts[T.id] ? W.firsts[T.id].year : undefined;
      h += `<div class="tile bstep ${known ? 'known' : ready ? 'ready' : ''} ${UI.techSel === T.id ? 'sel' : ''}" data-tech="${T.id}" style="${known ? `border-color:${Bq.col}` : ''}">${esc(T.name)}<small>${when !== undefined ? 'year ' + when : ''}${T.fx && Object.keys(T.fx).length ? `${when !== undefined ? ' · ' : ''}${fxText(T.fx)}` : ''}</small></div>`;
    }
    h += '</div>';
  }
  $('techTree').innerHTML = h + '</div>';
}
function renderPaths() {
  const pv = techViewPol() || W.polities.filter(p => p.alive).sort((a, b) => b.pop - a.pop)[0];
  if (!pv) { $('techTree').innerHTML = ''; return; }
  let h = `<p class="pathIntro">${esc(pv.name)}: paths are earned by what its people keep doing. Nobody chooses them.</p><div class="paths">`;
  for (const P of PATHS) {
    const tier = pv.ptier[P.ix], next = tier < P.nodes.length ? PATH_COST[tier] : 0;
    h += `<div class="path"><h4 style="color:${P.col}">${P.name}</h4><div class="sub">${esc(P.about)}</div>${P.nodes.map((n, k) => `<div class="pnode ${k < tier ? 'on' : ''}" style="${k < tier ? `border-color:${P.col}` : ''}"><b>${esc(n.name)}</b><small>${fxText(n.fx)}</small></div>`).join('')}${next ? bar('Next', pv.pxp[P.ix], next, P.col, Math.floor(pv.pxp[P.ix] / next * 100) + '%') : '<div class="sub">Complete.</div>'}</div>`;
  }
  $('techTree').innerHTML = h + '</div>';
}
const FX_NAMES = { attack: 'attack', morale: 'morale', war: 'warlike', conscript: 'larger armies', colony: 'more new towns', fields: 'more land per farmer', admin: 'longer reach', speed: 'walking speed', birth: 'births', trade: 'trade range', share: 'shares ideas', order: 'order', cargo: 'cargo', fish: 'fishing', seaRange: 'sea range', fleet: 'bigger fleets', happy: 'contentment', health: 'health', research: 'ideas', spread: 'ideas spread', farm: 'harvests', herd: 'herds', spoil: 'less spoilage', store: 'storage', deplete: 'soil lasts', craft: 'crafts', mine: 'mining', tier: 'better tools', build: 'building speed', urban: 'room for people', contagion: 'slows the spread of disease', recover: 'more of the wounded live', infant: 'fewer infant deaths', plague: 'epidemics kill fewer', cold: 'less cold', drought: 'drought hurts less', trans: 'faster vehicles', sail: 'ocean sailing', fire: 'fewer fires', defend: 'defence' };
function fxText(fx) { return Object.keys(fx).map(k => FX_NAMES[k] || k).join(', '); }
function drawTechLines() {
  const grid = $('techGrid'), svg = $('techLines');
  if (!grid) return;
  const gr = grid.getBoundingClientRect(), k = gr.width / (grid.offsetWidth || gr.width || 1);  // screen pixels per panel pixel
  svg.setAttribute('width', grid.scrollWidth); svg.setAttribute('height', grid.scrollHeight);
  svg.style.width = grid.scrollWidth + 'px'; svg.style.height = grid.scrollHeight + 'px';
  let out = '';
  const pos = {};
  grid.querySelectorAll('.tile').forEach(el => { const r = el.getBoundingClientRect(); pos[el.dataset.tech] = { l: (r.left - gr.left) / k, r: (r.right - gr.left) / k, y: (r.top - gr.top + r.height / 2) / k }; });
  const sel = UI.techSel;
  for (const T of TECHS) for (const q of T.req || []) {
    const a = pos[q], b = pos[T.id];
    if (!a || !b) continue;
    const on = sel && (T.id === sel || q === sel);
    const same = a.l === b.l;
    const x0 = same ? a.l : a.r, x1 = b.l;
    const mid = (x0 + x1) / 2;
    const d = same ? `M${a.l} ${a.y} C${a.l - 12} ${a.y} ${b.l - 12} ${b.y} ${b.l} ${b.y}` : `M${x0} ${a.y} C${mid} ${a.y} ${mid} ${b.y} ${x1} ${b.y}`;
    out += `<path d="${d}" fill="none" stroke="${on ? '#ffe28a' : 'rgba(241,233,216,.11)'}" stroke-width="${on ? 1.6 : 1}"/>`;
  }
  svg.innerHTML = out;
}
function techRealmLine(T, pv) {
  const name = TAG_NAME[T.tag];
  let out = `<br><span style="color:var(--ink3)">A matter of ${esc(name)}. Hardship in this area and people with a talent for it speed it up.</span>`;
  if (!pv) return out;
  const mine = W.towns.filter(t => t.polity === pv);
  const knowing = mine.filter(t => t.tech[T.ix]).length;
  if (knowing) return out + `<br>${esc(pv.name)}: known in ${knowing} of its ${mine.length} settlements.`;
  let best = null, bv = 0;
  for (const t of mine) { if (!eligible(t, T)) continue; const v = t.prog[T.ix] / inventCost(t, T); if (v > bv) { bv = v; best = t; } }
  out += best ? `<br>${esc(pv.name)}: ${esc(best.name)} is ${Math.floor(bv * 100)}% of the way there.` : `<br>${esc(pv.name)}: nobody there can work on this yet.`;
  const sellers = [];
  for (const o of W.polities) { if (!o.alive || o === pv || !o.know[T.ix] || !pv.known[o.id]) continue; const [lab] = relLabel(pv, o); sellers.push(`${o.name} (${lab.toLowerCase()})`); if (sellers.length >= 4) break; }
  if (sellers.length) out += ` Could trade for it from: ${esc(sellers.join(', '))}.`;
  return out;
}
function techDetail(id) {
  const el = $('techInfo');
  const pv = techViewPol();
  if (!id) { el.innerHTML = `<span style="color:var(--ink3)">Click an invention to see what it needs. ${pv ? `Gold ones are known in ${esc(pv.name)}; blue ones could come next, from the work its people do or from trade.` : 'Gold ones have been found somewhere in the world; blue ones could be found next. Pick a realm above to see what it knows.'} Red-edged ones are weapons of war, which realms guard closely.</span>`; return; }
  const T = TECHS[TECH_IX[id]], f = W.firsts[id];
  const reqs = (T.req || []).map(r => TECHS[TECH_IX[r]].name);
  el.innerHTML = `<b>${esc(T.name)}</b> <span style="color:var(--ink3)">${ERAS[T.era]}</span><br>${esc(T.desc || '')}<br>
  <span style="color:var(--ink3)">${T.start ? 'Everyone starts with this.' : `Comes from: ${JOB_NAME[T.dom]}s${T.alt ? ' and ' + JOB_NAME[T.alt] + 's' : ''}.${reqs.length ? ' Needs ' + reqs.join(', ') + '.' : ''}${T.condText ? ' Only possible with: ' + T.condText.toLowerCase() + '.' : ''}`}
  ${f ? `First found in year ${f.year} by ${esc(f.who)} of ${esc(f.town)}. Known in ${townsKnowing(T.ix)} of ${W.towns.length} settlements.` : T.start ? '' : 'Not yet found by anyone.'}</span>
  ${T.start ? '' : techRealmLine(T, pv)}`;
}

// ---- statistics ----
// Dark steps of the reference palette; a realm keeps its slot for as long as it stays in the top eight.
const CHART_COLS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
function slotFor(id, live) {
  for (const [k] of UI.slots) if (!live.has(k)) UI.slots.delete(k);
  if (UI.slots.has(id)) return UI.slots.get(id);
  const used = new Set(UI.slots.values());
  for (let s = 0; s < CHART_COLS.length; s++) if (!used.has(s)) { UI.slots.set(id, s); return s; }
  return 0;
}
function openEcon() {
  $('econModal').hidden = false;
  const P = W.polities.filter(p => p.alive && p.pop > 0).sort((a, b) => (b.cur.gdpLast || 0) * b.cur.value - (a.cur.gdpLast || 0) * a.cur.value);
  const rows = P.slice(0, 24).map(p => {
    const c = p.cur, d = c.gdpLast || 0, state = c.kind < 2 ? MONEY_KIND[c.kind] : c.slump > 0.2 ? 'Depression' : c.infl > 0.25 ? 'Runaway prices' : c.boom > 0.5 ? 'Boom' : c.unpaid ? 'Unpaid troops' : 'Steady';
    return '<tr><td><i style="background:' + p.color + '"></i>' + esc(p.name) + '</td><td>' + esc(c.kind >= 2 ? c.name : '—') + '</td><td>' + MONEY_KIND[c.kind] + '</td><td class="n">' + fmt(d * c.value) + '</td><td class="n">' + (d * c.value / Math.max(p.pop, 1)).toFixed(1) + '</td><td class="n">' + (c.kind >= 2 ? (c.infl * 100).toFixed(1) + '%' : '—') + '</td><td class="n">' + (c.kind >= 2 ? Math.round(c.debt / Math.max(d, 1) * 100) + '%' : '—') + '</td><td class="n">' + (c.kind >= 2 ? Math.round(c.tax * 100) + '%' : '—') + '</td><td class="n">' + (c.kind >= 2 ? c.value.toFixed(3) : '—') + '</td><td>' + state + '</td></tr>';
  }).join('');
  const biggest = W.towns.slice().sort((a, b) => tn(b) - tn(a)).slice(0, 10);
  const towns = biggest.map(t => '<tr><td><i style="background:' + t.polity.color + '"></i>' + esc(t.name) + '</td><td class="n">' + fmt(tn(t)) + '</td><td class="n">' + t.wage.toFixed(1) + '</td><td class="n">' + t.realWage.toFixed(1) + '</td><td class="n">' + t.price[R.FOOD].toFixed(1) + '</td><td class="n">' + t.price[R.TOOLS].toFixed(1) + '</td><td class="n">' + Math.round(t.gini * 70) + '%</td><td class="n">' + Math.round(t.literacy * 100) + '%</td><td class="n">' + Math.round(t.lifeExp) + '</td></tr>').join('');
  $('econBody').innerHTML = '<p class="sub">Output is shown in silver-weight terms so realms can be compared. Hover a realm’s panel for its full books.</p><div class="scrollT"><table class="econ"><thead><tr><th>Realm</th><th>Money</th><th>Kind</th><th class="n">Output</th><th class="n">Per person</th><th class="n">Inflation</th><th class="n">Debt</th><th class="n">Tax</th><th class="n">Worth abroad</th><th>State</th></tr></thead><tbody>' + rows + '</tbody></table></div><h3>Biggest towns</h3><div class="scrollT"><table class="econ"><thead><tr><th>Town</th><th class="n">People</th><th class="n">Wage</th><th class="n">In loaves</th><th class="n">Bread</th><th class="n">Tools</th><th class="n">Top tenth holds</th><th class="n">Literacy</th><th class="n">Age at death</th></tr></thead><tbody>' + towns + '</tbody></table></div>' + moneyAbroadHTML(P) + faithsHTML();
}
// What moves between realms: payments for goods, loans and their interest, money sent home, tribute, reparations and aid; and what each money buys of the others.
function moneyAbroadHTML(P) {
  const coin = P.filter(p => p.cur.kind >= 2).slice(0, 6);
  let h = '<h3>Money between realms</h3>';
  if (coin.length < 2) return h + '<p class="sub">Until two realms strike coin, everything that crosses a border is barter.</p>';
  h += '<p class="sub">How much of the money along the top one unit of the money down the side buys today. Rates float with each realm’s prices, trade and credit.</p><div class="scrollT"><table class="econ"><thead><tr><th></th>' + coin.map(p => '<th class="n">' + esc(p.cur.name) + '</th>').join('') + '</tr></thead><tbody>';
  for (const a of coin) h += '<tr><td><i style="background:' + a.color + '"></i>1 ' + esc(a.cur.name) + '</td>' + coin.map(b => '<td class="n">' + (a === b ? '—' : fxFmt(fx(a, b))) + '</td>').join('') + '</tr>';
  h += '</tbody></table></div>';
  const F = Object.values(W.flowsLast || {}).map(e => ({ ...e, tot: e.trade + e.loan + e.interest + e.remit + e.tribute + e.aid + e.war })).filter(e => e.tot > 0.5).sort((a, b) => b.tot - a.tot).slice(0, 14);
  if (F.length) {
    const nm = id => { const p = W.polities[id]; return p ? '<i style="background:' + p.color + '"></i>' + esc(p.name) : '?'; }, cell = v => '<td class="n">' + (v >= 0.5 ? fmt(Math.round(v)) : '') + '</td>';
    h += '<h3>Last year’s payments across borders</h3><p class="sub">In silver-weight, from the payer to the payee.</p><div class="scrollT"><table class="econ"><thead><tr><th>From</th><th>To</th><th class="n">For goods</th><th class="n">Loans</th><th class="n">Interest</th><th class="n">Sent home</th><th class="n">Tribute</th><th class="n">Reparations</th><th class="n">Aid</th></tr></thead><tbody>' +
      F.map(e => '<tr><td>' + nm(e.from) + '</td><td>' + nm(e.to) + '</td>' + cell(e.trade) + cell(e.loan) + cell(e.interest) + cell(e.remit) + cell(e.tribute) + cell(e.war) + cell(e.aid) + '</tr>').join('') + '</tbody></table></div>';
  }
  const L = (W.loans || []).filter(l => W.polities[l.from] && W.polities[l.to]);
  if (L.length) h += '<h3>Loans between realms</h3><div class="scrollT"><table class="econ"><thead><tr><th>Lender</th><th>Borrower</th><th class="n">Still owed</th><th class="n">Rate</th><th>Since</th><th>State</th></tr></thead><tbody>' + L.slice(0, 14).map(l => { const a = W.polities[l.from], b = W.polities[l.to]; return '<tr><td><i style="background:' + a.color + '"></i>' + esc(a.name) + '</td><td><i style="background:' + b.color + '"></i>' + esc(b.name) + '</td><td class="n">' + fmt(Math.round(l.left)) + ' ' + esc(a.cur.name) + '</td><td class="n">' + Math.round(l.rate * 100) + '%</td><td>Year ' + l.start + '</td><td>' + (l.missed ? 'Behind on payments' : 'Paying') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  return h;
}
const fxFmt = v => v >= 100 ? fmt(Math.round(v)) : v >= 1 ? v.toFixed(2) : v >= 0.01 ? v.toFixed(3) : v.toExponential(1);
function faithsHTML() {
  const F = (W.faiths || []).slice();
  const seen = new Map();
  for (const t of W.towns) if (t.faith >= 0) seen.set(t.faith, (seen.get(t.faith) || 0) + tn(t));
  const live = F.filter(f => seen.has(f.id)).sort((a, b) => seen.get(b.id) - seen.get(a.id)).slice(0, 8);
  if (!live.length) return '';
  return '<h3>Faiths</h3><div class="scrollT"><table class="econ"><thead><tr><th>Faith</th><th>Worships</th><th class="n">Followers</th><th>Teaches</th><th>Began</th></tr></thead><tbody>' + live.map(f => '<tr><td><i style="background:' + f.color + '"></i>' + esc(f.name) + '</td><td>' + esc(f.kind) + '</td><td class="n">' + fmt(seen.get(f.id)) + '</td><td>' + f.tenets.map(q => TENETS[q].name).join(', ') + '</td><td>Year ' + f.born + ', ' + esc(f.home) + '</td></tr>').join('') + '</tbody></table></div>';
}
function openStats() {
  $('statsModal').hidden = false;
  renderStats();
}
function renderStats() {
  const H = W.history;
  const towns = W.towns.slice().sort((a, b) => tn(b) - tn(a));
  const big = towns[0];
  const causes = Object.entries(W.causes || {}).sort((a, b) => b[1] - a[1]);
  const polTop = W.polities.filter(p => p.alive && p.pop > 0).sort((a, b) => b.pop - a.pop).slice(0, 12);
  $('statsBody').innerHTML = `
  <div class="tilesRow">
    <div class="stile"><b>${fmt(worldPop())}</b><span>people alive</span></div>
    <div class="stile"><b>${fmt(W.births)}</b><span>births, all time</span></div>
    <div class="stile"><b>${fmt(W.deaths)}</b><span>deaths, all time</span></div>
    <div class="stile"><b>${W.polities.length - W.polities.filter(p => p.alive).length}</b><span>realms fallen</span></div>
    <div class="stile"><b>${big ? esc(big.name) : 'none'}</b><span>largest settlement${big ? ', ' + tn(big) + ' people' : ''}</span></div>
    <div class="stile"><b>${fmt(W.warDead || 0)}</b><span>died in finished wars</span></div>
  </div>
  <div class="popCtl"><label>Maximum people: <output id="popCtlV"></output> <input id="popCtl" type="range" min="0" max="10" step="1"></label></div>
  <div class="chartWrap" id="c1w"><h3>World population</h3><canvas id="c1"></canvas></div>
  <div class="chartWrap" id="c2w"><h3>Population of the largest realms</h3><div class="legend" id="c2l"></div><canvas id="c2"></canvas></div>
  ${leadersHTML()}
  <div class="chartWrap" id="c3w"><h3>Inventions known by the leading realms</h3><div class="legend" id="c3l"></div><canvas id="c3"></canvas></div>
  <div class="twoCol">
    <div><h3 style="font:600 14px var(--sans);color:var(--chart-ink);margin-bottom:4px">Realms today</h3>
      <table class="dt"><thead><tr><th>Realm</th><th>Government</th><th>People</th><th>Towns</th><th>Age</th></tr></thead><tbody>${polTop.map(p => `<tr><td>${esc(p.name)}</td><td>${GOV[p.gov].name}</td><td>${fmt(p.pop)}</td><td>${p.towns}</td><td>${ERAS[p.era || 0]}</td></tr>`).join('')}</tbody></table></div>
    <div><h3 style="font:600 14px var(--sans);color:var(--chart-ink);margin-bottom:4px">How people died</h3>
      <table class="dt"><thead><tr><th>Cause</th><th>Deaths</th></tr></thead><tbody>${causes.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${fmt(v)}</td></tr>`).join('')}</tbody></table></div>
  </div>
  ${W.warLog.length ? `<h3 style="font:600 14px var(--sans);color:var(--chart-ink);margin:12px 0 4px">Wars of history</h3><table class="dt"><thead><tr><th>War</th><th>Years</th><th>Sides</th><th>Won by</th><th>Dead</th><th>Towns taken</th></tr></thead><tbody>${W.warLog.slice().reverse().slice(0, 30).map(w => `<tr><td>${esc(w.name)}</td><td>${w.from}–${w.to}</td><td>${esc(w.sideA)} v ${esc(w.sideB)}</td><td>${esc(w.winner || 'nobody')}</td><td>${fmt(w.dead)}</td><td>${w.taken}</td></tr>`).join('')}</tbody></table>` : ''}`;
  syncPopCtl();
  if (H.length < 2) return;
  lineChart($('c1'), $('c1w'), H.map(r => r.yr), [{ name: 'World population', col: CHART_COLS[0], vals: H.map(r => r.pop) }]);
  // realms that were ever biggest, folded to the eight largest peaks
  const peak = new Map();
  for (const r of H) for (const [id, pop] of r.pols) peak.set(id, Math.max(peak.get(id) || 0, pop));
  const ids = [...peak.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]);
  const live = new Set(ids);
  const series = ids.sort((a, b) => a - b).map(id => {
    const m = H.map(r => { const e = r.pols.find(x => x[0] === id); return e ? e[1] : null; });
    return { name: W.polities[id].name, col: CHART_COLS[slotFor(id, live)], vals: m };
  });
  $('c2l').innerHTML = series.map(s => `<span><i style="background:${s.col}"></i>${esc(s.name)}</span>`).join('');
  lineChart($('c2'), $('c2w'), H.map(r => r.yr), series);
  // the race for knowledge: the eight realms that ever knew the most
  const tpeak = new Map();
  for (const r of H) for (const e of r.pols) if (e[2] !== undefined) tpeak.set(e[0], Math.max(tpeak.get(e[0]) || 0, e[2]));
  const tids = [...tpeak.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]), tlive = new Set(tids);
  const tser = tids.sort((a, b) => a - b).map(id => ({ name: W.polities[id].name, col: CHART_COLS[slotFor(id, tlive)], vals: H.map(r => { const e = r.pols.find(x => x[0] === id); return e && e[2] !== undefined ? e[2] : null; }) }));
  $('c3l').innerHTML = tser.map(s => `<span><i style="background:${s.col}"></i>${esc(s.name)}</span>`).join('');
  if (tser.length) lineChart($('c3'), $('c3w'), H.map(r => r.yr), tser); else $('c3w').hidden = true;
}
// Who's ahead: inventions known, world firsts, and how far each realm has got with its two revolutions.
function leadersHTML() {
  const live = W.polities.filter(p => p.alive && p.pop > 0);
  if (!live.length) return '';
  const firsts = {}; for (const id in W.firsts) { const f = W.firsts[id]; if (f.pid !== undefined) firsts[f.pid] = (firsts[f.pid] || 0) + 1; }
  const rows = live.sort((a, b) => b.techs - a.techs || b.pop - a.pop).slice(0, 12);
  const top = rows[0], mostF = live.slice().sort((a, b) => (firsts[b.id] || 0) - (firsts[a.id] || 0))[0];
  const ag = live.slice().sort((a, b) => (b.agRev ? b.agRev.P : 0) - (a.agRev ? a.agRev.P : 0))[0], ind = live.slice().sort((a, b) => (b.indRev ? b.indRev.P : 0) - (a.indRev ? a.indRev.P : 0))[0];
  const pct = R0 => R0 && R0.P > 0 ? Math.round(R0.P * 100) + '%' : '–';
  const latest = p => { let best = null, by = -1; for (const id in p.firsts) if (p.firsts[id] > by) { by = p.firsts[id]; best = id; } return best ? TECHS[TECH_IX[best]].name : '–'; };
  const name = id => W.polities[id] ? esc(W.polities[id].name) : '–';
  return `<h3 style="font:600 14px var(--sans);color:var(--chart-ink);margin:12px 0 4px">Who leads</h3>
  <div class="tilesRow">
    <div class="stile"><b>${esc(top.name)}</b><span>most inventions known, ${top.techs}</span></div>
    <div class="stile"><b>${esc(mostF.name)}</b><span>most first-ever inventions, ${firsts[mostF.id] || 0}</span></div>
    <div class="stile"><b>${W.agRevFirst !== undefined ? name(W.agRevFirst) : '–'}</b><span>first Agricultural Revolution${ag && ag.agRev && ag.agRev.P > 0 ? `; furthest now ${esc(ag.name)} (${pct(ag.agRev)})` : ''}</span></div>
    <div class="stile"><b>${W.indRevFirst !== undefined ? name(W.indRevFirst) : '–'}</b><span>first Industrial Revolution${ind && ind.indRev && ind.indRev.P > 0 ? `; furthest now ${esc(ind.name)} (${pct(ind.indRev)})` : ''}</span></div>
  </div>
  <table class="dt"><thead><tr><th>Realm</th><th>Inventions</th><th>World firsts</th><th>Age</th><th>Farming revolution</th><th>Industrial revolution</th><th>Newest idea</th></tr></thead><tbody>${rows.map(p => `<tr><td>${esc(p.name)}</td><td>${p.techs}</td><td>${firsts[p.id] || 0}</td><td>${ERAS[p.era]}</td><td>${pct(p.agRev)}</td><td>${pct(p.indRev)}</td><td>${esc(latest(p))}</td></tr>`).join('')}</tbody></table>`;
}
// A realm's two revolutions: how far each has got, and which stage it's on.
function revolutionHTML(p) {
  const part = (R0, STAGES, title, col) => {
    if (!R0 || R0.P <= 0) return '';
    const k = revStageNow(R0, STAGES);
    const stage = k >= STAGES.length ? `Complete${R0.done >= 0 ? ` since year ${R0.done}` : ''}.` : `Now: ${STAGES[k].name}. ${STAGES[k].about}`;
    return bar(title, R0.P, 1, col, Math.round(R0.P * 100) + '%') + `<div class="sub">${R0.began >= 0 ? `Began year ${R0.began}. ` : 'Stirring. '}${esc(stage)}</div>`;
  };
  const h = part(p.agRev, AG_STAGES, 'Farming revolution', '#e6c170') + part(p.indRev, IND_STAGES, 'Industrial revolution', '#a5a298');
  return h ? `<h4>Revolutions</h4>${h}` : '';
}
function lineChart(cv, wrap, xs, series) {
  const dpr = window.devicePixelRatio || 1, W0 = cv.clientWidth, H0 = cv.clientHeight;
  cv.width = W0 * dpr; cv.height = H0 * dpr;
  const g = cv.getContext('2d');
  let tip = wrap.querySelector('.ctip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'ctip'; tip.hidden = true; wrap.appendChild(tip); }
  const pad = { l: 46, r: 12, t: 8, b: 20 };
  const maxY = niceMax(Math.max(1, ...series.flatMap(s => s.vals.map(v => v || 0))));
  const x0 = xs[0], x1 = xs[xs.length - 1];
  const px = x => pad.l + (x - x0) / Math.max(1, x1 - x0) * (W0 - pad.l - pad.r);
  const py = v => H0 - pad.b - v / maxY * (H0 - pad.t - pad.b);
  const paint = hover => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W0, H0);
    g.font = '11px "Segoe UI", system-ui, sans-serif';
    g.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const v = maxY * k / 4, y = py(v);
      g.strokeStyle = k === 0 ? '#383835' : '#2c2c2a'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(pad.l, Math.round(y) + 0.5); g.lineTo(W0 - pad.r, Math.round(y) + 0.5); g.stroke();
      g.fillStyle = '#898781'; g.textAlign = 'right'; g.fillText(fmt(v), pad.l - 6, y);
    }
    g.textAlign = 'center';
    const step = niceMax((x1 - x0) / 6);
    for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) { g.fillStyle = '#898781'; g.fillText('Year ' + fmt(v), clamp(px(v), pad.l + 16, W0 - 28), H0 - 8); }
    g.lineJoin = 'round'; g.lineWidth = 2;
    for (const s of series) {
      g.strokeStyle = s.col; g.beginPath(); let on = false;
      s.vals.forEach((v, k) => { if (v === null) { on = false; return; } const x = px(xs[k]), y = py(v); if (on) g.lineTo(x, y); else { g.moveTo(x, y); on = true; } });
      g.stroke();
    }
    if (hover !== null) {
      const x = px(xs[hover]);
      g.strokeStyle = '#383835'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, pad.t); g.lineTo(x, H0 - pad.b); g.stroke();
      for (const s of series) { const v = s.vals[hover]; if (v === null) continue; g.fillStyle = s.col; g.strokeStyle = '#1a1a19'; g.lineWidth = 2; g.beginPath(); g.arc(x, py(v), 4, 0, 6.283); g.fill(); g.stroke(); }
    }
  };
  paint(null);
  cv.onmousemove = e => {
    const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * W0 / (r.width || W0);
    let k = Math.round((mx - pad.l) / (W0 - pad.l - pad.r) * (xs.length - 1));
    k = clamp(k, 0, xs.length - 1);
    paint(k);
    const rows = series.filter(s => s.vals[k] !== null).sort((a, b) => b.vals[k] - a.vals[k]);
    tip.hidden = false;
    tip.innerHTML = `<b>Year ${fmt(xs[k])}</b>` + rows.map(s => `<div><i style="background:${s.col}"></i>${esc(s.name)}: ${fmt(s.vals[k])}</div>`).join('');
    const tw = tip.offsetWidth;
    tip.style.left = (mx + 14 + tw > W0 ? mx - tw - 14 : mx + 14) + 'px';
    tip.style.top = (cv.offsetTop + 10) + 'px';
  };
  cv.onmouseleave = () => { paint(null); tip.hidden = true; };
}
function niceMax(v) {
  const m = Math.pow(10, Math.floor(Math.log10(Math.max(v, 1))));
  const f = v / m;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * m;
}
const HELP_HTML_OLD = `
<p><b>You mostly watch.</b> Nothing here is scripted. Each person eats, marries, works, grows old and dies, and walks to everything they do along a real path. Heavy foot traffic wears trails into roads.</p>
<p><b>Inventions come from practice.</b> Foragers notice seeds; potters' kilns get hot enough to melt copper. A discovery also needs its physical ingredients: no tin nearby or traded in means no bronze. Merchants, migrants and conquerors carry ideas between towns. Small isolated groups can forget them.</p>
<p><b>Resources run out.</b> Hunters thin the herds, axes clear the forests, ploughing wears out the soil, and mines run dry. Drought, plague, famine and war can undo centuries.</p>
<p><b>Realms grow on their own.</b> Bands become tribes, chiefdoms, kingdoms and empires. They march real armies, and distant towns may break away.</p>
<p><b>Controls.</b> Drag to move, scroll to zoom, or use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>. Click anyone or anything to inspect it. <kbd>Space</kbd> pauses, <kbd>1</kbd>–<kbd>5</kbd> set speed, <kbd>M</kbd> switches map view, <kbd>T</kbd> opens inventions, <kbd>Esc</kbd> closes things.</p>
<p><b>Hand of fate.</b> Pick a power at the bottom of the screen, then click the map. Saves stay in this browser; press Save any time. The game also saves itself every few minutes.</p>`;
const HELP_HTML = `
<p><b>You mostly watch.</b> Nothing here is scripted. Each person is born with their own traits, eats, marries, works, grows old and dies, and walks to everything they do along a real path. Heavy foot traffic wears trails into roads.</p>
<p><b>Inventions come from doing, not from time passing.</b> Each town tracks the work its people actually do, and an idea grows out of that work: foragers notice seeds, potters' kilns get hot enough to melt copper. Hardship pushes it harder (famine toward farming, plague toward medicine, war toward weapons) and so do people with the right talent. Every town and realm has its own inventions. Towns share within a realm along their roads; other realms only get an idea if merchants, ships or trains reach them, the owner is willing, and the buyer can pay. Allies give theirs away; enemies never do.</p>
<p><b>Paths.</b> What a realm keeps doing shapes it: conquest, frontier, commerce, maritime, faith, learning, husbandry, industry, city life. See them under Inventions.</p>
<p><b>Cities have limits.</b> Every town can hold only so many people together, set by its wells, aqueducts, sewers, trams, metros and towers. Go past that and you get disease, great fires, crime, riots and people leaving.</p>
<p><b>Realms and politics.</b> Twenty-two kinds of government rise and fall according to who holds power: nobles, merchants, clergy, the people, the army. Rulers have traits that steer the realm. Each realm keeps a standing with every other it has met, and those standings make allies, vassals and enemies.</p>
<p><b>Hunting and planting.</b> Hunters stalk real herds, bring animals down and butcher them where they fall. Wolves, bears and lions take livestock and stragglers until someone goes after them. Planters put in berries, saplings, vegetable plots, fruit trees, herbs, flax and vines as their town learns how and needs them.</p>
<p><b>War is fought for something.</b> Each war has a goal: land, tin, plunder, tribute, revenge, a holy cause. Every year each realm decides where to send people: relieve what's besieged, win back what's lost, stop what's coming, or go looking for gains. Allies come in, and a realm that keeps swallowing its neighbours finds a coalition against it. Spies burn arsenals and kill generals. A town taken stays occupied, paying up and growing angrier, until a treaty says who keeps it, or its people rise.</p>
<p><b>Armies have to be fed.</b> They march as columns with baggage trains behind them, burn the country when supplies run out, make winter camp, catch fever, freeze, thirst and desert. Riders can cut the supply road.</p>
<p><b>Battles.</b> A general picks a plan: line, flank, envelop, wedge, feigned retreat, hold, firepower, armoured thrust. Companies keep formation under their banners. Every soldier has their own weapon, armour, stamina and nerve, picks a real enemy, and can be wounded in the arm or leg, bleed, fall and be carried off later, run, or be taken prisoner. High ground, trees, rivers, rain, snow, fog and being hit from behind all count. When enough run, the whole side breaks and riders hunt them down. Sieges add walls and gates that come down one tile at a time, rams, towers, catapults and guns, starvation, sallies and a final storm of the streets.</p>
<p><b>Watching a fight.</b> The colour at a soldier's feet says whose side they're on, and the lines show who is fighting whom. Each battle has a plate with the numbers on each side. Click it, then "Watch this up close"; with a battle selected, arrows show every company's orders.</p>
<p><b>Which town belongs to whom.</b> Every town flies its realm's flag and has a coloured tab on its name, with a crown for the capital. Pick or hover a realm to see lines from its capital to every town it holds. Ground under occupation changes colour, so the front line shows on the map.</p>
<p><b>Ships</b> are built at wharves, harbours, merchant ports and military ports, by sailors, from real materials. They float only on water, big rivers and canals. Small hulls hug the coast; crossing the open ocean takes caravels and better. Navies are mixed: ships of the line, escorts, longship raiders, submarines that sink merchants unseen, carriers that strike inland, missile cruisers.</p>
<p><b>Canals.</b> A town with the know-how digs where it pays: out to open water, or through a neck of land between two seas. Builders dig it a tile at a time. Going uphill takes locks, barge cuts only pass small boats until they're widened into ship canals, and the owner collects tolls and shuts out enemies. You can dig your own with the Dig canal brush.</p>
<p><b>Water.</b> Ocean, seas and lakes are named, and each lake or inland sea drains by a real outlet into the next body downhill: creek into stream into river into lake into sea. People need fresh water. Hover or click any water to see what it is and where it goes.</p>
<p><b>Paths.</b> Trails appear where people walk, and nobody builds across them. Busy ones become roads, then widen and take more land. How fast people travel depends on what their town has reached: pack animals, wagons, carriages, bicycles, buses, cars, electric pods. Everyone picks the fastest route for how they're travelling, trains included. People go round buildings, and a packed street slows down and pushes them onto the next one.</p>
<p><b>Snow</b> lies as deep as it really is. It slows travel, stops sowing and adds to winter's fuel bill. Old snow packs into glaciers that creep downhill, overloaded slopes avalanche, blizzards cross the map, spring melt floods rivers, and lakes and seas freeze shut for ships. The climate drifts over centuries, and heavy industry warms it.</p>
<p><b>What's in the ground.</b> Coal lies in long seams, iron in thin bands through the hills, copper in clusters, gold in hairline veins, oil in a few rare basins, salt on flats. Whatever a realm has most of gives it a character, like Coal country or Salt lords, with its own strengths.</p>
<p><b>Money.</b> It starts with barter, then salt and cattle, then coin, banknotes, paper and numbers on a screen, each realm with its own currency. Every town has its own prices, dear when short and cheap when plentiful, and merchants go where the gap is. Taxes fill a treasury that pays soldiers, builders and interest. A shortfall means bonds, clipped coin or the printing press: then come inflation, bank runs, stock crashes, default and depression. Unpaid soldiers mutiny, and currencies rise and fall against each other. See Economy at the top and any realm's panel.</p>
<p><b>Land from the sea.</b> Nothing is built on water and no paths cross it. A crowded rich town can pay a great deal to fill in its shallows, but never a channel, a harbour front or a shipping lane, so trade routes stay open.</p>
<p><b>Weather.</b> Air moves over the map on real prevailing winds: trade winds, westerlies, polar easterlies. Storms (L) and clear-sky highs (H) drift across it; damp air rising over mountains rains on the near side and leaves a dry shadow beyond. Seasons run opposite either side of the equator. A season's rain against what's normal there sets the harvest; dry runs bring drought and wildfire, deluges flood the rivers, warm seas breed hurricanes, and downpours turn dirt roads to mud. The Weather map view shows warmth, cloud, rain, snow and wind; hover for the weather at any spot.</p>
<p><b>Medicine, food and transport.</b> Three long lines of invention (see "Lines of invention" in Inventions, which also has Modern life and Modern war). Healers' huts, apothecaries, hospitals, quarantine stations and clinics each look after a number of people; how much good that does depends on what the town knows. Quarantine shuts a town's gates when an epidemic is near; sickness travels along roads and by ship.</p>
<p><b>Spreading out.</b> When every field within reach is taken, or the town goes hungry, families leave to found villages on the best land they can find: fresh water first, then good soil, woods and game, ore their realm lacks, a city to sell to; never high, steep or cold if they can help it. Whether a new village stays loyal depends on how far the crown's roads, writing and horses reach. A realm that can write keeps state granaries and sends grain to hungry towns.</p>
<p><b>Money between realms.</b> Each realm's money floats against the others. Merchants pay across borders, migrants carry their savings and send money home, rich treasuries lend to short ones (and remember a default), friends send aid in famine, and vassals and losers pay tribute and reparations. The Economy window shows exchange rates, payments and loans. People's own savings decide who goes hungry first in a shortage.</p>
<p><b>The Agricultural and Industrial Revolutions.</b> Each realm goes through its own, stage by stage. The farming one (new rotations, improved breeds, enclosure, drills and drains, farm machines) is pushed by land hunger, markets and learning, and raises harvests, herds and how much land one farmer works; enclosure drives smallholders into the towns. The industrial one (cottage industry, mills, steam, coal and iron, factories, railways) needs coal, iron, capital, markets and the hands the farming revolution frees up; it multiplies what towns make and swells the cities, at first with smoke, disease and riots, until sanitation and unions catch up. Realms that come later catch up faster by copying those ahead. Statistics shows who leads in inventions and in each revolution; a realm's panel shows its progress.</p>
<p><b>Food.</b> A town that runs short kills part of its herd, falls back on famine foods, buys grain from neighbours that have some to spare, and later on its state runs relief. New villages live off the land until their first harvest, with provisions from the town they left. Dozens of food inventions and buildings make each step stronger.</p>
<p><b>City walls.</b> A threatened town rings itself with walls that follow its own shape: a timber palisade at first, stone once it knows masonry, and low bastioned walls against cannon later on. Roads pass through gatehouses. Towers shoot at besiegers (muskets, once the town has them), bastions turn aside half of every cannonball, breaches are patched after the siege, and a town that outgrows its walls builds a wider circuit. In the railway age a big, safe city pulls them down, and a boulevard follows the line.</p>
<p><b>The modern world.</b> Telephones, microchips, mobile phones and social media spread news faster (social media also stirs up unrest). Realms that know of the World Assembly send delegates to the biggest member capital: grudges between members cool and their wars end sooner. Every four years a big city hosts the International Games. Once people fly abroad, sights, beaches, theme parks and hotels bring in foreign tourists and their money. Nobody lightly attacks a realm with nuclear missiles, least of all another nuclear realm. In war, jet fighters shoot down far more bombers, drones strike more often and are hard to hit, helicopter gunships rake troops in the open, rocket launchers fire whole salvos, and a cyber command can black out an enemy capital or empty its banks.</p>
<p><b>The home front.</b> Every realm at war has a level of support at home. Invaded peoples fight on; long wars of conquest with heavy losses, high taxes and rising prices lose support, and with it morale, recruits and in the end the war. Rich realms hire mercenaries. Archers shoot better downhill, attackers tire going uphill, and surgeons save some of the fallen.</p>
<p><b>The rest of life.</b> Earthquakes, tsunamis, volcanoes, wildfires, locusts and great storms. Faiths that begin, spread, split and persecute (see the Faith map view). A varied diet, literacy, smog and wealth all change how long people live. Cleared slopes erode, old buildings fall down, and families pass on names and money.</p>
<p><b>A million people.</b> Past what your computer can run one at a time, each town keeps a fair sample of real individuals and treats the rest as a crowd. Their work is multiplied up, and the crowd is born and dies at the sample's rate. Hover the population figure to see the split.</p>
<p><b>Controls.</b> Drag to move, scroll to zoom, or use <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>. Click anyone or anything to inspect it; double-click a person to focus on them (<kbd>F</kbd>). <kbd>Space</kbd> pauses, <kbd>1</kbd>–<kbd>5</kbd> set speed, <kbd>M</kbd> switches map view, <kbd>B</kbd> toggles realm colours, <kbd>T</kbd> opens inventions, <kbd>H</kbd> hides all panels, <kbd>Esc</kbd> closes things. Every panel has a – button that minimises it.</p>
<p><b>Tools.</b> Pick a tool at the bottom of the screen, then click or drag on the map. Land, Resources and Soil reshape the world while it runs. "times" repeats a power with one click; Keep leaves the tool selected. Saves stay in this browser.</p>`;

// The harbour: berths and who is in them, the queue at anchor, what it handles in a year, and the town's own boats.
function harbourHTML(t) {
  if (!t.ports || !t.ports.length) return t.boats ? `<h4>Boats</h4><div class="sub">${t.boats} boats, ${t.boatsOut || 0} out on the water.</div>` : '';
  const H = harbour(t), st = t.portSt || {}, by = [0, 0, 0, 0, 0], busy = [0, 0, 0, 0, 0];
  for (const x of H.berths) { by[x.cls]++; if (x.ship) busy[x.cls]++; }
  const rows = [];
  for (let c = 1; c <= 4; c++) if (by[c]) rows.push(`<span>Berths for ${CLS_NAME[c]}</span><b>${busy[c]} of ${by[c]} in use</b>`);
  const waiting = H.q.filter(s => !s.sunk && s.state === 3).length;
  rows.push(`<span>At anchor, waiting</span><b>${waiting}</b>`, `<span>Ships handled last year</span><b>${st.lastHandled || 0}</b>`, `<span>The entrance takes</span><b>up to ${Math.round(TPY / entranceGap(t))} ships a year</b>`, `<span>Dock gangs</span><b>${Math.round((t.gang || 1) * 100)}% of what the berths need</b>`);
  if (st.lastTurn) rows.push(`<span>Turned away</span><b>${st.lastTurn} ships too big, or the wrong kind</b>`);
  rows.push(`<span>Boats</span><b>${t.boats || 0} kept, ${t.boatsOut || 0} out${t.boatsOrd ? `, ${t.boatsOrd} on the way` : ''}${t.boatsSale ? `, ${t.boatsSale} for sale` : ''}</b>`);
  return `<h4>Harbour</h4><div class="kv">${rows.join('')}</div>`;
}

// Offices: the desks the economy needs against the desks the town has, by sector, and what a desk rents for.
function officeHTML(t) {
  if (!t.deskNeed || t.deskNeed < 1) return '';
  const rows = [`<span>Desks</span><b>${fmt(t.desks || 0)} of ${fmt(t.deskNeed)} needed</b>`];
  if (t.deskQ < 0.98) rows.push(`<span>Short of space</span><b>clerks in corridors: trade ${Math.round((1 - (0.9 + 0.1 * t.deskQ)) * 100)}% slower</b>`);
  if (t.deskVac > 0.02) rows.push(`<span>Standing empty</span><b>${Math.round(t.deskVac * 100)}% of office space</b>`);
  if (t.polity.cur.kind >= 2 && t.deskRent) rows.push(`<span>Rent</span><b>${fmtMoney(t.deskRent)} a desk a year</b>`);
  for (const k of OFF_SEC_IDS) { const n = t.deskNeedBy && t.deskNeedBy[k]; if (n >= 1) rows.push(`<span style="color:${OFF_SECTORS[k].col}">${esc(OFF_SECTORS[k].name)}</span><b>${fmt((t.deskBy && t.deskBy[k]) || 0)} / ${fmt(n)}</b>`); }
  return `<h4>Offices</h4><div class="kv">${rows.join('')}</div>`;
}

// Cars and parking: who owns one, where they are left by day, and whether the town has the spaces.
function parkingHTML(t) {
  if (!t.cars) return '';
  const rows = [`<span>Cars</span><b>${fmt(t.cars * (t.scale || 1))}</b>`, `<span>Spaces in lots and garages</span><b>${fmt(t.parkHave || 0)} of ${fmt(t.parkNeed || 0)} needed</b>`];
  if (t.parkStreet) rows.push(`<span>Left on the street</span><b>${fmt(t.parkStreet)}</b>`);
  rows.push(`<span>At home</span><b>every home has a space for each person it can hold</b>`);
  return `<h4>Cars and parking</h4><div class="kv">${rows.join('')}</div>`;
}
