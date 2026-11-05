'use strict';
// Harbours. Every port building has berths (ships alongside at once), a class (the biggest hull its berths take), a handling
// rate (cargo one berth's dock gang moves a tick) and a purpose. Ships wait at anchor for a berth, lie alongside while dock
// workers unload and load them, then sail. A harbour that keeps ships waiting is enlarged, or another is built, as the realm prefers.

// Hull classes: 1 boats and canoes, 2 sailing merchantmen, 3 big ocean ships, 4 the giant bulk, tank and box hulls.
const shipCls = D => D.cls || (D.cls = (D.bulk || D.cap >= 600) ? 4 : D.cap >= 160 ? 3 : D.cap >= 30 ? 2 : 1);
const CLS_NAME = ['', 'small boats', 'sailing ships', 'big ocean ships', 'the giant hulls'];
// What a hull carries, which decides which quays handle it quickly. gen: mixed cargo in sacks, bales and barrels.
const CK_NAME = { gen: 'general cargo', fish: 'fish', grain: 'grain', timber: 'timber', ore: 'ore', coal: 'coal', oil: 'oil and gas', box: 'containers', car: 'cars and lorries', reefer: 'chilled food', pass: 'passengers', bulk: 'bulk cargo', navy: 'warships', yard: 'shipbuilding', fun: 'pleasure craft' };

