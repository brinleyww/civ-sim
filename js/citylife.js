'use strict';
// City life: where people are when they aren't out in the fields. Workers keep one workplace and go back to it,
// spend their shifts inside it and their evenings at home; children, the old and those without work are mostly at home,
// out to a square, a market, a temple or a park for a while, never standing about in an empty field.
// Once there are cars, people who can afford one own it, and it has to be parked: at home (a home has a space for
// everyone it can hold), at work if the workplace has a car park, or in a lot or garage.

// ---- free time ----
const OUTING_BLDS = new Set(['plaza', 'market', 'temple', 'shrine', 'bazaar', 'citypark', 'botanic', 'library', 'bathhouse', 'amphitheatre', 'stadium', 'cathedral',
  'mall', 'supermarket', 'forum', 'museum', 'menagerie', 'themepark', 'showground', 'coachinn', 'caravanserai', 'monastery', 'hanginggardens', 'templecomplex',
  'esports', 'resort', 'almshouse', 'soupkitchen', 'greatlibrary', 'hippodrome', 'pleasurepier', 'marina', 'cruiseterminal', 'fishmarket', 'well', 'healer', 'infirmary']);
// The public places a town's people go to, rebuilt once a year.
function outingsOf(t) {
  const y = Math.floor(W.tick / TPY);
  if (t._outY === y && t._outs) return t._outs;
  const L = [];
  for (const b of t.blds) if (b.done && !b.ruin && OUTING_BLDS.has(b.type)) L.push(b);
  t._outs = L; t._outY = y;
  return L;
}
// A public place within an easy walk of where someone lives (the old don't go far).
function outingSpot(p) {
  const t = p.town, L = outingsOf(t);
  if (!L.length) return null;
  const c = p.home ? p.home : null, cx = c ? c.x : t.x, cy = c ? c.y : t.y, far = p.job === J.ELDER ? 4 : p.job === J.CHILD ? 5 : 7;  // walking is slow: the square round the corner, not across town
  let best = null, bs = -1e9;
  for (let k = 0; k < 5; k++) {
    const b = L[rint(L.length)], d = Math.abs(b.x - cx) + Math.abs(b.y - cy);
    if (d > far) continue;
    const s = -d + rnd() * 6;
    if (s > bs) { bs = s; best = b; }
  }
  return best;
}
// A street near home to walk along: a road tile, never a field or open ground.
function streetNear(p) {
  const c = p.home ? p.home.i : p.town.i, w = W.w;
  for (let q = 0; q < 8; q++) {
    const v = c + (rint(9) - 4) + (rint(9) - 4) * w;
    if (v > w && v < W.occ.length - w && W.road[v] && !W.water[v] && W.occ[v] !== 1 && W.occ[v] !== 2 && W.occ[v] !== 3) return v;
  }
  return -1;
}
// Free time, in place of standing about: home, an outing, or a walk down the street.
function freeTimeStep(p) {
  const t = p.town, home = p.home && !p.home.ruin ? p.home : null;
  if (p.step === 0) {
    const old = p.job === J.ELDER, kid = p.job === J.CHILD;
    const stay = home ? (old ? 0.7 : kid ? 0.6 : 0.55) : 0;
    let to = -1, next = 10;
    if (rnd() < stay) to = home.i;
    else {
      const b = outingSpot(p);
      if (b) { to = b.i; next = 11; p.obj = b; }
      else if (home && rnd() < 0.7) to = home.i;
      else { const s = streetNear(p); if (s >= 0) { to = s; next = 13; } }
    }
    if (to < 0) {
      // nowhere to be and no home: they shelter at the town's hearth or square
      to = t.i; next = 11;
    }
    p.task = T_WANDER;
    if (next === 13) { p.step = 13; stroll(p, to); return; }
    walk(p, to, next, 0);
    return;
  }
  if (p.step === 10) { workFor(p, (p.job === J.ELDER ? 90 : 60) + rint(80), 12, true); return; }  // at home, indoors
  if (p.step === 11) { workFor(p, 25 + rint(35), 12, true); return; }  // inside the market, temple, park or square
  if (p.step === 12) { p.hidden = false; p.obj = null; endTask(p, rint(4)); return; }
  // the end of a walk down the street: a short pause, then home or out again
  endTask(p, 6 + rint(12));
}

