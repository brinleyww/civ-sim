'use strict';
// Offices and the mid-rise city. White-collar work needs desks: a town works out how many desks its economy needs
// (a sliver in the Middle Ages, a third of all work in the information age), and builds offices of the right sector,
// size and age to hold them: counting houses, bank chambers, ministries, newspaper offices, office towers, business
// parks. Short of desks, its trade and research suffer; with desks to spare, rents fall and space stands empty.
// Mid-rise blocks fill the gap between houses and towers: a crowded town that couldn't fill a skyscraper builds them.

// ---- sectors ----
// tech: what a town must know before it has this kind of office work at all. share: of the desks it needs.
const OFF_SECTORS = {
  gen: { name: 'Business', tech: 'writing', share: 1, col: '#c8b48a' },
  trade: { name: 'Trading houses and shipping', tech: 'currency', share: 0.7, col: '#2f9f8c' },
  gov: { name: 'Government', tech: 'law', share: 0.9, col: '#8a6fb0' },
  law: { name: 'Law', tech: 'law', share: 0.35, col: '#6a5a8a' },
  fin: { name: 'Banking and insurance', tech: 'banking', share: 0.8, col: '#d8a53a' },
  media: { name: 'Press and media', tech: 'printing', share: 0.35, col: '#c8452f' },
  tech: { name: 'Technology', tech: 'computers', share: 1.2, col: '#3a7fb5' },
};
const OFF_SEC_IDS = Object.keys(OFF_SECTORS);
// Of all who work, the share at a desk, by the age a town lives in.
const DESK_SHARE = [0, 0, 0.004, 0.008, 0.015, 0.025, 0.05, 0.11, 0.19, 0.27, 0.32, 0.34, 0.35, 0.35];