// id | name | size | tech | class | berths | purposes | flags | what it looks like (for the art) | about
// flags: only (takes nothing but its purposes), navy, yard:n (can lay keels), min:n (people before it is worth it), happy:n, wreck (fewer wrecks), trade:x
const PORT_SRC = `
beachlanding|Beach landing|1|rafts|1|2|gen,fish|min:6|sand with boats hauled up on log rollers, a driftwood drying rack, a fire ring|Canoes run up on the sand and are carried above the tide.
fishjetty|Fishing jetty|1|fishing|1|2|fish|min:10|a narrow plank jetty on stakes into the water, nets hung to dry, a basket pile|A plank walk on stakes, and nets drying along it.
reedlanding|Reed-boat landing|1|weaving|1|2|gen,pass|min:12|bundled reed mats on the bank, two tied reed boats, a reed shelter|Reed boats tie up at bundled mats on the bank.
hithe|River hithe|1|sailing|1|3|gen|min:20|a timber landing stage along the bank, a small shed, bales and a hand winch|A timber landing stage where barges lie alongside.
stonemole|Stone mole harbour|2|harbours|2|3|gen|min:60|a curved breakwater of dressed stone enclosing a basin, a quay with bollards, a small warehouse|A stone arm against the sea, with a quiet basin behind it.
emporium|Emporium quay|2|currency|2|3|gen|min:90 trade:1.06|a paved quay with a colonnaded warehouse, amphorae stacked in rows, an awning|Merchants from everywhere unload into its warehouses.
saltquay|Salt quay|1|saltworks|2|2|gen,bulk|min:50|a quay with white salt heaps under a lean-to roof and barrels|Salt goes out by the boatload.
slipway|Keel slipway|1|keels|2|1|yard|yard:1 min:40|an inclined timber slip with a half-built hull in ribs, timber stacked beside|A slope of greased timbers where hulls are laid down.
ferryslip|Ferry slip|1|harbours|1|2|pass|min:80|a short ramp into the water, a ferryman's hut and a bell post|A ramp and a ferryman: people and carts across the water.
shipsheds|Ship sheds|2|wargalley|2|3|navy|navy only min:90|a row of long narrow roofed sheds running down into the water, columns between them|Long roofed sheds where the war galleys are drawn up dry.
grainquay|Grain quay|2|grainfleet|2|3|grain|min:150|a quay with a big granary warehouse, sacks on the quay, a weighing beam|The grain fleet unloads here, sack by sack, into the public granaries.
navalcircle|Round naval harbour|3|engineering|2|6|navy|navy only min:300|a circular inner basin ringed by ship sheds with a command tower on an island in the middle, an outer channel|A circular basin ringed by ship sheds, with the admiral's tower on an island in the middle.
beaconmole|Beacon mole|2|periplus|2|3|gen|wreck min:120|a long stone mole ending in a tall beacon tower with a fire on top, ships tied along it|A long mole with a fire tower at its end that ships steer by.
monsoonport|Monsoon trading port|2|monsoon|2|4|gen|min:120 trade:1.08|a palm-thatched quay with spice sacks, carved wooden warehouses, colourful awnings|Ships come in on one wind and leave on the other, laden with spice and cloth.
customsquay|Customs house quay|2|coinage|2|2|gen|min:140 trade:1.05|a stone customs house with a tiled roof and a weighing scale, crates being counted on the quay|Every bale is weighed and taxed before it leaves the quay.
timberpond|Timber pond|2|carpentry|2|2|timber|min:70|a fenced pond full of floating logs, a log chute, a sawpit|Logs float here until the ships take them.
kontor|Guild trading quay|2|commenda|2|4|gen|min:200 trade:1.06|a tall brick merchant house with a stepped gable and a hoist beam over the quay, barrels and bales|A merchant guild's own quay, warehouse and counting house.
craneharbour|Treadwheel crane quay|2|treadwheel|2|3|gen|min:160|a timber treadwheel crane house with a jib swung over the quay, barrels below|A great wooden crane, turned by men walking a wheel, lifts the heaviest loads.
staplequay|Staple quay|2|banking|2|3|gen|min:220 trade:1.05|a long arcaded hall on the quay with wine casks and wool bales stacked in front|Wine and wool must pass through here, and pay for the privilege.
herringport|Herring port|2|compass|2|4|fish|min:120|a quay lined with salting sheds and barrel stacks, gulls, small fishing boats|Herring are gutted, salted and barrelled on the quay.
junkharbour|Junk harbour|3|junks|2|6|gen|min:350 trade:1.06|a big basin with stone embankments, red-roofed warehouses with upturned eaves, junks moored|A great basin for the ocean-going junks.
whalingstation|Whaling station|2|whaling0|2|2|fish|min:100|a flensing slip, try-works with black smoke from rendering pots, barrels of oil|Whales are hauled up the slip and boiled down for oil.
drydock|Dry dock|2|drydocks|3|1|yard|yard:2 min:300|a stone-lined dock basin pumped dry with a hull propped inside on blocks, a gate at the seaward end|A stone basin that can be pumped dry to work on a hull from below.
wetdock|Wet dock|3|locks|3|6|gen|min:400|an enclosed rectangular dock basin behind lock gates, warehouses on every side|A walled basin behind lock gates: ships lie afloat whatever the tide.
canalbasin|Canal basin|2|canals|1|6|gen,coal|min:200|a rectangular basin full of narrow boats, a towpath, a wharf crane and warehouses|Narrow boats and barges swap loads with the coast.
royaldockyard|Royal dockyard|4|shipofline|3|6|navy,yard|navy yard:3 min:600|a huge naval yard: building slips with ships of the line on the stocks, ropewalk, mast house, storehouses|Slips, ropewalk, mast pond and storehouses: a navy built from the keel up.
companydocks|Company docks|3|navigation|3|6|gen|min:600 trade:1.1|high-walled docks with tall warehouses, a company flag, tall ships alongside|A trading company's walled docks, warehouses and all.
timberwharf|Timber wharf|2|forestry|3|3|timber|min:200|a wharf piled high with sawn planks and squared logs, a steam crane|Sawn timber stacked high, waiting for the timber ships.
packetpier|Packet pier|1|navigation|2|2|pass|min:300|a slim pier with a mail office and a signal mast with flags|The mail packets keep to a timetable from this pier.
coalstaithes|Coal staithes|2|railway|3|3|coal,ore|min:300|tall timber staithes on legs over the water, rail wagons on top tipping coal down chutes into a ship|Rail wagons tip their coal down chutes straight into the holds.
steamerpier|Steamer pier|2|steamship|3|3|pass,gen|min:400|a long iron pier on columns with a booking hall and a steamer funnel alongside|Passengers and mail board the steamers here.
coalingstation|Coaling station|2|steamship|3|3|gen,coal|min:300|a quay with black coal heaps, coal baskets and a steam crane, smoke|Steamers stop here to fill their bunkers.
elevatorpier|Grain elevator pier|2|grainelevator|3|3|grain|min:400|a tall grain elevator tower of wood and iron with spouts reaching over the ship|Grain pours from the elevator's spouts straight into the holds.
emigrantquay|Emigrant quay|2|railway|3|3|pass|min:500|a quay with a big waiting shed, crowds and trunks, a liner gangway|Whole families wait here with everything they own for a passage abroad.
coldstore|Cold-store wharf|2|refrigeration|3|3|reefer,fish|min:400|an insulated white cold store with an ammonia plant and chimney, crates of meat|Frozen meat and fruit go straight from the holds into the cold.
trawlerdock|Trawler dock|2|steamtrawl|2|5|fish|min:300|a fish dock with a covered auction market, ice house and steam trawlers|Steam trawlers land their catch under the market roof at dawn.
orejetty|Ore jetty|2|steel|3|2|ore,coal|min:400|a long trestle jetty with a conveyor gantry and red ore heaps|Ore rides a long trestle out to the ships.
paddlelanding|Paddle-steamer landing|1|paddle|2|2|pass,gen|min:150|a floating pontoon landing with a ticket kiosk and a gangway|River steamers call at the floating landing stage.
pleasurepier|Pleasure pier|2|portland|2|2|pass,fun|happy:3 min:500|an iron pier on stilts with a pavilion, kiosks and bunting|A promenade on stilts over the sea, with a band on Sundays.
oiljetty|Oil jetty|2|tankers|3|2|oil|only min:300|a long jetty with pipelines, loading arms and round oil tanks ashore|Pipelines and loading arms: tankers fill and empty here and nowhere else.
refineryterminal|Refinery terminal|3|refinery|4|3|oil|only min:600|a refinery with distillation columns, flare stack and a tanker berth with loading arms|Crude comes in by tanker and leaves as fuel.
ferryterminal|Ferry terminal|3|cars|3|4|pass,car|min:600|ferry linkspans with ramps, a terminal building and queues of cars|Cars and lorries drive straight on and off the ferries.
linerterminal|Ocean liner terminal|3|passports|3|3|pass|min:900|a grand terminal hall with a clock tower and covered gangways to a big liner|Grand halls and gangways for the ocean liners.
navalshipyard|Naval shipyard|4|dreadnought|4|6|navy,yard|navy yard:3 min:900|a steel naval yard with giant cranes over building ways, grey warships alongside, workshops|Giant cranes and building ways for battleships.
bulkterminal|Bulk terminal|3|lorries|4|3|bulk,ore,coal,grain|min:700|stockpiles of coal and ore, stacker-reclaimer gantries and conveyors out to the berths|Stacker-reclaimers and conveyors load a bulk carrier in a day.
fishingharbour|Fishing harbour|3|deeptrawl|3|8|fish|min:500|a big basin packed with trawlers, a fish market hall, ice plant and net sheds|A busy basin of trawlers, ice plants and a fish auction.
floatingdock|Floating dock|2|electric|3|1|yard|yard:2 min:500|a U-shaped steel floating dock with a ship raised inside, two cranes on its walls|A steel dock that sinks, swallows a ship, and rises with it.
roroterminal|Ro-ro terminal|3|roro|4|3|car,box|min:900|rows of parked new cars, a car carrier with its stern ramp down, a multi-storey car park|New cars roll on and off by the thousand.
gasterminal|Gas terminal|3|supertankers|4|2|oil|only min:900|white spherical gas tanks, a regasification plant, a gas carrier berth|Gas carriers unload into great white tanks.
cruiseterminal|Cruise terminal|3|masstourism|4|2|pass,fun|happy:2 min:900|a modern glass terminal with a huge white cruise ship berth, coaches waiting|A floating hotel calls in, and the town fills with visitors for a day.
offshorebase|Offshore supply base|2|offshore|3|4|gen,oil|min:600|a quay with pipe racks, supply vessels and a helipad|Supply boats for the rigs out at sea.
hoverport|Hoverport|2|hovercraft|1|3|pass|min:500|a concrete apron sloping into the sea, a terminal and a hovercraft on its skirt|Hovercraft ride straight up the slipway onto the apron.
marina|Marina|2|masstourism|1|10|fun,pass|happy:3 min:700|floating pontoons with dozens of small white yachts, a clubhouse|Pontoons full of yachts and the people who own them.
coastguard|Coast guard station|1|wireless|1|2|navy|navy wreck min:300|a white station with a radio mast, a lifeboat slipway and a red lifeboat|Lifeboats and radio: fewer ships lost off this coast.
autoterminal|Automated terminal|4|autocargo|4|6|box,gen|min:1500 trade:1.08|a huge container yard with automated stacking cranes, driverless carriers and ship-to-shore gantries|No dockers on the quay: robots stack and carry the boxes.
megaport|Deep-water megaport|4|internet|4|8|box,bulk,gen|min:2000 trade:1.1|a vast deep-water port: container stacks, gantry cranes, oil tanks and bulk piles on reclaimed land|A whole coast rebuilt as one port, with water deep enough for anything afloat.
transshiphub|Transshipment hub|4|gps|4|6|box|min:1600 trade:1.06|an island-like container quay with gantries on both sides, feeder ships and giant box ships|Giant ships drop their boxes here for smaller ships to carry onward.
greenport|Clean-fuel bunkering port|3|rotorsails|4|4|gen,box,oil|min:1200|a port with wind turbines, hydrogen tanks, rotor-sail ships alongside and shore power cables|Ships refuel with hydrogen and plug into the shore while they unload.
floatingharbour|Floating harbour|3|seasteads|4|6|gen,box,pass|min:1500|a floating platform harbour moored offshore with modular quays, cranes and a small town|A harbour that floats, anchored where the water is deepest.
`;
// The ports the game already had: their berths and purposes.
const PORT_OLD = {
  wharf: { cls: 1, berths: 2, ck: ['fish', 'gen'], look: '' }, dock: { cls: 2, berths: 3, ck: ['gen'] }, shipyard: { cls: 2, berths: 1, ck: ['yard'] },
  merchantport: { cls: 3, berths: 5, ck: ['gen', 'bulk'] }, navalbase: { cls: 3, berths: 6, ck: ['navy'], only: 1 }, containerport: { cls: 4, berths: 5, ck: ['box', 'gen'] },
};
const PORT_IDS = [];
(function definePorts() {
  const eraOf = tech => (TECH_IX[tech] === undefined ? -1 : TECHS[TECH_IX[tech]].era);
  for (const line of PORT_SRC.trim().split('\n')) {
    const [id, name, size, tech, cls, berths, ck, flags, look, about] = line.split('|');
    const era = eraOf(tech);
    if (era < 0) continue;  // an invention this world doesn't have
    const f = {}; for (const w of flags.split(' ')) { if (!w) continue; const [k, v] = w.split(':'); f[k] = v === undefined ? 1 : +v; }
    const s = +size, e = era;
    const cost = e <= 1 ? C(6 * s) : e <= 3 ? C(10 * s, 8 * s) : e <= 5 ? C(14 * s, 10 * s, 0, s) : e === 6 ? C(0, 10 * s, 10 * s, 0, 0, 5 * s) : e === 7 ? C(0, 6 * s, 14 * s, 0, 0, 12 * s) : C(0, 6 * s, 18 * s, 5 * s, 0, 20 * s);
    const D = { name, size: s, tech, cost, work: Math.round((60 + e * 50) * s * (s > 2 ? 1.3 : 1)), place: 'shore', port: +cls, cls: +cls, berths: +berths, ck: ck.split(','), era: e, look, about, portB: 1, min: f.min || 30, want: null };
    if (f.only) D.only = 1;
    if (f.navy) D.navy = 1;
    if (f.yard) D.yard = f.yard;
    if (f.happy) D.happy = f.happy;
    if (f.wreck) D.wreck = 0.7;
    if (f.trade) D.fx = { trade: f.trade };
    D.want = t => portWant(t, id);
    BLD[id] = D; PORT_IDS.push(id);
    if (D.fx || D.happy) BLD_FX.push(id);
  }
  for (const id in PORT_OLD) { const o = PORT_OLD[id], D = BLD[id]; if (!D) continue; Object.assign(D, o, { era: D.tech ? eraOf(D.tech) : 0, portB: 1 }); }
  // straight after the old dock in the build order, or towns never get round to them
  BUILD_ORDER.splice(BUILD_ORDER.indexOf('dock') + 1, 0, ...PORT_IDS);
})();
const PORT_ALL = Object.keys(BLD).filter(k => BLD[k].portB);
// Small boats are real things too: a boatwright builds them, a town buys them, they are kept in a boathouse or at a jetty,
// and a fisher takes one out from there and brings it back.
Object.assign(BLD, {
  boatyard: { name: 'Boatwright’s shed', size: 1, tech: 'rafts', cost: C(6), work: 60, place: 'shore', boatsY: 5, want: t => (t.sFish && t.sFish.length >= 3 && tn(t) >= 40) || (t.boatsSale || 0) > 0 ? 1 + Math.floor(tn(t) / 1500) : 0, about: 'Builds small boats from timber, for the town and for sale along the coast.' },
  boathouse: { name: 'Boathouse', size: 1, tech: 'rafts', cost: C(5), work: 50, place: 'shore', boatRoom: 10, want: t => (t.boats || 0) >= boatRoom(t) * 0.8 && tn(t) >= 30 ? (t.count.boathouse || 0) + 1 : 0, about: 'Keeps ten boats dry and safe. Fishers take them out from here.' },
});
BUILD_ORDER.splice(BUILD_ORDER.indexOf('dock') + 1, 0, 'boatyard', 'boathouse');
// How many boats a town has room to keep: boathouses, and a few at every quay meant for small craft.
function boatRoom(t) {
  let r = (t.count.boathouse || 0) * 10;
  for (const b of t.ports) { const D = BLD[b.type]; if ((D.cls || 1) <= 2 || D.ck.includes('fish') || D.ck.includes('fun')) r += D.ck.includes('fun') ? 30 : D.ck.includes('fish') ? 8 : 3; }
  return r;
}
// How fast one berth's gang moves cargo, by the age the port was built for: hands and baskets, then cranes, steam, and the container gantry.
const RATE_BY_ERA = [1.5, 1.8, 2.4, 3, 4, 5, 8, 14, 24, 36, 48, 60, 60, 60];
const portRate = D => RATE_BY_ERA[Math.max(0, Math.min(13, D.era || 0))];
// Same size, same main purpose, built for a later age: what a port can be rebuilt as without moving.
function portUpgrade(t, type) {
  const D = BLD[type];
  let best = null;
  for (const id of PORT_ALL) {
    const E = BLD[id];
    if (id === type || E.size !== D.size || E.ck[0] !== D.ck[0] || (E.era || 0) <= (D.era || 0) || !!E.navy !== !!D.navy) continue;
    if ((E.berths || 1) < (D.berths || 1) || (E.cls || 1) < (D.cls || D.port || 1)) continue;  // never a step down
    if (E.tech && !knows(t, E.tech)) continue;
    if (!best || (E.era || 0) > (BLD[best].era || 0)) best = id;
  }
  return best;
}