// ---- a workplace of one's own ----
// A worker goes back to the same workshop, office or post day after day while it still exists.
function workSite(p, list) {
  const b = p.workB;
  if (b && !b.ruin && b.done && b.town === p.town && list.includes(b)) return b;
  // a new job: most people take one near where they live
  const h = p.home || null, hx = h ? h.x : p.town.x, hy = h ? h.y : p.town.y;
  let n = null, bd = 1e9;
  for (let k = 0; k < 4; k++) { const c = list[rint(list.length)], d = Math.abs(c.x - hx) + Math.abs(c.y - hy); if (d < bd) { bd = d; n = c; } }
  p.workB = n;
  return n;
}
// The town's office buildings, for those whose trade is done at a desk.
function officesOf(t) {
  const y = Math.floor(W.tick / TPY);
  if (t._offY === y && t._offs) return t._offs;
  const L = [];
  for (const b of t.blds) if (b.done && !b.ruin && BLD[b.type] && BLD[b.type].office) L.push(b);
  t._offs = L; t._offY = y;
  return L;
}
const deskWorker = p => p.occ >= 0 && OCCS[p.occ] && OCCS[p.occ].desk;
// Indoor work that ends with going home: a craftsman, clerk, priest or shopkeeper heads home after most shifts,
// a farmer or fisher only now and then (the season won't wait).
const OUTDOOR_J = new Set([J.FARM, J.FORAGE, J.HUNT, J.FISH, J.HERD, J.GARDEN, J.WOOD, J.STONE, J.CLAY, J.MINE]);
const shiftsBeforeHome = p => OUTDOOR_J.has(p.job) ? 6 : 3;