// ---- 100 offices ----
// id | name | size | tech | desks | sector | floors | look: material, roof, windows | about
// materials: b brick, s stone, t timber, w stucco, a sandstone, r terracotta, e granite, c concrete, g glass, m mirror glass, k black steel, n green walls, l pale cladding, h mass timber
// roofs: p pitched, m mansard, d dome, f flat, c spire, s setbacks, h helipad, g garden, o clock tower, x sawtooth
// windows: s small, a arched, t tall, r ribbon, c curtain wall, b sun fins, g grid
const OFFICE_SRC = `
scribehouse|Scribes' house|1|writing|8|gen|1|tps|Letters, contracts and accounts written for anyone who can pay.
tallyhall|Tally hall|1|writing|10|gov|1|sps|The ruler's tallies and tribute recorded on sticks and tablets.
templetreasury|Temple treasury office|1|calendar|10|fin|2|sfs|Priests keep the granary accounts and lend at interest.
recordhouse|Record house|1|writing|12|gov|2|sfs|Deeds, censuses and land grants kept on shelves to the ceiling.
merchantcounter|Merchant's counting room|1|currency|10|trade|2|tps|Ledgers, scales and a strongbox above a warehouse.
moneychanger|Money-changers' row|1|coinage|12|fin|1|wps|Benches where coins of every land are weighed and swapped.
lawcourtoffice|Magistrates' chambers|1|law|14|law|2|sms|Advocates and their clerks crowd the corridor outside the court.
tributeoffice|Tribute office|2|kingship|30|gov|2|sfa|Where the provinces' dues are counted and the officials paid.
factorhouse|Factor's house|1|maritimeloans|16|trade|3|bpa|Agents arrange cargoes and sea loans for distant owners.
guildoffice|Guild office|1|guilds|14|gen|3|tpa|The guild's masters meet, fix prices and keep the apprentices' indentures.
chancery|Chancery|2|philosophy|40|gov|3|smt|The ruler's letters drafted, sealed and copied in triplicate.
notaryhouse|Notaries' house|1|commenda|12|law|3|bps|Every partnership and dowry signed and witnessed here.
countinghouse|Counting house|1|accounts|20|fin|3|bmt|Double-entry ledgers in a long, quiet room.
bankchambers|Bank chambers|2|banking|50|fin|3|sdt|Bills of exchange drawn on houses in every great city.
tradinghouse|Trading house|2|commenda|45|trade|4|bmt|A merchant dynasty's offices, warehouses and strongroom.
printoffice|Printing office|1|printing|18|media|3|bmt|Pamphlets, almanacs and the first news-sheets.
pressoffice|Gazette office|1|newspapers|22|media|4|bpt|A weekly paper written, set and printed on the premises.
customsoffice|Customs house|2|navigation|50|gov|3|sdt|Every cargo landed is declared, weighed and taxed.
shippingoffice|Shipping office|1|navigation|24|trade|4|bmt|Charters, cargoes and crews arranged over the counter.
insurancehouse|Insurance house|2|insurance|60|fin|4|sot|Underwriters sign their names below each ship's risk.
exchangehall|Exchange hall|2|stockmarket|60|fin|3|sdt|Brokers shout prices under a glass roof.
compagnieHQ|Chartered company house|3|stockmarket|140|trade|4|smt|A company that rules colonies is run from these rooms.
postoffice|General post office|2|postoffice|70|gov|3|sot|Mail sorted day and night for the whole realm.
ministry|Ministry|3|civilservice|180|gov|4|sdt|A grand office of state, with civil servants on every floor.
townhalloffices|Town hall offices|2|civilservice|70|gov|4|bot|The council's departments: rates, roads, drains and licences.
lawchambers|Barristers' chambers|1|statistics|24|law|4|bmt|Wigs, briefs and a clerk who knows everyone's fee.
telegraphoffice|Telegraph office|1|telegraph|30|media|3|bpt|Wires to every city: prices and news in minutes.
railwayoffice|Railway company offices|2|railway|90|trade|5|bmt|Timetables, freight rates and ten thousand employees managed from here.
mercantilechambers|Mercantile chambers|2|steam|100|gen|5|amt|Offices to let, by the room or the floor, for any trade.
castironblock|Cast-iron office block|1|steel|60|gen|5|kft|Iron columns and huge windows: light for clerks at their desks.
insurancebldg|Insurance building|2|steel|160|fin|6|rst|Red terracotta and marble halls, built to look solid as the bank of England.
newspaperbldg|Newspaper building|2|typewriter|130|media|6|bot|Presses roar in the basement while reporters type upstairs.
telephonebldg|Telephone exchange offices|1|telephone|50|tech|5|bft|Rows of operators connecting calls by hand.
savingsbank|Savings bank|1|steel|40|fin|3|sdt|Small savers' pennies, lent on to builders and shopkeepers.
lawcourtsannex|Law courts annex|2|statistics|110|law|5|sot|Offices for the judges, the registry and the public prosecutor.
chicagoblock|Steel-frame office block|2|steel|220|gen|10|rfg|A steel cage and a lift make ten floors of offices pay.
tradersexchange|Corn and coal exchange|2|telegraph|80|trade|3|sdt|Traders bid for whole harvests and coalfields on the telegraph.
buildingsociety|Building society|1|statistics|40|fin|4|bmt|Mortgages for the workers' terraced houses.
stockexchangebldg|Stock exchange|3|telegraph|260|fin|6|sdt|A columned temple of finance with a trading floor.
civicoffices|Civic offices|3|sanitation|240|gov|6|smt|The growing city's health, housing and police departments.
artdecotower|Art deco office tower|1|skyscrapers|400|gen|24|ast|Setbacks, chrome and a spire lit at night.
skyscraperHQ|Company skyscraper|1|skyscrapers|700|fin|40|gst|A bank builds the tallest tower in town, and puts its name on it.
radiohouse|Broadcasting house|2|radio|160|media|7|lfr|Studios and newsrooms: the nation listens in.
newsprinthouse|Press baron's tower|1|radio|300|media|20|ast|A newspaper empire's tower with its name in lights.
officeslab|Modernist office slab|2|massprod|420|gen|12|cfr|A long concrete slab of identical floors and ribbon windows.
glasstower|Glass curtain-wall tower|1|curtainwall|900|gen|36|gfc|A sheer box of glass and steel on a plaza.
federalbldg|Federal office building|3|massprod|700|gov|12|cfg|Ten thousand civil servants and their filing cabinets.
televisioncentre|Television centre|3|television|380|media|6|cfr|Studios, newsrooms and a ring of offices round them.
corporateHQ|Corporate headquarters|2|massprod|600|gen|18|kfc|Black glass, a lobby of marble, and a boardroom on the top floor.
insurancetower|Insurance tower|1|airconditioning|700|fin|32|gfc|Sealed glass and air conditioning: offices that ignore the weather.
brutalistoffice|Brutalist office block|2|airconditioning|480|gov|10|cfb|Raw concrete fins over every window.
computercentre|Computing centre|2|computers|200|tech|4|lfr|Mainframes downstairs, programmers upstairs.
dataprocessing|Data-processing bureau|1|computers|160|tech|6|cfr|Punch cards and payroll for other companies.
cityplanoffice|City planning office|2|computers|180|gov|6|cfr|Zoning maps, permits and plans for the next motorway.
lawfirmtower|Law firm tower|1|curtainwall|500|law|28|mfc|Partners on the top floors, associates working through the night below.
tradingfloor|Trading floor building|2|transistors|500|fin|10|mfc|Screens on every desk, and a trading floor the size of a football pitch.
backoffice|Back-office block|2|transistors|500|gen|8|lfr|Payroll, claims and accounts for head offices elsewhere.
callcentre|Call centre|2|telephone|400|gen|4|lfr|Hundreds of headsets in a hall on the edge of town.
businesspark|Business park|3|creditcards|900|gen|5|gfg|Low glass offices round a lake and a car park.
sciencepark|Science park|3|transistors|600|tech|4|gfg|Labs and start-ups near the university.
softwarehouse|Software house|1|transistors|180|tech|6|gfc|Programmers in a converted warehouse with a coffee machine.
mediacity|Media city|3|television|900|media|10|gfc|Broadcasters, studios and production companies on a waterfront.
bankHQtower|Bank headquarters tower|1|creditcards|1500|fin|50|mhc|Fifty floors of glass with a helipad for the directors.
supertall|Supertall office tower|2|curtainwall|3000|gen|80|gcc|One of the tallest buildings on earth, and nearly all of it offices.
financecentre|Financial centre|3|creditcards|2400|fin|30|mcc|A cluster of towers with an underground mall between them.
govcampus|Government campus|3|computers|1400|gov|8|cfg|Ministries moved out of the old palaces into one modern campus.
taxoffice|Tax office|2|computers|400|gov|8|cfr|Every return in the realm, checked and filed.
coworking|Co-working hub|1|internet|120|tech|5|hfg|Desks by the day for freelancers and start-ups.
techcampusHQ|Tech headquarters campus|3|internet|2200|tech|5|gfg|A ring of glass with a park inside and free lunches for the engineers.
dotcomloft|Converted loft offices|1|internet|140|tech|5|bfg|A warehouse turned into offices with exposed brick and bean bags.
mediahub|Digital media hub|2|socialmedia|600|media|8|gfc|Content made around the clock for screens everywhere.
ecommerceHQ|Online retailer headquarters|2|ecommerce|900|tech|12|gfc|The offices behind a shop that sells everything to everyone.
fintechtower|Fintech tower|1|ecommerce|800|fin|30|gbc|Payments, trading algorithms and apps, all under one roof.
greenoffice|Green office building|2|evs|500|gen|12|ngg|Planted terraces, solar glass and no air conditioning needed.
timbertower|Mass-timber office tower|1|evs|450|gen|18|hfg|Laminated timber floors that lock away carbon instead of emitting it.
smartoffice|Smart office building|2|thinkingmachines|700|gen|14|gbc|Sensors set the lights, the heating and who sits where.
aiLab|Machine-learning offices|2|thinkingmachines|500|tech|10|kfc|Researchers and their machines, and a cooling plant on the roof.
quantumhq|Quantum computing headquarters|2|quantum|400|tech|8|lfc|The cold rooms are underground; the offices are above them.
datatower|Data and analytics tower|1|thinkingmachines|900|tech|32|mbc|Analysts and engineers stacked thirty floors high.
arcologyoffices|Arcology office levels|3|arcology|3000|gen|40|ngs|Whole districts of offices inside one enormous building.
skygardenoffice|Sky-garden tower|1|evs|1100|gen|40|ngc|Every few floors a garden in the sky for the workers to take lunch.
agiHQ|AI company headquarters|3|agi|2400|tech|20|mgc|The minds that design the machines that do the rest of the work.
remotehub|Neighbourhood work hub|1|mobilephones|60|gen|3|lfg|Desks near home, for people who no longer travel to the centre.
regionalHQ|Regional headquarters|2|massprod|500|gen|10|cfg|A company's branch office for the whole province.
shippingHQ|Shipping line headquarters|2|massprod|400|trade|12|gfc|A container line's empire, run from screens.
commodityhouse|Commodity trading house|1|telegraph|80|trade|5|smt|Grain, cotton and coffee bought before it's grown.
consularoffice|Consulate|1|civilservice|30|gov|3|wdt|Visas, trade missions and a flag over the door.
embassy|Embassy|2|civilservice|60|gov|3|sdt|A realm's envoys and their staff, behind tall railings.
patentoffice|Patent office|1|science|30|law|4|smt|Every invention's drawings, filed and numbered.
centralbank|Central bank|3|stockmarket|300|fin|4|edt|Gold in the vaults and the interest rate in its hands.
auditoffice|Audit office|1|accounts|30|fin|3|smt|Inspectors go through every account the state keeps.
planningbureau|Planning bureau|2|massprod|300|gov|8|cfr|Five-year plans for every factory in the land.
unionhq|Trade union headquarters|2|massprod|200|gen|6|bfr|Organisers, lawyers and the strike fund.
adagency|Advertising agency|1|radio|120|media|8|kfg|Slogans and campaigns for everything that is sold.
publishinghouse|Publishing house|2|printing|60|media|4|bmt|Editors, typesetters and a backlist of a thousand titles.
lawsociety|Law society hall|1|statistics|40|law|4|smt|The profession's library, examinations and discipline.
assurancehall|Mutual assurance hall|2|insurance|120|fin|5|amt|Policies for a working man's funeral, paid a penny a week.
lloydscoffee|Underwriters' coffee house|1|maritimeloans|20|fin|2|bpa|Ship insurance sold over coffee by men in a back room.
colonialoffice|Colonial office|2|navigation|90|gov|4|sdt|The overseas possessions governed by memo.
cooperativeHQ|Co-operative headquarters|2|steam|120|trade|5|bmt|Owned by its members, running shops across the realm.
dockoffices|Dock company offices|2|navigation|90|trade|4|bmt|The harbour board, its pilots, berths and dues.
`;
const OFFICE_IDS = [];
(function defineOffices() {
  for (const line of OFFICE_SRC.trim().split('\n')) {
    const [id, name, size, tech, desks, sec, floors, look, about] = line.split('|');
    if (TECH_IX[tech] === undefined) continue;
    const s = +size, e = TECHS[TECH_IX[tech]].era, d = +desks;
    const cost = e <= 3 ? C(6 * s, 6 * s) : e <= 5 ? C(8 * s, 10 * s, 4 * s, s) : e === 6 ? C(4 * s, 8 * s, 14 * s, 2 * s, 0, 2 * s) : C(0, 6 * s, 10 * s + d * 0.01, 4 * s, 0, 6 * s + d * 0.012);
    const D = { name, size: s, tech, cost, work: Math.round((60 + e * 30) * s + d * 0.5), desks: d, sec, floors: +floors, look, era: e, office: 1, about, want: null };
    if (sec === 'fin') D.fx = { trade: 1.01 + Math.min(0.03, d / 50000) };
    else if (sec === 'tech') D.fx = { research: 1.01 + Math.min(0.04, d / 40000) };
    else if (sec === 'gov') D.order = Math.max(1, Math.round(Math.sqrt(d) / 10));
    D.want = t => officeWant(t, id);
    BLD[id] = D; OFFICE_IDS.push(id);
    if (D.fx || D.order) BLD_FX.push(id);
    LAND_PREF[id] = 1;  // offices go where land is dear: the middle of town
  }
  BUILD_ORDER.splice(BUILD_ORDER.indexOf('market') + 1, 0, ...OFFICE_IDS);
})();