// ---- what a town wants built ----
// Does this town have work for a port of this purpose?
function portNeed(t, ck) {
  const n = tn(t), st = t.stock;
  switch (ck) {
    case 'gen': return (t.seaPartners && t.seaPartners.length) ? 1 : 0;
    case 'fish': return t.sFish && t.sFish.length >= 3 ? 1 : 0;
    case 'grain': return Math.abs(st[R.FOOD] - wantOf(t, R.FOOD)) > n * 2 && t.seaPartners && t.seaPartners.length ? 1 : 0;
    case 'timber': return st[R.WOOD] > wantOf(t, R.WOOD) * 1.6 && t.seaPartners && t.seaPartners.length ? 1 : 0;
    case 'ore': return (st[R.IRON] > wantOf(t, R.IRON) * 1.5 || st[R.COPPER] > wantOf(t, R.COPPER) * 1.5) ? 1 : 0;
    case 'coal': return st[R.COAL] > wantOf(t, R.COAL) * 1.5 || (t.count.steelworks || 0) > 0 ? 1 : 0;
    case 'oil': return st[R.OIL] > 20 || (t.count.oilwell || 0) > 0 || (t.count.refinery || 0) > 0 ? 1 : 0;
    case 'box': return n >= 900 ? 1 : 0;
    case 'car': return (t.count.carplant || 0) > 0 || n >= 1500 ? 1 : 0;
    case 'reefer': return st[R.FOOD] > wantOf(t, R.FOOD) * 2 ? 1 : 0;
    case 'pass': return n >= 500 && t.seaPartners && t.seaPartners.length >= 2 ? 1 : 0;
    case 'fun': return n >= 700 && (t.tourists || 0) + (t.happy || 0) > 0 ? 1 : 0;
    case 'bulk': return n >= 700 ? 1 : 0;
    case 'navy': return t.polity.towns >= 2 && t.warYear > W.tick / TPY - 120 ? 1 : 0;
    case 'yard': return (t.ships && t.ships.length >= 4) || t.count.merchantport ? 1 : 0;
  }
  return 0;
}
// The newest port this town could build for a purpose (its first purpose), or null.
function bestPortFor(t, ck, maxSize) {
  let best = null;
  for (const id of PORT_IDS) {
    const D = BLD[id];
    if (D.ck[0] !== ck || (D.tech && !knows(t, D.tech)) || tn(t) < D.min || (maxSize && D.size > maxSize)) continue;
    if (!best || D.era > BLD[best].era || (D.era === BLD[best].era && D.berths > BLD[best].berths)) best = id;
  }
  return best;
}
const coastal = t => !!(t.portLv || (t.sBoat && t.sBoat.length) || (t.near && t.near.water > 0));
const hasPortFor = (t, ck) => t.ports.some(b => BLD[b.type].ck.includes(ck)) || t.queue.some(b => BLD[b.type] && BLD[b.type].portB && BLD[b.type].ck.includes(ck));
// The want: one port per purpose, the newest the town can build. More come only when the harbour is too small (planPorts).
function portWant(t, id) {
  const D = BLD[id], have = t.count[id] || 0;
  if (!coastal(t)) return have;
  const ck = D.ck[0];
  if (hasPortFor(t, ck) || bestPortFor(t, ck) !== id || !portNeed(t, ck)) return have;
  return have + 1;
}