// ---- cars and parking ----
// Of grown-ups, the share that owns a car, by the age a town lives in; the robot-taxi age needs fewer.
const CAR_SHARE = [0, 0, 0, 0, 0, 0, 0, 0.18, 0.42, 0.55, 0.38, 0.3, 0.25, 0.2];
// id | name | size | tech | spaces | look: kind (lot, multi, under, robot, pnr, valet, ev, bike, truck, roof, mall, station) and levels | land: -1 cheap edge, 0 anywhere, 1 dear centre | about
const PARK_SRC = `
gravellot|Gravel car park|1|cars|24|lot:0:gravel|-1|A fenced patch of gravel and a sign.
dirtlot|Field car park|2|cars|70|lot:0:grass|-1|A meadow where cars park on match days and market days.
attendedlot|Attended car park|1|cars|26|lot:0:asphalt|0|A man in a hut takes the money and points you to a space.
streetlot|Corner lot|1|massprod|28|lot:0:asphalt|0|A bombsite or a demolished shop, tarred over and lined.
supermarketlot|Supermarket car park|2|supermarkets|110|lot:0:asphalt|-1|Trolleys, painted bays and a long walk to the door.
retailparklot|Retail park car park|3|supermarkets|300|lot:0:asphalt|-1|Acres of tarmac between the big sheds.
staffcarpark|Staff car park|1|massprod|30|lot:0:asphalt|0|Spaces kept for the people who work here.
lorrypark|Lorry park|2|lorries|30|truck:0:asphalt|-1|Lorries and their drivers rest overnight here.
coachpark|Coach park|2|motorbus|20|truck:0:coach|-1|Tour coaches wait in rows while their passengers see the sights.
parkandride|Park and ride|3|motorbus|320|pnr:0:asphalt|-1|Leave the car at the edge of town and take the bus in.
railparkride|Station car park|2|electricrail|120|pnr:0:rail|-1|Commuters' cars from first train to last.
airportlot|Long-stay car park|3|airlines|380|lot:0:asphalt|-1|Shuttle buses to the terminal every ten minutes.
deco2|Art deco garage|1|cars|40|multi:2:deco|1|A streamlined garage with a lift for cars and a petrol pump at the door.
rampgarage|Ramp garage|1|cars|60|multi:3:brick|1|Brick walls and a spiral ramp to the roof.
brickmulti|Brick multi-storey|2|massprod|220|multi:4:brick|1|Five floors of cars behind brick screens.
concretemulti|Concrete multi-storey|2|massprod|260|multi:5:concrete|1|Bare concrete decks and a stairwell that smells of it.
brutalistgarage|Brutalist car park|2|airconditioning|300|multi:6:brutal|1|Concrete fins and ramps, loved by nobody and photographed by everyone.
splitlevel|Split-level garage|2|massprod|200|multi:4:split|1|Half-floors staggered up a slope.
helixgarage|Helix garage|2|highways|240|multi:5:helix|1|A continuous spiral deck: you park on the slope.
mallgarage|Shopping centre garage|3|supermarkets|600|mall:4:concrete|0|Floor after floor of shoppers' cars, colour-coded so you can find yours.
hospitalgarage|Hospital car park|2|massprod|220|multi:4:concrete|0|Visitors, patients and staff, all circling for a space.
stadiumgarage|Stadium car park|3|massprod|500|multi:3:concrete|-1|Empty six days a week and gridlocked on the seventh.
officegarage|Office podium garage|1|skyscrapers|90|multi:4:glass|1|Three floors of parking under a tower's lobby.
underground1|Underground car park|1|massprod|80|under:0:plaza|1|A ramp down under a square; the square stays a square.
undergroundpark|Park with car park beneath|2|highways|260|under:0:park|1|Trees and lawns on top, three floors of cars underneath.
deepgarage|Deep underground garage|2|computers|420|under:0:plaza|1|Seven floors down, cooled and lit day and night.
mechstacker|Car stacker|1|computers|36|robot:3:steel|1|Hydraulic lifts stack cars three high in a garage built for one.
robotgarage|Automated robotic garage|1|robotics|140|robot:8:steel|1|Drive into a bay, walk away: a robot shelves your car.
robottower|Robotic parking tower|1|robotics|220|robot:12:glass|1|A glass silo where cars are lifted and stored by machine.
cartower|Car vending tower|1|ecommerce|60|robot:10:glass|1|A glass tower of new cars, delivered by lift.
valetgarage|Valet garage|1|creditcards|70|valet:3:glass|1|Hand over the keys at the door; they park it somewhere.
hotelgarage|Hotel garage|1|masstourism|60|valet:3:deco|1|Bellboys park the guests' cars below the ballroom.
evgarage|EV charging garage|2|evs|200|ev:4:glass|0|A charger at every bay and solar panels on the roof.
evhub|Rapid charging hub|1|evs|24|ev:0:canopy|-1|Fast chargers under a solar canopy and a café while you wait.
solarlot|Solar canopy car park|2|batteries|120|ev:0:solar|-1|Every space shaded by panels that fill the cars' batteries.
greengarage|Green-walled garage|2|evs|240|multi:5:green|0|Ivy and planters over every deck.
timbergarage|Timber garage|2|evs|200|multi:4:timber|0|Laminated timber decks and cedar screens.
convertgarage|Adaptable garage|2|autopilot|220|multi:4:adapt|0|Flat floors and high ceilings, ready to become flats when cars are gone.
podhub|Robo-taxi depot|2|autopilot|160|ev:0:pod|-1|Self-driving taxis charge and wait for the next call.
dronepad|Delivery drone port|1|drones|10|roof:0:drone|0|Drones land on the roof to load and charge.
rooftoplot|Rooftop car park|1|massprod|50|roof:0:asphalt|1|Cars parked on the flat roof of the shops below.
bikeshed|Bicycle shed|1|bicycle|40|bike:0:shed|0|Rows of bicycles under a tin roof.
bikestation|Bicycle station|1|trams|120|bike:2:glass|1|Two floors of bicycle racks beside the station.
bikeshare|Bike-share dock|1|mobilephones|30|bike:0:dock|0|Unlock a bike with your phone and leave it at the next dock.
scooterhub|Scooter and bike hub|1|batteries|60|bike:0:scooter|0|E-scooters and e-bikes, charging in rows.
cyclegarage|Cycle multi-storey|2|evs|600|bike:3:glass|1|Thousands of bikes on a ramped building of their own.
motorcyclebay|Motorcycle park|1|cars|60|lot:0:moto|0|Motorbikes and scooters parked shoulder to shoulder.
taxirank|Taxi rank and depot|1|cars|30|lot:0:taxi|0|Yellow cabs queue for fares.
busdepotpark|Bus garage|2|motorbus|50|truck:0:bus|-1|Buses back in after the last route and are washed overnight.
caravanpark|Camper van park|2|masstourism|60|lot:0:camper|-1|Holiday vans in rows, with water and a power hook-up.
residentsgarage|Residents' garages|1|cars|16|lot:0:lockup|0|A row of lock-up garages behind the flats.
cul-de-sacbays|Parking court|1|massprod|30|lot:0:court|0|A courtyard of bays behind a terrace of houses.
stationgarage|Station multi-storey|2|electricrail|260|multi:4:concrete|0|A commuter garage bridging the tracks.
airportgarage|Airport parking garage|3|jetliners|700|multi:6:concrete|-1|Short stay, long stay, drop-off and pick-up, all in one huge structure.
mixedusegarage|Mixed-use garage|2|computers|260|multi:5:shops|1|Shops along the street, cars behind and above.
`;
const PARK_IDS = [];
(function defineParking() {
  for (const line of PARK_SRC.trim().split('\n')) {
    const [id, name, size, tech, cap, look, land, about] = line.split('|');
    if (TECH_IX[tech] === undefined) continue;
    const s = +size, e = TECHS[TECH_IX[tech]].era, [kind, lv, style] = look.split(':');
    const deep = kind === 'multi' || kind === 'under' || kind === 'robot' || kind === 'mall';
    const cost = deep ? C(0, 6 * s, 8 * s, e >= 8 ? 4 * s : 0, 0, 6 * s + (+lv) * s) : C(2 * s, 6 * s);
    BLD[id] = { name, size: s, tech, cost, work: Math.round((deep ? 120 : 50) * s + (+lv) * 30), parking: +cap, look: { kind, lv: +lv, style }, era: e, about, want: t => parkWant(t, id) };
    PARK_IDS.push(id);
    LAND_PREF[id] = +land;
  }
  BUILD_ORDER.splice(BUILD_ORDER.indexOf('market') + 1, 0, ...PARK_IDS);  // early in the order, or a busy town never gets round to it
})();
// The building's own car park: from the motor age on, workplaces keep a few spaces for staff and customers.
const ownSpaces = (b, D) => (D.office ? b.size * b.size * 6 : (D.craft || D.service || D.study || D.store) ? b.size * b.size * 3 : 0);