// ---- the yearly office market ----
function officeYear(t) {
  if (t.nomad) return;
  const sc = t.scale || 1, era = maxEra(t);
  let workers = 0; for (let j = J.FORAGE; j < J.N; j++) workers += t.jobs[j] * sc;
  // the desks the town's economy needs: more where it trades, more under governments that count everything
  const g = GOV[t.polity.gov];
  const need = workers * DESK_SHARE[Math.min(13, era)] * (0.8 + Math.min(t.mod.trade, 2) * 0.2) * (0.85 + (g.res || 1) * 0.15);
  const by = t.deskBy || (t.deskBy = {}), needBy = t.deskNeedBy || (t.deskNeedBy = {});
  let w = 0;
  for (const k of OFF_SEC_IDS) { const S = OFF_SECTORS[k]; by[k] = 0; needBy[k] = knows(t, S.tech) ? S.share : 0; w += needBy[k]; }
  for (const k of OFF_SEC_IDS) needBy[k] = w ? need * needBy[k] / w : 0;
  let have = 0;
  for (const b of t.blds) { if (!b.done) continue; const D = BLD[b.type]; if (D && D.office) { by[D.sec] += D.desks; have += D.desks; } }
  t.desks = have; t.deskNeed = need;
  // short of desks: clerks work in back rooms and corridors and everything is slower; too many: empty floors and falling rents
  // (a few clerks work from home or the back of a shop: only a real office economy needs office buildings)
  const q = need > 30 ? clamp((have + 30) / need, 0.4, 1) : 1;
  if (Math.abs(q - (t.deskQ || 1)) > 0.02) { t.deskQ = q; recomputeMods(t); }
  t.deskVac = have > 0 ? clamp(1 - need / have, 0, 1) : 0;
  // rent: dear land in the middle costs more, an empty market less; offices pay it to the town's owners and treasury
  const land = W.land ? landRel(t, t.i) : 0.5;
  t.deskRent = (t.wage || 1) * (0.4 + land * 1.6) * (1 - t.deskVac * 0.7);
  if (t.polity.cur.kind >= 2) t.cash += Math.min(have, need) * t.deskRent * 0.05;
  // what to build: for the sector furthest short, an office of a sensible size, newest styles first but not always the same
  t.offPick = [];
  const queued = {};
  for (const b of t.queue) { const D = BLD[b.type]; if (D && D.office) queued[D.sec] = (queued[D.sec] || 0) + D.desks; }
  const gaps = OFF_SEC_IDS.map(k => [k, needBy[k] - by[k] - (queued[k] || 0)]).filter(x => x[1] > 6).sort((a, b) => b[1] - a[1]);
  for (const [k, gap] of gaps.slice(0, 2)) {
    const opts = [];
    for (const id of OFFICE_IDS) {
      const D = BLD[id];
      if (D.sec !== k || !knows(t, D.tech) || D.desks > gap * 2.5 + 60) continue;  // a little ahead of demand: offices are built to let
      if (D.size >= 3 && tn(t) < 800) continue;
      opts.push(id);
    }
    if (!opts.length) continue;
    // the latest fashion, mostly: weigh by era, then by how well it fits the gap
    opts.sort((a, b) => BLD[b].era - BLD[a].era || BLD[b].desks - BLD[a].desks);
    const top = BLD[opts[0]].era, pool = opts.filter(id => BLD[id].era >= top - 1);
    t.offPick.push(pool[(t.id * 7 + Math.floor(year() / 5) + t.offPick.length * 3) % pool.length]);
  }
}
function officeWant(t, id) {
  const have = t.count[id] || 0;
  return t.offPick && t.offPick.includes(id) ? have + 1 : have;
}