// ---- berths, moorings and the anchorage ----
// Built on first use and after any port is finished, rebuilt or lost (t.hbV).
function harbour(t) {
  const H = t.hb;
  if (H && H.v === (t.hbV || 0) && H.n === t.ports.length) return H;
  const old = H, w = W.w, used = new Set(), berths = [];
  for (const b of t.ports) {
    const D = BLD[b.type];
    if (!D || !D.portB) continue;
    const cls = D.cls || D.port || 1, gap = cls >= 4 ? 3 : cls >= 2 ? 2 : 1, cx = b.x + b.size / 2, cy = b.y + b.size / 2;
    const cand = [];
    for (let r = 1; r <= 2; r++) for (let dy = -r; dy < b.size + r; dy++) for (let dx = -r; dx < b.size + r; dx++) {
      if (dx > -r && dx < b.size + r - 1 && dy > -r && dy < b.size + r - 1) continue;  // the ring at distance r only
      const x = b.x + dx, y = b.y + dy;
      if (x < 1 || y < 1 || x >= w - 1 || y >= W.h - 1) continue;
      const j = y * w + x;
      if (!W.seaNet[j] || (cls >= 3 && !W.water[j])) continue;  // a big berth wants real sea or lake water, not a river bank
      cand.push({ j, r, d: Math.hypot(x + 0.5 - cx, y + 0.5 - cy) });
    }
    cand.sort((a, c) => a.r - c.r || a.d - c.d);
    let k = 0;
    for (const c of cand) {
      if (k >= D.berths) break;
      const x = c.j % w, y = (c.j / w) | 0;
      let clash = false;
      for (const o of berths) if (Math.abs(o.i % w - x) < gap && Math.abs(((o.i / w) | 0) - y) < gap) { clash = true; break; }
      if (clash || used.has(c.j)) continue;
      used.add(c.j);
      // which way the quay lies from the berth: the ship is drawn hard alongside it
      const qx = Math.sign(Math.round(cx - (x + 0.5))), qy = Math.sign(Math.round(cy - (y + 0.5)));
      berths.push({ b, i: c.j, cls, ck: D.ck, only: !!D.only, rate: portRate(D), qx, qy, ship: null, crane: (D.era || 0) >= 4 });
      k++;
    }
  }
  // moorings and the anchorage: open water a little way off, spaced so hulls don't overlap
  const moor = [], anchor = portOf(t);
  if (anchor >= 0) {
    const ax = anchor % w, ay = (anchor / w) | 0, net = W.seaNet[anchor];
    for (let r = 2; r <= 9 && moor.length < 28; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || (dx + dy) & 1) continue;
      const x = ax + dx, y = ay + dy;
      if (x < 1 || y < 1 || x >= w - 1 || y >= W.h - 1) continue;
      const j = y * w + x;
      if (W.seaNet[j] !== net || used.has(j) || W.ice[j] > 80) continue;
      let near = false;
      for (const m of moor) if (Math.abs(m % w - x) < 2 && Math.abs(((m / w) | 0) - y) < 2) { near = true; break; }
      if (!near) moor.push(j);
    }
  }
  const nb = { v: t.hbV || 0, n: t.ports.length, berths, moor, q: old ? old.q : [], next: old ? old.next : 0, top: berths.reduce((m, x) => Math.max(m, x.cls), 0) };
  // ships alongside a berth that is gone go back to the queue
  if (old) for (const x of old.berths) if (x.ship && !berths.some(y => y.i === x.i && y.b === x.b)) { const s = x.ship; s.berth = null; if (s.state === 2) { s.state = 3; nb.q.push(s); } }
  if (old) for (const x of old.berths) if (x.ship) { const y = berths.find(z => z.i === x.i && z.b === x.b); if (y) { y.ship = x.ship; x.ship.berth = y; } }
  t.hb = nb;
  return nb;
}
// Can a hull of this kind ever tie up here?
function canBerth(t, D) {
  const H = harbour(t), c = shipCls(D), ck = D.ck || 'gen';
  for (const x of H.berths) if (x.cls >= c && (!x.only || x.ck.includes(ck))) return true;
  return false;
}
// How much quicker or slower this berth handles this hull: the right equipment for the cargo, or the wrong one.
function berthMul(x, D) {
  const ck = D.ck || 'gen';
  if (x.ck.includes(ck)) return 1.5;
  if (ck === 'box' || ck === 'oil' || ck === 'car') return 0.35;  // boxes by hand, oil by bucket: possible, slowly
  if (ck === 'bulk' || ck === 'ore' || ck === 'coal' || ck === 'grain') return x.ck.includes('bulk') ? 1.2 : 0.6;
  return x.ck.includes('gen') ? 1 : 0.7;
}
function freeBerth(t, s) {
  const H = harbour(t), D = shipDef(s), c = shipCls(D), ck = D.ck || 'gen';
  let best = null, bs = -1;
  for (const x of H.berths) {
    if (x.ship || x.cls < c || (x.only && !x.ck.includes(ck))) continue;
    const sc = berthMul(x, D) * x.rate - (x.cls - c) * 0.3;  // the right quay, and not a giant berth for a small boat if a smaller one is free
    if (sc > bs) { bs = sc; best = x; }
  }
  return best;
}
// A free mooring for a ship that is waiting or laid up: the first one nobody else is on.
function moorTile(t, s) {
  const H = harbour(t);
  if (!H.moor.length) return portOf(t);
  const taken = new Set();
  for (const o of W.ships) if (o !== s && o.state !== 1 && (o.state !== 2)) taken.add(o.at);
  for (const j of H.moor) if (!taken.has(j)) return j;
  return H.moor[(s.id * 7) % H.moor.length];
}
// The entrance: only so many ships can come in or go out a year, more with more quays.
function entranceGap(t) { let s = 0; for (const b of t.ports) s += b.size; return Math.max(2, Math.round(16 / (1 + s))); }
function portStat(t) { return t.portSt || (t.portSt = { waitT: 0, inN: 0, turn: 0, by: {}, lastWait: 0, lastIn: 0, lastTurn: 0, lastBy: {}, actY: -99, handled: 0, lastHandled: 0 }); }