// Yearly: who owns a car, where it is parked, and whether the town needs more parking.
function carYear(t) {
  if (t.nomad) return;
  const adults = [];
  for (const p of t.members) { if (p.job > J.CHILD) adults.push(p); p.car = 0; p.parkB = null; }
  t.cars = 0; t.parkNeed = 0; t.parkHave = 0; t.parkStreet = 0; t.parkPick = null;
  if (!t.mod.car) return;
  // the richer own cars first; wages lift the share, and so does a spread-out town
  const share = clamp(CAR_SHARE[Math.min(13, maxEra(t))] * (0.7 + Math.min(t.wage || 1, 3) * 0.15), 0, 0.85);
  adults.sort((a, b) => b.cash - a.cash);
  const n = Math.round(adults.length * share);
  for (let k = 0; k < n; k++) adults[k].car = 1;
  t.cars = n;
  // spaces at work, and in the town's lots and garages
  const lots = [], workFree = new Map();
  for (const b of t.blds) {
    b.cars = 0;
    if (!b.done || b.ruin || b.type === 'house') continue;
    const D = BLD[b.type]; if (!D) continue;
    if (D.parking) { lots.push({ b, free: D.parking }); t.parkHave += D.parking; }
    else { const s = ownSpaces(b, D); if (s) workFree.set(b, s); }
  }
  // every owner has a space at home (a home has one for each person it can hold); by day a commuter's car is at the
  // workplace if it has room, otherwise in the nearest lot or garage with a space, otherwise on the street
  for (let k = 0; k < n; k++) {
    const p = adults[k], wb = p.workB;
    if (!wb || wb.ruin || p.job <= J.ELDER || OUTDOOR_J.has(p.job)) { p.parkB = p.home; if (p.home) p.home.cars++; continue; }
    const f = workFree.get(wb);
    if (f > 0) { workFree.set(wb, f - t.scale); p.parkB = wb; wb.cars++; continue; }
    t.parkNeed += t.scale;
    let best = null, bd = 13;
    for (const L of lots) { if (L.free < t.scale) continue; const d = Math.abs(L.b.x - wb.x) + Math.abs(L.b.y - wb.y); if (d < bd) { bd = d; best = L; } }
    if (best) { best.free -= t.scale; p.parkB = best.b; best.b.cars++; }
    else t.parkStreet += t.scale;
  }
  // shoppers and visitors want spaces too
  t.parkNeed += Math.round(n * t.scale * 0.12);
  const short = t.parkNeed - t.parkHave;
  if (short > 20) t.parkPick = parkChoice(t, short);
  const q = t.parkNeed > 20 ? clamp((t.parkHave + 20) / t.parkNeed, 0, 1) : 1;  // a few cars find a kerb anywhere
  if (Math.abs(q - (t.parkQ === undefined ? 1 : t.parkQ)) > 0.05) { t.parkQ = q; recomputeMods(t); }
  if (q < 0.5 && tn(t) > 600 && (t.parkY == null || year() - t.parkY > 25)) { t.parkY = Math.floor(year()); chronT('misc', `Drivers circle the streets of ${t.name} looking for somewhere to park; cars stand on every pavement.`, t); }
}
// What to build: on dear land a garage that stacks cars, on cheap land a lot that spreads them; the latest kind mostly.
function parkChoice(t, short) {
  const land = W.land ? landRel(t, t.i) : 0.5, opts = [];
  for (const id of PARK_IDS) {
    const D = BLD[id];
    if (!knows(t, D.tech) || D.parking > short * 2.5 + 40) continue;
    const k = D.look.kind;
    if (k === 'bike' && t.mod.car && maxEra(t) < 9) continue;  // bike parking comes back once cities turn from the car
    if (k === 'truck' || k === 'pnr') { if (tn(t) < 600) continue; }
    const dear = LAND_PREF[id] > 0;
    opts.push({ id, s: D.era + (dear === land > 0.55 ? 2 : 0) + rnd() * 2.5 + Math.min(D.parking, short) / Math.max(30, short) });
  }
  if (!opts.length) return null;
  opts.sort((a, b) => b.s - a.s);
  return [opts[0].id];
}
function parkWant(t, id) {
  const have = t.count[id] || 0;
  return t.parkPick && t.parkPick.includes(id) ? have + 1 : have;
}
// Run once a year for every town (from yearlyWorld).
function cityYear(t) { carYear(t); }