// ---- 100 mid-rise styles ----
// name | tech | storeys | look: wall colour, trim colour, roof (f flat, m mansard, p pitched, c cornice, g garden, s stepped),
// windows (s sash, a arched, b balconies, r ribbon, g glass, y bay windows, l loggias), ground floor (s shops, c colonnade, l lobby, p plain)
const MIDRISE_SRC = `
Renaissance palazzo|science|4|#c9a87a,#e8dcc0|c|a|c
Merchants' row|science|4|#b5714a,#e6d6b0|p|s|s
Georgian terrace block|science|4|#a5533f,#efe7d3|p|s|p
Regency crescent|science|4|#e8e0cc,#ffffff|c|s|p
Baroque town block|science|5|#d8c08a,#f2e6c8|m|a|c
Tall gabled canal house|science|5|#7a3a2c,#efe7d3|p|s|p
Timber-frame rookery|science|4|#c9ae7e,#5e4527|p|s|s
Courtyard block|science|4|#d9c9a5,#a58a64|p|s|c
Arcaded square block|science|4|#e0cfa8,#b89a64|c|a|c
Shophouse row|science|3|#e8c8a0,#4a7f5a|p|y|s
Haussmann block|sanitation|6|#e6dcc2,#c8bb98|m|b|s
Victorian mansion block|sanitation|6|#a5533f,#e6d6b0|p|y|p
Edwardian mansion flats|sanitation|6|#b5714a,#efe7d3|c|y|l
Red-brick model dwellings|sanitation|5|#94503a,#d8c8a8|p|s|p
Philanthropic estate|sanitation|5|#8a5a3a,#efe7d3|p|s|p
Gründerzeit block|sanitation|5|#d8c8a8,#a8987a|c|s|s
Viennese courtyard block|sanitation|6|#e8dcb8,#b8a888|c|a|s
Tenement terrace|sanitation|4|#7a4a3a,#c9ae7e|p|s|s
Brownstone row|sanitation|4|#6b4a3a,#c9ae7e|c|y|p
Cast-iron loft|steel|5|#b8b0a0,#55595f|c|g|s
Barcelona block|sanitation|6|#e8d0a8,#7a8a5a|c|b|s
Art nouveau apartments|electric|6|#e8e0c8,#6a8a5a|m|b|s
Mansard corner block|sanitation|6|#d8ccb0,#55595f|m|b|s
Iron-balcony block|sanitation|5|#e6d6b0,#2a2a2e|c|b|s
Workers' cottage flats|sanitation|3|#a5533f,#e6d6b0|p|s|p
Garden city flats|electric|3|#e8dcc8,#7a5a3a|p|s|p
Mansion flats with turrets|electric|6|#a5533f,#efe7d3|m|y|l
Lombard-style block|sanitation|5|#c9805e,#efe7d3|p|a|c
Moorish revival block|electric|5|#e8d8b0,#4a7fa5|c|a|c
Colonial verandah block|steel|3|#efe7d3,#4a7f5a|p|l|c
Art deco apartments|electric|7|#efe7d3,#d8a53a|s|r|l
Streamline moderne flats|electric|5|#ffffff,#3a7fb5|f|r|l
Amsterdam School block|electric|5|#8a4a3a,#e6d6b0|s|s|p
Expressionist brick block|electric|6|#7a3a2c,#c9ae7e|s|s|p
Bauhaus housing block|electric|5|#ffffff,#2a2a2e|f|r|p
Siedlung row|electric|4|#efefef,#c8452f|f|r|p
Municipal estate|electric|5|#b5714a,#efe7d3|p|b|p
Red Vienna superblock|electric|6|#d8a888,#efe7d3|f|b|c
Gallery-access block|massprod|5|#d8d4c8,#55595f|f|b|p
Mid-century slab|massprod|6|#e8e4d8,#3f6a84|f|r|l
Garden apartments|massprod|3|#c9a87a,#efe7d3|p|b|p
Stalinist mid-rise|massprod|6|#d8c8a8,#a8987a|c|s|s
Prefab panel block|massprod|5|#c5ccd3,#8c939a|f|g|p
Khrushchyovka|massprod|5|#d8d4c8,#a8a49a|f|g|p
Brutalist maisonettes|airconditioning|7|#a8a49a,#70757c|f|b|p
Deck-access estate|massprod|6|#c5c1b5,#55595f|f|b|p
Courtyard housing co-op|massprod|4|#d8b890,#efe7d3|f|l|p
Split-level terraces|massprod|4|#b5714a,#efe7d3|s|b|p
Concrete shophouse|massprod|4|#e8e4d8,#c8452f|f|b|s
Tropical modern block|massprod|5|#efefef,#4fa35e|f|l|c
Sixties maisonette block|massprod|5|#d8d4c8,#c8452f|f|b|p
Corner flats over shops|massprod|5|#c9805e,#efe7d3|f|r|s
Mediterranean balcony block|massprod|6|#efe7d3,#3a7fb5|f|b|s
Brick infill block|massprod|5|#a5533f,#e8e4d8|f|s|s
Pastel walk-up|massprod|4|#e8c8c8,#efefef|f|s|p
Postmodern apartments|computers|6|#e8c8a8,#c8452f|s|y|l
Neo-Georgian infill|computers|4|#a5533f,#efe7d3|p|s|p
Mews conversion block|computers|3|#b5714a,#2a2a2e|p|s|p
Warehouse loft conversion|computers|5|#8a4a3a,#2a2a2e|f|g|s
Housing association block|computers|5|#c9805e,#efefef|p|b|p
Stepped terrace housing|computers|6|#e8e4d8,#4fa35e|s|b|p
Pueblo-style block|computers|4|#d8a878,#8a5a3a|s|s|p
Atrium apartments|transistors|7|#d8e0e6,#3f6a84|f|g|l
Riverside apartments|transistors|7|#efefef,#3f6a84|f|b|l
Courtyard eco-block|transistors|5|#c9a87a,#4fa35e|g|b|p
New urbanist mansion block|transistors|4|#e8dcc8,#6a5a4a|p|y|s
Podium apartments|transistors|7|#c5ccd3,#d8a53a|f|b|s
Metal-clad flats|transistors|6|#8c939a,#d8a53a|f|r|p
Terracotta-tile block|transistors|6|#c9805e,#efe7d3|f|g|s
Zinc-roofed lofts|transistors|5|#70757c,#c9ae7e|m|g|p
Glass-balcony block|internet|7|#efefef,#7fb6d8|f|b|l
Timber-clad flats|internet|6|#b8946a,#2a2a2e|f|l|p
Brick-and-glass corner block|internet|7|#8a4a3a,#7fb6d8|f|g|s
Sawtooth-roof lofts|internet|5|#d8d4c8,#55595f|s|g|p
Micro-apartments|internet|7|#efefef,#c8452f|f|g|l
Co-living block|internet|6|#e8c8a0,#3f6a84|f|b|l
Student residence|internet|6|#a5533f,#efefef|f|g|l
Courtyard perimeter block|internet|7|#d8c8a8,#55595f|f|b|s
Passive-house block|evs|6|#efefef,#4fa35e|f|g|p
Mass-timber apartments|evs|7|#c9a87a,#4a3620|f|l|s
Green-wall apartments|evs|7|#5f9a48,#efefef|g|b|s
Solar-roof block|evs|6|#d8e0e6,#2d4a6a|s|g|p
Rooftop-farm block|evs|6|#c9805e,#79b45a|g|b|s
Modular stack apartments|evs|7|#efefef,#d8a53a|f|g|p
Terraced hillside flats|evs|6|#e8dcc8,#4fa35e|s|b|p
Canal-side lofts|evs|6|#8a4a3a,#3f6a84|f|g|s
Retrofitted mill flats|evs|5|#94503a,#2a2a2e|p|g|p
Cooperative baugruppe|evs|6|#e8e4d8,#c8452f|f|l|p
Bioclimatic block|thinkingmachines|7|#efefef,#4fa35e|f|b|l
Smart-glass block|thinkingmachines|7|#7fb6d8,#efefef|f|g|l
3D-printed apartments|thinkingmachines|6|#d8c8a8,#a8987a|s|s|p
Kinetic-facade block|thinkingmachines|7|#c5ccd3,#d8a53a|f|r|l
Carbon-negative block|thinkingmachines|7|#a8c4a0,#efefef|g|l|p
Floating-garden apartments|arcology|8|#79b45a,#efefef|g|b|s
Mycelium-brick flats|arcology|6|#d8c8a8,#8a6a4a|s|s|p
Self-shading block|arcology|8|#efefef,#3f6a84|s|b|l
Hanging-garden block|arcology|8|#5f9a48,#e8e4d8|g|l|s
Coral-concrete block|arcology|7|#e8d8c8,#7fb6d8|s|a|p
Solarpunk courtyard|arcology|8|#d8e0c8,#d8a53a|g|b|c
Light-well apartments|arcology|8|#efefef,#7fe0e8|f|g|l
`;
const MIDRISE = [];
for (const line of MIDRISE_SRC.trim().split('\n')) {
  const [name, tech, st, cols, roof, win, ground] = line.split('|');
  if (TECH_IX[tech] === undefined) continue;
  const [wall, trim] = cols.split(',');
  MIDRISE.push({ name, tech, era: TECHS[TECH_IX[tech]].era, st: +st, wall, trim, roof, win, ground });
}
// Which style a new mid-rise block is built in: the fashion of the town's age (or the one before), with each town
// keeping a look of its own so a street isn't all one style.
function midStyle(t) {
  const era = maxEra(t), pool = [];
  for (let k = 0; k < MIDRISE.length; k++) { const M = MIDRISE[k]; if (M.era <= era && M.era >= era - 1 && knows(t, M.tech)) pool.push(k); }
  if (!pool.length) for (let k = 0; k < MIDRISE.length; k++) if (MIDRISE[k].era <= era) pool.push(k);
  if (!pool.length) return 0;
  return rnd() < 0.6 ? pool[(t.id * 13) % pool.length] : pool[rint(pool.length)];
}
// Picking a house tier: a tower only where there are people to fill it, and even in a big city most streets stay mid-rise.
function densityTier(t, top, short) {
  const M = HOUSE_IX.midrise;
  if (M === undefined || top <= M || !knows(t, HOUSES[M].tech) || !canPay(t.stock, HOUSES[M].cost)) return top;
  if (short < HOUSES[top].cap * 0.6) return M;
  if (rnd() < 0.45) return M;
  return top;
}
// The middle of town is full: whatever wants dear central land (offices, banks, flats) buys out a few old houses there,
// pays the families what the plot and the house are worth, and pulls them down.
function buyPlot(t, size) {
  const yr = Math.floor(year());
  if ((t.buyPlotY === yr && t.buyPlotN >= 2) || t.buyMiss > W.tick) return -1;
  const top = bestHouse(t), w = W.w, R0 = Math.round(3 + Math.sqrt(tn(t)) * 0.35);
  let best = -1, bs = -1e9, list = null;
  for (let k = 0; k < 90; k++) {
    const a = rnd() * 6.283, d = Math.sqrt(rnd()) * R0;
    const x = t.x + Math.round(Math.cos(a) * d), y = t.y + Math.round(Math.sin(a) * d);
    if (x < 2 || y < 2 || x >= w - size - 2 || y >= W.h - size - 4) continue;
    const i = y * w + x, take = housesIn(t, i, size);
    if (!take || !take.length || !hasAccess(i, size)) continue;
    let old = 0; for (const b of take) old += b.tier < top ? 1 : 0;
    if (old < take.length) continue;  // only houses older than the best the town can build
    const s = -d - take.length * 1.5 + rnd();
    if (s > bs) { bs = s; best = i; list = take; }
  }
  if (best < 0) { t.buyMiss = W.tick + 30; return -1; }  // nothing old enough to buy in the middle: not worth looking again this month
  const money = W.land && t.polity.cur.kind >= 2;
  let cost = 0;
  for (const b of list) cost += money ? plotPrice(t, b.i, 1) + HOUSES[b.tier].work * 0.3 * (t.polity.cur.level || 1) : 0;
  if (money && t.cash < cost) return -1;
  for (const b of list) {
    if (money) { const own = t.members.filter(p => p.home === b), pr = plotPrice(t, b.i, 1) + HOUSES[b.tier].work * 0.3 * (t.polity.cur.level || 1); t.cash -= pr; for (const p of own) p.cash += pr / Math.max(1, own.length); }
    removeBuilding(b);
  }
  if (t.buyPlotY !== yr) { t.buyPlotY = yr; t.buyPlotN = 0; }
  t.buyPlotN++; t.devN = (t.devN || 0) + list.length; t.devY = yr;
  return best;
}