// ---- a ship in a harbour ----
// phase: 'load' at home before a voyage, 'unload' at the far end (then 'reload' for the way back), 'home' unloading back home.
function enterHarbour(t, s, phase) {
  s.hph = phase; s.hTown = t;
  const H = harbour(t);
  if (!H.berths.length || !canBerth(t, shipDef(s))) { lighter(t, s); return; }
  s.state = 3;
  const m = moorTile(t, s);
  if (m >= 0) moveShipTo(s, m);
  if (!H.q.includes(s)) H.q.push(s);
  tryBerth(t);
}
// No berth here can take this hull: lighters carry the cargo out to it at anchor, slowly.
function lighter(t, s) {
  s.state = 3; s.berth = null;
  const m = moorTile(t, s); if (m >= 0) moveShipTo(s, m);
  const D = shipDef(s), amt = (s.hph === 'load' ? D.hold * 0.6 : s.load) * D.cap / D.hold * 3;
  s.hDone = W.tick + Math.max(20, amt / (0.3 * (t.gang || 1)));
  s.lighter = true;
}
// Hands free berths to waiting ships, first come first served, as fast as the entrance lets them through.
function tryBerth(t) {
  const H = harbour(t);
  if (!H.q.length || W.tick < H.next) return;
  for (let k = 0; k < H.q.length; k++) {
    const s = H.q[k];
    if (s.sunk || s.state !== 3 || s.hTown !== t) { H.q.splice(k--, 1); continue; }
    const x = freeBerth(t, s);
    if (!x) continue;
    H.q.splice(k, 1);
    x.ship = s; s.berth = x; s.state = 2; s.lighter = false;
    moveShipTo(s, x.i);
    s.hStart = W.tick; s.hDone = W.tick + handleTime(t, s, x);
    portStat(t).inN++;
    H.next = W.tick + entranceGap(t);
    return;  // one through the entrance at a time
  }
}
function handleTime(t, s, x) {
  // the work goes by the hull's size: a full hold takes about three times its size class in gang-ticks
  const D = shipDef(s), held = s.hph === 'load' ? Math.max(s.dest ? exportTo(t, s.dest, D) : 0, D.hold * 0.15) : Math.max(s.load, D.hold * 0.1), amt = held * D.cap / D.hold * 3;
  return Math.round(clamp(amt / (x.rate * berthMul(x, D) * (t.gang || 1)), 10, 400) + 6);  // and the warping in and making fast
}
// Roughly how much one town could send another on this hull right now.
function exportTo(t, to, D) {
  let v = 0;
  const L = D.hauls || null;
  for (let r = 0; r < R.N; r++) {
    if (L && !L.includes(r)) continue;
    const spare = t.stock[r] - wantOf(t, r) * 0.9, lack = wantOf(to, r) - to.stock[r];
    if (spare > 1 && lack > 1) v += Math.min(spare, lack);
  }
  return Math.min(v, holdOf(D, t));
}
// Slides the ship to a new tile; the renderer eases it across over a few ticks (warping in, casting off).
function moveShipTo(s, j) {
  if (s.at === j) return;
  s.mvA = s.at; s.mvT = W.tick;
  s.at = s.nx = j;
}
function releaseBerth(s) {
  const x = s.berth;
  if (x && x.ship === s) x.ship = null;
  s.berth = null;
  if (s.hTown) { portStat(s.hTown).handled++; const H = s.hTown.hb; if (H) H.next = Math.max(H.next, W.tick + 2); tryBerth(s.hTown); }
}
// Called every few ticks for a ship alongside (state 2) or at anchor (state 3).
function harbourTick(s) {
  const t = s.hTown;
  if (!t || !t.alive) { releaseBerth(s); s.state = 0; s.hph = null; return; }
  if (s.state === 3 && !s.lighter) {
    const st = portStat(t); st.waitT += 4; const ck = shipDef(s).ck || 'gen'; st.by[ck] = (st.by[ck] || 0) + 4;
    tryBerth(t);
    return;
  }
  if (W.tick < s.hDone) return;
  handlingDone(s);
}

// ---- what it costs to move things, by land and by sea ----
// One load carried one tile overland: porters, then pack animals, carts, rail and lorries.
function landCostPU(t) {
  let c = 1;
  if (knows(t, 'packanimals')) c = 0.6;
  if (knows(t, 'wheel')) c = 0.4;
  if (t.mod.paved) c *= 0.8;
  if (t.mod.rail) c = Math.min(c, 0.1);
  if (t.mod.car) c = Math.min(c, 0.13);
  return c;
}
// One load sent by sea: the crew's time and the fuel spread over the cargo, dues and pilots at each end,
// handling on the quays, and getting the goods to and from the quay by land.
function seaCostPU(t, D, len, load) {
  const run = (D.men * 0.012 + (D.burn !== undefined ? D.cap * 0.0006 : 0)) / Math.max(hullSpd(D), 0.2);
  const fixed = 6 + shipCls(D) * 10;
  const handle = 2.4 / Math.sqrt(portRate({ era: maxEraOf(t) }));
  return (fixed + run * len) / Math.max(load, 1) + handle + landCostPU(t) * 1.5;
}
const maxEraOf = t => { let e = 0; for (const b of t.ports) e = Math.max(e, BLD[b.type].era || 0); return e; };
// Would this cargo go more cheaply overland? Only towns with a road between them, and the land route winds a bit.
function landBeats(h, o, D, load) {
  if (W.landId[o.i] !== W.landId[h.i] || !h.partners.includes(o)) return false;
  const d = Math.hypot(o.x - h.x, o.y - h.y), sea = d * 1.25 + 4;
  return landCostPU(h) * d * 1.3 < seaCostPU(h, D, sea, load);
}

// ---- yearly: is the harbour big enough? ----
function planPorts(t) {
  if (!t.ports.length) return;
  const st = portStat(t), H = harbour(t), yr = Math.floor(year());
  st.lastWait = st.waitT / TPY; st.lastIn = st.inN; st.lastTurn = st.turn; st.lastBy = st.by; st.lastHandled = st.handled;
  st.waitT = 0; st.inN = 0; st.turn = 0; st.by = {}; st.handled = 0;
  // dock gangs: the dockers the town has against the berths they must work
  const dk = typeof OCC_IX !== 'undefined' && OCC_IX.docker !== undefined && t.occN ? t.occN[OCC_IX.docker] || 0 : -1;
  t.gang = knows(t, 'containers') ? 1.15 : dk < 0 ? 0.8 : clamp(0.35 + dk / Math.max(1, H.berths.length * 3), 0.35, 1.25);  // cranes and boxes need few hands
  if (st.lastWait < 0.6 && st.lastTurn < 3) return;
  if (yr - st.actY < 10 || t.queue.some(b => b.upT || (BLD[b.type] && BLD[b.type].portB))) return;
  // the purpose most ships were kept waiting for
  let ck = 'gen', most = 0;
  for (const k in st.lastBy) if (st.lastBy[k] > most) { most = st.lastBy[k]; ck = k; }
  if (st.lastTurn >= 3 && st.lastWait < 0.6) ck = st.turnCk || ck;
  const g = GOV[t.polity.gov];
  // centralising realms pour money into the one great harbour; trading republics and federations spread trade along the coast
  const dear = W.land && landRel(t, portOf(t)) > 0.6;
  const order = g.cons >= 1.1 || dear ? ['up', 'new', 'out'] : (g.trade >= 1.2 || g.vote) ? ['out', 'new', 'up'] : ['new', 'up', 'out'];
  for (const how of order) if (portAct(t, how, ck)) { st.actY = yr; return; }
}
function portAct(t, how, ck) {
  const ckLine = ck === 'ore' || ck === 'coal' ? 'bulk' : ck;
  if (how === 'up') {
    // rebuild the busiest old quay as a newer one of the same size, in place: it keeps working while the masons are in
    let best = null, nx = null;
    for (const b of t.ports) {
      if (b.upT || !b.done) continue;
      const D = BLD[b.type];
      if (!D.ck.includes(ck) && !D.ck.includes(ckLine) && !(ck === 'gen' && D.ck.includes('bulk'))) continue;
      const u = portUpgrade(t, b.type);
      if (u && (!best || BLD[u].berths - BLD[b.type].berths > BLD[nx].berths - BLD[best.type].berths)) { best = b; nx = u; }
    }
    if (!best) return false;
    const E = BLD[nx];
    if (!canPay(t.stock, E.cost) || !canFund(t, E.work)) return false;
    pay(t.stock, E.cost); fund(t, E.work);
    best.upT = nx; best.prog = 0; best.need = Math.round(E.work * 0.7);
    t.queue.push(best);
    if (tn(t) > 200) chronT('misc', `Ships lie waiting off ${t.name} for a berth. The ${BLD[best.type].name.toLowerCase()} is to be rebuilt as a ${E.name.toLowerCase()}.`, t);
    return true;
  }
  const build = (o, quiet) => {
    let id = bestPortFor(o, ck) || bestPortFor(o, ckLine) || bestPortFor(o, 'gen');
    if (!id) return false;
    const D = BLD[id];
    if (!canPay(o.stock, D.cost) || !canFund(o, D.work)) return false;
    const i = findSpot(o, D.size, 'shore', 0);
    if (i < 0) return false;
    pay(o.stock, D.cost); fund(o, D.work);
    addBuilding(o, id, i, null);
    o.count['q_' + id] = (o.count['q_' + id] || 0) + 1;
    if (!quiet && tn(t) > 200) chronT('misc', o === t ? `${t.name} can't berth all the ships that come. A ${D.name.toLowerCase()} is laid out along the shore.` : `With ${t.name}'s harbour full, the ${polityTitle(t.polity)} builds a ${D.name.toLowerCase()} down the coast at ${o.name}.`, o);
    return true;
  };
  if (how === 'new') return build(t);
  // an outport: another town of the realm, on the same water, close enough to share the trade
  const q = portOf(t);
  if (q < 0) return false;
  let best = null, bs = 0;
  for (const o of W.towns) {
    if (o === t || !o.alive || o.polity !== t.polity || o.nomad || tn(o) < 60 || !coastal(o)) continue;
    const p = portOf(o), d = Math.hypot(o.x - t.x, o.y - t.y);
    if (d > 45 || (p >= 0 && W.seaNet[p] !== W.seaNet[q])) continue;
    const sc = tn(o) / (d + 10) * (o.ports.length ? 0.6 : 1);
    if (sc > bs) { bs = sc; best = o; }
  }
  return !!best && build(best);
}
// An old quay rebuilt as a newer one: same plot, new berths, new name.
function portRebuilt(b) {
  const t = b.town, old = b.type, nx = b.upT;
  const k = t.queue.indexOf(b); if (k >= 0) t.queue.splice(k, 1);
  b.upT = null; b.prog = 0;
  if (t.count[old]) t.count[old]--;
  t.count[nx] = (t.count[nx] || 0) + 1;
  b.type = nx; b.need = BLD[nx].work;
  t.portI = -1; t.hbV = (t.hbV || 0) + 1;
  recomputeMods(t);
  if (typeof dirtyB === 'function') dirtyB(b);
  if (tn(t) > 150) chronT('misc', `The new ${BLD[nx].name.toLowerCase()} at ${t.name} opens where the old ${BLD[old].name.toLowerCase()} stood.`, t);
}

// ---- small boats: built, sold, carried to their new owners, kept, taken out and brought back ----
const fishersOf = t => { let n = 0; for (const p of t.members) if (p.job === J.FISH) n++; return n; };
// Where the town keeps its boats: a boathouse, else a jetty or quay for small craft.
// Every fishing trip asks, so the answer is kept for a while (in a side table, so it never goes into a save).
const _boatStoreAt = new WeakMap();
function boatStore(t) {
  const c = _boatStoreAt.get(t);
  if (c && W.tick - c.at < 120 && W.tick >= c.at && (!c.b || W.bAt.get(c.b.i) === c.b)) return c.b;
  const b = findBoatStore(t);
  _boatStoreAt.set(t, { at: W.tick, b });
  return b;
}
function findBoatStore(t) {
  let best = null;
  for (const b of t.blds) {
    if (!b.done) continue;
    if (b.type === 'boathouse') return b;
    const D = BLD[b.type];
    if (D && D.portB && ((D.cls || 1) <= 2 || D.ck.includes('fish'))) best = best || b;
  }
  return best;
}
// A fisher takes a boat from the store, if there is one free.
function takeBoat(p) {
  const t = p.town;
  if ((t.boats || 0) - (t.boatsOut || 0) < 1) return false;
  t.boatsOut = (t.boatsOut || 0) + 1; p.boat = 1;
  return true;
}
function returnBoat(p) {
  if (!p.boat) return;
  p.boat = 0;
  const t = p.town;
  if (t && t.boatsOut > 0) t.boatsOut--;
}
// Yearly: boats wear out, boatwrights build, and a town short of boats buys them from one that has some to sell.
function boatYear(t) {
  t.boats = t.boats || 0; t.boatsSale = t.boatsSale || 0;  // saves from before boats were counted, and heals a NaN
  if (t.nomad) return;
  let out = 0;
  // a fisher called away mid-trip (to war, say) left the boat at the jetty: it isn't out any more
  for (const p of t.members) if (p.boat) { if (!p.task || !p.sea || p.army) p.boat = 0; else out++; }
  t.boatsOut = out;
  let lost = 0;
  for (let k = 0; k < t.boats; k++) if (rnd() < 0.05) lost++;
  t.boats = Math.max(0, t.boats - lost);
  // boats are kept in boathouses and at the jetties, and the rest pulled up on the beach above the tide
  const fishers = fishersOf(t), room = boatRoom(t) + (t.portLv ? Math.ceil(fishers * 0.45) : 0), want = Math.min(room, Math.ceil(fishers * 0.6) + (t.count.marina || 0) * 12);
  // a fishing town already had its boats before anyone counted them: the first year there is a boat store, they are in it
  if (!t.boatsInit && room > 0) { t.boatsInit = 1; t.boats = Math.max(t.boats, want); }
  // with no boatwright in town, fishers carve and patch their own: a slow trickle, enough to keep a small fleet going
  if (!t.count.boatyard && t.boats < want && t.stock[R.WOOD] >= 3) { const own = Math.min(want - t.boats, Math.max(1, Math.round(fishers / 5)), Math.floor(t.stock[R.WOOD] / 3)); t.boats += own; t.stock[R.WOOD] -= own * 3; }
  // boatwrights: a few hulls a year each, from timber (and sailcloth once boats carry sails)
  const yards = (t.count.boatyard || 0) * BLD.boatyard.boatsY + (t.count.slipway || 0) * 2 + (t.count.shipyard || 0) * 2;
  const sails = knows(t, 'sailing');
  let made = 0;
  for (let k = 0; k < yards; k++) {
    if (t.stock[R.WOOD] < 4 || (sails && t.stock[R.CLOTH] < 0.5)) break;
    if (t.boats + made >= want && (t.boatsSale || 0) >= 20) break;
    t.stock[R.WOOD] -= 4; if (sails) t.stock[R.CLOTH] -= 0.5;
    made++;
  }
  const keep = Math.min(made, Math.max(0, want - t.boats));
  t.boats += keep; t.boatsSale = Math.min(30, (t.boatsSale || 0) + made - keep);
  // still short: buy from the nearest boatwright with boats to spare, and have them brought over
  const need = want - t.boats - (t.boatsOrd || 0);
  if (need < 2) return;
  let best = null, bd = 1e9;
  for (const o of W.towns) {
    if (o === t || !o.alive || !(o.boatsSale >= 2) || atWar(t.polity, o.polity) || relOf(t.polity, o.polity) < -30) continue;
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    if (d > 70 || d >= bd) continue;
    if (W.landId[o.i] !== W.landId[t.i]) { const a = portOf(o), b = portOf(t); if (a < 0 || b < 0 || W.seaNet[a] !== W.seaNet[b]) continue; }
    best = o; bd = d;
  }
  if (!best) return;
  const n = Math.min(need, best.boatsSale, 12);
  // the price: a boat is worth its timber and a few days' work; paid in coin where there is coin, else in goods
  if (t.polity.cur.kind >= 2 && t.cash > 0) {
    const price = n * 5 * (best.wage || 1);
    if (t.cash < price) return;
    t.cash -= price; best.cash += price;
  } else {
    const r = t.stock[R.GOODS] >= n * 1.5 ? R.GOODS : t.stock[R.FOOD] >= n * 12 ? R.FOOD : -1;
    if (r < 0) return;
    const a = r === R.GOODS ? n * 1.5 : n * 12;
    t.stock[r] -= a; best.stock[r] += a;
  }
  best.boatsSale -= n;
  sendBoats(best, t, n);
}
// Bought boats go by road on a cart, or rowed along the coast in a string, and are counted only when they arrive.
function sendBoats(a, b, n) {
  const R0 = W.boatRuns || (W.boatRuns = []);
  nodeBudget = Math.max(nodeBudget, 1);
  let path = null, sea = false;
  if (W.landId[a.i] === W.landId[b.i]) path = findPath(a.i, b.i, 0, a.trans || 0);
  if (!path || path === PATH_BUSY) {
    const p = portOf(a), q = portOf(b);
    if (p >= 0 && q >= 0) { path = findShipPath(p, q, 2 | 4); sea = true; }
  }
  if (!path || path === PATH_BUSY) { b.boats += n; return; }  // no way to show the trip: they simply arrive
  b.boatsOrd = (b.boatsOrd || 0) + n;
  R0.push({ a, b, n, path, k: 0, sea, pol: a.polity.color });
  if (!b.boatsFirst && tn(b) > 200) { b.boatsFirst = 1; chronT('misc', `${b.name} buys ${n} boats from the boatwrights of ${a.name}.`, b); }
}
function boatRunsTick() {
  const R0 = W.boatRuns;
  if (!R0 || !R0.length) return;
  for (let k = R0.length - 1; k >= 0; k--) {
    const r = R0[k];
    r.k += r.sea ? 0.35 : 0.22;
    if (r.k >= r.path.length - 1 || !r.b.alive) {
      if (r.b.alive) { r.b.boats += r.n; r.b.boatsOrd = Math.max(0, (r.b.boatsOrd || 0) - r.n); }
      R0.splice(k, 1);
    }
  }
}

// ---- room on the waterfront ----
// The shore near the middle is taken: look all along the town's coast, and if every plot on the water is built on,
// the town buys a row of waterfront houses, pays the families, and pulls them down for the new quay.
function touchesSea(i, size) {
  const w = W.w;
  for (let dy = -1; dy <= size; dy++) for (let dx = -1; dx <= size; dx++) {
    if (dx >= 0 && dx < size && dy >= 0 && dy < size) continue;
    const j = i + dx + dy * w;
    if (j > 0 && j < W.seaNet.length && W.seaNet[j] && W.water[j]) return true;
  }
  return false;
}
function housesIn(t, i, size) {
  const w = W.w, take = [];
  if (slopeAt(i) > 0.12) return null;
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) {
    const j = i + dx + dy * w;
    if (W.water[j] || W.river[j] || W.canal[j] || W.rail[j] || W.road[j] >= 3 || W.occ[j] === 3) return null;
    if (W.occ[j] === 1) {
      const b = W.bAt.get(j);
      if (!b || b.town !== t || b.type !== 'house' || b.size !== 1 || !b.done || b.up >= 0) return null;
      if (!take.includes(b)) take.push(b);
    }
  }
  return take;
}
function findShoreWide(t, size) {
  t.spotMiss = t.spotMiss || {};
  if (t.spotMiss[size + 20] > W.tick) return -1;
  const w = W.w, n = tn(t), R = Math.round(Math.min(40, 6 + Math.sqrt(n) * 0.6));
  let best = -1, bs = -1e9, buy = -1, bb = -1e9, buyList = null;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const d2 = dx * dx + dy * dy;
    if (d2 > R * R) continue;
    const x = t.x + dx, y = t.y + dy;
    if (x < 2 || y < 2 || x >= w - size - 2 || y >= W.h - size - 4) continue;
    const i = y * w + x;
    if (W.water[i] || !touchesSea(i, size)) continue;
    const d = Math.sqrt(d2), own = W.townById[W.owner[i]];
    if (own && own !== t) continue;
    if (buildable(i, size, true, true) && hasAccess(i, size)) { const s = -d + rnd(); if (s > bs) { bs = s; best = i; } continue; }
    if (best >= 0 || n < 100) continue;
    const take = housesIn(t, i, size);
    if (take && take.length && take.length <= size * size && hasAccess(i, size) && -d - take.length * 2 > bb) { bb = -d - take.length * 2; buy = i; buyList = take; }
  }
  if (best >= 0) return best;
  if (buy >= 0) {
    let paid = 0;
    for (const b of buyList) {
      const price = W.land && t.polity.cur.kind >= 2 ? plotPrice(t, b.i, 1) + HOUSES[b.tier].work * 0.3 * (t.polity.cur.level || 1) : 0;
      if (price && t.cash < price) return -1;
      if (price) { t.cash -= price; paid += price; const own = t.members.filter(p => p.home === b); for (const p of own) p.cash += price / Math.max(1, own.length); }
      removeBuilding(b);
    }
    if (tn(t) > 200 && (t.shoreBuyY == null || year() - t.shoreBuyY > 30)) { t.shoreBuyY = Math.floor(year()); chronT('misc', `${t.name} buys up ${buyList.length} houses on the waterfront and pulls them down to make room for a new quay.`, t); }
    return buy;
  }
  t.spotMiss[size + 20] = W.tick + (TPY >> 1);
  return -1;
}
